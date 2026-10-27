// Flight Mode HUD: a slim strip (the Challenge's next Ring, or landmarks in free flight; STALL in
// red), speed/height readouts beside the view in the chase camera (the panel has them in the
// cockpit), Tab details, toasts and the end-of-Challenge card. The full M8 layout comes later.
import type { ChallengeResult } from '../flight/challenge';
import { clock, num, place, t } from '../i18n/i18n';

export interface FlightHudState {
  kmh: number; altM: number; agl: number; vsMs: number; headingDeg: number; throttle: number;
  stall: boolean; inCockpit: boolean; outside: boolean;
  title: string;               // Challenge name or "Free flight"
  goal?: string;               // e.g. "Ring 3/7 · 1.2 km"
  warn?: string;               // e.g. above the ceiling
  scored: boolean;
  /** Metres above (+) or below (−) the glide path on a landing Challenge's final. */
  glideM?: number;
}

const dist = (m: number) => (m < 1000 ? `${num(Math.round(m / 10) * 10)} ${t('m')}` : `${num((m / 1000).toFixed(1))} ${t('km')}`);
export const distText = dist;

export class FlightHud {
  private strip = document.createElement('div');
  private left = document.createElement('div');
  private right = document.createElement('div');
  private details = document.createElement('div');
  private toastEl = document.createElement('div');
  private card = document.createElement('div');
  private hdg = document.createElement('div');
  private thr = document.createElement('div');
  private glide = document.createElement('div');
  private toastTimer = 0;
  showDetails = false;

  constructor() {
    this.strip.className = 'hud-strip';
    this.left.className = 'flight-read left';
    this.right.className = 'flight-read right';
    this.details.className = 'hud-details';
    this.toastEl.className = 'toast';
    this.card.className = 'results';
    this.card.hidden = true;
    this.hdg.className = 'hud-corner tc';
    this.thr.className = 'hud-corner bl';
    this.glide.className = 'hud-corner br glide';
    document.body.append(this.strip, this.left, this.right, this.details, this.toastEl, this.card, this.hdg, this.thr, this.glide);
  }

  toast(msg: string, ms = 2200): void {
    if (!msg) return;
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { this.toastEl.style.opacity = '0'; }, ms);
  }

  render(s: FlightHudState): void {
    const parts = [`<b>${s.title}</b>`];
    if (s.goal) parts.push(s.goal);
    if (s.warn) parts.push(`<span class="stop">${s.warn}</span>`);
    if (s.outside) parts.push(`<span class="stop">${t('outsideZone')}</span>`);
    if (s.stall) parts.push(`<span class="stall">${t('stall')}</span>`);
    this.strip.innerHTML = parts.join('<span class="sep"></span>');
    const chase = !s.inCockpit;
    this.left.hidden = this.right.hidden = this.hdg.hidden = this.thr.hidden = !chase;
    // The glide-path cue helps in both views, on final only.
    this.glide.hidden = s.glideM === undefined;
    if (s.glideM !== undefined) {
      const d = Math.round(s.glideM);
      this.glide.innerHTML = `<label>${t('glidePath')}</label><b>${Math.abs(d) <= 5 ? t('glideOn') : d > 0 ? t('glideHigh', { m: d }) : t('glideLow', { m: -d })}</b>`;
    }
    if (chase) {
      this.hdg.innerHTML = `${num(String(Math.round(s.headingDeg) % 360).padStart(3, '0'))}°`;
      this.thr.innerHTML = `<label>${t('throttle')}</label><span class="bar" style="width:120px"><i style="width:${Math.round(s.throttle * 100)}%"></i></span>`;
    }
    if (chase) {
      this.left.innerHTML = `<b>${num(Math.round(s.kmh))}</b> ${t('kmh')}`;
      this.right.innerHTML = `<b>${num(Math.round(s.altM))}</b> ${t('mAsl')}<br><span>${s.vsMs >= 0 ? '▲' : '▼'} ${num(Math.abs(s.vsMs).toFixed(1))} ${t('vsUnit')}</span>`;
    }
    this.details.hidden = !this.showDetails;
    if (this.showDetails) {
      this.details.innerHTML = `
        <div>${t('alt', { m: Math.round(s.altM) })} · ${t('agl', { m: Math.round(s.agl) })}</div>
        <div>${num(Math.round(s.kmh))} ${t('kmh')} · ${t('vs', { v: s.vsMs.toFixed(1) })} · ${t('hdg', { d: Math.round(s.headingDeg) })}</div>
        <div>${t('throttle')} <span class="bar"><i style="width:${Math.round(s.throttle * 100)}%"></i></span></div>
        <div class="keys">${t('flightKeys')}</div>`;
    }
  }

  get resultsVisible(): boolean { return !this.card.hidden; }

  hideResults(): void { this.card.hidden = true; }

  /** End of a Challenge. `failed` is a reason key (scored mode only). */
  showResults(title: string, r: ChallengeResult | null, failed: string | null, actions: Array<{ label: string; run: () => void }>, scoredMode = false): void {
    const lines: string[] = [];
    if (r) {
      lines.push(`${t('ringsSummary', { hit: r.ringsHit, of: r.rings })} · ${clock(r.timeS)} (${t('parTime', { t: clock(r.parS) })})`);
      if (r.landing) {
        const l = r.landing;
        lines.push(l.onTarget
          ? t('landingInfo', { grade: t(`grade.${l.grade}`), sink: l.sinkMs.toFixed(1), off: (l.offCentreM ?? 0).toFixed(1), past: Math.round(l.pastThresholdM ?? 0) })
          : `${t(`grade.${l.grade}`)} · ${t('wrongRunway', { r: '32' })}`);
      }
      if (r.maxOffCentreM !== undefined) lines.push(t('centreline', { m: r.maxOffCentreM.toFixed(1) }));
    }
    const scored = scoredMode && r;
    this.card.innerHTML = `<div class="panel">
      <h2>${failed ? t('challengeFailed') : t('challengeDone')}</h2>
      <div class="sub">${title}</div>
      ${failed ? `<p class="summary">${t(failed)}</p>` : ''}
      ${lines.map(l => `<p class="summary">${l}</p>`).join('')}
      ${scored ? `<p class="summary"><b>${t('takaEarned')}: ৳ ${num(r!.taka)}</b></p><div class="stars">${'★'.repeat(r!.stars)}${'☆'.repeat(3 - r!.stars)}</div>` : ''}
      <div class="buttons"></div></div>`;
    const box = this.card.querySelector('.buttons')!;
    for (const a of actions) {
      const b = document.createElement('button');
      b.textContent = a.label;
      b.onclick = () => { this.hideResults(); a.run(); };
      box.appendChild(b);
    }
    this.card.hidden = false;
  }
}

export { place };
