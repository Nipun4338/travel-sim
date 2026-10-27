// Minimal bus HUD for M1. The full bus-art look and corner layout arrive in M8 (SPEC §13).

export interface BusHudState {
  kmh: number;
  gear: string;
  doorsOpen: boolean;
  comfort: number;      // 0..1
  jerkyMoments: number;
  stopsServed: number;
  stopsTotal: number;
  camera: string;
}

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
    this.el.innerHTML = `
      <div class="speed"><b>${Math.abs(s.kmh).toFixed(0)}</b> km/h · ${s.gear}</div>
      <div>Doors: <b>${s.doorsOpen ? 'OPEN' : 'closed'}</b> · Stops ${s.stopsServed}/${s.stopsTotal}</div>
      <div>Comfort <span class="bar"><i style="width:${pct}%" class="${s.comfort < 0.5 ? 'low' : ''}"></i></span></div>
      <div>Jerky moments: ${s.jerkyMoments} · View: ${s.camera}</div>
      <div class="keys">W/S gas·brake · A/D steer · F doors · V view · R reset · 1 Route start · 2 Leg 2 start</div>`;
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.style.opacity = '0'), 1400);
  }
}
