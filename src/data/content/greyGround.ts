import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { COLD_HARBOUR } from '../../world/morrow';

// GREY GROUND, a side story of the Greywaste (Morrow's thinner regions: docs/OWED.md).
//
// Nothing grows on the Greywaste where the black was dug out, and not much anywhere near it. Nell Brack of Cold Harbour
// has kept a kitchen plot alive behind her house for twenty years on ground nobody dug, and she thinks the grey can
// be brought back: moss off the frozen fen to hold the wet, mould from the burnt wood to feed it, and seed from a
// garden that grew before the digging.
//
// gwGround (Nell Brack, Cold Harbour):
//   'gather'  three things: fen-moss from Wyke's edge, where the fen-damps drift (kill three so you can cut it);
//             leaf-mould from under the burnt grey wood; and the seed jar from the garden of an empty village.
//   'nell'    she has enough for one bed. Choose where it goes:
//               'plot'  her own plot, behind the house: kale for the harbour by spring, and that's a winter eaten;
//               'dug'   out on the dug ground by the tally shed, where nothing has grown in thirty years: if it takes,
//                       it proves the grey can heal, and nobody will be fed by it this year.
//
// Northern names are short and old: Brack, Aske, Dacre.

const Q = 'gwGround';
const C = COLD_HARBOUR;
const NELL = { x: C.x + 8.5, z: C.z + 6.5 };
const FINDS: [string, number, number, string][] = [
  ['ggMoss', C.x - 68.5, C.z + 28.5, 'Moss on the frozen fen\'s edge, grey-green under the frost, thick as a fleece. You cut a square of it with Nell\'s knife and roll it up like a rug. It is heavy with water and cold to the bone.'],
  ['ggMould', C.x + 58.5, C.z - 46.5, 'Under the burnt wood the leaves of a hundred autumns have rotted black and soft. You dig your hands into it to the wrist, and fill her sack. It smells alive, the only thing out here that does.'],
  ['ggSeed', C.x + 88.5, C.z + 38.5, 'An empty village, its roofs in, and behind the nearest house the ghost of a garden: stone edging, a fallen bean pole, and in the wall a niche with a clay jar, waxed shut. Seed. Somebody meant to come back for it.'],
];
const found = (g: GameApi) => FINDS.filter(([id]) => g.flag(id)).length;
const damps = (g: GameApi) => Math.min(3, killed(g, 'type:fendamp') - Number(g.flag(Q + ':base') ?? 0));

const nellNodes: Record<string, DNode> = {
  gg1: { speaker: 'narrator', text: 'A thin woman in a man\'s coat with a hoe over her shoulder, standing at a gate behind her house. Through it is the only green you have seen in a day: rows of kale, small and stubborn, in black soil.', next: 'gg2' },
  gg2: { text: 'Nell Brack. That\'s twenty years of work, and every leaf of it counted. Nobody dug this ground. That\'s why it grows.', next: 'gg3' },
  gg3: { text: 'Everyone says the grey is dead for good where the black came out. I don\'t think it\'s dead. I think it\'s starved. Feed it right and it\'ll come back.', next: 'gg4' },
  gg4: {
    text: 'I need three things I can\'t fetch at my age. Moss off the fen to hold the wet. Mould from under the burnt wood. And seed from before the digging: there\'s an empty village east of here that had gardens. Will you?',
    options: [
      { text: 'I\'ll bring you all three.', effect: (g) => { g.setFlag(Q + ':base', killed(g, 'type:fendamp')); g.setStage(Q, 'gather'); } },
      { text: 'Not now, Nell.' },
    ],
  },
  ggWait: { text: (g) => `The fen to the west, the burnt wood to the north-east, the empty village east. Mind the damps on the fen. ${found(g)} of three, and damps seen off: ${damps(g)} of three.` },
  ggB1: { speaker: 'narrator', text: 'Nell unrolls the moss, opens the sack and turns the mould through her fingers, and then holds the seed jar for a long time before she breaks the wax.', next: 'ggB2' },
  ggB2: { text: 'Kale, beans, and something I don\'t know. Good seed, kept dry. Enough for one bed, done properly. One.', next: 'ggB3' },
  ggB3: {
    text: 'So. My own plot, behind the house, and the harbour eats kale by spring. Or out on the dug ground by the tally shed, where nothing has grown in thirty years. If it takes there, it proves the grey can come back. Nobody eats from it this year. Where would you put it?',
    options: [
      { text: 'Your plot. People here need to eat this winter.', next: 'ggPlot' },
      { text: 'The dug ground. Show them it can come back.', next: 'ggDug' },
    ],
  },
  ggPlot: {
    text: 'The plot. That\'s sense, and my mother would have said so. I\'ll double the rows. Here. And take some of the first picking when it comes.',
    options: [{ text: 'Good luck with it, Nell.', effect: (g) => { g.setFlag(Q, 'plot'); g.addMarks(430); g.give('grey_kale', 3); g.setStage(Q, 'done'); } }],
  },
  ggDug: {
    text: 'The dug ground. Wat will say I\'m mad, and he\'ll be out there every morning looking for green. So will I. Here. And take these, from my own rows.',
    options: [{ text: 'It\'ll take, Nell.', effect: (g) => { g.setFlag(Q, 'dug'); g.addMarks(430); g.give('grey_kale', 3); g.setStage(Q, 'done'); } }],
  },
  ggAfter: {
    text: (g) => (g.flag(Q) === 'plot'
      ? 'Twice the rows, and the first picking went round every house in the harbour. Wat had his in a soup. He says it tastes of the fen. It does.'
      : 'Come and look. There, by the shed. Three leaves. Three green leaves on the dug ground. Wat sat by them all yesterday. He didn\'t say anything.'),
  },
};

const nell: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'gg1' : s === 'nell' ? 'ggB1' : s === 'done' ? 'ggAfter' : 'ggWait'; },
  nodes: nellNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Grey Ground', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'gather') return `Nell Brack of Cold Harbour thinks the grey ground isn't dead, only starved. She wants fen-moss, leaf-mould from the burnt wood, and seed from an empty village's garden. Fen-damps drift on the fen. (${found(g)}/3, damps ${damps(g)}/3)`;
      if (s === 'nell') return 'I have the moss, the mould and the seed. Nell Brack is at her garden gate.';
      return g.flag(Q) === 'plot' ? 'Nell Brack planted the old seed in her own plot, and the harbour ate kale by spring.' : 'Nell Brack planted the old seed on the dug ground by the tally shed. Three green leaves came up.';
    },
    objectives: (g, s) => (s === 'gather'
      ? [...FINDS.map(([id], i) => ({ text: ['Cut moss from the frozen fen, west', 'Dig leaf-mould under the burnt wood, north-east', 'Find seed in the empty village, east'][i], marker: id, done: !!g.flag(id) })), { text: `Kill the fen-damps by the moss (${damps(g)}/3)`, done: damps(g) >= 3 }]
      : s === 'nell' ? [{ text: 'Bring it all to Nell Brack at Cold Harbour', marker: 'gw_nell' }] : []),
    advance: (g, s) => (s === 'gather' && found(g) >= 3 && damps(g) >= 3 ? 'nell' : null),
    marks: (_g, s): Marks => (!s ? { gw_nell: '!' } : s === 'nell' ? { gw_nell: '?' } : {}),
    walk: { cast: ['gw_nell'], kill: { gather: [['fendamp', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gw_nell', name: 'Nell Brack', title: 'Gardener, Cold Harbour',
    look: { frame: 'f', skin: '#d8b898', hair: '#8a8478', hairStyle: 2, eyes: '#4a5a4a', tunic: '#4a4a40', trim: '#7a8a5a', trousers: '#3a3430', boots: '#2a2018', cape: '#5a5448', lashes: true, build: 0.85, height: 0.96, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [NELL.x, NELL.z], face: [NELL.x - 3, NELL.z + 4], anim: 'idle' }], barks: ['Every leaf counted.', 'It\'s not dead. It\'s starved.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'grey_kale', name: 'Greywaste kale', kind: 'food', rarity: 'uncommon', stack: true, value: 16, icon: { shape: 'sheaf', a: '#5a7a4a', b: '#2a3a24' }, heal: 45,
    desc: 'Small, dark, curled kale from Nell Brack\'s plot at Cold Harbour, the only green for a day\'s walk. Tough, bitter, and very good in a soup.' },
];

export const GREY_GROUND_CONTENT: RegionContent = {
  id: 'greyGround', quests, items: ITEMS, npcs: NPCS,
  dialogue: { gw_nell: nell },
  things: FINDS.map(([id, x, z, text], i) => ({
    land: 'morrow' as const, id, x, z, label: ['Cut the fen-moss', 'Dig the leaf-mould', 'Take the seed jar'][i], radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'gather' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3 && damps(g) >= 3) g.setStage(Q, 'nell'); },
  })),
};
