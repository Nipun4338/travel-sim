// Accumulates flat-shaded, vertex-coloured triangles per chunk, LOD and layer.
import * as THREE from 'three';
import { CHUNK_SIZE, LOD_COUNT, type ChunkLayer } from '../../src/shared/region';

export type V3 = [number, number, number];
export type UV = [number, number];

interface LayerBuf { pos: number[]; col: number[]; uv?: number[]; }
type ChunkBufs = Map<ChunkLayer, LayerBuf>;

export class ChunkGeometry {
  /** key "cx_cz" -> per-LOD layer buffers */
  readonly chunks = new Map<string, ChunkBufs[]>();

  chunkOf(x: number, z: number): [number, number] {
    return [Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)];
  }

  private buf(cx: number, cz: number, lod: number, layer: ChunkLayer): LayerBuf {
    const key = `${cx}_${cz}`;
    let lods = this.chunks.get(key);
    if (!lods) { lods = Array.from({ length: LOD_COUNT }, () => new Map()); this.chunks.set(key, lods); }
    let b = lods[lod].get(layer);
    if (!b) { b = { pos: [], col: [] }; lods[lod].set(layer, b); }
    return b;
  }

  /**
   * Adds a triangle to every LOD in `lods`, in the chunk containing its centroid. Layers that use
   * texture coordinates (walls) must pass `uv` for every triangle.
   */
  tri(a: V3, b: V3, c: V3, color: THREE.Color, layer: ChunkLayer, lods: number[], uv?: [UV, UV, UV]): void {
    const [cx, cz] = this.chunkOf((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3);
    for (const lod of lods) {
      const buf = this.buf(cx, cz, lod, layer);
      buf.pos.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) buf.col.push(color.r, color.g, color.b);
      if (uv) (buf.uv ??= []).push(...uv[0], ...uv[1], ...uv[2]);
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: THREE.Color, layer: ChunkLayer, lods: number[], uv?: [UV, UV, UV, UV]): void {
    this.tri(a, b, c, color, layer, lods, uv && [uv[0], uv[1], uv[2]]);
    this.tri(a, c, d, color, layer, lods, uv && [uv[0], uv[2], uv[3]]);
  }

  /** Adds a non-indexed THREE geometry (e.g. a low-poly canopy), translated, in one colour. */
  mesh(geom: THREE.BufferGeometry, x: number, y: number, z: number, color: THREE.Color, layer: ChunkLayer, lods: number[]): void {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 3) {
      const v = (k: number): V3 => [p.getX(k) + x, p.getY(k) + y, p.getZ(k) + z];
      this.tri(v(i), v(i + 1), v(i + 2), color, layer, lods);
    }
  }

  /** A box from y0 to y1 centred on (x, z), axis-aligned. */
  box(x: number, z: number, hw: number, hd: number, y0: number, y1: number, color: THREE.Color, layer: ChunkLayer, lods: number[]): void {
    const p = (dx: number, y: number, dz: number): V3 => [x + dx, y, z + dz];
    const c = [p(-hw, 0, -hd), p(hw, 0, -hd), p(hw, 0, hd), p(-hw, 0, hd)];
    const lo = c.map(v => [v[0], y0, v[2]] as V3), hi = c.map(v => [v[0], y1, v[2]] as V3);
    // Counter-clockwise when seen from outside (+x east, +z south, +y up).
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; this.quad(hi[i], hi[j], lo[j], lo[i], color, layer, lods); }
    this.quad(hi[0], hi[3], hi[2], hi[1], color, layer, lods);
  }

  /**
   * A ribbon along a polyline at per-point heights. With `thickness`, adds side faces down to
   * y - thickness (used for elevated decks).
   */
  ribbon(pts: V3[], width: number, color: THREE.Color, layer: ChunkLayer, lods: number[], thickness = 0, sideColor?: THREE.Color): void {
    if (pts.length < 2) return;
    const L: V3[] = [], R: V3[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[2] - a[2];
      const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
      const rx = -tz, rz = tx, h = width / 2;
      L.push([pts[i][0] - rx * h, pts[i][1], pts[i][2] - rz * h]);
      R.push([pts[i][0] + rx * h, pts[i][1], pts[i][2] + rz * h]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      this.quad(L[i], R[i], R[i + 1], L[i + 1], color, layer, lods);
      if (thickness > 0) {
        const down = (v: V3): V3 => [v[0], v[1] - thickness, v[2]];
        const sc = sideColor ?? color;
        this.quad(L[i], L[i + 1], down(L[i + 1]), down(L[i]), sc, layer, lods);
        this.quad(down(R[i]), down(R[i + 1]), R[i + 1], R[i], sc, layer, lods);
      }
    }
  }
}

/** Splits a polyline so no segment is longer than `maxLen`, so grading follows the terrain. */
export function densify(pts: [number, number][], maxLen: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / maxLen));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export const color = (hex: number) => new THREE.Color(hex);

export function hash01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
