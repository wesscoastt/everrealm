import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, killed, type Marks } from '../kit';
import type { RegionContent } from '../types';

// Around the vale: the inn, the wood, the mill, the ditches, the Lantern, the falls, the post road.
// FOURTHDAY SUPPER (short)      Agnes Pole needs cooked trout for thirty plates.
// THE CLAMP (quest)             Cass Pudney's charcoal: Bram's old price or Harrowgate's new one. charcoalTo = 'bram' | 'harrowgate'.
// BRAKE PIN (short)             Gorse Mill can't hold its sails; Nance turns a pin and signs it.
// SIX FINGERS (quest)           Ned Bracken salts the Wetlings ditch mouths before the gauge reaches six.
// INITIALS (short)              Tobin Wether dares you up the Lantern to find his father's name. initials = 'told' | 'kept'.
// THE SUMMER OF THE LOW WATER (hidden)  Pell's old creel, behind Spill Falls.
// LETTER FOR THE FOREMAN (short) Bess Tull's post: Corrie Dunmore writes to her brother.
// HINGES (quest)                After the Ford Bell, Nance makes the moot hall hinges Bram never started.

const SUP = 'gwSupper', CLAMP = 'gwClamp', PIN = 'gwPin', SALT = 'gwSalt', INIT = 'gwInitials', CREEL = 'gwCreel', LETTER = 'gwLetter', HINGE = 'gwHinges';
const salted = (g: GameApi) => ['ditchA', 'ditchB'].filter((f) => g.flag(f)).length;

const agnes: DialogueTree = {
  start: (g) => (at(g, SUP) === 'agnes' ? 's3' : 'main'),
  nodes: {
    main: {
      text: 'Low Water. Bed\'s four marks, supper\'s two, the hearth\'s free, and advice costs less than that and is worth it.',
      options: [
        { text: 'Why is it called the Low Water?', next: 'lw1' },
        { text: 'Need a hand?', next: 's1', cond: (g) => !at(g, SUP) },
        { text: 'Pell says your father wanted his pike.', next: 'pike', cond: (g) => at(g, CREEL) === 'done' },
        { text: 'Bye.' },
      ],
    },
    lw1: { text: 'The summer my father was a boy, you could walk across the Wend without wetting your knees. He opened the inn that autumn. He knew a name when he saw one.' },
    pike: { text: 'My father said Pell Garrow stole his pike. He said it at Pell\'s wedding. He said it at his own funeral, nearly. Pell hid it, did he? Behind the falls?', next: 'pike2' },
    pike2: { text: 'I\'ll tell my sister. She owes me a mark.' },
    s1: { text: 'Fourthday. Thirty plates, and my cook\'s gone to her sister\'s to have a baby, which is a poor excuse but a real one.', next: 's2' },
    s2: {
      text: 'Three brown trout, cooked, and I\'ll stretch them with bread. Trout want Fishing 5, the Wend and a fire. The hearth\'s outside the door.',
      options: [{ text: 'Three trout. Done.', effect: (g) => g.setStage(SUP, 'cook') }, { text: 'Not tonight.' }],
    },
    s3: { text: 'Three? Show me.', options: [{ text: 'Hand over the trout.', next: 's4' }] },
    s4: {
      text: 'That\'s thirty plates, if nobody\'s honest about their portion. Nobody ever is. Here: supper\'s on the house, and so\'s the money.',
      effect: (g) => { g.take('cooked_trout', 3); g.give('bread', 2); g.addMarks(18); g.setStage(SUP, 'done'); },
    },
  },
};

const cass: DialogueTree = {
  start: (g) => (at(g, CLAMP) === 'logs' && g.count('oak_logs') >= 4 ? 'c3' : 'main'),
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('charcoalTo');
        if (c === 'bram') return 'Short at the quarter. I said I\'d blame you. I\'m blaming you.';
        if (c === 'harrowgate') return 'Rent\'s paid. Bram nodded at me in the square. That\'s worse than shouting.';
        return 'Charcoal. Smoke. Me. In that order.';
      },
      options: [
        { text: 'How\'s trade?', next: 'c1', cond: (g) => !at(g, CLAMP) },
        { text: 'Bye.' },
      ],
    },
    c1: { text: 'Doubled. Harrowgate takes everything I burn for their smelter on the Rill, at twice what Bram Tolley can pay.', next: 'c2' },
    c2: {
      text: 'Bram\'s three sacks behind. I\'d like to burn his three. My axe arm\'s gone stiff. Four good oak logs would do it.',
      options: [{ text: 'I\'ll cut them.', effect: (g) => g.setStage(CLAMP, 'logs') }, { text: 'Not today.' }],
    },
    c3: { text: 'Good wood.', next: 'c3b' },
    c3b: { speaker: 'narrator', text: 'She stacks the logs into the clamp the way other people handle eggs.', next: 'c4' },
    c4: {
      text: 'Now. Bram\'s three sacks at the old price, or Harrowgate\'s at the new. Bram\'s a friend. Harrowgate pays my rent. You choose. I\'m tired of choosing.',
      options: [
        { text: 'Bram\'s, at the old price.', next: 'cBram' },
        { text: 'Harrowgate\'s. Pay your rent.', next: 'cHarrow' },
      ],
    },
    cBram: { text: 'Bram\'s, then. I\'ll be short at the quarter, and I\'ll blame you for it.', effect: (g) => { g.take('oak_logs', 4); g.addMarks(10); g.setFlag('charcoalTo', 'bram'); g.setStage(CLAMP, 'done'); } },
    cHarrow: { text: 'Harrowgate\'s. Bram will understand. He knows about rent better than anyone in the vale.', effect: (g) => { g.take('oak_logs', 4); g.addMarks(20); g.setFlag('charcoalTo', 'harrowgate'); g.setStage(CLAMP, 'done'); } },
  },
};

const dunstan: DialogueTree = {
  start: (g) => (at(g, PIN) === 'dunstan' ? 'p3' : 'main'),
  nodes: {
    main: {
      text: (g) => (at(g, PIN) === 'done' ? 'Blew a gale on fifthday and I held her. Held her with a pin with a W on it.' : 'Wind\'s backing. Wind is always backing or veering. It never just stays where it is.'),
      options: [{ text: 'Is something wrong?', next: 'p1', cond: (g) => !at(g, PIN) }, { text: 'Bye.' }],
    },
    p1: { text: 'Brake pin\'s sheared. If it blows up hard I can\'t hold the sails, and a mill that can\'t stop is a mill that takes itself apart.', next: 'p2' },
    p2: {
      text: 'Nance Tolley turns a good pin. Bram turns a better one, slower. Take her a bronze bar and say it\'s for me.',
      options: [{ text: 'I\'ll get you a pin.', effect: (g) => g.setStage(PIN, 'bar') }, { text: 'Bye.' }],
    },
    p3: { text: 'That\'s a good pin.', next: 'p4' },
    p4: { speaker: 'narrator', text: 'He turns it over and finds the small W stamped in the head.', next: 'p5' },
    p5: {
      text: 'Bram\'s apprentice is signing her work now, is she. Good. Here, for the walking. The flour\'s for Agnes; she\'ll pay you for that too.',
      effect: (g) => { g.take('mill_pin'); g.addMarks(15); g.setStage(PIN, 'done'); },
    },
  },
};

const ned: DialogueTree = {
  start: (g) => (at(g, SALT) === 'ned' ? 'n3' : 'main'),
  nodes: {
    main: {
      text: (g) => (at(g, SALT) === 'done' ? 'Five fingers this morning. The water\'s going where water should go. Not into cows.' : 'Four fingers on the gauge. Six is cows.'),
      options: [{ text: 'What happens at six?', next: 'n1', cond: (g) => !at(g, SALT) }, { text: 'Bye.' }],
    },
    n1: { text: 'At six the Wetlings go under, and every cow in the low fields wants to be in somebody\'s kitchen.', next: 'n1b' },
    n1b: { text: 'I salt the ditch mouths every autumn. Keeps the jellies down, so the water drains.', next: 'n2' },
    n2: {
      text: 'Gauge is rising early. I want the mouths salted now. Salt\'s in Joss Wether\'s barn. He\'ll have told you. He tells everyone.',
      options: [{ text: 'I\'ll salt them.', effect: (g) => g.setStage(SALT, 'salt') }, { text: 'Bye.' }],
    },
    n3: { text: 'Salted?', next: 'n4' },
    n4: {
      text: 'Good. If it gets to six now, the water goes somewhere other than the cows. Here. Don\'t spend it on Gil Saxby.',
      effect: (g) => { g.addMarks(15); g.setStage(SALT, 'done'); },
    },
  },
};

const tobin: DialogueTree = {
  start: (g) => (at(g, INIT) === 'tobin' ? 'i3' : 'main'),
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('initials');
        if (c === 'told') return 'I can\'t look at Ruth Ashcroft. I bought eggs off her and I couldn\'t look at her.';
        if (c === 'kept') return 'Dad\'s boring. I knew it.';
        return 'You\'re not from here. Bet you can\'t get up the Lantern.';
      },
      options: [{ text: 'Bet I can.', next: 'i1', cond: (g) => !at(g, INIT) }, { text: 'Bye.' }],
    },
    i1: { text: 'There\'s names cut in the top stones. Everyone who\'s been up. I did mine last year. Dad says he never went up. Everyone\'s dad went up.', next: 'i2' },
    i2: { text: 'Find his. J.W. If it\'s there, I win.', options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(INIT, 'climb') }, { text: 'Bye.' }] },
    i3: {
      text: 'Well? Is it there?',
      options: [
        { text: 'J.W. It\'s there, inside a heart, with R.A.', next: 'i4' },
        { text: 'I couldn\'t find it. Maybe he never went up.', next: 'i6' },
      ],
    },
    i4: { text: 'R.A.? R.A. That\'s Ruth Ashcroft. That\'s Ruth Ashcroft.', next: 'i5' },
    i5: { speaker: 'narrator', text: 'He goes red from the collar up, which takes a while, because he\'s tall for fourteen.', effect: (g) => { g.addMarks(5); g.setFlag('initials', 'told'); g.setStage(INIT, 'done'); } },
    i6: { text: 'Told you. Dad\'s boring.', effect: (g) => { g.addMarks(5); g.setFlag('initials', 'kept'); g.setStage(INIT, 'done'); } },
  },
};

const bess: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: 'Charter Post. Ansbury by dark, if the ruts are kind. They\'re never kind.',
      options: [
        { text: 'Anything to deliver round here?', next: 'l1', cond: (g) => !at(g, LETTER) },
        { text: 'Any news on the road?', next: 'news' },
        { text: 'Bye.' },
      ],
    },
    news: {
      text: (g) => (g.stage('storyNotice')
        ? 'The Charter\'s selling the Glass Kirk to Harrowgate, or isn\'t, depending who\'s buying the drinks.'
        : 'Harrowgate carts every day now, both ways. Ore going out, nothing coming back but marks and complaints.'),
    },
    l1: { text: 'One for the Pit. H. Dunmore. From Harrowgate Works, in a hand that presses hard enough to dent the table.', next: 'l2' },
    l2: {
      text: 'Take it up? My horse won\'t do the Pit road. My horse has opinions about the Pit road.',
      options: [{ text: 'I\'ll take it.', effect: (g) => { g.give('corrie_letter'); g.setStage(LETTER, 'deliver'); } }, { text: 'Bye.' }],
    },
  },
};

export const GW_VALE: RegionContent = {
  id: 'greenwake-vale',
  items: [
    { id: 'mill_pin', name: 'Brake pin', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bar', a: '#c08a42' }, desc: 'Bronze, still faintly warm. A small W is stamped in the head.' },
    { id: 'rock_salt', name: 'Rock salt', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'ore', a: '#e8e4dc', b: '#c8c0b0' }, desc: 'A sack of it, from Joss Wether\'s barn. For the ditch mouths, not for supper.' },
    { id: 'pell_creel', name: 'Pell\'s creel', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'fish', a: '#a8844a' }, desc: 'Old wicker, P.G. burned into the lid. Empty. It has been empty for about sixty years.' },
    { id: 'corrie_letter', name: 'Letter for H. Dunmore', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#e8dcc0' }, desc: 'Addressed to the Pit, in a hand that presses hard. Sealed with candle wax and a thumbprint.' },
    { id: 'moot_hinges', name: 'Moot hall hinges', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bar', a: '#c08a42' }, desc: 'A pair of bronze hinges, filed smooth. Not a mark on them that Nance didn\'t mean.' },
  ],
  dialogue: { agnes, cass, dunstan, ned, tobin, bess },
  readables: {
    lanternStones: {
      title: 'The top of the Lantern',
      body: 'Names and initials cut into the parapet, dozens of them, some so worn they\'re only dents.\n\nT.W., fresh and deep, last year.\n\nAnd low on the north side, where you\'d have to sit down to cut it: J.W. + R.A., inside a lopsided heart.',
      effect: (g) => { if (at(g, INIT) === 'climb') g.setStage(INIT, 'tobin'); },
    },
  },
  things: [
    {
      id: 'saltSacks', x: 140.5, z: 222.5, label: 'Take salt from the barn', radius: 2.6, when: (g) => at(g, SALT) === 'salt' && !g.has('rock_salt', 2),
      use: (g) => { g.give('rock_salt', 2 - g.count('rock_salt')); g.toast('Two sacks of rock salt from Joss Wether\'s barn. Heavier than they look.'); g.setStage(SALT, 'ditches'); },
    },
    ...(['ditchA', 'ditchB'] as const).map((id, i) => ({
      id, x: i === 0 ? 194.5 : 206.5, z: i === 0 ? 244.5 : 250.5, label: 'Salt the ditch mouth', radius: 2.6,
      when: (g: GameApi) => at(g, SALT) === 'ditches' && !g.flag(id) && killed(g, 'ditch') >= 3 && g.has('rock_salt'),
      use: (g: GameApi) => { g.take('rock_salt'); g.setFlag(id); g.toast('You work the salt into the mud where the ditch meets the field.'); if (salted(g) >= 2) g.setStage(SALT, 'ned'); },
    })),
    { id: 'lanternStones', x: 68.5, z: 254.5, label: 'Read the names cut in the top stones', radius: 2.6, read: 'lanternStones', when: (g) => !!at(g, INIT) },
    {
      // y: the floor of the hollow behind the falls (measuring from above finds the cliff)
      id: 'oldCreel', x: 94.5, z: 88.5, y: 17, label: 'Look at the ledge at the back', radius: 2.4, when: (g) => !at(g, CREEL),
      use: (g) => { if (g.give('pell_creel')) { g.toast('On a ledge at the back of the hollow, under a skin of dried weed: an old wicker creel with P.G. burned into the lid.'); g.setStage(CREEL, 'pell'); } },
    },
  ],
  spawns: [
    { tag: 'ditch', type: 'jelly', at: [[193, 241], [203, 247], [209, 253]], when: (g) => at(g, SALT) === 'ditches' },
  ],
  quests: {
    [SUP]: {
      id: SUP, name: 'Fourthday Supper', region: 'greenwake', depth: 'short',
      notes: (_g, s) => (s === 'done' ? 'Agnes Pole stretched three trout to thirty plates at the Low Water.' : 'Agnes Pole at the Low Water has thirty plates on fourthday and no cook. She wants three cooked brown trout. Trout need Fishing 5; the inn\'s hearth is free to use.'),
      objectives: (g, s) => (s === 'cook'
        ? [{ text: `Cook brown trout (${Math.min(3, g.count('cooked_trout'))}/3)`, done: g.count('cooked_trout') >= 3, marker: 'dock' }]
        : s === 'agnes' ? [{ text: 'Bring the trout to Agnes Pole', marker: 'agnes' }] : []),
      advance: (g, s) => (s === 'cook' && g.count('cooked_trout') >= 3 ? 'agnes' : s === 'agnes' && g.count('cooked_trout') < 3 ? 'cook' : null),
      marks: (_g, s): Marks => (!s ? { agnes: '!' } : s === 'agnes' ? { agnes: '?' } : {}),
      walk: { obtain: { cook: [['cooked_trout', 3]] } },
    },
    [CLAMP]: {
      id: CLAMP, name: 'The Clamp', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'logs') return 'Cass Pudney burns charcoal in Haverwood. Harrowgate buys everything she makes for the smelter at twice what Bram Tolley can pay, and Bram is three sacks behind. She needs four oak logs to burn his.';
        return g.flag('charcoalTo') === 'bram'
          ? 'Cass burned Bram\'s three sacks at the old price. She\'ll be short at the quarter, and she blames me.'
          : 'Cass sold the burn to Harrowgate and paid her rent. Bram understood. Bram knows about rent.';
      },
      objectives: (g, s) => (s === 'logs' ? [{ text: `Bring Cass oak logs (${Math.min(4, g.count('oak_logs'))}/4)`, done: g.count('oak_logs') >= 4, marker: 'cass' }] : []),
      marks: (g, s): Marks => (!s ? { cass: '!' } : s === 'logs' && g.count('oak_logs') >= 4 ? { cass: '?' } : {}),
      walk: { obtain: { logs: [['oak_logs', 4]] } },
    },
    [PIN]: {
      id: PIN, name: 'Brake Pin', region: 'greenwake', depth: 'short',
      notes: (_g, s) => {
        if (s === 'bar') return 'Gorse Mill\'s brake pin has sheared, and Dunstan Hay can\'t hold the sails in a wind. Nance Tolley can turn a new pin from a bronze bar.';
        if (s === 'dunstan') return 'Nance made the pin and stamped a W in the head.';
        return 'Gorse Mill can hold its sails again, with Nance Tolley\'s pin.';
      },
      objectives: (g, s) => (s === 'bar'
        ? [{ text: g.has('bronze_bar') ? 'Take the bronze bar to Nance Tolley' : 'Get a bronze bar (smelt copper and tin at the smithy furnace)', marker: g.has('bronze_bar') ? 'wren' : 'furnace' }]
        : s === 'dunstan' ? [{ text: 'Take the pin to Dunstan Hay at Gorse Mill', marker: 'dunstan' }] : []),
      marks: (g, s): Marks => (!s ? { dunstan: '!' } : s === 'bar' && g.has('bronze_bar') ? { wren: '?' } : s === 'dunstan' ? { dunstan: '?' } : {}),
      walk: { obtain: { bar: [['bronze_bar', 1]] } },
    },
    [SALT]: {
      id: SALT, name: 'Six Fingers', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'salt') return 'The rain gauge is at four fingers and rising early. At six the Wetlings flood and the cows have to move. Ned Bracken wants the ditch mouths salted now, to keep the mire jellies down so the water drains. The salt is in Joss Wether\'s barn.';
        if (s === 'ditches') return 'I have the salt. Ned says to kill the jellies first, or they sit in the salt and sulk.';
        if (s === 'ned') return 'Both ditch mouths are salted.';
        return 'The Wetlings ditch mouths are salted. Ned Bracken says the water will go somewhere other than the cows.';
      },
      objectives: (g, s) => {
        if (s === 'salt') return [{ text: 'Take salt from Joss Wether\'s barn', marker: 'saltSacks' }];
        if (s === 'ditches') return [
          { text: `Kill the mire jellies at the ditches (${Math.min(3, killed(g, 'ditch'))}/3)`, done: killed(g, 'ditch') >= 3, marker: 'ditchA' },
          { text: `Salt the ditch mouths (${salted(g)}/2)`, done: salted(g) >= 2, marker: g.flag('ditchA') ? 'ditchB' : 'ditchA' },
        ];
        if (s === 'ned') return [{ text: 'Tell Ned Bracken', marker: 'ned' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { ned: '!' } : s === 'ned' ? { ned: '?' } : {}),
    },
    [INIT]: {
      id: INIT, name: 'Initials', region: 'greenwake', depth: 'short',
      notes: (g, s) => {
        if (s === 'climb') return 'Tobin Wether bets his father Joss went up the Lantern as a boy and cut his initials in the top stones, like everyone else. Joss says he didn\'t. Tobin wants J.W. found.';
        if (s === 'tobin') return 'J.W. is cut into the top of the Lantern, inside a lopsided heart, with R.A.: Ruth Ashcroft.';
        return g.flag('initials') === 'told' ? 'I told Tobin about the heart. He can\'t look at Ruth Ashcroft.' : 'I told Tobin I couldn\'t find his father\'s initials.';
      },
      objectives: (_g, s) => (s === 'climb' ? [{ text: 'Read the names at the top of the Lantern', marker: 'lanternStones' }] : s === 'tobin' ? [{ text: 'Tell Tobin Wether', marker: 'tobin' }] : []),
      marks: (_g, s): Marks => (!s ? { tobin: '!' } : s === 'tobin' ? { tobin: '?' } : {}),
    },
    [CREEL]: {
      id: CREEL, name: 'The Summer of the Low Water', region: 'greenwake', depth: 'short',
      notes: (_g, s) => (s === 'pell' ? 'Behind Spill Falls, on a ledge, an old creel with P.G. burned into the lid. Pell Garrow\'s.' : 'Sixty years ago Pell hid a pike behind Spill Falls to keep it from Agnes Pole\'s father, then forgot which ledge. The pike is long gone. Pell let me keep the creel.'),
      objectives: (_g, s) => (s === 'pell' ? [{ text: 'Show the creel to Pell Garrow', marker: 'pell' }] : []),
      marks: (_g, s): Marks => (s === 'pell' ? { pell: '?' } : {}),
    },
    [LETTER]: {
      id: LETTER, name: 'Letter for the Foreman', region: 'greenwake', depth: 'short',
      notes: (_g, s) => (s === 'deliver' ? 'Bess Tull, who drives the Charter Post, has a letter from Harrowgate Works for H. Dunmore at Sallow Pit. Her horse won\'t do the Pit road.' : 'The letter was from Corrie Dunmore, Hesk\'s sister, at Harrowgate Works.'),
      objectives: (_g, s) => (s === 'deliver' ? [{ text: 'Take the letter to Hesk Dunmore at Sallow Pit', marker: 'hesk' }] : []),
      marks: (_g, s): Marks => (!s ? { bess: '!' } : s === 'deliver' ? { hesk: '?' } : {}),
    },
    [HINGE]: {
      id: HINGE, name: 'Hinges', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'bars') return 'Bram\'s ledger has said "Moot hall hinges for M.A. Not started." since spring. Nance wants to make them herself, from two bronze bars.';
        if (s === 'maud') return 'Nance made a pair of moot hall hinges, without a mark on them she didn\'t mean. Maud should have them, and know who made them.';
        return 'Maud says Nance\'s hinges are straight, which from Maud is high praise. Bram said "well".';
      },
      objectives: (g, s) => (s === 'bars'
        ? [{ text: `Bring Nance bronze bars (${Math.min(2, g.count('bronze_bar'))}/2)`, done: g.count('bronze_bar') >= 2, marker: g.count('bronze_bar') >= 2 ? 'wren' : 'furnace' }]
        : s === 'maud' ? [{ text: 'Take the hinges to Maud Ashby', marker: 'maud' }] : []),
      marks: (g, s): Marks => (!s && g.stage('fordBell') === 'done' ? { wren: '!' } : s === 'bars' && g.count('bronze_bar') >= 2 ? { wren: '?' } : s === 'maud' ? { maud: '?' } : {}),
      walk: { from: { quests: { fordBell: 'done' }, flags: { bellChoice: 'confess' } }, obtain: { bars: [['bronze_bar', 2]] } },
    },
  },
  hooks: (D) => {
    // ---- Joss: the salt, and the Lantern
    hook(D, 'joss', (g) => (g.flag('initials') === 'told' && !g.flag('gwJossInit') ? 'gwJ1' : undefined), {
      gwJ1: { text: 'Tobin\'s been asking about the Lantern. And about Ruth Ashcroft. I\'m going to have to go and live in the barn with the salt.', effect: (g) => g.setFlag('gwJossInit') },
    });
    hook(D, 'ruth', (g) => (g.flag('initials') === 'told' && !g.flag('gwRuthInit') ? 'gwR1' : undefined), {
      gwR1: { text: 'Joss Wether\'s boy keeps staring at me in the square like I\'ve grown a second head. Do you know anything about that?', options: [{ text: 'No.', next: 'gwR2' }] },
      gwR2: { speaker: 'narrator', text: 'She looks at you for exactly as long as it takes to know you do.', effect: (g) => g.setFlag('gwRuthInit') },
    });

    // ---- Nance: the mill pin, and her hinges
    hook(D, 'wren', (g) => {
      if (at(g, PIN) === 'bar') return g.has('bronze_bar') ? 'gwP1' : 'gwP0';
      if (at(g, HINGE) === 'bars' && g.count('bronze_bar') >= 2) return 'gwH5';
      if (at(g, HINGE) === 'done' && !g.flag('gwWrenHinge')) return 'gwH9';
      return undefined;
    }, {
      gwP0: { text: 'A pin? For Dunstan? Bring me a bronze bar. Smelt one at the furnace, copper and tin, one of each. I\'m not making a pin out of nothing. I\'m not Uncle Bram.' },
      gwP1: { text: 'A brake pin? For Dunstan? I can do that. I can do that. Uncle Bram, I\'m doing a pin.', next: 'gwP2' },
      gwP2: { speaker: 'narrator', text: 'Bram, at the furnace, says nothing in a way that means yes.', next: 'gwP3' },
      gwP3: { speaker: 'narrator', text: 'Twenty minutes later there\'s a pin on the anvil, still warm, with a small W stamped in the head.', next: 'gwP4' },
      gwP4: { text: 'Don\'t tell him about the W. He\'ll see it. Let him see it.', effect: (g) => { g.take('bronze_bar'); g.give('mill_pin'); g.setStage(PIN, 'dunstan'); } },
      gwH1: { text: 'The moot hall hinges. They\'ve been in his ledger since spring: "Not started." I want to start them. Me. On my own.', next: 'gwH2' },
      gwH2: { text: 'Two bronze bars. I\'ll do the rest. I\'ve been doing the rest for two years, and he signs it.', options: [{ text: 'Two bars. I\'ll bring them.', effect: (g) => g.setStage(HINGE, 'bars') }, { text: 'Not now.' }] },
      gwH5: { text: 'Two. Right. Watch. No, don\'t watch.', next: 'gwH6' },
      gwH6: { speaker: 'narrator', text: 'It takes her the afternoon. Bram comes over twice, and both times she says "I know" before he can speak, and both times she\'s right.', next: 'gwH7' },
      gwH7: {
        text: 'Hinges. A pair. Take them to Maud. Tell her who made them. Tell her who made them twice.',
        effect: (g) => { g.take('bronze_bar', 2); g.give('moot_hinges'); g.setStage(HINGE, 'maud'); },
      },
      gwH9: { text: 'Maud said they\'re straight. Straight! Uncle Bram said "well". From him that\'s a parade.', effect: (g) => g.setFlag('gwWrenHinge') },
    });
    addOption(D, 'wren', 'main', { text: 'Anything you want to make yourself?', next: 'gwH1', cond: (g) => g.stage('fordBell') === 'done' && !at(g, HINGE) });

    // ---- Maud: the hinges
    hook(D, 'maud', (g) => (at(g, HINGE) === 'maud' ? 'gwMh1' : undefined), {
      gwMh1: { text: 'Hinges. For the moot hall. Bram\'s been promising me those since Lady Day.', options: [{ text: 'Nance made them. On her own.', next: 'gwMh2' }] },
      gwMh2: {
        text: (g) => (['report', 'confess'].includes(String(g.flag('bellChoice')))
          ? 'Nance made these? Then they\'re the first thing out of that forge this year I didn\'t have to ask about twice.'
          : 'Nance made these? Tell her the reeve says they\'re straight. That\'s high praise. Ask anyone.'),
        effect: (g) => { g.take('moot_hinges'); g.addMarks(15); g.setStage(HINGE, 'done'); },
      },
    });

    // ---- Bram: what Cass did with the charcoal
    hook(D, 'bram', (g) => (at(g, CLAMP) === 'done' && !g.flag('gwBramCharcoal') && (!g.stage('fordBell') || g.stage('fordBell') === 'done') ? 'gwC1' : undefined), {
      gwC1: {
        text: (g) => (g.flag('charcoalTo') === 'bram'
          ? 'Cass sent three sacks at the old price and said it was your doing. Tell her thank you. No, don\'t. She\'ll charge me for it.'
          : 'Cass sold her burn to Harrowgate. Can\'t blame her. I\'d have done the same. I have done the same.'),
        effect: (g) => g.setFlag('gwBramCharcoal'),
      },
    });

    // ---- Pell: the creel
    hook(D, 'pell', (g) => (at(g, CREEL) === 'pell' ? 'gwCr1' : undefined), {
      gwCr1: { text: 'That\'s my creel.', next: 'gwCr2' },
      gwCr2: { speaker: 'narrator', text: 'He holds it the way people hold babies they\'re afraid of dropping.', next: 'gwCr3' },
      gwCr3: { text: 'The summer the Wend went low, I caught a pike in the Spill as long as my leg. My leg then. Agnes Pole\'s father wanted it for the inn sign.', next: 'gwCr4' },
      gwCr4: { text: 'So I hid it behind the falls, in the creel, in the cold, till he gave up asking. Then I forgot which ledge.', next: 'gwCr5' },
      gwCr5: { speaker: 'narrator', text: 'He opens the lid anyway, and looks in.', next: 'gwCr6' },
      gwCr6: {
        text: 'Gone. Course it\'s gone. Sixty years. Keep the creel. No, give it here. No. Keep it.',
        effect: (g) => { g.addMarks(8); g.setStage(CREEL, 'done'); },
      },
    });

    // ---- Hesk: the letter from his sister
    hook(D, 'hesk', (g) => (at(g, LETTER) === 'deliver' ? 'gwL1' : undefined), {
      gwL1: { text: 'For me? From the Works?', options: [{ text: 'Hand him the letter.', next: 'gwL2' }] },
      gwL2: { speaker: 'narrator', text: 'He reads it standing up, which he doesn\'t do with company letters.', next: 'gwL3' },
      gwL3: {
        text: (g) => (g.stage('fairPrice') === 'done'
          ? 'Corrie. My sister. She says somebody got one of her lads his pick back, and to tell whoever it was they\'ve a friend at the drift.'
          : 'Corrie. My sister. Roof\'s holding, she says, and they\'re getting props from Hagworm Wood. She says I worry about the village too much. She says it every letter.'),
        next: 'gwL4',
      },
      gwL4: { text: 'Thank you. Bess could bring them up herself. Bess never brings them up.', effect: (g) => { g.take('corrie_letter'); g.addMarks(6); g.setStage(LETTER, 'done'); } },
    });
  },
};
