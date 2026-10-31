// Paints the street-sign atlas (layout in shared/signAtlas.ts). It is drawn straight away with
// whatever font is available and redrawn once the Bangla web font has loaded.
import * as THREE from 'three';
import {
  ATLAS_PX, BILLBOARD_CELLS, BILLBOARD_H, BILLBOARD_SLOGANS, BILLBOARD_W, SHOP_NAMES, SIGN_CELLS, SIGN_COLOURS, SIGN_H, SIGN_W,
  billboardCell, signCell,
} from '../shared/signAtlas';

const FONT = '"Noto Sans Bengali", "Baloo Da 2", "Nirmala UI", sans-serif';
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

function paint(c: HTMLCanvasElement): void {
  const g = c.getContext('2d')!;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < SIGN_CELLS; i++) {
    const [x, y] = signCell(i), bg = SIGN_COLOURS[i % SIGN_COLOURS.length], light = bg === '#f2c200' || bg === '#f3efe3';
    g.fillStyle = bg; g.fillRect(x, y, SIGN_W, SIGN_H);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + SIGN_H - 6, SIGN_W, 6);
    g.fillStyle = light ? '#b3121b' : i % 3 ? '#ffffff' : '#ffe14d';
    g.font = `700 ${i % 4 ? 30 : 26}px ${FONT}`;
    g.fillText(SHOP_NAMES[i % SHOP_NAMES.length], x + SIGN_W / 2, y + SIGN_H / 2 - (i % 2 ? 0 : 6), SIGN_W - 12);
    if (i % 2 === 0) {
      const phone = String(100000 + i * 7391).slice(0, 6).replace(/\d/g, d => BN_DIGITS[+d]);
      g.font = `600 13px ${FONT}`;
      g.fillText(`মোবাইল: ০১৭১১-${phone}`, x + SIGN_W / 2, y + SIGN_H - 14);
    }
  }
  for (let i = 0; i < BILLBOARD_CELLS; i++) {
    const [x, y] = billboardCell(i), [bg, text, fg] = BILLBOARD_SLOGANS[i % BILLBOARD_SLOGANS.length];
    g.fillStyle = bg; g.fillRect(x, y, BILLBOARD_W, BILLBOARD_H);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(x + 450, y + 64, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = fg; g.font = `800 46px ${FONT}`; g.textAlign = 'left';
    g.fillText(text, x + 18, y + BILLBOARD_H / 2, 400);
    g.textAlign = 'center';
  }
}

export function signAtlasTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = ATLAS_PX;
  paint(c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  document.fonts?.load(`700 30px ${FONT}`).then(() => { paint(c); t.needsUpdate = true; }).catch(() => {});
  return t;
}
