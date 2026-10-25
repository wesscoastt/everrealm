import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';

// Gullmouth's side stories.
//
// gullNell, NELL'S FATHER (Nell Kitto, the Ropewalk Cellar): Nell writes twice a year to a man on Skua
// Rock and has never had an answer. She asks you to take this one out on the supply boat and put it in
// his hand. It's Amos Kitto, her father; he keeps every letter under his bunk and asks you to tell her
// he's dead. 'rock' -> 'nell' -> done. Choice nellTold = 'dead' (she stops writing) | 'letters' (she
// learns he keeps them all) | 'asked' (she learns what he asked you to say).
//
// gullMargery, THE MARGERY'S BELL (Nessa Crane, harbourmaster): the Margery came ashore on the
// Mewstones with her hold full and nobody aboard; Nessa told the town her crew took to the boat, and
// doesn't believe it. She wants the log from the wreck. The last entry: hailed by the Black Hen,
// Brethren colours, off the Mewstones. 'log' -> 'nessaLog' -> 'hen' (sink the Black Hen, east of the
// Mewstones: she carries the Margery's bell as a trophy) -> 'nessa' -> done. The crew were pressed
// into Brethren oars, and are alive in Saltpenny.

const NELL = 'gullNell', MARGERY = 'gullMargery';
/** The Margery on the Mewstones' east shore (world/sites.ts wreck-margery): her stern cabin. */
const WRECK: [number, number] = [2775.5, 584.5];

const items: ItemDef[] = [
  { id: 'nells_letter', name: 'Nell\'s letter', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0cc', b: '#3a2a20' }, desc: 'Sealed with plain wax, no mark in it. On the outside, in a careful clerk\'s hand: "A. Kitto, B 15, Skua Rock."' },
  { id: 'margery_log', name: 'The Margery\'s log', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#c8a070', b: '#5a3a20' }, desc: 'Swollen with seawater, the last pages stuck together. Captain Moyle\'s hand, then nobody\'s.' },
  { id: 'margery_bell', name: 'The Margery\'s bell', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bar', a: '#c8a050', b: '#7a5a20' }, desc: 'A ship\'s bell, MARGERY GULLMOUTH cut round the lip, hung in the Black Hen\'s waist as a trophy. Somebody had been polishing it.' },
];

const nellNodes: Record<string, DNode> = {
  nl1: {
    text: 'Twice a year I write to a man on Skua Rock. Twenty-two letters. He\'s never written back, and the warden says the post goes in. The supply boat takes visitors with her leave. Would you take this one out yourself, and put it in his hand? I want to know he reads them. That\'s all.',
    options: [{ text: 'I\'ll take it.', effect: (g) => { g.give('nells_letter'); g.setStage(NELL, 'rock'); } }, { text: 'Not now.' }],
  },
  nlWait: { text: 'The supply boat from the quay. B 15. Put it in his hand, not the guard\'s.', options: [{ text: 'I\'m going.' }] },
  nlBack: {
    text: 'Did he read it?',
    options: [
      { text: 'He\'s dead, Nell. Last winter. I\'m sorry.', next: 'nlDead' },
      { text: 'He keeps every one of them under his bunk. Twenty-two.', next: 'nlLetters' },
      { text: 'He read it. He asked me to tell you he was dead.', next: 'nlAsked' },
    ],
  },
  nlDead: {
    text: 'Last winter. And nobody wrote to say. That\'s the Charter for you. Well. That\'s that, then. Here, for the boat. I\'ll stop writing. It was getting to be a habit.',
    options: [{ text: 'Goodbye, Nell.', effect: (g) => { g.addMarks(150); g.setFlag('nellTold', 'dead'); g.setStage(NELL, 'done'); } }],
  },
  nlLetters: {
    text: 'Under his bunk. All of them. And never a word back, the stubborn old devil. He\'s my father. You knew that. Everyone in this cellar knows that, and nobody says it. I take names out of every book in the Counties, and his is in the only one I can\'t touch. Here. I\'ll write again in the spring.',
    options: [{ text: 'He\'d like that.', effect: (g) => { g.addMarks(150); g.setFlag('nellTold', 'letters'); g.setStage(NELL, 'done'); } }],
  },
  nlAsked: {
    text: 'He asked you to say he was dead. That sounds like him. It\'d be better for my trade, he\'d say: nobody trusts a fixer whose father\'s on the Rock. He\'s right, and he\'s still a fool. Here, for the boat. And for telling me the truth when he asked you not to. Nobody does that down here.',
    options: [{ text: 'Goodbye, Nell.', effect: (g) => { g.addMarks(200); g.setFlag('nellTold', 'asked'); g.setStage(NELL, 'done'); } }],
  },
};

const amosNodes: Record<string, DNode> = {
  am1: {
    text: 'A letter, in your hand, from the boat? Nobody brings me letters. The post comes through the warden. Let me see it.',
    options: [{ text: 'It\'s from Nell.', next: 'am2' }],
  },
  am2: {
    text: 'She still signs it Nell. When she was small she couldn\'t get her tongue round Eleanor. She\'s doing well, she says. She would say that. Look under the bunk. Go on, look. Twenty-two. I read every one the night it comes, and then I read them all again.',
    options: [{ text: 'Then write back to her.', next: 'am3' }],
  },
  am3: {
    text: 'And put my name in her post? She clears names for a living. Nobody pays a fixer whose own father is on the Rock for the Charter\'s pay chest. Tell her I\'m dead. Tell her last winter. It\'s better for her trade, and it\'s better for her.',
    options: [{ text: 'I\'ll tell her something.', effect: (g) => { g.take('nells_letter'); g.setStage(NELL, 'nell'); } }],
  },
};

const nessaNodes: Record<string, DNode> = {
  mg1: {
    text: 'The Margery. Six Gullmouth men, Bowden and Moyle and the Pascoe boys among them. She came ashore on the Mewstones with her hold full of salt fish and nobody aboard. I told the town they took to the boat. A harbourmaster says something by noon or the quay says it for her. I don\'t believe it. Her log will be in the stern cabin. Would you fetch it? You\'re not from here. Nobody will ask you why.',
    options: [{ text: 'I\'ll fetch it.', effect: (g) => g.setStage(MARGERY, 'log') }, { text: 'Not now.' }],
  },
  mgWait: { text: 'The Margery, on the Mewstones\' east shore. Her stern cabin. The ferry will take you out.', options: [{ text: 'I\'m going.' }] },
  mgLog: {
    text: 'Moyle\'s hand. "Hailed off the Mewstones by the Black Hen, Brethren colours, at first light. Bowden says we run for it. I say we give them the fish." And then nothing. They didn\'t take to any boat. They were taken. The Hen still works the water east of the Mewstones. I can\'t send a Gullmouth boat after her. You could. Hal Treloar will hire you something with guns.',
    options: [{ text: 'I\'ll find the Black Hen.', effect: (g) => { g.take('margery_log'); g.setStage(MARGERY, 'hen'); } }],
  },
  mgHenWait: { text: 'The Black Hen. East of the Mewstones. Black sails, red stripe. Hal will hire you a ship.', options: [{ text: 'I\'m going.' }] },
  mgBell: {
    text: 'That\'s her bell. Hung up in the Hen\'s waist like a prize, you say. And polished. Somebody aboard the Hen was polishing the Margery\'s bell. Someone who missed her. They\'re alive, then. Pressed into Brethren oars and rowing out of Saltpenny. Six men. Bowden\'s mother still sets a place. Here: the harbour pays its debts. I\'ll hang the bell on the quay where she can hear it.',
    options: [{ text: 'They\'re alive.', effect: (g) => { g.take('margery_bell'); g.addMarks(280); g.setStage(MARGERY, 'done'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [NELL]: {
    id: NELL, name: 'Nell\'s Father', region: 'saltwind', depth: 'quest',
    notes: (g, s) => {
      if (s === 'rock') return 'Nell Kitto, who makes names lose themselves from the towns\' books under the Ropewalk, writes twice a year to a man on Skua Rock and never hears back. She asked me to take her letter out on the supply boat and put it in his hand: B 15.';
      if (s === 'nell') return 'It\'s Amos Kitto, her father. He keeps every letter under his bunk, and he asked me to tell her he\'s dead. Nell is waiting in the Ropewalk Cellar.';
      const t = g.flag('nellTold');
      return t === 'dead' ? 'I told Nell her father died last winter. She says she\'ll stop writing.' : t === 'letters' ? 'I told Nell her father keeps every letter. She\'ll write again in the spring.' : 'I told Nell what her father asked me to say, and that he asked it. She paid me for the truth.';
    },
    objectives: (_g, s) => (s === 'rock' ? [{ text: 'Take Nell\'s letter to B 15 on Skua Rock (the supply boat from Gullmouth)', marker: 'amos_kitto' }] : s === 'nell' ? [{ text: 'Go back to Nell Kitto in the Ropewalk Cellar', marker: 'nell_kitto' }] : []),
    marks: (_g, s): Marks => (s === 'rock' ? { amos_kitto: '?' } : s === 'nell' ? { nell_kitto: '?' } : {}),
    walk: { cast: ['nell_kitto', 'amos_kitto'] },
  },
  [MARGERY]: {
    id: MARGERY, name: 'The Margery\'s Bell', region: 'saltwind', depth: 'quest',
    notes: (_g, s) => {
      if (s === 'log') return 'Nessa Crane told Gullmouth the Margery\'s crew took to the boat. She doesn\'t believe it. She wants the log from the wreck on the Mewstones\' east shore.';
      if (s === 'nessaLog') return 'I have the Margery\'s log. Nessa will want to read it.';
      if (s === 'hen') return 'The Margery was hailed by the Black Hen, a Brethren raider, off the Mewstones. The Hen still works the water east of them: black sails, red stripe.';
      if (s === 'nessa') return 'The Black Hen is on the bottom. Her crew had the Margery\'s bell hung up as a trophy, polished. Nessa should have it.';
      return 'The Margery\'s crew were pressed into Brethren oars. They\'re alive, somewhere out of Saltpenny. Nessa hung the bell on the quay.';
    },
    objectives: (_g, s) => (s === 'log' ? [{ text: 'Search the Margery\'s stern cabin on the Mewstones', marker: 'margeryLog' }]
      : s === 'nessaLog' ? [{ text: 'Bring the log to Nessa Crane, the harbourmaster', marker: 'nessa' }]
      : s === 'hen' ? [{ text: 'Sink the Black Hen, east of the Mewstones', marker: 'navalLane' }]
      : s === 'nessa' ? [{ text: 'Bring the Margery\'s bell to Nessa Crane', marker: 'nessa' }] : []),
    marks: (_g, s): Marks => (s === 'nessaLog' || s === 'nessa' ? { nessa: '?' } : {}),
    walk: { cast: ['nessa'], auto: { hen: 'nessa' } },
  },
};

export const GULLMOUTH_SIDE_CONTENT: RegionContent = {
  id: 'gullmouthSide', items, quests,
  things: [
    {
      id: 'margeryLog', x: WRECK[0], z: WRECK[1], y: 23, label: 'Search the stern cabin', radius: 3,
      when: (g: GameApi) => at(g, MARGERY) === 'log',
      use: (g: GameApi) => { if (!g.give('margery_log')) return; g.setStage(MARGERY, 'nessaLog'); g.toast('Under the captain\'s bunk, in a tin box gone green: the log, swollen with the sea. The last page is in Moyle\'s hand, and it\'s short.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'nell_kitto', (g) => (at(g, NELL) === 'nell' ? 'nlBack' : at(g, NELL) === 'rock' ? 'nlWait' : undefined), nellNodes);
    addOption(D, 'nell_kitto', 'f0', { text: 'You look like you want to ask me something.', next: 'nl1', cond: (g) => !at(g, NELL) });
    hook(D, 'amos_kitto', (g) => (at(g, NELL) === 'rock' && g.count('nells_letter') > 0 ? 'am1' : undefined), amosNodes);
    hook(D, 'nessa', (g) => (at(g, MARGERY) === 'nessaLog' ? 'mgLog' : at(g, MARGERY) === 'nessa' ? 'mgBell' : at(g, MARGERY) === 'log' ? 'mgWait' : at(g, MARGERY) === 'hen' ? 'mgHenWait' : undefined), nessaNodes);
    addOption(D, 'nessa', 'main', { text: 'What happened to the Margery?', next: 'mg1', cond: (g) => !at(g, MARGERY) });
  },
};
