// The realm's clock. Everyone online shares one time of day: the hour comes from the realm
// server's clock (handed over when you connect), not from how long you've been playing, so dawn
// breaks for the whole server at once. Offline, this browser's clock stands in.
//
// A day lasts 24 real minutes: one game hour to the real minute.

export const DAY_MINUTES = 24;

/** Server time minus this browser's time, in ms (0 until the server has said). */
let skew = 0;

export function setRealmTime(serverMs: number): void {
  if (Number.isFinite(serverMs)) skew = serverMs - Date.now();
}

/** Milliseconds on the realm's clock. */
export function realmNow(): number { return Date.now() + skew; }

/** The hour of the day on the realm's clock, 0 up to 24. */
export function realmHour(now = realmNow()): number {
  const minutes = now / 60_000;
  return ((minutes % DAY_MINUTES) / DAY_MINUTES) * 24;
}
