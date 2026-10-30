// THE CHARTER POST'S STATIONS. Every Post stop on the roads is a coaching yard, not a sign on a stick:
// a stable block for the Post's horses with its doors to the road, a yard in front where the cart stands
// waiting with a pair tied at the rail, hay, a trough, a lantern, and the Charter's board. (In Morrow the
// Assembly runs it, the same way.) Pay the carter there and the cart takes you (game/PostRide.ts).
//
// Where each yard goes is worked out by scripts/poststations.ts (npm run -s poststations) into
// data/postYards.ts: flat ground beside the stop, off the road and clear of everything built. The
// yard is built with the world (world/sites.ts buildPostStation); the horses and the cart standing in
// it come and go as you pass (game/PostStations.ts).

import type { MountLook } from '../entities/creatures';
import { POST_YARDS } from './postYards';

/**
 * The Post's cart: an open carrier's cart in the Charter's blue behind a bay, the carter on the box and
 * benches in the back for four. You pay for your seat; anyone else can climb up beside you for nothing
 * (the carter doesn't mind company), and everyone sees the cart go by with whoever's in it.
 */
export const POST_CART: MountLook = { coat: '#6a4428', mane: '#1e1610', cloth: '#2f528f', seats: 5, wagon: { kind: 'cart', bed: 0, paint: '#2f528f' } };
/** The cart as a mount, by the key the realm passes round. */
export const POST_CART_KEY = 'postcart';
/** The bench seat the paying passenger has (the other three are for whoever climbs up). */
export const POST_RIDER_SEAT = 3;

export type PostFace = 'n' | 's' | 'e' | 'w';
export interface PostYard { post: string; x: number; z: number; face: PostFace; base: number }
export const POST_STATIONS: PostYard[] = POST_YARDS;

/** A point in a yard's own frame (u across the front, v out toward the road) in the world. */
export function yardAt(y: PostYard, u: number, v: number): [number, number] {
  switch (y.face) {
    case 'n': return [y.x + u, y.z - v];
    case 's': return [y.x - u, y.z + v];
    case 'e': return [y.x + v, y.z + u];
    case 'w': return [y.x - v, y.z - u];
  }
}
/** The way out of a yard toward the road, as a yaw (0 faces +z). */
export const yardYaw = (y: PostYard): number => ({ n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 })[y.face];
/** The yard's ground: u -7..7 across, v -7..4 from the back of the stable to the yard's front edge. */
export const YARD = { u0: -7, u1: 7, v0: -7, v1: 4 };
/** Where the waiting cart stands, and the two horses at the rail (it runs across the yard at v 1.2; they
 *  stand on the road side of it, chests to the rail and heads over it). */
export const YARD_CART: [number, number] = [-2.5, 1.2];
export const YARD_HORSES: [number, number][] = [[3.2, 2.45], [4.9, 2.45]];
