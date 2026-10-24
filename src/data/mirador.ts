import { fitOut } from '../world/interiors';
import type { Door, HomeShape } from './housing';

// THE MIRADOR. North of Callis the Sunder's plateau ends in a sheer scarp twenty-five blocks high, and
// along its lip, looking south over the city, the river mouth and the bay, the shipping families built
// their summer houses: stone below, timber above, and every one of them with a deck hung out over the
// drop. Trade went bad, the families went with it, and the houses are for sale one by one through
// Teresa Mas at the gatehouse (data/content/mirador.ts). Two are still lived in.
//
// Each house is its own design (world/sites.ts buildMirador): the body of it is a house like any
// other, so you furnish it the same way (its shape here), and what's round it is what you pay for.
// The cliff is to the south of every one; the door faces the lane, north.

export type VillaKind = 'stair' | 'point' | 'longdeck' | 'lantern' | 'tower' | 'cistern' | 'cypress' | 'roig' | 'vidal';

export interface Villa {
  /** In the realm's homes book ('hv1'...); the two lived-in houses have none. */
  id: string | null;
  kind: VillaKind;
  name: string;
  /** The house's body: corner, size, storeys, floor; the door's on the north wall. */
  x0: number; z0: number; w: number; d: number; floors: 1 | 2; base: number;
  /** Where the scarp's lip is in front of it (z). */
  edge: number;
  price: number;
  /** What Teresa says of it. */
  blurb: string;
}

const V = (id: string | null, kind: VillaKind, name: string, x0: number, z0: number, w: number, d: number, base: number, edge: number, price: number, blurb: string): Villa => ({ id, kind, name, x0, z0, w, d, floors: 2, base, edge, price, blurb });

/** West to east along the lip. */
export const VILLAS: Villa[] = [
  V('hv1', 'stair', 'the Stair House', 8441, 797, 9, 8, 46, 806, 13000, 'Built on the lip and then down the face of it: three terraces under the house, one below the other, and a stair cut in the rock to the bottom, with a gate onto the Callis road. You can be at the harbour before your guests are up the lane.'),
  V(null, 'roig', 'the Roig house', 8490, 803, 11, 8, 46, 812, 0, ''),
  V('hv2', 'point', 'the Point', 8544, 807, 13, 9, 47, 817, 24000, 'The best house on the hill and the dearest: the lip comes furthest out here, and the deck goes out past it, stone on stone corbels. A loggia on the west wing for the afternoons. You can count the ships in from the Keys.'),
  V('hv3', 'longdeck', 'the Long Deck', 8594, 802, 13, 8, 46, 811, 16000, 'A timber house with the longest deck on the Mirador, end to end and then some, under a pergola the vines have had twenty years to cover. The Ferrers held their summer suppers on it.'),
  V('hv4', 'lantern', 'the Lantern House', 8640, 796, 11, 8, 45, 805, 14000, 'Glass all round the upper floor, so the whole room is the view, and a balcony outside it hung with lamps. Lit at night you can see it from the harbour. People do.'),
  V(null, 'vidal', 'the Vidal house', 8686, 797, 9, 8, 45, 805, 0, ''),
  V('hv5', 'tower', 'the Tower House', 8729, 799, 9, 8, 46, 808, 18000, 'A watch tower older than the houses, from when the Assembly kept a lookout on the scarp, with a house built against it. The tower stands on the cliff foot and goes up past the roofs: the stair inside it runs to a parapet at the top.'),
  V('hv6', 'cistern', 'the Cistern House', 8775, 800, 11, 8, 47, 809, 15000, 'Sandstone, round a walled garden with a long pool down the middle, and a bathing pool let into the deck. The Oms had the water piped up from a spring on the plateau. It still runs.'),
  V('hv7', 'cypress', 'the Cypress House', 8820, 798, 11, 8, 49, 807, 12000, 'The furthest along and the highest: dressed stone, an arcade along the cliff side, and a garden of cypresses stepping down to the deck. Quiet. The lane ends at the lookout just past it.'),
];

export const VILLA_BY_ID = new Map(VILLAS.filter((v) => v.id).map((v) => [v.id!, v]));

/** The lane: from the coast road at the top of the scarp, past the gatehouse, along the houses' fronts, to the lookout at its end. */
export const MIRADOR_LANE: [number, number][] = [[8306, 780], [8360, 784], [8405, 787], [8445, 789], [8495, 795], [8550, 799], [8600, 794], [8645, 788], [8690, 789], [8733, 791], [8780, 792], [8825, 790], [8858, 793]];
/** The gatehouse over the lane, where Teresa Mas keeps the keys; and the public lookout at the lane's end. */
export const MIRADOR_GATE = { x: 8405, z: 787 };
export const MIRADOR_LOOKOUT = { x: 8862, z: 800, edge: 804 };

const DOOR: Door = 'n';
/** A villa's body, for the furnishing code. */
export function villaShape(v: Villa): HomeShape {
  return { name: v.name[0].toUpperCase() + v.name.slice(1) + ', the Mirador', x0: v.x0, z0: v.z0, w: v.w, d: v.d, floors: v.floors, base: v.base, door: DOOR };
}
/** The front door's cell (as houseInto lays it: the middle of the north wall), and the back door's onto the deck. */
export const villaDoor = (v: Villa): [number, number] => [v.x0 + Math.floor(v.w / 2), v.z0];
export function villaBack(v: Villa): [number, number] {
  // (on the side of the back wall away from the stair, which climbs along it)
  const [dx, dz] = villaDoor(v);
  const steps = fitOut({ x0: v.x0, z0: v.z0, w: v.w, d: v.d, floors: v.floors, base: v.base, door: DOOR, doorX: dx, doorZ: dz, role: 'vacant' }).blocks.filter((b) => b[3] === 'step').map((b) => b[0]);
  const mid = steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : v.x0;
  return [mid > v.x0 + v.w / 2 ? v.x0 + 2 : v.x0 + v.w - 3, v.z0 + v.d - 1];
}
/**
 * Every way into a villa, as the foot of its doorway (two high): barred while it's someone else's and
 * you're not their guest. The front and back doors; and the Lantern House's balcony door, the Tower
 * House's tower door, the Stair House's gate at the foot of its terraces (world/sites.ts buildMirador).
 */
export function villaLocks(v: Villa): [number, number, number][] {
  const [fx, fz] = villaDoor(v), [bx, bz] = villaBack(v);
  const out: [number, number, number][] = [[fx, v.base, fz], [bx, v.base, bz]];
  if (v.kind === 'lantern') out.push([bx, v.base + 4, bz]);
  if (v.kind === 'tower') out.push([v.x0 + v.w + 1, v.base, v.edge - 1]);
  if (v.kind === 'stair') out.push([v.x0, v.base - 18, v.edge + 11]);
  return out;
}
/** The gate in a villa's garden wall, on the lane. */
export const villaGate = (v: Villa): { x: number; z: number } => ({ x: villaDoor(v)[0] + 0.5, z: v.z0 - 5.5 });

/** The villa whose grounds a point is in (between the lane and the lip, a few blocks either side of the house). */
export function villaAt(x: number, z: number): Villa | null {
  for (const v of VILLAS) if (x >= v.x0 - 8 && x < v.x0 + v.w + 8 && z >= v.z0 - 6 && z < v.edge + 8) return v;
  return null;
}
/** What the families take back for a house you sell them: two thirds of the price. */
export const VILLA_RESALE = 2 / 3;
