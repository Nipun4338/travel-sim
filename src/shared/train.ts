// Line 6 train dimensions shared by the bake (platform screen door openings) and Metro Mode (the
// train's doors), so the doors line up exactly when the train stops on the mark (SPEC §20).
export const CAR_M = 19.8;
export const CAR_GAP_M = 0.25;
export const CARS = 6;
export const TRAIN_M = CARS * CAR_M + (CARS - 1) * CAR_GAP_M;
/** Door centres along a car from its middle (m); the same for every car, either way round. */
export const DOOR_X = [-7.4, -2.5, 2.5, 7.4];
export const DOOR_W = 1.3;
/** Train floor height above the rail top: the platform is level with it. */
export const FLOOR_M = 1.15;
/** Rail centre to platform edge (m): half the car width plus a small gap. */
export const PLATFORM_EDGE_M = 1.6;

/** Every door's distance behind the train's front (m), car by car. */
export function doorOffsets(): number[] {
  const out: number[] = [];
  for (let i = 0; i < CARS; i++) for (const x of DOOR_X) out.push(CAR_M / 2 + i * (CAR_M + CAR_GAP_M) - x);
  return out;
}
