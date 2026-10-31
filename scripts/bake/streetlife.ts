// The street-life kit (polish spec §3): painted Bangla shop boards stacked up the facades, blade
// signs and rooftop billboards from the sign atlas, plus poles and sagging wires, tea stalls,
// parked rickshaws and people along the footpaths. Everything is low-poly boxes and quads.
import * as THREE from 'three';
import { BILLBOARD_CELLS, SIGN_CELLS, billboardUV, signUV, type UVRect } from '../../src/shared/signAtlas';
import { ChunkGeometry, color, densify, hash01, type UV, type V3 } from './geometry';
import { DRIVABLE, isElevated, isOneway, roadRank, roadWidth, type Indexed } from './osm';
import { offsetLine } from './build';
import type { PointGrid } from './spatial';
import type { HeightSampler } from './terrain';

/** How much street life a stretch gets: D on commercial stretches, C elsewhere. */
export interface StreetDensity {
  stack: number;       // floors of boards above the ground floor
  blade: number;       // share of frontage bays with a blade sign over the footpath
  billboard: number;   // share of buildings ≥ 12 m with a rooftop billboard
  wires: number;       // wires per pole span
  stallEvery: number;  // m between tea stalls
  peoplePerM: number;  // per side of the road
  rickshawPerM: number;
}
export const BUSY: StreetDensity = { stack: 3, blade: 0.5, billboard: 0.45, wires: 12, stallEvery: 25, peoplePerM: 0.2, rickshawPerM: 0.025 };
export const MEDIUM: StreetDensity = { stack: 2, blade: 0.25, billboard: 0.25, wires: 6, stallEvery: 45, peoplePerM: 0.09, rickshawPerM: 0.01 };
/** Picks the density at a point on the street. */
export type DensityAt = (x: number, z: number) => StreetDensity;

const FLOOR_H = 3.2;
const WHITE = color(0xffffff);
const C = {
  awning: [0x2e6e9e, 0x2a8a4b, 0xb0302f, 0xd9a21b, 0x6a4c9c].map(color),
  post: color(0x555555), back: color(0x6e6a63), pole: color(0x8d877b), arm: color(0x5a554c), box: color(0x2b2b2b), wire: color(0x1a1a1a),
  counter: color(0x7a5230), tarp: [0x1f5fbf, 0xd9a21b, 0x2a8a4b].map(color), bench: color(0x8b5a2b), kettle: color(0xb0b0b0),
  frame: color(0x2c2c2c), hood: [0xd62828, 0x1f5fbf, 0xf2c200, 0xc2187a].map(color),
  legs: [0x3a3a3a, 0x5b4a32, 0x2e4a6e].map(color), shirt: [0xf4f1e8, 0x2e6e9e, 0x9e2b25, 0x2a8a4b, 0xd9a21b, 0x5a4a7a, 0x222222].map(color),
  skin: [0x8d5524, 0xa0673a, 0x6b4423].map(color),
};
const pick = <T>(a: T[], r: number): T => a[Math.floor(r * a.length) % a.length];

/** A board quad facing out of a wall (a→b along it, normal n), textured from the atlas. */
function board(geo: ChunkGeometry, p: (s: number, out: number, y: number) => V3, s0: number, s1: number, y0: number, y1: number, out: number, uv: UVRect, lods: number[]): void {
  const [u0, v0, u1, v1] = uv;
  const quv: [UV, UV, UV, UV] = [[u1, v0], [u1, v1], [u0, v1], [u0, v0]];
  geo.quad(p(s0, out, y0), p(s0, out, y1), p(s1, out, y1), p(s1, out, y0), WHITE, 'sign', lods, quv);
}

/**
 * Boards, awnings, blade signs and a rooftop billboard on one wall facing a main road. `a`→`b` is
 * the wall at ground height `base`; the building is `height` tall. Returns what it added.
 */
export function frontage(
  geo: ChunkGeometry, a: THREE.Vector2, b: THREE.Vector2, base: number, height: number, id: number, wallNo: number, d: StreetDensity,
): { signs: number; billboards: number } {
  const len = a.distanceTo(b), dx = (b.x - a.x) / len, dz = (b.y - a.y) / len, nx = dz, nz = -dx;
  const p = (s: number, out: number, y: number): V3 => [a.x + dx * s + nx * out, base + y, a.y + dz * s + nz * out];
  const floors = Math.floor((height - 1) / FLOOR_H), bays = Math.max(1, Math.floor(len / 4.5));
  const r = (k: number) => hash01(id * 31 + wallNo * 7 + k);
  let signs = 0, billboards = 0;
  for (let k = 0; k < bays; k++) {
    const s0 = (k / bays) * len + 0.3, s1 = ((k + 1) / bays) * len - 0.3;
    board(geo, p, s0, s1, 3.0, 4.3, 0.12, signUV(Math.floor(r(k) * 997) % SIGN_CELLS), [0]);
    const ac = pick(C.awning, r(k + 50));
    geo.quad(p(s0, 0.05, 2.8), p(s1, 0.05, 2.8), p(s1, 1.3, 2.35), p(s0, 1.3, 2.35), ac, 'prop', [0]);
    signs++;
    // A blade sign sticking out over the footpath.
    if (floors >= 2 && r(k + 100) < d.blade) {
      const s = (s0 + s1) / 2, y0 = 4.6 + r(k + 150) * 3, uv = signUV(Math.floor(r(k + 200) * 997) % SIGN_CELLS);
      const q = (out: number, y: number): V3 => p(s, out, y);
      const [u0, v0, u1, v1] = uv;
      geo.quad(q(0.2, y0), q(0.2, y0 + 0.7), q(2.0, y0 + 0.7), q(2.0, y0), WHITE, 'sign', [0], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
      geo.quad(q(2.0, y0), q(2.0, y0 + 0.7), q(0.2, y0 + 0.7), q(0.2, y0), WHITE, 'sign', [0], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
      signs++;
    }
  }
  // Boards stacked up the facade, uneven widths, a few slots left bare.
  for (let f = 1; f <= Math.min(d.stack, floors - 1); f++) {
    let s = 0.3, k = 0;
    while (s < len - 1.5) {
      const w = Math.min(len - 0.3 - s, 2.5 + r(300 + f * 40 + k) * 5), y = f * FLOOR_H + 2.4 + r(400 + f * 40 + k) * 0.3;
      if (r(500 + f * 40 + k) < 0.75) {
        board(geo, p, s, s + w, y, y + 0.8 + r(600 + f * 40 + k) * 0.5, 0.15, signUV(Math.floor(r(700 + f * 40 + k) * 997) % SIGN_CELLS), [0]);
        signs++;
      }
      s += w + 0.3; k++;
    }
  }
  // A rooftop billboard facing the road, on two posts.
  if (height >= 12 && len >= 6 && r(900) < d.billboard) {
    const mid = len / 2, bw = Math.min(10, len - 1), y0 = height + 1.2, y1 = y0 + bw * 0.28;
    board(geo, p, mid - bw / 2, mid + bw / 2, y0, y1, -0.6, billboardUV(Math.floor(r(950) * 97) % BILLBOARD_CELLS), [0, 1]);
    geo.quad(p(mid + bw / 2, -0.65, y0), p(mid + bw / 2, -0.65, y1), p(mid - bw / 2, -0.65, y1), p(mid - bw / 2, -0.65, y0), C.back, 'prop', [0, 1]);
    for (const s of [mid - bw / 3, mid + bw / 3]) { const [x, , z] = p(s, -0.8, 0); geo.box(x, z, 0.08, 0.08, base + height, base + y0, C.post, 'prop', [0]); }
    billboards++;
  }
  return { signs, billboards };
}

/** One low-poly person standing at (x, y, z): legs, shirt, head (three boxes). */
function person(geo: ChunkGeometry, x: number, y: number, z: number, r: number): void {
  const h = 1.5 + r * 0.25;
  geo.box(x, z, 0.2, 0.14, y, y + h * 0.5, pick(C.legs, r * 7), 'prop', [0]);
  geo.box(x, z, 0.23, 0.15, y + h * 0.5, y + h * 0.86, pick(C.shirt, r * 13), 'prop', [0]);
  geo.box(x, z, 0.12, 0.12, y + h * 0.86, y + h, pick(C.skin, r * 17), 'prop', [0]);
}

/** A sagging wire from p to q as thin vertical quads (seen from the cab and the side). */
function wire(geo: ChunkGeometry, p: V3, q: V3, sag: number): void {
  const n = 8, at = (t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - sag * 4 * t * (1 - t), p[2] + (q[2] - p[2]) * t];
  for (let i = 0; i < n; i++) {
    const a = at(i / n), b = at((i + 1) / n);
    geo.quad(a, [a[0], a[1] + 0.05, a[2]], [b[0], b[1] + 0.05, b[2]], b, C.wire, 'prop', [0]);
  }
}

/**
 * Poles and wires at the kerb, tea stalls, rickshaws and people on the footpaths of the main roads
 * (the ones with footpaths: tertiary and up) near the Route.
 */
export function buildStreetLife(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, junctions: PointGrid, near: (x: number, z: number) => boolean, densityAt: DensityAt,
): { poles: number; stalls: number; people: number; rickshaws: number } {
  let poles = 0, stalls = 0, people = 0, rickshaws = 0;
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < 2 || roadRank(t.highway) >= 6 || isElevated(w, idx) || (t.bridge && t.bridge !== 'no')) continue;
    const flat = w.nodes.map(id => idx.nodes.get(id)).filter(Boolean).map(n => [n!.x, n!.z] as [number, number]);
    if (flat.length < 2) continue;
    const width = roadWidth(t), fw = roadRank(t.highway) >= 4 ? 2.5 : 1.8;
    // Split into runs clear of junctions, like the markings and footpaths.
    const runs: [number, number][][] = [];
    let cur: [number, number][] = [];
    for (const pt of densify(flat, 4)) {
      if (junctions.near(pt[0], pt[1], Math.max(10, width)) || !near(pt[0], pt[1])) { if (cur.length > 1) runs.push(cur); cur = []; }
      else cur.push(pt);
    }
    if (cur.length > 1) runs.push(cur);
    // A one-way way is usually half of a dual carriageway: only its left side (traffic keeps left)
    // is a footpath; the other is the median.
    const dir = isOneway(t), sides = dir > 0 ? [-1] : dir < 0 ? [1] : [-1, 1];
    for (const run of runs) for (const side of sides) {
      const seed = w.id * 13 + side * 7 + run.length;
      const r = (k: number) => hash01(seed + k * 101);
      const kerb = offsetLine(run, side * (width / 2 + 0.4)), back = offsetLine(run, side * (width / 2 + fw - 0.6)), mid = offsetLine(run, side * (width / 2 + fw / 2));
      const cum = [0];
      for (let i = 1; i < run.length; i++) cum.push(cum[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
      const total = cum[cum.length - 1];
      const at = (line: [number, number][], s: number): [number, number] => {
        let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
        const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
        return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f];
      };
      const ground = (x: number, z: number) => h(x, z) + 0.3; // footpath top
      // Poles every ~30 m with junction boxes; wire bundles between neighbours.
      let prev: V3 | null = null, prevD: StreetDensity | null = null;
      for (let s = 5 + r(1) * 10, k = 0; s < total - 3; s += 28 + r(k + 2) * 6, k++) {
        const [x, z] = at(kerb, s), y = ground(x, z), d = densityAt(x, z);
        geo.box(x, z, 0.15, 0.15, y, y + 9, C.pole, 'prop', [0, 1]);
        geo.box(x, z, 0.06, 1.2, y + 7.5, y + 7.7, C.arm, 'prop', [0]);
        if (r(k + 3) < 0.6) for (let b = 0; b < 3; b++) geo.box(x + 0.25, z, 0.17, 0.12, y + 6 + b * 0.4, y + 6.35 + b * 0.4, C.box, 'prop', [0]);
        const top: V3 = [x, y + 7.4, z];
        if (prev && prevD) {
          const n = Math.round((d.wires + prevD.wires) / 2);
          for (let i = 0; i < n; i++) {
            const o = (r(k * 31 + i) - 0.5) * 2.2, dy = -r(k * 37 + i) * 1.6;
            wire(geo, [prev[0] + o * 0.3, prev[1] + dy, prev[2] + o * 0.3], [top[0] + o * 0.3, top[1] + dy, top[2] + o * 0.3], 0.4 + r(k * 41 + i) * 1.1);
          }
        }
        prev = top; prevD = d; poles++;
      }
      // Tea stalls at the back of the footpath, with a few customers.
      for (let s = 8 + r(5) * 20, k = 0; s < total - 3; k++) {
        const [x, z] = at(back, s), y = ground(x, z), d = densityAt(x, z);
        geo.box(x, z, 0.8, 0.5, y, y + 0.95, C.counter, 'prop', [0]);
        geo.box(x, z, 1.1, 0.9, y + 2.15, y + 2.23, pick(C.tarp, r(k + 7)), 'prop', [0]);
        for (const dx of [-0.9, 0.9]) geo.box(x + dx, z, 0.03, 0.03, y, y + 2.15, C.post, 'prop', [0]);
        geo.box(x - 1.4, z, 0.7, 0.18, y + 0.35, y + 0.45, C.bench, 'prop', [0]);
        geo.box(x + 0.35, z, 0.12, 0.12, y + 0.95, y + 1.25, C.kettle, 'prop', [0]);
        for (let c = 0; c < 3; c++) { person(geo, x - 1.2 + c * 0.8, y, z + (r(k * 11 + c) - 0.5) * 0.8, r(k * 13 + c)); people++; }
        stalls++;
        s += d.stallEvery * (0.6 + r(k + 9) * 0.8);
      }
      // People walking or standing along the footpath.
      for (let s = r(11) * 5, k = 0; s < total; k++) {
        const [x, z] = at(mid, s), d = densityAt(x, z);
        person(geo, x + (r(k + 13) - 0.5) * 0.8, ground(x, z), z + (r(k + 17) - 0.5) * 0.8, r(k + 19));
        people++;
        s += (1 / d.peoplePerM) * (0.4 + r(k + 23) * 1.2);
      }
      // Rickshaws parked at the kerb edge of the footpath.
      for (let s = r(29) * 30, k = 0; s < total; k++) {
        const [x, z] = at(kerb, s), y = ground(x, z), d = densityAt(x, z);
        const [x2, z2] = at(kerb, Math.min(total, s + 1)), yaw = Math.atan2(x2 - x, z2 - z);
        const box = (along: number, hw: number, hd: number, y0: number, y1: number, c: THREE.Color) =>
          geo.box(x + Math.sin(yaw) * along, z + Math.cos(yaw) * along, hw, hd, y + y0, y + y1, c, 'prop', [0]);
        box(0, 0.45, 0.45, 0.3, 0.9, C.frame);
        box(0.3, 0.5, 0.5, 0.9, 1.9, pick(C.hood, r(k + 31)));
        box(-0.9, 0.04, 0.04, 0.15, 1.0, C.post);
        rickshaws++;
        s += (1 / d.rickshawPerM) * (0.5 + r(k + 37));
      }
    }
  }
  return { poles, stalls, people, rickshaws };
}
