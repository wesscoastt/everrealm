// Scratch: quests by the level of the land they're in, against the road's time in each band
import { QUESTS } from '../src/data/quests';
import { CONTENT } from '../src/data/content';
import { regionLevel } from '../src/data/scaling';
import { xpForLevel } from '../src/data/gameplay';
import { killXp, KILLS_PER_HOUR } from '../src/data/pacing';
const all: Record<string, { region?: string }> = { ...QUESTS };
for (const c of CONTENT) Object.assign(all, c.quests ?? {});
const bands = [[1, 10], [10, 20], [20, 35], [35, 50], [50, 75], [75, 100]];
const count = new Map<string, number>();
let none = 0;
for (const q of Object.values(all)) {
  if (!q.region) { none++; continue; }
  let L: number; try { L = regionLevel(q.region as never); } catch { none++; continue; }
  const b = bands.find(([a, z]) => L >= a && L < z) ?? bands[bands.length - 1];
  count.set(b.join('-'), (count.get(b.join('-')) ?? 0) + 1);
}
for (const [a, z] of bands) {
  let kills = 0; for (let L = a; L < z; L++) kills += (xpForLevel(L + 1, 'melee') - xpForLevel(L, 'melee')) / killXp(L);
  console.log(`levels ${a}-${z}: ${(kills / KILLS_PER_HOUR).toFixed(1)} h of road, ${count.get(a + '-' + z) ?? 0} quests`);
}
console.log('quests with no region set:', none, 'of', Object.keys(all).length);
