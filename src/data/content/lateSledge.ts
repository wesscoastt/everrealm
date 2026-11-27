import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn } from '../places_regional';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { MORROW_OX } from '../../world/morrow';

// THE LATE SLEDGE, a side story on the Held (Morrow's thinnest regions first: docs/OWED.md).
//
// Every ten days Oswy Hale runs a sledge up from Northgate to the herders' folds: flour, lamp oil, and this month
// the cough syrup for Aud Garth's two youngest, who've been coughing since the first snow. He is two days late,
// and there was a storm.
//
// hdSledge (Aud Garth, at the folds north-east of Northgate):
//   'sledge'  follow the road up from the gate: the sledge over on its side in a drift, the runners snapped, and
//             three crates thrown out across the snow. Dig them out.
//   'oswy'    his tracks go off the road to a barrow mound, where he sheltered in its lee through the storm. Three
//             barrow-wights have come up out of the ground round him. Kill them, and he gets up.
//   'torc'    he has a bronze torc in his coat, out of the barrow: he dug in for shelter and found it, and without his
//             sledge he has nothing to sell. He wants to keep it. Choose:
//               'back'  put it back in the barrow, where the old king's guard will stop looking for it;
//               'keep'  let him keep it and sell it in Northgate for a new sledge.
//   'aud'     bring the crates to Aud.
//
// Northern names are short and old: Hale, Garth.

const Q = 'hdSledge';
const W = (x: number, z: number): [number, number] => [x + MORROW_OX, z];
const [AX, AZ] = W(598.5, -1462.5); // Aud, at the folds
const [SX, SZ] = W(556.5, -1430.5); // the sledge, on the road up from the gate
const [OX, OZ] = W(592.5, -1418.5); // Oswy, in the lee of the barrow mound
/** The three crates thrown out of the sledge, round it in the snow. */
const CRATES: [string, number, number, string][] = [
  ['slCrate1', ...W(550.5, -1425.5), 'A crate of flour, the lid stove in and a white fan of it across the snow. Most of the sacks are whole. You dig it out and drag it back to the road.'] as [string, number, number, string],
  ['slCrate2', ...W(563.5, -1437.5), 'Lamp oil, six stone jars packed in straw. One is cracked and the straw is soaked through, but five are whole.'] as [string, number, number, string],
  ['slCrate3', ...W(548.5, -1440.5), 'A small crate, well packed: brown bottles in sawdust, each with GARTH written on the label in a careful hand. Not one broken.'] as [string, number, number, string],
];
const BARROW = W(596.5, -1414.5);
const dug = (g: GameApi) => CRATES.filter(([id]) => g.flag(id)).length;
const wights = (g: GameApi) => Math.min(3, killed(g, 'slWight'));

const audNodes: Record<string, DNode> = {
  sl1: { speaker: 'narrator', text: 'A broad woman in three coats at the fold gate, looking down the road toward Northgate with her hand over her eyes. Behind her, from one of the huts, a child is coughing.', next: 'sl2' },
  sl2: { text: 'You came up the road? Did you pass a sledge? Oswy Hale. Brown dog, red runners, a bell on the shaft you can hear a mile off.', next: 'sl3' },
  sl3: { text: 'He comes every ten days. This time he\'s bringing syrup for my two youngest. That\'s them you hear. He was due two days ago, and the storm came down the night before.', next: 'sl4' },
  sl4: {
    text: 'I can\'t leave them, and the men are up with the flock. Will you walk down the road and look? If he\'s in a drift, he\'ll need digging out.',
    options: [
      { text: 'I\'ll go and look for him.', effect: (g) => g.setStage(Q, 'sledge') },
      { text: 'Not now.' },
    ],
  },
  slWait: { text: (g) => (at(g, Q) === 'sledge' ? 'Down the road toward the gate. Listen for the bell.' : at(g, Q) === 'oswy' ? 'You found the sledge and not him? Then he walked. Find which way.' : 'Is he all right? Is the syrup all right?') },
  slB1: { speaker: 'narrator', text: 'You set the crate of brown bottles down at Aud\'s feet. She has one open before you have straightened up, and is gone into the hut with a spoon.', next: 'slB2' },
  slB2: {
    text: (g) => (g.flag(Q) === 'keep'
      ? 'Oswy came up behind you an hour ago, walking, and said he\'s getting a new sledge in Northgate. A better one. He wouldn\'t say how he was paying for it. Here. Take this, from all of us at the folds.'
      : 'Oswy came up behind you an hour ago, walking, and sat by our fire and didn\'t say much. He said he left something where he found it. He said you made him. Here. Take this, from all of us at the folds.'),
    options: [{ text: 'Look after them.', effect: (g) => { g.addMarks(460); g.give('fold_cheese', 3); g.setStage(Q, 'done'); } }],
  },
  slAfter: { text: 'They\'re sleeping through. First time in a month. Oswy\'s due back on the tenth. He\'ll be on time. I\'ve told him.' },
};

const oswyNodes: Record<string, DNode> = {
  so1: { speaker: 'narrator', text: 'A man in a snow-crusted coat sitting with his back to the barrow mound, a dog\'s lead wrapped round his fist and no dog on it. He looks at the wights you\'ve put down, and then at you.', next: 'so2' },
  so2: { text: 'The storm had the sledge over and the dog ran. I dug in here, against the mound. It was that or freeze. Then they came up out of the ground. They\'ve walked round me two nights.', next: 'so3' },
  so3: { text: 'The Garth syrup. Is it whole? Thank the Held for that. And I\'ll tell you something else, because you\'ll see it anyway.', next: 'so4' },
  so4: { speaker: 'narrator', text: 'He opens his coat. Round his neck, over his shirt, is a torc of old bronze, green at the ends, thick as a thumb.', next: 'so5' },
  so5: { text: 'I dug in for shelter and my hands found it. The sledge is kindling and the dog\'s gone. This would buy a new sledge, and the dog besides. The ones it belonged to don\'t need it.', next: 'so6' },
  so6: {
    text: 'Except they came up after it. I know that. I\'m not a fool. What would you do?',
    options: [
      { text: 'Give it to me. I\'ll put it back where you found it.', next: 'soBack' },
      { text: 'Keep it. You nearly died out here, and the dead have enough.', next: 'soKeep' },
    ],
  },
  soBack: {
    text: 'Back. Yes. All right. It was warm, you know, against my neck, the whole two nights. Here. Where my hands were, at the foot of the mound. Then go and tell Aud the syrup\'s coming.',
    options: [{ text: 'I will.', effect: (g) => { g.setFlag(Q, 'back'); g.give('barrow_torc', 1); g.setStage(Q, 'torc'); } }],
  },
  soKeep: {
    text: 'You think so? Then I\'ll take it to Northgate and not say where it came from, and I\'ll buy a sledge with a better bell. Go on. Take the syrup up. I\'ll follow.',
    options: [{ text: 'Go carefully.', effect: (g) => { g.setFlag(Q, 'keep'); g.setStage(Q, 'aud'); } }],
  },
  soAfter: { text: (g) => (g.flag(Q) === 'keep' ? 'A new sledge on the tenth. Red runners again. I\'ll not say what paid for it.' : 'It\'s back where it was. I\'ve stopped feeling the cold on my neck. Funny.') },
};

const aud: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'sl1' : s === 'aud' ? 'slB1' : s === 'done' ? 'slAfter' : 'slWait'; },
  nodes: audNodes,
};
const oswy: DialogueTree = {
  start: (g) => (at(g, Q) === 'oswy' && wights(g) >= 3 ? 'so1' : 'soAfter'),
  nodes: oswyNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Late Sledge', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'sledge') return `Oswy Hale's sledge brings flour, oil and the Garth children's cough syrup up from Northgate every ten days. He's two days late, after a storm. Aud Garth asked me to walk down the road and look. (crates ${dug(g)}/3)`;
      if (s === 'oswy') return `The sledge was over in a drift and the crates thrown wide, but no Oswy. His tracks go off the road to a barrow mound, and barrow-wights are about it. (wights ${wights(g)}/3)`;
      if (s === 'torc') return 'Oswy sheltered against the barrow and dug out an old bronze torc. I said I\'d put it back where he found it, at the foot of the mound.';
      if (s === 'aud') return 'Oswy is on his feet and the syrup is whole. Aud Garth is waiting at the folds.';
      return g.flag(Q) === 'keep' ? 'Oswy kept the barrow\'s torc and bought a new sledge with it.' : 'The torc is back in the barrow, and Oswy walks up to the folds every ten days again.';
    },
    objectives: (g, s) => (s === 'sledge' ? [{ text: 'Find the sledge on the road down toward Northgate', marker: 'slSledge', done: !!g.flag('slSledge') }, ...CRATES.map(([id], i) => ({ text: `Dig out the ${['flour', 'oil', 'syrup'][i]} crate`, marker: id, done: !!g.flag(id) }))]
      : s === 'oswy' ? [{ text: `Kill the barrow-wights round the mound (${wights(g)}/3)`, done: wights(g) >= 3, marker: wights(g) >= 3 ? undefined : 'hd_oswy' }, { text: 'Get Oswy Hale on his feet', marker: 'hd_oswy' }]
        : s === 'torc' ? [{ text: 'Put the torc back at the foot of the barrow mound', marker: 'slTorc' }]
          : s === 'aud' ? [{ text: 'Take the syrup up to Aud Garth at the folds', marker: 'hd_aud' }] : []),
    advance: (g, s) => (s === 'sledge' && dug(g) >= 3 && g.flag('slSledge') ? 'oswy' : null),
    marks: (_g, s): Marks => (!s ? { hd_aud: '!' } : s === 'oswy' ? { hd_oswy: '?' } : s === 'aud' ? { hd_aud: '?' } : {}),
    walk: { cast: ['hd_aud', 'hd_oswy'], kill: { oswy: [['barrowwight', 3]] }, from: { quests: { hdFold: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'slWight', type: 'barrowwight', at: [W(588.5, -1424.5), W(598.5, -1410.5), W(603.5, -1421.5)], when: (g) => at(g, Q) === 'oswy' },
];

const NPCS: NpcDef[] = [
  { id: 'hd_aud', name: 'Aud Garth', title: 'Of the folds', land: 'morrow',
    look: { frame: 'f', skin: '#e0b898', hair: '#8a6a4a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#5a4a3a', trim: '#a8a8a0', trousers: '#3a3430', boots: '#2a2018', cape: '#6a5a48', hat: 'hood', hatColor: '#6a5a48', lashes: true, build: 1.15, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [AX, AZ], face: [AX - 4, AZ + 6], anim: 'idle' }], barks: ['Listen for a bell.', 'Hush, now. Hush.'] },
  { id: 'hd_oswy', name: 'Oswy Hale', title: 'Sledge-runner', land: 'morrow', when: (g) => at(g, Q) === 'oswy' || at(g, Q) === 'torc',
    look: { skin: '#d8b090', hair: '#5a4a3a', hairStyle: 3, beard: true, eyes: '#4a4a3a', tunic: '#4a3a2e', trim: '#c8c0b0', trousers: '#3a3430', boots: '#2a2018', cape: '#8a8a88', hat: 'cap', hatColor: '#3a2e24', build: 1.05, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [OX, OZ], face: [OX - 4, OZ - 4], anim: 'idle' }], barks: ['They walk round and round.', 'The dog ran. Good dog.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'barrow_torc', name: 'Bronze torc', kind: 'material', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'ring', a: '#8a7a3a', b: '#4a8a6a' },
    desc: 'Old bronze, thick as a thumb, green at the ends. It is warmer than it ought to be.', stats: 'It belongs at the foot of the barrow mound.' },
  { id: 'fold_cheese', name: 'Fold cheese', kind: 'food', rarity: 'common', stack: true, value: 14, icon: { shape: 'bread', a: '#e8d8a8', b: '#a88a4a' }, heal: 40,
    desc: 'Hard ewe\'s cheese from the herders\' folds on the Held, aged in the cold. It keeps all winter and tastes of it.' },
];

export const LATE_SLEDGE_CONTENT: RegionContent = {
  id: 'lateSledge', quests, items: ITEMS, npcs: NPCS, spawns,
  dialogue: { hd_aud: aud, hd_oswy: oswy },
  things: [
    {
      land: 'morrow' as const, id: 'slSledge', x: SX, z: SZ, label: 'Look at the sledge', radius: 2.8,
      when: (g: GameApi) => at(g, Q) === 'sledge' && !g.flag('slSledge'),
      use: (g: GameApi) => { g.setFlag('slSledge', 1); g.toast('A sledge on its side in a drift, red runners snapped short, the bell on its shaft half buried and silent. The dog\'s traces are cut through. Three crates have been thrown out across the snow.'); if (dug(g) >= 3) g.setStage(Q, 'oswy'); },
    },
    ...CRATES.map(([id, x, z, text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Dig out the crate', radius: 2.6,
      when: (g: GameApi) => at(g, Q) === 'sledge' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (dug(g) >= 3 && g.flag('slSledge')) { g.toast('Boot prints lead off the road, half filled with drift, toward a long low mound to the north-east.'); g.setStage(Q, 'oswy'); } },
    })),
    {
      land: 'morrow' as const, id: 'slTorc', x: BARROW[0], z: BARROW[1], label: 'Put the torc back', radius: 2.6,
      when: (g: GameApi) => at(g, Q) === 'torc',
      use: (g: GameApi) => { g.take('barrow_torc', 1); g.toast('You push the torc back into the hollow Oswy\'s hands made, at the foot of the mound, and cover it over. The snow round the barrow is very quiet.'); g.setStage(Q, 'aud'); },
    },
  ],
};
