// Flight Mode sounds (SPEC §14): the propeller pitched by throttle, wind rising with airspeed, the
// stall horn (synthesised), a tyre chirp at touchdown, and rain on the windscreen.
import type { Conditions } from '../world/conditions';
import { audio, type Loop } from './audio';

export class PlaneSounds {
  private prop: Loop;
  private wind: Loop;
  private rain: Loop | null = null;
  private stall = audio.tone(1150, 'sawtooth', 0.12);

  constructor(c: Conditions) {
    audio.preload(['prop', 'wind', 'squeal']);
    this.prop = audio.loop('prop', 'sfx', 0.5);
    this.wind = audio.loop('wind', 'sfx', 0);
    if (c.weather === 'rain') this.rain = audio.loop('rain-window', 'sfx', 0.3);
  }

  touchdown(sinkMs: number): void { audio.play('squeal', { gain: Math.min(0.9, 0.25 + sinkMs * 0.2), rate: 1.1 }); }

  update(s: { throttle: number; kmh: number; stall: boolean; inCockpit: boolean; crashed: boolean }): void {
    const air = Math.min(1, s.kmh / 300);
    this.prop.setRate(0.75 + s.throttle * 0.55 + air * 0.1);
    this.prop.setGain(s.crashed ? 0 : (s.inCockpit ? 0.55 : 0.4) + s.throttle * 0.25);
    this.wind.setGain(s.crashed ? 0 : air * (s.inCockpit ? 0.35 : 0.6));
    this.wind.setRate(0.85 + air * 0.4);
    this.rain?.setGain(s.inCockpit ? 0.35 : 0.2);
    this.stall.set(s.stall && !s.crashed);
  }
}
