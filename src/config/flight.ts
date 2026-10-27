// Flight Mode tuning (SPEC §8): the Arcade-plus preset validated in the flight prototype.

export const FLIGHT = {
  thrust: 4,            // m/s² at full throttle
  topKmh: 330,          // quadratic drag reaches this
  stallKmh: 100,
  stallNoseDrop: 35,    // °/s × lost lift
  stallSink: 22,        // m/s when fully stalled
  liftOffPitchDeg: 3,
  pitchRate: 50,        // °/s
  rollRate: 110,
  yawRate: 20,
  response: 5,
  wingLevelling: 0.6,   // × bank, with no roll input
  coordination: 1,
  gravityShare: 0.6,
  nosewheelRate: 25,    // °/s
  rollingDrag: 0.25,    // m/s²
  roughDrag: 1.5,       // extra, off the runway
  brakes: 3.5,
  crashSink: 4,         // m/s at touchdown
  crashBankDeg: 15,
  crashPitchDeg: -6,
  offFieldKmh: 160,
};

export const GEAR_HEIGHT = 1.4;   // pivot above the wheels' contact point

/** Landing grade by sink rate (m/s). */
export const LANDING_GRADES: ReadonlyArray<[number, 'butter' | 'good' | 'firm']> = [[1, 'butter'], [2, 'good'], [4, 'firm']];
export const TOUCHDOWN_ZONE_M = 600;
export const CENTRELINE_3STAR_M = 5;

export const RING_RADIUS = 30;
export const OUTSIDE_ZONE_FAIL_S = 10;

/** Taka (scored mode only): per Ring, per missed Ring, landing bonus by grade, par-time bonus. */
export const FLIGHT_TK = { ring: 40, missedRing: 60, landing: { butter: 300, good: 200, firm: 80 }, parBonus: 200 };
