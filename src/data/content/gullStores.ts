import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// The four stores at the ends of Gullmouth's quay (world/sites.ts gullmouthTown): the salt store and the
// rope loft north of the jetties, the wine store and the wool store south. Each has a keeper at a tally
// desk inside the door, who counts what comes off the boats and what goes up the road to Ansbury.

type Look = NpcDef['look'];
const look = (o: Record<string, unknown>) => ({ eyes: '#4a3a2a', trousers: '#2a2a30', boots: '#1a1612', hairStyle: 1, age: 0.45, ...o }) as Look;
// A keeper stands behind the tally desk inside the door, looking out at it
const at = (wx: number, wz: number, south: boolean): Pick<NpcDef['schedule'][number], 'at' | 'face'> => south
  ? { at: [wx + 3.5, wz + 4.3], face: [wx + 3.5, wz + 8] }
  : { at: [wx + 3.5, wz + 3.7], face: [wx + 3.5, wz] };
const C = 1784, Z = 600;

const npcs: NpcDef[] = [
  {
    id: 'gs_lowdy', name: 'Lowdy Odgers', title: 'Keeps the salt store',
    look: look({ skin: '#d8a888', hair: '#8a6a4a', hairStyle: 2, lashes: true, tunic: '#5a6a7a', trim: '#c8c0b0', age: 0.55, apron: true }),
    schedule: [{ from: 0, to: 24, ...at(C - 26, Z - 38, true), anim: 'idle' }],
    barks: ['Salt first, then the fish. Never the other way.', 'Mind the boxes. They\'re older than you.'],
  },
  {
    id: 'gs_walter', name: 'Walter Grenfell', title: 'Keeps the rope loft',
    look: look({ skin: '#c89070', hair: '#5a5a5a', tunic: '#6a5a3a', trim: '#3a2a1a', age: 0.7, beard: true }),
    schedule: [{ from: 0, to: 24, ...at(C - 14, Z - 38, true), anim: 'idle' }],
    barks: ['Hemp from the ropewalk, tar from Kell.', 'Don\'t pull on that. It pulls back.'],
  },
  {
    id: 'gs_ann', name: 'Ann Bennetts', title: 'Keeps the wine store',
    look: look({ skin: '#e2b894', hair: '#2a1e14', hairStyle: 3, lashes: true, tunic: '#6a2a34', trim: '#c8a050', age: 0.4 }),
    schedule: [{ from: 0, to: 24, ...at(C - 26, Z + 28, false), anim: 'idle' }],
    barks: ['Cala Roja red. Don\'t ask the price.', 'Every cask is counted twice. Once by me.'],
  },
  {
    id: 'gs_peter', name: 'Peter Hosking', title: 'Keeps the wool store',
    look: look({ skin: '#d0a080', hair: '#a87a4a', tunic: '#8a7a5a', trim: '#4a3a2a', age: 0.35, hat: 'cap', hatColor: '#4a4a3a' }),
    schedule: [{ from: 0, to: 24, ...at(C - 14, Z + 28, false), anim: 'idle' }],
    barks: ['Fleeces in, cloth out. That\'s the whole trade.', 'If you sneeze in here, sneeze outside.'],
  },
];

const lowdy: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Lowdy Odgers. The salt store. Everything that comes up the quay with fins on it comes through here, and goes out of here in salt.',
      options: [
        { text: 'Who buys salt fish?', next: 'who' },
        { text: 'Nothing, thanks.' },
      ],
    },
    who: {
      text: 'The garrison up the hill. Every ship that sails south. Ansbury, by the cartload, every Lent. The Speaker\'s table, though they\'d never say. Fish keeps. People don\'t think about that until they\'re hungry in February.',
      options: [{ text: 'I\'ll leave you to it.' }],
    },
  },
};

const walter: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Walter Grenfell. Forty years in this loft. The rope comes down from Rook\'s ropewalk in coils, I hang it till the tar\'s gone off, and then the ships take it away again.',
      options: [
        { text: 'Why hang it?', next: 'why' },
        { text: 'Nothing, thanks.' },
      ],
    },
    why: {
      text: 'Fresh tar is soft. Soft rope stretches, and a stretched sheet lets the sail go just when you want it to hold. A month on the beams and it sets. Captains who won\'t wait the month don\'t come back for the second lot.',
      options: [{ text: 'Good to know.' }],
    },
  },
};

const ann: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Ann Bennetts, wine store. Cala Roja red, mostly, and a white from the Bright Coast the Counting House won\'t let me sell under three marks a bottle.',
      options: [
        { text: 'Why won\'t they?', next: 'why' },
        { text: 'Nothing, thanks.' },
      ],
    },
    why: {
      text: 'Because if I sold it for what it\'s worth here, nobody in Ansbury would pay what they charge for it there. So it sits in my racks getting better, and I write it down every week as unsold.',
      options: [{ text: 'That seems a waste.' }],
    },
  },
};

const peter: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Peter Hosking. The wool store. Fleeces off the Scarth fells and the Turnpike farms, bundled here and shipped to the mills down the coast.',
      options: [
        { text: 'Why not spin it here?', next: 'why' },
        { text: 'Nothing, thanks.' },
      ],
    },
    why: {
      text: 'Ask the mills. They pay for fleeces and sell back cloth, and they own the ships both ways. My father tried a loom in the loft once. He sold one bolt and somebody burnt it.',
      options: [{ text: 'The loom or the bolt?' , next: 'burnt' }],
    },
    burnt: {
      text: 'Both. He went back to counting fleeces.',
      options: [{ text: 'I see.' }],
    },
  },
};

export const GULL_STORES_CONTENT: RegionContent = { id: 'gullStores', npcs, dialogue: { gs_lowdy: lowdy, gs_walter: walter, gs_ann: ann, gs_peter: peter } };
