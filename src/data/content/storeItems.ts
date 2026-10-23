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

const pet = (id: string, name: string, a: string, b: string, desc: string): ItemDef => ({
  id: 'pet_' + id, name, kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'bag', a, b }, pet: id, desc,
  stats: 'From the Everrealm store. Use it to add them to your wardrobe for good: call them under Pet with Change look. Looks only.',
});
ITEMS.push(
  pet('kitten', 'Hearth kitten', '#e8a050', '#f8f0e0', 'A ginger kitten who will follow you to the end of the world, providing the end of the world has a warm stone to sit on.'),
  pet('pup', 'Shepherd\'s pup', '#1e1a18', '#f4eee4', 'A collie pup from the fells, too young to work and too keen to sit still. Herds you, mostly.'),
  pet('duckling', 'Puddle duckling', '#e8d060', '#c8a030', 'Hatched under a hen in Hollin Ford and has never once wondered why the hen was a hen.'),
  pet('hare', 'Moon hare', '#f2f0ea', '#cfd8e8', 'A white hare, which the dales say is a witch who forgot the way back. She doesn\'t seem to mind.'),
  pet('piglet', 'Truffle piglet', '#e8b0a0', '#6a4a3a', 'Small, pink, and certain there is something buried under every tree you stop beside.'),
);
ITEMS.push({
  id: 'pet_hen', name: 'Speckled hen', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bag', a: '#c8a070', b: '#d84a2a' }, pet: 'hen',
  desc: 'A speckled hen who has decided you\'re hers. Where she came from, she won\'t say.',
  stats: 'Use it to add her to your wardrobe for good: call her under Pet with Change look, on the character screen. Looks only.',
});

export const STORE_CONTENT: RegionContent = { id: 'store', items: ITEMS };
