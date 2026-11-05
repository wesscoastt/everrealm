// Settlements in a Bedrock world: built blocks above ground (vanilla only, y 60 and up) by 64-block cell,
// and how much water is round each, to find a port town on an island.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir] = process.argv.slice(2);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 7);
const BUILT = /^minecraft:(.*_planks|.*_stairs|.*_slab|.*fence|.*glass.*|.*_door|stone_bricks|bricks|.*_wall|cobblestone|.*terracotta|.*concrete|.*wool|lantern|bookshelf|barrel|chest|hay_block|.*_carpet|.*trapdoor|bed|.*_bed|bell|.*_log)$/;
const cell = new Map<string, { b: number; w: number }>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sy = b.readInt8(9) * 16;
  const sc = readSubChunk(e.value); if (!sc) continue;
  const isB = sc.palette.map((p) => BUILT.test(p.name) && !/_log$/.test(p.name)), isW = sc.palette.map((p) => p.name === 'minecraft:water');
  let nb = 0, nw = 0;
  for (let i = 0; i < 4096; i++) { const y = sy + (i & 15); if (y < 60) continue; if (isB[sc.idx[i]]) nb++; else if (isW[sc.idx[i]] && y >= 60 && y <= 62) nw++; }
  const ck = Math.floor(b.readInt32LE(0) / 4) + ',' + Math.floor(b.readInt32LE(4) / 4);
  const c = cell.get(ck) ?? { b: 0, w: 0 }; c.b += nb; c.w += nw; cell.set(ck, c);
}
const list = [...cell].filter(([, c]) => c.b > 2500).sort((a, b) => b[1].b - a[1].b).slice(0, 30);
for (const [k, c] of list) { const [x, z] = k.split(',').map(Number); let water = 0; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) water += cell.get((x + dx) + ',' + (z + dz))?.w ?? 0; console.log(`x ${x * 64}, z ${z * 64}: built ${c.b}, sea round it ${water}`); }
