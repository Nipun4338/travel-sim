// Flight cameras: the cockpit (default; mouse drag turns your head, easing back when released) and
// a chase camera that lags behind and only partly follows the bank, as in the prototype.
import * as THREE from 'three';

export class FlightCamera {
  mode: 'cockpit' | 'chase' = 'cockpit';
  private pos = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private look = new THREE.Vector3();
  private initialised = false;
  private headYaw = 0;
  private headPitch = 0;
  private dragging = false;
  private tmp = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, private eye: THREE.Vector3, element: HTMLElement) {
    element.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && this.mode === 'cockpit') this.dragging = true; });
    addEventListener('pointerup', () => { this.dragging = false; });
    addEventListener('pointermove', e => {
      if (!this.dragging) return;
      this.headYaw = THREE.MathUtils.clamp(this.headYaw - e.movementX * 0.004, -2.2, 2.2);
      this.headPitch = THREE.MathUtils.clamp(this.headPitch - e.movementY * 0.004, -0.8, 0.7);
    });
  }

  toggle(): void { this.mode = this.mode === 'chase' ? 'cockpit' : 'chase'; this.initialised = false; }

  update(target: THREE.Object3D, crashed: boolean, dt: number): void {
    target.updateMatrixWorld();
    const q = target.quaternion, p = target.position;
    const fwd = this.tmp.set(0, 0, -1).applyQuaternion(q).clone(), up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    if (this.mode === 'chase' || crashed) {
      const want = crashed ? p.clone().add(new THREE.Vector3(30, 25, 30)) : p.clone().addScaledVector(fwd, -24).addScaledVector(up, 6);
      if (!this.initialised) { this.pos.copy(want); this.up.copy(up); this.initialised = true; }
      this.pos.lerp(want, 1 - Math.exp(-dt * 5));
      this.up.lerp(up, 1 - Math.exp(-dt * 2)).normalize();
      this.camera.position.copy(this.pos);
      this.camera.up.copy(crashed ? new THREE.Vector3(0, 1, 0) : this.up);
      this.camera.lookAt(this.look.copy(p).addScaledVector(fwd, crashed ? 0 : 30));
      return;
    }
    if (!this.dragging) { const k = 1 - Math.exp(-dt * 2.5); this.headYaw -= this.headYaw * k; this.headPitch -= this.headPitch * k; }
    this.camera.position.copy(this.eye).applyMatrix4(target.matrixWorld);
    // Ahead and a touch down over the panel, turned by the head.
    const dir = new THREE.Vector3(0, -0.08 + this.headPitch, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.headYaw);
    this.look.copy(this.eye).add(dir).applyMatrix4(target.matrixWorld);
    this.camera.up.copy(up);
    this.camera.lookAt(this.look);
    this.pos.copy(this.camera.position);
  }
}
