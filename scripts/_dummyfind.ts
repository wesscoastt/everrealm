// Scratch: for each calling master, find a clear, level row of three spots for training dummies.
import { BLOCKS, B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt, SEA } from '../src/world/terrain';
import { NPCS } from '../src/data/npcs';

const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(key(x, y, z), id); return set0.call(this, x, y, z, id); };
const P = plan();
const solid = (x: number, y: number, z: number): boolean => {
  const o = cells.get(key(x, y, z));
  if (o !== undefined) return o !== B.Air && o !== B.Water && !!BLOCKS[o]?.solid;
  return y < heightAt(Math.floor(x), Math.floor(z));
};
const top = (x: number, z: number) => { let y = heightAt(x, z) + 10; while (y > 0 && !solid(x, y, z)) y--; return y + 1; };
const props = P.sites.flatMap((s) => s.props.map((p) => [p.x, p.z, p.t] as [number, number, string]));
const npcSpots = NPCS.flatMap((n) => n.schedule.flatMap((s) => [s.at, ...(s.path ?? [])]));
const masters = NPCS.filter((n) => n.id.startsWith('master_'));
for (const m of masters) {
  const [mx, mz] = m.schedule[0].at;
  const my = top(Math.floor(mx), Math.floor(mz));
  let best: { s: number; spots: [number, number][]; yaw: number } | null = null;
  for (let a = 0; a < 32; a++) for (const r of [5, 6, 7, 8]) {
    const ang = (a / 32) * Math.PI * 2, cx = mx + Math.sin(ang) * r, cz = mz + Math.cos(ang) * r;
    // the row runs across the line to the master, the dummies facing them
    const ux = Math.sin(ang), uz = Math.cos(ang);
    const spots: [number, number][] = [-2.4, 0, 2.4].map((o) => [Math.floor(cx + uz * o) + 0.5, Math.floor(cz - ux * o) + 0.5]);
    let ok = true, score = Math.abs(r - 6);
    for (const [x, z] of spots) {
      const fx = Math.floor(x), fz = Math.floor(z), y = top(fx, fz);
      if (Math.abs(y - my) > 1 || y <= SEA + 1) { ok = false; break; }
      // room round it: nothing solid at body height within a block, nothing built over it
      for (let dx = -1; dx <= 1 && ok; dx++) for (let dz = -1; dz <= 1 && ok; dz++) {
        if (solid(fx + dx, y, fz + dz) || solid(fx + dx, y + 1, fz + dz)) ok = false;
        if (Math.abs(top(fx + dx, fz + dz) - y) > 1) ok = false;
      }
      for (let yy = y + 2; yy < y + 8 && ok; yy++) if (solid(fx, yy, fz)) ok = false;
      if (props.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.2)) ok = false;
      if (npcSpots.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2)) ok = false;
      if (!ok) break;
      score += props.filter(([px, pz]) => Math.hypot(px - x, pz - z) < 4).length * 0.3;
    }
    if (ok && (!best || score < best.s)) best = { s: score, spots, yaw: Math.atan2(-ux, -uz) };
  }
  console.log(m.id, best ? JSON.stringify(best.spots) + ' yaw ' + best.yaw.toFixed(2) + ' score ' + best.s.toFixed(1) : 'NONE');
}
