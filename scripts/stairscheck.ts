// Stair check: builds two-storey houses of every shape and door side with the towns' own builder,
// then walks the real player physics up each staircase (centred, and a little off centre).
//   npm run stairs
import './canvas-stub.mjs';
import * as THREE from 'three';
import { B, isSolid } from '../src/world/blocks';
import { houseInto } from '../src/world/sites';
import { Player } from '../src/entities/Player';
// A two-storey house on flat ground at y 20, built by the same builder the towns use
const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
const writer = { set: (x: number, y: number, z: number, id: number) => { cells.set(key(Math.floor(x), Math.floor(y), Math.floor(z)), id); } };
const sink = { props: [] as any[], rects: [] as any[], impostor: [] as any[] };
const results: string[] = [];
for (const [w, d, door] of [[9, 7, 's'], [9, 7, 'n'], [11, 8, 'e'], [8, 7, 'w'], [10, 8, 's'], [12, 9, 'n']] as [number, number, 'n' | 's' | 'e' | 'w'][]) {
  cells.clear();
  houseInto(writer, sink, 100, 100, w, d, 2, 20, 'red', door, { role: 'home' });
  const world: any = {
    get: (x: number, y: number, z: number) => { const v = cells.get(key(x, y, z)); if (v !== undefined) return v; return y < 20 ? B.Grass : B.Air; },
    isWater: () => false,
    groundBelow: (x: number, y: number, z: number) => { let yy = Math.floor(y); while (yy > 0 && !isSolid(world.get(Math.floor(x), yy - 1, Math.floor(z)))) yy--; return yy; },
  };
  // Find the stair steps (DarkPlanks cells inside at y 20..23, in a run of four)
  const steps: [number, number, number][] = [];
  for (const [k, id] of cells) { const [x, y, z] = k.split(',').map(Number); if (id === B.DarkPlanks && y >= 20 && y <= 23 && x > 100 && x < 100 + w - 1 && z > 100 && z < 100 + d - 1) steps.push([x, y, z]); }
  const tops = new Map<string, number>(); for (const [x, y, z] of steps) tops.set(`${x},${z}`, Math.max(tops.get(`${x},${z}`) ?? 0, y));
  const order = [...tops.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k.split(',').map(Number));
  // Walk from in front of the lowest step up the run, with the real player physics
  const p = new Player(world, {} as any);
  const [x0, z0] = order[0], [x1, z1] = order[order.length - 1];
  const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
  p.position.set(x0 + 0.5 - dx * 1.2, 20, z0 + 0.5 - dz * 1.2);
  for (const offset of [0, 0.15]) {
    p.position.set(x0 + 0.5 - dx * 1.2 + (dz ? offset : 0), 20, z0 + 0.5 - dz * 1.2 + (dx ? offset : 0)); p.velocity.set(0, 0, 0);
    for (let i = 0; i < 400; i++) p.update(1 / 60, new THREE.Vector3(dx, 0, dz), 4.5, i % 20 === 0);
    results.push(`${w}x${d} door ${door} offset ${offset}: reached y ${p.position.y.toFixed(2)} (upstairs floor is 24)`);
  }
}
const bad = results.filter((r) => !r.includes('reached y 24.00'));
console.log(bad.length ? bad.join('\n') : `All ${results.length} climbs reach the upper floor.`);
if (bad.length) process.exit(1);
