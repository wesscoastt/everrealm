import { SHOPS } from '../src/data/shops';
import { DIALOGUE } from '../src/data/dialogue';
import '../src/data/pledges';
import { TOWN_STAKES } from '../src/data/stakes';
for (const t of TOWN_STAKES) { const sh = SHOPS[t.shop]; const tree = DIALOGUE[t.npc]; console.log(t.npc, 'owner', sh?.owner, 'tree', !!tree, 'stake node', !!tree?.nodes.ts_stake, 'opts', tree?.nodes[t.node]?.options?.length); }
