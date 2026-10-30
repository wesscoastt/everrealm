import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// THE OUTER LANDS: the three towns at the far ends of the roads over the necks.
//
// Cragsby, on the Gannet Cliffs (levels 8-14): fowlers who go down the cliffs on ropes for eggs and
//   feathers. THE LONG ROPE (quest): conger skin for Hal Skene's splices, then the foxes in the egg store.
// Holme Staithe, on the Wrath Levels (14-20): eel-catchers and reed-cutters on a mere. Harrowgate has
//   cut a drain to dry the Levels for wheat, and the meres are dropping. THE SLUICE (quest): jellies in
//   the drain, and the company's gate that keeps sticking shut. hsChoice = 'told' | 'quiet'.
// Scarrow Tor, on Tolmen Moor (28-35): tinners and moormen under a tor with a holed stone that mothers
//   pass their babies through. Harrowgate's quarry gang has chalked it for setts for Ansbury's New Town.
//   THE HOLED STONE (quest): wolves on the tor, then the chalk. stChoice = 'chalk' | 'setts'.
//
// Positions are literal because content modules import types only. Squares' middles: Cragsby
// (250, -1000), Holme Staithe (-890, 1010), Scarrow Tor (340, 2966). Each inn's door is 13 west and
// 10 north of its square's middle; Holme's sluice is 26 east and 34 north of its square; Scarrow's
// holed stone is 13 east and 27 south of its square, under the tor.

const ROPE = 'otRope', SLUICE = 'otSluice', STONE = 'otStone';

// ================================================================ The people

export const OUTER_PEOPLE: NpcDef[] = [
  {
    // Cragsby's innkeeper, fifties. Dry. Measures everything against the two years since the road came.
    id: 'corran', name: 'Tib Corran', title: 'The Kittiwake, Cragsby',
    look: { skin: '#e2b894', hair: '#5a4a3a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#4a5a6a', trim: '#d8c090', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.04, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [240.8, -1007.5], face: [240.8, -1003], anim: 'idle' }], // (beside the inn sign, not in it)
    barks: ['Eggs, fish or bread.', 'Mind the edge. Everyone says that. Mind it anyway.'],
  },
  {
    // The cragsman, forties. Goes down the cliff for the village. Few words, all of them about rope.
    id: 'skene', name: 'Hal Skene', title: 'Cragsman, Cragsby',
    look: { skin: '#c8906a', hair: '#2a2018', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#3a3028', boots: '#2a1e14', hat: 'cap', hatColor: '#3a3a3a', build: 1.12, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [262.5, -994.5], face: [266, -994.5], anim: 'idle' }],
    barks: ['Forty fathom of rope, and I know every one.'],
  },
  {
    // Holme Staithe's innkeeper, sixties. Blunt, eel-proud, furious about the drain.
    id: 'haddow', name: 'Peg Haddow', title: 'The Staithe House, Holme Staithe',
    look: { skin: '#d8a882', hair: '#9a948c', hairStyle: 3, eyes: '#4a4a3a', tunic: '#6a5a3a', trim: '#c8b080', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.08, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [-899.2, 1002.5], face: [-899.2, 1007], anim: 'idle' }], // (beside the inn sign, not in it)
    barks: ['Eels smoked, eels stewed.', 'A foot down since spring. A foot!'],
  },
  {
    // The reeve, thirties. Careful, precise, writes everything down. Paid by the company and the village both.
    id: 'tilney', name: 'Ambrose Tilney', title: 'Reeve, Holme Staithe',
    look: { skin: '#e0b48e', hair: '#6a4a2a', hairStyle: 1, eyes: '#4a3a2a', tunic: '#3a4a3a', trim: '#a89060', trousers: '#2e2e30', boots: '#2a1e14', build: 0.94, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [-898.5, 1014.5], face: [-903, 1014.5], anim: 'idle' }],
    barks: ['I write things down. It\'s most of the job.'],
  },
  {
    // The company's sluice-keeper, only once the reeve has told Harrowgate about the gate.
    id: 'rudd', name: 'Abner Rudd', title: 'Sluice-keeper, Harrowgate & Daughters',
    look: { skin: '#c88a62', hair: '#3a2a1e', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#3a2a1a', build: 1.1, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [-860.5, 979.5], face: [-864, 976], anim: 'idle' }],
    when: (g) => g.flag('hsChoice') === 'told',
    barks: ['Company gate. Company sits on it.'],
  },
  {
    // Scarrow Tor's innkeeper, forties. Warm, nosy, practical; knows everyone's croup.
    id: 'kitto', name: 'Senara Kitto', title: 'The Tinners\' Arms, Scarrow Tor',
    look: { skin: '#e8c0a0', hair: '#7a3a1e', hairStyle: 4, eyes: '#3a5a4a', tunic: '#5a3a4a', trim: '#e0c890', trousers: '#3a3034', boots: '#2a1e14', apron: true, lashes: true, build: 1.0, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [330.8, 2958.5], face: [330.8, 2963], anim: 'idle' }], // (beside the inn sign, not in it)
    barks: ['Pasty, char, or the fire. The fire\'s free.'],
  },
  {
    // The stone's keeper, eighties. Sharp, few words, will not be hurried.
    id: 'nankervis', name: 'Caddy Nankervis', title: 'Scarrow Tor',
    look: { skin: '#d8b090', hair: '#e8e4dc', hairStyle: 3, eyes: '#4a4a3a', tunic: '#3a3a4a', trim: '#8a8a7a', trousers: '#3a3430', boots: '#2a2220', cape: '#5a4a3a', lashes: true, build: 0.86, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [343.5, 2968.5], face: [340.5, 2966.5], anim: 'idle' }],
    barks: ['One thing at a time.'],
  },
  {
    // The quarry ganger, once the stone's fate is settled one way or the other.
    id: 'polgrain', name: 'Ned Polgrain', title: 'Quarry ganger, Harrowgate & Daughters',
    look: { skin: '#c89070', hair: '#5a4a3a', hairStyle: 0, eyes: '#4a3a2a', tunic: '#6a5a4a', trim: '#8a7a5a', trousers: '#4a4034', boots: '#3a2a1c', hat: 'cap', hatColor: '#4a4a4a', build: 1.18, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [350.5, 2991.5], face: [353, 2993], anim: 'idle' }],
    when: (g) => !!g.flag('stChoice'),
    barks: ['Setts, eight to the yard.'],
  },
];

// ================================================================ Cragsby: THE LONG ROPE

const corran: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('corranMet') ? 'Eggs, fish or bread.' : 'The Kittiwake. Only inn on the cliffs, so it\'s the best one. Eggs, fish or bread.'),
      effect: (g) => g.setFlag('corranMet'),
      options: [
        { text: 'Let me see what you have.', effect: (g) => g.openShop('corran') },
        { text: 'What do people do up here?', next: 'n1' },
        { text: 'Bye.' },
      ],
    },
    n1: { text: 'Fowling. We go down the cliffs on a rope for eggs and feathers, and come back up. Mostly.', next: 'n2' },
    n2: { text: 'The Post\'s new. Two years ago this was the end of the world. Now it\'s the end of the road. People visit.', next: 'n3' },
    n3: { text: 'Hal Skene does the rope. If he\'s talking to you, he wants something carried.' },
  },
};

const skene: DialogueTree = {
  start: (g) => {
    const s = at(g, ROPE);
    if (!s) return 'h1';
    if (s === 'skins') return g.count('conger_skin') >= 3 ? 's1' : 'sWait';
    if (s === 'foxes') return killed(g, 'cgFoxes') >= 5 ? 'f1' : 'fWait';
    return 'main';
  },
  nodes: {
    main: { text: 'Rope\'s good for thirty years. I\'ll be dead before it isn\'t. That\'s the plan.' },
    h1: { text: 'Hal Skene. I go down the cliff for the village. Somebody has to, and the somebody is me.', next: 'h2' },
    h2: { text: 'That\'s the rope. Forty fathom. Three old ropes spliced into one, and the splices are going.', next: 'h3' },
    h3: { text: 'Harrowgate\'s man came up on the Post. Offered wire rope, a mark a fathom. You can\'t splice wire on a ledge.', next: 'h4' },
    h4: {
      text: 'Gullmouth riggers bind a splice in conger skin. It shrinks as it dries and never lets go. I need three skins.',
      options: [{ text: 'I\'ll get you three.', next: 'h5' }, { text: 'Not now.' }],
    },
    h5: { text: 'Congers are in the sea under the cliffs. You\'ll have to go in after them. They bite.', effect: (g) => g.setStage(ROPE, 'skins') },
    sWait: { text: (g) => `Conger skin. ${Math.min(3, g.count('conger_skin'))} of three. The sea under the cliffs.` },
    s1: { text: 'Three skins.', options: [{ text: 'Hand them over.', next: 's2' }] },
    s2: { speaker: 'narrator', text: 'He soaks them in a bucket, slits them into strips with his thumbnail, and has the first splice bound before you\'ve dried off.', next: 's3' },
    s3: { text: 'Now the other thing. Foxes got into the egg store while you were in the sea. Five of them.', next: 's4' },
    s4: { text: 'They\'ve learned where the door is. I\'d go myself, but I\'m holding a rope.', effect: (g) => { g.take('conger_skin', 3); g.setStage(ROPE, 'foxes'); } },
    fWait: { text: (g) => `Foxes, round the egg store. ${Math.min(5, killed(g, 'cgFoxes'))} of five.` },
    f1: { text: 'That\'s the foxes. Rope\'s done too. Pull on that. That would hold a cow.', next: 'f2' },
    f2: {
      text: 'Harrowgate\'s man can keep his wire. Here. Your share of the season\'s eggs, and what the store owes you.',
      effect: (g) => { g.give('gannet_egg', 4); g.addMarks(45); g.setStage(ROPE, 'done'); },
    },
  },
};

// ================================================================ Holme Staithe: THE SLUICE

const haddow: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => {
        if (g.flag('hsChoice') === 'quiet') return 'Mere\'s up an inch this week. Don\'t ask me why. I don\'t.';
        if (g.flag('hsChoice') === 'told') return 'Company\'s put a man on the gate. He eats here. He pays. I hate that he pays.';
        return g.flag('haddowMet') ? 'Eels smoked, eels stewed, or bread if you\'re from Ansbury.' : 'The Staithe House. Eels smoked, eels stewed, or bread if you\'re from Ansbury.';
      },
      effect: (g) => g.setFlag('haddowMet'),
      options: [
        { text: 'Let me see what you have.', effect: (g) => g.openShop('haddow') },
        { text: 'What\'s this drain I keep hearing about?', next: 'd1', cond: (g) => !g.flag('hsChoice') },
        { text: 'Bye.' },
      ],
    },
    d1: { text: 'Harrowgate cut a ditch across the Levels to dry them out for wheat. Wheat! Here.', next: 'd2' },
    d2: { text: 'The meres are a foot down since spring. Eels don\'t live in a foot less of anything.', next: 'd3' },
    d3: { text: 'Ambrose takes the company\'s money to watch it. Ask him how that\'s going.' },
  },
};

const tilney: DialogueTree = {
  start: (g) => {
    const s = at(g, SLUICE);
    if (!s) return 'a1';
    if (s === 'jellies') return 'aWait';
    if (s === 'sluice') return 'gWait';
    if (s === 'back') return 'b1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (g.flag('hsChoice') === 'told'
        ? 'Abner Rudd sits on the gate now. I put it in the book. I put most things in the book.'
        : 'Drain Number Four. Clear, and sticking, as recorded.'),
    },
    a1: { text: 'Ambrose Tilney, reeve. The company pays me two marks a quarter to keep an eye on their drain.', next: 'a2' },
    a2: { text: 'My eye says it\'s full of jellies. Thick as frogspawn since they dug it, and they\'ve started coming up the lanes.', next: 'a3' },
    a3: {
      text: 'Clear the drain by the sluice and I\'ll pay you out of the company\'s two marks. Both of them, and some of mine.',
      options: [{ text: 'I\'ll clear it.', next: 'a4' }, { text: 'Not now.' }],
    },
    a4: { text: 'And look at the gate while you\'re up there. The company says it keeps sticking shut. I\'d like to write that somebody looked.', next: 'a5' },
    a5: { text: 'North of the houses. Drain Number Four. You\'ll smell it before you see it.', effect: (g) => g.setStage(SLUICE, 'jellies') },
    aWait: { text: (g) => `Jellies in the drain, north of the houses. ${Math.min(5, killed(g, 'hsDrain'))} of five.` },
    gWait: { text: 'The gate. Look at the gate. I can\'t write "I assume".' },
    b1: {
      text: 'Well? Is it sticking?',
      options: [
        { text: 'Someone jammed it with an eel trap. Someone from Holme.', next: 't1' },
        { text: 'It\'s stuck. Old timber swells in the wet.', next: 'q1' },
      ],
    },
    t1: { text: 'An eel trap.', next: 't2' },
    t2: { speaker: 'narrator', text: 'He writes it down, slowly, as if the pen might change its mind.', next: 't3' },
    t3: { text: 'Then I tell the company. It\'s what they pay me for. They\'ll send a man to sit on the gate.', next: 't4' },
    t4: {
      text: 'Your fee, from the company, in full. Peg won\'t serve me for a month. That\'s in the book too.',
      effect: (g) => { g.addMarks(40); g.setFlag('hsChoice', 'told'); g.setStage(SLUICE, 'done'); },
    },
    q1: { text: 'Old timber. That\'s what I\'ll write.', next: 'q2' },
    q2: { speaker: 'narrator', text: 'He doesn\'t write anything.', next: 'q3' },
    q3: {
      text: 'The mere\'s held since the gate started sticking. Here. Some marks, and Peg\'s eels. She\'ll know why.',
      effect: (g) => { g.addMarks(20); g.give('smoked_eel', 3); g.setFlag('hsChoice', 'quiet'); g.setStage(SLUICE, 'done'); },
    },
  },
};

const rudd: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: { text: 'Somebody wedged an eel trap in my gate. Now I sit here, and the gate opens when the company says. Every night.' },
  },
};

// ================================================================ Scarrow Tor: THE HOLED STONE

const kitto: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('kittoMet') ? 'Pasty, char, or the fire. The fire\'s free.' : 'The Tinners\' Arms. Pasty, char, or the fire. The fire\'s free.'),
      effect: (g) => g.setFlag('kittoMet'),
      options: [
        { text: 'Let me see what you have.', effect: (g) => g.openShop('kitto') },
        { text: 'What\'s the stone on the tor?', next: 'n1' },
        { text: 'Bye.' },
      ],
    },
    n1: { text: 'The holed stone. Mothers pass their babies through it for the croup. Mine passed me. I\'ve never had croup.', next: 'n2' },
    n2: {
      text: (g) => (g.flag('stChoice') === 'setts'
        ? 'Harrowgate\'s cutting it up for Ansbury\'s streets. Ansbury will walk on our croup. Serves them right.'
        : 'Caddy Nankervis does the passing. She\'s done it sixty years and she still drops one in three. Onto moss.'),
    },
  },
};

const nankervis: DialogueTree = {
  start: (g) => {
    const s = at(g, STONE);
    if (!s) return 'c1';
    if (s === 'wolves') return 'cWait';
    if (s === 'choice') return 'd1';
    if (s === 'chalk') return 'kWait';
    if (s === 'back') return 'r1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (g.flag('stChoice') === 'chalk'
        ? 'Their measure-man comes back in the spring. I\'ll be on the tor when he does, with moss.'
        : 'Firstday, they say. They\'ve said firstday for three firstdays.'),
    },
    c1: { text: 'Caddy Nankervis. I pass the babies through the stone. Somebody has to, and the mothers drop them.', next: 'c2' },
    c2: { text: 'Harrowgate\'s quarry gang have chalked it for setts. Ansbury\'s new streets want granite, and it\'s granite.', next: 'c3' },
    c3: {
      text: 'They won\'t go up while the wolves den on the tor. Neither will the mothers. Five wolves. Will you?',
      options: [{ text: 'I\'ll clear the wolves.', next: 'c4' }, { text: 'Not now.' }],
    },
    c4: { text: 'Then the gang\'s up there by firstday. One thing at a time.', effect: (g) => g.setStage(STONE, 'wolves') },
    cWait: { text: (g) => `The tor. ${Math.min(5, killed(g, 'stWolves'))} of five.` },
    d1: { text: 'Wolves gone. So the gang comes up on firstday with their wedges.', next: 'd2' },
    d2: {
      text: 'Unless the chalk\'s gone. Then they measure again, and their measure-man is in Ansbury till spring.',
      options: [
        { text: 'I\'ll rub the chalk off.', next: 'e1' },
        { text: 'It\'s a stone. Ansbury needs its streets.', next: 's1' },
      ],
    },
    e1: { text: 'Wet moss. It comes off with wet moss. All of it, mind. They count.', effect: (g) => g.setStage(STONE, 'chalk') },
    kWait: { text: 'The chalk. Wet moss.' },
    s1: { text: 'It\'s a stone. So\'s a grave.', next: 's2' },
    s2: { speaker: 'narrator', text: 'She counts out marks from a tin, one at a time, as if each one had insulted her.', next: 's3' },
    s3: {
      text: 'That\'s for the wolves. The wolves were real.',
      effect: (g) => { g.addMarks(35); g.setFlag('stChoice', 'setts'); g.setStage(STONE, 'done'); },
    },
    r1: { text: 'Gone? All of it?', next: 'r2' },
    r2: { speaker: 'narrator', text: 'She goes up the tor to look for herself, which takes a while, and comes down pleased with the moss.', next: 'r3' },
    r3: {
      text: 'Their measure-man can measure again in the spring. Here. Senara makes these, and I don\'t eat crust.',
      effect: (g) => { g.give('moor_pasty', 3); g.addMarks(25); g.setFlag('stChoice', 'chalk'); g.setStage(STONE, 'done'); },
    },
  },
};

const polgrain: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('stChoice') === 'chalk'
        ? 'Somebody\'s rubbed my marks off. Measure-man\'s in Ansbury till spring. That\'s a season\'s pay for six men.'
        : 'Wedges go in firstday. Eight setts to the yard. You can watch. The mothers won\'t.'),
    },
  },
};

// ================================================================ The module

export const OUTER: RegionContent = {
  id: 'outer',
  npcs: OUTER_PEOPLE,
  dialogue: { corran, skene, haddow, tilney, rudd, kitto, nankervis, polgrain },
  shops: {
    corran: {
      id: 'corran', name: 'The Kittiwake', owner: 'corran', who: 'Tib',
      stock: [{ item: 'gannet_egg', price: 12 }, { item: 'cooked_mackerel', price: 22 }, { item: 'bread', price: 5 }, { item: 'fishing_rod', price: 16 }],
      buyRate: () => 0.5,
      footer: () => 'Tib pays half an item\'s worth',
    },
    haddow: {
      id: 'haddow', name: 'The Staithe House', owner: 'haddow', who: 'Peg',
      stock: [{ item: 'smoked_eel', price: 30 }, { item: 'bread', price: 5 }, { item: 'cooked_mackerel', price: 22 }],
      buyRate: () => 0.5,
      footer: () => 'Peg pays half an item\'s worth',
    },
    kitto: {
      id: 'kitto', name: 'The Tinners\' Arms', owner: 'kitto', who: 'Senara',
      stock: [{ item: 'moor_pasty', price: 48 }, { item: 'cooked_char', price: 70 }, { item: 'bread', price: 5 }],
      buyRate: () => 0.5,
      footer: () => 'Senara pays half an item\'s worth',
    },
  },
  things: [
    { id: 'otSluiceGate', x: -861.5, z: 976.5, label: 'Look at the sluice gate', radius: 3.2, when: (g) => at(g, SLUICE) === 'sluice', use: (g) => { g.toast('An eel trap is wedged in the gate\'s runners, so the gate can\'t be lifted. It was put there on purpose.'); g.setStage(SLUICE, 'back'); } },
    { id: 'otChalk', x: 353.5, z: 2994.5, label: 'Rub the quarry chalk off the stone', radius: 2.8, when: (g) => at(g, STONE) === 'chalk', use: (g) => { g.toast('The chalk comes off with wet moss, mark by mark, until there\'s none left to count.'); g.setStage(STONE, 'back'); } },
  ],
  spawns: [
    { tag: 'cgFoxes', type: 'clifffox', at: [[278, -1004], [281, -999], [277, -994], [283, -1008], [280, -990]], when: (g) => at(g, ROPE) === 'foxes' },
    { tag: 'hsDrain', type: 'fenjelly', at: [[-868, 970], [-860, 980], [-868, 982], [-859, 966], [-866, 964]], when: (g) => at(g, SLUICE) === 'jellies' },
    { tag: 'stWolves', type: 'moorwolf', at: [[371, 2997], [352, 2999], [373, 2983], [364, 3004], [350, 2984]], when: (g) => at(g, STONE) === 'wolves' },
  ],
  quests: {
    [ROPE]: {
      id: ROPE, name: 'The Long Rope', region: 'gannet', depth: 'quest',
      notes: (_g, s) => {
        if (s === 'skins') return 'Hal Skene goes down the Gannet Cliffs on a forty-fathom rope, and its splices are going. Gullmouth riggers bind splices in conger skin. He wants three; the congers are in the sea under the cliffs.';
        if (s === 'foxes') return 'Hal has his conger skin. While I was in the sea, five cliff foxes got into Cragsby\'s egg store.';
        return 'Hal Skene\'s rope is spliced and bound in conger skin, and the foxes are out of the egg store. Harrowgate\'s man can keep his wire.';
      },
      objectives: (g, s) => {
        if (s === 'skins') return [{ text: `Bring Hal Skene conger skins (${Math.min(3, g.count('conger_skin'))}/3)`, marker: 'skene', done: g.count('conger_skin') >= 3 }];
        if (s === 'foxes') return [{ text: `Kill the foxes at the egg store (${Math.min(5, killed(g, 'cgFoxes'))}/5)`, done: killed(g, 'cgFoxes') >= 5 }, { text: 'Go back to Hal Skene', marker: 'skene' }];
        return [];
      },
      marks: (g, s): Marks => (!s ? { skene: '!' } : s === 'skins' && g.count('conger_skin') >= 3 ? { skene: '?' } : s === 'foxes' && killed(g, 'cgFoxes') >= 5 ? { skene: '?' } : {}),
      walk: { obtain: { skins: [['conger_skin', 3]] } },
    },
    [SLUICE]: {
      id: SLUICE, name: 'The Sluice', region: 'wrath', depth: 'quest',
      advance: (g, s) => (s === 'jellies' && killed(g, 'hsDrain') >= 5 ? 'sluice' : null),
      notes: (g, s) => {
        if (s === 'jellies') return 'Harrowgate has cut a drain across the Wrath Levels to dry them for wheat, and the meres round Holme Staithe are dropping. Ambrose Tilney, the reeve, watches it for the company. Jellies are breeding in it and coming up the lanes.';
        if (s === 'sluice') return 'The drain is clear. Ambrose asked me to look at the company\'s sluice gate, which keeps sticking shut.';
        if (s === 'back') return 'Someone has wedged an eel trap in the sluice gate\'s runners on purpose, so it can\'t be lifted and the mere stops draining. Ambrose wants to know.';
        return g.flag('hsChoice') === 'told'
          ? 'I told Ambrose about the eel trap. He told the company, and Harrowgate has put a man on the gate.'
          : 'I told Ambrose the old timber had swelled. He wrote nothing down. The mere is holding.';
      },
      objectives: (g, s) => {
        if (s === 'jellies') return [{ text: `Clear the jellies from the drain (${Math.min(5, killed(g, 'hsDrain'))}/5)`, done: killed(g, 'hsDrain') >= 5 }];
        if (s === 'sluice') return [{ text: 'Look at the sluice gate on the drain' }];
        if (s === 'back') return [{ text: 'Tell Ambrose Tilney what you found', marker: 'tilney' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { tilney: '!' } : s === 'back' ? { tilney: '?' } : {}),
    },
    [STONE]: {
      id: STONE, name: 'The Holed Stone', region: 'tolmen', depth: 'quest',
      advance: (g, s) => (s === 'wolves' && killed(g, 'stWolves') >= 5 ? 'choice' : null),
      notes: (g, s) => {
        if (s === 'wolves') return 'Caddy Nankervis passes Scarrow Tor\'s babies through the holed stone. Harrowgate\'s quarry gang have chalked it for setts for Ansbury, but won\'t go up while the wolves den on the tor. Neither will the mothers.';
        if (s === 'choice') return 'The wolves are gone from the tor. Caddy has something to say about the chalk.';
        if (s === 'chalk') return 'If the quarry chalk is gone, the gang has to measure the stone again, and their measure-man is in Ansbury until spring. Caddy says wet moss takes it off.';
        if (s === 'back') return 'The chalk is off the holed stone. Caddy will want to know.';
        return g.flag('stChoice') === 'chalk'
          ? 'I rubbed the quarry chalk off the holed stone. The gang loses a season; the stone stands until the measure-man comes back.'
          : 'I told Caddy the streets need setts. The quarry gang has the stone.';
      },
      objectives: (g, s) => {
        if (s === 'wolves') return [{ text: `Kill the wolves on the tor (${Math.min(5, killed(g, 'stWolves'))}/5)`, done: killed(g, 'stWolves') >= 5 }];
        if (s === 'choice') return [{ text: 'Talk to Caddy Nankervis', marker: 'nankervis' }];
        if (s === 'chalk') return [{ text: 'Rub the quarry chalk off the holed stone' }];
        if (s === 'back') return [{ text: 'Go back to Caddy Nankervis', marker: 'nankervis' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { nankervis: '!' } : s === 'choice' || s === 'back' ? { nankervis: '?' } : {}),
    },
  },
};
