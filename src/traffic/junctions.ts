// Timed junction phases with a traffic police figure (SPEC §7). Phase A lets traffic move along
// the bus Route's axis, phase B across it; both stop during the clearance gap.
import * as THREE from 'three';
import type { LaneData, RouteData } from '../shared/region';
import { TRAFFIC_HIGHWAYS } from './network';

export const JUNCTION_STOPS = ['Farmgate', 'Bijoy Sarani', 'Jahangir Gate', 'Mohakhali', 'Kakoli', 'Kuril Bishwa Road', 'Khilkhet'];
const PHASE_A = 30, PHASE_B = 20, CLEAR = 4, CYCLE = PHASE_A + CLEAR + PHASE_B + CLEAR;

export interface Junction {
  name: string;
  x: number; z: number;
  radius: number;
  axis: [number, number];  // unit vector of the Route's direction through the junction
  offset: number;          // phase offset, s
  figure: THREE.Group;
  arm: THREE.Mesh;
}

export interface JunctionState { stop: boolean; secondsLeft: number; }

export class Junctions {
  readonly list: Junction[] = [];
  private time = 0;

  constructor(lanes: LaneData, route: RouteData, scene: THREE.Scene) {
    // Nodes where three or more main-road ends or pass-throughs meet.
    const uses = new Map<number, number>(), pos = new Map<number, [number, number, number]>();
    for (const w of lanes.ways) {
      if (w.elevated || !TRAFFIC_HIGHWAYS.has(w.highway)) continue;
      w.nodes.forEach((n, i) => {
        uses.set(n, (uses.get(n) ?? 0) + (i === 0 || i === w.nodes.length - 1 ? 1 : 2));
        const p = w.points[w.nodeAt[i]];
        pos.set(n, [p[0], p[2], p[1]]);
      });
    }
    const candidates = [...uses].filter(([, n]) => n >= 3).map(([id]) => pos.get(id)!);
    for (const name of JUNCTION_STOPS) {
      const stop = route.stops.find(s => s.name === name);
      if (!stop) continue;
      const near = candidates.filter(([x, z]) => Math.hypot(x - stop.x, z - stop.z) < 220);
      if (!near.length) continue;
      near.sort((a, b) => Math.hypot(a[0] - stop.x, a[1] - stop.z) - Math.hypot(b[0] - stop.x, b[1] - stop.z));
      const seed = near[0], cluster = near.filter(([x, z]) => Math.hypot(x - seed[0], z - seed[1]) < 45);
      const x = cluster.reduce((s, p) => s + p[0], 0) / cluster.length, z = cluster.reduce((s, p) => s + p[1], 0) / cluster.length;
      const radius = Math.max(18, ...cluster.map(([px, pz]) => Math.hypot(px - x, pz - z) + 12));
      // Route direction at the nearest Route point.
      let k = 0, bd = Infinity;
      route.points.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[2] - z) ** 2; if (d < bd) { bd = d; k = i; } });
      const a = route.points[Math.max(0, k - 3)], b = route.points[Math.min(route.points.length - 1, k + 3)];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      const axis: [number, number] = [(b[0] - a[0]) / len, (b[2] - a[2]) / len];
      const { figure, arm } = policeFigure();
      // Stand on the corner to the left of the Route, clear of the carriageways.
      // At road level (the lane height): a metro Route runs up on the viaduct.
      figure.position.set(x - axis[1] * -radius * 0.85, seed[2], z + axis[0] * -radius * 0.85);
      scene.add(figure);
      this.list.push({ name, x, z, radius, axis, offset: (name.length * 7) % CYCLE, figure, arm });
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (const j of this.list) {
      const { stopA, stopB } = this.phase(j);
      // Face the approach being held, with the arm raised; arm down while both may go... never both go.
      const facing = stopA && !stopB ? j.axis : stopB && !stopA ? [-j.axis[1], j.axis[0]] : j.axis;
      j.figure.rotation.y = Math.atan2(-facing[1], facing[0]);
      j.arm.rotation.x = stopA && stopB ? 0.3 : -1.2;
    }
  }

  private phase(j: Junction): { stopA: boolean; stopB: boolean; t: number } {
    const t = (this.time + j.offset) % CYCLE;
    return { stopA: t >= PHASE_A, stopB: t < PHASE_A + CLEAR || t >= CYCLE - CLEAR, t };
  }

  /** Whether traffic heading (hx, hz) through junction `j` must stop, and for how long. */
  stateFor(j: Junction, hx: number, hz: number): JunctionState {
    const alongAxis = Math.abs(hx * j.axis[0] + hz * j.axis[1]) > 0.6;
    const { stopA, stopB, t } = this.phase(j);
    const stop = alongAxis ? stopA : stopB;
    const nextChange = alongAxis
      ? (t < PHASE_A ? PHASE_A - t : CYCLE - t)
      : (t < PHASE_A + CLEAR ? PHASE_A + CLEAR - t : t < CYCLE - CLEAR ? CYCLE - CLEAR - t : CYCLE - t + PHASE_A + CLEAR);
    return { stop, secondsLeft: nextChange };
  }

  /**
   * The junction ahead of a vehicle at (x, z) heading (hx, hz) within `lookahead` metres, with
   * the distance to its stop line (the edge of the junction circle).
   */
  ahead(x: number, z: number, hx: number, hz: number, lookahead: number): { j: Junction; dist: number } | null {
    let best: { j: Junction; dist: number } | null = null;
    for (const j of this.list) {
      const dx = j.x - x, dz = j.z - z, along = dx * hx + dz * hz, lateral = Math.abs(dx * hz - dz * hx);
      if (along <= 0 || lateral > j.radius) continue;
      const dist = along - j.radius;
      if (dist < -j.radius || dist > lookahead) continue;
      if (!best || dist < best.dist) best = { j, dist };
    }
    return best;
  }

  /** The junction whose circle contains (x, z), if any. */
  inside(x: number, z: number): Junction | null {
    return this.list.find(j => Math.hypot(j.x - x, j.z - z) < j.radius) ?? null;
  }
}

function policeFigure(): { figure: THREE.Group; arm: THREE.Mesh } {
  const m = (hex: number) => new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
  const g = new THREE.Group();
  const part = (geo: THREE.BufferGeometry, hex: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m(hex));
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  part(new THREE.CylinderGeometry(0.9, 1.0, 0.45, 12), 0xf2c200, 0, 0.22, 0);       // podium
  part(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 12), 0x1c1c1c, 0, 0.3, 0);       // podium band
  part(new THREE.BoxGeometry(0.3, 0.85, 0.4), 0x1f2a44, 0, 0.88, 0);                 // trousers
  part(new THREE.BoxGeometry(0.34, 0.65, 0.5), 0xd9e4ef, 0, 1.63, 0);                // shirt
  part(new THREE.BoxGeometry(0.36, 0.4, 0.52), 0xc8f000, 0, 1.68, 0);                // reflective vest
  part(new THREE.BoxGeometry(0.24, 0.26, 0.24), 0x7a5236, 0, 2.1, 0);                // head
  part(new THREE.BoxGeometry(0.3, 0.08, 0.3), 0xf4f4f4, 0, 2.27, 0);                 // cap
  const armGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  armGeo.translate(0, 0.35, 0);
  const arm = part(armGeo, 0xd9e4ef, 0.05, 1.9, 0.3);                                // signalling arm
  part(new THREE.BoxGeometry(0.12, 0.6, 0.12), 0xd9e4ef, 0, 1.55, -0.3);             // other arm
  return { figure: g, arm };
}
