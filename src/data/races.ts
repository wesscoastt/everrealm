// Amberwold Downs, the racecourse on Morrow (owner 2026-11-13: "a horse racing track somewhere maybe the second
// continent where you can go watch real horses race in the crowd and bet marks"): an oval of turf-and-dirt in the
// Amberwold south of Branchley, a grandstand on the home straight, the bookmaker's board under it.
//
// Every race is worked out from the realm's clock (game/racing.ts), so everyone in the stand sees the same race,
// the same horse in front at the turn, and the same winner, with nothing asked of the server.

/** The course's middle, and its ground. */
export const DOWNS = { x: 7640, z: 1900 };
/** Half the length of each straight, and the bends' radius (to the middle of the track). */
export const STRAIGHT = 38;
export const BEND = 27;
/** The track's width, rail to rail. */
export const TRACK_W = 11;
/** How far along the course (from the start of the home straight) the winning post stands. */
export const POST_AT = STRAIGHT + 24;

/** One race every this long, the clock over. */
export const RACE_MS = 6 * 60 * 1000;
/** Within a race's six minutes: the runners come out, walk down to the start, go in the stalls, and race. */
export const T_PARADE = 150, T_STALLS = 240, T_OFF = 255;
/** Bets close as they go into the stalls. */
export const T_CLOSE = T_STALLS;

export interface Runner {
  id: string;
  name: string;
  /** How good: about 60 (a plodder) to 90 (a champion). */
  rating: number;
  /** Stays a trip (holds on at the end) 0..1, and its early pace 0..1. */
  stamina: number;
  pace: number;
  coat: string;
  mane: string;
  /** The jockey's silks: body and sleeves/cap. */
  silks: [string, string];
  jockey: string;
  /** What the form book says. */
  note: string;
}

const h = (id: string, name: string, rating: number, stamina: number, pace: number, coat: string, mane: string, silks: [string, string], jockey: string, note: string): Runner =>
  ({ id, name, rating, stamina, pace, coat, mane, silks, jockey, note });

/** The horses in training at the Downs: six go to post each race. */
export const STABLE: Runner[] = [
  h('saltlick', 'Salt Lick', 84, 0.7, 0.6, '#6a3a1e', '#2a1a10', ['#c8281e', '#f4f0e6'], 'Jem Pascoe', 'Won three of her last five. Hates being crowded.'),
  h('widowstax', 'Widow\'s Tax', 79, 0.4, 0.9, '#2a2420', '#141210', ['#141216', '#c8a03a'], 'Ada Kestle', 'Goes off like a hare. Sometimes the hare wins.'),
  h('tinpenny', 'Tin Penny', 66, 0.8, 0.3, '#9a7a5a', '#e8e0d0', ['#2a6a3a', '#f4f0e6'], 'Old Harris', 'Slow to start, never stops. A long-odds horse.'),
  h('brightcoat', 'Brightcoat', 88, 0.6, 0.7, '#b07a3a', '#e8c890', ['#2a4a8a', '#e8c040'], 'Mags Tonkin', 'The favourite most days. The book knows it.'),
  h('mudlark', 'Mudlark', 71, 0.6, 0.5, '#4a3a2a', '#2a1e14', ['#7a4a1e', '#2a2420'], 'Danny Rowe', 'Honest and steady. Likes it soft underfoot.'),
  h('nightfern', 'Night Fern', 81, 0.5, 0.6, '#1a1816', '#0a0a0a', ['#3a2a5a', '#d8d0e8'], 'Tess Angwin', 'Ran second four times this summer. Due one.'),
  h('quaygull', 'Quay Gull', 63, 0.5, 0.7, '#d8d4cc', '#8a8a8a', ['#f4f0e6', '#2a6a8a'], 'Pip Nance', 'Grey, fast for half a mile, then remembers the sea.'),
  h('kingsbane', 'Kingsbane', 86, 0.8, 0.4, '#5a2a14', '#1a0e08', ['#c8a03a', '#7a1e1a'], 'Josiah Bray', 'Strong at the finish. Needs the whole straight.'),
  h('hollysue', 'Holly Sue', 74, 0.5, 0.6, '#8a5a32', '#4a2a14', ['#c84a8a', '#f4f0e6'], 'Kit Moyle', 'Bought cheap in Cala. Nobody told her.'),
  h('amberhill', 'Amber Hill', 77, 0.7, 0.5, '#a8682a', '#5a3214', ['#e8782a', '#1e3a2a'], 'Sam Odgers', 'Bred on the Downs. The locals back her out of loyalty.'),
  h('coalbarrow', 'Coalbarrow', 60, 0.4, 0.4, '#3a3634', '#1a1816', ['#4a4a52', '#c8c8d0'], 'Ned Hocking', 'Pulled a coal cart until March. It shows.'),
  h('lastorders', 'Last Orders', 82, 0.6, 0.8, '#7a4a2a', '#2a1a10', ['#1e5a3a', '#e8c040'], 'Bryony Teague', 'Owned by a landlord. Runs like she\'s calling time.'),
  h('greyfriar', 'Grey Friar', 69, 0.9, 0.2, '#b8b4ac', '#e8e4dc', ['#6a6a72', '#2a2420'], 'Brother Hob', 'Runs for the chapel at Branchley. Prayers not included.'),
  h('redsedge', 'Red Sedge', 75, 0.5, 0.7, '#8a3a1a', '#3a1a0a', ['#a8382c', '#2a2a2e'], 'Lowen Jago', 'Quick out of the stalls. Fades if headed.'),
];
export const RUNNER_BY_ID = new Map(STABLE.map((r) => [r.id, r]));

/** Most the bookmaker will pay you in a day before he stops taking your bets. */
export const BOOK_DAILY_LIMIT = 2500;
export const RACE_STAKES = [5, 10, 25, 50, 100, 250];
