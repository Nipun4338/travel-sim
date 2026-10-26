import * as THREE from 'three';
import { JERKY_LATERAL, JERKY_LONGITUDINAL } from '../config/bus';

/** Measures passenger comfort and counts Jerky Moments (SPEC §6). */
export class ComfortMeter {
  lateral = 0;
  longitudinal = 0;
  jerkyMoments = 0;
  private wasJerky = false;
  private prevVel = new THREE.Vector3();
  private settle = 60;

  /** Ignore the next second of readings, e.g. the drop after a spawn. */
  reset(): void { this.settle = 60; this.lateral = this.longitudinal = 0; this.wasJerky = false; }

  update(vel: { x: number; y: number; z: number }, forward: THREE.Vector3, right: THREE.Vector3, dt: number): void {
    const v = new THREE.Vector3(vel.x, vel.y, vel.z);
    const acc = v.clone().sub(this.prevVel).divideScalar(dt);
    this.prevVel.copy(v);
    if (this.settle > 0) { this.settle--; return; }
    this.lateral += (acc.dot(right) - this.lateral) * 0.15;
    this.longitudinal += (acc.dot(forward) - this.longitudinal) * 0.15;
    const jerky = Math.abs(this.lateral) > JERKY_LATERAL || Math.abs(this.longitudinal) > JERKY_LONGITUDINAL;
    if (jerky && !this.wasJerky) this.jerkyMoments++;
    this.wasJerky = jerky;
  }

  /** 1 = perfectly smooth, 0 = very rough. */
  get comfortNow(): number {
    return Math.max(0, 1 - Math.max(Math.abs(this.lateral) / 3, Math.abs(this.longitudinal) / 3.5));
  }
}
