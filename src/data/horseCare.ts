import type { ItemDef } from './items';

// Your horse as a horse (owner 2026-11-23: "work on the in depth mount system next, like Red Dead, care for etc"). Every
// horse you own has a name you give it, a bond with you from one to four, two cores that run down on the real clock and
// as you ride (health, kept up by feeding; stamina, by feeding and rest), and a coat that gets muddy on the road.
// Pat her, brush her, feed her apples, carrots, hay or oats, and ride her, and the bond grows (so much a day and no
// more); the bond makes her quicker and steadier at the gallop, and she comes to your whistle from further off. Let her
// go hungry and she's slower; ride her ragged and she blows sooner. She stands where you leave her and comes when you
// whistle (game/Game.ts). Kept per horse in the flag "horse:<halter id>".

export interface HorseState {
  name?: string;
  /** The bond, 0 to 100. */
  bond: number;
  /** The cores, 0 to 100, and how muddy her coat is, 0 to 100. */
  health: number;
  stamina: number;
  dirt: number;
  /** Bond gained today, which day, and when she was last patted (ms). */
  today: number;
  day: number;
  patted: number;
  /** Blocks ridden toward the next bond from riding. */
  rode: number;
  /** When the cores were last worked out (ms). */
  t: number;
  /** The saddle on her (SADDLES id; none: the plain one she came with). */
  saddle?: string;
  /** Down, hurt, since when (ms): a tonic gets her up, or rest. */
  downAt?: number;
}

export const newHorse = (now = Date.now()): HorseState => ({ bond: 0, health: 80, stamina: 80, dirt: 10, today: 0, day: 0, patted: 0, rode: 0, t: now });

/** The bond levels: where each starts, what it's called, and what it brings. */
export const BOND_LEVELS = [
  { at: 0, name: 'Strangers', gives: 'She\'ll carry you. She doesn\'t know you yet.' },
  { at: 20, name: 'Getting used to you', gives: 'A little quicker under you, and she comes to your whistle from further off.' },
  { at: 50, name: 'Trusted', gives: 'The gallop tires you both less, and she comes at a run.' },
  { at: 85, name: 'Bonded', gives: 'As quick as she\'ll ever be, steady at the gallop, and she\'ll come from anywhere.' },
];
export const bondLevel = (bond: number) => BOND_LEVELS.filter((l) => bond >= l.at).length;
/** Bond a day's care can give, at most. */
export const DAILY_BOND = 12;

/** What each feed does: health, stamina and bond, and what she makes of it. */
export const FEEDS: Record<string, { health: number; stamina: number; bond: number; line: string }> = {
  horse_tonic: { health: 100, stamina: 100, bond: 0, line: 'She drinks it from your hand, makes a face, and is herself again.' },
  horse_oats: { health: 35, stamina: 35, bond: 2, line: 'She buries her nose in the oats and doesn\'t come up till they\'re gone.' },
  horse_hay: { health: 25, stamina: 20, bond: 1, line: 'She pulls at the hay as if it\'s done her a wrong.' },
  apples: { health: 15, stamina: 10, bond: 2, line: 'She takes the apple off your flat palm, crunches it, and noses your pockets for the next.' },
  carrot: { health: 10, stamina: 15, bond: 2, line: 'She takes the carrot whole, and nods at you while she eats it.' },
};

/** The cores as they stand now: they run down slowly on the real clock, and her coat gathers dust. */
export function settle(s: HorseState, now = Date.now()): HorseState {
  // (down long enough, she gets up by herself, still hurt)
  if (s.downAt && now - s.downAt > DOWN_MS) { s.downAt = undefined; s.health = Math.max(s.health, 20); }
  const h = Math.max(0, Math.min(72, (now - (s.t || now)) / 3_600_000));
  s.health = Math.max(0, s.health - 4 * h);
  s.stamina = Math.max(0, s.stamina - 6 * h);
  s.dirt = Math.min(100, s.dirt + 2 * h);
  s.t = now;
  return s;
}

// ---------------------------------------------------------------- stage two (owner 2026-11-26: "yes, stage two")

/**
 * What she's bred for: pace, wind (how long she gallops) and toughness, 1 to 5, and how much her saddlebags hold. The
 * drafts are slow, tireless and hard to hurt, and carry the most; the riding horses are even; the rarer breeds quicker.
 */
export interface Traits { pace: number; wind: number; tough: number; bags: number; kind: string }
const T = (pace: number, wind: number, tough: number, bags: number, kind: string): Traits => ({ pace, wind, tough, bags, kind });
const BREEDS: Record<string, Traits> = {
  halter_bay: T(3, 3, 3, 8, 'a riding horse'), halter_piebald: T(3, 3, 3, 8, 'a riding horse'), halter_grey: T(3, 4, 3, 8, 'a riding horse'),
  halter_sorrel: T(4, 3, 3, 8, 'a quick riding horse'), halter_carriage: T(4, 3, 2, 6, 'a carriage horse'),
  halter_cob: T(2, 5, 4, 12, 'a cob'), halter_dray: T(2, 5, 5, 14, 'a draught horse'), halter_shire: T(1, 5, 5, 16, 'a shire'),
  halter_cream: T(4, 4, 3, 8, 'a saltmarsh horse'), halter_seafret: T(4, 4, 4, 8, 'a sea-fret horse'), halter_fen: T(3, 5, 4, 10, 'a fen horse'),
  halter_ver_black: T(5, 4, 4, 8, 'a Verandah pure-bred'), halter_ver_gold: T(5, 4, 3, 8, 'a Verandah pure-bred'), halter_ver_dapple: T(4, 5, 4, 8, 'a Verandah pure-bred'),
};
/** A horse's traits by halter: the table's, or from how rare she is. */
export function traitsOf(id: string, rarity?: string, breed?: string): Traits {
  if (BREEDS[id]) return BREEDS[id];
  if (breed === 'shire') return T(2, 5, 5, 14, 'a draught horse');
  const r = rarity === 'legendary' ? 2 : rarity === 'epic' ? 1 : 0;
  return T(3 + r, 3 + r, 3 + Math.min(1, r), 8, 'a riding horse');
}

/** Saddles: bought at the stables, kept in your pack, put on any horse of yours by seeing to her. */
export interface SaddleDef { id: string; name: string; speed: number; drain: number; hurt: number; bags: number; desc: string }
export const SADDLES: Record<string, SaddleDef> = {
  saddle_drover: { id: 'saddle_drover', name: 'Drover\'s saddle', speed: 1, drain: 0.9, hurt: 1, bags: 4, desc: 'Deep-seated and broad, with rings for extra bags. The gallop tires you both less, and the horse carries more.' },
  saddle_racing: { id: 'saddle_racing', name: 'Racing saddle', speed: 1.04, drain: 1.05, hurt: 1.1, bags: -4, desc: 'A scrap of leather and two stirrups. A horse is quicker under it, and you feel every stone.' },
  saddle_war: { id: 'saddle_war', name: 'Cavalry saddle', speed: 0.98, drain: 1, hurt: 0.7, bags: 0, desc: 'High at the back, padded and plated at the flanks. Blows aimed at the horse do less harm.' },
};

/** Under you: her pace, and how fast the gallop tires you, from her breed, the saddle, the bond and the cores. */
export function horseFx(s: HorseState, t: Traits = T(3, 3, 3, 8, '')): { speed: number; drain: number } {
  const lvl = bondLevel(s.bond), sd = s.saddle ? SADDLES[s.saddle] : undefined;
  const speed = (1 + 0.025 * (lvl - 1)) * (1 + 0.03 * (t.pace - 3)) * (sd?.speed ?? 1) * (s.health < 25 ? 0.9 : 1);
  const drain = (1 - 0.1 * (lvl - 1)) * (1 - 0.07 * (t.wind - 3)) * (sd?.drain ?? 1) * (s.stamina < 25 ? 1.5 : s.stamina < 50 ? 1.15 : 1) * (s.dirt > 70 ? 1.1 : 1);
  return { speed, drain };
}
/** How much of her health a blow you take costs her, as a share of the blow on you. */
export const hurtShare = (s: HorseState, t: Traits) => 0.7 * (1 - 0.12 * (t.tough - 3)) * (s.saddle ? SADDLES[s.saddle]?.hurt ?? 1 : 1);
/** Her saddlebags: how many kinds of thing they hold. */
export const bagsOf = (s: HorseState, t: Traits) => Math.max(2, t.bags + (s.saddle ? SADDLES[s.saddle]?.bags ?? 0 : 0));
/** Down this long, she gets herself up again (hurt still, but on her feet). */
export const DOWN_MS = 10 * 60_000;

/** Her coat as the road leaves it: the colour drawn toward mud the dirtier she is. */
export function muddy(coat: string, dirt: number): string {
  const k = Math.max(0, Math.min(0.55, (dirt - 25) / 100));
  if (k <= 0) return coat;
  const a = parseInt(coat.slice(1), 16), b = 0x5a4632;
  const mix = (sh: number) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
  return '#' + ((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0');
}

/** How a core reads in words. */
export const coreWord = (v: number, k: 'health' | 'stamina') => (v >= 75 ? (k === 'health' ? 'well fed' : 'fresh') : v >= 50 ? 'fine' : v >= 25 ? (k === 'health' ? 'peckish' : 'tiring') : (k === 'health' ? 'hungry' : 'worn out'));
export const coatWord = (d: number) => (d < 15 ? 'clean' : d < 40 ? 'dusty' : d < 70 ? 'muddy' : 'filthy');

/** The stable's feed and the tonic (data/content/stables.ts sells them). */
export const HORSE_CARE_ITEMS: ItemDef[] = [
  ...Object.values(SADDLES).map((sd): ItemDef => ({ id: sd.id, name: sd.name, kind: 'collectible', rarity: 'rare', stack: false, value: 40, icon: { shape: 'shoe', a: '#6a4a2a', b: '#c8a040' }, desc: sd.desc, stats: 'A saddle. Walk up to your horse, see to her, and put it on her. It stays in your pack, for any horse of yours.' })),
  { id: 'horse_hay', name: 'Hay net', kind: 'material', rarity: 'common', stack: true, value: 2, icon: { shape: 'bag', a: '#d8c070', b: '#8a6a3a' }, desc: 'A net of sweet meadow hay. Use it beside your horse to feed her.' },
  { id: 'horse_oats', name: 'Bag of oats', kind: 'material', rarity: 'common', stack: true, value: 5, icon: { shape: 'bag', a: '#e8d8a0', b: '#a07848' }, desc: 'Rolled oats, the stable\'s best. Use them beside your horse to feed her: more than hay does, and she loves you for it.' },
  { id: 'horse_tonic', name: 'Horse tonic', kind: 'material', rarity: 'uncommon', stack: true, value: 15, icon: { shape: 'bottle', a: '#a8502a', b: '#e8d8c0' }, desc: 'A stablemaster\'s tonic, bitter and brown. Fills a horse\'s cores right up.' },
];

/**
 * A line written for a mare, said of the horse you have (owner 2026-11-27: "have diff mounts be male or female"): for a
 * stallion she becomes he, herself himself, and her his before a noun and him otherwise ("her coat", "feed her").
 */
const HIM_AFTER = new Set(['a', 'an', 'the', 'up', 'down', 'out', 'off', 'in', 'on', 'at', 'to', 'by', 'from', 'with', 'for', 'into', 'back', 'again', 'over', 'and', 'or', 'less', 'more', 'some', 'something', 'good', 'what', 'go', 'be', 'rest', 'get', 'it', 'is', 'was', 'when', 'if', 'as']);
export function forHorse(text: string, male: boolean): string {
  if (!male) return text;
  const cap = (w: string, to: string) => (w[0] === w[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
  return text
    .replace(/\b(she)\b/gi, (w) => cap(w, 'he'))
    .replace(/\b(herself)\b/gi, (w) => cap(w, 'himself'))
    .replace(/\b(her)\b(?=(\W*)(\w*))/gi, (w, _h, gap: string, next: string) => cap(w, !next || /[.,;:!?)]/.test(gap) || HIM_AFTER.has(next.toLowerCase()) ? 'him' : 'his'));
}
