import { GW_ASHCROFT } from './greenwake/ashcroft';
import { GW_MOOT } from './greenwake/moot';
import { GW_PEOPLE } from './greenwake/people';
import { GW_VALE } from './greenwake/vale';
import { GW_VILLAGE } from './greenwake/village';
import type { RegionContent } from './types';

// Hollindale side content: people in ./greenwake/people.ts, quests by area in the other files.
const parts: RegionContent[] = [GW_MOOT, GW_ASHCROFT, GW_VILLAGE, GW_VALE];

export const GREENWAKE: RegionContent = {
  id: 'greenwake',
  npcs: GW_PEOPLE,
  items: parts.flatMap((p) => p.items ?? []),
  dialogue: Object.assign({}, ...parts.map((p) => p.dialogue ?? {})),
  quests: Object.assign({}, ...parts.map((p) => p.quests ?? {})),
  readables: Object.assign({}, ...parts.map((p) => p.readables ?? {})),
  things: parts.flatMap((p) => p.things ?? []),
  spawns: parts.flatMap((p) => p.spawns ?? []),
  boards: parts.flatMap((p) => p.boards ?? []),
  hooks: (D) => { for (const p of parts) p.hooks?.(D); },
};
