import { BERTHS } from '../src/data/naval';
import { heightAt, SEA } from '../src/world/terrain';
for (const b of BERTHS) {
  let worst = -99;
  for (let dz = -12; dz <= 12; dz += 2) for (let dx = -12; dx <= 12; dx += 2) worst = Math.max(worst, heightAt(Math.floor(b.x + dx), Math.floor(b.z + dz)));
  let ahead = -99; for (let k = 0; k < 80; k += 4) ahead = Math.max(ahead, heightAt(Math.floor(b.x + Math.sin(b.heading) * k), Math.floor(b.z + Math.cos(b.heading) * k)));
  console.log(b.id, b.x, b.z, 'max floor around', worst, 'ahead', ahead, 'SEA', SEA);
}
