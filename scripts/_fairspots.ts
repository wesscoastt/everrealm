// Scratch: where each town's fair can stand: the open, level ground nearest its middle, clear of props
import { B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const cells = new Map<string, number>();
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); return set0.call(this, x, y, z, id); };
const P = plan();
const solid = (x: number, y: number, z: number) => { const o = cells.get(`${x},${y},${z}`); return o !== undefined ? o !== B.Air && o !== B.Water : y < heightAt(x, z); };
const wet = (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) === B.Water;
const floorAt = (x: number, z: number, y0: number) => { for (let y = y0 + 4; y >= y0 - 4; y--) if (solid(x, y - 1, z) && !wet(x, y, z) && !solid(x, y, z) && !solid(x, y + 1, z) && !solid(x, y + 2, z) && !solid(x, y + 3, z)) return y; return null; };
const propsAt = new Set<string>();
for (const s of P.sites) for (const d of s.props) if (d.t !== 'glow' && d.t !== 'smoke' && !(d.t === 'furn' && d.item === 'rug')) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) propsAt.add(`${Math.floor(d.x) + dx},${Math.floor(d.z) + dz}`);
const towns: [string, number, number, number][] = [['gullmouth', 1730, 598, 90]];
const H = Number(process.env.H ?? 5); // half the fair's square
for (const [id, cx, cz, r] of towns) {
  const y0 = heightAt(cx, cz);
  let best: [number, number, number, number] | null = null;
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > r || (best && d >= best[3])) continue;
    const f = floorAt(x, z, y0);
    if (f === null) continue;
    let ok = true;
    for (let dx = -H; dx <= H && ok; dx++) for (let dz = -H; dz <= H && ok; dz++) { const g = floorAt(x + dx, z + dz, f); if (g === null || Math.abs(g - f) > 1 || propsAt.has(`${x + dx},${z + dz}`)) ok = false; }
    if (ok) best = [x, f, z, d];
  }
  console.log(id, best ? `${best[0]},${best[1]},${best[2]} (${best[3].toFixed(0)} from the middle)` : 'none');
}
