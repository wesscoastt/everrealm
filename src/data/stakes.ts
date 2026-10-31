import { utcDay } from './calendar';

// A stake in a trade (docs/COMPANY_BRIEF.md, part 3), as Skyrim lets you invest in a shop: put marks into
// one of the country businesses (data/businesses.ts) at its keeper and you're a partner. Every real day
// the place does business it puts by your share of the takings, which the keeper hands over when you
// come by; you buy from its shop cheaper; you can put more in later. A stake pays itself back in four
// weeks (PAYBACK_DAYS) and no sooner, and what's put by stops growing after a fortnight unclaimed, so it
// rewards coming back without being a way round the economy (npm run balance checks the payback).
// Kept in the flag "stake:<keeper id>" as { tier, day }: the stake, and the day its share was last paid.

export const STAKE_TIERS = [500, 1500, 4000];
/** Real days for a stake's shares to add up to what it cost. */
export const PAYBACK_DAYS = 28;
/** Unclaimed days put by, at most. */
export const PUT_BY_DAYS = 14;
/** What a partner pays in the shop, by stake. */
export const PARTNER_PRICE = [0.9, 0.85, 0.8];

export interface Stake { tier: number; day: number }

export function stakeOf(flag: unknown): Stake | null {
  return flag && typeof flag === 'object' && typeof (flag as Stake).tier === 'number' ? (flag as Stake) : null;
}

/** The share put by for a stake since it was last paid, in marks. */
export function shareOwed(s: Stake, today = utcDay()): number {
  const days = Math.max(0, Math.min(PUT_BY_DAYS, today - s.day));
  return Math.floor((STAKE_TIERS[s.tier] / PAYBACK_DAYS) * days);
}

/** The town trades you can buy into (data/content/townStakes.ts): the keeper, their shop, the node their
 *  conversation opens on, and how they put it to a would-be partner. */
export const TOWN_STAKES: { npc: string; shop: string; node: string; pitch: string }[] = [
  { npc: 'perrin', shop: 'perrin', node: 'main', pitch: 'A share in the Charter Market stall? The Charter takes its tenth before I see a mark, so you\'d be buying a share of what\'s left.' },
  { npc: 'bett', shop: 'bett', node: 'main', pitch: 'A partner in the chandlery. Rope, tar, sailcloth: Gullmouth always needs all three, and pays late for all of them.' },
  { npc: 'gerens_tonkin', shop: 'gerens_tonkin', node: 'g1', pitch: 'Money for the workshop? Brass costs what it costs, and the Kilnfolk pay in crystal when they pay. I could use a partner who pays in marks.' },
  { npc: 'nan', shop: 'tavern_charterarms', node: 'hello', pitch: 'A stake in the Charter Arms. The beer\'s the best in Ansbury and the roof leaks over the best table.' },
  { npc: 'morwen', shop: 'tavern_coiledrope', node: 'hello', pitch: 'In with the Coiled Rope? Sailors drink well and pay badly, but they drink very well.' },
  { npc: 'loveday_hocking', shop: 'loveday_hocking', node: 'l1', pitch: 'A share in the Lamp & Spanner. The Works drink here when they\'re paid, and on tick when they aren\'t.' },
  { npc: 'pere_coll', shop: 'pere_coll', node: 'e0', pitch: 'A partner in sardines and bread? The bread\'s mine. The sardines are the sea\'s. We split what the Assembly leaves us.' },
  { npc: 'ada_moss', shop: 'ada_moss', node: 'a', pitch: 'Money in the skyfarm hives? The bees don\'t care whose it is, and the honey sells itself, if you can get it down the stair.' },
];

/** A partner's price multiplier at a shop, if the shop's keeper has your stake (a country trade or a town one). */
export function partnerPrice(stakeFlag: unknown): number {
  const s = stakeOf(stakeFlag);
  return s ? PARTNER_PRICE[s.tier] : 1;
}
