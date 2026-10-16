import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, type Marks } from '../kit';
import type { RegionContent } from '../types';

// Ansbury's south gate, and the Penhallows.
// PAGE ONE HUNDRED AND TWELVE (quest): a page cut out of Strake's gate book. bookChoice = 'enter' | 'blank' | 'ferris'.
// THE CHALK HAND (short): who keeps chalking under the toll board.
// THE HOLLIN FORD ROAD (posting): wolves taking carters' dogs.
// THE MORNING POST (quest): Osric's granddaughter at the Waystation. rosieChoice = 'home' | 'letter' | 'gone'.

const PAGE = 'crPage', CHALK = 'crChalk', WOLVES = 'crWolves', ELOPE = 'crElope';
const HW = 'honestWeight';
const hw = (g: GameApi) => g.stage(HW);
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);

const ferris: DialogueTree = {
  start: (g) => {
    if (at(g, PAGE) === 'ferris') return 'f1';
    if (at(g, PAGE) === 'ferris2') return 'f10';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const b = g.flag('bookChoice');
        if (b === 'enter') return 'Docked a week. Fair. I\'d have docked me a month.';
        if (b === 'blank') return 'Strake\'s written "cause unknown" in her book. She looks at it like it\'s a stain on her coat.';
        if (b === 'ferris') return 'Tansy\'s teaching me letters. I can do F, and W, and most of "turnip".';
        return 'Ferris Wade. Night watch. Day watch too, when Strake\'s feeling generous.';
      },
      options: [{ text: 'What do you do at night?', next: 'night' }, { text: 'Bye.' }],
    },
    night: { text: 'Stand here. Count bells. Draw what comes through. Mostly nothing comes through, and I draw that too.' },
    f1: { text: 'Strake sent you. Strake\'s got a face for sending people.', options: [{ text: 'A cart came in at second bell, the week before Lammas. Empty.', next: 'f2' }] },
    f2: { text: 'Did it.', next: 'f3' },
    f3: { speaker: 'narrator', text: 'He laughs, and then stops, because you aren\'t laughing.', next: 'f4' },
    f4: {
      text: 'Wind took that page. Big wind, that week.',
      options: [{ text: 'It was cut out with a knife.', next: 'f5' }, { text: 'All right.' }],
    },
    f5: { speaker: 'narrator', text: 'He looks at the gate. The gate doesn\'t help him.', next: 'f6' },
    f6: {
      text: 'Go to Cotter\'s End. Ask the Mallows. I\'m not saying any more, because then it\'d be me that said it.',
      effect: (g) => g.setStage(PAGE, 'cotters'),
    },
    f10: {
      text: 'She wants it from me. That\'s worse. You know that\'s worse.',
      options: [{ text: 'It\'s better from you.', next: 'f11' }, { text: 'Think about it.' }],
    },
    f11: { text: 'Is it. All right. Now, before I think about it.', effect: (g) => g.setStage(PAGE, 'strakeF') },
  },
};

const tansy: DialogueTree = {
  start: (g) => (at(g, CHALK) === 'tansy' ? 't1' : 'main'),
  nodes: {
    main: {
      text: (g) => (at(g, CHALK) === 'done'
        ? 'The gatehouse door is mine now. Corporal Strake marks it every morning. In red.'
        : 'I\'m practising. L-O-A-D. Load.'),
    },
    t1: { text: 'I didn\'t write on the board. I wrote under the board. That\'s different.', next: 't2' },
    t2: { text: 'Carters say things in the queue. I write them down. Like Corporal Strake does.', next: 't3' },
    t3: { text: 'My da can\'t read. When I can read properly I\'ll read him the gate book, and then he\'ll know what\'s in it.', next: 't4' },
    t4: {
      text: 'Is Corporal Strake angry? She\'s got a face for angry. It\'s the same as her other face.',
      effect: (g) => g.setStage(CHALK, 'strake'),
    },
  },
};

const rosie: DialogueTree = {
  start: (g) => (at(g, ELOPE) === 'waystation' ? 'r1' : 'main'),
  nodes: {
    main: { text: 'The Post goes at first light.' },
    r1: { text: 'He sent you. Of course he sent somebody. He\'d never come himself. The Weighhouse might notice.', next: 'r2' },
    r2: { text: 'Jem\'s got work in Gullmouth. Bett Rook needs a rope hand. Her son used to do it, before the Gannet.', next: 'r3' },
    r3: { text: 'Grandfather wants me to keep his books for thirty years and wear a chain indoors.', next: 'r4' },
    r4: {
      text: 'Say whatever he told you to say. The Post goes at first light either way.',
      options: [
        { text: 'He needs you. Come home.', next: 'rH' },
        { text: 'He told me to give you this.', next: 'rL', cond: (g) => g.has('osric_letter') },
        { text: 'I won\'t stop you.', next: 'rG' },
      ],
    },
    rH: { text: 'Needs.', next: 'rH2' },
    rH2: { speaker: 'narrator', text: 'She looks at Jem. Jem looks at the fire, which is the kindest thing he could do.', next: 'rH3' },
    rH3: {
      text: 'Fine. One more winter of figures. Jem, write to me. Spell it right.',
      effect: (g) => { g.setFlag('rosieChoice', 'home'); g.setStage(ELOPE, 'osric'); },
    },
    rL: { speaker: 'narrator', text: 'She breaks the seal and reads it standing. Then she sits down and reads it again.', next: 'rL2' },
    rL2: { text: 'He says go.', next: 'rL3' },
    rL3: { text: 'He says Gullmouth needs a weighmaster more than Ansbury does, and Bett Rook short-weights her rope.', next: 'rL4' },
    rL4: {
      text: 'He wrote this before he sent you. He wrote it in case.',
      effect: (g) => { g.take('osric_letter'); g.setFlag('rosieChoice', 'letter'); g.setStage(ELOPE, 'osric'); },
    },
    rG: { text: 'Thank you.', next: 'rG2' },
    rG2: {
      text: 'Don\'t tell him anything I said. He\'ll want to know what I said, and I didn\'t say it.',
      effect: (g) => { g.setFlag('rosieChoice', 'gone'); g.setStage(ELOPE, 'osric'); },
    },
  },
};

const jem: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('bookChoice')
        ? 'Ferris let me in at second bell, the night Bee had the croup. I owe that gate a kindness.'
        : 'Jem Mallow. I drive for my dad. Did. I\'ll be rope now.'),
    },
  },
};

const rosieHome: DialogueTree = {
  start: () => 'main',
  nodes: { main: { text: 'Grandfather does the weighing. I do the arithmetic. Between us we\'re one honest man.' } },
};
const rosieGull: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('rosieChoice') === 'letter'
        ? 'He writes every week. Mostly about weights. Bett\'s scales were three ounces out, and she\'s furious with me.'
        : 'He hasn\'t written. I haven\'t either. One of us will.'),
    },
  },
};
const jemGull: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('rosieChoice') === 'home'
        ? 'Bett\'s teaching me splices. Rosie writes. Spells everything right, and corrects mine.'
        : 'Rope all day. Rosie keeps Bett\'s books. Bett\'s frightened of her, which is new for Bett.'),
    },
  },
};

export const CR_GATE: RegionContent = {
  id: 'crownroad-gate',
  dialogue: { ferris, tansy, rosie, jem, rosieHome, rosieGull, jemGull },
  items: [
    { id: 'osric_letter', name: 'Osric\'s letter', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'For R. Penhallow, sealed with the Weighhouse seal. Written weeks ago, by the look of the folds.' },
  ],
  readables: {
    gateBook: {
      title: 'The south gate book',
      body: 'A stub of paper where page 112 was, cut close to the stitching.\n\nPage 113 starts on the first of Lammas: turnips, a cart of slate, Hob Tannet with three sacks of barley.\n\nPressed into it from the page before, where someone drew hard: a wheel with no strokes beside it, and a circle with two crosses in it.\n\nIn the margins of other nights, Strake has written a key. Wheel: cart. Stroke: sack. Circle: bell. One cross, first bell. Two, second.',
      effect: (g) => { if (at(g, PAGE) === 'look') g.setStage(PAGE, 'strake'); },
    },
    chalkWell: {
      title: 'Chalk on the well',
      body: 'On the well kerb, in careful capitals: TOLL IS ON THE BORD.\n\nUnder it, the same words with BOARD spelled right. The first try has been rubbed half out with a thumb.',
      effect: (g) => g.setFlag('crChalkWell'),
    },
    chalkSteps: {
      title: 'Chalk on the keep steps',
      body: 'On the bottom step of the keep, low down, where a child would sit: NAME AND LODE. NAME AND LOAD. NAME AND LOAD.',
      effect: (g) => g.setFlag('crChalkSteps'),
    },
  },
  things: [
    { id: 'gateBook', x: 828.5, z: 364.2, label: 'Read the gate book', radius: 2.2, read: 'gateBook', when: (g) => at(g, PAGE) === 'look' },
    { id: 'chalkWell', x: 806.5, z: 336.8, label: 'Look at the chalk', radius: 2.2, read: 'chalkWell', when: (g) => at(g, CHALK) === 'look' && !g.flag('crChalkWell') },
    { id: 'chalkSteps', x: 822.5, z: 311.8, label: 'Look at the chalk', radius: 2.2, read: 'chalkSteps', when: (g) => at(g, CHALK) === 'look' && !g.flag('crChalkSteps') },
  ],
  spawns: [
    { tag: 'hollinRoad', type: 'roadwolf', at: [[606, 268], [612, 263], [600, 272], [616, 271]], when: (g) => at(g, WOLVES) === 'kill' },
  ],
  quests: {
    [PAGE]: {
      id: PAGE, name: 'Page One Hundred and Twelve', region: 'crownroad', depth: 'quest',
      notes: (g, s) => {
        if (s === 'look') return 'Somebody has cut page 112 out of Corporal Strake\'s gate book: the week before Lammas. She wants me to read the page after it.';
        if (s === 'strake') return 'Pressed into page 113 from the missing page: a wheel with no strokes and a circle with two crosses. In Strake\'s key, an empty cart at second bell.';
        if (s === 'ferris') return 'The gate shuts at first bell. The night marks are drawn by the night watch, Ferris Wade, who can\'t write. Strake never copied out a cart at second bell.';
        if (s === 'cotters') return 'Ferris said "wind" and then said nothing. He sent me to ask the Mallows at Cotter\'s End.';
        if (s === 'decide') return 'Jem Mallow drove his little sister Bee to the physician on Tanners\' Row with croup, and got to the gate at second bell. Ferris let them in without the four-mark night toll, and cut the page.';
        if (s === 'ferris2') return 'I told Strake that Ferris should tell her himself. She\'s waiting.';
        if (s === 'strakeF') return 'Ferris has gone to tell Strake himself.';
        const b = g.flag('bookChoice');
        if (b === 'enter') return 'I told Strake. The night went back in the book, Garth Mallow owes four marks, and Ferris was docked a week.';
        if (b === 'ferris') return 'Ferris told Strake himself. She paid the night toll from her own purse so the book balances, and he\'s learning his letters.';
        return 'I told Strake I couldn\'t find out. She wrote "Page cut. Cause unknown." under the stub. She knew I was lying.';
      },
      objectives: (_g, s) => {
        if (s === 'look') return [{ text: 'Read the gate book', marker: 'gateBook' }];
        if (s === 'strake' || s === 'decide' || s === 'strakeF') return [{ text: 'Talk to Corporal Strake', marker: 'strake' }];
        if (s === 'ferris' || s === 'ferris2') return [{ text: 'Talk to Ferris Wade', marker: 'ferris' }];
        if (s === 'cotters') return [{ text: 'Ask the Mallows at Cotter\'s End', marker: 'garth' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { strake: '!' } : s === 'strake' || s === 'decide' || s === 'strakeF' ? { strake: '?' } : s === 'ferris' || s === 'ferris2' ? { ferris: '?' } : s === 'cotters' ? { garth: '?' } : {}),
      walk: { cast: ['strake', 'garth'] },
    },
    [CHALK]: {
      id: CHALK, name: 'The Chalk Hand', region: 'crownroad', depth: 'short',
      notes: (_g, s) => {
        if (s === 'look') return 'Somebody chalked SCALES READ HEAVY under the toll board. Now there\'s chalk on the market well and the keep steps too, spelled wrong. Strake wants the hand.';
        if (s === 'tansy') return 'Both bits of chalk are a child\'s, practising. The market well is where the children sit.';
        if (s === 'strake') return 'It\'s Tansy Wade, Ferris\'s daughter, practising her letters on what the carters say. She wants to read the gate book to her father.';
        return 'Strake gave Tansy the back of the gatehouse door to chalk on, and marks her spelling in red.';
      },
      objectives: (g, s) => {
        if (s === 'look') return [
          { text: 'Look at the chalk on the market well', marker: 'chalkWell', done: !!g.flag('crChalkWell') },
          { text: 'Look at the chalk on the keep steps', marker: 'chalkSteps', done: !!g.flag('crChalkSteps') },
        ];
        if (s === 'tansy') return [{ text: 'Find whoever is chalking', marker: 'tansy' }];
        if (s === 'strake') return [{ text: 'Tell Corporal Strake', marker: 'strake' }];
        return [];
      },
      advance: (g, s) => (s === 'look' && g.flag('crChalkWell') && g.flag('crChalkSteps') ? 'tansy' : null),
      marks: (_g, s): Marks => (s === 'tansy' ? { tansy: '?' } : s === 'strake' ? { strake: '?' } : {}),
      walk: { cast: ['strake'] },
    },
    [WOLVES]: {
      id: WOLVES, name: 'The Hollin Ford Road', region: 'crownroad', depth: 'short',
      notes: (_g, s) => (s === 'kill'
        ? 'Wolves are taking carters\' dogs on the Hollin Ford road, west of Ansbury. Strake pays two marks a head at the gate.'
        : s === 'strake' ? 'Four wolves dead on the Hollin Ford road. Strake pays at the gate.' : 'Strake paid two marks a head out of the gate box.'),
      objectives: (g, s) => (s === 'kill'
        ? [{ text: `Kill wolves on the Hollin Ford road (${Math.min(4, kills(g, 'hollinRoad'))}/4)` }]
        : s === 'strake' ? [{ text: 'Tell Corporal Strake', marker: 'strake' }] : []),
      advance: (g, s) => (s === 'kill' && kills(g, 'hollinRoad') >= 4 ? 'strake' : null),
      marks: (_g, s): Marks => (s === 'strake' ? { strake: '?' } : {}),
    },
    [ELOPE]: {
      id: ELOPE, name: 'The Morning Post', region: 'crownroad', depth: 'quest',
      notes: (g, s) => {
        if (s === 'waystation') return 'Osric Penhallow\'s granddaughter Rosie is at the Waystation, waiting for the morning Post to Gullmouth with Jem Mallow of Cotter\'s End. Osric wants her home. He gave me a letter for her if she won\'t come, and told me not to read it.';
        if (s === 'osric') {
          const c = g.flag('rosieChoice');
          if (c === 'home') return 'Rosie is going home to keep the Weighhouse books. Jem is going to Gullmouth alone. Osric should know.';
          if (c === 'letter') return 'I gave Rosie her grandfather\'s letter. It told her to go. She and Jem are taking the Post to Gullmouth.';
          return 'I let Rosie and Jem take the Post to Gullmouth. I didn\'t give her Osric\'s letter.';
        }
        const c = g.flag('rosieChoice');
        if (c === 'home') return 'Rosie is home, doing the Weighhouse arithmetic. Jem is splicing rope for Bett Rook in Gullmouth. They write.';
        if (c === 'letter') return 'Rosie and Jem are in Gullmouth with Osric\'s blessing. He wrote it before he sent me.';
        return 'Rosie went to Gullmouth without knowing her grandfather had written to tell her to go. Osric has the letter back.';
      },
      objectives: (_g, s) => {
        if (s === 'waystation') return [{ text: 'Find Rosie Penhallow at the Waystation', marker: 'rosie' }];
        if (s === 'osric') return [{ text: 'Go back to Osric Penhallow', marker: 'osric' }];
        return [];
      },
      marks: (g, s): Marks => (!s && (!hw(g) || hw(g) === 'done') ? { osric: '!' } : s === 'waystation' ? { rosie: '?' } : s === 'osric' ? { osric: '?' } : {}),
      walk: { cast: ['osric'] },
    },
  },
  hooks: (D) => {
    // ---- Strake: the page, the chalk, the wolves
    hook(D, 'strake', (g) => {
      const p = at(g, PAGE);
      if (p === 'strake') return 'crPg5';
      if (p === 'decide') return 'crPg10';
      if (p === 'strakeF') return 'crPgF1';
      if (at(g, CHALK) === 'strake') return 'crCh3';
      if (at(g, WOLVES) === 'strake') return 'crW1';
      return undefined;
    }, {
      crPg1: { text: 'Page one hundred and twelve is gone. Cut out close to the stitching, with a good knife.', next: 'crPg2' },
      crPg2: { text: 'The week before Lammas. Nine years I\'ve kept this book, and nobody has ever taken a page out of it.', next: 'crPg3' },
      crPg3: { text: 'The book\'s on the stool. Read the page after. You\'ll see what I mean, or you won\'t.', effect: (g) => g.setStage(PAGE, 'look') },
      crPg5: { text: 'Wheel, no strokes. An empty cart. Two crosses, second bell.', next: 'crPg6' },
      crPg6: { text: 'Gate shuts at first bell. Nothing comes in after first bell. Nothing came in that I know of.', next: 'crPg7' },
      crPg7: { text: 'The night marks are the night watch\'s. Ferris Wade can\'t write, so he draws, and I copy it fair in the morning.', next: 'crPg8' },
      crPg8: { text: 'I never copied that one. I\'d remember. Ask Ferris why.', effect: (g) => g.setStage(PAGE, 'ferris') },
      crPg10: {
        text: 'Well? Who cut my page?',
        options: [
          { text: 'Ferris. He let a sick child in at second bell without the night toll, and cut the page to hide it.', next: 'crPgE' },
          { text: 'Ferris should tell you himself.', next: 'crPgF' },
          { text: 'I couldn\'t find out.', next: 'crPgB' },
        ],
      },
      crPgE: { text: 'A child.', next: 'crPgE2' },
      crPgE2: { speaker: 'narrator', text: 'She writes while you talk. She doesn\'t look up, and the pen doesn\'t stop.', next: 'crPgE3' },
      crPgE3: { text: 'The night goes back in. Mallow owes four marks. Ferris is docked a week for the page. The book is whole.', next: 'crPgE4' },
      crPgE4: {
        text: 'Thank you. I mean it. I\'ll hate you for about a day.',
        effect: (g) => { g.setFlag('bookChoice', 'enter'); g.addMarks(15); g.setStage(PAGE, 'done'); },
      },
      crPgF: { text: 'Himself. Then send him. I\'ll be here. I\'m always here.', effect: (g) => g.setStage(PAGE, 'ferris2') },
      crPgF1: { text: 'He told me. Stood there like a cart with no strokes.', next: 'crPgF2' },
      crPgF2: { text: 'I\'ve put four marks in the toll box from my own purse, so the book balances. The night goes back in.', next: 'crPgF3' },
      crPgF3: {
        text: 'And he\'s learning his letters. If he can cut a page, he can write one.',
        effect: (g) => { g.setFlag('bookChoice', 'ferris'); g.addMarks(15); g.setStage(PAGE, 'done'); },
      },
      crPgB: { text: 'Couldn\'t.', next: 'crPgB2' },
      crPgB2: { speaker: 'narrator', text: 'She looks at you long enough for you to understand that she knows you could.', next: 'crPgB3' },
      crPgB3: { speaker: 'narrator', text: 'She writes under the stub, small: Page cut. Cause unknown. E.S.', next: 'crPgB4' },
      crPgB4: {
        text: 'Here. For your trouble. Not for your answer.',
        effect: (g) => { g.setFlag('bookChoice', 'blank'); g.addMarks(10); g.setStage(PAGE, 'done'); },
      },
      // The chalk hand
      crCh1: { text: 'If I knew, it would be in the book.', next: 'crCh2' },
      crCh2: {
        text: 'Now there\'s more. On the market well, on the keep steps. Spelled wrong, all of it. Find me the hand.',
        effect: (g) => g.setStage(CHALK, 'look'),
      },
      crCh3: { text: 'Ferris Wade\'s girl.', next: 'crCh4' },
      crCh4: { speaker: 'narrator', text: 'Something happens at the corner of her mouth, and is put away again.', next: 'crCh5' },
      crCh5: {
        text: 'Tell her the back of the gatehouse door is hers. I\'ll mark her spelling. Not the board.',
        effect: (g) => { g.addMarks(6); g.setStage(CHALK, 'done'); },
      },
      // Wolves
      crW1: { text: 'Four. Two marks a head, out of the gate box.', next: 'crW2' },
      crW2: {
        text: 'They\'ve been taking carters\' dogs off the tailboards. Hob lost his in August. He doesn\'t talk about it, so don\'t.',
        effect: (g) => { g.addMarks(8); g.setStage(WOLVES, 'done'); },
      },
    });
    addOption(D, 'strake', 'main', { text: 'You look like somebody moved your pen.', next: 'crPg1', cond: (g) => !at(g, PAGE) });
    addOption(D, 'strake', 'main', { text: 'Who chalked SCALES READ HEAVY under the toll board?', next: 'crCh1', cond: (g) => !at(g, CHALK) });

    // ---- Garth Mallow: the night cart
    hook(D, 'garth', (g) => (at(g, PAGE) === 'cotters' ? 'crGp1' : undefined), {
      crGp1: { text: 'Ferris sent you. Good lad, Ferris.', next: 'crGp2' },
      crGp2: { text: 'Our Bee had the croup. Barking like a fox, couldn\'t get her breath. Our Jem put her in the cart at first bell.', next: 'crGp3' },
      crGp3: { text: 'There\'s a physician on Tanners\' Row. Jem got to the gate at second bell, and it was shut.', next: 'crGp4' },
      crGp4: { text: 'Night toll\'s four marks. Jem had nothing on him. Ferris opened the gate anyway.', next: 'crGp5' },
      crGp5: { text: 'Bee\'s fine. Shouts the house down.', next: 'crGp6' },
      crGp6: {
        text: 'I\'ve had the four marks in a jar ever since. Nobody\'s come for them. I suppose now I know why.',
        effect: (g) => g.setStage(PAGE, 'decide'),
      },
    });

    // ---- Osric: the morning Post
    hook(D, 'osric', (g) => {
      if (at(g, ELOPE) === 'osric') return 'crE20';
      // Dorn's errand comes first when both are waiting
      if (!at(g, ELOPE) && (!hw(g) || hw(g) === 'done') && at(g, 'crStone') !== 'osric') return 'crE1';
      return undefined;
    }, {
      crE1: {
        text: (g) => (hw(g) === 'done'
          ? 'You again. You aren\'t from the city, which is the useful thing about you.'
          : 'You. You aren\'t from the city. Good. I need somebody who isn\'t.'),
        next: 'crE2',
      },
      crE2: { text: 'My granddaughter Rosie has gone to the Waystation. The morning Post leaves for Gullmouth at first light.', next: 'crE3' },
      crE3: {
        text: 'She\'s going with a carter\'s boy from Cotter\'s End. Jem Mallow. Rope, and no prospects.',
        options: [{ text: 'And you want her back.', next: 'crE5' }, { text: 'That isn\'t my business.', next: 'crE4' }],
      },
      crE4: { text: 'No. It\'s mine, and I can\'t leave the scale. Next load.' },
      crE5: { text: 'I want her to have the Weighhouse books after me. She\'s good with figures. She\'s better than me.', next: 'crE6' },
      crE6: { speaker: 'narrator', text: 'He takes a folded letter from inside his coat and holds it a moment before he gives it to you.', next: 'crE7' },
      crE7: {
        text: 'Bring her home. If she won\'t come, give her that. Don\'t read it.',
        effect: (g) => { g.give('osric_letter'); g.setStage(ELOPE, 'waystation'); },
      },
      crE20: {
        text: (g) => {
          const c = g.flag('rosieChoice');
          if (c === 'home') return 'She\'s back. She\'s in the Weighhouse, doing the books, faster than me and louder.';
          if (c === 'letter') return 'You gave it to her.';
          return 'They\'d gone?';
        },
        next: 'crE21',
      },
      crE21: {
        text: (g) => {
          const c = g.flag('rosieChoice');
          if (c === 'home') return 'Thank you. I\'ll have the letter back now.';
          if (c === 'letter') return 'Good. I couldn\'t. I wrote it in July and carried it about like a stone in a boot.';
          return 'Did you give her the letter?';
        },
        options: [
          { text: 'Give back the letter.', next: 'crE22', cond: (g) => g.flag('rosieChoice') === 'home' },
          { text: 'Go on.', next: 'crE23', cond: (g) => g.flag('rosieChoice') === 'letter' },
          { text: 'No.', next: 'crE24', cond: (g) => g.flag('rosieChoice') === 'gone' },
        ],
      },
      crE22: {
        speaker: 'narrator', text: 'He puts it in the stove without opening it.',
        effect: (g) => { g.take('osric_letter'); g.addMarks(20); g.setStage(ELOPE, 'done'); },
      },
      crE23: {
        text: 'She\'ll write. She said she\'d write. She\'ll write about my spelling.',
        effect: (g) => { g.addMarks(20); g.setStage(ELOPE, 'done'); },
      },
      crE24: { speaker: 'narrator', text: 'He takes it back and puts it inside his coat, where it was.', next: 'crE25' },
      crE25: {
        text: 'Then she went without it. That\'s my doing, not yours. I should have said it to her face.',
        effect: (g) => { g.take('osric_letter'); g.addMarks(20); g.setStage(ELOPE, 'done'); },
      },
    });
  },
};
