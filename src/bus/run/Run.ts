// One Bus Mode Run over a Leg (SPEC §6). Pure game logic: no Three.js or Rapier, so it can be
// driven by the game loop or by a headless test.
import {
  ACCIDENT_KMH, ALIGHT_S, BOARD_S, DWELL_ALLOWANCE_S, MISSED_PAST_M, OFF_ROAD_FAIL_S, ON_TIME_WINDOW_S, SEATS,
  STANDING, STOP_BUSYNESS, STOPPED_KMH, STOP_LATERAL_M, STOP_ZONE_M, TK, collisionFineTk, fareTk, stars,
} from '../../config/scoring';
import type { RouteData } from '../../shared/region';

export interface Passenger { dest: number; seated: boolean; }

export interface RunStop {
  name: string;
  index: number;          // Route point index
  km: number;
  scheduled: number;      // Timetable arrival, s from Run start
  waiting: number[];      // destination Stop numbers of waiting passengers
  arrivedAt?: number;
  departedAt?: number;
  served: boolean;
  missed: boolean;
  onTime?: boolean;
  leftEarly?: boolean;
}

export type LedgerKind = 'fare' | 'onTime' | 'late' | 'early' | 'missed' | 'leftBehind' | 'jerky' | 'collision';
export interface LedgerEntry { kind: LedgerKind; tk: number; label: string; }

export type RunEvent =
  | { type: 'arrived'; stop: string; lateS: number }
  | { type: 'served'; stop: string; boarded: number; alighted: number }
  | { type: 'departed'; stop: string; earlyS: number }
  | { type: 'missed'; stop: string }
  | { type: 'leftBehind'; stop: string; count: number }
  | { type: 'complaint'; standing: number }
  | { type: 'collision'; impactKmh: number; tk: number }
  | { type: 'finished' }
  | { type: 'failed'; reason: string };

export interface BusSample {
  routeIndex: number;     // nearest Route point
  lateralM: number;       // distance from the Route centreline
  kmh: number;
  doorsOpen: boolean;
  onRoad: boolean;
}

export interface RunResult {
  status: 'finished' | 'failed';
  reason?: string;
  takaEarned: number;
  ledger: LedgerEntry[];
  stars: { punctuality: number; comfort: number; safety: number };
  km: number;
  seconds: number;
  passengersCarried: number;
  jerkyMoments: number;
}

/** Deterministic PRNG so a Leg's waiting passengers are the same every Run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Run {
  readonly stops: RunStop[];
  readonly onboard: Passenger[] = [];
  readonly ledger: LedgerEntry[] = [];
  time = 0;
  status: 'running' | 'finished' | 'failed' = 'running';
  failReason = '';
  jerkyMoments = 0;
  passengersCarried = 0;
  private current = 0;          // next Stop to serve
  private dwellTimer = 0;
  private offRoadTime = 0;
  private atStop = -1;          // Stop the bus is stopped at with doors open, or -1
  private readonly kmStart: number;

  constructor(private route: RouteData, fromStop: string, toStop: string, targetKmh: number, seed = 1) {
    const i0 = route.stops.findIndex(s => s.name === fromStop), i1 = route.stops.findIndex(s => s.name === toStop);
    if (i0 < 0 || i1 <= i0) throw new Error(`Bad Leg ${fromStop} → ${toStop}`);
    const legStops = route.stops.slice(i0, i1 + 1);
    this.kmStart = legStops[0].km;
    const rnd = mulberry32(seed * 7919 + i0);
    this.stops = legStops.map((s, n) => {
      const busy = STOP_BUSYNESS[s.name] ?? 0.5;
      const count = n === legStops.length - 1 ? 0 : Math.round(busy * (8 + rnd() * 14));
      const waiting = Array.from({ length: count }, () => n + 1 + Math.floor(rnd() * (legStops.length - 1 - n)));
      return {
        name: s.name, index: s.index, km: s.km,
        scheduled: n * DWELL_ALLOWANCE_S + ((s.km - this.kmStart) / targetKmh) * 3600,
        waiting, served: false, missed: false,
      };
    });
  }

  get nextStop(): RunStop | undefined { return this.stops[this.current]; }
  get takaEarned(): number { return this.ledger.reduce((s, e) => s + e.tk, 0); }
  get standing(): number { return this.onboard.filter(p => !p.seated).length; }
  get capacity(): number { return SEATS + STANDING; }

  private add(kind: LedgerKind, tk: number, label: string) { if (tk !== 0) this.ledger.push({ kind, tk, label }); }

  update(dt: number, bus: BusSample): RunEvent[] {
    if (this.status !== 'running') return [];
    const ev: RunEvent[] = [];
    this.time += dt;

    // Leaving the road fails the Run (SPEC §6).
    this.offRoadTime = bus.onRoad ? 0 : this.offRoadTime + dt;
    if (this.offRoadTime > OFF_ROAD_FAIL_S) return this.fail('The bus left the road', ev);

    const stop = this.nextStop;
    if (!stop) return ev;
    const km = this.route.cumKm;
    const alongM = (km[bus.routeIndex] - km[stop.index]) * 1000;
    const inZone = Math.abs(alongM) <= STOP_ZONE_M && bus.lateralM <= STOP_LATERAL_M;
    const stopped = Math.abs(bus.kmh) < STOPPED_KMH;

    if (inZone && stopped && stop.arrivedAt === undefined) {
      stop.arrivedAt = this.time;
      const lateS = this.time - stop.scheduled;
      stop.onTime = this.current === 0 || Math.abs(lateS) <= ON_TIME_WINDOW_S || lateS < 0; // arriving early is fine
      if (this.current > 0) {
        if (stop.onTime) this.add('onTime', TK.onTimeBonus, `On time at ${stop.name}`);
        else this.add('late', -Math.round((lateS - ON_TIME_WINDOW_S) * TK.latePerS), `Late at ${stop.name} (${Math.round(lateS)} s)`);
      }
      ev.push({ type: 'arrived', stop: stop.name, lateS });
    }

    // Boarding and alighting while stopped in the zone with the doors open.
    if (inZone && stopped && bus.doorsOpen) {
      this.atStop = this.current;
      this.dwellTimer += dt;
      this.exchange(stop, ev);
    }

    // Doors closed and moving off: the Stop is done.
    if (this.atStop === this.current && !bus.doorsOpen && !stopped) {
      stop.served = true;
      stop.departedAt = this.time;
      this.atStop = -1;
      if (stop.waiting.length) {
        this.add('leftBehind', -stop.waiting.length * TK.leftBehind, `${stop.waiting.length} left behind at ${stop.name}`);
        ev.push({ type: 'leftBehind', stop: stop.name, count: stop.waiting.length });
      }
      const earlyS = stop.scheduled + (this.current === 0 ? DWELL_ALLOWANCE_S : 0) - this.time - ON_TIME_WINDOW_S;
      stop.leftEarly = earlyS > 0;
      if (earlyS > 0) this.add('early', -Math.round(earlyS * TK.earlyPerS), `Left ${stop.name} early (${Math.round(earlyS)} s)`);
      ev.push({ type: 'departed', stop: stop.name, earlyS: Math.max(0, earlyS) });
      this.current++;
    }

    // Driving past without serving.
    if (!stop.served && alongM > STOP_ZONE_M + MISSED_PAST_M && this.atStop !== this.current) {
      stop.missed = true;
      this.add('missed', -TK.missedStop, `Missed ${stop.name}`);
      ev.push({ type: 'missed', stop: stop.name });
      this.current++;
    }

    // The last Stop ends the Run once everyone is off.
    const last = this.stops.length - 1;
    if (this.current === last && this.atStop === last && this.onboard.length === 0) {
      this.stops[last].served = true;
      this.status = 'finished';
      ev.push({ type: 'finished' });
    } else if (this.current > last) {
      this.status = 'finished';
      ev.push({ type: 'finished' });
    }
    return ev;
  }

  /** Passengers get off first, then board, one at a time. */
  private exchange(stop: RunStop, ev: RunEvent[]) {
    const here = this.current;
    let alighted = 0, boarded = 0;
    while (this.dwellTimer > 0) {
      const off = this.onboard.findIndex(p => p.dest <= here); // includes riders for a missed Stop
      if (off >= 0) {
        if (this.dwellTimer < ALIGHT_S) break;
        this.dwellTimer -= ALIGHT_S;
        const [p] = this.onboard.splice(off, 1);
        if (p.seated) { const s = this.onboard.find(q => !q.seated); if (s) s.seated = true; }
        alighted++;
        continue;
      }
      if (stop.waiting.length && this.onboard.length < this.capacity) {
        if (this.dwellTimer < BOARD_S) break;
        this.dwellTimer -= BOARD_S;
        const dest = stop.waiting.shift()!;
        const seated = this.onboard.filter(p => p.seated).length < SEATS;
        this.onboard.push({ dest, seated });
        const km = this.stops[dest].km - stop.km;
        this.add('fare', fareTk(km), `Fare ${stop.name} → ${this.stops[dest].name}`);
        this.passengersCarried++;
        boarded++;
        continue;
      }
      this.dwellTimer = 0;
    }
    if (alighted || boarded) ev.push({ type: 'served', stop: stop.name, boarded, alighted });
  }

  jerky(): RunEvent[] {
    if (this.status !== 'running') return [];
    this.jerkyMoments++;
    const n = this.standing;
    if (n) this.add('jerky', -n * TK.jerkyPerStanding, `Rough driving (${n} standing)`);
    return [{ type: 'complaint', standing: n }];
  }

  collision(impactKmh: number): RunEvent[] {
    if (this.status !== 'running') return [];
    const tk = collisionFineTk(impactKmh);
    this.add('collision', -tk, `Collision at ${Math.round(impactKmh)} km/h`);
    const ev: RunEvent[] = [{ type: 'collision', impactKmh, tk }];
    if (impactKmh > ACCIDENT_KMH) return this.fail(`Accident at ${Math.round(impactKmh)} km/h`, ev);
    return ev;
  }

  private fail(reason: string, ev: RunEvent[]): RunEvent[] {
    this.status = 'failed';
    this.failReason = reason;
    ev.push({ type: 'failed', reason });
    return ev;
  }

  result(): RunResult {
    const arrivals = this.stops.slice(1).filter(s => s.arrivedAt !== undefined || s.missed);
    const onTime = arrivals.filter(s => s.onTime && !s.leftEarly).length;
    const legKm = this.stops[this.stops.length - 1].km - this.kmStart;
    const collisionTk = -this.ledger.filter(e => e.kind === 'collision').reduce((s, e) => s + e.tk, 0);
    return {
      status: this.status === 'failed' ? 'failed' : 'finished',
      reason: this.failReason || undefined,
      takaEarned: this.takaEarned,
      ledger: this.ledger,
      stars: {
        punctuality: stars.punctuality(arrivals.length ? onTime / arrivals.length : 0),
        comfort: stars.comfort(this.jerkyMoments / Math.max(0.1, legKm)),
        safety: stars.safety(collisionTk),
      },
      km: legKm,
      seconds: this.time,
      passengersCarried: this.passengersCarried,
      jerkyMoments: this.jerkyMoments,
    };
  }
}
