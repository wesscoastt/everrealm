import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Gorran, the walled village behind the Arena (owner 2026-11-06: "make the settlement behind the arena an actual
// settlement with a name and NPCs, decorate it too"). The owner's village west of the Arena on Verandah: a
// stone-walled square with a gate on the north, a walled field with its water channels, a street east to
// west and the houses either side of it. The people who feed the Arena's crowds live here, and they would
// like the Arena's crowds to go home earlier. Its waymark is world/sites.ts (GORRAN_WAYMARK), its street
// furniture 'ver-gorran'.

export const GORRAN_WAYMARK = { name: 'Gorran', x: -3381.5, y: 22, z: 2294.5 };

/** On the street: a produce stall by the reeve's corner, benches, the notice board, barrels by the smithy. */
export const GORRAN_PROPS: { t: 'stall' | 'bench' | 'notice' | 'barrel' | 'crate' | 'planter'; x: number; y: number; z: number; ry?: number; color?: string }[] = [
  { t: 'stall', x: -3370.5, y: 22, z: 2294.5, ry: 0, color: '#4a6a3a' },
  { t: 'crate', x: -3368.5, y: 22, z: 2294.5 }, { t: 'crate', x: -3368.5, y: 22.62, z: 2294.5 },
  { t: 'bench', x: -3386.5, y: 22, z: 2294.5, ry: 0 }, { t: 'bench', x: -3362.5, y: 22, z: 2302.5, ry: Math.PI },
  { t: 'notice', x: -3378.5, y: 22, z: 2294.5, ry: 0 },
  { t: 'barrel', x: -3372.5, y: 22, z: 2307.5 }, { t: 'barrel', x: -3371.5, y: 22, z: 2307.5 },
  { t: 'planter', x: -3384.5, y: 22, z: 2302.5, ry: Math.PI },
];

const npcs: NpcDef[] = [
  { id: 'gor_loveday', name: 'Loveday Rowse', title: 'Reeve of Gorran', look: { frame: 'f', skin: '#d8a888', hair: '#6a4426', hairStyle: 5, eyes: '#4a5a3a', tunic: '#5a3a2a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a1e14', lashes: true, age: 0.55 },
    schedule: [{ from: 7, to: 21, at: [-3376.5, 2297.5], face: [-3376.5, 2300.5], anim: 'idle', y: 22 }],
    barks: ['Welcome to Gorran. The Arena’s that way, and you can stay there.', 'Fight night again. I’ll have the gate shut by ten.'] },
  { id: 'gor_kenver', name: 'Kenver Hosken', title: 'Smith', look: { skin: '#c88a62', hair: '#2a1e14', hairStyle: 0, facial: 2, eyes: '#3a2a1e', tunic: '#4a3a2a', trim: '#2a2018', shirt: '#c8b8a0', trousers: '#2a2620', boots: '#1e1a16', apron: true, build: 1.3 },
    schedule: [{ from: 7, to: 19, at: [-3373.5, 2309.5], face: [-3374.5, 2309.5], anim: 'hammer', y: 22, held: 'hammer' }],
    barks: ['Arena fighters break more swords than they win.', 'Half my trade is mending what the Arena bent.'] },
  { id: 'gor_tressa', name: 'Tressa Jago', title: 'Farmer', look: { frame: 'f', skin: '#e2b894', hair: '#c88a3a', hairStyle: 1, eyes: '#4a6a7a', tunic: '#5a6a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw', apron: true, lashes: true },
    schedule: [{ from: 6, to: 18, at: [-3389.5, 2287.5], face: [-3389.5, 2284.5], anim: 'crouch', y: 23 }],
    barks: ['Inside the wall, nobody tramples it after a fight.', 'Water runs in the channels. Don’t step in them. Everyone steps in them.'] },
  { id: 'gor_ivo', name: 'Ivo Sowden', title: 'Gorran’s watchman', look: { skin: '#d8a07a', hair: '#9a948c', hairStyle: 0, facial: 3, eyes: '#4a5a6a', tunic: '#3a4a3a', trim: '#8a8a7a', trousers: '#3a3430', boots: '#1e1a16', hat: 'hood', hatColor: '#3a4a3a', cape: '#3a4a3a', age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [-3375.5, 2280.5], face: [-3375.5, 2274.5], anim: 'idle', y: 22 }],
    barks: ['Gate shuts at ten. Arena or no Arena.', 'If you’re carrying a blade, carry it sheathed in here.'] },
  { id: 'gor_agnes', name: 'Agnes Truscott', title: 'Gorran', look: { frame: 'f', skin: '#e8c4a4', hair: '#d8d0c0', hairStyle: 5, eyes: '#3a4a5a', tunic: '#6a3a4a', trim: '#e8dcc0', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, age: 0.75 },
    schedule: [{ from: 6, to: 22, at: [-3363.5, 2287.5], face: [-3365.5, 2285.5], anim: 'idle', y: 24 }],
    barks: ['Wipe your boots. I’ve swept that floor twice today.', 'My grandson fights in the Arena. I don’t watch.'] },
];

const loveday: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Loveday Rowse, reeve of Gorran. We were here before the Arena, and we’ll be here after it, if the crowds leave us any of the village. What can I do for you?',
      options: [
        { text: 'Tell me about Gorran.', next: 'about' },
        { text: 'What’s it like living next to the Arena?', next: 'arena' },
        { text: 'Nothing. Good day.' },
      ],
    },
    about: { text: 'Forty souls, one field, one smith and a wall. The wall’s older than Verandah’s, whatever the Town Book says. We grow, we mend, and on fight nights we sell the crowd pasties at a price I’m not proud of.', next: 'hello' },
    arena: { text: 'Loud. Profitable. Loud. Kenver mends the fighters’ swords, Agnes patches the fighters, and I pick their bottles out of Tressa’s beans in the morning. The king says it brings trade. The king doesn’t live here.', next: 'hello' },
  },
};

export const GORRAN: RegionContent = { id: 'gorran', npcs, dialogue: { gor_loveday: loveday } };
