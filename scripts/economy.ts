// Pacing and economy check: how long the road to the cap is, and what a mark is worth along it.
//   npm run economy
//
// Max level takes weeks of play, as in WoW and ESO (the owner's rule, data/pacing.ts). This prints
// the hours to each milestone, what the quests carry, how long the trades take, what an hour of
// play earns at each level, and how many hours the things worth saving for cost. It fails when the
// pace or the prices drift out of the ranges below. Rerun it after any big content addition (and
// after Morrow and its islands are in, the owner asked for another full check).

import { ENEMIES, MAX_LEVEL, ORE_INFO, REGION_SPAWNS, TREE_INFO, xpForLevel } from '../src/data/gameplay';
import { ITEMS } from '../src/data/items';
import { KILLS_PER_HOUR, killsForLevel, killXp, QUEST_KILLS } from '../src/data/pacing';
import { QUESTS } from '../src/data/quests';
import { marksScale } from '../src/data/scaling';
import { STABLES } from '../src/data/stables';
import { COTTAGE, LOT_PRICE, SIZES } from '../src/data/housing';
import { LODGINGS } from '../src/data/lodgings';
import { REGION_INFO, type RegionId } from '../src/world/terrain';

const problems: string[] = [];
const want = (ok: boolean, what: string) => { if (!ok) problems.push(what); };
const h = (x: number) => (x < 1 ? `${Math.round(x * 60)} min` : `${x.toFixed(x < 10 ? 1 : 0)} h`);

// ---------------------------------------------------------------- Your level
console.log('YOUR LEVEL (kills\' worth at your level; ' + KILLS_PER_HOUR + ' an hour of steady play)');
let cum = 0;
const hoursTo: Record<number, number> = {};
for (let L = 1; L < MAX_LEVEL; L++) { cum += killsForLevel(L); hoursTo[L + 1] = cum / KILLS_PER_HOUR; }
for (const L of [5, 10, 20, 35, 50, 75, 100]) console.log(`  to ${String(L).padStart(3)}: ${h(hoursTo[L]).padStart(7)}   (level ${L - 1} takes ${killsForLevel(L - 1).toFixed(0)} kills' worth, ${(xpForLevel(L, 'melee') - xpForLevel(L - 1, 'melee')).toLocaleString()} XP)`);
want(hoursTo[10] >= 1.5 && hoursTo[10] <= 4, `level 10 in ${h(hoursTo[10])}: want 1.5 to 4 hours`);
want(hoursTo[35] >= 15 && hoursTo[35] <= 35, `level 35 in ${h(hoursTo[35])}: want 15 to 35 hours`);
want(hoursTo[100] >= 110 && hoursTo[100] <= 220, `level 100 in ${h(hoursTo[100])}: want 110 to 220 hours (weeks of play)`);

// What the quests carry: done as you go, each worth its kills at the level you finish it
const depth: Record<string, number> = {};
let questKills = 0;
for (const q of Object.values(QUESTS)) { const d = q.story ? 'story' : q.depth ?? 'quest'; depth[d] = (depth[d] ?? 0) + 1; questKills += QUEST_KILLS[d as keyof typeof QUEST_KILLS]; }
let toFirst = 0;
for (let L = 1; L < 35; L++) toFirst += killsForLevel(L);
console.log(`  quests: ${Object.values(QUESTS).length} (${Object.entries(depth).map(([d, n]) => `${n} ${d}`).join(', ')}), worth ${questKills} kills: ${Math.round((questKills / toFirst) * 100)}% of the road to 35`);
want(questKills / toFirst >= 0.25, 'quests carry under a quarter of the road to 35');

// ---------------------------------------------------------------- The trades
console.log('\nTHE TRADES (one gather every 8 seconds at the best node your level allows)');
const nodes = [...Object.values(ORE_INFO).map((o) => ({ skill: 'mining' as const, level: o.level, xp: o.xp })), ...Object.values(TREE_INFO).filter((t) => t.xp > 0).map((t) => ({ skill: 'woodcutting' as const, level: t.level, xp: t.xp }))];
for (const skill of ['mining', 'woodcutting'] as const) {
  let t = 0;
  const at: Record<number, number> = {};
  for (let L = 1; L < 100; L++) {
    const best = Math.max(...nodes.filter((n) => n.skill === skill && n.level <= L).map((n) => n.xp));
    t += (xpForLevel(L + 1, skill) - xpForLevel(L, skill)) / (best * 450);
    at[L + 1] = t;
  }
  console.log(`  ${skill.padEnd(12)} to 10: ${h(at[10])}, to 30: ${h(at[30])}, to 50: ${h(at[50])}, to 99: ${h(at[99])}`);
  want(at[30] >= 5 && at[30] <= 25, `${skill} 30 in ${h(at[30])}: want 5 to 25 hours`);
}

// ---------------------------------------------------------------- Money
console.log('\nMONEY (marks an hour: two thirds of the hour\'s worth from creatures and what they drop, sold)');
const regionKill = (r: RegionId) => {
  const types = REGION_SPAWNS[r]?.enemies ?? [];
  const defs = types.map((t) => ENEMIES[t]).filter(Boolean);
  if (!defs.length) return null;
  const lvl = defs.reduce((a, d) => a + d.level, 0) / defs.length;
  const marks = defs.reduce((a, d) => a + (d.marks[0] + d.marks[1]) / 2, 0) / defs.length;
  const loot = defs.reduce((a, d) => a + d.loot.reduce((b, l) => b + l.chance * ((l.min ?? 1) + (l.max ?? l.min ?? 1)) / 2 * (ITEMS[l.item]?.value ?? 0) * 0.5, 0), 0) / defs.length;
  return { lvl, marks, loot };
};
const kills = (REGION_INFO as Record<string, unknown>) && Object.keys(REGION_SPAWNS).map((r) => regionKill(r as RegionId)).filter(Boolean) as { lvl: number; marks: number; loot: number }[];
const perHour = (L: number) => {
  // The creatures of the regions written nearest your level
  const near = [...kills].sort((a, b) => Math.abs(a.lvl - L) - Math.abs(b.lvl - L)).slice(0, 3);
  const each = near.reduce((a, k) => a + k.marks * marksScale(L, k.lvl) + k.loot, 0) / near.length;
  return each * KILLS_PER_HOUR * 0.67;
};
for (const L of [5, 10, 20, 35, 50, 100]) console.log(`  at ${String(L).padStart(3)}: ${Math.round(perHour(L)).toLocaleString().padStart(6)} marks an hour`);

console.log('\nWORTH SAVING FOR (hours of play at the level you\'d likely buy it)');
const goals: { what: string; price: number; at: number; lo: number; hi: number }[] = [];
const horses = STABLES.flatMap((s) => s.stock.map((x) => ({ ...x, town: s.town }))).sort((a, b) => a.price - b.price);
goals.push({ what: `cheapest horse (${ITEMS[horses[0].item]?.name})`, price: horses[0].price, at: 8, lo: 0.3, hi: 2.5 });
const mid = horses[Math.floor(horses.length / 2)];
goals.push({ what: `a middling mount (${ITEMS[mid.item]?.name})`, price: mid.price, at: 20, lo: 1, hi: 8 });
const top = horses[horses.length - 1];
goals.push({ what: `the finest mount (${ITEMS[top.item]?.name}, ${top.town})`, price: top.price, at: 35, lo: 6, hi: 40 });
goals.push({ what: 'a week in lodgings (dearest)', price: Math.max(...LODGINGS.map((l) => l.rent)), at: 8, lo: 0.05, hi: 1 });
goals.push({ what: 'Wendside Cottage', price: COTTAGE.price, at: 15, lo: 1.5, hi: 10 });
goals.push({ what: 'a lot and a long house built on it', price: LOT_PRICE + SIZES.hall.cost.marks, at: 25, lo: 3, hi: 20 });
for (const g of goals) {
  const hrs = g.price / perHour(g.at);
  console.log(`  ${g.what.padEnd(46)} ${String(g.price).padStart(6)} marks: ${h(hrs)} at level ${g.at}`);
  want(hrs >= g.lo && hrs <= g.hi, `${g.what}: ${h(hrs)} of play at level ${g.at}, want ${g.lo} to ${g.hi} hours`);
}

if (problems.length) { console.log(`\n${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); process.exitCode = 1; }
else console.log('\nPace and prices are in range.');
