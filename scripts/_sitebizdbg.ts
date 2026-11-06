import { plan } from '../src/world/sites';
import { baseHeight, lakeDist, riverDist, roadDist, SEA } from '../src/world/terrain';
const P = plan();
const [ax, az] = [620, 520];
const c = { n: 0, low: 0, road: 0, water: 0, flat: 0, site: 0, ok: 0 };
for (let r = 0; r <= 120; r += 4) for (let k = 0; k < Math.max(1, Math.round(r * 0.8)); k++) {
  const a = (k / Math.max(1, Math.round(r * 0.8))) * Math.PI * 2, x = Math.round(ax + Math.cos(a) * r), z = Math.round(az + Math.sin(a) * r);
  c.n++;
  const h = baseHeight(x, z);
  if (h <= SEA + 2) { c.low++; continue; }
  const rd = roadDist(x, z);
  if (rd < 14 || rd > 50) { c.road++; continue; }
  if (riverDist(x, z) < 18 || lakeDist(x, z) < 12) { c.water++; continue; }
  let flat = true;
  for (const [dx, dz] of [[14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [-10, -10], [10, -10], [-10, 10]]) if (Math.abs(baseHeight(x + dx, z + dz) - h) > 2.5) flat = false;
  if (!flat) { c.flat++; continue; }
  if (P.sites.some((s) => Math.hypot(s.x - x, s.z - z) < (s.named ? 110 : 70))) { c.site++; continue; }
  c.ok++;
}
console.log(JSON.stringify(c), P.sites.length, P.sites.filter((s) => Math.hypot(s.x - 620, s.z - 520) < 200).map((s) => s.id + (s.named ? '*' : '')).join(' '));
