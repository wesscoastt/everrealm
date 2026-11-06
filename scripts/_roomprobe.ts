// Scratch: open cells around a dungeon spot (dungeon frame), floor by floor. args: ox oz f x0 z0 x1 z1
import { B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const [ox, oz, f, x0, z0, x1, z1] = process.argv.slice(2).map(Number);
const cells = new Map<string, number>();
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); return set0.call(this, x, y, z, id); };
plan();
const solid = (x: number, y: number, z: number) => { const o = cells.get(`${x},${y},${z}`); return o !== undefined ? o !== B.Air : y < heightAt(x, z); };
for (let z = z0; z <= z1; z++) {
  let s = String(z).padStart(4) + ' ';
  for (let x = x0; x <= x1; x++) {
    const X = ox + x, Z = oz + z;
    let fl = -99; for (let y = f + 6; y >= f - 12; y--) if (solid(X, y, Z) && !solid(X, y + 1, Z) && !solid(X, y + 2, Z)) { fl = y + 1; break; }
    s += fl === -99 ? '#' : fl === f ? '.' : fl > f ? String.fromCharCode(64 + Math.min(9, fl - f)) : String(Math.min(9, f - fl));
  }
  console.log(s);
}
console.log('     x from', x0, '(. = floor at f, A.. = higher, 1.. = lower, # = rock)');
