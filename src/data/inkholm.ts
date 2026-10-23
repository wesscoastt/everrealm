// Inkholm's places, shared by the world builder (world/sites.ts) and the island's people and
// story (data/content/inkholm.ts). The island itself is drawn in world/terrain.ts (INKHOLM).

/** Gillsby Staithe, the harbour on the west shore, facing Gullmouth. */
export const GILLSBY = { x: 2512, z: 1645 };
/** Black Hythe, Harrowgate & Daughters' ink works on the east shore. */
export const HYTHE = { x: 2966, z: 1724, y: 21 };
/** Corra Priory on the top of Corra Fell, and the floor it stands on (the fell's top, levelled). */
export const PRIORY = { x: 2742, z: 1641, y: 54 };
/** The Undercroft under the priory: the floor its halls are dug at, three flights of stair below the nave. */
export const UNDER_F = 19;
/** The Old Bed, in the deepest hall of the Undercroft: where the Grey grows from. */
export const OLD_BED = { x: PRIORY.x - 21, y: UNDER_F, z: PRIORY.z - 6 };

/** The reek-fires: rings of stone where the Reekers burned the Grey back every autumn. */
export const REEKS = [
  { id: 'gull', name: 'The Gull Reek', x: 2770, z: 1330 },
  { id: 'hesketh', name: 'Hesketh\'s Reek', x: 2950, z: 1450 },
  { id: 'low', name: 'The Low Reek', x: 2900, z: 1840 },
  { id: 'barrow', name: 'Barrow Reek', x: 2570, z: 1830 },
  { id: 'long', name: 'The Long Reek', x: 2570, z: 1480 },
];
