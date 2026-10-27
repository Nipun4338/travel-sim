// Shared materials for baked Region chunks (flat-shaded, vertex-coloured; SPEC §4, §9).
import * as THREE from 'three';
import type { ChunkLayer } from '../shared/region';

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

const flat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const decal = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
let walls: THREE.MeshLambertMaterial | null = null;

export function materialFor(layer: ChunkLayer): THREE.Material {
  if (layer === 'wall') return (walls ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: windowTexture() }));
  if (layer === 'marking' || layer === 'water') return decal;
  return flat;
}
