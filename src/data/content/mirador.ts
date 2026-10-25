import type { DialogueTree, DNode } from '../../game/api';
import type { ItemDef } from '../items';
import { MIRADOR_GATE, MIRADOR_LOOKOUT, VILLAS } from '../mirador';
import type { GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';

// The Mirador, the houses on the scarp above Callis (data/mirador.ts, world/sites.ts buildMirador).
// Teresa Mas sells them for the families; two are still lived in. Bernat Roig, the last of the Roig
// shipowners, watches the bay through a spyglass every evening for a ship that isn't coming. Nina Vidal
// paints the view, and has painted it for thirty years, and says she hasn't got it yet.
//
// miradorShip, THE BONA SORT (Bernat Roig): his last ship went to the Keys for salt and is late. He asks
// you to ask Pau Ferrer, the harbourmaster, whether she's been sighted. 'pau' -> 'bernat' -> done. Pau
// says she was lost off the Teeth five years ago, and Bernat signed the book himself. Choice roigTold =
// 'truth' (he puts the glass away, and gives it to you) | 'kind' (he goes on watching, and pays you).

const SHIP = 'miradorShip';
// miradorLight, SOMEONE ON THE BENCH (Nina Vidal): Nina has seen someone asleep on the lookout bench at
// the lane's end, night after night. It's Clara Ferrer, whose family built the Long Deck and lost it; she
// comes up from the city to look at it. She asks for her mother's tin box, hidden under the deck boards
// the night the bailiffs came. 'night' (find who it is, after dark) -> 'box' -> 'clara' -> done. Choice
// claraTold = 'teresa' (Teresa takes her on to keep the empty houses: she lives in the office) | 'quiet'.
const LIGHT = 'miradorLight';
const longDeck = VILLAS.find((v) => v.kind === 'longdeck')!;
/** Clara at the lookout's rail behind the middle bench; the tin box under the third board from the Long Deck's west end, by the rail. */
const BENCH: [number, number] = [MIRADOR_LOOKOUT.x + 0.5, MIRADOR_LOOKOUT.edge + 2.2];
const TIN: [number, number] = [longDeck.x0 - 2.5, longDeck.edge + 3.5];
const roig = VILLAS.find((v) => v.kind === 'roig')!, vidal = VILLAS.find((v) => v.kind === 'vidal')!;
/** Teresa's office door, on the lane just inside the gatehouse; Bernat's spyglass; Nina's easel. */
const OFFICE: [number, number] = [MIRADOR_GATE.x + 8.5, MIRADOR_GATE.z - 4.8];
const GLASS: [number, number] = [roig.x0 + 5.5, roig.edge + 0.3];
const EASEL: [number, number] = [vidal.x0 + 4.5, vidal.edge + 0.25];

const look = (o: Partial<NpcDef['look']>) => o as NpcDef['look'];

const items: ItemDef[] = [
  { id: 'furn_lounger', name: 'Deck lounger', kind: 'collectible', rarity: 'uncommon', stack: true, value: 45, icon: { shape: 'log', a: '#8a6440', b: '#e8dcc0' }, desc: 'Teak slats on a low frame, a long back that tilts, a cushion in sailcloth. The Mirador\'s families had them made in Saltpenny from old deck planking.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'lounger', tint: 0 } },
  { id: 'furn_easel', name: 'Painter\'s easel', kind: 'collectible', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'log', a: '#c8a070', b: '#3a6a9a' }, desc: 'Three legs, a ledge, and a canvas Nina Vidal started and gave up on. The bay, with the light wrong, she says.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'easel' } },
  { id: 'ferrer_tin', name: 'A tin box', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'chest', a: '#8a8a88', b: '#4a4a48' }, desc: 'Japanned tin, gone to rust at the corners, wrapped in oilcloth. It rattles. Not yours to open.' },
  { id: 'furn_spyglass', name: 'Captain\'s spyglass', kind: 'collectible', rarity: 'rare', stack: true, value: 120, icon: { shape: 'bar', a: '#c8a050', b: '#5a3a20' }, desc: 'Brass on an oak tripod, the lens ground in Callis. It came off the Bona Sort\'s first captain, and Bernat Roig watched the bay through it for five years.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'spyglass' } },
];

const npcs: NpcDef[] = [
  {
    land: 'morrow', id: 'clara_ferrer', name: 'Clara Ferrer', title: 'Used to live here',
    look: look({ skin: '#d8a878', hair: '#2a1e18', hairStyle: 2, eyes: '#3a2a1e', tunic: '#5a4a40', trim: '#8a7a6a', trousers: '#3a3430', boots: '#2a1e14', lashes: true, build: 0.9, age: 0.25 }),
    // After dark on the lookout bench; by day gone down into the city (or, kept on, at Teresa's office)
    schedule: [
      { from: 20, to: 24, at: BENCH, face: [BENCH[0], BENCH[1] + 8], anim: 'idle' },
      { from: 0, to: 6, at: BENCH, face: [BENCH[0], BENCH[1] + 8], anim: 'idle' },
      { from: 6, to: 20, at: [OFFICE[0], OFFICE[1] + 1.5], face: [OFFICE[0], OFFICE[1] + 4], anim: 'idle', indoors: true },
    ],
    barks: ['That one was ours. The long deck.', 'You can see the whole bay from here. We used to.'],
  },
  {
    land: 'morrow', id: 'teresa_mas', name: 'Teresa Mas', title: 'Selling the Mirador\'s houses',
    look: look({ skin: '#d8a878', hair: '#2a1e18', hairStyle: 3, eyes: '#3a2a1e', tunic: '#2a2a30', trim: '#e8e2d4', trousers: '#2a2a30', boots: '#1a1410', lashes: true, build: 0.95, age: 0.5 }),
    schedule: [
      { from: 8, to: 19, at: OFFICE, face: [OFFICE[0], OFFICE[1] + 4], anim: 'idle' },
      { from: 19, to: 24, at: [OFFICE[0], OFFICE[1] - 2.6], face: [OFFICE[0], OFFICE[1] - 5], anim: 'idle', indoors: true },
      { from: 0, to: 8, at: [OFFICE[0], OFFICE[1] - 2.6], face: [OFFICE[0], OFFICE[1] - 5], anim: 'idle', indoors: true },
    ],
    barks: ['The empty houses are open. Go in, look all you like.', 'Every house up here has a deck. Every one has a story. I only sell the decks.'],
  },
  {
    land: 'morrow', id: 'bernat_roig', name: 'Bernat Roig', title: 'Shipowner',
    look: look({ skin: '#c89070', hair: '#e8e4dc', hairStyle: 1, eyes: '#4a3a2a', tunic: '#1e2a3a', trim: '#c8a050', trousers: '#2a2a30', boots: '#1a1410', beard: true, build: 1.05, age: 0.9 }),
    schedule: [
      { from: 7, to: 15, at: [GLASS[0] - 2, GLASS[1] - 0.6], face: [GLASS[0] - 2, GLASS[1] + 8], anim: 'idle' },
      { from: 15, to: 23, at: [GLASS[0], GLASS[1] - 0.9], face: [GLASS[0], GLASS[1] + 8], anim: 'idle' },
      { from: 23, to: 24, at: [roig.x0 + 6.5, roig.z0 + 4.5], face: [roig.x0 + 6.5, roig.z0 + 7], anim: 'idle', indoors: true },
      { from: 0, to: 7, at: [roig.x0 + 6.5, roig.z0 + 4.5], face: [roig.x0 + 6.5, roig.z0 + 7], anim: 'idle', indoors: true },
    ],
    barks: ['Black hull, white band. You\'d know her.', 'Wind\'s from the Keys. Good.'],
  },
  {
    land: 'morrow', id: 'nina_vidal', name: 'Nina Vidal', title: 'Painter',
    look: look({ skin: '#e0b090', hair: '#8a8a88', hairStyle: 2, eyes: '#4a6a7a', tunic: '#7a5a3a', trim: '#3a6a9a', trousers: '#4a3a30', boots: '#2a1e14', apron: true, lashes: true, build: 0.9, age: 0.7 }),
    schedule: [
      { from: 6, to: 12, at: [EASEL[0], EASEL[1] - 0.9], face: [EASEL[0], EASEL[1] + 8], anim: 'idle' },
      { from: 12, to: 16, at: [vidal.x0 - 2.5, vidal.z0 - 2.5], face: [vidal.x0 - 2.5, vidal.z0 + 2], anim: 'idle' },
      { from: 16, to: 21, at: [EASEL[0], EASEL[1] - 0.9], face: [EASEL[0], EASEL[1] + 8], anim: 'idle' },
      { from: 21, to: 24, at: [vidal.x0 + 3.5, vidal.z0 + 3.5], face: [vidal.x0 + 3.5, vidal.z0 + 6], anim: 'idle', indoors: true },
      { from: 0, to: 6, at: [vidal.x0 + 3.5, vidal.z0 + 3.5], face: [vidal.x0 + 3.5, vidal.z0 + 6], anim: 'idle', indoors: true },
    ],
    barks: ['Don\'t stand in my light. Or do. It\'s wrong anyway.', 'Morning light comes off the river first. Then the roofs.'],
  },
];

/** What Teresa says of each house for sale, and what it costs. */
const forSale = VILLAS.filter((v) => v.id);
const teresaHouses: Record<string, DNode> = Object.fromEntries(forSale.map((v) => [
  'house_' + v.id,
  {
    text: `${v.name[0].toUpperCase() + v.name.slice(1)}. ${v.blurb} ${v.price.toLocaleString()} marks, and it's yours outright: no lease, no rent.`,
    options: [{ text: 'Tell me about another.', next: 'houses' }, { text: 'I\'ll go and look.' }],
  } satisfies DNode,
]));

const teresa: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('metTeresa') ? 'Back to look again? The empty ones are open. Walk round as long as you like.' : 'Teresa Mas. I sell the houses on the Mirador for the families that built them, the ones who\'d rather not be here when someone else buys. The empty ones stand open: go in, walk round, stand on the deck. Then come and talk about money.'),
      effect: (g) => g.setFlag('metTeresa', true),
      options: [
        { text: 'Which houses are for sale?', next: 'houses' },
        { text: 'Why are the families selling?', next: 'why' },
        { text: 'How does buying one work?', next: 'how' },
        { text: 'What do you have for a deck?', effect: (g) => g.openShop('teresa') },
        { text: 'Good day.' },
      ],
    },
    houses: {
      text: 'From the gate east: the Stair House, the Point, the Long Deck, the Lantern House, the Tower House, the Cistern House and the Cypress House. The Roigs and the Vidals still live in theirs. Which?',
      options: [
        ...forSale.slice(0, 6).map((v) => ({ text: v.name[0].toUpperCase() + v.name.slice(1) + '.', next: 'house_' + v.id })),
        { text: 'The Cypress House.', next: 'house_' + forSale[6].id },
      ],
    },
    why: {
      text: 'The salt trade went to the Brethren, and the Brethren don\'t pay duty, so the families who did couldn\'t sell salt for what it cost them. That was ten years ago. Some held on. Most have gone down to the city, or out to the Counties, or into the ground. The Roigs held on longest. Bernat still watches for his ships. Be kind to him.',
      options: [{ text: 'Which houses are for sale?', next: 'houses' }, { text: 'Good day.' }],
    },
    how: {
      text: 'You pay the price at the gate and I give you the keys. No lease, nothing to the Assembly, it\'s yours. One house to a household, mind: if you have a cottage or a lot from the Charter, they take it back and pay you for it. If you tire of it, I\'ll buy it back for the family at two thirds.',
      options: [{ text: 'Which houses are for sale?', next: 'houses' }, { text: 'Good day.' }],
    },
    ...teresaHouses,
  },
};

const bernat: DialogueTree = {
  start: (g) => (at(g, SHIP) === 'bernat' ? 'back' : at(g, SHIP) === 'pau' ? 'wait' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag('roigTold') === 'truth' ? 'I\'ve been looking at the city instead. There\'s a lot of it. I never noticed.' : g.flag('roigTold') === 'kind' ? 'Not today. Tomorrow, maybe. The wind\'s been wrong.' : 'Bernat Roig. You\'re on my deck, which means Teresa\'s showing houses again. Look all you like. Don\'t touch the glass.'),
      options: [
        { text: 'What are you watching for?', next: 'ship1', cond: (g) => !at(g, SHIP) },
        { text: 'Tell me about the Roigs.', next: 'family' },
        { text: 'Good evening.' },
      ],
    },
    family: {
      text: 'Eleven ships, once. Salt from the Keys, wine from the Amberwold, Counties wool the other way. My grandfather built this house so he could watch them come in. Now there\'s one, and she\'s late.',
      options: [{ text: 'What are you watching for?', next: 'ship1', cond: (g) => !at(g, SHIP) }, { text: 'Good evening.' }],
    },
    ship1: {
      text: 'The Bona Sort. Last of the Roig ships. Three masts, a black hull with a white band, my colours at the main. She went to the Keys for salt and she\'s late. Pau Ferrer at the harbour would know if anyone\'s spoken her. He doesn\'t come up the hill any more. Would you ask him?',
      options: [
        { text: 'I\'ll ask him.', effect: (g) => g.setStage(SHIP, 'pau') },
        { text: 'Not today.' },
      ],
    },
    wait: { text: 'Pau Ferrer, on the quays. He keeps the book. Black hull, white band.', options: [{ text: 'I\'m going.' }] },
    back: {
      text: 'Well? Has Pau had word of her?',
      options: [
        { text: 'She was lost off the Teeth, five years ago. You signed the book yourself.', next: 'truth' },
        { text: 'No word yet.', next: 'kind' },
      ],
    },
    truth: {
      text: 'I signed it. I remember the pen. It was a bad pen, it blotted, and Pau gave me his. Five years. I\'ve been standing out here five years. Take the glass. I\'ve no more use for it, and it\'s a good one: it came off her first captain, when she was new.',
      options: [{ text: 'I\'m sorry, Bernat.', effect: (g) => { g.give('furn_spyglass'); g.addMarks(150); g.setFlag('roigTold', 'truth'); g.setStage(SHIP, 'done'); } }],
    },
    kind: {
      text: 'No word. Well. The Keys are a long way, and salt\'s slow to load in the wet. She\'ll come. Here, for your legs. It\'s a long hill, and you went down it for an old man.',
      options: [{ text: 'Keep watching, Bernat.', effect: (g) => { g.addMarks(200); g.setFlag('roigTold', 'kind'); g.setStage(SHIP, 'done'); } }],
    },
  },
};

const nina: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('metNina') ? 'Still wrong. Come and see.' : 'Nina Vidal. I paint the view. I\'ve painted it every day for thirty years and I haven\'t got it yet. Don\'t say it\'s lovely. It isn\'t finished.'),
      effect: (g) => g.setFlag('metNina', true),
      options: [
        { text: 'What\'s wrong with it?', next: 'light' },
        { text: 'What are the neighbours like?', next: 'hill' },
        { text: 'Anything wrong on the hill?', next: 'bench', cond: (g) => !at(g, LIGHT) },
        { text: 'Do you sell your easels?', effect: (g) => g.openShop('nina') },
        { text: 'Good day.' },
      ],
    },
    light: {
      text: 'The light. In the morning it comes off the river first, then the roofs, then the sea, and by the time I\'ve mixed the river the roofs have gone. In the evening the Lantern House lights up and the whole bay turns to look at it. I\'ve asked them to draw the curtains. There\'s nobody in it to ask now.',
      options: [{ text: 'What are the neighbours like?', next: 'hill' }, { text: 'Good day.' }],
    },
    bench: {
      text: 'There\'s someone sleeps on the bench at the lookout. Every night this month. I see them when I go out for the moonlight on the water. Gone before Teresa\'s up. I don\'t want them moved on. I want to know they\'ve had something to eat.',
      options: [{ text: 'I\'ll go and see, after dark.', effect: (g) => g.setStage(LIGHT, 'night') }, { text: 'Good day.' }],
    },
    hill: {
      text: 'Fewer every year. The Ferrers had suppers on the Long Deck for fifty, with a fiddler. The Oms had a bathing pool and let the children of the whole hill in it. Old Bernat next door waits for his ship. I paint. Teresa sells. Whoever buys, I\'d like a neighbour who has a supper now and then. I\'d come.',
      options: [{ text: 'What\'s wrong with the painting?', next: 'light' }, { text: 'Good day.' }],
    },
  },
};

const clara: DialogueTree = {
  start: (g) => (at(g, LIGHT) === 'clara' && g.count('ferrer_tin') > 0 ? 'back' : at(g, LIGHT) === 'night' ? 'c1' : at(g, LIGHT) === 'box' ? 'wait' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag('claraTold') === 'teresa' ? 'I keep the empty houses now. I air them, I sweep the decks. I sleep in the office, in a bed. Teresa snores.' : 'I\'m only sitting. It\'s a public bench. The Assembly says so on the sign.'),
      options: [{ text: 'Good night.' }],
    },
    c1: {
      text: 'I\'m not doing any harm. I come up after dark and sit, and I go before Teresa\'s up. That one there, the long deck, was ours. The Ferrers. My father lost it at cards and then lost it again to the bank, and I was nine. I come to look at it.',
      options: [{ text: 'Is there anything you want from it?', next: 'c2' }, { text: 'Sit as long as you like.' }],
    },
    c2: {
      text: 'The night the bailiffs came, my mother put a tin box under the deck boards at the west end, the ones by the rail, and told me never to tell my father. She died that winter. Nobody ever lifted the boards. Would you? I can\'t go past the gate. You can, people like you can.',
      options: [{ text: 'I\'ll get it.', effect: (g) => g.setStage(LIGHT, 'box') }, { text: 'Not tonight.' }],
    },
    wait: { text: 'The west end of the deck, by the rail. The boards lift if you know which. Third from the end.', options: [{ text: 'I\'m going.' }] },
    back: {
      text: 'That\'s it. That\'s hers. Letters, and her ring, and forty marks in old coin she kept from him. Thank you. I don\'t know what I\'ll do with it. Nothing. Keep it. Will you tell Teresa I sleep here?',
      options: [
        { text: 'Teresa needs someone to keep the empty houses. I\'ll speak for you.', effect: (g) => { g.take('ferrer_tin'); g.addMarks(120); g.setFlag('claraTold', 'teresa'); g.setStage(LIGHT, 'done'); } },
        { text: 'No. It\'s a public bench.', effect: (g) => { g.take('ferrer_tin'); g.addMarks(160); g.setFlag('claraTold', 'quiet'); g.setStage(LIGHT, 'done'); } },
      ],
    },
  },
};

const pauNodes: Record<string, DNode> = {
  roig1: {
    text: 'The Bona Sort? I don\'t need the book. Lost with all hands off the Teeth, five years this summer: a revenue cutter saw her go onto the Chair in a blow. I wrote it in the book myself, and Bernat came down and signed under it. He\'s forgotten that. Or he\'s decided to.',
    options: [{ text: 'I\'ll tell him.', effect: (g) => g.setStage(SHIP, 'bernat') }],
  },
};

const quests: Record<string, QuestDef> = {
  [LIGHT]: {
    id: LIGHT, name: 'Someone on the Bench', region: 'bright', depth: 'quest',
    notes: (g, s) => {
      if (s === 'night') return 'Nina Vidal has seen someone asleep on the bench at the Mirador\'s lookout, night after night. Whoever it is comes after dark.';
      if (s === 'box') return 'It\'s Clara Ferrer, whose family built the Long Deck and lost it. Her mother hid a tin box under the deck boards at its west end, by the rail, the night the bailiffs came.';
      if (s === 'clara') return 'I have the tin box. Clara will be on the lookout bench after dark.';
      return g.flag('claraTold') === 'teresa' ? 'Teresa Mas took Clara on to keep the Mirador\'s empty houses. She sleeps in the office now.' : 'Clara still sits on the lookout bench after dark. Nobody else knows.';
    },
    objectives: (_g, s) => (s === 'night' ? [{ text: 'Find who sleeps on the lookout bench, after dark', marker: 'clara_ferrer' }]
      : s === 'box' ? [{ text: 'Lift the deck boards at the Long Deck\'s west end', marker: 'ferrerTin' }]
      : s === 'clara' ? [{ text: 'Bring Clara the tin box, after dark', marker: 'clara_ferrer' }] : []),
    marks: (_g, s): Marks => (s === 'night' || s === 'clara' ? { clara_ferrer: '?' } : {}),
    walk: { cast: ['nina_vidal', 'clara_ferrer'] },
  },
  [SHIP]: {
    id: SHIP, name: 'The Bona Sort', region: 'bright', depth: 'quest',
    notes: (g, s) => {
      if (s === 'pau') return 'Bernat Roig, on the Mirador above Callis, watches the bay every evening for his last ship, the Bona Sort: three masts, a black hull with a white band. He asked me to ask Pau Ferrer, the harbourmaster, if she\'s been sighted.';
      if (s === 'bernat') return 'Pau Ferrer says the Bona Sort went down off the Teeth with all hands five years ago. Bernat signed the book himself. He\'s waiting for an answer on his deck.';
      return g.flag('roigTold') === 'truth' ? 'I told Bernat the truth. He gave me his spyglass. He says he looks at the city now.' : 'I told Bernat there was no word. He\'s still out there every evening, watching the Keys.';
    },
    objectives: (_g, s) => {
      if (s === 'pau') return [{ text: 'Ask Pau Ferrer at the Callis harbour about the Bona Sort', marker: 'pau_ferrer' }];
      if (s === 'bernat') return [{ text: 'Go back to Bernat Roig on the Mirador', marker: 'bernat_roig' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'pau' ? { pau_ferrer: '?' } : s === 'bernat' ? { bernat_roig: '?' } : {}),
    walk: { cast: ['bernat_roig', 'pau_ferrer'] },
  },
};

const shops: Record<string, ShopDef> = {
  teresa: { id: 'teresa', name: 'The Mirador\'s office', owner: 'teresa_mas', stock: [{ item: 'furn_lounger', price: 90 }], buyRate: () => 0.5, footer: () => 'Made in Saltpenny from ship\'s planking' } as ShopDef,
  nina: { id: 'nina', name: 'Nina Vidal\'s', owner: 'nina_vidal', stock: [{ item: 'furn_easel', price: 60 }], buyRate: () => 0.5, footer: () => 'The canvas comes with it. It\'s wrong.' } as ShopDef,
};

export const MIRADOR_CONTENT: RegionContent = {
  id: 'mirador', items, npcs, quests, shops,
  dialogue: { teresa_mas: teresa, bernat_roig: bernat, nina_vidal: nina, clara_ferrer: clara },
  things: [
    {
      id: 'ferrerTin', x: TIN[0], z: TIN[1], y: longDeck.base, label: 'Lift the deck boards by the rail', radius: 2.4,
      when: (g: GameApi) => at(g, LIGHT) === 'box',
      use: (g: GameApi) => { if (!g.give('ferrer_tin')) return; g.setStage(LIGHT, 'clara'); g.toast('Third board from the end lifts on a rusted nail. Under it, in the dark between the joists, oilcloth round a tin box.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'pau_ferrer', (g) => (at(g, SHIP) === 'pau' ? 'roig1' : undefined), pauNodes);
  },
};
