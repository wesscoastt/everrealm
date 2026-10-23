// Path check: nothing stands in the way on the roads between towns or on the streets inside them.
//   npm run paths            list every road or street that is blocked, narrowed or planted over
//   npm run paths -- --all   also list bulky props (carts, barrels, stalls) standing in a street
//
// Walks the overland roads (WORLD_ROADS) and every street laid by the site planner, a cross-section
// at a time: a road whose whole width is shut by something solid (a wall, a fence's barrier) is
// BLOCKED; one shut down to a single block is NARROW; crops on farmland in the way are FIELD. The
// authored Hollindale valley is built on its own grid and isn't covered here.

import { BLOCKS, B } from '../src/world/blocks';
import { Overrides, plan, setStreetHook } from '../src/world/sites';
import { GW, heightAt, roadDist, SEA, WORLD_ROADS } from '../src/world/terrain';

const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(key(x, y, z), id); return set0.call(this, x, y, z, id); };
const streets: { x0: number; z0: number; x1: number; z1: number; kind: string }[] = [];
setStreetHook((x0, z0, x1, z1, kind) => streets.push({ x0, z0, x1, z1, kind }));
const P = plan();
const all = process.argv.includes('--all');

const LEAVES = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);
const solid = (x: number, y: number, z: number): boolean => {
  const o = cells.get(key(x, y, z));
  if (o !== undefined) return o !== B.Air && o !== B.Water && !LEAVES.has(o) && (!!BLOCKS[o]?.solid || o === B.Barrier);
  return y < heightAt(Math.floor(x), Math.floor(z));
};
/** The walking surface here (the top of what's built or the ground), and whether two blocks above it are clear. */
function cell(x: number, z: number, climb = false): { ok: boolean; field: boolean; y: number; what: string } {
  const g = heightAt(x, z);
  // Find the floor: the highest solid block from a little above the ground down to just below it
  let y = g + 3;
  while (y > g - 3 && !solid(x, y - 1, z)) y--;
  // Walking a street (climb): on a step, or inside something raised (a flight of steps up to a
  // terrace, a causeway), the floor is its top if that's within reach. A wall across the street still
  // blocks the walk: its top is too far a step from the street either side of it.
  if (climb && solid(x, y, z)) {
    let up = y;
    while (up < g + 9 && (solid(x, up, z) || solid(x, up + 1, z))) up++;
    if (up < g + 9) y = up;
  }
  const under = cells.get(key(x, y - 1, z));
  const field = under === B.Farmland;
  const blockA = solid(x, y, z), blockB = solid(x, y + 1, z);
  // A step of one block is fine; a wall is two
  const ok = !(blockA && blockB) && !(blockA && solid(x, y + 2, z));
  const w = cells.get(key(x, y, z)) ?? cells.get(key(x, y + 1, z));
  return { ok, field, y, what: w !== undefined ? BLOCKS[w]?.name ?? String(w) : 'terrain' };
}

const problems: string[] = [];
const notes: string[] = [];
const siteNear = (x: number, z: number) => {
  let best = '', bd = 1e9;
  for (const s of P.sites) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s.name; } }
  return bd < 120 ? best : 'open country';
};

// ---------------------------------------------------------------- Overland roads, a cross-section each block
let sections = 0;
const seenRoad = new Set<string>();
for (const line of WORLD_ROADS) for (let i = 0; i < line.length - 1; i++) {
  const [ax, az] = line[i], [bx, bz] = line[i + 1];
  const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
  for (let t = 0; t <= len; t += 1) {
    const cx = ax + ux * t, cz = az + uz * t;
    if (cx < GW + 40 && cz < GW + 40) continue;
    const across: { x: number; z: number }[] = [];
    for (let o = -3; o <= 3; o += 0.5) {
      const x = Math.floor(cx - uz * o), z = Math.floor(cz + ux * o);
      if (roadDist(x, z) < 1.5 && heightAt(x, z) > SEA) across.push({ x, z });
    }
    const uniq = [...new Map(across.map((c) => [c.x + ',' + c.z, c])).values()];
    if (uniq.length < 2) continue;
    sections++;
    const res = uniq.map((c) => ({ ...c, ...cell(c.x, c.z) }));
    const open = res.filter((r) => r.ok).length;
    const k = Math.round(cx / 4) + ',' + Math.round(cz / 4);
    if (seenRoad.has(k)) continue;
    const bad = res.find((r) => !r.ok);
    const fld = res.find((r) => r.field);
    if (open === 0) { problems.push(`BLOCKED road at (${Math.round(cx)}, ${Math.round(cz)}) near ${siteNear(cx, cz)}: ${bad?.what}`); seenRoad.add(k); }
    else if (open === 1 && uniq.length >= 3) { problems.push(`NARROW road at (${Math.round(cx)}, ${Math.round(cz)}) near ${siteNear(cx, cz)}: ${bad?.what}`); seenRoad.add(k); }
    else if (fld) { problems.push(`FIELD on the road at (${fld.x}, ${fld.z}) near ${siteNear(cx, cz)}: crops planted in the way`); seenRoad.add(k); }
    else if (bad) { notes.push(`obstacle on the road at (${bad.x}, ${bad.z}) near ${siteNear(cx, cz)}: ${bad.what}`); seenRoad.add(k); }
  }
}

// ---------------------------------------------------------------- Streets: can you get from one end to the other?
// A street can have a well or the keep in its middle; what matters is whether there's a way through,
// so search for a walkable route (one block steps, no climbing walls) from one end to the other,
// allowing a detour of a few blocks either side of it.
let streetSections = 0;
const memo = new Map<string, { ok: boolean; y: number }>();
const at = (x: number, z: number) => { const k = x + ',' + z; let c = memo.get(k); if (!c) { const r = cell(x, z, true); c = { ok: r.ok, y: r.y }; memo.set(k, c); } return c; };
for (const s of streets) {
  const w = s.x1 - s.x0 + 1, h = s.z1 - s.z0 + 1;
  if (s.kind !== 'street' || Math.min(w, h) < 2 || Math.max(w, h) < 6) continue;
  const alongX = w >= h, pad = 22;
  const bx0 = s.x0 - pad, bx1 = s.x1 + pad, bz0 = s.z0 - pad, bz1 = s.z1 + pad;
  const start: [number, number][] = [], goal = new Set<string>();
  for (let j = 0; j < (alongX ? h : w); j++) {
    const a = alongX ? [s.x0, s.z0 + j] : [s.x0 + j, s.z0];
    const e = alongX ? [s.x1, s.z0 + j] : [s.x0 + j, s.z1];
    if (at(a[0], a[1]).ok) start.push([a[0], a[1]]);
    goal.add(e[0] + ',' + e[1]);
  }
  streetSections += alongX ? w : h;
  const seen = new Set(start.map(([x, z]) => x + ',' + z));
  const q = [...start];
  let found = false;
  while (q.length && !found) {
    const [x, z] = q.shift()!;
    const here = at(x, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = nx + ',' + nz;
      if (nx < bx0 || nx > bx1 || nz < bz0 || nz > bz1 || seen.has(k)) continue;
      const c = at(nx, nz);
      if (!c.ok || Math.abs(c.y - here.y) > 1) continue;
      seen.add(k);
      if (goal.has(k)) { found = true; break; }
      q.push([nx, nz]);
    }
  }
  if (!found) {
    const mid = alongX ? [Math.round((s.x0 + s.x1) / 2), s.z0] : [s.x0, Math.round((s.z0 + s.z1) / 2)];
    problems.push(`BLOCKED street from (${s.x0}, ${s.z0}) to (${s.x1}, ${s.z1}) in ${siteNear(mid[0], mid[1])}: no way through`);
  }
}

// ---------------------------------------------------------------- Bulky props in streets and on roads
const BULKY = new Set(['cart', 'barrel', 'crate', 'stall', 'well', 'firepit', 'anvil', 'boat', 'tent', 'headframe', 'bench', 'fence', 'postBox']);
let bulky = 0;
for (const site of P.sites) for (const pr of site.props) {
  if (!BULKY.has(pr.t)) continue;
  const onRoad = roadDist(pr.x, pr.z) < 1.2;
  const inStreet = streets.some((s) => s.kind === 'street' && pr.x >= s.x0 + 0.5 && pr.x <= s.x1 + 0.5 && pr.z >= s.z0 + 0.5 && pr.z <= s.z1 + 0.5);
  if (!onRoad && !inStreet) continue;
  bulky++;
  const line = `${pr.t} standing in ${onRoad ? 'the road' : 'a street'} at (${pr.x.toFixed(1)}, ${pr.z.toFixed(1)}) in ${site.name}`;
  if (onRoad && (pr.t === 'cart' || pr.t === 'stall' || pr.t === 'tent' || pr.t === 'fence' || pr.t === 'postBox')) problems.push(line); else notes.push(line);
}

console.log(`${sections} road cross-sections and ${streetSections} street cross-sections checked; ${bulky} bulky props in the way.`);
if (problems.length) { console.log(`\n${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); }
else console.log('No roads or streets blocked.');
if (all && notes.length) { console.log(`\n${notes.length} note(s):`); for (const n of notes) console.log('  ' + n); }
if (problems.length) process.exitCode = 1;
