import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { DAY_MINUTES, realmNow } from '../../world/clock';

// Mercy Haddow, packwoman: a travelling seller with a pony and a pack, a day in each of four
// towns on the Charter roads (Ansbury's south gate, the Waystation, Gullmouth, Kelderby) and then
// round again. The day is the realm's, so everyone online finds her in the same town. She sells
// what the shops don't: the treasure maps of the region she's in (bought off people who never
// dug), and the spare pony that carries her second pack.

interface Stop { id: string; town: string; region: string; at: [number, number]; face: [number, number] }
// Beside each town's Charter Post sign (data/travel.ts POSTS), literal because content imports types only
const STOPS: Stop[] = [
  { id: 'ansbury', town: 'Ansbury', region: 'crownroad', at: [836.5, 379.5], face: [832.5, 375.5] },
  { id: 'waystation', town: 'the Waystation', region: 'crownroad', at: [707.5, 578.5], face: [703.5, 574.5] },
  { id: 'gullmouth', town: 'Gullmouth', region: 'saltwind', at: [1735.5, 598.5], face: [1731.5, 594.5] },
  { id: 'kelderby', town: 'Kelderby', region: 'starfall', at: [311.5, 1472.5], face: [307.5, 1468.5] },
];

/** Which stop she's at today (and k days on). */
const stopOn = (k = 0) => STOPS[(Math.floor(realmNow() / (DAY_MINUTES * 60_000)) + k) % STOPS.length];

const mercy: DialogueTree = {
  start: () => 'meet',
  nodes: {
    meet: {
      text: (g) => (g.flag('mercyMet') ? `Back again. I'm in ${stopOn(1).town} tomorrow, if you miss me.` : 'Mercy Haddow. I carry what the shops don\'t. Have a look; I\'m gone again tomorrow.'),
      effect: (g) => g.setFlag('mercyMet'),
      next: 'menu',
    },
    menu: {
      text: 'Well?',
      options: [
        { text: 'Show me what you have.', effect: (g) => g.openShop('mercy_' + stopOn().id) },
        { text: 'Where do you go next?', next: 'round' },
        { text: 'Where do your maps come from?', next: 'maps' },
        { text: 'Bye.' },
      ],
    },
    round: {
      text: () => `${stopOn(1).town[0].toUpperCase() + stopOn(1).town.slice(1)} tomorrow, then ${stopOn(2).town}, then ${stopOn(3).town}. Eleven years on the round and I've never once been early.`,
      next: 'menu',
    },
    maps: { text: 'People who find a map and can\'t be bothered to dig. I buy them for a mark and sell them for sixty. Somebody has to dig.', next: 'menu' },
  },
};

/** Her stock: that region's maps you haven't got, and the pony. */
const stock = (region: string): ShopDef['stock'] => [
  { item: `tmap_${region}_1`, price: 60, when: (g: GameApi) => g.count(`tmap_${region}_1`) === 0 },
  { item: `tmap_${region}_2`, price: 60, when: (g: GameApi) => g.count(`tmap_${region}_2`) === 0 },
  { item: 'halter_pack', price: 450, when: (g: GameApi) => g.count('halter_pack') === 0 },
];

const LOOK = { frame: 'f' as const, skin: '#d8a882', hair: '#8a6a4a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#6a3a2a', trim: '#e0c070', trousers: '#4a3a2e', boots: '#2a1e16', cape: '#3a4a3a', hat: 'wide' as const, hatColor: '#4a3a2a', apron: true, freckles: true, build: 1.05, age: 0.55 };

export const PACKWOMAN: RegionContent = {
  id: 'packwoman',
  items: [
    { id: 'halter_pack', name: 'Mercy\'s second pony', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'shoe', a: '#7a7062', b: '#6a3a2a' }, mount: { coat: '#7a7062', mane: '#2e2620', cloth: '#6a3a2a' }, desc: 'A grey-dun pony that has carried Mercy Haddow\'s second pack round the counties for nine years. She knows every Charter Post by its smell.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' },
  ],
  npcs: STOPS.map((s, i): NpcDef => ({
    id: 'mercy_' + s.id, name: 'Mercy Haddow', title: 'Packwoman',
    look: LOOK,
    schedule: [{ from: 0, to: 24, at: s.at, face: s.face, anim: 'idle' }],
    barks: ['Gone tomorrow.', 'Maps nobody\'s dug.'],
    when: () => stopOn().id === STOPS[i].id,
  })),
  dialogue: Object.fromEntries(STOPS.map((s) => ['mercy_' + s.id, mercy])),
  shops: Object.fromEntries(STOPS.map((s): [string, ShopDef] => ['mercy_' + s.id, { id: 'mercy_' + s.id, name: 'Mercy Haddow\'s pack', owner: 'mercy_' + s.id, who: 'Mercy', stock: stock(s.region), buyRate: () => 0.25, footer: () => 'Mercy pays a quarter of an item\'s worth. She\'s in another town tomorrow.' }])),
};
