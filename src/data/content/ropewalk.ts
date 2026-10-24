import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import { ROPEWALK } from '../ropewalk';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Bett Rook's ropewalk outside Gullmouth (world/sites.ts buildRopewalk). After the Morning Post (data/
// content/crownroad/gate.ts), Jem Mallow lays rope here for Bett; if Rosie Penhallow came with him, she
// keeps the ropewalk's books on the bench by the jack.

/** A point on the walk: u along it from the head, v across it. */
function at(u: number, v: number): [number, number] {
  const { x0, z0, alongX } = ROPEWALK;
  return alongX ? [x0 + u + 0.5, z0 + v + 0.5] : [x0 + v + 0.5, z0 + u + 0.5];
}
const went = (g: { flag(k: string): unknown }) => !!g.flag('rosieChoice');
const withHim = (g: { flag(k: string): unknown }) => g.flag('rosieChoice') === 'letter' || g.flag('rosieChoice') === 'gone';

const items: ItemDef[] = [
  { id: 'furn_coil', name: 'Coil of rope', kind: 'collectible', rarity: 'common', stack: true, value: 9, icon: { shape: 'log', a: '#b8a070', b: '#6a5a3a' }, desc: 'Forty fathom of three-strand hemp, tarred. Good for a ship, a well or a corner that looks empty.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'coil' } } as ItemDef,
];

const npcs: NpcDef[] = [
  {
    id: 'jem_rope', name: 'Jem Mallow', title: 'Ropemaker',
    look: { skin: '#c89070', hair: '#2a2018', hairStyle: 0, eyes: '#3a2a1a', tunic: '#6a5a3a', trim: '#8a7a5a', trousers: '#4a4034', boots: '#3a2a1c', apron: true, build: 1.05, age: 0.17 } as NpcDef['look'],
    schedule: [
      { from: 6, to: 18, at: at(5, 3), face: at(12, 3), anim: 'idle' },
      { from: 18, to: 24, at: at(ROPEWALK.len - 5, 2.6), face: at(ROPEWALK.len - 3, 1.5), anim: 'idle' },
      { from: 0, to: 6, at: at(ROPEWALK.len - 5, 2.6), face: at(ROPEWALK.len - 3, 1.5), anim: 'idle' },
    ],
    barks: ['Walk backwards, feed the hemp, don\'t trip. That\'s the trade.', 'Bett wants forty fathom by Friday.'],
    when: went,
  },
  {
    id: 'rosie_rope', name: 'Rosie Penhallow', title: 'Keeps the ropewalk\'s books',
    look: { skin: '#f0cfb0', hair: '#6a4a2a', hairStyle: 1, eyes: '#5a6a7a', tunic: '#2e3a5a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', lashes: true, build: 0.92, age: 0.17 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: at(4, 3.6), face: at(4, 6), anim: 'idle' }],
    barks: ['Forty fathom at a mark a fathom. Bett says thirty-eight. Bett is wrong.'],
    when: withHim,
  },
];

const jem: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (withHim(g) ? 'You again. Rosie\'s on the bench with the tally. I do the walking.' : 'Rosie went home, then. I lay rope for Bett now. She pays on Fridays and shouts the rest of the week.'),
      options: [
        { text: 'How is rope made?', next: 'how' },
        { text: 'I\'ll take some rope.', effect: (g) => g.openShop('jem_rope') },
        { text: 'Take care, Jem.' },
      ],
    },
    how: {
      text: 'The jack twists three yarns at the head. I walk them out backwards to the foot, then the traveller lays them together. Then the tar. Then you smell of tar.',
      options: [{ text: 'I\'ll take some rope.', effect: (g) => g.openShop('jem_rope') }, { text: 'Take care, Jem.' }],
    },
  },
};

const rosie: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('rosieChoice') === 'letter'
        ? 'My grandfather wrote that I should go. I keep his letter in the tally book. It\'s the only page that adds up.'
        : 'Grandfather sent you after me. I know he did. I\'ve written to him three times and he hasn\'t answered once.'),
      options: [
        { text: 'Do you miss the Weighhouse?', next: 'miss' },
        { text: 'Goodbye, Rosie.' },
      ],
    },
    miss: {
      text: 'I miss being right about the weights. Here I\'m right about the rope, and nobody checks.',
      options: [{ text: 'Goodbye, Rosie.' }],
    },
  },
};

const shops: Record<string, ShopDef> = {
  jem_rope: { id: 'jem_rope', name: 'Rook\'s Ropewalk', owner: 'jem_rope', stock: [{ item: 'furn_coil', price: 18 }], buyRate: () => 0.5, footer: () => 'Laid here, tarred here' } as ShopDef,
};

export const ROPEWALK_CONTENT: RegionContent = { id: 'ropewalk', items, npcs, dialogue: { jem_rope: jem, rosie_rope: rosie }, shops };
