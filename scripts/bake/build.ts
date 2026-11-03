// Turns indexed OSM data and the ground sampler into chunk geometry (SPEC §4), styled to read as
// Dhaka in flat low-poly (build-plan M2b).
import * as THREE from 'three';
import { CHUNK_SIZE } from '../../src/shared/region';
import { ChunkGeometry, color, densify, hash01, type UV, type V3 } from './geometry';
import { frontage, rooftop, type DensityAt } from './streetlife';
import { DRIVABLE, isElevated, isOneway, roadRank, roadWidth, type Indexed } from './osm';
import { PointGrid, PolygonIndex, SegmentIndex } from './spatial';
import { crownRadius, pickSpecies, plantTree, type TreeSetting } from './trees';
import type { HeightSampler } from './terrain';

const C = {
  ground: color(0xa39b8a), green: color(0x6f8f4a), leafy: color(0x7d9455), paved: color(0x8f8c86), sand: color(0xb3a17f),
  road: color(0x3f3f42), roadMajor: color(0x37373a), rail: color(0x5a4a3f), ballast: color(0x7d7468), sleeper: color(0x8a847a),
  steel: color(0x8d9196), girder: color(0x4a5a6a), white: color(0xe8e8e2), yellow: color(0xe0b52a),
  wornWhite: color(0xcfcac0), wornYellow: color(0xc9a33a), patch: [0x2c2c2e, 0x4a4947, 0x56534e].map(color), railing: color(0x7a8b62),
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
// Newer towers (30 m and up): white tile, blue or green glass, pale grey cladding.
const TOWERS: [number, number][] = [[0xeeeeea, 35], [0x5e7f91, 25], [0x6f8f8a, 15], [0xc8c8c4, 25]];
const DUST = color(0xb8ab94);
const SIGNS = [0xd62828, 0x2a9d4b, 0x1f5fbf, 0xf2c200, 0xf07f13, 0xc2187a, 0xf4f1e8, 0x16a3a3].map(color);
const AWNINGS = [0x2e6e9e, 0x2a8a4b, 0xb0302f, 0xd9a21b, 0x6a4c9c].map(color);
const ALL = [0, 1, 2];

/** A facade colour: dusty and weathered for ordinary buildings, tile or glass for towers ≥ 30 m. */
export function pickWall(id: number, height = 0): THREE.Color {
  const list = height >= 30 ? TOWERS : WALLS;
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = hash01(id + 7) * total, hex = list[0][0];
  for (const [hx, w] of list) { if ((r -= w) < 0) { hex = hx; break; } }
  if (height >= 30) return color(hex);
  // Dhaka dust: every facade drifts towards it, some more than others, and ages a little darker.
  return color(hex).lerp(DUST, 0.12 + hash01(id + 11) * 0.18).multiplyScalar(0.92 + hash01(id + 13) * 0.1);
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
export function buildTerrain(
  geo: ChunkGeometry, h: HeightSampler, ground: PolygonIndex<Ground>, xMin: number, xMax: number, zMin: number, zMax: number,
  spacing: { near: number; far: number; lod1: number; lod2: number }, nearRoute: (x: number, z: number) => boolean, defaultGround: number,
): void {
  const base = color(defaultGround);
  const cx0 = Math.floor(xMin / CHUNK_SIZE), cx1 = Math.floor(xMax / CHUNK_SIZE);
  const cz0 = Math.floor(zMin / CHUNK_SIZE), cz1 = Math.floor(zMax / CHUNK_SIZE);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    // Finer LOD 0 only in chunks the Route corridor touches.
    const corridor = [0.1, 0.5, 0.9].some(fx => [0.1, 0.5, 0.9].some(fz => nearRoute((cx + fx) * CHUNK_SIZE, (cz + fz) * CHUNK_SIZE)));
    [corridor ? spacing.near : spacing.far, spacing.lod1, spacing.lod2].forEach((s, lod) => {
      const n = CHUNK_SIZE / s;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x0 = cx * CHUNK_SIZE + i * s, z0 = cz * CHUNK_SIZE + j * s;
        const v = (x: number, z: number): V3 => [x, h(x, z), z];
        const kind = ground.at(x0 + s / 2, z0 + s / 2);
        const c = kind ? C[kind] : base;
        geo.quad(v(x0, z0), v(x0, z0 + s), v(x0 + s, z0 + s), v(x0 + s, z0), c, 'terrain', [lod]);
      }
    });
  }
}

// ---------- roads, markings, footpaths, crossings, elevated decks ----------

/** Polyline offset sideways by `off` metres (+ = right of travel). */
export function offsetLine(pts: [number, number][], off: number): [number, number][] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
    return [p[0] - tz * off, p[1] + tx * off];
  });
}

/**
 * Railway track along a polyline at track-bed height: ballast (raised, in every LOD), concrete
 * sleepers every 0.9 m and two steel rails at standard 1.676 m broad gauge (Bangladesh's main
 * line around Dhaka). On a bridge, steel girders run along both sides.
 */
function buildTrack(geo: ChunkGeometry, pts: V3[], lods: number[], bridge: boolean, ballast = true, flush: boolean[] = []): void {
  if (ballast) geo.ribbon(pts, 3.8, C.ballast, 'road', lods, 0.3, C.ballast);
  const flat = pts.map(([x, , z]) => [x, z] as [number, number]);
  // At a level crossing the rails are set into the road surface; elsewhere they sit on sleepers.
  const yAt = (i: number) => pts[i][1] - (flush[i] ? 0.12 : 0);   // flush: rail tops just above the road
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, az] = pts[i - 1], [bx, by, bz] = pts[i], len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / (len || 1), uz = (bz - az) / (len || 1);
    for (let d = carry; d < len; d += 0.9) {
      if (flush[i - 1] || flush[i]) continue;
      const x = ax + ux * d, z = az + uz * d, y = ay + ((by - ay) * d) / (len || 1);
      // A sleeper across the track: a thin slab, rotated to the track's direction.
      const hw = 1.3, hd = 0.12, rx = -uz, rz = ux;
      const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [x + rx * a + ux * b, y + 0.08, z + rz * a + uz * b] as V3);
      geo.quad(c[0], c[3], c[2], c[1], C.sleeper, 'prop', [0]);
    }
    carry = (carry - len) % 0.9;
    if (carry < 0) carry += 0.9;
  }
  for (const off of [-0.838, 0.838]) {
    const line = offsetLine(flat, off).map(([x, z], i) => [x, yAt(i) + 0.22, z] as V3);
    geo.ribbon(line, 0.09, C.steel, 'prop', [0, 1], 0.14, C.steel);
  }
  if (bridge) {
    for (const off of [-2.6, 2.6]) {
      const line = offsetLine(flat, off).map(([x, z], i) => [x, yAt(i) + 1.6, z] as V3);
      geo.ribbon(line, 0.4, C.girder, 'prop', [0, 1], 1.8, C.girder);
    }
  }
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
  footpaths = true, flyovers: Map<number, (s: number) => number> = new Map(), bridgesAtGrade = false, markings = true,
): { pillars: number; skipped: number; crossings: number; footbridges: number } {
  let pillars = 0, skipped = 0, crossings = 0, footbridges = 0;
  const lift = (rank: number) => 0.12 + rank * 0.01; // major roads draw over minor ones at junctions
  const at = (pts: [number, number][], y: number) => pts.map(([x, z]) => [x, h(x, z) + y, z] as V3);
  const levelCrossings = new PointGrid(20);
  for (const nd of idx.nodes.values()) if (nd.tags?.railway === 'level_crossing') levelCrossings.add(nd.x, nd.z);

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

    // Rail: the metro (and any rail bridge high in the layers) is a viaduct; other rail bridges
    // carry the track at ground level between steel girders.
    const railBridge = !!isRail && !!t.bridge && t.bridge !== 'no';
    // In the hills a road `layer` marks a river bridge, already graded straight across: no deck.
    const elevated = isRail ? railBridge && (t.railway !== 'rail' || (parseInt(t.layer ?? '0', 10) || 0) >= 3) : !bridgesAtGrade && isElevated(w, idx);
    if (isRail && !elevated) {
      // The track bed stands 0.3 m proud of the ground, except across a road at a level crossing,
      // where it sits just under the road surface (the rails show through) so the bus drives straight over.
      const flush = pts2.map(([x, z]) => levelCrossings.near(x, z, 12));
      buildTrack(geo, pts2.map(([x, z], i) => [x, h(x, z) + (flush[i] ? 0.06 : 0.3), z] as V3), [0, 1], railBridge, true, flush);
      continue;
    }
    const width = isRail ? 9 : roadWidth(t);
    const profile = !isRail ? flyovers.get(w.id) : undefined;
    if (elevated && profile) {
      // A flyover: deck height from its profile (ramping down where it meets the street),
      // parapets, lamp posts, and pillars wherever it's high enough to stand on them.
      const cum = [0];
      for (let i = 1; i < pts2.length; i++) cum.push(cum[i - 1] + Math.hypot(pts2[i][0] - pts2[i - 1][0], pts2[i][1] - pts2[i - 1][1]));
      const ground = pts2.map(([x, z]) => h(x, z)), lift = cum.map(profile);
      const tops = pts2.map(([x, z], i) => [x, ground[i] + lift[i], z] as V3);
      geo.deck(tops, ground, width, C.deck, C.deckSide, 'deck', ALL);
      for (const off of [-width / 2 + 0.15, width / 2 - 0.15]) {
        const edge = offsetLine(pts2, off).map(([x, z], i) => [x, tops[i][1] + 0.5, z] as V3);
        geo.ribbon(edge, 0.3, C.deckSide, 'deck', [0, 1], 0.5, C.deckSide);
      }
      let since = 0, sinceLamp = 20;
      for (let i = 1; i < pts2.length; i++) {
        const step = cum[i] - cum[i - 1];
        since += step; sinceLamp += step;
        const [x, z] = pts2[i], g = ground[i];
        if (sinceLamp >= 40) {
          sinceLamp = 0;
          const [lx, lz] = offsetLine(pts2, -width / 2 + 0.4)[i];
          geo.box(lx, lz, 0.12, 0.12, tops[i][1], tops[i][1] + 8, C.pillar, 'prop', [0]);
        }
        if (since < 30 || lift[i] < 4.5) continue;
        since = 0;
        // OSM puts a flyover's centreline above the road beneath it; real pillars stand in
        // medians and verges, so skip any that would land in a carriageway.
        if ([[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dz]) => onRoad(x + dx, z + dz))) { skipped++; continue; }
        geo.box(x, z, 0.7, 0.7, g, tops[i][1] - 1.2, C.pillar, 'pillar', [0, 1]);
        pillars++;
      }
      continue;
    }
    if (elevated) {
      const layer = parseInt(t.layer ?? '1', 10) || 1;
      const deckH = isRail ? 12 : layer >= 3 ? 16 : layer === 2 ? 12 : 7;
      geo.ribbon(at(pts2, deckH), width, C.deck, 'deck', ALL, 1.2, C.deckSide);
      if (isRail) {
        // Two tracks on the viaduct, with parapet walls along both edges.
        for (const off of [-2, 2]) buildTrack(geo, offsetLine(pts2, off).map(([x, z]) => [x, h(x, z) + deckH, z] as V3), [0], false, false);
        for (const off of [-width / 2 + 0.15, width / 2 - 0.15]) {
          const line = offsetLine(pts2, off).map(([x, z]) => [x, h(x, z) + deckH + 0.6, z] as V3);
          geo.ribbon(line, 0.3, C.deckSide, 'deck', [0, 1], 0.6, C.deckSide);
        }
      }
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
      // City markings are worn: dimmer paint, and about one dash in six gone.
      const white = footpaths ? C.wornWhite : C.white, yellow = footpaths ? C.wornYellow : C.yellow;
      const mark = (off: number, c: THREE.Color, dashed: boolean, wdt = 0.15) => {
        const line = offsetLine(run, off);
        const segs = dashed ? dashes(line, 3, 6).filter((_, k) => !footpaths || hash01(w.id * 7 + k * 13 + Math.round(off * 10)) > 0.17) : [line];
        for (const seg of segs) geo.ribbon(at(seg, y + 0.02), wdt, c, 'marking', [0]);
      };
      // lane dividers
      for (let i = 1; markings && i < lanes; i++) {
        const off = -width / 2 + (i * width) / lanes;
        if (!oneway && i === lanes / 2) mark(off, yellow, false, 0.3); // centre line on two-way roads
        else mark(off, white, true);
      }
      if (markings && rank >= 4) { mark(-width / 2 + 0.3, white, false); mark(width / 2 - 0.3, white, false); }
      // Patched city asphalt: fresh dark patches and worn pale ones, about one every 15 m.
      if (footpaths) {
        const along = run.reduce((s, p, k) => (k ? s + Math.hypot(p[0] - run[k - 1][0], p[1] - run[k - 1][1]) : 0), 0);
        for (let k = 0; k < along / 15; k++) {
          const r = (j: number) => hash01(w.id * 3 + k * 29 + j * 7);
          const i0 = Math.floor(r(1) * (run.length - 1)), [ax, az] = run[i0], [bx, bz] = run[i0 + 1];
          const len = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / len, tz = (bz - az) / len;
          const cx = ax + (bx - ax) * r(2) - tz * (r(3) - 0.5) * (width - 2), cz = az + (bz - az) * r(2) + tx * (r(3) - 0.5) * (width - 2);
          const pl = 1.5 + r(4) * 3, pw = 1 + r(5) * 1.5, yy = h(cx, cz) + y + 0.01;
          const q = (u: number, v: number): V3 => [cx + tx * u - tz * v, yy, cz + tz * u + tx * v];
          geo.quad(q(-pl, -pw), q(-pl, pw), q(pl, pw), q(pl, -pw), C.patch[Math.floor(r(6) * C.patch.length)], 'marking', [0]);
        }
      }
      // Raised footpaths both sides; on dual carriageways the inner one reads as the median kerb.
      const fw = rank >= 4 ? 2.5 : 1.8;
      if (footpaths) for (const side of [-1, 1]) geo.ribbon(at(offsetLine(run, side * (width / 2 + fw / 2)), 0.3), fw, C.kerb, 'kerb', [0, 1], 0.18, C.kerbSide);
      // A steel railing along the median of a dual carriageway (a one-way way's right side: traffic keeps left).
      if (footpaths && oneway && rank >= 3) {
        const rail = offsetLine(run, isOneway(t) * (width / 2 + fw / 2));
        let acc = 0;
        for (let k = 1; k < rail.length; k++) {
          const [ax, az] = rail[k - 1], [bx, bz] = rail[k], ya = h(ax, az) + 0.48, yb = h(bx, bz) + 0.48;
          for (const top of [0.55, 0.95]) {
            const a0: V3 = [ax, ya + top - 0.05, az], a1: V3 = [ax, ya + top, az], b1: V3 = [bx, yb + top, bz], b0: V3 = [bx, yb + top - 0.05, bz];
            geo.quad(a0, a1, b1, b0, C.railing, 'prop', [0]); geo.quad(b0, b1, a1, a0, C.railing, 'prop', [0]); // seen from both carriageways
          }
          acc += Math.hypot(bx - ax, bz - az);
          if (acc >= 3) { acc = 0; geo.box(bx, bz, 0.03, 0.03, yb, yb + 0.95, C.railing, 'prop', [0]); }
        }
      }
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

// ---------- buildings (heights: OSM tags, then Google Open Buildings 2.5D; polish spec §2) ----------
const DEFAULT_LEVELS: Record<string, number> = {
  house: 3, residential: 5, apartments: 7, commercial: 7, office: 9, retail: 3, industrial: 3, warehouse: 2,
  school: 4, hospital: 7, university: 5, mosque: 3, hotel: 9, yes: 5,
};
const FLOOR_H = 3.2;

/**
 * OSM `height`, then `building:levels` (tags above 45 floors are mistakes), then the Google p75
 * (`google`: a number, `null` when the footprint holds no built pixel, `undefined` when uncovered),
 * then 1 floor for a small footprint with no pixel, then the per-type default. `cap` limits the
 * last three (Bandarban's hills).
 */
export function buildingHeight(id: number, tags: Record<string, string>, google?: number | null, area = Infinity, cap = Infinity): number {
  const height = parseFloat(tags.height ?? '');
  if (height > 0) return height;
  const levels = parseFloat(tags['building:levels'] ?? '');
  if (levels > 0 && levels <= 45) return levels * FLOOR_H + 1;
  if (typeof google === 'number') return Math.min(cap, Math.max(3, google));
  if (google === null && area < 100) return Math.min(cap, FLOOR_H + 1);
  const base = DEFAULT_LEVELS[tags.building] ?? 5;
  return Math.min(cap, (base + Math.floor(hash01(id) * 4) - 1) * FLOOR_H + 1); // per-type default ± a little variety
}

/** Where a bake gets Google heights for its footprints, and the height cap at a point. */
export interface HeightSource { p75: (ring: THREE.Vector2[]) => number | null | undefined; cap: (x: number, z: number) => number; }

export function buildBuildings(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, near: (x: number, z: number) => boolean,
  onRoad: (x: number, z: number) => boolean, majorRoads: SegmentIndex, footprints?: PolygonIndex<true>,
  cleared: (x: number, z: number) => boolean = () => false, heights?: HeightSource, street?: DensityAt,
  /** Rooftop clutter where this returns true, and billboards facing `line` (the viaduct) when it's near. */
  roofs?: { at: (x: number, z: number) => boolean; line?: SegmentIndex },
): { built: number; droppedOnRoad: number; signs: number; billboards: number } {
  let count = 0, dropped = 0, signs = 0, billboards = 0;
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.building || w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const ring = w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => new THREE.Vector2(n!.x, n!.z));
    if (ring.length < 3) continue;
    const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cz = ring.reduce((s, p) => s + p.y, 0) / ring.length;
    if (!near(cx, cz) || cleared(cx, cz)) continue;
    if (onRoad(cx, cz) || ring.some(p => onRoad(p.x, p.y))) { dropped++; continue; }
    if (THREE.ShapeUtils.isClockWise(ring)) ring.reverse();
    footprints?.add(ring.map(p => ({ x: p.x, y: p.y })), true);

    const area = Math.abs(THREE.ShapeUtils.area(ring));
    const height = buildingHeight(w.id, t, heights?.p75(ring), area, heights?.cap(cx, cz));
    const lods = height >= 30 ? ALL : height >= 15 || area > 600 ? [0, 1] : [0];
    const base = Math.min(...ring.map(p => h(p.x, p.y)));
    const top = base + height;
    const wall = pickWall(w.id, height);
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
      if (street) {
        const added = frontage(geo, a, b, base, height, w.id, i, street(mx, mz));
        signs += added.signs; billboards += added.billboards;
        continue;
      }
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
    if (roofs?.at(cx, cz) && street) {
      const near = roofs.line?.nearest(cx, cz) ?? null;
      if (rooftop(geo, ring, top, height, w.id, street(cx, cz), near && near.dist < 120 ? near : null)) billboards++;
    }
    count++;
  }
  return { built: count, droppedOnRoad: dropped, signs, billboards };
}

// ---------- trees ----------
export function buildTrees(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, near: (x: number, z: number) => boolean, allRoads: SegmentIndex,
  footprints: PolygonIndex<true>, ground: PolygonIndex<Ground>, junctions: PointGrid,
  forest?: { buildings: PointGrid },
  keepClear?: (x: number, z: number) => boolean,
  /** Dense campus and park groves: every open, unpaved spot clear of buildings in these circles. */
  groves?: { circles: Array<{ x: number; z: number; r: number }>; buildings: PointGrid },
): number {
  let n = 0;
  // Flyover decks (with their ramps) and railway tracks: no tree grows up through them.
  const overhead = new SegmentIndex(50);
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    const rail = t.railway && /^(subway|light_rail|rail)$/.test(t.railway);
    if (!rail && !(t.highway && DRIVABLE.has(t.highway) && isElevated(w, idx))) continue;
    const half = rail ? 3 : roadWidth(t) / 2 + 2;
    for (let i = 1; i < w.nodes.length; i++) {
      const a = idx.nodes.get(w.nodes[i - 1]), b = idx.nodes.get(w.nodes[i]);
      if (a && b) overhead.add(a.x, a.z, b.x, b.z, half);
    }
  }
  // A mix of real species per setting (trees.ts): city streets and greens, hill road and forest.
  // The trunk stays clear of the carriageway by most of its crown, so crowns only just overhang it.
  const plant = (x: number, z: number, seed: number, setting: TreeSetting, anywhere = false) => {
    const species = pickSpecies(setting, seed), crown = crownRadius(species);
    if ((!anywhere && !near(x, z)) || allRoads.onRoad(x, z, Math.max(1.5, crown - 2)) || overhead.onRoad(x, z, crown) || keepClear?.(x, z) || footprints.at(x, z) || junctions.near(x, z, 12)) return;
    plantTree(geo, species, x, h(x, z), z, seed);
    n++;
  };
  // Street trees on the verge of major roads, roughly every 20 m.
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < 3 || isElevated(w, idx)) continue;
    const pts = densify(w.nodes.map(id => idx.nodes.get(id)).filter(Boolean).map(nd => [nd!.x, nd!.z] as [number, number]), 20);
    const off = roadWidth(t) / 2 + 3.2;
    for (const side of [-1, 1]) offsetLine(pts, side * off).forEach(([x, z], i) => {
      if (hash01(w.id + i * 7 + side) < 0.55) plant(x, z, w.id + i * 13 + side, forest ? 'hillStreet' : 'cityStreet');
    });
  }
  // Scattered trees in green land use, on a jittered 15 m grid.
  const STEP = 15;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const nd of idx.nodes.values()) { x0 = Math.min(x0, nd.x); x1 = Math.max(x1, nd.x); z0 = Math.min(z0, nd.z); z1 = Math.max(z1, nd.z); }
  for (let x = x0; x < x1; x += STEP) for (let z = z0; z < z1; z += STEP) {
    const kind = ground.at(x, z);
    // Hill forest: unmapped ground away from town buildings is wooded (OSM rarely maps it).
    const wooded = forest && !kind && !forest.buildings.near(x, z, 35);
    if ((kind === 'green' || kind === 'leafy' || wooded) && hash01(x * 0.37 + z * 0.11) < (wooded ? 0.6 : 0.45)) {
      plant(x + (hash01(x + z) - 0.5) * 8, z + (hash01(x - z) - 0.5) * 8, Math.floor(x * 31 + z), wooded ? 'hillForest' : forest ? 'hillStreet' : 'cityGreen');
    }
  }
  // Groves: a 9 m jittered grid, skipping where the green-land pass above already planted.
  for (const c of groves?.circles ?? []) {
    const G = 9;
    for (let x = c.x - c.r; x < c.x + c.r; x += G) for (let z = c.z - c.r; z < c.z + c.r; z += G) {
      const jx = x + (hash01(x * 1.3 + z) - 0.5) * 6, jz = z + (hash01(x - z * 1.7) - 0.5) * 6;
      if (Math.hypot(jx - c.x, jz - c.z) > c.r || hash01(jx * 0.71 + jz * 0.29) > 0.55) continue;
      const kind = ground.at(jx, jz);
      if (kind === 'paved' || kind === 'green' || groves!.buildings.near(jx, jz, 9)) continue;
      plant(jx, jz, Math.floor(jx * 17 + jz * 3), 'cityGreen', true);
    }
    // Inside mapped parks the 15 m pass is too sparse for Suhrawardy Udyan and Ramna: fill in between.
    for (let x = c.x - c.r; x < c.x + c.r; x += G) for (let z = c.z - c.r; z < c.z + c.r; z += G) {
      const jx = x + 4.5 + (hash01(x + z * 2.1) - 0.5) * 5, jz = z + 4.5 + (hash01(x * 2.3 - z) - 0.5) * 5;
      if (Math.hypot(jx - c.x, jz - c.z) > c.r || ground.at(jx, jz) !== 'green' || hash01(jx * 0.53 + jz * 0.47) > 0.45) continue;
      plant(jx, jz, Math.floor(jx * 23 + jz * 5), 'cityGreen', true);
    }
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
