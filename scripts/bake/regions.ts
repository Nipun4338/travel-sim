// Region definitions for the bake (SPEC §5).

export interface StopDef { name: string; osmNode?: number; lat: number; lon: number; }

export interface RegionDef {
  id: string;
  routeName: string;
  origin: { lat: number; lon: number };
  /** south, west, north, east: area fetched for roads and terrain. */
  bbox: [number, number, number, number];
  /** Buildings are fetched and baked within this distance of the Route (m). */
  corridorM: number;
  stops: StopDef[];
  legEnds: string[];   // Stop names where Legs start/end, in order
  /** Ground recovery from the GLO-30 surface model: minimum filter then blur, in pixels (~30 m). */
  terrainFilter: { minPx: number; blurPx: number };
  /** Terrain grid spacing for LOD 0 near the Route, LOD 0 elsewhere, LOD 1 and LOD 2 (m). */
  terrainSpacing: { near: number; far: number; lod1: number; lod2: number };
  /** Carriageway widths by highway type where OSM has no lanes tag and the default is wrong here. */
  widths?: Record<string, number>;
  /** Ground colour where no land use is mapped. */
  defaultGround: number;
  /** Scatter forest across unmapped ground near the Route (hill Regions). */
  forest: boolean;
  /** Smooth road profiles and cut the terrain to meet them (SPEC §4 grading; hill Regions). */
  gradeRoads: boolean;
  /** Raised footpaths along main roads (city Regions; hill roads have none). */
  footpaths: boolean;
}

export const DHAKA: RegionDef = {
  id: 'dhaka',
  routeName: 'Farmgate → Airport',
  origin: { lat: 23.7628, lon: 90.3913 },      // Tejgaon, the Dhaka Flight Zone centre
  bbox: [23.7525, 90.384, 23.8565, 90.425],
  corridorM: 400,
  stops: [
    { name: 'Farmgate',          osmNode: 2320379589,  lat: 23.75722, lon: 90.39024 },
    { name: 'Bijoy Sarani',      osmNode: 11934785542, lat: 23.76494, lon: 90.38917 },
    { name: 'Jahangir Gate',     osmNode: 12009429417, lat: 23.77526, lon: 90.38977 },
    { name: 'Mohakhali',         osmNode: 3499295181,  lat: 23.77818, lon: 90.39815 },
    { name: 'Chairman Bari',     osmNode: 12073083676, lat: 23.78786, lon: 90.40010 },
    { name: 'Kakoli',            osmNode: 12078090908, lat: 23.79523, lon: 90.40090 },
    { name: 'Kuril Bishwa Road', osmNode: 3498521660,  lat: 23.82136, lon: 90.41887 },
    { name: 'Khilkhet',          osmNode: 3556399554,  lat: 23.82936, lon: 90.41975 },
    { name: 'Airport',           osmNode: 3572490148,  lat: 23.85160, lon: 90.40734 },
  ],
  legEnds: ['Farmgate', 'Mohakhali', 'Kuril Bishwa Road', 'Airport'],
  terrainFilter: { minPx: 3, blurPx: 4 }, // strips Dhaka's buildings out of the surface model
  terrainSpacing: { near: 20, far: 20, lod1: 50, lod2: 100 },
  defaultGround: 0xa39b8a,
  forest: false,
  gradeRoads: false,
  footpaths: true,
};

/** Bandarban town → Chimbuk on the Thanchi Road (SPEC §5; Stops hand-placed, as OSM lacks them). */
export const BANDARBAN: RegionDef = {
  id: 'bandarban',
  routeName: 'Bandarban Bus Stand → Chimbuk',
  origin: { lat: 22.054, lon: 92.273 },       // the Bandarban Flight Zone centre
  bbox: [22.045, 92.205, 22.195, 92.285],
  corridorM: 400,
  stops: [
    { name: 'Bandarban Bus Stand', lat: 22.1837, lon: 92.2178 },
    { name: 'Milonchhari',         lat: 22.1686, lon: 92.2228 },
    { name: 'Shoilo Propat',       lat: 22.1507, lon: 92.2169 },
    { name: 'Chimbuk',             lat: 22.05755, lon: 92.27342 },  // the Thanchi Road's ridge top (GLO-30, M12)
  ],
  legEnds: ['Bandarban Bus Stand', 'Shoilo Propat', 'Chimbuk'],
  terrainFilter: { minPx: 1, blurPx: 1 },     // keep the ridges; only take the edge off the forest canopy
  terrainSpacing: { near: 5, far: 25, lod1: 40, lod2: 100 }, // 5 m so cut banks beside the narrow road stay gentle enough to drive past
  widths: { secondary: 5.5, tertiary: 5, unclassified: 4.5, residential: 4.5 },
  defaultGround: 0x4f7a3a,
  forest: true,
  gradeRoads: true,
  footpaths: false,
};

export const REGIONS: Record<string, RegionDef> = { dhaka: DHAKA, bandarban: BANDARBAN };

export function projection(origin: { lat: number; lon: number }) {
  const kx = Math.cos((origin.lat * Math.PI) / 180) * 111320;
  const kz = 110574;
  return {
    toXZ: (lat: number, lon: number): [number, number] => [(lon - origin.lon) * kx, -(lat - origin.lat) * kz],
    toLatLon: (x: number, z: number): [number, number] => [origin.lat - z / kz, origin.lon + x / kx],
  };
}
export type Projection = ReturnType<typeof projection>;
