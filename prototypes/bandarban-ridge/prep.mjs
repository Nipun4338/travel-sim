// THROWAWAY prep for PROTOTYPE-bandarban-ridge.html: crops GLO-30 (Copernicus DEM, © DLR/Airbus,
// provided under COPERNICUS by the EU and ESA) and the Thanchi Road (OSM, ODbL) into data.json.
// Run from the repo root: node prototypes/bandarban-ridge/prep.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const C = { lat: 22.082, lon: 92.258 };                 // between Y Junction and Chimbuk
const M_LAT = 110574, M_LON = 111320 * Math.cos((C.lat * Math.PI) / 180);
const toXZ = (lat, lon) => [(lon - C.lon) * M_LON, -(lat - C.lat) * M_LAT];

const meta = JSON.parse(readFileSync('data/raw/bandarban-zone/glo30.json', 'utf8'));
const dem = new Float32Array(readFileSync('data/raw/bandarban-zone/glo30.json.f32').buffer.slice(0));
function demAt(lat, lon) {
  const fx = (lon - meta.west) / meta.resLon - 0.5, fy = (meta.north - lat) / meta.resLat - 0.5;
  const ix = Math.max(0, Math.min(meta.width - 2, Math.floor(fx))), iy = Math.max(0, Math.min(meta.height - 2, Math.floor(fy)));
  const tx = fx - ix, ty = fy - iy, W = meta.width;
  const a = dem[iy * W + ix], b = dem[iy * W + ix + 1], c = dem[(iy + 1) * W + ix], d = dem[(iy + 1) * W + ix + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function grid(sizeM, step) {
  const n = Math.round(sizeM / step) + 1, out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -sizeM / 2 + i * step, z = -sizeM / 2 + j * step;
    out[j * n + i] = demAt(C.lat - z / M_LAT, C.lon + x / M_LON);
  }
  return { n, step, size: sizeM, h: Buffer.from(out.buffer).toString('base64') };
}

// The baked Route (public/regions/bandarban/route.*.json): x/z in metres from the region origin, y graded.
import { readdirSync } from 'node:fs';
const O = { lat: 22.054, lon: 92.273 }, okx = Math.cos((O.lat * Math.PI) / 180) * 111320;
const file = readdirSync('public/regions/bandarban').find(f => f.startsWith('route.'));
const baked = JSON.parse(readFileSync('public/regions/bandarban/' + file, 'utf8')).points;
const NEAR = 5000;
const route = baked.map(([x, y, z]) => { const [px, pz] = toXZ(O.lat - z / M_LAT, O.lon + x / okx); return [Math.round(px * 10) / 10, Math.round(y * 10) / 10, Math.round(pz * 10) / 10]; })
  .filter(([x, , z]) => Math.abs(x) < NEAR / 2 - 100 && Math.abs(z) < NEAR / 2 - 100);
console.log('route points', route.length);

writeFileSync('prototypes/bandarban-ridge/data.json', JSON.stringify({
  centre: C, near: grid(NEAR, 10), far: grid(36000, 120), route,
  credit: 'Terrain: Copernicus GLO-30 DEM (© DLR e.V. 2010-2014 and © Airbus 2014-2018, provided under COPERNICUS by the EU and ESA). Road: © OpenStreetMap contributors, ODbL.',
}));
