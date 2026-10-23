import type { EnemyDef } from './gameplay';
import { REGION_INFO, type RegionId } from '../world/terrain';

// Everything scales to you, as in ESO since One Tamriel: no region is "for" any level. A creature
// meets you at your own level, keeping what makes it itself (a Scarth frost wolf is still tougher
// than a Hollindale wolf, a world boss still a world boss). Rewards scale the same way, so the
// whole map is worth playing at any level.
//
// Creatures in data/gameplay.ts are written at a level; these curves say what an ordinary creature
// has at each level, and a creature keeps its own share of that as you level. Regions keep a level
// only internally (REGION_INFO.levels: the level their numbers were written for), never shown.

/** The player's own curves (Game: maxHp without armour, and swingPower with a plain sword). */
export const playerHp = (L: number) => 100 + (L - 1) * 6;
export const playerPower = (L: number) => (15 + L * 1.45) * (1 + (L - 1) * 0.02);

/**
 * Health, damage and experience of an ordinary creature at level L. Tied to the player's curves so
 * a fight takes as many blows at level 50 as at level 5: about six of yours to drop one, about
 * nine of its to drop you.
 */
export const curve = {
  hp: (L: number) => 6.1 * playerPower(L),
  damage: (L: number) => 0.107 * playerHp(L),
  xp: (L: number) => 14 * L,
};

/**
 * Money doesn't keep pace with level as experience does: a creature or a chest written for level w
 * pays (L / w)^0.6 times its marks at level L, so a wolf is worth more to a veteran than to a
 * beginner, but not so much more that prices stop meaning anything (see scripts/economy.ts).
 */
export function marksScale(L: number, written: number): number {
  return Math.pow(Math.max(1, L) / Math.max(1, written), 0.6);
}

/** A creature as written, met at level L. */
export function scaleDef(base: EnemyDef, L: number): EnemyDef {
  const k = (f: (l: number) => number) => f(L) / f(base.level);
  const x = marksScale(L, base.level);
  return {
    ...base,
    level: L,
    hp: Math.max(1, Math.round(base.hp * k(curve.hp))),
    damage: Math.max(1, Math.round(base.damage * k(curve.damage))),
    xp: Math.max(1, Math.round(base.xp * k(curve.xp))),
    marks: [Math.round(base.marks[0] * x), Math.max(Math.round(base.marks[0] * x), Math.round(base.marks[1] * x))],
  };
}

/** The level a region's numbers were written for (its creatures, events and chests). */
export function regionLevel(r: RegionId): number {
  const n = REGION_INFO[r].levels.split(/[–-]/).map(Number).filter(Number.isFinite);
  return n.length ? (n[0] + n[n.length - 1]) / 2 : 10;
}

/** What experience written for level `written` is worth to a player of level L: the same in kills' worth. */
export function rewardScale(L: number, written: number): number {
  const kx = (l: number) => curve.xp(l) + 0.4 * curve.hp(l);
  return kx(Math.max(1, L)) / kx(Math.max(1, written));
}

/** Damage written for level `written`, met at level L (a dungeon's ground circles). */
export function damageScale(L: number, written: number): number {
  return curve.damage(Math.max(1, L)) / curve.damage(Math.max(1, written));
}
