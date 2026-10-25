import type { DOption } from '../../game/api';
import { OPPONENTS } from '../cards';
import { addOption } from './kit';
import type { RegionContent } from './types';

// Quarters at the tables (data/cards.ts OPPONENTS): everyone who plays has "a game of Quarters?" among
// what you can say to them. Where their talk has a greeting with answers, it goes there; a taproom
// regular's few lines end with nothing to answer, so the game and a goodbye go on the end of them.

export const QUARTERS_CONTENT: RegionContent = {
  id: 'quarters',
  hooks: (D) => {
    for (const o of OPPONENTS) {
      const t = D[o.npc];
      if (!t) continue;
      const play: DOption = { text: 'A game of Quarters?', effect: (g) => g.playQuarters(o.npc) };
      const greeting = ['main', 'hello', 'a'].find((k) => t.nodes[k]?.options?.length);
      if (greeting) { addOption(D, o.npc, greeting, play); continue; }
      for (const [k, n] of Object.entries(t.nodes)) if (!n.options && !n.next && (/^l\d+$/.test(k) || k === 'bIdle')) n.options = [play, { text: 'Bye.' }];
    }
  },
};
