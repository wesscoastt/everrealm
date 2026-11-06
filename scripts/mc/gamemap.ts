// A top-down picture of the exported island as the game will have it (public/mcland), a pixel a block, and its trees marked.
// npx tsx scripts/mc/gamemap.ts out.png [scale]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { B } from '../../src/world/blocks';
const [out, scs] = process.argv.slice(2), SC = +(scs ?? 2), CH = 32;
const dir = path.resolve('public/mcland');
const tops = new Map<string, [number, number]>(), trees: [number, number][] = [];
let X0 = 1e9, Z0 = 1e9, X1 = -1e9, Z1 = -1e9;
for (const fn of fs.readdirSync(dir)) {
  const [cx, cz] = fn.replace('.bin', '').split('_').map(Number), ox = cx * CH, oz = cz * CH;
  const f = zlib.inflateRawSync(fs.readFileSync(path.join(dir, fn)));
  let p = 0;
  for (let lz = 0; lz < CH; lz++) for (let lx = 0; lx < CH; lx++) {
    const n = f[p++]; if (!n) continue;
    let top = -1, id = 0;
    for (let k = 0; k < n; k++) { const y0 = f[p++], len = f[p++], b = f[p++]; if (y0 + len - 1 > top) { top = y0 + len - 1; id = b; } }
    const x = ox + lx, z = oz + lz; tops.set(x + ',' + z, [top, id]);
    X0 = Math.min(X0, x); Z0 = Math.min(Z0, z); X1 = Math.max(X1, x); Z1 = Math.max(Z1, z);
  }
  if (p + 1 < f.length) { const nt = (f[p] << 8) | f[p + 1]; p += 2; for (let k = 0; k < nt; k++) { p++; p++; const x = ox + f[p++]; p++; const z = oz + f[p++]; const a = (f[p] << 8) | f[p + 1]; p += 2 + a * 3; const b = (f[p] << 8) | f[p + 1]; p += 2 + b * 4; trees.push([x, z]); } }
}
const W = Math.floor((X1 - X0) / SC) + 1, D = Math.floor((Z1 - Z0) / SC) + 1, raw = Buffer.alloc((W * 3 + 1) * D);
const col = (id: number): number[] => id === B.Water ? [50, 90, 190] : id === B.Sand ? [220, 205, 150] : id === B.Grass || id === B.FlowerGrass ? [95, 160, 60] : id === B.Snow || id === B.SnowGrass ? [240, 244, 250] : id === B.OakLeaves || id === B.BirchLeaves || id === B.PineLeaves ? [45, 110, 40] : id === B.Stone || id === B.Gravel ? [120, 120, 120] : id === B.Path ? [190, 160, 90] : id === B.Dirt || id === B.Farmland ? [120, 85, 55] : [170, 120, 90];
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const t = tops.get((X0 + x * SC) + ',' + (Z0 + z * SC)); const c = t ? col(t[1]) : [20, 40, 80]; const s = t ? Math.max(0.6, Math.min(1.3, 1 + (t[0] - 20) * 0.012)) : 1; for (let k = 0; k < 3; k++) raw[z * (W * 3 + 1) + 1 + x * 3 + k] = Math.min(255, c[k] * s); }
for (const [x, z] of trees) { const px = Math.floor((x - X0) / SC), pz = Math.floor((z - Z0) / SC); if (px < 0 || pz < 0 || px >= W || pz >= D) continue; const o = pz * (W * 3 + 1) + 1 + px * 3; raw[o] = 255; raw[o + 1] = 40; raw[o + 2] = 200; }
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(D, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out, W, 'x', D, 'from', X0, Z0, 'to', X1, Z1, trees.length, 'trees');
