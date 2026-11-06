import { heightAt, SEA } from '../src/world/terrain';
// Gullmouth's harbour edge: the easternmost land along each row near the berth, west of the breakwater
for (let z = 600; z <= 640; z += 4) {
  let edge = -1;
  for (let x = 1760; x < 1830; x++) { const h = heightAt(x, z); if (h >= SEA + 1) edge = x; else if (edge > 0 && x - edge > 3) break; }
  console.log(z, 'land to x', edge, 'h', heightAt(edge, z));
}
