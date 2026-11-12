import type { ItemDef } from './items';
import type { Recipe } from './gameplay';

// The household furniture (owner 2026-11-07: "make more furniture props to use in the MMO"). Twenty pieces, drawn in
// world/furnishings.ts: most made at a joiner's bench (Woodcutting) or an anvil (Smithing), a few bought at the general
// store. Set them down at home with Arrange the furniture; the armchair and the settle can be sat in.

const STATS = 'Furniture: set it down in a house of your own';
const F = (id: string, name: string, model: string, value: number, rarity: ItemDef['rarity'], a: string, b: string, desc: string, tint = 0): ItemDef =>
  ({ id, name, kind: 'collectible', rarity, stack: true, value, icon: { shape: 'log', a, b }, desc, stats: STATS, furn: { model, tint } });

export const FURNISHING_ITEMS: ItemDef[] = [
  F('furn_wardrobe', 'Oak wardrobe', 'f_wardrobe', 70, 'uncommon', '#8a6440', '#5a3c24', 'Two panelled doors and a cornice. Big enough to hang a winter’s clothes in, or hide in, which is what children use them for.'),
  F('furn_bookcase', 'Bookcase', 'f_bookcase', 60, 'uncommon', '#5a3c24', '#7a2a24', 'Five shelves, filled. Most of the books were bought by the yard. A few were read.'),
  F('furn_armchair_red', 'Wing armchair, red', 'f_armchair', 90, 'uncommon', '#7a2a24', '#5a3c24', 'A deep seat with wings to keep the draught off your ears. The kind of chair a cat claims in the first hour.', 0),
  F('furn_armchair_blue', 'Wing armchair, blue', 'f_armchair', 90, 'uncommon', '#2a4a6a', '#5a3c24', 'A deep seat with wings to keep the draught off your ears. The kind of chair a cat claims in the first hour.', 1),
  F('furn_settle', 'High-backed settle', 'f_settle', 40, 'common', '#5a3c24', '#7a2a24', 'A bench with a back as tall as a door, built to stand by the fire and keep the cold off whoever sits there.'),
  F('furn_roundtable', 'Round table', 'f_roundtable', 34, 'common', '#8a6440', '#d0aa78', 'Oak, on a single post and three feet. Nobody sits at the head of a round table, which is the point of it.'),
  F('furn_washstand', 'Washstand', 'f_washstand', 30, 'common', '#8a6440', '#e8e0d0', 'A bowl, a jug, a towel on the rail and a cake of soap underneath. Cold water, every morning.'),
  F('furn_cradle', 'Rocking cradle', 'f_cradle', 36, 'common', '#8a6440', '#e8e0d0', 'A hooded cradle on rockers. One push from a foot and it rocks for a long time.'),
  F('furn_coatrack', 'Coat stand', 'f_coatrack', 16, 'common', '#5a3c24', '#2a2420', 'Four pegs at the top. Somebody always leaves a hat on it.'),
  F('furn_plant', 'Potted fern', 'f_plant', 12, 'common', '#4a7a3a', '#3a6a8a', 'A fern in a blue glazed pot. It wants shade and water and no attention, like most people.'),
  F('furn_candelabra', 'Standing candelabra', 'f_candelabra', 55, 'uncommon', '#3a3a3e', '#ffd080', 'Black iron, three arms and five candles, as tall as your chest. Light enough to read by in the far corner of a room.'),
  F('furn_bathtub', 'Copper bath', 'f_bathtub', 160, 'rare', '#b8683a', '#c8a050', 'A slipper bath in beaten copper on brass feet. It takes six kettles to fill and an hour to cool, and it is worth both.'),
  F('furn_spinning', 'Spinning wheel', 'f_spinning', 45, 'uncommon', '#8a6440', '#e8dcc0', 'A treadle, a wheel, a flyer. Wool goes in one end and yarn comes out the other, if you have patience.'),
  F('furn_weaponrack', 'Weapon rack', 'f_weaponrack', 75, 'uncommon', '#5a3c24', '#9aa0a8', 'Two spears, a sword and a painted shield, racked against the wall. Your visitors will mind their manners.'),
  F('furn_armourstand', 'Armour stand', 'f_armourstand', 120, 'rare', '#9aa0a8', '#3a3a3e', 'A mail shirt and a helm on a wooden frame, gauntlets at its feet. It stands guard while you sleep.'),
  F('furn_cupboard', 'Pie safe', 'f_cupboard', 40, 'common', '#8a6440', '#a8a8a0', 'A cupboard on legs with punched tin in its doors, so the pies breathe and the flies don’t get in.'),
  F('furn_sideboard', 'Sideboard', 'f_sideboard', 65, 'uncommon', '#5a3c24', '#c8a050', 'Three drawers over three doors, brass handles, two candlesticks and a bowl of fruit on top. For the good plates.'),
  F('furn_bunk', 'Bunk beds', 'f_bunk', 80, 'uncommon', '#5a3c24', '#e8e0d0', 'Two beds, one over the other, and a ladder up the end. Whoever sleeps on top always wins the argument.'),
  F('furn_bureau', 'Writing bureau', 'f_bureau', 85, 'uncommon', '#5a3c24', '#e8e0d0', 'A desk with a slope that lets down to write on, pigeonholes for letters, and a drawer that sticks.'),
  F('furn_logbasket', 'Log basket', 'f_logbasket', 10, 'common', '#9a7a4a', '#6e4a2c', 'Split logs and a bundle of kindling. Keep it by the hearth and you will never go out in the rain for wood.'),
  F('furn_globe', 'Globe on a stand', 'f_globe', 140, 'rare', '#3a6a8a', '#c8a050', 'The known world in paper on a ball, a brass ring round it, on a turned stand. The edges are guesswork. The mapmaker admits it in small print.'),
];

const J = (id: string, level: number, xp: number, inputs: Record<string, number>, output: string, time = 3): Recipe =>
  ({ id, station: 'bench', skill: 'woodcutting', level, xp, inputs, output, count: 1, time });
const S = (id: string, level: number, xp: number, inputs: Record<string, number>, output: string, time = 3.4): Recipe =>
  ({ id, station: 'anvil', skill: 'smithing', level, xp, inputs, output, count: 1, time });

export const FURNISHING_RECIPES: Recipe[] = [
  J('j_logbasket', 2, 14, { birch_logs: 2 }, 'furn_logbasket', 2),
  J('j_coatrack', 4, 22, { oak_logs: 2 }, 'furn_coatrack', 2.2),
  J('j_roundtable', 6, 34, { oak_logs: 4 }, 'furn_roundtable'),
  J('j_settle', 9, 48, { oak_logs: 4, wool: 1 }, 'furn_settle'),
  J('j_washstand', 10, 50, { birch_logs: 3, oak_logs: 1 }, 'furn_washstand'),
  J('j_cradle', 11, 56, { birch_logs: 3, wool: 1 }, 'furn_cradle'),
  J('j_cupboard', 12, 62, { pine_logs: 3, iron_bar: 1 }, 'furn_cupboard'),
  J('j_spinning', 13, 68, { birch_logs: 4, oak_logs: 1 }, 'furn_spinning', 3.4),
  J('j_armchair_red', 14, 80, { pine_logs: 3, wool: 2 }, 'furn_armchair_red', 3.6),
  J('j_armchair_blue', 14, 80, { pine_logs: 3, wool: 2 }, 'furn_armchair_blue', 3.6),
  J('j_wardrobe', 15, 90, { oak_logs: 6, bronze_bar: 1 }, 'furn_wardrobe', 4),
  J('j_bookcase', 16, 95, { birch_logs: 4, oak_logs: 3 }, 'furn_bookcase', 4),
  J('j_sideboard', 17, 100, { pine_logs: 4, bronze_bar: 1 }, 'furn_sideboard', 4),
  J('j_bunk', 18, 110, { pine_logs: 6, wool: 2 }, 'furn_bunk', 4.2),
  J('j_bureau', 20, 125, { pine_logs: 5, bronze_bar: 1 }, 'furn_bureau', 4.4),
  S('s_candelabra', 10, 60, { iron_bar: 2 }, 'furn_candelabra'),
  S('s_weaponrack', 16, 110, { iron_bar: 3, oak_logs: 2 }, 'furn_weaponrack', 4),
  S('s_armourstand', 22, 170, { iron_bar: 5, oak_logs: 1 }, 'furn_armourstand', 5),
  S('s_bathtub', 24, 190, { bronze_bar: 8 }, 'furn_bathtub', 5),
];

/** What the general store keeps of them: the small things, and the globe, which nobody here could make. */
export const FURNISHING_STOCK: { item: string; price: number }[] = [
  { item: 'furn_plant', price: 18 }, { item: 'furn_coatrack', price: 24 }, { item: 'furn_logbasket', price: 15 },
  { item: 'furn_washstand', price: 45 }, { item: 'furn_globe', price: 260 },
];
