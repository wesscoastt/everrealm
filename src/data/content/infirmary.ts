import type { DialogueTree, GameApi } from '../../game/api';
import { INFIRMARIES, POOR, type Infirmary } from '../infirmary';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// The infirmaries' people (data/infirmary.ts): the physician who treats you and keeps a bed for you,
// the nurse with the still-room, and the patients, each with something to say from the bed.

type Look = NpcDef['look'];
const look = (o: Partial<Look>): Look => ({ skin: '#d8a882', hair: '#3a2a1e', hairStyle: 1, eyes: '#4a3a2a', tunic: '#3a4a5a', trim: '#c8a050', trousers: '#2a2a30', boots: '#1e1a16', build: 1, age: 0.5, ...o } as Look);

const ITEMS: ItemDef[] = [
  { id: 'inf_bandage', name: 'Linen bandage', kind: 'food', rarity: 'common', stack: true, value: 4, icon: { shape: 'scroll', a: '#e8e4dc', b: '#c8a050' }, heal: 70,
    desc: 'Boiled linen in a roll, with a pad of honey at the heart of it. Kitty Rudge rolls them at night when the ward\'s quiet.', stats: 'Restores 70 health.' },
];

const bound = (g: GameApi, i: Infirmary) => g.flag('bind') === i.id;

function physicianTree(i: Infirmary): DialogueTree {
  return {
    start: () => 'hello',
    nodes: {
      hello: {
        text: i.physician.hello,
        options: [
          { text: 'I\'m hurt. Can you see to it?', next: 'treat' },
          { text: 'Keep a bed for me. If I fall, bring me here.', cond: (g) => !bound(g, i), next: 'bind' },
          { text: 'I won\'t need the bed any more.', cond: (g) => bound(g, i), next: 'unbind' },
          { text: 'Who\'s on the ward?', next: 'ward' },
          { text: 'Good day.' },
        ],
      },
      treat: {
        text: (g) => (g.marks < POOR ? i.physician.free : i.physician.paid),
        options: [
          { text: 'Go on.', effect: (g) => { const why = g.treat(); if (why) g.toast(why); } },
          { text: 'Not now.' },
        ],
      },
      bind: {
        text: 'Then when they find you face down in a ditch, this is where they\'ll carry you. You\'ll wake on your feet by the door, mended. Don\'t thank me. Thank the carters.',
        options: [{ text: 'Thank you.', effect: (g) => { g.setFlag('bind', i.id); g.toast(`When you fall, you'll come back at ${i.name}, ${i.town}.`); } }],
      },
      unbind: {
        text: 'Then it\'s the square at Hollin Ford for you again, and whatever state they find you in.',
        options: [{ text: 'So be it.', effect: (g) => { g.setFlag('bind', false); g.toast('When you fall, you\'ll come back at Hollin Ford.'); } }, { text: 'No, keep it.' }],
      },
      ward: {
        text: i.patients.map((p) => `${p.name}, ${p.title.toLowerCase()}: ${p.ail}`).join(' '),
        next: 'hello',
      },
    },
  };
}

function nurseTree(i: Infirmary): DialogueTree {
  return {
    start: () => 'hello',
    nodes: {
      hello: {
        text: `${i.nurse.name}. I keep the still-room, and the ward when the physician's out. If you want something for the road, I've draughts and bandages.`,
        options: [
          { text: 'Show me what you have.', effect: (g) => g.openShop('inf_' + i.id) },
          { text: 'How are they doing?', next: 'ward' },
          { text: 'Good day.' },
        ],
      },
      ward: { text: i.nurse.ward, next: 'hello' },
    },
  };
}

const npcs: NpcDef[] = [];
const dialogue: Record<string, DialogueTree> = {};
const shops: Record<string, ShopDef> = {};
const stand = (p: { at: [number, number]; face: [number, number] }, anim: 'idle' | 'seated' = 'idle') => [{ from: 0, to: 24, at: p.at, face: p.face, anim }];
for (const i of INFIRMARIES) {
  npcs.push(
    { id: i.physician.id, name: i.physician.name, title: i.physician.title, look: look(i.physician.look), schedule: stand(i.physician), barks: i.physician.barks },
    { id: i.nurse.id, name: i.nurse.name, title: i.nurse.title, look: look(i.nurse.look), schedule: stand(i.nurse), barks: i.nurse.barks },
    ...i.patients.map((p): NpcDef => ({ id: p.id, name: p.name, title: p.title, look: look(p.look), schedule: stand(p, 'seated'), barks: p.barks })),
  );
  dialogue[i.physician.id] = physicianTree(i);
  dialogue[i.nurse.id] = nurseTree(i);
  for (const p of i.patients) dialogue[p.id] = { start: () => 'hello', nodes: { hello: { text: p.says } } };
  shops['inf_' + i.id] = {
    id: 'inf_' + i.id, name: `${i.name}: the still-room`, owner: i.nurse.id,
    stock: [{ item: 'inf_bandage', price: 6 }, { item: 'potion_mend', price: 20 }, { item: 'tonic_vigour', price: 34 }, { item: 'draught_wind', price: 34 }],
    buyRate: () => 0, footer: () => `${i.name} doesn't buy. It gives, and sells a little to keep giving.`,
  } as ShopDef;
}

export const INFIRMARY_CONTENT: RegionContent = { id: 'infirmary', items: ITEMS, npcs, dialogue, shops };
