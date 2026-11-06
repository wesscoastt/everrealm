import { plan } from '../src/world/sites';
const pts = [[4946.5, 3697.4], [7664.5, 2538.6], [7084.5, 1627.4], [7144.5, 1627.4], [8495.5, 1150.4]];
const P = plan();
for (const [x, z] of pts) for (const s of P.sites) for (const d of s.props) if (Math.abs(d.x - x) < 0.6 && Math.abs(d.z - z) < 0.6) console.log(x, z, s.id, d.t, JSON.stringify(d).slice(0, 160));
