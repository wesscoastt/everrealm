import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Awschitz Fort, Verandah's coastal watch on the headland west of the town (owner 2026-11-06: "make it another kind of
// fort for Verandah"). Its blocks are scripts/mc/awschitz.cjs: the curtain and its walk (stood on at 23), the four
// towers, the east gate onto the coast road, the garrison's hall in the yard, and the quay and jetty below. It watches
// the western approaches for the wreckers' boats out of Black Gull and sends word to the town when a sail looks wrong.

type Look = NpcDef['look'];
const soldier = (skin: string, hair: string, extra: Partial<NonNullable<Look>> = {}): Look =>
  ({ skin, hair, hairStyle: 0, eyes: '#3a3a2a', tunic: '#22365a', trim: '#d8b04a', trousers: '#2a2630', boots: '#1e1a16', hat: 'coif', hatColor: '#8a8a90', ...extra });

const npcs: NpcDef[] = [
  { id: 'aw_morvah', name: 'Captain Jenifer Morvah', title: 'Awschitz Fort', look: { ...soldier('#d8a888', '#5a3a22'), frame: 'f', hairStyle: 5, lashes: true, hat: undefined, cape: '#22365a', age: 0.5 },
    schedule: [{ from: 6, to: 21, at: [-3352.5, 1962.5], face: [-3347.5, 1965.5], anim: 'idle', y: 16 }, { from: 21, to: 6, at: [-3363.5, 1959.5], face: [-3363.5, 1957.5], anim: 'idle', y: 16 }],
    barks: ['Eyes west. Always west.', 'If a lamp shows on the cliffs, I want to know before it’s lit.'] },
  { id: 'aw_trezise', name: 'Verandah Guard', title: 'On the west wall', look: soldier('#c88a62', '#2a1e14'),
    schedule: [{ from: 0, to: 24, at: [-3373.5, 1966.5], face: [-3385.5, 1966.5], anim: 'idle', y: 23 }],
    barks: ['Nothing on the water.', 'Cold up here.'] },
  { id: 'aw_bolitho', name: 'Verandah Guard', title: 'On the north wall', look: soldier('#e2b894', '#8a6a3a'),
    schedule: [{ from: 0, to: 24, at: [-3362.5, 1952.5], face: [-3362.5, 1940.5], anim: 'idle', y: 23 }],
    barks: ['Gulls. Just gulls.', 'Keep moving, friend.'] },
  { id: 'aw_gate', name: 'Verandah Guard', title: 'At the gate', look: soldier('#d8a07a', '#1e1a16'),
    schedule: [{ from: 0, to: 24, at: [-3346.5, 1963.5], face: [-3340.5, 1963.5], anim: 'idle', y: 16 }],
    barks: ['State your business at the fort.', 'The captain’s in the yard.'] },
  { id: 'aw_quay', name: 'Wenna Chegwidden', title: 'Boatwoman, Awschitz quay', look: { frame: 'f', skin: '#c8906a', hair: '#3a2a1e', hairStyle: 1, eyes: '#3a4a5a', tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#2a2620', boots: '#1e1a16', lashes: true, age: 0.4 },
    schedule: [{ from: 6, to: 20, at: [-3328.5, 1966.5], face: [-3320.5, 1966.5], anim: 'crouch', y: 16 }],
    barks: ['Mind the gap between the boards.', 'The garrison’s supplies come in by water. The road floods.'] },
];

const morvah: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Captain Morvah. This is Awschitz, the king’s watch on the western water. If you’ve come about work, the wall needs eyes and the quay needs hands. If you’ve come to look round, look, and don’t touch the signal fire.',
      options: [
        { text: 'What do you watch for?', next: 'watch' },
        { text: 'Why “Awschitz”?', next: 'name' },
        { text: 'Good day, Captain.' },
      ],
    },
    watch: { text: 'Wreckers out of Black Gull Keep. They light false lamps on the cliffs and wait for a ship to steer for them. We see the lamps from the towers, we send a rider to the town, and the town sends the Conscripts. Some nights we’re in time.', next: 'hello' },
    name: { text: 'It was here before the fort. A family name, I’m told, from whoever farmed the headland first. The men call it “the Itch”. Not where I can hear them.', next: 'hello' },
  },
};

export const AWSCHITZ: RegionContent = { id: 'awschitz', npcs, dialogue: { aw_morvah: morvah } };
