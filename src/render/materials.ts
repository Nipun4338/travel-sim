// Shared materials for baked Region chunks (flat-shaded, vertex-coloured; SPEC §4, §9).
import * as THREE from 'three';
import type { ChunkLayer } from '../shared/region';
import { signAtlasTexture } from './signAtlas';
import { stationAtlasTexture } from './stationAtlas';

/**
 * One wall tile = one 3 m bay × one 3.2 m floor: a window with a frame on white, multiplied by the
 * facade's vertex colour. M7 adds an emissive version of the same tile for lit windows at night.
 */
function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#c9c4ba';           // frame / sill shadow
  g.fillRect(12, 18, 40, 30);
  g.fillStyle = '#2b3640';           // glass
  g.fillRect(15, 21, 34, 24);
  g.fillStyle = '#56636d';           // a mullion
  g.fillRect(31, 21, 2, 24);
  g.fillStyle = '#d9d4ca';           // floor slab line
  g.fillRect(0, 60, 64, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Night windows: 8 × 8 bays with about a third lit, warm or cool, so a facade doesn't light up
 * uniformly. Used as the walls' emissive map with its own repeat (1/8 of the colour map's).
 */
function litWindowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 512);
  let s = 11;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    if (rnd() > 0.35) continue;
    g.fillStyle = rnd() < 0.75 ? '#ffd38a' : '#d8ecff';
    g.fillRect(bx * 64 + 15, by * 64 + 21, 34, 24);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 8, 1 / 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const flat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const decal = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
let walls: THREE.MeshLambertMaterial | null = null;
let signs: THREE.MeshLambertMaterial | null = null;
let stationSigns: THREE.MeshLambertMaterial | null = null;
let nightSigns = false;
let road: THREE.Material = flat;

/**
 * Time and weather for chunk materials (SPEC §9): lit windows at night; wet roads in rain, darker
 * everywhere and with a specular sheen on Medium and High. Call before chunks load.
 */
export function setMaterialConditions(c: { night: boolean; wet: boolean; sheen: boolean }): void {
  const w = materialFor('wall') as THREE.MeshLambertMaterial;
  if (c.night && !w.emissiveMap) { w.emissiveMap = litWindowTexture(); w.emissive.setHex(0xffffff); w.needsUpdate = true; }
  w.emissiveIntensity = c.night ? 0.9 : 0;
  nightSigns = c.night;
  road = !c.wet ? flat
    : c.sheen ? new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, color: 0x8a8a8a, specular: 0x555555, shininess: 60 })
    : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x7a7a7a });
}

export function materialFor(layer: ChunkLayer): THREE.Material {
  if (layer === 'wall') return (walls ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: windowTexture() }));
  if (layer === 'sign') return (signs ??= new THREE.MeshLambertMaterial({ map: signAtlasTexture(), side: THREE.DoubleSide }));
  if (layer === 'station') {
    if (!stationSigns) {
      // Station signs are backlit: at night they glow with their own picture.
      const map = stationAtlasTexture();
      stationSigns = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      if (nightSigns) { stationSigns.emissiveMap = map; stationSigns.emissive.setHex(0xffffff); stationSigns.emissiveIntensity = 0.85; }
    }
    return stationSigns;
  }
  if (layer === 'marking' || layer === 'water') return decal;
  if (layer === 'road') return road;
  return flat;
}
