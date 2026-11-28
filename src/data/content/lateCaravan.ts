import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE LATE CARAVAN, a side story of the Glass Flats (Morrow's thinner regions: docs/OWED.md).
//
// Twice a season a caravan of dates comes up from Callis across the flats to Tenwells and goes on north, and Sam Pell
// drives the last cart. It is four days late. His wife Dora keeps the dates stall at the fort, and she has been
// standing at the west gate since dawn.
//
// gfCaravan (Dora Pell, Tenwells' west gate):
//   'road'    out along the caravan road: the ruts where the carts left it, and further on the last cart on its side
//             with its mules gone and its strongbox gone.
//   'hollow'  Sam is alive in a glass hollow past the cart, and the glassbacks are round it (three, the quest's own).
//   'dora'    Sam is home. He tells Dora, with you there, that the box is buried in the hollow: the Callis merchant
//             docked every drover's pay this season, and he meant to take back what they were owed. Dora asks you:
//               'return'  dig it up and send it to Callis whole; Sam keeps his good name (honesty);
//               'share'   take out what the drovers were docked, no more, and send the rest (compassion, at honesty's cost).
//
// Tenwells' people have plain names, as the fort's do: Wade, Pell.

const Q = 'gfCaravan';
const T = TOWNS.tenwells;
const DORA = { x: T.x - 13.5, z: T.z - 7.5 };
const RUTS = { x: 7380.5, z: -260.5 };
const CART = { x: 7340.5, z: -320.5 };
const HOLLOW = { x: 7300.5, z: -380.5 };
const backs = (g: GameApi) => Math.min(3, killed(g, 'gfBack'));

const doraNodes: Record<string, DNode> = {
  dc1: { speaker: 'narrator', text: 'A woman in a dust-coloured shawl at the fort\'s west gate, one hand on the gatepost, watching the road across the flats. Behind her a stall of dried dates under an awning, and nobody minding it.', next: 'dc2' },
  dc2: { text: 'Dora Pell. That\'s my stall, and those are last season\'s dates, because this season\'s are on a cart somewhere out there with my husband driving it.', next: 'dc3' },
  dc3: { text: 'The caravan comes up from Callis twice a season. Sam drives the last cart, always has, he says the dust is his. They\'re four days late. The flats don\'t make you four days late. The flats make you dead or they let you through.', next: 'dc4' },
  dc4: {
    text: 'Ennis says wait. I\'ve waited. Would you go out along the road? If there\'s anything to find, you\'ll find it before I could.',
    options: [
      { text: 'I\'ll find the caravan.', effect: (g) => g.setStage(Q, 'road') },
      { text: 'Not now.' },
    ],
  },
  dcWait: { text: (g) => (at(g, Q) === 'hollow' ? `You found the cart. And Sam? ${backs(g)} of three glassbacks seen off.` : 'The road runs south-west from the gate. Watch for where the ruts leave it. Carts don\'t leave the road out there unless they\'re made to.') },
  dcHome1: { speaker: 'narrator', text: 'Sam Pell is sitting on the step of the stall with a cup of water in both hands, burned red by the flats, a bandage round his arm. Dora is standing over him. Neither of them is saying anything until you come up.', next: 'dcHome2' },
  dcHome2: { speaker: 'narrator', text: 'Sam looks up at you. "Glassbacks took the mules on the first night. The others went on with the other carts and left me with mine on its side. I wasn\'t leaving the box. Then I was in that hollow with three of them walking round it."', next: 'dcHome3' },
  dcHome3: { speaker: 'narrator', text: '"The box is in the hollow. I buried it. Whetstone, the merchant in Callis, docked every drover a fifth of their pay this season for dust, and I thought, let him come out here and dig for it. I meant to take back what we were owed. That\'s all." He doesn\'t look at Dora when he says it.', next: 'dcHome4' },
  dcHome4: {
    text: 'You heard him. He was out there four days for that box. So you tell us, because I can\'t think straight: do we send it to Callis as it is, or does the fifth he took come out of it first?',
    options: [
      { text: 'Send it whole. Sam keeps his good name, and you take Whetstone to the guild for the pay.', next: 'dcReturn' },
      { text: 'Take out the fifth he docked, no more, and send the rest.', next: 'dcShare' },
    ],
  },
  dcReturn: {
    text: 'Whole. And the guild for the rest. Sam, you hear that? You\'re not a thief, whatever he is. Here, take this for going out there, and take a bag of the dates, the new ones.',
    options: [{ text: 'I hope the guild hears you.', effect: (g) => { g.setFlag(Q, 'return'); deed(g, { id: 'gfCaravan:return', a: 3, tr: { honesty: 5 }, npc: { gf_dora: 10 }, note: 'Told the Pells to send the caravan\'s strongbox back to Callis whole.' }); g.addMarks(450); g.give('caravan_dates', 4); g.setStage(Q, 'done'); } }],
  },
  dcShare: {
    text: 'A fifth. For every drover, not just us, we\'ll see they get it. Whetstone won\'t miss it, and if he does he\'ll have to say why he took it. Here, for going out there, and a bag of the new dates.',
    options: [{ text: 'Every drover, mind.', effect: (g) => { g.setFlag(Q, 'share'); deed(g, { id: 'gfCaravan:share', tr: { compassion: 4, honesty: -3 }, npc: { gf_dora: 20 }, note: 'Told the Pells to take the drovers\' docked pay out of the caravan\'s strongbox.' }); g.addMarks(450); g.give('caravan_dates', 4); g.setStage(Q, 'done'); } }],
  },
  dcAfter: {
    text: (g) => (g.flag(Q) === 'return'
      ? 'The box went south whole. The guild heard Sam out and Whetstone paid the fifth back to every drover, with a face on him. Sam says the dust is his again.'
      : 'Every drover had his fifth back in his hand by the next caravan, and Whetstone has said nothing. Sam says that\'s how you know you were right.'),
  },
};

const dora: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'dc1' : s === 'dora' ? 'dcHome1' : s === 'done' ? 'dcAfter' : 'dcWait'; },
  nodes: doraNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Late Caravan', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'road') return 'The Callis date caravan is four days late at Tenwells, and Sam Pell drives its last cart. His wife Dora asked me to follow the road south-west across the flats.';
      if (s === 'hollow') return `The last cart is on its side past where the ruts leave the road, its mules and its strongbox gone. Sam's tracks go on toward a glass hollow. (${backs(g)}/3 glassbacks)`;
      if (s === 'dora') return 'Sam Pell is home at Tenwells. Dora is waiting to talk.';
      return g.flag(Q) === 'return' ? 'The caravan\'s strongbox went back to Callis whole, and the guild made Whetstone pay the drovers what he docked.' : 'The drovers took back the fifth of their pay Whetstone docked, out of the caravan\'s strongbox, and sent the rest on.';
    },
    objectives: (g, s) => (s === 'road'
      ? [{ text: 'Find where the ruts leave the road', marker: 'gcRuts', done: !!g.flag('gcRuts') }, { text: 'Find the last cart', marker: 'gcCart', done: !!g.flag('gcCart') }]
      : s === 'hollow' ? [{ text: `Drive the glassbacks off from the hollow (${backs(g)}/3)`, marker: `at:${HOLLOW.x},${HOLLOW.z}` }]
        : s === 'dora' ? [{ text: 'Go back to Dora Pell at Tenwells', marker: 'gf_dora' }] : []),
    advance: (g, s) => (s === 'road' && g.flag('gcRuts') && g.flag('gcCart') ? 'hollow' : s === 'hollow' && backs(g) >= 3 ? 'dora' : null),
    marks: (_g, s): Marks => (!s ? { gf_dora: '!' } : s === 'dora' ? { gf_dora: '?' } : {}),
    walk: { cast: ['gf_dora'], kill: { hollow: [['glassback', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gf_dora', name: 'Dora Pell', title: 'Dates seller, Tenwells',
    look: { frame: 'f', skin: '#c89068', hair: '#3a2a1e', hairStyle: 2, eyes: '#4a3a2a', tunic: '#a8946a', trim: '#5a4a3a', trousers: '#5a4a3a', boots: '#3a2a1e', cape: '#c8b890', lashes: true, build: 0.95, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [DORA.x, DORA.z], face: [DORA.x - 4, DORA.z - 3], anim: 'idle' }],
    barks: ['Four days.', 'The flats make you dead or they let you through.'] },
];

export const LATE_CARAVAN_CONTENT: RegionContent = {
  id: 'lateCaravan', quests, npcs: NPCS,
  dialogue: { gf_dora: dora },
  spawns: [
    { land: 'morrow', tag: 'gfBack', type: 'glassback', at: [[HOLLOW.x + 6, HOLLOW.z + 2], [HOLLOW.x - 5, HOLLOW.z + 4], [HOLLOW.x + 1, HOLLOW.z - 6]], when: (g) => at(g, Q) === 'hollow' },
  ],
  things: [
    { land: 'morrow', id: 'gcRuts', x: RUTS.x, z: RUTS.z, label: 'Look at the ruts off the road', radius: 2.8,
      when: (g: GameApi) => at(g, Q) === 'road' && !g.flag('gcRuts'),
      use: (g: GameApi) => { g.setFlag('gcRuts', 1); g.toast('Here a set of cart ruts leaves the road, wide and swerving, the mules pulling hard one way and the cart going the other. Something drove them off it. The ruts go on south-west.'); } },
    { land: 'morrow', id: 'gcCart', x: CART.x, z: CART.z, label: 'Look at the overturned cart', radius: 2.8,
      when: (g: GameApi) => at(g, Q) === 'road' && !!g.flag('gcRuts') && !g.flag('gcCart'),
      use: (g: GameApi) => { g.setFlag('gcCart', 1); g.toast('The last cart is on its side with sacks of dates split across the glass. The traces are cut, the mules gone, the strongbox bracket empty. A man\'s boot prints, dragging one foot, go off toward a glass hollow to the south-west.'); } },
  ],
};
