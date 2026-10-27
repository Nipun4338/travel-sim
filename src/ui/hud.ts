// Driving comes first: a slim strip with the next Stop, and everything else behind Tab.
// In the cab the speed is on the dashboard, so the strip leaves it out. The full bus-art look and
// corner layout arrive in M8 (SPEC §13).
import { amount, clock, legTitle, num, place, t } from '../i18n/i18n';

export interface RunHudState {
  leg: { n: number; from: string; to: string; full?: boolean };
  nextStop: string;
  distanceM: number;
  dueInS: number;        // negative = late
  departing: boolean;    // at the Leg's first Stop: counting down to departure
  onboard: number;
  capacity: number;
  standing: number;
  taka: number;
  clockS: number;
  scored: boolean;
  junction?: { name: string; stop: boolean; secondsLeft: number; distM: number };
}

export interface BusHudState {
  kmh: number;
  gear: string;
  doorsOpen: boolean;
  comfort: number;      // 0..1
  jerkyMoments: number;
  inCab: boolean;
  run?: RunHudState;
}

const dist = (m: number) => (m < 1000 ? `${num(Math.round(m / 10) * 10)} ${t('m')}` : `${num((m / 1000).toFixed(1))} ${t('km')}`);

export class BusHud {
  private strip = document.createElement('div');
  private details = document.createElement('div');
  private toastEl = document.createElement('div');
  private toastTimer = 0;
  showDetails = false;

  private speed = document.createElement('div');
  private score = document.createElement('div');

  constructor() {
    this.speed.className = 'hud-corner bl';
    this.score.className = 'hud-corner tr';
    this.score.hidden = true;
    document.body.append(this.speed, this.score);
    this.strip.className = 'hud-strip';
    this.details.className = 'hud-details';
    this.toastEl.className = 'toast';
    document.body.append(this.strip, this.details, this.toastEl);
  }

  render(s: BusHudState): void {
    const r = s.run;
    const parts: string[] = [];
    // Speed sits bottom-left in the chase view (the cab has its speedometer); on phones that
    // corner is the steer area, so it rides in the banner instead.
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (!s.inCab && coarse) parts.push(`<b>${num(Math.abs(s.kmh).toFixed(0))}</b> ${t('kmh')}`);
    this.speed.hidden = s.inCab || coarse;
    if (!this.speed.hidden) this.speed.innerHTML = `<label>${t('speedLabel')}</label><span class="num">${num(Math.abs(s.kmh).toFixed(0))}</span> ${t('kmh')}`;
    // Scored mode: Taka, passengers and comfort top-right (SPEC §13). Relaxed keeps the view clear.
    this.score.hidden = !r?.scored;
    if (r?.scored) {
      this.score.innerHTML = `<label>${t('takaEarned')}</label><span class="num">৳ ${amount(r.taka)}</span>
        <div>${t('passengers', { n: r.onboard, cap: r.capacity, s: r.standing })}</div>
        <div>${t('comfort')}<span class="bar"><i style="width:${Math.round(s.comfort * 100)}%" class="${s.comfort < 0.5 ? 'low' : ''}"></i></span></div>`;
    }
    if (r) {
      parts.push(`${t('next')}: <b>${place(r.nextStop)}</b> · ${dist(r.distanceM)}`);
      if (r.junction && r.junction.distM < 120) {
        parts.push(`<span class="${r.junction.stop ? 'stop' : 'go'}">${place(r.junction.name)} · ${r.junction.stop ? t('junctionStop') : t('junctionGo')}</span>`);
      }
    }
    this.strip.innerHTML = parts.join('<span class="sep"></span>');
    this.strip.hidden = parts.length === 0;

    this.details.hidden = !this.showDetails;
    if (!this.showDetails) return;
    const timing = r ? (r.departing ? t('departsIn', { t: clock(Math.max(0, r.dueInS)) }) : r.dueInS >= 0 ? t('dueIn', { t: clock(r.dueInS) }) : t('late', { t: clock(r.dueInS) })) : '';
    this.details.innerHTML = `
      ${r ? `<div class="leg">${legTitle(r.leg)}</div>
      <div>${timing}</div>
      <div>${t('passengers', { n: r.onboard, cap: r.capacity, s: r.standing })}</div>
      ${r.scored ? `<div class="taka">৳ ${amount(r.taka)}</div>` : ''}` : ''}
      <div>${s.doorsOpen ? t('doorsOpen') : t('doorsClosed')}</div>
      <div>${t('comfort')} <span class="bar"><i style="width:${Math.round(s.comfort * 100)}%" class="${s.comfort < 0.5 ? 'low' : ''}"></i></span></div>
      <div class="keys">${t('keys')}</div>`;
  }

  toast(msg: string, ms = 2200): void {
    if (!msg) return;
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.style.opacity = '0'), ms);
  }
}
