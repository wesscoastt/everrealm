import { BERTHS } from '../src/data/naval';
import { heightAt, SEA } from '../src/world/terrain';
for (const b of BERTHS) {
  let best = '', bd = 1e9;
  for (let dz = -60; dz <= 60; dz++) for (let dx = -80; dx <= 20; dx++) {
    const x = Math.floor(b.x + dx), z = Math.floor(b.z + dz), h = heightAt(x, z);
    if (h < SEA + 1 || h > SEA + 5) continue;
    const d = Math.hypot(dx, dz);
    if (d < bd) { bd = d; best = `${x + 0.5} ${z + 0.5} h ${h}`; }
  }
  console.log(b.id, best, 'd', bd.toFixed(0));
}
