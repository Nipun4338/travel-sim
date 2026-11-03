// Scripted low-poly traffic models (SPEC §7, §11). Each type is one merged, vertex-coloured
// geometry, drawn as an InstancedMesh. Parts coloured white take the per-instance colour; darker
// parts stay dark because instance colour multiplies vertex colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type VehicleType = 'bus' | 'cng' | 'car' | 'motorbike' | 'truck' | 'rickshaw' | 'jeep';

export interface VehicleSpec {
  length: number; width: number; height: number;
  /** Desired speed km/h, time headway s, and lane-change eagerness 0..1 (SPEC §7 "Dhaka aggression"). */
  speedKmh: number; headwayS: number; aggression: number;
  maxAccel: number; comfortDecel: number;
  tints: number[]; // instance colours
}

export const SPECS: Record<VehicleType, VehicleSpec> = {
  bus:       { length: 10.5, width: 2.5, height: 3.0, speedKmh: 32, headwayS: 1.0, aggression: 0.7, maxAccel: 1.2, comfortDecel: 2.0, tints: [0x2f7fbf, 0xc8302a, 0x2a8a4b, 0xe0a020, 0x7a3fa0] },
  cng:       { length: 2.7, width: 1.4, height: 1.7, speedKmh: 36, headwayS: 0.9, aggression: 0.9, maxAccel: 1.6, comfortDecel: 2.5, tints: [0xffffff] },
  car:       { length: 4.3, width: 1.8, height: 1.5, speedKmh: 40, headwayS: 1.5, aggression: 0.35, maxAccel: 2.0, comfortDecel: 2.5, tints: [0xf2f2f2, 0xb8bcc2, 0x2b2b2b, 0xb0302f, 0x2f5fa0, 0x8a8f96] },
  motorbike: { length: 2.0, width: 0.8, height: 1.5, speedKmh: 42, headwayS: 0.8, aggression: 0.8, maxAccel: 2.5, comfortDecel: 3.0, tints: [0xd62828, 0x1f5fbf, 0x2b2b2b, 0xf2c200] },
  truck:     { length: 7.2, width: 2.4, height: 3.1, speedKmh: 30, headwayS: 1.8, aggression: 0.25, maxAccel: 0.9, comfortDecel: 1.8, tints: [0xd62828, 0x2a8a4b, 0x1f5fbf, 0xf07f13] },
  rickshaw:  { length: 2.4, width: 1.1, height: 1.9, speedKmh: 12, headwayS: 1.2, aggression: 0, maxAccel: 0.8, comfortDecel: 2.0, tints: [0xd62828, 0x2a8a4b, 0x1f5fbf, 0xc2187a, 0xf2c200] },
  jeep:      { length: 4.0, width: 1.8, height: 2.1, speedKmh: 30, headwayS: 1.4, aggression: 0.4, maxAccel: 1.5, comfortDecel: 2.2, tints: [0x2a8a4b, 0x1f5fbf, 0xc8302a, 0xe8e2d0] },
};

// Model frame: +x forward, +y up, +z right, origin at ground level under the middle.
type Part = THREE.BufferGeometry;
function box(w: number, h: number, d: number, x: number, y: number, z: number, hex: number): Part {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  return paint(g, hex);
}
function cyl(r: number, len: number, x: number, y: number, z: number, hex: number, segs = 8): Part {
  const g = new THREE.CylinderGeometry(r, r, len, segs).toNonIndexed();
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return paint(g, hex);
}
function paint(g: THREE.BufferGeometry, hex: number): Part {
  const c = new THREE.Color(hex), n = g.getAttribute('position').count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}
const TINT = 0xffffff, GLASS = 0x2b3640, DARK = 0x1c1c1c, TYRE = 0x161616;
const wheelsAt = (xs: number[], zHalf: number, r: number) =>
  xs.flatMap(x => [cyl(r, 0.25, x, r, -zHalf, TYRE), cyl(r, 0.25, x, r, zHalf, TYRE)]);

function build(type: VehicleType): Part[] {
  switch (type) {
    case 'car': return [
      box(4.3, 0.7, 1.8, 0, 0.6, 0, TINT), box(2.3, 0.6, 1.66, -0.3, 1.2, 0, GLASS), box(2.1, 0.08, 1.6, -0.3, 1.52, 0, TINT),
      box(0.1, 0.18, 0.4, 2.15, 0.65, -0.6, 0xfff2c0), box(0.1, 0.18, 0.4, 2.15, 0.65, 0.6, 0xfff2c0),
      box(0.1, 0.18, 0.35, -2.15, 0.7, -0.6, 0xd11a1a), box(0.1, 0.18, 0.35, -2.15, 0.7, 0.6, 0xd11a1a),
      ...wheelsAt([1.35, -1.35], 0.8, 0.32),
    ];
    case 'cng': return [ // green CNG auto-rickshaw with its metal-grille cabin and canvas roof
      box(0.9, 0.9, 1.0, 0.85, 0.7, 0, 0x2a8a4b), box(0.05, 0.5, 0.9, 1.3, 1.05, 0, GLASS),
      box(1.6, 0.6, 1.36, -0.35, 0.6, 0, 0x2a8a4b), box(1.6, 0.7, 1.38, -0.35, 1.25, 0, 0x2f3a33),
      box(2.5, 0.08, 1.42, 0.05, 1.65, 0, DARK), box(0.6, 0.35, 0.02, -0.35, 0.95, -0.7, 0xf2c200),
      cyl(0.25, 0.18, 1.0, 0.25, 0, TYRE), ...wheelsAt([-0.7], 0.6, 0.25),
    ];
    case 'rickshaw': return [ // cycle rickshaw: rider, passenger seat, painted folding hood
      box(0.9, 0.06, 0.08, 0.75, 0.6, 0, DARK), cyl(0.33, 0.06, 1.2, 0.33, 0, TYRE),
      box(0.3, 0.6, 0.35, 0.75, 1.15, 0, 0xe8dcc0), box(0.22, 0.22, 0.22, 0.75, 1.6, 0, 0x6b4a33),
      box(0.8, 0.12, 1.0, -0.3, 0.75, 0, 0xc2187a), box(0.1, 0.6, 1.0, -0.65, 1.05, 0, 0xc2187a),
      box(0.9, 0.9, 1.06, -0.45, 1.55, 0, TINT), box(0.05, 0.5, 0.95, -0.92, 0.8, 0, 0xf2c200),
      ...wheelsAt([-0.4], 0.5, 0.35),
    ];
    case 'motorbike': return [
      box(1.4, 0.35, 0.3, 0, 0.6, 0, TINT), box(0.5, 0.25, 0.32, 0.35, 0.9, 0, TINT),
      box(0.35, 0.6, 0.4, -0.15, 1.15, 0, 0x2b3a55), box(0.24, 0.24, 0.26, -0.05, 1.6, 0, 0x1c1c1c),
      cyl(0.32, 0.12, 0.7, 0.32, 0, TYRE), cyl(0.32, 0.12, -0.7, 0.32, 0, TYRE),
    ];
    case 'truck': return [ // Bangladeshi truck: painted cab, wooden cargo body with truck-art bands
      box(1.9, 1.6, 2.3, 2.6, 1.55, 0, TINT), box(0.05, 0.7, 2.0, 3.56, 1.95, 0, GLASS),
      box(0.4, 0.5, 2.3, 3.4, 0.6, 0, DARK),
      box(5.0, 1.6, 2.4, -0.9, 1.75, 0, 0x8a5a2e), box(5.02, 0.3, 2.42, -0.9, 2.45, 0, 0xf2c200),
      box(5.02, 0.2, 2.42, -0.9, 1.15, 0, 0x2a8a4b), box(0.05, 1.4, 2.3, -3.42, 1.75, 0, 0xd62828),
      box(7.0, 0.3, 1.0, 0, 0.75, 0, DARK), ...wheelsAt([2.6, -1.6, -2.7], 1.05, 0.5),
    ];
    case 'jeep': return [ // chander gari: Willys-style front, open rear tub with benches and a canopy
      box(1.5, 0.75, 1.6, 1.15, 0.85, 0, TINT), box(0.05, 0.5, 1.5, 0.4, 1.45, 0, GLASS),
      box(2.4, 0.8, 1.75, -0.8, 0.85, 0, TINT), box(2.2, 0.15, 0.3, -0.8, 1.15, -0.65, 0x6b4a33),
      box(2.2, 0.15, 0.3, -0.8, 1.15, 0.65, 0x6b4a33),
      ...[-0.05, -1.95].flatMap(x => [box(0.06, 1.0, 0.06, x, 1.75, -0.82, DARK), box(0.06, 1.0, 0.06, x, 1.75, 0.82, DARK)]),
      box(2.1, 0.06, 1.75, -1.0, 2.27, 0, 0x3f5a3a), ...wheelsAt([1.25, -1.35], 0.85, 0.38),
    ];
    case 'bus': return [
      box(10.5, 1.3, 2.5, 0, 1.1, 0, TINT), box(10.52, 0.2, 2.52, 0, 1.65, 0, 0xf2c200),
      box(9.8, 0.95, 2.46, -0.2, 2.2, 0, GLASS), box(10.5, 0.35, 2.5, 0, 2.85, 0, TINT),
      box(0.06, 0.25, 1.6, 5.27, 2.82, 0, 0x111111), box(0.06, 1.1, 2.2, 5.26, 2.15, 0, GLASS),
      ...wheelsAt([3.2, -2.9], 1.1, 0.5),
    ];
  }
}

const cache = new Map<VehicleType, THREE.BufferGeometry>();
export function vehicleGeometry(type: VehicleType): THREE.BufferGeometry {
  let g = cache.get(type);
  if (!g) {
    g = mergeGeometries(build(type))!;
    g.computeVertexNormals();
    cache.set(type, g);
  }
  return g;
}

export const vehicleMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// Night lamps (SPEC §9): no real lights, just emissive quads and additive glow, instanced like the
// bodies. Per type: headlamps and tail lamps (x of the front and rear faces, lamp height, ±z), and
// the halo size around each. Rickshaws carry only rear reflectors.
interface LampLayout {
  head?: { x: number; y: number; z: number[]; w: number; h: number; halo: number };
  tail: { x: number; y: number; z: number[]; w: number; h: number; halo: number };
}
const LAMPS: Record<VehicleType, LampLayout> = {
  car:       { head: { x: 2.2, y: 0.65, z: [-0.6, 0.6], w: 0.4, h: 0.18, halo: 1.3 }, tail: { x: -2.2, y: 0.7, z: [-0.6, 0.6], w: 0.35, h: 0.18, halo: 0.8 } },
  cng:       { head: { x: 1.31, y: 0.9, z: [0], w: 0.22, h: 0.22, halo: 1.1 }, tail: { x: -1.16, y: 0.6, z: [-0.5, 0.5], w: 0.15, h: 0.12, halo: 0.6 } },
  rickshaw:  { tail: { x: -0.95, y: 0.8, z: [-0.35, 0.35], w: 0.1, h: 0.1, halo: 0.35 } },
  motorbike: { head: { x: 0.62, y: 1.0, z: [0], w: 0.2, h: 0.2, halo: 1.0 }, tail: { x: -0.71, y: 0.8, z: [0], w: 0.14, h: 0.1, halo: 0.5 } },
  truck:     { head: { x: 3.61, y: 0.75, z: [-0.85, 0.85], w: 0.35, h: 0.22, halo: 1.5 }, tail: { x: -3.46, y: 1.0, z: [-0.95, 0.95], w: 0.25, h: 0.2, halo: 0.9 } },
  jeep:      { head: { x: 1.91, y: 0.95, z: [-0.6, 0.6], w: 0.26, h: 0.26, halo: 1.3 }, tail: { x: -2.01, y: 0.8, z: [-0.7, 0.7], w: 0.2, h: 0.16, halo: 0.7 } },
  bus:       { head: { x: 5.28, y: 0.75, z: [-0.95, 0.95], w: 0.4, h: 0.25, halo: 1.6 }, tail: { x: -5.28, y: 0.9, z: [-1.0, 1.0], w: 0.25, h: 0.35, halo: 1.0 } },
};

/** A vertical quad facing +x (`front`) or −x, painted `hex`, keeping its UVs for the glow texture. */
function facing(w: number, h: number, x: number, y: number, z: number, hex: number, front: boolean): Part {
  const g = new THREE.PlaneGeometry(w, h).toNonIndexed();
  g.rotateY(front ? Math.PI / 2 : -Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}
function tint(g: THREE.BufferGeometry, hex: number): Part {
  const c = new THREE.Color(hex), n = g.getAttribute('position').count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const HEAD = 0xfff4d6, TAIL = 0x8a1010;
/** The lamp faces themselves: bright headlamps, dim tail lamps. */
export function lampGeometry(type: VehicleType): THREE.BufferGeometry {
  const { head, tail } = LAMPS[type];
  return mergeGeometries([
    ...(head?.z.map(z => facing(head.w, head.h, head.x, head.y, z, HEAD, true)) ?? []),
    ...tail.z.map(z => facing(tail.w, tail.h, tail.x, tail.y, z, type === 'rickshaw' ? 0x5a0c0c : TAIL, false)),
  ])!;
}

/** Additive glow: halos round the lamps, and a faint pool of light on the road ahead. */
export function glowGeometry(type: VehicleType): THREE.BufferGeometry {
  const { head, tail } = LAMPS[type];
  const parts = tail.z.map(z => facing(tail.halo, tail.halo, tail.x - 0.05, tail.y, z, 0x4a0808, false));
  if (head) {
    parts.push(...head.z.map(z => facing(head.halo, head.halo, head.x + 0.05, head.y, z, 0xb0a890, true)));
    const len = 4 + head.halo * 4, wide = head.z.length > 1 ? 3.2 : 2;
    const pool = new THREE.PlaneGeometry(len, wide).toNonIndexed();
    pool.rotateX(-Math.PI / 2);
    pool.translate(head.x + len / 2 - 0.5, 0.08, 0);
    parts.push(tint(pool, 0x2e2a20));
  }
  return mergeGeometries(parts)!;
}

/** Brake lamps: a brighter red halo over each tail lamp, drawn only while braking. */
export function brakeGeometry(type: VehicleType): THREE.BufferGeometry {
  const { tail } = LAMPS[type];
  return mergeGeometries(tail.z.map(z => facing(tail.halo * 0.9, tail.halo * 0.9, tail.x - 0.06, tail.y, z, 0xd01818, false)))!;
}

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#ffffff');
  r.addColorStop(0.25, '#9a9a9a');
  r.addColorStop(1, '#000000');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export const lampMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
export const glowMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true, map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});
