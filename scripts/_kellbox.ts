import { plan } from '../src/world/sites';
import { POSTS, postBoxOf } from '../src/data/travel';
const P = plan(); const p = POSTS.find((x) => x.id === 'kell')!; const b = postBoxOf(p);
console.log('post', p.x, p.z, p.ry, 'box', b);
for (const s of P.sites) for (const d of s.props) if (Math.hypot(d.x - p.x, d.z - p.z) < 5 && !['roof', 'glow', 'smoke', 'furn'].includes(d.t)) console.log(s.id, d.t, d.x.toFixed(1), d.z.toFixed(1), (d.ry ?? 0).toFixed(2), d.len ?? '');
