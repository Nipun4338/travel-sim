// Painted lettering for AI traffic (SPEC §7): Dhaka's city buses carry their company's name down the
// sides, a route board over the windscreen and "ঢাকা মেট্রো" number plates; trucks carry plates and
// the usual painted rear slogan. The companies are made up, the routes and places are real.
import * as THREE from 'three';

const FONT = '"Noto Sans Bengali", system-ui, sans-serif';
const BN = '০১২৩৪৫৬৭৮৯';
const bn = (n: number | string) => String(n).replace(/\d/g, d => BN[+d]);

export interface Livery { name: string; route: string; plate: string; body: number; band: string; }

export const BUS_LIVERIES: Livery[] = [
  { name: 'শাপলা সিটি লাইন', route: 'গুলিস্তান ⇄ মিরপুর ১২', plate: `ঢাকা মেট্রো-ব ${bn(11)}-${bn(2457)}`, body: 0x1f6fb2, band: '#f2c200' },
  { name: 'কদম ফুল পরিবহন', route: 'মতিঝিল ⇄ উত্তরা', plate: `ঢাকা মেট্রো-ব ${bn(14)}-${bn(8126)}`, body: 0xc0392b, band: '#ffffff' },
  { name: 'নদীমাতৃক পরিবহন', route: 'সদরঘাট ⇄ গাজীপুর', plate: `ঢাকা মেট্রো-ব ${bn(12)}-${bn(3390)}`, body: 0x2e8b57, band: '#f7e04a' },
  { name: 'সোনালী শালিক', route: 'ফার্মগেট ⇄ আজিমপুর', plate: `ঢাকা মেট্রো-ব ${bn(15)}-${bn(4718)}`, body: 0xe0a21a, band: '#7b1e3a' },
  { name: 'মেঘদূত সার্ভিস', route: 'মোহাম্মদপুর ⇄ মতিঝিল', plate: `ঢাকা মেট্রো-ব ${bn(11)}-${bn(6051)}`, body: 0x6a3d9a, band: '#f2c200' },
  { name: 'রূপসা নগর পরিবহন', route: 'যাত্রাবাড়ী ⇄ আব্দুল্লাহপুর', plate: `ঢাকা মেট্রো-ব ${bn(14)}-${bn(1983)}`, body: 0x0f8f8f, band: '#e8452c' },
];

export const TRUCK_LETTERING = { plate: `ঢাকা মেট্রো-ট ${bn(18)}-${bn(5562)}`, slogan: 'মায়ের দোয়া', rear: 'সাবধানে চালান' };

// Texture layout (1024 × 256): the side name across the top half; the route board, plate and rear
// name share the bottom half.
const W = 1024, H = 256;
type Rect = [number, number, number, number];
const R = { side: [0, 0, 1024, 128] as Rect, board: [0, 128, 448, 64] as Rect, plate: [448, 128, 256, 64] as Rect, rear: [704, 128, 320, 64] as Rect, slogan: [0, 192, 704, 64] as Rect };

function text(ctx: CanvasRenderingContext2D, [x, y, w, h]: Rect, s: string, bg: string, fg: string, scale = 0.62): void {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  let size = h * scale;
  ctx.font = `700 ${size}px ${FONT}`;
  while (ctx.measureText(s).width > w * 0.92 && size > 8) ctx.font = `700 ${(size -= 2)}px ${FONT}`;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x + w / 2, y + h / 2 + size * 0.06);
}

function paint(canvas: HTMLCanvasElement, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const redraw = () => { draw(canvas.getContext('2d')!); tex.needsUpdate = true; };
  redraw();
  void document.fonts?.ready.then(redraw);   // the Bangla font may still be loading
  return tex;
}

const canvas = () => Object.assign(document.createElement('canvas'), { width: W, height: H });

/** A flat sign `w` × `h` m showing `rect` of the texture, facing `facing` (0 = +z, then about +y). */
function sign(rect: Rect, w: number, h: number, x: number, y: number, z: number, facing: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute, [rx, ry, rw, rh] = rect;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (rx + uv.getX(i) * rw) / W, 1 - (ry + (1 - uv.getY(i)) * rh) / H);
  return g.rotateY(facing).translate(x, y, z);
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry(), keys = ['position', 'normal', 'uv'] as const;
  for (const k of keys) {
    const arrays = parts.map(p => p.attributes[k].array as Float32Array), size = parts[0].attributes[k].itemSize;
    const all = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
    arrays.reduce((o, a) => (all.set(a, o), o + a.length), 0);
    out.setAttribute(k, new THREE.BufferAttribute(all, size));
  }
  let base = 0;
  const index: number[] = [];
  for (const p of parts) { for (const i of p.index!.array) index.push(base + i); base += p.attributes.position.count; }
  out.setIndex(index);
  return out;
}

const HALF_PI = Math.PI / 2;

/** Bus lettering, laid on the body from models.ts ('bus': 10.5 m long, sides at z = ±1.25). */
export function busSignGeometry(): THREE.BufferGeometry {
  return merge([
    sign(R.side, 5.6, 0.5, 0.15, 1.22, 1.262, 0),           // between the wheel arches
    sign(R.side, 5.6, 0.5, 0.15, 1.22, -1.262, Math.PI),
    sign(R.board, 1.56, 0.23, 5.31, 2.82, 0, HALF_PI),
    sign(R.plate, 0.62, 0.16, 5.27, 0.7, 0, HALF_PI),
    sign(R.plate, 0.62, 0.16, -5.27, 0.7, 0, -HALF_PI),
    sign(R.rear, 1.8, 0.36, -5.27, 2.85, 0, -HALF_PI),
  ]);
}

/** Truck plates and the painted slogan across the back of the cargo body. */
export function truckSignGeometry(): THREE.BufferGeometry {
  return merge([
    sign(R.plate, 0.62, 0.16, 3.62, 0.62, 0, HALF_PI),
    sign(R.plate, 0.62, 0.16, -3.52, 0.75, 0, -HALF_PI),
    sign(R.slogan, 2.0, 0.3, -3.46, 2.2, 0, -HALF_PI),
    sign(R.rear, 1.6, 0.26, -3.46, 1.4, 0, -HALF_PI),
  ]);
}

export function busSignMaterial(l: Livery): THREE.Material {
  return new THREE.MeshLambertMaterial({
    map: paint(canvas(), ctx => {
      ctx.clearRect(0, 0, W, H);
      text(ctx, R.side, l.name, l.band, '#1a1a1a', 0.6);
      text(ctx, R.board, l.route, '#111', '#ffb000', 0.6);
      text(ctx, R.plate, l.plate, '#f4f4ef', '#111', 0.5);
      text(ctx, R.rear, l.name, l.band, '#1a1a1a', 0.55);
    }),
    polygonOffset: true, polygonOffsetFactor: -2,
  });
}

export function truckSignMaterial(): THREE.Material {
  return new THREE.MeshLambertMaterial({
    map: paint(canvas(), ctx => {
      text(ctx, R.plate, TRUCK_LETTERING.plate, '#f4f4ef', '#111', 0.5);
      text(ctx, R.slogan, TRUCK_LETTERING.slogan, '#d62828', '#f7e04a', 0.7);
      text(ctx, R.rear, TRUCK_LETTERING.rear, '#f7e04a', '#1a3a8a', 0.6);
    }),
    polygonOffset: true, polygonOffsetFactor: -2,
  });
}
