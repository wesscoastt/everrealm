import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Verandah's high street (owner 2026-11-06): Xavier's Home Goods, where Xavier Dunstan sells furniture in the
// new manner, brass and copper and gearwork (the island's engineers make it for him; one of each stands on show
// upstairs, world/sites.ts 'ver-xavier'); and Sandor's Cookery next door, where Sandor Kovac bakes, and sells
// what he bakes. Their shops are the owner's buildings: the signs over the doors are theirs.

const furn = (id: string, name: string, model: string, value: number, a: string, b: string, desc: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'rare', stack: true, value, icon: { shape: 'wheel', a, b }, furn: { model }, desc, stats: 'Furniture: set it out at home (Arrange the furniture).' });
const food = (id: string, name: string, value: number, heal: number, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'common', stack: true, value, icon: { shape: 'bread', a }, heal, desc, stats: `Restores ${heal} health.` });

const items: ItemDef[] = [
  furn('furn_sp_clock', 'Gear-faced long-case clock', 'sp_clock', 180, '#b8863a', '#3a2a1e', 'A walnut case as tall as a man, its face cut away to show the wheels turning behind it. It ticks like somebody tapping a pencil, and it is never wrong.'),
  furn('furn_sp_lamp', 'Brass gas lamp', 'sp_lamp', 90, '#d8a848', '#ffd890', 'A brass standard with a copper pipe running up it to a frosted globe. There is no gas in Verandah. Xavier says that is not the point.'),
  furn('furn_sp_chair', 'Riveted armchair', 'sp_chair', 140, '#5a2e1e', '#c8a050', 'Oxblood leather over a deep seat, a row of brass rivets round the arms. Sit in it once and the rest of your chairs will notice.'),
  furn('furn_sp_cabinet', 'Engineer’s cabinet', 'sp_cabinet', 220, '#4a3a2a', '#c8743a', 'Drawers all the way down, copper piping round the top for no reason anyone can explain, and a pressure gauge whose needle never moves.'),
  furn('furn_sp_orrery', 'Brass orrery', 'sp_orrery', 380, '#e0bd64', '#3a4a6a', 'The sun and its six wandering stars on brass arms, wound with a key. It takes a year to go round once, which is the joke.'),
  food('sandor_pasty', 'Sandor’s pasty', 8, 60, '#c8904a', 'Beef, potato and swede in a crimped crust, the way Sandor’s grandmother made them for the quarrymen. Still hot.'),
  food('sandor_seedcake', 'Seed cake', 6, 40, '#d8b878', 'A yellow cake full of caraway. Sandor says it keeps for a week. Nobody has tested this.'),
  food('sandor_bun', 'Saffron bun', 5, 34, '#e8b040', 'A golden bun with currants in it, glazed on top, sticky on your fingers all afternoon.'),
  food('sandor_loaf', 'Harbour loaf', 4, 28, '#b8844a', 'A dark round loaf with a hard crust, baked for the boats. It goes out with the tide and comes back with the fishermen.'),
];

const npcs: NpcDef[] = [
  { id: 'ver_xavier', name: 'Xavier Dunstan', title: 'Home Goods', look: { skin: '#d8a888', hair: '#3a2a1e', hairStyle: 2, facial: 2, eyes: '#4a3a2a', tunic: '#3a2a3a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'beret', hatColor: '#2a2420' },
    schedule: [{ from: 8, to: 19, at: [-2862.5, 2111.5], face: [-2862.5, 2114.5], anim: 'idle', y: 25 }, { from: 19, to: 8, at: [-2861.5, 2108.5], face: [-2861.5, 2111.5], anim: 'idle', y: 29 }],
    barks: ['Everything upstairs is for sale. Except the cat.', 'The new manner, they call it. Brass and copper and a bit of nerve.', 'Wind the orrery gently. It knows.'] },
  { id: 'ver_sandor', name: 'Sandor Kovac', title: 'Cookery', look: { skin: '#c8906a', hair: '#1e1612', hairStyle: 0, facial: 4, eyes: '#3a2a1e', tunic: '#e8e0d0', trim: '#7a2a24', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a1e14', apron: true, hat: 'cap', hatColor: '#e8e0d0', build: 1.15 },
    schedule: [{ from: 5, to: 20, at: [-2890.5, 2111.5], face: [-2890.5, 2114.5], anim: 'idle', y: 25 }, { from: 20, to: 5, at: [-2896.5, 2110.5], face: [-2896.5, 2112.5], anim: 'idle', y: 29 }],
    barks: ['Pasties! Hot pasties!', 'Saffron buns, fresh this morning.', 'The loaf goes out with the tide. Buy it before it does.'] },
];

const xavier: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Xavier Dunstan, Home Goods. Everything here is made on the island, by people who should be building ships and would rather build clocks. Upstairs is the show room. Have a look, then come down and buy something.',
      options: [
        { text: 'Show me what you sell.', effect: (g) => g.openShop('ver_xavier') },
        { text: 'Who makes all this?', next: 'who' },
        { text: 'Good day.' },
      ],
    },
    who: { text: 'The engineers down at the yard. They learned their trade on boilers and pumps, and somebody told them a chair could have rivets in it. Now I cannot stop them. I sell what they make, and I take a little for the trouble.', next: 'hello' },
  },
};

const sandor: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Sandor’s Cookery. I bake it, I sell it, and if you do not eat it here I do not want to hear about it. Pasties, buns, seed cake, bread for the boats.',
      options: [
        { text: 'What’s good today?', effect: (g) => g.openShop('ver_sandor') },
        { text: 'Where did you learn to bake?', next: 'learn' },
        { text: 'Good day.' },
      ],
    },
    learn: { text: 'My grandmother baked for the quarrymen, two hundred pasties before sunrise. I could crimp a crust before I could read. When I came to Verandah there was no proper bread on the whole island, so I made some.', next: 'hello' },
  },
};

const shops: Record<string, ShopDef> = {
  ver_xavier: { id: 'ver_xavier', name: 'Xavier’s Home Goods', owner: 'ver_xavier', stock: [
    { item: 'furn_sp_lamp', price: 140 }, { item: 'furn_sp_chair', price: 220 }, { item: 'furn_sp_clock', price: 300 }, { item: 'furn_sp_cabinet', price: 360 }, { item: 'furn_sp_orrery', price: 620 },
  ], buyRate: () => 0.4, footer: () => 'Made on the island. One of each stands upstairs.' } as ShopDef,
  ver_sandor: { id: 'ver_sandor', name: 'Sandor’s Cookery', owner: 'ver_sandor', stock: [
    { item: 'sandor_loaf', price: 6 }, { item: 'sandor_bun', price: 8 }, { item: 'sandor_seedcake', price: 10 }, { item: 'sandor_pasty', price: 14 },
  ], buyRate: () => 0.4, footer: () => 'Baked this morning, in the back.' } as ShopDef,
};

export const VERANDAH_SHOPS: RegionContent = { id: 'verandahShops', items, npcs, dialogue: { ver_xavier: xavier, ver_sandor: sandor }, shops };

/** The show room upstairs at Xavier's (world/sites.ts): one of each piece. */
export const XAVIER_SHOWROOM: { item: string; x: number; y: number; z: number; ry: number }[] = [
  { item: 'sp_clock', x: -2864.5, y: 29, z: 2105.5, ry: 0 },
  { item: 'sp_cabinet', x: -2862.5, y: 29, z: 2105.5, ry: 0 },
  { item: 'sp_lamp', x: -2858.5, y: 29, z: 2105.5, ry: 0 },
  { item: 'sp_chair', x: -2859.5, y: 29, z: 2108.5, ry: -Math.PI / 2 },
  { item: 'sp_orrery', x: -2864.5, y: 29, z: 2109.5, ry: 0.4 },
];
