// A six-car Line 6 train (SPEC §20, §11 style): stainless cars with red and green bands, dark window
// bands, four doors a side, bogies and pantographs, and a driving cab in the leading car with a
// desk, the master controller and a screen. Each car sits with its two bogies on the track.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { notchLabel, type Train } from '../metro/Train';

const CAR = 19.8, GAP = 0.25, WIDTH = 2.95, FLOOR = 1.15, ROOF = 3.95, BOGIE = 6.9;
/** The driver's eye in the leading car's frame (+x forward, +y up from rail top, +z right). */
export const METRO_EYE = new THREE.Vector3(CAR / 2 - 1.7, FLOOR + 1.55, -0.55);
/** Seated on the left bench of a middle car, looking across and out of the right-hand windows. */
export const PASSENGER_EYE = new THREE.Vector3(0.6, FLOOR + 1.2, -0.72);

const C = { steel: 0xc9ccd0, roof: 0x5f646b, red: 0xc8202a, green: 0x1d7a3e, glass: 0x1b2633, door: 0xb3b7bc, under: 0x2a2c30, bogie: 0x333538, pan: 0x55595e, light: 0xfff6d8, tail: 0xff3b2f };

function part(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const geo = g.toNonIndexed(), n = geo.getAttribute('position').count, col = new Float32Array(n * 3), c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: number) => part(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex);

/** One car's body; `cab` shapes the front end of a driving car (+x). */
function carGeometry(cab: boolean, pantograph: boolean): THREE.BufferGeometry {
  const L = CAR, body = cab ? L - 1.6 : L, bx = cab ? -0.8 : 0, H = ROOF - FLOOR, cy = FLOOR + H / 2;
  const parts = [
    box(body, H, WIDTH, bx, cy, 0, C.steel),
    box(body - 0.4, 1.0, WIDTH + 0.02, bx, FLOOR + 1.7, 0, C.glass),              // window band
    box(body, 0.25, WIDTH - 0.3, bx, ROOF + 0.12, 0, C.roof),
    box(L - 2, 0.55, WIDTH - 0.5, 0, FLOOR - 0.3, 0, C.under),                    // underframe equipment
  ];
  // The livery bands are strips on each side (a box right through would show inside the car).
  for (const side of [-1, 1]) {
    parts.push(box(body, 0.14, 0.03, bx, FLOOR + 1.08, side * (WIDTH / 2 + 0.015), C.red));
    parts.push(box(body, 0.1, 0.03, bx, FLOOR + 0.92, side * (WIDTH / 2 + 0.015), C.green));
  }
  for (const x of [-7.4, -2.5, 2.5, 7.4]) for (const side of [-1, 1]) {
    parts.push(box(1.3, 1.95, 0.04, x - (cab ? 0.3 : 0), FLOOR + 1.0, side * (WIDTH / 2 + 0.01), C.door));
    parts.push(box(1.1, 0.75, 0.05, x - (cab ? 0.3 : 0), FLOOR + 1.6, side * (WIDTH / 2 + 0.02), C.glass));
  }
  for (const x of [-BOGIE, BOGIE]) {
    parts.push(box(2.6, 0.6, WIDTH - 0.6, x, 0.55, 0, C.bogie));
    for (const ax of [-1, 1]) for (const side of [-1, 1]) parts.push(part(new THREE.CylinderGeometry(0.43, 0.43, 0.14, 12).rotateX(Math.PI / 2).translate(x + ax * 1.05, 0.43, side * 0.72), C.bogie));
  }
  if (cab) {
    // The nose is a hollow shell round the driver: a solid lower front and roof, and glass that faces
    // outwards only (one-sided), so it's tinted from outside and clear from the seat.
    const NW = WIDTH - 0.2;
    parts.push(box(1.6, 1.25, NW, L / 2 - 0.8, FLOOR + 0.325, 0, C.steel));
    parts.push(box(1.6, 0.3, NW, L / 2 - 0.8, ROOF - 0.15, 0, C.steel));
    parts.push(part(new THREE.PlaneGeometry(NW - 0.2, 1.75).rotateY(Math.PI / 2).rotateZ(-0.22).translate(L / 2 - 0.1, FLOOR + 1.85, 0), C.glass));
    for (const side of [-1, 1]) {
      parts.push(part(new THREE.PlaneGeometry(1.5, 1.25).rotateY(side > 0 ? 0 : Math.PI).translate(L / 2 - 0.85, FLOOR + 1.95, side * NW / 2), C.glass));
      parts.push(box(1.6, 0.06, 0.06, L / 2 - 0.8, FLOOR + 0.97, side * NW / 2, C.steel));
    }
    parts.push(box(0.05, 0.14, WIDTH - 0.2, L / 2 + 0.01, FLOOR + 0.82, 0, C.red));
    parts.push(box(0.05, 0.1, WIDTH - 0.2, L / 2 + 0.01, FLOOR + 0.66, 0, C.green));
    for (const side of [-1, 1]) {
      parts.push(box(0.05, 0.16, 0.36, L / 2 + 0.02, FLOOR + 0.42, side * 0.95, C.light));
      parts.push(box(0.05, 0.12, 0.22, L / 2 + 0.02, FLOOR + 0.22, side * 0.95, C.tail));
    }
  }
  if (pantograph) {
    parts.push(box(1.6, 0.25, 1.4, 4, ROOF + 0.35, 0, C.pan));
    parts.push(part(new THREE.BoxGeometry(0.08, 1.4, 0.08).rotateZ(0.6).translate(4.3, ROOF + 0.95, 0), C.pan));
    parts.push(box(0.12, 0.06, 1.8, 4.7, ROOF + 1.5, 0, C.pan));
  }
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}

export class TrainView {
  readonly cars: THREE.Group[] = [];
  readonly cab = new THREE.Group();
  /** A passenger car's inside (car 3), shown only from the passenger seat. */
  readonly interior = new THREE.Group();
  private handle: THREE.Mesh;
  private screen: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private m4 = new THREE.Matrix4();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene, private train: Train) {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const geo = { lead: carGeometry(true, false), mid: carGeometry(false, false), pan: carGeometry(false, true) };
    for (let i = 0; i < 6; i++) {
      // Cars 1 and 6 are driving cars (the rear one turned round); 2 and 5 carry pantographs.
      const g = i === 0 || i === 5 ? geo.lead : i === 1 || i === 4 ? geo.pan : geo.mid;
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = true;
      const car = new THREE.Group();
      if (i === 5) mesh.rotation.y = Math.PI;
      car.add(mesh);
      scene.add(car);
      this.cars.push(car);
    }
    // The cab, seen from the driver's seat: desk, controller, screen, side walls and a ceiling.
    const dark = new THREE.MeshLambertMaterial({ color: 0x2b2d31, flatShading: true });
    const panel = new THREE.MeshLambertMaterial({ color: 0x5c6066, flatShading: true, side: THREE.DoubleSide });
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); this.cab.add(b); return b;
    };
    const fx = CAR / 2;
    add(0.75, 0.9, WIDTH - 0.3, dark, fx - 1.05, FLOOR + 0.45, 0);                   // desk
    add(0.05, 2.6, WIDTH - 0.2, panel, fx - 2.6, FLOOR + 1.3, 0).visible = false;    // back wall (hidden: keeps the view open)
    // Side walls below and above the cab's side windows.
    for (const side of [-1, 1]) { add(2.6, 1.0, 0.05, panel, fx - 1.4, FLOOR + 0.5, side * (WIDTH / 2 - 0.06)); add(2.6, 0.45, 0.05, panel, fx - 1.4, ROOF - 0.42, side * (WIDTH / 2 - 0.06)); }
    add(2.6, 0.05, WIDTH - 0.2, panel, fx - 1.4, ROOF - 0.15, 0);
    for (const side of [-1, 1]) add(0.08, 1.7, 0.08, dark, fx - 0.2, FLOOR + 1.85, side * (WIDTH / 2 - 0.2)); // windscreen pillars
    // Master controller on the driver's left, a T-handle that tips forward for power, back for brake.
    const base = add(0.3, 0.08, 0.22, dark, fx - 1.2, FLOOR + 0.94, -1.05);
    this.handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04).translate(0, 0.16, 0), new THREE.MeshLambertMaterial({ color: 0x9a9da3 }));
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.18), new THREE.MeshLambertMaterial({ color: 0xc8202a }));
    grip.position.y = 0.32;
    this.handle.add(grip);
    this.handle.position.set(fx - 1.2, FLOOR + 0.98, -1.05);
    this.cab.add(this.handle);
    void base;
    // The driver's screen: speed, limit, notch and the next station.
    const canvas = Object.assign(document.createElement('canvas'), { width: 512, height: 256 });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.screen = { canvas, tex };
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: tex }));
    scr.position.set(fx - 1.12, FLOOR + 1.07, -0.45);
    scr.rotation.set(-1.0, -Math.PI / 2, 0, 'YXZ');
    this.cab.add(scr);
    this.cars[0].add(this.cab);

    // Car 3's inside: floor, ceiling, walls with a window band, long bench seats, grab poles, lights.
    const wall = new THREE.MeshLambertMaterial({ color: 0xe4e6e8, flatShading: true, side: THREE.DoubleSide });
    const seat = new THREE.MeshLambertMaterial({ color: 0x2f7d5a, flatShading: true });
    const pole = new THREE.MeshLambertMaterial({ color: 0xc9ccd0 });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfdfcf4 });
    const inner = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); this.interior.add(b);
    };
    const IL = CAR - 0.6, IW = WIDTH - 0.24;
    inner(IL, 0.05, IW, new THREE.MeshLambertMaterial({ color: 0x8a8d90 }), 0, FLOOR, 0);
    inner(IL, 0.05, IW, wall, 0, ROOF - 0.25, 0);
    for (const side of [-1, 1]) {
      inner(IL, 1.15, 0.04, wall, 0, FLOOR + 0.575, side * IW / 2);                       // below the windows
      inner(IL, 0.55, 0.04, wall, 0, ROOF - 0.52, side * IW / 2);                          // above them
      for (let x = -IL / 2 + 1.2; x < IL / 2; x += 2.45) inner(0.12, 1.05, 0.06, wall, x, FLOOR + 1.7, side * IW / 2); // window pillars
      for (const x of [-5, 0, 5]) inner(3.6, 0.45, 0.5, seat, x, FLOOR + 0.45, side * (IW / 2 - 0.3));
      for (const x of [-7.4, -2.5, 2.5, 7.4]) inner(0.04, ROOF - FLOOR - 0.3, 0.04, pole, x + 0.8, FLOOR + 1.35, side * 0.55);
      inner(IL - 1, 0.04, 0.18, lamp, 0, ROOF - 0.29, side * 0.7);
    }
    this.interior.visible = false;
    this.cars[2].add(this.interior);
  }

  setInteriorVisible(v: boolean): void { this.interior.visible = v; }

  setCabVisible(v: boolean): void { this.cab.visible = v; }

  /** Puts every car on the track behind the front at `s`, bogies on the rails. */
  sync(ahead = 0): void {
    const tr = this.train, s0 = tr.s + tr.v * ahead;
    for (let i = 0; i < 6; i++) {
      const mid = s0 - CAR / 2 - i * (CAR + GAP);
      const front = tr.track.at(mid + BOGIE, this.tmpA), back = tr.track.at(mid - BOGIE, this.tmpB);
      const car = this.cars[i];
      car.position.copy(front).add(back).multiplyScalar(0.5);
      const fwd = front.sub(back).normalize();
      const side = new THREE.Vector3().crossVectors(fwd, this.up).normalize();
      const up = new THREE.Vector3().crossVectors(side, fwd);
      car.quaternion.setFromRotationMatrix(this.m4.makeBasis(fwd, up, side));
    }
    // The handle tips forward 8° per power notch and back per brake step; EB all the way back.
    this.handle.rotation.z = -tr.notch * 0.14;
  }

  /** Redraws the cab screen (a few times a second is plenty). */
  drawScreen(info: { limit: number; next: string; distM: number }): void {
    const { canvas, tex } = this.screen, g = canvas.getContext('2d')!, tr = this.train;
    g.fillStyle = '#0d1418'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#7fe0ff'; g.font = '700 96px system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText(String(Math.round(tr.kmh)), 26, 112);
    g.font = '600 26px system-ui, sans-serif'; g.fillStyle = '#9fb3bd'; g.fillText('km/h', 30, 148);
    g.fillStyle = tr.kmh > info.limit + 0.5 ? '#ff5a4f' : '#ffd23f';
    g.font = '700 44px system-ui, sans-serif'; g.fillText(`▲ ${info.limit}`, 220, 80);
    g.fillStyle = tr.notch > 0 ? '#5ee27a' : tr.notch < 0 ? '#ff8a3d' : '#cfd8dc';
    g.font = '800 64px system-ui, sans-serif'; g.fillText(notchLabel(tr.notch), 380, 112);
    g.fillStyle = '#cfd8dc'; g.font = '600 30px "Noto Sans Bengali", system-ui, sans-serif';
    g.fillText(`${info.next} · ${info.distM >= 1000 ? (info.distM / 1000).toFixed(1) + ' km' : Math.round(info.distM) + ' m'}`, 26, 222);
    tex.needsUpdate = true;
  }
}
