// Gear check: every piece that can drop rolled, at every quality and leaning, and every named piece.
//   npm run gear
//
// Rolled: the id resolves, fits the realm server's item ids (a-z, 0-9, _; 40 at most), and spends
// exactly its base's budget plus its quality's points; nothing goes below nothing, and no weapon
// swings slower than 0.7 or faster than 1.4. Named: two points over its slot's budget, dropped by a
// creature that exists, every number up to its cap resolves, and the realm server's table agrees.
// Then a few thousand rolls, to see the odds come out as written.

import { ENEMIES } from '../src/data/gameplay';
import { gearPoints, GEAR_BUDGET, ITEMS } from '../src/data/items';
import { AFFIXES, affixFits, NAMED_ITEMS, QUALITY, rollable, rollGear } from '../src/data/gear';
import { WEIGHTS } from '../src/data/armour';
// @ts-expect-error: the server is plain JavaScript
import { NAMED as SERVER_NAMED } from '../server/uniques.mjs';

const problems: string[] = [];
const ID = /^[a-z0-9_]{2,40}$/;
const bases = Object.values(ITEMS).filter(rollable);
let variants = 0;
for (const b of bases) {
  for (let q = 0; q < 4; q++) for (const a of ['', ...Object.keys(AFFIXES)]) {
    if (a && !affixFits(b, a)) continue;
    const id = a || q !== 1 ? `${b.id}__${a}${q}` : b.id;
    const d = ITEMS[id];
    variants++;
    if (!d) { problems.push(`${id}: doesn't resolve`); continue; }
    if (!ID.test(id)) problems.push(`${id}: not an id the realm server takes`);
    if (id === b.id) continue;
    // (wear comes off a trait it has: a piece with nothing left to lose loses nothing)
    const want = Math.max(b.weapon ? -Infinity : 0, gearPoints(b) + (b.weapon ? QUALITY[q].weapon : QUALITY[q].armour));
    if (Math.abs(gearPoints(d) - want) > 0.05) problems.push(`${id}: spends ${gearPoints(d).toFixed(2)}, should be ${want}`);
    if (d.weapon && (d.weapon.damage < 0 || d.weapon.speed < 0.7 || d.weapon.speed > 1.4)) problems.push(`${id}: damage ${d.weapon.damage}, speed ${d.weapon.speed}`);
    if (d.armor && d.armor.defense < 0) problems.push(`${id}: defence ${d.armor.defense}`);
    if (!d.name || /\s{2}|^\s|\s$/.test(d.name)) problems.push(`${id}: name "${d.name}"`);
  }
}

for (const d of NAMED_ITEMS) {
  const N = d.named!;
  const slot = d.armor?.slot;
  const budget = d.weapon ? GEAR_BUDGET.weapon : slot === 'head' ? GEAR_BUDGET.head : WEIGHTS[d.armor!.weight!].defense;
  if (Math.abs(gearPoints(d) - (budget + 2)) > 0.05) problems.push(`${d.id}: spends ${gearPoints(d).toFixed(2)}, should be ${budget + 2}`);
  for (const t of N.from) if (!ENEMIES[t as keyof typeof ENEMIES]) problems.push(`${d.id}: dropped by ${t}, which isn't a creature`);
  for (let n = 1; n <= N.cap; n++) if (ITEMS[`${d.id}__n${n}`]?.serial !== n || !ID.test(`${d.id}__n${n}`)) problems.push(`${d.id} No. ${n}: doesn't resolve`);
  const s = (SERVER_NAMED as Record<string, [number, string]>)[d.id];
  if (!s) problems.push(`${d.id}: the realm server doesn't know it (server/uniques.mjs)`);
  else if (s[0] !== N.cap || s[1] !== d.name) problems.push(`${d.id}: the realm server has ${s[0]} of "${s[1]}", the game ${N.cap} of "${d.name}"`);
}
for (const id of Object.keys(SERVER_NAMED)) if (!NAMED_ITEMS.some((d) => d.id === id)) problems.push(`server/uniques.mjs has ${id}, which the game doesn't`);

// The odds, by source
const odds: string[] = [];
for (const src of ['mob', 'elite', 'boss'] as const) {
  const n = [0, 0, 0, 0];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 20000; i++) { const id = rollGear(ITEMS.bronze_sword, src, rnd); n[ITEMS[id].quality ?? 1]++; }
  odds.push(`${src}: ${n.map((k, q) => `${QUALITY[q].word} ${Math.round((k / 20000) * 100)}%`).join(', ')}`);
}

console.log(`${bases.length} pieces roll, ${variants} rolls checked; ${NAMED_ITEMS.length} named pieces, ${NAMED_ITEMS.reduce((s, d) => s + d.named!.cap, 0)} in the realm in all.`);
for (const o of odds) console.log('  ' + o);
if (problems.length) { console.log(`${problems.length} problem(s):`); for (const p of problems.slice(0, 60)) console.log('  ' + p); process.exit(1); }
console.log('No problems.');
