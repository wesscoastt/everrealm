// Props per big town: how often each kind repeats, to find the copy-paste set pieces
import { plan } from '../src/world/sites';
const P = plan();
const towns: [string, number, number, number][] = [['ansbury', 820, 300, 260], ['gullmouth', 1700, 600, 110], ['harrowgate', 975, 1003, 80]];
const all = new Map<string, number>();
for (const s of P.sites) for (const p of s.props ?? []) all.set(p.t, (all.get(p.t) ?? 0) + 1);
for (const [id, x, z, r] of towns) {
  const c = new Map<string, number>();
  for (const s of P.sites) for (const p of s.props ?? []) if (Math.hypot(p.x - x, p.z - z) < r) c.set(p.t, (c.get(p.t) ?? 0) + 1);
  console.log(id, [...c].sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, v]) => k + ':' + v).join(' '));
}
console.log('ALL', [...all].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
console.log('MONUMENTS', P.monuments.map((m) => `${m.id}@${m.x},${m.z},${m.y}`).join(' '));
for (const s of P.sites) for (const p of s.props ?? []) if (p.t === 'monument') console.log('MON', p.monument, p.x, p.y, p.z, (p.ry ?? 0).toFixed(3));
