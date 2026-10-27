// Rain on the bus windscreen (SPEC §9 "wipers in cockpit view"): drops land and build up on the
// glass, big ones run down, and two wiper blades sweep their arcs, clearing exactly the drops they
// pass over. A 2D canvas over the cab view; drops are one pre-rendered sprite, so it stays cheap.

interface Drop { x: number; y: number; r: number; vy: number; }

const WIPE_PERIOD = 1.6;   // s for a full sweep up and back
const PARK_S = 0.35;       // blades rest at the bottom for a moment between sweeps

export class WindscreenRain {
  private canvas = document.createElement('canvas');
  private g = this.canvas.getContext('2d')!;
  private sprite = document.createElement('canvas');
  private drops: Drop[] = [];
  private t = 0;
  private cycle = -1;
  /** Called as each sweep starts (the wiper sound). */
  onSweep: () => void = () => {};
  private lastAngles: number[] = [];
  private w = 0;
  private h = 0;

  constructor() {
    this.canvas.className = 'windscreen';
    // Straight after the 3D view, so the HUD (banner, minimap, panels) stays on top and dry: the
    // rain is on the glass, not on the player's screen.
    const view = document.querySelector('canvas');
    if (view) view.after(this.canvas); else document.body.prepend(this.canvas);
    // A drop: clear centre, a darker refracting rim and a bright highlight.
    this.sprite.width = this.sprite.height = 32;
    const s = this.sprite.getContext('2d')!;
    const grd = s.createRadialGradient(13, 12, 1, 16, 16, 15);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.35, 'rgba(210,225,240,0.18)');
    grd.addColorStop(0.85, 'rgba(60,75,90,0.35)');
    grd.addColorStop(1, 'rgba(60,75,90,0)');
    s.fillStyle = grd;
    s.beginPath(); s.arc(16, 16, 15, 0, Math.PI * 2); s.fill();
  }

  /** The glass: above the dashboard line, in screen pixels. */
  private get glassBottom(): number { return this.h * 0.62; }

  /** Blade pivots sit on the bottom edge of the glass; both sweep the same way, as on a bus. */
  private blades(): Array<{ px: number; py: number; len: number }> {
    return [
      { px: this.w * 0.24, py: this.glassBottom, len: this.w * 0.3 },
      { px: this.w * 0.6, py: this.glassBottom, len: this.w * 0.3 },
    ];
  }

  /** Blade angle from the +x axis (screen up is positive): parked lying left, sweeping to the right. */
  private angle(t: number): number {
    const cycle = WIPE_PERIOD + PARK_S, u = t % cycle;
    if (u > WIPE_PERIOD) return Math.PI * 0.96;
    const k = (1 - Math.cos((u / WIPE_PERIOD) * Math.PI * 2)) / 2; // 0 → 1 → 0, eased at the ends
    return Math.PI * 0.96 - k * Math.PI * 0.84;
  }

  update(dt: number, visible: boolean, kmh: number): void {
    this.canvas.hidden = !visible;
    if (!visible) return;
    if (this.canvas.width !== innerWidth || this.canvas.height !== innerHeight) {
      this.canvas.width = this.w = innerWidth;
      this.canvas.height = this.h = innerHeight;
      this.drops = [];
    }
    this.t += dt;
    const cycle = Math.floor(this.t / (WIPE_PERIOD + PARK_S));
    if (cycle !== this.cycle) { this.cycle = cycle; this.onSweep(); }
    // New drops: steady rain, more when driving into it.
    const rate = (60 + Math.min(80, Math.abs(kmh) * 1.5)) * (this.w * this.glassBottom) / 1e6 * 4;
    for (let n = Math.floor(rate * dt + Math.random()); n > 0; n--) {
      this.drops.push({ x: Math.random() * this.w, y: Math.random() * this.glassBottom, r: 2 + Math.random() * Math.random() * 7, vy: 0 });
    }
    // Big drops (often two merged) run down the glass.
    for (const d of this.drops) {
      if (d.r > 5.5) d.vy = Math.min(90, d.vy + 120 * dt);
      d.y += d.vy * dt;
    }
    // Wipers clear everything inside the sector each blade swept this frame.
    const blades = this.blades();
    const angles = blades.map(() => this.angle(this.t));
    blades.forEach((b, i) => {
      const a0 = this.lastAngles[i] ?? angles[i], a1 = angles[i];
      const lo = Math.min(a0, a1) - 0.02, hi = Math.max(a0, a1) + 0.02;
      this.drops = this.drops.filter(d => {
        const dx = d.x - b.px, dy = b.py - d.y, dist = Math.hypot(dx, dy);
        if (dist > b.len + d.r) return true;
        const a = Math.atan2(dy, dx);
        return a < lo || a > hi;
      });
    });
    this.lastAngles = angles;
    this.drops = this.drops.filter(d => d.y < this.glassBottom).slice(-900);

    const g = this.g;
    g.clearRect(0, 0, this.w, this.h);
    for (const d of this.drops) {
      const s = d.r * 2;
      g.drawImage(this.sprite, d.x - d.r, d.y - d.r - (d.vy ? d.r * 0.4 : 0), s, d.vy ? s * 1.4 : s);
    }
    // Blades: a dark rubber strip on a thin arm.
    blades.forEach((b, i) => {
      const a = angles[i], ex = b.px + Math.cos(a) * b.len, ey = b.py - Math.sin(a) * b.len;
      g.strokeStyle = '#1a1a1a';
      g.lineCap = 'round';
      g.lineWidth = Math.max(5, this.w * 0.006);
      g.beginPath(); g.moveTo(b.px + Math.cos(a) * b.len * 0.12, b.py - Math.sin(a) * b.len * 0.12); g.lineTo(ex, ey); g.stroke();
      g.lineWidth = 3;
      g.strokeStyle = '#3a3a3a';
      g.beginPath(); g.moveTo(b.px, b.py); g.lineTo(ex, ey); g.stroke();
    });
  }
}
