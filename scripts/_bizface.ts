import { roadDist, baseHeight } from '../src/world/terrain';
const spots: [string, number, number][] = [['vineyard', 680, 673], ['vineyard2', 1340, 427], ['brewery', 742, 790], ['dairy', 1028, 289], ['glass', 1240, 944], ['meadery', 261, 695], ['smokehouse', 1630, 681], ['tannery', 1184, 358], ['distillery', 878, 1799]];
for (const [id, x, z] of spots) {
  const d = ([['s', 0, 1], ['n', 0, -1], ['e', 1, 0], ['w', -1, 0]] as const).map(([f, dx, dz]) => [f, roadDist(x + dx * 25, z + dz * 25)] as const).sort((a, b) => a[1] - b[1]);
  console.log(id, x, z, 'face', d[0][0], d.map((q) => q[0] + Math.round(q[1])).join(' '), 'h', Math.round(baseHeight(x, z)));
}
