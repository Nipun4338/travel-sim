// Minimal bus HUD. The full bus-art look and corner layout arrive in M8 (SPEC §13).

export interface RunHudState {
  leg: string;
  nextStop: string;
  distanceM: number;
  dueInS: number;        // negative = late
  departing: boolean;    // at the Leg's first Stop: counting down to departure
  onboard: number;
  capacity: number;
  standing: number;
  taka: number;
  clockS: number;
  junction?: { name: string; stop: boolean; secondsLeft: number; distM: number };
}

export interface BusHudState {
  kmh: number;
  gear: string;
  doorsOpen: boolean;
  comfort: number;      // 0..1
  jerkyMoments: number;
  camera: string;
  run?: RunHudState;
}

const mmss = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${Math.floor(Math.abs(s) % 60).toString().padStart(2, '0')}`;

export class BusHud {
  private el = document.createElement('div');
  private toastEl = document.createElement('div');
  private toastTimer = 0;

  constructor() {
    this.el.className = 'hud';
    this.toastEl.className = 'toast';
    document.body.append(this.el, this.toastEl);
  }

  render(s: BusHudState): void {
    const pct = Math.round(s.comfort * 100);
    const r = s.run;
    const runHtml = r ? `
      <div class="next"><b>${r.nextStop}</b> · ${r.distanceM < 1000 ? `${Math.round(r.distanceM)} m` : `${(r.distanceM / 1000).toFixed(1)} km`}</div>
      <div>${r.departing ? `departs in ${mmss(Math.max(0, r.dueInS))}` : r.dueInS >= 0 ? `due in ${mmss(r.dueInS)}` : `<span class="late">${mmss(r.dueInS)} late</span>`} · clock ${mmss(r.clockS)}</div>
      <div>Passengers ${r.onboard}/${r.capacity} (${r.standing} standing)</div>
      ${r.junction ? `<div class="junction ${r.junction.stop ? 'stop' : 'go'}">${r.junction.name} junction ${Math.round(r.junction.distM)} m: <b>${r.junction.stop ? 'STOP' : 'GO'}</b> ${mmss(r.junction.secondsLeft)}</div>` : ''}
      <div class="taka">৳ ${Math.round(r.taka).toLocaleString('en-IN')}</div>
      <div class="leg">${r.leg}</div>` : '';
    this.el.innerHTML = `
      <div class="speed"><b>${Math.abs(s.kmh).toFixed(0)}</b> km/h · ${s.gear}</div>
      ${runHtml}
      <div>Doors: <b>${s.doorsOpen ? 'OPEN' : 'closed'}</b></div>
      <div>Comfort <span class="bar"><i style="width:${pct}%" class="${s.comfort < 0.5 ? 'low' : ''}"></i></span> · jerky ${s.jerkyMoments}</div>
      <div class="keys">W/S gas·brake · A/D steer · F doors · V view · R restart Leg · 1/2/3 Leg</div>`;
  }

  toast(msg: string, ms = 1600): void {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.style.opacity = '0'), ms);
  }
}
