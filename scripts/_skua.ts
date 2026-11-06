import { coastX, heightAt, outerLandDist, regionAt, SEA } from '../src/world/terrain';
import { POSTS } from '../src/data/travel';
console.log('coastX(470)', coastX(470).toFixed(0), 'coastX(600)', coastX(600).toFixed(0));
for (const [x, z] of [[2000, 470], [2060, 470], [2080, 520], [2120, 450], [2040, 560]]) console.log(x, z, 'h', heightAt(x, z), 'outer', outerLandDist(x, z).toFixed(0), 'reg', regionAt(x, z).a);
const g = POSTS.find((p) => p.id === 'gullmouth')!;
console.log('gull post', g.x, g.z);
for (const p of POSTS.filter((q) => q.ferryFrom === 'gullmouth')) {
  // distance from (2060,470) to the straight line gull->stop
  const ax = g.x, az = g.z, bx = p.x, bz = p.z, px = 2060, pz = 470;
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
  console.log(p.id, 'lane dist', Math.hypot(ax + t * (bx - ax) - px, az + t * (bz - az) - pz).toFixed(0));
}
