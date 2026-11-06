import { plan } from '../src/world/sites';
const P = plan();
for (const s of P.sites) for (const d of s.props) if (Math.hypot(d.x - 900.5, d.z - 1554.5) < 9) console.log(s.id, d.t, (d as any).item ?? '', d.x.toFixed(1), d.z.toFixed(1));
