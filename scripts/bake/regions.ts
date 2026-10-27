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
};

export const REGIONS: Record<string, RegionDef> = { dhaka: DHAKA };

export function projection(origin: { lat: number; lon: number }) {
  const kx = Math.cos((origin.lat * Math.PI) / 180) * 111320;
  const kz = 110574;
  return {
    toXZ: (lat: number, lon: number): [number, number] => [(lon - origin.lon) * kx, -(lat - origin.lat) * kz],
    toLatLon: (x: number, z: number): [number, number] => [origin.lat - z / kz, origin.lon + x / kx],
  };
}
export type Projection = ReturnType<typeof projection>;
