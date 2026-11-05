// A build, layer by layer, one character a block: for redesigning part of an imported build.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s, y0s, y1s] = process.argv.slice(2);
const X0 = +x0s, Z0 = +z0s, X1 = +x1s, Z1 = +z1s, Y0 = +y0s, Y1 = +y1s;
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && (() => { const x = k.readInt32LE(0) * 16, z = k.readInt32LE(4) * 16, y = k.readInt8(9) * 16; return x + 15 >= X0 && x <= X1 && z + 15 >= Z0 && z <= Z1 && y + 15 >= Y0 && y <= Y1; })());
const cell = new Map<string, string>();
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const sx = b.readInt32LE(0) * 16, sz = b.readInt32LE(4) * 16, sy = b.readInt8(9) * 16;
  for (let i = 0; i < 4096; i++) { const x = sx + (i >> 8), z = sz + ((i >> 4) & 15), y = sy + (i & 15); if (x >= X0 && x <= X1 && z >= Z0 && z <= Z1 && y >= Y0 && y <= Y1) cell.set(`${x},${y},${z}`, sc.palette[sc.idx[i]].name.replace('minecraft:', '')); }
}
const legend = new Map<string, string>();
const sym = (n: string) => { if (n === 'air') return ' '; if (n === 'water') return '~'; if (!legend.has(n)) legend.set(n, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=<>'[legend.size] ?? '?'); return legend.get(n)!; };
for (let y = Y0; y <= Y1; y++) { console.log(`--- y ${y}`); for (let z = Z0; z <= Z1; z++) { let r = String(z).padStart(5) + ' '; for (let x = X0; x <= X1; x++) r += sym(cell.get(`${x},${y},${z}`) ?? 'air'); console.log(r); } }
console.log([...legend].map(([n, c]) => c + '=' + n).join('  '));
