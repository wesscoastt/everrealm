import { ENEMIES, REGION_SPAWNS } from '../src/data/gameplay';
const seen = new Set<string>();
for (const [r, t] of Object.entries(REGION_SPAWNS)) for (const ty of [...t.enemies, ...t.sea]) { if (seen.has(ty)) continue; seen.add(ty); const e = ENEMIES[ty]; console.log(r.padEnd(11), ty.padEnd(14), e.name.padEnd(22), 'L' + e.level, e.attack, (e.loot.map((l) => l.item).join(',')).slice(0, 60)); }
