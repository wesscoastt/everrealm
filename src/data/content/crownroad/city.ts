import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, type Marks } from '../kit';
import type { RegionContent } from '../types';

// Ansbury: Tanners' Row, the keep steps and the Charter Market.
// TANNERS' ROW (storyline, three quests): the Gisborne foundry. Cold furnace, rings poured at night
//   with Gisborne's mark, and who the foundry belongs to. foundryChoice = 'linnet' | 'maren' | 'gisborne'.
// THE ALDERMERE STONE (quest): the Michaelmas trial of the Weighhouse's new set. Needs Honest Weight done.
// WEIGHHOUSE PIES (posting): trout for Dory Pask.
// WORD TO HOLLIN FORD (short): Perrin Gale's prices, carried to Tamsin Pargeter and back.

const GIS1 = 'crGis1', GIS2 = 'crGis2', GIS3 = 'crGis3', STONE = 'crStone', PIE = 'crPie', NOTE = 'crPerrin';
const HW = 'honestWeight';
const hwDone = (g: GameApi) => g.stage(HW) === 'done';

const linnet: DialogueTree = {
  start: (g) => {
    if (!at(g, GIS1)) return 'intro';
    if (at(g, GIS1) === 'linnet') return 'l1';
    if (at(g, GIS1) === 'logs') return g.count('oak_logs') >= 6 ? 'l5' : 'lWait';
    if (at(g, GIS1) === 'gisborne') return 'lGo';
    if (at(g, GIS2) === 'linnet') return 'm1';
    if (at(g, GIS2) === 'yard') return 'mYard';
    if (at(g, GIS2) === 'gisborne') return 'mGo';
    if (at(g, GIS3) === 'linnet') return 'u1';
    if (at(g, GIS3) === 'maren') return 'uWait';
    if (at(g, GIS3) === 'linnet2') return 'u6';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('foundryChoice');
        if (c === 'linnet') return 'L. Gisborne, founder. He corrects my sprues and I let him. It\'s cheaper than arguing.';
        if (c === 'maren') return 'Company founder, company wages, company mark. The metal doesn\'t know the difference. I do.';
        if (c === 'gisborne') return 'His mark. No more rings at night. I count the scrap every morning, and so far it all adds up.';
        return 'The clamp\'s lit. That isn\'t the same as the furnace, but it smells like work.';
      },
    },
    intro: {
      text: 'If you\'re here for a casting, the furnace has been cold since Lammas.',
      options: [{ text: 'Why cold?', next: 'l2' }, { text: 'Never mind.' }],
    },
    l1: { text: 'You read the notice. Nobody reads the notice. They read the toll board and complain.', next: 'l2' },
    l2: { text: 'Charcoal\'s doubled since spring. Harrowgate buys every burn on the road for the smelter on the Rill.', next: 'l3' },
    l3: {
      text: 'So I\'ll burn my own, in a clamp in the yard, like my grandmother did. Six oak logs makes a clamp.',
      options: [{ text: 'I\'ll bring six.', next: 'l4' }, { text: 'Not today.' }],
    },
    l4: { text: 'Oak. Not birch. Birch charcoal spits, and then so do I.', effect: (g) => g.setStage(GIS1, 'logs') },
    lWait: { text: 'Six oak. Straight if you can. The yard\'s round the back.' },
    l5: { text: 'Six. Stack them by the wall.', options: [{ text: 'Hand over the logs.', next: 'l6' }] },
    l6: { speaker: 'narrator', text: 'She builds the stack while you talk, turf over the top and a hole left for the fire.', next: 'l7' },
    l7: {
      text: 'Go and tell my father it\'s lit. He won\'t come out for me. He\'ll come out to correct you.',
      effect: (g) => { g.take('oak_logs', 6); g.setStage(GIS1, 'gisborne'); },
    },
    lGo: { text: 'He\'s on the step. Pretending he isn\'t.' },
    // The founder's mark
    m1: { text: 'Perrin sent you with a ring. Perrin sends everything with somebody.', options: [{ text: 'Show her the ring.', next: 'm2' }] },
    m2: { speaker: 'narrator', text: 'She turns it to the light and presses a thumbnail into the broken face. It leaves a dent.', next: 'm3' },
    m3: { text: 'That\'s our mark. That isn\'t our ring. Pinholes all through. Poured hot and fast by somebody in a hurry.', next: 'm4' },
    m4: { text: 'Nobody here has poured a ring. The furnace was cold until the clamp, and the clamp\'s for charcoal.', next: 'm5' },
    m5: { text: 'Look in the yard if you want. There\'s nothing in it but my clamp and his opinions.', effect: (g) => g.setStage(GIS2, 'yard') },
    mYard: { text: 'Round the back. Mind the clamp. It bites.' },
    mGo: { text: 'You\'ve found something. You\'ve got the face. Go and say it to him first.' },
    // Under whose mark
    u1: { text: 'He told me. Or you did. Somebody told me, and now I know where my wages came from.', next: 'u2' },
    u2: { text: 'There\'s a letter on the bench from Hilda Harrowgate. She\'ll take the lease, clear his debts, and pay me to pour under her mark.', next: 'u3' },
    u3: { text: 'Or I put my own mark on the door and he works under me. He\'d hate it. He\'d be good at it.', next: 'u4' },
    u4: {
      text: 'Or he keeps his mark, and promises, and we\'re cold again by Martinmas. What would you do?',
      options: [
        { text: 'Ask Hilda what she\'s really offering.', next: 'u5', cond: (g) => !g.flag('crMarenAsked') },
        { text: 'Put your own mark on the door.', next: 'uL' },
        { text: 'Take Hilda\'s offer.', next: 'uM' },
        { text: 'It\'s his mark. Let him keep it.', next: 'uG' },
      ],
    },
    u5: { text: 'Go on, then. Keep steps. Grey coat. She\'ll see you first.', effect: (g) => g.setStage(GIS3, 'maren') },
    uWait: { text: 'Keep steps. Grey coat.' },
    u6: { text: 'Well? Was she kind?', next: 'u4' },
    uL: { text: 'My mark.', next: 'uL2' },
    uL2: { speaker: 'narrator', text: 'She chalks an L on the door, looks at it, then goes over it again, harder.', next: 'uL3' },
    uL3: {
      text: 'I\'ll tell him. You\'d be kind about it, and he\'d never forgive either of us.',
      effect: (g) => { g.setFlag('foundryChoice', 'linnet'); g.addMarks(25); g.setStage(GIS3, 'done'); },
    },
    uM: { text: 'Wages. Somebody else\'s mark. Nobody else\'s debts.', next: 'uM2' },
    uM2: {
      text: 'It\'s a good offer. I hate that it\'s a good offer. Here, for your trouble. It\'s the last of his ring money.',
      effect: (g) => { g.setFlag('foundryChoice', 'maren'); g.addMarks(25); g.setStage(GIS3, 'done'); },
    },
    uG: { text: 'His mark, then. And no more rings at night. I\'ll count the scrap.', next: 'uG2' },
    uG2: {
      text: 'We\'ll be cold by Martinmas. But we\'ll be cold honestly, and he\'ll say that\'s the main thing.',
      effect: (g) => { g.setFlag('foundryChoice', 'gisborne'); g.addMarks(25); g.setStage(GIS3, 'done'); },
    },
  },
};

const gisborne: DialogueTree = {
  start: (g) => {
    if (at(g, GIS1) === 'gisborne') return 'g1';
    if (at(g, GIS2) === 'gisborne') return 'gm1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('foundryChoice');
        if (c === 'linnet') return 'Ask the founder. She\'s inside. I only pour what she checks.';
        if (c === 'maren') return 'I\'ve sold the chimney. I\'m keeping the step.';
        if (c === 'gisborne') return 'Still my mark. Still my step. Still cold, mostly.';
        if (at(g, GIS1) === 'done') return 'Clamp\'s lit. That doesn\'t mean anybody\'s ordered anything.';
        return 'Bronze, brass, bell metal. Not today. The furnace is cold.';
      },
      options: [{ text: 'What\'s bell metal?', next: 'bell' }, { text: 'Bye.' }],
    },
    bell: { text: 'Bronze with more tin in it. It rings. Pour it slow and it\'s sound. Pour it fast and it\'s full of holes and lies about its weight.' },
    // Cold furnace
    g1: { text: 'If you\'re the one stacking oak in my yard, you\'ve stacked it wrong.', next: 'g2' },
    g2: { text: 'Bark side down. She knows. She lets you do it wrong so she can be like her grandmother about it.', next: 'g3' },
    g3: {
      text: (g) => (g.flag('hwChoice')
        ? 'Nobody\'s ordered so much as a buckle since the weights. A founder with a cold furnace is a man with a big chimney.'
        : 'Harrowgate buys the charcoal and the copper both. A founder with a cold furnace is a man with a big chimney.'),
      next: 'g4',
    },
    g4: {
      text: 'Here. For the oak. Don\'t tell her I paid you. She does the books. And if Perrin Gale\'s asking after us again, I\'m out.',
      effect: (g) => { g.addMarks(12); g.setStage(GIS1, 'done'); },
    },
    // The founder's mark
    gm1: { text: 'You\'ve been in the yard.', options: [{ text: 'You\'ve been pouring rings at night, out of scrap.', next: 'gm2' }] },
    gm2: { text: 'Scrap is metal. Metal is metal.', next: 'gm3' },
    gm3: { speaker: 'narrator', text: 'He says it like a man who has heard better answers and can\'t remember any of them.', next: 'gm4' },
    gm4: {
      text: (g) => (g.flag('hwChoice') === 'quiet'
        ? 'I recast Penhallow\'s weights at my own cost. Slow, and a grain heavy, so they\'d never read light again. That emptied the purse.'
        : 'There\'s no order book. There hasn\'t been since July. Nobody wants a Gisborne casting after the weights.'),
      next: 'gm5',
    },
    gm5: { text: 'I\'ve paid her wages out of those rings. She thinks it\'s old debts coming in. Old debts don\'t come in. That\'s why they\'re old.', next: 'gm6' },
    gm6: {
      text: 'Give Perrin his money back. Tell her or don\'t. She\'ll know by your face either way.',
      effect: (g) => { g.take('snapped_ring'); g.addMarks(10); g.setStage(GIS2, 'done'); },
    },
  },
};

const dorn: DialogueTree = {
  start: (g) => {
    if (!at(g, STONE) && hwDone(g)) return 'd1';
    if (at(g, STONE) === 'osric') return 'dWait';
    if (at(g, STONE) === 'dorn') return g.has('weighhouse_set') ? 'd5' : 'dWait';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (at(g, STONE) === 'done'
        ? 'Two grains heavy, in the carters\' favour. I\'ve written it in the standards book. In red.'
        : 'Keeper of the Standards. The Ansbury stone is in the keep, under seal. You may not see it.'),
      options: [{ text: 'What is it for?', next: 'what' }, { text: 'Bye.' }],
    },
    what: { text: 'Every weight in the Charter is tried against it. Every pound in every county is a copy of a copy of that stone.' },
    d1: { text: 'Michaelmas. Every set in the city is tried against the stone. Penhallow\'s set is late.', next: 'd2' },
    d2: {
      text: 'He has not been late in thirty years. I would like to know why, and I would like his set.',
      options: [{ text: 'I\'ll fetch it.', next: 'd3' }, { text: 'Not my errand.' }],
    },
    d3: { text: 'Carry it level. Weights dislike being carried any other way, and so do I.', effect: (g) => g.setStage(STONE, 'osric') },
    dWait: { text: 'Penhallow\'s set. In its box. Level.' },
    d5: { text: 'At last.', options: [{ text: 'Hand over the set.', next: 'd6' }] },
    d6: { speaker: 'narrator', text: 'He breaks the seal on a small door in the keep wall, lifts out a dark weight, and tries Penhallow\'s pound against it.', next: 'd7' },
    d7: { text: 'Heavy. Two grains in the pound.', next: 'd8' },
    d8: { text: 'Not light. Heavy. In the carters\' favour. You don\'t get two grains by accident. Somebody cast these heavy on purpose.', next: 'd9' },
    d9: {
      text: 'I\'ll pass them. Tell Penhallow it\'s two grains. He will pretend to be annoyed.',
      effect: (g) => { g.take('weighhouse_set'); g.addMarks(15); g.setStage(STONE, 'done'); },
    },
  },
};

const dory: DialogueTree = {
  start: (g) => {
    if (at(g, PIE) === 'trout') return g.count('raw_trout') >= 4 ? 'p3' : 'p1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (at(g, PIE) === 'done'
        ? 'Trout pies sold out by noon. Penhallow had two. He says they\'re too heavy, and buys two.'
        : 'Pies. Mutton, eel, and Weighhouse. Weighhouse is the heavy one.'),
      options: [{ text: 'Why "Weighhouse"?', next: 'why' }, { text: 'Bye.' }],
    },
    why: { text: 'Because it\'s heavy. Penhallow took it personally. I sell twice as many now.' },
    p1: { text: 'Trout. Four, and fresh. The Wend\'s good for trout, if you can stand Pell Garrow telling you how it used to be.' },
    p3: { text: 'Four trout. Give them here before they turn.', options: [{ text: 'Hand over the trout.', next: 'p4' }] },
    p4: {
      text: 'Four marks a fish, and the first pie out of them is yours. Don\'t eat it walking. It isn\'t that kind of pie.',
      effect: (g) => { g.take('raw_trout', 4); g.addMarks(16); g.give('weighhouse_pie'); g.setStage(PIE, 'done'); },
    },
  },
};

export const CR_CITY: RegionContent = {
  id: 'crownroad-city',
  dialogue: { linnet, gisborne, dorn, dory },
  items: [
    { id: 'snapped_ring', name: 'Snapped harness ring', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'coin', a: '#b8873a' }, desc: 'Bronze, stamped with a G over a bell. Broken clean across, and full of pinholes.' },
    { id: 'weighhouse_set', name: 'The Weighhouse set', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bar', a: '#b8873a' }, desc: 'Bronze weights in a fitted box, from the pound down to the twelfth. Cast in the summer, slowly.' },
    { id: 'weighhouse_pie', name: 'Weighhouse pie', kind: 'food', rarity: 'uncommon', stack: true, value: 8, icon: { shape: 'cooked', a: '#c8904a' }, desc: 'Trout, leek and a crust you could stand on. Dory Pask\'s.', heal: 60, stats: 'Restores 60 health.' },
    { id: 'perrin_list', name: 'Perrin\'s price list', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'Prices on the Charter Market this week, in a round, cheerful hand. Folded small.' },
    { id: 'tamsin_list', name: 'Tamsin\'s reply', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'Written on the back of an onion bill. Mostly numbers, one of them underlined.' },
  ],
  readables: {
    gisYard: {
      title: 'Behind the foundry',
      body: 'Under a sack by the back wall: a ring mould in two halves, the sand still damp.\n\nBeside it, a kettle, three buckles and a door hinge, half melted down. Somebody has been pouring at night with whatever metal came to hand.',
      effect: (g) => { if (at(g, GIS2) === 'yard') g.setStage(GIS2, 'gisborne'); },
    },
  },
  things: [
    { id: 'gisYard', x: 779.5, z: 327.5, label: 'Look under the sacking', radius: 2.4, read: 'gisYard', when: (g) => at(g, GIS2) === 'yard' },
  ],
  boards: [{
    id: 'aldermere', name: 'Charter Market', x: 812.5, z: 328.5,
    header: (g) => {
      const lines = [g.flag('hwChoice') === 'refund'
        ? 'WEIGHHOUSE. Errors in weighing this summer have been corrected. Carters overcharged may apply in person. O. Penhallow.'
        : 'CHARTER MARKET. Pitches let by the season at the Toll Office. Everything sold here has paid its toll.'];
      if (g.flag('foundryChoice') === 'linnet') lines.push('L. GISBORNE, FOUNDER. Castings to order, Tanners\' Row. Poured slow.');
      if (g.flag('foundryChoice') === 'maren') lines.push('HARROWGATE & DAUGHTERS, FOUNDRY, Tanners\' Row. Company prices.');
      return lines.join('\n\n');
    },
    postings: [
      { quest: GIS1, stage: 'linnet', title: 'Wanted: oak, any quantity.', text: 'WANTED. Oak, any quantity, at a fair price. Tanners\' Row, the yard with the cold chimney. L. Gisborne.' },
      { quest: 'crWolves', stage: 'kill', title: 'Wolves on the Hollin Ford road.', text: 'Wolves on the Hollin Ford road at dusk, taking carters\' dogs. Two marks a head, paid at the gate. E. Strake, for the watch.' },
      { quest: PIE, stage: 'trout', title: 'Wanted: trout.', text: 'WANTED: trout, fresh, any amount. Pask\'s pies, Charter Market. Pays on the nail.' },
    ],
  }],
  quests: {
    [GIS1]: {
      id: GIS1, name: 'Cold Furnace', region: 'crownroad', depth: 'storyline', next: [GIS2, 'perrin'],
      notes: (_g, s) => {
        if (s === 'linnet') return 'L. Gisborne wants oak, any quantity, on Tanners\' Row. The yard with the cold chimney.';
        if (s === 'logs') return 'The Gisborne foundry has been cold since Lammas: Harrowgate buys every burn of charcoal on the road. Dorcas Gisborne will burn her own. She needs six oak logs.';
        if (s === 'gisborne') return 'Dorcas\'s charcoal clamp is lit. She wants her father told. He won\'t come out for her.';
        return 'Dorcas Gisborne is burning her own charcoal. Her father paid me for the oak and told me not to tell her. Nobody has ordered a casting from them in months.';
      },
      objectives: (g, s) => {
        if (s === 'linnet') return [{ text: 'Find L. Gisborne on Tanners\' Row', marker: 'linnet' }];
        if (s === 'logs') return [{ text: `Bring Dorcas oak logs (${Math.min(6, g.count('oak_logs'))}/6)`, marker: 'linnet', done: g.count('oak_logs') >= 6 }];
        if (s === 'gisborne') return [{ text: 'Tell Gisborne the clamp is lit', marker: 'gisborne' }];
        return [];
      },
      marks: (g, s): Marks => (!s ? { linnet: '!' } : s === 'linnet' || (s === 'logs' && g.count('oak_logs') >= 6) ? { linnet: '?' } : s === 'gisborne' ? { gisborne: '?' } : {}),
      walk: { obtain: { logs: [['oak_logs', 6]] } },
    },
    [GIS2]: {
      id: GIS2, name: 'The Founder\'s Mark', region: 'crownroad', depth: 'storyline', next: [GIS3, 'linnet'],
      notes: (_g, s) => {
        if (s === 'perrin') return 'Perrin Gale on the Charter Market has been asking after the Gisbornes. Gisborne told me to say he was out.';
        if (s === 'linnet') return 'Perrin Gale bought a box of harness rings stamped with Gisborne\'s mark, cheap, at night. Three have snapped. One nearly cost Garth Mallow a wheel on the Weighhouse hill.';
        if (s === 'yard') return 'Dorcas says the ring is their mark but not their work: poured hot and fast. She says nobody at the foundry has poured anything. She told me to look in the yard.';
        if (s === 'gisborne') return 'Behind the foundry: a ring mould, the sand still damp, and scrap half melted down. Somebody has been pouring at night.';
        return 'Gisborne has been pouring rings at night out of scrap, to pay Dorcas\'s wages from an empty order book. She thought the money was old debts coming in.';
      },
      objectives: (_g, s) => {
        if (s === 'perrin') return [{ text: 'Find out what Perrin Gale wants with the Gisbornes', marker: 'perrin' }];
        if (s === 'linnet') return [{ text: 'Show Dorcas Gisborne the ring', marker: 'linnet' }];
        if (s === 'yard') return [{ text: 'Search the yard behind the foundry', marker: 'gisYard' }];
        if (s === 'gisborne') return [{ text: 'Talk to Gisborne', marker: 'gisborne' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'perrin' ? { perrin: '?' } : s === 'linnet' ? { linnet: '?' } : s === 'gisborne' ? { gisborne: '?' } : {}),
      walk: { cast: ['perrin'], from: { quests: { crGis1: 'done', crGis2: 'perrin' } } },
    },
    [GIS3]: {
      id: GIS3, name: 'Under Whose Mark', region: 'crownroad', depth: 'storyline',
      notes: (g, s) => {
        if (s === 'linnet' || s === 'linnet2') return 'Hilda Harrowgate has offered to take the foundry\'s lease, clear Gisborne\'s debts and pay Dorcas to pour under the company\'s mark. Dorcas wants to know what I\'d do.';
        if (s === 'maren') return 'Dorcas sent me to ask Hilda Harrowgate what she is really offering for the foundry.';
        const c = g.flag('foundryChoice');
        if (c === 'linnet') return 'Dorcas put her own mark on the foundry door. Gisborne pours what she checks.';
        if (c === 'maren') return 'The Gisborne foundry is Harrowgate\'s now. Dorcas pours for wages under the company mark. Gisborne kept the step.';
        return 'Gisborne keeps his mark and has promised no more pouring at night. Dorcas stayed. She expects to be cold by Martinmas.';
      },
      objectives: (_g, s) => {
        if (s === 'linnet' || s === 'linnet2') return [{ text: 'Advise Dorcas Gisborne', marker: 'linnet' }];
        if (s === 'maren') return [{ text: 'Ask Hilda Harrowgate about her offer', marker: 'maren' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'linnet' || s === 'linnet2' ? { linnet: '?' } : s === 'maren' ? { maren: '?' } : {}),
      walk: { cast: ['maren'], from: { quests: { crGis1: 'done', crGis2: 'done', crGis3: 'linnet' } } },
    },
    [STONE]: {
      id: STONE, name: 'The Ansbury Stone', region: 'crownroad', depth: 'quest',
      notes: (_g, s) => {
        if (s === 'osric') return 'Tallis Dorn, Keeper of the Standards, tries every set of weights in the city against the Ansbury stone at Michaelmas. Osric Penhallow\'s set is late, for the first time in thirty years.';
        if (s === 'dorn') return 'Osric gave me the Weighhouse set for Dorn. He says he wasn\'t late, he was dreading it.';
        return 'The Weighhouse\'s new set is two grains heavy in the pound, in the carters\' favour. Dorn says nobody gets two grains by accident.';
      },
      objectives: (_g, s) => {
        if (s === 'osric') return [{ text: 'Fetch the Weighhouse set from Osric Penhallow', marker: 'osric' }];
        if (s === 'dorn') return [{ text: 'Take the set to Tallis Dorn at the keep', marker: 'dorn' }];
        return [];
      },
      marks: (g, s): Marks => (!s && hwDone(g) ? { dorn: '!' } : s === 'osric' ? { osric: '?' } : s === 'dorn' ? { dorn: '?' } : {}),
      walk: { cast: ['osric'], from: { quests: { honestWeight: 'done' }, flags: { hwChoice: 'quiet' } } },
    },
    [PIE]: {
      id: PIE, name: 'Weighhouse Pies', region: 'crownroad', depth: 'short',
      notes: (_g, s) => (s === 'trout'
        ? 'Dory Pask wants fresh trout for her pies on the Charter Market. Four will do.'
        : 'Dory Pask paid four marks a trout and gave me the first pie out of them.'),
      objectives: (g, s) => (s === 'trout' ? [{ text: `Bring Dory Pask raw trout (${Math.min(4, g.count('raw_trout'))}/4)`, marker: 'dory', done: g.count('raw_trout') >= 4 }] : []),
      marks: (g, s): Marks => (s === 'trout' && g.count('raw_trout') >= 4 ? { dory: '?' } : {}),
      walk: { obtain: { trout: [['raw_trout', 4]] } },
    },
    [NOTE]: {
      id: NOTE, name: 'Word to Hollin Ford', region: 'crownroad', depth: 'short',
      notes: (_g, s) => {
        if (s === 'tamsin') return 'Perrin Gale wants his price list taken to Tamsin Pargeter at Hollin Ford. He says to watch what she does with her hands.';
        if (s === 'perrin') return 'Tamsin said she didn\'t want Perrin\'s list, read it twice, and wrote back on an onion bill.';
        return 'Perrin and Tamsin were apprenticed to the same trader. They\'ve been sending each other prices ever since.';
      },
      objectives: (_g, s) => {
        if (s === 'tamsin') return [{ text: 'Take Perrin\'s list to Tamsin Pargeter', marker: 'tamsin' }];
        if (s === 'perrin') return [{ text: 'Take Tamsin\'s reply to Perrin Gale', marker: 'perrin' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'tamsin' ? { tamsin: '?' } : s === 'perrin' ? { perrin: '?' } : {}),
      walk: { cast: ['perrin', 'tamsin'] },
    },
  },
  hooks: (D) => {
    // ---- Perrin: the rings, the list
    hook(D, 'perrin', (g) => (at(g, GIS2) === 'perrin' ? 'crF1' : at(g, NOTE) === 'perrin' ? 'crP3' : undefined), {
      crF1: { text: 'Gisborne\'s out, is he. Course he is. I\'ve been sold a box of harness rings with his mark on, at half anybody else\'s price.', next: 'crF2' },
      crF2: { text: 'Bought them off a lad at the back gate of Tanners\' Row, at night. Should have known by the night.', next: 'crF3' },
      crF3: { text: 'Three snapped this week. One on the Weighhouse hill, with a full load behind it. Garth Mallow nearly lost a wheel.', next: 'crF4' },
      crF4: {
        text: 'Take one to the Gisbornes. If it\'s theirs, I want my money. If it isn\'t, they\'ll want to know who\'s using their mark.',
        effect: (g) => { g.give('snapped_ring'); g.setStage(GIS2, 'linnet'); },
      },
      crP1: { text: 'As it happens. Tamsin Pargeter keeps the stall at Hollin Ford. Take her this.', next: 'crP2' },
      crP2: {
        text: 'It\'s my prices. She\'ll say she doesn\'t want them. Watch what she does with her hands.',
        effect: (g) => { g.give('perrin_list'); g.setStage(NOTE, 'tamsin'); },
      },
      crP3: { text: 'Well? What did she do with her hands?', options: [{ text: 'Read it twice and put it in her apron.', next: 'crP4' }] },
      crP4: { text: 'Twice. Ha.', next: 'crP5' },
      crP5: { text: 'We were apprenticed to the same trader on this market. She got the better pitch. I got the better trader.', next: 'crP6' },
      crP6: {
        text: 'Here, for your feet. Don\'t tell her I paid the carriage.',
        effect: (g) => { g.take('tamsin_list'); g.addMarks(8); g.setStage(NOTE, 'done'); },
      },
      crF9: {
        text: (g) => (g.flag('foundryChoice') === 'maren'
          ? 'Harrowgate paid me back for the rings before I asked. That\'s worse, somehow.'
          : 'Gisborne paid me back for the rings. In rings. Good ones, this time.'),
      },
    });
    addOption(D, 'perrin', 'main', { text: 'Need anything carried?', next: 'crP1', cond: (g) => !at(g, NOTE) });
    addOption(D, 'perrin', 'main', { text: 'Did the Gisbornes pay you back?', next: 'crF9', cond: (g) => at(g, GIS3) === 'done' });

    // ---- Tamsin: the list
    hook(D, 'tamsin', (g) => (at(g, NOTE) === 'tamsin' ? 'crT1' : undefined), {
      crT1: { text: 'From Perrin Gale? I don\'t want it.', next: 'crT2' },
      crT2: { speaker: 'narrator', text: 'She reads it twice, folds it into her apron, and writes something on the back of an onion bill.', next: 'crT3' },
      crT3: {
        text: 'Take him that. Tell him eel\'s a mark dearer than he thinks.',
        effect: (g) => { g.take('perrin_list'); g.give('tamsin_list'); g.setStage(NOTE, 'perrin'); },
      },
    });

    // ---- Hilda: the foundry
    hook(D, 'maren', (g) => (at(g, GIS3) === 'maren' ? 'crM1' : undefined), {
      crM1: { text: 'The Gisborne lease. Yes.', next: 'crM2' },
      crM2: { text: 'Forty a year to the landlord, his debts cleared, her wages at the company rate. Our mark on what she pours.', next: 'crM3' },
      crM3: { text: 'She\'s the best founder in the city. His mark is worth less than the metal it\'s stamped on. I\'m being kind.', next: 'crM4' },
      crM4: {
        speaker: 'narrator', text: 'She says "kind" the way other people say "efficient".',
        effect: (g) => { g.setFlag('crMarenAsked'); g.setStage(GIS3, 'linnet2'); },
      },
    });

    // ---- Osric: the Michaelmas trial
    hook(D, 'osric', (g) => {
      if (at(g, STONE) === 'osric') return 'crS1';
      if (at(g, STONE) === 'done' && !g.flag('crStoneTold')) return 'crS5';
      return undefined;
    }, {
      crS1: { text: 'Dorn sent you. Dorn sends everybody.', next: 'crS2' },
      crS2: { text: 'The set\'s in the box. Carry it level.', next: 'crS3' },
      crS3: { speaker: 'narrator', text: 'He doesn\'t hand it over at once. He straightens the chain on his chest first.', next: 'crS4' },
      crS4: {
        text: 'Tell Dorn I wasn\'t late. I was dreading it. It\'s a different thing.',
        effect: (g) => { g.give('weighhouse_set'); g.setStage(STONE, 'dorn'); },
      },
      crS5: {
        text: 'Two grains heavy. Gisborne did that. Gisborne, of all people, being generous with metal.',
        effect: (g) => g.setFlag('crStoneTold'),
      },
    });
  },
};
