// Every Charter Post ride: how many times the cart doubles back (a turn sharper than 120 degrees) on its way.
import { roadNet } from '../src/world/roadNet';
import { POSTS } from '../src/data/travel';
const net = roadNet();
let rides = 0, bad = 0, total = 0;
const worst: string[] = [];
for (const a of POSTS) for (const b of POSTS) {
  if (a === b || (a.land ?? 'counties') !== (b.land ?? 'counties')) continue;
  const w = net.route([a.x, a.z], [b.x, b.z]);
  if (!w) continue;
  rides++;
  let n = 0;
  for (let i = 1; i + 1 < w.length; i++) {
    const ax = w[i][0] - w[i - 1][0], az = w[i][1] - w[i - 1][1], bx = w[i + 1][0] - w[i][0], bz = w[i + 1][1] - w[i][1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 0.01 || lb < 0.01) continue;
    const cos = (ax * bx + az * bz) / (la * lb);
    if (cos < -0.5) n++;
  }
  total += n;
  if (n) { bad++; worst.push(`${a.id} -> ${b.id}: ${n} reversal(s)`); }
}
console.log(worst.slice(0, 25).join('\n'));
console.log(`${rides} rides, ${bad} with reversals, ${total} reversals in all`);
