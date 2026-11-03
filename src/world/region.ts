// Streams a baked Region (SPEC §4): chunk LODs by distance, and Rapier colliders near the bus.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { materialFor } from '../render/materials';
import { COLLIDER_LAYERS, type ChunkEntry, type ChunkLayer, type LaneData, type RegionManifest, type RouteData } from '../shared/region';

// Distances are from the bus to the nearest edge of a chunk, so the chunk under the bus and its
// neighbours always qualify.
const LOD_DISTANCE = [350, 1100, 2800]; // limits for LOD 0, 1, 2
const COLLIDER_DISTANCE = 250;
const SHADOW_CASTERS: ReadonlyArray<ChunkLayer> = ['building', 'wall', 'tree', 'deck', 'pillar', 'prop', 'sign', 'station'];

interface LoadedChunk {
  entry: ChunkEntry;
  lod: number;          // LOD currently shown, -1 if none
  loading: number;      // LOD being fetched, -1 if none
  group: THREE.Group | null;
  colliders: RAPIER.Collider[];
  lod0: THREE.Group | null; // kept while colliders exist
  retryAt: number;      // after a failed fetch, don't ask again until then (ms)
}

export class RegionWorld {
  manifest!: RegionManifest;
  route!: RouteData;
  private chunks = new Map<string, LoadedChunk>();
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private body: RAPIER.RigidBody;
  private layers = new Map<number, ChunkLayer>();
  readonly root = new THREE.Group();

  /** `physics: false` streams the scenery only, with no colliders (Metro Mode runs on its line). */
  constructor(private baseUrl: string, scene: THREE.Scene, private world: RAPIER.World, private physics = true) {
    scene.add(this.root);
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  }

  /** Returns false if the Region hasn't been baked (no manifest). */
  async init(): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/manifest.json`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return false;
    this.manifest = await res.json();
    this.route = await (await fetch(`${this.baseUrl}/${this.manifest.route}`)).json();
    // Safety floor 2 m under the lowest Route point, in case the bus outruns chunk loading.
    const floorY = Math.min(...this.route.points.map(p => p[1])) - 2;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(20000, 0.5, 20000).setTranslation(0, floorY - 0.5, 0), this.body);
    for (const entry of this.manifest.chunks) {
      this.chunks.set(entry.id, { entry, lod: -1, loading: -1, group: null, colliders: [], lod0: null, retryAt: 0 });
    }
    return true;
  }

  /** Loads everything the bus needs at `pos` before physics starts. */
  async prime(pos: THREE.Vector3, onProgress?: (p: number) => void): Promise<void> {
    this.update(pos);
    const all = [...this.pending];
    let done = 0;
    await Promise.all(all.map(p => p.finally(() => onProgress?.(++done / all.length))));
    this.update(pos);
    await Promise.all([...this.pending]);
  }

  private pending = new Set<Promise<void>>();

  update(pos: THREE.Vector3): void {
    const size = this.manifest.chunkSize;
    const now = performance.now();
    for (const c of this.chunks.values()) {
      if (now < c.retryAt) continue;
      const x0 = c.entry.cx * size, z0 = c.entry.cz * size;
      const dx = Math.max(x0 - pos.x, 0, pos.x - (x0 + size)), dz = Math.max(z0 - pos.z, 0, pos.z - (z0 + size));
      const d = Math.hypot(dx, dz);
      const want = LOD_DISTANCE.findIndex(limit => d < limit);
      const needColliders = this.physics && d < COLLIDER_DISTANCE;
      if (want !== c.lod && want !== c.loading) this.load(c, want);
      if (needColliders && !c.colliders.length && c.lod0) this.addColliders(c);
      if (!needColliders && c.colliders.length) this.removeColliders(c);
      if (needColliders && !c.lod0 && c.loading !== 0 && want !== 0) this.load(c, 0);
    }
  }

  private load(c: LoadedChunk, lod: number): void {
    if (lod < 0) { this.show(c, null, -1); return; }
    c.loading = lod;
    const p = this.loader.loadAsync(`${this.baseUrl}/${c.entry.lods[lod]}`).then(gltf => {
      if (c.loading !== lod) return;
      c.loading = -1;
      const group = gltf.scene;
      group.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        o.material = materialFor(o.name as ChunkLayer);
        // Sun shadows (when the tier turns them on): solid things cast, the ground and decks receive.
        o.castShadow = SHADOW_CASTERS.includes(o.name as ChunkLayer);
        o.receiveShadow = o.name !== 'tree';
      });
      group.updateMatrixWorld(true);
      if (lod === 0) c.lod0 = group;
      this.show(c, group, lod);
    }).catch(err => { c.loading = -1; c.retryAt = performance.now() + 5000; console.error(`chunk ${c.entry.id} lod${lod}`, err); });
    this.pending.add(p);
    p.finally(() => this.pending.delete(p));
  }

  private show(c: LoadedChunk, group: THREE.Group | null, lod: number): void {
    if (c.group) this.root.remove(c.group);
    c.group = group;
    c.lod = lod;
    if (group) this.root.add(group);
    if (lod !== 0 && !c.colliders.length) c.lod0 = null;
  }

  private addColliders(c: LoadedChunk): void {
    c.lod0!.traverse(o => {
      if (!(o instanceof THREE.Mesh) || !COLLIDER_LAYERS.includes(o.name as ChunkLayer)) return;
      const geo = o.geometry as THREE.BufferGeometry;
      const pos = geo.getAttribute('position'), index = geo.getIndex();
      const v = new Float32Array(pos.count * 3), p = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        v[i * 3] = p.x; v[i * 3 + 1] = p.y; v[i * 3 + 2] = p.z;
      }
      const idx = index ? Uint32Array.from(index.array as ArrayLike<number>) : Uint32Array.from({ length: pos.count }, (_, i) => i);
      const col = this.world.createCollider(RAPIER.ColliderDesc.trimesh(v, idx).setFriction(1), this.body);
      this.layers.set(col.handle, o.name as ChunkLayer);
      c.colliders.push(col);
    });
  }

  private removeColliders(c: LoadedChunk): void {
    c.colliders.forEach(col => { this.layers.delete(col.handle); this.world.removeCollider(col, false); });
    c.colliders = [];
    if (c.lod !== 0) c.lod0 = null;
  }

  /** The lane graph for AI traffic (SPEC §7). */
  async loadLanes(): Promise<LaneData> {
    return (await fetch(`${this.baseUrl}/${this.manifest.lanes}`)).json();
  }

  /** The chunk layer a collider was built from, if it belongs to this Region. */
  layerOf(handle: number): ChunkLayer | undefined { return this.layers.get(handle); }

  /** True if the chunk under `pos` has its colliders, so the bus can't fall through. */
  hasCollidersAt(pos: { x: number; z: number }): boolean {
    const size = this.manifest.chunkSize;
    const c = this.chunks.get(`${Math.floor(pos.x / size)}_${Math.floor(pos.z / size)}`);
    return !c || c.colliders.length > 0; // outside the baked area: nothing to wait for
  }

  /** Spawn pose at a Route point index, facing along the Route. */
  poseAt(index: number): { position: THREE.Vector3; yaw: number } {
    const pts = this.route.points, i = Math.min(index, pts.length - 2);
    const [x, y, z] = pts[i], [x2, , z2] = pts[i + 1];
    return { position: new THREE.Vector3(x, y + 2.1, z), yaw: Math.atan2(-(z2 - z), x2 - x) };
  }
}
