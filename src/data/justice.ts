import type { LandId } from '../world/land';
import { coastX } from '../world/terrain';
import { CALLIS, COLD_HARBOUR, MORROW_OX, NORTHGATE_TOWN, TOWNS } from '../world/morrow';

// THE LAW. Every town keeps its own peace and its own book: strike a hen in Ansbury market, a
// carter in Gullmouth or one of the watch anywhere, and if anyone sees it, that town puts a price
// on you. Its watch remembers your face; the next town over doesn't know you. A small price, they
// warn you off; a bigger one, they come to take you in; a big one, they come with blades out.
//
// Taken in, you pay what's owed on the spot, or you go quietly: the watch's wagon carries you to the
// gaol (the Charter's cells under the Weighhouse in Ansbury; the Tolbooth under Callis), and you sit
// out your time, or pick the lock and run with a worse price on you. A price fades if you stay out of
// trouble. Or you go down to the Ropewalk Cellar in Gullmouth, or ask the Brethren in Saltpenny, and
// pay to have your name taken out of every book at once.
// The game side is game/Justice.ts; the cells and the cellar are built in world/sites.ts.

export interface Jurisdiction {
  land?: LandId;
  id: string;
  /** How the town is named on the price ("Ansbury"), and who keeps its peace. */
  name: string;
  watch: string;
  x: number; z: number; r: number;
  /** The gaol its watch takes you to (GAOLS). */
  gaol: string;
}

const GULL = { x: coastX(600) - 80, z: 600 };

export const JURISDICTIONS: Jurisdiction[] = [
  { id: 'ansbury', name: 'Ansbury', watch: 'the Charter watch', x: 820, z: 300, r: 196, gaol: 'gaol-ansbury' },
  { id: 'hollinford', name: 'Hollin Ford', watch: 'the parish constable', x: 165, z: 182, r: 42, gaol: 'gaol-ansbury' },
  { id: 'gullmouth', name: 'Gullmouth', watch: 'the harbour watch', x: GULL.x, z: GULL.z, r: 72, gaol: 'gaol-ansbury' },
  { id: 'harrowgate', name: 'Harrowgate Works', watch: 'the Company\'s men', x: 975, z: 1003, r: 60, gaol: 'gaol-ansbury' },
  { id: 'kelderby', name: 'Kelderby', watch: 'the fell watch', x: 300, z: 1460, r: 30, gaol: 'gaol-ansbury' },
  { land: 'morrow', id: 'callis', name: 'Callis', watch: 'the Assembly\'s watch', x: CALLIS.x, z: CALLIS.z, r: 120, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'northgate', name: 'Northgate', watch: 'the garrison', x: NORTHGATE_TOWN.x, z: NORTHGATE_TOWN.z, r: 60, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'coldharbour', name: 'Cold Harbour', watch: 'the harbour watch', x: COLD_HARBOUR.x, z: COLD_HARBOUR.z, r: 40, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'reedwater', name: 'Reedwater', watch: 'the reeve\'s men', x: TOWNS.reedwater.x, z: TOWNS.reedwater.z, r: 40, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'branchley', name: 'Branchley', watch: 'the Wold watch', x: TOWNS.branchley.x, z: TOWNS.branchley.z, r: 40, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'cala', name: 'Cala Roja', watch: 'the harbour watch', x: TOWNS.cala.x, z: TOWNS.cala.z, r: 40, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'liftwick', name: 'Liftwick', watch: 'the lift wardens', x: TOWNS.liftwick.x, z: TOWNS.liftwick.z, r: 40, gaol: 'gaol-callis' },
  { land: 'morrow', id: 'tenwells', name: 'Tenwells', watch: 'the caravan guard', x: TOWNS.tenwells.x, z: TOWNS.tenwells.z, r: 40, gaol: 'gaol-callis' },
];

/** The town whose peace a place is in (a little past its houses), or null out in the country. */
export function jurisdictionAt(x: number, z: number): Jurisdiction | null {
  let best: Jurisdiction | null = null, bd = Infinity;
  for (const j of JURISDICTIONS) { const d = Math.hypot(x - j.x, z - j.z); if (d < j.r * 1.15 && d < bd) { best = j; bd = d; } }
  return best;
}

/**
 * A gaol: cells cut into the rock under a town, reached only by the watch's wagon. Its floor is
 * fixed, so the people in it stand where it's built (world/sites.ts buildGaol). Local layout: the
 * guard room around (x, z), a passage north with three cells either side; you're put in the first
 * on the east. Let out, you're walked up into the town at `out`.
 */
export interface GaolDef { land?: LandId; id: string; name: string; x: number; z: number; floor: number; out: [number, number, number] }
export const GAOLS: GaolDef[] = [
  { id: 'gaol-ansbury', name: 'the Weighhouse cells, Ansbury', x: 820, z: 300, floor: 8, out: [829.5, 372.5, Math.PI] },
  { land: 'morrow', id: 'gaol-callis', name: 'the Tolbooth, Callis', x: MORROW_OX + 2140, z: 1112, floor: 8, out: [MORROW_OX + 2128.5, 1080.5, Math.PI] },
];
/** Where in a gaol (from its x, z) your cell is, the other cells, the gaoler's desk, and the way out of the cell when the door's opened. */
export const GAOL = {
  cell: [4.5, 8.5] as [number, number],
  cells: [[4.5, 8.5], [4.5, 12.5], [4.5, 16.5], [-3.5, 8.5], [-3.5, 12.5], [-3.5, 16.5]] as [number, number][],
  gaoler: [-2.5, -1.5] as [number, number],
  door: [0.5, 8.5] as [number, number],
};

/** An outlaws' refuge: a cellar under a town, through a hatch in the street; inside, someone who can clear your name. */
export interface RefugeDef { land?: LandId; id: string; name: string; x: number; z: number; floor: number; hatch: [number, number] }
export const REFUGES: RefugeDef[] = [
  { id: 'refuge-ropewalk', name: 'The Ropewalk Cellar', x: Math.floor(coastX(600)) - 58, z: 602, floor: 8, hatch: [Math.floor(coastX(600)) - 50, 592.5] },
];
/** Inside a refuge, from its x, z: where you come down, the fixer and the fence. */
export const REFUGE = { foot: [0.5, -4.5] as [number, number], fixer: [-4.5, 2.5] as [number, number], fence: [4.5, 2.5] as [number, number] };

/** What things cost, in marks of bounty. */
export const CRIME = {
  /** Striking a beast in town: a hen or a duck; sheep and pigs; a cow; somebody's dog or cat. */
  beast: { chicken: 25, duck: 25, sheep: 50, pig: 50, cow: 70, dog: 90, cat: 90 } as Record<string, number>,
  /** Striking a townsperson. */
  assault: 150,
  /** Striking one of the watch: and they hit back. */
  guard: 400,
  /** Running when they come to take you in. */
  resist: 100,
};
/** Thresholds: a word of warning; the watch comes to take you in; the watch comes with blades out. */
export const HEAT = { warn: 1, arrest: 100, onSight: 600 };
/** A price fades by this much a minute while you keep out of trouble. */
export const DECAY_PER_MIN = 10;
/** Seconds in a cell for a price (real time). */
export const sentence = (bounty: number) => Math.round(Math.max(30, Math.min(300, bounty / 4)));
/** What the fixer charges on top of the prices they make go away. */
export const FIXER_CUT = 0.25;
