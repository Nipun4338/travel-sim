// Buildings from the Geofabrik Bangladesh extract (SPEC §4 lists it as the OSM input). Overpass
// can't serve ~900k Dhaka buildings, so the flight bake streams the .pbf once: nodes inside the
// bbox go into sorted typed arrays (PBF lists nodes by id, before ways), then each building way is
// resolved against them. Cached per zone as compact JSON.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createOSMStream } from 'osm-pbf-parser-node';

export const EXTRACT = 'data/raw/osm/bangladesh-latest.osm.pbf';

export interface PbfBuilding { id: number; tags: Record<string, string>; geometry: Array<{ lat: number; lon: number }>; }

interface RawNode { type: 'node'; id: number; lat: number; lon: number; }
interface RawWay { type: 'way'; id: number; refs: number[]; tags?: Record<string, string>; }

/** Growable typed arrays of node ids and coordinates, in the file's (ascending id) order. */
class NodeStore {
  ids = new Float64Array(1 << 20);
  lat = new Float64Array(1 << 20);
  lon = new Float64Array(1 << 20);
  n = 0;
  push(id: number, lat: number, lon: number): void {
    if (this.n === this.ids.length) {
      const grow = <T extends Float64Array>(a: T) => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
      this.ids = grow(this.ids); this.lat = grow(this.lat); this.lon = grow(this.lon);
    }
    this.ids[this.n] = id; this.lat[this.n] = lat; this.lon[this.n] = lon; this.n++;
  }
  find(id: number): number {
    let lo = 0, hi = this.n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, v = this.ids[mid];
      if (v === id) return mid;
      if (v < id) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
  }
}

/** Every building way wholly inside `bbox` (south, west, north, east). */
export async function pbfBuildings(bbox: [number, number, number, number], cacheFile: string): Promise<PbfBuilding[]> {
  if (existsSync(cacheFile)) {
    const rows: Array<[number, Record<string, string>, number[]]> = JSON.parse(readFileSync(cacheFile, 'utf8'));
    return rows.map(([id, tags, c]) => ({ id, tags, geometry: Array.from({ length: c.length / 2 }, (_, k) => ({ lat: c[2 * k], lon: c[2 * k + 1] })) }));
  }
  if (!existsSync(EXTRACT)) throw new Error(`Missing ${EXTRACT}: download https://download.geofabrik.de/asia/bangladesh-latest.osm.pbf`);
  const [s, w, n, e] = bbox;
  const nodes = new NodeStore();
  const rows: Array<[number, Record<string, string>, number[]]> = [];
  let sorted = true, lastId = -Infinity, seen = 0;
  const stream = createOSMStream(EXTRACT, { withTags: { node: false, way: ['building', 'building:levels', 'height'], relation: false }, withInfo: false });
  for await (const item of stream as AsyncGenerator<RawNode | RawWay | object>) {
    const el = item as RawNode | RawWay;
    if (el.type === 'node') {
      if (el.lat >= s && el.lat <= n && el.lon >= w && el.lon <= e) {
        if (el.id < lastId) sorted = false;
        lastId = el.id;
        nodes.push(el.id, el.lat, el.lon);
      }
    } else if (el.type === 'way') {
      if (!el.tags?.building || el.refs.length < 4) continue;
      const c: number[] = [];
      for (const ref of el.refs) {
        const k = nodes.find(ref);
        if (k < 0) { c.length = 0; break; }
        c.push(+nodes.lat[k].toFixed(7), +nodes.lon[k].toFixed(7));
      }
      if (c.length) rows.push([el.id, el.tags, c]);
    }
    if (++seen % 5_000_000 === 0) console.log(`      ${(seen / 1e6).toFixed(0)}M elements read, ${rows.length} buildings`);
  }
  if (!sorted) throw new Error('Extract nodes are not sorted by id');
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(rows));
  return pbfBuildings(bbox, cacheFile);
}
