// M12 (SPEC §18 item 7): the OSM figures Overpass couldn't serve during research, measured from the
// local Geofabrik extract instead. One pass over the file; prints a Markdown summary.
//   npx tsx scripts/research/osm-figures.ts
import { createOSMStream } from 'osm-pbf-parser-node';
import { EXTRACT } from '../bake/pbf';

type Box = [number, number, number, number]; // south, west, north, east
const DHAKA: Box = [23.68, 90.33, 23.90, 90.46];
const CORRIDOR: Box = [23.750, 90.383, 23.858, 90.428];   // the Dhaka Route strip
const BANDARBAN: Box = [21.90, 92.18, 22.22, 92.40];
const inBox = ([s, w, n, e]: Box, lat: number, lon: number) => lat >= s && lat <= n && lon >= w && lon <= e;
const MAJOR = /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/;

interface El { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; refs?: number[]; tags?: Record<string, string>; members?: Array<{ type: string; ref: number }>; }

const nodes = new Map<number, [number, number]>();
const dhakaWays = new Set<number>();
const corridor = { ways: 0, km: 0, lanes: 0, oneway: 0, maxspeed: 0, width: 0, surface: 0 };
const bb = { buildings: 0, levels: 0, highways: 0, major: 0, majorLanes: 0, busStops: 0, busStations: [] as string[], places: [] as string[], peaks: [] as string[], viewpoints: [] as string[] };
let busRelations = 0, busRelationsDhaka = 0;

const metres = (a: [number, number], b: [number, number]) => {
  const dy = (a[0] - b[0]) * 111320, dx = (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dx, dy);
};
const label = (t: Record<string, string>) => t['name:en'] ?? t.name ?? '(unnamed)';

const stream = createOSMStream(EXTRACT, {
  withTags: {
    node: ['natural', 'tourism', 'place', 'name', 'name:en', 'ele', 'amenity', 'highway'],
    way: ['highway', 'lanes', 'oneway', 'maxspeed', 'width', 'surface', 'building', 'building:levels', 'amenity', 'name'],
    relation: ['route', 'type', 'name'],
  },
  withInfo: false,
});
for await (const item of stream as AsyncGenerator<El | object>) {
  const el = item as El;
  if (el.type === 'node') {
    const { lat = 0, lon = 0, tags = {} } = el;
    const d = inBox(DHAKA, lat, lon), b = inBox(BANDARBAN, lat, lon);
    if (d || b) nodes.set(el.id, [lat, lon]);
    if (!b) continue;
    const ele = tags.ele ? ` ${tags.ele} m` : '';
    if (tags.place) bb.places.push(`${label(tags)} (${tags.place})`);
    if (tags.natural === 'peak') bb.peaks.push(`${label(tags)}${ele} @ ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    if (tags.tourism === 'viewpoint') bb.viewpoints.push(`${label(tags)} @ ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    if (tags.highway === 'bus_stop') bb.busStops++;
    if (tags.amenity === 'bus_station') bb.busStations.push(`${label(tags)} @ ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  } else if (el.type === 'way') {
    const t = el.tags ?? {}, pts = (el.refs ?? []).map(r => nodes.get(r)).filter(Boolean) as Array<[number, number]>;
    if (!pts.length) continue;
    const [lat, lon] = pts[0];
    if (inBox(DHAKA, lat, lon)) dhakaWays.add(el.id);
    if (t.highway && MAJOR.test(t.highway) && pts.some(p => inBox(CORRIDOR, p[0], p[1]))) {
      corridor.ways++;
      for (let i = 1; i < pts.length; i++) if (inBox(CORRIDOR, pts[i][0], pts[i][1])) corridor.km += metres(pts[i - 1], pts[i]) / 1000;
      for (const k of ['lanes', 'oneway', 'maxspeed', 'width', 'surface'] as const) if (t[k]) corridor[k]++;
    }
    if (inBox(BANDARBAN, lat, lon)) {
      if (t.building) { bb.buildings++; if (t['building:levels']) bb.levels++; }
      if (t.highway) { bb.highways++; if (MAJOR.test(t.highway)) { bb.major++; if (t.lanes) bb.majorLanes++; } }
      if (t.amenity === 'bus_station') bb.busStations.push(`${label(t)} (area) @ ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  } else if (el.type === 'relation' && el.tags?.route === 'bus') {
    busRelations++;
    if ((el.members ?? []).some(m => m.type === 'way' && dhakaWays.has(m.ref))) busRelationsDhaka++;
  }
}

const pct = (n: number, of: number) => `${n} (${of ? Math.round((n / of) * 100) : 0}%)`;
console.log(`## OSM figures from the Geofabrik extract\n`);
console.log(`- route=bus relations: ${busRelations} in Bangladesh, ${busRelationsDhaka} with a way in Dhaka ${DHAKA.join(',')}`);
console.log(`- Dhaka corridor ${CORRIDOR.join(',')}: ${corridor.ways} major ways, ${corridor.km.toFixed(1)} km inside the box; with lanes ${pct(corridor.lanes, corridor.ways)}, oneway ${pct(corridor.oneway, corridor.ways)}, maxspeed ${pct(corridor.maxspeed, corridor.ways)}, width ${pct(corridor.width, corridor.ways)}, surface ${pct(corridor.surface, corridor.ways)}`);
console.log(`- Bandarban ${BANDARBAN.join(',')}: ${bb.buildings} buildings (${pct(bb.levels, bb.buildings)} with levels), ${bb.highways} highway ways, ${bb.major} major (${pct(bb.majorLanes, bb.major)} with lanes), ${bb.busStops} bus stops`);
console.log(`- Bandarban bus stations: ${bb.busStations.join('; ') || 'none'}`);
console.log(`- Bandarban peaks (${bb.peaks.length}): ${bb.peaks.join('; ') || 'none'}`);
console.log(`- Bandarban viewpoints (${bb.viewpoints.length}): ${bb.viewpoints.join('; ') || 'none'}`);
console.log(`- Bandarban places (${bb.places.length}): ${bb.places.slice(0, 40).join('; ')}${bb.places.length > 40 ? ' …' : ''}`);
