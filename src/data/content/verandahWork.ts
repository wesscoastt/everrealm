import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Verandah at work (owner 2026-11-05: "Verandah should feel like a bustling city from the docks to the guards to
// the quarry workers to the farmers"). Dockhands on the quay among the crates; farmhands in the fields below the
// Verandah Farm waystone; quarrymen down in the pit off the main street (the owner's quarry, dug to the bedrock);
// a felling camp of the game's own in the meadow by the west road, past the carter; and the owner's lumberyard by
// the channel (owner 2026-11-06: "the main lumberyard", "the boats they use to ship lumber down the channel from
// the warehouse"): the timber split and sawn in the big hall, stacked in the boathouse, and loaded on the boat in
// its slip to go down the channel. The town's crowds walking its streets are game/Game.ts crowdZones ('verandah-*').

const w = (id: string, name: string, title: string, x: number, y: number, z: number, fx: number, fz: number, anim: 'hammer' | 'chop' | 'crouch' | 'idle' | 'mine', held: string | undefined, look: NpcDef['look'], barks: string[]): NpcDef =>
  ({ id, name, title, look, schedule: [{ from: 6, to: 19, at: [x, z], face: [fx, fz], anim, y, ...(held ? { held } : {}) }], barks });

// The blacksmith (owner 2026-11-06: "the blacksmith works on his forge bottom floor and lives on the second floor"):
// the owner's stone smithy by the Forge Yard Stables. Out of the north door, east to the foot of the stair outside,
// up it and in at the top door to his rooms; the way laid step by step (an NPC walks straight to the next point).
const SMITH_UP: [number, number][] = [[-2797.5, 2142.5], [-2793.5, 2142.5], [-2793.5, 2136.5], [-2793.5, 2133.5], [-2789.5, 2133.5], [-2789.5, 2134.5], [-2789.5, 2140.5], [-2790.5, 2141.5], [-2792.5, 2141.5]];
const smith: NpcDef = {
  id: 'ver_smith_kessell', name: 'Jowan Kessell', title: 'Blacksmith', look: { skin: '#c88a62', hair: '#1e1a16', hairStyle: 0, facial: 3, eyes: '#3a2a1e', tunic: '#3a2a1e', trim: '#2a2018', shirt: '#c8b8a0', trousers: '#2a2620', boots: '#1e1a16', apron: true, build: 1.35, age: 0.5 },
  schedule: [
    { from: 7, to: 19, at: [-2797.5, 2145.5], face: [-2798.5, 2146.5], anim: 'hammer', y: 24, held: 'hammer', path: [...SMITH_UP].reverse() },
    { from: 19, to: 7, at: [-2793.5, 2142.5], face: [-2796.5, 2140.5], anim: 'idle', y: 29, path: SMITH_UP },
  ],
  barks: ['Hold that horse still or lose a finger. Your choice.', 'Shoes, hinges, the king’s gate. Whatever comes through the door.'],
};

const npcs: NpcDef[] = [
  smith,
  w('ver_dock_ruan', 'Ruan Pascoe', 'Dockhand', -2894.5, 19, 1900.5, -2894.5, 1899.4, 'hammer', 'hammer',
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
  w('ver_quarry_kitto', 'Kitto Opie', 'Quarryman', -3093.5, 1, 2030.5, -3096.5, 2030.5, 'mine', 'pickaxe',
    { skin: '#c88a62', hair: '#1e1a16', hairStyle: 3, facial: 1, eyes: '#3a2a1e', tunic: '#6a6a62', trim: '#3a3430', trousers: '#3a3430', boots: '#1e1a16', hat: 'cap', hatColor: '#4a4a4a', build: 1.25 },
    ['Granite here. Good granite. Breaks my back, but it’s good.', 'Mind the edge. It’s a long way up and a short way down.']),
  w('ver_quarry_hedra', 'Hedra Vean', 'Quarrywoman', -3079.5, 1, 2044.5, -3076.5, 2044.5, 'mine', 'pickaxe',
    { frame: 'f', skin: '#e2b894', hair: '#5a3a24', hairStyle: 5, eyes: '#4a5a6a', tunic: '#5a5a52', trim: '#8a6a3a', trousers: '#3a3430', boots: '#1e1a16', hat: 'kerchief', hatColor: '#8a6a3a', lashes: true },
    ['Every stone in the king’s wall came out of this hole.', 'Stone’s cheaper than timber here. Funny, with all those trees.']),
  w('ver_quarry_ned', 'Ned Carne', 'Quarry ganger', -3086.5, 1, 2052.5, -3086.5, 2046.5, 'idle', undefined,
    { skin: '#d8a07a', hair: '#8a8a82', hairStyle: 0, facial: 3, eyes: '#3a4a5a', tunic: '#4a4a42', trim: '#c8a050', trousers: '#3a3430', boots: '#1e1a16', hat: 'wide', hatColor: '#3a3430', age: 0.6, build: 1.15 },
    ['Six cartloads by sundown or nobody’s paid.', 'If you’re not working, you’re in the way.']),
  w('ver_wood_digory', 'Digory Trounce', 'Woodcutter', -3313.5, 20, 2106.5, -3313.5, 2108.5, 'chop', 'hatchet',
    { skin: '#c88a62', hair: '#6a3a1e', hairStyle: 2, facial: 2, eyes: '#4a5a3a', tunic: '#5a3a2a', trim: '#3a2a1c', trousers: '#3a3430', boots: '#2a1e14', build: 1.3 },
    ['Oak for the shipwrights, ash for the carts, the rest for the fire.', 'Don’t stand behind me.']),
  w('ver_wood_elowen', 'Elowen Bray', 'Woodcutter', -2840.5, 22, 2165.5, -2842.5, 2165.5, 'hammer', 'hammer',
    { frame: 'f', skin: '#d8b090', hair: '#c88a3a', hairStyle: 1, eyes: '#4a6a7a', tunic: '#4a5a3a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true },
    ['Wedges and a maul. Takes longer than a saw and splits truer.', 'Seasoned two winters, this lot. Don’t burn it green.']),
  w('ver_store_laity', 'Tom Laity', 'Warehouseman', -2879.5, 23, 1937.5, -2876.5, 1937.5, 'idle', undefined,
    { skin: '#d8a888', hair: '#4a3a2a', hairStyle: 0, facial: 1, eyes: '#3a4a5a', tunic: '#5a4a3a', trim: '#8a6a3a', shirt: '#d8ccb0', trousers: '#2a2620', boots: '#1e1a16', apron: true, hat: 'cap', hatColor: '#3a3a4a' },
    ['Every crate in here has a number, and every number’s in my book.', 'Wine to the Counties, slate to Gullmouth, and nobody touches the brandy.']),
  w('ver_store_tremayne', 'Jory Tremayne', 'Storeman', -2684.5, 24, 2226.5, -2684.5, 2223.5, 'idle', undefined,
    { skin: '#c88a62', hair: '#8a6a3a', hairStyle: 2, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw' },
    ['Seed on the left, tools on the right, rats everywhere.', 'Gerens wants a count by sundown. Gerens always wants a count by sundown.']),
  w('ver_wood_coad', 'Hedley Coad', 'Master of the lumberyard', -2847.5, 22, 2162.5, -2847.5, 2166.5, 'idle', undefined,
    { skin: '#d8a07a', hair: '#8a8a82', hairStyle: 0, facial: 3, eyes: '#4a5a3a', tunic: '#5a4a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#4a3a2a', age: 0.65, build: 1.2 },
    ['Oak for the keels, ash for the oars, elm for the king’s new floor. In that order.', 'Digory fells, we saw, the boats carry. Nobody waits on anybody.']),
  w('ver_wood_spargo', 'Jenna Spargo', 'Sawyer', -2850.5, 22, 2171.5, -2850.5, 2174.5, 'chop', 'hatchet',
    { frame: 'f', skin: '#e2b894', hair: '#3a2a1e', hairStyle: 5, eyes: '#3a4a5a', tunic: '#6a4a2a', trim: '#2a2018', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.1 },
    ['Saw dust in my hair, saw dust in my bread, saw dust in my dreams.', 'Plank’s true or it goes back on the fire.']),
  w('ver_boat_pender', 'Silas Pender', 'Boatman', -2866.5, 18, 2196.5, -2866.5, 2200.5, 'crouch', undefined,
    { skin: '#c88a62', hair: '#2a1e14', hairStyle: 3, facial: 2, eyes: '#3a2a1e', tunic: '#3a4a5a', trim: '#8a8a7a', trousers: '#2a2a2e', boots: '#1e1a16', hat: 'cap', hatColor: '#2a3a4a', build: 1.2 },
    ['Load her even or she lists all the way to the docks.', 'Tide’s with us at four. We’ll be down the channel by five.']),
  w('ver_boat_retallick', 'Kit Retallick', 'Boatman', -2866.5, 17, 2204.5, -2866.5, 2212.5, 'idle', undefined,
    { frame: 'f', skin: '#d8a888', hair: '#c88a3a', hairStyle: 1, eyes: '#4a6a7a', tunic: '#2a3a4a', trim: '#d8d0b8', trousers: '#2a2a2e', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a24', lashes: true },
    ['Mind the gap between the boat and the slip. Everyone falls in once.', 'Timber down to the port, salt and nails back up.']),
];

/** A pallet of goods in a warehouse: crates two by two, stacked one to three high (the height from the spot, so it
 *  stays the same), or a cluster of barrels standing on end. */
function pallet(x: number, y: number, z: number, kind: 'crates' | 'barrels'): QuarryProp[] {
  const out: QuarryProp[] = [];
  const h = 1 + (Math.abs(Math.floor(x * 7 + z * 13)) % 3);
  if (kind === 'barrels') {
    for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) out.push({ t: 'barrel', x: x + dx, y, z: z + dz });
    if (h > 1) out.push({ t: 'barrel', x, y: y + 0.92, z });
    return out;
  }
  for (let k = 0; k < h; k++) {
    const n = k === h - 1 && h > 1 ? 3 : 4; // the top layer one short, as a stack is when it's being worked
    [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].slice(0, n).forEach(([dx, dz], i) => out.push({ t: 'crate', x: x + dx, y: y + k * 0.62, z: z + dz, ry: ((x + z + i + k) * 0.37) % 0.3 - 0.15 }));
  }
  return out;
}

/** The port warehouse on the quay (floor 23): the barrels along its east wall are the owner's; the pallets fill the
 *  rest of the hall in rows, an aisle down the middle and the loading side on the west kept clear. */
/** The crate Ruan Pascoe nails shut on the quay, and the ones he's done (owner 2026-11-06: "hammering on nothing"). */
export const QUAY_PROPS: QuarryProp[] = [{ t: 'crate', x: -2894.5, y: 19, z: 1899.3, ry: 0.1 }, { t: 'crate', x: -2896.2, y: 19, z: 1899.6, ry: -0.2 }, { t: 'crate', x: -2896.2, y: 19.62, z: 1899.6, ry: 0.15 }, { t: 'barrel', x: -2892.8, y: 19, z: 1899.8 }];
export const PORT_WAREHOUSE_PROPS: QuarryProp[] = [-2877, -2874, -2871, -2868].flatMap((x, i) => [1932, 1934.5, 1939.5, 1942].flatMap((z, j) => pallet(x, 23, z, (i + j) % 4 === 3 ? 'barrels' : 'crates')));
/** The farm's warehouse (floor 24): pallets of seed, tools and sacks in two rows down the middle between the stalls,
 *  the aisle from the north door kept clear. */
export const FARM_WAREHOUSE_PROPS: QuarryProp[] = [
  ...[2217, 2220, 2223, 2229].flatMap((z, j) => pallet(-2689, 24, z, j === 2 ? 'barrels' : 'crates')),
  ...[2217, 2220, 2223, 2229, 2232, 2235].flatMap((z, j) => pallet(-2681, 24, z, j % 3 === 1 ? 'barrels' : 'crates')),
];

/** The quarry pit's gear (world/sites.ts 'ver-quarry') and the lumberyard (world/sites.ts 'ver-lumberyard'). */
type QuarryProp = { t: 'cart' | 'crate' | 'barrel' | 'woodpile' | 'firepit' | 'tent' | 'anvil'; x: number; y: number; z: number; ry?: number; len?: number };
export const QUARRY_PROPS: QuarryProp[] = [
  { t: 'cart', x: -3086.5, y: 1, z: 2036.5, ry: 0.2 }, { t: 'cart', x: -3083.5, y: 1, z: 2026.5, ry: Math.PI / 2 },
  { t: 'crate', x: -3089.5, y: 1, z: 2050.5 }, { t: 'crate', x: -3089.5, y: 1.6, z: 2050.5 }, { t: 'crate', x: -3090.5, y: 1, z: 2051.5 },
  { t: 'barrel', x: -3083.5, y: 1, z: 2053.5 }, { t: 'anvil', x: -3082.5, y: 1, z: 2050.5, ry: 0.4 },
];
/** The owner's lumberyard by the channel: woodpiles on the hall's floor (22), sawn timber stacked in the boathouse (18)
 *  and on the deck of the boat in its slip (17), crates and barrels at the slip's head (world/sites.ts 'ver-timberyard'). */
export const TIMBERYARD_PROPS: QuarryProp[] = [
  { t: 'woodpile', x: -2853.5, y: 22, z: 2156.5, ry: 0, len: 4 }, { t: 'woodpile', x: -2853.5, y: 22, z: 2167.5, ry: Math.PI / 2, len: 3 },
  { t: 'woodpile', x: -2842.5, y: 22, z: 2155.5, ry: 0, len: 3 }, { t: 'woodpile', x: -2846.5, y: 22, z: 2174.5, ry: 0, len: 4 },
  { t: 'woodpile', x: -2872.5, y: 18, z: 2184.5, ry: Math.PI / 2, len: 4 }, { t: 'woodpile', x: -2872.5, y: 18, z: 2191.5, ry: Math.PI / 2, len: 4 },
  { t: 'woodpile', x: -2861.5, y: 18, z: 2184.5, ry: Math.PI / 2, len: 4 }, { t: 'woodpile', x: -2861.5, y: 18, z: 2190.5, ry: Math.PI / 2, len: 3 },
  { t: 'woodpile', x: -2866.5, y: 17, z: 2202.5, ry: 0, len: 2 },
  { t: 'crate', x: -2862.5, y: 18, z: 2197.5 }, { t: 'crate', x: -2863.5, y: 18, z: 2197.5 }, { t: 'crate', x: -2862.5, y: 18.62, z: 2197.5 },
  { t: 'barrel', x: -2873.5, y: 18, z: 2197.5 }, { t: 'barrel', x: -2872.5, y: 18, z: 2197.5 },
];
/** The felling camp in the meadow by the west road, past the carter, where the timber comes in from the woods. */
export const LUMBERYARD_PROPS: typeof QUARRY_PROPS = [
  { t: 'woodpile', x: -3316.5, y: 20, z: 2103.5, ry: 0, len: 4 }, { t: 'woodpile', x: -3311.5, y: 20, z: 2103.5, ry: 0, len: 3 },
  { t: 'woodpile', x: -3306.5, y: 20, z: 2103.5, ry: 0, len: 3 }, { t: 'woodpile', x: -3316.5, y: 21, z: 2112.5, ry: Math.PI / 2, len: 4 },
  { t: 'cart', x: -3301.5, y: 17, z: 2105.5, ry: -Math.PI / 2 }, { t: 'tent', x: -3306.5, y: 20, z: 2113.5, ry: Math.PI },
  { t: 'firepit', x: -3310.5, y: 20, z: 2112.5 }, { t: 'barrel', x: -3304.5, y: 19, z: 2108.5 }, { t: 'crate', x: -3303.5, y: 19, z: 2109.5 },
];

// After the day's work the farmhands and their foreman go up to the big house by the fields, the owner's farmhouse,
// where the hands eat and sleep (its tables, beds and hearth are the owner's).
const FARMHOUSE: Record<string, [number, number, number, number, number]> = {
  ver_farm_morwen: [-2735.5, 18, 2214.5, -2737.5, 2213.5], ver_farm_gerens: [-2737.5, 18, 2213.5, -2735.5, 2214.5], ver_farm_jacca: [-2743.5, 18, 2203.5, -2743.5, 2206.5],
};
// They go in and out by the front door on the east wall (an NPC walks straight to its next spot, so the door is
// on the way both ways, and the foreman's field is round the south corner).
const DOOR_OUT: [number, number] = [-2728.5, 2215.5], DOOR_IN: [number, number] = [-2733.5, 2215.5];
for (const n of npcs) {
  const h = FARMHOUSE[n.id];
  if (!h) continue;
  const corner: [number, number][] = n.id === 'ver_farm_gerens' ? [[-2728.5, 2222.5]] : [];
  n.schedule[0].path = [DOOR_IN, DOOR_OUT, ...corner];
  n.schedule.push({ from: 19, to: 23, at: [h[0], h[2]], face: [h[3], h[4]], anim: 'idle', y: h[1], path: [...corner.reverse(), DOOR_OUT, DOOR_IN] });
}

export const VERANDAH_WORK: RegionContent = { id: 'verandahWork', npcs };

/** Verandah's crowds (game/Game.ts crowdZones): who walks its streets in the day, and what they say. */
export const VERANDAH_CROWDS = [
  { id: 'verandah-high', x: -3040, z: 2131, r: 70, n: 18, lines: ['The king’s roof’s leaking again.', 'Xavier’s got a clock in that strikes thirteen.', 'Sandor’s out of saffron buns. Again.', 'Library’s got a new book. It’s about boilers.'] },
  { id: 'verandah-port', x: -2905, z: 1930, r: 60, n: 14, lines: ['Tegen’s mackerel or Arthur’s? Depends who you owe money to.', 'Ship in from the Counties this morning.', 'Mind the Mermaid’s chowder, it’s hotter than it looks.'] },
  { id: 'verandah-main', x: -3132, z: 2080, r: 50, n: 8, lines: ['Riders went by an hour ago.', 'Stables have a black mare in. Nobody can afford her.'] },
  { id: 'verandah-kestle', x: -2340, z: 2400, r: 40, n: 6, lines: ['Long walk to the town from here. Worth it for the quiet.', 'Somebody’s been fishing the pond up at the big house.'] },
  { id: 'verandah-mizuholm', x: -2850, z: 2750, r: 40, n: 6, lines: ['The paddies want planting before the rain.', 'The bridge needs a new rail.'] },
];
