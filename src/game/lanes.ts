import type { VoxelWorld } from '../world/VoxelWorld';
import { B, isSolid } from '../world/blocks';

// Ways for a wagon over the blocks themselves, where the road map's straight lines won't do: the watch's
// wagon down a lane to the road (game/Justice.ts), and any cart steering round a corner the road map cuts
// through a house, or under a jettied upper floor or a low bough (game/PostRide.ts).

type Pt = [number, number];
const DIRS8: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Where a wagon can stand in a block column near height y: a block up or down at a time, `room` clear above, no water. */
export function standAt(V: VoxelWorld, x: number, z: number, y: number, room = 3): number | null {
  if (!V.isLoaded(x + 0.5, z + 0.5)) return null;
  const g = V.groundBelow(x + 0.5, y + 1.5, z + 0.5);
  if (g < y - 1 || g > y + 1) return null;
  for (let k = 0; k < room; k++) if (isSolid(V.get(x, g + k, z))) return null;
  return V.get(x, g, z) === B.Water ? null : g;
}

/**
 * A wagon's way down the lanes from where you were taken to a point on the road (A* over the
 * blocks, kept off the walls: the wagon is wider than a man), or null if there's none near.
 */
export function lanePath(V: VoxelWorld, from: Pt, to: Pt, y0: number, reach = 70, room = 3): Pt[] | null {
  const sx = Math.floor(from[0]), sz = Math.floor(from[1]), tx = Math.floor(to[0]), tz = Math.floor(to[1]);
  const R = reach + 10, W = 2 * R + 1;
  const key = (x: number, z: number) => (x - sx + R) * W + (z - sz + R);
  const cost = new Map<number, number>(), ys = new Map<number, number>(), prev = new Map<number, number>();
  // (a binary heap of [estimate, x, z])
  const heap: [number, number, number][] = [];
  const push = (n: [number, number, number]) => {
    heap.push(n);
    for (let i = heap.length - 1; i > 0;) { const u = (i - 1) >> 1; if (heap[u][0] <= heap[i][0]) break; [heap[u], heap[i]] = [heap[i], heap[u]]; i = u; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; }
    }
    return top;
  };
  const k0 = key(sx, sz);
  cost.set(k0, 0); ys.set(k0, V.groundBelow(from[0], y0 + 1.5, from[1]));
  push([Math.hypot(tx - sx, tz - sz), sx, sz]);
  let found = -1;
  for (let n = 0; heap.length && n < 40000; n++) {
    const [, x, z] = pop(), k = key(x, z), y = ys.get(k)!, c = cost.get(k)!;
    if (Math.hypot(x - tx, z - tz) < 1.6) { found = k; break; }
    for (const [dx, dz] of DIRS8) {
      const nx = x + dx, nz = z + dz;
      if (Math.abs(nx - sx) > R || Math.abs(nz - sz) > R) continue;
      if (dx && dz && (standAt(V, x + dx, z, y, room) === null || standAt(V, x, z + dz, y, room) === null)) continue;
      const ny = standAt(V, nx, nz, y, room);
      if (ny === null) continue;
      let tight = 0;
      for (const [ex, ez] of DIRS8.slice(0, 4)) if (standAt(V, nx + ex, nz + ez, ny, room) === null) tight++;
      const nc = c + (dx && dz ? 1.414 : 1) + tight * 1.5, nk = key(nx, nz);
      if (nc < (cost.get(nk) ?? Infinity)) { cost.set(nk, nc); ys.set(nk, ny); prev.set(nk, k); push([nc + Math.hypot(tx - nx, tz - nz), nx, nz]); }
    }
  }
  if (found < 0) return null;
  const cells: Pt[] = [];
  for (let k: number | undefined = found; k !== undefined && k !== k0; k = prev.get(k)) cells.push([Math.floor(k / W) - R + sx + 0.5, (k % W) - R + sz + 0.5]);
  cells.reverse();
  // Every other block is enough to steer by
  return [from, ...cells.filter((_, i) => i % 2 === 1), to];
}
