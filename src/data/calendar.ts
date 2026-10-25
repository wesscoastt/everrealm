import type { SkillId } from './items';

// The daily round: a reward for every day you come back (a monthly track, in the manner of ESO
// and SWTOR), and three Charter writs a day, the same for everyone (they're picked from the date).
// A day turns over at midnight UTC so every player shares it.

/** The day's number (days since 1970, UTC) and its date. */
export function utcDay(now = Date.now()): number { return Math.floor(now / 86_400_000); }
export function utcMonth(now = Date.now()): string { const d = new Date(now); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
/** The week (Monday to Sunday, UTC): the commissions' clock. Day 0 was a Thursday. */
export function utcWeek(now = Date.now()): number { return Math.floor((utcDay(now) + 3) / 7); }
/** Seconds until the next week. */
export function untilWeekReset(now = Date.now()): number { return Math.ceil(((utcWeek(now) + 1) * 7 - 3) * 86_400 - now / 1000); }
/** Seconds until the next day. */
export function untilReset(now = Date.now()): number { return Math.ceil(((utcDay(now) + 1) * 86_400_000 - now) / 1000); }

export interface DayReward { marks?: number; items?: string[]; label?: string }

const many = (id: string, n: number) => Array.from({ length: n }, () => id);

/** Twenty-eight days a month, claimed one per day you play (missed days don't count against you). */
export const LOGIN_TRACK: DayReward[] = [
  { marks: 10 }, { items: many('bread', 3) }, { items: many('copper_ore', 5) }, { marks: 15 },
  { items: many('cooked_mackerel', 2) }, { items: many('iron_ore', 3) }, { marks: 40, label: 'A week in' },
  { items: many('bread', 5) }, { items: many('tin_ore', 5) }, { marks: 20 }, { items: many('cooked_trout', 3) },
  { items: many('elder_logs', 3) }, { items: many('silver_ore', 2) }, { items: ['halter_dun'], label: 'A horse of your own' },
  { marks: 25 }, { items: many('cooked_seabass', 2) }, { items: many('iron_ore', 5) }, { marks: 30 },
  { items: ['star_crystal'] }, { items: many('cooked_char', 2) }, { marks: 60, label: 'Three weeks' },
  { items: many('silver_ore', 3) }, { items: many('elder_logs', 5) }, { marks: 35 }, { items: many('star_crystal', 2) },
  { items: many('cooked_char', 3) }, { marks: 50 }, { items: ['halter_roan'], label: 'The month\'s horse' },
];

export type WritKind = 'kill' | 'chore' | 'event' | 'travel' | 'dungeon' | 'boss' | 'quest' | `xp:${SkillId}`;

export interface WritDef { id: string; name: string; desc: string; kind: WritKind; need: number; marks: number; xp: number; skill: SkillId }

export const WRITS: WritDef[] = [
  { id: 'packs', name: 'Thin the Packs', desc: 'Bring down 15 creatures anywhere in the counties.', kind: 'kill', need: 15, marks: 20, xp: 300, skill: 'melee' },
  { id: 'seam', name: 'Rock and Seam', desc: 'Earn 400 Mining experience.', kind: 'xp:mining', need: 400, marks: 18, xp: 200, skill: 'mining' },
  { id: 'timber', name: 'Timber for the Wrights', desc: 'Earn 400 Woodcutting experience.', kind: 'xp:woodcutting', need: 400, marks: 18, xp: 200, skill: 'woodcutting' },
  { id: 'creel', name: 'A Full Creel', desc: 'Earn 300 Fishing experience.', kind: 'xp:fishing', need: 300, marks: 18, xp: 200, skill: 'fishing' },
  { id: 'dinners', name: 'Hot Dinners', desc: 'Earn 200 Cooking experience.', kind: 'xp:cooking', need: 200, marks: 16, xp: 150, skill: 'cooking' },
  { id: 'anvil', name: 'Hammer and Tongs', desc: 'Earn 200 Smithing experience.', kind: 'xp:smithing', need: 200, marks: 16, xp: 150, skill: 'smithing' },
  { id: 'hands', name: 'A Pair of Hands', desc: 'Do six chores for parish tasks.', kind: 'chore', need: 6, marks: 22, xp: 300, skill: 'melee' },
  { id: 'bell', name: 'Answer the Bell', desc: 'See a world event through.', kind: 'event', need: 1, marks: 24, xp: 350, skill: 'melee' },
  { id: 'miles', name: 'Mile-Eater', desc: 'Travel two thousand blocks, on foot or in the saddle.', kind: 'travel', need: 2000, marks: 15, xp: 150, skill: 'melee' },
  { id: 'cull', name: 'The Reeve\'s Cull', desc: 'Bring down 25 creatures.', kind: 'kill', need: 25, marks: 28, xp: 450, skill: 'melee' },
];

/** The day's three writs: picked by the date, so every player has the same ones. */
export function writsFor(day: number): WritDef[] {
  const order = WRITS.map((w, i) => ({ w, k: Math.sin((day + 1) * 12.9898 + i * 78.233) * 43758.5453 % 1 }));
  order.sort((a, b) => a.k - b.k);
  const out: WritDef[] = [];
  for (const { w } of order) {
    // Not two of the same kind of work in one day
    if (out.some((o) => o.kind === w.kind)) continue;
    out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

/** Finishing all three: a bundle on top. */
export const WRIT_BUNDLE = { marks: 30, items: ['cooked_trout', 'iron_ore', 'iron_ore', 'silver_ore', 'elder_logs'] };

// ---------------------------------------------------------------- The week's commissions
// Three bigger jobs a week from the Charter, the same for everyone, picked by the week; the writs' work
// counts toward them too. All three done pays a glyph on top.

export const COMMISSIONS: WritDef[] = [
  { id: 'hunt', name: 'A Week\'s Hunting', desc: 'Bring down 150 creatures.', kind: 'kill', need: 150, marks: 120, xp: 2500, skill: 'melee' },
  { id: 'deep', name: 'Into the Deep', desc: 'Clear two dungeons, with players or henchmen.', kind: 'dungeon', need: 2, marks: 150, xp: 3000, skill: 'melee' },
  { id: 'giant', name: 'Giant-Killer', desc: 'Help bring down a world boss.', kind: 'boss', need: 1, marks: 140, xp: 3000, skill: 'melee' },
  { id: 'errands', name: 'Errands and Favours', desc: 'Finish five quests.', kind: 'quest', need: 5, marks: 130, xp: 2500, skill: 'melee' },
  { id: 'bells', name: 'Every Bell Answered', desc: 'See four world events through.', kind: 'event', need: 4, marks: 120, xp: 2500, skill: 'melee' },
  { id: 'roads', name: 'The Long Road', desc: 'Travel fifteen thousand blocks.', kind: 'travel', need: 15000, marks: 100, xp: 1500, skill: 'melee' },
  { id: 'parish', name: 'Parish Work', desc: 'Do twenty chores for parish tasks.', kind: 'chore', need: 20, marks: 120, xp: 2000, skill: 'melee' },
  { id: 'deepseam', name: 'Deep Seams', desc: 'Earn 4,000 Mining experience.', kind: 'xp:mining', need: 4000, marks: 110, xp: 2000, skill: 'mining' },
  { id: 'saw', name: 'A Week at the Saw', desc: 'Earn 4,000 Woodcutting experience.', kind: 'xp:woodcutting', need: 4000, marks: 110, xp: 2000, skill: 'woodcutting' },
  { id: 'nets', name: 'Nets and Lines', desc: 'Earn 3,000 Fishing experience.', kind: 'xp:fishing', need: 3000, marks: 110, xp: 2000, skill: 'fishing' },
  { id: 'kitchen', name: 'The Big Kitchen', desc: 'Earn 2,000 Cooking experience.', kind: 'xp:cooking', need: 2000, marks: 100, xp: 1500, skill: 'cooking' },
  { id: 'forge', name: 'The Forge Fires', desc: 'Earn 2,000 Smithing experience.', kind: 'xp:smithing', need: 2000, marks: 100, xp: 1500, skill: 'smithing' },
];

/** The week's three commissions: picked by the week, one of each kind of work. */
export function commissionsFor(week: number): WritDef[] {
  const order = COMMISSIONS.map((w, i) => ({ w, k: Math.abs(Math.sin((week + 7) * 39.3468 + i * 11.135) * 43758.5453) % 1 }));
  order.sort((a, b) => a.k - b.k);
  const out: WritDef[] = [];
  for (const { w } of order) {
    if (out.some((o) => o.kind === w.kind || (o.kind.startsWith('xp:') && w.kind.startsWith('xp:')))) continue;
    out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

/** All three commissions done: marks, and a glyph of the second tier. */
export const COMMISSION_BUNDLE = { marks: 250, items: ['flame', 'frost', 'leech', 'storm', 'warding', 'vigour', 'thorns', 'swift'].map((k) => `glyph_${k}_2`) };
