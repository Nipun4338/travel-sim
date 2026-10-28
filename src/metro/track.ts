// Sampling a metro track (SPEC §20): position, heading and gradient at a distance `s` along it.
import * as THREE from 'three';
import type { LineTrack } from '../shared/region';

export class Track {
  readonly length: number;
  constructor(readonly data: LineTrack) { this.length = data.cum[data.cum.length - 1]; }

  /** Index of the segment containing `s` (binary search over the cumulative distances). */
  private seg(s: number): number {
    const c = this.data.cum;
    let lo = 0, hi = c.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c[mid] <= s) lo = mid; else hi = mid - 1; }
    return Math.max(0, Math.min(c.length - 2, lo));
  }

  /** The rail-top centre point at `s`. */
  at(s: number, out = new THREE.Vector3()): THREE.Vector3 {
    const i = this.seg(s), c = this.data.cum, p = this.data.points;
    const t = Math.max(0, Math.min(1, (s - c[i]) / ((c[i + 1] - c[i]) || 1)));
    return out.set(p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t, p[i][2] + (p[i + 1][2] - p[i][2]) * t);
  }

  /** Gradient (rise over run) at `s`, positive uphill in the direction of travel. */
  grade(s: number): number {
    const i = this.seg(s), p = this.data.points;
    const run = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][2] - p[i][2]) || 1;
    return (p[i + 1][1] - p[i][1]) / run;
  }

  /** The civil speed limit at `s`, km/h. */
  limit(s: number): number {
    for (const [a, b, v] of this.data.limits) if (s >= a && s <= b) return v;
    return 100;
  }
}
