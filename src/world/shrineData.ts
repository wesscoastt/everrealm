import type { RegionId } from './terrain';

// Waymark shrines' numbers, kept apart from their models (world/shrines.ts) so the site planner
// can use them in the world worker without loading three.js.

/** Hollin Ford's shrine, on the north side of the square: placed by the authored vale (structures.ts). */
export const HOLLIN_SHRINE = { x: 157.5, z: 181.5, y: 19, ry: Math.PI };

/**
 * Verandah's waymarks each have a shrine of their own, as ESO's do (owner 2026-11-07: "some waymarks in Verandah are
 * bugged or missing textures; they need their own looks and themes depending on the area"): the town's trident, the
 * port's anchor, the farm's sheaf post, the Arena's shield, Kestle's snow cairn, Awschitz's brazier, Mizuholm's
 * stone lantern, the Airport's weathervane mast and Gorran's thatched post.
 */
export type VerandahShrine = 'vh_town' | 'vh_harbour' | 'vh_farm' | 'vh_arena' | 'vh_snow' | 'vh_fort' | 'vh_east' | 'vh_tower' | 'vh_village';
export type ShrineTheme = RegionId | VerandahShrine;

/** Where each shrine's rune glows, and its shape: a band round a pillar, an orb, or a disc. */
export const SHRINE_RUNE: Record<ShrineTheme, { shape: 'band' | 'orb' | 'disc'; y: number; w: number; h: number; d: number; color: string }> = {
  greenwake: { shape: 'band', y: 2.1, w: 1.06, h: 0.24, d: 0.86, color: '#7ae07a' },
  crownroad: { shape: 'band', y: 3.0, w: 1.02, h: 0.26, d: 1.02, color: '#6ad0ff' },
  brambledeep: { shape: 'orb', y: 2.5, w: 0.38, h: 0, d: 0, color: '#9af06a' },
  verandah: { shape: 'band', y: 2.2, w: 1.0, h: 0.24, d: 1.0, color: '#7ad8ff' }, saltwind: { shape: 'band', y: 2.2, w: 1.0, h: 0.24, d: 1.0, color: '#7ad8ff' },
  redstone: { shape: 'band', y: 2.6, w: 1.12, h: 0.26, d: 1.12, color: '#ffb05a' },
  starfall: { shape: 'orb', y: 2.0, w: 0.42, h: 0, d: 0, color: '#bfefff' },
  gannet: { shape: 'disc', y: 2.4, w: 0.6, h: 0, d: 0, color: '#f6f0c8' },
  wrath: { shape: 'band', y: 2.3, w: 0.8, h: 0.24, d: 0.8, color: '#e8d870' },
  tolmen: { shape: 'disc', y: 2.3, w: 0.62, h: 0, d: 0, color: '#d0a0ff' },
  inkholm: { shape: 'orb', y: 2.4, w: 0.4, h: 0, d: 0, color: '#c8a8ff' },
  kell: { shape: 'disc', y: 2.5, w: 0.6, h: 0, d: 0, color: '#ffb040' },
  sickle: { shape: 'orb', y: 2.0, w: 0.42, h: 0, d: 0, color: '#d8f4ff' },
  keys: { shape: 'disc', y: 2.2, w: 0.6, h: 0, d: 0, color: '#7af0e0' }, glades: { shape: 'orb', y: 2.3, w: 0.4, h: 0, d: 0, color: '#b0ff9a' },
  amberwold: { shape: 'orb', y: 2.6, w: 0.42, h: 0, d: 0, color: '#ffb84a' }, bright: { shape: 'band', y: 2.6, w: 1.04, h: 0.26, d: 1.04, color: '#fff0b0' },
  sunder: { shape: 'orb', y: 2.4, w: 0.4, h: 0, d: 0, color: '#e8fbff' }, glassflats: { shape: 'disc', y: 2.4, w: 0.6, h: 0, d: 0, color: '#c8a0ff' },
  greywaste: { shape: 'band', y: 2.2, w: 0.9, h: 0.24, d: 0.9, color: '#c8d0c8' }, held: { shape: 'disc', y: 2.5, w: 0.62, h: 0, d: 0, color: '#9ad0ff' },
  vh_town: { shape: 'band', y: 1.0, w: 1.3, h: 0.2, d: 1.3, color: '#ffd870' },
  vh_harbour: { shape: 'disc', y: 1.42, w: 0.5, h: 0, d: 0, color: '#7ad8ff' },
  vh_farm: { shape: 'band', y: 2.4, w: 0.66, h: 0.22, d: 0.66, color: '#f0d060' },
  vh_arena: { shape: 'orb', y: 3.3, w: 0.32, h: 0, d: 0, color: '#ff8a5a' },
  vh_snow: { shape: 'orb', y: 3.05, w: 0.3, h: 0, d: 0, color: '#c8f0ff' },
  vh_fort: { shape: 'band', y: 1.5, w: 1.16, h: 0.22, d: 1.16, color: '#ffb040' },
  vh_east: { shape: 'disc', y: 2.05, w: 0.34, h: 0, d: 0, color: '#ffe0a0' },
  vh_tower: { shape: 'band', y: 1.2, w: 0.9, h: 0.2, d: 0.9, color: '#9ae0ff' },
  vh_village: { shape: 'band', y: 1.9, w: 0.6, h: 0.2, d: 0.6, color: '#b8f08a' },
};

/** Solid cells (offsets from the centre cell, for a shrine facing +z) and how many blocks high. */
export const SHRINE_SOLID: Record<ShrineTheme, { cells: [number, number][]; h: number }> = {
  greenwake: { cells: [[0, 0]], h: 3 },
  crownroad: { cells: [[0, 0]], h: 4 },
  brambledeep: { cells: [[-2, 0], [2, 0]], h: 4 },
  verandah: { cells: [[0, 0]], h: 4 }, saltwind: { cells: [[0, 0]], h: 4 },
  redstone: { cells: [[0, 0]], h: 4 },
  starfall: { cells: [[0, 0], [-1, 0], [1, 0], [0, -1]], h: 3 },
  gannet: { cells: [[-1, 0], [1, 0]], h: 4 },
  wrath: { cells: [[0, 0]], h: 4 },
  tolmen: { cells: [[-1, 0], [0, 0], [1, 0]], h: 3 },
  inkholm: { cells: [[0, 0]], h: 4 },
  kell: { cells: [[0, 0]], h: 4 },
  sickle: { cells: [[0, 0], [-1, 0], [1, 0], [0, 1]], h: 3 },
  keys: { cells: [[0, 0]], h: 3 }, glades: { cells: [[0, 0]], h: 3 }, amberwold: { cells: [[-2, 0], [2, 0]], h: 4 }, bright: { cells: [[0, 0]], h: 4 },
  sunder: { cells: [[0, 0], [-1, 0], [1, 0], [0, -1]], h: 3 }, glassflats: { cells: [[0, 0]], h: 4 }, greywaste: { cells: [[-1, 0], [1, 0]], h: 4 }, held: { cells: [[-1, 0], [0, 0], [1, 0]], h: 3 },
  vh_town: { cells: [[0, 0]], h: 4 }, vh_harbour: { cells: [[0, 0]], h: 2 }, vh_farm: { cells: [[0, 0]], h: 3 }, vh_arena: { cells: [[0, 0]], h: 3 }, vh_snow: { cells: [[0, 0]], h: 3 },
  vh_fort: { cells: [[0, 0]], h: 3 }, vh_east: { cells: [[0, 0]], h: 3 }, vh_tower: { cells: [[0, 0]], h: 5 }, vh_village: { cells: [[0, 0]], h: 3 },
};
