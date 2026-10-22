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
// (As with trades, the browser keeps the inventory: the book keeps every side agreeing on the deal.)

import path from 'node:path';

const ITEM = /^[a-z0-9_]{2,40}$/;
const PER_SELLER = 20;
const BOOK_MAX = 2000;
const LAPSE_MS = 3 * 24 * 3600_000;
const CUT = 0.05;

export function exchangeInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log } = ctx;
  const FILE = path.join(dataDir, 'exchange.json');
  /** list: the stacks for sale; owed: character key -> what's waiting for them (takings, stacks back) */
  const book = { next: 1, list: [], owed: {}, ...(readJson(FILE) ?? {}) };
  log(`exchange: ${book.list.length} stack(s) for sale`);
  const store = () => writeJson(FILE, book);
  const sys = (p, text) => send(p.ws, { t: 'sys', text });
  const view = (l) => ({ id: l.id, item: l.item, n: l.n, price: l.price, seller: l.sellerName, at: l.at });

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
  /** Stacks nobody bought in three days go home. */
  function lapse() {
    const now = Date.now();
    const keep = book.list.filter((l) => now - l.at <= LAPSE_MS);
    if (keep.length === book.list.length) return;
    for (const l of book.list) if (now - l.at > LAPSE_MS) owe(l.seller, { kind: 'back', id: l.id, item: l.item, n: l.n, at: now });
    book.list = keep;
    store();
  }
  setInterval(lapse, 600_000);

  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

  return {
    join(p) { settle(p); },
    handle(p, msg) {
      switch (msg.t) {
        case 'exList':
          lapse();
          send(p.ws, { t: 'exBook', rows: book.list.slice(-400).map(view), mine: book.list.filter((l) => l.seller === p.key).map((l) => l.id) });
          return true;
        case 'exPost': {
          const item = typeof msg.item === 'string' && ITEM.test(msg.item) ? msg.item : null;
          const n = int(msg.n, 1, 999), price = int(msg.price, 1, 1_000_000);
          const refuse = (why) => send(p.ws, { t: 'exRefused', item: msg.item, n: msg.n, why });
          if (!item || n === null || price === null) { refuse('The broker can\'t make sense of that.'); return true; }
          if (book.list.filter((l) => l.seller === p.key).length >= PER_SELLER) { refuse(`You already have ${PER_SELLER} stacks in the book. Wait for some to sell, or take some back.`); return true; }
          if (book.list.length >= BOOK_MAX) { refuse('The book is full today. Try again later.'); return true; }
          const l = { id: book.next++, item, n, price, seller: p.key, sellerName: p.name, at: Date.now() };
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
          owe(l.seller, { kind: 'sold', id: l.id, item: l.item, n: l.n, marks: l.price - Math.floor(l.price * CUT), buyer: p.name, at: Date.now() });
          log(`exchange: ${p.name} bought ${l.n} ${l.item} from ${l.sellerName} for ${l.price}`);
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
