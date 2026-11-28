import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, type Marks } from './kit';
import type { RegionContent } from './types';
import { COLD_HARBOUR } from '../../world/morrow';

// LETTERS FOR MART, a side story of the Greywaste (Morrow's regions, more side stories: docs/OWED.md).
//
// Nan Dacre keeps Cold Harbour's post, which is a box nailed to her door and a bag that comes on the Kittiwake once a
// month. Every month for a year there has been a letter for Mart Hollis, a digger who went down the cut in the spring
// and did not come up as himself. They come from his mother in the Counties, who has not been told. Nan has kept them
// all in a drawer, and she can't keep doing it.
//
// gwMart (Nan Dacre, Cold Harbour):
//   'find'   look for what is left of Mart: his name cut in the tally shed's door with the shifts he worked, his bunk
//            in the diggers' huts (and under the straw a letter he wrote his mother and never sent), and the cairn on
//            the headland where the harbour put the names of the ones who didn't come up.
//   'nan'    back to Nan with his letter. She asks you what goes south on the Kittiwake:
//              'truth'   his own letter, and a note from Nan saying how he died, plainly (honesty);
//              'sea'     a note in a hand like his, saying he's shipped out on a whaler and won't be writing; his own
//                        letter stays in the drawer (compassion, at honesty's cost).
//
// Northern names are short and old: Dacre, Aske, Brack.

const Q = 'gwMart';
const C = COLD_HARBOUR;
const NAN = { x: C.x - 6.5, z: C.z + 4.5 };
const FINDS: [string, number, number, string, string][] = [
  ['mlShed', C.x + 20.5, C.z + 12.5, 'Read the names on the tally shed door', 'The tally shed\'s door is cut all over with names and strokes, a digger\'s name and a stroke for every shift. Low down, in careful square letters, MART HOLLIS, and after it a long line of strokes in fives. The last five has only three.'],
  ['mlBunk', C.x - 30.5, C.z + 20.5, 'Search Mart\'s bunk in the diggers\' huts', 'The huts are empty, the bunks stripped. One still has its straw, and his name scratched on the post. Under the straw, folded small, a letter in the same square hand, addressed to his mother at Hookness, with the stamp money wrapped inside it. He never posted it.'],
  ['mlCairn', C.x + 40.5, C.z - 30.5, 'Read the names on the cairn', 'A cairn on the headland above the harbour, and set in its stones, slates with names scratched on them. The ones who went down and didn\'t come up as themselves. MART HOLLIS is near the top. Somebody has put a pebble on his slate, the way the harbour does.'],
];
const found = (g: GameApi) => FINDS.filter(([id]) => g.flag(id)).length;

const nanNodes: Record<string, DNode> = {
  ml1: { speaker: 'narrator', text: 'A stout woman at a door with a wooden box nailed beside it, sorting a thin bag of post on her doorstep. She stops at one letter, as if she knew it would be there, and puts it in her apron pocket without reading it.', next: 'ml2' },
  ml2: { text: 'Nan Dacre. I keep the post, such as it is. One bag a month on the Kittiwake, and most of what\'s in it is for people who aren\'t here any more.', next: 'ml3' },
  ml3: { text: 'This one\'s for Mart Hollis. Every month for a year, from his mam in Hookness. Mart went down the cut in the spring, and when he came up he wasn\'t Mart. Nobody\'s told her. I\'ve got twelve of them in my drawer.', next: 'ml4' },
  ml4: {
    text: 'I can\'t keep doing it. But I can\'t write to a woman I\'ve never met and tell her that. I didn\'t know him well. Would you find out what you can? His name\'s on the tally shed. His bunk\'s in the huts. And the cairn on the headland.',
    options: [
      { text: 'I\'ll find out what I can about Mart.', effect: (g) => g.setStage(Q, 'find') },
      { text: 'Not now.' },
    ],
  },
  mlWait: { text: (g) => `The tally shed, the huts, the cairn on the headland. ${found(g)} of three. Take your time. They've waited a year.` },
  mlB1: { speaker: 'narrator', text: 'Nan reads Mart\'s letter standing up, then sits down on her step and reads it again. The stamp money is still folded inside it.', next: 'mlB2' },
  mlB2: { text: '"Dear Mam, the work is hard but the pay is good and I eat well. Do not worry about the black, they say it is safe if you keep to your shift. I will come home at midsummer with enough for the roof." He wrote that the week before.', next: 'mlB3' },
  mlB3: {
    text: 'So. The Kittiwake sails Thursday. I can send her this, and a note from me saying how it was, plain. Or I can send her a note in a hand like his saying he\'s shipped out on a whaler and won\'t be writing, and she can think he\'s on the sea somewhere. What goes south? I can\'t choose it.',
    options: [
      { text: 'His own letter, and the truth. She should know where he is.', next: 'mlTruth' },
      { text: 'The whaler. Let her think he\'s at sea.', next: 'mlSea' },
    ],
  },
  mlTruth: {
    text: 'His letter, and the truth. I\'ll write it tonight, and I\'ll write it kindly, and I\'ll tell her where the cairn is. She\'ll want to know there\'s a stone with his name on it. Thank you. Here, it\'s not much.',
    options: [{ text: 'Write it kindly, Nan.', effect: (g) => { g.setFlag(Q, 'truth'); deed(g, { id: 'gwMart:truth', a: 3, tr: { honesty: 6 }, npc: { gw_nan: 10 }, note: 'Told Nan Dacre to send a dead digger\'s last letter to his mother, and the truth.' }); g.addMarks(400); g.setStage(Q, 'done'); } }],
  },
  mlSea: {
    text: 'At sea. Aye. She\'ll look at every ship that comes into Hookness for the rest of her life. But she\'ll not have to look at a stone. I\'ll write it in square letters, like his. His own letter can stay in my drawer with the others. Here, it\'s not much.',
    options: [{ text: 'I hope it\'s a kindness.', effect: (g) => { g.setFlag(Q, 'sea'); deed(g, { id: 'gwMart:sea', tr: { compassion: 5, honesty: -4, deception: 3 }, npc: { gw_nan: 5 }, note: 'Told Nan Dacre to write to a dead digger\'s mother that he had shipped out on a whaler.' }); g.addMarks(400); g.setStage(Q, 'done'); } }],
  },
  mlAfter: {
    text: (g) => (g.flag(Q) === 'truth'
      ? 'She wrote back. Two lines. "Thank you for telling me. I will come in the summer and see the stone." She came. She put a pebble on it and went home on the same boat.'
      : 'No more letters for Mart. Just the one, last month, to me. "Thank you for letting me know about the ship. If he writes, tell him the roof is mended." I didn\'t answer it.'),
  },
};

const nan: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'ml1' : s === 'nan' ? 'mlB1' : s === 'done' ? 'mlAfter' : 'mlWait'; },
  nodes: nanNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Letters for Mart', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'find') return `Every month for a year a letter has come to Cold Harbour for Mart Hollis, a digger who went down the cut and didn't come up as himself, from his mother, who hasn't been told. Nan Dacre keeps them in a drawer. Find what's left of him: the tally shed, his bunk, the cairn. (${found(g)}/3)`;
      if (s === 'nan') return 'I found a letter Mart Hollis wrote his mother and never sent. Nan Dacre should see it.';
      return g.flag(Q) === 'truth' ? 'Nan Dacre sent Mart Hollis\'s last letter to his mother, with the truth.' : 'Nan Dacre wrote to Mart Hollis\'s mother that he had shipped out on a whaler.';
    },
    objectives: (g, s) => (s === 'find'
      ? FINDS.map(([id, , , label]) => ({ text: label, marker: id, done: !!g.flag(id) }))
      : s === 'nan' ? [{ text: 'Bring Mart\'s letter to Nan Dacre', marker: 'gw_nan' }] : []),
    advance: (g, s) => (s === 'find' && found(g) >= 3 ? 'nan' : null),
    marks: (_g, s): Marks => (!s ? { gw_nan: '!' } : s === 'nan' ? { gw_nan: '?' } : {}),
    walk: { cast: ['gw_nan'] },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gw_nan', name: 'Nan Dacre', title: 'Keeps the post, Cold Harbour',
    look: { frame: 'f', skin: '#e0c0a8', hair: '#5a4a3a', hairStyle: 2, eyes: '#4a4a5a', tunic: '#4a5a6a', trim: '#c8b890', trousers: '#3a3430', boots: '#2a2018', apron: true, cape: '#3a3a40', lashes: true, build: 1.1, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [NAN.x, NAN.z], face: [NAN.x + 3, NAN.z + 2], anim: 'idle' }],
    barks: ['One bag a month.', 'Most of it\'s for people who aren\'t here.'] },
];

export const MART_LETTERS_CONTENT: RegionContent = {
  id: 'martLetters', quests, npcs: NPCS,
  dialogue: { gw_nan: nan },
  things: FINDS.map(([id, x, z, label, text]) => ({
    land: 'morrow' as const, id, x, z, label, radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'find' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3) g.setStage(Q, 'nan'); },
  })),
};
