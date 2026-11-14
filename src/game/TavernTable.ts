import { CROWN_FACES, HOUSE_DAILY_LIMIT, STAKES, BS_STAKES, type GamingHouse, type TavernGame } from '../data/tavernGames';
import { CardRoom, type CgMsg } from './CardRoom';
import type { CardGameId } from './cardGames';
import { call, deal, FACE, lay, letStand, npcDoubts, npcLay, RANKS, rankOf, SUIT, type BsState, type Card } from './bs';

// The tavern tables (data/tavernGames.ts): Crown and Anchor on the board, Find the Lady on the barrel, and BS
// round the big table (the rules are game/bs.ts). Dice and the Lady are played against the keeper for marks,
// up to what the house will lose to you in a day. BS seats you with the regulars, or with the other players in
// the taproom (owner 2026-11-13: "add ability to play other players"), grouped or not: whoever deals keeps the
// game and the others' tables follow it (the realm passes the table's word between you).

export interface TavernHost {
  marks(): number;
  /** Marks in or out (a stake laid, a win paid). */
  addMarks(n: number): void;
  myName(): string;
  nameOf(npc: string): string;
  sound(n: 'click' | 'coin' | 'quest' | 'fail' | 'open' | 'close' | 'roll' | 'card' | 'shuffle'): void;
  system(text: string): void;
  persist(): void;
  /** What the tables have paid you today, over what you laid (the house limit). */
  won(): number;
  addWon(n: number): void;
  /** Groupmates near enough to sit at the same table. */
  mates(): { id: number; name: string }[];
  /** A word to one groupmate's table (or all of them). */
  send(to: number | null, data: unknown): void;
  ask(text: string, yes: () => void, no: () => void, secs: number): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const red = (c: Card) => Math.floor(c / 13) === 1 || Math.floor(c / 13) === 2;
const cardHtml = (c: Card, extra = '', data = '') => `<div class="tv-card${red(c) ? ' red' : ''}${extra}" ${data}><b>${FACE[rankOf(c)]}</b><i>${SUIT[Math.floor(c / 13)]}</i></div>`;
const backHtml = (extra = '') => `<div class="tv-card back${extra}"></div>`;

/** What a seat at the BS table can see: everyone's count, the pile, and its own hand. */
interface BsView {
  house: string;
  stake: number;
  seats: { name: string; n: number; who: 'you' | 'peer' | 'npc' }[];
  me: number;
  hand: Card[];
  pile: number;
  need: number;
  turn: number;
  last: { seat: number; n: number; claim: number } | null;
  log: string[];
  winner: number | null;
  shown: BsState['shown'];
  /** May this seat call the last laying now? */
  ask: boolean;
}

type Msg =
  | { k: 'open'; house: string; stake: number }
  | { k: 'join' }
  | { k: 'lobby'; seats: string[]; stake: number; house: string }
  | { k: 'view'; v: BsView }
  | { k: 'play'; cards: Card[] }
  | { k: 'call' }
  | { k: 'pass' }
  | { k: 'leave' }
  | { k: 'close' };

const CARD_GAMES: readonly string[] = ['bj', 'fish', 'poker'];
const isCard = (g: string): g is CardGameId => CARD_GAMES.includes(g);

export class TavernTable {
  /** Blackjack, Go Fish and hold 'em (game/CardRoom.ts). */
  private readonly room: CardRoom;
  private el: HTMLDivElement | null = null;
  private house: GamingHouse | null = null;
  private game: TavernGame | 'menu' = 'menu';
  private say = '';
  // Crown and Anchor
  private chip = STAKES[0];
  private bets: Record<string, number> = {};
  private dice: number[] = [0, 1, 2];
  private rolling = false;
  // Find the Lady
  private lady: { stake: number; slot: number[]; phase: 'stake' | 'show' | 'shuffle' | 'pick' | 'done'; picked: number | null } = { stake: STAKES[0], slot: [0, 1, 2], phase: 'stake', picked: null };
  private ladyTimer = 0;
  // BS: as the one dealing (st), or sitting at a groupmate's game (view)
  private st: BsState | null = null;
  private bsStake = 0;
  private bsPhase: 'lobby' | 'play' | 'end' = 'lobby';
  private seatPlan: { name: string; who: 'you' | 'peer' | 'npc'; peer?: number; nerve: number; doubt: number }[] = [];
  private pick = new Set<Card>();
  private asking = new Set<number>();
  private bsTimer = 0;
  private waitT = 0;
  /** At a groupmate's table: who's dealing, and what they last showed us. */
  private guestOf: number | null = null;
  private guestView: BsView | null = null;
  private guestLobby: { seats: string[]; stake: number; house: string } | null = null;
  private paidOut = false;

  constructor(private host: TavernHost) {
    this.room = new CardRoom(host, () => this.house, () => this.render());
  }

  get open(): boolean { return !!this.el; }

  /** Up to the keeper's table. */
  start(house: GamingHouse, game: TavernGame | 'menu' = 'menu'): void {
    if (this.el) this.close();
    this.house = house;
    this.el = document.createElement('div');
    this.el.id = 'tavern';
    document.body.appendChild(this.el);
    this.host.sound('open');
    this.go(game);
  }

  private go(game: TavernGame | 'menu'): void {
    this.room.leave();
    this.game = game;
    this.say = '';
    if (isCard(game)) this.room.begin(game);
    if (game === 'lady') this.lady = { stake: this.lady.stake, slot: [0, 1, 2], phase: 'stake', picked: null };
    if (game === 'bs') this.bsLobby();
    this.render();
  }

  close(): void {
    if (!this.el) return;
    clearTimeout(this.ladyTimer); clearTimeout(this.bsTimer);
    // (leaving a hand of BS: the stake stays in the pot, and a regular picks up your cards)
    this.room.leave();
    if (this.guestOf !== null) { this.host.send(this.guestOf, { k: 'leave' } satisfies Msg); this.guestOf = null; }
    if (this.st && this.bsPhase === 'play') for (const s of this.st.seats) if (s.who === 'peer') this.host.send(s.peer!, { k: 'close' } satisfies Msg);
    if (this.bsPhase === 'lobby') for (const s of this.seatPlan) if (s.who === 'peer') this.host.send(s.peer!, { k: 'close' } satisfies Msg);
    this.st = null; this.guestView = null; this.guestLobby = null; this.seatPlan = [];
    this.el.remove(); this.el = null; this.house = null;
    this.host.sound('close');
    this.host.persist();
  }

  key(code: string): boolean {
    if (!this.el) return false;
    if (code === 'Escape') this.close();
    return true;
  }

  private houseShut(): boolean { return this.host.won() >= HOUSE_DAILY_LIMIT; }

  /** Pay or take marks at the keeper's board, and keep the day's tally. */
  private settle(laid: number, back: number): void {
    this.host.addMarks(back);
    this.host.addWon(back - laid);
    this.host.sound(back > laid ? 'coin' : back ? 'click' : 'fail');
    this.host.persist();
  }

  // ---- Drawing ----

  private render(): void {
    if (!this.el || !this.house) return;
    const h = this.house, keeper = this.host.nameOf(h.npc);
    const head = (title: string) => `<div class="tv-head"><b>${title}</b><span class="tv-marks">${this.host.marks().toLocaleString()} marks</span>${this.game !== 'menu' && this.guestOf === null && this.room.guestOf === null ? '<button class="btn ghost tv-back" data-menu>Other games</button>' : ''}<button class="tv-x" data-close>✕</button></div>`;
    let body = '';
    if (this.game === 'menu') {
      body = `${head(esc(h.house))}<p class="tv-say">${esc(keeper)}: "${esc(h.hello)}"</p>
        <div class="tv-menu">
          <button data-g="crown"><b>Crown and Anchor</b><small>Three dice and six faces. Lay marks on a face; each die that shows it pays your stake again.</small></button>
          <button data-g="lady"><b>Find the Lady</b><small>Three cards on a barrel, one of them the queen. Watch her through the shuffle and point. Evens if you're right.</small></button>
          <button data-g="bj"><b>Blackjack</b><small>Against the keeper: nearer twenty-one than the house without going over. Blackjack pays three to two.${this.host.mates().length ? ' Players here can take a seat beside you.' : ''}</small></button>
          <button data-g="fish"><b>Go Fish</b><small>Ask round the table for the cards you need, and make books of four. The regulars have long memories.</small></button>
          <button data-g="poker"><b>Hold 'em</b><small>Two cards each and five on the table. Bet, raise, call or fold; the best five cards take the pot.</small></button>
          <button data-g="bs"><b>BS</b><small>The whole pack dealt round. Lay cards face down and say what they are. Call a liar, or be called. First out takes the pot.${this.host.mates().length ? ' The other players here can sit in.' : ''}</small></button>
        </div>
        ${this.houseShut() ? `<p class="tv-note">${esc(keeper)} has paid out all they'll pay you today. BS for nothing is still on.</p>` : ''}`;
    } else if (this.game === 'crown') body = head('Crown and Anchor') + this.crownHtml();
    else if (this.game === 'lady') body = head('Find the Lady') + this.ladyHtml();
    else if (isCard(this.game)) body = head(this.room.guestOf !== null ? this.room.title() : `${this.room.title()} at ${esc(h.house)}`) + this.room.html();
    else body = head(this.guestOf !== null ? 'BS' : `BS at ${esc(h.house)}`) + this.bsHtml();
    this.el.innerHTML = `<div class="tv-box tv-${this.game}">${body}</div>`;
    this.wire();
  }

  private wire(): void {
    const el = this.el!;
    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    el.querySelector('[data-menu]')?.addEventListener('click', () => { this.host.sound('click'); this.go('menu'); });
    el.querySelectorAll<HTMLElement>('[data-g]').forEach((b) => b.addEventListener('click', () => { this.host.sound('click'); this.go(b.dataset.g as TavernGame); }));
    if (this.game === 'crown') this.wireCrown();
    if (this.game === 'lady') this.wireLady();
    if (this.game === 'bs') this.wireBs();
    if (isCard(this.game)) this.room.wire(el);
  }

  // ---- Crown and Anchor ----

  private crownHtml(): string {
    const total = Object.values(this.bets).reduce((a, b) => a + b, 0);
    const die = (f: number, i: number) => `<div class="tv-die${this.rolling ? ' rolling' : ''}" style="animation-delay:${i * 60}ms"><span>${CROWN_FACES[f].glyph}</span></div>`;
    return `<div class="tv-dice">${this.dice.map(die).join('')}</div>
      <div class="tv-board">${CROWN_FACES.map((f, i) => {
        const hits = this.rolling ? 0 : this.dice.filter((d) => d === i).length;
        return `<button class="tv-face${hits ? ' hit' : ''}" data-face="${f.id}"><span class="g">${f.glyph}</span><span class="n">${f.name}</span>${this.bets[f.id] ? `<span class="chip">${this.bets[f.id]}</span>` : ''}</button>`;
      }).join('')}</div>
      <div class="tv-foot"><span class="tv-chips">Chip: ${STAKES.map((s) => `<button class="tv-chip${s === this.chip ? ' on' : ''}" data-chip="${s}">${s}</button>`).join('')}</span>
        <span class="tv-status">${this.say ? esc(this.say) : total ? `${total} marks on the board.` : 'Choose a chip, then lay it on a face or two.'}</span>
        <button class="btn ghost" data-clear${total && !this.rolling ? '' : ' disabled'}>Take back</button><button class="btn" data-roll${total && !this.rolling && !this.houseShut() ? '' : ' disabled'}>Roll</button></div>`;
  }

  private wireCrown(): void {
    const el = this.el!;
    el.querySelectorAll<HTMLElement>('[data-chip]').forEach((b) => b.addEventListener('click', () => { this.chip = Number(b.dataset.chip); this.host.sound('click'); this.render(); }));
    el.querySelectorAll<HTMLElement>('[data-face]').forEach((b) => b.addEventListener('click', () => {
      if (this.rolling) return;
      const total = Object.values(this.bets).reduce((a, c) => a + c, 0);
      if (total + this.chip > this.host.marks()) { this.say = 'You haven\'t the marks for that.'; this.host.sound('fail'); this.render(); return; }
      if (total + this.chip > 200) { this.say = 'Two hundred on the board is the most the house takes at once.'; this.render(); return; }
      this.bets[b.dataset.face!] = (this.bets[b.dataset.face!] ?? 0) + this.chip;
      this.say = '';
      this.host.sound('coin'); this.render();
    }));
    el.querySelector('[data-clear]')?.addEventListener('click', () => { this.bets = {}; this.say = ''; this.render(); });
    el.querySelector('[data-roll]')?.addEventListener('click', () => this.roll());
  }

  private roll(): void {
    const laid = Object.values(this.bets).reduce((a, b) => a + b, 0);
    if (!laid || this.rolling || laid > this.host.marks()) return;
    this.host.addMarks(-laid);
    this.rolling = true;
    this.host.sound('roll');
    const final = [0, 1, 2].map(() => Math.floor(Math.random() * 6));
    let n = 0;
    const spin = () => {
      if (!this.el || this.game !== 'crown') return;
      if (++n < 8) { this.dice = [0, 1, 2].map(() => Math.floor(Math.random() * 6)); this.render(); this.bsTimer = window.setTimeout(spin, 90 + n * 12); return; }
      this.dice = final; this.rolling = false;
      let back = 0;
      for (const [id, amt] of Object.entries(this.bets)) {
        const hits = final.filter((d) => CROWN_FACES[d].id === id).length;
        if (hits) back += amt * (hits + 1);
      }
      this.settle(laid, back);
      const shown = final.map((d) => CROWN_FACES[d].name).join(', ');
      this.say = back > laid ? `${shown}. You take ${back} back on ${laid}.` : back === laid ? `${shown}. ${back} back on ${laid}: you break even.` : back ? `${shown}. ${back} back on ${laid}: you're down ${laid - back}.` : `${shown}. The house takes the board.`;
      if (this.houseShut()) this.say += ` ${this.host.nameOf(this.house!.npc)} shuts the board: "That's all you're having off me today."`;
      this.bets = {};
      this.render();
    };
    spin();
  }

  // ---- Find the Lady ----

  private ladyHtml(): string {
    const L = this.lady, tier = STAKES.indexOf(L.stake);
    const up = L.phase === 'show' || L.phase === 'done';
    const cards = [0, 1, 2].map((c) => {
      const face = c === 0 ? `<div class="tv-card tv-lady-face red"><b>Q</b><i>♥</i></div>` : cardHtml(c === 1 ? 10 : 37);
      const chosen = L.phase === 'done' && L.picked === c ? ' chosen' : '';
      return `<div class="tv-lady-card${up ? ' up' : ''}${chosen}" data-lc="${c}" style="left:${L.slot[c] * 33.3 + 2}%">${up ? face : backHtml()}</div>`;
    }).join('');
    const status = L.phase === 'stake' ? (this.say || 'Lay your stake. The more you lay, the faster the hands.') : L.phase === 'show' ? 'There she is. Keep your eye on her.' : L.phase === 'shuffle' ? 'Round and round she goes…' : L.phase === 'pick' ? 'Where is she? Point to a card.' : this.say;
    return `<div class="tv-barrel">${cards}</div>
      <div class="tv-foot"><span class="tv-chips">${L.phase === 'stake' || L.phase === 'done' ? `Stake: ${STAKES.map((s) => `<button class="tv-chip${s === L.stake ? ' on' : ''}" data-ls="${s}">${s}</button>`).join('')}` : `Stake: ${L.stake}`}</span>
        <span class="tv-status">${esc(status)}</span>
        ${L.phase === 'stake' || L.phase === 'done' ? `<button class="btn" data-deal${this.houseShut() || this.host.marks() < L.stake ? ' disabled' : ''}>${L.phase === 'done' ? 'Again' : 'Deal'}</button>` : ''}</div>
      <p class="tv-note">${tier >= 2 ? 'At this stake the keeper\'s hands are quick.' : ''}</p>`;
  }

  private wireLady(): void {
    const el = this.el!, L = this.lady;
    el.querySelectorAll<HTMLElement>('[data-ls]').forEach((b) => b.addEventListener('click', () => { L.stake = Number(b.dataset.ls); this.host.sound('click'); this.render(); }));
    el.querySelector('[data-deal]')?.addEventListener('click', () => this.ladyDeal());
    el.querySelectorAll<HTMLElement>('[data-lc]').forEach((c) => c.addEventListener('click', () => {
      if (L.phase !== 'pick') return;
      L.picked = Number(c.dataset.lc);
      L.phase = 'done';
      const win = L.picked === 0;
      this.settle(L.stake, win ? L.stake * 2 : 0);
      const keeper = this.host.nameOf(this.house!.npc);
      this.say = win ? `The queen. ${keeper} pays you ${L.stake}: "Sharp eyes."` : `The ${L.picked === 1 ? 'jack of diamonds' : 'king of clubs'}. ${keeper} sweeps up your ${L.stake}.`;
      if (this.houseShut()) this.say += ' "And that\'s the last of it today."';
      this.render();
    }));
  }

  private ladyDeal(): void {
    const L = this.lady;
    if (this.host.marks() < L.stake || this.houseShut()) return;
    this.host.addMarks(-L.stake);
    L.phase = 'show'; L.picked = null; L.slot = [0, 1, 2].sort(() => Math.random() - 0.5);
    this.say = '';
    this.host.sound('card');
    this.render();
    const tier = Math.max(0, STAKES.indexOf(L.stake));
    const swaps = 6 + tier * 2, ms = 420 - tier * 75;
    let n = 0;
    const swap = () => {
      if (!this.el || this.game !== 'lady') return;
      if (n++ >= swaps) { L.phase = 'pick'; this.render(); return; }
      const a = Math.floor(Math.random() * 3), b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      const ca = L.slot.indexOf(a), cb = L.slot.indexOf(b);
      L.slot[ca] = b; L.slot[cb] = a;
      // (moved in place, so the cards slide rather than jump)
      this.el.querySelectorAll<HTMLElement>('[data-lc]').forEach((c) => { c.style.transitionDuration = `${ms}ms`; c.style.left = `${L.slot[Number(c.dataset.lc)] * 33.3 + 2}%`; });
      this.host.sound('card');
      this.ladyTimer = window.setTimeout(swap, ms + 40);
    };
    this.ladyTimer = window.setTimeout(() => {
      if (!this.el || this.game !== 'lady') return;
      L.phase = 'shuffle';
      this.render();
      this.ladyTimer = window.setTimeout(swap, 300);
    }, 1400);
  }

  // ---- BS ----

  private bsLobby(): void {
    if (this.guestOf !== null) return;
    this.bsPhase = 'lobby';
    this.st = null;
    this.bsStake = this.houseShut() ? 0 : Math.min(this.bsStake || 10, this.host.marks() >= 10 ? 10 : 0);
    // (groupmates who sat in for the last hand keep their seats)
    const kept = this.seatPlan.filter((x) => x.who === 'peer' && this.host.mates().some((m) => m.id === x.peer));
    const regs = this.house!.regulars.map((r) => ({ name: r.name, who: 'npc' as const, nerve: r.nerve, doubt: r.doubt }));
    this.seatPlan = [{ name: this.host.myName(), who: 'you', nerve: 0, doubt: 0 }, ...regs.slice(0, regs.length - kept.length), ...kept];
    this.lobbyOut();
  }

  /** Tell the groupmates sitting in how the lobby looks. */
  private lobbyOut(): void {
    for (const s of this.seatPlan) if (s.who === 'peer') this.host.send(s.peer!, { k: 'lobby', seats: this.seatPlan.map((x) => x.name), stake: this.bsStake, house: this.house!.house } satisfies Msg);
  }

  private viewFor(i: number): BsView {
    const st = this.st!;
    const ask = this.asking.has(i);
    return {
      house: this.house?.house ?? '', stake: this.bsStake,
      seats: st.seats.map((s) => ({ name: s.name, n: s.hand.length, who: s.who })), me: i, hand: [...st.seats[i].hand],
      pile: st.pile.length, need: st.need, turn: st.turn, last: st.last ? { seat: st.last.seat, n: st.last.cards.length, claim: st.last.claim } : null,
      log: st.log.slice(-7), winner: st.winner, shown: st.shown, ask,
    };
  }

  private bsHtml(): string {
    // At a groupmate's table, before they deal
    if (this.guestOf !== null && !this.guestView) {
      const g = this.guestLobby;
      return `<p class="tv-say">You're sitting in at ${esc(g?.house ?? 'their table')}${g?.stake ? ` for ${g.stake} marks` : ''}. Waiting for the deal.</p><div class="tv-seats">${(g?.seats ?? []).map((n) => `<span>${esc(n)}</span>`).join('')}</div>`;
    }
    if (this.guestOf === null && this.bsPhase === 'lobby') {
      const mates = this.host.mates().filter((m) => !this.seatPlan.some((s) => s.peer === m.id));
      const shut = this.houseShut();
      return `<p class="tv-help">The pack is dealt round. In turn, lay one to four cards face down and say they're the rank that's due: aces first, then twos, up to kings and round again. You can lie. Anyone can call it: if the cards weren't what was said, the liar takes up the pile, and if they were, the caller does. First to an empty hand takes the pot.</p>
        <div class="tv-seats">${this.seatPlan.map((s) => `<span class="${s.who}">${esc(s.name)}${s.who === 'peer' ? ' (player)' : ''}</span>`).join('')}</div>
        <div class="tv-foot"><span class="tv-chips">Each puts in: ${BS_STAKES.map((s) => `<button class="tv-chip${s === this.bsStake ? ' on' : ''}" data-bstake="${s}"${(s && shut) || s > this.host.marks() ? ' disabled' : ''}>${s || 'Nothing'}</button>`).join('')}</span>
        ${mates.length ? `<button class="btn ghost" data-invite>Ask ${mates.length === 1 ? esc(mates[0].name) : `the ${mates.length} players here`} to sit in</button>` : ''}
        <button class="btn" data-bsdeal>Deal</button></div>${shut ? '<p class="tv-note">The house has paid you all it will today: the regulars will only play for nothing.</p>' : ''}`;
    }
    const v = this.guestOf !== null ? this.guestView! : this.viewFor(0);
    const others = v.seats.map((s, i) => ({ s, i })).filter(({ i }) => i !== v.me);
    const myTurn = v.winner === null && !v.last && v.turn === v.me;
    const opp = others.map(({ s, i }) => `<div class="tv-opp${v.turn === i && v.winner === null ? ' turn' : ''}${v.last?.seat === i ? ' laid' : ''}"><b>${esc(s.name)}</b><div class="tv-fan">${Array.from({ length: Math.min(s.n, 9) }, () => backHtml(' sm')).join('')}</div><small>${s.n} card${s.n === 1 ? '' : 's'}</small></div>`).join('');
    const shown = v.shown ? `<div class="tv-shown ${v.shown.honest ? 'honest' : 'liar'}">${v.shown.cards.map((c) => cardHtml(c)).join('')}<small>${v.shown.honest ? 'Honest' : 'Lies'}</small></div>` : '';
    const pile = `<div class="tv-pile">${v.pile ? backHtml(' pile') : '<div class="tv-card empty"></div>'}<small>${v.pile} in the pile</small></div>`;
    const due = v.winner !== null ? '' : `<div class="tv-due">${v.last ? `${esc(v.seats[v.last.seat].name)} says: ${v.last.n} ${RANKS[v.last.claim].toLowerCase()}` : `${RANKS[v.need]} are due`}</div>`;
    const hand = v.hand.map((c) => cardHtml(c, this.pick.has(c) ? ' sel' : '', `data-c="${c}"`)).join('');
    const pot = v.stake * v.seats.length;
    let status = '';
    let acts = '';
    if (v.winner !== null) {
      status = v.winner === v.me ? `You're out of cards. You win${pot ? ` the pot, ${pot} marks` : ''}.` : `${esc(v.seats[v.winner].name)} wins${pot ? ` the pot, ${pot} marks` : ''}.`;
      acts = this.guestOf === null ? '<button class="btn ghost" data-bsagain>Another hand</button><button class="btn" data-close>Leave the table</button>' : '<button class="btn" data-close>Leave the table</button>';
    } else if (v.ask) {
      status = `Is it the truth?`;
      acts = '<button class="btn danger" data-call>Call BS!</button><button class="btn ghost" data-pass>Let it stand</button>';
    } else if (myTurn) {
      status = this.pick.size ? `Lay ${this.pick.size} and say they're ${RANKS[v.need].toLowerCase()}.` : `Your turn. ${RANKS[v.need]} are due: choose one to four cards, true or not.`;
      acts = `<button class="btn" data-lay${this.pick.size ? '' : ' disabled'}>Lay ${this.pick.size || ''} as ${RANKS[v.need].toLowerCase()}</button>`;
    } else if (v.last) status = 'Waiting on the table…';
    else status = `${esc(v.seats[v.turn].name)} is choosing…`;
    return `<div class="tv-bs">
      <div class="tv-opps">${opp}</div>
      <div class="tv-mid">${pile}${due}${shown}<ol class="tv-log">${v.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>
      <div class="tv-hand${myTurn ? ' live' : ''}">${hand}</div>
      <div class="tv-foot"><span class="tv-status">${status}</span>${pot ? `<span class="tv-pot">Pot ${pot}</span>` : ''}${acts}</div></div>`;
  }

  private wireBs(): void {
    const el = this.el!;
    el.querySelectorAll<HTMLElement>('[data-bstake]').forEach((b) => b.addEventListener('click', () => { this.bsStake = Number(b.dataset.bstake); this.host.sound('click'); this.lobbyOut(); this.render(); }));
    el.querySelector('[data-invite]')?.addEventListener('click', () => {
      const mates = this.host.mates().filter((m) => !this.seatPlan.some((s) => s.peer === m.id));
      for (const m of mates) this.host.send(m.id, { k: 'open', house: this.house!.house, stake: this.bsStake } satisfies Msg);
      if (!mates.length) { this.host.system('There’s nobody near enough to ask.'); return; }
      this.host.system(`You ask ${mates.map((m) => m.name).join(' and ')} to sit in.`);
    });
    el.querySelector('[data-bsdeal]')?.addEventListener('click', () => this.bsDeal());
    el.querySelector('[data-bsagain]')?.addEventListener('click', () => { this.bsLobby(); this.render(); });
    el.querySelectorAll<HTMLElement>('[data-c]').forEach((c) => c.addEventListener('click', () => {
      const card = Number(c.dataset.c);
      if (this.pick.has(card)) this.pick.delete(card); else if (this.pick.size < 4) this.pick.add(card);
      this.host.sound('card'); this.render();
    }));
    el.querySelector('[data-lay]')?.addEventListener('click', () => {
      const cards = [...this.pick];
      this.pick.clear();
      if (this.guestOf !== null) { this.host.send(this.guestOf, { k: 'play', cards } satisfies Msg); return; }
      this.seatPlays(0, cards);
    });
    el.querySelector('[data-call]')?.addEventListener('click', () => { if (this.guestOf !== null) { this.guestView!.ask = false; this.host.send(this.guestOf, { k: 'call' } satisfies Msg); this.render(); } else this.answer(0, true); });
    el.querySelector('[data-pass]')?.addEventListener('click', () => { if (this.guestOf !== null) { this.guestView!.ask = false; this.host.send(this.guestOf, { k: 'pass' } satisfies Msg); this.render(); } else this.answer(0, false); });
  }

  private bsDeal(): void {
    if (this.bsStake > this.host.marks()) return;
    this.host.addMarks(-this.bsStake);
    this.st = deal(this.seatPlan);
    this.bsPhase = 'play';
    this.paidOut = false;
    this.pick.clear(); this.asking.clear();
    this.host.sound('shuffle');
    this.step();
  }

  /** Everyone's table brought up to date. */
  private broadcast(): void {
    if (!this.st) return;
    this.st.seats.forEach((s, i) => { if (s.who === 'peer') this.host.send(s.peer!, { k: 'view', v: this.viewFor(i) } satisfies Msg); });
    this.render();
  }

  /** The dealer's table moves the game on: whose turn, who may call, who's won. */
  private step(): void {
    clearTimeout(this.bsTimer);
    const st = this.st;
    if (!st || !this.el) return;
    if (st.winner !== null) { this.finish(); return; }
    if (st.last) {
      // The laying stands open: the people at the table answer first, then the regulars have their say
      if (this.asking.size) { this.broadcast(); if ([...this.asking].some((i) => st.seats[i].who === 'peer')) this.bsTimer = window.setTimeout(() => { this.asking.clear(); this.step(); }, 15000); return; }
      this.bsTimer = window.setTimeout(() => {
        if (!this.st?.last) return;
        const p = this.st.last, n = this.st.seats.length;
        for (let k = 1; k < n; k++) {
          const i = (p.seat + k) % n;
          if (this.st.seats[i].who === 'npc' && npcDoubts(this.st, i)) { call(this.st, i); this.host.sound(this.st.shown?.honest ? 'click' : 'coin'); this.step(); return; }
        }
        letStand(this.st);
        this.step();
      }, 650);
      this.broadcast();
      return;
    }
    const s = st.seats[st.turn];
    this.broadcast();
    if (s.who === 'npc') this.bsTimer = window.setTimeout(() => { if (this.st) this.seatPlays(this.st.turn, npcLay(this.st, this.st.turn)); }, 900 + Math.random() * 600);
    else if (s.who === 'peer') this.bsTimer = window.setTimeout(() => { if (this.st && this.st.seats[this.st.turn] === s) this.seatPlays(this.st.turn, npcLay(this.st, this.st.turn)); }, 45000);
  }

  private seatPlays(i: number, cards: Card[]): void {
    const st = this.st;
    if (!st || !lay(st, i, cards)) return;
    this.host.sound('card');
    // (everyone at the table bar the one who laid may call it)
    this.asking = new Set(st.seats.map((s, k) => (s.who !== 'npc' && k !== i ? k : -1)).filter((k) => k >= 0));
    this.step();
  }

  private answer(i: number, calls: boolean): void {
    const st = this.st;
    if (!st?.last || !this.asking.has(i)) return;
    if (calls) { this.asking.clear(); call(st, i); this.host.sound(st.shown?.honest ? 'fail' : 'coin'); this.step(); return; }
    this.asking.delete(i);
    this.step();
  }

  private finish(): void {
    const st = this.st!;
    this.bsPhase = 'end';
    const pot = this.bsStake * st.seats.length, w = st.seats[st.winner!];
    if (w.who === 'you' && !this.paidOut) {
      this.paidOut = true;
      if (pot) { this.host.addMarks(pot); this.host.addWon(pot - this.bsStake); }
      this.host.sound('quest');
    } else this.host.sound('fail');
    this.host.persist();
    this.broadcast();
  }

  private cgName(g: CardGameId): string { return g === 'bj' ? 'Blackjack' : g === 'fish' ? 'Go Fish' : 'hold \'em'; }

  // ---- The realm's word between tables ----

  /** A word from a groupmate's table. */
  onNet(from: number, fromName: string, data: unknown): void {
    const m = data as Msg;
    if (!m || typeof m !== 'object' || typeof (m as { k?: unknown }).k !== 'string') return;
    // Blackjack, Go Fish and hold 'em
    if (m.k.startsWith('cg')) {
      const c = data as CgMsg;
      if (c.k === 'cgOpen') {
        if (this.open || !isCard(c.g)) return;
        this.host.ask(`${fromName} is dealing ${this.cgName(c.g)} at ${c.house}${c.stake ? ` for ${c.stake} marks` : ''}. Sit in?`, () => {
          if (c.stake > this.host.marks()) { this.host.system('You haven\'t the marks to sit in.'); return; }
          this.house = { npc: '', house: c.house, hello: '', regulars: [] };
          this.el = document.createElement('div'); this.el.id = 'tavern'; document.body.appendChild(this.el);
          this.game = c.g;
          this.room.sitIn(from, c);
          this.host.sound('open');
          this.render();
        }, () => {}, 20);
        return;
      }
      if (this.room.onNet(from, fromName, c)) this.close();
      return;
    }
    // As a guest
    if (m.k === 'open') {
      if (this.open) return;
      this.host.ask(`${fromName} is dealing BS at ${m.house}${m.stake ? ` for ${m.stake} marks a head` : ''}. Sit in?`, () => {
        if (m.stake > this.host.marks()) { this.host.system('You haven\'t the marks to sit in.'); return; }
        this.guestOf = from; this.guestView = null; this.guestLobby = { seats: [], stake: m.stake, house: m.house };
        this.house = { npc: '', house: m.house, hello: '', regulars: [] };
        this.el = document.createElement('div'); this.el.id = 'tavern'; document.body.appendChild(this.el);
        this.game = 'bs';
        this.host.send(from, { k: 'join' } satisfies Msg);
        this.host.sound('open');
        this.render();
      }, () => {}, 20);
      return;
    }
    if (from === this.guestOf) {
      if (m.k === 'lobby') { this.guestLobby = { seats: m.seats, stake: m.stake, house: m.house }; this.guestView = null; this.pick.clear(); this.render(); }
      else if (m.k === 'view') {
        const first = !this.guestView;
        if (first && this.guestLobby?.stake) this.host.addMarks(-this.guestLobby.stake);
        const v = m.v;
        if (v.winner !== null && v.winner === v.me && this.guestView?.winner === null) {
          const pot = v.stake * v.seats.length;
          if (pot) { this.host.addMarks(pot); this.host.addWon(pot - v.stake); }
          this.host.sound('quest'); this.host.persist();
        }
        for (const c of [...this.pick]) if (!v.hand.includes(c)) this.pick.delete(c);
        this.guestView = v; this.render();
      } else if (m.k === 'close') { this.host.system(`${fromName} has left the table.`); this.guestOf = null; this.close(); }
      return;
    }
    // As the one dealing
    if (m.k === 'join' && this.game === 'bs' && this.bsPhase === 'lobby' && this.guestOf === null) {
      if (this.seatPlan.some((s) => s.peer === from)) return;
      const at = this.seatPlan.map((s) => s.who).lastIndexOf('npc');
      if (at < 0) return;
      this.seatPlan[at] = { name: fromName, who: 'peer', peer: from, nerve: 0, doubt: 0 };
      this.host.system(`${fromName} sits in.`);
      this.lobbyOut(); this.render();
      return;
    }
    const st = this.st, i = st ? st.seats.findIndex((s) => s.who === 'peer' && s.peer === from) : -1;
    if (!st || i < 0) {
      if (m.k === 'leave') { const k = this.seatPlan.findIndex((s) => s.peer === from); if (k > 0) { const r = this.house!.regulars[k - 1] ?? this.house!.regulars[0]; this.seatPlan[k] = { name: r.name, who: 'npc', nerve: r.nerve, doubt: r.doubt }; this.lobbyOut(); this.render(); } }
      return;
    }
    if (m.k === 'play' && st.turn === i && !st.last) this.seatPlays(i, (m.cards ?? []).filter((c) => Number.isInteger(c)).slice(0, 4));
    else if (m.k === 'call') this.answer(i, true);
    else if (m.k === 'pass') this.answer(i, false);
    else if (m.k === 'leave') {
      // (a regular takes up their cards)
      const r = this.house!.regulars[(i - 1 + this.house!.regulars.length) % this.house!.regulars.length];
      st.seats[i] = { ...st.seats[i], who: 'npc', peer: undefined, name: r.name, nerve: r.nerve, doubt: r.doubt };
      st.log.push(`${fromName} leaves the table. ${r.name} picks up their cards.`);
      this.asking.delete(i);
      this.step();
    }
  }
}
