import { landDist, baseHeight, regionAt } from '../src/world/terrain';
import { GLASSMOTHER_BED } from '../src/data/activities';
const { x, z } = GLASSMOTHER_BED;
console.log('bed', x, z, 'land', landDist(x, z).toFixed(0), 'h', baseHeight(x, z).toFixed(1), 'region', regionAt(x, z).a);
for (const [dx, dz] of [[-25, 0], [25, 0], [0, -25], [0, 25]]) console.log(' ', dx, dz, regionAt(x + dx, z + dz).a, baseHeight(x + dx, z + dz).toFixed(1), landDist(x + dx, z + dz).toFixed(0));
