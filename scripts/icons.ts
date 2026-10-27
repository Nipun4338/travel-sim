// App icons for the installable game (SPEC §16): `npx tsx scripts/icons.ts`. Draws a bus-art bus on
// maroon as plain pixels and writes PNGs with Node's zlib, so no image tooling is needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
const hex = (h: number): RGB => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function draw(size: number, safe: number): Buffer {
  const px = Buffer.alloc(size * size * 3);
  const set = (x: number, y: number, c: RGB) => { if (x >= 0 && y >= 0 && x < size && y < size) px.set(c, (y * size + x) * 3); };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: RGB) => {
    for (let y = Math.floor(y0 * size); y < y1 * size; y++) for (let x = Math.floor(x0 * size); x < x1 * size; x++) set(x, y, c);
  };
  const disc = (cx: number, cy: number, r: number, c: RGB) => {
    for (let y = Math.floor((cy - r) * size); y < (cy + r) * size; y++) for (let x = Math.floor((cx - r) * size); x < (cx + r) * size; x++) {
      if ((x / size - cx) ** 2 + (y / size - cy) ** 2 < r * r) set(x, y, c);
    }
  };
  rect(0, 0, 1, 1, hex(0x7b1e3a));
  // Rickshaw-art border stripes (inside the maskable safe zone's margin).
  const m = (1 - safe) / 2, band = 0.035;
  const colours = [0xf7c600, 0x16a085, 0xe74c3c, 0x2e86c1].map(hex);
  for (let i = 0; i < 16; i++) {
    const c = colours[i % 4], a = m + (i / 16) * (1 - 2 * m), b = m + ((i + 1) / 16) * (1 - 2 * m);
    rect(a, m, b, m + band, c); rect(a, 1 - m - band, b, 1 - m, c);
  }
  // The bus: green lower body, red upper, yellow stripe, dark windows, wheels.
  const L = m + 0.1, R = 1 - m - 0.1, T = m + 0.25, B = 1 - m - 0.22;
  rect(L, T, R, B, hex(0xc8302a));
  rect(L, T + (B - T) * 0.55, R, B, hex(0x1f6f3f));
  rect(L, T + (B - T) * 0.5, R, T + (B - T) * 0.6, hex(0xf2c200));
  for (let i = 0; i < 4; i++) {
    const w = (R - L - 0.06) / 4;
    rect(L + 0.03 + i * w + 0.008, T + 0.03, L + 0.03 + (i + 1) * w - 0.008, T + (B - T) * 0.42, hex(0x22313f));
  }
  for (const x of [L + 0.12, R - 0.12]) { disc(x, B, 0.06, hex(0x1b1b1b)); disc(x, B, 0.025, hex(0x9aa3ab)); }
  return px;
}

function png(size: number, rgb: Buffer): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    c.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size, safe] of [['icon-192', 192, 1], ['icon-512', 512, 1], ['maskable-512', 512, 0.8], ['apple-touch-icon', 180, 1]] as const) {
  writeFileSync(`public/icons/${name}.png`, png(size, draw(size, safe)));
}
console.log('icons written to public/icons/');
