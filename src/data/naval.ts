import type { ShipKind } from '../world/ships';
import { CALLIS_PACKET, MORROW_OX } from '../world/morrow';
import { CAREEN } from './teeth';

// SHIPS OF YOUR OWN, AND FIGHTING IN THEM. You hire a ship by the hour from a shipwright, or have one
// built (marks for the yard's labour; timber, cable, sailcloth, iron fittings and tar from you), and sail
// her yourself: sails up or down, the helm over, the wind doing most of the work. Her guns are on her
// sides, so you fight her by turning her: bring a broadside to bear and fire it. Brethren raiders and
// revenue cutters work the sea lanes; out in the Freewater, the open sea between the continents, any
// captain may fire on any other (game/Sailing.ts; the realm server keeps the shared ships and the hits:
// server/naval.mjs).

export type HullId = 'cutter' | 'brig' | 'frigate';

export interface Hull {
  id: HullId;
  name: string;
  /** The model (world/ships.ts), and her length along it, for hits and for where she sits. */
  kind: ShipKind; len: number; beam: number;
  hp: number;
  /** Top speed with all sail set on her best point of sailing (blocks a second), and how fast she turns (radians a second at speed). */
  speed: number; turn: number;
  /** Guns a side, the damage of a ball, and the seconds to reload a broadside. */
  guns: number; shot: number; reload: number;
  /** Hire by the hour; to have one built: the yard's marks, and what you bring. */
  hire: number;
  build: { marks: number; items: Record<string, number> };
  blurb: string;
}

export const HULLS: Record<HullId, Hull> = {
  cutter: {
    id: 'cutter', name: 'Cutter', kind: 'smack', len: 9, beam: 3.2, hp: 700, speed: 10, turn: 1.0, guns: 2, shot: 60, reload: 5, hire: 40,
    build: { marks: 2500, items: { oak_logs: 40, pine_logs: 20, ship_cable: 8, sailcloth: 6, iron_fittings: 8, pine_tar: 6 } },
    blurb: 'One mast, a long boom, two guns a side. Quick in stays and quicker off the wind: the revenue\'s favourite, and the smuggler\'s.',
  },
  brig: {
    id: 'brig', name: 'Brig', kind: 'clipper', len: 18, beam: 4.4, hp: 1500, speed: 8.5, turn: 0.7, guns: 4, shot: 70, reload: 6.5, hire: 120,
    build: { marks: 8000, items: { oak_logs: 90, pine_logs: 50, ship_cable: 20, sailcloth: 16, iron_fittings: 24, pine_tar: 14 } },
    blurb: 'Two masts, square-rigged, four guns a side and a crew of a dozen in the old days. The Brethren\'s working ship.',
  },
  frigate: {
    id: 'frigate', name: 'Frigate', kind: 'galleon', len: 23, beam: 6.6, hp: 3000, speed: 7, turn: 0.5, guns: 7, shot: 80, reload: 8,  hire: 320,
    build: { marks: 22000, items: { oak_logs: 200, pine_logs: 120, ship_cable: 45, sailcloth: 36, iron_fittings: 60, pine_tar: 30 } },
    blurb: 'Three masts and a gun deck, seven a side. Slow to turn and slow to sink. The Assembly has four. You could have one.',
  },
};
export const HULL_IDS = Object.keys(HULLS) as HullId[];

/** How a ship of yours is dressed: hull and sail colours, a stripe, a name on her stern. */
export interface Livery { hull: string; wale: string; sail: string; name: string }
export const HULL_PAINTS = ['#3a2a1e', '#1e1c1c', '#2f3a4a', '#4a2a22', '#e8e4da', '#2a3a2a'];
export const WALE_PAINTS = ['#2f528f', '#7a2a1e', '#c8a050', '#2a2a30', '#3f6a3a', '#e8e0c8'];
export const SAIL_CLOTHS = ['#efe3c4', '#d8c8a0', '#a8603a', '#8a8478', '#3a3a40', '#a8382c'];

/** Repairs after she's sunk under you: the yard raises her and charges this share of her worth. */
export const SALVAGE = 0.1;

/**
 * The wind: the same for everyone (it runs on the realm clock), backing and veering slowly round the
 * compass over the hours, now fresher, now lighter. Its direction is where it blows toward.
 */
export function windAt(now: number): { dir: number; strength: number } {
  const t = now / 1000 / 60;
  const dir = (Math.sin(t / 37) * 2.2 + Math.sin(t / 11 + 1.3) * 0.6 + (t / 300) % (Math.PI * 2)) % (Math.PI * 2);
  const strength = 0.7 + Math.sin(t / 13 + 0.4) * 0.2 + Math.sin(t / 5.3) * 0.08;
  return { dir, strength };
}

/**
 * How much of her top speed a ship makes with the wind at this angle off her heading (0 dead astern,
 * PI dead ahead): nothing inside forty degrees of the wind, best with it on the beam, a little less
 * running before it.
 */
export function pointOfSail(off: number): number {
  const a = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
  const toWind = Math.PI - a;
  if (toWind < 0.7) return 0.12;
  if (toWind < 1.0) return 0.12 + (toWind - 0.7) / 0.3 * 0.55;
  return a > 1.9 ? 0.92 + (a - 1.9) * 0.06 : 0.85 + Math.sin(a) * 0.15;
}

/** The Freewater: the open sea between the continents, where any captain may fire on any other. */
export const FREEWATER = { x0: 3300, x1: MORROW_OX - 600, z0: 300, z1: 3400 };
export const inFreewater = (x: number, z: number) => x >= FREEWATER.x0 && x <= FREEWATER.x1 && z >= FREEWATER.z0 && z <= FREEWATER.z1;

/** Who sails the lanes against you, where, and what they leave in the water when they go down. */
export interface RaiderKind { id: string; name: string; hull: HullId; level: number; livery: Omit<Livery, 'name'>; names: string[]; marks: [number, number]; plunder: [string, number, number][] }
export const RAIDERS: RaiderKind[] = [
  { id: 'brethren', name: 'Brethren raider', hull: 'cutter', level: 30, livery: { hull: '#1e1c1c', wale: '#a8382c', sail: '#3a3a40' }, names: ['Black Hen', 'Slack Tide', 'Widow\'s Mite', 'Long Odds'], marks: [60, 140], plunder: [['salt_cod', 2, 5], ['brethren_rum', 1, 3]] },
  { id: 'brig', name: 'Brethren brig', hull: 'brig', level: 42, livery: { hull: '#2a2420', wale: '#c8a050', sail: '#a8603a' }, names: ['Gallows Jig', 'Fair Exchange', 'Kittiwake\'s Sister'], marks: [180, 320], plunder: [['brethren_rum', 2, 5], ['spice_chest', 1, 1]] },
  { id: 'revenue', name: 'Revenue cutter', hull: 'cutter', level: 35, livery: { hull: '#2f3a4a', wale: '#e8e0c8', sail: '#efe3c4' }, names: ['Vigilant', 'Duty', 'Speaker\'s Due'], marks: [40, 90], plunder: [['seized_goods', 1, 3]] },
];
/** The lanes the raiders work: a patrol box each, and how many at once. */
export const LANES: { raider: string; x0: number; x1: number; z0: number; z1: number; n: number; revenue?: boolean }[] = [
  // (open water all: east of the Mewstones; out past Inkholm; the Freewater's north; south of Skua Rock)
  { raider: 'brethren', x0: 2900, x1: 3400, z0: 300, z1: 1200, n: 2 },
  { raider: 'brethren', x0: 3400, x1: 4600, z0: 1500, z1: 3000, n: 3 },
  { raider: 'brig', x0: 3500, x1: 4600, z0: 300, z1: 1400, n: 2 },
  { raider: 'revenue', x0: 1850, x1: 2150, z0: 560, z1: 900, n: 1, revenue: true },
];
/** Revenue cutters only come for a captain with a price on their head (any town's book over this). */
export const REVENUE_PRICE = 300;

/** The harbours where a ship of yours can be called to the berth, and where the shipwrights are. */
export interface Berth { id: string; name: string; x: number; z: number; heading: number; land?: 'morrow' }
export const BERTHS: Berth[] = [
  { id: 'gullmouth', name: 'Gullmouth', x: 1832, z: 616, heading: Math.PI / 2 },
  { id: 'careen', name: 'the Careen, the Teeth', x: CAREEN.x + 79, z: CAREEN.z + 24, heading: Math.PI / 2, land: 'morrow' },
  { id: 'callis', name: 'Callis', x: CALLIS_PACKET.x + 31, z: CALLIS_PACKET.z + 5, heading: Math.PI / 2, land: 'morrow' },
];
