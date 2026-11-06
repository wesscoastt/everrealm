// Where blocks matching a pattern are in a box of a Bedrock world: their bounds, and a count by height.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s, pat] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, re = new RegExp(pat);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
let b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], n = 0; const byY = new Map<number, number>();
for (const [k, e] of db) {
  if (!e.value) continue; const kb = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = kb.readInt32LE(0) * 16, sz = kb.readInt32LE(4) * 16, sy = kb.readInt8(9) * 16, hit = sc.palette.map((p) => re.test(p.name));
  for (let i = 0; i < 4096; i++) if (hit[sc.idx[i]]) { const x = sx + (i >> 8), z = sz + ((i >> 4) & 15), y = sy + (i & 15); if (x < X0 || x > X1 || z < Z0 || z > Z1 || y < +(process.env.YMIN ?? -999)) continue; n++; b = [Math.min(b[0], x), Math.min(b[1], y), Math.min(b[2], z), Math.max(b[3], x), Math.max(b[4], y), Math.max(b[5], z)]; byY.set(y, (byY.get(y) ?? 0) + 1); }
}
console.log(n, 'blocks; x', b[0], '..', b[3], 'y', b[1], '..', b[4], 'z', b[2], '..', b[5]);
console.log([...byY].sort((a, c) => a[0] - c[0]).map(([y, c]) => y + ':' + c).join(' '));
