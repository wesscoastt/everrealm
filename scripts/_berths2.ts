import { BERTHS } from '../src/data/naval';
import { heightAt, SEA } from '../src/world/terrain';
const clear = (x: number, z: number, r: number) => { for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) if (heightAt(Math.floor(x + dx), Math.floor(z + dz)) >= SEA - 2) return false; return true; };
for (const b of BERTHS.slice(1)) {
  let found = '';
  for (let d = 0; d < 200 && !found; d += 4) for (let a = 0; a < 16 && !found; a++) {
    const t = (a / 16) * Math.PI * 2, x = Math.round(b.x + Math.sin(t) * d), z = Math.round(b.z + Math.cos(t) * d);
    if (clear(x, z, 14)) found = `${x} ${z} (d ${d})`;
  }
  console.log(b.id, 'nearest clear', found);
}
