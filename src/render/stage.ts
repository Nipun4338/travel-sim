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

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.2, 2000);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  return { renderer, scene, camera };
}

/** Chase and cockpit cameras for a vehicle facing +x in its own frame. */
export class VehicleCamera {
  mode: 'chase' | 'cockpit' = 'chase';
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private initialised = false;

  constructor(private camera: THREE.PerspectiveCamera) {}

  toggle(): void { this.mode = this.mode === 'chase' ? 'cockpit' : 'chase'; }

  update(target: THREE.Object3D, forward: THREE.Vector3, up: THREE.Vector3, dt: number): void {
    const p = target.position;
    const flatF = new THREE.Vector3(forward.x, 0, forward.z).normalize();
    if (this.mode === 'chase') {
      const want = p.clone().addScaledVector(flatF, -17).add(new THREE.Vector3(0, 6.5, 0));
      if (!this.initialised) { this.pos.copy(want); this.initialised = true; }
      this.pos.lerp(want, 1 - Math.exp(-dt * 4));
      this.camera.position.copy(this.pos);
      this.look.copy(p).addScaledVector(flatF, 6).add(new THREE.Vector3(0, 1.5, 0));
      this.camera.lookAt(this.look);
    } else {
      this.camera.position.copy(p).addScaledVector(forward, 5.1).addScaledVector(up, 0.9);
      this.camera.up.copy(up);
      this.look.copy(p).addScaledVector(forward, 40).addScaledVector(up, 0.5);
      this.camera.lookAt(this.look);
      this.camera.up.set(0, 1, 0);
      this.pos.copy(this.camera.position);
    }
  }
}
