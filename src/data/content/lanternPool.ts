import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn } from '../places_regional';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE LANTERN POOL, a side story of the Glades (Morrow's thinnest regions first: docs/OWED.md).
//
// At night the water plants of the Glades glow pale green. Reedwater cuts the glowcress from the pools west of the
// village at the dark of the moon and sells it in Callis, where the lamp-glass makers grind it into their glass. The
// best of the pools is the Lantern Pool. This year it has gone dark.
//
// glLantern (Nan Sedge, who has cut the Lantern Pool for forty years):
//   'pool'   look at the pool: the cress grey and limp at the edges; white silt over the bottom by the inflow, fine as
//            flour; and up the inflow channel, split sacks stamped with the Assembly's mark, dumped and left. Somebody
//            has been emptying the crystal works' white dust into the stream above the pool.
//   'glims'  glims have come in to feed on the dying cress. Kill four.
//   'nan'    tell Nan. Choose:
//              'rest'  dig the sacks out and let the pool rest a season: no cress from it this year, and the village
//                      a lean winter, but it will glow again;
//              'sell'  cut the dark cress anyway and sell it in Callis as Lantern Pool cress. It won't glow in the glass.
//                      The glassmakers will find out at the furnace, and Reedwater's name with them.
//
// Glades names are of the water and the reed: Sedge, Pike, Rush.

const Q = 'glLantern';
const R = TOWNS.reedwater;
const [NX, NZ] = [R.x - 52.5, R.z + 18.5]; // Nan, on the bank above the pool
const SIGNS: [string, number, number, string][] = [
  ['lpCress', R.x - 62.5, R.z + 26.5, 'The cress at the pool\'s edge is grey and limp, and when you lift a strand it comes away in your hand. There is no light in it at all.'],
  ['lpSilt', R.x - 74.5, R.z + 14.5, 'Where the stream comes in, the bottom is white: a silt as fine as flour over the mud, stirring up in a cloud when you put your hand in. It is cold, and it smells of nothing.'],
  ['lpSacks', R.x - 88.5, R.z + 6.5, 'Up the inflow, half sunk in the reeds: four sacks, split, the white run out of them. Each is stamped with the Assembly\'s mark, the crossed hammer and the star, and WORKS, LIFTWICK.'],
];
const looked = (g: GameApi) => SIGNS.filter(([id]) => g.flag(id)).length;
const glims = (g: GameApi) => Math.min(4, killed(g, 'lpGlim'));

const nanNodes: Record<string, DNode> = {
  ln1: { speaker: 'narrator', text: 'An old woman on the bank with a cress knife on a cord round her neck, looking down at a pool that should be lit and isn\'t.', next: 'ln2' },
  ln2: { text: 'Nan Sedge. Forty years I\'ve cut the Lantern Pool. At the dark of the moon you could read by it. Look at it.', next: 'ln3' },
  ln3: { text: 'It went out a month ago, a bit at a time, from the stream end. The Callis buyers come in nine days. They pay for the light. Without it, it\'s weed.', next: 'ln4' },
  ln4: {
    text: 'My knees won\'t take the mud. Will you go down and see what\'s wrong with it? Start where it comes in.',
    options: [
      { text: 'I\'ll look at the pool.', effect: (g) => g.setStage(Q, 'pool') },
      { text: 'Not now, Nan.' },
    ],
  },
  lnWait: { text: (g) => (at(g, Q) === 'pool' ? `The edges first, then where the stream comes in, then up the stream. ${looked(g)} of three.` : `Glims? On my pool? They come to anything dying. Kill them before they finish it. ${glims(g)} of four.`) },
  lnB1: { text: 'White dust. From the works at Liftwick. They\'ve been tipping it in the stream where nobody would see, and it\'s come down here and settled on my cress and put the light out.', next: 'lnB2' },
  lnB2: { text: 'If the sacks come out and the stream runs clear, it\'ll come back. A season, maybe. Not in nine days.', next: 'lnB3' },
  lnB3: {
    text: 'The Rushes and the Pikes say cut it anyway. Cut it dark and sell it to Callis as Lantern Pool cress, same as ever. They\'ll not know till it\'s in the furnace. What would you do?',
    options: [
      { text: 'Pull the sacks and let it rest. Sell nothing dark.', next: 'lnRest' },
      { text: 'Cut it and sell it. The village has to eat this winter.', next: 'lnSell' },
    ],
  },
  lnRest: {
    text: 'Rest it. Yes. My mother would have said the same and gone hungry saying it. Pull the sacks for me, then, and I\'ll tell the Rushes myself. Here. It\'s not much.',
    options: [{ text: 'It\'ll glow again, Nan.', effect: (g) => { g.setFlag(Q, 'rest'); g.addMarks(380); g.give('glowcress', 2); g.setStage(Q, 'done'); } }],
  },
  lnSell: {
    text: 'Cut it dark. All right. You\'re not the one whose name is on the bale. Help me cut it, then. Here, the Rushes\' share for your trouble. Don\'t come to the market when the buyers open it up.',
    options: [{ text: 'They won\'t know.', effect: (g) => { g.setFlag(Q, 'sell'); g.addMarks(620); g.setStage(Q, 'done'); } }],
  },
  lnAfter: {
    text: (g) => (g.flag(Q) === 'rest'
      ? 'Clear water down the stream now, and last night, at the stream end, three strands of it lit. Three. I sat up and watched them till the moon came up.'
      : 'The Callis buyers sent the bales back with a letter. They\'re buying from Saltpenny now. Nobody in Reedwater will say your name to me.'),
  },
};

const nan: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'ln1' : s === 'nan' ? 'lnB1' : s === 'done' ? 'lnAfter' : 'lnWait'; },
  nodes: nanNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Lantern Pool', region: 'glades', depth: 'quest',
    notes: (g, s) => {
      if (s === 'pool') return `Reedwater cuts glowcress from the Lantern Pool, west of the village, and sells it in Callis for lamp-glass. The pool has gone dark from the stream end. Nan Sedge asked me to find out why. (${looked(g)}/3)`;
      if (s === 'glims') return `White dust from the Assembly's works at Liftwick has been dumped in the stream above the pool, and it has smothered the cress. Glims have come in to feed on what's dying. (glims ${glims(g)}/4)`;
      if (s === 'nan') return 'The glims are gone. Nan Sedge should hear about the dust.';
      return g.flag(Q) === 'rest' ? 'The sacks are out of the stream and the Lantern Pool is resting. It has started to glow again at the stream end.' : 'Reedwater sold the dark cress to Callis as Lantern Pool cress. The buyers found out at the furnace.';
    },
    objectives: (g, s) => (s === 'pool' ? SIGNS.map(([id], i) => ({ text: ['Look at the cress at the pool\'s edge', 'Look where the stream comes in', 'Follow the stream up from the pool'][i], marker: id, done: !!g.flag(id) }))
      : s === 'glims' ? [{ text: `Kill the glims feeding in the Lantern Pool (${glims(g)}/4)`, done: glims(g) >= 4 }]
        : s === 'nan' ? [{ text: 'Tell Nan Sedge what is in the stream', marker: 'gl_nan' }] : []),
    advance: (g, s) => (s === 'pool' && looked(g) >= 3 ? 'glims' : s === 'glims' && glims(g) >= 4 ? 'nan' : null),
    marks: (_g, s): Marks => (!s ? { gl_nan: '!' } : s === 'nan' ? { gl_nan: '?' } : {}),
    walk: { cast: ['gl_nan'], kill: { glims: [['glim', 4]] } },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'lpGlim', type: 'glim', at: [[R.x - 66.5, R.z + 22.5], [R.x - 70.5, R.z + 30.5], [R.x - 58.5, R.z + 32.5], [R.x - 76.5, R.z + 20.5]], when: (g) => at(g, Q) === 'glims' },
];

const NPCS: NpcDef[] = [
  { id: 'gl_nan', name: 'Nan Sedge', title: 'Cress-cutter', land: 'morrow',
    look: { frame: 'f', skin: '#c89070', hair: '#d0ccc0', hairStyle: 2, eyes: '#4a5a3a', tunic: '#4a5a3a', trim: '#8aa86a', trousers: '#3a3a2a', boots: '#2a2418', hat: 'kerchief', hatColor: '#6a7a4a', apron: true, lashes: true, build: 0.9, height: 0.9, age: 0.9 },
    schedule: [{ from: 0, to: 24, at: [NX, NZ], face: [NX - 6, NZ + 4], anim: 'idle' }], barks: ['You could read by it.', 'Mind the mud.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'glowcress', name: 'Glowcress', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'sheaf', a: '#8af0a0', b: '#2a6a3a' },
    desc: 'A water plant of the Glades, cut at the dark of the moon. It glows pale green for a month after it is cut, and Callis grinds it into lamp-glass.' },
];

export const LANTERN_POOL_CONTENT: RegionContent = {
  id: 'lanternPool', quests, items: ITEMS, npcs: NPCS, spawns,
  dialogue: { gl_nan: nan },
  things: SIGNS.map(([id, x, z, text]) => ({
    land: 'morrow' as const, id, x, z, label: id === 'lpSacks' ? 'Look in the reeds' : 'Look at the pool', radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'pool' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (looked(g) >= 3) g.setStage(Q, 'glims'); },
  })),
};
