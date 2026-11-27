// Factions: companies you can join, each with its own hall, people and storyline, in the manner of
// the Elder Scrolls guilds but grown out of the Charter Counties (docs/LORE.md, "The factions").
// Joining is the first quest of a faction\'s storyline; each later chapter raises your rank, and the
// last gives a title. Your rank is kept in the flag "fac:<id>" (missing: not a member).

export type FactionId = 'waits' | 'collegium' | 'muster' | 'lamplighters' | 'bell' | 'ushers' | 'fighters' | 'mages' | 'company' | 'brethren';

export interface FactionDef {
  id: FactionId;
  name: string;
  /** Where its hall is, as the journal says it. */
  where: string;
  /** What it is, in a sentence or two. */
  blurb: string;
  /** How to join, for someone who hasn\'t. */
  join: string;
  ranks: string[];
  /** The title the last rank gives (shown under your name). */
  title: string;
  /** Its storyline\'s quests, in order: finishing quest i makes you rank i. */
  storyline: string[];
  color: string;
  /** Open to join in this build. */
  open: boolean;
  /** A storyline that doesn't set the rank flag itself: chapters done needed for each rank (data/company.ts's "Short Weight"). */
  rankAt?: number[];
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
    id: 'fighters', name: 'The Fighters Guild', where: 'The Fighters Guild, by the Vanguard Hospital, Verandah; a chapter house on the Gullmouth quay',
    blurb: 'It trains the King\'s Guard and the caravan guards, and hires out to anyone with honest trouble. Its one rule is its word: a Guild sword is never hired to collect a debt or break a strike.',
    join: 'Ancrum Treneer, Master of the Fighters Guild, takes on Initiates at the Guild in Verandah.', ranks: ['Initiate', 'Sword', 'Shieldbearer', 'Captain'], title: 'Captain of the Fighters Guild',
    storyline: ['fgFeet', 'fgChapter', 'fgLights', 'fgWord'], color: '#5a2a24', open: true,
  },
  {
    id: 'mages', name: 'The Mages Guild', where: 'The Mages Guild, by the Chapel, Verandah; readers who meet at Gullmouth',
    blurb: 'It keeps what the old kingdom cut into its standing stones, and teaches it slowly, because the last time it was taught quickly the old kingdom fell.',
    join: 'Selina Pendarves, Warden of the Mages Guild, takes Novices at the Guild in Verandah. Bring her a rubbing.', ranks: ['Novice', 'Reader', 'Scribe', 'Magister'], title: 'Magister of the Mages Guild',
    storyline: ['mgHum', 'mgPetition', 'mgSink', 'mgSlow'], color: '#2a3a6a', open: true,
  },
  {
    // the Counting House (docs/COMPANY_BRIEF.md): its storyline, "Short Weight", raises you as its chapters close
    id: 'company', name: 'The Counting House', where: 'The head office on East Avenue, Ansbury; counting houses at Holme Staithe, Gillsby Staithe, Callis and Brasswick, and a hired loft on the Gullmouth quay',
    blurb: 'The Charter\'s own sea trade, chartered by the Speaker forty years ago: wool, tin and salt fish out, wine, silk and timber back, and the harbour dues collected on the way. Rich, lawful, slow, a little rotten, and the only employer on the coast that pays on the day it says.',
    join: 'Gilbert Ashe, the clerk at the Ansbury counting house, has a contract board and a problem with his crates. Ask him.',
    ranks: ['Clerk', 'Supercargo', 'Factor', 'Chief Factor'], title: 'Factor of the Counting House',
    storyline: ['coWeight', 'coDues', 'coHen', 'coSalt', 'coBonded', 'coReckoning'], rankAt: [1, 2, 4, 6], color: '#22365a', open: true,
  },
  {
    id: 'collegium', name: 'The Collegium', where: 'The Collegium, Guild Ward, Ansbury',
    blurb: 'Fellows who study star crystal, the old words and the weather, and teach them for a fee. They would like a Charter licence over all three.',
    join: 'Walter Gilby, the Provost, takes Entrants on the lecture-room steps in the Guild Ward. Twenty marks a term, or make yourself useful.', ranks: ['Entrant', 'Scholar', 'Fellow', 'Senior Fellow'], title: 'Fellow of the Collegium',
    storyline: ['colVolume', 'colPages', 'colFigure', 'colSitting'], color: '#5a2a4a', open: true,
  },
  {
    id: 'muster', name: 'The Muster', where: 'The Muster Hall, by the tilt-yard, Ansbury',
    blurb: 'When the Charter laid off its toll riders, their sergeant put up a hiring hall at the tilt-yard. Anyone who can hold a weapon can sign the roll and take the contracts on its board.',
    join: 'Sergeant Agnes Holroyd keeps the roll at the tilt-yard, by the notice. Read it before you sign.', ranks: ['On the Roll', 'Sworn', 'Corporal', 'Banneret'], title: 'of the Muster Roll',
    storyline: ['musRoll', 'musTwice', 'musToll', 'musBanner'], color: '#2a4a8a', open: true,
  },
  {
    id: 'lamplighters', name: 'The Lamplighters', where: 'The lamp store, the Shambles yard, Ansbury',
    blurb: 'They light Ansbury\'s lamps at dusk and put them out at dawn, so they have ladders, keys to every lamp box, and a reason to be out all night.',
    join: 'Hester Vosper, the Lamp Warden, takes on carriers at the lamp store, the open shed at the east end of the Shambles yard.', ranks: ['Carrier', 'Lamplighter', 'Warden\'s Hand'], title: 'Lamplighter',
    storyline: ['lampBell', 'lampMeasure', 'lampHand'], color: '#e0a040', open: true,
  },
  {
    id: 'bell', name: 'The Passing Bell', where: 'A chapel on Tolmen Moor',
    blurb: 'An old practice the moor has never quite given up: ring the passing bell for someone the law can\'t reach, and the bell is answered.',
    join: 'Nobody joins. You hear the bell at Carne Cross ring, and go to see who rang it. Joss Trewin at the Peat Fire heard it last.', ranks: ['Treble', 'Second', 'Third', 'Tenor\'s Hand'], title: 'of the Passing Bell',
    storyline: ['bellRung', 'bellPrice', 'bellFire', 'bellTenor'], color: '#3a3a42', open: true,
  },
  {
    id: 'ushers', name: 'The Ushers', where: 'The Charter Hall, in the keep, Ansbury',
    blurb: 'They keep the doors of the Charter Hall. Since the Charter was sealed they have also been the Speaker\'s eyes, and the less said about that, the better they like it.',
    join: 'Oswin Hext, the Senior Usher, stands by the south door of the keep in Ansbury. He\'s an usher short.', ranks: ['Doorkeeper', 'Usher', 'Usher of the Hall'], title: 'Usher of the Hall',
    storyline: ['ushDoor', 'ushSeal', 'ushHall'], color: '#1e1e24', open: true,
  },
  {
    id: 'brethren', name: 'The Brethren of Saltpenny', where: 'The Captains’ Table, Saltpenny Key, in the Keys of Morrow',
    blurb: 'A free company of captains who answer to no Charter and no Assembly, only to their own articles: quarter is always given and the black flag never flown, a prize is shared by the articles, and a quarrel between captains goes to the Cockpit.',
    join: 'Captain Bess Merrin of the Fair Exchange, on Saltpenny’s north pier, is a hand short. She owes you a favour if you found her cat.', ranks: ['Hand', 'Able Hand', 'Bosun', 'Quartermaster', 'Captain'], title: 'Captain of the Brethren',
    storyline: ['bfArticles', 'bfMary', 'bfLady', 'bfMaroon', 'bfVote'], color: '#1e1c1c', open: true,
  },
];

export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map((f) => [f.id, f])) as Record<FactionId, FactionDef>;

/** Your rank in a faction (0 is the first), or -1 if you haven\'t joined. */
export function factionRank(g: { flag(k: string): unknown }, id: FactionId): number {
  const r = g.flag('fac:' + id);
  if (typeof r === 'number') return r;
  const f = FACTION_BY_ID[id], st = (g as { stage?(q: string): string | undefined }).stage;
  if (f?.rankAt && st) { const done = f.storyline.filter((q) => st.call(g, q) === 'done').length; return f.rankAt.filter((n) => done >= n).length - 1; }
  return -1;
}
