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
