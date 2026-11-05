// The landmass a point stands on, in a Bedrock world: flood-filled over the columns whose top (y 50 to 140)
// isn't water, out to a search box. Prints its size, its extent, and whether it reaches the box (not an island).
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, sxs, szs, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, W = X1 - X0 + 1, D = Z1 - Z0 + 1;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 8 && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
// 0 unknown (never generated), 1 water on top, 2 land
const kind = new Uint8Array(W * D), topY = new Int16Array(W * D).fill(-999);
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  // (looking down through anything built, and the trees, to what's underneath: the ground, or the water a dock or a bridge stands over)
  const NATURAL = /^minecraft:(grass_block|dirt|coarse_dirt|podzol|rooted_dirt|mud|sand|red_sand|gravel|stone|granite|diorite|andesite|deepslate|tuff|calcite|clay|snow_block|snow|powder_snow|ice|packed_ice|blue_ice|moss_block|mycelium|dirt_path|sandstone|red_sandstone|terracotta|.*_terracotta)$|^pu_biomes:|^ecbl/;
  const nat = sc.palette.map((p) => NATURAL.test(p.name) && !/glazed/.test(p.name));
  const water = sc.palette.map((p) => p.name === 'minecraft:water');
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
    const x = sx + lx, z = sz + lz; if (x < X0 || x > X1 || z < Z0 || z > Z1) continue;
    const i = (x - X0) + (z - Z0) * W;
    for (let ly = 15; ly >= 0; ly--) { const c = sc.idx[lx * 256 + lz * 16 + ly]; if (!nat[c] && !water[c]) continue; if (sy + ly > topY[i]) { topY[i] = sy + ly; kind[i] = water[c] ? 1 : 2; } break; }
  }
}
const seen = new Uint8Array(W * D), q: number[] = [];
const s = (+sxs - X0) + (+szs - Z0) * W; seen[s] = 1; q.push(s);
let n = 0, ex0 = 1e9, ex1 = -1e9, ez0 = 1e9, ez1 = -1e9, edge = 0;
while (q.length) {
  const i = q.pop()!; n++;
  const x = i % W, z = (i / W) | 0; ex0 = Math.min(ex0, x); ex1 = Math.max(ex1, x); ez0 = Math.min(ez0, z); ez1 = Math.max(ez1, z);
  if (x === 0 || z === 0 || x === W - 1 || z === D - 1) edge++;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (!seen[j] && kind[j] === 2) { seen[j] = 1; q.push(j); } }
}
console.log(`land ${n} columns, x ${ex0 + X0}..${ex1 + X0}, z ${ez0 + Z0}..${ez1 + Z0}, touching the box edge at ${edge} columns`);
// a sketch, 8 blocks a character: # this land, . other land, ~ water, space unknown
for (let z = 0; z < D; z += 16) { let r = String(z + Z0).padStart(6) + ' '; for (let x = 0; x < W; x += 8) { const i = x + z * W; r += seen[i] ? '#' : kind[i] === 2 ? '.' : kind[i] === 1 ? '~' : ' '; } console.log(r); }
