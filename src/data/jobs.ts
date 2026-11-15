// Trades: a job to take up, the way Where Winds Meet's are (owner 2026-11-14: "work on the jobs next", and asked which
// kind: "mix of 1 and 2": a trade you take up and rise in, and repeatable jobs every day). You follow one trade at a
// time (change it whenever you like: your rank in each is kept). Each day your trade puts three jobs on your board,
// drawn from the realm's own work (the infirmaries' rounds, the fish, the garden, the stage, the Counting House's
// carrying, the bounties, the bench and the hearth), bigger as you rise. A job done pays marks and counts toward the
// trade's five ranks; the last gives a title and a dye. What a job counts is one of the game's counters (the flags
// "n:<what>", Game.bump), measured from where it stood when the day's board went up. The board is game/Game.ts
// (jobsTick), the page is the journal's Trade page.

export type TradeId = 'physician' | 'fisher' | 'grower' | 'bard' | 'factor' | 'bounty' | 'craftsman';

export interface JobKind {
  /** The counter it reads (flag "n:<counter>"). */
  counter: string;
  /** What's asked, with {n} for how many. */
  text: string;
  /** How many at rank 0; more as you rise. */
  base: number;
}

export interface TradeDef {
  id: TradeId;
  name: string;
  /** Where its work is, in a line. */
  where: string;
  blurb: string;
  ranks: [string, string, string, string, string];
  title: string;
  dye: [string, string];
  jobs: JobKind[];
}

export const TRADES: TradeDef[] = [
  {
    id: 'physician', name: 'Physician', where: 'The infirmaries: Ansbury\'s Spital, Harrowgate\'s sick bay, the Seamen\'s Sick-House at Gullmouth, the Assembly\'s Hospital at Callis, and the Vanguard in Verandah',
    blurb: 'You walk the wards: the still-room\'s herbs, an hour with a patient, the broth that does more good than half the bottles. Nobody thanks a physician until they need one.',
    ranks: ['Dresser', 'Apothecary\'s Hand', 'Physician', 'Senior Physician', 'Master of the Wards'], title: 'Master of the Wards', dye: ['#e8e2d4', 'Ward linen'],
    jobs: [
      { counter: 'rounds', text: 'Do {n} of the infirmaries\' rounds (the herbs, or an hour with a patient)', base: 1 },
      { counter: 'forage', text: 'Gather {n} herbs, berries or mushrooms from the wild for the still-room', base: 6 },
      { counter: 'cooked', text: 'Cook {n} dishes at a hearth: the wards eat what you cook', base: 3 },
    ],
  },
  {
    id: 'fisher', name: 'Fisher', where: 'Any water with fish in it: the quays, the rivers, the open sea from a boat',
    blurb: 'Up before the gulls, home after them. The sea gives what it gives; the fisher who\'s patient goes home with more of it.',
    ranks: ['Deckhand', 'Netter', 'Fisher', 'Skipper', 'Master Fisher'], title: 'Master Fisher', dye: ['#2a4a5a', 'Sea-dark'],
    jobs: [
      { counter: 'fish', text: 'Land {n} fish', base: 5 },
      { counter: 'fishBig', text: 'Land {n} fish over ten pounds', base: 1 },
      { counter: 'cooked', text: 'Cook {n} dishes at a hearth, fish or otherwise, for the quay', base: 2 },
    ],
  },
  {
    id: 'grower', name: 'Grower', where: 'Your own garden and the towns\' public fields; Bertram Sowerby\'s order book at Hollin Ford',
    blurb: 'You keep ground that feeds people: a bed turned, watered and picked in its season. The best growers are known by their prize marrows and their silence about how.',
    ranks: ['Hand', 'Gardener', 'Grower', 'Market Grower', 'Master Grower'], title: 'Master Grower', dye: ['#5a7a2a', 'Fresh sward'],
    jobs: [
      { counter: 'harvest', text: 'Bring in {n} harvests from tilled ground', base: 4 },
      { counter: 'prize', text: 'Grow {n} pieces of prize produce', base: 1 },
      { counter: 'forage', text: 'Gather {n} things from the hedgerows', base: 5 },
    ],
  },
  {
    id: 'bard', name: 'Bard', where: 'The stages: the bandstand on the Charter Green, the taverns, the squares, anywhere with somebody to listen',
    blurb: 'Every town has its tunes and wants to hear them played well. A bard who knows the room is fed for nothing and remembered for longer.',
    ranks: ['Busker', 'Player', 'Bard', 'Town Musician', 'Master of the Song'], title: 'Master of the Song', dye: ['#8a2a5a', 'Ballad plum'],
    jobs: [
      { counter: 'tunes', text: 'Play {n} tunes through, start to finish', base: 3 },
      { counter: 'tableWins', text: 'Come out ahead at a tavern table {n} times (a bard drinks where the cards are)', base: 1 },
      { counter: 'posts', text: 'Leave {n} message posts: a good bard is heard after they\'ve gone', base: 1 },
    ],
  },
  {
    id: 'factor', name: 'Factor', where: 'The Counting House windows at Ansbury, Gullmouth, Brasswick and Callis',
    blurb: 'You carry for the Company and trade for yourself: a bonded crate here, a debt collected there, a sharp eye on the weights. The quays run on people like you.',
    ranks: ['Porter', 'Clerk', 'Supercargo', 'Factor', 'Chief Factor'], title: 'Chief Factor', dye: ['#1e3a6a', 'Company blue'],
    jobs: [
      { counter: 'contracts', text: 'Finish {n} of the Counting House\'s contracts', base: 1 },
      { counter: 'crafted', text: 'Make {n} things at a bench, an anvil, a furnace or a hearth, to trade', base: 5 },
      { counter: 'orders', text: 'Fill {n} of Bertram Sowerby\'s orders', base: 1 },
    ],
  },
  {
    id: 'bounty', name: 'Bounty Hunter', where: 'The wilds: wherever the Muster\'s board, the parish notices and the farms want something brought down',
    blurb: 'Somebody has to go out after the thing that took the sheep. You\'re paid by the head, and the parishes know your name, which is mostly a good thing.',
    ranks: ['Tracker', 'Hunter', 'Bounty Hunter', 'Warden of the Roads', 'Master of the Hunt'], title: 'Master of the Hunt', dye: ['#4a3a24', 'Hide brown'],
    jobs: [
      { counter: 'kills', text: 'Bring down {n} creatures in the wilds', base: 15 },
      { counter: 'elites', text: 'Bring down {n} elites, the big and the named', base: 1 },
      { counter: 'rubbings', text: 'Take {n} rubbings at the standing stones out where the hunting is', base: 1 },
    ],
  },
  {
    id: 'craftsman', name: 'Craftsman', where: 'The anvils, the benches, the furnaces and the hearths, in any town',
    blurb: 'You make what people use: nails, stools, bread, blades. A craftsman\'s mark on a thing means it was made to last, and the towns pay for that.',
    ranks: ['Apprentice', 'Improver', 'Journeyman', 'Master', 'Master of the Guilds'], title: 'Master of the Guilds', dye: ['#7a5a32', 'Oak and brass'],
    jobs: [
      { counter: 'smithed', text: 'Make {n} things at an anvil or a furnace', base: 3 },
      { counter: 'joinery', text: 'Make {n} things at a joiner\'s bench', base: 3 },
      { counter: 'cooked', text: 'Cook {n} dishes at a hearth', base: 3 },
    ],
  },
];
export const TRADE_BY_ID = Object.fromEntries(TRADES.map((t) => [t.id, t])) as Record<TradeId, TradeDef>;

/** Jobs done in a trade to reach each rank after the first. */
export const TRADE_RANK_AT = [0, 6, 18, 40, 80];
/** Your rank in a trade from its jobs done (0 to 4). */
export const tradeRank = (done: number) => TRADE_RANK_AT.reduce((r, at, i) => (done >= at ? i : r), 0);
/** How many a job asks for at a rank. */
export const jobNeed = (j: JobKind, rank: number) => Math.max(1, Math.round(j.base * (1 + rank * 0.35)));
/** Marks a job pays at a rank. */
export const jobPay = (rank: number) => 30 + rank * 20;

/** A day's board: which trade, the realm's day, and each job's counter, how many, where its counter stood, and done. */
export interface JobBoard { day: number; trade: TradeId; jobs: { counter: string; text: string; need: number; base: number; done: boolean }[] }

/** The day number for boards (a new board each real day). */
export const jobDay = (now = Date.now()) => Math.floor(now / 86_400_000);
