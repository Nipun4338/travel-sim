// Data contract between the flight bake (scripts/bake/flight.ts) and Flight Mode (src/flight).
// Coordinates are local metres from the zone origin: +x east, +z south, +y up.

export const ZONE_CHUNK = 2000;

export interface Runway {
  /** Runway end names, e.g. ['14', '32']: ends[0] is the threshold at `a`, ends[1] at `b`. */
  ends: [string, string];
  a: { x: number; z: number };
  b: { x: number; z: number };
  width: number;
  y: number;
}

/**
 * Buildings are stored per chunk as boxes, 7 × uint16 each, largest footprint first so a far chunk
 * can draw just the first N: x and z (1/32 m from the chunk corner), width and depth (0.1 m),
 * height (0.1 m), rotation (0..65535 = 0..π) and colour (RGB 565).
 */
export const BUILDING_STRIDE = 7;

export interface ZoneChunk {
  id: string;          // "cx_cz"
  cx: number;
  cz: number;
  lods: string[];      // GLB file names: LOD 0 (near), LOD 1 (mid)
  buildings?: string;  // .bin file name
  buildingCount: number;
}

export interface Spawn {
  x: number;
  z: number;
  y?: number;          // absent: on the ground
  headingDeg: number;
  kmh: number;
  pitchDeg?: number;
  throttle?: number;
}

export interface Ring { x: number; y: number; z: number; headingDeg: number; }

export interface ChallengeData {
  id: string;
  kind: 'takeoff' | 'landing' | 'course';
  spawn: Spawn;
  rings: Ring[];
  climbToAgl?: number;
  ceilingM?: number;
  landOn?: string;
  parS: number;
  feeTk: number;
}

export interface Landmark { name: string; x: number; z: number; radiusM: number; }

export interface ZoneManifest {
  zone: string;
  version: string;
  origin: { lat: number; lon: number };
  halfM: number;
  chunkSize: number;
  backdrop: string;    // whole-zone low-detail GLB
  /** Ground height: uint16 grid, n × n points from (−halfM, −halfM), row by row along +z. */
  height: { file: string; gridM: number; n: number; min: number; step: number };
  chunks: ZoneChunk[];
  runways: Runway[];
  spawn: Spawn;
  challenges: ChallengeData[];
  landmarks: Landmark[];
  /** Simplified road centrelines for the map: flat [x0, z0, x1, z1, …] per road. */
  map: string;
  credits: string[];
}
