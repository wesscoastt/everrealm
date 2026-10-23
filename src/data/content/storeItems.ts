import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// What the Everrealm store sells (server/store.mjs CATALOG), as the game's items: mounts with looks
// nobody in the realm sells, and the Founder's cloak (data/capes.ts). Bought on the store page, they
// come to every character on the account the next time they enter the world (game/Game.ts).
// Every mount keeps the same pace: the store sells looks, never strength.

const mount = (id: string, name: string, m: NonNullable<ItemDef['mount']>, desc: string): ItemDef => ({
  id, name, kind: 'collectible', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'shoe', a: m.coat, b: m.cloth }, mount: m, desc,
  stats: 'From the Everrealm store. Use it, or press G, to ride. Every mount keeps the same pace.',
});

const ITEMS: ItemDef[] = [
  mount('mount_store_starstag', 'Starlit stag', { coat: '#24325a', mane: '#d8e8ff', cloth: '#1e2440', breed: 'elk', glow: true }, 'A stag the colour of the sky an hour after sunset, and its antlers lit from inside like frost with a lamp behind it.'),
  mount('mount_store_lanterncat', 'Lantern kilncat', { coat: '#3a2418', mane: '#ffb040', cloth: '#5a1e14', breed: 'cat', glow: true }, 'A kilncat whose stripes glow like coals in a lantern. The Kilnfolk say one sleeps on every forge in Brasswick.'),
  mount('mount_store_gildgriffin', 'Gilded griffin', { coat: '#d8b050', mane: '#f8f4ec', cloth: '#2a3a6a', breed: 'griffin', glow: true }, 'A tower griffin in gold and white, from the oldest eyrie in Callis. Its eyes catch the light like the Assembly\'s seal.'),
];

export const STORE_CONTENT: RegionContent = { id: 'store', items: ITEMS };
