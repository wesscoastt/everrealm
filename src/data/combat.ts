// Combat's shared numbers (docs/COMBAT.md): what each skill costs and from which pool, how the
// guard works, and the rules control keeps to. Every skill is paid in stamina (the body: blades,
// bows, shields, the weapon skills) or in magicka (spells: fire, frost, wards, heals); never both. A
// Gravecaller's blood skills are paid in health instead (their Lifeblood pays first).
// Costs sit alongside the cooldowns, which stay the main pace: a fight should run on choices, not
// on waiting for a bar to fill.

export type Pool = 'stamina' | 'magicka' | 'health';
/** n: points of stamina or magicka; of health, percent of your health. */
export interface Cost { pool: Pool; n: number }

/** Each skill's price, by its id (the weapon skills, the callings' heals, utilities and elites). */
export const SKILL_COST: Record<string, Cost> = {
  // The weapon skills (key 3)
  riposte: { pool: 'stamina', n: 10 }, flurry: { pool: 'stamina', n: 12 }, sunder: { pool: 'stamina', n: 14 },
  hack: { pool: 'stamina', n: 12 }, whirl: { pool: 'stamina', n: 14 }, bellringer: { pool: 'stamina', n: 14 },
  longthrust: { pool: 'stamina', n: 12 }, hobble: { pool: 'stamina', n: 12 }, sweep: { pool: 'stamina', n: 14 },
  // Key 2's (Cleave itself is free)
  backstab: { pool: 'stamina', n: 10 }, hook: { pool: 'stamina', n: 10 }, overhead: { pool: 'stamina', n: 12 }, groundpound: { pool: 'stamina', n: 12 },
  spearsweep: { pool: 'stamina', n: 10 }, pointblank: { pool: 'stamina', n: 10 }, staffflurry: { pool: 'stamina', n: 10 },
  // Warden: the body and the shield
  bulwark: { pool: 'stamina', n: 18 }, bash: { pool: 'stamina', n: 12 }, oath: { pool: 'stamina', n: 30 },
  holdfast: { pool: 'stamina', n: 14 }, shieldthrow: { pool: 'stamina', n: 12 }, rally: { pool: 'stamina', n: 16 },
  challenge: { pool: 'stamina', n: 12 }, cover: { pool: 'stamina', n: 16 },
  // Reaver: Blood Up is paid in blood
  bloodup: { pool: 'health', n: 6 },
  // The casters' quick signatures (a cooldown under two seconds): at range they stand in for the free
  // swing, so they cost little; at the utility price they ate nearly all the magicka that comes back
  bolt: { pool: 'magicka', n: 6 }, frostbolt: { pool: 'magicka', n: 6 }, lanternlight: { pool: 'magicka', n: 6 }, wither: { pool: 'magicka', n: 6 },
  // Gravecaller: the blood skills
  boneward: { pool: 'health', n: 8 }, graverot: { pool: 'health', n: 6 }, raise: { pool: 'health', n: 12 },
};
/** A skill not listed costs by its calling's nature: blades, bows and shields stamina; fire, frost and the old words magicka. */
export const CALLING_POOL: Record<string, Pool> = { warden: 'stamina', reaver: 'stamina', pathfinder: 'stamina', ashcaller: 'magicka', wizard: 'magicka', mender: 'magicka', gravecaller: 'magicka', prowler: 'stamina' };
/** What an unlisted skill costs, by its slot: the heal, a utility, the elite. */
export const SLOT_COST = { heal: 18, utility: 14, elite: 30 };

/** The pools: how big, and how fast they come back (a second, in a fight and out of one). */
export const POOLS = {
  magicka: { max: 100, regenFight: 9, regenCalm: 20 },
};

/** The guard (hold V): what it takes off a blow from in front, the stamina each blocked blow costs, and the perfect block's window. */
export const GUARD = { cut: 0.5, shieldCut: 0.65, cost: 9, perfect: 0.25, stagger: 1.2, arc: 1.2 };
/** A foe whose wind-up is broken is exposed: it takes this much more, for the seconds it lasts. */
export const EXPOSED = 0.2;
