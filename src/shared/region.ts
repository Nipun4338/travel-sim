// Data contract between the bake script (scripts/bake) and the game (src/world/region.ts).
// Coordinates are local metres from the Region origin: +x east, +z south, +y up.

export const CHUNK_SIZE = 1000;
export const LOD_COUNT = 3;

/** Mesh layers inside a chunk GLB. Colliders are built from the COLLIDER_LAYERS of LOD 0. */
export type ChunkLayer = 'terrain' | 'road' | 'building' | 'deck' | 'pillar' | 'water';
export const COLLIDER_LAYERS: ReadonlyArray<ChunkLayer> = ['terrain', 'road', 'building', 'pillar'];

export interface ChunkEntry {
  id: string;          // "cx_cz"
  cx: number;
  cz: number;
  lods: string[];      // file names, LOD 0 (full) .. 2 (far)
  bytes: number[];
}

export interface RegionManifest {
  region: string;
  version: string;     // content hash of everything below
  origin: { lat: number; lon: number };
  chunkSize: number;
  chunks: ChunkEntry[];
  route: string;       // file name of RouteData
  lanes: string;       // file name of LaneData
  credits: string[];
}

export interface RouteStop {
  name: string;
  osmNode?: number;
  index: number;       // index into RouteData.points
  km: number;
  x: number;
  z: number;
}

export interface RouteData {
  name: string;
  points: [number, number, number][]; // graded ground-level path, x y z
  cumKm: number[];
  stops: RouteStop[];
  legs: { from: string; to: string }[];
}

export interface LaneWay {
  id: number;
  highway: string;
  lanes: number;
  oneway: boolean;
  elevated: boolean;
  nodes: number[];
  points: [number, number, number][];
}

export interface LaneData { ways: LaneWay[]; }
