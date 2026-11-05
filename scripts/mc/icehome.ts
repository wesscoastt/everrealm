// Built places beside snow and ice in a Bedrock world: chunks with both, ranked.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir] = process.argv.slice(2);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 7);
const snow = new Map<string, number>(), built = new Map<string, number>(), deep = new Map<string, number>();
const SNOW = /snow|ice|powder_snow|frosted/, BUILT = /planks|stairs|slab|fence|glass|door|stone_bricks|brick|lantern|hay|carpet|bed$|chest|barrel/;
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const key = b.readInt32LE(0) + ',' + b.readInt32LE(4);
  const s = sc.palette.map((p) => SNOW.test(p.name)), bl = sc.palette.map((p) => BUILT.test(p.name));
  let ns = 0, nb = 0; for (let i = 0; i < 4096; i++) { if (s[sc.idx[i]]) ns++; if (bl[sc.idx[i]]) nb++; }
  if (ns) snow.set(key, (snow.get(key) ?? 0) + ns);
  if (nb) { built.set(key, (built.get(key) ?? 0) + nb); if (b.readInt8(9) <= 3) deep.set(key, (deep.get(key) ?? 0) + nb); }
}
// 64-block cells with building and snow round them
const cell = new Map<string, { s: number; b: number; d: number }>();
for (const [k, n] of built) { const [x, z] = k.split(',').map(Number); const ck = Math.floor(x / 4) + ',' + Math.floor(z / 4); const c = cell.get(ck) ?? { s: 0, b: 0, d: 0 }; c.b += n; c.d += deep.get(k) ?? 0; cell.set(ck, c); }
for (const [k, n] of snow) { const [x, z] = k.split(',').map(Number); const ck = Math.floor(x / 4) + ',' + Math.floor(z / 4); const c = cell.get(ck); if (c) c.s += n; }
const list = [...cell].filter(([, c]) => c.s > 300 && c.b > 300).sort((a, b) => b[1].b - a[1].b).slice(0, 15);
for (const [k, c] of list) { const [x, z] = k.split(',').map(Number); console.log(`x ${x * 64}..${x * 64 + 63}, z ${z * 64}..${z * 64 + 63}: built ${c.b}, snow ${c.s}, built below y64 ${c.d}`); }
