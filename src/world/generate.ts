import { B } from './blocks';
import { distToPolyline, fbm2, hash2, smoothstep } from './noise';
import { baseHeight, valeSurface } from './terrain';
import { SX, SY, SZ, Grid, WATER_LEVEL } from './grid';

// Hollindale layout. Coordinates are block units, x east, z south.

export const VILLAGE = { x: 166, z: 184, y: 19 };
export const UPPER_LEVEL = 30;

export const LOWER_WEND: [number, number][] = [
  [96, 104], [112, 122], [132, 140], [152, 156], [165, 168], [171, 180], [172, 192], [178, 206],
  [190, 220], [206, 236], [222, 254], [238, 274], [252, 296], [262, 330],
];
export const UPPER_WEND: [number, number][] = [[86, -10], [90, 20], [88, 48], [92, 72], [94, 88], [94, 93]];
export const SPILL = { x: 96, z: 108, r: 11 };
export const FALLS = { x0: 93, x1: 95, z: 94 };

export const ROADS: [number, number][][] = [
  [[-4, 188], [40, 190], [80, 186], [112, 186], [140, 184], [163, 184]], // West road into the square
  [[179, 184], [196, 184], [226, 188], [262, 194], [324, 200]], // East road out of the village
  [[190, 184], [193.5, 180], [193.5, 169], [201, 160], [210, 146], [216, 126], [218, 118]], // Pit road, up between the smithy and the blue cottage
  [[150, 190], [147.5, 196], [147.5, 204], [151, 212], [151, 237], [136, 241], [112, 241], [96, 246], [80, 250]], // Lantern path (clear of the cottage chimney), round the east and south of the farm
  // Wetlings track: down from the inn, over the plank bridge, along the far bank and south out of the vale
  [[180, 196], [190.6, 213], [193, 216], [193, 218.5], [181, 218.5], [184, 226], [196, 236], [206, 243], [214, 262], [226, 292], [232, 324]],
  [[140, 184], [136.5, 188], [136.5, 196], [126, 200], [118, 202]], // Mill lane, between the well and the corner house
  [[154, 182], [152, 166], [130.5, 146], [110.5, 128], [104, 117]], // Spill path, back from the stream's edge
];

export type TreeKind = 'oak' | 'birch' | 'pine' | 'moot' | 'giant' | 'ancient';

/** Anything trees can be written into: the authoring grid or a chunk being generated. */
export interface VoxelSink { get(x: number, y: number, z: number): number; put(x: number, y: number, z: number, id: number): void }

export interface TreeNode {
  id: number;
  kind: TreeKind;
  x: number;
  y: number;
  z: number;
  trunk: [number, number, number][];
  leaves: [number, number, number, number][];
  logs: number;
  depletedUntil: number;
  choppable: boolean;
}

export interface OreNode {
  id: number;
  kind: 'copper' | 'tin' | 'silver' | 'iron' | 'crystal';
  x: number;
  y: number;
  z: number;
  depletedUntil: number;
}

export interface FishSpot {
  id: number;
  x: number;
  y: number;
  z: number;
  water: 'wend' | 'spill' | 'eelpool' | 'lake' | 'sea' | 'highland';
}

export interface Layout {
  heights: Int16Array;
  exclusion: Uint8Array;
  tint: Float32Array;
  trees: TreeNode[];
  ores: OreNode[];
  fish: FishSpot[];
  mineLights: [number, number, number][];
  caveLights: [number, number, number][];
}

export const EX = { None: 0, Road: 1, Building: 2, Farm: 3, Water: 4, Keep: 5 } as const;

const hIdx = (x: number, z: number) => x + z * SX;

function bump(x: number, z: number, cx: number, cz: number, r: number, amp: number, sx = 1, sz = 1): number {
  const d = Math.hypot((x - cx) / sx, (z - cz) / sz);
  return amp * smoothstep(r, 0, d);
}

function surfaceHeight(x: number, z: number): number {
  // The vale's ground and the rim of mountains on its north and west (shared with terrain.ts,
  // which carries it on past the grid toward the coast)
  let h = valeSurface(x, z);

  // North-west highland that the Wend falls from
  let hl = smoothstep(99, 88, z) * smoothstep(152, 118, x);
  if (x > 76 && x < 116 && z > 84 && z < 100) hl = z <= 93 + (hash2(x, 3) < 0.3 ? 1 : 0) ? 1 : 0;
  h += hl * 12;

  h += bump(x, z, 238, 92, 44, 24); // Sallow Pit hill
  h += bump(x, z, 112, 206, 22, 8); // Gorse Mill hill
  h += bump(x, z, 68, 254, 30, 16, 1.3, 0.8); // Lantern ridge
  h += bump(x, z, 270, 250, 30, 6); // Haverwood rise

  const flatten = (cx: number, cz: number, r0: number, r1: number, target: number) => {
    const w = smoothstep(r1, r0, Math.hypot(x - cx, z - cz));
    h = h + (target - h) * w;
  };
  flatten(VILLAGE.x, VILLAGE.z, 28, 46, VILLAGE.y);
  flatten(200, 238, 16, 32, 17.4); // Wetlings
  flatten(136, 226, 14, 24, 19.4); // Farms
  flatten(SPILL.x, SPILL.z + 4, 12, 22, 18);
  flatten(216, 120, 6, 12, 22);
  flatten(112, 206, 0, 6, 28); // Mill hill crown
  // Blend into the surrounding regions at the east and south edges of the vale.
  const eb = smoothstep(282, 318, Math.max(x, z));
  if (eb > 0) h += (baseHeight(x, z) - h) * eb;
  return h;
}

export function generateTerrain(world: Grid): Layout {
  const heights = new Int16Array(SX * SZ);
  const exclusion = new Uint8Array(SX * SZ);
  const waterTop = new Int16Array(SX * SZ); // 0 = dry
  const bedKind = new Uint8Array(SX * SZ);

  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      let h = surfaceHeight(x, z);
      const i = hIdx(x, z);

      // Lower Wend and the Spill pool
      const r = distToPolyline(x, z, LOWER_WEND);
      const halfW = 3.4 + fbm2(x / 20, z / 20, 2, 33) * 1.6;
      const dPool = Math.hypot(x - SPILL.x, (z - SPILL.z) * 1.15) - SPILL.r;
      const inRiver = r.d < halfW;
      if (inRiver || dPool < 0) {
        const depthT = inRiver ? 1 - r.d / halfW : Math.min(1, -dPool / 6);
        const depth = dPool < 0 ? 2 + Math.round(depthT * 3) : 1 + Math.round(depthT * 2.2);
        h = WATER_LEVEL - depth;
        waterTop[i] = WATER_LEVEL;
        exclusion[i] = EX.Water;
        bedKind[i] = depthT > 0.5 ? 2 : 1;
      } else {
        const bank = Math.min(r.d - halfW, dPool < 12 ? dPool : 99);
        if (bank < 7) h = Math.min(h, WATER_LEVEL + 0.4 + bank * 0.55);
      }

      // Upper Wend on the highland
      if (z < 94) {
        const u = distToPolyline(x, z, UPPER_WEND);
        if (u.d < 2.3) {
          h = UPPER_LEVEL - 2;
          waterTop[i] = UPPER_LEVEL;
          exclusion[i] = EX.Water;
          bedKind[i] = 2;
        } else if (u.d < 6) {
          h = Math.min(h, UPPER_LEVEL + 0.5 + (u.d - 2.3) * 0.6);
        }
      }

      heights[i] = Math.round(h);
    }
  }

  // Waterfall column, ledges and the hollow behind it.
  for (let x = FALLS.x0; x <= FALLS.x1; x++) {
    heights[hIdx(x, FALLS.z)] = WATER_LEVEL - 3;
    waterTop[hIdx(x, FALLS.z)] = UPPER_LEVEL;
    exclusion[hIdx(x, FALLS.z)] = EX.Water;
  }
  for (const x of [89, 90, 91, 92, 96, 97, 98, 99]) {
    for (const z of [94, 95]) {
      heights[hIdx(x, z)] = WATER_LEVEL + 1;
      waterTop[hIdx(x, z)] = 0;
      exclusion[hIdx(x, z)] = EX.Keep;
    }
  }

  // Roads: where the ground under one jumps two blocks or more between neighbours (along it or across
  // it), the two are eased toward each other a block at a time until no step is more than one;
  // everywhere else the road lies on the valley as authored
  {
    const onRoad = new Uint8Array(SX * SZ), cells: number[] = [];
    for (const road of ROADS) {
      const xs = road.map((p) => p[0]), zs = road.map((p) => p[1]);
      for (let z = Math.max(1, Math.min(...zs) - 3); z <= Math.min(SZ - 2, Math.max(...zs) + 3); z++) for (let x = Math.max(1, Math.min(...xs) - 3); x <= Math.min(SX - 2, Math.max(...xs) + 3); x++) {
        const i = hIdx(x, z);
        if (onRoad[i] || exclusion[i] === EX.Water || waterTop[i] || distToPolyline(x, z, road).d >= 1.8) continue;
        onRoad[i] = 1;
        cells.push(i);
      }
    }
    for (let pass = 0; pass < 60; pass++) {
      let eased = false;
      for (const i of cells) for (const j of [i + 1, i - 1, i + SX, i - SX]) {
        if (!onRoad[j] || heights[i] - heights[j] < 2) continue;
        heights[i]--;
        heights[j]++;
        eased = true;
      }
      if (!eased) break;
    }
  }

  // Roads
  for (const road of ROADS) {
    const minX = Math.max(0, Math.min(...road.map((p) => p[0])) - 3);
    const maxX = Math.min(SX - 1, Math.max(...road.map((p) => p[0])) + 3);
    const minZ = Math.max(0, Math.min(...road.map((p) => p[1])) - 3);
    const maxZ = Math.min(SZ - 1, Math.max(...road.map((p) => p[1])) + 3);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const i = hIdx(x, z);
      if (exclusion[i] === EX.Water) continue;
      const d = distToPolyline(x, z, road).d;
      const w = 1.3 + fbm2(x / 6, z / 6, 1, 77) * 0.9;
      if (d < w) exclusion[i] = EX.Road;
    }
  }

  // Fill columns
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const i = hIdx(x, z);
      const h = Math.max(1, Math.min(SY - 2, heights[i]));
      let maxDiff = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = Math.min(SX - 1, Math.max(0, x + dx)), nz = Math.min(SZ - 1, Math.max(0, z + dz));
        maxDiff = Math.max(maxDiff, h - heights[hIdx(nx, nz)]);
      }
      const nearWater = h <= WATER_LEVEL + 1 && distToPolyline(x, z, LOWER_WEND).d < 9 || (Math.hypot(x - SPILL.x, z - SPILL.z) < SPILL.r + 4 && h <= WATER_LEVEL + 2);
      const stonyNoise = fbm2(x / 9, z / 9, 2, 55);
      let top: number = B.Grass;
      let sub: number = B.Dirt;
      if (waterTop[i]) {
        top = bedKind[i] === 2 ? (hash2(x, z, 4) < 0.5 ? B.Gravel : B.Sand) : hash2(x, z, 5) < 0.2 ? B.Clay : B.Sand;
        sub = B.Sand;
      } else if (exclusion[i] === EX.Road) {
        top = hash2(x, z, 8) < 0.12 ? B.Gravel : B.Path;
      } else if (h >= 47) {
        top = B.Snow; sub = B.Stone;
      } else if (h >= 43) {
        top = stonyNoise > 0.5 ? B.SnowGrass : B.Stone; sub = B.Stone;
      } else if (maxDiff >= 3 || (h > 34 && stonyNoise > 0.55)) {
        top = stonyNoise > 0.62 ? B.MossyStone : B.Stone; sub = B.Stone;
      } else if (nearWater) {
        top = B.Sand; sub = B.Sand;
      }
      for (let y = 0; y < h; y++) {
        let id: number;
        if (y === h - 1) id = top;
        else if (y >= h - 4) id = sub === B.Dirt && top === B.Path ? B.Dirt : sub;
        else if (y < 6) id = B.DeepStone;
        else {
          id = B.Stone;
          const strata = fbm2(x / 11 + y * 0.3, z / 11, 2, 91);
          if (strata > 0.68) id = B.Gravel;
          else if (strata < 0.22 && y > 14) id = B.Clay;
          else if (y < 12 && strata > 0.6) id = B.DeepStone;
        }
        world.put(x, y, z, id);
      }
      if (waterTop[i]) for (let y = h; y < waterTop[i]; y++) world.put(x, y, z, B.Water);
    }
  }

  // Ledges either side of the falls are solid up to WATER_LEVEL.
  const caveLights: [number, number, number][] = [];
  const fish: FishSpot[] = [];
  const ores: OreNode[] = [];
  let oreId = 0;

  // Hollow behind Spill Falls
  for (let x = 89; x <= 99; x++) for (let z = 84; z <= 93; z++) for (let y = WATER_LEVEL + 1; y <= WATER_LEVEL + 4; y++) {
    const dx = (x - 94) / 5.6, dz = (z - 88.5) / 5, dy = (y - WATER_LEVEL - 1) / 4.2;
    if (dx * dx + dz * dz + dy * dy * 0.6 < 1 || (z >= 92 && x >= 90 && x <= 98 && y <= WATER_LEVEL + 3)) world.put(x, y, z, B.Air);
  }
  for (let x = 89; x <= 99; x++) for (let z = 84; z <= 95; z++) {
    if (world.get(x, WATER_LEVEL + 1, z) === B.Air) world.put(x, WATER_LEVEL, z, hash2(x, z, 12) < 0.3 ? B.MossyCobble : B.Stone);
  }
  // Eel pool inside the hollow
  for (let x = 93; x <= 95; x++) for (let z = 87; z <= 89; z++) {
    world.put(x, WATER_LEVEL, z, B.Water);
    world.put(x, WATER_LEVEL - 1, z, B.Water);
    world.put(x, WATER_LEVEL - 2, z, B.Gravel);
  }
  fish.push({ id: 0, x: 94.5, y: WATER_LEVEL + 1, z: 88.5, water: 'eelpool' });
  for (const [x, y, z] of [[90, 17, 86], [98, 18, 86], [91, 19, 85]] as [number, number, number][]) {
    if (world.get(x, y, z) !== B.Air) { world.put(x, y, z, B.SilverOre); ores.push({ id: oreId++, kind: 'silver', x, y, z, depletedUntil: 0 }); }
  }
  for (const [x, z] of [[90, 89], [97, 90], [92, 85], [96, 85], [98, 88]]) {
    const y = WATER_LEVEL;
    world.put(x, y, z, B.Glowcap);
  }
  caveLights.push([94, 19, 87]);

  // Sallow Pit: entrance cutting, timbered tunnel, then the working chamber.
  const mineLights: [number, number, number][] = [];
  const FLOOR = 22;
  const carve = (x: number, y: number, z: number) => world.put(x, y, z, B.Air);
  for (let z = 100; z <= 122; z++) for (let x = 215; x <= 221; x++) {
    for (let y = FLOOR; y < FLOOR + 5; y++) carve(x, y, z);
    world.put(x, FLOOR - 1, z, x === 215 || x === 221 ? B.Stone : B.Gravel);
    if (z > 117) for (let y = FLOOR + 5; y < SY; y++) carve(x, y, z); // open cutting at the mouth
  }
  for (let z = 100; z <= 117; z += 4) {
    for (let y = FLOOR; y < FLOOR + 4; y++) { world.put(215, y, z, B.Timber); world.put(221, y, z, B.Timber); }
    for (let x = 215; x <= 221; x++) world.put(x, FLOOR + 4, z, B.Timber);
    if (z % 8 === 0) mineLights.push([218, FLOOR + 3.4, z + 0.5]);
  }
  for (let z = 96; z <= 104; z++) for (let x = 215; x <= 232; x++) for (let y = FLOOR; y < FLOOR + 5; y++) carve(x, y, z);
  // Chamber with lumpy walls
  for (let x = 226; x <= 252; x++) for (let z = 80; z <= 104; z++) for (let y = FLOOR; y <= FLOOR + 7; y++) {
    const dx = (x - 239) / 12.5, dz = (z - 92) / 11, dy = (y - FLOOR) / 7.5;
    const wob = (fbm2(x / 4 + y * 0.4, z / 4, 2, 120) - 0.5) * 0.35;
    if (dx * dx + dz * dz + dy * dy * dy < 1 + wob) carve(x, y, z);
  }
  for (let x = 226; x <= 252; x++) for (let z = 80; z <= 104; z++) {
    if (world.get(x, FLOOR, z) === B.Air) world.put(x, FLOOR - 1, z, hash2(x, z, 2) < 0.4 ? B.Gravel : B.Stone);
  }
  // Pillars left standing to hold the roof
  for (const [px, pz] of [[235, 88], [244, 96], [240, 84]]) {
    for (let y = FLOOR; y <= FLOOR + 7; y++) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) world.put(px + dx, y, pz + dz, B.Stone);
  }
  mineLights.push([229, FLOOR + 3, 100.5], [239, FLOOR + 4, 92], [247, FLOOR + 3, 88], [233, FLOOR + 3, 84]);
  // Number Four's mouth: a timbered cut east off the chamber, boarded up. Behind the boards is the
  // ladder down to the shut gallery (the Old Man's Workings, a group dungeon: sites.ts buildOldMan).
  for (let x = 249; x <= 256; x++) for (let z = 90; z <= 94; z++) {
    for (let y = FLOOR; y < FLOOR + 5; y++) carve(x, y, z);
    world.put(x, FLOOR - 1, z, B.Gravel);
  }
  for (let y = FLOOR; y < FLOOR + 5; y++) { world.put(256, y, 90, B.Timber); world.put(256, y, 94, B.Timber); }
  for (let z = 90; z <= 94; z++) world.put(256, FLOOR + 4, z, B.Timber);
  for (let z = 91; z <= 93; z++) for (let y = FLOOR; y < FLOOR + 4; y++) world.put(257, y, z, hash2(z, y, 61) < 0.3 ? B.Timber : B.Planks);
  mineLights.push([253, FLOOR + 3, 92.5]);

  // Ore seams in the chamber walls
  const wallSpots: [number, number, number][] = [];
  for (let x = 226; x <= 252; x++) for (let z = 80; z <= 104; z++) for (let y = FLOOR; y <= FLOOR + 2; y++) {
    const id = world.get(x, y, z);
    if (id !== B.Stone) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => world.get(x + dx, y, z + dz) === B.Air);
    if (open) wallSpots.push([x, y, z]);
  }
  let copper = 0, tin = 0;
  for (let k = 0; k < wallSpots.length && (copper < 12 || tin < 9); k++) {
    const j = Math.floor(hash2(k, 7, 99) * wallSpots.length);
    const [x, y, z] = wallSpots[j];
    if (world.get(x, y, z) !== B.Stone) continue;
    if (ores.some((o) => Math.abs(o.x - x) + Math.abs(o.z - z) + Math.abs(o.y - y) < 3)) continue;
    const kind = copper <= tin * 1.3 ? 'copper' : 'tin';
    world.put(x, y, z, kind === 'copper' ? B.CopperOre : B.TinOre);
    ores.push({ id: oreId++, kind, x, y, z, depletedUntil: 0 });
    if (kind === 'copper') copper++; else tin++;
  }
  // Surface outcrops along the Pit road so the first ore is visible from outside.
  const outcrops: [number, number, 'copper' | 'tin'][] = [[224, 121, 'copper'], [212, 123, 'tin'], [226, 115, 'copper']];
  for (const [x, z, kind] of outcrops) {
    const y = heights[hIdx(x, z)];
    for (let dy = 0; dy < 2; dy++) world.put(x, y + dy, z, B.Stone);
    world.put(x + 1, y, z, B.Stone);
    world.put(x, y, z, kind === 'copper' ? B.CopperOre : B.TinOre);
    ores.push({ id: oreId++, kind, x, y, z, depletedUntil: 0 });
    exclusion[hIdx(x, z)] = EX.Keep;
    exclusion[hIdx(x + 1, z)] = EX.Keep;
  }

  // Fishing spots along the Wend and the Spill
  const fishSites: [number, number, FishSpot['water']][] = [[100, 112, 'spill'], [92, 104, 'spill'], [104, 102, 'spill'], [158, 160, 'wend'], [170, 202, 'wend'], [196, 226, 'wend'], [138, 144, 'wend']];
  for (const [x, z, water] of fishSites) fish.push({ id: fish.length, x: x + 0.5, y: WATER_LEVEL, z: z + 0.5, water });

  // Tint field for grass and leaves: warm meadows, cooler wood, greyer highland
  const tint = new Float32Array(SX * SZ * 3);
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const n = fbm2(x / 38, z / 38, 3, 404);
    const forest = smoothstep(46, 20, Math.hypot(x - 250, z - 236));
    const high = smoothstep(26, 40, heights[hIdx(x, z)]);
    let r = 1.04 + (n - 0.5) * 0.22, g = 1.0 + (n - 0.5) * 0.08, b = 0.88 - (n - 0.5) * 0.1;
    r = r * (1 - forest) + 0.8 * forest; g = g * (1 - forest) + 0.94 * forest; b = b * (1 - forest) + 0.92 * forest;
    r = r * (1 - high) + 0.95 * high; b = b * (1 - high) + 0.98 * high;
    tint[(z * SX + x) * 3] = r;
    tint[(z * SX + x) * 3 + 1] = g;
    tint[(z * SX + x) * 3 + 2] = b;
  }

  return { heights, exclusion, tint, trees: [], ores, fish, mineLights, caveLights };
}

const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
const ONE: [number, number, number] = [1, 1, 1];
const scratch: [number, number, number] = [1, 1, 1];
export function makeTintFn(layout: Layout) {
  return (x: number, z: number, id: number): [number, number, number] => {
    if (id !== B.Grass && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves) return ONE;
    const i = (z * SX + x) * 3;
    scratch[0] = layout.tint[i];
    scratch[1] = layout.tint[i + 1];
    scratch[2] = layout.tint[i + 2];
    if (id !== B.Grass) { scratch[0] *= 0.96; scratch[2] *= 1.02; }
    return scratch;
  };
}

// ---------------------------------------------------------------- Trees

export function growTree(world: VoxelSink, kind: TreeKind, x: number, y: number, z: number, rnd: () => number): TreeNode {
  const trunk: [number, number, number][] = [];
  const leaves: [number, number, number, number][] = [];
  const leaf = kind === 'birch' ? B.BirchLeaves : kind === 'pine' ? B.PineLeaves : B.OakLeaves;
  const log = kind === 'birch' ? B.BirchLog : kind === 'pine' ? B.PineLog : B.OakLog;
  const key = (lx: number, ly: number, lz: number) => ((lx + 4096) * 8192 + lz + 4096) * 128 + ly;
  const mine = new Map<number, number>();
  const addLeaf = (lx: number, ly: number, lz: number) => {
    if (world.get(lx, ly, lz) === B.Air) { world.put(lx, ly, lz, leaf); mine.set(key(lx, ly, lz), leaves.length); leaves.push([lx, ly, lz, leaf]); }
  };
  /** The lowest leaf of this tree's crown in a column, if any. */
  const underside = (lx: number, lz: number, from: number, to: number) => { for (let yy = from; yy <= to; yy++) if (mine.has(key(lx, yy, lz))) return yy; return -1; };
  const addLog = (lx: number, ly: number, lz: number) => { world.put(lx, ly, lz, log); trunk.push([lx, ly, lz]); };

  if (kind === 'pine') {
    const hgt = 7 + Math.floor(rnd() * 4);
    for (let i = 0; i < hgt; i++) addLog(x, y + i, z);
    for (let i = 2; i <= hgt; i++) {
      const r = Math.max(0.6, (hgt - i) * 0.42 + (i % 2) * 0.6);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (dx * dx + dz * dz <= r * r + 0.5) addLeaf(x + dx, y + i, z + dz);
    }
    addLeaf(x, y + hgt, z); addLeaf(x, y + hgt + 1, z);
  } else if (kind === 'ancient') {
    // Hagworm's ancients: a trunk three blocks across rising twenty-odd, roots buttressing out over
    // the forest floor, limbs reaching out with their own clumps of leaf, and a crown twenty across
    const hgt = 18 + Math.floor(rnd() * 9);
    for (let i = 0; i < hgt; i++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (i > hgt - 4 && Math.abs(dx) + Math.abs(dz) === 2) continue; // the trunk rounds off into the crown
      addLog(x + dx, y + i, z + dz);
    }
    const roots = 5 + Math.floor(rnd() * 3);
    for (let r = 0; r < roots; r++) {
      const a = (r / roots) * Math.PI * 2 + rnd() * 0.5, len = 3 + Math.floor(rnd() * 3);
      for (let k = 1; k <= len; k++) {
        const rx = x + Math.round(Math.cos(a) * (1 + k)), rz = z + Math.round(Math.sin(a) * (1 + k));
        const top = Math.max(0, 2 - Math.floor(k * 0.7));
        for (let h = -1; h <= top; h++) addLog(rx, y + h, rz);
      }
    }
    const clump = (cx: number, cy: number, cz: number, r: number) => {
      const R = Math.ceil(r);
      for (let dx = -R; dx <= R; dx++) for (let dy = -2; dy <= R - 1; dy++) for (let dz = -R; dz <= R; dz++) {
        if (Math.sqrt(dx * dx + (dy * 1.3) ** 2 + dz * dz) <= r + (rnd() - 0.5) * 0.8) addLeaf(cx + dx, cy + dy, cz + dz);
      }
    };
    const limbs = 5 + Math.floor(rnd() * 3);
    for (let l = 0; l < limbs; l++) {
      const a = (l / limbs) * Math.PI * 2 + rnd() * 0.6, from = Math.floor(hgt * (0.5 + rnd() * 0.35)), len = 4 + Math.floor(rnd() * 4);
      let lx = x, lz = z, ly = y + from;
      for (let k = 1; k <= len; k++) {
        lx = x + Math.round(Math.cos(a) * (1 + k)); lz = z + Math.round(Math.sin(a) * (1 + k)); ly = y + from + Math.floor(k / 2);
        addLog(lx, ly, lz);
      }
      clump(lx, ly + 1, lz, 2.6 + rnd() * 1.2);
    }
    // The crown, and moss-green leaf hanging from its underside
    const cy = y + hgt, cr = 64 + rnd() * 36;
    for (let dx = -11; dx <= 11; dx++) for (let dy = -3; dy <= 5; dy++) for (let dz = -11; dz <= 11; dz++) {
      const d = (dx * dx) / cr + (dy * dy) / (dy < 0 ? 8 : 22) + (dz * dz) / cr;
      if (d < 1 + (rnd() - 0.5) * 0.22) addLeaf(x + dx, cy + dy, z + dz);
    }
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2, r = 3 + rnd() * 6, hx = x + Math.round(Math.cos(a) * r), hz = z + Math.round(Math.sin(a) * r);
      const len = 1 + Math.floor(rnd() * 3);
      const low = underside(hx, hz, cy - 3, cy + 5);
      if (low >= 0) for (let h = 1; h <= len; h++) addLeaf(hx, low - h, hz);
    }
  } else if (kind === 'moot' || kind === 'giant') {
    const hgt = kind === 'moot' ? 8 : 10 + Math.floor(rnd() * 5);
    const cr = kind === 'moot' ? 42 : 30 + rnd() * 18;
    for (let i = 0; i < hgt; i++) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) addLog(x + dx, y + i, z + dz);
    // Spreading limbs
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      for (let k = 1; k <= 3; k++) addLog(x + (dx > 0 ? 1 : 0) + dx * k, y + 5 + Math.floor(k / 2), z + (dz > 0 ? 1 : 0) + dz * k);
    }
    const cy = y + hgt;
    for (let dx = -7; dx <= 8; dx++) for (let dy = -3; dy <= 4; dy++) for (let dz = -7; dz <= 8; dz++) {
      const d = (dx - 0.5) ** 2 / cr + dy * dy / (dy < 0 ? 7 : 14) + (dz - 0.5) ** 2 / cr;
      if (d < 1 + (rnd() - 0.5) * 0.25) addLeaf(x + dx, cy + dy, z + dz);
    }
  } else {
    const birch = kind === 'birch';
    const hgt = birch ? 5 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < hgt; i++) addLog(x, y + i, z);
    if (!birch && rnd() < 0.6) {
      const dx = rnd() < 0.5 ? 1 : -1;
      addLog(x + dx, y + hgt - 2, z);
    }
    const r = birch ? 2.1 : 2.6 + rnd() * 0.8;
    const cy = y + hgt - (birch ? 1 : 0);
    const R = Math.ceil(r) + 1;
    for (let dx = -R; dx <= R; dx++) for (let dy = -2; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
      const d = Math.sqrt(dx * dx + (dy * (birch ? 0.75 : 1.15)) ** 2 + dz * dz);
      if (d <= r + (rnd() - 0.5) * 0.9) addLeaf(x + dx, cy + dy, z + dz);
    }
    // A few drooping clumps break the silhouette, each hung under the crown's lower edge
    for (let k = 0; k < 3; k++) {
      const a = rnd() * Math.PI * 2;
      for (let d = Math.ceil(r) + 1; d >= 1; d--) {
        const hx = x + Math.round(Math.cos(a) * d), hz = z + Math.round(Math.sin(a) * d);
        const low = underside(hx, hz, cy - 2, cy);
        if (low >= 0) { addLeaf(hx, low - 1, hz); break; }
      }
    }
  }
  // Every leaf hangs on the tree: the crown's ragged edge can leave a block touching nothing of its
  // own but air, so keep only what reaches the wood face to face, leaf by leaf
  const held = new Uint8Array(leaves.length);
  const q = trunk.map(([a, b, c]) => [a, b, c]);
  while (q.length) {
    const [qx, qy, qz] = q.pop()!;
    for (const [dx, dy, dz] of FACES) {
      const i = mine.get(key(qx + dx, qy + dy, qz + dz));
      if (i !== undefined && !held[i]) { held[i] = 1; q.push([qx + dx, qy + dy, qz + dz]); }
    }
  }
  if (held.includes(0)) {
    const kept = leaves.filter((l, i) => { if (!held[i]) world.put(l[0], l[1], l[2], B.Air); return held[i]; });
    leaves.length = 0;
    leaves.push(...kept);
  }
  return {
    id: 0, kind, x, y, z, trunk, leaves,
    logs: kind === 'moot' || kind === 'ancient' ? 0 : kind === 'giant' ? 6 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 3),
    depletedUntil: 0,
    // The Moot Oak and Hagworm's ancients aren't for felling
    choppable: kind !== 'moot' && kind !== 'ancient',
  };
}

export interface EditableVoxels { get(x: number, y: number, z: number): number; set(x: number, y: number, z: number, id: number): void }

export function fellTree(world: EditableVoxels, t: TreeNode): void {
  for (const [x, y, z] of t.leaves) if (world.get(x, y, z) === t.leaves[0]?.[3]) world.set(x, y, z, B.Air);
  for (let i = 1; i < t.trunk.length; i++) { const [x, y, z] = t.trunk[i]; world.set(x, y, z, B.Air); }
}

export function regrowTree(world: EditableVoxels, t: TreeNode): void {
  const log = world.get(t.trunk[0][0], t.trunk[0][1], t.trunk[0][2]);
  for (let i = 1; i < t.trunk.length; i++) { const [x, y, z] = t.trunk[i]; if (world.get(x, y, z) === B.Air) world.set(x, y, z, log); }
  for (const [x, y, z, id] of t.leaves) if (world.get(x, y, z) === B.Air) world.set(x, y, z, id);
}

export function placeTrees(world: Grid, layout: Layout, rnd: () => number): void {
  const { heights, exclusion, trees } = layout;
  const taken = new Uint8Array(SX * SZ);
  const tryTree = (x: number, z: number, kind: TreeKind) => {
    if (x < 3 || z < 3 || x >= SX - 3 || z >= SZ - 3) return;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const e = exclusion[hIdx(x + dx, z + dz)];
      if (e !== EX.None || taken[hIdx(x + dx, z + dz)]) return;
    }
    const y = world.topSolid(x, z) + 1;
    const ground = world.get(x, y - 1, z);
    if (ground !== B.Grass && ground !== B.Dirt && ground !== B.SnowGrass) return;
    if (world.get(x, y, z) !== B.Air) return;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) taken[hIdx(Math.min(SX - 1, Math.max(0, x + dx)), Math.min(SZ - 1, Math.max(0, z + dz)))] = 1;
    world.put(x, y - 1, z, B.Dirt);
    const t = growTree(world, kind, x, y, z, rnd);
    t.id = trees.length;
    trees.push(t);
  };

  // Haverwood: dense oak and birch to the east and south-east
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rnd() * SX), z = Math.floor(rnd() * SZ);
    const h = heights[hIdx(x, z)];
    const forest = smoothstep(62, 24, Math.hypot(x - 252, z - 238));
    const copse = smoothstep(26, 8, Math.hypot(x - 128, z - 120)) * 0.6;
    const scatter = 0.06 + fbm2(x / 30, z / 30, 2, 66) * 0.1;
    const vill = smoothstep(30, 52, Math.hypot(x - VILLAGE.x, z - VILLAGE.z));
    const chance = Math.max(forest * 0.85, copse, scatter * vill);
    if (rnd() > chance) continue;
    let kind: TreeKind = 'oak';
    if (h > 31) kind = 'pine';
    else if (forest > 0.3 && fbm2(x / 18, z / 18, 2, 70) > 0.55) kind = 'birch';
    else if (rnd() < 0.12) kind = 'birch';
    tryTree(x, z, kind);
  }
  // Pines on the mountain shoulders
  for (let i = 0; i < 1400; i++) {
    const x = Math.floor(rnd() * SX), z = Math.floor(rnd() * SZ);
    const h = heights[hIdx(x, z)];
    if (h > 29 && h < 44 && rnd() < 0.5) tryTree(x, z, 'pine');
  }
}
