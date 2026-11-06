// Callis survey (read-only): rebuild Callis's street list, then find free plots in the dump.
// args: json  mode(find|check)  [w d  | x0 z0 x1 z1]
import { readFileSync } from 'fs';
import { NPCS } from '../src/data/npcs';
import { CALLIS, CALLIS_QUAY_X, CALLIS_RIVER_Z, CALLIS_SPOTS, CALLIS_TOWERS } from '../src/world/morrow';
const [file, mode, ...a] = process.argv.slice(2);
const D = JSON.parse(readFileSync(file, 'utf8'));
const R = D.regions.callis;
const cx = CALLIS.x, cz = CALLIS.z, RZ = CALLIS_RIVER_Z, QX = CALLIS_QUAY_X;
const taken: number[][] = [];
const claim = (x0: number, z0: number, x1: number, z1: number) => taken.push([x0, z0, x1, z1]);
const isFree = (x0: number, z0: number, x1: number, z1: number) => !taken.some((r) => x0 <= r[2] && x1 >= r[0] && z0 <= r[3] && z1 >= r[1]);
const main: number[][] = [], lanes: number[][] = [];
claim(cx - 215, RZ - 9, QX + 30, RZ + 9);
for (const bx of [cx - 120, cx - 20, cx + 70]) claim(bx - 4, RZ - 12, bx + 4, RZ + 12);
main.push([cx - 200, RZ - 13, QX - 2, RZ - 9], [cx - 200, RZ + 9, QX - 2, RZ + 13]);
for (const [x0, z0, x1, z1] of [
  [cx - 24, cz - 66, cx - 16, RZ - 13], [cx - 24, RZ + 13, cx - 16, cz + 170], [QX - 16, cz - 160, QX - 10, cz + 170],
  [cx - 124, cz - 150, cx - 117, RZ - 13], [cx - 124, RZ + 13, cx - 117, cz + 160], [cx + 66, cz - 140, cx + 73, RZ - 13], [cx + 66, RZ + 13, cx + 73, cz + 160],
  [cx - 200, cz - 60, QX - 16, cz - 54], [cx - 200, cz + 66, QX - 16, cz + 72], [cx - 190, cz - 130, QX - 16, cz - 124], [cx - 190, cz + 132, QX - 16, cz + 138],
]) { main.push([x0, z0, x1, z1]); claim(x0 - 1, z0 - 1, x1 + 1, z1 + 1); }
const PX = CALLIS_SPOTS.plaza.x, PZ = CALLIS_SPOTS.plaza.z;
main.push([PX - 30, PZ - 26, PX + 30, PZ + 26]); claim(PX - 32, PZ - 28, PX + 32, PZ + 28);
const TW = CALLIS_TOWERS;
for (const [x, z, s] of [[PX + TW.evening.dx, PZ + TW.evening.dz, 11], [PX + TW.morning.dx, PZ + TW.morning.dz, 11], [PX - 46, PZ + 34, 9], [PX + 40, PZ + 32, 9], [PX + TW.old.dx, PZ + TW.old.dz, 13]]) claim(x - s, z - s, x + s, z + s);
const MX = CALLIS_SPOTS.market.x, MZ = CALLIS_SPOTS.market.z;
main.push([MX - 26, MZ - 20, MX + 26, MZ + 20]); claim(MX - 28, MZ - 22, MX + 28, MZ + 22);
claim(MX + 28, MZ - 12, MX + 45, MZ + 12);
const TX = CALLIS_SPOTS.temple.x, TZ = CALLIS_SPOTS.temple.z;
claim(TX - 24, TZ - 20, TX + 24, TZ + 28);
main.push([QX - 9, cz - 150, QX, cz + 170]); claim(QX - 9, cz - 152, QX + 60, cz + 172);
for (let x = cx - 186; x < QX - 34; x += 22) {
  if ([cx - 20, cx - 120, cx + 70].some((m) => Math.abs(x - m) < 12)) continue;
  for (let z = cz - 182; z < cz + 182; z += 6) if (isFree(x, z, x + 3, z + 5) && Math.abs(z - RZ) > 12) { lanes.push([x, z, x + 3, z + 5]); claim(x, z, x + 3, z + 5); }
}
for (let z = cz - 176; z < cz + 182; z += 20) {
  if ([cz - 57, cz + 69, cz - 127, cz + 135].some((m) => Math.abs(z - m) < 10) || Math.abs(z - RZ) < 20) continue;
  for (let x = cx - 200; x < QX - 18; x += 6) if (isFree(x, z, x + 5, z + 3)) { lanes.push([x, z, x + 5, z + 3]); claim(x, z, x + 5, z + 3); }
}
const inR = (r: number[], x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const W = R.W, H = R.H;
const idx = (x: number, z: number) => (z - R.z0) * W + (x - R.x0);
// per-cell: 0 free paved, 1 lane, 2 main street, 3 blocked
const st = new Uint8Array(W * H);
const why = new Map<number, string>();
for (let z = R.z0; z <= R.z1; z++) for (let x = R.x0; x <= R.x1; x++) {
  const c = R.cells[idx(x, z)];
  const blk = c.col.filter(([y, id]: number[]) => y >= 22 && y <= 44 && id !== 0);
  const surf = c.col.find(([y]: number[]) => y === 21);
  const otherRect = c.rects.filter((s: string) => s !== 'callis');
  if (blk.length) { st[idx(x, z)] = 3; why.set(idx(x, z), 'block ' + blk.map(([y, id]: number[]) => y + ':' + D.blockNames[id]).slice(0, 3).join(' ')); }
  else if (otherRect.length) { st[idx(x, z)] = 3; why.set(idx(x, z), 'rect ' + otherRect.join(',')); }
  else if (!surf || D.blockNames[surf[1]] === 'Water' || Math.floor(c.h) < 21) { st[idx(x, z)] = 3; why.set(idx(x, z), 'no floor h=' + c.h.toFixed(1) + ' surf=' + (surf ? D.blockNames[surf[1]] : '-')); }
  else if (main.some((r) => inR(r, x, z))) st[idx(x, z)] = 2;
  else if (lanes.some((r) => inR(r, x, z))) st[idx(x, z)] = 1;
}
for (const p of R.props) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
  const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
  if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) continue;
  if (dx === 0 && dz === 0 || p.t !== 'roof') { if (st[idx(x, z)] !== 3) why.set(idx(x, z), 'prop ' + p.t + ' ' + p.site); st[idx(x, z)] = 3; }
}
const npcs = NPCS.flatMap((n) => n.schedule.map((s) => ({ id: n.id, x: s.at[0], z: s.at[1] }))).filter((n) => n.x >= R.x0 && n.x <= R.x1 && n.z >= R.z0 && n.z <= R.z1);
for (const n of npcs) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
  const x = Math.floor(n.x) + dx, z = Math.floor(n.z) + dz;
  if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) continue;
  st[idx(x, z)] = 3; why.set(idx(x, z), 'npc ' + n.id);
}
const at = (x: number, z: number) => (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1 ? 3 : st[idx(x, z)]);
if (mode === 'check') {
  const [x0, z0, x1, z1] = a.map(Number);
  const tally: Record<string, number> = {};
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const s = at(x, z);
    const k = s === 3 ? why.get(idx(x, z)) ?? 'out' : ['free', 'lane', 'MAIN'][s];
    tally[k] = (tally[k] ?? 0) + 1;
    if (s) console.log(x, z, k);
  }
  console.log(tally);
  const nn = npcs.filter((n) => n.x >= x0 - 6 && n.x <= x1 + 6 && n.z >= z0 - 6 && n.z <= z1 + 6);
  console.log('npcs within 6:', nn);
  console.log('main streets touching ±3:', main.filter((r) => r[0] <= x1 + 3 && r[2] >= x0 - 3 && r[1] <= z1 + 3 && r[3] >= z0 - 3));
  console.log('lanes touching ±2:', lanes.filter((r) => r[0] <= x1 + 2 && r[2] >= x0 - 2 && r[1] <= z1 + 2 && r[3] >= z0 - 2));
} else {
  // find w x d plots (both orientations) entirely free (no lanes either), with a 1-cell ring not blocked, a main street within 3 of one side
  const [w0, d0] = a.map(Number);
  const out: string[] = [];
  for (const [w, d] of [[w0, d0], [d0, w0]]) for (let z = R.z0 + 2; z + d < R.z1 - 2; z++) for (let x = R.x0 + 2; x + w < R.x1 - 2; x++) {
    let ok = true;
    for (let zz = z - 1; zz <= z + d && ok; zz++) for (let xx = x - 1; xx <= x + w; xx++) { const s = at(xx, zz); const inner = xx >= x && xx < x + w && zz >= z && zz < z + d; if (s === 3 || (inner && s !== 0)) { ok = false; break; } }
    if (!ok) continue;
    const sides: string[] = [];
    const near = (pts: [number, number][]) => [1, 2, 3, 4].find((k) => pts.some(([px, pz]) => main.some((r) => inR(r, px, pz)) && true) ? k : 0);
    for (const k of [1, 2, 3, 4]) {
      if (!sides.some((s) => s[0] === 'n') && main.some((r) => inR(r, x + (w >> 1), z - k))) sides.push('n' + k);
      if (!sides.some((s) => s[0] === 's') && main.some((r) => inR(r, x + (w >> 1), z + d - 1 + k))) sides.push('s' + k);
      if (!sides.some((s) => s[0] === 'w') && main.some((r) => inR(r, x - k, z + (d >> 1)))) sides.push('w' + k);
      if (!sides.some((s) => s[0] === 'e') && main.some((r) => inR(r, x + w - 1 + k, z + (d >> 1)))) sides.push('e' + k);
    }
    void near;
    if (sides.length) out.push(`${x} ${z} w${w} d${d} street:${sides.join(',')}`);
  }
  console.log(out.length, 'plots');
  // collapse: print first plot of each 8x8 bucket
  const seen = new Set<string>();
  for (const o of out) { const [x, z] = o.split(' ').map(Number); const k = Math.floor(x / 10) + ',' + Math.floor(z / 10) + o.split(' ')[2]; if (seen.has(k)) continue; seen.add(k); console.log(o); }
}
