import type { DialogueTree, GameApi } from '../../game/api';
import type { RegionContent } from './types';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import { PET_COLOURS } from '../petCare';

// Your pet's side of things (data/petCare.ts; owner 2026-11-14: pets named, bonded, cared for and dressed, as in
// Where Winds Meet, and bought at adoption centres like Verandah's). Walk up to the pet at your heels and press E:
// how it is, and feeding it, brushing it, playing with it, naming it and dressing it. Treats and a brush from any
// adoption centre: Lowenna Rice's in Verandah, Martha Nance's in the Shambles at Ansbury, and Dory Pengelly's on the
// Gullmouth quay, each with strays of their own to rehome.

const info = (g: GameApi) => (typeof g.petInfo === 'function' ? g.petInfo() : null);
const name = (g: GameApi) => info(g)?.name ?? 'your pet';
const bar = (v: number) => (v >= 80 ? 'plenty' : v >= 50 ? 'some' : v >= 25 ? 'not much' : 'none');
const nextColour = (cur?: string) => PET_COLOURS[(PET_COLOURS.findIndex(([h]) => h === cur) + 1) % PET_COLOURS.length][0];

const mypet: DialogueTree = {
  start: () => 'hi',
  nodes: {
    hi: {
      speaker: 'narrator',
      text: (g) => {
        const p = info(g);
        if (!p) return 'Nobody at your heels.';
        const look = p.spirits >= 80 ? `${p.name} looks up at you, all tail.` : p.spirits >= 55 ? `${p.name} looks up at you, pleased to be asked.` : p.spirits >= 30 ? `${p.name} looks up at you, and then at the ground.` : `${p.name} doesn't look up.`;
        return `${look} Fed: ${bar(p.fed)}. Clean: ${bar(p.washed)}. Played with: ${bar(p.played)}. ${p.name} is ${p.mood}, and ${p.tier.toLowerCase()} with you (${p.bond} of 100).`;
      },
      options: [
        { text: 'Give a treat.', effect: (g) => g.petCare?.('fed'), next: 'hi' },
        { text: 'Brush them down.', effect: (g) => g.petCare?.('washed'), next: 'hi' },
        { text: 'Play for a while.', effect: (g) => g.petCare?.('played'), next: 'hi' },
        { text: (g) => (info(g)?.named ? 'Call them something else.' : 'Give them a name.'), effect: (g) => g.petRename?.() },
        { text: 'Dress them.', cond: (g) => !!info(g)?.collarOpen, next: 'dress' },
        { text: 'Good dog. Or whatever you are.', cond: (g) => info(g)?.kind !== 'dog' && info(g)?.kind !== 'cat' },
        { text: (g) => `Good ${info(g)?.kind === 'cat' ? 'cat' : 'dog'}.`, cond: (g) => info(g)?.kind === 'dog' || info(g)?.kind === 'cat' },
      ],
    },
    dress: {
      speaker: 'narrator',
      text: (g) => {
        const p = info(g)!;
        const shut = p.wears.filter((w) => !w.open);
        return `${p.name} stands still for it, mostly.${shut.length ? ` More as the bond grows: ${shut.map((w) => w.name.toLowerCase()).join(', ')}.` : ''}`;
      },
      options: [
        { text: (g) => (info(g)?.collar ? 'A collar of another colour.' : 'Put a collar on.'), effect: (g) => g.petDress?.('collar', nextColour(info(g)?.collar)), next: 'dress' },
        { text: 'Take the collar off.', cond: (g) => !!info(g)?.collar, effect: (g) => g.petDress?.('collar', null), next: 'dress' },
        ...(['neckerchief', 'ribbon', 'hat'] as const).map((w) => ({
          text: (g: GameApi) => (info(g)?.wear === w ? `The ${w === 'hat' ? 'hat' : w} in another colour.` : w === 'neckerchief' ? 'Tie on a neckerchief.' : w === 'ribbon' ? 'Tie on a ribbon bow.' : 'Put the little felt hat on.'),
          cond: (g: GameApi) => !!info(g)?.wears.find((x) => x.id === w)?.open,
          effect: (g: GameApi) => g.petDress?.('wear', w, info(g)?.wear === w ? PET_COLOURS[Math.floor(Math.random() * PET_COLOURS.length)][0] : undefined),
          next: 'dress',
        })),
        { text: (g) => `Take ${info(g)?.wear === 'hat' ? 'the hat' : 'it'} off.`, cond: (g) => !!info(g)?.wear, effect: (g) => g.petDress?.('wear', null), next: 'dress' },
        { text: 'That\'ll do.', next: 'hi' },
      ],
    },
  },
};

// ================================================================ The adoption centres

const stray = (id: string, pet: string, nm: string, a: string, b: string, desc: string): ItemDef =>
  ({ id, name: nm, kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bag', a, b }, pet, desc, stats: 'Used, it goes into the wardrobe for good, and follows you about. Walk up to it and press E to name it and look after it.' });

const ITEMS_P: ItemDef[] = [
  { id: 'pet_treats', name: 'Pet treats', kind: 'material', rarity: 'common', stack: true, value: 2, icon: { shape: 'cooked', a: '#a8783a' }, desc: 'Dried fish skins and biscuit ends in a twist of paper. Every pet in the realm knows the sound of the paper.', stats: 'Feed your pet: talk to it (E) and give a treat.' },
  { id: 'pet_brush', name: 'Grooming brush', kind: 'collectible', rarity: 'common', stack: false, value: 12, icon: { shape: 'bag', a: '#8a5a32', b: '#e8dcc0' }, desc: 'A boar-bristle brush with a strap for the hand. Kept, not used up.', stats: 'Brush your pet: talk to it (E). Kept in the pack.' },
  stray('pet_stray_grey', 'stray_grey', 'Shambles grey', '#8a8a8e', '#4a4a4e', 'A grey cat with a white bib who has lived on the lamplighters\' bench all summer and taken their side in every argument.'),
  stray('pet_stray_spaniel', 'stray_spaniel', 'Liver spaniel', '#6a3a1e', '#e8dcc0', 'Ears like two wet socks and a nose that has never once been wrong about where the bacon is.'),
  stray('pet_stray_calico', 'stray_calico', 'Quay calico', '#e8dcc0', '#c86a2a', 'Three colours and three opinions about every gull on the slip. She has never caught one. She never will.'),
  stray('pet_stray_terrier', 'stray_terrier', 'Wheaten terrier', '#d8b878', '#8a6a3a', 'Small, rough-coated and certain he is the size of a horse. He has seen off every rat on the quay, twice.'),
];

const keeper = (id: string, nm: string, title: string, look: NpcDef['look'], at: [number, number], face: [number, number], barks: string[]): NpcDef =>
  ({ id, name: nm, title, look, schedule: [{ from: 0, to: 24, at, face, anim: 'idle' }], barks });

const NPCS_P: NpcDef[] = [
  keeper('adopt_martha', 'Martha Nance', 'Rehoming, the Shambles', { frame: 'f', skin: '#e2b894', hair: '#9a948c', hairStyle: 2, eyes: '#4a5a3a', tunic: '#5a4a32', trim: '#e8dcc0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, age: 0.6 }, [666.5, 289.5], [666.5, 285.5], ['Mind your feet. There\'s a cat under there somewhere.', 'Every one of them was somebody\'s.']),
  keeper('adopt_dory', 'Dory Pengelly', 'Ship\'s cats and quay dogs, Gullmouth', { frame: 'f', skin: '#d8a882', hair: '#3a2418', hairStyle: 4, eyes: '#3a4a5a', tunic: '#2a4a5a', trim: '#e8dcc0', trousers: '#2a3036', boots: '#1e1a16', hat: 'kerchief', hatColor: '#3a5a7a', lashes: true, age: 0.4 }, [1740.5, 597.5], [1740.5, 601.5], ['Ship\'s cats, quay dogs. All good mousers.', 'They come off the boats and don\'t get back on.']),
];

const shopFor = (id: string, owner: string, nm: string, strays: string[]): ShopDef => ({
  id, name: nm, owner,
  stock: [
    ...strays.map((it, i) => ({ item: it, price: 120 + i * 40, when: (g: GameApi) => !g.flag('petOwn:' + it.replace('pet_', '')) && !g.has(it) })),
    { item: 'pet_treats', price: 3 },
    { item: 'pet_brush', price: 20, when: (g: GameApi) => !g.has('pet_brush') },
  ],
  buyRate: () => 0, footer: () => 'Towards their keep. Treats and a brush for the ones already spoken for.',
} as ShopDef);

const keeperTalk = (shop: string, hello: string, about: string): DialogueTree => ({
  start: () => 'hello',
  nodes: {
    hello: { text: hello, options: [{ text: 'Who\'s looking for a home?', effect: (g) => g.openShop(shop) }, { text: 'How do I look after one?', next: 'care' }, { text: 'How did you come to this?', next: 'about' }, { text: 'Good day.' }] },
    care: { text: 'Feed them, keep them brushed, and play with them, every day if you can. They\'ll show you how they\'re keeping: a dog that trails behind you is telling you something. And give them a name. Nobody comes when they\'re called "the dog".', next: 'hello' },
    about: { text: about, next: 'hello' },
  },
});

export const PET_CARE_CONTENT: RegionContent = {
  id: 'petCare',
  items: ITEMS_P,
  npcs: NPCS_P,
  dialogue: {
    mypet,
    adopt_martha: keeperTalk('adopt_martha', 'Martha Nance. I take in what the Shambles throws out, and the Shambles throws out a great deal. Have a look, if you\'ve room in your life.', 'My husband kept the lamps. He brought home a kitten off the ladder one night and said it would be the only one. That was nineteen years and a good many cats ago.'),
    adopt_dory: keeperTalk('adopt_dory', 'Dory Pengelly. Ship\'s cats and quay dogs, for anybody who\'ll have them. They\'re good company and they don\'t ask where you\'ve been.', 'The boats bring them and the boats leave them. A ship\'s cat that jumps off at Gullmouth won\'t get back on, they never do, and somebody has to feed them. I started with one. Don\'t start with one.'),
  },
  shops: {
    adopt_martha: shopFor('adopt_martha', 'adopt_martha', 'Rehoming, the Shambles', ['pet_stray_grey', 'pet_stray_spaniel']),
    adopt_dory: shopFor('adopt_dory', 'adopt_dory', 'Ship\'s cats and quay dogs', ['pet_stray_calico', 'pet_stray_terrier']),
  },
  hooks: (D) => {
    // Lowenna in Verandah sells treats and a brush too
    const l = D.ver_lowenna;
    if (l?.nodes.hello?.options) l.nodes.hello.options.splice(1, 0, { text: 'How do I look after one?', next: 'care' });
    if (l) l.nodes.care = { text: 'Feed them, brush them, play with them, every day you can. They\'ll show you how they\'re keeping. Treats and a brush on the shelf by the door.', next: 'hello' };
  },
};
