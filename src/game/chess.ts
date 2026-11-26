// Chess at the tavern tables (owner 2026-11-15: "add gambling chess like medieval days"). Two ways to play, both
// still argued over in the Counties' taprooms. The old game, as the Counties learned it: the king's counsellor steps
// a single square on the slant, the aufin leaps two on the slant over whatever's between, pawns step one at a time
// and are crowned counsellors; there's no castling, and you win by mate, by leaving your opponent no move at all, or
// by stripping their king bare. And the new game, come up from Callis in living memory: the queen and the bishop sweep
// the board, pawns may start with a double step, the king castles, and a stalemate is a draw. The rules are here; the
// table and the wagering are game/ChessRoom.ts.

export type Side = 'w' | 'b';
export type Rules = 'old' | 'new';
/** A square's piece: upper case white, lower case black (P N B R Q K), or '' for empty. Index = rank * 8 + file, rank 0 white's back rank. */
export type Board = string[];
export interface Move { f: number; t: number; promo?: string; castle?: 'K' | 'Q'; ep?: boolean }
export interface ChessState {
  rules: Rules;
  b: Board;
  turn: Side;
  castle: { K: boolean; Q: boolean; k: boolean; q: boolean };
  /** The square a pawn can be taken on in passing, or -1. */
  ep: number;
  /** Moves since a capture or a pawn moved (fifty each side is a draw). */
  half: number;
  /** How often each position has stood (three times is a draw). */
  seen: Record<string, number>;
  log: string[];
  last: Move | null;
  result: { winner: Side | null; why: string } | null;
}

const FILES = 'abcdefgh';
export const sqName = (i: number) => FILES[i & 7] + ((i >> 3) + 1);
const side = (p: string): Side | null => (!p ? null : p === p.toUpperCase() ? 'w' : 'b');
const other = (s: Side): Side => (s === 'w' ? 'b' : 'w');
const at = (r: number, f: number) => (r >= 0 && r < 8 && f >= 0 && f < 8 ? r * 8 + f : -1);

export function newGame(rules: Rules): ChessState {
  const back = 'RNBQKBNR';
  const b: Board = Array(64).fill('');
  for (let f = 0; f < 8; f++) { b[f] = back[f]; b[8 + f] = 'P'; b[48 + f] = 'p'; b[56 + f] = back[f].toLowerCase(); }
  const s: ChessState = { rules, b, turn: 'w', castle: { K: rules === 'new', Q: rules === 'new', k: rules === 'new', q: rules === 'new' }, ep: -1, half: 0, seen: {}, log: [], last: null, result: null };
  s.seen[key(s)] = 1;
  return s;
}
const key = (s: ChessState) => s.b.map((p) => p || '.').join('') + s.turn + (s.ep >= 0 ? s.ep : '');

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Is square i attacked by side `by`? */
export function attacked(s: ChessState, i: number, by: Side): boolean {
  const b = s.b, r = i >> 3, f = i & 7, old = s.rules === 'old';
  const is = (j: number, kind: string) => j >= 0 && b[j] === (by === 'w' ? kind : kind.toLowerCase());
  // pawns
  const pr = by === 'w' ? r - 1 : r + 1;
  if (is(at(pr, f - 1), 'P') || is(at(pr, f + 1), 'P')) return true;
  for (const [dr, df] of KNIGHT) if (is(at(r + dr, f + df), 'N')) return true;
  for (const [dr, df] of KING) if (is(at(r + dr, f + df), 'K')) return true;
  for (const [dr, df] of ORTH) for (let k = 1; k < 8; k++) { const j = at(r + dr * k, f + df * k); if (j < 0) break; if (b[j]) { if (is(j, 'R') || (!old && is(j, 'Q'))) return true; break; } }
  if (old) {
    // the counsellor, one on the slant; the aufin, two on the slant over anything
    for (const [dr, df] of DIAG) { if (is(at(r + dr, f + df), 'Q')) return true; if (is(at(r + dr * 2, f + df * 2), 'B')) return true; }
  } else {
    for (const [dr, df] of DIAG) for (let k = 1; k < 8; k++) { const j = at(r + dr * k, f + df * k); if (j < 0) break; if (b[j]) { if (is(j, 'B') || is(j, 'Q')) return true; break; } }
  }
  return false;
}
const kingOf = (s: ChessState, sd: Side) => s.b.indexOf(sd === 'w' ? 'K' : 'k');
export const inCheck = (s: ChessState, sd: Side) => { const k = kingOf(s, sd); return k >= 0 && attacked(s, k, other(sd)); };

/** Every move by the side to play, before asking whether it leaves its own king in check. */
function pseudo(s: ChessState): Move[] {
  const out: Move[] = [], b = s.b, me = s.turn, old = s.rules === 'old';
  const add = (f: number, t: number) => { if (t >= 0 && side(b[t]) !== me) out.push({ f, t }); };
  const slide = (i: number, dirs: number[][]) => { const r = i >> 3, f = i & 7; for (const [dr, df] of dirs) for (let k = 1; k < 8; k++) { const j = at(r + dr * k, f + df * k); if (j < 0) break; if (!b[j]) { out.push({ f: i, t: j }); continue; } if (side(b[j]) !== me) out.push({ f: i, t: j }); break; } };
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || side(p) !== me) continue;
    const r = i >> 3, f = i & 7, k = p.toUpperCase();
    if (k === 'P') {
      const dir = me === 'w' ? 1 : -1, last = me === 'w' ? 7 : 0, promo = old ? 'Q' : 'Q';
      const one = at(r + dir, f);
      const push = (t: number, extra: Partial<Move> = {}) => out.push({ f: i, t, ...extra, ...((t >> 3) === last ? { promo: me === 'w' ? promo : promo.toLowerCase() } : {}) });
      if (one >= 0 && !b[one]) {
        push(one);
        const two = at(r + dir * 2, f);
        if (!old && r === (me === 'w' ? 1 : 6) && !b[two]) push(two);
      }
      for (const df of [-1, 1]) { const t = at(r + dir, f + df); if (t < 0) continue; if (b[t] && side(b[t]) !== me) push(t); else if (!old && t === s.ep) push(t, { ep: true }); }
    } else if (k === 'N') for (const [dr, df] of KNIGHT) add(i, at(r + dr, f + df));
    else if (k === 'K') {
      for (const [dr, df] of KING) add(i, at(r + dr, f + df));
      if (!old) {
        const home = me === 'w' ? 4 : 60, cs = me === 'w' ? ['K', 'Q'] : ['k', 'q'];
        if (i === home && !attacked(s, i, other(me))) {
          if (s.castle[cs[0] as 'K'] && !b[i + 1] && !b[i + 2] && !attacked(s, i + 1, other(me)) && !attacked(s, i + 2, other(me))) out.push({ f: i, t: i + 2, castle: 'K' });
          if (s.castle[cs[1] as 'Q'] && !b[i - 1] && !b[i - 2] && !b[i - 3] && !attacked(s, i - 1, other(me)) && !attacked(s, i - 2, other(me))) out.push({ f: i, t: i - 2, castle: 'Q' });
        }
      }
    } else if (k === 'R') slide(i, ORTH);
    else if (k === 'B') { if (old) for (const [dr, df] of DIAG) add(i, at(r + dr * 2, f + df * 2)); else slide(i, DIAG); }
    else if (k === 'Q') { if (old) for (const [dr, df] of DIAG) add(i, at(r + dr, f + df)); else { slide(i, ORTH); slide(i, DIAG); } }
  }
  return out;
}

/** The board after a move, without judging the result (for looking ahead). */
function play(s: ChessState, m: Move): ChessState {
  const b = s.b.slice(), p = b[m.f], me = s.turn, cap = !!b[m.t] || !!m.ep;
  b[m.t] = m.promo ?? p; b[m.f] = '';
  if (m.ep) b[m.t + (me === 'w' ? -8 : 8)] = '';
  if (m.castle === 'K') { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = ''; }
  if (m.castle === 'Q') { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = ''; }
  const c = { ...s.castle };
  const touch = (i: number) => { if (i === 4) c.K = c.Q = false; if (i === 60) c.k = c.q = false; if (i === 0) c.Q = false; if (i === 7) c.K = false; if (i === 56) c.q = false; if (i === 63) c.k = false; };
  touch(m.f); touch(m.t);
  const pawn = p.toUpperCase() === 'P';
  return { ...s, b, turn: other(me), castle: c, ep: pawn && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) / 2 : -1, half: pawn || cap ? 0 : s.half + 1, last: m };
}

export function legalMoves(s: ChessState): Move[] {
  if (s.result) return [];
  return pseudo(s).filter((m) => !inCheck(play(s, m), s.turn));
}

const PIECE_NAME: Record<Rules, Record<string, string>> = {
  old: { P: '', N: 'N', B: 'A', R: 'R', Q: 'C', K: 'K' },
  new: { P: '', N: 'N', B: 'B', R: 'R', Q: 'Q', K: 'K' },
};
/** What a piece is called under the rules being played. */
export const pieceWord = (p: string, rules: Rules) => ({ P: 'pawn', N: 'knight', B: rules === 'old' ? 'aufin' : 'bishop', R: 'rook', Q: rules === 'old' ? 'counsellor' : 'queen', K: 'king' })[p.toUpperCase()] ?? '';

/** Make a move: the new state with the game judged (mate, a stalemate, a bare king, the draws). Null if it isn't legal. */
export function move(s: ChessState, m: Move): ChessState | null {
  const legal = legalMoves(s).find((x) => x.f === m.f && x.t === m.t && (!x.promo || !m.promo || x.promo.toUpperCase() === m.promo.toUpperCase()));
  if (!legal) return null;
  const mv = { ...legal, ...(legal.promo && m.promo ? { promo: s.turn === 'w' ? m.promo.toUpperCase() : m.promo.toLowerCase() } : {}) };
  const cap = !!s.b[mv.t] || !!mv.ep, p = s.b[mv.f];
  const n = play(s, mv);
  const k = key(n);
  n.seen = { ...s.seen, [k]: (s.seen[k] ?? 0) + 1 };
  const replies = legalMoves(n), check = inCheck(n, n.turn);
  let note = mv.castle === 'K' ? 'O-O' : mv.castle === 'Q' ? 'O-O-O' : `${PIECE_NAME[s.rules][p.toUpperCase()] || (cap ? sqName(mv.f)[0] : '')}${cap ? 'x' : ''}${sqName(mv.t)}${mv.promo ? '=' + PIECE_NAME[s.rules][mv.promo.toUpperCase()] : ''}`;
  const me = s.turn, them = n.turn, name = (sd: Side) => (sd === 'w' ? 'White' : 'Black');
  const bare = (sd: Side) => n.b.every((q) => !q || side(q) !== sd || q.toUpperCase() === 'K');
  if (!replies.length && check) { n.result = { winner: me, why: `Checkmate. ${name(me)} wins.` }; note += '#'; }
  else if (!replies.length) n.result = s.rules === 'old' ? { winner: me, why: `${name(them)} has no move left, and by the old rules that's a win for ${name(me)}.` } : { winner: null, why: 'Stalemate: a draw.' };
  else if (s.rules === 'old' && bare(them) && !bare(me)) n.result = { winner: me, why: `${name(them)}'s king is stripped bare. ${name(me)} wins.` };
  else if (bare('w') && bare('b')) n.result = { winner: null, why: 'Two bare kings: a draw.' };
  else if (s.rules === 'new' && n.b.filter((q) => q).length === 3 && n.b.some((q) => q && 'NBnb'.includes(q))) n.result = { winner: null, why: 'Not enough left on the board to mate: a draw.' };
  else if (n.half >= 100) n.result = { winner: null, why: 'Fifty moves each without a capture or a pawn moved: a draw.' };
  else if (n.seen[k] >= 3) n.result = { winner: null, why: 'The same position a third time: a draw.' };
  if (check && !n.result) note += '+';
  n.log = [...s.log, note];
  return n;
}

/** Give up the game. */
export function resign(s: ChessState, who: Side): ChessState {
  return { ...s, result: { winner: other(who), why: `${who === 'w' ? 'White' : 'Black'} gives up the game.` } };
}

// ---------------------------------------------------------------- The regulars' play
const VALUE: Record<Rules, Record<string, number>> = {
  old: { P: 100, N: 300, B: 140, R: 500, Q: 190, K: 0 },
  new: { P: 100, N: 310, B: 325, R: 500, Q: 900, K: 0 },
};
const CENTRE = (i: number) => { const r = i >> 3, f = i & 7; return 6 - (Math.abs(3.5 - r) + Math.abs(3.5 - f)); };

/** The position from the side to move's point of view. */
function evaluate(s: ChessState): number {
  let v = 0;
  const val = VALUE[s.rules];
  for (let i = 0; i < 64; i++) {
    const p = s.b[i];
    if (!p) continue;
    const k = p.toUpperCase(), w = p === k;
    let x = val[k];
    if (k === 'N' || k === 'B' || k === 'Q') x += CENTRE(i) * 4;
    if (k === 'P') x += (w ? i >> 3 : 7 - (i >> 3)) * 6 + CENTRE(i) * 2;
    v += w ? x : -x;
  }
  return s.turn === 'w' ? v : -v;
}

function search(s: ChessState, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s, s.turn) ? -100000 - depth : s.rules === 'old' ? -90000 : 0;
  if (depth <= 0) return evaluate(s);
  // captures first, so the cut-offs come early
  moves.sort((a, b) => (s.b[b.t] ? VALUE[s.rules][s.b[b.t].toUpperCase()] : 0) - (s.b[a.t] ? VALUE[s.rules][s.b[a.t].toUpperCase()] : 0));
  for (const m of moves) {
    const v = -search(play(s, m), depth - 1, -beta, -alpha);
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return alpha;
}

/**
 * A regular's move: how far they look ahead (1 to 3), and how loose their judgement is (centipawns of noise). A slip
 * (owner 2026-11-23, a friend's feedback: "careful, but still makes mistakes") is a human one: a move a good deal worse
 * than their best, between a minor piece's worth and a rook's, but never one that hands over mate on the spot.
 */
export function npcMove(s: ChessState, depth: number, noise: number, slip = false): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const scored: { m: Move; v: number }[] = [];
  for (const m of moves) {
    const n = play(s, m);
    // (a move that finishes the game is seen for what it is)
    const done = legalMoves(n).length === 0;
    scored.push({ m, v: done ? (inCheck(n, n.turn) || s.rules === 'old' ? 200000 : 0) : -search(n, depth - 1, -Infinity, Infinity) + (Math.random() - 0.5) * noise });
  }
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0];
  if (slip && best.v < 50000) {
    const worse = scored.filter((x) => x.v <= best.v - 60 && x.v >= best.v - 350 && x.v > -50000);
    if (worse.length) return worse[Math.floor(Math.random() * Math.min(3, worse.length))].m;
  }
  return best.m;
}
