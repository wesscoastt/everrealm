import { plan } from '../src/world/sites';
const P = plan();
for (const s of P.sites) for (const d of s.props) if (Math.abs(d.x - 7084.5) < 3 && Math.abs(d.z - 1627) < 3) console.log(s.id, JSON.stringify(d).slice(0, 200));
