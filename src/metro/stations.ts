// Station furniture added at runtime (SPEC §20, M13d): the stop marker where the train's front
// stops, and the platform screen door leaves at the station the train is serving (the fixed panels
// and the name roundels are baked, polish spec §6.1).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from '../render/atmosphere';
import type { LineData, LineStop, LineTrack } from '../shared/region';
import { doorOffsets, DOOR_W, FLOOR_M, PLATFORM_EDGE_M } from '../shared/train';

const PSD_H = 1.55;

/** Position and heading on a track at `s`, offset sideways by `off` (+ right of travel). */
export function onTrack(tr: LineTrack, s: number, off: number, out = new THREE.Vector3()): { p: THREE.Vector3; yaw: number } {
  const c = tr.cum, pts = tr.points;
  let lo = 0, hi = c.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c[mid] <= s) lo = mid; else hi = mid - 1; }
  const i = Math.max(1, lo + 1), t = Math.max(0, Math.min(1, (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
  let dx = pts[i][0] - pts[i - 1][0], dz = pts[i][2] - pts[i - 1][2];
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  out.set(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t - dz * off, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * t + dx * off);
  return { p: out, yaw: Math.atan2(-dz, dx) };
}

export class StationView {
  private psd: THREE.InstancedMesh;
  private doors: number[] = [];          // track s of each screen door's centre at the active stop
  private track: LineTrack | null = null;
  private side = -1;
  private tmp = new THREE.Vector3();
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private UP = new THREE.Vector3(0, 1, 0);

  constructor(private scene: THREE.Scene, line: LineData) {
    // A stop marker on the screen doors where the train's front stops.
    const markGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const markMat = new THREE.MeshBasicMaterial({ map: (() => {
      const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      const g = c.getContext('2d')!;
      g.fillStyle = '#f2c200'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; g.font = '800 44px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('6', 32, 34);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })() });
    for (const tr of line.tracks) for (const st of tr.stops) {
      const side = st.side === 'left' ? -1 : 1;
      const { p, yaw } = onTrack(tr, st.stopS, side * (PLATFORM_EDGE_M + 0.45));
      const m = new THREE.Mesh(markGeo, markMat);
      m.position.set(p.x, p.y + FLOOR_M + PSD_H + 0.45, p.z);
      m.rotation.y = yaw - Math.PI / 2;                   // faces the oncoming driver
      scene.add(m);
    }
    this.psd = new THREE.InstancedMesh(new THREE.BoxGeometry(DOOR_W / 2 + 0.05, PSD_H - 0.05, 0.06), new THREE.MeshLambertMaterial({ color: 0x86aab6, flatShading: true }), doorOffsets().length * 2);
    this.psd.frustumCulled = false;
    this.psd.count = 0;
    scene.add(this.psd);
  }

  /**
   * Night lighting (SPEC §9): lamp strips under every station roof over both platforms, and pools
   * of light on the platform floors. Two draw calls, built the first time they're turned on.
   */
  setNight(line: LineData, on: boolean): void {
    if (on && !this.night) {
      const strips: THREE.BufferGeometry[] = [], pools: THREE.Vector3[] = [];
      for (const tr of line.tracks) for (const st of tr.stops) {
        // Under the roof: Uttara North's (type C) is the highest on the line.
        const side = st.side === 'left' ? -1 : 1, off = side * (PLATFORM_EDGE_M + 3), lampY = line.stations[st.station].name === 'Uttara North' ? 8.4 : 6.3;
        for (let s = st.s - 84; s < st.s + 84; s += 12) {
          const { p, yaw } = onTrack(tr, s + 6, off);
          strips.push(new THREE.BoxGeometry(10, 0.08, 0.22).rotateY(yaw).translate(p.x, p.y + lampY, p.z));
          for (const d of [-3, 3]) pools.push(onTrack(tr, s + 6 + d, off).p.clone().setY(p.y + FLOOR_M + 0.04));
        }
      }
      const lamp = new THREE.Mesh(mergeGeometries(strips)!, new THREE.MeshBasicMaterial({ color: 0xc9d3dc, toneMapped: false }));
      const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(3.6, 14).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xe8f0ff, map: glowTexture('235,242,255'), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }), pools.length);
      const m = new THREE.Matrix4();
      pools.forEach((q, i) => pool.setMatrixAt(i, m.makeTranslation(q.x, q.y, q.z)));
      pool.computeBoundingSphere();
      this.night = new THREE.Group().add(lamp, pool);
      this.scene.add(this.night);
    }
    if (this.night) this.night.visible = on;
  }
  private night: THREE.Group | null = null;

  /** The screen doors to show: those at `stop` on `track` (null hides them). */
  setActive(track: LineTrack | null, stop: LineStop | null): void {
    this.track = track;
    this.doors = stop ? doorOffsets().map(o => stop.stopS - o) : [];
    this.side = stop?.side === 'right' ? 1 : -1;
    this.psd.count = this.doors.length * 2;
    this.setOpen(0);
  }

  /** Opens the active screen doors by `t` (0 shut … 1 open). */
  setOpen(t: number): void {
    if (!this.track) return;
    let k = 0;
    for (const d of this.doors) for (const half of [-1, 1]) {
      const { p, yaw } = onTrack(this.track, d + half * (DOOR_W / 4 + t * (DOOR_W / 2)), this.side * (PLATFORM_EDGE_M + 0.45), this.tmp);
      this.q.setFromAxisAngle(this.UP, yaw);
      this.m4.compose(p.setY(p.y + FLOOR_M + PSD_H / 2), this.q, new THREE.Vector3(1, 1, 1));
      this.psd.setMatrixAt(k++, this.m4);
    }
    this.psd.instanceMatrix.needsUpdate = true;
  }
}
