import * as THREE from 'three';
import type { Bus } from '../bus/Bus';
import { BUS_WHEELS, SUSPENSION_REST, WHEEL_RADIUS } from '../config/bus';

const flat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });

/** Placeholder bus mesh (a block in Dhaka colours) until the reskinned model lands (SPEC §11). */
export class BusView {
  readonly group = new THREE.Group();
  private wheels: { pivot: THREE.Group; spin: THREE.Group }[] = [];

  constructor(scene: THREE.Scene) {
    const add = (g: THREE.BufferGeometry, color: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(g, flat(color));
      m.position.set(x, y, z);
      this.group.add(m);
    };
    add(new THREE.BoxGeometry(11, 2.8, 2.5), 0xc0392b, 0, 0, 0);
    add(new THREE.BoxGeometry(11.02, 0.5, 2.52), 0x1e8449, 0, -0.7, 0);
    add(new THREE.BoxGeometry(9.4, 0.9, 2.54), 0x22313f, -0.4, 0.5, 0);
    add(new THREE.BoxGeometry(0.1, 1.2, 2.2), 0x22313f, 5.5, 0.4, 0);
    for (const [x, y, z] of BUS_WHEELS) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.35, 14), flat(0x1a1a1a));
      tyre.rotation.x = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(tyre);
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
