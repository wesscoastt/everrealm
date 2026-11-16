import { HOUSE_DAILY_LIMIT, type BsRegular, type GamingHouse } from '../data/tavernGames';
import { inCheck, legalMoves, move, newGame, npcMove, pieceWord, resign, sqName, type ChessState, type Move, type Rules, type Side } from './chess';
import type { TavernHost } from './TavernTable';

// Chess for marks at the keeper's table (owner 2026-11-15: "add gambling chess like medieval days"); the rules are
// game/chess.ts. Against one of the house's regulars, each of whom plays their own kind of game, or against another
// player in the taproom (owner 2026-10-31: every activity works in a group). Both lay the stake before the first move;
// the winner takes both, a draw hands each their own back. With another player, each table keeps the same game: only
// the moves pass between you, and each table checks every move it's sent against the rules.

export type ChMsg =
  | { k: 'chOpen'; rules: Rules; stake: number; house: string }
  | { k: 'chJoin' }
  | { k: 'chStart'; you: Side; rules: Rules; stake: number }
  | { k: 'chMove'; m: Move }
  | { k: 'chResign' }
  | { k: 'chLeave' };

export const CHESS_STAKES = [0, 10, 25, 50, 100];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

/** How a regular plays: how far ahead they look, how loose their judgement is, and the most they'll play for. */
const style = (r: BsRegular) => (r.nerve >= 0.75 ? { depth: 3, noise: 12, most: 100, says: 'plays a long, deep game' } : r.nerve >= 0.45 ? { depth: 2, noise: 30, most: 50, says: 'plays a careful game' } : { depth: 1, noise: 90, most: 25, says: 'plays a loose, cheerful game' });

const HELP: Record<Rules, string> = {
  old: 'The old game, as the Counties learned it. The king steps one square any way. The counsellor, beside him, steps one square on the slant and no further. The aufin leaps exactly two squares on the slant, over whatever is between. Knights and rooks move as they always have. Pawns step one square forward and take one on the slant; one that reaches the far side is crowned a counsellor. No castling. You win by mate, by leaving your opponent no move at all, or by taking every piece but their king.',
  new: 'The new game, come up from Callis. The queen sweeps any distance straight or on the slant, the bishop any distance on the slant. A pawn may step two from where it starts and can be taken in passing; one that reaches the far side becomes a queen. The king may castle. Mate wins; a stalemate, fifty moves without a capture or a pawn moving, or the same position three times, is a draw.',
};

export class ChessRoom {
  private phase: 'lobby' | 'play' = 'lobby';
  private rules: Rules = 'old';
  private stake = 10;
  private foe = 0;
  private st: ChessState | null = null;
  private me: Side = 'w';
  /** Who's across the board: a regular (by name), or another player (by their id). */
  private opp: { name: string; peer?: number; depth: number; noise: number } | null = null;
  private pick: number | null = null;
  private timer = 0;
  private paid = false;
  private settled = false;
  /** Asked another player to a game, and waiting for them. */
  private asked: number[] = [];
  private say = '';

  constructor(private host: TavernHost, private house: () => GamingHouse | null, private redraw: () => void) {}

  get playing(): boolean { return this.phase === 'play'; }
  private shut(): boolean { return this.host.won() >= HOUSE_DAILY_LIMIT; }
  private regulars(): BsRegular[] { return this.house()?.regulars ?? []; }
  private most(): number { const r = this.regulars()[this.foe]; return r ? style(r).most : 100; }

  begin(): void { this.leave(); this.phase = 'lobby'; this.say = ''; }

  /** Up from the board: a game in hand is given up. */
  leave(): void {
    clearTimeout(this.timer);
    if (this.phase === 'play' && this.st && !this.st.result) {
      if (this.opp?.peer !== undefined) this.host.send(this.opp.peer, { k: 'chLeave' } satisfies ChMsg);
      this.finish(resign(this.st, this.me));
    }
    this.st = null; this.opp = null; this.pick = null; this.asked = []; this.phase = 'lobby';
  }

  // ---- Starting a game ----

  private startWith(opp: { name: string; peer?: number; depth: number; noise: number }, me: Side, rules: Rules, stake: number): boolean {
    if (stake > this.host.marks()) { this.host.system('You haven\'t the marks for that stake.'); return false; }
    this.opp = opp; this.me = me; this.rules = rules; this.stake = stake;
    this.st = newGame(rules);
    this.phase = 'play'; this.pick = null; this.settled = false; this.paid = false; this.say = '';
    if (stake) { this.host.addMarks(-stake); this.paid = true; this.host.persist(); }
    this.host.sound('shuffle');
    this.st.log = [];
    this.npcTurn();
    this.redraw();
    return true;
  }

  private sitDown(): void {
    const r = this.regulars()[this.foe];
    if (!r) return;
    if (this.stake && this.shut()) return;
    const s = style(r);
    this.startWith({ name: r.name, depth: s.depth, noise: s.noise }, Math.random() < 0.5 ? 'w' : 'b', this.rules, Math.min(this.stake, s.most));
  }

  /** The regular's move, after a moment's thought. */
  private npcTurn(): void {
    clearTimeout(this.timer);
    const st = this.st, o = this.opp;
    if (!st || !o || o.peer !== undefined || st.result || st.turn === this.me) return;
    this.timer = window.setTimeout(() => {
      if (this.st !== st) return;
      const m = npcMove(st, o.depth, o.noise);
      if (m) this.apply(m, false);
    }, 700 + Math.random() * 900);
  }

  /** A move on the board, yours or theirs. */
  private apply(m: Move, mine: boolean): boolean {
    const st = this.st;
    if (!st || st.result) return false;
    const n = move(st, m);
    if (!n) return false;
    this.st = n;
    this.host.sound(st.b[m.t] ? 'coin' : 'card');
    if (mine && this.opp?.peer !== undefined) this.host.send(this.opp.peer, { k: 'chMove', m } satisfies ChMsg);
    if (n.result) this.finish(n);
    else this.npcTurn();
    this.redraw();
    return true;
  }

  /** The game's over: the stakes go to the winner, or back to each on a draw. */
  private finish(n: ChessState): void {
    this.st = n;
    if (this.settled) return;
    this.settled = true;
    clearTimeout(this.timer);
    const won = n.result?.winner === this.me, drawn = n.result?.winner === null, peer = this.opp?.peer !== undefined;
    if (this.paid) {
      if (won) this.host.addMarks(this.stake * 2);
      else if (drawn) this.host.addMarks(this.stake);
      // (only the house's marks count toward what the house lets you take in a day)
      if (!peer) this.host.addWon(won ? this.stake : drawn ? 0 : -this.stake);
    }
    if (won) { this.host.bump('tableWins'); this.host.bump('chessWins'); }
    this.host.sound(won ? 'quest' : drawn ? 'click' : 'fail');
    const who = this.opp?.name ?? 'They';
    this.say = won ? (peer ? `${who} tips their king over.` : `${who} looks at the board a long time, then pushes the marks across.`) : drawn ? `${who} shrugs. Each takes their own stake back.` : peer ? '' : `${who} sweeps up the marks, and is kind enough not to say anything.`;
    this.host.persist();
  }

  // ---- The word between tables ----

  /** Invited to a game by another player, and said yes. */
  sitIn(from: number, m: Extract<ChMsg, { k: 'chOpen' }>): void {
    this.leave();
    this.rules = m.rules; this.stake = m.stake;
    this.asked = [from];
    this.say = 'Waiting for them to set out the pieces.';
    this.host.send(from, { k: 'chJoin' } satisfies ChMsg);
  }

  onNet(from: number, fromName: string, m: ChMsg): void {
    if (m.k === 'chJoin' && this.phase === 'lobby' && this.asked.includes(from)) {
      const theirs: Side = Math.random() < 0.5 ? 'w' : 'b';
      if (this.startWith({ name: fromName, peer: from, depth: 0, noise: 0 }, theirs === 'w' ? 'b' : 'w', this.rules, this.stake)) this.host.send(from, { k: 'chStart', you: theirs, rules: this.rules, stake: this.stake } satisfies ChMsg);
      return;
    }
    if (m.k === 'chStart' && this.phase === 'lobby' && this.asked.includes(from)) {
      if (!this.startWith({ name: fromName, peer: from, depth: 0, noise: 0 }, m.you === 'b' ? 'b' : 'w', m.rules === 'new' ? 'new' : 'old', Math.max(0, Math.min(100, Number(m.stake) || 0)))) this.host.send(from, { k: 'chLeave' } satisfies ChMsg);
      return;
    }
    if (m.k === 'chJoin' && this.phase === 'play' && this.opp?.peer !== from) { this.host.send(from, { k: 'chLeave' } satisfies ChMsg); return; }
    if (m.k === 'chLeave' && this.phase === 'lobby' && this.asked.includes(from)) { this.asked = this.asked.filter((x) => x !== from); this.say = `${fromName} is playing someone else.`; this.redraw(); return; }
    if (this.phase !== 'play' || this.opp?.peer !== from || !this.st) return;
    if (m.k === 'chMove' && m.m && this.st.turn !== this.me) { if (!this.apply({ f: Number(m.m.f), t: Number(m.m.t), promo: m.m.promo }, false)) this.host.system('That move didn\'t fit the board here.'); }
    else if (m.k === 'chResign' || m.k === 'chLeave') { if (!this.st.result) { this.finish(resign(this.st, this.me === 'w' ? 'b' : 'w')); this.say = m.k === 'chLeave' ? `${fromName} has got up from the board, and the game is yours.` : `${fromName} tips their king over.`; this.redraw(); } }
  }

  // ---- Drawing ----

  html(): string {
    return this.phase === 'lobby' ? this.lobbyHtml() : this.boardHtml();
  }

  private lobbyHtml(): string {
    const regs = this.regulars(), shut = this.shut(), mates = this.host.mates();
    if (this.foe >= regs.length) this.foe = 0;
    if (this.stake > this.most()) this.stake = CHESS_STAKES.filter((s) => s <= this.most()).pop() ?? 0;
    const rulesBtn = (r: Rules, name: string) => `<button class="ch-rule${this.rules === r ? ' on' : ''}" data-chrules="${r}">${name}</button>`;
    return `<p class="tv-help">${HELP[this.rules]}</p>
      <div class="tv-foot"><span class="tv-chips">Rules: ${rulesBtn('old', 'The old game')}${rulesBtn('new', 'The new game')}</span></div>
      <div class="tv-seats ch-foes">${regs.map((r, i) => `<button class="${i === this.foe ? 'you' : ''}" data-chfoe="${i}"><b>${esc(r.name)}</b><small>${style(r).says}; up to ${style(r).most} marks</small></button>`).join('')}</div>
      <div class="tv-foot"><span class="tv-chips">Stake: ${CHESS_STAKES.map((s) => `<button class="tv-chip${s === this.stake ? ' on' : ''}" data-chstake="${s}"${(s && shut) || s > this.host.marks() || s > this.most() ? ' disabled' : ''}>${s || 'Nothing'}</button>`).join('')}</span>
      ${mates.length ? `<button class="btn ghost" data-chinvite>Ask ${mates.length === 1 ? esc(mates[0].name) : `the ${mates.length} players here`} to play</button>` : ''}
      <button class="btn" data-chsit${regs.length && this.stake <= this.host.marks() && !(this.stake && shut) ? '' : ' disabled'}>Play ${esc(regs[this.foe]?.name ?? '')}</button></div>
      ${this.say ? `<p class="tv-note">${esc(this.say)}</p>` : ''}
      ${shut ? '<p class="tv-note">The house has paid you all it will today: the regulars will only play for nothing. A game with another player is your own affair.</p>' : '<p class="tv-note">The winner takes both stakes; a draw hands each their own back. A game against another player stakes the same for both.</p>'}`;
  }

  private boardHtml(): string {
    const st = this.st!, live = !st.result && st.turn === this.me;
    const targets = new Set(live && this.pick !== null ? legalMoves(st).filter((m) => m.f === this.pick).map((m) => m.t) : []);
    const movable = new Set(live ? legalMoves(st).map((m) => m.f) : []);
    const checkSq = !st.result && inCheck(st, st.turn) ? st.b.indexOf(st.turn === 'w' ? 'K' : 'k') : -1;
    const rows: string[] = [];
    for (let rr = 7; rr >= 0; rr--) {
      const r = this.me === 'w' ? rr : 7 - rr;
      const cells: string[] = [];
      for (let ff = 0; ff < 8; ff++) {
        const f = this.me === 'w' ? ff : 7 - ff, i = r * 8 + f, p = st.b[i];
        const cls = ['ch-sq', (r + f) % 2 ? 'lt' : 'dk', this.pick === i ? 'sel' : '', targets.has(i) ? (p ? 'take' : 'to') : '', st.last && (st.last.f === i || st.last.t === i) ? 'last' : '', i === checkSq ? 'check' : '', movable.has(i) ? 'can' : ''].filter(Boolean).join(' ');
        const piece = p ? `<span class="ch-pc ${p === p.toUpperCase() ? 'w' : 'b'}${st.last?.t === i ? ' moved' : ''}">${GLYPH[p.toUpperCase()]}</span>` : '';
        const coords = `${ff === 0 ? `<i class="rk">${r + 1}</i>` : ''}${rr === 0 ? `<i class="fl">${'abcdefgh'[f]}</i>` : ''}`;
        cells.push(`<button class="${cls}" data-sq="${i}" title="${sqName(i)}${p ? ' ' + pieceWord(p, st.rules) : ''}">${piece}${coords}</button>`);
      }
      rows.push(cells.join(''));
    }
    const name = this.opp?.name ?? '', pairs: string[] = [];
    for (let k = 0; k < st.log.length; k += 2) pairs.push(`<li><em>${k / 2 + 1}.</em> ${st.log[k]} ${st.log[k + 1] ?? ''}</li>`);
    const why = st.result ? st.result.why.replace(`${this.me === 'w' ? 'White' : 'Black'} gives up the game.`, 'You give up the game.').replace(`${this.me === 'w' ? 'Black' : 'White'} gives up the game.`, `${this.opp?.name ?? 'They'} gives up the game.`) : '';
    const status = st.result ? `${esc(why)} ${st.result.winner === this.me ? `You win${this.stake ? ` ${this.stake * 2} marks` : ''}.` : st.result.winner === null ? '' : this.stake ? `You lose your ${this.stake}.` : ''}` : live ? `Your move, with the ${this.me === 'w' ? 'white' : 'black'} pieces.${checkSq >= 0 ? ' You\'re in check.' : ''}` : `${esc(name)} is thinking…`;
    return `<div class="ch-wrap"><div class="ch-board${this.me === 'b' ? ' flip' : ''}">${rows.join('')}</div>
      <div class="ch-side"><div class="tv-seats"><span class="${this.me === 'w' ? 'you' : ''}">White: ${this.me === 'w' ? 'you' : esc(name)}</span><span class="${this.me === 'b' ? 'you' : ''}">Black: ${this.me === 'b' ? 'you' : esc(name)}</span></div>
      <p class="tv-note">${st.rules === 'old' ? 'The old game' : 'The new game'}${this.stake ? `, for ${this.stake} marks each` : ', for nothing'}.</p>
      <ol class="tv-log ch-log">${pairs.slice(-14).join('')}</ol>
      ${this.say ? `<p class="tv-say">${esc(this.say)}</p>` : ''}</div></div>
      <div class="tv-foot"><span class="tv-status">${status}</span>${st.result ? '<button class="btn" data-chagain>Another game</button>' : '<button class="btn ghost" data-chresign>Give up the game</button>'}</div>`;
  }

  wire(el: HTMLElement): void {
    el.querySelectorAll<HTMLElement>('[data-chrules]').forEach((b) => b.addEventListener('click', () => { this.rules = b.dataset.chrules === 'new' ? 'new' : 'old'; this.host.sound('click'); this.redraw(); }));
    el.querySelectorAll<HTMLElement>('[data-chfoe]').forEach((b) => b.addEventListener('click', () => { this.foe = Number(b.dataset.chfoe); this.host.sound('click'); this.redraw(); }));
    el.querySelectorAll<HTMLElement>('[data-chstake]').forEach((b) => b.addEventListener('click', () => { this.stake = Number(b.dataset.chstake); this.host.sound('coin'); this.redraw(); }));
    el.querySelector('[data-chsit]')?.addEventListener('click', () => this.sitDown());
    el.querySelector('[data-chinvite]')?.addEventListener('click', () => {
      const mates = this.host.mates();
      this.asked = mates.map((m) => m.id);
      for (const m of mates) this.host.send(m.id, { k: 'chOpen', rules: this.rules, stake: this.stake, house: this.house()?.house ?? '' } satisfies ChMsg);
      this.say = mates.length ? `You ask ${mates.map((m) => m.name).join(' and ')} to a game. The first to sit down plays.` : 'There\'s nobody near enough to ask.';
      this.redraw();
    });
    el.querySelector('[data-chagain]')?.addEventListener('click', () => { this.st = null; this.opp = null; this.phase = 'lobby'; this.say = ''; this.redraw(); });
    el.querySelector('[data-chresign]')?.addEventListener('click', () => {
      const st = this.st;
      if (!st || st.result) return;
      if (this.opp?.peer !== undefined) this.host.send(this.opp.peer, { k: 'chResign' } satisfies ChMsg);
      this.finish(resign(st, this.me));
      this.redraw();
    });
    el.querySelectorAll<HTMLElement>('[data-sq]').forEach((b) => b.addEventListener('click', () => {
      const st = this.st, i = Number(b.dataset.sq);
      if (!st || st.result || st.turn !== this.me) return;
      if (this.pick !== null && legalMoves(st).some((m) => m.f === this.pick && m.t === i)) { const f = this.pick; this.pick = null; this.apply({ f, t: i }, true); return; }
      this.pick = legalMoves(st).some((m) => m.f === i) ? (this.pick === i ? null : i) : null;
      this.host.sound('click');
      this.redraw();
    }));
  }
}
