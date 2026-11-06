// Is each candidate quest spot dry land, in the region it should be?
import { TOWNS, morrowRegionId } from '../src/world/morrow';
import { heightAt, SEA } from '../src/world/terrain';
const T = TOWNS as Record<string, { x: number; z: number }>;
const C: [string, string, number, number][] = [
  ['ten', 'tenwells', 70, -40], ['ten', 'tenwells', 120, -80], ['ten', 'tenwells', 170, -60], ['ten', 'tenwells', 200, -100], ['ten', 'tenwells', -80, -60], ['ten', 'tenwells', -60, 80],
  ['br', 'branchley', 18, -10], ['br', 'branchley', -22, 6], ['br', 'branchley', 30, 14], ['br', 'branchley', 0, 40], ['br', 'branchley', -40, -20],
];
for (const [k, t, dx, dz] of C) { const x = T[t].x + dx, z = T[t].z + dz; console.log(k, dx, dz, morrowRegionId(x, z), heightAt(x, z).toFixed(0), heightAt(x, z) > SEA ? 'dry' : 'WET'); }
