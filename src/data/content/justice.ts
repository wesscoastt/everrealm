import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// The people of the law (data/justice.ts, game/Justice.ts): the gaolers in their guard rooms, a few
// of their lodgers, and the Ropewalk Cellar under Gullmouth, where Nell Kitto makes a name lose
// itself from every town's book for a fee, and Abe Rowse buys what you'd rather not explain.
// Positions are literal because content imports types only: the Weighhouse cells at (820, 300) and
// the Tolbooth at (2140, 1112), both with their floors at 8; the cellar at (1726, 602), floor 8.

const F = 8;
const owed = (g: GameApi) => g.bounties();

const fixerLines = (who: string, clean: string, quote: (total: number, fee: number) => string, done: string, short: string, p = 'f'): DialogueTree => ({
  start: () => p + '0',
  nodes: {
    [p + '0']: {
      text: (g) => { const b = owed(g); return b.total > 0 ? quote(b.total, b.fee) : clean; },
      options: [
        { text: 'Make it go away.', cond: (g) => owed(g).total > 0, effect: (g) => g.toast(g.clearName() ? done : short) },
        { text: 'How does it work?', next: p + '1' },
        { text: 'Bye.' },
      ],
    },
    [p + '1']: { text: who, next: p + '0' },
  },
});

const nell = fixerLines(
  'Every town keeps a book with your name in it. Clerks keep the books, and clerks have rent. A page goes missing. Nobody\'s the wiser.',
  'Nell Kitto. You\'re clean, as far as any book I know of goes. Come back when you\'re not. You will.',
  (t, fee) => `Nell Kitto. You're on the books for ${t} marks, all told, every town that keeps one. For ${fee} I can have your name lose itself. All of them, by morning.`,
  'Nell writes something on a scrap, folds it twice and hands it to a boy, who runs. "Done. Don\'t make me do it again this week."',
  'You don\'t have the marks for that. Nell doesn\'t do it on account.',
);

const gilClear = fixerLines(
  'The Assembly\'s clerks drink in Saltpenny on their days off. They lose at cards. We\'re very understanding about it.',
  'You\'re clean. In Morrow, anyway. Nobody on this coast wants you for anything.',
  (t, fee) => `You're wanted, all told, for ${t} marks up and down the coast. ${fee} and the Brethren have a word with the right clerk. Nobody remembers anything.`,
  'Gil spits on his hand and holds it out. When you shake it, it\'s done.',
  'Not enough. The clerks don\'t lose that cheap.',
  'gf',
);

const abe: DialogueTree = {
  start: () => 'a0',
  nodes: {
    a0: { text: 'Abe Rowse. I buy, I don\'t ask. I sell picks to people who\'ve lost their keys. Lots of people lose their keys.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('abe_rowse') }, { text: 'Bye.' }] },
  },
};

const gaoler = (name: string, place: string): DialogueTree => ({
  start: () => 'g0',
  nodes: {
    g0: {
      text: `${name}. I keep ${place}. If you're on the inside of the bars, you've time to sit with. If you're on the outside, keep it that way.`,
      options: [{ text: 'What happens to people in here?', next: 'g1' }, { text: 'Bye.' }],
    },
    g1: { text: 'They sit their time and they go home. Pick oakum and I take a bit off. Lie on the boards and it goes quicker.', next: 'g2' },
    g2: { text: 'Pick the lock and I put it in the book. The watch hears by supper.', next: 'g0' },
  },
});

/** A lodger behind the bars: one thing to say for themselves. */
const lodger = (line: string): DialogueTree => ({ start: () => 'l0', nodes: { l0: { text: line } } });

const NPCS: NpcDef[] = [
  {
    id: 'ezra_gale', name: 'Ezra Gale', title: 'Gaoler, the Weighhouse cells',
    look: { skin: '#d8a882', hair: '#6a6a6a', hairStyle: 2, facial: 3, eyes: '#4a4a3a', tunic: '#3a3430', trim: '#8a7a5a', trousers: '#2a2a2a', boots: '#1e1a16', apron: true, build: 1.2, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [817.5, 298.5], face: [817.5, 302], anim: 'idle', y: F }],
    barks: ['Keys don\'t lose themselves.', 'Quiet down there.'],
  },
  {
    id: 'dick_pender', name: 'Dick Pender', title: 'Poacher, three weeks in',
    look: { skin: '#c88a62', hair: '#7a4a2a', hairStyle: 5, facial: 6, eyes: '#3a5a3a', tunic: '#4a5a3a', trim: '#6a5a3a', trousers: '#3a3430', boots: '#2a2018', build: 0.95, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [816.5, 312.5], face: [819, 312.5], anim: 'seated', y: F }],
    barks: ['It was a rabbit. One rabbit.', 'If you get out, tell my sister.'],
  },
  {
    id: 'moll_tretheway', name: 'Moll Tretheway', title: 'Wrecker, they say',
    look: { frame: 'f', lashes: true, skin: '#e0b090', hair: '#2a1e16', hairStyle: 1, eyes: '#3a4a5a', tunic: '#3a4a5a', trim: '#c8b070', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#5a2a24', build: 1.0, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [824.5, 316.5], face: [822, 316.5], anim: 'seated', y: F }],
    barks: ['I put a lamp in my window. That\'s all. A lamp.', 'The sea wrecks ships. Not me.'],
  },
  {
    land: 'morrow', id: 'mateu_bosch', name: 'Mateu Bosch', title: 'Keeper of the Tolbooth, Callis',
    look: { skin: '#c88a62', hair: '#1a1410', hairStyle: 4, facial: 1, eyes: '#3a2a1a', tunic: '#e8e4d8', trim: '#2a3a6a', trousers: '#2a2a30', boots: '#1e1a16', build: 1.1, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [2137.5, 1110.5], face: [2137.5, 1114], anim: 'idle', y: F }],
    barks: ['The Assembly is patient. So am I.', 'Mind the step.'],
  },
  {
    land: 'morrow', id: 'quim_soler', name: 'Quim Soler', title: 'Smuggler, between ships',
    look: { skin: '#b87a52', hair: '#2a1e16', hairStyle: 3, facial: 5, eyes: '#3a2a1a', tunic: '#7a2a24', trim: '#d8b050', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#1e1a1a', build: 1.05, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [2136.5, 1124.5], face: [2139, 1124.5], anim: 'seated', y: F }],
    barks: ['Saltpenny will pay my fine. Saltpenny always pays.', 'The food here is better than the ship\'s.'],
  },
  {
    id: 'nell_kitto', name: 'Nell Kitto', title: 'The Ropewalk Cellar',
    look: { frame: 'f', lashes: true, skin: '#e8c4a4', hair: '#8a3a1e', hairStyle: 6, eyes: '#3a5a4a', tunic: '#2a2a34', trim: '#a88a4a', trousers: '#2a2a30', boots: '#1e1a16', build: 0.95, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [1721.5, 604.5], face: [1721.5, 600], anim: 'idle', y: F }],
    barks: ['Names are cheap. Clean ones aren\'t.', 'Sit if you\'re staying.'],
  },
  {
    id: 'abe_rowse', name: 'Abe Rowse', title: 'Fence, the Ropewalk Cellar',
    look: { skin: '#d8a07a', hair: '#4a3a2a', hairStyle: 0, facial: 4, eyes: '#4a4a3a', tunic: '#5a4a3a', trim: '#3a3430', trousers: '#2a2a2a', boots: '#1e1a16', hat: 'cap', hatColor: '#2a2a2a', build: 1.15, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [1730.5, 604.5], face: [1730.5, 600], anim: 'idle', y: F }],
    barks: ['I don\'t ask.', 'Picks, two a penny. Well. Four.'],
  },
];

const SHOPS: Record<string, ShopDef> = {
  abe_rowse: {
    id: 'abe_rowse', name: 'Abe Rowse, no questions', owner: 'abe_rowse',
    stock: [{ item: 'lockpick', price: 4 }],
    buyRate: () => 0.62,
    footer: () => 'Abe pays nearly two-thirds of what a thing is worth, and forgets he saw it',
  },
};

export const JUSTICE_CONTENT: RegionContent = {
  id: 'justice',
  npcs: NPCS,
  dialogue: {
    dick_pender: lodger('One rabbit. Off common land. The Charter says it was the Charter\'s rabbit.'),
    moll_tretheway: lodger('A lamp in my window on a stormy night. That\'s all they\'ve got on me. A lamp.'),
    quim_soler: lodger('Saltpenny will pay my fine. Saltpenny always pays. Eventually.'),
    ezra_gale: gaoler('Ezra Gale', 'the Charter\'s cells'), mateu_bosch: gaoler('Mateu Bosch', 'the Tolbooth'), nell_kitto: nell, abe_rowse: abe },
  shops: SHOPS,
};

/** Gil Fenner's word with the clerks, for Saltpenny (content/saltpenny.ts adds the option to his talk). */
export const GIL_CLEAR = gilClear.nodes;
