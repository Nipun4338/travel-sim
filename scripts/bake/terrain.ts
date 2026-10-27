// Ground height from the GLO-30 window. GLO-30 is a surface model, so in dense Dhaka it
// includes buildings and trees; a minimum filter followed by blurring recovers the ground.
import type { DemWindow } from './fetch';
import type { Projection } from './regions';

export type HeightSampler = (x: number, z: number) => number;

export function groundSampler(dem: DemWindow, proj: Projection, minRadiusPx = 3, blurRadiusPx = 4): HeightSampler {
  const { width: W, height: H } = dem;
  let grid = minFilter(dem.data, W, H, minRadiusPx);
  grid = boxBlur(boxBlur(grid, W, H, blurRadiusPx), W, H, blurRadiusPx);
  return (x, z) => {
    const [lat, lon] = proj.toLatLon(x, z);
    const fx = (lon - dem.west) / dem.resLon - 0.5, fy = (dem.north - lat) / dem.resLat - 0.5;
    const ix = Math.max(0, Math.min(W - 2, Math.floor(fx))), iy = Math.max(0, Math.min(H - 2, Math.floor(fy)));
    const tx = Math.max(0, Math.min(1, fx - ix)), ty = Math.max(0, Math.min(1, fy - iy));
    const a = grid[iy * W + ix], b = grid[iy * W + ix + 1], c = grid[(iy + 1) * W + ix], d = grid[(iy + 1) * W + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function minFilter(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = Math.max(0, Math.min(W - 1, x + dx)), yy = Math.max(0, Math.min(H - 1, y + dy));
      const v = src[yy * W + xx];
      if (v > -100 && v < m) m = v; // skip no-data
    }
    out[y * W + x] = Number.isFinite(m) ? m : 0;
  }
  return out;
}

function boxBlur(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      s += src[yy * W + xx]; n++;
    }
    out[y * W + x] = s / n;
  }
  return out;
}

/** A road centreline segment with graded heights at both ends, and its half-width. */
interface ProfileSeg { ax: number; az: number; ay: number; bx: number; bz: number; by: number; half: number; }

/**
 * Grades hill roads (SPEC §4): each drivable way gets a height profile that follows the ground,
 * smoothed over ~±50 m and with its gradient capped. The returned sampler pulls the terrain onto
 * that profile under the carriageway and blends back to natural ground over `blendM` beyond its
 * edge, cutting the hillside above the road and filling below it.
 */
export interface GradedRoad {
  pts: [number, number][];
  half: number;
  rank: number;                       // higher ranks are graded first; others meet them at junctions
  nodes: Array<{ id: number; at: number }>; // OSM nodes and their index in `pts`
  bridgeAt: boolean[];                // per point: bridge decks run straight instead of following the valley
}

export function gradedSampler(
  h: HeightSampler,
  roads: GradedRoad[],
  opts = { spacing: 8, smoothPts: 6, maxGrade: 0.14, blendM: 30, shoulderM: 3, sink: 0.6 },
): HeightSampler {
  const CELL = 40;
  const grid = new Map<string, ProfileSeg[]>();
  const nodeY = new Map<number, number>(); // heights already fixed at shared nodes
  const ordered = [...roads].sort((a, b) => b.rank - a.rank || b.pts.length - a.pts.length);
  for (const road of ordered) {
    const pts = road.pts;
    if (pts.length < 2) continue;
    const raw = pts.map(([x, z]) => h(x, z));
    let ys = raw.map((_, i) => {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - opts.smoothPts); k <= Math.min(raw.length - 1, i + opts.smoothPts); k++) { s += raw[k]; n++; }
      return s / n;
    });
    // Cap the gradient in both directions so the road never climbs a cliff.
    const step = (i: number) => Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.min(Math.max(ys[i], ys[i - 1] - opts.maxGrade * step(i)), ys[i - 1] + opts.maxGrade * step(i));
    for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(Math.max(ys[i], ys[i + 1] - opts.maxGrade * step(i + 1)), ys[i + 1] + opts.maxGrade * step(i + 1));
    // Meet roads graded earlier at their shared nodes: pin those heights and spread each
    // correction linearly to the neighbouring pinned points, so junctions have no step.
    const pins = road.nodes.filter(n => nodeY.has(n.id)).map(n => ({ at: n.at, d: nodeY.get(n.id)! - ys[n.at] }));
    if (pins.length) {
      pins.sort((a, b) => a.at - b.at);
      ys = ys.map((y, i) => {
        if (i <= pins[0].at) return y + pins[0].d;
        if (i >= pins[pins.length - 1].at) return y + pins[pins.length - 1].d;
        const k = pins.findIndex(p => p.at >= i), a = pins[k - 1], b = pins[k];
        return y + a.d + ((b.d - a.d) * (i - a.at)) / Math.max(1, b.at - a.at);
      });
    }
    for (let i = 0; i < ys.length; i++) {
      if (!road.bridgeAt[i]) continue;
      let j = i;
      while (j + 1 < ys.length && road.bridgeAt[j + 1]) j++;
      const a = Math.max(0, i - 1), b = Math.min(ys.length - 1, j + 1);
      for (let k = i; k <= j; k++) ys[k] = ys[a] + ((ys[b] - ys[a]) * (k - a)) / Math.max(1, b - a);
      i = j;
    }
    for (const n of road.nodes) if (!nodeY.has(n.id)) nodeY.set(n.id, ys[n.at]);
    for (let i = 1; i < pts.length; i++) {
      const seg: ProfileSeg = { ax: pts[i - 1][0], az: pts[i - 1][1], ay: ys[i - 1], bx: pts[i][0], bz: pts[i][1], by: ys[i], half: road.half };
      const keys = new Set([`${Math.floor(seg.ax / CELL)},${Math.floor(seg.az / CELL)}`, `${Math.floor(seg.bx / CELL)},${Math.floor(seg.bz / CELL)}`]);
      for (const key of keys) {
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(seg);
      }
    }
  }
  const reach = Math.ceil(opts.blendM / CELL) + 1;
  return (x, z) => {
    const natural = h(x, z);
    // Nearest road segment (by distance beyond its carriageway edge), with the height interpolated
    // along it, so tight bends and nearby roads can't hand over a height from another stretch.
    let bestY = 0, bestEdge = Infinity;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
      for (const sg of grid.get(`${cx + i},${cz + j}`) ?? []) {
        const dx = sg.bx - sg.ax, dz = sg.bz - sg.az, len2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - sg.ax) * dx + (z - sg.az) * dz) / len2));
        const edge = Math.hypot(sg.ax + dx * t - x, sg.az + dz * t - z) - sg.half;
        if (edge < bestEdge) { bestEdge = edge; bestY = sg.ay + (sg.by - sg.ay) * t; }
      }
    }
    if (bestEdge >= opts.shoulderM + opts.blendM) return natural;
    // Flat at road level across the carriageway and a shoulder, then blend back to the hillside.
    // The ground sits a little below the road so terrain triangles never poke through it.
    const t = Math.max(0, bestEdge - opts.shoulderM) / opts.blendM, blend = t * t * (3 - 2 * t);
    const flat = bestY - opts.sink;
    return flat + (natural - flat) * blend;
  };
}
