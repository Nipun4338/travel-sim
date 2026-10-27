// Turns indexed OSM data and the ground sampler into chunk geometry (SPEC §4), styled to read as
// Dhaka in flat low-poly (build-plan M2b).
import * as THREE from 'three';
import { CHUNK_SIZE } from '../../src/shared/region';
import { ChunkGeometry, color, densify, hash01, type UV, type V3 } from './geometry';
import { DRIVABLE, isElevated, isOneway, roadRank, roadWidth, type Indexed } from './osm';
import { PointGrid, PolygonIndex, SegmentIndex } from './spatial';
import type { HeightSampler } from './terrain';

const C = {
  ground: color(0xa39b8a), green: color(0x6f8f4a), leafy: color(0x7d9455), paved: color(0x8f8c86), sand: color(0xb3a17f),
  road: color(0x3f3f42), roadMajor: color(0x37373a), rail: color(0x5a4a3f), white: color(0xe8e8e2), yellow: color(0xe0b52a),
  kerb: color(0xb9b2a5), kerbSide: color(0x8d877c),
  deck: color(0xb8b4ab), deckSide: color(0x8f8b83), pillar: color(0x9a968e), water: color(0x3f7fa8),
  roofTank: color(0x1f1f1f), trunk: color(0x5b4632),
  canopy: [0x3f6b2e, 0x4b7a34, 0x56843a, 0x355f29].map(color),
};
// Dhaka facades: off-white and cream dominate, with pastel paint, exposed brick and weathered concrete.
const WALLS: [number, number][] = [
  [0xe9e4d8, 20], [0xe8d9b0, 15], [0xa9a6a0, 15], [0x8c8478, 12], [0xb5654a, 10], [0xe9d27a, 8], [0xe0a990, 8],
  [0x9cc3d5, 6], [0xa9cfb5, 6],
];
const SIGNS = [0xd62828, 0x2a9d4b, 0x1f5fbf, 0xf2c200, 0xf07f13, 0xc2187a, 0xf4f1e8, 0x16a3a3].map(color);
const AWNINGS = [0x2e6e9e, 0x2a8a4b, 0xb0302f, 0xd9a21b, 0x6a4c9c].map(color);
const ALL = [0, 1, 2];

function pickWall(id: number): THREE.Color {
  const total = WALLS.reduce((s, [, w]) => s + w, 0);
  let r = hash01(id + 7) * total;
  for (const [hex, w] of WALLS) { if ((r -= w) < 0) return color(hex); }
  return color(WALLS[0][0]);
}

// ---------- shared indices ----------

/** Ground-level drivable road centrelines with their half-widths, from `minRank` up. */
export function roadIndex(idx: Indexed, minRank: number): SegmentIndex {
  const index = new SegmentIndex(50);
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < minRank || isElevated(w, idx)) continue;
    const half = roadWidth(t) / 2;
    for (let i = 1; i < w.nodes.length; i++) {
      const a = idx.nodes.get(w.nodes[i - 1]), b = idx.nodes.get(w.nodes[i]);
      if (a && b) index.add(a.x, a.z, b.x, b.z, half);
    }
  }
  return index;
}

/**
 * True where (x, z) lies on the carriageway of a ground-level major road (tertiary and up).
 * Used to drop OSM "buildings" that sit in the road (e.g. foot-over-bridge stair landings) and
 * pillars that would stand in a carriageway.
 */
export function majorRoadMask(idx: Indexed): (x: number, z: number) => boolean {
  const index = roadIndex(idx, 2);
  return (x, z) => index.onRoad(x, z);
}

/** Nodes where two or more drivable ways meet; markings and footpaths stop short of them. */
export function junctionGrid(idx: Indexed): PointGrid {
  const uses = new Map<number, number>();
  for (const w of idx.ways) {
    if (!w.tags?.highway || !DRIVABLE.has(w.tags.highway)) continue;
    w.nodes.forEach((n, i) => uses.set(n, (uses.get(n) ?? 0) + (i === 0 || i === w.nodes.length - 1 ? 1 : 2)));
  }
  const grid = new PointGrid(20);
  for (const [id, n] of uses) if (n >= 3) { const nd = idx.nodes.get(id); if (nd) grid.add(nd.x, nd.z); }
  return grid;
}

// ---------- land use ----------
export type Ground = 'green' | 'leafy' | 'paved' | 'sand';
const GROUND_TAGS: Array<[string, RegExp, Ground]> = [
  ['leisure', /^(park|garden|golf_course|pitch|playground|nature_reserve|stadium)$/, 'green'],
  ['landuse', /^(grass|meadow|recreation_ground|forest|village_green|cemetery|orchard|farmland)$/, 'green'],
  ['natural', /^(wood|scrub|grassland)$/, 'green'],
  ['landuse', /^military$/, 'leafy'],
  ['landuse', /^(industrial|commercial|retail|railway|construction|brownfield)$/, 'paved'],
  ['amenity', /^(parking|fuel|bus_station)$/, 'paved'],
  ['aeroway', /^(apron|taxiway|runway)$/, 'paved'],
  ['natural', /^(sand|bare_rock)$/, 'sand'],
];

export function landuseIndex(idx: Indexed): PolygonIndex<Ground> {
  const index = new PolygonIndex<Ground>(50);
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    const hit = GROUND_TAGS.find(([k, re]) => t[k] && re.test(t[k]));
    if (!hit || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    index.add(w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => ({ x: n!.x, y: n!.z })), hit[2]);
  }
  return index;
}

// ---------- terrain ----------
export function buildTerrain(geo: ChunkGeometry, h: HeightSampler, ground: PolygonIndex<Ground>, xMin: number, xMax: number, zMin: number, zMax: number): void {
  const spacing = [20, 50, 100];
  const cx0 = Math.floor(xMin / CHUNK_SIZE), cx1 = Math.floor(xMax / CHUNK_SIZE);
  const cz0 = Math.floor(zMin / CHUNK_SIZE), cz1 = Math.floor(zMax / CHUNK_SIZE);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    spacing.forEach((s, lod) => {
      const n = CHUNK_SIZE / s;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x0 = cx * CHUNK_SIZE + i * s, z0 = cz * CHUNK_SIZE + j * s;
        const v = (x: number, z: number): V3 => [x, h(x, z), z];
        const kind = ground.at(x0 + s / 2, z0 + s / 2);
        const c = kind ? C[kind] : C.ground;
        geo.quad(v(x0, z0), v(x0, z0 + s), v(x0 + s, z0 + s), v(x0 + s, z0), c, 'terrain', [lod]);
      }
    });
  }
}

// ---------- roads, markings, footpaths, crossings, elevated decks ----------

/** Polyline offset sideways by `off` metres (+ = right of travel). */
function offsetLine(pts: [number, number][], off: number): [number, number][] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
    return [p[0] - tz * off, p[1] + tx * off];
  });
}

/** Splits a polyline into runs that stay `gap` metres clear of junctions. */
function clearOfJunctions(pts: [number, number][], junctions: PointGrid, gap: number): [number, number][][] {
  const runs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const p of pts) {
    if (junctions.near(p[0], p[1], gap)) { if (cur.length > 1) runs.push(cur); cur = []; }
    else cur.push(p);
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

/** Dashed line: `dash` metres on, `space` off. */
function dashes(pts: [number, number][], dash: number, space: number): [number, number][][] {
  const out: [number, number][][] = [];
  let along = 0, cur: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const on = along % (dash + space) < dash;
    if (on) cur.push(pts[i]); else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

export function buildRoads(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, onRoad: (x: number, z: number) => boolean, junctions: PointGrid,
): { pillars: number; skipped: number; crossings: number; footbridges: number } {
  let pillars = 0, skipped = 0, crossings = 0, footbridges = 0;
  const lift = (rank: number) => 0.12 + rank * 0.01; // major roads draw over minor ones at junctions
  const at = (pts: [number, number][], y: number) => pts.map(([x, z]) => [x, h(x, z) + y, z] as V3);

  for (const w of idx.ways) {
    const t = w.tags ?? {};
    const isRoad = t.highway && DRIVABLE.has(t.highway);
    const isRail = t.railway && /^(subway|light_rail|rail)$/.test(t.railway);
    const isFootbridge = t.highway && /^(footway|pedestrian|path)$/.test(t.highway) && t.bridge && t.bridge !== 'no';
    if (!isRoad && !isRail && !isFootbridge) continue;
    const flat = w.nodes.map(id => idx.nodes.get(id)).filter(Boolean).map(n => [n!.x, n!.z] as [number, number]);
    if (flat.length < 2) continue;
    const pts2 = densify(flat, 8);

    if (isFootbridge) {
      // Foot-over-bridge: a narrow deck at 6 m with a post at each end.
      geo.ribbon(at(pts2, 6), 3, C.deck, 'deck', [0, 1], 0.6, C.deckSide);
      for (const [x, z] of [pts2[0], pts2[pts2.length - 1]]) geo.box(x, z, 0.4, 0.4, h(x, z), h(x, z) + 5.4, C.pillar, 'deck', [0]);
      footbridges++;
      continue;
    }

    const elevated = isElevated(w, idx);
    const width = isRail ? (elevated ? 9 : 4) : roadWidth(t);
    if (elevated) {
      const layer = parseInt(t.layer ?? '1', 10) || 1;
      const deckH = isRail ? 12 : layer >= 3 ? 16 : layer === 2 ? 12 : 7;
      geo.ribbon(at(pts2, deckH), width, C.deck, 'deck', ALL, 1.2, C.deckSide);
      let acc = 0;
      for (let i = 1; i < pts2.length; i++) {
        acc += Math.hypot(pts2[i][0] - pts2[i - 1][0], pts2[i][1] - pts2[i - 1][1]);
        if (acc < 30) continue;
        acc = 0;
        const [x, z] = pts2[i], g = h(x, z);
        // OSM puts a flyover's centreline above the road beneath it; real pillars stand in
        // medians and verges, so skip any that would land in a carriageway.
        if ([[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dz]) => onRoad(x + dx, z + dz))) { skipped++; continue; }
        geo.box(x, z, 0.7, 0.7, g, g + deckH - 1.2, C.pillar, 'pillar', [0, 1]);
        pillars++;
      }
      continue;
    }

    const rank = isRail ? 0 : roadRank(t.highway);
    const lods = rank >= 4 ? ALL : rank >= 2 ? [0, 1] : [0];
    const y = lift(rank);
    geo.ribbon(at(pts2, y), width, isRail ? C.rail : rank >= 4 ? C.roadMajor : C.road, 'road', lods);
    if (isRail || rank < 2) continue;

    // Markings and footpaths, kept clear of junctions so they don't cross other roads.
    const runs = clearOfJunctions(pts2, junctions, Math.max(10, width));
    const lanes = Math.max(1, parseInt(t.lanes ?? '', 10) || Math.round(width / 3.2));
    const oneway = isOneway(t) !== 0;
    for (const run of runs) {
      const mark = (off: number, c: THREE.Color, dashed: boolean, wdt = 0.15) => {
        const line = offsetLine(run, off);
        for (const seg of dashed ? dashes(line, 3, 6) : [line]) geo.ribbon(at(seg, y + 0.02), wdt, c, 'marking', [0]);
      };
      // lane dividers
      for (let i = 1; i < lanes; i++) {
        const off = -width / 2 + (i * width) / lanes;
        if (!oneway && i === lanes / 2) mark(off, C.yellow, false, 0.3); // centre line on two-way roads
        else mark(off, C.white, true);
      }
      if (rank >= 4) { mark(-width / 2 + 0.3, C.white, false); mark(width / 2 - 0.3, C.white, false); }
      // Raised footpaths both sides; on dual carriageways the inner one reads as the median kerb.
      const fw = rank >= 4 ? 2.5 : 1.8;
      for (const side of [-1, 1]) geo.ribbon(at(offsetLine(run, side * (width / 2 + fw / 2)), 0.3), fw, C.kerb, 'kerb', [0, 1], 0.18, C.kerbSide);
    }
  }

  // Zebra crossings on major roads.
  const crossingNodes = new Set([...idx.nodes.values()].filter(n => n.tags?.highway === 'crossing').map(n => n.id));
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < 2 || isElevated(w, idx)) continue;
    const width = roadWidth(t);
    w.nodes.forEach((id, i) => {
      if (!crossingNodes.has(id)) return;
      const n = idx.nodes.get(id)!, a = idx.nodes.get(w.nodes[Math.max(0, i - 1)])!, b = idx.nodes.get(w.nodes[Math.min(w.nodes.length - 1, i + 1)])!;
      let tx = b.x - a.x, tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
      for (let o = -width / 2 + 0.5; o < width / 2; o += 1.1) {
        const cx = n.x - tz * o, cz = n.z + tx * o, y = h(cx, cz) + lift(roadRank(t.highway)) + 0.02;
        geo.ribbon([[cx - tx * 1.5, y, cz - tz * 1.5], [cx + tx * 1.5, y, cz + tz * 1.5]], 0.55, C.white, 'marking', [0]);
      }
      crossings++;
    });
  }
  return { pillars, skipped, crossings, footbridges };
}

// ---------- buildings (OSM-only heights for now; SPEC §4 Google 2.5D is a follow-up) ----------
const DEFAULT_LEVELS: Record<string, number> = {
  house: 3, residential: 5, apartments: 7, commercial: 7, office: 9, retail: 3, industrial: 3, warehouse: 2,
  school: 4, hospital: 7, university: 5, mosque: 3, hotel: 9, yes: 5,
};
const FLOOR_H = 3.2;

export function buildingHeight(id: number, tags: Record<string, string>): number {
  const height = parseFloat(tags.height ?? '');
  if (height > 0) return height;
  const levels = parseFloat(tags['building:levels'] ?? '');
  if (levels > 0) return levels * FLOOR_H + 1;
  const base = DEFAULT_LEVELS[tags.building] ?? 5;
  return (base + Math.floor(hash01(id) * 4) - 1) * FLOOR_H + 1; // per-type default ± a little variety
}

export function buildBuildings(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, near: (x: number, z: number) => boolean,
  onRoad: (x: number, z: number) => boolean, majorRoads: SegmentIndex, footprints?: PolygonIndex<true>,
): { built: number; droppedOnRoad: number; signs: number; billboards: number } {
  let count = 0, dropped = 0, signs = 0, billboards = 0;
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.building || w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const ring = w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => new THREE.Vector2(n!.x, n!.z));
    if (ring.length < 3) continue;
    const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cz = ring.reduce((s, p) => s + p.y, 0) / ring.length;
    if (!near(cx, cz)) continue;
    if (onRoad(cx, cz) || ring.some(p => onRoad(p.x, p.y))) { dropped++; continue; }
    if (THREE.ShapeUtils.isClockWise(ring)) ring.reverse();
    footprints?.add(ring.map(p => ({ x: p.x, y: p.y })), true);

    const height = buildingHeight(w.id, t);
    const area = Math.abs(THREE.ShapeUtils.area(ring));
    const lods = height >= 30 ? ALL : height >= 15 || area > 600 ? [0, 1] : [0];
    const base = Math.min(...ring.map(p => h(p.x, p.y)));
    const top = base + height;
    const wall = pickWall(w.id);
    const roof = wall.clone().lerp(color(0x9a958c), 0.45); // flat concrete roofs, tinted by the facade
    const parapet = wall.clone().multiplyScalar(0.9);

    // Walls carry UVs for the shared window texture: u in 3 m bays, v in floors.
    let along = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const len = a.distanceTo(b), u0 = along / 3, u1 = (along + len) / 3, v1 = height / FLOOR_H;
      along += len;
      const uv: [UV, UV, UV, UV] = [[u0, 0], [u0, v1], [u1, v1], [u1, 0]];
      geo.quad([a.x, base, a.y], [a.x, top, a.y], [b.x, top, b.y], [b.x, base, b.y], wall, 'wall', lods, uv);
      geo.quad([a.x, top, a.y], [a.x, top + 0.9, a.y], [b.x, top + 0.9, b.y], [b.x, top, b.y], parapet, 'building', [0]);

      // Shop signboards and awnings on ground floors facing a main road.
      if (len < 3 || height < 6) continue;
      const dx = (b.x - a.x) / len, dz = (b.y - a.y) / len, nx = dz, nz = -dx; // outward normal
      const mx = (a.x + b.x) / 2, mz = (a.y + b.y) / 2;
      const road = majorRoads.nearest(mx, mz);
      if (!road || road.dist > road.half + 18 || (road.px - mx) * nx + (road.pz - mz) * nz < 0) continue;
      const boards = Math.max(1, Math.floor(len / 6));
      for (let k = 0; k < boards; k++) {
        const s0 = (k / boards) * len + 0.3, s1 = ((k + 1) / boards) * len - 0.3;
        const p = (s: number, out: number, y: number): V3 => [a.x + dx * s + nx * out, base + y, a.y + dz * s + nz * out];
        const sc = SIGNS[Math.floor(hash01(w.id * 31 + i * 7 + k) * SIGNS.length)];
        geo.quad(p(s0, 0.12, 3.0), p(s0, 0.12, 4.3), p(s1, 0.12, 4.3), p(s1, 0.12, 3.0), sc, 'prop', [0]);
        const ac = AWNINGS[Math.floor(hash01(w.id * 17 + k) * AWNINGS.length)];
        geo.quad(p(s0, 0.05, 2.8), p(s1, 0.05, 2.8), p(s1, 1.3, 2.35), p(s0, 1.3, 2.35), ac, 'prop', [0]);
        signs++;
      }
      // An occasional rooftop billboard in rickshaw-art colours on taller buildings.
      if (height >= 15 && len >= 8 && hash01(w.id + i * 3) < 0.12) {
        const s0 = len / 2 - 4, s1 = len / 2 + 4;
        const p = (s: number, y: number): V3 => [a.x + dx * s - nx * 0.6, top + y, a.y + dz * s - nz * 0.6];
        const cols = 4, rows = 2;
        for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
          const ss0 = s0 + ((s1 - s0) * c2) / cols, ss1 = s0 + ((s1 - s0) * (c2 + 1)) / cols;
          const y0 = 1.2 + r * 1.6, y1 = y0 + 1.6;
          const pc = SIGNS[Math.floor(hash01(w.id * 13 + r * 5 + c2) * SIGNS.length)];
          geo.quad(p(ss0, y0), p(ss0, y1), p(ss1, y1), p(ss1, y0), pc, 'prop', [0, 1]);
          geo.quad(p(ss1, y0), p(ss1, y1), p(ss0, y1), p(ss0, y0), C.deckSide, 'prop', [0, 1]); // back
        }
        geo.box(a.x + dx * (len / 2) - nx * 0.8, a.y + dz * (len / 2) - nz * 0.8, 0.15, 0.15, top, top + 1.2, C.pillar, 'prop', [0]);
        billboards++;
      }
    }
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring, [])) {
      geo.tri([ring[i].x, top, ring[i].y], [ring[k].x, top, ring[k].y], [ring[j].x, top, ring[j].y], roof, 'building', lods);
    }
    // Black rooftop water tanks on most mid-size buildings.
    if (area > 80 && hash01(w.id + 3) < 0.65) {
      const ox = (hash01(w.id + 5) - 0.5) * 3, oz = (hash01(w.id + 9) - 0.5) * 3;
      geo.box(cx + ox, cz + oz, 0.7, 0.7, top, top + 1.5, C.roofTank, 'prop', [0]);
    }
    count++;
  }
  return { built: count, droppedOnRoad: dropped, signs, billboards };
}

// ---------- trees ----------
export function buildTrees(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, near: (x: number, z: number) => boolean, allRoads: SegmentIndex,
  footprints: PolygonIndex<true>, ground: PolygonIndex<Ground>, junctions: PointGrid,
): number {
  const canopy = new THREE.IcosahedronGeometry(2.4, 0);
  let n = 0;
  const plant = (x: number, z: number, seed: number) => {
    if (!near(x, z) || allRoads.onRoad(x, z, 1.5) || footprints.at(x, z) || junctions.near(x, z, 12)) return;
    const g = h(x, z), tall = 2.5 + hash01(seed) * 2;
    geo.box(x, z, 0.18, 0.18, g, g + tall, C.trunk, 'tree', [0]);
    geo.mesh(canopy, x, g + tall + 1.6, z, C.canopy[Math.floor(hash01(seed + 1) * C.canopy.length)], 'tree', [0, 1]);
    n++;
  };
  // Street trees on the verge of major roads, roughly every 20 m.
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < 3 || isElevated(w, idx)) continue;
    const pts = densify(w.nodes.map(id => idx.nodes.get(id)).filter(Boolean).map(nd => [nd!.x, nd!.z] as [number, number]), 20);
    const off = roadWidth(t) / 2 + 3.2;
    for (const side of [-1, 1]) offsetLine(pts, side * off).forEach(([x, z], i) => {
      if (hash01(w.id + i * 7 + side) < 0.55) plant(x, z, w.id + i);
    });
  }
  // Scattered trees in green land use, on a jittered 15 m grid.
  const STEP = 15;
  const xs = [...idx.nodes.values()].map(nd => nd.x), zs = [...idx.nodes.values()].map(nd => nd.z);
  for (let x = Math.min(...xs); x < Math.max(...xs); x += STEP) for (let z = Math.min(...zs); z < Math.max(...zs); z += STEP) {
    const kind = ground.at(x, z);
    if ((kind === 'green' || kind === 'leafy') && hash01(x * 0.37 + z * 0.11) < 0.45) plant(x + (hash01(x + z) - 0.5) * 8, z + (hash01(x - z) - 0.5) * 8, Math.floor(x * 31 + z));
  }
  return n;
}

// ---------- water (drawn just above the ground) ----------
export function buildWater(geo: ChunkGeometry, idx: Indexed, h: HeightSampler): void {
  for (const w of idx.ways) {
    if (w.tags?.natural !== 'water' || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const ring = w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => new THREE.Vector2(n!.x, n!.z));
    if (ring.length < 3) continue;
    if (THREE.ShapeUtils.isClockWise(ring)) ring.reverse();
    const y = Math.min(...ring.map(p => h(p.x, p.y))) + 0.08;
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring, [])) {
      geo.tri([ring[i].x, y, ring[i].y], [ring[k].x, y, ring[k].y], [ring[j].x, y, ring[j].y], C.water, 'water', ALL);
    }
  }
}
