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
//   { t: 'hOffer', id, to, price } offer the home you hold to another player in the world, for so many marks
//   { t: 'hAccept', id }           take up an offer made to you: the home is yours, and the seller is paid
//   { t: 'hDecline', id }          turn an offer down
// Server to client:
//   { t: 'homes', list, mine, lapsed }   on coming in: every home held ({ id: { owner, spec, blocks } }), the
//                                        id of yours, and the id of one that lapsed while you were away
//   { t: 'home', id, home }              one changed hands or was built on (home null: back on sale)
//   { t: 'hClaimed', id, ok, why? }      the answer to a claim
//   { t: 'hOffered', id, from, price }   someone offers you their home
//   { t: 'hOfferAns', ok, to, why? }     your offer reached them (ok), or didn't, or was turned down
//   { t: 'hBought', id, ok, price, from, why? } your purchase from a player went through, or why not
//   { t: 'hSold', id, price, to }        the player you offered your home to bought it: their marks are yours
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
  /** id -> an offer standing: { from (key), fromName, to (key), price, at }; ten minutes to take it up */
  const offers = new Map();
  const OFFER_MS = 10 * 60_000;
  const playerByKey = (key) => [...players.values()].find((q) => q.key === key) ?? null;
  const pub = (h) => (h ? { owner: h.owner, spec: h.spec ?? null, blocks: h.blocks ?? [], stall: !!h.stall, ...(h.granted ? { granted: true } : {}) } : null);
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
    /**
     * The keeper gives a home to a character (owner 2026-11-12: "assign this home to the Billie Eyelash account"):
     * any home of theirs goes back on sale, this one is theirs, and if they're in the world they're told at once
     * (their game takes it up as a home leased on another device). Returns why not, or null.
     */
    grant(key, name, id) {
      if (!ID.test(id)) return 'no such home';
      const h = homes[id];
      if (h && h.key !== key) return `${id} is held by ${h.owner}`;
      const had = mineOf(key);
      if (had && had !== id) { delete homes[had]; tell(had); }
      const now = Date.now();
      // (granted: the holder's own game takes it up over whatever home its save had, rather than handing it back)
      homes[id] = { key, owner: name, spec: h?.spec ?? null, blocks: h?.blocks ?? [], since: now, seen: now, granted: true };
      store();
      tell(id);
      log(`homes: ${name} given ${id}`);
      const q = [...players.values()].find((x) => x.key === key);
      if (q) this.join(q);
      return null;
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
        case 'hOffer': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const price = Math.floor(Number(msg.price));
          if (homes[id]?.key !== p.key || !Number.isFinite(price) || price < 1 || price > 10_000_000) return true;
          const name = String(msg.to ?? '').trim().toLowerCase();
          const q = [...players.values()].find((x) => x.name?.toLowerCase() === name && x.key !== p.key);
          if (!q) { send(p.ws, { t: 'hOfferAns', ok: false, why: 'away', to: String(msg.to ?? '') }); return true; }
          if (mineOf(q.key)) { send(p.ws, { t: 'hOfferAns', ok: false, why: 'hasHome', to: q.name }); return true; }
          offers.set(id, { from: p.key, fromName: p.name, to: q.key, price, at: Date.now() });
          send(q.ws, { t: 'hOffered', id, from: p.name, price });
          send(p.ws, { t: 'hOfferAns', ok: true, to: q.name });
          return true;
        }
        case 'hAccept': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const o = offers.get(id);
          const no = (why) => send(p.ws, { t: 'hBought', id, ok: false, why });
          if (!o || o.to !== p.key || Date.now() - o.at > OFFER_MS) { offers.delete(id); no('gone'); return true; }
          const seller = playerByKey(o.from);
          if (!seller) { no('sellerAway'); return true; }
          if (homes[id]?.key !== o.from) { offers.delete(id); no('gone'); return true; }
          if (mineOf(p.key)) { no('hasHome'); return true; }
          const now = Date.now();
          homes[id] = { ...homes[id], key: p.key, owner: p.name, since: now, seen: now, stall: false };
          offers.delete(id);
          store();
          onVacate?.(o.from, id);
          log('homes: ' + o.fromName + ' sold ' + id + ' to ' + p.name + ' for ' + o.price);
          send(p.ws, { t: 'hBought', id, ok: true, price: o.price, from: o.fromName });
          send(seller.ws, { t: 'hSold', id, price: o.price, to: p.name });
          tell(id);
          return true;
        }
        case 'hDecline': {
          const id = typeof msg.id === 'string' ? msg.id : '';
          const o = offers.get(id);
          if (!o || o.to !== p.key) return true;
          offers.delete(id);
          const seller = playerByKey(o.from);
          if (seller) send(seller.ws, { t: 'hOfferAns', ok: false, why: 'declined', to: p.name });
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
