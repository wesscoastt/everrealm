import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { BEND, DOWNS, STRAIGHT, TRACK_W } from '../races';

// Amberwold Downs' people (data/races.ts, game/Races.ts): Barnabas Quick, who makes the book under the stand, and
// Jenna Polgrain, who keeps the stables and knows every horse's temper. The crowd in the stand is Races.ts's.

const Z0 = DOWNS.z + BEND + Math.ceil(TRACK_W / 2) + 2, X0 = DOWNS.x - 22;
const BOOK: [number, number] = [X0 - 4.5, Z0 + 3];

const npcs: NpcDef[] = [
  {
    id: 'downs_book', name: 'Barnabas Quick', title: 'Bookmaker, Amberwold Downs',
    look: { skin: '#d8a882', hair: '#2a1e14', hairStyle: 1, facial: 2, eyes: '#3a2a1e', tunic: '#2a4a3a', trim: '#c8a03a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'wide', hatColor: '#1a1a1e', build: 1.1, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: BOOK, face: [BOOK[0], BOOK[1] - 3], anim: 'idle' }],
    barks: ['Prices on the board! Get on before the stalls!', 'Brightcoat\'s short. Short as my temper.', 'Any each-way? No? Win only, then.', 'Long shots! Somebody back a long shot, it\'s been a dull week.'],
  },
  {
    id: 'downs_stable', name: 'Jenna Polgrain', title: 'Head lad, Amberwold Downs',
    look: { frame: 'f', skin: '#e8c0a0', hair: '#8a4a22', hairStyle: 3, eyes: '#3a5a3a', tunic: '#6a5a3c', trim: '#3a2a1e', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true },
    schedule: [{ from: 6, to: 21, at: [DOWNS.x - 7.5, DOWNS.z - BEND - 12.5], face: [DOWNS.x - 7.5, DOWNS.z - BEND - 9], anim: 'idle' }],
    barks: ['Mind your feet, they kick.', 'Kingsbane wants the whole straight. Tell the jockey, not me.', 'Salt Lick\'s off her oats. Don\'t tell Barnabas.'],
  },
];

const dialogue: Record<string, DialogueTree> = {
  downs_book: {
    start: () => 'main',
    nodes: {
      main: {
        text: 'Barnabas Quick, making the book since before you were born. A race every six minutes, six to post, win only. You back a horse at the price on the board, and if it wins I pay you the price. If it doesn\'t, I buy myself something nice.',
        options: [
          { text: 'I\'d like to put a bet on.', effect: (g) => g.openBook() },
          { text: 'How do I pick a winner?', next: 'pick' },
          { text: 'Do you ever lose?', next: 'lose' },
          { text: 'Goodbye.' },
        ],
      },
      pick: {
        text: 'Read the form. Short odds is a horse I think will win. Long odds is a horse I\'d be glad to see win, because nobody\'s backed it. The favourite wins near enough two in five. The rest of the time somebody\'s grinning at me across this stall, and it\'s rarely the same face twice.',
        options: [{ text: 'I\'d like to put a bet on.', effect: (g) => g.openBook() }, { text: 'Goodbye.' }],
      },
      lose: {
        text: 'Every day. Never by the end of the week. There\'s a limit, mind: win too much off me in one day and I stop taking your money. Not because I can\'t pay. Because my wife counts the satchel.',
        options: [{ text: 'I\'d like to put a bet on.', effect: (g) => g.openBook() }, { text: 'Goodbye.' }],
      },
    },
  },
  downs_stable: {
    start: () => 'main',
    nodes: {
      main: {
        text: 'Jenna Polgrain. I keep the yard. If you\'re after a tip, I\'ll give you the only one I trust: a horse that looks you in the eye before a race is thinking about the race. One that looks at the grass is thinking about the grass.',
        options: [
          { text: 'Which ones look you in the eye?', next: 'tip' },
          { text: 'Goodbye.' },
        ],
      },
      tip: {
        text: 'Kingsbane, always, and he\'s worth it from the far turn home. Widow\'s Tax looks at everybody and goes too fast too soon. Tin Penny looks at the grass, but she never stops running, and at thirty to one that\'s a thing worth thinking about.',
        options: [{ text: 'Thank you.' }],
      },
    },
  },
};

export const DOWNS_CONTENT: RegionContent = { id: 'downs', npcs, dialogue };
