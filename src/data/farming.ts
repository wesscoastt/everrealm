import type { ItemDef } from './items';

// Farming, the old way (RuneScape's patches, with the Counties' own crops). Every player has their own
// crop in each patch: Hollin Ford's kitchen gardens, and a vegetable patch and an orchard patch on every
// town farm. A patch left alone goes to weed; rake it clean, plant a seed, add compost if you have it
// (more comes up), and the crop grows through its stages on the real clock, a few minutes for a root
// crop and hours for a tree. Harvest it for the produce, now and then a seed back. The produce goes into
// the hearth's new dishes, and the brewhouse and the vintners pay well for barley, hops and grapes.
// The patches and the growing are game/Farming.ts.

export type CropShape = 'root' | 'leafy' | 'grain' | 'berry' | 'bine' | 'squash' | 'tree' | 'vine';
export interface CropDef {
  id: string;
  name: string;
  level: number;
  /** The patch it goes in. */
  patch: 'allotment' | 'orchard';
  seed: string;
  produce: string;
  /** Real minutes to grow, seed to ripe. */
  minutes: number;
  xpPlant: number;
  /** For each one picked. */
  xpPick: number;
  /** How many come up: low and high (compost and level add to it). */
  yield: [number, number];
  shape: CropShape;
  colors: { leaf: string; fruit: string };
}

export const CROPS: CropDef[] = [
  { id: 'potato', name: 'Potatoes', level: 1, patch: 'allotment', seed: 'seed_potato', produce: 'potato', minutes: 10, xpPlant: 24, xpPick: 18, yield: [4, 7], shape: 'root', colors: { leaf: '#4a7a32', fruit: '#c8a060' } },
  { id: 'onion', name: 'Onions', level: 5, patch: 'allotment', seed: 'seed_onion', produce: 'onion', minutes: 12, xpPlant: 34, xpPick: 24, yield: [4, 7], shape: 'root', colors: { leaf: '#6a9a3a', fruit: '#c88a4a' } },
  { id: 'cabbage', name: 'Cabbages', level: 9, patch: 'allotment', seed: 'seed_cabbage', produce: 'cabbage', minutes: 15, xpPlant: 48, xpPick: 32, yield: [3, 6], shape: 'leafy', colors: { leaf: '#5a8a4a', fruit: '#8ab870' } },
  { id: 'carrot', name: 'Carrots', level: 13, patch: 'allotment', seed: 'seed_carrot', produce: 'carrot', minutes: 15, xpPlant: 60, xpPick: 38, yield: [4, 8], shape: 'root', colors: { leaf: '#5a9a2a', fruit: '#e07a2a' } },
  { id: 'wheat', name: 'Wheat', level: 17, patch: 'allotment', seed: 'seed_wheat', produce: 'wheat', minutes: 20, xpPlant: 76, xpPick: 44, yield: [5, 9], shape: 'grain', colors: { leaf: '#8a9a3a', fruit: '#d8b860' } },
  { id: 'strawberry', name: 'Strawberries', level: 22, patch: 'allotment', seed: 'seed_strawberry', produce: 'strawberries', minutes: 25, xpPlant: 96, xpPick: 56, yield: [4, 8], shape: 'berry', colors: { leaf: '#3f7a32', fruit: '#d8302a' } },
  { id: 'barley', name: 'Barley', level: 27, patch: 'allotment', seed: 'seed_barley', produce: 'barley', minutes: 25, xpPlant: 116, xpPick: 64, yield: [5, 9], shape: 'grain', colors: { leaf: '#9aa04a', fruit: '#c8a858' } },
  { id: 'leek', name: 'Leeks', level: 32, patch: 'allotment', seed: 'seed_leek', produce: 'leek', minutes: 30, xpPlant: 140, xpPick: 76, yield: [4, 7], shape: 'leafy', colors: { leaf: '#4a8a5a', fruit: '#e8e8c8' } },
  { id: 'hops', name: 'Hops', level: 37, patch: 'allotment', seed: 'seed_hops', produce: 'hops', minutes: 35, xpPlant: 168, xpPick: 88, yield: [4, 8], shape: 'bine', colors: { leaf: '#4a7a2a', fruit: '#a8c870' } },
  { id: 'pumpkin', name: 'Pumpkins', level: 42, patch: 'allotment', seed: 'seed_pumpkin', produce: 'pumpkin', minutes: 40, xpPlant: 200, xpPick: 110, yield: [2, 5], shape: 'squash', colors: { leaf: '#4a7a32', fruit: '#e8801e' } },
  { id: 'apple', name: 'An apple tree', level: 48, patch: 'orchard', seed: 'sapling_apple', produce: 'apples', minutes: 120, xpPlant: 520, xpPick: 140, yield: [5, 9], shape: 'tree', colors: { leaf: '#4a8a3a', fruit: '#c83a2a' } },
  { id: 'pear', name: 'A pear tree', level: 58, patch: 'orchard', seed: 'sapling_pear', produce: 'pears', minutes: 150, xpPlant: 720, xpPick: 180, yield: [5, 9], shape: 'tree', colors: { leaf: '#5a8a3a', fruit: '#c8c050' } },
  { id: 'grape', name: 'A grape vine', level: 68, patch: 'orchard', seed: 'cutting_vine', produce: 'grapes', minutes: 180, xpPlant: 980, xpPick: 230, yield: [6, 10], shape: 'vine', colors: { leaf: '#3f6a2a', fruit: '#4a2a4a' } },
];
export const CROP = (id: string) => CROPS.find((c) => c.id === id);

/** Minutes a cleared, empty patch takes to go back to weed (a level each). */
export const WEED_MINUTES = 12;
/** Raking a level of weeds. */
export const RAKE_XP = 6;

const seed = (id: string, name: string, a: string, value: number, desc: string): ItemDef =>
  ({ id, name, kind: 'material', rarity: 'common', stack: true, value, icon: { shape: 'ore', a, b: '#6a4a2a' }, desc, stats: 'Plant it in a patch (Farming).' });
const produce = (id: string, name: string, a: string, value: number, desc: string, heal = 0): ItemDef =>
  ({ id, name, kind: heal ? 'food' : 'material', rarity: 'common', stack: true, value, icon: { shape: heal ? 'bread' : 'gel', a }, desc, ...(heal ? { heal, stats: `Restores ${heal} health.` } : {}) });
const dish = (id: string, name: string, a: string, value: number, heal: number, buff: ItemDef['buff'], desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'uncommon', stack: true, value, icon: { shape: 'cooked', a }, heal, buff, desc, stats });

export const FARM_ITEMS: ItemDef[] = [
  seed('seed_potato', 'Seed potatoes', '#c8a060', 2, 'Last year\'s small ones, kept back. Every one with an eye.'),
  seed('seed_onion', 'Onion sets', '#c88a4a', 3, 'Little onions, to grow into bigger onions. Farming is not complicated. Farming is hard.'),
  seed('seed_cabbage', 'Cabbage seed', '#8ab870', 4, 'A twist of paper of round brown seeds.'),
  seed('seed_carrot', 'Carrot seed', '#e07a2a', 5, 'Fine as dust. Sow it on a still day.'),
  seed('seed_wheat', 'Seed wheat', '#d8b860', 6, 'A bag of good grain kept back from the mill.'),
  seed('seed_strawberry', 'Strawberry runners', '#d8302a', 9, 'Young plants, rooted, in a damp cloth.'),
  seed('seed_barley', 'Seed barley', '#c8a858', 10, 'Two-row barley, the kind the brewers want.'),
  seed('seed_leek', 'Leek seedlings', '#4a8a5a', 12, 'A bundle of them, thin as pencils.'),
  seed('seed_hops', 'Hop rhizomes', '#a8c870', 16, 'Cut roots from a hop garden. They\'ll climb anything.'),
  seed('seed_pumpkin', 'Pumpkin seed', '#e8801e', 20, 'From the Wend valley\'s own pumpkins, off a Morrow ship six years back.'),
  seed('sapling_apple', 'Apple sapling', '#c83a2a', 60, 'A whip of a young tree with its roots in a sack.'),
  seed('sapling_pear', 'Pear sapling', '#c8c050', 90, 'A young pear on quince roots. It will want staking.'),
  seed('cutting_vine', 'Vine cutting', '#4a2a4a', 130, 'A cutting from Corlett\'s low rows, rooted over the winter.'),
  { id: 'compost', name: 'Compost', kind: 'material', rarity: 'common', stack: true, value: 2, icon: { shape: 'ore', a: '#4a3a2a', b: '#6a5a3a' }, desc: 'Rotted down and dug in, it brings more up out of a patch.', stats: 'Use on a planted patch: more comes up.' },
  produce('potato', 'Potato', '#c8a060', 2, 'Dug from your own patch, with the earth still on it.', 30),
  produce('onion', 'Onion', '#c88a4a', 3, 'It will make you cry, and then it will make dinner.'),
  produce('cabbage', 'Cabbage', '#8ab870', 4, 'Round and heavy and squeaks when you cut it.', 40),
  produce('carrot', 'Carrot', '#e07a2a', 4, 'Orange as a fox and about as straight.', 35),
  produce('wheat', 'Wheat', '#d8b860', 4, 'A sheaf\'s worth of ears. Bake it into bread at a hearth.'),
  produce('strawberries', 'Strawberries', '#d8302a', 6, 'A punnet of them, warm from the sun.', 50),
  produce('barley', 'Barley', '#c8a858', 6, 'Two-row barley. Matthias Garrow pays well for it.'),
  produce('leek', 'Leek', '#4a8a5a', 7, 'Long and white and sandy at the root.'),
  produce('hops', 'Hops', '#a8c870', 9, 'Papery green cones that smell of bitter beer. Matthias Garrow pays well for them.'),
  produce('apples', 'Apples', '#c83a2a', 8, 'Off your own tree.', 60),
  produce('pears', 'Pears', '#c8c050', 10, 'Ripe for about an hour, as pears are.', 70),
  produce('grapes', 'Grapes', '#4a2a4a', 14, 'A heavy bunch. The vintners at Corlett\'s and Fallow Hill pay well for them.', 40),
  dish('baked_potato', 'Baked potato', '#c8a060', 10, 90, undefined, 'In its jacket from the hearth\'s ashes, with salt.', 'Restores 90 health.'),
  dish('onion_soup', 'Onion soup', '#c88a4a', 18, 140, { slot: 'food', regen: 0.08, mins: 30 }, 'Brown onions, slow, and a crust of bread floating in it.', 'Restores 140 health; stamina back a twelfth faster for half an hour.'),
  dish('farm_stew', 'Cabbage and potato stew', '#8a9a5a', 26, 210, { slot: 'food', hp: 0.08, mins: 30 }, 'What every farm in the Counties eats on a Tuesday, and most other days.', 'Restores 210 health; a twelfth more health for half an hour.'),
  dish('leek_pie', 'Leek and potato pie', '#d8c890', 36, 270, { slot: 'food', hp: 0.1, mins: 30 }, 'Under a lid of pastry, the leeks gone soft and sweet.', 'Restores 270 health; a tenth more health for half an hour.'),
  dish('pumpkin_pie', 'Pumpkin pie', '#e8901e', 40, 300, { slot: 'food', regen: 0.15, mins: 30 }, 'Spiced the Morrow way, which the Wend valley pretends it thought of.', 'Restores 300 health; stamina back a seventh faster for half an hour.'),
  dish('apple_pie', 'Apple pie', '#c8803a', 46, 330, { slot: 'food', hp: 0.12, mins: 30 }, 'Your own apples under a crust. Better than anyone else\'s. Everyone says so about their own.', 'Restores 330 health; an eighth more health for half an hour.'),
  dish('pear_tart', 'Pear tart', '#d8c060', 54, 360, { slot: 'food', regen: 0.18, mins: 30 }, 'Pears in a ring on a short crust, glazed.', 'Restores 360 health; stamina back a fifth faster for half an hour.'),
];

/** The hearth's dishes from a patch's produce (merged into RECIPES in data/gameplay.ts). */
export const FARM_RECIPES = [
  { id: 'baked_potato', station: 'hearth', skill: 'cooking', level: 3, xp: 30, inputs: { potato: 1 }, output: 'baked_potato', count: 1, time: 1.8, failAtReq: 0.3, failItem: 'burnt_fish' },
  { id: 'farm_bread', station: 'hearth', skill: 'cooking', level: 10, xp: 50, inputs: { wheat: 3 }, output: 'bread', count: 2, time: 2.2, failAtReq: 0.3, failItem: 'burnt_fish' },
  { id: 'onion_soup', station: 'hearth', skill: 'cooking', level: 12, xp: 70, inputs: { onion: 2, bread: 1 }, output: 'onion_soup', count: 1, time: 2.2, failAtReq: 0.35, failItem: 'burnt_fish' },
  { id: 'farm_stew', station: 'hearth', skill: 'cooking', level: 20, xp: 120, inputs: { cabbage: 1, potato: 2, onion: 1 }, output: 'farm_stew', count: 1, time: 2.4, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'strawberry_tart', station: 'hearth', skill: 'cooking', level: 26, xp: 150, inputs: { strawberries: 3, bread: 1 }, output: 'strawberry_tart', count: 1, time: 2.4, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'leek_pie', station: 'hearth', skill: 'cooking', level: 34, xp: 200, inputs: { leek: 2, potato: 1, wheat: 1 }, output: 'leek_pie', count: 1, time: 2.6, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'pumpkin_pie', station: 'hearth', skill: 'cooking', level: 44, xp: 260, inputs: { pumpkin: 1, wheat: 2 }, output: 'pumpkin_pie', count: 1, time: 2.8, failAtReq: 0.45, failItem: 'burnt_fish' },
  { id: 'apple_pie', station: 'hearth', skill: 'cooking', level: 52, xp: 320, inputs: { apples: 3, wheat: 2 }, output: 'apple_pie', count: 1, time: 2.8, failAtReq: 0.5, failItem: 'burnt_fish' },
  { id: 'pear_tart', station: 'hearth', skill: 'cooking', level: 62, xp: 400, inputs: { pears: 3, wheat: 1 }, output: 'pear_tart', count: 1, time: 3, failAtReq: 0.5, failItem: 'burnt_fish' },
] as const;
