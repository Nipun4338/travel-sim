import * as THREE from 'three';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/** Renderer, scene and midday lighting. Time of day and weather arrive in M7. */
export function createStage(): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9cde0);
  scene.fog = new THREE.Fog(0xa9cde0, 375, 1500);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x6b7d4a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-200, 900, 150);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 2000);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  return { renderer, scene, camera };
}

/**
 * Cab (default) and chase cameras for a vehicle facing +x in its own frame. In the cab, dragging
 * with the mouse turns the driver's head; it eases back to straight ahead when released.
 */
export class VehicleCamera {
  mode: 'cockpit' | 'chase' = 'cockpit';
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private initialised = false;
  private headYaw = 0;
  private headPitch = 0;
  private dragging = false;

  constructor(private camera: THREE.PerspectiveCamera, private eye: THREE.Vector3, element: HTMLElement) {
    element.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && this.mode === 'cockpit') this.dragging = true; });
    addEventListener('pointerup', () => { this.dragging = false; });
    addEventListener('pointermove', e => {
      if (!this.dragging) return;
      this.headYaw = THREE.MathUtils.clamp(this.headYaw - e.movementX * 0.004, -1.9, 1.9);
      this.headPitch = THREE.MathUtils.clamp(this.headPitch - e.movementY * 0.004, -0.6, 0.5);
    });
  }

  toggle(): void { this.mode = this.mode === 'chase' ? 'cockpit' : 'chase'; }

  update(target: THREE.Object3D, forward: THREE.Vector3, up: THREE.Vector3, dt: number): void {
    const p = target.position;
    if (this.mode === 'chase') {
      const flatF = new THREE.Vector3(forward.x, 0, forward.z).normalize();
      const want = p.clone().addScaledVector(flatF, -17).add(new THREE.Vector3(0, 6.5, 0));
      if (!this.initialised) { this.pos.copy(want); this.initialised = true; }
      this.pos.lerp(want, 1 - Math.exp(-dt * 4));
      this.camera.position.copy(this.pos);
      this.camera.up.set(0, 1, 0);
      this.look.copy(p).addScaledVector(flatF, 6).add(new THREE.Vector3(0, 1.5, 0));
      this.camera.lookAt(this.look);
      return;
    }
    if (!this.dragging) { const k = 1 - Math.exp(-dt * 2.5); this.headYaw -= this.headYaw * k; this.headPitch -= this.headPitch * k; }
    target.updateMatrixWorld();
    this.camera.position.copy(this.eye).applyMatrix4(target.matrixWorld);
    // Look direction in the bus frame: ahead and a touch down, turned by the head.
    const dir = new THREE.Vector3(1, -0.16 + this.headPitch, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.headYaw);
    this.look.copy(this.eye).add(dir).applyMatrix4(target.matrixWorld);
    this.camera.up.copy(up);
    this.camera.lookAt(this.look);
    this.pos.copy(this.camera.position);
  }
}
