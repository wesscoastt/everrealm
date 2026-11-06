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
  /** When it does best (the real calendar): half as fast again in its season. */
  season?: Season;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
/** The season now, by the real calendar (the Counties keep the northern year). */
export function seasonNow(d = new Date()): Season { const m = d.getMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
/** How fast a crop grows now: half as fast again in its own season. */
export const seasonRate = (c: CropDef, now = new Date()) => (c.season && c.season === seasonNow(now) ? 1.5 : 1);
/** The season a crop does best in, for what's said of it. */
const SEASON_OF: Record<string, Season> = { potato: 'spring', onion: 'spring', cabbage: 'winter', carrot: 'autumn', wheat: 'summer', strawberry: 'summer', barley: 'summer', leek: 'winter', hops: 'autumn', pumpkin: 'autumn', apple: 'autumn', pear: 'autumn', grape: 'summer' };

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
for (const c of CROPS) c.season = SEASON_OF[c.id];
export const CROP = (id: string) => CROPS.find((c) => c.id === id);

/**
 * Bertram's order book: three orders a day from the town (the inn, the brewer, the baker), each a quantity of
 * something grown or kept, paid well over the shop price and in Farming as well. Who wants what is the same for
 * everyone on a given day.
 */
export interface FarmOrder { i: number; item: string; n: number; marks: number; xp: number; who: string }
const ORDER_GOODS = ['potato', 'onion', 'cabbage', 'carrot', 'wheat', 'strawberries', 'barley', 'leek', 'hops', 'pumpkin', 'egg', 'milk', 'fleece'];
const ORDER_WHO = ['the Lantern inn', 'the brewhouse', 'the baker on the green', 'the Ansbury cooks', 'a carter with a long road ahead', 'the Charter kitchens'];
export function ordersToday(d = new Date()): FarmOrder[] {
  const day = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
  const r = (k: number) => { const v = Math.sin(day * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  const out: FarmOrder[] = [];
  for (let i = 0; i < 3; i++) {
    let item = ORDER_GOODS[Math.floor(r(i * 3) * ORDER_GOODS.length)];
    while (out.some((o) => o.item === item)) item = ORDER_GOODS[(ORDER_GOODS.indexOf(item) + 1) % ORDER_GOODS.length];
    const n = 6 + Math.floor(r(i * 3 + 1) * 13);
    const worth = item === 'egg' ? 3 : item === 'milk' ? 4 : item === 'fleece' ? 14 : 4 + ORDER_GOODS.indexOf(item) * 2;
    out.push({ i, item, n, marks: Math.round(worth * n * 2.5 + 20), xp: Math.round(worth * n * 6 + 40), who: ORDER_WHO[Math.floor(r(i * 3 + 2) * ORDER_WHO.length)] });
  }
  return out;
}

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
  // the garden at home (game/HomeFarm.ts)
  { id: 'stock_hens', name: 'Hen coop and three hens', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'egg', a: '#e8dcc0', b: '#8a5a32' }, desc: 'A coop on legs, a ramp, a nesting box, and three brown hens who already have opinions about you.', stats: 'Set it up in your own yard (Farming). Fed grain, they lay eggs for three hours.' },
  { id: 'stock_ewes', name: 'A pair of ewes', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'pelt', a: '#e8e2d2', b: '#6a5a4a' }, desc: 'Two Moor ewes and a trough. They come with names, which Bertram will not tell you.', stats: 'Pen them in your own yard (Farming). Fed grain, a fleece now and then for the tailors.' },
  { id: 'stock_cow', name: 'A dairy cow', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'pelt', a: '#3a2a20', b: '#e8e2d2' }, desc: 'A red-and-white milker with a calm eye and a bell. She has seen everything and she is not impressed.', stats: 'Tether her in your own yard (Farming). Fed grain, she gives milk for three hours.' },
  { id: 'egg', name: 'Fresh egg', kind: 'food', rarity: 'common', stack: true, value: 3, icon: { shape: 'egg', a: '#e8d8b8' }, heal: 12, desc: 'Brown, still warm, with a feather stuck to it.', stats: 'Restores 12 health; the hearth makes better of it.' },
  { id: 'milk', name: 'Milk', kind: 'food', rarity: 'common', stack: true, value: 4, icon: { shape: 'bottle', a: '#f4f0e4' }, heal: 16, desc: 'A stoneware jug of it, the cream risen to the top.', stats: 'Restores 16 health; the hearth makes butter and cheese of it.' },
  { id: 'fleece', name: 'Fleece', kind: 'material', rarity: 'common', stack: true, value: 14, icon: { shape: 'pelt', a: '#e8e2d2', b: '#c8c0a8' }, desc: 'A whole fleece, greasy and warm. The tailors card it and spin it.', stats: 'Sells to tailors and weavers; spun into cloth.' },
  { id: 'hoe', name: 'Hoe', kind: 'tool', rarity: 'common', stack: false, value: 24, icon: { shape: 'pick', a: '#8a8a8a', b: '#6a4a2a' }, desc: 'An iron blade on an ash handle, set at the angle that saves your back. Bertram says. Nothing saves your back.', stats: 'Tills the ground round your own house into a garden, a tile at a time (Farming).' },
  { id: 'watering_can_copper', name: 'Copper watering can', kind: 'tool', rarity: 'uncommon', stack: false, value: 120, icon: { shape: 'gel', a: '#c8743a', b: '#6a3a1e' }, desc: 'Beaten copper with a brass rose. It holds more and it holds it longer, and it does not leak, whatever Bertram says about character.', stats: 'Waters a tile and the planted tiles round it; the ground stays wet half an hour. (Your best can is the one used.)' },
  { id: 'watering_can_iron', name: 'Iron watering can', kind: 'tool', rarity: 'rare', stack: false, value: 420, icon: { shape: 'gel', a: '#8a8a92', b: '#3a3a42' }, desc: 'A big blackened can with a long spout and a wide rose. Two hands to lift it full. Waters a bed in one pass.', stats: 'Waters two tiles every way round the one you stand at; the ground stays wet half an hour.' },
  { id: 'watering_can_gilded', name: 'Gilded watering can', kind: 'tool', rarity: 'epic', stack: false, value: 1600, icon: { shape: 'gel', a: '#e0bd64', b: '#6a4a1e' }, desc: 'A prize can from the Ansbury show, gilt on copper, with the Charter seal stamped on the side. It waters like a summer shower.', stats: 'Waters three tiles every way round the one you stand at; the ground stays wet forty minutes.' },
  { id: 'show_rosette', name: 'Harvest Home rosette', kind: 'collectible', rarity: 'rare', stack: true, value: 0, icon: { shape: 'rosette', a: '#c8302a', b: '#e8c048' }, desc: 'Red ribbon in a ring, gold at the middle, "First Prize" stitched round it. Farmers keep these in a drawer and take them out when nobody is looking.' },
  { id: 'seed_drill', name: 'Seed drill', kind: 'tool', rarity: 'uncommon', stack: false, value: 200, icon: { shape: 'drill', a: '#8a6a3a', b: '#8a8a90' }, desc: 'A hopper on a wheel with three iron coulters behind it. Push it down a bed and the seed goes in at the right depth, a hand apart, without you bending once.', stats: 'Farming 25. Carried, planting a seed sows the empty tilled tiles round you too.' },
  { id: 'scythe', name: 'Scythe', kind: 'tool', rarity: 'uncommon', stack: false, value: 160, icon: { shape: 'hatchet', a: '#c8ccd2', b: '#6a4a2a' }, desc: 'A long curved blade on a snath of ash, with two grips. In good hands it takes a field in a morning. In bad hands it takes a shin.', stats: 'Harvests every ripe tile round the one you stand at in a few strokes.' },
  { id: 'watering_can', name: 'Watering can', kind: 'tool', rarity: 'common', stack: false, value: 36, icon: { shape: 'gel', a: '#7a8a7a', b: '#3a4a4a' }, desc: 'A galvanised can with a rose on the spout. It leaks a little at the seam, which Bertram calls a feature.', stats: 'Waters a tile and the planted tiles round it: wet ground grows at full speed, dry at half. Rain waters everything.' },
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
  // from the yard's animals (owner's farming list: "butter and cheese at the hearth, fleece spun")
  { ...dish('butter', 'Butter', '#f0d878', 9, 30, undefined, 'Churned from your own cow’s cream, salted, patted into a block with a thistle pressed on top.', 'Restores 30 health. Goes into a cook’s better dishes.'), icon: { shape: 'butter', a: '#f0d878' } },
  { ...dish('cheese', 'Farmhouse cheese', '#e8c860', 22, 110, { slot: 'food', hp: 0.06, mins: 30 }, 'A small round truckle, bound in cloth, sharp at the rind and soft in the middle.', 'Restores 110 health; a sixteenth more health for half an hour.'), icon: { shape: 'cheese', a: '#f0d070', b: '#e8e0c8' } },
  { ...dish('buttered_bread', 'Bread and butter', '#e8c890', 12, 80, undefined, 'Thick slices, the butter spread to the edges, the way a farm eats at four o’clock.', 'Restores 80 health.'), icon: { shape: 'breadbutter', a: '#f0d878' } },
  { ...dish('cheese_omelette', 'Cheese omelette', '#f0d070', 30, 230, { slot: 'food', regen: 0.1, mins: 30 }, 'Three of your eggs and a fistful of your own cheese, folded in the pan.', 'Restores 230 health; stamina back a tenth faster for half an hour.'), icon: { shape: 'omelette', a: '#f0d070', b: '#e8c048' } },
  { id: 'wool', name: 'Spun wool', kind: 'material', rarity: 'common', stack: true, value: 20, icon: { shape: 'yarn', a: '#ece6d6', b: '#b8b0a0' }, desc: 'A skein of it, spun from your own fleece at the bench: soft, a little greasy still, the colour of the ewe.' },
  { id: 'furn_wool_rug', name: 'Hearth rug of home-spun wool', kind: 'collectible', rarity: 'uncommon', stack: true, value: 90, icon: { shape: 'rug', a: '#c8b898', b: '#7a4a2a' }, furn: { model: 'rug' }, desc: 'Woven on a frame from your own ewes’ wool, with a brown border. Better in front of a fire than anything bought.', stats: 'Furniture: set it out at home (Arrange the furniture).' },
  { id: 'furn_field_scarecrow', name: 'Field scarecrow', kind: 'collectible', rarity: 'uncommon', stack: true, value: 60, icon: { shape: 'scarecrow', a: '#d8b860', b: '#4a5a3a' }, furn: { model: 'scarecrow' }, desc: 'A cross of poles in your old coat, stuffed with straw, a sack for a head and a hat on that. The rooks are not fooled for long, but long enough.', stats: 'Furniture. Set out at home, every harvest from your garden is one more.' },
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
  { id: 'farm_butter', station: 'hearth', skill: 'cooking', level: 6, xp: 30, inputs: { milk: 2 }, output: 'butter', count: 1, time: 2, failAtReq: 0.3, failItem: 'burnt_fish' },
  { id: 'farm_cheese', station: 'hearth', skill: 'cooking', level: 22, xp: 120, inputs: { milk: 4 }, output: 'cheese', count: 1, time: 2.6, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'buttered_bread', station: 'hearth', skill: 'cooking', level: 8, xp: 36, inputs: { bread: 1, butter: 1 }, output: 'buttered_bread', count: 2, time: 1.6 },
  { id: 'cheese_omelette', station: 'hearth', skill: 'cooking', level: 28, xp: 160, inputs: { egg: 3, cheese: 1, butter: 1 }, output: 'cheese_omelette', count: 1, time: 2.4, failAtReq: 0.4, failItem: 'burnt_fish' },
  { id: 'spin_wool', station: 'bench', skill: 'farming', level: 15, xp: 40, inputs: { fleece: 1 }, output: 'wool', count: 2, time: 2.4 },
  { id: 'wool_rug', station: 'bench', skill: 'farming', level: 24, xp: 120, inputs: { wool: 6 }, output: 'furn_wool_rug', count: 1, time: 3.2 },
  { id: 'field_scarecrow', station: 'bench', skill: 'farming', level: 30, xp: 150, inputs: { wheat: 6, wool: 2, oak_logs: 2 }, output: 'furn_field_scarecrow', count: 1, time: 3 },
  { id: 'pear_tart', station: 'hearth', skill: 'cooking', level: 62, xp: 400, inputs: { pears: 3, wheat: 1 }, output: 'pear_tart', count: 1, time: 3, failAtReq: 0.5, failItem: 'burnt_fish' },
] as const;
