// The Outlaw Fortnight (owner 2026-11-22: "add an event themed around GTA 6 and its characters / cartoons", all our
// own): two weeks a year when Ruby Garret and Hob Calloway, lovers and highway robbers, work the Charter's coach road
// between the Waystation and Fellers' Camp, the broadsheets print cartoons of them, and you ride with them or hunt
// them (data/content/outlawFortnight.ts). It runs beside the fairs (data/festivals.ts), not instead of one.

/** Month and day it opens and closes (inclusive, UTC). */
export const OUTLAW_DATES = { from: [11, 21] as [number, number], to: [12, 8] as [number, number] };

const doy = (m: number, d: number) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1] + d;

/** Is the Outlaw Fortnight on? ?outlaws in the address forces it (for testing). */
export function outlawsOn(now = Date.now()): boolean {
  try { if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('outlaws')) return true; } catch { /* tools */ }
  const t = new Date(now), day = doy(t.getUTCMonth() + 1, t.getUTCDate());
  return day >= doy(...OUTLAW_DATES.from) && day <= doy(...OUTLAW_DATES.to);
}

/** The day of the Fortnight it is (1 on the first), for the broadsheets; 0 when it isn't on. */
export function outlawDay(now = Date.now()): number {
  if (!outlawsOn(now)) return 0;
  const t = new Date(now);
  return Math.max(1, doy(t.getUTCMonth() + 1, t.getUTCDate()) - doy(...OUTLAW_DATES.from) + 1);
}
