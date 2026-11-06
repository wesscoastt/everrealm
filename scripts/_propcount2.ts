// The biggest sites' props by kind: which set pieces repeat inside one city
import { plan } from '../src/world/sites';
const P = plan();
const big = P.sites.map((s) => ({ s, n: s.props.length })).sort((a, b) => b.n - a.n).slice(0, 14);
const skip = new Set(['furn', 'roof', 'door', 'shutter', 'windowBox', 'smoke', 'glow', 'wallLantern', 'lantern', 'fence', 'barrel', 'crate']);
for (const { s, n } of big) {
  const c = new Map<string, number>();
  for (const p of s.props) if (!skip.has(p.t)) { const k = p.t + (p.item ? ':' + p.item : '') + (p.kind ? ':' + p.kind : ''); c.set(k, (c.get(k) ?? 0) + 1); }
  console.log(`${s.id} (${s.name}) ${n}:`, [...c].sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, v]) => k + ':' + v).join(' '));
}
