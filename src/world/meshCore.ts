import { B, BLOCKS, isLeaves } from './blocks';

// Pure chunk mesher (runs in workers). Input is a padded copy of the chunk: 34 x SY x 34 columns,
// i.e. the chunk plus a one-block border from its neighbours, so faces and ambient occlusion are
// correct across chunk seams. Written against flat typed arrays: this is the hot loop.

export const PAD = 34;
const PP = PAD * PAD;
export const padIdx = (x: number, y: number, z: number) => (x + 1) + PAD * ((z + 1) + PAD * y);

export interface MeshArrays {
  pos: Float32Array;
  nor: Int8Array;
  uv: Float32Array;
  col: Float32Array;
  meta: Float32Array;
  idx: Uint32Array;
  wPos: Float32Array;
  wNor: Int8Array;
  wUv: Float32Array;
  wExtra: Float32Array;
  wIdx: Uint32Array;
}

// Faces: normal, tangent U, bitangent V (U x V = N), kind (0 top, 1 side, 2 bottom)
const FN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const FU = [[0, 0, -1], [0, 0, 1], [1, 0, 0], [1, 0, 0], [1, 0, 0], [-1, 0, 0]];
const FV = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
const FK = [1, 1, 0, 2, 1, 1];
const CU = [-1, 1, 1, -1], CV = [-1, -1, 1, 1];
const AO = [0.48, 0.66, 0.83, 1.0];

// Per-block lookup tables built once
const N_BLOCKS = BLOCKS.length;
const OCC = new Uint8Array(256);
const EXPOSES = new Uint8Array(256); // neighbour lets a face show
const SEE = new Uint8Array(256);
const LEAF = new Uint8Array(256);
for (let id = 0; id < N_BLOCKS; id++) {
  const b = BLOCKS[id];
  if (!b) continue;
  OCC[id] = id !== B.Air && id !== B.Water && id !== B.Barrier ? 1 : 0;
  SEE[id] = b.seeThrough ? 1 : 0;
  EXPOSES[id] = id === B.Air || id === B.Water || id === B.Barrier ? 1 : 0;
  LEAF[id] = isLeaves(id) ? 1 : 0;
}
const ROTATE = new Uint8Array(256);
for (const id of [B.Grass, B.Sand, B.Snow, B.Dirt, B.Path, B.Stone, B.Gravel, B.RedSand, B.Loam]) ROTATE[id] = 1;

class F32 {
  a: Float32Array; n = 0;
  constructor(cap: number) { this.a = new Float32Array(cap); }
  ensure(k: number) { if (this.n + k > this.a.length) { const b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } }
  done() { return this.a.slice(0, this.n); }
}
class I8 {
  a: Int8Array; n = 0;
  constructor(cap: number) { this.a = new Int8Array(cap); }
  ensure(k: number) { if (this.n + k > this.a.length) { const b = new Int8Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } }
  done() { return this.a.slice(0, this.n); }
}
class U32 {
  a: Uint32Array; n = 0;
  constructor(cap: number) { this.a = new Uint32Array(cap); }
  ensure(k: number) { if (this.n + k > this.a.length) { const b = new Uint32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } }
  done() { return this.a.slice(0, this.n); }
}

function hash3(x: number, y: number, z: number): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function meshPadded(pad: Uint8Array, sy: number, ox: number, oz: number, tint: Float32Array): MeshArrays {
  // Out-of-range y reads as stone below and air above
  const get = (x: number, y: number, z: number) => (y < 0 ? B.Stone : y >= sy ? B.Air : pad[(x + 1) + PAD * ((z + 1) + PAD * y)]);
  const cap = 12000;
  const pos = new F32(cap * 12), uv = new F32(cap * 8), col = new F32(cap * 12), meta = new F32(cap * 8);
  const nor = new I8(cap * 12), idx = new U32(cap * 6);
  const wPos = new F32(2000), wUv = new F32(1400), wExtra = new F32(2000), wNor = new I8(2000), wIdx = new U32(1000);
  let quads = 0, wQuads = 0;
  const ao = [0, 0, 0, 0];

  let maxY = 0;
  outer: for (let y = sy - 1; y >= 0; y--) for (let i = 0; i < PP; i++) if (pad[i + PP * y] !== B.Air) { maxY = y; break outer; }

  for (let y = 0; y <= maxY; y++) {
    for (let z = 0; z < 32; z++) {
      for (let x = 0; x < 32; x++) {
        const id = pad[(x + 1) + PAD * ((z + 1) + PAD * y)];
        if (id === B.Air || id === B.Barrier) continue;
        const wx = ox + x, wz = oz + z;
        if (id === B.Water) {
          const above = get(x, y + 1, z);
          let depth = 1;
          while (depth < 8 && get(x, y - depth, z) === B.Water) depth++;
          if (above === B.Air) {
            const top = y + 1 - 0.14;
            wPos.ensure(12); wNor.ensure(12); wUv.ensure(8); wExtra.ensure(12); wIdx.ensure(6);
            const corners = [0, 1, 1, 1, 1, 0, 0, 0];
            for (let c = 0; c < 4; c++) {
              const cx = corners[c * 2], cz = corners[c * 2 + 1];
              const sx = cx ? 1 : -1, sz = cz ? 1 : -1;
              const s = (dx: number, dz: number) => { const n = get(x + dx, y, z + dz); return n !== B.Water && n !== B.Air ? 1 : 0; };
              const foam = (s(sx, 0) + s(0, sz) + s(sx, sz)) / 3;
              wPos.a[wPos.n++] = wx + cx; wPos.a[wPos.n++] = top; wPos.a[wPos.n++] = wz + cz;
              wNor.a[wNor.n++] = 0; wNor.a[wNor.n++] = 1; wNor.a[wNor.n++] = 0;
              wUv.a[wUv.n++] = wx + cx; wUv.a[wUv.n++] = wz + cz;
              wExtra.a[wExtra.n++] = depth; wExtra.a[wExtra.n++] = foam; wExtra.a[wExtra.n++] = 0;
            }
            const i = wQuads * 4;
            wIdx.a[wIdx.n++] = i; wIdx.a[wIdx.n++] = i + 1; wIdx.a[wIdx.n++] = i + 2; wIdx.a[wIdx.n++] = i; wIdx.a[wIdx.n++] = i + 2; wIdx.a[wIdx.n++] = i + 3;
            wQuads++;
          }
          for (let s = 0; s < 4; s++) {
            const dx = s === 0 ? 1 : s === 1 ? -1 : 0, dz = s === 2 ? 1 : s === 3 ? -1 : 0;
            if (get(x + dx, y, z + dz) !== B.Air) continue;
            const topY = above === B.Water ? y + 1 : y + 1 - 0.14;
            const fx = dx === 1 ? wx + 1 : wx, fz = dz === 1 ? wz + 1 : wz;
            const p = dx !== 0
              ? [fx, y, wz + (dx > 0 ? 1 : 0), fx, y, wz + (dx > 0 ? 0 : 1), fx, topY, wz + (dx > 0 ? 0 : 1), fx, topY, wz + (dx > 0 ? 1 : 0)]
              : [wx + (dz > 0 ? 0 : 1), y, fz, wx + (dz > 0 ? 1 : 0), y, fz, wx + (dz > 0 ? 1 : 0), topY, fz, wx + (dz > 0 ? 0 : 1), topY, fz];
            wPos.ensure(12); wNor.ensure(12); wUv.ensure(8); wExtra.ensure(12); wIdx.ensure(6);
            for (let c = 0; c < 4; c++) {
              wPos.a[wPos.n++] = p[c * 3]; wPos.a[wPos.n++] = p[c * 3 + 1]; wPos.a[wPos.n++] = p[c * 3 + 2];
              wNor.a[wNor.n++] = dx; wNor.a[wNor.n++] = 0; wNor.a[wNor.n++] = dz;
              wUv.a[wUv.n++] = c === 1 || c === 2 ? 1 : 0; wUv.a[wUv.n++] = p[c * 3 + 1];
              wExtra.a[wExtra.n++] = depth; wExtra.a[wExtra.n++] = 0.4; wExtra.a[wExtra.n++] = 1;
            }
            const i = wQuads * 4;
            wIdx.a[wIdx.n++] = i; wIdx.a[wIdx.n++] = i + 1; wIdx.a[wIdx.n++] = i + 2; wIdx.a[wIdx.n++] = i; wIdx.a[wIdx.n++] = i + 2; wIdx.a[wIdx.n++] = i + 3;
            wQuads++;
          }
          continue;
        }
        const def = BLOCKS[id];
        const leaves = LEAF[id] === 1;
        const ti = (z * 32 + x) * 6 + (leaves ? 3 : 0);
        const tinted = id === B.Grass || leaves;
        const tr = tinted ? tint[ti] : 1, tg = tinted ? tint[ti + 1] : 1, tb = tinted ? tint[ti + 2] : 1;
        const jitter = 1 + (hash3(wx, y, wz) - 0.5) * 2 * (def.jitter ?? 0);
        for (let f = 0; f < 6; f++) {
          const n = FN[f];
          const nid = get(x + n[0], y + n[1], z + n[2]);
          if (!(EXPOSES[nid] || (SEE[nid] && nid !== id))) continue;
          if (leaves && LEAF[nid]) continue;
          const u = FU[f], v = FV[f], kind = FK[f];
          const layer = kind === 0 ? def.top : kind === 2 ? def.bottom : def.side;
          const amt = id === B.Grass ? (kind === 0 ? 1 : 0.55) : 1;
          const r = (1 + (tr - 1) * amt) * jitter, g = (1 + (tg - 1) * amt) * jitter, bl = (1 + (tb - 1) * amt) * jitter;
          const rot = kind === 0 && ROTATE[id] ? Math.floor(hash3(wx, y, wz) * 4) : 0;
          const nx = x + n[0], ny = y + n[1], nz = z + n[2];
          pos.ensure(12); nor.ensure(12); uv.ensure(8); col.ensure(12); meta.ensure(8); idx.ensure(6);
          for (let c = 0; c < 4; c++) {
            const su = CU[c], sv = CV[c];
            const s1 = OCC[get(nx + su * u[0], ny + su * u[1], nz + su * u[2])];
            const s2 = OCC[get(nx + sv * v[0], ny + sv * v[1], nz + sv * v[2])];
            const cc = OCC[get(nx + su * u[0] + sv * v[0], ny + su * u[1] + sv * v[1], nz + su * u[2] + sv * v[2])];
            const a = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
            ao[c] = a;
            pos.a[pos.n++] = wx + 0.5 + n[0] * 0.5 + (su * u[0] + sv * v[0]) * 0.5;
            pos.a[pos.n++] = y + 0.5 + n[1] * 0.5 + (su * u[1] + sv * v[1]) * 0.5;
            pos.a[pos.n++] = wz + 0.5 + n[2] * 0.5 + (su * u[2] + sv * v[2]) * 0.5;
            nor.a[nor.n++] = n[0]; nor.a[nor.n++] = n[1]; nor.a[nor.n++] = n[2];
            let tu = (su + 1) / 2, tv = (sv + 1) / 2;
            for (let k = 0; k < rot; k++) { const t = tu; tu = tv; tv = 1 - t; }
            uv.a[uv.n++] = tu; uv.a[uv.n++] = tv;
            const l = AO[a];
            col.a[col.n++] = r * l; col.a[col.n++] = g * l; col.a[col.n++] = bl * l;
            meta.a[meta.n++] = layer; meta.a[meta.n++] = leaves ? 1 : 0;
          }
          const i = quads * 4;
          if (ao[0] + ao[2] < ao[1] + ao[3]) { idx.a[idx.n++] = i + 1; idx.a[idx.n++] = i + 2; idx.a[idx.n++] = i + 3; idx.a[idx.n++] = i + 1; idx.a[idx.n++] = i + 3; idx.a[idx.n++] = i; }
          else { idx.a[idx.n++] = i; idx.a[idx.n++] = i + 1; idx.a[idx.n++] = i + 2; idx.a[idx.n++] = i; idx.a[idx.n++] = i + 2; idx.a[idx.n++] = i + 3; }
          quads++;
        }
      }
    }
  }
  return {
    pos: pos.done(), nor: nor.done(), uv: uv.done(), col: col.done(), meta: meta.done(), idx: idx.done(),
    wPos: wPos.done(), wNor: wNor.done(), wUv: wUv.done(), wExtra: wExtra.done(), wIdx: wIdx.done(),
  };
}
