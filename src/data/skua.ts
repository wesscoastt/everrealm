import { SEA, SKUA, SKUA_TOP } from '../world/terrain';

// SKUA ROCK. The Charter's prison for the worst it catches, on a sheer rock in the bay three hundred
// blocks off Gullmouth, close enough that the convicts can hear the town on a still night. Taken in with
// a big enough price on you, you go out on the prison boat in irons instead of to the town cells, and
// you serve your time on the Rock: a cell in the cellhouse, the yard, the work shed and the quarry by
// day. Or you go out through the vent behind your bunk, the way Amos Kitto has been planning for eleven
// years (game/Justice.ts, data/content/skua.ts). Built in world/sites.ts buildSkuaRock.
//
// Everything is square to the grid: x runs the length of the rock, west (the landing, facing the town)
// to east (the quarry); the cliffs fall away north and south.

export { SKUA };
/** The rock's top, where the prison stands, and the landing shelf cut at the west end. */
export const TOP = SKUA_TOP, LANDING_Y = SEA + 3;
/** The landing: the quay's end (where the prison boat ties up) and the shelf behind it. */
export const LANDING = { x0: 1966, x1: 1986, z0: 458, z1: 480, quayX: 1956, quayZ: 469 };
/** The Steps up from the landing to the sally port at the top: along +x, three wide. */
export const STEPS = { x0: 1987, z0: 460, z1: 462 };
/** The sally port in the wall at the top of the Steps. */
export const SALLY = { x: 2003, z: 461 };
/** The cellhouse: its walls, and inside it the block of cells, back to back with the utility corridor between. */
export const CELLHOUSE = { x0: 2032, x1: 2079, z0: 456, z1: 481, floor: TOP, roof: TOP + 11 };
/** The cell block: cells every three blocks along x, two rows (north, south) and two tiers. */
export const BLOCK = { x0: 2040, cells: 10, nFront: 462, nBack: 465, util: 466, sBack: 467, sFront: 470, upper: TOP + 5 };
/** One cell: its row, tier and number along the row; its floor, its two cells inside, its door and the vent. */
export interface Cell { row: 'n' | 's'; tier: 0 | 1; i: number; x: number; y: number; z0: number; z1: number; doorX: number; doorZ: number; ventX: number; ventZ: number }
export function cellOf(row: 'n' | 's', tier: 0 | 1, i: number): Cell {
  const x = BLOCK.x0 + i * 3 + 1, y = tier ? BLOCK.upper : TOP;
  const [z0, z1] = row === 's' ? [BLOCK.sBack + 1, BLOCK.sFront - 1] : [BLOCK.nFront + 1, BLOCK.nBack - 1];
  return { row, tier, i, x, y, z0, z1, doorX: x, doorZ: row === 's' ? BLOCK.sFront : BLOCK.nFront, ventX: x + 1, ventZ: row === 's' ? BLOCK.sBack : BLOCK.nBack };
}
/** Your cell: B-14, the ground tier on Broadway (the south side), the sixth along. */
export const MY_CELL = cellOf('s', 0, 6);
/** The yard, south of the cellhouse, walled, with towers at its two outer corners. */
export const YARD = { x0: 2052, x1: 2088, z0: 483, z1: 503, wall: 6 };
/** The work shed (the oilskins hang there to dry), the quarry pit (the stone detail), the lighthouse, the warden's house, the barracks, the water tower. */
export const SHED = { x0: 2086, z0: 446, w: 20, d: 12 };
export const QUARRY = { x0: 2118, x1: 2140, z0: 456, z1: 484, floor: TOP - 4 };
export const LIGHT = { x: 2012, z: 440 };
export const WARDEN = { x0: 2006, z0: 484, w: 11, d: 9 };
export const BARRACKS = { x0: 2014, z0: 446, w: 11, d: 8 };
export const TANK = { x: 2126, z: 446 };
/**
 * The way off: the utility corridor's ladder at its east end, the hatch onto the roof over it, the
 * drainpipe down the north-east corner of the cellhouse, the gully down the cliff to the rocks, and
 * the ledge at the bottom where a float could be put in the water.
 */
export const ESCAPE = { ladder: { x: BLOCK.x0 + 31, z: BLOCK.util }, hatch: { x: BLOCK.x0 + 31, y: TOP + 11, z: BLOCK.util }, pipe: { x: CELLHOUSE.x1 + 1, z: CELLHOUSE.z0 }, ledge: { x: 2118, z: 432 } };
/** Where the prison boat sets out from Gullmouth (the harbour's south jetty) and where it ties up at the Rock. */
export const BOAT_FROM = { x: 1792, z: 604 }, BOAT_TO = { x: LANDING.quayX - 2, z: LANDING.quayZ };
/** Where an escaped float comes ashore: the dunes north of Gullmouth, in the dark. */
export const ASHORE = { x: 1786, z: 452 };

/** The six blocks of a stint on the stone detail, on the quarry floor. */
export const QUARRY_STONES: [number, number][] = [[QUARRY.x0 + 8, QUARRY.z0 + 4], [QUARRY.x0 + 12, QUARRY.z0 + 9], [QUARRY.x0 + 16, QUARRY.z0 + 6], [QUARRY.x0 + 10, QUARRY.z1 - 6], [QUARRY.x0 + 15, QUARRY.z1 - 9], [QUARRY.x0 + 18, QUARRY.z1 - 4]];
/** The lines behind the work shed where the oilskins hang to dry (their middles). */
export const OILSKIN_LINES: [number, number][] = [3, 9, 15].map((dx) => [SHED.x0 + dx + 0.5, SHED.z0 + SHED.d + 1.5]);
/** Where the Tern sets you ashore at the end of your time: Gullmouth, by the Charter Post. */
export const FREED = { x: 1734.5, z: 597.5 };

/** A price at or over this in one town's book, and being taken in sends you to the Rock, not the town cells. */
export const ROCK_PRICE = 1200;
/** Seconds on the Rock for a price: five minutes at least, twenty at most (real time). */
export const rockSentence = (bounty: number) => Math.round(Math.max(300, Math.min(1200, bounty / 2)));
/** What a stint on the stone detail (breaking six blocks in the quarry) takes off your time, as a share of what's left. */
export const QUARRY_CUT = 0.2;
/** The vent: nights of scraping before the grille comes out, and oilskins wanted for a float. */
export const VENT_NIGHTS = 3, OILSKINS = 4;
