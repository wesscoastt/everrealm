import { heightAt, SEA } from '../src/world/terrain';
for (const [x, z] of [[-2000, 1000], [-2000, -2000], [-1500, 3500], [-2100, 2000], [-1800, 600], [-2200, 300]]) {
  let land = 0; for (let dx = -400; dx <= 400; dx += 20) for (let dz = -400; dz <= 400; dz += 20) if (heightAt(x + dx, z + dz) > SEA) land++;
  console.log(x, z, 'h', heightAt(x, z), 'SEA', SEA, 'land cells within 400:', land);
}
