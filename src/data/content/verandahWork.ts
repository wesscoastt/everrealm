import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Verandah at work (owner 2026-11-05: "Verandah should feel like a bustling city from the docks to the guards to
// the quarry workers to the farmers"). Dockhands on the quay among the crates; farmhands in the fields below the
// Verandah Farm waystone. The town's crowds walking its streets are game/Game.ts crowdZones ('verandah-*').

const w = (id: string, name: string, title: string, x: number, y: number, z: number, fx: number, fz: number, anim: 'hammer' | 'chop' | 'crouch' | 'idle' | 'mine', held: string | undefined, look: NpcDef['look'], barks: string[]): NpcDef =>
  ({ id, name, title, look, schedule: [{ from: 6, to: 19, at: [x, z], face: [fx, fz], anim, y, ...(held ? { held } : {}) }], barks });

const npcs: NpcDef[] = [
  w('ver_dock_ruan', 'Ruan Pascoe', 'Dockhand', -2894.5, 19, 1900.5, -2894.5, 1897.5, 'hammer', 'hammer',
    { skin: '#c88a62', hair: '#2a1e14', hairStyle: 3, eyes: '#3a2a1e', tunic: '#5a4a3a', trim: '#3a2a1e', trousers: '#2a2a2e', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a24', build: 1.2 },
    ['Mind your feet, crate coming through!', 'Last tide’s still not unloaded.']),
  w('ver_dock_bryok', 'Bryok Nance', 'Dockhand', -2879.5, 16, 1895.5, -2879.5, 1892.5, 'crouch', undefined,
    { skin: '#e2b894', hair: '#c88a3a', hairStyle: 2, eyes: '#4a6a7a', tunic: '#3a4a5a', trim: '#8a8a7a', trousers: '#2a2a2e', boots: '#1e1a16', hat: 'cap', hatColor: '#3a3a4a' },
    ['Rope’s fouled again.', 'Tie her off proper, she’ll walk otherwise.']),
  w('ver_dock_sennen', 'Sennen Tonkin', 'Harbour clerk', -2904.5, 25, 1918.5, -2904.5, 1914.5, 'idle', undefined,
    { frame: 'f', skin: '#e8c4a4', hair: '#4a2a1e', hairStyle: 5, eyes: '#3a4a5a', tunic: '#22365a', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', lashes: true },
    ['Name of your ship? Cargo? No, I don’t believe it either.', 'Harbour dues are paid at the hut, not to me.']),
  w('ver_farm_morwen', 'Morwen Pengelly', 'Farmhand', -2703.5, 21, 2218.5, -2703.5, 2222.5, 'crouch', undefined,
    { frame: 'f', skin: '#d8a888', hair: '#6a3a1e', hairStyle: 1, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw', apron: true, lashes: true },
    ['Weeds grow faster than the corn. Every year.', 'Big house up the hill is ours. Hands sleep there.']),
  w('ver_farm_jacca', 'Jacca Rowe', 'Farmhand', -2697.5, 20, 2203.5, -2697.5, 2207.5, 'chop', 'hatchet',
    { skin: '#c88a62', hair: '#3a2a1e', hairStyle: 0, facial: 2, eyes: '#3a2a1e', tunic: '#6a5a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw', build: 1.15 },
    ['Stakes for the beans. Hundred of them.', 'Warehouse has the seed, if Gerens hasn’t sold it.']),
  w('ver_farm_gerens', 'Gerens Hoskin', 'Farm foreman', -2739.5, 17, 2224.5, -2735.5, 2224.5, 'idle', undefined,
    { skin: '#d8a07a', hair: '#cfcac0', hairStyle: 0, facial: 3, eyes: '#4a5a6a', tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#5a4030', age: 0.7 },
    ['Harvest’s in a fortnight. Nobody’s ready. Nobody ever is.', 'Corn on the left, wheat on the right. Don’t walk on either.']),
];

export const VERANDAH_WORK: RegionContent = { id: 'verandahWork', npcs };

/** Verandah's crowds (game/Game.ts crowdZones): who walks its streets in the day, and what they say. */
export const VERANDAH_CROWDS = [
  { id: 'verandah-high', x: -3040, z: 2131, r: 70, n: 18, lines: ['The king’s roof’s leaking again.', 'Xavier’s got a clock in that strikes thirteen.', 'Sandor’s out of saffron buns. Again.', 'Library’s got a new book. It’s about boilers.'] },
  { id: 'verandah-port', x: -2905, z: 1930, r: 60, n: 14, lines: ['Tegen’s mackerel or Arthur’s? Depends who you owe money to.', 'Ship in from the Counties this morning.', 'Mind the Mermaid’s chowder, it’s hotter than it looks.'] },
  { id: 'verandah-main', x: -3132, z: 2080, r: 50, n: 8, lines: ['Riders went by an hour ago.', 'Stables have a black mare in. Nobody can afford her.'] },
  { id: 'verandah-kestle', x: -2340, z: 2400, r: 40, n: 6, lines: ['Long walk to the town from here. Worth it for the quiet.', 'Somebody’s been fishing the pond up at the big house.'] },
  { id: 'verandah-mizuholm', x: -2850, z: 2750, r: 40, n: 6, lines: ['The paddies want planting before the rain.', 'The bridge needs a new rail.'] },
];
