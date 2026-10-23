import { countiesOnly } from '../world/land';
import type { RegionId } from '../world/terrain';

// Puzzles: a handful of things to press in the right order, with the order written down nearby in
// plain words (no riddles). Get it wrong and they reset; get it right and a chest opens, once per
// character. Each piece has a mark you can see from a few steps off: a size, a picture or a colour.

export type PieceLook =
  | { kind: 'weight'; size: number }
  | { kind: 'cairn'; mark: 'sun' | 'cloud' | 'moon' | 'star' }
  | { kind: 'bowl'; color: string };

export interface PuzzleDef {
  id: string;
  name: string;
  region: RegionId;
  /** The middle: pieces stand round it, the clue at its edge, the chest in it. */
  x: number;
  z: number;
  /** The pieces, in the order they stand (not the order to press them). */
  pieces: { name: string; look: PieceLook; dx: number; dz: number }[];
  /** The order to press them, by index into pieces. */
  order: number[];
  /** Where the clue is written, and what it says. */
  clue: { dx: number; dz: number; what: string; text: string };
  xp: number;
  marks: number;
  loot: string[];
}

export const PUZZLES: PuzzleDef[] = [
  {
    id: 'pz-weights', name: 'The Miller\'s Weights', region: 'crownroad', x: 738, z: 668,
    pieces: [
      { name: 'the heavy weight', look: { kind: 'weight', size: 1 }, dx: -3, dz: 0 },
      { name: 'the light weight', look: { kind: 'weight', size: 0.45 }, dx: 0, dz: 1 },
      { name: 'the middle weight', look: { kind: 'weight', size: 0.7 }, dx: 3, dz: 0 },
    ],
    order: [1, 2, 0],
    clue: { dx: 0, dz: -4, what: 'the miller\'s board', text: 'Miller\'s rule for the old scale: light weight on first, then the middle one, then the heavy. Any other way and the beam jams.' },
    xp: 400, marks: 24, loot: ['bread', 'cooked_trout'],
  },
  {
    id: 'pz-sky', name: 'The Sky Cairns', region: 'starfall', x: 640, z: 1726,
    pieces: [
      { name: 'the moon cairn', look: { kind: 'cairn', mark: 'moon' }, dx: -4, dz: -1 },
      { name: 'the star cairn', look: { kind: 'cairn', mark: 'star' }, dx: -1.5, dz: 3 },
      { name: 'the sun cairn', look: { kind: 'cairn', mark: 'sun' }, dx: 2, dz: 3 },
      { name: 'the cloud cairn', look: { kind: 'cairn', mark: 'cloud' }, dx: 4, dz: -1 },
    ],
    order: [2, 3, 0, 1],
    clue: { dx: 0, dz: -5, what: 'Ilse\'s note', text: 'Ilse Blewitt\'s note, pinned under a stone: "Touch them as the day goes. Sun in the morning, cloud at noon, moon at dusk, stars at night."' },
    xp: 1100, marks: 44, loot: ['star_crystal', 'cooked_char'],
  },
  {
    id: 'pz-ochre', name: 'The Dyer\'s Bowls', region: 'redstone', x: 1172, z: 876,
    pieces: [
      { name: 'the brown bowl', look: { kind: 'bowl', color: '#6a3a1e' }, dx: -3, dz: 1 },
      { name: 'the red bowl', look: { kind: 'bowl', color: '#b8321e' }, dx: 0, dz: 3 },
      { name: 'the yellow bowl', look: { kind: 'bowl', color: '#e0b030' }, dx: 3, dz: 1 },
    ],
    order: [2, 1, 0],
    clue: { dx: 0, dz: -3, what: 'the dyer\'s slate', text: 'Chalked on a slate: "Yellow first. Red over the yellow. Brown last, to fix it. Not the other way round."' },
    xp: 900, marks: 38, loot: ['iron_ore', 'iron_ore'],
  },
];

// Placed on the first continent: none of them in Morrow (world/land.ts)
countiesOnly(PUZZLES);
