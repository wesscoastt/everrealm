// Counting House survey: least-displacement rectangles (counts what's in the way instead of rejecting).
// args: json region BW BD F x0 z0 x1 z1
import { readFileSync } from 'fs';
import { roadDist } from '../src/world/terrain';
const a = process.argv.slice(2);
const D = JSON.parse(readFileSync(a[0], 'utf8'));
const R = D.regions[a[1]], N = D.blockNames;
const BW = +a[2], BD = +a[3], F = +a[4];
const [qx0, qz0, qx1, qz1] = a.slice(5, 9).map(Number);
const propAt = new Map<string, any[]>();
for (const p of R.props) { const k = Math.floor(p.x) + ',' + Math.floor(p.z); (propAt.get(k) ?? propAt.set(k, []).get(k)!).push(p); }
const cache = new Map<number, [number, number]>();
// [kind, level]: 0 free, 1 soft, 2 paved, 3 built/prop (displaced), 9 impossible (water, off map)
const cls = (x: number, z: number): [number, number] => {
  if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) return [9, 0];
  const key = (x - R.x0) + (z - R.z0) * R.W; const h0 = cache.get(key); if (h0) return h0;
  const c = R.cells[key]; const m = new Map<number, number>(c.col); const fh = Math.floor(c.h);
  let top = -1;
  for (let y = fh; y >= 0; y--) { const o = m.get(y); if (o !== undefined) { if (o !== 0) { top = y; break; } continue; } if (y <= fh - 1) { top = y; break; } }
  const level = top + 1, surf = m.has(top) ? N[m.get(top)!] : 'terrain';
  const above = c.col.some(([y, id]: number[]) => y >= level && y <= level + 16 && id !== 0);
  let k = 0;
  if (level <= 16 || /Water/.test(surf)) k = 9;
  else if (above || propAt.has(x + ',' + z)) k = 3;
  else if (roadDist(x, z) < 3) k = 2;
  else if (surf === 'terrain' || /Grass/.test(surf)) k = 0;
  else if (/Path|Gravel|Dirt|Farmland|Loam/.test(surf)) k = 1;
  else k = 2;
  const r: [number, number] = [k, level]; cache.set(key, r); return r;
};
const hits: any[] = [];
for (const face of ['n', 's', 'e', 'w']) {
  const w = face === 'n' || face === 's' ? BW : BD + F, d = face === 'n' || face === 's' ? BD + F : BW;
  for (let z0 = qz0; z0 + d - 1 <= qz1; z0++) for (let x0 = qx0; x0 + w - 1 <= qx1; x0++) {
    let built = 0, soft = 0, paved = 0, bad = false; const lv = cls(x0, z0)[1];
    for (let z = z0; z < z0 + d && !bad; z++) for (let x = x0; x < x0 + w; x++) {
      const [k, l] = cls(x, z);
      if (k === 9 || Math.abs(l - lv) > 0 && k !== 3) { bad = true; break; }
      const inFore = face === 'n' ? z < z0 + F : face === 's' ? z >= z0 + d - F : face === 'w' ? x < x0 + F : x >= x0 + w - F;
      if (k === 3) built++; else if (k === 1) soft++; else if (k === 2) { if (!inFore) { if (roadDist(x, z) < 3) { bad = true; break; } built++; } else paved++; }
    }
    if (bad) continue;
    let front = 0;
    const fc = (x: number, z: number) => { const [k, l] = cls(x, z); return k === 2 && Math.abs(l - lv) <= 1 ? 1 : 0; };
    if (face === 'n') for (let x = x0; x < x0 + w; x++) front += fc(x, z0 - 1);
    if (face === 's') for (let x = x0; x < x0 + w; x++) front += fc(x, z0 + d);
    if (face === 'w') for (let z = z0; z < z0 + d; z++) front += fc(x0 - 1, z);
    if (face === 'e') for (let z = z0; z < z0 + d; z++) front += fc(x0 + w, z);
    if (front < 18) continue;
    hits.push({ x0, z0, w, d, face, y: lv, built, soft, paved, front, cost: built * 3 + soft });
  }
}
hits.sort((p, q) => p.cost - q.cost || q.front - p.front);
const keep: any[] = [];
for (const h of hits) if (!keep.some((k) => h.x0 < k.x0 + k.w && h.x0 + h.w > k.x0 && h.z0 < k.z0 + k.d && h.z0 + h.d > k.z0)) keep.push(h);
for (const k of keep.slice(0, 15)) {
  const ov = R.sites.filter((s: any) => s.rects.some((r: number[]) => r[0] < k.x0 + k.w && r[2] > k.x0 && r[1] < k.z0 + k.d && r[3] > k.z0 && (r[2] - r[0]) * (r[3] - r[1]) <= 20000)).map((s: any) => s.id);
  const props = R.props.filter((p: any) => p.x >= k.x0 && p.x < k.x0 + k.w && p.z >= k.z0 && p.z < k.z0 + k.d);
  const kinds: Record<string, number> = {}; for (const p of props) kinds[p.t + (p.role ? ':' + p.role : '')] = (kinds[p.t + (p.role ? ':' + p.role : '')] ?? 0) + 1;
  console.log(JSON.stringify(k), 'rects:', ov.join(',') || '-', 'props:', JSON.stringify(kinds));
}
