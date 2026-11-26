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
  const h = Math.max(0, Math.min(72, (now - (s.t || now)) / 3_600_000));
  s.health = Math.max(0, s.health - 4 * h);
  s.stamina = Math.max(0, s.stamina - 6 * h);
  s.dirt = Math.min(100, s.dirt + 2 * h);
  s.t = now;
  return s;
}

/** Under you: her pace, and how fast the gallop tires you, from the bond and the cores. */
export function horseFx(s: HorseState): { speed: number; drain: number } {
  const lvl = bondLevel(s.bond);
  const speed = (1 + 0.025 * (lvl - 1)) * (s.health < 25 ? 0.9 : 1);
  const drain = (1 - 0.1 * (lvl - 1)) * (s.stamina < 25 ? 1.5 : s.stamina < 50 ? 1.15 : 1) * (s.dirt > 70 ? 1.1 : 1);
  return { speed, drain };
}

/** How a core reads in words. */
export const coreWord = (v: number, k: 'health' | 'stamina') => (v >= 75 ? (k === 'health' ? 'well fed' : 'fresh') : v >= 50 ? 'fine' : v >= 25 ? (k === 'health' ? 'peckish' : 'tiring') : (k === 'health' ? 'hungry' : 'worn out'));
export const coatWord = (d: number) => (d < 15 ? 'clean' : d < 40 ? 'dusty' : d < 70 ? 'muddy' : 'filthy');

/** The stable's feed and the tonic (data/content/stables.ts sells them). */
export const HORSE_CARE_ITEMS: ItemDef[] = [
  { id: 'horse_hay', name: 'Hay net', kind: 'material', rarity: 'common', stack: true, value: 2, icon: { shape: 'bag', a: '#d8c070', b: '#8a6a3a' }, desc: 'A net of sweet meadow hay. Use it beside your horse to feed her.' },
  { id: 'horse_oats', name: 'Bag of oats', kind: 'material', rarity: 'common', stack: true, value: 5, icon: { shape: 'bag', a: '#e8d8a0', b: '#a07848' }, desc: 'Rolled oats, the stable\'s best. Use them beside your horse to feed her: more than hay does, and she loves you for it.' },
  { id: 'horse_tonic', name: 'Horse tonic', kind: 'material', rarity: 'uncommon', stack: true, value: 15, icon: { shape: 'bottle', a: '#a8502a', b: '#e8d8c0' }, desc: 'A stablemaster\'s tonic, bitter and brown. Fills a horse\'s cores right up.' },
];
