// Top block and its height (last digit) over an area, two characters a block: npx tsx scripts/_hmap.ts x0 z0 x1 z1 [maxY]
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { B } from '../src/world/blocks';
import { SY } from '../src/world/VoxelWorld';
plan();
const [x0, z0, x1, z1, maxY = SY - 1] = process.argv.slice(2).map(Number);
const chunks = new Map<string, Uint8Array>();
const get = (x: number, y: number, z: number): number => {
  const k = (x >> 5) + ',' + (z >> 5);
  let c = chunks.get(k);
  if (!c) { c = generateChunk(x >> 5, z >> 5).data as Uint8Array; chunks.set(k, c); }
  return c[(x & 31) + 32 * ((z & 31) + 32 * y)];
};
const CH: Record<number, string> = { [B.Water]: '~', [B.Planks]: '=', [B.DarkPlanks]: '=', [B.Cobble]: 'c', [B.MossyCobble]: 'c', [B.StoneBrick]: '#', [B.Plaster]: 'P', [B.Grass]: '.', [B.Sand]: ':', [B.Gravel]: ',', [B.Path]: ',', [B.Stone]: 's', [B.Dirt]: 'd', [B.Window]: 'W', [B.Barrier]: 'b', [B.Flagstone]: 'f', [B.FlowerGrass]: '*' };
let hdr = '      ';
for (let x = x0; x <= x1; x++) hdr += (x % 10 === 0 ? String((x / 10) % 10) : ' ') + ' ';
console.log(hdr);
for (let z = z0; z <= z1; z++) {
  let row = String(z).padStart(5) + ' ';
  for (let x = x0; x <= x1; x++) {
    let y = maxY;
    while (y > 0 && get(x, y, z) === B.Air) y--;
    row += (CH[get(x, y, z)] ?? '?') + String(y % 10);
  }
  console.log(row);
}
