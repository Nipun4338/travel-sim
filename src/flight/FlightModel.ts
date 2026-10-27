// The Arcade-plus kinematic flight model (SPEC §8), ported from the validated prototype
// (prototypes/flight-model). Not a physics engine: speed along the nose, lift as a 0..1 factor, and
// ground contact against the zone's height field. Plane frame: forward −z, up +y, right +x.
import * as THREE from 'three';
import { FLIGHT, GEAR_HEIGHT } from '../config/flight';
import type { Runway } from '../shared/zone';

export interface FlightGround {
  height(x: number, z: number): number;
  runways: Runway[];
  /** True if (x, y, z) is inside a building. */
  solidAt?(x: number, y: number, z: number): boolean;
}

export interface FlightInput {
  pitch: number;     // +1 nose up
  roll: number;      // +1 roll right
  yaw: number;       // +1 yaw right
  throttle: number;  // −1..1: rate of change
  brake: number;     // 0..1
}

export interface Touchdown {
  sinkMs: number;
  /** On a runway: which end you landed towards, metres past its threshold, and metres off the centreline. */
  runway?: { end: string; pastThresholdM: number; offCentreM: number };
}

export type FlightEvent =
  | { type: 'airborne' }
  | { type: 'landed'; touchdown: Touchdown }
  | { type: 'crash'; reason: 'sink' | 'attitude' | 'terrain' | 'building' | 'rough' };

const D2R = Math.PI / 180;
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

/** Where a point sits relative to a runway: along from end `a`, and across from the centreline. */
export function runwayFrame(r: Runway, x: number, z: number): { along: number; across: number; length: number } {
  const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, length = Math.hypot(dx, dz);
  const ux = dx / length, uz = dz / length;
  const px = x - r.a.x, pz = z - r.a.z;
  return { along: px * ux + pz * uz, across: px * -uz + pz * ux, length };
}

export class FlightModel {
  readonly pos = new THREE.Vector3();
  readonly q = new THREE.Quaternion();
  readonly vel = new THREE.Vector3();
  speed = 0;
  throttle = 0;
  onGround = true;
  crashed = false;
  stallWarning = false;
  /** Monsoon rain: light turbulence (SPEC §8), 0..1. */
  turbulence = 0;
  private gust = { v: 0, r: 0, t: 0 };
  private sink = 0;
  private rates = { p: 0, r: 0, y: 0 };
  private tmpQ = new THREE.Quaternion();
  private fwd = new THREE.Vector3();
  private up = new THREE.Vector3();
  private right = new THREE.Vector3();
  private euler = new THREE.Euler();

  constructor(private ground: FlightGround) {}

  /** On the ground at (x, z), facing `headingDeg` (0 = north, 90 = east), stopped. */
  placeOnGround(x: number, z: number, headingDeg: number): void {
    this.reset();
    this.pos.set(x, this.ground.height(x, z) + GEAR_HEIGHT, z);
    this.q.setFromEuler(new THREE.Euler(0, -headingDeg * D2R, 0, 'YXZ'));
    this.onGround = true;
  }

  /** In the air at (x, y, z), level, facing `headingDeg`, at `kmh`, nose `pitchDeg` up. */
  placeInAir(x: number, y: number, z: number, headingDeg: number, kmh: number, pitchDeg = 0, throttle = 0.6): void {
    this.reset();
    this.pos.set(x, y, z);
    this.q.setFromEuler(new THREE.Euler(pitchDeg * D2R, -headingDeg * D2R, 0, 'YXZ'));
    this.speed = kmh / 3.6;
    this.throttle = throttle;
    this.onGround = false;
  }

  private reset(): void {
    this.rates = { p: 0, r: 0, y: 0 };
    this.sink = 0;
    this.speed = 0;
    this.throttle = 0;
    this.crashed = false;
    this.vel.set(0, 0, 0);
  }

  get forward(): THREE.Vector3 { return this.fwd.set(0, 0, -1).applyQuaternion(this.q); }
  get kmh(): number { return this.speed * 3.6; }
  get pitchDeg(): number { return Math.asin(THREE.MathUtils.clamp(this.forward.y, -1, 1)) / D2R; }
  /** + = right wing down. */
  get bankDeg(): number {
    this.right.set(1, 0, 0).applyQuaternion(this.q);
    this.up.set(0, 1, 0).applyQuaternion(this.q);
    return (Math.asin(THREE.MathUtils.clamp(-this.right.y, -1, 1)) / D2R) * (this.up.y < 0 ? -1 : 1);
  }
  /** 0 = north, clockwise. */
  get headingDeg(): number { const f = this.forward; return (Math.atan2(f.x, -f.z) / D2R + 360) % 360; }
  get agl(): number { return this.pos.y - GEAR_HEIGHT - this.ground.height(this.pos.x, this.pos.z); }

  runwayUnder(x: number, z: number, margin = 6): Runway | undefined {
    return this.ground.runways.find(r => {
      const f = runwayFrame(r, x, z);
      return Math.abs(f.across) < r.width / 2 + margin && f.along > -20 && f.along < f.length + 20;
    });
  }

  step(dt: number, inp: FlightInput): FlightEvent[] {
    const events: FlightEvent[] = [];
    if (this.crashed) return events;
    const P = FLIGHT;
    this.throttle = THREE.MathUtils.clamp(this.throttle + inp.throttle * 0.5 * dt, 0, 1);
    const pitchDeg = this.pitchDeg, bankDeg = this.bankDeg;
    const sStall = P.stallKmh / 3.6, s = this.speed;

    // Lift: 1 = flying, 0 = fully stalled. Soft stall: fades out below 75% of stall speed.
    const lift = THREE.MathUtils.clamp((s - sStall * 0.75) / (sStall * 0.25), 0, 1);
    this.stallWarning = !this.onGround && s < sStall * 1.1;

    // Control rates (°/s), with less authority when slow.
    const auth = THREE.MathUtils.clamp(s / sStall, 0.25, 1);
    let tp = inp.pitch * P.pitchRate * auth, tr = -inp.roll * P.rollRate * auth, ty = -inp.yaw * P.yawRate;
    if (!this.onGround) {
      if (!inp.roll) tr += P.wingLevelling * bankDeg;
      tp -= (1 - lift) * P.stallNoseDrop;
    } else {
      tr = 0;
      ty = -(inp.yaw || inp.roll) * P.nosewheelRate * Math.min(1, s / 5);
      if (s < sStall * 1.1) tp = Math.min(tp, 0);
    }
    if (this.turbulence && !this.onGround) {
      // Bumps, not drift: a new gust every ~0.7 s rocks the wings (wing levelling recovers) and lifts
      // or drops the plane a little; neither builds up over time.
      if ((this.gust.t -= dt) <= 0) this.gust = { v: (Math.random() - 0.5) * 3 * this.turbulence, r: (Math.random() - 0.5) * 14 * this.turbulence, t: 0.4 + Math.random() * 0.6 };
      tr += this.gust.r;
    }
    const k = 1 - Math.exp(-P.response * dt);
    this.rates.p += (tp - this.rates.p) * k;
    this.rates.r += (tr - this.rates.r) * k;
    this.rates.y += (ty - this.rates.y) * k;
    this.q.multiply(this.tmpQ.setFromAxisAngle(AX, this.rates.p * D2R * dt));
    this.q.multiply(this.tmpQ.setFromAxisAngle(AZ, this.rates.r * D2R * dt));
    this.q.multiply(this.tmpQ.setFromAxisAngle(AY, this.rates.y * D2R * dt));
    if (!this.onGround) {
      // A banked plane turns.
      const yawW = (-P.coordination * 9.81 * Math.tan(THREE.MathUtils.clamp(bankDeg * D2R, -1.3, 1.3)) / Math.max(s, 15)) * dt;
      this.q.premultiply(this.tmpQ.setFromAxisAngle(AY, yawW));
    }
    this.q.normalize();

    // Speed: thrust, quadratic drag, and part of gravity in climbs and dives.
    const fwd = this.forward;
    const drag = P.thrust / (P.topKmh / 3.6) ** 2;
    let a = P.thrust * this.throttle - drag * s * s - 9.81 * fwd.y * P.gravityShare;
    if (this.onGround) {
      a -= P.rollingDrag + inp.brake * P.brakes;
      if (!this.runwayUnder(this.pos.x, this.pos.z)) a -= P.roughDrag;
    }
    this.speed = Math.max(0, this.speed + a * dt);

    // Velocity along the nose, plus sink as lift is lost.
    this.sink += ((1 - lift) * P.stallSink - this.sink) * (1 - Math.exp(-1.5 * dt));
    this.vel.copy(fwd).multiplyScalar(this.speed);
    if (!this.onGround) this.vel.y -= this.sink - (this.turbulence ? this.gust.v : 0);
    this.pos.addScaledVector(this.vel, dt);

    const g = this.ground.height(this.pos.x, this.pos.z);
    if (this.onGround) {
      // Wheels down: wings level, and no nose-up until rotation speed.
      const e = this.euler.setFromQuaternion(this.q, 'YXZ');
      e.z = 0;
      e.x = THREE.MathUtils.clamp(e.x, 0, s >= sStall * 1.1 ? 15 * D2R : 0);
      this.q.setFromEuler(e);
      this.pos.y = g + GEAR_HEIGHT;
      if (e.x > P.liftOffPitchDeg * D2R && s >= sStall * 1.1) { this.onGround = false; this.sink = 0; events.push({ type: 'airborne' }); }
      else if (!this.runwayUnder(this.pos.x, this.pos.z) && s > 30 / 3.6 && !this.flatAt(this.pos.x, this.pos.z)) this.crash('rough', events);
    } else if (this.pos.y - GEAR_HEIGHT <= g) {
      const vs = this.vel.y;
      const level = Math.abs(bankDeg) < P.crashBankDeg && pitchDeg > P.crashPitchDeg;
      const runway = this.runwayUnder(this.pos.x, this.pos.z);
      if (pitchDeg < -15 || vs < -10) this.crash('terrain', events);
      else if (!level) this.crash('attitude', events);
      else if (vs <= -P.crashSink) this.crash('sink', events);
      else if (!runway && !(this.flatAt(this.pos.x, this.pos.z) && this.speed < P.offFieldKmh / 3.6)) this.crash('terrain', events);
      else {
        this.onGround = true;
        this.pos.y = g + GEAR_HEIGHT;
        this.sink = 0;
        events.push({ type: 'landed', touchdown: { sinkMs: -vs, runway: runway && this.touchdownOn(runway) } });
      }
    }
    if (!this.crashed && this.ground.solidAt?.(this.pos.x, this.pos.y, this.pos.z)) this.crash('building', events);
    return events;
  }

  private touchdownOn(r: Runway): Touchdown['runway'] {
    const f = runwayFrame(r, this.pos.x, this.pos.z);
    const fwd = this.forward;
    // Landing towards b means you came over threshold a.
    const towardsB = fwd.x * (r.b.x - r.a.x) + fwd.z * (r.b.z - r.a.z) > 0;
    return {
      end: towardsB ? r.ends[0] : r.ends[1],
      pastThresholdM: towardsB ? f.along : f.length - f.along,
      offCentreM: Math.abs(f.across),
    };
  }

  private flatAt(x: number, z: number): boolean {
    const h = this.ground.height.bind(this.ground), g = h(x, z);
    return Math.abs(h(x + 20, z) - g) < 2 && Math.abs(h(x, z + 20) - g) < 2;
  }

  private crash(reason: Extract<FlightEvent, { type: 'crash' }>['reason'], events: FlightEvent[]): void {
    this.crashed = true;
    this.speed = 0;
    events.push({ type: 'crash', reason });
  }
}
