// Flight Mode lights (SPEC §9): runway edge, threshold and approach lights (night and murk), and at
// night Dhaka's street lights along the main roads, seen from the air as fixed-size points.
import type * as THREE from 'three';
import { lightPoints } from '../render/atmosphere';
import type { Runway } from '../shared/zone';

export function runwayLights(runways: Runway[], height: (x: number, z: number) => number): THREE.Object3D[] {
  const white: number[] = [], green: number[] = [], red: number[] = [];
  for (const r of runways) {
    const len = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z), ux = (r.b.x - r.a.x) / len, uz = (r.b.z - r.a.z) / len;
    const at = (along: number, across: number, out: number[], lift = 0.6) => {
      const x = r.a.x + ux * along - uz * across, z = r.a.z + uz * along + ux * across;
      out.push(x, height(x, z) + lift, z);
    };
    for (let s = 0; s <= len; s += 60) for (const side of [-1, 1]) at(s, side * (r.width / 2 + 2), white);
    for (let k = -8; k <= 8; k++) {
      at(-2, (k * r.width) / 16, green); at(len + 2, (k * r.width) / 16, green);   // thresholds, seen arriving
      at(2, (k * r.width) / 16, red); at(len - 2, (k * r.width) / 16, red);         // runway ends, seen rolling out
    }
    // Approach lights: a 900 m line on the extended centreline, with a crossbar 300 m out.
    for (const [from, dir] of [[0, -1], [len, 1]] as const) {
      for (let d = 30; d <= 900; d += 30) at(from + dir * d, 0, white, 2);
      for (let k = -5; k <= 5; k++) at(from + dir * 300, k * 3, white, 2);
    }
  }
  return [lightPoints(white, 0xfff6dc, 4, true), lightPoints(green, 0x40ff70, 4, true), lightPoints(red, 0xff3a2a, 4, true)];
}

/** Street lights every 40 m along the map's main roads. */
export function roadLights(roads: number[][], height: (x: number, z: number) => number): THREE.Object3D {
  const pts: number[] = [];
  for (const line of roads) {
    let carry = 0;
    for (let i = 2; i < line.length; i += 2) {
      const ax = line[i - 2], az = line[i - 1], bx = line[i], bz = line[i + 1], len = Math.hypot(bx - ax, bz - az);
      for (let d = 40 - carry; d < len; d += 40) {
        const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
        pts.push(x, height(x, z) + 8, z);
      }
      carry = (carry + len) % 40;
    }
  }
  return lightPoints(pts, 0xffc070, 2.5, true);
}
