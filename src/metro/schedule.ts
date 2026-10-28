// The timetable (SPEC §20, M13e): a reference run by a careful driver over the whole track, worked
// out once at start-up with the same train and ATP the player drives. Due times add 6% slack and a
// 30 s dwell per station; the other trains on the line run to the same profile.
import type { LineStop } from '../shared/region';
import { Atp } from './atp';
import type { Track } from './track';
import { Train } from './Train';

export const DWELL_S = 30;
export const HEADWAY_S = 480;     // Line 6 runs every 8–10 minutes for most of the day
const SLACK = 1.06;

export interface Profile {
  /** Track position every second from the first station's departure (dwells included). */
  s: Float32Array;
  /** Arrival (stopped on the mark) and departure times at each stop, s from the start. */
  arrive: number[];
  depart: number[];
}

/** Drives the whole track as a careful driver would: up to just under the permitted speed, then a firm, even brake to the mark. */
export function referenceProfile(track: Track, stops: LineStop[], lengthM: number): Profile {
  const train = new Train(track, stops[0].stopS, lengthM);
  const atp = new Atp(track, train, stops[0].stopS);
  const samples: number[] = [], arrive = [0], depart = [DWELL_S];
  const dt = 1 / 20;
  let t = 0, nextSample = 0;
  const record = (until: number) => { while (nextSample <= until) { samples.push(train.s); nextSample += 1; } };
  t = DWELL_S; record(t);
  for (let k = 1; k < stops.length; k++) {
    const stop = stops[k].stopS;
    atp.authorise(stop);
    for (let guard = 0; guard < 20 * 900; guard++) {
      atp.update();
      const d = stop - train.s, v = train.v, need = d > 0.5 ? (v * v) / (2 * d) : 2;
      let n: number;
      if (need > 0.55 || d < 3) n = -Math.min(7, Math.max(1, Math.ceil(need / (1 / 7) + 0.5)));
      else { const want = Math.min(atp.permittedKmh - 3, 95); n = train.kmh < want - 4 ? 4 : train.kmh < want - 1 ? 2 : train.kmh > want + 1 ? -2 : 0; }
      train.setNotch(n);
      train.update(dt);
      t += dt;
      record(t);
      if (train.stopped && d < 2 && t > depart[k - 1] + 5) break;
    }
    train.setNotch(-7);
    arrive.push(t);
    t += DWELL_S;
    record(t);
    depart.push(t);
  }
  // Due times: the reference run's legs between stations with 6% slack, plus the dwells.
  const dueArrive = [0], dueDepart = [DWELL_S];
  for (let k = 1; k < stops.length; k++) {
    dueArrive.push(dueDepart[k - 1] + (arrive[k] - depart[k - 1]) * SLACK);
    dueDepart.push(dueArrive[k] + DWELL_S);
  }
  return { s: Float32Array.from(samples), arrive: dueArrive, depart: dueDepart };
}

/** Where a train running to `p` is `t` seconds after its first departure's start (clamped). */
export function profileAt(p: Profile, t: number): { s: number; v: number } {
  const n = p.s.length - 1, i = Math.max(0, Math.min(n - 1, Math.floor(t))), f = Math.max(0, Math.min(1, t - i));
  return { s: p.s[i] + (p.s[i + 1] - p.s[i]) * f, v: p.s[i + 1] - p.s[i] };
}
