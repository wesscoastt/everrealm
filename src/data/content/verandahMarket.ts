import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Verandah's fish market and its adoption centre (owner 2026-11-05: "the market stalls by Verandah dock is a fish
// market"; 2026-11-06: "make the adoption center in Verandah work: a few stray variants as pets for some marks").
// Two fishmongers under the awnings on the dock, who pay better for a catch than any shop on the island and sell
// what came in this morning; and Lowenna Rice at the Adoption Center, Dogs on one side, Cats on the other, who
// lets the strays go to good homes for a little towards their keep (data/pets.ts: the strays).

const stray = (id: string, pet: string, name: string, a: string, b: string, desc: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bag', a, b }, pet, desc, stats: 'Used, it goes into the wardrobe for good: pick it under Pet with Change look. It follows you about.' });

const items: ItemDef[] = [
  stray('pet_stray_tabby', 'stray_tabby', 'Harbour tabby', '#8a6a4a', '#3a2a1e', 'A grey-brown tabby who lived under the fish stalls and ate better than most of the fishermen. She has decided you will do.'),
  stray('pet_stray_ginger', 'stray_ginger', 'Ginger tom', '#d8803a', '#f4e4c8', 'One torn ear, one white sock, and no fear of anything with fewer legs than a horse.'),
  stray('pet_stray_mutt', 'stray_mutt', 'Dockside mutt', '#7a5a3a', '#e8dcc0', 'Part terrier, part sheepdog, part something nobody can name. He wags at everything, including the sea.'),
  stray('pet_stray_black', 'stray_black', 'Black lurcher', '#1e1a18', '#5a4a3a', 'Long-legged and quiet, found sleeping on the Boatman’s step every night for a month. She runs like weather.'),
];

const STALLS: { id: string; name: string; title: string; at: [number, number, number]; face: [number, number]; look: NpcDef['look']; bark: string[]; hello: string }[] = [
  { id: 'ver_fish_tegen', name: 'Tegen Hocking', title: 'Fishmonger', at: [-2910.5, 16, 1899.5], face: [-2906.5, 1899.5],
    look: { frame: 'f', skin: '#e8c0a0', hair: '#c8c4bc', hairStyle: 5, eyes: '#3a5a6a', tunic: '#3a4a5a', trim: '#8a8a7a', shirt: '#e8e0d0', trousers: '#2a2a2e', boots: '#1e1a16', apron: true, hat: 'kerchief', hatColor: '#2f528f', lashes: true, age: 0.65 },
    bark: ['Fresh off the boats!', 'Mackerel, bass, a shark if you’ve the stomach.'],
    hello: 'Tegen Hocking, and these are the best fish on the island, because the boats tie up right there and I’m the first stall they reach. Buying or selling? I pay more for a good catch than any shop in town.' },
  { id: 'ver_fish_jory', name: 'Arthur Bolitho', title: 'Fishmonger', at: [-2906.5, 16, 1903.5], face: [-2906.5, 1899.5],
    look: { skin: '#c88a62', hair: '#4a3a2a', hairStyle: 0, facial: 2, eyes: '#3a2a1e', tunic: '#5a3a2a', trim: '#8a6a3a', shirt: '#d8ccb0', trousers: '#2a2620', boots: '#1e1a16', apron: true, hat: 'cap', hatColor: '#3a3a4a', build: 1.15 },
    bark: ['Two for one on mackerel. Don’t tell Tegen.', 'Shrimp by the bucket!'],
    hello: 'Arthur Bolitho. Tegen’s cheaper, I’m nicer. Bring me your catch, or take some of mine.' },
];

const npcs: NpcDef[] = [
  ...STALLS.map((s) => ({ id: s.id, name: s.name, title: s.title, look: s.look, schedule: [{ from: 5, to: 19, at: [s.at[0], s.at[2]] as [number, number], face: s.face, anim: 'idle' as const, y: s.at[1] }], barks: s.bark })),
  { id: 'ver_lowenna', name: 'Lowenna Rice', title: 'The Adoption Center', look: { frame: 'f', skin: '#d8b090', hair: '#6a3a1e', hairStyle: 1, eyes: '#4a6a3a', tunic: '#4a6a3a', trim: '#e8dcc0', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [-2885.5, 1986.5], face: [-2885.5, 1983.5], anim: 'idle', y: 24 }],
    barks: ['Dogs that way, cats that way. Mind the door.', 'Every one of them was somebody’s once.'] },
];

const fishTalk = (id: string, hello: string): DialogueTree => ({
  start: () => 'hello',
  nodes: { hello: { text: hello, options: [{ text: 'Let’s trade.', effect: (g) => g.openShop(id) }, { text: 'Good day.' }] } },
});

const lowenna: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'The Adoption Center. Every stray on the island ends up here sooner or later, usually by way of the fish stalls. They go to good homes for a little towards their keep. Want to meet them?',
      options: [
        { text: 'Who’s looking for a home?', effect: (g) => g.openShop('ver_lowenna') },
        { text: 'Where do they all come from?', next: 'from' },
        { text: 'Good day.' },
      ],
    },
    from: { text: 'The boats, mostly. A ship’s cat jumps off in Verandah and doesn’t get back on. A sailor’s dog follows a smell up the quay and misses the tide. And then there are kittens, because there are always kittens.', next: 'hello' },
  },
};

const FISH = ['raw_shrimp', 'raw_mackerel', 'raw_bass', 'raw_seabass', 'raw_flounder', 'raw_snapper', 'raw_tuna', 'raw_salmon'];
const shops: Record<string, ShopDef> = {
  ver_fish_tegen: { id: 'ver_fish_tegen', name: 'Tegen Hocking’s fish', owner: 'ver_fish_tegen', stock: FISH.slice(0, 6).map((item, i) => ({ item, price: 4 + i * 4 })), buyRate: () => 0.75, footer: () => 'Tegen pays three quarters of a fish’s worth: better than any shop.' } as ShopDef,
  ver_fish_jory: { id: 'ver_fish_jory', name: 'Arthur Bolitho’s fish', owner: 'ver_fish_jory', stock: FISH.slice(2).map((item, i) => ({ item, price: 9 + i * 5 })), buyRate: () => 0.7, footer: () => 'Arthur pays seven tenths of a fish’s worth.' } as ShopDef,
  ver_lowenna: { id: 'ver_lowenna', name: 'The Adoption Center', owner: 'ver_lowenna', stock: items.map((it, i) => ({ item: it.id, price: 120 + i * 40, when: (g: import('../../game/api').GameApi) => !g.has(it.id) })), buyRate: () => 0, footer: () => 'Towards their keep. Every one is wormed and has had a bath, which none of them enjoyed.' } as ShopDef,
};

export const VERANDAH_MARKET: RegionContent = {
  id: 'verandahMarket', items, npcs,
  dialogue: { ver_fish_tegen: fishTalk('ver_fish_tegen', STALLS[0].hello), ver_fish_jory: fishTalk('ver_fish_jory', STALLS[1].hello), ver_lowenna: lowenna },
  shops,
};
