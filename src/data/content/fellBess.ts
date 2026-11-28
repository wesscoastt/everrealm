import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// BESS, a side story of the Held (Morrow's thinner regions: docs/OWED.md).
//
// Wilf Harker is eighty and still runs a flock on the fell north of Northgate's wall, from a croft his grandfather
// built. Two nights ago, in the first snow, his old dog Bess went up the fell after a ewe that had wandered, and she
// hasn't come back. He can't climb after her, and his son in Northgate says it's time he stopped trying.
//
// hkBess (Wilf Harker, his croft on the fell):
//   'track'  up the fell: Bess's prints at the beck, and further on, wolf blood on a stone and no dog blood.
//   'bield'  at the old stone bield on the tops, Bess is standing over the ewe and twin lambs she found, and the ice
//            wolves are round the bield (three, the quest's own). Drive them off and she brings them home.
//   'wilf'   Bess is home with the ewe and lambs. Wilf's son wants him down in Northgate for the winter. He asks you:
//              'down'  go down to his son for the winter; Bess goes with him, the flock to a neighbour (compassion);
//              'stay'  one more winter on the fell; you carry his hay up before the snow comes in (loyalty).
//
// Northern names are short and old: Harker, Aske, Garth.

const Q = 'hkBess';
const WILF = { x: 6850.5, z: -1440.5 };
const BECK = { x: 6830.5, z: -1480.5 };
const STONE = { x: 6810.5, z: -1520.5 };
const BIELD = { x: 6790.5, z: -1560.5 };
const wolves = (g: GameApi) => Math.min(3, killed(g, 'hkWolf'));

const wilfNodes: Record<string, DNode> = {
  hb1: { speaker: 'narrator', text: 'An old man on a bench outside a low stone croft, a crook across his knees and his eyes on the fell. He has been sitting there a while. The snow on the bench beside him has not been brushed off.', next: 'hb2' },
  hb2: { text: 'Wilf Harker. You\'ll not have seen a dog, coming up? Black and white, grey at the muzzle, one ear up and one down. Answers to Bess, when she feels like it.', next: 'hb3' },
  hb3: { text: 'Ewe got out two nights back, in the first snow. Bess went after her before I could call her in. She\'s never not come back. Twelve years, and never not come back.', next: 'hb4' },
  hb4: {
    text: 'I can\'t get up there. Legs won\'t have it. My lad in Northgate says that\'s the fell telling me something. Would you go up and look? The beck first, then the tops. There\'s an old bield up there she knows.',
    options: [
      { text: 'I\'ll find Bess.', effect: (g) => g.setStage(Q, 'track') },
      { text: 'Not now.' },
    ],
  },
  hbWait: { text: (g) => (at(g, Q) === 'bield' ? `If she's anywhere, she's at the bield on the tops. And if the wolves are down off the high fell, she'll be standing over that ewe and not moving. ${wolves(g)} of three seen off.` : 'The beck first. If she crossed it you\'ll see her feet in the mud. Then on up.') },
  hbHome1: { speaker: 'narrator', text: 'Bess is lying across Wilf\'s boots on the bench, too tired to lift her head. The ewe and her two lambs are in the fold behind the croft. Wilf has his hand on the dog and hasn\'t taken it off.', next: 'hbHome2' },
  hbHome2: { text: 'She stood over them two nights. Two nights in the snow, with the wolves round, and she never left them. That\'s Bess.', next: 'hbHome3' },
  hbHome3: {
    text: 'My lad\'s right, though, isn\'t he? I couldn\'t get up there. If you hadn\'t come by she\'d be dead and so would they. He wants me down in Northgate for the winter. What would you do?',
    options: [
      { text: 'Go down to your son. Take Bess. Let a neighbour winter the flock.', next: 'hbDown' },
      { text: 'One more winter. I\'ll carry your hay up before the snow comes in.', next: 'hbStay' },
    ],
  },
  hbDown: {
    text: 'Aye. I know it. I knew it before you said it. Garth\'ll take the flock, he\'s been asking. Bess comes with me, mind. She\'d not have it any other way. Take this. And thank you for saying it kindly.',
    options: [{ text: 'Look after her, Wilf.', effect: (g) => { g.setFlag(Q, 'down'); deed(g, { id: 'hkBess:down', a: 3, tr: { compassion: 5 }, npc: { hk_wilf: 10 }, note: 'Told Wilf Harker to go down to his son in Northgate for the winter.' }); g.addMarks(420); g.setStage(Q, 'done'); } }],
  },
  hbStay: {
    text: 'One more. That\'s what I\'ve said every year for six years. You\'ll carry the hay? Then I\'ll stop the lad\'s mouth with it. Here. Come up in the spring and see the lambs.',
    options: [{ text: 'I\'ll come in the spring.', effect: (g) => { g.setFlag(Q, 'stay'); deed(g, { id: 'hkBess:stay', tr: { loyalty: 5 }, npc: { hk_wilf: 20 }, note: 'Helped Wilf Harker keep his flock on the fell one more winter.' }); g.addMarks(420); g.setStage(Q, 'done'); } }],
  },
  hbAfter: {
    text: (g) => (g.flag(Q) === 'down'
      ? '(A boy from Northgate is mending the croft\'s roof.) Grandad\'s down in the town with us. Bess sleeps across the door and won\'t let anyone past after dark. He sits at the window and looks at the fell.'
      : 'Hay\'s in, and I\'ve not been up to the tops once, which my lad says is a mercy. Bess has. Twice. She comes back and looks at me like I should know where she\'s been.'),
  },
};

const wilf: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'hb1' : s === 'wilf' ? 'hbHome1' : s === 'done' ? 'hbAfter' : 'hbWait'; },
  nodes: wilfNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Bess', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'track') return 'Wilf Harker\'s old dog Bess went up the fell after a ewe in the first snow and hasn\'t come back. Look at the beck for her prints, then on up toward the old bield on the tops.';
      if (s === 'bield') return `There is wolf blood on a stone above the beck and none of it is Bess's. If she's anywhere it's the bield on the tops. (${wolves(g)}/3 wolves)`;
      if (s === 'wilf') return 'Bess is home with the ewe and twin lambs she stood over for two nights. Wilf Harker is on his bench.';
      return g.flag(Q) === 'down' ? 'Wilf Harker has gone down to his son in Northgate for the winter, with Bess. A neighbour has the flock.' : 'Wilf Harker is keeping his flock on the fell one more winter. I carried his hay up.';
    },
    objectives: (g, s) => (s === 'track'
      ? [{ text: 'Look for Bess\'s prints at the beck', marker: 'hbBeck', done: !!g.flag('hbBeck') }, { text: 'Follow on up the fell', marker: 'hbStone', done: !!g.flag('hbStone') }]
      : s === 'bield' ? [{ text: `Drive the ice wolves off from the bield (${wolves(g)}/3)`, marker: `at:${BIELD.x},${BIELD.z}` }]
        : s === 'wilf' ? [{ text: 'Go back to Wilf Harker', marker: 'hk_wilf' }] : []),
    advance: (g, s) => (s === 'track' && g.flag('hbBeck') && g.flag('hbStone') ? 'bield' : s === 'bield' && wolves(g) >= 3 ? 'wilf' : null),
    marks: (_g, s): Marks => (!s ? { hk_wilf: '!' } : s === 'wilf' ? { hk_wilf: '?' } : {}),
    walk: { cast: ['hk_wilf'], kill: { bield: [['icewolf', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'hk_wilf', name: 'Wilf Harker', title: 'Shepherd, the fell above Northgate',
    look: { skin: '#d8b098', hair: '#d8d4cc', hairStyle: 0, facial: 3, eyes: '#5a6a7a', tunic: '#5a5444', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a2018', cape: '#4a4438', hat: 'cap', hatColor: '#3a3430', build: 0.9, height: 0.95, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [WILF.x, WILF.z], face: [WILF.x - 3, WILF.z - 4], anim: 'idle' }],
    barks: ['Twelve years, and never not come back.', 'Legs won\'t have it.'] },
];

export const FELL_BESS_CONTENT: RegionContent = {
  id: 'fellBess', quests, npcs: NPCS,
  dialogue: { hk_wilf: wilf },
  spawns: [
    { land: 'morrow', tag: 'hkWolf', type: 'icewolf', at: [[BIELD.x + 5, BIELD.z + 3], [BIELD.x - 4, BIELD.z + 5], [BIELD.x + 2, BIELD.z - 5]], when: (g) => at(g, Q) === 'bield' },
  ],
  things: [
    { land: 'morrow', id: 'hbBeck', x: BECK.x, z: BECK.z, label: 'Look at the mud by the beck', radius: 2.6,
      when: (g: GameApi) => at(g, Q) === 'track' && !g.flag('hbBeck'),
      use: (g: GameApi) => { g.setFlag('hbBeck', 1); g.toast('In the mud at the edge of the beck, a dog\'s prints, small and light, and the sharp prints of a ewe ahead of them. Both going up.'); } },
    { land: 'morrow', id: 'hbStone', x: STONE.x, z: STONE.z, label: 'Look at the blood on the stone', radius: 2.6,
      when: (g: GameApi) => at(g, Q) === 'track' && !!g.flag('hbBeck') && !g.flag('hbStone'),
      use: (g: GameApi) => { g.setFlag('hbStone', 1); g.toast('Blood on a flat stone, and tufts of grey fur round it, not black and white. Wolf. Whatever happened here, the dog gave as good as she got, and the prints go on up toward the tops.'); } },
  ],
};
