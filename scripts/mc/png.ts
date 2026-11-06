// A top-down picture of part of a Bedrock world (a PNG, a pixel a block): the top block's colour, shaded by height.
// npx tsx scripts/mc/png.ts <db> x0 z0 x1 z1 out.png [scale]
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s, out, scs] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, SC = +(scs ?? 1);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 2 && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const W = Math.floor((X1 - X0 + 1) / SC), D = Math.floor((Z1 - Z0 + 1) / SC);
const topY = new Int16Array(W * D).fill(-999), topN: string[] = new Array(W * D).fill('');
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
    const x = sx + lx, z = sz + lz; if (x < X0 || x > X1 || z < Z0 || z > Z1 || (x - X0) % SC || (z - Z0) % SC) continue;
    const i = (x - X0) / SC + ((z - Z0) / SC) * W; if (i >= W * D) continue;
    for (let ly = 15; ly >= 0; ly--) {
      const n = sc.palette[sc.idx[lx * 256 + lz * 16 + ly]].name.replace(/^minecraft:/, '');
      if (n === 'air' || /fake_air|biome_identifier|leaf_litter|wildflowers|clover|foxgloves/.test(n) || /^(short_grass|tallgrass|tall_grass|fern|large_fern)$/.test(n)) continue;
      if (sy + ly > topY[i]) { topY[i] = sy + ly; topN[i] = n; }
      break;
    }
  }
}
const col = (n: string): number[] => {
  if (!n) return [0, 0, 0];
  if (/snow|powder/.test(n)) return [240, 244, 250]; if (/ice/.test(n)) return [160, 200, 240];
  if (/water/.test(n)) return [50, 90, 190]; if (/lava|magma/.test(n)) return [230, 90, 20];
  if (/leaves/.test(n)) return /spruce/.test(n) ? [40, 80, 50] : [50, 120, 40];
  if (/path/.test(n)) return [190, 160, 90]; if (/gravel/.test(n)) return [140, 135, 130];
  if (/grass|moss/.test(n)) return [95, 160, 60]; if (/dirt|podzol|farmland|mud/.test(n)) return [120, 85, 55];
  if (/sand/.test(n)) return [220, 205, 150]; if (/hay/.test(n)) return [220, 190, 40];
  if (/planks|stairs|slab|log|wood|fence|door|trapdoor|barrel|chest/.test(n)) return /spruce|dark/.test(n) ? [110, 75, 45] : [170, 125, 70];
  if (/glass/.test(n)) return [180, 230, 240]; if (/torch|lantern|glowstone|lamp/.test(n)) return [255, 230, 120];
  if (/wool|carpet|concrete|terracotta/.test(n)) return [200, 60, 60];
  if (/brick|cobble|polished|smooth|quartz|deepslate_tiles/.test(n)) return [150, 150, 160];
  if (/stone|andesite|diorite|granite|tuff|deepslate/.test(n)) return [115, 115, 115];
  return [255, 0, 255];
};
const raw = Buffer.alloc((W * 3 + 1) * D);
for (let z = 0; z < D; z++) { raw[z * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) { const i = x + z * W, c = col(topN[i]); const s = topY[i] < -900 ? 1 : Math.max(0.55, Math.min(1.35, 1 + (topY[i] - 70) * 0.008)); for (let k = 0; k < 3; k++) raw[z * (W * 3 + 1) + 1 + x * 3 + k] = Math.min(255, c[k] * s); } }
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(D, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
const unk = new Map<string, number>(); for (const n of topN) if (n && col(n)[0] === 255 && col(n)[2] === 255) unk.set(n, (unk.get(n) ?? 0) + 1);
console.log('wrote', out, W, 'x', D, 'unknown tops:', [...unk].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, c]) => n + ' ' + c).join(', '));
