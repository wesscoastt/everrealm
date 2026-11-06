import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { BLOCKS } from '../src/world/blocks';
plan();
const get = (x: number, y: number, z: number) => (generateChunk(x >> 5, z >> 5).data as Uint8Array)[(x & 31) + 32 * ((z & 31) + 32 * y)];
for (const [x, z] of [[169, 175], [169, 178], [166, 176], [172, 172], [169, 180]]) {
  let col = '';
  for (let y = 14; y < 24; y++) col += (BLOCKS[get(x, y, z)]?.name ?? '?').slice(0, 6).padEnd(7);
  console.log(x, z, col);
}
