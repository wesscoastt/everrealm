import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import { potteryAt } from '../pottery';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Dora Hurst's pottery outside Harrowgate Works (world/sites.ts buildPottery): a bottle kiln, a shed with
// the wheel and the drying racks, and a clay pit. The company buys her crucibles for the furnaces at its
// own price, and lets her sell her crocks at hers.

const at = (u: number, v: number): [number, number] => { const [x, z] = potteryAt(u, v); return [x + 0.5, z + 0.5]; };

const items: ItemDef[] = [
  { id: 'furn_crocks', name: 'Crocks and a jug', kind: 'collectible', rarity: 'common', stack: true, value: 7, icon: { shape: 'bread', a: '#b8683e', b: '#7a3e22' }, desc: 'Terracotta from Dora Hurst\'s kiln: a storage jar, a jug and a bowl. The jug pours without dribbling. She checks.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'crocks', tint: 0 } } as ItemDef,
  { id: 'furn_glazedjars', name: 'Glazed jars', kind: 'collectible', rarity: 'uncommon', stack: true, value: 16, icon: { shape: 'bread', a: '#3f6a94', b: '#1e3a5a' }, desc: 'The same shapes in Dora\'s blue glaze, which she won\'t say how she makes. Something from the slag heap.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'crocks', tint: 1 } } as ItemDef,
];

const npcs: NpcDef[] = [{
  id: 'dora', name: 'Dora Hurst', title: 'Potter',
  look: { skin: '#d8a888', hair: '#5a3a2a', hairStyle: 2, eyes: '#4a3a2a', tunic: '#7a5a3a', trim: '#c8a070', trousers: '#4a3a30', boots: '#2a1e14', apron: true, lashes: true, build: 1.05, age: 0.55 } as NpcDef['look'],
  schedule: [
    { from: 7, to: 13, at: at(6, 10.8), face: at(6, 13), anim: 'idle' },
    { from: 13, to: 20, at: at(11, 2.6), face: at(11, 1), anim: 'idle' },
    { from: 20, to: 24, at: at(15.5, 6.2), face: at(16, 8), anim: 'idle' },
    { from: 0, to: 7, at: at(15.5, 6.2), face: at(16, 8), anim: 'idle' },
  ],
  barks: ['Mind the racks. Wet clay remembers fingers.', 'Kiln\'s drawing well today.'],
}];

const dora: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('metDora') ? 'Back for more pots? Or just the warm?' : 'Dora Hurst. Pots for you, crucibles for the company. You\'ll want the pots. The crucibles go in a furnace and come out cracked.'),
      effect: (g) => g.setFlag('metDora'),
      options: [
        { text: 'Show me the pots.', effect: (g) => g.openShop('dora') },
        { text: 'Does the company treat you fairly?', next: 'company' },
        { text: 'How does the kiln work?', next: 'kiln' },
        { text: 'Good day.' },
      ],
    },
    company: {
      text: 'They buy my crucibles at their price and let me sell crocks at mine. Only fair bargain in the Works. I don\'t say so near the company store.',
      options: [{ text: 'Show me the pots.', effect: (g) => g.openShop('dora') }, { text: 'Good day.' }],
    },
    kiln: {
      text: 'Stack it full, brick up the door, fire it two days and a night. Let it cool three. Open it too soon and it all cracks. Most things are like that.',
      options: [{ text: 'Show me the pots.', effect: (g) => g.openShop('dora') }, { text: 'Good day.' }],
    },
  },
};

const shops: Record<string, ShopDef> = {
  dora: { id: 'dora', name: 'Hurst\'s Pottery', owner: 'dora', stock: [{ item: 'furn_crocks', price: 14 }, { item: 'furn_glazedjars', price: 32 }], buyRate: () => 0.5, footer: () => 'Fired here' } as ShopDef,
};

export const POTTERY_CONTENT: RegionContent = { id: 'pottery', items, npcs, dialogue: { dora }, shops };
