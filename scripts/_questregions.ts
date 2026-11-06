import { QUESTS } from '../src/data/quests';
import { CONTENT } from '../src/data/content';
const all: Record<string, { region?: string }> = { ...QUESTS };
const src: Record<string, string> = {};
for (const c of CONTENT) for (const [k, v] of Object.entries(c.quests ?? {})) { all[k] = v; src[k] = c.id; }
const n = new Map<string, number>();
for (const q of Object.values(all)) n.set(q.region ?? '-', (n.get(q.region ?? '-') ?? 0) + 1);
console.log([...n].sort((a, b) => a[1] - b[1]).map(([r, c]) => r + ' ' + c).join(', '));
