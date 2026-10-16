import { CR_CITY } from './crownroad/city';
import { CR_COTTERS } from './crownroad/cotters';
import { CR_GATE } from './crownroad/gate';
import { CR_PEOPLE } from './crownroad/people';
import { CR_ROAD } from './crownroad/road';
import type { RegionContent } from './types';

// Turnpike side content: people in ./crownroad/people.ts, quests by area in the other files.
const parts: RegionContent[] = [CR_CITY, CR_GATE, CR_COTTERS, CR_ROAD];

export const CROWNROAD: RegionContent = {
  id: 'crownroad',
  npcs: CR_PEOPLE,
  items: parts.flatMap((p) => p.items ?? []),
  dialogue: Object.assign({}, ...parts.map((p) => p.dialogue ?? {})),
  quests: Object.assign({}, ...parts.map((p) => p.quests ?? {})),
  readables: Object.assign({}, ...parts.map((p) => p.readables ?? {})),
  things: parts.flatMap((p) => p.things ?? []),
  spawns: parts.flatMap((p) => p.spawns ?? []),
  boards: parts.flatMap((p) => p.boards ?? []),
  hooks: (D) => { for (const p of parts) p.hooks?.(D); },
};
