// Rooms in the dungeons (docs/DELVES.md; run by game/Rooms.ts): a stretch of the halls that shuts behind
// you and asks something before it lets you on. A gate (an iron portcullis over barrier blocks) seals the
// way out until the room's objective is met; then it rises, and the room's chest is there to open.
//
// Places are in the dungeon's own frame: (x, z) blocks from its origin, as its builder in world/sites.ts
// lays them out; heights are found on the floor at run time.

export type RoomKind = 'levers' | 'plates' | 'keeper';

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
  /** The way on that shuts: the cells across it (only the open ones are filled), and which way the portcullis faces. */
  gate: { cells: [number, number][]; h: number; ry: number };
  /** levers: where each is, what its label says, the order they go in (by index), and a wrong pull's punishment. */
  levers?: { at: [number, number]; label: string }[];
  order?: number[];
  wrong?: string[];
  /** plates: where each is; each stays down this long after you step off; all down at once opens the gate. */
  plates?: [number, number][];
  hold?: number;
  /** keeper: the one that carries the gate's key, and who comes with them. */
  keeper?: { type: string; name: string; at: [number, number]; crew: [number, number, string][] };
  /** The room's chest. */
  chest: [number, number];
  /** A clue to read on the wall, if the room has one: [x, z, title, text]. */
  clue?: [number, number, string, string];
}

export interface DungeonRooms { origin: [number, number]; floor: number; rooms: RoomDef[] }

export const ROOMS: Record<string, DungeonRooms> = {
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
