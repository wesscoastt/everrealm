import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import { stableAt, STABLES, type StableDef } from '../stables';
import type { RegionContent } from './types';

// THE STABLES: a stablemaster at each stable outside the towns (data/stables.ts says where), the
// horses they sell, and what they have to say about them. The heartland towns sell working horses
// for a few score marks; the far towns over the necks sell what only they breed, for hundreds.

const SAME = 'Use it, or press G, to ride. Every mount keeps the same pace.';
const halter = (id: string, name: string, rarity: ItemDef['rarity'], coat: string, mane: string, cloth: string, desc: string, extra: { glow?: boolean; breed?: NonNullable<ItemDef['mount']>['breed'] } = {}): ItemDef => ({
  id, name, kind: 'collectible', rarity, stack: false, value: 0, icon: { shape: 'shoe', a: coat, b: cloth },
  mount: { coat, mane, cloth, ...extra }, desc, stats: SAME,
});

const ITEMS: ItemDef[] = [
  halter('halter_piebald', 'Fair-day piebald', 'uncommon', '#3a2a20', '#1a1410', '#7a2a24', 'Black and white in patches no two people describe the same way. Bought and sold at the Ansbury fair more times than anyone has counted.', { breed: 'pied' }),
  halter('halter_carriage', 'Ansbury carriage black', 'uncommon', '#1a1618', '#0e0c0c', '#c8a040', 'Bred to pull a town carriage through a crowd without blinking. Takes the same attitude to everything else.'),
  halter('halter_sorrel', 'Harbour sorrel', 'uncommon', '#b0602a', '#d8a060', '#2a4a6a', 'Red-gold with a flaxen mane. Stands still on a quay while a crate swings over her head.'),
  halter('halter_cream', 'Saltmarsh cream', 'rare', '#e8d8b0', '#f4ecd8', '#3a6a6a', 'Pale as sand. Raised on the marsh behind Gullmouth and never quite dry.'),
  halter('halter_shire', 'Company shire', 'rare', '#3a2418', '#1a1210', '#7a2e22', 'A heavy horse off the ore carts, with white feathered feet the size of buckets.', { breed: 'shire' }),
  halter('halter_seafret', 'Sea-fret grey', 'rare', '#9aa4a8', '#d8e0e4', '#2a3a4a', 'A cliff-top grey the colour of the fog that comes in off the sea. Hard to see in it, which Cragsby thinks is funny.'),
  halter('mount_elk', 'Cliff elk', 'epic', '#6a4a2e', '#3a2a1e', '#4a5a3a', 'A bull elk off the Gannet headland, broken to the saddle. Takes the same paths a horse does and looks at you like you chose them badly.', { breed: 'elk' }),
  halter('halter_fen', 'Fen black', 'rare', '#141214', '#0a0a0a', '#4a5a2a', 'A big black fen horse with feathered feet, bred to walk the soft ground on the Levels without sinking.', { breed: 'shire' }),
  halter('mount_kelpie', 'Mere kelpie', 'epic', '#2a5a5a', '#183a30', '#2a3a3a', 'Her grandmother came up out of the mere one winter and would not go back. Weed grows in her mane and her eyes shine in the dark.', { breed: 'kelpie', glow: true }),
  halter('mount_ram', 'Tor ram', 'epic', '#e0d8c4', '#4a3a2a', '#5a3a4a', 'A moor ram as big as a pony, sure-footed on loose stone and far too stubborn to fall.', { breed: 'ram' }),
  halter('mount_whitestag', 'Holed-stone stag', 'epic', '#f0f0ec', '#d8d8e0', '#3a4a6a', 'A white stag that comes down off Scarrow Tor to the holed stone on the longest night. Its antlers give off a faint light.', { breed: 'elk', glow: true }),
];

/** Each stable's keeper: who they are and what they say. */
const KEEPERS: Record<string, { name: string; title: string; look: NpcDef['look']; bark: string; hello: string; about: string }> = {
  'st-ansbury': {
    name: 'Joss Pellow', title: 'Stablemaster, Ansbury',
    look: { skin: '#d8a882', hair: '#4a3a2a', hairStyle: 0, beard: true, eyes: '#3a4a3a', tunic: '#5a4030', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#3a2a1e', build: 1.1, age: 0.5 },
    bark: 'Town horses. Nothing frightens them.',
    hello: 'Ansbury Stables. Every horse here has been through the fair crowd twice and the market on a Saturday. Nothing frightens them.',
    about: 'Town horses don\'t shy at carts, bells or crowds. That\'s what you\'re paying for. They all go the same pace as any other horse.',
  },
  'st-gullmouth': {
    name: 'Nan Treloar', title: 'Stablemaster, Gullmouth',
    look: { frame: 'f', skin: '#e8c4a4', hair: '#6a3a22', hairStyle: 1, eyes: '#3a5a6a', tunic: '#3a5a6a', trim: '#e0d0a0', trousers: '#2a2a34', boots: '#1e1a18', apron: true, lashes: true, build: 1.0, age: 0.45 },
    bark: 'Marsh-bred, quay-steady.',
    hello: 'Gullmouth Stables. Marsh-bred, every one. They stand still on a quay with a crate going over their heads.',
    about: 'They\'re raised on the salt marsh. Wet feet don\'t bother them and neither does the noise at the harbour.',
  },
  'st-harrowgate': {
    name: 'Walt Brindley', title: 'Horse-master, Harrowgate & Daughters',
    look: { skin: '#c88a62', hair: '#2a2018', hairStyle: 2, beard: true, eyes: '#3a2a1a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#2a2a2a', build: 1.2, age: 0.55 },
    bark: 'Company stock.',
    hello: 'Company Stables. These pulled ore carts till the rails came in. Now they pull whoever pays.',
    about: 'The chestnut\'s a cart horse that learned to be ridden. The shire never learned to hurry, but nothing on the road moves her.',
  },
  'st-cragsby': {
    name: 'Rob Tunstall', title: 'Elk-keeper, Cragsby',
    look: { skin: '#e2b894', hair: '#8a6a4a', hairStyle: 3, eyes: '#4a5a6a', tunic: '#4a5a3a', trim: '#a8906a', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a4a3a', build: 1.05, age: 0.4 },
    bark: 'Mind the antlers.',
    hello: 'You came all this way for a horse? We\'ve got one. We\'ve also got elk.',
    about: 'My grandad caught the first elk on the headland and broke it to the saddle for a bet. They go anywhere a horse goes. They just look at you like you chose the path badly.',
  },
  'st-holme': {
    name: 'Martha Gedge', title: 'Horse-wife, Holme Staithe',
    look: { frame: 'f', skin: '#d8a882', hair: '#9a948c', hairStyle: 2, eyes: '#4a5a4a', tunic: '#4a5a4a', trim: '#c8b080', trousers: '#3a3430', boots: '#2a1e14', cape: '#3a4a3a', hat: 'hood', hatColor: '#3a4a3a', lashes: true, build: 1.02, age: 0.75 },
    bark: 'Keep her off the deep water.',
    hello: 'Staithe Stables. If you\'re here for the kelpie, everyone is. Look at the fen black first. He\'s the sensible one.',
    about: 'The kelpie\'s grandmother came up out of the mere one winter and wouldn\'t go back. Her foals are the same. Keep her away from deep water. She gets ideas.',
  },
  'st-scarrow': {
    name: 'Jory Hosken', title: 'Moorman, Scarrow Tor',
    look: { skin: '#d8a07a', hair: '#cfcac0', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#4a4034', boots: '#3a2a1c', hat: 'wide', hatColor: '#4a3a2a', build: 1.08, age: 0.8 },
    bark: 'Rams. And the stag.',
    hello: 'Tor Stables. Rams for the moor. And the stag, if you\'ve the marks.',
    about: 'Tor rams don\'t fall. Too stubborn. The stag comes down off the tor to the holed stone on the longest night. I\'ve had two in forty years. That\'s the second.',
  },
};

const keeperId = (st: StableDef) => 'stable_' + st.id.slice(3);

const NPCS: NpcDef[] = STABLES.map((st) => {
  const k = KEEPERS[st.id];
  const [x, z] = stableAt(st, -1, 2);
  const [fx, fz] = stableAt(st, -1, 6);
  return { id: keeperId(st), name: k.name, title: k.title, look: k.look, schedule: [{ from: 0, to: 24, at: [x + 0.5, z + 0.5], face: [fx + 0.5, fz + 0.5], anim: 'idle' }], barks: [k.bark] };
});

const DIALOGUE: Record<string, DialogueTree> = Object.fromEntries(STABLES.map((st) => {
  const k = KEEPERS[st.id], id = keeperId(st);
  const tree: DialogueTree = {
    start: () => 'main',
    nodes: {
      main: {
        text: k.hello,
        options: [
          { text: 'Show me your horses.', effect: (g) => g.openShop(id) },
          { text: 'What makes yours different?', next: 'about' },
          { text: 'Bye.' },
        ],
      },
      about: { text: k.about, next: 'main' },
    },
  };
  return [id, tree];
}));

const SHOPS: Record<string, ShopDef> = Object.fromEntries(STABLES.map((st): [string, ShopDef] => {
  const id = keeperId(st);
  return [id, {
    id, name: st.name, owner: id,
    stock: st.stock.map((s) => ({ item: s.item, price: s.price, when: (g: GameApi) => !g.has(s.item) })),
    buyRate: () => 0.3,
    footer: () => 'A horse is yours for good once bought. Every one keeps the same pace.',
  }];
}));

export const STABLE_CONTENT: RegionContent = { id: 'stables', items: ITEMS, npcs: NPCS, dialogue: DIALOGUE, shops: SHOPS };
