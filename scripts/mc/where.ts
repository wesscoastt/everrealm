// Where's the building in a Bedrock world? The player's spot, and a heat map of built blocks (planks,
// bricks, glass, wool and the like) by chunk, so the city's extent can be read off it.
import { readDb } from './leveldb';
import { NbtReader, readSubChunk } from './bedrock';
const dir = process.argv[2];
const BUILT = /planks|brick|glass|wool|stairs|slab|fence|door|_wall|concrete|terracotta|lantern|torch|bookshelf|log$|stripped|chiseled|smooth_|polished|carpet|trapdoor|bed$|banner|chest|barrel/;
const heat = new Map<string, number>();
const db = readDb(dir, (k) => k[0] === 0x7e || ((k.length === 10) && k[8] === 0x2f), (k) => true);
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1');
  if (k === '~local_player') {
    const t = new NbtReader(e.value).read() as Record<string, unknown>;
    console.log('player', JSON.stringify(t.Pos), 'dim', t.DimensionId);
    continue;
  }
  if (b.length !== 10) continue;
  const sc = readSubChunk(e.value); if (!sc) continue;
  const built = sc.palette.map((q) => BUILT.test(q.name));
  let n = 0; for (let i = 0; i < 4096; i++) if (built[sc.idx[i]]) n++;
  if (!n) continue;
  const key = b.readInt32LE(0) + ',' + b.readInt32LE(4);
  heat.set(key, (heat.get(key) ?? 0) + n);
}
const list = [...heat].filter(([, n]) => n > 200).map(([k, n]) => { const [x, z] = k.split(',').map(Number); return { x, z, n }; });
console.log('chunks with building', list.length);
// in 8x8-chunk cells (128 blocks), the busiest
const cells = new Map<string, number>();
for (const c of list) { const k = Math.floor(c.x / 8) + ',' + Math.floor(c.z / 8); cells.set(k, (cells.get(k) ?? 0) + c.n); }
const top = [...cells].sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log(top.map(([k, n]) => { const [x, z] = k.split(',').map(Number); return `${x * 128},${z * 128}:${n}`; }).join('  '));
