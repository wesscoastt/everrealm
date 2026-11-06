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
    schedule: [{ from: 6, to: 20, at: [117.4, 180.6], face: [117.4, 184], anim: 'idle' }, { from: 20, to: 6, at: [117.4, 180.6], face: [117.4, 184], anim: 'idle' }], // (out at the front of the cottage: his old spot was inside its north wall, and he stood on the roof)
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
      text: "A hoe to turn the ground, a tile at a time, then the seed, then water it. Wet ground grows twice as fast as dry, and the rain does the watering for you. Compost and keep it wet, and more comes up. Root crops in a few minutes, trees in a few hours. A bigger can waters more at a go; a scythe takes a whole bed when it's ripe.",
      options: [
        { text: 'Where are the patches?', next: 'where' },
        { text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') },
        { text: 'Good day.' },
      ],
    },
    where: {
      text: "Your own garden first, if you own a house: a hoe and a can and the grass is up round it by supper. Then the public fields: my three here in the Ford and a field on every farm round the towns. Anyone can work them, and they don't count against your own ground. The orchards still let a corner each for a tree.",
      options: [{ text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') }, { text: 'Good day.' }],
    },
  },
};

const shop: ShopDef = {
  id: 'seed_bertram', name: 'Bertram Sowerby\'s seeds', owner: 'seed_bertram',
  stock: [
    { item: 'hoe', price: 30 }, { item: 'watering_can', price: 45 },
    { item: 'stock_hens', price: 320, when: (g) => g.level('farming') >= 5 && !g.has('stock_hens') }, { item: 'stock_ewes', price: 720, when: (g) => g.level('farming') >= 15 && !g.has('stock_ewes') }, { item: 'stock_cow', price: 1200, when: (g) => g.level('farming') >= 25 && !g.has('stock_cow') },
    { item: 'watering_can_copper', price: 180, when: (g) => g.level('farming') >= 15 && !g.has('watering_can_copper') }, { item: 'scythe', price: 240, when: (g) => g.level('farming') >= 20 && !g.has('scythe') },
    { item: 'watering_can_iron', price: 650, when: (g) => g.level('farming') >= 35 && !g.has('watering_can_iron') }, { item: 'watering_can_gilded', price: 2400, when: (g) => g.level('farming') >= 60 && !g.has('watering_can_gilded') }, { item: 'compost', price: 4 }, { item: 'seed_potato', price: 4 }, { item: 'seed_onion', price: 6 }, { item: 'seed_cabbage', price: 8 }, { item: 'seed_carrot', price: 10 },
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
