// Passengers at the station being served (SPEC §20, M13d): a waiting crowd queued at the platform
// screen doors; when the doors open, riders get off first and walk away along the platform, then
// the queue walks in through the nearest door. About one person per door per second, as on a metro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { LineStop, LineTrack } from '../shared/region';
import { doorOffsets, FLOOR_M, PLATFORM_EDGE_M } from '../shared/train';
import { onTrack } from './stations';

const MAX = 260, WALK = 1.25, PER_DOOR_S = 1.0;
// Shirts, kurtas, saris, salwar kameez and burqas: Dhaka crowd colours.
const CLOTHES = [0xf2f2ee, 0x2b3a55, 0x7b1e3a, 0x1f7a5a, 0xe0a020, 0x4a4a4f, 0xc8302a, 0x6a3d9a, 0x1b1b1d, 0x2e86c1, 0xd98c5f, 0x9cc3d5];

interface Agent {
  s: number; off: number;            // along the track and sideways from the rail centre
  toS: number; toOff: number;
  phase: 'wait' | 'board' | 'alight' | 'leave';
  door: number;                       // door index it uses
  color: THREE.Color;
}

function personGeometry(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(0.3, 0.8, 0.22).translate(0, 0.4, 0),     // legs / lower garment
    new THREE.BoxGeometry(0.42, 0.62, 0.26).translate(0, 1.11, 0),  // body
    new THREE.BoxGeometry(0.2, 0.22, 0.2).translate(0, 1.55, 0),    // head
  ].map(g => g.toNonIndexed());
  // Skin on the head, the clothing colour (per instance) elsewhere: vertex colours multiply it.
  parts.forEach((g, i) => {
    const n = g.getAttribute('position').count, col = new Float32Array(n * 3), c = new THREE.Color(i === 2 ? 0x8a5a3c : 0xffffff);
    for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  });
  return mergeGeometries(parts)!;
}

export class Passengers {
  private mesh: THREE.InstancedMesh;
  private agents: Agent[] = [];
  private track: LineTrack | null = null;
  private side = -1;
  private doors: number[] = [];
  private queue: number[] = [];        // per door: seconds until it can take the next person
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private UP = new THREE.Vector3(0, 1, 0);
  private tmp = new THREE.Vector3();
  private rnd = Math.random;
  /** Passengers on the train. */
  onboard = 0;
  boarded = 0;
  alighted = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(personGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), MAX);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  /** Fills the platform at `stop` with `waiting` people queued at its screen doors. */
  arrive(track: LineTrack, stop: LineStop, waiting: number): void {
    this.track = track;
    this.side = stop.side === 'right' ? 1 : -1;
    this.doors = doorOffsets().map(o => stop.stopS - o);
    this.queue = this.doors.map(() => 0);
    this.agents = [];
    for (let i = 0; i < Math.min(waiting, MAX - 40); i++) {
      const door = Math.floor(this.rnd() * this.doors.length), row = Math.floor(i / this.doors.length);
      const s = this.doors[door] + (this.rnd() - 0.5) * 1.6 + (row % 2 ? 0.6 : -0.6);
      const off = this.side * (PLATFORM_EDGE_M + 1.1 + Math.min(3, row * 0.55 + this.rnd() * 0.5));
      this.agents.push({ s, off, toS: s, toOff: off, phase: 'wait', door, color: new THREE.Color(CLOTHES[Math.floor(this.rnd() * CLOTHES.length)]) });
    }
  }

  /** Starts the exchange: `alight` riders get off first, then the waiting crowd boards. */
  open(alight: number): void {
    if (!this.track) return;
    for (let i = 0; i < Math.min(alight, MAX - this.agents.length); i++) {
      const door = i % this.doors.length;
      this.agents.push({ s: this.doors[door], off: this.side * (PLATFORM_EDGE_M - 1.2), toS: this.doors[door], toOff: this.side * (PLATFORM_EDGE_M - 1.2), phase: 'alight', door, color: new THREE.Color(CLOTHES[Math.floor(this.rnd() * CLOTHES.length)]) });
    }
    this.onboard = Math.max(0, this.onboard - alight);
    this.alighted += alight;
  }

  /** Still getting on or off (the doors shouldn't close yet). */
  get busy(): boolean { return this.agents.some(a => a.phase === 'board' || a.phase === 'alight' || (a.phase === 'wait' && this.doorsOpen)); }
  /** People still waiting on the platform (left behind if the doors close now). */
  get waiting(): number { return this.agents.filter(a => a.phase === 'wait' || a.phase === 'board').length; }
  private doorsOpen = false;

  update(dt: number, doorsOpen: boolean): void {
    this.doorsOpen = doorsOpen;
    if (!this.track) return;
    this.queue = this.queue.map(t => Math.max(0, t - dt));
    const alighting = this.agents.some(a => a.phase === 'alight');
    for (const a of this.agents) {
      if (a.phase === 'alight') {
        // Step out onto the platform, then walk off along it towards the nearer end.
        if (doorsOpen && this.queue[a.door] <= 0) { a.phase = 'leave'; a.toOff = this.side * (PLATFORM_EDGE_M + 1.6 + this.rnd() * 2); a.toS = a.s + (this.rnd() < 0.5 ? -1 : 1) * (40 + this.rnd() * 40); this.queue[a.door] = PER_DOOR_S; }
      } else if (a.phase === 'wait' && doorsOpen && !alighting && this.queue[a.door] <= 0) {
        a.phase = 'board'; a.toS = this.doors[a.door]; a.toOff = this.side * (PLATFORM_EDGE_M - 1.0); this.queue[a.door] = PER_DOOR_S;
      }
      // Walk: first sideways to the door line, then along (boarding); along then sideways (leaving).
      const step = WALK * dt;
      const ds = a.toS - a.s, doff = a.toOff - a.off;
      if (a.phase === 'leave') { if (Math.abs(doff) > 0.05) a.off += Math.sign(doff) * Math.min(step, Math.abs(doff)); else a.s += Math.sign(ds) * Math.min(step, Math.abs(ds)); }
      else { if (Math.abs(ds) > 0.05) a.s += Math.sign(ds) * Math.min(step, Math.abs(ds)); else a.off += Math.sign(doff) * Math.min(step, Math.abs(doff)); }
    }
    // Boarders who reach the car floor are on the train; leavers who walk far enough are gone.
    const before = this.agents.length;
    this.agents = this.agents.filter(a => {
      if (a.phase === 'board' && Math.abs(a.toOff - a.off) < 0.05 && Math.abs(a.toS - a.s) < 0.05) { this.onboard++; this.boarded++; return false; }
      return !(a.phase === 'leave' && Math.abs(a.toS - a.s) < 0.1);
    });
    void before;
    this.draw();
  }

  private draw(): void {
    const tr = this.track!;
    this.mesh.count = this.agents.length;
    this.agents.forEach((a, k) => {
      const { p, yaw } = onTrack(tr, a.s, a.off, this.tmp);
      const facing = a.phase === 'wait' || a.phase === 'board' ? yaw - this.side * Math.PI / 2 : a.phase === 'leave' && Math.abs(a.toOff - a.off) < 0.05 ? yaw + (a.toS > a.s ? 0 : Math.PI) : yaw + this.side * Math.PI / 2;
      this.q.setFromAxisAngle(this.UP, facing);
      this.m4.compose(p.setY(p.y + FLOOR_M), this.q, new THREE.Vector3(1, 1, 1));
      this.mesh.setMatrixAt(k, this.m4);
      this.mesh.setColorAt(k, a.color);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Clears the platform (the train has left this station). */
  leave(): void { this.agents = []; this.track = null; this.mesh.count = 0; }
}
