// Land and water round an area of a Bedrock world, 16-block cells: ~ water on top, . land, # built.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 5 && (() => { const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })());
// per chunk: of the 256 columns' top blocks between y 48 and 95: water, land, built
const top = new Map<string, { y: Int16Array; n: string[] }>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const key = b.readInt32LE(0) + ',' + b.readInt32LE(4), sy = b.readInt8(9) * 16;
  let t = top.get(key); if (!t) { t = { y: new Int16Array(256).fill(-999), n: new Array(256).fill('') }; top.set(key, t); }
  for (let c = 0; c < 256; c++) for (let ly = 15; ly >= 0; ly--) {
    const n = sc.palette[sc.idx[(c >> 4) * 256 + (c & 15) * 16 + ly]].name;
    if (n.endsWith(':air') || /grass$|flower|fern|torch|carpet/.test(n)) continue;
    if (sy + ly > t.y[c]) { t.y[c] = sy + ly; t.n[c] = n; }
    break;
  }
}
const BUILT = /^minecraft:(.*_planks|.*_stairs|.*_slab|.*fence|.*glass.*|stone_bricks|bricks|cobblestone|.*terracotta|.*concrete|.*wool|.*_carpet|barrel|lantern)$/;
for (let z = Z0; z <= Z1; z++) { let r = String(z * 16).padStart(6) + ' '; for (let x = X0; x <= X1; x++) { const t = top.get(x + ',' + z); if (!t) { r += ' '; continue; } let w = 0, b = 0; for (let c = 0; c < 256; c++) { if (/water/.test(t.n[c])) w++; else if (BUILT.test(t.n[c])) b++; } r += w > 180 ? '~' : b > 40 ? '#' : w > 60 ? ',' : '.'; } console.log(r); }
