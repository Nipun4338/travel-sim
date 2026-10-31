// Roadside infill (polish spec §4): OSM maps the blocks behind Kuril and Khilkhet but few of the
// shophouses on the road itself, so the bus drove past empty ground. In the stretches a Region
// lists, gaps along the Route get low-rise retail lots, added as ordinary building ways so they take
// real heights, walls and street life like any OSM building.
import type { Ground } from './build';
import { hash01 } from './geometry';
import type { Indexed } from './osm';
import { PolygonIndex, type SegmentIndex } from './spatial';

export function infillFrontage(
  blds: Indexed, route: [number, number][], ranges: Array<{ fromKm: number; toKm: number }>,
  roads: SegmentIndex, elevated: SegmentIndex, ground: PolygonIndex<Ground>, cleared: (x: number, z: number) => boolean,
): number {
  const taken = new PolygonIndex<true>(40);
  for (const w of blds.ways) {
    if (!w.tags?.building || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    taken.add(w.nodes.slice(0, -1).map(id => blds.nodes.get(id)).filter(Boolean).map(n => ({ x: n!.x, y: n!.z })), true);
  }
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  const at = (s: number) => {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const [ax, az] = route[i - 1], [bx, bz] = route[i], len = cum[i] - cum[i - 1] || 1, f = (s - cum[i - 1]) / len;
    return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, tx: (bx - ax) / len, tz: (bz - az) / len };
  };
  const blocked = (x: number, z: number) =>
    !!taken.at(x, z) || roads.onRoad(x, z, 1) || elevated.onRoad(x, z, 4) || cleared(x, z) || ['green', 'sand'].includes(ground.at(x, z) ?? '');
  let added = 0, nextId = -1;
  for (const { fromKm, toKm } of ranges) for (const side of [-1, 1]) {
    for (let s = fromKm * 1000, k = 0; s < toKm * 1000; k++) {
      const r = (j: number) => hash01(Math.round(s) * 7 + side * 3 + j * 131);
      const p = at(s), nx = -p.tz * side, nz = p.tx * side;
      // The lot starts behind the farthest road edge within 45 m (past a median and the far
      // carriageway), plus a footpath.
      let edge = -1;
      for (let d = 0; d <= 45; d += 0.5) if (roads.onRoad(p.x + nx * d, p.z + nz * d)) edge = d;
      const width = 5 + r(1) * 4, depth = 9 + r(2) * 5;
      if (edge < 0) { s += width; continue; }
      const front = edge + 3.2;
      const corner = (u: number, v: number) => ({ x: p.x + p.tx * u + nx * (front + v), z: p.z + p.tz * u + nz * (front + v) });
      const ring = [corner(0, 0), corner(width, 0), corner(width, depth), corner(0, depth)];
      const probes = [...ring, corner(width / 2, depth / 2), corner(width / 2, 0), corner(width / 2, depth), corner(0, depth / 2), corner(width, depth / 2)];
      if (!probes.some(q => blocked(q.x, q.z))) {
        const ids = ring.map(q => { const id = nextId--; blds.nodes.set(id, { type: 'node', id, lat: 0, lon: 0, x: q.x, z: q.z }); return id; });
        blds.ways.push({ type: 'way', id: nextId--, nodes: [...ids, ids[0]], tags: { building: 'retail' } });
        taken.add(ring.map(q => ({ x: q.x, y: q.z })), true);
        added++;
      }
      s += width + 0.4;
    }
  }
  return added;
}
