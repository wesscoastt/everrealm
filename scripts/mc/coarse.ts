// A coarse top-down of a Bedrock world, one character per 8 blocks: * snow/ice, ~ water, W wood, S stone build, . land, t leaves, ' ' not generated.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, ST = 8;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1; })());
const top = new Map<string, [number, string]>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let lx = 0; lx < 16; lx += ST) for (let lz = 0; lz < 16; lz += ST) {
    for (let ly = 15; ly >= 0; ly--) {
      const n = sc.palette[sc.idx[lx * 256 + lz * 16 + ly]].name.replace('minecraft:', '');
      if (n === 'air' || /grass$|short_grass|tall_grass|fern/.test(n)) continue;
      const key = (sx + lx) + ',' + (sz + lz), t = top.get(key);
      if (!t || sy + ly > t[0]) top.set(key, [sy + ly, n]);
      break;
    }
  }
}
const ch = (n: string) => /snow|ice/.test(n) ? '*' : /water/.test(n) ? '~' : /leaves/.test(n) ? 't' : /planks|stairs|slab|log|wood|fence|hay|glass/.test(n) ? 'W' : /brick|cobble|lantern|torch/.test(n) ? 'S' : /sand/.test(n) ? ':' : '.';
console.log('x from', X0, 'by', ST);
for (let z = Math.floor(Z0 / ST) * ST; z <= Z1; z += ST) { let r = String(z).padStart(6) + ' '; for (let x = Math.floor(X0 / ST) * ST; x <= X1; x += ST) { const t = top.get(x + ',' + z); r += t ? ch(t[1]) : ' '; } console.log(r.replace(/ +$/, '')); }
