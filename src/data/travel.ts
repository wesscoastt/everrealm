import { coastX } from '../world/terrain';

// The Charter Post: carts that run between the settlements on the Charter's roads. A stop can be
// travelled to once the player has been there (its place id is in save.discovered). Fares are set
// by distance, and the journey takes in-game hours.
// Kept free of world/site imports: sites.ts reads this list to put a sign at every stop.

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
}

export const POSTS: PostStop[] = [
  { id: 'hollin', name: 'Hollin Ford', place: 'hollin', x: 162.5, z: 186.5, ry: Math.PI },
  { id: 'aldermere', name: 'Ansbury, south gate', place: 'aldermere', x: 832.5, z: 375.5, ry: 0 },
  { id: 'waystation', name: 'The Waystation', place: 'waystation', x: 703.5, z: 574.5, ry: 0 },
  { id: 'woodcamp', name: 'Fellers\' Camp', place: 'woodcamp', x: 449.5, z: 511.5, ry: Math.PI },
  { id: 'gullmouth', name: 'Gullmouth', place: 'gullmouth', x: Math.floor(coastX(600)) - 52.5, z: 594.5, ry: 0 },
  { id: 'harrowgate', name: 'Harrowgate Works', place: 'harrowgate', x: 1006.5, z: 1027.5, ry: 0 },
  { id: 'coldhearth', name: 'Kelderby', place: 'coldhearth', x: 307.5, z: 1468.5, ry: 0 },
  // Added for the pilgrims; the cart turns round at the west end of the Kirk floor.
  { id: 'temple', name: 'Glass Kirk', place: 'temple', x: 1170.5, z: 1803.5, ry: -Math.PI / 2 },
  // The ferry from Gullmouth; the sign is on the hamlet green (MEW in world/sites.ts), facing the jetty
  { id: 'mewstones', name: 'The Mewstones (ferry)', place: 'mewstones', ferryFrom: 'gullmouth', x: 2345.5, z: 728.5, ry: -Math.PI / 2 },
];

/** Whether a stop can be travelled to: its place found, or for a ferry stop, the harbour it sails from. */
export function postKnown(p: PostStop, discovered: string[]): boolean {
  if (discovered.includes(p.place)) return true;
  const from = p.ferryFrom ? POSTS.find((q) => q.id === p.ferryFrom) : undefined;
  return !!from && discovered.includes(from.place);
}

/** Marks for the trip: two to get on, and one for every fifty blocks of road. */
export function postFare(a: PostStop, b: PostStop): number {
  return 2 + Math.round(Math.hypot(a.x - b.x, a.z - b.z) / 50);
}

/** In-game hours on the cart: the carts make about 250 blocks an hour, and never less than one. */
export function postHours(a: PostStop, b: PostStop): number {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.z - b.z) / 250));
}
