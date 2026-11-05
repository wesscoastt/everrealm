import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir] = process.argv.slice(2);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) === 26 && k.readInt32LE(4) === 21);
for (const [k, e] of db) { const b = Buffer.from(k, 'latin1'); try { const s = readSubChunk(e.value!); console.log(b.readInt8(9), s ? s.palette.map((p) => p.name.replace('minecraft:', '')).join(',') : 'null'); } catch (x) { console.log(b.readInt8(9), 'ERR', (x as Error).message); } }
