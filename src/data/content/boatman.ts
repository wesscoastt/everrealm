import type { DialogueTree } from '../../game/api';
import type { RegionContent } from './types';

// Davey Penrose's island boat, at Gullmouth (data/travel.ts: the ferries from Gullmouth). Ask him for a
// ship and he takes you out to the islands: the Mewstones, Inkholm and Kell. Morrow is Hal Sennen's run,
// on the Constant (data/content/packet.ts).

/** Gullmouth's Charter Post sign (data/travel.ts POSTS), literal because content imports types only. */
const GULL_POST: [number, number] = [1731.5, 594.5];

const davey: DialogueTree = {
  start: () => 'd1',
  nodes: {
    d1: {
      text: 'Davey Penrose. The island boat: the Mewstones, Inkholm, Kell, wherever there\'s a jetty and a fare.',
      options: [
        { text: 'Take me out to the islands.', effect: (g) => g.openTravel('gullmouth') },
        { text: 'Isn\'t the Inkholm crossing stopped?', next: 'd2' },
        { text: 'What about Morrow?', next: 'd3' },
        { text: 'Bye.' },
      ],
    },
    d2: { text: 'The Charter stopped it. The Charter doesn\'t row. I put you off at Gillsby and I don\'t get off the boat.', next: 'd1' },
    d3: { text: 'That\'s Hal Sennen\'s run, on the Constant, a day and a night out. I don\'t go anywhere I can\'t see land from.', next: 'd1' },
  },
};

export const BOATMAN: RegionContent = {
  id: 'boatman',
  npcs: [{
    id: 'davey_penrose', name: 'Davey Penrose', title: 'The island boat, Gullmouth',
    look: { skin: '#d8a07a', hair: '#7a5a3a', hairStyle: 3, facial: 2, eyes: '#4a6a7a', tunic: '#3a4a5a', trim: '#c8b070', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a22', build: 1.1, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [GULL_POST[0] - 4, GULL_POST[1] + 8], face: [GULL_POST[0] - 9, GULL_POST[1] + 8], anim: 'idle' }],
    barks: ['Islands! Boat\'s going out!', 'Mewstones, Inkholm, Kell.'],
  }],
  dialogue: { davey_penrose: davey },
};
