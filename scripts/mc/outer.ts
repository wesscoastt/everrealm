// Built blocks above ground (vanilla and add-on, no terrain), 32-block cells, round a town.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 32), Z0 = Math.floor(+z0s / 32), X1 = Math.floor(+x1s / 32), Z1 = Math.floor(+z1s / 32);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 9 && (() => { const x = Math.floor(k.readInt32LE(0) / 2), z = Math.floor(k.readInt32LE(4) / 2); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })());
const BUILT = /^minecraft:(.*_planks|.*_stairs|.*_slab|.*fence|.*glass.*|.*_door|stone_bricks|bricks|.*_wall|cobblestone|.*terracotta|.*concrete|.*wool|lantern|bookshelf|barrel|hay_block|.*_carpet|.*trapdoor|.*_bed)$|^(xp_furniture|ulkd_ess|mra_cvl|sgs_farm|razz_sup|sb_ov|kubo_mv)/;
const cell = new Map<string, number>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sy = b.readInt8(9) * 16, sc = readSubChunk(e.value); if (!sc) continue;
  const isB = sc.palette.map((p) => BUILT.test(p.name));
  let n = 0; for (let i = 0; i < 4096; i++) if (sy + (i & 15) >= 62 && isB[sc.idx[i]]) n++;
  if (n) { const ck = Math.floor(b.readInt32LE(0) / 2) + ',' + Math.floor(b.readInt32LE(4) / 2); cell.set(ck, (cell.get(ck) ?? 0) + n); }
}
console.log(`x from ${X0 * 32}, 32 a character: # >300, + >40, . some`);
for (let z = Z0; z <= Z1; z++) { let r = String(z * 32).padStart(6) + ' '; for (let x = X0; x <= X1; x++) { const n = cell.get(x + ',' + z) ?? 0; r += n > 300 ? '#' : n > 40 ? '+' : n > 0 ? '.' : ' '; } console.log(r); }
