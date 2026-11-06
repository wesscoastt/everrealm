import { ITEMS } from '../src/data/items';
const out: string[] = []; const seen = new Set<string>();
for (const [id, it] of Object.entries(ITEMS)) { const m = (it as { weapon?: { model?: { family: string; head?: string; glow?: string } } }).weapon?.model; if (!m || (m.family !== 'staff' && m.family !== 'bow')) continue; const k = m.family + ':' + (m.head ?? (m.glow ? 'orb' : 'crook')); if (!seen.has(k)) { seen.add(k); out.push(id); } }
console.log(JSON.stringify(out));
