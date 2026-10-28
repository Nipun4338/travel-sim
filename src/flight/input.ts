// Plane controls (SPEC §12): W/S pitch (W = nose down, like a stick; ?invert=1 flips it), A/D roll,
// Q/E rudder, Shift/Z throttle, B brakes; a left stick, triggers and bumpers on a gamepad; a floating
// virtual stick, throttle slider and BRAKE on touch.
import { loadSettings } from '../core/settings';
import { onLangChange, t } from '../i18n/i18n';
import { capture, gameScreen, isTouch, Tilt } from '../ui/touch/phone';
import type { FlightInput } from './FlightModel';

export type FlightAction = 'camera' | 'reset' | 'landingLight' | 'details' | 'map' | 'language';

const ACTION_KEYS: Record<string, FlightAction> = {
  KeyV: 'camera', KeyR: 'reset', KeyL: 'landingLight', Tab: 'details', KeyM: 'map', Backquote: 'language',
};

export class FlightControls {
  private keys = new Set<string>();
  private listeners: Array<(a: FlightAction) => void> = [];
  private touch = { pitch: 0, roll: 0, yaw: 0, brake: 0 };
  /** Set when the touch throttle slider moves; the game copies it to the plane. */
  touchThrottle: number | null = null;
  invert = new URLSearchParams(location.search).get('invert') === '1';

  constructor() {
    addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      const a = ACTION_KEYS[e.code];
      if (a) this.emit(a);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.mountTouch();
  }

  onAction(fn: (a: FlightAction) => void): void { this.listeners.push(fn); }
  emit(a: FlightAction): void { this.listeners.forEach(fn => fn(a)); }

  read(): FlightInput {
    const k = (...codes: string[]) => (codes.some(c => this.keys.has(c)) ? 1 : 0);
    let pitch = k('KeyS', 'ArrowDown') - k('KeyW', 'ArrowUp');
    let roll = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    let yaw = k('KeyE') - k('KeyQ');
    let throttle = k('ShiftLeft', 'ShiftRight') - k('KeyZ');
    let brake = k('KeyB');
    const gp = navigator.getGamepads?.().find(Boolean);
    if (gp) {
      const dz = (v: number) => (Math.abs(v) > 0.1 ? v : 0);
      if (dz(gp.axes[0] ?? 0)) roll = gp.axes[0];
      if (dz(gp.axes[1] ?? 0)) pitch = gp.axes[1];
      const up = gp.buttons[7]?.value ?? 0, down = gp.buttons[6]?.value ?? 0;
      if (up || down) throttle = up - down;
      yaw = (gp.buttons[5]?.pressed ? 1 : 0) - (gp.buttons[4]?.pressed ? 1 : 0) || yaw;
      brake = Math.max(brake, gp.buttons[0]?.pressed ? 1 : 0);
    }
    if (this.touch.roll || this.touch.pitch) { roll = this.touch.roll; pitch = this.touch.pitch; }
    if (this.touch.yaw) yaw = this.touch.yaw;
    brake = Math.max(brake, this.touch.brake);
    if (this.invert) pitch = -pitch;
    return { pitch, roll, yaw, throttle, brake };
  }

  /**
   * Touch, mobile-flight-sim style: a floating joystick wherever your left thumb lands (or tilt the
   * phone to fly, from Settings), a throttle lever on the right, wheel brakes, rudder buttons, and an
   * icon row. Drag the stick down for nose up, like pulling back on a yoke.
   */
  private mountTouch(): void {
    if (!isTouch()) return;
    gameScreen();
    const tiltMode = loadSettings().touchFlight === 'tilt';
    const root = document.createElement('div');
    root.className = 'touch flight-touch';
    root.innerHTML = `
      <div class="stick-zone">${tiltMode ? '<button class="recentre">⟳</button>' : '<div class="stick-base"><div class="stick-knob"></div></div>'}<span></span></div>
      <div class="rudder"><button data-r="-1">◁</button><button data-r="1">▷</button></div>
      <div class="throttle"><div class="thr-track"><div class="thr-fill"></div><div class="thr-handle"></div></div><span class="thr-pct">0%</span></div>
      <button class="pad brake"></button>
      <div class="icon-row"><button data-a="camera">👁</button><button data-a="landingLight">💡</button><button data-a="map">🗺</button><button data-a="pause">❚❚</button></div>`;
    document.body.appendChild(root);
    const label = () => {
      root.querySelector('.stick-zone span')!.textContent = tiltMode ? t('tiltToFly') : t('touchStick');
      root.querySelector('.brake')!.textContent = t('touchBrake');
    };
    label();
    onLangChange(label);

    const zone = root.querySelector<HTMLElement>('.stick-zone')!;
    if (tiltMode) {
      const tilt = new Tilt();
      addEventListener('pointerdown', () => void tilt.start(), { once: true });
      root.querySelector('.recentre')!.addEventListener('pointerdown', () => tilt.recentre());
      const tick = () => {
        this.touch.roll = Math.max(-1, Math.min(1, -tilt.roll / 30));
        this.touch.pitch = Math.max(-1, Math.min(1, -tilt.pitch / 25));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      // The stick appears where the thumb lands and follows it, 60 px to full deflection.
      const base = root.querySelector<HTMLElement>('.stick-base')!, knob = root.querySelector<HTMLElement>('.stick-knob')!;
      let o: { x: number; y: number } | null = null;
      const R = 60;
      zone.addEventListener('pointerdown', e => {
        const z = zone.getBoundingClientRect();
        o = { x: e.clientX, y: e.clientY };
        base.style.left = `${e.clientX - z.left}px`;
        base.style.top = `${e.clientY - z.top}px`;
        base.classList.add('on');
        capture(zone, e);
      });
      zone.addEventListener('pointermove', e => {
        if (!o) return;
        let dx = e.clientX - o.x, dy = e.clientY - o.y;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.touch.roll = dx / R;
        this.touch.pitch = dy / R;          // drag down = nose up
      });
      const end = () => { o = null; this.touch.roll = this.touch.pitch = 0; knob.style.transform = ''; base.classList.remove('on'); };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
    }

    // Throttle lever: drag the handle up and down its track.
    const track = root.querySelector<HTMLElement>('.thr-track')!, fill = root.querySelector<HTMLElement>('.thr-fill')!;
    const handle = root.querySelector<HTMLElement>('.thr-handle')!, pct = root.querySelector<HTMLElement>('.thr-pct')!;
    const show = (v: number) => { fill.style.height = `${v * 100}%`; handle.style.bottom = `calc(${v * 100}% - 14px)`; pct.textContent = `${Math.round(v * 100)}%`; };
    const fromY = (e: PointerEvent) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)); };
    let dragging = false;
    track.addEventListener('pointerdown', e => { dragging = true; capture(track, e); this.touchThrottle = fromY(e); show(this.touchThrottle); });
    track.addEventListener('pointermove', e => { if (dragging) { this.touchThrottle = fromY(e); show(this.touchThrottle); } });
    track.addEventListener('pointerup', () => { dragging = false; });
    track.addEventListener('pointercancel', () => { dragging = false; });
    this.syncThrottle = v => show(v);
    show(0);

    const brake = root.querySelector<HTMLElement>('.brake')!;
    brake.addEventListener('pointerdown', () => { this.touch.brake = 1; brake.classList.add('down'); });
    for (const ev of ['pointerup', 'pointercancel']) brake.addEventListener(ev, () => { this.touch.brake = 0; brake.classList.remove('down'); });
    root.querySelectorAll<HTMLElement>('.rudder button').forEach(b => {
      b.addEventListener('pointerdown', () => { this.touch.yaw = parseInt(b.dataset.r!, 10); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { this.touch.yaw = 0; });
    });
    root.querySelectorAll<HTMLElement>('.icon-row [data-a]').forEach(b => b.addEventListener('pointerdown', () => {
      if (b.dataset.a === 'pause') dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      else this.emit(b.dataset.a as FlightAction);
    }));
  }

  /** Moves the touch throttle slider to match the plane (after a respawn). */
  syncThrottle: (v: number) => void = () => undefined;
}
