import type { ItemDef } from './items';

// Farming, part two (docs/briefs/farming-cozy.md, owner 2026-11-14: "farming and gardening should be in depth like cozy
// games"). Sprinklers that keep the beds round them wet, crops that bear again after the first picking, three
// fertilisers that each do one thing well, and a compost heap at home that turns spare produce into compost on the real
// clock. The working of them is game/HomeFarm.ts.

/** Sprinklers, best first: how many tiles every way round them they keep wet. */
export const SPRINKLERS: { item: string; reach: number }[] = [
  { item: 'sprinkler_silver', reach: 3 },
  { item: 'sprinkler_iron', reach: 2 },
  { item: 'sprinkler_bronze', reach: 1 },
];
export const SPRINKLER_REACH: Record<string, number> = Object.fromEntries(SPRINKLERS.map((s) => [s.item, s.reach]));

/** Crops that keep bearing: where they start again after a picking (0 to 1), and how many pickings in all. */
export const REGROW: Record<string, { back: number; picks: number }> = {
  strawberry: { back: 0.5, picks: 4 },
  peas: { back: 0.6, picks: 3 },
  beans: { back: 0.55, picks: 4 },
  tomato: { back: 0.55, picks: 4 },
  peppers: { back: 0.55, picks: 4 },
  raspberry: { back: 0.5, picks: 5 },
  rhubarb: { back: 0.45, picks: 3 },
  herbs: { back: 0.6, picks: 5 },
};

/** The fertilisers: a tile takes one between plantings (or pickings), and it does one thing. */
export type Feed = 'bone' | 'ash' | 'weed';
export const FEEDS: Record<Feed, { item: string; name: string; does: string }> = {
  bone: { item: 'bone_meal', name: 'bone meal', does: 'more of it comes up fine or prize' },
  ash: { item: 'wood_ash', name: 'wood ash', does: 'it grows a quarter faster' },
  weed: { item: 'seaweed_feed', name: 'seaweed', does: 'the ground holds its wet twice as long, and dry it still grows at three-quarter speed' },
};

/** The compost heap: a load is three of your spare produce, ready as two compost after ninety minutes. */
export const HEAP = { per: 3, gives: 2, mins: 90, most: 6 };

const tool = (id: string, name: string, a: string, b: string, rarity: ItemDef['rarity'], value: number, desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity, stack: false, value, icon: { shape: 'gel', a, b }, desc, stats });
const feed = (id: string, name: string, a: string, b: string, value: number, desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'material', rarity: 'common', stack: true, value, icon: { shape: 'ore', a, b }, desc, stats });

export const FARM_TWO_ITEMS: ItemDef[] = [
  tool('sprinkler_bronze', 'Bronze sprinkler', '#b8803a', '#6a4a24', 'uncommon', 140,
    'A squat bronze head on a spike, with four holes drilled at an angle. Bertram swears by them and then swears at them when they clog.',
    'Set it in your own yard (Farming): the tilled tiles next to it, all eight, stay wet. Take it up again whenever you like.'),
  tool('sprinkler_iron', 'Iron sprinkler', '#8a8a92', '#3a3a42', 'rare', 420,
    'A turning head on a cast-iron stand. It ticks round all day and throws the water two tiles out.',
    'Set it in your own yard (Farming): every tilled tile within two of it stays wet.'),
  tool('sprinkler_silver', 'Silver sprinkler', '#d8dce4', '#6a6a72', 'epic', 1400,
    'Silver-plated, with a fine rose that turns the water to mist. Show gardeners keep one, mostly to be seen keeping one.',
    'Set it in your own yard (Farming): every tilled tile within three of it stays wet.'),
  tool('compost_heap', 'Compost heap', '#6a4a2a', '#3a2a1a', 'uncommon', 120,
    'Slatted oak boards and four corner posts, sold flat. Put together, it takes peelings, tops and anything too sorry to sell.',
    'Build it in your own yard (Farming). Put in three of your spare produce at a time; ninety minutes later it gives two compost.'),
  feed('bone_meal', 'Bone meal', '#e8e0c8', '#b8ac90', 6,
    'Ground bone in a paper sack. It smells of a butcher\'s yard and it puts heart into a crop.',
    'Dig it into a growing tile: more of it comes up fine or prize.'),
  feed('wood_ash', 'Wood ash', '#a8a8a0', '#5a5a58', 3,
    'Raked out of a hearth and sieved. Potash, the old gardeners call it.',
    'Dig it into a growing tile: it grows a quarter faster.'),
  feed('seaweed_feed', 'Seaweed', '#3a6a4a', '#1e3a2a', 5,
    'Wrack from the Saltwind shore, dried and chopped. It holds water like a sponge.',
    'Dig it into a growing tile: the ground holds its wet twice as long, and dry it still grows at three-quarter speed.'),
];

export const FARM_TWO_RECIPES = [
  { id: 'sprinkler_bronze', station: 'anvil', skill: 'smithing', level: 12, xp: 90, inputs: { bronze_bar: 2, iron_bar: 1 }, output: 'sprinkler_bronze', count: 1, time: 3 },
  { id: 'sprinkler_iron', station: 'anvil', skill: 'smithing', level: 30, xp: 220, inputs: { iron_bar: 4, bronze_bar: 1 }, output: 'sprinkler_iron', count: 1, time: 3.6 },
  { id: 'sprinkler_silver', station: 'anvil', skill: 'smithing', level: 50, xp: 480, inputs: { silver_bar: 3, iron_bar: 3 }, output: 'sprinkler_silver', count: 1, time: 4 },
  { id: 'wood_ash', station: 'hearth', skill: 'farming', level: 5, xp: 12, inputs: { oak_logs: 1 }, output: 'wood_ash', count: 3, time: 1.6 },
  { id: 'bone_meal', station: 'bench', skill: 'farming', level: 18, xp: 30, inputs: { jawbones: 1 }, output: 'bone_meal', count: 4, time: 2 },
] as const;
