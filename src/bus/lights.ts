// Bus lights as a driver works them (realism over arcade): a headlight switch, high beam,
// self-cancelling indicators, hazards, and automatic brake and reversing lights.

export type Headlights = 'off' | 'parking' | 'low';
export type Indicator = 'left' | 'right' | null;

const BLINK_HZ = 1.5;              // ~90 flashes a minute, as on a real bus
const CANCEL_TURN_DEG = 12;        // steer at least this far in the signalled direction…
const CANCEL_CENTRE_DEG = 4;       // …then back near centre, and the indicator cancels itself

export class BusLights {
  headlights: Headlights = 'off';
  highBeam = false;
  indicator: Indicator = null;
  hazard = false;
  brake = false;
  reverse = false;
  private blinkT = 0;
  private turned = false;

  cycleHeadlights(): void {
    this.headlights = this.headlights === 'off' ? 'parking' : this.headlights === 'parking' ? 'low' : 'off';
    if (this.headlights !== 'low') this.highBeam = false;
  }

  /** High beam only works with the headlights on. */
  toggleHighBeam(): boolean {
    if (this.headlights !== 'low') return false;
    this.highBeam = !this.highBeam;
    return true;
  }

  signal(side: 'left' | 'right'): void {
    this.indicator = this.indicator === side ? null : side;
    this.turned = false;
    this.blinkT = 0;
  }

  toggleHazard(): void { this.hazard = !this.hazard; this.blinkT = 0; }

  /** `steerDeg`: + = left, as in Bus. */
  update(dt: number, s: { brake: number; speed: number; gear: string; steerDeg: number }): void {
    this.blinkT += dt;
    this.brake = s.brake > 0.05 || (Math.abs(s.speed) < 0.3 && s.gear === 'N');
    this.reverse = s.gear === 'R';
    if (this.indicator) {
      const toward = this.indicator === 'left' ? s.steerDeg : -s.steerDeg;
      if (toward > CANCEL_TURN_DEG) this.turned = true;
      else if (this.turned && Math.abs(s.steerDeg) < CANCEL_CENTRE_DEG) { this.indicator = null; this.turned = false; }
    }
  }

  /** Whether the flashing lamps are lit right now. */
  get blinkOn(): boolean { return (this.blinkT * BLINK_HZ) % 1 < 0.5; }
  get leftFlashing(): boolean { return (this.hazard || this.indicator === 'left') && this.blinkOn; }
  get rightFlashing(): boolean { return (this.hazard || this.indicator === 'right') && this.blinkOn; }
}
