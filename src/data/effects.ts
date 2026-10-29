import type { EnemyDef } from './gameplay';

// The harms a foe's blows can leave on you (docs/COMBAT.md, stage E): one table, so each works the same
// way wherever it comes from. Stacking: a harm already on you comes again up to its most stacks and its
// time starts over. Cleansing: your calling's heal (key 4) takes off the newest harm, and the Mender's
// Restoration one each second it ticks on you; they all wear off on their own.

export type EffectId = 'bleeding' | 'burning' | 'poisoned' | 'chilled' | 'weakened' | 'vulnerable';

export interface EffectDef {
  id: EffectId;
  name: string;
  /** What it does, for the tooltip. */
  desc: string;
  /** Most stacks. */
  max: number;
  /** A share of your health lost a second, each stack. */
  dot?: number;
  /** Slower by this share. */
  slow?: number;
  /** Your blows lighter by this share. */
  weak?: number;
  /** Blows on you heavier by this share. */
  vuln?: number;
  /** Healing you take, times this. */
  healing?: number;
}

export const EFFECTS: Record<EffectId, EffectDef> = {
  bleeding: { id: 'bleeding', name: 'Bleeding', desc: 'Losing a little health each second.', max: 5, dot: 0.006 },
  burning: { id: 'burning', name: 'Burning', desc: 'Losing health each second while it burns.', max: 3, dot: 0.01 },
  poisoned: { id: 'poisoned', name: 'Poisoned', desc: 'Losing a little health each second, and healed a third less.', max: 5, dot: 0.004, healing: 0.67 },
  chilled: { id: 'chilled', name: 'Chilled', desc: 'Moving a third slower.', max: 1, slow: 0.33 },
  weakened: { id: 'weakened', name: 'Weakened', desc: 'Your blows land 15% lighter.', max: 1, weak: 0.15 },
  vulnerable: { id: 'vulnerable', name: 'Vulnerable', desc: 'Blows on you land 15% heavier.', max: 1, vuln: 0.15 },
};

/** What a foe's blows can leave on you: the harm, how long, and the chance a blow does. */
export interface Infliction { id: EffectId; secs: number; chance: number }

/**
 * By the kind of creature, by what it's called, and by what it holds: spiders and adders poison,
 * claws and teeth and edges bleed, fire burns, ice and the drowned chill, the barrow dead weaken,
 * and the very heavy crack your guard. Plain, and the same everywhere; nothing at all for the rest.
 */
export function inflictionOf(def: EnemyDef): Infliction | null {
  const name = def.name.toLowerCase(), model = def.model ?? def.type;
  if (/spider|weaver|adder|snake|basilisk|spitter|spore|fen jelly/.test(name) || model === 'spider') return { id: 'poisoned', secs: 8, chance: 0.4 };
  if (/cinder|vent|ash|ember|flame|kiln|slag|lamp|resin|clinker|furnace|forge|glassblower/.test(name)) return { id: 'burning', secs: 5, chance: 0.4 };
  if (/rime|ice|frost|snow|shard|glass|keener|drowned|glimmer/.test(name)) return { id: 'chilled', secs: 4, chance: 0.4 };
  if (/wight|risen|barrow|grave|grey|sexton|abbot/.test(name)) return { id: 'weakened', secs: 6, chance: 0.35 };
  if (/troll|bear|cairn|golem|bully|foreman|maw|queen/.test(name) || model === 'bear' || model === 'golem') return { id: 'vulnerable', secs: 5, chance: 0.3 };
  if (model === 'wolf' || /hound|jackal|lynx|fox|boar|crab|lizard/.test(name)) return { id: 'bleeding', secs: 6, chance: 0.3 };
  if (model === 'bandit' && def.held && def.held !== 'none' && def.held !== 'hammer') return { id: 'bleeding', secs: 6, chance: 0.25 };
  return null;
}
