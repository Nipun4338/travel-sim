// The Line 6 stations (polish spec §6.1), replacing the generic platform: type A (standard), type B
// (A plus an arch roof end: Uttara Center's green and red panels, Bijoy Sarani's glazed fan), type C
// (Uttara North: open sides, branching columns, the widest roof, depot track) and type D (Farmgate:
// cream grid over terracotta, a low teal roof, skywalks). Every part is laid out in a frame that
// follows the line through the station, so the platforms stay true to the track on a slight curve.
import * as THREE from 'three';
import type { ChunkLayer, LineTrack } from '../../src/shared/region';
import { stationUV, type StationSign } from '../../src/shared/stationAtlas';
import { doorOffsets, FLOOR_M, PLATFORM_EDGE_M, TRAIN_M } from '../../src/shared/train';
import { offsetLine } from './build';
import { ChunkGeometry, color, type UV, type V3 } from './geometry';
import type { MetroBake } from './metro';

const C = {
  terracotta: color(0xa9533a), terraDark: color(0x8a4130), cream: color(0xe9dfc7), pilaster: color(0x9a9a94),
  roof: color(0x8c9196), roofUnder: color(0xf4f6f8), green: color(0x1f7a3e), skylight: color(0xc9dde2),
  concrete: color(0xb8b3a8), platform: color(0xc4bfb3), platformSide: color(0x9f9a8f), edge: color(0xf2c200),
  psd: color(0xc9ced2), dark: color(0x2b2b2b), red: color(0xb3262c), teal: color(0x2f8f86), glass: color(0x7d9aa6),
  brick: color(0x9c4a32), deck: color(0xbdb9b0), deckSide: color(0x9a968d), slab: color(0x8f8c86), steel: color(0x8d9196),
  buffer: color(0xd9a21b), white: color(0xffffff),
};
const MAIN = [0, 1], DETAIL = [0];
const HALF_M = 90;            // half the station length
const PSD_H = 1.55;
const WALL_TOP = 6.0;         // wall top (and roof eaves) above rail level, type A
const DECK_UNDER = -1.45;     // the viaduct deck's underside, below rail level
const CONCOURSE_UP = 6.2;     // concourse floor above the street

type Kind = 'A' | 'B-arch' | 'B-fan' | 'C' | 'D';
const KIND: Record<string, Kind> = { 'Uttara North': 'C', 'Uttara Center': 'B-arch', 'Bijoy Sarani': 'B-fan', Farmgate: 'D' };

/**
 * A station's frame: u metres along the southbound track from the station's centre, v across it
 * (+ right of southbound travel, 0 on the line's centre), y above rail level there. Sampled every
 * metre along the track, so long parts are split to follow it.
 */
class Frame {
  private s: Array<[number, number, number, number, number]> = [];   // x, y, z, right x, right z

  constructor(tr: LineTrack, s0: number, half: number, private U: number) {
    const c = tr.cum, p = tr.points;
    let i = 1;
    for (let k = 0; k <= 2 * U; k++) {
      const s = s0 - U + k;
      while (i < c.length - 1 && c[i] < s) i++;
      const t = Math.max(0, Math.min(1, (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
      let dx = p[i][0] - p[i - 1][0], dz = p[i][2] - p[i - 1][2];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t, z = p[i - 1][2] + (p[i][2] - p[i - 1][2]) * t;
      // The southbound track is left of the centre: step right by half the gap.
      this.s.push([x - dz * half, y, z + dx * half, -dz, dx]);
    }
  }

  p(u: number, v: number, y: number): V3 {
    const f = Math.max(0, Math.min(2 * this.U, u + this.U)), i = Math.min(2 * this.U - 1, Math.floor(f)), t = f - i;
    const a = this.s[i], b = this.s[i + 1], m = (k: number) => a[k] + (b[k] - a[k]) * t;
    return [m(0) + m(3) * v, m(1) + y, m(2) + m(4) * v];
  }

  /** The frame position (u, v) nearest a world point. */
  local(x: number, z: number): [number, number] {
    let best = 0, bd = Infinity;
    this.s.forEach(([sx, , sz], k) => { const d = (sx - x) ** 2 + (sz - z) ** 2; if (d < bd) { bd = d; best = k; } });
    const [sx, , sz, rx, rz] = this.s[best];
    return [best - this.U, (x - sx) * rx + (z - sz) * rz];
  }
}

type FV = [number, number, number];   // u, v, y

/** Draws in a station's frame. Boxes are split every ~9 m along u. */
class Kit {
  tris = 0;
  constructor(private geo: ChunkGeometry, readonly f: Frame, readonly station: number) {}

  quad(a: FV, b: FV, c: FV, d: FV, col: THREE.Color, layer: ChunkLayer, lods: number[], uv?: [UV, UV, UV, UV]): void {
    const P = (q: FV) => this.f.p(q[0], q[1], q[2]);
    this.geo.quad(P(a), P(b), P(c), P(d), col, layer, lods, uv);
    this.tris += 2;
  }

  /** Both faces of a quad (for thin panels seen from either side). */
  quad2(a: FV, b: FV, c: FV, d: FV, col: THREE.Color, layer: ChunkLayer, lods: number[]): void {
    this.quad(a, b, c, d, col, layer, lods);
    this.quad(d, c, b, a, col, layer, lods);
  }

  box(u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, col: THREE.Color, layer: ChunkLayer, lods: number[], bottom = false): void {
    const n = Math.max(1, Math.ceil((u1 - u0) / 9.5));
    for (let k = 0; k < n; k++) {
      const a = u0 + ((u1 - u0) * k) / n, b = u0 + ((u1 - u0) * (k + 1)) / n;
      this.quad([a, v0, y1], [b, v0, y1], [b, v0, y0], [a, v0, y0], col, layer, lods);
      this.quad([b, v1, y1], [a, v1, y1], [a, v1, y0], [b, v1, y0], col, layer, lods);
      this.quad([a, v0, y1], [a, v1, y1], [b, v1, y1], [b, v0, y1], col, layer, lods);
      if (bottom) this.quad([a, v0, y0], [b, v0, y0], [b, v1, y0], [a, v1, y0], col, layer, lods);
      if (k === n - 1) this.quad([b, v0, y1], [b, v1, y1], [b, v1, y0], [b, v0, y0], col, layer, lods);
      if (k === 0) this.quad([a, v1, y1], [a, v0, y1], [a, v0, y0], [a, v1, y0], col, layer, lods);
    }
  }

  /** A flat strip facing up, at height y. */
  top(u0: number, u1: number, v0: number, v1: number, y: number, col: THREE.Color, layer: ChunkLayer, lods: number[]): void {
    const n = Math.max(1, Math.ceil((u1 - u0) / 9.5));
    for (let k = 0; k < n; k++) {
      const a = u0 + ((u1 - u0) * k) / n, b = u0 + ((u1 - u0) * (k + 1)) / n;
      this.quad([a, v0, y], [a, v1, y], [b, v1, y], [b, v0, y], col, layer, lods);
    }
  }

  /** A band on a wall's face at v, facing `out` (±1 in v), split along u. */
  band(u0: number, u1: number, v: number, out: number, y0: number, y1: number, col: THREE.Color, lods: number[]): void {
    const n = Math.max(1, Math.ceil((u1 - u0) / 9.5));
    for (let k = 0; k < n; k++) {
      const a = u0 + ((u1 - u0) * k) / n, b = u0 + ((u1 - u0) * (k + 1)) / n;
      if (out < 0) this.quad([a, v, y1], [b, v, y1], [b, v, y0], [a, v, y0], col, 'building', lods);
      else this.quad([b, v, y1], [a, v, y1], [a, v, y0], [b, v, y0], col, 'building', lods);
    }
  }

  /** A sign from the station atlas: corners as the viewer sees them (bottom-left, top-left, top-right, bottom-right). */
  sign(bl: FV, tl: FV, tr: FV, br: FV, which: StationSign): void {
    const [u0, v0, u1, v1] = stationUV(this.station, which);
    this.quad(bl, tl, tr, br, C.white, 'station', MAIN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
  }

  /** A sign in the plane u = const facing +u (out = 1) or −u, centred on v, y. */
  signU(u: number, out: number, v: number, w: number, y0: number, y1: number, which: StationSign): void {
    const l = v + out * (w / 2), r = v - out * (w / 2);   // facing +u the viewer's left is +v
    this.sign([u, l, y0], [u, l, y1], [u, r, y1], [u, r, y0], which);
  }

  /** A sign in the plane v = const facing +v (out = 1) or −v, centred on u, y. */
  signV(v: number, out: number, u: number, w: number, y0: number, y1: number, which: StationSign): void {
    const l = u - out * (w / 2), r = u + out * (w / 2);   // facing +v the viewer's left is −u
    this.sign([l, v, y0], [l, v, y1], [r, v, y1], [r, v, y0], which);
  }

  /** An arched roof over v ∈ [−w, w], eaves at yEdge, crown at yEdge + rise; skylight band at the crown. */
  arch(u0: number, u1: number, w: number, yEdge: number, rise: number, segs: number, col: THREE.Color, rim: THREE.Color, skylight: boolean, trusses: boolean): void {
    const pt = (i: number): [number, number] => { const v = -w + (2 * w * i) / segs, q = v / w; return [v, yEdge + rise * (1 - q * q)]; };
    const n = Math.max(1, Math.ceil((u1 - u0) / 9.5));
    for (let k = 0; k < n; k++) {
      const a = u0 + ((u1 - u0) * k) / n, b = u0 + ((u1 - u0) * (k + 1)) / n;
      for (let i = 0; i < segs; i++) {
        const [va, ya] = pt(i), [vb, yb] = pt(i + 1);
        const c = skylight && (i === segs / 2 - 1 || i === segs / 2) ? C.skylight : col;
        this.quad([a, va, ya], [a, vb, yb], [b, vb, yb], [b, va, ya], c, 'deck', MAIN);
        this.quad([b, va, ya - 0.25], [b, vb, yb - 0.25], [a, vb, yb - 0.25], [a, va, ya - 0.25], C.roofUnder, 'deck', MAIN);
      }
    }
    // Rims at both ends and green eaves along both sides.
    for (const [u, out] of [[u0, -1], [u1, 1]] as const) for (let i = 0; i < segs; i++) {
      const [va, ya] = pt(i), [vb, yb] = pt(i + 1);
      const q: [FV, FV, FV, FV] = [[u, va, ya - 0.6], [u, va, ya], [u, vb, yb], [u, vb, yb - 0.6]];
      if (out > 0) this.quad(q[3], q[2], q[1], q[0], rim, 'deck', MAIN); else this.quad(q[0], q[1], q[2], q[3], rim, 'deck', MAIN);
    }
    for (const s of [-1, 1]) this.box(u0, u1, s * w - 0.25, s * w + 0.25, yEdge - 0.6, yEdge + 0.1, rim, 'deck', MAIN, true);
    // Curved trusses under the roof every 9 m (coarser than the roof, hung clear of it).
    if (trusses) for (let u = Math.ceil(u0 / 9) * 9; u <= u1; u += 9) for (let i = 0; i < 6; i++) {
      const va = -w + (2 * w * i) / 6, vb = va + (2 * w) / 6, y = (v: number) => yEdge + rise * (1 - (v / w) ** 2) - 0.45;
      this.quad2([u, va, y(va) - 0.5], [u, va, y(va)], [u, vb, y(vb)], [u, vb, y(vb) - 0.5], C.pilaster, 'prop', DETAIL);
    }
  }
}

interface Dims { half: number; pe: number; po: number; wall: number; gy: number }

/** Side platforms with edge strips, screen doors, benches, stair heads and roundels on the back wall. */
function platforms(k: Kit, d: Dims, roundels: boolean): void {
  for (const side of [-1, 1]) {
    const vi = side * d.pe, vo = side * d.po, lo = Math.min(vi, vo), hi = Math.max(vi, vo);
    k.box(-HALF_M, HALF_M, lo, hi, DECK_UNDER, FLOOR_M, C.platform, 'deck', MAIN, true);
    k.top(-HALF_M, HALF_M, Math.min(vi, vi + side * 0.4), Math.max(vi, vi + side * 0.4), FLOOR_M + 0.01, C.edge, 'marking', MAIN);
    // Screen doors: fixed panels between the openings where the train's doors stop. The southbound
    // train's front stops TRAIN_M / 2 past the centre (+u); the northbound one's at −u.
    const doors = doorOffsets().map(o => -side * (TRAIN_M / 2 - o)).sort((p, q) => p - q);
    const vp = side * (d.pe + 0.45);
    let from = -HALF_M;
    for (const dd of [...doors, HALF_M + 1]) {
      const to = Math.min(HALF_M, dd - 0.8);
      if (to - from > 0.3) k.box(from, to, vp - 0.05, vp + 0.05, FLOOR_M, FLOOR_M + PSD_H, C.psd, 'prop', DETAIL);
      from = dd + 0.8;
    }
    // Benches, and the stair and escalator heads down to the concourse.
    for (let u = -HALF_M + 12; u < HALF_M - 5; u += 15) {
      const v = side * (d.po - 1.0);
      k.box(u, u + 1.6, v - 0.3, v + 0.3, FLOOR_M, FLOOR_M + 0.45, C.green, 'prop', DETAIL);
    }
    for (const u of [-32, 20]) {
      const v = side * (d.po - 3.0);
      k.box(u, u + 13, v - 1.3, v + 1.3, FLOOR_M, FLOOR_M + 1.1, C.concrete, 'prop', DETAIL);
      k.top(u, u + 13, v - 1.4, v + 1.4, FLOOR_M + 1.12, C.dark, 'prop', DETAIL);
    }
    // Roundels on short brackets off the back wall (clear of the pilasters).
    if (roundels) for (let u = -75; u <= 75; u += 30) {
      const v = side * (d.wall - 0.6);
      k.box(u - 0.05, u + 0.05, Math.min(v, side * (d.wall - 0.2)), Math.max(v, side * (d.wall - 0.2)), FLOOR_M + 2.5, FLOOR_M + 2.6, C.dark, 'prop', DETAIL);
      k.signV(v, -side, u, 2.6, FLOOR_M + 1.9, FLOOR_M + 3.2, 'roundel');
    }
  }
}

/** Terracotta wall panels between grey pilasters every 9 m, thin cream bands and a louvre band. */
function terracottaWalls(k: Kit, d: Dims, y0: number, y1: number): void {
  for (const side of [-1, 1]) {
    const v = side * d.wall;
    for (let u = -HALF_M; u < HALF_M; u += 9) {
      k.box(u, u + 0.8, v - 0.35, v + 0.35, y0, y1 + 0.3, C.pilaster, 'building', MAIN);
      k.box(u + 0.8, u + 9, v - 0.2, v + 0.2, y0, y1, C.terracotta, 'building', MAIN);
      for (const s of [-1, 1]) {
        for (let y = FLOOR_M + 1.6; y < y1 - 1.7; y += 1.6) k.band(u + 0.8, u + 9, v + s * 0.22, s, y, y + 0.12, C.cream, DETAIL);
        k.band(u + 2.2, u + 7.6, v + s * 0.22, s, y1 - 1.6, y1 - 0.5, C.terraDark, DETAIL);
      }
    }
    k.box(HALF_M, HALF_M + 0.8, v - 0.35, v + 0.35, y0, y1 + 0.3, C.pilaster, 'building', MAIN);
  }
}

/** A street entrance: a stair tower up to the concourse, a green canopy and the exit sign. */
function entrance(k: Kit, d: Dims, side: number, u: number, cy: number, tower: THREE.Color, cap: boolean): void {
  const v = side * (d.wall + 4.5), g = d.gy;
  k.box(u - 3, u + 3, v - 1.6, v + 1.6, g, cy + 3.0, tower, 'building', MAIN);
  if (cap) { k.box(u - 3.4, u + 3.4, v - 2.0, v + 2.0, cy + 3.0, cy + 3.6, C.green, 'building', MAIN); k.box(u - 2, u + 2, v - 1.0, v + 1.0, cy + 3.6, cy + 4.4, C.green, 'building', MAIN); }
  // The bridge into the concourse.
  const a = side * (d.wall + 0.4), b = side * (d.wall + 2.9);
  k.box(u - 2.2, u + 2.2, Math.min(a, b), Math.max(a, b), cy, cy + 3.0, C.terracotta, 'building', MAIN, true);
  k.box(u - 5, u + 5, v - 2.4, v + 2.4, g + 3.2, g + 3.5, C.green, 'prop', MAIN, true);
  k.signU(u - 5.05, -1, v, 2.4, g + 3.6, g + 5.5, side < 0 ? 'exitA' : 'exitB');
  k.signU(u + 5.05, 1, v, 2.4, g + 3.6, g + 5.5, side < 0 ? 'exitA' : 'exitB');
}

/** The concourse box straddling the road on piers, with the fascia over the road at both ends. */
function concourse(k: Kit, d: Dims, w: number, u0 = -40, u1 = 40): number {
  const y0 = d.gy + CONCOURSE_UP, y1 = DECK_UNDER;
  for (const u of [u0 + 6, (u0 + u1) / 2, u1 - 6]) k.box(u - 1.2, u + 1.2, -1.2, 1.2, d.gy, y0, C.concrete, 'pillar', MAIN);
  k.box(u0, u1, -w, w, y0, y1, C.terracotta, 'building', MAIN, true);
  k.box(u0 - 0.3, u1 + 0.3, -w - 0.3, w + 0.3, y0 - 0.3, y0 + 0.4, C.cream, 'building', MAIN, true);
  for (const s of [-1, 1]) for (let u = u0 + 2; u < u1 - 3; u += 6) k.band(u, u + 4, s * (w + 0.02), s, y0 + 1.5, y1 - 1.0, C.glass, DETAIL);
  const fw = Math.min(2 * w * 0.75, 3.5 * 4);
  k.signU(u0 - 0.32, -1, 0, fw, y0 + 0.8, y0 + 0.8 + fw / 3.5, 'fascia');
  k.signU(u1 + 0.32, 1, 0, fw, y0 + 0.8, y0 + 0.8 + fw / 3.5, 'fascia');
  return y0;
}

function typeA(k: Kit, d: Dims, kind: Kind): void {
  platforms(k, d, true);
  terracottaWalls(k, d, DECK_UNDER, WALL_TOP);
  const w = d.wall + 1.2;
  k.arch(-HALF_M - 4, HALF_M + 4, w, WALL_TOP, 3.2, 12, C.roof, C.green, true, true);
  const cy = concourse(k, d, d.wall + 0.5);
  const brick = kind === 'B-fan';
  for (const side of [-1, 1]) entrance(k, d, side, side * 26, cy, brick ? C.brick : C.concrete, brick);
  if (kind === 'B-arch') {
    // Uttara Center: an arch of alternating green and red curved panels at each roof end.
    for (const u of [-HALF_M - 4, HALF_M + 4]) {
      const segs = 14, R = w + 1.5;
      const p = (a: number, r: number, du: number): FV => [u + du, -Math.cos(a) * r, WALL_TOP - 2 + Math.sin(a) * r * 0.75];
      for (let i = 0; i < segs; i++) {
        const a0 = (Math.PI * i) / segs, a1 = (Math.PI * (i + 1)) / segs, c = i % 2 ? C.red : C.green;
        for (const du of [-0.3, 0.3]) k.quad2(p(a0, R - 2.2, du), p(a0, R, du), p(a1, R, du), p(a1, R - 2.2, du), c, 'deck', MAIN);
        k.quad2(p(a0, R, -0.3), p(a0, R, 0.3), p(a1, R, 0.3), p(a1, R, -0.3), c, 'deck', MAIN);
      }
    }
  }
  if (kind === 'B-fan') {
    // Bijoy Sarani: a glazed fan arch with a green rim at each roof end.
    for (const u of [-HALF_M - 4.2, HALF_M + 4.2]) {
      const segs = 10, R = w + 0.4, yc = WALL_TOP - 0.6;
      const p = (a: number, r: number): FV => [u, -Math.cos(a) * r, yc + Math.sin(a) * r * 0.62];
      for (let i = 0; i < segs; i++) {
        const a0 = (Math.PI * i) / segs, a1 = (Math.PI * (i + 1)) / segs;
        k.quad2(p(a0, 1.2), p(a0, R), p(a1, R), p(a1, 1.2), C.glass, 'deck', MAIN);
        k.quad2(p(a0, R), p(a0, R + 0.9), p(a1, R + 0.9), p(a1, R), C.green, 'deck', MAIN);
        const m = p(a0, 1.2), n = p(a0, R);
        k.quad2([m[0] + 0.02, m[1] - 0.08, m[2]], [n[0] + 0.02, n[1] - 0.08, n[2]], [n[0] + 0.02, n[1] + 0.08, n[2]], [m[0] + 0.02, m[1] + 0.08, m[2]], C.green, 'prop', DETAIL);
      }
    }
  }
}

/** Uttara North (unconfirmed layout): side platforms on the through tracks, depot track beside them, open sides. */
function typeC(k: Kit, d: Dims, depotV: number[]): void {
  platforms(k, d, false);
  const outer = Math.max(d.wall, ...depotV.map(v => Math.abs(v) + 3.2));
  const top = FLOOR_M;
  // A low terracotta parapet along the platforms' backs, open above, with roundels on posts.
  for (const side of [-1, 1]) {
    const v = side * d.wall;
    k.box(-HALF_M, HALF_M, v - 0.2, v + 0.2, DECK_UNDER, top + 1.1, C.terracotta, 'building', MAIN);
    k.box(-HALF_M, HALF_M, v - 0.25, v + 0.25, top + 1.1, top + 1.25, C.cream, 'building', MAIN);
    for (let u = -75; u <= 75; u += 30) {
      k.box(u - 0.08, u + 0.08, v - side * 0.5 - 0.08, v - side * 0.5 + 0.08, top, top + 3.4, C.dark, 'prop', DETAIL);
      k.signV(v - side * 0.6, -side, u, 2.6, top + 2.0, top + 3.3, 'roundel');
      k.signV(v - side * 0.4, side, u, 2.6, top + 2.0, top + 3.3, 'roundel');
    }
  }
  // Tree-like branching steel columns on the platforms and beyond the depot tracks.
  const cols = [d.pe + 4.2, ...depotV.filter(v => Math.abs(v) > d.wall).map(v => Math.abs(v) + 2.6)];
  for (let u = -HALF_M + 6; u < HALF_M; u += 18) for (const side of [-1, 1]) for (const av of new Set(cols)) {
    if (av > outer) continue;
    const v = side * av, y0 = av > d.wall ? d.gy : top;
    k.box(u - 0.3, u + 0.3, v - 0.3, v + 0.3, y0, top + 4.5, C.pilaster, 'pillar', MAIN);
    for (const [du, dv] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) {
      k.quad2([u, v - 0.15, top + 4.5], [u + du, v + dv - 0.15, top + 7.6], [u + du, v + dv + 0.15, top + 7.6], [u, v + 0.15, top + 4.5], C.pilaster, 'prop', DETAIL);
    }
  }
  k.arch(-HALF_M - 4, HALF_M + 4, outer + 1.0, top + 7.6, 3.5, 16, C.roof, C.green, true, true);
  const cy = concourse(k, d, d.wall + 0.5);
  for (const side of [-1, 1]) entrance(k, d, side, side * 26, cy, C.concrete, false);
}

/** Farmgate: a full-height cream grid façade over terracotta, a low teal roof and skywalks to both pavements. */
function typeD(k: Kit, d: Dims): void {
  platforms(k, d, true);
  const y0 = d.gy + CONCOURSE_UP, y1 = 7.0, w = d.wall;
  for (const side of [-1, 1]) {
    const v = side * w;
    k.box(-HALF_M, HALF_M, v - 0.2, v + 0.2, y0, y1, C.terracotta, 'building', MAIN, true);
    // The grid stands proud of the wall's outer face only; inside, the platforms see terracotta.
    const g0 = v + side * 0.2, g1 = v + side * 0.5;
    for (let u = -HALF_M; u <= HALF_M; u += 3) k.box(u, u + 0.35, Math.min(g0, g1), Math.max(g0, g1), y0, y1, C.cream, 'building', DETAIL);
    for (let y = y0; y <= y1; y += 2.4) k.band(-HALF_M, HALF_M, g1, side, y, y + 0.3, C.cream, MAIN);
  }
  // The underside and the ends: closed below the deck and above the trains, open where the tracks run.
  k.quad([-HALF_M, -w, y0], [HALF_M, -w, y0], [HALF_M, w, y0], [-HALF_M, w, y0], C.terracotta, 'building', MAIN);
  for (const [u, out] of [[-HALF_M, -1], [HALF_M, 1]] as const) {
    const face = (v0: number, v1: number, ya: number, yb: number) => {
      if (out > 0) k.quad([u, v0, yb], [u, v1, yb], [u, v1, ya], [u, v0, ya], C.terracotta, 'building', MAIN);
      else k.quad([u, v1, yb], [u, v0, yb], [u, v0, ya], [u, v1, ya], C.terracotta, 'building', MAIN);
    };
    face(-w, w, y0, DECK_UNDER);
    face(-w, w, 5.4, y1);
    for (const s of [-1, 1]) face(Math.min(s * d.pe, s * w), Math.max(s * d.pe, s * w), DECK_UNDER, 5.4);
    for (let v = -w; v <= w; v += 3) k.box(u - 0.4, u + 0.4, v, v + 0.35, Math.max(y0, 5.4), y1, C.cream, 'building', DETAIL);
    const fw = 2 * w * 0.55;
    k.signU(u + out * 0.42, out, 0, fw, y0 + 0.6, y0 + 0.6 + fw / 3.5, 'fascia');
  }
  k.box(-HALF_M - 2, HALF_M + 2, -w - 1.2, w + 1.2, y1, y1 + 0.5, C.teal, 'deck', MAIN, true);
  k.arch(-HALF_M - 2, HALF_M + 2, w + 0.6, y1 + 0.5, 1.4, 8, C.teal, C.teal, true, false);
  for (const u of [-60, 0, 60]) k.box(u - 1.3, u + 1.3, -1.3, 1.3, d.gy, y0, C.concrete, 'pillar', MAIN);
  // Skywalks out to both pavements: green roofs on terracotta trusses, a stair tower at the far end.
  for (const side of [-1, 1]) {
    const ua = side * 18 - 2, ub = side * 18 + 2, va = side * w, vb = side * (w + 22), lo = Math.min(va, vb), hi = Math.max(va, vb);
    k.box(ua, ub, lo, hi, y0 + 0.5, y0 + 0.9, C.concrete, 'deck', MAIN, true);
    for (const u of [ua, ub]) for (let v = lo; v < hi; v += 2.5) k.box(u - 0.1, u + 0.1, v, v + 0.2, y0 + 0.9, y0 + 3.3, C.terracotta, 'prop', DETAIL);
    k.box(ua - 0.4, ub + 0.4, lo, hi, y0 + 3.3, y0 + 3.6, C.green, 'deck', MAIN, true);
    const vt = side * (w + 24.5);
    k.box(ua - 1, ub + 1, vt - 2.5, vt + 2.5, d.gy, y0 + 3.6, C.terracotta, 'building', MAIN);
    k.box(ua - 1.4, ub + 1.4, vt - 2.9, vt + 2.9, y0 + 3.6, y0 + 4.0, C.green, 'building', MAIN);
    k.box(ua - 4, ub + 4, vt - 3, vt + 3, d.gy + 3.2, d.gy + 3.5, C.green, 'prop', MAIN, true);
    k.signV(vt + side * 2.52, side, (ua + ub) / 2, 2.4, d.gy + 3.6, d.gy + 5.5, side < 0 ? 'exitA' : 'exitB');
  }
}

/** Uttara North's other two OSM tracks (to the depot): deck, slab, rails and buffer stops. */
function depotTrack(geo: ChunkGeometry, pts: V3[], gy: number): void {
  const xz = pts.map(([x, , z]) => [x, z] as [number, number]);
  const deck = pts.map(([x, y, z]) => [x, y - 0.25, z] as V3);
  geo.ribbon(deck, 4.6, C.deck, 'deck', MAIN, 1.2, C.deckSide);
  geo.ribbon(pts.map(([x, y, z]) => [x, y - 0.17, z] as V3), 2.7, C.slab, 'deck', MAIN, 0.08, C.slab);
  for (const r of [-0.7175, 0.7175]) {
    geo.ribbon(offsetLine(xz, r).map(([x, z], i) => [x, pts[i][1], z] as V3), 0.07, C.steel, 'prop', DETAIL, 0.17, C.steel);
  }
  for (let i = 0; i < pts.length; i += 6) geo.box(pts[i][0], pts[i][2], 0.8, 0.8, gy, pts[i][1] - 1.45, C.deckSide, 'pillar', MAIN);
  for (const [i, j] of [[0, 1], [pts.length - 1, pts.length - 2]]) {
    const [x, y, z] = pts[i], [x2, , z2] = pts[j], yaw = Math.atan2(-(z - z2), x - x2);
    geo.mesh(new THREE.BoxGeometry(0.6, 1.0, 2.4).rotateY(yaw).translate(0, 0.5, 0), x, y, z, C.buffer, 'prop', MAIN);
  }
}

/** Builds every station; returns how many of each type, and the station model's triangle counts. */
export function buildStations(geo: ChunkGeometry, bake: MetroBake): Record<string, number> {
  const half = bake.gap / 2;
  const south = bake.line.tracks.find(tr => tr.dir === 'south')!;
  const out: Record<string, number> = {};
  for (const st of south.stops) {
    const name = bake.line.stations[st.station].name, kind = KIND[name] ?? 'A';
    const f = new Frame(south, st.s, half, 140);
    const k = new Kit(geo, f, st.station);
    // Ground and rail level at the station centre, from the nearest centreline sample.
    const [cx, , cz] = f.p(0, 0, 0);
    let ci = 0, bd = Infinity;
    bake.centre.forEach(([x, , z], i) => { const dd = (x - cx) ** 2 + (z - cz) ** 2; if (dd < bd) { bd = dd; ci = i; } });
    const pe = half + PLATFORM_EDGE_M, po = pe + (kind === 'D' ? 6.5 : 6);
    const d: Dims = { half, pe, po, wall: po + 0.2, gy: bake.ground[ci] - bake.centre[ci][1] };
    if (kind === 'C') {
      const depot = st.station === 0 ? bake.depot : [];
      for (const pts of depot) depotTrack(geo, pts, bake.ground[ci]);
      const vs = depot.flatMap(pts => pts.map(([x, , z]) => f.local(x, z)).filter(([u]) => Math.abs(u) < HALF_M).map(([, v]) => v));
      const sides = [-1, 1].map(s => vs.filter(v => Math.sign(v) === s).reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0)).filter(v => v);
      typeC(k, d, sides);
    } else if (kind === 'D') typeD(k, d);
    else typeA(k, d, kind);
    out[`${name} (${kind})`] = k.tris;
  }
  return out;
}
