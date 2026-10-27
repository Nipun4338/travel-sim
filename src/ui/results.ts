// End-of-Leg screen. Relaxed (default): a calm trip summary. Scored mode adds the Taka breakdown
// and stars (SPEC §6). Plain styling for now; the bus-art look comes in M8.
import type { LedgerKind, RunResult } from '../bus/run/Run';
import { amount, clock, legTitle, num, t } from '../i18n/i18n';

const tk = (n: number) => `${n < 0 ? '−' : ''}৳ ${amount(Math.abs(n))}`;
const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export interface ResultsActions { retry: () => void; next?: () => void; menu: () => void; }

export class ResultsScreen {
  private el = document.createElement('div');

  constructor() {
    this.el.className = 'results';
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  get visible(): boolean { return !this.el.hidden; }

  show(leg: { n: number; from: string; to: string; full?: boolean }, r: RunResult, actions: ResultsActions): void {
    const title = legTitle(leg);
    const time = clock(r.seconds);
    let body: string;
    if (!r.scored) {
      body = `<h2>${t('tripComplete')}</h2><div class="sub">${title}</div>
        <p class="summary">${t('tripSummary', { km: num(r.km.toFixed(1)), time, pax: r.passengersCarried, stops: r.stopsServed })}</p>`;
    } else {
      const sums = new Map<LedgerKind, number>();
      for (const e of r.ledger) sums.set(e.kind, (sums.get(e.kind) ?? 0) + e.tk);
      const reason = r.reason ? ` · ${t(r.reason, { kmh: r.reasonKmh ?? 0 })}` : '';
      body = `<h2>${r.status === 'failed' ? t('runFailed') : t('legComplete')}</h2><div class="sub">${title}${reason}</div>
        <table>${[...sums].map(([k, v]) => `<tr><td>${t('ledger.' + k)}</td><td class="${v < 0 ? 'neg' : ''}">${tk(v)}</td></tr>`).join('')}
          <tr class="total"><td>${t('takaEarned')}</td><td>${tk(r.takaEarned)}</td></tr></table>
        <div class="stars">
          <div>${t('punctuality')} <b>${starText(r.stars.punctuality)}</b></div>
          <div>${t('comfort')} <b>${starText(r.stars.comfort)}</b></div>
          <div>${t('safety')} <b>${starText(r.stars.safety)}</b></div>
        </div>
        <div class="sub">${t('summary', { km: num(r.km.toFixed(1)), time, pax: r.passengersCarried, jerky: r.jerkyMoments })}</div>`;
    }
    this.el.innerHTML = `<div class="panel">${body}
      <div class="buttons">
        ${actions.next && r.status === 'finished' ? `<button data-a="next">${t('nextLeg')}</button>` : ''}
        <button data-a="retry">${t('retry')}</button>
        <button data-a="menu">${t('menu')}</button>
      </div></div>`;
    this.el.querySelector('[data-a="menu"]')!.addEventListener('click', actions.menu);
    this.el.querySelector('[data-a="retry"]')!.addEventListener('click', () => { this.hide(); actions.retry(); });
    this.el.querySelector('[data-a="next"]')?.addEventListener('click', () => { this.hide(); actions.next!(); });
    this.el.hidden = false;
  }

  hide(): void { this.el.hidden = true; }
}
