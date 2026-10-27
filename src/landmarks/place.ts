// Puts the baked landmark placements into the scene (SPEC §10), and gives Flight Mode a rough
// solid box for each so the plane can't fly through Sangsad Bhaban.
import * as THREE from 'three';
import type { PlacedLandmark } from '../shared/landmarks';
import { landmarkGeometry, landmarkMaterial } from './models';

export interface LandmarkSolid { x: number; z: number; c: number; s: number; hw: number; hd: number; y0: number; y1: number; }

export function placeLandmarks(scene: THREE.Scene, placed: PlacedLandmark[] = []): LandmarkSolid[] {
  const solids: LandmarkSolid[] = [];
  for (const p of placed) {
    const geo = landmarkGeometry(p.id);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, landmarkMaterial);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = -(p.headingDeg * Math.PI) / 180;
    mesh.name = `landmark:${p.id}`;
    scene.add(mesh);
    geo.computeBoundingBox();
    const b = geo.boundingBox!, a = mesh.rotation.y;
    // Model +x/+z rotate by −heading about y; the box test in zone.ts uses the same convention.
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, c = Math.cos(-a), s = Math.sin(-a);
    solids.push({
      x: p.x + cx * Math.cos(a) + cz * Math.sin(a), z: p.z - cx * Math.sin(a) + cz * Math.cos(a), c, s,
      hw: (b.max.x - b.min.x) / 2, hd: (b.max.z - b.min.z) / 2, y0: p.y + b.min.y, y1: p.y + b.max.y,
    });
  }
  return solids;
}
