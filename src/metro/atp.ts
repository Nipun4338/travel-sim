// ATP, CBTC-style cab signalling (SPEC §20): the permitted speed comes from the civil limits and
// a braking curve to the end of movement authority (EoA). Over it by 3 km/h, a warning; by 6 km/h,
// a penalty brake until the train is back under; past the EoA, the emergency brake. The driver sees
// the permitted speed, the target speed and the distance to it on the cab display.
import type { Track } from './track';
import type { Train } from './Train';

const SUPERVISION_DECEL = 0.8;   // m/s²: the braking curve, with margin under the train's B7 (1.0)
const OVERLAP = 10;              // m past the stop mark before the EoA bites
const WARN_KMH = 3, PENALTY_KMH = 6, RELEASE_KMH = 1;
const PENALTY_STEP = 7;          // full service brake

export type AtpState = 'normal' | 'warning' | 'penalty' | 'emergency';

export class Atp {
  /** End of movement authority along the track (m): the next stop mark plus the overlap. */
  eoa: number;
  /** The furthest the train ahead lets us go (its tail less a safety gap), or Infinity. */
  block = Infinity;
  permittedKmh = 0;
  /** What the train must slow to next and where: the EoA (0 km/h) or a lower speed limit ahead. */
  target = { kmh: 0, distM: 0 };
  state: AtpState = 'normal';
  /** Interventions so far (scored play fines them; M13e). */
  penalties = 0;
  emergencies = 0;
  onWarning: (on: boolean) => void = () => {};
  onIntervention: (kind: 'penalty' | 'emergency') => void = () => {};

  constructor(private track: Track, private train: Train, stopS: number) { this.eoa = stopS + OVERLAP; }

  /** Moves the authority on to the next stop mark (the train has been dispatched). */
  authorise(stopS: number): void { this.eoa = stopS + OVERLAP; }

  /** Speed (m/s) allowed now at the front so the train can still meet `vEnd` (m/s) `dist` m ahead. */
  private curve(vEnd: number, dist: number): number { return Math.sqrt(vEnd * vEnd + 2 * SUPERVISION_DECEL * Math.max(0, dist)); }

  update(): void {
    const tr = this.train, s = tr.s;
    // Civil limit now: the lowest limit anywhere under the train (it holds until the rear clears it).
    let civil = 100;
    for (const [a, b, v] of this.track.data.limits) if (b >= s - tr.lengthM && a <= s) civil = Math.min(civil, v);
    // Targets ahead: each lower speed limit within 1.5 km, and the stop at the EoA. The one whose
    // braking curve allows the least speed now is what the driver is shown and supervised against.
    const toEoa = Math.min(this.eoa, this.block) - s;
    const targets: Array<{ kmh: number; distM: number }> = [{ kmh: 0, distM: toEoa - OVERLAP }];
    for (const [a, , v] of this.track.data.limits) if (a > s && a - s < 1500 && v < civil) targets.push({ kmh: v, distM: a - s });
    let permitted = civil / 3.6, target = { kmh: civil, distM: 0 };
    for (const tg of targets) {
      const p = this.curve(tg.kmh / 3.6, tg.distM + (tg.kmh === 0 ? OVERLAP / 2 : 0));
      if (p < permitted) { permitted = p; target = { kmh: tg.kmh, distM: Math.max(0, tg.distM) }; }
    }
    this.permittedKmh = Math.max(0, permitted * 3.6);
    this.target = target;

    // Supervision.
    const over = tr.kmh - this.permittedKmh;
    // Intervene on where the speed will be once the brakes have built up (~1.5 s), not where it is.
    const overSoon = over + Math.max(0, tr.accel) * 1.5 * 3.6;
    const was = this.state;
    if (toEoa < 0 && !tr.stopped) {
      if (this.state !== 'emergency') { this.emergencies++; this.onIntervention('emergency'); }
      this.state = 'emergency';
      tr.setNotch(-8);
    } else if (this.state === 'emergency') {
      if (tr.stopped) this.state = 'normal';
    } else if (this.state === 'penalty') {
      // The penalty brake holds until the driver has taken power off and the train is back under.
      if (over <= -RELEASE_KMH && tr.notch <= 0) { this.state = 'normal'; tr.penalty = 0; }
    } else if (overSoon > PENALTY_KMH) {
      this.state = 'penalty';
      tr.penalty = PENALTY_STEP;
      this.penalties++;
      this.onIntervention('penalty');
    } else this.state = overSoon > WARN_KMH ? 'warning' : 'normal';
    const warn = this.state === 'warning' || this.state === 'penalty';
    if (warn !== (was === 'warning' || was === 'penalty')) this.onWarning(warn);
  }
}
