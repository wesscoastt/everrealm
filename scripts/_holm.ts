import { bigIsle, hoistSpot } from '../src/world/holms';
import { heightAt } from '../src/world/terrain';
const I = bigIsle(), H = hoistSpot();
const isle = (k: number, w = 0) => [I.x - H.dx * k + (H.dz !== 0 ? w : 0), I.z - H.dz * k + (H.dx !== 0 ? w : 0)];
const foot = (k: number, w = 0) => [H.x - H.dx * k + (H.dz !== 0 ? w : 0), H.z - H.dz * k + (H.dx !== 0 ? w : 0)];
console.log('isle', I, 'hoist', { x: H.x, z: H.z, dx: H.dx, dz: H.dz, ground: H.ground });
const r = isle(-(I.r - 1.5)), g = isle(-(I.r + 3));
console.log('rim', r, 'below', g, heightAt(g[0], g[1]));
for (const k of [8, 10, 12]) for (const w of [-4, 0, 4]) { const p = foot(k, w); console.log('foot', k, w, p.map((v) => v.toFixed(1)).join(','), heightAt(p[0], p[1]).toFixed(1)); }
