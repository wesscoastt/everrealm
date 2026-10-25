import type { HomeShape } from './housing';
import type { HullId } from './naval';
import { SEA } from '../world/terrain';
import { furnCells } from '../world/interiors';

// Living aboard: every ship of your own has her great cabin under the quarterdeck, and it's a home.
// You go below from her deck (or have the yard's boat row you out to her) and come up again where she
// lies. The cabins are built once, out in the empty north-west of the sea (world/sites.ts buildCabins),
// one for each kind of hull, with their stern windows on the real water and the real weather; each
// captain sees their own furniture in theirs, as in a let room (game/Home.ts, the 'cabin:<hull>' flag).

/** Where the cabins lie: open water, nothing within four hundred blocks, inside the realm's bounds. */
export const CABIN_ANCHOR = { x: -2060, z: -2060 };
/** The cabins' deck (standing height inside). */
export const CABIN_BASE = SEA + 4;

export interface CabinDef {
  hull: HullId;
  /** What it's called aboard her kind. */
  name: string;
  /** The room, walls included: the stern (and its windows) on the west side, the way up on the east. */
  x0: number; z0: number; w: number; d: number;
  /** Lights: the stern windows, and the ports along each side. */
  ports: number;
  blurb: string;
}

export const CABINS: Record<HullId, CabinDef> = {
  cutter: {
    hull: 'cutter', name: 'the cuddy', x0: CABIN_ANCHOR.x, z0: CABIN_ANCHOR.z, w: 8, d: 6, ports: 1,
    blurb: 'A cutter\'s cuddy: room to sling a cot, set a table and stand up straight, just. The stern lights are the size of a hymn book.',
  },
  brig: {
    hull: 'brig', name: 'the master\'s cabin', x0: CABIN_ANCHOR.x, z0: CABIN_ANCHOR.z + 60, w: 10, d: 8, ports: 2,
    blurb: 'A brig\'s master\'s cabin, panelled, with a row of stern lights and a port either side. A captain lived well enough in one.',
  },
  frigate: {
    hull: 'frigate', name: 'the great cabin', x0: CABIN_ANCHOR.x, z0: CABIN_ANCHOR.z + 120, w: 14, d: 10, ports: 3,
    blurb: 'A frigate\'s great cabin, the width of her stern: a gallery of windows on the sea, room for a long table, and a sleeping cabin to one side.',
  },
};

/** A cabin as a home (game/Home.ts): one storey, the way up on the east (bow) side. */
export function cabinShape(hull: HullId): HomeShape {
  const c = CABINS[hull];
  return { name: `your ship's ${c.name.replace(/^the /, '')}`, x0: c.x0, z0: c.z0, w: c.w, d: c.d, floors: 1, base: CABIN_BASE, door: 'e' };
}

/** The fixed things in each cabin: where you come down (and go up), the cot, the sea chest. */
export function cabinFixtures(hull: HullId) {
  const c = CABINS[hull];
  const midZ = c.z0 + c.d / 2;
  return {
    ladder: { x: c.x0 + c.w - 1.5, z: midZ },
    cot: { x: c.x0 + c.w - 2.5, z: c.z0 + 1.5 },
    chest: { x: c.x0 + c.w - 2.5, z: c.z0 + c.d - 1.5 },
  };
}

/** Which cabin a point is in, if any. */
export function cabinAt(x: number, y: number, z: number): HullId | null {
  if (Math.abs(y - CABIN_BASE) > 3) return null;
  for (const c of Object.values(CABINS)) if (x > c.x0 && x < c.x0 + c.w && z > c.z0 && z < c.z0 + c.d) return c.hull;
  return null;
}

/** The floor a cabin keeps for its own fixed things: the way up (and the room to stand at it), the cot, the sea chest. */
export function cabinReserved(hull: HullId): Set<string> {
  const c = CABINS[hull], fx = cabinFixtures(hull), out = new Set<string>();
  for (let x = c.x0 + c.w - 3; x <= c.x0 + c.w - 2; x++) for (let z = Math.floor(fx.ladder.z) - 1; z <= Math.floor(fx.ladder.z) + 1; z++) out.add(x + ',' + z);
  for (const cell of furnCells('bed', fx.cot.x, fx.cot.z, Math.PI / 2)) out.add(cell.join(','));
  for (const cell of furnCells('chest', fx.chest.x, fx.chest.z, Math.PI)) out.add(cell.join(','));
  return out;
}
