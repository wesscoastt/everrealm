// Dungeon keys and corrupted runs (docs/DELVES.md). Each group dungeon has a fragment its region's
// creatures drop (and its own creatures, more often), and a key made at any anvil from four of them and
// a corrupted shard. A shard comes in every veteran chest. The key opens the dungeon's corrupted run:
// veteran's numbers and more, a twist in every room, the bosses' phases a step early; the rooms' chests
// pay shards, and the first corrupted clear of any dungeon gives the Unlit cloak. Normal and veteran
// runs need no key, so nobody is shut out of the story or the Group Finder.

export const CORRUPT_SHARD = 'corrupt_shard';
export const FRAGS_PER_KEY = 4;

export interface DungeonKey { dungeon: string; frag: string; key: string }
export const DUNGEON_KEYS: DungeonKey[] = [
  { dungeon: 'gd-oldman', frag: 'frag_tallytag', key: 'key_oldman' },
  { dungeon: 'gd-kettle', frag: 'frag_token', key: 'key_kettle' },
  { dungeon: 'gd-escapement', frag: 'frag_tooth', key: 'key_escapement' },
  { dungeon: 'gd-kingsbarrow', frag: 'frag_gravecoin', key: 'key_kingsbarrow' },
];
export const KEY_OF: Record<string, DungeonKey> = Object.fromEntries(DUNGEON_KEYS.map((k) => [k.dungeon, k]));

/** How often a fragment drops: from the region's creatures (ordinary, elite), and from the dungeon's own. */
export const FRAG_CHANCE = { common: 0.03, elite: 0.3, inside: 0.12 };

/**
 * A corrupted run, on top of veteran's numbers: creatures' health and blows, how soon the bosses' big
 * moves come round, how much earlier their phases come; and each room's twist (the waves' timer, how
 * long a plate stays down, a gauntlet's gate, how often a carry's harriers come, a wrong lever's foes).
 */
export const CORRUPTED = {
  hp: 1.12, damage: 1.1, moveEvery: 0.85, phaseEarly: 0.12,
  waveSecs: 18, hold: 0.6, gauntlet: 0.8, harry: 0.7, wrong: 2,
  chestXp: 1.3, chestMarks: 1.4, chestShards: 2, roomShards: 1,
};
