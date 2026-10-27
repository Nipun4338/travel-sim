// Results screen after a Run (SPEC §6). Plain styling for now; the bus-art look comes in M8.
import type { LedgerKind, RunResult } from '../bus/run/Run';

const LABELS: Record<LedgerKind, string> = {
  fare: 'Fares', onTime: 'On-time bonus', late: 'Late arrivals', early: 'Early departures', missed: 'Missed Stops',
  leftBehind: 'Passengers left behind', jerky: 'Rough driving', collision: 'Collisions',
};
const tk = (n: number) => `${n < 0 ? '−' : ''}৳ ${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export interface ResultsActions { retry: () => void; next?: () => void; }

export class ResultsScreen {
  private el = document.createElement('div');

  constructor() {
    this.el.className = 'results';
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  get visible(): boolean { return !this.el.hidden; }

  show(title: string, r: RunResult, actions: ResultsActions): void {
    const sums = new Map<LedgerKind, number>();
    for (const e of r.ledger) sums.set(e.kind, (sums.get(e.kind) ?? 0) + e.tk);
    const mins = Math.floor(r.seconds / 60), secs = Math.round(r.seconds % 60).toString().padStart(2, '0');
    this.el.innerHTML = `
      <div class="panel">
        <h2>${r.status === 'failed' ? 'Run failed' : 'Leg complete'}</h2>
        <div class="sub">${title}${r.reason ? ` · ${r.reason}` : ''}</div>
        <table>${[...sums].map(([k, v]) => `<tr><td>${LABELS[k]}</td><td class="${v < 0 ? 'neg' : ''}">${tk(v)}</td></tr>`).join('')}
          <tr class="total"><td>Taka earned</td><td>${tk(r.takaEarned)}</td></tr></table>
        <div class="stars">
          <div>Punctuality <b>${starText(r.stars.punctuality)}</b></div>
          <div>Comfort <b>${starText(r.stars.comfort)}</b></div>
          <div>Safety <b>${starText(r.stars.safety)}</b></div>
        </div>
        <div class="sub">${r.km.toFixed(1)} km · ${mins}:${secs} · ${r.passengersCarried} passengers · ${r.jerkyMoments} jerky moments</div>
        <div class="buttons">
          ${actions.next && r.status === 'finished' ? '<button data-a="next">Next Leg</button>' : ''}
          <button data-a="retry">Retry</button>
        </div>
      </div>`;
    this.el.querySelector('[data-a="retry"]')!.addEventListener('click', () => { this.hide(); actions.retry(); });
    this.el.querySelector('[data-a="next"]')?.addEventListener('click', () => { this.hide(); actions.next!(); });
    this.el.hidden = false;
  }

  hide(): void { this.el.hidden = true; }
}
