import type { DialogueTree } from '../../game/api';
import type { RegionContent } from './types';

// The Kettle, Scarth: Nia Prosser, whose ewes winter in the crack in the crater's north wall, at
// the door of the group dungeon behind it (Under the Kettle: data/dungeons.ts, world/sites.ts).

const cleared = (g: { flag(k: string): unknown }) => Number(g.flag('gdClears:gd-kettle') ?? 0) > 0;

const nia: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (cleared(g) ? 'The ewes are back in the fold. They won\'t go to the back of it. Neither will I.' : 'You\'ll be wanting the fold. Mind the hurdles. I\'ve only just mended them.'),
      options: [
        { text: 'What happened to your ewes?', next: 'ewes', cond: (g) => !cleared(g) },
        { text: 'What\'s at the back of the crack?', next: 'back' },
        { text: 'Bye.' },
      ],
    },
    ewes: { text: 'Nine in one night, at Martinmas. No blood at the hurdles. Something came up from the back and went down again the way it came.', next: 'ewes2' },
    ewes2: { text: 'Wolves, the Watch says. Wolves don\'t carry off nine ewes without a mark on the gate.' },
    back: { text: 'It goes down further than anyone\'s been. My gran said the star\'s still down there, and the light is it breathing. She called it the Glim.', next: 'back2' },
    back2: { speaker: 'narrator', text: 'She doesn\'t say whether she believed her gran. She doesn\'t look at the crack while she says it.', next: 'back3' },
    back3: { text: 'If you go in, take people. And close the hurdles after you.' },
  },
};

export const KETTLE: RegionContent = {
  id: 'kettle',
  npcs: [
    {
      id: 'nia', name: 'Nia Prosser', title: 'Shepherd, Kelderby',
      look: { frame: 'f', skin: '#d8b090', hair: '#5a3a24', hairStyle: 4, eyes: '#4a5a4a', tunic: '#7a6a52', trim: '#c8b890', trousers: '#4a4034', boots: '#2a2018', cape: '#5a4a3a', hat: 'hood', hatColor: '#8a7a62', freckles: true, build: 1.0, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [804.5, 2047.5], face: [807.5, 2041], anim: 'idle' }],
      barks: ['Mind the hurdles.', 'Nine ewes.'],
    },
  ],
  dialogue: { nia },
};
