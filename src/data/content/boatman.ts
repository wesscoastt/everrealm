import type { DialogueTree } from '../../game/api';
import type { RegionContent } from './types';

// Davey Penrose at Gullmouth, who had the island boat till the Charter put its ferries on (data/ferries.ts):
// he tells you which ship goes where and from which jetty, and opens the Post's board. Morrow is Hal
// Sennen's run, on the Constant (data/content/packet.ts).

/** Gullmouth's Charter Post sign (data/travel.ts POSTS), literal because content imports types only. */
const GULL_POST: [number, number] = [1731.5, 594.5];

const davey: DialogueTree = {
  start: () => 'd1',
  nodes: {
    d1: {
      text: 'Davey Penrose. I had the island boat, till the Charter put two ships on and called them free.',
      options: [
        { text: 'Which ship goes where?', next: 'd4' },
        { text: 'Show me the Post\'s board.', effect: (g) => g.openTravel('gullmouth') },
        { text: 'Isn\'t the Inkholm crossing stopped?', next: 'd2' },
        { text: 'What about Morrow?', next: 'd3' },
        { text: 'Bye.' },
      ],
    },
    d2: { text: 'The Charter stopped it. Now the Charter sends the Wren there twice an hour. The Charter still doesn\'t row.', next: 'd1' },
    d4: { text: 'The Plover goes north: Kell, then the Sickle. Her jetty\'s the first past the fish steps.', next: 'd5' },
    d5: { text: 'The Wren goes south: Skua Rock, then Inkholm, off the long jetty. The Mewstones boat\'s at the south jetty, same as ever.', next: 'd6' },
    d6: { text: 'They ring when they come in and before they go. Walk on, stand still, don\'t lean on the rail.', next: 'd1' },
    d3: { text: 'That\'s Hal Sennen\'s run, on the Constant, a day and a night out. I don\'t go anywhere I can\'t see land from.', next: 'd1' },
  },
};

export const BOATMAN: RegionContent = {
  id: 'boatman',
  npcs: [{
    id: 'davey_penrose', name: 'Davey Penrose', title: 'Boatman, Gullmouth',
    look: { skin: '#d8a07a', hair: '#7a5a3a', hairStyle: 3, facial: 2, eyes: '#4a6a7a', tunic: '#3a4a5a', trim: '#c8b070', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a22', build: 1.1, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [GULL_POST[0] - 4, GULL_POST[1] + 8], face: [GULL_POST[0] - 9, GULL_POST[1] + 8], anim: 'idle' }],
    barks: ['Plover for Kell. Wren for Inkholm. I\'m only saying.', 'Free, they call it. Free.'],
  }],
  dialogue: { davey_penrose: davey },
};
