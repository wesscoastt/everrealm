import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Verandah's post (owner 2026-11-05): letters at the Postmaster's Office on the high street and at the two
// mailboxes the owner put up (one on the quay road, one at their own house), and the Charter's yard out by
// the stables, where Ned Pascoe puts you on the packet. The packet itself comes in to the docks (data/travel.ts,
// the 'verandah' and 'verandahyard' stops; their post boxes come with them).

/** The office counter and the owner's two mailboxes, where their signs are (data/mcSigns.ts). */
const MAIL: { id: string; x: number; y: number; z: number; r: number }[] = [
  { id: 'office', x: -2963.5, y: 21, z: 2121.5, r: 2.4 },
  { id: 'quay', x: -2984.5, y: 24, z: 1937.5, r: 1.9 },
  { id: 'house', x: -2482.5, y: 17, z: 2393.5, r: 2.2 },
];

const npcs: NpcDef[] = [
  { id: 'ver_hester', name: 'Hester Pengelly', title: 'Postmistress', look: { frame: 'f', skin: '#e8c0a0', hair: '#5a3a22', hairStyle: 5, eyes: '#3a5a7a', tunic: '#2f528f', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#2a1e14', hat: 'coif', hatColor: '#e8e0d0' },
    schedule: [{ from: 6, to: 20, at: [-2964.5, 2120.5], face: [-2963.5, 2123.5], anim: 'idle', y: 21 }, { from: 20, to: 6, at: [-2969.5, 2122.5], face: [-2969.5, 2124.5], anim: 'idle', y: 25 }],
    barks: ['Letters in the slot, parcels on the counter.', 'The packet\'s late again. Weather off the point, they say.', 'If it\'s for the Counties it goes on the Plover. If it\'s for the house on the hill, I walk it up myself.'] },
  { id: 'ver_ned', name: 'Ned Pascoe', title: 'The Charter carter', look: { frame: 'm', skin: '#c8906a', hair: '#7a5a3a', hairStyle: 2, facial: 2, eyes: '#4a3a2a', tunic: '#2f528f', trim: '#8a6a3a', shirt: '#d8ccb0', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#2f528f' },
    schedule: [{ from: 0, to: 24, at: [-3294.5, 2058.5], face: [-3294.5, 2061.5], anim: 'idle', y: 17 }],
    barks: ['Packet for the Counties, from the docks. I\'ll see you aboard.', 'Best horses on the island in that stable. Not mine, more\'s the pity.'] },
];

const hester: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Verandah post office. I\'m Hester. Anything for you, it\'s in your box, and anything from you goes out on the next packet. What can I do?',
      options: [
        { text: 'Any post for me?', effect: (g) => g.openMail() },
        { text: 'Where does the post go from here?', next: 'where' },
        { text: 'Nothing, thanks.' },
      ],
    },
    where: { text: 'Out to the Counties on the Plover, from the docks. The mailboxes on the quay road and up at the big house get emptied every morning. I do the house myself. It\'s a long walk, but the view\'s worth it.', next: 'hello' },
  },
};

const ned: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Charter Post, Verandah yard. Nothing runs from the island by road, so it\'s the packet from the docks. You buy your passage here and I\'ll see you get to the quay. Where to?',
      options: [
        { text: 'Show me where I can go.', effect: (g) => g.openTravel('verandahyard') },
        { text: 'Not today.' },
      ],
    },
  },
};

export const VERANDAH_POST: RegionContent = {
  id: 'verandahPost', npcs,
  dialogue: { ver_hester: hester, ver_ned: ned },
  things: MAIL.map((m) => ({ id: 'mail:ver-' + m.id, x: m.x, z: m.z, y: m.y, label: 'Read your post', radius: m.r, use: (g) => g.openMail() })),
};
