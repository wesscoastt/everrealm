import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import { CALLIS_FLOOR, CALLIS_PACKET, CALLIS_QUAY_X, CALLIS_SPOTS, CALLIS_TOWERS } from '../../world/morrow';
import { actThreeDone } from './actThree';

// CALLIS, the Assembly city on Morrow's Bright Coast (world/sites.ts buildCallis, docs/MORROW.md).
// Its people have Morrow's own names, short and plain: Ferrer, Oms, Sala, Vidal, Mas, Coll, Roig.
//
// THE THIRD DAUGHTER, chapters XVII and XVIII. After the Drowned Parish, a Morrow ship comes into
// Gullmouth half-crewed, and her master asks after a Harrowgate ship, the Third Daughter. Aubrey
// Pryce sailed on her while the player was at Holmsey, as the company's buyer, with Delia
// Harrowgate's signature on his papers. Delia pays the player's passage to find out what her name
// is on. In Callis: the Third Daughter came in, and her buyer went straight to the Assembly. The
// Assembly's Works Committee has bought nine hundred weight of the black since midsummer, against
// forty in a usual year, from "A. Pryce, for Harrowgate & Daughters", delivered by the Kittiwake.
// The towers of Callis are lifting as the white in their old walls settles, and the Assembly is
// pinning them down with black as fast as it can buy it. The Speaker admits the Kittiwake is a
// Brethren hull out of Saltpenny Key, and that Pryce went south with them.
//
// Quests: tdCrew (XVII, from Nessa Crane at Gullmouth once the Drowned Parish is done), tdCallis
// (XVIII), tdJoan (Joan Harrowgate pays separately, and wants the towers measured), callisLetters
// (three letters off the packet, for people up in the city). Flag tdPassage: Delia has paid for the
// player's crossings on the Constant (data/content/packet.ts).

const CREW = 'tdCrew', CAL = 'tdCallis', JOANQ = 'tdJoan', LET = 'callisLetters';
const ACT = 'The Third Daughter';
const F = CALLIS_FLOOR;
const P = CALLIS_SPOTS.plaza, M = CALLIS_SPOTS.market, T = CALLIS_SPOTS.temple;
const QX = CALLIS_QUAY_X;
type TowerId = keyof typeof CALLIS_TOWERS;
const TOWER_IDS = Object.keys(CALLIS_TOWERS) as TowerId[];
/** What each gauge reads: how far the tower has lifted off its midsummer mark. */
const READING: Record<TowerId, string> = { old: 'two fingers', morning: 'a finger and a half', evening: 'a finger' };
const read = (g: GameApi) => TOWER_IDS.filter((t) => g.flag('gauge:' + t)).length;
/** The letters' people, and whether each has had theirs. */
const POSTED = ['isidre_mas', 'jaume_roig', 'marta_vidal'] as const;
const delivered = (g: GameApi) => POSTED.filter((n) => g.flag('letter:' + n)).length;
const letterFor = (g: GameApi, who: typeof POSTED[number]) => at(g, LET) === 'deliver' && !g.flag('letter:' + who) && g.count('packet_letter') > 0;
const hand = (who: typeof POSTED[number]) => (g: GameApi) => { g.take('packet_letter', 1); g.setFlag('letter:' + who, true); };

// ================================================================ Chapter XVII, in the Counties

const nessaNodes: Record<string, DNode> = {
  td_n1: { text: 'A Morrow ship came in on the morning tide. The Good Return. Half her crew, and a hold full of passengers from the north.', next: 'td_n2' },
  td_n2: { text: 'They paid in Morrow silver and won\'t say what they left. One asked the way to the Charter\'s office before his feet were dry.', next: 'td_n3' },
  td_n3: { text: 'Her master asked after a Harrowgate ship. The Third Daughter. She went up the Morrow coast in the summer and hasn\'t come back down it.', next: 'td_n4' },
  td_n4: {
    text: 'Harrowgate doesn\'t keep ships. It keeps Pryce. Delia Harrowgate should hear this from someone who isn\'t me.',
    options: [
      { text: 'I\'ll tell Delia.', next: 'td_n6', effect: (g) => g.setStage(CREW, 'delia') },
      { text: 'Why not you?', next: 'td_n5' },
      { text: 'Not now.' },
    ],
  },
  td_n5: { text: 'Because the last time I told a Harrowgate anything, I spent a month arguing about a parish. Go on.', next: 'td_n4' },
  td_n6: { text: 'She\'s at the Works. Tell her the Good Return\'s master asked after the Third Daughter. She\'ll know what it means.' },
  td_nWait: { text: 'Delia\'s at the Works. Tell her what the Good Return\'s master asked. Then I don\'t have to.' },
};

const deliaNodes: Record<string, DNode> = {
  td_d1: { text: 'The Third Daughter. Sit down.', next: 'td_d2' },
  td_d2: { text: 'After the sitting, Aubrey Pryce came to me with a plan. He always comes with a plan.', next: 'td_d3' },
  td_d3: { text: 'Morrow buys crystal, he said. Buy it there, sell it there, and the Charter can\'t touch a mark of it.', next: 'td_d4' },
  td_d4: { text: 'I signed his papers. One ship, one season, a buyer\'s commission. She sailed while you were down at Holmsey, with him aboard.', next: 'td_d5' },
  td_d5: { text: 'I\'ve had one letter, from Callis. It was about the weather. Pryce has never written to anyone about the weather.', next: 'td_d6' },
  td_d6: {
    text: 'My name is on something over there. I want to know what before someone else tells me. I\'ll pay your passage.',
    options: [
      { text: 'I\'ll go to Callis.', next: 'td_d7', effect: (g) => { g.setFlag('tdPassage', true); g.setStage(CREW, 'cross'); } },
      { text: 'What if I find him?', next: 'td_d8' },
      { text: 'Not yet.' },
    ],
  },
  td_d7: { text: 'Hal Sennen runs the packet from Gullmouth. He knows the fare\'s mine. Don\'t let him charge you twice; he\'ll try.' },
  td_d8: { text: 'Then ask him what he\'s bought with my name. If he tells you, I\'ll want it in writing. If he doesn\'t, I\'ll want that in writing too.', next: 'td_d6' },
  td_dWait: { text: 'Hal Sennen, at Gullmouth. The Constant. My account.' },
};

// Joan pays too, separately, and wants the towers measured
const joanNodes: Record<string, DNode> = {
  td_j1: { text: 'You\'re going to Morrow. Delia told nobody, so everybody knows.', next: 'td_j2' },
  td_j2: { text: 'I\'ve read the travellers. Their towers stand on the white. If they\'re as old as they say, the white in them is settling.', next: 'td_j3' },
  td_j3: { text: 'Settled crystal lifts. Ask anyone at the Weatherholms. If Morrow is buying, it\'s buying weight to hold something down.', next: 'td_j4' },
  td_j4: { text: 'Here. Forty marks, and a plumb bob of mine. Delia\'s paying your passage. This is me. She doesn\'t need to hear about it.', next: 'td_j5', effect: (g) => { g.addMarks(40); g.give('joan_plumb'); g.setStage(JOANQ, 'measure'); } },
  td_j5: { text: 'Find out if their towers are moving. Then write and tell me. Numbers, not adjectives.' },
  td_jWait: { text: 'Numbers, not adjectives. Write when you have them.' },
  td_jDone: { text: 'Your letter came. Two fingers in a summer. I read it three times and then I went and sat down.' },
};

// ================================================================ Chapter XVIII, Callis

const pau: DialogueTree = {
  start: (g) => (at(g, CREW) === 'cross' ? 'p1' : at(g, LET) === 'back' ? 'pl3' : 'p0'),
  nodes: {
    p0: {
      text: (g) => (at(g, CAL) === 'done' ? 'Brethren hulls in my harbour on Assembly paper. I\'d have liked to be told.' : 'Pau Ferrer, harbourmaster. Mind the bollards. The black ones don\'t move for anyone.'),
      options: [
        { text: 'Anything need carrying up into the city?', next: 'pl1', cond: (g) => !at(g, LET) },
        { text: 'I have a letter for the Counties. For Joan Harrowgate.', next: 'pj1', cond: (g) => at(g, JOANQ) === 'write' },
        { text: 'What\'s Callis like?', next: 'p6' },
        { text: 'Bye.' },
      ],
    },
    p1: { text: 'Pau Ferrer, harbourmaster. If you\'ve come off the Constant, your boots are wet and your purse is still on you. Keep it that way.', next: 'p2' },
    p2: {
      text: 'What can I do for you?',
      options: [
        { text: 'I\'m asking after a Harrowgate ship, the Third Daughter.', next: 'p3' },
        { text: 'I have a letter for the Counties. For Joan Harrowgate.', next: 'pj1', cond: (g) => at(g, JOANQ) === 'write' },
        { text: 'What\'s Callis like?', next: 'p6' },
      ],
    },
    p3: { text: 'The Third Daughter. Came in at midsummer and tied up at the third pier. Her buyer was off her before the lines were made fast.', next: 'p4' },
    p4: { text: 'A long man in a grey coat. Asked me the way to the Assembly, and nothing else. They usually ask where to eat.', next: 'p5' },
    p5: { text: 'She sailed two days later, riding high. Whatever she brought, she left here. If anyone wrote it down, it was the Assembly\'s clerks.', effect: (g) => g.setStage(CREW, 'done') },
    p6: { text: 'Loud, white, and older than it looks. The towers are the Assembly\'s. The Market\'s over the river.', next: 'p7' },
    p7: { text: 'Don\'t buy anything from a man who says it fell off a ship. It didn\'t fall.' },
    pj1: { text: 'Harrowgate? On the Constant tonight, then. Sennen hands them in at Gullmouth himself. He likes to be thanked.', effect: (g) => g.setStage(JOANQ, 'done') },
    pl1: { text: 'Three letters came over on the Constant, for people who never come down to the harbour. You\'re going up anyway.', next: 'pl2' },
    pl2: { text: 'Isidre Mas at the Hall of the Two Stones. Jaume Roig in the Market. Marta Vidal in the Old Tower. Come back and I\'ll pay you.', effect: (g) => { g.give('packet_letter', 3); g.setStage(LET, 'deliver'); } },
    pl3: { text: 'All three? Then the harbour owes you, and the harbour pays.', effect: (g) => { g.addMarks(60); g.setStage(LET, 'done'); } },
  },
};

const clara: DialogueTree = {
  start: (g) => (at(g, CAL) === 'clerk' ? 'c1' : at(g, CAL) && at(g, CAL) !== 'done' ? 'cWait' : 'c0'),
  nodes: {
    c0: { text: 'Clara Oms, clerk to the Works Committee. If you\'re here to petition, the book opens on the first of the month.' },
    c1: { text: 'Clara Oms, clerk to the Works Committee. If you\'re here to petition, the book opens on the first of the month.', next: 'c2' },
    c2: {
      text: 'Unless you\'re not.',
      options: [
        { text: 'I\'m asking about a Harrowgate buyer. Aubrey Pryce.', next: 'c3' },
        { text: 'Another time.' },
      ],
    },
    c3: { text: 'Pryce. Yes.', next: 'c3b' },
    c3b: { speaker: 'narrator', text: 'She looks along the colonnade, then opens the book she\'s holding at a ribbon and turns it round for you.', next: 'c4' },
    c4: { text: 'Since midsummer the Committee has bought nine hundred weight of the black. In a usual year we buy forty, for repairs.', next: 'c5' },
    c5: { text: 'Seller: A. Pryce, for Harrowgate and Daughters. The price is high. The Speaker approved every line in his own hand.', next: 'c6' },
    c6: { text: 'Delivered by the Kittiwake. That isn\'t a Harrowgate ship. I don\'t know whose she is. I wasn\'t asked to know.', next: 'c7' },
    c7: { text: 'Take a copy. I copy what I\'m given. I\'m not given much else.', next: 'c8', effect: (g) => g.give('committee_lines') },
    c8: { text: 'If you want to know why the Assembly needs that much of anything, ask the Warden. Marta Vidal, in the Old Tower. The tall one.', effect: (g) => g.setStage(CAL, 'warden') },
    cWait: { text: 'Nine hundred weight. I wrote the lines myself and I still have to read them twice.' },
  },
};

const marta: DialogueTree = {
  start: (g) => {
    const s = at(g, CAL);
    if (letterFor(g, 'marta_vidal')) return 'mLetter';
    if (s === 'warden') return 'm1';
    if (s === 'gauges') return 'mGauges';
    if (s === 'back') return 'mm1';
    if (s === 'speaker') return 'mSpeaker';
    return 'm0';
  },
  nodes: {
    m0: {
      text: (g) => (at(g, CAL) === 'done' ? 'Two fingers in a summer. I measure every morning now, and every morning I hope I\'ve read it wrong.' : 'Marta Vidal, Warden of the Towers. If you\'re lost, the plaza\'s south. Everyone\'s lost here the first day.'),
      options: [{ text: 'The griffins in the eyrie?', next: 'mEyrie' }, { text: 'Bye.' }],
    },
    mEyrie: { text: 'The Old Tower\'s eyrie. I measure them too. I sell one now and then, to someone the coast thinks well of. Very well of.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('marta_vidal') }, { text: 'Bye.' }] },
    m1: { text: 'Marta Vidal. I keep the towers standing. This year that means keeping them sitting down.', next: 'm2' },
    m2: { text: 'Nine hundred weight of black. That\'s where it went. Into the courses, a pin at a time. Every tower on the plaza is lifting.', next: 'm3' },
    m3: { text: 'The white in the old walls has been settling for three hundred years. Settled crystal wants to go up. Ours has started.', next: 'm4' },
    m4: {
      text: (g) => (read(g) >= 3 ? 'You\'ve read my gauges already, so you know. Every one of them is off its midsummer mark.' : 'Don\'t take my word. There\'s a plumb gauge on the ground floor of this tower, the Morning Tower and the Evening Tower. Read all three.'),
      effect: (g) => g.setStage(CAL, 'gauges'),
    },
    mGauges: { text: 'This tower\'s gauge is behind me. The Morning Tower\'s east of the plaza; the Evening Tower\'s west. Read where the bob hangs against the scale.' },
    mm1: { text: 'Well?', next: 'mm2' },
    mm2: { speaker: 'narrator', text: 'You tell her: two fingers in the Old Tower, a finger and a half in the Morning, a finger in the Evening. All since midsummer.', next: 'mm3' },
    mm3: { text: 'The black holds them. For now. Then they need more black, and then more.', next: 'mm4' },
    mm4: { text: 'It has to come from somewhere. Nobody in the Assembly has asked where. I asked once. I was thanked for asking.', next: 'mm5' },
    mm5: { text: 'The Speaker sits in the Hall. Ask him. He\'ll be polite. He\'s very good at polite.', effect: (g) => g.setStage(CAL, 'speaker') },
    mSpeaker: { text: 'Benet Sala. In the Hall, under the dome. Polite. Remember.' },
    mLetter: { text: 'A letter? From the Sunder. That\'s my boy\'s hand.', next: 'mLetter2', effect: hand('marta_vidal') },
    mLetter2: { speaker: 'narrator', text: 'She reads it standing, then folds it small.', next: 'mLetter3' },
    mLetter3: { text: 'He\'s on the skyfarms. He says the slabs are higher this summer. He says it like it\'s good news.' },
  },
};

const sala: DialogueTree = {
  start: (g) => (at(g, CAL) === 'speaker' ? 's1' : at(g, CAL) === 'done' ? 'sDone' : 's0'),
  nodes: {
    s0: { text: 'Benet Sala, Speaker of the Assembly. If you\'ve a petition, my clerk keeps the book. She keeps it better than I would.' },
    s1: { text: 'Benet Sala, Speaker of the Assembly. You\'re the Counties\' visitor. The harbourmaster mentions you. So does my clerk. So does my Warden.', next: 's2' },
    s2: {
      text: 'Everyone is very interested in the Assembly this week.',
      options: [
        { text: 'Where does the black come from?', next: 's3' },
        { text: 'Show him the Committee\'s lines.', next: 's5', cond: (g) => g.count('committee_lines') > 0 },
        { text: 'Why not take the towers down?', next: 's4' },
      ],
    },
    s3: { text: 'From the north, bought at a price the Committee agreed. The Assembly doesn\'t dig. It pays people who do.', next: 's2' },
    s4: { text: 'A storey at a time, for twenty years, with the Assembly sitting in a tent? Tell that to Callis. I\'d like to watch.', next: 's2' },
    s5: { speaker: 'narrator', text: 'You show him Clara\'s copy: nine hundred weight, A. Pryce for Harrowgate and Daughters, delivered by the Kittiwake.', next: 's6' },
    s6: { text: 'The Kittiwake is a Brethren hull, out of Saltpenny Key. You\'ll have heard of the Brethren. Everyone has.', next: 's7' },
    s7: { text: 'They carry what pays. This pays. I\'d rather buy black from thieves than watch the Old Tower walk off into the sky.', next: 's8' },
    s8: { text: 'Your Mr Pryce went south with them in the summer. If you want him, Saltpenny is where the Kittiwake loads.', next: 's9' },
    s9: { text: 'Go carefully. The Brethren don\'t pay taxes, and they don\'t forgive debts. They\'re honest about both.', effect: (g) => { g.take('committee_lines', 1); g.addMarks(250); g.setFlag('saltFerry', true); g.setStage(CAL, 'done'); } },
    sDone: { text: 'The towers stand. Ask me again next year.' },
  },
};

// ================================================================ The rest of Callis

const isidre: DialogueTree = {
  start: (g) => (letterFor(g, 'isidre_mas') ? 'iLetter' : 'i0'),
  nodes: {
    i0: {
      text: 'Isidre Mas, keeper of the Hall. Come in out of the sun.',
      options: [
        { text: 'What are the two stones?', next: 'i1' },
        { text: 'Who built Callis?', next: 'i3' },
        { text: 'Bye.' },
      ],
    },
    i1: { text: 'The white and the black. One lifts, one holds. You can\'t build tall with one and you can\'t build at all with the other.', next: 'i2' },
    i2: { text: 'We keep a piece of each side by side, so nobody forgets they come as a pair. People forget anyway.', next: 'i0' },
    i3: { text: 'People who knew both stones better than we do. They raised the towers in a lifetime. We\'ve spent three hundred years keeping them up.', next: 'i0' },
    iLetter: { text: 'For me? That\'s my sister\'s hand. She\'s in Northgate.', next: 'iLetter2', effect: hand('isidre_mas') },
    iLetter2: { speaker: 'narrator', text: 'He reads it twice.', next: 'iLetter3' },
    iLetter3: { text: 'They\'ve shut the gate. She says it\'s for the winter. That gate hasn\'t shut for a winter in three hundred years.' },
  },
};

const jaume: DialogueTree = {
  start: (g) => (letterFor(g, 'jaume_roig') ? 'jLetter' : 'j0'),
  nodes: {
    j0: { text: 'Jaume Roig. I cut the black for the tower pins and set iron in it. And I sell iron, if that\'s what you\'re after.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('jaume_roig') }, { text: 'Bye.' }] },
    jLetter: { text: 'A letter? The Assembly\'s seal. That\'ll be an order.', next: 'jLetter2', effect: hand('jaume_roig') },
    jLetter2: { text: 'Forty more pins, the long pattern. That\'s four hundred this year.', next: 'jLetter3' },
    jLetter3: { text: 'I used to cut four a year and be glad of the work. I\'m not glad.' },
  },
};

const pere: DialogueTree = {
  start: () => 'e0',
  nodes: {
    e0: { text: 'Pere Coll. Sardines off the morning boats, bread from the ovens on Tanners\' Stair, and the red from up the coast. Eat something. You look like a mainlander.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('pere_coll') }, { text: 'Bye.' }] },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [CREW]: {
    id: CREW, name: 'Half a Crew', region: 'bright', story: { chapter: 27, title: 'Half a Crew', act: ACT }, next: [CAL, 'clerk'],
    notes: (_g, s) => {
      if (s === 'delia') return 'A Morrow ship, the Good Return, came into Gullmouth half-crewed. Her master asked after the Third Daughter, a Harrowgate ship. Nessa Crane wants Delia Harrowgate told.';
      if (s === 'cross') return 'Aubrey Pryce sailed for Morrow on the Third Daughter while I was at Holmsey, with Delia\'s signature on his papers. Delia has paid my passage on the Constant, the packet from Gullmouth to Callis, to find out what her name is on.';
      return 'The Third Daughter put in at Callis in the summer. Pryce went straight to the Assembly, and she sailed two days later, empty.';
    },
    objectives: (_g, s) => {
      if (s === 'delia') return [{ text: 'Tell Delia Harrowgate at the Works', marker: 'delia' }];
      if (s === 'cross') return [{ text: 'Take the packet to Callis (Hal Sennen, Gullmouth harbour)', marker: 'sennen_gull' }, { text: 'Ask the Callis harbourmaster about the Third Daughter', marker: 'pau_ferrer' }];
      return [];
    },
    marks: (g, s): Marks => (!s && actThreeDone(g) ? { nessa: '!' } : s === 'delia' ? { delia: '?' } : s === 'cross' ? { sennen_gull: '?', pau_ferrer: '?' } : {}),
    walk: { cast: ['sennen_gull', 'pau_ferrer'], from: { quests: { storyBell: 'done' }, flags: { parishEnd: 'rise' } } },
  },
  [CAL]: {
    id: CAL, name: 'Nine Hundred Weight', region: 'bright', story: { chapter: 28, title: 'Nine Hundred Weight', act: ACT }, next: ['tdSalt', 'sail'],
    notes: (g, s) => {
      if (s === 'clerk') return 'Whatever the Third Daughter brought to Callis, Pryce took it to the Assembly. If anyone wrote it down, it was the Assembly\'s clerks, on the plaza under the towers.';
      if (s === 'warden') return 'The Assembly\'s Works Committee has bought nine hundred weight of the black since midsummer, against forty in a usual year: from A. Pryce, for Harrowgate & Daughters, delivered by the Kittiwake. Clara Oms says to ask the Warden of the Towers why.';
      if (s === 'gauges' || s === 'back') return `Marta Vidal, the Warden, says the towers are lifting as the white in their old walls settles, and the black is holding them down. She wants me to read the plumb gauges in three towers. (${read(g)}/3)`;
      if (s === 'speaker') return 'All three towers have lifted since midsummer, the Old Tower two fingers. The Assembly pins them down with black as fast as it can buy it, and nobody has asked where it comes from. The Speaker, Benet Sala, sits in the Assembly Hall.';
      return 'The Kittiwake is a Brethren hull out of Saltpenny Key, at the far end of the Keys. The Brethren carry the black to Callis, and Pryce went south with them in the summer.';
    },
    objectives: (g, s) => {
      if (s === 'clerk') return [{ text: 'Ask the Assembly\'s clerk about Pryce, on the plaza', marker: 'clara_oms' }];
      if (s === 'warden') return [{ text: 'Find Marta Vidal, Warden of the Towers, in the Old Tower', marker: 'marta_vidal' }];
      if (s === 'gauges') return TOWER_IDS.map((t) => ({ text: `Read the plumb gauge in ${CALLIS_TOWERS[t].name}`, done: !!g.flag('gauge:' + t), marker: 'gauge-' + t }));
      if (s === 'back') return [{ text: 'Tell Marta Vidal', marker: 'marta_vidal' }];
      if (s === 'speaker') return [{ text: 'Ask Speaker Benet Sala in the Assembly Hall', marker: 'benet_sala' }];
      return [];
    },
    advance: (g, s) => (s === 'gauges' && read(g) >= 3 ? 'back' : null),
    marks: (_g, s): Marks => (s === 'clerk' ? { clara_oms: '?' } : s === 'warden' || s === 'back' ? { marta_vidal: '?' } : s === 'speaker' ? { benet_sala: '?' } : {}),
    walk: { from: { quests: { storyBell: 'done', [CREW]: 'done', [CAL]: 'clerk' } } },
  },
  [JOANQ]: {
    id: JOANQ, name: 'Numbers, Not Adjectives', region: 'bright', depth: 'quest',
    notes: (_g, s) => (s === 'measure' ? 'Joan Harrowgate gave me forty marks and a plumb bob, without telling Delia. She thinks the towers of Callis stand on settling white, and are lifting. She wants numbers.'
      : s === 'write' ? 'The towers of Callis are lifting: two fingers since midsummer in the Old Tower. Letters for the Counties go out on the packet, through the harbourmaster.'
        : 'The towers of Callis are lifting: two fingers in a summer, in the Old Tower. My letter to Joan went out on the Constant.'),
    objectives: (g, s) => {
      if (s === 'write') return [{ text: 'Send Joan the numbers on the packet (Pau Ferrer, the harbour)', marker: 'pau_ferrer' }];
      if (s !== 'measure') return [];
      // (the plumb gauges the Warden keeps in the towers: the next one not yet read)
      const next = TOWER_IDS.find((t) => !g.flag('gauge:' + t));
      return [{ text: `Find out whether the towers of Callis are moving (${read(g)}/3)`, marker: next ? 'gauge-' + next : undefined }];
    },
    advance: (g, s) => (s === 'measure' && read(g) >= 3 ? 'write' : null),
    marks: (g, s): Marks => (!s && at(g, CREW) === 'cross' ? { joan: '!' } : s === 'write' ? { pau_ferrer: '?' } : {}),
    walk: { cast: ['joan', 'pau_ferrer'], from: { quests: { storyBell: 'done', [CREW]: 'cross' } } },
  },
  [LET]: {
    id: LET, name: 'Off the Constant', region: 'bright', depth: 'short',
    notes: (g, s) => (s === 'deliver' ? `Pau Ferrer, the harbourmaster, gave me three letters off the packet for people up in the city. (${delivered(g)}/3)` : s === 'back' ? 'The letters are delivered. Pau will pay.' : 'I carried three letters up from the harbour. Not one of them was good news.'),
    objectives: (g, s) => {
      if (s === 'deliver') return [
        { text: 'Isidre Mas, at the Hall of the Two Stones', done: !!g.flag('letter:isidre_mas'), marker: 'isidre_mas' },
        { text: 'Jaume Roig, in the Market', done: !!g.flag('letter:jaume_roig'), marker: 'jaume_roig' },
        { text: 'Marta Vidal, in the Old Tower', done: !!g.flag('letter:marta_vidal'), marker: 'marta_vidal' },
      ];
      if (s === 'back') return [{ text: 'Go back to Pau Ferrer at the harbour', marker: 'pau_ferrer' }];
      return [];
    },
    advance: (g, s) => (s === 'deliver' && delivered(g) >= 3 ? 'back' : null),
    marks: (g, s): Marks => (!s ? { pau_ferrer: '!' } : s === 'back' ? { pau_ferrer: '?' } : s === 'deliver' ? Object.fromEntries(POSTED.filter((n) => !g.flag('letter:' + n)).map((n) => [n, '?'])) : {}),
  },
};

// ================================================================ Things, people, places

const items: ItemDef[] = [
  { id: 'committee_lines', name: 'Three lines from the Committee\'s book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#f0ece0', b: '#2a2a32' }, desc: 'A clerk\'s copy, in Clara Oms\'s small square hand. Nine hundred weight of the black. A. Pryce, for Harrowgate & Daughters. The Kittiwake.' },
  { id: 'joan_plumb', name: 'Joan\'s plumb bob', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'ore', a: '#8a7a5a', b: '#4a3e2a' }, desc: 'Brass, on a waxed line, with J.H. scratched on the point. It hangs dead straight. Joan says that\'s all it\'s for.' },
  { id: 'packet_letter', name: 'Letter off the packet', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#8a3a2a' }, desc: 'Folded, sealed, and carried across the sea in a canvas bag with two hundred others.' },
  { id: 'callis_sardines', name: 'Grilled sardines', kind: 'food', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'fish', a: '#a8b0b8', b: '#5a6a7a' }, desc: 'Six to a stick, off the morning boats, eaten with your fingers on the quay.', heal: 210, stats: 'Restores 210 health.' },
  { id: 'olive_bread', name: 'Olive bread', kind: 'food', rarity: 'common', stack: true, value: 18, icon: { shape: 'bread', a: '#c8a060', b: '#4a5a2a' }, desc: 'Flat, oiled, salted, with black olives pressed into it. Callis eats it at every meal and some in between.', heal: 140, stats: 'Restores 140 health.' },
  { id: 'callis_red', name: 'Callis red', kind: 'food', rarity: 'uncommon', stack: true, value: 24, icon: { shape: 'gel', a: '#7a1e2a', b: '#3a0e14' }, desc: 'From the terraces up the coast, in a stone bottle. Thin, sharp and cheap, and Callis drinks it like water.', heal: 120, stats: 'Restores 120 health.' },
];

const CALLIS_FOLK = { skin: '#c8946a', eyes: '#3a2a1e' };

export const CALLIS_CONTENT: RegionContent = {
  id: 'callis',
  items,
  npcs: [
    {
      land: 'morrow', id: 'pau_ferrer', name: 'Pau Ferrer', title: 'Harbourmaster, Callis',
      look: { ...CALLIS_FOLK, hair: '#2a1e16', hairStyle: 1, facial: 2, tunic: '#e8e2d4', trim: '#2f4a7a', trousers: '#2a2a30', boots: '#1e1a16', hat: 'wide', hatColor: '#e8e2d4', build: 1.1, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [QX - 6.5, CALLIS_PACKET.z + 7.5], face: [QX + 2, CALLIS_PACKET.z + 7.5], anim: 'idle' }],
      barks: ['Mind the bollards.', 'Third pier, not the second.'],
    },
    {
      land: 'morrow', id: 'clara_oms', name: 'Clara Oms', title: 'Clerk to the Works Committee',
      look: { ...CALLIS_FOLK, hair: '#1a1410', hairStyle: 4, tunic: '#2a2a32', trim: '#e8e2d4', trousers: '#22222a', boots: '#141210', lashes: true, build: 0.9, age: 0.35 },
      schedule: [{ from: 0, to: 24, at: [P.x - 6.5, P.z - 0.5], face: [P.x - 6.5, P.z - 6], anim: 'idle' }],
      barks: ['The book opens on the first.'],
    },
    {
      land: 'morrow', id: 'benet_sala', name: 'Benet Sala', title: 'Speaker of the Assembly',
      look: { ...CALLIS_FOLK, hair: '#c8c4bc', hairStyle: 0, facial: 4, tunic: '#e8e2d4', trim: '#1a1a1e', trousers: '#2a2a30', boots: '#141210', cape: '#2f4a7a', build: 1.05, height: 1.04, age: 0.75 },
      schedule: [{ from: 0, to: 24, at: [P.x + 0.5, P.z - 18.5], y: F, face: [P.x + 0.5, P.z - 10], anim: 'idle' }],
    },
    {
      land: 'morrow', id: 'marta_vidal', name: 'Marta Vidal', title: 'Warden of the Towers',
      look: { ...CALLIS_FOLK, hair: '#4a3a2a', hairStyle: 2, tunic: '#3a3e44', trim: '#1a1a1e', trousers: '#2e2a26', boots: '#1e1a16', gloves: '#2a2422', lashes: true, scar: true, build: 1.05, age: 0.6 },
      schedule: [{ from: 0, to: 24, at: [P.x + CALLIS_TOWERS.old.dx + 0.5, P.z + CALLIS_TOWERS.old.dz + 2.5], y: F, face: [P.x + CALLIS_TOWERS.old.dx + 0.5, P.z + CALLIS_TOWERS.old.dz + 8], anim: 'idle' }],
      barks: ['Every morning.'],
      // (she holds the Old Tower's brake when nobody else can, and doesn't let go: content/actSixB.ts)
      when: (g) => !g.flag('martaDead'),
    },
    {
      land: 'morrow', id: 'isidre_mas', name: 'Isidre Mas', title: 'Keeper, the Hall of the Two Stones',
      look: { ...CALLIS_FOLK, hair: '#8a8680', hairStyle: 0, facial: 6, tunic: '#e8e2d4', trim: '#1a1a1e', trousers: '#e0dacc', boots: '#3a2e24', cape: '#1a1a1e', build: 0.95, age: 0.7 },
      schedule: [{ from: 0, to: 24, at: [T.x + 0.5, T.z - 5.5], y: F + T.rise, face: [T.x + 0.5, T.z + 2], anim: 'idle' }],
    },
    {
      land: 'morrow', id: 'pere_coll', name: 'Pere Coll', title: 'Sardines and bread',
      look: { ...CALLIS_FOLK, hair: '#2a1e16', hairStyle: 3, facial: 1, tunic: '#5a6a7a', trim: '#e8e2d4', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.2, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [M.x - 14, M.z - 15.4], face: [M.x - 14, M.z - 10], anim: 'idle' }],
      barks: ['Sardines! Off the boat!', 'Olive bread, still warm.'],
    },
    {
      land: 'morrow', id: 'jaume_roig', name: 'Jaume Roig', title: 'Ironwork and tower pins',
      look: { ...CALLIS_FOLK, hair: '#3a2416', hairStyle: 0, facial: 8, tunic: '#3a3430', trim: '#8a6a3a', trousers: '#2e2620', boots: '#1e1a16', apron: true, gloves: '#2a2422', build: 1.25, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [M.x + 14, M.z - 15.4], face: [M.x + 14, M.z - 10], anim: 'idle' }],
      barks: ['The long pattern.'],
    },
  ],
  dialogue: { pau_ferrer: pau, clara_oms: clara, benet_sala: sala, marta_vidal: marta, isidre_mas: isidre, jaume_roig: jaume, pere_coll: pere },
  quests,
  shops: {
    pere_coll: {
      id: 'pere_coll', name: 'Pere Coll\'s stall', owner: 'pere_coll',
      stock: [{ item: 'olive_bread', price: 28 }, { item: 'callis_sardines', price: 46 }, { item: 'callis_red', price: 36 }],
      buyRate: () => 0.5,
      footer: () => 'Pere pays half of an item\'s worth',
    } as ShopDef,
    jaume_roig: {
      id: 'jaume_roig', name: 'Roig\'s, ironwork', owner: 'jaume_roig',
      stock: [{ item: 'iron_bar', price: 66 }, { item: 'iron_pickaxe', price: 320 }, { item: 'iron_hatchet', price: 260 }],
      buyRate: () => 0.55,
      footer: () => 'Jaume pays a little over half for iron and steel',
    } as ShopDef,
  },
  readables: {
    callisNotice: {
      title: 'Notice on the Assembly\'s board',
      body: 'BY ORDER OF THE ASSEMBLY OF CALLIS\n\nThe Towers are closed above the first course to all but the Warden\'s people, until the pinning is finished.\n\nThe Works Committee will hear no petitions this month.\n\nB. Sala, Speaker\n\nUnder it, in pencil: "Which month?"',
    },
  },
  things: [
    { land: 'morrow', id: 'callisNotice', x: P.x - 9.5, z: P.z + 21.4, label: 'Read the notice', radius: 2.2, read: 'callisNotice' },
    ...TOWER_IDS.map((t) => {
      const w = CALLIS_TOWERS[t];
      return {
        land: 'morrow' as const, id: 'gauge-' + t, x: P.x + w.dx + 0.5, z: P.z + w.dz + (t === 'old' ? -2.5 : 0.5), y: F, label: 'Read the plumb gauge', radius: 2.4,
        when: (g: GameApi) => (at(g, CAL) === 'gauges' || at(g, JOANQ) === 'measure') && !g.flag('gauge:' + t),
        use: (g: GameApi) => {
          g.setFlag('gauge:' + t, true);
          g.toast(`In ${w.name}, the bob hangs ${READING[t]} off the line scratched at midsummer. Someone has pencilled the date beside it, and a question mark.`);
        },
      };
    }),
  ],
  hooks: (D) => {
    // XVII: Nessa Crane, once the Drowned Parish is done
    hook(D, 'nessa', (g) => (actThreeDone(g) && !at(g, CREW) ? 'td_n1' : at(g, CREW) === 'delia' ? 'td_nWait' : undefined), nessaNodes);
    hook(D, 'delia', (g) => (at(g, CREW) === 'delia' ? 'td_d1' : at(g, CREW) === 'cross' ? 'td_dWait' : undefined), deliaNodes);
    hook(D, 'joan', (g) => (at(g, CREW) === 'cross' && !at(g, JOANQ) ? 'td_j1' : at(g, JOANQ) === 'measure' ? 'td_jWait' : at(g, JOANQ) === 'done' ? 'td_jDone' : undefined), joanNodes);
  },
};
