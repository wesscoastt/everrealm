// Stables outside the towns: a stable block, a paddock with the horses for sale standing in it, and
// a stablemaster who sells them. Each town breeds its own; the far towns over the necks sell rarer
// mounts at far higher prices. Every mount keeps the same pace: what you pay for is the look.
// (The people, their talk and their stock are in content/stables.ts; the buildings in world/sites.ts.)

/** Which way the stable faces: toward the road, on that side of it. */
export type Face = 'n' | 's' | 'e' | 'w';

export interface StableDef {
  id: string;
  name: string;
  town: string;
  /** The middle of the yard; the block stands to one side, the paddock to the other. */
  x: number;
  z: number;
  face: Face;
  /** What's for sale, cheapest first. */
  stock: { item: string; price: number }[];
}

export const STABLES: StableDef[] = [
  { id: 'st-ansbury', name: 'Ansbury Stables', town: 'Ansbury', x: 614, z: 313, face: 'n', stock: [{ item: 'halter_bay', price: 60 }, { item: 'halter_piebald', price: 120 }, { item: 'halter_carriage', price: 160 }, { item: 'halter_cob', price: 220 }] },
  { id: 'st-gullmouth', name: 'Gullmouth Stables', town: 'Gullmouth', x: 1481, z: 550, face: 'n', stock: [{ item: 'halter_grey', price: 80 }, { item: 'halter_sorrel', price: 110 }, { item: 'halter_cream', price: 150 }, { item: 'halter_dray', price: 320 }] },
  { id: 'st-harrowgate', name: 'Company Stables', town: 'Harrowgate Works', x: 1063, z: 972, face: 's', stock: [{ item: 'halter_chestnut', price: 80 }, { item: 'halter_shire', price: 180 }] },
  { id: 'st-cragsby', name: 'Cragsby Stables', town: 'Cragsby', x: 231, z: -955, face: 'e', stock: [{ item: 'halter_seafret', price: 600 }, { item: 'mount_elk', price: 900 }] },
  { id: 'st-holme', name: 'Staithe Stables', town: 'Holme Staithe', x: -818, z: 1020, face: 'n', stock: [{ item: 'halter_fen', price: 600 }, { item: 'mount_kelpie', price: 1400 }] },
  { id: 'st-scarrow', name: 'Tor Stables', town: 'Scarrow Tor', x: 345, z: 2906, face: 'w', stock: [{ item: 'mount_ram', price: 1000 }, { item: 'mount_whitestag', price: 1600 }] },
];

/** A point in a stable's own frame (u across the front, v out toward the road) in the world. */
export function stableAt(st: StableDef, u: number, v: number): [number, number] {
  switch (st.face) {
    case 'n': return [st.x + u, st.z - v];
    case 's': return [st.x - u, st.z + v];
    case 'e': return [st.x + v, st.z + u];
    case 'w': return [st.x - v, st.z - u];
  }
}

/** The way out of a stable toward the road, as a yaw (0 faces +z). */
export function stableYaw(st: StableDef): number {
  return { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[st.face];
}

/** Where each horse for sale stands in the paddock (u, v), in stock order. */
export const PADDOCK_SPOTS: [number, number][] = [[4, -5], [8, -3], [6, 0], [10, -7]];
