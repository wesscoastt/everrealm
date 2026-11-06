// Counting House survey: find clear, level rectangles (building BW x BD plus forecourt F on the street side).
// args: json region BW BD F x0 z0 x1 z1 maxSoft allowPavedBuilding(0/1)
import { readFileSync } from 'fs';
import { roadDist } from '../src/world/terrain';
const a = process.argv.slice(2);
const D = JSON.parse(readFileSync(a[0], 'utf8'));
const R = D.regions[a[1]], N = D.blockNames;
const BW = +a[2], BD = +a[3], F = +a[4];
const [qx0, qz0, qx1, qz1] = a.slice(5, 9).map(Number);
const maxSoft = +(a[9] ?? 0), pavedOK = a[10] === '1', tol = +(a[11] ?? 0);
const propCells = new Set<string>();
for (const p of R.props) {
  const rr = p.t === 'tree' ? 2 : p.t === 'crane' ? 3 : 0;
  for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) propCells.add(Math.floor(p.x + dx) + ',' + Math.floor(p.z + dz));
}
export const info = (x: number, z: number) => {
  const c = R.cells[(z - R.z0) * R.W + (x - R.x0)];
  const m = new Map<number, number>(c.col);
  const fh = Math.floor(c.h);
  // ground: top solid at or below fh (terrain solid up to fh-1, overrides win)
  let top = -1;
  for (let y = fh; y >= 0; y--) { const o = m.get(y); if (o !== undefined) { if (o !== 0) { top = y; break; } continue; } if (y <= fh - 1) { top = y; break; } }
  const level = top + 1;
  const above = c.col.filter(([y, id]: number[]) => y >= level && y <= level + 16 && id !== 0);
  const surfId = m.get(top);
  return { level, above, surf: surfId !== undefined ? N[surfId] : 'terrain', h: c.h };
};
// cls: 0 free ground, 1 soft (lane/gravel/garden/farmland), 2 paving, 9 hard
const memo = new Map<number, [number, number]>();
const cls = (x: number, z: number): [number, number] => {
  if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) return [9, 0];
  const key = (x - R.x0) + (z - R.z0) * R.W;
  const hit = memo.get(key); if (hit) return hit;
  const i = info(x, z);
  let k = 0;
  if (i.above.length || propCells.has(x + ',' + z) || i.level <= 16 || /Water/.test(i.surf)) k = 9;
  else if (roadDist(x, z) < 3) k = 2;
  else if (i.surf === 'terrain') k = 0;
  else if (/Path|Gravel|Dirt|Farmland|Loam/.test(i.surf)) k = 1;
  else if (/Grass/.test(i.surf)) k = 0;
  else k = 2;
  const r: [number, number] = [k, i.level];
  memo.set(key, r);
  return r;
};
type Hit = { x0: number; z0: number; w: number; d: number; face: string; y: number; soft: number; paved: number; front: number };
const hits: Hit[] = [];
for (const face of ['n', 's', 'e', 'w']) {
  const w = face === 'n' || face === 's' ? BW : BD + F, d = face === 'n' || face === 's' ? BD + F : BW;
  for (let z0 = qz0; z0 + d - 1 <= qz1; z0++) for (let x0 = qx0; x0 + w - 1 <= qx1; x0++) {
    let soft = 0, paved = 0, bad = false;
    const lv = cls(x0, z0)[1];
    for (let z = z0; z < z0 + d && !bad; z++) for (let x = x0; x < x0 + w; x++) {
      const [k, l] = cls(x, z);
      if (k === 9 || Math.abs(l - lv) > tol) { bad = true; break; }
      const inFore = face === 'n' ? z < z0 + F : face === 's' ? z >= z0 + d - F : face === 'w' ? x < x0 + F : x >= x0 + w - F;
      if (k === 2) { if (!inFore && !pavedOK) { bad = true; break; } paved++; }
      if (k === 1) soft++;
    }
    if (bad || soft > maxSoft) continue;
    let front = 0;
    const fc = (x: number, z: number) => { const [k, l] = cls(x, z); return k === 2 && Math.abs(l - lv) <= 1 ? 1 : 0; };
    if (face === 'n') for (let x = x0; x < x0 + w; x++) front += fc(x, z0 - 1);
    if (face === 's') for (let x = x0; x < x0 + w; x++) front += fc(x, z0 + d);
    if (face === 'w') for (let z = z0; z < z0 + d; z++) front += fc(x0 - 1, z);
    if (face === 'e') for (let z = z0; z < z0 + d; z++) front += fc(x0 + w, z);
    if (front < Math.max(w, d) * 0.5) continue;
    hits.push({ x0, z0, w, d, face, y: lv, soft, paved, front });
  }
}
hits.sort((p, q) => p.soft - q.soft || q.front - p.front || p.paved - q.paved);
const keep: Hit[] = [];
for (const h of hits) if (!keep.some((k) => h.x0 < k.x0 + k.w + 4 && h.x0 + h.w + 4 > k.x0 && h.z0 < k.z0 + k.d + 4 && h.z0 + h.d + 4 > k.z0)) keep.push(h);
console.log('hits', hits.length);
for (const k of keep.slice(0, 30)) {
  const ov = R.sites.filter((s: any) => s.rects.some((r: number[]) => r[0] < k.x0 + k.w && r[2] > k.x0 && r[1] < k.z0 + k.d && r[3] > k.z0 && (r[2] - r[0]) * (r[3] - r[1]) <= 20000)).map((s: any) => s.id);
  console.log(JSON.stringify(k), 'rects:', ov.join(',') || '-');
}
