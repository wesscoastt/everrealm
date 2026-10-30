import type { DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { COLD_SHED, FELL_BARROWS, FELL_LAY } from '../../world/morrow';
import { actFourDone } from './actFour';

// THE HELD, the main story's fifth act (docs/STORY_PLAN.md), first half.
//
// The black went back on Ma's barrow and the dead round it lay down. Not all of them: the first to get
// up, out of the barrows stripped earliest, had already walked off the fell, south, before the black
// went back. And somebody is lifting slabs again, and signing for them "A.P."
//
//   XXXVI   The Ones Who Walked (storyWalked): the risen come down to Cold Harbour at night, where
//           families from the Greywaste farms have come to the shore to get away south. Flag
//           coldFamilies = 'ship' (you pay their passage on the Kittiwake, two hundred marks) |
//           'stay' (they stay behind Wat's barricade of carts).
//   XXXVII  A.P., Again (storySecondAP): Ma's barrow is stripped a second time. The receipt dropped by
//           the cart track is signed A. Pascall, clerk, for the Assembly of Callis: the Assembly is buying
//           the fell's black for its towers.
//   XXXVIII The Gatekeepers' Rolls (storyRolls): Edda Rusk: the black must go back over every stripped
//           barrow on the fell, sixty slabs, and the only black left above ground is in Callis.
//   XXXIX   Callis Lends the Black (storyLendBlack): Benet Sala offers forty slabs from the Old Tower's
//           keystones. Flag lendBlack = 'tower' (taken from the Old Tower, which will be short them) |
//           'bought' (the player pays five hundred marks to have Pascall's slabs sent back) | 'none'.
//
// Cast: Wat Aske, Nan Carse (the families' spokeswoman), Edda Rusk, Benet Sala, Arthur Pascall (named
// only, here).

const WALK = 'storyWalked', AP = 'storySecondAP', ROLLS = 'storyRolls', LEND = 'storyLendBlack';
const ACT = 'The Held';

const [MA] = FELL_BARROWS.filter((b) => b[3] === 'ma');
const SHED = { x: COLD_SHED.x + COLD_SHED.w + 2.5, z: COLD_SHED.z + 3.5 }; // Wat's place
const NAN = { x: COLD_SHED.x + COLD_SHED.w + 6.5, z: COLD_SHED.z + 9.5 };

// ================================================================ XXXVI. THE ONES WHO WALKED

const watNodes = {
  a5w1: { text: 'You came. I wrote to the Gatekeeper, and she wrote to her niece, and here you are. Look at the harbour.', next: 'a5w2' },
  a5w2: { speaker: 'narrator' as const, text: 'The shingle is full: carts, a cow, bedding in heaps, thirty or forty people from the farms along the Greywaste with everything they could carry.', next: 'a5w3' },
  a5w3: { text: 'When the black went back on Ma\'s barrow, the ones round it lay down. But the first to get up, off the first barrows we stripped, had already walked. South. Down the valleys to the farms.', next: 'a5w4' },
  a5w4: { text: 'They come down to the shore at night now. Nan Carse brought her people here because there\'s a boat. The boat won\'t take them. Talk to Nan. Then help me keep them alive till morning.', effect: (g: GameApi) => g.setStage(WALK, 'nan') },
  a5wWait: { text: 'Nan Carse, by the carts. Then the dark. They come when it\'s dark.' },
  a5wFight: { text: 'There. Up from the track. Keep them off the carts!' },
  a5wDone: { text: (g: GameApi) => (g.flag('coldFamilies') === 'ship' ? 'Gone south on the Kittiwake. I watched her round the point. First thing I\'ve watched go right in a year.' : 'They\'re staying. I\'ve made a wall of carts. It isn\'t much. It\'s more than we had.') },
  // XXXVII: the fell again
  a5a1: { text: 'Ma\'s barrow. Somebody\'s been at it. A carter came down the track last week with slabs on, and the tally board says A.P. against every load.', next: 'a5a1b' },
  a5a1b: { text: 'Pryce is home. He\'s a clerk in Joan\'s smelter, or a rich man, or in gaol, depending. It isn\'t Pryce.', effect: (g: GameApi) => g.setStage(AP, 'fell') },
  a5aWait: { text: 'Up on the fell. Ma\'s barrow. Mind the ones that got up again.' },
  a5aBack: { text: (g: GameApi) => (g.has('pascall_receipt') ? 'Pascall. Clerk, for the Assembly of Callis. The Assembly. They\'re buying the dead\'s blankets for their towers, and calling it trade.' : 'Did you find who it is?'), next: 'a5aBack2' },
  a5aBack2: { text: 'The Gatekeepers kept the old rolls. Edda Rusk at Northgate will know what has to go back, and how much. Ask her.', effect: (g: GameApi) => g.setStage(AP, 'done') },
};

const nan: DialogueTree = {
  start: (g) => {
    const s = at(g, WALK);
    if (s === 'nan') return 'n1';
    if (s === 'night') return 'nWait';
    if (s === 'morning') return 'm1';
    return 'nAfter';
  },
  nodes: {
    n1: { text: 'Nan Carse. Carse\'s farm, up the Ashgill, eighteen years. Nobody\'s asked for the farm. Good. They can have it.', next: 'n2' },
    n2: { text: 'My husband\'s mother got up out of the ground behind our byre three nights ago. She was buried in the yard. There was no black on her. She was just tired of lying there, I suppose, with everyone else getting up.', next: 'n3' },
    n3: { text: 'The Kittiwake comes in Thursdays. Her mate takes fares. Brethren carry what pays, he says, and forty people from the Ashgill don\'t pay. We\'ve sixty marks between us.', next: 'n4' },
    n4: { text: 'That\'s tomorrow. Tonight, they\'ll come down the track again. Wat says you\'re handy. Be handy.', effect: (g) => g.setStage(WALK, 'night') },
    nWait: { text: 'Up the track, when it\'s dark. They come in ones and twos. Then they don\'t.' },
    m1: { speaker: 'narrator', text: 'Grey light on the water. Nan Carse is counting heads by the carts, and her count comes out right twice.', next: 'm2' },
    m2: {
      text: 'All of them. Thank you. Now. The boat\'s in at noon, and I\'ve sixty marks and forty people.',
      options: [
        { text: '(Pay 200 marks) I\'ll pay their passage. All of them, south to Callis.', cond: (g) => g.marks >= 200, next: 'm_ship' },
        { text: 'Stay. Wat and I will build a wall of carts, and the Held will have to come through it.', next: 'm_stay' },
      ],
    },
    m_ship: { text: 'Two hundred. You\'ve just bought forty people a life. I\'ll pay you back. I won\'t ever be able to pay you back. Both.', effect: (g) => { g.addMarks(-200); g.setFlag('coldFamilies', 'ship'); g.compRapport('wenna', 4); g.compRapport('ottilie', 3); g.setStage(WALK, 'done'); } },
    m_stay: { text: 'A wall of carts. All right. We\'ve dug wells and buried our own. We can stand behind a cart.', effect: (g) => { g.setFlag('coldFamilies', 'stay'); g.compRapport('tam', 2); g.setStage(WALK, 'done'); } },
    nAfter: { text: (g) => (g.flag('coldFamilies') === 'ship' ? 'Tell Wat we got to Callis. Tell him the cow didn\'t.' : 'Cart wall\'s holding. Wat sleeps in the middle of it with a shovel.') },
  },
};

// ================================================================ XXXVIII. THE GATEKEEPERS' ROLLS

const eddaNodes = {
  a5e1: { speaker: 'narrator' as const, text: 'Edda Rusk reads the receipt holding it a long way from her face, then gets up and takes down a roll from the high shelf without looking for it.', next: 'a5e2' },
  a5e2: { text: 'Pascall. A clerk buys the dead\'s blankets and signs his initials, and the Assembly calls it a lump of building stone. I hate clerks. I am one.', next: 'a5e3' },
  a5e3: { text: 'The roll says what you found on the fell. The black was laid so they would lie still. Every barrow, every slab.', next: 'a5e3b' },
  a5e3b: { text: 'Take it off one and that one gets up. Take it off the fell, and the fell gets up.', next: 'a5e4' },
  a5e4: { text: 'Six barrows on Hollow Fell are stripped. Ten slabs a barrow. Sixty slabs of the black, put back where they came from. Wat can dig them out of the Assembly\'s carts if he has to.', next: 'a5e5' },
  a5e5: { text: 'Except they\'re not in carts. They\'re in Callis, in the towers, holding up the shipping families\' summer houses. The only black above ground is in Callis. You\'ll have to ask the Assembly for it back.', effect: (g: GameApi) => g.setStage(ROLLS, 'done') },
  a5eWait: { text: 'Callis. The Assembly. Ask them for it, and watch their faces.' },
};

// ================================================================ XXXIX. CALLIS LENDS THE BLACK

const benetNodes = {
  a5b1: { text: 'You. The last time you were in this hall you brought me lines I didn\'t want to read. What is it this time?', next: 'a5b2' },
  a5b2: { speaker: 'narrator' as const, text: 'You put Pascall\'s receipt on the Speaker\'s table. He reads it, and doesn\'t pretend not to know the name.', next: 'a5b3' },
  a5b3: { text: 'Pascall buys black for the Morning Tower. The Morning Tower is a finger and a half off its mark. I would rather buy from the dead than watch it walk off into the sky with forty families on its stairs.', next: 'a5b4' },
  a5b4: { text: 'Sixty slabs, the Gatekeepers want. I won\'t take them out of the Morning Tower.', next: 'a5b4b' },
  a5b4b: { text: 'But the Old Tower\'s keystones are the old kingdom\'s own black. I could spare forty. It would hold a season without them. Probably a season.', next: 'a5b5' },
  a5b5: {
    text: 'Or the Charter can buy Pascall\'s slabs back off the Assembly, at what Pascall paid. Five hundred marks. I am not a generous man. I am a tired one.',
    options: [
      { text: 'Lend me the Old Tower\'s forty. The fell can\'t wait a season.', next: 'a5b_tower' },
      { text: '(Pay 500 marks) Send Pascall\'s slabs back to the fell. Leave the Old Tower alone.', cond: (g: GameApi) => g.marks >= 500, next: 'a5b_bought' },
      { text: 'Neither. Wat will dig the fell\'s own black out of the heaps by hand.', next: 'a5b_none' },
    ],
  },
  a5b_tower: { text: 'Forty slabs out of the Old Tower. I\'ll have the Warden take them out from the top, where she says it shows least. Marta won\'t forgive me, and she\'ll be right not to.', effect: (g: GameApi) => { g.setFlag('lendBlack', 'tower'); g.setStage(LEND, 'done'); } },
  a5b_bought: { text: 'Five hundred. The Charter paying the Assembly for what the Assembly took from the dead. It\'s almost funny. The slabs go north on the next cart.', effect: (g: GameApi) => { g.addMarks(-500); g.setFlag('lendBlack', 'bought'); g.compRapport('ottilie', 3); g.setStage(LEND, 'done'); } },
  a5b_none: { text: 'By hand. Out of the heaps they left on the fell, one slab at a time. It\'ll take the winter. I hope the dead are patient.', effect: (g: GameApi) => { g.setFlag('lendBlack', 'none'); g.compRapport('wenna', 2); g.setStage(LEND, 'done'); } },
  a5bWait: { text: 'Well? The Old Tower, or the Charter\'s purse, or Wat\'s shovel.' },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [WALK]: {
    id: WALK, name: 'The Ones Who Walked', story: { chapter: 36, title: 'The Ones Who Walked', act: ACT }, next: [AP, 'wat'],
    notes: (g, s) => {
      if (s === 'harbour') return 'Wat Aske has written from Cold Harbour: the first of the Held to get up walked south off the fell before the black went back.';
      if (s === 'nan') return 'Families from the Greywaste farms have come down to Cold Harbour to get away south. Nan Carse speaks for them.';
      if (s === 'night') return 'The Held come down the track to the harbour after dark. Keep them off the carts until morning.';
      if (s === 'morning') return 'Morning at Cold Harbour, and everyone counted. The Kittiwake comes in at noon. Nan has sixty marks and forty people.';
      return g.flag('coldFamilies') === 'ship' ? 'I paid the families\' passage south on the Kittiwake.' : 'The families are staying at Cold Harbour behind a wall of carts.';
    },
    objectives: (g, s) => {
      if (s === 'harbour') return [{ text: 'Find Wat Aske at Cold Harbour', marker: 'wat_aske' }];
      if (s === 'nan') return [{ text: 'Talk to Nan Carse by the carts', marker: 'nan_carse' }];
      if (s === 'night') { const k = Math.min(6, killed(g, 'walked')); return [{ text: `Keep the Held off the carts (${k}/6)`, marker: 'nan_carse' }]; }
      if (s === 'morning') return [{ text: 'Talk to Nan Carse', marker: 'nan_carse' }];
      return [];
    },
    advance: (g, s) => (s === 'night' && killed(g, 'walked') >= 6 ? 'morning' : null),
    marks: (g, s): Marks => (!s && actFourDone(g) ? { wat_aske: '!' } : s === 'harbour' ? { wat_aske: '?' } : s === 'nan' || s === 'morning' ? { nan_carse: '?' } : {}),
    walk: { from: { quests: { storyCamp4: 'done', [WALK]: 'harbour' } } },
  },
  [AP]: {
    id: AP, name: 'A.P., Again', story: { chapter: 37, title: 'A.P., Again', act: ACT }, next: [ROLLS, 'edda'],
    notes: (g, s) => {
      if (s === 'wat') return 'Wat has something to show me on the tally board.';
      if (s === 'fell') return 'Ma\'s barrow has been stripped again, and the tally board says A.P. against every load. Pryce is home. It isn\'t Pryce.';
      if (s === 'back') return 'A receipt by the cart track on the fell: nine slabs, for the Assembly of Callis, A. Pascall, clerk.';
      return 'The second A.P. is Arthur Pascall, the Assembly\'s clerk, buying the fell\'s black for the towers of Callis.';
    },
    objectives: (g, s) => {
      if (s === 'wat') return [{ text: 'Talk to Wat Aske', marker: 'wat_aske' }];
      if (s === 'fell') {
        const k = Math.min(4, killed(g, 'fell2'));
        return [{ text: `Put down the risen round Ma's barrow (${k}/4)`, done: k >= 4, marker: 'a5Barrow' }, { text: 'Look at Ma\'s barrow', done: g.has('pascall_receipt'), marker: 'a5Barrow' }];
      }
      if (s === 'back') return [{ text: 'Show Wat what you found', marker: 'wat_aske' }];
      return [];
    },
    advance: (g, s) => (s === 'fell' && killed(g, 'fell2') >= 4 && g.has('pascall_receipt') ? 'back' : null),
    marks: (_g, s): Marks => (s === 'wat' || s === 'back' ? { wat_aske: '?' } : {}),
    walk: { from: { quests: { [WALK]: 'done', [AP]: 'wat' } } },
  },
  [ROLLS]: {
    id: ROLLS, name: 'The Gatekeepers\' Rolls', story: { chapter: 38, title: 'The Gatekeepers\' Rolls', act: ACT }, next: [LEND, 'benet'],
    notes: (_g, s) => (s === 'edda' ? 'Edda Rusk at the Gatekeepers\' Archive in Northgate keeps the old rolls. She\'ll know what has to go back on the fell.' : 'Sixty slabs of the black must go back over the six stripped barrows on Hollow Fell. The only black above ground is in the towers of Callis.'),
    objectives: (_g, s) => (s === 'edda' ? [{ text: 'Show Pascall\'s receipt to Edda Rusk at Northgate', marker: 'edda_rusk' }] : []),
    marks: (_g, s): Marks => (s === 'edda' ? { edda_rusk: '?' } : {}),
    walk: { from: { quests: { [AP]: 'done', [ROLLS]: 'edda' }, items: [['pascall_receipt', 1]] } },
  },
  [LEND]: {
    id: LEND, name: 'Callis Lends the Black', story: { chapter: 39, title: 'Callis Lends the Black', act: ACT }, next: ['storyFellsNight', 'wat'],
    notes: (g, s) => {
      if (s === 'benet') return 'Speaker Benet Sala, in the Assembly Hall in Callis, has the black the fell needs, set in his towers.';
      const e = g.flag('lendBlack');
      return e === 'tower' ? 'Benet Sala lends forty slabs from the Old Tower\'s keystones. It will hold a season without them. Probably.' : e === 'bought' ? 'I paid five hundred marks to send Pascall\'s slabs back to the fell. The Old Tower keeps its black.' : 'No black from Callis. Wat will dig the fell\'s own out of the heaps by hand, all winter.';
    },
    objectives: (_g, s) => (s === 'benet' ? [{ text: 'Ask Speaker Benet Sala for the black', marker: 'benet_sala' }] : []),
    marks: (_g, s): Marks => (s === 'benet' ? { benet_sala: '?' } : {}),
    walk: { from: { quests: { [ROLLS]: 'done', [LEND]: 'benet' }, items: [['pascall_receipt', 1]] } },
  },
};

export const ACT_FIVE: RegionContent = {
  id: 'actFive',
  items: [
    { id: 'pascall_receipt', name: 'A receipt from the fell', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#2a2a3a' }, desc: 'Damp, and trodden into the cart track. "Received of Hollow Fell, nine slabs, black. For the Assembly of Callis. A. Pascall, clerk."' },
  ],
  npcs: [
    { land: 'morrow', id: 'nan_carse', name: 'Nan Carse', title: 'Of Carse\'s farm, the Ashgill', look: { skin: '#d8b090', hair: '#8a6a4a', hairStyle: 2, eyes: '#5a6a5a', tunic: '#4a4a3e', trim: '#8a7a5a', trousers: '#3a3830', boots: '#2a241e', cape: '#5a5248', frame: 'f', lashes: true, build: 1.0, age: 0.5 }, schedule: [{ from: 0, to: 24, at: [NAN.x, NAN.z], face: [SHED.x, SHED.z], anim: 'idle' }], barks: ['Forty. Count them again.', 'Thursday. The boat\'s Thursday.'], when: (g) => !!at(g, WALK) },
  ],
  dialogue: { nan_carse: nan },
  quests: QUESTS,
  readables: {
    a5Barrow: {
      title: 'Ma\'s barrow',
      body: 'The black you laid back over the crown is gone again: the turf torn where the slabs were levered off, and cart ruts down the track, deep, going south. Ten slabs, a full cart.\n\nTrodden into the mud of the track is a receipt:\n\n"Received of Hollow Fell, nine slabs, black. For the Assembly of Callis. A. Pascall, clerk."',
      effect: (g) => { if (!g.has('pascall_receipt')) g.give('pascall_receipt'); },
    },
  },
  things: [
    { land: 'morrow', id: 'a5Barrow', x: FELL_LAY.x, z: FELL_LAY.z, label: 'Look at Ma\'s barrow', radius: 2.6, read: 'a5Barrow', when: (g) => at(g, AP) === 'fell' && !g.has('pascall_receipt') },
  ],
  spawns: [
    { land: 'morrow', tag: 'walked', type: 'risen', at: [[COLD_SHED.x - 14, COLD_SHED.z - 6], [COLD_SHED.x - 16, COLD_SHED.z + 4], [COLD_SHED.x - 10, COLD_SHED.z + 12], [COLD_SHED.x - 20, COLD_SHED.z], [COLD_SHED.x - 12, COLD_SHED.z - 12], [COLD_SHED.x - 18, COLD_SHED.z + 9]], when: (g) => at(g, WALK) === 'night' },
    { land: 'morrow', tag: 'fell2', type: 'risen', at: [[MA[0] - 8, MA[1] - 5], [MA[0] + 9, MA[1] - 4], [MA[0] - 5, MA[1] + 9], [MA[0] + 7, MA[1] + 8]], when: (g) => at(g, AP) === 'fell' },
  ],
  hooks: (D) => {
    hook(D, 'wat_aske', (g) => {
      const w = at(g, WALK), a = at(g, AP);
      if (!w && actFourDone(g)) return 'a5w1';
      if (w === 'harbour') return 'a5w1';
      if (w === 'nan') return 'a5wWait';
      if (w === 'night') return 'a5wFight';
      if (a === 'wat') return 'a5a1';
      if (a === 'fell') return 'a5aWait';
      if (a === 'back') return 'a5aBack';
      if (w === 'done' && !a) return 'a5wDone';
      return undefined;
    }, {
      ...watNodes,
      // (a character that finished Act IV before this act existed starts it here)
      a5w1: { ...watNodes.a5w1, effect: (g: GameApi) => { if (!at(g, WALK)) g.setStage(WALK, 'harbour'); } },
    });
    hook(D, 'edda_rusk', (g) => (at(g, ROLLS) === 'edda' ? 'a5e1' : at(g, ROLLS) === 'done' && at(g, LEND) === 'benet' ? 'a5eWait' : undefined), eddaNodes);
    hook(D, 'benet_sala', (g) => (at(g, LEND) === 'benet' ? 'a5b1' : undefined), benetNodes);
  },
};
