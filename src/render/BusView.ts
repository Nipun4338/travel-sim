import * as THREE from 'three';
import type { Bus } from '../bus/Bus';
import { BUS_WHEELS, SUSPENSION_REST, WHEEL_RADIUS } from '../config/bus';

const lambert = new Map<number, THREE.Material>();
const flat = (hex: number) => {
  let m = lambert.get(hex);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: hex, flatShading: true }); lambert.set(hex, m); }
  return m;
};
const glow = (hex: number) => new THREE.MeshBasicMaterial({ color: hex });

/** A Dhaka city bus livery: two-tone body with a bright stripe (SPEC §11; Liveries arrive in M9). */
export interface BusLivery { lower: number; upper: number; stripe: number; roof: number; }
export const DEFAULT_LIVERY: BusLivery = { lower: 0x1f6f3f, upper: 0xc8302a, stripe: 0xf2c200, roof: 0xd9d4ca };

/**
 * Scripted low-poly Dhaka city bus, 11 × 2.8 × 2.5 m, in the bus's own frame: +x forward,
 * +y up, +z right. Doors are on the left (−z) side, as traffic drives on the left.
 */
export class BusView {
  readonly group = new THREE.Group();
  private wheels: { pivot: THREE.Group; spin: THREE.Group }[] = [];

  constructor(scene: THREE.Scene, livery: BusLivery = DEFAULT_LIVERY) {
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      return mesh;
    };
    const glass = flat(0x22313f), dark = flat(0x1e1e1e), chrome = flat(0x9a9a96);

    // Body: lower panel, stripe, window band, upper panel, roof.
    add(11, 1.3, 2.5, flat(livery.lower), 0, -0.75, 0);
    add(11.02, 0.22, 2.52, flat(livery.stripe), 0, -0.25, 0);
    add(10.3, 1.0, 2.46, glass, -0.25, 0.45, 0);
    add(11, 0.38, 2.5, flat(livery.upper), 0, 1.14, 0);
    add(10.6, 0.12, 2.3, flat(livery.roof), -0.1, 1.38, 0);
    add(1.4, 0.3, 1.1, flat(livery.roof), -3.5, 1.5, 0); // roof vent hatch
    // Window pillars down both sides.
    for (let x = -4.8; x <= 4.4; x += 1.15) add(0.12, 1.0, 2.52, flat(livery.upper), x, 0.45, 0);
    // Front: raked windscreen, destination board, grille, bumper, lights, mirrors.
    const screen = add(0.08, 1.15, 2.25, glass, 5.48, 0.42, 0);
    screen.rotation.z = -0.12;
    add(0.06, 0.28, 1.7, dark, 5.52, 1.12, 0);
    add(0.02, 0.16, 1.4, glow(0xffb000), 5.56, 1.12, 0);
    add(0.06, 0.5, 1.6, chrome, 5.52, -0.85, 0);
    add(0.3, 0.32, 2.56, dark, 5.6, -1.22, 0);
    for (const z of [-0.95, 0.95]) add(0.06, 0.22, 0.4, glow(0xfff2c0), 5.56, -0.78, z);
    for (const z of [-1.42, 1.42]) {
      add(0.5, 0.06, 0.06, dark, 5.3, 0.9, z);
      add(0.08, 0.45, 0.22, dark, 5.55, 0.62, z + Math.sign(z) * 0.1);
    }
    // Rear: bumper, tail lights, rear window.
    add(0.3, 0.32, 2.56, dark, -5.6, -1.22, 0);
    for (const z of [-0.95, 0.95]) add(0.06, 0.3, 0.3, glow(0xd11a1a), -5.53, -0.7, z);
    add(0.06, 0.8, 2.0, glass, -5.51, 0.45, 0);
    // Doors on the left (−z) side: front door behind the front axle and a rear door.
    for (const x of [2.2, -3.4]) {
      add(1.0, 2.1, 0.05, dark, x, -0.25, -1.27);
      add(1.1, 0.08, 0.06, flat(livery.stripe), x, 0.83, -1.28);
    }
    // Dark wheel arches.
    for (const [x, , z] of BUS_WHEELS) add(1.5, 0.75, 0.04, dark, x, -1.0, z < 0 ? -1.265 : 1.265);

    for (const [x, y, z] of BUS_WHEELS) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.35, 14), dark);
      tyre.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.37, 8), chrome);
      hub.rotation.x = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(tyre, hub);
      pivot.add(spin);
      this.group.add(pivot);
      this.wheels.push({ pivot, spin });
    }
    scene.add(this.group);
  }

  sync(bus: Bus): void {
    const t = bus.body.translation(), r = bus.body.rotation();
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
    this.wheels.forEach((w, i) => {
      w.pivot.position.y = BUS_WHEELS[i][1] - (bus.vehicle.wheelSuspensionLength(i) ?? SUSPENSION_REST);
      w.pivot.rotation.y = bus.vehicle.wheelSteering(i) ?? 0;
      w.spin.rotation.z = -(bus.vehicle.wheelRotation(i) ?? 0);
    });
  }
}
