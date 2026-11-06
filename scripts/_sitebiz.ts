// Find a spot for each business near its anchor: flat ground near (not on) a road, clear of every
// site already planned, of rivers and lakes. Prints the spots to fix in data/businesses.ts.
import { plan } from '../src/world/sites';
import { baseHeight, lakeDist, riverDist, roadDist, SEA, regionAt } from '../src/world/terrain';
const P = plan();
const anchors: [string, number, number][] = [
  ['vineyard', 620, 520], ['vineyard2', 1350, 420], ['brewery', 600, 700], ['dairy', 900, 120], ['cider', 950, 500],
  ['glass', 1150, 1100], ['meadery', 300, 560], ['smokehouse', 1720, 760], ['tannery', 1200, 300], ['distillery', 1000, 1760], ['pottery', 560, 920], ['pottery_b', 1300, 1250],
];
const taken: [number, number][] = [];
for (const [id, ax, az] of anchors) {
  let best: { x: number; z: number; score: number } | null = null;
  for (let r = 0; r <= 220; r += 4) for (let k = 0; k < Math.max(1, Math.round(r * 0.8)); k++) {
    const a = (k / Math.max(1, Math.round(r * 0.8))) * Math.PI * 2, x = Math.round(ax + Math.cos(a) * r), z = Math.round(az + Math.sin(a) * r);
    const h = baseHeight(x, z);
    if (h <= SEA + 2 || x < 360 && z < 360) continue;
    const rd = roadDist(x, z);
    if (rd < 14 || rd > 90 || riverDist(x, z) < 18 || lakeDist(x, z) < 12) continue;
    let flat = true;
    for (const [dx, dz] of [[14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [-10, -10], [10, -10], [-10, 10]]) if (Math.abs(baseHeight(x + dx, z + dz) - h) > 4) flat = false;
    if (!flat) continue;
    if (P.sites.some((s) => !s.id.startsWith('roadlamps') && Math.hypot(s.x - x, s.z - z) < (s.named ? 100 : 60))) continue;
    if (taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 130)) continue;
    const score = r + rd * 1.5;
    if (!best || score < best.score) best = { x, z, score };
  }
  if (best) { taken.push([best.x, best.z]); console.log(`${id}: [${best.x}, ${best.z}] h ${Math.round(baseHeight(best.x, best.z))} road ${roadDist(best.x, best.z).toFixed(0)} ${regionAt(best.x, best.z).a}`); }
  else console.log(`${id}: NONE near ${ax},${az}`);
}
