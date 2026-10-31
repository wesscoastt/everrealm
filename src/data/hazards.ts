import { B } from '../world/blocks';
import { hash2 } from '../world/noise';
import { heightAt, regionAt, roadDist, SEA, type RegionId } from '../world/terrain';
import type { Overrides, Site, WaymarkSpot } from '../world/sites';
import { chunkKey } from '../world/VoxelWorld';

// The ground itself, in three regions: something to watch for on the way somewhere, and something
// to fight around (creatures that chase you in get caught too).
//   Vents (Raddle Barrens): cracks in the red rock that build up and blow scalding steam.
//   Bogs (Wrath Levels): soft ground and standing water that hold your feet: you wade at half speed.
//   Rockfalls (Scarth): the scree under a loose crag, which sheds stones on whoever's there.
// Placed on open ground away from roads and places, the same for everyone (a hash of the cell), and
// built into the ground by the site planner (stamp, below) so you can see them coming.

export type HazardKind = 'vent' | 'bog' | 'rockfall';
export interface Hazard {
  id: string; kind: HazardKind; x: number; z: number; r: number;
  /** A rockfall's crag: which way it rises (stones fall from there). */
  face?: [number, number];
  /** A dungeon room's own (game/Rooms.ts): seconds between falls and the wind-up, how long before the first, and the floor it's on. */
  every?: number; windup?: number; first?: number; y?: number;
}

const RULES: { kind: HazardKind; region: RegionId; r: number; every: number; chance: number }[] = [
  { kind: 'vent', region: 'redstone', r: 3, every: 64, chance: 0.6 },
  { kind: 'bog', region: 'wrath', r: 6, every: 90, chance: 0.4 },
  { kind: 'rockfall', region: 'starfall', r: 4, every: 60, chance: 0.6 },
];

/** How a hazard behaves: seconds between bursts, the wind-up, and the share of your health a burst takes. */
export const HAZARD = {
  vent: { every: 7, windup: 1.6, hurt: 0.14, name: 'Steam vent' },
  rockfall: { every: 9, windup: 1.8, hurt: 0.16, name: 'Falling stones' },
  bog: { slow: 0.5, name: 'Bog' },
};

const EIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
let cache: Hazard[] | null = null;

/** Every hazard in the world (worked out once, from the planner's sites, waymarks and what it has built). */
export function hazards(P: { sites: Site[]; waymarks: WaymarkSpot[]; overrides: Overrides }): Hazard[] {
  if (cache) return cache;
  // The columns the planner has built in, by chunk (a fence, a wall, a lamp, a cleared road)
  const cols = new Map<number, Set<number>>();
  const built = (x: number, z: number): boolean => {
    const k = chunkKey(x >> 5, z >> 5);
    let s = cols.get(k);
    if (!s) {
      s = new Set();
      const a = P.overrides.map.get(k) ?? [];
      for (let i = 0; i < a.length; i += 2) s.add(a[i] % 1024);
      cols.set(k, s);
    }
    return s.has((x & 31) + 32 * (z & 31));
  };
  const out: Hazard[] = [];
  for (const rule of RULES) {
    for (let cz = -30; cz < 50; cz++) for (let cx = -30; cx < 50; cx++) for (let tries = 0; tries < (rule.kind === 'rockfall' ? 5 : 1); tries++) {
      const k = hash2(cx * 7 + rule.kind.length, cz * 11, 961);
      if (k > rule.chance) break;
      const x = Math.floor(cx * rule.every + hash2(cx + tries * 97, cz, 962) * rule.every * 0.6), z = Math.floor(cz * rule.every + hash2(cx, cz + tries * 89, 963) * rule.every * 0.6);
      if (regionAt(x, z).a !== rule.region) continue;
      const h = Math.floor(heightAt(x, z));
      if (h <= SEA + 1 || roadDist(x, z) < 14) continue;
      // Level enough to stand round, and not in a town, a camp or anything else built
      if (EIGHT.some(([dx, dz]) => [rule.r, rule.r * 0.5].some((d) => Math.abs(Math.floor(heightAt(x + dx * d, z + dz * d)) - h) > (rule.kind === 'rockfall' ? 2 : 1)))) continue;
      let touched = false;
      for (let dz = -rule.r - 3; dz <= rule.r + 3 && !touched; dz++) for (let dx = -rule.r - 3; dx <= rule.r + 3; dx++) if (built(x + dx, z + dz)) { touched = true; break; }
      if (touched) continue;
      if (P.sites.some((s) => Math.hypot(s.x - x, s.z - z) < (s.named ? 60 : 30))) continue;
      if (P.waymarks.some((w) => Math.hypot(w.x - x, w.z - z) < 30)) continue;
      // Stones fall from something: a crag at least eight blocks high just beyond the scree
      let face: [number, number] | undefined;
      if (rule.kind === 'rockfall') {
        let best = -Infinity;
        for (const [dx, dz] of EIGHT) for (const d of [rule.r + 3, rule.r + 6]) { const g = Math.floor(heightAt(x + dx * d, z + dz * d)); if (g > best) { best = g; face = [dx, dz]; } }
        if (best - h < 8) continue;
      }
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rule.r + 10)) continue;
      out.push({ id: `${rule.kind}${out.length}`, kind: rule.kind, x: x + 0.5, z: z + 0.5, r: rule.r, face });
      break;
    }
  }
  cache = out;
  return out;
}

/** Build each hazard into the ground: a vent's black crust and its crack, a bog's mud and pools, the
 *  scree under a loose cliff. */
export function stamp(list: Hazard[], O: Overrides): void {
  for (const h of list) {
    const cx = Math.floor(h.x), cz = Math.floor(h.z);
    for (let dz = -h.r; dz <= h.r; dz++) for (let dx = -h.r; dx <= h.r; dx++) {
      const x = cx + dx, z = cz + dz, d = Math.hypot(dx, dz);
      const n = hash2(x, z, 964);
      // A ragged edge, not a circle
      if (d > h.r - 0.5 + n * 0.9) continue;
      const top = Math.floor(heightAt(x, z)) - 1;
      if (h.kind === 'vent') {
        if (d < 0.5) { O.set(x, top, z, B.Air); O.set(x, top - 1, z, B.DeepStone); }
        else if (d < 1.6 || n < 0.3) O.set(x, top, z, B.DeepStone);
        else if (n < 0.55) O.set(x, top, z, B.TerraBrown);
      } else if (h.kind === 'bog') {
        // Pools a block deep in the middle, mud round them
        if (d < h.r * 0.7 && n < 0.45) { O.set(x, top, z, B.Water); O.set(x, top - 1, z, B.Loam); }
        else O.set(x, top, z, n < 0.8 ? B.Loam : B.MossyStone);
      } else {
        O.set(x, top, z, n < 0.45 ? B.Gravel : n < 0.75 ? B.DeepStone : B.Cobble);
      }
    }
  }
}
