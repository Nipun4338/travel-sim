// Grid-hashed spatial lookups used by the bake.

type Pt = { x: number; y: number }; // y is the world z

export class PointGrid {
  private cells = new Map<string, Pt[]>();
  constructor(private cell: number) {}
  add(x: number, z: number): void {
    const k = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push({ x, y: z });
  }
  /** True if any point lies within `r` (r <= cell size). */
  near(x: number, z: number, r: number): boolean {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const p of this.cells.get(`${cx + i},${cz + j}`) ?? []) if ((p.x - x) ** 2 + (p.y - z) ** 2 < r * r) return true;
    }
    return false;
  }
}

/** Polygons with a payload; `at(x, z)` returns the payload of the smallest polygon containing the point. */
export class PolygonIndex<T> {
  private cells = new Map<string, number[]>();
  private polys: { ring: Pt[]; area: number; data: T }[] = [];
  constructor(private cell = 50) {}

  add(ring: Pt[], data: T): void {
    if (ring.length < 3) return;
    let area = 0;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a.x * b.y - b.x * a.y; }
    const id = this.polys.push({ ring, area: Math.abs(area / 2), data }) - 1;
    const xs = ring.map(p => p.x), zs = ring.map(p => p.y);
    const gx0 = Math.floor(Math.min(...xs) / this.cell), gx1 = Math.floor(Math.max(...xs) / this.cell);
    const gz0 = Math.floor(Math.min(...zs) / this.cell), gz1 = Math.floor(Math.max(...zs) / this.cell);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const k = `${gx},${gz}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(id);
      }
    }
  }

  at(x: number, z: number): T | undefined {
    let best: { area: number; data: T } | undefined;
    for (const id of this.cells.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`) ?? []) {
      const p = this.polys[id];
      if ((!best || p.area < best.area) && inside(p.ring, x, z)) best = p;
    }
    return best?.data;
  }
}

function inside(ring: Pt[], x: number, z: number): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Road centreline segments with half-widths; finds the nearest one to a point. */
export class SegmentIndex {
  private cells = new Map<string, number[]>();
  private segs: { ax: number; az: number; bx: number; bz: number; half: number }[] = [];
  constructor(private cell = 50) {}

  add(ax: number, az: number, bx: number, bz: number, half: number): void {
    const id = this.segs.push({ ax, az, bx, bz, half }) - 1;
    for (let gx = Math.floor((Math.min(ax, bx) - half) / this.cell); gx <= Math.floor((Math.max(ax, bx) + half) / this.cell); gx++) {
      for (let gz = Math.floor((Math.min(az, bz) - half) / this.cell); gz <= Math.floor((Math.max(az, bz) + half) / this.cell); gz++) {
        const k = `${gx},${gz}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(id);
      }
    }
  }

  /** Nearest segment within the 3×3 cells around the point, or null. */
  nearest(x: number, z: number): { dist: number; px: number; pz: number; half: number } | null {
    let best: { dist: number; px: number; pz: number; half: number } | null = null;
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const id of this.cells.get(`${cx + i},${cz + j}`) ?? []) {
        const s = this.segs[id];
        const dx = s.bx - s.ax, dz = s.bz - s.az, len2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / len2));
        const px = s.ax + dx * t, pz = s.az + dz * t, dist = Math.hypot(px - x, pz - z);
        if (!best || dist < best.dist) best = { dist, px, pz, half: s.half };
      }
    }
    return best;
  }

  /** True where (x, z) is on any segment's carriageway (within its half-width). */
  onRoad(x: number, z: number, margin = 0): boolean {
    for (const id of this.cells.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`) ?? []) {
      const s = this.segs[id];
      const dx = s.bx - s.ax, dz = s.bz - s.az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / len2));
      if (Math.hypot(s.ax + dx * t - x, s.az + dz * t - z) < s.half + margin) return true;
    }
    return false;
  }
}
