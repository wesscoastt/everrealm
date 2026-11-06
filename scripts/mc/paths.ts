// Where the paths go (grass/dirt path and gravel/cobble roads on top) in a box of a Bedrock world, 16-block cells, with building.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 7 && (() => { const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })());
const path = new Map<string, number>(), built = new Map<string, number>();
const PATH = /^minecraft:(grass_path|dirt_path)$/, BUILT = /^minecraft:(.*_planks|.*_stairs|.*_slab|.*fence|.*glass.*|.*_door|stone_bricks|bricks|cobblestone|.*_wall|.*terracotta|.*concrete|.*wool|lantern|torch|wall_torch|.*_carpet|.*_bed)$/;
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const key = b.readInt32LE(0) + ',' + b.readInt32LE(4);
  const p = sc.palette.map((q) => PATH.test(q.name)), bl = sc.palette.map((q) => BUILT.test(q.name));
  let np = 0, nb = 0; for (let i = 0; i < 4096; i++) { if (p[sc.idx[i]]) np++; if (bl[sc.idx[i]]) nb++; }
  if (np) path.set(key, (path.get(key) ?? 0) + np); if (nb) built.set(key, (built.get(key) ?? 0) + nb);
}
console.log(`x from ${X0 * 16}, 16 a character: = path, # built, + path and built`);
for (let z = Z0; z <= Z1; z++) { let r = String(z * 16).padStart(6) + ' '; for (let x = X0; x <= X1; x++) { const k = x + ',' + z, p = (path.get(k) ?? 0) > 6, b = (built.get(k) ?? 0) > 60; r += p && b ? '+' : p ? '=' : b ? '#' : '.'; } console.log(r); }
