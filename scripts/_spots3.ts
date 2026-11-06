// Conch Key's shoreline in eight directions: the last dry block before the sea
import { TOWNS } from '../src/world/morrow';
import { heightAt, SEA } from '../src/world/terrain';
const c = (TOWNS as Record<string, { x: number; z: number }>).conch;
for (let a = 0; a < 8; a++) {
  let last = 0;
  for (let r = 0; r < 200; r++) { const h = heightAt(c.x + Math.cos(a * Math.PI / 4) * r, c.z + Math.sin(a * Math.PI / 4) * r); if (h <= SEA) break; last = r; }
  console.log(a * 45, 'shore at r', last, 'dx,dz', Math.round(Math.cos(a * Math.PI / 4) * (last - 3)), Math.round(Math.sin(a * Math.PI / 4) * (last - 3)));
}
