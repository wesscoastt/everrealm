// A top-down sketch of part of a Bedrock world, one character per 2 blocks: what's on top, and how tall.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const W = X1 - X0 + 1, D = Z1 - Z0 + 1;
const topY = new Int16Array(W * D).fill(-999), topName: string[] = new Array(W * D).fill('');
let lowest = 999;
const BUILT = /planks|stairs|slab|fence|glass|door|brick|lantern|hay|carpet|bed$|chest|barrel|wool|terracotta|concrete|quartz|cobblestone|log|torch/;
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
    const x = sx + lx, z = sz + lz; if (x < X0 || x > X1 || z < Z0 || z > Z1) continue;
    for (let ly = 15; ly >= 0; ly--) {
      const n = sc.palette[sc.idx[lx * 256 + lz * 16 + ly]].name.replace('minecraft:', '');
      if (n === 'air' || n.includes('grass') && !n.includes('block')) continue;
      const i = (x - X0) + (z - Z0) * W;
      if (sy + ly > topY[i]) { topY[i] = sy + ly; topName[i] = n; }
      if (BUILT.test(n) && sy + ly < 60) lowest = Math.min(lowest, sy + ly);
      break;
    }
  }
}
const ch = (n: string) => /snow|ice/.test(n) ? '*' : /water/.test(n) ? '~' : /leaves/.test(n) ? 't' : /hay/.test(n) ? 'h' : /fence/.test(n) ? 'f' : /glass/.test(n) ? 'g' : /planks|stairs|slab|log|wood/.test(n) ? 'W' : /brick|stone_bricks|cobble/.test(n) ? 'S' : /grass_block|dirt|podzol/.test(n) ? '.' : /stone|andesite|granite|diorite|gravel/.test(n) ? ',' : '?';
console.log('lowest built block below y60:', lowest);
for (let z = Z0; z <= Z1; z += 2) { let r = String(z).padStart(5) + ' '; for (let x = X0; x <= X1; x += 2) { const i = (x - X0) + (z - Z0) * W; r += topY[i] > 80 && !/leaves/.test(topName[i]) ? (topY[i] > 95 ? '#' : '^') : ch(topName[i]); } console.log(r); }
