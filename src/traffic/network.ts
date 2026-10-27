// Lane network for AI traffic, built from the baked lane data (SPEC §7).
import type { LaneData, LaneWay } from '../shared/region';

export const TRAFFIC_HIGHWAYS = new Set([
  'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link',
]);

/** One direction of travel along a way. Lane 0 is the kerb (leftmost) lane: traffic drives on the left. */
export interface Path {
  way: LaneWay;
  forward: boolean;            // travelling in node order
  lanes: number;               // lanes in this direction
  laneWidth: number;
  pts: [number, number, number][]; // in travel order
  cum: number[];               // cumulative metres
  length: number;
  startNode: number;
  endNode: number;
}

export class LaneNetwork {
  readonly paths: Path[] = [];
  private byStartNode = new Map<number, Path[]>();

  constructor(data: LaneData) {
    for (const way of data.ways) {
      if (way.elevated || !TRAFFIC_HIGHWAYS.has(way.highway) || way.points.length < 2) continue;
      const dirs = way.dir === 0 ? [true, false] : [way.dir === 1];
      const lanesTotal = Math.max(1, way.lanes);
      const lanes = way.dir === 0 ? Math.max(1, Math.floor(lanesTotal / 2)) : lanesTotal;
      const laneWidth = way.dir === 0 ? way.width / 2 / lanes : way.width / lanes;
      for (const forward of dirs) {
        const pts = forward ? way.points : [...way.points].reverse();
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
        const path: Path = {
          way, forward, lanes, laneWidth, pts, cum, length: cum[cum.length - 1],
          startNode: forward ? way.nodes[0] : way.nodes[way.nodes.length - 1],
          endNode: forward ? way.nodes[way.nodes.length - 1] : way.nodes[0],
        };
        this.paths.push(path);
        if (!this.byStartNode.has(path.startNode)) this.byStartNode.set(path.startNode, []);
        this.byStartNode.get(path.startNode)!.push(path);
      }
    }
  }

  /** Lateral offset of a lane from the way centreline, + = right of travel. */
  laneOffset(p: Path, lane: number): number {
    const fromKerb = (lane + 0.5) * p.laneWidth;
    return p.way.dir === 0 ? -(p.lanes * p.laneWidth) + fromKerb : -p.way.width / 2 + fromKerb;
  }

  /** Position and heading at distance `s` along a path. */
  sample(p: Path, s: number, out: { x: number; y: number; z: number; hx: number; hz: number }): void {
    const c = p.cum;
    let i = 1;
    while (i < c.length - 1 && c[i] < s) i++;
    const a = p.pts[i - 1], b = p.pts[i], seg = c[i] - c[i - 1] || 1, t = Math.max(0, Math.min(1, (s - c[i - 1]) / seg));
    out.x = a[0] + (b[0] - a[0]) * t; out.y = a[1] + (b[1] - a[1]) * t; out.z = a[2] + (b[2] - a[2]) * t;
    out.hx = (b[0] - a[0]) / seg; out.hz = (b[2] - a[2]) / seg;
  }

  /**
   * Where to go after `p`: paths leaving its end node, excluding a U-turn back down the same way.
   * Prefers going straight on.
   */
  next(p: Path, rnd: number): Path | null {
    const options = (this.byStartNode.get(p.endNode) ?? []).filter(q => q.way !== p.way);
    if (!options.length) return null;
    const [ax, , az] = p.pts[p.pts.length - 2], [bx, , bz] = p.pts[p.pts.length - 1];
    const turn = (q: Path) => {
      const [cx, , cz] = q.pts[0], [dx, , dz] = q.pts[Math.min(1, q.pts.length - 1)];
      const h1 = Math.atan2(bz - az, bx - ax), h2 = Math.atan2(dz - cz, dx - cx);
      return Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)));
    };
    options.sort((a, b) => turn(a) - turn(b));
    if (turn(options[0]) < 0.5 && rnd < 0.65) return options[0];
    const turns = options.filter(q => turn(q) < 2.4); // no hairpin reversals
    return turns.length ? turns[Math.floor(rnd * 997) % turns.length] : options[0];
  }
}
