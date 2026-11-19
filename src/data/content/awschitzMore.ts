import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';

// Awschitz's own work (OWED 97x stage 4, docs/VERANDAH.md): the sea's fort, its stores and its cutter.
//
// awKegs, TWO KEGS SHORT (Sergeant Annie Tonkin, the quartermaster): the month's stores came round by water in Wenna
// Chegwidden's boat, because the road floods, and the docket says six kegs of powder where four came up to the fort.
// Wenna swears six went ashore at the jetty; the jetty count is four and two empty chocks. Lieutenant Ennor at the
// King's Dock signed for nothing, but Gunner Pellow on the T-head took two for his gun drill and never wrote them down.
// Have Pellow sign for them and say no more, report him to Tonkin, or ([Bad or Evil]) sell a keg to the den on the way
// back and let the docket stay short. awKegs = 'signed' | 'reported' | 'sold'.
//
// awHours, THE CUTTER'S HOURS (Lieutenant Hal Ennor): every evening a fishing boat lies off the Head when the Vigilant
// goes out, and never fishes. Watch from the T-head; Wenna knows the boat (the Brave Annie, a Vyvyan boat on lease);
// Grace Vyvyan on Verandah pier leased her for a year, paid in advance, to a man who talked like Ansbury. Tell Ennor
// all of it, or keep Grace's name out of it as she asks. awHours = 'all' | 'spared'. (The man is Ambrose Garland's.)

const KEGS = 'awKegs', HOURS = 'awHours';
const JETTY = { x: -3334.5, z: 1960.5 };
const THEAD = { x: -3441.5, z: 1849.5 };

// ================================================================ Two Kegs Short

const tonkinNodes: Record<string, DNode> = {
  t1: { text: 'The month\'s stores came round by water this morning, in Wenna\'s boat, because the road floods at the ford and the carters won\'t risk it. Biscuit, salt beef, boots, the lot. And powder: the docket says six kegs.', next: 't2' },
  t2: {
    text: 'Four came up to the store. Powder doesn\'t walk, and if it does walk, I want to know who it walked with before the captain asks me. Start with Wenna on the jetty. Take the docket.',
    options: [{ text: 'I\'ll find your kegs.', effect: (g) => { g.give('aw_docket', 1); g.setStage(KEGS, 'wenna'); } }, { text: 'Not now, Sergeant.' }],
  },
  tb1: {
    text: (g) => {
      const f = g.flag(KEGS);
      if (f === 'signed') return 'Pellow\'s name on the docket, two kegs, for gun drill, dated today. That balances. Whether it balanced this morning is between you, him, and the powder.';
      if (f === 'reported') return 'Pellow. Of course it was Pellow. He\'ll lose a month\'s grog and he\'ll sign for every pinch of powder he touches till Midsummer. Thank you.';
      return 'Still two short. Wenna says six, the jetty says four, and you say nobody knows. I\'ll write it as lost in the landing. Powder gets damp. It happens.';
    },
    options: [{ text: 'Good day, Sergeant.', effect: (g) => { g.take('aw_docket', 1); g.addMarks(60); g.setStage(KEGS, 'done'); } }],
  },
};

const wennaNodes: Record<string, DNode> = {
  w1: { text: 'Six. I loaded six at the town quay with my own hands and I unloaded six onto this jetty with my own back, and I\'ll say so to the captain\'s face. Count what\'s on the jetty if you don\'t believe me.', options: [{ text: 'I\'ll count them.', effect: (g) => g.setStage(KEGS, 'jetty') }] },
  w2: { text: 'Two empty chocks? Then somebody came down the jetty between me tying up and Annie\'s cart. Gunner Pellow was down here with a barrow, now I think of it. He waved.' },
  hw1: { text: 'That one. The Brave Annie. A Vyvyan boat, blue strake, the patched mizzen. I know every boat on this coast by her patches.', next: 'hw2' },
  hw2: { text: 'Grace Vyvyan leases her boats out to whoever pays. The Annie used to go out with the Pascoe brothers, but they\'ve not had her since spring. Ask Grace who has her now. She counts everything, so she\'ll know.', options: [{ text: 'I\'ll ask Grace.', effect: (g) => g.setStage(HOURS, 'grace') }] },
};

const ennorKegNodes: Record<string, DNode> = {
  e1: { text: 'Powder for the fort? Not through my store. Everything that comes into the King\'s Dock is written in my book, and nothing came in today but rope. If it went missing between the jetty and the fort, it went missing on the fort\'s side of the wall.', next: 'e2' },
  e2: { text: 'Pellow, though. He\'s had the guns on the T-head firing drill all afternoon, and I don\'t remember signing him out any powder for it.', options: [{ text: 'I\'ll ask Pellow.', effect: (g) => g.setStage(KEGS, 'pellow') }] },
};

const pellowNodes: Record<string, DNode> = {
  p1: { speaker: 'narrator', text: 'Gunner Pellow looks up from the gun with a rammer in his hands and two kegs of the fort\'s powder at his feet, their tops broached, the fort\'s mark on their sides as plain as paint.', next: 'p2' },
  p2: { text: 'Ah. Yes. Those. The lieutenant wants the guns drilled and won\'t sign me powder till the end of the month, and Annie won\'t give me any without a chit from the lieutenant, and the guns don\'t drill on nothing. I was going to tell her.', next: 'p3' },
  p3: {
    text: 'Look. If you tell Annie, I lose a month\'s grog and the lads lose a gunner who knows what he\'s doing. If you give me that docket, I\'ll sign for them now, proper, and nobody\'s short. What do you say?',
    options: [
      { text: 'Sign for them, then. Proper.', moral: { id: 'awKegs:signed', tr: { compassion: 1, loyalty: 1 }, npc: { aw_gunner: 15 } }, effect: (g) => { g.setFlag(KEGS, 'signed'); g.setStage(KEGS, 'back'); }, next: 'pS' },
      { text: 'Annie will hear it from me. You can tell her the rest.', moral: { id: 'awKegs:reported', tr: { honesty: 2 }, rep: { verandah: 2 }, npc: { aw_gunner: -15, aw_quarter: 10 } }, effect: (g) => { g.setFlag(KEGS, 'reported'); g.setStage(KEGS, 'back'); }, next: 'pR' },
      { text: 'Keep your two. I\'ll take one of these off your hands as well, and the docket can stay short.', need: { band: ['bad', 'evil'] },
        moral: { id: 'awKegs:sold', a: -6, tr: { greed: 3, deception: 3 }, rep: { verandah: -4 }, npc: { aw_gunner: -5 }, note: 'Stole a keg of the king\'s powder from Awschitz and sold it on.' },
        effect: (g) => { g.addMarks(45); g.setFlag(KEGS, 'sold'); g.setStage(KEGS, 'back'); }, next: 'pB' },
    ],
  },
  pS: { speaker: 'narrator', text: 'He signs the docket against the gun carriage with a stub of pencil, in letters a child would be ashamed of. "Pellow. Two kegs. Drill." He hands it back, and salutes you, very nearly.' },
  pR: { text: 'Fair. Fair. I\'d have done the same. No, I wouldn\'t. Tell her I\'m sorry, and tell her the guns were drilled lovely.' },
  pB: { speaker: 'narrator', text: 'Pellow looks at you for a long moment, then rolls the third keg out from under the tarpaulin with his foot. "I never saw you," he says. Jory Kettle at the Fortress pays forty-five marks for it and doesn\'t ask whose it was.' },
};

// ================================================================ The Cutter's Hours

const ennorHourNodes: Record<string, DNode> = {
  h1: { text: 'Every evening when the Vigilant goes out on the tide, there\'s a fishing boat lying off the Head. Same boat. She never fishes. She just lies there with her sail down, and when the Vigilant\'s round the point, she goes in.', next: 'h2' },
  h2: { text: 'Go out to the end of the T-head about dusk and look at her. If you know boats, tell me whose she is. If you don\'t, Wenna on the fort jetty knows every boat on this coast by her patches.', options: [{ text: 'I\'ll take a look.', effect: (g) => g.setStage(HOURS, 'watch') }, { text: 'Not now, Lieutenant.' }] },
  hb1: {
    text: 'Well? Whose is she?',
    options: [
      { text: 'A Vyvyan boat, the Brave Annie, leased for a year in advance to a man who talks like Ansbury.', moral: { id: 'awHours:all', tr: { honesty: 2 }, rep: { verandah: 2 }, npc: { aw_ennor: 10, vh_grace: -10 } }, effect: (g) => { g.setFlag(HOURS, 'all'); g.addMarks(70); g.setStage(HOURS, 'done'); }, next: 'hbA' },
      { text: 'Leased out of the town to a man who talks like Ansbury. The owner didn\'t know what he wanted her for.', moral: { id: 'awHours:spared', tr: { loyalty: 2 }, npc: { aw_ennor: 5, vh_grace: 15 } }, effect: (g) => { g.setFlag(HOURS, 'spared'); g.addMarks(70); g.setStage(HOURS, 'done'); }, next: 'hbS' },
    ],
  },
  hbA: { text: 'Vyvyan. The old woman will have the hide off me if I go aboard one of her boats without a warrant. An Ansbury man, paying a year in advance to watch my cutter. I\'ll tell the captain. She\'ll say Black Gulls. I\'m beginning to think it isn\'t. Here.' },
  hbS: { text: 'An Ansbury man, paying good money to sit off my Head and watch my cutter go out. That\'s not wreckers. Wreckers don\'t pay in advance. I\'ll tell the captain. Here, for your eyes.' },
  hAfter: { text: 'She\'s not been back since. Either he\'s got what he wanted, or he\'s found somewhere else to watch from. I don\'t like either.' },
};

const graceNodes: Record<string, DNode> = {
  ga1: { text: 'The Brave Annie. Leased in April for a year, paid in advance in Charter silver, to a Mr Dunn, who said he wanted her for the mackerel. He talked like Ansbury and had hands like a clerk. I thought he was a fool with money. I liked his money.', next: 'ga2' },
  ga2: { text: 'Who\'s asking? The lieutenant at Awschitz. Well. I\'d be grateful if he didn\'t hear the Annie was a Vyvyan boat. I sit on the Harbour Board, and the Board will make a great deal of that, and none of it will be useful. You\'ll tell him what you think right.', options: [{ text: 'I\'ll tell him.', effect: (g) => g.setStage(HOURS, 'ennor') }] },
};

const quests: Record<string, QuestDef> = {
  [KEGS]: {
    id: KEGS, name: 'Two Kegs Short', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'wenna') return 'Six kegs of powder on the docket, four in Awschitz\'s store. Sergeant Tonkin wants them found. Wenna Chegwidden brought the stores round by boat.';
      if (s === 'jetty') return 'Wenna swears six kegs went ashore. Count the jetty.';
      if (s === 'ennor') return 'Two empty chocks on the jetty, and Gunner Pellow was seen with a barrow. Ask Lieutenant Ennor at the King\'s Dock whether he signed powder out.';
      if (s === 'pellow') return 'Ennor signed out no powder, but Gunner Pellow has been drilling the guns on the T-head all afternoon.';
      if (s === 'back') return 'Back to Sergeant Tonkin with the docket.';
      const f = g.flag(KEGS);
      return f === 'signed' ? 'Pellow signed for the kegs.' : f === 'reported' ? 'Pellow was reported.' : 'I sold a keg of the king\'s powder.';
    },
    objectives: (g, s) => (s === 'wenna' ? [{ text: 'Ask Wenna Chegwidden on the fort jetty', marker: 'aw_quay' }]
      : s === 'jetty' ? [{ text: 'Count the kegs on the jetty', marker: 'awJetty' }]
      : s === 'ennor' ? [{ text: 'Ask Lieutenant Ennor at the King\'s Dock', marker: 'aw_ennor' }]
      : s === 'pellow' ? [{ text: 'Find Gunner Pellow on the T-head', marker: 'aw_gunner' }]
      : s === 'back' ? [{ text: 'Bring the docket to Sergeant Tonkin', marker: 'aw_quarter' }] : []),
    marks: (_g, s): Marks => (!s ? { aw_quarter: '!' } : s === 'wenna' ? { aw_quay: '?' } : s === 'ennor' ? { aw_ennor: '?' } : s === 'pellow' ? { aw_gunner: '?' } : s === 'back' ? { aw_quarter: '?' } : {}),
    walk: { cast: ['aw_quarter', 'aw_quay', 'aw_ennor', 'aw_gunner'] },
  },
  [HOURS]: {
    id: HOURS, name: 'The Cutter\'s Hours', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'watch') return 'A fishing boat lies off Awschitz Head every evening when the Vigilant goes out, and never fishes. Lieutenant Ennor wants to know whose she is. Look from the end of the T-head.';
      if (s === 'wenna') return 'Wenna Chegwidden on the fort jetty knows every boat on the coast by her patches.';
      if (s === 'grace') return 'The Brave Annie, a Vyvyan boat on lease. Grace Vyvyan, on Verandah pier, will know who has her.';
      if (s === 'ennor') return 'Leased for a year in advance to a man who talks like Ansbury. Back to Lieutenant Ennor.';
      return g.flag(HOURS) === 'all' ? 'Ennor knows the Annie is a Vyvyan boat, leased to an Ansbury man.' : 'Ennor knows about the Ansbury man. I kept Grace Vyvyan\'s name out of it.';
    },
    objectives: (_g, s) => (s === 'watch' ? [{ text: 'Look at the boat from the end of the T-head', marker: 'awThead' }]
      : s === 'wenna' ? [{ text: 'Ask Wenna Chegwidden whose boat she is', marker: 'aw_quay' }]
      : s === 'grace' ? [{ text: 'Ask Grace Vyvyan on Verandah pier', marker: 'vh_grace' }]
      : s === 'ennor' ? [{ text: 'Tell Lieutenant Ennor', marker: 'aw_ennor' }] : []),
    marks: (g, s): Marks => (!s && at(g, KEGS) === 'done' ? { aw_ennor: '!' } : s === 'wenna' ? { aw_quay: '?' } : s === 'grace' ? { vh_grace: '?' } : s === 'ennor' ? { aw_ennor: '?' } : {}),
    walk: { cast: ['aw_ennor', 'aw_quay', 'vh_grace'], from: { quests: { awKegs: 'done' }, flags: { awKegs: 'signed' } } },
  },
};

const things: WorldThing[] = [
  {
    id: 'awJetty', x: JETTY.x, z: JETTY.z, y: 16, label: 'Count the kegs', radius: 2.4, look: 'none',
    when: (g) => at(g, KEGS) === 'jetty',
    use: (g) => { g.setStage(KEGS, 'ennor'); g.toast('Four kegs of powder with the fort\'s mark on them, chocked on the jetty under a tarpaulin, and beside them two empty chocks with the marks of barrow wheels in the wet planks between, going north toward the King\'s Dock.'); },
  },
  {
    id: 'awThead', x: THEAD.x, z: THEAD.z, y: 16, label: 'Look at the boat', radius: 2.6, look: 'none',
    when: (g) => at(g, HOURS) === 'watch',
    use: (g) => { g.setStage(HOURS, 'wenna'); g.toast('Off the Head, a small fishing boat lies with her sail down and her nets dry on the thwart: a blue strake along her side and a mizzen patched with a square of brown canvas. As the Vigilant clears the point, a man in her stern lifts a glass, watches her go, and writes something down.'); },
  },
];

const ITEMS: ItemDef[] = [
  { id: 'aw_docket', name: 'Stores docket', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0d0', b: '#22365a' }, desc: 'Awschitz\'s monthly stores, by Wenna Chegwidden\'s boat: biscuit, beef, boots, blankets, and six kegs of powder.' },
];

export const AWSCHITZ_MORE: RegionContent = {
  id: 'awschitzMore',
  items: ITEMS,
  things,
  quests,
  hooks: (D) => {
    // the fort's people had no trees of their own but the captain: these give Tonkin, Wenna, Ennor and Pellow theirs
    const plain = (id: string, text: string) => { if (!D[id]) D[id] = { start: () => 'hello', nodes: { hello: { text, options: [{ text: 'Good day.' }] } } }; };
    plain('aw_quarter', 'Sign for it, or it walks. What do you need?');
    plain('aw_quay', 'Mind the gap between the boards.');
    plain('aw_ennor', 'Nothing comes alongside without my say. What is it?');
    plain('aw_gunner', 'Swab, load, ram. Stand clear of the muzzle.');
    hook(D, 'aw_quarter', (g) => (at(g, KEGS) === 'back' ? 'tb1' : undefined), tonkinNodes);
    addOption(D, 'aw_quarter', 'hello', { text: 'You look like you\'re missing something, Sergeant.', cond: (g) => !at(g, KEGS), next: 't1' });
    hook(D, 'aw_quay', (g) => (at(g, KEGS) === 'wenna' ? 'w1' : undefined), wennaNodes);
    addOption(D, 'aw_quay', 'hello', { text: 'About the kegs. Gunner Pellow, you said?', cond: (g) => at(g, KEGS) === 'ennor' || at(g, KEGS) === 'pellow', next: 'w2' });
    addOption(D, 'aw_quay', 'hello', { text: 'A boat off the Head every evening: blue strake, patched mizzen.', cond: (g) => at(g, HOURS) === 'wenna', next: 'hw1' });
    hook(D, 'aw_ennor', (g) => (at(g, KEGS) === 'ennor' ? 'e1' : at(g, HOURS) === 'ennor' ? 'hb1' : undefined), { ...ennorKegNodes, ...ennorHourNodes });
    addOption(D, 'aw_ennor', 'hello', { text: 'Anything I can do on the dock, Lieutenant?', cond: (g) => at(g, KEGS) === 'done' && !at(g, HOURS), next: 'h1' });
    addOption(D, 'aw_ennor', 'hello', { text: 'Has the boat been back?', cond: (g) => at(g, HOURS) === 'done', next: 'hAfter' });
    hook(D, 'aw_gunner', (g) => (at(g, KEGS) === 'pellow' ? 'p1' : undefined), pellowNodes);
    hook(D, 'vh_grace', () => undefined, graceNodes);
    addOption(D, 'vh_grace', 'hello', { text: 'The Brave Annie. Who has her?', cond: (g) => at(g, HOURS) === 'grace', next: 'ga1' });
  },
};
