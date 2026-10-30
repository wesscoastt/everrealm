// Every Charter Post's post box: nobody stands on it, no prop sits in it, and it isn't on top of its own sign.
// npm run boxes. Prints each clash; "No problems." when there are none.
import { plan } from '../src/world/sites';
import { POSTS, postBoxOf } from '../src/data/travel';
import { NPCS } from '../src/data/npcs';

const P = plan();
let bad = 0;
for (const p of POSTS) {
  const b = postBoxOf(p);
  if (Math.hypot(b.x - p.x, b.z - p.z) < 1.2) { console.log(`${p.id}: the box is on its own sign`); bad++; }
  for (const n of NPCS) for (const s of n.schedule) {
    if ((n.land ?? 'counties') !== (p.land ?? 'counties')) continue;
    if (Math.hypot(s.at[0] - b.x, s.at[1] - b.z) < 1.3) { console.log(`${p.id}: ${n.name} stands on the post box (${s.at[0]}, ${s.at[1]})`); bad++; }
  }
  for (const site of P.sites) {
    if (Math.hypot(site.x - b.x, site.z - b.z) > 400) continue;
    for (const d of site.props) {
      if (d.t === 'postBox' || d.t === 'sign' || d.t === 'roof' || d.t === 'glow' || d.t === 'smoke' || d.t === 'furn') continue;
      if (Math.abs(d.x - b.x) < 1.0 && Math.abs(d.z - b.z) < 1.0) { console.log(`${p.id}: a ${d.t} sits in the post box (${d.x}, ${d.z})`); bad++; }
    }
  }
}
console.log(bad ? `${bad} problem(s).` : `${POSTS.length} post boxes checked. No problems.`);
