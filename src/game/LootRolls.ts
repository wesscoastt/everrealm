import { ITEMS, type ItemDef } from '../data/items';

// Loot the way the MMOs do it (owner 2026-11-14: "make sure gears and drops work like mmo's"). A good piece of gear
// that drops in the open world while you're with your group goes to a roll: everyone near sees it and picks Need (it's
// an upgrade they'll wear), Greed (they'd take it) or Pass. Need beats greed, the dice settle the rest, and the winner
// gets it; if everyone passes, whoever it dropped for keeps it. Whoever it dropped for runs the roll and tells the
// group how it went; the others only take what's announced for a roll they were shown. (In the dungeons each player's
// chest is their own.) And binding: an epic or better, or a named piece, is yours the moment you pick it up; a rare
// one is yours once you've worn it. A bound piece can't be traded, mailed or sold on the Exchange.

export type BindRule = 'pickup' | 'equip' | null;
/** How a piece binds, if it does. */
export const bindRule = (d: ItemDef | undefined): BindRule => (!d || d.stack || !(d.weapon || d.armor) ? null : d.named || d.rarity === 'epic' || d.rarity === 'legendary' ? 'pickup' : d.rarity === 'rare' ? 'equip' : null);
/** Gear good enough for a roll and a beam of light. */
export const goodDrop = (d: ItemDef | undefined) => !!d && !d.stack && !!(d.weapon || d.armor) && (d.rarity === 'rare' || d.rarity === 'epic' || d.rarity === 'legendary');

export type Pick = 'need' | 'greed' | 'pass';
export type LrMsg =
  | { k: 'lrOpen'; id: string; item: string; until: number }
  | { k: 'lrPick'; id: string; c: Pick }
  | { k: 'lrWon'; id: string; item: string; winner: number | null; winnerName: string; rolls: { name: string; c: Pick; n: number }[] };

export interface LootHost {
  myId(): number;
  myName(): string;
  /** Groupmates near enough to roll. */
  mates(): { id: number; name: string }[];
  send(to: number | null, data: LrMsg): void;
  give(item: string): void;
  canWear(item: string): boolean;
  system(text: string): void;
  sound(n: 'click' | 'discover' | 'coin' | 'fail'): void;
}

interface Roll { id: string; item: string; from: number; fromName: string; until: number; picks: Map<number, { name: string; c: Pick }>; mine: Pick | null; members: number[]; el: HTMLDivElement | null; timer: number }
const RARITY: Record<string, string> = { rare: '#4a8ae8', epic: '#a04ae8', legendary: '#f0a030' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ROLL_SECS = 30;

export class LootRolls {
  private rolls = new Map<string, Roll>();
  private box: HTMLDivElement | null = null;
  constructor(private host: LootHost) {}

  /** A good piece dropped for you with your group about you: put it to a roll. False if there's nobody to roll with. */
  start(item: string): boolean {
    const mates = this.host.mates();
    if (!mates.length) return false;
    const id = `${this.host.myId()}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`, until = Date.now() + ROLL_SECS * 1000;
    const r: Roll = { id, item, from: this.host.myId(), fromName: this.host.myName(), until, picks: new Map(), mine: null, members: [this.host.myId(), ...mates.map((m) => m.id)], el: null, timer: 0 };
    this.rolls.set(id, r);
    this.host.send(null, { k: 'lrOpen', id, item, until });
    r.timer = window.setTimeout(() => this.settle(id), ROLL_SECS * 1000 + 500);
    this.show(r);
    return true;
  }

  onNet(from: number, fromName: string, m: LrMsg): void {
    if (!m || typeof m !== 'object') return;
    if (m.k === 'lrOpen' && typeof m.id === 'string' && ITEMS[m.item] && !this.rolls.has(m.id)) {
      const r: Roll = { id: m.id, item: m.item, from, fromName, until: Math.min(Date.now() + ROLL_SECS * 1000, Number(m.until) || 0), picks: new Map(), mine: null, members: [], el: null, timer: 0 };
      this.rolls.set(m.id, r);
      // (not picked in time: a pass)
      r.timer = window.setTimeout(() => { if (!r.mine) this.pick(r, 'pass'); }, Math.max(1000, r.until - Date.now()));
      this.show(r);
      this.host.sound('discover');
      return;
    }
    const r = this.rolls.get((m as { id?: string }).id ?? '');
    if (!r) return;
    if (m.k === 'lrPick' && r.from === this.host.myId() && r.members.includes(from) && ['need', 'greed', 'pass'].includes(m.c)) {
      r.picks.set(from, { name: fromName, c: m.c });
      if (r.picks.size >= r.members.length) this.settle(r.id);
      return;
    }
    if (m.k === 'lrWon' && from === r.from && m.item === r.item) {
      this.close(r);
      this.say(m.item, m.winnerName, m.rolls);
      if (m.winner === this.host.myId()) this.host.give(r.item);
    }
  }

  private pick(r: Roll, c: Pick): void {
    if (r.mine) return;
    r.mine = c;
    if (r.from === this.host.myId()) { r.picks.set(r.from, { name: this.host.myName(), c }); if (r.picks.size >= r.members.length) this.settle(r.id); }
    else this.host.send(r.from, { k: 'lrPick', id: r.id, c });
    this.host.sound('click');
    this.draw();
  }

  /** The dropper settles it: need over greed, the dice for the rest; everyone near is told. */
  private settle(id: string): void {
    const r = this.rolls.get(id);
    if (!r || r.from !== this.host.myId()) return;
    clearTimeout(r.timer);
    if (!r.mine) r.picks.set(r.from, { name: this.host.myName(), c: 'pass' });
    const rolls = [...r.picks.entries()].map(([pid, p]) => ({ pid, name: p.name, c: p.c, n: p.c === 'pass' ? 0 : 1 + Math.floor(Math.random() * 100) }));
    const tier = rolls.some((x) => x.c === 'need') ? 'need' : rolls.some((x) => x.c === 'greed') ? 'greed' : null;
    const best = tier ? rolls.filter((x) => x.c === tier).sort((a, b) => b.n - a.n)[0] : null;
    const winner = best ? best.pid : r.from, winnerName = best ? best.name : this.host.myName();
    const out = rolls.map(({ name, c, n }) => ({ name, c, n }));
    this.host.send(null, { k: 'lrWon', id, item: r.item, winner, winnerName, rolls: out });
    this.close(r);
    this.say(r.item, winnerName, out);
    if (winner === this.host.myId()) this.host.give(r.item);
  }

  private say(item: string, who: string, rolls: { name: string; c: Pick; n: number }[]): void {
    const name = ITEMS[item]?.name ?? item;
    const said = rolls.filter((x) => x.c !== 'pass').map((x) => `${x.name} ${x.c} ${x.n}`).join(', ');
    this.host.system(`${name}: ${who} takes it${said ? ` (${said})` : ', everyone else passing'}.`);
  }

  private close(r: Roll): void { clearTimeout(r.timer); this.rolls.delete(r.id); this.draw(); }

  // ---- The roll windows, stacked at the top of the screen ----
  private show(r: Roll): void { this.draw(); void r; }
  private draw(): void {
    if (!this.box) { this.box = document.createElement('div'); this.box.id = 'loot-rolls'; document.body.appendChild(this.box); }
    const rolls = [...this.rolls.values()];
    this.box.innerHTML = rolls.map((r) => {
      const d = ITEMS[r.item], secs = Math.max(0, Math.ceil((r.until - Date.now()) / 1000)), can = this.host.canWear(r.item);
      return `<div class="lr" data-lr="${esc(r.id)}" style="--rc:${RARITY[d?.rarity ?? 'rare'] ?? '#4a8ae8'}"><b>${esc(d?.name ?? r.item)}</b><small>${esc(d?.rarity ?? '')} · level ${d?.ilvl ?? 1} · dropped for ${esc(r.from === this.host.myId() ? 'you' : r.fromName)}</small>
        ${r.mine ? `<span class="lr-said">You said ${r.mine}. Waiting for the others.</span>` : `<div class="lr-btns"><button class="btn sm" data-c="need"${can ? '' : ' disabled title="You can\'t wear it yet"'}>Need</button><button class="btn sm ghost" data-c="greed">Greed</button><button class="btn sm ghost" data-c="pass">Pass</button></div>`}
        <i class="lr-bar" style="animation-duration:${secs}s"></i></div>`;
    }).join('');
    this.box.querySelectorAll<HTMLElement>('[data-lr]').forEach((el) => el.querySelectorAll<HTMLElement>('[data-c]').forEach((b) => b.addEventListener('click', () => { const r = this.rolls.get(el.dataset.lr!); if (r) this.pick(r, b.dataset.c as Pick); })));
  }
}
