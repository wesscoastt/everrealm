// A top-down map of the generated world over an area, one character a block: what's on top of each
// column. For planning town work: npx tsx scripts/_topmap.ts x0 z0 x1 z1 [step]
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { B } from '../src/world/blocks';
import { SY } from '../src/world/VoxelWorld';

plan();
const [x0, z0, x1, z1, step = 1] = process.argv.slice(2).map(Number);
const chunks = new Map<string, Uint8Array>();
const get = (x: number, y: number, z: number): number => {
  const cx = x >> 5, cz = z >> 5, k = cx + ',' + cz;
  let c = chunks.get(k);
  if (!c) { c = generateChunk(cx, cz).data as Uint8Array; chunks.set(k, c); }
  return c[(x & 31) + 32 * ((z & 31) + 32 * y)];
};
const CH: Record<number, string> = {
  [B.Water]: '~', [B.Planks]: '=', [B.DarkPlanks]: '=', [B.Cobble]: 'c', [B.MossyCobble]: 'c', [B.StoneBrick]: '#', [B.Plaster]: 'P', [B.Timber]: 'T',
  [B.Grass]: '.', [B.Sand]: ':', [B.Gravel]: ',', [B.Path]: ',', [B.Stone]: 's', [B.Dirt]: 'd', [B.Window]: 'W', [B.Barrier]: 'b', [B.OakLeaves]: '*', [B.OakLog]: 'L', [B.Farmland]: 'f',
};
const NAME: Record<number, string> = Object.fromEntries(Object.entries(B).map(([k, v]) => [v as number, k]));
const seen = new Map<string, number>();
const header = '      ' + Array.from({ length: Math.floor((x1 - x0) / step) + 1 }, (_, i) => ((x0 + i * step) % 10 === 0 ? '|' : ' ')).join('');
console.log(header);
for (let z = z0; z <= z1; z += step) {
  let row = String(z).padStart(5) + ' ';
  for (let x = x0; x <= x1; x += step) {
    let y = SY - 1;
    while (y > 0 && get(x, y, z) === B.Air) y--;
    const id = get(x, y, z);
    row += CH[id] ?? (NAME[id] ?? '?')[0].toUpperCase();
  }
  console.log(row);
}
