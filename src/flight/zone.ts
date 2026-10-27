// Streams a baked Flight Zone (SPEC §4, §8): a whole-zone backdrop, 2 km chunks at two detail
// levels by distance, and instanced building boxes, thinned out with distance. The height field is
// the ground the flight model lands on and crashes into.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { materialFor } from '../render/materials';
import type { ChunkLayer } from '../shared/region';
import { BUILDING_STRIDE, type Runway, type ZoneChunk, type ZoneManifest } from '../shared/zone';
import type { FlightGround } from './FlightModel';

export type ZoneQuality = 'low' | 'medium' | 'high';

// Distances from the plane to the nearest edge of a chunk (m).
const RANGES: Record<ZoneQuality, { lod0: number; lod1: number; buildings: number; fullBuildings: number }> = {
  low: { lod0: 1500, lod1: 5000, buildings: 3000, fullBuildings: 800 },
  medium: { lod0: 2500, lod1: 8000, buildings: 5000, fullBuildings: 1500 },
  high: { lod0: 3500, lod1: 11000, buildings: 8000, fullBuildings: 2500 },
};
const CELL = 100;

interface Box { x: number; z: number; c: number; s: number; hw: number; hd: number; y0: number; y1: number; }

interface Chunk {
  entry: ZoneChunk;
  lod: number;
  loading: number;
  group: THREE.Group | null;
  buildings: THREE.InstancedMesh | null;
  boxes: Box[] | null;
  cells: Map<number, number[]> | null;
  bldLoading: boolean;
}

export class ZoneWorld implements FlightGround {
  manifest!: ZoneManifest;
  runways: Runway[] = [];
  readonly root = new THREE.Group();
  private heights!: Uint16Array;
  private chunks = new Map<string, Chunk>();
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  private bldMat = new THREE.MeshLambertMaterial({ flatShading: true });
  private pending = new Set<Promise<void>>();

  constructor(private baseUrl: string, scene: THREE.Scene, private quality: ZoneQuality = 'medium') {
    scene.add(this.root);
  }

  /** Returns false if the zone hasn't been baked. */
  async init(): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/manifest.json`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return false;
    this.manifest = await res.json();
    this.runways = this.manifest.runways;
    this.heights = new Uint16Array(await (await fetch(`${this.baseUrl}/${this.manifest.height.file}`)).arrayBuffer());
    const backdrop = await this.loader.loadAsync(`${this.baseUrl}/${this.manifest.backdrop}`);
    this.prepare(backdrop.scene);
    this.root.add(backdrop.scene);
    for (const entry of this.manifest.chunks) {
      this.chunks.set(entry.id, { entry, lod: -1, loading: -1, group: null, buildings: null, boxes: null, cells: null, bldLoading: false });
    }
    return true;
  }

  /** Ground height, interpolated on the same triangles the terrain is drawn with. */
  height(x: number, z: number): number {
    const { gridM, n, min, step } = this.manifest.height, H = this.manifest.halfM;
    const fx = (x + H) / gridM, fz = (z + H) / gridM;
    const i = Math.max(0, Math.min(n - 2, Math.floor(fx))), j = Math.max(0, Math.min(n - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j));
    const q = (ii: number, jj: number) => min + this.heights[jj * n + ii] * step;
    const a = q(i, j), b = q(i, j + 1), c = q(i + 1, j + 1), d = q(i + 1, j);
    return tz >= tx ? a + tx * (c - b) + tz * (b - a) : a + tx * (d - a) + tz * (c - d);
  }

  /** True inside a building box in a loaded chunk. */
  solidAt(x: number, y: number, z: number): boolean {
    const c = this.chunkAt(x, z);
    if (!c?.boxes || !c.cells) return false;
    const H = this.manifest.halfM, size = this.manifest.chunkSize;
    const lx = x - (-H + c.entry.cx * size), lz = z - (-H + c.entry.cz * size);
    for (const k of c.cells.get(Math.floor(lx / CELL) * 1000 + Math.floor(lz / CELL)) ?? []) {
      const b = c.boxes[k];
      if (y > b.y1 || y < b.y0) continue;
      const dx = x - b.x, dz = z - b.z;
      if (Math.abs(dx * b.c + dz * b.s) < b.hw && Math.abs(-dx * b.s + dz * b.c) < b.hd) return true;
    }
    return false;
  }

  /** True if (x, z) is inside the zone. */
  inside(x: number, z: number): boolean {
    const H = this.manifest.halfM;
    return Math.abs(x) < H && Math.abs(z) < H;
  }

  async prime(pos: THREE.Vector3): Promise<void> {
    this.update(pos);
    await Promise.all([...this.pending]);
    this.update(pos);
  }

  update(pos: THREE.Vector3): void {
    const H = this.manifest.halfM, size = this.manifest.chunkSize, r = RANGES[this.quality];
    // Higher up, more of the zone matters and less of each building.
    const lift = Math.max(0, pos.y - this.height(pos.x, pos.z));
    const reach = 1 + Math.min(1, lift / 1500) * 0.5;
    for (const c of this.chunks.values()) {
      const x0 = -H + c.entry.cx * size, z0 = -H + c.entry.cz * size;
      const dx = Math.max(x0 - pos.x, 0, pos.x - (x0 + size)), dz = Math.max(z0 - pos.z, 0, pos.z - (z0 + size));
      const d = Math.hypot(dx, dz);
      const want = d < r.lod0 ? 0 : d < r.lod1 * reach ? 1 : -1;
      if (want !== c.lod && want !== c.loading) this.load(c, want);
      if (c.entry.buildings && d < r.buildings * reach && !c.buildings && !c.bldLoading) this.loadBuildings(c);
      if (c.buildings) {
        const share = d < r.fullBuildings ? 1 : d < r.buildings * reach ? Math.max(0.03, 0.35 * (1 - d / (r.buildings * reach))) : 0;
        c.buildings.count = Math.ceil(c.entry.buildingCount * share);
        c.buildings.visible = c.buildings.count > 0;
      }
    }
  }

  private chunkAt(x: number, z: number): Chunk | undefined {
    const H = this.manifest.halfM, size = this.manifest.chunkSize;
    return this.chunks.get(`${Math.floor((x + H) / size)}_${Math.floor((z + H) / size)}`);
  }

  private prepare(group: THREE.Object3D): void {
    group.traverse(o => { if (o instanceof THREE.Mesh) o.material = materialFor(o.name as ChunkLayer); });
  }

  private load(c: Chunk, lod: number): void {
    if (lod < 0) { this.show(c, null, -1); return; }
    c.loading = lod;
    const p = this.loader.loadAsync(`${this.baseUrl}/${c.entry.lods[lod]}`).then(gltf => {
      if (c.loading !== lod) return;
      c.loading = -1;
      this.prepare(gltf.scene);
      this.show(c, gltf.scene, lod);
    }).catch(err => { c.loading = -1; console.error(`zone chunk ${c.entry.id} lod${lod}`, err); });
    this.track(p);
  }

  private show(c: Chunk, group: THREE.Group | null, lod: number): void {
    if (c.group) this.root.remove(c.group);
    c.group = group;
    c.lod = lod;
    if (group) this.root.add(group);
  }

  private loadBuildings(c: Chunk): void {
    c.bldLoading = true;
    const p = fetch(`${this.baseUrl}/${c.entry.buildings}`).then(r => r.arrayBuffer()).then(buf => {
      const rec = new Uint16Array(buf), count = rec.length / BUILDING_STRIDE;
      const H = this.manifest.halfM, size = this.manifest.chunkSize;
      const ox = -H + c.entry.cx * size, oz = -H + c.entry.cz * size;
      const mesh = new THREE.InstancedMesh(this.boxGeo, this.bldMat, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p3 = new THREE.Vector3(), col = new THREE.Color();
      const up = new THREE.Vector3(0, 1, 0);
      const boxes: Box[] = [], cells = new Map<number, number[]>();
      for (let k = 0; k < count; k++) {
        const o = k * BUILDING_STRIDE;
        const x = ox + rec[o] / 32, z = oz + rec[o + 1] / 32, w = rec[o + 2] / 10, d = rec[o + 3] / 10, h = rec[o + 4] / 10;
        const angle = (rec[o + 5] / 65535) * Math.PI, rgb = rec[o + 6];
        const cs = Math.cos(angle), sn = Math.sin(angle), hw = w / 2, hd = d / 2;
        // Sit on the lowest corner so slopes don't leave a gap under the box.
        let base = Infinity;
        for (const [u, v] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) base = Math.min(base, this.height(x + u * cs - v * sn, z + u * sn + v * cs));
        base -= 0.5;
        // Box local +x is the footprint's `w` side, at `angle` from world +x (towards +z).
        q.setFromAxisAngle(up, -angle);
        mesh.setMatrixAt(k, m.compose(p3.set(x, base, z), q, s.set(w, h + 0.5, d)));
        mesh.setColorAt(k, col.setRGB(((rgb >> 11) & 31) / 31, ((rgb >> 5) & 63) / 63, (rgb & 31) / 31));
        boxes.push({ x, z, c: cs, s: sn, hw, hd, y0: base, y1: base + h + 0.5 });
        const rr = Math.hypot(hw, hd);
        for (let i = Math.floor((x - ox - rr) / CELL); i <= Math.floor((x - ox + rr) / CELL); i++) {
          for (let j = Math.floor((z - oz - rr) / CELL); j <= Math.floor((z - oz + rr) / CELL); j++) {
            const key = i * 1000 + j;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key)!.push(k);
          }
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.count = 0;
      mesh.frustumCulled = true;
      c.buildings = mesh;
      c.boxes = boxes;
      c.cells = cells;
      this.root.add(mesh);
    }).catch(err => { c.bldLoading = false; console.error(`zone buildings ${c.entry.id}`, err); });
    this.track(p);
  }

  private track(p: Promise<void>): void {
    this.pending.add(p);
    p.finally(() => this.pending.delete(p));
  }
}
