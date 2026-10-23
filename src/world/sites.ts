import { B, BLOCKS } from './blocks';
import { CRAGSBY, HOLME, POSTS, postBoxOf, SCARROW } from '../data/travel';
import { SHARDFALLS, WORLD_BOSSES } from '../data/activities';
import { HOLLIN_SHRINE, SHRINE_SOLID } from './shrineData';
import { hash2 } from './noise';
import { roofApex, roofOverhang, roofRise } from './roofShape';
import { chimneyCell, fitOut, openDoorPlace, Role } from './interiors';
import { baseHeight, Flatten, GW, HEART_ROADS, heartRoadDist, heightAt, lakeDist, regionAt, RegionId, riverDist, roadDist, roadGrade, SEA, setFlattenZones, coastX, coastDist, WORLD_ROADS } from './terrain';
import { CHUNK, chunkKey, inWorld, keyChunk, localIdx, SY, WMAX, WMIN } from './VoxelWorld';
import { BANDSTAND, CARNE, CARNE_FLOOR, WAITS_HOUSE } from '../data/content/waits';
import { TAVERN_SIGNS } from '../data/content/taverns';
import { hoistSpot, isleSpots } from './holms';
import { LAND_BOARD, LOT_D, LOT_W, LOTS } from '../data/housing';
import { hazards, stamp } from '../data/hazards';
import { PUZZLES } from '../data/puzzles';
import { stableAt, STABLES, stableYaw, type StableDef } from '../data/stables';
import { lodgeAt, lodgeBase, LODGE_H, LODGE_U, LODGE_V, LODGINGS, ROOMS, type LodgingDef } from '../data/lodgings';
import { FORTS, type Fort } from '../data/forts';
import { GILLSBY, HYTHE, PRIORY, REEKS, UNDER_F, OLD_BED } from '../data/inkholm';

// Deterministic settlements and landmarks across the continent. Running plan() yields the same
// sites, block overrides and prop descriptors in every worker and on the main thread.

export type PropType = 'roof' | 'door' | 'sails' | 'grave' | 'flame' | 'bellows' | 'lantern' | 'wallLantern' | 'banner' | 'stall' | 'boat' | 'tent' | 'headframe' | 'cart'
  | 'bench' | 'barrel' | 'crate' | 'firepit' | 'well' | 'glow' | 'smoke' | 'cone' | 'anvil' | 'fence' | 'sign' | 'notice' | 'desk' | 'furn' | 'rails'
  /** A sagging rope along ry for len, dropping h, sagging r; a root hanging h down with a bow. */
  | 'rope' | 'root'
  /** A trading ship (props.ship): color is her stripe; sails set or furled. */
  | 'ship'
  /** A waymark shrine (world/shrines.ts) in its region's style. */
  | 'waymark'
  /** A window box of flowers, and a painted shutter (color), on a house front. */
  | 'windowBox' | 'shutter'
  /** A half-block stone step before a door a block above the ground. */
  | 'doorstep'
  /** A Charter Post box, where letters are posted and read. */
  | 'postBox'
  /** A reek-fire's hearth on Inkholm (lit by the game when its fire's been relit). */
  | 'reekhearth';

export interface PropDesc {
  t: PropType;
  x: number;
  y: number;
  z: number;
  ry?: number;
  len?: number;
  span?: number;
  rise?: number;
  /** Interior furniture ('furn'): which piece, and a colour variant. */
  item?: string;
  tint?: number;
  /** A house door ('furn' doorOpen) that swings shut when nobody's near (see world/Doors.ts). */
  swing?: boolean;
  /** Roof dormers: +1 or -1 picks the slope, 0 or absent for none. */
  dormers?: number;
  mat?: 'red' | 'blue' | 'thatch' | 'slate';
  color?: string;
  kind?: 'hollin' | 'harrow' | 'aldermere' | 'tally';
  /** A ship's sails ('bare': a hull on the slip, no masts yet). */
  sails?: 'set' | 'furled' | 'bare';
  /** A waymark shrine's style. */
  theme?: RegionId;
  r?: number;
  h?: number;
  text?: string;
}

export interface ImpostorBox { x: number; y: number; z: number; w: number; h: number; d: number; color: string; cone?: boolean }

export interface Site {
  id: string;
  name: string;
  region: RegionId;
  x: number;
  z: number;
  /** Activation radius: props load and the impostor hides inside it. */
  r: number;
  named: boolean;
  props: PropDesc[];
  rects: [number, number, number, number][];
  impostor: ImpostorBox[];
  /** Dungeons, delves, vistas and wonders: what the game's activities find here. */
  act?: SiteActivity;
  /** Stock kept here (a farm's cows, pigs, sheep and hens): the game puts them out as you come near. */
  animals?: AnimalSpot[];
  /** Crafting stations anyone can use here (a town smithy's furnace, anvil, bench and cook fire). */
  stations?: { station: 'furnace' | 'anvil' | 'hearth' | 'bench'; x: number; y: number; z: number }[];
}

/** A beast that lives at a site, wandering r blocks from (x, z), in its own coat (entities/creatures.ts Palette). */
export interface AnimalSpot { kind: 'cow' | 'pig' | 'sheep' | 'chicken'; x: number; z: number; r: number; pal?: { a?: string; b?: string; c?: string } }

/** What an activity site holds for the game (see game/Activities.ts). */
export interface SiteActivity {
  kind: 'dungeon' | 'delve' | 'vista' | 'scenic' | 'dive' | 'camp' | 'group' | 'fort';
  /** Creatures that live here and come back after a while: [x, floorY, z, enemy type]. */
  spawns?: [number, number, number, string][];
  /** The champion at the end: [x, floorY, z, enemy type]. */
  boss?: [number, number, number, string];
  /** A fort's lieutenants, by the chief's hall: [x, floorY, z, enemy type]. */
  guards?: [number, number, number, string][];
  /** The chest behind the champion: [x, floorY, z]. */
  chest?: [number, number, number];
  /** Sunken caches to find and open (each refills on its own): [x, floorY, z]. */
  caches?: [number, number, number][];
  /** A vista: where to stand, and the point the camera circles [x, y, z, x, y, z]. */
  view?: [number, number, number, number, number, number];
  /**
   * A group dungeon (data/dungeons.ts, game/Dungeons.ts): its packs in the order they're met (each
   * pack pulls together), its bosses in order with their crew, where a group arrives, and the way
   * back up. Its halls are buried: covered lists each hall's footprint and ceiling, for the site check.
   */
  packs?: [number, number, number, string][][];
  bosses?: { at: [number, number, number]; type: string; crew?: [number, number, number, string][] }[];
  arrive?: [number, number, number];
  exit?: [number, number, number];
  covered?: [number, number, number, number, number][];
}

/** The lairs where the world bosses rise. */
const LAIR_NAMES: Record<string, string> = { 'wb-bramblemaw': 'The Bramble Ring', 'wb-tidewright': 'Jenny\'s Strand', 'wb-cinderhorn': 'Clinker Bottom', 'wb-rimeglass': 'The Rime Bowl' };

/** Underworks themes: depth and reach, stone, light, who lives there, and what's left lying about. */
const UNDERWORKS = {
  mortlake: { pub: true, depth: 18, reach: 32, wall: B.MossyStone, wall2: B.StoneBrick, floor: B.StoneBrick, floor2: B.MossyCobble, light: '#a8ffb0', mobs: ['sporejelly', 'thornwolf', 'sporejelly'], boss: 'thornwolf', clutter: ['mushrooms', 'candles', 'chest', 'barrel'] },
  blackcut: { pub: true, depth: 18, reach: 32, wall: B.TerraBrown, wall2: B.Timber, floor: B.Gravel, floor2: B.IronOre, light: '#ffb070', mobs: ['redback', 'dustwolf', 'redback'], boss: 'redback', clutter: ['cart', 'rails', 'crate', 'barrel'] },
  badger: { pub: false, depth: 13, reach: 19, wall: B.Dirt, wall2: B.OakLog, floor: B.Path, floor2: B.Gravel, light: '#ffc880', mobs: ['boar', 'roadwolf'], boss: 'boar', clutter: ['crate', 'barrel', 'mushrooms'] },
  culvert: { pub: false, depth: 13, reach: 19, wall: B.StoneBrick, wall2: B.MossyCobble, floor: B.Cobble, floor2: B.Clay, light: '#c8e8ff', mobs: ['jelly', 'roadwolf'], boss: 'roadwolf', clutter: ['barrel', 'crate', 'candles'] },
  smugglers: { pub: false, depth: 13, reach: 19, wall: B.Stone, wall2: B.Planks, floor: B.Sand, floor2: B.Planks, light: '#ffd890', mobs: ['crab', 'brinejelly'], boss: 'crab', clutter: ['barrel', 'crate', 'chest', 'barrel'] },
  tinner: { pub: false, depth: 13, reach: 19, wall: B.TerraOrange, wall2: B.Timber, floor: B.Gravel, floor2: B.TinOre, light: '#ffb070', mobs: ['dustwolf', 'redback'], boss: 'dustwolf', clutter: ['cart', 'crate', 'rails'] },
  seep: { pub: false, depth: 13, reach: 19, wall: B.Ice, wall2: B.Crystal, floor: B.Basalt, floor2: B.Ice, light: '#9fe8ff', mobs: ['shardjelly', 'frostwolf'], boss: 'frostwolf', clutter: ['candles', 'chest'] },
  hob: { pub: false, depth: 13, reach: 19, wall: B.MossyCobble, wall2: B.StoneBrick, floor: B.Loam, floor2: B.MossyCobble, light: '#a8ffb0', mobs: ['thornwolf', 'sporejelly'], boss: 'thornwolf', clutter: ['candles', 'mushrooms', 'chest'] },
};

/** Row width for a cell's key: wider than the world, so no two cells share one. */
const KEY_W = 8192;
/** The world's edge before the outer lands were grown: the scattered places keep to it, so each keeps its number. */
const OLD_EDGE = 2432;

/** Per-chunk list of [localIndex, blockId, ...] written in order after terrain. */
export class Overrides {
  readonly map = new Map<number, number[]>();
  /** Cells last written as farmland or a barrier (a fence, a closed door), so roads can be cleared of them. */
  readonly soft = new Map<number, number>();
  set(x: number, y: number, z: number, id: number): void {
    x = Math.floor(x); z = Math.floor(z); y = Math.floor(y);
    if (!inWorld(x, z) || y < 0 || y >= SY) return;
    const cell = (x - WMIN) + (z - WMIN) * KEY_W + y * KEY_W * KEY_W;
    if (id === B.Farmland || id === B.Barrier) this.soft.set(cell, id);
    else if (this.soft.has(cell)) this.soft.delete(cell);
    const k = chunkKey(x >> 5, z >> 5);
    let a = this.map.get(k);
    if (!a) this.map.set(k, (a = []));
    a.push(localIdx(x & 31, y, z & 31), id);
  }
}

/** A waymark: its shrine, and where travellers are set down beside it (or on a vista's top). */
export interface WaymarkSpot { id: string; name: string; x: number; z: number; y: number; ax: number; az: number; ay?: number; theme: RegionId; ry: number }

/** A chest hidden in the wilds or tucked by a ruin (game/Chests.ts): found, picked and looted. */
export interface HiddenChest { id: number; x: number; y: number; z: number; tier: 0 | 1 | 2; region: RegionId; ry: number }

export interface Plan {
  sites: Site[];
  /** Hidden chests across the land. */
  chests: HiddenChest[];
  overrides: Overrides;
  /** Every waymark shrine, Hollin Ford's included. */
  waymarks: WaymarkSpot[];
  /** Footprint rectangles bucketed by chunk, so trees and creatures keep out of buildings. */
  rectsByChunk: Map<number, [number, number, number, number][]>;
}

let cached: Plan | null = null;

/** The Mewstones' hamlet: the middle of its green, on the big isle's west shore. */
export const MEW = { x: 2350, z: 724 };
let mewJettyCache: { x0: number; x1: number; z: number } | null = null;
/**
 * The Mewstones' jetty: from x0 at the shore out west to x1, three blocks wide from z. Worked out
 * from the ground (after the planner's flattening), so call it once plan() has run.
 */
export function mewJetty(): { x0: number; x1: number; z: number } {
  if (mewJettyCache) return mewJettyCache;
  const z = MEW.z - 1;
  let x = MEW.x - 8;
  while (x > MEW.x - 120 && heightAt(x, z + 1) > SEA) x--;
  return (mewJettyCache = { x0: x + 2, x1: x - 26, z });
}

/** Ansbury's new (outer) wall: the line it runs along on each side. */
const NEW_WALL = { x0: 630, x1: 1010, z0: 120, z1: 474 };

/** What may not stand on a road: a cart, barrels, a bench, a fence, a stall or a tent. */
const ROAD_CLUTTER = new Set<PropType>(['cart', 'barrel', 'crate', 'bench', 'fence', 'stall', 'tent', 'anvil', 'firepit']);

/**
 * Keep every road between towns open: a garden or a field planted across one goes back to path, a
 * fence across one comes down, and anything left standing on one is moved off. Walls and houses
 * aren't touched (the roads are laid to go through gates and down streets).
 */
function clearRoads(O: Overrides, sites: Site[]): void {
  const onRoad = (x: number, z: number) => !(x < GW + 40 && z < GW + 40) && roadDist(x, z) < 1.7 && heightAt(x, z) > SEA;
  for (const [cell, id] of [...O.soft]) {
    const x = (cell % KEY_W) + WMIN, z = (Math.floor(cell / KEY_W) % KEY_W) + WMIN, y = Math.floor(cell / (KEY_W * KEY_W));
    if (!onRoad(x, z)) continue;
    O.set(x, y, z, id === B.Farmland ? B.Path : B.Air);
  }
  for (const s of sites) s.props = s.props.filter((p) => !(ROAD_CLUTTER.has(p.t) && onRoad(p.x, p.z)));
}

/**
 * Footings: wherever something built stands a block or two over dry ground (a platform laid level on a
 * slope, a shrine's court at its downhill edge, a wall where a road was cut down beside it), the gap
 * under it is filled, so nothing hangs in the air. Left alone: anything over a road (gate arches),
 * over water (bridges, jetties), or in a doorway (walls either side of it, open through it).
 */
function footings(O: Overrides): void {
  const BUILT = new Set<number>([B.StoneBrick, B.Plaster, B.Timber, B.Planks, B.DarkPlanks, B.Window, B.Thatch, B.MossyCobble, B.Cobble, B.MossyStone, B.TerraBrown, B.TerraCream]);
  // The last write to each cell, as the game applies them
  const last = new Map<number, number>();
  const lowest = new Map<number, number>(); // column -> lowest built y
  const col = (x: number, z: number) => (x - WMIN) + (z - WMIN) * KEY_W;
  for (const [k, a] of O.map) {
    const [cx, cz] = keyChunk(k);
    for (let i = 0; i < a.length; i += 2) {
      const li = a[i], x = cx * CHUNK + (li % CHUNK), z = cz * CHUNK + (Math.floor(li / CHUNK) % CHUNK), y = Math.floor(li / (CHUNK * CHUNK));
      last.set(col(x, z) + y * KEY_W * KEY_W, a[i + 1]);
    }
  }
  for (const [cell, id] of last) {
    if (!BUILT.has(id)) continue;
    const c = cell % (KEY_W * KEY_W), y = Math.floor(cell / (KEY_W * KEY_W));
    if (y < (lowest.get(c) ?? Infinity)) lowest.set(c, y);
  }
  const at = (x: number, y: number, z: number) => last.get(col(x, z) + y * KEY_W * KEY_W);
  const solidAt = (x: number, y: number, z: number) => {
    const o = at(x, y, z);
    if (o !== undefined) return o !== B.Air && o !== B.Water && !!BLOCKS[o]?.solid;
    return y < heightAt(x, z);
  };
  for (const [c, y] of lowest) {
    const x = (c % KEY_W) + WMIN, z = Math.floor(c / KEY_W) + WMIN;
    if (x < GW + 40 && z < GW + 40) continue;
    const h = heightAt(x, z);
    if (h <= SEA + 1 || roadDist(x, z) < 2.4) continue;
    let g = y - 1;
    while (g >= 0 && !solidAt(x, g, z)) { if (at(x, g, z) === B.Water) { g = -99; break; } g--; }
    const gap = y - 1 - g;
    if (g < 0 || gap < 1 || gap > 2) continue;
    // A doorway: wall either side along one line, and open in front and behind along the other, up
    // past the lintel (a slot under a deck has the deck over it there)
    const f = g + 1, wx = solidAt(x - 1, f, z) && solidAt(x + 1, f, z), wz = solidAt(x, f, z - 1) && solidAt(x, f, z + 1);
    const open = (dx: number, dz: number) => !solidAt(x + dx, f, z + dz) && !solidAt(x + dx, y, z + dz);
    if ((wx && open(0, -1) && open(0, 1)) || (wz && open(-1, 0) && open(1, 0))) continue;
    const id = at(x, y, z)!;
    const fill = id === B.Planks || id === B.DarkPlanks || id === B.Timber || id === B.Thatch || id === B.Plaster || id === B.Window ? B.Cobble : id;
    for (let k = g + 1; k < y; k++) { O.set(x, k, z, fill); last.set(col(x, z) + k * KEY_W * KEY_W, fill); }
  }
}

/**
 * Hidden chests, the way ESO scatters them: one by most of the small places (a ruin, a ring of
 * stones, a camp, a shrine), tucked a few strides off, and more out in the wilds, one in a square
 * of land here and there. Each stands on untouched ground (nothing built there), off the roads, out
 * of the towns, on a level spot. Most are plain; some are iron-bound; a few are ornate and worth
 * the trouble. The same seed puts them in the same places for everyone.
 */
function hideChests(O: Overrides, sites: Site[]): HiddenChest[] {
  const out: HiddenChest[] = [];
  const chunks = new Map<number, Set<number>>();
  /** Columns the plan has built in (any block at all), so chests keep to bare ground. */
  const built = (x: number, z: number): boolean => {
    const k = chunkKey(x >> 5, z >> 5);
    let m = chunks.get(k);
    if (!m) { m = new Set(); const a = O.map.get(k) ?? []; for (let i = 0; i < a.length; i += 2) m.add(a[i] % (CHUNK * CHUNK)); chunks.set(k, m); }
    return m.has(localIdx(x & 31, 0, z & 31));
  };
  const towns = sites.filter((t) => t.named || t.id.startsWith('ansbury') || t.id.startsWith('st-') || t.id.startsWith('lg-'));
  const inRect = (x: number, z: number) => sites.some((t) => Math.hypot(t.x - x, t.z - z) < t.r + 60 && t.rects.some((r) => x >= r[0] - 2 && x <= r[2] + 2 && z >= r[1] - 2 && z <= r[3] + 2));
  const tryAt = (fx: number, fz: number, tier: 0 | 1 | 2, seed: number): boolean => {
    const x = Math.floor(fx), z = Math.floor(fz);
    if (x < GW + 40 && z < GW + 40) return false; // the authored valley has its own
    if (!inWorld(x, z)) return false;
    const h = heightAt(x, z);
    if (h <= SEA + 2 || roadDist(x, z) < 6 || riverDist(x, z) < 4 || lakeDist(x, z) < 4) return false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Math.abs(heightAt(x + dx, z + dz) - h) > 1) return false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (built(x + dx, z + dz)) return false;
    if (towns.some((t) => Math.hypot(t.x - x, t.z - z) < Math.max(70, t.r * 0.6))) return false;
    if (inRect(x, z)) return false;
    if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 36)) return false;
    out.push({ id: out.length, x: x + 0.5, y: h, z: z + 0.5, tier, region: regionAt(x, z).a, ry: hash2(x, z, seed + 3) * Math.PI * 2 });
    return true;
  };
  const tierFor = (r: number, near: boolean): 0 | 1 | 2 => (r < (near ? 0.12 : 0.06) ? 2 : r < (near ? 0.45 : 0.32) ? 1 : 0);
  // By the small places
  for (const t of sites) {
    if (!t.id.startsWith('poi')) continue;
    for (let k = 0; k < 8; k++) {
      const a = hash2(t.x, t.z, 101 + k) * Math.PI * 2, r = 7 + hash2(t.x, t.z, 131 + k) * 7;
      if (tryAt(t.x + Math.cos(a) * r, t.z + Math.sin(a) * r, tierFor(hash2(t.x, t.z, 151), true), 151 + k)) break;
    }
  }
  // Out in the wilds
  const CELL = 170;
  for (let cz = Math.floor(WMIN / CELL); cz <= Math.floor(WMAX / CELL); cz++) for (let cx = Math.floor(WMIN / CELL); cx <= Math.floor(WMAX / CELL); cx++) {
    if (hash2(cx, cz, 171) > 0.72) continue;
    for (let k = 0; k < 9; k++) {
      const x = (cx + 0.1 + hash2(cx, cz, 181 + k) * 0.8) * CELL, z = (cz + 0.1 + hash2(cx, cz, 191 + k) * 0.8) * CELL;
      if (tryAt(x, z, tierFor(hash2(cx, cz, 201), false), 211 + k)) break;
    }
  }
  return out;
}

/** Where a road runs into a lake or over a river (the Turnpike over the Millpond, the Waystation road west):
 *  a timber bridge, three planks wide, level with the graded road on either bank, on posts down to the bed,
 *  with a post standing up at the side every four blocks. */
function lakeBridges(O: Overrides): void {
  for (const line of WORLD_ROADS) for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    let n = 0;
    for (let s = 0; s <= len; s += 0.5) {
      const cx = ax + ux * s, cz = az + uz * s;
      if (cx < GW + 2 && cz < GW + 2) continue;
      // Out to a block past the water each side, so the deck meets the bank
      const wet = [-1.5, 0, 1.5].some((k) => heightAt(Math.floor(cx + ux * k), Math.floor(cz + uz * k)) <= SEA);
      if (!wet || (lakeDist(cx, cz) > 6 && riverDist(cx, cz) > 8)) continue;
      const rg = roadGrade(Math.floor(cx), Math.floor(cz));
      const deck = Math.max(SEA, Math.round(rg?.h ?? SEA + 1) - 1);
      for (let w = -1.5; w <= 1.5; w += 0.5) {
        const x = Math.floor(cx - uz * w), z = Math.floor(cz + ux * w);
        if (heightAt(x, z) > deck) continue; // the bank itself
        O.set(x, deck, z, B.Planks);
        for (let y = Math.max(1, heightAt(x, z)); y < deck; y++) if (y >= SEA) O.set(x, y, z, B.Air);
        O.set(x, deck + 1, z, B.Air); O.set(x, deck + 2, z, B.Air);
      }
      if (n++ % 8 === 0) for (const side of [-2.2, 2.2]) {
        const x = Math.floor(cx - uz * side), z = Math.floor(cz + ux * side);
        for (let y = Math.max(1, Math.floor(heightAt(x, z))); y <= deck + 1; y++) O.set(x, y, z, B.OakLog);
      }
    }
  }
}

/**
 * Lantern posts along the roads between towns, one every 24 blocks on alternating sides, leaning
 * out over the road; the towns light their own streets. They're grouped into stretches so only the
 * lamps near the player are built and lit.
 */
function roadLamps(O: Overrides, sites: Site[]): void {
  const towns = sites.filter((s) => s.named);
  let n = 0, side = 1, stretch: Site | null = null;
  for (const line of WORLD_ROADS) for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 12; t < len; t += 24) {
      side = -side;
      const cx = ax + ux * t, cz = az + uz * t;
      // Off the road's edge, on open dry ground, outside the towns (they have their own lamps)
      const x = Math.floor(cx - uz * 2.8 * side) + 0.5, z = Math.floor(cz + ux * 2.8 * side) + 0.5;
      const g = heightAt(Math.floor(x), Math.floor(z));
      if (g <= SEA + 1 || roadDist(x, z) < 1.8 || Math.abs(g - heightAt(Math.floor(cx), Math.floor(cz))) > 2) continue;
      if (towns.some((s) => Math.hypot(s.x - x, s.z - z) < (s.id === 'aldermere' ? 260 : 40))) continue;
      if (sites.some((s) => !s.named && s.id.startsWith('poi') && Math.hypot(s.x - x, s.z - z) < 24)) continue;
      if (!stretch || Math.hypot(stretch.x - x, stretch.z - z) > 90) {
        stretch = { id: 'roadlamps' + n++, name: '', region: regionAt(x, z).a, x, z, r: 170, named: false, props: [], rects: [], impostor: [] };
        sites.push(stretch);
      }
      // The lamp's arm reaches back toward the middle of the road
      const ry = Math.atan2(-(cz - z), cx - x);
      stretch.props.push({ t: 'lantern', x, y: g, z, ry });
      O.set(x, g, z, B.Barrier); O.set(x, g + 1, z, B.Barrier);
    }
  }
}

/**
 * Every lantern post leans out over the way people walk: its arm turns toward the paving, path or
 * road beside it (whichever side most of it lies), whatever its builder said. A lamp with open
 * ground all round, or paving all round (the middle of a square), keeps the way it was set.
 */
function aimLamps(O: Overrides, sites: Site[]): void {
  const PAVED = new Set<number>([B.Path, B.Cobble, B.StoneBrick, B.Gravel, B.MossyCobble, B.Planks]);
  const chunks = new Map<number, Map<number, number>>();
  const idAt = (x: number, y: number, z: number): number | undefined => {
    const k = chunkKey(x >> 5, z >> 5);
    let m = chunks.get(k);
    if (!m) { m = new Map(); const a = O.map.get(k) ?? []; for (let i = 0; i < a.length; i += 2) m.set(a[i], a[i + 1]); chunks.set(k, m); }
    return m.get(localIdx(x & 31, y, z & 31));
  };
  const walkway = (x: number, y: number, z: number): boolean => {
    if (roadDist(x + 0.5, z + 0.5) < 1.6) return true;
    const under = idAt(x, y - 1, z), at = idAt(x, y, z);
    return under !== undefined && PAVED.has(under) && (at === undefined || at === B.Air);
  };
  for (const s of sites) for (const p of s.props) {
    if (p.t !== 'lantern') continue;
    const lx = Math.floor(p.x), lz = Math.floor(p.z), ly = Math.floor(p.y);
    let sx = 0, sz = 0, n = 0, all = 0;
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dz);
      if (d < 0.5 || d > 4.2) continue;
      all++;
      if (!walkway(lx + dx, ly, lz + dz)) continue;
      sx += dx / (d * d); sz += dz / (d * d); n++;
    }
    if (!n || n > all * 0.85 || Math.hypot(sx, sz) < 0.15) continue;
    // Town streets run square: a lamp nearly square to one leans straight out over it
    const ry = Math.atan2(-sz, sx), sq = Math.round(ry / (Math.PI / 2)) * (Math.PI / 2);
    p.ry = s.id.startsWith('roadlamps') || Math.abs(ry - sq) > 0.35 ? ry : sq;
  }
}

/** Tools can listen for every street and paved area laid (the path check uses this). */
let streetHook: ((x0: number, z0: number, x1: number, z1: number, kind: string) => void) | null = null;
export function setStreetHook(fn: typeof streetHook): void { streetHook = fn; }

export function plan(): Plan {
  if (cached) return cached;
  const sites: Site[] = [];
  const O = new Overrides();
  /** Every town street laid so far, so later builders keep off them. */
  const streets: [number, number, number, number][] = [];
  const flats: Flatten[] = [];

  // ---------------------------------------------------------------- Named sites
  const gullZ = 600, gullCoast = coastX(gullZ);
  const lightZ = 330, lightCoast = coastX(lightZ);
  /** A landmark to build (sea: it's on the sea bed, and the land's points of interest ignore it). */
  interface Named { id: string; name: string; x: number; z: number; r0: number; r1: number; h?: number; sea?: boolean; under?: boolean; build: (s: Site, base: number) => void }
  const named: Named[] = [
    { id: 'aldermere', name: 'Ansbury', x: 820, z: 300, r0: 205, r1: 250, h: 24, build: (s, b) => { buildAldermere(s, b); buildNewTown(b, extra); } },
    { id: 'cotters', name: 'Cotter\'s End', x: 486, z: 252, r0: 20, r1: 34, build: (s, b) => buildHamlet(s, b, 486, 252, 'thatch', 4) },
    { id: 'waystation', name: 'The Waystation', x: 708, z: 572, r0: 16, r1: 28, build: (s, b) => buildWaystation(s, b) },
    { id: 'hollowoak', name: 'The Hollow Oak', x: 304, z: 600, r0: 14, r1: 24, build: (s, b) => buildHollowOak(s, b) },
    { id: 'mossgate', name: 'Ketley Arches', x: 176, z: 860, r0: 18, r1: 30, build: (s, b) => buildMossgate(s, b) },
    { id: 'wendside', name: 'Wendside Cottage', x: 408, z: 200, r0: 10, r1: 18, h: 20, build: (s, b) => buildCottage(s, b) },
    { id: 'lots', name: 'Wendside Lots', x: 416, z: 214, r0: 0, r1: 0, build: (s) => buildLots(s) },
    { id: 'woodcamp', name: 'Fellers\' Camp', x: 446, z: 520, r0: 12, r1: 22, build: (s) => { buildCamp(s, 446, 520, true); fellersExtras(s); } },
    { id: 'gullmouth', name: 'Gullmouth', x: gullCoast - 34, z: gullZ, r0: 26, r1: 40, h: SEA + 3, build: (s, b) => buildGullmouth(s, b, gullCoast) },
    { id: 'lighthouse', name: 'Fleet Light', x: lightCoast - 14, z: lightZ, r0: 7, r1: 14, build: (s, b) => buildLighthouse(s, b) },
    { id: 'harrowgate', name: 'Harrowgate Works', x: 1000, z: 1000, r0: 30, r1: 46, build: (s, b) => buildHarrowgate(s, b) },
    { id: 'mesafort', name: 'Gallows Knap', x: 1250, z: 1250, r0: 16, r1: 26, build: (s, b) => buildFort(s, b) },
    { id: 'coldhearth', name: 'Kelderby', x: 300, z: 1460, r0: 20, r1: 32, build: (s, b) => buildHamlet(s, b, 300, 1460, 'slate', 3) },
    { id: 'starwatch', name: 'Scarth Watch', x: 600, z: 1700, r0: 12, r1: 22, build: (s, b) => buildObservatory(s, b) },
    { id: 'temple', name: 'Glass Kirk', x: 1190, z: 1800, r0: 18, r1: 30, build: (s, b) => buildTemple(s, b) },
    { id: 'bothy', name: 'Hale\'s Fold', x: 382, z: 1380, r0: 18, r1: 30, build: (s, b) => buildBothy(s, b) },
    { id: 'skyisles', name: 'The Weatherholms', x: 900, z: 1640, r0: 0, r1: 0, build: (s) => buildIslands(s) },
    { id: 'mewstones', name: 'The Mewstones', x: MEW.x, z: MEW.z, r0: 16, r1: 30, h: SEA + 8, build: (s, b) => buildMewstones(s, b) },
    // Public dungeons and delves (open to anyone who finds them), vistas, and the wonders of the realm
    { id: 'pd-mortlake', name: 'Mortlake Cellars', x: 322, z: 1018, r0: 34, r1: 50, h: 30, build: (s, b) => buildUnderworks(s, b, 'mortlake') },
    { id: 'pd-blackcut', name: 'The Black Cut', x: 1067, z: 1180, r0: 34, r1: 50, build: (s, b) => buildUnderworks(s, b, 'blackcut') },
    { id: 'delve-badger', name: 'Badger Holt', x: 567, z: 539, r0: 20, r1: 30, h: 27, build: (s, b) => buildUnderworks(s, b, 'badger') },
    { id: 'delve-culvert', name: 'Withy Culvert', x: 900, z: 640, r0: 20, r1: 30, h: 27, build: (s, b) => buildUnderworks(s, b, 'culvert') },
    { id: 'delve-smugglers', name: 'Smugglers\' Hole', x: 1660, z: 1090, r0: 20, r1: 30, h: 28, build: (s, b) => buildUnderworks(s, b, 'smugglers') },
    { id: 'delve-tinner', name: 'Tinner\'s Adit', x: 826, z: 1274, r0: 20, r1: 30, h: 28, build: (s, b) => buildUnderworks(s, b, 'tinner') },
    { id: 'delve-seep', name: 'The Cold Seep', x: 700, z: 1560, r0: 20, r1: 30, build: (s, b) => buildUnderworks(s, b, 'seep') },
    { id: 'delve-hob', name: 'Hob\'s Barrow', x: 150, z: 760, r0: 20, r1: 30, h: 33, build: (s, b) => buildUnderworks(s, b, 'hob') },
    { id: 'vista-northhead', name: 'Vista: Gannet Head', x: 1050, z: -200, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-westcape', name: 'Vista: Cape Wrath', x: -170, z: 640, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-gulf', name: 'Vista: the Gulf Cliffs', x: 1468, z: 1420, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-raddle', name: 'Vista: Red Knoll', x: 1226, z: 1080, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-scarth', name: 'Vista: Scarth Edge', x: 908, z: 1900, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-hagworm', name: 'Vista: Wychwood Rise', x: 330, z: 1150, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-turnpike', name: 'Vista: Beacon Hill', x: 585, z: 144, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'vista-southhead', name: 'Vista: the Lizard', x: 693, z: 2269, r0: 0, r1: 0, build: (s) => buildVista(s) },
    { id: 'sc-weeping', name: 'The Weeping Stair', x: 470, z: 1250, r0: 0, r1: 0, build: (s, b) => buildWeepingStair(s, b) },
    { id: 'sc-arch', name: 'The Kelpie Arch', x: -310, z: 700, r0: 0, r1: 0, build: (s) => buildSeaArch(s) },
    { id: 'sc-colossus', name: 'The Stone King', x: 1365, z: 1054, r0: 30, r1: 44, build: (s, b) => buildColossus(s, b) },
    { id: 'sc-drowned', name: 'The Drowned Bell-tower', x: 1560, z: 1500, r0: 0, r1: 0, build: (s) => buildDrownedTower(s) },
    // A long barrow on Tolmen Moor that the frost cracked open (the Waits' storyline: data/content/waits.ts)
    { id: 'carne', name: 'Carne Barrow', x: CARNE.x, z: CARNE.z, r0: 0, r1: 0, build: (s) => buildCarne(s) },
    // Under the sea: the parish the tower belonged to, and a reef that wrecks ships off the Fleet Coast
    // The outer lands' towns, at the far ends of the roads over the necks
    { id: 'cragsby', name: 'Cragsby', x: CRAGSBY.x, z: CRAGSBY.z, r0: 22, r1: 34, build: (s, b) => buildOuterTown(s, b, 'cragsby') },
    { id: 'holme', name: 'Holme Staithe', x: HOLME.x, z: HOLME.z, r0: 22, r1: 34, build: (s, b) => buildOuterTown(s, b, 'holme') },
    { id: 'scarrow', name: 'Scarrow Tor', x: SCARROW.x, z: SCARROW.z, r0: 22, r1: 34, build: (s, b) => buildOuterTown(s, b, 'scarrow') },
    { id: 'delve-holmsey', name: 'Holmsey', x: 1512, z: 1500, r0: 0, r1: 0, sea: true, build: (s) => buildHolmsey(s) },
    { id: 'dive-grindles', name: 'The Grindles', x: 1905, z: 1032, r0: 0, r1: 0, sea: true, build: (s) => buildGrindles(s) },
    // Group dungeons: buried halls, entered by a door elsewhere (the Old Man's from Sallow Pit's chamber)
    { id: 'gd-oldman', name: 'The Old Man\'s Workings', x: 254, z: -58, r0: 0, r1: 0, under: true, build: (s) => buildOldMan(s) },
    { id: 'sc-pools', name: 'The Kingfisher Steps', x: 266, z: 880, r0: 0, r1: 0, build: (s, b) => buildKingfisherSteps(s, b) },
    { id: 'sc-crater', name: 'The Kettle', x: 807, z: 2070, r0: 0, r1: 0, build: (s, b) => buildGreatStarfall(s, b) },
    // (after the Kettle, so the crack into its north wall is cut through the crater's rim)
    { id: 'gd-kettle', name: 'Under the Kettle', x: 760, z: 1990, r0: 0, r1: 0, under: true, build: (s) => buildUnderKettle(s) },
    // World bosses' lairs and the Shardfalls' landing grounds (data/activities.ts says when they're used)
    ...WORLD_BOSSES.map((b): Named => ({ id: 'lair-' + b.id, name: LAIR_NAMES[b.id], x: b.x, z: b.z, r0: 20, r1: 32, build: (s, g) => buildLair(s, g, b.type) })),
    ...SHARDFALLS.map(([x, z], i): Named => ({ id: 'shardfall-' + i, name: 'Shardfall ground', x, z, r0: 12, r1: 22, build: (s, g) => buildShardGround(s, g) })),
    { id: 'wreck', name: 'The Gannet\'s Wreck', x: coastX(780) + 22, z: 780, r0: 0, r1: 0, build: (s) => buildWreck(s, coastX(780) + 22, 780) },
    // Stables outside the towns (data/stables.ts)
    ...STABLES.map((st): Named => ({ id: st.id, name: st.name, x: st.x, z: st.z, r0: 0, r1: 0, build: (s) => buildStable(s, st) })),
    // Inkholm, the mushroom isle (data/inkholm.ts)
    { id: 'ink-gillsby', name: 'Gillsby Staithe', x: GILLSBY.x, z: GILLSBY.z, r0: 26, r1: 38, h: SEA + 4, build: (s, b) => buildGillsby(s, b) },
    { id: 'ink-hythe', name: 'Black Hythe', x: HYTHE.x, z: HYTHE.z, r0: 22, r1: 34, h: SEA + 5, build: (s, b) => buildBlackHythe(s, b) },
    { id: 'ink-priory', name: 'Corra Priory', x: PRIORY.x, z: PRIORY.z, r0: 15, r1: 27, h: PRIORY.y, build: (s, b) => buildPriory(s, b) },
    ...REEKS.map((r): Named => ({ id: 'reek-' + r.id, name: r.name, x: r.x, z: r.z, r0: 7, r1: 13, build: (s, b) => buildReek(s, b, r) })),
    // Bandit forts in the back country (data/forts.ts)
    ...FORTS.map((f): Named => ({ id: 'fort-' + f.id, name: f.name, x: f.x, z: f.z, r0: 22, r1: 34, build: (s, b) => buildBanditFort(s, b, f) })),
    // Lodging houses, rooms let by the week (data/lodgings.ts)
    ...LODGINGS.map((L): Named => ({ id: L.id, name: L.name, x: L.x, z: L.z, r0: 0, r1: 0, build: (s) => buildLodging(s, L) })),
  ];
  for (const n of named) {
    if (n.r1 > 0) flats.push({ x: n.x, z: n.z, r0: n.r0, r1: n.r1, h: n.h ?? Math.max(SEA + 2, Math.round(baseHeight(n.x, n.z))) });
  }
  // Holme Staithe's mere, west of the town, that its staithe runs out into
  flats.push({ x: HOLME.x - 40, z: HOLME.z + 4, r0: 9, r1: 14, h: SEA - 3 });
  // Gullmouth's upper town inland of the harbour; Harrowgate's Company Row west of the palisade
  flats.push({ x: Math.floor(gullCoast) - 100, z: gullZ, r0: 44, r1: 64, h: SEA + 3 });
  flats.push({ x: 952, z: 1006, r0: 30, r1: 44, h: Math.max(SEA + 2, Math.round(baseHeight(1000, 1000))) });

  // ---------------------------------------------------------------- Scattered points of interest
  const pois: { x: number; z: number; kind: string; region: RegionId }[] = [];
  const CELL = 176;
  for (let cz = 0; cz < OLD_EDGE / CELL; cz++) for (let cx = 0; cx < OLD_EDGE / CELL; cx++) {
    if (hash2(cx, cz, 501) > 0.8) continue;
    let x = Math.floor(cx * CELL + 30 + hash2(cx, cz, 502) * (CELL - 60));
    let z = Math.floor(cz * CELL + 30 + hash2(cx, cz, 503) * (CELL - 60));
    // Not astride Ansbury's outer wall (a stone ring was built through it): out past the wall instead.
    // Ones nearer than a ring's width only: the town was laid out round those further in
    const W = NEW_WALL;
    if (x > W.x0 - 9 && x < W.x1 + 9 && z > W.z0 - 9 && z < W.z1 + 9) {
      const d = [Math.abs(x - W.x0), Math.abs(x - W.x1), Math.abs(z - W.z0), Math.abs(z - W.z1)], m = Math.min(...d);
      if (m < 9) { if (m === d[0]) x = W.x0 - 18; else if (m === d[1]) x = W.x1 + 18; else if (m === d[2]) z = W.z0 - 18; else z = W.z1 + 18; }
    }
    if (x < GW + 40 && z < GW + 40) continue;
    if (x > 1800 || z < 50 || x < 50 || z > OLD_EDGE - 60) continue;
    const reg = regionAt(x, z).a;
    const h = baseHeight(x, z);
    // (by the heart's own roads: the outer lands' roads came later, and mustn't move these)
    if (h <= SEA + 1 || heartRoadDist(x, z) < 16 || riverDist(x, z) < 20 || lakeDist(x, z) < 10) continue;
    // (Stables and lodging houses came later, and were placed clear of these: they don't move them)
    if (named.some((n) => !n.sea && !n.under && !/^(st|lg)-/.test(n.id) && Math.hypot(n.x - x, n.z - z) < 80)) continue;
    const kinds: Record<RegionId, string[]> = {
      greenwake: ['stones'], crownroad: ['shrine', 'ruintower', 'stones', 'farm'], brambledeep: ['mossruin', 'stones', 'camp', 'shrine'],
      saltwind: ['ruintower', 'camp', 'stones'], redstone: ['mine', 'camp', 'mesaruin', 'mine'], starfall: ['crystals', 'stones', 'ruintower', 'crystals'],
      gannet: ['shrine', 'ruintower', 'camp'], wrath: ['mossruin', 'camp', 'shrine'], tolmen: ['stones', 'ruintower', 'crystals'], inkholm: ['mossruin', 'stones'],
    };
    const list = kinds[reg];
    const kind = list[Math.floor(hash2(cx, cz, 504) * list.length)];
    pois.push({ x, z, kind, region: reg });
    flats.push({ x, z, r0: 6, r1: 12, h: Math.round(h) });
  }
  // The outer lands' own scatter, numbered after the heart's so the heart's keep their ids
  const OCELL = 240;
  const outerKinds: Partial<Record<RegionId, string[]>> = { gannet: ['shrine', 'ruintower', 'camp', 'stones'], wrath: ['mossruin', 'camp', 'shrine', 'farm'], tolmen: ['stones', 'ruintower', 'camp', 'mine'] };
  for (let cz = Math.floor(WMIN / OCELL); cz * OCELL < WMAX; cz++) for (let cx = Math.floor(WMIN / OCELL); cx * OCELL < WMAX; cx++) {
    if (hash2(cx, cz, 511) > 0.7) continue;
    const x = Math.floor(cx * OCELL + 30 + hash2(cx, cz, 512) * (OCELL - 60)), z = Math.floor(cz * OCELL + 30 + hash2(cx, cz, 513) * (OCELL - 60));
    const reg = regionAt(x, z).a, list = outerKinds[reg];
    if (!list || (x > -140 && x < OLD_EDGE + 140 && z > -140 && z < OLD_EDGE + 140)) continue;
    const h = baseHeight(x, z);
    if (h <= SEA + 1 || roadDist(x, z) < 16 || [[10, 0], [-10, 0], [0, 10], [0, -10]].some(([dx, dz]) => Math.abs(baseHeight(x + dx, z + dz) - h) > 3)) continue;
    // (Stables and lodging houses came later, and were placed clear of these: they don't move them)
    if (named.some((n) => !/^(st|lg)-/.test(n.id) && Math.hypot(n.x - x, n.z - z) < 90)) continue;
    pois.push({ x, z, kind: list[Math.floor(hash2(cx, cz, 514) * list.length)], region: reg });
    flats.push({ x, z, r0: 6, r1: 12, h: Math.round(h) });
  }

  setFlattenZones(flats);
  // The outer lands' roads are graded: cut through the hills and banked over the hollows, never
  // more than a block's rise in two (the towns are flat already, so the grading starts from them)
  flats.push(...gradeRoads());
  setFlattenZones(flats);

  // Sites a builder adds besides its own (Ansbury's New Town wards)
  const extra: Site[] = [];
  for (const n of named) {
    const s: Site = { id: n.id, name: n.name, region: regionAt(n.x, n.z).a, x: n.x, z: n.z, r: 220, named: true, props: [], rects: [], impostor: [] };
    n.build(s, heightAt(n.x, n.z));
    sites.push(s);
  }
  sites.push(...extra);
  // A Charter Post sign at every stop (Hollin Ford's is part of the authored village).
  for (const p of POSTS) {
    const site = sites.find((x) => x.id === p.place);
    if (site) site.props.push({ t: 'sign', x: p.x, y: heightAt(p.x, p.z), z: p.z, ry: p.ry, text: 'Charter Post' });
    // ...and its post box beside it, where letters are posted and read
    if (site && p.id !== 'hollin') {
      const b = postBoxOf(p), g = heightAt(Math.floor(b.x), Math.floor(b.z));
      site.props.push({ t: 'postBox', x: b.x, y: g, z: b.z, ry: b.ry });
      O.set(Math.floor(b.x), g, Math.floor(b.z), B.Barrier); O.set(Math.floor(b.x), g + 1, Math.floor(b.z), B.Barrier);
    }
  }
  pois.forEach((p, i) => {
    const s: Site = { id: `poi${i}`, name: '', region: p.region, x: p.x, z: p.z, r: 160, named: false, props: [], rects: [], impostor: [] };
    const b = heightAt(p.x, p.z);
    switch (p.kind) {
      case 'stones': buildStones(s, p.x, p.z, b); break;
      case 'shrine': buildShrine(s, p.x, p.z, b); break;
      case 'ruintower': buildRuinTower(s, p.x, p.z, b); break;
      case 'farm': buildFarm(s, p.x, p.z, b); break;
      case 'mossruin': buildRuinWalls(s, p.x, p.z, b, B.MossyCobble); break;
      case 'mesaruin': buildRuinWalls(s, p.x, p.z, b, B.TerraBrown); break;
      case 'camp': buildSmallCamp(s, p.x, p.z); break;
      case 'mine': buildMinePOI(s, p.x, p.z, b, hash2(p.x, p.z, 9) < 0.5 ? 1 : -1); break;
      case 'crystals': buildCrystals(s, p.x, p.z, b); break;
    }
    sites.push(s);
  });

  // Fields, orchards, ribbon houses, mills and churchyards round the towns
  buildAllOutskirts();
  buildHarbourLights();
  buildCityFarms();
  buildSmithies();
  clearRoads(O, sites);
  lakeBridges(O);
  roadLamps(O, sites);
  aimLamps(O, sites);
  const waymarks = placeWaymarks(O, sites);
  // Vents, bogs and the scree under loose cliffs, built into the ground (data/hazards.ts)
  const hz = hazards({ sites, waymarks, overrides: O });
  stamp(hz, O);
  footings(O);
  const chests = hideChests(O, sites);
  // The taverns' signs, by their doors (data/content/taverns.ts)
  for (const t of TAVERN_SIGNS) {
    let best: Site | null = null, bd = 160;
    for (const st of sites) { const d = Math.hypot(st.x - t.x, st.z - t.z); if (d < bd) { bd = d; best = st; } }
    best?.props.push({ t: 'sign', x: t.x, y: heightAt(Math.floor(t.x), Math.floor(t.z)), z: t.z, ry: t.ry, text: t.text });
  }

  const rectsByChunk = new Map<number, [number, number, number, number][]>();
  // (trees keep off the hazards and the puzzles too)
  const hzRects = [...hz, ...PUZZLES.map((q) => ({ x: q.x, z: q.z, r: 7 }))].map((h): [number, number, number, number] => [Math.floor(h.x - h.r), Math.floor(h.z - h.r), Math.floor(h.x + h.r), Math.floor(h.z + h.r)]);
  // (and off the chests, so none is grown into a tree)
  const chestRects = chests.map((c): [number, number, number, number] => [Math.floor(c.x) - 1, Math.floor(c.z) - 1, Math.floor(c.x) + 1, Math.floor(c.z) + 1]);
  for (const r of [...sites.flatMap((s) => s.rects), ...hzRects, ...chestRects]) {
    for (let cz = r[1] >> 5; cz <= r[3] >> 5; cz++) for (let cx = r[0] >> 5; cx <= r[2] >> 5; cx++) {
      const k = chunkKey(cx, cz);
      if (!rectsByChunk.has(k)) rectsByChunk.set(k, []);
      rectsByChunk.get(k)!.push(r);
    }
  }
  settleBanners(sites, O);
  cached = { sites, chests, overrides: O, rectsByChunk, waymarks };
  return cached;

  // ================================================================ Builders
  // (Hoisted function declarations close over O.)

  function rect(s: Site, x0: number, z0: number, x1: number, z1: number) { s.rects.push([Math.floor(x0), Math.floor(z0), Math.ceil(x1), Math.ceil(z1)]); }
  function clearUp(x: number, z: number, from: number, to = from + 14) { for (let y = from; y < Math.min(SY, to); y++) O.set(x, y, z, B.Air); }
  function foundation(x: number, z: number, base: number, id: number = B.Cobble) {
    for (let y = Math.min(heightAt(x, z), base) - 1; y < base; y++) O.set(x, y, z, id);
  }

  function house(s: Site, x0: number, z0: number, w: number, d: number, floors: number, base: number, roof: PropDesc['mat'], door: 'n' | 's' | 'e' | 'w', opts: HouseOpts = {}) {
    houseInto(O, s, x0, z0, w, d, floors, base, roof, door, opts);
  }

  function tower(s: Site, cx: number, cz: number, size: number, height: number, base: number, mat: number, opts: { hollow?: boolean; broken?: boolean; crenel?: boolean; door?: 'n' | 's' | 'e' | 'w'; trim?: number } = {}) {
    const h0 = Math.floor(size / 2);
    rect(s, cx - h0 - 1, cz - h0 - 1, cx + h0 + 1, cz + h0 + 1);
    for (let z = cz - h0; z <= cz + h0; z++) for (let x = cx - h0; x <= cx + h0; x++) {
      foundation(x, z, base, mat);
      clearUp(x, z, base, base + height + 4);
      const shell = Math.abs(x - cx) === h0 || Math.abs(z - cz) === h0;
      const corner = Math.abs(x - cx) === h0 && Math.abs(z - cz) === h0;
      const topY = opts.broken ? base + height - Math.floor(hash2(x, z, 61) * 6) : base + height;
      for (let y = base; y < topY; y++) {
        if (!shell && opts.hollow) { if (y === base + height - 1) O.set(x, y, z, B.Planks); continue; }
        let id = mat;
        if (opts.trim && (y - base) % 6 === 5) id = opts.trim;
        if (shell && !corner && (y - base) % 6 === 3 && (x - cx + z - cz) % 2 === 0) id = B.Window;
        O.set(x, y, z, shell || !opts.hollow ? id : B.Air);
      }
      if (opts.crenel && shell && (x + z) % 2 === 0) O.set(x, base + height, z, mat);
    }
    if (opts.door) {
      const dx = opts.door === 'e' ? h0 : opts.door === 'w' ? -h0 : 0, dz = opts.door === 's' ? h0 : opts.door === 'n' ? -h0 : 0;
      const walkIn = !!opts.hollow;
      O.set(cx + dx, base, cz + dz, walkIn ? B.Air : B.Barrier); O.set(cx + dx, base + 1, cz + dz, walkIn ? B.Air : B.Barrier);
      if (walkIn) O.set(cx + dx, base + 2, cz + dz, B.Cobble);
      const ry = opts.door === 'n' ? Math.PI : opts.door === 's' ? 0 : opts.door === 'e' ? Math.PI / 2 : -Math.PI / 2;
      if (walkIn) {
        // The leaf stands open against the jamb, inside
        const nx = Math.sign(dx), nz = Math.sign(dz), tx = -nz, tz = nx;
        s.props.push({ t: 'furn', item: 'doorOpen', x: cx + dx + 0.5 + tx * 0.42 - nx * 0.5, y: base, z: cz + dz + 0.5 + tz * 0.42 - nz * 0.5, ry: Math.atan2(nx, nz), swing: true });
      } else s.props.push({ t: 'door', x: cx + dx + 0.5 + Math.sign(dx) * 0.52, y: base, z: cz + dz + 0.5 + Math.sign(dz) * 0.52, ry });
    }
  }

  function wallLine(s: Site, x0: number, z0: number, x1: number, z1: number, base: number, height: number, mat: number, gaps: [number, number][] = []) {
    const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    rect(s, Math.min(x0, x1) - 2, Math.min(z0, z1) - 2, Math.max(x0, x1) + 2, Math.max(z0, z1) + 2);
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i, z = z0 + dz * i;
      const along = dx ? x : z;
      if (gaps.some(([a, b]) => along >= a && along <= b)) continue;
      for (let t = -1; t <= 1; t++) {
        const wx = x + (dz ? t : 0), wz = z + (dx ? t : 0);
        const g = heightAt(wx, wz);
        for (let y = Math.min(g, base) - 1; y < base + height; y++) O.set(wx, y, wz, (y + i) % 9 === 0 ? B.MossyStone : mat);
        clearUp(wx, wz, base + height, base + height + 6);
        if (t === -1 || t === 1) { if (i % 2 === 0) O.set(wx, base + height, wz, mat); }
      }
    }
  }

  /**
   * A post-and-rail fence from (x0, z0) to (x1, z1), in runs of up to six blocks so it follows the
   * ground, with an invisible barrier two blocks high under it: the player steps up one block on
   * their own, so a single block would be climbed straight over.
   */
  function fence(s: Site, x0: number, z0: number, x1: number, z1: number) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.5) return;
    // Where a road crosses the line the fence stops either side of it, like a field gate left open
    const onRoad = (t: number) => { const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; return !(x < GW + 40 && z < GW + 40) && roadDist(x, z) < 2.2; };
    const n = Math.ceil(len * 2);
    if ([...Array(n + 1).keys()].some((i) => onRoad(i / n))) {
      let from: number | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, road = onRoad(t);
        if (!road && from === null) from = t;
        if ((road || i === n) && from !== null) {
          const to = road ? (i - 1) / n : t;
          if (to - from > 0.5 / len) fence(s, x0 + (x1 - x0) * from, z0 + (z1 - z0) * from, x0 + (x1 - x0) * to, z0 + (z1 - z0) * to);
          from = null;
        }
      }
      return;
    }
    const runs = Math.max(1, Math.ceil(len / 6));
    const ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let r = 0; r < runs; r++) {
      const t0 = r / runs, t1 = (r + 1) / runs;
      const mx = x0 + (x1 - x0) * (t0 + t1) / 2, mz = z0 + (z1 - z0) * (t0 + t1) / 2;
      s.props.push({ t: 'fence', x: mx, y: heightAt(Math.floor(mx), Math.floor(mz)), z: mz, len: len / runs, ry });
    }
    const steps = Math.ceil(len * 3);
    const done = new Set<string>();
    // (sampled a hair inside each end: a fence ending on a cell's edge leaves the gap beyond it open)
    const e = Math.min(0.02, len / 4) / len;
    for (let i = 0; i <= steps; i++) {
      const t = e + (i / steps) * (1 - 2 * e);
      const x = Math.floor(x0 + (x1 - x0) * t), z = Math.floor(z0 + (z1 - z0) * t);
      if (done.has(x + ',' + z)) continue;
      done.add(x + ',' + z);
      const g = heightAt(x, z);
      O.set(x, g, z, B.Barrier); // one block high: a fence is jumped, not walked over (see Player)
    }
  }
  function street(x0: number, z0: number, x1: number, z1: number) {
    streetHook?.(x0, z0, x1, z1, 'street');
    streets.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const g = heightAt(x, z);
      O.set(x, g - 1, z, (x + z) % 5 === 0 ? B.StoneBrick : hash2(x, z, 3) < 0.12 ? B.MossyCobble : B.Cobble);
      clearUp(x, z, g, g + 8);
    }
  }

  // ---------------------------------------------------------------- Ansbury
  // ---------------------------------------------------------------- Shared detail helpers
  /** Paved ground: cobbles with dressed stone in a pattern, worn patches of moss. */
  function pave(x0: number, z0: number, x1: number, z1: number, base: number, style: 'cobble' | 'flag' | 'yard' = 'cobble') {
    streetHook?.(x0, z0, x1, z1, style);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      foundation(x, z, base);
      const h = hash2(x, z, 7);
      const id = style === 'flag' ? ((x + z) % 2 === 0 ? B.StoneBrick : h < 0.15 ? B.MossyCobble : B.Cobble)
        : style === 'yard' ? (h < 0.55 ? B.Path : h < 0.8 ? B.Gravel : B.Cobble)
          : (x + z) % 5 === 0 ? B.StoneBrick : h < 0.1 ? B.MossyCobble : B.Cobble;
      O.set(x, base - 1, z, id);
      clearUp(x, z, base, base + 10);
    }
  }
  /** A planted oak: a trunk and a rounded crown, for squares and gardens where wild trees are kept out. */
  function plantTree(x: number, z: number, base: number, size = 1) {
    const trunk = 4 + Math.round(size * 2);
    for (let y = base; y < base + trunk; y++) O.set(x, y, z, B.OakLog);
    const r = 2.2 + size;
    for (let dy = -1; dy <= Math.ceil(r); dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dz * 1.05, dy * 1.3);
      if (d < r && hash2(x + dx * 3 + dy, z + dz, 33) > 0.08) {
        const yy = base + trunk - 1 + dy;
        if (dx === 0 && dz === 0 && yy < base + trunk) continue;
        O.set(x + dx, yy, z + dz, B.OakLeaves);
      }
    }
  }
  // ---------------------------------------------------------------- Outskirts
  /**
   * The land round a town, so it doesn't stop dead at its edge the way a Daggerfall town does:
   * houses strung along the roads out of it, strip fields and orchards, market gardens, hay and
   * woodpiles, a windmill on the rise, a gallows by the road, and the churchyard with its chapel.
   * Each piece goes where the ground is dry and fairly level, off the roads, and clear of everything
   * already built. It's its own site, so it loads with the land round the town.
   */
  interface Outskirts {
    id: string; name: string;
    /** The town's own extent: nothing of the outskirts goes inside it, or within `gap` of it. */
    box: [number, number, number, number];
    gap: number; reach: number;
    ribbon: number; fields: number; orchards: number; gardens: number;
    mill: boolean; gallows: boolean; churchyard: boolean;
    roof: PropDesc['mat']; wall: number;
    /** Highland fields are walled in dry stone, not fenced. */
    stone?: boolean;
  }
  function buildOutskirts(o: Outskirts): void {
    const [bx0, bz0, bx1, bz1] = o.box;
    const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
    const s: Site = { id: 'out-' + o.id, name: '', region: regionAt(cx, cz).a, x: cx, z: cz, r: 160, named: false, props: [], rects: [], impostor: [] };
    sites.push(s);
    // How far a point is outside the town's box (0 inside it)
    const out = (x: number, z: number) => Math.max(bx0 - x, x - bx1, bz0 - z, z - bz1, 0);
    const nearRects = sites.flatMap((t) => t.rects).filter((r) => r[2] > bx0 - o.reach - 40 && r[0] < bx1 + o.reach + 40 && r[3] > bz0 - o.reach - 40 && r[1] < bz1 + o.reach + 40);
    const taken = (x0: number, z0: number, x1: number, z1: number) => [...nearRects, ...s.rects].some((r) => x0 <= r[2] && x1 >= r[0] && z0 <= r[3] && z1 >= r[1]);
    /** Dry, within `rise` of level, `road` blocks off any road, clear of rivers and of everything built. */
    const fits = (x0: number, z0: number, x1: number, z1: number, road = 4, rise = 2) => {
      if (taken(x0 - 1, z0 - 1, x1 + 1, z1 + 1)) return false;
      let lo = Infinity, hi = -Infinity;
      for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) {
        const h = heightAt(x, z);
        if (h <= SEA + 1 || roadDist(x, z) < road || riverDist(x, z) < 4 || lakeDist(x, z) < 4) return false;
        lo = Math.min(lo, h); hi = Math.max(hi, h);
      }
      return hi - lo <= rise;
    };
    // Candidate spots round the ring, in an order of their own (not a sweep, so pieces spread out)
    const ring = (lo: number, hi: number, step: number, salt: number): [number, number][] => {
      const c: [number, number, number][] = [];
      for (let x = Math.floor(bx0 - hi); x <= bx1 + hi; x += step) for (let z = Math.floor(bz0 - hi); z <= bz1 + hi; z += step) {
        const d = out(x, z);
        if (d >= lo && d <= hi) c.push([x, z, hash2(x, z, salt)]);
      }
      return c.sort((a, b) => a[2] - b[2]).map(([x, z]) => [x, z]);
    };
    const doorTo = (dx: number, dz: number): 'n' | 's' | 'e' | 'w' => (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : dz > 0 ? 's' : 'n');
    const roofs: PropDesc['mat'][] = [o.roof, o.roof, 'thatch', o.roof === 'slate' ? 'slate' : 'red'];

    // Houses along the roads out of town, a little back from the verge, their doors to the road
    let ribbon = 0;
    const ribbonOn = new Map<number, number>();
    for (const [ri, road] of WORLD_ROADS.entries()) {
      let since = 99;
      for (let i = 0; i + 1 < road.length; i++) {
        const [ax, az] = road[i], [bx, bz] = road[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 0.5) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        for (let t = 0; t < len; t += 1) {
          since++;
          const px = ax + ux * t, pz = az + uz * t, d = out(px, pz);
          if (d < o.gap || d > o.gap + 14 * o.ribbon || since < 13 || (ribbonOn.get(ri) ?? 0) >= o.ribbon * 2) continue;
          for (const side of [1, -1]) {
            const hx = Math.round(px - uz * side * 9.5), hz = Math.round(pz + ux * side * 9.5);
            const w = 7 + (hash2(hx, hz, 401) < 0.4 ? 1 : 0), dd = 6;
            const x0 = hx - Math.floor(w / 2), z0 = hz - 3;
            if (!fits(x0, z0, x0 + w - 1, z0 + dd - 1, 3.5)) continue;
            const door = doorTo(uz * side, -ux * side);
            house(s, x0, z0, w, dd, hash2(hx, hz, 402) < 0.3 ? 2 : 1, Math.floor(heightAt(hx, hz)), roofs[Math.floor(hash2(hx, hz, 403) * roofs.length)], door, { wall: hash2(hx, hz, 404) < 0.6 ? o.wall : B.Plaster });
            // A woodpile or a cart by the house, on the side away from the door
            const bxw = hx + (door === 'e' ? -w / 2 - 1.5 : door === 'w' ? w / 2 + 1.5 : 0), bzw = hz + (door === 's' ? -4.5 : door === 'n' ? 4.5 : 0);
            if (hash2(hx, hz, 405) < 0.5 && !taken(Math.floor(bxw) - 1, Math.floor(bzw) - 1, Math.floor(bxw) + 1, Math.floor(bzw) + 1)) {
              logStack(Math.floor(bxw), Math.floor(bzw), 3, 2, door === 'n' || door === 's');
              rect(s, Math.floor(bxw) - 1, Math.floor(bzw) - 1, Math.floor(bxw) + 3, Math.floor(bzw) + 3);
            }
            ribbon++; ribbonOn.set(ri, (ribbonOn.get(ri) ?? 0) + 1); since = 0;
            break;
          }
        }
      }
    }

    // Strip fields: furrowed, a headland path every fifth row, fenced (or walled) with a gate gap
    const field = (x0: number, z0: number, x1: number, z1: number) => {
      for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) {
        const g = heightAt(x, z);
        clearUp(x, z, g, g + 6);
        O.set(x, g - 1, z, (z - z0) % 5 === 0 ? B.Path : B.Farmland);
      }
      const gx = Math.round((x0 + x1) / 2);
      if (o.stone) { drystone(x0, z0, x1, z0, [[gx, z0]]); drystone(x0, z1, x1, z1); drystone(x0, z0, x0, z1); drystone(x1, z0, x1, z1); }
      else { fence(s, x0, z0, gx - 1, z0); fence(s, gx + 1, z0, x1, z0); fence(s, x0, z1, x1, z1); fence(s, x0, z0, x0, z1); fence(s, x1, z0, x1, z1); }
      rect(s, x0, z0, x1, z1);
      // Hay at the corner by the gate, now and then
      if (hash2(x0, z0, 410) < 0.5 && !taken(x1 + 1, z0 - 3, x1 + 3, z0 - 1)) { haystack(x1 + 1, z0 - 3, 2 + Math.floor(hash2(x0, z0, 411) * 2)); rect(s, x1 + 1, z0 - 3, x1 + 3, z0 - 1); }
    };
    let fields = 0;
    for (const [x, z] of ring(o.gap + 10, o.reach, 7, 412)) {
      if (fields >= o.fields) break;
      const w = 14 + Math.floor(hash2(x, z, 413) * 10), d = 10 + Math.floor(hash2(x, z, 414) * 7);
      if (!fits(x, z, x + w, z + d, 5, 3)) continue;
      field(x, z, x + w, z + d); fields++;
    }
    // Orchards: rows of small apple trees in a fence
    let orchards = 0;
    for (const [x, z] of ring(o.gap + 6, o.reach - 10, 7, 415)) {
      if (orchards >= o.orchards) break;
      if (!fits(x, z, x + 13, z + 13, 5, 2)) continue;
      fence(s, x, z, x + 13, z); fence(s, x, z + 13, x + 13, z + 13); fence(s, x, z, x, z + 6); fence(s, x, z + 8, x, z + 13); fence(s, x + 13, z, x + 13, z + 13);
      for (let tx = x + 2; tx <= x + 11; tx += 4) for (let tz = z + 2; tz <= z + 11; tz += 4) plantTree(tx, tz, heightAt(tx, tz), 0.15);
      rect(s, x, z, x + 13, z + 13); orchards++;
    }
    // Market gardens close in: small beds and a barrow's worth of crates
    let gardens = 0;
    for (const [x, z] of ring(o.gap, o.gap + 18, 5, 416)) {
      if (gardens >= o.gardens) break;
      if (!fits(x, z, x + 7, z + 5, 4, 1)) continue;
      for (let gz = z + 1; gz < z + 5; gz++) for (let gx = x + 1; gx < x + 7; gx++) { const g = heightAt(gx, gz); clearUp(gx, gz, g, g + 4); O.set(gx, g - 1, gz, gz === z + 3 ? B.Path : B.Farmland); }
      fence(s, x, z, x + 7, z); fence(s, x, z + 5, x + 7, z + 5); fence(s, x, z, x, z + 5); fence(s, x + 7, z, x + 7, z + 2);
      s.props.push({ t: 'crate', x: x + 8.5, y: heightAt(x + 8, z + 4), z: z + 4.5 });
      rect(s, x, z, x + 9, z + 5); gardens++;
    }

    // A windmill on the highest dry ground going
    if (o.mill) {
      let best: [number, number] | null = null, bh = -Infinity;
      for (const [x, z] of ring(o.gap + 14, o.reach, 6, 417)) {
        if (!fits(x - 5, z - 5, x + 5, z + 5, 6, 2)) continue;
        const h = heightAt(x, z);
        if (h > bh) { bh = h; best = [x, z]; }
      }
      if (best) windmill(s, best[0], best[1], Math.atan2(best[0] - cx, best[1] - cz));
    }
    // A gallows on a rise by a road out of town: two posts and a beam, and the drop under it
    if (o.gallows) {
      for (const [x, z] of ring(o.gap + 12, o.gap + 40, 4, 418)) {
        const rd = roadDist(x, z);
        if (rd < 6 || rd > 14 || !fits(x - 2, z - 2, x + 2, z + 2, 5, 1)) continue;
        const g = heightAt(x, z), along = hash2(x, z, 419) < 0.5;
        for (let y = 0; y < 5; y++) { O.set(along ? x - 1 : x, g + y, along ? z : z - 1, B.OakLog); O.set(along ? x + 1 : x, g + y, along ? z : z + 1, B.OakLog); }
        for (let k = -1; k <= 1; k++) O.set(along ? x + k : x, g + 5, along ? z : z + k, B.DarkPlanks);
        s.props.push({ t: 'rope', x: x + 0.5, y: g + 5, z: z + 0.5, ry: along ? 0 : Math.PI / 2, len: 0.2, h: 1.6, r: 0.02 });
        rect(s, x - 2, z - 2, x + 2, z + 2);
        break;
      }
    }
    // The churchyard, near a road so the dead can be carried to it
    // (near a road if there's room; out by a track if the town's ground is tight)
    if (o.churchyard) for (const far of [24, 48]) {
      let done = false;
      for (const [x, z] of ring(o.gap + 4, o.gap + 46 + (far > 24 ? 20 : 0), 4, 420)) {
        const w = o.ribbon >= 4 ? 22 : 16, d = o.ribbon >= 4 ? 18 : 14;
        const rd = roadDist(x + w / 2, z + d / 2);
        if (rd < 8 || rd > far || !fits(x, z, x + w, z + d, 5, 2)) continue;
        // The gate on the side facing the nearest road
        let gate: 'n' | 's' | 'e' | 'w' = 'n', gd = Infinity;
        for (const [g, gx, gz] of [['n', x + w / 2, z - 4], ['s', x + w / 2, z + d + 4], ['w', x - 4, z + d / 2], ['e', x + w + 4, z + d / 2]] as const) { const r = roadDist(gx, gz); if (r < gd) { gd = r; gate = g; } }
        churchyard(s, x, z, w, d, gate, `${o.name} Churchyard`, o.roof);
        done = true;
        break;
      }
      if (done) break;
    }
  }

  /** A tower mill like the Gorse Mill: a round shell of plaster banded with timber, a thatched cap, sails that turn. */
  function windmill(s: Site, MX: number, MZ: number, face: number) {
    const base = Math.floor(heightAt(MX, MZ)) + 1;
    const fx = Math.round(Math.sin(face) * 4), fz = Math.round(Math.cos(face) * 4);
    const dist = (x: number, z: number) => Math.max(Math.abs(x - MX), Math.abs(z - MZ)) * 0.72 + Math.min(Math.abs(x - MX), Math.abs(z - MZ)) * 0.42;
    for (let z = MZ - 4; z <= MZ + 4; z++) for (let x = MX - 4; x <= MX + 4; x++) {
      if (dist(x, z) > 3.4) continue;
      foundation(x, z, base, B.StoneBrick);
      clearUp(x, z, base, base + 16);
    }
    for (let y = base; y < base + 11; y++) {
      const r = 3.4 - (y - base) * 0.05;
      for (let z = MZ - 4; z <= MZ + 4; z++) for (let x = MX - 4; x <= MX + 4; x++) {
        const d = dist(x, z);
        if (d > r) continue;
        const shell = d > r - 1, door = x === MX - Math.sign(fx) * 3 && z === MZ - Math.sign(fz) * 3 && y < base + 2;
        O.set(x, y, z, !shell || door ? B.Air : y < base + 3 ? B.StoneBrick : (y - base) % 4 === 3 ? B.DarkPlanks : (x + z + y) % 7 === 0 ? B.Window : B.Plaster);
      }
    }
    for (let z = MZ - 3; z <= MZ + 3; z++) for (let x = MX - 3; x <= MX + 3; x++) if (dist(x, z) <= 2.4) O.set(x, base - 1, z, B.Planks);
    s.props.push({ t: 'cone', x: MX + 0.5, y: base + 10.9, z: MZ + 0.5, r: 5, h: 3.8, mat: 'thatch' });
    s.props.push({ t: 'sails', x: MX + 0.5 + Math.sin(face) * 5.1, y: base + 9, z: MZ + 0.5 + Math.cos(face) * 5.1, ry: face });
    rect(s, MX - 6, MZ - 6, MX + 6, MZ + 6);
    void fx;
  }

  /**
   * A churchyard: a dry-stone wall with a lychgate, rows of graves (headstones, crosses, a chest tomb
   * or two, the oldest leaning), yews by the wall, and a small stone chapel at the far end.
   */
  function churchyard(s: Site, x0: number, z0: number, w: number, d: number, gate: 'n' | 's' | 'e' | 'w', name: string, roof: PropDesc['mat']) {
    const x1 = x0 + w, z1 = z0 + d;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const g = heightAt(x, z); clearUp(x, z, g, g + 10); }
    const gx = Math.round((x0 + x1) / 2), gz = Math.round((z0 + z1) / 2);
    const gapAt: [number, number] = gate === 'n' ? [gx, z0] : gate === 's' ? [gx, z1] : gate === 'w' ? [x0, gz] : [x1, gz];
    drystone(x0, z0, x1, z0, gate === 'n' ? [gapAt] : []); drystone(x0, z1, x1, z1, gate === 's' ? [gapAt] : []);
    drystone(x0, z0, x0, z1, gate === 'w' ? [gapAt] : []); drystone(x1, z0, x1, z1, gate === 'e' ? [gapAt] : []);
    // The lychgate: two posts and a little roof over the way in
    const ns = gate === 'n' || gate === 's', g0 = heightAt(gapAt[0], gapAt[1]);
    for (const k of [-2, 2]) for (let y = 0; y < 3; y++) O.set(ns ? gapAt[0] + k : gapAt[0], g0 + y, ns ? gapAt[1] : gapAt[1] + k, B.OakLog);
    s.props.push({ t: 'roof', x: gapAt[0] + 0.5, y: g0 + 3, z: gapAt[1] + 0.5, len: 5.4, span: 2.4, rise: 1, ry: ns ? 0 : Math.PI / 2, mat: roof });
    // The name board stands out from the wall, beside the way in
    const sgx = gapAt[0] + (ns ? 3.2 : gate === 'w' ? -2.6 : 2.6), sgz = gapAt[1] + (ns ? (gate === 'n' ? -2.6 : 2.6) : 3.2);
    s.props.push({ t: 'sign', x: sgx + 0.5, y: heightAt(Math.floor(sgx), Math.floor(sgz)), z: sgz + 0.5, ry: gate === 'n' ? Math.PI : gate === 'e' ? Math.PI / 2 : gate === 'w' ? -Math.PI / 2 : 0, text: name });
    // The chapel at the far end from the gate
    const cw = 7, cd = 9;
    const cX = gate === 'w' ? x1 - cd - 1 : gate === 'e' ? x0 + 2 : gx - Math.floor(cw / 2);
    const cZ = gate === 'n' ? z1 - cd - 1 : gate === 's' ? z0 + 2 : gz - Math.floor(cw / 2);
    const cW = ns ? cw : cd, cD = ns ? cd : cw;
    house(s, cX, cZ, cW, cD, 1, Math.floor(heightAt(cX + cW / 2, cZ + cD / 2)), roof, gate, { wall: B.StoneBrick, role: 'chapel', chimney: false });
    // Graves in rows across the yard, facing the gate side, clear of the path to the chapel door
    const inChapel = (x: number, z: number) => x >= cX - 1 && x <= cX + cW && z >= cZ - 1 && z <= cZ + cD;
    const ry = gate === 'n' ? Math.PI : gate === 'e' ? Math.PI / 2 : gate === 'w' ? -Math.PI / 2 : 0;
    for (let z = z0 + 2; z <= z1 - 2; z += ns ? 3 : 2) for (let x = x0 + 2; x <= x1 - 2; x += ns ? 2 : 3) {
      if (inChapel(x, z) || (ns ? Math.abs(x - gx) <= 1 : Math.abs(z - gz) <= 1)) continue;
      const hsh = hash2(x, z, 430);
      if (hsh < 0.12) continue; // a gap in the row
      const g = heightAt(x, z);
      const kind = hsh < 0.5 ? 0 : hsh < 0.68 ? 1 : hsh < 0.8 ? 3 : hsh < 0.93 ? 4 : 2;
      s.props.push({ t: 'grave', x: x + 0.5, y: g, z: z + 0.5, ry: ry + (kind === 3 ? (hsh - 0.7) * 2 : 0), tint: kind });
      O.set(x, g, z, B.Barrier);
      // The plot in front of the stone, a little mounded and bare
      const [mx, mz] = gate === 'n' ? [x, z - 1] : gate === 's' ? [x, z + 1] : gate === 'w' ? [x - 1, z] : [x + 1, z];
      if (kind !== 2 && !inChapel(mx, mz)) O.set(mx, heightAt(mx, mz) - 1, mz, B.Dirt);
      if (kind === 2) O.set(mx, g, mz, B.Barrier);
    }
    // Yews in the corners away from the gate
    for (const [tx, tz] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) {
      if (Math.hypot(tx - gapAt[0], tz - gapAt[1]) < 6 || inChapel(tx, tz)) continue;
      plantTree(tx, tz, heightAt(tx, tz), 0.35);
    }
    const [ox, oz] = gate === 'n' ? [0, -1.6] : gate === 's' ? [0, 1.6] : gate === 'w' ? [-1.6, 0] : [1.6, 0];
    s.props.push({ t: 'lantern', x: gapAt[0] + 0.5 + ox + (ns ? -3 : 0), y: heightAt(Math.floor(gapAt[0] + ox + (ns ? -3 : 0)), Math.floor(gapAt[1] + oz + (ns ? 0 : -3))), z: gapAt[1] + 0.5 + oz + (ns ? 0 : -3) });
    rect(s, x0 - 1, z0 - 1, x1 + 1, z1 + 1);
  }

  function buildAllOutskirts() {
    const named = (id: string) => sites.find((t) => t.id === id);
    const W = NEW_WALL;
    buildOutskirts({ id: 'ansbury', name: 'Ansbury', box: [W.x0, W.z0, W.x1, W.z1], gap: 8, reach: 75, ribbon: 5, fields: 9, orchards: 3, gardens: 5, mill: true, gallows: true, churchyard: true, roof: 'red', wall: B.Plaster });
    const town = (id: string, half: number, o: Partial<Outskirts>) => {
      const t = named(id);
      if (!t) return;
      buildOutskirts({ id, name: t.name, box: [t.x - half, t.z - half, t.x + half, t.z + half], gap: 6, reach: 55, ribbon: 3, fields: 4, orchards: 1, gardens: 2, mill: false, gallows: false, churchyard: true, roof: 'thatch', wall: B.Plaster, ...o });
    };
    town('gullmouth', 44, { ribbon: 4, fields: 4, orchards: 1, gardens: 3, mill: true, gallows: true, roof: 'slate', wall: B.StoneBrick });
    town('harrowgate', 50, { fields: 0, orchards: 0, gardens: 2, roof: 'slate', wall: B.StoneBrick });
    town('cotters', 34, { ribbon: 2, fields: 4, orchards: 2, gardens: 1, mill: true });
    town('waystation', 28, { ribbon: 2, fields: 3, orchards: 1, gardens: 1, churchyard: false });
    town('coldhearth', 32, { ribbon: 2, fields: 3, orchards: 0, gardens: 1, roof: 'slate', wall: B.StoneBrick, stone: true });
    town('cragsby', 34, { roof: 'slate', wall: B.StoneBrick, stone: true, gallows: true });
    town('holme', 34, { fields: 3, mill: true });
    town('scarrow', 34, { fields: 2, orchards: 0, roof: 'slate', wall: B.StoneBrick, stone: true });
  }

  // ---------------------------------------------------------------- Harbour lights
  /**
   * A light for every harbour: on the nearest dry point near the town that has the most open water
   * round it (a headland or the end of the shore), a banded tower of sixteen blocks with a glazed
   * lantern room, a cap, a light that shows at night, and the keeper's woodpile. Fleet Light on the
   * Fleet Coast is the big one (buildLighthouse); these are the ports' own.
   */
  function buildHarbourLights() {
    const ports: [string, string, number, number][] = [];
    for (const [id, name] of [['gullmouth', 'Gullmouth Light'], ['cragsby', 'Cragsby Light'], ['holme', 'Staithe Light'], ['ink-gillsby', 'Gillsby Light']] as const) {
      const t = sites.find((x) => x.id === id);
      if (t) ports.push([id, name, t.x, t.z]);
    }
    for (const [id, name, tx, tz] of ports) {
      const near = sites.flatMap((t) => t.rects).filter((r) => r[2] > tx - 140 && r[0] < tx + 140 && r[3] > tz - 140 && r[1] < tz + 140);
      let best: [number, number, number] | null = null;
      for (let x = Math.floor(tx - 110); x <= tx + 110; x += 3) for (let z = Math.floor(tz - 110); z <= tz + 110; z += 3) {
        const d = Math.hypot(x - tx, z - tz);
        if (d < 30 || d > 110) continue;
        const h = heightAt(x, z);
        if (h <= SEA + 1 || h > SEA + 34) continue; // (a cliff top will do where the coast is all cliff)
        let lo = Infinity, hi = -Infinity, ok = true;
        for (let dx = -4; dx <= 4 && ok; dx += 2) for (let dz = -4; dz <= 4; dz += 2) { const g = heightAt(x + dx, z + dz); if (g <= SEA) { ok = false; break; } lo = Math.min(lo, g); hi = Math.max(hi, g); }
        if (!ok || hi - lo > 3 || roadDist(x, z) < 6) continue;
        if (near.some((r) => x - 6 <= r[2] && x + 6 >= r[0] && z - 6 <= r[3] && z + 6 >= r[1])) continue;
        // Open water round it, out to twenty blocks
        let wet = 0;
        for (let a = 0; a < 16; a++) for (const rr of [10, 15, 20]) if (heightAt(Math.round(x + Math.cos((a / 8) * Math.PI) * rr), Math.round(z + Math.sin((a / 8) * Math.PI) * rr)) <= SEA) wet++;
        const score = wet - d * 0.08 - (h - SEA) * 0.15;
        if (wet >= 14 && (!best || score > best[2])) best = [x, z, score];
      }
      if (!best) continue;
      const [cx, cz] = best;
      const s: Site = { id: 'light-' + id, name, region: regionAt(cx, cz).a, x: cx, z: cz, r: 160, named: false, props: [], rects: [], impostor: [] };
      sites.push(s);
      harbourLight(s, cx, cz, Math.floor(heightAt(cx, cz)) + 1, Math.atan2(tx - cx, tz - cz));
    }
  }

  function harbourLight(s: Site, cx: number, cz: number, base: number, toTown: number) {
    const H = 16;
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) clearUp(cx + dx, cz + dz, base, base + H + 8);
    for (let y = base - 4; y < base + H + 3; y++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dz);
      const r = y < base + H ? 3.1 - (y - base) * 0.03 : 2.4;
      if (d > r) continue;
      const shell = d > r - 1.1;
      if (!shell && y >= base) { O.set(cx + dx, y, cz + dz, y === base + H ? B.Planks : B.Air); continue; }
      let id: number = Math.floor((y - base) / 3) % 2 === 0 ? B.Plaster : B.Clay;
      if (y < base + 2) id = B.StoneBrick;
      if (y >= base + H + 1) id = (dx + dz) % 2 === 0 ? B.Window : B.Timber;
      O.set(cx + dx, y, cz + dz, id);
    }
    // A stair winding up inside, and the door toward the town
    for (let y = base; y < base + H; y++) { const a = (y - base) * 0.8; O.set(cx + Math.round(Math.cos(a) * 1.3), y, cz + Math.round(Math.sin(a) * 1.3), B.Planks); }
    const ddx = Math.round(Math.sin(toTown) * 3), ddz = Math.round(Math.cos(toTown) * 3);
    O.set(cx + ddx, base, cz + ddz, B.Air); O.set(cx + ddx, base + 1, cz + ddz, B.Air);
    s.props.push({ t: 'cone', x: cx + 0.5, y: base + H + 3, z: cz + 0.5, r: 3, h: 3.2, mat: 'red' });
    s.props.push({ t: 'glow', x: cx + 0.5, y: base + H + 1.8, z: cz + 0.5, r: 5, color: '#ffe0a0' });
    // The keeper's woodpile and a bench by the door
    s.props.push({ t: 'bench', x: cx + 0.5 + Math.sin(toTown) * 5 + Math.cos(toTown) * 2, y: heightAt(Math.floor(cx + Math.sin(toTown) * 5), Math.floor(cz + Math.cos(toTown) * 5)), z: cz + 0.5 + Math.cos(toTown) * 5 - Math.sin(toTown) * 2, ry: toTown + Math.PI });
    s.impostor.push({ x: cx + 0.5, y: base + H / 2, z: cz + 0.5, w: 6, h: H + 3, d: 6, color: '#e8dcc8' }, { x: cx + 0.5, y: base + H + 4, z: cz + 0.5, w: 6, h: 3, d: 6, color: '#a8382c', cone: true });
    rect(s, cx - 6, cz - 6, cx + 6, cz + 6);
  }

  // ---------------------------------------------------------------- The farms that feed the towns
  /**
   * A city eats more than its walls can grow: round Ansbury and the bigger towns the land is let in
   * farms. Each is a farmstead (house, barn, yard, well, hay, fields: buildFarm) with a paddock of
   * stock (cows, pigs, sheep, hens: Site.animals, put out by the game as you come near), a pigsty,
   * and its name on a board at the gate. They stand a field or two back from the roads, on dry,
   * fairly level ground clear of everything else, between the outskirts and the wild.
   */
  function buildCityFarms() {
    const FARM_NAMES = ['Lower Farm', 'Highfield', 'Oxleaze', 'Copse Farm', 'Long Acre', 'Mill Farm', 'Coldharbour', 'Pease Hill', 'Rookery Farm', 'Dove House Farm', 'Withy Farm', 'Brook Farm',
      'Sedge End', 'Hollins Farm', 'Stonecross', 'Ashlea', 'Kiln Farm', 'Wheatley', 'Bean Close', 'Moor End', 'Hanger Farm', 'Newland', 'Thornbury', 'Lane End', 'Barrow Farm', 'Furzedown'];
    let named = 0;
    const towns: [string, number, number, number][] = [
      // town, farms, how far out (from its middle) they start and stop
      ['aldermere', 8, 215, 430], ['gullmouth', 4, 70, 230], ['harrowgate', 2, 80, 220], ['cotters', 2, 60, 200], ['holme', 2, 55, 200], ['cragsby', 2, 55, 200], ['scarrow', 1, 55, 200], ['coldhearth', 1, 55, 190],
    ];
    for (const [id, want, r0, r1] of towns) {
      const t = sites.find((x) => x.id === id);
      if (!t) continue;
      const near = sites.flatMap((x) => x.rects).filter((r) => r[2] > t.x - r1 - 60 && r[0] < t.x + r1 + 60 && r[3] > t.z - r1 - 60 && r[1] < t.z + r1 + 60);
      const placed: [number, number, number, number][] = [];
      const cands: [number, number, number][] = [];
      for (let x = Math.floor(t.x - r1); x <= t.x + r1; x += 7) for (let z = Math.floor(t.z - r1); z <= t.z + r1; z += 7) {
        const d = Math.hypot(x - t.x, z - t.z);
        if (d >= r0 && d <= r1) cands.push([x, z, hash2(x, z, 440)]);
      }
      cands.sort((a, b) => a[2] - b[2]);
      let n = 0;
      for (const [x, z] of cands) {
        if (n >= want) break;
        // The farm's whole lot: buildFarm's yard and fields, and the paddock and sty east of them
        const b: [number, number, number, number] = [x - 21, z - 15, x + 34, z + 36];
        if ([...near, ...placed].some((r) => b[0] - 2 <= r[2] && b[2] + 2 >= r[0] && b[1] - 2 <= r[3] && b[3] + 2 >= r[1])) continue;
        let lo = Infinity, hi = -Infinity, ok = true;
        for (let px = b[0]; px <= b[2] && ok; px += 3) for (let pz = b[1]; pz <= b[3]; pz += 3) {
          const h = heightAt(px, pz);
          if (h <= SEA + 1 || roadDist(px, pz) < 5 || riverDist(px, pz) < 5 || lakeDist(px, pz) < 5) { ok = false; break; }
          lo = Math.min(lo, h); hi = Math.max(hi, h);
        }
        // Not too far off a road: a farm sends its carts to market
        if (!ok || hi - lo > 7 || roadDist(x, z) > 90) continue;
        // The yard and the house and barn plots must be near level; the fields can roll
        const spread = (x0: number, z0: number, x1: number, z1: number) => { let l = Infinity, h = -Infinity; for (let px = x0; px <= x1; px++) for (let pz = z0; pz <= z1; pz++) { const g = heightAt(px, pz); l = Math.min(l, g); h = Math.max(h, g); } return h - l; };
        if (spread(x - 8, z - 6, x + 8, z + 5) > 1 || spread(x - 13, z - 11, x - 4, z - 3) > 2 || spread(x + 2, z - 13, x + 14, z - 4) > 2 || spread(x + 12, z + 6, x + 32, z + 22) > 3) continue;
        const name = FARM_NAMES[named++ % FARM_NAMES.length];
        const s: Site = { id: `farm-${id}-${n}`, name: '', region: regionAt(x, z).a, x, z, r: 160, named: false, props: [], rects: [], impostor: [], animals: [] };
        sites.push(s);
        buildFarm(s, x, z, heightAt(x, z));
        stockyard(s, x, z);
        s.props.push({ t: 'sign', x: x + 0.5, y: heightAt(x, z + 4), z: z + 4.6, ry: 0, text: name });
        placed.push(b);
        n++;
      }
    }
  }

  /** East of a farm's yard: a fenced paddock with its stock, a pigsty, and a hen run by the house. */
  function stockyard(s: Site, x: number, z: number) {
    const px0 = x + 12, pz0 = z + 6, px1 = x + 32, pz1 = z + 22;
    for (let pz = pz0 + 1; pz < pz1; pz++) for (let px = px0 + 1; px < px1; px++) { const g = heightAt(px, pz); clearUp(px, pz, g, g + 6); }
    fence(s, px0, pz0, px0 + 8, pz0); fence(s, px0 + 11, pz0, px1, pz0); fence(s, px0, pz1, px1, pz1); fence(s, px0, pz0, px0, pz1); fence(s, px1, pz0, px1, pz1);
    // Most farms run cattle; some sheep; every one keeps a few pigs and hens
    const h = hash2(x, z, 441);
    const herd: AnimalSpot['kind'] = h < 0.65 ? 'cow' : 'sheep';
    const coats: AnimalSpot['pal'][] = herd === 'cow' ? [{}, { a: '#26211e', b: '#efe8dc' }, { a: '#b87a4a', b: '#f2ece0' }, { a: '#5a3a26' }] : [{}, {}, { a: '#4a443e', b: '#221e1a' }];
    for (let i = 0; i < (herd === 'cow' ? 4 : 6); i++) s.animals!.push({ kind: herd, x: px0 + 4 + (i % 3) * 5 + 0.5, z: pz0 + 4 + Math.floor(i / 3) * 6 + 0.5, r: 6, pal: coats[i % coats.length] });
    s.props.push({ t: 'barrel', x: px0 + 2.5, y: heightAt(px0 + 2, pz0 + 2), z: pz0 + 2.5 }); // the trough
    // The sty: a low stone pen with a lean-to, in the paddock's far corner
    const sx0 = px1 - 7, sz0 = pz1 - 6;
    drystone(sx0, sz0, px1 - 1, sz0); drystone(sx0, sz0, sx0, pz1 - 1);
    for (let sx = sx0 + 1; sx < px1; sx++) for (let sz = sz0 + 1; sz < pz1; sz++) O.set(sx, heightAt(sx, sz) - 1, sz, B.Dirt);
    s.props.push({ t: 'roof', x: px1 - 2, y: heightAt(px1 - 2, pz1 - 2) + 2.2, z: pz1 - 2.5, len: 4, span: 3, rise: 0.8, ry: 0, mat: 'thatch' });
    for (let i = 0; i < 3; i++) s.animals!.push({ kind: 'pig', x: sx0 + 2.5 + i * 1.5, z: sz0 + 2.5, r: 2, pal: i === 2 ? { b: '#3a2a26' } : {} });
    // Hens loose in the yard
    for (let i = 0; i < 4; i++) s.animals!.push({ kind: 'chicken', x: x - 4.5 + i * 2, z: z + 0.5, r: 4 });
    rect(s, x - 21, z - 15, x + 34, z + 36);
  }

  // ---------------------------------------------------------------- Smithies
  /**
   * Every town of any size keeps a smithy by its Charter Post where anyone can work: an open-sided
   * shed under a slate roof with a brick furnace (a fire in its mouth, a flue through the roof) and
   * bellows, an anvil with a quench barrel, a joiner's bench along the back, and a cook fire out in
   * front. Each is a crafting station where it stands (Site.stations; Game opens crafting there).
   */
  function buildSmithies() {
    const towns = ['aldermere', 'gullmouth', 'harrowgate', 'waystation', 'woodcamp', 'coldhearth', 'cragsby', 'holme', 'scarrow', 'ink-gillsby', 'cotters'];
    for (const id of towns) {
      const t = sites.find((x) => x.id === id);
      if (!t) continue;
      const post = POSTS.find((p) => p.place === id);
      const ax = post ? post.x : t.x, az = post ? post.z : t.z;
      // (a whole walled town's keep-the-wild-out rect is no bar: the gaps between its buildings are)
      const near = [...sites.flatMap((x) => x.rects).filter((r) => (r[2] - r[0]) * (r[3] - r[1]) < 20000), ...streets].filter((r) => r[2] > ax - 130 && r[0] < ax + 130 && r[3] > az - 130 && r[1] < az + 130);
      let best: [number, number, 'n' | 's', number] | null = null;
      for (let x = Math.floor(ax - 110); x <= ax + 110; x += 2) for (let z = Math.floor(az - 110); z <= az + 110; z += 2) {
        const d = Math.hypot(x + 5 - ax, z + 3.5 - az);
        if (d < 9 || d > 110 || (best && d >= best[3])) continue;
        const face: 'n' | 's' = az > z + 3.5 ? 's' : 'n';
        // The shed and the yard in front of it (where the cook fire is)
        const b: [number, number, number, number] = face === 's' ? [x - 1, z - 1, x + 10, z + 11] : [x - 1, z - 5, x + 10, z + 7];
        if (near.some((r) => b[0] <= r[2] && b[2] >= r[0] && b[1] <= r[3] && b[3] >= r[1])) continue;
        let lo = Infinity, hi = -Infinity, ok = true;
        for (let px = b[0]; px <= b[2] && ok; px++) for (let pz = b[1]; pz <= b[3]; pz++) {
          const h = heightAt(px, pz);
          if (h <= SEA + 1 || roadDist(px, pz) < 2.5 || riverDist(px, pz) < 3) { ok = false; break; }
          lo = Math.min(lo, h); hi = Math.max(hi, h);
        }
        if (ok && hi - lo <= 1) best = [x, z, face, d];
      }
      if (!best) continue;
      const s: Site = { id: 'smithy-' + id, name: '', region: regionAt(best[0], best[1]).a, x: best[0] + 5, z: best[1] + 3, r: 160, named: false, props: [], rects: [], impostor: [], stations: [] };
      sites.push(s);
      smithy(s, best[0], best[1], best[2]);
    }
  }

  function smithy(s: Site, x0: number, z0: number, face: 'n' | 's') {
    const W = 10, D = 7, base = Math.floor(heightAt(x0 + 5, z0 + 3));
    // v runs from the back wall (0) to the open front (D - 1)
    const Z = (v: number) => (face === 's' ? z0 + v : z0 + D - 1 - v);
    const zf = (v: number) => (face === 's' ? z0 + v : z0 + D - v); // a prop's z, from a v measured in blocks
    const ry = face === 's' ? 0 : Math.PI;
    const out = face === 's' ? 1 : -1;
    pave(x0, Math.min(Z(0), Z(D - 1)), x0 + W - 1, Math.max(Z(0), Z(D - 1)), base, 'flag');
    // Posts, a low stone back wall, the roof
    for (const [u, v] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1], [5, D - 1]]) for (let y = base; y < base + 4; y++) O.set(x0 + u, y, Z(v), B.OakLog);
    for (let u = 1; u < W - 1; u++) for (let y = base; y < base + 2; y++) O.set(x0 + u, y, Z(0), B.StoneBrick);
    for (const u of [0, W - 1]) for (let v = 1; v < D - 1; v++) O.set(x0 + u, base, Z(v), B.StoneBrick);
    s.props.push({ t: 'roof', x: x0 + W / 2, y: base + 4, z: z0 + D / 2, len: W, span: D, rise: roofRise(D), ry: 0, mat: 'slate' });
    // The furnace: three bricks wide, two deep, its mouth open to the front with the fire in it, a flue up through the roof
    for (let u = 1; u <= 3; u++) for (let v = 1; v <= 2; v++) for (let y = base; y < base + 3; y++) O.set(x0 + u, y, Z(v), y === base + 2 ? B.Cobble : B.StoneBrick);
    O.set(x0 + 2, base, Z(2), B.Air);
    for (let y = base + 3; y < base + 9; y++) O.set(x0 + 2, y, Z(1), B.Cobble);
    s.props.push({ t: 'flame', x: x0 + 2.5, y: base, z: zf(2) + 0.5 * out, r: 0.55 });
    s.props.push({ t: 'glow', x: x0 + 2.5, y: base + 0.8, z: zf(3), r: 1.6, color: '#ff8a3a' }, { t: 'smoke', x: x0 + 2.5, y: base + 9.3, z: zf(1) + 0.5 * out });
    s.props.push({ t: 'bellows', x: x0 + 4.4, y: base, z: zf(1.6), ry });
    // The anvil, the quench barrel by it, and the joiner's bench along the back
    s.props.push({ t: 'anvil', x: x0 + 5.5, y: base, z: zf(3.6), ry: ry + 0.2 }, { t: 'barrel', x: x0 + 4.4, y: base, z: zf(4.6) });
    s.props.push({ t: 'desk', x: x0 + 7.9, y: base, z: zf(1.6), ry });
    for (const [u, v] of [[5, 3], [4, 4], [7, 1], [8, 1], [4, 1]]) { O.set(x0 + u, base, Z(v), B.Barrier); O.set(x0 + u, base + 1, Z(v), B.Barrier); }
    // The cook fire in the yard in front
    s.props.push({ t: 'firepit', x: x0 + 7.5, y: heightAt(x0 + 7, Z(D + 2)), z: zf(D + 2.5) });
    for (const [u, v] of [[7, D + 2]]) { const g = heightAt(x0 + u, Z(v)); O.set(x0 + u, g, Z(v), B.Barrier); }
    s.props.push({ t: 'sign', x: x0 + 1.5, y: heightAt(x0 + 1, Z(D + 1)), z: zf(D + 1.5), ry, text: 'Smithy' });
    s.props.push({ t: 'lantern', x: x0 + 9.5, y: heightAt(x0 + 9, Z(D + 1)), z: zf(D + 1.5) });
    // Where each station works from
    s.stations!.push(
      { station: 'furnace', x: x0 + 2.5, y: base + 0.8, z: zf(3) + 0.4 * out },
      { station: 'anvil', x: x0 + 5.5, y: base + 0.9, z: zf(3.6) },
      { station: 'bench', x: x0 + 7.9, y: base + 0.9, z: zf(1.6) },
      { station: 'hearth', x: x0 + 7.5, y: heightAt(x0 + 7, Z(D + 2)) + 0.6, z: zf(D + 2.5) },
    );
    rect(s, x0 - 1, Math.min(Z(0), Z(D + 3)) - 1, x0 + W, Math.max(Z(0), Z(D + 3)) + 1);
  }

  /** Stone arch over a gate gap in a wall: a lintel course at the top of the wall with crenels. */
  function gateArch(alongX: boolean, a0: number, a1: number, at: number, base: number, height: number) {
    for (let a = a0; a <= a1; a++) for (let t = -1; t <= 1; t++) {
      const x = alongX ? a : at + t, z = alongX ? at + t : a;
      for (let y = base + height - 3; y < base + height; y++) O.set(x, y, z, y === base + height - 3 ? B.Cobble : B.StoneBrick);
      if ((t === -1 || t === 1) && a % 2 === 0) O.set(x, base + height, z, B.StoneBrick);
    }
  }

  // ---------------------------------------------------------------- Ansbury
  // The keep stands at the centre in its own square, so the four streets meet around it rather
  // than running into its walls. South of it the Charter Market fills a second square, and the
  // boulevard runs on to the south gate between the Toll Office and the Weighhouse. Houses line
  // every street and fill the four quarters in lanes; Tanners' Row is the south-west quarter.
  function buildAldermere(s: Site, base: number) {
    s.r = 280;
    const X0 = 750, X1 = 890, Z0 = 230, Z1 = 370, cx = 820, cz = 300;
    rect(s, X0, Z0, X1, Z1); // no wild trees or creatures inside the walls

    // What must stay open: streets, squares, the gate yard, and everywhere somebody stands or looks.
    const taken: [number, number, number, number][] = [];
    const claim = (x0: number, z0: number, x1: number, z1: number) => taken.push([x0, z0, x1, z1]);
    const isFree = (x0: number, z0: number, x1: number, z1: number) => !taken.some((r) => x0 <= r[2] && x1 >= r[0] && z0 <= r[3] && z1 >= r[1]);
    claim(X0 - 2, Z0 - 2, X1 + 2, Z0 + 4); claim(X0 - 2, Z1 - 4, X1 + 2, Z1 + 2); // inside the walls, a walk along them
    claim(X0 - 2, Z0 - 2, X0 + 4, Z1 + 2); claim(X1 - 4, Z0 - 2, X1 + 2, Z1 + 2);
    claim(X0, cz - 4, X1, cz + 4);           // the east-west street
    claim(cx - 4, Z0, cx + 4, cz);           // the north street
    claim(cx - 4, cz, cx + 4, Z1);           // the boulevard
    claim(cx - 21, cz - 21, cx + 21, cz + 21); // the keep square
    claim(cx - 21, cz + 16, cx + 19, cz + 40); // the Charter Market
    claim(cx - 21, Z1 - 13, cx + 21, Z1);    // the gate yard (Toll Office desk, the watch, the gate book)
    for (const [px, pz] of [[778.5, 316.2], [784.5, 316.2], [779.5, 327.5], [802.6, 331.2], [811, 332], [806, 334], [812.5, 328.5]]) claim(px - 2, pz - 2, px + 2, pz + 2);

    // ---- Streets and squares
    street(X0 + 2, cz - 3, X1 - 2, cz + 3);
    street(cx - 3, Z0 + 2, cx + 3, cz);
    street(cx - 3, cz, cx + 3, Z1 - 2);
    pave(cx - 20, cz - 20, cx + 20, cz + 20, base, 'flag');      // keep square
    pave(cx - 20, cz + 16, cx + 18, cz + 39, base, 'cobble');    // Charter Market
    pave(cx - 20, Z1 - 12, cx + 20, Z1 - 2, base, 'cobble');     // gate yard
    for (const [tx, tz] of [[cx - 17, cz - 17], [cx + 17, cz - 17], [cx - 17, cz + 14], [cx + 17, cz + 14]]) plantTree(tx, tz, base, 0.6);

    // ---- Walls, towers and gates
    wallLine(s, X0, Z0, X1, Z0, base, 9, B.StoneBrick);
    wallLine(s, X0, Z1, X1, Z1, base, 9, B.StoneBrick, [[cx - 4, cx + 4]]);
    wallLine(s, X0, Z0, X0, Z1, base, 9, B.StoneBrick, [[cz - 4, cz + 4]]);
    wallLine(s, X1, Z0, X1, Z1, base, 9, B.StoneBrick, [[cz - 4, cz + 4]]);
    for (const [tx, tz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) tower(s, tx, tz, 9, 15, base, B.StoneBrick, { crenel: true, trim: B.Cobble });
    for (const [tx, tz] of [[X0, cz - 7], [X0, cz + 7], [X1, cz - 7], [X1, cz + 7], [cx - 7, Z1], [cx + 7, Z1]]) tower(s, tx, tz, 5, 13, base, B.StoneBrick, { crenel: true, trim: B.Cobble });
    // Half-way towers along the long walls
    for (const tx of [785, 855]) for (const tz of [Z0, Z1]) tower(s, tx, tz, 5, 12, base, B.StoneBrick, { crenel: true });
    for (const tz of [265, 335]) for (const tx of [X0, X1]) tower(s, tx, tz, 5, 12, base, B.StoneBrick, { crenel: true });
    gateArch(true, cx - 4, cx + 4, Z1, base, 9);
    gateArch(false, cz - 4, cz + 4, X0, base, 9);
    gateArch(false, cz - 4, cz + 4, X1, base, 9);
    for (const [tx, tz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) s.props.push({ t: 'cone', x: tx + 0.5, y: base + 16, z: tz + 0.5, r: 6.2, h: 6, mat: 'blue' });

    // ---- The keep: the Charter's hall on the ground floor, corner turrets and a parapet above
    tower(s, cx, cz, 21, 28, base, B.StoneBrick, { crenel: true, hollow: true, trim: B.Cobble });
    tower(s, cx - 8, cz - 8, 7, 36, base, B.StoneBrick, { crenel: true });
    tower(s, cx + 8, cz - 8, 7, 34, base, B.StoneBrick, { crenel: true });
    for (const tx of [cx - 10, cx + 10]) tower(s, tx, cz + 10, 5, 32, base, B.StoneBrick, { crenel: true, trim: B.Cobble });
    s.props.push({ t: 'cone', x: cx - 7.5, y: base + 36, z: cz - 7.5, r: 5.2, h: 9, mat: 'blue' });
    s.props.push({ t: 'cone', x: cx + 8.5, y: base + 34, z: cz - 7.5, r: 5.2, h: 8, mat: 'blue' });
    for (const tx of [cx - 10, cx + 10]) s.props.push({ t: 'cone', x: tx + 0.5, y: base + 32, z: cz + 10.5, r: 3.8, h: 6, mat: 'blue' });
    // Parapet: a corbelled course stepping out from the wall top, crenellated
    for (let a = -11; a <= 11; a++) for (const [x, z] of [[cx + a, cz - 11], [cx + a, cz + 11], [cx - 11, cz + a], [cx + 11, cz + a]]) {
      O.set(x, base + 26, z, B.Cobble); O.set(x, base + 27, z, B.StoneBrick);
      if ((x + z) % 2 === 0) O.set(x, base + 28, z, B.StoneBrick);
    }
    keepHall(s, cx, cz, base);
    // The keep's roof is a stone leads walk, not planks
    for (let z = cz - 9; z <= cz + 9; z++) for (let x = cx - 9; x <= cx + 9; x++) O.set(x, base + 27, z, (x + z) % 3 === 0 ? B.Cobble : B.StoneBrick);
    // A broad step along the front, and lamps and banners at the door
    for (let x = cx - 7; x <= cx + 7; x++) { O.set(x, base, cz + 11, B.StoneBrick); clearUp(x, cz + 11, base + 1, base + 4); }
    for (const [bx, bz] of [[cx - 4, cz + 11.2], [cx + 5, cz + 11.2]]) s.props.push({ t: 'banner', x: bx, y: base + 14, z: bz, kind: 'aldermere' });
    for (const lx of [cx - 3.5, cx + 4.5]) s.props.push({ t: 'wallLantern', x: lx, y: base + 3.2, z: cz + 11.05, ry: 0 });
    for (const [bx, bz, ry] of [[X0 - 2.5, cz - 5, 0], [X0 - 2.5, cz + 6, 0], [X1 + 2.5, cz - 5, 0], [X1 + 2.5, cz + 6, 0]] as const) s.props.push({ t: 'banner', x: bx, y: base + 8.5, z: bz, kind: 'aldermere', ry });

    // ---- Civic buildings on the boulevard and the market
    house(s, cx - 21, Z1 - 20, 12, 9, 2, base, 'slate', 's', { wall: B.StoneBrick, role: 'office' });   // the Toll Office
    house(s, cx - 20, cz + 41, 9, 7, 1, base, 'red', 'e', { role: 'shop' });                           // chandler by the market
    house(s, cx + 6, cz + 41, 16, 12, 2, base, 'slate', 'w', { wall: B.StoneBrick, role: 'office' });  // the Weighhouse
    s.props.push({ t: 'sign', x: cx + 4.2, y: base, z: cz + 50.5, ry: Math.PI / 2, text: 'Weighhouse' });
    s.props.push({ t: 'sign', x: cx - 15.5, y: base, z: Z1 - 10.2, ry: 0, text: 'Toll Office' });
    claim(cx - 23, Z1 - 22, cx - 7, Z1 - 10); claim(cx - 22, cz + 39, cx - 9, cz + 49); claim(cx + 4, cz + 39, cx + 24, cz + 55);

    // ---- Tanners' Row: the Gisborne foundry keeps its place, with its yard behind
    house(s, 776, 318, 8, 7, 1, base, 'blue', 'n', { role: 'workshop', wall: B.StoneBrick });
    claim(774, 316, 786, 330);
    s.props.push({ t: 'crate', x: 778.2, y: base, z: 326.6 }, { t: 'barrel', x: 781.4, y: base, z: 327.8 }, { t: 'barrel', x: 782.4, y: base, z: 327.2 });

    // ---- Street fronts: terraced houses facing every street
    const roofs: PropDesc['mat'][] = ['blue', 'slate', 'red', 'blue', 'slate'];
    const walls = [B.Plaster, B.Plaster, B.Planks, B.StoneBrick];
    let k = 0;
    // Every building's footprint, with a block either side for gable-end chimneys
    const built: [number, number, number, number][] = [[cx - 22, Z1 - 20, cx - 9, Z1 - 12], [cx - 21, cz + 41, cx - 11, cz + 47], [cx + 5, cz + 41, cx + 22, cz + 52], [775, 318, 784, 324]];
    const inBuilding = (x: number, z: number) => built.some((r) => r[0] <= x && x <= r[2] && r[1] <= z && z <= r[3]);
    const plot = (x0: number, z0: number, w: number, d: number, door: 'n' | 's' | 'e' | 'w', role?: Role) => {
      if (!isFree(x0 - 1, z0 - 1, x0 + w, z0 + d)) return false;
      claim(x0 - 1, z0 - 1, x0 + w, z0 + d);
      built.push(w >= d ? [x0 - 1, z0, x0 + w, z0 + d - 1] : [x0, z0 - 1, x0 + w - 1, z0 + d]);
      const h = hash2(x0, z0, 13);
      house(s, x0, z0, w, d, h < 0.45 ? 2 : 1, base, roofs[k % roofs.length], door, { wall: walls[Math.floor(h * 97) % walls.length], role: role ?? (h > 0.9 ? 'store' : h > 0.8 ? 'workshop' : 'home') });
      k++;
      return true;
    };
    // East-west street: a row each side, doors onto the street
    // An inn on the corner by the keep square, then the rows
    plot(cx - 35, cz - 14, 13, 9, 's', 'inn');
    for (let x = X0 + 5; x + 8 <= cx - 22; x += 9) { plot(x, cz - 12, 8, 7, 's'); plot(x, cz + 6, 8, 7, 'n'); }
    for (let x = cx + 23; x + 8 <= X1 - 4; x += 9) { plot(x, cz - 12, 8, 7, 's', x < cx + 33 ? 'shop' : undefined); plot(x, cz + 6, 8, 7, 'n', x < cx + 33 ? 'shop' : undefined); }
    // North street: a row each side, doors onto the street
    for (let z = Z0 + 5; z + 8 <= cz - 22; z += 9) { plot(cx - 13, z, 7, 8, 'e'); plot(cx + 6, z, 7, 8, 'w'); }
    // The four quarters: back-to-back rows with a lane in front of each
    const quarter = (x0: number, z0: number, x1: number, z1: number) => {
      for (let z = z0; z + 13 <= z1; z += 17) {
        let rowCount = 0;
        for (let x = x0; x + 8 <= x1; x += 10) {
          const w = 7 + Math.floor(hash2(x, z, 17) * 3), d = 6 + Math.floor(hash2(x, z, 19) * 2);
          if (plot(x, z, w, d, 'n')) rowCount++;
          if (plot(x, z + 7, w, d, 's')) rowCount++;
        }
        // Lanes in front of both rows: trodden earth and gravel, where nothing else stands
        if (rowCount) for (const lz of [z - 2, z - 1, z + 14, z + 15]) for (let x = x0 - 1; x <= x1; x++) {
          if (lz < Z0 + 5 || lz > Z1 - 5 || inBuilding(x, lz)) continue;
          const h = hash2(x, lz, 23);
          O.set(x, base - 1, lz, h < 0.6 ? B.Path : h < 0.85 ? B.Gravel : B.Cobble);
        }
      }
    };
    quarter(X0 + 6, Z0 + 7, cx - 15, cz - 14);
    quarter(cx + 8, Z0 + 7, X1 - 5, cz - 14);
    quarter(X0 + 6, cz + 16, cx - 23, Z1 - 6);
    quarter(cx + 26, cz + 16, X1 - 5, Z1 - 6);
    // Kitchen gardens and yards in what's left at the edges of the quarters
    for (const [gx, gz] of [[X0 + 7, cz + 40], [X1 - 14, cz + 40], [X0 + 7, Z0 + 40], [X1 - 14, Z0 + 40]]) {
      if (!isFree(gx - 1, gz - 1, gx + 8, gz + 6)) continue;
      claim(gx - 1, gz - 1, gx + 8, gz + 6);
      for (let z = gz + 1; z < gz + 5; z++) for (let x = gx + 1; x < gx + 7; x++) { O.set(x, base - 1, z, (z - gz) % 2 ? B.Farmland : B.Dirt); clearUp(x, z, base, base + 6); }
      fence(s, gx, gz, gx + 7, gz); fence(s, gx, gz + 5, gx + 3, gz + 5); fence(s, gx + 4.5, gz + 5, gx + 7, gz + 5);
      fence(s, gx, gz, gx, gz + 5); fence(s, gx + 7, gz, gx + 7, gz + 5);
      plantTree(gx + 9, gz + 2, base, 0.4);
    }

    // ---- The Charter Market: two rows of stalls, the market board, carts and goods
    const stallColors = ['#a8382c', '#2f528f', '#3f7a3a', '#c8a03a'];
    for (let i = 0; i < 4; i++) s.props.push({ t: 'stall', x: cx - 12 + i * 8, y: base, z: cz + 22, ry: Math.PI, color: stallColors[i] });
    for (let i = 0; i < 3; i++) s.props.push({ t: 'stall', x: cx - 8 + i * 8, y: base, z: cz + 30, ry: 0, color: stallColors[(i + 2) % 4] });
    for (let i = 0; i < 6; i++) s.props.push({ t: 'crate', x: cx - 15 + (i % 3) * 0.8, y: base + Math.floor(i / 3) * 0.6, z: cz + 25.5 + (i % 2) * 0.4 });
    s.props.push({ t: 'barrel', x: cx + 15.5, y: base, z: cz + 25.8 }, { t: 'barrel', x: cx + 16.4, y: base, z: cz + 26.4 }, { t: 'cart', x: cx + 14, y: base, z: cz + 33, ry: 0.5 });
    s.props.push({ t: 'bench', x: cx - 4, y: base, z: cz + 36.5, ry: 0 }, { t: 'bench', x: cx + 6, y: base, z: cz + 36.5, ry: 0 });
    s.props.push({ t: 'well', x: cx - 14, y: base, z: cz + 34 });
    s.props.push({ t: 'notice', x: cx - 7.5, y: base, z: cz + 28.5 }); // the market board (side-quest postings)
    for (const [bx, bz] of [[cx - 14, cz + 34], [cx - 15, cz + 34], [cx - 14, cz + 33], [cx - 15, cz + 33]]) { O.set(bx, base, bz, B.Barrier); O.set(bx, base + 1, bz, B.Barrier); }
    // ---- Outside the south gate: toll board, Charter notice, the Toll Office table inside
    s.props.push({ t: 'notice', x: cx + 8.5, y: base, z: Z1 + 4.5 }); // toll board
    s.props.push({ t: 'notice', x: cx - 8.5, y: base, z: Z1 + 4.5 }); // the Charter's own notices
    s.props.push({ t: 'desk', x: cx - 9.5, y: base, z: Z1 - 7.5 }); // the Toll Office table, inside the gate
    rect(s, cx - 10, Z1 + 3, cx - 7, Z1 + 6);
    rect(s, cx + 7, Z1 + 3, cx + 10, Z1 + 6);

    // ---- Lamps along the streets
    for (let i = 0; i < 10; i++) s.props.push({ t: 'lantern', x: cx + (i % 2 ? 4.6 : -4.4), y: base, z: Z0 + 16 + i * 14, ry: i % 2 ? Math.PI : 0 });
    for (let x = X0 + 12; x < X1 - 6; x += 14) { if (Math.abs(x - cx) < 24) continue; s.props.push({ t: 'lantern', x: x + 0.5, y: base, z: cz - 3.6, ry: 0 }, { t: 'lantern', x: x + 7.5, y: base, z: cz + 4.6, ry: Math.PI }); }

    // Seen from across the plains
    s.impostor.push(
      { x: cx, y: base + 14, z: cz, w: 21, h: 28, d: 21, color: '#8f949c' },
      { x: cx - 7.5, y: base + 18, z: cz - 7.5, w: 7, h: 36, d: 7, color: '#8f949c' },
      { x: cx + 8.5, y: base + 17, z: cz - 7.5, w: 7, h: 34, d: 7, color: '#8f949c' },
      { x: cx - 7.5, y: base + 40.5, z: cz - 7.5, w: 10, h: 9, d: 10, color: '#2f4c78', cone: true },
      { x: cx + 8.5, y: base + 38, z: cz - 7.5, w: 10, h: 8, d: 10, color: '#2f4c78', cone: true },
      { x: cx, y: base + 4.5, z: Z0, w: 140, h: 9, d: 3, color: '#8a8f98' },
      { x: cx, y: base + 4.5, z: Z1, w: 140, h: 9, d: 3, color: '#8a8f98' },
      { x: X0, y: base + 4.5, z: cz, w: 3, h: 9, d: 140, color: '#8a8f98' },
      { x: X1, y: base + 4.5, z: cz, w: 3, h: 9, d: 140, color: '#8a8f98' },
    );
  }

  // ---------------------------------------------------------------- Ansbury's New Town
  /**
   * Greater Ansbury. The old walled city is left exactly as it was; round it the New Town fills a
   * second wall with a gate on each road. Four wards, each its own site so only the nearby ones
   * build their props: the Guild Ward (north, the guildhall and clock tower on their square), the
   * Tilt Ward (east, the tilt-yard), the Minster Ward (south, the minster on its plaza and the
   * Charter Green) and the Shambles (west, the covered market). Terraces fill the rest: shut doors
   * and lit windows mostly, with one house in five open to walk into.
   */
  function buildNewTown(base: number, extra: Site[]) {
    const X0 = 750, X1 = 890, Z0 = 230, Z1 = 370, cx = 820, cz = 300; // the old walls
    const { x0: OX0, x1: OX1, z0: OZ0, z1: OZ1 } = NEW_WALL; // the new
    const ward = (id: string, name: string, x: number, z: number): Site => {
      const w: Site = { id, name, region: 'crownroad', x, z, r: 240, named: false, props: [], rects: [], impostor: [] };
      extra.push(w);
      return w;
    };
    const north = ward('ansbury-guild', 'Guild Ward', cx, 165);
    const east = ward('ansbury-tilt', 'Tilt Ward', 955, cz);
    const south = ward('ansbury-minster', 'Minster Ward', cx, 430);
    const west = ward('ansbury-shambles', 'The Shambles', 685, cz);
    /** The ward whose wall is nearest: that site carries the props built there. */
    const wardAt = (x: number, z: number) => {
      const dn = z - OZ0, ds = OZ1 - z, de = OX1 - x, dw = x - OX0, m = Math.min(dn, ds, de, dw);
      return m === dn ? north : m === ds ? south : m === de ? east : west;
    };
    rect(north, OX0, OZ0, OX1, OZ1); // no wild trees or creatures anywhere inside the new wall

    const taken: [number, number, number, number][] = [];
    const claim = (x0: number, z0: number, x1: number, z1: number) => taken.push([x0, z0, x1, z1]);
    const isFree = (x0: number, z0: number, x1: number, z1: number) => !taken.some((r) => x0 <= r[2] && x1 >= r[0] && z0 <= r[3] && z1 >= r[1]);
    claim(X0 - 17, Z0 - 17, X1 + 17, Z1 + 17); // the old city and the walk round its walls
    // Older things the town grew round: wayside shrines, the old toll tower, farm fields
    // (a farm's fields reach well south of its yard: see buildFarm)
    for (const q of pois) if (q.x > OX0 - 20 && q.x < OX1 + 20 && q.z > OZ0 - 36 && q.z < OZ1 + 14) {
      if (q.kind === 'farm') claim(q.x - 20, q.z - 14, q.x + 19, q.z + 35); else claim(q.x - 14, q.z - 14, q.x + 14, q.z + 14);
    }
    // And the south road's quest spots: Bess Tull's letters and the wolves on the verge
    claim(780, 444, 800, 466);
    claim(OX0 - 2, OZ0 - 2, OX1 + 2, OZ0 + 6); claim(OX0 - 2, OZ1 - 6, OX1 + 2, OZ1 + 2); // inside the new wall, a lane all round
    claim(OX0 - 2, OZ0 - 2, OX0 + 6, OZ1 + 2); claim(OX1 - 6, OZ0 - 2, OX1 + 2, OZ1 + 2);
    claim(OX0, cz - 6, X0 - 17, cz + 6); claim(X1 + 17, cz - 6, OX1, cz + 6); // the avenues to the gates
    claim(cx - 6, OZ0, cx + 6, Z0 - 17); claim(cx - 6, Z1 + 17, cx + 6, OZ1);

    // ---- The new wall: towers at the corners and along it, a gate on each road
    const wallH = 8;
    wallLine(north, OX0, OZ0, OX1, OZ0, base, wallH, B.StoneBrick, [[cx - 4, cx + 4]]);
    wallLine(south, OX0, OZ1, OX1, OZ1, base, wallH, B.StoneBrick, [[cx - 4, cx + 4]]);
    wallLine(west, OX0, OZ0, OX0, OZ1, base, wallH, B.StoneBrick, [[cz - 4, cz + 4]]);
    wallLine(east, OX1, OZ0, OX1, OZ1, base, wallH, B.StoneBrick, [[cz - 4, cz + 4]]);
    gateArch(true, cx - 4, cx + 4, OZ0, base, wallH);
    gateArch(true, cx - 4, cx + 4, OZ1, base, wallH);
    gateArch(false, cz - 4, cz + 4, OX0, base, wallH);
    gateArch(false, cz - 4, cz + 4, OX1, base, wallH);
    for (const [tx, tz] of [[OX0, OZ0], [OX1, OZ0], [OX0, OZ1], [OX1, OZ1]]) {
      tower(wardAt(tx, tz), tx, tz, 9, 14, base, B.StoneBrick, { crenel: true, trim: B.Cobble });
      wardAt(tx, tz).props.push({ t: 'cone', x: tx + 0.5, y: base + 15, z: tz + 0.5, r: 6, h: 6, mat: 'slate' });
    }
    for (const [tx, tz] of [[cx - 7, OZ0], [cx + 7, OZ0], [cx - 7, OZ1], [cx + 7, OZ1], [OX0, cz - 7], [OX0, cz + 7], [OX1, cz - 7], [OX1, cz + 7]]) tower(wardAt(tx, tz), tx, tz, 5, 12, base, B.StoneBrick, { crenel: true, trim: B.Cobble });
    for (const t of [700, 760, 880, 940]) for (const tz of [OZ0, OZ1]) tower(wardAt(t, tz), t, tz, 5, 11, base, B.StoneBrick, { crenel: true });
    for (const t of [190, 245, 355, 420]) for (const tx of [OX0, OX1]) tower(wardAt(tx, t), tx, t, 5, 11, base, B.StoneBrick, { crenel: true });
    for (const [bx, bz, ry, w] of [[cx - 4, OZ0 - 2.5, 0, north], [cx + 5, OZ0 - 2.5, 0, north], [cx - 4, OZ1 + 2.6, Math.PI, south], [cx + 5, OZ1 + 2.6, Math.PI, south]] as const) w.props.push({ t: 'banner', x: bx, y: base + 7.5, z: bz, kind: 'aldermere', ry });

    // ---- Streets: the ring round the old walls, the four avenues, lamps and plane trees
    street(X0 - 15, Z0 - 15, X1 + 15, Z0 - 9);
    street(X0 - 15, Z1 + 9, X1 + 15, Z1 + 15);
    street(X0 - 15, Z0 - 15, X0 - 9, Z1 + 15);
    street(X1 + 9, Z0 - 15, X1 + 15, Z1 + 15);
    street(OX0 + 1, cz - 3, X0 - 16, cz + 3);
    street(X1 + 16, cz - 3, OX1 - 1, cz + 3);
    street(cx - 3, OZ0 + 1, cx + 3, Z0 - 16);
    street(cx - 3, Z1 + 16, cx + 3, OZ1 - 1);
    pave(cx - 24, Z1 + 3, cx + 24, Z1 + 8, base, 'flag'); // the old south gate's yard, now a square
    // Plane trees on the walk between the ring road and the old wall
    for (let t = 0; t < 1; t += 1 / 14) {
      for (const [tx, tz] of [[X0 - 6, Z0 - 4 + t * (Z1 - Z0 + 8)], [X1 + 6, Z0 - 4 + t * (Z1 - Z0 + 8)], [X0 - 4 + t * (X1 - X0 + 8), Z0 - 6], [X0 - 4 + t * (X1 - X0 + 8), Z1 + 6]]) {
        const x = Math.round(tx), z = Math.round(tz);
        if (Math.abs(x - cx) < 8 || Math.abs(z - cz) < 8) continue; // keep the gateways open
        if (Math.abs(z - (Z1 + 6)) < 1 && Math.abs(x - cx) < 26) continue; // and the south gate square
        plantTree(x, z, base, 0.55);
      }
    }
    const lamp = (x: number, z: number, ry = 0) => wardAt(x, z).props.push({ t: 'lantern', x, y: base, z, ry });
    for (let x = OX0 + 10; x < X0 - 18; x += 13) { lamp(x + 0.5, cz - 4.6); lamp(x + 6.5, cz + 4.6, Math.PI); }
    for (let x = X1 + 22; x < OX1 - 6; x += 13) { lamp(x + 0.5, cz - 4.6); lamp(x + 6.5, cz + 4.6, Math.PI); }
    for (let z = OZ0 + 10; z < Z0 - 18; z += 13) { lamp(cx - 4.6, z + 0.5, Math.PI / 2); lamp(cx + 4.6, z + 6.5, -Math.PI / 2); }
    for (let z = Z1 + 22; z < OZ1 - 6; z += 13) { lamp(cx - 4.6, z + 0.5, Math.PI / 2); lamp(cx + 4.6, z + 6.5, -Math.PI / 2); }
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      lamp(X0 - 8 + t * (X1 - X0 + 16), Z0 - 16.5); lamp(X0 - 8 + t * (X1 - X0 + 16), Z1 + 16.5, Math.PI);
    }

    // ---- Guild Ward: the guildhall and its clock tower on a flagged square with a fountain
    claim(756, 134, 816, 197);
    pave(758, 156, 815, 195, base, 'flag');
    house(north, 764, 138, 28, 15, 2, base, 'slate', 's', { wall: B.StoneBrick, role: 'office' });
    tower(north, 798, 142, 7, 30, base, B.StoneBrick, { trim: B.Cobble });
    north.props.push({ t: 'cone', x: 798.5, y: base + 30, z: 142.5, r: 5, h: 9, mat: 'blue' });
    for (const [gx, gz] of [[798.5, 146.2], [802.2, 142.5]]) north.props.push({ t: 'glow', x: gx, y: base + 25, z: gz, r: 2.6, color: '#fff2c8' }); // the clock faces, lit
    fountain(north, 787, 176, base);
    for (const [bx, bz, ry] of [[778, 176, Math.PI / 2], [796, 176, -Math.PI / 2], [787, 167, Math.PI], [787, 185, 0]] as const) north.props.push({ t: 'bench', x: bx, y: base, z: bz, ry });
    for (const [tx, tz] of [[761, 159], [812, 159], [761, 192], [812, 192]]) plantTree(tx, tz, base, 0.5);
    for (let i = 0; i < 3; i++) north.props.push({ t: 'stall', x: 768 + i * 8, y: base, z: 190, ry: Math.PI, color: ['#2f528f', '#a8382c', '#c8a03a'][i] });
    north.props.push({ t: 'sign', x: 778.5, y: base, z: 157.5, ry: 0, text: 'Guildhall' });
    // The Exchange's desk on the square, where Gideon Wray reads the guilds' book to anyone who asks
    north.props.push({ t: 'desk', x: 775.5, y: base, z: 164.2, ry: Math.PI }, { t: 'sign', x: 772.2, y: base, z: 164.5, ry: 0, text: 'The Exchange' });

    // ---- Tilt Ward: the tilt-yard, banked stands round a sanded oval with the tilt down the middle
    claim(922, 192, 994, 236);
    tiltYard(east, 958, 214, base);

    // ---- Minster Ward: the minster on its plaza, and the Charter Green
    claim(826, 392, 872, 472);
    minster(south, 840, 396, base);
    pave(826, 437, 872, 470, base, 'flag');
    fountain(south, 849, 456, base);
    for (const [tx, tz] of [[829, 440], [869, 440], [829, 468], [869, 468]]) plantTree(tx, tz, base, 0.5);
    claim(646, 386, 728, 474);
    charterGreen(south, 648, 388, 726, 472, base);

    // ---- The Waits' House, on the north side of the Charter Green: one tall hall with a low stage at
    // the back, benches for anyone who comes to listen, the Great Book on its lectern and the
    // instrument cupboard. The bandstand stands on the Green's west lawn. (data/content/waits.ts)
    {
      const W = WAITS_HOUSE, ws = wardAt(W.x0 + W.w / 2, W.z0 + W.d / 2);
      claim(W.x0 - 2, W.z0 - 2, W.x0 + W.w + 1, W.z0 + W.d + 5);
      house(ws, W.x0, W.z0, W.w, W.d, 1, base, 'slate', 's', { wall: B.StoneBrick, role: 'vacant' });
      for (let x = W.x0 + 1; x < W.x0 + W.w - 1; x++) for (let z = W.z0 + 1; z <= W.z0 + 2; z++) O.set(x, base, z, B.DarkPlanks); // the stage
      for (const [bx, bz] of [[W.x0 + 3.5, W.z0 + 6.5], [W.x0 + 11.5, W.z0 + 6.5], [W.x0 + 3.5, W.z0 + 8.5], [W.x0 + 11.5, W.z0 + 8.5]]) ws.props.push({ t: 'bench', x: bx, y: base, z: bz, ry: 0 });
      ws.props.push({ t: 'furn', item: 'desk', x: W.x0 + 2.5, y: base, z: W.z0 + 4.5, ry: 0 }); // the Great Book's lectern
      ws.props.push({ t: 'furn', item: 'shelves', x: W.x0 + W.w - 1.6, y: base, z: W.z0 + 5, ry: -Math.PI / 2 }); // the instrument cupboard
      for (const lz of [W.z0 + 4, W.z0 + 8]) ws.props.push({ t: 'furn', item: 'lamp', x: W.x0 + W.w / 2, y: base + 3.9, z: lz, ry: 0 });
      for (const bx of [W.x0 + 1.2, W.x0 + W.w - 1.2]) ws.props.push({ t: 'banner', x: bx, y: base + 3, z: W.z0 + 2.5, kind: 'aldermere', ry: Math.PI / 2 });
      ws.props.push({ t: 'sign', x: W.x0 + W.w / 2 + 2.6, y: base, z: W.z0 + W.d + 0.9, ry: 0, text: 'The Waits\' House' });
      for (let x = W.x0 + 5; x <= W.x0 + 9; x++) for (let z = W.z0 + W.d; z <= W.z0 + W.d + 4; z++) O.set(x, base - 1, z, (x + z) % 3 ? B.Gravel : B.Path);
      bandstand(south, BANDSTAND.x, BANDSTAND.z, base);
    }

    // ---- The Shambles: the covered market and its yard
    claim(648, 242, 702, 295);
    pave(650, 244, 700, 293, base, 'cobble');
    shelter(west, 656, 250, 36, 14, base, 'red', 5);
    for (let i = 0; i < 4; i++) for (const [sz, ry] of [[253.5, 0], [260.5, Math.PI]] as const) west.props.push({ t: 'stall', x: 661 + i * 8.5, y: base, z: sz, ry, color: ['#a8382c', '#3f7a3a', '#2f528f', '#c8a03a'][(i + (ry ? 2 : 0)) % 4] });
    for (let i = 0; i < 8; i++) west.props.push({ t: i % 2 ? 'barrel' : 'crate', x: 658 + i * 4.2, y: base, z: 266.5 + (i % 3) * 0.6 });
    west.props.push({ t: 'sign', x: 674.5, y: base, z: 270.5, ry: 0, text: 'The Shambles' });
    fountain(west, 675, 282, base);
    for (const [cx2, cz2, ry] of [[690, 284, 0.4], [658, 286, -0.6]] as const) west.props.push({ t: 'cart', x: cx2, y: base, z: cz2, ry });

    // ---- Terraces: pairs of rows back to back, a lane in front of each, gardens and yards between
    const roofs: PropDesc['mat'][] = ['slate', 'blue', 'red', 'slate', 'blue', 'red', 'thatch'];
    const walls = [B.Plaster, B.Plaster, B.Planks, B.StoneBrick, B.Plaster];
    let n = 0;
    const plot = (x0: number, z0: number, w: number, d: number, door: 'n' | 's' | 'e' | 'w', front = false) => {
      if (!isFree(x0 - 1, z0 - 1, x0 + w, z0 + d)) return false;
      claim(x0 - 1, z0 - 1, x0 + w, z0 + d);
      const h = hash2(x0, z0, 41);
      const open = front ? h < 0.35 : h < 0.2;
      const s = wardAt(x0 + w / 2, z0 + d / 2);
      house(s, x0, z0, w, d, h < 0.55 ? 2 : h < 0.62 ? 3 : 1, base, roofs[n % roofs.length], door, {
        wall: walls[Math.floor(h * 113) % walls.length], closed: !open,
        role: open ? (front ? (h < 0.06 ? 'inn' : h < 0.24 ? 'shop' : 'workshop') : h < 0.05 ? 'inn' : h < 0.1 ? 'shop' : h < 0.14 ? 'workshop' : 'home') : undefined,
      });
      n++;
      return true;
    };
    // Street fronts first: tall houses and shops shoulder to shoulder down both sides of each
    // avenue, doors onto it, over a flagged pavement
    const pavement = (x0: number, z0: number, x1: number, z1: number) => {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (!(Math.abs(x - cx) <= 3 && Math.abs(z - cz) <= 3)) O.set(x, base - 1, z, (x + z) % 3 ? B.StoneBrick : B.Cobble);
    };
    pavement(OX0 + 4, cz - 6, X0 - 16, cz - 4); pavement(OX0 + 4, cz + 4, X0 - 16, cz + 6);
    pavement(X1 + 16, cz - 6, OX1 - 4, cz - 4); pavement(X1 + 16, cz + 4, OX1 - 4, cz + 6);
    pavement(cx - 6, OZ0 + 4, cx - 4, Z0 - 16); pavement(cx + 4, OZ0 + 4, cx + 6, Z0 - 16);
    pavement(cx - 6, Z1 + 16, cx - 4, OZ1 - 4); pavement(cx + 4, Z1 + 16, cx + 6, OZ1 - 4);
    const fw = (x: number, z: number) => 7 + Math.floor(hash2(x, z, 77) * 3);
    for (let x = OX0 + 8; x + 10 <= X0 - 18; x += 0) { const w = fw(x, cz); plot(x, cz - 14, w, 7, 's', true); plot(x, cz + 8, w, 7, 'n', true); x += w + 1; }
    for (let x = X1 + 19; x + 10 <= OX1 - 6; x += 0) { const w = fw(x, cz); plot(x, cz - 14, w, 7, 's', true); plot(x, cz + 8, w, 7, 'n', true); x += w + 1; }
    for (let z = OZ0 + 8; z + 10 <= Z0 - 18; z += 0) { const d = fw(cx, z); plot(cx - 14, z, 7, d, 'e', true); plot(cx + 8, z, 7, d, 'w', true); z += d + 1; }
    for (let z = Z1 + 19; z + 10 <= OZ1 - 8; z += 0) { const d = fw(cx, z); plot(cx - 14, z, 7, d, 'e', true); plot(cx + 8, z, 7, d, 'w', true); z += d + 1; }
    for (let z = OZ0 + 10; z + 14 <= OZ1 - 8; z += 21) {
      for (let x = OX0 + 9; x + 9 <= OX1 - 8; x += 12) {
        const w = 8 + Math.floor(hash2(x, z, 43) * 3), d = 6 + Math.floor(hash2(x, z, 47) * 2);
        // Leave a yard or garden now and then, so a street isn't one long wall
        if (hash2(x, z, 53) < 0.1) continue;
        const a = plot(x, z, w, d, 'n'), b = hash2(x + 3, z, 59) < 0.15 ? false : plot(x, z + 7, w, d, 's');
        // The lane in front of each row
        const ward0 = wardAt(x + w / 2, z + 4);
        for (const [made, lz] of [[a, z - 2], [a, z - 1], [b, z + 14], [b, z + 15]] as const) if (made) for (let lx = x - 1; lx <= x + 11; lx++) {
          if (!isFree(lx, lz, lx, lz)) continue;
          const hh = hash2(lx, lz, 61);
          O.set(lx, base - 1, lz, hh < 0.55 ? B.Path : hh < 0.85 ? B.Gravel : B.Cobble);
        }
        if (a && hash2(x, z, 67) < 0.25 && isFree(x + 4, z - 4, x + 4, z - 4)) ward0.props.push({ t: 'lantern', x: x + 4.5, y: base, z: z - 3.5, ry: 0 });
        // A kitchen garden or a tree in the gap behind the pair
        if (a && b && hash2(x, z, 71) < 0.35 && isFree(x + 3, z + 17, x + 6, z + 20)) {
          for (let gz = z + 17; gz <= z + 19; gz++) for (let gx = x + 1; gx <= x + 7; gx++) O.set(gx, base - 1, gz, (gz - z) % 2 ? B.Farmland : B.Dirt);
          claim(x, z + 16, x + 8, z + 21);
        } else if (a && b && hash2(x, z, 73) < 0.4 && isFree(x + 4, z + 18, x + 4, z + 18)) { plantTree(x + 4, z + 18, base, 0.45); claim(x + 1, z + 15, x + 7, z + 21); }
      }
    }

    // Seen from across the plains: the new wall, the minster tower, the clock tower
    north.impostor.push(
      { x: cx, y: base + 4, z: OZ0, w: OX1 - OX0, h: 8, d: 3, color: '#8a8f98' },
      { x: cx, y: base + 4, z: OZ1, w: OX1 - OX0, h: 8, d: 3, color: '#8a8f98' },
      { x: OX0, y: base + 4, z: cz, w: 3, h: 8, d: OZ1 - OZ0, color: '#8a8f98' },
      { x: OX1, y: base + 4, z: cz, w: 3, h: 8, d: OZ1 - OZ0, color: '#8a8f98' },
      { x: 836, y: base + 16, z: 432, w: 7, h: 33, d: 7, color: '#9a9ea6' },
      { x: 836, y: base + 38, z: 432, w: 8, h: 11, d: 8, color: '#4a5260', cone: true },
      { x: 798, y: base + 15, z: 142, w: 7, h: 30, d: 7, color: '#9a9ea6' },
    );
  }

  /** A stone hall with tall lancet windows, buttress lines and a broad doorway (no door leaf). */
  function stoneHall(s: Site, x0: number, z0: number, w: number, d: number, h: number, base: number, door: 'n' | 's' | 'e' | 'w' | null) {
    rect(s, x0 - 2, z0 - 2, x0 + w + 1, z0 + d + 1);
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      foundation(x, z, base, B.StoneBrick);
      O.set(x, base - 1, z, (x + z) % 2 ? B.StoneBrick : B.Cobble);
      clearUp(x, z, base, base + h + 14);
      const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1;
      if (!ex && !ez) continue;
      const along = ez ? x - x0 : z - z0, span = ez ? w : d;
      for (let y = base; y < base + h; y++) {
        const ly = y - base;
        let id: number = B.StoneBrick;
        if (ex && ez) id = B.Cobble;
        else if (along % 4 === 0) id = B.Cobble;
        else if (ly >= 3 && ly <= h - 3 && along % 4 === 2 && along > 1 && along < span - 2) id = B.Window;
        else if (ly === h - 1) id = B.Cobble;
        O.set(x, y, z, id);
      }
    }
    if (door) {
      const dx = door === 'n' || door === 's' ? x0 + Math.floor(w / 2) : door === 'e' ? x0 + w - 1 : x0;
      const dz = door === 'e' || door === 'w' ? z0 + Math.floor(d / 2) : door === 's' ? z0 + d - 1 : z0;
      for (let i = -1; i <= 1; i++) for (let y = base; y < base + 4; y++) {
        const x = door === 'n' || door === 's' ? dx + i : dx, z = door === 'n' || door === 's' ? dz : dz + i;
        O.set(x, y, z, B.Air);
      }
    }
  }

  /** The minster: nave and transepts in stone under slate, a bell tower and spire at the west front. */
  function minster(s: Site, x0: number, z0: number, base: number) {
    const NW = 16, ND = 40, H = 13, tz = z0 + 8, TW = 34, TD = 12;
    stoneHall(s, x0 - 9, tz, TW, TD, H, base, null);
    stoneHall(s, x0, z0, NW, ND, H, base, 's');
    // Open the crossing: the nave and the transept are one space inside
    for (let y = base; y < base + H; y++) {
      for (let z = z0 + 1; z < z0 + ND - 1; z++) for (let x = x0 + 1; x < x0 + NW - 1; x++) O.set(x, y, z, B.Air);
      for (let z = tz + 1; z < tz + TD - 1; z++) for (let x = x0 - 8; x < x0 + NW + 8; x++) O.set(x, y, z, B.Air);
    }
    s.props.push({ t: 'roof', x: x0 + NW / 2, y: base + H, z: z0 + ND / 2, len: ND, span: NW, rise: roofRise(NW), ry: Math.PI / 2, mat: 'slate' });
    s.props.push({ t: 'roof', x: x0 + NW / 2, y: base + H, z: tz + TD / 2, len: TW, span: TD, rise: roofRise(TD), ry: 0, mat: 'slate' });
    tower(s, x0 - 4, z0 + ND - 4, 7, H + 20, base, B.StoneBrick, { trim: B.Cobble });
    s.props.push({ t: 'cone', x: x0 - 3.5, y: base + H + 20, z: z0 + ND - 3.5, r: 4.6, h: 12, mat: 'slate' });
    // Inside: pews down both sides of the aisle, the altar under the north window, lamps on chains
    for (let z = z0 + 18; z < z0 + ND - 4; z += 2.6) for (const px of [x0 + 4.2, x0 + NW - 4.2]) s.props.push({ t: 'bench', x: px, y: base, z, ry: 0 });
    s.props.push({ t: 'furn', item: 'counter', x: x0 + NW / 2, y: base, z: z0 + 3.2, ry: 0 });
    s.props.push({ t: 'furn', item: 'candles', x: x0 + NW / 2 - 0.6, y: base + 1.05, z: z0 + 3.2, ry: 0 }, { t: 'furn', item: 'candles', x: x0 + NW / 2 + 0.7, y: base + 1.05, z: z0 + 3.2, ry: 1 });
    s.props.push({ t: 'glow', x: x0 + NW / 2, y: base + 2, z: z0 + 3.2, r: 2, color: '#ffe0a8' });
    for (const [bx, bz] of [[x0 + 1.2, z0 + 6], [x0 + NW - 1.2, z0 + 6]]) s.props.push({ t: 'banner', x: bx, y: base + 9, z: bz, kind: 'aldermere', ry: Math.PI / 2 });
    for (const lz of [z0 + 6, z0 + 14, z0 + 22, z0 + 30]) s.props.push({ t: 'furn', item: 'lamp', x: x0 + NW / 2, y: base + H - 2, z: lz, ry: 0 });
    for (const lx of [x0 - 4, x0 + NW + 4]) s.props.push({ t: 'furn', item: 'lamp', x: lx, y: base + H - 2, z: tz + TD / 2, ry: 0 });
    s.props.push({ t: 'sign', x: x0 + NW / 2 + 4.5, y: base, z: z0 + ND + 2.5, ry: 0, text: 'The Minster' });
  }

  /** A fountain: a stone basin of water round a column, on a square. */
  function fountain(s: Site, x: number, z: number, base: number) {
    rect(s, x - 4, z - 4, x + 4, z + 4);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 3.4) continue;
      O.set(x + dx, base - 2, z + dz, B.Cobble);
      if (d > 2.4) { O.set(x + dx, base - 1, z + dz, B.StoneBrick); O.set(x + dx, base, z + dz, B.StoneBrick); }
      else { O.set(x + dx, base - 1, z + dz, B.Water); O.set(x + dx, base, z + dz, B.Water); }
    }
    for (let y = base - 1; y < base + 3; y++) O.set(x, y, z, y === base + 2 ? B.Cobble : B.StoneBrick);
    s.props.push({ t: 'glow', x: x + 0.5, y: base + 3.4, z: z + 0.5, r: 2, color: '#cfe8ff' });
  }

  /** The tilt-yard: an oval sanded floor, three banks of stands, the tilt barrier, pavilions. */
  function tiltYard(s: Site, ex: number, ez: number, base: number) {
    const a = 28, b = 17;
    rect(s, ex - a - 4, ez - b - 4, ex + a + 4, ez + b + 4);
    for (let z = ez - b - 4; z <= ez + b + 4; z++) for (let x = ex - a - 4; x <= ex + a + 4; x++) {
      const d = Math.sqrt(((x - ex) / a) ** 2 + ((z - ez) / b) ** 2);
      if (d > 1.36) continue;
      foundation(x, z, base);
      clearUp(x, z, base, base + 8);
      if (d < 1) { O.set(x, base - 1, z, hash2(x, z, 81) < 0.8 ? B.Sand : B.Gravel); continue; }
      const gate = Math.abs(z - ez) <= 2 && Math.abs(x - ex) > a * 0.8;
      if (gate) { O.set(x, base - 1, z, B.Gravel); continue; }
      const tier = d < 1.12 ? 1 : d < 1.24 ? 2 : 3;
      for (let y = base; y < base + tier; y++) O.set(x, y, z, tier === 3 && y === base + 2 ? B.StoneBrick : B.Planks);
      if (tier === 3) { O.set(x, base + 3, z, B.StoneBrick); if ((x + z) % 2 === 0) O.set(x, base + 4, z, B.StoneBrick); }
    }
    fence(s, ex - 18, ez, ex + 18, ez); // the tilt
    for (const [px, pz, ry, col] of [[ex - a - 9, ez - 9, Math.PI / 2, '#a8382c'], [ex + a + 9, ez + 9, -Math.PI / 2, '#2f528f']] as const) s.props.push({ t: 'tent', x: px, y: base, z: pz, ry, color: col });
    for (const [bx, bz] of [[ex - 14, ez - b - 2.2], [ex, ez - b - 3.2], [ex + 14, ez - b - 2.2], [ex - 14, ez + b + 2.2], [ex + 14, ez + b + 2.2]]) s.props.push({ t: 'banner', x: bx, y: base + 7.2, z: bz, kind: 'aldermere' });
    s.props.push({ t: 'sign', x: ex - a - 5.5, y: base, z: ez - 3.5, ry: Math.PI / 2, text: 'The Tilt-yard' });
  }

  /** The Charter Green: gravel walks, lawns, a pond, a hedge maze of a garden, benches, old trees. */
  function charterGreen(s: Site, x0: number, z0: number, x1: number, z1: number, base: number) {
    rect(s, x0, z0, x1, z1);
    const mx = Math.round((x0 + x1) / 2), mz = Math.round((z0 + z1) / 2);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      foundation(x, z, base, B.Dirt);
      clearUp(x, z, base, base + 10);
      const walk = Math.abs(x - mx) <= 1 || Math.abs(z - mz) <= 1 || Math.abs(Math.hypot(x - mx, z - mz) - 22) < 1.2;
      O.set(x, base - 1, z, walk ? (hash2(x, z, 91) < 0.75 ? B.Gravel : B.Path) : B.Grass);
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (edge && !(Math.abs(x - mx) <= 2 || Math.abs(z - mz) <= 2)) O.set(x, base, z, B.OakLeaves); // a clipped hedge round it
    }
    // The pond, east of the cross walks
    const px = mx + 22, pz = mz - 16;
    for (let dz = -7; dz <= 7; dz++) for (let dx = -10; dx <= 10; dx++) {
      const d = Math.hypot(dx / 10, dz / 7);
      if (d > 1) continue;
      O.set(px + dx, base - 2, pz + dz, B.Clay);
      O.set(px + dx, base - 1, pz + dz, d > 0.85 ? B.Sand : B.Water);
    }
    for (const [tx, tz] of [[x0 + 8, z0 + 8], [x1 - 8, z0 + 8], [x0 + 8, z1 - 8], [x1 - 8, z1 - 8], [mx - 14, mz + 14], [mx + 14, mz + 14], [mx - 14, mz - 14], [mx - 30, mz + 4], [mx + 30, mz + 22]]) plantTree(tx, tz, base, 0.7);
    // A statue on the crossing: the first Speaker, on a plinth
    for (let y = base; y < base + 5; y++) O.set(mx, y, mz, y < base + 2 ? B.StoneBrick : B.Cobble);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) O.set(mx + dx, base, mz + dz, B.StoneBrick);
    for (const [bx, bz, ry] of [[mx - 5, mz - 3, 0], [mx + 5, mz + 3, Math.PI], [mx - 3, mz + 5, Math.PI / 2], [mx + 3, mz - 5, -Math.PI / 2]] as const) s.props.push({ t: 'bench', x: bx, y: base, z: bz, ry });
    for (const [lx, lz] of [[mx - 2.5, z0 + 6], [mx + 2.5, z1 - 6], [x0 + 6, mz - 2.5], [x1 - 6, mz + 2.5]]) s.props.push({ t: 'lantern', x: lx, y: base, z: lz });
    s.props.push({ t: 'sign', x: mx + 3.5, y: base, z: z0 + 2.5, ry: 0, text: 'The Charter Green' });
  }

  /** A bandstand: an eight-sided stage a step up off the grass, six posts and a pointed roof. */
  function bandstand(s: Site, cx: number, cz: number, base: number) {
    const fx = Math.floor(cx), fz = Math.floor(cz);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const r = Math.max(Math.abs(dx), Math.abs(dz)) * 0.9 + Math.min(Math.abs(dx), Math.abs(dz)) * 0.42;
      if (r > 4) continue;
      const x = fx + dx, z = fz + dz;
      foundation(x, z, base, B.StoneBrick);
      O.set(x, base, z, r > 3.2 ? B.StoneBrick : B.Planks);
      clearUp(x, z, base + 1, base + 6);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6, x = fx + Math.round(Math.cos(a) * 3.2), z = fz + Math.round(Math.sin(a) * 3.2);
      if (z > fz + 2) continue; // the front stays open toward the Green
      for (let y = base + 1; y <= base + 3; y++) O.set(x, y, z, B.OakLog);
    }
    s.props.push({ t: 'cone', x: cx, y: base + 4, z: cz, r: 5, h: 3, mat: 'red' });
    s.props.push({ t: 'lantern', x: cx + 4.6, y: base, z: cz + 3.6, ry: Math.PI });
    rect(s, fx - 5, fz - 5, fx + 5, fz + 5);
  }

  /**
   * Carne Barrow: a long grass mound on Tolmen Moor, a stone passage into it from the east between
   * two standing stones, and a chamber at the far end. The frost brought part of the chamber roof
   * down last winter, so a little daylight gets in. A niche in the chamber's north wall held a bone
   * whistle (data/content/waits.ts).
   */
  function buildCarne(s: Site) {
    const cx = CARNE.x, cz = CARNE.z, G = CARNE_FLOOR;
    s.r = 140;
    rect(s, cx - 16, cz - 10, cx + 16, cz + 10);
    // Level ground under the mound, then the mound itself, highest along the middle
    for (let z = cz - 8; z <= cz + 8; z++) for (let x = cx - 14; x <= cx + 15; x++) {
      const h = heightAt(x, z);
      for (let y = Math.min(h, G) - 2; y < G; y++) O.set(x, y, z, B.Dirt);
      for (let y = G; y < Math.max(h, G) + 2; y++) O.set(x, y, z, B.Air);
      O.set(x, G - 1, z, B.Grass);
      const k = 1 - Math.pow((x - cx) / 12, 2) - Math.pow((z - cz) / 6, 2);
      const top = Math.round(5 * k);
      for (let y = 0; y < top; y++) O.set(x, G + y, z, y === top - 1 ? B.Grass : B.Dirt);
    }
    // The passage: in from the east end, two wide and three high, lined and roofed with stone
    for (let x = cx - 2; x <= cx + 13; x++) {
      for (let z = cz - 1; z <= cz + 2; z++) for (let y = G; y <= G + 3; y++) {
        const side = z === cz - 1 || z === cz + 2, roof = y === G + 3;
        O.set(x, y, z, side || roof ? (hash2(x, y * 3 + z, 61) < 0.4 ? B.MossyStone : B.StoneBrick) : B.Air);
      }
      for (let z = cz; z <= cz + 1; z++) O.set(x, G - 1, z, B.Cobble);
    }
    // The way in: the mound's end cut back, two standing stones and a lintel
    for (let z = cz - 1; z <= cz + 2; z++) for (let y = G; y <= G + 5; y++) for (let x = cx + 12; x <= cx + 15; x++) if (z === cz || z === cz + 1 || y > G + 3) O.set(x, y, z, B.Air);
    for (const z of [cz - 1, cz + 2]) for (let y = G; y <= G + 3; y++) O.set(cx + 13, y, z, B.StoneBrick);
    for (let z = cz - 1; z <= cz + 2; z++) O.set(cx + 13, G + 4, z, B.StoneBrick);
    // The chamber, and the hole the frost made in its roof
    for (let x = cx - 7; x <= cx - 1; x++) for (let z = cz - 3; z <= cz + 4; z++) for (let y = G - 1; y <= G + 4; y++) {
      const wall = x === cx - 7 || x === cx - 1 && (z < cz || z > cz + 1) || z === cz - 3 || z === cz + 4;
      if (y === G - 1) O.set(x, y, z, B.Cobble);
      else if (y === G + 4 || wall) O.set(x, y, z, hash2(x, y * 5 + z, 67) < 0.45 ? B.MossyStone : B.StoneBrick);
      else O.set(x, y, z, B.Air);
    }
    for (let x = cx - 5; x <= cx - 4; x++) for (let z = cz; z <= cz + 1; z++) for (let y = G + 4; y <= G + 7; y++) O.set(x, y, z, B.Air);
    for (const [x, z] of [[cx - 5, cz + 2], [cx - 3, cz], [cx - 6, cz - 1]]) O.set(x, G, z, B.MossyCobble); // the fallen roof
    // The niche in the north wall, and a faint light in it
    O.set(cx - 4, G + 1, cz - 3, B.Air);
    s.props.push({ t: 'glow', x: cx - 3.5, y: G + 1.4, z: cz - 2.4, r: 1.6, color: '#d8e8ff' });
  }

  // ---------------------------------------------------------------- Dungeons, delves, vistas, wonders
  /**
   * Underworks: a public dungeon or a delve, dug under levelled ground. A gatehouse over a stair
   * down; dressed-stone halls joined by corridors, lit by lanterns; creatures in every hall, a
   * champion in the last, and a chest behind the champion. Public dungeons are bigger, with two
   * wings and a great hall; delves are three rooms. Themes set the stone and the clutter.
   */
  /** The stone, floor and light of something dug under the ground (an underworks theme, or a group dungeon's). */
  interface DigTheme { wall: number; wall2: number; floor: number; floor2: number; light: string }
  /**
   * Digging under the ground: halls, and the corridors between them. Halls are carved as they're
   * called; corridors wait for finish(), then cut through the halls' walls. Each only walls a cell
   * nothing has opened, so a corridor never ends in a wall and a hall's wall never closes a corridor.
   * Lanterns go up last, and only on wall that's still there.
   */
  function digger(s: Site, cx: number, cz: number, F: number, T: DigTheme) {
    const open = new Set<number>();
    const K = (X: number, Z: number) => (X - WMIN) + (Z - WMIN) * KEY_W;
    const runs: [number, number, number, number][] = [];
    const lanterns: { x: number; z: number; ry: number; wx: number; wz: number }[] = [];
    const wallMat = (x: number, y: number, z: number) => (hash2(x * 3 + y, z, 301) < 0.3 ? T.wall2 : T.wall);
    const lamp = (x: number, z: number, y = F + 2.2) => s.props.push({ t: 'glow', x: x + 0.5, y, z: z + 0.5, r: 2.2, color: T.light });
    /** Carve a box (inclusive bounds, local to the centre) with dressed walls, floor and ceiling. */
    const carve = (x0: number, z0: number, x1: number, z1: number, h: number, th = T) => {
      const wm = (x: number, y: number, z: number) => (hash2(x * 3 + y, z, 301) < 0.3 ? th.wall2 : th.wall);
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        const X = cx + x, Z = cz + z, edge = x < x0 || x > x1 || z < z0 || z > z1, k = K(X, Z);
        if (edge) { if (!open.has(k)) for (let y = F - 1; y <= F + h; y++) O.set(X, y, Z, wm(X, y, Z)); continue; }
        const was = open.has(k);
        if (!was) O.set(X, F - 1, Z, hash2(X, Z, 303) < 0.22 ? th.floor2 : th.floor);
        for (let y = F; y < F + h; y++) O.set(X, y, Z, B.Air);
        if (!was) O.set(X, F + h, Z, wm(X, F + h, Z));
        open.add(k);
      }
    };
    const hall = (x0: number, z0: number, x1: number, z1: number, h: number, pillars = false, th = T) => {
      carve(x0, z0, x1, z1, h, th);
      if (pillars) for (let z = z0 + 3; z <= z1 - 3; z += 5) for (const x of [x0 + 3, x1 - 3]) for (let y = F; y < F + h; y++) O.set(cx + x, y, cz + z, th.wall2);
      // Lanterns along the long walls
      for (let x = x0 + 2; x <= x1 - 2; x += 6) for (const [z, ry] of [[z0, 0], [z1, Math.PI]] as const) lanterns.push({ x: cx + x + 0.5, z: cz + z + (ry ? 0.92 : 0.08), ry, wx: cx + x, wz: cz + z + (ry ? 1 : -1) });
      s.props.push({ t: 'glow', x: cx + (x0 + x1) / 2 + 0.5, y: F + Math.min(h - 1, 4), z: cz + (z0 + z1) / 2 + 0.5, r: 2.2, color: th.light });
    };
    /** A corridor three wide and four high between two points on one axis (cut at finish()). */
    const run = (ax: number, az: number, bx: number, bz: number) => runs.push([ax, az, bx, bz]);
    /** Mark columns already opened by hand (a stair), so corridors run into them cleanly. */
    const opened = (X: number, Z: number) => open.add(K(X, Z));
    const isOpen = (X: number, Z: number) => open.has(K(X, Z));
    const finish = () => {
      for (const [ax, az, bx, bz] of runs) carve(Math.min(ax, bx) - (ax === bx ? 1 : 0), Math.min(az, bz) - (az === bz ? 1 : 0), Math.max(ax, bx) + (ax === bx ? 1 : 0), Math.max(az, bz) + (az === bz ? 1 : 0), 4);
      for (const l of lanterns) if (!open.has(K(l.wx, l.wz))) s.props.push({ t: 'wallLantern', x: l.x, y: F + 2.4, z: l.z, ry: l.ry });
    };
    return { hall, run, finish, lamp, wallMat, opened, isOpen };
  }

  function buildUnderworks(s: Site, G: number, theme: keyof typeof UNDERWORKS) {
    const T = UNDERWORKS[theme];
    const cx = Math.round(s.x), cz = Math.round(s.z);
    const F = Math.max(7, G - T.depth); // the floor everything below stands on
    rect(s, cx - T.reach, cz - T.reach - 4, cx + T.reach, cz + T.reach);
    const spawns: [number, number, number, string][] = [];
    const { hall, run, finish, lamp, wallMat, opened } = digger(s, cx, cz, F, T);
    const put = (x: number, z: number, n: number, types: string[]) => { for (let i = 0; i < n; i++) spawns.push([cx + x + (i % 2 ? 2 : -2) * (i >> 1 ? 1 : 0.5), F, cz + z + (i % 2 ? 1.5 : -1.5), types[i % types.length]]); };
    const clutter = (x: number, z: number) => {
      const X = cx + x, Z = cz + z, k = hash2(X, Z, 305);
      for (const c of T.clutter.slice(0, 2 + Math.floor(k * 2))) s.props.push(c === 'mushrooms' || c === 'candles' || c === 'shelves' || c === 'chest' ? { t: 'furn', item: c, x: X + (k - 0.5) * 2, y: F, z: Z + (k - 0.5) * 1.5, ry: k * 6 } : { t: c as PropType, x: X + (k - 0.5) * 2, y: F, z: Z - (k - 0.5) * 1.5, ry: k * 6 });
    };

    // The gatehouse and the stair down (south from the gate)
    const ez = -T.reach - 2;
    for (let k = 0; k < T.depth; k++) {
      const z = cz + ez + 2 + k, top = G - 1 - k;
      for (let x = cx - 2; x <= cx + 2; x++) {
        for (let y = top - 2; y < top + 5; y++) {
          const side = x === cx - 2 || x === cx + 2;
          if (y < top) O.set(x, y, z, side ? wallMat(x, y, z) : T.floor);
          else O.set(x, y, z, side && y < G - 1 ? wallMat(x, y, z) : y >= G ? (side ? T.wall : B.Air) : B.Air);
        }
      }
      if (k % 4 === 2) lamp(cx, z, top + 2);
      for (let x = cx - 1; x <= cx + 1; x++) opened(x, z);
    }
    for (let y = G; y < G + 5; y++) for (const x of [cx - 3, cx + 3]) for (const z of [cz + ez + 1, cz + ez + 2, cz + ez + 3]) O.set(x, y, z, y === G + 4 ? T.wall2 : T.wall);
    for (let x = cx - 3; x <= cx + 3; x++) for (const z of [cz + ez + 1, cz + ez + 2, cz + ez + 3]) O.set(x, G + 4, z, T.wall2);
    for (const x of [cx - 2, cx + 2]) s.props.push({ t: 'lantern', x: x + 0.5, y: G, z: cz + ez - 0.5, ry: 0 });
    s.props.push({ t: 'sign', x: cx + 5.5, y: G, z: cz + ez - 1.5, ry: 0, text: s.name.length > 15 ? s.name.replace('The ', '') : s.name });
    const stairEnd = ez + 2 + T.depth; // local z where the stair meets the floor

    if (T.pub) {
      // Antechamber, two wings, the great hall
      run(0, stairEnd, 0, -12); hall(-6, -11, 6, -1, 6); put(0, -6, 2, T.mobs);
      run(-7, -6, -14, -6); hall(-30, -15, -15, 5, 8, true); put(-22, -8, 4, T.mobs); put(-22, 2, 2, T.mobs);
      run(7, -6, 14, -6); hall(15, -15, 30, 5, 8, true); put(22, -8, 4, T.mobs); put(22, 2, 2, T.mobs);
      run(0, 0, 0, 9); hall(-13, 10, 13, 30, 10, true); put(-6, 16, 2, T.mobs); put(6, 16, 2, T.mobs);
      for (const [x, z] of [[-26, -12], [26, -12], [-26, 3], [26, 3], [-4, -9], [-10, 27], [10, 27]]) clutter(x, z);
      s.act = { kind: 'dungeon', spawns, boss: [cx + 0.5, F, cz + 22.5, T.boss], chest: [cx + 0.5, F, cz + 28.5] };
      s.props.push({ t: 'furn', item: 'lamp', x: cx + 0.5, y: F + 9.5, z: cz + 20.5, ry: 0 }, { t: 'furn', item: 'lamp', x: cx + 0.5, y: F + 9.5, z: cz + 13.5, ry: 0 });
    } else {
      run(0, stairEnd, 0, -5); hall(-5, -4, 5, 4, 5); put(0, 0, 2, T.mobs);
      run(6, 0, 8, 0); hall(9, -7, 18, 7, 6, true); put(13, -3, 2, T.mobs);
      run(-6, 0, -8, 0); hall(-17, -6, -9, 6, 5); put(-13, 0, 3, T.mobs);
      for (const [x, z] of [[-15, -4], [-11, 4], [3, -3], [16, 5]]) clutter(x, z);
      s.act = { kind: 'delve', spawns, boss: [cx + 14.5, F, cz + 2.5, T.boss], chest: [cx + 17.5, F, cz + 5.5] };
    }
    finish();
    s.props.push({ t: 'furn', item: 'chest', x: s.act.chest![0], y: F, z: s.act.chest![2], ry: Math.PI });
  }

  /**
   * The Old Man's Workings, under the hills north of Sallow Pit: the Pit's shut Number Four gallery,
   * the night shift's room, the flooded sump, a low drift, and at the bottom the old man itself
   * (miners' word for workings older than anyone's records), sooted black by fire-setting, where
   * Verdigris nests on the copper. Reached only through the boarded door in the Pit's chamber.
   */
  function buildOldMan(s: Site) {
    const OX = 208, OZ = -60, F = 5;
    const PIT: DigTheme = { wall: B.Stone, wall2: B.Timber, floor: B.Gravel, floor2: B.Stone, light: '#ffc880' };
    const SUMP: DigTheme = { wall: B.MossyStone, wall2: B.MossyCobble, floor: B.Clay, floor2: B.Gravel, light: '#b8ffc8' };
    const OLD: DigTheme = { wall: B.Basalt, wall2: B.Stone, floor: B.Stone, floor2: B.Gravel, light: '#ffb070' };
    const { hall, run, finish } = digger(s, OX, OZ, F, PIT);
    const at = (x: number, z: number): [number, number, number] => [OX + x + 0.5, F, OZ + z + 0.5];
    const mob = (x: number, z: number, type: string): [number, number, number, string] => [...at(x, z), type];
    const covered: [number, number, number, number, number][] = [];
    const room = (x0: number, z0: number, x1: number, z1: number, h: number, pillars = false, th = PIT) => {
      hall(x0, z0, x1, z1, h, pillars, th);
      covered.push([OX + x0 - 1, OZ + z0 - 1, OX + x1 + 1, OZ + z1 + 1, F + h]);
    };
    const prop = (t: PropType, x: number, z: number, ry = 0, y = F) => s.props.push({ t, x: OX + x + 0.5, y, z: OZ + z + 0.5, ry });
    const furn = (item: string, x: number, z: number, ry = 0) => s.props.push({ t: 'furn', item, x: OX + x + 0.5, y: F, z: OZ + z + 0.5, ry });

    // The lamp room, where a group comes down the shaft ladder
    room(0, -4, 9, 4, 5);
    for (let y = F; y < F + 5; y++) for (const z of [-2, 2]) O.set(OX, y, OZ + z, B.Timber); // the ladder's frame on the west wall
    for (let z = -2; z <= 2; z++) O.set(OX, F + 4, OZ + z, B.Timber);
    s.props.push({ t: 'sign', x: OX + 1.2, y: F, z: OZ + 3.4, ry: Math.PI / 2, text: 'Shaft ladder' });
    furn('candles', 6, -3); prop('crate', 7, 3, 0.4); prop('barrel', 8, 2.6); prop('crate', 6, 3.2, 1.2);
    // Number Four, the shut gallery: rails down the middle, a cart left where it stopped
    run(10, 0, 19, 0);
    room(20, -7, 46, 7, 7, true);
    s.props.push({ t: 'rails', x: OX + 33.5, y: F, z: OZ + 0.5, ry: Math.PI / 2, len: 24 } as PropDesc);
    prop('cart', 36, 0, Math.PI / 2); prop('crate', 22, -6, 0.3); prop('barrel', 45, 6); furn('candles', 30, 6);
    // The night shift's room: where Coll Bray's crew sorted the copper they carried up at night
    run(33, -8, 33, -17);
    room(22, -33, 44, -18, 7);
    for (const [x, z, r] of [[25, -31, 0.2], [27, -31, 1.1], [41, -31, 0.6], [42, -29, 1.7], [24, -20, 0.9]] as const) prop('crate', x, z, r);
    furn('candles', 33, -32); prop('barrel', 40, -20); prop('cart', 29, -30, 0.2);
    // The sump: the pumps have been off since the roof came in, and the water's coming back
    run(45, -26, 58, -26);
    room(59, -40, 85, -12, 9, false, SUMP);
    for (let z = -39; z <= -36; z++) for (let x = 80; x <= 84; x++) { O.set(OX + x, F - 2, OZ + z, B.Clay); O.set(OX + x, F - 1, OZ + z, B.Water); }
    prop('barrel', 61, -38); prop('crate', 62, -14, 0.5); furn('mushrooms', 66, -39); furn('mushrooms', 83, -14);
    // The drift: low, and full of the rustbacks' young
    run(72, -11, 72, 0);
    room(66, 1, 78, 9, 5);
    furn('mushrooms', 67, 8);
    // The old man: workings older than the Pit, black with the soot of fire-setting, copper in the walls
    run(72, 10, 72, 17);
    room(55, 18, 92, 44, 11, true, OLD);
    for (let z = 18; z <= 44; z++) for (const x of [54, 93]) for (let y = F + 1; y < F + 5; y++) if (hash2(x * 7 + y, z, 951) < 0.18) O.set(OX + x, y, OZ + z, B.CopperOre);
    for (let x = 55; x <= 92; x++) for (let y = F + 1; y < F + 5; y++) if (hash2(x * 5 + y, 45, 952) < 0.16) O.set(OX + x, y, OZ + 45, B.CopperOre);
    // A tally on the east wall, cut by whoever worked it first: strokes in fives, a bar across each
    for (let i = 0; i < 23; i++) { const z = 24 + i + Math.floor(i / 5); if (z > 41) break; const bar = i % 5 === 4; for (let y = F + 2; y < F + 4; y++) O.set(OX + 93, y, OZ + z, bar ? B.Stone : B.Sand); }
    furn('candles', 74, 43); prop('crate', 58, 42, 0.8); prop('barrel', 90, 42);
    finish();

    s.act = {
      kind: 'group',
      arrive: at(2, 0),
      exit: at(1, 0),
      packs: [
        [mob(27, -2, 'dg_rustback'), mob(29, 2, 'dg_rustback'), mob(25, 1, 'dg_rustback')],
        [mob(40, 3, 'dg_rustback'), mob(42, -2, 'dg_rustback'), mob(41, 0, 'dg_seep')],
        [mob(64, -23, 'dg_seep'), mob(64, -29, 'dg_seep'), mob(62, -26, 'dg_rustback')],
        [mob(70, 4, 'dg_hatchling'), mob(74, 4, 'dg_hatchling'), mob(70, 7, 'dg_hatchling'), mob(74, 7, 'dg_hatchling'), mob(72, 6, 'dg_rustback')],
        [mob(60, 22, 'dg_rustback'), mob(62, 24, 'dg_rustback')],
        [mob(86, 22, 'dg_rustback'), mob(88, 24, 'dg_rustback')],
      ],
      bosses: [
        { at: at(33, -27), type: 'dg_coll', crew: [mob(29, -24, 'dg_nightman'), mob(37, -24, 'dg_nightman')] },
        { at: at(74, -27), type: 'dg_sump' },
        { at: at(73, 33), type: 'dg_verdigris' },
      ],
      chest: at(73, 41),
      covered,
    };
    s.props.push({ t: 'furn', item: 'chest', x: s.act.chest![0], y: F, z: s.act.chest![2], ry: Math.PI });
  }

  /**
   * Under the Kettle, north of the crater: the crack in the Kettle's north wall that Kelderby folds
   * its ewes in over winter, the wolves' den behind it, Brack's ledge, the seep where the ice has
   * grown into glass, and at the bottom the crystal that came down with the star, where the Glim
   * lives. Entered by the crack (press E); the halls themselves are buried.
   */
  function buildUnderKettle(s: Site) {
    const OX = 712, OZ = 1990, F = 40;
    const FOLD: DigTheme = { wall: B.Stone, wall2: B.MossyStone, floor: B.Gravel, floor2: B.Dirt, light: '#ffc880' };
    const ICE: DigTheme = { wall: B.Ice, wall2: B.Crystal, floor: B.Basalt, floor2: B.Ice, light: '#9fe8ff' };
    const HEART: DigTheme = { wall: B.Basalt, wall2: B.Crystal, floor: B.Basalt, floor2: B.Crystal, light: '#c8f4ff' };
    const { hall, run, finish } = digger(s, OX, OZ, F, FOLD);
    const at = (x: number, z: number): [number, number, number] => [OX + x + 0.5, F, OZ + z + 0.5];
    const mob = (x: number, z: number, type: string): [number, number, number, string] => [...at(x, z), type];
    const covered: [number, number, number, number, number][] = [];
    const room = (x0: number, z0: number, x1: number, z1: number, h: number, pillars = false, th = FOLD) => {
      hall(x0, z0, x1, z1, h, pillars, th);
      covered.push([OX + x0 - 1, OZ + z0 - 1, OX + x1 + 1, OZ + z1 + 1, F + h]);
    };
    const prop = (t: PropType, x: number, z: number, ry = 0) => s.props.push({ t, x: OX + x + 0.5, y: F, z: OZ + z + 0.5, ry });
    const furn = (item: string, x: number, z: number, ry = 0) => s.props.push({ t: 'furn', item, x: OX + x + 0.5, y: F, z: OZ + z + 0.5, ry });

    // The way in from the crater: a crack in the Kettle's north wall, the shepherds' winter fold
    {
      const cx = 807, z0 = 2038, z1 = 2045, y = 51;
      for (let z = z0; z <= z1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
        O.set(x, y - 1, z, B.Gravel);
        for (let k = 0; k < 4; k++) O.set(x, y + k, z, B.Air);
      }
      for (let x = cx - 1; x <= cx + 1; x++) for (let k = 0; k < 4; k++) O.set(x, y + k, z0 - 1, k < 3 ? B.Planks : B.Basalt); // hurdles across the back
      s.props.push({ t: 'lantern', x: cx + 1.5, y, z: z1 + 0.5, ry: 0 }, { t: 'sign', x: cx - 1.6, y, z: z1 + 0.6, ry: Math.PI, text: 'The Fold' });
    }

    // The shepherds' cave, where a group comes in through the hurdles
    room(0, -4, 9, 4, 5);
    furn('candles', 7, -3); prop('crate', 7, 3, 0.4); prop('barrel', 8, 2.6);
    // The den: wool, bones, and what the wolves dragged in
    run(10, 0, 19, 0);
    room(20, -8, 44, 8, 7, true);
    furn('mushrooms', 22, 7); prop('crate', 43, -7, 0.8);
    // Brack's ledge, up the north passage
    run(32, -9, 32, -17);
    room(20, -36, 44, -18, 8);
    prop('barrel', 22, -35); furn('candles', 42, -20);
    // The seep: the ice here has grown into glass
    run(45, -27, 58, -27);
    room(59, -38, 85, -14, 10, false, ICE);
    for (let i = 0; i < 7; i++) {
      const x = 62 + ((i * 7) % 21), z = -36 + ((i * 5) % 20), h = 2 + (i % 3);
      for (let y = F; y < F + h; y++) O.set(OX + x, y, OZ + z, B.Crystal);
      s.props.push({ t: 'glow', x: OX + x + 0.5, y: F + h, z: OZ + z + 0.5, r: 2.4, color: '#9fe8ff' });
    }
    // The drift down
    run(72, -13, 72, -1);
    room(66, 0, 78, 8, 5, false, ICE);
    // The heart of the fall: the crystal the star brought down, and the Glim in it
    run(72, 9, 72, 16);
    room(55, 17, 92, 38, 13, true, HEART);
    for (const [x, z, h] of [[60, 21, 5], [87, 21, 6], [60, 35, 4], [87, 35, 5], [64, 28, 3], [83, 28, 3]] as const) {
      for (let y = F; y < F + h; y++) for (const [dx, dz] of y < F + h - 2 ? [[0, 0], [1, 0], [0, 1]] : [[0, 0]]) O.set(OX + x + dx, y, OZ + z + dz, B.Crystal);
      s.props.push({ t: 'glow', x: OX + x + 0.5, y: F + h, z: OZ + z + 0.5, r: 3.2, color: '#c8f4ff' });
    }
    finish();

    s.act = {
      kind: 'group',
      arrive: at(2, 0),
      exit: at(1, 0),
      packs: [
        [mob(27, -2, 'frostwolf'), mob(29, 3, 'frostwolf'), mob(25, 2, 'frostwolf')],
        [mob(40, 3, 'frostwolf'), mob(41, -3, 'moorwolf'), mob(38, 0, 'frostwolf')],
        [mob(64, -22, 'shardjelly'), mob(64, -30, 'shardjelly'), mob(66, -26, 'shardjelly')],
        [mob(70, 3, 'shardjelly'), mob(74, 5, 'graniteback'), mob(72, 7, 'shardjelly')],
        [mob(61, 24, 'graniteback'), mob(63, 22, 'shardjelly')],
        [mob(86, 24, 'graniteback'), mob(84, 22, 'shardjelly')],
      ],
      bosses: [
        { at: at(33, -28), type: 'dg_brack', crew: [mob(29, -24, 'frostwolf'), mob(37, -24, 'frostwolf')] },
        { at: at(72, -24), type: 'dg_millstone' },
        { at: at(73, 30), type: 'dg_glim' },
      ],
      chest: at(73, 36),
      covered,
    };
    s.props.push({ t: 'furn', item: 'chest', x: s.act.chest![0], y: F, z: s.act.chest![2], ry: Math.PI });
  }

  /** A world boss's lair: a levelled clearing ringed with whatever suits the creature. */
  function buildLair(s: Site, G: number, type: string) {
    const cx = Math.round(s.x), cz = Math.round(s.z), R = 19;
    rect(s, cx - R - 3, cz - R - 3, cx + R + 3, cz + R + 3);
    for (let dz = -R - 2; dz <= R + 2; dz++) for (let dx = -R - 2; dx <= R + 2; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > R + 2) continue;
      const x = cx + dx, z = cz + dz, h = hash2(x, z, 331);
      clearUp(x, z, G, G + 14);
      const floor = type === 'bramblemaw' ? (h < 0.5 ? B.Loam : h < 0.8 ? B.Grass : B.MossyCobble)
        : type === 'tidewright' ? (h < 0.8 ? B.Sand : B.Gravel)
          : type === 'cinderhorn' ? (h < 0.6 ? B.RedSand : h < 0.85 ? B.TerraOrange : B.Basalt)
            : (h < 0.6 ? B.Ice : h < 0.85 ? B.Snow : B.Basalt);
      if (d <= R) O.set(x, G - 1, z, floor);
    }
    // The ring: twelve features round the edge
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13, x = Math.round(cx + Math.cos(a) * (R + 1)), z = Math.round(cz + Math.sin(a) * (R + 1));
      const h = 4 + Math.floor(hash2(x, z, 333) * 5);
      if (type === 'bramblemaw') {
        // Thorn roots arching up out of the ground and back in
        for (let k = 0; k <= 6; k++) O.set(x + Math.round(Math.cos(a + Math.PI / 2) * (k - 3)), G + Math.round(Math.sin((k / 6) * Math.PI) * h), z + Math.round(Math.sin(a + Math.PI / 2) * (k - 3)), B.OakLog);
        s.props.push({ t: 'furn', item: 'mushrooms', x: x + 0.5, y: G, z: z + 0.5, ry: a, tint: i });
      } else if (type === 'tidewright') {
        for (let y = G - 1; y < G + h - 2; y++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1]]) O.set(x + ox, y, z + oz, y > G + 1 ? B.Stone : B.MossyStone);
        if (i % 4 === 0) s.props.push({ t: 'boat', x: x + 0.5 - Math.cos(a) * 4, y: G + 0.5, z: z + 0.5 - Math.sin(a) * 4, ry: a });
      } else if (type === 'cinderhorn') {
        for (let y = G - 1; y < G + h; y++) O.set(x, y, z, y > G + h - 3 ? B.TerraBrown : B.Basalt);
        s.props.push({ t: 'glow', x: x + 0.5, y: G + 0.6, z: z + 0.5, r: 2.2, color: '#ff7a3a' }, { t: 'smoke', x: x + 0.5, y: G + h + 0.4, z: z + 0.5 });
      } else {
        for (let y = G - 1; y < G + h + 2; y++) O.set(x, y, z, B.Crystal);
        s.props.push({ t: 'glow', x: x + 0.5, y: G + h, z: z + 0.5, r: 3, color: '#9fe8ff' });
      }
    }
    s.props.push({ t: 'sign', x: cx + R + 4.5, y: heightAt(cx + R + 4, cz), z: cz + 0.5, ry: Math.PI / 2, text: s.name.replace('The ', '') });
  }

  /** Where a Shardfall comes down: a scorched circle of basalt, old shards in it. Not on the map. */
  function buildShardGround(s: Site, G: number) {
    s.named = false;
    const cx = Math.round(s.x), cz = Math.round(s.z);
    rect(s, cx - 12, cz - 12, cx + 12, cz + 12);
    for (let dz = -11; dz <= 11; dz++) for (let dx = -11; dx <= 11; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 11) continue;
      const x = cx + dx, z = cz + dz;
      clearUp(x, z, G, G + 10);
      O.set(x, G - 1, z, d < 4 ? B.Basalt : hash2(x, z, 335) < 0.55 ? B.Gravel : B.Basalt);
      if (d > 6 && hash2(x, z, 337) < 0.04) { O.set(x, G, z, B.Crystal); if (hash2(z, x, 339) < 0.5) O.set(x, G + 1, z, B.Crystal); }
    }
  }

  /** A vista: a stepped stone cairn on the highest ground nearby, a pennant on top. */
  function buildVista(s: Site) {
    let bx = Math.round(s.x), bz = Math.round(s.z), bh = -1;
    for (let dz = -20; dz <= 20; dz += 2) for (let dx = -20; dx <= 20; dx += 2) {
      const h = heightAt(s.x + dx, s.z + dz);
      if (h > bh && h <= 84 && coastDist(s.x + dx, s.z + dz) > 8) { bh = h; bx = Math.round(s.x + dx); bz = Math.round(s.z + dz); }
    }
    if (bh < 0) bh = heightAt(bx, bz);
    rect(s, bx - 7, bz - 7, bx + 7, bz + 7);
    for (let t = 0; t < 6; t++) {
      const r = 6 - t;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = bx + dx, z = bz + dz;
        if (t === 0) for (let y = heightAt(x, z) - 1; y < bh; y++) O.set(x, y, z, B.Cobble);
        O.set(x, bh + t, z, hash2(x, z + t, 311) < 0.25 ? B.MossyCobble : (Math.abs(dx) === r || Math.abs(dz) === r) ? B.StoneBrick : B.Cobble);
        clearUp(x, z, bh + t + 1, bh + t + 4);
      }
    }
    for (let y = bh + 6; y < bh + 9; y++) O.set(bx, y, bz + 1, B.Timber);
    s.props.push({ t: 'banner', x: bx + 0.5, y: bh + 9, z: bz + 1.5, kind: 'aldermere', ry: 0 }, { t: 'glow', x: bx + 0.5, y: bh + 7, z: bz + 0.5, r: 2.4, color: '#bfe8ff' });
    s.act = { kind: 'vista', view: [bx + 0.5, bh + 6, bz - 0.5, bx + 0.5, bh + 4, bz + 0.5] };
    s.impostor.push({ x: bx + 0.5, y: bh + 3, z: bz + 0.5, w: 9, h: 6, d: 9, color: '#8a8f98' });
  }

  /** The Weeping Stair: a gorge stepping down in five pools, each spilling over its lip into the next. */
  function buildWeepingStair(s: Site, G: number) {
    const cx = Math.round(s.x), z0 = Math.round(s.z) - 32;
    rect(s, cx - 14, z0 - 4, cx + 14, z0 + 66);
    for (let t = 0; t < 5; t++) {
      const za = z0 + t * 13, top = G - t * 5; // the pool's water stands at top - 1
      for (let z = za; z < za + 13; z++) for (let x = cx - 12; x <= cx + 12; x++) {
        const half = 7 + Math.round(Math.sin((z + x * 0.3) * 0.35) * 1.5);
        const dx = Math.abs(x - cx);
        if (dx > half + 4) continue;
        if (dx > half) {
          // The gorge walls: mossy rock up to the old ground
          for (let y = top - 4; y < Math.max(top + 4, heightAt(x, z)); y++) O.set(x, y, z, hash2(x, y + z, 313) < 0.4 ? B.MossyStone : B.Stone);
          continue;
        }
        O.set(x, top - 4, z, B.Gravel);
        for (let y = top - 3; y < top - 1; y++) O.set(x, y, z, B.Water);
        for (let y = top - 1; y < G + 12; y++) O.set(x, y, z, B.Air);
        // The lip: a ledge of stone at the pool's downstream end with water spilling over the middle
        if (z === za + 12 && t < 4) {
          for (let y = top - 6; y < top - 1; y++) O.set(x, y, z, dx < 4 ? B.Water : B.MossyStone);
        }
      }
      for (const [gx, gz] of [[cx - 6, za + 4], [cx + 5, za + 8]]) O.set(gx, top - 1, gz, B.Glowcap);
      s.props.push({ t: 'furn', item: 'mushrooms', x: cx - 8.5, y: top - 1, z: za + 6.5, ry: t, tint: t });
    }
    // A footbridge over the top pool, trees on the banks
    for (let x = cx - 9; x <= cx + 9; x++) O.set(x, G - 1, z0 + 5, B.Planks);
    // Parapets along the bridge, only over the gap (not running on into the rock walls)
    for (let x = cx - 9; x <= cx + 9; x++) for (const z of [z0 + 4, z0 + 6]) {
      if (Math.abs(x - cx) > 7 + Math.round(Math.sin((z + x * 0.3) * 0.35) * 1.5)) continue;
      O.set(x, G, z, x % 3 === 0 ? B.Timber : B.DarkPlanks); O.set(x, G + 1, z, B.Barrier);
    }
    for (const [tx, tz] of [[cx - 14, z0 + 8], [cx + 14, z0 + 20], [cx - 14, z0 + 36], [cx + 14, z0 + 50]]) plantTree(tx, tz, heightAt(tx, tz), 0.6);
    s.act = { kind: 'scenic' };
  }

  /** The Kelpie Arch: a sea arch off the west cape, crystal in its veins, gulls on its crown. */
  function buildSeaArch(s: Site) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    for (let a = 0; a <= 64; a++) {
      const t = a / 64, ang = Math.PI * t;
      const z = cz + Math.round(Math.cos(ang) * 16), yTop = SEA + Math.round(Math.sin(ang) * 22) + 3;
      const legs = t < 0.12 || t > 0.88;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -3; dx <= 3; dx++) {
        if (Math.hypot(dx * 0.8, dz) > 3) continue;
        const x = cx + dx, zz = z + dz;
        const y0 = legs ? Math.min(heightAt(x, zz), SEA) - 1 : yTop - 4;
        for (let y = y0; y <= yTop; y++) O.set(x, y, zz, hash2(x, y, zz) < 0.04 ? B.Crystal : y > yTop - 1 && hash2(x, zz, 315) < 0.5 ? B.MossyStone : y < SEA + 2 ? B.Basalt : B.Stone);
      }
    }
    for (const [gz, gy] of [[cz - 3, SEA + 26], [cz + 2, SEA + 26], [cz + 6, SEA + 25]]) s.props.push({ t: 'furn', item: 'gull', x: cx + 0.5, y: gy, z: gz + 0.5, ry: gz });
    s.props.push({ t: 'glow', x: cx + 0.5, y: SEA + 18, z: cz + 0.5, r: 6, color: '#9fe8ff' });
    s.impostor.push({ x: cx, y: SEA + 12, z: cz - 16, w: 6, h: 24, d: 6, color: '#5a5a62' }, { x: cx, y: SEA + 12, z: cz + 16, w: 6, h: 24, d: 6, color: '#5a5a62' }, { x: cx, y: SEA + 23, z: cz, w: 6, h: 4, d: 34, color: '#5a5a62' });
    s.act = { kind: 'scenic' };
  }

  /**
   * The Stone King: a colossus standing knee-deep in the red sand of the barrens, crowned, a
   * shield at his side and his sword raised to the sky. Weathered and mossed; seen for miles.
   */
  function buildColossus(s: Site, G: number) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    rect(s, cx - 24, cz - 24, cx + 24, cz + 24);
    const stone = (x: number, y: number, z: number, id?: number) => O.set(x, y, z, id ?? (hash2(x * 3 + y, z, 317) < 0.16 ? B.MossyStone : hash2(z, x + y, 318) < 0.1 ? B.Cobble : B.StoneBrick));
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id?: number) => {
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) stone(x, y, z, id);
    };
    /** A limb as a thick line between two points. */
    const limb = (a: [number, number, number], b: [number, number, number], r: number, id?: number) => {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 1.5);
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t, pz = a[2] + (b[2] - a[2]) * t;
        for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.hypot(dx, dy, dz) <= r + 0.35) stone(Math.round(px + dx), Math.round(py + dy), Math.round(pz + dz), id);
      }
    };
    const y0 = G - 3;
    // Legs, knee-deep in a drift
    box(cx - 6, y0, cz - 3, cx - 2, G + 13, cz + 2);
    box(cx + 2, y0, cz - 3, cx + 6, G + 13, cz + 2);
    box(cx - 7, G + 10, cz - 4, cx + 7, G + 13, cz + 3, B.Cobble); // the skirt of mail
    // Torso, belt and breastplate
    box(cx - 7, G + 14, cz - 4, cx + 7, G + 27, cz + 3);
    box(cx - 7, G + 15, cz - 4, cx + 7, G + 16, cz + 3, B.TerraBrown);
    for (let y = G + 18; y <= G + 26; y++) O.set(cx, y, cz + 4, B.Cobble);
    // Shoulders, pauldrons
    box(cx - 10, G + 24, cz - 4, cx - 7, G + 28, cz + 3, B.Cobble);
    box(cx + 7, G + 24, cz - 4, cx + 10, G + 28, cz + 3, B.Cobble);
    // Head: a squared face, brows, eyes, nose, a beard, and the crown's points
    box(cx - 3, G + 28, cz - 3, cx + 3, G + 36, cz + 3);
    for (const ex of [cx - 2, cx + 2]) { O.set(ex, G + 33, cz + 4, B.Basalt); O.set(ex, G + 34, cz + 4, B.StoneBrick); }
    O.set(cx, G + 32, cz + 4, B.Cobble); O.set(cx, G + 33, cz + 4, B.Cobble);
    box(cx - 2, G + 28, cz + 4, cx + 2, G + 30, cz + 4, B.Cobble);
    for (let i = -3; i <= 3; i++) for (const z of [cz - 3, cz + 3]) { O.set(cx + i, G + 37, z, B.TerraCream); if (i % 2 === 0) O.set(cx + i, G + 38, z, B.TerraCream); }
    for (let k = -3; k <= 3; k++) for (const x of [cx - 3, cx + 3]) { O.set(x, G + 37, cz + k, B.TerraCream); if (k % 2 === 0) O.set(x, G + 38, cz + k, B.TerraCream); }
    // His left arm down at his side to a great round shield
    limb([cx - 9, G + 25, cz], [cx - 10, G + 15, cz + 2], 2);
    for (let dy = -6; dy <= 6; dy++) for (let dz = -6; dz <= 6; dz++) if (Math.hypot(dy, dz) <= 6.3) stone(cx - 13, G + 14 + dy, cz + 2 + dz, Math.hypot(dy, dz) > 5.3 ? B.TerraCream : Math.hypot(dy, dz) < 1.5 ? B.TerraBrown : undefined);
    // His right arm raised, the sword held up to the sky
    limb([cx + 9, G + 26, cz], [cx + 13, G + 33, cz + 1], 2);
    limb([cx + 13, G + 33, cz + 1], [cx + 14, G + 40, cz + 1], 2);
    box(cx + 12, G + 41, cz - 3, cx + 16, G + 41, cz + 5, B.TerraCream); // the cross-guard
    box(cx + 14, G + 38, cz + 1, cx + 14, G + 42, cz + 1, B.DarkPlanks); // the grip
    const tip = Math.min(SY - 3, G + 60);
    for (let y = G + 42; y <= tip; y++) for (const dz of [0, 1, 2]) for (const dx of y > tip - 3 ? [0] : [-1, 0]) O.set(cx + 14 + dx, y, cz + dz, dz === 1 ? B.StoneBrick : B.Stone);
    // Drifts round his legs, sand everywhere
    for (let dz = -16; dz <= 16; dz++) for (let dx = -16; dx <= 16; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 16) continue;
      const x = cx + dx, z = cz + dz, h = Math.round(Math.max(0, 5 - d * 0.45) + hash2(x, z, 319) * 1.5);
      for (let y = heightAt(x, z) - 1; y < G - 1 + h; y++) O.set(x, y, z, B.RedSand);
      O.set(x, G - 2 + h, z, B.RedSand);
    }
    s.impostor.push({ x: cx, y: G + 20, z: cz, w: 14, h: 40, d: 8, color: '#8a8070' }, { x: cx + 14, y: G + 50, z: cz + 1, w: 2, h: 20, d: 3, color: '#9a9488' });
    s.act = { kind: 'scenic' };
  }

  /** The drowned bell-tower: a church of the old coast, the sea come in over it; the tower stands. */
  function buildDrownedTower(s: Site) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const shell = Math.abs(dx) === 3 || Math.abs(dz) === 3;
      const topY = SEA + 12 - (shell ? Math.floor(hash2(dx, dz, 321) * 4) : 0);
      for (let y = heightAt(cx + dx, cz + dz) - 1; y < topY; y++) {
        if (!shell && y > SEA) { O.set(cx + dx, y, cz + dz, B.Air); continue; }
        const win = shell && (y - SEA) % 5 === 3 && (dx === 0 || dz === 0);
        O.set(cx + dx, y, cz + dz, win ? B.Window : hash2(dx, y, dz) < 0.3 ? B.MossyStone : B.StoneBrick);
      }
    }
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) O.set(cx + dx, SEA + 1, cz + dz, B.Planks); // a floor above the water
    // The nave's walls under the water, arches breaking the surface here and there
    for (let i = -14; i <= 14; i++) for (const side of [-6, 6]) {
      const x = cx + side, z = cz + 6 + i;
      if (i < 4 && i > -4) continue;
      const top = i % 5 === 0 ? SEA + 3 : SEA - 1 - (Math.abs(i) % 3);
      for (let y = heightAt(x, z) - 1; y < top; y++) O.set(x, y, z, hash2(x, y, z) < 0.5 ? B.MossyCobble : B.StoneBrick);
    }
    s.props.push({ t: 'glow', x: cx + 0.5, y: SEA + 13, z: cz + 0.5, r: 4, color: '#ffd8a0' }, { t: 'furn', item: 'gull', x: cx + 2.5, y: SEA + 12, z: cz + 2.5, ry: 1 });
    s.impostor.push({ x: cx + 0.5, y: SEA + 6, z: cz + 0.5, w: 7, h: 12, d: 7, color: '#7a7e86' });
    s.act = { kind: 'scenic' };
  }

  /** Mortar and stone for drowned walls: mostly weed-grown, some still dressed. */
  function drownedStone(x: number, y: number, z: number): number {
    const r = hash2(x * 5 + y, z, 333);
    return r < 0.5 ? B.MossyCobble : r < 0.75 ? B.Cobble : r < 0.9 ? B.StoneBrick : B.MossyStone;
  }

  /**
   * A cottage gone under the sea: four walls broken off at different heights, the door gap, a
   * window or two, the chimney end standing tallest and its fallen stones on the sea bed. Built on
   * a level floor cut into the slope. Returns the floor height.
   */
  function drownedCottage(s: Site, x0: number, z0: number, w: number, d: number, door: 'n' | 's') {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    let sum = 0, n = 0;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { sum += heightAt(x, z); n++; }
    const F = Math.round(sum / n);
    const doorX = x0 + Math.floor(w / 2), doorZ = door === 'n' ? z0 : z1;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const g = heightAt(x, z);
      for (let y = Math.min(g, F) - 1; y < F; y++) O.set(x, y, z, y === F - 1 ? (hash2(x, z, 334) < 0.6 ? B.Cobble : B.Gravel) : B.Stone);
      for (let y = F; y < g; y++) O.set(x, y, z, B.Water);
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (!edge) continue;
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      const chimney = x === x1 && !corner;
      const top = Math.min(SEA - 3, F + (corner ? 4 : chimney ? 5 : 1 + Math.floor(hash2(x, z, 335) * 3)));
      for (let y = F; y < top; y++) {
        if (x === doorX && z === doorZ && y < F + 2) continue; // the doorway
        if (!corner && y === F + 1 && (x + z) % 4 === 0 && !(z === doorZ && Math.abs(x - doorX) < 2)) continue; // a window
        O.set(x, y, z, drownedStone(x, y, z));
      }
    }
    // The chimney's fallen stones, scattered off the gable end
    for (let k = 0; k < 4; k++) {
      const fx = x1 + 1 + Math.floor(hash2(x0, k, 336) * 3), fz = z0 + Math.floor(hash2(z0, k, 337) * d);
      O.set(fx, heightAt(fx, fz), fz, drownedStone(fx, 0, fz));
    }
    rect(s, x0, z0, x1, z1);
    return F;
  }

  /**
   * Holmsey, the drowned parish: the sea came in over the village round the bell-tower long ago,
   * and the cottages stand roofless down the slope of the sea bed, the lane still cobbled between
   * them and the churchyard's stones leaning. Sharks hunt the lane and the bell-manes drift over the
   * square; the conger the Gullmouth boats call Old Sexton lives in the nave. A delve you swim.
   */
  function buildHolmsey(s: Site) {
    const T = { x: 1560, z: 1500 }; // the bell-tower (buildDrownedTower)
    const spawns: [number, number, number, string][] = [];
    const caches: [number, number, number][] = [];
    const glow = (x: number, y: number, z: number, color = '#7fe8d0', r = 3) => s.props.push({ t: 'glow', x, y, z, r, color });
    // The lane, east from the shallows to the church door, widening into the market square
    const lane = [[1474, 1500], [1500, 1500], [1508, 1500], [1530, 1501], [1548, 1503], [1554, 1506]];
    for (let i = 0; i < lane.length - 1; i++) {
      const [ax, az] = lane[i], [bx, bz] = lane[i + 1];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(ax + ((bx - ax) * k) / steps), z = Math.round(az + ((bz - az) * k) / steps);
        const half = x >= 1498 && x <= 1510 ? 4 : 1;
        for (let w = -half; w <= half; w++) {
          const Z = z + w;
          if (hash2(x, Z, 338) < 0.12) continue; // stones lifted by the sea
          O.set(x, heightAt(x, Z) - 1, Z, hash2(x, Z, 339) < 0.55 ? B.MossyCobble : hash2(x, Z, 340) < 0.5 ? B.Cobble : B.Gravel);
        }
      }
    }
    // The market cross in the square: three steps, a shaft, the arms
    {
      const cx = 1504, cz = 1500, g = heightAt(cx, cz);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) O.set(cx + dx, g, cz + dz, B.StoneBrick);
      const top = Math.min(SEA - 2, g + 6);
      for (let y = g + 1; y < top; y++) O.set(cx, y, cz, y === g + 1 ? B.StoneBrick : B.MossyStone);
      O.set(cx - 1, top - 2, cz, B.MossyStone); O.set(cx + 1, top - 2, cz, B.MossyStone);
      glow(cx + 0.5, top, cz + 0.5);
      rect(s, cx - 1, cz - 1, cx + 1, cz + 1);
    }
    // The cottages either side of the lane, the reeve's house and the Bell inn the biggest
    const houses: [number, number, number, number, 'n' | 's'][] = [
      [1478, 1489, 7, 5, 's'], [1489, 1490, 6, 5, 's'], [1480, 1504, 7, 6, 'n'], [1492, 1505, 6, 5, 'n'],
      [1512, 1487, 8, 6, 's'], [1515, 1506, 6, 5, 'n'], [1524, 1507, 7, 5, 'n'], [1523, 1484, 9, 7, 's'],
    ];
    houses.forEach(([x, z, w, d, door], i) => {
      const F = drownedCottage(s, x, z, w, d, door);
      const mx = x + w / 2, mz = z + d / 2;
      // A table and a stool still where they were; the reeve's strongbox and the inn's cash chest
      s.props.push({ t: 'furn', item: i % 2 ? 'stool' : 'table', x: mx - 1, y: F, z: mz, ry: i });
      if (i === 4 || i === 7) {
        caches.push([x + 1.5, F, z + 1.5]);
        s.props.push({ t: 'furn', item: 'chest', x: x + 1.5, y: F, z: z + 1.5, ry: Math.PI / 2 });
        glow(x + 1.5, F + 1, z + 1.5, '#ffd890', 2);
      }
      if (i % 3 === 0) spawns.push([mx, F + 2.5, mz + (door === 's' ? 6 : -6), i % 2 ? 'porbeagle' : 'blueshark']);
    });
    // The churchyard north of the lane: a low wall, a lychgate gap, the stones leaning every way
    {
      const x0 = 1534, z0 = 1480, x1 = 1550, z1 = 1494;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        if (edge && !(z === z1 && (x === 1541 || x === 1542))) O.set(x, heightAt(x, z), z, drownedStone(x, 1, z));
        else if (!edge && x % 3 === 0 && z % 3 === 1 && hash2(x, z, 341) < 0.8) {
          const g = heightAt(x, z), h = hash2(x, z, 342) < 0.3 ? 1 : 2;
          for (let y = g; y < g + h; y++) O.set(x, y, z, hash2(x, z, 343) < 0.5 ? B.MossyStone : B.StoneBrick);
        }
      }
      rect(s, x0, z0, x1, z1);
    }
    // The nave: Old Sexton's, with what the parish saved behind him
    const nave = { x: T.x + 0.5, z: T.z + 15.5 };
    const ng = heightAt(Math.floor(nave.x), Math.floor(nave.z));
    for (let dz = -4; dz <= 4; dz++) for (let dx = -5; dx <= 5; dx++) O.set(T.x + dx, heightAt(T.x + dx, T.z + 15 + dz) - 1, T.z + 15 + dz, (dx + dz) % 3 ? B.StoneBrick : B.MossyStone); // flagstones
    glow(nave.x, ng + 3, nave.z, '#9fe8ff', 4);
    s.props.push({ t: 'furn', item: 'chest', x: T.x + 0.5, y: heightAt(T.x, T.z + 19), z: T.z + 19.5, ry: Math.PI });
    rect(s, T.x - 6, T.z - 8, T.x + 6, T.z + 20);
    // Over the square, the bell-manes; down the slope, the sharks
    spawns.push([1504.5, heightAt(1504, 1496) + 4, 1496.5, 'bellmane'], [1520.5, heightAt(1520, 1500) + 4, 1500.5, 'bellmane'], [1540.5, heightAt(1540, 1500) + 5, 1500.5, 'blueshark']);
    s.act = { kind: 'delve', spawns, boss: [nave.x, ng + 2, nave.z, 'sexton'], chest: [T.x + 0.5, heightAt(T.x, T.z + 19), T.z + 19.5], caches };
  }

  /**
   * A hull settled on the sea bed, keel along x (or z) with the bow at the far end: narrow at the
   * keel and flaring out to the gunwale, fine at the bow with a stem post standing proud, square at
   * the transom, ribs every third frame, planks stove in between them, and heeled over by `heel`
   * blocks at the rail. `broken`: the frame where she broke her back (two frames gone, ragged either side).
   */
  function sunkenHull(x0: number, z0: number, len: number, alongZ: boolean, heel: number, broken = -1): number {
    const at = (i: number, w: number): [number, number] => (alongZ ? [x0 + w, z0 + i] : [x0 + i, z0 + w]);
    const D = 4;
    const beam = (i: number) => { const t = i / (len - 1); return t > 0.68 ? 3 * Math.cos(((t - 0.68) / 0.32) * (Math.PI / 2)) + 0.4 : t < 0.1 ? 2.4 + (t / 0.1) * 0.6 : 3; };
    let sum = 0;
    for (let i = 0; i < len; i++) sum += heightAt(...at(i, 0));
    const ky = Math.round(sum / len);
    for (let i = 0; i < len; i++) {
      if (i === broken || i === broken + 1) continue;
      const ragged = broken >= 0 && (i === broken - 1 || i === broken + 2);
      const rib = i % 3 === 0;
      for (let k = 0; k <= D; k++) {
        const hw = Math.round(beam(i) * (0.3 + 0.7 * Math.sqrt(k / D)));
        const off = Math.round((heel * k) / D), y = Math.min(SEA - 2, ky + k);
        if (ragged && k > 1 && hash2(i, k, 348) < 0.6) continue;
        for (let w = -hw; w <= hw; w++) {
          const [X, Z] = at(i, w + off);
          const shell = Math.abs(w) === hw;
          if (k === 0) {
            O.set(X, y, Z, w === 0 ? B.Timber : B.Planks);
            for (let yy = heightAt(X, Z); yy < y; yy++) O.set(X, yy, Z, B.Sand); // she's settled into a bank of sand
            continue;
          }
          if (!shell) {
            if (k === 1) O.set(X, y, Z, B.Planks); // the floor of the hold
            else if (k === D && i % 4 === 2) O.set(X, y, Z, B.Timber); // what's left of the deck beams
            else if (i === 0) O.set(X, y, Z, B.Planks); // the transom
            continue;
          }
          if (!rib && k > 1 && k < D && hash2(X * 3 + y, Z, 344) < 0.2) continue; // stove-in planks
          O.set(X, y, Z, k === D || rib ? B.Timber : k % 2 ? B.Planks : B.DarkPlanks);
        }
      }
    }
    // The stem post, standing up past the rail at the bow
    if (broken !== len - 2) for (let k = D; k <= D + 2; k++) {
      const [X, Z] = at(len - 1, Math.round(heel * Math.min(1, k / D)));
      O.set(X, Math.min(SEA - 2, ky + k), Z, B.Timber);
    }
    return ky;
  }

  /**
   * The Grindles: a reef of black rock off the Fleet Coast, one stack just breaking the surface to
   * mark it, and on the sand between the stacks the ships it caught: the brig Margery on her side,
   * a fishing smack broken in two, a stone barge with her cargo spilled. Congers live in the rock and
   * thornbacks lie on the sand. Sunken chests in all three wrecks and one in the reef.
   */
  function buildGrindles(s: Site) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    const caches: [number, number, number][] = [];
    const spawns: [number, number, number, string][] = [];
    const glow = (x: number, y: number, z: number, color = '#ffd890', r = 2) => s.props.push({ t: 'glow', x, y, z, r, color });
    // The reef: stacks of dark rock, ragged-sided, the Grindle Stone itself standing out of the water
    const stacks: [number, number, number, number][] = [[cx, cz, 4, SEA + 3], [cx - 18, cz + 10, 3, SEA - 3], [cx + 16, cz - 12, 3, SEA - 4], [cx + 22, cz + 14, 2, SEA - 5], [cx - 10, cz - 20, 3, SEA - 4], [cx - 26, cz - 6, 2, SEA - 6]];
    for (const [sx, sz, r, top] of stacks) {
      for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) {
        const d = Math.hypot(dx, dz) + hash2(sx + dx, sz + dz, 345) * 1.4;
        if (d > r + 0.6) continue;
        const X = sx + dx, Z = sz + dz;
        const h = Math.round(top - (d / (r + 0.6)) ** 2 * (top - heightAt(X, Z)) * 0.9);
        for (let y = heightAt(X, Z) - 1; y < h; y++) O.set(X, y, Z, hash2(X, y, Z * 3) < 0.25 ? B.MossyStone : hash2(X, y, Z) < 0.5 ? B.Basalt : B.Stone);
      }
      rect(s, sx - r - 1, sz - r - 1, sx + r + 1, sz + r + 1);
      spawns.push([sx + r + 2.5, heightAt(sx + r + 2, sz) + 1.5, sz + 0.5, 'conger']);
    }
    s.props.push({ t: 'furn', item: 'gull', x: cx + 0.5, y: SEA + 3, z: cz + 0.5, ry: 2 });
    // A cache in a crevice of the Grindle Stone's foot
    {
      const x = cx + 5, z = cz + 2, y = heightAt(x, z);
      caches.push([x + 0.5, y, z + 0.5]);
      s.props.push({ t: 'furn', item: 'chest', x: x + 0.5, y, z: z + 0.5, ry: -Math.PI / 2 });
      glow(x + 0.5, y + 1, z + 0.5);
    }
    // The Margery, on her side between the stacks
    const margery = sunkenHull(cx - 14, cz + 18, 22, false, 2);
    for (let k = 0; k < 9; k++) O.set(cx - 2 + k, heightAt(cx - 2 + k, cz + 24), cz + 24, B.OakLog); // her mainmast, fallen across the sand
    {
      const x = cx - 4, z = cz + 18, y = margery + 2;
      caches.push([x + 0.5, y, z + 0.5]);
      s.props.push({ t: 'furn', item: 'chest', x: x + 0.5, y, z: z + 0.5, ry: 0 }, { t: 'barrel', x: x - 2.5, y, z: z + 0.5, ry: 0.4 }, { t: 'crate', x: x + 3.5, y, z: z + 1.5, ry: 0.2 });
      glow(x + 0.5, y + 1, z + 0.5);
    }
    rect(s, cx - 15, cz + 14, cx + 9, cz + 25);
    // The smack, broken in two
    const smack = sunkenHull(cx + 10, cz - 4, 12, true, -1, 5);
    {
      const x = cx + 10, z = cz + 4, y = smack + 2; // in her hold, forward of the break
      caches.push([x + 0.5, y, z + 0.5]);
      s.props.push({ t: 'furn', item: 'chest', x: x + 0.5, y, z: z + 0.5, ry: Math.PI / 2 });
      glow(x + 0.5, y + 1, z + 0.5);
    }
    rect(s, cx + 6, cz - 5, cx + 14, cz + 9);
    // The barge, her cargo of dressed stone spilled down the sand
    sunkenHull(cx - 30, cz - 18, 12, true, 0);
    for (let k = 0; k < 7; k++) {
      const x = cx - 26 + Math.floor(hash2(k, 1, 346) * 6), z = cz - 12 + Math.floor(hash2(k, 2, 347) * 8);
      O.set(x, heightAt(x, z), z, B.StoneBrick);
    }
    {
      const x = cx - 24, z = cz - 9, y = heightAt(x, z);
      caches.push([x + 0.5, y, z + 0.5]);
      s.props.push({ t: 'furn', item: 'chest', x: x + 0.5, y, z: z + 0.5, ry: 1.2 }, { t: 'crate', x: x + 2.5, y, z: z + 1.5, ry: 0.7 });
      glow(x + 0.5, y + 1, z + 0.5);
    }
    rect(s, cx - 33, cz - 19, cx - 20, cz - 5);
    spawns.push([cx - 6.5, heightAt(cx - 6, cz) + 0.8, cz + 0.5, 'thornray'], [cx + 2.5, heightAt(cx + 2, cz - 14) + 0.8, cz - 13.5, 'thornray']);
    s.act = { kind: 'dive', spawns, caches };
    s.impostor.push({ x: cx + 0.5, y: SEA + 1.5, z: cz + 0.5, w: 6, h: 3, d: 6, color: '#3a3a3e' });
  }

  /**
   * The outer lands' towns, on one plan round a square: the inn on its north-west corner, the store
   * on its north-east, houses round the rest (the road comes in on the open side), the Charter Post
   * sign on the square, and each town's own trade at its edge. Cragsby, on the Gannet Cliffs: stone
   * and slate, the fowlers' rope and the egg store. Holme Staithe, on the Wrath Levels: plaster and
   * thatch, the staithe out into its mere, eel traps and reed stacks, and Harrowgate's new sluice on
   * the drain north of the town. Scarrow Tor, on Tolmen Moor: granite and slate, peat stacks, a
   * pony pound, and the tor with its holed stone.
   */
  function buildOuterTown(s: Site, G: number, kind: 'cragsby' | 'holme' | 'scarrow') {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    const roof: PropDesc['mat'] = kind === 'holme' ? 'thatch' : 'slate';
    const wall = kind === 'holme' ? B.Plaster : B.StoneBrick;
    pave(cx - 7, cz - 7, cx + 7, cz + 7, G, kind === 'scarrow' ? 'flag' : 'cobble');
    house(s, cx - 19, cz - 17, 12, 8, 2, G, roof, 's', { wall, role: 'inn' });
    house(s, cx + 8, cz - 16, 8, 7, 1, G, roof, 's', { wall, role: 'shop' });
    const homes: [number, number, number, number, 'n' | 's' | 'e' | 'w'][] = [[cx - 20, cz + 9, 7, 6, 'n'], [cx - 9, cz + 10, 7, 6, 'n'], [cx + 9, cz + 9, 7, 6, 'n'], [cx - 22, cz - 4, 6, 7, 'e']];
    homes.forEach(([x, z, w, d, door], i) => house(s, x, z, w, d, i === 1 ? 2 : 1, G, roof, door, { wall: kind !== 'holme' && i % 2 ? B.Stone : wall, closed: i !== 0, role: i === 0 ? 'home' : undefined }));
    for (const [lx, lz] of [[-6.5, -6.5], [7.5, -6.5], [-6.5, 7.5], [7.5, 7.5]]) s.props.push({ t: 'lantern', x: cx + lx, y: G, z: cz + lz });
    s.props.push({ t: 'bench', x: cx - 3, y: G, z: cz + 4.5, ry: 0 }, { t: 'bench', x: cx + 4, y: G, z: cz - 3.5, ry: Math.PI });
    if (kind === 'scarrow') {
      // A market cross of moor granite: two steps, the shaft and its arms
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) O.set(cx + dx, G, cz + dz, B.StoneBrick);
      for (let y = G + 1; y < G + 6; y++) O.set(cx, y, cz, B.Stone);
      O.set(cx - 1, G + 4, cz, B.Stone); O.set(cx + 1, G + 4, cz, B.Stone);
    } else {
      s.props.push({ t: 'well', x: cx + 0.5, y: G, z: cz + 0.5 });
      for (const [bx, bz] of [[cx, cz], [cx + 1, cz], [cx, cz + 1], [cx + 1, cz + 1]]) block2(bx, bz, G);
    }
    rect(s, cx - 2, cz - 2, cx + 2, cz + 2);

    if (kind === 'cragsby') {
      // The egg store, east of the square, and the fowlers' rope by the inn
      house(s, cx + 18, cz - 3, 6, 6, 1, G, 'slate', 'w', { wall: B.StoneBrick, role: 'store', chimney: false });
      s.props.push({ t: 'sign', x: cx + 16.5, y: G, z: cz + 4.5, ry: Math.PI / 2, text: 'Egg store' });
      for (const [fx, fz, ry] of [[-15.5, -7.6, 0], [-13, -7.8, 1.2], [14.6, 1.5, 2.1]] as const) s.props.push({ t: 'furn', item: 'coil', x: cx + fx, y: G, z: cz + fz, ry });
      s.props.push({ t: 'crate', x: cx + 15.4, y: G, z: cz - 1.6 }, { t: 'crate', x: cx + 15.4, y: G + 0.6, z: cz - 1.4 }, { t: 'barrel', x: cx + 15.2, y: G, z: cz + 2.8 });
      drystone(cx - 32, cz - 26, cx + 30, cz - 26);
      s.impostor.push({ x: cx - 13, y: G + 5, z: cz - 13, w: 12, h: 10, d: 8, color: '#8a8a8e' });
    } else if (kind === 'holme') {
      // The staithe: a timber landing stage out over the mere, eel traps along it, reed stacked to dry
      const jx0 = cx - 27, jx1 = cx - 36, jz = cz + 3;
      for (let x = jx1; x <= jx0; x++) for (let z = jz; z <= jz + 2; z++) {
        O.set(x, G - 1, z, (x + z) % 3 ? B.Planks : B.DarkPlanks);
        clearUp(x, z, G, G + 4);
        if ((x - jx1) % 4 === 0 && z !== jz + 1) for (let y = SEA - 4; y < G - 1; y++) O.set(x, y, z, B.OakLog);
      }
      for (let i = 0; i < 3; i++) s.props.push({ t: 'barrel', x: jx1 + 1.5 + i * 2.5, y: G, z: jz + 2.6, ry: i });
      s.props.push({ t: 'furn', item: 'coil', x: jx1 + 1.2, y: G, z: jz + 0.6, ry: 0.4 });
      rect(s, jx1, jz, jx0, jz + 2);
      for (const [hx, hz] of [[cx - 16, cz + 20], [cx - 12, cz + 21], [cx + 18, cz + 14]]) haystack(hx, hz, 2);
      // Harrowgate's sluice on the new drain, north of the town: stone cheeks, a timber gate between
      const sx = cx + 26, sz = cz - 34;
      for (let z = sz - 14; z <= sz + 14; z++) for (let x = sx - 1; x <= sx + 1; x++) {
        for (let y = SEA - 3; y < heightAt(x, z) + 1; y++) O.set(x, y, z, y < SEA ? B.Water : B.Air);
        O.set(x, SEA - 4, z, B.Clay);
      }
      for (const dx of [-2, 2]) for (let y = SEA - 4; y < SEA + 3; y++) O.set(sx + dx, y, sz, B.StoneBrick);
      for (let x = sx - 1; x <= sx + 1; x++) for (let y = SEA - 3; y < SEA + 2; y++) O.set(x, y, sz, B.DarkPlanks);
      for (let x = sx - 2; x <= sx + 2; x++) O.set(x, SEA + 3, sz, B.Timber);
      s.props.push({ t: 'furn', item: 'coil', x: sx + 3.5, y: heightAt(sx + 3, sz), z: sz + 1.5, ry: 1 }, { t: 'sign', x: sx + 3.5, y: heightAt(sx + 3, sz - 2), z: sz - 1.5, ry: -Math.PI / 2, text: 'H. & D. Drain No. 4' });
      rect(s, sx - 3, sz - 14, sx + 3, sz + 14);
      s.impostor.push({ x: cx - 13, y: G + 5, z: cz - 13, w: 12, h: 10, d: 8, color: '#c8b070' });
    } else {
      // Peat stacked by the doors, a pony pound in drystone, and the tor with its holed stone
      for (const [px, pz] of [[cx - 14, cz + 5], [cx + 17, cz + 7], [cx - 25, cz + 4]]) for (let y = 0; y < 2; y++) for (let k = 0; k < 2; k++) O.set(px + k, heightAt(px, pz) + y, pz, B.Loam);
      const fx = cx + 24, fz = cz - 8;
      drystone(fx - 6, fz - 5, fx + 6, fz - 5); drystone(fx - 6, fz + 5, fx + 6, fz + 5);
      drystone(fx + 6, fz - 5, fx + 6, fz + 5); drystone(fx - 6, fz - 5, fx - 6, fz + 5, [[fx - 6, fz]]);
      haystack(fx + 2, fz - 2, 2);
      const tx = cx + 22, tz = cz + 24;
      tor(tx, tz);
      // The holed stone: a slab of granite on its edge, a hole through it a child can be passed through
      const hx = tx - 9, hz = tz + 3, hg = heightAt(hx, hz);
      for (let dx = -2; dx <= 2; dx++) for (let y = hg - 1; y < hg + 5; y++) {
        const hole = (dx === 0 || dx === -1) && (y === hg + 2 || y === hg + 3);
        const edge = (Math.abs(dx) === 2 && y >= hg + 4);
        if (!hole && !edge) O.set(hx + dx, y, hz, hash2(hx + dx, y, hz) < 0.3 ? B.MossyStone : B.Stone);
      }
      rect(s, hx - 3, hz - 1, hx + 3, hz + 1);
      s.impostor.push({ x: tx, y: heightAt(tx, tz) + 5, z: tz, w: 10, h: 10, d: 9, color: '#7a7a76' });
    }
  }

  /** A tor: granite boulders stacked in rounded layers, weathered to steps you could climb. */
  function tor(x: number, z: number) {
    const g = heightAt(x, z);
    const layers: [number, number, number, number][] = [[0, 0, 5.2, 4], [1, -1, 4.2, 4], [-1, 1, 3.2, 3], [0, 0, 2.2, 3]];
    let y = g - 1;
    for (const [ox, oz, r, h] of layers) {
      for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
        if (Math.hypot(dx - ox, (dz - oz) * 1.15) > r + hash2(x + dx, z + dz, 348) * 0.8) continue;
        for (let k = 0; k < h; k++) O.set(x + dx, y + k, z + dz, hash2(x + dx, y + k, z + dz) < 0.22 ? B.MossyStone : B.Stone);
      }
      y += h;
    }
  }

  /** The Kingfisher Steps: terraced pools of pale mineral stone, each spilling into the one below. */
  function buildKingfisherSteps(s: Site, G: number) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    rect(s, cx - 18, cz - 18, cx + 18, cz + 22);
    for (let t = 0; t < 7; t++) {
      const pz = cz - 14 + t * 5, py = G + 4 - t, r = 7 + (t % 3);
      for (let dz = -3; dz <= 3; dz++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx / r, dz / 3.4);
        if (d > 1) continue;
        const x = cx + dx + Math.round(Math.sin(t * 1.7) * 3), z = pz + dz;
        for (let y = Math.min(heightAt(x, z), py) - 1; y < py; y++) O.set(x, y, z, B.TerraCream);
        if (d < 0.82) O.set(x, py - 1, z, B.Water);
        else O.set(x, py, z, B.TerraCream);
        clearUp(x, z, py + (d < 0.82 ? 0 : 1), py + 6);
      }
    }
    s.props.push({ t: 'furn', item: 'gull', x: cx + 4.5, y: G + 5, z: cz - 13.5, ry: 2 });
    for (const [tx, tz] of [[cx - 15, cz - 6], [cx + 15, cz + 4], [cx - 13, cz + 16]]) plantTree(tx, tz, heightAt(tx, tz), 0.5);
    s.act = { kind: 'scenic' };
  }

  /** The Kettle: the crater a star blew in the highland, crystal spires grown where it lay. */
  function buildGreatStarfall(s: Site, G: number) {
    const cx = Math.round(s.x), cz = Math.round(s.z);
    rect(s, cx - 34, cz - 34, cx + 34, cz + 34);
    for (let dz = -32; dz <= 32; dz++) for (let dx = -32; dx <= 32; dx++) {
      const d = Math.hypot(dx, dz) / 28;
      if (d > 1.15) continue;
      const x = cx + dx, z = cz + dz;
      const g = heightAt(x, z);
      if (d < 1) {
        const floor = G - Math.round((1 - d * d) * 10);
        for (let y = floor; y < Math.max(g, G) + 4; y++) O.set(x, y, z, B.Air);
        O.set(x, floor - 1, z, d < 0.35 ? B.Basalt : hash2(x, z, 323) < 0.2 ? B.Crystal : B.Gravel);
      } else {
        for (let y = g; y < G + 3 - Math.round((d - 1) * 20); y++) O.set(x, y, z, B.Basalt); // the thrown-up rim
      }
    }
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39, r = i === 0 ? 0 : 3 + (i % 4) * 2.5, h = 14 - (i === 0 ? 0 : 4 + (i % 3) * 2);
      const x = cx + Math.round(Math.cos(a) * r), z = cz + Math.round(Math.sin(a) * r), floor = G - 10;
      for (let y = floor; y < floor + h; y++) for (const [dx, dz] of y < floor + h - 3 ? [[0, 0], [1, 0], [0, 1]] : [[0, 0]]) O.set(x + dx, y, z + dz, B.Crystal);
      s.props.push({ t: 'glow', x: x + 0.5, y: floor + h - 1, z: z + 0.5, r: 4, color: '#9fe8ff' });
    }
    s.impostor.push({ x: cx, y: G, z: cz, w: 6, h: 10, d: 6, color: '#7fd8f0' });
    s.act = { kind: 'scenic' };
  }

  /**
   * The Charter's hall inside the keep: a flagged floor, pillars, the Speaker's dais between the two
   * north towers, long tables for a sitting, hearths on the side walls and lamps on chains. The
   * keep's shell is 21 blocks square; the hall is its ground floor, seven blocks high.
   */
  function keepHall(s: Site, cx: number, cz: number, base: number) {
    const H = 7;
    for (let z = cz - 9; z <= cz + 9; z++) for (let x = cx - 9; x <= cx + 9; x++) {
      if ((Math.abs(x - (cx - 8)) <= 3 || Math.abs(x - (cx + 8)) <= 3) && Math.abs(z - (cz - 8)) <= 3) continue; // the towers' bases
      O.set(x, base - 1, z, (x + z) % 2 === 0 ? B.StoneBrick : B.Basalt);
      for (let y = base; y < base + H; y++) O.set(x, y, z, B.Air);
      O.set(x, base + H, z, (x - cx) % 4 === 0 ? B.DarkPlanks : B.Planks); // ceiling, with beams
    }
    // Doorway: three wide, four high, through the south wall, with an open pair of doors
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = base; y < base + 4; y++) O.set(x, y, cz + 10, B.Air);
    for (let x = cx - 2; x <= cx + 2; x++) O.set(x, base + 4, cz + 10, B.Cobble);
    s.props.push({ t: 'furn', item: 'doorOpen', x: cx - 1.42, y: base, z: cz + 9.4, ry: Math.PI / 2 }, { t: 'furn', item: 'doorOpen', x: cx + 2.42, y: base, z: cz + 9.4, ry: -Math.PI / 2 });
    // Pillars down both sides
    for (const px of [cx - 5, cx + 5]) for (const pz of [cz - 1, cz + 3, cz + 7]) {
      for (let y = base; y < base + H; y++) O.set(px, y, pz, y === base || y === base + H - 1 ? B.Cobble : B.StoneBrick);
    }
    // The dais between the towers, a step up, with the Speaker's chair and a table for the clerks
    for (let z = cz - 9; z <= cz - 5; z++) for (let x = cx - 4; x <= cx + 4; x++) O.set(x, base, z, z === cz - 5 ? B.StoneBrick : B.Planks);
    s.props.push({ t: 'furn', item: 'chair', x: cx + 0.5, y: base + 1, z: cz - 7.5, ry: 0 });
    s.props.push({ t: 'furn', item: 'table', x: cx + 0.5, y: base + 1, z: cz - 5.6, ry: 0 });
    for (const [x, z] of [[cx, cz - 8], [cx + 1, cz - 8], [cx - 1, cz - 6], [cx, cz - 6], [cx + 1, cz - 6]]) { O.set(x, base + 1, z, B.Barrier); O.set(x, base + 2, z, B.Barrier); }
    s.props.push({ t: 'banner', x: cx - 3, y: base + 6, z: cz - 9.3, kind: 'aldermere' }, { t: 'banner', x: cx + 4, y: base + 6, z: cz - 9.3, kind: 'aldermere' });
    // Long tables with benches for a sitting, either side of the carpet
    for (const tx of [cx - 3, cx + 3]) for (const tz of [cz - 1, cz + 2, cz + 5]) {
      s.props.push({ t: 'furn', item: 'table', x: tx + 0.5, y: base, z: tz + 0.5, ry: Math.PI / 2 });
      s.props.push({ t: 'furn', item: 'bench', x: tx - 0.55, y: base, z: tz + 0.5, ry: Math.PI / 2 }, { t: 'furn', item: 'bench', x: tx + 1.55, y: base, z: tz + 0.5, ry: Math.PI / 2 });
      for (const dz of [0, 1]) { O.set(tx, base, tz + dz, B.Barrier); O.set(tx, base + 1, tz + dz, B.Barrier); }
    }
    for (let z = cz - 4; z <= cz + 9; z += 2) s.props.push({ t: 'furn', item: 'rug', x: cx + 0.5, y: base, z: z + 0.5, ry: Math.PI / 2, tint: 0 });
    // Hearths on the side walls, and lamps
    for (const [hx, ry] of [[cx - 8.6, Math.PI / 2], [cx + 9.6, -Math.PI / 2]] as const) {
      s.props.push({ t: 'furn', item: 'hearth', x: hx, y: base, z: cz + 3.5, ry });
      O.set(Math.floor(hx), base, cz + 3, B.Barrier); O.set(Math.floor(hx), base + 1, cz + 3, B.Barrier);
    }
    for (const [lx, lz] of [[cx, cz - 2], [cx, cz + 4], [cx - 6, cz + 1], [cx + 6, cz + 1], [cx - 6, cz + 6], [cx + 6, cz + 6]]) {
      s.props.push({ t: 'furn', item: 'lamp', x: lx + 0.5, y: base + H, z: lz + 0.5, ry: 0 }, { t: 'glow', x: lx + 0.5, y: base + H - 1, z: lz + 0.5, r: 2.2 });
    }
    s.props.push({ t: 'furn', item: 'shelves', x: cx - 8.5, y: base, z: cz - 3.5, ry: Math.PI / 2 }, { t: 'furn', item: 'shelves', x: cx + 9.5, y: base, z: cz - 3.5, ry: -Math.PI / 2 });
    s.props.push({ t: 'furn', item: 'chest', x: cx - 8.4, y: base, z: cz + 7.5, ry: Math.PI / 2 }, { t: 'furn', item: 'chest', x: cx + 9.4, y: base, z: cz + 7.5, ry: -Math.PI / 2 });
  }

  function buildHamlet(s: Site, base: number, x: number, z: number, roof: PropDesc['mat'], n: number) {
    const spots: [number, number, 'n' | 's' | 'e' | 'w'][] = [[-12, -10, 's'], [4, -12, 's'], [-14, 6, 'e'], [6, 6, 'n']];
    for (let i = 0; i < n; i++) {
      const [dx, dz, door] = spots[i];
      house(s, x + dx, z + dz, 7, 6, 1, heightAt(x + dx + 3, z + dz + 3), roof, door, { wall: roof === 'slate' ? B.StoneBrick : B.Plaster });
    }
    if (n > 1) { s.props.push({ t: 'well', x: x + 0.5, y: base, z: z + 0.5 }); rect(s, x - 2, z - 2, x + 2, z + 2); }
    s.props.push({ t: 'lantern', x: x + 3.5, y: heightAt(x + 3, z + 1), z: z + 1.5 });
    if (roof !== 'slate') fence(s, x - 19, z + 18, x - 1, z + 18);
    if (n > 1) hamletExtras(s, base, x, z, roof);
  }

  function buildWaystation(s: Site, base: number) {
    house(s, 700, 560, 12, 9, 2, base, 'red', 's', { role: 'inn' });
    house(s, 716, 562, 7, 6, 1, base, 'thatch', 's', { chimney: false });
    s.props.push({ t: 'sign', x: 706, y: base, z: 572, text: 'The Waystation' });
    s.props.push({ t: 'firepit', x: 712.5, y: base, z: 574.5 }, { t: 'bench', x: 710, y: base, z: 576, ry: 0 }, { t: 'barrel', x: 699, y: base, z: 570 }, { t: 'cart', x: 724, y: base, z: 574, ry: 0.4 });
    rect(s, 708, 572, 716, 578);
    waystationExtras(s, base);
  }

  function buildHollowOak(s: Site, base: number) {
    const cx = 304, cz = 600;
    rect(s, cx - 16, cz - 16, cx + 16, cz + 16);
    // Leaf mould round the tree, and a path worn from the road to the split
    for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 12 || hash2(cx + dx, cz + dz, 72) > 1.15 - d / 10) continue;
      O.set(cx + dx, heightAt(cx + dx, cz + dz) - 1, cz + dz, B.Loam);
    }
    for (let dz = 3; dz <= 15; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(dx) === 1 && hash2(cx + dx, cz + dz, 73) < 0.4) continue;
      O.set(cx + dx, heightAt(cx + dx, cz + dz) - 1, cz + dz, B.Path);
    }
    // The trunk: hollow enough to stand inside, flaring at the foot, with a split facing the road
    for (let y = base - 2; y < base + 30; y++) {
      const r = 3.4 + Math.max(0, base + 3 - y) * 0.45;
      for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > r) continue;
        const hollow = d <= 1.9 && y >= base && y < base + 9;
        const door = dz >= 2 && Math.abs(dx) <= (y === base + 3 ? 0 : 1) && y >= base && y <= base + 3;
        if (hollow || door) { O.set(cx + dx, y, cz + dz, B.Air); continue; }
        const floor = y === base - 1 && (d <= 1.9 || (dz >= 2 && Math.abs(dx) <= 1));
        O.set(cx + dx, y, cz + dz, floor ? B.Loam : B.OakLog);
      }
    }
    // Boughs, and buttress roots arching over the ground before they dive in (none across the door)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      for (let k = 3; k < 12; k += 0.5) for (const up of [0, 1]) O.set(cx + Math.round(Math.cos(a) * k), base + 18 + Math.floor(k / 2) + up, cz + Math.round(Math.sin(a) * k), B.OakLog);
    }
    for (let i = 0; i < 7; i++) {
      const a0 = Math.PI / 2 + 0.75 + i * ((Math.PI * 2 - 1.5) / 6);
      for (let k = 3; k <= 9.5; k += 0.5) {
        const a = a0 + (k - 3) * 0.05 * (i % 2 ? 1 : -1);
        const x = cx + Math.round(Math.cos(a) * k), z = cz + Math.round(Math.sin(a) * k);
        const top = base + Math.round(2.6 - (k - 3) * 0.5);
        const wide = k < 5.5 ? [[0, 0], [Math.round(-Math.sin(a)), Math.round(Math.cos(a))]] : [[0, 0]];
        for (const [wx, wz] of wide) for (let y = heightAt(x + wx, z + wz) - 1; y < top; y++) O.set(x + wx, y, z + wz, B.OakLog);
      }
    }
    for (let dy = -6; dy <= 8; dy++) for (let dz = -15; dz <= 15; dz++) for (let dx = -15; dx <= 15; dx++) {
      const d = (dx * dx + dz * dz) / 200 + (dy * dy) / (dy < 0 ? 30 : 60);
      if (d < 1 && hash2(dx * 7 + dy, dz, 71) > 0.06) O.set(cx + dx, base + 30 + dy, cz + dz, B.OakLeaves);
    }
    // Glowcaps in the roots' shade, toadstools between them
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + 0.3, k = 4.5 + hash2(i, 3, 74) * 2.5;
      const x = cx + Math.round(Math.cos(a) * k), z = cz + Math.round(Math.sin(a) * k);
      if (z - cz >= 3 && Math.abs(x - cx) <= 2) continue; // keep the path clear
      if (i % 3 === 0) O.set(x, heightAt(x, z), z, B.Glowcap);
      else s.props.push({ t: 'furn', item: 'mushrooms', x: x + 0.5, y: heightAt(x, z), z: z + 0.5, ry: a, tint: i });
    }
    // The post: letters pinned up the inside of the trunk and tied in bundles on the floor,
    // candle stubs and a lamp; offerings and ribbons left at the split.
    for (const y of [base + 0.3, base + 1.9, base + 3.5, base + 5.1]) {
      s.props.push({ t: 'furn', item: 'pinned', x: cx + 0.5, y, z: cz - 1, ry: 0, tint: Math.round(y) });
      s.props.push({ t: 'furn', item: 'pinned', x: cx - 1, y, z: cz + 0.5, ry: Math.PI / 2, tint: Math.round(y) + 1 });
      s.props.push({ t: 'furn', item: 'pinned', x: cx + 2, y, z: cz + 0.5, ry: -Math.PI / 2, tint: Math.round(y) + 2 });
    }
    for (const [lx, lz, t] of [[-0.6, -0.6, 0], [1.6, -0.6, 1], [-0.6, 1.4, 2]]) s.props.push({ t: 'furn', item: 'letters', x: cx + lx, y: base, z: cz + lz, ry: t, tint: t });
    s.props.push({ t: 'furn', item: 'candles', x: cx + 1.55, y: base, z: cz + 1.5, ry: 0.3 }, { t: 'glow', x: cx + 1.55, y: base + 0.5, z: cz + 1.5, r: 1.2, color: '#ffd8a0' });
    s.props.push({ t: 'furn', item: 'lamp', x: cx + 0.5, y: base + 4.6, z: cz + 0.5, ry: 0 });
    for (const [ox, t] of [[-1.6, 0], [2.6, 1]]) s.props.push({ t: 'furn', item: 'offering', x: cx + ox, y: heightAt(cx + Math.floor(ox), cz + 5), z: cz + 5.6, ry: t, tint: t });
    s.props.push({ t: 'furn', item: 'candles', x: cx - 1.1, y: heightAt(cx - 2, cz + 5), z: cz + 5.2, ry: 1 }, { t: 'glow', x: cx - 1.1, y: base + 0.5, z: cz + 5.2, r: 1.2, color: '#ffd8a0' });
    for (const ox of [-0.2, 1.2]) s.props.push({ t: 'furn', item: 'ribbons', x: cx + ox, y: base + 3.9, z: cz + 4.05, ry: 0, tint: Math.round(ox * 3) });
    s.props.push({ t: 'sign', x: cx + 3.5, y: heightAt(cx + 3, cz + 11), z: cz + 11.5, ry: 0.2, text: 'The Hollow Oak' });
    s.props.push({ t: 'glow', x: cx + 0.5, y: base + 1, z: cz + 0.5 });
    s.impostor.push({ x: cx, y: base + 15, z: cz, w: 6, h: 30, d: 6, color: '#5f4128' }, { x: cx, y: base + 31, z: cz, w: 30, h: 13, d: 30, color: '#2f5a2e' });
  }

  function buildMossgate(s: Site, base: number) {
    const cx = 176, cz = 860;
    for (let i = 0; i < 5; i++) {
      const ax = cx - 14 + i * 7;
      // Arch: two pillars and a lintel, some fallen
      const fallen = hash2(i, 3, 81) < 0.35;
      for (const px of [ax, ax + 4]) for (let y = base - 1; y < base + (fallen && px === ax + 4 ? 2 : 7); y++) O.set(px, y, cz, y % 3 === 0 ? B.MossyCobble : B.MossyStone);
      if (!fallen) for (let x = ax; x <= ax + 4; x++) O.set(x, base + 7, cz, B.MossyStone);
      else for (let x = ax + 5; x <= ax + 8; x++) O.set(x, base, cz + 2, B.MossyCobble);
    }
    buildRuinWalls(s, cx, cz + 12, base, B.MossyCobble);
    for (let i = 0; i < 6; i++) O.set(cx - 10 + i * 4, base, cz - 3 + (i % 2) * 6, B.Glowcap);
    rect(s, cx - 16, cz - 4, cx + 22, cz + 20);
    mossgateCamp(s, base);
  }

  function buildCamp(s: Site, x: number, z: number, big: boolean) {
    const base = heightAt(x, z);
    s.props.push({ t: 'firepit', x: x + 0.5, y: base, z: z + 0.5 });
    const colors = ['#8a6a3a', '#6a7a4a', '#7a3a2a'];
    for (let i = 0; i < (big ? 3 : 2); i++) {
      const a = i * 2.1 + 0.4;
      const tx = x + Math.cos(a) * 5, tz = z + Math.sin(a) * 5;
      s.props.push({ t: 'tent', x: tx, y: heightAt(tx, tz), z: tz, ry: -a + Math.PI / 2, color: colors[i % 3] });
    }
    if (big) for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) O.set(x + 7 + k, base + (i >> 1), z - 3 + (i % 2), B.OakLog);
    if (big) s.props.push({ t: 'notice', x: x - 6.5, y: heightAt(x - 6, z - 5), z: z - 5.5 }); // Harrowgate's order slip
    s.props.push({ t: 'crate', x: x - 3, y: base, z: z + 3 }, { t: 'barrel', x: x - 4, y: base, z: z + 2 });
    rect(s, x - 8, z - 8, x + 10, z + 8);
  }

  function buildGullmouth(s: Site, base: number, coast: number) {
    const z = 600;
    const roofs: PropDesc['mat'][] = ['blue', 'slate', 'blue', 'red', 'slate', 'blue', 'red', 'slate'];
    const spots: [number, number, 'n' | 's' | 'e' | 'w'][] = [[-58, -22, 's'], [-44, -24, 's'], [-58, 10, 'n'], [-44, 12, 'n'], [-30, -20, 'e'], [-30, 12, 'e'], [-16, -22, 's'], [-16, 12, 'n']];
    const roles: (Role | undefined)[] = [undefined, undefined, undefined, undefined, 'office', 'shop', 'store', undefined]; // the harbourmaster, Bett's chandlery, a fish store
    spots.forEach(([dx, dz, door], i) => house(s, coast + dx, z + dz, 7, 6, 1 + (i === 1 || i === 4 ? 1 : 0), base, roofs[i], door, { wall: i % 2 ? B.Plaster : B.Planks, role: roles[i] }));
    street(coast - 60, z - 4, coast - 12, z + 4);
    // Two jetties out over the water
    for (const jz of [z - 2, z + 6]) {
      for (let x = coast - 14; x < coast + 34; x++) for (let w = 0; w < 3; w++) {
        O.set(x, SEA, jz + w, B.Planks);
        clearUp(x, jz + w, SEA + 1, SEA + 6);
        if ((x - coast) % 6 === 0 && (w === 0 || w === 2)) for (let y = 2; y < SEA; y++) O.set(x, y, jz + w, B.Timber);
      }
      s.props.push({ t: 'lantern', x: coast + 33, y: SEA + 1, z: jz + 1.5 });
    }
    s.props.push({ t: 'boat', x: coast + 3, y: SEA - 0.55, z: z - 5, ry: 0.1 }, { t: 'boat', x: coast + 5, y: SEA - 0.55, z: z + 12, ry: -0.2 });
    for (let i = 0; i < 4; i++) s.props.push({ t: 'barrel', x: coast - 10 + i * 1.1, y: SEA + 1, z: z + 5 }, { t: 'crate', x: coast - 6, y: SEA + 1, z: z - 4 + i });
    s.props.push({ t: 'sign', x: coast - 62, y: heightAt(coast - 62, z), z: z - 5, text: 'Gullmouth' });
    rect(s, coast - 62, z - 26, coast + 34, z + 20);
    gullmouthExtras(s, base, coast);
    gullmouthTown(s, base, coast);
    gullmouthHarbour(s, base, coast);
  }

  function buildLighthouse(s: Site, base: number) {
    const cx = s.x, cz = s.z;
    rect(s, cx - 6, cz - 6, cx + 6, cz + 6);
    for (let y = base - 3; y < base + 26; y++) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dz);
      const r = y < base + 20 ? 3.6 - (y - base) * 0.03 : 2.6;
      if (d > r) { if (y >= base) O.set(cx + dx, y, cz + dz, B.Air); continue; }
      const shell = d > r - 1.1;
      if (!shell && y >= base) { O.set(cx + dx, y, cz + dz, y === base + 20 ? B.Planks : B.Air); continue; }
      const stripe = Math.floor((y - base) / 4) % 2 === 0;
      let id: number = stripe ? B.Plaster : B.Clay;
      if (y >= base + 21 && y <= base + 23) id = (dx + dz) % 2 === 0 ? B.Window : B.Timber;
      O.set(cx + dx, y, cz + dz, id);
    }
    for (let y = base; y < base + 20; y++) { const a = (y - base) * 0.8; O.set(cx + Math.round(Math.cos(a) * 1.6), y, cz + Math.round(Math.sin(a) * 1.6), B.Planks); }
    O.set(cx + 3, base, cz, B.Air); O.set(cx + 3, base + 1, cz, B.Air);
    s.props.push({ t: 'desk', x: cx + 5.5, y: base, z: cz + 1.5, ry: Math.PI / 2 }); // the keeper's oil book, outside the door
    s.props.push({ t: 'cone', x: cx + 0.5, y: base + 24, z: cz + 0.5, r: 3.6, h: 4, mat: 'red' }, { t: 'glow', x: cx + 0.5, y: base + 22.5, z: cz + 0.5, r: 6 });
    s.impostor.push({ x: cx + 0.5, y: base + 12, z: cz + 0.5, w: 6, h: 24, d: 6, color: '#e8dcc8' }, { x: cx + 0.5, y: base + 26, z: cz + 0.5, w: 7, h: 4, d: 7, color: '#a8382c', cone: true });
    lighthouseExtras(s, base);
  }

  function buildHarrowgate(s: Site, base: number) {
    const cx = 1000, cz = 1000;
    house(s, cx - 22, cz - 14, 12, 8, 2, base, 'slate', 's', { wall: B.Planks, role: 'office' }); // the office (Pryce's trestle outside)
    house(s, cx - 6, cz - 16, 9, 7, 1, base, 'slate', 's', { wall: B.Planks, role: 'store' });
    house(s, cx + 8, cz - 14, 10, 8, 1, base, 'red', 's', { wall: B.StoneBrick, role: 'shop' }); // the company store
    // Palisade
    for (const [x0, z0, x1, z1] of [[cx - 30, cz - 24, cx + 30, cz - 24], [cx - 30, cz + 24, cx + 30, cz + 24], [cx - 30, cz - 24, cx - 30, cz + 24], [cx + 30, cz - 24, cx + 30, cz + 24]]) {
      const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0), n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
      for (let i = 0; i <= n; i++) {
        const x = x0 + dx * i, z = z0 + dz * i;
        if (Math.abs(x - cx) < 4 && z0 === z1 && z0 > cz) continue; // south gate
        if (Math.abs(z - cz) < 4 && x0 === x1 && x0 < cx) continue; // west gate
        const g = heightAt(x, z);
        for (let y = g - 1; y < base + 4; y++) O.set(x, y, z, B.OakLog);
        if (i % 2 === 0) O.set(x, base + 4, z, B.OakLog);
      }
    }
    // Mine into the slope behind
    buildMine(s, cx + 12, cz + 8, base, 1, 34);
    s.props.push({ t: 'headframe', x: cx + 12.5, y: base, z: cz + 8.5, ry: Math.PI / 2 });
    s.props.push({ t: 'banner', x: cx - 3, y: base + 5, z: cz + 24.6, kind: 'harrow' }, { t: 'banner', x: cx + 4, y: base + 5, z: cz + 24.6, kind: 'harrow' });
    for (let i = 0; i < 4; i++) s.props.push({ t: 'cart', x: cx - 10 + i * 3, y: base, z: cz + 6, ry: 0.3 * i });
    s.props.push({ t: 'desk', x: cx - 12.5, y: base, z: cz - 4.5, ry: Math.PI / 2 }); // Pryce's trestle by the office door
    s.props.push({ t: 'anvil', x: cx + 13, y: base, z: cz - 4 }, { t: 'sign', x: cx - 3, y: base, z: cz + 27, text: 'Harrowgate &\nDaughters' });
    rect(s, cx - 32, cz - 26, cx + 32, cz + 26);
    harrowgateExtras(s, base);
    companyRow(s, base);
  }

  function buildMine(s: Site, x: number, z: number, base: number, dir: number, len = 22) {
    // Tunnel along +x or -x into the hillside, timbered, with ore in the walls
    rect(s, x - 3, z - 4, x + 3, z + 4);
    for (let i = 0; i < len; i++) {
      const tx = x + dir * i;
      for (let w = -2; w <= 2; w++) {
        O.set(tx, base - 1, z + w, B.Gravel);
        for (let y = base; y < base + 4; y++) O.set(tx, y, z + w, B.Air);
      }
      if (i % 4 === 0) {
        for (let y = base; y < base + 4; y++) { O.set(tx, y, z - 2, B.Timber); O.set(tx, y, z + 2, B.Timber); }
        for (let w = -2; w <= 2; w++) O.set(tx, base + 4, z + w, B.Timber);
      }
      if (i > 3 && i % 3 === 1) {
        const side = i % 2 ? -3 : 3;
        const ore = hash2(tx, z, 91) < 0.5 ? B.IronOre : B.CopperOre;
        O.set(tx, base + 1, z + side, ore);
      }
      if (i % 8 === 4) s.props.push({ t: 'wallLantern', x: tx + 0.5, y: base + 2.6, z: z - 1.5, ry: 0 }, { t: 'glow', x: tx + 0.5, y: base + 3, z: z - 1 });
    }
    s.props.push({ t: 'cart', x: x + dir * 2 + 0.5, y: base, z: z + 0.5, ry: Math.PI / 2 });
  }

  function buildFort(s: Site, base: number) {
    const cx = 1250, cz = 1250;
    for (const [x0, z0, x1, z1] of [[cx - 14, cz - 14, cx + 14, cz - 14], [cx - 14, cz + 14, cx + 14, cz + 14], [cx - 14, cz - 14, cx - 14, cz + 14], [cx + 14, cz - 14, cx + 14, cz + 14]]) {
      const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
      for (let i = 0; i <= 28; i++) {
        const x = x0 + dx * i, z = z0 + dz * i;
        const hgt = Math.floor(2 + hash2(x, z, 101) * 7 * (i % 7 < 4 ? 1 : 0.3));
        for (let y = base - 1; y < base + hgt; y++) O.set(x, y, z, y % 4 === 0 ? B.TerraBrown : B.StoneBrick);
      }
    }
    tower(s, cx, cz, 7, 14, base, B.StoneBrick, { broken: true, hollow: true });
    for (let i = 0; i < 20; i++) {
      const rx = cx - 12 + Math.floor(hash2(i, 1, 102) * 24), rz = cz - 12 + Math.floor(hash2(i, 2, 102) * 24);
      if (Math.abs(rx - cx) <= 2 && rz > cz) continue; // keep the way to the stair clear
      O.set(rx, base, rz, B.StoneBrick);
    }
    buildUndercroft(s, cx, cz, base);
    fortExtras(s, base);
    s.impostor.push({ x: cx, y: base + 7, z: cz, w: 7, h: 14, d: 7, color: '#8a6a5a' });
    rect(s, cx - 15, cz - 15, cx + 15, cz + 15);
  }

  /**
   * The undercroft under Gallows Knap: the old builders' crystal workings, which Harrowgate's survey
   * crew went down into and came back out of short. Upper level at floor y 7 (stair, hall, corridor,
   * survey camp), lower level at floor y 3 (the deep cut, with the tally wall at its far end).
   * Kept below y 13 because the canyon floor above it dips to y 18.
   */
  function buildUndercroft(s: Site, cx: number, cz: number, base: number) {
    const UP = 7, LOW = 3;
    const room = (x0: number, z0: number, x1: number, z1: number, floor: number, height: number, veins = 0.04) => {
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        const edge = x < x0 || x > x1 || z < z0 || z > z1;
        for (let y = floor - 1; y <= floor + height + 1; y++) {
          if (edge || y === floor - 1 || y === floor + height + 1) {
            // Shell: worked stone where the builders dressed it, raw rock and crystal where they didn't
            const h = hash2(x * 3 + y, z, 171);
            O.set(x, y, z, h < veins ? B.Crystal : y === floor - 1 ? (h < 0.5 ? B.StoneBrick : B.Cobble) : h < 0.35 ? B.StoneBrick : h < 0.7 ? B.Stone : B.Basalt);
          } else O.set(x, y, z, B.Air);
        }
      }
    };
    // Rooms first; the stair, corridor and ramp are carved afterwards so no room wall seals a passage.
    const hallZ = cz + 3 + (base - UP) + 1;
    room(cx + 7, hallZ + 5, cx + 24, hallZ + 7, UP, 3, 0.02);              // corridor east (shell)
    room(cx - 6, hallZ, cx + 6, hallZ + 12, UP, 5);                       // the hall
    for (const [px, pz] of [[-3, 3], [3, 3], [-3, 9], [3, 9]]) for (let y = UP; y < UP + 5; y++) O.set(cx + px, y, hallZ + pz, B.StoneBrick);
    const camp = { x0: cx + 25, z0: hallZ - 2, x1: cx + 37, z1: hallZ + 14 };
    room(camp.x0, camp.z0, camp.x1, camp.z1, UP, 5);                      // Harrowgate's survey camp
    const cut = { x0: cx + 18, z0: camp.z1 + UP - LOW + 2, x1: cx + 44, z1: camp.z1 + UP - LOW + 23 };
    room(cut.x0, cut.z0, cut.x1, cut.z1, LOW, 8, 0.12);                   // the deep cut
    // Door in the tower's south wall, and the builders' stair going down under the south wall
    for (let y = base; y < base + 3; y++) for (let dx = -1; dx <= 1; dx++) O.set(cx + dx, y, cz + 3, B.Air);
    for (let k = 0; k <= base - UP; k++) {
      const z = cz + 3 + k, floor = base - k;
      for (let dx = -2; dx <= 2; dx++) {
        const wall = Math.abs(dx) === 2;
        for (let y = floor - 1; y <= floor + 4; y++) {
          if (wall) { if (y < base) O.set(cx + dx, y, z, B.StoneBrick); }
          else O.set(cx + dx, y, z, y === floor - 1 ? B.StoneBrick : B.Air);
        }
      }
    }
    // The corridor, opened through the hall's east wall and the camp's west wall
    for (let x = cx + 6; x <= cx + 25; x++) for (let z = hallZ + 5; z <= hallZ + 7; z++) {
      O.set(x, UP - 1, z, B.StoneBrick);
      for (let y = UP; y <= UP + 2; y++) O.set(x, y, z, B.Air);
    }
    // Ramp from the camp down into the deep cut
    for (let k = 0; k <= UP - LOW + 1; k++) {
      const z = camp.z1 + k, floor = Math.max(LOW, UP - k);
      for (let x = cx + 29; x <= cx + 33; x++) for (let y = floor - 1; y <= floor + 4; y++) O.set(x, y, z, y === floor - 1 ? B.StoneBrick : B.Air);
    }
    // Crystal outcrops left standing in the cut, and the cap: a dark band of basalt over the crystal
    for (const [ox, oz, hgt] of [[4, 5, 3], [21, 6, 4], [9, 15, 2], [17, 17, 3], [24, 12, 5]]) for (let y = LOW; y < LOW + hgt; y++) O.set(cut.x0 + ox, y, cut.z0 + oz, B.Crystal);
    for (let x = cut.x0; x <= cut.x1; x++) for (const y of [LOW + 7, LOW + 8]) O.set(x, y, cut.z1 + 1, B.Basalt);
    // The tally wall: a dressed panel at the far end
    for (let x = cut.x0 + 9; x <= cut.x0 + 17; x++) for (let y = LOW; y < LOW + 5; y++) O.set(x, y, cut.z1 + 1, (x + y) % 3 === 0 ? B.Basalt : B.StoneBrick);
    // Light: the survey crew's lamps, and crystal glow in the cut
    s.props.push(
      { t: 'lantern', x: cx + 0.5, y: UP, z: hallZ + 1.5 }, { t: 'glow', x: cx + 0.5, y: UP + 3, z: hallZ + 6.5, r: 9 },
      { t: 'lantern', x: cx + 16.5, y: UP, z: hallZ + 6.5 },
      { t: 'lantern', x: camp.x0 + 2.5, y: UP, z: camp.z0 + 2.5 }, { t: 'glow', x: camp.x0 + 6.5, y: UP + 3, z: camp.z0 + 8.5, r: 9 },
      { t: 'tent', x: camp.x0 + 9, y: UP, z: camp.z0 + 4, ry: Math.PI / 2, color: '#7a3a2a' },
      { t: 'crate', x: camp.x0 + 2, y: UP, z: camp.z0 + 12 }, { t: 'barrel', x: camp.x0 + 3, y: UP, z: camp.z0 + 13 },
      { t: 'desk', x: camp.x0 + 6.5, y: UP, z: camp.z0 + 1.5 },
      { t: 'glow', x: cut.x0 + 13.5, y: LOW + 4, z: cut.z0 + 10.5, r: 14, color: '#7fe0f4' },
      { t: 'glow', x: cut.x0 + 13.5, y: LOW + 2, z: cut.z1 - 1.5, r: 8, color: '#7fe0f4' },
    );
  }

  function buildObservatory(s: Site, base: number) {
    const cx = 600, cz = 1700;
    // The plateau is high (ground at y 79) and the world stops at y 95: the tower is as tall as that allows
    const H = Math.max(12, Math.min(30, SY - 5 - base));
    tower(s, cx, cz, 9, H, base, B.StoneBrick, { crenel: true, door: 's', trim: B.Basalt, hollow: true });
    observatoryInterior(s, cx, cz, base, H);
    for (let a = -5; a <= 5; a++) for (const [x, z] of [[cx + a, cz - 5], [cx + a, cz + 5], [cx - 5, cz + a], [cx + 5, cz + a]]) {
      O.set(x, base + H - 3, z, B.Basalt); O.set(x, base + H - 2, z, B.StoneBrick);
      if ((x + z) % 2 === 0) O.set(x, base + H - 1, z, B.StoneBrick);
    }
    for (const [tx, tz] of [[cx - 5, cz - 5], [cx + 5, cz - 5], [cx - 5, cz + 5], [cx + 5, cz + 5]]) {
      for (let y = base - 1; y < base + H + 2; y++) O.set(tx, y, tz, y > base + H - 3 ? B.Cobble : B.StoneBrick);
      O.set(tx, base + H + 2, tz, B.Basalt);
      for (let y = base; y < base + 8; y++) for (const [ox, oz] of [[Math.sign(tx - cx), 0], [0, Math.sign(tz - cz)]]) O.set(tx + ox, y, tz + oz, y === base + 7 ? B.Cobble : B.StoneBrick);
    }
    s.props.push({ t: 'wallLantern', x: cx - 0.7, y: base + 2.4, z: cz + 4.6, ry: 0 }, { t: 'wallLantern', x: cx + 1.7, y: base + 2.4, z: cz + 4.6, ry: 0 });
    for (let y = 0; y < 4; y++) O.set(cx, base + H + y, cz, B.Crystal);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { O.set(cx + dx, base + H, cz + dz, B.Crystal); O.set(cx + dx, base + H + 1, cz + dz, B.Crystal); }
    house(s, cx - 16, cz + 6, 8, 7, 1, heightAt(cx - 12, cz + 9), 'slate', 'e', { wall: B.StoneBrick });
    s.props.push({ t: 'desk', x: cx - 3.5, y: heightAt(cx - 4, cz + 9), z: cz + 9.5, ry: Math.PI / 2 }); // Ilse's weather log
    s.props.push({ t: 'desk', x: cx + 3.5, y: heightAt(cx + 3, cz + 9), z: cz + 9.5, ry: Math.PI / 2 }); // the glass, set up on a trestle
    s.props.push({ t: 'glow', x: cx + 0.5, y: base + H + 2, z: cz + 0.5, r: 8, color: '#7fe0f4' });
    s.impostor.push({ x: cx + 0.5, y: base + H / 2, z: cz + 0.5, w: 9, h: H, d: 9, color: '#8a8f98' }, { x: cx + 0.5, y: base + H + 2, z: cz + 0.5, w: 3, h: 4, d: 3, color: '#7fe0f4' });
  }

  function buildTemple(s: Site, base: number) {
    const cx = 1190, cz = 1800;
    for (let z = cz - 10; z <= cz + 10; z++) for (let x = cx - 16; x <= cx + 16; x++) {
      foundation(x, z, base, B.StoneBrick);
      O.set(x, base - 1, z, (x + z) % 4 === 0 ? B.Basalt : B.StoneBrick);
      clearUp(x, z, base, base + 12);
    }
    for (let x = cx - 14; x <= cx + 14; x += 4) for (const z of [cz - 8, cz + 8]) {
      const broken = hash2(x, z, 111) < 0.3;
      for (let y = base; y < base + (broken ? 3 : 9); y++) O.set(x, y, z, B.StoneBrick);
      if (!broken) O.set(x, base + 9, z, B.Basalt);
    }
    // The fallen star: a cracked crystal mass in the middle
    for (let dy = 0; dy < 7; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      if (Math.hypot(dx, dz * 1.2) + dy * 0.5 < 3.4 && hash2(dx, dz + dy * 9, 112) > 0.15) O.set(cx + dx, base + dy, cz + dz, B.Crystal);
    }
    s.props.push({ t: 'glow', x: cx + 0.5, y: base + 3, z: cz + 0.5, r: 10, color: '#7fe0f4' });
    // Harrowgate's survey: stakes across the floor, a camp off the east end, and a test cut through the paving
    for (let x = cx + 6; x <= cx + 14; x += 4) for (const z of [cz - 5, cz + 5]) { s.props.push({ t: 'fence', x: x + 0.5, y: base, z: z + 0.5, len: 1 }); O.set(x, base, z, B.Barrier); O.set(x, base + 1, z, B.Barrier); }
    for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx + 9; x <= cx + 13; x++) { O.set(x, base - 1, z, B.Air); O.set(x, base - 2, z, B.Crystal); }
    for (const [tx, tz, ry, col] of [[cx + 22, cz - 6, 0.4, '#7a3a2a'], [cx + 24, cz + 5, -0.3, '#8a6a3a']] as const) s.props.push({ t: 'tent', x: tx, y: heightAt(tx, tz), z: tz, ry, color: col });
    s.props.push({ t: 'cart', x: cx + 19, y: heightAt(cx + 19, cz), z: cz + 0.5, ry: Math.PI / 2 }, { t: 'crate', x: cx + 20, y: heightAt(cx + 20, cz + 2), z: cz + 2.5 });
    rect(s, cx - 17, cz - 11, cx + 26, cz + 11);
    s.impostor.push({ x: cx, y: base + 3, z: cz, w: 6, h: 7, d: 6, color: '#7fe0f4' });
    templeExtras(s, base);
  }

  function buildIslands(s: Site) {
    // Each island floats over the lowest ground nearby, so there is sky beneath it (world/holms.ts)
    const isles: [number, number, number, number][] = isleSpots().map((i) => [i.x, i.z, i.y, i.r]);
    let isleN = 0;
    for (const [ix, iz, iy, r] of isles) {
      for (let dy = -r; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const depth = -dy;
        const rr = dy > 0 ? r - dy * 1.5 : r * (1 - depth / (r * 1.1)) + hash2(dx, dz, 121) * 1.2;
        if (Math.hypot(dx, dz) > rr) continue;
        let id: number = dy === 2 ? B.Grass : dy > -1 ? B.Dirt : depth > r * 0.6 ? B.Basalt : B.Stone;
        if (dy < -2 && hash2(dx + dy, dz, 122) > 0.97) id = B.Crystal;
        O.set(ix + dx, iy + dy, iz + dz, id);
      }
      // Roots trail from the underside: thin ones as props, the thickest as blocks
      for (let k = 0; k < r * 2.5; k++) {
        const a = hash2(ix, k, 125) * Math.PI * 2, d = Math.sqrt(hash2(iz, k, 126)) * r * 0.8;
        const x = Math.floor(ix + Math.cos(a) * d), z = Math.floor(iz + Math.sin(a) * d);
        const bottom = iy - Math.floor(1.1 * (r - Math.hypot(x - ix, z - iz)));
        const len = 3 + hash2(x, z, 127) * (r * 0.7);
        if (k % 4 === 0) for (let y = 1; y <= Math.min(4, len * 0.4); y++) O.set(x, bottom - y, z, y < 3 ? B.OakLog : B.Dirt);
        s.props.push({ t: 'root', x: x + 0.5, y: bottom + 0.6 - (k % 4 === 0 ? Math.min(4, Math.floor(len * 0.4)) : 0), z: z + 0.5, ry: a, len: 0.4 + hash2(z, x, 128) * 0.8, h: len, r: 0.3 });
      }
      // What stood on the isles: a ring of columns on the largest with crystal grown through its
      // floor, an arch on the next, broken piers on the rest. The tops stay under the world's ceiling.
      const top = iy + 3, room = SY - 1 - top;
      const col = (x: number, z: number, h: number) => { for (let y = 0; y < Math.min(h, room); y++) O.set(x, top + y, z, y === 0 ? B.Cobble : (x + y + z) % 4 === 0 ? B.MossyStone : B.StoneBrick); };
      if (isleN === 0) {
        for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
          if (Math.hypot(dx, dz) > 5.2 || hash2(ix + dx, iz + dz, 129) < 0.15) continue;
          O.set(ix + dx, top - 1, iz + dz, (dx + dz) % 2 === 0 ? B.StoneBrick : hash2(dx, dz, 130) < 0.5 ? B.MossyCobble : B.Cobble);
        }
        const hs = [6, 6, 2, 5, 1, 7, 3, 0];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          if (hs[k]) col(Math.round(ix + Math.cos(a) * 5), Math.round(iz + Math.sin(a) * 5), hs[k]);
        }
        // A lintel still spanning the first two columns
        const [ax, az, bx, bz] = [ix + 5, iz, Math.round(ix + Math.cos(Math.PI / 4) * 5), Math.round(iz + Math.sin(Math.PI / 4) * 5)];
        for (let t = 0; t <= 8; t++) if (top + 6 < SY) O.set(Math.round(ax + (bx - ax) * t / 8), top + 6, Math.round(az + (bz - az) * t / 8), B.StoneBrick);
        for (let k = 0; k < 4; k++) O.set(ix - 2 + k, top, iz + 3, B.MossyStone); // a fallen drum
        for (const [dx, dz, h] of [[0, 0, 3], [1, 0, 2], [0, 1, 1], [-1, -1, 2]]) for (let y = 0; y < h; y++) O.set(ix + dx, top + y, iz + dz, B.Crystal);
        s.props.push({ t: 'glow', x: ix + 0.5, y: top + 2, z: iz + 0.5, r: 5, color: '#9fe8ff' });
        // The forty-one's counting stones, standing inside three of the columns (the story's readings
        // are a step in from each: content/weatherholms.ts), and the fourth lying face down by the cut
        for (const deg of [0, 135, 225]) {
          const sx = Math.floor(ix + 0.5 + Math.cos((deg * Math.PI) / 180) * 4), sz = Math.floor(iz + 0.5 + Math.sin((deg * Math.PI) / 180) * 4);
          O.set(sx, top, sz, B.MossyStone); O.set(sx, top + 1, sz, B.StoneBrick);
        }
        O.set(ix + 2, top, iz + 2, B.MossyStone); O.set(ix + 3, top, iz + 2, B.MossyStone);
        // Harrowgate's cut: a square hole in the paving east of the crystal, raw crystal at the bottom
        for (let dx = 2; dx <= 3; dx++) for (let dz = -2; dz <= -1; dz++) {
          O.set(ix + dx, top - 1, iz + dz, B.Air); O.set(ix + dx, top - 2, iz + dz, B.Air); O.set(ix + dx, top - 3, iz + dz, B.Crystal);
        }
        s.props.push({ t: 'rope', x: ix + 2.2, y: top + 0.6, z: iz - 1.5, ry: 0, len: 0.2, h: 2.6, r: 0.05 });
        s.props.push({ t: 'glow', x: ix + 3, y: top - 2, z: iz - 1, r: 2.2, color: '#c8b8ff' });
        // The crew's things by the bridge: crates of crystal waiting for the basket, a barrel of water
        const dirX = Math.sign(hoistSpot().x - ix), dirZ = Math.sign(hoistSpot().z - iz);
        const camp = (k: number, w: number): [number, number] => [ix + 0.5 + dirX * k + (dirZ !== 0 ? w : 0), iz + 0.5 + dirZ * k + (dirX !== 0 ? w : 0)];
        for (const [k, w, t] of [[6.5, -3.5, 'crate'], [6.8, -2.6, 'crate'], [6.2, 3.5, 'barrel'], [6.1, -2.7, 'crate']] as const) {
          const [cx, cz] = camp(k, w);
          s.props.push({ t, x: cx, y: top, z: cz, ry: k });
        }
      } else if (isleN === 1) {
        for (const dx of [-2, 2]) col(ix + dx, iz, 6);
        for (let dx = -2; dx <= 1; dx++) if (top + 6 < SY) O.set(ix + dx, top + 5, iz, B.StoneBrick); // the keystone end has gone
        for (let k = 0; k < 3; k++) O.set(ix - 1 + k, top - 1, iz + 2 + (k & 1), B.StoneBrick);
      } else {
        for (let k = 0; k < 2; k++) {
          const px = ix + Math.floor(hash2(ix, k, 123) * r) - (r >> 1), pz = iz + Math.floor(hash2(iz, k, 124) * r) - (r >> 1);
          col(px, pz, 2 + k * 2);
        }
      }
      // A wind-bent tree where there is headroom
      if (isleN !== 0 && r >= 7 && top + 10 < SY) plantTree(ix + 2, iz - 2, top, 0.3);
      isleN++;
      s.impostor.push({ x: ix, y: iy - r * 0.35, z: iz, w: r * 2, h: r * 0.9, d: r * 2, color: '#6a6a72' }, { x: ix, y: iy + 2.5, z: iz, w: r * 2, h: 1, d: r * 2, color: '#6a9a4a' });
    }
    buildHoist(s);
    s.r = 260;
  }

  /**
   * Harrowgate's hoist: a timber tower beside the largest isle, a basket on a rope up its middle,
   * and a plank bridge from its top platform onto the isle. At its foot, the crew's camp and the
   * crystal store.
   */
  function buildHoist(s: Site) {
    const H = hoistSpot();
    const x0 = Math.floor(H.x), z0 = Math.floor(H.z), g = H.ground, top = H.top;
    // A level gravel yard round the tower's foot
    for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
      if (Math.hypot(dx, dz) > 6.5) continue;
      const x = x0 + dx, z = z0 + dz;
      for (let y = Math.min(heightAt(x, z), g) - 3; y < g; y++) O.set(x, y, z, y === g - 1 ? (Math.abs(dx) <= 2 && Math.abs(dz) <= 2 ? B.Planks : B.Gravel) : B.Dirt);
      clearUp(x, z, g, g + 8);
    }
    // Four corner posts, braced every six blocks round the outside (the middle is the basket's shaft)
    for (let y = g; y < top - 1; y++) for (const [cx, cz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) O.set(x0 + cx, y, z0 + cz, B.Timber);
    for (let y = g + 5; y < top - 1; y += 6) for (let k = -1; k <= 1; k++) {
      O.set(x0 + k, y, z0 - 2, B.Planks); O.set(x0 + k, y, z0 + 2, B.Planks);
      O.set(x0 - 2, y, z0 + k, B.Planks); O.set(x0 + 2, y, z0 + k, B.Planks);
    }
    // The top platform, and the bridge from it to the isle's grass
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { O.set(x0 + dx, top - 1, z0 + dz, B.Planks); clearUp(x0 + dx, z0 + dz, top, top + 4); }
    // The bridge stops where the isle's grass starts (its edge is r - 3 from the middle), short of the ring
    for (let k = 3; k <= 9; k++) for (let w = -2; w <= 2; w++) {
      const x = x0 + H.dx * k + (H.dz !== 0 ? w : 0), z = z0 + H.dz * k + (H.dx !== 0 ? w : 0);
      O.set(x, top - 1, z, B.Planks);
      if (k < 9) clearUp(x, z, top, top + 3);
    }
    // Rails along the bridge, a lantern at each end, the winch and the basket
    const side = (k: number, w: number): [number, number] => [x0 + 0.5 + H.dx * k + (H.dz !== 0 ? w : 0), z0 + 0.5 + H.dz * k + (H.dx !== 0 ? w : 0)];
    const along = Math.atan2(H.dx, H.dz);
    // Rails: two-high timber posts every other block along both edges, rope strung between them,
    // and the gaps barred two high, so nobody steps or hops off a thirty-block drop by accident
    for (let k = 3; k <= 9; k++) for (const w of [-2, 2]) {
      const x = x0 + H.dx * k + (H.dz !== 0 ? w : 0), z = z0 + H.dz * k + (H.dx !== 0 ? w : 0);
      const post = (k - 3) % 2 === 0;
      O.set(x, top, z, post ? B.Timber : B.Barrier);
      O.set(x, top + 1, z, post ? B.Timber : B.Barrier);
      if (post && k < 9) { const [rx, rz] = side(k, w); s.props.push({ t: 'rope', x: rx, y: top + 1.85, z: rz, ry: along, len: 2, h: 0.25, r: 0.05 }); }
    }
    for (const k of [2.6, 9]) { const [lx, lz] = side(k, 2); s.props.push({ t: 'lantern', x: lx, y: top, z: lz, ry: along }); }
    s.props.push({ t: 'crate', x: x0 + 0.5, y: top, z: z0 + 0.5, ry: 0.1 }); // the basket, at the top
    s.props.push({ t: 'rope', x: x0 + 0.5, y: top + 2.2, z: z0 + 0.5, ry: 0, len: 0.2, h: top - g + 1, r: 0.05 });
    const back = (k: number, w: number): [number, number] => [x0 + 0.5 - H.dx * k + (H.dz !== 0 ? w : 0), z0 + 0.5 - H.dz * k + (H.dx !== 0 ? w : 0)];
    const [wx, wz] = back(4, -2), [ex, ez] = back(4, 2.5);
    s.props.push({ t: 'cart', x: wx, y: g, z: wz, ry: along }, { t: 'barrel', x: ex, y: g, z: ez });
    // The camp: two tents, a fire, and the crystal store (crates, stacked)
    const [tx1, tz1] = back(9, -4), [tx2, tz2] = back(9, 4), [fx, fz] = back(7, 0);
    s.props.push({ t: 'tent', x: tx1, y: heightAt(tx1, tz1), z: tz1, ry: along, color: '#4a4a52' }, { t: 'tent', x: tx2, y: heightAt(tx2, tz2), z: tz2, ry: along, color: '#6a5a3a' });
    s.props.push({ t: 'firepit', x: fx, y: g, z: fz });
    const [sx, sz] = back(-1, 5);
    for (let k = 0; k < 5; k++) s.props.push({ t: 'crate', x: sx + (k % 3) * 0.75, y: g + (k >= 3 ? 0.62 : 0), z: sz + (k >= 3 ? 0.35 : 0), ry: k * 0.3 });
    s.props.push({ t: 'glow', x: sx + 0.7, y: g + 1, z: sz, r: 2, color: '#9fe8ff' });
    const [nx, nz] = back(3, -3.5);
    s.props.push({ t: 'notice', x: nx, y: g, z: nz, ry: along });
    rect(s, x0 - 12, z0 - 12, x0 + 12, z0 + 12);
  }

  function buildWreck(s: Site, x: number, z: number) {
    // A shingle bar runs out from the beach and buries the bow; the stern is still in the surf.
    // The bar steps down from the shore a block at a time, so it can be walked both ways.
    for (let xx = x - 24; xx <= x + 4; xx++) for (let w = -6; w <= 6; w++) {
      const along = (xx - (x - 10)) / 14.5;
      if (along * along + (w / 6.5) * (w / 6.5) > 1) continue;
      const zz = z + w;
      const ground = heightAt(xx, zz);
      const top = Math.min(SEA + 8, SEA + 1 + Math.max(0, Math.floor((x - 10 - xx) * 0.8)));
      if (ground >= top) continue; // the beach is already this high
      for (let y = ground - 1; y < top; y++) O.set(xx, y, zz, y >= top - 1 ? B.Sand : B.Gravel);
      for (let y = top; y <= SEA; y++) O.set(xx, y, zz, B.Air);
    }
    // The Gannet: keel along +x from the bow (buried in the bar) to the stern in the surf, heeled to
    // starboard, her port side stove in amidships so the ribs show, the starboard quarter gone.
    const half = (i: number) => (i < 2 ? 1 : i < 5 ? 2 : i < 14 ? 3 : 2);
    const keelY = (i: number) => SEA - 3 + Math.floor(i / 7);
    for (let i = 0; i < 19; i++) {
      const W = half(i), ky = keelY(i), X = x + i;
      O.set(X, ky - 1, z, B.Timber); // the keel
      for (let w = -W; w <= W; w++) {
        if (i > 13 && w > 0) continue;
        const gun = ky + 5 + (i < 3 ? 1 : 0) - (w > 0 ? 1 : 0); // sheer up to the bow; heeled
        if (Math.abs(w) < W) { O.set(X, ky + (Math.abs(w) >= 2 ? 1 : 0), z + w, B.Planks); continue; }
        const breach = w < 0 && i >= 7 && i <= 12;
        for (let y = ky + 1; y <= gun; y++) {
          if (breach && y > ky + 2 && y < gun) { if (i % 2 === 1) O.set(X, y, z + w, B.Timber); continue; } // ribs
          O.set(X, y, z + w, y === gun ? B.Timber : (y - ky) % 2 === 0 ? B.Planks : B.DarkPlanks);
        }
      }
      // Deck beams every third frame, and the foredeck still planked
      if (i % 3 === 0 || i < 4) for (let w = -W + 1; w <= W - 1; w++) if (!(i > 13 && w > 0)) O.set(X, ky + 4 + (i < 3 ? 1 : 0), z + w, i < 4 ? B.Planks : B.DarkPlanks);
    }
    for (let y = keelY(0); y <= SEA + 4; y++) O.set(x - 1, y, z, B.Timber); // stem post, out of the shingle
    for (let y = keelY(18); y <= keelY(18) + 1; y++) O.set(x + 19, y, z, B.Timber); // stump of the sternpost
    // The mainmast, snapped, with its yard fallen across the rail
    for (let y = keelY(6); y < SEA + 8; y++) O.set(x + 6, y, z, B.Timber);
    for (let k = 0; k < 5; k++) O.set(x + 7 + k, SEA + 6 - k, z - 1 + (k >> 1), B.Timber);
    s.props.push({ t: 'rope', x: x + 6.5, y: SEA + 7.8, z: z + 0.5, ry: Math.PI, len: 6.5, h: 3.2, r: 0.5 });
    s.props.push({ t: 'rope', x: x + 6.5, y: SEA + 7.6, z: z + 0.5, ry: -0.4, len: 8, h: 8, r: 0.6 });
    s.props.push({ t: 'rope', x: x + 6.5, y: SEA + 7.2, z: z + 0.5, ry: Math.PI / 2 + 0.2, len: 3.4, h: 4.6, r: 0.3 });
    // Cargo strewn up the bar and floating in the surf. Col Maddox's sea chest is under the crate by the bow.
    const onBar = (px: number, pz: number) => Math.max(heightAt(Math.floor(px), Math.floor(pz)), Math.min(SEA + 8, SEA + 1 + Math.max(0, Math.floor((x - 10 - Math.floor(px)) * 0.8))));
    s.props.push({ t: 'crate', x: x - 3, y: onBar(x - 3, z + 2), z: z + 2 }, { t: 'barrel', x: x - 5, y: onBar(x - 5, z - 2), z: z - 2 });
    for (const [dx, dz, t] of [[-7.5, -3.5, 'barrel'], [-11, 2.5, 'crate'], [-4, -4.2, 'crate'], [-12.5, -2, 'barrel'], [-8.2, 3.6, 'barrel'], [1.5, 3.4, 'crate']] as const) s.props.push({ t, x: x + dx, y: onBar(x + dx, z + dz), z: z + dz, ry: dx * 0.7 });
    for (const [dx, dz] of [[9, 5.5], [13, -4.5], [4.5, -5.5]]) s.props.push({ t: 'barrel', x: x + dx, y: SEA - 0.45, z: z + dz, ry: dx });
    s.props.push({ t: 'furn', item: 'coil', x: x - 6.5, y: onBar(x - 6.5, z + 1.2), z: z + 1.2 }, { t: 'furn', item: 'coil', x: x + 2.5, y: keelY(2) + 6, z: z - 0.5 });
    // The ship's boat, dragged up the bar and left
    s.props.push({ t: 'boat', x: x - 12, y: onBar(x - 12, z - 4) + 0.5, z: z - 4, ry: 2.6 });
    s.props.push({ t: 'rope', x: x - 11, y: onBar(x - 11, z - 3.8) + 0.6, z: z - 3.8, ry: -0.5, len: 4, h: 0.55, r: -0.1 });
    // Gulls' rocks in the surf, white with droppings, gulls on them and on the wreck
    for (const [rx, rz, rh] of [[x + 11, z - 10, 4], [x + 16, z + 9, 3], [x + 4, z - 12, 2]]) {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dz * 1.2);
        if (d > 2.3) continue;
        const top = SEA + rh - Math.round(d * 1.1) - (hash2(rx + dx, rz + dz, 75) < 0.3 ? 1 : 0);
        for (let y = heightAt(rx + dx, rz + dz) - 1; y <= top; y++) O.set(rx + dx, y, rz + dz, y === top && d < 0.9 ? B.Snow : y > SEA - 1 ? (hash2(rx + dx, y + rz + dz, 78) < 0.25 ? B.Gravel : B.Stone) : B.Basalt);
      }
      s.props.push({ t: 'furn', item: 'gull', x: rx + 0.5, y: SEA + rh + 1, z: rz + 0.5, ry: rx }, { t: 'furn', item: 'gull', x: rx + 0.85, y: SEA + rh + 1, z: rz + 0.2, ry: rz });
    }
    for (const [i, ry] of [[3, 1], [9, -2], [16, 0.5]]) s.props.push({ t: 'furn', item: 'gull', x: x + i + 0.5, y: keelY(i) + 6 + (i < 3 ? 1 : 0), z: z - half(i) + 0.5, ry });
    s.props.push({ t: 'furn', item: 'gull', x: x + 6.5, y: SEA + 8, z: z + 0.5, ry: 2 });
    rect(s, x - 24, z - 13, x + 20, z + 12);
  }

  /** Wendside Cottage: a thatched cottage standing empty by the road, with a notice on a post. */
  function buildCottage(s: Site, base: number) {
    house(s, 404, 197, 8, 7, 1, base, 'thatch', 's', { role: 'vacant' });
    s.props.push({ t: 'sign', x: 410.5, y: base, z: 205.5, ry: 0, text: 'FOR SALE\nEnquire within' });
    s.props.push({ t: 'barrel', x: 404.6, y: base, z: 204.6 });
    // The joiner's bench under the east eaves (see COTTAGE.bench), a stack of logs beside it
    s.props.push({ t: 'desk', x: 412.6, y: base, z: 199.5, ry: -Math.PI / 2 });
    s.props.push({ t: 'crate', x: 412.7, y: base, z: 201.4 });
  }

  /** The Wendside lots: five plots let by the Charter along the Ford road, and the land board. */
  function buildLots(s: Site) {
    LOTS.forEach((l, i) => {
      rect(s, l.x0, l.z0, l.x0 + LOT_W, l.z0 + LOT_D);
      for (const [cx, cz] of [[l.x0, l.z0], [l.x0 + LOT_W - 1, l.z0], [l.x0, l.z0 + LOT_D - 1], [l.x0 + LOT_W - 1, l.z0 + LOT_D - 1]]) {
        const y = heightAt(cx, cz);
        O.set(cx, y, cz, B.OakLog);
      }
      // The road side: a rope between the front stakes, and the lot's number on a board
      const fz = l.door === 's' ? l.z0 + LOT_D - 0.5 : l.z0 + 0.5;
      const y = heightAt(l.x0 + 7, Math.floor(fz));
      // (a strand runs along +x before it's turned, so ry 0 lays it between the two front stakes)
      s.props.push({ t: 'rope', x: l.x0 + 0.5, y: y + 0.9, z: fz, ry: 0, len: LOT_W - 1, h: 0, r: 0.25 });
      s.props.push({ t: 'sign', x: l.x0 + LOT_W / 2 + 0.5, y, z: fz + (l.door === 's' ? 0.6 : -0.6), ry: l.door === 's' ? 0 : Math.PI, text: `LOT ${i + 1}\nTo let` });
    });
    s.props.push({ t: 'notice', x: LAND_BOARD.x, y: heightAt(LAND_BOARD.x, LAND_BOARD.z), z: LAND_BOARD.z, ry: 0 });
  }

  /** Hale's Fold: a shepherds' bothy and a drystone sheepfold on the ridge above Kelderby. */
  function buildBothy(s: Site, base: number) {
    const cx = 376, cz = 1380;
    house(s, cx - 3, cz - 6, 6, 5, 1, base, 'slate', 's', { wall: B.Cobble, chimney: false });
    // The fold: a ring of drystone wall, coursed rough stone with a coping of stones on edge, open
    // to the west with a hurdle for a gate, and a creep hole low in the east side for the lambs.
    const fx = cx + 13, fz = cz + 1;
    const ring = new Set<string>();
    for (let a = 0; a < 96; a++) {
      const t = (a / 96) * Math.PI * 2;
      if (Math.cos(t) < -0.92) continue; // the gate
      const x = Math.round(fx + Math.cos(t) * 6.5), z = Math.round(fz + Math.sin(t) * 6.5);
      if (ring.has(x + ',' + z)) continue;
      ring.add(x + ',' + z);
      const creep = x === fx + 6 || x === fx + 7 ? Math.abs(z - fz) === 0 : false;
      for (let y = heightAt(x, z) - 1; y < base + 2; y++) {
        if (creep && y === base) { O.set(x, y, z, B.Air); continue; }
        O.set(x, y, z, y < base ? B.Cobble : hash2(x, y * 3 + z, 76) < 0.3 ? B.MossyCobble : hash2(x, z + y, 77) < 0.2 ? B.Stone : B.Cobble);
      }
      O.set(x, base + 2, z, (x + z) % 2 === 0 ? B.StoneBrick : B.Stone); // the coping
      if (creep) O.set(x, base + 1, z, B.StoneBrick); // lintel over the creep
    }
    s.props.push({ t: 'furn', item: 'hurdle', x: fx - 6.2, y: base, z: fz + 1.6, ry: Math.PI / 2 - 0.5 });
    // Inside: a hay rack, a water trough, hay on the ground
    s.props.push({ t: 'furn', item: 'hayrack', x: fx + 1.5, y: base, z: fz - 2.5, ry: 0 });
    for (const [bx, bz] of [[fx + 1, fz - 3], [fx + 2, fz - 3]]) block2(bx, bz, base);
    s.props.push({ t: 'barrel', x: fx + 3.5, y: base, z: fz + 2.5 }, { t: 'barrel', x: fx + 4.3, y: base, z: fz + 2.1 });
    for (const [hx, hz] of [[fx - 1, fz + 2], [fx + 3, fz - 1]]) O.set(hx, base - 1, hz, B.Hay);
    // Field walls running off along the ridge from the fold
    drystone(fx + 5, fz - 5, fx + 18, fz - 12);
    drystone(fx + 6, fz + 4, fx + 19, fz + 9);
    drystone(cx - 4, cz - 7, cx - 14, cz - 13);
    // A peat stack against the bothy's west gable: cut turves in neat courses under a slate cap
    for (let y = 0; y < 3; y++) for (let k = 0; k < 4 - (y === 2 ? 1 : 0); k++) for (const w of [0, 1]) O.set(cx - 5 - w, base + y, cz - 6 + k, y % 2 ? B.Loam : B.Dirt);
    for (let k = 0; k < 3; k++) for (const w of [0, 1]) O.set(cx - 5 - w, base + 3, cz - 6 + k, k % 2 ? B.Stone : B.StoneBrick);
    // By the door: the fire Bryn kept, a bench, a water butt and rope, the lantern Ilse watched for
    s.props.push({ t: 'firepit', x: cx + 0.5, y: base, z: cz + 4.5 }, { t: 'crate', x: cx - 4, y: base, z: cz + 2 }, { t: 'lantern', x: cx + 2.5, y: base, z: cz + 1.5 });
    s.props.push({ t: 'bench', x: cx + 3.6, y: base, z: cz + 4.5, ry: Math.PI / 2 });
    s.props.push({ t: 'barrel', x: cx - 2.2, y: base, z: cz + 0.6 }, { t: 'furn', item: 'coil', x: cx - 3.2, y: base, z: cz + 0.8 });
    rect(s, cx - 15, cz - 14, fx + 20, fz + 10);
  }

  // ---------------------------------------------------------------- Settlement detail
  /** A two-high barrier block under a prop that shouldn't be walked through. */
  function block2(x: number, z: number, y?: number) { const g = y ?? heightAt(x, z); O.set(x, g, z, B.Barrier); O.set(x, g + 1, z, B.Barrier); }
  /** An open-sided shelter: timber posts at the corners (and along long sides) under a gable roof. */
  function shelter(s: Site, x0: number, z0: number, w: number, d: number, base: number, roof: PropDesc['mat'], h = 4) {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { foundation(x, z, base, B.Cobble); O.set(x, base - 1, z, hash2(x, z, 180) < 0.5 ? B.Gravel : B.Path); clearUp(x, z, base, base + h + 6); }
    const posts: [number, number][] = [];
    for (let x = x0; x < x0 + w; x += Math.max(1, Math.min(4, w - 1))) posts.push([x, z0], [x, z0 + d - 1]);
    posts.push([x0 + w - 1, z0], [x0 + w - 1, z0 + d - 1]);
    for (const [px, pz] of posts) for (let y = base; y < base + h; y++) O.set(px, y, pz, B.Timber);
    for (let x = x0; x < x0 + w; x++) for (const z of [z0, z0 + d - 1]) O.set(x, base + h - 1, z, B.DarkPlanks);
    const alongX = w >= d;
    s.props.push({ t: 'roof', x: x0 + w / 2, y: base + h, z: z0 + d / 2, len: alongX ? w : d, span: alongX ? d : w, rise: roofRise(alongX ? d : w), ry: alongX ? 0 : Math.PI / 2, mat: roof });
    rect(s, x0 - 1, z0 - 1, x0 + w, z0 + d);
  }
  /** A stack of cut logs, ends out. */
  function logStack(x0: number, z0: number, len: number, rows: number, alongX: boolean) {
    for (let r = 0; r < rows; r++) for (let i = 0; i < len - r; i++) for (const k of [0, 1]) {
      const x = alongX ? x0 + i : x0 + k, z = alongX ? z0 + k : z0 + i;
      O.set(x, heightAt(x0, z0) + r, z, B.OakLog);
    }
  }
  function haystack(x: number, z: number, h = 3) {
    for (let y = 0; y < h; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (y < h - 1 || (dx === 0 && dz === 0)) O.set(x + dx, heightAt(x, z) + y, z + dz, B.Hay);
  }
  function oreHeap(x: number, z: number, ore: number) {
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const h = 2 - Math.round(Math.hypot(dx, dz) * 0.8);
      for (let y = 0; y < h; y++) O.set(x + dx, heightAt(x + dx, z + dz) + y, z + dz, hash2(dx + y, dz, 181) < 0.55 ? ore : B.Gravel);
    }
  }
  /** A drystone wall along a line, one or two blocks high. */
  function drystone(x0: number, z0: number, x1: number, z1: number, gaps: [number, number][] = []) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), z = Math.round(z0 + ((z1 - z0) * i) / n);
      if (gaps.some(([gx, gz]) => Math.abs(gx - x) + Math.abs(gz - z) <= 1)) continue;
      const g = heightAt(x, z);
      O.set(x, g, z, B.Cobble);
      O.set(x, g + 1, z, hash2(x, z, 182) < 0.4 ? B.MossyCobble : B.Cobble);
    }
  }

  /** Cotter's End and Kelderby: yards, carts, sheds, pens and gardens round the houses. */
  function hamletExtras(s: Site, base: number, x: number, z: number, roof: PropDesc['mat']) {
    if (x === 486 && z === 252) {
      // The carters' hamlet: a yard round the well, carts everywhere, Garth's wheel shed, a paddock, gardens
      pave(x - 5, z - 4, x + 5, z + 4, base, 'yard');
      for (const [bx, bz] of [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]) block2(bx, bz);
      for (const [cx2, cz2, ry] of [[x + 9, z - 3, 0.3], [x - 7, z + 3, -0.4], [x + 3, z + 11, 1.4], [x + 14, z + 11, 2.0]] as const) s.props.push({ t: 'cart', x: cx2 + 0.5, y: heightAt(cx2, cz2), z: cz2 + 0.5, ry });
      shelter(s, x + 14, z, 6, 5, heightAt(x + 16, z + 2), 'thatch');
      s.props.push({ t: 'desk', x: x + 16.5, y: heightAt(x + 16, z + 2), z: z + 2.5, ry: 0 }, { t: 'crate', x: x + 18.4, y: heightAt(x + 18, z + 3), z: z + 3.2 }, { t: 'barrel', x: x + 15, y: heightAt(x + 15, z + 3), z: z + 3.4 });
      logStack(x + 14, z + 6, 5, 2, true);
      // The paddock, west of the houses, with a trough
      fence(s, x - 32, z - 22, x - 20, z - 22); fence(s, x - 32, z - 10, x - 28, z - 10); fence(s, x - 26, z - 10, x - 20, z - 10);
      fence(s, x - 32, z - 22, x - 32, z - 10); fence(s, x - 20, z - 22, x - 20, z - 10);
      s.props.push({ t: 'barrel', x: x - 23.5, y: heightAt(x - 24, z - 16), z: z - 15.5 }, { t: 'barrel', x: x - 22.7, y: heightAt(x - 23, z - 16), z: z - 15.6 });
      haystack(x - 30, z - 20); haystack(x + 15, z - 9, 2);
      // Kitchen gardens behind the two north houses
      for (const [gx, gz] of [[x + 3, z - 19], [x - 13, z - 17]]) {
        for (let zz = gz + 1; zz < gz + 4; zz++) for (let xx = gx + 1; xx < gx + 8; xx++) { O.set(xx, heightAt(xx, zz) - 1, zz, (zz - gz) % 2 ? B.Farmland : B.Dirt); clearUp(xx, zz, heightAt(xx, zz), heightAt(xx, zz) + 5); }
        fence(s, gx, gz, gx + 8, gz); fence(s, gx, gz, gx, gz + 4); fence(s, gx + 8, gz, gx + 8, gz + 4);
      }
      s.props.push({ t: 'sign', x: x - 6.5, y: heightAt(x - 7, z + 15), z: z + 15.5, ry: 0, text: 'Cotter\'s End' });
      s.props.push({ t: 'lantern', x: x - 4.5, y: heightAt(x - 5, z - 5), z: z - 4.5 }, { t: 'lantern', x: x + 12.5, y: heightAt(x + 12, z + 5), z: z + 5.5, ry: Math.PI });
      rect(s, x - 34, z - 24, x + 22, z + 18);
    } else if (roof === 'slate') {
      // A high hamlet: drystone walls, a sheepfold, a stone byre, peat stacked by the doors, a sledge
      pave(x - 4, z - 3, x + 4, z + 3, base, 'yard');
      for (const [bx, bz] of [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]) block2(bx, bz);
      const fx = x + 16, fz = z - 1;
      drystone(fx - 5, fz - 5, fx + 5, fz - 5); drystone(fx - 5, fz + 5, fx + 5, fz + 5);
      drystone(fx + 5, fz - 5, fx + 5, fz + 5); drystone(fx - 5, fz - 5, fx - 5, fz + 5, [[fx - 5, fz]]);
      haystack(fx + 2, fz - 2, 2);
      house(s, x + 11, z - 16, 6, 5, 1, heightAt(x + 13, z - 14), 'slate', 's', { wall: B.StoneBrick, role: 'store', chimney: false });
      for (const [px, pz] of [[x - 12, z - 4], [x + 3, z - 5]]) for (let y = 0; y < 2; y++) for (let k = 0; k < 2; k++) O.set(px + k, heightAt(px, pz) + y, pz, B.Loam);
      s.props.push({ t: 'cart', x: x + 9.5, y: heightAt(x + 9, z + 3), z: z + 3.5, ry: 0.4 }, { t: 'lantern', x: x - 3.5, y: heightAt(x - 4, z + 4), z: z + 4.5 });
      drystone(x - 20, z + 14, x + 4, z + 14, [[x - 6, z + 14]]);
      rect(s, x - 22, z - 20, x + 24, z + 16);
    }
  }

  /** The Waystation: a stable and paddock, a yard with tables outside the inn, a well, company carts. */
  function waystationExtras(s: Site, base: number) {
    pave(696, 569, 725, 581, base, 'yard');
    shelter(s, 686, 559, 10, 8, base, 'thatch');
    for (const [hx, hz] of [[687, 560], [693, 564]]) haystack(hx, hz, 2);
    s.props.push({ t: 'barrel', x: 690.5, y: base, z: 565.5 }, { t: 'barrel', x: 691.4, y: base, z: 565.8 }, { t: 'cart', x: 689.5, y: base, z: 572.5, ry: 1.2 });
    fence(s, 684, 583, 698, 583); fence(s, 684, 571, 684, 583); fence(s, 698, 576, 698, 583); fence(s, 684, 571, 690, 571);
    // Tables outside the door, for travellers waiting on the Post
    for (const tx of [716, 720]) {
      s.props.push({ t: 'furn', item: 'table', x: tx + 0.5, y: base, z: 578.5, ry: Math.PI / 2 });
      s.props.push({ t: 'bench', x: tx - 0.6, y: base, z: 578.5, ry: Math.PI / 2 }, { t: 'bench', x: tx + 1.6, y: base, z: 578.5, ry: Math.PI / 2 });
      for (const dz of [578, 579]) block2(tx, dz, base);
    }
    s.props.push({ t: 'well', x: 713.5, y: base, z: 565.5 });
    for (const [bx, bz] of [[712, 564], [713, 564], [712, 565], [713, 565]]) block2(bx, bz, base);
    s.props.push({ t: 'cart', x: 730.5, y: base, z: 578, ry: 0.2 }, { t: 'cart', x: 734, y: base, z: 572.5, ry: -0.3 });
    logStack(724, 560, 5, 2, true);
    s.props.push({ t: 'lantern', x: 697.5, y: base, z: 579.5 }, { t: 'lantern', x: 723.5, y: base, z: 580.5, ry: Math.PI });
    rect(s, 682, 556, 738, 586);
  }

  /** Fellers' Camp: a cookhouse lean-to, log stacks, stumps of felled trees, sawhorses and a loaded cart. */
  function fellersExtras(s: Site) {
    const x = 446, z = 520, base = heightAt(x, z);
    shelter(s, x - 9, z + 9, 5, 4, heightAt(x - 7, z + 10), 'thatch', 3);
    s.props.push({ t: 'furn', item: 'table', x: x - 6.5, y: heightAt(x - 7, z + 10), z: z + 10.5, ry: 0 }, { t: 'barrel', x: x - 8.2, y: heightAt(x - 8, z + 11), z: z + 11 }, { t: 'crate', x: x - 4.8, y: heightAt(x - 5, z + 11), z: z + 11.2 });
    for (const [bx, bz] of [[x - 7, z + 10], [x - 6, z + 10]]) block2(bx, bz);
    logStack(x + 10, z - 6, 7, 3, true);
    logStack(x + 12, z + 4, 5, 2, false);
    for (let i = 0; i < 14; i++) {
      const a = hash2(i, x, 183) * Math.PI * 2, r = 14 + hash2(i, z, 184) * 10;
      const px = Math.round(x + Math.cos(a) * r), pz = Math.round(z + Math.sin(a) * r);
      O.set(px, heightAt(px, pz), pz, B.OakLog);
    }
    s.props.push({ t: 'cart', x: x + 4, y: base, z: z - 9, ry: 0.4 }, { t: 'bench', x: x + 8, y: base, z: z + 9, ry: 0.3 }, { t: 'bench', x: x + 9.5, y: base, z: z + 11, ry: 0.3 });
    s.props.push({ t: 'tent', x: x - 15, y: heightAt(x - 15, z - 4), z: z - 4, ry: 1.2, color: '#5a6a3a' }, { t: 'lantern', x: x + 2.5, y: base, z: z - 4.5 });
    rect(s, x - 26, z - 26, x + 26, z + 26);
  }

  /** Wynn Carrow's camp beside the arches: eleven years of it. */
  function mossgateCamp(s: Site, base: number) {
    const x = 190, z = 852;
    pave(x - 3, z - 2, x + 6, z + 5, heightAt(x, z), 'yard');
    s.props.push({ t: 'tent', x: x, y: heightAt(x, z), z: z, ry: 0.2, color: '#6a5a3a' });
    shelter(s, x + 3, z - 2, 4, 4, heightAt(x + 4, z), 'thatch', 3);
    const b2 = heightAt(x + 4, z);
    s.props.push({ t: 'furn', item: 'shelves', x: x + 5, y: b2, z: z - 1.4, ry: 0 }, { t: 'desk', x: x + 4.5, y: b2, z: z + 0.6, ry: 0 }, { t: 'crate', x: x + 6.3, y: b2, z: z + 0.8 });
    block2(x + 4, z, b2); block2(x + 5, z, b2);
    s.props.push({ t: 'firepit', x: x + 1.5, y: heightAt(x + 1, z + 4), z: z + 4.5 }, { t: 'bench', x: x + 4, y: heightAt(x + 4, z + 4), z: z + 4.5, ry: Math.PI / 2 });
    block2(x + 1, z + 4); block2(x + 2, z + 4);
    s.props.push({ t: 'fence', x: x - 2, y: heightAt(x - 2, z + 3), z: z + 3, len: 3, ry: Math.PI / 2 });
    block2(x - 2, z + 2); block2(x - 2, z + 3); block2(x - 2, z + 4);
    rect(s, x - 5, z - 4, x + 9, z + 7);
    void base;
  }

  /** Gullmouth: net racks along the shore, boats drawn up, fish crates, lamps up the street. */
  function gullmouthExtras(s: Site, base: number, coast: number) {
    const z = 600;
    for (const rz of [588, 614]) {
      for (let i = 0; i < 4; i++) {
        const px = Math.floor(coast - 11 + i * 2.5), g = heightAt(px, rz);
        for (let y = 0; y < 2; y++) O.set(px, g + y, rz, B.Timber);
      }
      s.props.push({ t: 'fence', x: coast - 7.25, y: heightAt(Math.floor(coast - 7), rz) + 0.4, z: rz + 0.5, len: 7.5, ry: 0 });
      for (let px = Math.floor(coast - 11); px <= Math.floor(coast - 3.5); px++) block2(px, rz); // nets hung on it: solid
    }
    s.props.push({ t: 'boat', x: coast - 4, y: heightAt(Math.floor(coast - 4), z - 14), z: z - 14, ry: 1.4 }, { t: 'boat', x: coast - 3, y: heightAt(Math.floor(coast - 3), z + 18), z: z + 18, ry: 1.8 });
    for (let i = 0; i < 5; i++) s.props.push({ t: 'crate', x: coast - 13 + (i % 3) * 0.75, y: base + (i > 2 ? 0.6 : 0), z: z - 8 + (i % 2) * 0.5 });
    s.props.push({ t: 'barrel', x: coast - 15, y: base, z: z + 8.5 }, { t: 'barrel', x: coast - 15.9, y: base, z: z + 9 });
    for (let x = coast - 56; x < coast - 14; x += 12) s.props.push({ t: 'lantern', x: Math.floor(x) + 0.5, y: base, z: z - 4.6, ry: 0 });
    void base;
  }

  /**
   * Gullmouth's upper town: the high street carried inland to a market square with its cross and
   * stalls, rows of houses either side and behind, a chapel and bell tower, warehouses on the quay
   * north and south of the jetties, a fish market, and a stone breakwater with a harbour light.
   */
  function gullmouthTown(s: Site, base: number, coast: number) {
    const z = 600, C = Math.floor(coast);
    rect(s, C - 140, z - 36, C - 60, z + 36);
    street(C - 134, z - 4, C - 61, z + 4);
    // The market square and its cross
    pave(C - 104, z - 16, C - 80, z + 16, base, 'cobble');
    for (let y = base; y < base + 5; y++) O.set(C - 92, y, z, y < base + 1 ? B.StoneBrick : y < base + 4 ? B.Cobble : B.StoneBrick);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) O.set(C - 92 + dx, base, z + dz, B.StoneBrick);
    s.props.push({ t: 'glow', x: C - 91.5, y: base + 5.4, z: z + 0.5, r: 2.2 });
    const cols = ['#2f528f', '#a8382c', '#c8a03a', '#3f7a3a'];
    for (let i = 0; i < 3; i++) { s.props.push({ t: 'stall', x: C - 100 + i * 8, y: base, z: z - 11, ry: Math.PI, color: cols[i] }, { t: 'stall', x: C - 100 + i * 8, y: base, z: z + 11, ry: 0, color: cols[(i + 2) % 4] }); }
    s.props.push({ t: 'well', x: C - 84.5, y: base, z: z + 5.5 }, { t: 'notice', x: C - 99.5, y: base, z: z + 5.5, ry: Math.PI / 2 });
    for (const [bx, bz] of [[C - 85, z + 5], [C - 84, z + 5], [C - 85, z + 6], [C - 84, z + 6]]) block2(bx, bz, base);
    // Houses along the high street and a row behind each side
    const roofs: PropDesc['mat'][] = ['blue', 'slate', 'blue', 'red', 'slate'];
    let k = 0;
    const row = (x0: number, x1: number, zz: number, door: 'n' | 's') => {
      for (let x = x0; x + 7 <= x1; x += 9) {
        if (x + 8 > C - 106 && x < C - 78 && Math.abs(zz - z) < 20) continue; // the square
        const h = hash2(x, zz, 85);
        house(s, x, zz, 7 + Math.floor(h * 2), 6, h < 0.5 ? 2 : 1, base, roofs[k++ % roofs.length], door, { wall: h < 0.5 ? B.Plaster : B.Planks, closed: h > 0.45, role: h < 0.15 ? 'shop' : h < 0.25 ? 'inn' : 'home' });
      }
    };
    row(C - 133, C - 63, z - 14, 's'); row(C - 133, C - 63, z + 8, 'n');
    row(C - 120, C - 63, z - 30, 's'); row(C - 120, C - 63, z + 24, 'n');
    for (const lz of [z - 22, z - 21, z + 18, z + 19]) for (let x = C - 134; x <= C - 62; x++) O.set(x, base - 1, lz, hash2(x, lz, 87) < 0.6 ? B.Path : B.Gravel);
    // The chapel, its door on the lane behind the north row, and its bell tower
    stoneHall(s, C - 140, z - 34, 11, 17, 8, base, 'e');
    s.props.push({ t: 'roof', x: C - 134.5, y: base + 8, z: z - 25.5, len: 17, span: 11, rise: roofRise(11), ry: Math.PI / 2, mat: 'slate' });
    tower(s, C - 142, z - 14, 5, 15, base, B.StoneBrick, { trim: B.Cobble });
    s.props.push({ t: 'cone', x: C - 141.5, y: base + 15, z: z - 13.5, r: 3.6, h: 6, mat: 'slate' });
    for (let zz = z - 30; zz < z - 18; zz += 2.5) s.props.push({ t: 'bench', x: C - 134.5, y: base, z: zz, ry: 0 });
    s.props.push({ t: 'furn', item: 'counter', x: C - 134.5, y: base, z: z - 32.2, ry: 0 }, { t: 'furn', item: 'lamp', x: C - 134.5, y: base + 7, z: z - 25.5, ry: 0 });
    // Warehouses on the quay, the fish market, lamps down to the water
    for (const wz of [z - 38, z + 28]) for (const wx of [C - 26, C - 14]) house(s, wx, wz, 10, 8, 2, base, 'slate', wz < z ? 's' : 'n', { wall: B.Planks, closed: true, chimney: false });
    shelter(s, C - 46, z + 22, 14, 8, base, 'blue', 4);
    for (let i = 0; i < 6; i++) s.props.push({ t: i % 2 ? 'barrel' : 'crate', x: C - 44 + i * 2.1, y: base, z: z + 26 });
    for (let x = C - 130; x < C - 62; x += 13) s.props.push({ t: 'lantern', x: x + 0.5, y: base, z: z - 4.6, ry: 0 }, { t: 'lantern', x: x + 6.5, y: base, z: z + 4.6, ry: Math.PI });
    // The breakwater: a stone arm out into the bay, a light at its end
    let last: [number, number] = [C, z - 44];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, bx = Math.round(C + 2 + t * 46), bz = Math.round(z - 46 + t * t * 20);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const x = bx + dx, zz = bz + dz;
        for (let y = Math.min(heightAt(x, zz), SEA) - 1; y <= SEA + 1; y++) O.set(x, y, zz, y === SEA + 1 ? (hash2(x, zz, 89) < 0.3 ? B.MossyCobble : B.Cobble) : B.StoneBrick);
      }
      last = [bx, bz];
    }
    for (let y = SEA + 2; y < SEA + 6; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O.set(last[0] + dx, y, last[1] + dz, y === SEA + 5 ? B.Window : B.StoneBrick);
    s.props.push({ t: 'glow', x: last[0] + 1, y: SEA + 6.6, z: last[1] + 1, r: 5, color: '#ffd890' }, { t: 'smoke', x: last[0] + 1, y: SEA + 7, z: last[1] + 1 });
    s.props.push({ t: 'sign', x: C - 128.5, y: base, z: z + 5.5, ry: 0, text: 'Gullmouth' });
  }

  /**
   * Gullmouth as the Fleet Coast's trading port: a merchant ship at the north jetty (her deck
   * walkable, a plank to it), another at anchor inside the breakwater, the shipyard up the shore with
   * a hull on the slip, the merchants' quarter at the west gate on the Ansbury road, and on the high
   * ground to the south two terraces of houses climbing to the castle on the cliff, the harbour wall
   * running round to it. The ferry to the Mewstones berths at the south jetty (see GameWorld).
   */
  function gullmouthHarbour(s: Site, base: number, coast: number) {
    const C = Math.floor(coast);
    const wall = (x: number, z: number, y0: number, h: number, crenel = true) => {
      for (let y = Math.min(heightAt(x, z), y0) - 1; y < y0 + h; y++) O.set(x, y, z, y === y0 + h - 1 && (x + z) % 7 === 0 ? B.MossyCobble : B.StoneBrick);
      clearUp(x, z, y0 + h, y0 + h + 6);
      if (crenel && (x + z) % 2 === 0) O.set(x, y0 + h, z, B.StoneBrick);
    };
    // Steps up along z from (x0..x1, za, ya) to zb at yb, a rise every so often
    const stairs = (x0: number, x1: number, za: number, zb: number, ya: number, yb: number) => {
      for (let z = za; z <= zb; z++) {
        const y = ya + Math.floor(((z - za) * (yb - ya)) / (zb - za + 1));
        for (let x = x0; x <= x1; x++) { foundation(x, z, y, B.StoneBrick); O.set(x, y - 1, z, B.StoneBrick); clearUp(x, z, y, y + 8); }
      }
      streetHook?.(x0, za, x1, zb, 'street');
    };

    // ---- Ships: a merchantman at the north jetty, her deck on barriers so you can walk it
    const D = SEA + 2; // deck height
    s.props.push({ t: 'ship', x: C + 18, y: D - 2.27, z: 594.5, ry: 0, sails: 'furled', color: '#7a2a1e' });
    for (let x = C + 11; x <= C + 25; x++) for (let z = 593; z <= 596; z++) { O.set(x, SEA, z, B.Barrier); O.set(x, SEA + 1, z, B.Barrier); clearUp(x, z, SEA + 2, SEA + 6); }
    for (const x of [C + 17, C + 18]) O.set(x, SEA + 1, 597, B.Planks); // the gangplank
    s.props.push({ t: 'ship', x: C + 28, y: D - 2.27, z: 581, ry: 0.15, sails: 'furled', color: '#2f528f' }); // at anchor inside the breakwater, clear of the ferry's course

    // ---- The shipyard, up the shore to the north: a slipway into the water and a hull on it
    const yg = Math.round(heightAt(C - 6, 524));
    rect(s, C - 18, 508, C + 26, 542);
    for (let z = 527; z <= 535; z++) for (let x = C - 10; x <= C + 24; x++) {
      const g = Math.max(Math.min(heightAt(x, z), yg), SEA);
      O.set(x, g - 1, z, z === 527 || z === 535 ? B.Timber : B.Planks);
      clearUp(x, z, g, g + 16);
    }
    s.props.push({ t: 'ship', x: C + 6, y: yg + 1.9 - 2.27, z: 531, ry: 0, sails: 'bare', color: '#5a6a3a' });
    for (let x = C - 1; x <= C + 13; x++) for (let z = 529; z <= 533; z++) { O.set(x, yg, z, B.Barrier); O.set(x, yg + 1, z, B.Barrier); }
    // Scaffold either side of her: posts and a plank walk at deck height
    for (const z of [526, 536]) {
      for (let x = C - 2; x <= C + 14; x++) { O.set(x, yg + 1, z, B.Planks); clearUp(x, z, yg + 2, yg + 6); }
      for (let x = C - 2; x <= C + 14; x += 4) { O.set(x, yg, z, B.Timber); }
    }
    shelter(s, C - 18, 512, 12, 8, yg, 'slate', 4);
    logStack(C - 16, 522, 6, 2, true);
    s.props.push({ t: 'crate', x: C - 13.5, y: yg, z: 538 }, { t: 'crate', x: C - 12.7, y: yg, z: 538.4 }, { t: 'barrel', x: C - 9.5, y: yg, z: 539 }, { t: 'desk', x: C - 12, y: yg, z: 514.5, ry: Math.PI });
    s.props.push({ t: 'lantern', x: C - 4.5, y: yg, z: 538.5 }, { t: 'lantern', x: C + 15.5, y: yg, z: 538.5 });
    street(C - 6, 539, C - 2, 560);

    // ---- The merchants' quarter at the west gate, on the road in from Ansbury
    const bm = Math.round(heightAt(1616, 596));
    rect(s, 1584, 556, 1640, 626);
    // The gate: two towers either side of the road, an arch between, a stretch of wall each way
    tower(s, 1592, 581, 5, 10, bm, B.StoneBrick, { crenel: true });
    tower(s, 1592, 601, 5, 10, bm, B.StoneBrick, { crenel: true });
    for (let z = 584; z <= 598; z++) for (let x = 1591; x <= 1593; x++) { O.set(x, bm + 6, z, B.StoneBrick); O.set(x, bm + 7, z, (x + z) % 2 ? B.StoneBrick : B.Air); }
    for (let z = 562; z <= 578; z++) for (const x of [1592, 1593]) wall(x, z, bm, 6);
    for (let z = 604; z <= 620; z++) for (const x of [1592, 1593]) wall(x, z, bm, 6);
    // Counting houses north of the road, their yard paved to it; the Merchants' Hall and a bonded warehouse south of it
    pave(1597, 581, 1638, 587, bm, 'flag');
    const roofs: PropDesc['mat'][] = ['slate', 'blue', 'slate', 'red'];
    [1598, 1608, 1618, 1628].forEach((x, i) => house(s, x, 574, 8, 7, 2, bm, roofs[i], 's', { wall: i % 2 ? B.Plaster : B.StoneBrick, role: i === 1 ? 'office' : 'shop' }));
    stoneHall(s, 1604, 606, 14, 18, 9, bm, 'n');
    s.props.push({ t: 'roof', x: 1611, y: bm + 9, z: 615, len: 18, span: 14, rise: roofRise(14), ry: Math.PI / 2, mat: 'slate' });
    s.props.push({ t: 'sign', x: 1609.5, y: bm, z: 603.6, ry: 0, text: 'Merchants\' Hall' });
    pave(1603, 598, 1637, 605, bm, 'flag'); // the forecourt the hall and the warehouse open onto
    house(s, 1624, 606, 10, 8, 2, bm, 'slate', 'n', { wall: B.Planks, closed: true, chimney: false });
    s.props.push({ t: 'cart', x: 1638.5, y: bm, z: 609.5, ry: 1.4 }, { t: 'crate', x: 1621, y: bm, z: 603 }, { t: 'crate', x: 1621.7, y: bm, z: 603.6 }, { t: 'barrel', x: 1636, y: bm, z: 604 });
    for (const x of [1600, 1615, 1630]) s.props.push({ t: 'lantern', x: x + 0.5, y: bm, z: 588.5, ry: 0 });

    // ---- The terraces: the town's high ground to the south, two levels of houses and stairs between
    const T1 = 26, T2 = 30, TC = 31;
    pave(1676, 652, 1784, 668, T1, 'flag');
    for (let x = 1676; x <= 1784; x++) if (x < 1725 || x > 1729) O.set(x, T1, 652, B.StoneBrick); // a parapet along the edge
    stairs(1726, 1728, 632, 651, Math.round(heightAt(1727, 632)), T1);
    [1678, 1688, 1698, 1732, 1742, 1752, 1762, 1772].forEach((x, i) => house(s, x, 656, 7, 6, 1 + (i % 3 === 0 ? 1 : 0), T1, i % 2 ? 'blue' : 'slate', 'n', { wall: i % 2 ? B.Plaster : B.StoneBrick, closed: i % 3 === 2, role: 'home' }));
    s.props.push({ t: 'well', x: 1715.5, y: T1, z: 656.5 }, { t: 'bench', x: 1720, y: T1, z: 660, ry: 0 });
    for (const [bx, bz] of [[1715, 656], [1716, 656], [1715, 657], [1716, 657]]) block2(bx, bz, T1);
    pave(1676, 672, 1730, 690, T2, 'flag');
    for (let x = 1676; x <= 1730; x++) if (x < 1707 || x > 1709) O.set(x, T2, 672, B.StoneBrick);
    stairs(1707, 1709, 664, 671, T1, T2);
    [1680, 1690, 1714, 1722].forEach((x, i) => house(s, x, 677, 7, 6, 2, T2, i % 2 ? 'red' : 'slate', 'n', { wall: B.StoneBrick, closed: i === 3, role: 'home' }));
    for (const [lx, lz, y] of [[1724, 653, T1], [1731, 653, T1], [1705, 673, T2], [1711, 673, T2]] as const) s.props.push({ t: 'lantern', x: lx + 0.5, y, z: lz + 0.5 });

    // ---- The castle on the cliff, and the road up to its gate
    stairs(1758, 1762, 669, 693, T1, TC);
    pave(1734, 696, 1786, 730, TC, 'flag');
    for (let x = 1732; x <= 1788; x++) for (const z of [694, 695, 731, 732]) if (z > 695 || x < 1757 || x > 1763) wall(x, z, TC, 6);
    for (let z = 696; z <= 730; z++) for (const x of [1732, 1733, 1787, 1788]) wall(x, z, TC, 6);
    for (let x = 1757; x <= 1763; x++) for (const z of [694, 695]) { O.set(x, TC + 5, z, B.StoneBrick); O.set(x, TC + 6, z, (x + z) % 2 ? B.StoneBrick : B.Air); }
    for (const [tx, tz] of [[1733, 695], [1787, 695], [1733, 731], [1787, 731]]) tower(s, tx, tz, 7, 12, TC, B.StoneBrick, { crenel: true });
    tower(s, 1754, 694, 5, 10, TC, B.StoneBrick, { crenel: true });
    tower(s, 1766, 694, 5, 10, TC, B.StoneBrick, { crenel: true });
    stoneHall(s, 1746, 708, 20, 16, 10, TC, 'n');
    s.props.push({ t: 'roof', x: 1756, y: TC + 10, z: 716, len: 20, span: 16, rise: roofRise(16), ry: 0, mat: 'slate' });
    tower(s, 1773, 712, 7, 20, TC, B.StoneBrick, { crenel: true });
    for (const [bx, bz] of [[1760, 694], [1733, 695], [1787, 695], [1773, 712]]) s.props.push({ t: 'banner', x: bx + 0.5, y: TC + (bx === 1773 ? 21 : bx === 1760 ? 8 : 13), z: bz - 1.2, kind: 'aldermere' });
    for (const [lx, lz] of [[1756, 700], [1764, 700], [1756, 726], [1776, 726]]) s.props.push({ t: 'lantern', x: lx + 0.5, y: TC, z: lz + 0.5 });
    rect(s, 1674, 646, 1790, 736);

    // ---- The harbour wall along the cliff from the warehouses to the castle, two towers on it
    for (let z = 640; z <= 693; z++) {
      const x0 = Math.floor(coastX(z)) - 6;
      for (const x of [x0, x0 + 1]) wall(x, z, Math.max(heightAt(x, z), T1 - 2), 4);
    }
    for (const tz of [660, 680]) tower(s, Math.floor(coastX(tz)) - 6, tz, 5, 8, Math.max(heightAt(Math.floor(coastX(tz)) - 6, tz), T1 - 2), B.StoneBrick, { crenel: true });
  }

  /**
   * The Mewstones: a fishing hamlet on the big isle's west shore, looking back at Gullmouth, with a
   * jetty where the ferry ties up, the lookout on the rise behind, and boats drawn up on the shingle.
   */
  function buildMewstones(s: Site, base: number) {
    const { x: cx, z: cz } = MEW;
    rect(s, cx - 20, cz - 22, cx + 44, cz + 20);
    pave(cx - 7, cz - 6, cx + 7, cz + 6, base, 'yard');
    const roofs: PropDesc['mat'][] = ['slate', 'thatch', 'slate', 'blue', 'thatch'];
    ([[-15, -16, 's'], [-3, -17, 's'], [9, -16, 's'], [-13, 10, 'n'], [7, 10, 'n']] as const).forEach(([dx, dz, door], i) =>
      house(s, cx + dx, cz + dz, 7, 6, 1, base, roofs[i], door, { wall: i % 2 ? B.Plaster : B.StoneBrick, role: i === 2 ? 'inn' : i === 4 ? 'shop' : 'home' }));
    s.props.push({ t: 'well', x: cx + 0.5, y: base, z: cz + 0.5 }, { t: 'bench', x: cx - 4, y: base, z: cz + 3, ry: Math.PI / 2 });
    for (const [bx, bz] of [[cx, cz], [cx + 1, cz], [cx, cz + 1], [cx + 1, cz + 1]]) block2(bx, bz, base);
    // The jetty: from the shore below the green straight out west
    const J = mewJetty();
    for (let x = J.x1; x <= J.x0; x++) for (let w = 0; w < 3; w++) {
      const z = J.z + w;
      O.set(x, SEA, z, B.Planks);
      clearUp(x, z, SEA + 1, SEA + 6);
      if ((x - J.x1) % 6 === 0 && (w === 0 || w === 2)) for (let y = 2; y < SEA; y++) O.set(x, y, z, B.Timber);
    }
    street(J.x0, J.z, cx - 7, J.z + 2);
    s.props.push({ t: 'lantern', x: J.x1 + 0.5, y: SEA + 1, z: J.z + 1.5 });
    s.props.push({ t: 'boat', x: J.x0 - 2, y: SEA - 0.55, z: J.z - 4, ry: 1.2 }, { t: 'boat', x: J.x0 - 1, y: SEA - 0.55, z: J.z + 7, ry: 1.9 });
    for (let i = 0; i < 4; i++) s.props.push({ t: i % 2 ? 'barrel' : 'crate', x: cx - 6 + i * 1.1, y: base, z: cz - 8 });
    s.props.push({ t: 'lantern', x: cx - 6.5, y: base, z: cz + 6.5 }, { t: 'lantern', x: cx + 7.5, y: base, z: cz - 6.5 });
    // The lookout on the rise behind the hamlet, a fire kept in its top
    const lx = cx + 36, lz = cz, lg = heightAt(lx, lz);
    tower(s, lx, lz, 5, 10, lg, B.StoneBrick, { crenel: true });
    s.props.push({ t: 'glow', x: lx + 0.5, y: lg + 11, z: lz + 0.5, r: 4, color: '#ffc070' }, { t: 'smoke', x: lx + 0.5, y: lg + 11.5, z: lz + 0.5 });
    street(cx + 7, cz - 1, lx - 3, cz + 1);
  }

  /**
   * Harrowgate's Company Row, outside the west gate: two rows of the company's cottages on the
   * road, the meeting hall at the end, the smelter with its stack, and the slag heap.
   */
  function companyRow(s: Site, base: number) {
    rect(s, 916, 978, 972, 1036);
    street(932, 996, 969, 1004);
    for (let x = 934; x + 6 <= 968; x += 8) {
      house(s, x, 986, 6, 6, 1, base, 'slate', 's', { wall: B.Planks, closed: hash2(x, 986, 91) > 0.3, role: 'home', chimney: true });
      house(s, x, 1008, 6, 6, 1, base, 'slate', 'n', { wall: B.Planks, closed: hash2(x, 1008, 93) > 0.3, role: 'home', chimney: true });
    }
    house(s, 918, 992, 11, 15, 1, base, 'red', 'e', { wall: B.StoneBrick, role: 'inn' }); // the meeting hall and canteen
    // The smelter: a shed, its stack smoking, the slag heap and an ore cart
    house(s, 944, 1022, 12, 8, 1, base, 'slate', 'n', { wall: B.Cobble, closed: true, chimney: false });
    for (let y = base; y < base + 15; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O.set(940 + dx, y, 1024 + dz, y > base + 12 ? B.StoneBrick : B.Cobble);
    s.props.push({ t: 'smoke', x: 941, y: base + 15.5, z: 1025 }, { t: 'glow', x: 950, y: base + 1, z: 1021, r: 2.2, color: '#ff9a50' });
    oreHeap(928, 1026, B.Basalt); oreHeap(932, 1030, B.Gravel);
    s.props.push({ t: 'cart', x: 936, y: base, z: 1020, ry: 0.6 }, { t: 'rails', x: 948.5, y: base, z: 1017.5, len: 14, ry: Math.PI / 2 });
    for (let x = 936; x < 968; x += 11) s.props.push({ t: 'lantern', x: x + 0.5, y: base, z: 995.4, ry: 0 });
    s.props.push({ t: 'sign', x: 966.5, y: base, z: 993.5, ry: 0, text: 'Company Row' });
  }

  /** Harrowgate Works: a bunkhouse, watchtowers on the palisade, ore stockpiles, rails, a lintel over the gate. */
  function harrowgateExtras(s: Site, base: number) {
    const cx = 1000, cz = 1000;
    house(s, cx - 24, cz + 8, 14, 8, 2, base, 'slate', 'n', { wall: B.Planks, role: 'inn' });
    for (const [tx, tz] of [[cx - 30, cz - 24], [cx + 30, cz - 24], [cx - 30, cz + 24], [cx + 30, cz + 24]]) {
      for (const [px, pz] of [[tx - 1, tz - 1], [tx + 1, tz - 1], [tx - 1, tz + 1], [tx + 1, tz + 1]]) for (let y = heightAt(px, pz) - 1; y < base + 7; y++) O.set(px, y, pz, B.OakLog);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) O.set(tx + dx, base + 7, tz + dz, B.Planks);
      s.props.push({ t: 'roof', x: tx + 0.5, y: base + 9.5, z: tz + 0.5, len: 4, span: 4, rise: 1.6, ry: 0, mat: 'red' });
      for (const [px, pz] of [[tx - 1, tz - 1], [tx + 1, tz - 1], [tx - 1, tz + 1], [tx + 1, tz + 1]]) for (let y = base + 8; y < base + 10; y++) O.set(px, y, pz, B.Timber);
    }
    for (let x = cx - 5; x <= cx + 5; x++) { O.set(x, base + 5, cz + 24, B.OakLog); if (x % 2 === 0) O.set(x, base + 6, cz + 24, B.OakLog); }
    oreHeap(cx + 20, cz + 16, B.CopperOre); oreHeap(cx + 25, cz + 18, B.IronOre);
    s.props.push({ t: 'rails', x: cx + 8.5, y: base, z: cz + 8.5, len: 12, ry: Math.PI / 2 });
    s.props.push({ t: 'cart', x: cx + 18, y: base, z: cz + 12, ry: 0.9 }, { t: 'crate', x: cx - 7, y: base, z: cz + 18 }, { t: 'crate', x: cx - 6.2, y: base, z: cz + 18.4 }, { t: 'barrel', x: cx - 5, y: base, z: cz + 19 });
    for (const [lx, lz] of [[cx - 15, cz + 2], [cx + 5, cz - 3], [cx + 20, cz + 4], [cx - 3, cz + 20]]) s.props.push({ t: 'lantern', x: lx + 0.5, y: base, z: lz + 0.5 });
  }

  /** Fleet Light: the keeper's cottage, the oil store, and a wall along the cliff. */
  function lighthouseExtras(s: Site, base: number) {
    const cx = s.x, cz = s.z;
    house(s, Math.floor(cx - 15), Math.floor(cz - 3), 7, 6, 1, base, 'red', 'e', { wall: B.Plaster });
    house(s, Math.floor(cx - 6), Math.floor(cz + 6), 5, 4, 1, base, 'slate', 'n', { wall: B.StoneBrick, role: 'store', chimney: false });
    drystone(Math.floor(cx - 17), Math.floor(cz - 8), Math.floor(cx + 2), Math.floor(cz - 8));
    s.props.push({ t: 'barrel', x: cx - 0.5, y: base, z: cz + 5.4 }, { t: 'barrel', x: cx + 0.4, y: base, z: cz + 5.6 });
    rect(s, cx - 18, cz - 9, cx + 6, cz + 11);
  }

  /** Gallows Knap above ground: tower stubs at the corners, a ruined gatehouse, paving, fallen masonry. */
  function fortExtras(s: Site, base: number) {
    const cx = 1250, cz = 1250;
    const stair = (x: number, z: number) => Math.abs(x - cx) <= 3 && z >= cz + 2 && z <= cz + 20; // the builders' stair
    for (const [tx, tz] of [[cx - 14, cz - 14], [cx + 14, cz - 14], [cx - 14, cz + 14], [cx + 14, cz + 14]]) {
      const top = base + 6 + Math.floor(hash2(tx, tz, 185) * 6);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > 2.6) continue;
        const h = d > 1.4 ? top - Math.floor(hash2(tx + dx, tz + dz, 186) * 4) : base;
        for (let y = heightAt(tx + dx, tz + dz) - 1; y < h; y++) O.set(tx + dx, y, tz + dz, y % 4 === 0 ? B.TerraBrown : weathered(tx + dx, y, tz + dz, 187, 0.05));
      }
    }
    for (const gx of [cx - 5, cx + 5]) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (let y = base - 1; y < base + 8 - Math.abs(dx); y++) O.set(gx + dx, y, cz + 15 + dz, weathered(gx + dx, y, cz + 15, 188, 0.05));
    for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) {
      const x = cx + dx, z = cz + dz;
      if (stair(x, z) || Math.max(Math.abs(dx), Math.abs(dz)) <= 4 || hash2(x, z, 189) > 0.4) continue;
      O.set(x, base - 1, z, hash2(x, z, 190) < 0.5 ? B.StoneBrick : B.TerraCream);
    }
    for (let i = 0; i < 10; i++) {
      const x = cx - 18 + Math.floor(hash2(i, 5, 191) * 36), z = cz - 18 + Math.floor(hash2(i, 6, 191) * 36);
      if (!stair(x, z) && Math.max(Math.abs(x - cx), Math.abs(z - cz)) > 4) rubble(x, z, 192 + i, B.StoneBrick);
    }
    rect(s, cx - 20, cz - 20, cx + 20, cz + 22);
  }

  /** The Glass Kirk: lintels on the standing columns, steps, braziers, pilgrims' benches. */
  function templeExtras(s: Site, base: number) {
    const cx = 1190, cz = 1800;
    for (const z of [cz - 8, cz + 8]) for (let x = cx - 14; x < cx + 14; x += 4) {
      const whole = (xx: number) => hash2(xx, z, 111) >= 0.3;
      const ly = Math.min(base + 9, SY - 1); // the world's ceiling is y 95, and this floor is high
      if (whole(x) && whole(x + 4)) for (let k = 0; k <= 4; k++) O.set(x + k, ly, z, k === 0 || k === 4 ? B.Basalt : B.StoneBrick);
    }
    // Dressed retaining walls where the hillside stands above the floor, coped with basalt; open on
    // the west where the Post road comes down, and on the east towards Harrowgate's camp.
    const retain = (x: number, z: number) => {
      const g = heightAt(x, z);
      if (g <= base) return;
      for (let y = base; y < g; y++) O.set(x, y, z, y === g - 1 ? B.Basalt : (y + x + z) % 7 === 0 ? B.Cobble : B.StoneBrick);
    };
    for (let x = cx - 17; x <= cx + 17; x++) for (const z of [cz - 11, cz + 11]) retain(x, z);
    // The hillside round the floor, dressed in stone: terraces where pilgrims stand to watch
    for (let z = cz - 24; z <= cz + 24; z++) for (let x = cx - 30; x <= cx + 30; x++) {
      if (Math.abs(x - cx) <= 17 && Math.abs(z - cz) <= 11) continue;
      if (x > cx + 17 && Math.abs(z - cz) <= 12) continue; // Harrowgate's camp keeps its ground
      const g = heightAt(x, z);
      if (g <= base || g > base + 8) continue;
      O.set(x, g - 1, z, (g - base) % 2 === 0 ? B.StoneBrick : B.Cobble);
    }
    for (let z = cz - 11; z <= cz + 11; z++) { if (z < cz + 1 || z > cz + 6) retain(cx - 17, z); if (z < cz - 2 || z > cz + 2) retain(cx + 17, z); }
    for (const [bx, bz] of [[cx - 15, cz - 9], [cx - 15, cz + 9], [cx + 15, cz - 9], [cx + 15, cz + 9]]) {
      O.set(bx, base, bz, B.Cobble); O.set(bx, base + 1, bz, B.StoneBrick);
      s.props.push({ t: 'firepit', x: bx + 0.5, y: base + 2, z: bz + 0.5 });
    }
    for (const z of [cz - 4, cz + 4]) s.props.push({ t: 'bench', x: cx - 10, y: base, z: z + 0.5, ry: 0 }, { t: 'bench', x: cx - 6.5, y: base, z: z + 0.5, ry: 0 });
    s.props.push({ t: 'glow', x: cx - 15 + 0.5, y: base + 3, z: cz + 0.5, r: 3 }, { t: 'glow', x: cx + 15.5, y: base + 3, z: cz + 0.5, r: 3 });
  }

  /** Scarth Watch inside: floors every six blocks, a stair up each storey, the count kept on the ground floor. */
  function observatoryInterior(s: Site, cx: number, cz: number, base: number, H: number) {
    const lo = cx - 3, hi = cx + 3, zlo = cz - 3, zhi = cz + 3; // the 7x7 inside of the 9-wide shell
    for (let z = zlo; z <= zhi; z++) for (let x = lo; x <= hi; x++) O.set(x, base - 1, z, (x + z) % 2 ? B.Planks : B.DarkPlanks);
    const storeys = Math.floor(H / 6);
    for (let f = 0; f < storeys; f++) {
      const y0 = base + f * 6;
      // Stairs: six steps along one wall, alternating walls each storey
      const north = f % 2 === 0;
      for (let k = 0; k < 6; k++) {
        const x = north ? lo + k : hi - k, z = north ? zlo : zhi;
        for (let y = y0; y <= y0 + k; y++) O.set(x, y, z, B.DarkPlanks);
      }
      {
        // The floor above (the roof deck over the top storey), open over the stair
        for (let z = zlo; z <= zhi; z++) for (let x = lo; x <= hi; x++) {
          const hole = (north ? z === zlo : z === zhi) && (north ? x >= lo + 2 && x <= lo + 4 : x <= hi - 2 && x >= hi - 4); // headroom over the upper steps
          O.set(x, y0 + 5, z, hole ? B.Air : f === storeys - 1 ? ((x + z) % 2 ? B.StoneBrick : B.Basalt) : B.Planks);
        }
      }
      s.props.push({ t: 'furn', item: 'lamp', x: cx + 0.5, y: y0 + 5, z: cz + 0.5, ry: 0 }, { t: 'glow', x: cx + 0.5, y: y0 + 4, z: cz + 0.5, r: 1.6 });
    }
    s.props.push({ t: 'furn', item: 'desk', x: cx + 0.5, y: base, z: cz + 1.5, ry: Math.PI }, { t: 'furn', item: 'shelves', x: hi + 0.3, y: base, z: cz + 0.5, ry: -Math.PI / 2 }, { t: 'furn', item: 'chest', x: lo + 0.7, y: base, z: cz + 1.5, ry: Math.PI / 2 });
    s.props.push({ t: 'furn', item: 'bed', x: lo + 1, y: base + 6, z: cz + 1.5, ry: Math.PI / 2 }, { t: 'furn', item: 'shelves', x: hi + 0.3, y: base + 6, z: cz - 1.5, ry: -Math.PI / 2 });
    for (const [bx, bz] of [[cx, cz + 1], [cx + 1, cz + 1]]) block2(bx, bz, base);
  }

  // ---------------------------------------------------------------- Small POIs
  /** Weathered stone: mostly dressed, some mossy, some rough, chosen per block. */
  function weathered(x: number, y: number, z: number, seed: number, mossy = 0.3): number {
    const h = hash2(x * 7 + y, z, seed);
    return h < mossy ? B.MossyStone : h < mossy + 0.15 ? B.MossyCobble : h < 0.85 ? B.StoneBrick : B.Cobble;
  }
  /** A low heap of fallen stone, a couple of blocks across. */
  function rubble(x: number, z: number, seed: number, mat?: number) {
    const n = 2 + Math.floor(hash2(x, z, seed) * 4);
    for (let i = 0; i < n; i++) {
      const px = x + Math.floor((hash2(i, x, seed + 1) - 0.5) * 3), pz = z + Math.floor((hash2(i, z, seed + 2) - 0.5) * 3);
      const g = heightAt(px, pz);
      O.set(px, g, pz, mat ?? weathered(px, g, pz, seed, 0.5));
      if (i === 0 && hash2(px, pz, seed + 3) < 0.5) O.set(px, g + 1, pz, B.MossyCobble);
    }
  }

  /** A ring of standing stones with lintels on some pairs, an altar slab, a fallen stone and a cairn. */
  function buildStones(s: Site, x: number, z: number, base: number) {
    const n = 9, R = 7;
    const tops: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash2(x, z, 130) * 0.6;
      const px = Math.round(x + Math.cos(a) * R), pz = Math.round(z + Math.sin(a) * R);
      const fallen = hash2(px, pz, 132) < 0.12;
      const hgt = fallen ? 1 : 4 + Math.floor(hash2(px, pz, 131) * 2);
      tops.push(fallen ? -1 : hgt);
      // Each upright is two blocks wide along the ring
      const tx = Math.round(-Math.sin(a)), tz = Math.round(Math.cos(a));
      for (const k of [0, 1]) for (let y = heightAt(px + tx * k, pz + tz * k) - 1; y < base + hgt; y++) O.set(px + tx * k, y, pz + tz * k, weathered(px + k, y, pz, 133, 0.35));
      if (fallen) for (let k = 2; k < 5; k++) O.set(px + Math.round(Math.cos(a)) * k, heightAt(px, pz), pz + Math.round(Math.sin(a)) * k, B.MossyStone);
    }
    // Lintels over neighbouring uprights of equal height: the trilithons
    for (let i = 0; i < n; i += 3) {
      const j = (i + 1) % n;
      if (tops[i] < 3 || tops[j] < 3) continue;
      const a0 = (i / n) * Math.PI * 2 + hash2(x, z, 130) * 0.6, a1 = (j / n) * Math.PI * 2 + hash2(x, z, 130) * 0.6;
      const y = base + Math.min(tops[i], tops[j]);
      for (let t = 0; t <= 6; t++) {
        const a = a0 + ((a1 - a0) * t) / 6;
        O.set(Math.round(x + Math.cos(a) * R), y, Math.round(z + Math.sin(a) * R), B.Stone);
      }
    }
    // The altar: a long slab on two blocks, with offerings
    for (const dx of [-1, 0, 1]) { O.set(x + dx, base, z, dx === 0 ? B.Air : B.StoneBrick); O.set(x + dx, base + 1, z, B.Stone); }
    s.props.push({ t: 'glow', x: x + 0.5, y: base + 2.2, z: z + 0.5, r: 1.6 }, { t: 'crate', x: x + 0.3, y: base + 2, z: z + 0.5, ry: 0.4 });
    // Worn ground inside the ring, and a cairn outside it
    for (let dz = -R + 1; dz < R; dz++) for (let dx = -R + 1; dx < R; dx++) {
      if (Math.hypot(dx, dz) > R - 1.5 || hash2(x + dx, z + dz, 134) > 0.35) continue;
      O.set(x + dx, heightAt(x + dx, z + dz) - 1, z + dz, hash2(dx, dz, 135) < 0.5 ? B.Path : B.Gravel);
    }
    const cx = x + R + 4, cz = z - 2;
    for (let y = 0; y < 3; y++) for (let dz = -1 + y; dz <= 1 - y; dz++) for (let dx = -1 + y; dx <= 1 - y; dx++) O.set(cx + dx, heightAt(cx, cz) + y, cz + dz, y === 2 ? B.MossyStone : B.Cobble);
    rect(s, x - R - 6, z - R - 3, x + R + 6, z + R + 3);
    s.impostor.push({ x: x + 0.5, y: base + 2, z: z + 0.5, w: R * 2, h: 4, d: R * 2, color: '#8a8f86' });
  }

  /** A wayside shrine on a stepped platform: four columns under a slate roof, the lamp in the middle. */
  function buildShrine(s: Site, x: number, z: number, base: number) {
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const r = Math.max(Math.abs(dx), Math.abs(dz));
      foundation(x + dx, z + dz, base, B.Cobble);
      clearUp(x + dx, z + dz, base, base + 9);
      if (r === 4) O.set(x + dx, base - 1, z + dz, hash2(dx, dz, 140) < 0.3 ? B.MossyCobble : B.Cobble);       // the court, at ground level
      else if (r === 3) O.set(x + dx, base, z + dz, B.StoneBrick);                                                 // first step
      else { O.set(x + dx, base, z + dz, B.StoneBrick); O.set(x + dx, base + 1, z + dz, (dx + dz) % 2 === 0 ? B.StoneBrick : B.Cobble); } // the floor
    }
    // Columns with a cap and a base, at the corners of the floor
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      O.set(x + dx, base + 2, z + dz, B.Cobble);
      for (let y = base + 3; y < base + 6; y++) O.set(x + dx, y, z + dz, B.StoneBrick);
      O.set(x + dx, base + 6, z + dz, B.Cobble);
    }
    // Beams between the column caps, carrying the roof
    for (let k = -2; k <= 2; k++) for (const [ax, az] of [[k, -2], [k, 2], [-2, k], [2, k]]) O.set(x + ax, base + 6, z + az, B.DarkPlanks);
    s.props.push({ t: 'roof', x: x + 0.5, y: base + 7, z: z + 0.5, len: 6, span: 6, rise: 2.6, ry: 0, mat: 'slate' });
    s.props.push({ t: 'lantern', x: x + 0.5, y: base + 2, z: z + 0.5 });
    // A low wall round the court, open to the south, with a carved waymarker beside the gap
    for (let k = -4; k <= 4; k++) for (const [ax, az] of [[k, -5], [-5, k], [5, k], [k, 5]]) {
      if (az === 5 && Math.abs(ax) <= 1) continue;
      const g = heightAt(x + ax, z + az);
      O.set(x + ax, g, z + az, hash2(ax, az, 141) < 0.4 ? B.MossyCobble : B.Cobble);
    }
    for (let y = 0; y < 3; y++) O.set(x + 2, heightAt(x + 2, z + 6) + y, z + 6, y === 2 ? B.MossyStone : B.StoneBrick);
    s.props.push({ t: 'bench', x: x - 3.5, y: base, z: z + 0.5, ry: Math.PI / 2 }, { t: 'bench', x: x + 4.5, y: base, z: z + 0.5, ry: Math.PI / 2 });
    s.props.push({ t: 'glow', x: x - 1.2, y: base + 2.3, z: z - 1.5, r: 1 }, { t: 'glow', x: x + 2.2, y: base + 2.3, z: z - 1.5, r: 1 });
    rect(s, x - 6, z - 6, x + 6, z + 7);
    s.impostor.push({ x: x + 0.5, y: base + 4, z: z + 0.5, w: 6, h: 8, d: 6, color: '#7a7f88' });
  }

  /**
   * A round ruined watchtower: a broken shell with a doorway on the south, a floor's worth of beams
   * still in place, ivy on the north face, fallen stone and a stub of its outer wall.
   */
  function buildRuinTower(s: Site, x: number, z: number, base: number) {
    const R = 3.6;
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > R + 0.4) continue;
      const px = x + dx, pz = z + dz;
      foundation(px, pz, base, B.StoneBrick);
      O.set(px, base - 1, pz, d < R - 0.9 ? (hash2(dx, dz, 144) < 0.5 ? B.Gravel : B.Cobble) : B.StoneBrick);
      if (d < R - 0.9) { clearUp(px, pz, base, base + 16); continue; }
      // Wall height falls away on one side, as if the top had come down that way
      const fall = Math.max(0, Math.cos(Math.atan2(dz, dx) - 0.8)) * 7;
      const top = base + 14 - Math.floor(fall + hash2(px, pz, 145) * 3);
      for (let y = base; y < top; y++) {
        const door = dz >= R - 1.2 && Math.abs(dx) <= 0 && y < base + 3;
        const slit = (y - base) % 5 === 3 && Math.abs(dx) === 0 && Math.abs(dz) > 2;
        O.set(px, y, pz, door ? B.Air : slit && dz < 0 ? B.Air : weathered(px, y, pz, 146, 0.25));
      }
      clearUp(px, pz, top, base + 18);
      if (dz < -1 && hash2(px, pz, 147) < 0.6) for (let y = base + 2; y < top - 1; y++) if (hash2(px, y, 148) < 0.5) O.set(px, y, pz - 1, B.OakLeaves); // ivy
    }
    // Beams of the first floor, some missing
    for (let dx = -2; dx <= 2; dx++) for (const dz of [-1, 1]) if (hash2(x + dx, z + dz, 149) < 0.7) O.set(x + dx, base + 5, z + dz, B.DarkPlanks);
    for (let dx = -1; dx <= 1; dx += 2) for (let dz = -2; dz <= 2; dz++) if (hash2(x + dx, z + dz, 150) < 0.5) O.set(x + dx, base + 5, z + dz, B.Planks);
    // Lintel over the doorway
    O.set(x, base + 3, z + 3, B.Cobble); O.set(x - 1, base + 3, z + 3, B.Cobble); O.set(x + 1, base + 3, z + 3, B.Cobble);
    // Fallen stone round the foot, and a stub of the outer wall
    for (let i = 0; i < 7; i++) {
      const a = hash2(i, x, 151) * Math.PI * 2, r = 5 + hash2(i, z, 152) * 4;
      rubble(Math.round(x + Math.cos(a) * r), Math.round(z + Math.sin(a) * r), 153 + i);
    }
    for (let k = -6; k <= 4; k++) {
      const wx = x + k, wz = z - 8, g = heightAt(wx, wz);
      const h = Math.floor(hash2(wx, wz, 154) * 3) + (k < -2 ? 1 : 0);
      for (let y = g - 1; y < g + h; y++) O.set(wx, y, wz, weathered(wx, y, wz, 155, 0.4));
    }
    rect(s, x - 9, z - 9, x + 9, z + 9);
    s.impostor.push({ x: x + 0.5, y: base + 6, z: z + 0.5, w: 7, h: 12, d: 7, color: '#8a8a88' });
  }

  /**
   * A ruined building complex: an enclosing wall with a gateway, rooms inside with doorways, a row of
   * broken columns, patches of the old floor, and fallen stone. `mat` sets the local stone.
   */
  function buildRuinWalls(s: Site, x: number, z: number, base: number, mat: number) {
    const mossy = mat === B.MossyCobble;
    const wallAt = (wx: number, wz: number, h: number) => {
      const g = heightAt(wx, wz);
      for (let y = g - 1; y < base + h; y++) {
        const r = hash2(wx * 3 + y, wz, 156);
        O.set(wx, y, wz, r < 0.35 ? B.StoneBrick : r < 0.5 ? (mossy ? B.MossyStone : B.TerraCream) : mat);
      }
    };
    const heightAlong = (wx: number, wz: number, maxH: number) => Math.floor(hash2(wx, wz, 151) * maxH * 0.6 + (hash2(Math.floor(wx / 4), Math.floor(wz / 4), 157) * maxH * 0.6));
    // Enclosure, 17 across, gateway in the south side
    for (let i = -8; i <= 8; i++) for (const [ax, az] of [[i, -8], [i, 8], [-8, i], [8, i]]) {
      if (az === 8 && Math.abs(ax) <= 1) continue;
      wallAt(x + ax, z + az, heightAlong(x + ax, z + az, 6));
    }
    for (const gx of [-2, 2]) for (let y = heightAt(x + gx, z + 8) - 1; y < base + 6; y++) O.set(x + gx, y, z + 8, B.StoneBrick); // gate piers
    for (let gx = -2; gx <= 2; gx++) O.set(x + gx, base + 6, z + 8, B.Stone);
    // Inner rooms: a cross wall with doorways, and a corner room
    for (let i = -7; i <= 7; i++) if (Math.abs(i) > 1) wallAt(x + i, z - 1, heightAlong(x + i, z - 1, 5));
    for (let i = -7; i <= -2; i++) if (i !== -4) wallAt(x + 2, z + i, heightAlong(x + 2, z + i, 4));
    // Old floor, lifted in places
    for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
      if (hash2(x + dx, z + dz, 158) < 0.55) O.set(x + dx, heightAt(x + dx, z + dz) - 1, z + dz, (dx + dz) % 2 === 0 ? B.StoneBrick : mossy ? B.MossyCobble : B.TerraCream);
    }
    // Columns down the south court, some whole, some broken
    for (const cxo of [-5, -2, 2, 5]) {
      const h = hash2(x + cxo, z, 159) < 0.4 ? 1 + Math.floor(hash2(cxo, z, 160) * 2) : 5;
      for (let y = base; y < base + h; y++) O.set(x + cxo, y, z + 4, y === base ? B.Cobble : B.StoneBrick);
      if (h === 5) O.set(x + cxo, base + 5, z + 4, B.Cobble);
    }
    for (let i = 0; i < 8; i++) rubble(x + Math.floor((hash2(i, x, 161) - 0.5) * 22), z + Math.floor((hash2(i, z, 162) - 0.5) * 22), 163 + i);
    if (mossy) for (let i = 0; i < 6; i++) O.set(x - 6 + Math.floor(hash2(i, 1, 164) * 12), base, z - 6 + Math.floor(hash2(i, 2, 164) * 12), B.Glowcap);
    rect(s, x - 10, z - 10, x + 10, z + 10);
  }

  /** A star-fall crater: a basalt rim, crystal spires at the heart, shards and crystal-shot boulders. */
  function buildCrystals(s: Site, x: number, z: number, base: number) {
    const R = 7;
    for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > R + 1) continue;
      const px = x + dx, pz = z + dz, g = heightAt(px, pz);
      if (d > R - 0.5) { O.set(px, g, pz, hash2(px, pz, 165) < 0.6 ? B.Basalt : B.Stone); continue; } // the rim
      const dip = Math.round((1 - d / R) * 2.2);
      for (let y = g - dip; y < g; y++) O.set(px, y, pz, B.Air);
      O.set(px, g - dip - 1, pz, hash2(px, pz, 166) < 0.25 ? B.Crystal : B.Basalt);
    }
    // The heart: spires leaning out from the middle
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + hash2(x, z, 167), lean = k === 0 ? 0 : 0.35;
      const hgt = k === 0 ? 8 : 3 + Math.floor(hash2(k, x, 168) * 4);
      const ox = k === 0 ? 0 : Math.round(Math.cos(a) * 2), oz = k === 0 ? 0 : Math.round(Math.sin(a) * 2);
      const floor = heightAt(x, z) - 3;
      for (let y = 0; y < hgt; y++) {
        const px = x + ox + Math.round(Math.cos(a) * lean * y), pz = z + oz + Math.round(Math.sin(a) * lean * y);
        O.set(px, floor + y, pz, B.Crystal);
        if (y < hgt / 2 && k === 0) for (const [ddx, ddz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) O.set(px + ddx, floor + y, pz + ddz, B.Crystal);
      }
    }
    // Shards and boulders around the crater
    for (let k = 0; k < 9; k++) {
      const a = hash2(k, z, 169) * Math.PI * 2, r = R + 2 + hash2(k, x, 170) * 5;
      const px = Math.round(x + Math.cos(a) * r), pz = Math.round(z + Math.sin(a) * r), g = heightAt(px, pz);
      if (k % 3 === 0) { for (let y = 0; y < 2; y++) for (const [ddx, ddz] of [[0, 0], [1, 0], [0, 1]]) O.set(px + ddx, g + y, pz + ddz, y === 1 && ddx + ddz === 0 ? B.Crystal : B.Basalt); }
      else for (let y = 0; y < 1 + (k % 3); y++) O.set(px, g + y, pz, B.Crystal);
    }
    s.props.push({ t: 'glow', x: x + 0.5, y: base + 2, z: z + 0.5, r: 8, color: '#7fe0f4' }, { t: 'glow', x: x + 0.5, y: base + 5, z: z + 0.5, r: 4, color: '#bff4ff' });
    rect(s, x - R - 7, z - R - 7, x + R + 7, z + R + 7);
    s.impostor.push({ x: x + 0.5, y: base + 3, z: z + 0.5, w: 4, h: 7, d: 4, color: '#7fe0f4' });
  }

  /** A farmstead: the house, a barn, fenced fields in rows, haystacks, a well, a cart and a trough. */
  function buildFarm(s: Site, x: number, z: number, base: number) {
    house(s, x - 12, z - 10, 7, 6, 1, heightAt(x - 9, z - 7), 'thatch', 's');
    house(s, x + 3, z - 12, 10, 7, 1, heightAt(x + 8, z - 9), 'red', 's', { wall: B.Planks, role: 'store', chimney: false });
    pave(x - 6, z - 4, x + 6, z + 3, heightAt(x, z), 'yard');
    // (everything in the yard stands on the yard's own level)
    s.props.push({ t: 'well', x: x + 0.5, y: base, z: z + 0.5 }, { t: 'cart', x: x + 4.5, y: base, z: z + 1.5, ry: 0.6 });
    for (const [bx, bz] of [[x, z], [x - 1, z], [x, z - 1], [x - 1, z - 1]]) { O.set(bx, base, bz, B.Barrier); O.set(bx, base + 1, bz, B.Barrier); }
    // Haystacks by the barn
    for (const [hx, hz, h] of [[x + 14, z - 7, 3], [x + 14, z - 4, 2], [x + 16, z - 6, 2]]) for (let y = 0; y < h; y++) for (const [ddx, ddz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (y < h - 1 || ddx + ddz === 0) O.set(hx + ddx, heightAt(hx, hz) + y, hz + ddz, B.Hay);
    // Fields: furrowed rows, a ditch every fifth row, fenced with a gate on the yard side
    const field = (fx0: number, fz0: number, fx1: number, fz1: number) => {
      for (let fz = fz0 + 1; fz < fz1; fz++) for (let fx = fx0 + 1; fx < fx1; fx++) {
        const g = heightAt(fx, fz);
        clearUp(fx, fz, g, g + 6);
        O.set(fx, g - 1, fz, (fz - fz0) % 5 === 0 ? B.Path : B.Farmland);
      }
      const gx = Math.round((fx0 + fx1) / 2);
      fence(s, fx0, fz0, gx - 1, fz0); fence(s, gx + 1, fz0, fx1, fz0);
      fence(s, fx0, fz1, fx1, fz1); fence(s, fx0, fz0, fx0, fz1); fence(s, fx1, fz0, fx1, fz1);
      rect(s, fx0, fz0, fx1, fz1);
    };
    field(x - 18, z + 6, x - 2, z + 16);
    field(x - 18, z + 18, x + 8, z + 33);
    // A trough and a lamp in the yard
    s.props.push({ t: 'barrel', x: x - 5.5, y: base, z: z + 2.5 }, { t: 'crate', x: x - 4.6, y: base, z: z + 2.8 }, { t: 'lantern', x: x - 3.5, y: base, z: z - 2.5 });
    rect(s, x - 20, z - 14, x + 18, z + 35);
  }

  /** A stable outside a town: the block to one side of a yard, a paddock to the other, a sign by the road. */
  function buildStable(s: Site, st: StableDef) {
    const W = (u: number, v: number) => stableAt(st, u, v);
    const box = (u0: number, v0: number, u1: number, v1: number): [number, number, number, number] => {
      const [ax, az] = W(u0, v0), [bx, bz] = W(u1, v1);
      return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
    };
    const far = st.id === 'st-cragsby' || st.id === 'st-holme' || st.id === 'st-scarrow';
    // The block: eleven across and six deep, its doors to the road
    const [hx0, hz0, hx1, hz1] = box(-12, -8, -2, -3);
    house(s, hx0, hz0, hx1 - hx0 + 1, hz1 - hz0 + 1, 1, Math.floor(heightAt((hx0 + hx1) / 2, (hz0 + hz1) / 2)), far ? 'slate' : 'thatch', st.face, { wall: B.Planks, role: 'store', chimney: false });
    // The yard in front of it
    const [yx0, yz0, yx1, yz1] = box(-12, -2, 0, 4);
    pave(yx0, yz0, yx1, yz1, Math.floor(heightAt(st.x, st.z)), 'yard');
    // The paddock, with a gap for a gate on the road side
    const corner = (u: number, v: number) => W(u, v);
    const line = (a: [number, number], b: [number, number]) => fence(s, a[0], a[1], b[0], b[1]);
    line(corner(1, -9), corner(12, -9));
    line(corner(12, -9), corner(12, 2));
    line(corner(1, -9), corner(1, 2));
    line(corner(1, 2), corner(5, 2));
    line(corner(8, 2), corner(12, 2));
    // Hay by the block, a trough in the paddock, a lantern and the sign by the road
    for (const [u, v, h] of [[-13, -2, 2], [-13, 0, 1]] as const) {
      const [x, z] = W(u, v);
      for (let y = 0; y < h; y++) O.set(x, heightAt(x, z) + y, z, B.Hay);
    }
    const at = (u: number, v: number) => { const [x, z] = W(u, v); return { x: x + 0.5, y: heightAt(x, z), z: z + 0.5 }; };
    s.props.push({ t: 'barrel', ...at(3, 0) }, { t: 'barrel', ...at(4, 0) });
    s.props.push({ t: 'lantern', ...at(-12, 3) });
    s.props.push({ t: 'sign', ...at(1, 4), ry: stableYaw(st), text: st.name });
    const [rx0, rz0, rx1, rz1] = box(-13, -10, 13, 4);
    rect(s, rx0, rz0, rx1, rz1);
  }

  /** A lodging house: a stone front door to a corridor, five rooms off it, windows in every room, a slate roof. */
  function buildLodging(s: Site, L: LodgingDef) {
    const base = lodgeBase(L);
    const W = (u: number, v: number) => lodgeAt(L, u, v);
    const set = (u: number, v: number, y: number, id: number) => { const [x, z] = W(u, v); O.set(x, y, z, id); };
    const doors = new Set(ROOMS.map((r) => r.door.join(',')));
    for (let v = -LODGE_V; v <= LODGE_V; v++) for (let u = -LODGE_U; u <= LODGE_U; u++) {
      const [x, z] = W(u, v);
      foundation(x, z, base, B.StoneBrick);
      const edge = Math.abs(u) === LODGE_U || Math.abs(v) === LODGE_V;
      const room = ROOMS.find((r) => u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1);
      O.set(x, base - 1, z, room ? B.Planks : B.StoneBrick);
      // Walls: the outside, the corridor's two sides, the rooms' partitions and the entrance passage's sides
      const inner = (v === 1 || v === -2) || ((u === -2 || u === 2) && v >= 1) || ((u === -4 || u === 4) && v <= -2);
      const wall = edge || inner;
      const doorway = doors.has(`${u},${v}`) || (u === 0 && v === LODGE_V) || (Math.abs(u) <= 1 && v === 1);
      for (let y = base; y < base + LODGE_H; y++) {
        let id: number = B.Air;
        if (wall && !(doorway && y < base + 2)) {
          // Windows in the outside walls of each room, a block up
          const win = edge && room === undefined && ROOMS.some((r) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1) && (y === base + 1 || y === base + 2) && ((Math.abs(v) === LODGE_V && Math.abs(u) % 3 === 1) || (Math.abs(u) === LODGE_U && Math.abs(v) === 4));
          id = win ? B.Window : y === base ? B.StoneBrick : edge ? B.Plaster : B.Planks;
        }
        O.set(x, y, z, id);
      }
      O.set(x, base + LODGE_H, z, B.Air);
    }
    // The roof, long side to the street
    const [ax, az] = W(-LODGE_U, -LODGE_V), [bx, bz] = W(LODGE_U, LODGE_V);
    const x0 = Math.min(ax, bx), z0 = Math.min(az, bz), w = Math.abs(bx - ax) + 1, d = Math.abs(bz - az) + 1;
    const alongX = L.face === 'n' || L.face === 's';
    s.props.push({ t: 'roof', x: x0 + w / 2, y: base + LODGE_H, z: z0 + d / 2, len: alongX ? w : d, span: alongX ? d : w, rise: roofRise(alongX ? d : w), ry: alongX ? 0 : Math.PI / 2, mat: 'slate' });
    // Lamps along the corridor and either side of the front door, the sign by the street, a chest in each room
    const yawOut = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[L.face];
    const at = (u: number, v: number, y: number) => { const [x, z] = W(u, v); return { x: x + 0.5, y, z: z + 0.5 }; };
    for (const u of [-9, -3, 3, 9]) s.props.push({ t: 'glow', ...at(u, -0.5, base + 3) });
    for (const u of [-2, 2]) { const [x, z] = W(u, LODGE_V + 1); s.props.push({ t: 'lantern', x: x + 0.5, y: heightAt(x, z), z: z + 0.5 }); }
    { const [x, z] = W(4, LODGE_V + 2); s.props.push({ t: 'sign', x: x + 0.5, y: heightAt(x, z), z: z + 0.5, ry: yawOut, text: 'Rooms to let' }); }
    for (const r of ROOMS) s.props.push({ t: 'furn', item: 'chest', ...at(r.chest[0], r.chest[1], base), ry: yawOut });
    // A path from the street to the door
    for (let v = LODGE_V + 1; v <= LODGE_V + 3; v++) for (let u = -1; u <= 1; u++) { const [x, z] = W(u, v); O.set(x, Math.floor(heightAt(x, z)) - 1, z, B.Path); }
    void set;
    rect(s, x0 - 1, z0 - 1, x0 + w, z0 + d);
  }

  /** A travellers' or workers' camp: tents round a fire with log seats, bedrolls, a lean-to and stores. */
  // ---------------------------------------------------------------- Inkholm (data/inkholm.ts; LORE.md "Inkholm")
  /**
   * Gillsby Staithe: a stone quay out over the shingle to deep water, a lane of cottages up from it,
   * the reek-house at the top where the island's burners kept their bundles, and beyond it a fence
   * and a rope across the lane with the Grey on the far side.
   */
  function buildGillsby(s: Site, base: number) {
    const cx = GILLSBY.x, cz = GILLSBY.z;
    rect(s, cx - 50, cz - 26, cx + 30, cz + 26);
    pave(cx - 28, cz - 1, cx + 22, cz + 1, base, 'yard');
    const homes: [number, number, number, number, 'n' | 's', PropDesc['mat'], number, Role][] = [
      [-20, -10, 7, 6, 's', 'slate', B.StoneBrick, 'home'], [-10, -11, 8, 7, 's', 'thatch', B.Plaster, 'home'], [1, -10, 7, 6, 's', 'slate', B.Plaster, 'home'], [11, -11, 7, 7, 's', 'slate', B.StoneBrick, 'home'],
      [-19, 5, 8, 6, 'n', 'thatch', B.Plaster, 'home'], [-7, 5, 7, 6, 'n', 'slate', B.StoneBrick, 'inn'], [4, 5, 10, 7, 'n', 'slate', B.StoneBrick, 'workshop'],
    ];
    for (const [dx, dz, w, d, door, roof, wall, role] of homes) house(s, cx + dx, cz + dz, w, d, 1, base, roof, door, { wall, role });
    // The reek-house's chimney still smokes: Bryony Kitto keeps a bundle burning on the hearth
    s.props.push({ t: 'smoke', x: cx + 9.5, y: base + 7.5, z: cz + 9.5 });
    for (let i = 0; i < 4; i++) s.props.push({ t: 'crate', x: cx + 15.5 + (i % 2) * 0.9, y: base + (i > 1 ? 0.6 : 0), z: cz + 4.2 + (i % 2) * 0.3, ry: i * 0.4 });
    // The quay: a stone pier out over the shingle, steps down to the boats at its end
    const Q0 = cx - 28, Q1 = cx - 46;
    for (let x = Q1; x <= Q0; x++) for (let z = cz - 2; z <= cz + 2; z++) {
      const g = heightAt(x, z);
      for (let y = Math.min(g, base) - 2; y < base - 1; y++) O.set(x, y, z, hash2(x * 3 + y, z, 841) < 0.3 ? B.MossyCobble : B.StoneBrick);
      O.set(x, base - 1, z, (x + z) % 3 === 0 ? B.Cobble : B.StoneBrick);
      clearUp(x, z, base, base + 8);
      if ((z === cz - 2 || z === cz + 2) && (x - Q1) % 5 === 2) O.set(x, base, z, B.Timber); // bollards
    }
    for (let k = 1; k <= 3; k++) for (let z = cz - 1; z <= cz + 1; z++) {
      const x = Q1 - k;
      for (let y = Math.min(heightAt(x, z), base) - 2; y < base - 1 - k; y++) O.set(x, y, z, B.StoneBrick);
      clearUp(x, z, base - 1 - k, base + 8);
    }
    s.props.push({ t: 'boat', x: Q1 - 3, y: SEA - 0.55, z: cz + 5.5, ry: 0.2 }, { t: 'boat', x: Q1 + 5, y: SEA - 0.55, z: cz - 5.5, ry: -0.15 });
    s.props.push({ t: 'lantern', x: Q1 + 1.5, y: base, z: cz - 1.5 }, { t: 'lantern', x: Q0 - 1.5, y: base, z: cz + 1.5 });
    s.props.push({ t: 'barrel', x: Q0 - 4.5, y: base, z: cz - 1.4 }, { t: 'crate', x: Q0 - 7.5, y: base, z: cz - 1.3, ry: 0.3 }, { t: 'crate', x: Q0 - 7.6, y: base + 0.6, z: cz - 1.3, ry: 0.9 });
    s.props.push({ t: 'notice', x: cx - 3.5, y: base, z: cz - 3, ry: 0 }, { t: 'well', x: cx - 1.5, y: base, z: cz + 3.5 });
    rect(s, cx - 3, cz + 2, cx, cz + 5);
    for (const [x, z] of [[cx - 15.5, cz - 2.5], [cx + 0.5, cz + 2.5], [cx + 17.5, cz - 2.5]]) s.props.push({ t: 'lantern', x, y: base, z });
    // The line: a fence across the top of the village, a rope across the lane, and a board
    fence(s, cx + 24, cz - 22, cx + 24, cz - 3);
    fence(s, cx + 24, cz + 3, cx + 24, cz + 22);
    s.props.push({ t: 'rope', x: cx + 24.5, y: base + 1.15, z: cz - 2.4, ry: -Math.PI / 2, len: 5.8, h: 0, r: 0.25 });
    s.props.push({ t: 'sign', x: cx + 22.5, y: base, z: cz + 4.5, ry: Math.PI / 2, text: 'The Grey. Stop.' });
  }

  /**
   * Black Hythe: Harrowgate & Daughters' ink works on the east shore. Drying sheds for the caps, the
   * vat house and its chimney, the manager's office, open tubs of ink in the yard and the yard black
   * round them, the jetty the ink goes out from, and over a boarded shaft the headframe of the Deep
   * Gill, which went down further than anyone on the Holm wanted it to.
   */
  function buildBlackHythe(s: Site, base: number) {
    const cx = HYTHE.x, cz = HYTHE.z;
    rect(s, cx - 28, cz - 26, cx + 42, cz + 26);
    pave(cx - 22, cz - 20, cx + 20, cz + 20, base, 'yard');
    for (let z = cz - 4; z <= cz + 10; z++) for (let x = cx - 7; x <= cx + 6; x++) if (hash2(x, z, 811) < 0.4 + 0.3 * (1 - Math.hypot(x - cx, z - cz - 3) / 9)) O.set(x, base - 1, z, B.Basalt);
    house(s, cx - 20, cz - 18, 16, 9, 1, base, 'slate', 's', { wall: B.DarkPlanks, role: 'store', front: 'boarded' });
    house(s, cx - 20, cz + 9, 13, 9, 1, base, 'slate', 'n', { wall: B.DarkPlanks, role: 'workshop', front: 'boarded' });
    house(s, cx + 3, cz - 18, 9, 7, 2, base, 'slate', 's', { wall: B.StoneBrick, role: 'office', front: 'quoined' });
    for (let y = base; y < base + 16; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O.set(cx + 6 + dx, y, cz + 12 + dz, y >= base + 15 ? B.Cobble : B.StoneBrick);
    s.props.push({ t: 'smoke', x: cx + 7, y: base + 16.5, z: cz + 13 });
    for (let i = 0; i < 6; i++) s.props.push({ t: 'barrel', x: cx - 3.5 + (i % 3) * 2.3, y: base, z: cz + 1.5 + Math.floor(i / 3) * 2.6, ry: i });
    for (let k = 0; k < 3; k++) fence(s, cx + 9, cz - 8 + k * 3, cx + 15, cz - 8 + k * 3);
    // The Deep Gill shaft, boarded over under its headframe
    const sx = cx + 13, sz = cz + 13;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (let y = base - 10; y < base - 1; y++) O.set(sx + dx, y, sz + dz, B.Air);
      O.set(sx + dx, base - 1, sz + dz, (dx + dz) % 2 ? B.Planks : B.DarkPlanks);
    }
    s.props.push({ t: 'headframe', x: sx + 0.5, y: base, z: sz + 0.5, ry: 0, text: 'HARROWGATE & DAUGHTERS\nThe Deep Gill' });
    // The jetty, out east to deep water: plank deck on timber legs
    for (let x = cx + 21; x <= cx + 40; x++) for (let z = cz - 1; z <= cz + 1; z++) {
      const g = heightAt(x, z);
      if (z !== cz && (x - cx) % 4 === 0) for (let y = Math.min(g, base) - 2; y < base - 1; y++) O.set(x, y, z, B.Timber);
      O.set(x, base - 1, z, B.Planks);
      clearUp(x, z, base, base + 8);
    }
    s.props.push({ t: 'boat', x: cx + 37, y: SEA - 0.55, z: cz + 4.5, ry: 1.3 });
    s.props.push({ t: 'sign', x: cx - 4.5, y: base, z: cz + 21.5, ry: 0, text: 'Black Hythe' });
    s.props.push({ t: 'banner', x: cx + 4.5, y: base + 6, z: cz - 10.6, ry: 0, kind: 'harrow' }, { t: 'banner', x: cx + 10.5, y: base + 6, z: cz - 10.6, ry: 0, kind: 'harrow' });
    for (const [x, z] of [[cx - 10.5, cz - 7.5], [cx + 16.5, cz + 6.5], [cx + 20.5, cz - 1.5]]) s.props.push({ t: 'lantern', x, y: base, z });
  }

  /**
   * Corra Priory on the top of Corra Fell: the roofless nave of the brothers' church, an arcade down
   * one side, Abbot Wystan's tomb in the chancel with its slab cracked and pushed aside, and under it
   * the crypt stair: three flights down to the Undercroft, where the brothers' cells, their ink
   * cistern and, deepest, the Old Bed are (data/inkholm.ts). The Grey grows from the Old Bed.
   */
  function buildPriory(s: Site, base: number) {
    const cx = PRIORY.x, cz = PRIORY.z;
    rect(s, cx - 18, cz - 16, cx + 18, cz + 18);
    for (let z = cz - 9; z <= cz + 9; z++) for (let x = cx - 5; x <= cx + 5; x++) {
      const wall = x === cx - 5 || x === cx + 5 || z === cz - 9 || z === cz + 9;
      O.set(x, base - 1, z, hash2(x, z, 821) < 0.35 ? B.MossyCobble : hash2(x, z, 822) < 0.55 ? B.Cobble : B.Grass);
      clearUp(x, z, base, base + 14);
      if (!wall) continue;
      const gable = z === cz - 9 ? Math.max(0, 4 - Math.abs(x - cx)) : 0;
      const top = base + 7 + gable - Math.floor(Math.max(0, (x - cx) * 0.5 + (z - cz) * 0.25 + hash2(x, z, 823) * 4));
      for (let y = base; y < top; y++) {
        const door = z === cz + 9 && Math.abs(x - cx) <= 1 && y < base + 4;
        const tall = z === cz - 9 && Math.abs(x - cx) <= 1 && y >= base + 3 && y < base + 9;
        const win = (x === cx - 5 || x === cx + 5) && (z - cz) % 4 === 0 && y >= base + 2 && y < base + 5;
        if (!door && !tall && !win) O.set(x, y, z, weathered(x, y, z, 824, 0.35));
      }
    }
    // The arcade down the west side of the nave, some of it fallen
    for (const z of [-6, -2, 2, 6]) { const h = 3 + Math.floor(hash2(cx, cz + z, 825) * 3); for (let y = base; y < base + h; y++) O.set(cx - 3, y, cz + z, B.StoneBrick); }
    // Abbot Wystan's tomb, its slab cracked and pushed aside off the stair
    for (const [x, z] of [[cx - 1, cz - 8], [cx, cz - 8], [cx + 1, cz - 8], [cx - 2, cz - 7], [cx - 3, cz - 7]]) O.set(x, base, z, B.StoneBrick);
    // The crypt stair: three flights and two landings, walled in dressed stone
    const opened: [number, number][] = [];
    const cut = (x: number, z: number, floor: number, wallSides: [number, number][]) => {
      O.set(x, floor - 1, z, B.StoneBrick);
      for (let y = floor; y < Math.min(base, floor + 4); y++) O.set(x, y, z, B.Air);
      if (floor + 4 < base) O.set(x, floor + 4, z, B.StoneBrick);
      for (const [wx, wz] of wallSides) for (let y = floor - 1; y < Math.min(base, floor + 5); y++) O.set(wx, y, wz, weathered(wx, y, wz, 826, 0.25));
    };
    let depth = 0;
    const flight = (x0: number, z0: number, dir: 1 | -1, n: number) => {
      for (let k = 0; k < n; k++, depth++) for (let dx = 0; dx < 3; dx++) {
        const x = cx + x0 + dx, z = cz + z0 + dir * k, f = base - 1 - depth;
        cut(x, z, f, dx === 0 ? [[x - 1, z]] : dx === 2 ? [[x + 1, z]] : []);
      }
    };
    const landing = (x0: number, z0: number, x1: number, z1: number) => {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cut(cx + x, cz + z, base - 1 - depth, []);
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) if (x < x0 || x > x1 || z < z0 || z > z1) {
        const k = (cx + x) * 4096 + cz + z;
        if (!stairCells.has(k)) for (let y = base - 2 - depth; y < base + 3 - depth; y++) O.set(cx + x, y, cz + z, weathered(cx + x, y, cz + z, 826, 0.25));
      }
    };
    const stairCells = new Set<number>();
    const mark = (x0: number, z0: number, x1: number, z1: number) => { for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = x0; x <= x1; x++) stairCells.add((cx + x) * 4096 + cz + z); };
    mark(-1, -6, 1, 5); mark(-1, 6, 5, 8); mark(3, 5, 5, -5); mark(3, -8, 9, -6); mark(7, -5, 9, 6);
    flight(-1, -6, 1, 12);
    landing(-1, 6, 5, 8);
    flight(3, 5, -1, 11);
    landing(3, -8, 9, -6);
    flight(7, -5, 1, 12);
    const F = base - 1 - depth + 1;
    void opened;
    // Graves on the fell top east of the church, and fallen stone round it
    for (let i = 0; i < 7; i++) { const x = cx + 9 + (i % 4) * 2, z = cz - 5 + Math.floor(i / 4) * 4 + (i % 2); O.set(x, base, z, i % 3 ? B.StoneBrick : B.MossyStone); }
    for (let i = 0; i < 6; i++) { const a = hash2(i, cx, 827) * Math.PI * 2, r = 11 + hash2(i, cz, 828) * 4; rubble(Math.round(cx + Math.cos(a) * r), Math.round(cz + Math.sin(a) * r), 829 + i); }
    s.props.push({ t: 'glow', x: cx + 0.5, y: base + 1, z: cz - 5.5, r: 2.4, color: '#9ff0d8' });
    buildPrioryUndercroft(s, cx, cz, F === UNDER_F ? F : UNDER_F);
  }

  /** The Undercroft (see buildPriory): its halls dug at UNDER_F under the fell top. */
  function buildPrioryUndercroft(s: Site, cx: number, cz: number, F: number) {
    const CRYPT: DigTheme = { wall: B.StoneBrick, wall2: B.MossyStone, floor: B.Cobble, floor2: B.MossyCobble, light: '#9ff0d8' };
    const BED: DigTheme = { wall: B.Loam, wall2: B.Mycelium, floor: B.Mycelium, floor2: B.Loam, light: '#7affd0' };
    const { hall, run, finish, opened } = digger(s, cx, cz, F, CRYPT);
    for (let x = 7; x <= 9; x++) for (let z = 3; z <= 6; z++) opened(cx + x, cz + z);
    const mob = (x: number, z: number, t: string): [number, number, number, string] => [cx + x + 0.5, F, cz + z + 0.5, t];
    const furn = (item: string, x: number, z: number, ry = 0) => s.props.push({ t: 'furn', item, x: cx + x + 0.5, y: F, z: cz + z + 0.5, ry });
    // The brothers' cells
    run(8, 7, 8, 10);
    hall(2, 11, 16, 22, 5, true);
    for (const [x, z] of [[4, 21], [9, 21], [14, 21]]) furn('bed', x, z, Math.PI);
    furn('candles', 9, 12); furn('desk', 4, 12); furn('shelves', 14, 12);
    // The ink cistern: the brothers' own ink, in a pool still black
    run(1, 16, -6, 16);
    hall(-16, 10, -7, 26, 7);
    for (let z = 14; z <= 22; z++) for (let x = -14; x <= -9; x++) { O.set(cx + x, F - 1, cz + z, B.Water); O.set(cx + x, F - 2, cz + z, B.Water); O.set(cx + x, F - 3, cz + z, B.Basalt); }
    // The Old Bed: a cavern where the Grey grows out of the rock, under stems that reach the roof
    run(-12, 9, -12, 4);
    hall(-34, -22, -6, 3, 10, false, BED);
    for (const [x, z] of [[-29, -17], [-12, -18], [-29, 0], [-11, -1]]) {
      for (let y = F; y < F + 9; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O.set(cx + x + dx, y, cz + z + dz, B.MushStem);
      for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 4; dz++) { const d = Math.hypot(dx - 0.5, dz - 0.5); if (d < 3.6) O.set(cx + x + dx, F + 9, cz + z + dz, d < 2.4 ? B.Gills : B.CapGlow); }
    }
    for (let i = 0; i < 40; i++) {
      const x = -34 + Math.floor(hash2(i, 1, 851) * 29), z = -22 + Math.floor(hash2(i, 2, 851) * 26);
      const side = hash2(i, 3, 851);
      const X = side < 0.25 ? cx - 35 : side < 0.5 ? cx - 5 : cx + x, Z = side < 0.25 || side < 0.5 ? cz + z : side < 0.75 ? cz - 23 : cz + 4;
      O.set(X, F + 1 + Math.floor(hash2(i, 4, 851) * 6), Z, hash2(i, 5, 851) < 0.5 ? B.CapGlow : B.Glowcap);
    }
    // The bed itself: a mound of gill and cap and grey flesh, glowing where it's newest
    const bx = OLD_BED.x - cx, bz = OLD_BED.z - cz;
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const d = Math.hypot(dx, dz), h = Math.max(0, Math.round(3.2 - d * 0.75 + hash2(dx, dz, 852)));
      for (let y = 0; y < h; y++) O.set(cx + bx + dx, F + y, cz + bz + dz, y === h - 1 ? (hash2(dx, dz + y, 853) < 0.3 ? B.CapGlow : hash2(dx, dz, 854) < 0.5 ? B.Gills : B.CapInk) : B.Mycelium);
    }
    s.props.push({ t: 'glow', x: OLD_BED.x + 0.5, y: F + 4, z: OLD_BED.z + 0.5, r: 3.4, color: '#7affd0' });
    finish();
    const spawns = [mob(7, 14, 'greybrother'), mob(13, 15, 'greybrother'), mob(9, 19, 'greybrother'), mob(-12, 12, 'puffball'), mob(-10, 24, 'puffball'), mob(-15, 19, 'greyed'), mob(-26, -14, 'greybrother'), mob(-26, 0, 'greybrother'), mob(-9, -16, 'puffball')];
    const chest: [number, number, number] = [cx - 31.5, F, cz - 5.5];
    s.props.push({ t: 'furn', item: 'chest', x: chest[0], y: F, z: chest[2], ry: Math.PI / 2 });
    s.act = { kind: 'delve', spawns, boss: mob(-14, -6, 'greyabbot'), chest };
  }

  /** A reek-fire: a ring of standing stones on swept ground round a hearth heaped with reek. */
  function buildReek(s: Site, base: number, r: { x: number; z: number }) {
    const cx = r.x, cz = r.z;
    rect(s, cx - 9, cz - 9, cx + 9, cz + 9);
    for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 7.2) continue;
      foundation(cx + dx, cz + dz, base, B.Dirt);
      O.set(cx + dx, base - 1, cz + dz, d < 2.2 ? B.Cobble : hash2(cx + dx, cz + dz, 832) < 0.5 ? B.Gravel : B.Loam);
      clearUp(cx + dx, cz + dz, base, base + 14);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, x = Math.round(cx + Math.cos(a) * 4.8), z = Math.round(cz + Math.sin(a) * 4.8);
      for (let y = base; y < base + 2 + (hash2(x, z, 831) < 0.5 ? 1 : 0); y++) O.set(x, y, z, B.MossyStone);
    }
    s.props.push({ t: 'reekhearth', x: cx + 0.5, y: base, z: cz + 0.5, ry: hash2(cx, cz, 833) * 6 });
    O.set(cx, base, cz, B.Barrier);
  }

  /**
   * A bandit fort (data/forts.ts): a log palisade with its gate toward the nearest road and a
   * watchtower either side inside it, tents and a fire in the yard, carts of what they've taken, and
   * the chief's hall at the back: open at the front, the gang's tally over its back wall, their
   * chest under it. Built in a frame of its own: u along the gate wall, v from the back to the gate.
   */
  function buildBanditFort(s: Site, base: number, f: Fort) {
    const cx = f.x, cz = f.z, H = 15;
    let way: [number, number] = [0, 1], bd = 1e9;
    for (const road of WORLD_ROADS) for (const [rx, rz] of road) { const d = Math.hypot(rx - cx, rz - cz); if (d < bd) { bd = d; way = [rx - cx, rz - cz]; } }
    const gz = Math.abs(way[1]) >= Math.abs(way[0]);
    const gs = (gz ? Math.sign(way[1]) : Math.sign(way[0])) || 1;
    const at = (u: number, v: number): [number, number] => (gz ? [cx + u, cz + v * gs] : [cx + v * gs, cz + u]);
    /** A prop's place and its facing (out of the gate when turn is 0). */
    const put = (u: number, v: number): { x: number; z: number } => { const [x, z] = at(u, v); return { x: x + 0.5, z: z + 0.5 }; };
    const out = gz ? (gs > 0 ? 0 : Math.PI) : (gs > 0 ? Math.PI / 2 : -Math.PI / 2);
    const logs = f.region === 'tolmen' || f.region === 'gannet' ? B.PineLog : B.OakLog;
    // The yard, trodden and cleared
    for (let u = -H + 1; u <= H - 1; u++) for (let v = -H + 1; v <= H - 1; v++) {
      const [x, z] = at(u, v);
      foundation(x, z, base);
      const h = hash2(x, z, 303);
      O.set(x, base - 1, z, h < 0.55 ? B.Path : h < 0.8 ? B.Dirt : B.Gravel);
      clearUp(x, z, base, base + 12);
    }
    // The palisade: logs four and five high, the gate three wide under a lintel between tall posts
    for (let u = -H; u <= H; u++) for (let v = -H; v <= H; v++) {
      if (Math.abs(u) !== H && Math.abs(v) !== H) continue;
      const [x, z] = at(u, v);
      foundation(x, z, base, logs);
      const gate = v === H && Math.abs(u) <= 1, post = v === H && Math.abs(u) === 2;
      const top = post ? base + 7 : gate ? base + 5 : base + 4 + (hash2(x, z, 301) < 0.5 ? 1 : 0);
      for (let y = base; y < top; y++) O.set(x, y, z, gate ? (y < base + 4 ? B.Air : B.Timber) : post ? B.Timber : logs);
      clearUp(x, z, top, top + 8);
    }
    // The tally over the gate, on both posts, facing the road
    for (const u of [-2, 2]) { const q = put(u, H + 0.6); s.props.push({ t: 'banner', x: q.x, y: base + 6.4, z: q.z, ry: out, kind: 'tally' }); }
    // Watchtowers inside the gate corners: four posts, a floor, a thatch over
    for (const su of [-1, 1]) {
      const tu = su * (H - 3), tv = H - 3;
      for (const du of [-1, 1]) for (const dv of [-1, 1]) { const [x, z] = at(tu + du, tv + dv); for (let y = base; y < base + 8; y++) O.set(x, y, z, B.Timber); }
      for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) { const [x, z] = at(tu + du, tv + dv); O.set(x, base + 5, z, B.Planks); }
      const q = put(tu, tv);
      s.props.push({ t: 'roof', x: q.x, y: base + 8, z: q.z, len: 3.8, span: 3.8, rise: 1.3, ry: out, mat: 'thatch' });
    }
    // The chief's hall: back and sides of plank on a timber frame, the front open on posts
    const HW = 6, V0 = -H + 1, V1 = -H + 7;
    for (let u = -HW; u <= HW; u++) for (let v = V0; v <= V1; v++) {
      const [x, z] = at(u, v);
      O.set(x, base - 1, z, B.Planks);
      const back = v === V0, side = Math.abs(u) === HW, front = v === V1;
      if (!back && !side && !(front && Math.abs(u) === 3)) continue;
      const corner = (back || front) && (side || Math.abs(u) === 3);
      for (let y = base; y < base + 4; y++) O.set(x, y, z, corner || front ? B.Timber : y === base ? B.Cobble : B.DarkPlanks);
    }
    const hall = put(0, (V0 + V1) / 2 - 0.5);
    s.props.push({ t: 'roof', x: hall.x, y: base + 4, z: hall.z, len: HW * 2 + 2.4, span: V1 - V0 + 2.4, rise: 2.6, ry: gz ? 0 : Math.PI / 2, mat: 'thatch' });
    { const q = put(0, V0 + 0.7); s.props.push({ t: 'banner', x: q.x, y: base + 3.6, z: q.z, ry: out, kind: 'tally' }); }
    const furn = (item: string, u: number, v: number, turn = 0) => { const q = put(u, v); s.props.push({ t: 'furn', item, x: q.x, y: base, z: q.z, ry: out + turn }); };
    furn('table', -3.5, V0 + 3); furn('bench', -3.5, V0 + 4, 0); furn('bench', -3.5, V0 + 2, Math.PI);
    furn('chair', 0, V0 + 1.6); furn('barrel', HW - 1, V0 + 1); furn('barrel', HW - 1, V0 + 2); furn('crate', -HW + 1, V0 + 1); furn('rug', 0, V0 + 4);
    const chest = put(2, V0 + 1);
    s.props.push({ t: 'furn', item: 'chest', x: chest.x, y: base, z: chest.z, ry: out });
    // The yard: a fire with log seats, tents along the sides, the carts they've taken, lamps
    const fire = put(0, 3);
    s.props.push({ t: 'firepit', x: fire.x, y: base, z: fire.z });
    for (const [du, dv] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const [x, z] = at(du, 3 + dv - 1); O.set(x, base, z, B.Barrier); O.set(x, base + 1, z, B.Barrier); }
    for (const [u, v] of [[-3, 2], [-3, 3], [3, 2], [3, 3]]) { const [x, z] = at(u, v); O.set(x, base, z, logs); }
    const tents: [number, number][] = [[-10, -2], [10, -2], [-10, 5], [10, 5]];
    const colors = ['#6a5a3a', '#5a4a3a', '#7a6a4a', '#4a4a3a'];
    tents.forEach(([u, v], i) => { const q = put(u, v); s.props.push({ t: 'tent', x: q.x, y: base, z: q.z, ry: out + (u < 0 ? Math.PI / 2 : -Math.PI / 2), color: colors[i] }); });
    for (const [u, v, turn] of [[-6, 9, 0.6], [7, 10, -0.4]] as const) {
      const q = put(u, v);
      s.props.push({ t: 'cart', x: q.x, y: base, z: q.z, ry: out + turn });
      s.props.push({ t: 'crate', x: q.x + 1.6, y: base, z: q.z + 0.4 }, { t: 'barrel', x: q.x - 1.5, y: base, z: q.z - 0.6 });
    }
    for (const [u, v] of [[-4, H - 1], [4, H - 1], [-HW - 1, V1 + 1], [HW + 1, V1 + 1]]) { const q = put(u, v); s.props.push({ t: 'lantern', x: q.x, y: base, z: q.z }); }
    rect(s, cx - H - 3, cz - H - 3, cx + H + 3, cz + H + 3);
    // A trodden track out of the gate, kept clear of trees
    for (let v = H + 1; v <= H + 14; v++) for (let u = -2; u <= 2; u++) {
      const [x, z] = at(u, v), g = heightAt(x, z);
      if (Math.abs(u) <= 1 && hash2(x, z, 305) < 0.75) O.set(x, g - 1, z, B.Path);
      clearUp(x, z, g, g + 10);
    }
    { const [ax, az] = at(-3, H + 1), [bx, bz] = at(3, H + 14); rect(s, Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)); }
    // Who holds it: the gang round the yard, two seconds by the hall, the chief in it, the chest behind
    const g = f.gang, at3 = (u: number, v: number, t: string): [number, number, number, string] => { const q = put(u, v); return [q.x, base, q.z, t]; };
    const spawns = [at3(-1, H - 2, g), at3(1, H - 2, g), at3(-3, 5, g), at3(3, 5, g), at3(0, 7, g), at3(-2, 0, g), at3(-8, 1, g), at3(8, 1, g), at3(-6, -5, g), at3(6, -5, g)];
    const guards = [at3(-2, V1 + 1.5, g), at3(2, V1 + 1.5, g)];
    s.act = { kind: 'fort', spawns, guards, boss: at3(0, V0 + 4, f.chief), chest: [chest.x, base, chest.z] };
  }

  function buildSmallCamp(s: Site, x: number, z: number) {
    const base = heightAt(x, z);
    pave(x - 3, z - 3, x + 3, z + 3, base, 'yard');
    s.props.push({ t: 'firepit', x: x + 0.5, y: base, z: z + 0.5 });
    for (const [bx, bz] of [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]) { O.set(bx, base, bz, B.Barrier); O.set(bx, base + 1, bz, B.Barrier); }
    const colors = ['#8a6a3a', '#6a7a4a', '#7a3a2a', '#5a5a6a'];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.5 + hash2(x, z, 171) * 0.4;
      const tx = x + Math.cos(a) * 6.5, tz = z + Math.sin(a) * 6.5;
      s.props.push({ t: 'tent', x: tx, y: heightAt(tx, tz), z: tz, ry: -a + Math.PI / 2, color: colors[i] });
      s.props.push({ t: 'furn', item: 'rug', x: x + Math.cos(a) * 4.3, y: heightAt(tx, tz), z: z + Math.sin(a) * 4.3, ry: -a, tint: i });
    }
    // Log seats round the fire
    for (const [lx, lz, along] of [[x - 2, z, false], [x + 3, z, false], [x, z - 2, true], [x, z + 3, true]] as const) {
      for (let k = 0; k < 2; k++) O.set(lx + (along ? k : 0), base, lz + (along ? 0 : k), B.OakLog);
    }
    // A lean-to over the stores
    const lx = x + 8, lz = z - 6;
    for (const [px, pz] of [[lx, lz], [lx + 3, lz], [lx, lz + 3], [lx + 3, lz + 3]]) for (let y = 0; y < 3; y++) O.set(px, heightAt(px, pz) + y, pz, B.Timber);
    s.props.push({ t: 'roof', x: lx + 2, y: heightAt(lx, lz) + 3, z: lz + 2, len: 4, span: 4, rise: 1.4, ry: 0, mat: 'thatch' });
    for (let i = 0; i < 3; i++) s.props.push({ t: 'crate', x: lx + 1 + i * 0.8, y: heightAt(lx, lz) + (i === 1 ? 0.6 : 0), z: lz + 1.5 + (i % 2) * 0.4 });
    s.props.push({ t: 'barrel', x: lx + 2.5, y: heightAt(lx, lz), z: lz + 2.8 }, { t: 'cart', x: x - 8, y: heightAt(x - 8, z + 5), z: z + 5, ry: 0.8 }, { t: 'lantern', x: x + 3.5, y: base, z: z - 3.5 });
    rect(s, x - 10, z - 10, x + 13, z + 10);
    // Whoever keeps the camp, and what they've taken: the region's bandits round the fire, their
    // chest under the lean-to
    const who: Partial<Record<RegionId, string>> = { crownroad: 'footpad', brambledeep: 'poacher', saltwind: 'wrecker', redstone: 'claimjumper', gannet: 'cliffrobber', wrath: 'fenpoacher', tolmen: 'tinthief' };
    const type = who[s.region];
    if (type) {
      const spawns: [number, number, number, string][] = [[x - 4.5, 0, z + 1.5, type], [x + 5.5, 0, z + 0.5, type], [x + 0.5, 0, z - 4.5, type], [x + 1.5, 0, z + 5.5, type]];
      for (const p of spawns) p[1] = heightAt(Math.floor(p[0]), Math.floor(p[2]));
      const cx = lx + 2.5, cz = lz + 0.6, cy = heightAt(Math.floor(cx), Math.floor(cz));
      clearUp(Math.floor(cx), Math.floor(cz), cy, cy + 3);
      s.props.push({ t: 'furn', item: 'chest', x: cx, y: cy, z: cz, ry: 0 });
      s.act = { kind: 'camp', spawns, chest: [cx, cy, cz] };
    }
  }

  /**
   * A drift mine into a built-up hillside: a rock mound with the adit cut into its face, a timber
   * portal, rails out to a spoil heap, a tool shed, ore crates and lamps.
   */
  function buildMinePOI(s: Site, x: number, z: number, base: number, dir: number) {
    // The hill: a dome of rock and earth over where the tunnel runs
    const hx = x + dir * 12, R = 12;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R - 2; dx <= R + 2; dx++) {
      const d = Math.hypot(dx / 1.15, dz);
      if (d > R) continue;
      const px = hx + dx, pz = z + dz, g = heightAt(px, pz);
      const top = base + Math.round(Math.sqrt(Math.max(0, 1 - (d / R) ** 2)) * 9);
      const red = s.region === 'redstone', snow = s.region === 'starfall';
      for (let y = g - 1; y < top; y++) O.set(px, y, pz, y === top - 1 ? (red ? B.TerraOrange : snow ? B.SnowGrass : B.Grass) : y > top - 3 ? (red ? B.TerraBrown : B.Dirt) : hash2(px * 3 + y, pz, 172) < 0.2 ? B.Gravel : red ? B.TerraBrown : B.Stone);
    }
    buildMine(s, x, z, base, dir, 26);
    // The portal: squared timbers and a lintel, a bit forward of the hill face
    const px = x + dir * 1;
    for (const w of [-2, 2]) for (let y = base; y < base + 5; y++) O.set(px, y, z + w, B.Timber);
    for (let w = -3; w <= 3; w++) O.set(px, base + 5, z + w, B.DarkPlanks);
    for (let w = -1; w <= 1; w++) for (let y = base; y < base + 4; y++) O.set(px, y, z + w, B.Air);
    // Rails out of the adit to the spoil heap, and the heap itself
    s.props.push({ t: 'rails', x: x - dir * 3.5, y: base, z: z + 0.5, len: 8, ry: Math.PI / 2 });
    const sx = x - dir * 9, sz = z + 6;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const h = 3 - Math.round(Math.hypot(dx, dz) * 0.9);
      for (let y = 0; y < h; y++) O.set(sx + dx, heightAt(sx + dx, sz + dz) + y, sz + dz, hash2(dx, dz + y, 173) < 0.3 ? B.Cobble : B.Gravel);
    }
    // A tool shed, ore waiting for the cart, lamps
    house(s, x - dir * 8 - 3, z - 11, 6, 5, 1, heightAt(x - dir * 8, z - 9), 'slate', 's', { wall: B.Planks, role: 'workshop', chimney: false });
    s.props.push({ t: 'crate', x: x - dir * 2, y: base, z: z + 3.5 }, { t: 'crate', x: x - dir * 2.8, y: base, z: z + 3.9 }, { t: 'barrel', x: x - dir * 2, y: base, z: z - 3.5 });
    s.props.push({ t: 'lantern', x: x - dir * 1.5, y: base, z: z - 3.5 }, { t: 'lantern', x: x - dir * 1.5, y: base, z: z + 4.5 });
    pave(x - dir * 6 - 2, z - 3, x - dir * 6 + 2, z + 3, base, 'yard');
    rect(s, Math.min(x - 14 * dir, hx + R) - 2, z - R - 2, Math.max(x - 14 * dir, hx + R) + 2, z + R + 2);
    s.impostor.push({ x: hx, y: base + 4, z: z, w: R * 2, h: 8, d: R * 2, color: '#6a6a5a' });
  }
}

/**
 * Waymarks: a shrine by every Charter Post stop, at the foot of every vista's cairn and at the edge
 * of every world boss's lair. Each goes on the nearest 7 by 7 patch of level open ground (off roads,
 * streets and water, clear of buildings and props), facing back toward the place it serves, with its
 * pillars solid. Hollin Ford's is placed by hand in the authored vale.
 */
function placeWaymarks(O: Overrides, sites: Site[]): WaymarkSpot[] {
  // The planner's blocks near a spot, decoded a chunk at a time (last write wins, as in the game)
  const decoded = new Map<number, Map<number, number>>();
  const block = (x: number, y: number, z: number): number | undefined => {
    const k = chunkKey(x >> 5, z >> 5);
    let m = decoded.get(k);
    if (!m) {
      m = new Map();
      const a = O.map.get(k);
      if (a) for (let i = 0; i < a.length; i += 2) m.set(a[i], a[i + 1]);
      decoded.set(k, m);
    }
    return m.get(localIdx(x & 31, y, z & 31));
  };
  const solid = (x: number, y: number, z: number) => { const b = block(x, y, z); return b === undefined ? y < heightAt(x, z) : b !== B.Air && b !== B.Water && !!BLOCKS[b]?.solid; };
  const surface = (x: number, z: number) => { const g = heightAt(x, z); let y = g + 6; while (y > g - 4 && !solid(x, y - 1, z)) y--; return y; };
  const PAVED = new Set<number>([B.Path, B.Cobble, B.StoneBrick, B.MossyCobble, B.Gravel, B.Planks, B.Farmland]);
  const IGNORE = new Set<PropType>(['roof', 'glow', 'smoke', 'rope', 'root', 'banner', 'wallLantern', 'cone']);
  const fits = (x: number, z: number, slack: number): number | null => {
    const fx = Math.floor(x), fz = Math.floor(z);
    if (heightAt(fx, fz) <= SEA + 1 || roadDist(fx, fz) < 4.5 || riverDist(fx, fz) < 6 || lakeDist(fx, fz) < 4) return null;
    const y0 = surface(fx, fz);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const X = fx + dx, Z = fz + dz, y = surface(X, Z);
      if (Math.abs(y - y0) > slack) return null;
      const top = block(X, y - 1, Z);
      if (top !== undefined && (PAVED.has(top) || top === B.Water || top === B.Barrier)) return null;
      for (let h = 0; h < 4; h++) if (solid(X, y + h, Z) || block(X, y + h, Z) === B.Barrier) return null;
    }
    for (const s of sites) if (Math.abs(s.x - x) < 300 && Math.abs(s.z - z) < 300)
      for (const p of s.props) if (!IGNORE.has(p.t) && Math.abs(p.x - x) < 4.2 && Math.abs(p.z - z) < 4.2) return null;
    return y0;
  };
  const out: WaymarkSpot[] = [{ id: 'wm-hollin', name: 'Hollin Ford', x: HOLLIN_SHRINE.x, z: HOLLIN_SHRINE.z, y: HOLLIN_SHRINE.y, ax: HOLLIN_SHRINE.x, az: HOLLIN_SHRINE.z + 3.5, theme: 'greenwake', ry: HOLLIN_SHRINE.ry }];
  const put = (id: string, name: string, s: Site | undefined, ax0: number, az0: number, opts: { slack?: number; arrive?: [number, number, number] } = {}) => {
    let best: { x: number; z: number; y: number } | null = null;
    for (let r = 4; r <= 26 && !best; r += 1) for (let k = 0; k < 24 && !best; k++) {
      const a = (k / 24) * Math.PI * 2 + r * 0.37;
      const x = Math.floor(ax0 + Math.cos(a) * r) + 0.5, z = Math.floor(az0 + Math.sin(a) * r) + 0.5;
      const y = fits(x, z, opts.slack ?? 1);
      if (y !== null) best = { x, z, y };
    }
    // Nowhere fits: stand it where the old stone stood
    if (!best) best = { x: Math.floor(ax0) + 0.5, z: Math.floor(az0) + 0.5, y: surface(Math.floor(ax0), Math.floor(az0)) };
    const ry = Math.round(Math.atan2(ax0 - best.x, az0 - best.z) / (Math.PI / 2)) * (Math.PI / 2);
    const theme = regionAt(best.x, best.z).a;
    const fx = Math.floor(best.x), fz = Math.floor(best.z);
    for (const [dx, dz] of SHRINE_SOLID[theme].cells) {
      const X = fx + Math.round(dx * Math.cos(ry) + dz * Math.sin(ry)), Z = fz + Math.round(-dx * Math.sin(ry) + dz * Math.cos(ry));
      for (let h = 0; h < SHRINE_SOLID[theme].h; h++) O.set(X, best.y + h, Z, B.Barrier);
    }
    const host = s ?? sites[0];
    host.props.push({ t: 'waymark', x: best.x, y: best.y, z: best.z, ry, theme });
    host.rects.push([fx - 3, fz - 3, fx + 3, fz + 3]);
    const arrive = opts.arrive;
    out.push({ id, name, x: best.x, z: best.z, y: best.y, theme, ry, ax: arrive ? arrive[0] : best.x + Math.sin(ry) * 3.5, az: arrive ? arrive[2] : best.z + Math.cos(ry) * 3.5, ay: arrive?.[1] });
  };
  for (const p of POSTS) {
    if (p.id === 'hollin') continue;
    put('wm-' + p.id, p.name, sites.find((x) => x.id === p.place), p.x, p.z);
  }
  for (const s of sites) {
    const v = s.act?.kind === 'vista' ? s.act.view : undefined;
    // On a vista the shrine stands below the cairn, and travellers arrive on top of it
    if (v) put('wm-' + s.id, s.name.replace('Vista: ', ''), s, v[0] + 7, v[2] + 1, { slack: 2, arrive: [Math.floor(v[0]) + 0.5, v[1], Math.floor(v[2]) + 0.5] });
  }
  for (const b of WORLD_BOSSES) {
    const lair = sites.find((s) => s.id === 'lair-' + b.id);
    put('wm-' + b.id, lair?.name ?? b.where, lair, b.x + 0.5, b.z + 22.5);
  }
  return out;
}

/**
 * Grading for the outer lands' roads: the ground along each, sampled every two blocks, smoothed over
 * forty, and held to a rise of under a block in two; then a small levelled square every four blocks
 * to lay it into the land. Kept above the sea, so a creek gets a causeway.
 */
function gradeRoads(): Flatten[] {
  const out: Flatten[] = [];
  for (const line of WORLD_ROADS.slice(HEART_ROADS)) {
    const pts: { x: number; z: number; h: number }[] = [];
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < len; t += 2) {
        const x = ax + ((bx - ax) * t) / len, z = az + ((bz - az) * t) / len;
        pts.push({ x, z, h: heightAt(Math.floor(x), Math.floor(z)) });
      }
    }
    const sm = pts.map((_, i) => {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - 20); k <= Math.min(pts.length - 1, i + 20); k++) { s += pts[k].h; n++; }
      return s / n;
    });
    // The first and last twenty blocks keep their own ground (the road it leaves, the town it reaches)
    const PIN = 10, pinned = (i: number) => i < PIN || i >= sm.length - PIN;
    for (let i = 0; i < sm.length; i++) if (pinned(i)) sm[i] = pts[i].h;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < sm.length; i++) if (!pinned(i)) sm[i] = Math.min(sm[i - 1] + 0.9, Math.max(sm[i - 1] - 0.9, sm[i]));
      for (let i = sm.length - 2; i >= 0; i--) if (!pinned(i)) sm[i] = Math.min(sm[i + 1] + 0.9, Math.max(sm[i + 1] - 0.9, sm[i]));
    }
    for (let i = PIN; i < pts.length - PIN; i += 2) out.push({ x: Math.round(pts[i].x), z: Math.round(pts[i].z), r0: 2.5, r1: 6, h: Math.max(SEA + 2, Math.round(sm[i])) });
  }
  return out;
}

/** Roof colours for a house's far-away stand-in. */
const ROOF_TONE: Record<string, string> = { red: '#9a4a36', blue: '#3e5a86', slate: '#4a4e58', thatch: '#b89a58' };

/** Settlements where hostile creatures never spawn: [x, z, radius]. */
const SAFE_R: Record<string, number> = { cragsby: 64, holme: 60, scarrow: 64, aldermere: 270, cotters: 34, waystation: 30, gullmouth: 125, harrowgate: 95, coldhearth: 34, starwatch: 26, lighthouse: 18, hollowoak: 16, woodcamp: 20 };
export function safeZones(): [number, number, number][] {
  return plan().sites.filter((s) => SAFE_R[s.id]).map((s) => [s.x, s.z, SAFE_R[s.id]]);
}

/** Sites whose footprint rectangles touch a chunk. */
export function chunkRects(cx: number, cz: number): [number, number, number, number][] {
  return plan().rectsByChunk.get(chunkKey(cx, cz)) ?? [];
}

export function inRects(rects: [number, number, number, number][], x: number, z: number, pad = 0): boolean {
  for (const r of rects) if (x >= r[0] - pad && x <= r[2] + pad && z >= r[1] - pad && z <= r[3] + pad) return true;
  return false;
}

export { CHUNK };

/** How a house front is built: timber-framed, close-studded, stone with quoins, or weatherboarded. */
export type FrontId = 'framed' | 'studded' | 'quoined' | 'boarded';
/** What dresses a front: a hood over the door, shutters, window boxes. */
export type TrimId = 'hood' | 'shutters' | 'boxes';
export interface HouseOpts { wall?: number; chimney?: boolean; frame?: number; role?: Role; closed?: boolean; impostor?: boolean; front?: FrontId; trim?: TrimId[] }
/** Somewhere to write a house's blocks: the plan's overrides, or a live world (a player's own house). */
export interface BlockWriter { set(x: number, y: number, z: number, id: number): void }
export type HouseSink = Pick<Site, 'props' | 'rects' | 'impostor'>;

/**
 * A voxel house: walls with timber framing and windows, a three-high doorway, floors, stairs and
 * furniture inside (by role), the roof, a porch lantern and a chimney stack. Shared by the
 * settlements and by houses players build on their own lots.
 */
export function houseInto(O: BlockWriter, s: HouseSink, x0: number, z0: number, w: number, d: number, floors: number, base: number, roof: PropDesc['mat'], door: 'n' | 's' | 'e' | 'w', opts: HouseOpts = {}) {
  const rect = (_s: HouseSink, a: number, b: number, c: number, e: number) => { s.rects.push([Math.floor(a), Math.floor(b), Math.ceil(c), Math.ceil(e)]); };
  const clearUp = (x: number, z: number, from: number, to = from + 14) => { for (let y = from; y < Math.min(SY, to); y++) O.set(x, y, z, B.Air); };
  const foundation = (x: number, z: number, b: number, id: number = B.Cobble) => { for (let y = Math.min(heightAt(x, z), b) - 1; y < b; y++) O.set(x, y, z, id); };

  // closed: a house front with a shut door and lit windows, not fitted out inside (most of the
  // New Town's terraces; a capital has more doors than anyone needs to open)
  const top = base + floors * 4;
  rect(s, x0 - 2, z0 - 2, x0 + w + 1, z0 + d + 1);
  for (let z = z0 - 1; z <= z0 + d; z++) for (let x = x0 - 1; x <= x0 + w; x++) clearUp(x, z, base, top + 12);
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) foundation(x, z, base);
  // The front: what the walls are made of decides most of it, and the house's place the rest, so a
  // street isn't one house over and over (a player's plans say it outright)
  const pick = hash2(x0, z0, 77);
  const style: FrontId = opts.front ?? (opts.wall === B.StoneBrick ? (pick < 0.5 ? 'quoined' : 'framed') : opts.wall === B.Planks ? (pick < 0.6 ? 'boarded' : 'framed') : opts.wall === B.Cobble ? 'quoined' : pick < 0.4 ? 'studded' : 'framed');
  const wall = opts.wall ?? (style === 'boarded' ? B.Planks : style === 'quoined' ? B.StoneBrick : B.Plaster);
  const frame = opts.frame ?? B.Timber;
  const trim = opts.trim ?? [...(hash2(x0, z0, 79) < 0.4 ? ['hood'] : []), ...(hash2(x0, z0, 81) < 0.32 && style !== 'boarded' ? ['shutters'] : []), ...(hash2(x0, z0, 83) < 0.28 ? ['boxes'] : [])] as TrimId[];
  const doorX = door === 'n' || door === 's' ? x0 + Math.floor(w / 2) : door === 'e' ? x0 + w - 1 : x0;
  const doorZ = door === 'e' || door === 'w' ? z0 + Math.floor(d / 2) : door === 's' ? z0 + d - 1 : z0;
  /** The front's windows, for the shutters and the window boxes: [x, z, storey]. */
  const fronts: [number, number, number][] = [];
  const onFront = (x: number, z: number) => (door === 's' ? z === z0 + d - 1 : door === 'n' ? z === z0 : door === 'e' ? x === x0 + w - 1 : x === x0);
  for (let y = base; y < top; y++) {
    const ly = (y - base) % 4, f = Math.floor((y - base) / 4);
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1;
      if (!ex && !ez) { O.set(x, y, z, B.Air); continue; }
      const along = ez ? x - x0 : z - z0, span = ez ? w : d;
      const inner = along > 0 && along < span - 1;
      let id: number = wall;
      if (style === 'studded') {
        // Close studding: a post every other block, small windows between
        if (ex && ez) id = frame;
        else if (ly === 3) id = B.DarkPlanks;
        else if (f === 0 && ly === 0) id = B.Cobble;
        else if (along % 2 === 0) id = frame;
        else if (ly === 1 && along % 4 === 1 && inner) id = B.Window;
      } else if (style === 'quoined') {
        // Dressed stone: quoins at the corners in alternate courses, a string course between storeys
        if (ex && ez) id = ly % 2 === 0 ? B.Cobble : B.StoneBrick;
        else if (ly === 3) id = B.Cobble;
        else if (f === 0 && ly === 0) id = B.Cobble;
        else if ((ly === 1 || ly === 2) && along % 3 === 1 && inner) id = B.Window;
      } else if (style === 'boarded') {
        // Weatherboard: posts only at the corners and either side of the door, windows in pairs
        if (ex && ez) id = frame;
        else if (ly === 3) id = B.DarkPlanks;
        else if (f === 0 && ly === 0) id = B.Cobble;
        else if (f === 0 && onFront(x, z) && Math.abs(along - (ez ? doorX - x0 : doorZ - z0)) === 1) id = frame;
        else if ((ly === 1 || ly === 2) && along % 4 !== 0 && along % 4 !== 3 && inner) id = B.Window;
      } else {
        if (ex && ez) id = frame;
        else if (ly === 3) id = B.DarkPlanks;
        else if (f === 0 && ly === 0) id = B.Cobble;
        else if (along % 3 === 0) id = frame;
        else if ((ly === 1 || ly === 2) && along % 3 === 1 && inner) id = B.Window;
      }
      if (id === B.Window && ly === 1 && onFront(x, z) && !(x === doorX && z === doorZ)) fronts.push([x, z, f]);
      // The doorway: two blocks high, under a dark lintel
      if (x === doorX && z === doorZ && f === 0 && ly <= 1) id = opts.closed ? B.Barrier : B.Air;
      else if (x === doorX && z === doorZ && f === 0 && ly === 2) id = B.DarkPlanks;
      O.set(x, y, z, id);
    }
  }
  // Inside: a boarded floor, the upper storeys, stairs, furniture and lamplight
  O.set(doorX, base - 1, doorZ, B.StoneBrick); // threshold
  const chim = opts.chimney !== false ? chimneyCell({ x0, z0, w, d, door }) : undefined;
  const shape = { x0, z0, w, d, floors, base, door, doorX, doorZ, role: opts.role, tint: Math.floor(hash2(x0, z0, 5) * 3), chimney: chim };
  const ry = door === 'n' ? Math.PI : door === 's' ? 0 : door === 'e' ? Math.PI / 2 : -Math.PI / 2;
  const ox = door === 'e' ? 0.52 : door === 'w' ? -0.52 : 0, oz = door === 's' ? 0.52 : door === 'n' ? -0.52 : 0;
  if (opts.closed) s.props.push({ t: 'door', x: doorX + 0.5 + ox, y: base, z: doorZ + 0.5 + oz, ry });
  else {
    for (let z = z0 + 1; z < z0 + d - 1; z++) for (let x = x0 + 1; x < x0 + w - 1; x++) O.set(x, base - 1, z, B.Planks);
    const fit = fitOut(shape);
    for (const [bx, by, bz, kind] of fit.blocks) O.set(bx, by, bz, kind === 'floor' ? B.Planks : kind === 'step' ? B.DarkPlanks : kind === 'barrier' ? B.Barrier : B.Air);
    for (const f of fit.furn) s.props.push({ t: 'furn', item: f.item, x: f.x, y: f.y, z: f.z, ry: f.ry, tint: f.tint ?? shape.tint });
    const leaf = openDoorPlace(shape);
    s.props.push({ t: 'furn', item: 'doorOpen', x: leaf.x, y: base, z: leaf.z, ry: leaf.ry, swing: true });
  }
  // The porch lantern goes on whichever side of the door has bare wall, never over a window
  const glazed = new Set(fronts.filter(([, , f]) => f === 0).map(([x, z]) => x + ',' + z));
  for (const k of [1, -1]) {
    const lx = doorX + (oz ? k : 0), lz = doorZ + (ox ? k : 0);
    // (nor where the next window's shutter folds back)
    if (glazed.has(lx + ',' + lz) || (trim.includes('shutters') && glazed.has((lx + (oz ? k : 0)) + ',' + (lz + (ox ? k : 0))))) continue;
    s.props.push({ t: 'wallLantern', x: doorX + 0.5 + ox * 0.9 + (oz ? 1.2 * k : 0), y: base + 2.3, z: doorZ + 0.5 + oz * 0.9 + (ox ? 1.2 * k : 0), ry });
    break;
  }
  // A door a block over the ground outside gets a half step; two blocks, a stone step and a half step before it
  const out: [number, number] = door === 's' ? [0, 1] : door === 'n' ? [0, -1] : door === 'e' ? [1, 0] : [-1, 0];
  {
    const ex = doorX + out[0], ez = doorZ + out[1], g = heightAt(ex, ez), rise = base - g;
    if (rise === 1) s.props.push({ t: 'doorstep', x: ex + 0.5 - out[0] * 0.1, y: g, z: ez + 0.5 - out[1] * 0.1, ry });
    else if (rise === 2) {
      O.set(ex, g, ez, B.StoneBrick);
      s.props.push({ t: 'doorstep', x: ex + out[0] + 0.5 - out[0] * 0.1, y: g, z: ez + out[1] + 0.5 - out[1] * 0.1, ry });
    }
  }
  // The trim: a hood over the door, shutters either side of the front windows, boxes of flowers under them
  const faceAt = (x: number, z: number): [number, number] => [x + 0.5 + out[0] * 0.53, z + 0.5 + out[1] * 0.53];
  if (trim.includes('hood')) {
    const [hx, hz] = faceAt(doorX, doorZ);
    s.props.push({ t: 'roof', x: hx + out[0] * 0.45, y: base + 2.95, z: hz + out[1] * 0.45, len: 2.6, span: 1.3, rise: 0.55, ry: out[0] ? Math.PI / 2 : 0, mat: roof });
  }
  const shutterTone = ['#3a5a7a', '#4a6a3a', '#7a3a2a', '#2a4a4a', '#5a4a6a'][Math.floor(hash2(x0, z0, 85) * 5)];
  for (const [fx, fz, f] of fronts) {
    const [cx, cz] = faceAt(fx, fz);
    const sx = out[1] !== 0 ? 1 : 0, sz = out[0] !== 0 ? 1 : 0;
    // A shutter folds back against the wall beside its window: not over the door, nor over the next window
    const glass = new Set(fronts.filter((w) => w[2] === f).map(([x, z]) => x + ',' + z));
    if (trim.includes('shutters') && style !== 'studded' && style !== 'boarded') for (const k of [-1, 1]) {
      const nx = fx + sx * k, nz = fz + sz * k;
      if ((f === 0 && nx === doorX && nz === doorZ) || glass.has(nx + ',' + nz)) continue;
      s.props.push({ t: 'shutter', x: cx + sx * k * 0.74, y: base + f * 4 + 1, z: cz + sz * k * 0.74, ry, color: shutterTone });
    }
    if (trim.includes('boxes') && f === 0) s.props.push({ t: 'windowBox', x: cx, y: base + 0.95, z: cz, ry });
  }
  const alongX = w >= d;
  const span = alongX ? d : w;
  if (opts.impostor !== false) s.impostor.push({ x: x0 + w / 2, y: base + floors * 2 + 1.2, z: z0 + d / 2, w, h: floors * 4 + 2.4, d, color: ROOF_TONE[roof ?? 'red'] });
  s.props.push({ t: 'roof', x: x0 + w / 2, y: top, z: z0 + d / 2, len: alongX ? w : d, span, rise: roofRise(span), ry: alongX ? 0 : Math.PI / 2, mat: roof, dormers: floors > 1 ? (alongX ? (door === 's' ? 1 : door === 'n' ? -1 : 0) : (door === 'e' ? 1 : door === 'w' ? -1 : 0)) : 0 });
  if (chim) {
    // A stone stack standing proud of the gable end wall, from the ground up past the ridge; the
    // wall behind it is stone too, where the hearth stands inside.
    const [wx, wz] = chim;
    const ox = wx === x0 ? -1 : wx === x0 + w - 1 ? 1 : 0, oz = ox ? 0 : wz === z0 ? -1 : 1;
    const cx = wx + ox, cz = wz + oz;
    const apex = roofApex(span, roofRise(span), roofOverhang(roof === 'thatch'));
    for (let y = base; y < top; y++) O.set(wx, y, wz, B.Cobble);
    foundation(cx, cz, base, B.Cobble);
    for (let y = base; y < top + apex + 1.5; y++) O.set(cx, y, cz, y < top + apex + 0.5 ? B.Cobble : B.StoneBrick);
    s.props.push({ t: 'smoke', x: cx + 0.5, y: Math.ceil(top + apex + 1.5) + 0.2, z: cz + 0.5 });
  }
}

/**
 * Every banner hangs clear of the stone it's fixed to. Builders place them by eye, and a cloth set a
 * few tenths into a wall, or long enough to reach the ground, cuts through it. Each banner whose
 * cloth (1 wide, 2.2 long, plus the room it waves in) or rod meets a solid block is eased out from
 * the wall along its own normal, a twentieth at a time, then lifted if it still drags; one that
 * can't be settled within a block is taken down. scripts/sitecheck.ts checks the result.
 */
function settleBanners(sites: Site[], O: Overrides): void {
  const index = new Map<number, Map<number, number>>();
  const cellOf = (x: number, y: number, z: number): number | undefined => {
    const k = chunkKey(x >> 5, z >> 5);
    let m = index.get(k);
    if (!m) {
      m = new Map();
      const a = O.map.get(k) ?? [];
      for (let i = 0; i < a.length; i += 2) m.set(a[i], a[i + 1]);
      index.set(k, m);
    }
    return m.get(localIdx(x & 31, y, z & 31));
  };
  const solid = (x: number, y: number, z: number): boolean => {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const o = cellOf(fx, fy, fz);
    if (o !== undefined) return o !== B.Air && o !== B.Water && !!BLOCKS[o]?.solid && o !== B.OakLeaves && o !== B.BirchLeaves && o !== B.PineLeaves;
    return fy < heightAt(fx, fz);
  };
  const clear = (x: number, y: number, z: number, c: number, s: number): boolean => {
    const at = (u: number, v: number, n: number) => solid(x + u * c + n * s, y + v, z - u * s + n * c);
    for (let u = -0.45; u <= 0.46; u += 0.15) for (let v = -0.1; v >= -2.15; v -= 0.25) for (const n of [-0.12, 0, 0.12]) if (at(u, v, n)) return false;
    for (const u of [-0.58, 0, 0.58]) if (at(u, 0.05, 0)) return false;
    return true;
  };
  for (const site of sites) {
    site.props = site.props.filter((d) => {
      if (d.t !== 'banner') return true;
      const ry = d.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry);
      if (clear(d.x, d.y, d.z, c, s)) return true;
      for (const lift of [0, 0.5, 1]) for (let i = 1; i <= 20; i++) for (const sign of [1, -1]) {
        const off = sign * i * 0.05, x = d.x + off * s, z = d.z + off * c;
        if (!clear(x, d.y + lift, z, c, s)) continue;
        d.x = x; d.z = z; d.y += lift;
        return true;
      }
      return false;
    });
  }
}
