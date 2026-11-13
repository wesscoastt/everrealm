import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import type { Appearance } from '../../entities/humanoid';

// Verandah's king and his guard (owner 2026-11-05: "add the king on his throne in the king's home, guardsmen,
// some on horses patrolling"; 2026-11-06: "this is the king's throne", the red-carpeted hall). King Edmund sits
// at the end of his hall between the clipped yews, his steward at his side and two of the guard at the steps.
// The town's guard keeps the gate by the great bridge, the docks and the high street, and two of them walk
// beats along the main roads; two more ride the long loop out by the Charter yard (game/VerandahPatrols.ts).

/** The throne: at the top of the red carpet in the king's hall, where the owner built his chair, facing the door (world/sites.ts draws it). */
export const THRONE = { x: -3064.5, y: 30, z: 1911.5, ry: 0 };

/** The guard's livery: Verandah blue, gold at the edges, steel on the head. */
export const GUARD_LOOK: Appearance = { skin: '#d8a888', hair: '#3a2a1e', hairStyle: 0, eyes: '#3a4a5a', tunic: '#22365a', trim: '#d8b04a', shirt: '#c8ccd2', trousers: '#2a2a34', boots: '#1e1a16', hat: 'circlet', hatColor: '#9aa0a8', cape: '#22365a', build: 1.1 };
const guard = (skin: string, hair: string, frame?: 'f'): Appearance => ({ ...GUARD_LOOK, skin, hair, ...(frame ? { frame, lashes: true } : {}) });

const npcs: NpcDef[] = [
  { id: 'ver_king', name: 'King Edmund Arundell', title: 'King of Verandah', look: { skin: '#e2b894', hair: '#cfcac0', hairStyle: 1, facial: 3, eyes: '#3a4a5a', tunic: '#5a1a2a', trim: '#e0bd64', shirt: '#e8e0d0', trousers: '#2a2026', boots: '#1e1a16', hat: 'circlet', hatColor: '#e0bd64', cape: '#7a1a24', build: 1.1, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [THRONE.x, THRONE.z], face: [THRONE.x, THRONE.z + 3], anim: 'seated', y: THRONE.y }],
    barks: ['Come in. Mind the carpet.', 'Every ship in that harbour pays my roof, and every roof in this town pays my ships.'] },
  { id: 'ver_steward', name: 'Margery Pell', title: 'Steward to the King', look: { frame: 'f', skin: '#e8c4a4', hair: '#6a4a2a', hairStyle: 5, eyes: '#4a5a3a', tunic: '#2a2a3a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'coif', hatColor: '#e8e0d0', lashes: true, age: 0.55 },
    schedule: [{ from: 7, to: 21, at: [-3069.5, 1914.5], face: [-3064.5, 1914.5], anim: 'idle', y: 30 }],
    barks: ['The King sees petitioners in the morning.', 'Speak plainly. He prefers it.'] },
  { id: 'ver_kingsguard_a', name: 'Verandah Guard', title: 'The King’s Guard', look: guard('#c88a62', '#1e1612'), schedule: [{ from: 0, to: 24, at: [-3061.5, 1912.5], face: [-3061.5, 1916.5], anim: 'idle', y: 30, held: 'sword' }], barks: ['Keep your hands where I can see them.'] },
  { id: 'ver_kingsguard_b', name: 'Verandah Guard', title: 'The King’s Guard', look: guard('#e8c0a0', '#8a3a1e', 'f'), schedule: [{ from: 0, to: 24, at: [-3067.5, 1912.5], face: [-3067.5, 1916.5], anim: 'idle', y: 30, held: 'sword' }], barks: ['The King is not to be crowded.'] },
  // the town's guard: the gate by the great bridge, the docks, the high street
  { id: 'ver_guard_gate', name: 'Sergeant Vosper', title: 'Verandah Guard, the gate', look: guard('#d8a07a', '#5a3a22'), schedule: [{ from: 0, to: 24, at: [-3086.5, 2160.5], face: [-3086.5, 2165.5], anim: 'idle', held: 'sword' }], barks: ['Welcome to Verandah. Keep to the road.', 'No blades out inside the walls.'] },
  { id: 'ver_guard_docks', name: 'Verandah Guard', title: 'Verandah Guard, the docks', look: guard('#c8906a', '#2a1e14'), schedule: [{ from: 0, to: 24, at: [-2900.5, 1916.5], face: [-2900.5, 1912.5], anim: 'idle', held: 'sword' }], barks: ['Customs is the hut on the quay.', 'Watch your purse. Not everyone on the docks works there.'] },
  // two beats, walked to and fro on the hour: down the main street, and along the high street
  { id: 'ver_guard_beat_a', name: 'Verandah Guard', title: 'Verandah Guard, on her beat', look: guard('#e2b894', '#c88a3a', 'f'),
    schedule: Array.from({ length: 24 }, (_, h) => ({ from: h, to: h + 1, at: (h % 2 ? [-3131.5, 2128.5] : [-3131.5, 2034.5]) as [number, number], face: (h % 2 ? [-3131.5, 2140.5] : [-3131.5, 2020.5]) as [number, number], anim: 'idle' as const, held: 'sword', path: [[-3131.5, 2080.5]] as [number, number][] })),
    barks: ['Evening.', 'All quiet. Keep it that way.'] },
  { id: 'ver_guard_beat_b', name: 'Verandah Guard', title: 'Verandah Guard, on his beat', look: guard('#c88a62', '#3a2a1e'),
    schedule: Array.from({ length: 24 }, (_, h) => ({ from: h, to: h + 1, at: (h % 2 ? [-2985.5, 2131.5] : [-3100.5, 2131.5]) as [number, number], face: (h % 2 ? [-2975.5, 2131.5] : [-3110.5, 2131.5]) as [number, number], anim: 'idle' as const, held: 'sword', path: [[-3040.5, 2131.5]] as [number, number][] })),
    barks: ['Move along.', 'Market’s that way.'] },
];

const king: DialogueTree = {
  start: (g) => (g.flag('ver:king') ? 'again' : 'meet'),
  nodes: {
    meet: {
      text: 'You’ve come a long way to stand on my carpet. I’m Edmund. The island’s mine, as far as these things go: the harbour, the walls, the roads, and the arguments. Most kings would ask what you want. I’d rather know what you can do.',
      effect: (g) => g.setFlag('ver:king', 1),
      options: [
        { text: 'What does Verandah need?', next: 'needs' },
        { text: 'How did you come to be king?', next: 'how' },
        { text: 'I’m only passing through.', next: 'passing' },
      ],
    },
    needs: { text: 'Hands. The quarry wants men, the farms want more, and my guard walks further every year with the same number of boots. There will be work on my board for anyone who’ll do it. Margery keeps it. Ask her when it’s up.', next: 'again' },
    how: { text: 'My grandfather built the first quay with his own hands and charged the first ship that tied up to it. He called that tax. The island called him king to his face, as a joke. He kept it. So have we.', next: 'again' },
    passing: { text: 'Everyone says that. Then they buy a house on the hill and I never see the back of them. Go on, then. The inns are honest, mostly.' },
    again: {
      text: 'Back again. The carpet survived your last visit. What is it?',
      options: [
        { text: 'What does Verandah need?', next: 'needs' },
        { text: 'How did you come to be king?', next: 'how' },
        { text: 'Nothing, Your Majesty.' },
      ],
    },
  },
};

export const VERANDAH_COURT: RegionContent = { id: 'verandahCourt', npcs, dialogue: { ver_king: king } };
