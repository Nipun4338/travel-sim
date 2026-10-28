// Sky, light, visibility, rain, wipers and valley mist for the session's time and weather
// (SPEC §9), using the techniques validated in prototypes/fog-and-rain: built-in linear Fog,
// camera-local rain streaks, a CSS wiper overlay, and soft transparent mist planes on High.
import * as THREE from 'three';
import type { Conditions } from '../world/conditions';
import { Sky } from './sky';
import { WindscreenRain } from './windscreen';
import { audio } from '../audio/audio';

export type Tier = 'low' | 'medium' | 'high';

const RAIN_STREAKS: Record<Tier, number> = { low: 800, medium: 2000, high: 4000 };

// `sky` is the horizon (and fog) colour, `zenith` the deep blue overhead; Dhaka's sky is usually
// hazy, so the horizon is pale and the zenith only moderately blue. Direct sun is about three times
// the sky's fill light, so shade reads as shade.
const TIMES = {
  morning: { sky: 0xcfe3f0, zenith: 0x5f95c8, sun: 0xffd8a8, sunI: 1.8, sunPos: [600, 250, 300], hemiI: 0.6 },
  midday: { sky: 0xb8d3e3, zenith: 0x4f87c0, sun: 0xfff6e8, sunI: 2.4, sunPos: [-350, 800, 260], hemiI: 0.7 },
  golden: { sky: 0xf2c49a, zenith: 0x6a86b4, sun: 0xffb070, sunI: 1.9, sunPos: [-700, 180, -200], hemiI: 0.5 },
  night: { sky: 0x0b1020, zenith: 0x03050c, sun: 0x8fa8ff, sunI: 0.15, sunPos: [300, 600, 200], hemiI: 0.15 },
} as const;

export interface AtmosphereOptions {
  tier: Tier;
  /** Clear-day visibility (m): 1500 on the road (SPEC §9); far more from the air. */
  dayFar: number;
  /** Flight sees further in every condition. */
  flight?: boolean;
}

export class Atmosphere {
  readonly night: boolean;
  readonly rainy: boolean;
  readonly foggy: boolean;
  private rain: THREE.LineSegments | null = null;
  private mist: THREE.Group | null = null;
  private windscreen: WindscreenRain | null = null;
  private sky_!: Sky;
  private shadowRenderer: THREE.WebGLRenderer | null = null;
  private shadowFrame = 0;

  constructor(
    private scene: THREE.Scene, private camera: THREE.Camera, readonly conditions: Conditions,
    private lights: { sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight }, private opts: AtmosphereOptions,
  ) {
    this.night = conditions.time === 'night';
    this.rainy = conditions.weather === 'rain';
    this.foggy = conditions.weather === 'fog';
    this.apply();
    if (this.rainy) this.buildRain(RAIN_STREAKS[opts.tier]);
  }

  /** The sky colour the scene clears to (also the fog colour). */
  get sky(): THREE.Color { return this.scene.background as THREE.Color; }

  private apply(): void {
    const tm = TIMES[this.conditions.time];
    const sky = new THREE.Color(tm.sky);
    if (this.rainy) sky.lerp(new THREE.Color(this.night ? 0x0a0d14 : 0x7d8790), 0.6);
    if (this.foggy) sky.lerp(new THREE.Color(this.night ? 0x1a1f2a : 0xc9ced3), 0.75);
    this.scene.background = sky;
    const { sun, hemi } = this.lights;
    sun.color.setHex(tm.sun);
    sun.intensity = tm.sunI * (this.rainy || this.foggy ? 0.3 : 1);
    sun.position.set(tm.sunPos[0], tm.sunPos[1], tm.sunPos[2]);
    hemi.intensity = tm.hemiI * (this.rainy ? 1.1 : this.foggy ? 1.4 : 1);   // overcast: all fill, no sun
    // Visibility (SPEC §9): on the road, day 1500 m, night 600, rain 400, hill fog ~220 (near 15).
    // From the air: the clear-day range, half at night, 4 km in rain, 1.8 km in fog.
    const f = this.opts.flight;
    let far = f ? this.opts.dayFar * (this.night ? 0.5 : 1) : this.night ? 600 : this.opts.dayFar;
    if (this.rainy) far = Math.min(far, f ? 4000 : 400);
    let near = far * 0.25;
    if (this.foggy) { far = f ? 1800 : 220; near = f ? 80 : 15; }
    this.scene.fog = new THREE.Fog(sky, near, far);

    const zenith = new THREE.Color(tm.zenith);
    if (this.rainy || this.foggy) zenith.copy(sky).multiplyScalar(this.foggy ? 1 : 0.85);
    const cloudColor = new THREE.Color(this.night ? 0x1a1e28 : this.rainy ? 0x8a929b : this.conditions.time === 'golden' ? 0xf0d2b8 : 0xf4f6f8);
    this.sky_ = new Sky({
      horizon: sky, zenith, sun: new THREE.Color(this.night ? 0xc8d4ff : tm.sun).multiplyScalar(this.night ? 0.4 : 1),
      sunDir: new THREE.Vector3(...tm.sunPos).normalize(), cloud: this.rainy ? 0.95 : this.foggy ? 0.8 : 0.3,
      cloudColor, stars: this.night && !this.rainy && !this.foggy,
    });
    this.scene.add(this.sky_.mesh);
  }

  /**
   * Sun shadows near the bus (Medium and High, by day in clear weather): a shadow box that follows
   * `focus`, so buildings, trees, flyovers and traffic throw shade on the road.
   */
  enableShadows(renderer: THREE.WebGLRenderer): void {
    if (this.opts.tier === 'low' || this.night || this.rainy || this.foggy) return;
    const high = this.opts.tier === 'high', { sun } = this.lights, r = high ? 90 : 60;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Redrawing the shadow map is most of the cost, and the sun doesn't move: refresh it every
    // other frame (moving vehicles' shadows lag by at most one frame).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    sun.castShadow = true;
    sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 1500 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun.target);
    this.shadowRenderer = renderer;
  }

  /** Keeps the sun's shadow box centred on `focus` (snapped to texels so shadows don't shimmer). */
  follow(focus: THREE.Vector3): void {
    if (!this.shadowRenderer) return;
    if (++this.shadowFrame % 2 === 0) this.shadowRenderer.shadowMap.needsUpdate = true;
    const { sun } = this.lights, tm = TIMES[this.conditions.time];
    const step = (sun.shadow.camera.right * 2) / sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / step) * step, fz = Math.round(focus.z / step) * step;
    const dir = new THREE.Vector3(...tm.sunPos).normalize();
    sun.target.position.set(fx, focus.y, fz);
    sun.position.set(fx, focus.y, fz).addScaledVector(dir, 600);
    sun.target.updateMatrixWorld();
  }

  private buildRain(n: number): void {
    const pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80;
      pos.set([x, y, z, x + 0.15, y - 1.1, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.55, fog: false }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  /** Soft mist patches sitting in the valleys (High tier, hill fog): `anchors` are ground points. */
  addValleyMist(anchors: Array<{ x: number; y: number; z: number }>): void {
    if (!this.foggy || this.opts.tier !== 'high' || this.mist) return;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: true });
    const geo = new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2);
    this.mist = new THREE.Group();
    anchors.forEach((a, i) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(a.x + Math.sin(i * 12.9) * 120, a.y + 15 + (i % 3) * 15, a.z + Math.cos(i * 7.3) * 120);
      this.mist!.add(m);
    });
    this.scene.add(this.mist);
  }

  /** Drops on the bus windscreen and wipers that clear them, in rain, in the cab view only. */
  enableWipers(): void {
    if (this.rainy && !this.windscreen) {
      this.windscreen = new WindscreenRain();
      this.windscreen.onSweep = () => audio.play('wipe', { gain: 0.45 });
    }
  }

  update(dt: number, inCab: boolean, kmh = 0): void {
    this.sky_.update(dt);
    this.windscreen?.update(dt, inCab, kmh);
    if (!this.rain) return;
    this.rain.position.copy(this.camera.position).add(new THREE.Vector3(0, -15, 0));
    const p = this.rain.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 6) {
      p[i + 1] -= 30 * dt; p[i + 4] -= 30 * dt;
      if (p[i + 4] < 0) { p[i + 1] += 40; p[i + 4] += 40; }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}

/** A soft round glow, for lamps and lights drawn as points. */
export function glowTexture(rgb = '255,220,150'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(0.35, `rgba(${rgb},0.6)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Lights as one draw call of additive glowing points; `pixels` keeps them a fixed size on screen. */
export function lightPoints(pts: number[], color: number, size: number, pixels = false): THREE.Points {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.PointsMaterial({
    color, size, sizeAttenuation: !pixels, map: glowTexture('255,255,255'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: !pixels,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}
