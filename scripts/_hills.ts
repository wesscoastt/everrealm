import { heightAt, regionAt, SEA } from '../src/world/terrain';
const [cx, cz, R, step] = process.argv.slice(2).map(Number);
const ch = ' .:-=+*#%@';
for (let z = cz - R; z <= cz + R; z += step) {
  let row = '';
  for (let x = cx - R; x <= cx + R; x += step) {
    const h = heightAt(x, z);
    row += h < SEA ? '~' : ch[Math.max(0, Math.min(9, Math.floor((h - SEA) / 8)))];
  }
  console.log(String(z).padStart(6), row);
}
console.log('region at centre', regionAt(cx, cz).a, 'SEA', SEA);
