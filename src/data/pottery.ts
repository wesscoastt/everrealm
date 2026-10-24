/**
 * Hetty Bray's pottery outside Harrowgate Works (world/sites.ts buildPottery, its people in
 * data/content/pottery.ts): its corner, the side its gate faces, and its floor. It is 22 across the
 * front and 16 deep.
 */
export const POTTERY = { x0: 1080, z0: 1000, face: 'n' as 'n' | 's' | 'e' | 'w', base: 23 };
export const POTTERY_W = 22, POTTERY_D = 16;

/** A point in the yard, u across its front and v back from it, in the world. */
export function potteryAt(u: number, v: number): [number, number] {
  const { x0, z0, face } = POTTERY, W = POTTERY_W, D = POTTERY_D;
  // The gate on the face side: n looks to -z, s to +z, e to +x, w to -x
  if (face === 'n') return [x0 + u, z0 + v];
  if (face === 's') return [x0 + W - u, z0 + D - v];
  if (face === 'w') return [x0 + v, z0 + W - u];
  return [x0 + D - v, z0 + u];
}
