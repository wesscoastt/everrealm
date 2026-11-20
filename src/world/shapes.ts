// Shaped blocks: a cell that is a block's stuff but not a whole cube of it (stairs, slabs, walls, hatches), from the
// owner's island (scripts/mc/shapes.ts). The cell is still solid to walk on and into, as before; only how it's drawn
// changes (world/meshCore.ts), and its neighbours show their faces against it. Directions: 0 +x, 1 -x, 2 +z, 3 -z.

export const SHAPE = {
  slab: 1, slabTop: 2,
  /** + direction: the high side of the step (its back) toward it. */
  stair: 3, stairTop: 7,
  /** A wall: a post, with an arm to each neighbour it meets. */
  wall: 11,
  /** A closed trapdoor: a board at the bottom of the cell, or the top. */
  hatch: 12, hatchTop: 13,
  /** A slab on its side (the side-slab add-on): + direction, the half against that side. */
  side: 14,
} as const;

export type Box = [number, number, number, number, number, number];

/** The half of a cell toward a direction, between heights y0 and y1. */
function half(d: number, y0: number, y1: number): Box {
  return d === 0 ? [0.5, y0, 0, 1, y1, 1] : d === 1 ? [0, y0, 0, 0.5, y1, 1] : d === 2 ? [0, y0, 0.5, 1, y1, 1] : [0, y0, 0, 1, y1, 0.5];
}

/**
 * The boxes a shape is drawn from, in the cell's own 0..1. `joins(d)`: does the cell beside it in direction d take a
 * wall's arm (a solid block, or another wall)?
 */
export function shapeBoxes(code: number, joins: (d: number) => boolean): Box[] {
  if (code === SHAPE.slab) return [[0, 0, 0, 1, 0.5, 1]];
  if (code === SHAPE.slabTop) return [[0, 0.5, 0, 1, 1, 1]];
  if (code >= SHAPE.stair && code < SHAPE.stair + 4) return [[0, 0, 0, 1, 0.5, 1], half(code - SHAPE.stair, 0.5, 1)];
  if (code >= SHAPE.stairTop && code < SHAPE.stairTop + 4) return [[0, 0.5, 0, 1, 1, 1], half(code - SHAPE.stairTop, 0, 0.5)];
  if (code === SHAPE.wall) {
    const out: Box[] = [[0.25, 0, 0.25, 0.75, 1, 0.75]];
    const lo = 0.3125, hi = 0.6875, top = 0.8125;
    if (joins(0)) out.push([0.75, 0, lo, 1, top, hi]);
    if (joins(1)) out.push([0, 0, lo, 0.25, top, hi]);
    if (joins(2)) out.push([lo, 0, 0.75, hi, top, 1]);
    if (joins(3)) out.push([lo, 0, 0, hi, top, 0.25]);
    return out;
  }
  if (code === SHAPE.hatch) return [[0, 0, 0, 1, 0.1875, 1]];
  if (code === SHAPE.hatchTop) return [[0, 0.8125, 0, 1, 1, 1]];
  if (code >= SHAPE.side && code < SHAPE.side + 4) return [half(code - SHAPE.side, 0, 1)];
  return [[0, 0, 0, 1, 1, 1]];
}
