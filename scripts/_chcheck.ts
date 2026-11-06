// Counting House survey: what lies inside a given rectangle. args: json region x0 z0 w d [x0 z0 w d ...]
import { readFileSync } from 'fs';
import { roadDist } from '../src/world/terrain';
const a = process.argv.slice(2);
const D = JSON.parse(readFileSync(a[0], 'utf8'));
const R = D.regions[a[1]], N = D.blockNames;
const roofs = R.props.filter((p: any) => p.t === 'roof' && p.len >= 5).map((p: any) => { const al = !p.ry, w = al ? p.len : p.span, d = al ? p.span : p.len; return { x0: Math.round(p.x - w / 2), z0: Math.round(p.z - d / 2), w, d, site: p.site }; });
for (let i = 2; i + 3 < a.length; i += 4) {
  const [x0, z0, w, d] = a.slice(i, i + 4).map(Number);
  const levels: Record<number, number> = {}, surfs: Record<string, number> = {}, vox: Record<string, number> = {};
  let road = 0, water = 0;
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
    const c = R.cells[(z - R.z0) * R.W + (x - R.x0)]; const m = new Map<number, number>(c.col); const fh = Math.floor(c.h);
    let top = -1;
    for (let y = fh; y >= 0; y--) { const o = m.get(y); if (o !== undefined) { if (o !== 0) { top = y; break; } continue; } if (y <= fh - 1) { top = y; break; } }
    const lv = top + 1; levels[lv] = (levels[lv] ?? 0) + 1;
    const s = m.has(top) ? N[m.get(top)!] : 'terrain'; surfs[s] = (surfs[s] ?? 0) + 1;
    if (lv <= 16 || /Water/.test(s)) water++;
    for (const [y, id] of c.col) if (y >= lv && y <= lv + 16 && id !== 0) { vox[N[id]] = (vox[N[id]] ?? 0) + 1; }
    if (roadDist(x, z) < 1.5) road++;
  }
  const props = R.props.filter((p: any) => p.x >= x0 && p.x < x0 + w && p.z >= z0 && p.z < z0 + d);
  const pk: Record<string, number> = {}; for (const p of props) { const k = p.site + ':' + p.t + (p.text ? '(' + p.text + ')' : '') + (p.item ? '(' + p.item + ')' : ''); pk[k] = (pk[k] ?? 0) + 1; }
  const hs = roofs.filter((h: any) => h.x0 < x0 + w && h.x0 + h.w > x0 && h.z0 < z0 + d && h.z0 + h.d > z0).map((h: any) => `${h.site} ${h.x0},${h.z0} ${h.w}x${h.d}${h.x0 >= x0 && h.z0 >= z0 && h.x0 + h.w <= x0 + w && h.z0 + h.d <= z0 + d ? '' : ' PARTIAL'}`);
  const rects = R.sites.flatMap((s: any) => s.rects.filter((r: number[]) => r[0] < x0 + w && r[2] > x0 && r[1] < z0 + d && r[3] > z0).map((r: number[]) => s.id + JSON.stringify(r)));
  console.log(`== rect x ${x0}..${x0 + w - 1} z ${z0}..${z0 + d - 1}`);
  console.log(' levels', JSON.stringify(levels), 'road cells', road, 'water', water);
  console.log(' surface', JSON.stringify(surfs));
  console.log(' voxels above', JSON.stringify(vox));
  console.log(' houses', hs.join(' | ') || '-');
  console.log(' props', JSON.stringify(pk));
  console.log(' rects', rects.join(' '));
}
