// AI traffic around the bus (SPEC §7): kinematic, lane-following vehicles using the Intelligent
// Driver Model, with lane changes, junction phases and a reaction to being hit.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { LaneData } from '../shared/region';
import type { Junctions } from './junctions';
import { SPECS, vehicleGeometry, vehicleMaterial, type VehicleType } from './models';
import { LaneNetwork, type Path } from './network';

export type QualityTier = 'low' | 'medium' | 'high';
export const TRAFFIC_CAP: Record<QualityTier, number> = { low: 25, medium: 45, high: 80 };

const SPAWN_MIN = 140;
const MIN_GAP = 2.0;
const RICKSHAW_ZONE_M = 700;   // rickshaws only in the kerb lane around Farmgate (SPEC §7)

/** Per-Region traffic (SPEC §7): Dhaka runs dense; Bandarban has ~1 vehicle per km, mostly jeeps. */
export interface TrafficStyle {
  mix: Array<[VehicleType, number]>;
  radius: number;              // vehicles are simulated within this distance of the bus
  maxVehicles?: number;        // further cap on top of the quality tier
  hillRoad: boolean;           // hairpins: take the middle; meeting the bus head-on: pull in and slow
}
export const TRAFFIC_STYLES: Record<string, TrafficStyle> = {
  dhaka: { mix: [['bus', 0.2], ['cng', 0.3], ['car', 0.25], ['motorbike', 0.15], ['truck', 0.1]], radius: 400, hillRoad: false },
  bandarban: { mix: [['jeep', 0.55], ['truck', 0.15], ['cng', 0.15], ['motorbike', 0.15]], radius: 900, maxVehicles: 9, hillRoad: true },
};

interface Vehicle {
  type: VehicleType;
  path: Path;
  s: number;
  lane: number;
  lateral: number;
  v: number;
  heldUntil: number;     // stopped after a collision
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  color: THREE.Color;
}

export interface BusObstacle { x: number; z: number; hx: number; hz: number; speed: number; }

const tmp = { x: 0, y: 0, z: 0, hx: 1, hz: 0 };
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

export class Traffic {
  readonly network: LaneNetwork;
  private vehicles: Vehicle[] = [];
  private meshes = new Map<VehicleType, THREE.InstancedMesh>();
  private byCollider = new Map<number, Vehicle>();
  private time = 0;
  private cap: number;
  private rnd: () => number;
  /** Event hook: a vehicle sounds its horn (audio arrives in M9). */
  onHonk: (type: VehicleType) => void = () => {};

  constructor(
    lanes: LaneData, scene: THREE.Scene, private world: RAPIER.World, private junctions: Junctions,
    cap: number, private rickshawCentre: { x: number; z: number } | null, private style: TrafficStyle = TRAFFIC_STYLES.dhaka, seed = 7,
  ) {
    this.cap = Math.min(cap, style.maxVehicles ?? cap);
    this.network = new LaneNetwork(lanes);
    let s = seed;
    this.rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (const type of Object.keys(SPECS) as VehicleType[]) {
      const mesh = new THREE.InstancedMesh(vehicleGeometry(type), vehicleMaterial, cap);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      scene.add(mesh);
      this.meshes.set(type, mesh);
    }
  }

  get count(): number { return this.vehicles.length; }

  /** The vehicle a collider belongs to, if any. */
  isVehicle(handle: number): boolean { return this.byCollider.has(handle); }

  /** A collision with the bus: the vehicle stops and honks for about 5 s (SPEC §7). */
  hit(handle: number): void {
    const v = this.byCollider.get(handle);
    if (!v) return;
    v.v = 0;
    v.heldUntil = this.time + 5;
    this.onHonk(v.type);
  }

  /** Removes all vehicles, e.g. when the bus jumps to another Leg. */
  clear(): void { while (this.vehicles.length) this.remove(0); }

  update(dt: number, bus: BusObstacle): void {
    this.time += dt;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      this.network.sample(v.path, v.s, tmp);
      if (Math.hypot(tmp.x - bus.x, tmp.z - bus.z) > this.style.radius * 1.2) this.remove(i);
    }
    for (let tries = 0; tries < 6 && this.vehicles.length < this.cap; tries++) this.trySpawn(bus);
    for (const v of this.vehicles) this.drive(v, dt, bus);
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.s > v.path.length) {
        const next = this.network.next(v.path, this.rnd());
        if (!next) { this.remove(i); continue; }
        v.s -= v.path.length;
        v.path = next;
        v.lane = Math.min(v.lane, next.lanes - 1);
        v.lateral = this.network.laneOffset(next, v.lane);
      }
    }
    this.syncVisuals();
  }

  private drive(v: Vehicle, dt: number, bus: BusObstacle): void {
    const spec = SPECS[v.type];
    const v0 = spec.speedKmh / 3.6;
    this.network.sample(v.path, v.s, tmp);
    const hx = tmp.hx, hz = tmp.hz;

    // Nearest obstacle ahead in this lane: another vehicle, the bus, or a junction stop line.
    let gap = Infinity, leaderV = 0;
    const consider = (g: number, sp: number) => { if (g < gap) { gap = g; leaderV = sp; } };
    for (const o of this.vehicles) {
      if (o === v || Math.abs(o.lateral - v.lateral) > 1.6) continue;
      const half = (SPECS[o.type].length + spec.length) / 2;
      if (o.path === v.path && o.s > v.s) consider(o.s - v.s - half, o.v);
      else if (o.path !== v.path && v.path.length - v.s < 40 && o.path.startNode === v.path.endNode && o.s < 40) consider(v.path.length - v.s + o.s - half, o.v);
    }
    const bx = bus.x - tmp.x, bz = bus.z - tmp.z, along = bx * hx + bz * hz;
    const lat = Math.abs(-bx * hz + bz * hx - v.lateral); // bus offset to the right of the path, minus our lane's
    if (along > 0 && along < 70 && lat < spec.width / 2 + 1.6) consider(along - spec.length / 2 - 5.5, Math.max(0, bus.speed * (bus.hx * hx + bus.hz * hz)));
    const j = this.junctions.ahead(tmp.x, tmp.z, hx, hz, 60);
    if (j && this.junctions.stateFor(j.j, hx, hz).stop) {
      const stopDist = (v.v * v.v) / (2 * spec.comfortDecel * 1.6);
      if (j.dist > Math.min(2, stopDist)) consider(j.dist, 0); // too close to stop: carry on through
    }

    // Intelligent Driver Model.
    if (this.time < v.heldUntil) { v.v = 0; return; }
    const dv = v.v - leaderV;
    const sStar = MIN_GAP + v.v * spec.headwayS + (v.v * dv) / (2 * Math.sqrt(spec.maxAccel * spec.comfortDecel));
    const free = 1 - (v.v / v0) ** 4;
    const a = spec.maxAccel * (free - (Number.isFinite(gap) ? (Math.max(sStar, 0) / Math.max(gap, 0.1)) ** 2 : 0));
    v.v = Math.max(0, Math.min(v0 * 1.05, v.v + Math.max(a, -8) * dt));
    v.s += v.v * dt;

    // Lane change to pass something slow, if the target lane is clear.
    if (v.type !== 'rickshaw' && v.path.lanes > 1 && gap < 30 && leaderV < 0.7 * v0 && this.rnd() < spec.aggression * dt * 0.8) {
      const target = v.lane + (this.rnd() < 0.5 ? -1 : 1);
      if (target >= 0 && target < v.path.lanes) {
        const off = this.network.laneOffset(v.path, target);
        const blocked = this.vehicles.some(o => o !== v && o.path === v.path && Math.abs(o.lateral - off) < 1.6 && Math.abs(o.s - v.s) < 12);
        if (!blocked) v.lane = target;
      }
    }
    let want = this.network.laneOffset(v.path, v.lane);
    if (this.style.hillRoad && v.path.way.dir === 0) {
      // Meeting the bus head-on: pull in to the kerb and crawl past (the "squeeze past", SPEC §7).
      const oncoming = along > 0 && along < 60 && bus.hx * hx + bus.hz * hz < -0.5 && lat < 6;
      if (oncoming) { want -= 0.9; v.v = Math.min(v.v, 12 / 3.6); }
      // Otherwise hug the middle of the road on hairpins.
      else if (this.bendAhead(v) > 0.9) want *= 0.15;
    }
    v.lateral += Math.max(-1.2 * dt, Math.min(1.2 * dt, want - v.lateral));
  }

  /** Heading change over the next ~30 m of the path, radians. */
  private bendAhead(v: Vehicle): number {
    const a = { x: 0, y: 0, z: 0, hx: 1, hz: 0 }, b = { x: 0, y: 0, z: 0, hx: 1, hz: 0 };
    this.network.sample(v.path, v.s, a);
    this.network.sample(v.path, Math.min(v.path.length, v.s + 30), b);
    return Math.abs(Math.atan2(a.hx * b.hz - a.hz * b.hx, a.hx * b.hx + a.hz * b.hz));
  }

  private trySpawn(bus: BusObstacle): void {
    const paths = this.network.paths;
    const p = paths[Math.floor(this.rnd() * paths.length)];
    const s = this.rnd() * p.length;
    this.network.sample(p, s, tmp);
    const d = Math.hypot(tmp.x - bus.x, tmp.z - bus.z);
    if (d < SPAWN_MIN || d > this.style.radius) return;
    const lane = Math.floor(this.rnd() * p.lanes);
    const lateral = this.network.laneOffset(p, lane);
    if (this.vehicles.some(o => o.path === p && Math.abs(o.s - s) < 18 && Math.abs(o.lateral - lateral) < 1.6)) return;

    let type: VehicleType = this.style.mix[0][0];
    const r = this.rnd();
    let acc = 0;
    for (const [t, w] of this.style.mix) { acc += w; if (r < acc) { type = t; break; } }
    const rc = this.rickshawCentre;
    if (rc && lane === 0 && Math.hypot(tmp.x - rc.x, tmp.z - rc.z) < RICKSHAW_ZONE_M && this.rnd() < 0.2) type = 'rickshaw';

    const spec = SPECS[type];
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(tmp.x, tmp.y + spec.height / 2, tmp.z));
    const collider = this.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.length / 2, spec.height / 2, spec.width / 2), body);
    const color = new THREE.Color(spec.tints[Math.floor(this.rnd() * spec.tints.length)]);
    const vehicle: Vehicle = { type, path: p, s, lane, lateral, v: (spec.speedKmh / 3.6) * 0.7, heldUntil: 0, body, collider, color };
    this.vehicles.push(vehicle);
    this.byCollider.set(collider.handle, vehicle);
  }

  private remove(i: number): void {
    const v = this.vehicles[i];
    this.byCollider.delete(v.collider.handle);
    this.world.removeRigidBody(v.body);
    this.vehicles.splice(i, 1);
  }

  private syncVisuals(): void {
    const counts = new Map<VehicleType, number>();
    for (const v of this.vehicles) {
      this.network.sample(v.path, v.s, tmp);
      const x = tmp.x - tmp.hz * v.lateral, z = tmp.z + tmp.hx * v.lateral; // + lateral = right of travel
      const yaw = Math.atan2(-tmp.hz, tmp.hx);
      q.setFromAxisAngle(up, yaw);
      v.body.setNextKinematicTranslation({ x, y: tmp.y + SPECS[v.type].height / 2, z });
      v.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      const mesh = this.meshes.get(v.type)!, n = counts.get(v.type) ?? 0;
      m4.compose(pos.set(x, tmp.y, z), q, one);
      mesh.setMatrixAt(n, m4);
      mesh.setColorAt(n, v.color);
      counts.set(v.type, n + 1);
    }
    for (const [type, mesh] of this.meshes) {
      mesh.count = counts.get(type) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}
