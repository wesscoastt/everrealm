import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Verandah's post (owner 2026-11-05): letters at the Postmaster's Office on the high street and at the two
// mailboxes the owner put up (one on the quay road, one at their own house), and the Charter's yard out by
// the stables, where the yard's carter puts you on the packet (data/postStations.ts). The packet itself comes in to the docks (data/travel.ts,
// the 'verandah' and 'verandahyard' stops; their post boxes come with them).

// Hester lives over the office (owner 2026-11-06: "Hester's home is above the post office: make sure she can path around
// so she can stand behind the desk"). By day she's behind the counter on the west side of the front office, the shelves
// at her back; of an evening she goes through the door in the back wall, round the back room and up the steps the
// owner built there, out through the hole in the floor above, and to her rooms. An NPC walks straight from one
// point to the next and climbs whatever is under it, so the way is laid out step by step.
const BEHIND: [number, number][] = [[-2970.5, 2118.5], [-2968.5, 2118.5]];
const UP_STAIRS: [number, number][] = [[-2968.5, 2117.5], [-2969.5, 2116.5], [-2969.5, 2113.5], [-2965.5, 2113.5], [-2965.5, 2114.5], [-2966.5, 2114.5], [-2967.5, 2114.5], [-2968.5, 2114.5], [-2969.5, 2114.5], [-2969.5, 2118.5]];
/** The post counter in the front office (world/sites.ts 'ver-post'): three lengths of counter with the post on it. */
export const POST_COUNTER: { item: string; x: number; z: number; ry: number }[] = [
  { item: 'counter', x: -2969.5, z: 2119.5, ry: -Math.PI / 2 }, { item: 'counter', x: -2969.5, z: 2120.5, ry: -Math.PI / 2 }, { item: 'counter', x: -2969.5, z: 2121.5, ry: -Math.PI / 2 },
  { item: 'letters', x: -2969.5, z: 2120.5, ry: -Math.PI / 2 },
];

/** The office counter and the owner's two mailboxes, where their signs are (data/mcSigns.ts). */
const MAIL: { id: string; x: number; y: number; z: number; r: number }[] = [
  { id: 'office', x: -2963.5, y: 21, z: 2121.5, r: 2.4 },
  { id: 'quay', x: -2984.5, y: 24, z: 1937.5, r: 1.9 },
  { id: 'house', x: -2482.5, y: 17, z: 2393.5, r: 2.2 },
];

const npcs: NpcDef[] = [
  { id: 'ver_hester', name: 'Hester Pengelly', title: 'Postmistress', look: { frame: 'f', skin: '#e8c0a0', hair: '#5a3a22', hairStyle: 5, eyes: '#3a5a7a', tunic: '#2f528f', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#2a1e14', hat: 'coif', hatColor: '#e8e0d0' },
    schedule: [{ from: 7, to: 20, at: [-2970.5, 2120.5], face: [-2965.5, 2120.5], anim: 'idle', y: 21, path: [...UP_STAIRS].reverse().concat([...BEHIND].reverse()) }, { from: 20, to: 7, at: [-2969.5, 2122.5], face: [-2969.5, 2124.5], anim: 'idle', y: 25, path: [...BEHIND, ...UP_STAIRS] }],
    barks: ['Letters in the slot, parcels on the counter.', 'The packet\'s late again. Weather off the point, they say.', 'If it\'s for the Counties it goes on the Plover. If it\'s for the house on the hill, I walk it up myself.'] },
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

export const VERANDAH_POST: RegionContent = {
  id: 'verandahPost', npcs,
  dialogue: { ver_hester: hester },
  things: MAIL.map((m) => ({ id: 'mail:ver-' + m.id, x: m.x, z: m.z, y: m.y, label: 'Read your post', radius: m.r, use: (g) => g.openMail() })),
};
