// Three more of the taverns' card games (owner 2026-11-14: "add Black Jack, go fish, poker too"): Blackjack against
// the keeper, Go Fish and Texas hold 'em round the big table with the regulars or the other players. Pure rules and
// the regulars' play, as game/bs.ts is for BS; the table that draws them and passes the word between players is
// game/CardRoom.ts.
//
// Every game keeps, for each seat, what it has put in (paid) and, once the hand is over, what it takes back (payout).
// Each player's own client moves their marks from those two numbers, so a groupmate's table settles the same way the
// dealer's does.

import { RANK_ONE, RANKS, rankOf, sortHand, type Card } from './bs';

export type CardGameId = 'bj' | 'fish' | 'poker';

export interface CgSeat {
  name: string;
  who: 'you' | 'peer' | 'npc';
  peer?: number;
  /** A regular's nerve (bluffing, pressing on) and doubt (here: how well they remember and how hard they read you). */
  nerve: number;
  doubt: number;
}

interface CgBase {
  /** This hand, to tell one from the next. */
  hid: number;
  seats: CgSeat[];
  stake: number;
  log: string[];
  paid: number[];
  /** What each seat takes back, once the hand is over. */
  payout: number[] | null;
}

const shuffle = <T>(a: T[]): T[] => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pack = (): Card[] => shuffle(Array.from({ length: 52 }, (_, i) => i));
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const cardName = (c: Card) => `${RANK_ONE[rankOf(c)]} of ${SUITS[Math.floor(c / 13)]}`;
const base = (seats: CgSeat[], stake: number): CgBase => ({ hid: Math.floor(Math.random() * 1e9), seats: seats.map((s) => ({ ...s })), stake, log: [], paid: seats.map(() => 0), payout: null });
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

// ==================================================================== Blackjack

export type BjStatus = 'play' | 'stand' | 'bust' | 'bj';
export interface BjState extends CgBase {
  game: 'bj';
  deck: Card[];
  hands: Card[][];
  bets: number[];
  status: BjStatus[];
  dealer: Card[];
  /** Whose hand it is (-1: the keeper's, or over). */
  turn: number;
  /** The keeper's second card turned up. */
  reveal: boolean;
}
export type BjAct = 'hit' | 'stand' | 'double';

/** A hand's best count, aces high unless that busts it. */
export function bjTotal(h: Card[]): number {
  let t = 0, aces = 0;
  for (const c of h) { const r = rankOf(c); if (r === 0) { aces++; t += 11; } else t += r >= 9 ? 10 : r + 1; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return t;
}
const bjValue = (c: Card) => { const r = rankOf(c); return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };

function bjDeal(seats: CgSeat[], stake: number): BjState {
  const s: BjState = { ...base(seats, stake), game: 'bj', deck: pack(), hands: seats.map(() => []), bets: seats.map(() => stake), status: seats.map(() => 'play' as BjStatus), dealer: [], turn: -1, reveal: false };
  s.paid = seats.map(() => stake);
  for (let k = 0; k < 2; k++) { for (const h of s.hands) h.push(s.deck.pop()!); s.dealer.push(s.deck.pop()!); }
  s.hands.forEach((h, i) => { if (bjTotal(h) === 21) { s.status[i] = 'bj'; s.log.push(`${s.seats[i].name} turns up blackjack.`); } });
  s.log.push(`The keeper deals, and shows the ${cardName(s.dealer[0])}.`);
  if (bjTotal(s.dealer) === 21) { s.log.push('The keeper turns the other card: blackjack.'); bjSettle(s); return s; }
  bjNext(s, -1);
  return s;
}

function bjNext(s: BjState, from: number): void {
  for (let i = from + 1; i < s.seats.length; i++) if (s.status[i] === 'play') { s.turn = i; return; }
  s.turn = -1;
  // the keeper plays to seventeen, if anyone's still standing to beat
  s.reveal = true;
  s.log.push(`The keeper turns up the ${cardName(s.dealer[1])}: ${bjTotal(s.dealer)}.`);
  if (s.status.some((st) => st === 'stand')) {
    while (bjTotal(s.dealer) < 17) { const c = s.deck.pop()!; s.dealer.push(c); s.log.push(`The keeper draws the ${cardName(c)}: ${bjTotal(s.dealer)}${bjTotal(s.dealer) > 21 ? ', and busts' : ''}.`); }
  }
  bjSettle(s);
}

function bjSettle(s: BjState): void {
  s.reveal = true; s.turn = -1;
  const d = bjTotal(s.dealer), dbj = d === 21 && s.dealer.length === 2;
  s.payout = s.seats.map((_, i) => {
    const b = s.bets[i], t = bjTotal(s.hands[i]);
    if (s.status[i] === 'bj') return dbj ? b : b + Math.floor(b * 1.5);
    if (dbj || s.status[i] === 'bust') return 0;
    return d > 21 || t > d ? b * 2 : t === d ? b : 0;
  });
  s.seats.forEach((seat, i) => {
    const p = s.payout![i], b = s.bets[i];
    s.log.push(`${seat.name}: ${p > b ? `wins ${p - b}` : p === b ? 'a push, stake back' : `loses ${b}`}.`);
  });
}

function bjAct(s: BjState, seat: number, a: BjAct): boolean {
  if (s.payout || s.turn !== seat || s.status[seat] !== 'play') return false;
  const h = s.hands[seat], name = s.seats[seat].name;
  if (a === 'double') {
    if (h.length !== 2) return false;
    s.paid[seat] += s.bets[seat]; s.bets[seat] *= 2;
  }
  if (a === 'hit' || a === 'double') {
    const c = s.deck.pop()!; h.push(c);
    const t = bjTotal(h);
    s.log.push(`${name} ${a === 'double' ? 'doubles, and draws' : 'draws'} the ${cardName(c)}: ${t}${t > 21 ? ', bust' : ''}.`);
    if (t > 21) s.status[seat] = 'bust';
    else if (t === 21 || a === 'double') s.status[seat] = 'stand';
  } else { s.status[seat] = 'stand'; s.log.push(`${name} stands on ${bjTotal(h)}.`); }
  if (s.status[seat] !== 'play') bjNext(s, seat);
  return true;
}

/** Book play, the way a careful carter plays it. */
function bjNpc(s: BjState, seat: number): BjAct {
  const t = bjTotal(s.hands[seat]), up = bjValue(s.dealer[0]);
  if (s.hands[seat].length === 2 && (t === 11 || (t === 10 && up < 10))) return 'double';
  if (t >= 17) return 'stand';
  if (t >= 13 && up <= 6) return 'stand';
  if (t === 12 && up >= 4 && up <= 6) return 'stand';
  return 'hit';
}

// ==================================================================== Go Fish

export interface FishState extends CgBase {
  game: 'fish';
  pond: Card[];
  hands: Card[][];
  /** The ranks each seat has made a book of. */
  books: number[][];
  turn: number;
  /** Ranks each seat has asked for and (as far as the table knows) still holds: what a sharp regular remembers. */
  asked: number[][];
}
export interface FishAct { to: number; rank: number }

function fishDeal(seats: CgSeat[], stake: number): FishState {
  const s: FishState = { ...base(seats, stake), game: 'fish', pond: pack(), hands: seats.map(() => []), books: seats.map(() => []), turn: 0, asked: seats.map(() => []) };
  s.paid = seats.map(() => stake);
  const per = seats.length <= 3 ? 7 : 5;
  for (let k = 0; k < per; k++) for (const h of s.hands) h.push(s.pond.pop()!);
  s.hands.forEach((h) => sortHand(h));
  s.seats.forEach((_, i) => fishBooks(s, i));
  s.log.push(`${per} cards each, the rest in the pond. ${s.seats[0].name} asks first.`);
  return s;
}

/** Any four of a rank go down as a book. */
function fishBooks(s: FishState, i: number): void {
  for (let r = 0; r < 13; r++) {
    if (s.hands[i].filter((c) => rankOf(c) === r).length === 4) {
      s.hands[i] = s.hands[i].filter((c) => rankOf(c) !== r);
      s.books[i].push(r);
      for (const a of s.asked) { const k = a.indexOf(r); if (k >= 0) a.splice(k, 1); }
      s.log.push(`${s.seats[i].name} lays down four ${RANKS[r].toLowerCase()}.`);
    }
  }
}

function fishAct(s: FishState, seat: number, a: FishAct): boolean {
  if (s.payout || s.turn !== seat || !a || !Number.isInteger(a.to) || !Number.isInteger(a.rank)) return false;
  const { to, rank } = a;
  if (to === seat || !s.seats[to] || !s.hands[to].length || !s.hands[seat].some((c) => rankOf(c) === rank)) return false;
  const me = s.seats[seat].name, them = s.seats[to].name, ranks = RANKS[rank].toLowerCase();
  const got = s.hands[to].filter((c) => rankOf(c) === rank);
  let again = false;
  if (!s.asked[seat].includes(rank)) s.asked[seat].push(rank);
  if (got.length) {
    s.hands[to] = s.hands[to].filter((c) => rankOf(c) !== rank);
    s.hands[seat].push(...got);
    const k = s.asked[to].indexOf(rank); if (k >= 0) s.asked[to].splice(k, 1);
    s.log.push(`${me} asks ${them} for ${ranks}. ${them} hands over ${NUM[got.length]}.`);
    again = true;
  } else {
    s.log.push(`${me} asks ${them} for ${ranks}. "Go fish."`);
    const c = s.pond.pop();
    if (c !== undefined) {
      s.hands[seat].push(c);
      if (rankOf(c) === rank) { again = true; s.log.push(`${me} fishes up ${RANK_ONE[rank] === 'eight' || RANK_ONE[rank] === 'ace' ? 'an' : 'a'} ${RANK_ONE[rank]}, and goes again.`); }
    }
  }
  sortHand(s.hands[seat]);
  fishBooks(s, seat);
  fishMove(s, again ? seat : (seat + 1) % s.seats.length);
  return true;
}

/** On to the next who can play: an empty hand draws from the pond, or sits out once it's dry. */
function fishMove(s: FishState, from: number): void {
  const n = s.seats.length;
  if (s.books.reduce((a, b) => a + b.length, 0) >= 13) { fishEnd(s); return; }
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (!s.hands[i].length && s.pond.length) { s.hands[i].push(s.pond.pop()!); }
    if (s.hands[i].length && s.seats.some((_, j) => j !== i && s.hands[j].length)) { s.turn = i; return; }
  }
  fishEnd(s);
}

function fishEnd(s: FishState): void {
  s.turn = -1;
  const most = Math.max(...s.books.map((b) => b.length));
  const win = s.seats.map((_, i) => i).filter((i) => s.books[i].length === most);
  const pot = s.stake * s.seats.length, share = Math.floor(pot / win.length);
  s.payout = s.seats.map((_, i) => (win.includes(i) ? share + (i === win[0] ? pot - share * win.length : 0) : 0));
  s.log.push(win.length === 1 ? `${s.seats[win[0]].name} wins with ${most} books.` : `${win.map((i) => s.seats[i].name).join(' and ')} tie on ${most} books, and share it.`);
}

/** A regular asks: for something they know you hold if they remember it, else for what they hold most of. */
function fishNpc(s: FishState, seat: number): FishAct {
  const mine = new Map<number, number>();
  for (const c of s.hands[seat]) mine.set(rankOf(c), (mine.get(rankOf(c)) ?? 0) + 1);
  const others = s.seats.map((_, i) => i).filter((i) => i !== seat && s.hands[i].length);
  const me = s.seats[seat];
  if (Math.random() < 0.3 + me.doubt * 0.6) {
    const known = others.flatMap((t) => s.asked[t].filter((r) => mine.has(r)).map((r) => ({ to: t, rank: r })));
    if (known.length) return known[Math.floor(Math.random() * known.length)];
  }
  const best = [...mine].sort((a, b) => b[1] - a[1] || Math.random() - 0.5)[0][0];
  return { to: others[Math.floor(Math.random() * others.length)], rank: best };
}

// ==================================================================== Texas hold 'em (fixed limit)

export interface PokerState extends CgBase {
  game: 'poker';
  deck: Card[];
  hole: Card[][];
  board: Card[];
  inHand: boolean[];
  /** 0 before the flop, 1 the flop, 2 the turn, 3 the river, 4 the showdown. */
  street: number;
  /** What each has put in on this street. */
  bet: number[];
  /** Who still has to act this street, in order. */
  need: number[];
  raises: number;
  button: number;
  turn: number;
  /** At the showdown: the hands turned over. */
  shown: { seat: number; name: string }[] | null;
}
export type PokerAct = 'fold' | 'check' | 'call' | 'raise';

export const POKER_CAP = 3;
/** What a bet or raise is on this street: the stake before the turn, twice it after. */
export const pokerSize = (s: PokerState) => (s.street < 2 ? s.stake : s.stake * 2);
export const pokerToCall = (s: PokerState, seat: number) => Math.max(...s.bet) - s.bet[seat];

function pokerDeal(seats: CgSeat[], stake: number, button: number): PokerState {
  const n = seats.length;
  const s: PokerState = { ...base(seats, stake), game: 'poker', deck: pack(), hole: seats.map(() => []), board: [], inHand: seats.map(() => true), street: 0, bet: seats.map(() => 0), need: [], raises: 0, button: button % n, turn: -1, shown: null };
  for (let k = 0; k < 2; k++) for (const h of s.hole) h.push(s.deck.pop()!);
  const sb = n === 2 ? s.button : (s.button + 1) % n, bb = (sb + 1) % n;
  const put = (i: number, m: number) => { s.bet[i] += m; s.paid[i] += m; };
  put(sb, Math.max(1, Math.floor(stake / 2))); put(bb, stake);
  s.log.push(`${seats[s.button].name} has the button. ${seats[sb].name} puts in the small blind, ${seats[bb].name} the big.`);
  s.need = Array.from({ length: n }, (_, k) => (bb + 1 + k) % n);
  s.turn = s.need[0];
  return s;
}

function pokerAct(s: PokerState, seat: number, a: PokerAct): boolean {
  if (s.payout || s.turn !== seat || !s.inHand[seat]) return false;
  const owe = pokerToCall(s, seat), name = s.seats[seat].name;
  const put = (m: number) => { s.bet[seat] += m; s.paid[seat] += m; };
  if (a === 'check' && owe) return false;
  if (a === 'raise' && s.raises >= POKER_CAP) return false;
  s.need = s.need.filter((i) => i !== seat);
  if (a === 'fold') { s.inHand[seat] = false; s.log.push(`${name} folds.`); }
  else if (a === 'check') s.log.push(`${name} checks.`);
  else if (a === 'call') { put(owe); s.log.push(owe ? `${name} calls ${owe}.` : `${name} checks.`); }
  else {
    const opened = Math.max(...s.bet) > 0;
    put(owe + pokerSize(s)); s.raises++;
    s.log.push(opened ? `${name} raises to ${Math.max(...s.bet)}.` : `${name} bets ${Math.max(...s.bet)}.`);
    const n = s.seats.length;
    s.need = Array.from({ length: n - 1 }, (_, k) => (seat + 1 + k) % n).filter((i) => s.inHand[i]);
  }
  const live = s.seats.map((_, i) => i).filter((i) => s.inHand[i]);
  if (live.length === 1) { pokerAward(s, live, null); return true; }
  if (!s.need.length) pokerStreet(s);
  else s.turn = s.need[0];
  return true;
}

function pokerStreet(s: PokerState): void {
  s.street++;
  s.bet = s.bet.map(() => 0); s.raises = 0;
  if (s.street === 4) { pokerShowdown(s); return; }
  const deal = s.street === 1 ? 3 : 1;
  for (let k = 0; k < deal; k++) s.board.push(s.deck.pop()!);
  s.log.push(`${['', 'The flop', 'The turn', 'The river'][s.street]}: ${s.board.slice(-deal).map(cardName).join(', ')}.`);
  const n = s.seats.length;
  s.need = Array.from({ length: n }, (_, k) => (s.button + 1 + k) % n).filter((i) => s.inHand[i]);
  s.turn = s.need[0];
}

function pokerShowdown(s: PokerState): void {
  const live = s.seats.map((_, i) => i).filter((i) => s.inHand[i]);
  const score = live.map((i) => best7([...s.hole[i], ...s.board]));
  const top = Math.max(...score);
  s.shown = live.map((i, k) => ({ seat: i, name: handName(score[k]) }));
  for (const sh of s.shown) s.log.push(`${s.seats[sh.seat].name} shows ${cardName(s.hole[sh.seat][0])} and ${cardName(s.hole[sh.seat][1])}: ${sh.name}.`);
  pokerAward(s, live.filter((_, k) => score[k] === top), handName(top));
}

function pokerAward(s: PokerState, win: number[], how: string | null): void {
  s.turn = -1; s.need = [];
  const pot = s.paid.reduce((a, b) => a + b, 0), share = Math.floor(pot / win.length);
  s.payout = s.seats.map((_, i) => (win.includes(i) ? share + (i === win[0] ? pot - share * win.length : 0) : 0));
  s.log.push(win.length > 1 ? `${win.map((i) => s.seats[i].name).join(' and ')} split the pot of ${pot}${how ? `, each with ${how}` : ''}.` : `${s.seats[win[0]].name} takes the pot of ${pot}${how ? ` with ${how}` : ', and nobody sees the cards'}.`);
}

// ---- What a hand is worth: the category, then the cards that break ties, as one number to compare.

const HAND_NAMES = ['high card', 'a pair', 'two pair', 'three of a kind', 'a straight', 'a flush', 'a full house', 'four of a kind', 'a straight flush'];
const pv = (c: Card) => (rankOf(c) === 0 ? 14 : rankOf(c) + 1);

function eval5(cs: Card[]): number {
  const v = cs.map(pv).sort((a, b) => b - a);
  const flush = cs.length === 5 && cs.every((c) => Math.floor(c / 13) === Math.floor(cs[0] / 13));
  const uniq = [...new Set(v)];
  let straightHi = 0;
  if (uniq.length === 5) { if (v[0] - v[4] === 4) straightHi = v[0]; else if (v[0] === 14 && v[1] === 5) straightHi = 5; }
  const counts = new Map<number, number>();
  for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const kick = groups.map((g) => g[0]);
  let cat: number;
  if (straightHi && flush) { cat = 8; kick.splice(0, kick.length, straightHi); }
  else if (groups[0][1] === 4) cat = 7;
  else if (groups[0][1] === 3 && groups[1]?.[1] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHi) { cat = 4; kick.splice(0, kick.length, straightHi); }
  else if (groups[0][1] === 3) cat = 3;
  else if (groups[0][1] === 2 && groups[1]?.[1] === 2) cat = 2;
  else if (groups[0][1] === 2) cat = 1;
  else cat = 0;
  let n = cat;
  for (let i = 0; i < 5; i++) n = n * 15 + (kick[i] ?? 0);
  return n;
}

/** The best five of up to seven cards. */
export function best7(cs: Card[]): number {
  if (cs.length <= 5) return eval5(cs);
  let best = 0;
  const n = cs.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const five = cs.filter((_, i) => i !== a && i !== b);
    if (five.length === 5) best = Math.max(best, eval5(five));
    else for (let c = b + 1; c < n; c++) best = Math.max(best, eval5(cs.filter((_, i) => i !== a && i !== b && i !== c)));
  }
  return best;
}
export const handName = (score: number) => HAND_NAMES[Math.floor(score / 15 ** 5)];

/** How good a regular thinks their hand is, from nothing to one. */
function strength(s: PokerState, seat: number): number {
  const h = s.hole[seat], [a, b] = h.map(pv).sort((x, y) => y - x);
  if (!s.board.length) {
    let st = (a + b) / 30;
    if (a === b) st = 0.5 + a / 28;
    if (Math.floor(h[0] / 13) === Math.floor(h[1] / 13)) st += 0.06;
    if (a - b === 1) st += 0.04;
    return Math.min(1, st);
  }
  const score = best7([...h, ...s.board]), cat = Math.floor(score / 15 ** 5);
  let st = [0.12 + a / 60, 0.5, 0.72, 0.82, 0.88, 0.9, 0.95, 0.98, 1][cat];
  // a pair that's all on the board is everyone's pair
  if (cat === 1 && best7(s.board) >= 15 ** 5 && Math.floor(best7(s.board) / 15 ** 5) === 1) st = 0.2 + a / 60;
  if (cat >= 1 && cat <= 2 && Math.floor(best7(s.board) / 15 ** 5) === cat) st -= 0.2;
  // four to a flush with a card to come
  if (s.street < 3) { const suits = [0, 1, 2, 3].map((u) => [...h, ...s.board].filter((c) => Math.floor(c / 13) === u).length); if (Math.max(...suits) === 4) st += 0.15; }
  return Math.max(0, Math.min(1, st));
}

function pokerNpc(s: PokerState, seat: number): PokerAct {
  const st = strength(s, seat), owe = pokerToCall(s, seat), me = s.seats[seat];
  const bluff = Math.random() < me.nerve * 0.12;
  if ((st > 0.78 || bluff) && s.raises < POKER_CAP && Math.random() < 0.75) return 'raise';
  if (st > 0.62 && !owe && s.raises < POKER_CAP && Math.random() < 0.4 + me.nerve * 0.3) return 'raise';
  if (!owe) return 'check';
  // (a big pot is worth chasing a little further)
  const pot = s.paid.reduce((x, y) => x + y, 0), odds = owe / (pot + owe);
  if (st > 0.3 + odds * 0.6 || Math.random() < me.nerve * 0.15) return 'call';
  return 'fold';
}

// ==================================================================== The same handles on all three

export type CgState = BjState | FishState | PokerState;

export function cgDeal(g: CardGameId, seats: CgSeat[], stake: number, button = 0): CgState {
  return g === 'bj' ? bjDeal(seats, stake) : g === 'fish' ? fishDeal(seats, stake) : pokerDeal(seats, stake, button);
}
/** The seat that has to act, or null when the hand's over. */
export function cgTurn(s: CgState): number | null { return s.payout || s.turn < 0 ? null : s.turn; }
export function cgAct(s: CgState, seat: number, a: unknown): boolean {
  if (s.game === 'bj') return (a === 'hit' || a === 'stand' || a === 'double') && bjAct(s, seat, a);
  if (s.game === 'fish') return !!a && typeof a === 'object' && fishAct(s, seat, a as FishAct);
  return (a === 'fold' || a === 'check' || a === 'call' || a === 'raise') && pokerAct(s, seat, a);
}
export function cgNpc(s: CgState, seat: number): unknown {
  return s.game === 'bj' ? bjNpc(s, seat) : s.game === 'fish' ? fishNpc(s, seat) : pokerNpc(s, seat);
}
/** For a player who's gone quiet: stand, ask as a regular would, or check (fold if it costs). */
export function cgIdle(s: CgState, seat: number): unknown {
  return s.game === 'bj' ? 'stand' : s.game === 'fish' ? fishNpc(s, seat) : pokerToCall(s, seat) ? 'fold' : 'check';
}

/** What one seat may see: its own cards, and everyone's that are face up. */
export interface CgView {
  game: CardGameId;
  hid: number;
  me: number;
  stake: number;
  seats: { name: string; who: CgSeat['who']; n: number }[];
  log: string[];
  turn: number | null;
  paid: number;
  payout: number | null;
  pot: number;
  hand: Card[];
  // Blackjack
  hands?: Card[][];
  status?: BjStatus[];
  dealer?: (Card | null)[];
  bets?: number[];
  // Go Fish
  books?: number[][];
  pond?: number;
  // Poker
  board?: Card[];
  bet?: number[];
  inHand?: boolean[];
  street?: number;
  button?: number;
  raises?: number;
  owe?: number;
  size?: number;
  shownHoles?: (Card[] | null)[];
  shown?: { seat: number; name: string }[] | null;
  mine?: string;
}

export function cgView(s: CgState, seat: number): CgView {
  const v: CgView = {
    game: s.game, hid: s.hid, me: seat, stake: s.stake, log: s.log.slice(-7), turn: cgTurn(s),
    seats: s.seats.map((x, i) => ({ name: x.name, who: x.who, n: s.game === 'poker' ? s.hole[i].length : s.hands[i].length })),
    paid: s.paid[seat], payout: s.payout ? s.payout[seat] : null, pot: s.paid.reduce((a, b) => a + b, 0), hand: [],
  };
  if (s.game === 'bj') {
    v.hand = [...s.hands[seat]]; v.hands = s.hands.map((h) => [...h]); v.status = [...s.status]; v.bets = [...s.bets];
    v.dealer = s.reveal ? [...s.dealer] : [s.dealer[0], null];
  } else if (s.game === 'fish') {
    v.hand = [...s.hands[seat]]; v.books = s.books.map((b) => [...b]); v.pond = s.pond.length;
  } else {
    v.hand = [...s.hole[seat]]; v.board = [...s.board]; v.bet = [...s.bet]; v.inHand = [...s.inHand]; v.street = s.street; v.button = s.button; v.raises = s.raises;
    v.owe = pokerToCall(s, seat); v.size = pokerSize(s); v.shown = s.shown;
    v.shownHoles = s.seats.map((_, i) => (i === seat || s.shown?.some((x) => x.seat === i) ? [...s.hole[i]] : null));
    v.mine = handName(best7([...s.hole[seat], ...s.board]));
  }
  return v;
}
