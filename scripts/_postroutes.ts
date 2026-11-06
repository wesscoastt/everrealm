// Every post stop to every other along the road network: length and minutes, or none.
import { POSTS } from '../src/data/travel';
import { roadNet, wayLength, rideMinutes } from '../src/world/roadNet';
const net = roadNet();
const from = process.argv[2];
for (const a of POSTS) {
  if (from && a.id !== from) continue;
  const row: string[] = [];
  for (const b of POSTS) {
    if (a === b) continue;
    const w = net.route([a.x, a.z], [b.x, b.z]);
    row.push(`${b.id}:${w ? Math.round(wayLength(w)) + '/' + rideMinutes(wayLength(w)) + 'm' : '-'}`);
  }
  console.log(a.id.padEnd(12), row.join(' '));
}
