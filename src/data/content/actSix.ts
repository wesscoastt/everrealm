import type { DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import { CALLIS_SPOTS, CALLIS_TOWERS } from '../../world/morrow';

// THE TALL CITY, the main story's sixth act (docs/STORY_PLAN.md), first half.
//
// Callis without its black. The Old Tower has lifted since its keystones went to the fell (or since the
// Assembly stopped buying the fell's black), and the Assembly is taking its towers down a storey at a
// time. The Charter holds its first sitting abroad, in Callis, and the Speaker who signed the Third
// Daughter's papers comes with it.
//
//   XLV    Down a Storey (storyDownStorey): Marta Vidal and the Old Tower's gauge; the families moving out.
//   XLVI   The Counting Floor (storyCountingFloor): Arthur Pascall keeps the Assembly's bond office on the
//          Old Tower's upper floor, where the Charter's debt is bought and sold. Flag pascallEnd =
//          'arrest' (Benet has him taken off the floor) | 'keep' (he stays; he knows the books).
//   XLVII  Rhosyn's Hand (storyRhosynHand): the Speaker, shown the first page of Pryce's book. Flag
//          rhosynSecret = 'kept' (until after the sitting) | 'told' (you won't keep it).
//   XLVIII Pryce Tells the Truth (storyPryceTruth): Aubrey Pryce, come over as a witness: the Assembly
//          holds the Charter's debt now, and the banks of Ambry, in the south, hold the Assembly's.
//   XLIX   The Lift Towers (storyLiftTowers): a storm comes in off the bay, and the Old Tower's gauge
//          jumps a finger in an hour. Marta needs hands on the brake in the core and on the counting
//          floor's stair. The fall is the next chapter (content/actSixB.ts).

const DOWN = 'storyDownStorey', COUNT = 'storyCountingFloor', HAND = 'storyRhosynHand', TRUTH = 'storyPryceTruth', LIFT = 'storyLiftTowers';
const ACT = 'The Tall City';

const P = CALLIS_SPOTS.plaza, OLD = { x: P.x + CALLIS_TOWERS.old.dx, z: P.z + CALLIS_TOWERS.old.dz };
const GAUGE = { x: OLD.x + 3.5, z: OLD.z + 5.5 };

const lent = (g: GameApi) => g.flag('lendBlack') as 'tower' | 'bought' | 'none' | undefined;

// ================================================================ XLV. DOWN A STOREY

const martaNodes = {
  c6m1: {
    text: (g: GameApi) => (lent(g) === 'tower'
      ? 'You. Benet lent you forty slabs out of my tower\'s keystones. I said a season. I was wrong by most of a season.'
      : 'You. Since the fell\'s black stopped coming the Assembly has been shaving every tower to keep the oldest one honest. Mine is the oldest.'),
    next: 'c6m2',
  },
  c6m2: { text: 'The Old Tower is three fingers off its mark since midsummer. The Assembly has ordered every tower down a storey, the top floor first, the families out by the end of the month.', next: 'c6m3' },
  c6m3: { text: 'Read the gauge for me. My eyes say three. I want somebody else\'s eyes to say it, so I can tell Benet it isn\'t only me.', effect: (g: GameApi) => g.setStage(DOWN, 'gauge') },
  c6mWait: { text: 'The gauge, at the foot of the stair. The bob against the scale. Read it twice.' },
  c6mRead: { text: 'Three and a half. You see? It\'s moved since breakfast.', next: 'c6mRead2' },
  c6mRead2: { text: 'The families go down first, that\'s settled. But the Assembly\'s counting floor is on the eleventh storey, and the clerks won\'t move their books for anyone but Pascall. Go up and tell Pascall from me: the floor comes down next.', effect: (g: GameApi) => g.setStage(DOWN, 'done') },
};

// ================================================================ XLVI. THE COUNTING FLOOR

const pascall: DialogueTree = {
  start: (g) => {
    const s = at(g, COUNT);
    if (s === 'pascall') return 'a1';
    if (s === 'benet') return 'aWait';
    if (g.flag('pascallEnd') === 'keep') return 'aKept';
    return 'a0';
  },
  nodes: {
    a0: { text: 'If it\'s about a bond, the window. If it\'s about the tower, the Warden. If it\'s about me, I\'ve no time.' },
    a1: { text: 'Arthur Pascall, clerk of the Assembly\'s bonds. The Warden sent you. The Warden thinks books can be carried down eleven storeys by Thursday. They can\'t.', next: 'a2' },
    a2: { speaker: 'narrator', text: 'He shows you anyway, because nobody has asked him to explain his work in years. Rows of ledgers, each a debt somebody owes somebody, bought and sold on this floor by the week.', next: 'a3' },
    a3: { text: 'This one is the Charter\'s. Forty thousand marks, paving the Turnpike, twelve years ago. The guilds sold it. Harrowgate bought it at three in ten. And last spring Harrowgate sold it here, to the Assembly, at five in ten, on papers from your own Speaker.', next: 'a4' },
    a4: { text: 'The Assembly holds the Charter\'s debt. I hold the Assembly\'s ledger. The black from the fell was the interest, if you like. I signed for it. A.P. It\'s my initials. I didn\'t think about it.', next: 'a5' },
    a5: {
      text: 'You want me to say I\'m sorry about the dead getting up. I am. I also kept forty families in the Morning Tower. Somebody had to sign for something.',
      options: [
        { text: 'Benet will hear what you signed for. You\'re done on this floor.', next: 'a_arrest' },
        { text: 'Stay. You know these books. Nobody else will be able to read them when the tower comes down.', next: 'a_keep' },
      ],
    },
    a_arrest: { text: 'Benet. Of course. Benet signed the orders I signed for. Go on, then. Take him the ledger. I\'ll be here when they come.', effect: (g) => { g.setFlag('pascallEnd', 'arrest'); g.compRapport('wenna', 3); g.setStage(COUNT, 'benet'); } },
    a_keep: { text: 'Somebody wants the books read. That\'s new. Thank you. I mean it, and I\'ll deny it.', effect: (g) => { g.setFlag('pascallEnd', 'keep'); g.compRapport('tam', 2); g.setStage(COUNT, 'benet'); } },
    aWait: { text: 'The Speaker of the Assembly is in his hall. He knows what I signed. He signed it first.' },
    aKept: { text: 'Eleven storeys of debt. I\'ve started boxing it by year. Somebody should know which box the Turnpike is in when the roof comes off.' },
  },
};

const benetNodes = {
  c6b1: {
    text: (g: GameApi) => (g.flag('pascallEnd') === 'arrest'
      ? 'You want Pascall off the floor. Fine. Then I want the Assembly\'s bonds read by somebody, and Pascall is the only man alive who can. I\'ll take him off the floor and put him in a room with his books. It\'s the most I\'ll do.'
      : 'You\'ve left Pascall at his books. Good. I need those books more than I need anyone\'s apology, his or mine.'),
    next: 'c6b2',
  },
  c6b2: { text: 'Your Charter sits here next week. First time it\'s ever sat outside Ansbury. Your Speaker came on the packet this morning. Ask her about the papers. I did. She looked at me as if I\'d asked her the weather.', effect: (g: GameApi) => g.setStage(COUNT, 'done') },
};

// ================================================================ XLVII. RHOSYN'S HAND

const rhosyn: DialogueTree = {
  start: (g) => (at(g, HAND) === 'speaker' ? 'r1' : 'rAfter'),
  nodes: {
    r1: { text: 'There you are. I\'d wondered when you\'d find me. You read Mr Pryce\'s book. Delia sent me a copy of the first page with a note that said nothing at all, which is how Harrowgates are furious.', next: 'r2' },
    r2: { text: 'Yes. I signed the Third Daughter\'s papers. Harrowgate could sell the Charter\'s debt on to the Assembly, at five in ten, if a Charter ship came with it. The Charter would owe Callis instead of Hilda.', next: 'r3' },
    r3: { text: 'Callis forgives. Hilda doesn\'t. I thought I was moving forty thousand marks to a kinder creditor. I didn\'t know what the Assembly would want to be paid in.', next: 'r4' },
    r4: { as: 'wenna', text: 'Cold Harbour. The fell. A woman behind a gate. That\'s what they wanted to be paid in.', next: 'r5' },
    r5: {
      text: (g) => (g.flag('urselDead') ? 'I know about the Gatekeeper. I read every word of it. I\'ll read it every night, if that helps.' : 'I know. I\'ve read every report.'),
      next: 'r6',
    },
    r6: {
      text: 'The Charter sits here in six days. If this comes out before then, the sitting is about me and not about the debt, and the debt is what will kill people next. Give me the six days.',
      options: [
        { text: 'Six days. Then you tell them yourself.', next: 'r_kept' },
        { text: 'No. They hear it from me, at the sitting, whatever it does to the agenda.', next: 'r_told' },
      ],
    },
    r_kept: { text: 'Six days. Thank you. I don\'t expect you to think better of me. Think whatever you like. Just let me do the work first.', effect: (g) => { g.setFlag('rhosynSecret', 'kept'); g.compRapport('wenna', -6); g.compRapport('ottilie', 2); g.setStage(HAND, 'done'); } },
    r_told: { text: 'Then I\'ll be there when you say it. I won\'t make you look for me.', effect: (g) => { g.setFlag('rhosynSecret', 'told'); g.compRapport('wenna', 8); g.compRapport('tam', -2); g.setStage(HAND, 'done'); } },
    rAfter: { text: (g) => (g.flag('rhosynSecret') === 'kept' ? 'Five days. Four. I count them the way Ilse counts falls.' : 'The sitting will be about me. Let it be. Let it be about the right things after.') },
  },
};

// ================================================================ XLVIII. PRYCE TELLS THE TRUTH

const pryce: DialogueTree = {
  start: (g) => (at(g, TRUTH) === 'pryce' ? 'p1' : 'pAfter'),
  nodes: {
    p1: {
      text: (g) => {
        const e = g.flag('tdEnd');
        if (e === 'back') return 'Aubrey Pryce, bookkeeper at Joan Harrowgate\'s smelter, at the posted rate. The Charter wants a witness. I\'m the only one who wrote everything down.';
        if (e === 'sink') return 'Aubrey Pryce, remanded at the Ansbury assizes, let out on the Charter\'s word to come and say what I know. I\'ve a man with me. He\'s by the fountain, pretending to like it.';
        return 'Aubrey Pryce, buying for Harrowgate again, one price on every line. The Charter wants a witness. I\'m the only one who wrote everything down.';
      },
      next: 'p2',
    },
    p2: { text: 'You\'ll have had the Speaker\'s side. It\'s true, as far as it goes. It doesn\'t go far enough. Shall I tell you the part nobody in this square will?', next: 'p3' },
    p3: { text: 'The Assembly holds the Charter\'s debt. And the Assembly owes, too. Every tower in this city went up on money lent from the south. The banks of Ambry, across the water: the Corvo, mostly.', next: 'p4' },
    p4: { text: 'Three months ago every bank in Ambry called in everything it was owed in the same week. Nobody in Callis knows why. That is why Benet is shaving his towers and buying black from the dead. He isn\'t greedy. He\'s being dunned.', next: 'p5' },
    p5: { text: 'Everyone in this story owes someone further south. I bought debts cheap my whole life, and I can tell you: the cheapest thing in the world right now is a promise made in Ambry.', effect: (g) => { g.setFlag('pryceSouth', 1); g.setStage(TRUTH, 'done'); } },
    pAfter: { text: 'Ambry. I\'ve never been. I\'ve a feeling one of us is going to.' },
  },
};

// ================================================================ XLIX. THE LIFT TOWERS

const martaLift = {
  c6l1: { speaker: 'narrator' as const, text: 'The storm comes in off the bay in the afternoon, and by dark the rain is going sideways across the plaza. Marta Vidal meets you at the foot of the Old Tower with her hood down and the gauge in her hand.', next: 'c6l2' },
  c6l2: { text: 'A finger in an hour. A whole finger. It\'s never done that. The wind\'s working it like a cork in a bucket.', next: 'c6l3' },
  c6l3: { text: 'There\'s a brake in the core: counterweights on chains, from when they built it. If somebody holds the brake, the tower stays on its keys a while longer. And there are forty clerks on the counting floor who think a storm is a reason to stay indoors.', next: 'c6l4' },
  c6l4: { text: 'I need one pair of hands on the brake and one on the counting floor\'s stair. I\'ll take the gauge. Tell your people. Then come.', effect: (g: GameApi) => g.setStage(LIFT, 'done') },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [DOWN]: {
    id: DOWN, name: 'Down a Storey', story: { chapter: 45, title: 'Down a Storey', act: ACT }, next: [COUNT, 'pascall'],
    notes: (g, s) => {
      if (s === 'letter') return 'A letter from Callis under the Assembly\'s seal: the Old Tower has moved. Marta Vidal, the Warden of the Towers, wants me.';
      if (s === 'gauge') return 'The Assembly is taking its towers down a storey at a time. Marta wants somebody else to read the Old Tower\'s gauge.';
      return 'The Old Tower is three and a half fingers off its mark. The Assembly\'s counting floor is on its eleventh storey, and Arthur Pascall\'s clerks won\'t move.';
    },
    objectives: (g, s) => {
      if (s === 'letter') return [{ text: 'Find Marta Vidal at the Old Tower in Callis', marker: 'marta_vidal' }];
      if (s === 'gauge') return g.flag('c6Gauge') ? [{ text: 'Tell Marta what the gauge says', marker: 'marta_vidal' }] : [{ text: 'Read the Old Tower\'s gauge', marker: 'c6Gauge' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'letter' || (s === 'gauge' && g.flag('c6Gauge')) ? { marta_vidal: '?' } : {}),
    walk: { from: { quests: { storyCamp5: 'done', [DOWN]: 'letter' }, flags: { lendBlack: 'tower' } } },
  },
  [COUNT]: {
    id: COUNT, name: 'The Counting Floor', story: { chapter: 46, title: 'The Counting Floor', act: ACT }, next: [HAND, 'speaker'],
    notes: (g, s) => {
      if (s === 'pascall') return 'Arthur Pascall, clerk of the Assembly\'s bonds, keeps the counting floor on the Old Tower\'s eleventh storey.';
      if (s === 'benet') return g.flag('pascallEnd') === 'arrest' ? 'The Assembly holds the Charter\'s debt, bought from Harrowgate at five in ten on the Speaker\'s papers. I\'m taking Pascall\'s ledger to Benet Sala.' : 'The Assembly holds the Charter\'s debt, bought from Harrowgate at five in ten on the Speaker\'s papers. Pascall stays at his books. Benet Sala should hear it.';
      return 'The Charter sits in Callis next week, for the first time. The Speaker came on the morning packet.';
    },
    objectives: (_g, s) => (s === 'pascall' ? [{ text: 'Find Arthur Pascall at the Old Tower', marker: 'pascall' }] : s === 'benet' ? [{ text: 'Talk to Benet Sala in the Assembly Hall', marker: 'benet_sala' }] : []),
    marks: (_g, s): Marks => (s === 'pascall' ? { pascall: '?' } : s === 'benet' ? { benet_sala: '?' } : {}),
    walk: { from: { quests: { [DOWN]: 'done', [COUNT]: 'pascall' } } },
  },
  [HAND]: {
    id: HAND, name: 'Rhosyn\'s Hand', story: { chapter: 47, title: 'Rhosyn\'s Hand', act: ACT }, next: [TRUTH, 'pryce'],
    notes: (g, s) => (s === 'speaker' ? 'Speaker Rhosyn Tarrant is in Callis for the Charter\'s first sitting abroad. She signed the Third Daughter\'s papers.' : g.flag('rhosynSecret') === 'kept' ? 'Rhosyn sold the Charter\'s debt to Callis to move it to a kinder creditor. I\'ve given her six days, until the sitting.' : 'Rhosyn sold the Charter\'s debt to Callis to move it to a kinder creditor. The Charter will hear it from me at the sitting.'),
    objectives: (_g, s) => (s === 'speaker' ? [{ text: 'Find Speaker Rhosyn Tarrant in the Assembly plaza', marker: 'rhosyn_callis' }] : []),
    marks: (_g, s): Marks => (s === 'speaker' ? { rhosyn_callis: '?' } : {}),
    walk: { from: { quests: { [COUNT]: 'done', [HAND]: 'speaker' }, flags: { 'comp:wenna:joined': 1 } } },
  },
  [TRUTH]: {
    id: TRUTH, name: 'Pryce Tells the Truth', story: { chapter: 48, title: 'Pryce Tells the Truth', act: ACT }, next: [LIFT, 'storm'],
    notes: (_g, s) => (s === 'pryce' ? 'Aubrey Pryce has come to Callis as the Charter\'s witness. He says he has the part nobody else will tell.' : 'The Assembly owes the banks of Ambry, in the south. Three months ago every bank in Ambry called in everything it was owed, in the same week.'),
    objectives: (_g, s) => (s === 'pryce' ? [{ text: 'Talk to Aubrey Pryce by the fountain', marker: 'pryce_callis' }] : []),
    marks: (_g, s): Marks => (s === 'pryce' ? { pryce_callis: '?' } : {}),
    walk: { from: { quests: { [HAND]: 'done', [TRUTH]: 'pryce' }, flags: { tdEnd: 'back' } } },
  },
  [LIFT]: {
    id: LIFT, name: 'The Lift Towers', story: { chapter: 49, title: 'The Lift Towers', act: ACT },
    notes: (_g, s) => (s === 'storm' ? 'A storm is coming in off the bay. Marta Vidal is at the foot of the Old Tower.' : 'The Old Tower\'s gauge jumped a finger in an hour. Marta needs one pair of hands on the brake in the core, and one on the counting floor\'s stair.'),
    objectives: (_g, s) => (s === 'storm' ? [{ text: 'Meet Marta Vidal at the Old Tower in the storm', marker: 'marta_vidal' }] : []),
    marks: (_g, s): Marks => (s === 'storm' ? { marta_vidal: '?' } : {}),
    walk: { from: { quests: { [TRUTH]: 'done', [LIFT]: 'storm' } } },
  },
};

const RHOSYN_LOOK = { skin: '#b07a52', hair: '#d8d4cc', hairStyle: 2, eyes: '#4a3a2a', tunic: '#5a2a3a', trim: '#e8d090', trousers: '#2a2228', boots: '#1e1a18', cape: '#3a1a2a', lashes: true, build: 1.0, age: 0.75 };
const PRYCE_LOOK = { skin: '#e8c4a4', hair: '#4a3a2a', hairStyle: 0, eyes: '#6a5a3a', tunic: '#4a4a52', trim: '#c8c8c0', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', build: 0.9, height: 1.05, age: 0.5 };

export const ACT_SIX: RegionContent = {
  id: 'actSix',
  npcs: [
    { land: 'morrow', id: 'pascall', name: 'Arthur Pascall', title: 'Clerk of the Assembly\'s bonds', look: { skin: '#d8b898', hair: '#5a4a3a', hairStyle: 1, eyes: '#4a4a5a', tunic: '#2a2a3a', trim: '#a8a090', shirt: '#e8e0d0', trousers: '#2a2a30', boots: '#1a1614', build: 0.92, age: 0.55 }, schedule: [{ from: 0, to: 24, at: [OLD.x - 3.5, OLD.z + 6.5], face: [OLD.x, OLD.z + 12], anim: 'idle' }], barks: ['The window, if it\'s a bond.', 'Eleven storeys of it.'], when: (g) => !!at(g, COUNT) },
    { land: 'morrow', id: 'rhosyn_callis', name: 'Rhosyn Tarrant', title: 'Speaker of the Charter', look: RHOSYN_LOOK, schedule: [{ from: 0, to: 24, at: [P.x - 9.5, P.z + 6.5], face: [P.x, P.z], anim: 'idle' }], barks: [], when: (g) => !!at(g, HAND) },
    { land: 'morrow', id: 'pryce_callis', name: 'Aubrey Pryce', title: 'Witness for the Charter', look: PRYCE_LOOK, schedule: [{ from: 0, to: 24, at: [P.x + 7.5, P.z + 4.5], face: [P.x, P.z], anim: 'idle' }], barks: [], when: (g) => !!at(g, TRUTH) },
  ],
  dialogue: { pascall, rhosyn_callis: rhosyn, pryce_callis: pryce },
  quests: QUESTS,
  readables: {
    c6Gauge: {
      title: 'The Old Tower\'s gauge',
      body: 'A brass bob on a long line, hanging in a slot cut through four storeys of stone, against a scale marked in fingers from the midsummer mark.\n\nYou read it twice. The bob hangs three and a half fingers off the mark. While you watch, it swings, and settles, and doesn\'t come back.',
      effect: (g) => g.setFlag('c6Gauge', 1),
    },
  },
  things: [
    { land: 'morrow', id: 'c6Gauge', x: GAUGE.x, z: GAUGE.z, label: 'Read the Old Tower\'s gauge', radius: 2.2, read: 'c6Gauge', when: (g) => at(g, DOWN) === 'gauge' && !g.flag('c6Gauge') },
  ],
  hooks: (D) => {
    hook(D, 'marta_vidal', (g) => {
      const d = at(g, DOWN);
      if (d === 'letter') return 'c6m1';
      if (d === 'gauge') return g.flag('c6Gauge') ? 'c6mRead' : 'c6mWait';
      if (at(g, LIFT) === 'storm') return 'c6l1';
      return undefined;
    }, { ...martaNodes, ...martaLift });
    hook(D, 'benet_sala', (g) => (at(g, COUNT) === 'benet' ? 'c6b1' : undefined), benetNodes);
  },
};
