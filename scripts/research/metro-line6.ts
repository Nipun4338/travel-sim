// M13 research: what OSM has for Dhaka MRT Line 6 (stations, platforms, track ways and their tags),
// read from the local Geofabrik extract. Prints a Markdown summary.
//   npx tsx scripts/research/metro-line6.ts
import { createOSMStream } from 'osm-pbf-parser-node';
import { EXTRACT } from '../bake/pbf';

const BOX: [number, number, number, number] = [23.68, 90.33, 23.90, 90.46];   // south, west, north, east
const inBox = (lat: number, lon: number) => lat >= BOX[0] && lat <= BOX[2] && lon >= BOX[1] && lon <= BOX[3];
interface El { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; refs?: number[]; tags?: Record<string, string>; members?: Array<{ type: string; ref: number; role: string }>; }

const nodes = new Map<number, [number, number]>();
const stations: string[] = [];
const platforms: string[] = [];
const track = new Map<string, { ways: number; km: number }>();
const tagCount = new Map<string, number>();
const relations: string[] = [];
const metres = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180));
const METRO = (t: Record<string, string>) => t.railway === 'subway' || t.railway === 'light_rail' || t.subway === 'yes' || t.light_rail === 'yes' || t.station === 'subway' || t.station === 'light_rail' || /metro|mrt/i.test(t.network ?? '') || /metro|mrt/i.test(t.operator ?? '');

const stream = createOSMStream(EXTRACT, { withTags: true, withInfo: false });
for await (const item of stream as AsyncGenerator<El | object>) {
  const el = item as El, t = el.tags ?? {};
  if (el.type === 'node') {
    if (!inBox(el.lat!, el.lon!)) continue;
    nodes.set(el.id, [el.lat!, el.lon!]);
    if ((t.railway === 'station' || t.public_transport === 'station') && METRO(t))
      stations.push(`${t['name:en'] ?? t.name} · ${t.name ?? ''} @ ${el.lat!.toFixed(5)}, ${el.lon!.toFixed(5)} [${['railway', 'station', 'public_transport', 'level', 'layer'].filter(k => t[k]).map(k => `${k}=${t[k]}`).join(' ')}]`);
  } else if (el.type === 'way') {
    const pts = (el.refs ?? []).map(r => nodes.get(r)).filter(Boolean) as Array<[number, number]>;
    if (!pts.length) continue;
    if ((t.railway === 'platform' || t.public_transport === 'platform') && METRO(t)) platforms.push(`${t['name:en'] ?? t.name ?? '(unnamed)'} (${pts.length} nodes)`);
    if (t.railway === 'subway' || t.railway === 'light_rail' || ((t.railway === 'rail' || t.railway === 'construction') && METRO(t))) {
      const key = `${t.railway}${t.service ? `/${t.service}` : ''}${t.construction ? `/${t.construction}` : ''}`;
      const k = track.get(key) ?? { ways: 0, km: 0 };
      k.ways++;
      for (let i = 1; i < pts.length; i++) k.km += metres(pts[i - 1], pts[i]) / 1000;
      track.set(key, k);
      for (const tag of ['maxspeed', 'electrified', 'voltage', 'gauge', 'bridge', 'layer', 'railway:signal', 'railway:train_protection', 'name', 'usage', 'tracks']) if (t[tag]) tagCount.set(`${tag}=${t[tag]}`, (tagCount.get(`${tag}=${t[tag]}`) ?? 0) + 1);
    }
  } else if (el.type === 'relation' && (t.route === 'subway' || t.route === 'light_rail' || t.route === 'train') && METRO(t)) {
    const stops = (el.members ?? []).filter(m => /stop/.test(m.role)).length;
    relations.push(`${t.name ?? '(unnamed)'} · route=${t.route} · ${el.members?.length ?? 0} members, ${stops} stops · ${['from', 'to', 'ref', 'colour', 'operator'].filter(k => t[k]).map(k => `${k}=${t[k]}`).join(' ')}`);
  }
}

console.log('## Dhaka MRT in OSM (Geofabrik extract)\n');
console.log(`### Stations (${stations.length})\n${stations.map(s => `- ${s}`).join('\n')}\n`);
console.log(`### Platforms (${platforms.length})\n${platforms.slice(0, 40).map(s => `- ${s}`).join('\n')}\n`);
console.log(`### Track ways\n${[...track].map(([k, v]) => `- ${k}: ${v.ways} ways, ${v.km.toFixed(1)} km`).join('\n')}\n`);
console.log(`### Track tags\n${[...tagCount].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `- ${k}: ${n}`).join('\n')}\n`);
console.log(`### Route relations (${relations.length})\n${relations.map(s => `- ${s}`).join('\n')}`);
