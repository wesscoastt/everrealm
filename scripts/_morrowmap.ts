import './_landmorrow';
import { heightAt, SEA, regionAt } from '../src/world/terrain';
const ch: Record<string, string> = { keys: 'k', glades: 'g', amberwold: 'a', bright: 'B', sunder: 's', glassflats: 'f', greywaste: 'w', held: 'H' };
for (let z = -2300; z <= 4000; z += 100) {
  let row = String(z).padStart(6) + ' ';
  for (let x = -2300; x <= 4000; x += 80) {
    const h = heightAt(x, z);
    row += h <= SEA - 2 ? (h <= SEA - 10 ? ' ' : '.') : h > SEA + 45 ? '^' : ch[regionAt(x, z).a] ?? '?';
  }
  console.log(row);
}
