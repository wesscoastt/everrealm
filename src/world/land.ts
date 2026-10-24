import { inMorrow } from './morrow';

// The lands of the one world: the Charter Counties (the first continent, and its isles) to the west,
// and Morrow (the second) east of them across the open sea (world/morrow.ts sets it down there). They
// were separate maps once, each loaded on its own page; now they're one world, and you can sail or
// swim from one to the other (it takes a while). What's in which land is a tag on the data (land), and
// where you are is a matter of where you stand (landAt).

export type LandId = 'counties' | 'morrow';
export const LANDS: LandId[] = ['counties', 'morrow'];
export const LAND_NAMES: Record<LandId, string> = { counties: 'The Charter Counties', morrow: 'Morrow' };

/** The land a point of the world is in. */
export const landAt = (x: number): LandId => (inMorrow(x) ? 'morrow' : 'counties');

/** Whatever's tagged for a land (no land given: the Counties) is in it. */
export const landOf = (x: { land?: LandId }): LandId => x.land ?? 'counties';
