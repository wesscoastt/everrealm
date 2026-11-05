// What stands in a few columns of a Bedrock world, top to bottom (runs of the same block).
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, ...pts] = process.argv.slice(2);
const want = pts.map((p) => p.split(',').map(Number));
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && want.some(([x, z]) => k.readInt32LE(0) === Math.floor(x / 16) && k.readInt32LE(4) === Math.floor(z / 16)));
for (const [x, z] of want) {
  const col = new Map<number, string>();
  for (const [k, e] of db) {
    const b = Buffer.from(k, 'latin1'); if (b.readInt32LE(0) !== Math.floor(x / 16) || b.readInt32LE(4) !== Math.floor(z / 16) || !e.value) continue;
    const sc = readSubChunk(e.value); if (!sc) continue;
    for (let ly = 0; ly < 16; ly++) col.set(b.readInt8(9) * 16 + ly, sc.palette[sc.idx[(((x % 16) + 16) % 16) * 256 + (((z % 16) + 16) % 16) * 16 + ly]].name.replace('minecraft:', ''));
  }
  const ys = [...col.keys()].sort((a, b) => b - a);
  const runs: string[] = [];
  let i = 0;
  while (i < ys.length) { const n = col.get(ys[i])!; let j = i; while (j + 1 < ys.length && col.get(ys[j + 1]) === n) j++; if (n !== 'air' || runs.length < 1) runs.push(`${ys[i]}${j > i ? '..' + ys[j] : ''} ${n}`); i = j + 1; }
  console.log(`${x},${z}: ` + runs.slice(0, 14).join(' | '));
}
