import { landDist, baseHeight, SEA, SICKLE, SICKLE_R, sickleDist } from '../src/world/terrain';
const at = (a: number, r: number): [number, number] => [SICKLE.x + Math.sin(a) * r, SICKLE.z + Math.cos(a) * r];
// Hookness: walk outward from the bay at angles across the east horn; the first ground, then inland a way
for (const a of [1.15, 1.25, 1.35, 1.5]) {
  for (let r = 120; r < SICKLE_R; r += 2) {
    const [x, z] = at(a, r);
    if (sickleDist(x, z) > 2) {
      const [tx, tz] = at(a, r + 26), h = baseHeight(tx, tz);
      let lo = 1e9, hi = -1e9; for (let dx = -20; dx <= 20; dx += 4) for (let dz = -20; dz <= 20; dz += 4) { const q = baseHeight(tx + dx, tz + dz); lo = Math.min(lo, q); hi = Math.max(hi, q); }
      console.log('hook a', a, 'shore', x.toFixed(0), z.toFixed(0), 'town', tx.toFixed(0), tz.toFixed(0), 'h', h.toFixed(1), 'range', lo.toFixed(0), hi.toFixed(0));
      break;
    }
  }
}
// The west horn's tip: the last land going round toward the mouth
for (let a = -1.3; a < -0.8; a += 0.02) { const [x, z] = at(a, SICKLE_R); if (sickleDist(x, z) < 0) { const [px, pz] = at(a - 0.03, SICKLE_R); console.log('tip a', a.toFixed(2), 'sea', x.toFixed(0), z.toFixed(0), 'land just before', px.toFixed(0), pz.toFixed(0), baseHeight(px, pz).toFixed(1)); break; } }
for (const [name, a, r] of [['barrows', Math.PI, SICKLE_R], ['wells', -2.3, SICKLE_R - 30], ['glimmer', 2.3, SICKLE_R + 60]] as const) { const [x, z] = at(a, r); console.log(name, x.toFixed(0), z.toFixed(0), 'h', baseHeight(x, z).toFixed(1), 'land', landDist(x, z).toFixed(0)); }
