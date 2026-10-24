// The Charter Post's town legs (src/data/postLegs.ts): the way a cart goes from each post sign out to the
// road, and from each road's loose end through its town to the next road, worked out over the built
// world (the generated blocks, buildings and all) so a cart keeps to the streets and never through a
// house. Run it after changing a town, a road or a post sign:
//   npx tsx scripts/postlegs.ts            (the whole world, both lands; writes src/data/postLegs.ts)
import fs from 'node:fs';
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
import { B, isSolid } from '../src/world/blocks';
import { SY } from '../src/world/VoxelWorld';
import { WORLD_ROADS, heightAt } from '../src/world/terrain';
import { POSTS } from '../src/data/travel';

type Pt = [number, number];
let all: Pt[][] = [];

{
  plan();
  const chunks = new Map<number, Uint8Array>();
  const get = (x: number, y: number, z: number): number => {
    if (y < 0 || y >= SY) return B.Air;
    const k = (x >> 5) * 100000 + (z >> 5);
    let c = chunks.get(k);
    if (!c) { c = generateChunk(x >> 5, z >> 5).data as Uint8Array; chunks.set(k, c); }
    return c[(x & 31) + 32 * ((z & 31) + 32 * y)];
  };
  const PAVED = new Set<number>([B.Cobble, B.MossyCobble, B.StoneBrick, B.Flagstone, B.Path, B.Gravel, B.Planks, B.BrickPave].filter((v) => v !== undefined));
  /** The floor at (x, z) within a step of y: firm, dry, two clear above; or null. */
  const floor = (x: number, z: number, y: number): number | null => {
    for (const dy of [0, 1, -1]) {
      const g = y + dy, below = get(x, g - 1, z);
      if (isSolid(below) && below !== B.Barrier && below !== B.Water && !isSolid(get(x, g, z)) && !isSolid(get(x, g + 1, z)) && get(x, g, z) !== B.Water) return g;
    }
    return null;
  };
  /** Room for a cart: the cell and the four round it all standable at about this height. */
  const roomy = (x: number, z: number, y: number): number | null => {
    const g = floor(x, z, y);
    if (g === null) return null;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (floor(x + dx, z + dz, g) === null) return null;
    return g;
  };
  const roads = WORLD_ROADS as Pt[][];
  const segD = (x: number, z: number, a: Pt, b: Pt) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L));
    return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
  };
  /** The nearest road (not one of those skipped) and how far: [distance, which]. */
  const roadNear = (x: number, z: number, skip: Set<number>): [number, number] => {
    let d = Infinity, w = -1;
    roads.forEach((r, i) => { if (!skip.has(i)) for (let k = 0; k + 1 < r.length; k++) { const e = segD(x, z, r[k], r[k + 1]); if (e < d) { d = e; w = i; } } });
    return [d, w];
  };
  const roadD = (x: number, z: number, skip = -1) => roadNear(x, z, new Set(skip < 0 ? [] : [skip]))[0];
  const startFloor = (x: number, z: number) => {
    const h = Math.round(heightAt(x, z));
    for (let r = 0; r < 12; r++) for (const s of [1, -1]) { const g = floor(Math.floor(x), Math.floor(z), h + r * s); if (g !== null) return g; }
    return h;
  };

  /** The cheapest way for a cart from (x, z) to a road (not road `skip`), by the streets where there are any. */
  const legFrom = (x0: number, z0: number, skipSet: Set<number>, label: string): { pts: Pt[]; road: number } | null => {
    const sx = Math.floor(x0), sz = Math.floor(z0), sy = startFloor(x0, z0);
    const K = (x: number, z: number) => (x + 20000) * 40000 + (z + 20000);
    const best = new Map<number, number>(), from = new Map<number, number>(), hy = new Map<number, number>();
    const heap: [number, number][] = [];
    const push = (f: number, k: number) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const start = K(sx, sz);
    best.set(start, 0); hy.set(start, sy); push(0, start);
    const closed = new Set<number>();
    let goal = -1;
    for (let n = 0; heap.length && n < 400000; n++) {
      const k = pop();
      if (closed.has(k)) continue;
      closed.add(k);
      const x = Math.floor(k / 40000) - 20000, z = (k % 40000) - 20000, y = hy.get(k)!, c = best.get(k)!;
      if (roadNear(x + 0.5, z + 0.5, skipSet)[0] < 2 && Math.hypot(x - sx, z - sz) > 2) { goal = k; break; }
      if (Math.hypot(x - sx, z - sz) > 320) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, nz = z + dz;
        // (a sign stands in a square or by a door: the first few strides may be tight)
        const g = Math.hypot(nx - sx, nz - sz) < 5 ? floor(nx, nz, y) : roomy(nx, nz, y);
        if (g === null) continue;
        if (dx && dz && (floor(x + dx, z, y) === null || floor(x, z + dz, y) === null)) continue;
        const paved = PAVED.has(get(nx, g - 1, nz));
        const nk = K(nx, nz), nc = c + (dx && dz ? 1.414 : 1) * (paved ? 1 : 1.7) + (g !== y ? 0.6 : 0);
        if (nc >= (best.get(nk) ?? Infinity)) continue;
        best.set(nk, nc); from.set(nk, k); hy.set(nk, g); push(nc, nk);
      }
    }
    if (goal < 0) { console.log(`  ${label}: no way to a road`); return null; }
    const cells: [number, number, number][] = [];
    for (let k: number | undefined = goal; k !== undefined; k = from.get(k)) cells.push([Math.floor(k / 40000) - 20000 + 0.5, (k % 40000) - 20000 + 0.5, hy.get(k)!]);
    cells.reverse();
    // Straighten it where a cart can go straight (keeping its room either side)
    const clear = (a: [number, number, number], b: [number, number, number]) => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.5);
      let y = a[2];
      for (let i = 1; i <= n; i++) { const g = roomy(Math.floor(a[0] + ((b[0] - a[0]) * i) / n), Math.floor(a[1] + ((b[1] - a[1]) * i) / n), y); if (g === null) return false; y = g; }
      return true;
    };
    const pts: Pt[] = [[x0, z0]];
    let at = cells[0];
    for (let i = 1; i < cells.length;) {
      let j = Math.min(cells.length - 1, i + 24);
      while (j > i && !clear(at, cells[j])) j--;
      pts.push([cells[j][0], cells[j][1]]); at = cells[j]; i = j + 1;
    }
    const road = roadNear(cells[cells.length - 1][0], cells[cells.length - 1][1], skipSet)[1];
    console.log(`  ${label}: to road ${road}, ${cells.length} cells, ${pts.length} points`);
    return { pts, road };
  };

  const legs: Pt[][] = [];
  for (const p of POSTS as { id: string; x: number; z: number; land?: string; ferryFrom?: string }[]) {
    // To each road within reach (a town where roads end joins them), the nearest first
    const skip = new Set<number>();
    const [d0, r0] = roadNear(p.x, p.z, skip);
    if (d0 < 4) { legs.push([[p.x, p.z]]); skip.add(r0); console.log(`  ${p.id}: on road ${r0}`); }
    for (let n = 0; n < 3; n++) { const leg = legFrom(p.x, p.z, skip, p.id); if (!leg) break; legs.push(leg.pts); skip.add(leg.road); }
  }
  // Every road's loose ends, through their towns to the next road
  roads.forEach((r, i) => {
    for (const e of [r[0], r[r.length - 1]]) {
      if (roadD(e[0], e[1], i) < 10) continue;
      const leg = legFrom(e[0], e[1], new Set([i]), `road ${i} end ${e.join(',')}`);
      if (leg) legs.push(leg.pts);
    }
  });
  all = legs.map((l) => l.map(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10] as Pt));
}

const body = `// Generated by scripts/postlegs.ts: the Charter Post carts' ways from each post sign to the road, and from
// each road's loose end through its town to the next road (world/roadNet.ts adds them to the roads).
// Regenerate after changing a town, a road or a post sign.

export const POST_LEGS: [number, number][][] = ${JSON.stringify(all)};
`;
fs.writeFileSync('src/data/postLegs.ts', body);
console.log('written', all.length, 'legs');
