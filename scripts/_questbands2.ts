// Scratch: quests by region (with ones that have no region placed by where their giver stands), and each region's levels
import { QUESTS } from '../src/data/quests';
import { CONTENT } from '../src/data/content';
import { NPCS } from '../src/data/npcs';
import { REGION_INFO, regionAt } from '../src/world/terrain';
const all: Record<string, { region?: string; marks?: (g: never, s: never) => Record<string, string> }> = { ...QUESTS };
const npcs = [...NPCS];
for (const c of CONTENT) { Object.assign(all, c.quests ?? {}); npcs.push(...(c.npcs ?? [])); }
const byId = new Map(npcs.map((n) => [n.id, n]));
const fake = new Proxy({}, { get: () => () => undefined });
const per = new Map<string, number>();
let lost = 0;
for (const q of Object.values(all)) {
  let r = q.region;
  if (!r && q.marks) {
    try { const ids = Object.keys(q.marks(fake as never, undefined as never)); const n = ids.map((i) => byId.get(i)).find(Boolean); if (n) { const a = n.schedule[0].at; const s = regionAt(a[0], a[1]); r = s.t < 0.5 ? s.a : s.b; } } catch { /* */ }
  }
  if (!r) { lost++; continue; }
  per.set(r, (per.get(r) ?? 0) + 1);
}
const rows = Object.entries(REGION_INFO).map(([id, i]) => [id, (i as { levels: string }).levels, per.get(id) ?? 0] as const);
rows.sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
for (const [id, lv, n] of rows) console.log(String(lv).padEnd(8), String(n).padStart(3), id);
console.log('still unplaced:', lost);
