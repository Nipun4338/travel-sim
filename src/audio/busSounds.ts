// Bus Mode sounds (SPEC §14): a two-band engine that rises with speed and throttle, the cab's
// rattle, air-brake hiss after a stop, doors, horn, traffic around you (honks, rickshaw bells, the
// police whistle at junctions), and per-Region ambience by time and weather.
import type { VehicleType } from '../traffic/models';
import type { Conditions } from '../world/conditions';
import { audio, type Loop } from './audio';

export interface BusSoundState {
  kmh: number;
  gas: number;
  brake: number;
  /** The junction ahead, if close: whether its phase stops the bus. */
  junctionStop?: boolean;
  trafficNear: boolean;
}

export class BusSounds {
  private idle: Loop;
  private drive: Loop;
  private cab: Loop;
  private ambience: Loop[] = [];
  private wasMoving = false;
  private nextHonk = 4;
  private nextExtra = 6;
  private lastJunction: boolean | undefined;

  constructor(private region: string, private c: Conditions) {
    audio.preload(['bus-engine-1', 'bus-engine-2', 'bus-ride', 'door', 'bus-horn', 'bell', 'whistle', 'air-hiss']);
    this.idle = audio.loop('bus-engine-1', 'sfx', 0.6);
    this.drive = audio.loop('bus-engine-2', 'sfx', 0);
    this.cab = audio.loop('bus-ride', 'sfx', 0.25);
    const night = c.time === 'night';
    if (region === 'dhaka') this.ambience.push(audio.loop('street', 'sfx', night ? 0.25 : 0.45));
    else {
      this.ambience.push(audio.loop(night ? 'crickets' : 'forest', 'sfx', 0.4));
      this.ambience.push(audio.loop('river', 'sfx', 0.12));
    }
    if (c.weather === 'rain') this.ambience.push(audio.loop('rain-city', 'sfx', 0.55));
  }

  doors(): void { audio.play('door', { gain: 0.8 }); }
  horn(): void { audio.play('bus-horn', { gain: 0.9 }); }

  /** Another vehicle honks (after a knock, or just because it's Dhaka). */
  honk(type: VehicleType): void {
    if (type === 'rickshaw') audio.play('bell', { gain: 0.5, rate: 0.95 + Math.random() * 0.1 });
    else if (type === 'bus' || type === 'truck') audio.play('bus-horn', { gain: 0.35, rate: 1.05 + Math.random() * 0.15 });
    else audio.beep(type === 'cng' ? 640 : type === 'motorbike' ? 820 : 470, type === 'motorbike' ? 3 : 2, 0.12);
  }

  update(dt: number, s: BusSoundState): void {
    // Engine: idle band always, driving band crossfades in; both pitch up with speed and throttle.
    const speed = Math.min(1, Math.abs(s.kmh) / 60), load = Math.max(s.gas, speed * 0.6);
    this.idle.setRate(0.85 + speed * 0.45 + s.gas * 0.15);
    this.idle.setGain(0.55 - load * 0.25);
    this.drive.setRate(0.8 + speed * 0.5 + s.gas * 0.2);
    this.drive.setGain(0.15 + load * 0.55);
    this.cab.setGain(0.1 + speed * 0.35);
    // Air brakes let out a hiss when the bus comes to a stop.
    const moving = Math.abs(s.kmh) > 3;
    if (this.wasMoving && Math.abs(s.kmh) < 0.8) { audio.play('air-hiss', { gain: 0.6 }); this.wasMoving = false; }
    if (moving) this.wasMoving = true;
    // Junction police: a whistle when the phase changes on the junction just ahead.
    if (s.junctionStop !== undefined && this.lastJunction !== undefined && s.junctionStop !== this.lastJunction) audio.play('whistle', { gain: 0.5 });
    this.lastJunction = s.junctionStop;
    // Traffic: Dhaka honks a lot; the hill road hardly at all.
    if (s.trafficNear && (this.nextHonk -= dt) <= 0) {
      const dhaka = this.region === 'dhaka';
      const types: VehicleType[] = dhaka ? ['cng', 'cng', 'car', 'motorbike', 'bus', 'rickshaw'] : ['jeep', 'motorbike', 'truck'];
      this.honk(types[Math.floor(Math.random() * types.length)]);
      this.nextHonk = dhaka ? 3 + Math.random() * 6 : 15 + Math.random() * 25;
    }
    // Now and then: crows over Dhaka by day.
    if (this.region === 'dhaka' && this.c.time !== 'night' && (this.nextExtra -= dt) <= 0) {
      audio.play('crows', { gain: 0.25 });
      this.nextExtra = 20 + Math.random() * 30;
    }
  }
}
