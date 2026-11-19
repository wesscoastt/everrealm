import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';

// THE USHERS: the last of the factions you can join (data/factions.ts; owner 2026-11-14, "next work on factions and
// questlines for them"). They keep the doors of the Charter Hall, in the keep at Ansbury. Since the Charter was sealed
// they have also been the Speaker\'s eyes: who came late to a sitting, who left early, what a sealed letter said before
// it was sealed again. Oswin Hext, the Senior Usher, runs them from the south door. What he\'s really testing, chapter by
// chapter, is whose eyes you\'ll be.
//
// Chapters (each a rank):
//   ushDoor   WHO CAME LATE (Doorkeeper): keep the south door through a sitting and report who came late and who left
//             early. One of them is Clement Fry, slipping out to copy a page. Name him, or leave him out. Flag ushClem =
//             'told' | 'kept'.
//   ushSeal   UNDER SEAL (Usher): carry the Speaker\'s office\'s letter to Hilda Harrowgate, by the keep. An Usher reads
//             everything: lift the seal over the kettle in the Ushers' lobby. It trades the long stretch\'s tolls for the
//             bridge debt\'s interest, behind the moot\'s back. Reseal it and say nothing, or give a copy to Amos Hollis to
//             print. Flag ushSeal = 'kept' | 'printed'.
//   ushHall   USHER OF THE HALL (Usher of the Hall): Hext tells you what the Ushers were made for: to keep the Charter\'s
//             door, not the Speaker\'s. Whose eyes are you? Flag ushEnd = 'speaker' | 'charter'.

const DOOR = 'ushDoor', SEAL = 'ushSeal', HALL = 'ushHall';
/** The keep\'s south door (world/sites.ts: the keep at 820, 300), Hext beside it, the Ushers' lobby kettle inside the porch. */
const HEXT = { x: 822.6, z: 315.4 }, POST = { x: 820.5, z: 313.6 }, KETTLE = { x: 823.2, z: 312.6 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:ushers'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:ushers', r); };
const clem = (g: GameApi) => g.flag('ushClem') as 'told' | 'kept' | undefined;
const seal = (g: GameApi) => g.flag('ushSeal') as 'kept' | 'printed' | undefined;

// ================================================================ Oswin Hext, Senior Usher

const hext: DialogueTree = {
  start: (g) => {
    const d = at(g, DOOR), s = at(g, SEAL), h = at(g, HALL);
    if (!d) return 'j1';
    if (d === 'report') return 'r1';
    if (d !== 'done') return 'dWait';
    if (!s) return 's1';
    if (s === 'back') return 'sE';
    if (s !== 'done') return 'sWait';
    if (!h) return 'h1';
    return 'idle';
  },
  nodes: {
    idle: {
      text: (g) => {
        const r = g.flag('fac:ushers');
        if (r === 2) return g.flag('ushEnd') === 'charter' ? 'The book is on the table in the porch. Anyone may read it. Nobody does, which is how you know it\'s working.' : 'Good morning, Usher. The Speaker asked after you. I said you were discreet. She liked that.';
        if (r === 1) return 'Doors. Letters. Silence. In that order.';
        return 'Stand straight. Look at nothing. See everything.';
      },
    },
    // I. Who Came Late
    j1: { speaker: 'narrator', text: 'A narrow grey man in a black coat with a short black rod under his arm, standing so still by the door of the keep that you take him for part of it.', next: 'j2' },
    j2: { text: 'Oswin Hext, Senior Usher. You\'ve been looking at the door for a while. People who look at doors are either lost or curious. You don\'t look lost.', next: 'j3' },
    j3: { text: 'The Charter sits this afternoon. I\'m an usher short: Tobias has his feet up with the gout. Keep the door for me through the sitting.', next: 'j4' },
    j4: {
      text: 'It isn\'t only opening it. The Speaker likes to know who came late, and who left early, and why. Can you remember faces?',
      options: [
        { text: 'I can.', next: 'j5' },
        { text: 'Why does the Speaker want to know who comes late?', next: 'jWhy' },
      ],
    },
    jWhy: { text: 'A man who comes late to a sitting came from somewhere he\'d rather not say. The Speaker likes to know where. So do I. Usually it\'s a tavern.', next: 'j5' },
    j5: { text: 'Stand at the door. Open it. Close it. Look at nothing. See everything. Then come and tell me.', effect: (g) => g.setStage(DOOR, 'door') },
    dWait: { text: 'The door. It won\'t keep itself, whatever the Charter Arms says.' },
    r1: { text: 'Well? Who came late?', next: 'r2' },
    r2: {
      text: 'And who left before the vote?',
      options: [
        { text: 'Harrowgate\'s clerk came late. A Collegium Fellow left early. And Clement Fry slipped out with a page under his coat.', effect: (g) => g.setFlag('ushClem', 'told'), next: 'rT' },
        { text: 'Harrowgate\'s clerk came late. A Collegium Fellow left early. Nobody else worth the Speaker\'s time.', effect: (g) => g.setFlag('ushClem', 'kept'), next: 'rK' },
      ],
    },
    rT: { text: 'Clement Fry. Again. He copies things, you know. He has a drawer full of copies of things he doesn\'t like. I shall mention it.', next: 'rE' },
    rK: { speaker: 'narrator', text: 'He looks at you for a moment longer than he needs to, then writes two names in a small book.', next: 'rE' },
    rE: { text: 'A Doorkeeper. That\'s what you are now. It\'s a small thing. Most of the Charter is.', effect: (g) => { g.setStage(DOOR, 'done'); rank(g, 0); g.addMarks(30); } },
    // II. Under Seal
    s1: { text: 'A letter. The Speaker\'s office\'s seal, as you see. It goes to Hilda Harrowgate, who is standing over there pretending she isn\'t waiting for it.', next: 's2' },
    s2: { text: 'An Usher reads everything that passes through the hall. Not for the Speaker: for the hall. There\'s a kettle in the porch. The seal lifts in steam and goes back with a warm knife.', next: 's3' },
    s3: { text: 'Read it. Reseal it. Deliver it. What you do after that is the part I\'ll be watching.', effect: (g) => { g.give('ush_letter', 1); g.setStage(SEAL, 'steam'); } },
    sWait: { text: (g) => (at(g, SEAL) === 'steam' ? 'The kettle\'s in the porch, on the hob. Mind your fingers.' : at(g, SEAL) === 'choose' ? 'You\'ve read it. Now deliver it, or don\'t. Mrs Harrowgate is still pretending.' : at(g, SEAL) === 'amos' ? 'If you\'re going to Hollis, go before the evening edition.' : '') },
    sE: { text: (g) => (seal(g) === 'printed' ? 'Hollis\'s broadside is on every post in the Charter Market. The Speaker read it at breakfast and didn\'t finish her egg. Mrs Harrowgate has gone home early.' : 'Mrs Harrowgate has her letter, with its seal as good as new. The Speaker will have her bargain. Nobody will know but you, and me, and the kettle.'), next: 'sE2' },
    sE2: { text: (g) => (seal(g) === 'printed' ? 'I ought to dismiss you. I\'m going to make you an Usher instead. I\'ll tell you why another day.' : 'An Usher, then. You know how to carry a thing without dropping it.'), effect: (g) => { g.setStage(SEAL, 'done'); rank(g, 1); g.addMarks(60); } },
    // III. Usher of the Hall
    h1: { speaker: 'narrator', text: 'He takes you inside, through the porch and into the hall itself, empty, the benches pale in the light from the high windows. He sits on the Speaker\'s bench, which you\'re fairly sure isn\'t allowed.', next: 'h2' },
    h2: { text: 'When the Charter was sealed, the first Speaker, Margery Rendle, made six Ushers. She told them they kept the Charter\'s door. Not hers. The Charter\'s.', next: 'h3' },
    h3: { text: 'Every Speaker since has forgotten that, the way you forget a thing that\'s inconvenient. And every Senior Usher has had to decide whether to remind them.', next: 'h4' },
    h4: { text: (g) => `I\'ve watched you. ${clem(g) === 'kept' ? 'You kept Clement Fry out of my little book.' : 'You gave me Clement Fry.'} ${seal(g) === 'printed' ? 'You gave the Speaker\'s bargain to a printer.' : 'You carried the Speaker\'s bargain and kept your mouth shut.'} Both are things an Usher does. The question is whose Usher.`, next: 'h5' },
    h5: {
      text: 'I\'m nearly done. The rod will be yours. So: whose eyes are the Ushers, after me?',
      options: [
        { text: 'The Speaker\'s. Somebody has to be able to trust the hall\'s doors, and she\'s the one who sits in it.', effect: (g) => g.setFlag('ushEnd', 'speaker'), next: 'hS' },
        { text: 'The Charter\'s. Keep the book of what we see, and open it to the moot every Lady Day.', effect: (g) => g.setFlag('ushEnd', 'charter'), next: 'hC' },
      ],
    },
    hS: { text: 'Then she\'ll have the best eyes in the Counties, and she\'ll never know how close she came to not having them. It\'s an honest answer. Most of the honest ones are.', next: 'hE' },
    hC: { text: 'Margery Rendle would have liked you. The Speaker won\'t. The book goes on the table in the porch on Lady Day, and the first page is the bargain you read over a kettle.', next: 'hE' },
    hE: { speaker: 'narrator', text: 'He holds out the short black rod. It\'s heavier than it looks, ebony, with a silver cap worn smooth by a great many thumbs.', next: 'hE2' },
    hE2: { text: 'Usher of the Hall. Stand straight. Look at nothing. See everything. And remember whose door it is.', effect: (g) => { g.setStage(HALL, 'done'); rank(g, 2); g.addMarks(120); g.give('ush_rod', 1); } },
  },
};

// ================================================================ Hilda Harrowgate (her tree is the main story\'s), and Amos Hollis (the Waits')

const hildaNodes: Record<string, DNode> = {
  us1: { speaker: 'narrator', text: 'She holds out a gloved hand for the letter without looking at you, and turns it over to check the seal, carefully, in the light.', next: 'us2' },
  us2: { text: 'Intact. How unusual. Thank you. Tell Hext the Speaker can count on Harrowgate & Daughters, and that I\'ll want the long stretch surveyed by Michaelmas.', effect: (g) => { g.take('ush_letter', 1); if (!g.flag('ushSeal')) g.setFlag('ushSeal', 'kept'); g.setStage(SEAL, 'back'); } },
};
const amosNodes: Record<string, DNode> = {
  ua1: { text: 'A copy of a sealed letter from the Speaker\'s office. In your hand, I assume, so nobody can say it\'s hers. Let me see.', next: 'ua2' },
  ua2: { speaker: 'narrator', text: 'He reads it twice, the second time with his lips moving, and then he starts setting type before he\'s put it down.', next: 'ua3' },
  ua3: { text: '"The long stretch to the Trust, for ten years. The bridge debt\'s interest forgiven by Harrowgate, for ten years. The moot not to be troubled with it." Not to be troubled. I\'ll trouble it. Evening edition.', effect: (g) => { g.setFlag('ushSeal', 'printed'); g.setStage(SEAL, 'deliver'); } },
  ua4: { text: 'Deliver the original. Of course deliver it. If she doesn\'t have it in her hand when she reads my broadside, she might think it isn\'t true.' },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [DOOR]: {
    id: DOOR, name: 'Who Came Late', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'door' ? 'Oswin Hext, Senior Usher, wants me to keep the Charter Hall\'s south door through a sitting, and remember who came late and who left early.' : s === 'report' ? 'Harrowgate\'s clerk came late. A Collegium Fellow left before the vote. And Clement Fry slipped out with a page under his coat. Back to Hext.' : s === 'done' ? (clem(g) === 'told' ? 'I told Hext everything, Clement Fry included. I\'m a Doorkeeper.' : 'I left Clement Fry out of what I told Hext. I\'m a Doorkeeper.') : ''),
    objectives: (g, s) => (s === 'door' ? [{ text: 'Keep the south door of the keep through the sitting', marker: 'ushPost' }] : s === 'report' ? [{ text: 'Tell Oswin Hext who came and went', marker: 'ush_hext' }] : []),
    marks: (g, s): Marks => (!s ? { ush_hext: '!' } : s === 'report' ? { ush_hext: '?' } : {}),
    walk: { cast: ['ush_hext'] },
  },
  [SEAL]: {
    id: SEAL, name: 'Under Seal', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'steam' ? 'A letter under the Speaker\'s office\'s seal, for Hilda Harrowgate. Hext says an Usher reads everything: there\'s a kettle in the porch.' : s === 'choose' ? 'The Speaker gives Harrowgate the long stretch\'s tolls for ten years, and Harrowgate forgives the bridge debt\'s interest, and "the moot not to be troubled with it". Reseal it and deliver it, or take a copy to Amos Hollis the printer first.' : s === 'amos' ? 'I\'m taking a copy to Amos Hollis, in the Charter Market.' : s === 'deliver' ? 'Amos is printing it. Now deliver the original to Hilda Harrowgate.' : s === 'back' ? 'Back to Hext.' : s === 'done' ? (seal(g) === 'printed' ? 'I gave the Speaker\'s bargain to Amos Hollis to print. Hext made me an Usher anyway.' : 'I read the Speaker\'s bargain, resealed it and said nothing. I\'m an Usher.') : ''),
    objectives: (g, s) => (s === 'steam' ? [{ text: 'Lift the seal over the kettle in the keep\'s porch', marker: 'ushKettle' }] : s === 'choose' ? [{ text: 'Deliver the letter to Hilda Harrowgate, by the keep', marker: 'maren' }, { text: 'Or take a copy to Amos Hollis first', marker: 'amos' }] : s === 'amos' ? [{ text: 'Take the copy to Amos Hollis', marker: 'amos' }] : s === 'deliver' ? [{ text: 'Deliver the letter to Hilda Harrowgate', marker: 'maren' }] : s === 'back' ? [{ text: 'Talk to Oswin Hext', marker: 'ush_hext' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, DOOR) ? { ush_hext: '!' } : {}) : s === 'choose' ? { maren: '?', amos: '?' } : s === 'amos' ? { amos: '?' } : s === 'deliver' ? { maren: '?' } : s === 'back' ? { ush_hext: '?' } : {}),
    walk: { from: { quests: { [DOOR]: 'done' }, flags: { 'fac:ushers': 0 } }, cast: ['ush_hext', 'maren', 'amos'] },
  },
  [HALL]: {
    id: HALL, name: 'Usher of the Hall', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'done' ? (g.flag('ushEnd') === 'charter' ? 'The Ushers keep the Charter\'s door, not the Speaker\'s: the book of what they see goes to the moot every Lady Day. I\'m Usher of the Hall.' : 'The Ushers are the Speaker\'s eyes, and the best in the Counties. I\'m Usher of the Hall.') : ''),
    objectives: () => [{ text: 'Talk to Oswin Hext', marker: 'ush_hext' }],
    marks: (g, s): Marks => (!s && done(g, SEAL) ? { ush_hext: '!' } : {}),
    walk: { from: { quests: { [DOOR]: 'done', [SEAL]: 'done' }, flags: { 'fac:ushers': 1, ushClem: 'kept', ushSeal: 'printed' } }, cast: ['ush_hext'] },
  },
};

// ================================================================ Things

const things: WorldThing[] = [
  {
    id: 'ushPost', x: POST.x, z: POST.z, label: 'Keep the door through the sitting', radius: 2.4, look: 'none',
    when: (g) => at(g, DOOR) === 'door',
    use: (g) => { g.setStage(DOOR, 'report'); g.toast('Three hours of opening and closing. Harrowgate\'s clerk comes in at the half hour, out of breath. A Collegium Fellow in plum leaves before the vote with his hat over his face. And Clement Fry of the Toll Office slips out of the side bench with a folded page under his coat, and doesn\'t come back.'); },
  },
  {
    id: 'ushKettle', x: KETTLE.x, z: KETTLE.z, label: 'Lift the seal over the kettle', radius: 2.2, look: 'none',
    when: (g) => at(g, SEAL) === 'steam',
    use: (g) => { g.setStage(SEAL, 'choose'); g.toast('The wax softens and lifts whole. Inside, in the Speaker\'s secretary\'s hand: the long stretch let to Harrowgate\'s Turnpike Trust for ten years; the bridge debt\'s interest forgiven by Harrowgate for the same ten; "the moot not to be troubled with it." You warm a knife and the seal goes back as if it had never moved.'); },
  },
];

// ================================================================ People and things

const NPCS_U: NpcDef[] = [
  { id: 'ush_hext', name: 'Oswin Hext', title: 'Senior Usher, the Charter Hall', look: { skin: '#e8c8a8', hair: '#a8a49c', hairStyle: 1, eyes: '#3a3a42', tunic: '#141418', trim: '#c8c8d0', trousers: '#141418', boots: '#0e0e10', cape: '#141418', build: 0.84, height: 1.06, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [HEXT.x, HEXT.z], face: [HEXT.x, HEXT.z + 4], anim: 'idle' }], barks: ['Look at nothing.', 'See everything.'] },
];

const ITEMS_U: ItemDef[] = [
  { id: 'ush_letter', name: 'A letter under seal', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#8a1e1a' }, desc: 'Heavy paper, folded twice, the Speaker\'s office\'s red seal on the fold. "Mrs H. Harrowgate, by hand."' },
  { id: 'ush_rod', name: 'The Usher\'s rod', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'rod', a: '#141418', b: '#c8c8d0' }, desc: 'A short rod of ebony, heavier than it looks, with a silver cap worn smooth by a great many thumbs. The Senior Usher carries it at every sitting.', stats: 'Carried by the Usher of the Hall.' },
];

export const USHERS: RegionContent = {
  id: 'ushers',
  items: ITEMS_U,
  npcs: NPCS_U,
  dialogue: { ush_hext: hext },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'maren', (g) => (at(g, SEAL) === 'choose' || at(g, SEAL) === 'deliver' ? 'us1' : undefined), hildaNodes);
    hook(D, 'amos', (g) => (at(g, SEAL) === 'choose' ? 'ua1' : at(g, SEAL) === 'deliver' ? 'ua4' : undefined), amosNodes);
  },
};
