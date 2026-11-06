import { yardAt, YARD } from '../src/data/postStations';
import { POST_YARDS } from '../src/data/postYards';
for (const id of ['branchley', 'liftwick', 'tenwells', 'reedwater', 'cala', 'conch']) {
  const y = POST_YARDS.find((p) => p.post === id); if (!y) { console.log(id, 'none'); continue; }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let v = YARD.v0; v <= YARD.v1; v++) for (let u = YARD.u0; u <= YARD.u1; u++) { const [x, z] = yardAt(y, u, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  console.log(id, x0, x1, z0, z1);
}
