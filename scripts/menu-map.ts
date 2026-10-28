// The menu's illustrated map of Bangladesh (SPEC §13, v1.2.0), from the local Geofabrik extract:
// the land outline (the national boundary without its sea segments, closed by the coastline), the
// islands, the divisions' borders and the big rivers, simplified to ~1 km and written as SVG path
// data in src/ui/map/bdMap.ts. Three passes over the extract (relations, then ways, then nodes).
//   npx tsx scripts/menu-map.ts
import { writeFileSync } from 'node:fs';
import { createOSMStream } from 'osm-pbf-parser-node';
import { EXTRACT } from './bake/pbf';

interface Rel { type: 'relation'; id: number; tags?: Record<string, string>; members?: Array<{ type: string; ref: number; role: string }>; }
interface Way { type: 'way'; id: number; refs: number[]; tags?: Record<string, string>; }
interface Node { type: 'node'; id: number; lat: number; lon: number; }

const RIVERS = /^(Padma|Jamuna|Meghna|Brahmaputra|Old Brahmaputra|Teesta|Karnaphuli|Surma|Kushiyara|Madhumati|Gorai|Arial Khan|Sangu|Matamuhuri|Buriganga|Shitalakshya|Dhaleshwari|Rupsha|Pashur|Tetulia|Lower Meghna)( River)?$/i;
const read = async (types: Record<string, string[] | boolean>, fn: (el: Rel | Way | Node) => void) => {
  const stream = createOSMStream(EXTRACT, { withTags: types as never, withInfo: false });
  for await (const el of stream as AsyncGenerator<Rel | Way | Node>) fn(el);
};

async function main() {
  // Pass 1: the country and its divisions (relations).
  const countryWays = new Set<number>();
  const divisionWays = new Set<number>();
  await read({ node: false, way: false, relation: ['boundary', 'admin_level', 'name:en', 'name'] }, el => {
    if (el.type !== 'relation' || el.tags?.boundary !== 'administrative') return;
    const outer = (el.members ?? []).filter(m => m.type === 'way' && m.role !== 'inner').map(m => m.ref);
    if (el.tags.admin_level === '2' && /Bangladesh/i.test(el.tags['name:en'] ?? el.tags.name ?? '')) outer.forEach(id => countryWays.add(id));
    if (el.tags.admin_level === '4') outer.forEach(id => divisionWays.add(id));
  });
  console.log(`country ${countryWays.size} ways, divisions ${divisionWays.size} ways`);

  // Pass 2: the ways we need (boundary parts, coastline, big rivers) and their node ids.
  const ways = new Map<number, { refs: number[]; kind: 'border' | 'sea' | 'division' | 'coast' | 'river'; name?: string }>();
  await read({ node: false, way: ['maritime', 'natural', 'waterway', 'name:en', 'name'], relation: false }, el => {
    if (el.type !== 'way') return;
    const t = el.tags ?? {};
    if (countryWays.has(el.id)) ways.set(el.id, { refs: el.refs, kind: t.maritime === 'yes' ? 'sea' : 'border' });
    else if (divisionWays.has(el.id)) { if (t.maritime !== 'yes') ways.set(el.id, { refs: el.refs, kind: 'division' }); }
    else if (t.natural === 'coastline') ways.set(el.id, { refs: el.refs, kind: 'coast' });
    else if (t.waterway === 'river' && RIVERS.test(t['name:en'] ?? t.name ?? '')) ways.set(el.id, { refs: el.refs, kind: 'river', name: t['name:en'] ?? t.name });
  });
  const need = new Set<number>();
  for (const w of ways.values()) w.refs.forEach(r => need.add(r));
  console.log(`${ways.size} ways, ${need.size} nodes`);

  // Pass 3: node positions.
  const pos = new Map<number, [number, number]>();
  await read({ node: false, way: false, relation: false }, el => { if (el.type === 'node' && need.has(el.id)) pos.set(el.id, [el.lat, el.lon]); });

  // Projection: equirectangular around 23.7 N, x east and y south, in km.
  const LAT0 = 23.7, LON0 = 90.35, KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180), KY = 110.57;
  const proj = ([lat, lon]: [number, number]): [number, number] => [(lon - LON0) * KX, (LAT0 - lat) * KY];
  const line = (refs: number[]) => refs.map(r => pos.get(r)).filter(Boolean).map(p => proj(p!));

  // The country's full ring (with the sea boundary) decides which coastline is Bangladesh's.
  const chain = (segs: Array<Array<[number, number]>>, tol: number) => {
    const left = segs.filter(s => s.length > 1).map(s => [...s]);
    const out: Array<Array<[number, number]>> = [];
    const d = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    while (left.length) {
      let cur = left.shift()!;
      for (let grew = true; grew;) {
        grew = false;
        for (let i = 0; i < left.length; i++) {
          const s = left[i], h = cur[0], t = cur[cur.length - 1];
          if (d(t, s[0]) < tol) cur = [...cur, ...s.slice(1)];
          else if (d(t, s[s.length - 1]) < tol) cur = [...cur, ...[...s].reverse().slice(1)];
          else if (d(h, s[s.length - 1]) < tol) cur = [...s.slice(0, -1), ...cur];
          else if (d(h, s[0]) < tol) cur = [...[...s].reverse().slice(0, -1), ...cur];
          else continue;
          left.splice(i, 1); i--; grew = true;
        }
      }
      out.push(cur);
    }
    return out;
  };
  const full = chain([...ways.values()].filter(w => w.kind === 'border' || w.kind === 'sea').map(w => line(w.refs)), 0.05);
  const ring = full.sort((a, b) => b.length - a.length)[0];
  const inside = ([x, y]: [number, number]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const coast = [...ways.values()].filter(w => w.kind === 'coast').map(w => line(w.refs)).filter(l => l.length > 1 && inside(l[Math.floor(l.length / 2)]));
  const land = chain([...ways.values()].filter(w => w.kind === 'border').map(w => line(w.refs)).concat(coast), 1.5);

  // Douglas–Peucker to ~0.8 km, then SVG path data with one decimal.
  const simplify = (pts: Array<[number, number]>, eps: number): Array<[number, number]> => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    let best = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const dist = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / l;
      if (dist > best) { best = dist; idx = i; }
    }
    return best > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
  };
  const path = (pts: Array<[number, number]>, close: boolean) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') + (close ? 'Z' : '');
  const mainland = land.sort((a, b) => b.length - a.length)[0];
  const islands = land.slice(1).filter(l => l.length > 20 && Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < 2);
  const rivers = new Map<string, Array<[number, number]>[]>();
  for (const w of ways.values()) if (w.kind === 'river') { const k = w.name!.replace(/ River$/i, ''); if (!rivers.has(k)) rivers.set(k, []); rivers.get(k)!.push(line(w.refs)); }
  const all = [...mainland];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const box = [Math.min(...xs) - 10, Math.min(...ys) - 10, Math.max(...xs) - Math.min(...xs) + 20, Math.max(...ys) - Math.min(...ys) + 20].map(v => Math.round(v));
  const out = `// Generated by scripts/menu-map.ts from OpenStreetMap (© OpenStreetMap contributors, ODbL): Bangladesh
// for the menu map, simplified to ~0.8 km. Units are km from ${LAT0} N, ${LON0} E (x east, y south).
export const BD_VIEWBOX = [${box.join(', ')}] as const;
export const BD_LAT0 = ${LAT0}, BD_LON0 = ${LON0}, BD_KX = ${KX.toFixed(4)}, BD_KY = ${KY};
/** A latitude/longitude on the map. */
export const bdXY = (lat: number, lon: number): [number, number] => [(lon - BD_LON0) * BD_KX, (BD_LAT0 - lat) * BD_KY];
export const BD_LAND = '${path(simplify(mainland, 0.8), true)}';
export const BD_ISLANDS = ${JSON.stringify(islands.map(l => path(simplify(l, 0.8), true)).filter(d => d.length > 40))};
export const BD_DIVISIONS = ${JSON.stringify(chain([...ways.values()].filter(w => w.kind === 'division').map(w => line(w.refs)), 0.05).map(l => simplify(l, 1)).filter(l => l.length > 1 && inside(l[Math.floor(l.length / 2)])).map(l => path(l, false)))};
export const BD_RIVERS: Array<{ name: string; d: string }> = ${JSON.stringify([...rivers].map(([name, ls]) => ({ name, d: chain(ls, 0.3).map(l => path(simplify(l, 0.6), false)).join('') })))};
`;
  writeFileSync('src/ui/map/bdMap.ts', out);
  console.log(`land ${mainland.length} pts → bdMap.ts ${(out.length / 1024).toFixed(0)} KB, ${islands.length} islands, ${rivers.size} rivers`);
}
void main();
