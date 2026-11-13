import type { ItemDef } from './items';
import type { CropDef, Season } from './farming';

// The garden and the kitchen widened (owner 2026-11-12: "overhaul cooking and gardening, add lots of crops"). Twenty-four
// more things to grow, from radishes ready in eight minutes to a peach tree that wants a level of ninety-five, each with
// its season; and the dishes they go into at the hearth, one or two for every crop, so there is always something new to
// grow for and to cook, from pea soup at fourteen to a peach cobbler at the top. Bertram sells the seed (data/content/
// farming.ts), and the town's orders ask for the new produce too.

type C = Omit<CropDef, 'season'> & { season: Season };
const crop = (id: string, name: string, level: number, patch: 'allotment' | 'orchard', produce: string, minutes: number, yieldN: [number, number], shape: CropDef['shape'], leaf: string, fruit: string, season: Season, seedId = 'seed_' + id): C => {
  const xpPlant = Math.round(18 + level * level * (patch === 'orchard' ? 0.14 : 0.075) + level * (patch === 'orchard' ? 6 : 3.2));
  const xpPick = Math.round(14 + level * (patch === 'orchard' ? 2.6 : 1.9));
  return { id, name, level, patch, seed: seedId, produce, minutes, xpPlant, xpPick, yield: yieldN, shape, colors: { leaf, fruit }, season };
};

export const MORE_CROPS: C[] = [
  crop('radish', 'Radishes', 3, 'allotment', 'radish', 8, [5, 9], 'root', '#5a9a3a', '#d8405a', 'spring'),
  crop('peas', 'Peas', 7, 'allotment', 'peas', 12, [4, 8], 'bine', '#5a9a4a', '#7ac850', 'summer'),
  crop('beetroot', 'Beetroot', 11, 'allotment', 'beetroot', 14, [4, 7], 'root', '#4a7a3a', '#8a1a3a', 'autumn'),
  crop('turnip', 'Turnips', 15, 'allotment', 'turnip', 16, [3, 6], 'root', '#5a8a3a', '#e8e0d0', 'winter'),
  crop('lettuce', 'Lettuces', 19, 'allotment', 'lettuce', 16, [3, 6], 'leafy', '#7ac850', '#a8e070', 'spring'),
  crop('corn', 'Corn', 24, 'allotment', 'corn', 24, [4, 8], 'grain', '#4a8a2a', '#e8c840', 'summer'),
  crop('beans', 'Runner beans', 29, 'allotment', 'beans', 26, [5, 9], 'bine', '#3f7a2a', '#5a9a3a', 'summer'),
  crop('garlic', 'Garlic', 33, 'allotment', 'garlic', 28, [3, 6], 'root', '#6a9a5a', '#ece6d8', 'winter'),
  crop('parsnip', 'Parsnips', 38, 'allotment', 'parsnip', 30, [3, 7], 'root', '#5a8a3a', '#e8dcb0', 'winter'),
  crop('tomato', 'Tomatoes', 44, 'allotment', 'tomatoes', 34, [4, 8], 'berry', '#3f7a2a', '#d83a2a', 'summer'),
  crop('rhubarb', 'Rhubarb', 46, 'allotment', 'rhubarb', 36, [3, 6], 'leafy', '#4a8a3a', '#c83a4a', 'spring', 'crown_rhubarb'),
  crop('marrow', 'Marrows', 50, 'allotment', 'marrow', 40, [2, 4], 'squash', '#4a7a32', '#5a8a3a', 'summer'),
  crop('herbs', 'Pot herbs', 53, 'allotment', 'herbs', 38, [4, 8], 'leafy', '#5a8a5a', '#7aa86a', 'summer'),
  crop('peppers', 'Peppers', 57, 'allotment', 'peppers', 44, [3, 6], 'berry', '#3f7a2a', '#d8582a', 'summer'),
  crop('oats', 'Oats', 60, 'allotment', 'oats', 42, [5, 9], 'grain', '#8aa04a', '#d8c890', 'autumn'),
  crop('raspberry', 'Raspberries', 63, 'allotment', 'raspberries', 46, [4, 8], 'berry', '#3f7a32', '#c8304a', 'summer', 'cane_raspberry'),
  crop('plum', 'A plum tree', 64, 'orchard', 'plums', 160, [5, 9], 'tree', '#4a7a3a', '#5a2a5a', 'autumn', 'sapling_plum'),
  crop('melon', 'Melons', 72, 'allotment', 'melon', 55, [2, 4], 'squash', '#4a7a32', '#a8c860', 'summer'),
  crop('cherry', 'A cherry tree', 74, 'orchard', 'cherries', 180, [6, 10], 'tree', '#4a8a3a', '#a8102a', 'summer', 'sapling_cherry'),
  crop('rice', 'Rice', 76, 'allotment', 'rice', 60, [5, 9], 'grain', '#6aa04a', '#e8e0c0', 'summer'),
  crop('quince', 'A quince tree', 80, 'orchard', 'quinces', 200, [4, 8], 'tree', '#5a8a3a', '#e0c840', 'autumn', 'sapling_quince'),
  crop('saffron', 'Saffron crocus', 84, 'allotment', 'saffron', 70, [2, 4], 'leafy', '#6a9a4a', '#a050c8', 'autumn', 'corm_saffron'),
  crop('walnut', 'A walnut tree', 88, 'orchard', 'walnuts', 240, [5, 9], 'tree', '#3f6a2a', '#8a6a3a', 'autumn', 'sapling_walnut'),
  crop('peach', 'A peach tree', 95, 'orchard', 'peaches', 260, [5, 9], 'tree', '#4a8a3a', '#f0a070', 'summer', 'sapling_peach'),
];

const seed = (id: string, name: string, a: string, value: number, desc: string): ItemDef =>
  ({ id, name, kind: 'material', rarity: 'common', stack: true, value, icon: { shape: 'ore', a, b: '#6a4a2a' }, desc, stats: 'Plant it in a patch (Farming).' });
const produce = (id: string, name: string, a: string, value: number, desc: string, heal = 0): ItemDef =>
  ({ id, name, kind: heal ? 'food' : 'material', rarity: 'common', stack: true, value, icon: { shape: heal ? 'bread' : 'gel', a }, desc, ...(heal ? { heal, stats: `Restores ${heal} health.` } : {}) });
const dish = (id: string, name: string, a: string, value: number, heal: number, buff: ItemDef['buff'], desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'uncommon', stack: true, value, icon: { shape: 'cooked', a }, heal, buff, desc, stats });

export const MORE_FARM_ITEMS: ItemDef[] = [
  seed('seed_radish', 'Radish seed', '#d8405a', 2, 'Round seeds the size of a pinhead. They come up before you have stopped waiting.'),
  seed('seed_peas', 'Seed peas', '#7ac850', 3, 'Dried peas kept back from last year. Sow them against something they can climb.'),
  seed('seed_beetroot', 'Beetroot seed', '#8a1a3a', 4, 'Knobbly clusters, three or four seeds to a lump. Thin them when they come up.'),
  seed('seed_turnip', 'Turnip seed', '#e8e0d0', 5, 'The winter crop. Nobody loves a turnip, and everybody eats one by February.'),
  seed('seed_lettuce', 'Lettuce seed', '#a8e070', 6, 'Sow a little every week and you never have too many at once. Nobody does.'),
  seed('seed_corn', 'Seed corn', '#e8c840', 9, 'Fat yellow kernels from the Verandah farm, where it grows taller than the men who cut it.'),
  seed('seed_beans', 'Runner bean seed', '#5a9a3a', 11, 'Speckled purple and pink, too handsome to bury. Bury them anyway.'),
  seed('seed_garlic', 'Garlic cloves', '#ece6d8', 13, 'Split from a good bulb. Plant them pointed end up and leave them be all winter.'),
  seed('seed_parsnip', 'Parsnip seed', '#e8dcb0', 15, 'Light as chaff and slow to wake. A frost on them makes them sweet.'),
  seed('seed_tomato', 'Tomato seedlings', '#d83a2a', 18, 'In a tray from the glasshouses at Ansbury, smelling the way only a tomato plant smells.'),
  seed('crown_rhubarb', 'Rhubarb crown', '#c83a4a', 20, 'A woody lump of root with pink buds on it. It will outlive you if you let it.'),
  seed('seed_marrow', 'Marrow seed', '#5a8a3a', 22, 'Flat and pale. One plant makes more marrow than a household can face.'),
  seed('seed_herbs', 'Pot herb plugs', '#7aa86a', 24, 'Sage, thyme and parsley in little pots, to set out together.'),
  seed('seed_peppers', 'Pepper seedlings', '#d8582a', 28, 'From Morrow, where the sun is hotter. They want the warmest corner you have.'),
  seed('seed_oats', 'Seed oats', '#d8c890', 30, 'Moor oats, the kind that stand up to rain. Porridge and horses both start here.'),
  seed('cane_raspberry', 'Raspberry canes', '#c8304a', 34, 'Bare sticks with a root at one end. Next summer they will be a thicket.'),
  seed('sapling_plum', 'Plum sapling', '#5a2a5a', 150, 'A young Kestle damson on its own roots, already putting out spurs.'),
  seed('seed_melon', 'Melon seed', '#a8c860', 40, 'Off a Morrow ship. The seedsman says they will grow here. The seedsman says many things.'),
  seed('sapling_cherry', 'Cherry sapling', '#a8102a', 200, 'A young sweet cherry. Plant it where the birds can see it and you can see the birds.'),
  seed('seed_rice', 'Seed rice', '#e8e0c0', 48, 'From the paddies at Mizuholm, in a cloth bag tied with straw. It wants its feet wet.'),
  seed('sapling_quince', 'Quince sapling', '#e0c840', 240, 'A crooked little tree with grey leaves. Its fruit is hard as wood and smells of honey.'),
  seed('corm_saffron', 'Saffron corms', '#a050c8', 70, 'Brown papery bulbs. Each flower gives three red threads, and the threads are worth their weight in silver.'),
  seed('sapling_walnut', 'Walnut sapling', '#8a6a3a', 300, 'A whip of walnut with a long taproot. Planted for your grandchildren, they say. You can have some first.'),
  seed('sapling_peach', 'Peach sapling', '#f0a070', 380, 'Grafted in Morrow and shipped north wrapped in wet sacking. Treat it gently.'),

  produce('radish', 'Radishes', '#d8405a', 2, 'A bunch of them, red and white and hot on the tongue.', 20),
  produce('peas', 'Peas', '#7ac850', 3, 'A bowl of pods. Half of them never reach the kitchen.', 25),
  produce('beetroot', 'Beetroot', '#8a1a3a', 4, 'Dark as a bruise. It stains everything it touches, you included.'),
  produce('turnip', 'Turnip', '#e8e0d0', 4, 'Pale and heavy, purple at the shoulder.'),
  produce('lettuce', 'Lettuce', '#a8e070', 5, 'A whole head, crisp, with a slug in it somewhere.', 30),
  produce('corn', 'Corn', '#e8c840', 6, 'A cob in its green husk, the silk still on it. Roast it, boil it, or grind it.'),
  produce('beans', 'Runner beans', '#5a9a3a', 6, 'A long fistful, picked young, before the strings come.'),
  produce('garlic', 'Garlic', '#ece6d8', 7, 'A plaited string of bulbs. The whole pack smells of it now.'),
  produce('parsnip', 'Parsnip', '#e8dcb0', 7, 'Long and pale and sweeter after a frost.'),
  produce('tomatoes', 'Tomatoes', '#d83a2a', 8, 'Warm and split at the top from the sun.', 45),
  produce('rhubarb', 'Rhubarb', '#c83a4a', 8, 'Pink sticks with the poisonous leaves cut off. Cook it with sugar or regret it.'),
  produce('marrow', 'Marrow', '#5a8a3a', 9, 'Striped green and the size of a small dog.'),
  produce('herbs', 'Pot herbs', '#7aa86a', 9, 'A bunch of sage, thyme and parsley, tied with a stalk.'),
  produce('peppers', 'Peppers', '#d8582a', 11, 'Red, orange and one stubborn green. Sweet, mostly.'),
  produce('oats', 'Oats', '#d8c890', 10, 'A sack of hulled oats. Porridge, oatcakes, and something for the horse.'),
  produce('raspberries', 'Raspberries', '#c8304a', 12, 'A punnet, soft and dark, picked off the canes.', 60),
  produce('plums', 'Plums', '#5a2a5a', 12, 'Dusty purple, with the bloom on them still.', 60),
  produce('melon', 'Melon', '#a8c860', 14, 'Heavy, netted, and sweet the whole way to the rind.', 90),
  produce('cherries', 'Cherries', '#a8102a', 15, 'A bowl of them, dark red, stalks and all.', 70),
  produce('rice', 'Rice', '#e8e0c0', 13, 'A sack of white grain, threshed and polished.'),
  produce('quinces', 'Quinces', '#e0c840', 16, 'Golden, furred and hard. The whole room smells of honey with one in it.'),
  produce('saffron', 'Saffron', '#a050c8', 40, 'A twist of paper with a few red threads in it. Worth more than the rest of your garden.'),
  produce('walnuts', 'Walnuts', '#8a6a3a', 18, 'In their shells, still damp from the green husks. Your fingers will be brown for a week.'),
  produce('peaches', 'Peaches', '#f0a070', 20, 'Blushed and furred, and so ripe they bruise if you look at them.', 110),

  dish('pea_soup', 'Pea soup', '#7ac850', 14, 150, { slot: 'food', regen: 0.08, mins: 30 }, 'Green as a meadow and thick enough to stand a spoon in.', 'Restores 150 health; stamina back a twelfth faster for half an hour.'),
  dish('pickled_beetroot', 'Pickled beetroot', '#8a1a3a', 16, 120, { slot: 'food', hp: 0.06, mins: 60 }, 'In a jar of spiced vinegar, sliced thin. It keeps all winter.', 'Restores 120 health; a sixteenth more health for an hour.'),
  dish('turnip_mash', 'Turnip and butter mash', '#e8d8a0', 18, 170, { slot: 'food', hp: 0.06, mins: 30 }, 'Mashed with butter and pepper until it forgets it was ever a turnip.', 'Restores 170 health; a sixteenth more health for half an hour.'),
  dish('garden_salad', 'Garden salad', '#a8e070', 22, 160, { slot: 'food', regen: 0.1, mins: 30 }, 'Lettuce, radishes and peas, straight out of the ground and into the bowl.', 'Restores 160 health; stamina back a tenth faster for half an hour.'),
  dish('roast_corn', 'Roast corn', '#e8c840', 24, 200, { slot: 'food', hp: 0.08, mins: 30 }, 'Blackened in the husk over the coals and rolled in butter. The Verandah harvest supper.', 'Restores 200 health; a twelfth more health for half an hour.'),
  dish('cornbread', 'Cornbread', '#e8c060', 26, 210, { slot: 'food', regen: 0.1, mins: 30 }, 'Yellow and crumbling, baked in a skillet with an egg in it.', 'Restores 210 health; stamina back a tenth faster for half an hour.'),
  dish('garlic_bread', 'Garlic bread', '#e8d090', 30, 220, { slot: 'food', hp: 0.08, mins: 30 }, 'A loaf split and soaked in garlic butter. Nobody near you will doubt what you ate.', 'Restores 220 health; a twelfth more health for half an hour.'),
  dish('bean_stew', 'Bean and garlic stew', '#7a8a4a', 32, 250, { slot: 'food', hp: 0.1, mins: 30 }, 'Runner beans, onion and garlic stewed down. It sticks to your ribs on a long road.', 'Restores 250 health; a tenth more health for half an hour.'),
  dish('roast_roots', 'Roast roots', '#d8a050', 40, 290, { slot: 'food', hp: 0.1, mins: 30 }, 'Parsnip, carrot, turnip and beetroot, roasted until the edges catch.', 'Restores 290 health; a tenth more health for half an hour.'),
  dish('tomato_soup', 'Tomato soup', '#d83a2a', 48, 320, { slot: 'food', regen: 0.15, mins: 30 }, 'Your own tomatoes, an onion and a handful of herbs, cooked down and sieved.', 'Restores 320 health; stamina back a seventh faster for half an hour.'),
  dish('rhubarb_crumble', 'Rhubarb crumble', '#c86a6a', 52, 330, { slot: 'food', regen: 0.15, mins: 30 }, 'Sharp pink fruit under a crust of oats and butter. Hot, with cream if you have a cow.', 'Restores 330 health; stamina back a seventh faster for half an hour.'),
  dish('stuffed_marrow', 'Stuffed marrow', '#6a9a4a', 56, 360, { slot: 'food', hp: 0.12, mins: 30 }, 'Hollowed out and filled with cheese and herbs, then baked until it gives.', 'Restores 360 health; an eighth more health for half an hour.'),
  dish('porridge', 'Porridge', '#e0d0a0', 58, 300, { slot: 'food', regen: 0.18, mins: 60 }, 'Oats and milk, stirred with a spurtle, salted the way the moors take it.', 'Restores 300 health; stamina back a fifth faster for an hour.'),
  dish('raspberry_jam', 'Raspberry jam', '#c8304a', 62, 200, { slot: 'food', regen: 0.12, mins: 90 }, 'A jar sealed with wax and a paper lid. Summer, kept for later.', 'Restores 200 health; stamina back an eighth faster for an hour and a half.'),
  dish('plum_pudding', 'Plum pudding', '#5a2a4a', 66, 400, { slot: 'food', hp: 0.14, mins: 30 }, 'Steamed in a cloth for an afternoon, heavy as a cannonball and as welcome.', 'Restores 400 health; a seventh more health for half an hour.'),
  dish('melon_ice', 'Melon and mint', '#b8d870', 70, 380, { slot: 'food', regen: 0.2, mins: 30 }, 'Cold melon cut in half-moons with torn mint over it. A summer day in a bowl.', 'Restores 380 health; stamina back a fifth faster for half an hour.'),
  dish('cherry_pie', 'Cherry pie', '#a8102a', 76, 440, { slot: 'food', hp: 0.15, mins: 30 }, 'Dark fruit bubbling through a lattice crust. Count the stones before you bite.', 'Restores 440 health; a seventh more health for half an hour.'),
  dish('stuffed_peppers', 'Stuffed peppers', '#d8582a', 78, 460, { slot: 'food', hp: 0.15, mins: 30 }, 'Peppers filled with rice and herbs and baked until the skins blister.', 'Restores 460 health; a seventh more health for half an hour.'),
  dish('rice_pudding', 'Rice pudding', '#f0e8d0', 80, 420, { slot: 'food', regen: 0.22, mins: 60 }, 'Baked slow in the oven\'s last heat, with a brown skin that everyone fights over.', 'Restores 420 health; stamina back a fifth faster for an hour.'),
  dish('quince_cheese', 'Quince cheese', '#e0a840', 82, 300, { slot: 'food', hp: 0.12, mins: 120 }, 'Quinces boiled down for hours to a dark amber paste that you slice. It keeps for a year.', 'Restores 300 health; an eighth more health for two hours.'),
  dish('saffron_rice', 'Saffron rice', '#f0c030', 86, 500, { slot: 'food', hp: 0.18, mins: 30 }, 'Rice turned gold with a few threads of your own saffron, butter stirred through.', 'Restores 500 health; a sixth more health for half an hour.'),
  dish('walnut_cake', 'Walnut cake', '#a8804a', 90, 520, { slot: 'food', regen: 0.25, mins: 60 }, 'A dense brown loaf of a cake with walnuts all through it, better on the second day.', 'Restores 520 health; stamina back a quarter faster for an hour.'),
  dish('peach_cobbler', 'Peach cobbler', '#f0a070', 96, 600, { slot: 'food', hp: 0.2, mins: 60 }, 'Peaches in their own syrup under a scone crust, the best thing a garden can give you.', 'Restores 600 health; a fifth more health for an hour.'),
];

const r = (id: string, level: number, xp: number, inputs: Record<string, number>, output: string, count = 1, time = 2.4) =>
  ({ id, station: 'hearth', skill: 'cooking', level, xp, inputs, output, count, time, failAtReq: Math.min(0.55, 0.3 + level / 400), failItem: 'burnt_fish' });

export const MORE_FARM_RECIPES = [
  r('pea_soup', 14, 80, { peas: 3, onion: 1 }, 'pea_soup'),
  r('pickled_beetroot', 16, 90, { beetroot: 3 }, 'pickled_beetroot', 2),
  r('turnip_mash', 18, 100, { turnip: 2, butter: 1 }, 'turnip_mash'),
  r('garden_salad', 22, 120, { lettuce: 1, radish: 2, peas: 1 }, 'garden_salad'),
  r('roast_corn', 24, 130, { corn: 2, butter: 1 }, 'roast_corn', 2),
  r('cornbread', 26, 140, { corn: 3, egg: 1 }, 'cornbread', 2),
  r('garlic_bread', 30, 160, { bread: 1, garlic: 1, butter: 1 }, 'garlic_bread', 2),
  r('bean_stew', 32, 180, { beans: 2, onion: 1, garlic: 1 }, 'bean_stew'),
  r('roast_roots', 40, 230, { parsnip: 1, carrot: 1, turnip: 1, beetroot: 1 }, 'roast_roots', 2),
  r('tomato_soup', 48, 280, { tomatoes: 3, onion: 1, herbs: 1 }, 'tomato_soup'),
  r('rhubarb_crumble', 52, 300, { rhubarb: 3, oats: 1, butter: 1 }, 'rhubarb_crumble'),
  r('stuffed_marrow', 56, 330, { marrow: 1, herbs: 1, cheese: 1 }, 'stuffed_marrow', 2),
  r('porridge', 58, 300, { oats: 2, milk: 1 }, 'porridge', 2),
  r('raspberry_jam', 62, 340, { raspberries: 4 }, 'raspberry_jam', 2),
  r('plum_pudding', 66, 380, { plums: 3, wheat: 2, egg: 1 }, 'plum_pudding'),
  r('melon_ice', 70, 400, { melon: 1, herbs: 1 }, 'melon_ice', 2),
  r('cherry_pie', 76, 440, { cherries: 3, wheat: 2 }, 'cherry_pie'),
  r('stuffed_peppers', 78, 460, { peppers: 2, rice: 1, herbs: 1 }, 'stuffed_peppers'),
  r('rice_pudding', 80, 470, { rice: 2, milk: 2 }, 'rice_pudding'),
  r('quince_cheese', 82, 480, { quinces: 3 }, 'quince_cheese', 2),
  r('saffron_rice', 86, 520, { rice: 2, saffron: 1, butter: 1 }, 'saffron_rice'),
  r('walnut_cake', 90, 560, { walnuts: 2, wheat: 2, egg: 2, butter: 1 }, 'walnut_cake'),
  r('peach_cobbler', 96, 640, { peaches: 3, wheat: 2, butter: 1 }, 'peach_cobbler'),
];

/** Bertram's prices for the new seed (data/content/farming.ts): a little over its worth. */
export const MORE_SEED_PRICES: [string, number, number][] = MORE_CROPS.map((c) => {
  const it = MORE_FARM_ITEMS.find((i) => i.id === c.seed)!;
  return [c.seed, Math.round(it.value * 1.6 + 2), c.level];
});
