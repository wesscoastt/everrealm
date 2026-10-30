// Every ship and rowing boat afloat in the world: no part of its hull in a quay, a beach or a jetty.
// npm run ships. Samples the hull's outline at the waterline and a block above, in the generated world.
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { B } from '../src/world/blocks';
import { SHIPS, type ShipKind } from '../src/world/shipHull';
import { SEA } from '../src/world/terrain';

const P = plan();
const chunks = new Map<string, Uint8Array>();
const get = (x: number, y: number, z: number): number => {
  x = Math.floor(x); z = Math.floor(z);
  const k = (x >> 5) + ',' + (z >> 5);
  let c = chunks.get(k);
  if (!c) { c = generateChunk(x >> 5, z >> 5).data as Uint8Array; chunks.set(k, c); }
  return c[(x & 31) + 32 * ((z & 31) + 32 * Math.floor(y))];
};
const soft = new Set<number>([B.Air, B.Water, B.Barrier, B.Planks, B.DarkPlanks, B.Timber]); // (a hull's own deck and the planner's barriers round it)
let bad = 0, n = 0;
for (const s of P.sites) for (const d of s.props) {
  if (d.t !== 'ship' && d.t !== 'boat') continue;
  if (d.sails === 'bare') continue; // on the slip, out of the water on purpose
  if (d.y > SEA + 0.5) continue;    // a deck set on land (a wreck, a beached hull)
  n++;
  const S = d.t === 'boat' ? { len: 4.8, beam: 1.6 } : SHIPS[(d.ship ?? 'carrack') as ShipKind];
  const c = Math.cos(d.ry ?? 0), sn = Math.sin(d.ry ?? 0), hits: string[] = [];
  for (let u = -0.45; u <= 0.45; u += 0.15) for (const v of [-0.4, 0, 0.4]) {
    // along the hull (x when ry is 0) and across it
    const lx = u * S.len, lz = v * S.beam * (1 - Math.abs(u) * 0.9);
    const x = d.x + lx * c + lz * sn, z = d.z - lx * sn + lz * c;
    for (const y of [SEA, SEA + 1]) { const id = get(x, y, z); if (!soft.has(id)) { hits.push(`${Math.floor(x)},${y},${Math.floor(z)}`); break; } }
  }
  if (hits.length) { bad++; console.log(`${s.id}: ${d.t === 'boat' ? 'a rowing boat' : d.ship} at ${d.x.toFixed(1)}, ${d.z.toFixed(1)} is in the stone or the shore at ${hits.slice(0, 4).join(' ')}${hits.length > 4 ? ` and ${hits.length - 4} more` : ''}`); }
}
console.log(bad ? `${bad} of ${n} hulls aground.` : `${n} hulls afloat. No problems.`);
