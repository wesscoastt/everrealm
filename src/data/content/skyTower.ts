import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';

// The tower in the trees on Verandah's south cliffs (OWED 97x stage 9, docs/VERANDAH.md: the door survey's
// "farmstead" at -3369, 2822, which is a tall timber tower with a deck over the treetops). Ursula Toms built it.
// She made almanacs for the Collegium in Ansbury for thirty years and came here to watch the southern sky, and now
// she watches the great dark thing that comes out of the south every few hours (game/DragonPass.ts, docs/LORE.md
// "The Old Mother going over"). Nobody knows what it is. Ursula wants to know where it goes.
//
// vhTower, THE TOWER BOOK (Ursula Toms): she has the bearing it comes in on, forty-one times. She needs the bearing
// it goes out on, from the north of the island: Sampson Keast at Carn Hold and Kensa Nankivell on Kestle hill both
// watch the sky for a living. With all three, the line is ruled: the same course every time, out of the south past
// anything on the charts, and on north over the Counties toward the Scarth Highlands, as straight as a ship laid on a
// course. Send the book to the Collegium, to the king, or burn the page with the line on it. vhTower = 'collegium' |
// 'king' | 'burned'.

const TOWER = 'vhTower';
const URSULA = { x: -3369.5, y: 61, z: 2830.5 };
const got = (g: GameApi) => (g.flag('vhTowerCarn') ? 1 : 0) + (g.flag('vhTowerKestle') ? 1 : 0);

const ursula: DialogueTree = {
  start: (g) => (at(g, TOWER) === 'rule' ? 'r1' : g.flag('vhMetUrsula') ? 'hello' : 'u0'),
  nodes: {
    u0: { speaker: 'narrator', text: 'A small, weathered woman in a man\'s greatcoat with a brass glass under her arm and pencil on her fingers to the second knuckle. She is looking south, out to sea, the way people look at a door they expect to open.', next: 'u1' },
    u1: { text: 'Ursula Toms. I built the tower. Well, I paid two men from Gorran to build it and stood underneath shouting. You\'ve come at a good time. It\'s due in a while.', effect: (g) => g.setFlag('vhMetUrsula', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, TOWER) === 'ask' ? `Sampson Keast at Carn Hold, and the Nankivell girl on Kestle hill. ${got(g)} of two.` : 'Clear to the south. Good.'),
      options: [
        { text: 'What\'s due?', cond: (g) => !at(g, TOWER), next: 'q1' },
        { text: 'Why a tower?', next: 'why' },
        { text: 'What became of the book?', cond: (g) => at(g, TOWER) === 'done', next: 'after' },
        { text: 'Good day, Mrs Toms.' },
      ],
    },
    why: { text: 'Thirty years I made the Collegium\'s almanacs. Sun, moon, tides, the wandering stars. The southern sky\'s the one nobody has charted, because nobody lives far enough south to see it. Then I came here, and something came up out of it.', next: 'hello' },
    q1: { text: 'You\'ve seen it. Everybody has. Out of the south over the sea, far up, slow as a mill, and on north. I\'ve had it in the glass forty-one times. It comes in on the same bearing every time, to a hair. Nothing alive flies that straight.', next: 'q2' },
    q2: { text: 'I have where it comes from, near enough. I want where it goes. For that I need the bearing it leaves the island on, from the north, from somebody who watches the sky as a trade and writes down what they see.', next: 'q3' },
    q3: {
      text: 'Sampson Keast keeps the beacon at Carn Hold, and the Nankivell girl keeps the one on Kestle hill. They\'ll both have seen it go over. Ask them the time and the heading, as near as they can.',
      options: [{ text: 'I\'ll ask them.', effect: (g) => g.setStage(TOWER, 'ask') }, { text: 'Not now.' }],
    },
    r1: { speaker: 'narrator', text: 'Ursula spreads the island chart on the boards and lays a ruler from her tower through Sampson\'s bearing and Kensa\'s. The line runs on off the top of the chart. She pins on the Counties sheet, and the line runs up the middle of it and off the top of that too, into the Scarth Highlands.', next: 'r2' },
    r2: { text: 'Out of the south, from past anything on the charts, and on to the Highlands, the same way every time. That\'s not a beast hunting. That\'s a beast going somewhere it knows. And coming back.', next: 'r3' },
    r3: {
      text: 'I don\'t know what to do with this. The Collegium would want it. The king would want it more. And there are people in the Highlands living under that line who don\'t know they\'re under it.',
      options: [
        { text: 'Send it to the Collegium. Let people who can read it read it.', moral: { id: 'vhTower:collegium', tr: { honesty: 2 }, rep: { verandah: 1 }, npc: { vh_ursula: 15 } }, effect: (g) => { g.setFlag(TOWER, 'collegium'); g.addMarks(60); g.setStage(TOWER, 'done'); }, next: 'rC' },
        { text: 'Take it to the king. It\'s his island it flies over.', moral: { id: 'vhTower:king', tr: { loyalty: 2 }, rep: { verandah: 3 }, npc: { vh_ursula: 5 } }, effect: (g) => { g.setFlag(TOWER, 'king'); g.addMarks(60); g.setStage(TOWER, 'done'); }, next: 'rK' },
        { text: 'Burn the page with the line on it. Nobody can do anything with it but be afraid.', moral: { id: 'vhTower:burned', tr: { compassion: 1, deception: 2 }, npc: { vh_ursula: -10 } }, effect: (g) => { g.setFlag(TOWER, 'burned'); g.addMarks(60); g.setStage(TOWER, 'done'); }, next: 'rB' },
      ],
    },
    rC: { text: 'The Collegium. Yes. They\'ll argue about it for a year and then somebody young will go and look. That\'s how it should be. Here. For the walking. Sampson\'s stairs are worth paying for on their own.' },
    rK: { text: 'The king. He\'ll put it in a drawer with a seal on it and set a guard on the drawer. But he\'ll know, and he\'s the one who\'d have to do something. Here. For the walking.' },
    rB: { speaker: 'narrator', text: 'She looks at you for a long moment, then takes the page out of the book and holds it to her lamp. "I had it in my head before it was on the paper," she says, watching it go. "You know that. I\'ll not write it again. Here. For the walking."' },
    after: {
      text: (g) => (g.flag(TOWER) === 'collegium'
        ? 'The Collegium wrote back. Three letters, three different hands, all saying the others are wrong. One of them wants to come and stand on my tower. I said yes.'
        : g.flag(TOWER) === 'king'
          ? 'The king sent a man to thank me and another to ask me not to talk about it. The second one stayed for supper.'
          : 'Forty-four times now. Same line. I don\'t write it down. I don\'t need to.'),
      next: 'hello',
    },
  },
};

const sampsonNodes: Record<string, DNode> = {
  vhT1: { text: 'The great dark thing? Every few hours. It goes over the peak so high the crows don\'t notice it, and on north-north-east, over the sea toward the Counties. I time it on the beacon glass. Twenty-one minutes past the hour, the last three times.', effect: (g: GameApi) => g.setFlag('vhTowerCarn', 1), next: 'hello' },
};
const kensaNodes: Record<string, DNode> = {
  vhT1: { text: 'It goes straight over the Folds, over Thirza\'s house and this hill, and out to sea north-east, and the sheep lie down flat as it passes. I\'ve drawn it. Here, she can have the drawing, I can do another.', effect: (g: GameApi) => g.setFlag('vhTowerKestle', 1), next: 'hello' },
};

const quests: Record<string, QuestDef> = {
  [TOWER]: {
    id: TOWER, name: 'The Tower Book', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'ask') return 'Ursula Toms, in her tower on the south cliffs, has the bearing the great dark thing comes in on. She needs the bearing it leaves on: Sampson Keast at Carn Hold and Kensa Nankivell on Kestle hill both watch the sky.';
      if (s === 'rule') return 'I have both bearings. Back to Ursula Toms in her tower.';
      const f = g.flag(TOWER);
      return f === 'collegium' ? 'Ursula sent her book to the Collegium.' : f === 'king' ? 'Ursula took her book to the king.' : 'Ursula burned the page with the line on it.';
    },
    objectives: (g, s) => (s === 'ask' ? [
      { text: 'Ask Sampson Keast at Carn Hold', done: !!g.flag('vhTowerCarn'), marker: 'vh_sampson' },
      { text: 'Ask Kensa Nankivell on Kestle hill', done: !!g.flag('vhTowerKestle'), marker: 'k_kensa' },
    ] : s === 'rule' ? [{ text: 'Back to Ursula Toms', marker: 'vh_ursula' }] : []),
    advance: (g, s) => (s === 'ask' && got(g) >= 2 ? 'rule' : null),
    marks: (g, s): Marks => (!s ? { vh_ursula: '!' } : s === 'ask' ? { ...(g.flag('vhTowerCarn') ? {} : { vh_sampson: '?' }), ...(g.flag('vhTowerKestle') ? {} : { k_kensa: '?' }) } : s === 'rule' ? { vh_ursula: '?' } : {}),
    walk: { cast: ['vh_ursula', 'vh_sampson', 'k_kensa'] },
  },
};

const NPCS: NpcDef[] = [
  { id: 'vh_ursula', name: 'Ursula Toms', title: 'Almanac-maker', look: { frame: 'f', lashes: true, skin: '#d8a888', hair: '#c8c0b4', hairStyle: 5, facial: 0, eyes: '#4a5a6a', tunic: '#3a4048', trim: '#b08d57', shirt: '#d8d0c0', trousers: '#2a2a2e', boots: '#1a1612', build: 0.85, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [URSULA.x, URSULA.z], face: [URSULA.x, URSULA.z + 4], anim: 'idle', y: URSULA.y }],
    barks: ['Clear to the south.', 'Forty-one times. Same line.'] },
];

export const SKY_TOWER: RegionContent = {
  id: 'skyTower',
  npcs: NPCS,
  dialogue: { vh_ursula: ursula },
  quests,
  hooks: (D) => {
    Object.assign(D.vh_sampson.nodes, sampsonNodes);
    addOption(D, 'vh_sampson', 'hello', { text: 'Ursula Toms wants to know where the great dark thing goes.', cond: (g) => at(g, TOWER) === 'ask' && !g.flag('vhTowerCarn'), next: 'vhT1' });
    Object.assign(D.k_kensa.nodes, kensaNodes);
    addOption(D, 'k_kensa', 'hello', { text: 'Ursula Toms wants to know which way the great dark thing goes.', cond: (g) => at(g, TOWER) === 'ask' && !g.flag('vhTowerKestle'), next: 'vhT1' });
  },
};
