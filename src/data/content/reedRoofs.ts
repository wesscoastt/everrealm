import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE REED ROOFS, a side story of Reedwater in the Glades: a village burning (owner 2026-11-27, the voxel-destruction
// kit: "destruction maybe for combat or quests events etc"; OWED 00a "a burning village").
//
// Glim night comes early. The glims drift in off the marsh after dark every autumn and Reedwater shuts its shutters
// and waits, but this year the reed was cut late and the east walk's roofs are bone dry. Joan Reddy cut and laid that
// reed herself, and she wants somebody with her on the east walk when the glims come.
//
// rwRoofs (Joan Reddy, the east walk):
//   'fire'   the east walk's roofs catch as the glims come through (data/activities.ts ev-mreedfire, an event only
//            this quest opens): put the fires out and drive the glims off. Win or lose, it goes on.
//   'joan'   back to Joan. If the walk was saved she pays you out of the reed money; if three roofs went, they stay
//            black (WORLD_STATES eastwalkburnt) and she pays you anyway, because you came.
//
// Glades names are plain and short: Fenn, Pike, Rush, Reddy.

const Q = 'rwRoofs';
const T = TOWNS.reedwater;
const JOAN = { x: T.x + 39.5, z: T.z + 3.5 }; // (on the east walk, which runs north and south three boards wide)
const result = (g: GameApi) => g.flag('ev-mreedfire:result');

const joanNodes: Record<string, DNode> = {
  jr1: { speaker: 'narrator', text: 'A broad woman with forearms scored white by reed cuts, a sickle through her belt, looking up at the roofs along the east walk the way a shepherd looks at a sky.', next: 'jr2' },
  jr2: { text: 'Joan Reddy. I cut the reed for these roofs, and I laid most of them. That one, that one, the long one at the end.', next: 'jr3' },
  jr3: { text: 'Glim night\'s early this year. They come in off the marsh after dark, the glims, and they drift through the walks looking for warm. Most years we shut the shutters and they go by.', next: 'jr4' },
  jr4: {
    text: 'This year the reed was cut late and dried hard, and the east walk is the first thing they reach. One glim sits on a dry roof long enough and it goes up like a torch. I want somebody on the walk with me tonight. Will you stand it with me?',
    options: [
      { text: 'I\'ll stand the east walk with you.', effect: (g) => { g.setFlag('ev-mreedfire:result', 0); g.setFlag('rwRoofs:fire', 1); g.setStage(Q, 'fire'); } },
      { text: 'Not tonight, Joan.' },
    ],
  },
  jrWait: { text: 'Buckets are at the end of every walk. If a roof catches, don\'t climb it. Throw from the walk and keep throwing. And keep the glims off the ones that haven\'t.' },
  jrWon1: { speaker: 'narrator', text: 'Joan is sitting on the edge of the walk with her boots over the water, black to the elbows, looking at the roofs. All of them are still there.', next: 'jrWon2' },
  jrWon2: { text: 'Not one. Scorched eaves on the long house and a hole you could put your fist through on mine, and not one roof gone. I\'ve seen glim nights take half a walk.', next: 'jrWon3' },
  jrWon3: {
    text: 'Here. That\'s out of the reed money, and don\'t argue with me. Come back in the spring and I\'ll show you how to lay a roof that doesn\'t catch so quick.',
    options: [{ text: 'Thank you, Joan.', effect: (g) => { g.setFlag(Q, 'saved'); g.addMarks(520); g.setStage(Q, 'done'); } }],
  },
  jrLost1: { speaker: 'narrator', text: 'Three roofs along the east walk are gone to their rafters, black and still smoking. The Rushes are sitting on their bundles on the walk outside the long house, which was theirs.', next: 'jrLost2' },
  jrLost2: { text: 'Three. The long house and the two by it. Nobody hurt, which is the main thing, and I keep telling myself it\'s the main thing.', next: 'jrLost3' },
  jrLost3: {
    text: 'You came, and you stayed till it was done, which is more than most. Take this. I\'ll be cutting reed all winter for those roofs, and I\'ll cut it early.',
    options: [{ text: 'I\'m sorry, Joan.', effect: (g) => { g.setFlag(Q, 'lost'); g.addMarks(360); g.setStage(Q, 'done'); } }],
  },
  jrAfter: {
    text: (g) => (g.flag(Q) === 'lost'
      ? 'The Rushes are sleeping in the meeting house till the long house is roofed. I\'ve cut the first of the reed for it. Green, this time. It\'ll smoke for a year and it won\'t burn.'
      : 'Fist-sized hole in my own roof and I\'ve not mended it yet. I look at it in the mornings. Reminds me.'),
  },
};

const joan: DialogueTree = {
  start: (g) => {
    const s = at(g, Q);
    if (!s) return 'jr1';
    if (s === 'done') return 'jrAfter';
    if (s === 'joan') return result(g) === 'fail' ? 'jrLost1' : 'jrWon1';
    return 'jrWait';
  },
  nodes: joanNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Reed Roofs', region: 'glades', depth: 'quest',
    notes: (g, s) => {
      if (s === 'fire') return 'Glim night has come early to Reedwater, and the east walk\'s reed roofs are bone dry. Joan Reddy, who cut and laid them, asked me to stand the walk with her. If a roof catches, put it out from the walk; keep the glims off the rest.';
      if (s === 'joan') return result(g) === 'fail' ? 'Three roofs on the east walk burned. Joan Reddy is on the walk.' : 'The east walk came through. Joan Reddy is on the walk.';
      return g.flag(Q) === 'lost' ? 'Three roofs on Reedwater\'s east walk burned on glim night. Joan Reddy is cutting green reed for them all winter.' : 'Not one roof on Reedwater\'s east walk burned on glim night. Joan Reddy paid me out of the reed money.';
    },
    objectives: (_g, s) => (s === 'fire'
      ? [{ text: 'Put out the fires on the east walk and drive off the glims', marker: `at:${JOAN.x},${JOAN.z}` }]
      : s === 'joan' ? [{ text: 'Talk to Joan Reddy on the east walk', marker: 'rw_joan' }] : []),
    advance: (g, s) => (s === 'fire' && (result(g) === 'win' || result(g) === 'fail') ? 'joan' : null),
    marks: (_g, s): Marks => (!s ? { rw_joan: '!' } : s === 'joan' ? { rw_joan: '?' } : {}),
    walk: { cast: ['rw_joan'], auto: { fire: 'joan' } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'rw_joan', name: 'Joan Reddy', title: 'Reed-cutter, Reedwater',
    look: { frame: 'f', skin: '#c8a07a', hair: '#5a3a22', hairStyle: 3, eyes: '#4a3a2a', tunic: '#6a6a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a2018', apron: true, lashes: true, build: 1.1, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [JOAN.x, JOAN.z], face: [JOAN.x + 2, JOAN.z - 3], anim: 'idle' }],
    barks: ['Dry as a bone, the lot of it.', 'Cut late. Never again.'] },
];

export const REED_ROOFS_CONTENT: RegionContent = {
  id: 'reedRoofs', quests, npcs: NPCS,
  dialogue: { rw_joan: joan },
};
