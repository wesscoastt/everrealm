import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, bandIs, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';

// The Ropewalk Cellar takes people on (docs/MORALITY.md, example 3: a faction that recruits the dark-aligned, and is
// never a gate for anyone else). Owner 2026-11-19: "work on the new systems and then get back to quests".
//
// rwPage, A PAGE GOES MISSING (Nell Kitto, the Ropewalk Cellar under Gullmouth): ask her for work. A Bad or Evil name
// is its own reference: she offers the job as a member's. Anyone else she tests: take a sealed note to Silas Crewe,
// the harbour watch's clerk, and bring back what he gives you. It's a page torn from the watch's book: Kit Pascoe,
// eleven, a loaf from the Merchants' Quarter ovens. Nell will sell it back to his mother; the page is what the Cellar
// trades in. Choice rwPage = 'nell' (hand it over: you're the Cellar's) | 'burn' (burn it, so nobody owns the boy:
// Nell is not pleased, but she noticed) | 'watch' (take it back to the watch: the Cellar hears, and the door shuts).
// 'clerk' -> 'page' -> done.

const PAGE = 'rwPage';
const SILAS = { x: 1794.5, z: 577.5 };
const dark = (g: GameApi) => bandIs(g) === 'bad' || bandIs(g) === 'evil';

// ================================================================ Nell

const nellNodes: Record<string, DNode> = {
  rw1: {
    text: (g) => (dark(g) ? 'Work. I know your name. Half the books in the Counties have it in them. That\'s the only reference I take.' : 'Work. You? You look like somebody who takes library books back on the day.'),
    options: [
      { text: 'I\'ve done worse than you\'d think.', need: { band: ['bad', 'evil'] }, next: 'rwD' },
      { text: 'Try me.', next: 'rw2' },
      { text: 'Forget I asked.' },
    ],
  },
  rwD: { text: 'I don\'t doubt it. Then you\'re one of ours already, near enough. Here\'s a member\'s errand, and a member\'s cut at the end of it.', next: 'rw3' },
  rw2: { text: 'Everybody says that. Here\'s a test, then. It\'s easy. That\'s the test.', next: 'rw3' },
  rw3: {
    text: 'Take this to Silas Crewe, who keeps the harbour watch\'s book, on the quay by the office steps. He\'ll give you something. Bring it here. Don\'t open it. Don\'t lose it. Don\'t be clever.',
    options: [{ text: 'Sealed note, Silas Crewe, back here.', effect: (g) => { g.give('rw_note', 1); g.setStage(PAGE, 'clerk'); } }],
  },
  rwWait: { text: (g) => (at(g, PAGE) === 'clerk' ? 'Silas Crewe. On the quay, by the office steps. He\'s the one who looks like he\'s about to be sick.' : 'Well? Give it here.'), options: [{ text: 'Here it is.', cond: (g) => at(g, PAGE) === 'page', next: 'rwP1' }, { text: 'Not yet.' }] },
  rwP1: { text: 'Kit Pascoe. Eleven. A loaf. His mother will pay six marks to have this page never have existed, and she\'ll pay it gladly, and she\'ll owe me a kindness after. That\'s the trade.', next: 'rwP2' },
  rwP2: {
    text: 'Well? Hand it over.',
    options: [
      { text: 'Here.', moral: { id: 'rwPage:nell', a: -5, tr: { loyalty: 3, compassion: -2 }, rep: { ropewalk: 25, watch: -5 }, npc: { nell_kitto: 20 }, note: 'Brought Nell Kitto a page torn from the harbour watch\'s book, for her to sell back to a boy\'s mother.', spread: 'faction', group: 'ropewalk' }, effect: (g) => { g.take('rw_page', 1); g.setFlag(PAGE, 'nell'); g.setFlag('rw:member', 1); g.addMarks(dark(g) ? 40 : 25); g.setStage(PAGE, 'done'); }, next: 'rwN' },
      { text: '(Put the page in her candle.)', moral: { id: 'rwPage:burn', a: 6, tr: { compassion: 4, courage: 3 }, rep: { ropewalk: -5 }, npc: { nell_kitto: -5 }, note: 'Burned the watch\'s page on a bread-thief in front of Nell Kitto, so nobody would own him.', major: true, fame: 'burned a boy\'s page in the Ropewalk Cellar, under Nell Kitto\'s nose', spread: 'faction', group: 'ropewalk' }, effect: (g) => { g.take('rw_page', 1); g.setFlag(PAGE, 'burn'); g.setStage(PAGE, 'done'); }, next: 'rwB' },
    ],
  },
  rwN: { text: (g) => (dark(g) ? 'There\'s your cut. Welcome to the Cellar, properly. Sit if you\'re staying.' : 'You passed. Not many do; most of them read it. There\'s your cut, and there\'s a stool. You\'re ours now, if you want to be.') },
  rwB: { text: 'Well. That\'s six marks gone up the flue, and a kindness I\'ll never be owed. I ought to throw you out.', next: 'rwB2' },
  rwB2: { text: 'I won\'t. I like a person who knows what they won\'t do. Come back when you\'ve found out what you will.' },
  rwShut: { text: 'You took my page back to the watch. Silas Crewe is looking for other work. Get out of my cellar, and don\'t make me say it twice.' },
};

// ================================================================ Silas Crewe

const silas: DialogueTree = {
  start: (g) => (at(g, PAGE) === 'clerk' && g.count('rw_note') > 0 ? 's1' : at(g, PAGE) === 'page' ? 'sW' : 's0'),
  nodes: {
    s0: { text: 'Silas Crewe, clerk to the harbour watch. If you\'ve a complaint, the office is shut. If you\'ve a confession, it\'s shut harder.' },
    s1: { speaker: 'narrator', text: 'A thin clerk with ink to the wrist. He reads Nell\'s note without unfolding it all the way, goes white, and looks up and down the quay before he tears a page out of the ledger under his arm.', next: 's2' },
    s2: { text: 'Tell her that\'s the last. Tell her I said so. She\'ll laugh. Tell her anyway.', options: [{ text: 'Take the page.', effect: (g) => { g.take('rw_note', 1); g.give('rw_page', 1); g.setStage(PAGE, 'page'); }, next: 's3' }] },
    s3: { text: 'Go on. Don\'t stand here with it.' },
    sW: {
      text: 'You\'ve still got it. Why have you still got it?',
      options: [
        { text: 'Read it to me.', next: 'sR' },
        { text: 'Put it back in your book, Silas. I\'m not carrying it.', moral: { id: 'rwPage:watch', a: 5, tr: { honesty: 4, loyalty: -3 }, rep: { watch: 15, ropewalk: -30, gullmouth: 4 }, npc: { nell_kitto: -40, rw_clerk: 10 }, note: 'Gave the watch\'s page back to its clerk instead of carrying it to Nell Kitto, and the Ropewalk Cellar heard.', major: true, spread: 'faction', group: 'ropewalk' }, effect: (g) => { g.take('rw_page', 1); g.setFlag(PAGE, 'watch'); g.setStage(PAGE, 'done'); }, next: 'sBack' },
        { text: 'Just checking it was the right one.' },
      ],
    },
    sR: { text: 'Kit Pascoe. Eleven. A loaf from the Quarter ovens, Tuesday last. His father\'s at sea. His mother takes in washing. That\'s all a page ever is.' },
    sBack: { text: 'She\'ll know by tonight. She knows everything by tonight. I\'ll lose my place. I don\'t think I mind as much as I ought to.' },
  },
};

// ================================================================ Quest

const quests: Record<string, QuestDef> = {
  [PAGE]: {
    id: PAGE, name: 'A Page Goes Missing', region: 'saltwind', depth: 'quest',
    notes: (g, s) => {
      if (s === 'clerk') return 'Nell Kitto of the Ropewalk Cellar under Gullmouth has given me a sealed note for Silas Crewe, the harbour watch\'s clerk, on the quay by the office steps. I\'m to bring back what he gives me, unopened.';
      if (s === 'page') return 'Silas Crewe tore a page from the harbour watch\'s book for me: Kit Pascoe, eleven, a loaf. Nell will sell it back to the boy\'s mother.';
      const f = g.flag(PAGE);
      return f === 'nell' ? 'I gave Nell the page. I\'m one of the Cellar\'s now, if I want to be.' : f === 'burn' ? 'I burned the page in Nell\'s candle. She says she likes a person who knows what they won\'t do.' : 'I gave the page back to the watch. The Ropewalk Cellar\'s door is shut to me.';
    },
    objectives: (g, s) => (s === 'clerk' ? [{ text: 'Take Nell\'s note to Silas Crewe on the quay', marker: 'rw_clerk' }] : s === 'page' ? [{ text: 'Bring the page to Nell Kitto, or decide otherwise', marker: 'nell_kitto' }] : []),
    marks: (_g, s): Marks => (!s ? { nell_kitto: '!' } : s === 'clerk' ? { rw_clerk: '?' } : s === 'page' ? { nell_kitto: '?' } : {}),
    walk: { cast: ['nell_kitto', 'rw_clerk'] },
  },
};

const NPCS: NpcDef[] = [
  { id: 'rw_clerk', name: 'Silas Crewe', title: 'Clerk to the harbour watch', look: { skin: '#e8c4a0', hair: '#5a4a3a', hairStyle: 1, eyes: '#4a4a3a', tunic: '#2a3044', trim: '#9a9aa0', trousers: '#2a2a30', boots: '#1e1a16', glasses: '#2a2a2a', build: 0.82, age: 0.4 },
    schedule: [{ from: 7, to: 19, at: [SILAS.x, SILAS.z], face: [SILAS.x + 3, SILAS.z], anim: 'idle' }], barks: ['The office is shut.', 'Mind the ledger.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'rw_note', name: 'Nell Kitto\'s note', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#3a2a20' }, desc: 'Folded small and sealed with a thumbprint of black wax. For Silas Crewe, clerk to the harbour watch.' },
  { id: 'rw_page', name: 'A page from the watch\'s book', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8e0c8', b: '#3a2a20' }, desc: '"Kit Pascoe, aged eleven, of Tanner\'s Row. One loaf, from the Quarter ovens. Tuesday. To be brought before the bench." Torn out along the stitching.' },
];

export const GULLMOUTH_ROPEWALK: RegionContent = {
  id: 'gullmouthRopewalk',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { rw_clerk: silas },
  quests,
  hooks: (D) => {
    hook(D, 'nell_kitto', (g) => {
      const s = at(g, PAGE);
      if (g.flag(PAGE) === 'watch') return 'rwShut';
      return s === 'clerk' || s === 'page' ? 'rwWait' : undefined;
    }, nellNodes);
    addOption(D, 'nell_kitto', 'f0', { text: 'Do you take people on?', cond: (g) => !at(g, PAGE), next: 'rw1' });
  },
};

