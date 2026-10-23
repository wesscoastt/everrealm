import type { DialogueTree, GameApi } from '../../game/api';
import type { RegionContent } from './types';
import { CALLIS_PACKET, CALLIS_QUAY_X } from '../../world/morrow';

// The Morrow packet: the Constant, Gullmouth to Callis and back, a day and a night each way. Hal
// Sennen is her master; he's at whichever end she's tied up at. Taking her is how a player crosses
// between the lands (world/land.ts): the page reloads into the other, and you come ashore there.

/** Gullmouth's Charter Post sign (data/travel.ts POSTS), literal because content imports types only. */
const GULL_POST: [number, number] = [1731.5, 594.5];
const FARE = 20;
/** Morrow is hard country: the packet takes nobody under this. */
const LEVEL = 30;

/** The fare: nothing on Delia Harrowgate's account (data/content/callis.ts, the Third Daughter). */
const fare = (g: GameApi) => (g.flag('tdPassage') ? 0 : FARE);

const tree = (to: 'morrow' | 'counties'): DialogueTree => ({
  start: () => 'p1',
  nodes: {
    p1: {
      text: to === 'morrow' ? 'Hal Sennen, master of the Constant. Gullmouth to Callis and back, a day and a night each way.' : 'Back to Gullmouth? A day and a night, and the wind\'s from the right quarter for once.',
      options: [
        { text: (g: GameApi) => `Book passage to ${to === 'morrow' ? 'Callis' : 'Gullmouth'}. (${fare(g) ? `${fare(g)} marks` : 'on Delia Harrowgate\'s account'})`, next: 'p2' },
        { text: to === 'morrow' ? 'What\'s Callis like?' : 'How long have you sailed this?', next: to === 'morrow' ? 'p4' : 'p6' },
        { text: 'Not today.' },
      ],
    },
    p2: {
      text: (g: GameApi) => g.level('melee') < LEVEL ? 'Morrow is no place to learn which end of a sword to hold. Come back with a few more years on you.'
        : g.marks < fare(g) ? `It's ${FARE} marks, and I don't take promises. They don't float.`
          : fare(g) ? 'Keep out from under the boom, and don\'t be sick on the passengers who paid more than you.'
            : 'On Harrowgate\'s account. I\'ll send Delia the bill, and she\'ll pay it, and complain. Keep out from under the boom.',
      next: 'p3',
    },
    p3: {
      text: (g: GameApi) => (g.level('melee') < LEVEL || g.marks < fare(g) ? 'Another time, then.' : 'Cast off.'),
      effect: (g: GameApi) => {
        if (g.level('melee') < LEVEL || g.marks < fare(g)) return;
        if (fare(g)) g.addMarks(-fare(g));
        g.crossLand(to);
      },
    },
    ...(to === 'morrow' ? {
    p4: { text: 'White. Taller than you\'ll believe until you\'ve seen it. The towers stand on stone that lifts, and they pin them down with stone that doesn\'t.', next: 'p5' },
    p5: { text: 'Don\'t stand in the street looking up. It marks you for a mainlander, and the pickpockets in Callis are very good.', next: 'p1' },
    } : {
    p6: { text: 'Twenty-two years. The Constant\'s older than that. She was my mother\'s, and she sailed it twenty-two before me.', next: 'p1' },
    }),
  },
});

const LOOK = { skin: '#c89070', hair: '#3a2a1e', hairStyle: 3, facial: 1, eyes: '#4a5a6a', tunic: '#1e2a3e', trim: '#d8c890', trousers: '#2a2a30', boots: '#1e1a16', cape: '#1e2a3e', hat: 'wide' as const, hatColor: '#1a1a1e', build: 1.08, age: 0.55 };

export const PACKET_CONTENT: RegionContent = {
  id: 'packet',
  npcs: [
    {
      id: 'sennen_gull', name: 'Hal Sennen', title: 'Master of the Constant, the Morrow packet', look: LOOK,
      schedule: [{ from: 0, to: 24, at: [GULL_POST[0] - 4, GULL_POST[1] - 4], face: [GULL_POST[0] - 8, GULL_POST[1] - 4], anim: 'idle' }],
      barks: ['Callis by morning.', 'Mind the boom.'],
    },
    {
      land: 'morrow', id: 'sennen_callis', name: 'Hal Sennen', title: 'Master of the Constant, the Morrow packet', look: LOOK,
      schedule: [{ from: 0, to: 24, at: [CALLIS_QUAY_X - 3.5, CALLIS_PACKET.z + 3.5], face: [CALLIS_QUAY_X + 2, CALLIS_PACKET.z + 3.5], anim: 'idle' }],
      barks: ['Gullmouth by morning.', 'Mind the boom.'],
    },
  ],
  dialogue: { sennen_gull: tree('morrow'), sennen_callis: tree('counties') },
};
