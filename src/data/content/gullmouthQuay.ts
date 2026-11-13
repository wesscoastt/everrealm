import type { NpcDef } from '../npcs';
import type { AnimState } from '../../entities/humanoid';
import type { RegionContent } from './types';

// Gullmouth's quay at work (owner 2026-11-12: "it should feel bustling like Verandah as a port city"): the people
// whose day is the quay, at the cranes, the nets, the barrels and the fish, from first light until the boats are in.
// Nobody you'd go looking for; they say what's on their mind as you pass. The townsfolk walking the streets and the
// quay are game/Game.ts crowdZones ('gullmouth', 'gullmouth-quay', 'gullmouth-lanes').

type Look = NonNullable<NpcDef['look']>;
const hand = (skin: string, hair: string, tunic: string, extra: Partial<Look> = {}): Look =>
  ({ skin, hair, hairStyle: 0, eyes: '#3a3a2a', tunic, trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a1e14', ...extra });
const day = (x: number, z: number, fx: number, fz: number, anim: AnimState, from = 6, to = 20) =>
  [{ from, to, at: [x, z] as [number, number], face: [fx, fz] as [number, number], anim }];

const npcs: NpcDef[] = [
  { id: 'gq_porter1', name: 'Crane porter', title: 'Gullmouth quay', look: hand('#c88a62', '#2a1e14', '#6a5a3c', { build: 1.15 }),
    schedule: day(1800.5, 580.5, 1802.5, 580.5, 'crouch'), barks: ['Lift with your legs, they said. My legs have opinions.', 'Mind the hook!', 'Two more off this one and it\'s dinner.'] },
  { id: 'gq_porter2', name: 'Crane porter', title: 'Gullmouth quay', look: hand('#8a5a3a', '#1a1a1e', '#4a5a6a', { build: 1.1, hat: 'cap', hatColor: '#3a4a3a' }),
    schedule: day(1800.5, 619.5, 1803.5, 621.5, 'idle'), barks: ['Lower away. Gently. Gently!', 'That\'s wine in there, not turnips.'] },
  { id: 'gq_cooper', name: 'Cooper', title: 'Gullmouth quay', look: hand('#e0b090', '#8a6a3a', '#7a3a2a', { apron: true, beard: true, age: 0.6 }),
    schedule: day(1794.5, 618.5, 1796.5, 618.5, 'hammer'), barks: ['A barrel\'s only as good as its worst stave.', 'Hoops, hoops, always more hoops.'] },
  { id: 'gq_nets1', name: 'Net mender', title: 'Gullmouth quay', look: hand('#c9946a', '#d8d0c0', '#3a5a3a', { frame: 'f', hairStyle: 5, age: 0.8 }),
    schedule: day(1789.5, 574.5, 1791.5, 574.5, 'crouch'), barks: ['Every hole in a net is a fish you didn\'t catch.', 'My mother mended nets on this quay. Her mother too.'] },
  { id: 'gq_nets2', name: 'Net mender', title: 'Gullmouth quay', look: hand('#f1c9a5', '#a84a22', '#556b2f', { frame: 'f', hairStyle: 1 }),
    schedule: day(1789.5, 619.5, 1789.5, 621.5, 'crouch'), barks: ['Hand me that twine. No, the tarred one.', 'The Patience tore this on the Jawbones again.'] },
  { id: 'gq_crier', name: 'Fish crier', title: 'Gullmouth quay', look: hand('#e0b090', '#4a2e1a', '#9a8a6a', { frame: 'f', hairStyle: 3, apron: true }),
    schedule: day(1786.5, 594.5, 1782.5, 596.5, 'idle', 5, 14), barks: ['Mackerel! Fresh in! Mackerel!', 'Crab, two for a mark! Live crab!', 'Sprats for the fire, sprats!'] },
  { id: 'gq_rope', name: 'Harbour hand', title: 'Gullmouth quay', look: hand('#a8744c', '#3a3a3a', '#2e3a4a', { hat: 'kerchief', hatColor: '#7a2a24' }),
    schedule: day(1795.5, 613.5, 1797.5, 613.5, 'crouch'), barks: ['Coil it with the sun, never against it.', 'Wren\'s due back on the tide.'] },
  { id: 'gq_sailor1', name: 'Sailor', title: 'Off the Morwenna', look: hand('#c88a62', '#6a4426', '#3a4a5a', { hat: 'cap', hatColor: '#2a2420' }),
    schedule: day(1784.5, 615.5, 1785.5, 617.5, 'idle', 8, 22), barks: ['Three weeks out and the first thing I smell is fish. Home.', 'Don\'t ask the mate about the storm. Just don\'t.'] },
  { id: 'gq_sailor2', name: 'Sailor', title: 'Off the Morwenna', look: hand('#6a4430', '#1a1a1e', '#7a6a4a', {}),
    schedule: day(1785.5, 617.5, 1784.5, 615.5, 'idle', 8, 22), barks: ['He tells it like he was at the wheel. He was in his hammock.', 'First round\'s on whoever lost the dice.'] },
  { id: 'gq_lad', name: 'Quay lad', title: 'Gullmouth quay', look: hand('#f5d6b8', '#c8a060', '#a0522d', { age: 0.1, height: 0.82, build: 0.85 }),
    schedule: day(1803.5, 593.5, 1809.5, 593.5, 'idle', 7, 19), barks: ['I\'m waiting for my da. He\'s on the Patience.', 'I saw a seal yesterday. A real one.'] },
];

export const GULLMOUTH_QUAY_CONTENT: RegionContent = { id: 'gullmouth-quay', npcs };
