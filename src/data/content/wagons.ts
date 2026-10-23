import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// WAGONS: a horse (or a slabback) in the shafts and a wagon behind, yours to drive anywhere a horse
// goes. Like the Charter's carts, but your own: your group rides on the benches in the back, and the
// bed holds goods. Get down and the wagon stands where you left it, so you can load it while you work
// a seam or a stand of timber, and drive the lot home. A wagon rolls a little slower than a horse.
// Sold at the stables (data/stables.ts) and, in Morrow, by Cass Moran at Tenwells (content/mounts.ts).

type Look = NonNullable<ItemDef['mount']>;
const wagon = (id: string, name: string, rarity: ItemDef['rarity'], m: Look, desc: string): ItemDef => ({
  id, name, kind: 'collectible', rarity, stack: false, value: 0, icon: { shape: 'wheel', a: m.wagon!.paint ?? '#7a2a24', b: m.coat },
  mount: m, desc,
  stats: `Seats ${m.seats}: you on the box, and ${(m.seats ?? 1) - 1} of your group on the benches (E beside it). The bed holds ${m.wagon!.bed} kinds of goods: get down (G) and it stands where you left it; load it from beside it. Rolls a little slower than a horse.`,
});

const ITEMS: ItemDef[] = [
  wagon('wagon_cart', 'Carrier\'s cart', 'uncommon', { coat: '#8a5a2e', mane: '#1e1610', cloth: '#2e4a7a', seats: 3, wagon: { kind: 'cart', bed: 16, paint: '#2e4a7a' } },
    'An open cart with a bench across the back, the kind the carriers run between the market towns. Holds a fair load of ore or timber and two friends who don\'t mind the smell of either.'),
  wagon('wagon_covered', 'Drover\'s wagon', 'rare', { coat: '#3a2418', mane: '#1a1210', cloth: '#7a2e22', breed: 'shire', seats: 5, wagon: { kind: 'covered', bed: 30, paint: '#7a2a24', canvas: '#e8dcc0' } },
    'A long wagon under a canvas tilt, a company shire in the shafts. The drovers live in these from spring to Goose Fair. Four can ride in the back out of the rain.'),
  wagon('wagon_caravan', 'Tenwells caravan', 'epic', { coat: '#6a6258', mane: '#9a9488', cloth: '#c8903a', breed: 'slabback', seats: 5, wagon: { kind: 'covered', bed: 40, paint: '#2a6a6a', canvas: '#c8903a' } },
    'A caravan wagon off the Glass Flats, its tilt dyed the colour of the dunes, a slabback in the shafts that has never once hurried. The trains between the wells carry a season\'s water in these.'),
];

export const WAGON_CONTENT: RegionContent = { id: 'wagons', items: ITEMS };
