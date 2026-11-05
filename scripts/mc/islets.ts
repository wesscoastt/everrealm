// Small landmasses in a box of a Bedrock world (natural ground under anything built), with their size, where,
// how high they rise, and what's built on them.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, W = X1 - X0 + 1, D = Z1 - Z0 + 1;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 2 && k.readInt8(9) <= 8 && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const NATURAL = /^minecraft:(grass_block|dirt|coarse_dirt|podzol|sand|gravel|stone|granite|diorite|andesite|clay|moss_block|sandstone)$/;
const kind = new Uint8Array(W * D), top = new Int16Array(W * D).fill(-999), what = new Map<number, Map<string, number>>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
    const x = sx + lx, z = sz + lz; if (x < X0 || x > X1 || z < Z0 || z > Z1) continue;
    const i = (x - X0) + (z - Z0) * W;
    for (let ly = 15; ly >= 0; ly--) {
      const n = sc.palette[sc.idx[lx * 256 + lz * 16 + ly]].name;
      if (n === 'minecraft:air') continue;
      if (sy + ly > top[i]) top[i] = sy + ly;
      if (n === 'minecraft:water') { if (!kind[i]) kind[i] = 1; break; }
      if (NATURAL.test(n)) { if (sy + ly >= 60) kind[i] = 2; break; }
      if (sy + ly >= 60) { const m = what.get(i) ?? new Map(); m.set(n, (m.get(n) ?? 0) + 1); what.set(i, m); }
    }
  }
}
const seen = new Uint8Array(W * D);
for (let s = 0; s < W * D; s++) {
  if (kind[s] !== 2 || seen[s]) continue;
  const q = [s]; seen[s] = 1; let n = 0, sx = 0, sz = 0, hi = 0; const names = new Map<string, number>();
  while (q.length) { const i = q.pop()!; n++; const x = i % W, z = (i / W) | 0; sx += x; sz += z; hi = Math.max(hi, top[i]); for (const [k2, c] of what.get(i) ?? []) names.set(k2, (names.get(k2) ?? 0) + c); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (!seen[j] && kind[j] === 2) { seen[j] = 1; q.push(j); } } }
  if (n >= 20 && n < 6000) console.log(`islet ${n} cols at ${Math.round(sx / n) + X0},${Math.round(sz / n) + Z0}, top y ${hi}: ${[...names].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k2, c]) => k2.replace('minecraft:', '') + ':' + c).join(' ')}`);
}
