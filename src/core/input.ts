// Bus controls from keyboard, gamepad and touch (SPEC §12).

export interface BusInput {
  gas: number;    // 0..1
  brake: number;  // 0..1
  steer: number;  // -1..1, + = left
}

export type BusAction = 'doors' | 'horn' | 'camera' | 'reset' | 'placeCity' | 'placeHill';

const ACTION_KEYS: Record<string, BusAction> = {
  KeyF: 'doors', KeyH: 'horn', KeyV: 'camera', KeyR: 'reset', Digit1: 'placeCity', Digit2: 'placeHill',
};

interface TouchState { steer: number; gas: number; brake: number; }

export class Input {
  private keys = new Set<string>();
  private touch: TouchState = { steer: 0, gas: 0, brake: 0 };
  private listeners: Array<(a: BusAction) => void> = [];

  constructor() {
    addEventListener('keydown', e => {
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

  read(): BusInput {
    const k = (...codes: string[]) => (codes.some(c => this.keys.has(c)) ? 1 : 0);
    let gas = k('KeyW', 'ArrowUp');
    let brake = k('KeyS', 'ArrowDown');
    let steer = k('KeyA', 'ArrowLeft') - k('KeyD', 'ArrowRight');
    const gp = navigator.getGamepads?.().find(Boolean);
    if (gp) {
      const ax = gp.axes[0] ?? 0;
      if (Math.abs(ax) > 0.12) steer = -ax;
      gas = Math.max(gas, gp.buttons[7]?.value ?? 0);
      brake = Math.max(brake, gp.buttons[6]?.value ?? 0);
    }
    gas = Math.max(gas, this.touch.gas);
    brake = Math.max(brake, this.touch.brake);
    if (this.touch.steer) steer = this.touch.steer;
    return { gas, brake, steer };
  }
}
