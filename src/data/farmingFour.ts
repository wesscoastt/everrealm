import type { ItemDef } from './items';
import type { CropDef, Season } from './farming';

// Farming, part four (docs/briefs/farming-cozy.md, owner 2026-11-14: "farming and gardening should be in depth like
// cozy games"). Flowers, crossed for new colours the way Animal Crossing's are: plant two colours side by side and
// now and then a seed sets that is neither. Bees, whose honey tastes of the flowers growing nearest the hive, and
// who set more fruit on the berries, squashes and climbers round them. And a greenhouse, where everything grows as
// if it were its own season. The working of them is game/HomeFarm.ts.

export type Colour = 'red' | 'yellow' | 'white' | 'orange' | 'pink' | 'purple' | 'blue';
export const COLOURS: Record<Colour, { name: string; hex: string }> = {
  red: { name: 'Red', hex: '#c8202a' }, yellow: { name: 'Yellow', hex: '#e8c020' }, white: { name: 'White', hex: '#f0ece0' },
  orange: { name: 'Orange', hex: '#e87a20' }, pink: { name: 'Pink', hex: '#e87aa0' }, purple: { name: 'Purple', hex: '#7a3a9a' }, blue: { name: 'Blue', hex: '#3a5ac8' },
};
/** The colours sold as seed; the rest only come from crossing. */
export const BASE_COLOURS: Colour[] = ['red', 'yellow', 'white'];

/** The kinds of flower: when they flower best, how long they take, what Farming they want. */
export const SPECIES: { id: string; name: string; one: string; level: number; minutes: number; season: Season; leaf: string; value: number }[] = [
  { id: 'pansy', name: 'Pansies', one: 'pansy', level: 2, minutes: 12, season: 'winter', leaf: '#4a7a3a', value: 4 },
  { id: 'tulip', name: 'Tulips', one: 'tulip', level: 10, minutes: 18, season: 'spring', leaf: '#5a9a4a', value: 7 },
  { id: 'rose', name: 'Roses', one: 'rose', level: 30, minutes: 40, season: 'summer', leaf: '#3a6a2a', value: 14 },
];

/** What two colours side by side can set, and how likely it is at each picking. */
export const CROSSES: { a: Colour; b: Colour; makes: Colour; chance: number }[] = [
  { a: 'red', b: 'yellow', makes: 'orange', chance: 0.12 },
  { a: 'red', b: 'white', makes: 'pink', chance: 0.12 },
  { a: 'pink', b: 'pink', makes: 'purple', chance: 0.07 },
  { a: 'purple', b: 'orange', makes: 'blue', chance: 0.04 },
  { a: 'purple', b: 'purple', makes: 'blue', chance: 0.02 },
];
/** The colour a pair can set, if any. */
export const crossOf = (a: Colour, b: Colour) => CROSSES.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));

export const flowerId = (sp: string, c: Colour) => `${sp}_${c}`;
/** A flower crop's species and colour, from its id. */
export const FLOWER_OF: Record<string, { sp: string; c: Colour }> = {};

const rarer: Record<Colour, number> = { red: 1, yellow: 1, white: 1, orange: 1.6, pink: 1.6, purple: 2.6, blue: 4 };
export const FLOWER_CROPS: CropDef[] = [];
export const FLOWER_ITEMS: ItemDef[] = [];
export const FLOWER_SEED_PRICES: [string, number, number][] = [];
for (const sp of SPECIES) for (const c of Object.keys(COLOURS) as Colour[]) {
  const id = flowerId(sp.id, c), col = COLOURS[c], seed = 'seed_' + id, produce = 'flower_' + id;
  FLOWER_OF[id] = { sp: sp.id, c };
  FLOWER_CROPS.push({
    id, name: `${col.name} ${sp.name.toLowerCase()}`, level: sp.level, patch: 'allotment', seed, produce, minutes: sp.minutes,
    xpPlant: Math.round(14 + sp.level * 2.4), xpPick: Math.round(10 + sp.level * 1.6), yield: [3, 6], shape: 'flower',
    colors: { leaf: sp.leaf, fruit: col.hex }, season: sp.season,
  });
  const v = Math.round(sp.value * rarer[c]);
  FLOWER_ITEMS.push({
    id: seed, name: `${col.name} ${sp.one} seed`, kind: 'material', rarity: rarer[c] >= 2.6 ? 'rare' : rarer[c] > 1 ? 'uncommon' : 'common', stack: true, value: Math.max(2, Math.round(v / 2)),
    icon: { shape: 'ore', a: col.hex, b: sp.leaf },
    desc: BASE_COLOURS.includes(c) ? `A twist of paper with ${col.name.toLowerCase()} written on it in Bertram's hand.` : `Saved from a seed head that set between two other colours. Nobody sells these.`,
    stats: 'Plant it in tilled ground (Farming). Use it from your bag to sow it next. Grown beside another colour, a flower can set seed of a new one.',
  });
  FLOWER_ITEMS.push({
    id: produce, name: `${col.name} ${sp.name.toLowerCase()}`, kind: 'material', rarity: rarer[c] >= 2.6 ? 'rare' : rarer[c] > 1 ? 'uncommon' : 'common', stack: true, value: v,
    icon: { shape: 'bread', a: col.hex, b: sp.leaf },
    desc: c === 'blue' ? `A bunch of blue ${sp.name.toLowerCase()}, which the old gardeners said could not be grown. They were wrong, and they would have liked to know it.` : `A bunch of them, cut long and tied with twine.`,
    stats: 'Sells to anyone with a vase. Grown near a hive, it flavours the honey.',
  });
  if (BASE_COLOURS.includes(c)) FLOWER_SEED_PRICES.push([seed, Math.max(3, Math.round(v * 0.8)), sp.level]);
}

/** A hive: a jar of honey every two hours, up to three waiting. */
export const HIVE = { everyMins: 120, most: 3, reach: 6 };
/** Honey by the flowers nearest the hive (most of one kind), or the garden's. */
export const HONEYS: Record<string, string> = { pansy: 'honey_pansy', tulip: 'honey_tulip', rose: 'honey_rose', none: 'honey_garden' };

/** The greenhouse: five tiles square, everything in it grown as if in season. */
export const GREENHOUSE = { size: 5 };

const honey = (id: string, name: string, a: string, value: number, heal: number, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: value >= 40 ? 'rare' : 'uncommon', stack: true, value, icon: { shape: 'bread', a, b: '#8a5a1e' }, heal, desc, stats: `Restores ${heal} health. Sells well; cooks pay more for it.` });

export const FARM_FOUR_ITEMS: ItemDef[] = [
  ...FLOWER_ITEMS,
  honey('honey_garden', 'Garden honey', '#d89a2a', 18, 90, 'Amber and runny, from whatever was flowering in the garden that week.'),
  honey('honey_pansy', 'Pansy honey', '#e8c860', 24, 110, 'Pale and mild, from the winter pansies. The bees work them on any day it isn\'t freezing.'),
  honey('honey_tulip', 'Tulip honey', '#d8a040', 30, 130, 'Light gold and a little sharp. Tulip honey is rare because bees mostly ignore tulips; yours didn\'t.'),
  honey('honey_rose', 'Rose honey', '#c8703a', 44, 160, 'Dark and fragrant. A spoon of it in tea and the room smells of June.'),
  { id: 'beehive', name: 'Beehive', kind: 'collectible', rarity: 'uncommon', stack: false, value: 160, icon: { shape: 'chest', a: '#ece6d6', b: '#d8a040' }, desc: 'A white-painted box hive on legs, with a colony of the Wend\'s brown bees already in it. They are calm until they are not.', stats: 'Set it up in your own yard (Farming). A jar of honey every two hours, flavoured by the flowers nearest it; berries, squashes and climbers near it bear more.' },
  { id: 'greenhouse_kit', name: 'Greenhouse in pieces', kind: 'collectible', rarity: 'rare', stack: false, value: 1200, icon: { shape: 'chest', a: '#bfe4ff', b: '#6a4a2a' }, desc: 'Oak glazing bars, a crate of panes in straw and a sheet of drawings. Bertram swears all the pieces are there.', stats: 'Raise it in your own yard (Farming): five tiles square. Everything grown inside grows as if it were its own season, and comes up better.' },
];
