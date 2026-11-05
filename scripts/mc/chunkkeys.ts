import { readDb } from './leveldb';
const [dir, cxs, czs] = process.argv.slice(2);
const cx = +cxs, cz = +czs;
const db = readDb(dir, (k) => k.length >= 9 && k.readInt32LE(0) === cx && k.readInt32LE(4) === cz, () => false);
for (const [k, e] of db) { const b = Buffer.from(k, 'latin1'); console.log(b.length, b[8], b.length > 9 ? b[9] : '', e.del ? 'DEL' : '', e.seq); }
