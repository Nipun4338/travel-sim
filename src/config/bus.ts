// Bus handling: the Arcade-plus preset validated in the bus prototype (SPEC §6).

export const BUS_MASS = 12000;
export const BUS_HALF_EXTENTS = { x: 5.5, y: 1.4, z: 1.25 }; // 11 × 2.8 × 2.5 m
export const BUS_INERTIA = { x: BUS_MASS * 1.17, y: BUS_MASS * 10.6, z: BUS_MASS * 10.7 };

// Wheel connection points in the chassis frame: +x forward, +y up, +z right.
// Front left, front right, rear left, rear right.
export const BUS_WHEELS: ReadonlyArray<[number, number, number]> = [
  [3.3, -1.0, -1.05], [3.3, -1.0, 1.05], [-2.7, -1.0, -1.05], [-2.7, -1.0, 1.05],
];
export const WHEEL_RADIUS = 0.52;
export const SUSPENSION_REST = 0.45;
export const SUSPENSION_TRAVEL = 0.4;

export interface BusHandling {
  engineForce: number;      // N per rear wheel
  topSpeedKmh: number;      // engine force tapers linearly to 0 here
  brakeDecel: number;       // m/s²
  maxSteerDeg: number;
  steerRateDeg: number;     // °/s; returns to centre 1.5× faster
  steerFadeKmh: number;     // limit = max / (1 + kmh / fade)
  stiffness: number;
  compression: number;
  relaxation: number;
  grip: number;             // Rapier friction slip
  comY: number;             // centre of mass offset from body centre, m
  antiRoll: number;
  angularDamping: number;
  reverseForceRatio: number;
  reverseTopKmh: number;
}

export const ARCADE_PLUS: BusHandling = {
  engineForce: 9000,
  topSpeedKmh: 80,
  brakeDecel: 5.0,
  maxSteerDeg: 38,
  steerRateDeg: 80,
  steerFadeKmh: 50,
  stiffness: 22,
  compression: 2.7,
  relaxation: 3.2,
  grip: 1.6,
  comY: -0.4,
  antiRoll: 3,
  angularDamping: 1.0,
  reverseForceRatio: 0.4,
  reverseTopKmh: 15,
};

export const RAIN_GRIP = 1.2;

// Comfort limits for a Jerky Moment (SPEC §6).
export const JERKY_LATERAL = 1.5;
export const JERKY_LONGITUDINAL = 1.8;
