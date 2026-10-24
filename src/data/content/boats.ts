import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Rowing boats (game/Rowboat.ts): hired by the hour from a boatman, or bought outright and launched from
// any shore. Dan Ruddle keeps his on the beach between Gullmouth's shipyard and the breakwater.

export const BOAT_HIRE = 5;
export const BOAT_HIRE_MS = 60 * 60 * 1000;

/** Where each boatman stands, and the water he puts a hired boat into (its heading out: toward +x is PI / 2). */
export interface Boatman { id: string; at: [number, number]; face: [number, number]; water: [number, number]; yaw: number }
export const BOATMEN: Boatman[] = [
  { id: 'boat_dan', at: [1810.5, 552.5], face: [1815, 553], water: [1815.5, 553.5], yaw: Math.PI / 2 },
];

const items: ItemDef[] = [
  { id: 'rowboat', name: 'Rowing boat', kind: 'collectible', rarity: 'uncommon', stack: false, value: 45, icon: { shape: 'log', a: '#8a5a32', b: '#3a2a1c' },
    desc: 'Clinker-built, two thwarts and a pair of ash oars. Dan Ruddle says she\'s never sunk, and he\'d know, because he\'s been in her every time.',
    stats: 'At the water\'s edge, E to launch her. W and S row, A and D turn; E by any shore steps you out, Space over the side.' },
];

const npcs: NpcDef[] = BOATMEN.map((b) => ({
  id: b.id, name: 'Dan Ruddle', title: 'Boatman',
  look: { skin: '#c89070', hair: '#8a847c', hairStyle: 0, beard: true, eyes: '#3a4a5a', tunic: '#3a4a5a', trim: '#c8b080', trousers: '#2e3a40', boots: '#2a1e14', hat: 'cap', hatColor: '#2a3440', build: 1.1, age: 0.7 } as NpcDef['look'],
  schedule: [{ from: 0, to: 24, at: b.at, face: b.face, anim: 'idle' }],
  barks: ['Boats! By the hour!', 'Mind the oars, they\'re older than you.'],
}));

const dan: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: `Dan Ruddle. Boats by the hour, ${BOAT_HIRE} marks, and you bring her back with both oars. Or buy one and she's yours to row where you like.`,
      options: [
        { text: `Hire a boat for an hour (${BOAT_HIRE} marks).`, effect: (g) => g.hireBoat() },
        { text: 'I\'d like one of my own.', effect: (g) => g.openShop('boat_dan') },
        { text: 'How do I row?', next: 'how' },
        { text: 'Not today.' },
      ],
    },
    how: {
      text: 'Pull, and she goes. Back the oars and she comes back. Pull one side harder and she turns. Bring her in by a beach or a step and climb out. Don\'t stand up in her. Everybody stands up in her.',
      options: [{ text: `Hire a boat for an hour (${BOAT_HIRE} marks).`, effect: (g) => g.hireBoat() }, { text: 'Not today.' }],
    },
  },
};

const shops: Record<string, ShopDef> = {
  boat_dan: { id: 'boat_dan', name: 'Dan Ruddle\'s boats', owner: 'boat_dan', stock: [{ item: 'rowboat', price: 90 }], buyRate: () => 0.5, footer: () => 'Dan pays half of an item\'s worth' } as ShopDef,
};

export const BOAT_CONTENT: RegionContent = { id: 'boats', items, npcs, dialogue: Object.fromEntries(BOATMEN.map((b) => [b.id, dan])), shops };
