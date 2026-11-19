// Morality, alignment and reputation (the owner's brief, docs/briefs/morality.md; how to write content for it:
// docs/MORALITY.md).
//
// Everything rests on one thing, the character's book of deeds: a list of the meaningful things they have done,
// each with its own id, kept in the save (flag "moral"). Alignment, the eight traits, what each group thinks of you
// and what each person thinks of you are all worked out from that list, never stored on their own. So:
//   - a deed applies once: doing it again with the same id changes nothing (no doubled effects from repeated events);
//   - nothing can be nudged without a deed to show for it, and the realm's server checks the book only ever grows
//     and that no deed weighs more than a deed can (server/server.mjs, moralCheck);
//   - an old save with no book reads as neutral, with every trait even and nobody's opinion yet formed, and the
//     choices it made before the book existed are written into it once (CHOICE_DEEDS, below).
//
// Alignment runs from -100 to 100 in five bands (Evil, Bad, Neutral, Good, Heroic) and goes either way: no deed is
// final. Traits run 0 to 100 from an even 50 and move apart from alignment. Regard is what a group (a kingdom, a town,
// a guild, a faith, a soldiery, a criminal brotherhood) thinks of you, and a person's feeling is what one person does:
// both apart from alignment. Who knows what you did is in knows(): the one you did it to, those who saw it, the
// district once the gossip has had time, a group's members once word has gone round, and everyone if it was cried.

import type { RegionId } from '../world/terrain';

// ================================================================ Alignment

export type Band = 'evil' | 'bad' | 'neutral' | 'good' | 'heroic';
export const BANDS: { id: Band; name: string; min: number; max: number; blurb: string }[] = [
  { id: 'evil', name: 'Evil', min: -100, max: -76, blurb: 'People cross the road. Some of them for good reason.' },
  { id: 'bad', name: 'Bad', min: -75, max: -26, blurb: 'Merchants count their change twice when you\'ve gone.' },
  { id: 'neutral', name: 'Neutral', min: -25, max: 25, blurb: 'You keep your own counsel, and people take you as they find you.' },
  { id: 'good', name: 'Good', min: 26, max: 75, blurb: 'Ordinary folk trust you, more often than not.' },
  { id: 'heroic', name: 'Heroic', min: 76, max: 100, blurb: 'There are songs. Some of them are even true.' },
];
/** The band for an alignment score (whole numbers: the bands' edges are exact). */
export function bandOf(a: number): Band {
  const n = Math.round(a);
  return n <= -76 ? 'evil' : n <= -26 ? 'bad' : n <= 25 ? 'neutral' : n <= 75 ? 'good' : 'heroic';
}
export const bandName = (b: Band) => BANDS.find((x) => x.id === b)!.name;

// ================================================================ Traits

export const TRAITS = ['compassion', 'greed', 'honesty', 'cruelty', 'courage', 'loyalty', 'deception', 'generosity'] as const;
export type Trait = typeof TRAITS[number];
export const TRAIT_START = 50;
/** How a trait reads, low to high: never the number itself (some things are found out by playing). */
export const TRAIT_WORDS: Record<Trait, [string, string, string, string, string]> = {
  compassion: ['Hard-hearted', 'Unmoved', 'Even', 'Kind', 'Tender-hearted'],
  greed: ['Open-handed', 'Easy with money', 'Even', 'Close with money', 'Grasping'],
  honesty: ['A liar born', 'Shifty', 'Even', 'Straight', 'Plain-dealing'],
  cruelty: ['Gentle', 'Mild', 'Even', 'Harsh', 'Cruel'],
  courage: ['Craven', 'Careful', 'Even', 'Bold', 'Fearless'],
  loyalty: ['Faithless', 'Fickle', 'Even', 'Steady', 'True'],
  deception: ['Guileless', 'Artless', 'Even', 'Sly', 'Two-faced'],
  generosity: ['Mean', 'Sparing', 'Even', 'Generous', 'Lavish'],
};
export const TRAIT_NAMES: Record<Trait, string> = { compassion: 'Compassion', greed: 'Greed', honesty: 'Honesty', cruelty: 'Cruelty', courage: 'Courage', loyalty: 'Loyalty', deception: 'Deception', generosity: 'Generosity' };
/** The word for a trait: Even from 45 to 56, so a few meaningful deeds show. */
export const traitWord = (t: Trait, v: number) => TRAIT_WORDS[t][v < 25 ? 0 : v < 45 ? 1 : v <= 56 ? 2 : v <= 75 ? 3 : 4];

// ================================================================ Regard: what groups think of you

export type GroupKind = 'kingdom' | 'town' | 'guild' | 'faith' | 'military' | 'criminal';
export interface Group { id: string; name: string; kind: GroupKind; blurb: string; region?: RegionId }
export const GROUPS: Group[] = [
  { id: 'charter', name: 'The Charter', kind: 'kingdom', blurb: 'The Counties\' government, sealed at Ansbury: reeves, courts, the Post and the Weighhouse.' },
  { id: 'verandah', name: 'The Court of Verandah', kind: 'kingdom', blurb: 'The King of Verandah, his merchant houses and his forts.', region: 'verandah' },
  { id: 'ansbury', name: 'Ansbury', kind: 'town', blurb: 'The Counties\' great city.', region: 'greenwake' },
  { id: 'gullmouth', name: 'Gullmouth', kind: 'town', blurb: 'The port on the Fleet.', region: 'saltwind' },
  { id: 'hollinford', name: 'Hollin Ford', kind: 'town', blurb: 'The village in Hollindale where most people start.', region: 'greenwake' },
  { id: 'harrowgate', name: 'Harrowgate Works', kind: 'town', blurb: 'The company town at the pits.', region: 'crownroad' },
  { id: 'holme', name: 'Holme Staithe', kind: 'town', blurb: 'Eel-catchers and reed-cutters on the Wrath Levels.', region: 'wrath' },
  { id: 'cragsby', name: 'Cragsby', kind: 'town', blurb: 'Fowlers on the Gannet Cliffs.', region: 'gannet' },
  { id: 'scarrow', name: 'Scarrow Tor', kind: 'town', blurb: 'Tinners and moormen under the tor.', region: 'tolmen' },
  { id: 'callis', name: 'Callis', kind: 'town', blurb: 'The city over the sea.' },
  { id: 'company', name: 'Harrowgate & Daughters', kind: 'guild', blurb: 'The company: pits, drains, quarries and carts, and a hand in most things.' },
  { id: 'fighters', name: 'The Fighters Guild', kind: 'guild', blurb: 'Swords for hire, and the rules for hiring them.' },
  { id: 'mages', name: 'The Mages Guild', kind: 'guild', blurb: 'The learned art, and its arguments.' },
  { id: 'collegium', name: 'The Collegium', kind: 'guild', blurb: 'Ansbury\'s scholars.' },
  { id: 'chapels', name: 'The Chapels', kind: 'faith', blurb: 'The parish chapels and their altars, from Carne Cross to Ansbury.' },
  { id: 'kirk', name: 'The Glass Kirk', kind: 'faith', blurb: 'The keepers of the Glass Kirk.' },
  { id: 'watch', name: 'The Watch', kind: 'military', blurb: 'The towns\' guards and gaolers.' },
  { id: 'muster', name: 'The Muster', kind: 'military', blurb: 'The Counties\' levy and its sergeants.' },
  { id: 'tollriders', name: 'The Toll Riders', kind: 'military', blurb: 'The Charter\'s mounted wardens of the Turnpike.' },
  { id: 'ropewalk', name: 'The Ropewalk Cellar', kind: 'criminal', blurb: 'Gullmouth\'s underneath: fences, fixers and favours.', region: 'saltwind' },
  { id: 'brethren', name: 'The Brethren', kind: 'criminal', blurb: 'Saltpenny\'s free company of the sea, who would object to the word criminal.', region: 'keys' },
  { id: 'poachers', name: 'The Levels Poachers', kind: 'criminal', blurb: 'Stilt Fort and the people who eat what the Levels grow.', region: 'wrath' },
];
export const GROUP_BY_ID: Record<string, Group> = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
/** How a regard reads. */
export function regardWord(v: number): string {
  return v <= -60 ? 'Loathed' : v <= -25 ? 'Disliked' : v < -7 ? 'Distrusted' : v <= 7 ? 'Indifferent' : v < 25 ? 'Liked' : v < 60 ? 'Esteemed' : 'Honoured';
}

// ================================================================ Deeds

/** How word of a deed gets about (knows()). */
export type Spread = 'self' | 'witness' | 'local' | 'faction' | 'realm';
/** How long gossip takes to go round a district, and word to go round a group, in real time. */
export const GOSSIP_MS = 20 * 60_000, FACTION_MS = 60 * 60_000;

/** What a quest, a conversation or an act declares: its weight, and who it touches. */
export interface DeedInput {
  /** Unique for this decision: the same id never counts twice. */
  id: string;
  /** Alignment: light up, dark down. At most 25 either way. */
  a?: number;
  /** Trait changes, at most 10 each. Leave out what a deed doesn't touch. */
  tr?: Partial<Record<Trait, number>>;
  /** Regard changes for groups (GROUPS ids), at most 30 each. */
  rep?: Record<string, number>;
  /** How particular people feel about it (NPC or companion ids, companions as "comp:<id>"), at most 40 each. */
  npc?: Record<string, number>;
  /** What happened, as the record says it: shown under Major decisions when `major`, and in your history. */
  note?: string;
  major?: boolean;
  /** How people tell it, for the gossip that follows you about: "the one who ...". */
  fame?: string;
  /** How word gets about. Defaults: 'witness' when there were witnesses, else 'self'. */
  spread?: Spread;
  /** For 'faction' spread, the group whose members hear. */
  group?: string;
  /** People who saw it happen (NPC ids). */
  who?: string[];
  /** Where it happened (filled in by the game when left out). */
  where?: RegionId;
}
export interface Deed extends DeedInput { t: number }
export interface MoralBook { v: 1; deeds: Deed[] }

export const CAP = { a: 25, tr: 10, rep: 30, npc: 40 } as const;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const capAll = <K extends string>(o: Partial<Record<K, number>> | undefined, c: number): Partial<Record<K, number>> | undefined => {
  if (!o) return undefined;
  const r: Partial<Record<K, number>> = {};
  for (const k of Object.keys(o) as K[]) { const v = Number(o[k]); if (Number.isFinite(v) && v) r[k] = clamp(Math.round(v), -c, c); }
  return Object.keys(r).length ? r : undefined;
};

/** A book read from a save, or a new empty one (an older save, or a damaged value, reads as an empty book). */
export function readBook(v: unknown): MoralBook {
  const b = v as MoralBook | undefined;
  if (!b || typeof b !== 'object' || !Array.isArray(b.deeds)) return { v: 1, deeds: [] };
  return { v: 1, deeds: b.deeds.filter((d) => d && typeof d.id === 'string') };
}

/** The deed made safe to write: weights capped, empty parts left out. */
export function shapeDeed(d: DeedInput, t: number): Deed {
  const out: Deed = { id: String(d.id).slice(0, 80), t };
  if (d.a) out.a = clamp(Math.round(d.a), -CAP.a, CAP.a);
  const tr = capAll<Trait>(d.tr, CAP.tr); if (tr) out.tr = tr;
  const rep = capAll<string>(d.rep, CAP.rep); if (rep) out.rep = rep as Record<string, number>;
  const npc = capAll<string>(d.npc, CAP.npc); if (npc) out.npc = npc as Record<string, number>;
  for (const k of ['note', 'fame', 'spread', 'group', 'where'] as const) if (d[k]) (out as unknown as Record<string, unknown>)[k] = String(d[k]).slice(0, 240);
  if (d.major) out.major = true;
  if (d.who?.length) out.who = d.who.slice(0, 12).map(String);
  return out;
}

/** Add a deed to the book; false (and no change) if it was already there. */
export function addDeed(book: MoralBook, d: DeedInput, t = Date.now()): boolean {
  if (book.deeds.some((x) => x.id === d.id)) return false;
  book.deeds.push(shapeDeed(d, t));
  return true;
}

// ================================================================ Reading the book

export interface Moral {
  align: number; band: Band;
  traits: Record<Trait, number>;
  regard: Record<string, number>;
  feel: Record<string, number>;
  done: Set<string>;
}
/** Everything worked out from the book, in the order the deeds were done (each total held in its bounds as it goes). */
export function derive(book: MoralBook): Moral {
  let align = 0;
  const traits = Object.fromEntries(TRAITS.map((t) => [t, TRAIT_START])) as Record<Trait, number>;
  const regard: Record<string, number> = {}, feel: Record<string, number> = {}, done = new Set<string>();
  for (const d of book.deeds) {
    done.add(d.id);
    if (d.a) align = clamp(align + d.a, -100, 100);
    if (d.tr) for (const k of Object.keys(d.tr) as Trait[]) if (k in traits) traits[k] = clamp(traits[k] + (d.tr[k] ?? 0), 0, 100);
    if (d.rep) for (const [k, v] of Object.entries(d.rep)) regard[k] = clamp((regard[k] ?? 0) + v, -100, 100);
    if (d.npc) for (const [k, v] of Object.entries(d.npc)) feel[k] = clamp((feel[k] ?? 0) + v, -100, 100);
  }
  return { align, band: bandOf(align), traits, regard, feel, done };
}

// ================================================================ Conditions for authors

/** Who may take a dialogue option or a quest branch. Every part given must hold. */
export interface Need {
  /** Any of these bands. */
  band?: Band[];
  /** Alignment at least / at most. */
  min?: number; max?: number;
  /** Traits within [lo, hi]. */
  trait?: Partial<Record<Trait, [number, number]>>;
  /** Group regard within [lo, hi]. */
  regard?: Record<string, [number, number]>;
  /** A person's feeling within [lo, hi]. */
  feel?: Record<string, [number, number]>;
  /** Deeds done, and deeds not done, by id. */
  did?: string[]; didnt?: string[];
}
export function meets(m: Moral, n: Need | undefined): boolean {
  if (!n) return true;
  if (n.band && !n.band.includes(m.band)) return false;
  if (n.min !== undefined && m.align < n.min) return false;
  if (n.max !== undefined && m.align > n.max) return false;
  for (const [k, [lo, hi]] of Object.entries(n.trait ?? {}) as [Trait, [number, number]][]) if (m.traits[k] < lo || m.traits[k] > hi) return false;
  for (const [k, [lo, hi]] of Object.entries(n.regard ?? {})) { const v = m.regard[k] ?? 0; if (v < lo || v > hi) return false; }
  for (const [k, [lo, hi]] of Object.entries(n.feel ?? {})) { const v = m.feel[k] ?? 0; if (v < lo || v > hi) return false; }
  if (n.did?.some((id) => !m.done.has(id))) return false;
  if (n.didnt?.some((id) => m.done.has(id))) return false;
  return true;
}
/** The tag an option shows for what it needs, SWTOR's way ("Heroic", "Good or Heroic", "Cruel"): or null. */
export function needTag(n: Need | undefined): string | null {
  if (!n) return null;
  if (n.band?.length) return n.band.map(bandName).join(' or ');
  if (n.min !== undefined) return n.min > 25 ? 'Good' : n.min > -26 ? 'Not Bad' : null;
  if (n.max !== undefined) return n.max < -25 ? 'Bad' : n.max < 26 ? 'Not Good' : null;
  const t = Object.entries(n.trait ?? {})[0] as [Trait, [number, number]] | undefined;
  if (t) return t[1][0] >= 60 ? TRAIT_WORDS[t[0]][3] : t[1][1] <= 40 ? TRAIT_WORDS[t[0]][1] : null;
  return null;
}
/** The light or dark a choice carries, for the option's small mark: null when it carries none worth showing. */
export const tone = (a: number | undefined): 'light' | 'dark' | null => (!a || Math.abs(a) < 3 ? null : a > 0 ? 'light' : 'dark');

// ================================================================ Who knows

export interface Hearer { id: string; region?: RegionId; groups?: string[] }
/** Whether someone has heard of a deed by now: done to them, seen, gossiped round their district, passed round their group, or cried abroad. */
export function knows(h: Hearer, d: Deed, now = Date.now()): boolean {
  if (d.npc && h.id in d.npc) return true;
  if (d.who?.includes(h.id)) return true;
  const spread = d.spread ?? (d.who?.length ? 'witness' : 'self');
  const age = now - d.t;
  if (spread === 'realm') return true;
  if (spread === 'local') return !!d.where && d.where === h.region && age >= GOSSIP_MS;
  if (spread === 'faction') return (!!d.group && !!h.groups?.includes(d.group) && age >= FACTION_MS) || (!!d.where && d.where === h.region && age >= GOSSIP_MS * 3);
  if (spread === 'witness') return !!d.where && d.where === h.region && age >= GOSSIP_MS * 3; // what's seen gets told, in time, round the district
  return false;
}
/** The deeds someone has heard of, latest first. */
export const heardOf = (book: MoralBook, h: Hearer, now = Date.now()) => book.deeds.filter((d) => knows(h, d, now)).reverse();

// ================================================================ Choices made before the book existed

/**
 * Quest choices already in the game, with the moral weight they carry. When the flag is set to the value (now, or in a
 * save from before the book), the deed is written: once, by its id. New content puts `moral` on its dialogue options
 * instead (docs/MORALITY.md); this table is for what was written before.
 */
export const CHOICE_DEEDS: { flag: string; value: string; deed: Omit<DeedInput, 'id'> }[] = [
  // Bound (Hagworm Wood)
  { flag: 'hwWat', value: 'ask', deed: { a: 6, tr: { honesty: 3, compassion: 2 }, npc: { hw_jethro: 15, hw_wat: 10 }, note: 'Asked Jethro Bevin to let his apprentice Wat go to sea, rather than help the boy run.', fame: 'got the collier\'s boy sent to sea with his master\'s blessing', spread: 'local', where: 'brambledeep' } },
  { flag: 'hwWat', value: 'run', deed: { a: -4, tr: { deception: 3, loyalty: -2 }, npc: { hw_jethro: -15, hw_wat: 10 }, note: 'Told Wat to run from his indenture in the night, and kept it from Jethro.', spread: 'self', where: 'brambledeep' } },
  // What the Sea Brought (Gannet Cliffs)
  { flag: 'cgFigure', value: 'kitty', deed: { a: 3, tr: { compassion: 3 }, npc: { cg_kitty: 20, morwen: -5 }, rep: { cragsby: 3 }, note: 'Gave the Callis figurehead to Kitty Lander, whose husband\'s ship it was.', where: 'gannet', spread: 'local' } },
  { flag: 'cgFigure', value: 'fund', deed: { a: 3, tr: { generosity: 2 }, npc: { cg_kitty: -5, morwen: 10 }, rep: { cragsby: 5 }, note: 'Had the Callis figurehead sold for Cragsby\'s drowned men\'s fund.', where: 'gannet', spread: 'local' } },
  // Eel Sunday (Wrath Levels)
  { flag: 'hsBab', value: 'rule', deed: { a: 3, tr: { honesty: 4 }, npc: { tilney: 10, haddow: -3 }, rep: { holme: 2 }, note: 'Had the reeve read out the eel book\'s first rule, though it cost Peg Haddow\'s house the pewter.', where: 'wrath', spread: 'local' } },
  { flag: 'hsBab', value: 'quiet', deed: { a: -1, tr: { deception: 2, loyalty: 2 }, npc: { haddow: 10 }, note: 'Let the eel book\'s first page stay shut so the Staithe House kept the pewter.', where: 'wrath', spread: 'self' } },
  // The Old Road (Wrath Levels)
  { flag: 'hsTrack', value: 'round', deed: { a: 2, tr: { courage: 2 }, npc: { hs_mabey: 10 }, rep: { company: -3, collegium: 3 }, where: 'wrath' } },
  { flag: 'hsTrack', value: 'record', deed: { npc: { hs_mabey: 5 }, rep: { company: 3, collegium: 5 }, where: 'wrath' } },
  // Brass Rings (Gannet Cliffs)
  { flag: 'cgRings', value: 'cragsby', deed: { a: 2, tr: { generosity: 2 }, rep: { cragsby: 5, collegium: -3 }, where: 'gannet', spread: 'local' } },
  { flag: 'cgRings', value: 'collegium', deed: { rep: { collegium: 3 }, where: 'gannet' } },
  // Honest or kind: these move the temperament, not the alignment (the brief: not every choice needs one)
  { flag: 'kyCount', value: 'true', deed: { tr: { honesty: 4 }, note: 'Wrote the true count of hatchlings in Sal Mudge\'s book, though it was a bad year.' } },
  { flag: 'kyCount', value: 'kind', deed: { tr: { compassion: 3, deception: 2, honesty: -2 }, note: 'Wrote a kinder count of hatchlings in Sal Mudge\'s book than the true one.' } },
  { flag: 'sfSkate', value: 'told', deed: { tr: { honesty: 3 }, note: 'Told Edwin Marner whose initials were scratched beside his daughter\'s on her skate.' } },
  { flag: 'sfSkate', value: 'worn', deed: { tr: { compassion: 2, deception: 2 }, note: 'Told Edwin Marner the letters on his daughter\'s skate were too worn to read.' } },
  { flag: 'isJowan', value: 'told', deed: { tr: { honesty: 3 } } },
  { flag: 'isJowan', value: 'ill', deed: { tr: { compassion: 2, deception: 2 } } },
  { flag: 'nellTold', value: 'letters', deed: { tr: { honesty: 3, compassion: 2 }, npc: { nell_kitto: 12 }, note: 'Told Nell Kitto her father keeps every letter she sends him, though he asked you to say he was dead.' } },
  { flag: 'nellTold', value: 'dead', deed: { tr: { deception: 2, loyalty: 2 }, note: 'Told Nell Kitto her father was dead, as he asked.' } },
  { flag: 'lfRopes', value: 'assembly', deed: { a: 2, tr: { honesty: 3 }, rep: { callis: 3 }, note: 'Told the Assembly\'s clerk that Pol Vidal cut the bridge rope.' } },
  { flag: 'lfRopes', value: 'quiet', deed: { tr: { loyalty: 2, deception: 2 } } },
  { flag: 'hgSpikes', value: 'told', deed: { tr: { honesty: 2, compassion: -2 }, rep: { company: 5 } } },
  { flag: 'hgSpikes', value: 'hands', deed: { tr: { compassion: 3 }, rep: { company: -3 } } },
  { flag: 'hsChoice', value: 'told', deed: { tr: { honesty: 2 }, rep: { company: 3, holme: -2 } } },
  { flag: 'hsChoice', value: 'quiet', deed: { tr: { loyalty: 2 }, rep: { holme: 4 } } },
  { flag: 'hwShort', value: 'delia', deed: { a: 2, tr: { honesty: 3, courage: 2 }, rep: { company: 4 }, note: 'Took the carter\'s chits to Delia Harrowgate, and the fellers were paid what they were owed.' } },
  { flag: 'hwShort', value: 'keep', deed: { tr: { loyalty: 2 } } },
  { flag: 'hwShort', value: 'pad', deed: { a: -2, tr: { deception: 3 } } },
];
export const choiceDeedId = (flag: string, value: string) => `choice:${flag}=${value}`;
