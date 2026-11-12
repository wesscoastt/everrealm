import type { ItemDef } from './items';
import type { Recipe } from './gameplay';

// Cooking the catch (owner 2026-11-07: "level-one common fish, minnows and trout, cookable at Cooking 1, and
// everything balanced that way"). Every common fish cooks at Cooking 1, so whatever a new fisher brings home goes
// straight on the fire; an uncommon one at about the Fishing level it bites at; a rare one likewise, a little later.
// What each heals follows how hard it was to catch. The old recipes for minnow, trout, mackerel, huss, pike, sea bass
// and char are in data/gameplay.ts (their levels brought down to match here); these are the fish that had none.

const C = (id: string, name: string, rarity: ItemDef['rarity'], value: number, heal: number, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity, stack: true, value, icon: { shape: 'cooked', a }, desc, heal, stats: `Restores ${heal} health.` });

export const FISH_DISHES: ItemDef[] = [
  C('cooked_perch', 'Pan-fried perch', 'common', 4, 18, '#d0a060', 'Floured and fried in a little fat. Sweeter than it has any right to be.'),
  C('cooked_crappie', 'Fried crappie', 'common', 5, 20, '#c89a58', 'Small and white and flaky. Eat three.'),
  C('cooked_shrimp', 'Boiled shrimp', 'common', 4, 16, '#e8885a', 'Pink, in a twist of paper, shells and all.'),
  C('cooked_flounder', 'Grilled flounder', 'common', 7, 28, '#e0c088', 'Flat as a plate and about as big. Lift the bones out in one piece.'),
  C('cooked_catfish', 'Blackened catfish', 'uncommon', 14, 55, '#8a5a3a', 'Rubbed with pepper and burnt on purpose. The mud taste goes with it.'),
  C('cooked_bass', 'Baked bass', 'uncommon', 18, 70, '#d8b07a', 'Whole, with a lemon if you have one, with salt if you don\'t.'),
  C('cooked_salmon', 'Smoked salmon', 'uncommon', 24, 90, '#e8906a', 'Cold-smoked over oak for a day. Thin slices, on bread.'),
  C('cooked_gar', 'Gar steaks', 'rare', 34, 140, '#c8a070', 'The scales come off with a hatchet. What\'s underneath is worth it.'),
  C('cooked_tuna', 'Seared tuna', 'rare', 40, 160, '#b84a4a', 'Red in the middle, black at the edges, and gone in a minute.'),
  C('cooked_snapper', 'Snapper stew', 'rare', 44, 175, '#a8703a', 'A great pot of it, enough for the whole boat. Mind the beak.'),
  C('cooked_stingray', 'Ray wing in butter', 'rare', 46, 180, '#e0c890', 'The wings come away in ribbons, sweet as crab.'),
  C('cooked_mahimahi', 'Mahi-mahi with lime', 'rare', 52, 200, '#e8d070', 'Firm and white, and better for the lime, if the Keys have sent any north.'),
  C('cooked_barracuda', 'Grilled barracuda', 'rare', 56, 215, '#c0b8a0', 'Fierce in the water, mild on the plate.'),
  C('cooked_piranha', 'Piranha broth', 'rare', 60, 230, '#c85a3a', 'More teeth than meat, so it goes in the pot. The broth is famous.'),
  C('cooked_shark', 'Shark steak', 'epic', 80, 300, '#8a9aa8', 'A slab as thick as your wrist. One will feed a crew.'),
];

const R = (id: string, raw: string, level: number, xp: number, time: number, failAtReq: number): Recipe =>
  ({ id, station: 'hearth', skill: 'cooking', level, xp, inputs: { [raw]: 1 }, output: id, count: 1, time, failAtReq, failItem: 'burnt_fish' });

export const FISH_RECIPES: Recipe[] = [
  R('cooked_perch', 'raw_perch', 1, 18, 1.4, 0.35),
  R('cooked_crappie', 'raw_crappie', 1, 20, 1.4, 0.35),
  R('cooked_shrimp', 'raw_shrimp', 1, 16, 1.2, 0.3),
  R('cooked_flounder', 'raw_flounder', 1, 26, 1.6, 0.35),
  R('cooked_catfish', 'raw_catfish', 10, 62, 2, 0.4),
  R('cooked_bass', 'raw_bass', 12, 74, 2, 0.4),
  R('cooked_salmon', 'raw_salmon', 14, 88, 2.2, 0.45),
  R('cooked_gar', 'raw_gar', 26, 150, 2.4, 0.45),
  R('cooked_tuna', 'raw_tuna', 28, 165, 2.4, 0.45),
  R('cooked_snapper', 'raw_snapper', 30, 180, 2.6, 0.45),
  R('cooked_stingray', 'raw_stingray', 32, 190, 2.6, 0.45),
  R('cooked_mahimahi', 'raw_mahimahi', 38, 220, 2.6, 0.5),
  R('cooked_barracuda', 'raw_barracuda', 40, 235, 2.8, 0.5),
  R('cooked_piranha', 'raw_piranha', 42, 250, 2.8, 0.5),
  R('cooked_shark', 'raw_shark', 46, 300, 3, 0.5),
];
