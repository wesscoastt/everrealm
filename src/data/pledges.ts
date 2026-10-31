import { utcDay } from './calendar';
import { DUNGEONS, type DungeonDef } from './dungeons';
import { ITEMS } from './items';
import type { GameApi } from '../game/api';
import { SHOPS } from './shops';
import { TROPHY_IDS, TROPHY_PRICE, TROPHY_SETS } from './trophies';
import { partnerPrice, TOWN_STAKES } from './stakes';

// THE LAMP COMPANY: Hesk Dunmore's delvers (the henchmen's own crew), who go down where other people
// won't, for a day's rate and a story. In the manner of ESO's Undaunted: every day the Company posts
// one pledge, a dungeon to clear (Thomasina Penhale at Ansbury's south gate; Xisca Mir by the Callis post,
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
    stock: [{ item: 'pack_delver', price: 8 }, { item: 'pack_haversack', price: 30 }, ...pieces.map((id) => ({ item: id, price: ITEMS[id].weapon ? 5 : ITEMS[id].armor?.slot === 'chest' || ITEMS[id].armor?.slot === 'legs' ? 4 : 3 })),
      // The trophy sets' shoulders (data/trophies.ts): the helms only come off the bosses, on veteran
      ...TROPHY_IDS.filter((t) => TROPHY_SETS[t].dungeon).map((t) => ({ item: `trophy_${t}_shoulders`, price: TROPHY_PRICE.lampShoulders }))],
    buyRate: () => 0,
    footer: () => 'Priced in Lamp keys: the Company\'s pledges pay them, and so does the day\'s first random dungeon',
  };
}

// Annot Crowle's stock at the Endless Tower (content/tower.ts), priced in tower tokens: the tower's own
// trophy sets (data/trophies.ts), each shown once you've climbed far enough
SHOPS.tower_crowle = {
  id: 'tower_crowle', name: 'The Endless Tower', owner: 'tower_crowle', currency: 'tower_token',
  stock: TROPHY_IDS.filter((t) => TROPHY_SETS[t].floor).flatMap((t) => (['helm', 'shoulders'] as const).map((p) => ({
    item: `trophy_${t}_${p}`, price: TROPHY_PRICE.tower[t] ?? 60, when: (g: GameApi) => g.towerBest() >= TROPHY_SETS[t].floor!,
  }))),
  buyRate: () => 0,
  footer: (g) => g.towerBest() >= 40 ? 'Priced in tower tokens. Every floor pays them, the first time more.' : `Priced in tower tokens. More for one who has cleared floor ${g.towerBest() >= 20 ? 40 : 20}.`,
};

// A partner pays the family price at the town trades they've bought into (data/stakes.ts TOWN_STAKES)
for (const t of TOWN_STAKES) {
  const shop = SHOPS[t.shop];
  if (!shop) continue;
  const own = shop.priceMult;
  shop.priceMult = (g) => (own?.(g) ?? 1) * partnerPrice(g.flag('stake:' + t.npc));
}
