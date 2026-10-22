// Placement check for the streamed world's settlements and landmarks.
//   npm run sites            list every problem
//   npm run sites -- --all   also list every point that stands on something built
//
// Runs the site planner in Node and checks that every fixed point the game relies on (where people
// stand and walk, things to examine, Charter Post stops, quest creatures, dungeon creatures and
// chests) has open ground under it:
// not buried in a wall, not sealed in by a fence's barrier, and not stranded on a roof or rampart.
// The authored Hollindale valley is built by structures.ts on its own grid and isn't covered here.

import { BLOCKS, B } from '../src/world/blocks';
import { Overrides, plan, PropDesc, PropType } from '../src/world/sites';
import { GW, heightAt, SEA } from '../src/world/terrain';
import { EVENTS, SHARDFALLS, TASKS, WORLD_BOSSES } from '../src/data/activities';
import { waymarks } from '../src/game/Waymarks';
import { NPCS } from '../src/data/npcs';
import { QUEST_SPAWNS, WORLD_THINGS } from '../src/data/places_regional';
import { POSTS } from '../src/data/travel';
import { BOARDS } from '../src/data/content';
import { ENEMIES, EnemyType } from '../src/data/gameplay';

// Record every override as the planner writes it (the last write to a cell wins, as in the game).
const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(key(x, y, z), id); return set0.call(this, x, y, z, id); };
const P = plan();

// Leaves don't count: the game stands people and creatures on the ground under a canopy.
const LEAVES = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);
// Shaped ground (a shingle bar, a raised field) is ground, not something built.
const GROUNDLIKE = new Set<number>([B.Sand, B.Gravel, B.Grass, B.Dirt, B.SnowGrass, B.Snow]);
const solid = (x: number, y: number, z: number): boolean => {
  const o = cells.get(key(x, y, z));
  if (o !== undefined) return o !== B.Air && o !== B.Water && !LEAVES.has(o) && !!BLOCKS[o]?.solid;
  return y < heightAt(Math.floor(x), Math.floor(z));
};
const all = process.argv.includes('--all');
const problems: string[] = [];
const raised: string[] = [];
let checked = 0;

function check(label: string, x: number, z: number, opts: { y?: number; water?: boolean } = {}) {
  if (x < GW + 40 && z < GW + 40) return; // authored valley
  checked++;
  if (opts.y !== undefined) {
    // Underground points: the floor must be solid and the two cells above it open
    if (!solid(x, opts.y - 1, z)) problems.push(`${label} (${x.toFixed(1)}, ${opts.y}, ${z.toFixed(1)}): no floor`);
    if (solid(x, opts.y, z) || solid(x, opts.y + 1, z)) problems.push(`${label} (${x.toFixed(1)}, ${opts.y}, ${z.toFixed(1)}): inside rock or a wall`);
    return;
  }
  // Look down from a little above head height, so an overhang (a parapet, an eave) isn't taken
  // for the floor; anything built up to eight blocks above the ground still counts.
  const ground = heightAt(Math.floor(x), Math.floor(z));
  let top = ground + 8;
  while (top > 0 && !solid(x, top, z)) top--;
  const stand = top + 1;
  const under = cells.get(key(x, top, z));
  if (under === B.Barrier) problems.push(`${label} (${x.toFixed(1)}, ${z.toFixed(1)}): standing on a barrier (a fence, door or prop)`);
  else if (stand - ground >= 2 && !GROUNDLIKE.has(under ?? -1)) {
    const what = `${label} (${x.toFixed(1)}, ${z.toFixed(1)}): ${stand - ground} blocks above the ground, on ${BLOCKS[under ?? 0]?.name ?? 'terrain'}`;
    if (stand - ground >= 4) problems.push(what); else raised.push(what);
  }
}

for (const n of NPCS) n.schedule.forEach((s, i) => {
  check(`npc ${n.id} slot ${i}`, s.at[0], s.at[1]);
  s.path?.forEach((p, k) => check(`npc ${n.id} slot ${i} path ${k}`, p[0], p[1]));
});
for (const t of WORLD_THINGS) if (t.radius > 0) check(`thing ${t.id}`, t.x, t.z, { y: t.y });
for (const p of POSTS) check(`post ${p.id}`, p.x, p.z);
for (const sp of QUEST_SPAWNS) sp.at.forEach(([x, z], i) => check(`spawn ${sp.tag} ${i}`, x, z, { y: sp.y }));
// Events, world bosses and Shardfalls happen on open, dry ground
for (const [label, x, z] of [...EVENTS.map((e) => [`event ${e.id}`, e.x, e.z] as const), ...WORLD_BOSSES.map((b) => [`boss ${b.id}`, b.x, b.z] as const), ...TASKS.map((t) => [`task ${t.id}`, t.x, t.z] as const), ...SHARDFALLS.map(([x, z], i) => [`shardfall ${i}`, x, z] as const)]) {
  check(label, x, z);
  if (heightAt(Math.floor(x), Math.floor(z)) <= SEA + 1) problems.push(`${label} (${x}, ${z}): in the water`);
}
// Waymarks: the stone and the spot travellers arrive on are open ground
for (const w of waymarks()) {
  // The shrine's middle is its solid pillar: check the dais in front of it, and where travellers arrive
  check(`waymark ${w.id} dais`, w.x + Math.sin(w.ry) * 2.2, w.z + Math.cos(w.ry) * 2.2);
  check(`waymark ${w.id} arrival`, w.ax, w.az, w.ay !== undefined ? { y: w.ay } : undefined);
}
// Dungeons, delves and dive sites: every creature, champion and chest stands on a floor with room
// above it. Sea creatures start in open water instead: water where they are and the cell over it.
const SWIMMERS = new Set(['shark', 'eel', 'ray', 'medusa']);
const water = (x: number, y: number, z: number) => { const o = cells.get(key(x, y, z)); return o !== undefined ? o === B.Water : y >= heightAt(Math.floor(x), Math.floor(z)) && y < SEA; };
const creature = (label: string, p: [number, number, number, string]) => {
  const d = ENEMIES[p[3] as EnemyType];
  if (!d) { problems.push(`${label}: no such creature ${p[3]}`); return; }
  if (!SWIMMERS.has(d.model ?? '')) { check(label, p[0], p[2], { y: p[1] }); return; }
  checked++;
  if (!water(p[0], p[1], p[2]) || !water(p[0], p[1] + 1, p[2])) problems.push(`${label} (${p[0].toFixed(1)}, ${p[1]}, ${p[2].toFixed(1)}): a sea creature out of open water`);
};
for (const st of P.sites) {
  const a = st.act;
  if (!a) continue;
  a.spawns?.forEach((p, i) => creature(`act ${st.id} spawn ${i}`, p));
  if (a.boss) creature(`act ${st.id} champion`, a.boss);
  if (a.chest) check(`act ${st.id} chest`, a.chest[0], a.chest[2], { y: a.chest[1] });
  a.caches?.forEach((c, i) => check(`act ${st.id} cache ${i}`, c[0], c[2], { y: c[1] }));
}
// Boards are read from beside the post: one of the four neighbouring cells must be open ground.
for (const b of BOARDS) {
  if (b.interactable) continue;
  const ok = [[0, 1.5], [0, -1.5], [1.5, 0], [-1.5, 0]].some(([dx, dz]) => {
    const x = b.x + dx, z = b.z + dz; let top = heightAt(Math.floor(x), Math.floor(z)) + 8; while (top > 0 && !solid(x, top, z)) top--;
    return top + 1 - heightAt(Math.floor(x), Math.floor(z)) < 2;
  });
  checked++;
  if (!ok) problems.push(`board ${b.id} (${b.x}, ${b.z}): no open ground beside it`);
}
// Fences must be solid to walk into: every fence prop needs barriers along its length.
for (const s of P.sites) for (const p of s.props as PropDesc[]) {
  if (p.t !== 'fence') continue;
  const len = p.len ?? 1, ry = p.ry ?? 0;
  const n = Math.max(1, Math.round(len));
  let open = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    const fx = p.x + Math.cos(ry) * t * len, fz = p.z - Math.sin(ry) * t * len;
    const g = heightAt(Math.floor(fx), Math.floor(fz)); // the barrier follows the ground cell by cell
    // A fence is a one-block barrier: you jump it, you can't walk or step through it
    if (cells.get(key(fx, g, fz)) !== B.Barrier) open++;
  }
  checked++;
  if (open) problems.push(`fence in ${s.id} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}): ${open} of ${n} cells have no barrier (can be walked through)`);
}

// Every house door: a step outside you can stand on (no pit, no drop, no barrier), and nothing
// standing in the way at body height on the step, in the doorway or just inside.
// Props that stand on the ground and get in the way; lamps on walls, roofs and the like don't.
const IN_THE_WAY = new Set<PropType>(['lantern', 'stall', 'boat', 'tent', 'cart', 'bench', 'barrel', 'crate', 'firepit', 'well', 'anvil', 'fence', 'sign', 'notice', 'desk', 'furn']);
for (const s of P.sites) for (const d of s.props as PropDesc[]) {
  const swing = d.t === 'furn' && d.item === 'doorOpen';
  if (d.t !== 'door' && !swing) continue;
  const ry = d.ry ?? 0, nx = Math.round(Math.sin(ry)), nz = Math.round(Math.cos(ry));
  // A shut door's leaf stands just proud of the doorway; an open one's hinge is at the jamb
  const hx = swing ? d.x + Math.sin(ry) * 0.45 : d.x, hz = swing ? d.z + Math.cos(ry) * 0.45 : d.z;
  const ox = swing ? Math.floor(hx + nx * 1.0 + nz * 0.42) : Math.floor(d.x - 0.52 * nx) + nx;
  const oz = swing ? Math.floor(hz + nz * 1.0 - nx * 0.42) : Math.floor(d.z - 0.52 * nz) + nz;
  if (ox < GW + 40 && oz < GW + 40) continue; // authored valley (npm run vale)
  checked++;
  const floor = d.y;
  let top = floor + 4; while (top > floor - 6 && !solid(ox, top, oz)) top--;
  const stand = top + 1;
  if (stand - floor >= 2) problems.push(`door in ${s.id} at (${ox}, ${oz}): ground outside is ${stand - floor} blocks above the floor`);
  else if (floor - stand >= 2) problems.push(`door in ${s.id} at (${ox}, ${oz}): a ${floor - stand}-block drop outside`);
  else if (solid(ox, stand, oz) || solid(ox, stand + 1, oz) || cells.get(key(ox, stand, oz)) === B.Barrier) problems.push(`door in ${s.id} at (${ox}, ${oz}): blocked outside`);
  for (const k of [1, 0, -1]) {
    const cx = ox - nx * (1 - k) + 0.5, cz = oz - nz * (1 - k) + 0.5;
    const hit = (s.props as PropDesc[]).find((p) => p !== d && IN_THE_WAY.has(p.t) && p.item !== 'doorOpen' && p.item !== 'rug' && Math.abs(p.x - cx) < 0.8 && Math.abs(p.z - cz) < 0.8 && p.y > floor - 1.5 && p.y < floor + 1.8);
    if (hit) problems.push(`door in ${s.id} at (${ox}, ${oz}): a ${hit.item ?? hit.t} ${['inside', 'in the doorway', 'on the step'][k + 1]} at (${hit.x.toFixed(1)}, ${hit.z.toFixed(1)})`);
  }
}

// Props standing inside a wall (a cart parked half through a house, a barrel in the masonry)
const OUTDOOR = new Set<PropType>(['stall', 'tent', 'cart', 'bench', 'barrel', 'crate', 'firepit', 'well', 'anvil', 'sign', 'notice', 'desk', 'lantern']);
for (const s of P.sites) for (const p of s.props as PropDesc[]) {
  if (!OUTDOOR.has(p.t) || (p.x < GW + 40 && p.z < GW + 40)) continue;
  const wallAt = (y: number) => { const o = cells.get(key(p.x, y, p.z)); return o !== undefined && o !== B.Barrier && o !== B.Air && o !== B.Water && !LEAVES.has(o) && !!BLOCKS[o]?.solid; };
  checked++;
  // A lamp on a two-high timber rail post: its lamp clears the post's top
  if (p.t === 'lantern' && cells.get(key(p.x, p.y, p.z)) === B.Timber && !wallAt(p.y + 2) && !wallAt(p.y + 3)) continue;
  if (wallAt(p.y) || wallAt(p.y + 1)) problems.push(`${p.t} in ${s.id} at (${p.x.toFixed(1)}, ${p.y}, ${p.z.toFixed(1)}): inside ${BLOCKS[cells.get(key(p.x, wallAt(p.y) ? p.y : p.y + 1, p.z))!]?.name}`);
}

// Blocks you can see resting on an invisible barrier (paving or a step laid over a post's barrier)
for (const [k, id] of cells) {
  if (id === B.Barrier || id === B.Air || id === B.Water) continue;
  const [x, y, z] = k.split(',').map(Number);
  if (cells.get(key(x, y - 1, z)) !== B.Barrier) continue;
  // Part of a wall (a lintel over a shut door, a course over a gate) holds itself up
  const wall = (dx: number, dz: number) => { const o = cells.get(key(x + dx, y, z + dz)); return o !== undefined ? o !== B.Air && o !== B.Barrier && !!BLOCKS[o]?.solid : y < heightAt(x + dx, z + dz); };
  if ((wall(1, 0) && wall(-1, 0)) || (wall(0, 1) && wall(0, -1))) continue;
  problems.push(`block on a barrier at (${x}, ${y}, ${z}): ${BLOCKS[id]?.name}`);
}
console.log(`${checked} points checked across ${P.sites.length} sites.`);
if (all && raised.length) { console.log(`\nStanding on something built (2-3 blocks up, usually a step, floor or jetty):`); for (const r of raised) console.log('  ' + r); }
if (problems.length) { console.log(`\n${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); process.exitCode = 1; }
else console.log('No problems.');
