import { plan, inRects } from '../src/world/sites';
import { heightAt, roadDist, riverDist, lakeDist, landDist, SEA } from '../src/world/terrain';
import { POSTS } from '../src/data/travel';
const P = plan();
const rects: [number, number, number, number][] = [];
for (const a of P.rectsByChunk.values()) rects.push(...a);
const W = 15, D = 13;
for (const id of ['gullmouth', 'harrowgate', 'callis', 'northgate', 'aldermere']) {
  const t = POSTS.find((p) => p.id === id)!;
  const why: Record<string, number> = {};
  let good = 0;
  for (let r = 50; r <= 320; r += 12) for (let a = 0; a < 6.28; a += 0.15) {
    const x0 = Math.round(t.x + Math.cos(a) * r - W / 2), z0 = Math.round(t.z + Math.sin(a) * r - D / 2);
    let lo = 1e9, hi = -1e9, bad = '';
    for (let x = x0; x <= x0 + W && !bad; x += 3) for (let z = z0; z <= z0 + D; z += 3) { const h = heightAt(x, z); if (h <= SEA + 1) { bad = 'sea'; break; } lo = Math.min(lo, h); hi = Math.max(hi, h); }
    if (!bad && hi - lo > 5) bad = 'slope';
    if (!bad && inRects(rects, x0 + W / 2, z0 + D / 2, W / 2 + 3)) bad = 'site';
    if (!bad && roadDist(x0 + W / 2, z0 + D / 2) < 10) bad = 'road';
    if (!bad && (riverDist(x0 + W / 2, z0 + D / 2) < 10 || lakeDist(x0 + W / 2, z0 + D / 2) < 10)) bad = 'water';
    if (!bad && roadDist(x0 + W / 2, z0 + D / 2) > 40) bad = 'farFromRoad';
    if (bad) why[bad] = (why[bad] ?? 0) + 1; else good++;
  }
  console.log(id, 'good', good, JSON.stringify(why));
}
