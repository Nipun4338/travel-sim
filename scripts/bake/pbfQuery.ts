// A Region's OSM data from the local Geofabrik extract instead of Overpass (which rate-limits big
// city queries): one pass over the file, written as the same Overpass-style JSON the bake already
// reads (roads, buildings and land use), cached in data/raw/<region>/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createOSMStream } from 'osm-pbf-parser-node';
import type { OsmData, OsmNode, OsmWay } from './fetch';
import { EXTRACT, NodeStore } from './pbf';

interface RawNode { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string>; }
interface RawWay { type: 'way'; id: number; refs: number[]; tags?: Record<string, string>; }

const NODE_KEYS = ['highway', 'railway', 'public_transport', 'station', 'name', 'name:en', 'crossing'];
const WAY_KEYS = ['highway', 'railway', 'service', 'name', 'name:en', 'lanes', 'oneway', 'width', 'bridge', 'layer', 'tunnel',
  'junction', 'building', 'building:levels', 'height', 'natural', 'water', 'landuse', 'leisure', 'amenity', 'aeroway', 'construction', 'usage'];

const isRoad = (t: Record<string, string>) => !!t.highway || /^(subway|light_rail|rail)$/.test(t.railway ?? '');
const isBuilding = (t: Record<string, string>) => !!t.building || t.natural === 'water';
const isLanduse = (t: Record<string, string>) => !!t.landuse || !!t.leisure || /^(wood|scrub|grassland|sand)$/.test(t.natural ?? '')
  || /^(parking|fuel|bus_station)$/.test(t.amenity ?? '') || /^(apron|taxiway|runway)$/.test(t.aeroway ?? '');
const keepNode = (t?: Record<string, string>) => !!t && (t.highway === 'bus_stop' || t.railway === 'station' || t.railway === 'level_crossing');

/** Roads (with rail and stations), buildings and land use inside `bbox` (south, west, north, east). */
export async function pbfRegionData(bbox: [number, number, number, number], rawDir: string): Promise<{ roads: OsmData; buildings: OsmData; landuse: OsmData }> {
  const files = { roads: join(rawDir, 'roads.json'), buildings: join(rawDir, 'buildings.json'), landuse: join(rawDir, 'landuse.json') };
  if (Object.values(files).every(existsSync)) {
    const read = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as OsmData;
    return { roads: read(files.roads), buildings: read(files.buildings), landuse: read(files.landuse) };
  }
  if (!existsSync(EXTRACT)) throw new Error(`Missing ${EXTRACT}: download https://download.geofabrik.de/asia/bangladesh-latest.osm.pbf`);
  const [s, w, n, e] = bbox;
  const store = new NodeStore();
  const nodeTags = new Map<number, Record<string, string>>();
  const out = { roads: [] as OsmWay[], buildings: [] as OsmWay[], landuse: [] as OsmWay[] };
  const tagged: OsmNode[] = [];
  let seen = 0;
  const stream = createOSMStream(EXTRACT, { withTags: { node: NODE_KEYS, way: WAY_KEYS, relation: false }, withInfo: false });
  for await (const item of stream as AsyncGenerator<RawNode | RawWay | object>) {
    const el = item as RawNode | RawWay;
    if (el.type === 'node') {
      if (el.lat < s || el.lat > n || el.lon < w || el.lon > e) continue;
      store.push(el.id, el.lat, el.lon);
      if (el.tags && Object.keys(el.tags).length) nodeTags.set(el.id, el.tags);
      if (keepNode(el.tags)) tagged.push({ type: 'node', id: el.id, lat: el.lat, lon: el.lon, tags: el.tags });
    } else if (el.type === 'way' && el.tags) {
      const group = isRoad(el.tags) ? out.roads : isBuilding(el.tags) ? out.buildings : isLanduse(el.tags) ? out.landuse : null;
      if (!group) continue;
      const nodes = el.refs.filter(r => store.find(r) >= 0);   // ways leaving the box are cut at its edge
      if (nodes.length >= 2) group.push({ type: 'way', id: el.id, nodes, tags: el.tags });
    }
    if (++seen % 5_000_000 === 0) console.log(`      ${(seen / 1e6).toFixed(0)}M elements read`);
  }
  // Each group carries the nodes its ways use (with their tags, e.g. level crossings), as Overpass's `>` would.
  const pack = (ways: OsmWay[], extra: OsmNode[] = []): OsmData => {
    const ids = new Set<number>(extra.map(nd => nd.id));
    const elements: Array<OsmNode | OsmWay> = [...extra];
    for (const wy of ways) for (const id of wy.nodes) {
      if (ids.has(id)) continue;
      ids.add(id);
      const k = store.find(id);
      const tags = nodeTags.get(id);
      elements.push({ type: 'node', id, lat: store.lat[k], lon: store.lon[k], ...(tags ? { tags } : {}) });
    }
    return { elements: [...elements, ...ways] };
  };
  const data = { roads: pack(out.roads, tagged), buildings: pack(out.buildings), landuse: pack(out.landuse) };
  mkdirSync(rawDir, { recursive: true });
  for (const k of ['roads', 'buildings', 'landuse'] as const) writeFileSync(files[k], JSON.stringify(data[k]));
  console.log(`      from the extract: ${out.roads.length} road/rail ways, ${out.buildings.length} buildings, ${out.landuse.length} land-use ways`);
  return data;
}
