// Every block name (with its states) in a box of a Bedrock world that matches a pattern, and how many sub-chunks use it.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s, pat] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16), re = new RegExp(pat);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && (() => { const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })());
const seen = new Map<string, number>();
for (const [, e] of db) { if (!e.value) continue; const sc = readSubChunk(e.value); if (!sc) continue; for (const p of sc.palette) if (re.test(p.name)) { const k = p.name + ' ' + JSON.stringify(p.states); seen.set(k, (seen.get(k) ?? 0) + 1); } }
for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1])) console.log(n, k.slice(0, 200));
