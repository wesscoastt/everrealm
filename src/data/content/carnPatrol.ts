import type { DialogueTree } from '../../game/api';
import type { NpcDef, ScheduleSlot } from '../npcs';
import type { RegionContent } from './types';
import { at } from './kit';

// Carn Hold's road patrol (docs/VERANDAH.md, Carn Hold: "the road patrol out to Gorran"). Two of Captain Penhallow's
// men walk the Gorran road by day, from the foot of the Carn Hold path to Gorran's gate and back, an hour each way,
// along the path blocks the owner laid (traced 2026-11-20: east to west, z 2318 to the bend at x -3290, then z 2298 into
// Gorran). At night they stand at the turning above the cove, where the night cart turned off (verandahCarn.ts, vhNight).

const EAST: [number, number] = [-3222.5, 2318.5];
const WEST: [number, number] = [-3342.5, 2298.5];
/** The road between, east to west. */
const ROAD: [number, number][] = [[-3240.5, 2318.5], [-3262.5, 2318.5], [-3280.5, 2318.5], [-3292.5, 2308.5], [-3300.5, 2298.5], [-3320.5, 2298.5]];
const TURNING: [number, number] = [-3252.5, 2316.5];

/** Walking the road all day: west on the even hours, east on the odd, a pace apart. */
function beat(off: number): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const west: [number, number] = [WEST[0], WEST[1] + off], east: [number, number] = [EAST[0], EAST[1] + off];
  for (let h = 7; h < 19; h++) {
    const goWest = h % 2 === 1;
    slots.push(goWest
      ? { from: h, to: h + 1, at: west, face: [west[0] - 3, west[1]], anim: 'idle', path: ROAD.map(([x, z]) => [x, z + off] as [number, number]) }
      : { from: h, to: h + 1, at: east, face: [east[0] + 3, east[1]], anim: 'idle', path: [...ROAD].reverse().map(([x, z]) => [x, z + off] as [number, number]) });
  }
  slots.push({ from: 19, to: 7, at: [TURNING[0] + off, TURNING[1]], face: [TURNING[0] + off, TURNING[1] - 4], anim: 'idle' });
  return slots;
}

const LOOK = { skin: '#e2b894', hair: '#5a3a22', hairStyle: 0, facial: 0, eyes: '#4a5a6a', tunic: '#2a3a5a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#1a1612', hat: 'cap' as const, hatColor: '#2a3a5a', build: 1.05, age: 0.35 };

const NPCS: NpcDef[] = [
  { id: 'carn_patrol_bray', name: 'Trooper Bray', title: 'Carn Hold, the Gorran road', look: { ...LOOK },
    schedule: beat(0), barks: ['Road\'s clear.', 'Nine miles a day, and not a bandit in any of them.'] },
  { id: 'carn_patrol_kemp', name: 'Trooper Kemp', title: 'Carn Hold, the Gorran road', look: { ...LOOK, skin: '#a8724a', hair: '#1a1a1e', facial: 2, age: 0.5 },
    schedule: beat(1.5), barks: ['Keep left. Carts keep right.', 'Mind the ruts at the turning.'] },
];

const patrol: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (at(g, 'vhNight') === 'done'
        ? 'Gorran road, Carn Hold patrol. We walk it nights as well now, since the business with the cart. Captain\'s orders. Nothing\'s come by. Nothing will, with us on it.'
        : 'Gorran road, Carn Hold patrol. Down to Gorran gate, back to the Carn path, and again. Anything to report?'),
      options: [{ text: 'Nothing. Good day.' }],
    },
  },
};

export const CARN_PATROL: RegionContent = {
  id: 'carnPatrol',
  npcs: NPCS,
  dialogue: { carn_patrol_bray: patrol, carn_patrol_kemp: patrol },
};
