import type { Appearance, AnimState, HeldItem } from '../entities/humanoid';
import type { GameApi } from '../game/api';
import { keepOnLand, type LandId } from '../world/land';
import type { PartId } from './tunes';
import { ALDERMERE as A, CAMP, COLD, FOLD, GULL, LIGHT, MOSSGATE, STARWATCH, TEMPLE, WORKS as W } from './places_regional';

export interface ScheduleSlot {
  from: number; // hour
  to: number;
  at: [number, number];
  face: [number, number];
  anim: AnimState;
  /** A tool by name, or an item by its id (a weapon, an instrument). */
  held?: HeldItem | string;
  /** Playing these tunes in turn on the realm clock while here (anim 'perform', an instrument held): game/Stage.ts. */
  play?: { tunes: string[]; part: PartId };
  /** Waypoints walked (in order) when moving into this slot. */
  path?: [number, number][];
  /** Hidden indoors. */
  indoors?: boolean;
  /** The floor to stand on, where looking down from the sky would find the wrong one (under an upper floor, a canopy). */
  y?: number;
}

export interface NpcDef {
  /** The land they live in (world/land.ts); none given, the Counties. */
  land?: LandId;
  id: string;
  name: string;
  title: string;
  look: Appearance;
  schedule: ScheduleSlot[];
  /** Short lines spoken aloud when the player walks past. */
  barks?: string[];
  wander?: number;
  /** Only in the world while this holds (someone who has left, or is only there during a quest). */
  when?: (g: GameApi) => boolean;
}

export const NPCS: NpcDef[] = [
  {
    id: 'maud', name: 'Maud Ashby', title: 'Reeve of Hollin Ford',
    look: { skin: '#e2b894', hair: '#9a948c', hairStyle: 2, eyes: '#4a6a8a', tunic: '#3c5a7a', trim: '#c8b070', trousers: '#40362c', boots: '#3a2a1c', cape: '#2f4a3a', age: 0.75, lashes: true, build: 0.95 },
    schedule: [
      { from: 6.5, to: 19.5, at: [171.5, 182.6], face: [171.5, 180], anim: 'idle', path: [[162, 184], [171.5, 184]] },
      { from: 19.5, to: 6.5, at: [159.5, 177.4], face: [159.5, 180], anim: 'idle', path: [[171.5, 184], [161, 184]] },
    ],
    barks: ['Four fingers.', 'Somebody fix that peg.'],
  },
  {
    id: 'bram', name: 'Bram Tolley', title: 'Smith',
    look: { skin: '#c88a62', hair: '#3a2418', hairStyle: 3, beard: true, eyes: '#5a3a1a', tunic: '#7a5a3a', trim: '#5a3a24', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.18, height: 1.04, age: 0.4 },
    schedule: [
      { from: 7, to: 19, at: [186.1, 180.5], face: [185.4, 179.6], anim: 'hammer', held: 'hammer', path: [[183, 186], [186, 182]] },
      { from: 19, to: 7, at: [179.4, 193.6], face: [181.5, 193.5], anim: 'idle', path: [[186, 182], [182, 186], [179.5, 191]] },
    ],
  },
  {
    id: 'wren', name: 'Nance Tolley', title: 'Apprentice smith',
    look: { skin: '#c88a62', hair: '#6a3a1a', hairStyle: 2, eyes: '#3a6a3a', tunic: '#a8642e', trim: '#e0c070', trousers: '#4a3a2a', boots: '#3a2a1c', apron: true, build: 0.86, height: 0.9, lashes: true, age: 0.1 },
    schedule: [
      { from: 7, to: 19, at: [184.8, 178.2], face: [184.8, 176.9], anim: 'bellows', path: [[183, 186], [184, 182]] },
      { from: 19, to: 22, at: [181.6, 196.4], face: [181.5, 193.5], anim: 'idle', path: [[183, 182], [182, 186], [180, 192]] },
      { from: 22, to: 7, at: [186.0, 179.0], face: [187, 178], anim: 'idle', path: [[180, 192], [182, 186], [185, 182]] },
    ],
    barks: ['Uncle Bram, the fire!', 'Hinges. Always hinges.'],
  },
  {
    id: 'pell', name: 'Pell Garrow', title: 'Fisherman',
    look: { skin: '#d8a07a', hair: '#dedad2', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#5a6a5a', trim: '#8a7a5a', trousers: '#4a4a3a', boots: '#3a2a1c', hat: 'cap', hatColor: '#3a4a5a', age: 0.95, build: 0.94, height: 0.95 },
    schedule: [
      { from: 5.5, to: 20, at: [166.5, 197.5], face: [166.5, 201], anim: 'fishWait', held: 'rod', path: [[163.6, 197.4]] },
      { from: 20, to: 5.5, at: [164.2, 201.5], face: [162, 201.5], anim: 'idle', path: [[163.6, 197.4]] },
    ],
    barks: ['Penny water.', 'Mind that board.'],
  },
  {
    id: 'hesk', name: 'Hesketh Dunmore', title: 'Foreman, Harrowgate & Daughters',
    look: { skin: '#a8704a', hair: '#2a1a12', hairStyle: 0, eyes: '#3a2a1a', tunic: '#7a3a2a', trim: '#d8b05a', trousers: '#3a3430', boots: '#2a1e14', shoulderPads: '#5a3a24', build: 1.12, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [216.4, 121.8], face: [216.4, 128], anim: 'idle' }],
  },
  {
    id: 'tamsin', name: 'Tamsin Pargeter', title: 'Trader',
    look: { skin: '#f0c8a8', hair: '#c8642e', hairStyle: 1, eyes: '#4a7a4a', tunic: '#5a2f6a', trim: '#e8c060', trousers: '#3a2a3a', boots: '#2a1e1a', lashes: true, build: 0.92, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [156.5, 192.6], face: [156.5, 188], anim: 'idle' }],
  },
  {
    id: 'joss', name: 'Joss Wether', title: 'Farmer',
    look: { skin: '#d09870', hair: '#8a5a2a', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#6a7a3a', trim: '#a8904a', trousers: '#5a4a3a', boots: '#3a2a1c', hat: 'cap', hatColor: '#c8a850', build: 1.05, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [137, 210.2], face: [137, 214], anim: 'idle' }],
    wander: 4,
  },
  {
    id: 'dilly', name: 'Dilly Ashcroft', title: '',
    look: { skin: '#f0c8a0', hair: '#e8c070', hairStyle: 4, eyes: '#4a6a9a', tunic: '#c84a5a', trim: '#f0e0c0', trousers: '#5a4a6a', boots: '#4a3020', lashes: true, build: 0.85, height: 0.72, age: 0 },
    schedule: [{ from: 0, to: 24, at: [151, 189], face: [153, 186], anim: 'idle' }],
    wander: 5,
  },
  // ================================================================ Ansbury, Turnpike
  {
    id: 'strake', name: 'Edda Strake', title: 'Corporal, South Gate',
    look: { skin: '#d8a882', hair: '#5a4030', hairStyle: 2, eyes: '#4a5a4a', tunic: '#7a2a2a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', shoulderPads: '#6a6a72', lashes: true, build: 1.04, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [A.cx + 7, A.south - 4.5], face: [A.cx, A.south - 4], anim: 'idle' }],
    barks: ['Name and load.', 'Toll\'s on the board.'],
  },
  {
    id: 'osric', name: 'Osric Penhallow', title: 'Weighmaster of Ansbury',
    look: { skin: '#f0cfb0', hair: '#c8c4bc', hairStyle: 0, eyes: '#5a6a7a', tunic: '#2e3a5a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', cape: '#4a2a3a', build: 0.92, height: 1.02, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [A.cx + 12, A.cz + 23.4], face: [A.cx + 12, A.cz + 18], anim: 'idle' }],
    barks: ['Next load.'],
  },
  {
    id: 'perrin', name: 'Perrin Gale', title: 'Charter Market',
    look: { skin: '#b07a52', hair: '#1e1612', hairStyle: 4, eyes: '#3a2a1a', tunic: '#3a6a5a', trim: '#e8d090', trousers: '#4a3a2a', boots: '#3a2a1c', apron: true, lashes: true, build: 0.98, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [A.cx - 12, A.cz + 23.4], face: [A.cx - 12, A.cz + 18], anim: 'idle' }],
    barks: ['Bread\'s this morning\'s.', 'Don\'t squeeze it, buy it.'],
  },
  // The Exchange's brokers: one book, three counters (game/Exchange.ts)
  {
    id: 'wray', name: 'Gideon Wray', title: 'Exchange broker, Guild Ward',
    look: { skin: '#d8a882', hair: '#3a2a1e', hairStyle: 1, eyes: '#4a3a2a', tunic: '#2e3a5a', trim: '#c8a050', trousers: '#2a2a30', boots: '#1e1a16', hat: 'cap', hatColor: '#2a2a34', build: 0.94, age: 0.5 },
    // At his desk on the Guildhall square, facing the fountain
    schedule: [{ from: 0, to: 24, at: [775.5, 162.5], face: [775.5, 168], anim: 'idle' }],
    barks: ['The book\'s open.', 'Posted in Ansbury, sold in Gullmouth.'],
  },
  {
    id: 'tregear', name: 'Morwenna Tregear', title: 'Exchange broker, Gullmouth',
    look: { skin: '#c89070', hair: '#1e1612', hairStyle: 3, eyes: '#2a3a4a', tunic: '#3a5a6a', trim: '#e0d0a0', trousers: '#2e3a40', boots: '#2a1e14', lashes: true, build: 1, age: 0.4 },
    // Outside the harbour office, by the bank counter
    schedule: [{ from: 0, to: 24, at: [GULL.coast - 20.5, 587.5], face: [GULL.coast - 22.5, 584], anim: 'idle' }],
    barks: ['Same book as Ansbury\'s.', 'Selling? Price it to move.'],
  },
  {
    id: 'pound', name: 'Silas Pound', title: 'Exchange broker, Harrowgate',
    look: { skin: '#e0b48e', hair: '#8a8a84', hairStyle: 0, beard: true, eyes: '#4a4030', tunic: '#5a4a3a', trim: '#b89048', trousers: '#3a3028', boots: '#2a1e14', build: 1.1, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [988.5, 994.5], face: [984.5, 994.5], anim: 'idle' }],
    barks: ['Buying or selling?'],
  },
  {
    id: 'hob', name: 'Hob Tannet', title: 'Carter, Cotter\'s End',
    look: { skin: '#c88a62', hair: '#7a5a3a', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#6a5a3a', trim: '#8a7a5a', trousers: '#4a4034', boots: '#3a2a1c', hat: 'cap', hatColor: '#5a4a2a', build: 1.08, age: 0.55 },
    // Waiting on the road below the market with his empty cart, by the well.
    schedule: [{ from: 0, to: 24, at: [A.cx - 9, A.cz + 32], face: [A.cx + 12, A.cz + 24], anim: 'idle' }],
    barks: ['Four sacks. Four.'],
    wander: 3,
  },
  // ================================================================ Gullmouth and Fleet Light
  {
    id: 'nessa', name: 'Nessa Crane', title: 'Harbourmaster',
    look: { skin: '#c89070', hair: '#3a2a22', hairStyle: 1, eyes: '#3a5a6a', tunic: '#2a3a4a', trim: '#c8b070', trousers: '#2a2a2a', boots: '#1e1a18', cape: '#1e2a3a', lashes: true, build: 1.0, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [GULL.coast - 16, GULL.z + 3], face: [GULL.coast - 8, GULL.z + 3], anim: 'idle' }],
    barks: ['Two marks a month.'],
  },
  {
    id: 'jory', name: 'Jory Maddox', title: 'Fisherman',
    look: { skin: '#d8a07a', hair: '#a85a2a', hairStyle: 0, eyes: '#4a6a7a', tunic: '#5a6a7a', trim: '#8a7a5a', trousers: '#4a4a3a', boots: '#3a2a1c', hat: 'kerchief', hatColor: '#2a4a6a', build: 0.95, height: 0.97, age: 0.15 },
    schedule: [{ from: 0, to: 24, at: [GULL.coast + 20, GULL.z - 0.5], face: [GULL.coast + 26, GULL.z - 0.5], anim: 'fishWait', held: 'rod' }],
  },
  {
    id: 'bett', name: 'Bett Rook', title: 'Chandler',
    look: { skin: '#e2b894', hair: '#9a948c', hairStyle: 2, eyes: '#5a4a3a', tunic: '#6a3a2a', trim: '#d8c090', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.02, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [GULL.coast - 20, GULL.z + 5.5], face: [GULL.coast - 20, GULL.z + 2], anim: 'idle' }],
    barks: ['Fish, I\'ll pay for.'],
  },
  {
    id: 'hester', name: 'Hester Coggin', title: 'Keeper, Fleet Light',
    look: { skin: '#e8c0a0', hair: '#dedad2', hairStyle: 1, eyes: '#4a5a6a', tunic: '#3a3a3a', trim: '#a8a090', trousers: '#2a2a2a', boots: '#1e1a18', cape: '#2a3a3a', lashes: true, build: 0.9, height: 0.96, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [LIGHT.x + 4.5, LIGHT.z - 1], face: [LIGHT.x + 9, LIGHT.z - 1], anim: 'idle' }],
  },
  // ================================================================ Harrowgate Works, Raddle Barrens
  {
    id: 'pryce', name: 'Aubrey Pryce', title: 'Buyer, Harrowgate & Daughters',
    look: { skin: '#e8c4a4', hair: '#4a3a2a', hairStyle: 0, eyes: '#6a5a3a', tunic: '#4a4a52', trim: '#c8c8c0', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', build: 0.9, height: 1.05, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [W.cx - 14.5, W.cz - 3.5], face: [W.cx - 12.5, W.cz - 3.5], anim: 'idle' }],
    barks: ['Buying. Not selling.'],
  },
  {
    id: 'delia', name: 'Delia Harrowgate', title: 'Partner, Harrowgate & Daughters',
    look: { skin: '#c89272', hair: '#6a3a22', hairStyle: 2, eyes: '#3a4a3a', tunic: '#5a2a22', trim: '#e0b860', trousers: '#3a2a22', boots: '#2a1e14', cape: '#3a2418', lashes: true, build: 1.0, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [W.cx + 9.5, W.cz - 2.5], face: [W.cx + 12, W.cz + 8], anim: 'idle' }],
  },
  {
    id: 'corrie', name: 'Corrie Dunmore', title: 'Drift boss, No. 1 Drift',
    look: { skin: '#a8704a', hair: '#2a1a12', hairStyle: 4, eyes: '#3a2a1a', tunic: '#6a4a2a', trim: '#b08a4a', trousers: '#3a3430', boots: '#2a1e14', shoulderPads: '#5a3a24', lashes: true, build: 1.1, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [W.cx + 10, W.cz + 3.5], face: [W.cx + 14, W.cz + 6], anim: 'idle' }],
    barks: ['Shift\'s in an hour.', 'Lamps on hooks, not on floors.'],
  },
  {
    id: 'wick', name: 'Wick Abery', title: 'Miner, laid up',
    look: { skin: '#b88058', hair: '#1a120e', hairStyle: 3, eyes: '#3a2a1a', tunic: '#5a5048', trim: '#7a6a5a', trousers: '#3a3430', boots: '#2a1e14', build: 1.06, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [W.cx - 2.5, W.cz - 7.5], face: [W.cx - 2.5, W.cz - 3], anim: 'idle' }],
  },
  {
    id: 'tamFeld', name: 'Tam Feld', title: 'Company store',
    look: { skin: '#d8a882', hair: '#8a6a4a', hairStyle: 0, eyes: '#4a4a3a', tunic: '#7a3a2a', trim: '#d8b05a', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.0, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [W.cx + 16.5, W.cz - 5.5], face: [W.cx + 16.5, W.cz - 1], anim: 'idle' }],
    barks: ['Company prices.'],
  },
  // ================================================================ Fellers' Camp, Hagworm Wood
  {
    id: 'ide', name: 'Ide Marrow', title: 'Camp boss, Fellers\' Camp',
    look: { skin: '#c89070', hair: '#5a3a22', hairStyle: 2, eyes: '#4a5a3a', tunic: '#4a5a3a', trim: '#a88a4a', trousers: '#3a3428', boots: '#2a1e14', lashes: true, build: 1.06, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x + 2.5, CAMP.z + 6.5], face: [CAMP.x + 0.5, CAMP.z + 0.5], anim: 'idle' }],
    barks: ['Thirty-seven.', 'Mind the stumps.'],
  },
  {
    id: 'sefton', name: 'Sefton Garrow', title: 'Feller',
    look: { skin: '#d8a07a', hair: '#cfcac0', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#6a4a2a', trim: '#8a7a5a', trousers: '#4a4a3a', boots: '#3a2a1c', hat: 'cap', hatColor: '#5a3a24', build: 1.1, age: 0.8 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x + 9.5, CAMP.z + 1], face: [CAMP.x + 7.5, CAMP.z - 2], anim: 'idle', held: 'hatchet' }],
    // Gone home to Hollin Ford if the player had him sent off.
    when: (g) => g.flag('timberChoice') !== 'send',
  },
  {
    id: 'kit', name: 'Kit Ashcroft', title: 'Feller',
    look: { skin: '#f0c8a0', hair: '#e8c070', hairStyle: 0, eyes: '#4a6a9a', tunic: '#7a5a3a', trim: '#c8a860', trousers: '#4a3a2a', boots: '#3a2a1c', build: 0.95, height: 0.98, age: 0.15 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x - 8.5, CAMP.z], face: [CAMP.x, CAMP.z], anim: 'idle', held: 'hatchet' }],
    barks: ['Timber!', 'Not that one.'],
    when: (g) => g.flag('timberChoice') !== 'keep',
  },
  {
    // Kit after Sefton was kept on the saw: across the clearing, as far from him as the camp allows.
    id: 'kitFar', name: 'Kit Ashcroft', title: 'Feller',
    look: { skin: '#f0c8a0', hair: '#e8c070', hairStyle: 0, eyes: '#4a6a9a', tunic: '#7a5a3a', trim: '#c8a860', trousers: '#4a3a2a', boots: '#3a2a1c', build: 0.95, height: 0.98, age: 0.15 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x - 20, CAMP.z + 6], face: [CAMP.x - 26, CAMP.z + 6], anim: 'idle', held: 'hatchet' }],
    when: (g) => g.flag('timberChoice') === 'keep',
  },
  {
    id: 'odo', name: 'Odo Fenn', title: 'Camp stores',
    look: { skin: '#b88058', hair: '#2a1a12', hairStyle: 3, beard: true, eyes: '#3a2a1a', tunic: '#8a6a4a', trim: '#5a3a24', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.15, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x - 4.5, CAMP.z + 5], face: [CAMP.x - 3, CAMP.z + 3], anim: 'idle' }],
    barks: ['Stew\'s on.'],
  },
  // ================================================================ Kelderby, Scarth Watch and Hale's Fold, Scarth Highlands
  {
    id: 'wenna', name: 'Wenna Hale', title: 'Shepherd, Kelderby',
    look: { skin: '#e8c4a4', hair: '#3a2a22', hairStyle: 4, eyes: '#3a4a5a', tunic: '#5a6a7a', trim: '#c8c0b0', trousers: '#3a3a3a', boots: '#2a1e14', cape: '#6a5a4a', lashes: true, build: 1.0, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [COLD.x - 8.5, COLD.z - 2], face: [COLD.x - 8.5, COLD.z + 2], anim: 'idle' }],
  },
  {
    id: 'cai', name: 'Cai Morgan', title: 'Carter, Kelderby',
    look: { skin: '#d8a882', hair: '#2a1a12', hairStyle: 0, beard: true, eyes: '#3a4a5a', tunic: '#7a4a2a', trim: '#b0a080', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a3a2a', hat: 'hood', hatColor: '#4a3a2a', build: 1.12, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [COLD.x + 6, COLD.z - 2.5], face: [COLD.x + 6, COLD.z + 2], anim: 'idle' }],
    barks: ['Sledge\'s out back.'],
  },
  {
    id: 'ilse', name: 'Ilse Blewitt', title: 'Astronomer, Scarth Watch',
    look: { skin: '#f0d0b8', hair: '#8a8a90', hairStyle: 1, eyes: '#4a5a7a', tunic: '#2a3a5a', trim: '#c8d0e0', trousers: '#2a2a34', boots: '#1e1a18', cape: '#1a2a4a', lashes: true, build: 0.9, height: 1.04, age: 0.65 },
    schedule: [{ from: 0, to: 24, at: [STARWATCH.x - 1.5, STARWATCH.z + 9], face: [STARWATCH.x - 3.5, STARWATCH.z + 9.5], anim: 'idle' }],
  },
  {
    id: 'bryn', name: 'Bryn Hale', title: 'Shepherd',
    look: { skin: '#d0a080', hair: '#6a4a2a', hairStyle: 0, beard: true, eyes: '#3a4a3a', tunic: '#6a6a5a', trim: '#a09070', trousers: '#4a4034', boots: '#2a1e14', cape: '#5a4a3a', build: 1.04, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [FOLD.x - 1.5, FOLD.z + 3.5], face: [FOLD.x + 0.5, FOLD.z + 4.5], anim: 'idle' }],
    // At the fold only while he's stranded there.
    when: (g) => ['askIlse', 'findBryn', 'feed', 'tellCai', 'askWenna'].includes(g.stage('highPasture') ?? ''),
  },
  {
    id: 'brynHome', name: 'Bryn Hale', title: 'Shepherd, laid up',
    look: { skin: '#d0a080', hair: '#6a4a2a', hairStyle: 0, beard: true, eyes: '#3a4a3a', tunic: '#6a6a5a', trim: '#a09070', trousers: '#4a4034', boots: '#2a1e14', cape: '#5a4a3a', build: 1.04, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [COLD.x - 6, COLD.z - 0.5], face: [COLD.x - 8.5, COLD.z - 2], anim: 'idle' }],
    when: (g) => g.stage('highPasture') === 'done',
  },
  // ================================================================ Main story: The Charter's Debt
  {
    id: 'lowen', name: 'Lowen Pike', title: 'Clerk of the Toll Office',
    look: { skin: '#e8c8a8', hair: '#6a5a4a', hairStyle: 0, eyes: '#5a5a4a', tunic: '#3a3a42', trim: '#a8a090', trousers: '#2a2a2e', boots: '#1e1a18', build: 0.92, height: 1.02, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [A.cx - 9.5, A.south - 9], face: [A.cx - 9.5, A.south - 7.5], anim: 'idle' }],
  },
  {
    id: 'maren', name: 'Hilda Harrowgate', title: 'Partner, Harrowgate & Daughters',
    look: { skin: '#c89272', hair: '#4a2a18', hairStyle: 1, eyes: '#3a4a3a', tunic: '#4a4a52', trim: '#e0b860', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', lashes: true, build: 0.95, height: 1.03, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [A.cx - 4.5, A.cz + 13.5], face: [A.cx - 4.5, A.cz + 20], anim: 'idle' }],
  },
  {
    id: 'rhosyn', name: 'Rhosyn Tarrant', title: 'Speaker of the Charter',
    look: { skin: '#b07a52', hair: '#d8d4cc', hairStyle: 2, eyes: '#4a3a2a', tunic: '#5a2a3a', trim: '#e8d090', trousers: '#2a2228', boots: '#1e1a18', cape: '#3a1a2a', lashes: true, build: 1.0, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [A.cx + 0.5, A.cz + 12.5], face: [A.cx + 0.5, A.cz + 20], anim: 'idle' }],
    when: (g) => !!g.stage('storySitting'),
  },
  {
    id: 'wynn', name: 'Wynn Carrow', title: 'Antiquarian',
    look: { skin: '#e2b894', hair: '#a8642e', hairStyle: 0, beard: true, eyes: '#4a6a4a', tunic: '#6a5a3a', trim: '#c8b070', trousers: '#4a4a3a', boots: '#3a2a1c', hat: 'cap', hatColor: '#4a5a3a', build: 0.9, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [MOSSGATE.x - 2.5, MOSSGATE.z + 4.5], face: [MOSSGATE.x - 2.5, MOSSGATE.z], anim: 'idle' }],
    barks: ['Don\'t lean on that.'],
  },
  {
    id: 'sela', name: 'Sela Orme', title: 'Keeper, Glass Kirk',
    look: { skin: '#d8b090', hair: '#3a3a3a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#6a6a62', trim: '#9fd8f0', trousers: '#3a3a38', boots: '#2a2620', cape: '#5a6a6a', lashes: true, build: 0.95, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [TEMPLE.x - 5.5, TEMPLE.z + 6.5], face: [TEMPLE.x, TEMPLE.z], anim: 'idle' }],
    when: (g) => g.stage('storySitting') !== 'sitting',
  },
  {
    id: 'joan', name: 'Joan Harrowgate', title: 'Engineer, Harrowgate & Daughters',
    look: { skin: '#c89272', hair: '#6a3a22', hairStyle: 0, eyes: '#3a4a3a', tunic: '#6a4a2a', trim: '#e0b860', trousers: '#3a3028', boots: '#2a1e14', hat: 'cap', hatColor: '#c8a040', shoulderPads: '#5a3a24', lashes: true, build: 1.05, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [TEMPLE.x + 21.5, TEMPLE.z + 1.5], face: [TEMPLE.x + 12, TEMPLE.z + 1], anim: 'idle' }],
    when: (g) => g.stage('storySitting') !== 'sitting',
  },
  {
    // Sela and Joan at the Charter's sitting in Ansbury
    id: 'selaSitting', name: 'Sela Orme', title: 'Keeper, Glass Kirk',
    look: { skin: '#d8b090', hair: '#3a3a3a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#6a6a62', trim: '#9fd8f0', trousers: '#3a3a38', boots: '#2a2620', cape: '#5a6a6a', lashes: true, build: 0.95, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [A.cx + 3, A.cz + 15], face: [A.cx + 0.5, A.cz + 12.5], anim: 'idle' }],
    when: (g) => g.stage('storySitting') === 'sitting',
  },
  {
    id: 'joanSitting', name: 'Joan Harrowgate', title: 'Engineer, Harrowgate & Daughters',
    look: { skin: '#c89272', hair: '#6a3a22', hairStyle: 0, eyes: '#3a4a3a', tunic: '#6a4a2a', trim: '#e0b860', trousers: '#3a3028', boots: '#2a1e14', hat: 'cap', hatColor: '#c8a040', shoulderPads: '#5a3a24', lashes: true, build: 1.05, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [A.cx + 8.5, A.cz + 14], face: [A.cx - 4.5, A.cz + 13.5], anim: 'idle' }],
    when: (g) => g.stage('storySitting') === 'sitting',
  },
];

// Side content people (src/data/content).
import { CONTENT } from './content';
for (const c of CONTENT) NPCS.push(...(c.npcs ?? []));
// Only this land's people
keepOnLand(NPCS);
