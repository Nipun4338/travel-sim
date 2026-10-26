// Temporary test world until the bake script exists (M2): a Dhaka-style street and a
// Bandarban-style hairpin climb, both ported from the bus prototype.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Pose } from '../bus/Bus';

export interface TestStop { name: string; x: number; }

export interface TestTrack {
  spawns: { city: Pose; hill: Pose };
  stops: TestStop[];
}

const flat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export function buildTestTrack(scene: THREE.Scene, world: RAPIER.World): TestTrack {
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, collide = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color));
    m.position.set(x, y, z);
    scene.add(m);
    if (collide) world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z), fixed);
  };

  // Ground
  world.createCollider(RAPIER.ColliderDesc.cuboid(3000, 0.1, 3000).setTranslation(0, -0.1, 0).setFriction(1), fixed);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), flat(0x7f9a55));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Street: 4 lanes with a median; traffic drives on the left (z < 0 when heading +x).
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  box(780, 0.02, 14, 0x3d3d40, 330, 0.01, 0, false);
  box(780, 0.15, 2, 0xb9b4a8, 330, 0.075, -8, false);
  box(780, 0.15, 2, 0xb9b4a8, 330, 0.075, 8, false);
  box(780, 0.5, 0.6, 0xd9c84a, 330, 0.25, 0);
  for (let x = -55; x < 715; x += 9) {
    box(3, 0.02, 0.15, 0xffffff, x, 0.03, -3.5, false);
    box(3, 0.02, 0.15, 0xffffff, x, 0.03, 3.5, false);
  }
  const palette = [0xd8cbb5, 0xc9a27e, 0xe6e1d3, 0x9fb3c8, 0xd98c6c, 0xbfbfbf, 0xe8d28e, 0x8fae9b];
  for (const side of [-1, 1]) {
    for (let x = -60; x < 720;) {
      const w = 10 + rnd() * 12, d = 12 + rnd() * 14, h = 6 + rnd() * 30;
      box(w, h, d, palette[Math.floor(rnd() * palette.length)], x + w / 2, h / 2, side * (9.5 + d / 2 + rnd() * 3));
      x += w + 1 + rnd() * 4;
    }
  }
  const stops: TestStop[] = [{ name: 'Farmgate', x: 150 }, { name: 'Bijoy Sarani', x: 350 }, { name: 'Jahangir Gate', x: 550 }];
  for (const s of stops) {
    box(16, 0.03, 3.4, 0xf2c200, s.x, 0.035, -5.3, false);
    box(6, 0.15, 1.6, 0x2e6e9e, s.x, 2.6, -8.3, false);
  }

  // Hill road with switchback hairpins and low walls.
  const path = hillPath();
  const W = 6.5, WALL = 0.9;
  const verts: number[] = [], idx: number[] = [], roadIdx: number[] = [], wallIdx: number[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    const right = new THREE.Vector3(-t.z, 0, t.x);
    const L = path[i].clone().addScaledVector(right, -W / 2), R = path[i].clone().addScaledVector(right, W / 2);
    verts.push(L.x, L.y, L.z, R.x, R.y, R.z, L.x, L.y + WALL, L.z, R.x, R.y + WALL, R.z);
  }
  for (let i = 0; i < path.length - 1; i++) {
    const a = i * 4, b = (i + 1) * 4;
    roadIdx.push(a, a + 1, b, a + 1, b + 1, b);
    wallIdx.push(a, b, b + 2, a, b + 2, a + 2, a + 1, a + 3, b + 3, a + 1, b + 3, b + 1);
  }
  idx.push(...roadIdx, ...wallIdx);
  world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx)).setFriction(1), fixed);
  const mesh = (tris: number[], mat: THREE.Material) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(tris);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, mat));
  };
  mesh(roadIdx, flat(0x4a4a4c));
  const wallMat = flat(0xe8e8e8);
  wallMat.side = THREE.DoubleSide;
  mesh(wallIdx, wallMat);

  return {
    spawns: {
      city: { position: new THREE.Vector3(-40, 2.2, -3.5), yaw: 0 },
      hill: { position: new THREE.Vector3(path[0].x - 10, 2.2, path[0].z), yaw: 0 },
    },
    stops,
  };
}

function hillPath(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  let x = 780, y = 0.03, z = 0, h = 0;
  const step = 2;
  const push = () => pts.push(new THREE.Vector3(x, y, z));
  const straight = (len: number, g: number) => {
    for (let s = 0; s < len; s += step) { x += Math.cos(h) * step; z += Math.sin(h) * step; y += g * step; push(); }
  };
  const arc = (ang: number, r: number, g: number) => {
    const len = Math.abs(ang) * r, n = Math.ceil(len / step), dh = ang / n, ds = len / n;
    for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * ds; z += Math.sin(h) * ds; y += g * ds; push(); }
  };
  push();
  straight(60, 0); straight(40, 0.04); arc(0.4, 60, 0.06); arc(-0.4, 60, 0.06); straight(80, 0.08);
  arc(-Math.PI, 13, 0.03); straight(110, 0.08);
  arc(Math.PI, 13, 0.03); straight(110, 0.08);
  arc(-Math.PI, 13, 0.03); straight(60, 0.07); arc(0.6, 40, 0.06); arc(-0.9, 30, 0.06); straight(80, 0.05);
  arc(Math.PI / 2, 25, 0.04); straight(100, 0.02);
  return pts;
}
