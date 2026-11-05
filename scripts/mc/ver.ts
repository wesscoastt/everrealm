import { readDb } from './leveldb';
const [dir] = process.argv.slice(2);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) >= 20 && k.readInt32LE(0) <= 40 && k.readInt32LE(4) >= 18 && k.readInt32LE(4) <= 30);
const v = new Map<string, number>();
for (const [, e] of db) if (e.value) { const key = e.value[0] + '/' + e.value[1] + '/' + (e.value[2] >> 1); v.set(key, (v.get(key) ?? 0) + 1); }
console.log([...v].sort((a, b) => b[1] - a[1]).slice(0, 12));
