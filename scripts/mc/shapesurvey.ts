// What shaped blocks (stairs, slabs, walls) the owner's world has in the imported pieces, and where its prismarine is.
//   npx tsx scripts/mc/shapesurvey.ts "<world>/db"
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { MC_PIECES } from '../../src/world/mclandArea';
const dir = process.argv[2];
const counts = new Map<string, number>();
const pris: [number, number, number, string][] = [];
for (const piece of MC_PIECES) {
  const cx0 = Math.floor(piece.mx0 / 16), cx1 = Math.floor(piece.mx1 / 16), cz0 = Math.floor(piece.mz0 / 16), cz1 = Math.floor(piece.mz1 / 16);
  const db = readDb(dir, (k) => { if (k.length !== 10 || k[8] !== 0x2f) return false; const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= cx0 && x <= cx1 && z >= cz0 && z <= cz1; });
  for (const [k, e] of db) {
    if (!e.value) continue;
    const b = Buffer.from(k, 'latin1'), X = b.readInt32LE(0) * 16, Z = b.readInt32LE(4) * 16, Y = b.readInt8(9) * 16;
    const sc = readSubChunk(e.value); if (!sc) continue;
    for (let i = 0; i < 4096; i++) {
      const p = sc.palette[sc.idx[i]]; const n = p.name.replace(/^minecraft:/, '');
      if (/stairs|slab|_wall$|wall$/.test(n)) counts.set(n, (counts.get(n) ?? 0) + 1);
      if (/prismarine|trident/.test(n)) { const x = X + (i >> 8), z = Z + ((i >> 4) & 15), y = Y + (i & 15); if (x >= piece.mx0 && x <= piece.mx1 && z >= piece.mz0 && z <= piece.mz1) pris.push([x, y, z, n]); }
    }
  }
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log('shaped blocks', top.reduce((a, b) => a + b[1], 0));
for (const [n, c] of top.slice(0, 40)) console.log(String(c).padStart(7), n);
const pc = new Map<string, number>(); for (const [, , , n] of pris) pc.set(n, (pc.get(n) ?? 0) + 1);
console.log('prismarine', JSON.stringify([...pc]));
if (pris.length) { const xs = pris.map((p) => p[0]), zs = pris.map((p) => p[2]), ys = pris.map((p) => p[1]); console.log('prismarine box', Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)); }
