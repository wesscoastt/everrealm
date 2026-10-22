// Named pieces, on the world server: each exists in the realm only a few times (src/data/gear.ts).
//
// When one drops in a player's game, the game asks for it (uClaim). While any are left, the realm
// gives it the next number, notes who found it, and tells everyone; when they're all out, that
// piece doesn't drop any more. Numbers are never given twice, so a piece's number is its own for
// good, whoever trades it on.
//
// (As elsewhere, the browser is the authority for its own pack: this keeps the count honest
// between players. A claim is only taken once a minute from any one player.)

import path from 'node:path';

/** How many of each the realm holds, and its name for the announcement. Kept in step with NAMED_ITEMS (npm run gear checks). */
export const NAMED = {
  u_dancey_billhook: [5, 'Hob Dancey\'s billhook'],
  u_clinker_tusk: [5, 'The Clinker tusk'],
  u_rime_knife: [5, 'The Rime Bowl knife'],
  u_pilot_oilskin: [5, 'The pilot\'s oilskin'],
  u_tallow_knife: [3, 'Tallow Jack\'s knife'],
  u_marys_tooth: [2, 'Big Mary\'s tooth'],
  u_climmer_crook: [3, 'The climmer\'s crook'],
  u_houndcatcher_hanger: [3, 'The hound-catcher\'s hanger'],
  u_brindle_boots: [3, 'Brindle-hide boots'],
  u_reaper_mitts: [3, 'The reapers\' mitts'],
  u_mosscap_cowl: [3, 'Mosscap\'s cowl'],
  u_barnacle_coat: [3, 'The barnacle coat'],
  u_whiteface_ruff: [3, 'Whiteface\'s ruff'],
  u_mudgut_waders: [3, 'Mudgut waders'],
  u_queen_gauntlets: [4, 'The Rust Queen\'s gauntlets'],
  u_sexton_helm: [4, 'The sexton\'s glass helm'],
  u_verdigris_greaves: [5, 'Verdigris greaves'],
  u_kettle_light: [5, 'The Kettle light'],
};
const GAP_MS = 60_000;

export function uniquesInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log } = ctx;
  const FILE = path.join(dataDir, 'uniques.json');
  /** id -> the copies given out so far: [{ n, name, at }] */
  const book = { ...(readJson(FILE) ?? {}) };
  log(`named pieces: ${Object.values(book).reduce((s, l) => s + l.length, 0)} found so far`);
  const lastClaim = new Map();
  const ledger = () => Object.fromEntries(Object.entries(NAMED).map(([id, [cap]]) => [id, { cap, found: (book[id] ?? []).map((c) => ({ n: c.n, name: c.name })) }]));

  return {
    handle(p, msg) {
      switch (msg.t) {
        case 'uClaim': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const row = NAMED[id];
          if (!row) return true;
          const now = Date.now();
          if (now - (lastClaim.get(p.key) ?? 0) < GAP_MS) { send(p.ws, { t: 'uGrant', id, ok: false }); return true; }
          lastClaim.set(p.key, now);
          const list = (book[id] ??= []);
          if (list.length >= row[0]) { send(p.ws, { t: 'uGrant', id, ok: false, gone: true }); return true; }
          const n = list.length + 1;
          list.push({ n, name: p.name, key: p.key, at: now });
          writeJson(FILE, book);
          log(`named: ${p.name} found ${id} No. ${n} of ${row[0]}`);
          send(p.ws, { t: 'uGrant', id, ok: true, n, cap: row[0], first: list[0].name });
          for (const q of players.values()) if (q !== p) send(q.ws, { t: 'sys', text: `${p.name} has found ${row[1]}, No. ${n} of the ${row[0]} in the realm.` });
          return true;
        }
        case 'uLedger': send(p.ws, { t: 'uLedger', ledger: ledger() }); return true;
      }
      return false;
    },
  };
}
