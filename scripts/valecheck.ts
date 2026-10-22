// Hollin Ford audit: builds the authored valley in Node, checks it, and draws a top-down map.
//   npm run vale            list problems (exit 1 if any)
//   npm run vale -- --png   also write .walker/vale.png (4 px a block, Hollin Ford and around)
//
// Checks: every house door has level ground outside it (no pits you can drop into and not climb
// out of, no drops), worn paths and paving don't run into buildings, and props stand on something
// (not floating) unless they hang on a wall.

import './canvas-stub.mjs';
import * as THREE from 'three';
import zlib from 'node:zlib';
import fs from 'node:fs';
import { Grid, SX, SY, SZ } from '../src/world/grid';
import { generateTerrain, EX, ROADS } from '../src/world/generate';
import { buildStructures } from '../src/world/structures';
import { Batcher, createPropMaterials } from '../src/world/props';
import { B, isSolid } from '../src/world/blocks';
import { MAP_COLORS } from '../src/world/chunkgen';

// Record every prop as it's placed: its world bounding box
const placed: { box: THREE.Box3 }[] = [];
const add0 = Batcher.prototype.addGroup;
Batcher.prototype.addGroup = function (g: THREE.Object3D, m: THREE.Matrix4) {
  const box = new THREE.Box3();
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(m);
    box.union(b);
  });
  if (!box.isEmpty()) placed.push({ box });
  return add0.call(this, g, m);
};

const grid = new Grid();
const layout = generateTerrain(grid);
const res = buildStructures(grid, layout, createPropMaterials(), { value: 0 });
const problems: string[] = [];

// ---- Doors: the ground just outside each one
for (const d of res.doors) {
  const nx = Math.round(Math.sin(d.open)), nz = Math.round(Math.cos(d.open));
  const floor = Math.round(d.hinge.y);
  // The cell outside the doorway: the hinge stands in the door cell, near its outer face
  const ox = Math.floor(d.hinge.x + nx * 1.0 + nz * 0.42), oz = Math.floor(d.hinge.z + nz * 1.0 - nx * 0.42);
  let top = floor + 4; while (top > 0 && !isSolid(grid.get(ox, top, oz))) top--;
  const stand = top + 1;
  if (stand - floor >= 2) problems.push(`door at (${ox}, ${oz}): ground outside is ${stand - floor} blocks above the floor (a pit)`);
  else if (floor - stand >= 2) problems.push(`door at (${ox}, ${oz}): a ${floor - stand}-block drop outside`);
  else if (isSolid(grid.get(ox, stand, oz)) || isSolid(grid.get(ox, stand + 1, oz))) problems.push(`door at (${ox}, ${oz}): blocked outside`);
  // Nothing standing in the way at body height: on the step outside, in the doorway, or just inside
  for (const k of [1, 0, -1]) {
    const cx = ox - nx * (1 - k), cz = oz - nz * (1 - k);
    const cell = new THREE.Box3(new THREE.Vector3(cx + 0.08, floor + 0.1, cz + 0.08), new THREE.Vector3(cx + 0.92, floor + 1.8, cz + 0.92));
    const hit = placed.find((p) => p.box.intersectsBox(cell));
    if (hit) problems.push(`door at (${ox}, ${oz}): a prop ${['inside', 'in the doorway', 'on the step'][k + 1]} at (${((hit.box.min.x + hit.box.max.x) / 2).toFixed(1)}, ${hit.box.min.y.toFixed(1)}, ${((hit.box.min.z + hit.box.max.z) / 2).toFixed(1)})`);
  }
}

// ---- Paths and paving under buildings
for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
  let y = SY - 1; while (y > 0 && grid.get(x, y, z) === B.Air) y--;
  const id = grid.get(x, y, z);
  if ((id === B.Path) && layout.exclusion[x + z * SX] === EX.Building) {
    // A worn path inside a house's ring: fine if it's the doorstep, wrong if a wall stands on it
    if (isSolid(grid.get(x, y + 1, z))) problems.push(`path under a wall at (${x}, ${z})`);
  }
}

// ---- The valley's roads: nothing built across them (a house, a garden fence, a wall) so a road
// never runs into the side of something and stops
const LEAF = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);
const crossed = new Set<string>();
for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) {
  const [ax, az] = road[i], [bx, bz] = road[i + 1];
  const len = Math.hypot(bx - ax, bz - az);
  for (let t = 0; t <= len; t += 0.5) {
    const x = Math.floor(ax + ((bx - ax) * t) / len), z = Math.floor(az + ((bz - az) * t) / len);
    if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
    const h = layout.heights[x + z * SX];
    let top = h + 4; while (top > h - 6 && (!isSolid(grid.get(x, top, z)) || LEAF.has(grid.get(x, top, z)))) top--;
    const what = top + 1 - h >= 3 ? 'a wall' : grid.get(x, top, z) === B.Barrier ? 'a fence or post' : '';
    if (what && !crossed.has(`${x},${z}`)) { crossed.add(`${x},${z}`); problems.push(`road ${ROADS.indexOf(road)} runs into ${what} at (${x}, ${z})`); }
  }
}

// ---- Blocks you can see resting on an invisible barrier (they look as if they float)
for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) for (let y = 1; y < SY; y++) {
  const id = grid.get(x, y, z);
  if (id && id !== B.Barrier && id !== B.Water && grid.get(x, y - 1, z) === B.Barrier) problems.push(`block on a barrier at (${x}, ${y}, ${z})`);
}

// ---- Props that float (nothing under them, and no wall beside them to hang on)
let floating = 0;
for (const { box } of placed) {
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, y = box.min.y;
  if (cx < 0 || cz < 0 || cx >= SX || cz >= SZ) continue;
  const under = Math.floor(y - 0.08);
  const below = (x: number, z: number) => { const id = grid.get(Math.floor(x), under, Math.floor(z)); return isSolid(id) || id === B.Water || id === B.Barrier; };
  if (below(cx, cz) || below(box.min.x + 0.05, box.min.z + 0.05) || below(box.max.x - 0.05, box.max.z - 0.05)) continue;
  // Hung on a wall or a post?
  const yy = Math.floor((box.min.y + box.max.y) / 2);
  let wall = false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isSolid(grid.get(Math.floor(cx + dx * 0.9), yy, Math.floor(cz + dz * 0.9)))) wall = true;
  if (wall) continue;
  // Standing on, or hung from, another prop (a crate on a crate, a sign arm on its post)?
  const grown = box.clone().expandByScalar(0.12);
  if (placed.some((o) => o.box !== box && o.box.intersectsBox(grown))) continue;
  // A lamp hung from the beams inside a house (the roof is a prop, so there's no block above it)
  if (layout.exclusion[Math.floor(cx) + Math.floor(cz) * SX] === EX.Building && box.max.y - box.min.y < 1.2 && box.max.x - box.min.x < 0.5) continue;
  // Hung from a ceiling or a beam?
  if (isSolid(grid.get(Math.floor(cx), Math.floor(box.max.y + 0.15), Math.floor(cz)))) continue;
  // Resting on the ground a little below (a tolerance for half-block props)?
  if (isSolid(grid.get(Math.floor(cx), under - 1, Math.floor(cz))) && y - under < 1.4) continue;
  floating++;
  problems.push(`prop floating at (${cx.toFixed(1)}, ${y.toFixed(1)}, ${cz.toFixed(1)}), size ${(box.max.x - box.min.x).toFixed(1)}x${(box.max.y - box.min.y).toFixed(1)}x${(box.max.z - box.min.z).toFixed(1)}`);
}

console.log(`${res.doors.length} doors, ${placed.length} props checked.`);
if (problems.length) { console.log(`${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); }
else console.log('No problems.');

// ---- Top-down map
if (process.argv.includes('--png')) {
  const X0 = 108, X1 = 232, Z0 = 158, Z1 = 214, S = 8;
  const W = (X1 - X0) * S, H = (Z1 - Z0) * S;
  const px = Buffer.alloc((W * 3 + 1) * H);
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    let y = SY - 1; while (y > 0 && grid.get(x, y, z) === B.Air) y--;
    const id = grid.get(x, y, z);
    let c = MAP_COLORS[id] ?? (id === B.Water ? [60, 120, 190] : id === B.Barrier ? [255, 0, 255] : [180, 180, 180]);
    const shade = 0.75 + Math.max(-0.25, Math.min(0.35, (y - 19) * 0.06));
    c = c.map((v) => Math.max(0, Math.min(255, v * shade))) as [number, number, number];
    if (layout.exclusion[x + z * SX] === EX.Building && id !== B.Path) c = [Math.min(255, c[0] + 30), c[1], c[2]];
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
      const o = ((z - Z0) * S + dy) * (W * 3 + 1) + 1 + ((x - X0) * S + dx) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
  // Doors in yellow, floating props in magenta
  const dot = (x: number, z: number, c: number[]) => {
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
      const X = Math.floor((x - X0) * S) + dx - 1, Z = Math.floor((z - Z0) * S) + dy - 1;
      if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
      const o = Z * (W * 3 + 1) + 1 + X * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  };
  for (const d of res.doors) dot(d.hinge.x, d.hinge.z, [255, 230, 0]);
  for (let i = 0; i < H; i++) px[i * (W * 3 + 1)] = 0;
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.mkdirSync('.walker', { recursive: true });
  fs.writeFileSync('.walker/vale.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(px)), chunk('IEND', Buffer.alloc(0))]));
  console.log('wrote .walker/vale.png');
}
if (problems.length) process.exit(1);
