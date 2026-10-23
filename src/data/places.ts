import { REGIONS } from './gameplay';
import { DUNGEON_BY_ID } from './dungeons';
import { LAND } from '../world/land';
import { MORROW_REGIONS } from '../world/morrow';
import { plan } from '../world/sites';
import { REGION_INFO, RegionId } from '../world/terrain';

// Everything that can be discovered and labelled on the map: Hollindale's authored places,
// the named settlements and landmarks across the continent, and the regions themselves.

export interface Place { id: string; name: string; sub: string; x: number; z: number; r: number; y?: [number, number]; kind: 'place' | 'region' }

const REGION_LABELS: Record<RegionId, [number, number]> = {
  greenwake: [150, 140], crownroad: [700, 210], brambledeep: [270, 760], saltwind: [1560, 470],
  redstone: [1060, 1120], starfall: [760, 1820],
  gannet: [500, -1100], wrath: [-1250, 900], tolmen: [700, 3050], inkholm: [2760, 1520], kell: [2700, -760],
  keys: [-500, 3480], glades: [900, 2560], amberwold: [300, 1700], bright: [1800, 1150], sunder: [700, 430], glassflats: [1000, -280], greywaste: [900, -1000], held: [700, -1720],
};

let cache: Place[] | null = null;

/** What each region is, for its label on the map (no levels: everything meets you at yours). */
const REGION_SUB: Record<RegionId, string> = {
  greenwake: 'Farms and the Pit along the Wend', crownroad: 'Ansbury and the toll road', brambledeep: 'Giant trees and the fellers',
  saltwind: 'Gullmouth and the fishing coast', redstone: 'Harrowgate Works and red rock', starfall: 'High pasture and the Kettle',
  gannet: 'Seabird cliffs in the north', wrath: 'Fens and sluices in the west', tolmen: 'Stones and moorland in the south',
  inkholm: 'The mushroom isle off Gullmouth', kell: 'The Kilnfolk\'s volcano, north-east of the Fleet Coast',
  keys: 'Low islands, causeways and wrecks', glades: 'Sawgrass and slow rivers', amberwold: 'The autumn forest', bright: 'Callis and the vineyards', sunder: 'The rift, and the stone that floats', glassflats: 'Salt and black glass', greywaste: 'Where the black was dug out', held: 'Snowfields and the barrows of the old kingdom',
};

export function places(): Place[] {
  if (cache) return cache;
  const out: Place[] = REGIONS.map((r) => ({ id: r.id, name: r.name, sub: r.sub, x: r.x, z: r.z, r: r.r, y: r.y, kind: 'place' as const }))
    .filter((p) => p.id !== 'hollin' || true);
  for (const s of plan().sites) {
    if (!s.named) continue;
    const door = s.act?.kind === 'group' ? DUNGEON_BY_ID[s.id]?.door : undefined;
    if (door) { out.push({ id: s.id, name: s.name, sub: 'Group dungeon', x: door[0], z: door[2], r: 8, kind: 'place' }); continue; }
    out.push({ id: s.id, name: s.name, sub: REGION_INFO[s.region].name, x: s.x, z: s.z, r: s.id === 'aldermere' ? 80 : s.id === 'skyisles' ? 70 : 34, kind: 'place' });
  }
  for (const id of (Object.keys(REGION_LABELS) as RegionId[]).filter((r) => (MORROW_REGIONS as string[]).includes(r) === (LAND === 'morrow'))) {
    const [x, z] = REGION_LABELS[id];
    out.push({ id: 'region:' + id, name: REGION_INFO[id].name, sub: REGION_SUB[id], x, z, r: 0, kind: 'region' });
  }
  cache = out;
  return out;
}
