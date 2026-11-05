// The add-on (non-vanilla) blocks in a box of a Bedrock world, with where each kind stands.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const seen = new Map<string, { n: number; at: string[] }>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let i = 0; i < 4096; i++) {
    const n = sc.palette[sc.idx[i]].name;
    if (n.startsWith('minecraft:') || /^(pu_biomes|ecbl_bc):/.test(n)) continue;
    const r = seen.get(n) ?? { n: 0, at: [] }; r.n++;
    if (r.at.length < 4) r.at.push(`${sx + (i >> 8)},${sy + (i & 15)},${sz + ((i >> 4) & 15)}`);
    seen.set(n, r);
  }
}
for (const [n, r] of [...seen].sort((a, b) => b[1].n - a[1].n)) console.log(n, r.n, r.at.join(' '));
