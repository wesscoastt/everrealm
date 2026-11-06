// Where you'd stand walking a line of columns: the floor height at each, and any step over a block
// up or a drop of more than one (a path that doesn't connect). npx tsx scripts/_walkline.ts x0 z0 x1 z1
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { B, isSolid } from '../src/world/blocks';
import { SY } from '../src/world/VoxelWorld';

plan();
const [x0, z0, x1, z1] = process.argv.slice(2).map(Number);
const chunks = new Map<string, Uint8Array>();
const get = (x: number, y: number, z: number): number => {
  const k = (x >> 5) + ',' + (z >> 5);
  let c = chunks.get(k);
  if (!c) { c = generateChunk(x >> 5, z >> 5).data as Uint8Array; chunks.set(k, c); }
  return c[(x & 31) + 32 * ((z & 31) + 32 * y)];
};
const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
let last: number | null = null;
for (let i = 0; i <= n; i++) {
  const x = Math.round(x0 + ((x1 - x0) * i) / n), z = Math.round(z0 + ((z1 - z0) * i) / n);
  // The floor nearest the last one: a solid block with two of air (or barrier-free) over it
  const floors: number[] = [];
  for (let y = 1; y < SY - 2; y++) if (isSolid(get(x, y - 1, z)) && get(x, y - 1, z) !== B.Barrier && !isSolid(get(x, y, z)) && !isSolid(get(x, y + 1, z))) floors.push(y);
  const f = last === null ? floors[floors.length - 1] : floors.reduce((a, b) => (Math.abs(b - last!) < Math.abs(a - last!) ? b : a), floors[0]);
  const step = last === null ? 0 : f - last;
  const top = get(x, f - 1, z);
  console.log(`${x},${z} floor ${f} on ${B[top]}${Math.abs(step) > 1 ? `   <-- ${step > 0 ? 'climb' : 'drop'} of ${Math.abs(step)}` : ''}`);
  last = f;
}
