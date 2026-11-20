import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { MORROW_OX } from '../../world/morrow';

// More of Tenwells, on the Glass Flats (docs/LORE.md "Tenwells"; after The Fourth Well, morrowSide.ts mwSalt).
// The water law on the stone at the fourth well: THE WATER IS NOT SOLD AT THE WELL. Whoever comes in off the Flats
// drinks first, and pays after or not at all (data/monuments.ts, twlaw).
//
// twFirst, DRINKS FIRST (Ennis Wade): a salt reaver walked in off the Flats at dawn, burned black, and drank at the
// fourth well, the one his own people salted, and he's still sitting by it. His name is Dace. He poured the salt.
// The reavers left him in the glare for losing a skin of their water. Cass Moran wants him hanged from the road board.
// Ennis points at the stone. Let him drink and go, by the law; give him to Cass; or ([Honest]) put the spade in his
// hands: he dug the reavers' wells, and he can dig Tenwells' eleventh. twFirst = 'law' | 'cass' | 'dig'.

const FIRST = 'twFirst';
const WELL: [number, number] = [MORROW_OX + 1052.5, -211.5];
const DACE = { x: WELL[0], y: 24, z: WELL[1] + 3.5 };

const ennisNodes: Record<string, DNode> = {
  df1: { text: 'There\'s a reaver at my fourth well. Walked in off the Flats at sunup with the skin burned off his face, knelt at the salt well, the one his lot spoiled, and drank it. Salt and all. He\'s still sitting there.', next: 'df2' },
  df2: { text: 'Cass wants him strung up off the road board, and half the yard agrees. And there\'s the stone. Whoever comes in off the Flats drinks first. It doesn\'t say except reavers. Talk to him. I can\'t. I keep wanting to hit him.', options: [{ text: 'I\'ll talk to him.', effect: (g) => g.setStage(FIRST, 'dace') }, { text: 'Not now.' }] },
  db1: { text: 'He poured it. Course he did. And they left him out in the glare for spilling a skin. Well. Cass is at the gate with a rope, and the stone\'s at the well. You\'ve talked to him. You choose.', next: 'db2' },
  db2: {
    text: 'Go on.',
    options: [
      { text: 'He came in off the Flats. He drinks first, and pays after or not at all. Let him go.', moral: { id: 'twFirst:law', tr: { compassion: 2, honesty: 1 }, npc: { ennis_wade: 15, cass_moran: -15, tw_dace: 20 } }, effect: (g) => { g.setFlag(FIRST, 'law'); g.addMarks(80); g.setStage(FIRST, 'done'); }, next: 'dbL' },
      { text: 'He salted a well. Give him to Cass.', moral: { id: 'twFirst:cass', tr: { loyalty: 1, cruelty: 2 }, npc: { ennis_wade: -10, cass_moran: 20, tw_dace: -40 } }, effect: (g) => { g.setFlag(FIRST, 'cass'); g.addMarks(80); g.setStage(FIRST, 'done'); }, next: 'dbC' },
      { text: 'He dug the reavers\' wells. Put a spade in his hands and let him dig yours.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'twFirst:dig', a: 3, tr: { honesty: 2, compassion: 1 }, npc: { ennis_wade: 20, cass_moran: 5, tw_dace: 30 } }, effect: (g) => { g.setFlag(FIRST, 'dig'); g.addMarks(80); g.setStage(FIRST, 'done'); }, next: 'dbD' },
    ],
  },
  dbL: { speaker: 'narrator', text: 'Ennis fills two skins from his own barrel, not the well, and walks them out to the south gate himself, past Cass and her rope, and puts them in Dace\'s hands. Dace goes out into the glare without looking back. Cass doesn\'t speak to Ennis for a week. Ennis pays you anyway.' },
  dbC: { speaker: 'narrator', text: 'Cass doesn\'t hang him. She ties him to a caravan going north, to be handed to the Assembly\'s men at the first fort, and he walks behind it all the way, and nobody in Tenwells watches him go. Ennis pays you without a word, and goes and stands at the stone for a long time.' },
  dbD: { speaker: 'narrator', text: 'Dace digs for nine days in the north-east corner of the yard with a borrowed spade and a guard on him, and on the tenth the water comes up sweet. They call it the eleventh well. Cass puts a nail for it on her road board. Ennis pays you out of the till and says it\'s the best money he ever spent.' },
  dfAfter: {
    text: (g) => (g.flag(FIRST) === 'dig'
      ? 'Eleven wells. First new one in three hundred years, and a reaver dug it. Dace stayed on. He keeps the eleventh. Nobody\'s quite forgiven him, and everybody drinks from it.'
      : g.flag(FIRST) === 'cass'
        ? 'The Assembly hanged him at Callis, they say. I didn\'t ask. The stone\'s still there. I read it every morning. It\'s got harder to read.'
        : 'He came back in the spring with a skin of water off the reavers\' last well and poured it into the fourth. Pays after. That\'s the law.'),
    next: 'a',
  },
};

const dace: DialogueTree = {
  start: (g) => (at(g, FIRST) === 'dace' ? 'd1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(FIRST) === 'dig' ? 'Sweet water. Taste it. I dug that.' : 'Leave me be.'),
      options: [{ text: 'Good day.' }],
    },
    d1: { speaker: 'narrator', text: 'A young man in the reavers\' white wraps, gone grey with dust, sitting on the stones in front of the fourth well, looking at it. The skin of his face is burned raw by the glare. A white hand is painted on the back of each of his own.', next: 'd2' },
    d2: { text: 'Dace. I salted it. Me, with a sack on each shoulder, a month back. Then I spilled a skin of our water on the way north, and they left me in the glare for it. Four days. I walked here because it was the only well I knew the way to.', next: 'd3' },
    d3: { text: 'I knelt down at this one on purpose. I thought it was owed. Then I read the stone. Whoever comes in off the Flats drinks first. Nobody ever told me that was the law here. Out there the law is a mark a skin.', options: [{ text: 'I\'ll tell Ennis.', effect: (g) => g.setStage(FIRST, 'back') }] },
  },
};

const quests: Record<string, QuestDef> = {
  [FIRST]: {
    id: FIRST, name: 'Drinks First', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'dace') return 'A salt reaver walked into Tenwells off the Flats and drank from the fourth well, the one his people salted. Ennis Wade wants me to talk to him. Cass Moran wants him hanged.';
      if (s === 'back') return 'Dace poured the salt, and the reavers left him in the glare. Back to Ennis Wade.';
      const f = g.flag(FIRST);
      return f === 'dig' ? 'Dace dug Tenwells an eleventh well.' : f === 'cass' ? 'Cass Moran sent Dace north to the Assembly.' : 'Dace drank first, and went, by the law on the stone.';
    },
    objectives: (_g, s) => (s === 'dace' ? [{ text: 'Talk to the reaver at the fourth well', marker: 'tw_dace' }]
      : s === 'back' ? [{ text: 'Back to Ennis Wade', marker: 'ennis_wade' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'mwSalt') === 'done' ? { ennis_wade: '!' } : s === 'dace' ? { tw_dace: '?' } : s === 'back' ? { ennis_wade: '?' } : {}),
    walk: { cast: ['ennis_wade', 'tw_dace'], from: { quests: { mwSalt: 'done' } } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'tw_dace', name: 'Dace', title: 'Came in off the Flats', look: { skin: '#c87850', hair: '#d8d0b8', hairStyle: 1, eyes: '#4a3a2a', tunic: '#e8e0d0', trim: '#c8c0a8', shirt: '#e8e0d0', trousers: '#d8d0b8', boots: '#8a7a5a', hat: 'kerchief', hatColor: '#e8e0d0', build: 0.85, age: 0.25 },
    schedule: [{ from: 0, to: 24, at: [DACE.x, DACE.z], face: [WELL[0], WELL[1]], anim: 'seated', y: DACE.y }],
    when: (g) => at(g, 'mwSalt') === 'done' && g.flag(FIRST) !== 'cass' && g.flag(FIRST) !== 'law',
    barks: ['Drinks first.', 'Leave me be.'] },
];

export const TENWELLS_MORE: RegionContent = {
  id: 'tenwellsMore',
  npcs: NPCS,
  dialogue: { tw_dace: dace },
  quests,
  hooks: (D) => {
    hook(D, 'ennis_wade', (g) => (at(g, FIRST) === 'back' ? 'db1' : undefined), ennisNodes);
    addOption(D, 'ennis_wade', 'a', { text: 'Who\'s that by the fourth well?', cond: (g) => at(g, 'mwSalt') === 'done' && !at(g, FIRST), next: 'df1' });
    addOption(D, 'ennis_wade', 'a', { text: 'About the reaver.', cond: (g) => at(g, FIRST) === 'done', next: 'dfAfter' });
  },
};
