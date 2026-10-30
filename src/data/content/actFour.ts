import type { DialogueTree, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import { COMPANIONS } from '../companions';

// THE THIRD DAUGHTER, the chapters between (docs/STORY_PLAN.md, Act IV):
//
//   XXX    Who Tam Writes To (storyTamLetter): in Saltpenny, Ned Vey has a bundle of letters waiting
//          for A. Pryce, who went north: "T.R." every week since Gullmouth, where you've been and who
//          with. Pryce bought Tam's Kittiwake debt off the Brethren in the spring; the letters are the
//          interest. Flag tamEnd = 'kept' (he stops writing and stays) | 'double' (he writes Pryce what
//          you want him to read) | 'out' (you turn him out; he leaves).
//   XXXII  Ursel (storyUrsel): at Northgate's gate, the Gatekeeper is Ursel Hale, Wenna's father's sister,
//          who crossed the sea before Wenna was born. Flag urselStay = 'night' (Wenna stays the night at
//          the gate) | 'north' (you go on at first light).
//   XXXV   Fourth Camp (storyCamp4): the top of Gallows Knap, where it started. The first page of
//          Pryce's book is in another hand: the Third Daughter's papers were signed for the Charter by
//          R. Tarrant, the Speaker. Flag bookPage = 'read'.

const TAM = 'storyTamLetter', URSEL = 'storyUrsel', CAMP = 'storyCamp4';
const SALT = 'tdSalt', HELD = 'tdHeld', KING = 'tdKing', HOME = 'tdHome';

// The open ground on top of Gallows Knap, just south of the ruin
const FIRE = { x: 1256.5, z: 1270.5 };

const joined = (g: GameApi, id: string) => !!g.flag(`comp:${id}:joined`) && !g.flag(`comp:${id}:gone`);

// ================================================================ XXX. WHO TAM WRITES TO

const nedNodes = {
  tw1: { text: 'You. I\'ve something for you, and I\'m not charging, which ought to frighten you more than if I were.', next: 'tw2' },
  tw2: { speaker: 'narrator' as const, text: 'He puts a bundle of letters on the table, tied with ship\'s twine. They\'re addressed to A. Pryce, care of the Captains\' Table.', next: 'tw3' },
  tw3: { text: 'Pryce went north before these came, so they sit with me. Every week since high summer, one. Same hand. Read the top one. Then decide if you want to read the rest.', next: 'tw4' },
  tw4: {
    speaker: 'narrator' as const,
    text: 'The top one, in a quick, slanting hand you know from the backs of card scores:\n\n"Holmsey. The bell has rung three times; Nessa Crane is writing to the Kirk. The parish under the water is the Kirk\'s white, a hundred years back. If H. wants it she should be at Gullmouth before the letter is. We go out to the tower tomorrow. T.R."\n\nThere are eleven more. You know where every one of them was written, because you were there.',
    effect: (g: GameApi) => { g.give('tam_letters'); g.setFlag('tamLettersRead', 1); g.setStage(TAM, 'read'); },
  },
  twWait: { text: 'The letters are yours. What you do with the man who wrote them is yours too.' },
};

const tamNodes = {
  tl1: { speaker: 'narrator' as const, text: 'Tam sees the twine in your hand before he sees your face. He doesn\'t run. You\'ve seen him want to run before, and this isn\'t that.', next: 'tl2' },
  tl2: { text: 'Ah. Ned. Course it\'s Ned. Ned keeps everything.', next: 'tl3' },
  tl3: {
    text: (g: GameApi) => (g.flag('comp:tam:debt') === 'paid'
      ? 'You paid the Brethren three hundred marks for me, on the jetty. Pryce had already bought my debt off them, in the spring. They took your money and kept his. I\'ve been paying twice, and you once, and none of it to the right man.'
      : 'In the spring the Brethren sold my debt. Three hundred marks. Pryce bought it. He buys debts, you know that. He buys them cheap and he collects them his own way.'),
    next: 'tl4',
  },
  tl4: { text: 'His way was a letter a week. Where you were, who with, what you were after. Until it was paid. I told him where. I never told him why. Mostly.', next: 'tl5' },
  tl5: { text: 'Holmsey. Hilda was at the bell before Nessa\'s ink was dry. That was me. I\'ve been wanting to say so for a month. It\'s worse saying it.', next: 'tl6' },
  tl6: {
    text: 'So. You\'ve got the cards. Deal.',
    options: [
      { text: 'Then you\'re done writing to him. Stay, Tam.', next: 'tl_keep' },
      { text: 'Keep writing. We\'ll tell you what to put in them.', next: 'tl_double' },
      { text: 'Get out. Go back to the quay. I don\'t want to see you again.', next: 'tl_out' },
    ],
  },
  tl_keep: { text: 'Just like that? No. Not just like that. You looked at it a long time first. I saw. Thank you.', effect: (g: GameApi) => { g.setFlag('tamEnd', 'kept'); g.compRapport('tam', 12); }, next: 'tl_keep2' },
  tl_keep2: { speaker: 'narrator' as const, text: 'He takes the last letter, the one he hadn\'t sent yet, out of his waistcoat, and holds it to the lamp until it\'s gone.', effect: (g: GameApi) => g.setStage(TAM, 'done') },
  tl_double: { text: 'Lie to Pryce? For you? Oh, that\'s the best idea anybody\'s had in a year. He\'ll know, eventually. Everyone does. Let\'s make it worth it.', effect: (g: GameApi) => { g.setFlag('tamEnd', 'double'); g.compRapport('tam', 6); g.setStage(TAM, 'done') } },
  tl_out: {
    text: 'Right. Course. That\'s fair. That\'s the fairest thing anyone\'s done to me. I\'ll be on the quay. In case you\'re ever short a fourth for cards.',
    effect: (g: GameApi) => { g.setFlag('tamEnd', 'out'); g.compRapport('tam', -40); g.compLeave('tam'); g.setStage(TAM, 'done'); },
  },
  tlWait: { text: 'You\'ve read them, then. Say it. Whatever it is, I\'ve heard worse, and I\'ve said worse, about me.' },
};

// ================================================================ XXXII. URSEL

const urselNodes = {
  u1: { speaker: 'narrator' as const, text: 'The Gatekeeper is watching Wenna, not you. She has been since you came through the postern. When Wenna takes her helmet off, the Gatekeeper sits down on the step.', next: 'u2' },
  u2: { text: 'What\'s your name, Rider?', next: 'u3' },
  u3: { as: 'wenna', text: 'Wenna Hale. From Kelderby.', next: 'u4' },
  u4: { text: 'Davey Hale\'s girl. You\'ve his nose. God help you, you\'ve his nose. I\'m Ursel. I\'m your father\'s sister. I came over on a salt boat forty years ago, before you were thought of, and I never wrote, and then it was too late to start.', next: 'u5' },
  u5: { as: 'wenna', text: 'Dad talked about a sister. We thought you\'d drowned. He kept a place at Michaelmas for a while. Then he stopped.', next: 'u6' },
  u6: { text: 'And Davey? And the boys? Bryn would be a man now. Owen was the clever one. He wanted to see the star at the Kirk.', next: 'u7' },
  u7: { as: 'wenna', text: 'Dad\'s gone. Ten years. Bryn has the farm and fourteen ewes. Owen walked to the Kirk last winter. He got there. He didn\'t get home. They found him on the road with his crook.', next: 'u8' },
  u8: { speaker: 'narrator' as const, text: 'Ursel doesn\'t say anything for a long time. Then she takes off her glove and puts her hand flat on the gate beside her, the way the pilgrims at the Kirk put a hand on the star.', next: 'u9' },
  u9: {
    text: 'Forty years on this wall, watching for the dead. And the living walk up to it from the wrong side. Stay a night, Davey\'s girl. I\'ve a fire in the gatehouse, and a lot to ask.',
    options: [
      { text: 'Stay as long as you need, Wenna. Kingsbarrow will keep a night.', next: 'u_night' },
      { text: 'We go north at first light. Pryce won\'t wait. Talk tonight.', next: 'u_north' },
    ],
  },
  u_night: { as: 'wenna', text: 'A night. Thank you. I didn\'t know I wanted it until you said it.', effect: (g: GameApi) => { g.setFlag('urselStay', 'night'); g.compRapport('wenna', 8); g.setStage(URSEL, 'done'); } },
  u_north: { as: 'wenna', text: 'First light. You\'re right. I know you\'re right. I\'ll be ready.', effect: (g: GameApi) => { g.setFlag('urselStay', 'north'); g.compRapport('wenna', -3); g.setStage(URSEL, 'done'); } },
  uAfter: {
    text: (g: GameApi) => (g.flag('urselStay') === 'night'
      ? 'Davey\'s girl talks in her sleep. Same as he did. I sat up and listened to it like a song I\'d forgotten.'
      : 'She was gone at first light, with you. Bring her back this way. That\'s all I ask of anyone now.'),
  },
};

// ================================================================ XXXV. FOURTH CAMP

const campWenna: DialogueTree = {
  start: (g) => (g.flag('bookPage') ? (g.flag('camp4W') ? 'cw_again' : 'cw1') : 'cw_before'),
  nodes: {
    cw_before: { text: 'Pryce\'s book. You\'ve been carrying it since Harrowgate. Are you going to read it, or just carry it?' },
    cw1: { text: 'Rhosyn Tarrant. The Speaker. "For the Charter." I swore my oath on her steps. Eleven years.', next: 'cw2' },
    cw2: {
      text: 'She sent the Third Daughter to Morrow. Everything after that, the Held getting up, Cold Harbour, the king, it starts on that line. In her hand.',
      options: [
        { text: 'She must have thought it was the only way to pay the debt.', next: 'cw_reason' },
        { text: 'Then she answers for it.', next: 'cw_answer' },
      ],
    },
    cw_reason: { text: 'Maybe. Lowen Pike thought holding back oil was the only way. Everyone who signs for nine thinks it\'s the only way.', effect: (g) => { g.compRapport('wenna', -2); g.setFlag('camp4W', 1); } },
    cw_answer: { text: 'To who? She is who the Charter answers to. That\'s the part I can\'t get past.', effect: (g) => { g.compRapport('wenna', 4); g.setFlag('camp4W', 1); } },
    cw_again: { text: 'I\'ll take the watch. I won\'t sleep anyway.' },
  },
};

const campOtt: DialogueTree = {
  start: (g) => (g.flag('bookPage') ? (g.flag('camp4O') ? 'co_again' : 'co1') : 'co_before'),
  nodes: {
    co_before: { text: 'This is where we started, isn\'t it. Under here. The tally wall, the forty-one. It\'s very quiet.' },
    co1: { text: 'Joan wants me at the smelter in the spring. As her apprentice. A proper one, with a contract. She wrote it out twice.', next: 'co2' },
    co2: {
      text: 'And the Speaker signed the papers that started all of it. I had her portrait over my desk at the survey office. I don\'t know what to do with that.',
      options: [{ text: 'Go to Joan. Learn everything. Check her sums.', next: 'co_joan' }, { text: 'Stay with us. There\'s more to measure out here.', next: 'co_stay' }],
    },
    co_joan: { text: 'Check her sums. Yes. You said that before, about everyone. You\'re right about everyone.', effect: (g) => { g.setFlag('ottSpring', 'joan'); g.compRapport('ottilie', 4); g.setFlag('camp4O', 1); } },
    co_stay: { text: 'I\'d like that. I\'ll tell her in the spring. She\'ll write back twice.', effect: (g) => { g.setFlag('ottSpring', 'stay'); g.compRapport('ottilie', 3); g.setFlag('camp4O', 1); } },
    co_again: { text: 'Sleep. I\'ll measure the stars. Ilse says the trick is not to want them to fall.' },
  },
};

const campTam: DialogueTree = {
  start: (g) => (g.flag('bookPage') ? (g.flag('camp4T') ? 'ct_again' : 'ct1') : 'ct_before'),
  nodes: {
    ct_before: { text: 'Read his book. Go on. I want to see the face you make. I made one too, when I found out what he does with debts.' },
    ct1: {
      text: (g) => (g.flag('tamEnd') === 'double'
        ? 'I\'ve a letter half-written to Pryce. "Nothing to report. They\'re camped on a hill." Shall I put the Speaker in it? No. Let\'s keep that card.'
        : 'Pryce bought my debt. Pryce bought the Charter\'s debt. And the Speaker sold him a ship. Everybody in the Counties owes everybody, and Pryce has the book.'),
      next: 'ct2',
    },
    ct2: { text: 'You know what the trick is with a crooked game? You don\'t walk away from the table. You learn who\'s dealing.', effect: (g) => { g.compRapport('tam', 3); g.setFlag('camp4T', 1); } },
    ct_again: { text: 'Sleep. I\'m counting the exits. There\'s only the one, and it\'s down.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [TAM]: {
    id: TAM, name: 'Who Tam Writes To', story: { chapter: 30, title: 'Who Tam Writes To', act: 'The Third Daughter' }, next: [HELD, 'harbour'],
    notes: (g, s) => {
      if (s === 'ned') return 'Ned Vey at the Captains\' Table in Saltpenny has something for me, and isn\'t charging for it.';
      if (s === 'read') return 'Letters to A. Pryce, care of the Captains\' Table, one a week since high summer, signed T.R. Where I\'ve been, and who with.';
      const e = g.flag('tamEnd');
      return e === 'kept' ? 'Pryce bought Tam\'s debt, and the letters were the interest. Tam has stopped writing, and stays.' : e === 'double' ? 'Pryce bought Tam\'s debt, and the letters were the interest. Tam goes on writing: what we want Pryce to read.' : 'Pryce bought Tam\'s debt, and the letters were the interest. I turned Tam out. He\'s gone back to the quay.';
    },
    objectives: (g, s) => {
      if (s === 'ned') return [{ text: 'See Ned Vey at the Captains\' Table', marker: 'ned_vey' }];
      if (s === 'read') return [{ text: 'Talk to Tam about the letters', marker: 'comp_tam' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'ned' ? { ned_vey: '?' } : s === 'read' ? { comp_tam: '?' } : {}),
    // Without Tam (turned out on the jetty in his own story, or never met), there are no letters to find
    advance: (g, s) => (s === 'ned' && !joined(g, 'tam') ? 'done' : null),
    walk: { from: { quests: { [SALT]: 'done', [TAM]: 'ned' }, flags: { 'comp:tam:joined': 1 } } },
  },
  [URSEL]: {
    id: URSEL, name: 'Ursel', story: { chapter: 32, title: 'Ursel', act: 'The Third Daughter' }, next: [KING, 'north'],
    notes: (g, s) => {
      if (s === 'gate') return 'Northgate\'s Gatekeeper is Ursel Hale. She has been watching Wenna since we came through the postern.';
      return g.flag('urselStay') === 'night' ? 'Ursel Hale is Wenna\'s father\'s sister. She crossed the sea forty years ago. Wenna stayed the night at the gate with her.' : 'Ursel Hale is Wenna\'s father\'s sister. She crossed the sea forty years ago. We went north at first light.';
    },
    objectives: (_g, s) => (s === 'gate' ? [{ text: 'Talk to the Gatekeeper with Wenna', marker: 'maud_hale' }] : []),
    marks: (_g, s): Marks => (s === 'gate' ? { maud_hale: '?' } : {}),
    // Without Wenna, there is nobody for Ursel to know
    advance: (g, s) => (s === 'gate' && !joined(g, 'wenna') ? 'done' : null),
    walk: { from: { quests: { [HELD]: 'done', [URSEL]: 'gate' }, flags: { 'comp:wenna:joined': 1, postern: true } } },
  },
  [CAMP]: {
    id: CAMP, name: 'Fourth Camp', story: { chapter: 35, title: 'Fourth Camp', act: 'The Third Daughter' },
    notes: (g, s) => {
      if (s === 'hill') return 'Pryce\'s book is in my pack. The others want to camp on Gallows Knap, where this started.';
      if (s === 'camp') return g.flag('bookPage') ? 'The first page of Pryce\'s book: the Third Daughter\'s papers, signed for the Charter by R. Tarrant. The Speaker.' : 'A fire on the top of Gallows Knap. Pryce\'s book is in my pack, unread.';
      return 'The Speaker signed the Third Daughter\'s papers. The book is in my pack.';
    },
    objectives: (g, s) => {
      if (s === 'hill') return [{ text: 'Make camp on top of Gallows Knap', marker: 'camp4Fire' }];
      if (s !== 'camp') return [];
      if (!g.flag('bookPage')) return [{ text: 'Read the first page of Pryce\'s book by the fire', marker: 'camp4Fire' }];
      const o: { text: string; marker?: string; done?: boolean }[] = [];
      if (joined(g, 'wenna')) o.push({ text: 'Sit with Wenna', done: !!g.flag('camp4W'), marker: 'camp4_wenna' });
      if (joined(g, 'ottilie')) o.push({ text: 'Sit with Ottilie', done: !!g.flag('camp4O'), marker: 'camp4_ottilie' });
      if (joined(g, 'tam')) o.push({ text: 'Sit with Tam', done: !!g.flag('camp4T'), marker: 'camp4_tam' });
      o.push({ text: 'Sleep by the fire', marker: 'camp4Fire' });
      return o;
    },
    marks: (g, s): Marks => (s === 'camp' && g.flag('bookPage') ? {
      ...(joined(g, 'wenna') && !g.flag('camp4W') ? { camp4_wenna: '?' as const } : {}),
      ...(joined(g, 'ottilie') && !g.flag('camp4O') ? { camp4_ottilie: '?' as const } : {}),
      ...(joined(g, 'tam') && !g.flag('camp4T') ? { camp4_tam: '?' as const } : {}),
    } : {}),
    advance: (g, s) => {
      if (s !== 'hill' || !g.compNear(FIRE.x, FIRE.z, 12)) return null;
      if (g.compActive()) g.compDismiss();
      return 'camp';
    },
    walk: { from: { quests: { [HOME]: 'done', [CAMP]: 'hill' }, flags: { tdEnd: 'back', tamEnd: 'kept', 'comp:wenna:joined': 1, 'comp:ottilie:joined': 1, 'comp:tam:joined': 1 }, items: [['pryce_book', 1]] }, auto: { hill: 'camp' } },
  },
};

const look = (id: 'wenna' | 'ottilie' | 'tam') => COMPANIONS[id].look;
const inCamp = (g: GameApi) => at(g, CAMP) === 'camp';

/** Act IV is done (the next act waits on it): the camp, or for a character that finished before it existed, His Book. */
export const actFourDone = (g: GameApi) => at(g, CAMP) === 'done' || (at(g, HOME) === 'done' && !at(g, CAMP));

export const ACT_FOUR: RegionContent = {
  id: 'actFour',
  items: [
    { id: 'tam_letters', name: 'Letters to A. Pryce', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#3a2a1a' }, desc: 'A bundle tied with ship\'s twine, addressed to A. Pryce, care of the Captains\' Table, Saltpenny Key. Signed T.R.' },
  ],
  npcs: [
    { id: 'camp4_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: [FIRE.x - 2.3, FIRE.z + 1.2], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && joined(g, 'wenna') },
    { id: 'camp4_ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice', look: look('ottilie'), schedule: [{ from: 0, to: 24, at: [FIRE.x + 2.2, FIRE.z + 1.3], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && joined(g, 'ottilie') },
    { id: 'camp4_tam', name: 'Tam Reddick', title: 'Card sharp, mostly honest', look: look('tam'), schedule: [{ from: 0, to: 24, at: [FIRE.x + 0.4, FIRE.z - 2.4], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && joined(g, 'tam') },
  ],
  dialogue: { camp4_wenna: campWenna, camp4_ottilie: campOtt, camp4_tam: campTam },
  quests: QUESTS,
  readables: {
    camp4Fire: {
      title: 'Pryce\'s book',
      body: (g) => (g.flag('bookPage')
        ? `The fire burns down to embers on the top of the Knap, over the old builders' workings and the tally wall in the dark under your feet. ${joined(g, 'wenna') ? 'Wenna sits up with her back to it.' : ''}\n\nIn the morning the book is still in your pack, heavier than it was.`
        : 'You open Pryce\'s book by the firelight. Every line is a purchase: a date, a thing, two prices, and a signature. Most are Pryce\'s, signing for Harrowgate & Daughters.\n\nThe first page is not. The first line, in a careful, upright hand you have seen on the Charter\'s own notices:\n\n"The Third Daughter, her papers and her passage to Callis, to buy crystal of the Assembly out of the Charter\'s reach. Sold to Harrowgate & Daughters for the Charter\'s debt. For the Charter, R. Tarrant."'),
      effect: (g) => { if (!inCamp(g)) return; if (!g.flag('bookPage')) { g.setFlag('bookPage', 'read'); return; } const all = (!joined(g, 'wenna') || !!g.flag('camp4W')) && (!joined(g, 'ottilie') || !!g.flag('camp4O')) && (!joined(g, 'tam') || !!g.flag('camp4T')); if (all) g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    { id: 'camp4Fire', x: FIRE.x, z: FIRE.z, label: 'Sit by the fire', radius: 2.6, read: 'camp4Fire', when: (g) => inCamp(g) },
  ],
  pieces: [
    { id: 'camp4Fire', kind: 'campfire', x: FIRE.x, z: FIRE.z, when: (g) => at(g, CAMP) === 'hill' || inCamp(g) },
    { id: 'camp4RollW', kind: 'bedroll', x: FIRE.x - 3.4, z: FIRE.z + 0.4, ry: 1.3, tint: '#2e3a4a', when: (g) => (at(g, CAMP) === 'hill' || inCamp(g)) && joined(g, 'wenna') },
    { id: 'camp4RollO', kind: 'bedroll', x: FIRE.x + 3.2, z: FIRE.z + 1.8, ry: -1.1, tint: '#6a5a3a', when: (g) => (at(g, CAMP) === 'hill' || inCamp(g)) && joined(g, 'ottilie') },
    { id: 'camp4RollT', kind: 'bedroll', x: FIRE.x + 1.2, z: FIRE.z - 3.6, ry: 0.4, tint: '#7a2a24', when: (g) => (at(g, CAMP) === 'hill' || inCamp(g)) && joined(g, 'tam') },
    { id: 'camp4RollP', kind: 'bedroll', x: FIRE.x - 1.6, z: FIRE.z + 3.4, ry: 2.6, tint: '#7a3a2e', when: (g) => at(g, CAMP) === 'hill' || inCamp(g) },
  ],
  hooks: (D) => {
    hook(D, 'ned_vey', (g) => (at(g, TAM) === 'ned' ? 'tw1' : at(g, TAM) === 'read' ? 'twWait' : undefined), nedNodes);
    hook(D, 'comp_tam', (g) => (at(g, TAM) === 'read' ? (g.flag('tamLettersRead') ? 'tl1' : 'tlWait') : undefined), tamNodes);
    hook(D, 'maud_hale', (g) => (at(g, URSEL) === 'gate' ? 'u1' : at(g, URSEL) === 'done' && joined(g, 'wenna') ? 'uAfter' : undefined), urselNodes);
  },
};
