// Round corner map, heading-up: nearby roads, the Route (or a Ring course), its points and the
// vehicle. M toggles it. Bus Mode feeds it the Route and lanes; Flight Mode a wider view of the zone.
import type { LaneData, RouteData } from '../shared/region';
import { t } from '../i18n/i18n';

const BUS_VIEW_M = 260;   // metres from the bus to the map's edge
const BUS_AT = 0.62;      // bus sits below centre so more of the road ahead shows
const STORE_KEY = 'travel-sim.minimap';

// x0 z0 x1 z1, half-width in metres, flyover?
export type MapSeg = [number, number, number, number, number, boolean];
type Seg = MapSeg;
export interface MapPoint { x: number; z: number; name: string; done?: boolean; }

export class Minimap {
  private root = document.createElement('div');
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private roads = new Map<string, Seg[]>();
  private routeSegs = new Map<string, Seg[]>();
  private stops: MapPoint[] = [];
  private viewM = BUS_VIEW_M;
  private cell = 100;
  private sizePx = 0;
  private visible = true;

  /** Other players in a Room, drawn as seat-coloured dots; set each frame by the Room. */
  peers: Array<{ x: number; z: number; colour: string; initial: string }> = [];

  constructor() {
    this.root.className = 'minimap';
    this.root.appendChild(this.canvas);
    this.root.hidden = true;
    document.body.appendChild(this.root);
    try { this.visible = localStorage.getItem(STORE_KEY) !== 'off'; } catch { /* storage blocked */ }
  }

  setRegion(route: RouteData, lanes: LaneData): void {
    const roads: Seg[] = [];
    for (const w of lanes.ways) {
      for (let i = 1; i < w.points.length; i++) roads.push([w.points[i - 1][0], w.points[i - 1][2], w.points[i][0], w.points[i][2], w.width / 2, w.elevated]);
    }
    this.setLayers(roads, route.points.map(p => [p[0], p[2]]), route.stops.map(s => ({ x: s.x, z: s.z, name: s.name })), BUS_VIEW_M);
  }

  /** Roads, a path drawn in blue, and points (the next one in amber); `viewM` is the map's radius. */
  setLayers(roads: Seg[], path: Array<[number, number]>, points: MapPoint[], viewM: number): void {
    this.viewM = viewM;
    this.cell = Math.max(100, Math.round(viewM / 3));
    this.roads.clear();
    this.routeSegs.clear();
    this.nearCache.clear();
    roads.forEach(s => this.add(this.roads, s));
    for (let i = 1; i < path.length; i++) this.add(this.routeSegs, [path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], 0, false]);
    this.stops = points;
    this.root.hidden = !this.visible;
  }

  /** Marks points done (e.g. landmarks found) without rebuilding the map. */
  setDone(names: Set<string>): void { this.stops.forEach(p => { p.done = names.has(p.name); }); }

  toggle(): boolean {
    this.visible = !this.visible;
    try { localStorage.setItem(STORE_KEY, this.visible ? 'on' : 'off'); } catch { /* storage blocked */ }
    if (this.stops.length) this.root.hidden = !this.visible;
    return this.visible;
  }

  private add(grid: Map<string, Seg[]>, s: Seg): void {
    const seen = new Set<string>();
    const len = Math.hypot(s[2] - s[0], s[3] - s[1]), steps = Math.max(1, Math.ceil(len / this.cell));
    for (let k = 0; k <= steps; k++) {
      const x = s[0] + ((s[2] - s[0]) * k) / steps, z = s[1] + ((s[3] - s[1]) * k) / steps;
      const key = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(s);
    }
  }

  // Segments near the vehicle, cached per grid cell (a city zone has thousands within the map).
  private nearCache = new Map<Map<string, Seg[]>, { key: string; segs: Seg[] }>();

  private near(grid: Map<string, Seg[]>, x: number, z: number): Seg[] {
    const r = Math.ceil(this.viewM / this.cell) + 1, cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    const key = `${cx},${cz},${grid.size}`, hit = this.nearCache.get(grid);
    if (hit?.key === key) return hit.segs;
    const out = new Set<Seg>();
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const s of grid.get(`${cx + i},${cz + j}`) ?? []) out.add(s);
    const segs = [...out];
    this.nearCache.set(grid, { key, segs });
    return segs;
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
    const size = this.sizePx, scale = size / 2 / this.viewM, cx = size / 2, cy = size * BUS_AT;
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
    // One path per style and (rounded) width: thousands of single strokes are far too slow.
    const batches = new Map<string, Seg[]>();
    for (const s of roads) {
      const w = Math.max(1.5 * dpr, Math.round(s[4] * 2 * scale * 2) / 2);
      const k = `${s[5] ? 1 : 0}|${w}`;
      if (!batches.has(k)) batches.set(k, []);
      batches.get(k)!.push(s);
    }
    for (const flyover of [false, true]) {
      c.strokeStyle = flyover ? 'rgba(200, 200, 210, 0.55)' : 'rgba(225, 222, 210, 0.9)';
      for (const [k, segs] of batches) {
        const [fl, w] = k.split('|');
        if ((fl === '1') !== flyover) continue;
        c.lineWidth = +w;
        c.beginPath();
        for (const s of segs) {
          c.moveTo(sx(s[0], s[1]), sy(s[0], s[1]));
          c.lineTo(sx(s[2], s[3]), sy(s[2], s[3]));
        }
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
      c.fillStyle = next ? '#ffb020' : st.done ? '#7fa08a' : '#ffffff';
      c.fill();
      c.lineWidth = 1.5 * dpr;
      c.strokeStyle = '#1b1b1b';
      c.stroke();
    }

    // Other players in a Room: a dot in their seat colour with their initial (docs/rooms-spec.md §6).
    for (const pr of this.peers) {
      const dx = sx(pr.x, pr.z) - size / 2, dy = sy(pr.x, pr.z) - size / 2, d = Math.hypot(dx, dy), rim = size / 2 - 9 * dpr;
      const k = d > rim ? rim / d : 1, px = size / 2 + dx * k, py = size / 2 + dy * k;
      c.beginPath();
      c.arc(px, py, 6 * dpr, 0, Math.PI * 2);
      c.fillStyle = pr.colour;
      c.fill();
      c.lineWidth = 1.5 * dpr;
      c.strokeStyle = '#1b1b1b';
      c.stroke();
      c.fillStyle = '#111';
      c.font = `700 ${8 * dpr}px "Noto Sans Bengali", system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(pr.initial, px, py + 0.5 * dpr);
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
