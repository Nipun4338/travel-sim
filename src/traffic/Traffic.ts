// AI traffic around the bus (SPEC §7): kinematic, lane-following vehicles using the Intelligent
// Driver Model, with lane changes, junction phases and a reaction to being hit.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { LaneData } from '../shared/region';
import type { Junctions } from './junctions';
import { SPECS, brakeGeometry, glowGeometry, glowMaterial, lampGeometry, lampMaterial, vehicleGeometry, vehicleMaterial, type VehicleType } from './models';
import { LaneNetwork, type Path } from './network';
import { BUS_LIVERIES, busSignGeometry, busSignMaterial, truckSignGeometry, truckSignMaterial } from './signs';

export type QualityTier = 'low' | 'medium' | 'high';
export const TRAFFIC_CAP: Record<QualityTier, number> = { low: 25, medium: 45, high: 80 };

const SPAWN_MIN = 140;
const VIEW_MARGIN = 8;         // m added to a vehicle's bounding sphere, so it can't peek in at a frame edge
const FAR_SPAWN_M = 320;       // beyond this from the camera a new vehicle is a few pixels: it may appear in view
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
  livery: number;        // buses: index into BUS_LIVERIES
  yaw: number | null;    // drawn heading, eased so turns don't snap at road vertices
  brakeT: number;        // brake lamps stay lit while > 0
}

/** The player's vehicle; with `ghost` it only centres the traffic (Metro Mode's train is up on the viaduct). */
export interface BusObstacle { x: number; z: number; hx: number; hz: number; speed: number; ghost?: boolean; }

const tmp = { x: 0, y: 0, z: 0, hx: 1, hz: 0 }, back = { ...tmp }, front = { ...tmp };
const frustum = new THREE.Frustum(), viewProj = new THREE.Matrix4(), sphere = new THREE.Sphere();
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qp = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(0, 0, 1), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

/** AI traffic speed in monsoon rain. */
export const RAIN_TRAFFIC_FACTOR = 0.85;

export class Traffic {
  readonly network: LaneNetwork;
  private vehicles: Vehicle[] = [];
  private meshes = new Map<VehicleType, THREE.InstancedMesh>();
  /** Lettering drawn over the bodies: one mesh per bus company, one for trucks. */
  private busSigns: THREE.InstancedMesh[];
  private truckSigns: THREE.InstancedMesh;
  /** Night lamps per type: lamp faces, glow, and brake lamps (see `lights`). */
  private lamps = new Map<VehicleType, { lamp: THREE.InstancedMesh; glow: THREE.InstancedMesh; brake: THREE.InstancedMesh }>();
  private byCollider = new Map<number, Vehicle>();
  private time = 0;
  /** No vehicles yet (start, or after `clear`): the next update fills up in one go, in view or not. */
  private fresh = true;
  private cap: number;
  private rnd: () => number;
  /** Level crossings with their booms down: traffic stops short of them. */
  closedCrossings: Array<{ x: number; z: number }> = [];

  /** Rain slows AI traffic (SPEC §7): `speedScale` is set to RAIN_TRAFFIC_FACTOR. */
  speedScale = 1;

  /** Headlights, tail and brake lamps on: at night and in rain or fog (SPEC §9). */
  lights = false;

  /**
   * The camera the player sees through. Vehicles only appear or vanish where it can't see them:
   * out of its view or past the fog. Without one, they come and go at the radius as before.
   */
  view: THREE.Camera | null = null;

  /** Event hook: a vehicle sounds its horn (audio arrives in M9). */
  onHonk: (type: VehicleType) => void = () => {};

  constructor(
    lanes: LaneData, private scene: THREE.Scene, private world: RAPIER.World, private junctions: Junctions,
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
      mesh.castShadow = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      scene.add(mesh);
      this.meshes.set(type, mesh);
    }
    const lamp = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    };
    for (const type of Object.keys(SPECS) as VehicleType[]) {
      this.lamps.set(type, { lamp: lamp(lampGeometry(type), lampMaterial), glow: lamp(glowGeometry(type), glowMaterial), brake: lamp(brakeGeometry(type), glowMaterial) });
    }
    const signs = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    };
    const busGeo = busSignGeometry();
    this.busSigns = BUS_LIVERIES.map(l => signs(busGeo, busSignMaterial(l)));
    this.truckSigns = signs(truckSignGeometry(), truckSignMaterial());
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
  clear(): void { while (this.vehicles.length) this.remove(0); this.fresh = true; }

  /**
   * Simulates traffic within the style's radius of `bus` (the player's vehicle, which AI traffic
   * also drives around). New vehicles spawn and far ones despawn only out of the `view` camera's
   * sight, so nothing pops in or out on screen; a vehicle still in view stays until it isn't.
   */
  update(dt: number, bus: BusObstacle): void {
    this.time += dt;
    this.updateView();
    const radius = this.style.radius;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      this.network.sample(v.path, v.s, tmp);
      const d = Math.hypot(tmp.x - bus.x, tmp.z - bus.z);
      // Out of sight, a vehicle goes as soon as it's past the radius (freeing its slot for the road
      // ahead); in view it stays until twice that, when it's a speck.
      if (d > radius * 2 || (d > radius && this.hidden(tmp, SPECS[v.type].length))) this.remove(i);
    }
    const fill = this.fresh;
    for (let tries = 0; tries < (fill ? 400 : 6) && this.vehicles.length < this.cap; tries++) this.trySpawn(bus, fill);
    this.fresh = false;
    for (const v of this.vehicles) this.drive(v, dt, bus);
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.s > v.path.length) {
        const next = this.network.next(v.path, this.rnd());
        if (!next) {
          // The lane network ends here (the edge of the baked map): wait at the end until out of sight.
          this.network.sample(v.path, v.path.length, tmp);
          if (this.hidden(tmp, SPECS[v.type].length)) this.remove(i);
          else { v.s = v.path.length; v.v = 0; }
          continue;
        }
        v.s -= v.path.length;
        v.path = next;
        v.lane = Math.min(v.lane, next.lanes - 1);
        // v.lateral eases to the new lane in drive(), so a change in lane count doesn't jump sideways.
      }
    }
    this.syncBodies();
  }

  private drive(v: Vehicle, dt: number, bus: BusObstacle): void {
    const spec = SPECS[v.type];
    const v0 = (spec.speedKmh / 3.6) * this.speedScale;
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
    if (!bus.ghost && along > 0 && along < 70 && lat < spec.width / 2 + 1.6) consider(along - spec.length / 2 - 5.5, Math.max(0, bus.speed * (bus.hx * hx + bus.hz * hz)));
    const j = this.junctions.ahead(tmp.x, tmp.z, hx, hz, 60);
    if (j && this.junctions.stateFor(j.j, hx, hz).stop) {
      const stopDist = (v.v * v.v) / (2 * spec.comfortDecel * 1.6);
      if (j.dist > Math.min(2, stopDist)) consider(j.dist, 0); // too close to stop: carry on through
    }

    for (const c of this.closedCrossings) {
      const cx = c.x - tmp.x, cz = c.z - tmp.z, ca = cx * hx + cz * hz;
      if (ca > 0 && ca < 80 && Math.abs(-cx * hz + cz * hx) < 9) consider(ca - 9, 0);
    }

    // Intelligent Driver Model.
    if (this.time < v.heldUntil) { v.v = 0; v.brakeT = 0.5; return; }
    const dv = v.v - leaderV;
    const sStar = MIN_GAP + v.v * spec.headwayS + (v.v * dv) / (2 * Math.sqrt(spec.maxAccel * spec.comfortDecel));
    const free = 1 - (v.v / v0) ** 4;
    const a = spec.maxAccel * (free - (Number.isFinite(gap) ? (Math.max(sStar, 0) / Math.max(gap, 0.1)) ** 2 : 0));
    v.v = Math.max(0, Math.min(v0 * 1.05, v.v + Math.max(a, -8) * dt));
    v.brakeT = a < -1 || (v.v < 0.5 && gap < 25) ? 0.5 : v.brakeT - dt;
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
      const oncoming = !bus.ghost && along > 0 && along < 60 && bus.hx * hx + bus.hz * hz < -0.5 && lat < 6;
      if (oncoming) { want -= 0.9; v.v = Math.min(v.v, 12 / 3.6); }
      // Otherwise hug the middle of the road on hairpins.
      else if (this.bendAhead(v) > 0.9) want *= 0.15;
    }
    v.lateral += Math.max(-1.2 * dt, Math.min(1.2 * dt, want - v.lateral));
  }

  private updateView(): void {
    const cam = this.view;
    if (!cam) return;
    cam.updateMatrixWorld();
    frustum.setFromProjectionMatrix(viewProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  }

  private distant(p: { x: number; y: number; z: number }): boolean {
    const cam = this.view;
    return !cam || Math.hypot(p.x - cam.position.x, p.y - cam.position.y, p.z - cam.position.z) > FAR_SPAWN_M;
  }

  /** Whether the player can't see a vehicle of this length at `p`: out of view, or lost in the fog. */
  private hidden(p: { x: number; y: number; z: number }, length: number): boolean {
    const cam = this.view;
    if (!cam) return true;
    const fog = this.scene.fog;
    const far = fog instanceof THREE.Fog ? fog.far : Infinity;
    const r = length / 2 + VIEW_MARGIN;
    if (Math.hypot(p.x - cam.position.x, p.y - cam.position.y, p.z - cam.position.z) > far + r) return true;
    sphere.center.set(p.x, p.y + 1.5, p.z);
    sphere.radius = r;
    return !frustum.intersectsSphere(sphere);
  }

  /** Heading change over the next ~30 m of the path, radians. */
  private bendAhead(v: Vehicle): number {
    const a = { x: 0, y: 0, z: 0, hx: 1, hz: 0 }, b = { x: 0, y: 0, z: 0, hx: 1, hz: 0 };
    this.network.sample(v.path, v.s, a);
    this.network.sample(v.path, Math.min(v.path.length, v.s + 30), b);
    return Math.abs(Math.atan2(a.hx * b.hz - a.hz * b.hx, a.hx * b.hx + a.hz * b.hz));
  }

  private trySpawn(bus: BusObstacle, anywhere = false): void {
    const paths = this.network.paths;
    const p = paths[Math.floor(this.rnd() * paths.length)];
    const s = this.rnd() * p.length;
    this.network.sample(p, s, tmp);
    const d = Math.hypot(tmp.x - bus.x, tmp.z - bus.z);
    if (d < SPAWN_MIN || d > this.style.radius) return;
    // Out of sight (11 m: room for the longest vehicle), or far enough off to be a speck; otherwise a
    // road that stays in view (a straight ahead by day, when the fog is past the radius) never refills.
    if (!anywhere && !this.hidden(tmp, 11) && !this.distant(tmp)) return;
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
    const livery = Math.floor(this.rnd() * BUS_LIVERIES.length);
    const color = new THREE.Color(type === 'bus' ? BUS_LIVERIES[livery].body : spec.tints[Math.floor(this.rnd() * spec.tints.length)]);
    const vehicle: Vehicle = { type, path: p, s, lane, lateral, v: (spec.speedKmh / 3.6) * 0.7, heldUntil: 0, body, collider, color, livery, yaw: null, brakeT: 0 };
    this.vehicles.push(vehicle);
    this.byCollider.set(collider.handle, vehicle);
  }

  private remove(i: number): void {
    const v = this.vehicles[i];
    this.byCollider.delete(v.collider.handle);
    this.world.removeRigidBody(v.body);
    this.vehicles.splice(i, 1);
  }

  /** Moves the physics bodies to where the vehicles are at this step. */
  private syncBodies(): void {
    for (const v of this.vehicles) {
      this.network.sample(v.path, v.s, tmp);
      const x = tmp.x - tmp.hz * v.lateral, z = tmp.z + tmp.hx * v.lateral; // + lateral = right of travel
      q.setFromAxisAngle(up, Math.atan2(-tmp.hz, tmp.hx));
      v.body.setNextKinematicTranslation({ x, y: tmp.y + SPECS[v.type].height / 2, z });
      v.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
  }

  /**
   * Draws the vehicles `ahead` seconds past the last step. Heading and pitch come from the road 3 m
   * behind and ahead (the path is a polyline of ~10 m segments, so its own heading jumps at every
   * vertex), and the heading is eased so a turn onto the next road sweeps round instead of snapping.
   */
  draw(ahead: number, frameDt: number): void {
    const counts = new Map<VehicleType, number>(), signCounts = new Map<THREE.InstancedMesh, number>(), brakes = new Map<VehicleType, number>();
    const ease = 1 - Math.exp(-frameDt * 10);
    for (const v of this.vehicles) {
      const s = Math.min(v.path.length, v.s + v.v * ahead);
      this.network.sample(v.path, s, tmp);
      this.network.sample(v.path, Math.max(0, s - 3), back);
      this.network.sample(v.path, Math.min(v.path.length, s + 3), front);
      let dx = front.x - back.x, dz = front.z - back.z;
      const run = Math.hypot(dx, dz) || 1;
      dx /= run; dz /= run;
      const target = Math.atan2(-dz, dx);
      if (v.yaw === null) v.yaw = target;
      else v.yaw += Math.atan2(Math.sin(target - v.yaw), Math.cos(target - v.yaw)) * ease;
      const pitch = Math.atan2(front.y - back.y, run);
      const x = tmp.x - dz * v.lateral, z = tmp.z + dx * v.lateral; // + lateral = right of travel
      q.setFromAxisAngle(up, v.yaw).multiply(qp.setFromAxisAngle(side, pitch));
      const mesh = this.meshes.get(v.type)!, n = counts.get(v.type) ?? 0;
      m4.compose(pos.set(x, tmp.y, z), q, one);
      mesh.setMatrixAt(n, m4);
      mesh.setColorAt(n, v.color);
      counts.set(v.type, n + 1);
      if (this.lights) {
        const l = this.lamps.get(v.type)!;
        l.lamp.setMatrixAt(n, m4);
        l.glow.setMatrixAt(n, m4);
        if (v.brakeT > 0) {
          const b = brakes.get(v.type) ?? 0;
          l.brake.setMatrixAt(b, m4);
          brakes.set(v.type, b + 1);
        }
      }
      const signs = v.type === 'bus' ? this.busSigns[v.livery] : v.type === 'truck' ? this.truckSigns : null;
      if (signs) {
        const k = signCounts.get(signs) ?? 0;
        signs.setMatrixAt(k, m4);
        signCounts.set(signs, k + 1);
      }
    }
    for (const [type, mesh] of this.meshes) {
      mesh.count = counts.get(type) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      const l = this.lamps.get(type)!;
      l.lamp.count = l.glow.count = this.lights ? mesh.count : 0;
      l.brake.count = this.lights ? brakes.get(type) ?? 0 : 0;
      for (const m of [l.lamp, l.glow, l.brake]) m.instanceMatrix.needsUpdate = true;
    }
    for (const signs of [...this.busSigns, this.truckSigns]) {
      signs.count = signCounts.get(signs) ?? 0;
      signs.instanceMatrix.needsUpdate = true;
    }
  }
}
