import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// The Mewstones isle beyond the hamlet (world/sites.ts): Walt Bolitho at his croft, who knows the
// stones on the headland, the bat caves under the fell, and what came ashore on the east shore.

const npcs: NpcDef[] = [{
  id: 'bolitho', name: 'Walt Bolitho', title: 'Crofter',
  look: { skin: '#c89070', hair: '#8a7a6a', hairStyle: 0, beard: true, eyes: '#3a4a5a', tunic: '#4a4a3a', trim: '#8a7a5a', trousers: '#3a3028', boots: '#2a1e14', hat: 'cap', hatColor: '#3a3a30', build: 1.1, age: 0.75 } as NpcDef['look'],
  schedule: [{ from: 0, to: 24, at: [2412.5, 772.5], face: [2416, 772], anim: 'idle' }],
  barks: ['The sheep don\'t care for the stones either.', 'Shut the fold gate behind you.'],
}];

const walt: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('metBolitho') ? 'Back again. You\'ll be wanting something, then.' : 'Walt Bolitho. You\'ve walked up from the Mewstones? Nobody walks up from the Mewstones unless they want something, or they\'re lost.'),
      effect: (g) => g.setFlag('metBolitho'),
      options: [
        { text: 'What are the stones on the headland?', next: 'stones' },
        { text: 'Is there anything on the fell?', next: 'gullery' },
        { text: 'There\'s a wreck on the east shore.', next: 'wreck' },
        { text: 'Just passing.' },
      ],
    },
    stones: {
      text: 'The Mew Stones. The isle\'s named for them, or they\'re named for the gulls, depending who\'s buying. Nine of them, and one\'s been down since my grandfather\'s day. Don\'t sit on the flat one in the middle. I don\'t know why. Nobody does. You just don\'t.',
      options: [{ text: 'Is there anything on the fell?', next: 'gullery' }, { text: 'There\'s a wreck on the east shore.', next: 'wreck' }, { text: 'Thanks.' }],
    },
    gullery: {
      text: 'The Gullery. Caves right through the fell, full of bats the size of a coat. There\'s an old one at the bottom my father called Leatherwing. He went in after a ewe once. He came out without the ewe and didn\'t go in again.',
      options: [{ text: 'What are the stones on the headland?', next: 'stones' }, { text: 'There\'s a wreck on the east shore.', next: 'wreck' }, { text: 'Thanks.' }],
    },
    wreck: {
      text: 'The Margery. Gullmouth boat. Came ashore in the February gales with a hold full of salt fish and nobody aboard. The harbourmaster says the crew took to the boat. I say there was no boat. I\'ve stopped saying it in Gullmouth.',
      options: [{ text: 'What are the stones on the headland?', next: 'stones' }, { text: 'Is there anything on the fell?', next: 'gullery' }, { text: 'Thanks.' }],
    },
  },
};

export const MEW_ISLE_CONTENT: RegionContent = { id: 'mewIsle', npcs, dialogue: Object.fromEntries(npcs.map((n) => [n.id, walt])) };
