// Building heights from Google Open Buildings 2.5D Temporal (2023), SPEC §4 / polish spec §2.
// The public COGs are range-read at their 4 m (or 8 m) overview, so a Region costs tens of MB,
// not the 1.7 GB of a whole tile; windows are cached in data/raw/open-buildings/ (gitignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromUrl } from 'geotiff';

const BUCKET = 'https://storage.googleapis.com/open-buildings-temporal-data/v1';
const MANIFESTS = ['37', '31']; // S2 cells over Dhaka and Bandarban, UTM 46N
const CACHE = join('data', 'raw', 'open-buildings');

/** WGS84 → UTM zone 46N (EPSG:32646), easting and northing in metres. */
export function utm46(lat: number, lon: number): [number, number] {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = (lat * Math.PI) / 180, A = Math.cos(phi) * (((lon - 93) * Math.PI) / 180);
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2;
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi)
    + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  const y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [x, y];
}

/** One tile's window: height in 0.5 m steps and presence ×255, row-major from the top-left. */
interface Window { west: number; north: number; res: number; w: number; h: number; height: Uint8Array; presence: Uint8Array; }

interface Manifest { uriPrefix: string; tilesets: Array<{ sources: Array<{ uris: string[]; affineTransform: { translateX: number; translateY: number; scaleX: number }; dimensions: { width: number; height: number } }> }> }

export class OpenBuildings {
  private constructor(private readonly windows: Window[]) {}

  /** Loads every tile window over the bbox (south, west, north, east) at a 4 or 8 m overview. */
  static async load(bbox: [number, number, number, number], res: 4 | 8): Promise<OpenBuildings> {
    const [s, w, n, e] = bbox;
    const corners = [utm46(s, w), utm46(s, e), utm46(n, w), utm46(n, e)];
    const minE = Math.min(...corners.map(c => c[0])), maxE = Math.max(...corners.map(c => c[0]));
    const minN = Math.min(...corners.map(c => c[1])), maxN = Math.max(...corners.map(c => c[1]));
    mkdirSync(CACHE, { recursive: true });
    const windows: Window[] = [];
    for (const token of MANIFESTS) {
      const file = join(CACHE, `manifest-${token}.json`);
      if (!existsSync(file)) writeFileSync(file, await (await fetch(`${BUCKET}/manifests/${token}_EPSG_32646_2023_06_30.json`)).text());
      const m = JSON.parse(readFileSync(file, 'utf8')) as Manifest;
      const prefix = m.uriPrefix.replace('gs://open-buildings-temporal-data/v1', BUCKET);
      for (const src of m.tilesets.flatMap(t => t.sources)) {
        const { translateX: tx, translateY: ty, scaleX } = src.affineTransform, { width, height } = src.dimensions;
        const step = res / scaleX; // overview pixels are whole: 25,000 px at 0.5 m is 1,563 at 8 m
        const x0 = Math.max(0, Math.floor((minE - tx) / res)), x1 = Math.min(Math.ceil(width / step), Math.ceil((maxE - tx) / res));
        const y0 = Math.max(0, Math.floor((ty - maxN) / res)), y1 = Math.min(Math.ceil(height / step), Math.ceil((ty - minN) / res));
        if (x1 <= x0 || y1 <= y0) continue;
        windows.push(await readWindow(prefix + src.uris[0], step, [x0, y0, x1, y1], tx, ty, res));
      }
    }
    console.log(`      open buildings: ${windows.length} tile window(s) at ${res} m`);
    return new OpenBuildings(windows);
  }

  /**
   * The p75 height of the built pixels (presence > 0.5) whose centres fall inside a footprint
   * ring given in UTM metres. `null` when the ring is covered but holds no built pixel (usually a
   * small shed), `undefined` when no tile covers it.
   */
  p75(ring: [number, number][]): number | null | undefined {
    const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
    const minE = Math.min(...xs), maxE = Math.max(...xs), minN = Math.min(...ys), maxN = Math.max(...ys);
    let covered = false;
    const vals: number[] = [];
    for (const win of this.windows) {
      const i0 = Math.floor((minE - win.west) / win.res), i1 = Math.ceil((maxE - win.west) / win.res);
      const j0 = Math.floor((win.north - maxN) / win.res), j1 = Math.ceil((win.north - minN) / win.res);
      if (i1 < 0 || j1 < 0 || i0 >= win.w || j0 >= win.h) continue;
      covered = true;
      for (let j = Math.max(0, j0); j < Math.min(win.h, j1); j++) for (let i = Math.max(0, i0); i < Math.min(win.w, i1); i++) {
        const k = j * win.w + i;
        if (win.presence[k] > 127 && inside(win.west + (i + 0.5) * win.res, win.north - (j + 0.5) * win.res, ring)) vals.push(win.height[k] / 2);
      }
    }
    if (!covered) return undefined;
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return vals[Math.min(vals.length - 1, Math.floor(0.75 * vals.length))];
  }
}

async function readWindow(url: string, step: number, win: [number, number, number, number], tx: number, ty: number, res: number): Promise<Window> {
  const name = `${url.split('/').slice(-2).join('_').replace('.tif', '')}_${res}m_${win.join('_')}`;
  const meta = join(CACHE, name + '.json'), bin = join(CACHE, name + '.bin');
  const [x0, y0, x1, y1] = win, w = x1 - x0, h = y1 - y0;
  const base = { west: tx + x0 * res, north: ty - y0 * res, res, w, h };
  if (existsSync(meta) && existsSync(bin)) {
    const buf = readFileSync(bin);
    return { ...base, height: new Uint8Array(buf.buffer, buf.byteOffset, w * h), presence: new Uint8Array(buf.buffer, buf.byteOffset + w * h, w * h) };
  }
  console.log(`      open buildings: ${url.split('/').pop()} ${w}×${h} px`);
  const tiff = await fromUrl(url);
  const full = await tiff.getImage(0), want = Math.ceil(full.getWidth() / step);
  let img = full;
  for (let i = 1; i < await tiff.getImageCount(); i++) { const im = await tiff.getImage(i); if (im.getWidth() === want) { img = im; break; } }
  if (img === full) throw new Error(`no ${res} m overview in ${url}`);
  // Bands: fractional_count, height, presence.
  const r = await img.readRasters({ window: win, samples: [1, 2] }) as unknown as Float32Array[];
  const height = new Uint8Array(w * h), presence = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) { height[k] = Math.min(255, Math.round(r[0][k] * 2)); presence[k] = Math.round(Math.max(0, Math.min(1, r[1][k])) * 255); }
  writeFileSync(meta, JSON.stringify(base));
  writeFileSync(bin, Buffer.concat([Buffer.from(height), Buffer.from(presence)]));
  return { ...base, height, presence };
}

function inside(x: number, y: number, ring: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
