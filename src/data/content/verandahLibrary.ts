import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Verandah's library, done over (owner 2026-11-06: "Verandah library interior needs to be redone"). The owner's
// building on the high street, its bookcases kept: the counter on the face of the middle stack with Cador Penhale
// behind it, reading desks at either end of the south aisle with chairs, candles and a rug between them, a
// lectern in the north aisle with the town's great book open on it, and three of the island's own books on the
// shelves to read (data/lorebooks.ts). The furniture is world/sites.ts 'ver-library'.

/** What's set out in the library (game x, floor y 23, z). */
export const LIBRARY_PROPS: { item: string; x: number; z: number; ry: number }[] = [
  // the west reading desk and its chairs
  { item: 'table', x: -2950.5, z: 2111.5, ry: 0 }, { item: 'chair', x: -2950.5, z: 2112.5, ry: Math.PI }, { item: 'chair', x: -2951.5, z: 2111.5, ry: Math.PI / 2 }, { item: 'candles', x: -2950.5, z: 2111.5, ry: 0 },
  // the east reading desk
  { item: 'table', x: -2939.5, z: 2111.5, ry: 0 }, { item: 'chair', x: -2939.5, z: 2112.5, ry: Math.PI }, { item: 'chair', x: -2938.5, z: 2111.5, ry: -Math.PI / 2 }, { item: 'candles', x: -2939.5, z: 2111.5, ry: 0 },
  // the rug down the south aisle, and the lectern in the north
  { item: 'rug', x: -2947.5, z: 2111.5, ry: 0 }, { item: 'rug', x: -2942.5, z: 2111.5, ry: 0 },
  { item: 'desk', x: -2945.5, z: 2104.5, ry: Math.PI },
  { item: 'sp_lamp', x: -2949.5, z: 2104.5, ry: 0 }, { item: 'sp_lamp', x: -2941.5, z: 2104.5, ry: 0 },
];

const npcs: NpcDef[] = [
  { id: 'ver_cador', name: 'Cador Penhale', title: 'Librarian', look: { skin: '#e2b894', hair: '#9a948c', hairStyle: 1, facial: 2, eyes: '#4a5a6a', tunic: '#2a3a2a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'beret', hatColor: '#2a3a2a', age: 0.7 },
    schedule: [{ from: 8, to: 20, at: [-2944.5, 2109.5], face: [-2944.5, 2112.5], anim: 'idle', y: 23 }],
    barks: ['Quietly, please.', 'Books go back where you found them. I know where you found them.'] },
];

const cador: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'The Verandah Library. Every book on the island that isn’t a ship’s log or a debt ledger ends up here, sooner or later. Read what you like. The island’s own are by the desks and on the lectern.',
      options: [
        { text: 'What should I read first?', next: 'first' },
        { text: 'Where did all these books come from?', next: 'from' },
        { text: 'Thank you.' },
      ],
    },
    first: { text: 'The great book on the lectern: the town’s own account of itself, written by whoever was mayor at the time and corrected by whoever came after. Then the harbour book, if you like ships. Then go and see the king and tell him which bits are wrong.', next: 'hello' },
    from: { text: 'Ships. A sailor dies at sea and his sea chest comes ashore here, and there’s always a book in it. Two hundred years of that, and you have a library. The rest the engineers bring me, mostly about boilers.', next: 'hello' },
  },
};

export const VERANDAH_LIBRARY: RegionContent = { id: 'verandahLibrary', npcs, dialogue: { ver_cador: cador } };
