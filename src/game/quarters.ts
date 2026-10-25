// Quarters: the tavern game of nine squares (data/cards.ts has the tiles, game/QuartersTable.ts the table).
//
// Two players, five tiles each, a board of three by three. Each tile has a number on each of its four
// sides. You lay a tile on an empty square; every one of the other player's tiles touching it whose
// facing side is lower than yours turns to your colour. When the board is full, whoever has more tiles
// (on the board, and the one left in hand) wins. Pure rules, no drawing: the table and the tests use it.

/** A tile's four sides: top, right, bottom, left. */
export type Edges = [number, number, number, number];
export interface Tile { id: string; edges: Edges }
export type Side = 0 | 1;
export interface Square { tile: Tile; owner: Side }

export interface QState {
  board: (Square | null)[];
  hands: [Tile[], Tile[]];
  turn: Side;
}

/** Each square's neighbours: [direction from this square (0 top .. 3 left), neighbour index]. */
const NEIGHBOURS: [number, number][][] = Array.from({ length: 9 }, (_, i) => {
  const x = i % 3, y = Math.floor(i / 3), out: [number, number][] = [];
  if (y > 0) out.push([0, i - 3]);
  if (x < 2) out.push([1, i + 1]);
  if (y < 2) out.push([2, i + 3]);
  if (x > 0) out.push([3, i - 1]);
  return out;
});
const OPPOSITE = [2, 3, 0, 1];

export function newGame(a: Tile[], b: Tile[], first: Side): QState {
  return { board: Array(9).fill(null), hands: [a.slice(), b.slice()], turn: first };
}

export const over = (s: QState) => s.board.every((c) => c);

/** Lay the tile at hand index `h` on square `at`: a new state, and the squares that turned. */
export function play(s: QState, h: number, at: number): { state: QState; turned: number[] } {
  if (s.board[at] || !s.hands[s.turn][h]) throw new Error('quarters: illegal move');
  const tile = s.hands[s.turn][h];
  const board = s.board.slice();
  board[at] = { tile, owner: s.turn };
  const turned: number[] = [];
  for (const [dir, n] of NEIGHBOURS[at]) {
    const o = board[n];
    if (o && o.owner !== s.turn && tile.edges[dir] > o.tile.edges[OPPOSITE[dir]]) { board[n] = { tile: o.tile, owner: s.turn }; turned.push(n); }
  }
  const hands: [Tile[], Tile[]] = [s.hands[0].slice(), s.hands[1].slice()];
  hands[s.turn].splice(h, 1);
  return { state: { board, hands, turn: (1 - s.turn) as Side }, turned };
}

/** Each side's count: their squares on the board, and what's left in their hand. */
export function score(s: QState): [number, number] {
  const out: [number, number] = [s.hands[0].length, s.hands[1].length];
  for (const c of s.board) if (c) out[c.owner]++;
  return out;
}

export function moves(s: QState): [number, number][] {
  const out: [number, number][] = [];
  s.hands[s.turn].forEach((_, h) => s.board.forEach((c, at) => { if (!c) out.push([h, at]); }));
  return out;
}

/**
 * The other player's move. `depth` is how far they think ahead (1: what turns now; 2 and 3: what you'd
 * do back). A board's worth to a side: its squares, and a little for sides it leaves strong to the open.
 */
export function bestMove(s: QState, depth: number): [number, number] {
  const me = s.turn;
  const worth = (st: QState) => {
    const [a, b] = score(st);
    let w = (me === 0 ? a - b : b - a) * 10;
    // A tile with high sides facing empty squares is hard to turn; low ones invite it
    st.board.forEach((c, i) => {
      if (!c) return;
      for (const [dir, n] of NEIGHBOURS[i]) if (!st.board[n]) w += (c.owner === me ? 1 : -1) * (c.tile.edges[dir] - 5) * 0.3;
    });
    return w;
  };
  const search = (st: QState, d: number, alpha: number, beta: number): number => {
    if (d === 0 || over(st)) return worth(st);
    const mine = st.turn === me;
    let best = mine ? -Infinity : Infinity;
    for (const [h, at] of moves(st)) {
      const v = search(play(st, h, at).state, d - 1, alpha, beta);
      if (mine) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (beta <= alpha) break;
    }
    return best;
  };
  let pick: [number, number] = moves(s)[0], bestV = -Infinity;
  for (const [h, at] of moves(s)) {
    const v = search(play(s, h, at).state, depth - 1, -Infinity, Infinity) + Math.random() * 0.5;
    if (v > bestV) { bestV = v; pick = [h, at]; }
  }
  return pick;
}
