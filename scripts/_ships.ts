// Ships moored at a port: where each lies, its kind and size, and how close its hull comes to land.
import { plan } from '../src/world/sites';
import { SHIPS } from '../src/world/ships';
import { heightAt, SEA } from '../src/world/terrain';
const [cx, cz, r] = process.argv.slice(2).map(Number);
const P = plan();
for (const s of P.sites) for (const d of s.props) {
  if ((d.t !== 'ship' && d.t !== 'boat') || Math.hypot(d.x - cx, d.z - cz) > r) continue;
  const k = d.t === 'boat' ? 'boat' : d.ship ?? 'carrack', S = (SHIPS as unknown as Record<string, Record<string, number>>)[k] ?? {};
  console.log(s.id, k, 'at', d.x.toFixed(1), d.z.toFixed(1), 'ry', (d.ry ?? 0).toFixed(2), 'dims', JSON.stringify(Object.fromEntries(Object.entries(S).filter(([, v]) => typeof v === 'number'))));
}
