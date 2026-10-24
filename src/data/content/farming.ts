import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { FARM_ITEMS } from '../farming';

// Farming's people: the seedsman by Hollin Ford's west garden, who sells seed, saplings and compost and
// will tell you how a patch works. (The crops and the patches: data/farming.ts, game/Farming.ts.)

const npcs: NpcDef[] = [
  {
    id: 'seed_bertram', name: 'Bertram Sowerby', title: 'Seedsman',
    look: { skin: '#d8a888', hair: '#c8c4bc', hairStyle: 1, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw', apron: true, age: 0.7, build: 1.05 },
    schedule: [{ from: 6, to: 20, at: [119.5, 174.4], face: [119.5, 178], anim: 'idle' }, { from: 20, to: 6, at: [119.5, 174.4], face: [119.5, 178], anim: 'idle' }],
    barks: ['Seed! Good seed!', 'Mind my beans.', 'Rake it before you sow it.'],
  },
];

const bertram: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Bertram Sowerby. Seed, sets, saplings and muck, the best in the Wend. You want to grow something, or you want to stand there?',
      options: [
        { text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') },
        { text: 'How does a patch work?', next: 'how' },
        { text: 'Good day.' },
      ],
    },
    how: {
      text: 'Rake it clean, sow it, and leave it be. Compost first if you want more out of it. Root crops in a few minutes, trees in a few hours. Left empty, the weeds are back in it inside the hour.',
      options: [
        { text: 'Where are the patches?', next: 'where' },
        { text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') },
        { text: 'Good day.' },
      ],
    },
    where: {
      text: 'Three gardens here in the Ford, mine being the best. Every farm round the towns will let you a corner of a field and a bit of orchard, so long as you do the weeding. Most don\'t.',
      options: [{ text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') }, { text: 'Good day.' }],
    },
  },
};

const shop: ShopDef = {
  id: 'seed_bertram', name: 'Bertram Sowerby\'s seeds', owner: 'seed_bertram',
  stock: [
    { item: 'compost', price: 4 }, { item: 'seed_potato', price: 4 }, { item: 'seed_onion', price: 6 }, { item: 'seed_cabbage', price: 8 }, { item: 'seed_carrot', price: 10 },
    { item: 'seed_wheat', price: 12 }, { item: 'seed_strawberry', price: 18 }, { item: 'seed_barley', price: 20 }, { item: 'seed_leek', price: 24 }, { item: 'seed_hops', price: 32 },
    { item: 'seed_pumpkin', price: 40 }, { item: 'sapling_apple', price: 120 }, { item: 'sapling_pear', price: 180 }, { item: 'cutting_vine', price: 260 },
  ],
  buyRate: () => 0.5,
  footer: () => 'Bertram pays half of an item\'s worth',
} as ShopDef;

export const FARM_CONTENT: RegionContent = {
  id: 'farming',
  items: FARM_ITEMS,
  npcs,
  dialogue: { seed_bertram: bertram },
  shops: { seed_bertram: shop },
};
