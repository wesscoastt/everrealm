import type { BossPhase, EnemyDef } from './gameplay';

// Each delve's champion (docs/DELVES.md): a name of its own and one move that is its own, made of what
// creatures can already do (Enemy.ts): a way of attacking, a role (a guard's shield from in front), and
// phases that come as its health falls (calling its kind, mending itself, a storm round it). Grey Meg
// keeps the phases she already has.

export interface Champion { name?: string; attack?: EnemyDef['attack']; role?: EnemyDef['role']; phases?: BossPhase[]; move: string }

export const DELVE_CHAMPIONS: Record<string, Champion> = {
  'delve-badger': {
    name: 'Old Tusk', attack: 'charge',
    phases: [{ at: 0.5, say: 'Old Tusk squeals, and the last of his litter comes running out of the crawls.', summon: 'boar', n: 2 }],
    move: 'Charges down the length of the cave; at half health calls the last of his litter.',
  },
  'delve-culvert': {
    name: 'The Culvert Dog',
    phases: [
      { at: 0.6, say: 'The Culvert Dog howls down the drain, and something answers from the water.', summon: 'jelly', n: 2 },
      { at: 0.3, storm: true, say: 'The Culvert Dog shakes itself, and filthy water goes all over the vault.' },
    ],
    move: 'Calls jellies up out of the drain, then shakes a storm of filthy water over everything near it.',
  },
  'delve-smugglers': {
    name: 'Old Nipper', role: 'guard',
    phases: [{ at: 0.4, say: 'Old Nipper backs into the pool and comes out with brine-jellies clinging to its shell.', summon: 'brinejelly', n: 2 }],
    move: 'Its shell takes most of a blow from in front, so go round it; low, it brings brine-jellies up out of the pool.',
  },
  'delve-tinner': {
    name: 'Grit', attack: 'charge',
    phases: [{ at: 0.5, say: 'Grit kicks the dust of the adit floor up, and the redbacks come out of the props.', summon: 'redback', n: 2 }],
    move: 'Rushes down the adit in a long charge; at half health the redbacks come out of the props.',
  },
  'delve-seep': {
    name: 'Old Hoar',
    phases: [
      { at: 0.6, storm: true, say: 'Old Hoar breathes out, and the cold of the seep comes up all at once.' },
      { at: 0.3, mend: 0.1, say: 'Old Hoar lies down on the ice, and the frost closes over its cuts.' },
    ],
    move: 'Breathes the seep\'s cold out in a storm round it, and lies down on the ice to mend.',
  },
  'delve-glimmer': {
    move: 'Whistles icewolves in off the ice, and draws the cold in round her to mend.',
  },
  'delve-gullery': {
    attack: 'charge',
    phases: [
      { at: 0.66, say: 'Old Leatherwing shrieks, and the roof comes alive.', summon: 'cavebat', n: 3 },
      { at: 0.33, say: 'Old Leatherwing shrieks again. More of the colony drops off the roof.', summon: 'cavebat', n: 3 },
    ],
    move: 'Swoops in long dives, and shrieks the colony down off the roof twice.',
  },
  'delve-hob': {
    name: 'The Hob\'s Hound',
    phases: [
      { at: 0.5, say: 'The Hob\'s Hound snaps at the floor, and the mould there swells up into jellies.', summon: 'sporejelly', n: 2 },
      { at: 0.25, storm: true, say: 'The Hob\'s Hound shakes, and a cloud of spores goes up off its coat.' },
    ],
    move: 'Raises sporejellies out of the mould, and shakes a cloud of spores off its coat.',
  },
};
