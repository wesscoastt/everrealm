// BS, the tavern card game (the table is game/TavernTable.ts): the whole pack dealt round, and each in turn
// lays one to four cards face down and says they're the rank that's due (aces, then twos, on up to kings
// and round again). Anyone may call it. A liar takes up the pile; call wrong and you take it yourself.
// First to an empty hand, with the last cards standing up to a call, wins the pot.
//
// Pure rules and the regulars' play; nothing here draws or talks to the realm.

/** A card: 0 to 51. Its rank is card % 13 (0 an ace, 12 a king), its suit card / 13. */
export type Card = number;
export const rankOf = (c: Card): number => c % 13;
export const RANKS = ['Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings'];
export const RANK_ONE = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
export const FACE = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUIT = ['♠', '♥', '♦', '♣'];

export interface BsSeat {
  name: string;
  /** Who sits here: you, a groupmate (their realm id), or one of the regulars. */
  who: 'you' | 'peer' | 'npc';
  peer?: number;
  /** A regular's nerve (how often they lie when they needn't) and doubt (how quick they are to call). */
  nerve: number;
  doubt: number;
  hand: Card[];
}

export interface BsPlay { seat: number; cards: Card[]; claim: number }

export interface BsState {
  seats: BsSeat[];
  pile: Card[];
  /** Whose turn it is to lay. */
  turn: number;
  /** The rank that's due. */
  need: number;
  /** The last laying, while it can still be called. */
  last: BsPlay | null;
  /** What's happened, newest last. */
  log: string[];
  winner: number | null;
  /** The last call shown face up: the cards, and whether they were what was said. */
  shown: { cards: Card[]; honest: boolean; caller: number; taker: number } | null;
}

const shuffle = <T>(a: T[]): T[] => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sortHand = (h: Card[]): Card[] => h.sort((a, b) => rankOf(a) - rankOf(b) || a - b);

/** Deal the pack round the table; whoever holds the ace of spades lays first. */
export function deal(seats: Omit<BsSeat, 'hand'>[]): BsState {
  const pack = shuffle(Array.from({ length: 52 }, (_, i) => i));
  const st: BsState = { seats: seats.map((s) => ({ ...s, hand: [] })), pile: [], turn: 0, need: 0, last: null, log: [], winner: null, shown: null };
  pack.forEach((c, i) => st.seats[i % seats.length].hand.push(c));
  st.seats.forEach((s) => sortHand(s.hand));
  st.turn = Math.max(0, st.seats.findIndex((s) => s.hand.includes(0)));
  st.log.push(`${st.seats[st.turn].name} has the ace of spades, and lays first.`);
  return st;
}

/** Lay cards, saying they're the rank that's due. */
export function lay(st: BsState, seat: number, cards: Card[]): boolean {
  if (st.winner !== null || st.last || seat !== st.turn || cards.length < 1 || cards.length > 4) return false;
  const s = st.seats[seat];
  if (!cards.every((c) => s.hand.includes(c))) return false;
  s.hand = s.hand.filter((c) => !cards.includes(c));
  st.pile.push(...cards);
  st.last = { seat, cards: [...cards], claim: st.need };
  st.shown = null;
  st.log.push(`${s.name} lays ${cards.length === 1 ? 'one' : ['', '', 'two', 'three', 'four'][cards.length]}: "${cards.length === 1 ? `One ${RANK_ONE[st.need]}` : `${['', '', 'Two', 'Three', 'Four'][cards.length]} ${RANKS[st.need].toLowerCase()}`}."`);
  return true;
}

/** Someone calls it: the cards turn over, and the pile goes to whoever was wrong. */
export function call(st: BsState, caller: number): void {
  const p = st.last;
  if (!p || caller === p.seat) return;
  const honest = p.cards.every((c) => rankOf(c) === p.claim);
  const taker = honest ? caller : p.seat;
  st.seats[taker].hand.push(...st.pile);
  sortHand(st.seats[taker].hand);
  st.log.push(`${st.seats[caller].name} calls it. ${honest ? `They were ${RANKS[p.claim].toLowerCase()}, every one. ${st.seats[caller].name} takes up the pile.` : `${st.seats[p.seat].name} was lying, and takes up the pile.`} (${st.pile.length} card${st.pile.length === 1 ? '' : 's'})`);
  st.shown = { cards: p.cards, honest, caller, taker };
  st.pile = [];
  st.last = null;
  // (an honest last laying goes out on the call it stood up to)
  if (honest && !st.seats[p.seat].hand.length) { st.winner = p.seat; return; }
  st.need = (p.claim + 1) % 13;
  st.turn = (p.seat + 1) % st.seats.length;
}

/** Nobody calls: the laying stands, and the next seat is due the next rank. */
export function letStand(st: BsState): void {
  const p = st.last;
  if (!p) return;
  st.last = null;
  if (!st.seats[p.seat].hand.length) { st.winner = p.seat; st.log.push(`Nobody calls it. ${st.seats[p.seat].name} is out of cards, and wins.`); return; }
  st.need = (p.claim + 1) % 13;
  st.turn = (p.seat + 1) % st.seats.length;
}

/** A regular lays: the truth when they have it (now and then a stray card slipped in), a lie when they don't. */
export function npcLay(st: BsState, seat: number): Card[] {
  const s = st.seats[seat], need = st.need;
  const true_ = s.hand.filter((c) => rankOf(c) === need);
  // (the ranks coming round soonest are worth keeping: lie with the ones furthest off)
  const far = s.hand.filter((c) => rankOf(c) !== need).sort((a, b) => ((rankOf(b) - need + 13) % 13) - ((rankOf(a) - need + 13) % 13));
  if (true_.length) {
    const out = true_.slice(0, 4);
    if (out.length < 4 && far.length && s.hand.length > out.length + 1 && Math.random() < s.nerve * 0.45) out.push(far[0]);
    return out;
  }
  const n = s.hand.length <= 2 ? s.hand.length : Math.random() < s.nerve * 0.5 ? 2 : 1;
  return far.slice(0, Math.max(1, n));
}

/** Would a regular call the last laying? */
export function npcDoubts(st: BsState, seat: number): boolean {
  const p = st.last;
  if (!p || p.seat === seat) return false;
  const s = st.seats[seat];
  const held = s.hand.filter((c) => rankOf(c) === p.claim).length;
  if (held + p.cards.length > 4) return true; // (there aren't that many in the pack)
  const goingOut = st.seats[p.seat].hand.length === 0;
  if (goingOut) return Math.random() < 0.55 + s.doubt * 0.4;
  const pileFear = Math.min(0.5, st.pile.length / 40); // (a big pile makes anyone careful)
  const chance = s.doubt * (0.04 + 0.11 * (p.cards.length - 1) + 0.14 * held) * (1 - pileFear);
  return Math.random() < chance;
}
