import { heightAt, SEA } from '../src/world/terrain';
const boxes: [string, number, number, number, number][] = [['brig2', 3500, 4600, 300, 1400], ['brig3', 4600, 5400, 1500, 2600], ['free', 3300, 5800, 300, 3400]];
for (const [id, x0, x1, z0, z1] of boxes) {
  let sea = 0, n = 0;
  for (let x = x0; x <= x1; x += 20) for (let z = z0; z <= z1; z += 20) { n++; if (heightAt(x, z) < SEA - 3) sea++; }
  console.log(id, 'sea', Math.round((sea / n) * 100) + '%');
}
