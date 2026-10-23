import type { RegionId } from './terrain';

// Waymark shrines' numbers, kept apart from their models (world/shrines.ts) so the site planner
// can use them in the world worker without loading three.js.

/** Hollin Ford's shrine, on the north side of the square: placed by the authored vale (structures.ts). */
export const HOLLIN_SHRINE = { x: 157.5, z: 181.5, y: 19, ry: Math.PI };

/** Where each shrine's rune glows, and its shape: a band round a pillar, an orb, or a disc. */
export const SHRINE_RUNE: Record<RegionId, { shape: 'band' | 'orb' | 'disc'; y: number; w: number; h: number; d: number; color: string }> = {
  greenwake: { shape: 'band', y: 2.1, w: 1.06, h: 0.24, d: 0.86, color: '#7ae07a' },
  crownroad: { shape: 'band', y: 3.0, w: 1.02, h: 0.26, d: 1.02, color: '#6ad0ff' },
  brambledeep: { shape: 'orb', y: 2.5, w: 0.38, h: 0, d: 0, color: '#9af06a' },
  saltwind: { shape: 'band', y: 2.2, w: 1.0, h: 0.24, d: 1.0, color: '#7ad8ff' },
  redstone: { shape: 'band', y: 2.6, w: 1.12, h: 0.26, d: 1.12, color: '#ffb05a' },
  starfall: { shape: 'orb', y: 2.0, w: 0.42, h: 0, d: 0, color: '#bfefff' },
  gannet: { shape: 'disc', y: 2.4, w: 0.6, h: 0, d: 0, color: '#f6f0c8' },
  wrath: { shape: 'band', y: 2.3, w: 0.8, h: 0.24, d: 0.8, color: '#e8d870' },
  tolmen: { shape: 'disc', y: 2.3, w: 0.62, h: 0, d: 0, color: '#d0a0ff' },
  inkholm: { shape: 'orb', y: 2.4, w: 0.4, h: 0, d: 0, color: '#c8a8ff' },
  kell: { shape: 'disc', y: 2.5, w: 0.6, h: 0, d: 0, color: '#ffb040' },
};

/** Solid cells (offsets from the centre cell, for a shrine facing +z) and how many blocks high. */
export const SHRINE_SOLID: Record<RegionId, { cells: [number, number][]; h: number }> = {
  greenwake: { cells: [[0, 0]], h: 3 },
  crownroad: { cells: [[0, 0]], h: 4 },
  brambledeep: { cells: [[-2, 0], [2, 0]], h: 4 },
  saltwind: { cells: [[0, 0]], h: 4 },
  redstone: { cells: [[0, 0]], h: 4 },
  starfall: { cells: [[0, 0], [-1, 0], [1, 0], [0, -1]], h: 3 },
  gannet: { cells: [[-1, 0], [1, 0]], h: 4 },
  wrath: { cells: [[0, 0]], h: 4 },
  tolmen: { cells: [[-1, 0], [0, 0], [1, 0]], h: 3 },
  inkholm: { cells: [[0, 0]], h: 4 },
  kell: { cells: [[0, 0]], h: 4 },
};
