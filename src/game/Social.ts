import { ITEMS } from '../data/items';
import type { GroupView, GuildRank, GuildView, Online, TradeOffer, TradeView } from '../net/Online';

// Groups and trades in the browser (the server half is server/social.mjs). The group shows as
// frames under your own, its members are green on the map, and playing near them is worth a tenth
// more experience. A trade opens a window where each side puts up items from the pack and marks;
// both lock, both accept, and the server tells each side what to give and what to take.

export interface SocialHost {
  net(): Online;
  system(text: string): void;
  ask(text: string, yes: () => void, no: () => void, secs: number): void;
  setGroup(rows: GroupRow[] | null): void;
  openTrade(open: boolean): void;
  refreshTrade(): void;
  refreshGuild(): void;
  player(): { x: number; z: number; hp: number; max: number; level: number; calling: string };
  /** Items in the pack, stacked by kind (equipped gear isn't in the pack, so it can't be traded). */
  pack(): { id: string; n: number }[];
  count(id: string): number;
  take(id: string, n: number): boolean;
  give(id: string, n: number): boolean;
  freeSlots(): number;
  marks(): number;
  addMarks(n: number): void;
  sound(name: 'coin' | 'quest' | 'click'): void;
  persist(): void;
}

export interface GroupRow { id: number; name: string; hp: number; max: number; level: number; leader: boolean; me: boolean; near: boolean; calling: string }

export interface TradeUi extends TradeView { pack: { id: string; n: number }[] }

const GROUP_RANGE = 60;

export class Social {
  group: GroupView | null = null;
  /** Your guild, as the server last told it (null: none, or not heard yet). */
  guild: GuildView | null = null;
  trade: TradeView | null = null;
  private vitalsT = 0;

  constructor(private host: SocialHost) {}

  /** Wire the network's group and trade messages here (called once Online exists). */
  hooks() {
    return {
      group: (v: GroupView) => this.onGroup(v),
      groupInvited: (from: string) => this.host.ask(`${from} invites you to join their group.`, () => this.host.net().groupAnswer(true), () => this.host.net().groupAnswer(false), 60),
      tradeAsked: (from: string) => this.host.ask(`${from} wants to trade with you.`, () => this.host.net().tradeAnswer(from, true), () => this.host.net().tradeAnswer(from, false), 30),
      trade: (v: TradeView) => this.onTrade(v),
      tradeEnd: (why: string) => { this.trade = null; this.host.openTrade(false); if (why) this.host.system(why); },
      tradeDone: (withName: string, give: TradeOffer, take: TradeOffer) => this.onTradeDone(withName, give, take),
      guild: (v: GuildView) => { this.guild = v.name ? v : null; this.host.refreshGuild(); },
      guildInvited: (from: string, guild: string) => this.host.ask(`${from} invites you to join the guild ${guild}.`, () => this.host.net().guildAnswer(true), () => this.host.net().guildAnswer(false), 90),
    };
  }

  // ---------------------------------------------------------------- Groups
  get inGroup(): boolean { return !!this.group && this.group.members.length > 1; }
  get myId(): number { return this.host.net().myId; }

  isAlly(remoteId: number): boolean { return !!this.group?.members.some((m) => m.id === remoteId); }

  /** Another member of the group close by: worth a tenth more experience. */
  groupNearby(): boolean {
    if (!this.inGroup) return false;
    const p = this.host.player();
    return this.group!.members.some((m) => m.id !== this.myId && Math.hypot(m.x - p.x, m.z - p.z) < GROUP_RANGE);
  }

  private onGroup(v: GroupView): void {
    const had = this.inGroup;
    this.group = v.members.length > 1 ? v : null;
    if (!this.group) { this.host.setGroup(null); if (had) this.host.sound('click'); return; }
    const p = this.host.player();
    this.host.setGroup(this.group.members.map((m) => ({
      id: m.id, name: m.name, hp: m.id === this.myId ? p.hp : m.hp, max: m.id === this.myId ? p.max : m.max, level: m.level, calling: m.calling,
      leader: m.id === v.leader, me: m.id === this.myId, near: m.id === this.myId || Math.hypot(m.x - p.x, m.z - p.z) < GROUP_RANGE,
    })));
  }

  invite(name: string): void { if (this.online()) this.host.net().groupInvite(name); }
  leave(): void { if (!this.inGroup) { this.host.system('You aren\'t in a group.'); return; } this.host.net().groupLeave(); }
  kick(name: string): void { if (this.online()) this.host.net().groupKick(name); }
  say(text: string): void { if (this.online()) this.host.net().groupChat(text); }

  private online(): boolean {
    if (this.host.net().status === 'online') return true;
    this.host.system('Groups and trades need the online realm: you\'re playing offline.');
    return false;
  }

  /** Each frame: tell the group our health now and then. */
  update(dt: number): void {
    if (this.host.net().status !== 'online') return;
    if ((this.vitalsT -= dt) > 0) return;
    this.vitalsT = 1;
    const p = this.host.player();
    this.host.net().vitals(Math.round(p.hp), Math.round(p.max), p.level, p.calling);
  }

  // ---------------------------------------------------------------- Guilds
  /** Officers and the leader can invite. */
  get canInviteToGuild(): boolean { return !!this.guild && (this.guild.rank === 'leader' || this.guild.rank === 'officer'); }
  guildFound(name: string, motto: string): void { if (this.online()) this.host.net().guildCreate(name, motto); }
  guildInvite(name: string): void { if (this.online()) this.host.net().guildInvite(name); }
  guildLeave(): void { if (!this.guild) { this.host.system('You aren\'t in a guild.'); return; } this.host.net().guildLeave(); }
  guildKick(name: string): void { if (this.online()) this.host.net().guildKick(name); }
  guildRank(name: string, rank: GuildRank): void { if (this.online()) this.host.net().guildRank(name, rank); }
  guildMotto(text: string): void { if (this.online()) this.host.net().guildMotto(text); }
  guildSay(text: string): void { if (this.online()) { if (!this.guild) this.host.system('You aren\'t in a guild.'); else this.host.net().guildChat(text); } }

  // ---------------------------------------------------------------- Trades
  ask(name: string): void { if (this.online()) this.host.net().tradeAsk(name); }

  ui(): TradeUi | null {
    if (!this.trade) return null;
    return { ...this.trade, pack: this.host.pack().filter((s) => tradable(s.id)) };
  }

  private onTrade(v: TradeView): void {
    const first = !this.trade;
    this.trade = v;
    if (first) { this.host.openTrade(true); this.host.sound('click'); }
    this.host.refreshTrade();
  }

  private offer(o: TradeOffer): void { this.host.net().tradeOffer(o.items, o.marks); }

  /** Put a whole stack of something from the pack on the table (or all of it, if some is already there). */
  add(id: string): void {
    const t = this.trade;
    if (!t || !tradable(id)) return;
    const items = t.mine.items.filter((s) => s.id !== id);
    if (items.length >= 8) { this.host.system('Eight kinds of thing at most in one trade.'); return; }
    items.push({ id, n: this.host.count(id) });
    this.offer({ items, marks: t.mine.marks });
  }

  remove(i: number): void {
    const t = this.trade;
    if (!t) return;
    this.offer({ items: t.mine.items.filter((_, k) => k !== i), marks: t.mine.marks });
  }

  setMarks(n: number): void {
    const t = this.trade;
    if (!t) return;
    this.offer({ items: t.mine.items, marks: Math.max(0, Math.min(this.host.marks(), Math.floor(n) || 0)) });
  }

  lock(): void { if (this.trade) this.host.net().tradeLock(!this.trade.myLock); }

  accept(): void {
    const t = this.trade;
    if (!t) return;
    // Still have what we're offering, and room for what's coming?
    for (const s of t.mine.items) if (this.host.count(s.id) < s.n) { this.host.system(`You no longer have ${s.n} ${ITEMS[s.id]?.name ?? s.id}.`); return; }
    if (this.host.marks() < t.mine.marks) { this.host.system('You don\'t have that many marks any more.'); return; }
    const freed = t.mine.items.filter((s) => this.host.count(s.id) === s.n).length;
    const needed = t.theirs.items.reduce((n, s) => n + (ITEMS[s.id]?.stack ? (this.host.count(s.id) > 0 ? 0 : 1) : s.n), 0);
    if (needed > this.host.freeSlots() + freed) { this.host.system('Make room in your pack first.'); return; }
    this.host.net().tradeAccept();
  }

  cancel(): void { if (this.trade) this.host.net().tradeCancel(); }

  private onTradeDone(withName: string, give: TradeOffer, take: TradeOffer): void {
    for (const s of give.items) this.host.take(s.id, Math.min(s.n, this.host.count(s.id)));
    if (give.marks) this.host.addMarks(-Math.min(give.marks, this.host.marks()));
    for (const s of take.items) if (ITEMS[s.id]) this.host.give(s.id, s.n);
    if (take.marks) this.host.addMarks(take.marks);
    this.trade = null;
    this.host.openTrade(false);
    this.host.sound('coin');
    const got = describe(take), gave = describe(give);
    this.host.system(`Trade with ${withName} done. You gave ${gave || 'nothing'} and got ${got || 'nothing'}.`);
    this.host.persist();
  }
}

/** Quest items stay with their owner; everything else can change hands. */
export function tradable(id: string): boolean {
  const d = ITEMS[id];
  return !!d && d.kind !== 'quest';
}

function describe(o: TradeOffer): string {
  const parts = o.items.map((s) => `${s.n > 1 ? s.n + ' × ' : ''}${ITEMS[s.id]?.name ?? s.id}`);
  if (o.marks) parts.push(`${o.marks} marks`);
  return parts.join(', ');
}
