import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// Recipes that have to be learned (data/crafting.ts): dishes the cook trainers sell and the great
// beasts carry, written out on a card. Using the card teaches the recipe for good; the dish then
// shows at any cook fire. The recipes themselves are in data/gameplay.ts RECIPES (learn: ...).

const card = (id: string, dish: string, from: string, desc: string): ItemDef => ({
  id: 'recipe_' + id, name: `Recipe: ${dish}`, kind: 'collectible', rarity: 'rare', stack: false, value: 20,
  icon: { shape: 'letter', a: '#e8dcc0', b: '#8a4a2a' }, teaches: id, desc,
  stats: `Use it to learn ${dish} for good: cook it at any cook fire. ${from}`,
});

const ITEMS: ItemDef[] = [
  // The dishes
  { id: 'harvest_supper', name: 'Harvest supper', kind: 'food', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'cooked', a: '#c8903a' }, heal: 220, buff: { slot: 'food', hp: 0.1, mins: 30 },
    desc: 'Trout on a bed of chanterelles and wild garlic, with bread to mop it up. What the Charter Market stallholders eat when the market\'s done.', stats: 'Restores 220 health; a tenth more health for thirty minutes.' },
  { id: 'bilberry_cordial', name: 'Bilberry cordial', kind: 'food', rarity: 'uncommon', stack: true, value: 45, icon: { shape: 'gel', a: '#4a3a8a', b: '#e8dcc0' }, buff: { slot: 'drink', regen: 0.25, hp: 0.05, mins: 20 },
    desc: 'Bilberries pressed with a cloudberry for sharpness. Ansbury\'s clerks keep a bottle in the drawer for the end of quarter-day.', stats: 'Stamina comes back a quarter faster and a twentieth more health, for twenty minutes.' },
  { id: 'fishermans_pie', name: 'Fisherman\'s pie', kind: 'food', rarity: 'uncommon', stack: true, value: 52, icon: { shape: 'bread', a: '#d8b070' }, heal: 300, buff: { slot: 'food', regen: 0.2, hp: 0.06, mins: 30 },
    desc: 'Mackerel and samphire under a crust. Gullmouth wives bake them on the morning the boats go out, and the men eat them cold at sea.', stats: 'Restores 300 health; stamina back a fifth faster and a little more health, for thirty minutes.' },
  { id: 'pike_broth', name: 'Pike and garlic broth', kind: 'food', rarity: 'rare', stack: true, value: 70, icon: { shape: 'cooked', a: '#8a9a5a' }, heal: 320, buff: { slot: 'food', power: 0.05, hp: 0.08, mins: 30 },
    desc: 'The fellers in Hagworm Wood swear by it before a long day. It tastes of the river and a great deal of garlic.', stats: 'Restores 320 health; blows land a twentieth harder and more health, for thirty minutes.' },
  { id: 'char_glaze', name: 'Char in cloudberry glaze', kind: 'food', rarity: 'rare', stack: true, value: 90, icon: { shape: 'cooked', a: '#e89a5a' }, heal: 420, buff: { slot: 'food', hp: 0.14, regen: 0.12, mins: 40 },
    desc: 'Highland char, glazed with cloudberries boiled down to amber. The Scarth shepherds serve it at a wedding, and nowhere else.', stats: 'Restores 420 health; a seventh more health and stamina back faster, for forty minutes.' },
  // The cards
  card('harvest_supper', 'Harvest supper', 'Sold at the Charter Market in Ansbury.', 'Written on the back of a market licence, with a grease mark where the trout goes.'),
  card('bilberry_cordial', 'Bilberry cordial', 'Sold at the Charter Market in Ansbury.', 'In a clerk\'s hand. "Do not let it boil" is underlined twice.'),
  card('fishermans_pie', 'Fisherman\'s pie', 'Sold at Rook\'s Chandlery in Gullmouth.', 'A Gullmouth recipe, which means it starts "First, catch your mackerel".'),
  card('pike_broth', 'Pike and garlic broth', 'Carried by the Bramble Maw in Hagworm Wood.', 'Stained with river water and something darker. A feller wrote it out for his son, who never got it.'),
  card('char_glaze', 'Char in cloudberry glaze', 'Carried by Rimeglass in the Scarth Highlands.', 'Folded small and kept dry inside a waxed pouch. Somebody meant to cook it at a wedding.'),
];

export const RECIPE_CONTENT: RegionContent = { id: 'recipes', items: ITEMS };
