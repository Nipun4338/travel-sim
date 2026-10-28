// Metro gamepad controls (SPEC §20): the right stick is the master controller (up for power, centre
// coast, down for brake; it only takes over once moved, so the keyboard still works), B is the
// emergency brake, the bumpers open the left / right doors, A closes them, Y changes camera and the
// View/Back button the map.
import { NOTCH_MAX, type Train } from './Train';

export interface MetroPadActions { doors: (side: 'left' | 'right') => void; close: () => void; camera: () => void; map: () => void; }

const DEAD = 0.18;

export class MetroGamepad {
  private was: boolean[] = [];
  private stickActive = false;

  constructor(private train: Train, private a: MetroPadActions) {}

  /** Call once a frame. */
  poll(): void {
    const gp = navigator.getGamepads?.().find(Boolean);
    if (!gp) return;
    // Right stick Y (axis 3): −1 up = P4, 0 = N, +1 down = B7.
    const y = gp.axes[3] ?? 0;
    if (Math.abs(y) > DEAD) this.stickActive = true;
    if (this.stickActive && this.train.notch !== -8) {
      const n = Math.abs(y) <= DEAD ? 0 : y < 0 ? Math.round(((-y - DEAD) / (1 - DEAD)) * NOTCH_MAX) : -Math.round(((y - DEAD) / (1 - DEAD)) * 7);
      if (n !== this.train.notch) this.train.setNotch(n);
    }
    // Buttons on press (not while held).
    const pressed = (i: number) => { const now = !!gp.buttons[i]?.pressed, edge = now && !this.was[i]; this.was[i] = now; return edge; };
    if (pressed(1)) this.train.setNotch(-8);                 // B: emergency brake
    if (pressed(4)) this.a.doors('left');                    // LB
    if (pressed(5)) this.a.doors('right');                   // RB
    if (pressed(0)) this.a.close();                          // A
    if (pressed(3)) this.a.camera();                         // Y
    if (pressed(8)) this.a.map();                            // View / Back
    if (pressed(9)) dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));   // Menu / Start: pause
  }
}
