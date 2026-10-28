// Tree species for the bake (SPEC §4 style: flat low-poly), so streets and hills don't repeat one
// shape: Dhaka's street trees (ashoka columns, wide rain trees, flame trees in bloom, mango, coconut
// and betel-nut palms), garden trees and banana plants, and Bandarban's forest (tall garjan and
// teak, bamboo clumps). Every tree varies in size, lean, rotation and colour.
import * as THREE from 'three';
import { ChunkGeometry, color, hash01 } from './geometry';
import type { ChunkLayer } from '../../src/shared/region';

export type Species = 'ashoka' | 'rainTree' | 'flame' | 'mango' | 'coconut' | 'betel' | 'banana' | 'bamboo' | 'forest';
export type TreeSetting = 'cityStreet' | 'cityGreen' | 'hillStreet' | 'hillForest';

const MIX: Record<TreeSetting, Array<[Species, number]>> = {
  cityStreet: [['ashoka', 30], ['rainTree', 20], ['mango', 14], ['flame', 12], ['coconut', 13], ['betel', 11]],
  cityGreen: [['mango', 30], ['rainTree', 18], ['coconut', 18], ['banana', 14], ['betel', 12], ['flame', 8]],
  hillStreet: [['forest', 30], ['bamboo', 22], ['banana', 16], ['betel', 12], ['mango', 12], ['coconut', 8]],
  hillForest: [['forest', 48], ['bamboo', 22], ['mango', 12], ['banana', 8], ['betel', 10]],
};

export function pickSpecies(setting: TreeSetting, seed: number): Species {
  const mix = MIX[setting], total = mix.reduce((s, [, w]) => s + w, 0);
  let r = hash01(seed * 1.37 + 11) * total;
  for (const [sp, w] of mix) if ((r -= w) < 0) return sp;
  return mix[0][0];
}

/** Typical crown radius (m) of a full-size tree, for keeping trunks back from the road. */
export function crownRadius(species: Species): number {
  return { ashoka: 1.6, rainTree: 5, flame: 4, mango: 3.6, coconut: 3, betel: 2, banana: 2.4, bamboo: 3.2, forest: 4 }[species];
}

const GREENS = [0x2f5a24, 0x3a6b2c, 0x46793a, 0x355f29, 0x4f8240].map(color);
const trunkC = color(0x5b4632), palmTrunkC = color(0x8a7a5e), frondC = color(0x5f8f3a), bananaC = color(0x7fb04a);
const bambooC = color(0x8fae4a), flameC = [0xd9452b, 0xe0632f, 0xc8381f].map(color);

const geo0 = {
  ico: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  trunk: new THREE.CylinderGeometry(0.7, 1, 1, 5).translate(0, 0.5, 0),
  frond: new THREE.BoxGeometry(0.5, 0.06, 1).translate(0, 0, 0.5),
  leaf: new THREE.BoxGeometry(0.55, 0.04, 1).translate(0, 0, 0.5),
  culm: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
};

/** Adds `g` transformed by position, rotation (degrees) and scale. */
function put(geo: ChunkGeometry, g: THREE.BufferGeometry, c: THREE.Color, lods: number[], x: number, y: number, z: number,
  rot: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1], layer: ChunkLayer = 'tree'): void {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180, 'YXZ')),
    new THREE.Vector3(...s));
  geo.mesh(g.clone().applyMatrix4(m), x, y, z, c, layer, lods);
}

const pick = <T>(list: T[], seed: number) => list[Math.floor(hash01(seed) * list.length) % list.length];
const tint = (c: THREE.Color, seed: number) => c.clone().multiplyScalar(0.88 + hash01(seed * 3.1) * 0.24);

/** One tree of `species` standing on the ground at (x, g, z). */
export function plantTree(geo: ChunkGeometry, species: Species, x: number, g: number, z: number, seed: number): void {
  const k = 0.75 + hash01(seed + 5) * 0.55;          // size
  const yaw = hash01(seed + 9) * 360;
  const lean = (hash01(seed + 13) - 0.5) * 8;
  const green = tint(pick(GREENS, seed + 2), seed);
  const trunk = (h: number, r: number, c = trunkC) => put(geo, geo0.trunk, c, [0], x, g, z, [lean * 0.5, yaw, 0], [r, h, r]);
  switch (species) {
    case 'ashoka': {                                   // tall dark-green column, Dhaka's commonest street tree
      const h = 9 * k;
      trunk(1.2, 0.18);
      put(geo, geo0.cone, tint(GREENS[0], seed), [0, 1], x, g + 1 + h / 2, z, [0, yaw, 0], [1.4 * k, h, 1.4 * k]);
      break;
    }
    case 'rainTree': case 'flame': {                   // a wide umbrella; the flame tree blooms red-orange
      const h = (species === 'flame' ? 4 : 5) * k, w = (species === 'flame' ? 3.2 : 4.2) * k;   // crown radius
      trunk(h, 0.35 * k);
      const c = species === 'flame' ? tint(pick(flameC, seed + 4), seed) : green;
      put(geo, geo0.ico1, c, [0, 1], x, g + h + 1.2 * k, z, [0, yaw, 0], [w, 1.8 * k, w * 0.9]);
      put(geo, geo0.ico, c.clone().multiplyScalar(0.9), [0], x + w * 0.35, g + h + 0.6 * k, z - w * 0.2, [0, yaw, 0], [w * 0.5, 1.2 * k, w * 0.5]);
      break;
    }
    case 'mango': {                                    // dense round crown on a short trunk (also jackfruit)
      const h = 2.6 * k, r = 3.4 * k;
      trunk(h, 0.3 * k);
      put(geo, geo0.ico1, green, [0, 1], x, g + h + r * 0.7, z, [0, yaw, 0], [r, r * 0.85, r]);
      break;
    }
    case 'coconut': case 'betel': {                    // slim palms; coconut curves and spreads, betel is straight
      const h = (species === 'coconut' ? 10 : 13) * k, bend = species === 'coconut' ? 10 + hash01(seed) * 12 : 2;
      const topX = x + Math.sin(yaw * Math.PI / 180) * h * Math.sin(bend * Math.PI / 180), topZ = z + Math.cos(yaw * Math.PI / 180) * h * Math.sin(bend * Math.PI / 180);
      put(geo, geo0.trunk, palmTrunkC, [0, 1], x, g, z, [bend, yaw, 0], [0.18, h, 0.18]);
      const n = species === 'coconut' ? 8 : 6, len = (species === 'coconut' ? 4.2 : 2.6) * k;
      for (let i = 0; i < n; i++) put(geo, geo0.frond, frondC, [0, 1], topX, g + h * Math.cos(bend * Math.PI / 180), topZ, [28 + hash01(seed + i) * 18, yaw + (i * 360) / n, 0], [k, 1, len]);
      break;
    }
    case 'banana': {                                   // a short stem and a few huge arching leaves
      const h = 2.2 * k;
      put(geo, geo0.trunk, bananaC.clone().multiplyScalar(0.8), [0], x, g, z, [0, yaw, 0], [0.16, h, 0.16]);
      for (let i = 0; i < 6; i++) put(geo, geo0.leaf, tint(bananaC, seed + i), [0, 1], x, g + h, z, [-20 - hash01(seed + i * 3) * 25, yaw + i * 60, 0], [2.2 * k, 1, 2.6 * k]);
      break;
    }
    case 'bamboo': {                                   // a clump of tall culms leaning outwards, under one feathery crown
      const n = 6 + Math.floor(hash01(seed) * 4), h = 10 * k;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 360 + hash01(seed + i) * 30, r = 0.6 + hash01(seed + i * 2) * 0.9, ang = a * Math.PI / 180;
        const ch = h * (0.7 + hash01(seed + i * 5) * 0.4);
        put(geo, geo0.culm, bambooC, [0], x + Math.sin(ang) * r, g, z + Math.cos(ang) * r, [14 + hash01(seed + i) * 10, a, 0], [0.12, ch, 0.12]);
      }
      put(geo, geo0.ico, tint(GREENS[4], seed), [0, 1], x, g + h * 0.85, z, [0, yaw, 0], [3.2 * k, 3.4 * k, 3.2 * k]);
      break;
    }
    case 'forest': {                                   // tall garjan / teak: a long trunk and a broken, layered crown
      const h = (7 + hash01(seed + 21) * 6) * k;
      trunk(h, 0.4 * k);
      for (let i = 0; i < 2; i++) {
        const a = (yaw + i * 180) * Math.PI / 180, o = 1.4 * k;
        put(geo, geo0.ico, tint(pick(GREENS, seed + i + 30), seed + i), [0, 1], x + Math.sin(a) * o, g + h + i * 1.2 * k, z + Math.cos(a) * o, [0, yaw + i * 40, 0], [3.4 * k, 2.4 * k, 3.4 * k]);
      }
      break;
    }
  }
}
