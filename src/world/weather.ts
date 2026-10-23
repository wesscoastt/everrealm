import type { RegionId } from './terrain';
import { realmNow } from './clock';

// Weather, region by region, off the real clock so every player in a region sees the same sky.
// Every seven minutes each region rolls its weather for the next stretch from its own climate:
// the Fleet coast takes the most rain, the Raddle Barrens almost none, and Scarth snows.

export interface WeatherState {
  /** 0 clear .. 1 a lid of grey. */
  cloud: number;
  /** 0 dry .. 1 a downpour (or heavy snow). */
  precip: number;
  snow: boolean;
  /** Low fog: dawn mist in the valleys, sea fret on the coast. */
  mist: number;
  name: string;
}

const SLOT = 420;

interface Climate { wet: number; grey: number; snow?: boolean; mist: number; fret?: boolean; /** Mist that never quite lifts, all day. */ murk?: number }
const CLIMATE: Record<RegionId, Climate> = {
  greenwake: { wet: 0.22, grey: 0.25, mist: 0.55 },
  crownroad: { wet: 0.18, grey: 0.25, mist: 0.35 },
  brambledeep: { wet: 0.28, grey: 0.25, mist: 0.75 },
  saltwind: { wet: 0.32, grey: 0.25, mist: 0.4, fret: true },
  redstone: { wet: 0.05, grey: 0.15, mist: 0.1 },
  starfall: { wet: 0.38, grey: 0.25, snow: true, mist: 0.3 },
  gannet: { wet: 0.26, grey: 0.3, mist: 0.35, fret: true },
  wrath: { wet: 0.3, grey: 0.35, mist: 0.85, fret: true },
  tolmen: { wet: 0.42, grey: 0.4, mist: 0.7 },
  // Inkholm: mist nearly always, and a soft rain off the sea
  inkholm: { wet: 0.34, grey: 0.5, mist: 0.97, murk: 0.6 },
};
const REGION_N: Record<RegionId, number> = { greenwake: 1, crownroad: 2, brambledeep: 3, saltwind: 4, redstone: 5, starfall: 6, gannet: 7, wrath: 8, tolmen: 9, inkholm: 10 };

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The weather a region is heading for now (the sky eases toward it). */
export function weatherAt(region: RegionId, hour: number, now = realmNow() / 1000): WeatherState {
  const c = CLIMATE[region];
  const slot = Math.floor(now / SLOT);
  const r = hash(slot * 31 + REGION_N[region] * 7), k = hash(slot * 17 + REGION_N[region] * 3);
  let cloud: number, precip = 0;
  if (r < c.wet) { cloud = 0.75 + k * 0.25; precip = 0.3 + k * k * 0.7; }
  else if (r < c.wet + c.grey) { cloud = 0.45 + k * 0.4; }
  else cloud = k * 0.25;
  // Mist gathers before sunrise and burns off by mid-morning; the coast gets a sea fret any time
  const dawn = Math.max(0, 1 - Math.abs(hour - 6.2) / 2.2);
  let mist = c.mist * dawn * (0.6 + hash(slot * 5 + REGION_N[region]) * 0.4);
  if (c.fret && hash(slot * 13 + 2) < 0.15) mist = Math.max(mist, 0.55);
  if (c.murk) mist = Math.max(mist, c.murk * (0.75 + hash(slot * 7 + 3) * 0.25));
  if (precip > 0) mist = Math.max(mist, precip * 0.35);
  const snow = !!c.snow;
  const name = precip > 0.75 ? (snow ? 'Blizzard' : 'Storm') : precip > 0 ? (snow ? 'Snow' : 'Rain') : mist > 0.45 ? 'Mist' : cloud > 0.55 ? 'Overcast' : cloud > 0.2 ? 'Fair' : 'Clear';
  return { cloud, precip, snow, mist, name };
}
