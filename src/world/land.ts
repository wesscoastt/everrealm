// Which land this page is: the Charter Counties (the first continent, and its isles) or Morrow (the
// second, over the sea). Each land is its own world in the same coordinate square, with its own
// terrain, towns, people and creatures, as ESO's zones are separate maps; going from one to the
// other (the packet ship) reloads the page into the other land behind a loading screen. So the land
// is fixed for the life of a page: everything that differs between the lands can read LAND once.
//
// The main thread reads it from local storage (written just before the reload); a chunk worker is
// started with the land in its name (ChunkManager), and reads it from there.

export type LandId = 'counties' | 'morrow';
export const LANDS: LandId[] = ['counties', 'morrow'];
export const LAND_NAMES: Record<LandId, string> = { counties: 'The Charter Counties', morrow: 'Morrow' };

const KEY = 'everrealm.land';

function detect(): LandId {
  try {
    const g = globalThis as unknown as { name?: unknown; localStorage?: Storage; __everrealmLand?: unknown };
    if (g.__everrealmLand === 'morrow') return 'morrow';
    if (typeof g.name === 'string' && g.name.startsWith('land:')) return g.name.slice(5) === 'morrow' ? 'morrow' : 'counties';
    if (g.localStorage && g.localStorage.getItem(KEY) === 'morrow') return 'morrow';
  } catch { /* no storage (a private window, a test): the Counties */ }
  return 'counties';
}

/** The land this page is. */
export const LAND: LandId = detect();

/** Whether something placed in a land (no land given: the Counties) is in this one. */
export const onLand = (x: { land?: LandId }): boolean => (x.land ?? 'counties') === LAND;

/** Choose the land the next page load will be (then reload to go there). */
export function setNextLand(l: LandId): void {
  try { localStorage.setItem(KEY, l); } catch { /* nothing to do */ }
}

/** Keep only what is in this land (no land given: the Counties), in place, so every holder of the list sees it. */
export function keepOnLand<T extends { land?: LandId }>(list: T[]): T[] {
  const keep = list.filter(onLand);
  list.length = 0;
  list.push(...keep);
  return list;
}
/** A list placed on the first continent: emptied in place in Morrow. */
export function countiesOnly<T>(list: T[]): T[] {
  if (LAND !== 'counties') list.length = 0;
  return list;
}
