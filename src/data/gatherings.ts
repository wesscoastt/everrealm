import { realmNow } from '../world/clock';
import type { ItemDef } from './items';

// Gatherings: a town lights its fire for the evening and everyone in the realm is told. One town at a
// time, in turn, on the realm clock, so everyone online sees the same fire lit at the same moment and
// has a reason to be in one place together (GW2's meta events and WoW's fire festivals, cut down to a
// cosy size). Music, something hot off the fire from the host, and the company itself: stay a while and
// you leave with more experience for the next hour, more again for every other traveller who came.
// The fires stand on open level ground worked out by scripts/_fairspots.ts; the people at each are in
// data/content/gatherings.ts, the fire itself in game/Gatherings.ts.

export interface GatheringDef {
  id: string;
  /** "The Hiring Fire" */
  name: string;
  town: string;
  /** "the Ansbury market" */
  where: string;
  x: number;
  z: number;
  land?: 'morrow';
  /** What the host hands out off the fire (an item id), once a lighting. */
  fairing: string;
  /** The announcement: "...is lit in X" follows the name. */
  lit: string;
}

export const GATHERINGS: GatheringDef[] = [
  { id: 'ansbury', name: 'The Hiring Fire', town: 'Ansbury', where: 'the Ansbury market', x: 839.5, z: 360.5, fairing: 'roast_chestnuts', lit: 'The Hiring Fire is lit on the Ansbury market: fiddles, chestnuts, and the whole town out.' },
  { id: 'gullmouth', name: 'The Fleet Fire', town: 'Gullmouth', where: 'the Gullmouth quay', x: 1739.5, z: 601.5, fairing: 'fire_sprats', lit: 'The Fleet Fire is lit on the Gullmouth quay: the boats are in and there are sprats on the fire.' },
  { id: 'harrowgate', name: 'The Shift Fire', town: 'Harrowgate', where: 'Harrowgate', x: 974.5, z: 1034.5, fairing: 'pit_toffee', lit: 'The Shift Fire is lit in Harrowgate: the band\'s out, and the day shift is up from the works.' },
  { id: 'callis', name: 'The Sardine Night', town: 'Callis', where: 'Callis', x: 8550.5, z: 1178.5, land: 'morrow', fairing: 'callis_sardines', lit: 'The grills are lit in Callis for the Sardine Night: bread, sardines, and the Callis red.' },
  { id: 'northgate', name: 'The Wall Fire', town: 'Northgate', where: 'the Northgate square', x: 6928.5, z: -1238.5, land: 'morrow', fairing: 'wall_broth', lit: 'The Wall Fire is lit on the Northgate square, so the watch on the wall can see the town is still there.' },
];

/** A fire is lit every GATHER_EVERY seconds, in the next town in turn, and burns for GATHER_UP. */
export const GATHER_EVERY = 5400;
export const GATHER_UP = 1200;
/** How long before it's lit the realm is told. */
export const GATHER_WARN = 300;
/** How near the fire counts as being there, and how long you stay before the company counts. */
export const GATHER_NEAR = 16;
export const GATHER_STAY = 30;

/** Where the gatherings stand now: this lighting's fire, and seconds until it's lit (negative: lit, for that long yet). */
export function gatheringNow(now = realmNow() / 1000): { def: GatheringDef; until: number; cycle: number } {
  const cycle = Math.floor(now / GATHER_EVERY), phase = now - cycle * GATHER_EVERY;
  if (phase < GATHER_UP) return { def: GATHERINGS[cycle % GATHERINGS.length], until: -(GATHER_UP - phase), cycle };
  return { def: GATHERINGS[(cycle + 1) % GATHERINGS.length], until: GATHER_EVERY - phase, cycle: cycle + 1 };
}

/** The next few lightings, in order, for the calendar and the Group Finder. */
export function gatheringBoard(n = 3, now = realmNow() / 1000): { id: string; name: string; where: string; until: number }[] {
  const first = gatheringNow(now), out: { id: string; name: string; where: string; until: number }[] = [];
  for (let k = 0; k < n; k++) {
    const def = GATHERINGS[(first.cycle + k) % GATHERINGS.length];
    out.push({ id: def.id, name: def.name, where: def.where, until: Math.round(first.until + k * GATHER_EVERY) });
  }
  return out;
}

/** This town's fire is lit now (the people at it come out for it). */
export function gatheringLit(id: string): boolean {
  const g = gatheringNow();
  return g.until < 0 && g.def.id === id;
}

/** The company's reward: a tenth more experience, and three hundredths more for each other traveller there (up to five). */
export function companyBonus(others: number): number {
  return 0.1 + 0.03 * Math.min(5, Math.max(0, others));
}

// ---------------------------------------------------------------- What comes off the fire
const fairing = (id: string, name: string, a: string, desc: string, buff: NonNullable<ItemDef['buff']>, stats: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'uncommon', stack: true, value: 3, icon: { shape: 'cooked', a }, heal: 40, buff, desc, stats: `Restores 40 health. ${stats}` });

export const GATHERING_ITEMS: ItemDef[] = [
  fairing('roast_chestnuts', 'Roast chestnuts', '#8a4a22', 'A paper twist of chestnuts split on the Hiring Fire\'s shovel. Too hot to hold, and nobody puts them down.', { slot: 'food', regen: 0.15, mins: 30 }, 'Stamina back faster for half an hour.'),
  fairing('fire_sprats', 'Sprats off the fire', '#a8a8b0', 'Sprats on a willow stick, black at the edges. Gullmouth eats them on the quay with the fleet in and the tide going out.', { slot: 'food', hp: 0.06, mins: 30 }, 'A little more health for half an hour.'),
  fairing('pit_toffee', 'Pit toffee', '#2a1a12', 'Black treacle toffee, broken with a hammer. The canteen makes it for the Shift Fire and the whole town argues about whose sets hardest.', { slot: 'food', hp: 0.04, regen: 0.08, mins: 30 }, 'A little more health and stamina for half an hour.'),
  fairing('callis_sardines', 'Sardines on bread', '#b8b8c0', 'Grilled sardines laid on a slab of olive bread to catch the oil. The bread is the best part, and Callis knows it.', { slot: 'food', hp: 0.06, mins: 30 }, 'A little more health for half an hour.'),
  fairing('wall_broth', 'Wall broth', '#8a6a3a', 'Mutton and barley from the pot on the Northgate square, the same pot the town sends up to the watch on the wall.', { slot: 'food', hp: 0.05, regen: 0.06, mins: 30 }, 'A little more health and stamina for half an hour.'),
];
