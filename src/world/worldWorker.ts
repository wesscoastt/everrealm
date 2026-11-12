/// <reference lib="webworker" />
import { generateChunk, generateLod } from './chunkgen';
import { meshPadded } from './meshCore';
import { plan } from './sites';
import { MINY, SPAN } from './VoxelWorld';
import { mcChunk, mcLoad } from './mcland';

// Generation and meshing off the main thread. Messages:
//   { type: 'gen', id, cx, cz }            -> ChunkResult
//   { type: 'mesh', id, key, pad, tint, ox, oz } -> MeshArrays
//   { type: 'lod', id, step, x0 }          -> heights + colours (one square of the world, from x0)

declare const self: DedicatedWorkerGlobalScope;

plan();

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'gen') {
    const t0 = performance.now();
    const gen = () => {
      const r = generateChunk(m.cx, m.cz);
      self.postMessage({ type: 'gen', id: m.id, result: r, ms: performance.now() - t0 }, [r.data.buffer, r.tint.buffer, r.veg.buffer, r.steps.buffer, r.map.buffer]);
    };
    // (the owner's Minecraft island: its chunk's file first, world/mcland.ts)
    if (mcChunk(m.cx, m.cz)) void mcLoad(m.cx, m.cz, import.meta.env.BASE_URL).then(gen);
    else gen();
  } else if (m.type === 'mesh') {
    const t0 = performance.now();
    const a = meshPadded(m.pad, SPAN, m.ox, m.oz, m.tint, MINY);
    self.postMessage({ type: 'mesh', id: m.id, key: m.key, arrays: a, ms: performance.now() - t0 }, [
      a.pos.buffer, a.nor.buffer, a.uv.buffer, a.col.buffer, a.meta.buffer, a.idx.buffer,
      a.wPos.buffer, a.wNor.buffer, a.wUv.buffer, a.wExtra.buffer, a.wIdx.buffer,
    ]);
  } else if (m.type === 'lod') {
    const r = generateLod(m.step, m.x0);
    self.postMessage({ type: 'lod', id: m.id, result: r }, [r.heights.buffer, r.colors.buffer]);
  }
};
