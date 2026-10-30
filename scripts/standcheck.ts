// Nobody stands inside something: every person's spots (the townsfolk's schedules, the companions' homes)
// against every waymark shrine and every solid prop the planner placed, and every post box.
// npm run standing. Prints each clash; "No problems." when there are none.
import { plan } from '../src/world/sites';
import { NPCS } from '../src/data/npcs';
import { COMPANIONS } from '../src/data/companions';
import { POSTS, postBoxOf } from '../src/data/travel';

const P = plan();
// Props a body can't share: how far out from the prop's middle they're solid (roughly)
const SOLID: Record<string, number> = {
  monument: 1.1, statue: 1.1, well: 1.1, wellhead: 1.0, pump: 0.6, trough: 1.1, postBox: 0.5, lantern: 0.35, sign: 0.4, notice: 0.6,
  cart: 0.8, barrel: 0.45, crate: 0.5, bench: 0.8, woodpile: 1.1, anvil: 0.5, firepit: 0.8, crane: 1.0, bollard: 0.35, waymark: 1.4,
  planter: 0.75, tent: 1.6, boat: 2.0,
};
const people: { who: string; x: number; z: number; y?: number }[] = [];
for (const n of NPCS) for (const s of n.schedule) people.push({ who: n.name + (n.title ? ` (${n.title})` : ''), x: s.at[0], z: s.at[1], y: s.y });
for (const c of Object.values(COMPANIONS)) people.push({ who: c.name + ' (companion, at home)', x: c.home.at[0], z: c.home.at[1] });

const props: { what: string; x: number; z: number; r: number; y?: number }[] = [];
for (const w of P.waymarks) props.push({ what: `the waymark "${w.name}"`, x: w.x, z: w.z, r: SOLID.waymark });
// (a stall's keeper stands behind its counter on purpose; the gaols lie under their towns, so a townsman above isn't in a cell)
for (const st of P.sites) if (!st.id.startsWith('gaol-')) for (const d of st.props) { const r = SOLID[d.t]; if (r) props.push({ what: `a ${d.t}${d.monument ? ' (' + d.monument + ')' : ''} in ${st.id}`, x: d.x, z: d.z, r, y: d.y }); }
for (const p of POSTS) { const b = postBoxOf(p); props.push({ what: `the post box at ${p.id}`, x: b.x, z: b.z, r: SOLID.postBox }); }

let bad = 0;
const seen = new Set<string>();
for (const h of people) for (const p of props) {
  if (Math.abs(h.x - p.x) > p.r + 0.35 || Math.abs(h.z - p.z) > p.r + 0.35) continue;
  if (Math.hypot(h.x - p.x, h.z - p.z) > p.r + 0.3) continue;
  if (h.y !== undefined && p.y !== undefined && Math.abs(h.y - p.y) > 3) continue; // (a floor above or below)
  const k = h.who + '|' + p.what;
  if (seen.has(k)) continue;
  seen.add(k); bad++;
  console.log(`${h.who} at ${h.x}, ${h.z} stands in ${p.what} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
}
console.log(bad ? `${bad} problem(s).` : `${people.length} spots checked against ${props.length} props. No problems.`);
