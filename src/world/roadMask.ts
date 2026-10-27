// Is a point on a road? Uses the baked lane data (every drivable way, with its carriageway width),
// so it doesn't depend on which collider the wheels happen to touch.
import type { LaneData } from '../shared/region';

const CELL = 50;

export class RoadMask {
  private cells = new Map<string, Array<[number, number, number, number, number]>>();

  constructor(lanes: LaneData) {
    for (const w of lanes.ways) {
      if (w.elevated) continue;
      const half = w.width / 2;
      for (let i = 1; i < w.points.length; i++) {
        const [ax, , az] = w.points[i - 1], [bx, , bz] = w.points[i];
        for (let gx = Math.floor((Math.min(ax, bx) - half) / CELL); gx <= Math.floor((Math.max(ax, bx) + half) / CELL); gx++) {
          for (let gz = Math.floor((Math.min(az, bz) - half) / CELL); gz <= Math.floor((Math.max(az, bz) + half) / CELL); gz++) {
            const key = `${gx},${gz}`;
            if (!this.cells.has(key)) this.cells.set(key, []);
            this.cells.get(key)!.push([ax, az, bx, bz, half]);
          }
        }
      }
    }
  }

  /** True if (x, z) is within `margin` metres of any carriageway. */
  onRoad(x: number, z: number, margin: number): boolean {
    for (const [ax, az, bx, bz, half] of this.cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? []) {
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      if (Math.hypot(ax + dx * t - x, az + dz * t - z) < half + margin) return true;
    }
    return false;
  }
}
