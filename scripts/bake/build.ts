// Turns indexed OSM data and the ground sampler into chunk geometry (SPEC §4).
import * as THREE from 'three';
import { CHUNK_SIZE } from '../../src/shared/region';
import { ChunkGeometry, color, densify, hash01, type V3 } from './geometry';
import { DRIVABLE, isElevated, roadRank, roadWidth, type Indexed } from './osm';
import type { HeightSampler } from './terrain';

const C = {
  grass: color(0x7f9a55), road: color(0x3f3f42), roadMajor: color(0x37373a), rail: color(0x5a4a3f),
  deck: color(0xb8b4ab), deckSide: color(0x8f8b83), pillar: color(0x9a968e), water: color(0x3f7fa8),
  walls: [0xd8cbb5, 0xc9a27e, 0xe6e1d3, 0x9fb3c8, 0xd98c6c, 0xbfbfbf, 0xe8d28e, 0x8fae9b].map(color),
};
const ALL = [0, 1, 2];

// ---------- terrain ----------
export function buildTerrain(geo: ChunkGeometry, h: HeightSampler, xMin: number, xMax: number, zMin: number, zMax: number): void {
  const spacing = [20, 50, 100];
  const cx0 = Math.floor(xMin / CHUNK_SIZE), cx1 = Math.floor(xMax / CHUNK_SIZE);
  const cz0 = Math.floor(zMin / CHUNK_SIZE), cz1 = Math.floor(zMax / CHUNK_SIZE);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    spacing.forEach((s, lod) => {
      const n = CHUNK_SIZE / s;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x0 = cx * CHUNK_SIZE + i * s, z0 = cz * CHUNK_SIZE + j * s;
        const v = (x: number, z: number): V3 => [x, h(x, z), z];
        geo.quad(v(x0, z0), v(x0, z0 + s), v(x0 + s, z0 + s), v(x0 + s, z0), C.grass, 'terrain', [lod]);
      }
    });
  }
}

// ---------- roads, rail, elevated decks ----------
export function buildRoads(geo: ChunkGeometry, idx: Indexed, h: HeightSampler, onRoad: (x: number, z: number) => boolean): { pillars: number; skipped: number } {
  let pillars = 0, skipped = 0;
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    const isRoad = t.highway && DRIVABLE.has(t.highway);
    const isRail = t.railway && /^(subway|light_rail|rail)$/.test(t.railway);
    if (!isRoad && !isRail) continue;
    const flat = w.nodes.map(id => idx.nodes.get(id)).filter(Boolean).map(n => [n!.x, n!.z] as [number, number]);
    if (flat.length < 2) continue;
    const pts2 = densify(flat, 15);
    const elevated = isElevated(w, idx);
    const width = isRail ? (elevated ? 9 : 4) : roadWidth(t);

    if (elevated) {
      const layer = parseInt(t.layer ?? '1', 10) || 1;
      const deckH = isRail ? 12 : layer >= 3 ? 16 : layer === 2 ? 12 : 7;
      const pts = pts2.map(([x, z]) => [x, h(x, z) + deckH, z] as V3);
      geo.ribbon(pts, width, C.deck, 'deck', ALL, 1.2, C.deckSide);
      let acc = 0;
      for (let i = 1; i < pts2.length; i++) {
        acc += Math.hypot(pts2[i][0] - pts2[i - 1][0], pts2[i][1] - pts2[i - 1][1]);
        if (acc < 30) continue;
        acc = 0;
        const [x, z] = pts2[i], g = h(x, z);
        // OSM puts a flyover's centreline above the road beneath it; real pillars stand in
        // medians and verges, so skip any that would land in a carriageway.
        if ([[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dz]) => onRoad(x + dx, z + dz))) { skipped++; continue; }
        geo.box(x, z, 0.7, 0.7, g, g + deckH - 1.2, C.pillar, 'pillar', [0, 1]);
        pillars++;
      }
      continue;
    }
    const rank = isRail ? 0 : roadRank(t.highway);
    const lods = rank >= 4 ? ALL : rank >= 2 ? [0, 1] : [0];
    const lift = 0.12 + rank * 0.01; // major roads draw over minor ones at junctions
    const pts = pts2.map(([x, z]) => [x, h(x, z) + lift, z] as V3);
    geo.ribbon(pts, width, isRail ? C.rail : rank >= 4 ? C.roadMajor : C.road, 'road', lods);
  }
  return { pillars, skipped };
}

/**
 * True where (x, z) lies on the carriageway of a ground-level major road (tertiary and up).
 * Used to drop OSM "buildings" that sit in the road, such as foot-over-bridge stair landings.
 */
export function majorRoadMask(idx: Indexed): (x: number, z: number) => boolean {
  const CELL = 50;
  const grid = new Map<string, [number, number, number, number, number][]>();
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || roadRank(t.highway) < 2 || isElevated(w, idx)) continue;
    const half = roadWidth(t) / 2;
    for (let i = 1; i < w.nodes.length; i++) {
      const a = idx.nodes.get(w.nodes[i - 1]), b = idx.nodes.get(w.nodes[i]);
      if (!a || !b) continue;
      const seg: [number, number, number, number, number] = [a.x, a.z, b.x, b.z, half];
      const x0 = Math.floor((Math.min(a.x, b.x) - half) / CELL), x1 = Math.floor((Math.max(a.x, b.x) + half) / CELL);
      const z0 = Math.floor((Math.min(a.z, b.z) - half) / CELL), z1 = Math.floor((Math.max(a.z, b.z) + half) / CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const key = `${gx},${gz}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(seg);
      }
    }
  }
  return (x, z) => {
    for (const [ax, az, bx, bz, half] of grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? []) {
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      if (Math.hypot(ax + dx * t - x, az + dz * t - z) < half) return true;
    }
    return false;
  };
}

// ---------- buildings (OSM-only heights for now; SPEC §4 Google 2.5D is a follow-up) ----------
const DEFAULT_LEVELS: Record<string, number> = {
  house: 3, residential: 5, apartments: 7, commercial: 7, office: 9, retail: 3, industrial: 3, warehouse: 2,
  school: 4, hospital: 7, university: 5, mosque: 3, hotel: 9, yes: 5,
};

export function buildingHeight(id: number, tags: Record<string, string>): number {
  const height = parseFloat(tags.height ?? '');
  if (height > 0) return height;
  const levels = parseFloat(tags['building:levels'] ?? '');
  if (levels > 0) return levels * 3.2 + 1;
  const base = DEFAULT_LEVELS[tags.building] ?? 5;
  return (base + Math.floor(hash01(id) * 4) - 1) * 3.2 + 1; // per-type default ± a little variety
}

export function buildBuildings(
  geo: ChunkGeometry, idx: Indexed, h: HeightSampler, near: (x: number, z: number) => boolean, onRoad: (x: number, z: number) => boolean,
): { built: number; droppedOnRoad: number } {
  let count = 0, dropped = 0;
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.building || w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const ring = w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => new THREE.Vector2(n!.x, n!.z));
    if (ring.length < 3) continue;
    const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cz = ring.reduce((s, p) => s + p.y, 0) / ring.length;
    if (!near(cx, cz)) continue;
    if (onRoad(cx, cz) || ring.some(p => onRoad(p.x, p.y))) { dropped++; continue; }
    if (THREE.ShapeUtils.isClockWise(ring)) ring.reverse();
    const height = buildingHeight(w.id, t);
    const area = Math.abs(THREE.ShapeUtils.area(ring));
    const lods = height >= 30 ? ALL : height >= 15 || area > 600 ? [0, 1] : [0];
    const base = Math.min(...ring.map(p => h(p.x, p.y)));
    const top = base + height;
    const wall = C.walls[Math.floor(hash01(w.id + 7) * C.walls.length)];
    const roof = wall.clone().multiplyScalar(1.12);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      geo.quad([a.x, base, a.y], [a.x, top, a.y], [b.x, top, b.y], [b.x, base, b.y], wall, 'building', lods);
    }
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring, [])) {
      geo.tri([ring[i].x, top, ring[i].y], [ring[k].x, top, ring[k].y], [ring[j].x, top, ring[j].y], roof, 'building', lods);
    }
    count++;
  }
  return { built: count, droppedOnRoad: dropped };
}

// ---------- water (drawn just above the ground) ----------
export function buildWater(geo: ChunkGeometry, idx: Indexed, h: HeightSampler): void {
  for (const w of idx.ways) {
    if (w.tags?.natural !== 'water' || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const ring = w.nodes.slice(0, -1).map(id => idx.nodes.get(id)).filter(Boolean).map(n => new THREE.Vector2(n!.x, n!.z));
    if (ring.length < 3) continue;
    if (THREE.ShapeUtils.isClockWise(ring)) ring.reverse();
    const y = Math.min(...ring.map(p => h(p.x, p.y))) + 0.08;
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring, [])) {
      geo.tri([ring[i].x, y, ring[i].y], [ring[k].x, y, ring[k].y], [ring[j].x, y, ring[j].y], C.water, 'water', ALL);
    }
  }
}
