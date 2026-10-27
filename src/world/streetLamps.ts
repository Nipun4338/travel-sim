// Night street lamps (SPEC §9): no real lights, just additive glow points at lamp height along
// both kerbs of the main roads, and faint pools of light on the road below. Two draw calls.
import * as THREE from 'three';
import { glowTexture, lightPoints } from '../render/atmosphere';
import type { LaneData } from '../shared/region';

const LIT = /^(motorway|trunk|primary|secondary)(_link)?$/;
const SPACING = 35;

export function streetLamps(lanes: LaneData): THREE.Object3D[] {
  const heads: number[] = [], pools: Array<[number, number, number]> = [];
  for (const w of lanes.ways) {
    if (!LIT.test(w.highway)) continue;
    let along = 0, next = SPACING / 2;
    for (let i = 1; i < w.points.length; i++) {
      const [ax, ay, az] = w.points[i - 1], [bx, by, bz] = w.points[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (!len) continue;
      const rx = -(bz - az) / len, rz = (bx - ax) / len;
      while (along + len >= next) {
        const t = (next - along) / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
        // One-way carriageways (dual roads) get lamps on their outer kerb only: with traffic on the
        // left, that is the left of the direction of travel (side −1 is left of node order).
        for (const side of w.dir === 0 ? [-1, 1] : [-w.dir]) {
          // Flyovers carry their lamps on the deck edge; at street level they stand on the kerb.
          const off = w.elevated ? w.width / 2 - 0.4 : w.width / 2 + 0.8;
          heads.push(x + rx * off * side, y + 8, z + rz * off * side);
          pools.push([x + rx * (off - 2.5) * side, y + 0.08, z + rz * (off - 2.5) * side]);
        }
        next += SPACING;
      }
      along += len;
    }
  }
  const glow = lightPoints(heads, 0xffd9a0, 7);
  const pool = new THREE.InstancedMesh(
    new THREE.CircleGeometry(5, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffcf88, map: glowTexture(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    pools.length,
  );
  const m = new THREE.Matrix4();
  pools.forEach(([x, y, z], i) => pool.setMatrixAt(i, m.makeTranslation(x, y, z)));
  pool.instanceMatrix.needsUpdate = true;
  pool.computeBoundingSphere();
  return [glow, pool];
}
