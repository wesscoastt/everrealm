// The Angling Match, on the world server (owner 2026-11-12: "fishing tournaments that players can compete in"): every
// three hours, for half an hour, the whole realm fishes against itself, any water. Two boards: the heaviest single fish,
// and the biggest bag (every pound landed in the match). The browser sends each fish it lands while a match is on; the
// realm keeps the boards, tells everyone who's fishing how they stand, and at the whistle pays the top three on each
// board and everyone who weighed in. A prize for someone gone from the world waits for them to come back.
//
// Socket messages:
//   client -> { t: 'anglCatch', fish, name, lb }     a fish landed during the match
//   server -> { t: 'anglBoard', match, ends, best: [{ name, lb, fish }], bag: [{ name, lb }], me: { best, bag, rankBest, rankBag } }
//   server -> { t: 'anglPrize', marks, why }          what you won (or got for weighing in)
//   server -> { t: 'anglOver', best, bag }            the whistle: the winners, to everyone

import path from 'node:path';

export const MATCH_EVERY = 3 * 3600_000, MATCH_LENGTH = 30 * 60_000;
const PRIZES = [300, 150, 75], WEIGHED_IN = 20, CATCH_GAP_MS = 3000, LB_MAX = 800;

export function anglingInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log } = ctx;
  const FILE = path.join(dataDir, 'angling.json');
  const saved = readJson(FILE) ?? {};
  /** character key -> [{ marks, why }] owed */
  const owed = saved.owed ?? {};
  const store = () => writeJson(FILE, { owed });
  let match = -1;
  /** key -> { name, best: { lb, fish }, bag } */
  let entries = new Map();
  let boardAt = 0;

  const now = () => Date.now();
  const matchNow = () => { const t = now(); return t % MATCH_EVERY < MATCH_LENGTH ? Math.floor(t / MATCH_EVERY) : -1; };
  const endsOf = (m) => m * MATCH_EVERY + MATCH_LENGTH;
  const top = (by) => [...entries.values()].sort((a, b) => by(b) - by(a)).filter((e) => by(e) > 0);

  function board(to = null) {
    const best = top((e) => e.best.lb), bag = top((e) => e.bag);
    const pub = { t: 'anglBoard', match, ends: endsOf(match), best: best.slice(0, 5).map((e) => ({ name: e.name, lb: e.best.lb, fish: e.best.fish })), bag: bag.slice(0, 5).map((e) => ({ name: e.name, lb: +e.bag.toFixed(2) })) };
    for (const p of to ? [to] : players.values()) {
      if (!p.key || !entries.has(p.key)) continue;
      const e = entries.get(p.key);
      send(p.ws, { ...pub, me: { best: e.best.lb, bag: +e.bag.toFixed(2), rankBest: best.indexOf(e) + 1, rankBag: bag.indexOf(e) + 1 } });
    }
  }

  function pay(key, marks, why) {
    const p = [...players.values()].find((q) => q.key === key);
    if (p) send(p.ws, { t: 'anglPrize', marks, why });
    else { (owed[key] ??= []).push({ marks, why }); store(); }
  }

  /** The whistle: the boards closed, the prizes paid, everyone told. */
  function whistle() {
    if (!entries.size) return;
    const best = top((e) => e.best.lb), bag = top((e) => e.bag);
    const won = new Map();
    best.slice(0, 3).forEach((e, i) => won.set(e.key, [...(won.get(e.key) ?? []), [PRIZES[i], `${['First', 'Second', 'Third'][i]} for the heaviest fish, a ${e.best.lb} lb ${e.best.fish}`]]));
    bag.slice(0, 3).forEach((e, i) => won.set(e.key, [...(won.get(e.key) ?? []), [PRIZES[i], `${['First', 'Second', 'Third'][i]} for the biggest bag, ${e.bag.toFixed(1)} lb`]]));
    for (const e of entries.values()) {
      const w = won.get(e.key) ?? [];
      const marks = WEIGHED_IN + w.reduce((n, [m]) => n + m, 0);
      pay(e.key, marks, w.length ? w.map(([, why]) => why).join('; ') : 'For weighing in');
    }
    const over = { t: 'anglOver', best: best.slice(0, 3).map((e) => ({ name: e.name, lb: e.best.lb, fish: e.best.fish })), bag: bag.slice(0, 3).map((e) => ({ name: e.name, lb: +e.bag.toFixed(2) })) };
    for (const p of players.values()) send(p.ws, over);
    log(`angling: match ${match} over, ${entries.size} weighed in; heaviest ${best[0]?.name} ${best[0]?.best.lb} lb`);
    entries = new Map();
  }

  setInterval(() => {
    const m = matchNow();
    if (m !== match) {
      if (match >= 0) whistle();
      match = m;
    }
  }, 5000);

  return {
    join(p) {
      if (p.key && owed[p.key]?.length) { for (const o of owed[p.key]) send(p.ws, { t: 'anglPrize', ...o }); delete owed[p.key]; store(); }
      if (match >= 0 && p.key && entries.has(p.key)) board(p);
    },
    handle(p, msg) {
      if (msg.t !== 'anglCatch') return false;
      const m = matchNow(), t = now();
      if (m < 0 || m !== match || !p.key) return true;
      if (t - (p.lastAngl ?? 0) < CATCH_GAP_MS) return true;
      const lb = Number(msg.lb), fish = typeof msg.name === 'string' ? msg.name.slice(0, 40) : '';
      if (!Number.isFinite(lb) || lb <= 0 || lb > LB_MAX || !fish) return true;
      p.lastAngl = t;
      const e = entries.get(p.key) ?? { key: p.key, name: p.name, best: { lb: 0, fish: '' }, bag: 0 };
      e.name = p.name;
      e.bag += lb;
      if (lb > e.best.lb) e.best = { lb, fish };
      entries.set(p.key, e);
      // (everyone fishing hears the boards, now and then: the one who just weighed in at once)
      if (t - boardAt > 2000) { boardAt = t; board(); } else board(p);
      return true;
    },
  };
}
