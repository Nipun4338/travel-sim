// Sky, light, visibility, rain, wipers and valley mist for the session's time and weather
// (SPEC §9), using the techniques validated in prototypes/fog-and-rain: built-in linear Fog,
// camera-local rain streaks, a CSS wiper overlay, and soft transparent mist planes on High.
import * as THREE from 'three';
import type { Conditions } from '../world/conditions';

export type Tier = 'low' | 'medium' | 'high';

const RAIN_STREAKS: Record<Tier, number> = { low: 800, medium: 2000, high: 4000 };

const TIMES = {
  morning: { sky: 0xcfe3f0, sun: 0xffd8a8, sunI: 1.2, sunPos: [600, 250, 300], hemiI: 0.9 },
  midday: { sky: 0xa9cde0, sun: 0xffffff, sunI: 1.6, sunPos: [-200, 900, 150], hemiI: 1.1 },
  golden: { sky: 0xf2c49a, sun: 0xffb070, sunI: 1.3, sunPos: [-700, 180, -200], hemiI: 0.7 },
  night: { sky: 0x0b1020, sun: 0x8fa8ff, sunI: 0.15, sunPos: [300, 600, 200], hemiI: 0.15 },
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
  private wipers: HTMLDivElement | null = null;

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
    sun.intensity = tm.sunI * (this.rainy || this.foggy ? 0.4 : 1);
    sun.position.set(tm.sunPos[0], tm.sunPos[1], tm.sunPos[2]);
    hemi.intensity = tm.hemiI * (this.rainy ? 0.7 : 1);
    // Visibility (SPEC §9): on the road, day 1500 m, night 600, rain 400, hill fog ~220 (near 15).
    // From the air: the clear-day range, half at night, 4 km in rain, 1.8 km in fog.
    const f = this.opts.flight;
    let far = f ? this.opts.dayFar * (this.night ? 0.5 : 1) : this.night ? 600 : this.opts.dayFar;
    if (this.rainy) far = Math.min(far, f ? 4000 : 400);
    let near = far * 0.25;
    if (this.foggy) { far = f ? 1800 : 220; near = f ? 80 : 15; }
    this.scene.fog = new THREE.Fog(sky, near, far);
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

  /** Wipers sweep across the windscreen in rain, in the cab view only. */
  enableWipers(): void {
    if (!this.rainy || this.wipers) return;
    this.wipers = document.createElement('div');
    this.wipers.className = 'wipers';
    this.wipers.innerHTML = '<i></i><i></i>';
    document.body.appendChild(this.wipers);
  }

  update(dt: number, inCab: boolean): void {
    if (this.wipers) this.wipers.hidden = !inCab;
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
