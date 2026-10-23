import type { CallingId } from './classes';
import type { Appearance, HeldItem } from '../entities/humanoid';
import { dungeonArmour } from './armour';
import { DUNGEON_WEAPONS } from './weapons';

// Group dungeons, in the manner of ESO's: built into the world behind a door, for four (one to
// hold the creatures, one to heal, two to do the damage). The Group Finder (key P) makes a group
// from the players queued for one, and henchmen fill any place nobody takes, the way Guild Wars
// hired them at the outposts. A run belongs to its group: the creatures are put down for it when
// it goes in and stay dead until it leaves. The halls are in world/sites.ts (buildOldMan), the run
// in game/Dungeons.ts, the henchmen in entities/Ally.ts, the queue in server/finder.mjs.

export type Role = 'tank' | 'healer' | 'damage';
export const ROLES: Role[] = ['tank', 'healer', 'damage'];
export const ROLE_NAMES: Record<Role, string> = { tank: 'Tank', healer: 'Healer', damage: 'Damage' };
export const ROLE_DESC: Record<Role, string> = {
  tank: 'Stands in front and keeps the creatures on you.',
  healer: 'Keeps the group on its feet: your blows mend whoever is most hurt near you.',
  damage: 'Brings the creatures down.',
};
/** A full group: one to hold, one to heal, two to hit. */
export const PARTY: Role[] = ['tank', 'healer', 'damage', 'damage'];
/** What each calling plays unless you choose otherwise. */
export const CALLING_ROLE: Record<CallingId, Role> = { warden: 'tank', reaver: 'damage', ashcaller: 'damage', pathfinder: 'damage', wizard: 'damage' };

/** A boss's fight: what's said, the creatures it calls in, and what it throws at the floor. */
export interface BossPlan {
  /** Its epithet, on the title card when the fight starts. */
  title?: string;
  /** Said when the fight starts, and when it ends: [speaker ('' for what you see), line]. */
  pull: [string, string];
  fall: [string, string];
  /** Calls in creatures as its health drops past each share. */
  adds?: { at: number; types: string[]; line: [string, string] }[];
  /**
   * Every so many seconds, a circle under that many of the group, filling for the wind-up; whoever
   * is still in it when it lands takes the damage. Move or roll out.
   */
  hazard?: { every: number; count: number; r: number; windup: number; damage: number; color: string; line: string };
  /** Its big moves, each on its own clock (see BossMove). */
  moves?: BossMove[];
  /** Said when it turns (below 35% health it fights faster, and its moves come sooner). */
  phase?: [string, string];
  /** What it can drop: a piece for you, at this chance (always at least one from the last boss). */
  drops: string[];
  chance: number;
}

/**
 * A boss's big move, in the manner of the big games: marked on the floor while it winds up (the boss
 * stands and faces where it means to strike), then it lands on whoever is still inside.
 * - cone: a sweep in front of it, at whoever it's fighting (they take half: they're braced for it).
 * - charge: a lane at someone not holding it; it rushes down the lane when the wind-up ends.
 * - nova: everything round it: get out.
 * - stack: a circle on someone not holding it, that follows them until just before it lands; its
 *   damage is shared between everyone inside (alone, it's half again as much): get together.
 * {name} in the line is who it's aimed at.
 */
export interface BossMove {
  kind: 'cone' | 'charge' | 'nova' | 'stack';
  every: number;
  windup: number;
  damage: number;
  /** Reach: the cone's and the nova's radius, the lane's length, the stack circle's radius. */
  r: number;
  /** The cone's arc (degrees) or the lane's width. */
  w?: number;
  color: string;
  line: string;
}

/** A line once, the first time the group comes into a place: a henchman says it if they're along (Bet, unless another is named), otherwise it's what you see. */
export interface Note { x: number; z: number; r: number; said: string; seen: string; who?: string }

export interface DungeonDef {
  /** The site the halls are built at (sites.ts). */
  id: string;
  name: string;
  where: string;
  /** The level its numbers were written for: creatures, ground circles and the chest are scaled from it to yours. */
  level: number;
  blurb: string;
  /** The way in, out in the world (press E), and where you come back out (x, y, z, facing). */
  door: [number, number, number];
  out: [number, number, number, number];
  bosses: BossPlan[];
  notes: Note[];
  /** The chest at the end: marks, experience, and what's inside. */
  chest: { xp: number; marks: number; items: string[] };
}

const OLDMAN_GEAR = [...dungeonArmour('gd-oldman'), 'pitlamp_cap', ...(DUNGEON_WEAPONS['gd-oldman'] ?? [])];
const KETTLE_GEAR = [...dungeonArmour('gd-kettle'), 'shepherd_hood', ...(DUNGEON_WEAPONS['gd-kettle'] ?? [])];
const ESC_GEAR = [...dungeonArmour('gd-escapement'), ...(DUNGEON_WEAPONS['gd-escapement'] ?? [])];

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'gd-oldman', name: 'The Old Man\'s Workings', where: 'Sallow Pit, Hollindale', level: 10,
    blurb: 'Number Four gallery has been shut since the roof came in at Candlemas. Lamps go missing from the lamp room, and copper goes up the shaft at night that never went through Hesk Dunmore\'s carts.',
    door: [256.5, 22, 92.5], out: [253.5, 22, 92.5, -Math.PI / 2],
    bosses: [
      {
        title: 'Foreman of the night shift',
        pull: ['Coll Bray', 'Company sent you, did they? Company can come down itself.'],
        adds: [{ at: 0.5, types: ['dg_nightman'], line: ['Coll Bray', 'Ned! Leave the crates, get over here!'] }],
        hazard: { every: 9, count: 1, r: 3, windup: 1.6, damage: 36, color: '#ffb040', line: 'Coll Bray throws a lit lamp.' },
        fall: ['Coll Bray', 'We only took what was lying loose. Something else is eating the seam. Go and look if you don\'t believe me.'],
        moves: [
          { kind: 'cone', every: 11, windup: 1.3, damage: 30, r: 4.5, w: 100, color: '#ff9a50', line: 'Coll Bray swings his pick round, wide.' },
          { kind: 'charge', every: 16, windup: 1.3, damage: 34, r: 13, w: 2.4, color: '#ff7a40', line: 'Coll Bray puts his head down at {name}.' },
        ],
        phase: ['Coll Bray', 'Right. No more being nice about it.'],
        drops: ['bray_hanger', 'cape_picks', ...OLDMAN_GEAR], chance: 0.6,
      },
      {
        title: 'What the pumps held back',
        pull: ['', 'The water in the sump heaves, and most of it gets up.'],
        adds: [
          { at: 0.66, types: ['dg_seep', 'dg_seep'], line: ['', 'Two lumps of Old Sump slide off into the water and come back out on their own.'] },
          { at: 0.33, types: ['dg_seep', 'dg_seep'], line: ['', 'It splits again.'] },
        ],
        hazard: { every: 8, count: 2, r: 3.2, windup: 1.8, damage: 34, color: '#7ac07a', line: 'The floor bulges where the water is coming up.' },
        fall: ['', 'Old Sump goes flat and runs away between the stones.'],
        moves: [
          { kind: 'nova', every: 15, windup: 2.0, damage: 40, r: 6.5, color: '#7ac07a', line: 'Old Sump draws itself in, shaking. Get away from it.' },
        ],
        phase: ['', 'Old Sump heaves, and the water in the pool comes up to meet it.'],
        drops: OLDMAN_GEAR, chance: 0.6,
      },
      {
        title: 'Mother of the seam',
        pull: ['', 'The copper in the wall moves. It isn\'t copper: it\'s a rustback the size of a cart, green right through.'],
        adds: [
          { at: 0.75, types: ['dg_hatchling', 'dg_hatchling', 'dg_hatchling'], line: ['', 'A clutch splits open in the wall.'] },
          { at: 0.5, types: ['dg_hatchling', 'dg_hatchling', 'dg_hatchling'], line: ['', 'Another clutch splits open.'] },
          { at: 0.25, types: ['dg_hatchling', 'dg_hatchling', 'dg_hatchling', 'dg_hatchling'], line: ['', 'The walls are full of them.'] },
        ],
        hazard: { every: 10, count: 2, r: 3.5, windup: 1.8, damage: 42, color: '#c8b090', line: 'Grit pours from the roof where Verdigris hit the wall.' },
        fall: ['', 'Verdigris goes down on its side, and the hatchlings scatter into the cracks.'],
        moves: [
          { kind: 'charge', every: 12, windup: 1.4, damage: 46, r: 16, w: 3, color: '#7ac8a0', line: 'Verdigris scrapes the floor and lowers its head at {name}.' },
          { kind: 'stack', every: 18, windup: 3.0, damage: 70, r: 3, color: '#c8f060', line: 'Verdigris spits a clot of green at {name}. Get round them and share it.' },
        ],
        phase: ['', 'Verdigris sheds its old shell. Underneath, the new one is still soft, and it is angrier.'],
        drops: OLDMAN_GEAR, chance: 1,
      },
    ],
    notes: [
      { x: 228, z: -60, r: 7, said: 'Number Four. They shut it after the roof came in. Somebody\'s been greasing the rails.', seen: 'Number Four gallery. The rails have been greased, and not long ago.' },
      { x: 241, z: -78, r: 9, said: 'That\'s ore sorted by hand. No company stamp on any of it.', seen: 'Crates of ore, sorted by hand. None of them carries the company\'s stamp.' },
      { x: 268, z: -86, r: 9, said: 'Pumps have been off since Candlemas. That\'s a lot of water.', seen: 'The sump. The pumps have been off for months, and the water has come back up.' },
      { x: 280, z: -40, r: 8, said: 'That\'s the old man. Fire-set, look at the soot. Nobody\'s cut rock like that in a hundred years.', seen: 'Old workings, older than the Pit: the walls are black where fires were lit against the rock to crack it.' },
    ],
    chest: { xp: 1400, marks: 60, items: ['copper_ore', 'copper_ore', 'copper_ore', 'rustback_shell', 'bronze_bar', 'bronze_bar'] },
  },
  {
    id: 'gd-kettle', name: 'Under the Kettle', where: 'The Kettle, Scarth Highlands', level: 30,
    blurb: 'Kelderby folds its ewes in the crack in the Kettle\'s north wall every winter. This winter something came up out of the back of the crack and took nine, and the shepherds have seen a light down there that they don\'t like.',
    door: [807.5, 51, 2040.5], out: [807.5, 51, 2043.5, 0],
    bosses: [
      {
        title: 'First of the pack',
        pull: ['', 'A grey wolf the size of a pony stands up on the ledge. The pack looks at it before it looks at you.'],
        adds: [{ at: 0.5, types: ['frostwolf', 'frostwolf'], line: ['', 'Brack howls, and two more come down off the ledges.'] }],
        hazard: { every: 9, count: 1, r: 3, windup: 1.6, damage: 60, color: '#dde6ee', line: 'Brack\'s howl shakes ice loose from the roof.' },
        fall: ['', 'Brack goes down. The rest of the pack is gone before it lands.'],
        moves: [
          { kind: 'charge', every: 10, windup: 1.0, damage: 62, r: 14, w: 2.6, color: '#dde6ee', line: 'Brack crouches to spring at {name}.' },
          { kind: 'cone', every: 13, windup: 1.1, damage: 58, r: 4.5, w: 80, color: '#c8ccd2', line: 'Brack snaps left and right.' },
        ],
        phase: ['', 'Brack throws its head back and howls, and the whole cave answers.'],
        drops: ['fell_knife', 'cape_snowflake', ...KETTLE_GEAR], chance: 0.6,
      },
      {
        title: 'Eater of the seep',
        pull: ['', 'Something grinds in the seep, stone on glass. A graniteback the size of a cart turns round, chewing.'],
        adds: [{ at: 0.5, types: ['graniteback', 'graniteback'], line: ['', 'Two younger granitebacks back out of the walls.'] }],
        hazard: { every: 8, count: 2, r: 3.2, windup: 1.8, damage: 64, color: '#a8b0b8', line: 'Millstone rams the wall, and rock comes down.' },
        fall: ['', 'Millstone stops chewing.'],
        moves: [
          { kind: 'cone', every: 9, windup: 1.2, damage: 60, r: 5.5, w: 120, color: '#a8b0b8', line: 'Millstone swings its tail round.' },
          { kind: 'nova', every: 14, windup: 1.8, damage: 70, r: 6, color: '#c8ccd0', line: 'Millstone curls up, grinding. Get clear.' },
        ],
        phase: ['', 'Millstone stops chewing and starts to roll.'],
        drops: KETTLE_GEAR, chance: 0.6,
      },
      {
        title: 'Light of the fallen star',
        pull: ['', 'The light at the bottom of the Kettle moves, and comes toward you. It\'s a jelly, grown in the crystal, and you can see through it.'],
        adds: [
          { at: 0.75, types: ['shardjelly', 'shardjelly'], line: ['', 'Pieces of the Glim break off and go on without it.'] },
          { at: 0.5, types: ['shardjelly', 'shardjelly'], line: ['', 'More pieces break off.'] },
          { at: 0.25, types: ['shardjelly', 'shardjelly'], line: ['', 'The Glim is coming apart, and every piece is still alive.'] },
        ],
        hazard: { every: 9, count: 2, r: 3.5, windup: 1.8, damage: 60, color: '#9fe8ff', line: 'Shards of crystal come down from the roof where the Glim touches it.' },
        fall: ['', 'The Glim goes dark, and the cave goes dark with it, until your eyes find the lanterns again.'],
        moves: [
          { kind: 'stack', every: 16, windup: 3.2, damage: 120, r: 3.2, color: '#c8f4ff', line: 'The Glim\'s light gathers on {name}. Stand with them.' },
          { kind: 'nova', every: 18, windup: 2.2, damage: 80, r: 7, color: '#9fe8ff', line: 'The Glim brightens until it hurts to look at. Get away from it.' },
        ],
        phase: ['', 'The Glim goes white. Every crystal in the cave lights with it.'],
        drops: KETTLE_GEAR, chance: 1,
      },
    ],
    notes: [
      { x: 732, z: 1990, r: 7, who: 'osgood', said: 'Wolves have been laying up in here. Mind the bones.', seen: 'Wool and bones on the floor: the wolves have been laying up in here.' },
      { x: 744, z: 1972, r: 9, who: 'osgood', said: 'There. On the ledge. That\'s the big one.', seen: 'A ledge runs round the back of the cave, and something big is lying on it.' },
      { x: 770, z: 1963, r: 9, who: 'osgood', said: 'That\'s not ice. That\'s glass, grown. I\'ve cut stone thirty years and never seen that.', seen: 'The ice here has grown into glass: clear columns standing up out of the floor.' },
      { x: 784, z: 2006, r: 8, who: 'osgood', said: 'Light down there. Nobody look straight at it.', seen: 'Light comes up the drift from below, white and steady.' },
    ],
    chest: { xp: 4800, marks: 140, items: ['star_crystal', 'star_crystal', 'frost_pelt', 'iron_bar', 'iron_bar'] },
  },
  {
    id: 'gd-escapement', name: 'The Escapement', where: 'The Kiln, Isle of Kell', level: 40,
    blurb: 'The engine under the Kiln lets the mountain breathe out a tick at a time. Since spring it has been ticking too fast: the vents scald, the old automata are up and working, and they will not let anyone down to stop it.',
    door: [2738.5, 58, -673.5], out: [2738.5, 58, -670.5, 0],
    bosses: [
      {
        title: 'Lamplighter of the Escapement',
        pull: ['', 'An automaton in a wide hat turns from the lamp it is trimming. It holds up its hook, and every lamp in the gallery brightens at once.'],
        adds: [{ at: 0.5, types: ['dg_spring', 'dg_spring'], line: ['', 'Old Tallow strikes the floor with its hook. Two springs uncoil out of the walls.'] }],
        moves: [
          { kind: 'cone', every: 10, windup: 1.2, damage: 76, r: 5, w: 100, color: '#ffc060', line: 'Old Tallow swings its lamp-hook round, wide.' },
          { kind: 'charge', every: 15, windup: 1.2, damage: 84, r: 14, w: 2.6, color: '#ffb040', line: 'Old Tallow strides at {name}, hook raised.' },
        ],
        phase: ['', 'Old Tallow\'s lamps gutter and go out. In the dark you can hear it winding itself tighter.'],
        hazard: { every: 9, count: 2, r: 3, windup: 1.6, damage: 70, color: '#ffb040', line: 'Oil drips from the lamps and catches.' },
        fall: ['', 'Old Tallow sets its hook down on the floor, carefully, and stops. The lamps stay lit.'],
        drops: ESC_GEAR, chance: 0.6,
      },
      {
        title: 'Keeper of the speed',
        pull: ['', 'The thing in the middle of the chamber is a regulator the size of a cart: two brass arms with a weight on each, spinning. The weights are crystal. They should hang lower than that.'],
        adds: [
          { at: 0.66, types: ['dg_boiler', 'dg_boiler'], line: ['', 'Valves open round the walls, and the steam that comes out gets up and walks.'] },
          { at: 0.33, types: ['dg_boiler', 'dg_boiler'], line: ['', 'More valves blow.'] },
        ],
        moves: [
          { kind: 'nova', every: 14, windup: 2.0, damage: 90, r: 7, color: '#e8c878', line: 'The Governor spins up, and its weights swing out wide. Get clear of it.' },
          { kind: 'stack', every: 17, windup: 3.0, damage: 150, r: 3.2, color: '#ffe8a0', line: 'The Governor locks onto {name}. Stand with them and share it.' },
        ],
        phase: ['', 'One of the crystal weights cracks. The Governor runs faster on one arm than the other, and the whole chamber shakes with it.'],
        hazard: { every: 10, count: 2, r: 3.2, windup: 1.8, damage: 70, color: '#ffffff', line: 'Steam bursts up through the floor plates.' },
        fall: ['', 'The Governor\'s arms drop. It turns, slower, slower, and stops, its crystal weights hanging no lower than they did.'],
        drops: ESC_GEAR, chance: 0.6,
      },
      {
        title: 'The heart of the Escapement',
        pull: ['', 'The great wheel on the far wall turns a tooth, and the floor jumps. Under it, something coiled the size of a barn lets go a turn, and comes for you.'],
        adds: [
          { at: 0.75, types: ['dg_spring', 'dg_spring', 'dg_spring'], line: ['', 'Loose springs come off the Mainspring and bounce across the floor.'] },
          { at: 0.5, types: ['dg_warder', 'dg_warder'], line: ['', 'Two wardens come down the stair from the Governor\'s chamber, hammers up.'] },
          { at: 0.25, types: ['dg_spring', 'dg_spring', 'dg_spring', 'dg_spring'], line: ['', 'The Mainspring sheds coil after coil.'] },
        ],
        moves: [
          { kind: 'charge', every: 11, windup: 1.3, damage: 100, r: 18, w: 3.2, color: '#d07a44', line: 'The Mainspring winds back to throw itself at {name}.' },
          { kind: 'stack', every: 18, windup: 3.0, damage: 170, r: 3.2, color: '#8ad8c0', line: 'The great wheel ticks, and the floor round {name} lifts. Stand with them.' },
          { kind: 'nova', every: 21, windup: 2.2, damage: 100, r: 8, color: '#e8c878', line: 'The Mainspring tightens on itself, every coil grinding. Get away from it.' },
        ],
        phase: ['', 'The great wheel stops. For a breath the Escapement is silent. Then the Mainspring lets go all at once.'],
        fall: ['', 'The Mainspring runs down, coil by coil, until it lies still. Somewhere above, the great wheel ticks once, then again, a long breath apart. Slow.'],
        drops: ESC_GEAR, chance: 1,
      },
    ],
    notes: [
      { x: 2704, z: -690, r: 8, who: 'osgood', said: 'Listen to that. Every wheel in here\'s turning. Something wants to run.', seen: 'Every wheel along the gallery is turning, too fast, and the floor hums with it.' },
      { x: 2745, z: -690, r: 9, who: 'edith', said: 'Somebody\'s kept these lamps trimmed. Recently.', seen: 'The lamps round the gallery are trimmed and lit. Somebody keeps them.' },
      { x: 2745, z: -661, r: 9, who: 'osgood', said: 'That\'s a boiler, that is. Or it was. Mind the pit.', seen: 'The Deep: a pit of live rock under the plates, and the heat coming off it like an oven door.' },
      { x: 2781, z: -702, r: 10, who: 'tom', said: 'That wheel\'s the size of a mill. And it\'s ticking like a pocket watch.', seen: 'The great wheel fills the far wall. It ticks, fast and hard, and the floor jumps with every tick.' },
    ],
    chest: { xp: 9000, marks: 260, items: ['brass_cog', 'brass_cog', 'brass_cog', 'iron_bar', 'iron_bar', 'star_crystal'] },
  },
];

export const DUNGEON_BY_ID: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));

/**
 * Veteran, as ESO has it: the same halls, harder. Open on a dungeon once you've cleared it. Its
 * creatures have more health and hit harder, its bosses' big moves come sooner and land heavier,
 * and it pays better: more from the chest, a better chance at each boss's piece, and the Laurel
 * cloak the first time. The realm's queue keeps veteran apart: its id carries VET on the end.
 */
export const VETERAN = { hp: 1.7, damage: 1.35, moveEvery: 0.8, moveDamage: 1.3, chestXp: 1.4, chestMarks: 1.6, dropChance: 0.25 };
export const VET = '-vet';
/** A queue or run id's dungeon, and whether it's veteran. */
export const splitRunId = (id: string): { id: string; vet: boolean } => (id.endsWith(VET) ? { id: id.slice(0, -VET.length), vet: true } : { id, vet: false });

// ---------------------------------------------------------------- Henchmen
/** What a henchman says: going in, hurt, after a kill, going down, getting up, and (a healer) mending. */
export interface Barks { pull: string[]; low: string[]; kill: string[]; down: string; up: string; mend?: string[] }

export interface Henchman {
  id: string;
  name: string;
  title: string;
  role: Role;
  look: Partial<Appearance>;
  held: HeldItem;
  barks: Barks;
}

/**
 * Four hands for hire who'll go down anywhere for a day's rate, Hesk's regulars when the company
 * needs a gallery cleared. Whoever's free comes: a tank, a healer, and the damage dealers the group
 * is short of (Bet first; she knows the Pit).
 */
export const HENCHMEN: Henchman[] = [
  {
    id: 'osgood', name: 'Osgood Mason', title: 'Quarryman', role: 'tank',
    look: { skin: '#c89070', hair: '#3a2418', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#5a5a60', trim: '#2e2e34', trousers: '#3e3e44', boots: '#24221e', shoulderPads: '#8a8a90', top: 4, gloves: '#6a6a70', build: 1.22, height: 1.06, age: 0.45 },
    held: 'hammer',
    barks: {
      pull: ['On me.', 'I\'ve got them.', 'Stay behind me.', 'Here. Look at me, not them.'],
      low: ['Bit of help here.', 'Edith.'],
      kill: ['Next.', 'That\'s that.'],
      down: 'Down. Sorry.',
      up: 'Right. Where was I.',
    },
  },
  {
    id: 'edith', name: 'Edith Leach', title: 'Bonesetter', role: 'healer',
    look: { frame: 'f', skin: '#f0cfb0', hair: '#9a948c', hairStyle: 2, eyes: '#4a5a6a', tunic: '#5a4a6a', trim: '#d8c8a0', trousers: '#3a3040', boots: '#2a2018', top: 5, shirt: '#d8c8a0', apron: true, age: 0.7, build: 0.95 },
    held: 'none',
    barks: {
      pull: ['Nobody stand in anything.', 'Keep where I can see you.', 'If you\'re bleeding, come to me. Don\'t make me come to you.'],
      low: ['I can\'t mend what I can\'t reach.', 'Somebody get that thing off me.'],
      kill: ['Good.'],
      down: 'Oh, for goodness\' sake. Get me up.',
      up: 'I\'m up. Don\'t fuss.',
      mend: ['Hold still.', 'That\'ll scar.', 'You\'re fine. Mostly.', 'Stop moving.'],
    },
  },
  {
    id: 'bet', name: 'Bet Pascoe', title: 'Pick-hand', role: 'damage',
    look: { frame: 'f', skin: '#d8a882', hair: '#1e1612', hairStyle: 1, eyes: '#3a2a1a', tunic: '#3a3a36', trim: '#7a6a4a', trousers: '#2e2a26', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a22', build: 1.05, age: 0.35 },
    held: 'pickaxe',
    barks: {
      pull: ['Mind your heads.', 'Rustbacks. Hit them under the shell.', 'Here we go.'],
      low: ['I\'ve had worse from a pit fall.', 'That one had teeth.'],
      kill: ['That\'s one for the tally.', 'Down it goes.'],
      down: 'Get this off me.',
      up: 'Still here.',
    },
  },
  {
    id: 'tom', name: 'Tom Fowler', title: 'Bird-catcher', role: 'damage',
    look: { skin: '#e2b894', hair: '#7a3a1e', hairStyle: 3, eyes: '#4a7a4a', tunic: '#4a5a3a', trim: '#8a7a4a', trousers: '#3a3a2a', boots: '#2a2418', hat: 'cap', hatColor: '#5a4a2a', age: 0.2, build: 0.9 },
    held: 'hatchet',
    barks: {
      pull: ['That one\'s mine!', 'Left, it\'s going left!', 'I\'ll take the little ones.'],
      low: ['It bit me!', 'Ow. That\'s my good arm.'],
      kill: ['Got it!', 'Did you see that?', 'Easy.'],
      down: 'Ow. Ow.',
      up: 'Not dead! Not dead.',
    },
  },
];

/** The henchmen who fill the places a group is short of. */
export function henchmenFor(missing: Role[]): Henchman[] {
  const out: Henchman[] = [];
  for (const r of missing) {
    const h = HENCHMEN.find((x) => x.role === r && !out.includes(x));
    if (h) out.push(h);
  }
  return out;
}

/** The places a group is short of, given the roles it has. */
export function missingRoles(have: Role[]): Role[] {
  const left = [...have];
  const out: Role[] = [];
  for (const r of PARTY) {
    const i = left.indexOf(r);
    if (i >= 0) left.splice(i, 1); else out.push(r);
  }
  // A group with more of one role than it needs is still four: drop henchmen for the extra players
  return out.slice(0, Math.max(0, PARTY.length - have.length));
}
