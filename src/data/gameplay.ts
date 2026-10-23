import type { CreatureKind, Palette } from '../entities/creatures';
import type { Appearance, HeldItem } from '../entities/humanoid';
import { ARMOUR_SMITHING } from './armour';
import { WEAPON_SMITHING } from './weapons';
import type { RegionId } from '../world/terrain';
import { SkillId } from './items';

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

/** Total XP needed to reach a level. Gentle early, steep late; level 100 is about 1.1M XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.round(55 * Math.pow(n, 2.15) + 45 * n);
}

export function levelForXp(xp: number): number {
  let lv = 1;
  while (lv < MAX_LEVEL && xp >= xpForLevel(lv + 1)) lv++;
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
  | 'dg_rustback' | 'dg_hatchling' | 'dg_seep' | 'dg_nightman' | 'dg_coll' | 'dg_sump' | 'dg_verdigris'
  | 'dg_brack' | 'dg_millstone' | 'dg_glim';

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
  attack: 'lunge' | 'slam' | 'charge';
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
  r_brindle: { type: 'r_brindle', model: 'wolf', palette: { a: '#6a5040', b: '#3a2a20', c: '#b8a080' }, scale: 1.4, name: 'Old Brindle', level: 7, hp: 380, damage: 16, speed: 5.8, aggro: 16, leash: 40, attack: 'lunge', windup: 0.5, range: 2.8, cooldown: 1.5, xp: 300, elite: true, loot: [{ item: 'brindle_tail', chance: 1 }, { item: 'tmap_greenwake_1', chance: 0.5 }, { item: 'tmap_greenwake_2', chance: 0.5 }, { item: 'wolfskin_hood', chance: 0.3 }], marks: [15, 25], respawn: 99999 },
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
