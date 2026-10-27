// Flight Zone definitions for the flight bake (SPEC §5 Flight Zones, §8 Challenges, §10 landmarks).
// Positions are lat/lon; the bake turns them into local metres from the zone origin.

export interface LatLon { lat: number; lon: number; }

/** A Ring at `agl` metres above the ground under it (or above `alt` metres above sea level). */
export interface RingDef extends LatLon { agl?: number; alt?: number; }

export interface ChallengeDef {
  id: string;
  kind: 'takeoff' | 'landing' | 'course';
  /** Where the Challenge starts: on a runway end, or airborne at a point. */
  /** `<end>`: on the runway at that end's threshold, ready to roll; `<end>-final`: on a 3° final 6 km out. */
  spawn: { runway: string } | (LatLon & { agl: number; headingDeg: number; kmh: number });
  rings: RingDef[];
  /** Take-off: done at this height above the runway. */
  climbToAgl?: number;
  /** Course: stay below this height above sea level for 3 stars. */
  ceilingM?: number;
  /** Landing: the runway end to land on. */
  landOn?: string;
  /** Rings along a river from the spawn, upstream towards `toward`. */
  river?: { name: RegExp; toward: LatLon; lengthM: number; spacingM: number; agl: number };
  parS: number;
  feeTk: number;
}

export interface ZoneDef {
  id: string;
  origin: LatLon;
  halfM: number;                 // the zone is a square, 2 × halfM wide
  terrainFilter: { minPx: number; blurPx: number };
  gridM: number;                 // height-field and LOD 0 terrain spacing
  /** Highways baked as ribbons and drawn on the map. */
  roads: RegExp;
  /** Default ground: built-up where buildings are dense, else `rural`. */
  rural: number;
  urban: number;
  forest: boolean;
  /** Free-flight spawn. */
  spawn: { runway: string } | (LatLon & { agl: number; headingDeg: number; kmh: number });
  landmarks: Array<LatLon & { name: string; radiusM: number }>;
  challenges: ChallengeDef[];
}

export const DHAKA_ZONE: ZoneDef = {
  id: 'dhaka',
  origin: { lat: 23.7628, lon: 90.3913 },
  halfM: 15000,
  terrainFilter: { minPx: 3, blurPx: 4 },
  gridM: 40,
  roads: /^(motorway|trunk|primary|secondary)(_link)?$/,
  rural: 0x7f9a55,
  urban: 0xa39b8a,
  forest: false,
  spawn: { runway: '14' },
  landmarks: [
    { name: 'Jatiyo Sangsad Bhaban', lat: 23.76229, lon: 90.37855, radiusM: 700 },
    { name: 'Ahsan Manzil', lat: 23.70848, lon: 90.4056, radiusM: 500 },
    { name: 'Shaheed Minar', lat: 23.72721, lon: 90.39664, radiusM: 500 },
    { name: 'Hatirjheel', lat: 23.76363, lon: 90.41084, radiusM: 800 },
    { name: 'Bashundhara City', lat: 23.75114, lon: 90.39064, radiusM: 500 },
    { name: 'Baitul Mukarram', lat: 23.72947, lon: 90.41262, radiusM: 500 },
    { name: 'Lalbagh Fort', lat: 23.71884, lon: 90.38815, radiusM: 500 },
    { name: 'Sadarghat', lat: 23.70589, lon: 90.40929, radiusM: 600 },
    { name: 'Airport Terminal', lat: 23.8501, lon: 90.4071, radiusM: 800 },
  ],
  challenges: [
    {
      id: 'dhaka-takeoff', kind: 'takeoff', spawn: { runway: '14' }, climbToAgl: 300, parS: 75, feeTk: 300,
      // Along the extended centreline (filled in by the bake from the runway).
      rings: [],
    },
    {
      id: 'dhaka-landing', kind: 'landing', landOn: '32', parS: 210, feeTk: 500,
      spawn: { runway: '32-final' },
      rings: [],
    },
    {
      id: 'dhaka-city-tour', kind: 'course', ceilingM: 500, parS: 420, feeTk: 700,
      spawn: { lat: 23.8, lon: 90.4135, agl: 300, headingDeg: 190, kmh: 200 },
      rings: [
        { lat: 23.7715, lon: 90.4125, agl: 200 },
        { lat: 23.7636, lon: 90.4075, agl: 150 },   // Hatirjheel
        { lat: 23.7590, lon: 90.3950, agl: 200 },
        { lat: 23.7623, lon: 90.3786, agl: 180 },   // Sangsad Bhaban
        { lat: 23.7420, lon: 90.3830, agl: 220 },
        { lat: 23.7272, lon: 90.3966, agl: 200 },   // Shaheed Minar
        { lat: 23.7085, lon: 90.4056, agl: 150 },   // Ahsan Manzil
      ],
    },
  ],
};

export const BANDARBAN_ZONE: ZoneDef = {
  id: 'bandarban',
  origin: { lat: 22.054, lon: 92.273 },
  halfM: 20000,
  terrainFilter: { minPx: 1, blurPx: 1 },
  gridM: 40,
  roads: /^(trunk|primary|secondary|tertiary)(_link)?$/,
  rural: 0x4f7a3a,
  urban: 0x9b927f,
  forest: true,
  spawn: { lat: 22.195, lon: 92.218, agl: 600, headingDeg: 180, kmh: 200 },
  landmarks: [
    { name: 'Buddha Dhatu Jadi', lat: 22.22311, lon: 92.19772, radiusM: 600 },
    { name: 'Nilgiri', lat: 21.91284, lon: 92.32448, radiusM: 800 },
    { name: 'Nilachal', lat: 22.16863, lon: 92.20988, radiusM: 600 },
    { name: 'Meghla', lat: 22.18157, lon: 92.18936, radiusM: 600 },
    { name: 'Sangu river boats', lat: 22.18331, lon: 92.23059, radiusM: 500 },
    { name: 'Chimbuk', lat: 22.0569, lon: 92.2711, radiusM: 800 },
  ],
  challenges: [
    {
      id: 'bandarban-valley', kind: 'course', parS: 360, feeTk: 600,
      spawn: { lat: 22.192, lon: 92.226, agl: 250, headingDeg: 150, kmh: 190 },
      rings: [],
      river: { name: /sangu|সাঙ্গু/i, toward: { lat: 22.05, lon: 92.4 }, lengthM: 16000, spacingM: 1600, agl: 90 },
    },
    {
      id: 'bandarban-ridges', kind: 'course', parS: 800, feeTk: 900,
      spawn: { lat: 22.19, lon: 92.215, agl: 500, headingDeg: 330, kmh: 200 },
      rings: [
        { lat: 22.2231, lon: 92.1977, agl: 120 },   // Buddha Dhatu Jadi
        { lat: 22.1686, lon: 92.2100, agl: 150 },   // Nilachal
        { lat: 22.1100, lon: 92.2450, agl: 150 },
        { lat: 22.0569, lon: 92.2711, agl: 120 },   // Chimbuk
        { lat: 21.9900, lon: 92.2950, agl: 150 },
        { lat: 21.9128, lon: 92.3245, agl: 120 },   // Nilgiri
      ],
    },
  ],
};

export const ZONES: Record<string, ZoneDef> = { dhaka: DHAKA_ZONE, bandarban: BANDARBAN_ZONE };
