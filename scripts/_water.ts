// Nearest open water to a point: scans rings outward for a 24 x 8 patch of sea at least 2 deep.
import { heightAt, SEA } from '../src/world/terrain';
const [x0, z0] = process.argv.slice(2).map(Number);
const open = (x: number, z: number) => { for (let dx = -12; dx <= 12; dx += 2) for (let dz = -4; dz <= 4; dz += 2) if (heightAt(x + dx, z + dz) > SEA - 2) return false; return true; };
for (let r = 0; r <= 300; r += 4) {
  for (let a = 0; a < 32; a++) { const x = Math.round(x0 + Math.cos(a * Math.PI / 16) * r), z = Math.round(z0 + Math.sin(a * Math.PI / 16) * r); if (open(x, z)) { console.log('open water at', x, z, 'r', r, 'angle', a * 11.25); process.exit(0); } }
}
console.log('none within 300');
