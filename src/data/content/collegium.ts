import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';

// THE COLLEGIUM: a faction you can join (data/factions.ts; owner 2026-11-14, "next work on factions and questlines for
// them"). Fellows in the Guild Ward who study star crystal, the old words and the weather, teach them for a fee, and
// have petitioned the Charter for a licence over all three (the Mages Guild\'s chapter II meets the petition from
// Verandah\'s side: data/content/magesGuild.ts). Walter Gilby is its Provost. What the Counties already know of it:
// it borrowed the Waits' Great Book and sent it back thirty pages short (data/content/waits.ts); it publishes Ilse
// Blewitt\'s star count from Scarth Watch, and her stipend is late (data/lorebooks.ts); a lecture of its gives Joan
// Harrowgate\'s figure for crystal, a span of lift for every three feet of cap. The four chapters join those up.
//
// Chapters (each a rank):
//   colVolume   VOLUME TEN (Entrant): take Ilse her late stipend and bring back her tenth logbook. She shows you
//               the Collegium\'s printed Observations: her count, under the Fellows' names, the near isle\'s drift
//               rounded down the year Harrowgate opened its cut.
//   colPages    THE THIRTY PAGES (Scholar): the Librarian, Orrin Marchbank, sets you to find the oldest tune in the
//               collection. It\'s in the Waits' thirty pages, bound in Collegium boards with a slip, "to be returned".
//               Take them to Tabitha Gant, or leave them shelved. Flag colPages = 'returned' | 'kept'.
//   colFigure   A SPAN FOR THREE FEET (Fellow): a Fellow reads a paper. Gilby suggests Joan Harrowgate\'s figure,
//               which the petition leans on and Doctor Amyas Crewe signed. The Collegium\'s own lift gauge at the
//               Harrowgate Works says the ground moves four times as much. Read the true figure at the lecture, or
//               let Crewe put it in a footnote after the sitting, for a fee. Flag colFigure = 'true' | 'quiet'.
//   colSitting  THE LICENCE (Senior Fellow): the petition is heard in the Charter Hall. Hugh Kellet calls you to
//               speak. What you can say depends on what you did. Flag colLicence = 'open' | 'granted' | 'refused'.

const VOLUME = 'colVolume', PAGES = 'colPages', FIGURE = 'colFigure', SITTING = 'colSitting';
/** Where the Provost stands (the lecture-room steps in the Guild Ward; data/content/magesGuild.ts). */
const PROVOST = { x: 793.5, z: 182.5 };
const STACKS = { x: 797.5, z: 186.5 }, LECTURE = { x: 791.5, z: 180.5 };
const CREWE = { x: 790.2, z: 184.6 }, MARCH = { x: 796.4, z: 184.2 };
/** The Collegium\'s lift gauge in the Harrowgate Works yard, by the headframe. */
const GAUGE = { x: 1006.5, z: 1012.5 };
/** The keep\'s south door, where the Charter Hall sits (world/sites.ts: the keep at 820, 300). */
const HALL = { x: 820.5, z: 313.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:collegium'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:collegium', r); };
const pages = (g: GameApi) => g.flag('colPages') as 'returned' | 'kept' | undefined;
const figure = (g: GameApi) => g.flag('colFigure') as 'true' | 'quiet' | undefined;

// ================================================================ Walter Gilby, Provost (his tree is the Mages Guild\'s)

const gilbyNodes: Record<string, DNode> = {
  colHi: {
    text: (g) => {
      const r = g.flag('fac:collegium');
      if (r === 3) return 'Senior Fellow. You can sit in my chair when I\'m out. Everyone else does.';
      if (r === 2) return 'Fellow. The board meets on Thursdays. Bring a cushion; the benches were bought by an ascetic.';
      if (r === 1) return 'The library\'s open to scholars from eight. Marchbank will pretend it isn\'t.';
      if (r === 0) return 'Entrants sit at the back and don\'t ask questions until the second term. You may ask one now.';
      return 'The Collegium lectures at ten. Fellows only, unless you\'ve paid.';
    },
    options: [
      { text: 'I want to join the Collegium.', cond: (g) => !at(g, VOLUME), next: 'cj1' },
      { text: 'What does the Collegium study?', next: 'cWhat' },
      { text: 'Good day.' },
    ],
  },
  cWhat: { text: 'Star crystal, the old words cut in the standing stones, and the weather, which is the only one of the three anybody pays to hear about.', next: 'cWhat2' },
  cWhat2: { text: 'We\'ve asked the Charter for a licence to teach all three. Some people think that means we want to stop anyone else teaching them. Some people are right.', next: 'colHi' },
  // I. Volume Ten
  cj1: { speaker: 'narrator', text: 'He looks at you the way he would look at an essay that has arrived without a name on it.', next: 'cj2' },
  cj2: { text: 'Entrants pay twenty marks a term, or they make themselves useful. Can you make yourself useful?', options: [{ text: 'I can.', next: 'cj3' }, { text: 'What would I be doing?', next: 'cj3' }] },
  cj3: { text: 'Ilse Blewitt keeps the star count at Scarth Watch, on the north moor. We publish it. It is the best thing we publish.', next: 'cj4' },
  cj4: { text: 'Her stipend is three weeks late. That\'s the Bursar\'s fault, which is to say it\'s mine. She has stopped sending her logbooks, which is to say she\'s noticed.', next: 'cj5' },
  cj5: {
    text: 'Take her the stipend. Bring back volume ten. Be polite to her. She has been right about the sky for thirty years and wrong about nothing I\'ve ever caught her in.',
    effect: (g) => { g.give('col_stipend', 1); g.setStage(VOLUME, 'ilse'); },
  },
  cvWait: { text: (g) => (at(g, VOLUME) === 'ilse' ? 'Scarth Watch. North of the Ford, on the moor. The tower with the brass on top.' : '') },
  cv1: { speaker: 'narrator', text: 'He takes the logbook in both hands and opens it to the middle, as if checking it was still there.', next: 'cv2' },
  cv2: {
    text: 'Did she say anything?',
    options: [
      { text: 'That the Collegium prints her count under the Fellows\' names, and changed her numbers for the near isle.', next: 'cv3' },
      { text: 'That she\'d like her stipend on time.', next: 'cv3b' },
    ],
  },
  cv3: { text: 'The Observations are edited. That is what a college is for. Ilse thinks it means we lie, and she\'s entitled to think it.', next: 'cv3c' },
  cv3c: { speaker: 'narrator', text: 'He closes the book. He doesn\'t say she\'s wrong.', next: 'cv4' },
  cv3b: { text: 'She\'d like a great deal more than that. She\'s polite enough to start small.', next: 'cv4' },
  cv4: {
    text: 'You\'re an Entrant. Back row, and a gown that fits nobody. Come and see me when you\'ve learnt where the library is.',
    effect: (g) => { g.take('col_volume', 1); g.setStage(VOLUME, 'done'); rank(g, 0); g.addMarks(25); },
  },
  // II. The Thirty Pages
  cp1: { text: 'A scholar reads in the library without being watched. To be a scholar, you go into the library and you\'re watched. Marchbank will set you a search. He sets everyone the same one and pretends he doesn\'t.', next: 'cp2' },
  cp2: { text: 'Orrin Marchbank. By the presses, looking at the door as if it owed him money.', effect: (g) => g.setStage(PAGES, 'orrin') },
  cpWait: { text: (g) => (at(g, PAGES) === 'orrin' ? 'Marchbank. By the presses.' : at(g, PAGES) === 'search' ? 'The music presses are out under the clock. Mind the ladder: it moves when you don\'t.' : at(g, PAGES) === 'tabitha' ? 'If you\'re going to the Waits\' House, go before the noon tune. Tabitha doesn\'t stop for anybody.' : '') },
  cpBack: { speaker: 'narrator', text: (g) => (pages(g) === 'returned' ? 'He has heard already. Everyone in the Guild Ward has heard already.' : 'He looks at you, then at the presses, then at you.'), next: 'cpBack2' },
  cpBack2: { text: (g) => (pages(g) === 'returned' ? 'Marchbank wants you sent down. I told him a scholar who finds what they\'re set to find has passed. He said that wasn\'t the point. I said it was the only point.' : 'Marchbank says you found them and left them where they were. He was pleased. I find I\'m not, which is interesting.'), next: 'cpBack3' },
  cpBack3: { text: 'You\'re a scholar. The library is yours from eight to eight, and so are its arguments.', effect: (g) => { g.setStage(PAGES, 'done'); rank(g, 1); g.addMarks(50); } },
  // III. A Span for Three Feet
  cf1: { text: 'A scholar becomes a Fellow by reading a paper at the ten o\'clock lecture and surviving the questions. Most papers are about other papers. I\'d like yours to be about the ground.', next: 'cf2' },
  cf2: { text: 'Our petition leans on one figure: Joan Harrowgate\'s. A span of lift for every three feet of crystal cap. Doctor Crewe signed it for the Collegium. Harrowgate & Daughters paid for the signing, which is usual, and I\'ve never asked what for, which is also usual.', next: 'cf3' },
  cf3: { text: 'We keep a lift gauge in the Works yard, by the headframe. Nobody has read it since Crewe put it in. Read it. Then write me a paper.', effect: (g) => g.setStage(FIGURE, 'gauge') },
  cfWait: { text: (g) => (at(g, FIGURE) === 'gauge' ? 'The Works, south of the Kettle road. The gauge is a brass dial on an iron post, by the headframe.' : at(g, FIGURE) === 'crewe' ? 'Talk to Crewe before you read it. It\'s his figure. He\'s owed the chance to be wrong in private first.' : at(g, FIGURE) === 'lecture' ? 'Ten o\'clock, on the steps. Speak up. The back row is mostly asleep.' : '') },
  cfBack: { text: (g) => (figure(g) === 'true' ? 'Harrowgate wrote this morning to withdraw its subscription. Crewe has taken a sabbatical, which is a long word for sulking. The board is furious.' : 'Crewe says you\'ve agreed a footnote. He\'s very pleased with you. He told me so twice, which is how I knew to ask.'), next: 'cfBack2' },
  cfBack2: { text: (g) => (figure(g) === 'true' ? 'The board is furious, and every one of them came up afterwards to read your numbers for themselves. That\'s what a Fellow is for.' : 'A footnote after the sitting. The Charter will grant a licence on the old figure, and correct it later in a book nobody reads. You\'ve learnt how a college works. I\'d hoped you\'d learn something else.'), next: 'cfBack3' },
  cfBack3: { text: 'Fellow of the Collegium. The circlet is brass. Visitors will tell you it looks like a crown. Thank them.', effect: (g) => { g.setStage(FIGURE, 'done'); rank(g, 2); g.addMarks(80); g.give('col_circlet', 1); } },
  // IV. The Licence
  cs1: { text: 'The Charter hears our petition tomorrow. Today. Now, in fact; I was hoping you\'d come by. Hugh Kellet has called you to speak, as a Fellow who has read the gauge.', next: 'cs2' },
  cs2: { text: 'I don\'t know what you\'ll say. I find I\'d like to hear it. The Charter Hall, in the keep. Kellet will be at the south door.', effect: (g) => g.setStage(SITTING, 'hall') },
  csWait: { text: 'The keep. South door. Kellet hates waiting, and he\'s very good at it.' },
  csBack: { speaker: 'narrator', text: 'Gilby is sitting on the lecture-room steps with his gown off and his sleeves rolled up, like a man who has finished a long piece of work and isn\'t sure he liked the ending.', next: 'csBack2' },
  csBack2: {
    text: (g) => g.flag('colLicence') === 'open'
      ? 'A licence to teach and no licence to forbid. The Mages Guild can teach in Verandah, Ilse can print her own count, and the Collegium has to be better than them to be paid more. I think it might be the making of us. I think the board will never forgive you.'
      : g.flag('colLicence') === 'granted'
        ? 'Granted. Sole licence, all three, for twenty years. Nobody else in the Counties may teach the old words for money. I asked for it, and I have it, and I keep reading it to see if it says something else.'
        : 'Refused. The Collegium may teach, as anyone may, and may stop nobody. The board is drafting a letter of complaint to the Speaker. It will be very long, and I\'ve offered to sign it last.',
    next: 'csBack3',
  },
  csBack3: { text: 'Senior Fellow. You\'ve earned it the hard way, which is the only way I\'d have let you.', effect: (g) => { g.setStage(SITTING, 'done'); rank(g, 3); g.addMarks(150); } },
};
const gilbyPick = (g: GameApi): string | undefined => {
  if (at(g, 'mgPetition') === 'provost') return undefined; // (the Mages Guild\'s scene first)
  const v = at(g, VOLUME), p = at(g, PAGES), f = at(g, FIGURE), s = at(g, SITTING);
  if (v === 'back') return 'cv1';
  if (v && v !== 'done') return 'cvWait';
  if (done(g, VOLUME) && !p) return 'cp1';
  if (p === 'back') return 'cpBack';
  if (p && p !== 'done') return 'cpWait';
  if (done(g, PAGES) && !f) return 'cf1';
  if (f === 'back') return 'cfBack';
  if (f && f !== 'done') return 'cfWait';
  if (done(g, FIGURE) && !s) return 'cs1';
  if (s === 'back') return 'csBack';
  if (s && s !== 'done') return 'csWait';
  return 'colHi';
};

// ================================================================ Ilse Blewitt, at Scarth Watch (her tree is Act II\'s)

const ilseNodes: Record<string, DNode> = {
  ci1: { speaker: 'narrator', text: 'She takes the purse, opens it, and counts it on the table between the logbooks, coin by coin, without looking up.', next: 'ci2' },
  ci2: { text: 'Three weeks. Volume nine says so, on the page for the twenty-first. If anyone at the Collegium read volume nine, they\'d know.', next: 'ci3' },
  ci3: { text: 'Here. Ten. Tell Walter the glass was steady all month and the falls were all north, and he can print that as if one of his Fellows sat up for it.', next: 'ci4' },
  ci4: {
    text: 'You haven\'t seen their Observations, have you.',
    options: [
      { text: 'No. Show me.', next: 'ci5' },
      { text: 'I\'ve heard they\'re edited.', next: 'ci5' },
    ],
  },
  ci5: { speaker: 'narrator', text: 'A printed book in Collegium blue: "Observations of the Heavens and the Isles, by the Fellows of the Collegium of Ansbury." Inside, her count, night by night. Her name isn\'t in it anywhere.', next: 'ci6' },
  ci6: { text: 'I don\'t mind the names. I\'m too old to mind names. Turn to the isles.', next: 'ci7' },
  ci7: { speaker: 'narrator', text: 'A table of the near isle\'s drift, year by year. Most years a stride, give or take. Then, eleven years ago, the year Harrowgate opened its cut at the Knap, the column reads "nil", and goes on reading "nil".', next: 'ci8' },
  ci8: { text: 'It moved a stride and a hand that year. I measured it twice. They printed nothing, because Doctor Crewe has a figure, and the isle didn\'t fit it.', next: 'ci9' },
  ci9: {
    text: 'Take Walter his book. You can tell him what I said, or not. He knows.',
    effect: (g) => { g.take('col_stipend', 1); g.give('col_volume', 1); g.setStage(VOLUME, 'back'); },
  },
};

// ================================================================ Orrin Marchbank, Librarian

const orrin: DialogueTree = {
  start: (g) => (at(g, PAGES) === 'orrin' ? 'o1' : at(g, PAGES) === 'found' ? 'f1' : 'idle'),
  nodes: {
    idle: { text: (g) => (pages(g) === 'returned' ? 'You. The library is open to scholars. I\'m told you\'re still one. I\'ve asked to be told again in writing.' : 'Quiet, please. The books can hear you, and they\'re very old.') },
    o1: { speaker: 'narrator', text: 'A narrow man in black, with a ring of keys on a cord round his neck and a small pencil behind each ear.', next: 'o2' },
    o2: { text: 'Gilby\'s sent you. Gilby sends me everyone. Very well. A scholar\'s search: find me the oldest tune in the Collegium\'s collection.', next: 'o3' },
    o3: { text: 'The music presses, behind me. The library cellar floods, so they\'re out under the clock till Michaelmas. Everything is catalogued. If you can\'t find it in the catalogue, you can\'t find it, and you are not a scholar.', next: 'o4' },
    o4: { text: 'Touch the bindings by the edges. Don\'t lick your fingers. You\'d be amazed.', effect: (g) => g.setStage(PAGES, 'search') },
    f1: { speaker: 'narrator', text: 'He sees what you are holding before you reach the desk, and stands up.', next: 'f2' },
    f2: { text: 'That\'s catalogued. Folio, music, thirty leaves, the counties\' airs. It\'s in the catalogue.', next: 'f3' },
    f3: {
      text: 'The slip says "to be returned". Slips say all sorts of things.',
      options: [
        { text: 'The letter to Tabitha Gant said a student took them. A student who left.', next: 'f4' },
        { text: 'Why keep them?', next: 'f5' },
      ],
    },
    f4: { text: 'A student did take them. Out of the Book, at that desk, under my instruction, to copy. And then the student left, and the copy was never made, and twelve years is a long time to admit something in.', next: 'f5' },
    f5: { text: 'They\'re safer here. The Waits play tunes. We keep them. In fifty years, when nobody plays them at all, someone will come to this room and be glad.', next: 'f6' },
    f6: {
      text: 'You\'ll put them back on the press.',
      options: [
        { text: 'No. They belong to the Waits. I\'m taking them to Tabitha Gant.', effect: (g) => { g.setFlag('colPages', 'returned'); g.setStage(PAGES, 'tabitha'); }, next: 'fT' },
        { text: 'It isn\'t my quarrel. I\'ll put them back.', effect: (g) => { g.setFlag('colPages', 'kept'); g.take('col_pages', 1); g.setStage(PAGES, 'back'); }, next: 'fK' },
      ],
    },
    fT: { speaker: 'narrator', text: 'He doesn\'t try to stop you. He sits down and writes something in the catalogue, very small, and blots it twice.' },
    fK: { text: 'Thank you. Folio, music, thirty leaves. Back where it belongs.', next: 'fK2' },
    fK2: { speaker: 'narrator', text: 'He slides them in himself, squaring the spine with the flat of his hand, and doesn\'t look at you again.' },
  },
};

// ================================================================ Tabitha Gant, at the Waits' House (her tree is the Waits')

const tabithaNodes: Record<string, DNode> = {
  ct1: { speaker: 'narrator', text: 'She stops tuning. She knows what they are from across the room: she taught from them for twenty years.', next: 'ct2' },
  ct2: { text: '"The Tinner\'s Daughter." "Kelderby Wakes." "Lady Day in the Morning," in old Pascoe\'s hand, with his blot on the second line.', next: 'ct3' },
  ct3: { text: 'Roley! Get the Book. And glue. Don\'t ask me why, just get the glue.', next: 'ct4' },
  ct4: { text: 'Twelve years I\'ve written to them every Lady Day. Every year the same letter back. And you walked in and walked out with them under your arm.', next: 'ct5' },
  ct5: { text: 'The Waits will play something for the Collegium at the noon tune. Not something nice.', effect: (g) => { g.take('col_pages', 1); g.setStage(PAGES, 'back'); g.addMarks(30); } },
};

// ================================================================ Doctor Amyas Crewe, Fellow

const crewe: DialogueTree = {
  start: (g) => (at(g, FIGURE) === 'crewe' ? 'c1' : 'idle'),
  nodes: {
    idle: { text: (g) => (figure(g) === 'true' ? 'I\'m on sabbatical. This is me, on sabbatical. Go away.' : 'Crystal is a subject for patient people. I am a very patient person.') },
    c1: { speaker: 'narrator', text: 'A well-fed man in a good coat with a Harrowgate pin in the lapel, small enough to be discreet and gold enough to be seen.', next: 'c2' },
    c2: { text: 'The gauge. Yes. I put it in. I read it the first year, and the first year agreed with Joan, more or less.', next: 'c3' },
    c3: { text: 'Then the cut went deeper, and the numbers went strange, and I had a great deal of other work, and nobody asked.', next: 'c4' },
    c4: { text: 'Four times. Hm. The ground under the Knap drops four times what Joan\'s figure says it should, when the crystal comes out from under it. And the near isle goes with it.', next: 'c5' },
    c5: { text: 'You understand what you\'re holding. If the true figure is read before the sitting, the Charter will want to know why its Fellows certified the false one. Harrowgate will want its money back. The petition fails.', next: 'c6' },
    c6: {
      text: 'Or: a footnote. In the next edition, after the licence is granted. The figure corrected, quietly, by a Fellow of the Collegium. You. I\'d see you were paid for the work. Generously.',
      options: [
        { text: 'No. I\'ll read the true figure at the lecture.', effect: (g) => { g.setFlag('colFigure', 'true'); g.setStage(FIGURE, 'lecture'); }, next: 'cT' },
        { text: 'A footnote, after the sitting.', effect: (g) => { g.setFlag('colFigure', 'quiet'); g.addMarks(150); g.setStage(FIGURE, 'back'); }, next: 'cQ' },
      ],
    },
    cT: { text: 'Then you\'ll read it to an empty room. Harrowgate subscribes to half the benches.' },
    cQ: { speaker: 'narrator', text: 'He counts a hundred and fifty marks into your hand from a purse that was already that heavy, as if he\'d known what you would say.' },
  },
};

// ================================================================ The sitting, in the Charter Hall

const sitting: DialogueTree = {
  start: () => 's1',
  nodes: {
    s1: { speaker: 'narrator', text: 'Hugh Kellet, the Gentleman Usher, takes you in by the side door. The Charter Hall is full: Fellows in blue on one side, Toll Office black on the other, Harrowgate\'s people in good coats along the back wall, and the Speaker under the window.', next: 's2' },
    s2: { text: 'The Collegium of Ansbury petitions for sole licence to teach star crystal, the old words and the weather. A Fellow who has read the Collegium\'s gauge asks to be heard. Be brief. The Speaker has a cold.', next: 's3' },
    s3: {
      text: (g) => `${figure(g) === 'true' ? 'Everybody in the hall has heard about your lecture. Half of them came to look at you.' : 'Doctor Crewe is in the front row. He nods to you, very slightly.'} ${pages(g) === 'returned' ? 'The Waits are on the gallery, all five, with their instruments.' : ''}`,
      options: [
        { text: 'A licence to teach, yes. A licence to forbid, no. Let the Mages Guild, the Waits and Ilse Blewitt teach and print what they know.', cond: (g) => figure(g) === 'true' || pages(g) === 'returned', next: 'sOpen' },
        { text: 'Grant it. The Collegium is the best college in the Counties. Let it keep what it has.', next: 'sGrant' },
        { text: 'Refuse it. A college that edits its own gauge shouldn\'t be given the right to forbid anyone.', cond: (g) => figure(g) === 'true', next: 'sRefuse' },
      ],
    },
    sOpen: { text: (g) => `The Speaker asks what proof there is that anyone else can teach. You give it: ${figure(g) === 'true' ? 'Ilse\'s true count of the isle, which the Collegium printed as nil' : 'the Waits\' thirty pages, which the Collegium kept for twelve years and never copied'}. Kellet writes for a long time.`, next: 'sOpen2' },
    sOpen2: { text: 'The Speaker grants a licence to teach, and no licence to forbid. The Toll Office objects, for form\'s sake. The Waits on the gallery play four bars of something, and the Speaker pretends not to hear it.', effect: (g) => { g.setFlag('colLicence', 'open'); g.setStage(SITTING, 'back'); } },
    sGrant: { text: 'You speak for the Collegium, and you speak well. Crewe\'s figure is read into the record. The Speaker grants sole licence, all three, for twenty years. Harrowgate\'s coats along the back wall applaud, which nobody else does.', effect: (g) => { g.setFlag('colLicence', 'granted'); g.setStage(SITTING, 'back'); } },
    sRefuse: { text: 'You read the gauge into the record, and Ilse\'s nil, and the year it began. The hall goes very quiet. The Speaker refuses the licence and asks the Toll Office, coldly, who else Doctor Crewe has certified things for. Kellet stops writing, and then starts again, faster.', effect: (g) => { g.setFlag('colLicence', 'refused'); g.setStage(SITTING, 'back'); } },
  },
};

const KELLET_LOOK = { skin: '#e8c4a0', hair: '#9a948c', hairStyle: 1, eyes: '#4a5a6a', tunic: '#1e1e24', trim: '#c8c8d0', trousers: '#1e1e24', boots: '#141418', cape: '#1e1e24', build: 0.95, height: 1.04, age: 0.6 };

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [VOLUME]: {
    id: VOLUME, name: 'Volume Ten', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'ilse' ? 'Walter Gilby, Provost of the Collegium, will take me as an Entrant if I take Ilse Blewitt her late stipend at Scarth Watch and bring back her tenth logbook.' : s === 'back' ? 'Ilse showed me the Collegium\'s printed Observations: her count, under the Fellows\' names, and the near isle\'s drift printed "nil" from the year Harrowgate opened its cut. Back to Gilby with volume ten.' : s === 'done' ? 'Gilby made me an Entrant of the Collegium.' : ''),
    objectives: (g, s) => (s === 'ilse' ? [{ text: 'Take the stipend to Ilse Blewitt at Scarth Watch', marker: 'ilse' }] : s === 'back' ? [{ text: 'Bring volume ten to Walter Gilby, the Guild Ward, Ansbury', marker: 'mg_gilby' }] : []),
    marks: (g, s): Marks => (s === 'ilse' ? { ilse: '?' } : s === 'back' ? { mg_gilby: '?' } : {}),
    walk: { cast: ['mg_gilby', 'ilse'] },
  },
  [PAGES]: {
    id: PAGES, name: 'The Thirty Pages', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'orrin' ? 'To be a scholar I\'m to be set a search by the Librarian, Orrin Marchbank.' : s === 'search' ? 'Marchbank wants the oldest tune in the Collegium\'s collection. The music presses are out on the Guild Ward square, under the clock.' : s === 'found' ? 'The oldest tunes in the collection are the thirty pages cut from the Waits\' Great Book, bound in Collegium boards, with a slip: "to be returned". I should show Marchbank.' : s === 'tabitha' ? 'I\'m taking the thirty pages back to Tabitha Gant at the Waits\' House.' : s === 'back' ? 'Back to Gilby.' : s === 'done' ? (pages(g) === 'returned' ? 'The Waits have their pages back. I\'m a scholar of the Collegium, though Marchbank has asked for it in writing.' : 'I left the Waits\' pages on the Collegium\'s press. I\'m a scholar of the Collegium.') : ''),
    objectives: (g, s) => (s === 'orrin' ? [{ text: 'Talk to Orrin Marchbank, the Librarian', marker: 'col_orrin' }] : s === 'search' ? [{ text: 'Search the music presses for the oldest tune', marker: 'colPresses' }] : s === 'found' ? [{ text: 'Show Marchbank what you found', marker: 'col_orrin' }] : s === 'tabitha' ? [{ text: 'Take the pages to Tabitha Gant at the Waits\' House', marker: 'tabitha' }] : s === 'back' ? [{ text: 'Talk to Walter Gilby', marker: 'mg_gilby' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, VOLUME) ? { mg_gilby: '!' } : {}) : s === 'orrin' || s === 'found' ? { col_orrin: '?' } : s === 'tabitha' ? { tabitha: '?' } : s === 'back' ? { mg_gilby: '?' } : {}),
    walk: { from: { quests: { [VOLUME]: 'done' }, flags: { 'fac:collegium': 0 } }, cast: ['mg_gilby', 'col_orrin', 'tabitha'] },
  },
  [FIGURE]: {
    id: FIGURE, name: 'A Span for Three Feet', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'gauge' ? 'To be a Fellow I\'m to read a paper. Gilby wants it to be about Joan Harrowgate\'s figure, a span of lift for every three feet of crystal cap, which the Collegium\'s petition leans on. Read the Collegium\'s lift gauge in the Harrowgate Works yard.' : s === 'crewe' ? 'The gauge says the ground under the Knap moves four times what Joan\'s figure says. Doctor Amyas Crewe signed the figure. I should hear him first.' : s === 'lecture' ? 'I\'ll read the true figure at the ten o\'clock lecture, on the lecture-room steps.' : s === 'back' ? 'Back to Gilby.' : s === 'done' ? (figure(g) === 'true' ? 'I read the true figure at the lecture. Harrowgate withdrew its subscription. I\'m a Fellow of the Collegium.' : 'I agreed with Crewe on a footnote after the sitting, and was paid for it. I\'m a Fellow of the Collegium.') : ''),
    objectives: (g, s) => (s === 'gauge' ? [{ text: 'Read the Collegium\'s lift gauge at the Harrowgate Works', marker: 'colGauge' }] : s === 'crewe' ? [{ text: 'Talk to Doctor Amyas Crewe, the Guild Ward', marker: 'col_crewe' }] : s === 'lecture' ? [{ text: 'Read your paper at the ten o\'clock lecture (eight to noon)', marker: 'colLecture' }] : s === 'back' ? [{ text: 'Talk to Walter Gilby', marker: 'mg_gilby' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, PAGES) ? { mg_gilby: '!' } : {}) : s === 'crewe' ? { col_crewe: '?' } : s === 'back' ? { mg_gilby: '?' } : {}),
    walk: { from: { quests: { [VOLUME]: 'done', [PAGES]: 'done' }, flags: { 'fac:collegium': 1, colPages: 'returned' } }, cast: ['mg_gilby', 'col_crewe'], auto: { lecture: 'back' } },
  },
  [SITTING]: {
    id: SITTING, name: 'The Licence', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'hall' ? 'The Charter hears the Collegium\'s petition today. Hugh Kellet has called me to speak, as the Fellow who read the gauge. The Charter Hall, the keep\'s south door.' : s === 'back' ? 'The sitting is over. Back to Gilby.' : s === 'done' ? (g.flag('colLicence') === 'open' ? 'The Charter granted the Collegium a licence to teach and none to forbid. I\'m a Senior Fellow.' : g.flag('colLicence') === 'granted' ? 'The Charter granted the Collegium sole licence for twenty years. I\'m a Senior Fellow.' : 'The Charter refused the Collegium\'s licence. I\'m a Senior Fellow.') : ''),
    objectives: (g, s) => (s === 'hall' ? [{ text: 'Speak at the sitting, the Charter Hall (the keep\'s south door)', marker: 'colHall' }] : s === 'back' ? [{ text: 'Talk to Walter Gilby', marker: 'mg_gilby' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, FIGURE) ? { mg_gilby: '!' } : {}) : s === 'back' ? { mg_gilby: '?' } : {}),
    walk: { from: { quests: { [VOLUME]: 'done', [PAGES]: 'done', [FIGURE]: 'done' }, flags: { 'fac:collegium': 2, colPages: 'returned', colFigure: 'true' } }, cast: ['mg_gilby'], auto: { hall: 'back' } },
  },
};

// ================================================================ Things

const things: WorldThing[] = [
  {
    id: 'colPresses', x: STACKS.x, z: STACKS.z, label: 'Search the music presses', radius: 2.4, look: 'none',
    when: (g) => at(g, PAGES) === 'search',
    use: (g) => {
      g.give('col_pages', 1);
      g.setStage(PAGES, 'found');
      g.toast('The catalogue\'s oldest air is "The Tinner\'s Daughter", folio, thirty leaves. The leaves are cut along one edge with a knife, not torn, and bound in Collegium boards. Inside the cover, a slip in faded ink: "From the Waits\' Great Book, for copying. To be returned."');
    },
  },
  {
    id: 'colGauge', x: GAUGE.x, z: GAUGE.z, label: 'Read the lift gauge', radius: 2.4, look: 'gauge',
    when: (g) => at(g, FIGURE) === 'gauge',
    use: (g) => {
      g.setStage(FIGURE, 'crewe');
      g.toast('A brass dial on an iron post, its glass gone green, and a paper drum inside that has turned once a week for eleven years. The first year\'s line climbs gently, as Joan\'s figure says. Then it falls away, four times as steep, every week since the cut went under the Knap.');
    },
  },
  {
    id: 'colLecture', x: LECTURE.x, z: LECTURE.z, label: 'Read your paper at the lecture', radius: 2.6, look: 'none',
    when: (g) => at(g, FIGURE) === 'lecture',
    use: (g) => {
      const h = g.compHour();
      if (h < 8 || h >= 12) { g.toast('The lecture is at ten. Come in the morning, between eight and noon.'); return; }
      g.setStage(FIGURE, 'back');
      g.toast('You read the gauge\'s numbers, and then Ilse\'s nil, and then the year it began. Half the benches are Harrowgate\'s; by the end, half the benches are empty. The other half stay for the questions, which go on until one.');
    },
  },
  {
    id: 'colHall', x: HALL.x, z: HALL.z, label: 'Speak at the sitting', radius: 2.6, look: 'none',
    when: (g) => at(g, SITTING) === 'hall',
    use: (g) => g.playScene?.('col_sitting', { name: 'Hugh Kellet', title: 'Gentleman Usher', look: KELLET_LOOK as never }),
  },
];

// ================================================================ People and things

const NPCS_C: NpcDef[] = [
  { id: 'col_orrin', name: 'Orrin Marchbank', title: 'Librarian of the Collegium', look: { skin: '#e8c8a8', hair: '#3a3430', hairStyle: 0, eyes: '#3a3a42', tunic: '#1e1a1e', trim: '#5a2a4a', trousers: '#1e1a1e', boots: '#141210', build: 0.78, height: 1.08, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [MARCH.x, MARCH.z], face: [MARCH.x + 1, MARCH.z + 2], anim: 'idle' }], barks: ['Quiet, please.', 'Edges only.'] },
  { id: 'col_crewe', name: 'Doctor Amyas Crewe', title: 'Fellow of the Collegium', look: { skin: '#f0c8a8', hair: '#c8c0b0', hairStyle: 1, eyes: '#4a3a2a', tunic: '#2a2440', trim: '#c8a050', trousers: '#1e1a1e', boots: '#141210', cape: '#2a2440', build: 1.2, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [CREWE.x, CREWE.z], face: [PROVOST.x, PROVOST.z], anim: 'idle' }], barks: ['Patience.', 'A very patient subject.'] },
];

const ITEMS_C: ItemDef[] = [
  { id: 'col_stipend', name: 'Ilse Blewitt\'s stipend', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#5a2a4a', b: '#e0bd64' }, desc: 'A purse of Collegium plum, sealed, with "I. Blewitt, Scarth Watch, three weeks" written on the tag in a hand that was in a hurry.' },
  { id: 'col_volume', name: 'Volume ten of Ilse\'s count', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'book', a: '#2a3a5a', b: '#c8d8f0' }, desc: 'A year of nights at Scarth Watch, in pencil, the glass and the falls and the isles, and in the margin of the twenty-first, "stipend, three weeks".' },
  { id: 'col_pages', name: 'The Waits\' thirty pages', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8dcc0', b: '#5a2a4a' }, desc: 'Thirty leaves of the counties\' airs, cut along one edge with a knife, bound in Collegium boards. A slip inside the cover: "From the Waits\' Great Book, for copying. To be returned."' },
  { id: 'col_circlet', name: 'Fellow\'s circlet', kind: 'armor', rarity: 'rare', stack: false, value: 120, icon: { shape: 'helm', a: '#e0bd64', b: '#5a2a4a' }, armor: { slot: 'head', defense: 4, look: { hat: 'circlet', hatColor: '#e0bd64' } }, desc: 'A band of brass, worn by the Collegium\'s Fellows. Visitors are told it isn\'t a crown. It is a little bit.', stats: 'Defence +4.' },
];

export const COLLEGIUM: RegionContent = {
  id: 'collegium',
  items: ITEMS_C,
  npcs: NPCS_C,
  dialogue: { col_orrin: orrin, col_crewe: crewe, col_sitting: sitting },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'mg_gilby', gilbyPick, gilbyNodes);
    hook(D, 'ilse', (g) => (at(g, VOLUME) === 'ilse' ? 'ci1' : undefined), ilseNodes);
    hook(D, 'tabitha', (g) => (at(g, PAGES) === 'tabitha' ? 'ct1' : undefined), tabithaNodes);
  },
};
