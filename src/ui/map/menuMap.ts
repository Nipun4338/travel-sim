// The menu's map of Bangladesh (SPEC §13, v1.2.0): an illustrated country in the bus-art palette
// with its rivers and divisions, a pin for each playable Region (and dimmed coming-soon pins), the
// routes you've driven lit up, and the landmarks you've found. It stays mounted while the menu
// redraws, so choosing a Region can glide the view in and back out.
import { place } from '../../i18n/i18n';
import { LANDMARKS } from '../../shared/landmarks';
import { BD_DIVISIONS, BD_ISLANDS, BD_LAND, BD_RIVERS, BD_VIEWBOX, bdXY } from './bdMap';

export type MapRegion = 'dhaka' | 'bandarban';
export interface MapProgress { routes: Array<{ id: string; latLon: Array<[number, number]>; done: boolean; kind: 'bus' | 'metro' }>; found: Set<string>; }

/** Playable Regions and where their pins sit. */
export const PINS: Array<{ id: MapRegion; lat: number; lon: number }> = [
  { id: 'dhaka', lat: 23.7808, lon: 90.4 },
  { id: 'bandarban', lat: 22.1953, lon: 92.2184 },
];
/** Places not built yet: shown dimmed, so the map can grow with the game. */
const SOON: Array<{ key: string; lat: number; lon: number }> = [
  { key: 'place.chattogram', lat: 22.3569, lon: 91.7832 },
  { key: 'place.sylhet', lat: 24.8949, lon: 91.8687 },
  { key: 'place.coxsbazar', lat: 21.4272, lon: 92.0058 },
  { key: 'place.sundarbans', lat: 21.95, lon: 89.18 },
];
/** How far to zoom on a Region: its centre and the width of view (km). */
const FOCUS: Record<MapRegion, { lat: number; lon: number; km: number }> = {
  dhaka: { lat: 23.778, lon: 90.398, km: 19 },
  bandarban: { lat: 22.12, lon: 92.24, km: 46 },
};

const pathOf = (pts: Array<[number, number]>) => pts.map(([lat, lon], i) => { const [x, y] = bdXY(lat, lon); return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`; }).join('');

export class MenuMap {
  readonly el = document.createElement('div');
  private svg!: SVGSVGElement;
  private focusRegion: MapRegion | null = null;
  onPick: (r: MapRegion) => void = () => {};

  constructor(private label: (key: string) => string) {
    this.el.className = 'menu-map';
    document.body.prepend(this.el);
    addEventListener('resize', () => this.applyView());
  }

  /** Draws (or redraws, e.g. after a language change) with the player's progress. */
  draw(progress: MapProgress): void {
    const [vx, vy, vw, vh] = BD_VIEWBOX;
    const routes = progress.routes.map(r => `<path class="route ${r.kind} ${r.done ? 'done' : ''}" d="${pathOf(r.latLon)}"/>`).join('');
    const found = LANDMARKS.filter(l => progress.found.has(l.name)).map(l => { const [x, y] = bdXY(l.lat, l.lon); return `<circle class="found" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.9"><title>${l.name}</title></circle>`; }).join('');
    // Each Region's landmarks, labelled, shown only while that Region is zoomed in: found ones in gold.
    const labels = PINS.map(r => `<g class="lm lm-${r.id}">${LANDMARKS.filter(l => l.places.some(pl => pl.startsWith(r.id))).map(l => {
      const [x, y] = bdXY(l.lat, l.lon), got = progress.found.has(l.name);
      return `<g class="lm-mark ${got ? 'got' : ''} ${l.tier}" transform="translate(${x.toFixed(2)},${y.toFixed(2)})"><circle/><text>${got ? '★ ' : ''}${place(l.name)}</text></g>`;
    }).join('')}</g>`).join('');
    const pin = (x: number, y: number, cls: string, text: string, id?: string) => `
      <g class="pin ${cls}" transform="translate(${x.toFixed(2)},${y.toFixed(2)})" ${id ? `data-pin="${id}" tabindex="0" role="button" aria-label="${text}"` : ''}>
        <circle class="pulse" r="10"/><circle class="dot" r="6"/><text y="-11">${text}</text></g>`;
    this.el.innerHTML = `<svg viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" aria-label="${this.label('mapTitle')}">
      <defs>
        <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e8a52"/><stop offset="1" stop-color="#2c6e40"/></linearGradient>
        <filter id="landShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#120a1e" flood-opacity=".55"/></filter>
      </defs>
      <g class="world">
        <g filter="url(#landShadow)"><path class="land" d="${BD_LAND}"/>${BD_ISLANDS.map(d => `<path class="land" d="${d}"/>`).join('')}</g>
        ${BD_DIVISIONS.map(d => `<path class="division" d="${d}"/>`).join('')}
        ${BD_RIVERS.map(r => `<path class="river" d="${r.d}"><title>${r.name}</title></path>`).join('')}
        ${routes}${found}${labels}
        ${SOON.map(p => { const [x, y] = bdXY(p.lat, p.lon); return pin(x, y, 'soon', this.label(p.key)); }).join('')}
        ${PINS.map(p => { const [x, y] = bdXY(p.lat, p.lon); return pin(x, y, `live ${p.id}`, this.label(`region.${p.id}`), p.id); }).join('')}
      </g></svg>`;
    this.svg = this.el.querySelector('svg')!;
    this.el.querySelectorAll<SVGGElement>('[data-pin]').forEach(g => {
      const pick = () => this.onPick(g.dataset.pin as MapRegion);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    this.applyView(true);
  }

  /** Glides to a Region (null: the whole country). */
  focus(r: MapRegion | null): void {
    if (r === this.focusRegion) return;
    this.focusRegion = r;
    this.el.classList.toggle('focused', !!r);
    this.el.dataset.focus = r ?? '';
    this.applyView();
  }

  private view: [number, number, number, number] = [...BD_VIEWBOX];
  private anim = 0;

  /**
   * Sets the view by animating the SVG viewBox: the whole country, or a Region framed beside the
   * destination card (to its left on wide screens, above the bottom sheet on phones).
   */
  private applyView(instant = false): void {
    if (!this.svg) return;
    const W = this.el.clientWidth || innerWidth, H = this.el.clientHeight || innerHeight, aspect = W / H;
    let target: [number, number, number, number];
    if (!this.focusRegion) {
      // The whole country, nudged right on wide screens so the home panel on the left doesn't cover it.
      const [vx, vy, vw, vh] = BD_VIEWBOX;
      target = W > 640 ? [vx - vw * 0.42, vy, vw * 1.42, vh] : [vx, vy, vw, vh];
    }
    else {
      const f = FOCUS[this.focusRegion], [cx, cy] = bdXY(f.lat, f.lon), wide = W > 640;
      // The Region fills the part of the screen the card leaves free: the left on wide screens.
      const free = wide ? Math.max(0.4, 1 - Math.min(420, W * 0.52) / W - 0.04) : 1;
      const vw = f.km / free, vh = vw / aspect;
      target = [cx - vw * (wide ? free / 2 : 0.5), cy - vh * (wide ? 0.5 : 0.22), vw, vh];
    }
    cancelAnimationFrame(this.anim);
    if (instant) { this.view = target; this.svg.setAttribute('viewBox', target.join(' ')); this.scaleLabels(); this.declutter(); return; }
    const from = [...this.view], t0 = performance.now(), DUR = 900;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / DUR));
      // Interpolate the width logarithmically so the zoom feels even all the way in.
      const w = Math.exp(Math.log(from[2]) + (Math.log(target[2]) - Math.log(from[2])) * k);
      const h = w * ((from[3] / from[2]) * (1 - k) + (target[3] / target[2]) * k);
      const x = from[0] + (target[0] - from[0]) * k, y = from[1] + (target[1] - from[1]) * k;
      this.view = [x, y, w, h];
      this.svg.setAttribute('viewBox', this.view.map(v => v.toFixed(2)).join(' '));
      this.scaleLabels();
      if (k < 1) this.anim = requestAnimationFrame(step);
      else this.declutter();
    };
    this.anim = requestAnimationFrame(step);
  }

  /** Landmark labels stay the same size on screen at any zoom: their sizes are set in screen pixels. */
  private scaleLabels(): void {
    const u = this.view[2] / (this.el.clientWidth || innerWidth);   // map units per screen pixel
    this.svg.style.setProperty('--lm-font', `${(11 * u).toFixed(4)}px`);
    this.svg.style.setProperty('--lm-r', `${(3 * u).toFixed(4)}px`);
    this.svg.style.setProperty('--lm-dx', `${(6 * u).toFixed(4)}px`);
    this.svg.style.setProperty('--lm-stroke', `${(2.5 * u).toFixed(4)}px`);
  }

  /** Hides labels that would overlap one already placed (found and hero landmarks go first). */
  private declutter(): void {
    if (!this.focusRegion) return;
    const marks = [...this.el.querySelectorAll<SVGGElement>(`.lm-${this.focusRegion} .lm-mark`)];
    marks.sort((a, b) => Number(b.classList.contains('got')) - Number(a.classList.contains('got')) || Number(b.classList.contains('hero')) - Number(a.classList.contains('hero')));
    const placed: DOMRect[] = [];
    for (const m of marks) {
      const text = m.querySelector('text')!;
      text.style.display = '';
      const r = text.getBoundingClientRect();
      const hit = placed.some(p => r.left < p.right + 4 && r.right + 4 > p.left && r.top < p.bottom + 2 && r.bottom + 2 > p.top);
      if (hit) text.style.display = 'none'; else placed.push(r);
    }
  }
}
