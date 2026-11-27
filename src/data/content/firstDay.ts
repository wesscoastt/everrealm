import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn } from '../places_regional';

// FIRST DAY IN HOLLIN FORD (owner 2026-11-26: "add an intro quest for new players to introduce everything like wow eso
// etc"). WoW's and ESO's first hour hand you the game a piece at a time, each piece with a reason to use it; this does
// the same in Hollin Ford, where every new character arrives. Davy Ashby, the reeve's lad, is sent to meet newcomers
// off the road and show them round before his mother puts them to work.
//
// A new character starts with it on the tracker; anyone else can ask Davy for it. Each step is one thing to try, and
// the game marks the first time you do each (Game.first: flags 'ft:...'), so it moves on as soon as you've done it, in
// whatever order you like inside a step:
//   look    the map (M) and the journal (J), where the quest you're on is written down
//   kit     the bag (B), and Davy's father's old jerkin to put on
//   fight   a skill from the hotbar (1 to 8), and three mire jellies in the Wetlings
//   gather  anything the land gives: a fish, a log, ore, or what grows
//   make    anything at a fire or a bench: cooking, smithing, whatever you've got
//   buy     something from Tamsin Pargeter's stall
//   grow    your skills (K) and talents (T), where levels go
//   people  hello in the chat (Enter), and the Group Finder (P)
//   davy    back to Davy, who sends you to his mother: Maud Ashby and the Ford Bell, the story's first chapter.

const Q = 'firstDay';
const DAVY = { x: 153.5, z: 184.5 };
const JELLIES: [number, number][] = [[200, 242], [207, 248], [198, 251]];
/** Where the jellies come up, on the map and the pin (owner 2026-11-27: "cant find the mire jellies for intro"). */
const JELLY_MARK = `at:${Math.round(JELLIES.reduce((t, j) => t + j[0], 0) / JELLIES.length)},${Math.round(JELLIES.reduce((t, j) => t + j[1], 0) / JELLIES.length)}`;

const ft = (g: GameApi, k: string) => !!g.flag('ft:' + k);
const n = (g: GameApi, k: string) => Number(g.flag('n:' + k) ?? 0);
const gathered = (g: GameApi) => ['fishing', 'woodcutting', 'mining', 'farming'].some((s) => ft(g, 'xp:' + s)) || n(g, 'forage') > 0 || n(g, 'fish') > 0;
const made = (g: GameApi) => ['cooking', 'smithing', 'enchanting'].some((s) => ft(g, 'xp:' + s)) || n(g, 'crafted') > 0;

/** Each step's objectives: the text, and whether it's done. */
const STEPS: Record<string, (g: GameApi) => { text: string; done: boolean; marker?: string }[]> = {
  meet: () => [{ text: 'Talk to Davy Ashby, by the road into Hollin Ford', done: false, marker: 'fd_davy' }],
  look: (g) => [
    { text: 'Open your map (M): the gold marker is where you\'re going', done: ft(g, 'panel:map') },
    { text: 'Open your journal (J): every quest you\'re on, written down', done: ft(g, 'panel:journal') },
  ],
  kit: (g) => [
    { text: 'Open your bag (B)', done: ft(g, 'panel:inv') },
    { text: 'Put on the jerkin Davy gave you (click it in your bag)', done: ft(g, 'equip') },
  ],
  fight: (g) => [
    { text: 'Use a skill from your hotbar (keys 1 to 8)', done: ft(g, 'skill') },
    { text: `Burst the mire jellies in the Wetlings, east of the ford (${Math.min(JELLIES.length, killed(g, 'fdJelly'))}/${JELLIES.length})`, done: killed(g, 'fdJelly') >= JELLIES.length, marker: JELLY_MARK },
  ],
  gather: (g) => [{ text: 'Gather something: fish the Wend, cut a tree, mine ore, or pick what grows (E)', done: gathered(g) }],
  make: (g) => [{ text: 'Make something: cook the minnows at a fire, or work a bench or the forge', done: made(g) }],
  buy: (g) => [{ text: 'Buy something from Tamsin Pargeter\'s stall', done: ft(g, 'buy'), marker: 'tamsin' }],
  grow: (g) => [
    { text: 'Open your skills (K): every craft and weapon, and its level', done: ft(g, 'panel:skills') },
    { text: 'Open your talents (T): your calling\'s skills, and points to spend', done: ft(g, 'panel:talents') },
  ],
  people: (g) => [
    { text: 'Say hello in the chat (press Enter, type, Enter)', done: ft(g, 'chat') },
    { text: 'Open the Group Finder (P): everything is better with others', done: ft(g, 'panel:finder') },
  ],
  davy: () => [{ text: 'Go back to Davy Ashby', done: false, marker: 'fd_davy' }],
};
const ORDER = ['look', 'kit', 'fight', 'gather', 'make', 'buy', 'grow', 'people', 'davy'];

const NOTES: Record<string, string> = {
  meet: 'A lad by the road into Hollin Ford is waving at me.',
  look: 'Davy Ashby, the reeve\'s son, is showing me round. First: the map and the journal. The map shows where I am and where my quests point; the journal keeps every quest, and what I\'ve learned about it.',
  kit: 'Davy gave me his father\'s old jerkin. My bag holds everything I carry; clicking a piece of gear puts it on.',
  fight: 'Mire jellies come up out of the Wetlings when the Wend is high. My calling\'s skills sit on the hotbar, keys 1 to 8; the first ones are open from the start, and more as I level.',
  gather: 'Everything in the realm is made from something. Fish, timber, ore, herbs and berries are all there for the taking; walk up and press E.',
  make: 'Davy gave me two minnows. A fire cooks them; a bench, a forge or a loom makes other things. Making things raises the skill that made them.',
  buy: 'Tamsin Pargeter trades on the green. Traders sell, and buy what I don\'t want.',
  grow: 'Every skill has its own level, and so do I. Skills (K) shows them; talents (T) are where my calling grows, and where I spend the points I earn.',
  people: 'Nobody does everything alone. The chat reaches everyone; the Group Finder (P) finds people doing what I\'m doing.',
  davy: 'Davy said to come back when I\'d seen it all.',
};

/** What Davy says if you come back to him mid-way: the step you're on, in his words. */
const WAIT: Record<string, string> = {
  look: 'Press M for the map. You\'re the arrow. Then J for your journal, where it all gets written down. Mam can\'t read, so she has me.',
  kit: 'That was my dad\'s jerkin. Open your bag, B, and click it to put it on. It smells of sheep. Everything here does.',
  fight: 'The jellies are in the Wetlings, east of the ford, where it\'s boggy. Your skills are on the numbers, one to eight. Hit them with those.',
  gather: 'Anything that grows or swims or sits in the ground, walk up to it and press E. Fish, wood, stone, berries. Mam says nobody\'s too good to pick berries.',
  make: 'Cook those minnows at a fire. Any fire. Then you\'ll know how cooking works, and you\'ll have eaten.',
  buy: 'Tamsin\'s on the green with her stall. Buy anything. I gave you ten marks. That\'s Mam\'s ten marks, really.',
  grow: 'K for your skills and T for your talents. That\'s where you get better at things. I\'m getting better at waiting.',
  people: 'Say hello! Press Enter and type. Everyone can hear. And P finds you people to go about with. Mam says nobody goes up the Pit alone.',
};

const davy: DialogueTree = {
  start: (g) => {
    const s = at(g, Q);
    if (!s || s === 'meet' || (s === 'done' && g.flag('firstDaySkipped'))) return 'd1';
    if (s === 'davy') return 'e1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    d1: { speaker: 'narrator', text: 'A lad of twelve or so with mud to the knees and a hazel switch, who has clearly been told to wait by the road for newcomers and has clearly been waiting a long time.', next: 'd2' },
    d2: { text: 'You\'re new. Everyone\'s new once. I\'m Davy Ashby. My mam\'s the reeve, and she says I\'m to show newcomers round before she gives them anything to do, because otherwise they get lost and fall in the Wend.', next: 'd3' },
    d3: {
      text: 'It won\'t take long. I\'ll show you where everything is, and how everything works, and then you go and see Mam. Ready?',
      options: [
        { text: 'Show me round, Davy.', effect: (g) => { g.setFlag('firstDaySkipped', 0); g.setStage(Q, 'look'); g.toast('First, the lie of the land. Press M for your map, and J for your journal.'); } },
        { text: 'I know my way. Point me at your mother.', next: 'd4' },
      ],
    },
    d4: { text: 'Mam\'s on the green, by the bridge. Don\'t fall in the Wend.', effect: (g) => { g.setFlag('firstDaySkipped', 1); g.setStage(Q, 'done'); } },
    wait: { text: (g) => WAIT[at(g, Q) ?? 'look'] ?? 'Keep going. You\'re doing better than the last one. He fell in the Wend.' },
    e1: { text: 'You\'ve done all of it? The map and the jellies and Tamsin and everything? You\'ve done more in a morning than the last one did in a week.', next: 'e2' },
    e2: { text: 'Here. Mam gives everyone a few marks to start, so they don\'t go poaching. And some bread, because you\'ll forget to eat. Everyone does.', next: 'e3' },
    e3: {
      text: 'Now go and see Mam, by the bridge. The Ford Bell\'s cracked, and she\'s been waiting on someone to sort it since April. That\'s where your story starts. Mine starts when I\'m thirteen.',
      options: [{ text: 'Thank you, Davy.', effect: (g) => { g.addMarks(25); g.give('bread', 4); g.setStage(Q, 'done'); g.toast('If you\'re ever stuck, the Help button on the menu answers most things, and What\'s New says what has changed.'); } }],
    },
    after: { text: (g) => (at(g, 'fordBell') === 'done' ? 'You fixed the bell! I heard it from the meadow. Mam says you\'ll do.' : 'Mam\'s by the bridge. The bell won\'t fix itself. I asked it.') },
  },
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'First Day in Hollin Ford', region: 'greenwake', depth: 'quest',
    notes: (g, s) => (s === 'done' ? (g.flag('firstDaySkipped') ? 'I told Davy Ashby I knew my way. His mother, Maud Ashby the reeve, is on the green by the bridge.' : 'Davy Ashby showed me round Hollin Ford, and sent me to his mother, Maud Ashby the reeve, about the Ford Bell.') : NOTES[s] ?? ''),
    objectives: (g, s) => (STEPS[s] ? STEPS[s](g) : []),
    advance: (g, s) => {
      const i = ORDER.indexOf(s);
      if (i < 0 || s === 'davy') return null;
      if (!STEPS[s](g).every((o) => o.done)) return null;
      const next = ORDER[i + 1];
      // what each step hands over as it opens
      if (next === 'kit') g.give('fd_jerkin', 1);
      if (next === 'make') g.give('raw_minnow', 2);
      if (next === 'buy') g.addMarks(10);
      return next;
    },
    marks: (_g, s): Marks => (!s || s === 'meet' || s === 'davy' ? { fd_davy: s === 'davy' ? '?' : '!' } : {}),
    walk: { cast: ['fd_davy'], kill: { fight: [['jelly', 3]] }, auto: { look: 'kit', kit: 'fight', fight: 'gather', gather: 'make', make: 'buy', buy: 'grow', grow: 'people', people: 'davy' } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'fdJelly', type: 'jelly', at: JELLIES, when: (g) => at(g, Q) === 'fight' },
];

const NPCS: NpcDef[] = [
  { id: 'fd_davy', name: 'Davy Ashby', title: 'The reeve\'s lad', look: { skin: '#e8c4a0', hair: '#8a5a2a', hairStyle: 5, eyes: '#4a5a3a', tunic: '#6a7a4a', trim: '#4a3a2a', trousers: '#4a3e30', boots: '#3a2a1a', freckles: true, build: 0.7, height: 0.85, age: 0.05 },
    schedule: [{ from: 6, to: 21, at: [DAVY.x, DAVY.z], face: [DAVY.x - 3, DAVY.z + 2], anim: 'idle' }], barks: ['You\'re new!', 'Mind the Wend.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'fd_jerkin', name: 'Old Ashby\'s jerkin', kind: 'armor', rarity: 'common', stack: false, value: 4, icon: { shape: 'chest', a: '#7a5a3a', b: '#4a3a2a' },
    desc: 'Davy\'s father wore it to the fields for twenty years. It\'s been mended so often there\'s more mend than jerkin, and it\'s still the warmest thing in Hollin Ford.',
    armor: { slot: 'chest', defense: 1, weight: 'light', look: { top: 6, tunic: '#7a5a3a', trim: '#4a3a2a' } } },
];

export const FIRST_DAY: RegionContent = {
  id: 'firstDay',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { fd_davy: davy },
  quests,
  spawns,
};
