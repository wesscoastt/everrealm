import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { MORROW_OX } from '../../world/morrow';

// THE WINTER ROUNDS, a side story of the Held (Morrow's thinner regions: docs/OWED.md).
//
// Ebba Brack makes the ewe's-milk cheese the herders on the Held are known for, and ages it in a cave under a crag
// above her croft, where the cold keeps it. Every winter the Northgate garrison buys her rounds at the price her
// mother set, and the wall eats them till spring. This winter a Callis factor has written offering three times that.
// And two nights ago the fell trolls found the cave.
//
// hdRounds (Ebba Brack, her croft on the Held):
//   'cave'    drive the fell trolls out of the cheese cave (three, the quest's own).
//   'rounds'  count what's left: the high shelf, the low shelf, the brine trough. Half the rounds are broken and eaten.
//   'ebba'    back to Ebba. There is enough left for one buyer, not both. She asks you:
//               'wall'    the garrison, at her mother's price; the wall eats this winter (loyalty, generosity);
//               'callis'  the factor, at three times; she can put a roof on the croft, and her grandson Tam can stay up
//                         on the fell with her instead of going down to the mines (greed).
//
// Northern names are short and old: Brack, Aske, Thwaite.

const Q = 'hdRounds';
const W = (x: number, z: number) => ({ x: x + MORROW_OX, z });
const EBBA = W(636.5, -1528.5);
const CAVE = W(652.5, -1566.5);
const trolls = (g: GameApi) => Math.min(3, killed(g, 'wrTroll'));
const FINDS: [string, { x: number; z: number }, string, string][] = [
  ['wrHigh', W(650.5, -1569.5), 'Count the rounds on the high shelf', 'The high shelf, cut into the rock, was too high for the trolls to reach without climbing. Most of it is whole: rounds wrapped in cloth and wax, grey with the cave\'s bloom, each one marked with a B pressed into the rind. Eleven.'],
  ['wrLow', W(655.5, -1569.5), 'Count the rounds on the low shelf', 'The low shelf is wreckage. Rinds split and scattered, wax chewed, the cloth torn off and the cheese inside gone in great bites. Four rounds left that you\'d sell, and those only just.'],
  ['wrBrine', W(653.5, -1563.5), 'Look in the brine trough', 'The brine trough at the back is a stone basin with this winter\'s youngest rounds still floating in it. A troll has drunk half the brine and spat it back. You fish out what\'s still sound: three, small and pale. Not ready, but they will be.'],
];
const found = (g: GameApi) => FINDS.filter(([id]) => g.flag(id)).length;

const nodes: Record<string, DNode> = {
  wr1: { speaker: 'narrator', text: 'A broad woman in a sheepskin coat, at the door of a croft with half its roof under a weighted tarpaulin. She has a crook in one hand and a cleaver in the other, and is looking up at the crag above the croft as if she means to use them both.', next: 'wr2' },
  wr2: { text: 'Ebba Brack. If you\'ve come for cheese, you\'re two nights late. The trolls came first. They\'re still in my cave, up under the crag. I can hear them eating.', next: 'wr3' },
  wr3: { text: 'That cave has aged Brack cheese for a hundred years. The garrison at Northgate takes every round I make, every winter, at the price my mother set. And this year I\'ve a letter from Callis offering three times it. I hadn\'t made up my mind. Now the trolls might make it up for me.', next: 'wr4' },
  wr4: {
    text: 'I\'m sixty-two. I can\'t fight three trolls with a cleaver, whatever I look like. Would you clear them out? And then count what\'s left. I can\'t bear to.',
    options: [
      { text: 'I\'ll clear the cave.', effect: (g) => g.setStage(Q, 'cave') },
      { text: 'Not now.' },
    ],
  },
  wrWait: { text: (g) => (at(g, Q) === 'rounds'
    ? `They're gone? Then count. The high shelf, the low shelf, the brine at the back. ${found(g)} of three.`
    : `Up under the crag. You'll smell them before you see them. ${trolls(g)} of three.`) },
  wrB1: { text: 'Eleven on the high shelf. Four off the low. Three young ones out of the brine. Eighteen. I had forty.', next: 'wrB2' },
  wrB2: { text: 'Eighteen won\'t feed the wall all winter and pay for a roof. It\'ll do one. The garrison, at my mother\'s price, and the lads on the wall eat Brack cheese till spring the way they always have. Or Callis, at three times, and I put a roof on this place, and my grandson Tam doesn\'t have to go down to the mines in the new year. He\'s fifteen.', next: 'wrB3' },
  wrB3: {
    text: 'My mother would say the garrison and not think twice. My mother had a roof. What would you do?',
    options: [
      { text: 'The garrison. The wall has eaten your cheese for a hundred years.', next: 'wrWall' },
      { text: 'Callis. Put the roof on, and keep Tam up here.', next: 'wrCallis' },
    ],
  },
  wrWall: {
    text: 'The garrison. Aye. Mercy Thwaite will come up with the cart and say it\'s the best year yet, she says that every year. And Tam will go down. He wants to, a bit, the fool. Here. And take a round, a whole one, off the high shelf. You earned it.',
    options: [{ text: 'Thank you, Ebba.', effect: (g) => { g.setFlag(Q, 'wall'); deed(g, { id: 'hdRounds:wall', a: 3, tr: { loyalty: 4, generosity: 2 }, npc: { hd_ebba: 10 }, note: 'Told Ebba Brack to sell what the trolls left of her cheese to the Northgate garrison at the old price.' }); g.addMarks(380); g.setStage(Q, 'done'); } }],
  },
  wrCallis: {
    text: 'Callis. I\'ll write tonight, before I lose my nerve. The garrison will have to buy from the lowlands this year and they\'ll hate it. Let them. Tam stays. Here. And take a round, a whole one, off the high shelf. You earned it.',
    options: [{ text: 'Good luck with the roof.', effect: (g) => { g.setFlag(Q, 'callis'); deed(g, { id: 'hdRounds:callis', tr: { greed: 3, compassion: 2 }, npc: { hd_ebba: 15 }, note: 'Told Ebba Brack to sell what the trolls left of her cheese to a Callis factor at three times the price.' }); g.addMarks(380); g.setStage(Q, 'done'); } }],
  },
  wrAfter: {
    text: (g) => (g.flag(Q) === 'wall'
      ? 'Mercy came with the cart and said it was the best year yet. Tam went down to the mines at the new year. He writes. Not often. I\'ve the tarpaulin weighted with stones and it holds.'
      : 'New roof. Slate, from Northgate, carried up on the sledge. Tam put it on with me. The garrison sent word they\'d buy from me next year at whatever price I liked, which was the first time anyone up there asked.'),
  },
};

const ebba: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'wr1' : s === 'ebba' ? 'wrB1' : s === 'done' ? 'wrAfter' : 'wrWait'; },
  nodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Winter Rounds', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'cave') return `Fell trolls have got into the cave where Ebba Brack ages her cheese, up under the crag above her croft on the Held. (${trolls(g)}/3)`;
      if (s === 'rounds') return `The trolls are out of Ebba Brack's cave. Count what's left: the high shelf, the low shelf and the brine trough. (${found(g)}/3)`;
      if (s === 'ebba') return 'Eighteen rounds left of forty. Ebba Brack should hear it.';
      return g.flag(Q) === 'wall' ? 'Ebba Brack sold what the trolls left of her cheese to the Northgate garrison at her mother\'s price.' : 'Ebba Brack sold what the trolls left of her cheese to a Callis factor, and put a roof on her croft.';
    },
    objectives: (g, s) => (s === 'cave'
      ? [{ text: `Drive the fell trolls from the cheese cave (${trolls(g)}/3)`, marker: `at:${CAVE.x},${CAVE.z}` }]
      : s === 'rounds' ? FINDS.map(([id, , label]) => ({ text: label, marker: id, done: !!g.flag(id) }))
        : s === 'ebba' ? [{ text: 'Tell Ebba Brack what\'s left', marker: 'hd_ebba' }] : []),
    advance: (g, s) => (s === 'cave' && trolls(g) >= 3 ? 'rounds' : s === 'rounds' && found(g) >= 3 ? 'ebba' : null),
    marks: (_g, s): Marks => (!s ? { hd_ebba: '!' } : s === 'ebba' ? { hd_ebba: '?' } : {}),
    walk: { cast: ['hd_ebba'], kill: { cave: [['felltroll', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'hd_ebba', name: 'Ebba Brack', title: 'Cheesemaker, the Held',
    look: { frame: 'f', skin: '#e0b898', hair: '#8a7a6a', hairStyle: 7, eyes: '#4a5a6a', tunic: '#6a5a48', trim: '#d8ccb0', trousers: '#3a3430', boots: '#2a2018', cape: '#c8b898', lashes: true, build: 1.25, age: 0.65 },
    schedule: [{ from: 0, to: 24, at: [EBBA.x, EBBA.z], face: [CAVE.x, CAVE.z], anim: 'idle' }],
    barks: ['I can hear them eating.', 'A hundred years, that cave.'] },
];

export const WINTER_ROUNDS_CONTENT: RegionContent = {
  id: 'winterRounds', quests, npcs: NPCS,
  dialogue: { hd_ebba: ebba },
  spawns: [
    { land: 'morrow', tag: 'wrTroll', type: 'felltroll', at: [[CAVE.x - 5, CAVE.z + 6], [CAVE.x + 6, CAVE.z + 4], [CAVE.x, CAVE.z + 9]], when: (g) => at(g, Q) === 'cave' },
  ],
  pieces: [
    { id: 'wrCasks', kind: 'barrels', x: CAVE.x - 3, z: CAVE.z + 3, ry: 0.6, when: () => true },
    { id: 'wrCrates', kind: 'barrels', x: CAVE.x + 3.5, z: CAVE.z + 2, ry: -0.4, when: () => true },
  ],
  things: FINDS.map(([id, p, label, text]) => ({
    land: 'morrow' as const, id, x: p.x, z: p.z, label, radius: 2.4,
    when: (g: GameApi) => at(g, Q) === 'rounds' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3) g.setStage(Q, 'ebba'); },
  })),
};
