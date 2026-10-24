import { ITEMS } from '../data/items';
import type { ExOwed, ExRow, Online } from '../net/Online';
import { tradable } from './Social';

// The Exchange in the browser (the book itself is on the realm server: server/exchange.mjs).
// A broker in Ansbury's Guildhall, Gullmouth's Merchants' Quarter and the Company office at
// Harrowgate opens it. Buying: pay the price, take the stack. Selling: the stack leaves your pack
// when you post it; your takings, less a mark in twenty, come to you when it sells (or the stack
// comes back if you take it down, or nobody buys it in three days).
//
// A stall at the gate of someone's lot is a page of the same book (game/Building.ts puts it up): its
// holder sets out stacks at their own prices with no cut, and anyone passing can buy, holder there or not.

export interface ExchangeHost {
  net(): Online;
  online(): boolean;
  system(text: string): void;
  count(id: string): number;
  take(id: string, n: number): boolean;
  give(id: string, n: number): boolean;
  marks(): number;
  addMarks(n: number): void;
  sound(name: 'coin' | 'click'): void;
  persist(): void;
  /** Redraw the panel if it's open. */
  refresh(): void;
}

/** What the panel shows. */
export interface ExchangeView {
  online: boolean;
  loading: boolean;
  rows: ExRow[];
  mine: ExRow[];
  /** The cheapest stack of each item for sale, per one (a guide to pricing). */
  cheapest: Map<string, number>;
  /** A stall's page rather than the brokers': whose, and whether it's yours. */
  stall: Stall | null;
}

/** A stall at a lot's gate: the lot, its holder, and whether you're them. */
export interface Stall { id: string; owner: string; mine: boolean }
/** Stacks a stall holds. */
export const STALL_MAX = 24;

/** The Exchange's cut of every sale. */
export const EXCHANGE_CUT = 0.05;

export class Exchange {
  private rows: ExRow[] = [];
  private mine = new Set<number>();
  private loading = false;
  private stall: Stall | null = null;

  constructor(private host: ExchangeHost) {}

  hooks() {
    return {
      exBook: (rows: ExRow[], mine: number[], shop: string | null) => {
        if ((shop ?? null) !== (this.stall?.id ?? null)) return;
        this.rows = rows; this.mine = new Set(mine); this.loading = false; this.host.refresh();
      },
      exPosted: (row: ExRow) => {
        this.rows.push(row); this.mine.add(row.id);
        this.host.system(row.shop ? `Set out on your stall: ${this.name(row)} for ${row.price} marks.` : `Posted at the Exchange: ${this.name(row)} for ${row.price} marks.`);
        this.host.sound('coin'); this.host.refresh();
      },
      exRefused: (item: string, n: number, why: string) => {
        // The stack was taken out of the pack when it was posted; it comes back
        if (ITEMS[item] && n > 0) this.host.give(item, n);
        this.host.system(why); this.host.persist(); this.host.refresh();
      },
      exBought: (row: ExRow) => {
        this.drop(row.id);
        this.host.addMarks(-Math.min(row.price, this.host.marks()));
        if (ITEMS[row.item]) this.host.give(row.item, row.n);
        this.host.system(row.shop ? `Bought from ${row.seller}'s stall: ${this.name(row)} for ${row.price} marks.` : `Bought at the Exchange: ${this.name(row)} from ${row.seller} for ${row.price} marks.`);
        this.host.sound('coin'); this.host.persist(); this.host.refresh();
      },
      exBack: (row: ExRow) => {
        this.drop(row.id);
        if (ITEMS[row.item]) this.host.give(row.item, row.n);
        this.host.system(row.shop ? `Taken off your stall: ${this.name(row)}.` : `Taken back from the Exchange: ${this.name(row)}.`);
        this.host.persist(); this.host.refresh();
      },
      exGone: (id: number) => { this.drop(id); this.host.system('Someone else got there first: that stack has gone.'); this.host.refresh(); },
      exOwed: (rows: ExOwed[]) => {
        let marks = 0;
        for (const r of rows) {
          if (r.id !== undefined) this.drop(r.id);
          if (r.kind === 'sold') {
            marks += r.marks ?? 0;
            this.host.system(r.shop ? `Your stall sold ${this.name(r)} to ${r.buyer ?? 'a passer-by'}: ${r.marks} marks.` : `The Exchange sold your ${this.name(r)} to ${r.buyer ?? 'a buyer'}: ${r.marks} marks after the Exchange's cut.`);
          } else if (ITEMS[r.item]) {
            this.host.give(r.item, r.n);
            this.host.system(r.shop ? `Your stall's ${this.name(r)} came back to your pack.` : `Nobody bought your ${this.name(r)} in three days, so the Exchange sent it back.`);
          }
        }
        if (marks) { this.host.addMarks(marks); this.host.sound('coin'); }
        this.host.persist(); this.host.refresh();
      },
    };
  }

  /** Ask the realm for the book, or a stall's page of it (the panel shows what it had meanwhile, if it's the same page). */
  open(stall: Stall | null = null): void {
    if ((stall?.id ?? null) !== (this.stall?.id ?? null)) { this.rows = []; this.mine.clear(); }
    this.stall = stall;
    if (!this.host.online()) return;
    this.loading = true;
    this.host.net().exList(stall?.id);
  }

  /** Taking a stall down: everything on it comes back to your pack. */
  clearStall(): void {
    if (!this.stall?.mine || !this.host.online()) return;
    for (const id of this.mine) this.host.net().exCancel(id);
  }

  view(): ExchangeView {
    const cheapest = new Map<string, number>();
    for (const r of this.rows) { const each = r.price / r.n; if (!cheapest.has(r.item) || each < cheapest.get(r.item)!) cheapest.set(r.item, each); }
    return {
      online: this.host.online(), loading: this.loading, stall: this.stall,
      rows: this.rows.filter((r) => !this.mine.has(r.id)).sort((a, b) => a.price / a.n - b.price / b.n),
      mine: this.rows.filter((r) => this.mine.has(r.id)),
      cheapest,
    };
  }

  post(item: string, n: number, price: number): void {
    if (!this.host.online()) { this.host.system('The Exchange keeps its book on the realm server. Play online to sell there.'); return; }
    if (this.stall && (!this.stall.mine || this.mine.size >= STALL_MAX)) { this.host.system(this.stall.mine ? `Your stall holds ${STALL_MAX} stacks. Take something off it first.` : 'That stall isn\'t yours.'); return; }
    const d = ITEMS[item];
    n = Math.floor(n); price = Math.floor(price);
    if (!d || !tradable(item)) { this.host.system('The broker won\'t take that.'); return; }
    if (!(n >= 1) || this.host.count(item) < n) { this.host.system(`You don't have ${n} ${d.name}.`); return; }
    if (!(price >= 1) || price > 1_000_000) { this.host.system('Set a price between 1 and a million marks.'); return; }
    if (!this.host.take(item, n)) return;
    this.host.persist();
    this.host.net().exPost(item, n, price, this.stall?.id);
  }

  buy(id: number): void {
    const r = this.rows.find((x) => x.id === id);
    if (!r || !this.host.online()) return;
    if (this.host.marks() < r.price) { this.host.system(`You need ${r.price} marks for that.`); return; }
    this.host.net().exBuy(id);
  }

  takeBack(id: number): void {
    if (this.host.online() && this.mine.has(id)) this.host.net().exCancel(id);
  }

  private drop(id: number): void { this.rows = this.rows.filter((r) => r.id !== id); this.mine.delete(id); }
  private name(r: { item: string; n: number }): string { const nm = ITEMS[r.item]?.name ?? r.item; return r.n > 1 ? `${r.n} × ${nm}` : nm; }
}
