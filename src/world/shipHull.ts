// A ship's hull as numbers, with no drawing in it (world/ships.ts draws her): each kind's size, the
// hull's width and height along her, and where she's solid and where her deck is. The world's planner
// (world/sites.ts, in the chunk worker) uses it to give moored ships solid hulls and decks to walk on;
// the ferry (world/Ferry.ts) to carry whoever stands on hers.
//
// Bow toward +x. y 0 is the waterline.

export type ShipKind = 'smack' | 'cog' | 'carrack' | 'galleon' | 'longship' | 'clipper';
export type SailState = 'set' | 'furled' | 'bare';

export interface Spec {
  len: number; beam: number;
  /** Below the waterline to the keel, and the deck above it. */
  draft: number; deck: number;
  /** How high the ends rise above midships (the sheer), and how fine the bow is (0 bluff, 1 knife). */
  sheer: number; fine: number;
  /** The stern's width as a share of the beam (0 a pointed stern, 1 a square transom). */
  transom: number;
  hull: string; wale: string; sail: string; trim: string;
}

/** Each kind's size and colours; a ship can be given her own colours over these. */
export const SHIPS: Record<ShipKind, Spec> = {
  smack: { len: 9, beam: 3.2, draft: 0.7, deck: 0.9, sheer: 0.5, fine: 0.5, transom: 0.45, hull: '#3a2a1e', wale: '#2f528f', sail: '#a8603a', trim: '#e8dcc0' },
  cog: { len: 14, beam: 5.2, draft: 1.0, deck: 2.0, sheer: 0.8, fine: 0.3, transom: 0.7, hull: '#4a3220', wale: '#7a2a1e', sail: '#efe3c4', trim: '#2f528f' },
  carrack: { len: 19, beam: 5.8, draft: 1.2, deck: 2.1, sheer: 1.0, fine: 0.55, transom: 0.6, hull: '#3e2a1c', wale: '#7a2a1e', sail: '#efe3c4', trim: '#c8a050' },
  galleon: { len: 23, beam: 6.6, draft: 1.5, deck: 2.6, sheer: 1.1, fine: 0.7, transom: 0.65, hull: '#2e2018', wale: '#2f528f', sail: '#f2ead4', trim: '#c8a050' },
  longship: { len: 17, beam: 3.8, draft: 0.6, deck: 0.8, sheer: 1.6, fine: 0.85, transom: 0.0, hull: '#5a4028', wale: '#3a2a1c', sail: '#a8382c', trim: '#efe3c4' },
  clipper: { len: 18, beam: 4.4, draft: 1.1, deck: 1.9, sheer: 0.7, fine: 0.9, transom: 0.5, hull: '#e8e4da', wale: '#c8a050', sail: '#cfe0f0', trim: '#2a4a8a' },
};

/** The hull's half-width as a share of half the beam at station u (0 stern .. 1 bow). */
export function halfBeam(s: Spec, u: number): number {
  if (u < 0.45) { const t = u / 0.45; return s.transom + (1 - s.transom) * Math.pow(Math.sin((t * Math.PI) / 2), 0.55); }
  const t = (u - 0.45) / 0.55;
  return Math.pow(Math.cos((t * Math.PI) / 2), 0.45 + s.fine * 0.9);
}
/** The gunwale's height above the keel at u: the depth amidships, rising toward both ends. */
export function gunwale(s: Spec, u: number): number {
  const depth = s.draft + s.deck + 0.55, e = Math.abs(u - 0.5) * 2;
  return depth + s.sheer * Math.pow(e, 2.2) * (u > 0.5 ? 1 : 0.8);
}
/** How the keel lifts toward the ends (rocker), so the ends don't hang deep in the water. */
export function rocker(s: Spec, u: number): number { return s.draft * 0.55 * Math.pow(Math.abs(u - 0.5) * 2, 3); }

/**
 * Whether a point is inside a ship's hull (in her own frame: bow +x, y from the water): for collision
 * with a ship that moves (the ferry). The hull's footprint narrows to the bow and the stern; up to the
 * rail it's solid.
 */
export function inHull(kind: ShipKind, lx: number, ly: number, lz: number, pad = 0): boolean {
  const s = SHIPS[kind], u = lx / s.len + 0.5;
  if (u < 0 || u > 1 || ly < -s.draft - 0.2) return false;
  const top = gunwale(s, u) - s.draft;
  if (ly > top + 0.4) return false;
  return Math.abs(lz) < (s.beam / 2) * halfBeam(s, u) + pad;
}
/** The deck's height (above the water) a walker stands on, at a point in the ship's frame, or null off it. */
export function deckAt(kind: ShipKind, lx: number, lz: number): number | null {
  const s = SHIPS[kind], u = lx / s.len + 0.5;
  if (u < 0.03 || u > 0.97) return null;
  return Math.abs(lz) < (s.beam / 2) * halfBeam(s, u) - 0.3 ? s.deck : null;
}
/** The hull's half-width at the rail at a point along her (her frame), or -1 past her ends. */
export function hullHalf(kind: ShipKind, lx: number): number {
  const s = SHIPS[kind], u = lx / s.len + 0.5;
  return u < 0 || u > 1 ? -1 : (s.beam / 2) * halfBeam(s, u);
}

/**
 * Where a moored ship's deck is, as a whole block (so a walker stands on it): given her, or the nearest
 * whole block to where she floats at y. Her model then sits that far below it (SHIPS deck).
 */
export function shipDeckY(kind: ShipKind, y: number, deck?: number): number {
  return deck ?? Math.round(y + SHIPS[kind].deck);
}
