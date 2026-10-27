// Trains and level crossings on the real OSM railway (SPEC §7 world detail): Bangladesh Railway
// trains (a locomotive and green coaches) on the main line, Dhaka Metro six-car sets on Line 6,
// and crossings whose booms come down and lights flash while a train is near. Closed crossings
// are reported so AI traffic stops and the bus can be warned.
import * as THREE from 'three';
import type { LevelCrossing, RailData, RailLine } from '../shared/region';

interface Line { kind: RailLine['kind']; pts: THREE.Vector3[]; cum: number[]; length: number; }
interface Train { line: Line; s: number; dir: 1 | -1; speed: number; cars: THREE.Mesh[]; carLen: number[]; }
interface Crossing { def: LevelCrossing; line: Line | null; s: number; booms: THREE.Object3D[]; lamps: THREE.MeshBasicMaterial[]; closed: boolean; }

const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** A railway car as one coloured mesh: body, band, windows, roof, bogies. Length along −z. */
function carGeometry(kind: 'loco' | 'coach' | 'metro'): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.deleteAttribute('uv');
    g.translate(x, y + h / 2, z);
    const c = new THREE.Color(color), col = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  };
  if (kind === 'loco') {
    // A Bangladesh Railway diesel: red body, cream band, dark cab windows at both ends.
    add(3, 3.2, 18, 0xb22222, 0, 0.9, 0); add(3.05, 0.5, 18.05, 0xe8dcc0, 0, 2.1, 0);
    for (const z of [-8.2, 8.2]) add(3.06, 0.8, 1.2, 0x22313f, 0, 3.0, z);
    add(2.6, 0.4, 15, 0x5a5a5a, 0, 4.1, 0);
  } else if (kind === 'coach') {
    // Intercity coach: dark green, cream stripe, a row of windows, grey roof.
    add(3, 3, 21.5, 0x2f6b3a, 0, 0.9, 0); add(3.05, 0.35, 21.6, 0xe8dcc0, 0, 1.9, 0); add(3.06, 0.7, 19, 0x22313f, 0, 2.5, 0);
    add(2.8, 0.35, 21, 0x7a7a7a, 0, 3.9, 0);
  } else {
    // Dhaka Metro MRT car: white, red and green bands, wide windows.
    add(3, 3.4, 21.5, 0xf4f2ec, 0, 0.9, 0); add(3.05, 0.35, 21.6, 0xc0392b, 0, 2.3, 0); add(3.05, 0.25, 21.6, 0x2a8a4b, 0, 1.95, 0);
    add(3.06, 0.9, 19, 0x34495e, 0, 2.75, 0);
  }
  for (const z of kind === 'loco' ? [-6, 6] : [-8, 8]) add(2.4, 0.9, 3, 0x2a2a2c, 0, 0, z);   // bogies
  const g = mergeAll(parts);
  g.computeBoundingSphere();
  return g;
}

function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], col: number[] = [], nor: number[] = [];
  for (const p of parts) { pos.push(...p.getAttribute('position').array); col.push(...p.getAttribute('color').array); nor.push(...p.getAttribute('normal').array); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const GEO = { loco: carGeometry('loco'), coach: carGeometry('coach'), metro: carGeometry('metro') };

export class Railways {
  private lines: Line[];
  private trains: Train[] = [];
  private crossings: Crossing[] = [];
  private group = new THREE.Group();
  private next = { rail: 20, metro: 8 };
  private time = 0;
  private rnd: () => number;

  constructor(scene: THREE.Scene, data: RailData, seed = 3) {
    scene.add(this.group);
    let s = seed;
    this.rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    this.lines = data.lines.filter(l => l.points.length > 40).map(l => {
      const pts = l.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      return { kind: l.kind, pts, cum, length: cum[cum.length - 1] };
    });
    for (const c of data.crossings) this.crossings.push(this.buildCrossing(c));
    // One train of each kind already on its way, so there's something to see from the start.
    for (const kind of ['rail', 'metro'] as const) this.spawn(kind, 0.25 + this.rnd() * 0.5);
  }

  /** Crossings whose booms are down, for traffic and the bus. */
  get closed(): Array<{ x: number; z: number }> { return this.crossings.filter(c => c.closed).map(c => ({ x: c.def.x, z: c.def.z })); }

  private sample(line: Line, s: number, out: THREE.Vector3): THREE.Vector3 {
    const t = Math.max(0, Math.min(line.length, s));
    let lo = 0, hi = line.cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (line.cum[mid] <= t) lo = mid; else hi = mid; }
    const f = (t - line.cum[lo]) / Math.max(0.001, line.cum[hi] - line.cum[lo]);
    return out.lerpVectors(line.pts[lo], line.pts[hi], f);
  }

  private spawn(kind: 'rail' | 'metro', at?: number): void {
    const candidates = this.lines.filter(l => l.kind === kind);
    if (!candidates.length) return;
    const line = candidates[Math.floor(this.rnd() * candidates.length)];
    const dir: 1 | -1 = this.rnd() < 0.5 ? 1 : -1;
    const cars: THREE.Mesh[] = [], carLen: number[] = [];
    const add = (geo: THREE.BufferGeometry, len: number) => { const m = new THREE.Mesh(geo, mat); this.group.add(m); cars.push(m); carLen.push(len); };
    if (kind === 'metro') for (let i = 0; i < 6; i++) add(GEO.metro, 22.5);
    else { add(GEO.loco, 19); const n = 8 + Math.floor(this.rnd() * 6); for (let i = 0; i < n; i++) add(GEO.coach, 22.5); }
    const total = carLen.reduce((a, b) => a + b, 0);
    const s = at !== undefined ? at * line.length : dir === 1 ? -total : line.length + total;
    // Main-line trains crawl through the city (~35 km/h); the metro runs at ~60 between stations.
    const speed = (kind === 'metro' ? 60 : 30 + this.rnd() * 15) / 3.6;
    this.trains.push({ line, s, dir, speed, cars, carLen });
  }

  private buildCrossing(def: LevelCrossing): Crossing {
    // Which line runs through it, and where along that line.
    let best: { line: Line; s: number; d: number } | null = null;
    for (const line of this.lines) line.pts.forEach((p, i) => {
      const d = Math.hypot(p.x - def.x, p.z - def.z);
      if (d < 15 && (!best || d < best.d)) best = { line, s: line.cum[i], d };
    });
    const g = new THREE.Group();
    g.position.set(def.x, def.y, def.z);
    g.rotation.y = -(def.roadHeadingDeg * Math.PI) / 180;
    this.group.add(g);
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const booms: THREE.Object3D[] = [], lamps: THREE.MeshBasicMaterial[] = [];
    const half = def.roadWidth / 2 + 1.2;
    // Booms on the kerb of each approach, 6 m before the track (road runs along −z).
    for (const side of [-1, 1]) {
      const z = side * 7, x = side * half;
      box(0.3, 1.2, 0.3, 0x333333, x, 0.6, z);
      const pivot = new THREE.Object3D();
      pivot.position.set(x, 1.1, z);
      g.add(pivot);
      const len = def.roadWidth / 2 + 0.6;
      for (let i = 0; i < 6; i++) box(len / 6, 0.12, 0.12, i % 2 ? 0xffffff : 0xc0392b, -side * (len / 12 + (i * len) / 6), 0, 0, pivot);
      booms.push(pivot);
      // Warning lights on a post, facing the traffic.
      box(0.15, 3, 0.15, 0x333333, x + side * 0.6, 1.5, z);
      for (const dx of [-0.3, 0.3]) {
        const m = new THREE.MeshBasicMaterial({ color: 0x3a0b0b });
        const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), m);
        lamp.position.set(x + side * 0.6 + dx, 2.8, z + side * 0.12);
        lamp.rotation.y = side > 0 ? 0 : Math.PI;
        g.add(lamp);
        lamps.push(m);
      }
      box(1.4, 0.5, 0.05, 0xf2c200, x + side * 0.6, 3.2, z, g);          // "RAIL CROSSING" sign board
    }
    return { def, line: best ? (best as { line: Line }).line : null, s: best ? (best as { s: number }).s : 0, booms, lamps, closed: false };
  }

  update(dt: number, viewer: THREE.Vector3): void {
    this.time += dt;
    for (const kind of ['rail', 'metro'] as const) {
      if ((this.next[kind] -= dt) <= 0) { this.spawn(kind); this.next[kind] = kind === 'metro' ? 90 + this.rnd() * 60 : 150 + this.rnd() * 120; }
    }
    const tmp = new THREE.Vector3(), ahead = new THREE.Vector3();
    this.trains = this.trains.filter(tr => {
      tr.s += tr.speed * tr.dir * dt;
      let off = 0, any = false;
      tr.cars.forEach((car, i) => {
        // Cars follow the head along the line; each faces along the track under it.
        const s = tr.s - tr.dir * (off + tr.carLen[i] / 2);
        off += tr.carLen[i];
        this.sample(tr.line, s, tmp);
        this.sample(tr.line, s + tr.dir * 2, ahead);
        car.position.copy(tmp);
        car.lookAt(ahead.x, tmp.y, ahead.z);
        car.rotateY(Math.PI);
        // Metro trains keep to the left track of the two on the viaduct.
        if (tr.line.kind === 'metro') car.translateX(2 * tr.dir);
        const visible = s > 0 && s < tr.line.length && tmp.distanceTo(viewer) < 3000;
        car.visible = visible;
        any ||= s > -50 && s < tr.line.length + 50;
      });
      const gone = !any && (tr.dir === 1 ? tr.s > tr.line.length : tr.s < 0);
      if (gone) tr.cars.forEach(c => this.group.remove(c));
      return !gone;
    });
    // Crossings close while any train is within 350 m approaching or has not yet cleared them.
    for (const c of this.crossings) {
      let closed = false;
      if (c.line) for (const tr of this.trains) {
        if (tr.line !== c.line) continue;
        const total = tr.carLen.reduce((a, b) => a + b, 0), rel = (c.s - tr.s) * tr.dir;
        if (rel < 350 && rel > -total - 20) closed = true;
      }
      c.closed = closed;
      const blink = Math.floor(this.time * 2.4) % 2;
      c.lamps.forEach((m, i) => m.color.setHex(closed && i % 2 === blink ? 0xff2a2a : 0x3a0b0b));
      for (const b of c.booms) {
        // Up is a quarter turn that swings the arm (which points across the road) skywards.
        const want = closed ? 0 : Math.PI / 2.1, side = b.position.x > 0 ? 1 : -1;
        b.rotation.z += (-side * want - b.rotation.z) * Math.min(1, dt * 1.5);
      }
    }
  }
}
