import { curve } from './scaling';

// The pace of the road to level 100. Max level takes weeks of play, as in WoW and ESO, because the
// journey there is the game: the owner's rule. scripts/economy.ts measures it (npm run economy).
//
// The unit is the ordinary kill at your own level, its blows included. Quests, events and dungeon
// chests are worth so many kills; a level takes so many. With about 90 kills' worth an hour of
// steady play (fighting, questing, the walk between), level 10 comes in a couple of hours, the
// first continent's 35 in about twenty, 50 in about forty, and 100 in about 150, a little less
// rested or in a group.

/** XP for each point of damage dealt (Game.dealDamage). */
export const HIT_XP = 0.4;

/** What an ordinary creature at level L is worth: its kill, and the blows it takes to drop. */
export const killXp = (L: number) => curve.xp(L) + HIT_XP * curve.hp(L);

/**
 * Ordinary kills' worth that level L takes to finish: a handful early, a long evening near the top. The
 * first few come quicker still (a third as long at level 1, the full length by level 6), so a new player's
 * first level comes in their first few minutes, as in WoW, and the next few soon after.
 */
export const killsForLevel = (L: number) => (8 + 3.2 * L - 0.01 * L * L) * Math.min(1, 0.35 + 0.13 * (L - 1));

/** A finished quest, in kills' worth at your level, by its depth (a story chapter is more). */
export const QUEST_KILLS = { short: 6, quest: 12, storyline: 18, story: 30 } as const;

/** Kills' worth an hour of steady play brings in, for the pacing report. */
export const KILLS_PER_HOUR = 90;

/** The trades (mining to cooking) level on the old curve, taken at this pace. */
export const SKILL_PACE = 3;
