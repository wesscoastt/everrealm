import type { CompanionId } from './companions';

// Companions at work (the owner's brief, docs/briefs/companions.md 6: SWTOR's crew skills, in Everrealm's economy).
// Send a companion who isn't walking with you off to a trade for a while, in real time (it goes on while you're away),
// and they come back with what the trade gives: the same ore, logs, fish, pelts, grain, cooking and bars you'd gather or
// make yourself, never more than an honest stint would turn up, so it adds to the economy without flooding it. Each
// companion is gifted, able or poor at each trade, by who they are, and gets better at a trade each time they do it; a
// good stint sometimes turns up something better. One job at a time each, and they can't walk with you while they're out.

export type Trade = 'mining' | 'woodcutting' | 'fishing' | 'hunting' | 'farming' | 'cooking' | 'smithing' | 'tailoring' | 'enchanting';
export interface Job {
  id: Trade; name: string; verb: string;
  /** Real minutes. */
  mins: number;
  /** What an able hand brings back: [item, how many]. */
  yields: [string, number][];
  /** What a good stint sometimes adds. */
  special: [string, number];
  blurb: string;
}

export const JOBS: Job[] = [
  { id: 'mining', name: 'Mining', verb: 'mining', mins: 60, yields: [['copper_ore', 8], ['tin_ore', 6]], special: ['iron_ore', 4], blurb: 'A day at the diggings for copper and tin.' },
  { id: 'woodcutting', name: 'Woodcutting', verb: 'cutting wood', mins: 60, yields: [['oak_logs', 10], ['birch_logs', 6]], special: ['elder_logs', 2], blurb: 'Felling and splitting, oak and birch.' },
  { id: 'fishing', name: 'Fishing', verb: 'fishing', mins: 45, yields: [['raw_trout', 4], ['raw_minnow', 6]], special: ['raw_pike', 2], blurb: 'A line on the river from first light.' },
  { id: 'hunting', name: 'Hunting', verb: 'hunting', mins: 90, yields: [['wolf_pelt', 3], ['boar_hide', 2]], special: ['frost_pelt', 1], blurb: 'Out after wolves and boar.' },
  { id: 'farming', name: 'Farm work', verb: 'at farm work', mins: 60, yields: [['wheat', 8], ['barley', 6], ['wild_garlic', 4]], special: ['chanterelles', 4], blurb: 'Hired out to a farm: grain, and what the hedges give.' },
  { id: 'cooking', name: 'Cooking', verb: 'cooking', mins: 45, yields: [['cooked_trout', 3]], special: ['mushroom_stew', 2], blurb: 'A shift at an inn\'s range, paid in what they cook.' },
  { id: 'smithing', name: 'Smithing', verb: 'at a forge', mins: 90, yields: [['bronze_bar', 4]], special: ['iron_bar', 2], blurb: 'Working a borrowed forge: bronze, and iron on a good day.' },
  { id: 'tailoring', name: 'Spinning', verb: 'spinning', mins: 90, yields: [['wool', 4]], special: ['wool', 3], blurb: 'At a wheel, spinning wool.' },
  { id: 'enchanting', name: 'Stone-dressing', verb: 'dressing stone', mins: 120, yields: [['blank_1', 2]], special: ['blank_2', 1], blurb: 'Squaring soapstone into blanks for glyphs, and slate when it goes well.' },
];
export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<Trade, Job>;

/** Gifted (2), able (1, the default) or poor (0), by who they are. */
export const APTITUDE: Record<CompanionId, Partial<Record<Trade, 0 | 2>>> = {
  wenna: { hunting: 2, woodcutting: 2, cooking: 0 }, // a Toll Rider: the road, horses, a fire at night; not the inn's range
  ottilie: { mining: 2, enchanting: 2, fishing: 0 }, // a surveyor's eye for stone; no patience with a line
  tam: { fishing: 2, tailoring: 2, hunting: 0 }, // a boatman's son who could splice before he could read
  ned: { cooking: 2, farming: 2, mining: 0 }, // a clerk's boy who'd rather be anywhere but underground
  dave: { fishing: 2, cooking: 2, enchanting: 0 }, // Gullmouth's best hand with a net
  fdave: { fishing: 2, smithing: 0, cooking: 0 }, // a born fisherman; don't let him near a fire
  daejon: { mining: 2, smithing: 2, tailoring: 0 }, // twelve years in the Rock's quarry
};
export const aptitudeOf = (id: CompanionId, t: Trade): 0 | 1 | 2 => APTITUDE[id]?.[t] ?? 1;
export const APTITUDE_WORD = ['Poor at it', 'Able', 'Gifted'] as const;

/** How many times they've done a trade raises what they bring and how often it's something better (to a point). */
export function jobOutcome(apt: 0 | 1 | 2, times: number): { yieldMul: number; specialChance: number; timeMul: number } {
  const skill = Math.min(10, times) * 0.03;
  return {
    yieldMul: [0.65, 1, 1.35][apt] + skill,
    specialChance: [0.08, 0.18, 0.32][apt] + skill,
    timeMul: apt === 2 ? 0.85 : 1,
  };
}
/** What one stint brings back (rnd: 0..1, for the special). */
export function jobHaul(job: Job, apt: 0 | 1 | 2, times: number, rnd: number): [string, number][] {
  const o = jobOutcome(apt, times);
  const out: [string, number][] = job.yields.map(([id, n]) => [id, Math.max(1, Math.round(n * o.yieldMul))]);
  if (rnd < o.specialChance) out.push(job.special);
  return out;
}
