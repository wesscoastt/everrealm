import type { SkillId } from './items';
import type { RegionId } from '../world/terrain';

// Crafting, as a blend of the three it borrows from:
//   RuneScape: every craft is a skill with levels and experience, and a recipe opens at a level.
//   WoW: a recipe's colour says what it's still worth to you. Orange while it's new, then yellow, green
//     and grey as you outgrow it, and the experience falls with it, so the climb keeps moving to new
//     work. Some recipes aren't known until they're learned: sold by trainers, or dropped by the
//     realm's great beasts.
//   ESO: leanings are researched by taking a piece apart, then worked into what you smith; quality is
//     raised with extra metal; the regional armour sets are made at an anvil in their own region once
//     enough leanings are known. And each craft has passives, bought with points its own levels earn.

// ---------------------------------------------------------------- Difficulty
export type CraftColour = 'orange' | 'yellow' | 'green' | 'grey';
/** A recipe's colour for someone at this level, and the share of its experience it still gives. */
export function craftColour(level: number, req: number): { colour: CraftColour; xp: number } {
  const over = level - req;
  if (over < 5) return { colour: 'orange', xp: 1 };
  if (over < 10) return { colour: 'yellow', xp: 0.8 };
  if (over < 16) return { colour: 'green', xp: 0.5 };
  return { colour: 'grey', xp: 0.2 };
}
export const COLOUR_WORD: Record<CraftColour, string> = { orange: 'Full experience', yellow: 'Good experience', green: 'Little experience', grey: 'Next to no experience' };

// ---------------------------------------------------------------- Quality and leanings at the anvil
/** Raising a piece's quality (data/gear.ts QUALITY): levels past the recipe's, extra metal, and a silver bar for Masterwork. */
export const QUALITY_STEPS = [
  { q: 1, word: 'Fine', over: 0, extra: 0, silver: 0, xp: 1 },
  { q: 2, word: 'Superior', over: 8, extra: 0.5, silver: 0, xp: 1.3 },
  { q: 3, word: 'Masterwork', over: 16, extra: 1, silver: 1, xp: 1.6 },
];
/** Leanings (data/gear.ts AFFIXES) research for weapons and for armour separately. */
export const WEAPON_LEANINGS = ['keen', 'quick', 'long', 'thirsty', 'heavy'];
export const ARMOUR_LEANINGS = ['stout', 'hale', 'tireless', 'nimble'];
/** Real minutes a leaning takes to research: longer for each one already known of that kind (ESO's way). */
export const researchMinutes = (known: number) => 10 * (1 + known);

// ---------------------------------------------------------------- Regional sets, crafted
/**
 * The regional armour lines (data/armour.ts) a smith can make, at an anvil in the line's own region,
 * once enough armour leanings are researched. Body pieces only; the helms still have to be found.
 */
export const SET_CRAFT: { line: string; set: string; region: RegionId; level: number; research: number; main: string; per: [number, number, number, number]; bind?: string }[] = [
  { line: 'drover', set: 'tollriders', region: 'crownroad', level: 10, research: 1, main: 'boar_hide', per: [3, 2, 1, 1], bind: 'bronze_bar' },
  { line: 'thornback', set: 'thornback', region: 'brambledeep', level: 14, research: 1, main: 'wolf_pelt', per: [3, 2, 1, 1], bind: 'bronze_bar' },
  { line: 'oilskin', set: 'brine', region: 'saltwind', level: 16, research: 2, main: 'boar_hide', per: [3, 2, 2, 1], bind: 'iron_bar' },
  { line: 'works', set: 'harrow', region: 'redstone', level: 22, research: 3, main: 'iron_bar', per: [4, 3, 2, 2] },
  { line: 'frostpelt', set: 'starglass', region: 'starfall', level: 30, research: 4, main: 'wolf_pelt', per: [4, 3, 2, 2], bind: 'silver_bar' },
];

// ---------------------------------------------------------------- Passives (ESO's crafting skill lines)
export interface CraftPassive { id: string; craft: SkillId; name: string; ranks: number; desc: string[] }
/** A point for every ten levels in a craft, spent on its own passives. */
export const craftPoints = (level: number) => Math.floor(level / 10);
export const PASSIVES: CraftPassive[] = [
  { id: 'sm_study', craft: 'smithing', name: 'Quick Study', ranks: 2, desc: ['Research takes a quarter less time.', 'Research takes half the time.'] },
  { id: 'sm_bench', craft: 'smithing', name: 'Two at the Bench', ranks: 1, desc: ['Research two leanings of a kind at once.'] },
  { id: 'sm_thrift', craft: 'smithing', name: 'Thrifty Hammer', ranks: 2, desc: ['Raising quality takes a third less extra metal.', 'Raising quality takes half the extra metal.'] },
  { id: 'sm_yield', craft: 'smithing', name: 'Good Yield', ranks: 2, desc: ['A tenth of the time the furnace gives two bars for one.', 'A fifth of the time the furnace gives two bars for one.'] },
  { id: 'ck_steady', craft: 'cooking', name: 'Steady Hand', ranks: 2, desc: ['Burn a third less.', 'Burn two thirds less.'] },
  { id: 'ck_chef', craft: 'cooking', name: 'Chef', ranks: 2, desc: ['Meals you eat last a quarter longer.', 'Meals you eat last half as long again.'] },
  { id: 'ck_brewer', craft: 'cooking', name: 'Brewer', ranks: 2, desc: ['Drinks you take last a quarter longer.', 'Drinks you take last half as long again.'] },
  { id: 'ck_plenty', craft: 'cooking', name: 'Plenty', ranks: 2, desc: ['A tenth of the time the pot gives one more.', 'A fifth of the time the pot gives one more.'] },
  { id: 'wc_quick', craft: 'woodcutting', name: 'Quick Hands', ranks: 2, desc: ['Work at the joiner\'s bench a fifth faster.', 'Work at the joiner\'s bench a third faster.'] },
  { id: 'wc_saw', craft: 'woodcutting', name: 'Sharp Saw', ranks: 2, desc: ['A sixth of the time a log is left over.', 'A third of the time a log is left over.'] },
];
export const PASSIVE = Object.fromEntries(PASSIVES.map((p) => [p.id, p])) as Record<string, CraftPassive>;
