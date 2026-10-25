import { MAX_LEVEL, xpForLevel } from './gameplay';

// MASTERY: what experience is for once you're level 100 (ESO's champion points, kept small). Every so
// much experience past the top is a point, up to 300, to put into three sets of passives: the Blade
// (the blows you strike), the Shield (the ones you take) and the Hand (your trades and your purse).
// Each passive is a little per point and stops at its cap, and the caps add up to more than 300, so a
// character's mastery says something about them. Like talents, it's put back only at a temple's altar
// (game/Game.ts; the tab on the talent screen: ui/Hud.ts).

export type MasteryId = 'edge' | 'keen' | 'gunnery' | 'hardiness' | 'bracing' | 'wind' | 'timbers' | 'quick' | 'thrift' | 'scholar';
export interface MasteryDef { id: MasteryId; name: string; per: number; cap: number; desc: (n: number) => string }
export interface MasterySet { id: 'blade' | 'shield' | 'hand'; name: string; blurb: string; icon: string; color: string; passives: MasteryDef[] }

const pct = (n: number, per: number) => `${Math.round(n * per * 1000) / 10}%`;
export const MASTERY: MasterySet[] = [
  {
    id: 'blade', name: 'The Blade', blurb: 'The blows you strike, and the guns you lay.', icon: 'strike', color: '#c8503a', passives: [
      { id: 'edge', name: 'Edge', per: 0.0025, cap: 40, desc: (n) => `Your blows and skills strike ${pct(n, 0.0025)} harder.` },
      { id: 'keen', name: 'Keen Eye', per: 0.001, cap: 30, desc: (n) => `${pct(n, 0.001)} more of your blows land as critical strikes.` },
      { id: 'gunnery', name: 'Gunnery', per: 0.01, cap: 20, desc: (n) => `Your ship's guns strike ${pct(n, 0.01)} harder.` },
    ],
  },
  {
    id: 'shield', name: 'The Shield', blurb: 'The blows you take, and how long you last.', icon: 'shield', color: '#3a6a9a', passives: [
      { id: 'hardiness', name: 'Hardiness', per: 0.0025, cap: 40, desc: (n) => `${pct(n, 0.0025)} more health.` },
      { id: 'bracing', name: 'Bracing', per: 0.001, cap: 50, desc: (n) => `You take ${pct(n, 0.001)} less from every blow.` },
      { id: 'wind', name: 'Second Wind', per: 0.01, cap: 30, desc: (n) => `Your stamina comes back ${pct(n, 0.01)} faster.` },
      { id: 'timbers', name: 'Stout Timbers', per: 0.01, cap: 20, desc: (n) => `Your ship takes ${pct(n, 0.01)} less from shot.` },
    ],
  },
  {
    id: 'hand', name: 'The Hand', blurb: 'Your trades, and your purse.', icon: 'oath', color: '#c8a050', passives: [
      { id: 'quick', name: 'Quick Hands', per: 0.01, cap: 50, desc: (n) => `You craft ${pct(n, 0.01)} faster.` },
      { id: 'thrift', name: 'Thrift', per: 0.005, cap: 40, desc: (n) => `${pct(n, 0.005)} more marks from everything you kill.` },
      { id: 'scholar', name: 'Scholar', per: 0.01, cap: 40, desc: (n) => `Your trades learn ${pct(n, 0.01)} faster.` },
    ],
  },
];
export const MASTERY_BY_ID = new Map(MASTERY.flatMap((s) => s.passives.map((p) => [p.id, p] as const)));

/** The most points a character can earn. */
export const MASTERY_MAX = 300;
/** Experience past level 100 for each point: a third of what the last level took. */
export const MASTERY_PER = Math.round((xpForLevel(MAX_LEVEL, 'melee') - xpForLevel(MAX_LEVEL - 1, 'melee')) / 3);
/** Points earned with this much experience, and experience to the next. */
export function masteryEarned(xp: number): { points: number; next: number | null } {
  const past = xp - xpForLevel(MAX_LEVEL, 'melee');
  if (past < 0) return { points: 0, next: null };
  const points = Math.min(MASTERY_MAX, Math.floor(past / MASTERY_PER));
  return { points, next: points >= MASTERY_MAX ? null : (points + 1) * MASTERY_PER - past };
}
/** Points put into passives, as saved (anything malformed counts for nothing). */
export function readMastery(v: unknown): Partial<Record<MasteryId, number>> {
  if (!v || typeof v !== 'object') return {};
  const out: Partial<Record<MasteryId, number>> = {};
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) { const d = MASTERY_BY_ID.get(k as MasteryId); if (d && Number.isInteger(n) && (n as number) > 0) out[d.id] = Math.min(d.cap, n as number); }
  return out;
}
