// The states Bedrock keeps on a few kinds of block (one of each seen), for the shape layer.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const dir = process.argv[2];
const seen = new Map<string, string>();
const db = readDb(dir, (k) => { if (k.length !== 10 || k[8] !== 0x2f) return false; const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= -20 && x <= -10 && z >= 40 && z <= 60; });
for (const [, e] of db) {
  if (!e.value) continue;
  const sc = readSubChunk(e.value); if (!sc) continue;
  for (const p of sc.palette) {
    const n = p.name.replace(/^minecraft:/, '');
    const kind = /stairs/.test(n) ? 'stairs' : /double_slab/.test(n) ? 'dslab' : /slab/.test(n) ? 'slab' : /wall$/.test(n) ? 'wall' : /fence_gate/.test(n) ? 'gate' : /trapdoor/.test(n) ? 'trapdoor' : /fence$/.test(n) ? 'fence' : null;
    if (!kind) continue;
    const key = kind + ' ' + JSON.stringify(p.states);
    if (!seen.has(kind + JSON.stringify(Object.keys(p.states)))) { seen.set(kind + JSON.stringify(Object.keys(p.states)), n); console.log(kind, n, JSON.stringify(p.states)); }
  }
}
