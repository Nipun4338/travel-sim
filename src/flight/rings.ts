// Challenge Rings in the world: the next one bright amber, later ones faint, passed ones gone.
import * as THREE from 'three';
import { RING_RADIUS } from '../config/flight';
import type { Ring } from '../shared/zone';

export class RingView {
  private group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private geo = new THREE.TorusGeometry(RING_RADIUS, 1.6, 8, 40);
  private next = new THREE.MeshBasicMaterial({ color: 0xffa21a });
  private later = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.45 });
  private time = 0;

  constructor(scene: THREE.Scene) { scene.add(this.group); }

  set(rings: Ring[]): void {
    this.meshes.forEach(m => this.group.remove(m));
    this.meshes = rings.map(r => {
      const m = new THREE.Mesh(this.geo, this.later);
      m.position.set(r.x, r.y, r.z);
      m.rotation.y = -(r.headingDeg * Math.PI) / 180;
      this.group.add(m);
      return m;
    });
  }

  update(dt: number, nextIndex: number): void {
    this.time += dt;
    this.meshes.forEach((m, i) => {
      m.visible = i >= nextIndex;
      m.material = i === nextIndex ? this.next : this.later;
    });
    const pulse = 1 + 0.04 * Math.sin(this.time * 4);
    this.meshes[nextIndex]?.scale.setScalar(pulse);
  }
}
