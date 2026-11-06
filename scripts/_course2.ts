import { landDist } from '../src/world/terrain';
import { CALLIS_PACKET } from '../src/world/morrow';
const C = [[2028,1380],[2364,1932],[5388,3684],[5724,3804],[6228,3756],[8652,2988],[8916,2220],[9000,1300]];
const cb = CALLIS_PACKET.x + 12;
for (const pts of [[[1822 + 220, 590.5], ...C, [cb + 126, CALLIS_PACKET.z]], [[cb + 220, CALLIS_PACKET.z], ...[...C].reverse(), [1822 + 126, 590.5]]]) {
  let worst = -1e9, at = '';
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L; d += 4) { const x = a[0] + ((b[0] - a[0]) * d) / L, z = a[1] + ((b[1] - a[1]) * d) / L, v = landDist(x, z); if (v > worst) { worst = v; at = `${Math.round(x)},${Math.round(z)} leg ${i}`; } } }
  console.log('closest to land', worst.toFixed(1), 'at', at);
}
