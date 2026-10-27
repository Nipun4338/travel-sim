// Writes chunk GLBs (meshopt-compressed) and hashed JSON files (SPEC §4, §16).
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import type { ChunkLayer } from '../../src/shared/region';

export const shortHash = (data: Uint8Array | string) => createHash('sha1').update(data).digest('hex').slice(0, 10);

let io: NodeIO | null = null;
async function getIO(): Promise<NodeIO> {
  if (io) return io;
  await MeshoptEncoder.ready;
  io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  return io;
}

/** One GLB per chunk LOD; each layer becomes a named node so the game can pick collider layers. */
export async function encodeChunk(layers: Map<ChunkLayer, { pos: number[]; col: number[]; uv?: number[] }>): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const material = doc.createMaterial('flat').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0);
  for (const [name, { pos, col, uv }] of layers) {
    if (!pos.length) continue;
    const n = pos.length / 3;
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
      .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(new Float32Array(col)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from({ length: n }, (_, i) => i)).setBuffer(buffer))
      .setMaterial(material);
    if (uv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  }
  await doc.transform(weld(), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  return (await getIO()).writeBinary(doc);
}

/** Writes `data` as `<stem>.<hash>.<ext>` and returns the file name. */
export function writeHashed(dir: string, stem: string, ext: string, data: Uint8Array | string): string {
  const name = `${stem}.${shortHash(data)}.${ext}`;
  writeFileSync(join(dir, name), data);
  return name;
}
