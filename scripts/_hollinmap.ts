// A character map of Hollin Ford's east side, for siting the Wake fair: height (mod 10) on open grass,
// R road, B building, F farm, ~ water, K keep-clear.
import { Grid } from '../src/world/grid';
import { generateTerrain } from '../src/world/generate';
const g = new Grid();
const L = generateTerrain(g);
const SX = 320;
const [x0, x1, z0, z1] = process.argv.slice(2).map(Number);
const ex = ['', 'R', 'B', 'F', '~', 'K'];
for (let z = z0; z <= z1; z += 2) {
  let row = String(z).padStart(4) + ' ';
  for (let x = x0; x <= x1; x += 2) {
    const e = L.exclusion[x + z * SX];
    row += e ? ex[e] : String(L.heights[x + z * SX] % 10);
  }
  console.log(row);
}
