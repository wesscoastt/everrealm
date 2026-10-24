// The Teeth's places, shared by the world builder (world/sites.ts) and the islands' people and stories
// (data/content/teeth.ts). The islands themselves are Morrow's (world/morrowLocal.ts TEETH_ISLES), in its
// own frame; these are in the world's, MORROW_OX east of it.
import { MORROW_OX } from '../world/morrow';

const W = (x: number, z: number) => ({ x: MORROW_OX + x, z });
/** Gallows Key: the old Assembly signal fort Hob Merrick holds, in the middle of the largest island. */
export const GALLOWS = { ...W(-1960, 3758), y: 21 };
/** The Careen: the shingle beach on the south-east island, a ship hauled up on it. */
export const CAREEN = { ...W(-1826, 3926), y: 18 };
/** Smoke Key: the beacon on its crown. */
export const SMOKE = { ...W(-2085, 3598), y: 22 };
/** Ysolde's Chair: the stack off the south-west, Ysolde Gale's compass rose cut in its top. */
export const CHAIR = { ...W(-2055, 3925), top: 40 };
