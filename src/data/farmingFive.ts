import type { ItemDef } from './items';
import type { CropDef } from './farming';

// Farming, part five, the last of docs/briefs/farming-cozy.md (owner 2026-11-14: "farming and gardening should be in
// depth like cozy games"). Giant crops: nine pumpkins, marrows, cabbages or melons ripe in a square, each kept well,
// now and then grow together into one giant that takes a lot of cutting (less with your group about you). And the
// Hollin Ford Show, every season: six classes, a day's entry in each, judged on what it is and how well it was grown;
// cards and the rosette for the places, and the show cup to the grower who takes four firsts in a season.

/** The crops that can go giant, and what the giant is. */
export const GIANTS: Record<string, { item: string; name: string }> = {
  pumpkin: { item: 'giant_pumpkin', name: 'giant pumpkin' },
  marrow: { item: 'giant_marrow', name: 'giant marrow' },
  cabbage: { item: 'giant_cabbage', name: 'giant cabbage' },
  melon: { item: 'giant_melon', name: 'giant melon' },
};
/** The chance nine ripe tiles, each well kept, join; strokes to cut one alone, and with your group near. */
export const GIANT = { chance: 0.3, strokes: 5, groupStrokes: 2, prize: 12, fine: 6 };

export const GIANT_ITEMS: ItemDef[] = Object.values(GIANTS).map((g) => ({
  id: g.item, name: g.name[0].toUpperCase() + g.name.slice(1), kind: 'collectible', rarity: 'epic', stack: true, value: 160,
  icon: { shape: 'bread', a: g.item === 'giant_pumpkin' ? '#e8801e' : g.item === 'giant_marrow' ? '#5a8a3a' : g.item === 'giant_cabbage' ? '#8ab870' : '#a8c860', b: '#4a7a32' },
  desc: `Nine plants grew into one. It takes two to carry it and it won't go through a door without an argument.`,
  stats: 'Enter it in the Hollin Ford Show (Hester Wragg, by Bertram\'s garden): the judges have never not given one first.',
}));

// ---------------------------------------------------------------- The show

export type ShowClass = 'veg' | 'fruit' | 'flowers' | 'larder' | 'yard' | 'giants';
const FRUIT = new Set(['strawberries', 'raspberries', 'apples', 'pears', 'plums', 'cherries', 'quinces', 'peaches', 'grapes', 'melon', 'walnuts']);
const LARDER: Record<string, number> = {
  cheese: 26, butter: 14, home_cider: 22, home_perry: 24, home_ale: 20, home_wine: 34, homespun: 30,
  honey_garden: 16, honey_pansy: 20, honey_tulip: 24, honey_rose: 32,
  jam_strawberries: 20, jam_raspberries: 24, jam_plums: 26, jam_cherries: 28, jam_apples: 20, jam_pears: 22, jam_quinces: 30, jam_peaches: 32, jam_rhubarb: 22,
};

export interface ShowClassDef { id: ShowClass; name: string; says: string }
export const SHOW_CLASSES: ShowClassDef[] = [
  { id: 'veg', name: 'Vegetables', says: 'roots, greens, grain and the squashes' },
  { id: 'fruit', name: 'Fruit', says: 'berries, orchard fruit, grapes and melons' },
  { id: 'flowers', name: 'Flowers', says: 'a bunch of one colour; the rarer the colour, the better' },
  { id: 'larder', name: 'The larder', says: 'cheese, butter, preserves, honey, cider, ale, wine and homespun' },
  { id: 'yard', name: 'The yard', says: 'eggs, milk and fleece' },
  { id: 'giants', name: 'Giant crops', says: 'whatever grew together' },
];

/** Every plain item that can go in a class, with what it's worth to the judges before how well it was grown (0 to 40). */
export function showEntries(crops: CropDef[]): Record<ShowClass, Record<string, number>> {
  const out: Record<ShowClass, Record<string, number>> = { veg: {}, fruit: {}, flowers: {}, larder: { ...LARDER }, yard: { egg: 10, milk: 12, fleece: 16 }, giants: {} };
  for (const c of crops) {
    const tier = Math.min(40, Math.round(c.level * 0.42));
    if (c.shape === 'flower') out.flowers[c.produce] = Math.min(40, tier + (c.id.endsWith('_blue') ? 22 : c.id.endsWith('_purple') ? 14 : /_(orange|pink)$/.test(c.id) ? 7 : 0));
    else if (FRUIT.has(c.produce)) out.fruit[c.produce] = tier;
    else out.veg[c.produce] = tier;
  }
  for (const g of Object.values(GIANTS)) out.giants[g.item] = 40;
  return out;
}

/** The judges' marks: what it is, its grade, the grower, a little luck, and a family entry. */
export function judge(tier: number, grade: 0 | 1 | 2, farming: number, family: boolean, giant: boolean): number {
  return 22 + tier + grade * 14 + farming * 0.15 + Math.random() * 14 + (family ? 5 : 0) + (giant ? 40 : 0);
}
export const PLACE_AT = [Infinity, 72, 58, 46];
export const placeOf = (score: number) => (score >= PLACE_AT[1] ? 1 : score >= PLACE_AT[2] ? 2 : score >= PLACE_AT[3] ? 3 : 0);
export const PLACE_PAY = { marks: [0, 80, 40, 20], xp: [0, 300, 180, 90], dollies: [0, 6, 4, 2] };
/** The season's show: its year and season. */
export const showSeason = (d = new Date()) => { const m = d.getMonth(); const s = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; return `${m === 11 ? d.getFullYear() + 1 : d.getFullYear()}-${s}`; };

export const SHOW_ITEMS: ItemDef[] = [
  ...GIANT_ITEMS,
  { id: 'show_card_blue', name: 'Second prize card', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'rosette', a: '#2a4a9a', b: '#e8e0c8' }, desc: 'A blue card with "Second" printed on it and the class written underneath in Hester Wragg\'s round hand.' },
  { id: 'show_card_yellow', name: 'Third prize card', kind: 'collectible', rarity: 'common', stack: true, value: 0, icon: { shape: 'rosette', a: '#d8b020', b: '#e8e0c8' }, desc: 'A yellow card with "Third" printed on it. Third is a prize. Hester says so.' },
  { id: 'furn_show_cup', name: 'The Hollin Ford show cup', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'coin', a: '#d8dce4', b: '#6a4a2a' }, furn: { model: 'cup' }, desc: 'Silver, two-handled, on an oak plinth, with a season\'s winners engraved round the foot. Yours for the season, and then yours for good, because Hester lost count of who had it.', stats: 'Furniture: set it on your mantel at home (Arrange the furniture).' },
];
