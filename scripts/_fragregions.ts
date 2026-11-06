// Scratch: which region drops each dungeon's fragment
import { DUNGEON_KEYS } from '../src/data/keys';
import { DUNGEON_BY_ID } from '../src/data/dungeons';
import { regionAt } from '../src/world/terrain';
for (const k of DUNGEON_KEYS) { const d = DUNGEON_BY_ID[k.dungeon].door; console.log(k.dungeon, k.frag, regionAt(d[0], d[2]).a); }
