import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { BUSINESSES, keeperSpot } from '../businesses';

// The trades' people (data/businesses.ts has where they are): each keeper in front of their door, what
// they'll say about the place, and their shop. Their goods are their own: you can't buy Corlett red
// in Ansbury, only at Corlett's.

const drink = (id: string, name: string, a: string, b: string, value: number, buff: ItemDef['buff'], desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: value >= 40 ? 'rare' : 'uncommon', stack: true, value, icon: { shape: 'gel', a, b }, buff, desc, stats });
const food = (id: string, name: string, shape: 'cooked' | 'bread' | 'fish', a: string, value: number, heal: number, buff: ItemDef['buff'] | undefined, desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: buff ? 'uncommon' : 'common', stack: true, value, icon: { shape, a }, heal, ...(buff ? { buff } : {}), desc, stats });

const items: ItemDef[] = [
  drink('corlett_red', 'Corlett red', '#5a1a2a', '#c8a050', 24, { slot: 'drink', hp: 0.12, mins: 15 }, 'From the low rows at Corlett\'s, the slope everyone said faced the wrong way.', 'An eighth more health for fifteen minutes.'),
  drink('corlett_white', 'Corlett white', '#d8d08a', '#c8a050', 24, { slot: 'drink', regen: 0.3, mins: 15 }, 'From the high rows, where the wind gets at the grapes and makes them work for it.', 'Stamina comes back three-tenths faster for fifteen minutes.'),
  drink('fallow_white', 'Fallow Hill white', '#e8e0a0', '#3f6a3a', 30, { slot: 'drink', regen: 0.35, mins: 18 }, 'Simeon Gale\'s, off a steep cold slope by the sea. Sharp as the wind that grew it.', 'Stamina comes back a third faster for eighteen minutes.'),
  drink('fallow_brandy', 'Fallow brandy', '#c87a2a', '#3f6a3a', 50, { slot: 'drink', power: 0.06, mins: 12 }, 'What\'s left in the press at Fallow Hill, run through a still and made respectable.', 'Your blows land a sixteenth harder for twelve minutes.'),
  drink('garrow_bitter', 'Garrow\'s bitter', '#c8902a', '#e8dcc0', 10, { slot: 'drink', hp: 0.08, mins: 12 }, 'Hops off the poles behind the brewhouse, malt from Cotter\'s End. For drinking.', 'A twelfth more health for twelve minutes.'),
  drink('garrow_porter', 'Garrow\'s porter', '#2a1a12', '#c8a060', 14, { slot: 'drink', power: 0.04, mins: 12 }, 'Black as a cellar and about as warm. For sitting with.', 'Your blows land a twenty-fifth harder for twelve minutes.'),
  food('mardle_hard', 'Mardle hard cheese', 'bread', '#e8d8a0', 16, 120, { slot: 'food', regen: 0.1, mins: 30 }, 'Pressed, turned, and left alone for a year, the old recipe.', 'Restores 120 health; stamina back a tenth faster for half an hour.'),
  food('mardle_blue', 'Mardle blue', 'bread', '#d8d8c0', 28, 180, { slot: 'food', hp: 0.06, mins: 30 }, 'An accident in a damp summer. Ansbury pays twice as much for the accident.', 'Restores 180 health; a sixteenth more health for half an hour.'),
  drink('pruett_mead', 'Pruett\'s mead', '#d8a83a', '#3a2a1c', 28, { slot: 'drink', regen: 0.35, mins: 15 }, 'Three years in the cask before it leaves the bee garden. The bees were told about every one.', 'Stamina comes back a third faster for fifteen minutes.'),
  food('honeycomb', 'Honeycomb', 'bread', '#e8b030', 8, 70, undefined, 'A slab of comb from Agnes Pruett\'s hives, wax and all.', 'Restores 70 health.'),
  food('brock_kipper', 'Brock\'s kipper', 'fish', '#c8904a', 16, 150, { slot: 'food', regen: 0.12, mins: 30 }, 'Herring split and salted and hung in oak smoke two days. You\'ll smell of it till Tuesday.', 'Restores 150 health; stamina back an eighth faster for half an hour.'),
  drink('keir_whisky', 'Keir\'s whisky', '#c8822a', '#2a3a2a', 45, { slot: 'drink', power: 0.07, mins: 15 }, 'Peat-smoked barley run twice through the copper, then eight years in the cask, less the angels\' share.', 'Your blows land a fourteenth harder for fifteen minutes.'),
  { id: 'furn_glasslamp', name: 'Glass lamp', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'lantern', a: '#c8e0e8', b: '#ffc060' }, desc: 'Blown at Wren\'s Glasshouse: a lamp whose flame stays put in a draught. Tobias says it\'s the glass. His mother says it\'s the wick.', furn: { model: 'lamp' }, stats: 'Furniture: set it down in a house of your own' },
];

const npcs: NpcDef[] = BUSINESSES.map((b) => {
  const { at, face } = keeperSpot(b);
  return { id: b.keeper.id, name: b.keeper.name, title: b.keeper.title, look: b.keeper.look, schedule: [{ from: 0, to: 24, at, face, anim: 'idle' }], barks: [] };
});

/** A keeper's conversation: their greeting, the place, and the shop. */
const talk = (shop: string, hello: string, about: string): DialogueTree => ({
  start: () => 'hello',
  nodes: {
    hello: { text: hello, options: [{ text: 'What do you sell?', effect: (g) => g.openShop(shop) }, { text: 'Tell me about this place.', next: 'about' }, { text: 'Good day.' }] },
    about: { text: about, options: [{ text: 'What do you sell?', effect: (g) => g.openShop(shop) }, { text: 'Good day.' }] },
  },
});

const LINES: Record<string, [string, string]> = {
  biz_hester: [
    'You\'ve found Corlett\'s. My grandmother planted the first rows on a slope everyone said faced the wrong way. It faces the right way now.',
    'The red\'s from the low rows, the white from the high ones where the wind gets at them. We press in the stone house and lay the casks down in the cellar. Ansbury drinks half of it.',
  ],
  biz_simeon: [
    'Fallow Hill. Small, steep, and mine. The sea wind keeps the mildew off and the visitors away. You\'re not a mildew, I hope.',
    'White only. The slope\'s too cold for red, and I\'m too old to argue with it. The brandy\'s what\'s left in the press, made respectable.',
  ],
  biz_ned: [
    'Garrow\'s. If you\'ve come for water, the well\'s round the back. If you\'ve come for anything better, sit down.',
    'Hops off the poles behind, dried in the oast, malt from Cotter\'s End. The bitter\'s for drinking. The porter\'s for sitting with. My father\'s buried under the hop garden, so mind your language.',
  ],
  biz_ruth: [
    'Mardle Dairy. Mind the cows, they think everyone\'s carrying turnips. What can I get you?',
    'The hard one\'s the old recipe: pressed, turned, left alone for a year. The blue was an accident in a damp summer. Ansbury pays twice as much for the accident. I\'ve stopped arguing.',
  ],
  biz_tobias: [
    'Wren\'s. Don\'t touch the cone. It\'s hotter than it looks, and it looks very hot. Lamps, if you want a light that stays put in a draught.',
    'Sand from the Raddle washes, lime from the Harrowgate kilns, and a furnace that never goes out. My father let it go out once, for a wedding. It took him a month to bring it back.',
  ],
  biz_agnes: [
    'Walk slow. They don\'t mind you if you don\'t mind them. Mead, honey, and advice nobody asks for.',
    'Forty hives. I tell them when someone dies, when someone\'s born, and when the Charter puts the tax up. They take the tax worst. The mead\'s three years old before it leaves here.',
  ],
  biz_silas: [
    'Brock\'s. You\'ll smell of it till Tuesday. Kippers, eels, whatever came in off the Gullmouth boats this morning.',
    'Herring split and salted, hung in oak smoke two days. Eels a week. The fire\'s been lit since my grandfather\'s time, same as Wren\'s, but mine doesn\'t make a fuss about it.',
  ],
  biz_abel: [
    'Dunmore\'s. Breathe through your mouth. You\'ll get used to it, or you won\'t, and either way I\'ll pay you fair for a hide.',
    'Oak bark from the Hagworm, lime, and a year in the pits. I sell the leather made up, coats and gloves and boots, and I pay better for a hide than any stall in a town.',
  ],
  biz_morag: [
    'Keir\'s. Up here the water comes off the peat the colour of tea and the wind comes off the snow. Both go in the whisky.',
    'Barley malted over peat we cut ourselves, run twice through the copper, then eight years in the casks. The angels take their share. They drink better than the Charter does.',
  ],
};

const STOCK: Record<string, { name: string; stock: { item: string; price: number }[]; buyRate?: (item: string) => number; footer: string }> = {
  biz_hester: { name: 'Corlett\'s cellar door', stock: [{ item: 'corlett_red', price: 48 }, { item: 'corlett_white', price: 48 }], buyRate: (item) => (item === 'grapes' ? 0.9 : 0.5), footer: 'Hester pays well for grapes, and half of anything else\'s worth' },
  biz_simeon: { name: 'Fallow Hill', stock: [{ item: 'fallow_white', price: 60 }, { item: 'fallow_brandy', price: 100 }], buyRate: (item) => (item === 'grapes' ? 0.9 : 0.5), footer: 'Simeon pays well for grapes, and half of anything else\'s worth' },
  biz_ned: { name: 'Garrow\'s tap room', stock: [{ item: 'garrow_bitter', price: 20 }, { item: 'garrow_porter', price: 28 }], buyRate: (item) => (item === 'barley' || item === 'hops' || item === 'wheat' ? 0.9 : 0.5), footer: 'Ned pays well for barley, hops and wheat, and half of anything else\'s worth' },
  biz_ruth: { name: 'Mardle Dairy', stock: [{ item: 'mardle_hard', price: 32 }, { item: 'mardle_blue', price: 56 }], footer: 'Ruth pays half of an item\'s worth' },
  biz_tobias: { name: 'Wren\'s Glasshouse', stock: [{ item: 'furn_glasslamp', price: 220 }], footer: 'Tobias pays half of an item\'s worth' },
  biz_agnes: { name: 'Pruett\'s Bee Garden', stock: [{ item: 'pruett_mead', price: 56 }, { item: 'honeycomb', price: 16 }], footer: 'Agnes pays half of an item\'s worth' },
  biz_silas: { name: 'Brock\'s Smokehouse', stock: [{ item: 'brock_kipper', price: 32 }, { item: 'smoked_eel', price: 40 }], footer: 'Silas pays half of an item\'s worth' },
  biz_abel: { name: 'Dunmore Tannery', stock: [{ item: 'leather_chest', price: 96 }, { item: 'leather_legs', price: 80 }, { item: 'leather_hands', price: 48 }, { item: 'leather_feet', price: 48 }], buyRate: (item) => (item.endsWith('_hide') || item.endsWith('_pelt') ? 0.85 : 0.45), footer: 'Abel pays most of a hide\'s worth, and under half for anything else' },
  biz_morag: { name: 'Keir\'s Still', stock: [{ item: 'keir_whisky', price: 90 }], footer: 'Morag pays half of an item\'s worth' },
};

const shops: Record<string, ShopDef> = {};
for (const b of BUSINESSES) {
  const st = STOCK[b.keeper.id];
  shops[b.keeper.id] = { id: b.keeper.id, name: st.name, owner: b.keeper.id, stock: st.stock, buyRate: (_g, item) => st.buyRate?.(item) ?? 0.5, footer: () => st.footer } as ShopDef;
}

export const BUSINESS_CONTENT: RegionContent = {
  id: 'businesses',
  items,
  npcs,
  dialogue: Object.fromEntries(BUSINESSES.map((b) => [b.keeper.id, talk(b.keeper.id, LINES[b.keeper.id][0], LINES[b.keeper.id][1])])),
  shops,
};
