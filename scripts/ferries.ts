// Works out the ferries' jetties and courses (data/ferryRoutes.ts) from their routes (data/ferries.ts):
// for each stop a jetty from the shore (or the quay's edge) out to water deep enough for her to lie
// alongside its head, with clear water to come in along the shore one way and leave the other; and
// between stops a course over clear water that keeps well off every shore and everything built.
// Run with `npm run -s ferries`; it writes the file.
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { FERRY_ROUTES, type FerryPlan, type FerryRoute, type FerryStop } from '../src/data/ferries';
import { ISLAND_COURSES } from '../src/data/islandCourses';
import { POSTS } from '../src/data/travel';
import { SHIPS } from '../src/world/shipHull';
import { plan } from '../src/world/sites';
import { heightAt, SEA } from '../src/world/terrain';

type V = [number, number];
const P = plan();
// What's built: every site's footprint but the huge ones (a town's whole extent) and the jetties themselves
const built: [number, number, number, number][] = [];
for (const s of P.sites) if (!s.id.startsWith('pier-')) for (const r of s.rects) if (r[2] - r[0] < 70 && r[3] - r[1] < 70) built.push(r);
const grid = new Map<string, [number, number, number, number][]>();
for (const r of built) for (let gx = Math.floor(r[0] / 64); gx <= Math.floor(r[2] / 64); gx++) for (let gz = Math.floor(r[1] / 64); gz <= Math.floor(r[3] / 64); gz++) { const k = gx + ',' + gz; (grid.get(k) ?? grid.set(k, []).get(k)!).push(r); }
const isBuilt = (x: number, z: number) => (grid.get(Math.floor(x / 64) + ',' + Math.floor(z / 64)) ?? []).some((r) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3]);
const water = (x: number, z: number, depth = 1) => heightAt(Math.floor(x), Math.floor(z)) < SEA - depth && !isBuilt(x, z);
const clear = (x: number, z: number, r: number) => { for (let dz = -r; dz <= r; dz += 4) for (let dx = -r; dx <= r; dx += 4) if (!water(x + dx, z + dz, 2)) return false; return true; };
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const norm = (v: V): V => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const rot = (v: V, t: number): V => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lineOk = (a: V, b: V, test: (x: number, z: number) => boolean) => { const n = Math.ceil(dist(a, b)); for (let s = 0; s <= n; s++) if (!test(a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n)) return false; return true; };

/** Open water near a landing: the island packet's old berth if it had one, else the nearest clear water. */
function seaward(x0: number, z0: number): V {
  for (let d = 8; d < 300; d += 4) for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2, x = x0 + Math.sin(t) * d, z = z0 + Math.cos(t) * d;
    if (clear(x, z, 10)) return [x, z];
  }
  throw new Error(`no open water near ${x0},${z0}`);
}

const APPROACH = 34;
interface Pier { from: V; to: V; dock: V; along: V }
/** A stop's jetty and where she lies at it. */
function pierFor(r: FerryRoute, s: FerryStop): Pier {
  const S = SHIPS[r.kind], post = POSTS.find((p) => p.id === s.post)!;
  const hint = ISLAND_COURSES[s.post]?.berth ?? seaward(post.x, post.z);
  const base = s.dir ? norm(s.dir) : norm([hint[0] - post.x, hint[1] - post.z]);
  for (const t of [0, 0.14, -0.14, 0.28, -0.28, 0.42, -0.42, 0.56, -0.56, 0.7, -0.7, 0.85, -0.85]) {
    const d = rot(base, s.dir ? 0 : t);
    // The shore: the first water out from the post (or the start given)
    let shore: V | null = s.from ? [s.from[0] + 0.5, s.from[1] + 0.5] : null;
    if (!shore) for (let k = 0; k < 70; k += 0.5) { const q = add([post.x, post.z], d, k); if (heightAt(Math.floor(q[0]), Math.floor(q[1])) < SEA) { shore = q; break; } }
    if (!shore) continue;
    const across: V = [-d[1], d[0]];
    for (let L = s.minLen ?? 5; L <= 60; L++) {
      const head = add(shore, d, L), dock = add(head, d, S.beam / 2 + 0.45);
      // The jetty's run over water, clear of anything built
      if (!lineOk(add(shore, d, 1.5), head, (x, z) => !isBuilt(x, z) && !isBuilt(x + across[0] * 1.5, z + across[1] * 1.5) && !isBuilt(x - across[0] * 1.5, z - across[1] * 1.5))) break;
      // Her berth: deep water under all of her, and a little round
      let ok = true;
      for (let a = -S.len / 2 - 2; a <= S.len / 2 + 2 && ok; a++) for (let b = -S.beam / 2 - 1; b <= S.beam / 2 + 1.5 && ok; b += 0.5) { const q = add(add(dock, across, a), d, b); if (!water(q[0], q[1], 1)) ok = false; }
      if (!ok) continue;
      // And open water to come in along the shore one way and go out the other
      const run = (x: number, z: number) => water(x, z, 0) && water(x + d[0] * 3.2, z + d[1] * 3.2, 0) && water(x - d[0] * 3.2, z - d[1] * 3.2, 0);
      if (!lineOk(dock, add(dock, across, APPROACH), run) || !lineOk(dock, add(dock, across, -APPROACH), run)) continue;
      return { from: [Math.floor(shore[0] - d[0]), Math.floor(shore[1] - d[1])], to: [Math.floor(head[0]), Math.floor(head[1])], dock, along: across };
    }
    if (s.dir) break;
  }
  throw new Error(`${r.id}: no jetty at ${s.post}`);
}

/** A course over clear water between two points: A* on a grid, then pulled tight where the water allows. */
function course(a: V, b: V, pad = 600): V[] {
  const S = 16;
  const x0 = Math.min(a[0], b[0]) - pad, z0 = Math.min(a[1], b[1]) - pad, W = Math.ceil((Math.abs(a[0] - b[0]) + pad * 2) / S), H = Math.ceil((Math.abs(a[1] - b[1]) + pad * 2) / S);
  const ok = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = x0 + i * S, z = z0 + j * S; ok[j * W + i] = clear(x, z, 14) || ((dist([x, z], a) < 90 || dist([x, z], b) < 90) && clear(x, z, 5)) ? 1 : 0; }
  const cell = (p: V) => [Math.round((p[0] - x0) / S), Math.round((p[1] - z0) / S)];
  const [si, sj] = cell(a), [ti, tj] = cell(b);
  ok[sj * W + si] = 1; ok[tj * W + ti] = 1;
  const g = new Float64Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
  // (the open set as a binary heap on cost so far plus the straight-line rest)
  const hcost = (k: number) => Math.hypot((k % W) - ti, Math.floor(k / W) - tj);
  const heap: [number, number][] = [];
  const push = (k: number) => { heap.push([g[k] + hcost(k), k]); let i = heap.length - 1; while (i > 0) { const pi = (i - 1) >> 1; if (heap[pi][0] <= heap[i][0]) break; [heap[pi], heap[i]] = [heap[i], heap[pi]]; i = pi; } };
  const pop = (): number => { const top = heap[0][1], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  g[sj * W + si] = 0;
  push(sj * W + si);
  while (heap.length) {
    const k = pop();
    if (done[k]) continue;
    if (k === tj * W + ti) break;
    done[k] = 1;
    const i = k % W, j = Math.floor(k / W);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj, n = nj * W + ni;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H || !ok[n] || done[n]) continue;
      const c = g[k] + Math.hypot(di, dj);
      if (c < g[n]) { g[n] = c; from[n] = k; push(n); }
    }
  }
  if (from[tj * W + ti] < 0) { if (pad < 3000) return course(a, b, pad * 2); throw new Error(`no course from ${a} to ${b}`); }
  const path: V[] = [];
  for (let k = tj * W + ti; k >= 0; k = from[k]) path.unshift([x0 + (k % W) * S, z0 + Math.floor(k / W) * S]);
  const sight = (p: V, q: V) => lineOk(p, q, (x, z) => clear(x, z, 10) || ((dist([x, z], a) < 90 || dist([x, z], b) < 90) && clear(x, z, 4)));
  const pts = [a, ...path.slice(1, -1), b], out: V[] = [a];
  let at = 0;
  while (at < pts.length - 1) { let k = pts.length - 1; while (k > at + 1 && !sight(pts[at], pts[k])) k--; out.push(pts[k]); at = k; }
  return out;
}

const r1 = (v: V): V => [Math.round(v[0] * 10) / 10, Math.round(v[1] * 10) / 10];
const plans: Record<string, FerryPlan> = {};
for (const r of FERRY_ROUTES) {
  const piers = r.stops.map((s) => pierFor(r, s));
  // Which way along the shore she comes in at each stop: from the side nearer the stop before (at the
  // first, she leaves toward the next)
  const ends = piers.map((p, k) => {
    const a = add(p.dock, p.along, APPROACH), b = add(p.dock, p.along, -APPROACH);
    const toward = k === 0 ? piers[1].dock : piers[k - 1].dock;
    const aNear = dist(a, toward) < dist(b, toward);
    return k === 0 ? { inn: aNear ? b : a, out: aNear ? a : b } : { inn: aNear ? a : b, out: aNear ? b : a };
  });
  const out: V[] = [], at: number[] = [];
  piers.forEach((p, k) => {
    if (k > 0) {
      const c = course(ends[k - 1].out, ends[k].inn);
      out.push(...c.slice(1, -1));
      out.push(ends[k].inn);
    }
    at.push(out.length);
    out.push(p.dock);
    if (k < piers.length - 1) out.push(ends[k].out);
  });
  // Laid close along the line: a point every dozen blocks, so the smooth curve the ship sails through
  // them can't swing wide of it at a turn (it did, over the headland north of Gullmouth)
  const dense: V[] = [], dat: number[] = [];
  out.forEach((q, i) => {
    if (at.includes(i)) dat.push(dense.length);
    dense.push(q);
    const nx = out[i + 1];
    if (!nx) return;
    const n = Math.floor(dist(q, nx) / 12);
    for (let k = 1; k < n; k++) dense.push([q[0] + ((nx[0] - q[0]) * k) / n, q[1] + ((nx[1] - q[1]) * k) / n]);
  });
  // And checked as she'll sail it: open water under her all the way, but at her jetties
  const curve = new THREE.CatmullRomCurve3(dense.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const L = curve.getLength(), bad: string[] = [];
  for (let d = 0; d <= L; d += 1.5) {
    const q = curve.getPointAt(d / L);
    if (piers.some((pp) => dist([q.x, q.z], pp.dock) < 10)) continue;
    if (!water(q.x, q.z, 0) || !water(q.x + 2.6, q.z, 0) || !water(q.x - 2.6, q.z, 0) || !water(q.x, q.z + 2.6, 0) || !water(q.x, q.z - 2.6, 0)) bad.push(`${Math.round(q.x)},${Math.round(q.z)}`);
  }
  if (bad.length) console.log(r.id, 'SHOAL OR LAND on her course at', bad.slice(0, 12).join(' '), bad.length > 12 ? `(+${bad.length - 12})` : '');
  out.splice(0, out.length, ...dense);
  at.splice(0, at.length, ...dat);
  plans[r.id] = {
    piers: piers.map((p, k) => { const v = norm([ends[k].out[0] - ends[k].inn[0], ends[k].out[1] - ends[k].inn[1]]); return { from: p.from, to: p.to, dock: r1(p.dock), heading: Math.round(Math.atan2(v[0], v[1]) * 1000) / 1000 }; }),
    course: out.map(r1),
    at,
  };
  const len = out.slice(1).reduce((s, q, i) => s + dist(out[i], q), 0);
  console.log(r.id, r.stops.map((s, k) => `${s.post} jetty ${piers[k].from}->${piers[k].to}`).join('; '), `course ${out.length} points, ${Math.round(len)} blocks, ${Math.round(len / r.speed)} s one way`);
}

writeFileSync('src/data/ferryRoutes.ts', `// Generated by scripts/ferries.ts (npm run -s ferries): each ferry route's jetties, where she lies at
// them, and her course from stop to stop over clear water. Edit data/ferries.ts and run it again.
import type { FerryPlan } from './ferries';

export const FERRY_PLANS: Record<string, FerryPlan> = {
${Object.entries(plans).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}
};
`);
console.log('written');
