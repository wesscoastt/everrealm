import { MC_THINGS } from '../data/mcSigns';

// Ladders (owner 2026-11-05: "make ladders work too, I have a tree house with ladders"): every ladder block on
// the owner's Minecraft builds (scripts/mc/export.ts brings them as 'mcladder' things, drawn by world/props.ts
// mcLadder), and whether a spot is on one. Walk into a ladder to climb it; let go and you slide down
// (entities/Player.ts).

const cells = new Set<string>();
for (const t of MC_THINGS) if (t[0] === 'mcladder') cells.add(Math.floor(+t[1]) + ',' + Math.floor(+t[2]) + ',' + Math.floor(+t[3]));
/** The ladder up out of the Drowned Cistern's bottom hall to the corridor above it (scripts/mc/cistern-ladder.cjs), on its west wall. */
export const CISTERN_LADDER = { x: -2756.5, z: 2240.5, ry: Math.PI / 2, y0: -13, y1: -5 };
for (let y = CISTERN_LADDER.y0; y <= CISTERN_LADDER.y1; y++) cells.add(Math.floor(CISTERN_LADDER.x) + ',' + y + ',' + Math.floor(CISTERN_LADDER.z));

/** Is there a ladder in the block at this point? */
export const ladderCell = (x: number, y: number, z: number): boolean => cells.has(Math.floor(x) + ',' + Math.floor(y) + ',' + Math.floor(z));

/** Is a body of this half-width standing at (x, y, z) on a ladder (at its feet or its middle)? */
export function onLadder(x: number, y: number, z: number, half: number): boolean {
  if (!cells.size) return false;
  for (const dy of [0.1, 1]) for (const dx of [-half, half]) for (const dz of [-half, half]) if (ladderCell(x + dx, y + dy, z + dz)) return true;
  return false;
}
