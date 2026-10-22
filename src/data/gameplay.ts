import type { CreatureKind, Palette } from '../entities/creatures';
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
    { level: 1, text: 'Strike, Cleave and your calling\'s three skills' },
    { level: 5, text: '+10% damage (applied per level)' },
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

export const ORE_INFO = {
  copper: { item: 'copper_ore', level: 1, xp: 22, respawn: 22, name: 'Copper deposit' },
  tin: { item: 'tin_ore', level: 1, xp: 22, respawn: 22, name: 'Tin deposit' },
  silver: { item: 'silver_ore', level: 10, xp: 60, respawn: 70, name: 'Silver seam' },
  iron: { item: 'iron_ore', level: 15, xp: 75, respawn: 45, name: 'Iron deposit' },
  crystal: { item: 'star_crystal', level: 30, xp: 150, respawn: 120, name: 'Star crystal' },
} as const;

export const TREE_INFO = {
  oak: { item: 'oak_logs', level: 1, xp: 25, respawn: 45, name: 'Oak' },
  birch: { item: 'birch_logs', level: 3, xp: 32, respawn: 50, name: 'Birch' },
  pine: { item: 'pine_logs', level: 7, xp: 45, respawn: 60, name: 'Pine' },
  moot: { item: 'oak_logs', level: 99, xp: 0, respawn: 0, name: 'The Moot Oak' },
  giant: { item: 'elder_logs', level: 20, xp: 90, respawn: 120, name: 'Elder oak' },
  // Hagworm's ancients: not for felling (level out of reach, like the Moot Oak)
  ancient: { item: 'elder_logs', level: 99, xp: 0, respawn: 0, name: 'Ancient oak' },
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
  { id: 'iron_bar', station: 'furnace', skill: 'smithing', level: 15, xp: 50, inputs: { iron_ore: 2 }, output: 'iron_bar', count: 1, time: 2.2 },
  { id: 'iron_pickaxe', station: 'anvil', skill: 'smithing', level: 18, xp: 110, inputs: { iron_bar: 2 }, output: 'iron_pickaxe', count: 1, time: 3.2 },
  { id: 'iron_hatchet', station: 'anvil', skill: 'smithing', level: 17, xp: 80, inputs: { iron_bar: 1 }, output: 'iron_hatchet', count: 1, time: 3 },
  { id: 'iron_sword', station: 'anvil', skill: 'smithing', level: 20, xp: 130, inputs: { iron_bar: 3 }, output: 'iron_sword', count: 1, time: 3.4 },
  { id: 'cooked_minnow', station: 'hearth', skill: 'cooking', level: 1, xp: 15, inputs: { raw_minnow: 1 }, output: 'cooked_minnow', count: 1, time: 1.4, failAtReq: 0.35, failItem: 'burnt_fish' },
  { id: 'cooked_trout', station: 'hearth', skill: 'cooking', level: 5, xp: 38, inputs: { raw_trout: 1 }, output: 'cooked_trout', count: 1, time: 1.8, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'cooked_mackerel', station: 'hearth', skill: 'cooking', level: 8, xp: 50, inputs: { raw_mackerel: 1 }, output: 'cooked_mackerel', count: 1, time: 1.8, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'cooked_seabass', station: 'hearth', skill: 'cooking', level: 15, xp: 90, inputs: { raw_seabass: 1 }, output: 'cooked_seabass', count: 1, time: 2.2, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'cooked_char', station: 'hearth', skill: 'cooking', level: 25, xp: 150, inputs: { raw_char: 1 }, output: 'cooked_char', count: 1, time: 2.4, failAtReq: 0.45, failItem: 'burnt_fish' },
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
];

// ------------------------------------------------------------- Enemies

export type EnemyType = 'wolf' | 'notch' | 'jelly' | 'rustback' | 'boar' | 'roadwolf' | 'thornwolf' | 'sporejelly' | 'crab' | 'brinejelly' | 'dustwolf' | 'redback' | 'frostwolf' | 'shardjelly' | 'rustqueen' | 'oldglass'
  | 'bramblemaw' | 'tidewright' | 'cinderhorn' | 'rimeglass' | 'shardwarden' | 'keelglass'
  | 'huss' | 'conger' | 'thornray' | 'lionsmane' | 'porbeagle' | 'blueshark' | 'bellmane' | 'sexton'
  | 'clifffox' | 'cragboar' | 'fenjelly' | 'bogboar' | 'moorwolf' | 'graniteback';

export interface EnemyDef {
  type: EnemyType;
  /** Body plan and colours; defaults to the type name. */
  model?: CreatureKind;
  palette?: Palette;
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
  tidewright: { type: 'tidewright', model: 'rustback', palette: { a: '#7a2414', b: '#f08a4a' }, scale: 3.6, name: 'The Tidewright', level: 20, hp: 6400, damage: 38, speed: 3.8, aggro: 22, leash: 60, attack: 'charge', windup: 0.9, range: 12, cooldown: 2.6, xp: 2100, elite: true, loot: [{ item: 'brine_cutlass', chance: 0.35 }, { item: 'oilskin_hat', chance: 0.35 }, { item: 'crab_shell', chance: 1, min: 4, max: 4 }], marks: [55, 85], respawn: 99999 },
  cinderhorn: { type: 'cinderhorn', model: 'boar', palette: { a: '#5a1e10', b: '#d0582a', c: '#f0c070' }, scale: 3.6, name: 'Cinderhorn', level: 23, hp: 7200, damage: 42, speed: 4.6, aggro: 22, leash: 60, attack: 'charge', windup: 0.8, range: 12, cooldown: 2.4, xp: 2600, elite: true, loot: [{ item: 'harrow_cleaver', chance: 0.35 }, { item: 'redback_helm', chance: 0.35 }, { item: 'halter_ember', chance: 0.2 }, { item: 'iron_ore', chance: 1, min: 5, max: 5 }], marks: [60, 95], respawn: 99999 },
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

export const ANIMAL_SPAWNS: { kind: 'deer' | 'rabbit' | 'sheep' | 'chicken'; x: number; z: number; radius: number }[] = [
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
