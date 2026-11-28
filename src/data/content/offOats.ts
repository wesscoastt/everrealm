import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { addOption, at, deed, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import { BEND, DOWNS, TRACK_W } from '../races';

// OFF HER OATS, a side story of the Amberwold Downs (Morrow's regions, more side stories: docs/OWED.md).
//
// Jenna Polgrain keeps the yard at the Downs (data/content/downs.ts), and she has been saying all week that Salt Lick
// is off her oats. Three days before the Amberwold Cup the mare won't eat and stands with her head down, and Jenna
// thinks somebody is at her feed.
//
// abOats (Jenna Polgrain, the yard):
//   'look'   the feed bin (a bitter grey powder in the bottom of it), the yard's back gate (a lad's boot prints in the
//            mud, coming in after dark), and the board at Barnabas Quick's book (Salt Lick drifting from short to
//            long all week, and one name laying against her again and again: a Callis owner's).
//   'jenna'  back to Jenna: the prints are small and the gate key is the yard's own. It is Pip Kerrow, her own lad,
//            paid by the Callis man to keep Salt Lick out of the Cup. Choose:
//              'stewards'  hand Pip to the stewards; he is warned off every course in Morrow, and the Callis owner is
//                          never named (honesty);
//              'keep'      Jenna keeps him on if he names the man who paid him, and she takes the name to the
//                          stewards herself (compassion).

const Q = 'abOats';
const JENNA = { x: DOWNS.x - 7.5, z: DOWNS.z - BEND - 12.5 };
const Z0 = DOWNS.z + BEND + Math.ceil(TRACK_W / 2) + 2, X0 = DOWNS.x - 22;
const FINDS: [string, number, number, string, string][] = [
  ['aoBin', JENNA.x + 3.5, JENNA.z - 2.5, 'Look in Salt Lick\'s feed bin', 'Oats, and at the bottom of the bin, under them, a fine grey powder. You wet a finger and touch your tongue: bitter as a sloe, and your lip goes numb. Enough to put a horse off her feed and slow her for a week. Not enough to kill her. Whoever did this knew horses.'],
  ['aoGate', JENNA.x - 8.5, JENNA.z - 6.5, 'Look at the yard\'s back gate', 'The back gate is locked, and the lock is good. In the mud on the yard side, a boy\'s boot prints, small and light, coming in and going out again. No marks on the lock. Whoever came in had the yard\'s own key.'],
  ['aoBoard', X0 - 7.5, Z0 + 1, 'Read the prices on Barnabas Quick\'s board', 'Salt Lick was second favourite at the start of the week. She drifts every day after: short, then long, then longer. And down the side of the board, in Barnabas\'s hand, one bet against her again and again, all from the same name: Moll Ferrer, Callis, who has a horse in the Cup.'],
];
const found = (g: GameApi) => FINDS.filter(([id]) => g.flag(id)).length;

const nodes: Record<string, DNode> = {
  oo1: { text: 'Salt Lick. Best mare in my yard, and three days to the Cup, and she won\'t touch her oats. Stands with her head down in the corner. She ate like a horse last week. Like two.', next: 'oo2' },
  oo2: {
    text: 'There\'s nothing wrong with her. I\'ve had her mouth open, her feet up, my ear to her side. Somebody\'s at her feed, and I can\'t leave the yard to find out who. Will you look? The bin, the back gate, and Barnabas\'s board. Prices don\'t lie, he says. He lies, mind.',
    options: [
      { text: 'I\'ll find out who\'s at her feed.', effect: (g) => g.setStage(Q, 'look') },
      { text: 'Not now.' },
    ],
  },
  ooWait: { text: (g) => `The bin, the back gate, Barnabas's board. ${found(g)} of three. And keep your voice down in the yard. Whoever it is, they're near enough to hear.` },
  ooB1: { text: 'Powder in the bin. The yard\'s own key at the gate. A Callis owner laying against her all week.', next: 'ooB2' },
  ooB2: { speaker: 'narrator', text: 'Jenna looks across the yard to where a boy of fourteen or so is mucking out a stall, and doesn\'t look away for a long time.', next: 'ooB3' },
  ooB3: { text: 'Pip Kerrow. Small feet. He has the key to the back gate because I gave it him, because I trust him. His mam\'s been poorly since harvest. I should have asked where the money for her physic came from.', next: 'ooB4' },
  ooB4: {
    text: 'The stewards would warn him off every course in Morrow, and Moll Ferrer would say she never heard of him. Or I keep him, if he gives me Ferrer\'s name in front of a steward, and I take it in myself. What would you do?',
    options: [
      { text: 'Hand Pip to the stewards. He knew what he was doing to that mare.', next: 'ooStewards' },
      { text: 'Keep him on if he names Ferrer. Let the stewards have the one who paid.', next: 'ooKeep' },
    ],
  },
  ooStewards: {
    text: 'He did know. He sat up with her the first night she wouldn\'t eat, and he knew. All right. I\'ll take him to them myself. Here, for your trouble. And if Salt Lick runs, back her. Barnabas has her long.',
    options: [{ text: 'I\'m sorry, Jenna.', effect: (g) => { g.setFlag(Q, 'stewards'); deed(g, { id: 'abOats:stewards', a: 2, tr: { honesty: 5 }, npc: { downs_stable: 5 }, note: 'Told Jenna Polgrain to hand her stable lad to the stewards for nobbling a horse.' }); g.addMarks(460); g.setStage(Q, 'done'); } }],
  },
  ooKeep: {
    text: 'Aye. Ferrer, not the boy. He\'ll say it, he\'ll be glad to, he\'s been sick with it. Here, for your trouble. And if Salt Lick runs, back her. Barnabas has her long.',
    options: [{ text: 'Look after him.', effect: (g) => { g.setFlag(Q, 'keep'); deed(g, { id: 'abOats:keep', a: 3, tr: { compassion: 5 }, npc: { downs_stable: 15 }, note: 'Helped Jenna Polgrain keep her stable lad on, in exchange for the name of the owner who paid him.' }); g.addMarks(460); g.setStage(Q, 'done'); } }],
  },
  ooAfter: {
    text: (g) => (g.flag(Q) === 'stewards'
      ? 'Pip\'s warned off. Ferrer swore blind she never met him, and the stewards took her word. Salt Lick ran third. She\'d have won. I know she would.'
      : 'Ferrer\'s horse is barred from the Cup for a year, and Ferrer from the stand. Pip\'s mucking out and won\'t look at me yet. Salt Lick ran second, on four days\' oats. Next year.'),
  },
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Off Her Oats', region: 'amberwold', depth: 'quest',
    notes: (g, s) => {
      if (s === 'look') return `Salt Lick, the best mare in Jenna Polgrain's yard at the Amberwold Downs, won't eat three days before the Cup, and Jenna thinks somebody is at her feed. Look in the feed bin, at the back gate, and at Barnabas Quick's board. (${found(g)}/3)`;
      if (s === 'jenna') return 'Powder in the bin, the yard\'s own key used at the back gate, and a Callis owner laying against Salt Lick all week. Jenna Polgrain should hear it.';
      return g.flag(Q) === 'stewards' ? 'Jenna Polgrain handed her lad Pip Kerrow to the stewards for nobbling Salt Lick. The owner who paid him was never named.' : 'Jenna Polgrain kept her lad Pip Kerrow on, and he named the Callis owner who paid him to the stewards.';
    },
    objectives: (g, s) => (s === 'look'
      ? FINDS.map(([id, , , label]) => ({ text: label, marker: id, done: !!g.flag(id) }))
      : s === 'jenna' ? [{ text: 'Tell Jenna Polgrain what you found', marker: 'downs_stable' }] : []),
    advance: (g, s) => (s === 'look' && found(g) >= 3 ? 'jenna' : null),
    marks: (_g, s): Marks => (!s ? { downs_stable: '!' } : s === 'jenna' ? { downs_stable: '?' } : {}),
    walk: { cast: ['downs_stable'] },
  },
};

export const OFF_OATS_CONTENT: RegionContent = {
  id: 'offOats', quests,
  things: FINDS.map(([id, x, z, label, text]) => ({
    land: 'morrow' as const, id, x, z, label, radius: 2.4,
    when: (g: GameApi) => at(g, Q) === 'look' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3) g.setStage(Q, 'jenna'); },
  })),
  hooks: (D) => {
    hook(D, 'downs_stable', (g) => (at(g, Q) === 'look' ? 'ooWait' : at(g, Q) === 'jenna' ? 'ooB1' : undefined), nodes);
    addOption(D, 'downs_stable', 'main', { text: 'Salt Lick\'s off her oats?', cond: (g) => !at(g, Q), next: 'oo1' });
    addOption(D, 'downs_stable', 'main', { text: 'About Salt Lick.', cond: (g) => at(g, Q) === 'done', next: 'ooAfter' });
  },
};
