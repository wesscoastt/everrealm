// Scratch: house doors round each big town's middle, for the souling bands' rounds: a spot on the step outside each
import { plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const towns: [string, number, number, number][] = [['hollin', 162, 186, 45], ['ansbury', 845, 360, 70], ['gullmouth', 1730, 598, 55], ['harrowgate', 1000, 1010, 55], ['callis', 8540, 1150, 90], ['northgate', 6920, -1236, 60]];
const P = plan();
const doors: { x: number; z: number; ry: number; y: number }[] = [];
for (const s of P.sites) for (const d of s.props) {
  if (d.t === 'door' || (d.t === 'furn' && d.item === 'doorOpen' && (d as { role?: string }).role === 'home')) doors.push({ x: d.x, z: d.z, ry: d.ry ?? 0, y: d.y });
}
for (const [id, cx, cz, r] of towns) {
  const near = doors.filter((d) => Math.hypot(d.x - cx, d.z - cz) < r && Math.hypot(d.x - cx, d.z - cz) > 6)
    .map((d) => ({ ...d, a: Math.atan2(d.z - cz, d.x - cx), sx: d.x + Math.sin(d.ry) * 1.4, sz: d.z + Math.cos(d.ry) * 1.4 }))
    .filter((d) => Math.abs(heightAt(Math.floor(d.sx), Math.floor(d.sz)) - d.y) < 1.5)
    .sort((a, b) => a.a - b.a);
  // eight, spread round the middle
  const pick: typeof near = [];
  for (let k = 0; k < 8 && near.length; k++) pick.push(near[Math.floor((k / 8) * near.length)]);
  console.log(id, near.length, JSON.stringify(pick.map((d) => [+d.sx.toFixed(1), +d.sz.toFixed(1), +d.x.toFixed(1), +d.z.toFixed(1)])));
}
