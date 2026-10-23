import { ITEMS } from '../data/items';
import { itemIcon, shapeIcon } from '../ui/icons';
import { currentAccount, getVault, putVault } from '../net/Account';

// The Charter Bank: one vault shared by all your characters, at every counter (the Weighhouse in
// Ansbury, the harbour office in Gullmouth, the company office at Harrowgate). Signed in, the vault
// lives with your account on the realm's server, so it follows you to any device; each change
// carries the version it was made against, and the server turns down one made against a stale copy
// (another of your characters got there first), so nothing is counted twice. Not signed in, the
// characters in this browser share a vault kept here.

export interface Vault { items: Record<string, number>; marks: number; /** Room bought past the first eighty kinds. */ room?: number }
export const VAULT_KINDS = 80;
/** What each ten more kinds costs, in turn: the vault grows from 80 to 200 kinds. */
export const ROOM_PRICES = [400, 1200, 2500, 5000, 9000, 15000, 24000, 36000, 50000, 70000, 95000, 120000];
const LOCAL_KEY = 'everrealm.vault';

/** Somewhere else the panel can open on, kept by the game (a wagon's bed): goods only, no coin. */
export interface Store { title: string; kinds: number; note: string; load(): Record<string, number>; save(items: Record<string, number>): void }

export interface BankHost {
  pack(): { id: string; n: number }[];
  count(id: string): number;
  canAdd(id: string, n: number): boolean;
  give(id: string, n: number): boolean;
  take(id: string, n: number): boolean;
  marks(): number;
  addMarks(n: number): void;
  sound(name: string): void;
  system(text: string): void;
  persist(): void;
  refresh(): void;
  player(): { x: number; z: number };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const clean = (v: Partial<Vault> | null | undefined): Vault => {
  const items: Record<string, number> = {};
  for (const [k, n] of Object.entries(v?.items ?? {})) if (ITEMS[k] && Number.isFinite(n) && n > 0) items[k] = Math.floor(n);
  return { items, marks: Math.max(0, Math.floor(Number(v?.marks) || 0)), room: Math.max(0, Math.min(ROOM_PRICES.length * 10, Math.floor(Number(v?.room) || 0))) };
};

function readLocal(): Vault {
  try { return clean(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null')); } catch { return clean(null); }
}
function writeLocal(v: Vault): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(v)); } catch { /* private window: the vault lasts this session */ }
}

export class Bank {
  private el: HTMLDivElement | null = null;
  private at: { x: number; z: number; name: string } | null = null;
  private v: Vault = clean(null);
  private ver = 0;
  /** Waiting on the server: buttons are held until it answers. */
  private busy = false;
  private status = '';
  private store: Store | null = null;
  private get kinds(): number { return this.store?.kinds ?? VAULT_KINDS + (this.v.room ?? 0); }
  /** The next ten kinds' price (null: the vault is as big as it gets). */
  private get roomPrice(): number | null { return ROOM_PRICES[Math.floor((this.v.room ?? 0) / 10)] ?? null; }
  private buyRoom(): void {
    const price = this.roomPrice;
    if (price === null || this.store) return;
    if (this.host.marks() < price) { this.host.system(`Ten more kinds of room costs ${price} marks.`); this.host.sound('fail'); return; }
    const next = clean({ items: this.v.items, marks: this.v.marks, room: (this.v.room ?? 0) + 10 });
    void this.commit(next, () => { this.host.addMarks(-price); this.host.sound('coin'); this.host.system(`The clerk takes ${price} marks and another ledger page: the vault holds ${VAULT_KINDS + (next.room ?? 0)} kinds now, for every character on your account.`); });
  }
  private get what(): string { return this.store ? 'The bed' : 'The vault'; }

  constructor(private host: BankHost) {}

  get open(): boolean { return !!this.el; }
  private get remote(): boolean { return !!currentAccount(); }

  async show(name: string, x: number, z: number, store?: Store): Promise<void> {
    this.at = { x, z, name };
    this.store = store ?? null;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'bankpanel';
      document.body.appendChild(this.el);
    }
    this.host.sound('open');
    await this.load();
  }

  private async load(): Promise<void> {
    if (this.store) { this.v = clean({ items: this.store.load(), marks: 0 }); this.ver = 0; this.status = this.store.note; this.render(); return; }
    if (!this.remote) { this.v = readLocal(); this.status = 'Shared by the characters in this browser. Sign in to an account to keep it on the realm.'; this.render(); return; }
    this.busy = true; this.status = 'Opening the vault…'; this.render();
    const r = await getVault();
    this.busy = false;
    if (!r) { this.status = 'The realm\'s server isn\'t answering, so the vault stays shut for now.'; this.v = clean(null); this.ver = -1; this.render(); return; }
    this.v = clean(r.vault); this.ver = r.ver; this.status = 'Shared by every character on your account.'; this.render();
  }

  close(): void {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    this.at = null;
    this.store = null;
    this.host.sound('close');
  }

  /** Walking away from the counter closes the vault. */
  update(): void {
    if (!this.at) return;
    const p = this.host.player();
    if (Math.hypot(p.x - this.at.x, p.z - this.at.z) > 6) this.close();
  }

  /**
   * Makes a change to the vault: `next` is the vault after it, `apply` moves the goods in the pack.
   * Signed in, the server must take the new vault first; only then does the pack change.
   */
  private async commit(next: Vault, apply: () => void): Promise<void> {
    if (this.busy || this.ver < 0) return;
    if (this.store) { this.store.save(next.items); this.v = next; apply(); this.after(); return; }
    if (!this.remote) { writeLocal(next); this.v = next; apply(); this.after(); return; }
    this.busy = true;
    const r = await putVault(next, this.ver);
    this.busy = false;
    if (r.ok) { this.v = next; this.ver = r.ver ?? this.ver + 1; apply(); this.after(); return; }
    if (r.vault) {
      // Another character changed it meanwhile: show the vault as it is now, and nothing moves
      this.v = clean(r.vault); this.ver = r.ver ?? this.ver;
      this.host.system('The vault was changed by another of your characters. Here it is as it stands now; try again.');
    } else this.host.system(r.error ?? 'The bank couldn\'t take that just now.');
    this.host.sound('fail');
    this.render();
  }

  private after(): void { this.host.persist(); this.host.refresh(); this.render(); }

  private deposit(id: string, n: number): void {
    n = Math.min(n, this.host.count(id));
    if (n <= 0) return;
    if (!this.v.items[id] && Object.keys(this.v.items).length >= this.kinds) { this.host.system(`${this.what} holds ${this.kinds} kinds of things. Take something out first.`); this.host.sound('fail'); return; }
    const next = clean({ items: { ...this.v.items, [id]: (this.v.items[id] ?? 0) + n }, marks: this.v.marks, room: this.v.room });
    void this.commit(next, () => { this.host.take(id, n); this.host.sound('click'); });
  }

  private withdraw(id: string, n: number): void {
    n = Math.min(n, this.v.items[id] ?? 0);
    while (n > 0 && !this.host.canAdd(id, n)) n--;
    if (n <= 0) { this.host.system('Your pack is full.'); this.host.sound('fail'); return; }
    const next = clean({ items: { ...this.v.items, [id]: (this.v.items[id] ?? 0) - n }, marks: this.v.marks, room: this.v.room });
    void this.commit(next, () => { this.host.give(id, n); this.host.sound('click'); });
  }

  private moveMarks(n: number): void {
    if (n > 0) n = Math.min(n, this.host.marks());
    else n = -Math.min(-n, this.v.marks);
    if (!n) return;
    const next = clean({ items: this.v.items, marks: this.v.marks + n, room: this.v.room });
    void this.commit(next, () => { this.host.addMarks(-n); this.host.sound('coin'); });
  }

  private async depositAll(): Promise<void> {
    const mats = this.host.pack().filter((s) => ITEMS[s.id]?.kind === 'material');
    if (!mats.length) return;
    const items = { ...this.v.items };
    const moved: [string, number][] = [];
    for (const s of mats) {
      if (!items[s.id] && Object.keys(items).length >= this.kinds) continue;
      items[s.id] = (items[s.id] ?? 0) + s.n;
      moved.push([s.id, s.n]);
    }
    await this.commit(clean({ items, marks: this.v.marks, room: this.v.room }), () => { for (const [id, n] of moved) this.host.take(id, n); this.host.sound('click'); });
  }

  private render(): void {
    if (!this.el || !this.at) return;
    const v = this.v;
    const slot = (id: string, n: number, act: string) => {
      const d = ITEMS[id];
      return `<button class="bslot r-${d?.rarity ?? 'common'}" data-${act}="${id}" title="${esc(d?.name ?? id)}${n > 1 ? ` ×${n}` : ''}"${this.busy ? ' disabled' : ''}><img src="${itemIcon(id)}" alt="">${n > 1 ? `<span class="n">${n}</span>` : ''}</button>`;
    };
    const vaultIds = Object.keys(v.items).sort((a, b) => (ITEMS[a]?.name ?? a).localeCompare(ITEMS[b]?.name ?? b));
    const pack = this.host.pack();
    const coin = shapeIcon('coin', '#e8c050', '#a87a20');
    const dis = this.busy || this.ver < 0 ? ' disabled' : '';
    const S = this.store;
    this.el.innerHTML = `<div class="bk-head"><b>${S ? esc(S.title) : `Charter Bank · ${esc(this.at.name)}`}</b><button class="bk-x" data-close>✕</button></div>
      <p class="bk-sub">${esc(this.status)} Click a stack to move it; shift-click moves one.</p>
      <div class="bk-cols">
        <div><h6>Your pack</h6><div class="bk-grid">${pack.map((s) => slot(s.id, s.n, 'in')).join('') || '<em>Empty</em>'}</div>
          <button class="bk-all" data-allin${dis}>Deposit all materials</button></div>
        <div><h6>${this.what} <i>${vaultIds.length}/${this.kinds} kinds</i></h6><div class="bk-grid">${vaultIds.map((id) => slot(id, v.items[id], 'out')).join('') || '<em>Nothing kept here yet.</em>'}</div></div>
      </div>
      <div class="bk-marks"${S ? ' hidden' : ''}><img class="ric" src="${coin}" alt=""><span>Purse <b>${this.host.marks()}</b> · Vault <b>${v.marks}</b></span>
        <span class="bk-mb"><button data-m="10"${dis}>Pay in 10</button><button data-m="100"${dis}>100</button><button data-m="all"${dis}>All</button></span>
        <span class="bk-mb"><button data-m="-10"${dis}>Draw 10</button><button data-m="-100"${dis}>100</button><button data-m="-all"${dis}>All</button></span>
        ${this.roomPrice !== null ? `<span class="bk-mb"><button data-room${dis}>Ten more kinds of room: ${this.roomPrice} marks</button></span>` : '<span class="bk-mb"><i>The vault is as big as the Charter makes them.</i></span>'}</div>`;
    this.el.querySelector('[data-room]')?.addEventListener('click', () => this.buyRoom());
    const shiftN = (e: MouseEvent, n: number) => (e.shiftKey ? 1 : n);
    this.el.querySelectorAll<HTMLElement>('[data-in]').forEach((b) => b.addEventListener('click', (e) => this.deposit(b.dataset.in!, shiftN(e, this.host.count(b.dataset.in!)))));
    this.el.querySelectorAll<HTMLElement>('[data-out]').forEach((b) => b.addEventListener('click', (e) => this.withdraw(b.dataset.out!, shiftN(e, this.v.items[b.dataset.out!] ?? 0))));
    this.el.querySelector('[data-allin]')?.addEventListener('click', () => void this.depositAll());
    this.el.querySelectorAll<HTMLElement>('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.m!;
      if (m === 'all') this.moveMarks(this.host.marks());
      else if (m === '-all') this.moveMarks(-this.v.marks);
      else this.moveMarks(Number(m));
    }));
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.close());
  }
}
