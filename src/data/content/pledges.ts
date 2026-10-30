import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { MORROW_OX } from '../../world/morrow';

// The Lamp Company's clerks (data/pledges.ts): Thomasina Penhale at Ansbury's south gate, Xisca Mir by
// the Callis post. Each posts the day's pledge, pays Lamp keys when it's cleared, and sells any
// dungeon set piece for keys (their shops are built in data/pledges.ts from the dungeons' drops).

const ITEMS: ItemDef[] = [
  { id: 'lamp_key', name: 'Lamp key', kind: 'collectible', rarity: 'rare', stack: true, value: 0, icon: { shape: 'coin', a: '#d8b050', b: '#3a2a1e' },
    desc: 'A brass key on a lamp-wick tag, stamped with the Company\'s lamp. Thomasina Penhale and Xisca Mir take them for any piece of any dungeon\'s set.',
    stats: 'From the Lamp Company\'s daily pledge, and the day\'s first random dungeon.' },
];

const clerk = (name: string): DialogueTree => ({
  start: () => 'c0',
  nodes: {
    c0: {
      text: (g) => {
        const p = g.pledge();
        if (!p) return `${name}, for the Lamp Company. No pledge out today.`;
        if (p.state === 'open') return `${name}, for the Lamp Company. Today's pledge is ${p.name}. Clear it and come back, and the Company pays in keys.`;
        if (p.state === 'taken') return `${p.name}. Still down there, is it? Veteran pays double, if you've the stomach.`;
        if (p.state === 'done') return 'You cleared it? Good. The Company pays what it says it will.';
        return 'That\'s today\'s done and paid. Come back tomorrow. There\'s always another hole.';
      },
      options: [
        { text: 'I\'ll take the pledge.', cond: (g) => g.pledge()?.state === 'open', effect: (g) => { g.takePledge(); g.toast('Pledge taken. Clear it, then come back.'); } },
        { text: 'It\'s cleared.', cond: (g) => g.pledge()?.state === 'done', effect: (g) => { const n = g.turnInPledge(); if (n) g.toast(`The Company pays ${n} Lamp keys.`); } },
        { text: 'What do keys buy?', next: 'c1' },
        { text: 'Show me.', effect: (g) => g.openShop(name === 'Thomasina Penhale' ? 'ruth_penhale' : 'xisca_mir') },
        { text: 'Bye.' },
      ],
    },
    c1: { text: 'Any piece of any set the Company\'s seen come up out of the dark. Keys, not marks. Hesk has enough marks.', next: 'c0' },
  },
});

const NPCS: NpcDef[] = [
  {
    id: 'ruth_penhale', name: 'Thomasina Penhale', title: 'The Lamp Company',
    look: { frame: 'f', lashes: true, skin: '#e0b090', hair: '#5a3a22', hairStyle: 2, eyes: '#4a5a3a', tunic: '#3a3a2a', trim: '#d8b050', trousers: '#2a2a24', boots: '#2a2018', hat: 'cap', hatColor: '#2a2a24', build: 1.05, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [828.5, 379.5], face: [832.5, 375.5], anim: 'idle', y: 21 }],
    barks: ['Pledge is posted. Who\'s going down?', 'The Company pays in keys.'],
  },
  {
    land: 'morrow', id: 'xisca_mir', name: 'Xisca Mir', title: 'The Lamp Company, Callis',
    look: { frame: 'f', lashes: true, skin: '#c88a62', hair: '#1a1410', hairStyle: 4, eyes: '#3a2a1a', tunic: '#3a3a2a', trim: '#d8b050', trousers: '#2a2a24', boots: '#2a2018', build: 1.0, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [MORROW_OX + 2136.5, 1081.5], face: [MORROW_OX + 2132.5, 1077.5], anim: 'idle' }],
    barks: ['Hesk sends his regards. And a pledge.', 'Keys, not marks.'],
  },
];

export const PLEDGE_CONTENT: RegionContent = { id: 'pledges', items: ITEMS, npcs: NPCS, dialogue: { ruth_penhale: clerk('Thomasina Penhale'), xisca_mir: clerk('Xisca Mir') } };
