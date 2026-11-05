// What's in a Bedrock world: chunk counts, the extent, where the player stands.
import { readDb } from './leveldb';
const dir = process.argv[2];
const t0 = Date.now();
const db = readDb(dir, undefined, (k) => k[0] === 0x7e);
let sub = 0, chunks = new Set<string>(), minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
const others: string[] = [];
for (const [k, e] of db) {
  if (e.del) continue;
  const b = Buffer.from(k, 'latin1');
  if ((b.length === 10 || b.length === 14) && b[b.length - 2] === 0x2f) {
    if (b.length === 14) continue; // other dimensions
    const x = b.readInt32LE(0), z = b.readInt32LE(4);
    sub++; chunks.add(x + ',' + z);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  } else if (b.length > 0 && b.length < 40 && /^[~\x20-\x7e]+$/.test(k)) others.push(k);
}
console.log('keys', db.size, 'subchunks', sub, 'chunks', chunks.size, 'x', minX, maxX, 'z', minZ, maxZ, (Date.now() - t0) + 'ms');
console.log('named keys:', others.slice(0, 30).join(' | '));
const pl = db.get('~local_player');
if (pl?.value) { const s = pl.value.toString('latin1'); const i = s.indexOf('Pos'); console.log('player Pos at', i, [...pl.value.subarray(i + 3, i + 3 + 20)].join(',')); for (let j = i + 3; j < i + 30; j++) {} 
  // Pos: a list tag of 3 floats (little-endian): id 9, name, type 5, count 3, floats
  const p = i + 3; const type = pl.value[p], n = pl.value.readInt32LE(p + 1); const xs = [0, 1, 2].map((q) => pl.value!.readFloatLE(p + 5 + q * 4)); console.log('type', type, 'n', n, 'pos', xs.map((v) => v.toFixed(1)).join(', '));
}
