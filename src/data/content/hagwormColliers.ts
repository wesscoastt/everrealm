import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two side stories at Bevin's Clamp, east of the Colliers' Clearing in Hagworm Wood (levels 10 to 16; owner
// 2026-11-13, content order: fill the Counties first). The clamp is built in world/sites.ts (buildCollierClamp).
//
// hwClamp, THE COLLIER'S NIGHT OFF (Jethro Bevin, collier): his daughter Rose marries a hedger at Ketley chapel
// tomorrow, and a clamp three days lit can't be left, or the air gets in and four cords of oak burn to ash. Watch
// it one night for him: cut turves at the bank, smother the three places where flame breaks through, keep the
// thornbacks off (they come for the warmth), and sleep in his hut. He comes back in the morning with a slice of
// the wedding cake. 'turf' -> 'watch' -> 'sleep' -> 'jethro' -> done.
//
// hwWat, BOUND (Wat Ellery, Jethro's apprentice, once the night is over): bound to Jethro by the parish for seven
// years, four gone, and he wants the sea. A Gullmouth master takes boys. Choice hwWat = 'run' (he goes that night;
// Jethro pays the parish for losing him and says he'd have let him go if he'd asked) | 'ask' (Jethro signs his
// indenture over to the Gullmouth master, and Wat is on the quay as a ship's boy). 'jethro' -> 'wat' -> done.

const CLAMP = 'hwClamp', WAT = 'hwWat';
const C = { x: 360, z: 800 };
const JETHRO = { x: C.x - 5.5, z: C.z + 2.5 };
const WAT_AT = { x: C.x + 5.5, z: C.z + 6.5 };
/** Where the flame breaks through, round the mound's flanks. */
const VENTS: [number, number][] = [[C.x - 3.5, C.z - 2.5], [C.x + 3.5, C.z + 2.5], [C.x + 4.5, C.z - 1.5]];
const THORNS: [number, number][] = [[C.x + 12, C.z - 6], [C.x - 11, C.z + 9]];
/** Wat on Gullmouth quay, after. */
const QUAY = { x: 1797.5, z: 598.5 };

const away = (g: GameApi) => ['turf', 'watch', 'sleep'].includes(at(g, CLAMP) ?? '');
const patched = (g: GameApi) => VENTS.filter((_, i) => g.flag('hwVent' + i)).length;

// ================================================================ The people's words

const jethro: DialogueTree = {
  start: (g) => {
    const c = at(g, CLAMP), w = at(g, WAT);
    if (!c) return 'j1';
    if (c === 'jethro') return 'jb1';
    if (w === 'jethro') return 'ji1';
    if (w === 'wat') return 'jiWait';
    if (w === 'done') return g.flag('hwWat') === 'run' ? 'afterRun' : 'afterAsk';
    return 'after';
  },
  nodes: {
    j1: { speaker: 'narrator', text: 'A man black to the elbows, sitting on an upturned bucket beside a long mound of turf that smokes from a dozen places. His eyes are red-rimmed. By the look of him, he hasn\'t slept since Tuesday.', next: 'j2' },
    j2: { text: 'Jethro Bevin, collier. That\'s a clamp. Four cords of oak under the turf, three days lit and two to go.', next: 'j3' },
    j3: { text: 'A clamp can\'t be left. If a hole burns through and nobody stops it, the air gets in, and four cords of charcoal turn into four cords of ash.', next: 'j4' },
    j4: { text: 'My Rose is getting married tomorrow at Ketley chapel. To a hedger. Nice lad, hands like shovels. I told her I couldn\'t come, and she said, "Course you can\'t, Dad," the way she says it.', next: 'j5' },
    j5: {
      text: 'Wat can\'t watch it on his own. He\'s fourteen and sleeps like a dropped sack. It\'s one night. Cut turves, watch for flame, keep the thornbacks off. I\'d be back by morning.',
      options: [{ text: 'Go to the wedding. I\'ll watch your clamp.', effect: (g) => g.setStage(CLAMP, 'turf'), next: 'j6' }, { text: 'Not tonight.' }],
    },
    j6: { text: 'Turf bank\'s past the cordwood. Cut a stack before dark. When you see flame, not smoke but flame, you put turf on it and tread it down. Wat knows how. Wat knows everything and does none of it.' },
    jb1: { text: 'You\'re alive, and so is she. Look at that. Not a mark on her.', next: 'jb2' },
    jb2: { text: 'Rose cried. I cried. The hedger\'s mother cried, and she doesn\'t like anybody. They kept a slice of cake back for you, wrapped in a bit of her veil, which is lucky, and which I\'m not to tell anyone about.', next: 'jb3' },
    jb3: {
      text: 'I owe you a night\'s sleep, and I can\'t give you that, so have this, and my thanks.',
      options: [{ text: 'Give Rose my best.', effect: (g) => { g.give('hw_cake', 1); g.addMarks(60); g.setStage(CLAMP, 'done'); } }],
    },
    ji1: { text: 'He wants to go to sea? Wat? He\'s never asked me for anything. Not a blanket, not a day off. Four winters, and he never asked me for a blanket.', next: 'ji2' },
    ji2: { text: 'I\'m not his father. I\'m the man the parish gave him to because I had a spare bed and a strong back. I used to think that was enough. Seems it wasn\'t.', next: 'ji3' },
    ji3: { text: 'Here. I\'ve signed his indenture over to whatever master in Gullmouth will have him. The parish takes a signed paper over a runaway any day. Give it to him. Tell him to write, if they teach him.', options: [{ text: 'I\'ll give it to him.', effect: (g) => { g.give('hw_indenture', 1); g.setStage(WAT, 'wat'); } }] },
    jiWait: { text: 'Give the boy his paper. I\'m not doing it. I\'d say something stupid.' },
    after: { text: (g) => (at(g, CLAMP) === 'done' ? 'She\'s cooling now. Two days, then we open her up and see what we\'ve got. Rose says she\'s keeping the veil for the next one. I said, next what? She just looked at me.' : 'Clamp\'s lit.') },
    afterRun: { text: 'Wat\'s gone. Took his knife and my second-best boots. The parish wants nine marks for losing him. I\'d have let him go if he\'d asked. Why didn\'t he ask?' },
    afterAsk: { text: 'Had a letter from Gullmouth. Somebody else wrote it out for him, but he signed it himself. He spelled his own name wrong. I\'m keeping it.' },
  },
};

const wat: DialogueTree = {
  start: (g) => {
    if (at(g, CLAMP) !== 'done') return 'early';
    const w = at(g, WAT);
    if (!w) return 'w1';
    if (w === 'wat') return 'wb1';
    return 'wWait';
  },
  nodes: {
    early: { text: (g) => (at(g, CLAMP) === 'watch' ? 'Flame on the north side. No, the other north. I\'m helping. This is what helping looks like.' : 'Jethro says I\'m to help. I am helping.') },
    w1: { speaker: 'narrator', text: 'A thin boy with a sooty face, sitting on the cordwood with a knife and a stick he isn\'t whittling.', next: 'w2' },
    w2: { text: 'Have you been to Gullmouth? Is it true you can see the sea from every street? And the ships go to Callis and back, and further?', next: 'w3' },
    w3: { text: 'I\'m bound to Jethro seven years. The parish did it when my mam died. Four gone. Three to go. Smoke in my eyes every day of it, and the dark, and the trees.', next: 'w4' },
    w4: { text: 'There\'s a ship\'s master in Gullmouth who takes boys. I could be on the road tonight, and Jethro wouldn\'t know till morning. Only then he\'d owe the parish for losing me, and I\'d be a runaway.', next: 'w5' },
    w5: {
      text: 'What would you do?',
      options: [
        { text: 'Ask Jethro. He\'s not the man you think he is.', effect: (g) => g.setStage(WAT, 'jethro'), next: 'wA' },
        { text: 'Go tonight. I won\'t say where.', effect: (g) => { g.addMarks(40); g.setFlag('hwWat', 'run'); g.setStage(WAT, 'done'); }, next: 'wR' },
      ],
    },
    wA: { text: 'I can\'t ask him. You ask him. He likes you. He doesn\'t like anybody.' },
    wR: { text: 'Tonight, then. When he\'s asleep. If anybody asks, you never saw me, and I never took his boots.' },
    wWait: { text: 'Did you ask him? What did he say? No, don\'t tell me. Yes, tell me.' },
    wb1: { speaker: 'narrator', text: 'Wat reads the paper twice, with his finger under each line, and then once more without it.', next: 'wb2' },
    wb2: { text: 'He signed it. He signed it, and he wrote "a good lad, willing" at the bottom. Jethro wrote that. Jethro can hardly write.', next: 'wb3' },
    wb3: {
      text: 'I\'ll go in the morning, properly, by the road, with a bag. I\'ll shake his hand. He\'ll hate that. I\'m going to do it anyway.',
      options: [{ text: 'Fair winds, Wat.', effect: (g) => { g.take('hw_indenture', 1); g.addMarks(70); g.setFlag('hwWat', 'ask'); g.setStage(WAT, 'done'); } }],
    },
  },
};

const watSea: DialogueTree = {
  start: () => 'sea',
  nodes: {
    sea: { text: 'You can see the sea from every street. It\'s true! Except Tanner\'s Row, where you can only smell it. I\'m on the Margery Dell, Callis and back. Tell Jethro I can tie six knots. Tell him five. He won\'t believe six.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [CLAMP]: {
    id: CLAMP, name: 'The Collier\'s Night Off', region: 'brambledeep', depth: 'quest',
    notes: (g, s) => {
      if (s === 'turf') return 'Jethro Bevin, a collier in Hagworm Wood, can\'t leave his charcoal clamp, and his daughter Rose is married tomorrow at Ketley chapel. I\'m watching it for him tonight. First, a stack of turves from the bank past the cordwood.';
      if (s === 'watch') return 'Where flame breaks through the clamp, smother it with turf and tread it down. The thornbacks come for the warmth.';
      if (s === 'sleep') return 'The clamp has settled for the night. Jethro\'s hut is by the mound.';
      if (s === 'jethro') return 'Morning, and the clamp is whole. Jethro should be back from the wedding.';
      return 'I watched Jethro Bevin\'s clamp the night his daughter Rose was married. He brought me back a slice of the cake, wrapped in a bit of her veil.';
    },
    objectives: (g, s) => (s === 'turf' ? [{ text: 'Cut turves at the bank past the cordwood', marker: 'hwTurf' }]
      : s === 'watch' ? [
        ...VENTS.map((_, i) => ({ text: `Smother the ${['first', 'second', 'third'][i]} flame breaking through the clamp`, done: !!g.flag('hwVent' + i), marker: 'hwVent' + i })),
        { text: `Keep the thornbacks off (${Math.min(2, killed(g, 'hwThorns'))}/2)`, done: killed(g, 'hwThorns') >= 2 },
      ]
      : s === 'sleep' ? [{ text: 'Sleep in Jethro\'s hut', marker: 'hwHut' }]
      : s === 'jethro' ? [{ text: 'Talk to Jethro Bevin', marker: 'hw_jethro' }] : []),
    advance: (g, s) => (s === 'watch' && patched(g) >= VENTS.length && killed(g, 'hwThorns') >= 2 ? 'sleep' : null),
    marks: (_g, s): Marks => (!s ? { hw_jethro: '!' } : s === 'jethro' ? { hw_jethro: '?' } : {}),
    walk: { cast: ['hw_jethro'], kill: { watch: [['thornwolf', 2]] } },
  },
  [WAT]: {
    id: WAT, name: 'Bound', region: 'brambledeep', depth: 'quest',
    notes: (g, s) => {
      if (s === 'jethro') return 'Wat Ellery, Jethro Bevin\'s apprentice, is bound to him by the parish for three more years and wants to go to sea from Gullmouth. He can\'t ask Jethro himself. I said I would.';
      if (s === 'wat') return 'Jethro has signed Wat\'s indenture over to a Gullmouth master. Wat should have it from me.';
      return g.flag('hwWat') === 'run' ? 'Wat ran for Gullmouth in the night, with Jethro\'s second-best boots. Jethro owes the parish for losing him, and says he\'d have let him go if he\'d asked.' : 'Wat went to sea with Jethro\'s blessing on paper. He\'s a ship\'s boy on Gullmouth quay now.';
    },
    objectives: (_g, s) => (s === 'jethro' ? [{ text: 'Ask Jethro Bevin to let Wat go', marker: 'hw_jethro' }] : s === 'wat' ? [{ text: 'Give Wat his indenture', marker: 'hw_wat' }] : []),
    marks: (g, s): Marks => (!s && at(g, CLAMP) === 'done' ? { hw_wat: '!' } : s === 'jethro' ? { hw_jethro: '?' } : s === 'wat' ? { hw_wat: '?' } : {}),
    walk: { cast: ['hw_wat', 'hw_jethro'], from: { quests: { [CLAMP]: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hwThorns', type: 'thornwolf', at: THORNS, when: (g) => at(g, CLAMP) === 'watch' },
];

const VENT_TOASTS = [
  'A tongue of yellow flame where there should only be smoke. You slap two turves on it and tread them down, and the flame goes back to smoke, sulking.',
  'The turf has slipped on the far flank and the oak is glowing through. Three turves, and a lot of stamping, and it\'s dark again.',
  'A small one, but Wat says the small ones are how it starts. He watches you tread it down and says you did it wrong, then can\'t say how.',
];

const things: WorldThing[] = [
  {
    id: 'hwTurf', x: C.x + 8.5, z: C.z - 4.5, label: 'Cut turves', radius: 2.6, look: 'none',
    when: (g) => at(g, CLAMP) === 'turf',
    use: (g) => { g.give('hw_turves', 1); g.setStage(CLAMP, 'watch'); g.toast('The turf comes up in squares, grass on top, black root underneath. You stack a dozen by the clamp as the light goes. Somewhere in the wood a thornback calls, and another answers.'); },
  },
  ...VENTS.map(([x, z], i): WorldThing => ({
    id: 'hwVent' + i, x, z, label: 'Smother the flame with turf', radius: 2.4, look: 'scorch',
    when: (g) => at(g, CLAMP) === 'watch' && !g.flag('hwVent' + i),
    use: (g) => { g.setFlag('hwVent' + i, 1); g.toast(VENT_TOASTS[i]); },
  })),
  {
    id: 'hwHut', x: C.x - 7.5, z: C.z + 4, label: 'Sleep in Jethro\'s hut', radius: 2.6, look: 'none',
    when: (g) => at(g, CLAMP) === 'sleep',
    use: (g) => { g.take('hw_turves', 1); g.setStage(CLAMP, 'jethro'); g.toast('The hut smells of smoke and old blankets. You mean to get up and check the clamp at midnight. You wake to birdsong, and the clamp still smoking quietly, and somebody whistling up the track.'); },
  },
];

type Look = NonNullable<NpcDef['look']>;
const WAT_LOOK: Look = { skin: '#e0b48e', hair: '#3a2a1e', hairStyle: 3, eyes: '#4a5a6a', tunic: '#4a4036', trim: '#6a5a44', trousers: '#2e2a26', boots: '#2a1e14', freckles: true, build: 0.8, age: 0.12 };

const NPCS: NpcDef[] = [
  { id: 'hw_jethro', name: 'Jethro Bevin', title: 'Collier, Hagworm Wood', look: { skin: '#c8956a', hair: '#4a4038', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#2a2622', trim: '#4a4036', trousers: '#22201c', boots: '#1a1612', hat: 'cap', hatColor: '#22201c', build: 1.1, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [JETHRO.x, JETHRO.z], face: [C.x, C.z], anim: 'idle' }], when: (g) => !away(g),
    barks: ['Smoke\'s good. Flame\'s bad.', 'Two more days.'] },
  { id: 'hw_wat', name: 'Wat Ellery', title: 'Collier\'s apprentice', look: WAT_LOOK,
    schedule: [{ from: 0, to: 24, at: [WAT_AT.x, WAT_AT.z], face: [C.x, C.z], anim: 'idle' }], when: (g) => at(g, WAT) !== 'done',
    barks: ['Is that the sea? No. It\'s more trees.'] },
  { id: 'hw_wat_sea', name: 'Wat Ellery', title: 'Ship\'s boy, the Margery Dell', look: { ...WAT_LOOK, tunic: '#3a4a6a', trim: '#d8d0c0', hat: 'cap', hatColor: '#2a3448' },
    schedule: [{ from: 6, to: 20, at: [QUAY.x, QUAY.z], face: [QUAY.x + 4, QUAY.z], anim: 'idle' }], when: (g) => g.flag('hwWat') === 'ask',
    barks: ['Six knots! Well. Five.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'hw_turves', name: 'A stack of turves', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'block', a: '#4a7a2a', b: '#3a2a1a' }, desc: 'Grass on top, black root underneath. For putting out a clamp that wants to be a bonfire.' },
  { id: 'hw_indenture', name: 'Wat\'s indenture', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#d8ccb0', b: '#3a2a20' }, desc: 'Seven years\' service, four of them crossed through, signed over to "any honest master of a Gullmouth ship". At the bottom, in a big, careful hand: "a good lad, willing. J. Bevin, his mark and his name."' },
  { id: 'hw_cake', name: 'A slice of wedding cake', kind: 'food', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'pie', a: '#e8d8b0', b: '#f4f0e8' }, buff: { slot: 'food', hp: 0.1, regen: 0.3, mins: 60 }, desc: 'Rose Bevin\'s wedding cake, wrapped in a scrap of her veil. Heavy with fruit and very slightly smoky.', stats: 'A meal: health and regeneration for an hour.' },
];

export const HAGWORM_COLLIERS: RegionContent = {
  id: 'hagwormColliers',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { hw_jethro: jethro, hw_wat: wat, hw_wat_sea: watSea },
  quests,
  spawns,
  things,
};
