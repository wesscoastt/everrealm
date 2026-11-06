import './_landmorrow';
import { heightAt, SEA, riverDist } from '../src/world/terrain';
for (let z = 900; z <= 1420; z += 20) {
  let row = String(z).padStart(5) + ' ';
  for (let x = 1860; x <= 2420; x += 10) { const h = Math.round(heightAt(x, z) - SEA); row += riverDist(x, z) < 8 ? 'r' : h <= 0 ? '~' : h > 9 ? '+' : String(h); }
  console.log(row);
}
