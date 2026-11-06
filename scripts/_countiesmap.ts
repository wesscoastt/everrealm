// A coarse map of the Counties: region letter, '=' road, '~' water, '^' high ground.
import { baseHeight, regionAt, roadDist, riverDist, SEA } from '../src/world/terrain';
const ch: Record<string, string> = { greenwake: 'g', crownroad: 'c', brambledeep: 'b', saltwind: 's', redstone: 'r', starfall: 'S', gannet: 'n', wrath: 'w', tolmen: 't', inkholm: 'i', kell: 'k' };
const step = Number(process.argv[2] ?? 48);
let head = '      ';
for (let x = 0; x <= 2432; x += step) head += x % (step * 5) === 0 ? '|' : ' ';
console.log(head);
for (let z = 0; z <= 2432; z += step) {
  let row = String(z).padStart(5) + ' ';
  for (let x = 0; x <= 2432; x += step) {
    const h = baseHeight(x, z);
    row += h <= SEA ? '~' : roadDist(x, z) < 6 ? '=' : riverDist(x, z) < 8 ? '~' : h > SEA + 40 ? '^' : ch[regionAt(x, z).a] ?? '?';
  }
  console.log(row);
}
