/// <reference lib="webworker" />
import { generateChunk, generateLod } from './chunkgen';
import { meshPadded } from './meshCore';
import { plan } from './sites';
import { SY } from './VoxelWorld';

// Generation and meshing off the main thread. Messages:
//   { type: 'gen', id, cx, cz }            -> ChunkResult
//   { type: 'mesh', id, key, pad, tint, ox, oz } -> MeshArrays
//   { type: 'lod', id, step }              -> heights + colours

declare const self: DedicatedWorkerGlobalScope;

plan();

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'gen') {
    const t0 = performance.now();
    const r = generateChunk(m.cx, m.cz);
    self.postMessage({ type: 'gen', id: m.id, result: r, ms: performance.now() - t0 }, [r.data.buffer, r.tint.buffer, r.veg.buffer, r.steps.buffer, r.map.buffer]);
  } else if (m.type === 'mesh') {
    const t0 = performance.now();
    const a = meshPadded(m.pad, SY, m.ox, m.oz, m.tint);
    self.postMessage({ type: 'mesh', id: m.id, key: m.key, arrays: a, ms: performance.now() - t0 }, [
      a.pos.buffer, a.nor.buffer, a.uv.buffer, a.col.buffer, a.meta.buffer, a.idx.buffer,
      a.wPos.buffer, a.wNor.buffer, a.wUv.buffer, a.wExtra.buffer, a.wIdx.buffer,
    ]);
  } else if (m.type === 'lod') {
    const r = generateLod(m.step);
    self.postMessage({ type: 'lod', id: m.id, result: r }, [r.heights.buffer, r.colors.buffer]);
  }
};
