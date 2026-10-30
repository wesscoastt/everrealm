import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import { COLD_SHED, COLD_TALLY, FELL_BARROWS, FELL_LAY, NG_ARCHIVE, NG_GATE } from '../../world/morrow';

// THE GREYWASTE and NORTHGATE (world/sites.ts buildColdHarbour, buildHollowFell, buildNorthgate).
//
// THE THIRD DAUGHTER, chapter XX, Lie Still. Cold Harbour is empty but for Wat Aske, the last of
// Pryce's diggers. On Hollow Fell they lifted the black the old kingdom laid over its dead, and the
// dead got up: the Held. Pryce paid double to keep digging, then took the hardest men north to
// Kingsbarrow, the old king's barrow. Wat thinks the black put back would lay them down again; the
// player lays it back over the last barrow they opened, and the dead round it kneel and lie down.
// At Northgate the Gatekeeper, Ursel Hale, has shut the gate. Edda Rusk at the Gatekeepers' Archive
// shows the oldest roll: the black was laid so the dead would lie still, and the wall was built in
// case anyone forgot. If Pryce lifts the king's black, the whole Held gets up at once. Ursel opens the
// postern (flag postern).
//
// Northern names are short and old: Aske, Hale, Rusk.

const HELD = 'tdHeld';
const ACT = 'The Third Daughter';
const [MA] = FELL_BARROWS.filter((b) => b[3] === 'ma');

const wat: DialogueTree = {
  start: (g) => {
    const s = at(g, HELD);
    if (s === 'harbour') return 'w1';
    if (s === 'fell') return 'wFell';
    if (s === 'wat') return 'v1';
    if (s) return 'wDone';
    return 'w0';
  },
  nodes: {
    w0: { text: 'Leave me be. I\'m not one of them. I\'m only tired.' },
    w1: { text: 'Don\'t. I\'m not one of them. Look at my hands. Warm.', next: 'w2' },
    w2: { text: 'Wat Aske. I dug for Pryce, up on Hollow Fell. Twelve of us went up. There\'s me.', next: 'w3' },
    w3: { text: 'The old kingdom laid the black over its dead, in slabs, like a blanket. We lifted the slabs, and Pryce bought them by the cart.', next: 'w4' },
    w4: { text: 'Out of the barrows we stripped, the dead came. Not all at once. One a night, then three, then all of them.', next: 'w5' },
    w5: { text: 'Pryce paid double to keep at it. When the fell was done he took the hard ones north to Kingsbarrow. The best black\'s there, he said.', next: 'w6' },
    w6: {
      text: 'I think if you put the black back, they\'d lie down. I\'m not brave enough to find out.',
      options: [
        { text: 'Where?', next: 'w7' },
        { text: 'Why would that work?', next: 'w8' },
      ],
    },
    w7: { text: 'Ma\'s barrow, the last we opened, in the middle of the fell. Its black\'s heaped beside it. Put it back over the crown.', effect: (g) => g.setStage(HELD, 'fell') },
    w8: { text: 'Because they lay still three hundred years with it on, and got up the week we took it off. I\'m a digger. I can count.', next: 'w7' },
    wFell: { text: 'Ma\'s barrow. The one with the black heaped highest beside it. Up the track, on the moor.' },
    v1: { text: 'They lay down? Just like that?', next: 'v2' },
    v2: { speaker: 'narrator', text: 'You tell him: the slabs went back on the crown, and the ones round the barrow stopped, and knelt, and lay down in the heather.', next: 'v3' },
    v3: { text: 'Then it\'s the black. It was always the black. They weren\'t walking because they were wicked. They were walking because nothing held them.', next: 'v4' },
    v4: { text: 'Pryce is at Kingsbarrow, past Northgate. Northgate shut its gate a month back. They\'ll not open it for a digger. They might for you.', effect: (g) => { g.addMarks(200); g.setStage(HELD, 'gate'); } },
    wDone: { text: 'I\'m putting it back. All of it, one cart at a time. It\'ll take me the rest of my life, and I don\'t mind.' },
  },
};

const maud: DialogueTree = {
  start: (g) => {
    const s = at(g, HELD);
    if (s === 'gate') return 'm1';
    if (s === 'archive') return 'mWait';
    if (s === 'maud') return 'm5';
    if (s === 'done') return 'mDone';
    return 'm0';
  },
  nodes: {
    m0: { text: 'Ursel Hale, Gatekeeper. The gate\'s shut. The town\'s open. Mind which is which.' },
    m1: { text: 'Ursel Hale, Gatekeeper. The gate\'s shut. It\'s been shut a month, and it stays shut until I\'m told otherwise. Nobody tells me otherwise.', next: 'm2' },
    m2: { text: 'There are dead walking up there. The wall was built for this. Three hundred years it\'s never been needed, and now it is.', next: 'm3' },
    m3: { text: 'Your digger-master went through with twenty men, a day before we shut. I\'d not open it for him now.', next: 'm4' },
    m4: { text: 'Go to the Archive. Edda Rusk will tell you what\'s up there. Then tell me why I should open my postern for you.', effect: (g) => g.setStage(HELD, 'archive') },
    mWait: { text: 'The Archive\'s the round tower at the foot of the ramp. Edda Rusk. She\'ll be in. She\'s always in.' },
    m5: { text: 'Edda says you\'ve read the roll.', next: 'm6' },
    m6: { text: 'Then you know what happens if he opens the king\'s barrow. Every dead man in the Held gets up at once.', next: 'm6b' },
    m6b: { text: 'And my wall stops being old and starts being short.', next: 'm7' },
    m7: { text: 'The postern\'s open to you. Shut it behind you. I mean that.', effect: (g) => { g.setFlag('postern', true); g.addMarks(300); g.setStage(HELD, 'done'); } },
    mDone: { text: 'The postern\'s yours, as long as you shut it.', options: [{ text: 'The barracks has cats, I hear.', next: 'mCats' }, { text: 'Bye.' }] },
    mCats: { text: 'Fell sabres. The herders ride them over the drifts. I\'ll sell you one. You\'ve earned a better beast than whatever brought you.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('maud_hale') }, { text: 'Bye.' }] },
  },
};

const edda: DialogueTree = {
  start: (g) => (at(g, HELD) === 'archive' ? 'e1' : at(g, HELD) === 'maud' || at(g, HELD) === 'done' ? 'eDone' : 'e0'),
  nodes: {
    e0: { text: 'Edda Rusk, keeper of the Archive. Three hundred years of Gatekeepers\' rolls, and nobody reads them. Sit, if you like.' },
    e1: { text: 'Edda Rusk, keeper of the Archive. Ursel sent you. She sends me everyone she doesn\'t want to argue with.', next: 'e2' },
    e2: { text: 'Here. The Gatekeepers\' roll, the oldest we have. Read the first page. It\'s short.', next: 'e3', effect: (g) => g.give('gatekeepers_roll') },
    e3: { speaker: 'narrator', text: 'The first page, in a hand three hundred years old: the old king\'s people laid the black over their dead so they would lie still. And they did.', next: 'e4' },
    e4: { text: 'The wall came after, when the old kingdom fell, in case anyone forgot. Everyone forgot. That\'s what walls are for.', next: 'e5' },
    e5: { text: 'Kingsbarrow is the old king\'s own, under the deepest black in Morrow. If your Mr Pryce lifts it, the whole Held gets up. All at once.', next: 'e6' },
    e6: { text: 'Tell Ursel you\'ve read it. She\'ll open the postern. She was always going to. She wanted someone to have read it first.', effect: (g) => g.setStage(HELD, 'maud') },
    eDone: { text: 'Bring the roll back when you\'re done, if you\'re done. Keep it if you\'re not.' },
  },
};

const quests: Record<string, QuestDef> = {
  [HELD]: {
    id: HELD, name: 'Lie Still', region: 'greywaste', story: { chapter: 28, title: 'Lie Still', act: ACT }, next: ['tdKing', 'north'],
    notes: (_g, s) => {
      if (s === 'harbour') return 'The black loads at Cold Harbour, a cove under the Greywaste\'s cliffs. The Kittiwake can take me from Saltpenny, or I can go overland from Callis by the coast road.';
      if (s === 'fell') return 'Wat Aske, the last of Pryce\'s diggers, says the dead got up out of every barrow they stripped on Hollow Fell. He thinks the black put back would lay them down. Ma\'s barrow was the last opened.';
      if (s === 'wat') return 'I laid the black back over Ma\'s barrow, and the dead round it lay down. Wat Aske should know.';
      if (s === 'gate') return 'It\'s the black: with it off them, the dead walk. Pryce took his hardest diggers north to Kingsbarrow, the old king\'s barrow, past Northgate. Northgate has shut its gate.';
      if (s === 'archive') return 'Ursel Hale, the Gatekeeper of Northgate, won\'t open the postern until I\'ve seen Edda Rusk at the Gatekeepers\' Archive.';
      if (s === 'maud') return 'The oldest Gatekeepers\' roll: the old kingdom laid the black on its dead so they\'d lie still, and built the wall in case anyone forgot. If Pryce lifts the king\'s black at Kingsbarrow, the whole Held gets up at once.';
      return 'Ursel Hale has opened Northgate\'s postern to me. Pryce is at Kingsbarrow, digging toward the old king.';
    },
    objectives: (_g, s) => {
      if (s === 'harbour') return [{ text: 'Find out what happened at Cold Harbour', marker: 'wat_aske' }];
      if (s === 'fell') return [{ text: 'Lay the black back over Ma\'s barrow on Hollow Fell', marker: 'fellLay' }];
      if (s === 'wat') return [{ text: 'Tell Wat Aske', marker: 'wat_aske' }];
      if (s === 'gate') return [{ text: 'Go to Northgate and talk to the Gatekeeper', marker: 'maud_hale' }];
      if (s === 'archive') return [{ text: 'See Edda Rusk at the Gatekeepers\' Archive', marker: 'edda_rusk' }];
      if (s === 'maud') return [{ text: 'Tell Ursel Hale you\'ve read the roll', marker: 'maud_hale' }];
      return [];
    },
    advance: (g, s) => (s === 'fell' && g.flag('fellLaid') ? 'wat' : null),
    marks: (_g, s): Marks => (s === 'harbour' || s === 'wat' ? { wat_aske: '?' } : s === 'gate' || s === 'maud' ? { maud_hale: '?' } : s === 'archive' ? { edda_rusk: '?' } : {}),
    walk: { from: { quests: { storyBell: 'done', tdCrew: 'done', tdCallis: 'done', tdSalt: 'done', [HELD]: 'harbour' } } },
  },
};

const items: ItemDef[] = [
  { id: 'gatekeepers_roll', name: 'The first Gatekeepers\' roll', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'letter', a: '#d8c8a0', b: '#5a3a2a' }, desc: 'Three hundred years old, rolled on a stick of black. "They laid the black over them, that they might lie still, and still they lay."' },
];

const NORTH = { skin: '#e0b898', eyes: '#4a5a6a' };

export const GREYWASTE_CONTENT: RegionContent = {
  id: 'greywaste',
  items,
  npcs: [
    {
      land: 'morrow', id: 'wat_aske', name: 'Wat Aske', title: 'Digger, Cold Harbour',
      look: { ...NORTH, skin: '#c8a080', hair: '#5a4a3a', hairStyle: 3, facial: 2, tunic: '#4a4a40', trim: '#6a5a40', trousers: '#3a3430', boots: '#2a2018', hat: 'cap', hatColor: '#3a3430', build: 1.1, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [COLD_SHED.x + COLD_SHED.w + 2.5, COLD_SHED.z + 3.5], face: [COLD_SHED.x + COLD_SHED.w + 8, COLD_SHED.z + 3.5], anim: 'idle' }],
      barks: ['Warm. See?', 'Put it back.'],
    },
    {
      land: 'morrow', id: 'maud_hale', name: 'Ursel Hale', title: 'Gatekeeper of Northgate',
      look: { ...NORTH, hair: '#8a7a6a', hairStyle: 2, tunic: '#3a4048', trim: '#b8a878', trousers: '#2a2a30', boots: '#1e1a16', shoulderPads: '#5a5a62', cape: '#2a3038', lashes: true, scar: true, build: 1.1, age: 0.6 },
      schedule: [{ from: 0, to: 24, at: [NG_GATE.x + 1.5, NG_GATE.z + 6.5], face: [NG_GATE.x + 1.5, NG_GATE.z + 12], anim: 'idle' }],
      barks: ['The gate\'s shut.', 'Shut it behind you.'],
    },
    {
      land: 'morrow', id: 'edda_rusk', name: 'Edda Rusk', title: 'Keeper of the Gatekeepers\' Archive',
      look: { ...NORTH, hair: '#d8d4cc', hairStyle: 4, tunic: '#4a3a4a', trim: '#c8b890', trousers: '#2e2a30', boots: '#2a2018', lashes: true, age: 0.85, build: 0.9 },
      schedule: [{ from: 0, to: 24, at: [NG_ARCHIVE.x + 0.5, NG_ARCHIVE.z - 0.5], y: 28, face: [NG_ARCHIVE.x - 3, NG_ARCHIVE.z + 0.5], anim: 'idle' }],
      barks: ['Nobody reads them.'],
    },
  ],
  dialogue: { wat_aske: wat, maud_hale: maud, edda_rusk: edda },
  quests,
  readables: {
    coldTally: {
      title: 'The tally board at Cold Harbour',
      body: 'LOADS DOWN, HOLLOW FELL TO THE SHINGLE\n\nThe long barrow. 4 cart. A.P.\nThe two sisters. 6 cart. A.P.\nThe ring barrow. 5 cart. A.P.\nThe shepherd\'s. 3 cart. A.P.\nMa\'s barrow. 6 cart. A.P.\n\nUnder it, in chalk, another hand: "Wat says no more."\nUnder that, in ink: "Double. A.P."\n\nThe rest of the board is empty.',
    },
  },
  things: [
    { land: 'morrow', id: 'coldTally', x: COLD_TALLY.x, z: COLD_TALLY.z, label: 'Read the tally board', radius: 2.2, read: 'coldTally' },
    {
      land: 'morrow', id: 'fellLay', x: FELL_LAY.x, z: FELL_LAY.z, label: 'Lay the black back over the barrow', radius: 3.2,
      when: (g: GameApi) => at(g, HELD) === 'fell' && !g.flag('fellLaid'),
      use: (g: GameApi) => {
        g.setFlag('fellLaid', true);
        g.toast('Slab by slab you carry the black back up and lay it over the broken crown. When the last one goes on, the dead round the barrow stop where they stand, and kneel, and lie down in the heather.');
      },
    },
  ],
  spawns: [
    { land: 'morrow', tag: 'fell', type: 'risen', at: [[MA[0] - 9, MA[1] - 4], [MA[0] + 9, MA[1] - 6], [MA[0] - 6, MA[1] + 10], [MA[0] + 8, MA[1] + 9], [MA[0], MA[1] - 11]], when: (g: GameApi) => at(g, HELD) === 'fell' && !g.flag('fellLaid') },
  ],
};
