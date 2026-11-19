import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';

// More of the Gannet Cliffs (owner 2026-11-13, content order: fill the Counties first). Two side stories at Cragsby.
//
// cgRings, BRASS RINGS (Noah Quiller, a Collegium student, by the egg store): he puts brass rings on gannets' legs to
// learn where they winter, "return for a shilling, the Collegium, Ansbury". The climmers won\'t take him down, so ring
// three birds in them for him. Jenkin Kemp says the climmers find the birds and the Collegium gets the credit,
// same as always. What\'s stamped on the next rings? Choice cgRings = 'collegium' | 'cragsby' (both names; Noah\'s
// supervisor won\'t like it).
//
// cgFigure, WHAT THE SEA BROUGHT (Kitty Lander, the green): a ship\'s figurehead came ashore after the gale and the lads
// dragged it up to the green: a carved woman whose hands once held a lamp, off a Callis brig. Morwen Tregear means to sell it to a
// Gullmouth chandler for the drowned men\'s fund. Kitty married a Callis sailor; that brig was his. Choice cgFigure =
// 'kitty' (it stands at her door) | 'fund' (sold; the fund pays Kitty\'s share with the rest).

const RINGS = 'cgRings', FIGURE = 'cgFigure';
/** By the egg store, east of the square, where the fowlers keep the birds they've netted in baskets. */
const NOAH = { x: 261.5, z: -1000.5 };
const LEDGES: [number, number][] = [[266.2, -1004.2], [263.6, -1003.4], [263.4, -995.8]];
const KITTY = { x: 240.5, z: -1004.5 }, HEAD = { x: 243.5, z: -1007.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const ringed = (g: GameApi) => LEDGES.filter((_, i) => g.flag('cgRing' + i)).length;

// ================================================================ Brass Rings

const noah: DialogueTree = {
  start: (g) => {
    const s = at(g, RINGS);
    if (!s) return 'n1';
    if (s === 'back') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('cgRings') === 'cragsby' ? 'My supervisor wrote. Two pages. I\'ve read them once. The rings say Cragsby, and the first one came back from the Morrow coast last week, and the man who found it wrote to Jenkin, not to me.' : 'Two rings back already, one from the Weatherholms. Two! The Collegium is printing the first count next term. I\'ll send the climmers a copy. I will.') },
    wait: { text: (g) => (at(g, RINGS) === 'ring' ? `Three birds, one in each basket. ${ringed(g)} of ${LEDGES.length}. Hold the bird by the back, not the neck; they\'ll have your thumb off.` : 'Jenkin Kemp, at the Coiled Rope. He has opinions. Everyone here has opinions.') },
    n1: { speaker: 'narrator', text: 'A young man in a Collegium gown with the hem tied up out of the mud, sitting on a crate by the egg store with a little brass pliers and a bag of rings, glaring at three wicker baskets that are glaring back.', next: 'n2' },
    n2: { text: 'Noah Quiller, the Collegium. Don\'t put your hand near the baskets. They bite.', next: 'n3' },
    n3: { text: 'I put a ring on a gannet\'s leg, stamped with a number. When someone finds the bird, in a net off Callis or dead on a Weatherholm, they send the ring back for a shilling, and I know where it went.', next: 'n4' },
    n4: { text: 'Nobody knows where the gannets winter. In ten years, I will. The fowlers net them for the feathers and let them go again, and they won\'t let me near the baskets. They say a ringed bird is bad luck.', next: 'n5' },
    n5: {
      text: 'You\'ve got steady hands, and the fowlers don\'t know you yet. Three birds, three baskets?',
      options: [
        { text: 'Give me the rings.', effect: (g) => { g.give('cg_rings', 1); g.setStage(RINGS, 'ring'); }, next: 'n6' },
        { text: 'Not today.' },
      ],
    },
    n6: { text: 'Number forty-one, forty-two and forty-three. Write down which bird gets which. Nobody ever writes down which bird gets which.' },
    b1: { text: (g) => (g.flag('cgRings') === 'cragsby' ? 'Both names. On the ring. "Cragsby climmers and the Collegium." That\'s twice the letters, and the stamp costs a shilling a letter.' : 'Just the Collegium, as it\'s always been. Jenkin will forgive me. Probably.'), next: 'b2' },
    b2: { text: (g) => (g.flag('cgRings') === 'cragsby' ? 'My supervisor will say a ring is a scientific instrument, not a sampler. And he\'ll be wrong. Jenkin\'s grandfather knew where the gannets went before the Collegium had a roof. Here: the first count goes to you.' : 'Thank you. Truly. Here: the first count goes to you. Don\'t show it to Jenkin.'), effect: (g) => { g.take('cg_rings', 1); g.setStage(RINGS, 'done'); g.addMarks(45); } },
  },
};

const jenkinNodes: Record<string, DNode> = {
  jr1: { text: 'The Collegium lad. Aye. My grandfather knew the gannets go south in the back end and come in off the Morrow coast at Lady Day. He knew it from fifty years of watching. Nobody printed him.', next: 'jr2' },
  jr2: { text: 'Now a lad with brass pliers puts a ring on a bird, and when it comes back, the Collegium knew it. The climmers find the birds, the climmers net them, and the Collegium\'s name goes on the book.', next: 'jr3' },
  jr3: {
    text: 'I don\'t mind the rings. I mind whose name\'s stamped on them. You tell him that.',
    options: [
      { text: 'I\'ll get him to stamp Cragsby on them too.', effect: (g) => { g.setFlag('cgRings', 'cragsby'); g.setStage(RINGS, 'back'); }, next: 'jrC' },
      { text: 'It\'s his work. The Collegium\'s name stays.', effect: (g) => { g.setFlag('cgRings', 'collegium'); g.setStage(RINGS, 'back'); }, next: 'jrK' },
    ],
  },
  jrC: { text: 'Cragsby on a ring. On a bird, all the way to Callis. My grandfather would\'ve had that put on his stone.' },
  jrK: { text: 'Aye. Course it does. Go on, then. I\'ll stand you a drink anyway: you put your hands in a gannet basket for him, which is more than I would.' },
};

// ================================================================ What the Sea Brought

const kitty: DialogueTree = {
  start: (g) => {
    const s = at(g, FIGURE);
    if (!s) return 'k1';
    if (s === 'back') return 'e1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('cgFigure') === 'kitty' ? 'She stands by my door now. I put a lamp in her hands last night. The fishing boats saw it coming in, and dipped their flags. I don\'t know who told them.' : 'The fund paid me my share. Sixty marks. I gave twenty back for the Pascoe children. She\'s on a chandler\'s shop in Gullmouth now. I might go and see her. I might not.') },
    wait: { text: (g) => (at(g, FIGURE) === 'look' ? 'Go and look at her. On the green. Look at the lamp.' : 'Morwen. The Coiled Rope. She\'ll be fair. She\'s always fair. That\'s what\'s hard about her.') },
    k1: { speaker: 'narrator', text: 'A woman in black standing at the edge of the green with her arms folded tight, looking at something the lads have dragged up from the shore and propped against the wall.', next: 'k2' },
    k2: { text: 'Kitty Lander. Kitty Ferrer, I was, for four years. I married a Callis man. Don\'t look like that: some of us did.', next: 'k3' },
    k3: { text: 'The gale threw that up on Tuesday. Go and look at it. Then come and tell me I\'m wrong.', effect: (g) => g.setStage(FIGURE, 'look') },
    e1: { text: 'Well?', next: 'e2' },
    e2: { text: (g) => (g.flag('cgFigure') === 'kitty' ? 'She\'s mine? Morwen said that? Then she\'s fairer than I gave her credit for, and I gave her a lot.' : 'Sold. For the fund. Well. Ramon would have said the same. He always said a dead man\'s things should feed a live man\'s children. I hated it when he said it.'), effect: (g) => { g.setStage(FIGURE, 'done'); g.addMarks(40); } },
  },
};

const morwenNodes: Record<string, DNode> = {
  mf1: { text: 'Kitty\'s figurehead. I know. I\'ve known since Tuesday. "Llum de Callis", Ramon Ferrer\'s brig, lost off the north stack with all hands in the spring.', next: 'mf2' },
  mf2: { text: 'There\'s a fund here for drowned men\'s families. Two of ours went down this year, and the Pascoe children have nothing. A Gullmouth chandler will give eighty marks for her, to hang over his door.', next: 'mf3' },
  mf3: {
    text: 'Kitty gets a share of the fund, same as any widow. Or Kitty gets the figurehead, and the fund gets nothing. You\'ve seen her. You decide. I\'ve been looking at it all week and I can\'t.',
    options: [
      { text: 'Give it to Kitty. It\'s his ship.', effect: (g) => { g.setFlag('cgFigure', 'kitty'); g.setStage(FIGURE, 'back'); }, next: 'mfK' },
      { text: 'Sell it for the fund. Kitty gets her share, and so do the Pascoe children.', effect: (g) => { g.setFlag('cgFigure', 'fund'); g.setStage(FIGURE, 'back'); }, next: 'mfF' },
    ],
  },
  mfK: { text: 'Then I\'ll put a hat round the Rope tonight for the Pascoes, and if you have any marks on you, now\'s the time.' },
  mfF: { text: 'Aye. That\'s what I\'d have said, if I could have said it. Tell her gently. You know how.' },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [RINGS]: {
    id: RINGS, name: 'Brass Rings', region: 'gannet', depth: 'quest',
    notes: (g, s) => (s === 'ring' ? 'Noah Quiller, a Collegium student, rings gannets to learn where they winter. The fowlers won\'t let him near the birds they\'ve netted, so I\'m to ring three in the baskets by the egg store.' : s === 'jenkin' ? 'Three birds ringed. Jenkin Kemp at the Coiled Rope has something to say about whose name goes on the rings.' : s === 'back' ? 'Back to Noah.' : s === 'done' ? (g.flag('cgRings') === 'cragsby' ? 'The rings say Cragsby climmers and the Collegium.' : 'The rings say the Collegium, as they always have.') : ''),
    objectives: (g, s) => (s === 'ring' ? LEDGES.map((_, i) => ({ text: `Ring the gannet in the ${['first', 'second', 'third'][i]} basket`, done: !!g.flag('cgRing' + i), marker: 'cgLedge' + i })) : s === 'jenkin' ? [{ text: 'Talk to Jenkin Kemp at the Coiled Rope', marker: 'watkemp' }] : s === 'back' ? [{ text: 'Talk to Noah Quiller', marker: 'cg_noah' }] : []),
    advance: (g, s) => (s === 'ring' && ringed(g) >= LEDGES.length ? 'jenkin' : null),
    marks: (g, s): Marks => (!s ? { cg_noah: '!' } : s === 'jenkin' ? { watkemp: '?' } : s === 'back' ? { cg_noah: '?' } : {}),
    walk: { cast: ['cg_noah', 'watkemp'] },
  },
  [FIGURE]: {
    id: FIGURE, name: 'What the Sea Brought', region: 'gannet', depth: 'quest',
    notes: (g, s) => (s === 'look' ? 'The gale threw a ship\'s figurehead ashore at Cragsby, and the lads dragged it up to the green. Kitty Lander, who married a Callis sailor, wants me to look at it.' : s === 'morwen' ? 'A carved woman holding a lamp, "Llum de Callis" on the scroll at her feet: Kitty\'s husband\'s brig, lost in the spring. Morwen Tregear at the Coiled Rope means to sell it for the drowned men\'s fund.' : s === 'back' ? 'Back to Kitty.' : s === 'done' ? (g.flag('cgFigure') === 'kitty' ? 'The figurehead stands at Kitty\'s door.' : 'The figurehead was sold for the fund; Kitty had her share.') : ''),
    objectives: (g, s) => (s === 'look' ? [{ text: 'Look at the figurehead on the green', marker: 'cgHead' }] : s === 'morwen' ? [{ text: 'Talk to Morwen Tregear at the Coiled Rope', marker: 'morwen' }] : s === 'back' ? [{ text: 'Talk to Kitty Lander', marker: 'cg_kitty' }] : []),
    marks: (g, s): Marks => (!s ? { cg_kitty: '!' } : s === 'morwen' ? { morwen: '?' } : s === 'back' ? { cg_kitty: '?' } : {}),
    walk: { cast: ['cg_kitty', 'morwen'] },
  },
};

const things: WorldThing[] = [
  ...LEDGES.map(([x, z], i): WorldThing => ({
    id: 'cgLedge' + i, x, z, label: 'Ring the gannet in the basket', radius: 2.4, look: 'basket',
    when: (g) => at(g, RINGS) === 'ring' && !g.flag('cgRing' + i),
    use: (g) => { g.setFlag('cgRing' + i, 1); g.toast(['Lid up, both hands in. The bird stabs at your wrist, misses, stabs again. Ring forty-one goes on, and you write it down.', 'A young bird, still grey. It hardly fights. Forty-two.', 'An old cock bird with a white face, who has clearly done this before and objects. Forty-three, and a cut thumb.'][i]); },
  })),
  {
    id: 'cgHead', x: HEAD.x, z: HEAD.z, label: 'Look at the figurehead', radius: 2.4, look: 'none',
    when: (g) => at(g, FIGURE) === 'look',
    use: (g) => { g.setStage(FIGURE, 'morwen'); g.toast('A carved woman twice your height, leaning forward as she leaned off the bow, her blue gone to salt-grey, her hands cupped in front of her where her lamp was. On the scroll at her feet, in letters you can still read: "Llum de Callis". Somebody has put a candle between her hands.'); },
  },
];

const NPCS_G: NpcDef[] = [
  { id: 'cg_noah', name: 'Noah Quiller', title: 'Student, the Collegium', look: { skin: '#e8c4a0', hair: '#5a3a24', hairStyle: 3, eyes: '#4a5a6a', tunic: '#5a2a4a', trim: '#e0bd64', trousers: '#2a2a32', boots: '#2a1e14', freckles: true, build: 0.84, age: 0.22 },
    schedule: [{ from: 0, to: 24, at: [NOAH.x, NOAH.z], face: [NOAH.x + 4, NOAH.z], anim: 'idle' }], barks: ['Further than it looks.'] },
  { id: 'cg_kitty', name: 'Kitty Lander', title: 'Cragsby', look: { frame: 'f', skin: '#d8a882', hair: '#2a1a12', hairStyle: 2, eyes: '#3a4a5a', tunic: '#1e1e24', trim: '#5a5a62', trousers: '#1e1e24', boots: '#1a1614', hat: 'kerchief', hatColor: '#1e1e24', lashes: true, build: 0.95, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [KITTY.x, KITTY.z], face: [HEAD.x, HEAD.z], anim: 'idle' }], barks: ['Arms folded.'] },
];

const ITEMS_G: ItemDef[] = [
  { id: 'cg_rings', name: 'A bag of brass rings', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'coin', a: '#c8a050' }, desc: 'Little brass rings for a gannet\'s leg, each stamped with a number and "return for a shilling, the Collegium, Ansbury". And a pair of brass pliers.' },
];

export const GANNET_MORE: RegionContent = {
  id: 'gannetMore',
  items: ITEMS_G,
  npcs: NPCS_G,
  dialogue: { cg_noah: noah, cg_kitty: kitty },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'watkemp', (g) => (at(g, RINGS) === 'jenkin' ? 'jr1' : undefined), jenkinNodes);
    hook(D, 'morwen', (g) => (at(g, FIGURE) === 'morwen' ? 'mf1' : undefined), morwenNodes);
  },
};
