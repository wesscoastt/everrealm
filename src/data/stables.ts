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
  /** A stable that's the place's own (Verandah's): nothing built; the horses stand at `spots`, the keeper at `keeper` [x, z, facing x, facing z]. */
  bare?: boolean;
  spots?: [number, number][];
  keeper?: [number, number, number, number];
}

export const STABLES: StableDef[] = [
  { id: 'st-ansbury', name: 'Ansbury Stables', town: 'Ansbury', x: 614, z: 313, face: 'n', stock: [{ item: 'halter_bay', price: 300 }, { item: 'halter_piebald', price: 600 }, { item: 'halter_carriage', price: 800 }, { item: 'halter_cob', price: 1100 }, { item: 'wagon_cart', price: 1800 }] },
  { id: 'st-gullmouth', name: 'Gullmouth Stables', town: 'Gullmouth', x: 1481, z: 550, face: 'n', stock: [{ item: 'halter_grey', price: 400 }, { item: 'halter_sorrel', price: 550 }, { item: 'halter_cream', price: 750 }, { item: 'halter_dray', price: 1600 }] },
  { id: 'st-harrowgate', name: 'Company Stables', town: 'Harrowgate Works', x: 1063, z: 972, face: 's', stock: [{ item: 'halter_chestnut', price: 400 }, { item: 'halter_shire', price: 900 }, { item: 'wagon_covered', price: 4500 }] },
  { id: 'st-cragsby', name: 'Cragsby Stables', town: 'Cragsby', x: 231, z: -955, face: 'e', stock: [{ item: 'halter_seafret', price: 4800 }, { item: 'mount_elk', price: 7200 }] },
  { id: 'st-holme', name: 'Staithe Stables', town: 'Holme Staithe', x: -818, z: 1020, face: 'n', stock: [{ item: 'halter_fen', price: 4800 }, { item: 'mount_kelpie', price: 11200 }] },
  // Verandah's (owner 2026-11-05: "you can buy pure-bred horses there where the sign is"): the owner's pen outside the gate, by the Charter yard
  { id: 'st-verandah', name: 'Verandah Stables', town: 'Verandah', x: -3305, z: 2050, face: 's', bare: true, spots: [[-3307.5, 2050.5], [-3304.5, 2050.5], [-3302.5, 2049.5]], keeper: [-3301.5, 2051.5, -3301.5, 2054.5],
    stock: [{ item: 'halter_ver_black', price: 2400 }, { item: 'halter_ver_gold', price: 2800 }, { item: 'halter_ver_dapple', price: 3200 }] },
  { id: 'st-scarrow', name: 'Tor Stables', town: 'Scarrow Tor', x: 345, z: 2906, face: 'w', stock: [{ item: 'mount_ram', price: 8000 }, { item: 'mount_whitestag', price: 12800 }] },
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

// Placed on the first continent: none of them in Morrow (world/land.ts)
