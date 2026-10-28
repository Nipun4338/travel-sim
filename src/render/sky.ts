// The sky (SPEC §9): a dome around the camera shading from the fog colour at the horizon to a deeper
// zenith, with the sun's disc and glow, slowly drifting clouds (heavy and grey in rain and fog), and
// stars at night. One draw call; the horizon matches the fog so distant city fades into it.
import * as THREE from 'three';

export interface SkyLook {
  horizon: THREE.Color;
  zenith: THREE.Color;
  sun: THREE.Color;
  sunDir: THREE.Vector3;
  /** 0 clear … 1 overcast. */
  cloud: number;
  cloudColor: THREE.Color;
  stars: boolean;
}

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);   // drawn first, behind all
  }`;

const fragment = /* glsl */ `
  uniform vec3 horizon, zenith, sunColor, sunDir, cloudColor;
  uniform float cloud, stars, time;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(horizon, zenith, pow(h, 0.55));
    float s = max(dot(d, normalize(sunDir)), 0.0);
    // Glow round the sun (hidden under heavy cloud), then the disc.
    col += sunColor * (pow(s, 12.0) * 0.35 + pow(s, 300.0) * 0.6) * (1.0 - cloud * 0.8);
    col += sunColor * smoothstep(0.9993, 0.9996, s) * (1.0 - cloud) * 2.0;
    if (stars > 0.5 && d.y > 0.05) {
      vec2 g = floor(d.xz / (d.y + 0.3) * 260.0);
      float st = step(0.9965, hash(g));
      col += vec3(0.85, 0.9, 1.0) * st * smoothstep(0.05, 0.35, d.y) * (1.0 - cloud);
    }
    if (d.y > 0.0) {
      // Clouds on a flat layer overhead, fading out towards the horizon.
      vec2 uv = d.xz / (d.y + 0.12) * 1.4 + vec2(time * 0.004, time * 0.0015);
      float n = fbm(uv);
      float cover = smoothstep(0.62 - cloud * 0.5, 0.82 - cloud * 0.35, n);
      vec3 cc = cloudColor * (0.8 + 0.35 * fbm(uv * 2.0 + 5.0)) + sunColor * pow(s, 6.0) * 0.25;
      col = mix(col, cc, cover * smoothstep(0.0, 0.18, d.y) * 0.95);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export class Sky {
  readonly mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;

  constructor(look: SkyLook) {
    this.uniforms = {
      horizon: { value: look.horizon }, zenith: { value: look.zenith }, sunColor: { value: look.sun },
      sunDir: { value: look.sunDir }, cloud: { value: look.cloud }, cloudColor: { value: look.cloudColor },
      stars: { value: look.stars ? 1 : 0 }, time: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, uniforms: this.uniforms,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    // Centred on whichever camera draws it, so it never gets closer.
    this.mesh.onBeforeRender = (_r, _s, camera) => { this.mesh.position.copy(camera.position); this.mesh.scale.setScalar(10); this.mesh.updateMatrixWorld(); };
  }

  update(dt: number): void { this.uniforms.time.value += dt; }
}
