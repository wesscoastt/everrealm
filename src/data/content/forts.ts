import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// The bandit chiefs' tallies (data/forts.ts): the rag each gang hangs over its gate, a stroke for
// every cart it has taken. A chief keeps the tally on them, and it falls when they do. The Charter
// pays a bounty by the stroke, so any trader will give a good price for one.

const tally = (id: string, name: string, value: number, desc: string): ItemDef => ({
  id: 'tally_' + id, name, kind: 'trophy', rarity: 'rare', stack: false, value, icon: { shape: 'pelt', a: '#5a1e1a', b: '#e8e0cc' }, desc,
});

export const FORT_CONTENT: RegionContent = {
  id: 'forts',
  items: [
    tally('gibbet', 'The Knoll crew\'s tally', 90, 'Forty-one strokes in chalk on an oxblood rag. Saul Rudd kept it folded inside his coat, against his heart, like a letter from home.'),
    tally('breakneck', 'The Breakneck tally', 120, 'Strokes cut into the rag with a knife rather than chalked. Some of them are deer, and someone has scratched an antler beside each.'),
    tally('blackwater', 'The Blackwater tally', 140, 'Every stroke is a ship, not a cart. Under the last of them Bettany Crane has written a name and crossed it out.'),
    tally('reddog', 'The Red Dog tally', 170, 'The strokes are claims, not carts: forty-odd seams in the Red Downs that the Company paid for and the Red Dog jumpers dug first.'),
    tally('eyrie', 'The Eyrie tally', 110, 'Short strokes, close together. Matty Gaunt marked the cliff-path robberies small, so the rag would last.'),
    tally('stilts', 'The Stilt Fort tally', 150, 'Waxed against the wet. Agnes Mardle\'s gang took eel traps, not carts, and counted every one.'),
    tally('carrack', 'The Carrack tally', 240, 'Two rags sewn together; one ran out. Kit Pascoe\'s tinners have robbed the moor carts since before the Charter paved anything.'),
  ],
};
