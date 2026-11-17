import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// THE MUSTER: a faction you can join (data/factions.ts; owner 2026-11-14, "next work on factions and questlines for
// them"). When the Charter cut its toll riders from twelve to six, then to none, their sergeant, A. Holroyd, put up a
// roll at the tilt-yard for anyone who still wanted the work (Nat Coverdale\'s daybook and the Muster\'s notice,
// data/lorebooks.ts). Its one rule: nobody who is also drawing a wage from the Company Wardens, Harrowgate\'s men with
// sticks (data/content/lamplighters.ts: a third of the town\'s lamp oil lights their lanterns).
//
// Chapters (each a rank):
//   musRoll     SIGN THE ROLL (On the Roll): the test contract. A wool cart\'s horse was taken on the long stretch past
//               the Waystation; bring down the wolves there, with Nat Coverdale\'s word on where they lie up.
//   musTwice    PAID TWICE (Sworn): somebody on the roll tells the Wardens which carts the Muster guards. Pryce\'s pay
//               list at the Works names Davy Rowe, who left the Lamplighters for "better money". Strike him off, or
//               keep him on and have him carry the Wardens what Holroyd wants them to hear. Flag musDavy = 'struck' |
//               'turned'.
//   musToll     THE LONG STRETCH (Corporal): the Toll Office offers the Muster the long stretch, to ride it again,
//               collecting for Harrowgate\'s new turnpike trust. Ride it first and see who\'s on it: footpads at the
//               cutting, and Ivo Rendle at the Long Stretch inn, who was number nine. Tell Holroyd to take the money or
//               not. Flag musToll = 'took' | 'refused'.
//   musBanner   THE MUSTER STANDS (Banneret): the Company Wardens come to the tilt-yard with a paper that
//               says an armed company needs a Charter licence. Holroyd wants the roll there. Fetch the three who\'ll
//               come, and stand.

const ROLL = 'musRoll', TWICE = 'musTwice', TOLL = 'musToll', BANNER = 'musBanner';
/** By the Muster's blue pavilion, outside the tilt-yard's east gate. */
const HOLROYD = { x: 998.5, z: 217.5 }, NAT = { x: 998.8, z: 211.2 }, DAVY = { x: 1001.2, z: 219.6 };
/** The long stretch east of the Waystation, where the wolves lie up; the cutting further on, for the footpads. */
const WOLVES: [number, number][] = [[740, 580], [744, 585], [737, 587], [747, 578]];
const CUTTING: [number, number][] = [[768, 602], [772, 598], [765, 606], [774, 604]];
/** Pryce\'s trestle by the Works office door (world/sites.ts buildHarrowgate). */
const PAYLIST = { x: 988.6, z: 996.2 };
/** Who the roll can call on at the end: in the Shambles, at the Waystation, in the Charter Arms. */
type Call = { id: string; flag: string; name: string };
const KIT: Call = { id: 'kit_bawden', flag: 'musCallKit', name: 'Kit Bawden' }, SAM: Call = { id: 'sam_penna', flag: 'musCallKit', name: 'Sam Penna' };
/** (Kit Bawden may have left Ansbury at the end of the Lamplighters' storyline: then Sam Penna comes in his place.) */
const calls = (g: GameApi): Call[] => [g.flag('lampEnd') === 'kit' ? SAM : KIT, { id: 'ivo', flag: 'musCallIvo', name: 'Ivo Rendle' }, { id: 'clement', flag: 'musCallClem', name: 'Clement Fry' }];

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const has = (g: GameApi, k: string) => !!g.flag(k);
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:muster'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:muster', r); };
const davy = (g: GameApi) => g.flag('musDavy') as 'struck' | 'turned' | undefined;
const toll = (g: GameApi) => g.flag('musToll') as 'took' | 'refused' | undefined;
const called = (g: GameApi) => calls(g).filter((c) => has(g, c.flag)).length;

// ================================================================ Sergeant Agnes Holroyd

const holroyd: DialogueTree = {
  start: (g) => {
    const r = at(g, ROLL), t = at(g, TWICE), l = at(g, TOLL), b = at(g, BANNER);
    if (!r) return 'j1';
    if (r === 'back') return 'r1';
    if (r !== 'done') return 'rWait';
    if (!t) return 't1';
    if (t === 'back') return 't9';
    if (t === 'choose') return 'tC';
    if (t !== 'done') return 'tWait';
    if (!l) return 'l1';
    if (l === 'back') return 'lC';
    if (l !== 'done') return 'lWait';
    if (!b) return 'b1';
    if (b === 'stand') return called(g) >= calls(g).length ? 'bS0' : 'bWait';
    if (b === 'back') return 'bE1';
    return 'idle';
  },
  nodes: {
    idle: {
      text: (g) => {
        const r = g.flag('fac:muster');
        if (r === 3) return 'Banneret. Stand where people can see you. That\'s most of the job.';
        if (r === 2) return 'Corporal. The board\'s yours to read first. Read it slowly. Some of those contracts are traps.';
        if (r === 1) return 'Sworn. Don\'t make me sorry.';
        return 'Contracts on the board. Pay on the day it\'s done, not the day you say it is.';
      },
    },
    // I. Sign the Roll
    j1: { speaker: 'narrator', text: 'A square woman of fifty in a toll rider\'s blue coat with the Charter\'s buttons cut off, writing in a ledger on an upturned barrel. A sabre hangs on the tent pole behind her, in a scabbard that doesn\'t match it.', next: 'j2' },
    j2: { text: 'Agnes Holroyd, Sergeant-at-Muster. If you\'re here to sign, read the notice by the south stands first. If you\'ve read it, tell me what it says.', next: 'j3' },
    j3: {
      text: 'Go on.',
      options: [
        { text: 'Anyone who can hold a weapon and keep their word.', next: 'j4' },
        { text: 'Nobody drawing a wage from the Company Wardens.', next: 'j4b' },
      ],
    },
    j4: { text: 'And nobody drawing a wage from the Company Wardens. People always remember the first half.', next: 'j5' },
    j4b: { text: 'That\'s the half people forget. Good.', next: 'j5' },
    j5: { text: 'I put everybody on a test contract before their name goes in ink. Josiah Yeo had a wool cart come through the long stretch on Tuesday. His horse didn\'t.', next: 'j6' },
    j6: { text: 'Wolves, past the Waystation, before the cutting. Bring them down. Nat knows where they lie up: he rode that road six years with a number on his collar. Ask him.', effect: (g) => g.setStage(ROLL, 'nat') },
    rWait: { text: (g) => (at(g, ROLL) === 'nat' ? 'Nat. By the stands. The one looking at the road.' : `The long stretch, past the Waystation. ${Math.min(WOLVES.length, kills(g, 'musWolf'))} of ${WOLVES.length}.`) },
    r1: { text: 'Josiah sent word. Said a stranger brought down the pack and wouldn\'t take a drink for it. I said that\'s a Muster habit. It isn\'t, yet.', next: 'r2' },
    r2: { speaker: 'narrator', text: 'She turns the ledger round and holds out the pen. The roll is two pages of names, a few crossed out, most of them in the same careful hand: Coverdale, N., fourteen.', next: 'r3' },
    r3: { text: 'You\'re on the roll. Twenty marks for the contract, and the contracts on the board are yours to take.', effect: (g) => { g.setStage(ROLL, 'done'); rank(g, 0); g.addMarks(20); } },
    // II. Paid Twice
    t1: { text: 'Sit down. Not there; that barrel leaks.', next: 't2' },
    t2: { text: 'Three contracts in a month. Three carts the Muster guarded through the Kettle road, and three times the Wardens were waiting at the toll bar to inspect them. Not the carts before. Not the carts after. Ours.', next: 't3' },
    t3: { text: 'Somebody on my roll tells them which carts. Somebody I wrote down in ink.', next: 't4' },
    t4: { text: 'The Wardens are paid at the Works, by Pryce, off a list he keeps on his trestle like a man who\'s never been robbed. Go and read it. Then tell me a name.', effect: (g) => g.setStage(TWICE, 'list') },
    tWait: { text: (g) => (at(g, TWICE) === 'list' ? 'The Works. Pryce\'s trestle, by the office door.' : at(g, TWICE) === 'davy' ? 'Talk to him before you talk to me. I\'d rather hear it from you after you\'ve heard it from him.' : '') },
    tC: {
      text: 'Davy Rowe. Lamplighter, then mine, and the Wardens\' all along. Well. What do I do with him?',
      options: [
        { text: 'Strike him off. The rule is the rule.', effect: (g) => { g.setFlag('musDavy', 'struck'); g.setStage(TWICE, 'back'); }, next: 'tS' },
        { text: 'Keep him on. He tells the Wardens what we want them to hear, and nothing else.', effect: (g) => { g.setFlag('musDavy', 'turned'); g.setStage(TWICE, 'back'); }, next: 'tT' },
      ],
    },
    tS: { speaker: 'narrator', text: 'She draws one line through his name, carefully, ruler-straight, the way the Charter crossed out hers.', next: 't9' },
    tT: { text: 'A rule that bends. I\'ll hate it every day. Fine: the next three carts go by the Kettle road on paper and by the moor road in fact, and Davy carries the paper.', next: 't9' },
    t9: { text: (g) => (davy(g) === 'struck' ? 'He\'s gone. The carts get through. You\'re sworn: it means I trust you with the ones I can\'t trust.' : 'Two carts through the moor road this week, while the Wardens stood at the Kettle toll bar in the rain. You\'re sworn.'), effect: (g) => { g.setStage(TWICE, 'done'); rank(g, 1); g.addMarks(40); } },
    // III. The Long Stretch
    l1: { text: 'Read this. I\'ve read it four times and it hasn\'t got any better.', next: 'l2' },
    l2: { speaker: 'narrator', text: 'A letter from the Toll Office, signed J. Pike: the Charter will let the long stretch to the Muster, to ride and keep, at a wage, "under the Turnpike Trust of Harrowgate & Daughters, collecting on the Trust\'s behalf."', next: 'l3' },
    l3: { text: 'They want us back on the road. Collecting for Harrowgate. Paid more than the Charter ever paid us.', next: 'l4' },
    l4: { text: 'Ride it first. See who\'s on it, and what they\'d say about a Muster coat at the toll bar. Ivo Rendle keeps the Long Stretch inn; he was number nine. Then tell me.', effect: (g) => g.setStage(TOLL, 'ride') },
    lWait: { text: (g) => (at(g, TOLL) === 'ride' ? `The cutting, past the Waystation. ${Math.min(CUTTING.length, kills(g, 'musPads'))} of ${CUTTING.length} off the road.` : at(g, TOLL) === 'ivo' ? 'Ivo. The Long Stretch. Buy something; he likes to be asked properly.' : '') },
    lC: {
      text: 'Well? You\'ve ridden it. You\'ve heard Ivo. Do we put the blue coats back on and collect for Harrowgate?',
      options: [
        { text: 'Take it. The road needs riding, and the roll needs paying.', effect: (g) => { g.setFlag('musToll', 'took'); }, next: 'lT' },
        { text: 'Refuse it. A Muster coat collecting Harrowgate\'s toll is a Warden with a different button.', effect: (g) => { g.setFlag('musToll', 'refused'); }, next: 'lR' },
      ],
    },
    lT: { text: 'Then we take it, and we ride it honest, and the first time Pike asks us to stop a cart for being poor I\'ll send him the coat back with me still in it.', next: 'lE' },
    lR: { text: 'I wrote "no" on the bottom of his letter and sent it back. It took me an hour. I wanted the "no" to be very neat.', next: 'lE' },
    lE: { text: 'Corporal. The board\'s yours to read first now.', effect: (g) => { g.setStage(TOLL, 'done'); rank(g, 2); g.addMarks(60); } },
    // IV. The Muster Stands
    b1: { text: (g) => `They\'re coming. ${toll(g) === 'refused' ? 'Pike didn\'t like the neat "no".' : 'Pike says the Trust\'s Muster must be licensed like any armed company, and ours isn\'t, and the Trust is very sorry.'} The Wardens, tonight, with a paper that says they can close the tilt-yard.`, next: 'b2' },
    b2: { text: 'I can\'t fight a paper. I can stand in front of it with enough people that it has to ask again.', next: 'b3' },
    b3: { text: (g) => `The roll\'s two pages and most of them are out on contracts. Bring me who you can. ${g.flag('lampEnd') === 'kit' ? 'Sam Penna' : 'Kit Bawden'} in the Shambles owes me a favour. Ivo will come if you ask. And Clement Fry, at the Charter Arms, can read a licence better than any Warden can.`, next: 'b4' },
    b4: { text: 'Then come back, and stand where I put you.', effect: (g) => g.setStage(BANNER, 'stand') },
    bWait: { text: (g) => `${called(g)} of ${calls(g).length}. ${calls(g).filter((c) => !has(g, c.flag)).map((c) => c.name).join(' and ')} still to ask.` },
    bS0: { text: 'Everyone? Good. Then you\'re just in time. Look up the road: there are their lanterns now.', next: 'bS1' },
    bS1: { speaker: 'narrator', text: 'Twelve Company Wardens come down the tilt-yard road in step, lanterns lit, with a clerk in front holding a paper on a board.', next: 'bS2' },
    bS2: { speaker: 'narrator', text: (g) => `The roll stands across the gate: Holroyd in the middle, Nat at her shoulder, ${g.flag('lampEnd') === 'kit' ? 'Sam Penna with a ladder over his shoulder' : 'Kit Bawden with his lighting pole'}, Ivo Rendle in an apron, ${davy(g) === 'turned' ? 'Davy Rowe at the end, not looking at the Wardens he took money from,' : ''} and Clement Fry holding a book.`, next: 'bS3' },
    bS3: { text: 'Read it, then. Out loud. There are people here who can\'t read, and they\'d like to know what they\'re being closed for.', next: 'bS4' },
    bS4: { speaker: 'narrator', text: 'The clerk reads it. "An armed company in the Charter\'s towns must hold the Charter\'s licence." Clement Fry opens his book at a marked page and reads back, louder: the Charter, article nine, "save the town\'s own watch and any company of the town\'s own people raised for the keeping of the roads."', next: 'bS5' },
    bS5: {
      text: 'Article nine. The roads. That\'s us. What do you want to say to them, before they decide?',
      options: [
        { text: '"Go home. Tell Harrowgate the roads are kept."', next: 'bS6' },
        { text: '"Any of you who\'d rather keep the roads than break heads, the roll\'s open. Same rule as always."', next: 'bS6b' },
      ],
    },
    bS6: { speaker: 'narrator', text: 'For a long moment nobody moves. Then the clerk folds his paper, and the Wardens turn round in step, and go back up the road with their lanterns, a little less in step than they came.', effect: (g) => g.setStage(BANNER, 'back'), next: 'bE1' },
    bS6b: { speaker: 'narrator', text: 'The clerk folds his paper. The Wardens turn round and go back up the road with their lanterns. Two of them stay behind, unbuckle their sticks, and walk over to Holroyd\'s barrel to read the notice.', effect: (g) => { g.setFlag('musWardens', 1); g.setStage(BANNER, 'back'); }, next: 'bE1' },
    bE1: { text: (g) => (g.flag('musWardens') ? 'Two Wardens on my roll. Pryce will have a fit. I\'m going to enjoy the fit.' : 'They\'ll be back with a better paper. Let them. We\'ll be here, and so will article nine.'), next: 'bE2' },
    bE2: {
      speaker: 'narrator',
      text: 'She takes the Muster\'s banner off the tent pole, plain blue with a white road across it, and puts it in your hands.',
      next: 'bE3',
    },
    bE3: { text: 'Banneret. You carry it when we ride, and you stand in front when we\'re stood in front of. You\'ve done both.', effect: (g) => { g.setStage(BANNER, 'done'); rank(g, 3); g.addMarks(120); g.give('mus_banner_cloak', 1); } },
  },
};

// ================================================================ Nat Coverdale, number fourteen

const nat: DialogueTree = {
  start: (g) => (at(g, ROLL) === 'nat' ? 'n1' : 'idle'),
  nodes: {
    idle: { text: (g) => (done(g, BANNER) ? 'Kept the scabbard. Kept the road. Funny how it goes.' : 'Fourteen. Still answer to it.') },
    n1: { text: 'Josiah\'s horse? The pack lies up in the gorse past the Waystation, east side of the road, where the bank gives them a view both ways.', next: 'n2' },
    n2: { text: 'Six years I rode past that gorse twice a day. They never bothered a toll rider. Wolves can count buttons.', next: 'n3' },
    n3: { text: 'Go at them from the road side, not the bank. And don\'t let the big grey get behind you.', effect: (g) => g.setStage(ROLL, 'wolves') },
  },
};

// ================================================================ Davy Rowe

const davyTree: DialogueTree = {
  start: (g) => (at(g, TWICE) === 'davy' ? 'd1' : 'idle'),
  nodes: {
    idle: { text: (g) => (davy(g) === 'turned' ? 'Kettle road on paper. Moor road in fact. I can remember that.' : 'Sorry. Busy.') },
    d1: { speaker: 'narrator', text: 'A young man, thin, with a burn scar on the back of one hand from a lamp glass. He sees the copy of the pay list in your hand and sits down on the bottom bench of the stands.', next: 'd2' },
    d2: { text: 'Three shillings a week from Pryce. For telling them which carts. I never told them anything else.', next: 'd3' },
    d3: { text: 'My mother\'s rent went up when the Trust bought her row. Harrowgate owns the row. Harrowgate pays the Wardens. I worked it out on a slate: they pay me with her rent.', next: 'd4' },
    d4: { text: 'Hester would have given me a lecture. Holroyd will give me a line through my name. Go on, then. Tell her.', effect: (g) => g.setStage(TWICE, 'choose') },
  },
};

// ================================================================ Ivo Rendle, at the Long Stretch (his tree is the taverns')

const ivoNodes: Record<string, DNode> = {
  mi1: { text: 'Number nine. Six years, the long stretch and the cutting. And now Agnes wants to know if she should put the coat back on for Harrowgate.', next: 'mi2' },
  mi2: { text: 'You know what a toll rider was, to the carters? The one man on the road who was there because of them. Paid by their tolls to keep their road.', next: 'mi3' },
  mi3: { text: 'Collect for the Trust, and you\'re there because of Harrowgate. Same coat, same road. The carters will know the difference by the second week.', next: 'mi4' },
  mi4: { text: 'Tell her I said so. Tell her I also said the pay\'s good and I\'d understand. She\'ll know which one I meant.', effect: (g) => g.setStage(TOLL, 'back') },
  mc1: { text: 'Agnes is calling the roll out? To stand in front of Wardens with a paper?', next: 'mc2' },
  mc2: { text: 'I\'ll bring the bread. Nobody stands for long on an empty stomach.', effect: (g) => g.setFlag('musCallIvo', 1) },
};
const kitNodes: Record<string, DNode> = {
  mk1: { text: 'The Wardens? At the tilt-yard? Holroyd once lent me a ladder when ours broke and didn\'t ask what for. I\'ll come.', next: 'mk2' },
  mk2: { text: 'I\'ll bring the pole. It\'s not a weapon. It\'s a very long thing I happen to be holding.', effect: (g) => g.setFlag('musCallKit', 1) },
};
const samNodes: Record<string, DNode> = {
  ms1: { text: 'Holroyd. She lent Kit a ladder once, before he went. I\'ll come. Somebody has to stop you all doing something clever.', effect: (g) => g.setFlag('musCallKit', 1) },
};
const clemNodes: Record<string, DNode> = {
  mf1: { text: 'A paper. They\'re bringing a paper. Well, I can read a paper. Let me find the Charter: article nine, if I remember, and I always remember.', next: 'mf2' },
  mf2: { text: 'Tell the sergeant I\'ll be there, and I\'ll be the one holding the book.', effect: (g) => g.setFlag('musCallClem', 1) },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [ROLL]: {
    id: ROLL, name: 'Sign the Roll', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'nat' ? 'Sergeant Agnes Holroyd will put me on the Muster\'s roll after a test contract: the wolves that took a carter\'s horse on the long stretch past the Waystation. Nat Coverdale knows where they lie up.' : s === 'wolves' ? 'Nat says the pack lies up in the gorse east of the road, past the Waystation.' : s === 'back' ? 'The pack is down. Back to Holroyd.' : s === 'done' ? 'I\'m on the Muster\'s roll.' : ''),
    objectives: (g, s) => (s === 'nat' ? [{ text: 'Ask Nat Coverdale where the wolves lie up', marker: 'mus_nat' }] : s === 'wolves' ? [{ text: `Bring down the wolves on the long stretch (${Math.min(WOLVES.length, kills(g, 'musWolf'))}/${WOLVES.length})`, marker: 'musWolfSpot' }] : s === 'back' ? [{ text: 'Talk to Sergeant Holroyd at the tilt-yard', marker: 'mus_holroyd' }] : []),
    advance: (g, s) => (s === 'wolves' && kills(g, 'musWolf') >= WOLVES.length ? 'back' : null),
    marks: (g, s): Marks => (s === 'nat' ? { mus_nat: '?' } : s === 'back' ? { mus_holroyd: '?' } : {}),
    walk: { cast: ['mus_holroyd', 'mus_nat'], auto: { wolves: 'back' } },
  },
  [TWICE]: {
    id: TWICE, name: 'Paid Twice', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'list' ? 'Somebody on the Muster\'s roll tells the Company Wardens which carts it guards. Holroyd wants me to read Pryce\'s pay list at the Harrowgate Works.' : s === 'davy' ? 'Pryce\'s list pays three shillings a week to "D. Rowe, intelligence". Davy Rowe, who left the Lamplighters for the Muster. He\'s at the tilt-yard.' : s === 'choose' ? 'Davy took the Wardens\' money because Harrowgate raised his mother\'s rent. Holroyd has to decide what to do with him.' : s === 'back' ? 'Back to Holroyd.' : s === 'done' ? (davy(g) === 'struck' ? 'Davy Rowe was struck off the roll. I\'m sworn to the Muster.' : 'Davy Rowe stays on the roll and carries the Wardens what Holroyd wants them to hear. I\'m sworn to the Muster.') : ''),
    objectives: (g, s) => (s === 'list' ? [{ text: 'Read Pryce\'s pay list at the Harrowgate Works', marker: 'musPayList' }] : s === 'davy' ? [{ text: 'Talk to Davy Rowe at the tilt-yard', marker: 'mus_davy' }] : s === 'choose' || s === 'back' ? [{ text: 'Talk to Sergeant Holroyd', marker: 'mus_holroyd' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, ROLL) ? { mus_holroyd: '!' } : {}) : s === 'davy' ? { mus_davy: '?' } : s === 'choose' || s === 'back' ? { mus_holroyd: '?' } : {}),
    walk: { from: { quests: { [ROLL]: 'done' }, flags: { 'fac:muster': 0 } }, cast: ['mus_holroyd', 'mus_davy'] },
  },
  [TOLL]: {
    id: TOLL, name: 'The Long Stretch', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'ride' ? 'The Toll Office offers the Muster the long stretch, to ride and keep for Harrowgate\'s Turnpike Trust. Holroyd wants me to ride it first: there are footpads at the cutting.' : s === 'ivo' ? 'The cutting is clear. Ivo Rendle, who was toll rider number nine, keeps the Long Stretch inn at the Waystation. Holroyd wants his word.' : s === 'back' ? 'Ivo says the carters will know the difference. Back to Holroyd, to say whether the Muster takes the contract.' : s === 'done' ? (toll(g) === 'took' ? 'The Muster took the long stretch for the Trust. I\'m a corporal.' : 'The Muster refused the Trust\'s contract. I\'m a corporal.') : ''),
    objectives: (g, s) => (s === 'ride' ? [{ text: `Run the footpads off the cutting (${Math.min(CUTTING.length, kills(g, 'musPads'))}/${CUTTING.length})`, marker: 'musCutSpot' }] : s === 'ivo' ? [{ text: 'Talk to Ivo Rendle at the Long Stretch, the Waystation', marker: 'ivo' }] : s === 'back' ? [{ text: 'Talk to Sergeant Holroyd', marker: 'mus_holroyd' }] : []),
    advance: (g, s) => (s === 'ride' && kills(g, 'musPads') >= CUTTING.length ? 'ivo' : null),
    marks: (g, s): Marks => (!s ? (done(g, TWICE) ? { mus_holroyd: '!' } : {}) : s === 'ivo' ? { ivo: '?' } : s === 'back' ? { mus_holroyd: '?' } : {}),
    walk: { from: { quests: { [ROLL]: 'done', [TWICE]: 'done' }, flags: { 'fac:muster': 1, musDavy: 'turned' } }, cast: ['mus_holroyd', 'ivo'], auto: { ride: 'ivo' } },
  },
  [BANNER]: {
    id: BANNER, name: 'The Muster Stands', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'stand' ? `The Company Wardens are coming to the tilt-yard tonight with a paper to close it. Holroyd wants the roll there. ${called(g)} of ${calls(g).length} asked.` : s === 'back' ? 'The Wardens went away. Back to Holroyd.' : s === 'done' ? 'The Muster stood at the tilt-yard gate and the Wardens went home. Holroyd made me Banneret.' : ''),
    objectives: (g, s) => (s === 'stand' ? [
      ...calls(g).map((c) => ({ text: `Ask ${c.name} to stand with the Muster`, done: has(g, c.flag), marker: c.id })),
      { text: 'Stand with Holroyd at the tilt-yard', done: false, marker: 'mus_holroyd' },
    ] : s === 'back' ? [{ text: 'Talk to Sergeant Holroyd', marker: 'mus_holroyd' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, TOLL) ? { mus_holroyd: '!' } : {}) : s === 'stand' ? Object.fromEntries([...calls(g).filter((c) => !has(g, c.flag)).map((c) => [c.id, '?']), ...(called(g) >= calls(g).length ? [['mus_holroyd', '?']] : [])]) : s === 'back' ? { mus_holroyd: '?' } : {}),
    walk: { from: { quests: { [ROLL]: 'done', [TWICE]: 'done', [TOLL]: 'done' }, flags: { 'fac:muster': 2, musDavy: 'turned', musToll: 'refused' } }, cast: ['mus_holroyd', 'kit_bawden', 'sam_penna', 'ivo', 'clement'] },
  },
};

// ================================================================ The world

const spawns: QuestSpawn[] = [
  { tag: 'musWolf', type: 'wolf', at: WOLVES, when: (g) => at(g, ROLL) === 'wolves' },
  { tag: 'musPads', type: 'footpad', at: CUTTING, when: (g) => at(g, TOLL) === 'ride' },
];

const things: WorldThing[] = [
  { id: 'musWolfSpot', x: WOLVES[0][0], z: WOLVES[0][1], label: 'The gorse on the long stretch', radius: 0, look: 'none', when: () => false },
  { id: 'musCutSpot', x: CUTTING[0][0], z: CUTTING[0][1], label: 'The cutting', radius: 0, look: 'none', when: () => false },
  {
    id: 'musPayList', x: PAYLIST.x, z: PAYLIST.z, label: 'Read Pryce\'s pay list', radius: 2.4, look: 'letter',
    when: (g) => at(g, TWICE) === 'list',
    use: (g) => {
      g.setStage(TWICE, 'davy');
      g.toast('Pinned to the trestle under a stone: "Company Wardens, Ansbury, weekly." Forty names and their shillings. At the bottom, in a different ink: "D. Rowe, intelligence, 3s." The same D. Rowe who signed the Muster\'s roll a month ago.');
    },
  },
];

// ================================================================ People

const NPCS_M: NpcDef[] = [
  { id: 'mus_holroyd', name: 'Agnes Holroyd', title: 'Sergeant-at-Muster', look: { frame: 'f', skin: '#c8956a', hair: '#6a6460', hairStyle: 2, eyes: '#3a4a5a', tunic: '#2a4a8a', trim: '#c8b070', trousers: '#2a2a32', boots: '#1e1a16', cape: '#2a4a8a', lashes: true, build: 1.15, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [HOLROYD.x, HOLROYD.z], face: [HOLROYD.x - 4, HOLROYD.z - 2], anim: 'idle' }], barks: ['Read the notice.', 'Pay on the day.'] },
  { id: 'mus_nat', name: 'Nat Coverdale', title: 'The Muster, number fourteen', look: { skin: '#e2b894', hair: '#5a3a24', hairStyle: 0, beard: true, eyes: '#4a5a3a', tunic: '#2a4a8a', trim: '#8a8a8a', trousers: '#3a3430', boots: '#2a1e14', build: 1.0, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [NAT.x, NAT.z], face: [NAT.x - 4, NAT.z + 1], anim: 'idle' }], barks: ['Fourteen.', 'Wolves can count buttons.'] },
  { id: 'mus_davy', name: 'Davy Rowe', title: 'The Muster', look: { skin: '#e8c4a0', hair: '#3a2a1e', hairStyle: 3, eyes: '#4a5a6a', tunic: '#4a4a3a', trim: '#2a4a8a', trousers: '#3a3430', boots: '#2a1e14', build: 0.84, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: [DAVY.x, DAVY.z], face: [DAVY.x - 2, DAVY.z + 2], anim: 'idle' }], barks: ['Busy.'], when: (g) => davy(g) !== 'struck' },
];

const ITEMS_M: ItemDef[] = [
  { id: 'mus_banner_cloak', name: 'The Muster\'s banner', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'letter', a: '#2a4a8a', b: '#ece6d6' }, desc: 'Plain blue wool with a white road worked across it, the edges darned twice, and on the pole a ring of brass with "A. Holroyd, Sgt." scratched inside it.', stats: 'Carried by the Muster\'s Banneret. Keep it, or hang it at home.' },
];

export const MUSTER: RegionContent = {
  id: 'muster',
  items: ITEMS_M,
  npcs: NPCS_M,
  dialogue: { mus_holroyd: holroyd, mus_nat: nat, mus_davy: davyTree },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'ivo', (g) => (at(g, TOLL) === 'ivo' ? 'mi1' : at(g, BANNER) === 'stand' && !has(g, 'musCallIvo') ? 'mc1' : undefined), ivoNodes);
    hook(D, 'kit_bawden', (g) => (at(g, BANNER) === 'stand' && !has(g, 'musCallKit') ? 'mk1' : undefined), kitNodes);
    hook(D, 'sam_penna', (g) => (at(g, BANNER) === 'stand' && g.flag('lampEnd') === 'kit' && !has(g, 'musCallKit') ? 'ms1' : undefined), samNodes);
    hook(D, 'clement', (g) => (at(g, BANNER) === 'stand' && !has(g, 'musCallClem') ? 'mf1' : undefined), clemNodes);
  },
};
