// Counting House survey: ASCII map from the dump. args: json region L x0 z0 x1 z1
import { readFileSync } from 'fs';
import { roadDist } from '../src/world/terrain';
const [file, region, Ls, ...r] = process.argv.slice(2);
const D = JSON.parse(readFileSync(file, 'utf8'));
const R = D.regions[region], N = D.blockNames;
const L = +Ls;
const [x0, z0, x1, z1] = r.map(Number);
const cell = (x: number, z: number) => R.cells[(z - R.z0) * R.W + (x - R.x0)];
const propAt = new Map<string, string>();
for (const p of R.props) {
  const k = Math.floor(p.x) + ',' + Math.floor(p.z);
  const c = p.t === 'roof' ? 'r' : p.t === 'lantern' || p.t === 'wallLantern' ? 'i' : p.t === 'sign' ? '$' : p.t === 'door' ? 'D' : p.t === 'tree' ? 'T' : 'p';
  if (!propAt.has(k) || c !== 'r') propAt.set(k, c);
  if (p.t === 'roof' && p.len && p.span) { /* roof footprint: skip, walls show */ }
}
const lines: string[] = [];
let hdr = '      ';
for (let x = x0; x <= x1; x++) hdr += x % 10 === 0 ? '|' : ' ';
lines.push(hdr + '  (| = x%10==0, starting x ' + x0 + ')');
for (let z = z0; z <= z1; z++) {
  let s = String(z).padStart(5) + ' ';
  for (let x = x0; x <= x1; x++) {
    const c = cell(x, z);
    if (!c) { s += ' '; continue; }
    const col: [number, number][] = c.col;
    const above = col.filter(([y, id]) => y >= L && y <= L + 14 && id !== 0);
    const surf = col.find(([y]) => y === L - 1);
    const pa = propAt.get(x + ',' + z);
    let ch = '.';
    const g = Math.floor(c.h);
    if (above.length) {
      const names = above.map(([, id]) => N[id] || '');
      ch = names.some((n: string) => /Leaves|Log/.test(n)) && !names.some((n: string) => /Brick|Plaster|Planks|Timber|Stone|Glass|Door|Cobble/.test(n)) ? 'T' : names.some((n: string) => /Barrier|Fence/.test(n)) && above.length <= 2 ? 'f' : '#';
    } else if (pa) ch = pa;
    else if (surf) { const n = N[surf[1]] || ''; ch = /Path|Gravel|Dirt/.test(n) ? ',' : /Farmland/.test(n) ? 'a' : /Water/.test(n) ? '~' : /Grass/.test(n) ? '.' : /Plank/.test(n) ? '=' : 's'; }
    else if (g < 16) ch = '~';
    else if (roadDist(x, z) < 1.5) ch = 'R';
    else if (g !== L) ch = g > L ? String(Math.min(9, g - L)) : (g < L - 9 ? 'v' : String.fromCharCode(96 + Math.min(9, L - g)).toUpperCase());
    s += ch;
  }
  lines.push(s);
}
console.log(lines.join('\n'));
