import { MOUNT_DROPS } from './content/mounts';
import { countiesOnly } from '../world/land';
import type { CreatureKind, Palette } from '../entities/creatures';
import type { Appearance, HeldItem } from '../entities/humanoid';
import { ARMOUR_SMITHING } from './armour';
import { WEAPON_SMITHING } from './weapons';
import type { RegionId } from '../world/terrain';
import { SkillId } from './items';
import { killsForLevel, killXp, SKILL_PACE } from './pacing';

// ------------------------------------------------------------- Skills

export const SKILLS: { id: SkillId; name: string; color: string; icon: string }[] = [
  { id: 'melee', name: 'Melee', color: '#d8573a', icon: 'sword' },
  { id: 'mining', name: 'Mining', color: '#c8743a', icon: 'pick' },
  { id: 'smithing', name: 'Smithing', color: '#c08a42', icon: 'bar' },
  { id: 'fishing', name: 'Fishing', color: '#4fa8d8', icon: 'fish' },
  { id: 'cooking', name: 'Cooking', color: '#e0a040', icon: 'cooked' },
  { id: 'woodcutting', name: 'Woodcutting', color: '#6aa13a', icon: 'hatchet' },
];

export const MAX_LEVEL = 100;

/** The first curve (every skill, before 2026-10-23): kept so old saves keep their levels (state.ts fixSave). */
export function xpForLevelV1(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.round(55 * Math.pow(n, 2.15) + 45 * n);
}

/** Your level (melee) is paced in kills' worth (data/pacing.ts); a running total per level. */
const CHAR_XP: number[] = [0, 0];
for (let L = 1; L < MAX_LEVEL; L++) CHAR_XP[L + 1] = CHAR_XP[L] + Math.round(killXp(L) * killsForLevel(L));

/** Total XP needed to reach a level: your level from data/pacing.ts, a trade's from the old curve at SKILL_PACE. */
export function xpForLevel(level: number, skill: SkillId): number {
  if (level <= 1) return 0;
  if (skill === 'melee') return CHAR_XP[Math.min(level, MAX_LEVEL)];
  return Math.round(xpForLevelV1(level) * SKILL_PACE);
}

export function levelForXp(xp: number, skill: SkillId): number {
  let lv = 1;
  while (lv < MAX_LEVEL && xp >= xpForLevel(lv + 1, skill)) lv++;
  return lv;
}

/** Unlocks shown in the skills panel. Only list things this build actually has. */
export const UNLOCKS: Record<SkillId, { level: number; text: string }[]> = {
  melee: [
    { level: 1, text: 'Strike (key 1)' },
    { level: 2, text: 'Cleave (key 2)' },
    { level: 3, text: 'Your calling\'s heal (key 4), and talent points' },
    { level: 4, text: 'Your calling\'s signature skill (key 5)' },
    { level: 6, text: 'Your weapon\'s own skill (key 3)' },
    { level: 8, text: 'A utility skill of your choice (key 6)' },
    { level: 12, text: 'A second utility skill (key 7)' },
    { level: 16, text: 'Your calling\'s elite skill (key 8)' },
  ],
  mining: [
    { level: 1, text: 'Copper and tin ore' },
    { level: 3, text: 'Bronze pickaxe' },
    { level: 10, text: 'Silver ore (Hagworm Wood, behind Spill Falls)' },
    { level: 15, text: 'Iron ore (Raddle Barrens, Fleet)' },
    { level: 30, text: 'Star crystal (Scarth Highlands)' },
  ],
  smithing: [
    { level: 1, text: 'Bronze bar' },
    { level: 2, text: 'Bronze hatchet' },
    { level: 3, text: 'Bronze pickaxe' },
    { level: 4, text: 'Bronze sword' },
    { level: 6, text: 'Bronze cap' },
    { level: 8, text: 'Silver bar' },
    { level: 15, text: 'Iron bar' },
    { level: 17, text: 'Iron hatchet' },
    { level: 18, text: 'Iron pickaxe' },
    { level: 20, text: 'Iron longsword' },
  ],
  fishing: [
    { level: 1, text: 'Minnow (Wend)' },
    { level: 5, text: 'Brown trout (Wend, Spill)' },
    { level: 10, text: 'Pike (Spill)' },
    { level: 8, text: 'Mackerel (Fleet Coast)' },
    { level: 12, text: 'Glass eel (somewhere hidden)' },
    { level: 15, text: 'Sea bass (Fleet Coast)' },
    { level: 25, text: 'Frost char (Scarth tarns)' },
  ],
  cooking: [
    { level: 1, text: 'Fried minnow' },
    { level: 5, text: 'Grilled trout' },
    { level: 8, text: 'Grilled mackerel' },
    { level: 10, text: 'Baked pike' },
    { level: 15, text: 'Salt-crust sea bass' },
    { level: 25, text: 'Smoked char' },
  ],
  woodcutting: [
    { level: 1, text: 'Oak' },
    { level: 3, text: 'Birch' },
    { level: 7, text: 'Pine' },
    { level: 20, text: 'Elder oak (Hagworm Wood)' },
  ],
};

// ------------------------------------------------------------- Gathering
// respawn: seconds until a worked node comes back, minutes as in WoW and ESO, so a seam is worth
// finding and a good spot is worth a round of its own

export const ORE_INFO = {
  copper: { item: 'copper_ore', level: 1, xp: 22, respawn: 180, name: 'Copper deposit' },
  tin: { item: 'tin_ore', level: 1, xp: 22, respawn: 180, name: 'Tin deposit' },
  silver: { item: 'silver_ore', level: 10, xp: 60, respawn: 300, name: 'Silver seam' },
  iron: { item: 'iron_ore', level: 15, xp: 75, respawn: 240, name: 'Iron deposit' },
  crystal: { item: 'star_crystal', level: 30, xp: 150, respawn: 480, name: 'Star crystal' },
} as const;

export const TREE_INFO = {
  oak: { item: 'oak_logs', level: 1, xp: 25, respawn: 150, name: 'Oak' },
  birch: { item: 'birch_logs', level: 3, xp: 32, respawn: 180, name: 'Birch' },
  pine: { item: 'pine_logs', level: 7, xp: 45, respawn: 210, name: 'Pine' },
  moot: { item: 'oak_logs', level: 99, xp: 0, respawn: 0, name: 'The Moot Oak' },
  giant: { item: 'elder_logs', level: 20, xp: 90, respawn: 420, name: 'Elder oak' },
  // Hagworm's ancients: not for felling (level out of reach, like the Moot Oak)
  ancient: { item: 'elder_logs', level: 99, xp: 0, respawn: 0, name: 'Ancient oak' },
  // Inkholm's mushrooms: the broad caps and the ink caps fell for stemwood; the lantern caps are left alone
  capshroom: { item: 'stemwood', level: 6, xp: 42, respawn: 240, name: 'Giant mushroom' },
  inkcap: { item: 'stemwood', level: 9, xp: 52, respawn: 260, name: 'Ink cap' },
  lanterncap: { item: 'stemwood', level: 99, xp: 0, respawn: 0, name: 'Lantern cap' },
} as const;

export const FISH_TABLE: Record<'wend' | 'spill' | 'eelpool' | 'lake' | 'sea' | 'highland', { item: string; level: number; xp: number; weight: number }[]> = {
  lake: [
    { item: 'raw_trout', level: 5, xp: 40, weight: 4 },
    { item: 'raw_pike', level: 10, xp: 70, weight: 4 },
    { item: 'raw_minnow', level: 1, xp: 15, weight: 2 },
  ],
  sea: [
    { item: 'raw_mackerel', level: 8, xp: 55, weight: 6 },
    { item: 'raw_seabass', level: 15, xp: 95, weight: 4 },
  ],
  highland: [
    { item: 'raw_trout', level: 5, xp: 40, weight: 2 },
    { item: 'raw_char', level: 25, xp: 160, weight: 4 },
  ],
  wend: [
    { item: 'raw_minnow', level: 1, xp: 15, weight: 6 },
    { item: 'raw_trout', level: 5, xp: 40, weight: 4 },
  ],
  spill: [
    { item: 'raw_minnow', level: 1, xp: 15, weight: 3 },
    { item: 'raw_trout', level: 5, xp: 40, weight: 5 },
    { item: 'raw_pike', level: 10, xp: 70, weight: 3 },
  ],
  eelpool: [
    { item: 'raw_trout', level: 5, xp: 40, weight: 3 },
    { item: 'glass_eel', level: 12, xp: 120, weight: 2 },
  ],
};

// ------------------------------------------------------------- Crafting

export type Station = 'furnace' | 'anvil' | 'hearth' | 'bench';

export interface Recipe {
  id: string;
  station: Station;
  skill: SkillId;
  level: number;
  xp: number;
  inputs: Record<string, number>;
  output: string;
  count: number;
  time: number;
  /** Chance to fail (burn) at the required level, falling as level rises. */
  failAtReq?: number;
  failItem?: string;
}

export const RECIPES: Recipe[] = [
  { id: 'bronze_bar', station: 'furnace', skill: 'smithing', level: 1, xp: 15, inputs: { copper_ore: 1, tin_ore: 1 }, output: 'bronze_bar', count: 1, time: 1.6 },
  { id: 'silver_bar', station: 'furnace', skill: 'smithing', level: 8, xp: 35, inputs: { silver_ore: 1 }, output: 'silver_bar', count: 1, time: 2.0 },
  { id: 'bronze_hatchet', station: 'anvil', skill: 'smithing', level: 2, xp: 25, inputs: { bronze_bar: 1 }, output: 'bronze_hatchet', count: 1, time: 2.4 },
  { id: 'bronze_pickaxe', station: 'anvil', skill: 'smithing', level: 3, xp: 40, inputs: { bronze_bar: 2 }, output: 'bronze_pickaxe', count: 1, time: 2.8 },
  { id: 'bronze_sword', station: 'anvil', skill: 'smithing', level: 4, xp: 45, inputs: { bronze_bar: 2 }, output: 'bronze_sword', count: 1, time: 3.0 },
  { id: 'bronze_helm', station: 'anvil', skill: 'smithing', level: 6, xp: 60, inputs: { bronze_bar: 3 }, output: 'bronze_helm', count: 1, time: 3.2 },
  // Armour at the anvil: bronze and iron, chest, legs, hands and feet (data/armour.ts)
  ...WEAPON_SMITHING.map((w): Recipe => ({ id: w.id, station: 'anvil', skill: 'smithing', level: w.level, xp: 30 + w.bars * 22, inputs: { [w.bar]: w.bars }, output: w.id, count: 1, time: 2.4 + w.bars * 0.4 })),
  ...ARMOUR_SMITHING.flatMap(([line, bar, n, lvl]) => (['chest', 'legs', 'hands', 'feet'] as const).map((slot, k): Recipe => ({ id: `${line}_${slot}`, station: 'anvil', skill: 'smithing', level: lvl + [2, 1, 0, 0][k], xp: 30 + n[k] * 22, inputs: { [bar]: n[k] }, output: `${line}_${slot}`, count: 1, time: 2.4 + n[k] * 0.4 }))),
  { id: 'iron_bar', station: 'furnace', skill: 'smithing', level: 15, xp: 50, inputs: { iron_ore: 2 }, output: 'iron_bar', count: 1, time: 2.2 },
  { id: 'iron_pickaxe', station: 'anvil', skill: 'smithing', level: 18, xp: 110, inputs: { iron_bar: 2 }, output: 'iron_pickaxe', count: 1, time: 3.2 },
  { id: 'iron_hatchet', station: 'anvil', skill: 'smithing', level: 17, xp: 80, inputs: { iron_bar: 1 }, output: 'iron_hatchet', count: 1, time: 3 },
  { id: 'iron_sword', station: 'anvil', skill: 'smithing', level: 20, xp: 130, inputs: { iron_bar: 3 }, output: 'iron_sword', count: 1, time: 3.4 },
  { id: 'cooked_minnow', station: 'hearth', skill: 'cooking', level: 1, xp: 15, inputs: { raw_minnow: 1 }, output: 'cooked_minnow', count: 1, time: 1.4, failAtReq: 0.35, failItem: 'burnt_fish' },
  { id: 'cooked_trout', station: 'hearth', skill: 'cooking', level: 5, xp: 38, inputs: { raw_trout: 1 }, output: 'cooked_trout', count: 1, time: 1.8, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'cooked_mackerel', station: 'hearth', skill: 'cooking', level: 8, xp: 50, inputs: { raw_mackerel: 1 }, output: 'cooked_mackerel', count: 1, time: 1.8, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'cooked_seabass', station: 'hearth', skill: 'cooking', level: 15, xp: 90, inputs: { raw_seabass: 1 }, output: 'cooked_seabass', count: 1, time: 2.2, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'cooked_char', station: 'hearth', skill: 'cooking', level: 25, xp: 150, inputs: { raw_char: 1 }, output: 'cooked_char', count: 1, time: 2.4, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'bramble_pie', station: 'hearth', skill: 'cooking', level: 6, xp: 45, inputs: { blackberries: 3, bread: 1 }, output: 'bramble_pie', count: 1, time: 2, failAtReq: 0.35, failItem: 'burnt_fish' },
  { id: 'mushroom_stew', station: 'hearth', skill: 'cooking', level: 14, xp: 85, inputs: { chanterelles: 3, wild_garlic: 1 }, output: 'mushroom_stew', count: 1, time: 2.4, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'bass_samphire', station: 'hearth', skill: 'cooking', level: 18, xp: 110, inputs: { raw_seabass: 1, samphire: 2 }, output: 'bass_samphire', count: 1, time: 2.4, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'bilberry_tart', station: 'hearth', skill: 'cooking', level: 24, xp: 140, inputs: { bilberries: 4, bread: 1 }, output: 'bilberry_tart', count: 1, time: 2.6, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'cloudberry_jam', station: 'hearth', skill: 'cooking', level: 28, xp: 180, inputs: { cloudberries: 4 }, output: 'cloudberry_jam', count: 1, time: 2.8, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'cooked_huss', station: 'hearth', skill: 'cooking', level: 6, xp: 42, inputs: { raw_huss: 1 }, output: 'cooked_huss', count: 1, time: 1.8, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'cooked_pike', station: 'hearth', skill: 'cooking', level: 10, xp: 65, inputs: { raw_pike: 1 }, output: 'cooked_pike', count: 1, time: 2.2, failAtReq: 0.45, failItem: 'burnt_fish' },
  // Joinery, at the bench by Wendside Cottage: furniture from the logs you cut
  { id: 'j_stool', station: 'bench', skill: 'woodcutting', level: 1, xp: 12, inputs: { oak_logs: 2 }, output: 'furn_stool', count: 1, time: 2 },
  { id: 'j_chair', station: 'bench', skill: 'woodcutting', level: 3, xp: 22, inputs: { oak_logs: 3 }, output: 'furn_chair', count: 1, time: 2.4 },
  { id: 'j_table', station: 'bench', skill: 'woodcutting', level: 4, xp: 30, inputs: { oak_logs: 4 }, output: 'furn_table', count: 1, time: 2.8 },
  { id: 'j_bench', station: 'bench', skill: 'woodcutting', level: 6, xp: 34, inputs: { birch_logs: 4 }, output: 'furn_bench', count: 1, time: 2.8 },
  { id: 'j_shelves', station: 'bench', skill: 'woodcutting', level: 8, xp: 40, inputs: { birch_logs: 3, oak_logs: 2 }, output: 'furn_shelves', count: 1, time: 3 },
  { id: 'j_chest', station: 'bench', skill: 'woodcutting', level: 10, xp: 55, inputs: { oak_logs: 4, bronze_bar: 1 }, output: 'furn_chest', count: 1, time: 3.2 },
  { id: 'j_barrel', station: 'bench', skill: 'woodcutting', level: 10, xp: 50, inputs: { oak_logs: 3, bronze_bar: 1 }, output: 'furn_barrel', count: 1, time: 3 },
  { id: 'j_bed', station: 'bench', skill: 'woodcutting', level: 12, xp: 70, inputs: { pine_logs: 5 }, output: 'furn_bed', count: 1, time: 3.4 },
  { id: 'j_dresser', station: 'bench', skill: 'woodcutting', level: 15, xp: 90, inputs: { pine_logs: 4, birch_logs: 3 }, output: 'furn_dresser', count: 1, time: 3.6 },
];

export const STATION_NAMES: Record<Station, string> = { furnace: 'Furnace', anvil: 'Anvil', hearth: 'Cook fire', bench: "Joiner's bench" };

// ------------------------------------------------------------- Shop

export const SHOP_STOCK: { item: string; price: number }[] = [
  { item: 'bread', price: 4 },
  { item: 'farm_hatchet', price: 10 },
  { item: 'bronze_hatchet', price: 45 },
  { item: 'worn_pickaxe', price: 12 },
  { item: 'fishing_rod', price: 15 },
  { item: 'furn_stool', price: 10 },
  { item: 'furn_table', price: 40 },
  { item: 'furn_bed', price: 65 },
  { item: 'furn_candles', price: 10 },
  { item: 'furn_rug_red', price: 20 },
  { item: 'furn_barrel', price: 14 },
  { item: 'lockpick', price: 3 },
  ...['w_hollin_sword', 'w_hollin_dagger', 'w_hollin_spear', 'w_hollin_staff', 'w_hollin_axe'].map((item) => ({ item, price: 30 })),
];

// ------------------------------------------------------------- Enemies

export type EnemyType = 'wolf' | 'notch' | 'jelly' | 'rustback' | 'boar' | 'roadwolf' | 'thornwolf' | 'sporejelly' | 'crab' | 'brinejelly' | 'dustwolf' | 'redback' | 'frostwolf' | 'shardjelly' | 'rustqueen' | 'oldglass'
  | 'bramblemaw' | 'tidewright' | 'cinderhorn' | 'rimeglass' | 'shardwarden' | 'keelglass'
  | 'huss' | 'conger' | 'thornray' | 'lionsmane' | 'porbeagle' | 'blueshark' | 'bellmane' | 'sexton'
  | 'clifffox' | 'cragboar' | 'fenjelly' | 'bogboar' | 'moorwolf' | 'graniteback'
  | 'r_brindle' | 'r_barley' | 'r_mosscap' | 'r_barnacle' | 'r_pitdog' | 'r_whiteface' | 'r_eggthief' | 'r_mudgut' | 'r_torhound' | 'r_bigmary'
  | 'footpad' | 'poacher' | 'wrecker' | 'claimjumper' | 'cliffrobber' | 'fenpoacher' | 'tinthief'
  | 'chief_gibbet' | 'chief_breakneck' | 'chief_blackwater' | 'chief_reddog' | 'chief_eyrie' | 'chief_stilts' | 'chief_carrack'
  | 'greyed' | 'greybrother' | 'puffball' | 'greyhog' | 'gillcrab' | 'greyabbot'
  | 'jackalent' | 'strawling' | 'reynard' | 'fairfox' | 'hob' | 'willight' | 'cornwolf' | 'cornwhelp' | 'lanternman' | 'wisp' | 'gander' | 'fairgoose' | 'oldrime' | 'rimejelly'
  | 'dg_rustback' | 'dg_hatchling' | 'dg_seep' | 'dg_nightman' | 'dg_coll' | 'dg_sump' | 'dg_verdigris'
  | 'dg_brack' | 'dg_millstone' | 'dg_glim' | 'dg_lampman' | 'dg_spitter'
  // Kell, and the Escapement under the Kiln
  | 'cinderhound' | 'ashcrawler' | 'brassmite' | 'ventjelly' | 'dg_warder' | 'dg_spring' | 'dg_boiler' | 'dg_tallow' | 'dg_governor' | 'dg_mainspring'
  // The Cockpit's duellists at Saltpenny Key (data/duels.ts)
  | 'duel_rowe' | 'duel_skerry' | 'duel_abel' | 'duel_crowe' | 'duel_coyle'
  // Kingsbarrow, the old king's halls (group dungeon)
  | 'dg_digger' | 'dg_barrowdead' | 'dg_wight' | 'dg_venn' | 'dg_barrowwarden' | 'dg_oldking'
  // Morrow, region by region (world/morrow.ts)
  | 'mangrovecrab' | 'keylizard' | 'reefjelly' | 'keywrecker' | 'gladelizard' | 'glim' | 'marshmoth' | 'lampmoth' | 'amberlynx' | 'leafback' | 'terracejackal' | 'quarrybeetle' | 'blackrunner' | 'slabcrawler' | 'liftmoth' | 'riftwolf' | 'basilisk' | 'glassback' | 'saltreaver' | 'wastehound' | 'risen' | 'fendamp' | 'barrowwight' | 'felltroll';

export interface EnemyDef {
  type: EnemyType;
  /** Body plan and colours; defaults to the type name. */
  model?: CreatureKind;
  palette?: Palette;
  /** A bandit's clothes (face and hair vary by foe) and what it fights with. */
  look?: Partial<Appearance>;
  held?: HeldItem;
  scale?: number;
  name: string;
  level: number;
  hp: number;
  damage: number;
  speed: number;
  aggro: number;
  leash: number;
  /**
   * lunge: a short dash at you; slam: a circle round itself; charge: a long rush down a lane;
   * throw: from a distance, a circle marked where you stand, then something lobbed into it.
   */
  attack: 'lunge' | 'slam' | 'charge' | 'throw';
  /** A thrower's circle (radius), and the colour of what it throws. */
  blast?: number;
  shot?: string;
  windup: number;
  range: number;
  cooldown: number;
  xp: number;
  elite?: boolean;
  loot: { item: string; chance: number; min?: number; max?: number }[];
  marks: [number, number];
  respawn: number;
}

// Each region's creatures carry that region's gear now and then (and its bosses always): the
// same power as what you have, spent another way (see GEAR_BUDGET in items.ts).
export const ENEMIES: Record<EnemyType, EnemyDef> = {
  wolf: { type: 'wolf', name: 'Vale wolf', level: 3, hp: 55, damage: 8, speed: 5.4, aggro: 11, leash: 30, attack: 'lunge', windup: 0.55, range: 2.4, cooldown: 1.6, xp: 32, loot: [{ item: 'wolf_pelt', chance: 0.6 }, { item: 'wolfskin_hood', chance: 0.02 }], marks: [1, 4], respawn: 90 },
  notch: { type: 'notch', name: 'Old Notch', level: 7, hp: 240, damage: 15, speed: 6.0, aggro: 14, leash: 34, attack: 'lunge', windup: 0.75, range: 3.2, cooldown: 2.0, xp: 180, elite: true, loot: [{ item: 'notch_fang', chance: 1 }, { item: 'wolf_pelt', chance: 1, min: 2, max: 2 }], marks: [18, 26], respawn: 240 },
  jelly: { type: 'jelly', name: 'Mire jelly', level: 1, hp: 30, damage: 7, speed: 2.6, aggro: 7, leash: 22, attack: 'slam', windup: 0.85, range: 2.3, cooldown: 2.2, xp: 18, loot: [{ item: 'jelly_residue', chance: 0.55 }], marks: [0, 2], respawn: 75 },
  rustback: { type: 'rustback', name: 'Rustback', level: 4, hp: 75, damage: 10, speed: 3.2, aggro: 8, leash: 24, attack: 'charge', windup: 0.8, range: 7.0, cooldown: 2.6, xp: 44, loot: [{ item: 'rustback_shell', chance: 0.7 }, { item: 'copper_ore', chance: 0.25 }], marks: [1, 3], respawn: 120 },
  // Turnpike
  boar: { type: 'boar', model: 'boar', name: 'Hedge boar', level: 7, hp: 120, damage: 13, speed: 4.2, aggro: 9, leash: 26, attack: 'charge', windup: 0.7, range: 6.5, cooldown: 2.4, xp: 70, loot: [{ item: 'boar_hide', chance: 0.6 }], marks: [2, 5], respawn: 110 },
  roadwolf: { type: 'roadwolf', model: 'wolf', palette: { a: '#6e6a62', b: '#3e3a34', c: '#b8b0a0' }, name: 'Turnpike wolf', level: 9, hp: 150, damage: 15, speed: 5.6, aggro: 12, leash: 30, attack: 'lunge', windup: 0.5, range: 2.5, cooldown: 1.5, xp: 85, loot: [{ item: 'wolf_pelt', chance: 0.6 }, { item: 'wolfskin_hood', chance: 0.04 }, { item: 'toll_sabre', chance: 0.03 }], marks: [3, 6], respawn: 100 },
  // Hagworm Wood
  thornwolf: { type: 'thornwolf', model: 'wolf', palette: { a: '#3e4a2a', b: '#24301a', c: '#7a8a5a' }, scale: 1.15, name: 'Thornback stalker', level: 13, hp: 210, damage: 19, speed: 6, aggro: 13, leash: 32, attack: 'lunge', windup: 0.5, range: 2.8, cooldown: 1.5, xp: 130, loot: [{ item: 'wolf_pelt', chance: 0.7 }, { item: 'thorn_blade', chance: 0.04 }, { item: 'moss_hood', chance: 0.03 }], marks: [4, 9], respawn: 110 },
  sporejelly: { type: 'sporejelly', model: 'jelly', palette: { a: '#a86ad8', b: '#5a2a8a', glow: true }, scale: 1.15, name: 'Spore jelly', level: 11, hp: 160, damage: 17, speed: 2.8, aggro: 8, leash: 24, attack: 'slam', windup: 0.8, range: 2.8, cooldown: 2.2, xp: 110, loot: [{ item: 'jelly_residue', chance: 0.8 }, { item: 'thorn_blade', chance: 0.03 }, { item: 'moss_hood', chance: 0.04 }], marks: [3, 7], respawn: 100 },
  // Fleet
  crab: { type: 'crab', model: 'rustback', palette: { a: '#a83a24', b: '#e0703a' }, scale: 1.1, name: 'Tide crab', level: 14, hp: 240, damage: 20, speed: 3.6, aggro: 8, leash: 24, attack: 'charge', windup: 0.75, range: 7, cooldown: 2.4, xp: 150, loot: [{ item: 'crab_shell', chance: 0.7 }, { item: 'oilskin_hat', chance: 0.04 }], marks: [4, 8], respawn: 110 },
  brinejelly: { type: 'brinejelly', model: 'jelly', palette: { a: '#4ab0d8', b: '#1a5a7a' }, scale: 1.1, name: 'Brine jelly', level: 13, hp: 190, damage: 18, speed: 2.8, aggro: 8, leash: 24, attack: 'slam', windup: 0.8, range: 2.8, cooldown: 2.2, xp: 125, loot: [{ item: 'jelly_residue', chance: 0.8 }, { item: 'brine_cutlass', chance: 0.04 }], marks: [3, 7], respawn: 100 },
  // Raddle
  dustwolf: { type: 'dustwolf', model: 'wolf', palette: { a: '#b8743a', b: '#7a4a22', c: '#e0b07a' }, scale: 1.1, name: 'Dust wolf', level: 18, hp: 300, damage: 24, speed: 6.2, aggro: 14, leash: 34, attack: 'lunge', windup: 0.45, range: 2.8, cooldown: 1.4, xp: 200, loot: [{ item: 'wolf_pelt', chance: 0.7 }, { item: 'harrow_cleaver', chance: 0.02 }], marks: [6, 12], respawn: 120 },
  redback: { type: 'redback', model: 'rustback', palette: { a: '#5a1e14', b: '#c8442a' }, scale: 1.35, name: 'Redback', level: 21, hp: 380, damage: 28, speed: 3.6, aggro: 9, leash: 26, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.2, xp: 250, loot: [{ item: 'rustback_shell', chance: 0.8 }, { item: 'iron_ore', chance: 0.4 }, { item: 'redback_helm', chance: 0.04 }], marks: [6, 12], respawn: 140 },
  // Scarth
  frostwolf: { type: 'frostwolf', model: 'wolf', palette: { a: '#dde6ee', b: '#9aaab8', c: '#ffffff' }, scale: 1.3, name: 'Frost wolf', level: 27, hp: 520, damage: 36, speed: 6.6, aggro: 15, leash: 36, attack: 'lunge', windup: 0.45, range: 3.2, cooldown: 1.3, xp: 380, loot: [{ item: 'frost_pelt', chance: 0.6 }, { item: 'frost_cowl', chance: 0.04 }], marks: [10, 18], respawn: 140 },
  // Story bosses. The Rust Queen nests on the old builders' iron under Gallows Knap; Old Glass grew in the crystal under the Kirk.
  rustqueen: { type: 'rustqueen', model: 'rustback', palette: { a: '#3a1410', b: '#d0582a' }, scale: 2.3, name: 'The Rust Queen', level: 24, hp: 1500, damage: 32, speed: 3.4, aggro: 12, leash: 40, attack: 'charge', windup: 0.9, range: 9, cooldown: 2.4, xp: 900, elite: true, loot: [{ item: 'rustback_shell', chance: 1, min: 3, max: 3 }, { item: 'iron_ore', chance: 1, min: 4, max: 4 }, { item: 'harrow_cleaver', chance: 1 }], marks: [40, 60], respawn: 600 },
  oldglass: { type: 'oldglass', model: 'jelly', palette: { a: '#a8f0ff', b: '#3a9ac8', glow: true }, scale: 2.6, name: 'Old Glass', level: 30, hp: 2200, damage: 42, speed: 2.6, aggro: 14, leash: 40, attack: 'slam', windup: 0.95, range: 4.5, cooldown: 2.2, xp: 1400, elite: true, loot: [{ item: 'star_crystal', chance: 1, min: 3, max: 3 }, { item: 'starglass_edge', chance: 1 }], marks: [60, 90], respawn: 600 },
  // Act II: the crystal under the forty-one's ring, woken by Harrowgate's cut.
  keelglass: { type: 'keelglass', model: 'jelly', palette: { a: '#d0c4ff', b: '#5a3ab0', glow: true }, scale: 2.8, name: 'The Keel', level: 31, hp: 2600, damage: 44, speed: 2.4, aggro: 12, leash: 18, attack: 'slam', windup: 1.0, range: 4.6, cooldown: 2.3, xp: 1600, elite: true, loot: [{ item: 'star_crystal', chance: 1, min: 3, max: 3 }, { item: 'starglass_edge', chance: 0.5 }], marks: [60, 90], respawn: 600 },
  // World bosses (see data/activities.ts): they rise on a schedule every player shares, and their
  // loot is their region's gear. The Shardwarden leads the Shardfalls in Scarth.
  bramblemaw: { type: 'bramblemaw', model: 'wolf', palette: { a: '#2e3a1e', b: '#16200e', c: '#9ab07a' }, scale: 3.4, name: 'The Bramblemaw', level: 16, hp: 5200, damage: 34, speed: 6.2, aggro: 24, leash: 60, attack: 'lunge', windup: 0.8, range: 5.5, cooldown: 2.0, xp: 1600, elite: true, loot: [{ item: 'thorn_blade', chance: 0.35 }, { item: 'moss_hood', chance: 0.35 }, { item: 'elder_logs', chance: 1, min: 3, max: 3 }], marks: [45, 70], respawn: 99999 },
  tidewright: { type: 'tidewright', model: 'rustback', palette: { a: '#7a2414', b: '#f08a4a' }, scale: 3.6, name: 'Blind Jenny', level: 20, hp: 6400, damage: 38, speed: 3.8, aggro: 22, leash: 60, attack: 'charge', windup: 0.9, range: 12, cooldown: 2.6, xp: 2100, elite: true, loot: [{ item: 'brine_cutlass', chance: 0.35 }, { item: 'oilskin_hat', chance: 0.35 }, { item: 'crab_shell', chance: 1, min: 4, max: 4 }], marks: [55, 85], respawn: 99999 },
  cinderhorn: { type: 'cinderhorn', model: 'boar', palette: { a: '#5a1e10', b: '#d0582a', c: '#f0c070' }, scale: 3.6, name: 'Old Clinker', level: 23, hp: 7200, damage: 42, speed: 4.6, aggro: 22, leash: 60, attack: 'charge', windup: 0.8, range: 12, cooldown: 2.4, xp: 2600, elite: true, loot: [{ item: 'harrow_cleaver', chance: 0.35 }, { item: 'redback_helm', chance: 0.35 }, { item: 'halter_ember', chance: 0.2 }, { item: 'iron_ore', chance: 1, min: 5, max: 5 }], marks: [60, 95], respawn: 99999 },
  rimeglass: { type: 'rimeglass', model: 'jelly', palette: { a: '#d8f6ff', b: '#4ab0d8', glow: true }, scale: 3.6, name: 'Rimeglass', level: 32, hp: 9800, damage: 48, speed: 2.8, aggro: 22, leash: 60, attack: 'slam', windup: 1.0, range: 6.5, cooldown: 2.3, xp: 3800, elite: true, loot: [{ item: 'starglass_edge', chance: 0.35 }, { item: 'frost_cowl', chance: 0.35 }, { item: 'star_crystal', chance: 1, min: 4, max: 4 }], marks: [80, 120], respawn: 99999 },
  shardwarden: { type: 'shardwarden', model: 'jelly', palette: { a: '#b8f4ff', b: '#2a8ab0', glow: true }, scale: 2.1, name: 'Shardwarden', level: 28, hp: 1900, damage: 38, speed: 3.2, aggro: 14, leash: 40, attack: 'slam', windup: 0.8, range: 4.2, cooldown: 2.0, xp: 900, elite: true, loot: [{ item: 'star_crystal', chance: 1, min: 2, max: 2 }, { item: 'starglass_edge', chance: 0.06 }], marks: [20, 34], respawn: 99999 },
  // The sea: these swim, and go only after swimmers (a boat, a jetty or the shore is safe)
  huss: { type: 'huss', model: 'shark', palette: { a: '#8a7a5e', b: '#e0d8c4', c: '#6e604a' }, scale: 0.7, name: 'Huss', level: 6, hp: 95, damage: 11, speed: 5, aggro: 10, leash: 28, attack: 'lunge', windup: 0.55, range: 2.4, cooldown: 1.6, xp: 60, loot: [{ item: 'raw_huss', chance: 0.7 }], marks: [1, 4], respawn: 100 },
  conger: { type: 'conger', model: 'eel', name: 'Conger', level: 12, hp: 200, damage: 18, speed: 5.6, aggro: 9, leash: 24, attack: 'lunge', windup: 0.45, range: 3.0, cooldown: 1.8, xp: 120, loot: [{ item: 'conger_skin', chance: 0.6 }, { item: 'brine_cutlass', chance: 0.02 }], marks: [3, 7], respawn: 110 },
  thornray: { type: 'thornray', model: 'ray', scale: 1.15, name: 'Thornback ray', level: 15, hp: 260, damage: 21, speed: 4, aggro: 8, leash: 26, attack: 'slam', windup: 0.8, range: 3.0, cooldown: 2.2, xp: 160, loot: [{ item: 'ray_barb', chance: 0.6 }, { item: 'oilskin_hat', chance: 0.03 }], marks: [4, 8], respawn: 110 },
  lionsmane: { type: 'lionsmane', model: 'medusa', name: 'Lion\'s mane', level: 17, hp: 280, damage: 23, speed: 1.8, aggro: 7, leash: 18, attack: 'slam', windup: 0.95, range: 3.6, cooldown: 2.4, xp: 190, loot: [{ item: 'jelly_residue', chance: 0.8 }, { item: 'brine_cutlass', chance: 0.03 }], marks: [5, 9], respawn: 110 },
  porbeagle: { type: 'porbeagle', model: 'shark', palette: { a: '#3e4a58', b: '#e8ecee', c: '#2e3844' }, scale: 1.1, name: 'Porbeagle', level: 20, hp: 360, damage: 27, speed: 6.4, aggro: 14, leash: 36, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.4, xp: 240, loot: [{ item: 'shark_tooth', chance: 0.6 }, { item: 'raw_seabass', chance: 0.3 }], marks: [6, 11], respawn: 130 },
  blueshark: { type: 'blueshark', model: 'shark', palette: { a: '#2a4a8a', b: '#e8eef6', c: '#1e3a72' }, scale: 1.3, name: 'Blue shark', level: 27, hp: 540, damage: 36, speed: 6.8, aggro: 15, leash: 38, attack: 'charge', windup: 0.6, range: 9, cooldown: 2.2, xp: 390, loot: [{ item: 'shark_tooth', chance: 0.7, min: 1, max: 2 }, { item: 'frost_cowl', chance: 0.02 }], marks: [10, 18], respawn: 140 },
  // The outer lands: Gannet Cliffs (8-14), the Wrath Levels (14-20), Tolmen Moor (28-35)
  clifffox: { type: 'clifffox', model: 'wolf', palette: { a: '#c86a2a', b: '#7a3a18', c: '#f0e0c8' }, scale: 0.8, name: 'Cliff fox', level: 10, hp: 130, damage: 14, speed: 6, aggro: 10, leash: 28, attack: 'lunge', windup: 0.5, range: 2.2, cooldown: 1.4, xp: 80, loot: [{ item: 'wolf_pelt', chance: 0.4 }, { item: 'gannet_egg', chance: 0.2 }], marks: [2, 5], respawn: 100 },
  cragboar: { type: 'cragboar', model: 'boar', palette: { a: '#6a6460', b: '#3a3632', c: '#c8b0a0' }, scale: 1.05, name: 'Crag boar', level: 12, hp: 180, damage: 17, speed: 4.4, aggro: 9, leash: 26, attack: 'charge', windup: 0.7, range: 6.5, cooldown: 2.4, xp: 110, loot: [{ item: 'boar_hide', chance: 0.6 }, { item: 'wolfskin_hood', chance: 0.02 }], marks: [3, 6], respawn: 110 },
  fenjelly: { type: 'fenjelly', model: 'jelly', palette: { a: '#7a8a3a', b: '#3a4a1a' }, scale: 1.1, name: 'Fen jelly', level: 15, hp: 230, damage: 20, speed: 2.8, aggro: 8, leash: 24, attack: 'slam', windup: 0.8, range: 2.8, cooldown: 2.2, xp: 150, loot: [{ item: 'jelly_residue', chance: 0.8 }, { item: 'brine_cutlass', chance: 0.02 }], marks: [4, 8], respawn: 100 },
  bogboar: { type: 'bogboar', model: 'boar', palette: { a: '#3a3024', b: '#1e1812', c: '#8a7a5a' }, scale: 1.15, name: 'Bog boar', level: 18, hp: 300, damage: 24, speed: 4.4, aggro: 9, leash: 28, attack: 'charge', windup: 0.7, range: 7, cooldown: 2.3, xp: 200, loot: [{ item: 'boar_hide', chance: 0.7 }, { item: 'oilskin_hat', chance: 0.02 }], marks: [5, 10], respawn: 120 },
  moorwolf: { type: 'moorwolf', model: 'wolf', palette: { a: '#7a7064', b: '#4a443c', c: '#c8beb0' }, scale: 1.25, name: 'Moor wolf', level: 30, hp: 600, damage: 40, speed: 6.6, aggro: 15, leash: 36, attack: 'lunge', windup: 0.45, range: 3, cooldown: 1.3, xp: 430, loot: [{ item: 'frost_pelt', chance: 0.4 }, { item: 'frost_cowl', chance: 0.02 }], marks: [12, 20], respawn: 140 },
  graniteback: { type: 'graniteback', model: 'rustback', palette: { a: '#5a5a5e', b: '#8a8a90' }, scale: 1.5, name: 'Graniteback', level: 32, hp: 720, damage: 44, speed: 3.6, aggro: 9, leash: 26, attack: 'charge', windup: 0.75, range: 8.5, cooldown: 2.2, xp: 500, loot: [{ item: 'iron_ore', chance: 0.5, min: 1, max: 2 }, { item: 'star_crystal', chance: 0.1 }, { item: 'starglass_edge', chance: 0.02 }], marks: [14, 24], respawn: 150 },
  // Bandits in their camps (sites.ts buildSmallCamp): people, built from the humanoid body
  footpad: { type: 'footpad', model: 'bandit', look: { tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#3a3430', hat: 'kerchief', hatColor: '#7a2a22' }, held: 'sword', name: 'Turnpike footpad', level: 9, hp: 160, damage: 15, speed: 5.4, aggro: 12, leash: 30, attack: 'lunge', windup: 0.55, range: 2.6, cooldown: 1.6, xp: 95, loot: [{ item: 'bread', chance: 0.4 }, { item: 'toll_sabre', chance: 0.03 }], marks: [4, 9], respawn: 150 },
  poacher: { type: 'poacher', model: 'bandit', look: { tunic: '#3e4a2a', trim: '#6a5a3a', trousers: '#3a3a2a', hat: 'hood', hatColor: '#2e3a1e' }, held: 'hatchet', name: 'Hagworm poacher', level: 14, hp: 240, damage: 20, speed: 5.6, aggro: 13, leash: 30, attack: 'lunge', windup: 0.5, range: 2.6, cooldown: 1.5, xp: 160, loot: [{ item: 'wolf_pelt', chance: 0.4 }, { item: 'thorn_blade', chance: 0.03 }, { item: 'moss_hood', chance: 0.03 }], marks: [6, 12], respawn: 150 },
  wrecker: { type: 'wrecker', model: 'bandit', look: { tunic: '#2e3a4a', trim: '#a8a090', trousers: '#2a2a30', hat: 'wide', hatColor: '#2a2a2a' }, held: 'bronzeSword', name: 'Fleet wrecker', level: 16, hp: 270, damage: 22, speed: 5.4, aggro: 13, leash: 30, attack: 'lunge', windup: 0.5, range: 2.7, cooldown: 1.5, xp: 185, loot: [{ item: 'raw_mackerel', chance: 0.5 }, { item: 'brine_cutlass', chance: 0.03 }, { item: 'oilskin_hat', chance: 0.03 }], marks: [7, 13], respawn: 150 },
  claimjumper: { type: 'claimjumper', model: 'bandit', look: { tunic: '#7a4a2a', trim: '#c87a3a', trousers: '#4a3a2a', hat: 'cap', hatColor: '#5a3a1a' }, held: 'pickaxe', name: 'Claim-jumper', level: 21, hp: 360, damage: 28, speed: 5.4, aggro: 13, leash: 30, attack: 'lunge', windup: 0.5, range: 2.6, cooldown: 1.5, xp: 250, loot: [{ item: 'iron_ore', chance: 0.5 }, { item: 'harrow_cleaver', chance: 0.03 }, { item: 'redback_helm', chance: 0.03 }], marks: [8, 15], respawn: 150 },
  cliffrobber: { type: 'cliffrobber', model: 'bandit', look: { tunic: '#5a5a5a', trim: '#9a8a6a', trousers: '#3a3434', hat: 'kerchief', hatColor: '#3a3a3a' }, held: 'sword', name: 'Cliff robber', level: 12, hp: 200, damage: 18, speed: 5.6, aggro: 12, leash: 30, attack: 'lunge', windup: 0.5, range: 2.6, cooldown: 1.5, xp: 130, loot: [{ item: 'gannet_egg', chance: 0.5 }, { item: 'wolfskin_hood', chance: 0.03 }], marks: [5, 11], respawn: 150 },
  fenpoacher: { type: 'fenpoacher', model: 'bandit', look: { tunic: '#4a5a3a', trim: '#8a7a4a', trousers: '#3a3a2a', hat: 'straw' }, held: 'hatchet', name: 'Levels poacher', level: 17, hp: 290, damage: 24, speed: 5.4, aggro: 13, leash: 30, attack: 'lunge', windup: 0.5, range: 2.6, cooldown: 1.5, xp: 200, loot: [{ item: 'smoked_eel', chance: 0.4 }, { item: 'oilskin_hat', chance: 0.03 }], marks: [7, 13], respawn: 150 },
  // The Old Man's Workings (group dungeon, data/dungeons.ts): they don't come back while a run is on.
  // Its three bosses are tuned for four (about ninety damage a second between them at level ten).
  dg_rustback: { type: 'dg_rustback', model: 'rustback', palette: { a: '#2e4a3c', b: '#5a9a7a' }, scale: 1.15, name: 'Gallery rustback', level: 9, hp: 200, damage: 18, speed: 3.4, aggro: 9, leash: 60, attack: 'charge', windup: 0.75, range: 7, cooldown: 2.4, xp: 95, loot: [{ item: 'rustback_shell', chance: 0.6 }, { item: 'copper_ore', chance: 0.5 }], marks: [2, 5], respawn: 99999 },
  dg_hatchling: { type: 'dg_hatchling', model: 'rustback', palette: { a: '#3e6a52', b: '#8ac8a4' }, scale: 0.6, name: 'Rustback hatchling', level: 8, hp: 60, damage: 10, speed: 4.4, aggro: 14, leash: 60, attack: 'charge', windup: 0.6, range: 4, cooldown: 1.8, xp: 25, loot: [], marks: [0, 1], respawn: 99999 },
  dg_seep: { type: 'dg_seep', model: 'jelly', palette: { a: '#6a9a6a', b: '#2a4a3a' }, scale: 1.1, name: 'Sump jelly', level: 9, hp: 170, damage: 17, speed: 2.8, aggro: 8, leash: 60, attack: 'slam', windup: 0.8, range: 2.8, cooldown: 2.2, xp: 90, loot: [{ item: 'jelly_residue', chance: 0.8 }], marks: [2, 4], respawn: 99999 },
  dg_nightman: { type: 'dg_nightman', model: 'bandit', look: { tunic: '#3a3a36', trim: '#7a6a4a', trousers: '#2e2a26', hat: 'cap', hatColor: '#2a2a2a' }, held: 'pickaxe', name: 'Night-shift hand', level: 10, hp: 210, damage: 19, speed: 5.2, aggro: 12, leash: 60, attack: 'lunge', windup: 0.55, range: 2.6, cooldown: 1.6, xp: 110, loot: [{ item: 'copper_ore', chance: 0.6 }, { item: 'bread', chance: 0.3 }], marks: [3, 7], respawn: 99999 },
  // Throwers: they keep their distance and lob something into a circle where you stood
  dg_lampman: { type: 'dg_lampman', model: 'bandit', look: { tunic: '#4a3e2e', trim: '#c8a050', trousers: '#2e2a26', hat: 'cap', hatColor: '#3a2e20' }, held: 'none', name: 'Night-shift lampman', level: 10, hp: 160, damage: 22, speed: 4.6, aggro: 14, leash: 60, attack: 'throw', blast: 1.9, shot: '#ffb040', windup: 1.0, range: 12, cooldown: 2.6, xp: 105, loot: [{ item: 'copper_ore', chance: 0.5 }, { item: 'bread', chance: 0.3 }], marks: [3, 7], respawn: 99999 },
  dg_spitter: { type: 'dg_spitter', model: 'jelly', palette: { a: '#c8f4ff', b: '#4a8ab8', glow: true }, scale: 0.95, name: 'Glass spitter', level: 30, hp: 520, damage: 50, speed: 2.4, aggro: 14, leash: 60, attack: 'throw', blast: 2.1, shot: '#9fe8ff', windup: 1.1, range: 13, cooldown: 2.8, xp: 520, loot: [{ item: 'star_crystal', chance: 0.25 }, { item: 'jelly_residue', chance: 0.8 }], marks: [8, 16], respawn: 99999 },
  // Kell: the volcano's creatures, and the Kilnfolk's old automata that have woken and wandered out
  cinderhound: { type: 'cinderhound', model: 'wolf', palette: { a: '#2a2422', b: '#141010', c: '#ff7a30' }, scale: 1.1, name: 'Cinderhound', level: 36, hp: 520, damage: 46, speed: 6.2, aggro: 13, leash: 32, attack: 'lunge', windup: 0.5, range: 2.8, cooldown: 1.5, xp: 420, loot: [{ item: 'cinder_pelt', chance: 0.6 }], marks: [10, 18], respawn: 110 },
  ashcrawler: { type: 'ashcrawler', model: 'rustback', palette: { a: '#2e2a2a', b: '#ff7a3a' }, scale: 1.35, name: 'Ash-crawler', level: 37, hp: 620, damage: 48, speed: 3.6, aggro: 9, leash: 26, attack: 'charge', windup: 0.75, range: 8, cooldown: 2.4, xp: 450, loot: [{ item: 'iron_ore', chance: 0.5 }], marks: [10, 18], respawn: 120 },
  brassmite: { type: 'brassmite', model: 'rustback', palette: { a: '#b08a3a', b: '#6a5020' }, scale: 0.85, name: 'Brass mite', level: 35, hp: 380, damage: 38, speed: 4.6, aggro: 12, leash: 30, attack: 'charge', windup: 0.6, range: 6, cooldown: 2, xp: 360, loot: [{ item: 'brass_cog', chance: 0.65 }], marks: [8, 15], respawn: 100 },
  ventjelly: { type: 'ventjelly', model: 'jelly', palette: { a: '#ff9a4a', b: '#7a2a10', glow: true }, scale: 1.2, name: 'Vent jelly', level: 38, hp: 560, damage: 50, speed: 2.4, aggro: 13, leash: 26, attack: 'throw', blast: 2, shot: '#ff8a30', windup: 1.0, range: 12, cooldown: 2.8, xp: 470, loot: [{ item: 'jelly_residue', chance: 0.8 }], marks: [10, 18], respawn: 110 },
  // The Escapement's keepers, and the three that won't let it stop
  dg_warder: { type: 'dg_warder', model: 'bandit', look: { skin: '#b8904a', hair: '#6a5020', hairStyle: 3, eyes: '#ffb040', tunic: '#5a4a2a', trim: '#d8b050', trousers: '#3a3020', boots: '#2a2418', gloves: '#8a6a2a', shoulderPads: '#b08a3a', hat: 'circlet', hatColor: '#d8b050', build: 1.2 }, held: 'hammer', name: 'Escapement warder', level: 40, hp: 900, damage: 58, speed: 4.8, aggro: 13, leash: 60, attack: 'lunge', windup: 0.6, range: 3, cooldown: 1.8, xp: 700, loot: [{ item: 'brass_cog', chance: 0.7 }], marks: [12, 22], respawn: 99999 },
  dg_spring: { type: 'dg_spring', model: 'rustback', palette: { a: '#c8a050', b: '#5a4418' }, scale: 0.75, name: 'Loose spring', level: 39, hp: 380, damage: 40, speed: 5.6, aggro: 15, leash: 60, attack: 'charge', windup: 0.5, range: 6, cooldown: 1.7, xp: 300, loot: [{ item: 'brass_cog', chance: 0.4 }], marks: [5, 10], respawn: 99999 },
  dg_boiler: { type: 'dg_boiler', model: 'jelly', palette: { a: '#ffb060', b: '#8a3a14', glow: true }, scale: 1.1, name: 'Scald', level: 40, hp: 700, damage: 60, speed: 2.4, aggro: 14, leash: 60, attack: 'throw', blast: 2.2, shot: '#ffd890', windup: 1.0, range: 13, cooldown: 2.6, xp: 620, loot: [{ item: 'jelly_residue', chance: 0.8 }], marks: [10, 18], respawn: 99999 },
  dg_tallow: { type: 'dg_tallow', model: 'bandit', look: { ...{ skin: '#b8904a', hair: '#6a5020', hairStyle: 3, eyes: '#ffb040', tunic: '#5a4a2a', trim: '#d8b050', trousers: '#3a3020', boots: '#2a2418', gloves: '#8a6a2a', shoulderPads: '#b08a3a', hat: 'circlet', hatColor: '#d8b050', build: 1.2 }, tunic: '#3a3024', cape: '#2a2018', hat: 'wide', hatColor: '#2a2018', build: 1.3, height: 1.1 }, held: 'hammer', scale: 1.35, name: 'Old Tallow', level: 40, hp: 10000, damage: 70, speed: 4.6, aggro: 15, leash: 40, attack: 'lunge', windup: 0.7, range: 3.4, cooldown: 1.9, xp: 4200, elite: true, loot: [{ item: 'brass_cog', chance: 1, min: 3, max: 3 }], marks: [80, 120], respawn: 99999 },
  dg_governor: { type: 'dg_governor', model: 'rustback', palette: { a: '#b08a3a', b: '#e8c878' }, scale: 2.7, name: 'The Governor', level: 41, hp: 12500, damage: 75, speed: 3.2, aggro: 15, leash: 40, attack: 'slam', windup: 1.0, range: 5, cooldown: 2.4, xp: 5200, elite: true, loot: [{ item: 'brass_cog', chance: 1, min: 4, max: 4 }], marks: [90, 140], respawn: 99999 },
  dg_mainspring: { type: 'dg_mainspring', model: 'rustback', palette: { a: '#3e8a74', b: '#d07a44' }, scale: 3.2, name: 'The Mainspring', level: 42, hp: 15500, damage: 80, speed: 3.8, aggro: 16, leash: 50, attack: 'charge', windup: 0.9, range: 11, cooldown: 2.4, xp: 7000, elite: true, loot: [{ item: 'brass_cog', chance: 1, min: 6, max: 6 }], marks: [120, 180], respawn: 99999 },
  dg_coll: { type: 'dg_coll', model: 'bandit', look: { tunic: '#5a3a2a', trim: '#c8a050', trousers: '#3a3026', hat: 'wide', hatColor: '#3a2a1a', beard: true, build: 1.15 }, held: 'pickaxe', scale: 1.1, name: 'Coll Bray', level: 11, hp: 2600, damage: 34, speed: 5.2, aggro: 14, leash: 40, attack: 'lunge', windup: 0.6, range: 3.0, cooldown: 1.8, xp: 900, elite: true, loot: [], marks: [25, 40], respawn: 99999 },
  dg_sump: { type: 'dg_sump', model: 'jelly', palette: { a: '#5a8a5a', b: '#1e3a2a' }, scale: 2.6, name: 'Old Sump', level: 11, hp: 3400, damage: 36, speed: 2.4, aggro: 14, leash: 40, attack: 'slam', windup: 0.95, range: 4.4, cooldown: 2.3, xp: 1100, elite: true, loot: [{ item: 'jelly_residue', chance: 1, min: 3, max: 3 }], marks: [30, 46], respawn: 99999 },
  dg_verdigris: { type: 'dg_verdigris', model: 'rustback', palette: { a: '#24503e', b: '#7ac8a0' }, scale: 2.6, name: 'Verdigris', level: 12, hp: 5200, damage: 43, speed: 3.6, aggro: 16, leash: 50, attack: 'charge', windup: 0.9, range: 10, cooldown: 2.5, xp: 1800, elite: true, loot: [{ item: 'rustback_shell', chance: 1, min: 3, max: 3 }, { item: 'copper_ore', chance: 1, min: 4, max: 4 }], marks: [45, 70], respawn: 99999 },
  // Under the Kettle (group dungeon, levels 28-32): its packs are Scarth's own creatures; these are its three bosses
  dg_brack: { type: 'dg_brack', model: 'wolf', palette: { a: '#4a4a4e', b: '#26262a', c: '#c8ccd2' }, scale: 1.9, name: 'Brack', level: 30, hp: 7000, damage: 58, speed: 6.6, aggro: 15, leash: 40, attack: 'lunge', windup: 0.5, range: 3.4, cooldown: 1.5, xp: 2400, elite: true, loot: [{ item: 'frost_pelt', chance: 1, min: 2, max: 2 }], marks: [60, 90], respawn: 99999 },
  dg_millstone: { type: 'dg_millstone', model: 'rustback', palette: { a: '#5e5e64', b: '#a8b0b8' }, scale: 2.7, name: 'Millstone', level: 31, hp: 9000, damage: 66, speed: 3.6, aggro: 14, leash: 40, attack: 'charge', windup: 0.85, range: 10, cooldown: 2.4, xp: 3000, elite: true, loot: [{ item: 'iron_ore', chance: 1, min: 4, max: 4 }, { item: 'star_crystal', chance: 1 }], marks: [70, 100], respawn: 99999 },
  dg_glim: { type: 'dg_glim', model: 'jelly', palette: { a: '#c8f4ff', b: '#3a9ac8', glow: true }, scale: 3.2, name: 'The Glim', level: 32, hp: 11000, damage: 45, speed: 2.6, aggro: 16, leash: 50, attack: 'slam', windup: 1.1, range: 4.8, cooldown: 2.8, xp: 4500, elite: true, loot: [{ item: 'star_crystal', chance: 1, min: 4, max: 4 }], marks: [90, 130], respawn: 99999 },
  tinthief: { type: 'tinthief', model: 'bandit', look: { tunic: '#4a4a52', trim: '#8a8a7a', trousers: '#3a3434', hat: 'hood', hatColor: '#3a3a44' }, held: 'pickaxe', name: 'Tin thief', level: 31, hp: 580, damage: 40, speed: 5.6, aggro: 14, leash: 32, attack: 'lunge', windup: 0.45, range: 2.7, cooldown: 1.4, xp: 420, loot: [{ item: 'iron_ore', chance: 0.5 }, { item: 'moor_pasty', chance: 0.3 }, { item: 'frost_cowl', chance: 0.03 }], marks: [12, 20], respawn: 150 },
  // The bandit chiefs, one to a fort (data/forts.ts): harder than their gangs, and each carries the
  // gang's tally, which the Charter pays for
  chief_gibbet: { type: 'chief_gibbet', model: 'bandit', look: { tunic: '#5a2a22', trim: '#c8a050', trousers: '#2e2a26', hat: 'wide', hatColor: '#2a1e18', cape: '#3a2a22', facial: 4, build: 1.1 }, held: 'sword', scale: 1.1, name: 'Captain Saul Rudd', level: 10, hp: 700, damage: 21, speed: 5.4, aggro: 14, leash: 24, attack: 'lunge', windup: 0.55, range: 2.9, cooldown: 1.4, xp: 520, elite: true, loot: [{ item: 'tally_gibbet', chance: 1 }, { item: 'toll_sabre', chance: 0.25 }], marks: [26, 40], respawn: 1500 },
  chief_breakneck: { type: 'chief_breakneck', model: 'bandit', look: { tunic: '#2e3a1e', trim: '#7a6a3a', trousers: '#2e2e22', hat: 'hood', hatColor: '#1e2a14', cape: '#3e4a2a', facial: 2, build: 1.15 }, held: 'hatchet', scale: 1.12, name: 'Jem Garside', level: 15, hp: 960, damage: 27, speed: 5.6, aggro: 14, leash: 24, attack: 'lunge', windup: 0.5, range: 2.9, cooldown: 1.4, xp: 820, elite: true, loot: [{ item: 'tally_breakneck', chance: 1 }, { item: 'thorn_blade', chance: 0.25 }, { item: 'moss_hood', chance: 0.2 }], marks: [32, 48], respawn: 1500 },
  chief_blackwater: { type: 'chief_blackwater', model: 'bandit', look: { frame: 'f', tunic: '#1e2a3a', trim: '#d8d0b8', trousers: '#22222a', hat: 'wide', hatColor: '#1a1a1a', cape: '#2a3a4a', build: 1.02 }, held: 'bronzeSword', scale: 1.08, name: 'Bettany Crane', level: 17, hp: 1080, damage: 29, speed: 5.6, aggro: 14, leash: 24, attack: 'lunge', windup: 0.5, range: 2.9, cooldown: 1.4, xp: 950, elite: true, loot: [{ item: 'tally_blackwater', chance: 1 }, { item: 'brine_cutlass', chance: 0.25 }, { item: 'oilskin_hat', chance: 0.2 }], marks: [34, 52], respawn: 1500 },
  chief_reddog: { type: 'chief_reddog', model: 'bandit', look: { tunic: '#8a3a1a', trim: '#e0a050', trousers: '#4a2e1e', hat: 'cap', hatColor: '#4a2a14', facial: 6, build: 1.2 }, held: 'pickaxe', scale: 1.14, name: 'Josiah Kell', level: 22, hp: 1400, damage: 36, speed: 5.4, aggro: 14, leash: 24, attack: 'lunge', windup: 0.55, range: 3.0, cooldown: 1.5, xp: 1250, elite: true, loot: [{ item: 'tally_reddog', chance: 1 }, { item: 'harrow_cleaver', chance: 0.25 }, { item: 'redback_helm', chance: 0.2 }], marks: [38, 58], respawn: 1500 },
  chief_eyrie: { type: 'chief_eyrie', model: 'bandit', look: { tunic: '#3a3a3a', trim: '#b8a878', trousers: '#2a2626', hat: 'kerchief', hatColor: '#5a1e1e', cape: '#5a5a5a', facial: 3, build: 0.98, height: 1.08 }, held: 'sword', scale: 1.08, name: 'Matty Gaunt', level: 13, hp: 800, damage: 24, speed: 5.8, aggro: 14, leash: 24, attack: 'lunge', windup: 0.45, range: 2.9, cooldown: 1.3, xp: 680, elite: true, loot: [{ item: 'tally_eyrie', chance: 1 }, { item: 'wolfskin_hood', chance: 0.25 }], marks: [28, 44], respawn: 1500 },
  chief_stilts: { type: 'chief_stilts', model: 'bandit', look: { frame: 'f', tunic: '#3a4a2a', trim: '#9a8a4a', trousers: '#2e2e22', hat: 'straw', cape: '#4a3a2a', age: 0.7, build: 1.08 }, held: 'hatchet', scale: 1.08, name: 'Agnes Mardle', level: 18, hp: 1160, damage: 31, speed: 5.4, aggro: 14, leash: 24, attack: 'lunge', windup: 0.5, range: 2.9, cooldown: 1.4, xp: 1000, elite: true, loot: [{ item: 'tally_stilts', chance: 1 }, { item: 'oilskin_hat', chance: 0.25 }], marks: [34, 52], respawn: 1500 },
  chief_carrack: { type: 'chief_carrack', model: 'bandit', look: { tunic: '#3a3a44', trim: '#a8a898', trousers: '#2a2a30', hat: 'hood', hatColor: '#2a2a34', cape: '#4a4a52', facial: 1, build: 1.12 }, held: 'pickaxe', scale: 1.12, name: 'Kit Pascoe', level: 32, hp: 2300, damage: 52, speed: 5.6, aggro: 14, leash: 24, attack: 'lunge', windup: 0.45, range: 3.0, cooldown: 1.3, xp: 2100, elite: true, loot: [{ item: 'tally_carrack', chance: 1 }, { item: 'frost_cowl', chance: 0.25 }], marks: [46, 70], respawn: 1500 },
  // Inkholm: the greyed (islanders the Grey has taken), the brothers under the priory, puffballs,
  // the island's hogs gone grey, gill crabs on the shore, and Abbot Wystan in the Old Bed
  greyed: { type: 'greyed', model: 'bandit', look: { skin: '#a4aa9c', tunic: '#5e5c56', trim: '#86847a', trousers: '#4a4844', hat: 'wide', hatColor: '#d4ccbc', build: 0.95 }, held: 'none', name: 'Greyed islander', level: 22, hp: 320, damage: 26, speed: 4.2, aggro: 11, leash: 26, attack: 'lunge', windup: 0.7, range: 2.5, cooldown: 1.8, xp: 270, loot: [{ item: 'grey_cap', chance: 0.6 }, { item: 'stemwood', chance: 0.3 }], marks: [6, 12], respawn: 140 },
  greybrother: { type: 'greybrother', model: 'bandit', look: { skin: '#9ea498', tunic: '#3a2e26', trim: '#5a4a3a', trousers: '#2e241e', hat: 'hood', hatColor: '#3a2e26', cape: '#2e241e', age: 0.8 }, held: 'none', name: 'Grey brother', level: 25, hp: 380, damage: 30, speed: 4.0, aggro: 11, leash: 30, attack: 'lunge', windup: 0.75, range: 2.6, cooldown: 1.9, xp: 330, loot: [{ item: 'grey_cap', chance: 0.7 }, { item: 'furn_candles', chance: 0.05 }], marks: [8, 14], respawn: 160 },
  puffball: { type: 'puffball', model: 'jelly', palette: { a: '#e2dac6', b: '#a89c84' }, scale: 1.2, name: 'Puffball', level: 23, hp: 280, damage: 24, speed: 2.6, aggro: 8, leash: 22, attack: 'slam', windup: 0.9, range: 3.0, cooldown: 2.3, xp: 250, loot: [{ item: 'grey_cap', chance: 0.4 }, { item: 'jelly_residue', chance: 0.5 }], marks: [5, 10], respawn: 120 },
  greyhog: { type: 'greyhog', model: 'boar', palette: { a: '#6e6a62', b: '#d0c8b6', c: '#a8a090' }, scale: 1.1, name: 'Grey hog', level: 24, hp: 340, damage: 28, speed: 4.4, aggro: 9, leash: 26, attack: 'charge', windup: 0.7, range: 6.5, cooldown: 2.4, xp: 300, loot: [{ item: 'boar_hide', chance: 0.6 }, { item: 'grey_cap', chance: 0.25 }], marks: [6, 12], respawn: 130 },
  gillcrab: { type: 'gillcrab', model: 'rustback', palette: { a: '#c8a890', b: '#e8d0b8' }, scale: 1.05, name: 'Gill crab', level: 21, hp: 300, damage: 25, speed: 3.6, aggro: 8, leash: 24, attack: 'charge', windup: 0.75, range: 7, cooldown: 2.4, xp: 260, loot: [{ item: 'crab_shell', chance: 0.7 }], marks: [5, 10], respawn: 120 },
  greyabbot: { type: 'greyabbot', model: 'bandit', look: { skin: '#b4baae', tunic: '#2a221c', trim: '#c8b890', trousers: '#221a14', hat: 'hood', hatColor: '#2a221c', cape: '#1e1814', age: 0.95, build: 1.1, height: 1.08 }, held: 'none', scale: 1.15, name: 'Abbot Wystan', level: 28, hp: 1500, damage: 40, speed: 4.2, aggro: 13, leash: 24, attack: 'slam', windup: 0.8, range: 3.4, cooldown: 1.8, xp: 1400, elite: true, loot: [{ item: 'wystan_crook', chance: 1 }, { item: 'grey_cap', chance: 1, min: 2, max: 3 }], marks: [40, 60], respawn: 900 },  // Rares (data/wilds.ts): one to a region, turning up at its landmarks
  // The festivals' folk (data/seasons.ts): each one's boss and those who come ahead of it. They give
  // the festival's tokens and its bag, not gear
  jackalent: { type: 'jackalent', model: 'bandit', look: { skin: '#d8c890', tunic: '#c8a860', trim: '#8a6a3a', trousers: '#a88a50', boots: '#6a5030', hat: 'straw', build: 1.1 }, held: 'none', scale: 1.5, name: 'Jack-a-Lent', level: 14, hp: 1500, damage: 26, speed: 4.6, aggro: 14, leash: 26, attack: 'slam', windup: 0.8, range: 3.4, cooldown: 1.9, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  strawling: { type: 'strawling', model: 'bandit', look: { skin: '#d8c890', tunic: '#d0b070', trim: '#8a6a3a', trousers: '#b89858', boots: '#6a5030', hat: 'straw', build: 0.9 }, held: 'none', scale: 0.75, name: 'Strawling', level: 12, hp: 170, damage: 15, speed: 5.0, aggro: 12, leash: 26, attack: 'lunge', windup: 0.6, range: 2.4, cooldown: 1.6, xp: 90, loot: [], marks: [1, 3], respawn: 99999 },
  reynard: { type: 'reynard', model: 'wolf', palette: { a: '#c8582a', b: '#3a2014', c: '#f0e8dc' }, scale: 1.8, name: 'Red Reynard', level: 14, hp: 1500, damage: 26, speed: 6.4, aggro: 14, leash: 28, attack: 'lunge', windup: 0.5, range: 3.2, cooldown: 1.4, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  fairfox: { type: 'fairfox', model: 'wolf', palette: { a: '#d0602e', b: '#3a2014', c: '#f0e8dc' }, scale: 0.8, name: 'Fox', level: 12, hp: 150, damage: 14, speed: 6.2, aggro: 12, leash: 26, attack: 'lunge', windup: 0.45, range: 2.2, cooldown: 1.4, xp: 85, loot: [], marks: [1, 3], respawn: 99999 },
  hob: { type: 'hob', model: 'bandit', look: { skin: '#8aa070', tunic: '#3a5a2a', trim: '#c8a040', trousers: '#2e3a22', boots: '#2a2018', hat: 'hood', hatColor: '#2e4a22', facial: 4, age: 0.9, build: 1.15 }, held: 'none', scale: 0.95, name: 'The Hob', level: 14, hp: 1500, damage: 25, speed: 5.8, aggro: 14, leash: 26, attack: 'lunge', windup: 0.5, range: 2.8, cooldown: 1.3, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  willight: { type: 'willight', model: 'jelly', palette: { a: '#f6e08a', b: '#e8a020', glow: true }, scale: 0.6, name: 'Will-light', level: 12, hp: 130, damage: 13, speed: 4.4, aggro: 12, leash: 26, attack: 'slam', windup: 0.7, range: 2.2, cooldown: 1.8, xp: 80, loot: [], marks: [1, 3], respawn: 99999 },
  cornwolf: { type: 'cornwolf', model: 'wolf', palette: { a: '#d8b050', b: '#8a6a2a', c: '#f0e0a0' }, scale: 2.0, name: 'The Corn Wolf', level: 14, hp: 1600, damage: 27, speed: 6.0, aggro: 14, leash: 28, attack: 'lunge', windup: 0.55, range: 3.4, cooldown: 1.5, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  cornwhelp: { type: 'cornwhelp', model: 'wolf', palette: { a: '#e0c060', b: '#8a6a2a', c: '#f0e0a0' }, scale: 0.85, name: 'Corn whelp', level: 12, hp: 160, damage: 15, speed: 6.0, aggro: 12, leash: 26, attack: 'lunge', windup: 0.5, range: 2.3, cooldown: 1.5, xp: 85, loot: [], marks: [1, 3], respawn: 99999 },
  lanternman: { type: 'lanternman', model: 'bandit', look: { skin: '#3a3430', tunic: '#2a2a24', trim: '#5a4a3a', trousers: '#22201c', boots: '#141210', cape: '#1e1a16', hat: 'turnip', build: 0.9, height: 1.12 }, held: 'none', scale: 1.5, name: 'The Lantern Man', level: 14, hp: 1600, damage: 27, speed: 4.8, aggro: 15, leash: 26, attack: 'slam', windup: 0.8, range: 3.4, cooldown: 1.8, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  wisp: { type: 'wisp', model: 'jelly', palette: { a: '#ffb050', b: '#e8701a', glow: true }, scale: 0.55, name: 'Wisp', level: 12, hp: 130, damage: 13, speed: 4.6, aggro: 12, leash: 26, attack: 'slam', windup: 0.7, range: 2.2, cooldown: 1.8, xp: 80, loot: [], marks: [1, 3], respawn: 99999 },
  gander: { type: 'gander', model: 'duck', palette: { a: '#f4f2ec', b: '#e89030' }, scale: 3.4, name: 'Old Hissing Jack', level: 14, hp: 1500, damage: 25, speed: 5.4, aggro: 14, leash: 26, attack: 'charge', windup: 0.7, range: 7, cooldown: 2.2, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  fairgoose: { type: 'fairgoose', model: 'duck', palette: { a: '#ece8e0', b: '#e89030' }, scale: 1.5, name: 'Fair goose', level: 12, hp: 130, damage: 12, speed: 5.2, aggro: 10, leash: 24, attack: 'lunge', windup: 0.5, range: 2.0, cooldown: 1.5, xp: 75, loot: [], marks: [1, 3], respawn: 99999 },
  oldrime: { type: 'oldrime', model: 'bandit', look: { skin: '#c8e0f0', tunic: '#e8f0f8', trim: '#9ab0c8', trousers: '#cfe8f4', boots: '#9ab0c8', hat: 'hood', hatColor: '#e8f0f8', cape: '#cfe8f4', facial: 8, age: 1, build: 1.2, height: 1.1 }, held: 'none', scale: 1.6, name: 'Old Rime', level: 14, hp: 1700, damage: 28, speed: 4.2, aggro: 14, leash: 26, attack: 'slam', windup: 0.9, range: 3.6, cooldown: 2.0, xp: 900, elite: true, loot: [], marks: [20, 30], respawn: 99999 },
  rimejelly: { type: 'rimejelly', model: 'jelly', palette: { a: '#cfe8f4', b: '#8ab0d0', glow: true }, scale: 0.9, name: 'Rime jelly', level: 12, hp: 170, damage: 15, speed: 3.0, aggro: 10, leash: 24, attack: 'slam', windup: 0.8, range: 2.6, cooldown: 2.0, xp: 90, loot: [], marks: [1, 3], respawn: 99999 },  r_brindle: { type: 'r_brindle', model: 'wolf', palette: { a: '#6a5040', b: '#3a2a20', c: '#b8a080' }, scale: 1.4, name: 'Old Brindle', level: 7, hp: 380, damage: 16, speed: 5.8, aggro: 16, leash: 40, attack: 'lunge', windup: 0.5, range: 2.8, cooldown: 1.5, xp: 300, elite: true, loot: [{ item: 'brindle_tail', chance: 1 }, { item: 'tmap_greenwake_1', chance: 0.5 }, { item: 'tmap_greenwake_2', chance: 0.5 }, { item: 'wolfskin_hood', chance: 0.3 }], marks: [15, 25], respawn: 99999 },
  r_barley: { type: 'r_barley', model: 'boar', palette: { a: '#8a6a3a', b: '#5a4020', c: '#d8b080' }, scale: 1.8, name: 'The Barley Boar', level: 12, hp: 720, damage: 22, speed: 4.6, aggro: 16, leash: 40, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.2, xp: 520, elite: true, loot: [{ item: 'barley_tusk', chance: 1 }, { item: 'tmap_crownroad_1', chance: 0.5 }, { item: 'tmap_crownroad_2', chance: 0.5 }, { item: 'toll_sabre', chance: 0.3 }], marks: [20, 32], respawn: 99999 },
  r_mosscap: { type: 'r_mosscap', model: 'jelly', palette: { a: '#5a8a3a', b: '#2a4a1a' }, scale: 2, name: 'Mosscap', level: 16, hp: 900, damage: 26, speed: 2.8, aggro: 16, leash: 40, attack: 'slam', windup: 0.85, range: 3.6, cooldown: 2.2, xp: 700, elite: true, loot: [{ item: 'mosscap_heart', chance: 1 }, { item: 'tmap_brambledeep_1', chance: 0.5 }, { item: 'tmap_brambledeep_2', chance: 0.5 }, { item: 'moss_hood', chance: 0.3 }], marks: [24, 38], respawn: 99999 },
  r_barnacle: { type: 'r_barnacle', model: 'rustback', palette: { a: '#6a6a5a', b: '#d8d0b8' }, scale: 1.9, name: 'Old Barnacle', level: 17, hp: 950, damage: 27, speed: 3.8, aggro: 16, leash: 40, attack: 'charge', windup: 0.75, range: 8, cooldown: 2.3, xp: 760, elite: true, loot: [{ item: 'barnacle_claw', chance: 1 }, { item: 'tmap_saltwind_1', chance: 0.5 }, { item: 'tmap_saltwind_2', chance: 0.5 }, { item: 'oilskin_hat', chance: 0.3 }], marks: [26, 40], respawn: 99999 },
  r_pitdog: { type: 'r_pitdog', model: 'wolf', palette: { a: '#8a3a1a', b: '#4a1e0e', c: '#d89060' }, scale: 1.6, name: 'The Pit Dog', level: 22, hp: 1150, damage: 32, speed: 6.4, aggro: 16, leash: 40, attack: 'lunge', windup: 0.45, range: 3, cooldown: 1.4, xp: 980, elite: true, loot: [{ item: 'pitdog_collar', chance: 1 }, { item: 'tmap_redstone_1', chance: 0.5 }, { item: 'tmap_redstone_2', chance: 0.5 }, { item: 'harrow_cleaver', chance: 0.3 }], marks: [30, 46], respawn: 99999 },
  r_whiteface: { type: 'r_whiteface', model: 'wolf', palette: { a: '#f4f4f4', b: '#c8d0d8', c: '#ffffff' }, scale: 1.7, name: 'Whiteface', level: 31, hp: 1700, damage: 46, speed: 6.8, aggro: 16, leash: 40, attack: 'lunge', windup: 0.45, range: 3.4, cooldown: 1.3, xp: 1500, elite: true, loot: [{ item: 'whiteface_pelt', chance: 1 }, { item: 'tmap_starfall_1', chance: 0.5 }, { item: 'tmap_starfall_2', chance: 0.5 }, { item: 'frost_cowl', chance: 0.3 }], marks: [44, 66], respawn: 99999 },
  r_eggthief: { type: 'r_eggthief', model: 'wolf', palette: { a: '#e8a060', b: '#a05a28', c: '#ffffff' }, scale: 1.2, name: 'The Egg Thief', level: 13, hp: 640, damage: 21, speed: 6.6, aggro: 16, leash: 40, attack: 'lunge', windup: 0.45, range: 2.6, cooldown: 1.3, xp: 560, elite: true, loot: [{ item: 'eggthief_brush', chance: 1 }, { item: 'tmap_gannet_1', chance: 0.5 }, { item: 'tmap_gannet_2', chance: 0.5 }, { item: 'gannet_egg', chance: 1, min: 3, max: 3 }], marks: [20, 32], respawn: 99999 },
  r_mudgut: { type: 'r_mudgut', model: 'boar', palette: { a: '#2a2018', b: '#120e0a', c: '#6a5a40' }, scale: 1.9, name: 'Old Mudgut', level: 20, hp: 1050, damage: 30, speed: 4.6, aggro: 16, leash: 40, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.2, xp: 880, elite: true, loot: [{ item: 'mudgut_tusk', chance: 1 }, { item: 'tmap_wrath_1', chance: 0.5 }, { item: 'tmap_wrath_2', chance: 0.5 }, { item: 'smoked_eel', chance: 1, min: 2, max: 2 }], marks: [28, 44], respawn: 99999 },
  r_torhound: { type: 'r_torhound', model: 'wolf', palette: { a: '#4a4a4a', b: '#2a2a2a', c: '#8a8a8a' }, scale: 1.8, name: 'The Tor Hound', level: 34, hp: 2000, damage: 50, speed: 6.8, aggro: 16, leash: 40, attack: 'lunge', windup: 0.45, range: 3.6, cooldown: 1.3, xp: 1800, elite: true, loot: [{ item: 'torhound_fang', chance: 1 }, { item: 'tmap_tolmen_1', chance: 0.5 }, { item: 'tmap_tolmen_2', chance: 0.5 }, { item: 'frost_cowl', chance: 0.3 }], marks: [50, 76], respawn: 99999 },
  r_bigmary: { type: 'r_bigmary', model: 'shark', palette: { a: '#2e3640', b: '#e0e4e8', c: '#1e262e' }, scale: 1.9, name: 'Big Mary', level: 23, hp: 1200, damage: 34, speed: 6.6, aggro: 16, leash: 40, attack: 'charge', windup: 0.65, range: 9, cooldown: 2.2, xp: 1000, elite: true, loot: [{ item: 'bigmary_tooth', chance: 1 }, { item: 'tmap_saltwind_1', chance: 0.5 }, { item: 'shark_tooth', chance: 1, min: 3, max: 3 }, { item: 'brine_cutlass', chance: 0.3 }], marks: [32, 48], respawn: 99999 },
  // Holmsey, the drowned parish: the pale jellies over its square, and the conger in its nave
  bellmane: { type: 'bellmane', model: 'medusa', palette: { a: '#bfe8d8', b: '#5aa890', c: '#e0fff4', glow: true }, scale: 1.2, name: 'Bell-mane', level: 27, hp: 500, damage: 35, speed: 2, aggro: 8, leash: 20, attack: 'slam', windup: 0.9, range: 4.2, cooldown: 2.3, xp: 380, loot: [{ item: 'jelly_residue', chance: 0.8 }, { item: 'star_crystal', chance: 0.15 }, { item: 'frost_cowl', chance: 0.02 }], marks: [10, 17], respawn: 140 },
  sexton: { type: 'sexton', model: 'eel', palette: { a: '#3a3e38', b: '#8a9480', c: '#22261f' }, scale: 1.6, name: 'Old Sexton', level: 29, hp: 560, damage: 34, speed: 5.4, aggro: 12, leash: 22, attack: 'lunge', windup: 0.6, range: 4.2, cooldown: 1.9, xp: 600, elite: true, loot: [{ item: 'shark_tooth', chance: 1, min: 2, max: 3 }, { item: 'conger_skin', chance: 1, min: 3, max: 3 }, { item: 'starglass_edge', chance: 0.2 }, { item: 'frost_cowl', chance: 0.2 }], marks: [30, 45], respawn: 300 },
  shardjelly: { type: 'shardjelly', model: 'jelly', palette: { a: '#7fe0f4', b: '#2a8ab0', glow: true }, scale: 1.3, name: 'Shard jelly', level: 26, hp: 460, damage: 34, speed: 3, aggro: 9, leash: 26, attack: 'slam', windup: 0.75, range: 3.2, cooldown: 2, xp: 340, loot: [{ item: 'star_crystal', chance: 0.25 }, { item: 'jelly_residue', chance: 0.8 }, { item: 'starglass_edge', chance: 0.02 }], marks: [8, 16], respawn: 120 },
  // The Cockpit's duellists (data/duels.ts, game/Duels.ts): they yield at half their health, so each is
  // written with more of it than a creature of their level, rising up the ladder.
  duel_rowe: { type: 'duel_rowe', model: 'bandit', look: { skin: '#c8946a', hair: '#7a4a2a', hairStyle: 1, tunic: '#5a6a7a', trim: '#e0d4b0', trousers: '#3a3a30', hat: 'kerchief', hatColor: '#2a4a6a', age: 0.15, build: 0.95 }, held: 'sword', level: 44, hp: 1160, damage: 34, xp: 310, marks: [0, 0], name: 'Kit Rowe', speed: 5.6, aggro: 20, leash: 14, attack: 'lunge', windup: 0.5, range: 2.6, cooldown: 1.5, elite: true, loot: [], respawn: 99999 },
  duel_skerry: { type: 'duel_skerry', model: 'bandit', look: { frame: 'f', skin: '#d8a880', hair: '#3a2a1e', hairStyle: 4, tunic: '#2a3a4a', trim: '#a8a090', trousers: '#2a2a30', hat: 'kerchief', hatColor: '#7a2a22', lashes: true, scar: true, build: 1.1 }, held: 'bronzeSword', level: 44, hp: 1430, damage: 40, xp: 310, marks: [0, 0], name: 'Hannah Skerry', speed: 5.6, aggro: 20, leash: 14, attack: 'lunge', windup: 0.45, range: 2.7, cooldown: 1.4, elite: true, loot: [], respawn: 99999 },
  duel_abel: { type: 'duel_abel', model: 'bandit', look: { frame: 'f', skin: '#a8704a', hair: '#1a1410', hairStyle: 2, tunic: '#4a2a22', trim: '#c8a050', trousers: '#2e2a26', hat: 'wide', hatColor: '#2a1e18', lashes: true, build: 1.0 }, held: 'none', level: 44, hp: 1520, damage: 42, xp: 310, marks: [0, 0], name: 'Ruth Abel', speed: 5.2, aggro: 20, leash: 14, attack: 'throw', blast: 1.8, shot: '#c8a050', windup: 0.9, range: 11, cooldown: 2.2, elite: true, loot: [], respawn: 99999 },
  duel_crowe: { type: 'duel_crowe', model: 'bandit', look: { skin: '#e0b894', hair: '#5a4a3a', hairStyle: 3, facial: 4, tunic: '#1e2a3a', trim: '#d8b050', trousers: '#22222a', cape: '#2a3a4a', hat: 'wide', hatColor: '#1a1a1a', build: 1.1, height: 1.05, age: 0.5 }, held: 'sword', level: 44, hp: 1880, damage: 48, xp: 310, marks: [0, 0], name: 'Mattias Crowe', speed: 5.4, aggro: 20, leash: 14, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.0, elite: true, loot: [], respawn: 99999 },
  duel_coyle: { type: 'duel_coyle', model: 'bandit', look: { frame: 'f', skin: '#c8946a', hair: '#2a1e16', hairStyle: 4, tunic: '#2a3a4a', trim: '#a8a090', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a22', lashes: true, scar: true, build: 1.0, age: 0.45 }, held: 'bronzeSword', level: 44, hp: 2320, damage: 54, xp: 310, marks: [0, 0], name: 'Mara Coyle', speed: 5.8, aggro: 20, leash: 14, attack: 'lunge', windup: 0.4, range: 2.8, cooldown: 1.2, elite: true, loot: [], respawn: 99999 },
  // Kingsbarrow: the halls under the old king's barrow (group dungeon, level 95). Garrow Venn's diggers,
  // the barrow dead and the king's guard, Venn, the Barrow-warden, and the Old King.
  dg_digger: { type: 'dg_digger', model: 'bandit', look: { skin: '#c8a080', tunic: '#4a4a40', trim: '#6a5a40', trousers: '#3a3430', boots: '#2a2018', hat: 'cap', hatColor: '#3a3430', build: 1.15 }, held: 'pickaxe', level: 94, hp: 3040, damage: 106, xp: 1250, marks: [21, 39], name: 'Venn\'s digger', speed: 5.2, aggro: 13, leash: 60, attack: 'lunge', windup: 0.55, range: 2.7, cooldown: 1.6, loot: [{ item: 'black_shard', chance: 0.5 }], respawn: 99999 },
  dg_barrowdead: { type: 'dg_barrowdead', model: 'bandit', look: { skin: '#a8b0a4', eyes: '#cfe8f0', tunic: '#3a3a36', trim: '#6a6a60', trousers: '#2e2e2a', boots: '#22221e', hat: 'hood', hatColor: '#34342e', age: 0.9, build: 0.95 }, held: 'none', level: 95, hp: 2410, damage: 96, xp: 1200, marks: [21, 39], name: 'Barrow dead', speed: 4.0, aggro: 12, leash: 60, attack: 'lunge', windup: 0.7, range: 2.6, cooldown: 1.8, loot: [{ item: 'grave_iron', chance: 0.6 }], respawn: 99999 },
  dg_wight: { type: 'dg_wight', model: 'bandit', look: { skin: '#c0c8c8', eyes: '#9fe8ff', tunic: '#22222a', trim: '#b8a878', trousers: '#1e1e24', boots: '#16161a', cape: '#1a1a22', hat: 'circlet', hatColor: '#8a8070', shoulderPads: '#4a4a52', age: 0.95, build: 1.05, height: 1.06 }, held: 'sword', level: 96, hp: 3550, damage: 115, xp: 1480, marks: [22, 40], name: 'Wight of the king\'s guard', speed: 4.8, aggro: 14, leash: 60, attack: 'lunge', windup: 0.55, range: 2.9, cooldown: 1.5, loot: [{ item: 'grave_iron', chance: 0.7 }], respawn: 99999 },
  dg_venn: { type: 'dg_venn', model: 'bandit', look: { skin: '#b88a68', hair: '#3a2e24', hairStyle: 3, facial: 6, tunic: '#5a3a2a', trim: '#c8a050', trousers: '#3a3026', boots: '#2a2018', hat: 'wide', hatColor: '#2a2018', build: 1.3, height: 1.06 }, held: 'hammer', scale: 1.3, level: 95, hp: 33810, damage: 142, xp: 9980, marks: [134, 202], name: 'Garrow Venn', speed: 4.8, aggro: 15, leash: 40, attack: 'lunge', windup: 0.7, range: 3.4, cooldown: 1.9, elite: true, loot: [{ item: 'black_shard', chance: 1, min: 3, max: 3 }], respawn: 99999 },
  dg_barrowwarden: { type: 'dg_barrowwarden', model: 'bandit', look: { ...{ skin: '#c0c8c8', eyes: '#9fe8ff', tunic: '#22222a', trim: '#b8a878', trousers: '#1e1e24', boots: '#16161a', cape: '#1a1a22', hat: 'circlet', hatColor: '#8a8070', shoulderPads: '#4a4a52', age: 0.95, build: 1.05, height: 1.06 }, cape: '#2a2a40', hatColor: '#b8a878', build: 1.2, height: 1.1 }, held: 'sword', scale: 1.6, level: 96, hp: 38200, damage: 143, xp: 12500, marks: [140, 210], name: 'The Barrow-warden', speed: 4.4, aggro: 15, leash: 40, attack: 'slam', windup: 1.0, range: 4.4, cooldown: 2.4, elite: true, loot: [{ item: 'grave_iron', chance: 1, min: 4, max: 4 }], respawn: 99999 },
  dg_oldking: { type: 'dg_oldking', model: 'bandit', look: { skin: '#b8c4c4', hair: '#d8d8d0', hairStyle: 4, facial: 8, eyes: '#9fe8ff', tunic: '#1e1e24', trim: '#d8b050', trousers: '#1a1a20', boots: '#141418', cape: '#2a2a40', hat: 'circlet', hatColor: '#d8b050', shoulderPads: '#3a3a44', age: 1, build: 1.3, height: 1.1 }, held: 'sword', scale: 2.3, level: 97, hp: 54060, damage: 152, xp: 16980, marks: [150, 230], name: 'The Old King', speed: 4.2, aggro: 16, leash: 50, attack: 'slam', windup: 1.0, range: 5, cooldown: 2.3, elite: true, loot: [{ item: 'grave_iron', chance: 1, min: 4, max: 4 }, { item: 'troll_hide', chance: 1 }], respawn: 99999 },
  // Morrow (world/morrow.ts): written at their regions' levels, south to north. The Keys: mangrove
  // crabs, key lizards and reef jellies, and wreckers who don't fly the Brethren's colours. The Glades:
  // sawgrass lizards, the glims that light the water at night, marsh moths. The Amberwold: lamp-moths
  // at dusk, lynx, leafback boars. The Bright Coast: jackals in the terraces, beetles in the white
  // quarries, and the black-runners who carry the black up the coast. The Sunder: slab-crawlers and
  // lift-moths off the hanging stone, rift wolves. The Glass Flats: basilisks, glassbacks and salt
  // reavers. The Greywaste: waste hounds, fen-damps, and the Risen, the first of the Held. The Held
  // Country: barrow-wights, and the fell trolls of the high snow.
  mangrovecrab: { type: 'mangrovecrab', model: 'rustback', palette: { a: '#5a6a3a', b: '#c8a040' }, scale: 1.15, level: 44, hp: 980, damage: 38, xp: 555, marks: [11, 20], name: 'Mangrove crab', speed: 3.8, aggro: 9, leash: 24, attack: 'charge', windup: 0.7, range: 7, cooldown: 2.4, loot: [{ item: 'crab_shell', chance: 0.7 }], respawn: 120 },
  keylizard: { type: 'keylizard', model: 'lizard', palette: { a: '#7aa86a', b: '#e8d8a0', c: '#2a4a2a' }, level: 43, hp: 740, damage: 43, xp: 510, marks: [11, 20], name: 'Key lizard', speed: 6.2, aggro: 12, leash: 30, attack: 'lunge', windup: 0.45, range: 2.6, cooldown: 1.4, loot: [{ item: 'lizard_hide', chance: 0.6 }], respawn: 120 },
  reefjelly: { type: 'reefjelly', model: 'jelly', palette: { a: '#ff8ab0', b: '#a83a6a', glow: true }, scale: 1.2, level: 45, hp: 830, damage: 43, xp: 565, marks: [11, 21], name: 'Reef jelly', speed: 2.6, aggro: 9, leash: 24, attack: 'slam', windup: 0.8, range: 2.9, cooldown: 2.2, loot: [{ item: 'jelly_residue', chance: 0.8 }], respawn: 120 },
  keywrecker: { type: 'keywrecker', model: 'bandit', look: { skin: '#b07a50', tunic: '#e0d4b0', trim: '#2a6a7a', trousers: '#3a5a6a', hat: 'kerchief', hatColor: '#c83a2a', build: 1.0 }, held: 'bronzeSword', level: 46, hp: 950, damage: 48, xp: 645, marks: [12, 21], name: 'Key wrecker', speed: 5.6, aggro: 13, leash: 30, attack: 'lunge', windup: 0.45, range: 2.7, cooldown: 1.4, loot: [{ item: 'raw_mackerel', chance: 0.5 }, { item: 'black_shard', chance: 0.1 }], respawn: 120 },
  gladelizard: { type: 'gladelizard', model: 'lizard', palette: { a: '#4a5a2a', b: '#9a9a5a', c: '#1e2414' }, scale: 1.75, level: 51, hp: 1520, damage: 51, xp: 820, marks: [12, 22], name: 'Sawgrass lizard', speed: 4.4, aggro: 11, leash: 28, attack: 'charge', windup: 0.75, range: 8, cooldown: 2.4, loot: [{ item: 'lizard_hide', chance: 0.8, min: 1, max: 2 }], respawn: 120 },
  glim: { type: 'glim', model: 'jelly', palette: { a: '#8af0a0', b: '#2a7a4a', glow: true }, scale: 1.1, level: 49, hp: 870, damage: 46, xp: 615, marks: [12, 22], name: 'Glade glim', speed: 2.4, aggro: 12, leash: 26, attack: 'throw', blast: 1.9, shot: '#8af0a0', windup: 1.0, range: 12, cooldown: 2.6, loot: [{ item: 'jelly_residue', chance: 0.8 }], respawn: 120 },
  marshmoth: { type: 'marshmoth', model: 'moth', palette: { a: '#6a7a5a', b: '#a8f0a0', c: '#3a4a2e' }, level: 50, hp: 740, damage: 48, xp: 595, marks: [12, 22], name: 'Marsh moth', speed: 5.0, aggro: 13, leash: 30, attack: 'throw', blast: 1.8, shot: '#a8f0a0', windup: 0.9, range: 11, cooldown: 2.4, loot: [{ item: 'moth_dust', chance: 0.6 }], respawn: 120 },
  lampmoth: { type: 'lampmoth', model: 'moth', palette: { a: '#7a4a2a', b: '#ffb040', c: '#4a2e1e' }, scale: 1.1, level: 56, hp: 860, damage: 55, xp: 705, marks: [13, 23], name: 'Lamp-moth', speed: 5.0, aggro: 13, leash: 30, attack: 'throw', blast: 1.9, shot: '#ffb040', windup: 0.9, range: 12, cooldown: 2.4, loot: [{ item: 'moth_dust', chance: 0.7 }], respawn: 120 },
  amberlynx: { type: 'amberlynx', model: 'wolf', palette: { a: '#b0602a', b: '#5a2a14', c: '#f0d0a0' }, scale: 0.95, level: 55, hp: 900, damage: 61, xp: 695, marks: [13, 23], name: 'Amber lynx', speed: 6.6, aggro: 13, leash: 32, attack: 'lunge', windup: 0.45, range: 2.8, cooldown: 1.4, loot: [{ item: 'wolf_pelt', chance: 0.7 }], respawn: 120 },
  leafback: { type: 'leafback', model: 'boar', palette: { a: '#7a4a24', b: '#c8782a', c: '#c8967a' }, scale: 1.25, level: 57, hp: 1580, damage: 51, xp: 800, marks: [13, 24], name: 'Leafback boar', speed: 4.4, aggro: 10, leash: 26, attack: 'charge', windup: 0.7, range: 7, cooldown: 2.4, loot: [{ item: 'boar_hide', chance: 0.7 }], respawn: 120 },
  terracejackal: { type: 'terracejackal', model: 'wolf', palette: { a: '#c8a46a', b: '#7a5a34', c: '#efe2c4' }, scale: 0.9, level: 60, hp: 1020, damage: 63, xp: 715, marks: [14, 24], name: 'Terrace jackal', speed: 6.6, aggro: 12, leash: 30, attack: 'lunge', windup: 0.45, range: 2.6, cooldown: 1.4, loot: [{ item: 'wolf_pelt', chance: 0.6 }], respawn: 120 },
  quarrybeetle: { type: 'quarrybeetle', model: 'rustback', palette: { a: '#e6e2d6', b: '#9a968a' }, scale: 1.25, level: 60, hp: 1630, damage: 49, xp: 800, marks: [14, 24], name: 'Quarry beetle', speed: 3.8, aggro: 9, leash: 24, attack: 'charge', windup: 0.7, range: 7.5, cooldown: 2.4, loot: [{ item: 'white_chip', chance: 0.5 }], respawn: 120 },
  blackrunner: { type: 'blackrunner', model: 'bandit', look: { skin: '#c8946a', tunic: '#2a2a32', trim: '#8a8a7a', trousers: '#22222a', hat: 'hood', hatColor: '#1a1a20', cape: '#2a2a32' }, held: 'sword', level: 61, hp: 1390, damage: 59, xp: 855, marks: [14, 25], name: 'Black-runner', speed: 5.8, aggro: 13, leash: 30, attack: 'lunge', windup: 0.45, range: 2.7, cooldown: 1.4, loot: [{ item: 'black_shard', chance: 0.4 }, { item: 'olive_bread', chance: 0.2 }], respawn: 120 },
  slabcrawler: { type: 'slabcrawler', model: 'rustback', palette: { a: '#cfd8dc', b: '#7fe0f4' }, scale: 1.45, level: 67, hp: 2140, damage: 53, xp: 985, marks: [15, 26], name: 'Slab-crawler', speed: 3.6, aggro: 9, leash: 24, attack: 'charge', windup: 0.75, range: 8, cooldown: 2.4, loot: [{ item: 'white_chip', chance: 0.6, min: 1, max: 2 }], respawn: 120 },
  liftmoth: { type: 'liftmoth', model: 'moth', palette: { a: '#d8e8f0', b: '#9fe8ff', c: '#8a9aa4' }, scale: 1.15, level: 66, hp: 1090, damage: 63, xp: 830, marks: [14, 26], name: 'Lift-moth', speed: 5.2, aggro: 13, leash: 30, attack: 'throw', blast: 1.9, shot: '#9fe8ff', windup: 0.9, range: 12, cooldown: 2.4, loot: [{ item: 'moth_dust', chance: 0.6 }, { item: 'white_chip', chance: 0.2 }], respawn: 120 },
  riftwolf: { type: 'riftwolf', model: 'wolf', palette: { a: '#5a6470', b: '#2a3038', c: '#9fb0bc' }, scale: 1.2, level: 68, hp: 1380, damage: 70, xp: 905, marks: [15, 26], name: 'Rift wolf', speed: 6.2, aggro: 13, leash: 32, attack: 'lunge', windup: 0.5, range: 2.9, cooldown: 1.5, loot: [{ item: 'wolf_pelt', chance: 0.7 }], respawn: 120 },
  basilisk: { type: 'basilisk', model: 'lizard', palette: { a: '#1a1a22', b: '#c83a2a', c: '#ff7a3a' }, scale: 1.5, level: 76, hp: 2100, damage: 74, xp: 1170, marks: [16, 28], name: 'Glass basilisk', speed: 4.6, aggro: 13, leash: 28, attack: 'throw', blast: 2.0, shot: '#ff5a2a', windup: 1.0, range: 12, cooldown: 2.6, loot: [{ item: 'lizard_hide', chance: 0.6 }, { item: 'black_glass', chance: 0.3 }], respawn: 120 },
  glassback: { type: 'glassback', model: 'rustback', palette: { a: '#141418', b: '#6a5a8a' }, scale: 1.3, level: 74, hp: 2390, damage: 58, xp: 1035, marks: [15, 28], name: 'Glassback', speed: 3.8, aggro: 9, leash: 24, attack: 'charge', windup: 0.7, range: 8, cooldown: 2.4, loot: [{ item: 'black_glass', chance: 0.6 }], respawn: 120 },
  saltreaver: { type: 'saltreaver', model: 'bandit', look: { skin: '#a8704a', tunic: '#d8c8a0', trim: '#5a4a3a', trousers: '#8a7a5a', hat: 'kerchief', hatColor: '#e8e0d0', cape: '#c8b890' }, held: 'hatchet', level: 75, hp: 1870, damage: 70, xp: 1050, marks: [16, 28], name: 'Salt reaver', speed: 5.8, aggro: 14, leash: 30, attack: 'lunge', windup: 0.45, range: 2.7, cooldown: 1.4, loot: [{ item: 'black_glass', chance: 0.3 }, { item: 'callis_red', chance: 0.15 }], respawn: 120 },
  wastehound: { type: 'wastehound', model: 'wolf', palette: { a: '#7a7a74', b: '#3a3a38', c: '#b8b8b0' }, scale: 1.25, level: 83, hp: 1740, damage: 82, xp: 1045, marks: [17, 30], name: 'Waste hound', speed: 6.2, aggro: 13, leash: 32, attack: 'lunge', windup: 0.5, range: 2.9, cooldown: 1.5, loot: [{ item: 'wolf_pelt', chance: 0.6 }], respawn: 120 },
  risen: { type: 'risen', model: 'bandit', look: { skin: '#a8b0a4', eyes: '#cfe8f0', tunic: '#4a4a44', trim: '#7a7a70', trousers: '#3a3a36', boots: '#2a2a28', hat: 'hood', hatColor: '#3e3e3a', age: 0.9, build: 0.9 }, held: 'none', level: 85, hp: 2490, damage: 71, xp: 1190, marks: [17, 30], name: 'Risen', speed: 3.8, aggro: 12, leash: 28, attack: 'lunge', windup: 0.7, range: 2.6, cooldown: 1.8, loot: [{ item: 'grave_iron', chance: 0.5 }], respawn: 120 },
  fendamp: { type: 'fendamp', model: 'jelly', palette: { a: '#8a908a', b: '#3a3e3a' }, scale: 1.3, level: 84, hp: 2000, damage: 70, xp: 1060, marks: [17, 30], name: 'Fen-damp', speed: 2.4, aggro: 9, leash: 24, attack: 'slam', windup: 0.85, range: 3, cooldown: 2.2, loot: [{ item: 'jelly_residue', chance: 0.8 }], respawn: 120 },
  barrowwight: { type: 'barrowwight', model: 'bandit', look: { skin: '#c0c8c8', eyes: '#9fe8ff', tunic: '#2a2a30', trim: '#b8a878', trousers: '#22222a', boots: '#1a1a1e', cape: '#1e1e24', hat: 'circlet', hatColor: '#b8a878', age: 0.95, build: 1.0, height: 1.06 }, held: 'sword', level: 95, hp: 2950, damage: 89, xp: 1465, marks: [18, 32], name: 'Barrow-wight', speed: 4.6, aggro: 14, leash: 30, attack: 'lunge', windup: 0.55, range: 2.9, cooldown: 1.5, loot: [{ item: 'grave_iron', chance: 0.6 }], respawn: 120 },
  felltroll: { type: 'felltroll', model: 'bandit', look: { skin: '#7a8a8a', hair: '#3a4040', hairStyle: 3, facial: 8, eyes: '#e8c040', tunic: '#4a4038', trim: '#6a5a48', trousers: '#3a3430', boots: '#2a2420', build: 1.5, height: 1.05 }, held: 'none', scale: 1.9, level: 96, hp: 6000, damage: 108, xp: 2420, marks: [18, 32], name: 'Fell troll', speed: 4.2, aggro: 13, leash: 26, attack: 'slam', windup: 0.9, range: 3.8, cooldown: 2.0, loot: [{ item: 'troll_hide', chance: 0.7 }, { item: 'grave_iron', chance: 0.2 }], respawn: 240 },
};

/** Which creatures turn up where in the streamed regions. */
/** Which creatures turn up where in the streamed regions (sea: in deep water off that region's coast). */
export const REGION_SPAWNS: Record<RegionId, { enemies: EnemyType[]; animals: ('deer' | 'rabbit' | 'sheep' | 'chicken')[]; sea: EnemyType[] }> = {
  greenwake: { enemies: ['wolf'], animals: ['rabbit', 'deer'], sea: ['huss'] },
  crownroad: { enemies: ['boar', 'roadwolf', 'boar'], animals: ['rabbit', 'sheep', 'deer'], sea: ['huss', 'huss', 'conger'] },
  brambledeep: { enemies: ['thornwolf', 'sporejelly'], animals: ['deer', 'rabbit'], sea: ['conger', 'conger', 'thornray'] },
  saltwind: { enemies: ['crab', 'brinejelly'], animals: ['rabbit'], sea: ['conger', 'thornray', 'lionsmane'] },
  redstone: { enemies: ['dustwolf', 'redback'], animals: ['rabbit'], sea: ['porbeagle', 'thornray', 'lionsmane'] },
  starfall: { enemies: ['frostwolf', 'shardjelly'], animals: ['deer'], sea: ['blueshark', 'blueshark', 'porbeagle'] },
  // The outer lands
  gannet: { enemies: ['clifffox', 'cragboar', 'clifffox'], animals: ['sheep', 'rabbit'], sea: ['huss', 'conger', 'conger'] },
  wrath: { enemies: ['fenjelly', 'bogboar', 'fenjelly'], animals: ['rabbit'], sea: ['conger', 'thornray', 'lionsmane'] },
  tolmen: { enemies: ['moorwolf', 'graniteback', 'moorwolf'], animals: ['sheep', 'deer'], sea: ['blueshark', 'porbeagle'] },
  inkholm: { enemies: ['greyed', 'puffball', 'greyhog', 'greyed', 'gillcrab'], animals: ['rabbit'], sea: ['conger', 'thornray'] },
  kell: { enemies: ['cinderhound', 'ashcrawler', 'brassmite', 'cinderhound', 'ventjelly'], animals: ['rabbit'], sea: ['blueshark', 'porbeagle'] },
  // Morrow
  keys: { enemies: ['mangrovecrab', 'keylizard', 'reefjelly', 'keylizard', 'keywrecker'], animals: ['chicken'], sea: ['blueshark', 'thornray', 'lionsmane'] },
  glades: { enemies: ['gladelizard', 'glim', 'marshmoth', 'glim'], animals: ['rabbit'], sea: ['conger', 'thornray'] },
  amberwold: { enemies: ['lampmoth', 'amberlynx', 'leafback', 'amberlynx'], animals: ['deer', 'rabbit'], sea: ['conger'] },
  bright: { enemies: ['terracejackal', 'quarrybeetle', 'terracejackal', 'blackrunner'], animals: ['sheep', 'rabbit', 'chicken'], sea: ['huss', 'conger', 'porbeagle'] },
  sunder: { enemies: ['slabcrawler', 'liftmoth', 'riftwolf', 'liftmoth'], animals: ['deer'], sea: ['porbeagle'] },
  glassflats: { enemies: ['basilisk', 'glassback', 'saltreaver', 'glassback'], animals: ['rabbit'], sea: ['blueshark'] },
  greywaste: { enemies: ['wastehound', 'risen', 'fendamp', 'risen'], animals: ['rabbit'], sea: ['blueshark', 'porbeagle'] },
  held: { enemies: ['barrowwight', 'risen', 'barrowwight', 'felltroll'], animals: ['deer'], sea: ['blueshark'] },
};

export const ENEMY_SPAWNS: { type: EnemyType; x: number; z: number }[] = [
  // Haverwood
  { type: 'wolf', x: 236, z: 214 }, { type: 'wolf', x: 240, z: 218 }, { type: 'wolf', x: 262, z: 236 },
  { type: 'wolf', x: 266, z: 240 }, { type: 'wolf', x: 250, z: 262 }, { type: 'wolf', x: 228, z: 248 },
  // Lantern approach
  { type: 'wolf', x: 92, z: 236 }, { type: 'wolf', x: 84, z: 262 },
  { type: 'notch', x: 76, z: 252 },
  // Wetlings
  { type: 'jelly', x: 194, z: 232 }, { type: 'jelly', x: 202, z: 240 }, { type: 'jelly', x: 210, z: 236 },
  { type: 'jelly', x: 188, z: 244 }, { type: 'jelly', x: 214, z: 246 }, { type: 'jelly', x: 200, z: 250 },
  // Sallow Pit
  { type: 'rustback', x: 218, z: 104 }, { type: 'rustback', x: 230, z: 100 }, { type: 'rustback', x: 238, z: 90 },
  { type: 'rustback', x: 246, z: 96 }, { type: 'rustback', x: 236, z: 84 },
];

export const ANIMAL_SPAWNS: { kind: 'deer' | 'rabbit' | 'sheep' | 'chicken' | 'duck'; x: number; z: number; radius: number }[] = [
  // A pair of mallards on the Wend above the ford
  { kind: 'duck', x: 141.5, z: 150.5, radius: 5 }, { kind: 'duck', x: 142.5, z: 151.5, radius: 5 },
  { kind: 'deer', x: 214, z: 160, radius: 14 }, { kind: 'deer', x: 222, z: 168, radius: 14 }, { kind: 'deer', x: 120, z: 150, radius: 16 },
  { kind: 'deer', x: 280, z: 210, radius: 12 }, { kind: 'deer', x: 100, z: 200, radius: 12 },
  { kind: 'rabbit', x: 140, z: 160, radius: 10 }, { kind: 'rabbit', x: 110, z: 170, radius: 10 }, { kind: 'rabbit', x: 200, z: 150, radius: 10 },
  { kind: 'rabbit', x: 160, z: 220, radius: 8 }, { kind: 'rabbit', x: 230, z: 190, radius: 10 }, { kind: 'rabbit', x: 96, z: 130, radius: 10 },
  { kind: 'sheep', x: 119.5, z: 228.5, radius: 3.5 }, { kind: 'sheep', x: 120, z: 229, radius: 3.5 }, { kind: 'sheep', x: 121, z: 228, radius: 3.5 },
  { kind: 'sheep', x: 118, z: 230, radius: 3.5 }, { kind: 'sheep', x: 122, z: 231, radius: 3.5 },
  { kind: 'chicken', x: 150, z: 194, radius: 5 }, { kind: 'chicken', x: 152, z: 195, radius: 5 }, { kind: 'chicken', x: 194, z: 186, radius: 4 },
  { kind: 'chicken', x: 132, z: 186, radius: 4 },
];

// ------------------------------------------------------------- Regions (discovery)

export const REGIONS: { id: string; name: string; sub: string; x: number; z: number; r: number; y?: [number, number] }[] = [
  { id: 'fallsHollow', name: 'Behind Spill Falls', sub: 'Hidden place found', x: 94, z: 88, r: 6, y: [15, 22] },
  { id: 'pit', name: 'Sallow Pit', sub: 'Harrowgate & Daughters, upper gallery', x: 230, z: 100, r: 20, y: [20, 30] },
  { id: 'hollin', name: 'Hollin Ford', sub: 'Hollindale', x: 166, z: 184, r: 36 },
  { id: 'lantern', name: 'The Lantern', sub: 'Old signal tower', x: 68, z: 254, r: 14 },
  { id: 'mill', name: 'Gorse Mill', sub: 'Hollindale', x: 112, z: 206, r: 12 },
  { id: 'spill', name: 'Spill Falls', sub: 'Hollindale', x: 96, z: 106, r: 18 },
  { id: 'wetlings', name: 'The Wetlings', sub: 'Low fields', x: 200, z: 240, r: 22 },
  { id: 'haverwood', name: 'Haverwood', sub: 'Hollindale', x: 252, z: 238, r: 40 },
];

// Hollindale's own creatures and animals, placed by hand: the Counties only (world/land.ts)
countiesOnly(ENEMY_SPAWNS);
countiesOnly(ANIMAL_SPAWNS);

// The far places' rare mounts, now and then off the creatures of their country (data/content/mounts.ts)
for (const [type, item, chance] of MOUNT_DROPS) ENEMIES[type as EnemyType]?.loot.push({ item, chance });
