// Which region each of Morrow's towns and landmarks falls in, and its ground (local coordinates).
import * as L from '../src/world/morrowLocal';
const pts: [string, number, number][] = [
  ['callis', L.CALLIS.x, L.CALLIS.z], ['cala', L.TOWNS.cala.x, L.TOWNS.cala.z], ['reedwater', L.TOWNS.reedwater.x, L.TOWNS.reedwater.z],
  ['branchley', L.TOWNS.branchley.x, L.TOWNS.branchley.z], ['liftwick', L.TOWNS.liftwick.x, L.TOWNS.liftwick.z], ['tenwells', L.TOWNS.tenwells.x, L.TOWNS.tenwells.z],
  ['fellside', L.TOWNS.fellside.x, L.TOWNS.fellside.z], ['conch', L.TOWNS.conch.x, L.TOWNS.conch.z], ['northgate', L.NORTHGATE_TOWN.x, L.NORTHGATE_TOWN.z],
  ['ng-wall-n', 520, -1400], ['kingsbarrow', L.KINGSBARROW.x, L.KINGSBARROW.z], ['coldharbour', L.COLD_HARBOUR.x, L.COLD_HARBOUR.z], ['hollowfell', L.HOLLOW_FELL.x, L.HOLLOW_FELL.z],
  ['saltpenny', L.SALTPENNY.x, L.SALTPENNY.z], ['slab', 1470, 326], ['rift-mid', 900, 430], ['saltpan', 1400, -260], ['heronmere', 300, 2560], ['causeway', 1000, 2640],
];
for (const [n, x, z] of pts) console.log(n.padEnd(12), L.morrowRegionId(x, z).padEnd(11), 'land', Math.round(L.morrowLandDist(x, z)), 'h', Math.round(L.morrowHeight(x, z)));
