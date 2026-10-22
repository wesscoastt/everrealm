import type { ItemDef } from './items';
import type { EnemyType } from './gameplay';
import { REGION_INFO, type RegionId } from '../world/terrain';
import { hash2 } from '../world/noise';
import type { Plan, Site } from '../world/sites';
import { B, BLOCKS } from '../world/blocks';
import { heightAt } from '../world/terrain';
import { chunkKey, localIdx } from '../world/VoxelWorld';

// The wilds: what the world turns up for whoever is passing (game/Activities.ts runs them).
//
// Rares: one named creature to a region (and one at sea) that turns up at one of three of its
// region's landmarks. Which one, at any hour, is the same for every player: it moves on every
// forty minutes by the realm clock. Once you've killed it, it stays gone for you for twenty-five
// minutes. Each drops its trophy, often one of its region's treasure maps, and sometimes gear.
//
// Treasure maps: two to a region, each a rough drawing of one of the region's landmarks with an X
// a few strides south of it. With the map in your pack the place is marked on your map, and close
// to it the turned earth shows; dig there for what was buried.

export interface RareDef {
  id: string;
  /** Its creature (ENEMIES). */
  type: EnemyType;
  name: string;
  region: RegionId;
  /** Its own waters, for a rare at sea; otherwise it keeps to its region's landmarks. */
  sea?: [number, number][];
  /** Where it turns up, for a region with no landmarks of its own outside a town (Hollindale is all valley). */
  lairs?: [number, number][];
}

export const RARES: RareDef[] = [
  { id: 'brindle', type: 'r_brindle', name: 'Old Brindle', region: 'greenwake', lairs: [[250, 262], [92, 236], [228, 248]] },
  { id: 'barley', type: 'r_barley', name: 'The Barley Boar', region: 'crownroad' },
  { id: 'mosscap', type: 'r_mosscap', name: 'Mosscap', region: 'brambledeep' },
  { id: 'barnacle', type: 'r_barnacle', name: 'Old Barnacle', region: 'saltwind' },
  { id: 'pitdog', type: 'r_pitdog', name: 'The Pit Dog', region: 'redstone' },
  { id: 'whiteface', type: 'r_whiteface', name: 'Whiteface', region: 'starfall' },
  { id: 'eggthief', type: 'r_eggthief', name: 'The Egg Thief', region: 'gannet' },
  { id: 'mudgut', type: 'r_mudgut', name: 'Old Mudgut', region: 'wrath' },
  { id: 'torhound', type: 'r_torhound', name: 'The Tor Hound', region: 'tolmen' },
  { id: 'bigmary', type: 'r_bigmary', name: 'Big Mary', region: 'saltwind', sea: [[2050, 880], [1990, 1070], [2130, 960]] },
];

const trophy = (id: string, name: string, desc: string, a: string, value = 60): ItemDef =>
  ({ id, name, kind: 'trophy', rarity: 'rare', stack: false, value, icon: { shape: 'fang', a }, desc });

export const TROPHIES: ItemDef[] = [
  trophy('brindle_tail', 'Old Brindle\'s tail', 'Striped like a tabby cat. Every farmer below the Lantern will say they saw him first.', '#8a6a4a', 40),
  trophy('barley_tusk', 'The Barley Boar\'s tusk', 'Hob Tannet tells everyone this boar ate four sacks of his barley. It ate five.', '#e8dcc0', 50),
  trophy('mosscap_heart', 'Mosscap\'s heart', 'A lump of green glass from the middle of it. Warm, and slightly sticky.', '#7aba4a', 60),
  trophy('barnacle_claw', 'Old Barnacle\'s claw', 'Crusted white. Gullmouth\'s harbourmaster has a bet running on how old it is.', '#d8d0b8', 60),
  trophy('pitdog_collar', 'The Pit Dog\'s collar', 'Company brass, stamped H & D 41. Somebody\'s guard dog once, before the Works laid him off.', '#c8a050', 70),
  trophy('whiteface_pelt', 'Whiteface\'s pelt', 'Not a grey hair in it. Kelderby\'s inn would pay to hang it over the fire.', '#f4f4f4', 90),
  trophy('eggthief_brush', 'The Egg Thief\'s brush', 'A fox\'s tail with eggshell still in the fur. Hal Skene owes you a drink for this.', '#e8a060', 50),
  trophy('mudgut_tusk', 'Old Mudgut\'s tusk', 'Black with peat to the root. The fen children have a song about him, and it isn\'t kind.', '#3a3024', 60),
  trophy('torhound_fang', 'The Tor Hound\'s fang', 'As long as a finger. Scarrow mothers stop telling the story when they see it.', '#d8d8d0', 100),
  trophy('bigmary_tooth', 'Big Mary\'s tooth', 'Every Gullmouth crew has a story about her. This ends most of them.', '#f4f0e4', 80),
];

/** Regions with treasure maps, in the order their maps are numbered. */
export const MAP_REGIONS: RegionId[] = ['greenwake', 'crownroad', 'brambledeep', 'saltwind', 'redstone', 'starfall', 'gannet', 'wrath', 'tolmen'];

export interface TreasureMap { id: string; region: RegionId; n: 1 | 2 }
/** Hollindale's maps, drawn in the valley: the meadow east of the village, and below the Lantern. */
export const FIXED_SPOTS: Record<string, { x: number; z: number }> = { tmap_greenwake_1: { x: 214.5, z: 158.5 }, tmap_greenwake_2: { x: 100.5, z: 252.5 } };
export const TREASURE_MAPS: TreasureMap[] = MAP_REGIONS.flatMap((region) => ([1, 2] as const).map((n) => ({ id: `tmap_${region}_${n}`, region, n })));

export const MAP_ITEMS: ItemDef[] = TREASURE_MAPS.map((m) => ({
  id: m.id, name: `Treasure map: ${REGION_INFO[m.region].name}${m.n === 2 ? ' (second)' : ''}`, kind: 'collectible', rarity: 'uncommon', stack: false, value: 20,
  icon: { shape: 'bread', a: '#e8d8a8', b: '#a83a24' },
  desc: `A rough drawing of a landmark in ${REGION_INFO[m.region].name}, and an X a few strides south of it, gone over twice in ink.`,
  stats: 'While it\'s in your pack, the place is marked on your map. Dig at the turned earth.',
}));

/** A region's landmarks (its scattered points of interest), in a fixed order. */
function landmarks(P: Plan, region: RegionId): Site[] {
  return P.sites.filter((s) => !s.named && s.id.startsWith('poi') && s.region === region).sort((a, b) => a.id.localeCompare(b.id));
}

/** Ten strides off a landmark, on whichever side is clear of anything built (south first). */
function beside(p: Site, P: Plan, first: 1 | -1 = 1): [number, number] {
  const near = P.sites.filter((s) => Math.abs(s.x - p.x) < 320 && Math.abs(s.z - p.z) < 320);
  // Built on: inside a plot, or anything the planner stood up above the natural ground there
  const raised = (x: number, z: number) => {
    const a = P.overrides.map.get(chunkKey(x >> 5, z >> 5));
    if (!a) return false;
    const h = heightAt(x, z);
    for (let y = h; y < h + 12; y++) {
      const want = localIdx(x & 31, y, z & 31);
      for (let i = a.length - 2; i >= 0; i -= 2) if (a[i] === want) { if (a[i + 1] !== B.Air && a[i + 1] !== B.Water && BLOCKS[a[i + 1]]?.solid) return true; break; }
    }
    return false;
  };
  const built = (x: number, z: number) => raised(x, z) || near.some((s) => s.rects.some((r) => x >= r[0] - 2 && x <= r[2] + 2 && z >= r[1] - 2 && z <= r[3] + 2));
  for (const [dx, dz] of [[0, 10 * first], [0, -10 * first], [10, 0], [-10, 0], [0, 16 * first], [16, 0]]) {
    const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
    if (!built(x, z)) return [x + 0.5, z + 0.5];
  }
  return [Math.floor(p.x) + 0.5, Math.floor(p.z) + 10.5];
}

/** Where a rare can turn up: three of its region's landmarks (beside each), or its own places. */
export function rareLairs(r: RareDef, P: Plan): [number, number][] {
  if (r.sea || r.lairs) return r.sea ?? r.lairs!;
  const pois = landmarks(P, r.region), out: [number, number][] = [];
  for (let k = 0; k < Math.min(3, pois.length); k++) {
    const p = pois[Math.floor(hash2(k, r.id.length * 31 + r.id.charCodeAt(0), 901) * pois.length)];
    const at = beside(p, P);
    if (!out.some(([x, z]) => x === at[0] && z === at[1])) out.push(at);
  }
  return out;
}

/** A treasure map's X: a few strides off one of its region's landmarks. */
export function treasureSpot(m: TreasureMap, P: Plan): { x: number; z: number } | null {
  if (FIXED_SPOTS[m.id]) return FIXED_SPOTS[m.id];
  const pois = landmarks(P, m.region);
  if (!pois.length) return null;
  const p = pois[Math.floor(hash2(m.n * 17, m.region.length * 7 + m.region.charCodeAt(0), 903) * pois.length)];
  const [x, z] = beside(p, P, m.n === 1 ? 1 : -1);
  return { x, z };
}
