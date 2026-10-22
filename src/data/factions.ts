// Factions: companies you can join, each with its own hall, people and storyline, in the manner of
// the Elder Scrolls guilds but grown out of the Charter Counties (docs/LORE.md, "The factions").
// Joining is the first quest of a faction's storyline; each later chapter raises your rank, and the
// last gives a title. Your rank is kept in the flag "fac:<id>" (missing: not a member).

export type FactionId = 'waits' | 'collegium' | 'muster' | 'lamplighters' | 'bell' | 'ushers';

export interface FactionDef {
  id: FactionId;
  name: string;
  /** Where its hall is, as the journal says it. */
  where: string;
  /** What it is, in a sentence or two. */
  blurb: string;
  /** How to join, for someone who hasn't. */
  join: string;
  ranks: string[];
  /** The title the last rank gives (shown under your name). */
  title: string;
  /** Its storyline's quests, in order: finishing quest i makes you rank i. */
  storyline: string[];
  color: string;
  /** Open to join in this build. */
  open: boolean;
}

export const FACTIONS: FactionDef[] = [
  {
    id: 'waits', name: 'The Waits of Ansbury', where: 'The Waits\' House, on the Charter Green, Ansbury',
    blurb: 'The town\'s own musicians, paid by the Charter to play the hours on the Charter Green and walk in front of the Speaker. They keep the Great Book of the counties\' tunes, and they train anyone who can hold one.',
    join: 'Tabitha Gant, Master of the Waits, takes apprentices at the Waits\' House on the north side of the Charter Green.',
    ranks: ['Apprentice', 'Journeyman', 'Wait', 'Senior Wait', 'Wait of the Hours'],
    title: 'Wait of Ansbury',
    storyline: ['waitsAudition', 'waitsBook', 'waitsMoor', 'waitsSitting', 'waitsHours'],
    color: '#c8a050', open: true,
  },
  {
    id: 'collegium', name: 'The Collegium', where: 'The Collegium, Guild Ward, Ansbury',
    blurb: 'Fellows who study star crystal, the old words and the weather, and teach them for a fee. They would like a Charter licence over all three.',
    join: 'Not yet open.', ranks: ['Entrant', 'Scholar', 'Fellow', 'Senior Fellow'], title: 'Fellow of the Collegium',
    storyline: [], color: '#5a2a4a', open: false,
  },
  {
    id: 'muster', name: 'The Muster', where: 'The Muster Hall, by the tilt-yard, Ansbury',
    blurb: 'When the Charter laid off its toll riders, their sergeant put up a hiring hall at the tilt-yard. Anyone who can hold a weapon can sign the roll and take the contracts on its board.',
    join: 'Not yet open.', ranks: ['On the Roll', 'Sworn', 'Corporal', 'Banneret'], title: 'of the Muster Roll',
    storyline: [], color: '#2a4a8a', open: false,
  },
  {
    id: 'lamplighters', name: 'The Lamplighters', where: 'The lamp store, by the Shambles, Ansbury',
    blurb: 'They light Ansbury\'s lamps at dusk and put them out at dawn, so they have ladders, keys to every lamp box, and a reason to be out all night.',
    join: 'Not yet open.', ranks: ['Carrier', 'Lamplighter', 'Warden\'s Hand'], title: 'Lamplighter',
    storyline: [], color: '#e0a040', open: false,
  },
  {
    id: 'bell', name: 'The Passing Bell', where: 'A chapel on Tolmen Moor',
    blurb: 'An old practice the moor has never quite given up: ring the passing bell for someone the law can\'t reach, and the bell is answered.',
    join: 'Not yet open.', ranks: ['Treble', 'Second', 'Third', 'Tenor\'s Hand'], title: 'of the Passing Bell',
    storyline: [], color: '#3a3a42', open: false,
  },
  {
    id: 'ushers', name: 'The Ushers', where: 'The Charter Hall, in the keep, Ansbury',
    blurb: 'They keep the doors of the Charter Hall. Since the Charter was sealed they have also been the Speaker\'s eyes, and the less said about that, the better they like it.',
    join: 'Not yet open.', ranks: ['Doorkeeper', 'Usher', 'Usher of the Hall'], title: 'Usher of the Hall',
    storyline: [], color: '#1e1e24', open: false,
  },
];

export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map((f) => [f.id, f])) as Record<FactionId, FactionDef>;

/** Your rank in a faction (0 is the first), or -1 if you haven't joined. */
export function factionRank(g: { flag(k: string): unknown }, id: FactionId): number {
  const r = g.flag('fac:' + id);
  return typeof r === 'number' ? r : -1;
}
