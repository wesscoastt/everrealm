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
