import type { NpcDef } from '../npcs';
import type { AnimState } from '../../entities/humanoid';
import type { RegionContent } from './types';

// The quarry gang (owner 2026-11-12: "prisoners work in the Verandah quarry; lots of prisoners work in it, and players
// can work there to reduce prison time, levelling mining slowly"). The Charter's prisoners from the town cells cut
// stone in the owner's quarry pit by day, in prison grey, two of the watch on the rim with crossbows. A prisoner in
// any town gaol can ask to go on the gang (game/Justice.ts): each stone broken takes time off and teaches the pick.

/** The pit's floor (game y 1, stood on at 1) and where the gang's stones are; the rim where you're let go. */
export const QUARRY_GANG = {
  floor: 1,
  arrive: [-3086.5, 2040.5] as [number, number],
  stones: [[-3091, 2031], [-3088, 2028], [-3082, 2031], [-3079, 2036], [-3084, 2044], [-3090, 2046]] as [number, number][],
  rim: [-3064.5, 2036.5] as [number, number],
  /** Off what's left, for each stone broken; and the pick's experience for it. */
  cut: 0.06, xp: 22,
  /** The pit, for keeping a prisoner in it. */
  x0: -3104, x1: -3068, z0: 2016, z1: 2060,
};

type Look = NonNullable<NpcDef['look']>;
const grey = (skin: string, hair: string, extra: Partial<Look> = {}): Look =>
  ({ skin, hair, hairStyle: 0, eyes: '#3a3a2a', tunic: '#7a7a74', trim: '#5a5a54', trousers: '#5a5a54', boots: '#2a2018', ...extra });
const work = (x: number, z: number, fx: number, fz: number, anim: AnimState = 'mine') => [{ from: 6, to: 19, at: [x, z] as [number, number], face: [fx, fz] as [number, number], anim, held: 'pickaxe' as const }];

const SAYS = ['Don\'t look at the guards. They like it when you look.', 'Six more blocks and I\'m a day closer.', 'Stole a horse. Wrong horse. The mayor\'s.', 'My back was young when I came here.', 'The stone doesn\'t care what you did.'];
const people: [string, string, number, number, number, number, Partial<Look>][] = [
  ['Hob Treleaven', '#c88a62', -3094.5, 2033.5, -3093, 2032, { beard: true }],
  ['Silas Penhaul', '#e0b090', -3087.5, 2027.5, -3088, 2028, {}],
  ['Tamsin Rowe', '#c9946a', -3081.5, 2032.5, -3082, 2031, { frame: 'f', hairStyle: 3 }],
  ['Ezra Curnow', '#8a5a3a', -3078.5, 2037.5, -3079, 2036, { age: 0.6 }],
  ['Kit Jago', '#f1c9a5', -3085.5, 2045.5, -3084, 2044, { age: 0.1, height: 0.9 }],
  ['Morwen Hext', '#a8744c', -3091.5, 2047.5, -3090, 2046, { frame: 'f', hairStyle: 1 }],
  ['Abel Spargo', '#e0b090', -3094.5, 2038.5, -3096, 2038, { beard: true, build: 1.2 }],
  ['Josiah Bray', '#6a4430', -3077.5, 2042.5, -3076, 2043, {}],
];
const npcs: NpcDef[] = [
  ...people.map(([name, skin, x, z, fx, fz, extra], i): NpcDef => ({
    id: 'qg_' + i, name, title: 'On the quarry gang', look: grey(skin, ['#2a1e14', '#4a2e1a', '#8a6a3a', '#1a1a1e'][i % 4], extra),
    schedule: work(x, z, fx, fz), barks: [SAYS[i % SAYS.length], SAYS[(i + 2) % SAYS.length]],
  })),
  { id: 'qg_guard1', name: 'Quarry guard', title: 'The Charter\'s watch', look: { skin: '#d8a888', hair: '#3a2a1e', hairStyle: 0, eyes: '#3a3a2a', tunic: '#2a3a5a', trim: '#c8b070', trousers: '#2a2630', boots: '#1e1a16', hat: 'coif', hatColor: '#9aa0a6' },
    schedule: [{ from: 6, to: 19, at: [-3066.5, 2030.5], face: [-3080.5, 2034.5], anim: 'idle', held: 'sword' }], barks: ['Keep swinging.', 'Nobody sits till the bell.'] },
  { id: 'qg_guard2', name: 'Quarry guard', title: 'The Charter\'s watch', look: { skin: '#c88a62', hair: '#1e1a16', hairStyle: 0, eyes: '#3a3a2a', tunic: '#2a3a5a', trim: '#c8b070', trousers: '#2a2630', boots: '#1e1a16', hat: 'coif', hatColor: '#9aa0a6' },
    schedule: [{ from: 6, to: 19, at: [-3066.5, 2045.5], face: [-3082.5, 2042.5], anim: 'idle', held: 'sword' }], barks: ['Eyes on the stone.', 'You. Yes, you. Pick up the pace.'] },
];

export const VERANDAH_QUARRY_CONTENT: RegionContent = { id: 'verandah-quarry', npcs };
