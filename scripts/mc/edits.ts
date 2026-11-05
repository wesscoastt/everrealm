// Changes made to the owner's Minecraft builds as they come in (scripts/mc/export.ts runs these on a piece's
// blocks, in Minecraft coordinates, before anything else is done to them): the owner asked for them, so they
// survive every re-export. What's set here is the game's own blocks (world/blocks.ts).
import { B } from '../../src/world/blocks';

export interface Editor {
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, id: number): void;
  /** Every cell in the box. */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void;
  /** Every cell in the box that's `from` now. */
  swap(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, from: number[], to: number): void;
}

export const EDITS: Record<string, (e: Editor) => void> = {
  /**
   * The Fortress made a smugglers' den (owner 2026-11-05). Their walled farmstead on its islet off Verandah's
   * docks: the crop plots become a planked yard for the cargo (data/content/smugglersDen.ts stacks it), the
   * nether portal by the west gate comes out, the horse pens become a wharf with three jetties on piles out
   * over the water, and under the compound there's a sea cave: a stair down from the hold, a stone floor round
   * a channel of black water, and a tunnel under the deck to the open sea that only a swimmer finds.
   */
  seafort(e) {
    const G = 62; // the ground (Minecraft y): the deck and the yard, walked on at 63
    // the yard: farmland and its crops gone, planked over
    e.swap(-990, G, 895, -960, G, 920, [B.Farmland, B.Dirt, B.Grass], B.Planks);
    e.swap(-990, G + 1, 895, -960, G + 2, 920, [B.Hay], B.Air);
    // the portal by the west gate: gone
    e.swap(-1000, G + 1, 921, -993, G + 6, 925, [B.Blackstone, B.Glowcap], B.Air);
    // the pens: fences down, the ground decked over as a wharf
    e.swap(-1001, G + 1, 921, -978, G + 3, 936, [B.Timber, B.Planks, B.DarkPlanks], B.Air);
    e.fill(-1001, G, 922, -979, G, 935, B.Planks);
    for (let x = -1001; x <= -979; x += 4) for (const z of [922, 935]) e.fill(x, G - 8, z, x, G, z, B.OakLog);
    // three jetties out to the west, two wide, on piles, a mooring post at the end of each
    for (const z of [923, 928, 933]) {
      e.fill(-1026, G, z, -1002, G, z + 1, B.Planks);
      for (let x = -1026; x <= -1002; x += 4) e.fill(x, G - 10, z - 1, x, G, z - 1, B.OakLog);
      e.set(-1026, G + 1, z - 1, B.OakLog); e.set(-1026, G + 1, z + 2, B.OakLog);
    }
    // the sea cave under the compound
    const cx0 = -996, cx1 = -978, cz0 = 907, cz1 = 921;
    e.fill(cx0 - 1, 50, cz0 - 1, cx1 + 1, G - 1, cz1 + 1, B.Stone);        // its rock
    e.fill(cx0, 57, cz0, cx1, 60, cz1, B.Air);                               // the cave, four high
    e.fill(cx0, 56, cz0, cx1, 56, cz1, B.Cobble);                            // its floor
    e.fill(cx0, 52, 913, cx1 - 3, 56, 915, B.Water);                         // the channel down its middle
    e.fill(cx0 - 12, 52, 913, cx0 - 1, 56, 915, B.Water);                    // and out under the deck to the sea
    e.fill(cx0 - 12, 51, 913, cx0 - 1, 51, 915, B.Sand);
    e.fill(cx0, 57, 912, cx0 + 8, 57, 912, B.Planks);                        // a landing stage along it
    e.fill(cx0, 57, 916, cx0 + 8, 57, 916, B.Planks);
    for (const [x, z] of [[cx0 + 2, cz0], [cx0 + 9, cz0], [cx1 - 2, cz1], [cx0 + 2, cz1]]) e.set(x, 60, z, B.Glowcap); // lamps in the roof
    // the stair down from the hold: five steps west, the hatch in the hold's floor open over them
    for (let k = 0; k < 5; k++) {
      const x = -979 - k, step = 60 - k;
      for (const z of [918, 919]) { e.fill(x, step + 1, z, x, G, z, B.Air); e.set(x, step, z, B.Planks); }
    }
  },
};
