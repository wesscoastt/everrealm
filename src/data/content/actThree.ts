import type { DialogueTree, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import { COMPANIONS } from '../companions';
import { actTwoDone } from './actTwo';

// THE DROWNED PARISH, the chapters before and after (docs/STORY_PLAN.md, Act III):
//
//   XXI   Half a Purse (storyHalfPurse): on Gullmouth quay Tam Reddick has just won Jacca Pengelly's
//         boat, the Patience, at cards. Jacca fishes her for a living. Flag halfPurse = 'back' (Tam
//         gives her back, because you asked) | 'bought' (you buy her back for Jacca, forty marks) |
//         'kept' (Tam keeps her, and Jacca crews her for him for a share). Tam joins.
//   XXVI  Third Camp (storyCamp3): the last night in Tamar's bell-tower over Holmsey. Tam sits up by the
//         lamp writing a letter, and folds it when you look. Flag tamLetter = 'asked' (he says it's to his
//         mother) | 'let' (you leave him to it). Who the letter is to comes out in Act IV.

const HALF = 'storyHalfPurse', CAMP = 'storyCamp3';
const LOW = 'storyLowWater', BELL = 'storyBell';

// Gullmouth quay, where Tam plays (data/companions.ts: his home), and the drowned bell-tower's planks
const QUAY = { x: 1738.5, z: 601.5 };
const TOWER = { x: 1560.5, z: 1500.5, y: 18 };

const joined = (g: GameApi, id: string) => !!g.flag(`comp:${id}:joined`);
const parish = (g: GameApi) => g.flag('parishEnd') as 'rise' | 'hold' | 'sink' | undefined;

/** Act III's start (Nessa and the bell) waits for Tam's chapter; a character past Act II before it existed goes straight on. */
export const actThreeReady = (g: GameApi) => at(g, HALF) === 'done' || (actTwoDone(g) && !at(g, HALF));
/** Act III is done (Act IV's start waits on it): the camp, or for a character that finished before it existed, the bell. */
export const actThreeDone = (g: GameApi) => at(g, CAMP) === 'done' || (at(g, BELL) === 'done' && !at(g, CAMP));

// ================================================================ XXI. HALF A PURSE

const tamNodes = {
  hp1: { speaker: 'narrator' as const, text: 'There\'s a crowd round an upturned barrel at the end of the quay. A young man in a red waistcoat is folding a bill of sale into his pocket, and a woman in oilskins is staring at the barrelhead as if the cards on it might change.', next: 'hp2' },
  hp2: { text: (g: GameApi) => (g.flag('comp:tam:met') ? 'Oh, it\'s you. You\'ve good timing. I\'ve just won a boat. I don\'t know how to sail. Would you like a boat?' : 'Tam Reddick. You look like somebody who knows which end of a boat is which. I\'ve just won one. I don\'t know which end is which.'), effect: (g: GameApi) => g.setFlag('comp:tam:met', 1), next: 'hp3' },
  hp3: { as: 'jacca', text: 'That\'s the Patience. My father built her. I fish her six days a week, and he\'s sitting on her bill of sale because I thought a pair of nines was a hand.', next: 'hp4' },
  hp4: { text: 'It was a hand. It wasn\'t as good a hand as mine. Nobody made her play, friend. I didn\'t even cheat. I want that noted. Somebody note it.', options: [{ text: 'Did you cheat, Tam?', next: 'hp5' }, { text: 'What will she live on?', next: 'hp6' }] },
  hp5: { text: 'No! Not this time. That\'s what makes it so awkward. If I\'d cheated I could feel bad about it in the usual way.', next: 'hp6' },
  hp6: {
    as: 'jacca', text: 'Six days a week. Mackerel in the summer, pilchards in the autumn. Without her I\'m a woman with a net and nowhere to put it.',
    options: [
      { text: 'Give her the boat back, Tam. You don\'t want it, and she can\'t live without it.', next: 'hp_back' },
      { text: '(Pay 40 marks) I\'ll buy the Patience off you, and Jacca can have her bill of sale.', cond: (g: GameApi) => g.marks >= 40, next: 'hp_bought' },
      { text: 'He won her fairly. Jacca can crew her for him, for a share of the catch.', next: 'hp_kept' },
    ],
  },
  hp_back: { speaker: 'narrator' as const, text: 'Tam looks at you, then at Jacca, then at the sky. He takes the bill of sale out and puts it on the barrelhead and pushes it across with one finger. "There. I\'ve never done that before. It\'s horrible."', effect: (g: GameApi) => { g.setFlag('halfPurse', 'back'); g.compRapport('tam', 3); }, next: 'hp_join' },
  hp_bought: { speaker: 'narrator' as const, text: 'You count forty marks onto the barrelhead. Tam takes them with a face like a man eating something sour, and hands Jacca her bill of sale. She folds it into her oilskins without a word, and then, after a moment, says one.', effect: (g: GameApi) => { g.addMarks(-40); g.setFlag('halfPurse', 'bought'); g.compRapport('tam', 1); }, next: 'hp_join' },
  hp_kept: { as: 'jacca', text: 'A share. On my own boat. Fine. Fine. Half the catch, and you can come out on her once and see what it costs to fill a net.', effect: (g: GameApi) => { g.setFlag('halfPurse', 'kept'); g.compRapport('tam', 2); }, next: 'hp_join' },
  hp_join: { text: 'You\'re here for Nessa Crane, aren\'t you. Everyone who looks like you is here for Nessa. Something about the old bell under the Gulf. I\'m coming. I\'ve never seen a drowned church. And I owe you for the next ten minutes of my life, which I suspect will be better than the last ten.', next: 'hp_join2' },
  hp_join2: { text: 'Tam Reddick, at your service. Mostly honest. Always good company. Lead on.', effect: (g: GameApi) => { if (!joined(g, 'tam')) { g.setFlag('comp:tam:joined', 1); g.setFlag('comp:tam:part', 1); } if (!g.compActive()) g.compJoin('tam'); g.setStage(HALF, 'done'); } },
};

const jacca: DialogueTree = {
  start: (g) => (at(g, HALF) === 'quay' ? 'j_wait' : 'j_after'),
  nodes: {
    j_wait: { text: 'Talk to him, not me. He\'s the one with my boat in his pocket.' },
    j_after: {
      text: (g) => {
        const h = g.flag('halfPurse');
        if (h === 'back') return 'I\'ve the Patience back and a story to tell. He didn\'t have to. I keep thinking about that.';
        if (h === 'bought') return 'Forty marks. I\'ll pay you back by Michaelmas. Don\'t argue, I\'ve already decided.';
        return 'Half the catch goes in his pocket now. He came out on her once, like I said. He was sick twice and said it was the best day of his life.';
      },
    },
  },
};

// ================================================================ XXVI. THIRD CAMP

const campTam: DialogueTree = {
  start: (g) => (g.flag('camp3T') ? 'ct_again' : 'ct1'),
  nodes: {
    ct1: { speaker: 'narrator', text: 'Tam is sitting with his back to the tower wall and the lamp at his elbow, writing on a board across his knees. When you come over he folds the paper twice and slides it inside his waistcoat.', next: 'ct2' },
    ct2: {
      text: 'Couldn\'t sleep. Water slapping all night under the planks. How does Tamar stand it?',
      options: [
        { text: 'Who are you writing to?', next: 'ct_ask' },
        { text: '(Let him keep his letter) Me neither.', next: 'ct_let' },
      ],
    },
    ct_ask: { text: 'My mother. In Saltpenny. She worries. She likes to know where I am, and who I\'m with, and what they\'re doing. Mothers. You know.', effect: (g) => { g.setFlag('tamLetter', 'asked'); g.setFlag('camp3T', 1); }, next: 'ct3' },
    ct_let: { text: 'There\'s a lot of water under this floor. And a whole parish. I keep thinking they can hear us.', effect: (g) => { g.setFlag('tamLetter', 'let'); g.compRapport('tam', 2); g.setFlag('camp3T', 1); }, next: 'ct3' },
    ct3: {
      text: (g) => (parish(g) === 'sink'
        ? 'Tamar\'s packing. The Harrowgate dredge comes next week. She hasn\'t cried once. I\'d be useless.'
        : parish(g) === 'hold' ? 'When the bell went tonight Tamar didn\'t even look up. She said it rings every low water now, so it\'s not news. Then she smiled at the floor for an hour.'
          : 'Nessa\'s moving the lane west. Half a day longer to the smelter. The bargemen will hate it for a year and then forget there was ever another way.'),
    },
    ct_again: { text: 'Go on, sleep. I\'ll keep the lamp.' },
  },
};

const campWenna: DialogueTree = {
  start: (g) => (g.flag('camp3W') ? 'cw_again' : 'cw1'),
  nodes: {
    cw1: { text: 'Gullmouth\'s right there, across the water. You can see the Light from the window on the north side, if you lean.', next: 'cw2' },
    cw2: {
      text: (g) => (Number(g.flag('comp:wenna:part') ?? 0) >= 2
        ? 'I told you about the Gannet, on the quay. I don\'t feel better. I feel like somebody else knows, which is different, and maybe better than better.'
        : 'I keep saying I\'ll tell you on the quay. We were on the quay this week. I didn\'t. I will.'),
      options: [{ text: 'I\'m glad you\'re here, Wenna.', next: 'cw_glad' }, { text: 'Get some sleep.', next: 'cw_sleep' }],
    },
    cw_glad: { text: 'So am I. Don\'t make a thing of it.', effect: (g) => { g.compRapport('wenna', 3); g.setFlag('camp3W', 1); } },
    cw_sleep: { text: 'First watch. Same as always.', effect: (g) => g.setFlag('camp3W', 1) },
    cw_again: { text: 'There\'s a light out on the Gulf. A boat. Probably a boat.' },
  },
};

const campOtt: DialogueTree = {
  start: (g) => (g.flag('camp3O') ? 'co_again' : 'co1'),
  nodes: {
    co1: { text: 'Half a fathom in twelve years. An inch a month now. Tamar measured it with a lead line and her own arm. I\'ve never been so jealous of an arm.', next: 'co2' },
    co2: {
      text: 'Everything we\'ve stood on since spring has moved. The Kirk floor, the isle, now a whole parish under the sea. Do you think anywhere stays where it is?',
      options: [{ text: 'Not if somebody keeps digging under it.', next: 'co_dig' }, { text: 'People do. That\'s what you measure from.', next: 'co_people' }],
    },
    co_dig: { text: 'Then the thing to measure is the digging. That\'s a sentence I\'m going to write down and feel clever about.', effect: (g) => { g.compRapport('ottilie', 2); g.setFlag('camp3O', 1); } },
    co_people: { text: 'That\'s either very wise or very soppy. I\'m too tired to tell. I\'ll decide in the morning.', effect: (g) => { g.compRapport('ottilie', 3); g.setFlag('camp3O', 1); } },
    co_again: { text: 'Sleep. I\'m counting the bell. Eleven strokes since dark.' },
  },
};

const campTamar: DialogueTree = {
  start: (g) => (g.flag('camp3M') ? 'cm_again' : 'cm1'),
  nodes: {
    cm1: { text: 'You\'ll want the dry corner. There isn\'t a dry corner. There\'s a less wet one, by the stair.', next: 'cm2' },
    cm2: { text: 'Ralph Sweet slept up here the last winter, writing the register by candle with the nave under him. Now there\'s me, and you lot. I like to think he\'d have liked the company.', effect: (g) => g.setFlag('camp3M', 1) },
    cm_again: { text: 'Low water\'s at four. The bell will wake you. It always does.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [HALF]: {
    id: HALF, name: 'Half a Purse', story: { chapter: 21, title: 'Half a Purse', act: 'The Drowned Parish' }, next: [LOW, 'nessa'],
    notes: (g, s) => {
      if (s === 'quay') return 'Nessa Crane has written from Gullmouth. There\'s a crowd on the quay round a card game.';
      const h = g.flag('halfPurse');
      return h === 'back' ? 'Tam Reddick won Jacca Pengelly\'s boat at cards, and gave it back because I asked. He travels with me.' : h === 'bought' ? 'Tam Reddick won Jacca Pengelly\'s boat at cards. I bought it back for her. He travels with me.' : 'Tam Reddick won Jacca Pengelly\'s boat at cards and kept it; she crews it for a share. He travels with me.';
    },
    objectives: (_g, s) => (s === 'quay' ? [{ text: 'See what the crowd on Gullmouth quay is about', marker: 'comp_tam' }] : []),
    marks: (_g, s): Marks => (s === 'quay' ? { comp_tam: '?' } : {}),
    walk: { from: { quests: { storyCamp2: 'done', [HALF]: 'quay' } }, cast: ['jacca'] },
  },
  [CAMP]: {
    id: CAMP, name: 'Third Camp', story: { chapter: 26, title: 'Third Camp', act: 'The Drowned Parish' },
    notes: (g, s) => (s === 'tower' ? (parish(g) === 'sink' ? 'Tamar\'s last night in the bell-tower before the dredge. She\'s asked us to stay.' : 'Night on the Gulf. Tamar has room on her planks in the bell-tower, if nobody minds the wet.') : 'A night in the drowned bell-tower, the water under the planks and the bell ringing at low water.'),
    objectives: (g, s) => {
      if (s !== 'tower') return [];
      const o: { text: string; marker?: string; done?: boolean }[] = [];
      if (joined(g, 'tam')) o.push({ text: 'Sit with Tam', done: !!g.flag('camp3T'), marker: 'camp3_tam' });
      if (joined(g, 'wenna')) o.push({ text: 'Sit with Wenna', done: !!g.flag('camp3W'), marker: 'camp3_wenna' });
      if (joined(g, 'ottilie')) o.push({ text: 'Sit with Ottilie', done: !!g.flag('camp3O'), marker: 'camp3_ottilie' });
      o.push({ text: 'Sleep on the planks', marker: 'camp3Sleep' });
      return o;
    },
    marks: (g, s): Marks => (s === 'tower' ? {
      ...(joined(g, 'tam') && !g.flag('camp3T') ? { camp3_tam: '?' as const } : {}),
      ...(joined(g, 'wenna') && !g.flag('camp3W') ? { camp3_wenna: '?' as const } : {}),
      ...(joined(g, 'ottilie') && !g.flag('camp3O') ? { camp3_ottilie: '?' as const } : {}),
    } : {}),
    // They're at the tower with you: whoever was at your side sits down on the planks
    advance: (g, s) => { if (s === 'tower' && g.compActive() && g.compNear(TOWER.x, TOWER.z, 10)) g.compDismiss(); return null; },
    walk: { from: { quests: { [BELL]: 'done', [CAMP]: 'tower' }, flags: { parishEnd: 'hold', 'comp:tam:joined': 1, 'comp:wenna:joined': 1, 'comp:ottilie:joined': 1 } } },
  },
};

const look = (id: 'wenna' | 'ottilie' | 'tam') => COMPANIONS[id].look;
const inCamp = (g: GameApi) => at(g, CAMP) === 'tower';
const on = (dx: number, dz: number): [number, number] => [TOWER.x + dx, TOWER.z + dz];

export const ACT_THREE: RegionContent = {
  id: 'actThree',
  npcs: [
    { id: 'jacca', name: 'Jacca Pengelly', title: 'Fisherwoman, the Patience', look: { skin: '#c89070', hair: '#6a4a2a', hairStyle: 4, eyes: '#4a5a4a', tunic: '#3a4a52', trim: '#c8b080', trousers: '#2a3036', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a24', frame: 'f', lashes: true, build: 1.02, age: 0.35 }, schedule: [{ from: 0, to: 24, at: [QUAY.x + 2.6, QUAY.z + 2.2], face: [QUAY.x, QUAY.z], anim: 'idle' }], barks: ['Pilchards by Michaelmas.', 'Nines. A pair of nines.'], when: (g) => !!at(g, HALF) },
    { id: 'camp3_tam', name: 'Tam Reddick', title: 'Card sharp, mostly honest', look: look('tam'), schedule: [{ from: 0, to: 24, at: on(-1.6, -1.8), face: on(0, 0), anim: 'idle', y: TOWER.y }], barks: [], when: (g) => inCamp(g) && joined(g, 'tam') },
    { id: 'camp3_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: on(-1.7, 1.6), face: on(0, 0), anim: 'idle', y: TOWER.y }], barks: [], when: (g) => inCamp(g) && joined(g, 'wenna') },
    { id: 'camp3_ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice', look: look('ottilie'), schedule: [{ from: 0, to: 24, at: on(1.7, -1.4), face: on(0, 0), anim: 'idle', y: TOWER.y }], barks: [], when: (g) => inCamp(g) && joined(g, 'ottilie') },
  ],
  dialogue: { jacca, camp3_tam: campTam, camp3_wenna: campWenna, camp3_ottilie: campOtt },
  quests: QUESTS,
  readables: {
    camp3Sleep: {
      title: 'The planks',
      body: (g) => `You sleep badly and well, both. The water talks under the planks all night. At four the bell rolls on the drowned floor and speaks once, flat and wet, and ${parish(g) === 'sink' ? 'Tamar sits up and listens to it until it stops' : 'nobody wakes but you'}.\n\n${joined(g, 'tam') ? 'When you get up, Tam\'s lamp has burnt out, and he\'s asleep sitting up with his hand inside his waistcoat. ' : ''}In the morning Nessa Crane is on the quay at Gullmouth, waving a letter at the tower.`,
      effect: (g) => { if (inCamp(g)) g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    { id: 'camp3Sleep', x: TOWER.x - 1.5, z: TOWER.z + 0.5, y: TOWER.y, label: 'Sleep on the planks', radius: 1.8, read: 'camp3Sleep', when: (g) => inCamp(g) && (!joined(g, 'tam') || !!g.flag('camp3T')) && (!joined(g, 'wenna') || !!g.flag('camp3W')) && (!joined(g, 'ottilie') || !!g.flag('camp3O')) },
  ],
  hooks: (D) => {
    hook(D, 'comp_tam', (g) => (at(g, HALF) === 'quay' ? 'hp1' : undefined), tamNodes);
    // Tamar, the night of the camp
    hook(D, 'tamar', (g) => (inCamp(g) ? (g.flag('camp3M') ? 'cm_again' : 'cm1') : undefined), campTamar.nodes);
  },
};
