// Landmarks (SPEC §10): where each one stands, how big its footprint is, and where it appears. Shared
// by the bakes (which clear OSM buildings off each footprint and give bus-Region landmarks their
// ground height) and the game (which builds and places the models from src/landmarks/models.ts).
// Coordinates from docs/research/landmarks.md; hand-placed where OSM has nothing. Roadside ones
// take the baked Route's heading there. Jahangir Gate spans the dual carriageway into the
// cantonment (its OSM node is on the northbound side, 38 m from the Route): it's centred between
// the two carriageways and faces along them, so the bus passes beside it.

export type LandmarkPlace = 'dhaka-route' | 'dhaka-zone' | 'bandarban-route' | 'bandarban-zone';

export interface LandmarkDef {
  id: string;
  name: string;            // English; Bangla via i18n place()
  lat: number;
  lon: number;
  tier: 'hero' | 'simple';
  /** Clear OSM buildings within this many metres (0: leave them). */
  footprintM: number;
  /** Long axis heading, degrees clockwise from north. */
  headingDeg: number;
  places: LandmarkPlace[];
}

const D = (p: 'route' | 'zone' | 'both'): LandmarkPlace[] => (p === 'both' ? ['dhaka-route', 'dhaka-zone'] : [`dhaka-${p}`]);
const B = (p: 'route' | 'zone' | 'both'): LandmarkPlace[] => (p === 'both' ? ['bandarban-route', 'bandarban-zone'] : [`bandarban-${p}`]);

export const LANDMARKS: LandmarkDef[] = [
  // Dhaka Route (also seen from the air)
  { id: 'farmgate-metro', name: 'Farmgate metro station', lat: 23.75906, lon: 90.38708, tier: 'hero', footprintM: 0, headingDeg: 2, places: D('both') },
  { id: 'airport-t3', name: 'Airport Terminal 3', lat: 23.84325, lon: 90.41205, tier: 'hero', footprintM: 260, headingDeg: 140, places: D('both') },
  { id: 'jahangir-gate', name: 'Jahangir Gate', lat: 23.775597, lon: 90.389857, tier: 'simple', footprintM: 0, headingDeg: 356, places: D('both') },
  { id: 'novo-theatre', name: 'Novo Theatre', lat: 23.76385, lon: 90.38783, tier: 'simple', footprintM: 45, headingDeg: 0, places: D('both') },
  // Dhaka Flight Zone
  { id: 'sangsad-bhaban', name: 'Jatiyo Sangsad Bhaban', lat: 23.76229, lon: 90.37855, tier: 'hero', footprintM: 110, headingDeg: 0, places: D('zone') },
  { id: 'ahsan-manzil', name: 'Ahsan Manzil', lat: 23.70848, lon: 90.4056, tier: 'simple', footprintM: 70, headingDeg: 90, places: D('zone') },
  { id: 'shaheed-minar', name: 'Shaheed Minar', lat: 23.72721, lon: 90.39664, tier: 'simple', footprintM: 40, headingDeg: 0, places: D('zone') },
  { id: 'hatirjheel-bridge', name: 'Hatirjheel', lat: 23.76363, lon: 90.41084, tier: 'simple', footprintM: 0, headingDeg: 20, places: D('zone') },
  { id: 'bashundhara-city', name: 'Bashundhara City', lat: 23.75114, lon: 90.39064, tier: 'simple', footprintM: 75, headingDeg: 0, places: D('zone') },
  { id: 'baitul-mukarram', name: 'Baitul Mukarram', lat: 23.72947, lon: 90.41262, tier: 'simple', footprintM: 50, headingDeg: 0, places: D('zone') },
  { id: 'lalbagh-fort', name: 'Lalbagh Fort', lat: 23.71884, lon: 90.38815, tier: 'simple', footprintM: 120, headingDeg: 0, places: D('zone') },
  { id: 'sadarghat-launches', name: 'Sadarghat', lat: 23.70589, lon: 90.40929, tier: 'simple', footprintM: 0, headingDeg: 0, places: D('zone') },
  { id: 'airport-terminal', name: 'Airport Terminal', lat: 23.8501, lon: 90.4071, tier: 'simple', footprintM: 200, headingDeg: 140, places: D('zone') },
  // Bandarban Route (also seen from the air)
  { id: 'chimbuk', name: 'Chimbuk', lat: 22.0571, lon: 92.2724, tier: 'hero', footprintM: 40, headingDeg: 30, places: B('both') },
  { id: 'shoilo-propat', name: 'Shoilo Propat', lat: 22.15067, lon: 92.21688, tier: 'hero', footprintM: 0, headingDeg: 109, places: B('both') },
  { id: 'milonchhari', name: 'Milonchhari', lat: 22.16861, lon: 92.22284, tier: 'simple', footprintM: 0, headingDeg: 40, places: B('both') },
  { id: 'bandarban-bus-stand', name: 'Bandarban Bus Stand', lat: 22.18368, lon: 92.2178, tier: 'simple', footprintM: 0, headingDeg: 30, places: B('both') },
  // Bandarban Flight Zone
  { id: 'buddha-dhatu-jadi', name: 'Buddha Dhatu Jadi', lat: 22.22311, lon: 92.19772, tier: 'hero', footprintM: 45, headingDeg: 0, places: B('zone') },
  { id: 'nilgiri', name: 'Nilgiri', lat: 21.91284, lon: 92.32448, tier: 'simple', footprintM: 60, headingDeg: 0, places: B('zone') },
  { id: 'nilachal', name: 'Nilachal', lat: 22.16863, lon: 92.20988, tier: 'simple', footprintM: 30, headingDeg: 0, places: B('zone') },
  { id: 'meghla-bridge', name: 'Meghla', lat: 22.18157, lon: 92.18936, tier: 'simple', footprintM: 0, headingDeg: 60, places: B('zone') },
  { id: 'sangu-boats', name: 'Sangu river boats', lat: 22.18331, lon: 92.23059, tier: 'simple', footprintM: 0, headingDeg: 0, places: B('zone') },
];

/** A landmark placed by a bake: local metres in that world, ground height included. */
export interface PlacedLandmark { id: string; x: number; y: number; z: number; headingDeg: number; }

/** Landmarks for a bus Region or Flight Zone. */
export const landmarksFor = (place: LandmarkPlace) => LANDMARKS.filter(l => l.places.includes(place));
