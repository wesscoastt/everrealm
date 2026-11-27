import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';
import { SALT_FLOOR, SALT_HULLS, SALT_PIERS, SALTPENNY } from '../../world/morrow';

// Two lighter side stories on Saltpenny Key (owner 2026-11-26: "start fleshing out continent 2"; the Key had three).
//
// spCat, THE ADMIRAL (Captain Bess Merrin of the Fair Exchange, on the north pier): the Admiral is the Fair Exchange's
// cat, black with a white bib, and the luckiest thing in the Keys: no ship she's aboard has ever been taken. She's been
// gone three days, and two other captains are already saying she's come aboard theirs. Follow her across the Key: fish
// heads on the Mercy's steps, small wet prints along the Captains' Table, and in the hold of Low Tide, behind Gil
// Fenner's crates, the Admiral with four kittens. Then: they all go back aboard the Fair Exchange ('bess'); one to each
// ship of the Table, so the luck is shared and the quarrel ends ('table'); or one comes home with you ('mine').
// spCat = 'bess' | 'table' | 'mine'.
//
// spVerse, A VERSE FOR THE MAST (Cobb Lark, the fiddler at the Leaning Mast): every Captains' Night the Mast sings the
// Saltpenny Song, and every year it has a new verse, and every captain wants to be in it. Cobb needs three boasts by
// tonight: from Bess Merrin, Ida Pell the bosun of the Long Meg, and Jory Quick of the Swallow. None of the three is
// true. Then: the verse ends on Bess's boast ('bess'), Ida's ('ida'), Jory's ('jory'), or on what really happened, which
// is funnier ('truth'). spVerse = 'bess' | 'ida' | 'jory' | 'truth'.

const CAT = 'spCat', VERSE = 'spVerse';
const F = SALT_FLOOR, H = SALT_HULLS, SX = SALTPENNY.x;
const zc = (h: { z: number }) => h.z + 0.5;
const BESS = { x: SX - 128.5, z: SALT_PIERS[0] + 0.5 };
const IDA = { x: SX - 120.5, z: SALT_PIERS[2] + 0.5 };
const JORY = { x: SX - 116.5, z: SALT_PIERS[1] + 0.5 };
const COBB = { x: H.mast.x + 8.5, z: zc(H.mast) + 2.5 };
const TRAIL: [number, number, string][] = [[H.mercy.x + 14.5, zc(H.mercy) + 9.5, 'bones'], [H.table.x + 12.5, zc(H.table) - 7.5, 'tracks']];
const LITTER = { x: H.lowtide.x + 6.5, z: zc(H.lowtide) - 2.4 };

const followed = (g: GameApi) => TRAIL.filter((_, i) => g.flag('spTrail' + i)).length;
const boasts = (g: GameApi) => ['spBoastBess', 'spBoastIda', 'spBoastJory'].filter((f) => g.flag(f)).length;

// ================================================================ The Admiral, and Bess's boast

const bess: DialogueTree = {
  start: (g) => {
    const c = at(g, CAT);
    if (!c) return 'c1';
    if (c === 'bess') return 'b1';
    if (at(g, VERSE) === 'boasts' && !g.flag('spBoastBess')) return 'v1';
    if (c === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    c1: { speaker: 'narrator', text: 'A weathered woman in a sea coat too good for her, standing at the end of the north pier with a saucer of milk in one hand, looking up and down the Key as if she could out-stare it.', next: 'c2' },
    c2: { text: 'Bess Merrin, the Fair Exchange. Have you seen a cat? Black. White bib. Answers to the Admiral, when she feels like it, which is never.', next: 'c3' },
    c3: { text: 'Twenty years and no ship she\'s been aboard has ever been taken. Not one. She\'s been gone three days, and Rook of the Heron and Fitch of the Bonny are both telling the Table she\'s come aboard theirs.', next: 'c4' },
    c4: {
      text: 'She hasn\'t. They\'re lying. I\'d know. Find her, and I\'ll pour you the good rum, the stuff I don\'t pour.',
      options: [{ text: 'I\'ll find the Admiral.', effect: (g) => g.setStage(CAT, 'trail') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, CAT) === 'trail' ? 'She likes fish heads and warm places and being a nuisance. Try the Mercy. Try anywhere.' : 'Low Tide? Gil Fenner\'s hold? What\'s she doing in a fence\'s hold?') },
    b1: { text: 'You found her? In Low Tide? Kittens? Four? The Admiral? She\'s twenty if she\'s a day. Well. Well!', next: 'b2' },
    b2: {
      text: 'Four little luck-pieces. Every captain at the Table will want one, and every one of them will lie to get it. What do I do with them?',
      options: [
        { text: 'They\'re hers, and hers are yours. All aboard the Fair Exchange.', moral: { id: 'spCat:bess', tr: { loyalty: 2 }, npc: { sp_bess: 15 } }, effect: (g) => { g.setFlag(CAT, 'bess'); g.addMarks(60); g.setStage(CAT, 'done'); }, next: 'bB' },
        { text: 'One to each ship of the Table, the Heron and the Bonny included. Then nobody has the luck, and everybody does.', moral: { id: 'spCat:table', a: 3, tr: { generosity: 2 }, rep: { brethren: 4 }, npc: { sp_bess: 5, ned_vey: 5 }, note: 'Shared the Admiral\'s kittens among the ships of the Captains\' Table at Saltpenny.', fame: 'shared out the Admiral\'s luck at Saltpenny', spread: 'local' }, effect: (g) => { g.setFlag(CAT, 'table'); g.addMarks(70); g.setStage(CAT, 'done'); }, next: 'bT' },
        { text: 'Could I have one? Just the small one with the white foot.', moral: { id: 'spCat:mine', npc: { sp_bess: 10 } }, effect: (g) => { g.setFlag(CAT, 'mine'); g.give('pet_salt_kitten', 1); g.addMarks(40); g.setStage(CAT, 'done'); }, next: 'bM' },
      ],
    },
    bB: { text: 'All aboard. The Fair Exchange will be the luckiest ship in the Keys and the hairiest. Here: the good rum. Don\'t tell anyone I pour it.' },
    bT: { text: 'One each. Rook will weep. Fitch will say it was his idea. Ned Vey will make a speech. Fine. A quiet Table for once. You\'re wasted on land.' },
    bM: { text: 'The white foot. She\'s the boldest; she bit Gil Fenner, I hear. Take her. If you\'re ever boarded, I want to hear she was aboard.' },
    v1: { text: 'A boast for Cobb\'s verse? Easy. Put that Bess Merrin of the Fair Exchange once sailed through a revenue cutter\'s whole squadron in fog, by the sound of their bells.', next: 'v2' },
    v2: { text: 'It was one cutter. And it was the cutter\'s dinner bell. Don\'t put that.', effect: (g) => g.setFlag('spBoastBess', 1) },
    after: { text: (g) => (g.flag(CAT) === 'mine' ? 'How\'s the white foot? Bitten anyone important yet?' : 'The Admiral\'s on the quarterdeck in the sun. Thinks she\'s earned it.') },
  },
};

// ================================================================ A Verse for the Mast

const cobb: DialogueTree = {
  start: (g) => {
    const s = at(g, VERSE);
    if (!s) return 'f1';
    if (s === 'boasts' && boasts(g) >= 3) return 'p1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    f1: { speaker: 'narrator', text: 'A thin man with a fiddle under his chin and no tune in it, scratching at the same three notes and scowling at them.', next: 'f2' },
    f2: { text: 'Cobb Lark. Fiddler. Tonight\'s Captains\' Night, and the Mast sings the Saltpenny Song, and the Song gets a new verse every year. I haven\'t got one.', next: 'f3' },
    f3: {
      text: 'Every captain wants to be in it, and every captain wants to tell me what to put. I need three boasts by dark: Bess Merrin\'s, Ida Pell\'s off the Long Meg, and Jory Quick\'s off the Swallow. Will you fetch them? They won\'t lie to you. Much.',
      options: [{ text: 'I\'ll get you your boasts.', effect: (g) => g.setStage(VERSE, 'boasts') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => `${boasts(g)} of three. Bess on the north pier, Ida on the south, Jory in the middle. Hurry. The rum\'s already out.` },
    p1: { text: 'Three boasts. Bess and the squadron in the fog. Ida and the whale. Jory and the revenue men. Lovely. None of it true, I expect.', next: 'p2' },
    p2: {
      text: 'The verse wants to end on one of them. The last line\'s the one they\'ll sing loudest. Which?',
      options: [
        { text: 'Bess and her squadron in the fog.', moral: { id: 'spVerse:bess', npc: { sp_bess: 15 } }, effect: (g) => { g.setFlag(VERSE, 'bess'); g.addMarks(50); g.setStage(VERSE, 'done'); }, next: 'pE' },
        { text: 'Ida and her whale.', moral: { id: 'spVerse:ida', npc: { sp_ida: 15 } }, effect: (g) => { g.setFlag(VERSE, 'ida'); g.addMarks(50); g.setStage(VERSE, 'done'); }, next: 'pE' },
        { text: 'Jory and the revenue men.', moral: { id: 'spVerse:jory', npc: { sp_jory: 15 } }, effect: (g) => { g.setFlag(VERSE, 'jory'); g.addMarks(50); g.setStage(VERSE, 'done'); }, next: 'pE' },
        { text: 'All three, and then the truth: one cutter, its dinner bell, a dead whale, and Jory hiding in a lobster pot.', moral: { id: 'spVerse:truth', a: 2, tr: { honesty: 2, courage: 1 }, npc: { sp_bess: -5, sp_ida: -5, sp_jory: -5, annie_coe: 10 }, note: 'Gave the Saltpenny Song a verse that ended on the truth.', fame: 'put the truth in the Saltpenny Song', spread: 'local' }, effect: (g) => { g.setFlag(VERSE, 'truth'); g.addMarks(60); g.setStage(VERSE, 'done'); }, next: 'pT' },
      ],
    },
    pE: { text: 'Done. I\'ll put the fiddle up a tone for the last line. They\'ll sing it till the roof comes off, and the other two will sulk till Lammas.' },
    pT: { speaker: 'narrator', text: 'Cobb laughs so hard he has to put the fiddle down. That night the Mast sings the new verse three times, and on the last line, the one about the lobster pot, Jory Quick stands on a table and sings it loudest of all.' },
    after: { text: (g) => (g.flag(VERSE) === 'truth' ? 'They\'ve sung the lobster pot every night since. Jory\'s started telling it himself. Better than the boast.' : 'Captains\' Night next year. Start asking them now. Takes them that long to think of a lie.') },
  },
};

const ida: DialogueTree = {
  start: (g) => (at(g, VERSE) === 'boasts' && !g.flag('spBoastIda') ? 'i1' : 'i0'),
  nodes: {
    i0: { text: 'Ida Pell, bosun, the Long Meg. If you\'re not crew, mind the lines.' },
    i1: { text: 'A boast? For Cobb? Put that Ida Pell of the Long Meg harpooned a whale off the Teeth single-handed, and towed it home.', next: 'i2' },
    i2: { text: 'It was dead already. We found it. It took four of us to tow it and it smelt for a week. Put the first bit.', effect: (g) => g.setFlag('spBoastIda', 1) },
  },
};

const jory: DialogueTree = {
  start: (g) => (at(g, VERSE) === 'boasts' && !g.flag('spBoastJory') ? 'j1' : 'j0'),
  nodes: {
    j0: { text: 'Jory Quick, the Swallow. Fastest hull in the Keys. Ask anyone. Don\'t ask Bess.' },
    j1: { text: 'For the Song? Jory Quick of the Swallow, who outran six revenue men on the Callis road with a keg under each arm. That\'s me.', next: 'j2' },
    j2: { text: 'There weren\'t six. There was one, and I hid in a lobster pot till he went home. But they don\'t know that. You don\'t know that.', effect: (g) => g.setFlag('spBoastJory', 1) },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [CAT]: {
    id: CAT, name: 'The Admiral', region: 'keys', depth: 'quest',
    notes: (g, s) => {
      if (s === 'trail') return 'Captain Bess Merrin\'s cat, the Admiral, black with a white bib, has been gone three days. No ship she\'s aboard has ever been taken, and two other captains say she\'s come aboard theirs. She likes fish heads and warm places.';
      if (s === 'litter') return 'Fish heads on the Mercy\'s steps, wet prints along the Captains\' Table, and they lead to Low Tide, the fence\'s hull.';
      if (s === 'bess') return 'The Admiral is in Low Tide\'s hold with four kittens. Back to Bess Merrin on the north pier.';
      const f = g.flag(CAT);
      return f === 'table' ? 'The Admiral\'s kittens went one to each ship of the Table.' : f === 'mine' ? 'One of the Admiral\'s kittens came home with me.' : 'The Admiral and her kittens are back aboard the Fair Exchange.';
    },
    objectives: (g, s) => (s === 'trail' ? TRAIL.map((_, i) => ({ text: `Follow the Admiral across the Key (${['the Mercy', 'the Captains\' Table'][i]})`, done: !!g.flag('spTrail' + i), marker: 'spTrail' + i }))
      : s === 'litter' ? [{ text: 'Look in the hold of Low Tide', marker: 'spLitter' }]
      : s === 'bess' ? [{ text: 'Tell Bess Merrin on the north pier', marker: 'sp_bess' }] : []),
    advance: (g, s) => (s === 'trail' && followed(g) >= TRAIL.length ? 'litter' : null),
    marks: (_g, s): Marks => (!s ? { sp_bess: '!' } : s === 'bess' ? { sp_bess: '?' } : {}),
    walk: { cast: ['sp_bess'] },
  },
  [VERSE]: {
    id: VERSE, name: 'A Verse for the Mast', region: 'keys', depth: 'quest',
    notes: (g, s) => {
      if (s === 'boasts') return 'Cobb Lark, the fiddler at the Leaning Mast, needs a new verse for the Saltpenny Song by Captains\' Night: three boasts, from Bess Merrin on the north pier, Ida Pell of the Long Meg on the south pier, and Jory Quick of the Swallow on the middle one.';
      const f = g.flag(VERSE);
      return f === 'truth' ? 'The new verse ends on the lobster pot.' : `The new verse ends on ${f === 'ida' ? 'Ida\'s whale' : f === 'jory' ? 'Jory and the revenue men' : 'Bess and her squadron in the fog'}.`;
    },
    objectives: (g, s) => (s === 'boasts' ? [
      { text: 'Bess Merrin\'s boast (the north pier)', done: !!g.flag('spBoastBess'), marker: 'sp_bess' },
      { text: 'Ida Pell\'s boast (the south pier)', done: !!g.flag('spBoastIda'), marker: 'sp_ida' },
      { text: 'Jory Quick\'s boast (the middle pier)', done: !!g.flag('spBoastJory'), marker: 'sp_jory' },
      { text: 'Back to Cobb Lark at the Leaning Mast', done: false, marker: 'sp_cobb' },
    ] : []),
    marks: (g, s): Marks => (!s ? { sp_cobb: '!' } : s === 'boasts' ? (boasts(g) >= 3 ? { sp_cobb: '?' } : { ...(g.flag('spBoastBess') ? {} : { sp_bess: '?' }), ...(g.flag('spBoastIda') ? {} : { sp_ida: '?' }), ...(g.flag('spBoastJory') ? {} : { sp_jory: '?' }) }) : {}),
    walk: { cast: ['sp_cobb', 'sp_bess', 'sp_ida', 'sp_jory'], from: { quests: { spCat: 'done' } } },
  },
};

const things: WorldThing[] = [
  ...TRAIL.map(([x, z, look], i): WorldThing => ({
    land: 'morrow', id: 'spTrail' + i, x, z, y: F, label: 'Look closer', radius: 2.4, look: look as WorldThing['look'],
    when: (g) => at(g, CAT) === 'trail' && !g.flag('spTrail' + i),
    use: (g) => { g.setFlag('spTrail' + i, 1); g.toast(['Fish heads on the Mercy\'s steps, three of them, licked clean, set out in a row like an offering. Or a receipt.', 'Small wet prints along the side of the Captains\' Table, from the water butt to the stern, and on round towards Low Tide.'][i]); },
  })),
  { land: 'morrow', id: 'spLitter', x: LITTER.x, z: LITTER.z, y: F, label: 'Look behind the crates', radius: 2.6, look: 'crate',
    when: (g) => at(g, CAT) === 'litter',
    use: (g) => { g.setStage(CAT, 'bess'); g.toast('Behind Gil Fenner\'s crates, on a stolen admiral\'s coat with the gold lace picked off, a black cat with a white bib lies on her side, looking at you as if you were late. Against her, in a heap, four kittens. One has a white foot and is chewing the lace.'); } },
];

const SEA = { skin: '#b88a60', eyes: '#3a3a2a', boots: '#2a1e14' };
const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'sp_bess', name: 'Bess Merrin', title: 'Captain, the Fair Exchange', look: { ...SEA, frame: 'f', hair: '#6a5a4a', hairStyle: 2, tunic: '#2a3a5a', trim: '#d8c070', trousers: '#2a2a30', cape: '#2a3a5a', hat: 'tricorn', hatColor: '#1e1e22', lashes: true, build: 1.05, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [BESS.x, BESS.z], y: F, face: [BESS.x - 3, BESS.z], anim: 'idle' }], barks: ['Seen a cat?', 'The good rum.'] },
  { land: 'morrow', id: 'sp_ida', name: 'Ida Pell', title: 'Bosun, the Long Meg', look: { ...SEA, frame: 'f', hair: '#3a2a1e', hairStyle: 4, tunic: '#5a4a3a', trim: '#2a2420', trousers: '#3a3028', hat: 'kerchief', hatColor: '#8a2a22', lashes: true, build: 1.25, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [IDA.x, IDA.z], y: F, face: [IDA.x - 3, IDA.z], anim: 'idle' }], barks: ['Mind the lines.'] },
  { land: 'morrow', id: 'sp_jory', name: 'Jory Quick', title: 'Captain, the Swallow', look: { ...SEA, hair: '#c8a060', hairStyle: 5, tunic: '#7a3a2a', trim: '#e0d0a0', trousers: '#3a3028', hat: 'wide', hatColor: '#3a2a1e', build: 0.85, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [JORY.x, JORY.z], y: F, face: [JORY.x - 3, JORY.z], anim: 'idle' }], barks: ['Fastest hull in the Keys.'] },
  { land: 'morrow', id: 'sp_cobb', name: 'Cobb Lark', title: 'Fiddler, the Leaning Mast', look: { ...SEA, hair: '#5a4a3a', hairStyle: 3, facial: 2, tunic: '#4a3a4a', trim: '#c8b080', trousers: '#2e2a26', build: 0.85, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [COBB.x, COBB.z], y: F, face: [COBB.x - 3, COBB.z], anim: 'idle' }], barks: ['Three notes. I need more.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'pet_salt_kitten', name: 'A Saltpenny kitten', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bag', a: '#2a2420', b: '#e8dcc0' }, pet: 'salt_kitten',
    desc: 'One of the Admiral\'s, black with a white foot, the boldest of four. No ship she was aboard has ever been taken. She has bitten a fence.',
    stats: 'Used, she goes into the wardrobe for good, and follows you about. Walk up to her and press E to look after her.' },
];

export const SALTPENNY_CAT: RegionContent = {
  id: 'saltpennyCat',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { sp_bess: bess, sp_ida: ida, sp_jory: jory, sp_cobb: cobb },
  quests,
  things,
};
