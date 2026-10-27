// Raw data fetching with an on-disk cache in data/raw/ (gitignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fromUrl } from 'geotiff';

export interface OsmNode { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string>; }
export interface OsmWay { type: 'way'; id: number; nodes: number[]; tags?: Record<string, string>; }
export interface OsmData { elements: Array<OsmNode | OsmWay>; }

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Runs an Overpass query, trying each mirror up to twice. Cached by file name. */
export async function overpass(query: string, cacheFile: string): Promise<OsmData> {
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  for (const mirror of MIRRORS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`  overpass: ${new URL(mirror).host} (attempt ${attempt})`);
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'travel-sim-bake/0.1' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(240_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const data = JSON.parse(text) as OsmData & { remark?: string };
        if (data.remark && /runtime error|timed out/i.test(data.remark)) throw new Error(data.remark);
        mkdirSync(dirname(cacheFile), { recursive: true });
        writeFileSync(cacheFile, text);
        return data;
      } catch (e) {
        console.log(`    failed: ${(e as Error).message}`);
      }
    }
  }
  throw new Error('All Overpass mirrors failed; try again later.');
}

export interface DemWindow {
  width: number;
  height: number;
  west: number;   // lon of the left edge of pixel 0
  north: number;  // lat of the top edge of row 0
  resLon: number; // degrees per pixel
  resLat: number; // degrees per pixel (positive)
  data: Float32Array;
}

/** Reads the bbox window of a Copernicus GLO-30 COG tile from AWS Open Data with range requests. */
export async function copernicusWindow(bbox: [number, number, number, number], cacheFile: string): Promise<DemWindow> {
  if (existsSync(cacheFile)) {
    const meta = JSON.parse(readFileSync(cacheFile, 'utf8'));
    return { ...meta, data: new Float32Array(readFileSync(cacheFile + '.f32').buffer.slice(0)) };
  }
  const [s, w, n, e] = bbox;
  const lat = Math.floor(s), lon = Math.floor(w);
  if (Math.floor(n) !== lat || Math.floor(e) !== lon) throw new Error('bbox spans more than one DEM tile');
  const name = `Copernicus_DSM_COG_10_N${String(lat).padStart(2, '0')}_00_E${String(lon).padStart(3, '0')}_00_DEM`;
  const url = `https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif`;
  console.log(`  dem: ${name}`);
  const tiff = await fromUrl(url);
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution(); // ry is negative
  const x0 = Math.floor((w - ox) / rx), x1 = Math.ceil((e - ox) / rx);
  const y0 = Math.floor((n - oy) / ry), y1 = Math.ceil((s - oy) / ry);
  const rasters = await img.readRasters({ window: [x0, y0, x1, y1] });
  const band = rasters[0] as unknown as ArrayLike<number>;
  const out: DemWindow = {
    width: x1 - x0, height: y1 - y0, west: ox + x0 * rx, north: oy + y0 * ry, resLon: rx, resLat: -ry,
    data: Float32Array.from(band),
  };
  mkdirSync(dirname(cacheFile), { recursive: true });
  const { data, ...meta } = out;
  writeFileSync(cacheFile, JSON.stringify(meta));
  writeFileSync(cacheFile + '.f32', Buffer.from(data.buffer));
  return out;
}
