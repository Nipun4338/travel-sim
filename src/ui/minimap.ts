// Round corner map, heading-up: nearby roads, the Route, its Stops and the bus. M toggles it.
import type { LaneData, RouteData } from '../shared/region';
import { t } from '../i18n/i18n';

const CELL = 100;
const VIEW_M = 260;       // metres from the bus to the map's edge
const BUS_AT = 0.62;      // bus sits below centre so more of the road ahead shows
const STORE_KEY = 'travel-sim.minimap';

// x0 z0 x1 z1, half-width in metres, flyover?
type Seg = [number, number, number, number, number, boolean];

export class Minimap {
  private root = document.createElement('div');
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private roads = new Map<string, Seg[]>();
  private routeSegs = new Map<string, Seg[]>();
  private stops: { x: number; z: number; name: string }[] = [];
  private sizePx = 0;
  private visible = true;

  constructor() {
    this.root.className = 'minimap';
    this.root.appendChild(this.canvas);
    this.root.hidden = true;
    document.body.appendChild(this.root);
    try { this.visible = localStorage.getItem(STORE_KEY) !== 'off'; } catch { /* storage blocked */ }
  }

  setRegion(route: RouteData, lanes: LaneData): void {
    this.roads.clear();
    this.routeSegs.clear();
    for (const w of lanes.ways) {
      for (let i = 1; i < w.points.length; i++) {
        this.add(this.roads, [w.points[i - 1][0], w.points[i - 1][2], w.points[i][0], w.points[i][2], w.width / 2, w.elevated]);
      }
    }
    for (let i = 1; i < route.points.length; i++) {
      this.add(this.routeSegs, [route.points[i - 1][0], route.points[i - 1][2], route.points[i][0], route.points[i][2], 0, false]);
    }
    this.stops = route.stops.map(s => ({ x: s.x, z: s.z, name: s.name }));
    this.root.hidden = !this.visible;
  }

  toggle(): boolean {
    this.visible = !this.visible;
    try { localStorage.setItem(STORE_KEY, this.visible ? 'on' : 'off'); } catch { /* storage blocked */ }
    if (this.stops.length) this.root.hidden = !this.visible;
    return this.visible;
  }

  private add(grid: Map<string, Seg[]>, s: Seg): void {
    const seen = new Set<string>();
    for (const [x, z] of [[s[0], s[1]], [s[2], s[3]]]) {
      const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(s);
    }
  }

  private near(grid: Map<string, Seg[]>, x: number, z: number): Seg[] {
    const out = new Set<Seg>();
    const r = Math.ceil(VIEW_M / CELL) + 1, cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const s of grid.get(`${cx + i},${cz + j}`) ?? []) out.add(s);
    return [...out];
  }

  /** fx, fz: the bus's forward direction on the ground (+x east, +z south). */
  update(x: number, z: number, fx: number, fz: number, nextStop?: string): void {
    if (this.root.hidden) return;
    const css = this.root.clientWidth;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (css * dpr !== this.sizePx) {
      this.sizePx = css * dpr;
      this.canvas.width = this.canvas.height = this.sizePx;
    }
    const n = Math.hypot(fx, fz) || 1;
    fx /= n; fz /= n;
    const size = this.sizePx, scale = size / 2 / VIEW_M, cx = size / 2, cy = size * BUS_AT;
    // Heading-up: forward maps to screen up, the bus's right to screen right.
    const sx = (wx: number, wz: number) => cx + ((wx - x) * -fz + (wz - z) * fx) * scale;
    const sy = (wx: number, wz: number) => cy - ((wx - x) * fx + (wz - z) * fz) * scale;
    const c = this.ctx;

    c.clearRect(0, 0, size, size);
    c.save();
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - dpr, 0, Math.PI * 2);
    c.fillStyle = 'rgba(28, 34, 30, 0.72)';
    c.fill();
    c.clip();
    c.lineCap = 'round';

    const roads = this.near(this.roads, x, z);
    for (const flyover of [false, true]) {
      c.strokeStyle = flyover ? 'rgba(200, 200, 210, 0.55)' : 'rgba(225, 222, 210, 0.9)';
      for (const s of roads) {
        if (s[5] !== flyover) continue;
        c.lineWidth = Math.max(1.5 * dpr, s[4] * 2 * scale);
        c.beginPath();
        c.moveTo(sx(s[0], s[1]), sy(s[0], s[1]));
        c.lineTo(sx(s[2], s[3]), sy(s[2], s[3]));
        c.stroke();
      }
    }

    c.strokeStyle = 'rgba(64, 160, 255, 0.95)';
    c.lineWidth = 3 * dpr;
    c.beginPath();
    for (const s of this.near(this.routeSegs, x, z)) {
      c.moveTo(sx(s[0], s[1]), sy(s[0], s[1]));
      c.lineTo(sx(s[2], s[3]), sy(s[2], s[3]));
    }
    c.stroke();

    for (const st of this.stops) {
      const px = sx(st.x, st.z), py = sy(st.x, st.z);
      const next = st.name === nextStop;
      // Clamp the next Stop to the rim so it points the way when it's off the map.
      const dx = px - size / 2, dy = py - size / 2, d = Math.hypot(dx, dy), rim = size / 2 - 9 * dpr;
      if (d > rim && !next) continue;
      const k = d > rim ? rim / d : 1;
      c.beginPath();
      c.arc(size / 2 + dx * k, size / 2 + dy * k, (next ? 6 : 4) * dpr, 0, Math.PI * 2);
      c.fillStyle = next ? '#ffb020' : '#ffffff';
      c.fill();
      c.lineWidth = 1.5 * dpr;
      c.strokeStyle = '#1b1b1b';
      c.stroke();
    }

    c.translate(cx, cy);
    c.beginPath();
    c.moveTo(0, -8 * dpr);
    c.lineTo(6 * dpr, 7 * dpr);
    c.lineTo(0, 4 * dpr);
    c.lineTo(-6 * dpr, 7 * dpr);
    c.closePath();
    c.fillStyle = '#ff4d3d';
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.5 * dpr;
    c.stroke();
    c.restore();

    // North marker on the rim (north is -z).
    const ux = -fx, uy = fz; // screen direction of world north: sx/sy with (dx, dz) = (0, -1)
    const rr = size / 2 - 10 * dpr;
    c.font = `700 ${11 * dpr}px "Noto Sans Bengali", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    c.fillText(t('north'), size / 2 + ux * rr, size / 2 + uy * rr);
  }
}
