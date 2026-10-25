// Works out the island packet's berths and courses (data/islandCourses.ts): for each island the ferry
// serves from Gullmouth, a berth in clear water off its landing, the way out to sea from there, and a
// course from Gullmouth's offing to the island's that keeps well off every shore. Run with
// `npm run -s islands`; it writes the file.
import { writeFileSync } from 'node:fs';
import { POSTS } from '../src/data/travel';
import { heightAt, SEA } from '../src/world/terrain';

const OUT = 20 * 11, IN = 14 * 9;
const deep = (x: number, z: number) => heightAt(Math.floor(x), Math.floor(z)) < SEA - 2;
/** Clear water round a point: nothing shoaler than two below the surface within r. */
const clear = (x: number, z: number, r: number) => { for (let dz = -r; dz <= r; dz += 4) for (let dx = -r; dx <= r; dx += 4) if (!deep(x + dx, z + dz)) return false; return true; };

/** The berth: the nearest clear water to the landing, and the heading out (toward the most open water). */
function berthFor(x0: number, z0: number): { berth: [number, number]; heading: number } {
  for (let d = 8; d < 200; d += 4) for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2, x = Math.round(x0 + Math.sin(t) * d), z = Math.round(z0 + Math.cos(t) * d);
    if (!clear(x, z, 10)) continue;
    // Out along whichever heading has the longest run of clear water
    let best = 0, bh = 0;
    for (let k = 0; k < 32; k++) {
      const h = (k / 32) * Math.PI * 2;
      let run = 0;
      while (run < IN + 40 && clear(x + Math.sin(h) * run, z + Math.cos(h) * run, 6)) run += 6;
      if (run > best) { best = run; bh = h; }
    }
    if (best >= IN) return { berth: [x, z], heading: Math.round(bh * 1000) / 1000 };
  }
  throw new Error(`no berth near ${x0},${z0}`);
}

/** A course over clear water between two points: A* on a grid, then pulled tight where the water allows. */
function course(a: [number, number], b: [number, number]): [number, number][] {
  const S = 16, pad = 500;
  const x0 = Math.min(a[0], b[0]) - pad, z0 = Math.min(a[1], b[1]) - pad, W = Math.ceil((Math.abs(a[0] - b[0]) + pad * 2) / S), H = Math.ceil((Math.abs(a[1] - b[1]) + pad * 2) / S);
  const ok = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) ok[j * W + i] = clear(x0 + i * S, z0 + j * S, 18) ? 1 : 0;
  const cell = (p: [number, number]) => [Math.round((p[0] - x0) / S), Math.round((p[1] - z0) / S)];
  const [si, sj] = cell(a), [ti, tj] = cell(b);
  ok[sj * W + si] = 1; ok[tj * W + ti] = 1;
  const g = new Float64Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), open: number[] = [sj * W + si];
  g[sj * W + si] = 0;
  const hcost = (k: number) => Math.hypot((k % W) - ti, Math.floor(k / W) - tj);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (g[open[i]] + hcost(open[i]) < g[open[bi]] + hcost(open[bi])) bi = i;
    const k = open.splice(bi, 1)[0];
    if (k === tj * W + ti) break;
    const i = k % W, j = Math.floor(k / W);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj, n = nj * W + ni;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H || !ok[n]) continue;
      const c = g[k] + Math.hypot(di, dj);
      if (c < g[n]) { g[n] = c; from[n] = k; if (!open.includes(n)) open.push(n); }
    }
  }
  const path: [number, number][] = [];
  for (let k = tj * W + ti; k >= 0; k = from[k]) path.unshift([x0 + (k % W) * S, z0 + Math.floor(k / W) * S]);
  if (path.length < 2) throw new Error('no course');
  // Pull it tight: skip ahead to the furthest point there's clear water straight to
  const sight = (p: [number, number], q: [number, number]) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 8); for (let s = 0; s <= n; s++) if (!clear(p[0] + ((q[0] - p[0]) * s) / n, p[1] + ((q[1] - p[1]) * s) / n, 14)) return false; return true; };
  const out: [number, number][] = [a];
  let at = 0;
  const pts = [a, ...path.slice(1, -1), b];
  while (at < pts.length - 1) { let k = pts.length - 1; while (k > at + 1 && !sight(pts[at], pts[k])) k--; out.push(pts[k]); at = k; }
  return out.map(([x, z]) => [Math.round(x), Math.round(z)]);
}

const gull = POSTS.find((p) => p.id === 'gullmouth')!;
const HOME = { berth: [1822, 590.5] as [number, number], heading: Math.PI / 2 };
const homeOff: [number, number] = [HOME.berth[0] + Math.sin(HOME.heading) * OUT, HOME.berth[1] + Math.cos(HOME.heading) * OUT];
const lines: string[] = [];
for (const p of POSTS) {
  if (p.ferryFrom !== 'gullmouth' || p.id === 'mewstones') continue;
  const b = berthFor(p.x, p.z);
  const off: [number, number] = [b.berth[0] + Math.sin(b.heading) * IN, b.berth[1] + Math.cos(b.heading) * IN];
  const c = course([Math.round(homeOff[0]), Math.round(homeOff[1])], [Math.round(off[0]), Math.round(off[1])]);
  console.log(p.id, 'berth', b.berth, 'heading', b.heading, 'course', c.length, 'points');
  lines.push(`  ${p.id}: { berth: [${b.berth[0]}, ${b.berth[1]}], heading: ${b.heading}, course: ${JSON.stringify(c)} },`);
}
void gull;
writeFileSync('src/data/islandCourses.ts', `// Generated by scripts/islandcourses.ts (npm run -s islands): the island packet's berth off each island's
// landing, the heading out from it, and its course from Gullmouth's offing to that island's, over clear water.
// The Mewstones have their own ferry (world/Ferry.ts).
export const ISLAND_COURSES: Record<string, { berth: [number, number]; heading: number; course: [number, number][] }> = {
${lines.join('\n')}
};
`);
console.log('written');
