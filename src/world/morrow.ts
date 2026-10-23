import { B } from './blocks';
import { fbm2, hash2, smoothstep } from './noise';
import { WATER_LEVEL } from './VoxelWorld';

// MORROW, the second continent (docs/MORROW.md), drawn in the same coordinate square as the
// Counties but as its own land (world/land.ts). Long from north to south: a mountain spine down the
// west side, rivers running east from it to the sea, the Bright Coast and Callis at the mouth of the
// Call, and a long tail of low islands, the Keys, curling away south and west to Saltpenny.
//
// Regions, south to north: the Keys, the Glades, the Amberwold, the Bright Coast (east) beside the
// Amberwold's northern reach (west), the Sunder (a rift valley), the Glass Flats, the Greywaste, and
// the Held Country. terrain.ts hands its questions here when LAND is Morrow.

const SEA = WATER_LEVEL;

export type MorrowRegion = 'keys' | 'glades' | 'amberwold' | 'bright' | 'sunder' | 'glassflats' | 'greywaste' | 'held';
export const MORROW_REGIONS: MorrowRegion[] = ['keys', 'glades', 'amberwold', 'bright', 'sunder', 'glassflats', 'greywaste', 'held'];

/** Callis, at the mouth of the Call on the Bright Coast: the packet ship from Gullmouth comes in here. */
export const CALLIS = { x: 2140, z: 1150 };
/** The Call's middle through Callis, the harbour's quay line, and the packet's berth at the end of its pier. */
export const CALLIS_RIVER_Z = 1160;
export const CALLIS_QUAY_X = 2296;
export const CALLIS_PACKET = { x: CALLIS_QUAY_X + 36, z: 1240 };
/** Callis's street level (the city is built flat, on its own ground: world/sites.ts buildCallis). */
export const CALLIS_FLOOR = SEA + 6;
/**
 * Where Callis's landmarks stand, shared by the builder and the people (data/content/callis.ts):
 * the middle of the Assembly's plaza, of the Market square, and of the Hall of the Two Stones, which
 * stands on a rise three blocks over the street.
 */
export const CALLIS_SPOTS = {
  plaza: { x: CALLIS.x - 20, z: CALLIS.z - 95 },
  market: { x: CALLIS.x + 20, z: CALLIS.z + 60 },
  temple: { x: CALLIS.x - 120, z: CALLIS.z + 100, rise: 3 },
};
/** The three towers whose plumb gauges the Warden keeps, off the plaza's middle (size: the tower's width). */
export const CALLIS_TOWERS = {
  old: { name: 'the Old Tower', dx: 2, dz: -52 },
  morning: { name: 'the Morning Tower', dx: 42, dz: -18 },
  evening: { name: 'the Evening Tower', dx: -42, dz: -18 },
};
/** Saltpenny Key: the outermost of the Keys, the Brethren's city of wrecks. */
export const SALTPENNY = { x: -1540, z: 3700 };
/** Saltpenny's street level: the key is levelled a couple of blocks over the sea (world/sites.ts buildSaltpenny). */
export const SALT_FLOOR = SEA + 2;
/**
 * Saltpenny's beached hulls, each with its stern at x and its bow to the east, keel along z: the Mercy
 * (the market), the Leaning Mast (the tavern), the Captains' Table, and Low Tide (the fence's).
 * Their holds are rooms at street level, a door in the middle of the side (doorX); their decks are
 * eight blocks up.
 */
export const SALT_HULLS = {
  mercy: { x: SALTPENNY.x - 50, z: SALTPENNY.z - 22, len: 52, beam: 16 },
  mast: { x: SALTPENNY.x + 30, z: SALTPENNY.z + 22, len: 30, beam: 10 },
  table: { x: SALTPENNY.x - 78, z: SALTPENNY.z + 22, len: 34, beam: 11 },
  lowtide: { x: SALTPENNY.x + 40, z: SALTPENNY.z - 26, len: 22, beam: 8 },
};
/** Where a hull's side door is, along it. */
export const hullDoorX = (h: { x: number; len: number }) => h.x + Math.floor(h.len * 0.45);
/** The Cockpit, the ring dug in the sand where the Brethren settle things. */
export const SALT_COCKPIT = { x: SALTPENNY.x + 70, z: SALTPENNY.z + 80, r: 10 };
/** The piers on the lee side, out from the west shore; the Kittiwake lies at the middle one. */
export const SALT_PIERS = [SALTPENNY.z - 40, SALTPENNY.z, SALTPENNY.z + 40];
/** Saltpenny's landing, by the causeway: the packet's sign stands here. */
export const SALT_LANDING = { x: SALTPENNY.x + 106, z: SALTPENNY.z - 8 };
/** Wreckers' Bight: the camp on a key east along the causeway where Pryce's wreckers lie up, and their boat. */
export const BIGHT = { x: -1250, z: 3420 };
export const BIGHT_BOAT = { x: BIGHT.x + 7.5, z: BIGHT.z + 6.5 };
/**
 * Cold Harbour: the cove under the Greywaste's low cliffs where the black comes down to the shingle
 * and the Brethren load it. The diggers' shed, the jetty, and the heaps of black nobody has shipped.
 */
export const COLD_HARBOUR = { x: 2196, z: -1100 };
export const COLD_SHED = { x: 2172, z: -1113, w: 9, d: 7 };
export const COLD_TALLY = { x: 2190.5, z: -1103.5 };
/**
 * Hollow Fell: the old kingdom's barrow-field on the moor above Cold Harbour, where the diggers took
 * the black off the dead. Each barrow is [x, z, radius, state]: 'shut' (still under its black),
 * 'open' (stripped, the black heaped beside it) or 'ma' (the one Wat Aske's diggers opened last).
 */
export const HOLLOW_FELL = { x: 2010, z: -1170 };
export const FELL_BARROWS: [number, number, number, 'shut' | 'open' | 'ma'][] = [
  [1972, -1196, 6, 'open'], [1990, -1214, 5, 'shut'], [2014, -1206, 7, 'open'], [2040, -1192, 5, 'open'],
  [1978, -1160, 5, 'shut'], [2006, -1170, 6, 'ma'], [2036, -1150, 6, 'open'], [1996, -1134, 5, 'open'],
];
/** Where the black is laid back over the last barrow opened (Ma's): beside its south side. */
export const FELL_LAY = { x: 2006.5, z: -1162.5 };
/** Northgate, across the only pass into the Held Country. */
export const NORTHGATE = { x: 520, z: -1360 };
/**
 * Northgate's town, below the scarp where the Held Country's plateau starts, and the wall along the
 * top of it: three hundred years old, never needed until now. The gate is shut; the postern beside
 * it is the Gatekeeper's to open. The ramp climbs from the town to the gate.
 */
export const NORTHGATE_TOWN = { x: 520, z: -1236 };
export const NG_WALL = { z: -1380, x0: 372, x1: 668 };
export const NG_GATE = { x: 520, z: -1380 };
export const NG_ARCHIVE = { x: 566, z: -1306 };
export const NG_CATHEDRAL = { x: 584, z: -1262 };
/**
 * Kingsbarrow, the old kingdom's city of the dead on the Held's plateau: an avenue of standing stones
 * north between rows of barrows to the king's own, a hill of a barrow with a stone portal in its south
 * face. Pryce's diggers camped east of the king's barrow, where the carts hauled its black. Its level ground is KB_FLOOR.
 */
export const KB_FLOOR = 40;
export const KB_KING = { x: 860, z: -1872, r: 24 };
export const KB_PORTAL = { x: 860, z: -1846 };
export const KB_CAMP = { x: 914, z: -1884 };
/** The halls under the king's barrow (the group dungeon gd-kingsbarrow): their origin and floor. */
export const KB_HALLS = { x: 800, z: -1880, f: 8 };
/** Kingsbarrow, the city of the dead, in the Held Country. */
export const KINGSBARROW = { x: 860, z: -1830 };
/** The Sunder's rift runs east to west along this line. */
const RIFT_Z = 430;

const bump = (v: number, c: number, r: number) => smoothstep(r, 0, Math.abs(v - c));
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
const wander = (t: number, s: number) => (fbm2(t / 900, s, 3, 801) - 0.5) * 520 + (fbm2(t / 260, s + 5, 2, 802) - 0.5) * 130;

/** Distance inland from the main body's shores (negative at sea). */
function mainDist(x: number, z: number): number {
  // The east coast, pulled in to a bay at Callis and pushed out round the Bright Coast's capes
  const east = 2360 + wander(z, 1.1) - bump(z, CALLIS.z, 240) * 150 + bump(z, 1600, 200) * 120 + bump(z, 700, 220) * 90 - x;
  const west = x - (-1260 + wander(z, 2.3) + bump(z, 1200, 300) * 160);
  const north = z - (-2060 + wander(x, 3.7));
  const south = 2900 + wander(x, 4.9) - bump(x, -300, 400) * 260 - z;
  return smin(smin(smin(east, west, 420), north, 420), south, 420);
}

/** The Keys: islands along a curve from the south coast round to Saltpenny. */
const KEY_ISLES: { x: number; z: number; r: number }[] = (() => {
  const out: { x: number; z: number; r: number }[] = [];
  const P = (t: number): [number, number] => {
    // A curve south-west off the southern shore, bending west
    const a = t * Math.PI * 0.6;
    return [600 - t * 2050 + Math.sin(a) * 120, 2980 + Math.sin(t * Math.PI * 0.9) * 560 + t * 180];
  };
  let t = 0;
  for (let i = 0; t < 1; i++) {
    const [x, z] = P(t);
    const r = 45 + hash2(i, 7, 811) * 75;
    out.push({ x, z, r });
    t += 0.045 + hash2(i, 9, 812) * 0.03;
  }
  out.push({ x: SALTPENNY.x, z: SALTPENNY.z, r: 140 });
  return out;
})();

function keysDist(x: number, z: number): number {
  if (z < 2700 || x > 1000) return -999;
  const qx = x + (fbm2(x / 70, z / 70, 2, 813) - 0.5) * 40, qz = z + (fbm2(x / 70 + 3, z / 70, 2, 814) - 0.5) * 40;
  let d = -999;
  for (const k of KEY_ISLES) d = Math.max(d, k.r * (0.8 + fbm2(x / 40, z / 40, 2, 815) * 0.35) - Math.hypot(qx - k.x, qz - k.z));
  return d;
}
/** How near the Keys' chain this is (for the turquoise shallows round them). */
function keysNear(x: number, z: number): number {
  if (z < 2600 || x > 1200) return 999;
  let d = 999;
  for (const k of KEY_ISLES) d = Math.min(d, Math.hypot(x - k.x, z - k.z) - k.r);
  return d;
}

/** Inland distance from Morrow's shores, the Keys included (negative at sea). */
export function morrowLandDist(x: number, z: number): number {
  return Math.max(mainDist(x, z), keysDist(x, z));
}

/** The rivers, east from the spine to the sea. */
export const MORROW_RIVERS: [number, number][][] = [
  // The Call, out of the Sunder's southern hills through the Bright Coast to Callis
  [[-260, 760], [180, 880], [620, 980], [1060, 1060], [1480, 1110], [1880, 1150], [2300, 1160]],
  // The Amber, through the Amberwold
  [[-380, 1880], [100, 1960], [560, 2040], [1020, 2080], [1500, 2120], [1960, 2160], [2420, 2190]],
  // The Greyflow, off the northern spine across the Greywaste
  [[-180, -900], [320, -930], [820, -970], [1300, -1000], [1820, -1010], [2420, -1030]],
];
export const MORROW_LAKES: { x: number; z: number; r: number; name: string }[] = [
  { x: 1400, z: -260, r: 60, name: 'the Salt Pan' },
  { x: 300, z: 2560, r: 46, name: 'Heron Mere' },
];
/**
 * The roads: the coast road from Callis north to Northgate and south to the Glades, the old road
 * west through the Amberwold, the causeway out along the Keys.
 */
export const MORROW_ROADS: [number, number][][] = [
  // Callis north along the coast, inland across the Sunder by the bridge, over the Flats, to Northgate
  [[2080, 1150], [1960, 900], [1840, 640], [1600, 430], [1300, 300], [1080, 40], [980, -300], [880, -640], [760, -980], [620, -1240], [NORTHGATE.x, NORTHGATE.z + 20]],
  // Callis south along the coast to the Glades
  [[2080, 1180], [1980, 1500], [1840, 1820], [1640, 2180], [1360, 2460], [1000, 2640]],
  // The old road west through the Amberwold, up toward the spine
  [[1840, 1290], [1400, 1420], [960, 1560], [520, 1700], [120, 1780], [-260, 1820]],
  // On north through Northgate's gate, over the Held's plateau to Kingsbarrow
  [[NORTHGATE.x, NORTHGATE.z - 26], [600, -1500], [700, -1640], [800, -1720], [860, -1742]],
  // The Glades to the causeway's head, and out along the Keys to Saltpenny
  [[1000, 2640], [640, 2840], [300, 3040], [-120, 3260], [-560, 3440], [-1000, 3580], [-1380, 3660]],
];

export function morrowRegionId(x: number, z: number): MorrowRegion {
  if (keysDist(x, z) > -60 || z > 3000) return 'keys';
  const zw = z + (fbm2(x / 520, z / 520, 3, 821) - 0.5) * 260;
  if (zw > 2280) return 'glades';
  if (zw > 1560) return 'amberwold';
  if (zw > 760) return x + (fbm2(x / 300, z / 300, 2, 822) - 0.5) * 300 > 820 ? 'bright' : 'amberwold';
  if (zw > 60) return 'sunder';
  if (zw > -640) return 'glassflats';
  if (zw > -1360) return 'greywaste';
  return 'held';
}

/** The mountain spine down the west side: its line, and how high it lifts the ground here. */
function spine(x: number, z: number): number {
  const xs = -700 + (fbm2(z / 700, 1.7, 3, 831) - 0.5) * 340;
  const d = Math.abs(x - xs);
  const k = Math.max(0, 1 - d / 400);
  // Lower where it runs down into the south, highest over the Sunder and the north
  const south = 1 - smoothstep(1900, 2700, z);
  return Math.pow(k, 1.7) * (52 + fbm2(x / 90, z / 90, 3, 832) * 26) * south;
}

/** Morrow's height, sea floor included (before roads and site flattening, which terrain.ts adds). */
export function morrowHeight(x: number, z: number): number {
  const L = morrowLandDist(x, z);
  if (L < 0) {
    const off = -L;
    const n = fbm2(x / 55, z / 55, 3, 12);
    let floor = Math.max(3, SEA - 3 - Math.min(9, off * 0.12) - n * 3);
    // The Keys sit in turquoise shallows
    const k = keysNear(x, z);
    if (k < 220) floor = Math.max(floor, SEA - 1.6 - smoothstep(0, 220, k) * 6 - n);
    return floor;
  }
  const reg = morrowRegionId(x, z);
  const n1 = fbm2(x / 160, z / 160, 4, 841), n2 = fbm2(x / 40, z / 40, 3, 842);
  let h: number;
  switch (reg) {
    case 'keys': h = SEA + 1.6 + (n1 - 0.5) * 3 + (n2 - 0.5) * 1.5; break;
    case 'glades': {
      const creek = Math.abs(fbm2(x / 90, z / 90, 3, 843) - 0.5);
      h = creek < 0.014 ? SEA - 1.5 : SEA + 1.4 + (n1 - 0.5) * 3 + (n2 - 0.5) * 1.6;
      break;
    }
    case 'amberwold': h = SEA + 10 + (n1 - 0.5) * 22 + (n2 - 0.5) * 6; break;
    case 'bright': h = SEA + 7 + (n1 - 0.5) * 16 + (n2 - 0.5) * 4; break;
    case 'sunder': {
      // Plateaus either side of the rift; the rift floor far below, with the river of falls in it
      const r = Math.abs(z - RIFT_Z + (fbm2(x / 200, 3.1, 2, 844) - 0.5) * 120);
      const plateau = SEA + 32 + (n1 - 0.5) * 18 + (n2 - 0.5) * 5;
      h = plateau + (SEA + 4 + n2 * 3 - plateau) * smoothstep(150, 70, r);
      break;
    }
    case 'glassflats': {
      const ridge = smoothstep(0.86, 0.92, fbm2(x / 70, z / 70, 2, 845));
      h = SEA + 8 + (n1 - 0.5) * 3 + ridge * 6;
      break;
    }
    case 'greywaste': h = SEA + 14 + (n1 - 0.5) * 20 + (n2 - 0.5) * 5; break;
    case 'held': {
      h = SEA + 22 + (n1 - 0.5) * 24 + (n2 - 0.5) * 5;
      // Barrows: round mounds across the plain
      const cx = Math.floor(x / 37), cz = Math.floor(z / 37);
      if (hash2(cx, cz, 846) > 0.86) {
        const d = Math.hypot(x - (cx * 37 + 18.5), z - (cz * 37 + 18.5));
        if (d < 8) h += Math.cos((d / 8) * Math.PI * 0.5) * 6;
      }
      break;
    }
  }
  h += spine(x, z);
  // Rivers cut their beds on the way to the sea
  const rd = riverDistM(x, z);
  if (rd < 14) h = Math.min(h, SEA - 2 + rd * 0.35 + smoothstep(6, 14, rd) * 8);
  for (const l of MORROW_LAKES) { const d = Math.hypot(x - l.x, z - l.z) - l.r; if (d < 18) h = Math.min(h, d < 0 ? SEA - 2.5 : SEA + d * 0.4); }
  // The shore: beaches, or cliffs in the cold north
  if (L < 150) {
    const cliffs = (reg === 'held' || reg === 'greywaste') && fbm2(x / 110, z / 110, 2, 847) > 0.45;
    h = Math.min(h, cliffs ? SEA + 3 + L * 1.3 : SEA + 0.6 + L * 0.34);
  }
  return Math.min(90, h);
}

let RSEGS: { ax: number; az: number; bx: number; bz: number; minX: number; maxX: number; minZ: number; maxZ: number }[] | null = null;
function riverDistM(x: number, z: number): number {
  if (!RSEGS) {
    RSEGS = [];
    for (const l of MORROW_RIVERS) for (let i = 0; i < l.length - 1; i++) {
      const [ax, az] = l[i], [bx, bz] = l[i + 1];
      RSEGS.push({ ax, az, bx, bz, minX: Math.min(ax, bx) - 40, maxX: Math.max(ax, bx) + 40, minZ: Math.min(az, bz) - 40, maxZ: Math.max(az, bz) + 40 });
    }
  }
  const px = x + (fbm2(x / 40, z / 40, 2, 55) - 0.5) * 10;
  let best = Infinity;
  for (const s of RSEGS) {
    if (px < s.minX || px > s.maxX || z < s.minZ || z > s.maxZ) continue;
    const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, l2 ? ((px - s.ax) * dx + (z - s.az) * dz) / l2 : 0));
    best = Math.min(best, Math.hypot(px - (s.ax + dx * t), z - (s.az + dz * t)));
  }
  return best;
}

/** Top and under blocks for a Morrow column (terrain.ts columnBlocks), or null for the shared rules. */
export function morrowColumn(x: number, z: number, h: number, maxDiff: number, region: MorrowRegion, stony: number, beach: boolean): { top: number; sub: number } | null {
  if (h > SEA + 58) return { top: maxDiff >= 3 ? B.Stone : B.Snow, sub: B.Stone };
  if (h > SEA + 46 && maxDiff >= 2) return { top: B.Stone, sub: B.Stone };
  switch (region) {
    case 'keys':
      if (beach || h <= SEA + 3) return { top: B.Sand, sub: B.Sand };
      return { top: stony > 0.66 ? B.Sand : B.Grass, sub: B.Sand };
    case 'glades':
      if (h <= SEA + 1) return { top: B.Clay, sub: B.Clay };
      return { top: stony > 0.62 ? B.Loam : B.Grass, sub: B.Loam };
    case 'amberwold':
      if (beach) return { top: B.Sand, sub: B.Sand };
      if (maxDiff >= 3) return { top: B.MossyStone, sub: B.Stone };
      return { top: stony > 0.64 ? B.Loam : B.Grass, sub: B.Dirt };
    case 'bright':
      if (beach) return { top: B.Sand, sub: B.Sand };
      if (maxDiff >= 3) return { top: B.TerraCream, sub: B.TerraCream };
      return { top: stony > 0.7 ? B.TerraCream : B.Grass, sub: B.Dirt };
    case 'sunder':
      if (maxDiff >= 3) return { top: stony > 0.55 ? B.TerraCream : B.Stone, sub: B.Stone };
      return { top: stony > 0.78 ? B.Crystal : stony > 0.62 ? B.Gravel : B.Grass, sub: B.Dirt };
    case 'glassflats':
      if (maxDiff >= 2 || stony > 0.74) return { top: B.Basalt, sub: B.Basalt };
      return { top: B.TerraCream, sub: B.Sand };
    case 'greywaste':
      if (beach) return { top: B.Gravel, sub: B.Gravel };
      if (maxDiff >= 3) return { top: B.Stone, sub: B.Stone };
      return { top: stony > 0.6 ? B.Gravel : stony > 0.45 ? B.Loam : B.Grass, sub: B.Dirt };
    case 'held':
      if (beach) return { top: B.Gravel, sub: B.Gravel };
      if (maxDiff >= 3) return { top: B.Stone, sub: B.Stone };
      return { top: stony > 0.7 ? B.SnowGrass : B.Snow, sub: B.Dirt };
  }
  return null;
}
