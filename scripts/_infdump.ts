// Counting House survey: dump per-cell occupancy for Ansbury and Gullmouth to a JSON file (read-only).
import { writeFileSync } from 'fs';
import { plan } from '../src/world/sites';
import { heightAt, riverDist, lakeDist, coastX, roadDist } from '../src/world/terrain';
import { keyChunk, CHUNK } from '../src/world/VoxelWorld';
import { B } from '../src/world/blocks';
const t0 = Date.now();
const P = plan() as any;
console.log('plan in', Date.now() - t0, 'ms; sites', P.sites.length);
const C = coastX(600);
console.log('gull coast', C);
const regions: Record<string, [number, number, number, number]> = {
  harrow: [960, 960, 1040, 1040],
  gullt: [1660, 620, 1800, 700],
};
const out: any = { C, regions: {} };
// decode overrides into column maps for the regions
const cols = new Map<number, Map<number, number>>(); // cellKey -> y -> id
const ck = (x: number, z: number) => (x + 10000) * 20000 + (z + 10000);
const inAny = (x: number, z: number) => Object.values(regions).some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);
for (const [k, arr] of P.overrides.map as Map<number, number[]>) {
  const [cx, cz] = keyChunk(k);
  const bx = cx * CHUNK, bz = cz * CHUNK;
  if (!Object.values(regions).some(([a, b, c, d]) => bx + 32 > a && bx <= c && bz + 32 > b && bz <= d)) continue;
  for (let i = 0; i < arr.length; i += 2) {
    const li = arr[i], id = arr[i + 1];
    const lx = li % 32, lz = Math.floor(li / 32) % 32, y = Math.floor(li / 1024);
    const x = bx + lx, z = bz + lz;
    if (!inAny(x, z)) continue;
    let m = cols.get(ck(x, z));
    if (!m) cols.set(ck(x, z), (m = new Map()));
    m.set(y, id);
  }
}
for (const [name, [x0, z0, x1, z1]] of Object.entries(regions)) {
  const W = x1 - x0 + 1, H = z1 - z0 + 1;
  const cells: any[] = new Array(W * H);
  const rectSites = P.sites.filter((s: any) => s.rects.some((r: number[]) => r[0] <= x1 && r[2] >= x0 && r[1] <= z1 && r[3] >= z0));
  const propsNear: any[] = [];
  for (const s of P.sites) for (const p of s.props) if (p.x >= x0 - 2 && p.x <= x1 + 2 && p.z >= z0 - 2 && p.z <= z1 + 2) propsNear.push({ site: s.id, t: p.t, x: p.x, y: p.y, z: p.z, item: p.item, text: p.text, role: p.role, len: p.len, span: p.span, ry: p.ry });
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const m = cols.get(ck(x, z));
    const col: [number, number][] = m ? [...m.entries()].sort((a, b) => a[0] - b[0]) : [];
    const rects = rectSites.filter((s: any) => s.rects.some((r: number[]) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3])).map((s: any) => s.id);
    cells[(z - z0) * W + (x - x0)] = { h: heightAt(x, z), col, rects };
  }
  out.regions[name] = { x0, z0, x1, z1, W, H, cells, props: propsNear, sites: rectSites.map((s: any) => ({ id: s.id, name: s.name, x: s.x, z: s.z, rects: s.rects.filter((r: number[]) => r[0] <= x1 && r[2] >= x0 && r[1] <= z1 && r[3] >= z0) })) };
  // river/lake summary
  let minR = Infinity, minL = Infinity, minRd = Infinity;
  for (let z = z0; z <= z1; z += 4) for (let x = x0; x <= x1; x += 4) { minR = Math.min(minR, riverDist(x, z)); minL = Math.min(minL, lakeDist(x, z)); }
  console.log(name, 'min riverDist', minR.toFixed(1), 'min lakeDist', minL.toFixed(1), 'props', propsNear.length, 'rectSites', rectSites.map((s: any) => s.id).join(','));
}
out.blockNames = Object.fromEntries(Object.entries(B).filter(([k, v]) => typeof v === 'number').map(([k, v]) => [v, k]));
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('done', Date.now() - t0, 'ms');
