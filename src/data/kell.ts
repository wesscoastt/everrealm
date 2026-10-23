// Kell's places, shared by the world builder (world/sites.ts) and the island's people and story
// (data/content/kell.ts). The island itself is drawn in world/terrain.ts (KELL, KILN).

/** Brasswick, the Kilnfolk's harbour town on the south-west shore, facing the mainland. */
export const BRASSWICK = { x: 2392, z: -556, y: 22 };
/** The Works in the Kiln's crater, and the Escapement Gate in the middle of them. */
export const WORKS = { x: 2738, z: -690, y: 58 };
export const GATE = { x: WORKS.x, z: WORKS.z + 12 };
/** The Escapement under the Kiln: where its halls are dug from (local x runs east), and their floor. */
export const ESC = { x: 2688, z: -690, f: 26 };

/** The relief vents on the Kiln's slopes. Their valves blew open when the Escapement started running fast. */
export const VENTS = [
  { id: 'bellmouth', name: 'The Bellmouth', x: 2730, z: -862 },
  { id: 'sour', name: 'The Sour Vent', x: 2902, z: -700 },
  { id: 'stack', name: 'The Old Stack', x: 2604, z: -800 },
];
