// Metro line bake (SPEC §20, M13a): MRT Line 6 as the 1-D line Metro Mode runs on, and the viaduct
// it runs along. OSM maps the two tracks as separate ways that hop across at crossovers, so the
// bake finds the centreline midway between them, smooths it, and lays both tracks, the deck,
// piers and the overhead line from that one centreline: the train and the viaduct always agree.
import * as THREE from 'three';
import type { LineData, LineStop, LineTrack, RouteData } from '../../src/shared/region';
import { doorOffsets, FLOOR_M, PLATFORM_EDGE_M, TRAIN_M } from '../../src/shared/train';
import { offsetLine } from './build';
import { ChunkGeometry, color, densify, type V3 } from './geometry';
import type { Indexed } from './osm';
import type { StopDef } from './regions';

const STEP = 5;                 // m between line samples
const RAIL_LEVEL = 13;          // rail top above the (smoothed) ground, m
const TRACK_GAP = 4.0;          // default track centre spacing when the pair can't be measured
const TAIL_M = 180;             // tail track past each terminus
const DECK_W = 9.6;
const LAT_ACC = 0.75;           // m/s² of uncompensated lateral acceleration allowed in curves
const LINE_MAX = 100;

const C = {
  deck: color(0xbdb9b0), deckSide: color(0x9a968d), slab: color(0x8f8c86), steel: color(0x8d9196),
  pier: color(0xa8a49b), cap: color(0x9c988f), mast: color(0x6f7479), wire: color(0x2d2f33),
};

type XZ = [number, number];

/** Shortest path over the main-line track graph between the nodes nearest two points. */
function trackPath(roads: Indexed, from: XZ, to: XZ): XZ[] {
  const ways = roads.ways.filter(w => w.tags?.railway === 'subway' && !w.tags.service);
  const adj = new Map<number, Array<[number, number]>>();
  const at = (id: number) => roads.nodes.get(id);
  for (const w of ways) for (let i = 1; i < w.nodes.length; i++) {
    const a = at(w.nodes[i - 1]), b = at(w.nodes[i]);
    if (!a || !b) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    for (const [p, q] of [[a.id, b.id], [b.id, a.id]]) { if (!adj.has(p)) adj.set(p, []); adj.get(p)!.push([q, d]); }
  }
  const nearest = ([x, z]: XZ) => {
    let best = -1, bd = Infinity;
    for (const id of adj.keys()) { const n = at(id)!; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = id; } }
    return best;
  };
  const start = nearest(from), goal = nearest(to);
  const dist = new Map<number, number>([[start, 0]]), prev = new Map<number, number>();
  const open = new Set([start]);
  while (open.size) {
    let u = -1, du = Infinity;
    for (const id of open) { const d = dist.get(id)!; if (d < du) { du = d; u = id; } }
    open.delete(u);
    if (u === goal) break;
    for (const [v, w] of adj.get(u) ?? []) {
      if (du + w < (dist.get(v) ?? Infinity)) { dist.set(v, du + w); prev.set(v, u); open.add(v); }
    }
  }
  if (!prev.has(goal)) throw new Error('No track path between the terminus stations');
  const ids = [goal];
  while (ids[0] !== start) ids.unshift(prev.get(ids[0])!);
  return ids.map(id => { const n = at(id)!; return [n.x, n.z] as XZ; });
}

/** Moves each point of `path` halfway towards the parallel track, then smooths the result. */
function centreline(roads: Indexed, path: XZ[]): { centre: XZ[]; gap: number } {
  const segs: Array<[XZ, XZ]> = [];
  for (const w of roads.ways) {
    if (w.tags?.railway !== 'subway' || w.tags.service) continue;
    for (let i = 1; i < w.nodes.length; i++) {
      const a = roads.nodes.get(w.nodes[i - 1]), b = roads.nodes.get(w.nodes[i]);
      if (a && b) segs.push([[a.x, a.z], [b.x, b.z]]);
    }
  }
  const grid = new Map<string, number[]>(), cell = 40;
  segs.forEach(([a, b], i) => {
    for (let gx = Math.floor(Math.min(a[0], b[0]) / cell); gx <= Math.floor(Math.max(a[0], b[0]) / cell); gx++)
      for (let gz = Math.floor(Math.min(a[1], b[1]) / cell); gz <= Math.floor(Math.max(a[1], b[1]) / cell); gz++) {
        const k = `${gx},${gz}`; if (!grid.has(k)) grid.set(k, []); grid.get(k)!.push(i);
      }
  });
  const pts = densify(path, STEP);
  const offsets: Array<XZ | null> = [];
  const gaps: number[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    let best: XZ | null = null, bd = Infinity;
    for (const si of grid.get(`${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`) ?? []) {
      const [s0, s1] = segs[si];
      let sx = s1[0] - s0[0], sz = s1[1] - s0[1];
      const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
      if (Math.abs(sx * dx + sz * dz) < 0.94) continue;          // not parallel (a crossover)
      const t = Math.max(0, Math.min(sl, (p[0] - s0[0]) * sx + (p[1] - s0[1]) * sz));
      const q: XZ = [s0[0] + sx * t, s0[1] + sz * t];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d > 2.5 && d < 7 && d < bd) { bd = d; best = [(q[0] - p[0]) / 2, (q[1] - p[1]) / 2]; }
    }
    offsets.push(best);
    if (best) gaps.push(bd);
  });
  // Fill gaps (single-track bits, crossovers) from the nearest measured offsets.
  const filled = offsets.map((o, i) => {
    if (o) return o;
    for (let k = 1; k < 60; k++) { const n = offsets[i - k] ?? offsets[i + k]; if (n) return n; }
    return [0, 0] as XZ;
  });
  const raw = pts.map((p, i) => [p[0] + filled[i][0], p[1] + filled[i][1]] as XZ);
  const smooth = (src: XZ[], r: number) => src.map((_, i) => {
    let x = 0, z = 0, n = 0;
    for (let k = Math.max(0, i - r); k <= Math.min(src.length - 1, i + r); k++) { x += src[k][0]; z += src[k][1]; n++; }
    return [x / n, z / n] as XZ;
  });
  gaps.sort((a, b) => a - b);
  return { centre: densify(smooth(smooth(raw, 6), 6), STEP), gap: gaps.length ? gaps[gaps.length >> 1] : TRACK_GAP };
}

/** Extends a polyline straight on at both ends. */
function extend(pts: XZ[], m: number): XZ[] {
  const ext = (a: XZ, b: XZ): XZ[] => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return Array.from({ length: Math.round(m / STEP) }, (_, k) => [b[0] + (dx / l) * STEP * (k + 1), b[1] + (dz / l) * STEP * (k + 1)] as XZ);
  };
  const head = ext(pts[1], pts[0]).reverse(), tail = ext(pts[pts.length - 2], pts[pts.length - 1]);
  return [...head, ...pts, ...tail];
}

const cumOf = (pts: Array<[number, number, number]>) => {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  return c;
};

/**
 * Civil speed limits from curve radius (a 30 m chord either side): each curve becomes one zone at
 * its tightest point's speed (rounded down to 10 km/h), held from 60 m before to 60 m after it,
 * and zones closer than 150 m merge, as on a real line's speed board list.
 */
function speedLimits(xz: XZ[], cum: number[]): Array<[number, number, number]> {
  const W = 6;
  const kmh = xz.map((p, i) => {
    const a = xz[Math.max(0, i - W)], c = xz[Math.min(xz.length - 1, i + W)];
    const ab = Math.hypot(p[0] - a[0], p[1] - a[1]), bc = Math.hypot(c[0] - p[0], c[1] - p[1]), ac = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const area2 = Math.abs((p[0] - a[0]) * (c[1] - a[1]) - (p[1] - a[1]) * (c[0] - a[0]));
    const R = area2 > 1e-6 ? (ab * bc * ac) / (2 * area2) : Infinity;
    return Math.min(LINE_MAX, Math.floor((Math.sqrt(LAT_ACC * R) * 3.6) / 10) * 10);
  });
  const zones: Array<[number, number, number]> = [];
  kmh.forEach((v, i) => {
    if (v >= LINE_MAX) return;
    const from = Math.max(0, cum[i] - 60), to = cum[i] + 60, last = zones[zones.length - 1];
    if (last && from - last[1] < 150) { last[1] = to; last[2] = Math.min(last[2], v); }
    else zones.push([from, to, v]);
  });
  const end = cum[cum.length - 1];
  const runs: Array<[number, number, number]> = [];
  let at = 0;
  for (const [a, b, v] of zones) {
    if (a > at) runs.push([at, a, LINE_MAX]);
    runs.push([a, Math.min(b, end), v]);
    at = Math.min(b, end);
  }
  if (at < end) runs.push([at, end, LINE_MAX]);
  return runs.map(([a, b, v]) => [Math.round(a), Math.round(b), v]);
}

export interface MetroBake { line: LineData; route: RouteData; centre: Array<[number, number, number]>; ground: number[]; gap: number; }

/** Works out the line from the OSM track ways and the station list (north to south). */
export function bakeLine(roads: Indexed, stations: StopDef[], toXZ: (lat: number, lon: number) => XZ, h: (x: number, z: number) => number, name: string, legEnds: string[]): MetroBake {
  const stationXZ = stations.map(st => toXZ(st.lat, st.lon));
  const path = trackPath(roads, stationXZ[0], stationXZ[stationXZ.length - 1]);
  const { centre: c0, gap } = centreline(roads, path);
  const centreXZ = extend(c0, TAIL_M);
  // Rail level follows the ground gently: 13 m over a 400 m running average of the ground.
  const ground = centreXZ.map(([x, z]) => h(x, z));
  const level = ground.map((_, i) => {
    let s = 0, n = 0;
    for (let k = Math.max(0, i - 40); k <= Math.min(ground.length - 1, i + 40); k++) { s += ground[k]; n++; }
    return s / n + RAIL_LEVEL;
  });
  const centre = centreXZ.map(([x, z], i) => [x, level[i], z] as [number, number, number]);
  // Stations: the nearest centreline sample.
  const stationIdx = stationXZ.map(([x, z]) => {
    let best = 0, bd = Infinity;
    centreXZ.forEach(([cx, cz], i) => { const d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  });
  const half = gap / 2;
  const track = (dir: 'south' | 'north'): LineTrack => {
    // Trains keep left: each direction's track is on the left of its travel.
    const along = dir === 'south' ? centreXZ : [...centreXZ].reverse();
    const off = offsetLine(along, -half);
    const lv = dir === 'south' ? level : [...level].reverse();
    const points = off.map(([x, z], i) => [+x.toFixed(2), +lv[i].toFixed(2), +z.toFixed(2)] as [number, number, number]);
    const cum = cumOf(points);
    const order = stations.map((_, i) => i);
    if (dir === 'north') order.reverse();
    const stops: LineStop[] = order.map(si => {
      const i = dir === 'south' ? stationIdx[si] : centreXZ.length - 1 - stationIdx[si];
      return { station: si, s: +cum[i].toFixed(1), stopS: +(cum[i] + TRAIN_M / 2).toFixed(1), side: 'left' };
    });
    return { dir, points, cum: cum.map(v => +v.toFixed(1)), stops, limits: speedLimits(off, cum) };
  };
  const tracks = [track('south'), track('north')];
  const line: LineData = {
    name,
    stations: stations.map((st, i) => ({ name: st.name, nameBn: st.nameBn ?? st.name, x: +stationXZ[i][0].toFixed(1), z: +stationXZ[i][1].toFixed(1) })),
    tracks,
    legs: legEnds.slice(1).map((to, i) => ({ from: legEnds[i], to })),
    trainLengthM: TRAIN_M,
  };
  // The Region's Route is the southbound track (the minimap and chunk streaming use it).
  const south = tracks[0];
  const cumKm = south.cum.map(v => +(v / 1000).toFixed(4));
  const route: RouteData = {
    name,
    points: south.points,
    cumKm,
    stops: south.stops.map(st => {
      const i = south.cum.findIndex(v => v >= st.s);
      return { name: stations[st.station].name, index: i, km: +(st.s / 1000).toFixed(3), x: south.points[i][0], z: south.points[i][2] };
    }),
    legs: line.legs,
  };
  return { line, route, centre, ground, gap };
}

/** Adds `g` rotated by `yaw` (radians, about +y) at (x, y, z). */
function put(geo: ChunkGeometry, g: THREE.BufferGeometry, x: number, y: number, z: number, yaw: number, c: THREE.Color, layer: 'pillar' | 'prop' | 'deck', lods: number[]): void {
  geo.mesh(g.clone().rotateY(yaw), x, y, z, c, layer, lods);
}

/** The viaduct along the centreline: deck, parapets, two slab tracks, piers and the overhead line. */
export function buildViaduct(geo: ChunkGeometry, bake: MetroBake, onRoad: (x: number, z: number) => boolean): { piers: number; skipped: number } {
  const { centre, ground, gap } = bake;
  const xz = centre.map(([x, , z]) => [x, z] as XZ);
  const top = (i: number) => centre[i][1] - 0.25;          // deck surface under the rails
  const tops = centre.map(([x, , z], i) => [x, top(i), z] as V3);
  geo.deck(tops, ground, DECK_W, C.deck, C.deckSide, 'deck', [0, 1, 2]);
  for (const side of [-1, 1]) {
    const edge = offsetLine(xz, side * (DECK_W / 2 - 0.15)).map(([x, z], i) => [x, top(i) + 1.05, z] as V3);
    geo.ribbon(edge, 0.3, C.deckSide, 'deck', [0, 1], 1.05, C.deckSide);
  }
  for (const side of [-1, 1]) {
    const tc = offsetLine(xz, side * gap / 2);
    geo.ribbon(tc.map(([x, z], i) => [x, top(i) + 0.08, z] as V3), 2.7, C.slab, 'deck', [0, 1], 0.08, C.slab);
    for (const r of [-0.7175, 0.7175]) {
      const rail = offsetLine(tc, r).map(([x, z], i) => [x, centre[i][1], z] as V3);
      geo.ribbon(rail, 0.07, C.steel, 'prop', [0], 0.17, C.steel);
    }
    // Contact wire over each track.
    geo.ribbon(tc.map(([x, z], i) => [x, centre[i][1] + 5.1, z] as V3), 0.03, C.wire, 'prop', [0], 0.03, C.wire);
  }
  const yawAt = (i: number) => {
    const a = xz[Math.max(0, i - 1)], b = xz[Math.min(xz.length - 1, i + 1)];
    return Math.atan2(-(b[1] - a[1]), b[0] - a[0]);        // rotates +x onto the line's direction
  };
  const capGeo = new THREE.BoxGeometry(2.2, 1.4, DECK_W - 1.2).translate(0, -0.7, 0);
  const mastGeo = new THREE.BoxGeometry(0.22, 6.3, 0.22).translate(0, 3.15, 0);
  const armGeo = new THREE.BoxGeometry(0.1, 0.12, gap + 1.2);
  let piers = 0, skipped = 0;
  for (let i = 0; i < centre.length; i += Math.round(32 / STEP)) {
    const [x, , z] = centre[i], g = ground[i], deckBottom = top(i) - 1.2;
    if (deckBottom - g < 4) continue;
    // Line 6's piers stand in the road medians, which OSM often maps as a two-way road's centreline,
    // so they're kept even where that reads as carriageway; only count them.
    if (onRoad(x, z)) skipped++;
    geo.box(x, z, 0.9, 0.9, g, deckBottom - 1.4, C.pier, 'pillar', [0, 1]);
    put(geo, capGeo, x, deckBottom, z, yawAt(i), C.cap, 'pillar', [0, 1]);
    piers++;
  }
  // Overhead line masts every ~48 m, on both deck edges, with an arm over each track.
  const stations = bake.line.stations;
  for (let i = 0; i < centre.length; i += Math.round(48 / STEP)) {
    // Along a station the wires hang from its roof: no masts on the platforms.
    if (stations.some(st => Math.hypot(st.x - centre[i][0], st.z - centre[i][2]) < 100)) continue;
    const yaw = yawAt(i);
    for (const side of [-1, 1]) {
      const [mx, mz] = offsetLine(xz.slice(Math.max(0, i - 1), i + 2), side * (DECK_W / 2 - 0.45))[i === 0 ? 0 : 1];
      put(geo, mastGeo, mx, top(i), mz, yaw, C.mast, 'prop', [0]);
      const [ax, az] = offsetLine(xz.slice(Math.max(0, i - 1), i + 2), side * gap / 2)[i === 0 ? 0 : 1];
      put(geo, armGeo, (mx + ax) / 2, centre[i][1] + 5.9, (mz + az) / 2, yaw, C.mast, 'prop', [0]);
    }
  }
  return { piers, skipped };
}

const S = {
  platform: color(0xbab5a9), platformSide: color(0x9f9a8f), edge: color(0xe8c228), psd: color(0x9bbac4),
  roof: color(0xdcd8cf), roofSide: color(0xa9a59c), column: color(0xc9c5bb), wall: color(0xe6e0d0), concourse: color(0xcfc6b2),
};
const PLATFORM_W = 4.4, PLATFORM_HALF_M = 90, PSD_H = 1.55;

/** A point on a track at distance `s`, offset sideways by `off` (+ right of travel). */
function trackPoint(tr: LineTrack, s: number, off: number): V3 {
  const c = tr.cum, p = tr.points;
  let i = 1;
  while (i < c.length - 1 && c[i] < s) i++;
  const t = Math.max(0, Math.min(1, (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
  const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t, z = p[i - 1][2] + (p[i][2] - p[i - 1][2]) * t;
  let dx = p[i][0] - p[i - 1][0], dz = p[i][2] - p[i - 1][2];
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  return [x - dz * off, y, z + dx * off];
}

/** Points every 3 m along a track between `a` and `b`, offset sideways, lifted by `dy`. */
function along(tr: LineTrack, a: number, b: number, off: number, dy: number): V3[] {
  const n = Math.max(1, Math.ceil((b - a) / 3));
  return Array.from({ length: n + 1 }, (_, k) => { const p = trackPoint(tr, a + ((b - a) * k) / n, off); return [p[0], p[1] + dy, p[2]] as V3; });
}

/**
 * The 16 stations (SPEC §20, M13d): side platforms at train-floor height, 180 m long, outside each
 * track; platform screen doors with an opening at every train door when it stops on the mark; a
 * roof over both platforms on columns; back walls; and the concourse block over the street below.
 */
export function buildStations(geo: ChunkGeometry, bake: MetroBake): number {
  let n = 0;
  const half = bake.gap / 2, lods = [0, 1];
  for (const tr of bake.line.tracks) for (const st of tr.stops) {
    const a = st.s - PLATFORM_HALF_M, b = st.s + PLATFORM_HALF_M, side = st.side === 'left' ? -1 : 1;
    const pc = side * (PLATFORM_EDGE_M + PLATFORM_W / 2);
    geo.ribbon(along(tr, a, b, pc, FLOOR_M - 0.02), PLATFORM_W, S.platform, 'deck', lods, 1.4, S.platformSide);
    geo.ribbon(along(tr, a, b, side * (PLATFORM_EDGE_M + 0.22), FLOOR_M - 0.01), 0.35, S.edge, 'marking', lods);
    // Screen doors: fixed panels between the openings where the train's doors stop.
    const doors = doorOffsets().map(o => st.stopS - o).sort((p, q) => p - q);
    let from = a;
    for (const d of [...doors, b + 1]) {
      const to = Math.min(b, d - 0.8);
      if (to - from > 0.3) geo.ribbon(along(tr, from, to, side * (PLATFORM_EDGE_M + 0.45), FLOOR_M + PSD_H), 0.08, S.psd, 'prop', [0], PSD_H, S.psd);
      from = d + 0.8;
    }
    // Back wall and roof columns at the platform's outer edge, and the roof out to the line's centre.
    geo.ribbon(along(tr, a, b, side * (PLATFORM_EDGE_M + PLATFORM_W + 0.1), FLOOR_M + 2.6), 0.2, S.wall, 'deck', lods, 2.6, S.wall);
    for (let s = a; s <= b; s += 15) {
      const [x, y, z] = trackPoint(tr, s, side * (PLATFORM_EDGE_M + PLATFORM_W - 0.35));
      geo.box(x, z, 0.18, 0.18, y + FLOOR_M, y + 7.0, S.column, 'prop', lods);
    }
    const outer = side * (PLATFORM_EDGE_M + PLATFORM_W + 0.6), inner = -side * half;
    geo.ribbon(along(tr, a - 5, b + 5, (outer + inner) / 2, 7.4), Math.abs(outer - inner), S.roof, 'deck', lods, 0.45, S.roofSide);
    // The concourse below the tracks, once per station (from the southbound side).
    if (tr.dir === 'south') {
      geo.ribbon(along(tr, st.s - 65, st.s + 65, half, -1.7), 2 * (PLATFORM_EDGE_M + PLATFORM_W + 0.6) + bake.gap, S.concourse, 'building', lods, 5.2, S.concourse);
      n++;
    }
  }
  return n;
}
