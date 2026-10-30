import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';

// The Scarth Highlands' side stories.
//
// scStipend, THREE QUARTERS LATE (Ilse Blewitt, Scarth Watch): the Charter pays Ilse to count the falling
// stars and tell Ansbury first where the crystal comes down. It hasn't paid her since Candlemas, and Mr
// Pryce has written offering a hundred and twenty marks for the count. She sends you to Clement Fry at
// the Toll Office: her stipend is in his ledger, owed, behind the debt like everything else. He can pay
// one quarter from sundries if somebody who isn't him signs for it. 'clement' -> 'ilse' -> done, or
// 'pryce' -> done. Choice scStipend = 'charter' (one quarter paid; she keeps counting for Ansbury) |
// 'pryce' (she sells the count to Harrowgate) | 'posted' (she pins the count up at Kelderby for anyone).
//
// scOwen, OWEN'S CROOK (Sela Orme, the Glass Kirk): an old man died of cold on the Kirk road in the first
// snow, having walked a long way to put his hand on the star. He gave his name as Owen. His crook has a
// shepherd's mark cut in its head: the Hale mark. He was Bryn Hale's elder brother, gone twenty years
// after a quarrel over which side of the fold wall the gate went. 'kelderby' -> done. Choice scOwen =
// 'told' (Bryn has the crook and the truth) | 'spring' (Tressa keeps it from him till the spring) |
// 'kirk' (the crook goes back to the Kirk: he went to the star and not to them).

const STIPEND = 'scStipend', OWEN = 'scOwen';

const items: ItemDef[] = [
  { id: 'stipend_purse', name: 'A quarter\'s stipend', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#c8a050', b: '#5a4020' }, desc: 'Forty marks in a Toll Office bag, and a slip: "Sundries. Signed for by the bearer."' },
  { id: 'star_count', name: 'Ilse\'s count', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#c8d8f0', b: '#2a3a5a' }, desc: 'Thirty years of falling stars in a small, upright hand: the night, the bearing, where it came down and what it weighed.' },
  { id: 'owens_crook', name: 'A shepherd\'s crook', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'log', a: '#8a6a40', b: '#4a3a24' }, desc: 'Hazel, worn dark where a hand held it for forty years. Cut into the head: an H with a hook through it.' },
];

// ---------------------------------------------------------------- Three Quarters Late
const ilseNodes: Record<string, DNode> = {
  st1: {
    text: 'Three quarters late. Forty marks a quarter, and nothing since Candlemas.',
    options: [{ text: 'Can you manage without it?', next: 'st2' }],
  },
  st2: {
    text: 'Not much longer. Harrowgate\'s buyer wrote to me. Mr Pryce. He\'ll pay a hundred and twenty for the count: every fall, where, and what it weighed.',
    options: [{ text: 'And the Charter?', next: 'st3' }],
  },
  st3: {
    text: 'The Charter pays me to tell Ansbury first. It hasn\'t paid me. A clerk at the Toll Office, Clement Fry, keeps the ledger. Ask him where my money went?',
    options: [{ text: 'I\'ll ask him.', effect: (g) => g.setStage(STIPEND, 'clement') }, { text: 'Not now.' }],
  },
  stWait: { text: 'Clement Fry, at the Toll Office in Ansbury. I can\'t leave the count.', options: [{ text: 'I\'ve got star crystal to sell.', effect: (g) => g.openShop('ilse') }, { text: 'Going.' }] },
  stBack: {
    text: (g) => (g.count('stipend_purse') > 0 ? 'You\'re back. With a bag.' : 'You\'re back. Without a bag.'),
    options: [
      { text: 'The Charter paid a quarter. I signed for it.', next: 'stCharter', cond: (g) => g.count('stipend_purse') > 0 },
      { text: 'Sell the count to Pryce. You\'ve earned it.', next: 'stPryce' },
      { text: 'Pin it up at Kelderby. Let everyone know where the stars fall.', next: 'stPost' },
    ],
  },
  stCharter: {
    text: 'One quarter of three. Well. Someone kept their word, even if it was you and not them. I\'ll keep counting for Ansbury.',
    options: [{ text: 'Good luck with the count.', effect: (g) => { g.take('stipend_purse'); g.addMarks(100); g.setFlag('scStipend', 'charter'); g.setStage(STIPEND, 'done'); } }],
  },
  stPryce: {
    text: 'Thirty years for a hundred and twenty marks. That\'s four marks a year. Take it to him, then, before I think about it.',
    options: [{ text: 'I\'ll take it.', effect: (g) => { g.give('star_count'); g.setFlag('scStipend', 'pryce'); g.setStage(STIPEND, 'pryce'); } }],
  },
  stPost: {
    text: 'Pin it up? Then nobody gets there first, not Ansbury, not Harrowgate. Ha. Let them race. Here: a piece of the last fall.',
    options: [{ text: 'Let them race.', effect: (g) => { g.give('star_crystal'); g.addMarks(50); g.setFlag('scStipend', 'posted'); g.setStage(STIPEND, 'done'); } }],
  },
  stAfter: {
    text: (g) => (g.flag('scStipend') === 'charter' ? 'Still owed two quarters. Still counting for Ansbury.' : g.flag('scStipend') === 'pryce' ? 'Pryce\'s draft came up with the post. Harrowgate had men at the last fall before the dust settled.' : 'There were eleven people at the last fall by morning. One was from Ansbury. One was from Harrowgate. They argued.'),
    options: [{ text: 'Good night, Ilse.' }],
  },
};

const clementNodes: Record<string, DNode> = {
  stC1: {
    text: 'Ilse Blewitt. Here she is in my ledger. Owed, every quarter since Candlemas.',
    options: [{ text: 'Then why isn\'t she paid?', next: 'stC2' }],
  },
  stC2: {
    text: 'Every toll goes to the debt first. The Light Fund waits, the Weighhouse waits, and your astronomer waits behind them.',
    options: [{ text: 'Is there nothing you can do?', next: 'stC3' }],
  },
  stC3: {
    text: 'I can pay one quarter from sundries. If somebody signs for it who isn\'t me.',
    options: [{ text: 'I\'ll sign.', next: 'stC4' }, { text: 'Never mind. She has a better offer.', effect: (g) => g.setStage(STIPEND, 'ilse') }],
  },
  stC4: {
    text: 'There. "Sundries, signed for by the bearer." Mr Pike will see it at the quarter. He won\'t say anything. That\'s the worst of him.',
    options: [{ text: 'Thank you, Clement.', effect: (g) => { g.give('stipend_purse'); g.setStage(STIPEND, 'ilse'); } }],
  },
};

const pryceNodes: Record<string, DNode> = {
  stP1: {
    text: 'Miss Blewitt\'s count. Thirty years of it. Do you know what this is worth?',
    options: [{ text: 'A hundred and twenty marks. You said so.', next: 'stP2' }],
  },
  stP2: {
    text: 'I said so. The draft goes up with the post. And something for the walk: I\'m always fair to the carrier.',
    options: [{ text: 'Goodbye, Mr Pryce.', effect: (g) => { g.take('star_count'); g.addMarks(80); g.setStage(STIPEND, 'done'); } }],
  },
};

// ---------------------------------------------------------------- Owen's Crook
const selaNodes: Record<string, DNode> = {
  ow1: {
    text: 'A man died on the Kirk road in the first snow. Old. He\'d walked a long way to put his hand on the star.',
    options: [{ text: 'Who was he?', next: 'ow2' }, { text: 'I\'m sorry.' }],
  },
  ow2: {
    text: 'He gave his name, and I wrote it in the book: Owen. Nothing else. He had this crook, with a mark cut in the head.',
    options: [{ text: 'A shepherd\'s mark.', next: 'ow3' }],
  },
  ow3: {
    text: 'Someone on the plateau will know whose. I\'d like his people told. Somebody should be.',
    options: [{ text: 'I\'ll take it to Kelderby.', effect: (g) => { g.give('owens_crook'); g.setStage(OWEN, 'kelderby'); } }, { text: 'Not now.' }],
  },
  owWait: { text: 'Kelderby, on the plateau. Somebody there knows that mark.', options: [{ text: 'Going.' }] },
};

const wennaNodes: Record<string, DNode> = {
  we1: {
    text: 'That\'s the Hale mark. The H with the hook through it. Where did you get this?',
    options: [{ text: 'An old man died on the Kirk road. He gave his name as Owen.', next: 'we2' }],
  },
  we2: {
    text: 'Owen. Bryn\'s brother. Twenty years, and not a word.',
    options: [{ text: 'What happened between them?', next: 'we3' }],
  },
  we3: {
    text: 'They fell out over the fold wall. Which side the gate went. Owen walked off with his crook and never came back over the ridge.',
    options: [{ text: 'Does Bryn need to know?', next: 'we4' }],
  },
  we4: {
    text: 'You tell me. You brought it.',
    options: [
      { text: 'Give Bryn the crook, and the truth.', next: 'weTold' },
      { text: 'Keep it from him till spring. He\'s enough this winter.', next: 'weSpring' },
      { text: 'Give it back to the Kirk. He went to the star, not to you.', next: 'weKirk' },
    ],
  },
  weTold: {
    text: 'He\'ll take it hard. He\'d take it harder later, from somebody else. I\'ll give it him tonight. Here, for the walk up.',
    options: [{ text: 'I\'m sorry, Tressa.', effect: (g) => { g.take('owens_crook'); g.addMarks(80); g.give('cooked_char', 2); g.setFlag('scOwen', 'told'); g.setStage(OWEN, 'done'); } }],
  },
  weSpring: {
    text: 'Till the spring. I\'ll put it up in the loft with the fleeces. He never goes up there. Here, for the walk up.',
    options: [{ text: 'Spring, then.', effect: (g) => { g.take('owens_crook'); g.addMarks(80); g.setFlag('scOwen', 'spring'); g.setStage(OWEN, 'done'); } }],
  },
  weKirk: {
    text: 'He walked past our door to get to it. Twenty years, and he went to a stone. Take it back to her. Let him keep it.',
    options: [{ text: 'I will.', effect: (g) => { g.setFlag('scOwen', 'kirk'); g.setStage(OWEN, 'kirk'); } }],
  },
};

const selaBackNodes: Record<string, DNode> = {
  owBack: {
    text: 'You\'ve brought it back. They knew him, then, and didn\'t want it.',
    options: [{ text: 'His brother\'s wife says he went to the star, not to them.', next: 'owBack2' }],
  },
  owBack2: {
    text: 'Then it stays with the star. I\'ll stand it by the crystal, under his name. People will ask. I\'ll tell them he walked a long way.',
    options: [{ text: 'Thank you, Sela.', effect: (g) => { g.take('owens_crook'); g.addMarks(80); g.setStage(OWEN, 'done'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [STIPEND]: {
    id: STIPEND, name: 'Three Quarters Late', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'clement') return 'The Charter pays Ilse Blewitt to count falling stars and tell Ansbury first where the crystal lands, and hasn\'t paid her since Candlemas. Mr Pryce has offered a hundred and twenty marks for the count. She asked me to find out from Clement Fry, at the Toll Office, where her money went.';
      if (s === 'ilse') return g.count('stipend_purse') > 0 ? 'Clement Fry paid one quarter from sundries, and I signed for it. Ilse should have it.' : 'Every toll goes to the Charter\'s debt first, and Ilse waits behind the Light Fund and the Weighhouse. She should hear it.';
      if (s === 'pryce') return 'Ilse is selling her count to Harrowgate. Mr Pryce is at Harrowgate Works.';
      const c = g.flag('scStipend');
      return c === 'charter' ? 'Ilse had one quarter of the three. She keeps counting for Ansbury.' : c === 'pryce' ? 'Ilse sold thirty years of falling stars to Harrowgate for a hundred and twenty marks.' : 'Ilse pinned her count up at Kelderby. Nobody gets to the crystal first now.';
    },
    objectives: (_g, s) => (s === 'clement' ? [{ text: 'Ask Clement Fry at the Toll Office in Ansbury', marker: 'clement' }]
      : s === 'ilse' ? [{ text: 'Go back to Ilse Blewitt at Scarth Watch', marker: 'ilse' }]
      : s === 'pryce' ? [{ text: 'Take Ilse\'s count to Mr Pryce at Harrowgate Works', marker: 'pryce' }] : []),
    marks: (_g, s): Marks => (s === 'clement' ? { clement: '?' } : s === 'ilse' ? { ilse: '?' } : s === 'pryce' ? { pryce: '?' } : {}),
    walk: { cast: ['ilse', 'clement', 'pryce'] },
  },
  [OWEN]: {
    id: OWEN, name: 'Owen\'s Crook', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'kelderby') return 'An old man who gave his name as Owen died of cold on the Kirk road. Sela Orme wants his people told. His crook has a shepherd\'s mark: someone at Kelderby will know it.';
      if (s === 'kirk') return 'Owen was Bryn Hale\'s brother, gone twenty years. Tressa wants his crook to go back to the Kirk.';
      const c = g.flag('scOwen');
      return c === 'told' ? 'Tressa gave Bryn his brother\'s crook, and the truth.' : c === 'spring' ? 'Tressa put Owen\'s crook in the loft with the fleeces, till the spring.' : 'Owen\'s crook stands by the crystal at the Glass Kirk, under his name in Sela\'s book.';
    },
    objectives: (_g, s) => (s === 'kelderby' ? [{ text: 'Find who knows the mark on the crook, at Kelderby', marker: 'wenna' }]
      : s === 'kirk' ? [{ text: 'Take the crook back to Sela Orme at the Glass Kirk', marker: 'sela' }] : []),
    marks: (_g, s): Marks => (s === 'kelderby' ? { wenna: '?' } : s === 'kirk' ? { sela: '?' } : {}),
    walk: { cast: ['sela', 'wenna'] },
  },
};

/** Sela's tree opens on her story's business when there is any; the crook only when she'd otherwise just sweep. */
function hookSela(D: Record<string, DialogueTree>): void {
  const t = D.sela, base = t.start;
  t.start = (g: GameApi) => {
    const b = base(g);
    if (at(g, OWEN) === 'kirk' && g.count('owens_crook') > 0) return 'owBack';
    if (b !== 'main' && b !== 'after') return b;
    if (!at(g, OWEN)) return 'ow1';
    if (at(g, OWEN) === 'kelderby') return 'owWait';
    return b;
  };
  Object.assign(t.nodes, selaNodes, selaBackNodes);
}

export const SCARTH_SIDE_CONTENT: RegionContent = {
  id: 'scarthSide', items, quests,
  hooks: (D) => {
    hook(D, 'ilse', (g) => (at(g, STIPEND) === 'ilse' ? 'stBack' : at(g, STIPEND) === 'clement' || at(g, STIPEND) === 'pryce' ? 'stWait' : undefined), ilseNodes);
    addOption(D, 'ilse', 'main', { text: 'You said the Charter pays you eventually.', next: 'st1', cond: (g) => !at(g, STIPEND) });
    addOption(D, 'ilse', 'main', { text: 'How\'s the count?', next: 'stAfter', cond: (g) => at(g, STIPEND) === 'done' });
    hook(D, 'clement', (g) => (at(g, STIPEND) === 'clement' ? 'stC1' : undefined), clementNodes);
    hook(D, 'pryce', (g) => (at(g, STIPEND) === 'pryce' && g.count('star_count') > 0 ? 'stP1' : undefined), pryceNodes);
    hookSela(D);
    hook(D, 'wenna', (g) => (at(g, OWEN) === 'kelderby' && g.count('owens_crook') > 0 ? 'we1' : undefined), wennaNodes);
  },
};
