import { B, BLOCKS } from '../world/blocks';
import { CHUNK, chunkKey, SY, type VoxelWorld } from '../world/VoxelWorld';

// The minimap's plan of a dungeon or delve, read off the blocks round you: floor you can stand on
// (lighter a step up, darker a step down, so ramps and ledges read), walls drawn where floor meets
// rock, water blue, and the rest the dark of the rock. A room's gate is barrier blocks, so it shows
// as a wall until it opens.

export interface Interior { canvas: HTMLCanvasElement; x0: number; z0: number; y: number; size: number }

/** How wide a plan is, in blocks; it moves in steps of STEP as you go, so it isn't redrawn every pace. */
export const INTERIOR_SIZE = 192;
const STEP = 32;
/** How far up and down a column is searched for floor near your own. */
const REACH = 9;
/** How far overhead a roof is looked for: floor under open sky is the land outside, not the halls. */
const ROOF = 24;

const SOLID = new Uint8Array(256);
for (let i = 0; i < 256; i++) SOLID[i] = BLOCKS[i]?.solid ? 1 : 0;

const ROCK = [30, 26, 22], WALL = [88, 70, 50], FLOOR = [214, 194, 152], WATER = [86, 132, 160];

/** Where the plan for a player at (x, z) starts: snapped, with the player well inside it. */
export function interiorOrigin(x: number, z: number): [number, number] {
  const h = INTERIOR_SIZE / 2;
  return [Math.round((x - h) / STEP) * STEP, Math.round((z - h) / STEP) * STEP];
}

export function interiorMap(V: VoxelWorld, px: number, py: number, pz: number): Interior {
  const N = INTERIOR_SIZE, [x0, z0] = interiorOrigin(px, pz), y = Math.floor(py + 0.1);
  const lo = Math.max(1, y - REACH), hi = Math.min(SY - 3, y + REACH);
  // floor[i]: how far the column's floor is from yours (+ up, - down), 99 for none; wet: water on it
  const floor = new Int8Array(N * N).fill(99), wet = new Uint8Array(N * N);
  for (let dz = 0; dz < N; dz++) for (let dx = 0; dx < N; dx++) {
    const x = x0 + dx, z = z0 + dz, c = V.chunks.get(chunkKey(x >> 5, z >> 5));
    if (!c) continue;
    const base = (x & 31) + CHUNK * (z & 31), lay = CHUNK * CHUNK;
    let best = 99;
    for (let f = lo; f <= hi; f++) {
      const a = c[base + lay * f], b = c[base + lay * (f + 1)], under = c[base + lay * (f - 1)];
      if (SOLID[a] || SOLID[b] || !SOLID[under]) continue;
      const d = f - y;
      if (!(Math.abs(d) < Math.abs(best) || (Math.abs(d) === Math.abs(best) && d < best))) continue;
      // only under a roof: open land outside at the same height is not the halls
      let roof = false;
      for (let r = f + 2, top = Math.min(SY - 1, f + ROOF); r <= top && !roof; r++) roof = SOLID[c[base + lay * r]] === 1;
      if (roof) best = d;
    }
    if (best === 99) continue;
    const i = dz * N + dx;
    floor[i] = best;
    if (c[base + lay * (y + best)] === B.Water) wet[i] = 1;
  }
  // Only the floor you can walk to from where you stand (a step of two at most): no stray hollows
  // under some overhang outside, no other cave that happens to lie at the same depth
  const reach = new Uint8Array(N * N), q: number[] = [];
  const sx = Math.floor(px) - x0, sz = Math.floor(pz) - z0;
  for (let r = 0; r <= 3 && !q.length; r++) for (let ez = -r; ez <= r && !q.length; ez++) for (let ex = -r; ex <= r; ex++) {
    const xx = sx + ex, zz = sz + ez;
    if (xx >= 0 && zz >= 0 && xx < N && zz < N && floor[zz * N + xx] !== 99) { reach[zz * N + xx] = 1; q.push(zz * N + xx); break; }
  }
  while (q.length) {
    const i = q.pop()!, x = i % N, z = (i / N) | 0;
    for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + ex, zz = z + ez, j = zz * N + xx;
      if (xx < 0 || zz < 0 || xx >= N || zz >= N || reach[j] || floor[j] === 99 || Math.abs(floor[j] - floor[i]) > 2) continue;
      reach[j] = 1; q.push(j);
    }
  }
  for (let i = 0; i < N * N; i++) if (!reach[i]) floor[i] = 99;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d')!, img = g.createImageData(N, N), d = img.data;
  for (let i = 0; i < N * N; i++) {
    const f = floor[i];
    let col: number[];
    if (f !== 99) {
      const k = Math.max(0.55, Math.min(1.15, 1 + f * 0.07));
      col = wet[i] ? WATER : FLOOR.map((v) => Math.min(255, v * k));
    } else {
      // rock next to floor is wall
      const x = i % N, z = (i / N) | 0;
      let edge = false;
      for (let ez = -1; ez <= 1 && !edge; ez++) for (let ex = -1; ex <= 1; ex++) {
        const xx = x + ex, zz = z + ez;
        if (xx >= 0 && zz >= 0 && xx < N && zz < N && floor[zz * N + xx] !== 99) { edge = true; break; }
      }
      col = edge ? WALL : ROCK;
    }
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return { canvas: cv, x0, z0, y, size: N };
}
