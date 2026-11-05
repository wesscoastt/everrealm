// A rough map of built blocks round an area of a Bedrock world, 16-block cells, for finding a city's edges.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16);
const BUILT = /planks|brick|glass|wool|stairs|slab|fence|door|_wall|concrete|terracotta|lantern|bookshelf|stripped|chiseled|smooth_stone|polished|carpet|trapdoor|banner|stone_bricks|cobblestone|quartz|deepslate_tiles/;
const inBox = (k: Buffer) => k.length === 10 && k[8] === 0x2f && (() => { const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })();
const db = readDb(dir, inBox);
const heat = new Map<string, number>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const built = sc.palette.map((q) => BUILT.test(q.name));
  let n = 0; for (let i = 0; i < 4096; i++) if (built[sc.idx[i]]) n++;
  const key = b.readInt32LE(0) + ',' + b.readInt32LE(4);
  heat.set(key, (heat.get(key) ?? 0) + n);
}
const ch = ' .:-=+*#%@';
console.log(`x ${X0 * 16}..${X1 * 16 + 15}, z ${Z0 * 16}..${Z1 * 16 + 15}, one character a chunk`);
for (let z = Z0; z <= Z1; z++) { let r = String(z * 16).padStart(6) + ' '; for (let x = X0; x <= X1; x++) { const n = heat.get(x + ',' + z); r += n === undefined ? '~' : ch[Math.min(9, Math.ceil(Math.log2(1 + n) / 1.3))]; } console.log(r); }
console.log('dbg 26,21 =', heat.get('26,21'), 'db size', db.size);
