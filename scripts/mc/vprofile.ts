// Built blocks by height (and where) in a box of a Bedrock world: for fitting a build's depth into the game's.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const BUILT = /planks|stairs|slab|fence|glass|door|brick|lantern|hay|carpet|bed$|chest|barrel|wool|terracotta|concrete|quartz|torch|ladder|rail|bookshelf|furnace|crafting|trapdoor|lamp|polished|smooth/;
const by = new Map<number, { n: number; x0: number; x1: number; z0: number; z1: number; names: Map<string, number> }>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  const isB = sc.palette.map((p) => BUILT.test(p.name));
  for (let i = 0; i < 4096; i++) {
    if (!isB[sc.idx[i]]) continue;
    const x = sx + (i >> 8), z = sz + ((i >> 4) & 15), y = sy + (i & 15);
    if (x < X0 || x > X1 || z < Z0 || z > Z1) continue;
    const band = Math.floor(y / 8) * 8;
    const r = by.get(band) ?? { n: 0, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, names: new Map() };
    r.n++; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.z0 = Math.min(r.z0, z); r.z1 = Math.max(r.z1, z);
    const nm = sc.palette[sc.idx[i]].name.replace('minecraft:', ''); r.names.set(nm, (r.names.get(nm) ?? 0) + 1);
    by.set(band, r);
  }
}
for (const [y, r] of [...by].sort((a, b) => a[0] - b[0])) console.log(`y ${y}..${y + 7}: ${r.n} at x ${r.x0}..${r.x1} z ${r.z0}..${r.z1}  ${[...r.names].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => n + ':' + c).join(' ')}`);
