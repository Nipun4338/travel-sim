// Bus controls from keyboard, gamepad and touch (SPEC §12).

export interface BusInput {
  gas: number;    // 0..1
  brake: number;  // 0..1
  steer: number;  // -1..1, + = left
}

export type BusAction =
  | 'doors' | 'horn' | 'camera' | 'reset' | 'leg1' | 'leg2' | 'leg3'
  | 'lights' | 'highBeam' | 'indicatorLeft' | 'indicatorRight' | 'hazard' | 'language' | 'details';

// Light keys follow truck-sim conventions: L headlights, K high beam, Q/E indicators, X hazards.
const ACTION_KEYS: Record<string, BusAction> = {
  KeyF: 'doors', KeyH: 'horn', KeyV: 'camera', KeyR: 'reset', Digit1: 'leg1', Digit2: 'leg2', Digit3: 'leg3',
  KeyL: 'lights', KeyK: 'highBeam', KeyQ: 'indicatorLeft', KeyE: 'indicatorRight', KeyX: 'hazard',
  Backquote: 'language', Tab: 'details',
};

interface TouchState { steer: number; gas: number; brake: number; }

const GAS_RAMP_S = 0.6;
const BRAKE_RAMP_S = 1.2;

export class Input {
  private keys = new Set<string>();
  private touch: TouchState = { steer: 0, gas: 0, brake: 0 };
  private listeners: Array<(a: BusAction) => void> = [];

  constructor() {
    addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      const action = ACTION_KEYS[e.code];
      if (action) this.emit(action);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  onAction(fn: (a: BusAction) => void): void { this.listeners.push(fn); }
  emit(a: BusAction): void { this.listeners.forEach(fn => fn(a)); }

  setTouch(part: Partial<TouchState>): void { Object.assign(this.touch, part); }

  // Keyboard and touch pedals are on/off, so they ramp up while held: a tap brakes gently and a
  // long hold brakes hard. Without this every keyboard brake would be a Jerky Moment (full brake
  // is 5 m/s², the comfort limit 1.8 m/s²). Gamepad triggers are analog and pass straight through.
  private gasPedal = 0;
  private brakePedal = 0;
  private lastRead = performance.now();

  read(): BusInput {
    const now = performance.now(), dt = Math.min(0.1, (now - this.lastRead) / 1000);
    this.lastRead = now;
    const k = (...codes: string[]) => (codes.some(c => this.keys.has(c)) ? 1 : 0);
    const gasHeld = Math.max(k('KeyW', 'ArrowUp'), this.touch.gas);
    const brakeHeld = Math.max(k('KeyS', 'ArrowDown'), this.touch.brake);
    this.gasPedal = gasHeld ? Math.min(1, this.gasPedal + dt / GAS_RAMP_S) : 0;
    this.brakePedal = brakeHeld ? Math.min(1, this.brakePedal + dt / BRAKE_RAMP_S) : 0;
    let gas = this.gasPedal, brake = this.brakePedal;
    let steer = k('KeyA', 'ArrowLeft') - k('KeyD', 'ArrowRight');
    const gp = navigator.getGamepads?.().find(Boolean);
    if (gp) {
      const ax = gp.axes[0] ?? 0;
      if (Math.abs(ax) > 0.12) steer = -ax;
      gas = Math.max(gas, gp.buttons[7]?.value ?? 0);
      brake = Math.max(brake, gp.buttons[6]?.value ?? 0);
    }
    if (this.touch.steer) steer = this.touch.steer;
    return { gas, brake, steer };
  }
}
