// Walk every cell of the dungeons and delves (the dungeon pass, after the dark-crawler kit's sc_pathscan).
//   npm run -s pathscan                 every group dungeon and delve
//   npm run -s pathscan -- gd-winding   just these (ids, or a prefix: delve-)
//   npm run -s pathscan -- --cells      also list each flagged cell
//
// Runs the site planner in Node, then from each dungeon's way in (its arrival point, or its chest for a delve)
// walks every cell a player can stand in, as sitecheck's reachability does (step up a block, drop up to three,
// headroom for both), and on every cell it reaches checks:
//   - the floor under it can be seen: solid and drawn (not a barrier, not left open over a void);
//   - nothing stands through the body: no solid prop (a crate, a cart, a table) in the cell with nothing to stop
//     you walking into it, as dungeon clutter has no barrier of its own;
//   - the breakables stand on floor that's walked, in open air;
//   - how much of the walk is in a lit room (a zone, world/zones.ts) and how much in the passages between.
// It also says how many cells it walked, so a room cut off from the rest shows as a drop in the count.

import { BLOCKS, B } from '../src/world/blocks';
import { Overrides, plan, type PropDesc, type Site } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
import { inZone } from '../src/world/zones';

const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(key(x, y, z), id); return set0.call(this, x, y, z, id); };
const P = plan();

const get = (x: number, y: number, z: number): number | undefined => cells.get(key(x, y, z));
const solid = (x: number, y: number, z: number): boolean => {
  const o = get(x, y, z);
  if (o !== undefined) return o !== B.Air && o !== B.Water && !!BLOCKS[o]?.solid;
  return y < heightAt(Math.floor(x), Math.floor(z));
};
const water = (x: number, y: number, z: number) => get(x, y, z) === B.Water;
/** Props with a body you'd bump into (the rest are flat, hung up, or light). */
const BODY = new Set<string>(['crate', 'barrel', 'cart', 'anvil', 'well', 'tent', 'stall', 'desk', 'statue']);
const BODY_FURN = new Set<string>(['table', 'shelves', 'dresser', 'bed', 'wardrobe', 'bookcase']);

const args = process.argv.slice(2);
const list = args.includes('--cells');
const want = args.filter((a) => !a.startsWith('--'));
let problems = 0;
const lines: string[] = [];

function scan(s: Site) {
  const a = s.act!;
  const start = a.arrive ?? a.chest;
  if (!start) return;
  const walk = (x: number, y: number, z: number) => (solid(x, y - 1, z) || water(x, y - 1, z)) && !solid(x, y, z) && !solid(x, y + 1, z);
  const K = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const [sx, sy, sz] = start.map(Math.floor);
  const seen = new Set<string>([K(sx, sy, sz)]);
  const queue: [number, number, number][] = [[sx, sy, sz]];
  while (queue.length && seen.size < 300000) {
    const [x, y, z] = queue.pop()!;
    if (!a.arrive && y >= heightAt(x, z)) continue; // a delve: stop where its stair comes up into the open
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1, -2, -3]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (Math.abs(nx - sx) > 140 || Math.abs(nz - sz) > 140 || seen.has(K(nx, ny, nz))) continue;
      if (dy > 0 && solid(x, y + 2, z)) continue;
      if (dy < 0 && [0, -1, -2].slice(0, -dy).some((k) => solid(nx, y + k, nz) || solid(nx, y + k + 1, nz))) continue;
      if (!walk(nx, ny, nz)) continue;
      seen.add(K(nx, ny, nz));
      queue.push([nx, ny, nz]);
      break;
    }
  }
  // Every cell walked
  const noFloor: string[] = [], body: string[] = [];
  let inRoom = 0;
  const bodies = new Map<string, PropDesc>();
  for (const p of s.props) if (BODY.has(p.t) || (p.t === 'furn' && BODY_FURN.has(p.item ?? ''))) bodies.set(`${Math.floor(p.x)},${Math.floor(p.z)}`, p);
  for (const c of seen) {
    const [x, y, z] = c.split(',').map(Number);
    const below = get(x, y - 1, z);
    if (below !== undefined && below !== B.Water && (BLOCKS[below]?.invisible || !BLOCKS[below]?.solid)) noFloor.push(`(${x}, ${y}, ${z}) stands on ${BLOCKS[below]?.name ?? below}`);
    const p = bodies.get(`${x},${z}`);
    if (p && Math.abs(Math.floor(p.y) - y) <= 1) body.push(`(${x}, ${y}, ${z}): a ${p.t === 'furn' ? p.item : p.t} with nothing to stop you walking into it`);
    if (s.zones?.some((zn) => inZone(zn, x + 0.5, y, z + 0.5))) inRoom++;
  }
  const brk: string[] = [];
  for (const b of s.breakables ?? []) {
    const [x, y, z] = [Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)];
    if (!seen.has(K(x, y, z))) brk.push(`a ${b.kind} at (${b.x.toFixed(1)}, ${b.y}, ${b.z.toFixed(1)}) isn't on floor anyone walks`);
  }
  const bad = noFloor.length + body.length + brk.length;
  problems += bad;
  const zones = s.zones?.length ? `, ${Math.round((inRoom / seen.size) * 100)}% in its ${s.zones.length} lit rooms` : ', no lit rooms';
  lines.push(`${bad ? '!!' : 'ok'} ${s.id} (${s.name}): ${seen.size} cells walked${zones}, ${s.breakables?.length ?? 0} to smash` + (bad ? `: ${noFloor.length} without a floor you can see, ${body.length} through a prop, ${brk.length} breakables off the walk` : ''));
  if (bad) for (const l of [...noFloor, ...body, ...brk].slice(0, list ? 400 : 6)) lines.push('     ' + l);
}

for (const s of P.sites) {
  if (!s.act || !(s.act.kind === 'group' || s.act.kind === 'delve')) continue;
  if (want.length && !want.some((w) => s.id === w || s.id.startsWith(w))) continue;
  scan(s);
}
console.log(lines.join('\n'));
console.log(problems ? `${problems} problems.` : 'No problems.');
