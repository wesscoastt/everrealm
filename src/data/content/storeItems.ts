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

const costume = (id: string, name: string, a: string, b: string, desc: string): ItemDef => ({
  id: 'costume_' + id, name, kind: 'collectible', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'chest', a, b }, costume: id, desc,
  stats: 'From the Everrealm store. Use it to add it to your wardrobe for good: put it on under Costume with Change look. It goes over your clothes and armour; looks only.',
});
ITEMS.push(
  costume('kilnplate', 'Kilnfolk forge plate', '#b07a36', '#ffb040', 'Brass plate hammered out on the Kiln\'s own anvils and quenched in the hot springs under Brasswick, with the Wheel\'s marks struck into it while it was still hot. They never quite cooled. The Kilnfolk wear it to the forge on feast days and to their own funerals.'),
  costume('towerknight', 'Callis tower knight', '#e8e6e0', '#2a3a6a', 'White plate and gold, a gorget standing up behind the great helm, and the white light of the towers in its sight. The blue plume means you\'ve stood a night watch on the sea wall. The Assembly does not hand those out.'),
  costume('barrowguard', 'Kingsbarrow honour guard', '#2a2a34', '#9fe8ff', 'Blackened scale, cut to the pattern the Old King\'s guard were buried in, with the cloak gone to rags the way theirs did. The light behind the visor is the colour the barrow-lights burn, and nobody has worked out how to put it out.'),
  costume('heldfur', 'Held herder\'s furs', '#e8ecf0', '#8a9aa8', 'A long white coat and a sabre cat\'s pelt worn as a hood, fangs and all, the way the herders of the Held dress to follow the sabres over the snow. The cat died old. The herders will tell you which one it was.'),
  costume('corsair', 'Saltpenny corsair', '#5a1418', '#d8b050', 'A red coat with the braid still on it over a brigandine, a bandolier, a plumed hat and a gold ring in the ear. Nobody in the Keys asks where the coat came from, and the coat\'s first owner isn\'t asking either.'),
  costume('forester', 'Hagworm forester', '#3a4a2a', '#5a4028', 'Waxed leather, a green hood, a full quiver, and a cloak worn ragged by the brambles: the keepers\' dress in Hagworm Wood. Good for not being seen, by deer or by anyone else.'),
  costume('starmagus', 'Starwatch magus', '#1a2042', '#9fd8ff', 'Midnight wool and silver thread, a tall hat with a star of crystal pinned to it, and a book of the sky chained at the hip: the robes the star-readers of Scarth Watch wore when the Watch had more than one of them. The runes on the hem still light up at night. Ilse Blewitt says they\'re counting.'),
  costume('wallarcher', 'Northgate wall archer', '#2a2826', '#7a1e1a', 'Charcoal leather, a cowl pulled down to the eyes and a red scarf over the rest, a full quiver and a cloak torn by the wind on the wall. Nothing that shines, nothing that rattles. The crow feathers at the shoulder are one for every night on the third tower west of the gate. Most of the wall archers have none.'),
  costume('gravecaller', 'Scarrow Tor gravecaller', '#141216', '#7dffb0', 'Black wool torn at the hem by the gorse, a skull over the face with a crown of bone, two more skulls at the shoulders, and a lantern with nothing in it but a borrowed breath. The barrow-keepers of Tolmen Moor dress like this on the nights they go to ask the dead for something. The moor says the dead only lend.'),
);

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
