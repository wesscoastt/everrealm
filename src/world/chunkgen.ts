import { B, isLeaves } from './blocks';
import { growTree, TreeKind } from './generate';
import { fbm2, hash2 } from './noise';
import { chunkRects, inRects, plan, safeZones } from './sites';
import { columnBlocks, columnNoise, deepBlock, GW, heightAt, regionAt, RegionId, RegionSample, REGION_INFO, roadDist, SEA, tintAt } from './terrain';
import { CHUNK, chunkKey, localIdx, SY, WMIN, WSIZE } from './VoxelWorld';
import { createSeededRandom } from '../utils/random';

/** 0 in open country, 1 in the middle of a copse (the outer lands' patches of woodland). */
const smoothCopse = (x: number, z: number) => { const v = fbm2(x / 140, z / 140, 2, 760); return v < 0.6 ? 0 : v > 0.7 ? 1 : (v - 0.6) / 0.1; };

// Generates one streamed chunk outside Hollindale. Pure and deterministic: every worker produces
// identical blocks for the same chunk.

export interface GenTree { kind: TreeKind; x: number; y: number; z: number; trunk: number[]; leaves: number[]; logs: number }
export interface GenOre { kind: 'copper' | 'tin' | 'silver' | 'iron' | 'crystal'; x: number; y: number; z: number }
export interface GenFish { x: number; y: number; z: number; water: 'wend' | 'lake' | 'sea' | 'highland' }
/** Something to pick (game: foraging): blackberries, wild garlic, chanterelles, samphire, bilberries, cloudberries. */
export interface GenForage { x: number; y: number; z: number; kind: string }

export interface GenSpawn { x: number; z: number; region: RegionId; roll: number; animal: boolean; sea?: boolean }

export interface ChunkResult {
  cx: number;
  cz: number;
  data: Uint8Array;
  tint: Float32Array;
  trees: GenTree[];
  ores: GenOre[];
  fish: GenFish[];
  veg: Float32Array;
  /** Stone treads on the roads' steep runs: x, y, z and the way down, four numbers a tread (ChunkManager draws them). */
  steps: Float32Array;
  map: Uint8ClampedArray;
  spawns: GenSpawn[];
  forage: GenForage[];
}

// Heights are precomputed for the chunk plus a one-block border; anything further out (tree
// roots in neighbouring chunks) is computed on demand.
const M = 1;
const AW = CHUNK + M * 2;

export const MAP_COLORS: Record<number, [number, number, number]> = {
  [B.Grass]: [104, 160, 60], [B.Dirt]: [135, 90, 58], [B.Stone]: [128, 130, 136], [B.Cobble]: [140, 138, 132], [B.Sand]: [222, 204, 142],
  [B.Gravel]: [130, 124, 118], [B.Snow]: [236, 242, 248], [B.OakLeaves]: [62, 118, 42], [B.BirchLeaves]: [110, 160, 60], [B.PineLeaves]: [40, 86, 58],
  [B.Path]: [176, 146, 104], [B.StoneBrick]: [150, 150, 154], [B.Farmland]: [92, 64, 40], [B.Plaster]: [200, 120, 90], [B.Timber]: [70, 50, 36],
  [B.DarkPlanks]: [150, 80, 60], [B.Window]: [150, 80, 60], [B.MossyStone]: [104, 128, 88], [B.Planks]: [160, 116, 72], [B.Hay]: [210, 170, 70],
  [B.SnowGrass]: [210, 220, 220], [B.Clay]: [168, 90, 54], [B.MossyCobble]: [110, 130, 96], [B.OakLog]: [100, 70, 44], [B.RedSand]: [196, 104, 56],
  [B.TerraOrange]: [184, 104, 54], [B.TerraCream]: [214, 184, 146], [B.TerraBrown]: [106, 62, 42], [B.Crystal]: [120, 220, 240], [B.Ice]: [168, 208, 234],
  [B.Loam]: [70, 58, 36], [B.Basalt]: [56, 56, 64], [B.IronOre]: [150, 120, 110], [B.CopperOre]: [170, 120, 80], [B.TinOre]: [170, 170, 176],
  [B.PineLog]: [80, 50, 40], [B.BirchLog]: [220, 216, 204], [B.Glowcap]: [80, 180, 200], [B.DeepStone]: [70, 72, 80],
  [B.Mycelium]: [104, 92, 116], [B.MushStem]: [220, 212, 192], [B.CapBrown]: [120, 76, 46], [B.CapInk]: [150, 148, 156], [B.CapRed]: [170, 44, 34], [B.Gills]: [210, 180, 156], [B.CapGlow]: [110, 200, 186],
};

const STONEY = new Set<number>([B.Stone, B.DeepStone, B.TerraOrange, B.TerraBrown, B.TerraCream, B.Basalt, B.MossyStone]);

export const genProfile: Record<string, number> = {};
let _pt = 0;
const mark = (k: string) => { const n = performance.now(); genProfile[k] = (genProfile[k] ?? 0) + n - _pt; _pt = n; };

export function generateChunk(cx: number, cz: number): ChunkResult {
  _pt = performance.now();
  plan();
  const ox = cx * CHUNK, oz = cz * CHUNK;
  const data = new Uint8Array(CHUNK * CHUNK * SY);
  const H = new Int16Array(AW * AW);
  const far = new Map<number, number>();
  const hAt = (x: number, z: number) => {
    const lx = x - ox + M, lz = z - oz + M;
    if (lx >= 0 && lz >= 0 && lx < AW && lz < AW) return H[lx + AW * lz];
    const k = x * 4096 + z;
    let h = far.get(k);
    if (h === undefined) { h = heightAt(x, z); far.set(k, h); }
    return h;
  };
  for (let z = 0; z < AW; z++) for (let x = 0; x < AW; x++) H[x + AW * z] = heightAt(ox + x - M, oz + z - M);

  const rects = chunkRects(cx, cz);
  const tint = new Float32Array(CHUNK * CHUNK * 6);
  const regions: RegionId[] = new Array(CHUNK * CHUNK);
  const roads = new Uint8Array(CHUNK * CHUNK);
  const steps: number[] = [];

  mark("heights");
  // ------------------------------------------------------------ Terrain columns
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const x = ox + lx, z = oz + lz;
    const h = hAt(x, z);
    const rs: RegionSample = regionAt(x, z);
    const reg = rs.a;
    regions[lx + lz * CHUNK] = reg;
    const cn = columnNoise(x, z);
    const rd = roadDist(x, z);
    const road = rd < 1.5 && h > SEA;
    roads[lx + lz * CHUNK] = rd < 4 ? 1 : 0;
    let maxDiff = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) maxDiff = Math.max(maxDiff, h - hAt(x + dx, z + dz));
    const { top } = columnBlocks(x, z, h, maxDiff, reg, road);
    let { sub } = columnBlocks(x, z, h, maxDiff, reg, road);
    // Where the road climbs a block a block, it's a stair: a stone tread half a block high in front
    // of each rise, so the climb reads as steps (walking it is the same: a rise is still one block)
    if (road && maxDiff >= 1) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const lower = hAt(x + dx, z + dz);
        if (h - lower === 1 && (hAt(x - dx, z - dz) > h || h - hAt(x + 2 * dx, z + 2 * dz) >= 2) && roadDist(x + dx, z + dz) < 1.5) steps.push(x + dx + 0.5 - dx * 0.25, lower, z + dz + 0.5 - dz * 0.25, Math.atan2(dx, dz));
      }
      sub = B.Stone;
    }
    for (let y = 0; y < h; y++) {
      let id: number;
      if (y === h - 1) id = top;
      else if (y >= h - 4) id = sub;
      else id = deepBlock(x, y, z, reg, cn);
      data[localIdx(lx, y, lz)] = id;
    }
    for (let y = h; y < SEA; y++) data[localIdx(lx, y, lz)] = y === SEA - 1 && reg === 'starfall' && h >= SEA - 3 ? B.Ice : B.Water;
    const g = tintAt(x, z, false, rs), l = tintAt(x, z, true, rs);
    tint.set([g[0], g[1], g[2], l[0], l[1], l[2]], (lz * CHUNK + lx) * 6);
  }

  mark("columns");
  // ------------------------------------------------------------ Ore seams in exposed rock
  const ores: GenOre[] = [];
  const ORE_TABLE: Record<RegionId, [GenOre['kind'], number][]> = {
    greenwake: [], crownroad: [['tin', 0.0025], ['copper', 0.0015]], brambledeep: [['silver', 0.0015], ['copper', 0.0015]],
    saltwind: [['tin', 0.003], ['iron', 0.0015]], redstone: [['copper', 0.004], ['iron', 0.0045]], starfall: [['iron', 0.003], ['silver', 0.002]],
    gannet: [['tin', 0.002], ['copper', 0.0015]], wrath: [], tolmen: [['tin', 0.003], ['silver', 0.0025], ['iron', 0.002]],
    inkholm: [['silver', 0.0015]],
  };
  const ORE_BLOCK: Record<GenOre['kind'], number> = { copper: B.CopperOre, tin: B.TinOre, silver: B.SilverOre, iron: B.IronOre, crystal: B.Crystal };
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const x = ox + lx, z = oz + lz;
    const h = hAt(x, z);
    const table = ORE_TABLE[regions[lx + lz * CHUNK]];
    if (!table.length) continue;
    for (let y = Math.max(SEA, h - 7); y < h; y++) {
      const id = data[localIdx(lx, y, lz)];
      if (!STONEY.has(id)) continue;
      let exposed = false;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (hAt(x + dx, z + dz) <= y) exposed = true;
      if (!exposed) continue;
      const r = hash2(x * 3 + y, z, 700);
      let acc = 0;
      for (const [kind, p] of table) {
        acc += p * 12;
        if (r < acc) { data[localIdx(lx, y, lz)] = ORE_BLOCK[kind]; ores.push({ kind, x, y, z }); break; }
      }
    }
  }

  mark("ores");
  // ------------------------------------------------------------ Trees (including ones rooted in neighbours)
  const trees: GenTree[] = [];
  const sink = {
    get: (x: number, y: number, z: number) => {
      const lx = x - ox, lz = z - oz;
      if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y < 0 || y >= SY) return B.Air;
      return data[localIdx(lx, y, lz)];
    },
    put: (x: number, y: number, z: number, id: number) => {
      const lx = x - ox, lz = z - oz;
      if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y < 0 || y >= SY) return;
      data[localIdx(lx, y, lz)] = id;
    },
  };
  const CELLT = 5;
  // Trees rooted in the neighbouring chunks reach in with their crowns: grow every tree whose
  // crown can touch this chunk (an ancient's is eleven across from the trunk), keeping what lands here
  const TM = 13;
  const candidates: { x: number; z: number; kind: TreeKind; seed: number }[] = [];
  const gx0 = Math.floor((ox - TM) / CELLT), gx1 = Math.floor((ox + CHUNK + TM) / CELLT);
  const gz0 = Math.floor((oz - TM) / CELLT), gz1 = Math.floor((oz + CHUNK + TM) / CELLT);
  for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
    const x = gx * CELLT + Math.floor(hash2(gx, gz, 710) * CELLT);
    const z = gz * CELLT + Math.floor(hash2(gx, gz, 711) * CELLT);
    if (x < ox - TM || x >= ox + CHUNK + TM || z < oz - TM || z >= oz + CHUNK + TM) continue;
    if (x < GW + 2 && z < GW + 2) continue;
    const reg = regionAt(x, z).a;
    const h = hAt(x, z);
    if (h <= SEA + 1) continue;
    const density: Record<RegionId, number> = { greenwake: 0.1, crownroad: 0.07, brambledeep: 0.7, saltwind: 0.12, redstone: 0.03, starfall: 0.3, gannet: 0.04, wrath: 0.06, tolmen: 0.03, inkholm: 0.62 };
    const forest = hash2(Math.floor(x / 60), Math.floor(z / 60), 712) * 0.18;
    // The outer lands grow their trees in copses: beech hangers on the downs, willow clumps in the marsh, stands on the moor
    const copse = reg === 'gannet' || reg === 'wrath' || reg === 'tolmen' ? smoothCopse(x, z) * (reg === 'gannet' ? 0.55 : reg === 'wrath' ? 0.3 : 0.18) : 0;
    if (hash2(gx, gz, 713) > density[reg] + copse + (reg === 'crownroad' || reg === 'saltwind' ? forest : 0)) continue;
    let steep = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) steep = Math.max(steep, Math.abs(h - hAt(x + dx, z + dz)));
    if (steep > 1) continue;
    if (roadDist(x, z) < 4) continue;
    if (inRects(chunkRects(x >> 5, z >> 5), x, z, 2)) continue;
    let kind: TreeKind = 'oak';
    const k = hash2(gx, gz, 714);
    // Inkholm grows mushrooms, not trees: broad caps, ink caps in the damp, lantern caps here and there
    if (reg === 'inkholm') { if (h <= SEA + 3) continue; kind = k < 0.48 ? 'capshroom' : k < 0.8 ? 'inkcap' : 'lanterncap'; }
    else if (reg === 'starfall' || h > 50) kind = h > 62 ? 'pine' : k < 0.85 ? 'pine' : 'birch';
    // Hagworm Wood: an ancient every twenty blocks or so, giants between, oak and birch under them
    else if (reg === 'brambledeep') kind = gx % 4 === 0 && gz % 4 === 0 && k < 0.45 ? 'ancient' : k < 0.3 && gx % 2 === 0 && gz % 2 === 0 ? 'giant' : k < 0.45 ? 'birch' : 'oak';
    else if (reg === 'saltwind') kind = k < 0.6 ? 'pine' : 'oak';
    else if (reg === 'redstone') kind = 'pine';
    else if (reg === 'wrath') kind = 'birch';
    else kind = k < 0.25 ? 'birch' : 'oak';
    // An ancient needs room for its roots and crown: near a road or a building it grows as a giant
    if (kind === 'ancient' && (roadDist(x, z) < 10 || inRects(chunkRects(x >> 5, z >> 5), x, z, 8))) kind = 'giant';
    if (h > 66) continue;
    candidates.push({ x, z, kind, seed: Math.floor(hash2(x, z, 715) * 1e9) });
  }
  candidates.sort((a, b) => a.x - b.x || a.z - b.z);
  for (const c of candidates) {
    const y = hAt(c.x, c.z);
    const groundId = sink.get(c.x, y - 1, c.z);
    if (groundId !== B.Air) sink.put(c.x, y - 1, c.z, B.Dirt);
    const t = growTree(sink, c.kind, c.x, y, c.z, createSeededRandom(c.seed));
    const inside = c.x >= ox && c.x < ox + CHUNK && c.z >= oz && c.z < oz + CHUNK;
    if (inside) trees.push({ kind: c.kind, x: c.x, y, z: c.z, trunk: t.trunk.flat(), leaves: t.leaves.flat(), logs: t.logs });
  }

  mark("trees");
  // ------------------------------------------------------------ Sites (buildings carve trees and terrain)
  const ov = plan().overrides.map.get(chunkKey(cx, cz));
  if (ov) {
    for (let i = 0; i < ov.length; i += 2) {
      data[ov[i]] = ov[i + 1];
      const id = ov[i + 1];
      if (id === B.CopperOre || id === B.TinOre || id === B.SilverOre || id === B.IronOre) {
        const li = ov[i];
        const lx = li % CHUNK, lz = Math.floor(li / CHUNK) % CHUNK, y = Math.floor(li / (CHUNK * CHUNK));
        ores.push({ kind: id === B.CopperOre ? 'copper' : id === B.TinOre ? 'tin' : id === B.SilverOre ? 'silver' : 'iron', x: ox + lx, y, z: oz + lz });
      }
    }
  }
  // Crystal outcrops count as ore in Scarth
  for (let lz = 0; lz < CHUNK; lz += 2) for (let lx = 0; lx < CHUNK; lx += 2) {
    const x = ox + lx, z = oz + lz;
    if (regions[lx + lz * CHUNK] !== 'starfall') continue;
    const h = hAt(x, z);
    if (h < 52 || hash2(x, z, 720) > 0.012 || inRects(rects, x, z)) continue;
    for (let y = 0; y < 2 + Math.floor(hash2(x, z, 721) * 3); y++) data[localIdx(lx, h + y, lz)] = B.Crystal;
    ores.push({ kind: 'crystal', x, y: h, z });
  }
  // Ores swallowed by trees or buildings are dropped
  const liveOres = ores.filter((o) => {
    const id = data[localIdx(o.x - ox, o.y, o.z - oz)];
    return id === ORE_BLOCK[o.kind];
  });

  mark("sites");
  // ------------------------------------------------------------ Surface pass: fish, grass, map, spawns
  const fish: GenFish[] = [];
  const forage: GenForage[] = [];
  const veg: number[] = [];
  // What each region grows to pick, and on what ground (sand: samphire, by the sea)
  const FORAGE: Partial<Record<RegionId, string[]>> = {
    greenwake: ['blackberries', 'wild_garlic', 'wild_garlic'], crownroad: ['blackberries', 'wild_garlic', 'wild_garlic'], brambledeep: ['chanterelles', 'wild_garlic', 'wild_garlic', 'blackberries'],
    saltwind: ['blackberries'], starfall: ['bilberries', 'cloudberries'], gannet: ['blackberries'], wrath: ['chanterelles'], tolmen: ['bilberries', 'cloudberries'],
    inkholm: ['chanterelles', 'chanterelles', 'wild_garlic'],
  };
  const FORAGE_TINT: Record<string, [number, number, number, number]> = {
    blackberries: [10, 1, 1, 1], bilberries: [13, 1, 1, 1], cloudberries: [14, 1, 1, 1],
    wild_garlic: [12, 1, 1, 1], samphire: [12, 0.6, 0.95, 0.55], chanterelles: [11, 1, 1, 1],
  };
  const map = new Uint8ClampedArray(CHUNK * CHUNK * 4);
  const tops = new Int16Array(CHUNK * CHUNK);
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    let y = SY - 1;
    for (; y >= 0; y--) { const id = data[localIdx(lx, y, lz)]; if (id !== B.Air && id !== B.Barrier) break; }
    tops[lx + lz * CHUNK] = y;
  }
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const x = ox + lx, z = oz + lz;
    const y = tops[lx + lz * CHUNK];
    const id = y >= 0 ? data[localIdx(lx, y, lz)] : B.Stone;
    const reg = regions[lx + lz * CHUNK];
    // Map colour with hill shading
    let col: [number, number, number];
    if (id === B.Water) {
      let d = 0;
      while (d < 8 && y - d >= 0 && data[localIdx(lx, y - d, lz)] === B.Water) d++;
      col = [70 - d * 6, 150 - d * 10, 200 - d * 6];
    } else col = MAP_COLORS[id] ?? [120, 120, 120];
    if (id === B.Grass || isLeaves(id)) {
      const t = tint.subarray((lz * CHUNK + lx) * 6 + (isLeaves(id) ? 3 : 0));
      col = [col[0] * t[0], col[1] * t[1], col[2] * t[2]];
    }
    const yN = lz > 0 ? tops[lx + (lz - 1) * CHUNK] : y, yW = lx > 0 ? tops[lx - 1 + lz * CHUNK] : y;
    const shade = 1 + (y - (yN + yW) / 2) * 0.06 + (y - 22) * 0.005;
    const mi = (lz * CHUNK + lx) * 4;
    map[mi] = col[0] * shade; map[mi + 1] = col[1] * shade; map[mi + 2] = col[2] * shade; map[mi + 3] = 255;

    const above = y + 1 < SY ? data[localIdx(lx, y + 1, lz)] : B.Air;
    // Crops on farmland, inside settlements too (wild grass and flowers stay out of them)
    if (id === B.Farmland && above === B.Air) {
      const r = hash2(x, z, 909);
      for (let k = 0; k < 2; k++) veg.push(x + 0.25 + k * 0.5, y + 1, z + 0.5 + (r - 0.5) * 0.3, 6, 1 + r * 0.2, r * 3, 1, 1, 1);
      continue;
    }
    if (inRects(rects, x, z)) continue;
    // Fishing spots: open water next to land
    if (id === B.Water && y === SEA - 1 && fish.length < 2 && hash2(x, z, 730) < 0.03) {
      let shore = false;
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (hAt(x + dx, z + dz) > SEA) shore = true;
      if (shore) fish.push({ x: x + 0.5, y: SEA, z: z + 0.5, water: REGION_INFO[reg].water === 'river' ? 'wend' : REGION_INFO[reg].water });
    }
    // The sea bed: kelp forests in water four to fourteen deep, sea grass in the sandy shallows
    if (id === B.Water && y === SEA - 1) {
      let fl = y;
      while (fl > 0 && data[localIdx(lx, fl, lz)] === B.Water) fl--;
      const depth = SEA - 1 - fl, bed = data[localIdx(lx, fl, lz)], r = hash2(x, z, 913);
      if (bed !== B.Sand && bed !== B.Gravel && bed !== B.Stone && bed !== B.Dirt && bed !== B.Clay) continue;
      const forest = fbm2(x / 70, z / 70, 2, 914);
      if (depth >= 4 && depth <= 14 && forest > 0.56 && r < (forest - 0.52) * 2.2) {
        const tall = Math.min(depth - 1.2, 2.5 + hash2(x, z, 915) * (depth - 2.5)); // never up through the surface
        veg.push(x + 0.2 + r * 0.6, fl + 1, z + 0.2 + hash2(x, z, 916) * 0.6, 8, tall, r * 6.28, 0.85 + r * 0.3, 0.9 + r * 0.2, 0.85);
      } else if (depth >= 1 && depth <= 5 && bed === B.Sand && r < 0.18) {
        veg.push(x + 0.5, fl + 1, z + 0.5, 9, 0.9 + r * 2, r * 31, 1, 1, 1);
      }
      continue;
    }
    if (above !== B.Air) continue;
    const r = hash2(x, z, 909), r2 = hash2(x, z, 910);
    // Forage: about four to a chunk, off the roads
    // (samphire is likelier: there are few beach columns to a chunk)
    if (forage.length < 5 && hash2(x, z, 917) < (id === B.Sand ? 0.03 : 0.0045) && !roads[lx + lz * CHUNK]) {
      const list = (id === B.Sand && y + 1 <= SEA + 2) ? ['samphire'] : (id === B.Grass || id === B.SnowGrass || id === B.Loam || id === B.Mycelium) ? FORAGE[reg] : undefined;
      if (list?.length) {
        const kind = list[Math.floor(hash2(x * 7 + 3, z * 13 + 5, 951) * list.length)], t = FORAGE_TINT[kind];
        forage.push({ x: x + 0.5, y: y + 1, z: z + 0.5, kind });
        veg.push(x + 0.5, y + 1, z + 0.5, t[0], 1.15, r * 6.28, t[1], t[2], t[3]);
        continue;
      }
    }
    const t = tint.subarray((lz * CHUNK + lx) * 6);
    if (id === B.Mycelium) {
      // Inkholm's floor: pale tufts, and small mushrooms in every colour the Holm grows
      if (r < 0.32) veg.push(x + 0.2 + r * 0.6, y + 1, z + 0.2 + r2 * 0.6, r2 < 0.3 ? 1 : 0, 0.8 + r2 * 0.4, r * 6.28, 0.82, 0.78, 0.9);
      else if (r < 0.5) {
        const c = Math.floor(hash2(Math.floor(x / 7), Math.floor(z / 7), 918) * 4);
        const tints: [number, number, number][] = [[1, 1, 1], [0.78, 0.74, 0.86], [1.25, 0.55, 0.45], [0.95, 0.85, 0.7]];
        const tt = tints[c];
        veg.push(x + 0.5, y + 1, z + 0.5, 11, 0.7 + r2 * 0.9, r * 6.28, tt[0], tt[1], tt[2]);
      }
    } else if (id === B.Grass || id === B.SnowGrass || id === B.Loam) {
      const dens: Record<RegionId, number> = { greenwake: 0.4, crownroad: 0.42, brambledeep: 0.55, saltwind: 0.38, redstone: 0.18, starfall: 0.22, gannet: 0.42, wrath: 0.6, tolmen: 0.3, inkholm: 0.4 };
      if (r < dens[reg] && id !== B.SnowGrass) {
        const tall = r2 < (reg === 'brambledeep' ? 0.55 : 0.18);
        veg.push(x + 0.2 + r * 0.6, y + 1, z + 0.2 + r2 * 0.6, tall ? 1 : 0, 0.9 + r2 * 0.5, r * 6.28, t[0], t[1], t[2]);
      }
      const patch = hash2(Math.floor(x / 9), Math.floor(z / 9), 911);
      if (patch > 0.78 && r2 < 0.35 && reg !== 'starfall') {
        const species = reg === 'brambledeep' ? 3 : reg === 'redstone' ? 4 : 2 + Math.floor(hash2(Math.floor(x / 40), Math.floor(z / 40), 912) * 4);
        veg.push(x + 0.5, y + 1, z + 0.5, Math.min(5, species), 0.8, r2 * 6.28, 1, 1, 1);
      }
    } else if ((id === B.Sand || id === B.RedSand) && y + 1 <= SEA + 2 && r < 0.25) {
      veg.push(x + 0.5, y + 1, z + 0.5, 7, 1 + r2 * 0.3, r * 6, 1, 1, 1);
    } else if (id === B.RedSand && r < 0.08) {
      veg.push(x + 0.5, y + 1, z + 0.5, 0, 0.8, r * 6, 1.3, 0.9, 0.5);
    }
  }

  // Creature spawn points (types chosen on the main thread from the region tables)
  const spawns: GenSpawn[] = [];
  for (let i = 0; i < 3; i++) {
    const roll = hash2(cx * 7 + i, cz, 740);
    if (roll > (i === 2 ? 0.35 : 0.55)) continue;
    const lx = Math.floor(hash2(cx, cz + i * 13, 741) * 28) + 2, lz = Math.floor(hash2(cx + i * 17, cz, 742) * 28) + 2;
    const x = ox + lx, z = oz + lz;
    const y = tops[lx + lz * CHUNK];
    const id = data[localIdx(lx, Math.max(0, y), lz)];
    if (id === B.Water || id === B.Ice || roads[lx + lz * CHUNK] || inRects(rects, x, z, 6)) continue;
    if (x < GW + 20 && z < GW + 20) continue;
    if (i !== 2 && safeZones().some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r)) continue;
    spawns.push({ x: x + 0.5, z: z + 0.5, region: regions[lx + lz * CHUNK], roll: hash2(x, z, 743), animal: i === 2 });
  }
  // Sea creatures, in open water at least six deep (never in a harbour or off a bathing beach)
  for (let i = 0; i < 2; i++) {
    if (hash2(cx * 11 + i, cz, 744) > 0.32) continue; // sparser than on land: the sea is open and you see far
    const lx = Math.floor(hash2(cx, cz + i * 19, 745) * 28) + 2, lz = Math.floor(hash2(cx + i * 23, cz, 746) * 28) + 2;
    const x = ox + lx, z = oz + lz;
    if (tops[lx + lz * CHUNK] !== SEA - 1 || data[localIdx(lx, SEA - 1, lz)] !== B.Water) continue;
    let floor = SEA - 1;
    while (floor > 0 && data[localIdx(lx, floor, lz)] === B.Water) floor--;
    if (SEA - 1 - floor < 6 || inRects(rects, x, z, 16)) continue;
    if (safeZones().some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + 30)) continue;
    spawns.push({ x: x + 0.5, z: z + 0.5, region: regions[lx + lz * CHUNK], roll: hash2(x, z, 747), animal: false, sea: true });
  }

  mark("surface");
  return { cx, cz, data, tint, trees, ores: liveOres, fish, forage, veg: new Float32Array(veg), steps: new Float32Array(steps), map, spawns };
}

/** Coarse heights and colours for the far-terrain mesh (step 8 over the whole world, from WMIN). */
export function generateLod(step: number): { heights: Float32Array; colors: Uint8Array; n: number } {
  plan();
  const n = Math.floor(WSIZE / step) + 1;
  const heights = new Float32Array(n * n);
  const colors = new Uint8Array(n * n * 3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = WMIN + Math.min(WSIZE - 1, i * step), z = WMIN + Math.min(WSIZE - 1, j * step);
    const h = heightAt(x, z);
    heights[i + j * n] = h;
    const reg = regionAt(x, z).a;
    let c: [number, number, number];
    if (h <= SEA) c = [60, 120, 170];
    else {
      const { top } = columnBlocks(x, z, h, 0, reg, false);
      c = MAP_COLORS[top] ?? [110, 140, 80];
      if (top === B.Grass) { const t = tintAt(x, z, false); c = [c[0] * t[0] * 0.72, c[1] * t[1] * 0.72, c[2] * t[2] * 0.72]; }
      if (reg === 'brambledeep' || (reg === 'starfall' && h < 60)) c = [c[0] * 0.6, c[1] * 0.75, c[2] * 0.6];
    }
    colors.set(c.map((v) => Math.max(0, Math.min(255, v))), (i + j * n) * 3);
  }
  return { heights, colors, n };
}
