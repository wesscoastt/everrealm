import type { RegionId } from '../world/terrain';

// Standing: how well each region knows you, in the manner of ESO's and WoW's reputations. Work
// done in a region raises your standing there: its quests, its parish tasks and events, its rares
// and world bosses, and its group dungeon. Each rank takes a little off the prices in that region's
// shops, and the last gives a title (data/feats.ts). Kept in the flag "rep:<region>".

export interface Rank { name: string; at: number; off: number }

export const RANKS: Rank[] = [
  { name: 'Stranger', at: 0, off: 0 },
  { name: 'Known', at: 150, off: 0 },
  { name: 'Trusted', at: 500, off: 0.05 },
  { name: 'Honoured', at: 1200, off: 0.1 },
  { name: 'Revered', at: 2400, off: 0.15 },
];

/** What each kind of work is worth, in standing. */
export const GAINS = { story: 120, storyline: 90, quest: 60, short: 30, task: 25, event: 15, rare: 20, boss: 40, dungeon: 100 } as const;

/** The title the last rank gives in each region. */
export const REVERED_TITLE: Record<RegionId, string> = {
  greenwake: 'of Hollin Ford', crownroad: 'Friend of the Turnpike', brambledeep: 'of the Fellers', saltwind: 'of the Fleet',
  redstone: 'of the Raddle', starfall: 'of Scarth', gannet: 'of the Cliffs', wrath: 'of the Levels', tolmen: 'of the Moor', inkholm: 'of the Holm', kell: 'Friend of the Kiln', sickle: 'of the Sickle',
  keys: 'Friend of the Brethren', glades: 'of the Glades', amberwold: 'of the Wold', bright: 'of the Bright Coast', sunder: 'of the Sunder', glassflats: 'of the Flats', greywaste: 'of the Greywaste', held: 'of the Held',
};

/** The rank for so many points, and the next one up (if any). */
export function rankFor(points: number): { rank: Rank; i: number; next: Rank | null } {
  let i = 0;
  while (i + 1 < RANKS.length && points >= RANKS[i + 1].at) i++;
  return { rank: RANKS[i], i, next: RANKS[i + 1] ?? null };
}
