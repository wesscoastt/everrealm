// Scratch: every place a delve's room uses, open at the floor?
import { B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
import { DELVE_ROOMS } from '../src/data/rooms';
const cells = new Map<string, number>();
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); return set0.call(this, x, y, z, id); };
const P = plan();
const solid = (x: number, y: number, z: number) => { const o = cells.get(`${x},${y},${z}`); return o !== undefined ? o !== B.Air && o !== B.Water : y < heightAt(x, z); };
for (const s of P.sites) {
  const d = DELVE_ROOMS[s.id]; if (!d) continue;
  const ox = Math.round(s.x), oz = Math.round(s.z), F = Math.floor(s.act!.chest![1]);
  const spots: [string, number, number][] = [['chest', ...d.chest]];
  if (d.clue) spots.push(['clue', d.clue[0], d.clue[1]]);
  d.levers?.forEach((l, i) => spots.push(['lever' + i, ...l.at]));
  d.plates?.forEach((p, i) => spots.push(['plate' + i, ...p]));
  d.waves?.flat().forEach((w, i) => spots.push(['wave' + i, w[0], w[1]]));
  if (d.keeper) { spots.push(['keeper', ...d.keeper.at]); d.keeper.crew.forEach((c, i) => spots.push(['crew' + i, c[0], c[1]])); }
  if (d.carry) { spots.push(['from', ...d.carry.from], ['to', ...d.carry.to]); d.carry.harry.forEach((h, i) => spots.push(['harry' + i, h[0], h[1]])); }
  if (d.gauntlet) { spots.push(['chain', ...d.gauntlet.chain]); d.gauntlet.stones.forEach((t, i) => spots.push(['stone' + i, t[0], t[1]])); }
  const bad = spots.filter(([, x, z]) => solid(ox + x, F, oz + z) || solid(ox + x, F + 1, oz + z) || !solid(ox + x, F - 1, oz + z));
  const neck = d.gate.cells.filter(([x, z]) => !solid(ox + x, F, oz + z) && !solid(ox + x, F + 1, oz + z)).map(([, z]) => z);
  console.log(`${s.id}: ${bad.length ? 'BAD ' + bad.map(([n, x, z]) => `${n}(${x},${z})`).join(' ') : 'all open'}; neck z ${neck.join(',')}`);
}
// Is the gate the only way through? Walk from the stair's foot with the neck blocked: can the champion's spot be reached?
for (const s of P.sites) {
  const d = DELVE_ROOMS[s.id]; if (!d) continue;
  const ox = Math.round(s.x), oz = Math.round(s.z), F = Math.floor(s.act!.chest![1]);
  const walk = (x: number, z: number) => { const X = ox + x, Z = oz + z; for (const f of [F, F + 1, F - 1]) if (solid(X, f - 1, Z) && !solid(X, f, Z) && !solid(X, f + 1, Z)) return true; return false; };
  const shut = new Set(d.gate.cells.map(([x, z]) => `${x},${z}`));
  const seen = new Set<string>(['0,0']), q: [number, number][] = [[0, 0]];
  while (q.length) { const [x, z] = q.shift()!; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${z + dz}`; if (seen.has(k) || shut.has(k) || Math.abs(x + dx) > 30 || Math.abs(z + dz) > 14 || !walk(x + dx, z + dz)) continue; seen.add(k); q.push([x + dx, z + dz]); } }
  console.log(`${s.id}: champion ${seen.has('14,2') ? 'REACHABLE round the gate' : 'shut off'}; west room ${seen.has('-14,0') ? 'reachable' : 'NOT reachable'}`);
}
