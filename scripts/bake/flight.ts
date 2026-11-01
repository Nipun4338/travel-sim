// Bake a Flight Zone: `npm run bake:flight -- dhaka`. Buildings come from the Geofabrik extract in
// data/raw/osm/; other raw downloads are cached in data/raw/<id>-zone/;
// output goes to public/zones/<id>/ (both gitignored). SPEC §4: the whole zone at low and medium
// detail. Terrain is a height field that the game also uses for ground contact; buildings are boxes
// the game draws instanced, because a 30 km zone of Dhaka holds ~900k of them.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import type { ChunkLayer, RailLine } from '../../src/shared/region';
import {
  BUILDING_STRIDE, ZONE_CHUNK, type ChallengeData, type Landmark, type Ring, type Runway, type Spawn, type ZoneChunk, type ZoneManifest,
} from '../../src/shared/zone';
import { buildingHeight, pickWall } from './build';
import { OpenBuildings, utm46 } from './heights';
import { encodeChunk, shortHash, writeHashed } from './export';
import { copernicusWindow, overpass, type OsmData } from './fetch';
import { landmarksFor, type LandmarkPlace } from '../../src/shared/landmarks';
import { flyoverProfiles } from './flyovers';
import { pbfBuildings } from './pbf';
import { ChunkGeometry, color, densify, hash01, type V3 } from './geometry';
import { roadRank, roadWidth } from './osm';
import { projection, type Projection } from './regions';
import { PolygonIndex } from './spatial';
import { groundSampler } from './terrain';
import { ZONES, type ChallengeDef } from './zones';

const LOD1_M = 100;
const BACKDROP_M = 400;
const GLIDE = Math.tan((3 * Math.PI) / 180);
const CREDITS = [
  'Map data © OpenStreetMap contributors, ODbL (openstreetmap.org/copyright)',
  'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved',
  'Building heights: Google Open Buildings 2.5D Temporal, CC BY 4.0 (Sirko et al. 2023), containing modified Copernicus Sentinel data 2016-2023 processed by ESA',
];
const C = {
  water: color(0x3f7fa8), green: color(0x6f8f4a), paved: color(0x8f8c86), runway: color(0x3a3a3c), taxiway: color(0x55555a),
  road: color(0x48484b), white: color(0xe8e8e2), ballast: color(0x6f675c), forest: [0x355f29, 0x3f6b2e, 0x4b7a34, 0x56843a].map(color),
};

// Raw Overpass `out geom` elements.
interface GeomPt { lat: number; lon: number; }
interface GWay { type: 'way'; id: number; tags?: Record<string, string>; geometry?: GeomPt[]; }
interface GRel { type: 'relation'; id: number; tags?: Record<string, string>; members: Array<{ type: string; role: string; geometry?: GeomPt[] }>; }
type XZ = [number, number];

async function main() {
  const id = process.argv[2] ?? 'dhaka';
  const zone = ZONES[id];
  if (!zone) throw new Error(`Unknown zone "${id}". Known: ${Object.keys(ZONES).join(', ')}`);
  const raw = join('data', 'raw', `${id}-zone`), out = join('public', 'zones', id);
  const proj = projection(zone.origin);
  const H = zone.halfM, t0 = Date.now();
  const [north, west] = proj.toLatLon(-H - 500, -H - 500), [south, east] = proj.toLatLon(H + 500, H + 500);
  const bbox: [number, number, number, number] = [south, west, north, east];
  const bb = bbox.map(v => v.toFixed(5)).join(',');
  const xz = (p: GeomPt): XZ => proj.toXZ(p.lat, p.lon);

  console.log('[1/6] Reading buildings from the Geofabrik extract');
  const pbf = await pbfBuildings(bbox, join(raw, 'buildings.pbf.json'));
  console.log('[2/6] Fetching roads, water, green space, the airport and rivers');
  const roadsRaw = await overpass(`[out:json][timeout:200];way["highway"~"${zone.roads.source}"](${bb});out geom qt;`, join(raw, 'roads.json'));
  const waterRaw = await overpass(
    `[out:json][timeout:200];(way["natural"="water"](${bb});relation["natural"="water"](${bb});way["waterway"="riverbank"](${bb});relation["waterway"="riverbank"](${bb}););out geom qt;`,
    join(raw, 'water.json'),
  );
  const greenRaw = await overpass(
    `[out:json][timeout:200];(way["leisure"~"^(park|golf_course|stadium)$"](${bb});way["landuse"~"^(grass|forest|cemetery|recreation_ground|meadow)$"](${bb});way["natural"="wood"](${bb}););out geom qt;`,
    join(raw, 'green.json'),
  );
  const aeroRaw = await overpass(`[out:json][timeout:200];way["aeroway"~"^(runway|taxiway|apron)$"](${bb});out geom qt;`, join(raw, 'aeroway.json'));
  const riversRaw = await overpass(`[out:json][timeout:200];way["waterway"="river"](${bb});out geom qt;`, join(raw, 'rivers.json'));
  const railRaw = await overpass(`[out:json][timeout:200];way["railway"~"^(rail|light_rail|subway)$"](${bb});out geom qt;`, join(raw, 'rail.json'));
  const ways = (d: OsmData) => (d.elements as unknown as GWay[]).filter(e => e.type === 'way' && e.geometry);

  // ---------- polygons ----------
  const water = new PolygonIndex<true>(200), green = new PolygonIndex<true>(100), paved = new PolygonIndex<'apron'>(100);
  const toPts = (ring: XZ[]) => ring.map(([x, z]) => ({ x, y: z }));
  // Water polygons with their islands, drawn as surfaces later; the index lowers the ground under them.
  const waterShapes: Array<{ outer: XZ[]; holes: XZ[][] }> = [];
  for (const el of waterRaw.elements as unknown as Array<GWay | GRel>) {
    if (el.type === 'way' && el.geometry) waterShapes.push({ outer: el.geometry.map(xz), holes: [] });
    if (el.type === 'relation') {
      const inner = assembleRings(el.members.filter(m => m.role === 'inner').map(m => (m.geometry ?? []).map(xz)));
      for (const outer of assembleRings(el.members.filter(m => m.role !== 'inner').map(m => (m.geometry ?? []).map(xz)))) {
        waterShapes.push({ outer, holes: inner.filter(h => pointInRing(h[0], outer)) });
      }
    }
  }
  for (const w of waterShapes) water.add(toPts(w.outer), true);
  for (const w of ways(greenRaw)) green.add(toPts(w.geometry!.map(xz)), true);
  for (const w of ways(aeroRaw)) if (w.tags?.aeroway === 'apron') paved.add(toPts(w.geometry!.map(xz)), 'apron');

  // ---------- runways ----------
  const runways: Runway[] = [];
  for (const w of ways(aeroRaw)) {
    if (w.tags?.aeroway !== 'runway' || !w.tags.ref?.includes('/')) continue;
    const g = w.geometry!;
    const a = xz(g[0]), b = xz(g[g.length - 1]);
    const [e0, e1] = w.tags.ref.split('/').map(s => s.trim()) as [string, string];
    // ends[0] is the end at `a`: the lower-numbered end points roughly away from it.
    const heading = (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
    const fromA = Math.abs(((parseInt(e0, 10) * 10 - heading + 540) % 360) - 180) < 90;
    runways.push({ ends: fromA ? [e0, e1] : [e1, e0], a: { x: a[0], z: a[1] }, b: { x: b[0], z: b[1] }, width: parseFloat(w.tags.width ?? '') || 45, y: 0 });
  }
  console.log(`      runways: ${runways.map(r => `${r.ends.join('/')} ${Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z).toFixed(0)} m`).join(', ') || 'none'}`);

  console.log('[3/6] Reading the GLO-30 ground and the height field');
  const dem = await copernicusWindow(bbox, join(raw, 'glo30.json'));
  const natural = groundSampler(dem, proj, zone.terrainFilter.minPx, zone.terrainFilter.blurPx);
  for (const r of runways) {
    let s = 0;
    for (let k = 0; k <= 10; k++) s += natural(r.a.x + ((r.b.x - r.a.x) * k) / 10, r.a.z + ((r.b.z - r.a.z) * k) / 10);
    r.y = +(s / 11).toFixed(2);
  }
  const shaped = (x: number, z: number) => {
    let y = natural(x, z);
    if (water.at(x, z)) y -= 1;
    for (const r of runways) {
      // Flat runway and strip, blended back to the ground over 150 m.
      const len = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z), ux = (r.b.x - r.a.x) / len, uz = (r.b.z - r.a.z) / len;
      const px = x - r.a.x, pz = z - r.a.z, along = px * ux + pz * uz, across = Math.abs(-px * uz + pz * ux);
      const out = Math.max(across - r.width / 2 - 80, -along - 100, along - len - 100, 0);
      if (out < 150) y = r.y + (y - r.y) * (out / 150);
    }
    return y;
  };
  const n = Math.round((2 * H) / zone.gridM) + 1;
  const grid = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) grid[j * n + i] = shaped(-H + i * zone.gridM, -H + j * zone.gridM);
  let min = Infinity;
  for (const v of grid) min = Math.min(min, v);
  min = Math.floor(min) - 1;
  const STEP = 0.05;
  const quant = Uint16Array.from(grid, v => Math.max(0, Math.min(65535, Math.round((v - min) / STEP))));
  // The same triangle-exact interpolation the game uses (src/flight/zone.ts), so geometry sits on it.
  const h = (x: number, z: number) => {
    const fx = (x + H) / zone.gridM, fz = (z + H) / zone.gridM;
    const i = Math.max(0, Math.min(n - 2, Math.floor(fx))), j = Math.max(0, Math.min(n - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j));
    const q = (ii: number, jj: number) => min + quant[jj * n + ii] * STEP;
    const a = q(i, j), b = q(i, j + 1), c = q(i + 1, j + 1), d = q(i + 1, j);
    return tz >= tx ? a + tx * (c - b) + tz * (b - a) : a + tx * (d - a) + tz * (c - d);
  };

  // ---------- building density, for ground colour and default heights ----------
  const blds: GWay[] = pbf.map(b => ({ type: 'way', id: b.id, tags: b.tags, geometry: b.geometry }));
  const DENS = 100, dn = Math.ceil((2 * H) / DENS);
  const density = new Uint16Array(dn * dn);
  const cellOf = (x: number, z: number) => {
    const i = Math.floor((x + H) / DENS), j = Math.floor((z + H) / DENS);
    return i < 0 || j < 0 || i >= dn || j >= dn ? -1 : j * dn + i;
  };
  const centres = blds.map(w => {
    const p = w.geometry!.map(xz);
    const c: XZ = [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
    const k = cellOf(c[0], c[1]);
    if (k >= 0) density[k]++;
    return c;
  });
  const densityAt = (x: number, z: number) => { const k = cellOf(x, z); return k < 0 ? 0 : density[k]; };
  console.log(`      ${blds.length} buildings, height field ${n} × ${n} at ${zone.gridM} m`);

  // ---------- terrain ----------
  console.log('[4/6] Building terrain, roads and the airport');
  const geo = new ChunkGeometry(ZONE_CHUNK, H), backdrop = new ChunkGeometry(1e7);
  const rural = color(zone.rural), urban = color(zone.urban);
  const groundColor = (x: number, z: number): THREE.Color => {
    if (paved.at(x, z)) return C.paved;
    if (green.at(x, z)) return C.green;
    const d = Math.min(1, densityAt(x, z) / 12);
    if (zone.forest && d < 0.2) {
      // Smooth patches of darker and lighter canopy, in a few steps so neighbouring quads share
      // colours (and vertices, which keeps the chunks small).
      const n = 0.65 * valueNoise(x / 900, z / 900) + 0.35 * valueNoise(x / 250 + 17, z / 250 + 5);
      const k = Math.round(Math.min(1, Math.max(0, n)) * 9) / 9 * (C.forest.length - 1.001);
      return C.forest[Math.floor(k)].clone().lerp(C.forest[Math.floor(k) + 1], k % 1);
    }
    return rural.clone().lerp(urban, d);
  };
  const terrain = (g: ChunkGeometry, x0: number, z0: number, x1: number, z1: number, s: number, lods: number[], hf = h) => {
    for (let x = x0; x < x1 - 1e-6; x += s) for (let z = z0; z < z1 - 1e-6; z += s) {
      const v = (px: number, pz: number): V3 => [px, hf(px, pz), pz];
      g.quad(v(x, z), v(x, z + s), v(x + s, z + s), v(x + s, z), groundColor(x + s / 2, z + s / 2), 'terrain', lods);
    }
  };
  const nc = Math.ceil((2 * H) / ZONE_CHUNK);
  for (let i = 0; i < nc; i++) for (let j = 0; j < nc; j++) {
    const x0 = -H + i * ZONE_CHUNK, z0 = -H + j * ZONE_CHUNK, x1 = Math.min(H, x0 + ZONE_CHUNK), z1 = Math.min(H, z0 + ZONE_CHUNK);
    terrain(geo, x0, z0, x1, z1, zone.gridM, [0]);
    terrain(geo, x0, z0, x1, z1, LOD1_M, [1]);
  }
  // The backdrop shows only where no chunk is loaded, so it sits below the detailed terrain: each
  // vertex takes the lowest ground around it.
  const low = (x: number, z: number) => {
    let m = Infinity;
    for (let dx = -BACKDROP_M; dx <= BACKDROP_M; dx += zone.gridM) for (let dz = -BACKDROP_M; dz <= BACKDROP_M; dz += zone.gridM) m = Math.min(m, h(x + dx, z + dz));
    return m - 2;
  };
  terrain(backdrop, -H, -H, H, H, BACKDROP_M, [0], low);

  // ---------- roads ----------
  const mapRoads: number[][] = [];
  const lift = zone.forest ? 0.8 : 0.4;
  // Flyovers and the Elevated Expressway stand on their decks, ramping down to the street.
  // (In the hills a road `layer` marks a river bridge, not a flyover.)
  const flyovers = zone.forest ? new Map<number, (s: number) => number>() : flyoverProfiles(ways(roadsRaw).map(w => ({ id: w.id, nodes: (w as GWay & { nodes?: number[] }).nodes ?? [], tags: w.tags!, pts: w.geometry!.map(xz) })));
  for (const w of ways(roadsRaw)) {
    const pts = w.geometry!.map(xz);
    if (pts.every(([x, z]) => Math.abs(x) > H || Math.abs(z) > H)) continue;
    const rank = roadRank(w.tags!.highway);
    const profile = flyovers.get(w.id);
    if (profile) {
      const dense = densify(pts, 20), ground = dense.map(([x, z]) => h(x, z));
      let along = 0;
      const tops = dense.map(([x, z], i) => { if (i) along += Math.hypot(x - dense[i - 1][0], z - dense[i - 1][1]); return [x, ground[i] + profile(along) + lift, z] as V3; });
      geo.deck(tops, ground, Math.max(6, roadWidth(w.tags!)), C.road, C.paved, 'road', [0, 1]);
      for (let i = 2; i < dense.length; i += 2) if (tops[i][1] - ground[i] > 4.5) geo.box(dense[i][0], dense[i][1], 0.8, 0.8, ground[i], tops[i][1] - 1.2, C.paved, 'road', [0]);
      mapRoads.push(simplify(pts, 25).flatMap(([x, z]) => [Math.round(x), Math.round(z)]));
      continue;
    }
    const ribbon = densify(pts, 20).map(([x, z]) => [x, h(x, z) + lift, z] as V3);
    geo.ribbon(ribbon, Math.max(6, roadWidth(w.tags!)), C.road, 'road', rank >= 4 ? [0, 1] : [0]);
    mapRoads.push(simplify(pts, 25).flatMap(([x, z]) => [Math.round(x), Math.round(z)]));
  }

  // ---------- water surfaces: chunks near, backdrop (lower, under the chunks' ground) far ----------
  for (const w of waterShapes) {
    const ring = w.outer[0][0] === w.outer[w.outer.length - 1][0] && w.outer[0][1] === w.outer[w.outer.length - 1][1] ? w.outer.slice(0, -1) : w.outer;
    if (ring.length < 3 || ring.every(([x, z]) => Math.abs(x) > H || Math.abs(z) > H)) continue;
    const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
    const holes = w.holes.map(hr => hr.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z))).filter(hr => hr.length >= 3);
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    holes.forEach(hr => { if (!THREE.ShapeUtils.isClockWise(hr)) hr.reverse(); });
    const pts = [...contour, ...holes.flat()];
    let tris: number[][];
    try { tris = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { continue; }
    const area = Math.abs(THREE.ShapeUtils.area(contour));
    for (const [i, j, k] of tris) {
      const v = (q: THREE.Vector2, dy: number): V3 => [q.x, h(q.x, q.y) + dy, q.y];
      geo.tri(v(pts[i], 0.4), v(pts[k], 0.4), v(pts[j], 0.4), C.water, 'water', [0, 1]);
      if (area > 40000) backdrop.tri(v(pts[i], -1.6), v(pts[k], -1.6), v(pts[j], -1.6), C.water, 'water', [0]);
    }
  }

  // ---------- railways: track beds from the air, the metro on its viaduct ----------
  const railLines: RailLine[] = [];
  for (const kind of ['rail', 'metro'] as const) {
    const ways_ = ways(railRaw).filter(w => (w.tags?.railway === 'rail') === (kind === 'rail') && w.tags?.service === undefined);
    for (const chain of assembleChains(ways_.map(w => w.geometry!.map(xz)))) {
      if (chain.every(([x, z]) => Math.abs(x) > H || Math.abs(z) > H)) continue;
      const pts = densify(chain, 20);
      if (kind === 'metro') {
        geo.ribbon(pts.map(([x, z]) => [x, h(x, z) + 12, z] as V3), 9, C.paved, 'road', [0, 1], 1.2, C.paved);
        backdrop.ribbon(pts.map(([x, z]) => [x, h(x, z) + 12, z] as V3), 9, C.paved, 'road', [0]);
      } else geo.ribbon(pts.map(([x, z]) => [x, h(x, z) + 0.5, z] as V3), 4.5, C.ballast, 'road', [0, 1]);
      const lift = kind === 'metro' ? 12.22 : 0.72;
      railLines.push({ kind, points: densify(chain, 5).map(([x, z]) => [Math.round(x * 10) / 10, Math.round((h(x, z) + lift) * 100) / 100, Math.round(z * 10) / 10]) });
    }
  }
  console.log(`      railways: ${railLines.length} lines, ${(railLines.reduce((s, l) => s + l.points.length, 0) * 5 / 1000).toFixed(0)} km`);

  // ---------- airport ----------
  for (const w of ways(aeroRaw)) {
    const pts = w.geometry!.map(xz), t = w.tags!.aeroway;
    if (t === 'taxiway') geo.ribbon(densify(pts, 20).map(([x, z]) => [x, h(x, z) + 0.25, z] as V3), parseFloat(w.tags!.width ?? '') || 23, C.taxiway, 'road', [0, 1]);
  }
  for (const r of runways) {
    const len = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z), ux = (r.b.x - r.a.x) / len, uz = (r.b.z - r.a.z) / len;
    const at = (along: number, across: number, dy = 0.3): V3 => {
      const x = r.a.x + ux * along - uz * across, z = r.a.z + uz * along + ux * across;
      return [x, h(x, z) + dy, z];
    };
    for (const g of [geo, backdrop]) g.ribbon([at(-30, 0), at(len / 2, 0), at(len + 30, 0)], r.width + 10, C.runway, 'road', g === geo ? [0, 1] : [0]);
    // Centreline dashes, and threshold "piano keys" at both ends.
    const stripe = (a0: number, a1: number, c0: number, w: number) => geo.ribbon([at(a0, c0, 0.35), at(a1, c0, 0.35)], w, C.white, 'marking', [0, 1]);
    for (let s = 120; s < len - 120; s += 60) stripe(s, s + 30, 0, 0.9);
    for (const [from, dir] of [[6, 1], [len - 6, -1]] as const) {
      for (let k = -7; k <= 7; k++) if (k) stripe(from, from + dir * 45, k * (r.width / 16), 1.8);
    }
  }

  // ---------- buildings ----------
  console.log('[5/6] Packing buildings');
  const perChunk = new Map<string, Array<{ area: number; rec: number[] }>>();
  const onRunway = (x: number, z: number) => runways.some(r => {
    const len = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z), ux = (r.b.x - r.a.x) / len, uz = (r.b.z - r.a.z) / len;
    const px = x - r.a.x, pz = z - r.a.z, along = px * ux + pz * uz;
    return Math.abs(-px * uz + pz * ux) < r.width / 2 + 60 && along > -100 && along < len + 100;
  });
  // Landmarks (SPEC §10) replace the OSM buildings on their footprints.
  const models = landmarksFor(`${id}-zone` as LandmarkPlace).map(l => { const [x, z] = proj.toXZ(l.lat, l.lon); return { def: l, x, z }; });
  const clearedByLandmark = (x: number, z: number) => models.some(p => p.def.footprintM && Math.hypot(x - p.x, z - p.z) < p.def.footprintM);
  const google = await OpenBuildings.load(bbox, 8);
  let packed = 0;
  blds.forEach((w, k) => {
    const [cx, cz] = centres[k];
    if (Math.abs(cx) >= H || Math.abs(cz) >= H || onRunway(cx, cz) || clearedByLandmark(cx, cz)) return;
    const rect = minAreaRect(w.geometry!.map(xz));
    if (!rect || rect.w < 2 || rect.d < 2) return;
    const tags = w.tags ?? {};
    let height: number;
    const g = tags.height || tags['building:levels'] ? undefined : google.p75(w.geometry!.map(p => utm46(p.lat, p.lon)));
    if (tags.height || tags['building:levels']) height = buildingHeight(w.id, tags);
    else if (typeof g === 'number') height = Math.max(3, g);
    else if (g === null && rect.w * rect.d < 100) height = 3.2 + 1;
    else {
      // No tags: low and rural where buildings are sparse, taller where they crowd together.
      const d = densityAt(cx, cz), r = hash01(w.id);
      const levels = d >= 25 ? 4 + Math.floor(r * 6) : d >= 8 ? 2 + Math.floor(r * 4) : 1 + Math.floor(r * 2);
      height = levels * 3.2 + 1;
    }
    const ci = Math.floor((cx + H) / ZONE_CHUNK), cj = Math.floor((cz + H) / ZONE_CHUNK);
    const key = `${ci}_${cj}`, lx = cx - (-H + ci * ZONE_CHUNK), lz = cz - (-H + cj * ZONE_CHUNK);
    const c = pickWall(w.id, height);
    const rgb = (Math.round(c.r * 31) << 11) | (Math.round(c.g * 63) << 5) | Math.round(c.b * 31);
    const rot = ((rect.angle % Math.PI) + Math.PI) % Math.PI;
    const q = (v: number) => Math.max(0, Math.min(65535, Math.round(v)));
    const rec = [q(lx * 32), q(lz * 32), q(rect.w * 10), q(rect.d * 10), q(Math.min(height, 600) * 10), q((rot / Math.PI) * 65535), rgb];
    if (!perChunk.has(key)) perChunk.set(key, []);
    perChunk.get(key)!.push({ area: rect.w * rect.d, rec });
    packed++;
  });
  console.log(`      ${packed} buildings packed`);

  // ---------- Challenges and landmarks ----------
  const runwayEnd = (name: string) => {
    const r = runways.find(rr => rr.ends.includes(name));
    if (!r) throw new Error(`No runway end ${name}`);
    // Threshold point and the unit direction you roll towards from it.
    const atA = r.ends[0] === name, from = atA ? r.a : r.b, to = atA ? r.b : r.a;
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    return { r, x: from.x, z: from.z, ux: (to.x - from.x) / len, uz: (to.z - from.z) / len, len };
  };
  const headingOf = (dx: number, dz: number) => ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
  const spawnFor = (s: ChallengeDef['spawn']): Spawn => {
    if ('runway' in s) {
      const [end, final] = s.runway.split('-');
      const e = runwayEnd(end);
      if (!final) return { x: e.x + e.ux * 30, z: e.z + e.uz * 30, headingDeg: headingOf(e.ux, e.uz), kmh: 0 };
      const d = 6000;
      return { x: e.x - e.ux * d, z: e.z - e.uz * d, y: e.r.y + d * GLIDE + 20, headingDeg: headingOf(e.ux, e.uz), kmh: 150, pitchDeg: -3, throttle: 0.15 };
    }
    const [x, z] = proj.toXZ(s.lat, s.lon);
    return { x, z, y: h(x, z) + s.agl, headingDeg: s.headingDeg, kmh: s.kmh };
  };
  const faceRings = (pts: Array<[number, number, number]>): Ring[] => pts.map(([x, y, z], i) => {
    const [ax, , az] = pts[Math.max(0, i - 1)], [bx, , bz] = pts[Math.min(pts.length - 1, i + 1)];
    return { x: Math.round(x), y: Math.round(y), z: Math.round(z), headingDeg: Math.round(headingOf(bx - ax, bz - az)) };
  });
  const rivers = ways(riversRaw);
  const challenges: ChallengeData[] = zone.challenges.map(ch => {
    const spawn = spawnFor(ch.spawn);
    let pts: Array<[number, number, number]> = ch.rings.map(r => {
      const [x, z] = proj.toXZ(r.lat, r.lon);
      return [x, r.alt ?? h(x, z) + (r.agl ?? 150), z];
    });
    if (ch.kind === 'takeoff') {
      const e = runwayEnd((ch.spawn as { runway: string }).runway);
      // Along the extended centreline on a ~7% climb from lift-off (~300 m down the runway).
      pts = [1200, 2000, 2800, 3600].map(d => {
        const x = e.x + e.ux * d, z = e.z + e.uz * d;
        return [x, Math.max(e.r.y, h(x, z)) + (d - 300) * 0.07 + 2, z];
      });
    }
    if (ch.kind === 'landing') {
      const e = runwayEnd(ch.landOn!);
      pts = [5000, 4000, 3000, 2000, 1000].map(d => [e.x - e.ux * d, e.r.y + d * GLIDE + 3, e.z - e.uz * d]);
    }
    if (ch.river) pts = riverRings(rivers.map(w => ({ name: w.tags?.name ?? '', pts: w.geometry!.map(xz) })), ch.river, spawn, proj, h);
    return {
      id: ch.id, kind: ch.kind, spawn, rings: faceRings(pts), climbToAgl: ch.climbToAgl, ceilingM: ch.ceilingM,
      landOn: ch.landOn, parS: ch.parS, feeTk: ch.feeTk,
    };
  });
  for (const ch of challenges) console.log(`      ${ch.id}: ${ch.rings.length} Rings`);
  const landmarks: Landmark[] = zone.landmarks.map(l => { const [x, z] = proj.toXZ(l.lat, l.lon); return { name: l.name, x: Math.round(x), z: Math.round(z), radiusM: l.radiusM }; });

  // ---------- write ----------
  console.log('[6/6] Writing chunks');
  mkdirSync(out, { recursive: true });
  const before = new Set(readdirSync(out));
  const chunks: ZoneChunk[] = [];
  let total = 0, bldBytes = 0;
  for (let i = 0; i < nc; i++) for (let j = 0; j < nc; j++) {
    const key = `${i}_${j}`, lods = geo.chunks.get(key);
    if (!lods) continue;
    const files: string[] = [];
    for (const lod of [0, 1]) {
      const glb = await encodeChunk(lods[lod] as Map<ChunkLayer, { pos: number[]; col: number[] }>);
      files.push(writeHashed(out, `chunk_${key}_lod${lod}`, 'glb', glb));
      total += glb.byteLength;
    }
    const list = (perChunk.get(key) ?? []).sort((a, b) => b.area - a.area);
    let buildings: string | undefined;
    if (list.length) {
      const arr = new Uint16Array(list.length * BUILDING_STRIDE);
      list.forEach((b, k) => arr.set(b.rec, k * BUILDING_STRIDE));
      buildings = writeHashed(out, `buildings_${key}`, 'bin', new Uint8Array(arr.buffer));
      bldBytes += arr.byteLength;
    }
    chunks.push({ id: key, cx: i, cz: j, lods: files, buildings, buildingCount: list.length });
  }
  const bd = await encodeChunk(backdrop.chunks.values().next().value![0] as Map<ChunkLayer, { pos: number[]; col: number[] }>);
  const backdropFile = writeHashed(out, 'backdrop', 'glb', bd);
  const heightFile = writeHashed(out, 'height', 'bin', new Uint8Array(quant.buffer));
  const mapFile = writeHashed(out, 'map', 'json', JSON.stringify(mapRoads));
  const railsFile = railLines.length ? writeHashed(out, 'rails', 'json', JSON.stringify({ lines: railLines, crossings: [] })) : undefined;
  const [spawnX, spawnZ] = 'runway' in zone.spawn ? [0, 0] : proj.toXZ(zone.spawn.lat, zone.spawn.lon);
  const body: Omit<ZoneManifest, 'version'> = {
    zone: id, origin: zone.origin, halfM: H, chunkSize: ZONE_CHUNK, backdrop: backdropFile,
    height: { file: heightFile, gridM: zone.gridM, n, min, step: STEP }, chunks, runways,
    spawn: 'runway' in zone.spawn ? spawnFor(zone.spawn) : { ...spawnFor(zone.spawn), x: spawnX, z: spawnZ },
    challenges, landmarks, map: mapFile, credits: CREDITS,
    rails: railsFile,
    models: models.map(p => ({ id: p.def.id, x: Math.round(p.x * 10) / 10, y: Math.round(h(p.x, p.z) * 100) / 100, z: Math.round(p.z * 10) / 10, headingDeg: p.def.headingDeg })),
  };
  const manifest: ZoneManifest = { ...body, version: shortHash(JSON.stringify(body)) };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const keep = new Set(['manifest.json', backdropFile, heightFile, mapFile, ...(railsFile ? [railsFile] : []), ...chunks.flatMap(c => [...c.lods, ...(c.buildings ? [c.buildings] : [])])]);
  for (const f of before) if (!keep.has(f)) rmSync(join(out, f));
  const mb = (b: number) => (b / 1e6).toFixed(1);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${chunks.length} chunks, ${mb(total)} MB terrain GLB, ${mb(bldBytes)} MB buildings, `
    + `${mb(bd.byteLength)} MB backdrop, ${mb(quant.byteLength)} MB height field`);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const h = (a: number, b: number) => hash01(a * 7919 + b * 104729);
  const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function pointInRing(p: XZ, ring: XZ[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/** Joins open member ways (e.g. a riverbank relation's outer ways) into closed rings by shared ends. */
function assembleRings(parts: XZ[][]): XZ[][] {
  const key = (p: XZ) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const left = parts.filter(p => p.length > 1);
  const rings: XZ[][] = [];
  while (left.length) {
    let ring = left.shift()!;
    for (let grew = true; grew && key(ring[0]) !== key(ring[ring.length - 1]);) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i], tail = key(ring[ring.length - 1]);
        if (key(p[0]) === tail) ring = [...ring, ...p.slice(1)];
        else if (key(p[p.length - 1]) === tail) ring = [...ring, ...[...p].reverse().slice(1)];
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

/** The smallest rectangle around a footprint: centre, sides and the angle of side `w` (rad, from +x). */
function minAreaRect(pts: XZ[]): { x: number; z: number; w: number; d: number; angle: number } | null {
  const hull = convexHull(pts);
  if (hull.length < 3) return null;
  let best: { x: number; z: number; w: number; d: number; angle: number } | null = null, bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(angle), s = Math.sin(angle);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of hull) {
      const u = x * c + z * s, v = -x * s + z * c;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (area < bestArea) {
      bestArea = area;
      const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
      best = { x: uc * c - vc * s, z: uc * s + vc * c, w: u1 - u0, d: v1 - v0, angle };
    }
  }
  return best;
}

function convexHull(pts: XZ[]): XZ[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: XZ, a: XZ, b: XZ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XZ[] = [], upper: XZ[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Douglas–Peucker. */
function simplify(pts: XZ[], tol: number): XZ[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dz - (pts[i][1] - a[1]) * dx) / len;
    if (d > worst) { worst = d; at = i; }
  }
  return worst < tol ? [a, b] : [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}

/** Rings every `spacingM` along a named river, from the point nearest the spawn towards `toward`. */
function riverRings(
  rivers: Array<{ name: string; pts: XZ[] }>, def: NonNullable<ChallengeDef['river']>, spawn: Spawn, proj: Projection,
  h: (x: number, z: number) => number,
): Array<[number, number, number]> {
  const named = rivers.filter(r => def.name.test(r.name));
  if (!named.length) throw new Error('No river matches ' + def.name);
  const [chain] = assembleChains(named.map(r => r.pts)).sort((a, b) => length(b) - length(a));
  const near = (p: XZ, x: number, z: number) => Math.hypot(p[0] - x, p[1] - z);
  let start = 0;
  chain.forEach((p, i) => { if (near(p, spawn.x, spawn.z) < near(chain[start], spawn.x, spawn.z)) start = i; });
  const [tx, tz] = proj.toXZ(def.toward.lat, def.toward.lon);
  const forward = near(chain[chain.length - 1], tx, tz) < near(chain[0], tx, tz);
  const path = forward ? chain.slice(start) : chain.slice(0, start + 1).reverse();
  const out: Array<[number, number, number]> = [];
  let along = 0, next = def.spacingM;
  for (let i = 1; i < path.length && out.length < Math.floor(def.lengthM / def.spacingM); i++) {
    along += near(path[i], path[i - 1][0], path[i - 1][1]);
    if (along >= next) { out.push([path[i][0], h(path[i][0], path[i][1]) + def.agl, path[i][1]]); next += def.spacingM; }
  }
  return out;
}

function assembleChains(parts: XZ[][]): XZ[][] {
  const key = (p: XZ) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const left = [...parts];
  const chains: XZ[][] = [];
  while (left.length) {
    let c = left.shift()!;
    for (let grew = true; grew;) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i], head = key(c[0]), tail = key(c[c.length - 1]);
        if (key(p[0]) === tail) c = [...c, ...p.slice(1)];
        else if (key(p[p.length - 1]) === tail) c = [...c, ...[...p].reverse().slice(1)];
        else if (key(p[p.length - 1]) === head) c = [...p.slice(0, -1), ...c];
        else if (key(p[0]) === head) c = [...[...p].reverse().slice(0, -1), ...c];
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    chains.push(c);
  }
  return chains;
}

const length = (pts: XZ[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

main().catch(err => { console.error(err); process.exit(1); });
