import { B } from '../world/blocks';
import type { FrontId, TrimId } from '../world/sites';

/** Wendside Cottage, the house for sale on the road east of Hollin Ford: its walls and floor height. */
export const COTTAGE = { x0: 404, z0: 197, w: 8, d: 7, floor: 20, price: 400, bench: { x: 412.6, z: 199.5 } };

// Homes. Two ways to have one: buy Wendside Cottage as it stands, or lease a lot from the Charter
// and have a house built to your own plans. The Charter is selling the waste ground along the
// Ford road to pay down the bridge debt (see docs/LORE.md): ninety-nine years, a stake at each
// corner, and the moot's seal on the lease.
//
// Everyone's lot and house stand in the same place; what you see there is your own (or, on a
// visit, your host's), the same way everyone sees their own furniture in the cottage.

export type Door = 'n' | 's' | 'e' | 'w';

/** A building lot: its corner, and the side that faces the road (where the front door goes). */
export interface Lot { id: string; name: string; x0: number; z0: number; door: Door }
export const LOT_W = 15, LOT_D = 13, LOT_BASE = 20;
export const LOTS: Lot[] = [
  { id: 'l1', name: 'Lot 1, Oak Side', x0: 414, z0: 194, door: 's' },
  { id: 'l2', name: 'Lot 2, Oak Side', x0: 432, z0: 198, door: 's' },
  { id: 'l3', name: 'Lot 3, Brook Side', x0: 386, z0: 224, door: 'n' },
  { id: 'l4', name: 'Lot 4, Brook Side', x0: 402, z0: 224, door: 'n' },
  { id: 'l5', name: 'Lot 5, Brook Side', x0: 418, z0: 230, door: 'n' },
];
export const LOT_PRICE = 300;
/** What the Charter pays when you give up Wendside Cottage to move into a house of your own. */
export const COTTAGE_BUYBACK = 200;
/** Where the land agent's board stands: by the road, between the two rows of lots. */
export const LAND_BOARD = { x: 413.5, z: 209.5 };

export type SizeId = 'cottage' | 'house' | 'hall';
export type WallId = 'plaster' | 'planks' | 'stone' | 'cobble';
export type RoofId = 'thatch' | 'red' | 'slate' | 'blue';

/** The plans: what to build on a lot. */
export interface HouseSpec { size: SizeId; floors: 1 | 2; wall: WallId; roof: RoofId; /** How the front is built (older plans: as the walls suggest). */ front?: FrontId; /** What dresses it. */ trim?: TrimId[] }

export const SIZES: Record<SizeId, { name: string; w: number; d: number; floors: (1 | 2)[]; blurb: string; cost: Cost }> = {
  cottage: { name: 'Cottage', w: 7, d: 6, floors: [1], blurb: 'One room and a hearth. Cheap to build, easy to keep warm.', cost: { items: { oak_logs: 24, bronze_bar: 2 }, marks: 120 } },
  house: { name: 'House', w: 9, d: 7, floors: [1, 2], blurb: 'Room to spread out, and a loft if you want one.', cost: { items: { oak_logs: 36, birch_logs: 12, bronze_bar: 3 }, marks: 200 } },
  hall: { name: 'Long house', w: 11, d: 8, floors: [1, 2], blurb: 'A long room under a big roof: a hall for a guild, or for a lot of furniture.', cost: { items: { oak_logs: 48, pine_logs: 20, iron_bar: 2 }, marks: 320 } },
};

export const WALLS: Record<WallId, { name: string; block: number; blurb: string; cost: Cost }> = {
  plaster: { name: 'Lime plaster', block: B.Plaster, blurb: 'Wattle, daub and a lime wash.', cost: { items: {}, marks: 0 } },
  planks: { name: 'Weatherboard', block: B.Planks, blurb: 'Birch boards, lapped against the rain.', cost: { items: { birch_logs: 16 }, marks: 0 } },
  cobble: { name: 'Fieldstone', block: B.Cobble, blurb: 'Stone picked off the fields and laid dry.', cost: { items: {}, marks: 60 } },
  stone: { name: 'Dressed stone', block: B.StoneBrick, blurb: 'Squared blocks carted from Kelderby. It will outlast the lease.', cost: { items: {}, marks: 150 } },
};

export const ROOFS: Record<RoofId, { name: string; cost: Cost }> = {
  thatch: { name: 'Reed thatch', cost: { items: {}, marks: 0 } },
  red: { name: 'Red tile', cost: { items: {}, marks: 60 } },
  blue: { name: 'Blue glaze', cost: { items: {}, marks: 80 } },
  slate: { name: 'Slate', cost: { items: {}, marks: 100 } },
};

export interface Cost { items: Record<string, number>; marks: number }

export const FRONTS: Record<FrontId, { name: string; blurb: string; cost: Cost }> = {
  framed: { name: 'Timber-framed', blurb: 'Posts every third block, windows between.', cost: { items: {}, marks: 0 } },
  studded: { name: 'Close-studded', blurb: 'A post every other block and small windows: the old way, and dear in timber.', cost: { items: { oak_logs: 10 }, marks: 30 } },
  quoined: { name: 'Quoined', blurb: 'No posts: the corners dressed in alternate courses, a string course between storeys.', cost: { items: {}, marks: 50 } },
  boarded: { name: 'Weatherboard', blurb: 'Posts only at the corners and the door, windows in pairs.', cost: { items: { birch_logs: 8 }, marks: 0 } },
};
export const TRIMS: Record<TrimId, { name: string; cost: Cost }> = {
  hood: { name: 'Door hood', cost: { items: { oak_logs: 4 }, marks: 20 } },
  shutters: { name: 'Shutters', cost: { items: { birch_logs: 4 }, marks: 15 } },
  boxes: { name: 'Window boxes', cost: { items: {}, marks: 10 } },
};

/** Everything the builders need for these plans: timber and ironwork from you, marks for their labour. */
export function costOf(spec: HouseSpec): Cost {
  const size = SIZES[spec.size];
  const items: Record<string, number> = {};
  const add = (c: Cost, mult = 1) => { for (const [k, n] of Object.entries(c.items)) items[k] = (items[k] ?? 0) + Math.round(n * mult); return c.marks * mult; };
  // A second storey: half as much timber again for the joists, floor and stair, and a fortnight's labour
  let marks = add(size.cost, spec.floors === 2 ? 1.5 : 1) + (spec.floors === 2 ? 100 : 0);
  marks += add(WALLS[spec.wall].cost, spec.floors);
  marks += add(ROOFS[spec.roof].cost);
  if (spec.front) marks += add(FRONTS[spec.front].cost, spec.floors);
  for (const t of spec.trim ?? []) marks += add(TRIMS[t].cost);
  return { items, marks: Math.round(marks) };
}

/** Where a house with these plans stands on its lot: set back from the road, with a front garden. */
export function housePlace(lot: Lot, spec: HouseSpec): { x0: number; z0: number; w: number; d: number; floors: number; base: number; door: Door } {
  const { w, d } = SIZES[spec.size];
  const x0 = lot.x0 + Math.floor((LOT_W - w) / 2);
  const z0 = lot.door === 's' ? lot.z0 + 1 : lot.z0 + LOT_D - d - 1;
  return { x0, z0, w, d, floors: spec.floors, base: LOT_BASE, door: lot.door };
}

/** A plain house shape for the furnishing code: corner, size, storeys, floor height, door. */
export interface HomeShape { name: string; x0: number; z0: number; w: number; d: number; floors: number; base: number; door: Door }

export const COTTAGE_SHAPE: HomeShape = { name: 'Wendside Cottage', x0: COTTAGE.x0, z0: COTTAGE.z0, w: COTTAGE.w, d: COTTAGE.d, floors: 1, base: COTTAGE.floor, door: 's' };

/** A lot and plans as saved in the 'plot' flag; anything malformed (or from a visitor) reads as none. */
export interface PlotState { lot: string; spec?: HouseSpec }
export function readPlot(v: unknown): PlotState | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.lot !== 'string' || !LOTS.some((l) => l.id === o.lot)) return null;
  const s = o.spec as Record<string, unknown> | undefined;
  const spec = s && String(s.size) in SIZES && (s.floors === 1 || s.floors === 2) && String(s.wall) in WALLS && String(s.roof) in ROOFS
    ? { size: s.size as SizeId, floors: SIZES[s.size as SizeId].floors.includes(s.floors as 1 | 2) ? s.floors as 1 | 2 : 1, wall: s.wall as WallId, roof: s.roof as RoofId,
      front: String(s.front) in FRONTS ? s.front as FrontId : undefined, trim: Array.isArray(s.trim) ? (s.trim as unknown[]).filter((t): t is TrimId => String(t) in TRIMS) : undefined } : undefined;
  return { lot: o.lot, spec };
}

export function plotShape(p: PlotState | null): HomeShape | null {
  if (!p?.spec) return null;
  const lot = LOTS.find((l) => l.id === p.lot)!;
  return { name: 'your house on ' + lot.name, ...housePlace(lot, p.spec) };
}
