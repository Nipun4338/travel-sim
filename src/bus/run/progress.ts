import type { RouteData } from '../../shared/region';

/** Tracks the bus's nearest Route point, searching forward from the last match. */
export class RouteProgress {
  index: number;
  lateralM = 0;

  constructor(private route: RouteData, start: number) { this.index = start; }

  reset(start: number): void { this.index = start; this.lateralM = 0; }

  update(x: number, z: number): void {
    const pts = this.route.points;
    let best = this.index, bd = Infinity;
    for (let j = Math.max(0, this.index - 10); j < Math.min(pts.length, this.index + 60); j++) {
      const d = (pts[j][0] - x) ** 2 + (pts[j][2] - z) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    this.index = best;
    this.lateralM = Math.sqrt(bd);
  }
}
