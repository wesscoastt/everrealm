import type { CompanionRole } from './companions';

// A companion's own progression (the owner's brief, docs/briefs/companions.md 2 and 4). Each companion has their own
// rank, 1 to 20, earned beside you: the foes you put down together, the quests you finish together, the bosses. It is
// theirs, kept when they're sent home, and it does not follow your level: what it buys is their skills, the slots to
// carry them in, and a little more in every blow and in their health every five ranks. Their strength in a fight still
// meets the land you're in (as yours does), so a new companion can walk anywhere with you; a seasoned one is simply
// better at it.
//
// XP: a foe worth fighting gives some (more for elites and bosses), a quest finished with them along gives a good deal,
// a dungeon's boss a great deal. Rank 20 is about a dozen hours of play together: rewarding, not a grind.

export const COMP_MAX_RANK = 20;
/** XP to reach each rank from the one before. */
export const rankStep = (r: number) => Math.round(40 * Math.pow(r, 1.45));
/** Total XP at the start of each rank (index = rank). */
export const RANK_AT: number[] = (() => { const a = [0, 0]; for (let r = 2; r <= COMP_MAX_RANK; r++) a[r] = a[r - 1] + rankStep(r - 1); return a; })();
export function rankOf(xp: number): { rank: number; from: number; next: number | null } {
  let r = 1;
  while (r < COMP_MAX_RANK && xp >= RANK_AT[r + 1]) r++;
  return { rank: r, from: RANK_AT[r], next: r < COMP_MAX_RANK ? RANK_AT[r + 1] : null };
}
/** What each kind of thing done together is worth. */
export const COMP_XP = { foe: 12, elite: 30, boss: 150, quest: 110, dungeon: 250 } as const;

/** Skill slots open at these ranks. */
export const SLOTS_AT = [1, 4, 10];
export const slotsAt = (rank: number) => SLOTS_AT.filter((r) => rank >= r).length;
/** Every five ranks: a share more on each blow, on their health, and on their mending. */
export const passiveAt = (rank: number) => Math.floor(rank / 5) * 0.04;

export type SkillKind = 'strike' | 'stun' | 'flurry' | 'finish' | 'mend' | 'rally' | 'second';
export interface CompSkill {
  id: string; name: string; role: CompanionRole; rank: number;
  kind: SkillKind;
  /** Seconds before it can be used again. */
  cd: number;
  /** Of an ordinary blow (strikes), or of their mending (heals). */
  mult: number;
  /** Seconds a stun lasts (interrupts a wind-up: docs/COMBAT.md). */
  stun?: number;
  desc: string;
}

export const COMP_SKILLS: CompSkill[] = [
  // Tanks: break the wind-up, hold you up, end it
  { id: 'bash', name: 'Shield Bash', role: 'tank', rank: 1, kind: 'stun', cd: 12, mult: 1.1, stun: 1.6, desc: 'A shoulder or a shield into the foe: a stun that breaks a wind-up.' },
  { id: 'hold', name: 'Hold the Line', role: 'tank', rank: 6, kind: 'rally', cd: 28, mult: 0.35, desc: 'When you\'re hard pressed, they step in and buy you a breath: some health back.' },
  { id: 'brace', name: 'Braced Blow', role: 'tank', rank: 12, kind: 'strike', cd: 9, mult: 1.9, desc: 'A heavy, set-footed blow.' },
  { id: 'ruin', name: 'Ruin', role: 'tank', rank: 18, kind: 'finish', cd: 16, mult: 3.0, desc: 'On a foe that\'s nearly done: a blow that finishes it.' },
  // Damage: quick work, a hamstring, a flurry, a finish
  { id: 'quick', name: 'Quick Cut', role: 'damage', rank: 1, kind: 'strike', cd: 7, mult: 1.6, desc: 'A fast, opportune blow.' },
  { id: 'hamstring', name: 'Hamstring', role: 'damage', rank: 6, kind: 'stun', cd: 14, mult: 1.2, stun: 1.1, desc: 'A low cut that drops the foe for a moment: a stun that breaks a wind-up.' },
  { id: 'flurry', name: 'Flurry', role: 'damage', rank: 12, kind: 'flurry', cd: 16, mult: 0.85, desc: 'Three blows in quick succession.' },
  { id: 'mercy', name: 'No Mercy', role: 'damage', rank: 18, kind: 'finish', cd: 11, mult: 3.2, desc: 'On a foe that\'s nearly done: the blow that finishes it.' },
  // Healers: mend, steady, strike when it's quiet, and once a fight, everything they have
  { id: 'mend', name: 'Mend', role: 'healer', rank: 1, kind: 'mend', cd: 7, mult: 0.6, desc: 'When you\'re hurt: a steady mend.' },
  { id: 'steady', name: 'Steady Hands', role: 'healer', rank: 6, kind: 'mend', cd: 18, mult: 1.2, desc: 'When you\'re badly hurt: a deep mend.' },
  { id: 'measured', name: 'Measured Strike', role: 'healer', rank: 12, kind: 'strike', cd: 8, mult: 1.7, desc: 'When you\'re hale enough: they join the fight.' },
  { id: 'second', name: 'Second Wind', role: 'healer', rank: 18, kind: 'second', cd: 120, mult: 2.4, desc: 'Once in a long while, when you\'re close to falling: everything they have.' },
];
export const SKILL_BY_ID: Record<string, CompSkill> = Object.fromEntries(COMP_SKILLS.map((s) => [s.id, s]));
export const skillsFor = (role: CompanionRole) => COMP_SKILLS.filter((s) => s.role === role);
