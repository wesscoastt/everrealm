// Coarse height map of an area from the terrain alone (no chunks): npx tsx scripts/_isle.ts x0 z0 x1 z1 step
import { heightAt, SEA, regionAt } from '../src/world/terrain';
const [x0, z0, x1, z1, st] = process.argv.slice(2).map(Number);
let hdr = '      '; for (let x = x0; x <= x1; x += st) hdr += x % 100 === 0 ? '|' : ' ';
console.log(hdr);
for (let z = z0; z <= z1; z += st) {
  let row = String(z).padStart(5) + ' ';
  for (let x = x0; x <= x1; x += st) { const h = heightAt(x, z) - SEA; row += h <= 0 ? '~' : h < 10 ? String(Math.floor(h)) : h < 36 ? String.fromCharCode(55 + Math.floor(h)) : '#'; }
  console.log(row);
}
console.log('region at center', JSON.stringify(regionAt((x0 + x1) / 2, (z0 + z1) / 2)));
