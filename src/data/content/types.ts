import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestSpawn, WorldThing } from '../places_regional';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';

// Side content is written region by region, one module per region (src/data/content/<region>.ts).
// Each module only declares data; the base files (items, npcs, dialogue, quests, places, shops)
// merge every module in. Content modules import types only, so the merge has no import cycles.

export interface Readable {
  title: string;
  body: string | ((g: GameApi) => string);
  effect?: (g: GameApi) => void;
}

/** A job pinned to a notice board. Taking it starts the quest at `stage`. */
export interface Posting {
  quest: string;
  stage: string;
  /** Short heading shown in the list, as written on the paper. */
  title: string;
  /** The notice in full, in the voice of whoever pinned it up. */
  text: string;
  when?: (g: GameApi) => boolean;
}

export interface Board {
  id: string;
  name: string;
  x: number;
  z: number;
  y?: number;
  /** Attach to an existing authored interactable of this kind instead of adding a new one. */
  interactable?: string;
  /** Notices that aren't jobs: shown above the list. */
  header?: (g: GameApi) => string;
  postings: Posting[];
}

export interface RegionContent {
  id: string;
  items?: ItemDef[];
  npcs?: NpcDef[];
  dialogue?: Record<string, DialogueTree>;
  quests?: Record<string, QuestDef>;
  readables?: Record<string, Readable>;
  things?: WorldThing[];
  spawns?: QuestSpawn[];
  shops?: Record<string, ShopDef>;
  boards?: Board[];
  /** Additions to existing people's conversations (new options, new opening lines). */
  hooks?: (D: Record<string, DialogueTree>) => void;
}
