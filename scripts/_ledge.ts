import { heightAt, SEA } from '../src/world/terrain';
import { ESCAPE, ASHORE, FREED } from '../src/data/skua';
const L = ESCAPE.ledge;
for (let dz = -6; dz <= 6; dz += 2) { let row = ''; for (let dx = -6; dx <= 6; dx += 2) row += String(heightAt(L.x + dx, L.z + dz) - SEA).padStart(4); console.log(L.z + dz, row); }
console.log('ashore', heightAt(ASHORE.x, ASHORE.z) - SEA, heightAt(ASHORE.x - 6, ASHORE.z) - SEA, 'freed', heightAt(FREED.x, FREED.z) - SEA);
// The north cliff foot along x near the ledge: first z (from the north) where ground is above the sea
for (const x of [2100, 2106, 2112, 2118, 2124]) { let z = 400; while (z < 470 && heightAt(x, z) < SEA) z++; console.log('x', x, 'shore z', z, 'h', heightAt(x, z) - SEA, 'h+3', heightAt(x, z + 3) - SEA, 'h+6', heightAt(x, z + 6) - SEA); }
