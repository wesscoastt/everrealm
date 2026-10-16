import { B } from './blocks';
import { fbm2, hash2, smoothstep, valueNoise } from './noise';

// Pure, deterministic terrain for the whole continent outside the authored Hollindale grid.
// Shared by generation workers (blocks) and the main thread (LOD, labels, placement).
// The continent fills the old 0..2048 square and runs out past its north, west and south edges
// to a coast all round (coastDist); the world itself spans WMIN..WMAX in VoxelWorld.ts.

export const WORLD = 2048;
export const SEA = 16;
export const GW = 320; // Hollindale grid size; x,z < GW is authored terrain

export type RegionId = 'greenwake' | 'crownroad' | 'brambledeep' | 'saltwind' | 'redstone' | 'starfall';

export interface RegionInfo {
  id: RegionId;
  name: string;
  levels: string;
  tint: [number, number, number];
  leafTint: [number, number, number];
  water: 'river' | 'lake' | 'sea' | 'highland';
}

export const REGION_INFO: Record<RegionId, RegionInfo> = {
  greenwake: { id: 'greenwake', name: 'Hollindale', levels: '1–7', tint: [1.04, 1.0, 0.88], leafTint: [1, 1, 1], water: 'river' },
  crownroad: { id: 'crownroad', name: 'Turnpike', levels: '5–12', tint: [1.12, 1.04, 0.78], leafTint: [1.06, 1.02, 0.86], water: 'lake' },
  brambledeep: { id: 'brambledeep', name: 'Hagworm Wood', levels: '10–16', tint: [0.7, 0.86, 0.76], leafTint: [0.66, 0.8, 0.72], water: 'lake' },
  saltwind: { id: 'saltwind', name: 'Fleet Coast', levels: '12–20', tint: [0.98, 1.04, 0.9], leafTint: [0.92, 1.0, 0.95], water: 'sea' },
  redstone: { id: 'redstone', name: 'Raddle Barrens', levels: '16–24', tint: [1.22, 0.96, 0.66], leafTint: [1.1, 0.95, 0.75], water: 'river' },
  starfall: { id: 'starfall', name: 'Scarth Highlands', levels: '25–35', tint: [0.84, 0.98, 1.04], leafTint: [0.8, 0.95, 1.0], water: 'highland' },
};

// Seeds of each region; several per region shape them into irregular territories.
const SEEDS: { id: RegionId; x: number; z: number }[] = [
  { id: 'greenwake', x: 150, z: 150 },
  { id: 'crownroad', x: 620, z: 220 }, { id: 'crownroad', x: 900, z: 380 }, { id: 'crownroad', x: 560, z: 560 },
  { id: 'brambledeep', x: 230, z: 640 }, { id: 'brambledeep', x: 380, z: 900 }, { id: 'brambledeep', x: 140, z: 1080 },
  { id: 'saltwind', x: 1560, z: 380 }, { id: 'saltwind', x: 1640, z: 900 }, { id: 'saltwind', x: 1300, z: 120 },
  { id: 'redstone', x: 980, z: 1000 }, { id: 'redstone', x: 1260, z: 1260 }, { id: 'redstone', x: 780, z: 1240 },
  { id: 'starfall', x: 420, z: 1660 }, { id: 'starfall', x: 960, z: 1820 }, { id: 'starfall', x: 1560, z: 1760 }, { id: 'starfall', x: 160, z: 1460 },
];

export interface RegionSample { a: RegionId; b: RegionId; t: number }

const warpX = (x: number, z: number) => x + (fbm2(x / 330, z / 330, 3, 901) - 0.5) * 300;
const warpZ = (x: number, z: number) => z + (fbm2(x / 330 + 40, z / 330, 3, 902) - 0.5) * 300;

export function regionAt(x: number, z: number): RegionSample {
  if (x < GW && z < GW) return { a: 'greenwake', b: 'greenwake', t: 0 };
  const wx = warpX(x, z), wz = warpZ(x, z);
  let d1 = Infinity, d2 = Infinity, r1: RegionId = 'crownroad', r2: RegionId = 'crownroad';
  for (const s of SEEDS) {
    if (s.id === 'greenwake') continue;
    const d = Math.hypot(wx - s.x, wz - s.z);
    if (d < d1) {
      if (r1 !== s.id) { d2 = d1; r2 = r1; }
      d1 = d; r1 = s.id;
    } else if (d < d2 && s.id !== r1) { d2 = d; r2 = s.id; }
  }
  // Blend across a ~70 block border
  const t = 0.5 * (1 - smoothstep(0, 70, d2 - d1));
  return { a: r1, b: r2, t };
}

// ------------------------------------------------------------------ Rivers and roads

export const RIVERS: [number, number][][] = [
  // The Wend leaves the vale and cuts a ravine south through Hagworm Wood to Peg's Water.
  [[259, 312], [266, 360], [300, 430], [340, 520], [372, 620], [396, 720], [410, 820], [420, 880]],
  // The Rill runs off Scarth through the Raddle canyons to the sea.
  [[860, 1560], [930, 1430], [1040, 1320], [1180, 1240], [1330, 1120], [1470, 1010], [1620, 940], [1780, 900], [1900, 880]],
];

export const LAKES: { x: number; z: number; r: number; name: string }[] = [
  { x: 430, z: 920, r: 48, name: 'Peg\'s Water' },
  { x: 700, z: 640, r: 26, name: 'Millpond' },
  { x: 520, z: 1470, r: 30, name: 'Coldwater Tarn' },
];

export const WORLD_ROADS: [number, number][][] = [
  // Hollindale east road to Ansbury's west gate
  [[320, 197], [380, 205], [460, 228], [560, 250], [660, 280], [748, 300]],
  // Ansbury east gate to Gullmouth
  [[892, 300], [1000, 320], [1140, 360], [1300, 420], [1460, 520], [1600, 590], [1680, 600]],
  // Ansbury south gate down the Turnpike to the Waystation and Harrowgate Works
  [[820, 372], [800, 440], [740, 500], [690, 560], [700, 700], [780, 820], [880, 930], [970, 990]],
  // Hollindale south road through Hagworm Wood
  [[232, 320], [250, 400], [230, 520], [260, 640], [300, 760], [330, 880], [300, 1000], [250, 1140], [270, 1300], [300, 1440]],
  // Harrowgate Works east to the coast road
  [[1030, 1000], [1160, 960], [1300, 900], [1440, 820], [1560, 700], [1640, 620]],
  // Highland track from Kelderby to Scarth Watch and the Kirk
  [[300, 1440], [420, 1520], [560, 1620], [600, 1690], [760, 1760], [960, 1800], [1180, 1790]],
  // Waystation west to Hagworm Wood's woodcutters
  [[690, 560], [580, 560], [460, 530], [330, 560], [260, 640]],
];

/** Precomputed segment boxes so per-column distance tests only touch nearby segments. */
interface Seg { ax: number; az: number; bx: number; bz: number; minX: number; maxX: number; minZ: number; maxZ: number }
function segs(lines: [number, number][][], pad: number): Seg[] {
  const out: Seg[] = [];
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) {
    const [ax, az] = l[i], [bx, bz] = l[i + 1];
    out.push({ ax, az, bx, bz, minX: Math.min(ax, bx) - pad, maxX: Math.max(ax, bx) + pad, minZ: Math.min(az, bz) - pad, maxZ: Math.max(az, bz) + pad });
  }
  return out;
}
const RIVER_SEGS = segs(RIVERS, 40);
const ROAD_SEGS = segs(WORLD_ROADS, 12);

function segDist(px: number, pz: number, list: Seg[]): number {
  let best = Infinity;
  for (const s of list) {
    if (px < s.minX || px > s.maxX || pz < s.minZ || pz > s.maxZ) continue;
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    const l2 = dx * dx + dz * dz;
    let t = l2 ? ((px - s.ax) * dx + (pz - s.az) * dz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t));
    if (d < best) best = d;
  }
  return best;
}

export function roadDist(x: number, z: number): number {
  // Roads wobble a little so they don't look ruled
  return segDist(x + (valueNoise(x / 14, z / 14, 77) - 0.5) * 3, z, ROAD_SEGS);
}

export function riverDist(x: number, z: number): number {
  return segDist(x + (fbm2(x / 40, z / 40, 2, 55) - 0.5) * 10, z, RIVER_SEGS);
}

/**
 * x of the Fleet shoreline at a given z. Gullmouth, the Light and the wreck sit on the stretch
 * from z 250 to 900; north of it a cape juts out, and south of it the sea cuts a long gulf.
 */
export function coastX(z: number): number {
  return 1740 + (fbm2(z / 210, 3.7, 3, 14) - 0.5) * 260 + smoothstep(220, 0, Math.abs(z + 40)) * 150 - smoothstep(300, 0, Math.abs(z - 1480)) * 280;
}

/** Smooth minimum: rounds the corner where two shores meet into a headland or a bay. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
const bump = (v: number, c: number, r: number) => smoothstep(r, 0, Math.abs(v - c));

/**
 * Distance inland from the north, west and south shores (negative out at sea). Ragged lines
 * with a bay on the west coast below Hagworm Wood and headlands to the north and south.
 */
export function coastDistWNS(x: number, z: number): number {
  // Broad ragged shores, then the named features: a western cape and bay, a northern bay between
  // two headlands, and a southern headland beside a deep bay under the Kirk's plateau.
  const west = x - (-170 + (fbm2(z / 340, 1.3, 3, 701) - 0.5) * 300 + bump(z, 1250, 230) * 160 - bump(z, 640, 200) * 150 - bump(z, 1760, 150) * 90);
  const north = z - (-170 + (fbm2(x / 340, 2.9, 3, 702) - 0.5) * 300 - bump(x, 1050, 190) * 160 + bump(x, 470, 160) * 120 - bump(x, 1600, 170) * 110);
  const south = 2210 + (fbm2(x / 340, 4.1, 3, 703) - 0.5) * 300 + bump(x, 650, 170) * 150 - bump(x, 1300, 220) * 170 + bump(x, 1850, 160) * 90 - z;
  return smin(smin(west, north, 170), south, 170);
}

/** Distance inland from the nearest shore of the continent, the Fleet coast included. */
export function coastDist(x: number, z: number): number {
  return smin(coastDistWNS(x, z), coastX(z) + 36 - x, 170);
}

/**
 * The sea floor, shelving away from the shore (off = blocks out to sea), with an occasional sea
 * stack within reach of the coast: a wide, wave-cut foot narrowing to a craggy top.
 */
function seaBed(x: number, z: number, off: number): number {
  const n2 = fbm2(x / 55, z / 55, 3, 12);
  const floor = Math.max(3, SEA - 3 - Math.min(9, off * 0.12) - n2 * 3);
  if (off < 6 || off > 130) return floor;
  const sx = Math.floor(x / 9), sz = Math.floor(z / 9);
  const stack = hash2(sx, sz, 16);
  if (stack <= 0.985) return floor;
  const ox = sx * 9 + 4.5 + (hash2(sx, sz, 17) - 0.5) * 1.4, oz = sz * 9 + 4.5 + (hash2(sx, sz, 18) - 0.5) * 1.4;
  const a = Math.atan2(z + 0.5 - oz, x + 0.5 - ox);
  const d = Math.hypot(x + 0.5 - ox, z + 0.5 - oz) / (1 + 0.22 * Math.sin(a * 3 + stack * 40));
  const top = 30 + ((stack * 400) % 10);
  if (d > 4.4) return floor;
  const h = d < 1.5 ? top - (n2 - 0.5) * 3 : top - (d - 1.5) * 4.2 - n2 * 3;
  return Math.max(floor, d > 3.4 ? Math.min(h, SEA + 2 + (4.4 - d) * 2) : h);
}

/**
 * Hollindale's own ground (the grid's surface before its authored features): rolling vale and the
 * rim of mountains round its north and west. Outside the grid it carries the rim on toward the coast.
 */
export function valeSurface(x: number, z: number): number {
  let h = 20 + (fbm2(x / 52, z / 52, 4, 1) - 0.5) * 9 + (fbm2(x / 14, z / 14, 2, 5) - 0.5) * 2.2;
  const edge = Math.min(x, z);
  h += smoothstep(44, 4, edge) * (14 + fbm2(x / 24, z / 24, 4, 9) * 26);
  return h;
}

export function lakeDist(x: number, z: number): number {
  let best = Infinity;
  for (const l of LAKES) best = Math.min(best, Math.hypot(x - l.x, (z - l.z) * 1.2) - l.r);
  return best;
}

// ------------------------------------------------------------------ Flatten zones from sites

export interface Flatten { x: number; z: number; r0: number; r1: number; h: number }
let FLATTEN: Flatten[] = [];
const FLAT_CELL = 64;
let FLAT_BUCKETS = new Map<number, Flatten[]>();
export function setFlattenZones(z: Flatten[]): void {
  FLATTEN = z;
  // Bucket zones by 64-block cell so each column only checks the few that can touch it
  FLAT_BUCKETS = new Map();
  for (const f of z) {
    for (let cz = Math.floor((f.z - f.r1) / FLAT_CELL); cz <= Math.floor((f.z + f.r1) / FLAT_CELL); cz++)
      for (let cx = Math.floor((f.x - f.r1) / FLAT_CELL); cx <= Math.floor((f.x + f.r1) / FLAT_CELL); cx++) {
        const k = cx + cz * 1000;
        if (!FLAT_BUCKETS.has(k)) FLAT_BUCKETS.set(k, []);
        FLAT_BUCKETS.get(k)!.push(f);
      }
  }
}

// ------------------------------------------------------------------ Heights

function regionHeight(id: RegionId, x: number, z: number): number {
  const n1 = fbm2(x / 190, z / 190, 4, 11);
  const n2 = fbm2(x / 55, z / 55, 3, 12);
  switch (id) {
    case 'greenwake':
      return 21 + (n1 - 0.5) * 10;
    case 'crownroad':
      return 22 + (n1 - 0.5) * 14 + (n2 - 0.5) * 3;
    case 'brambledeep': {
      const dell = fbm2(x / 90, z / 90, 2, 13);
      return 27 + (n1 - 0.5) * 20 + (n2 - 0.5) * 9 - smoothstep(0.6, 0.8, dell) * 8;
    }
    case 'saltwind': {
      const land = 25 + (n1 - 0.5) * 16 + (n2 - 0.5) * 4;
      const coast = coastX(z);
      const dx = x - coast;
      if (dx < -36) return land;
      const cliffy = fbm2(z / 80, x / 400, 2, 15) > 0.52;
      if (dx > 40) return seaBed(x, z, dx - 36);
      if (cliffy) return dx < 0 ? land : 6 + n2 * 4;
      return land + (SEA + 0.6 - land) * smoothstep(-36, 6, dx) - smoothstep(6, 40, dx) * 9;
    }
    case 'redstone': {
      const m = fbm2(x / 150, z / 150, 3, 17);
      let h = 23 + (n2 - 0.5) * 4;
      if (m > 0.5) {
        const lift = (m - 0.5) * 140;
        h += Math.floor(lift / 7) * 7 + Math.min(3, (lift % 7) * 2); // stepped mesa terraces with crisp edges
      }
      const canyon = Math.abs(fbm2(x / 230, z / 230, 3, 18) - 0.5);
      if (canyon < 0.035) h = Math.min(h, 17 + canyon * 60);
      return h;
    }
    case 'starfall': {
      const r = 1 - Math.abs(fbm2(x / 260, z / 260, 4, 19) * 2 - 1);
      return 38 + r * r * 52 + (n2 - 0.5) * 10 + (n1 - 0.5) * 8;
    }
  }
}

/** Base terrain height before site flattening (also used to place sites). */
export function baseHeight(x: number, z: number): number {
  const r = regionAt(x, z);
  let h = regionHeight(r.a, x, z);
  if (r.t > 0.001) h = h + (regionHeight(r.b, x, z) - h) * r.t;

  // Hills ringing Hollindale, broken by passes where the roads leave.
  const gx = x - GW, gz = z - GW;
  if (x < GW + 90 && z < GW + 90 && (gx > -10 || gz > -10)) {
    const band = Math.max(x, z) - GW;
    const ridge = smoothstep(-10, 18, band) * (1 - smoothstep(30, 80, band));
    const passE = 1 - smoothstep(10, 28, Math.abs(z - 200)) * (x > z ? 1 : 0);
    const passS = 1 - smoothstep(10, 28, Math.abs(x - 238)) * (z >= x ? 1 : 0);
    const gap = Math.min(x > z ? passE : 1, z >= x ? passS : 1);
    h += ridge * (10 + fbm2(x / 30, z / 30, 2, 20) * 14) * (1 - (1 - gap));
  }

  // Past the vale's north and west edges its ground carries on, rim mountains and all, so the
  // land beyond meets the authored grid without a seam and falls from the rim to the sea.
  const outV = Math.min(x, z);
  if (outV < 0 && Math.max(x, z) < GW + 60) {
    const w = smoothstep(-110, 0, outV) * (1 - smoothstep(GW - 20, GW + 60, Math.max(x, z)));
    h += (valeSurface(x, z) - h) * w;
  }

  // A coastal range a little way back from the north, west and south shores
  const dRange = coastDistWNS(x, z);
  h += smoothstep(30, 80, dRange) * (1 - smoothstep(120, 190, dRange)) * (12 + fbm2(x / 30, z / 30, 3, 21) * 26);

  // The shore: beaches, or cliffs where the rock comes down to the water; the sea floor beyond
  const dc = coastDist(x, z);
  if (dc < 170) {
    if (dc < 0) h = seaBed(x, z, -dc);
    else h = Math.min(h, fbm2(x / 110, z / 110, 2, 704) > 0.55 ? SEA + 3 + dc * 1.4 : SEA + 0.6 + dc * 0.32);
  }

  // Rivers carve ravines
  const rd = riverDist(x, z);
  if (rd < 24) {
    const w = 3.5 + fbm2(x / 30, z / 30, 1, 22) * 2.5;
    if (rd < w) h = SEA - 2 - (1 - rd / w) * 2;
    else h = Math.min(h, SEA + 0.5 + (rd - w) * 1.1);
  }
  for (const l of LAKES) {
    const d = Math.hypot(x - l.x, (z - l.z) * 1.2) - l.r * (0.85 + fbm2(x / 20, z / 20, 1, 23) * 0.3);
    if (d < 0) h = Math.min(h, SEA - 2 + d * 0.15);
    else if (d < 14) h = Math.min(h, SEA + 0.5 + d * 0.6);
  }
  return h;
}

export function heightAt(x: number, z: number): number {
  let h = baseHeight(x, z);
  const list = FLAT_BUCKETS.get(Math.floor(x / FLAT_CELL) + Math.floor(z / FLAT_CELL) * 1000);
  if (list) for (const f of list) {
    const dx = x - f.x, dz = z - f.z;
    if (Math.abs(dx) > f.r1 || Math.abs(dz) > f.r1) continue;
    const w = smoothstep(f.r1, f.r0, Math.max(Math.abs(dx), Math.abs(dz)));
    h = h + (f.h - h) * w;
  }
  return Math.max(2, Math.min(93, Math.round(h)));
}

// ------------------------------------------------------------------ Column materials

export function tintAt(x: number, z: number, leaves: boolean, sample?: RegionSample): [number, number, number] {
  const r = sample ?? regionAt(x, z);
  const A = leaves ? REGION_INFO[r.a].leafTint : REGION_INFO[r.a].tint;
  const Bt = leaves ? REGION_INFO[r.b].leafTint : REGION_INFO[r.b].tint;
  const n = (fbm2(x / 40, z / 40, 2, 404) - 0.5) * 0.14;
  return [A[0] + (Bt[0] - A[0]) * r.t + n, A[1] + (Bt[1] - A[1]) * r.t + n * 0.4, A[2] + (Bt[2] - A[2]) * r.t - n * 0.5];
}

/** Top/sub block choice for a column. maxDiff = steepest drop to a neighbour. */
export function columnBlocks(x: number, z: number, h: number, maxDiff: number, region: RegionId, road: boolean): { top: number; sub: number } {
  const stony = fbm2(x / 9, z / 9, 2, 55);
  const underwater = h <= SEA;
  if (underwater) {
    if (region === 'redstone') return { top: B.RedSand, sub: B.RedSand };
    if (region === 'starfall') return { top: B.Gravel, sub: B.Stone };
    if (region === 'brambledeep') return { top: hash2(x, z, 5) < 0.4 ? B.Clay : B.Dirt, sub: B.Dirt };
    return { top: hash2(x, z, 4) < 0.3 ? B.Gravel : B.Sand, sub: B.Sand };
  }
  if (road) return { top: hash2(x, z, 8) < 0.1 ? B.Gravel : B.Path, sub: B.Dirt };
  const beach = h <= SEA + 2;
  switch (region) {
    case 'redstone':
      if (maxDiff >= 2) return { top: B.TerraOrange, sub: B.TerraOrange };
      return { top: stony > 0.62 ? B.TerraCream : B.RedSand, sub: B.TerraOrange };
    case 'starfall':
      if (h >= 64) return { top: maxDiff >= 3 ? B.Stone : B.Snow, sub: B.Stone };
      if (h >= 54) return { top: maxDiff >= 3 ? B.Stone : B.SnowGrass, sub: B.Stone };
      if (maxDiff >= 3) return { top: stony > 0.6 ? B.Basalt : B.Stone, sub: B.Stone };
      return { top: B.Grass, sub: B.Dirt };
    case 'saltwind':
      if (beach) return { top: B.Sand, sub: B.Sand };
      if (maxDiff >= 3) return { top: stony > 0.55 ? B.MossyStone : B.Stone, sub: B.Stone };
      return { top: B.Grass, sub: B.Dirt };
    case 'brambledeep':
      if (maxDiff >= 3) return { top: B.MossyStone, sub: B.Stone };
      return { top: stony > 0.66 ? B.Loam : B.Grass, sub: B.Dirt };
    default:
      if (beach && h <= SEA + 1) return { top: B.Sand, sub: B.Sand };
      if (maxDiff >= 3 || (h > 40 && stony > 0.55)) return { top: stony > 0.62 ? B.MossyStone : B.Stone, sub: B.Stone };
      return { top: B.Grass, sub: B.Dirt };
  }
}

/** Underground material at depth, with region strata. */
/** Per-column noise for deepBlock; compute once per column, not per block. */
export function columnNoise(x: number, z: number): number {
  return valueNoise(x / 20, z / 20, 31);
}

/** Underground material at depth, with region strata. n = columnNoise(x, z). */
export function deepBlock(x: number, y: number, z: number, region: RegionId, n = 0.5): number {
  if (y < 5) return B.DeepStone;
  if (region === 'redstone') {
    const band = Math.floor((y + n * 3) / 3) % 5;
    return band === 0 ? B.TerraCream : band === 1 ? B.TerraBrown : band === 3 ? B.RedSand : B.TerraOrange;
  }
  if (region === 'starfall' && y > 40) return (y + Math.floor(n * 9)) % 6 < 2 ? B.Basalt : B.Stone;
  return y < 10 && hash2(x, z + y * 31, 33) > 0.72 ? B.DeepStone : B.Stone;
}
