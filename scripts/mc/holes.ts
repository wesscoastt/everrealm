// Which chunks of a box of a Bedrock world have any terrain saved: # saved, . missing (16-block chunks).
import { readDb } from './leveldb';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16);
const have = new Set<string>();
readDb(dir, (k) => { if (k.length === 10 && k[8] === 0x2f) { const x = k.readInt32LE(0), z = k.readInt32LE(4); if (x >= X0 && x <= X1 && z >= Z0 && z <= Z1) have.add(x + ',' + z); } return false; });
console.log('x from', X0 * 16, '; missing', (X1 - X0 + 1) * (Z1 - Z0 + 1) - have.size, 'of', (X1 - X0 + 1) * (Z1 - Z0 + 1));
for (let z = Z0; z <= Z1; z++) { let r = String(z * 16).padStart(6) + ' '; for (let x = X0; x <= X1; x++) r += have.has(x + ',' + z) ? '#' : '.'; console.log(r); }
