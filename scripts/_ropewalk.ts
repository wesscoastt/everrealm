// Debug: a long level strip near Gullmouth, clear of every site, road and stream, for the ropewalk.
import { plan, inRects } from '../src/world/sites';
import { heightAt, roadDist, riverDist, landDist, SEA, coastX } from '../src/world/terrain';
const P = plan();
const rects: [number, number, number, number][] = [];
for (const a of P.rectsByChunk.values()) rects.push(...a);
const W = 7, cx = Math.floor(coastX(600)) - 80, cz = 600;
const out: [number, number, number, number, string, number][] = [];
for (const L of [80, 70, 60]) for (const alongX of [true, false]) {
  for (let x0 = cx - 260; x0 <= cx + 60; x0 += 3) for (let z0 = cz - 220; z0 <= cz + 220; z0 += 3) {
    const w = alongX ? L : W, d = alongX ? W : L;
    let lo = 1e9, hi = -1e9, bad = false;
    for (let x = x0; x < x0 + w && !bad; x += 2) for (let z = z0; z < z0 + d; z += 2) {
      const h = heightAt(x, z);
      if (h <= SEA + 2 || landDist(x, z) < 6) { bad = true; break; }
      lo = Math.min(lo, h); hi = Math.max(hi, h);
      if (hi - lo > 3) { bad = true; break; }
    }
    if (bad) continue;
    for (let x = x0 - 2; x <= x0 + w + 2 && !bad; x += 3) for (let z = z0 - 2; z <= z0 + d + 2; z += 3) if (inRects(rects, x, z) || roadDist(x, z) < 3 || riverDist(x, z) < 5) { bad = true; break; }
    if (bad) continue;
    const dist = Math.hypot(x0 + w / 2 - (cx + 60), z0 + d / 2 - cz);
    out.push([x0, z0, L, Math.round((lo + hi) / 2), alongX ? 'x' : 'z', Math.round(dist)]);
  }
  if (out.length) break;
}
out.sort((a, b) => a[5] - b[5]);
console.log(out.slice(0, 8).map((o) => JSON.stringify(o)).join('\n'));

// The pottery: a 24 x 18 yard near Harrowgate Works, its gate toward the nearest road
{
  const tx = 1006.5, tz = 1027.5, found: [number, number, string, number, number][] = [];
  for (let r = 40; r <= 260 && found.length < 6; r += 6) for (let a = 0; a < Math.PI * 2; a += 6 / r) {
    const x0 = Math.round(tx + Math.cos(a) * r - 12), z0 = Math.round(tz + Math.sin(a) * r - 9);
    let lo = 1e9, hi = -1e9, bad = false;
    for (let x = x0; x < x0 + 24 && !bad; x += 2) for (let z = z0; z < z0 + 18; z += 2) { const h = heightAt(x, z); if (h <= SEA + 2) { bad = true; break; } lo = Math.min(lo, h); hi = Math.max(hi, h); if (hi - lo > 3) { bad = true; break; } }
    if (bad) continue;
    for (let x = x0 - 2; x <= x0 + 26 && !bad; x += 3) for (let z = z0 - 2; z <= z0 + 20; z += 3) if (inRects(rects, x, z) || roadDist(x, z) < 3 || riverDist(x, z) < 5) { bad = true; break; }
    if (bad) continue;
    const rd = roadDist(x0 + 12, z0 + 9);
    if (rd > 30) continue;
    found.push([x0, z0, 'r' + r, Math.round((lo + hi) / 2), Math.round(rd)]);
  }
  console.log('pottery:', found.map((f) => JSON.stringify(f)).join(' '));
}
