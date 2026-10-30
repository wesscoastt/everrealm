// Rooms in the dungeons (docs/DELVES.md; run by game/Rooms.ts): a stretch of the halls that shuts behind
// you and asks something before it lets you on. A gate (an iron portcullis over barrier blocks) seals the
// way out until the room's objective is met; then it rises, and the room's chest is there to open.
//
// Places are in the dungeon's own frame: (x, z) blocks from its origin, as its builder in world/sites.ts
// lays them out; heights are found on the floor at run time.

import { ESC } from './kell';
import { KB_HALLS } from '../world/morrow';

export type RoomKind = 'levers' | 'plates' | 'keeper' | 'waves';

export interface RoomDef {
  id: string;
  kind: RoomKind;
  /** What the log says when it shuts on you, and when it lets you go. */
  title: string;
  start: string;
  done: string;
  /** The room's floor, in blocks from the dungeon's (rooms down a ramp sit lower). */
  f?: number;
  /** Standing in here starts the room: [x0, z0, x1, z1]. */
  box: [number, number, number, number];
  /**
   * The way on that shuts: the cells across it (only the open ones are filled), and which way it faces.
   * A portcullis (iron, or the Kilnfolk's brass) drops when the room starts and rises when it's done; hurdles (wattle panels wedged across
   * a cave) are there from the start and are pulled down flat when it's done; ice is there from the start
   * and breaks up.
   */
  gate: { cells: [number, number][]; h: number; ry: number; style?: 'portcullis' | 'brass' | 'hurdle' | 'ice' };
  /** levers: where each is, what its label says, the order they go in (by index), and a wrong pull's punishment. */
  levers?: { at: [number, number]; label: string; h?: number }[];
  /** What the levers are: lamp hooks (lit), glass pillars (struck; h is each one's height), or black slabs (laid back over a niche). */
  leverStyle?: 'lamp' | 'glass' | 'slab';
  order?: number[];
  wrong?: string[];
  /** plates: where each is; each stays down this long after you step off; all down at once opens the gate. */
  plates?: [number, number][];
  hold?: number;
  /** keeper: the one that carries the gate's key, and who comes with them. */
  keeper?: { type: string; name: string; at: [number, number]; crew: [number, number, string][] };
  /** waves: who comes, wave by wave ([x, z, type] each), and what the log says as each after the first comes. */
  waves?: [number, number, string][][];
  waveSays?: string[];
  /** The room's chest. */
  chest: [number, number];
  /** A clue to read on the wall, if the room has one: [x, z, title, text]. */
  clue?: [number, number, string, string];
}

export interface DungeonRooms { origin: [number, number]; floor: number; rooms: RoomDef[] }

export const ROOMS: Record<string, DungeonRooms> = {
  // Kingsbarrow (world/sites.ts buildKingsHalls: origin KB_HALLS)
  'gd-kingsbarrow': {
    origin: [KB_HALLS.x, KB_HALLS.z], floor: KB_HALLS.f,
    rooms: [
      {
        id: 'niches', kind: 'levers', leverStyle: 'slab', title: 'The Long Barrow',
        start: 'A grille of black iron comes down at the end of the Long Barrow. The niches down both walls are empty, the guard in them up and gone, and their black slabs broken on the floor. Four are still whole.',
        done: 'The fourth slab goes back over its niche, and the grille at the end of the barrow lifts. Somewhere down the gallery, something that was walking lies down.',
        box: [12, -4, 44, 4],
        gate: { cells: [[45, -4], [45, -3], [45, -2], [45, -1], [45, 0], [45, 1], [45, 2], [45, 3], [45, 4]], h: 9, ry: Math.PI / 2 },
        levers: [
          { at: [15, -4], label: 'Lay the black over the harper\'s niche' },
          { at: [24, 4], label: 'Lay the black over the king\'s own man\'s niche' },
          { at: [33, -4], label: 'Lay the black over the horse-thane\'s niche' },
          { at: [39, 4], label: 'Lay the black over the shield-bearer\'s niche' },
        ],
        order: [1, 3, 2, 0],
        wrong: ['dg_barrowdead', 'dg_barrowdead'],
        clue: [13, 3, 'Edda Rusk\'s copy of the roll', 'Copied from the Gatekeepers\' oldest roll for whoever goes down there. E. Rusk\n\nTHE KING\'S GUARD AS THEY WERE LAID, NEAREST HIM FIRST:\nHis own man.\nHis shield-bearer.\nThe thane of his horses.\nHis harper, last, by the door, so the king would hear him go.\n\nThey were laid in that order and the black went over them in that order. Do it any other way and the barrow will think you are robbing it.'],
        chest: [42, -3],
      },
      {
        id: 'kneeling', kind: 'waves', title: 'The round hall',
        start: 'A grille drops across the Black Stair behind the round hall. The dead kneeling in rows round the walls lift their heads, one row at a time.',
        done: 'The last row goes back down on its knees, and stays there. The grille over the Black Stair rises.',
        box: [83, 19, 103, 39],
        gate: { cells: [[90, 17], [91, 17], [92, 17], [93, 17], [94, 17], [95, 17], [96, 17]], h: 8, ry: 0 },
        waves: [
          [[86, 22, 'dg_barrowdead'], [100, 22, 'dg_barrowdead']],
          [[86, 36, 'dg_barrowdead'], [100, 36, 'dg_wight'], [93, 39, 'dg_barrowdead']],
          [[84, 29, 'dg_wight'], [102, 29, 'dg_wight'], [86, 22, 'dg_barrowdead'], [100, 36, 'dg_barrowdead']],
        ],
        waveSays: ['The second row gets up off its knees.', 'The last row, the king\'s own, with their swords still in their hands.'],
        chest: [99, 37],
      },
    ],
  },
  // The Escapement (world/sites.ts buildEscapement: origin data/kell.ts ESC)
  'gd-escapement': {
    origin: [ESC.x, ESC.z], floor: ESC.f,
    rooms: [
      {
        id: 'treadles', kind: 'plates', title: 'The Gearhall treadles',
        start: 'A brass grille drops across the far end of the Gearhall. Three treadles in the floor, a long way apart: the night winders\' way of opening it, one man to a treadle.',
        done: 'The third treadle goes down with the other two still down. The wheels along the walls take up, and the grille winds up into the roof.',
        box: [12, -4, 40, 4],
        gate: { cells: [[45, -4], [45, -3], [45, -2], [45, -1], [45, 0], [45, 1], [45, 2], [45, 3], [45, 4]], h: 9, ry: Math.PI / 2, style: 'brass' },
        plates: [[14, 0], [29, -3], [43, 2]],
        hold: 7,
        chest: [40, -3],
      },
      {
        id: 'boilerdeep', kind: 'waves', title: 'The Boiler Deep',
        start: 'The way east shuts with a bang of brass. Down in the pit the boiler\'s fire comes up white, and the Works\' brass men climb off their line to see to whoever is in the Deep.',
        done: 'The fire in the pit drops back to red. Something in the wall lets go, and the brass door east swings open under its own weight.',
        box: [47, 20, 67, 39],
        gate: { cells: [[70, 27], [70, 28], [70, 29], [70, 30], [70, 31]], h: 6, ry: Math.PI / 2, style: 'brass' },
        waves: [
          [[49, 24, 'dg_spring'], [65, 34, 'dg_spring']],
          [[57, 19, 'dg_boiler'], [49, 34, 'dg_warder'], [65, 24, 'dg_spring']],
          [[57, 39, 'dg_boiler'], [49, 24, 'dg_warder'], [65, 24, 'dg_warder'], [65, 34, 'dg_spring']],
        ],
        waveSays: ['The safety valves go, and the steam brings a scald up out of the pit with it.', 'The last of the line, all at once. The boiler\'s gauge is in the red and staying there.'],
        chest: [62, 37],
      },
      {
        id: 'winder', kind: 'keeper', title: 'The winder\'s stair',
        start: 'A grille closes the last stretch to the Escapement. The night winder has its key on a chain round his neck, and he is not going to hand it over.',
        done: 'The winder\'s key fits the grille. It goes up a tooth at a time, ticking.',
        box: [90, 4, 96, 16],
        gate: { cells: [[90, 1], [91, 1], [92, 1], [93, 1], [94, 1], [95, 1], [96, 1]], h: 8, ry: 0, style: 'brass' },
        keeper: { type: 'dg_warder', name: 'The night winder', at: [93, 8], crew: [[91, 13, 'dg_spring'], [95, 13, 'dg_spring']] },
        chest: [95, 5],
      },
    ],
  },
  // Under the Kettle (world/sites.ts buildUnderKettle: origin 712, 1990, floor 40)
  'gd-kettle': {
    origin: [712, 1990], floor: 40,
    rooms: [
      {
        id: 'den', kind: 'waves', title: 'The wolves\' den',
        start: 'The crawl opens into the den, and the shepherds have been here first: hurdles wedged across the north passage, to pen the wolves in. You\'re in the pen with them.',
        done: 'The last of them goes down in the straw. The hurdles across the north passage come away when you pull, the withies brittle with frost.',
        box: [27, -6, 41, 6],
        gate: { cells: [[31, -9], [32, -9], [33, -9], [34, -9], [35, -9], [36, -9]], h: 4, ry: 0, style: 'hurdle' },
        waves: [
          [[30, 6, 'frostwolf'], [38, 6, 'frostwolf']],
          [[24, 0, 'moorwolf'], [42, 4, 'frostwolf'], [42, -4, 'frostwolf']],
          [[30, -6, 'frostwolf'], [38, -6, 'moorwolf'], [24, 2, 'frostwolf'], [42, 0, 'frostwolf']],
        ],
        waveSays: ['More of them, out of the crawls in the back wall. The pack was bigger than the shepherds thought.', 'The rest of the pack, all at once. One of them is wearing a shepherd\'s collar bell.'],
        chest: [40, 5],
      },
      {
        id: 'glassdrift', kind: 'levers', leverStyle: 'glass', title: 'The singing drift',
        f: -8,
        start: 'Ice has grown right across the way down to the heart, thick as a door. Four pillars of glass stand in the drift, and when you brush one the ice hums back.',
        done: 'The smallest pillar rings, the ice across the way answers it, and a crack runs up it floor to roof. It falls in pieces.',
        box: [66, 2, 78, 10],
        gate: { cells: [[70, 13], [71, 13], [72, 13], [73, 13], [74, 13]], h: 5, ry: 0, style: 'ice' },
        levers: [
          { at: [68, 4], label: 'Strike the middling pillar', h: 1.8 },
          { at: [76, 4], label: 'Strike the tallest pillar', h: 3.0 },
          { at: [68, 8], label: 'Strike the smallest pillar', h: 1.2 },
          { at: [76, 8], label: 'Strike the tall pillar', h: 2.4 },
        ],
        order: [1, 3, 0, 2],
        wrong: ['shardjelly', 'shardjelly'],
        clue: [70, 3, 'Scratched in the ice wall', 'Struck them all. Wrong order and the jellies come up out of the floor.\nRight order is biggest first, down to the smallest. The ice by the heart rings back and cracks.\nTook us four goes.\nDai Prosser, Michaelmas'],
        chest: [74, 9],
      },
    ],
  },
  // The Old Man's Workings (world/sites.ts buildOldMan: origin 208, -60, floor 5)
  'gd-oldman': {
    origin: [208, -60], floor: 5,
    rooms: [
      {
        id: 'lamproom', kind: 'levers', title: 'The lamp room',
        start: 'The gate into Number Four drops behind the ladder. Four lamp hooks on the walls, every one cold. A board by the ladder lists the shifts.',
        done: 'The fourth lamp catches, and somewhere above the gallery a counterweight drops. The gate into Number Four rises.',
        box: [2, -3, 8, 3],
        gate: { cells: [[10, -2], [10, -1], [10, 0], [10, 1], [10, 2]], h: 5, ry: Math.PI / 2 },
        levers: [
          { at: [3, -2], label: 'Light the first lamp hook' },
          { at: [4, 2], label: 'Light the second lamp hook' },
          { at: [6, -2], label: 'Light the third lamp hook' },
          { at: [7, 2], label: 'Light the fourth lamp hook' },
        ],
        order: [1, 3, 0, 2],
        wrong: ['dg_rustback', 'dg_rustback'],
        clue: [2, 3, 'The shift board', 'NUMBER FOUR. LAMPS LIT BY SHIFT, IN THIS ORDER:\nTHE DAY MEN (second hook)\nTHE NIGHT MEN (fourth hook)\nTHE BOYS (first hook)\nTHE FOREMAN (third hook)\n\nA lamp lit out of turn and the gate stays down. H. Dunmore\n\nUnder it, in pencil: "and wakes whatever is eating the props"'],
        chest: [5, 0],
      },
      {
        id: 'lookout', kind: 'keeper', title: 'Number Four\'s end',
        start: 'A grille drops across the drift to the north. The night shift\'s lookout has its key on his belt, and he has seen you.',
        done: 'The lookout\'s key turns in the grille, stiff with rust, and it lifts.',
        box: [32, -5, 45, 5],
        gate: { cells: [[33, -7], [34, -7], [35, -7], [36, -7], [37, -7], [38, -7]], h: 5, ry: 0 },
        keeper: { type: 'dg_lampman', name: 'The night shift\'s lookout', at: [36, -3], crew: [[34, 3, 'dg_nightman']] },
        chest: [44, -3],
      },
      {
        id: 'drift', kind: 'plates', title: 'The hatchlings\' drift',
        start: 'A grille comes down across the way to the old man. Three flagstones in the floor are worn smooth: the night shift\'s plates. Each one stays down a little while after you step off it.',
        done: 'The third plate goes down while the first two are still down, and the grille grinds up into the rock.',
        box: [66, 0, 78, 8],
        gate: { cells: [[70, 11], [71, 11], [72, 11], [73, 11], [74, 11], [75, 11], [76, 11]], h: 5, ry: 0 },
        plates: [[67, 2], [77, 2], [72, 7]],
        hold: 5,
        chest: [69, 7],
      },
    ],
  },
};
