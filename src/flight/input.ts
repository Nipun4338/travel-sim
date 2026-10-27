// Plane controls (SPEC §12): W/S pitch (W = nose down, like a stick; ?invert=1 flips it), A/D roll,
// Q/E rudder, Shift/Z throttle, B brakes; a left stick, triggers and bumpers on a gamepad; a floating
// virtual stick, throttle slider and BRAKE on touch.
import { onLangChange, t } from '../i18n/i18n';
import type { FlightInput } from './FlightModel';

export type FlightAction = 'camera' | 'reset' | 'landingLight' | 'details' | 'map' | 'language';

const ACTION_KEYS: Record<string, FlightAction> = {
  KeyV: 'camera', KeyR: 'reset', KeyL: 'landingLight', Tab: 'details', KeyM: 'map', Backquote: 'language',
};

export class FlightControls {
  private keys = new Set<string>();
  private listeners: Array<(a: FlightAction) => void> = [];
  private touch = { pitch: 0, roll: 0, brake: 0, throttle: -1 };
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
    brake = Math.max(brake, this.touch.brake);
    if (this.invert) pitch = -pitch;
    return { pitch, roll, yaw, throttle, brake };
  }

  private mountTouch(): void {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
    const root = document.createElement('div');
    root.className = 'touch flight-touch';
    root.innerHTML = `
      <div class="stick-zone"><span></span></div>
      <button class="pad brake"></button>
      <div class="thr-wrap"><input class="thr" type="range" min="0" max="1" step="0.01" value="0"></div>
      <div class="lights-row"><button class="mini cam">👁</button><button class="mini head">💡</button><button class="mini map">🗺</button></div>`;
    document.body.appendChild(root);
    const label = () => {
      root.querySelector('.stick-zone span')!.textContent = t('touchStick');
      root.querySelector('.brake')!.textContent = t('touchBrake');
    };
    label();
    onLangChange(label);
    const zone = root.querySelector<HTMLElement>('.stick-zone')!;
    let o: { x: number; y: number } | null = null;
    zone.addEventListener('pointerdown', e => { o = { x: e.clientX, y: e.clientY }; zone.setPointerCapture(e.pointerId); });
    zone.addEventListener('pointermove', e => {
      if (!o) return;
      this.touch.roll = Math.max(-1, Math.min(1, (e.clientX - o.x) / 70));
      this.touch.pitch = Math.max(-1, Math.min(1, (e.clientY - o.y) / 70)); // drag down = nose up
    });
    const end = () => { o = null; this.touch.roll = this.touch.pitch = 0; };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    const thr = root.querySelector<HTMLInputElement>('.thr')!;
    thr.addEventListener('input', () => { this.touchThrottle = parseFloat(thr.value); });
    this.syncThrottle = v => { thr.value = String(v); };
    const brake = root.querySelector<HTMLElement>('.brake')!;
    brake.addEventListener('pointerdown', () => { this.touch.brake = 1; });
    brake.addEventListener('pointerup', () => { this.touch.brake = 0; });
    brake.addEventListener('pointercancel', () => { this.touch.brake = 0; });
    root.querySelector('.cam')!.addEventListener('pointerdown', () => this.emit('camera'));
    root.querySelector('.head')!.addEventListener('pointerdown', () => this.emit('landingLight'));
    root.querySelector('.map')!.addEventListener('pointerdown', () => this.emit('map'));
  }

  /** Moves the touch throttle slider to match the plane (after a respawn). */
  syncThrottle: (v: number) => void = () => undefined;
}
