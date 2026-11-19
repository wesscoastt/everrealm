import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories at Cragsby, on the Gannet Cliffs (owner 2026-11-13, content order: fill the Counties first),
// with the morality system's choices (docs/MORALITY.md).
//
// cgEggMoney, THE EGG MONEY (Morwen Tregear, the Coiled Rope): the egg store's chest, a year of the village's egg money,
// went in the night, and the tracks go north-east to Gaunt's Eyrie. Loveday Tonkin's boy Petroc hasn't been home.
// Past the robbers on the Eyrie's approach, the chest, and Petroc as their lookout: they promised him a passage to
// Callis. Make him carry it home and tell Morwen himself ([Straight]), take the chest back and send him home with nobody
// the wiser, bring him back to answer for it, or ([Bad or Evil]) send him on to Callis and keep the chest.
// cgEggMoney = 'owned' | 'hushed' | 'answered' | 'kept'.
//
// cgRing41, RING FORTY-ONE (Noah Quiller; after Brass Rings): the first ring has come back, from Pilar Rovira, a
// fisherwoman of Callis, who found it on a gannet drowned in her nets, and ten more gannets with it this winter. The
// fleet's new long nets are drowning the Cragsby birds where they winter. Show Jenkin Kemp, then decide with Noah:
// publish it and send it to the Callis Assembly, write to Pilar to ask the fleet to set the nets lower in gannet weather,
// or let it lie. cgRing41 = 'published' | 'pilar' | 'lie'.

const EGGS = 'cgEggMoney', R41 = 'cgRing41';
const LOOKOUT = { x: 338.5, z: -914.5 }, CHEST = { x: 341.5, z: -920.5 };
const ROBBERS: [number, number][] = [[344, -917], [335, -909], [347, -922]];

// ================================================================ The Egg Money

const morwenNodes: Record<string, DNode> = {
  em1: { text: 'The egg chest\'s gone. A year of egg money, for the drowned men\'s fund and the winter, out of the store in the night, lock and all.', next: 'em2' },
  em2: { text: 'There are tracks north-east, toward Gaunt\'s Eyrie, where the robbers sit. And Loveday Tonkin\'s Petroc hasn\'t been home since yesterday. I\'m not saying anything. I\'m saying both things.', next: 'em3' },
  em3: {
    text: 'Will you go up? I\'d go myself, but somebody has to keep the Rope, and somebody has to sit with Loveday.',
    options: [{ text: 'I\'ll go up to the Eyrie.', effect: (g) => g.setStage(EGGS, 'eyrie') }, { text: 'Not now, Morwen.' }],
  },
  emWait: { text: 'North-east, to the Eyrie. Mind yourself. Mind him too, if he\'s there.' },
  emBack: {
    text: (g) => {
      const f = g.flag(EGGS);
      if (f === 'owned') return 'He came in with the chest on his shoulder and stood in front of the whole Rope and said it. Fifteen. I\'ve known grown men who couldn\'t. He\'ll work it off on the ropes. Loveday hasn\'t stopped crying, but it\'s the good kind.';
      if (f === 'hushed') return 'The chest\'s back, every mark, and Petroc\'s home with a cold, Loveday says. I don\'t ask. I\'m very good at not asking.';
      if (f === 'answered') return 'You brought him down. The village will decide what\'s owed. Loveday won\'t look at you. She will, in time. Not yet.';
      return 'No chest. No Petroc. Loveday sits at the window. I don\'t know what you did up there. I don\'t want to.';
    },
    options: [{ text: 'It\'s done, Morwen.', effect: (g) => { g.addMarks(g.flag(EGGS) === 'kept' ? 0 : 80); g.setStage(EGGS, 'done'); } }],
  },
};

const petroc: DialogueTree = {
  start: (g) => (at(g, EGGS) === 'eyrie' && killed(g, 'cgRobbers') >= ROBBERS.length ? 'p1' : 'p0'),
  nodes: {
    p0: { text: 'Go away. Go away! They\'ll see you.' },
    p1: { speaker: 'narrator', text: 'A thin lad of fifteen in a fowler\'s smock, sitting on the egg chest with a robber\'s knife across his knees and no idea how to hold it.', next: 'p2' },
    p2: { text: 'They said they\'d get me on a boat to Callis. Gaunt knows the masters. All I had to do was show them where the store key\'s kept. I didn\'t think about whose it was. I thought about Callis.', next: 'p3' },
    p3: {
      text: 'What happens now?',
      options: [
        { text: 'You carry that chest home, and you tell Morwen yourself.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'cgEggMoney:owned', a: 5, tr: { honesty: 3, courage: 2 }, npc: { cg_petroc: 15, morwen: 10, jennyt: 10 }, note: 'Made Petroc Tonkin carry Cragsby\'s egg chest home from Gaunt\'s Eyrie and own it to the village himself.', major: true, fame: 'brought the egg money home from the Eyrie', spread: 'local' }, effect: (g) => { g.setFlag(EGGS, 'owned'); g.setStage(EGGS, 'morwen'); }, next: 'pO' },
        { text: 'I\'ll carry the chest. Go home to your mother. Nobody needs to know.', moral: { id: 'cgEggMoney:hushed', a: 2, tr: { compassion: 3, deception: 2 }, npc: { cg_petroc: 20, jennyt: 15 } }, effect: (g) => { g.setFlag(EGGS, 'hushed'); g.setStage(EGGS, 'morwen'); }, next: 'pH' },
        { text: 'You\'re coming back with me to answer for it.', moral: { id: 'cgEggMoney:answered', tr: { honesty: 2 }, rep: { cragsby: 3 }, npc: { cg_petroc: -20, jennyt: -10, morwen: 5 } }, effect: (g) => { g.setFlag(EGGS, 'answered'); g.setStage(EGGS, 'morwen'); }, next: 'pA' },
        { text: 'Go on to Callis, then. The chest stays with me.', need: { band: ['bad', 'evil'] }, moral: { id: 'cgEggMoney:kept', a: -12, tr: { greed: 5, deception: 2 }, rep: { cragsby: -10 }, npc: { jennyt: -40, morwen: -30 }, note: 'Kept Cragsby\'s egg money and sent Loveday Tonkin\'s boy off to Callis.', major: true, fame: 'took Cragsby\'s egg chest for themselves', spread: 'local' }, effect: (g) => { g.addMarks(160); g.setFlag(EGGS, 'kept'); g.setStage(EGGS, 'morwen'); }, next: 'pK' },
      ],
    },
    pO: { text: 'Myself. In front of everybody. All right. All right. If you walk behind me, I\'ll do it. Don\'t walk in front. I\'ll lose my nerve if I can see your back.' },
    pH: { text: 'You\'d do that? I\'ll never. I swear I\'ll never. I\'ll go the long way, round by the tarn, so nobody sees me come in.' },
    pA: { text: 'Then I\'ll walk. Don\'t hold my arm. I\'m not going to run. Where would I run to?' },
    pK: { text: 'Callis. Right. Right. Tell Mam. No, don\'t tell her. Don\'t tell her anything.' },
  },
};

// ================================================================ Ring Forty-One

const noahNodes: Record<string, DNode> = {
  n41a: { text: 'It came back! Ring forty-one! A letter from Callis, from a Pilar Rovira, a fisherwoman. She found it on a gannet in her nets off the Callis banks this winter. So that\'s where they go!', next: 'n41b' },
  n41b: { speaker: 'narrator', text: 'He hands you the letter. The hand is careful and the spelling is Callis. Under the bit about the ring: "Ten more of your birds dead in our nets since the new long nets came in. They dive on the fish and do not come up. Please send the shilling."', next: 'n41c' },
  n41c: {
    text: 'Ten. And that\'s one boat. The whole fleet changed to long nets at Martinmas. Will you take it to Jenkin? He\'ll want to see it. He\'ll know what it means better than I do.',
    options: [{ text: 'I\'ll show Jenkin.', effect: (g) => { g.give('cg_letter41', 1); g.setStage(R41, 'jenkin'); } }, { text: 'Not now, Noah.' }],
  },
  n41w: { text: (g) => (at(g, R41) === 'jenkin' ? 'Jenkin Kemp, at the Coiled Rope.' : 'Well? What did he say?') },
  n41d: { text: 'Fewer every year, he says. The climmers going down for half the eggs their fathers did. And now we know why, and where. What do we do with it?', next: 'n41e' },
  n41e: {
    text: 'What do we do?',
    options: [
      { text: 'Publish it, and send a copy to the Callis Assembly. They should know what their nets are doing.', moral: { id: 'cgRing41:published', a: 2, tr: { honesty: 3, courage: 2 }, rep: { collegium: 6, callis: -4, cragsby: 4 }, npc: { cg_noah: 15 }, note: 'Had Noah Quiller publish what the rings showed about the Callis long nets, and sent it to the Assembly.' }, effect: (g) => { g.take('cg_letter41', 1); g.setFlag(R41, 'published'); g.addMarks(70); g.setStage(R41, 'done'); }, next: 'n41P' },
      { text: 'Write to Pilar, and ask her to get the fleet to set the nets lower in gannet weather.', moral: { id: 'cgRing41:pilar', a: 4, tr: { compassion: 2, generosity: 1 }, rep: { callis: 3, cragsby: 3 }, npc: { cg_noah: 10 }, note: 'Wrote to a Callis fisherwoman to ask the fleet to spare the Cragsby gannets, rather than shame them in print.' }, effect: (g) => { g.take('cg_letter41', 1); g.setFlag(R41, 'pilar'); g.addMarks(70); g.setStage(R41, 'done'); }, next: 'n41W' },
      { text: 'Let it lie. It\'s a few birds, and Callis buys Cragsby\'s feathers.', moral: { id: 'cgRing41:lie', tr: { greed: 2, compassion: -2 }, rep: { cragsby: -4 }, npc: { cg_noah: -15 } }, effect: (g) => { g.take('cg_letter41', 1); g.setFlag(R41, 'lie'); g.addMarks(40); g.setStage(R41, 'done'); }, next: 'n41L' },
    ],
  },
  n41P: { text: 'My supervisor will faint. Twice. The Callis Assembly will write something rude. And in five years there\'ll be more gannets, and nobody will remember why. That\'s science.' },
  n41W: { text: 'A letter to a fisherwoman. Not science at all. Better, probably. I\'ll put the shilling in it. Two shillings.' },
  n41L: { text: 'A few birds. Right. I\'ll put the ring in a drawer. I\'ll keep ringing. Somebody might want to know one day.' },
};

const jenkinNodes: Record<string, DNode> = {
  jk41: { text: 'Callis. Long nets. I could have told him. My father could have told him. Fewer birds every year, and every year the Collegium asks us why, and every year we say the sea, and it was the sea. The sea with a net in it.', options: [{ text: 'I\'ll tell Noah.', effect: (g) => g.setStage(R41, 'noah') }] },
};

const quests: Record<string, QuestDef> = {
  [EGGS]: {
    id: EGGS, name: 'The Egg Money', region: 'gannet', depth: 'quest',
    notes: (g, s) => {
      if (s === 'eyrie') return 'Cragsby\'s egg chest, a year of egg money, went from the store in the night. The tracks go north-east to Gaunt\'s Eyrie, and Loveday Tonkin\'s boy Petroc hasn\'t been home.';
      if (s === 'morwen') return 'I found the chest at the Eyrie, and Petroc with it. Morwen at the Coiled Rope should hear how it ended.';
      const f = g.flag(EGGS);
      return f === 'owned' ? 'Petroc carried the chest home and owned it to the village.' : f === 'hushed' ? 'The chest came home, and Petroc came home quietly.' : f === 'answered' ? 'Petroc came back to answer for it.' : 'I kept the egg chest. Petroc went to Callis.';
    },
    objectives: (g, s) => (s === 'eyrie' ? [{ text: `Clear the robbers off the Eyrie\'s approach (${Math.min(ROBBERS.length, killed(g, 'cgRobbers'))}/${ROBBERS.length})`, done: killed(g, 'cgRobbers') >= ROBBERS.length }, { text: 'Find the egg chest', marker: 'cg_petroc' }]
      : s === 'morwen' ? [{ text: 'Go back to Morwen at the Coiled Rope', marker: 'morwen' }] : []),
    marks: (_g, s): Marks => (!s ? { morwen: '!' } : s === 'morwen' ? { morwen: '?' } : {}),
    walk: { cast: ['morwen', 'cg_petroc'], kill: { eyrie: [['cliffrobber', 3]] } },
  },
  [R41]: {
    id: R41, name: 'Ring Forty-One', region: 'gannet', depth: 'quest',
    notes: (g, s) => {
      if (s === 'jenkin') return 'Ring forty-one came back from Callis, on a gannet drowned in a fisherwoman\'s nets with ten more. The Callis fleet went over to long nets at Martinmas. Noah wants Jenkin Kemp to see the letter.';
      if (s === 'noah') return 'Jenkin says the birds come back fewer every year. Noah should hear it, and we should decide what to do.';
      const f = g.flag(R41);
      return f === 'published' ? 'Noah published it, and a copy went to the Callis Assembly.' : f === 'pilar' ? 'We wrote to Pilar Rovira to ask the fleet to spare the birds.' : 'We let it lie.';
    },
    objectives: (_g, s) => (s === 'jenkin' ? [{ text: 'Show the letter to Jenkin Kemp at the Coiled Rope', marker: 'watkemp' }] : s === 'noah' ? [{ text: 'Go back to Noah Quiller by the egg store', marker: 'cg_noah' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'cgRings') === 'done' ? { cg_noah: '!' } : s === 'jenkin' ? { watkemp: '?' } : s === 'noah' ? { cg_noah: '?' } : {}),
    walk: { cast: ['cg_noah', 'watkemp'], from: { quests: { cgRings: 'done' }, flags: { cgRings: 'collegium' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'cgRobbers', type: 'cliffrobber', at: ROBBERS, when: (g) => at(g, EGGS) === 'eyrie' },
];

const things: WorldThing[] = [
  { id: 'cgChest', x: CHEST.x, z: CHEST.z, label: 'Look at the chest', radius: 2.4, look: 'crate',
    when: (g) => at(g, EGGS) === 'eyrie',
    use: (g) => g.toast('Cragsby\'s egg chest, iron-bound, its lock broken off with something heavy. Every mark still in it, as far as you can tell, and a fowler\'s cap on the lid.') },
];

const NPCS: NpcDef[] = [
  { id: 'cg_petroc', name: 'Petroc Tonkin', title: 'Cragsby', look: { skin: '#e2b894', hair: '#7a3a1e', hairStyle: 3, eyes: '#4a5a4a', tunic: '#6a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', freckles: true, build: 0.78, age: 0.15 },
    schedule: [{ from: 0, to: 24, at: [LOOKOUT.x, LOOKOUT.z], face: [CHEST.x, CHEST.z], anim: 'seated' }], when: (g) => at(g, EGGS) === 'eyrie', barks: ['Go away!'] },
];

const ITEMS: ItemDef[] = [
  { id: 'cg_letter41', name: 'A letter from Callis', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#3a2a20' }, desc: 'From Pilar Rovira, fisherwoman, Callis, with ring forty-one folded in it: "Ten more of your birds dead in our nets since the new long nets came in. Please send the shilling."' },
];

export const GANNET_EGGS: RegionContent = {
  id: 'gannetEggs',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { cg_petroc: petroc },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'morwen', (g) => {
      const s = at(g, EGGS);
      if (s === 'eyrie') return 'emWait';
      if (s === 'morwen') return 'emBack';
      return undefined;
    }, morwenNodes);
    // (offered from her own menu, so the Rope's menu stays hers)
    addOption(D, 'morwen', 'hello', { text: 'The egg store\'s shut up. Is something wrong?', next: 'em1', cond: (g) => !at(g, EGGS) });
    hook(D, 'watkemp', (g) => (at(g, R41) === 'jenkin' ? 'jk41' : undefined), jenkinNodes);
    hook(D, 'cg_noah', (g) => {
      const s = at(g, R41);
      if (!s) return at(g, 'cgRings') === 'done' ? 'n41a' : undefined;
      if (s === 'jenkin') return 'n41w';
      if (s === 'noah') return 'n41d';
      return undefined;
    }, noahNodes);
  },
};
