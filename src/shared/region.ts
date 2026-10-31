// Data contract between the bake script (scripts/bake) and the game (src/world/region.ts).
// Coordinates are local metres from the Region origin: +x east, +z south, +y up.
import type { PlacedLandmark } from './landmarks';

export const CHUNK_SIZE = 1000;
export const LOD_COUNT = 3;

/** Mesh layers inside a chunk GLB. Colliders are built from the COLLIDER_LAYERS of LOD 0. */
export type ChunkLayer =
  | 'terrain' | 'road' | 'marking' | 'kerb' | 'building' | 'wall' | 'prop' | 'tree' | 'deck' | 'pillar' | 'water' | 'sign';
export const COLLIDER_LAYERS: ReadonlyArray<ChunkLayer> = ['terrain', 'road', 'building', 'wall', 'pillar', 'deck'];
/** Layers whose meshes carry TEXCOORD_0: walls (the window texture) and signs (the sign atlas). */
export const TEXTURED_LAYERS: ReadonlyArray<ChunkLayer> = ['wall', 'sign'];

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
  rails?: string;      // file name of RailData
  line?: string;       // file name of LineData (metro Regions)
  landmarks?: PlacedLandmark[];
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
  lanes: number;         // total across both directions
  width: number;         // carriageway width, m
  dir: 1 | -1 | 0;       // 1 = one-way in node order, -1 = one-way against it, 0 = two-way
  elevated: boolean;
  nodes: number[];       // OSM node ids
  nodeAt: number[];      // index into `points` of each node
  points: [number, number, number][]; // graded road surface, about every 10 m
}

export interface LaneData { ways: LaneWay[]; }

/** Railway lines for running trains (rail top height), and level crossings (SPEC §7, real OSM). */
export interface RailLine { kind: 'rail' | 'metro'; points: [number, number, number][]; }
export interface LevelCrossing { x: number; y: number; z: number; railHeadingDeg: number; roadHeadingDeg: number; roadWidth: number; }
export interface RailData { lines: RailLine[]; crossings: LevelCrossing[]; }

/**
 * A metro line for Metro Mode (SPEC §20): one track per direction as a 1-D line the train runs on.
 * Distances `s` are metres along that track from its start; heights are rail-top level.
 */
export interface LineStation { name: string; nameBn: string; x: number; z: number; }
export interface LineStop {
  station: number;       // index into LineData.stations
  s: number;             // the station's centre along this track
  stopS: number;         // where the train's front stops (the platform's far end mark)
  side: 'left' | 'right'; // platform side, relative to the direction of travel
}
export interface LineTrack {
  dir: 'south' | 'north';
  points: [number, number, number][];   // every ~5 m
  cum: number[];                        // s at each point
  stops: LineStop[];                    // in running order
  limits: Array<[number, number, number]>; // [from s, to s, km/h] civil speed limits
}
export interface LineData {
  name: string;
  stations: LineStation[];              // north to south
  tracks: LineTrack[];                  // south then north
  legs: Array<{ from: string; to: string }>;
  trainLengthM: number;
}

