import * as L from './morrowLocal';

// Morrow, set down in the one world. Its country is drawn in its own frame (world/morrowLocal.ts: the
// coordinates it had when it was a map of its own); here it's placed east of the Counties, its old
// square beside theirs, with the open sea between the two coasts (a long swim, or a voyage). Everything
// Morrow's towns, people and sites use comes from here, in the world's frame: only x moves.

export type { MorrowRegion } from './morrowLocal';
export { MORROW_REGIONS, CALLIS_RIVER_Z, CALLIS_FLOOR, CALLIS_TOWERS, SALT_FLOOR, SALT_PIERS, REED_DECK, KB_FLOOR, hullDoorX } from './morrowLocal';

/** How far east Morrow lies from where it was drawn. */
export const MORROW_OX = 6400;
/** Where Morrow's half of the world begins, going east: down the middle of the open sea. */
export const MORROW_EDGE = 4096;
/** Whether a point is in Morrow's half of the world. */
export const inMorrow = (x: number): boolean => x >= MORROW_EDGE;

const X = <T extends { x: number }>(o: T): T => ({ ...o, x: o.x + MORROW_OX });
const P = (p: [number, number]): [number, number] => [p[0] + MORROW_OX, p[1]];

export const CALLIS = X(L.CALLIS);
export const CALLIS_QUAY_X = L.CALLIS_QUAY_X + MORROW_OX;
export const CALLIS_PACKET = X(L.CALLIS_PACKET);
export const CALLIS_SPOTS = { plaza: X(L.CALLIS_SPOTS.plaza), market: X(L.CALLIS_SPOTS.market), temple: X(L.CALLIS_SPOTS.temple) };
export const SALTPENNY = X(L.SALTPENNY);
export const SALT_HULLS = { mercy: X(L.SALT_HULLS.mercy), mast: X(L.SALT_HULLS.mast), table: X(L.SALT_HULLS.table), lowtide: X(L.SALT_HULLS.lowtide) };
export const SALT_COCKPIT = X(L.SALT_COCKPIT);
export const SALT_LANDING = X(L.SALT_LANDING);
export const BIGHT = X(L.BIGHT);
export const BIGHT_BOAT = X(L.BIGHT_BOAT);
export const COLD_HARBOUR = X(L.COLD_HARBOUR);
export const COLD_SHED = X(L.COLD_SHED);
export const COLD_TALLY = X(L.COLD_TALLY);
export const HOLLOW_FELL = X(L.HOLLOW_FELL);
export const FELL_BARROWS = L.FELL_BARROWS.map(([x, z, r, st]) => [x + MORROW_OX, z, r, st]) as typeof L.FELL_BARROWS;
export const FELL_LAY = X(L.FELL_LAY);
/** Morrow's towns (Fellside, empty, has no post: its post stays [0, 0]). */
export const TOWNS = Object.fromEntries(Object.entries(L.TOWNS).map(([k, t]) => [k, { ...t, x: t.x + MORROW_OX, post: t.post[0] || t.post[1] ? P(t.post) : t.post }])) as typeof L.TOWNS;
export const WOLD_TREES = L.WOLD_TREES.map(X);
export const SLABS = L.SLABS.map(([x, z, rx, rz, top]) => [x + MORROW_OX, z, rx, rz, top]) as typeof L.SLABS;
export const SLAB_MARKS = L.SLAB_MARKS.map(X);
export const NORTHGATE = X(L.NORTHGATE);
export const NORTHGATE_TOWN = X(L.NORTHGATE_TOWN);
export const NG_WALL = { ...L.NG_WALL, x0: L.NG_WALL.x0 + MORROW_OX, x1: L.NG_WALL.x1 + MORROW_OX };
export const NG_GATE = X(L.NG_GATE);
export const NG_ARCHIVE = X(L.NG_ARCHIVE);
export const NG_CATHEDRAL = X(L.NG_CATHEDRAL);
export const KB_KING = X(L.KB_KING);
export const KB_PORTAL = X(L.KB_PORTAL);
export const KB_CAMP = X(L.KB_CAMP);
export const KB_HALLS = X(L.KB_HALLS);
export const KINGSBARROW = X(L.KINGSBARROW);
export const MORROW_RIVERS = L.MORROW_RIVERS.map((r) => r.map(P));
export const MORROW_LAKES = L.MORROW_LAKES.map(X);
export const MORROW_ROADS = L.MORROW_ROADS.map((r) => r.map(P));

// Its country, asked in the world's frame
export const morrowLandDist = (x: number, z: number): number => L.morrowLandDist(x - MORROW_OX, z);
export const morrowRegionId = (x: number, z: number): L.MorrowRegion => L.morrowRegionId(x - MORROW_OX, z);
export const morrowHeight = (x: number, z: number): number => L.morrowHeight(x - MORROW_OX, z);
export const morrowColumn = (x: number, z: number, ...rest: Parameters<typeof L.morrowColumn> extends [number, number, ...infer R] ? R : never): ReturnType<typeof L.morrowColumn> =>
  L.morrowColumn(x - MORROW_OX, z, ...rest);
