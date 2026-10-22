import type { GameApi } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import type { ItemDef } from '../items';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { DAY_MINUTES, realmNow } from '../../world/clock';

// Pedlars: traders who walk the long Charter roads with a pack pony, town to town and back, on the
// realm's clock (game/Roadfolk.ts walks them), so everyone online meets the same one on the same
// bend. Come up to one and they stop to deal. Each carries their own trade, and part of what's in
// the pack changes every realm day; a couple carry something no shop does.

export interface Pedlar {
  id: string;
  name: string;
  /** Their trade, under their name. */
  title: string;
  /** The road they walk (an index into WORLD_ROADS), how fast, and how long they stop in the town at each end. */
  road: number;
  speed: number;
  rest: number;
  look: Partial<Appearance>;
  pony: { coat: string; mane: string; cloth: string };
  /** What they say when you come up to them. */
  hello: string[];
  /** Everything they ever carry, and how many of it are in the pack on any one day. */
  pool: { item: string; price: number }[];
  daily: number;
  /** Carried every day. */
  always?: { item: string; price: number; when?: (g: GameApi) => boolean }[];
  /** What they pay for an item, as a share of its worth. */
  buys: (item: string) => number;
  footer: string;
}

const linen = ['linen_chest', 'linen_legs', 'linen_hands', 'linen_feet'];
const MAPS = ['greenwake', 'crownroad', 'brambledeep', 'saltwind', 'redstone', 'starfall', 'gannet', 'wrath', 'tolmen'].flatMap((r) => [`tmap_${r}_1`, `tmap_${r}_2`]);
const HIDES = new Set(['wolf_pelt', 'boar_hide', 'frost_pelt', 'rustback_shell', 'crab_shell', 'conger_skin', 'ray_barb', 'shark_tooth']);
// (Content modules import types only, so the trades are known by name rather than looked up)
const TOOL = /(_pickaxe|_hatchet|_pick|_axe|^fishing_rod|^lockpick)$/;
const TROPHY = new Set(['notch_fang', 'brindle_tail', 'barley_tusk', 'mosscap_heart', 'barnacle_claw', 'pitdog_collar', 'whiteface_pelt', 'eggthief_brush', 'mudgut_tusk', 'torhound_fang', 'bigmary_tooth']);
const FOOD = /^(cooked_|raw_)|(_pie|_tart|_stew|_jam|_cake|_loaf|_beer|_ale|_porter|_wine|_cider|_pasty|_ham|_eggs?|berries|_chestnuts)$|^(bread|bread_cheese|smoked_eel|bass_samphire|wild_garlic|chanterelles|samphire|tavern_stew)$/;

export const PEDLARS: Pedlar[] = [
  {
    id: 'ned', name: 'Ned Callow', title: 'Tinker', road: 1, speed: 1.5, rest: 200,
    look: { frame: 'm', skin: '#d8a882', hair: '#9a948c', hairStyle: 3, facial: 3, tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#3a3a3e', boots: '#2a2018', apron: true, hat: 'cap', hatColor: '#3a3a3a', age: 0.7, build: 1.05 },
    pony: { coat: '#8a8a86', mane: '#3a3632', cloth: '#5a4a3a' },
    hello: [
      'Ned Callow, tinker. If it\'s iron and it\'s broken, I\'ve mended worse.',
      'Picks, hatchets, hooks. Have a look while the pony gets her breath.',
      'I\'ll be in Gullmouth by dark if the wind lets me. Buy now or chase me.',
    ],
    pool: [
      { item: 'worn_pickaxe', price: 8 }, { item: 'bronze_pickaxe', price: 40 }, { item: 'iron_pickaxe', price: 125 },
      { item: 'farm_hatchet', price: 8 }, { item: 'bronze_hatchet', price: 34 }, { item: 'iron_hatchet', price: 98 },
      { item: 'fishing_rod', price: 12 }, { item: 'bronze_bar', price: 16 }, { item: 'iron_bar', price: 38 }, { item: 'silver_bar', price: 52 },
    ],
    daily: 5,
    always: [{ item: 'lockpick', price: 3 }],
    buys: (item) => (TOOL.test(item) || item.endsWith('_bar') || item.endsWith('_ore') ? 0.7 : 0.35),
    footer: 'Ned pays 70% for tools, metal and ore, and a third for anything else',
  },
  {
    id: 'sabine', name: 'Sabine Orrell', title: 'Spicer and draper', road: 3, speed: 1.4, rest: 220,
    look: { frame: 'f', skin: '#c89070', hair: '#1e1612', hairStyle: 7, tunic: '#7a3a4a', trim: '#e0c070', trousers: '#4a3a2e', boots: '#3a2a1c', cape: '#3a5a5a', hat: 'wide', hatColor: '#5a3a2a', age: 0.4, lashes: true },
    pony: { coat: '#6a4a2a', mane: '#1e1612', cloth: '#7a3a4a' },
    hello: [
      'Sabine Orrell. Spice off the coast boats, cloth off the Ansbury looms.',
      'Garlic, samphire, chanterelles. Kelderby cooks pay double, so buy before I get there.',
      'Feel the weave on that linen. Go on, I don\'t mind.',
    ],
    pool: [
      { item: 'wild_garlic', price: 6 }, { item: 'chanterelles', price: 11 }, { item: 'samphire', price: 8 }, { item: 'cloudberries', price: 22 }, { item: 'bilberries', price: 11 },
      ...linen.map((item) => ({ item, price: 30 })),
      { item: 'furn_rug_red', price: 22 }, { item: 'furn_rug_blue', price: 22 }, { item: 'furn_rug_green', price: 22 }, { item: 'furn_candles', price: 11 },
    ],
    daily: 6,
    buys: (item) => (FOOD.test(item) ? 0.6 : 0.5),
    footer: 'Sabine pays 60% for food and half for anything else',
  },
  {
    id: 'jory', name: 'Jory Penhallow', title: 'Chapman', road: 4, speed: 1.5, rest: 200,
    look: { frame: 'm', skin: '#e2b894', hair: '#7a3a1e', hairStyle: 5, facial: 1, tunic: '#3a4a5a', trim: '#c8a060', trousers: '#5a4a3a', boots: '#2a1e16', cape: '#6a4a2a', hat: 'kerchief', hatColor: '#8a3a2a', age: 0.35 },
    pony: { coat: '#c8a878', mane: '#f0e8d8', cloth: '#3a4a5a' },
    hello: [
      'Jory Penhallow, chapman. Maps, music, and things I can\'t name.',
      'Every map in this pack was drawn by somebody who meant to come back for it.',
      'I had a harp once. Traded it for a goat outside Harrowgate. I miss the harp.',
    ],
    pool: [
      ...MAPS.map((item) => ({ item, price: 70 })),
      { item: 'inst_whistle', price: 14 }, { item: 'inst_horn', price: 110 }, { item: 'inst_gurdy', price: 260 }, { item: 'star_crystal', price: 120 },
    ],
    daily: 5,
    buys: () => 0.4,
    footer: 'Jory pays 40% of an item\'s worth, and swears it\'s generous',
  },
  {
    id: 'abel', name: 'Abel Stott', title: 'Drover', road: 6, speed: 1.25, rest: 260,
    look: { frame: 'm', skin: '#b07a52', hair: '#3a2418', hairStyle: 2, facial: 5, tunic: '#4a5a3a', trim: '#6a4a2a', trousers: '#3a3a2e', boots: '#2a2018', hat: 'hood', hatColor: '#5a4a3a', shoes: 1, age: 0.55, build: 1.12 },
    pony: { coat: '#3a2a1e', mane: '#1a1410', cloth: '#4a5a3a' },
    hello: [
      'Abel Stott. I drive beasts; I don\'t sell them. Except the one, if you\'ve the money.',
      'Mind the pony. She bites strangers, and people she likes.',
      'Ham from Ashcroft, pies from the Waystation. A drover eats on the road or not at all.',
    ],
    pool: [
      { item: 'ashcroft_ham', price: 20 }, { item: 'mutton_pie', price: 12 }, { item: 'bread_cheese', price: 6 }, { item: 'small_beer', price: 2 }, { item: 'moor_pasty', price: 46 },
    ],
    daily: 4,
    always: [{ item: 'halter_drover', price: 520, when: (g) => g.count('halter_drover') === 0 }],
    buys: (item) => (HIDES.has(item) ? 0.8 : 0.4),
    footer: 'Abel pays 80% for pelts and hides, and 40% for anything else',
  },
  {
    id: 'gwen', name: 'Gwen Tresize', title: 'Cider-seller', road: 5, speed: 1.4, rest: 220,
    look: { frame: 'f', skin: '#f0cfb0', hair: '#c8a060', hairStyle: 9, tunic: '#6a7a3a', trim: '#e8d8b0', trousers: '#4a3a2e', boots: '#3a2a1c', apron: true, hat: 'kerchief', hatColor: '#c84a3a', freckles: true, age: 0.5, lashes: true },
    pony: { coat: '#9a6a3a', mane: '#e8d8b0', cloth: '#6a7a3a' },
    hello: [
      'Gwen Tresize. Cider for the walk up to the Kirk, and something stronger for the walk down.',
      'The pilgrims drink water going up. Coming down, they drink anything I\'ve got.',
      'That pasty was warm this morning. It means well.',
    ],
    pool: [
      { item: 'hollin_cider', price: 5 }, { item: 'brown_ale', price: 5 }, { item: 'mulled_wine', price: 10 }, { item: 'bread_cheese', price: 7 }, { item: 'moor_pasty', price: 48 },
      { item: 'bilberry_tart', price: 62 }, { item: 'eel_pie', price: 12 }, { item: 'mutton_pie', price: 12 }, { item: 'harvest_loaf', price: 6 }, { item: 'roast_chestnuts', price: 6 },
    ],
    daily: 6,
    buys: (item) => (FOOD.test(item) ? 0.6 : 0.4),
    footer: 'Gwen pays 60% for food and drink, and 40% for anything else',
  },
  {
    id: 'tobias', name: 'Tobias Venn', title: 'Fur trader', road: 8, speed: 1.45, rest: 240,
    look: { frame: 'm', skin: '#d8a882', hair: '#2a2a2a', hairStyle: 4, facial: 6, tunic: '#5a4a32', trim: '#8a6a4a', trousers: '#3a2e24', boots: '#1e1610', cape: '#8a7a6a', hat: 'wide', hatColor: '#3a2e24', age: 0.6, build: 1.08 },
    pony: { coat: '#e0dcd4', mane: '#8a847c', cloth: '#5a4a32' },
    hello: [
      'Tobias Venn. I buy what you skin, and I don\'t ask where you skinned it.',
      'Pelts, hides, shells, teeth: near full worth. The Ansbury furriers pay me less than I pay you. Don\'t tell them.',
      'The Wrath Levels in the wet season. My boots haven\'t been dry since spring.',
    ],
    pool: [
      { item: 'frost_pelt', price: 72 }, { item: 'wolf_pelt', price: 11 }, { item: 'boar_hide', price: 16 }, { item: 'crab_shell', price: 20 }, { item: 'wolfskin_hood', price: 64 },
    ],
    daily: 3,
    buys: (item) => (HIDES.has(item) || TROPHY.has(item) ? 0.9 : 0.3),
    footer: 'Tobias pays 90% for pelts, hides, shells and trophies, and little for anything else',
  },
];

/** The realm's day, for what's in the packs. */
const today = () => Math.floor(realmNow() / (DAY_MINUTES * 60_000));
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/** What's in a pedlar's pack today: the same for everyone, a different handful each day. */
export function inPack(p: Pedlar, day = today()): Set<string> {
  const order = p.pool.map((s) => s.item).sort((a, b) => hash(`${p.id}:${day}:${a}`) - hash(`${p.id}:${day}:${b}`));
  return new Set(order.slice(0, p.daily));
}

const items: ItemDef[] = [
  {
    id: 'halter_drover', name: 'Abel\'s fell pony', kind: 'collectible', rarity: 'rare', stack: false, value: 0,
    icon: { shape: 'shoe', a: '#3a2a1e', b: '#4a5a3a' },
    mount: { coat: '#3a2a1e', mane: '#1a1410', cloth: '#4a5a3a', breed: 'pack' },
    desc: 'A short, thick-legged black pony with panniers on her, bred on the fells for carrying. Abel Stott has driven sheep behind her for six years and says she knows the way better than he does.',
    stats: 'Use it, or press G, to ride. Every horse keeps the same pace.',
  },
];

export const PEDLAR_CONTENT: RegionContent = {
  id: 'pedlars',
  items,
  shops: Object.fromEntries(PEDLARS.map((p): [string, ShopDef] => ['pedlar_' + p.id, {
    id: 'pedlar_' + p.id, name: `${p.name}'s pack`, owner: '', who: p.name.split(' ')[0],
    stock: [...(p.always ?? []), ...p.pool.map((s) => ({ ...s, when: () => inPack(p).has(s.item) }))],
    buyRate: (_g, item) => p.buys(item),
    footer: () => `${p.footer}. Some of the pack changes every day.`,
  }])),
};
