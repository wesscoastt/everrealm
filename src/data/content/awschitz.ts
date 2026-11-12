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
];

type AwProp = { t?: string; item?: string; x: number; y: number; z: number; ry: number; len?: number; span?: number; rise?: number; mat?: 'slate' | 'thatch'; open?: boolean; kind?: string };
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
