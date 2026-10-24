// The Exchange, on the world server: the realm's auction house. One book, kept here, that every
// broker reads from (the Guildhall in Ansbury, the Merchants' Quarter in Gullmouth, the Company
// office at Harrowgate).
//
// A seller posts a stack at a price; it leaves their pack and sits in the book. Anyone else can buy
// it outright. The buyer pays and takes the stack; the seller's money, less the Exchange's cut of
// one mark in twenty, waits in the book until they next come into the world (straight away if
// they're in it). A seller can take an unsold stack back, and a stack nobody buys in three days
// goes back to its seller by itself. Sellers are characters (by name key), so the book remembers
// them while they're away.
//
// A stall at the gate of someone's lot sells through the same book: its stacks are marked with the
// lot (shop), kept out of the brokers' pages, and seen only at the stall. A stall takes no cut, keeps
// its stock a month, and sends it all home if its holder gives up the lot or the lease lapses.
//
// (As with trades, the browser keeps the inventory: the book keeps every side agreeing on the deal.)

import path from 'node:path';

const ITEM = /^[a-z0-9_]{2,40}$/;
const PER_SELLER = 20;
const BOOK_MAX = 2000;
const LAPSE_MS = 3 * 24 * 3600_000;
const CUT = 0.05;
const SHOP = /^(cottage|[a-z]{1,3}\d{1,2})$/;
const PER_STALL = 24;
const STALL_LAPSE_MS = 30 * 24 * 3600_000;

export function exchangeInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log, homeOf } = ctx;
  const FILE = path.join(dataDir, 'exchange.json');
  /** list: the stacks for sale; owed: character key -> what's waiting for them (takings, stacks back) */
  const book = { next: 1, list: [], owed: {}, ...(readJson(FILE) ?? {}) };
  log(`exchange: ${book.list.length} stack(s) for sale`);
  const store = () => writeJson(FILE, book);
  const sys = (p, text) => send(p.ws, { t: 'sys', text });
  const view = (l) => ({ id: l.id, item: l.item, n: l.n, price: l.price, seller: l.sellerName, at: l.at, shop: l.shop ?? null });

  function settle(p) {
    const rows = book.owed[p.key];
    if (!rows?.length) return;
    delete book.owed[p.key];
    store();
    send(p.ws, { t: 'exOwed', rows });
  }
  function owe(key, row) {
    (book.owed[key] ??= []).push(row);
    const p = [...players.values()].find((q) => q.key === key);
    if (p) settle(p); else store();
  }
  /** Stacks nobody bought in three days (a month, on a stall) go home. */
  function lapse() {
    const now = Date.now(), old = (l) => now - l.at > (l.shop ? STALL_LAPSE_MS : LAPSE_MS);
    const keep = book.list.filter((l) => !old(l));
    if (keep.length === book.list.length) return;
    for (const l of book.list) if (old(l)) owe(l.seller, { kind: 'back', id: l.id, item: l.item, n: l.n, shop: l.shop, at: now });
    book.list = keep;
    store();
  }
  setInterval(lapse, 600_000);

  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

  return {
    join(p) { settle(p); },
    /** A lot given up, or its lease lapsed: everything on its stall goes home. */
    closeStall(key, shop) {
      const now = Date.now(), on = book.list.filter((l) => l.shop === shop && l.seller === key);
      if (!on.length) return;
      book.list = book.list.filter((l) => !on.includes(l));
      for (const l of on) owe(key, { kind: 'back', id: l.id, item: l.item, n: l.n, shop, at: now });
      store();
    },
    handle(p, msg) {
      switch (msg.t) {
        case 'exList': {
          lapse();
          // A stall's page, or the brokers' (which leaves the stalls out)
          const shop = typeof msg.shop === 'string' && SHOP.test(msg.shop) ? msg.shop : null;
          const rows = shop ? book.list.filter((l) => l.shop === shop) : book.list.filter((l) => !l.shop).slice(-400);
          send(p.ws, { t: 'exBook', shop, rows: rows.map(view), mine: rows.filter((l) => l.seller === p.key).map((l) => l.id) });
          return true;
        }
        case 'exPost': {
          const item = typeof msg.item === 'string' && ITEM.test(msg.item) ? msg.item : null;
          const n = int(msg.n, 1, 999), price = int(msg.price, 1, 1_000_000);
          const shop = typeof msg.shop === 'string' && SHOP.test(msg.shop) ? msg.shop : null;
          const refuse = (why) => send(p.ws, { t: 'exRefused', item: msg.item, n: msg.n, why });
          if (!item || n === null || price === null) { refuse('The broker can\'t make sense of that.'); return true; }
          if (shop && homeOf?.(p.key) !== shop) { refuse('That stall isn\'t yours.'); return true; }
          if (shop && book.list.filter((l) => l.shop === shop).length >= PER_STALL) { refuse(`Your stall holds ${PER_STALL} stacks. Take something off it first.`); return true; }
          if (!shop && book.list.filter((l) => l.seller === p.key && !l.shop).length >= PER_SELLER) { refuse(`You already have ${PER_SELLER} stacks in the book. Wait for some to sell, or take some back.`); return true; }
          if (book.list.length >= BOOK_MAX) { refuse('The book is full today. Try again later.'); return true; }
          const l = { id: book.next++, item, n, price, seller: p.key, sellerName: p.name, at: Date.now(), ...(shop ? { shop } : {}) };
          book.list.push(l);
          store();
          send(p.ws, { t: 'exPosted', row: view(l) });
          return true;
        }
        case 'exBuy': {
          const i = book.list.findIndex((l) => l.id === msg.id);
          if (i < 0) { send(p.ws, { t: 'exGone', id: msg.id }); return true; }
          const l = book.list[i];
          if (l.seller === p.key) { sys(p, 'That\'s your own stack. Take it back from the Selling page instead.'); return true; }
          book.list.splice(i, 1);
          store();
          send(p.ws, { t: 'exBought', row: view(l) });
          owe(l.seller, { kind: 'sold', id: l.id, item: l.item, n: l.n, marks: l.shop ? l.price : l.price - Math.floor(l.price * CUT), buyer: p.name, shop: l.shop, at: Date.now() });
          log(`exchange: ${p.name} bought ${l.n} ${l.item} from ${l.sellerName}${l.shop ? "'s stall" : ''} for ${l.price}`);
          return true;
        }
        case 'exCancel': {
          const i = book.list.findIndex((l) => l.id === msg.id && l.seller === p.key);
          if (i < 0) { send(p.ws, { t: 'exGone', id: msg.id }); return true; }
          const [l] = book.list.splice(i, 1);
          store();
          send(p.ws, { t: 'exBack', row: view(l) });
          return true;
        }
      }
      return false;
    },
  };
}
