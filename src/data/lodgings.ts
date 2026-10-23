import { heightAt } from '../world/terrain';
import type { Door, HomeShape } from './housing';

// Lodging houses: a room of your own in town, rented by the week, until you can buy a house or
// lease land. Each house has five rooms off a corridor; rent one at its door and it's your home
// while the rent is paid (furnish it, sleep in it, use the chest), the same as a house would be.
// Everyone sees their own room's furniture in the same room, as with the cottage. Let the rent run
// out and the door stays shut on your things until you pay again; nothing is lost.

export interface LodgingDef {
  id: string;
  name: string;
  town: string;
  /** The middle of the house; its front door faces `face`, toward the street. */
  x: number;
  z: number;
  face: Door;
  /** Marks a week. */
  rent: number;
  /** An inn: a taproom on the ground floor (a keeper, food and drink, a hearth) and the rooms up the stairs. */
  inn?: boolean;
}

export const LODGINGS: LodgingDef[] = [
  { id: 'lg-ansbury', name: 'Southgate Lodgings', town: 'Ansbury', x: 842, z: 491, face: 'w', rent: 200 },
  { id: 'lg-gullmouth', name: 'Upper Town Rooms', town: 'Gullmouth', x: 1570, z: 601, face: 'n', rent: 150 },
  { id: 'lg-harrowgate', name: 'Company Lodgings', town: 'Harrowgate Works', x: 987, z: 951, face: 's', rent: 125 },
  // Inns out on the roads, a day's walk from anywhere (sited by .walker/innspots.ts: level, dry, the road at the door)
  { id: 'inn-packhorse', name: 'The Packhorse', town: 'the Hagworm Wood road', x: 232, z: 430, face: 'e', rent: 120, inn: true },
  { id: 'inn-halfway', name: 'The Half Way House', town: 'the north road', x: 249, z: -222, face: 'e', rent: 120, inn: true },
  { id: 'inn-dykeend', name: 'The Dyke End', town: 'the Wrath Levels', x: -446, z: 980, face: 'n', rent: 120, inn: true },
  { id: 'inn-bield', name: 'The Bield', town: 'the Tolmen Moor road', x: 289, z: 2405, face: 'e', rent: 120, inn: true },
];

/** A week, in milliseconds; rent can be paid up to four weeks ahead. */
export const WEEK = 7 * 24 * 3600 * 1000;
export const MAX_WEEKS = 4;

/** The house's size: u across the front (-11 to 11), v from back (-7) to front (7). Walls are 4 high. */
export const LODGE_U = 11, LODGE_V = 7, LODGE_H = 4;

/** The rooms, in the house's own frame: walls (inclusive), the doorway off the corridor, and the chest. */
export const ROOMS: { name: string; u0: number; v0: number; u1: number; v1: number; door: [number, number]; chest: [number, number]; front: boolean }[] = [
  { name: 'Room 1', u0: -11, v0: 1, u1: -2, v1: 7, door: [-6, 1], chest: [-10, 6], front: true },
  { name: 'Room 2', u0: 2, v0: 1, u1: 11, v1: 7, door: [6, 1], chest: [10, 6], front: true },
  { name: 'Room 3', u0: -11, v0: -7, u1: -4, v1: -2, door: [-7, -2], chest: [-10, -6], front: false },
  { name: 'Room 4', u0: -4, v0: -7, u1: 4, v1: -2, door: [0, -2], chest: [3, -6], front: false },
  { name: 'Room 5', u0: 4, v0: -7, u1: 11, v1: -2, door: [7, -2], chest: [10, -6], front: false },
];

/** A point in a lodging house's own frame, in the world. */
export function lodgeAt(L: LodgingDef, u: number, v: number): [number, number] {
  switch (L.face) {
    case 'n': return [L.x + u, L.z - v];
    case 's': return [L.x - u, L.z + v];
    case 'e': return [L.x + v, L.z + u];
    case 'w': return [L.x - v, L.z - u];
  }
}

/** The floor everyone stands on inside (an inn's taproom). */
export const lodgeBase = (L: LodgingDef): number => Math.floor(heightAt(L.x, L.z));
/** The floor the rooms are on: the ground floor, or an inn's upper floor. */
export const roomBase = (L: LodgingDef): number => lodgeBase(L) + (L.inn ? LODGE_H : 0);

/** The side of the world a direction in the house's frame points to (+v: out of the front door). */
function side(L: LodgingDef, towardFront: boolean): Door {
  const opp: Record<Door, Door> = { n: 's', s: 'n', e: 'w', w: 'e' };
  return towardFront ? L.face : opp[L.face];
}

/** A room as a home (the shape the furniture and the bed work in). */
export function roomShape(L: LodgingDef, i: number): HomeShape {
  const r = ROOMS[i];
  const [ax, az] = lodgeAt(L, r.u0, r.v0), [bx, bz] = lodgeAt(L, r.u1, r.v1);
  return {
    name: `your room at ${L.name}`, x0: Math.min(ax, bx), z0: Math.min(az, bz), w: Math.abs(bx - ax) + 1, d: Math.abs(bz - az) + 1,
    floors: 1, base: roomBase(L), door: side(L, !r.front),
  };
}

/** A room let to you, as saved in the 'flat' flag: which house, which room, and paid until when. */
export interface Tenancy { house: string; room: number; until: number }
export function readTenancy(v: unknown): Tenancy | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.house !== 'string' || !LODGINGS.some((l) => l.id === o.house)) return null;
  if (typeof o.room !== 'number' || !ROOMS[o.room] || typeof o.until !== 'number') return null;
  return { house: o.house, room: o.room, until: o.until };
}
