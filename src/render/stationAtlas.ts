// Paints the Line 6 station sign atlas (layout in shared/stationAtlas.ts) from the line's station
// names. Drawn straight away and again once the Bangla web font has loaded.
import * as THREE from 'three';
import { STATION_ATLAS_H, STATION_ATLAS_W, STATION_CELLS, STATION_ROW_H, STATION_ROWS } from '../shared/stationAtlas';

const BN = '"Noto Sans Bengali", "Nirmala UI", sans-serif';
const EN = 'system-ui, sans-serif';
const GREEN = '#1f7a3e', DARK_GREEN = '#1b5e34', RED = '#c62828';

let names: Array<{ name: string; nameBn: string }> = [];

/** Sets the station names (in line order) before the first station chunk loads. */
export function setStationNames(stations: Array<{ name: string; nameBn: string }>): void { names = stations; }

/** The red-and-green line mark: a green disc with a red centre. */
function mark(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.fillStyle = GREEN; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = RED; g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill();
}

function paint(c: HTMLCanvasElement): void {
  const g = c.getContext('2d')!;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  names.slice(0, STATION_ROWS).forEach((st, i) => {
    const y = i * STATION_ROW_H, H = STATION_ROW_H;
    // Fascia: Bangla name | line mark | English name on white, with a green rule.
    let [x, w] = STATION_CELLS.fascia;
    g.fillStyle = '#f6f4ee'; g.fillRect(x, y, w, H);
    g.fillStyle = GREEN; g.fillRect(x, y + H - 12, w, 12);
    mark(g, x + w / 2, y + H / 2 - 6, 30);
    g.fillStyle = DARK_GREEN;
    g.font = `700 40px ${BN}`; g.fillText(st.nameBn, x + w * 0.25 - 8, y + H / 2 - 4, w / 2 - 60);
    g.font = `700 32px ${EN}`; g.fillText(st.name, x + w * 0.75 + 8, y + H / 2 - 4, w / 2 - 60);
    // Roundel: a green ring crossed by a white bar, Bangla over a green rule, English below.
    [x, w] = STATION_CELLS.roundel;
    g.fillStyle = '#e9e6de'; g.fillRect(x, y, w, H);
    g.strokeStyle = GREEN; g.lineWidth = 16; g.beginPath(); g.arc(x + w / 2, y + H / 2, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(x + 6, y + 26, w - 12, H - 52);
    g.fillStyle = GREEN; g.fillRect(x + 20, y + H / 2 + 1, w - 40, 3);
    g.fillStyle = DARK_GREEN; g.font = `700 28px ${BN}`; g.fillText(st.nameBn, x + w / 2, y + H / 2 - 16, w - 30);
    g.font = `600 19px ${EN}`; g.fillText(st.name.toUpperCase(), x + w / 2, y + H / 2 + 20, w - 30);
    // Street entrances: green, white Bangla and English, and the exit letter.
    for (const [k, letter] of [['exitA', 'A'], ['exitB', 'B']] as const) {
      [x, w] = STATION_CELLS[k];
      g.fillStyle = GREEN; g.fillRect(x, y, w, H);
      g.fillStyle = '#ffffff'; g.fillRect(x + w - 44, y + 30, 34, 52);
      g.fillStyle = GREEN; g.font = `800 38px ${EN}`; g.fillText(letter, x + w - 27, y + 58);
      g.fillStyle = '#ffffff';
      g.font = `700 22px ${BN}`; g.fillText('মেট্রো', x + (w - 44) / 2, y + 26, w - 56);
      g.font = `700 20px ${BN}`; g.fillText(st.nameBn, x + (w - 44) / 2, y + 60, w - 56);
      g.font = `600 14px ${EN}`; g.fillText(st.name, x + (w - 44) / 2, y + 94, w - 56);
    }
  });
}

export function stationAtlasTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = STATION_ATLAS_W; c.height = STATION_ATLAS_H;
  paint(c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  document.fonts?.load(`700 30px ${BN}`).then(() => { paint(c); t.needsUpdate = true; }).catch(() => {});
  return t;
}
