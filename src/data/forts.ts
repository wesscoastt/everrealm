import type { EnemyType } from './gameplay';

// Bandit forts: a palisade in the back country of each troubled region, held by that region's
// gang under a chief, with their takings in a chest in the chief's hall (world/sites.ts builds them,
// game/Activities.ts fills them). Kill every one inside and the fort is cleared: the region thanks
// you, the chest opens, and the first time you clear each one it pays well. A gang drifts back
// to an empty fort in time, as gangs do.
//
// Every gang on the Charter roads hangs a tally over its gate: a rag with a stroke for every cart
// it has taken. The Charter pays a bounty by the stroke, which is why the chiefs keep their tallies
// on them.

export interface Fort {
  id: string;
  name: string;
  region: string;
  x: number;
  z: number;
  /** Who holds it, what the gang is called, and its chief. */
  gang: EnemyType;
  gangName: string;
  chief: EnemyType;
}

export const FORTS: Fort[] = [
  { id: 'gibbet', name: 'Gibbet Knoll', region: 'crownroad', x: 544, z: 664, gang: 'footpad', gangName: 'Knoll crew', chief: 'chief_gibbet' },
  { id: 'breakneck', name: 'Breakneck Stockade', region: 'brambledeep', x: 552, z: 936, gang: 'poacher', gangName: 'Breakneck poachers', chief: 'chief_breakneck' },
  { id: 'blackwater', name: 'Blackwater Pale', region: 'saltwind', x: 1480, z: 920, gang: 'wrecker', gangName: 'Blackwater wreckers', chief: 'chief_blackwater' },
  { id: 'reddog', name: 'Red Dog Redoubt', region: 'redstone', x: 1096, z: 856, gang: 'claimjumper', gangName: 'Red Dog jumpers', chief: 'chief_reddog' },
  { id: 'eyrie', name: 'Gaunt\'s Eyrie', region: 'gannet', x: 360, z: -904, gang: 'cliffrobber', gangName: 'Eyrie robbers', chief: 'chief_eyrie' },
  { id: 'stilts', name: 'Stilt Fort', region: 'wrath', x: -936, z: 888, gang: 'fenpoacher', gangName: 'Stilt Fort poachers', chief: 'chief_stilts' },
  { id: 'carrack', name: 'Carrack Pale', region: 'tolmen', x: 280, z: 3080, gang: 'tinthief', gangName: 'Carrack tinners', chief: 'chief_carrack' },
];

export const FORT_BY_ID: Record<string, Fort> = Object.fromEntries(FORTS.map((f) => [f.id, f]));
/** How long an emptied fort stands empty before its gang drifts back, in seconds. */
export const FORT_RESPAWN = 1500;
