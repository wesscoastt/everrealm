import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { FAIR_ITEMS } from '../wakeFair';

// The Wake Fair's people (data/wakeFair.ts has the fair, game/WakeFair.ts the games). They're on the
// meadow east of Hollin Ford's bridge for as long as the Lantern Wake lasts, and gone the day after.

const on = (g: GameApi) => g.fairOn();
const left = (g: GameApi, game: string) => g.fairPlaysLeft(game);
const always = (at: [number, number], face: [number, number], anim: 'idle' = 'idle') => [{ from: 0, to: 24, at, face, anim }];

const npcs: NpcDef[] = [
  {
    id: 'fair_dilly', name: 'Dilly Marsh', title: 'Hoop-la',
    look: { skin: '#e8c0a0', hair: '#a8562a', hairStyle: 4, eyes: '#5a7a3a', tunic: '#e8701a', trim: '#2a2420', trousers: '#3a2a20', boots: '#2a1e14', lashes: true, age: 0.2, build: 0.9 },
    schedule: always([223.3, 203.2], [226, 204]),
    barks: ['Rings! Ring a pumpkin!', 'Back row\'s worth three!', 'Nobody\'s rung the back row all day. Could be you.'],
    when: on,
  },
  {
    id: 'fair_wat', name: 'Barnaby Coombe', title: 'The Lantern Shy',
    look: { skin: '#c89a78', hair: '#8a847c', hairStyle: 1, beard: true, eyes: '#4a3a2a', tunic: '#3a2a40', trim: '#e8701a', trousers: '#2a2620', boots: '#1e1610', age: 0.75, build: 1.05 },
    schedule: always([247.1, 209.6], [244, 209]),
    barks: ['Knock a lantern off!', 'Six balls, two marks.', 'Mind Barty\'s pumpkins. He counts them.'],
    when: on,
  },
  {
    id: 'fair_nance', name: 'Prue Fettle', title: 'Apples',
    look: { skin: '#d8a888', hair: '#4a3020', hairStyle: 2, eyes: '#6a4a2a', tunic: '#7a2a24', trim: '#e8dcc0', trousers: '#3a2a20', boots: '#2a1e14', apron: true, lashes: true, age: 0.45, build: 1.1 },
    schedule: always([229.2, 218.3], [231, 217]),
    barks: ['Duck for an apple!', 'Hands behind your back, love.', 'There\'s a towel. There\'s always a towel.'],
    when: on,
  },
  {
    id: 'fair_ida', name: 'Ida Pell', title: 'Judge of the Giant Pumpkin',
    look: { skin: '#e2c0a4', hair: '#c8c4bc', hairStyle: 2, eyes: '#4a5a6a', tunic: '#2a2a30', trim: '#c8a050', trousers: '#2a2a30', boots: '#1a1612', hat: 'witch', hatColor: '#2a2430', lashes: true, age: 0.8, build: 0.9 },
    schedule: always([239.9, 213.4], [237, 213.5]),
    barks: ['Guess the weight!', 'One guess a day.', 'Don\'t lean on the cart.'],
    when: on,
  },
  {
    id: 'fair_gil', name: 'Barty Rudd', title: 'Carver',
    look: { skin: '#b8865e', hair: '#2a1e16', hairStyle: 3, beard: true, eyes: '#3a2a1a', tunic: '#5a4a2a', trim: '#3a2a1c', trousers: '#3a3430', boots: '#2a1e14', apron: true, age: 0.35, build: 1.0 },
    schedule: always([244, 223.6], [244, 220]),
    barks: ['Bring me a pumpkin.', 'Every one\'s got a face in it already.', 'Mind the knife.'],
    when: on,
  },
];

const dilly: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (left(g, 'hoopla') ? 'Rings! Five rings, two marks, ring a pumpkin and the candles are yours. The back row\'s worth three, if you\'ve the arm for it.' : 'You\'ve had your prizes off me today. You can still throw for the fun of it. I won\'t tell anyone you\'re enjoying yourself.'),
      options: [
        { text: 'I\'ll have a go. (2 marks)', cond: (g) => left(g, 'hoopla') > 0, effect: (g) => g.fairPlay('hoopla') },
        { text: 'One more, for the fun of it.', cond: (g) => left(g, 'hoopla') === 0, effect: (g) => g.fairPlay('hoopla') },
        { text: 'Has anyone ever won the pumpkin head?', next: 'head' },
        { text: 'Not now.' },
      ],
    },
    head: { text: 'Two last year. One of them was my brother, so I\'m told that doesn\'t count. It hangs on the pole until somebody earns it, then Barty carves another. The shy and the apples give it out too, if you\'re good. The judge gives it out if you\'re uncanny.', next: 'hello' },
  },
};

const wat: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (left(g, 'shy') ? 'Six balls, six lanterns, two marks. Knock them off the rail. The turnips are mine and the pumpkins are Barty\'s, and he wants his back in one piece, so aim for mine.' : 'You\'ve cleaned me out of prizes for today. Throw if you like. The lanterns don\'t mind.'),
      options: [
        { text: 'Give me the balls. (2 marks)', cond: (g) => left(g, 'shy') > 0, effect: (g) => g.fairPlay('shy') },
        { text: 'A few more throws, for nothing.', cond: (g) => left(g, 'shy') === 0, effect: (g) => g.fairPlay('shy') },
        { text: 'Why turnips and pumpkins both?', next: 'why' },
        { text: 'Not now.' },
      ],
    },
    why: { text: 'Turnips are the Wake. Always have been. Pumpkins came off a Morrow ship six years back and the young ones took to them. I put both up. Keeps the peace in the valley, and the turnips are cheaper to replace.', next: 'hello' },
  },
};

const nance: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (left(g, 'apples') ? 'Apples in the tub, hands behind your back. You\'ve as long as it takes me to say the Wake rhyme twice, which is about twenty-five seconds, the way I say it. Two marks.' : 'You\'ve had your prizes, love. You can still duck for the fun of it. Your hair\'s wet already.'),
      options: [
        { text: 'I\'ll duck. (2 marks)', cond: (g) => left(g, 'apples') > 0, effect: (g) => g.fairPlay('apples') },
        { text: 'Again, just for the apples.', cond: (g) => left(g, 'apples') === 0, effect: (g) => g.fairPlay('apples') },
        { text: 'What\'s the rhyme?', next: 'rhyme' },
        { text: 'Not now.' },
      ],
    },
    rhyme: { text: '"Soul, soul, an apple or two. If you\'ve no apples, a pear will do." There\'s a second verse. It\'s rude. I don\'t do the second verse in front of the Reeve.', next: 'hello' },
  },
};

const ida: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.fairGuessed() ? 'You\'ve had your guess for today. Come back tomorrow; there\'ll be a new one on the cart, and I\'ll have my scale back from whoever borrowed it.' : 'This one came off the Pryor farm this morning. Guess its weight in pounds. One guess a day, and I\'ll know if you\'ve been at my scale.'),
      options: [
        { text: 'I\'ll guess.', cond: (g) => !g.fairGuessed(), effect: (g) => g.fairPlay('guess') },
        { text: 'How big do they get?', next: 'big' },
        { text: 'Not now.' },
      ],
    },
    big: { text: 'The heaviest I\'ve weighed was nine hundred and twelve pounds. It took four men and a door to get it on the cart, and the door was never the same. Most come in between four and nine hundred. That\'s all the help you\'re getting.', next: 'hello' },
  },
};

const gil: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.count('pumpkin') ? 'Got one? Pick a face and I\'ll cut it. No charge. It\'s the Wake.' : 'Pick one from the patch and bring it here, and I\'ll cut you a face in it. No charge. It\'s the Wake.'),
      options: [
        { text: 'Carve this one.', cond: (g) => g.count('pumpkin') > 0, effect: (g) => g.fairPlay('carve') },
        { text: 'Where did the pumpkins come from?', next: 'from' },
        { text: 'Not now.' },
      ],
    },
    from: { text: 'Seed off a Morrow ship, six years back. Barnaby says they\'re not proper. Barnaby\'s carved turnips for forty years and his thumbs look it. Set one in your window when you get home. Turnips go soft by Martinmas. These\'ll see you to the Goose Fair.', next: 'hello' },
  },
};

export const WAKE_FAIR_CONTENT: RegionContent = {
  id: 'wakefair',
  items: FAIR_ITEMS,
  npcs,
  dialogue: { fair_dilly: dilly, fair_wat: wat, fair_nance: nance, fair_ida: ida, fair_gil: gil },
};
