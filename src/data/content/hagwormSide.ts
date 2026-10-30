import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// Hagworm Wood's side stories, round Fellers' Camp and the Hollow Oak.
//
// hwHen, THE HEN MONEY (the Hollow Oak): at the bottom of the oak, under a Midsummer love letter, a
// note: "Hannah. I owe you four marks for the speckled hen. I'll leave it here by Lammas. R.M." Below
// it, years later, in another hand: "You never did." Odo Fenn knows the initials: Rafe Marrow, Ide's
// father, who owed half the wood when he died; Hannah was Hannah Ashcroft, Ruth's mother, with the
// hens. 'odo' -> 'ide' -> 'ruth' (Ide pays it: four marks and eleven years' worth, in the note) | done
// (Ide puts the note back in the oak: some debts belong there). Choice hwHen = 'paid' | 'oak'.
//
// hwFly, WHERE FLY WENT (Jabez Thackery, the tracker): his old hound went after a thornback stalker three
// days ago and hasn't come home, and his knee won't take him past the second brook. Follow her trail
// west of the camp (the prints by the brook, the fur on the bramble), kill the stalker at its den in
// the rocks, and call her out. She comes home on three legs. 'trail' -> 'den' -> 'ned' -> done.

const HEN = 'hwHen', FLY = 'hwFly';
/** Inside the Hollow Oak (world/sites.ts buildHollowOak: the hollow's floor at the site's base). */
const OAK: [number, number, number] = [304.5, 24, 600.5];
/** Fly's trail, north-west of Fellers' Camp: the prints by the brook, the fur on the bramble, the den in the rocks. */
const PRINTS: [number, number] = [430.5, 480.5], BRAMBLE: [number, number] = [410.5, 455.5], DEN: [number, number] = [396.5, 431.5];

const items: ItemDef[] = [
  { id: 'hen_note', name: 'A note from the Hollow Oak', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#3a2a20' }, desc: '"Hannah. I owe you four marks for the speckled hen. I\'ll leave it here by Lammas. R.M." Below, in another hand, a long time after: "You never did."' },
  { id: 'hen_money', name: 'The hen money', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#c8a050', b: '#5a4020' }, desc: 'Ide Marrow\'s money folded into her father\'s note, and under "You never did," in Ide\'s square hand: "Paid. I.M."' },
];

// ---------------------------------------------------------------- The Hen Money
const odoNodes: Record<string, DNode> = {
  hn1: {
    text: 'R.M.? That\'ll be Rafe Marrow. Ide\'s father. He owed half the wood when he went, and the other half wouldn\'t lend.',
    options: [{ text: 'And Hannah?', next: 'hn2' }],
  },
  hn2: {
    text: 'Hannah Ashcroft, at Hollin Ford, with the hens. Ruth\'s mother. Dead nine years. Ide\'s been paying her father\'s debts one at a time since he went. Show her.',
    options: [{ text: 'I will.', effect: (g) => g.setStage(HEN, 'ide') }],
  },
};

const ideNodes: Record<string, DNode> = {
  hi1: {
    text: 'That\'s his hand. "I\'ll leave it here by Lammas." He said that about everything.',
    options: [{ text: 'Odo says you pay his debts.', next: 'hi2' }],
  },
  hi2: {
    text: 'Eleven years of them. I keep a list. This one isn\'t on it.',
    options: [{ text: 'What do you want to do?', next: 'hi3' }],
  },
  hi3: {
    text: 'Hannah\'s dead. Ruth isn\'t. Four marks was a week\'s wage when he wrote that.',
    options: [
      { text: 'Pay it. I\'ll take it to Ruth.', next: 'hiPay' },
      { text: 'Some debts belong in the oak.', next: 'hiOak' },
    ],
  },
  hiPay: {
    text: 'Then a week\'s wage now, not four marks then. Here. And I\'ll write under his line. Someone should answer her.',
    options: [{ text: 'I\'ll go to Hollin Ford.', effect: (g) => { g.take('hen_note'); g.give('hen_money'); g.setFlag('hwHen', 'paid'); g.setStage(HEN, 'ruth'); } }],
  },
  hiOak: {
    text: 'Maybe they do. Give it here. I\'ll put it back where he left it, and she answered it. They can have it out between them.',
    options: [{ text: 'Goodbye, Ide.', effect: (g) => { g.take('hen_note'); g.addMarks(40); g.setFlag('hwHen', 'oak'); g.setStage(HEN, 'done'); } }],
  },
};

const ruthNodes: Record<string, DNode> = {
  hr1: {
    text: 'What\'s this, then? That\'s Mum\'s hand at the bottom. "You never did." I\'d know it anywhere.',
    options: [{ text: 'Rafe Marrow owed her for a hen.', next: 'hr2' }],
  },
  hr2: {
    text: 'The speckled hen! She told that one every Lammas. "Rafe Marrow and the speckled hen." Like it was a song.',
    options: [{ text: 'His daughter Ide paid it.', next: 'hr3' }],
  },
  hr3: {
    text: 'Did she. "Paid. I.M." Mum would have laughed till she cried. I\'ll put it in the tin with her things. Here: a jug of the cider. Don\'t argue.',
    options: [{ text: 'I won\'t.', effect: (g) => { g.take('hen_money'); g.give('mulled_cider', 2); g.addMarks(60); g.setStage(HEN, 'done'); } }],
  },
};

// ---------------------------------------------------------------- Where Fly Went
const nedNodes: Record<string, DNode> = {
  fl1: {
    text: 'My bitch, Fly. She went after a stalker three days back and hasn\'t come home.',
    options: [{ text: 'Can\'t you go after her?', next: 'fl2' }, { text: 'I\'m sorry.' }],
  },
  fl2: {
    text: 'Not past the second brook, on this knee. She knows that. She went anyway. North-west of the camp, by the brook.',
    options: [{ text: 'I\'ll find her.', effect: (g) => g.setStage(FLY, 'trail') }, { text: 'Not now.' }],
  },
  flWait: {
    text: (g) => (at(g, FLY) === 'den' ? 'A den in the rocks. She\'ll have it cornered, or it her. Go careful.' : 'North-west, by the brook. Look for her prints over its.'),
    options: [{ text: 'Something else.', next: 'hello' }, { text: 'Going.' }],
  },
  flBack: {
    text: 'She\'s home. Came in on three legs an hour since and went straight under my bench. Won\'t come out for anybody.',
    options: [{ text: 'She found its den.', next: 'flBack2' }],
  },
  flBack2: {
    text: 'Course she did. She\'s nine. That was her last stalker. I\'ll not take her out again. Here. It\'s what I\'d have paid a feller to look.',
    options: [{ text: 'Look after her.', effect: (g) => { g.addMarks(160); g.setStage(FLY, 'done'); } }],
  },
  flAfter: { text: 'Fly\'s under the bench. She lets me scratch her ears now, the three-legged old fool.', options: [{ text: 'Good.' }] },
};

const quests: Record<string, QuestDef> = {
  [HEN]: {
    id: HEN, name: 'The Hen Money', region: 'brambledeep', depth: 'quest',
    notes: (g, s) => {
      if (s === 'odo') return 'At the bottom of the Hollow Oak: "Hannah. I owe you four marks for the speckled hen. I\'ll leave it here by Lammas. R.M." And under it: "You never did." Odo Fenn at Fellers\' Camp knows everyone\'s initials.';
      if (s === 'ide') return 'R.M. was Rafe Marrow, Ide Marrow\'s father, who died owing half the wood. Hannah was Hannah Ashcroft, Ruth\'s mother. Ide pays her father\'s debts.';
      if (s === 'ruth') return 'Ide paid the hen money, a week\'s wage now for four marks then, and wrote "Paid. I.M." under her father\'s line. Ruth Ashcroft should have it.';
      return g.flag('hwHen') === 'paid' ? 'Ruth Ashcroft put the hen money in the tin with her mother\'s things.' : 'Ide put the note back in the Hollow Oak, where her father left it and Hannah answered it.';
    },
    objectives: (_g, s) => (s === 'odo' ? [{ text: 'Ask Odo Fenn at Fellers\' Camp who R.M. was', marker: 'odo' }]
      : s === 'ide' ? [{ text: 'Show the note to Ide Marrow', marker: 'ide' }]
      : s === 'ruth' ? [{ text: 'Take the hen money to Ruth Ashcroft at Hollin Ford', marker: 'ruth' }] : []),
    marks: (_g, s): Marks => (s === 'odo' ? { odo: '?' } : s === 'ide' ? { ide: '?' } : s === 'ruth' ? { ruth: '?' } : {}),
    walk: { cast: ['odo', 'ide', 'ruth'] },
  },
  [FLY]: {
    id: FLY, name: 'Where Fly Went', region: 'brambledeep', depth: 'quest',
    notes: (_g, s) => {
      if (s === 'trail') return 'Jabez Thackery\'s old hound, Fly, went after a thornback stalker three days ago and hasn\'t come home. Her trail starts by the brook north-west of Fellers\' Camp.';
      if (s === 'den') return 'Fly followed the stalker uphill into the rocks. Its den is there, and she\'s in it, or near it.';
      if (s === 'ned') return 'The stalker\'s dead, and Fly limped home ahead of me. Jabez will want to know.';
      return 'Fly is home, on three legs, under Jabez\'s bench. Jabez says that was her last stalker.';
    },
    objectives: (g, s) => {
      if (s === 'trail') return [
        { text: 'Find Fly\'s prints by the brook', marker: 'hwPrints', done: !!g.flag('hwPrints') },
        { text: 'Follow the trail uphill', marker: 'hwBramble', done: !!g.flag('hwBramble') },
      ];
      if (s === 'den') return [
        { text: 'Kill the thornback stalker at its den', done: killed(g, 'hwStalker') >= 1 },
        { text: 'Call Fly out of the rocks', marker: 'hwDen' },
      ];
      return s === 'ned' ? [{ text: 'Go back to Jabez Thackery at Fellers\' Camp', marker: 'master_thackery' }] : [];
    },
    marks: (_g, s): Marks => (s === 'ned' ? { master_thackery: '?' } : {}),
    walk: { cast: ['master_thackery'] },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hwStalker', type: 'thornwolf', at: [DEN], when: (g) => at(g, FLY) === 'den' },
];

/** One sign on Fly's trail; both found, the den. */
const sign = (id: string, [x, z]: [number, number], label: string, text: string) => ({
  id, x, z, label, radius: 2.6,
  when: (g: GameApi) => at(g, FLY) === 'trail' && !g.flag(id),
  use: (g: GameApi) => {
    g.setFlag(id, 1);
    g.toast(text);
    if (g.flag('hwPrints') && g.flag('hwBramble')) g.setStage(FLY, 'den');
  },
});

export const HAGWORM_SIDE_CONTENT: RegionContent = {
  id: 'hagwormSide', items, quests, spawns,
  things: [
    {
      id: 'hwOak', x: OAK[0], z: OAK[2], y: OAK[1], label: 'Read the oldest letters in the oak', radius: 2.4,
      when: (g: GameApi) => !at(g, HEN),
      use: (g: GameApi) => { if (!g.give('hen_note')) return; g.setStage(HEN, 'odo'); g.toast('At the bottom, under a Midsummer love letter, a note folded small: "Hannah. I owe you four marks for the speckled hen." Under it, in another hand: "You never did."'); },
    },
    sign('hwPrints', PRINTS, 'Look at the prints by the brook', 'Two sets of prints in the mud: a stalker\'s, broad and clawed, and a dog\'s close behind. The dog\'s are newer.'),
    sign('hwBramble', BRAMBLE, 'Look at the bramble', 'Grey-brown fur on the thorns, and a smear of blood at a dog\'s height. Not much. The tracks go on uphill, into the rocks.'),
    {
      id: 'hwDen', x: DEN[0] + 1, z: DEN[1] + 1, label: 'Call Fly', radius: 3,
      when: (g: GameApi) => at(g, FLY) === 'den' && killed(g, 'hwStalker') >= 1,
      use: (g: GameApi) => { g.setStage(FLY, 'ned'); g.toast('A whine from under the rocks, and then Fly, on three legs. She looks you over carefully, then sets off for home ahead of you.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'odo', (g) => (at(g, HEN) === 'odo' ? 'hn1' : undefined), odoNodes);
    hook(D, 'ide', (g) => (at(g, HEN) === 'ide' ? 'hi1' : undefined), ideNodes);
    hook(D, 'ruth', (g) => (at(g, HEN) === 'ruth' && g.count('hen_money') > 0 ? 'hr1' : undefined), ruthNodes);
    hook(D, 'master_thackery', (g) => (at(g, FLY) === 'ned' ? 'flBack' : at(g, FLY) === 'trail' || at(g, FLY) === 'den' ? 'flWait' : undefined), nedNodes);
    addOption(D, 'master_thackery', 'hello', { text: 'You keep looking at the trees. Waiting for someone?', next: 'fl1', cond: (g) => !at(g, FLY) });
    addOption(D, 'master_thackery', 'hello', { text: 'How\'s Fly?', next: 'flAfter', cond: (g) => at(g, FLY) === 'done' });
  },
};
