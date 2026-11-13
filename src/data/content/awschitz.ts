import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Awschitz Fort, the owner's walled fort on the coast west of Verandah, garrisoned (owner 2026-11-07: "improve on what's
// already there of Awschitz, not add a new walled thing inside: improve on the walls there and add buildings within,
// and the dock"). Its blocks are scripts/mc/awschitz.cjs: the owner's curtain with merlons and four new wall towers
// (the walk stood on at 20), the hall, the barracks, the smithy, the stable, the water-gate store, the shed over the
// furnace row, the orchard's leaves, and the jetty off the owner's pier. It watches the western approaches for the
// wreckers' boats out of Black Gull and sends word to the town when a sail looks wrong.

type Look = NpcDef['look'];
const soldier = (skin: string, hair: string, extra: Partial<NonNullable<Look>> = {}): Look =>
  ({ skin, hair, hairStyle: 0, eyes: '#3a3a2a', tunic: '#22365a', trim: '#d8b04a', trousers: '#2a2630', boots: '#1e1a16', hat: 'coif', hatColor: '#8a8a90', ...extra });

const npcs: NpcDef[] = [
  { id: 'aw_morvah', name: 'Captain Jenifer Morvah', title: 'Awschitz Fort', look: { ...soldier('#d8a888', '#5a3a22'), frame: 'f', hairStyle: 5, lashes: true, hat: undefined, cape: '#22365a', age: 0.5 },
    schedule: [{ from: 6, to: 21, at: [-3453.5, 1950.5], face: [-3452.5, 1949.5], anim: 'idle', y: 16 }, { from: 21, to: 6, at: [-3459.5, 1946.5], face: [-3460.5, 1945.5], anim: 'idle', y: 22 }],
    barks: ['Eyes west. Always west.', 'If a lamp shows on the cliffs, I want to know before it’s lit.'] },
  { id: 'aw_trezise', name: 'Verandah Guard', title: 'On the west wall', look: soldier('#c88a62', '#2a1e14'),
    schedule: [{ from: 0, to: 24, at: [-3488.5, 1966.5], face: [-3500.5, 1966.5], anim: 'idle', y: 20 }],
    barks: ['Nothing on the water.', 'Cold up here.'] },
  { id: 'aw_bolitho', name: 'Verandah Guard', title: 'On the south wall', look: soldier('#e2b894', '#8a6a3a'),
    schedule: [{ from: 0, to: 24, at: [-3390.5, 1986.5], face: [-3390.5, 1998.5], anim: 'idle', y: 20 }],
    barks: ['Gulls. Just gulls.', 'Keep moving, friend.'] },
  { id: 'aw_gate', name: 'Verandah Guard', title: 'At the gate', look: soldier('#d8a07a', '#1e1a16'),
    schedule: [{ from: 0, to: 24, at: [-3341.5, 1963.5], face: [-3335.5, 1963.5], anim: 'idle', y: 16 }],
    barks: ['State your business at the fort.', 'The captain’s in the yard.'] },
  { id: 'aw_quay', name: 'Wenna Chegwidden', title: 'Boatwoman, Awschitz quay', look: { frame: 'f', skin: '#c8906a', hair: '#3a2a1e', hairStyle: 1, eyes: '#3a4a5a', tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#2a2620', boots: '#1e1a16', lashes: true, age: 0.4 },
    schedule: [{ from: 6, to: 20, at: [-3322.5, 1961.5], face: [-3322.5, 1963.5], anim: 'crouch', y: 16 }],
    barks: ['Mind the gap between the boards.', 'The garrison’s supplies come in by water. The road floods.'] },
  { id: 'aw_smith', name: 'Jory Pascoe', title: 'Smith, Awschitz', look: { skin: '#c8906a', hair: '#2a1e14', hairStyle: 2, beard: true, eyes: '#3a2a1e', tunic: '#4a3a2a', trim: '#2a2018', trousers: '#2a2620', boots: '#1e1a16', apron: true, build: 1.12, age: 0.45 },
    schedule: [{ from: 7, to: 19, at: [-3440.5, 1969.5], face: [-3440.5, 1968.5], anim: 'hammer', held: 'hammer', y: 16 }],
    barks: ['Horseshoes, hinges, spearheads. In that order, most weeks.', 'If it’s bent, bring it. If it’s broken, bring it sooner.'] },
  // The King's Dock north of the north wall (owner 2026-11-13: "put the giant military dock here"; scripts/mc/awschitz-navy.cjs)
  { id: 'aw_ennor', name: 'Lieutenant Hal Ennor', title: 'Dockmaster, the King’s Dock', look: { ...soldier('#c8906a', '#3a2a1e'), hat: 'wide', hatColor: '#1a2234', cape: '#22365a', facial: 2, age: 0.45 },
    schedule: [{ from: 6, to: 21, at: [-3438.5, 1910.5], face: [-3441.5, 1910.5], anim: 'idle', y: 16 }],
    barks: ['Lines doubled on the Vigilant. Wind’s backing.', 'Nothing comes alongside without my say.', 'Powder stays in the store. Dry, counted, and locked.'] },
  { id: 'aw_marine1', name: 'Verandah Marine', title: 'On the T-head', look: soldier('#e0b090', '#6a4426', { tunic: '#7a1e1a', hat: 'cap', hatColor: '#22365a' }),
    schedule: [{ from: 0, to: 24, at: [-3445.5, 1848.5], face: [-3445.5, 1843.5], anim: 'idle', y: 16 }],
    barks: ['Nothing on the horizon.', 'They say the wreckers have a cutter now. Let them try.'] },
  { id: 'aw_marine2', name: 'Verandah Marine', title: 'On the watchtower', look: soldier('#8a5a3a', '#1a1a1e', { tunic: '#7a1e1a', hat: 'cap', hatColor: '#22365a' }),
    schedule: [{ from: 0, to: 24, at: [-3471.5, 1849.5], face: [-3478.5, 1842.5], anim: 'idle', y: 28 }],
    barks: ['Sail to the north-west. No. A gull.', 'Best view on the coast, and they pay me for it.'] },
  { id: 'aw_gunner', name: 'Gunner Pellow', title: 'The King’s Dock', look: soldier('#d8a07a', '#8a6a3a', { tunic: '#4a3a2a', hat: 'kerchief', hatColor: '#7a1e1a', apron: true }),
    schedule: [{ from: 7, to: 20, at: [-3428.5, 1849.0], face: [-3428.5, 1846.5], anim: 'crouch', y: 16 }],
    barks: ['Swab, load, ram. Swab, load, ram.', 'She pulls left. They all pull left.'] },
  { id: 'aw_sailor', name: 'Sailor', title: 'Off the Vigilant', look: { skin: '#a8744c', hair: '#2a1e14', hairStyle: 0, eyes: '#3a3a2a', tunic: '#e8e0d0', trim: '#22365a', trousers: '#22365a', boots: '#1e1a16', hat: 'kerchief', hatColor: '#22365a' },
    schedule: [{ from: 6, to: 20, at: [-3436.5, 1883.5], face: [-3433.5, 1883.5], anim: 'idle', y: 16 }],
    barks: ['Heave! And again!', 'Three weeks of salt beef. The fort’s bread tastes like a wedding.'] },
  // The yard (owner: "flesh out the interior of the fort more"): the quartermaster, archers at the butts, sparring, the fire
  { id: 'aw_quarter', name: 'Sergeant Annie Tonkin', title: 'Quartermaster, Awschitz', look: { ...soldier('#e8c0a0', '#8a4a22'), frame: 'f', hairStyle: 3, lashes: true, hat: undefined, apron: true },
    schedule: [{ from: 7, to: 19, at: [-3350.5, 1952.5], face: [-3353.5, 1952.5], anim: 'idle', y: 16 }],
    barks: ['Sign for it, or it walks.', 'Boots, two pair. Blankets, one. Complaints, none.'] },
  { id: 'aw_archer', name: 'Verandah Guard', title: 'At the butts', look: soldier('#c9946a', '#4a2e1a', { hat: 'cap', hatColor: '#22365a' }),
    schedule: [{ from: 8, to: 18, at: [-3380.5, 1951.5], face: [-3370.5, 1951.5], anim: 'shoot', y: 16 }],
    barks: ['Low and left. Again.', 'The captain shoots better than all of us. Don’t tell her I said so.'] },
  { id: 'aw_spar1', name: 'Verandah Guard', title: 'Sparring', look: soldier('#f1c9a5', '#c8a060'),
    schedule: [{ from: 8, to: 18, at: [-3376.5, 1959.5], face: [-3374.5, 1959.5], anim: 'attack', held: 'sword', y: 16 }],
    barks: ['Guard up!', 'You dropped your shoulder again.'] },
  { id: 'aw_spar2', name: 'Verandah Guard', title: 'Sparring', look: soldier('#6a4430', '#1a1a1e'),
    schedule: [{ from: 8, to: 18, at: [-3374.5, 1959.5], face: [-3376.5, 1959.5], anim: 'attack', held: 'sword', y: 16 }],
    barks: ['Again. Slower.', 'That one counts. That one counts!'] },
  { id: 'aw_fire', name: 'Verandah Guard', title: 'Off watch', look: soldier('#e2b894', '#3a3a3a', { hat: undefined }),
    schedule: [{ from: 0, to: 24, at: [-3383.5, 1952.9], face: [-3383.5, 1954.5], anim: 'seated', y: 16 }],
    barks: ['Six hours on, six off. My feet don’t know which is which.', 'Pass the kettle.'] },
];

type AwProp = { t?: string; item?: string; x: number; y: number; z: number; ry: number; len?: number; span?: number; rise?: number; mat?: 'slate' | 'thatch'; open?: boolean; kind?: string; color?: string; text?: string; ship?: string; sails?: string; hull?: string; sail?: string };
const H = Math.PI / 2, P = Math.PI;
/** The fort's roofs, furniture and gear (world/sites.ts 'awschitz'); the blocks are scripts/mc/awschitz.cjs. */
export const AWSCHITZ_PROPS: AwProp[] = [
  // the hall: a slate roof; below, the garrison's long tables, the hearth, the captain's map table; above, her quarters
  { t: 'roof', x: -3457.5, y: 26, z: 1951, len: 21.6, span: 14.6, ry: 0, mat: 'slate' },
  { item: 'hearth', x: -3466.6, y: 16, z: 1950.5, ry: H },
  ...[1949.5, 1953.5].flatMap((z) => [-3463.5, -3461.5, -3459.5].flatMap((x) => [
    { item: 'table', x, y: 16, z, ry: 0 }, { item: 'bench', x, y: 16, z: z - 1.1, ry: 0 }, { item: 'bench', x, y: 16, z: z + 1.1, ry: P }])),
  { item: 'candles', x: -3461.5, y: 16.9, z: 1949.5, ry: 0 }, { item: 'candles', x: -3461.5, y: 16.9, z: 1953.5, ry: 0 },
  { item: 'desk', x: -3452.5, y: 16, z: 1949.5, ry: -H }, { item: 'chair', x: -3453.5, y: 16, z: 1949.5, ry: H },
  { item: 'spyglass', x: -3452.5, y: 16.85, z: 1949.2, ry: 0 }, { item: 'letters', x: -3452.5, y: 16.85, z: 1950, ry: 0 },
  ...[-3465.5, -3461.5, -3457.5].map((x) => ({ item: 'shelves', x, y: 16, z: 1945.4, ry: 0 })),
  { item: 'chest', x: -3449.6, y: 16, z: 1954.5, ry: -H }, { item: 'chest', x: -3449.6, y: 16, z: 1953.5, ry: -H }, { item: 'barrel', x: -3449.6, y: 16, z: 1956.4, ry: 0 },
  ...[1947.5, 1951.5, 1955.5].map((z) => ({ item: 'rug', x: -3456.5, y: 16, z, ry: 0 })),
  { t: 'banner', x: -3461.5, y: 19, z: 1945.2, ry: 0, kind: 'verandah' }, { t: 'banner', x: -3455.5, y: 19, z: 1945.2, ry: 0, kind: 'verandah' },
  { t: 'banner', x: -3462.5, y: 21, z: 1958.2, ry: 0, kind: 'verandah' }, { t: 'banner', x: -3453.5, y: 21, z: 1958.2, ry: 0, kind: 'verandah' },
  { item: 'bed', x: -3465.5, y: 22, z: 1946.5, ry: 0 }, { item: 'chest', x: -3465.5, y: 22, z: 1948.4, ry: P },
  { item: 'desk', x: -3460.5, y: 22, z: 1945.6, ry: 0 }, { item: 'chair', x: -3460.5, y: 22, z: 1946.6, ry: P }, { item: 'candles', x: -3460.5, y: 22.85, z: 1945.6, ry: 0 },
  { item: 'dresser', x: -3466.6, y: 22, z: 1952.5, ry: H }, { item: 'rug', x: -3461.5, y: 22, z: 1949.5, ry: 0 }, { item: 'lamp', x: -3463.5, y: 22, z: 1945.5, ry: 0 },
  ...[-3456.5, -3453.5].flatMap((x) => [{ item: 'bed', x, y: 22, z: 1955.5, ry: P }, { item: 'chest', x, y: 22, z: 1953.6, ry: 0 }]),
  { t: 'lantern', x: -3462.5, y: 16, z: 1960.5, ry: 0 }, { t: 'lantern', x: -3453.5, y: 16, z: 1960.5, ry: P },
  // the barracks: a thatched roof, beds down the west wall, a chest at the foot of each, a table by the door
  { t: 'roof', x: -3481.5, y: 20, z: 1970, len: 18.6, span: 9.6, ry: H, mat: 'thatch' },
  ...[1963, 1966, 1972, 1975].flatMap((z) => [{ item: 'bed', x: -3484.6, y: 16, z, ry: -H }, { item: 'chest', x: -3482.6, y: 16, z, ry: H }]),
  { item: 'table', x: -3480.5, y: 16, z: 1964.5, ry: 0 }, { item: 'stool', x: -3480.5, y: 16, z: 1963.4, ry: 0 }, { item: 'stool', x: -3480.5, y: 16, z: 1965.6, ry: P },
  { item: 'lamp', x: -3479.5, y: 16, z: 1977.4, ry: 0 }, { item: 'barrel', x: -3479.4, y: 16, z: 1962.4, ry: 0 },
  // the smithy: an open slate roof, the forge before its hearth, the anvil, the bellows, the quench, the woodpile; smoke
  { t: 'roof', x: -3439.5, y: 20, z: 1968.5, len: 9.6, span: 9.6, ry: 0, mat: 'slate', open: true },
  { item: 'forge', x: -3440.5, y: 16, z: 1966.6, ry: 0 }, { item: 'anvil', x: -3440.5, y: 16, z: 1968.6, ry: 0 },
  { t: 'bellows', x: -3442.3, y: 16, z: 1966.5, ry: H }, { item: 'barrel', x: -3437.6, y: 16, z: 1966.5, ry: 0 },
  { t: 'woodpile', x: -3437.4, y: 16, z: 1969.5, ry: H, len: 2 }, { t: 'smoke', x: -3440.5, y: 27, z: 1964.5, ry: 0 },
  // the stable: an open thatched roof, troughs before the stalls
  { t: 'roof', x: -3427.5, y: 19, z: 1980, len: 13.6, span: 10.6, ry: 0, mat: 'thatch', open: true },
  ...[-3432, -3428, -3424].map((x) => ({ t: 'trough', x, y: 16, z: 1983.4, ry: 0 })),
  // the water-gate store: a slate roof, its cargo
  { t: 'roof', x: -3441.5, y: 20, z: 1939, len: 11.6, span: 8.6, ry: 0, mat: 'slate' },
  ...[[-3445.5, 1936.6], [-3444.4, 1936.7], [-3445.4, 1937.8], [-3438.5, 1936.6], [-3439.6, 1936.6]].map(([x, z], i) => ({ t: i % 3 === 2 ? 'barrel' : 'crate', x, y: 16, z, ry: i * 0.3 })),
  { t: 'crate', x: -3445.5, y: 16.62, z: 1936.6, ry: 0.2 }, { t: 'barrel', x: -3438.6, y: 16, z: 1940.5, ry: 0 }, { t: 'barrel', x: -3438.6, y: 16, z: 1939.4, ry: 0 },
  // the shed over the owner's furnace row
  { t: 'roof', x: -3363, y: 20, z: 1959.5, len: 13.6, span: 4.6, ry: H, mat: 'slate', open: true },
  // the yard: the well, the lamps, the butts
  { t: 'wellhead', x: -3442.5, y: 16, z: 1952.5, ry: 0 },
  { t: 'lantern', x: -3446.5, y: 16, z: 1960.5, ry: 0 }, { t: 'lantern', x: -3437.5, y: 16, z: 1963.5, ry: 0 }, { t: 'lantern', x: -3476.5, y: 16, z: 1967.5, ry: 0 },
  { t: 'butt', x: -3468.5, y: 16, z: 1979.5, ry: P }, { t: 'butt', x: -3464.5, y: 16, z: 1979.5, ry: P },
];
/** The King's Dock (world/sites.ts 'awschitz-navy'; its blocks scripts/mc/awschitz-navy.cjs): the warships alongside, the guns on the T-head and the sea wall, cranes, cargo, bollards, lamps, the store's roof and stores, the boats. */
export const AWSCHITZ_NAVY_PROPS: AwProp[] = [
  { t: 'ship', ship: 'galleon', x: -3423.5, y: 15.86, z: 1873, ry: 0, sails: 'furled', hull: '#1e2230', color: '#22365a', sail: '#e8e0d0' },
  { t: 'ship', ship: 'carrack', x: -3466, y: 15.86, z: 1866.5, ry: H, sails: 'furled', color: '#7a1e1a' },
  ...[-3462.5, -3455.5, -3448.5, -3441.5, -3434.5, -3427.5, -3420.5].map((x) => ({ t: 'cannon', x, y: 16, z: 1847.6, ry: P })),
  ...[1862.5, 1886.5, 1902.5].map((z) => ({ t: 'cannon', x: -3448.6, y: 16, z, ry: -H })),
  ...[1860.5, 1866.5, 1872.5, 1878.5, 1884.5, 1890.5].map((z) => ({ t: 'bollard', x: -3433.5, y: 16, z, ry: 0 })),
  ...[-3428.5, -3420.5, -3412.5, -3406.5].map((x) => ({ t: 'bollard', x, y: 16, z: 1899.5, ry: 0 })),
  ...[-3474.5, -3466.5, -3458.5].map((x) => ({ t: 'bollard', x, y: 16, z: 1876.5, ry: 0 })),
  { t: 'crane', x: -3435.5, y: 16, z: 1880.5, ry: 0 }, { t: 'crane', x: -3435.5, y: 16, z: 1862.5, ry: 0 },
  ...[[-3437.6, 1878.4], [-3438.6, 1878.5], [-3437.5, 1877.4], [-3438.4, 1904.5], [-3437.3, 1904.6], [-3437.5, 1903.4], [-3446.5, 1916.5], [-3445.4, 1916.5]].map(([x, z], i) => ({ t: i % 3 === 2 ? 'barrel' : 'crate', x, y: 16, z, ry: i * 0.4 })),
  { t: 'crate', x: -3438.5, y: 16.62, z: 1878.5, ry: 0.3 }, { t: 'crate', x: -3437.9, y: 16.62, z: 1904.5, ry: -0.2 },
  // the store: its roof, powder and shot and stores
  { t: 'roof', x: -3444.5, y: 21, z: 1910.5, len: 9.6, span: 9.6, ry: 0, mat: 'slate' },
  ...[[-3447.6, 1907.6], [-3446.4, 1907.6], [-3447.6, 1913.4], [-3446.4, 1913.4], [-3443.5, 1907.6]].map(([x, z], i) => ({ t: i < 2 ? 'barrel' : 'crate', x, y: 16, z, ry: 0 })),
  { t: 'barrelRack', x: -3444.5, y: 16, z: 1913.4, ry: P }, { item: 'shelves', x: -3447.6, y: 16, z: 1910.5, ry: H }, { t: 'lantern', x: -3443.5, y: 16, z: 1910.5, ry: 0 },
  { t: 'notice', x: -3438.6, y: 16, z: 1907.5, ry: -H }, { t: 'sign', x: -3434.5, y: 16, z: 1920.6, ry: 0, text: 'THE KING’S DOCK\nAwschitz' },
  ...[1862, 1874, 1886, 1898, 1916].flatMap((z) => [{ t: 'lantern', x: -3449.5, y: 16, z: z + 0.5, ry: 0 }, { t: 'lantern', x: -3434.5, y: 16, z: z + 3.5, ry: 0 }]),
  ...[-3456.5, -3438.5, -3420.5].map((x) => ({ t: 'lantern', x, y: 16, z: 1854.5, ry: 0 })),
  // the watchtower's top and the beacon, lit
  { t: 'lantern', x: -3469.5, y: 28, z: 1847.5, ry: 0 }, { t: 'glow', x: -3410.5, y: 20.2, z: 1847.5, ry: 0 },
  { t: 'banner', x: -3467.8, y: 25, z: 1849.5, ry: H, kind: 'verandah' }, { t: 'banner', x: -3440.8, y: 19, z: 1910.5, ry: H, kind: 'verandah' },
  // boats at the T-head
  { t: 'boat', x: -3445.5, y: 15.45, z: 1841.5, ry: H }, { t: 'boat', x: -3431.5, y: 15.45, z: 1841.5, ry: H },
];
/** The yard, more of it (owner 2026-11-13: "flesh out the interior of the fort more"): the overflow's tents, the fire, the butts, the quartermaster's stall and the stores about it, washing by the barracks. */
export const AWSCHITZ_YARD_PROPS: AwProp[] = [
  ...[-3403, -3397, -3391].map((x) => ({ t: 'tent', x: x + 0.5, y: 16, z: 1950.5, ry: 0, color: '#6a5a3c' })),
  { t: 'firepit', x: -3383.5, y: 16, z: 1954.5, ry: 0 },
  { t: 'bench', x: -3383.5, y: 16, z: 1952.6, ry: 0 }, { t: 'bench', x: -3383.5, y: 16, z: 1956.4, ry: 0 }, { t: 'bench', x: -3385.9, y: 16, z: 1954.5, ry: H }, { t: 'bench', x: -3381.1, y: 16, z: 1954.5, ry: H },
  { t: 'butt', x: -3370.5, y: 16, z: 1951.5, ry: -H }, { t: 'butt', x: -3370.5, y: 16, z: 1955.5, ry: -H },
  { t: 'stall', x: -3352.5, y: 16, z: 1952.5, ry: -H, color: '#22365a' }, { t: 'notice', x: -3352.5, y: 16, z: 1958.5, ry: -H },
  { t: 'cart', x: -3355.5, y: 16, z: 1962, ry: 0 }, { t: 'barrelRack', x: -3357.5, y: 16, z: 1949.6, ry: 0 },
  ...[[-3350.5, 1949.6], [-3349.4, 1949.6], [-3349.5, 1955.5], [-3350.6, 1956.4]].map(([x, z], i) => ({ t: i < 2 ? 'crate' : 'barrel', x, y: 16, z, ry: i * 0.5 })),
  { t: 'washLine', x: -3474.5, y: 16, z: 1970.5, ry: H, len: 4 }, { t: 'woodpile', x: -3476.4, y: 16, z: 1975.5, ry: H, len: 2 },
  { t: 'lantern', x: -3395.5, y: 16, z: 1953.5, ry: 0 }, { t: 'lantern', x: -3358.5, y: 16, z: 1955.5, ry: 0 },
];
/** The jetty off the owner's pier (world/sites.ts 'awschitz-dock'): bollards, the crane on the T-head, three boats moored, the cargo. */
export const AWSCHITZ_DOCK_PROPS: AwProp[] = [
  ...[[-3317.5, 1955.5], [-3317.5, 1966.5], [-3324.5, 1959.2], [-3324.5, 1962.8]].map(([x, z]) => ({ t: 'bollard', x, y: 16, z, ry: 0 })),
  { t: 'crane', x: -3318.5, y: 16, z: 1964.5, ry: 0 },
  { t: 'boat', x: -3325.5, y: 15.45, z: 1965, ry: 0 }, { t: 'boat', x: -3325.5, y: 15.45, z: 1956, ry: 0 }, { t: 'boat', x: -3313.5, y: 15.45, z: 1958.5, ry: H },
  { t: 'crate', x: -3335.5, y: 16, z: 1958.5, ry: 0.1 }, { t: 'crate', x: -3334.4, y: 16, z: 1958.4, ry: -0.2 }, { t: 'crate', x: -3335.4, y: 16.62, z: 1958.5, ry: 0.2 },
  { t: 'barrel', x: -3335.5, y: 16, z: 1963.5, ry: 0 }, { t: 'barrel', x: -3319.4, y: 16, z: 1957.5, ry: 0 },
  { t: 'fishBox', x: -3327.5, y: 16, z: 1961.5, ry: 0 }, { t: 'lobsterPots', x: -3329.5, y: 16, z: 1959.6, ry: 0 },
  { t: 'netRack', x: -3336.4, y: 16, z: 1970.5, ry: H, len: 3 },
  { t: 'lantern', x: -3320.5, y: 16, z: 1954.5, ry: 0 }, { t: 'lantern', x: -3320.5, y: 16, z: 1967.5, ry: 0 }, { t: 'lantern', x: -3331.5, y: 16, z: 1962.6, ry: 0 },
];


const morvah: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Captain Morvah. This is Awschitz, the king’s watch on the western water. If you’ve come about work, the wall needs eyes and the quay needs hands. If you’ve come to look round, look, and don’t touch the signal fire.',
      options: [
        { text: 'What do you watch for?', next: 'watch' },
        { text: 'An orchard, inside a fort?', next: 'orchard' },
        { text: 'Why “Awschitz”?', next: 'name' },
        { text: 'Good day, Captain.' },
      ],
    },
    watch: { text: 'Wreckers out of Black Gull Keep. They light false lamps on the cliffs and wait for a ship to steer for them. We see the lamps from the towers, we send a rider to the town, and the town sends the Conscripts. Some nights we’re in time.', next: 'hello' },
    orchard: { text: 'A siege is a long wait. A wall keeps out a great deal, but not hunger. Whoever built this planted fruit trees before anything else. Apples, pears, cherries. My lot steal them. I pretend not to see.', next: 'hello' },
    name: { text: 'It was here before the fort. A family name, I’m told, from whoever farmed the headland first. The men call it “the Itch”. Not where I can hear them.', next: 'hello' },
  },
};

export const AWSCHITZ: RegionContent = { id: 'awschitz', npcs, dialogue: { aw_morvah: morvah } };
