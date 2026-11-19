// npm run morality: the morality system's checks (the owner's brief, docs/briefs/morality.md 12).
import { addDeed, bandOf, CHOICE_DEEDS, choiceDeedId, derive, GOSSIP_MS, knows, meets, readBook, shapeDeed, TRAIT_START, type MoralBook } from '../src/data/morality';
import { COMPANION_MORALS } from '../src/data/companionMorals';
import { COMPANIONS } from '../src/data/companions';
import { GROUPS } from '../src/data/morality';
import { COMP_MAX_RANK, COMP_SKILLS, passiveAt, RANK_AT, rankOf, skillsFor, slotsAt } from '../src/data/companionRanks';

let fails = 0, passes = 0;
const ok = (cond: boolean, what: string) => { if (cond) passes++; else { fails++; console.log('FAIL: ' + what); } };
const fresh = (): MoralBook => ({ v: 1, deeds: [] });

// 1. Alignment changes both ways, and a hero can fall and an evil character come back
{
  const b = fresh();
  for (let i = 0; i < 5; i++) addDeed(b, { id: 'up' + i, a: 20 });
  ok(derive(b).align === 100 && derive(b).band === 'heroic', 'rises to heroic, held at 100');
  for (let i = 0; i < 10; i++) addDeed(b, { id: 'down' + i, a: -25 });
  ok(derive(b).align === -100 && derive(b).band === 'evil', 'falls to evil, held at -100');
  for (let i = 0; i < 8; i++) addDeed(b, { id: 'redeem' + i, a: 25 });
  ok(derive(b).band === 'heroic', 'evil redeemed to heroic');
}
// 2. The five bands at their exact edges
{
  const edges: [number, string][] = [[-100, 'evil'], [-76, 'evil'], [-75, 'bad'], [-26, 'bad'], [-25, 'neutral'], [0, 'neutral'], [25, 'neutral'], [26, 'good'], [75, 'good'], [76, 'heroic'], [100, 'heroic']];
  for (const [a, band] of edges) ok(bandOf(a) === band, `band at ${a} is ${band} (got ${bandOf(a)})`);
}
// 3. Traits move apart from alignment and from each other
{
  const b = fresh();
  addDeed(b, { id: 'greedyHero', a: 25, tr: { greed: 10 } });
  const m = derive(b);
  ok(m.band === 'neutral' && m.align === 25 && m.traits.greed === TRAIT_START + 10 && m.traits.compassion === TRAIT_START, 'a good deed can be greedy; other traits untouched');
  addDeed(b, { id: 'loyalVillain', a: -25, tr: { loyalty: 10 } });
  ok(derive(b).traits.loyalty === TRAIT_START + 10 && derive(b).align === 0, 'an evil deed can be loyal');
}
// 4. Regard apart from alignment
{
  const b = fresh();
  addDeed(b, { id: 'expose', a: 20, rep: { verandah: -30, ansbury: 10 } });
  const m = derive(b);
  ok(m.align === 20 && m.regard.verandah === -30 && m.regard.ansbury === 10, 'a good deed can anger a kingdom');
  addDeed(b, { id: 'fence', a: -20, rep: { ropewalk: 25 } });
  ok(derive(b).regard.ropewalk === 25, 'a dark deed can win a criminal brotherhood');
  ok(GROUPS.some((g) => g.kind === 'kingdom') && GROUPS.some((g) => g.kind === 'criminal') && GROUPS.some((g) => g.kind === 'faith') && GROUPS.some((g) => g.kind === 'military') && GROUPS.some((g) => g.kind === 'guild') && GROUPS.some((g) => g.kind === 'town'), 'every kind of group exists');
}
// 5. Memories persist: through a save's JSON and back
{
  const b = fresh();
  addDeed(b, { id: 'robbed', npc: { tamsin: -30 }, note: 'Robbed Tamsin\'s stall.' }, 1000);
  const again = readBook(JSON.parse(JSON.stringify({ moral: b })).moral);
  ok(derive(again).feel.tamsin === -30 && again.deeds[0].note === 'Robbed Tamsin\'s stall.', 'a person\'s memory survives saving and loading');
}
// 6. Conditions
{
  const b = fresh();
  addDeed(b, { id: 'save', a: 25, tr: { courage: 10 } });
  addDeed(b, { id: 'save2', a: 25 });
  addDeed(b, { id: 'save3', a: 25 }); addDeed(b, { id: 'save4', a: 5 });
  const m = derive(b);
  ok(meets(m, { band: ['heroic'] }) && !meets(m, { band: ['evil', 'bad'] }), 'band condition');
  ok(meets(m, { trait: { courage: [55, 100] } }) && !meets(m, { trait: { courage: [0, 50] } }), 'trait condition');
  ok(meets(m, { did: ['save'] }) && !meets(m, { didnt: ['save'] }), 'past decision condition');
  ok(meets(m, { regard: { charter: [-10, 10] } }) && !meets(m, { regard: { charter: [20, 100] } }), 'regard condition (unknown reads 0)');
  ok(meets(m, undefined), 'no need is always met');
}
// 7. Quest branches respond: the old choices written as deeds
{
  const seen = new Set<string>();
  for (const c of CHOICE_DEEDS) { const id = choiceDeedId(c.flag, c.value); ok(!seen.has(id), 'choice deed ids unique: ' + id); seen.add(id); }
  const b = fresh();
  const wat = CHOICE_DEEDS.find((c) => c.flag === 'hwWat' && c.value === 'ask')!;
  addDeed(b, { id: choiceDeedId('hwWat', 'ask'), ...wat.deed });
  ok(derive(b).feel.hw_jethro > 0 && derive(b).align > 0, 'a quest choice moves alignment and a person\'s feeling');
}
// 8. Word gets about believably
{
  const t0 = 1_000_000;
  const d = shapeDeed({ id: 'brawl', a: -10, who: ['guard1'], where: 'greenwake', spread: 'witness' }, t0);
  ok(knows({ id: 'guard1', region: 'greenwake' }, d, t0), 'a witness knows at once');
  ok(!knows({ id: 'baker', region: 'greenwake' }, d, t0 + 1000), 'a stranger in the district doesn\'t, yet');
  ok(knows({ id: 'baker', region: 'greenwake' }, d, t0 + GOSSIP_MS * 3), 'the district hears in time');
  ok(!knows({ id: 'fisher', region: 'saltwind' }, d, t0 + GOSSIP_MS * 30), 'another district never hears of a brawl');
  const cried = shapeDeed({ id: 'crowned', a: 10, spread: 'realm' }, t0);
  ok(knows({ id: 'anyone', region: 'tolmen' }, cried, t0), 'what\'s cried abroad is known everywhere');
  const told = shapeDeed({ id: 'snitch', spread: 'faction', group: 'ropewalk', where: 'saltwind' }, t0);
  ok(knows({ id: 'fence', groups: ['ropewalk'], region: 'keys' }, told, t0 + 61 * 60_000) && !knows({ id: 'fence', groups: ['ropewalk'], region: 'keys' }, told, t0 + 1000), 'a group\'s members hear after word goes round');
}
// 9. Old saves: no book reads as neutral, even, unformed
{
  const m = derive(readBook(undefined));
  ok(m.align === 0 && m.band === 'neutral' && Object.values(m.traits).every((v) => v === TRAIT_START) && !Object.keys(m.regard).length, 'an old save reads neutral');
  ok(derive(readBook('garbage')).align === 0 && derive(readBook({ deeds: 'x' })).align === 0, 'a damaged value reads as an empty book');
}
// 10. No doubled deeds
{
  const b = fresh();
  ok(addDeed(b, { id: 'once', a: 10 }) && !addDeed(b, { id: 'once', a: 10 }) && derive(b).align === 10, 'the same deed counts once');
  addDeed(b, { id: 'huge', a: 999, tr: { greed: 999 }, rep: { charter: -999 } });
  const m = derive(b);
  ok(m.align === 35 && m.traits.greed === TRAIT_START + 10 && m.regard.charter === -30, 'a deed\'s weight is capped');
}
// 11. Every companion has morals, and their lines
for (const id of Object.keys(COMPANIONS)) {
  const m = COMPANION_MORALS[id as keyof typeof COMPANION_MORALS];
  ok(!!m && (m.always || (m.approve.length > 0 && m.disapprove.length > 0)) && (!m.leaves || !!m.goodbye), 'companion morals: ' + id);
}

// 12. Companions' own ranks (data/companionRanks.ts): independent of the player, a sensible climb, skills in every role
{
  ok(rankOf(0).rank === 1 && rankOf(RANK_AT[2] - 1).rank === 1 && rankOf(RANK_AT[2]).rank === 2, 'rank edges');
  ok(rankOf(RANK_AT[COMP_MAX_RANK] + 99999).rank === COMP_MAX_RANK && rankOf(RANK_AT[COMP_MAX_RANK]).next === null, 'held at the top rank');
  ok(RANK_AT[COMP_MAX_RANK] > 15000 && RANK_AT[COMP_MAX_RANK] < 35000, 'the climb to the top is hours, not minutes or weeks: ' + RANK_AT[COMP_MAX_RANK]);
  ok(slotsAt(1) === 1 && slotsAt(4) === 2 && slotsAt(20) === 3 && passiveAt(4) === 0 && passiveAt(20) === 0.16, 'slots and passives');
  for (const role of ['tank', 'healer', 'damage'] as const) { const k = skillsFor(role); ok(k.length === 4 && k[0].rank === 1 && k.every((x, i) => i === 0 || x.rank > k[i - 1].rank), 'four skills in rank order: ' + role); }
  ok(new Set(COMP_SKILLS.map((x) => x.id)).size === COMP_SKILLS.length, 'skill ids unique');
}

console.log(`${passes} passed, ${fails} failed`);
if (fails) process.exit(1);
