import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';
import { CARNE_CROSS, CARNE_HUT } from './waits';
import { SCARROW } from '../travel';

// THE PASSING BELL: a faction you can join (data/factions.ts; owner 2026-11-14, "next work on factions and questlines for
// them"). The moor\'s old practice (data/lorebooks.ts, "What the Moor Says About Bells"): ring the passing bell at Carne
// Cross for someone the law can\'t reach, leave a coin on the sill so whoever answers knows you meant it, and the bell is
// answered. The ones who answer are moor people, a schoolmaster, a peat cutter, a widow, and the keeper of the Peat Fire,
// who has kept it lit for forty years and the bell answered for thirty. They ring a man out: his name read in every
// chapel on the moor, his door shut to him in every house, his flock let go. Sometimes worse, and that\'s the trouble.
//
// Chapters (each a rank):
//   bellRung    THE PASSING BELL (Treble): Joss Trewin heard it ring. A Kelderby wedding penny on the sill, and a name
//               scratched on a slate. Come back at night; the Second comes to answer it, and asks you what the coin is for.
//               Take the penny back to the one who rang: Morwenna Pentreath, whose sister drowned in the mere.
//   bellPrice   WHAT THE BELL COSTS (Second): Hal Pentreath, the drover, said it was an accident, and the Charter agreed.
//               Search his hut: his wife\'s ring. Take it to the Charter\'s constable (the law, which can reach him now) or
//               to the Second (the Bell\'s way: rung out). Flag bellWay = 'law' | 'bell'.
//   bellFire    THE THIRD\'S FIRE (Third): somebody rang for Aubrey Pryce, Harrowgate\'s buyer, after the roof came down in
//               Number Four. The Third means to burn his office and his books with it. Stop him, or take the pay book
//               out first and let the fire have the rest. Flag bellFire = 'stopped' | 'burned'.
//   bellTenor   THE TENOR (Tenor\'s Hand): the Tenor is Kerensa Garth, at the Peat Fire. She\'s old, and the Bell needs
//               someone to decide what it\'s for. Keep it hidden, or bring it to the moot in daylight. Flag bellEnd =
//               'hidden' | 'open'.

const RUNG = 'bellRung', PRICE = 'bellPrice', FIRE = 'bellFire', TENOR = 'bellTenor';
const SILL = { x: CARNE_CROSS.x + 0.5, z: CARNE_CROSS.z - 6.8 };
const ROPE = { x: CARNE_CROSS.x + 0.5, z: CARNE_CROSS.z - 5.4 };
const HUT_CHEST = { x: CARNE_HUT.x + 1.6, z: CARNE_HUT.z - 1.2 };
/** Morwenna at the Tor, by the peat stacks; the Second, a schoolmaster, by the Tor\'s school door; the Third at the Works. */
const MORWENNA = { x: SCARROW.x + 7.5, z: SCARROW.z - 6.5 }, SECOND_DAY = { x: SCARROW.x - 6.5, z: SCARROW.z + 5.5 };
const SECOND_NIGHT = { x: CARNE_CROSS.x + 2.2, z: CARNE_CROSS.z - 4.5 };
const THIRD = { x: 984.5, z: 1004.5 }, PAYBOOK = { x: 988.6, z: 995.6 };
const CONSTABLE = { x: SCARROW.x - 2.5, z: SCARROW.z - 8.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:bell'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:bell', r); };
const night = (g: GameApi) => { const h = g.compHour(); return h >= 21 || h < 4; };
const way = (g: GameApi) => g.flag('bellWay') as 'law' | 'bell' | undefined;
const fire = (g: GameApi) => g.flag('bellFire') as 'stopped' | 'burned' | undefined;

// ================================================================ Joss Trewin, at the Peat Fire (his tree is the taverns')

const jossNodes: Record<string, DNode> = {
  pb1: { text: 'You heard me, then. Tuesday night, bringing the ewes down off the high ground. The bell at Carne Cross. Three strokes and a wait, three and a wait.', next: 'pb2' },
  pb2: { text: 'There\'s no roof on that chapel. There\'s been no parson in it since my grandfather was a boy. And it rang the way they ring for a death.', next: 'pb3' },
  pb3: {
    text: 'Somebody pulled that rope. I\'d like to know who. I\'d also like to not be the one who finds out.',
    options: [
      { text: 'I\'ll go and look.', effect: (g) => g.setStage(RUNG, 'chapel'), next: 'pb4' },
      { text: 'Not my business.' },
    ],
  },
  pb4: { text: 'South-east of the Tor, over the second ridge. You\'ll see the gable before the rest. Take a lantern. Don\'t take a dog: they won\'t go in.' },
};

// ================================================================ Morwenna Pentreath

const morwenna: DialogueTree = {
  start: (g) => (at(g, RUNG) === 'morwenna' ? 'm1' : at(g, PRICE) === 'done' ? 'after' : 'idle'),
  nodes: {
    idle: { text: 'Peat\'s wet this year. Everything\'s wet this year.' },
    after: { text: (g) => (way(g) === 'law' ? 'They took him to Ansbury in the wagon. I stood at the door and watched it go down the road until I couldn\'t see it. Then I went in and lit a fire.' : 'His flock\'s been let go. His door\'s been shut in every house on the moor. He went east with a bag on his back. I hope the road is long.') },
    m1: { speaker: 'narrator', text: 'A woman in a peat-cutter\'s apron, the sleeves black to the elbow. When she sees the penny in your hand she puts down her spade.', next: 'm2' },
    m2: { text: 'That\'s my mother\'s wedding penny. Kelderby, the year she married. I left it on the sill.', next: 'm3' },
    m3: { text: 'My sister was Jenna. She married Hal Pentreath, the drover, against everyone. In March they found her in Gorse Mere, and Hal said she went out after the dog in the dark and the ice went.', next: 'm4' },
    m4: { text: 'The dog was in the mere too. With a stone tied to it. The constable wrote "accident" because Hal had a man to swear he was at the Tor that night, and the man owes Hal money.', next: 'm5' },
    m5: {
      text: 'So I rang the bell. And now you\'re standing here with my penny. Does that mean they answered?',
      options: [
        { text: 'It means they heard you. They sent me back with it.', next: 'm6' },
        { text: 'I don\'t know yet who they are.', next: 'm6' },
      ],
    },
    m6: { text: 'Then take it back to them. Tell them Jenna. Tell them I meant it.', effect: (g) => { g.setStage(RUNG, 'back'); } },
  },
};

// ================================================================ The Second: Wilmot Rescorla, schoolmaster

const second: DialogueTree = {
  start: (g) => {
    const r = at(g, RUNG), p = at(g, PRICE);
    if (r === 'night' && night(g)) return 's1';
    if (r === 'back') return 'r1';
    if (done(g, RUNG) && !p) return 'p1';
    if (p === 'choose') return 'pC';
    if (p === 'back') return 'pE';
    if (p && p !== 'done') return 'pWait';
    return 'idle';
  },
  nodes: {
    idle: { text: (g) => (typeof g.flag('fac:bell') === 'number' ? 'Lessons at nine. Psalms at noon. Other things after dark.' : 'Wilmot Rescorla. I teach the Tor\'s children to read, which is more than the Tor ever asked of me.') },
    // I. The Passing Bell
    s1: { speaker: 'narrator', text: 'A man in a long dark coat is standing in the nave with a shuttered lantern, looking at the slate on the sill. He doesn\'t turn when you come in.', next: 's2' },
    s2: { text: 'You\'re not the one who rang it. She left a penny. You haven\'t got the look of somebody who\'s lost a sister.', next: 's3' },
    s3: {
      text: 'So answer me this, since you\'ve come all this way in the dark. What\'s the coin for?',
      options: [
        { text: 'So whoever answers the bell knows you meant it.', next: 's4' },
        { text: 'To pay whoever answers.', next: 's4b' },
      ],
    },
    s4: { text: 'Somebody\'s grandmother talked to you. Good. Most people think we\'re for hire. We\'re not. A bell rung for money is just noise.', next: 's5' },
    s4b: { text: 'No. Nobody pays the Bell. A penny is what you leave so we know it cost you something to come. A bell rung for money is just noise.', next: 's5' },
    s5: { text: 'Wilmot Rescorla. I teach the children at the Tor in the day. At night I\'m the Second, which is a bell, and a man who answers it.', next: 's6' },
    s6: { text: 'Take the penny back to her. Morwenna Pentreath, at the Tor, by the peat stacks. Hear her out. Then come and tell me, at the school.', effect: (g) => { g.give('bell_penny', 1); g.setStage(RUNG, 'morwenna'); } },
    r1: { text: 'Jenna Pentreath. Gorse Mere. I knew it would be, the day the constable wrote "accident" on her.', next: 'r2' },
    r2: { text: 'You did a thing tonight without being paid and without being asked twice. That\'s the only test there is.', next: 'r3' },
    r3: { text: 'You\'re the Treble now: the smallest bell, the first to sound. Keep the penny. Nobody else will ever know what it means.', effect: (g) => { g.setStage(RUNG, 'done'); rank(g, 0); g.addMarks(30); } },
    // II. What the Bell Costs
    p1: { text: 'The Bell doesn\'t act on a grief. It acts on a fact. Hal Pentreath\'s hut is below Carne Cross, east, on the slope. He\'s at Ansbury market till Thursday.', next: 'p2' },
    p2: { text: 'Find me something the constable couldn\'t write "accident" on.', effect: (g) => g.setStage(PRICE, 'hut') },
    pWait: { text: (g) => (at(g, PRICE) === 'hut' ? 'His hut. East of the chapel, down the slope. Turf roof, door to the wind.' : at(g, PRICE) === 'constable' ? 'The constable\'s at the Tor\'s lock-up. Don\'t let him tell you it\'s too late. It isn\'t.' : '') },
    pC: { speaker: 'narrator', text: 'He turns the ring over in his fingers. Inside it, very small: "J. & H., Lady Day".', next: 'pC2' },
    pC2: {
      text: 'Jenna\'s. She never took it off, Morwenna says. And it was in his chest, under his good shirt. Now: who gets it? The constable, or us?',
      options: [
        { text: 'The constable. The law can reach him now. Let it.', effect: (g) => { g.setFlag('bellWay', 'law'); g.setStage(PRICE, 'constable'); }, next: 'pL' },
        { text: 'The Bell. Ring him out.', effect: (g) => { g.setFlag('bellWay', 'bell'); g.take('bell_ring', 1); g.setStage(PRICE, 'back'); }, next: 'pB' },
      ],
    },
    pL: { text: 'Then take it to him yourself. If I walk into the lock-up with it, he\'ll ask how a schoolmaster came by a drowned woman\'s ring.' },
    pB: { text: 'Then on Sunday his name is read in every chapel on the moor. Monday, no house will open its door to him. His flock is let out on the high ground for whoever will have them. Nobody touches him. Nobody needs to.', next: 'pB2' },
    pB2: { speaker: 'narrator', text: 'He says it gently, the way he\'d read a lesson, and that\'s what stays with you on the walk back.', next: 'pE' },
    pE: { text: (g) => (way(g) === 'law' ? 'The wagon took him on Tuesday. Morwenna watched it go. You\'re the Second now, and I\'m glad of it.' : 'He went east on Monday with a bag on his back. Morwenna lit a fire. You\'re the Second now.'), effect: (g) => { g.setStage(PRICE, 'done'); rank(g, 1); g.addMarks(60); } },
  },
};

// ================================================================ The Tor\'s constable

const constable: DialogueTree = {
  start: (g) => (at(g, PRICE) === 'constable' ? 'c1' : 'idle'),
  nodes: {
    idle: { text: 'Constable of the Tor. If it\'s sheep, see the reeve. If it\'s anything else, see me, and I hope it\'s sheep.' },
    c1: { speaker: 'narrator', text: 'He looks at the ring for a long time, and then at the page in his book where he wrote "accident" in March.', next: 'c2' },
    c2: { text: 'Where did you get this? No. Don\'t tell me. I\'ll say it was handed in.', next: 'c3' },
    c3: { text: 'Joby Treen swore Hal was at the Tor that night. Joby owes Hal eleven pounds. I\'ll have Joby in, and I\'ll have Hal off the Ansbury coach on Thursday. I should have done it in March.', effect: (g) => { g.take('bell_ring', 1); g.setStage(PRICE, 'back'); } },
  },
};

// ================================================================ The Third: Elias Bunt, at the Works

const third: DialogueTree = {
  start: (g) => (at(g, FIRE) === 'works' ? 'w1' : at(g, FIRE) === 'choose' ? 'wC' : 'idle'),
  nodes: {
    idle: { text: (g) => (fire(g) === 'burned' ? 'Paper burns. Men don\'t forget.' : 'Third bell. Deepest but one.') },
    w1: { speaker: 'narrator', text: 'A big man in a miner\'s jacket with a can of lamp oil at his feet, in the shadow of the Works office, watching the lit window where Pryce works late.', next: 'w2' },
    w2: { text: 'Kerensa sent you. Kerensa thinks I need watching. Kerensa\'s right.', next: 'w3' },
    w3: { text: 'Number Four came down at Candlemas. Coll Bray told Pryce the props were rotten in Michaelmas, and Pryce let Bray go for saying it. Three men under it. Bet Hollis rang the bell for her husband.', next: 'w4' },
    w4: { text: 'Pryce keeps the pay book in there. Every prop he didn\'t buy is in it as a shilling saved. I\'m going to burn the book and the office round it, and him too if he\'s slow.', next: 'w5' },
    w5: { text: 'Go on, then. Tell me the Bell doesn\'t do that.', effect: (g) => g.setStage(FIRE, 'book') },
    wC: {
      text: 'You\'ve got the book. Then there\'s nothing in there worth burning, is there.',
      options: [
        { text: 'No fire. The book goes to Bet Hollis, and to the Charter with her. Every shilling of it.', effect: (g) => { g.setFlag('bellFire', 'stopped'); g.setStage(FIRE, 'back'); }, next: 'wS' },
        { text: 'Burn the office. Pryce is out by the back. The book\'s safe with me.', effect: (g) => { g.setFlag('bellFire', 'burned'); g.setStage(FIRE, 'back'); }, next: 'wB' },
      ],
    },
    wS: { text: 'A book. To the Charter. You think the Charter reads?', next: 'wS2' },
    wS2: { speaker: 'narrator', text: 'But he picks up the can, and walks away with it, and you hear him pour it out into the ditch by the gate, all of it.' },
    wB: { speaker: 'narrator', text: 'The office goes up in a quarter of an hour. Pryce stands in the yard in his shirt and watches it, and nobody at the Works goes to fetch water. In the morning the yard is quiet in a new way.' },
  },
};

// ================================================================ Kerensa Garth, keeper of the Peat Fire (her tree is the taverns')

const kerensaNodes: Record<string, DNode> = {
  // III. The Third\'s Fire (she sends you)
  kf1: { text: 'Shut the door. Sit by the fire, not in front of it. You\'re the Second, Wilmot tells me. Then you can hear this.', next: 'kf2' },
  kf2: { text: 'Somebody rang for Aubrey Pryce. Elias Bunt, our Third, has gone down to the Works with a can of oil, and Elias doesn\'t carry oil to look at it.', next: 'kf3' },
  kf3: { text: 'Go after him. The Works, by the office. Do what you think the Bell should do. I\'ll know by the morning which it was.', effect: (g) => g.setStage(FIRE, 'works') },
  kfE: { text: (g) => (fire(g) === 'stopped' ? 'Bet Hollis has the book. A Charter clerk came up from Ansbury to copy it, white as paper. Elias poured his oil in a ditch. You\'re the Third now. I\'m proud of you, and I don\'t say that.' : 'The office is ash. Pryce is in Ansbury telling anyone who\'ll listen. Bet Hollis has the book. You\'re the Third now. We\'ll talk about the fire, you and I, one day.'), effect: (g) => { g.setStage(FIRE, 'done'); rank(g, 2); g.addMarks(90); } },
  // IV. The Tenor
  kt1: { speaker: 'narrator', text: 'She doesn\'t get up. She puts another turf on the fire, square, the way it\'s been put on for a hundred and fifty years.', next: 'kt2' },
  kt2: { text: 'You\'ve guessed. I can see it on you. Forty years I\'ve kept this fire. Thirty I\'ve answered the bell. I\'m the Tenor.', next: 'kt3' },
  kt3: { text: 'The Tenor decides. Which names, and what for, and when to stop. I\'ve decided wrong twice. I\'ve buried one of those mistakes and I visit the other every Lady Day.', next: 'kt4' },
  kt4: { text: 'I\'m old. The Bell needs a hand that isn\'t mine, and somebody to decide what it\'s for after me.', next: 'kt5' },
  kt5: {
    text: 'Do we stay in the dark, the way it\'s always been? Or do we go to the moot at the Tor, and ring for people in daylight, and let anyone see who answers?',
    options: [
      { text: 'Stay in the dark. The day the Bell has a door, the Charter will put a lock on it.', effect: (g) => g.setFlag('bellEnd', 'hidden'), next: 'ktH' },
      { text: 'Daylight. Anything that only works in the dark is half afraid of itself.', effect: (g) => g.setFlag('bellEnd', 'open'), next: 'ktO' },
    ],
  },
  ktH: { text: 'Then the coin stays on the sill, and the rope stays where only the moor knows it. Wilmot will be relieved. Elias will be pleased, which worries me.', next: 'ktE' },
  ktO: { text: 'The moot. Saints. Wilmot will write it all down and call it a constitution, and I\'ll have to listen to him read it. Very well. The first name rung in daylight, I\'ll ring myself.', next: 'ktE' },
  ktE: { speaker: 'narrator', text: 'She takes a cord from round her neck. On it is a small bronze clapper, worn smooth, from a bell much smaller than the one at Carne Cross.', next: 'ktE2' },
  ktE2: { text: 'The Tenor\'s Hand. It was mine. Ring with it when I can\'t.', effect: (g) => { g.setStage(TENOR, 'done'); rank(g, 3); g.addMarks(150); g.give('bell_clapper', 1); } },
};
const kerensaPick = (g: GameApi): string | undefined => {
  if (done(g, PRICE) && !at(g, FIRE)) return 'kf1';
  if (at(g, FIRE) === 'back') return 'kfE';
  if (done(g, FIRE) && !at(g, TENOR)) return 'kt1';
  return undefined;
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [RUNG]: {
    id: RUNG, name: 'The Passing Bell', region: 'tolmen', depth: 'storyline',
    notes: (g, s) => (s === 'chapel' ? 'Joss Trewin heard the bell at Carne Cross ring for a death, in a chapel with no roof and no parson. South-east of Scarrow Tor, over the second ridge.' : s === 'night' ? 'A wedding penny on the bell\'s sill, and a name scratched on a slate: "Jenna". Whoever answers comes in the dark. Come back at night.' : s === 'morwenna' ? 'Wilmot Rescorla, the Second, answered. He wants the penny taken back to Morwenna Pentreath, at Scarrow Tor, by the peat stacks.' : s === 'back' ? 'Morwenna rang for her sister Jenna, drowned in Gorse Mere; her husband Hal said it was an accident. Back to Wilmot.' : s === 'done' ? 'I\'m the Treble of the Passing Bell.' : ''),
    objectives: (g, s) => (s === 'chapel' ? [{ text: 'Find the chapel at Carne Cross, south-east of Scarrow Tor', marker: 'bellSill' }] : s === 'night' ? [{ text: 'At night, wait in the chapel at Carne Cross', marker: 'bell_second' }] : s === 'morwenna' ? [{ text: 'Take the penny to Morwenna Pentreath at Scarrow Tor', marker: 'bell_morwenna' }] : s === 'back' ? [{ text: 'Find Wilmot Rescorla', marker: 'bell_second' }] : []),
    marks: (g, s): Marks => (!s ? (at(g, 'otCroup') === 'done' ? { josstre: '!' } : {}) : s === 'chapel' ? {} : s === 'night' ? { bell_second: '?' } : s === 'morwenna' ? { bell_morwenna: '?' } : s === 'back' ? { bell_second: '?' } : {}),
    walk: { from: { quests: { otCroup: 'done' } }, cast: ['josstre', 'bell_second', 'bell_morwenna'], auto: { night: 'morwenna' } },
  },
  [PRICE]: {
    id: PRICE, name: 'What the Bell Costs', region: 'tolmen', depth: 'storyline',
    notes: (g, s) => (s === 'hut' ? 'The Bell acts on a fact, not a grief. Hal Pentreath\'s hut is east of Carne Cross; he\'s at Ansbury market. Search it.' : s === 'choose' ? 'Jenna\'s ring, "J. & H., Lady Day", in Hal\'s chest under his good shirt. Wilmot asks: the constable, or the Bell?' : s === 'constable' ? 'I\'m taking Jenna\'s ring to the constable at Scarrow Tor.' : s === 'back' ? 'Back to Wilmot.' : s === 'done' ? (way(g) === 'law' ? 'The constable took Hal Pentreath off the Ansbury coach. I\'m the Second of the Passing Bell.' : 'Hal Pentreath was rung out: his name read in every chapel, every door shut. I\'m the Second of the Passing Bell.') : ''),
    objectives: (g, s) => (s === 'hut' ? [{ text: 'Search Hal Pentreath\'s hut, below Carne Cross', marker: 'bellChest' }] : s === 'choose' || s === 'back' ? [{ text: 'Talk to Wilmot Rescorla', marker: 'bell_second' }] : s === 'constable' ? [{ text: 'Take the ring to the constable at Scarrow Tor', marker: 'bell_constable' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, RUNG) ? { bell_second: '!' } : {}) : s === 'choose' || s === 'back' ? { bell_second: '?' } : s === 'constable' ? { bell_constable: '?' } : {}),
    walk: { from: { quests: { [RUNG]: 'done' }, flags: { 'fac:bell': 0 } }, cast: ['bell_second', 'bell_constable'] },
  },
  [FIRE]: {
    id: FIRE, name: 'The Third\'s Fire', region: 'tolmen', depth: 'storyline',
    notes: (g, s) => (s === 'works' ? 'Someone rang for Aubrey Pryce after the roof fell in Number Four. Elias Bunt, the Third, has gone to the Harrowgate Works with a can of oil. Kerensa Garth at the Peat Fire sent me after him.' : s === 'book' ? 'Elias means to burn Pryce\'s office with the pay book in it. If I take the book first, there\'s nothing in there worth burning.' : s === 'choose' ? 'I have Pryce\'s pay book. Back to Elias.' : s === 'back' ? 'Back to Kerensa at the Peat Fire.' : s === 'done' ? (fire(g) === 'stopped' ? 'Elias poured his oil in a ditch, and Bet Hollis has the book. I\'m the Third of the Passing Bell.' : 'Pryce\'s office burned. Bet Hollis has the book. I\'m the Third of the Passing Bell.') : ''),
    objectives: (g, s) => (s === 'works' ? [{ text: 'Find Elias Bunt at the Harrowgate Works, by the office', marker: 'bell_third' }] : s === 'book' ? [{ text: 'Take Pryce\'s pay book from his trestle', marker: 'bellPaybook' }] : s === 'choose' ? [{ text: 'Talk to Elias Bunt', marker: 'bell_third' }] : s === 'back' ? [{ text: 'Talk to Kerensa Garth at the Peat Fire', marker: 'kerensa' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, PRICE) ? { kerensa: '!' } : {}) : s === 'works' || s === 'choose' ? { bell_third: '?' } : s === 'back' ? { kerensa: '?' } : {}),
    walk: { from: { quests: { [RUNG]: 'done', [PRICE]: 'done' }, flags: { 'fac:bell': 1, bellWay: 'law' } }, cast: ['kerensa', 'bell_third'] },
  },
  [TENOR]: {
    id: TENOR, name: 'The Tenor', region: 'tolmen', depth: 'storyline',
    notes: (g, s) => (s === 'done' ? (g.flag('bellEnd') === 'open' ? 'Kerensa Garth is the Tenor. The Bell goes to the moot in daylight now. She gave me her clapper: I\'m the Tenor\'s Hand.' : 'Kerensa Garth is the Tenor. The Bell stays in the dark. She gave me her clapper: I\'m the Tenor\'s Hand.') : ''),
    objectives: () => [{ text: 'Talk to Kerensa Garth at the Peat Fire', marker: 'kerensa' }],
    marks: (g, s): Marks => (!s && done(g, FIRE) ? { kerensa: '!' } : {}),
    walk: { from: { quests: { [RUNG]: 'done', [PRICE]: 'done', [FIRE]: 'done' }, flags: { 'fac:bell': 2, bellWay: 'bell', bellFire: 'stopped' } }, cast: ['kerensa'] },
  },
};

// ================================================================ Things

const things: WorldThing[] = [
  {
    id: 'bellSill', x: SILL.x, z: SILL.z, label: 'Look at the sill under the bell', radius: 2.4, look: 'coins',
    when: (g) => at(g, RUNG) === 'chapel',
    use: (g) => { g.setStage(RUNG, 'night'); g.toast('A copper penny on the slate, worn thin, Kelderby stamped on it. Beside it, a slate with a name scratched in, deep: "Jenna". The rope hangs down from the frame, frayed, and recently handled. Whoever answers a bell comes in the dark. Come back at night.'); },
  },
  {
    id: 'bellRope', x: ROPE.x, z: ROPE.z, label: 'Wait in the dark', radius: 2.4, look: 'none',
    when: (g) => at(g, RUNG) === 'night' && !night(g),
    use: (g) => g.toast('Not yet. Whoever answers comes after nine, when the Tor\'s abed.'),
  },
  {
    id: 'bellChest', x: HUT_CHEST.x, z: HUT_CHEST.z, label: 'Search the drover\'s chest', radius: 2.4, look: 'none',
    when: (g) => at(g, PRICE) === 'hut',
    use: (g) => { g.give('bell_ring', 1); g.setStage(PRICE, 'choose'); g.toast('Shirts, a razor, a drover\'s licence, and under the good shirt, folded in a handkerchief, a gold ring. Inside it, very small: "J. & H., Lady Day".'); },
  },
  {
    id: 'bellPaybook', x: PAYBOOK.x, z: PAYBOOK.z, label: 'Take Pryce\'s pay book', radius: 2.4, look: 'letter',
    when: (g) => at(g, FIRE) === 'book',
    use: (g) => { g.give('bell_paybook', 1); g.setStage(FIRE, 'choose'); g.toast('A ledger bound in green cloth, under a lamp. You turn to Number Four: "props, oak, 9 ft, deferred", every month from Michaelmas, each with a shilling saved beside it in Pryce\'s small hand.'); },
  },
];

// ================================================================ People and things

const NPCS_B: NpcDef[] = [
  { id: 'bell_morwenna', name: 'Morwenna Pentreath', title: 'Peat cutter', look: { frame: 'f', skin: '#d8a882', hair: '#3a2a1e', hairStyle: 2, eyes: '#4a5a3a', tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#2a2622', boots: '#1e1a16', apron: true, lashes: true, build: 1.0, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [MORWENNA.x, MORWENNA.z], face: [MORWENNA.x - 3, MORWENNA.z], anim: 'idle' }], barks: ['Cut it wet.'] },
  { id: 'bell_second', name: 'Wilmot Rescorla', title: 'Schoolmaster, Scarrow Tor', look: { skin: '#e8c4a0', hair: '#6a6460', hairStyle: 1, eyes: '#3a3a42', tunic: '#1e1e24', trim: '#5a5a62', trousers: '#1e1e24', boots: '#141418', cape: '#1e1e24', build: 0.86, height: 1.06, age: 0.55 },
    schedule: [{ from: 4, to: 21, at: [SECOND_DAY.x, SECOND_DAY.z], face: [SECOND_DAY.x + 3, SECOND_DAY.z], anim: 'idle' }, { from: 21, to: 4, at: [SECOND_NIGHT.x, SECOND_NIGHT.z], face: [SILL.x, SILL.z], anim: 'idle' }], barks: ['Lessons at nine.'] },
  { id: 'bell_constable', name: 'Constable Treen', title: 'Constable of the Tor', look: { skin: '#c8956a', hair: '#4a3a2a', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#2a3a5a', trim: '#c8b070', trousers: '#2a2a32', boots: '#1e1a16', build: 1.1, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [CONSTABLE.x, CONSTABLE.z], face: [CONSTABLE.x, CONSTABLE.z + 3], anim: 'idle' }], barks: ['Sheep? See the reeve.'] },
  { id: 'bell_third', name: 'Elias Bunt', title: 'Miner', look: { skin: '#c89070', hair: '#2a1a12', hairStyle: 0, beard: true, eyes: '#3a3a2a', tunic: '#3a3430', trim: '#6a5a3a', trousers: '#2a2622', boots: '#1e1a16', build: 1.25, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [THIRD.x, THIRD.z], face: [PAYBOOK.x, PAYBOOK.z], anim: 'idle' }], barks: ['Deepest but one.'], when: (g) => at(g, FIRE) === 'works' || at(g, FIRE) === 'book' || at(g, FIRE) === 'choose' },
];

const ITEMS_B: ItemDef[] = [
  { id: 'bell_penny', name: 'A Kelderby wedding penny', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'coin', a: '#b8873a' }, desc: 'Copper, worn thin, Kelderby stamped on one side and a pair of joined hands on the other. Left on a sill for a bell to answer.' },
  { id: 'bell_ring', name: 'Jenna Pentreath\'s ring', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'coin', a: '#d8b048' }, desc: 'A gold band, plain. Inside, very small: "J. & H., Lady Day".' },
  { id: 'bell_paybook', name: 'Pryce\'s pay book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#3a5a3a', b: '#e8dcc0' }, desc: 'Green cloth, Harrowgate & Daughters on the spine. "Props, oak, 9 ft, deferred", month after month, with a shilling saved beside each.' },
  { id: 'bell_clapper', name: 'The Tenor\'s clapper', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'coin', a: '#a8783a', b: '#3a2a1a' }, desc: 'A small bronze clapper on a cord, worn smooth by thirty years of a hand closing round it. It came out of a bell much smaller than the one at Carne Cross.', stats: 'Carried by the Tenor\'s Hand of the Passing Bell.' },
];

export const PASSING_BELL: RegionContent = {
  id: 'passingBell',
  items: ITEMS_B,
  npcs: NPCS_B,
  dialogue: { bell_morwenna: morwenna, bell_second: second, bell_constable: constable, bell_third: third },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'josstre', (g) => (!at(g, RUNG) ? 'pb1' : undefined), jossNodes);
    hook(D, 'kerensa', kerensaPick, kerensaNodes);
  },
};
