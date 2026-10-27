// Scripted low-poly landmark models (SPEC §10), built from photo references in flat colours. Each
// is merged into one vertex-coloured mesh (one draw call). Model frame: origin at the landmark's
// point on the ground, long axis along −z (rotated to the landmark's heading when placed), +y up.
// Hero ≤ 8k triangles, simple ≤ 1.5k.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const D2R = Math.PI / 180;

/** Collects transformed, coloured primitives and merges them. */
class Kit {
  private parts: THREE.BufferGeometry[] = [];
  private c = new THREE.Color();

  add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, opts: { rx?: number; ry?: number; rz?: number; sx?: number; sy?: number; sz?: number } = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((opts.rx ?? 0) * D2R, (opts.ry ?? 0) * D2R, (opts.rz ?? 0) * D2R)),
      new THREE.Vector3(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1),
    );
    g.applyMatrix4(m);
    this.c.setHex(color);
    const n = g.getAttribute('position').count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([this.c.r, this.c.g, this.c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  /** A box standing on y (its base), centred on x/z. */
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, ry = 0): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, { ry });
  }

  cyl(rTop: number, rBot: number, h: number, seg: number, color: number, x: number, y: number, z: number, opts: { rx?: number; rz?: number; ry?: number } = {}): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, x, y + h / 2, z, opts);
  }

  /** A dome (half sphere) sitting on y. */
  dome(r: number, color: number, x: number, y: number, z: number, seg = 12, sy = 1): this {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, { sy });
  }

  /** A hip or pyramid roof: a cone with `sides` faces, sitting on y. */
  roof(w: number, d: number, h: number, color: number, x: number, y: number, z: number, sides = 4, ry = 45): this {
    const r = sides === 4 ? Math.SQRT1_2 : 0.5;
    return this.add(new THREE.ConeGeometry(1, 1, sides), color, x, y + h / 2, z, { ry, sx: w * r, sy: h, sz: d * r });
  }

  done(): THREE.BufferGeometry {
    const g = mergeGeometries(this.parts, false)!;
    g.computeBoundingSphere();
    return g;
  }
}

const C = {
  concrete: 0xb9b3a8, marble: 0xf0eee6, white: 0xf4f2ec, glass: 0x5d86a5, darkGlass: 0x34495e, steel: 0x9aa3ab, roofWhite: 0xd8dde3,
  pink: 0xd58aa0, maroon: 0x7b1e3a, brick: 0xa0523d, sand: 0xd9cbb0, gold: 0xd4a92c, red: 0xc0392b, green: 0x2a8a4b, olive: 0x6b7a3a,
  wood: 0x7a5230, thatch: 0x9c7a46, rock: 0x6b6a63, water: 0x8fc4e0, foam: 0xf2f8fb, tile: 0xb5452f, dark: 0x2a2a2c, cream: 0xe8dcc0,
};

// ---------------- Dhaka Route ----------------

function farmgateMetro(k: Kit): void {
  const L = 180, deck = 12;
  for (let z = -L / 2 + 10; z <= L / 2 - 10; z += 30) for (const x of [-6, 6]) k.box(2, deck, 2, C.concrete, x, 0, z);
  k.box(16, 2, L, C.concrete, 0, deck, 0);                          // track deck
  k.box(26, 1, L - 20, C.concrete, 0, deck - 4, 0);                 // concourse floor
  k.box(26, 3, L - 20, C.glass, 0, deck - 3, 0);                    // concourse glazing
  for (const x of [-11, 11]) k.box(4, 1, L - 30, C.marble, x, deck + 2, 0); // side platforms
  k.add(new THREE.CylinderGeometry(15, 15, L - 30, 10, 1, true, 0, Math.PI), C.roofWhite, 0, deck + 5, 0, { rx: 90, rz: 90, sy: 1, sx: 0.45 });
  for (const s of [-1, 1]) k.box(6, 1, 30, C.concrete, s * 16, deck / 2 - 1, s * (L / 2 - 30), 0); // stair landings
  for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(5, 1, 26), C.concrete, s * 16, deck / 4, s * (L / 2 - 52), { rx: s * 22 });
  // A six-car MRT train at the platform: white, with the red and green Dhaka Metro bands.
  for (let i = 0; i < 6; i++) {
    const z = -60 + i * 22;
    k.box(3, 3.6, 21.5, C.white, -3.5, deck + 2, z);
    k.box(3.05, 0.4, 21.6, C.red, -3.5, deck + 3.4, z);
    k.box(3.05, 0.3, 21.6, C.green, -3.5, deck + 3.0, z);
    k.box(3.06, 0.9, 19, C.darkGlass, -3.5, deck + 4.2, z);
  }
}

function airportT3(k: Kit): void {
  const L = 420, W = 140;
  k.box(W, 18, L, C.marble, 0, 0, 0);
  k.box(2, 14, L - 20, C.glass, -W / 2 - 0.5, 2, 0);                 // landside glass wall
  for (let i = 0; i < 5; i++) {                                     // five wave-shaped roof bays
    const z = -L / 2 + 42 + i * 84;
    k.add(new THREE.CylinderGeometry(42, 42, W + 16, 16, 1, false, 0, Math.PI), C.roofWhite, 0, 18, z, { rz: 90, sy: 1, sx: 0.28 });
  }
  for (const z of [-140, 0, 140]) {                                 // airside piers and jet bridges
    k.box(120, 12, 30, C.marble, W / 2 + 60, 0, z);
    k.box(120, 2, 32, C.roofWhite, W / 2 + 60, 12, z);
    for (const s of [-1, 1]) for (let x = 0; x < 3; x++) k.box(3, 3, 18, C.steel, W / 2 + 30 + x * 35, 5, z + s * 24);
  }
  k.box(30, 10, 60, C.concrete, -W / 2 - 25, 0, 0);                 // drop-off canopy
  k.box(36, 1.2, 70, C.roofWhite, -W / 2 - 25, 10, 0);
}

function jahangirGate(k: Kit): void {
  // Spans the road: pillars clear of the carriageway, the bus passes underneath.
  for (const s of [-1, 1]) {
    k.box(5, 12, 5, C.sand, s * 17, 0, 0);
    k.box(6, 1.2, 6, C.olive, s * 17, 12, 0);
    k.roof(6, 6, 3, C.olive, s * 17, 13.2, 0);
  }
  k.box(40, 4, 4, C.sand, 0, 12.5, 0);
  k.box(40.4, 0.8, 4.4, C.olive, 0, 16.5, 0);
  k.box(14, 3, 1, C.olive, 0, 17.3, 0);                             // name board
}

function novoTheatre(k: Kit): void {
  k.cyl(34, 36, 8, 24, C.marble, 0, 0, 0);
  k.dome(30, C.roofWhite, 0, 8, 0, 20, 0.9);
  k.box(24, 9, 16, C.glass, 0, 0, -36);
  k.box(28, 1, 20, C.marble, 0, 9, -36);
}

// ---------------- Dhaka Flight Zone ----------------

function sangsadBhaban(k: Kit): void {
  k.cyl(100, 100, 1, 8, C.concrete, 0, 0, 0, { ry: 22.5 });         // plinth
  k.cyl(42, 45, 46, 8, C.concrete, 0, 1, 0, { ry: 22.5 });          // the central assembly hall
  for (const y of [12, 24, 36]) k.cyl(45.6, 45.6, 0.8, 8, C.marble, 0, y, 0, { ry: 22.5 }); // marble bands
  for (let i = 0; i < 8; i++) {
    const a = (i * 45) * D2R, r = 68, x = Math.sin(a) * r, z = -Math.cos(a) * r;
    if (i % 2 === 0) {
      k.box(34, 36, 26, C.concrete, x, 1, z, -i * 45);              // office blocks on the axes
      // The great circular openings, as dark discs on the outer face.
      k.add(new THREE.CylinderGeometry(9, 9, 0.6, 16), C.dark, Math.sin(a) * (r + 13.4), 20, -Math.cos(a) * (r + 13.4), { rx: 90, ry: -i * 45 });
    } else {
      k.cyl(16, 16, 32, 12, C.concrete, x, 1, z);                   // rounded towers on the diagonals
      k.add(new THREE.ConeGeometry(7, 12, 3), C.dark, Math.sin(a) * (r + 15.4), 18, -Math.cos(a) * (r + 15.4), { rx: 90, ry: -i * 45, rz: 180, sz: 0.1 });
    }
  }
}

function ahsanManzil(k: Kit): void {
  k.box(120, 17, 18, C.pink, 0, 0, 0);
  for (const y of [7.5, 16]) k.box(121, 0.8, 18.6, C.marble, 0, y, 0);  // white cornices
  k.box(30, 19, 24, C.pink, 0, 0, -4);                              // central block
  for (let i = 0; i < 6; i++) k.box(30 - i * 2, 1, 4, C.marble, 0, i, -18 - i * 2); // grand stairs
  k.cyl(7, 7, 6, 12, C.pink, 0, 19, -4);                            // drum
  k.dome(8, C.maroon, 0, 25, -4, 14, 1.25);                         // the dome
  k.add(new THREE.ConeGeometry(0.8, 5, 6), C.gold, 0, 37.5, -4);
  for (const s of [-1, 1]) k.box(14, 19, 22, C.pink, s * 53, 0, 0);  // end wings
}

function shaheedMinar(k: Kit): void {
  k.box(70, 2, 46, C.marble, 0, 0, 0);
  for (let i = 0; i < 6; i++) k.box(70 - i * 6, 0.35, 2, C.marble, 0, i * 0.35, 24 + i);
  k.add(new THREE.CylinderGeometry(7, 7, 0.4, 24), C.red, 0, 11, 10, { rx: 90 }); // the red sun behind
  const slab = (x: number, h: number, w: number) => { k.box(w, h, 0.9, C.white, x, 2, 6); };
  slab(-14, 9, 2.2); slab(-9, 11, 2.2); slab(9, 11, 2.2); slab(14, 9, 2.2);
  // The tall central pair, bending forward at the top like a mother bowing over her children.
  slab(-2.2, 15, 2.6); slab(2.2, 15, 2.6);
  k.add(new THREE.BoxGeometry(7, 5, 0.9), C.white, 0, 18.6, 4.6, { rx: -35 });
}

function hatirjheelBridge(k: Kit): void {
  const L = 90, n = 12;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, z0 = -L / 2 + t0 * L, z1 = -L / 2 + t1 * L;
    const y0 = 3 + Math.sin(t0 * Math.PI) * 4, y1 = 3 + Math.sin(t1 * Math.PI) * 4, len = Math.hypot(z1 - z0, y1 - y0);
    const tilt = -Math.atan2(y1 - y0, z1 - z0) / D2R;
    k.add(new THREE.BoxGeometry(8, 0.8, len + 0.2), C.white, 0, (y0 + y1) / 2, (z0 + z1) / 2, { rx: tilt });
    for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.3, 1.2, len + 0.2), C.steel, s * 4, (y0 + y1) / 2 + 1, (z0 + z1) / 2, { rx: tilt });
  }
  // The arch above the deck.
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI, a1 = ((i + 1) / 10) * Math.PI, R = 30;
    const z0 = -Math.cos(a0) * R, y0 = 3 + Math.sin(a0) * 14, z1 = -Math.cos(a1) * R, y1 = 3 + Math.sin(a1) * 14;
    k.add(new THREE.BoxGeometry(1, 1, Math.hypot(z1 - z0, y1 - y0) + 0.3), C.white, 0, (y0 + y1) / 2 + 4, (z0 + z1) / 2, { rx: -Math.atan2(y1 - y0, z1 - z0) / D2R });
  }
}

function bashundharaCity(k: Kit): void {
  k.box(110, 32, 90, C.cream, 0, 0, 0);
  for (let y = 4; y < 32; y += 8) k.box(111, 2.5, 91, C.glass, 0, y, 0);
  k.box(40, 78, 40, C.glass, 25, 32, 15);
  for (let y = 36; y < 108; y += 10) k.box(40.6, 1, 40.6, C.cream, 25, y, 15);
  k.box(30, 6, 30, C.cream, 25, 110, 15);
}

function baitulMukarram(k: Kit): void {
  k.box(70, 3, 70, C.marble, 0, 0, 0);
  k.box(40, 40, 40, C.marble, 0, 3, 0);                             // the cube, after the Kaaba
  k.box(40.4, 2, 40.4, C.dark, 0, 35, 0);
  k.box(60, 10, 30, C.marble, 50, 0, 0);                            // prayer hall annex
  for (let x = 25; x <= 75; x += 10) k.box(1.2, 8, 1.2, C.sand, x, 0, -15.5);
}

function lalbaghFort(k: Kit): void {
  const W = 220, D = 120;
  k.box(W, 6, 2, C.brick, 0, 0, -D / 2); k.box(W, 6, 2, C.brick, 0, 0, D / 2);
  k.box(2, 6, D, C.brick, -W / 2, 0, 0); k.box(2, 6, D, C.brick, W / 2, 0, 0);
  k.box(18, 14, 8, C.brick, 0, 0, D / 2);                            // south gate
  k.box(8, 9, 8.5, C.dark, 0, 0, D / 2);
  // Pari Bibi's tomb: square, a central dome and four corner turrets.
  k.box(22, 12, 22, C.sand, 0, 0, 0);
  k.cyl(6, 6, 3, 8, C.sand, 0, 12, 0);
  k.dome(6.5, C.gold, 0, 15, 0, 12, 1.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.cyl(1.6, 1.6, 15, 8, C.sand, sx * 11, 0, sz * 11); k.dome(1.8, C.sand, sx * 11, 15, sz * 11, 8); }
  // Three-domed mosque to the west, Diwan-i-Aam to the east.
  k.box(34, 10, 14, C.brick, -75, 0, -20);
  for (const x of [-86, -75, -64]) k.dome(4.5, C.brick, x, 10, -20, 10, 1.1);
  k.box(32, 12, 16, C.brick, 75, 0, 10);
  k.box(32.6, 1, 16.6, C.sand, 75, 12, 10);
}

function sadarghatLaunches(k: Kit): void {
  // Multi-deck river launches moored side by side, bows into the Buriganga.
  for (let i = 0; i < 5; i++) {
    const x = -36 + i * 18, z = 70, col = [C.white, C.cream, C.white, 0xe8eef2, C.cream][i];
    k.box(13, 4, 62, C.dark, x, -2, z);
    k.box(13.4, 1, 62.4, i % 2 ? C.red : C.glass, x, 2, z);
    k.box(12, 3.4, 52, col, x, 3, z + 3);
    k.box(11, 3.2, 44, col, x, 6.4, z + 5);
    k.box(9, 2.6, 22, col, x, 9.6, z + 8);
    k.box(12.2, 0.6, 52, 0x2e86c1, x, 5.2, z + 3);
    k.cyl(1, 1, 3, 8, C.dark, x, 12.2, z + 12);
  }
}

function airportTerminal(k: Kit): void {
  const L = 480, W = 90;
  k.box(W, 14, L, C.marble, 0, 0, 0);
  for (let i = 0; i < 12; i++) {                                    // the vaulted shell roofs
    const z = -L / 2 + 20 + i * 40;
    k.add(new THREE.CylinderGeometry(20, 20, W + 6, 12, 1, false, 0, Math.PI), C.roofWhite, 0, 14, z, { rz: 90, sy: 1, sx: 0.5 });
  }
  k.box(1.5, 10, L - 10, C.glass, -W / 2 - 0.5, 2, 0);
  k.cyl(4, 5, 42, 10, C.marble, W / 2 + 60, 0, -L / 2 + 40);         // control tower
  k.cyl(9, 7, 6, 10, C.glass, W / 2 + 60, 42, -L / 2 + 40);
  k.cyl(10, 10, 1, 10, C.roofWhite, W / 2 + 60, 48, -L / 2 + 40);
}

// ---------------- Bandarban ----------------

function chimbuk(k: Kit): void {
  // Tourist Centre rest house, a viewing pavilion, and the telecom tower on the summit.
  k.box(30, 7, 12, C.cream, 0, 0, 0);
  k.roof(32, 14, 5, C.tile, 0, 7, 0);
  k.box(12, 4, 10, C.cream, 18, 0, 8);
  k.roof(13, 11, 3, C.tile, 18, 4, 8);
  for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; k.box(0.4, 3.5, 0.4, C.wood, -20 + Math.cos(a) * 4, 0, 10 + Math.sin(a) * 4); }
  k.box(9, 0.4, 9, C.wood, -20, 0, 10);
  k.roof(10, 10, 3, C.tile, -20, 3.5, 10, 6, 0);
  for (let i = 0; i < 6; i++) {                                     // red and white lattice tower
    const h = 8, r0 = 3.2 - i * 0.45, r1 = r0 - 0.45;
    k.cyl(r1, r0, h, 4, i % 2 ? C.white : C.red, 30, i * h, -18, { ry: 45 });
  }
  k.add(new THREE.CylinderGeometry(0.15, 0.15, 10, 4), C.steel, 30, 53, -18);
}

function shoiloPropat(k: Kit): void {
  // Rock face uphill of the road with the falls, a pool, and roadside stalls.
  const rock = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 9; i++) k.add(rock, C.rock, 24 + (i % 3) * 5, 2 + Math.floor(i / 3) * 6, -6 + (i % 3) * 6 - 6, { sx: 7, sy: 6, sz: 7, ry: i * 37 });
  for (let i = 0; i < 4; i++) k.box(3.5 - i * 0.4, 5, 0.6, i % 2 ? C.foam : C.water, 21 - i * 0.3, 14 - i * 4.5, -3, 90);
  k.cyl(7, 7, 0.4, 12, C.water, 17, 0.1, -3);
  for (let i = 0; i < 4; i++) {                                     // bamboo stalls with thatched roofs
    const z = -18 + i * 10;
    k.box(6, 2.4, 5, C.thatch, -9, 0, z);
    k.roof(7.5, 6.5, 2.4, C.wood, -9, 2.4, z);
    k.box(5, 0.8, 0.6, C.red, -9, 1, z - 2.8);
  }
}

function milonchhari(k: Kit): void {
  k.box(9, 0.6, 9, C.concrete, 12, 0, 0);
  for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; k.box(0.35, 3, 0.35, C.wood, 12 + Math.cos(a) * 3.8, 0.6, Math.sin(a) * 3.8); }
  k.roof(9.5, 9.5, 3, C.green, 12, 3.6, 0, 6, 0);
  k.box(9, 1, 0.2, C.wood, 12, 0.6, -4.5);
}

function bandarbanBusStand(k: Kit): void {
  for (let z = -20; z <= 20; z += 8) for (const x of [-12, -20]) k.box(0.5, 5, 0.5, C.steel, x, 0, z);
  k.box(10, 0.5, 46, C.green, -16, 5, 0);
  k.box(5, 3, 4, C.cream, -24, 0, -26);
  k.box(5.4, 0.4, 4.4, C.red, -24, 3, -26);
  k.box(9, 0.4, 44, C.concrete, -16, 0, 0);
}

function buddhaDhatuJadi(k: Kit): void {
  // The golden temple: three white terraces, a Burmese-style gilded stupa, corner stupas and
  // tiered roofs over the four stairways.
  k.box(46, 3, 46, C.marble, 0, 0, 0);
  k.box(36, 3, 36, C.marble, 0, 3, 0);
  k.box(26, 3, 26, C.cream, 0, 6, 0);
  k.cyl(8, 9, 4, 8, C.gold, 0, 9, 0, { ry: 22.5 });
  k.cyl(6.5, 7.5, 3, 8, C.gold, 0, 13, 0, { ry: 22.5 });
  k.add(new THREE.SphereGeometry(6, 14, 8), C.gold, 0, 19, 0, { sy: 0.85 });
  for (let i = 0; i < 6; i++) k.cyl(2.6 - i * 0.35, 2.8 - i * 0.35, 1.4, 12, C.gold, 0, 23 + i * 1.4, 0);
  k.add(new THREE.ConeGeometry(0.9, 9, 10), C.gold, 0, 35, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(1.6, 2, 2, 8, C.gold, sx * 15, 9, sz * 15);
    k.add(new THREE.ConeGeometry(1.4, 6, 8), C.gold, sx * 15, 14, sz * 15);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 90, x = Math.sin(a * D2R) * 22, z = -Math.cos(a * D2R) * 22;
    for (let t = 0; t < 3; t++) k.box(9 - t * 2.2, 1.2, 9 - t * 2.2, t % 2 ? C.gold : C.red, x, 3 + t * 1.6, z, a);
  }
}

function nilgiri(k: Kit): void {
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 15) * D2R, x = Math.cos(a) * 32, z = Math.sin(a) * 32;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.4, 2, 0.4, C.wood, x + sx * 4, 0, z + sz * 3);
    k.box(10, 3.5, 8, C.cream, x, 2, z);
    k.roof(11, 9, 3, C.tile, x, 5.5, z);
  }
  k.cyl(10, 10, 0.4, 16, C.concrete, 0, 0, 0);                        // helipad
  k.cyl(7, 7, 0.45, 16, C.dark, 0, 0, 0);
  for (const s of [-1, 1]) k.box(0.8, 0.5, 5, C.white, s * 1.6, 0.1, 0);
  k.box(3.2, 0.5, 0.8, C.white, 0, 0.1, 0);
}

function nilachal(k: Kit): void {
  for (let t = 0; t < 3; t++) k.box(30 - t * 7, 1.5, 18 - t * 4, C.concrete, 0, t * 1.5, 0);
  for (const x of [-8, 8]) {
    for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; k.box(0.35, 3, 0.35, C.wood, x + Math.cos(a) * 3.2, 4.5, Math.sin(a) * 3.2); }
    k.roof(8, 8, 2.6, C.red, x, 7.5, 0, 6, 0);
  }
}

function meghlaBridge(k: Kit): void {
  // A suspension footbridge over the lake: two towers each end, a sagging deck, cables above.
  const L = 120, sag = 3, n = 16;
  for (const s of [-1, 1]) for (const x of [-1.6, 1.6]) { k.box(0.6, 8, 0.6, C.red, x, 0, s * L / 2); }
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, z0 = -L / 2 + t0 * L, z1 = -L / 2 + t1 * L;
    const yd = (t: number) => 3 - sag * Math.sin(t * Math.PI), yc = (t: number) => 8 - (sag + 3) * Math.sin(t * Math.PI);
    const len = z1 - z0;
    k.add(new THREE.BoxGeometry(2.4, 0.25, len + 0.1), C.wood, 0, (yd(t0) + yd(t1)) / 2, (z0 + z1) / 2, { rx: -Math.atan2(yd(t1) - yd(t0), len) / D2R });
    for (const x of [-1.6, 1.6]) {
      k.add(new THREE.BoxGeometry(0.12, 0.12, len + 0.2), C.steel, x, (yc(t0) + yc(t1)) / 2, (z0 + z1) / 2, { rx: -Math.atan2(yc(t1) - yc(t0), len) / D2R });
      if (i % 2 === 0) k.box(0.06, yc(t0) - yd(t0), 0.06, C.steel, x, yd(t0), z0);
    }
  }
}

function sanguBoats(k: Kit): void {
  // Long wooden country boats nosed into the bank at the ghat, a couple with bamboo canopies.
  for (let i = 0; i < 6; i++) {
    const x = -25 + i * 9, z = 18 + (i % 2) * 4;
    k.add(new THREE.CylinderGeometry(1.4, 1.4, 14, 6, 1, false, Math.PI / 2, Math.PI), C.wood, x, -0.2, z, { rx: 90, sx: 1, sz: 0.8 });
    k.box(2.6, 0.25, 12, i % 3 === 0 ? C.red : 0x2e86c1, x, 0.6, z);
    if (i % 2 === 0) k.add(new THREE.CylinderGeometry(1.3, 1.3, 5, 8, 1, true, 0, Math.PI), C.thatch, x, 1.1, z + 1, { rx: 90, rz: 90, sx: 1 });
  }
}

const BUILDERS: Record<string, (k: Kit) => void> = {
  'farmgate-metro': farmgateMetro, 'airport-t3': airportT3, 'jahangir-gate': jahangirGate, 'novo-theatre': novoTheatre,
  'sangsad-bhaban': sangsadBhaban, 'ahsan-manzil': ahsanManzil, 'shaheed-minar': shaheedMinar, 'hatirjheel-bridge': hatirjheelBridge,
  'bashundhara-city': bashundharaCity, 'baitul-mukarram': baitulMukarram, 'lalbagh-fort': lalbaghFort, 'sadarghat-launches': sadarghatLaunches,
  'airport-terminal': airportTerminal, chimbuk, 'shoilo-propat': shoiloPropat, milonchhari, 'bandarban-bus-stand': bandarbanBusStand,
  'buddha-dhatu-jadi': buddhaDhatuJadi, nilgiri, nilachal, 'meghla-bridge': meghlaBridge, 'sangu-boats': sanguBoats,
};

const cache = new Map<string, THREE.BufferGeometry>();

/** The merged geometry for a landmark, built once. */
export function landmarkGeometry(id: string): THREE.BufferGeometry | null {
  if (!BUILDERS[id]) return null;
  if (!cache.has(id)) { const k = new Kit(); BUILDERS[id](k); cache.set(id, k.done()); }
  return cache.get(id)!;
}

export const landmarkMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
