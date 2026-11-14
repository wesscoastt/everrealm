import { FISH_STAKES, HOUSE_DAILY_LIMIT, STAKES, type GamingHouse } from '../data/tavernGames';
import { FACE, RANKS, rankOf, SUIT, type Card } from './bs';
import { bjTotal, cgAct, cgDeal, cgIdle, cgNpc, cgTurn, cgView, POKER_CAP, type CardGameId, type CgSeat, type CgState, type CgView } from './cardGames';
import type { TavernHost } from './TavernTable';

// The table for Blackjack, Go Fish and hold 'em (the rules are game/cardGames.ts), drawn inside the keeper's window
// (game/TavernTable.ts). As at BS, whoever deals keeps the game: the regulars play from their table, and other players
// who sit in (owner 2026-10-31: every activity works in a group) are sent what their seat can see and send back what
// they do. Each player's own table moves their own marks, from what the view says they've put in and taken back.

export type CgMsg =
  | { k: 'cgOpen'; g: CardGameId; house: string; stake: number }
  | { k: 'cgJoin' }
  | { k: 'cgLobby'; g: CardGameId; seats: string[]; stake: number; house: string }
  | { k: 'cgView'; v: CgView }
  | { k: 'cgAct'; a: unknown }
  | { k: 'cgLeave' }
  | { k: 'cgClose' };

export const CG_TITLE: Record<CardGameId, string> = { bj: 'Blackjack', fish: 'Go Fish', poker: 'Hold \'em' };
const MAX_SEATS: Record<CardGameId, number> = { bj: 5, fish: 5, poker: 6 };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const red = (c: Card) => Math.floor(c / 13) === 1 || Math.floor(c / 13) === 2;
/** Cards already on the table this hand: a card not seen before is dealt in (slides and turns over) as it arrives. */
const seen = { hid: -1, cards: new Set<string>(), n: 0 };
const card = (c: Card | null, extra = '', data = '', where = '') => {
  if (c === null) return `<div class="tv-card back${extra}"></div>`;
  const key = where + c, fresh = !seen.cards.has(key);
  if (fresh) seen.cards.add(key);
  // (one after another, so a deal goes round rather than landing all at once)
  const delay = fresh ? `style="animation-delay:${Math.min(8, seen.n++) * 70}ms"` : '';
  return `<div class="tv-card${red(c) ? ' red' : ''}${extra}${fresh ? ' deal' : ''}" ${data} ${delay}><b>${FACE[rankOf(c)]}</b><i>${SUIT[Math.floor(c / 13)]}</i></div>`;
};
const backs = (n: number) => `<div class="tv-fan">${Array.from({ length: Math.min(n, 9) }, () => card(null, ' sm')).join('')}</div>`;

const HELP: Record<CardGameId, string> = {
  bj: 'Against the keeper. Two cards each; get nearer twenty-one than the keeper without going over. Picture cards count ten, an ace one or eleven. Draw a card, stand on what you have, or double your stake for exactly one more card. The keeper draws to seventeen. Blackjack, an ace and a ten-card dealt, pays three to two.',
  fish: 'Ask anyone at the table for a rank you already hold. If they have any, they hand them all over and you ask again; if not, "go fish": draw from the pond, and if you draw what you asked for, you go again. Four of a rank go down as a book. When all thirteen books are down, the most books takes the pot. The regulars remember what you\'ve asked for.',
  poker: 'Texas hold \'em, the stakes fixed. Two cards each, face down, and five shared on the table: three at the flop, one at the turn, one at the river. Bet, call, raise or fold as each comes; a bet is the stake before the turn and twice it after, and three raises is the most on any round. The best five cards out of your two and the table\'s five take the pot.',
};

export class CardRoom {
  game: CardGameId = 'bj';
  private phase: 'lobby' | 'play' = 'lobby';
  private st: CgState | null = null;
  private stake = 10;
  private seatPlan: CgSeat[] = [];
  private button = 0;
  private timer = 0;
  /** At a groupmate's table: who's dealing, and what they've last shown us. */
  guestOf: number | null = null;
  private guestView: CgView | null = null;
  private guestLobby: { g: CardGameId; seats: string[]; stake: number; house: string } | null = null;
  /** What this player's marks have done in this hand. */
  private ledger = { hid: -1, paid: 0, done: false };
  /** Go Fish: the rank picked from your hand, and who you're asking. */
  private fishRank: number | null = null;
  private fishTo: number | null = null;
  private say = '';

  constructor(private host: TavernHost, private house: () => GamingHouse | null, private redraw: () => void) {}

  private shut(): boolean { return this.host.won() >= HOUSE_DAILY_LIMIT; }
  private stakes(): number[] { return this.game === 'fish' ? FISH_STAKES : STAKES; }

  /** Sit down at one of the three, dealing. */
  begin(g: CardGameId): void {
    this.leave();
    this.game = g;
    this.guestOf = null;
    this.lobby();
  }

  /** Up from the table: the others are told, and a regular takes up your cards. */
  leave(): void {
    clearTimeout(this.timer);
    if (this.guestOf !== null) this.host.send(this.guestOf, { k: 'cgLeave' } satisfies CgMsg);
    else for (const s of this.st?.seats ?? this.seatPlan) if (s.who === 'peer') this.host.send(s.peer!, { k: 'cgClose' } satisfies CgMsg);
    this.st = null; this.guestOf = null; this.guestView = null; this.guestLobby = null; this.seatPlan = []; this.phase = 'lobby';
  }

  private lobby(): void {
    this.phase = 'lobby';
    this.st = null;
    const ok = this.stakes().filter((s) => s <= this.host.marks() && (!s || !this.shut()));
    if (!ok.includes(this.stake)) this.stake = ok.includes(10) ? 10 : ok[0] ?? 0;
    const kept = this.seatPlan.filter((x) => x.who === 'peer' && this.host.mates().some((m) => m.id === x.peer));
    // Blackjack is everyone against the keeper; the other two fill the table with the regulars
    const regs = this.game === 'bj' ? [] : (this.house()?.regulars ?? []).map((r) => ({ name: r.name, who: 'npc' as const, nerve: r.nerve, doubt: r.doubt }));
    this.seatPlan = [{ name: this.host.myName(), who: 'you', nerve: 0, doubt: 0 }, ...regs.slice(0, Math.max(0, regs.length - kept.length)), ...kept];
    this.lobbyOut();
  }

  private lobbyOut(): void {
    for (const s of this.seatPlan) if (s.who === 'peer') this.host.send(s.peer!, { k: 'cgLobby', g: this.game, seats: this.seatPlan.map((x) => x.name), stake: this.stake, house: this.house()?.house ?? '' } satisfies CgMsg);
  }

  // ---- Dealing and moving the game on (the dealer's table) ----

  private deal(): void {
    if (this.stake > this.host.marks() || (this.stake && this.shut())) return;
    if (this.game !== 'bj' && this.seatPlan.length < 2) return;
    this.st = cgDeal(this.game, this.seatPlan, this.stake, this.button++);
    this.phase = 'play';
    this.fishRank = this.fishTo = null; this.say = '';
    this.host.sound('shuffle');
    this.step();
  }

  private broadcast(): void {
    const st = this.st;
    if (!st) return;
    st.seats.forEach((s, i) => { if (s.who === 'peer') this.host.send(s.peer!, { k: 'cgView', v: cgView(st, i) } satisfies CgMsg); });
    this.settle(cgView(st, 0));
    this.redraw();
  }

  private step(): void {
    clearTimeout(this.timer);
    const st = this.st;
    if (!st) return;
    this.broadcast();
    const t = cgTurn(st);
    if (t === null) return;
    const s = st.seats[t];
    const go = (pick: () => unknown) => { if (this.st === st && cgTurn(st) === t && cgAct(st, t, pick())) { this.host.sound('card'); this.step(); } };
    if (s.who === 'npc') this.timer = window.setTimeout(() => go(() => cgNpc(st, t)), 800 + Math.random() * 700);
    else if (s.who === 'peer') this.timer = window.setTimeout(() => go(() => cgIdle(st, t)), 45000);
  }

  /** You (or a seat you're dealing for) act. */
  private act(a: unknown): void {
    if (this.guestOf !== null) { this.host.send(this.guestOf, { k: 'cgAct', a } satisfies CgMsg); return; }
    const st = this.st;
    if (!st || cgTurn(st) !== 0) return;
    if (cgAct(st, 0, a)) { this.host.sound('card'); this.step(); }
  }

  /** Your marks follow your seat: what it's put in goes out, and what it takes back comes in when the hand is done. */
  private settle(v: CgView): void {
    if (v.hid !== this.ledger.hid) this.ledger = { hid: v.hid, paid: 0, done: false };
    const d = v.paid - this.ledger.paid;
    if (d) { this.host.addMarks(-d); this.ledger.paid = v.paid; }
    if (v.payout !== null && !this.ledger.done) {
      this.ledger.done = true;
      if (v.payout) this.host.addMarks(v.payout);
      this.host.addWon(v.payout - v.paid);
      this.host.sound(v.payout > v.paid ? 'quest' : v.payout === v.paid ? 'click' : 'fail');
      this.host.persist();
    }
  }

  // ---- The word between tables ----

  /** A guest sits down at a groupmate's table (they've already said yes to the invitation). */
  sitIn(from: number, m: Extract<CgMsg, { k: 'cgOpen' }>): void {
    this.leave();
    this.game = m.g;
    this.guestOf = from;
    this.guestLobby = { g: m.g, seats: [], stake: m.stake, house: m.house };
    this.host.send(from, { k: 'cgJoin' } satisfies CgMsg);
  }

  /** Returns true when the table should close (the dealer got up). */
  onNet(from: number, fromName: string, m: CgMsg): boolean {
    if (from === this.guestOf) {
      if (m.k === 'cgLobby') { this.game = m.g; this.guestLobby = { g: m.g, seats: m.seats, stake: m.stake, house: m.house }; this.guestView = null; this.redraw(); }
      else if (m.k === 'cgView' && m.v && typeof m.v === 'object') {
        // (what it costs us is checked against our own purse: a hand we can't cover, we don't sit)
        this.guestView = m.v; this.settle(m.v);
        if (this.fishRank !== null && !m.v.hand.some((c) => rankOf(c) === this.fishRank)) this.fishRank = null;
        this.redraw();
      } else if (m.k === 'cgClose') { this.host.system(`${fromName} has got up from the table.`); this.guestOf = null; return true; }
      return false;
    }
    if (this.guestOf !== null) return false;
    if (m.k === 'cgJoin' && this.phase === 'lobby') {
      if (this.seatPlan.some((s) => s.peer === from)) return false;
      const at = this.seatPlan.map((s) => s.who).lastIndexOf('npc');
      const seat: CgSeat = { name: fromName, who: 'peer', peer: from, nerve: 0.5, doubt: 0.5 };
      if (at >= 0) this.seatPlan[at] = seat;
      else if (this.seatPlan.length < MAX_SEATS[this.game]) this.seatPlan.push(seat);
      else { this.host.send(from, { k: 'cgClose' } satisfies CgMsg); return false; }
      this.host.system(`${fromName} sits in.`);
      this.lobbyOut(); this.redraw();
      return false;
    }
    const st = this.st, i = st ? st.seats.findIndex((s) => s.who === 'peer' && s.peer === from) : -1;
    if (m.k === 'cgLeave') {
      if (st && i >= 0) {
        // (a regular picks up their cards; at Blackjack the hand just stands)
        const r = this.house()?.regulars[i % Math.max(1, this.house()?.regulars.length ?? 1)];
        st.seats[i] = { ...st.seats[i], who: 'npc', peer: undefined, name: r && st.game !== 'bj' ? r.name : st.seats[i].name, nerve: r?.nerve ?? 0.5, doubt: r?.doubt ?? 0.5 };
        st.log.push(`${fromName} gets up from the table.`);
        this.step();
      }
      const k = this.seatPlan.findIndex((s) => s.peer === from);
      if (k > 0) { this.seatPlan.splice(k, 1); this.lobby(); this.redraw(); }
      return false;
    }
    if (m.k === 'cgAct' && st && i >= 0 && cgTurn(st) === i && cgAct(st, i, m.a)) { this.host.sound('card'); this.step(); }
    return false;
  }

  // ---- Drawing ----

  title(): string { return CG_TITLE[this.game]; }

  html(): string {
    if (this.guestOf !== null && !this.guestView) {
      const g = this.guestLobby;
      return `<p class="tv-say">You're sitting in at ${esc(g?.house || 'their table')}${g?.stake ? ` for ${g.stake} marks` : ''}. Waiting for the deal.</p><div class="tv-seats">${(g?.seats ?? []).map((n) => `<span>${esc(n)}</span>`).join('')}</div><p class="tv-help">${HELP[this.game]}</p>`;
    }
    if (this.guestOf === null && this.phase === 'lobby') return this.lobbyHtml();
    const v = this.guestOf !== null ? this.guestView! : cgView(this.st!, 0);
    if (seen.hid !== v.hid) { seen.hid = v.hid; seen.cards.clear(); }
    seen.n = 0;
    const body = v.game === 'bj' ? this.bjHtml(v) : v.game === 'fish' ? this.fishHtml(v) : this.pokerHtml(v);
    let end = '';
    if (v.payout !== null) {
      const net = v.payout - v.paid;
      end = `<span class="tv-status">${net > 0 ? `You come out ${net} marks up.` : net < 0 ? `You're down ${-net} on that hand.` : 'You come out even.'}</span>${this.guestOf === null ? `<button class="btn ghost" data-cgagain>Another hand</button>` : '<span class="tv-note">Waiting for the next deal.</span>'}`;
    }
    return `<div class="tv-bs tv-cg">${body}${end ? `<div class="tv-foot">${end}</div>` : ''}</div>`;
  }

  private lobbyHtml(): string {
    const mates = this.host.mates().filter((m) => !this.seatPlan.some((s) => s.peer === m.id));
    const shut = this.shut(), can = this.game !== 'bj' || !shut;
    return `<p class="tv-help">${HELP[this.game]}</p>
      <div class="tv-seats">${this.seatPlan.map((s) => `<span class="${s.who}">${esc(s.name)}${s.who === 'peer' ? ' (player)' : ''}</span>`).join('')}${this.game === 'bj' ? '<span>The keeper deals</span>' : ''}</div>
      <div class="tv-foot"><span class="tv-chips">${this.game === 'poker' ? 'The stake (the big blind)' : this.game === 'bj' ? 'Your stake' : 'Each puts in'}: ${this.stakes().map((s) => `<button class="tv-chip${s === this.stake ? ' on' : ''}" data-cgstake="${s}"${(s && shut) || s > this.host.marks() ? ' disabled' : ''}>${s || 'Nothing'}</button>`).join('')}</span>
      ${mates.length && this.seatPlan.length < MAX_SEATS[this.game] + (this.seatPlan.filter((s) => s.who === 'npc').length ? 1 : 0) ? `<button class="btn ghost" data-cginvite>Ask ${mates.length === 1 ? esc(mates[0].name) : `the ${mates.length} players here`} to sit in</button>` : ''}
      <button class="btn" data-cgdeal${can && (this.stake || this.game === 'fish') && this.stake <= this.host.marks() ? '' : ' disabled'}>Deal</button></div>
      ${shut ? `<p class="tv-note">${this.game === 'fish' ? 'The house has paid you all it will today: the regulars will only play for nothing.' : 'The house has paid you all it will today. Come back tomorrow.'}</p>` : this.game === 'poker' ? '<p class="tv-note">The regulars play with their own marks, and a pot you win off them counts toward what the house lets you take in a day.</p>' : ''}`;
  }

  private status(v: CgView, mine: string, others: string): string {
    if (v.payout !== null) return '';
    return `<span class="tv-status">${v.turn === v.me ? mine : v.turn !== null ? others || `${esc(v.seats[v.turn].name)} is thinking…` : ''}</span>`;
  }

  private bjHtml(v: CgView): string {
    const dealer = v.dealer!, shown = dealer.every((c) => c !== null);
    const seat = (i: number) => {
      const st = v.status![i], t = bjTotal(v.hands![i]);
      const tag = st === 'bj' ? 'Blackjack' : st === 'bust' ? `Bust (${t})` : `${t}`;
      return `<div class="tv-opp tv-bjseat${v.turn === i ? ' turn' : ''}${i === v.me ? ' me' : ''}"><b>${esc(v.seats[i].name)}${i === v.me ? ' (you)' : ''}</b><div class="tv-row">${v.hands![i].map((c) => card(c, ' md', '', 'h' + i + ':')).join('')}</div><small>${tag} · ${v.bets![i]} on it</small></div>`;
    };
    const mine = v.turn === v.me, h = v.hands![v.me];
    const acts = mine ? `<button class="btn" data-bj="hit">Draw</button><button class="btn ghost" data-bj="stand">Stand</button>${h.length === 2 && this.host.marks() >= v.bets![v.me] ? `<button class="btn ghost" data-bj="double">Double (${v.bets![v.me]} more)</button>` : ''}` : '';
    return `<div class="tv-dealer"><b>The keeper</b><div class="tv-row">${dealer.map((c) => card(c, '', '', 'd:')).join('')}</div><small>${shown ? bjTotal(dealer as Card[]) : 'Draws to seventeen'}</small></div>
      <div class="tv-opps">${v.seats.map((_, i) => seat(i)).join('')}</div>
      <ol class="tv-log tv-log-wide">${v.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
      ${v.payout === null ? `<div class="tv-foot">${this.status(v, `You have ${bjTotal(h)}. The keeper shows ${FACE[rankOf(dealer[0]!)]}.`, '')}${acts}</div>` : ''}`;
  }

  private fishHtml(v: CgView): string {
    const mine = v.turn === v.me && v.payout === null;
    const asks = v.seats.map((_, i) => i).filter((i) => i !== v.me && v.seats[i].n > 0);
    if (this.fishTo === null || !asks.includes(this.fishTo)) this.fishTo = asks[0] ?? null;
    const bookList = (b: number[]) => (b.length ? b.map((r) => FACE[r]).join(' ') : 'none yet');
    const opp = v.seats.map((s, i) => ({ s, i })).filter(({ i }) => i !== v.me).map(({ s, i }) =>
      `<div class="tv-opp${v.turn === i ? ' turn' : ''}${mine && this.fishTo === i ? ' pick' : ''}${mine && s.n ? ' ask' : ''}" data-fto="${i}"><b>${esc(s.name)}</b>${backs(s.n)}<small>${s.n} card${s.n === 1 ? '' : 's'} · books: ${bookList(v.books![i])}</small></div>`).join('');
    const hand = v.hand.map((c) => card(c, this.fishRank === rankOf(c) ? ' sel' : '', `data-frank="${rankOf(c)}"`, 'm:')).join('');
    const acts = mine ? `<button class="btn" data-fask${this.fishRank !== null && this.fishTo !== null ? '' : ' disabled'}>${this.fishRank !== null && this.fishTo !== null ? `Ask ${esc(v.seats[this.fishTo].name)} for ${RANKS[this.fishRank].toLowerCase()}` : 'Ask'}</button>` : '';
    return `<div class="tv-opps">${opp}</div>
      <div class="tv-mid"><div class="tv-pile">${v.pond ? card(null, ' pile') : '<div class="tv-card empty"></div>'}<small>${v.pond} in the pond</small></div><div class="tv-due">Your books: ${bookList(v.books![v.me])}</div><ol class="tv-log">${v.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>
      <div class="tv-hand${mine ? ' live' : ''}">${hand || '<span class="tv-note">No cards in your hand.</span>'}</div>
      ${v.payout === null ? `<div class="tv-foot">${this.status(v, this.fishRank === null ? 'Your turn. Choose a card from your hand for the rank to ask for, then who to ask.' : 'Who has them? Choose someone at the table, then ask.', '')}${v.pot ? `<span class="tv-pot">Pot ${v.pot}</span>` : ''}${acts}</div>` : ''}`;
  }

  private pokerHtml(v: CgView): string {
    const mine = v.turn === v.me && v.payout === null;
    const opp = v.seats.map((s, i) => ({ s, i })).filter(({ i }) => i !== v.me).map(({ s, i }) => {
      const holes = v.shownHoles![i], out = !v.inHand![i];
      const said = v.shown?.find((x) => x.seat === i);
      return `<div class="tv-opp${v.turn === i ? ' turn' : ''}${out ? ' out' : ''}"><b>${esc(s.name)}${v.button === i ? ' <em class="tv-btn">D</em>' : ''}</b><div class="tv-row">${holes ? holes.map((c) => card(c, ' md', '', 'o' + i + ':')).join('') : out ? '<small>Folded</small>' : backs(2)}</div><small>${said ? said.name : v.bet![i] ? `${v.bet![i]} in this round` : '&nbsp;'}</small></div>`;
    }).join('');
    const board = [0, 1, 2, 3, 4].map((k) => (v.board![k] !== undefined ? card(v.board![k], '', '', 'b:') : '<div class="tv-card empty"></div>')).join('');
    const owe = v.owe!, size = v.size!, purse = this.host.marks();
    const acts = mine ? [
      owe ? '<button class="btn ghost" data-pk="fold">Fold</button>' : '',
      owe ? `<button class="btn" data-pk="call"${owe > purse ? ' disabled' : ''}>Call ${owe}</button>` : '<button class="btn" data-pk="check">Check</button>',
      v.raises! < POKER_CAP ? `<button class="btn ghost" data-pk="raise"${owe + size > purse ? ' disabled' : ''}>${Math.max(...v.bet!) ? `Raise ${size}` : `Bet ${size}`}</button>` : '',
    ].join('') : '';
    return `<div class="tv-opps">${opp}</div>
      <div class="tv-board-row"><div class="tv-row">${board}</div><span class="tv-pot">Pot ${v.pot}</span></div>
      <ol class="tv-log tv-log-wide">${v.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
      <div class="tv-hand">${v.hand.map((c) => card(c, '', '', 'm:')).join('')}<span class="tv-mine">${v.inHand![v.me] ? `${v.board!.length ? 'You have ' + v.mine : ''}${v.button === v.me ? ' <em class="tv-btn">D</em>' : ''}` : 'You folded.'}</span></div>
      ${v.payout === null ? `<div class="tv-foot">${this.status(v, owe ? `${owe} to you.` : 'Your turn: nothing to call.', '')}${acts}</div>` : ''}`;
  }

  wire(el: HTMLElement): void {
    el.querySelectorAll<HTMLElement>('[data-cgstake]').forEach((b) => b.addEventListener('click', () => { this.stake = Number(b.dataset.cgstake); this.host.sound('click'); this.lobbyOut(); this.redraw(); }));
    el.querySelector('[data-cginvite]')?.addEventListener('click', () => {
      const mates = this.host.mates().filter((m) => !this.seatPlan.some((s) => s.peer === m.id));
      for (const m of mates) this.host.send(m.id, { k: 'cgOpen', g: this.game, house: this.house()?.house ?? '', stake: this.stake } satisfies CgMsg);
      this.host.system(mates.length ? `You ask ${mates.map((m) => m.name).join(' and ')} to sit in.` : 'There\'s nobody near enough to ask.');
    });
    el.querySelector('[data-cgdeal]')?.addEventListener('click', () => this.deal());
    el.querySelector('[data-cgagain]')?.addEventListener('click', () => { this.lobby(); this.redraw(); });
    el.querySelectorAll<HTMLElement>('[data-bj]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.bj)));
    el.querySelectorAll<HTMLElement>('[data-pk]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.pk)));
    el.querySelectorAll<HTMLElement>('[data-frank]').forEach((c) => c.addEventListener('click', () => { this.fishRank = Number(c.dataset.frank); this.host.sound('card'); this.redraw(); }));
    el.querySelectorAll<HTMLElement>('[data-fto].ask').forEach((c) => c.addEventListener('click', () => { this.fishTo = Number(c.dataset.fto); this.host.sound('click'); this.redraw(); }));
    el.querySelector('[data-fask]')?.addEventListener('click', () => {
      if (this.fishRank === null || this.fishTo === null) return;
      this.act({ to: this.fishTo, rank: this.fishRank });
      this.fishRank = null;
    });
  }
}
