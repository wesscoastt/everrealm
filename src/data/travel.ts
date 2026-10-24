import type { LandId } from '../world/land';
import { MORROW_OX } from '../world/morrow';
import { coastX } from '../world/terrain';

// The Charter Post: carts that run between the settlements on the Charter's roads, in real time, the
// country going by (game/PostRide.ts); where no road runs (an island), a boat crossing instead. A stop
// can be travelled to once the player has been there (its place id is in save.discovered). Fares are
// set by distance, and low: the post is the slow way, a waymark the quick one.
// Kept free of world/site imports: sites.ts reads this list to put a sign at every stop.

/** The outer lands' towns (the middles of their squares): Cragsby on the Gannet Cliffs, Holme Staithe on the Wrath Levels, Scarrow Tor on Tolmen Moor. */
export const CRAGSBY = { x: 250, z: -1000 };
export const HOLME = { x: -890, z: 1010 };
export const SCARROW = { x: 340, z: 2966 };

export interface PostStop {
  id: string;
  name: string;
  /** Place id the player must have discovered to travel here. */
  place: string;
  /** Where the post sign stands; arrivals are set down beside it. */
  x: number;
  z: number;
  /** Which way the sign faces. */
  ry: number;
  /** A ferry stop: reached by boat from this stop, and known as soon as that one is. */
  ferryFrom?: string;
  /** How far to the side of the sign its post box stands, where the usual 2.2 is in the way (negative: the other side). */
  box?: number;
  /** A crossing that only runs once this flag is set (a story opens it). */
  gate?: string;
  /** Where the post box stands, where beside the sign won't do (x, z, the way it faces). */
  boxAt?: [number, number, number];
  /** The land the stop is in (world/land.ts); none given, the Counties. */
  land?: LandId;
}

/** Where a stop's post box stands: a couple of blocks to one side of the sign, facing the same way. */
export function postBoxOf(p: PostStop): { x: number; z: number; ry: number } {
  if (p.boxAt) return { x: p.boxAt[0], z: p.boxAt[1], ry: p.boxAt[2] };
  const s = p.box ?? 2.2;
  return { x: Math.floor(p.x + Math.cos(p.ry) * s) + 0.5, z: Math.floor(p.z - Math.sin(p.ry) * s) + 0.5, ry: p.ry };
}

export const POSTS: PostStop[] = [
  { id: 'hollin', name: 'Hollin Ford', place: 'hollin', x: 162.5, z: 186.5, ry: Math.PI, boxAt: [164.5, 188.5, -Math.PI / 2] }, // (on the grass by the bank, clear of the notice board and the bridge path)
  { id: 'aldermere', name: 'Ansbury, south gate', place: 'aldermere', x: 832.5, z: 375.5, ry: 0 },
  { id: 'waystation', name: 'The Waystation', place: 'waystation', x: 703.5, z: 574.5, ry: 0 },
  { id: 'woodcamp', name: 'Fellers\' Camp', place: 'woodcamp', x: 449.5, z: 511.5, ry: Math.PI },
  { id: 'gullmouth', name: 'Gullmouth', place: 'gullmouth', x: Math.floor(coastX(600)) - 52.5, z: 594.5, ry: 0 },
  { id: 'harrowgate', name: 'Harrowgate Works', place: 'harrowgate', x: 1006.5, z: 1027.5, ry: 0 },
  { id: 'coldhearth', name: 'Kelderby', place: 'coldhearth', x: 307.5, z: 1468.5, ry: 0 },
  // Added for the pilgrims; the cart turns round at the west end of the Kirk floor.
  { id: 'temple', name: 'Glass Kirk', place: 'temple', x: 1170.5, z: 1803.5, ry: -Math.PI / 2 },
  // The ferry from Gullmouth; the sign is on the hamlet green (MEW in world/sites.ts), facing the jetty
  // The outer lands: a stop on each town's square, where the road comes in
  { id: 'cragsby', name: 'Cragsby', place: 'cragsby', x: 252.5, z: -993.5, ry: 0 },
  { id: 'holme', name: 'Holme Staithe', place: 'holme', x: -883.5, z: 1013.5, ry: -Math.PI / 2 },
  { id: 'scarrow', name: 'Scarrow Tor', place: 'scarrow', x: 338.5, z: 2959.5, ry: Math.PI },
  { id: 'mewstones', name: 'The Mewstones (ferry)', place: 'mewstones', ferryFrom: 'gullmouth', x: 2345.5, z: 728.5, ry: -Math.PI / 2 },
  // Inkholm, past the Mewstones, and Kell, past the Fleet Coast: Davey Penrose's island boat runs to both
  // from Gullmouth for anyone (data/content/boatman.ts); the stories that send you there start on the quay
  { id: 'inkholm', name: 'Gillsby Staithe, Inkholm (ferry)', place: 'ink-gillsby', ferryFrom: 'gullmouth', x: 2486.5, z: 1647.5, ry: -Math.PI / 2 },
  { id: 'sickle', name: 'Hookness, the Sickle (ferry)', place: 'sickle-hookness', ferryFrom: 'gullmouth', x: 3268.5, z: -1603.5, ry: -Math.PI / 2 },
  { id: 'kell', name: 'Brasswick, Kell (ferry)', place: 'kell-brasswick', ferryFrom: 'gullmouth', x: 2363.5, z: -552.5, ry: -Math.PI / 2 },
  // Morrow (world/land.ts): Callis, on the south side of the Assembly's plaza (world/morrow.ts CALLIS_SPOTS)
  { land: 'morrow', id: 'callis', name: 'Callis', place: 'callis', x: MORROW_OX + 2132.5, z: 1077.5, ry: 0 },
  // Saltpenny Key, by the packet from Callis once the Speaker has told you about the Kittiwake (world/morrow.ts SALT_LANDING)
  { land: 'morrow', id: 'saltpenny', name: 'Saltpenny Key (packet)', place: 'saltpenny', ferryFrom: 'callis', x: MORROW_OX + -1433.5, z: 3692.5, ry: 0, gate: 'saltFerry' },
  // Cold Harbour, on the Kittiwake from Saltpenny once Ned Vey has told you where the black loads
  { land: 'morrow', id: 'coldharbour', name: 'Cold Harbour (the Kittiwake)', place: 'coldharbour', ferryFrom: 'saltpenny', x: MORROW_OX + 2186.5, z: -1098.5, ry: Math.PI / 2, gate: 'coldFerry' },
  // Northgate, by cart up the coast road from Callis
  { land: 'morrow', id: 'northgate', name: 'Northgate', place: 'northgate', x: MORROW_OX + 507.5, z: -1225.5, ry: 0 },
  // Morrow's towns (world/morrow.ts TOWNS)
  { land: 'morrow', id: 'reedwater', name: 'Reedwater', place: 'reedwater', x: MORROW_OX + 1320.5, z: 2536.5, ry: 0 },
  { land: 'morrow', id: 'branchley', name: 'Branchley', place: 'branchley', x: MORROW_OX + 736.5, z: 1625.5, ry: 0 },
  { land: 'morrow', id: 'cala', name: 'Cala Roja', place: 'cala', x: MORROW_OX + 2464.5, z: 905.5, ry: 0 },
  { land: 'morrow', id: 'liftwick', name: 'Liftwick', place: 'liftwick', x: MORROW_OX + 1466.5, z: 233.5, ry: 0 },
  { land: 'morrow', id: 'tenwells', name: 'Tenwells', place: 'tenwells', x: MORROW_OX + 1046.5, z: -196.5, ry: 0 },
  { land: 'morrow', id: 'conch', name: 'Conch Key', place: 'conch', x: MORROW_OX + -1214.5, z: 3334.5, ry: 0 },
];

/** Whether a stop can be travelled to: its place found, or for a ferry stop, the harbour it sails from. */
export function postKnown(p: PostStop, discovered: string[]): boolean {
  if (discovered.includes(p.place)) return true;
  const from = p.ferryFrom ? POSTS.find((q) => q.id === p.ferryFrom) : undefined;
  return !!from && discovered.includes(from.place);
}

/**
 * The packet's course between the two harbours' offings, Gullmouth's to Callis's: south inside the
 * Mewstones, out across the open sea to the south-east, and up Morrow's east coast into Callis (it faces
 * the far sea). Every leg keeps thirty blocks or more off any shore (worked out over the world's coasts).
 */
export const PACKET_COURSE: [number, number][] = [[2028, 1380], [2364, 1932], [5388, 3684], [5724, 3804], [6228, 3756], [8652, 2988], [8916, 2220], [9000, 1300]];

/** Marks for the trip: one to get on, and one for every four hundred blocks. It's slow, so it's cheap (a waymark is dear). */
export function postFare(a: PostStop, b: PostStop): number {
  return 1 + Math.round(Math.hypot(a.x - b.x, a.z - b.z) / 400);
}

/** In-game hours on the cart: the carts make about 250 blocks an hour, and never less than one. */
export function postHours(a: PostStop, b: PostStop): number {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.z - b.z) / 250));
}

