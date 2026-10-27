// Bake a Region: `npm run bake -- dhaka`. Raw downloads are cached in data/raw/; output goes to
// public/regions/<id>/ (both gitignored). See SPEC §4 and docs/build-plan.md (M2).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOD_COUNT, type ChunkEntry, type LaneData, type RegionManifest, type RouteData } from '../../src/shared/region';
import { buildBuildings, buildRoads, buildTerrain, buildTrees, buildWater, junctionGrid, landuseIndex, roadIndex } from './build';
import { encodeChunk, shortHash, writeHashed } from './export';
import { copernicusWindow, overpass } from './fetch';
import { ChunkGeometry, densify } from './geometry';
import { DRIVABLE, buildGraph, cutUturnLoops, indexOsm, isElevated, isOneway, routeThroughStops } from './osm';
import { REGIONS, projection } from './regions';
import { PointGrid, PolygonIndex } from './spatial';
import { groundSampler } from './terrain';

const CREDITS = [
  'Map data © OpenStreetMap contributors, ODbL (openstreetmap.org/copyright)',
  'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved',
];

async function main() {
  const id = process.argv[2] ?? 'dhaka';
  const region = REGIONS[id];
  if (!region) throw new Error(`Unknown region "${id}". Known: ${Object.keys(REGIONS).join(', ')}`);
  const raw = join('data', 'raw', id), out = join('public', 'regions', id);
  const proj = projection(region.origin);
  const [s, w, n, e] = region.bbox;
  const t0 = Date.now();

  console.log(`[1/6] Fetching roads, rail and bus stops (${region.bbox.join(', ')})`);
  const roadsRaw = await overpass(
    `[out:json][timeout:200];(way["highway"](${s},${w},${n},${e});way["railway"~"^(subway|light_rail|rail)$"](${s},${w},${n},${e});node["highway"="bus_stop"](${s},${w},${n},${e}););(._;>;);out body;`,
    join(raw, 'roads.json'),
  );
  const roads = indexOsm(roadsRaw, proj);
  console.log(`      ${roads.ways.length} ways, ${roads.nodes.size} nodes`);

  console.log('[2/6] Routing through the Stops');
  const stopXZ = region.stops.map(st => {
    const node = st.osmNode !== undefined ? roads.nodes.get(st.osmNode) : undefined;
    const [x, z] = node ? [node.x, node.z] : proj.toXZ(st.lat, st.lon);
    return { x, z };
  });
  const graph = buildGraph(roads);
  const routed = routeThroughStops(roads, graph, stopXZ);
  const { path, replaced, cuts } = cutUturnLoops(roads, routed.path);
  const stopNodes = routed.stopNodes.map(id => replaced.get(id) ?? id);
  console.log(`      cut ${cuts.length} U-turn detour(s)${cuts.length ? ': ' + cuts.join('; ') : ''}`);
  const routeXZ = path.map(id => { const nd = roads.nodes.get(id)!; return [nd.x, nd.z] as [number, number]; });

  console.log('[3/6] Fetching buildings and water along the Route');
  const step = Math.max(1, Math.floor(routeXZ.length / 120));
  const around = routeXZ.filter((_, i) => i % step === 0 || i === routeXZ.length - 1)
    .map(([x, z]) => proj.toLatLon(x, z).map(v => v.toFixed(6)).join(',')).join(',');
  const bldRaw = await overpass(
    `[out:json][timeout:200];(way["building"](around:${region.corridorM},${around});way["natural"="water"](around:${region.corridorM + 300},${around}););(._;>;);out body;`,
    join(raw, 'buildings.json'),
  );
  const blds = indexOsm(bldRaw, proj);
  console.log(`      ${blds.ways.length} ways`);
  const luRaw = await overpass(
    `[out:json][timeout:200];(way["landuse"](around:${region.corridorM + 300},${around});way["leisure"](around:${region.corridorM + 300},${around});way["natural"~"^(wood|scrub|grassland|sand)$"](around:${region.corridorM + 300},${around});way["amenity"~"^(parking|fuel|bus_station)$"](around:${region.corridorM + 300},${around});way["aeroway"~"^(apron|taxiway|runway)$"](around:${region.corridorM + 300},${around}););(._;>;);out body;`,
    join(raw, 'landuse.json'),
  );
  const landuse = indexOsm(luRaw, proj);
  console.log(`      ${landuse.ways.length} land-use ways`);

  console.log('[4/6] Reading the GLO-30 ground window');
  const dem = await copernicusWindow(region.bbox, join(raw, 'glo30.json'));
  const h = groundSampler(dem, proj);

  console.log('[5/6] Building geometry');
  const geo = new ChunkGeometry();
  const [xMin, zMax] = proj.toXZ(s, w), [xMax, zMin] = proj.toXZ(n, e);
  const ground = landuseIndex(landuse);
  buildTerrain(geo, h, ground, xMin, xMax, zMin, zMax);
  const majorRoads = roadIndex(roads, 2), allRoads = roadIndex(roads, 0);
  const onRoad = (x: number, z: number) => majorRoads.onRoad(x, z);
  const junctions = junctionGrid(roads);
  const rd = buildRoads(geo, roads, h, onRoad, junctions);
  console.log(`      ${rd.pillars} pillars (${rd.skipped} skipped for standing in a carriageway), ${rd.crossings} crossings, ${rd.footbridges} foot-over-bridges`);
  buildWater(geo, blds, h);
  const routeGrid = new PointGrid(region.corridorM);
  densify(routeXZ, 40).forEach(([x, z]) => routeGrid.add(x, z));
  const nearRoute = (x: number, z: number) => routeGrid.near(x, z, region.corridorM);
  const footprints = new PolygonIndex<true>(40);
  const nb = buildBuildings(geo, blds, h, nearRoute, onRoad, majorRoads, footprints);
  console.log(`      ${nb.built} buildings (${nb.droppedOnRoad} dropped for sitting in a major road), ${nb.signs} shop signs, ${nb.billboards} billboards`);
  const trees = buildTrees(geo, roads, h, nearRoute, allRoads, footprints, ground, junctions);
  console.log(`      ${trees} trees, ${geo.chunks.size} chunks`);

  // Route data: ground-level path through the chosen Stop nodes, graded like the road ribbons.
  const routePts = densify(routeXZ, 5);
  const points = routePts.map(([x, z]) => [x, h(x, z) + 0.13, z] as [number, number, number]);
  const cumKm = [0];
  for (let i = 1; i < points.length; i++) cumKm.push(cumKm[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]) / 1000);
  const stops = region.stops.map((st, i) => {
    const nd = roads.nodes.get(stopNodes[i])!;
    let best = 0, bd = Infinity;
    points.forEach((p, k) => { const d = (p[0] - nd.x) ** 2 + (p[2] - nd.z) ** 2; if (d < bd) { bd = d; best = k; } });
    return { name: st.name, osmNode: st.osmNode, index: best, km: +cumKm[best].toFixed(3), x: points[best][0], z: points[best][2] };
  });
  const legs = region.legEnds.slice(1).map((to, i) => ({ from: region.legEnds[i], to }));
  const route: RouteData = { name: region.routeName, points, cumKm, stops, legs };
  console.log(`      Route ${cumKm[cumKm.length - 1].toFixed(2)} km: ${stops.map(st => `${st.name} ${st.km.toFixed(1)}`).join(' · ')}`);

  const lanes: LaneData = {
    ways: roads.ways.filter(wy => wy.tags?.highway && DRIVABLE.has(wy.tags.highway)).map(wy => {
      const t = wy.tags!;
      const pts = wy.nodes.map(nid => roads.nodes.get(nid)).filter(Boolean).map(nd => [nd!.x, h(nd!.x, nd!.z) + 0.13, nd!.z] as [number, number, number]);
      return { id: wy.id, highway: t.highway, lanes: parseInt(t.lanes ?? '', 10) || (isOneway(t) ? 2 : 1), oneway: isOneway(t) !== 0, elevated: isElevated(wy, roads), nodes: wy.nodes, points: pts };
    }),
  };

  console.log('[6/6] Writing chunks');
  // Keep the folder itself (a running Vite dev server tracks it); stale files are removed at the end.
  mkdirSync(out, { recursive: true });
  const before = new Set(readdirSync(out));
  const chunks: ChunkEntry[] = [];
  let total = 0;
  for (const [key, lods] of geo.chunks) {
    const [cx, cz] = key.split('_').map(Number);
    const entry: ChunkEntry = { id: key, cx, cz, lods: [], bytes: [] };
    for (let lod = 0; lod < LOD_COUNT; lod++) {
      const glb = await encodeChunk(lods[lod]);
      entry.lods.push(writeHashed(out, `chunk_${key}_lod${lod}`, 'glb', glb));
      entry.bytes.push(glb.byteLength);
      total += glb.byteLength;
    }
    chunks.push(entry);
  }
  const routeFile = writeHashed(out, 'route', 'json', JSON.stringify(route));
  const lanesFile = writeHashed(out, 'lanes', 'json', JSON.stringify(lanes));
  const body = { region: id, origin: region.origin, chunkSize: 1000, chunks, route: routeFile, lanes: lanesFile, credits: CREDITS };
  const manifest: RegionManifest = { ...body, version: shortHash(JSON.stringify(body)) };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const keep = new Set(['manifest.json', routeFile, lanesFile, ...chunks.flatMap(c => c.lods)]);
  for (const f of before) if (!keep.has(f)) rmSync(join(out, f));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${chunks.length} chunks, ${(total / 1e6).toFixed(1)} MB of GLB`);
}

main().catch(err => { console.error(err); process.exit(1); });
