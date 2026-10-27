// OSM helpers: indexing, road classification and the routing graph.
import type { OsmData, OsmNode, OsmWay } from './fetch';
import type { Projection } from './regions';

export interface Indexed {
  nodes: Map<number, OsmNode & { x: number; z: number }>;
  ways: OsmWay[];
}

export function indexOsm(data: OsmData, proj: Projection): Indexed {
  const nodes = new Map<number, OsmNode & { x: number; z: number }>();
  const ways: OsmWay[] = [];
  for (const el of data.elements) {
    if (el.type === 'node') { const [x, z] = proj.toXZ(el.lat, el.lon); nodes.set(el.id, { ...el, x, z }); }
    else if (el.type === 'way') ways.push(el);
  }
  return { nodes, ways };
}

export const DRIVABLE = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link', 'unclassified', 'residential', 'service', 'living_street',
]);
const DEFAULT_WIDTH: Record<string, number> = {
  motorway: 11, trunk: 10, primary: 8.5, secondary: 7.5, tertiary: 6.5, unclassified: 5.5, residential: 5,
  service: 3.5, living_street: 4.5,
};
const RANK: Record<string, number> = { motorway: 6, trunk: 5, primary: 4, secondary: 3, tertiary: 2, unclassified: 1, residential: 1 };

export const baseType = (hw: string) => hw.replace(/_link$/, '');
export const roadRank = (hw: string) => RANK[baseType(hw)] ?? 0;

let widthOverrides: Record<string, number> = {};
/** Per-Region carriageway widths for highway types without a lanes tag (e.g. Bandarban's narrow hill roads). */
export function setWidthOverrides(widths: Record<string, number> | undefined): void { widthOverrides = widths ?? {}; }

export function roadWidth(tags: Record<string, string>): number {
  const lanes = parseInt(tags.lanes ?? '', 10);
  if (lanes > 0) return lanes * 3.2;
  const w = widthOverrides[baseType(tags.highway)] ?? DEFAULT_WIDTH[baseType(tags.highway)] ?? 5;
  return tags.highway.endsWith('_link') ? Math.min(w, 6) : w;
}

export function wayLength(way: OsmWay, idx: Indexed): number {
  let len = 0;
  for (let i = 1; i < way.nodes.length; i++) {
    const a = idx.nodes.get(way.nodes[i - 1]), b = idx.nodes.get(way.nodes[i]);
    if (a && b) len += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return len;
}

/** A raised structure: a flyover, the expressway or a viaduct. Short layer-1 bridges over canals stay at grade. */
export function isElevated(way: OsmWay, idx: Indexed): boolean {
  const t = way.tags ?? {};
  const layer = parseInt(t.layer ?? '0', 10) || 0;
  const bridge = t.bridge && t.bridge !== 'no';
  if (layer >= 2) return true;
  return Boolean(bridge && layer >= 1 && wayLength(way, idx) > 120);
}

export function isOneway(tags: Record<string, string>): 0 | 1 | -1 {
  const o = tags.oneway;
  if (o === '-1') return -1;
  if (o === 'yes' || o === '1' || o === 'true' || tags.junction === 'roundabout' || tags.highway === 'motorway') return 1;
  return 0;
}

// ---------- routing ----------

interface Edge { to: number; cost: number; }

/** Directed graph over drivable ground-level roads. The expressway and other raised roads are excluded. */
export function buildGraph(idx: Indexed): Map<number, Edge[]> {
  const g = new Map<number, Edge[]>();
  const add = (a: number, b: number, cost: number) => { if (!g.has(a)) g.set(a, []); g.get(a)!.push({ to: b, cost }); };
  for (const w of idx.ways) {
    const t = w.tags ?? {};
    if (!t.highway || !DRIVABLE.has(t.highway) || baseType(t.highway) === 'motorway' || isElevated(w, idx)) continue;
    if (t.access === 'private' || t.access === 'no') continue;
    const dir = isOneway(t);
    const penalty = t.highway === 'service' ? 3 : t.highway === 'residential' ? 1.6 : 1;
    for (let i = 1; i < w.nodes.length; i++) {
      const a = idx.nodes.get(w.nodes[i - 1]), b = idx.nodes.get(w.nodes[i]);
      if (!a || !b) continue;
      const cost = Math.hypot(b.x - a.x, b.z - a.z) * penalty;
      if (dir >= 0) add(a.id, b.id, cost);
      if (dir <= 0) add(b.id, a.id, cost);
    }
  }
  return g;
}

export function dijkstra(g: Map<number, Edge[]>, src: number): { dist: Map<number, number>; prev: Map<number, number> } {
  const dist = new Map<number, number>([[src, 0]]), prev = new Map<number, number>();
  const heap: [number, number][] = [[0, src]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = (): [number, number] => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const e of g.get(u) ?? []) {
      const nd = d + e.cost;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u); push([nd, e.to]); }
    }
  }
  return { dist, prev };
}

/**
 * Removes detours where the path leaves a point and returns within `joinM` after more than
 * `minLoopM` of driving. These come from junctions where OSM doesn't connect a carriageway to
 * the road the bus turns onto, so the router goes on and U-turns, which a 12 m bus can't do.
 * Returns the new path and, for each removed node, the node that replaces it.
 */
export function cutUturnLoops(idx: Indexed, path: number[], joinM = 45, minLoopM = 250, window = 400): { path: number[]; replaced: Map<number, number>; cuts: string[] } {
  const xz = (id: number) => idx.nodes.get(id)!;
  const out: number[] = [], replaced = new Map<number, number>(), cuts: string[] = [];
  let i = 0;
  while (i < path.length) {
    const a = xz(path[i]);
    let cutTo = -1, along = 0;
    for (let j = i + 1; j < Math.min(path.length, i + window); j++) {
      const p = xz(path[j - 1]), q = xz(path[j]);
      along += Math.hypot(q.x - p.x, q.z - p.z);
      if (along > minLoopM && Math.hypot(q.x - a.x, q.z - a.z) < joinM) cutTo = j;
    }
    out.push(path[i]);
    if (cutTo > 0) {
      for (let k = i + 1; k < cutTo; k++) replaced.set(path[k], path[i]);
      cuts.push(`(${a.x.toFixed(0)}, ${a.z.toFixed(0)}): ${cutTo - i - 1} nodes`);
      i = cutTo;
    } else i++;
  }
  return { path: out, replaced, cuts };
}

/**
 * Routes through the Stops in order. Each Stop is snapped to one of its nearest graph nodes on a
 * major road; the candidates are chosen together (dynamic programming) so the Route uses the
 * correct carriageway of each dual carriageway instead of U-turning.
 */
export function routeThroughStops(
  idx: Indexed, g: Map<number, Edge[]>, stops: { x: number; z: number; radius?: number }[], candidates = 8, radius = 90,
): { path: number[]; stopNodes: number[] } {
  const major = new Set<number>();
  for (const w of idx.ways) {
    const hw = w.tags?.highway;
    if (hw && roadRank(hw) >= 2 && !isElevated(w, idx)) w.nodes.forEach(n => g.has(n) && major.add(n));
  }
  const cands = stops.map((s, i) => {
    const near = [...major]
      .map(id => { const n = idx.nodes.get(id)!; return { id, d: Math.hypot(n.x - s.x, n.z - s.z) }; })
      .filter(c => c.d < (s.radius ?? radius)).sort((a, b) => a.d - b.d).slice(0, candidates);
    if (!near.length) throw new Error(`Stop ${i} has no major-road node within ${s.radius ?? radius} m`);
    return near;
  });
  // DP over candidate choices; cost = road distance + snapping distance.
  let best = cands[0].map(c => ({ cost: c.d, chain: [c.id] }));
  const paths = new Map<string, number[]>();
  for (let i = 1; i < cands.length; i++) {
    const next = cands[i].map(() => ({ cost: Infinity, chain: [] as number[] }));
    best.forEach(b => {
      const from = b.chain[b.chain.length - 1];
      const { dist, prev } = dijkstra(g, from);
      cands[i].forEach((c, j) => {
        const d = dist.get(c.id);
        if (d === undefined) return;
        const total = b.cost + d + c.d;
        if (total < next[j].cost) {
          next[j] = { cost: total, chain: [...b.chain, c.id] };
          const p: number[] = [c.id];
          let cur = c.id;
          while (cur !== from) { cur = prev.get(cur)!; p.push(cur); }
          paths.set(`${from}>${c.id}`, p.reverse());
        }
      });
    });
    if (next.every(n => !Number.isFinite(n.cost))) throw new Error(`No route from Stop ${i - 1} to Stop ${i}`);
    best = next;
  }
  const win = best.reduce((a, b) => (b.cost < a.cost ? b : a));
  const path: number[] = [win.chain[0]];
  for (let i = 1; i < win.chain.length; i++) path.push(...paths.get(`${win.chain[i - 1]}>${win.chain[i]}`)!.slice(1));
  return { path, stopNodes: win.chain };
}
