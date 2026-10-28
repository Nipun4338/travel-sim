// Station furniture added at runtime (SPEC §20, M13d): bilingual name boards on every platform's
// back wall, the stop marker where the train's front stops, and the platform screen door leaves at
// the station the train is serving (the fixed panels are baked).
import * as THREE from 'three';
import type { LineData, LineStop, LineTrack } from '../shared/region';
import { doorOffsets, DOOR_W, FLOOR_M, PLATFORM_EDGE_M } from '../shared/train';

const PLATFORM_W = 4.4, PSD_H = 1.55;
const FONT = '"Noto Sans Bengali", system-ui, sans-serif';

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

function boardTexture(bn: string, en: string): THREE.CanvasTexture {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 160 });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.fillStyle = '#1d6b45'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#c8202a'; g.fillRect(0, 148, 512, 12);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 66px ${FONT}`; g.fillText(bn, 256, 62);
    g.font = '600 32px system-ui, sans-serif'; g.fillText(en, 256, 122);
    tex.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return tex;
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

  constructor(scene: THREE.Scene, line: LineData) {
    // Name boards every 30 m along each platform's back wall, facing the track, and a stop marker.
    const boardGeo = new THREE.PlaneGeometry(3.2, 1.0);
    const markGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const markMat = new THREE.MeshBasicMaterial({ map: (() => {
      const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      const g = c.getContext('2d')!;
      g.fillStyle = '#f2c200'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; g.font = '800 44px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('6', 32, 34);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })() });
    const mats = line.stations.map(st => new THREE.MeshLambertMaterial({ map: boardTexture(st.nameBn, st.name) }));
    for (const tr of line.tracks) for (const st of tr.stops) {
      const side = st.side === 'left' ? -1 : 1;
      for (let s = st.s - 75; s <= st.s + 75; s += 30) {
        const { p, yaw } = onTrack(tr, s, side * (PLATFORM_EDGE_M + PLATFORM_W - 0.02));
        const b = new THREE.Mesh(boardGeo, mats[st.station]);
        b.position.set(p.x, p.y + FLOOR_M + 2.05, p.z);
        b.rotation.y = yaw + (side < 0 ? 0 : Math.PI);   // plane faces +z; turn it to face the track
        scene.add(b);
      }
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
