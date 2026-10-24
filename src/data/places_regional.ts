import type { GameApi } from '../game/api';
import type { EnemyType } from './gameplay';
import type { LandId } from '../world/land';
import { coastX } from '../world/terrain';
import { POSTS, postBoxOf } from './travel';

// Fixed points in the regional towns: where people stand, what can be examined, and where quest
// creatures appear. Coordinates come from the site builders in src/world/sites.ts.

/** Ansbury: keep at the centre of a 140-block walled square. */
export const ALDERMERE = { cx: 820, cz: 300, south: 370 };
/** Gullmouth sits on the shoreline at z = 600. */
export const GULL = { coast: coastX(600), z: 600 };
/** Fleet Light is built 14 blocks inland of the shore at z = 330. */
export const LIGHT = { x: coastX(330) - 14, z: 330 };
/** The Gannet's hull starts 22 blocks out from the shore at z = 780. */
export const WRECK = { x: coastX(780) + 22, z: 780 };
/** Harrowgate Works: palisade 30 blocks around this point. */
export const WORKS = { cx: 1000, cz: 1000 };
export { CRAGSBY, HOLME, SCARROW } from './travel';

/** Fellers' Camp in Hagworm Wood: firepit at the centre, log stack to the east. */
export const CAMP = { x: 446, z: 520 };
/** Kelderby, a slate-roofed hamlet on the Scarth plateau; the well is at the centre. */
export const COLD = { x: 300, z: 1460 };
/** Scarth Watch observatory tower. */
export const STARWATCH = { x: 600, z: 1700 };
/** Hale's Fold: the shepherds' bothy on the ridge above Kelderby; the fold is east of it. */
export const FOLD = { x: 376, z: 1380 };

// ---------------------------------------------------------------- Main story: The Charter's Debt
/** Ketley Arches: five arches along z 860; the antiquarian camps south of them. */
export const MOSSGATE = { x: 176, z: 860 };
/** The Hollow Oak: a trunk you can stand inside, door to the south. */
export const OAK = { x: 304, z: 600, floor: 24 };
/** Gallows Knap, and the undercroft beneath it (see buildUndercroft in sites.ts). */
export const CROWN = { x: 1250, z: 1250, hallFloor: 7, cutFloor: 3 };
/** Glass Kirk: crystal mass at the centre of a paved floor at y 89. */
export const TEMPLE = { x: 1190, z: 1800 };

import { COTTAGE, LAND_BOARD, lotFront, LOTS } from './housing';
export { COTTAGE };

/** The Charter Bank's counters, at the doors of the main towns' counting houses. */
export const BANKS = [
  // Inside, at the counter, straight in from the door (world/interiors.ts fits the bank room); y is the
  // ground floor, so the floor above isn't taken for where you stand
  { id: 'ansbury', name: 'the Weighhouse, Ansbury', x: 828.5, z: 347.5, y: 24 },
  { id: 'gullmouth', name: 'the harbour office, Gullmouth', x: Math.floor(coastX(600) - 30) + 4.5, z: 583.5, y: 19 },
  { id: 'harrowgate', name: 'the company office, Harrowgate', x: 984.5, z: 991.5, y: 25 },
];

/** Something in the world the player can examine with E. */
export interface WorldThing {
  /** The land it's in (world/land.ts); none given, the Counties. */
  land?: LandId;
  id: string;
  x: number;
  z: number;
  label: string;
  radius: number;
  /** Floor height for things underground; otherwise the ground under (x, z). */
  y?: number;
  /** Only interactable when this holds. */
  when?: (g: GameApi) => boolean;
  /** Key into READABLES to show; or an action. */
  read?: string;
  use?: (g: GameApi) => void;
}

export const WORLD_THINGS: WorldThing[] = [
  ...POSTS.map((p): WorldThing => ({ land: p.land, id: 'post:' + p.id, x: p.x, z: p.z, label: p.ferryFrom ? 'Take the ferry' : 'Take the Charter Post', radius: 2.6, use: (g) => g.openTravel(p.id) })),
  // A post box by every Post sign: letters to other characters, and what came in theirs (game/Mail.ts)
  ...POSTS.map((p): WorldThing => { const b = postBoxOf(p); return { id: 'mail:' + p.id, x: b.x + Math.sin(b.ry), z: b.z + Math.cos(b.ry), label: 'Read your post', radius: 1.6, use: (g) => g.openMail() }; }),
  // Gullmouth's ferry steps, on the south jetty (the ferry berths beside it: world/Ferry.ts)
  { id: 'ferry:gullmouth', x: GULL.coast - 8.5, z: 607.5, label: 'Take the ferry to the Mewstones', radius: 2.6, use: (g) => g.openTravel('gullmouth') },
  { id: 'homeBuy', x: COTTAGE.x0 + 4.5, z: COTTAGE.z0 + COTTAGE.d + 1.5, label: 'Read the For Sale notice', radius: 2.4, when: (g) => !g.flag('home'), use: (g) => g.buyHome() },
  // The Charter Bank's counters: one vault, reached from any of them
  ...BANKS.map((b): WorldThing => ({ id: 'bank:' + b.id, x: b.x, z: b.z, y: b.y, label: `Use the bank (${b.name})`, radius: 1.8, use: (g) => g.openBank(b.id) })),
  { id: 'landBoard', x: LAND_BOARD.x, z: LAND_BOARD.z, label: 'Read the Charter land board', radius: 2.4, read: 'landBoard' },
  // A stake at the front of each lot: lease it, draw up plans, build
  ...LOTS.map((l): WorldThing => {
    const f = lotFront(l);
    return { id: 'lot:' + l.id, x: f.x, z: f.z, label: `Look at ${l.name}`, radius: 2.6, use: (g) => g.lotAction(l.id) };
  }),
  { id: 'homeBench', x: COTTAGE.bench.x, z: COTTAGE.bench.z, label: "Work at the joiner's bench", radius: 2.4, when: (g) => !!g.flag('home'), use: (g) => g.openCrafting('bench') },
  { id: 'aldermereToll', x: ALDERMERE.cx + 8.5, z: ALDERMERE.south + 4.5, label: 'Read the toll board', radius: 2.4, read: 'aldermereToll' },
  // Main story clues
  { id: 'charterNotice', x: ALDERMERE.cx - 8.5, z: ALDERMERE.south + 4.5, label: 'Read the Charter notice', radius: 2.4, read: 'charterNotice' },
  { id: 'mossArch', x: MOSSGATE.x + 2.5, z: MOSSGATE.z + 1.5, label: 'Look at the arch', radius: 2.6, read: 'mossArch', when: (g) => !!g.stage('storyMossgate') },
  {
    // y: the floor inside the trunk (measuring from above would find the canopy)
    id: 'oakHollow', x: OAK.x + 0.5, z: OAK.z + 0.5, y: OAK.floor, label: 'Search the roots inside the Oak', radius: 2.2,
    when: (g) => g.stage('storyMossgate') === 'oak' && Number(g.flag('kills:oak') ?? 0) >= 2 && !g.has('mossgate_slate'),
    use: (g) => { if (g.give('mossgate_slate')) { g.toast('Under the letters and the leaf mould, wedged between two roots: a slate, scratched with pictures.'); g.setStage('storyMossgate', 'slate'); } },
  },
  { id: 'surveyNotes', x: CROWN.x + 31.5, z: CROWN.z + 18.5, y: CROWN.hallFloor, label: 'Read the survey notes', radius: 2.4, read: 'surveyNotes' },
  { id: 'crownTally', x: CROWN.x + 31.5, z: CROWN.z + 59, y: CROWN.cutFloor, label: 'Look at the tally wall', radius: 3.4, read: 'crownTally', when: (g) => !!g.stage('storyCrown') },
  // Marker only: where Harrowgate's crew cut the Kirk floor (nothing to press E on).
  { id: 'templeCut', x: TEMPLE.x + 11, z: TEMPLE.z, label: '', radius: 0, when: () => false },
  { id: 'ilseGlass', x: STARWATCH.x + 3.5, z: STARWATCH.z + 9.5, label: 'Look through the glass', radius: 2.4, read: 'ilseGlass', when: (g) => !!g.stage('storyStar') && g.stage('storyStride') !== 'glass' },
  {
    id: 'gannetChest', x: WRECK.x - 3, z: WRECK.z + 2, label: 'Search under the bow', radius: 3,
    when: (g) => g.stage('gannetLog') === 'chest',
    use: (g) => {
      if (g.give('maddox_chest')) g.toast('Under the broken bow, wedged in the sand: a sea chest.');
    },
  },
  { id: 'lightOilBook', x: LIGHT.x + 5.5, z: LIGHT.z + 1.5, label: 'Read the oil book', radius: 2.2, read: 'lightOilBook', when: (g) => !!g.stage('gannetLog') && g.stage('gannetLog') !== 'crabs' && g.stage('gannetLog') !== 'chest' },
  { id: 'harrowNotice', x: WORKS.cx - 3, z: WORKS.cz + 27, label: 'Read the company notice', radius: 2.4, read: 'harrowNotice' },
  { id: 'campOrder', x: CAMP.x - 6.5, z: CAMP.z - 5.5, label: 'Read the order slip', radius: 2.4, read: 'campOrder' },
  { id: 'weatherLog', x: STARWATCH.x - 3.5, z: STARWATCH.z + 9.5, label: 'Read the weather log', radius: 2.2, read: 'weatherLog' },
  { id: 'pryceBook', x: WORKS.cx - 12.5, z: WORKS.cz - 4.5, label: 'Read Mr Pryce\'s purchase book', radius: 2, read: 'pryceBook', when: (g) => g.stage('fairPrice') === 'getPick' },
];

/** Creatures a quest puts in the world while it needs them. */
export interface QuestSpawn {
  /** The land it's in (world/land.ts); none given, the Counties. */
  land?: LandId;
  tag: string;
  type: EnemyType;
  at: [number, number][];
  /** Floor height for creatures placed underground; otherwise they stand on the surface. */
  y?: number;
  when: (g: GameApi) => boolean;
}

export const QUEST_SPAWNS: QuestSpawn[] = [
  {
    tag: 'gannet', type: 'crab',
    at: [[WRECK.x - 6, WRECK.z + 5], [WRECK.x - 2, WRECK.z - 5], [WRECK.x - 9, WRECK.z - 1]],
    when: (g) => g.stage('gannetLog') === 'crabs',
  },
  {
    tag: 'fold', type: 'frostwolf',
    at: [[FOLD.x + 10, FOLD.z + 10], [FOLD.x - 9, FOLD.z + 9], [FOLD.x + 14, FOLD.z - 9]],
    when: (g) => g.stage('highPasture') === 'findBryn',
  },
  // Main story
  { tag: 'oak', type: 'thornwolf', at: [[OAK.x - 9, OAK.z + 10], [OAK.x + 10, OAK.z + 8]], when: (g) => g.stage('storyMossgate') === 'oak' },
  {
    tag: 'crownHall', type: 'redback', y: CROWN.hallFloor,
    at: [[CROWN.x - 3, CROWN.z + 24], [CROWN.x + 2, CROWN.z + 28], [CROWN.x, CROWN.z + 30]], // clear of the hall's pillars
    when: (g) => ['descend', 'queen'].includes(g.stage('storyCrown') ?? ''),
  },
  {
    tag: 'crownCamp', type: 'shardjelly', y: CROWN.hallFloor,
    at: [[CROWN.x + 29, CROWN.z + 26], [CROWN.x + 34, CROWN.z + 30]],
    when: (g) => ['descend', 'queen'].includes(g.stage('storyCrown') ?? ''),
  },
  { tag: 'queen', type: 'rustqueen', y: CROWN.cutFloor, at: [[CROWN.x + 31, CROWN.z + 50]], when: (g) => ['descend', 'queen'].includes(g.stage('storyCrown') ?? '') },
  {
    tag: 'lift', type: 'shardjelly',
    at: [[TEMPLE.x + 6, TEMPLE.z - 6], [TEMPLE.x + 16, TEMPLE.z + 6], [TEMPLE.x + 15, TEMPLE.z - 7]],
    when: (g) => g.stage('storyLift') === 'fight',
  },
  { tag: 'oldglass', type: 'oldglass', at: [[TEMPLE.x + 11, TEMPLE.z]], when: (g) => g.stage('storyLift') === 'fight' },
];

// Side content: things to examine, quest creatures, and notice boards (src/data/content).
import { BOARDS, CONTENT } from './content';
for (const c of CONTENT) { WORLD_THINGS.push(...(c.things ?? [])); QUEST_SPAWNS.push(...(c.spawns ?? [])); }
for (const b of BOARDS) {
  if (b.interactable) continue; // opened from the authored interactable (see Game.useThing)
  WORLD_THINGS.push({ land: b.land, id: 'board:' + b.id, x: b.x, z: b.z, y: b.y, label: 'Read the notice board', radius: 2.4, use: (g) => g.openBoard(b.id) });
}
