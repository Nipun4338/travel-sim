// A Flight Challenge in progress (SPEC §8): Rings in order, the take-off climb, the landing grade, a
// course ceiling, par time and, in scored mode, Taka and stars. Missed Rings never stop a Challenge.
import { CENTRELINE_3STAR_M, FLIGHT_TK, LANDING_GRADES, RING_RADIUS, TOUCHDOWN_ZONE_M } from '../config/flight';
import type { ChallengeData } from '../shared/zone';
import type { Touchdown } from './FlightModel';

export type LandingGrade = 'butter' | 'good' | 'firm';

export interface Landing { grade: LandingGrade; sinkMs: number; offCentreM?: number; pastThresholdM?: number; onTarget: boolean; }

export interface ChallengeResult {
  id: string;
  kind: ChallengeData['kind'];
  timeS: number;
  parS: number;
  ringsHit: number;
  ringsMissed: number;
  rings: number;
  landing?: Landing;
  maxOffCentreM?: number;
  overCeilingS?: number;
  taka: number;
  stars: number;
}

export type ChallengeEvent = { type: 'ring'; hit: boolean; n: number; of: number } | { type: 'done'; result: ChallengeResult };

export const gradeFor = (sinkMs: number): LandingGrade => (LANDING_GRADES.find(([max]) => sinkMs < max)?.[1] ?? 'firm');

export class Challenge {
  time = 0;
  next = 0;
  hits: boolean[] = [];
  done = false;
  private lastSide: number | null = null;
  private maxOff = 0;
  private overCeiling = 0;
  private landing?: Landing;

  /** `conditionsMult`: Taka ×1.2 in rain or fog, ×1.1 at night, stacking (SPEC §8). */
  constructor(readonly data: ChallengeData, private scored: boolean, private conditionsMult = 1) {}

  get ring() { return this.data.rings[this.next]; }

  /** Call every step. `offCentreM` is the distance from the runway centreline while on it. */
  update(dt: number, s: { x: number; y: number; z: number; agl: number; onGround: boolean; kmh: number; offCentreM?: number }): ChallengeEvent[] {
    if (this.done) return [];
    const ev: ChallengeEvent[] = [];
    this.time += dt;
    const r = this.ring;
    if (r) {
      // Through the Ring's plane: a hit if within its radius, otherwise a miss; either way, on to the next.
      const a = (r.headingDeg * Math.PI) / 180, fx = Math.sin(a), fz = -Math.cos(a);
      const side = (s.x - r.x) * fx + (s.z - r.z) * fz;
      if (this.lastSide !== null && this.lastSide < 0 && side >= 0) {
        const lateral = Math.hypot((s.x - r.x) - side * fx, (s.z - r.z) - side * fz, s.y - r.y);
        const hit = lateral < RING_RADIUS;
        this.hits.push(hit);
        this.next++;
        this.lastSide = null;
        ev.push({ type: 'ring', hit, n: this.next, of: this.data.rings.length });
      } else this.lastSide = side;
    }
    if (this.data.kind === 'takeoff') {
      if (s.offCentreM !== undefined && (s.onGround || s.agl < 50)) this.maxOff = Math.max(this.maxOff, s.offCentreM);
      if (!s.onGround && s.agl >= (this.data.climbToAgl ?? 300)) ev.push(this.finish());
    }
    if (this.data.kind === 'course') {
      if (this.data.ceilingM && s.y > this.data.ceilingM) this.overCeiling += dt;
      if (!this.ring) ev.push(this.finish());
    }
    if (this.data.kind === 'landing' && this.landing && s.onGround && s.kmh < 30) ev.push(this.finish());
    return ev;
  }

  touchdown(td: Touchdown): void {
    if (this.data.kind !== 'landing' || this.landing) return;
    const rw = td.runway;
    const onTarget = !!rw && rw.end === this.data.landOn;
    this.landing = {
      grade: gradeFor(td.sinkMs), sinkMs: td.sinkMs, onTarget,
      offCentreM: onTarget ? rw!.offCentreM : undefined, pastThresholdM: onTarget ? rw!.pastThresholdM : undefined,
    };
  }

  private finish(): ChallengeEvent {
    this.done = true;
    const rings = this.data.rings.length;
    // Rings never passed count as missed.
    while (this.hits.length < rings) this.hits.push(false);
    const ringsHit = this.hits.filter(Boolean).length, ringsMissed = rings - ringsHit;
    const l = this.landing;
    let quality: boolean;
    if (this.data.kind === 'landing') {
      quality = !!l?.onTarget && l.grade !== 'firm' && (l.offCentreM ?? 99) <= CENTRELINE_3STAR_M && (l.pastThresholdM ?? 9999) <= TOUCHDOWN_ZONE_M;
    } else if (this.data.kind === 'takeoff') quality = this.maxOff <= 10;
    else quality = this.overCeiling === 0 && this.time <= this.data.parS;
    const stars = 1 + (ringsMissed === 0 ? 1 : 0) + (quality ? 1 : 0);
    let taka = 0;
    if (this.scored) {
      taka = this.data.feeTk + ringsHit * FLIGHT_TK.ring - ringsMissed * FLIGHT_TK.missedRing;
      if (this.time <= this.data.parS) taka += FLIGHT_TK.parBonus;
      if (l?.onTarget) taka += FLIGHT_TK.landing[l.grade];
      taka = Math.max(0, Math.round(taka * this.conditionsMult));
    }
    return {
      type: 'done',
      result: {
        id: this.data.id, kind: this.data.kind, timeS: this.time, parS: this.data.parS, ringsHit, ringsMissed, rings, landing: l,
        maxOffCentreM: this.data.kind === 'takeoff' ? this.maxOff : undefined,
        overCeilingS: this.data.ceilingM ? this.overCeiling : undefined, taka, stars,
      },
    };
  }
}
