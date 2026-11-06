// Scratch: the souling bands' rounds, door to door along open ground (a walk on the town's own grid)
import { B } from '../src/world/blocks';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const cells = new Map<string, number>();
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); return set0.call(this, x, y, z, id); };
const P = plan();
const solid = (x: number, y: number, z: number) => { const o = cells.get(`${x},${y},${z}`); return o !== undefined ? o !== B.Air && o !== B.Water : y < heightAt(x, z); };
const floorAt = (x: number, z: number, y0: number) => { for (let y = y0 + 3; y >= y0 - 3; y--) if (solid(x, y - 1, z) && !solid(x, y, z) && !solid(x, y + 1, z)) return y; return null; };
const propsAt = new Set<string>();
for (const s of P.sites) for (const d of s.props) if (d.t !== 'roof' && d.t !== 'door' && d.t !== 'glow' && d.t !== 'smoke' && !(d.t === 'furn' && (d.item === 'doorOpen' || d.item === 'rug'))) propsAt.add(`${Math.floor(d.x)},${Math.floor(d.z)}`);
const towns: [string, number, number, number][] = [['ansbury', 845, 360, 70], ['gullmouth', 1730, 598, 55], ['harrowgate', 1000, 1010, 55], ['callis', 8540, 1150, 90], ['northgate', 6920, -1236, 60]];
const doors: { x: number; z: number; ry: number; y: number }[] = [];
for (const s of P.sites) for (const d of s.props) if (d.t === 'door' || (d.t === 'furn' && d.item === 'doorOpen' && (d as { role?: string }).role === 'home')) doors.push({ x: d.x, z: d.z, ry: d.ry ?? 0, y: d.y });
const out: Record<string, { at: [number, number]; face: [number, number]; path: [number, number][] }[]> = {};
for (const [id, cx, cz, r] of towns) {
  const near = doors.filter((d) => Math.hypot(d.x - cx, d.z - cz) < r && Math.hypot(d.x - cx, d.z - cz) > 6)
    .map((d) => ({ ...d, a: Math.atan2(d.z - cz, d.x - cx), sx: Math.floor(d.x + Math.sin(d.ry) * 1.4), sz: Math.floor(d.z + Math.cos(d.ry) * 1.4) }))
    .filter((d) => floorAt(d.sx, d.sz, Math.round(d.y)) !== null && !propsAt.has(`${d.sx},${d.sz}`))
    .sort((a, b) => a.a - b.a);
  const pick: typeof near = [];
  for (let k = 0; k < 8 && near.length; k++) { const d = near[Math.floor((k / 8) * near.length)]; if (!pick.includes(d)) pick.push(d); }
  // walk between consecutive stops on open, level-ish ground
  const y0 = Math.round(pick[0]?.y ?? 20);
  const ok = (x: number, z: number) => Math.hypot(x - cx, z - cz) < r + 15 && floorAt(x, z, y0) !== null && !propsAt.has(`${x},${z}`);
  const walk = (ax: number, az: number, bx: number, bz: number): [number, number][] | null => {
    const key = (x: number, z: number) => `${x},${z}`, prev = new Map<string, string>(), q: [number, number][] = [[ax, az]];
    prev.set(key(ax, az), '');
    while (q.length) {
      const [x, z] = q.shift()!;
      if (x === bx && z === bz) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, k = key(nx, nz); if (prev.has(k) || !ok(nx, nz)) continue; prev.set(k, key(x, z)); q.push([nx, nz]); }
    }
    if (!prev.has(key(bx, bz))) return null;
    const cellsOn: [number, number][] = []; let k = key(bx, bz);
    while (k) { const [x, z] = k.split(',').map(Number); cellsOn.unshift([x, z]); k = prev.get(k)!; }
    // keep the turns only
    const pts: [number, number][] = [];
    for (let i = 1; i < cellsOn.length - 1; i++) { const [a, b, c] = [cellsOn[i - 1], cellsOn[i], cellsOn[i + 1]]; if (a[0] - b[0] !== b[0] - c[0] || a[1] - b[1] !== b[1] - c[1]) pts.push([b[0] + 0.5, b[1] + 0.5]); }
    return pts;
  };
  const stops: typeof out[string] = [];
  for (let i = 0; i < pick.length; i++) {
    const a = pick[(i + pick.length - 1) % pick.length], b = pick[i];
    const p = walk(a.sx, a.sz, b.sx, b.sz);
    if (!p) { console.error(id, 'no walk to stop', i); continue; }
    stops.push({ at: [b.sx + 0.5, b.sz + 0.5], face: [+b.x.toFixed(1), +b.z.toFixed(1)], path: p.length > 14 ? p.filter((_, j) => j % Math.ceil(p.length / 14) === 0) : p });
  }
  out[id] = stops;
  console.error(id, stops.length, 'stops, path points', stops.map((s) => s.path.length).join(','));
}
console.log(JSON.stringify(out));
