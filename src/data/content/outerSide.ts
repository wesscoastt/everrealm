import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';

// The outer lands' side stories, one to each town at the far end of a road (see outer.ts).
//
// otEggs, ONE IN THREE (Loveday Tonkin, egg-gatherer, Cragsby): the village takes one egg in three from
// the gannet ledges, always has. The north ledge was stripped bare. In the egg store, a basket kept cool
// for the Ansbury cart with a tally slip in it: "W.K. 14 doz. @ 1 mark". Jenkin Kemp, the climmer, owes
// Morwen eleven marks on the slate, and nobody has hired a climmer since the road came. 'store' -> 'wat'
// -> 'loveday' -> done. Choice otEggs = 'village' (the village takes his rope-share) | 'store' (he pays
// the egg store from the egg money, and stops) | 'paid' (you clear his slate yourself).
//
// otReed, BRITTLE REED (Tilly Brewer, reed cutter, Holme Staithe): Harrowgate's drain has taken a yard
// off the mere and the reed beds are drying from the roots up. Ambrose Tilney, the reeve, wants proof
// for the company: a reed from the old bed and one from the drain bank. 'reeds' -> 'tilney' -> done
// ('rent': he writes to Harrowgate for a reed rent, slow but sure) or 'rudd' -> done ('gate': Abner Rudd
// lifts the sluice gate a hand on Saturday nights, when nobody counts).
//
// otCroup, CROUP WINTER (Joss Trewin, shepherd, Scarrow Tor): his girl Bess barks like a seal all night.
// Caddy Nankervis says pass her through the holed stone at sunrise; Senara Kitto says steam and honey,
// and wants bitter-moss for the kettle from the mouth of Carne Barrow. 'moss' -> 'kitto' -> done
// ('both': the kettle, and the stone at sunrise for Joss's sake) or 'caddy' -> done ('kettle': no stone;
// Caddy, ninety years at it, says the kettle herself).

const EGGS = 'otEggs', REED = 'otReed', CROUP = 'otCroup';
/** Cragsby's egg store, where the fowlers keep the eggs cool (outer.ts: the foxes' ring is round it). */
const EGG_STORE: [number, number] = [282.5, -1002.5];
/** Holme Staithe's mere, west of the town (sites: HOLME.x - 40, HOLME.z + 4), from its east edge; the drain's east bank by the sluice. */
const OLD_BED: [number, number] = [-917.5, 1014.5], DRAIN_BANK: [number, number] = [-861.5, 985.5];
/** The mouth of Carne Barrow, east along Tolmen Moor from Scarrow Tor (waits.ts CARNE). */
const BARROW_MOUTH: [number, number] = [465.5, 3046.5];

const items: ItemDef[] = [
  { id: 'egg_slip', name: 'A tally slip', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0cc', b: '#3a2a20' }, desc: 'From the Ansbury egg cart, in pencil: "W.K. 14 doz. @ 1 mark. Paid." Smells of the sea.' },
  { id: 'old_reed', name: 'A reed from the old bed', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'log', a: '#c8b070', b: '#8a7040' }, desc: 'Grey at the root and brittle all the way up. It snaps if you look at it hard.' },
  { id: 'drain_reed', name: 'A reed from the drain bank', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'log', a: '#7a9a4a', b: '#4a6a2a' }, desc: 'Green to the tip. It bends double and springs back.' },
  { id: 'bitter_moss', name: 'Bitter-moss', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#5a7a3a', b: '#2a3a1a' }, desc: 'A fistful of grey-green moss from the barrow\'s mouth. It smells like a wet dog in a church.' },
];

// ---------------------------------------------------------------- One in Three
const lovedayNodes: Record<string, DNode> = {
  eg1: {
    text: 'Somebody\'s stripping the ledges. We take one egg in three. Always have. The north ledge was bare yesterday, every nest.',
    options: [{ text: 'Does it matter that much?', next: 'eg2' }, { text: 'That\'s bad luck.' }],
  },
  eg2: {
    text: 'If the gannets go, Cragsby goes. Whoever it is has to keep them cool before the Ansbury cart. Look in the egg store?',
    options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(EGGS, 'store') }, { text: 'Not now.' }],
  },
  egWait: { text: (g) => (at(g, EGGS) === 'wat' ? 'Whose initials? Go and ask him, then.' : 'The egg store, past the last house. Cool and dark.'), options: [{ text: 'Going.' }] },
  egBack: {
    text: (g) => (g.flag('otEggs') === 'village' ? 'Wat. They took his rope-share off him at the meeting. Fair, by the rule. I\'ll miss him on the north ledge.'
      : g.flag('otEggs') === 'store' ? 'Wat put three marks in the egg store and gave his word. He\'s never broken it. Yet.'
      : 'You paid his slate? Then he\'s no reason to go back down. That\'s a kind thing, or a daft one.'),
    options: [{ text: 'Look after the ledges.', effect: (g) => { g.addMarks(g.flag('otEggs') === 'paid' ? 90 : g.flag('otEggs') === 'store' ? 80 : 60); g.setStage(EGGS, 'done'); } }],
  },
};

const watNodes: Record<string, DNode> = {
  wk1: {
    text: 'That\'s mine. Fourteen dozen. I\'ll not say it isn\'t.',
    options: [{ text: 'Why strip the ledge?', next: 'wk2' }],
  },
  wk2: {
    text: 'I owe Morwen eleven marks on the slate, and nobody\'s hired a climmer since the road came. The Ansbury man pays a mark a dozen.',
    options: [{ text: 'The village will want to know.', next: 'wk3' }],
  },
  wk3: {
    text: 'Aye. So what are you going to do?',
    options: [
      { text: 'Tell the village. It\'s their rule, they can decide.', next: 'wkVillage' },
      { text: 'Pay your slate from the egg money, put the rest in the egg store, and stop.', next: 'wkStore' },
      { text: 'I\'ll pay Morwen your slate. Leave the ledges alone.', next: 'wkPaid', cond: (g) => g.marks >= 11 },
    ],
  },
  wkVillage: {
    text: 'Then tell them. I\'ll stand up at the meeting. They\'ll have my rope-share, and they\'ll be right to.',
    options: [{ text: 'I\'m sorry, Wat.', effect: (g) => { g.take('egg_slip'); g.setFlag('otEggs', 'village'); g.setStage(EGGS, 'loveday'); } }],
  },
  wkStore: {
    text: 'Eleven to Morwen and three to the store. That\'s all of it. Fine. My word on the ledges. Tell Loveday.',
    options: [{ text: 'I will.', effect: (g) => { g.take('egg_slip'); g.setFlag('otEggs', 'store'); g.setStage(EGGS, 'loveday'); } }],
  },
  wkPaid: {
    text: 'You\'d do that? For a stranger\'s slate? Then I\'ll not go down again unless it\'s for the village. Tell Loveday. Tell her it was me.',
    options: [{ text: 'I will.', effect: (g) => { g.take('egg_slip'); g.addMarks(-11); g.setFlag('otEggs', 'paid'); g.setStage(EGGS, 'loveday'); } }],
  },
};

// ---------------------------------------------------------------- Brittle Reed
const tillyNodes: Record<string, DNode> = {
  rd1: {
    text: 'The reed\'s dying. The drain\'s taken a yard off the mere, and the beds are drying from the roots up.',
    options: [{ text: 'Can anything be done?', next: 'rd2' }, { text: 'Hard luck.' }],
  },
  rd2: {
    text: 'The reeve says he needs proof for the company. Bring him two reeds: one from the old bed, east of the mere, and one from the drain bank.',
    options: [{ text: 'Why two?', next: 'rd3' }],
  },
  rd3: {
    text: 'So he can snap them himself. Ambrose believes what he\'s written down and what he\'s broken.',
    options: [{ text: 'Two reeds, then.', effect: (g) => g.setStage(REED, 'reeds') }],
  },
  rdWait: { text: (g) => (at(g, REED) === 'reeds' ? 'One from the old bed east of the mere, one from the drain bank. Ambrose is by the staithe.' : 'Ambrose has them? Then it\'s up to him. Or whoever you go to next.'), options: [{ text: 'Going.' }] },
  rdBack: {
    text: (g) => (g.flag('otReed') === 'rent' ? 'A reed rent. Ambrose wrote it in his best hand. The company will pay it slowly, and only for the beds he can prove. It\'s more than we had.' : 'Water on the old bed Sunday morning, a hand deep. Nobody knows how. The reed\'s coming green at the roots.'),
    options: [{ text: 'Good cutting.', effect: (g) => { g.addMarks(g.flag('otReed') === 'rent' ? 90 : 70); g.setStage(REED, 'done'); } }],
  },
};

const tilneyNodes: Record<string, DNode> = {
  tl1: {
    text: 'Two reeds. This one snaps. This one bends double. I see.',
    options: [{ text: 'Will the company pay for the beds?', next: 'tl2' }],
  },
  tl2: {
    text: 'I\'m paid by the company and by the village both, so I write everything down. I can write to Harrowgate for a reed rent. They\'ll pay it, slowly.',
    options: [{ text: 'Write to them.', next: 'tlRent' }, { text: 'Slowly isn\'t soon enough. Who opens the sluice?', next: 'tlRudd' }],
  },
  tlRent: {
    text: 'Then I\'ll write tonight. Both reeds go in with the letter. Tell Tilly.',
    options: [{ text: 'I will.', effect: (g) => { g.take('old_reed'); g.take('drain_reed'); g.setFlag('otReed', 'rent'); g.setStage(REED, 'tilly'); } }],
  },
  tlRudd: {
    text: 'Abner Rudd keeps the gate, for the company. You didn\'t hear his name from me. I\'m writing that down too.',
    options: [{ text: 'Thank you, Ambrose.', effect: (g) => { g.take('old_reed'); g.take('drain_reed'); g.setStage(REED, 'rudd'); } }],
  },
};

const ruddNodes: Record<string, DNode> = {
  rr1: {
    text: 'The reed. Everyone wants the reed. The company wants wheat where the mere was.',
    options: [{ text: 'Lift the gate a hand. Just at night.', next: 'rr2' }],
  },
  rr2: {
    text: 'A hand, on a Saturday night, when nobody counts. The wheat won\'t drown, and the reed might drink. If anyone asks, the gate sticks. It does stick.',
    options: [{ text: 'It does.', effect: (g) => { g.setFlag('otReed', 'gate'); g.setStage(REED, 'tilly'); } }],
  },
};

// ---------------------------------------------------------------- Croup Winter
const jossNodes: Record<string, DNode> = {
  cr1: {
    text: 'My girl Bess has the croup. Barking like a seal all night. She\'s four.',
    options: [{ text: 'What does she need?', next: 'cr2' }, { text: 'I hope she mends.' }],
  },
  cr2: {
    text: 'Caddy Nankervis says pass her through the holed stone at sunrise. Senara Kitto says steam and honey. I don\'t know who to listen to.',
    options: [{ text: 'What does Senara need?', next: 'cr3' }],
  },
  cr3: {
    text: 'Bitter-moss for her kettle. It grows in the mouth of Carne Barrow, east along the moor. I can\'t leave Bess.',
    options: [{ text: 'I\'ll fetch it.', effect: (g) => g.setStage(CROUP, 'moss') }, { text: 'Not now.' }],
  },
  crWait: { text: (g) => (at(g, CROUP) === 'moss' ? 'The mouth of Carne Barrow, east along the moor. Grey-green, and it stinks.' : 'Senara\'s at the Tinners\' Arms. Caddy\'s by the stone.'), options: [{ text: 'Going.' }] },
  crAfter: { text: 'Bess slept through last night. First time in a week. I sat up anyway.', options: [{ text: 'Good.' }] },
};

const kittoNodes: Record<string, DNode> = {
  kt1: {
    text: 'That\'s it. Smells like a wet dog in a church. Into the kettle with it.',
    options: [{ text: 'And the holed stone?', next: 'kt2' }],
  },
  kt2: {
    text: 'Steam under a blanket, and honey in warm milk. Joss can take her to the stone at sunrise too. It does no harm.',
    options: [
      { text: 'Do both, then.', next: 'ktBoth' },
      { text: 'No stone. She\'s ill. Keep her by the kettle.', next: 'ktKettle' },
    ],
  },
  ktBoth: {
    text: 'Both, then. The kettle tonight, and Caddy at sunrise with her shawl on. Here: Joss sent this for you. Don\'t argue with a shepherd.',
    options: [{ text: 'I won\'t.', effect: (g) => { g.take('bitter_moss'); g.addMarks(90); g.setFlag('otCroup', 'both'); g.setStage(CROUP, 'done'); } }],
  },
  ktKettle: {
    text: 'Then you go and tell Caddy. Not me. She passed me through that stone when I was two days old.',
    options: [{ text: 'I\'ll tell her.', effect: (g) => { g.take('bitter_moss'); g.setFlag('otCroup', 'kettle'); g.setStage(CROUP, 'caddy'); } }],
  },
};

const caddyNodes: Record<string, DNode> = {
  cd1: {
    text: 'You\'ve come to tell me no stone for the Trewin girl. I can see it on you.',
    options: [{ text: 'She\'s ill. The kettle\'s warmer than the tor at sunrise.', next: 'cd2' }],
  },
  cd2: {
    text: 'Ninety years I\'ve passed babies through that stone. It never cured one. It told them where they were from. Tell Joss I said the kettle.',
    options: [{ text: 'Thank you, Caddy.', effect: (g) => { g.addMarks(90); g.setStage(CROUP, 'done'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [EGGS]: {
    id: EGGS, name: 'One in Three', region: 'gannet', depth: 'quest',
    notes: (g, s) => {
      if (s === 'store') return 'Cragsby takes one egg in three from the gannet ledges. Somebody stripped the north ledge bare. Loveday Tonkin thinks they keep the eggs cool in the egg store before the Ansbury cart.';
      if (s === 'wat') return 'In the egg store, a basket kept for the Ansbury cart and a tally slip: "W.K. 14 doz. @ 1 mark." Jenkin Kemp is a climmer.';
      if (s === 'loveday') return 'Jenkin Kemp stripped the ledge to pay his slate at the Coiled Rope. Loveday should hear what\'s been settled.';
      const c = g.flag('otEggs');
      return c === 'village' ? 'The village took Wat\'s rope-share at the meeting.' : c === 'store' ? 'Wat paid the egg store from the egg money, and gave his word.' : 'I paid Wat\'s slate. He\'ll only go down for the village now.';
    },
    objectives: (_g, s) => (s === 'store' ? [{ text: 'Look in Cragsby\'s egg store', marker: 'otEggStore' }]
      : s === 'wat' ? [{ text: 'Ask Jenkin Kemp about the slip', marker: 'watkemp' }]
      : s === 'loveday' ? [{ text: 'Go back to Loveday Tonkin', marker: 'jennyt' }] : []),
    marks: (_g, s): Marks => (s === 'wat' ? { watkemp: '?' } : s === 'loveday' ? { jennyt: '?' } : {}),
    walk: { cast: ['jennyt', 'watkemp'] },
  },
  [REED]: {
    id: REED, name: 'Brittle Reed', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'reeds') return 'Harrowgate\'s drain has taken a yard off Holme Staithe\'s mere, and the reed beds are dying. Tilly Brewer says the reeve wants proof: a reed from the old bed east of the mere, and one from the drain bank.';
      if (s === 'tilney') return 'One reed snaps and one bends. Ambrose Tilney, the reeve, should break them himself.';
      if (s === 'rudd') return 'Abner Rudd keeps Harrowgate\'s sluice gate on the drain. The reeve didn\'t give me his name.';
      if (s === 'tilly') return 'Something\'s been settled about the reed. Tilly should hear.';
      return g.flag('otReed') === 'rent' ? 'The reeve wrote to Harrowgate for a reed rent. It will come slowly.' : 'Abner Rudd lifts the sluice gate a hand on Saturday nights, when nobody counts. The reed is greening at the roots.';
    },
    objectives: (g, s) => {
      if (s === 'reeds') return [
        { text: 'Pull a reed from the old bed, east of the mere', marker: 'otReedOld', done: g.count('old_reed') > 0 },
        { text: 'Pull a reed from the drain bank by the sluice', marker: 'otReedDrain', done: g.count('drain_reed') > 0 },
      ];
      return s === 'tilney' ? [{ text: 'Show the reeds to Ambrose Tilney', marker: 'tilney' }] : s === 'rudd' ? [{ text: 'Find Abner Rudd at the sluice', marker: 'rudd' }] : s === 'tilly' ? [{ text: 'Go back to Tilly Brewer', marker: 'tilly' }] : [];
    },
    marks: (_g, s): Marks => (s === 'tilney' ? { tilney: '?' } : s === 'rudd' ? { rudd: '?' } : s === 'tilly' ? { tilly: '?' } : {}),
    walk: { cast: ['tilly', 'tilney', 'rudd'] },
  },
  [CROUP]: {
    id: CROUP, name: 'Croup Winter', region: 'tolmen', depth: 'quest',
    notes: (g, s) => {
      if (s === 'moss') return 'Joss Trewin\'s girl Bess has the croup. Caddy Nankervis says the holed stone at sunrise; Senara Kitto says steam and honey, and wants bitter-moss from the mouth of Carne Barrow, east along the moor.';
      if (s === 'kitto') return 'I have the bitter-moss. Senara Kitto is at the Tinners\' Arms.';
      if (s === 'caddy') return 'Senara says no stone, the kettle. She wants me to tell Caddy Nankervis.';
      return g.flag('otCroup') === 'both' ? 'Bess had the kettle, and Caddy passed her through the holed stone at sunrise. She slept through the next night.' : 'Bess had the kettle and no stone. Caddy said so herself: the stone never cured anyone.';
    },
    objectives: (_g, s) => (s === 'moss' ? [{ text: 'Pick bitter-moss at the mouth of Carne Barrow', marker: 'otMoss' }]
      : s === 'kitto' ? [{ text: 'Bring the moss to Senara Kitto', marker: 'kitto' }]
      : s === 'caddy' ? [{ text: 'Tell Caddy Nankervis: no stone', marker: 'nankervis' }] : []),
    marks: (_g, s): Marks => (s === 'kitto' ? { kitto: '?' } : s === 'caddy' ? { nankervis: '?' } : {}),
    walk: { cast: ['josstre', 'kitto', 'nankervis'] },
  },
};

const reed = (id: string, item: string, [x, z]: [number, number], label: string, text: string) => ({
  id, x, z, label, radius: 2.6,
  when: (g: GameApi) => at(g, REED) === 'reeds' && g.count(item) === 0,
  use: (g: GameApi) => {
    if (!g.give(item)) return;
    g.toast(text);
    if (g.count('old_reed') > 0 && g.count('drain_reed') > 0) g.setStage(REED, 'tilney');
  },
});

export const OUTER_SIDE_CONTENT: RegionContent = {
  id: 'outerSide', items, quests,
  things: [
    {
      id: 'otEggStore', x: EGG_STORE[0], z: EGG_STORE[1], label: 'Look through the baskets', radius: 2.6,
      when: (g: GameApi) => at(g, EGGS) === 'store',
      use: (g: GameApi) => { if (!g.give('egg_slip')) return; g.setStage(EGGS, 'wat'); g.toast('Under the straw at the back, a basket of gannet eggs, packed for travel. Tucked in with them: a tally slip from the Ansbury cart.'); },
    },
    reed('otReedOld', 'old_reed', OLD_BED, 'Pull a reed from the old bed', 'Grey at the root. It snaps in two before it\'s out of the mud.'),
    reed('otReedDrain', 'drain_reed', DRAIN_BANK, 'Pull a reed from the drain bank', 'Green to the tip, roots in the wet. It bends double and springs back.'),
    {
      id: 'otMoss', x: BARROW_MOUTH[0], z: BARROW_MOUTH[1], label: 'Pick the bitter-moss', radius: 2.6,
      when: (g: GameApi) => at(g, CROUP) === 'moss',
      use: (g: GameApi) => { if (!g.give('bitter_moss')) return; g.setStage(CROUP, 'kitto'); g.toast('Grey-green moss in the barrow\'s mouth, out of the wind. A fistful. It smells exactly as bad as Joss said.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'jennyt', (g) => (!at(g, EGGS) ? 'eg1' : at(g, EGGS) === 'loveday' ? 'egBack' : at(g, EGGS) !== 'done' ? 'egWait' : undefined), lovedayNodes);
    hook(D, 'watkemp', (g) => (at(g, EGGS) === 'wat' && g.count('egg_slip') > 0 ? 'wk1' : undefined), watNodes);
    hook(D, 'tilly', (g) => (!at(g, REED) ? 'rd1' : at(g, REED) === 'tilly' ? 'rdBack' : at(g, REED) !== 'done' ? 'rdWait' : undefined), tillyNodes);
    hook(D, 'tilney', (g) => (at(g, REED) === 'tilney' && g.count('old_reed') > 0 && g.count('drain_reed') > 0 ? 'tl1' : undefined), tilneyNodes);
    hook(D, 'rudd', (g) => (at(g, REED) === 'rudd' ? 'rr1' : undefined), ruddNodes);
    hook(D, 'josstre', (g) => (!at(g, CROUP) ? 'cr1' : at(g, CROUP) === 'done' ? 'crAfter' : 'crWait'), jossNodes);
    hook(D, 'kitto', (g) => (at(g, CROUP) === 'kitto' && g.count('bitter_moss') > 0 ? 'kt1' : undefined), kittoNodes);
    hook(D, 'nankervis', (g) => (at(g, CROUP) === 'caddy' ? 'cd1' : undefined), caddyNodes);
  },
};
