// A six-car Line 6 train (SPEC §20): one-dimensional along its track, driven by the master
// controller. Traction tapers above the base speed (constant power), service brake steps are
// linear, the emergency brake holds until the train stops, and the jerk is limited so notch
// changes don't snap. Gradient and running resistance act all the time.
import type { Track } from './track';

/** Master controller positions: P4..P1 = 4..1, N = 0, B1..B7 = -1..-7, EB = -8. */
export type Notch = number;
export const NOTCH_MAX = 4, NOTCH_MIN = -8;
export const notchLabel = (n: Notch) => (n > 0 ? `P${n}` : n === 0 ? 'N' : n === NOTCH_MIN ? 'EB' : `B${-n}`);

const MAX_TRACTION = 0.92;   // m/s² at full power from rest
const BASE_SPEED = 11.1;     // m/s (40 km/h): above it, traction falls off at constant power
const MAX_SERVICE = 1.0;     // m/s² at B7
const EMERGENCY = 1.25;      // m/s²
const JERK = 0.9;            // m/s³ limit on how fast the applied acceleration changes
const G = 9.81;

export class Train {
  s: number;               // front of the train along the track, m
  v = 0;                   // m/s, never negative (no reversing in service)
  notch: Notch = -7;       // starts held on the brake at the platform
  private applied = 0;     // the acceleration the train is actually making from traction or brakes
  emergency = false;       // EB latched until standstill
  /** Penalty brake from ATP (M13c): a forced service-brake level, or 0. */
  penalty = 0;
  odometer = 0;

  constructor(readonly track: Track, startS: number, readonly lengthM = 120) { this.s = startS; }

  get kmh(): number { return this.v * 3.6; }
  get stopped(): boolean { return this.v < 0.05; }

  setNotch(n: Notch): void {
    this.notch = Math.max(NOTCH_MIN, Math.min(NOTCH_MAX, Math.round(n)));
    if (this.notch === NOTCH_MIN) this.emergency = true;
  }

  /** The acceleration the controller (and any brake override) asks for, m/s². */
  private target(): number {
    if (this.emergency) return -EMERGENCY;
    const brake = Math.max(this.penalty, this.notch < 0 ? -this.notch : 0);
    if (brake > 0) return -(MAX_SERVICE * brake) / 7;
    if (this.notch > 0) {
      const full = MAX_TRACTION * (this.v > BASE_SPEED ? BASE_SPEED / this.v : 1);
      return (full * this.notch) / NOTCH_MAX;
    }
    return 0;
  }

  update(dt: number): void {
    const want = this.target();
    // The emergency brake bypasses the jerk limit's slow build-up a little: it bites twice as fast.
    const rate = (this.emergency ? 2 : 1) * JERK * dt;
    this.applied += Math.max(-rate, Math.min(rate, want - this.applied));
    // Running resistance (bearings, flanges, air) and gravity on the gradient.
    const resist = 0.012 + 0.0004 * this.v + 0.00011 * this.v * this.v;
    const slope = G * this.track.grade(this.s - this.lengthM / 2);
    let a = this.applied - resist - slope;
    if (this.v <= 0 && a < 0 && this.applied <= 0) a = 0;   // brakes and resistance only stop it
    this.v = Math.max(0, this.v + a * dt);
    const ds = this.v * dt;
    this.s = Math.min(this.track.length, this.s + ds);
    this.odometer += ds;
    if (this.emergency && this.stopped && this.notch !== NOTCH_MIN) this.emergency = false;
    if (this.stopped && this.applied < 0) this.applied = Math.max(this.applied, want);
  }

  /** The acceleration actually being felt along the train, for comfort and the cab display. */
  get accel(): number { return this.applied; }
}
