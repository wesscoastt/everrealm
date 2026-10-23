import { utcDay } from './calendar';
import { DUNGEONS, type DungeonDef } from './dungeons';
import { ITEMS } from './items';
import { SHOPS } from './shops';

// THE LAMP COMPANY: Hesk Dunmore's delvers (the henchmen's own crew), who go down where other people
// won't, for a day's rate and a story. In the manner of ESO's Undaunted: every day the Company posts
// one pledge, a dungeon to clear (Ruth Penhale at Ansbury's south gate; Xisca Mir by the Callis post,
// in Morrow). Clear it and go back to them for Lamp keys, twice as many on veteran. The day's first
// random dungeon from the Group Finder pays a bonus on top, and a key. Keys buy any piece of any
// dungeon's set from the Company, so a run that never drops the piece you want still gets you there.
// The run side is game/Dungeons.ts; the givers are in data/content/pledges.ts.

export const LAMP_KEY = 'lamp_key';
/** Keys for a pledge cleared, on normal and on veteran. */
export const PLEDGE_KEYS = { normal: 2, vet: 4 };
/** The day's first random dungeon: a key, marks, and experience worth this many of its creatures. */
export const RANDOM_BONUS = { keys: 1, marks: 150, kills: 60 };

/** Today's pledge on this land: the dungeons take it in turns, a new one at midnight (UTC). */
export function pledgeToday(day = utcDay()): DungeonDef | null {
  return DUNGEONS.length ? DUNGEONS[day % DUNGEONS.length] : null;
}

export interface PledgeState { day: number; id: string; done: boolean; vet: boolean; paid: boolean }

// The Company's stock: every piece every dungeon's bosses drop, bought with keys
const pieces = [...new Set(DUNGEONS.flatMap((d) => d.bosses.flatMap((b) => b.drops)))].filter((id) => ITEMS[id]?.armor || ITEMS[id]?.weapon);
for (const owner of ['ruth_penhale', 'xisca_mir']) {
  SHOPS[owner] = {
    id: owner, name: 'The Lamp Company', owner, currency: LAMP_KEY,
    stock: pieces.map((id) => ({ item: id, price: ITEMS[id].weapon ? 5 : ITEMS[id].armor?.slot === 'chest' || ITEMS[id].armor?.slot === 'legs' ? 4 : 3 })),
    buyRate: () => 0,
    footer: () => 'Priced in Lamp keys: the Company\'s pledges pay them, and so does the day\'s first random dungeon',
  };
}
