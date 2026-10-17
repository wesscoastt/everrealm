import { heightAt, SEA } from './terrain';
import { SY } from './VoxelWorld';

// Where the Weatherholms float, worked out from the terrain alone so the world builder (sites.ts)
// and the story (places_regional.ts) agree without either importing the other. Each isle hangs over
// the lowest ground near its seed point, so there is sky under it.

export interface Isle {
  x: number;
  z: number;
  /** The isle's middle layer; its grass is at y + 2, so you stand at top = y + 3. */
  y: number;
  r: number;
  top: number;
}

const SEEDS: [number, number, number, number][] = [[900, 1640, 11, 20], [948, 1606, 8, 28], [862, 1700, 9, 17], [1000, 1670, 7, 31], [830, 1610, 6, 24]];

let isles: Isle[] | null = null;

export function isleSpots(): Isle[] {
  if (isles) return isles;
  isles = [];
  for (const [sx, sz, r, lift] of SEEDS) {
    let best = { x: sx, z: sz, g: Infinity };
    for (let oz = -60; oz <= 60; oz += 12) for (let ox = -60; ox <= 60; ox += 12) {
      let g = 0;
      for (let k = 0; k < 9; k++) g = Math.max(g, heightAt(sx + ox + ((k % 3) - 1) * r, sz + oz + (Math.floor(k / 3) - 1) * r));
      if (g < best.g) best = { x: sx + ox, z: sz + oz, g };
    }
    const iy = Math.min(SY - 10, Math.round(best.g + r * 1.1 + lift));
    if (iy - best.g > r + 6) isles.push({ x: best.x, z: best.z, y: iy, r, top: iy + 3 });
  }
  return isles;
}

/** The largest isle: the forty-one's field, with the ring of columns. */
export function bigIsle(): Isle { return isleSpots()[0]; }

export interface Hoist {
  /** The tower's middle, on the ground beside the isle. */
  x: number;
  z: number;
  ground: number;
  /** Walking height on the tower's top platform, level with the isle's grass. */
  top: number;
  /** Unit step from the tower toward the isle. */
  dx: number;
  dz: number;
  /** Where the basket sets you down: on the tower's platform at the top, and beside the tower at the foot. */
  up: [number, number, number];
  down: [number, number, number];
}

let hoist: Hoist | null = null;

/**
 * Harrowgate's hoist: a timber tower on the flattest dry ground just off the big isle's edge, with
 * a plank bridge from its top platform onto the isle.
 */
export function hoistSpot(): Hoist {
  if (hoist) return hoist;
  const I = bigIsle();
  let best: { dx: number; dz: number; g: number; score: number } | null = null;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const cx = I.x + dx * (I.r + 5), cz = I.z + dz * (I.r + 5);
    const hs: number[] = [];
    for (let ox = -4; ox <= 4; ox++) for (let oz = -4; oz <= 4; oz++) hs.push(heightAt(cx + ox, cz + oz));
    const g = Math.round(hs.reduce((a, b) => a + b, 0) / hs.length);
    if (Math.min(...hs) <= SEA + 1) continue;
    const score = Math.max(...hs) - Math.min(...hs);
    if (!best || score < best.score) best = { dx, dz, g, score };
  }
  const b = best ?? { dx: 1, dz: 0, g: heightAt(I.x + I.r + 5, I.z), score: 0 };
  const x = Math.floor(I.x + b.dx * (I.r + 5)) + 0.5, z = Math.floor(I.z + b.dz * (I.r + 5)) + 0.5;
  // b is the side of the isle the tower stands on; the bridge runs the other way, back to the isle
  const dx = -b.dx, dz = -b.dz;
  hoist = {
    x, z, ground: b.g, top: I.top, dx, dz,
    up: [x + dx * 0.5, I.top, z + dz * 0.5],
    down: [x - dx * 3.5, b.g, z - dz * 3.5],
  };
  return hoist;
}
