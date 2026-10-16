import { REGIONS } from './gameplay';
import { plan } from '../world/sites';
import { REGION_INFO, RegionId } from '../world/terrain';

// Everything that can be discovered and labelled on the map: Hollindale's authored places,
// the named settlements and landmarks across the continent, and the regions themselves.

export interface Place { id: string; name: string; sub: string; x: number; z: number; r: number; y?: [number, number]; kind: 'place' | 'region' }

const REGION_LABELS: Record<RegionId, [number, number]> = {
  greenwake: [150, 140], crownroad: [700, 210], brambledeep: [270, 760], saltwind: [1560, 470],
  redstone: [1060, 1120], starfall: [760, 1820],
};

let cache: Place[] | null = null;

export function places(): Place[] {
  if (cache) return cache;
  const out: Place[] = REGIONS.map((r) => ({ id: r.id, name: r.name, sub: r.sub, x: r.x, z: r.z, r: r.r, y: r.y, kind: 'place' as const }))
    .filter((p) => p.id !== 'hollin' || true);
  for (const s of plan().sites) {
    if (!s.named) continue;
    out.push({ id: s.id, name: s.name, sub: REGION_INFO[s.region].name, x: s.x, z: s.z, r: s.id === 'aldermere' ? 80 : s.id === 'skyisles' ? 70 : 34, kind: 'place' });
  }
  for (const id of Object.keys(REGION_LABELS) as RegionId[]) {
    const [x, z] = REGION_LABELS[id];
    out.push({ id: 'region:' + id, name: REGION_INFO[id].name, sub: `Levels ${REGION_INFO[id].levels}`, x, z, r: 0, kind: 'region' });
  }
  cache = out;
  return out;
}
