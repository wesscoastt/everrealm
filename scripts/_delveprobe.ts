// Scratch: each delve's floor plan around its centre (open cells at the floor), to place a room and its gate.
import { B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const cells = new Map<string, number>();
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); return set0.call(this, x, y, z, id); };
const P = plan();
const solid = (x: number, y: number, z: number) => { const o = cells.get(`${x},${y},${z}`); return o !== undefined ? o !== B.Air && o !== B.Water : y < heightAt(x, z); };
const only = process.argv[2];
for (const s of P.sites) {
  if (s.act?.kind !== 'delve' || (only && s.id !== only)) continue;
  const cx = Math.round(s.x), cz = Math.round(s.z), F = Math.floor(s.act.chest![1]);
  console.log(`${s.id} centre ${cx},${cz} F ${F}`);
  for (let z = -10; z <= 10; z++) {
    let row = String(z).padStart(4) + ' ';
    for (let x = -22; x <= 24; x++) {
      const X = cx + x, Z = cz + z;
      const open = !solid(X, F, Z) && !solid(X, F + 1, Z) && solid(X, F - 1, Z);
      const up = !solid(X, F + 1, Z) && !solid(X, F + 2, Z) && solid(X, F, Z);
      row += open ? (x === 0 ? '|' : '.') : up ? '^' : '#';
    }
    console.log(row);
  }
  console.log('     x from -22 (| = x 0)');
}
