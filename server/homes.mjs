// The Charter's book of homes, on the world server: who holds each building lot and Wendside Cottage,
// the realm over (src/data/housing.ts). One holder to a home and one home to a character. What stands
// on a lot (the plans the builders worked to, and the blocks its holder has laid themselves) goes to
// everyone, so everyone sees the house that was built, and only its holder and their guests go in.
//
// A lease its holder hasn't come back to for three months goes back on sale: the book forgets them,
// and tells them so the next time they come in.
//
// Socket messages, client to server:
//   { t: 'hClaim', id, spec? }     lease a free home, or take back your own (spec: plans already built to)
//   { t: 'hRelease', id }          give it up
//   { t: 'hSpec', id, spec }       built, or rebuilt, to these plans
//   { t: 'hBlocks', id, blocks }   the blocks laid on the lot by hand: [x, y, z, block] from its corner
//   { t: 'hStall', id, open }      put up a stall at the lot's gate, or take it down (its stock: server/exchange.mjs)
// Server to client:
//   { t: 'homes', list, mine, lapsed }   on coming in: every home held ({ id: { owner, spec, blocks } }), the
//                                        id of yours, and the id of one that lapsed while you were away
//   { t: 'home', id, home }              one changed hands or was built on (home null: back on sale)
//   { t: 'hClaimed', id, ok, why? }      the answer to a claim
//
// (As elsewhere the browser keeps its own purse: the book keeps the holders honest between players.)

import path from 'node:path';

/** Three months without coming in, and the lease lapses. */
const LAPSE_MS = 90 * 864e5;
const ID = /^(cottage|[a-z]{1,3}\d{1,2})$/;
const WORD = /^[a-z]{2,12}$/;
/** The lot's box for hand-laid blocks, from its corner: its width and depth, and how far below and above its floor. */
const BOX = { w: 15, d: 13, lo: -3, hi: 24 };
const MAX_BLOCKS = 2400;

/** Plans as the client sends them, kept to the shape it reads (data/housing.ts readPlot). */
function cleanSpec(s) {
  if (!s || typeof s !== 'object') return null;
  if (!['cottage', 'house', 'hall'].includes(s.size) || ![1, 2].includes(s.floors) || !WORD.test(s.wall) || !WORD.test(s.roof)) return null;
  const out = { size: s.size, floors: s.floors, wall: s.wall, roof: s.roof };
  if (WORD.test(s.front)) out.front = s.front;
  if (Array.isArray(s.trim)) out.trim = s.trim.filter((t) => WORD.test(t)).slice(0, 4);
  return out;
}

/** Hand-laid blocks: whole numbers inside the lot's box, at most MAX_BLOCKS, one to a cell. */
function cleanBlocks(b) {
  if (!Array.isArray(b)) return null;
  const seen = new Set(), out = [];
  for (const c of b.slice(0, MAX_BLOCKS)) {
    if (!Array.isArray(c) || c.length !== 4 || !c.every(Number.isInteger)) continue;
    const [x, y, z, id] = c;
    if (x < 0 || x >= BOX.w || z < 0 || z >= BOX.d || y < BOX.lo || y > BOX.hi || id < 0 || id > 255) continue;
    const k = x + ',' + y + ',' + z;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push([x, y, z, id]);
  }
  return out;
}

export function homesInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log, onVacate } = ctx;
  const FILE = path.join(dataDir, 'homes.json');
  const saved = readJson(FILE) ?? {};
  /** id -> { key, owner, spec, blocks, since, seen } */
  const homes = saved.homes ?? {};
  /** character key -> { id, at }: a lease that lapsed while they were away, to tell them about */
  const lapsed = saved.lapsed ?? {};
  const store = () => writeJson(FILE, { homes, lapsed });
  const pub = (h) => (h ? { owner: h.owner, spec: h.spec ?? null, blocks: h.blocks ?? [], stall: !!h.stall } : null);
  const mineOf = (key) => Object.keys(homes).find((id) => homes[id].key === key) ?? null;
  const tell = (id) => { const msg = { t: 'home', id, home: pub(homes[id]) }; for (const q of players.values()) send(q.ws, msg); };

  /** Leases nobody has come back to in three months go back on sale. */
  function lapse() {
    const now = Date.now();
    let n = 0;
    for (const [id, h] of Object.entries(homes)) {
      if (now - (h.seen ?? h.since ?? now) < LAPSE_MS) continue;
      if ([...players.values()].some((p) => p.key === h.key)) { h.seen = now; continue; }
      lapsed[h.key] = { id, at: now };
      delete homes[id];
      onVacate?.(h.key, id);
      log(`homes: ${h.owner}'s lease on ${id} lapsed`);
      tell(id);
      n++;
    }
    if (n) store();
  }
  // (the first look once the rest of the realm is up: a lapsed lot's stall stock goes home through the Exchange)
  setTimeout(lapse, 1000);
  setInterval(lapse, 3600_000);
  // Holders in the world are coming back: their leases are seen, every half hour
  setInterval(() => {
    let n = 0;
    for (const p of players.values()) { const id = mineOf(p.key); if (id) { homes[id].seen = Date.now(); n++; } }
    if (n) store();
  }, 1800_000);
  log(`homes: ${Object.keys(homes).length} held`);

  return {
    /** Which home a character holds (a lot's id, or 'cottage'), or null. */
    mineOf,
    /** On coming in: the whole book, which is theirs, and any lease that lapsed while they were away. */
    join(p) {
      const mine = mineOf(p.key);
      if (mine) { homes[mine].seen = Date.now(); homes[mine].owner = p.name; store(); }
      const gone = lapsed[p.key] ?? null;
      if (gone) { delete lapsed[p.key]; store(); }
      send(p.ws, { t: 'homes', list: Object.fromEntries(Object.entries(homes).map(([id, h]) => [id, pub(h)])), mine, lapsed: gone?.id ?? null });
    },
    /** A character deleted: their home goes back on sale. */
    forget(key) {
      const id = mineOf(key);
      if (id) { delete homes[id]; store(); tell(id); onVacate?.(key, id); }
      if (lapsed[key]) { delete lapsed[key]; store(); }
    },
    handle(p, msg) {
      switch (msg.t) {
        case 'hClaim': {
          const id = typeof msg.id === 'string' && ID.test(msg.id) ? msg.id : null;
          if (!id) return true;
          const h = homes[id], mine = mineOf(p.key);
          if (h && h.key !== p.key) { send(p.ws, { t: 'hClaimed', id, ok: false, why: 'taken', owner: h.owner }); return true; }
          if (mine && mine !== id) { send(p.ws, { t: 'hClaimed', id, ok: false, why: 'one', mine }); return true; }
          if (Object.keys(homes).length >= 600 && !h) { send(p.ws, { t: 'hClaimed', id, ok: false, why: 'full' }); return true; }
          const now = Date.now();
          homes[id] = { key: p.key, owner: p.name, spec: cleanSpec(msg.spec) ?? h?.spec ?? null, blocks: h?.blocks ?? cleanBlocks(msg.blocks) ?? [], since: h?.since ?? now, seen: now };
          store();
          if (!h) log(`homes: ${p.name} holds ${id}`);
          send(p.ws, { t: 'hClaimed', id, ok: true });
          tell(id);
          return true;
        }
        case 'hRelease': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          if (homes[id]?.key !== p.key) return true;
          delete homes[id];
          store();
          onVacate?.(p.key, id);
          log(`homes: ${p.name} gave up ${id}`);
          tell(id);
          return true;
        }
        case 'hSpec': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const h = homes[id], spec = cleanSpec(msg.spec);
          if (h?.key !== p.key || !spec) return true;
          h.spec = spec;
          h.seen = Date.now();
          store();
          tell(id);
          return true;
        }
        case 'hStall': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const h = homes[id];
          if (h?.key !== p.key) return true;
          h.stall = !!msg.open;
          if (!h.stall) onVacate?.(p.key, id);
          store();
          tell(id);
          return true;
        }
        case 'hBlocks': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const h = homes[id], blocks = cleanBlocks(msg.blocks);
          // (the cottage and the Mirador's houses stand as built: blocks are laid only on a lot)
          if (h?.key !== p.key || !blocks || id === 'cottage' || id.startsWith('hv')) return true;
          h.blocks = blocks;
          h.seen = Date.now();
          store();
          tell(id);
          return true;
        }
      }
      return false;
    },
  };
}
