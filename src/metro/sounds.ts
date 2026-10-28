// Metro sounds (SPEC §20), synthesised: the traction inverters' whine rising with speed as on a real
// metro, rolling rumble, brake hiss and the squeal of the last metres, and the door chimes.
import { audio } from '../audio/audio';
import type { Train } from './Train';

export class TrainSounds {
  private inverter = audio.drone('sawtooth');
  private harmonic = audio.drone('square');
  private rumble = audio.noise('lowpass', 260);
  private hiss = audio.noise('highpass', 3200);
  private squeal = audio.drone('sine');

  constructor(private train: Train) {}

  update(inCab: boolean): void {
    const tr = this.train, v = tr.v, a = tr.accel;
    const near = inCab ? 1 : 0.6;
    // Inverters: a whine that climbs with speed while power or the electric brake is working.
    const working = Math.min(1, Math.abs(a) / 0.6) * (v > 0.2 ? 1 : 0);
    const f = 180 + v * 42;
    this.inverter.set(f, 0.05 * working * near);
    this.harmonic.set(f * 1.5, 0.018 * working * near);
    this.rumble.set(Math.min(0.22, 0.02 + v / 120) * (v > 0.1 ? 1 : 0) * near);
    // Friction brakes take over at low speed: a hiss, and a faint squeal in the last few metres.
    this.hiss.set(a < -0.1 && v > 0.3 ? 0.03 * near : 0);
    this.squeal.set(2100, a < -0.2 && v > 0.15 && v < 2.2 ? 0.025 * near : 0);
  }

  /** The door chime: rising before opening, falling before closing. */
  doors(opening: boolean): void { audio.chime(opening ? [660, 880] : [880, 660, 523]); }
}
