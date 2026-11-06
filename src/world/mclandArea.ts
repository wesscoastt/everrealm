// Where the owner's Minecraft builds lie (scripts/mc/export.ts brings them in; world/mcland.ts streams them):
// rectangles of their Bedrock world ("Shiesty Craft Medieval"), each set down in the open sea south-west of
// the Counties. Verandah: their port town on its island, with everything round it: the farms, the outer
// houses, the bridges over the channel and the land they stand on, its coast falling away naturally past the
// last of the building; a quarter turned (Minecraft's north to the game's east) to fit the sea there. The
// home: their two-storey house in the snow with its cellar, the building beside it and the little lighthouse.
// Each has its own height: yOff takes a Minecraft y to the game's (the town's sea level, 63, to the game's, 16;
// the home's ground, high in the snow, to a little above it). `cell`: the height maps' step.

/**
 * A splice: in Minecraft x0..x1, z0..z1, the blocks from y `from` to `to` come out and what's above drops down to
 * fill the gap: for a build taller than the game's world.
 */
export interface McSplice { x0: number; z0: number; x1: number; z1: number; from: number; to: number }
/**
 * rot: 1 to turn it a quarter clockwise. island: the landmass on a point, its own coast kept, and what's built
 * within `reach` of it. natural: the land kept within `keep` blocks of anything built, then falling away over
 * `fade` blocks to the sea in a coast of its own; `whole`: all the land kept, only the rectangle's edges falling away. Without either, the rectangle's edges fall away to a beach.
 */
export interface McPiece {
  id: string; mx0: number; mz0: number; mx1: number; mz1: number; gx0: number; gz0: number; yOff: number;
  rot?: 0 | 1; splices?: McSplice[]; island?: { x: number; z: number; reach: number }; natural?: { keep: number; fade: number; whole?: boolean };
}
/** Where Verandah's corner lies in the game (its Minecraft north-west corner, x -820, z 1480 turned): in the sea west of the Counties. */
const VX = -3560, VZ = 1800;
export const MC_PIECES: McPiece[] = [
  // Verandah and everything round it (the king's house's spire 88 blocks over the sea: why the world is 112 high),
  // north to the owner's house by the snow (Minecraft -226, 64, 384), the village above it and the farm and its path
  { id: 'city', mx0: -820, mz0: 190, mx1: 260, mz1: 1480, gx0: VX, gz0: VZ, yOff: -47, rot: 1, natural: { keep: 70, fade: 30, whole: true } },
  // Off the docks, where you can see them from the quay: the islet with the copper statue (a mermaid), and the walled
  // islet beyond it with a ship moored alongside. Set where they lie from the town, so turned the same way:
  // gz0 = the town's gz0 + (their mx0 - the town's mx0), gx0 = the town's gx0 + (the town's mz1 - their mz1)
  { id: 'statue', mx0: -880, mz0: 800, mx1: -821, mz1: 900, gx0: VX + (1480 - 900), gz0: VZ + (-880 + 820), yOff: -47, rot: 1, island: { x: -847, z: 847, reach: 14 } },
  { id: 'seafort', mx0: -1045, mz0: 855, mx1: -940, mz1: 965, gx0: VX + (1480 - 965), gz0: VZ + (-1045 + 820), yOff: -47, rot: 1, island: { x: -985, z: 914, reach: 30 } },
];
export const MC_CELL = 8;
/** A piece's bounds in game coordinates. */
export function pieceBounds(p: McPiece) {
  const w = p.mx1 - p.mx0, d = p.mz1 - p.mz0;
  return p.rot ? { x0: p.gx0, x1: p.gx0 + d, z0: p.gz0, z1: p.gz0 + w } : { x0: p.gx0, x1: p.gx0 + w, z0: p.gz0, z1: p.gz0 + d };
}
/** A Minecraft spot on one of the pieces (x, y, z there) to the game's, turned as the piece is. */
export function mcToGame(id: string, x: number, y: number, z: number): [number, number, number] {
  const p = MC_PIECES.find((q) => q.id === id)!;
  return p.rot ? [p.gx0 + (p.mz1 - z), y + p.yOff, p.gz0 + (x - p.mx0)] : [p.gx0 + (x - p.mx0), y + p.yOff, p.gz0 + (z - p.mz0)];
}
/** A Minecraft facing (ry, 0 toward +z) to the game's, turned as the piece is. */
export const mcRy = (id: string, ry: number) => (MC_PIECES.find((q) => q.id === id)!.rot ? ry - Math.PI / 2 : ry);
