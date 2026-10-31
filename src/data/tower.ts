import type { BossPhase, EnemyDef, EnemyType } from './gameplay';

// The Endless Tower (docs/TOWER_BRIEF.md): floors without end, each one worked out from its number, so
// floor 437 is the same floor for everyone, every time, and no floor has to be made by hand. A floor is a
// theme (the chamber it's in), an encounter (what it asks of you), the foes (from the realm's own kinds,
// themed), and, as the climb goes on, modifiers that change how they fight. Every fifth floor is an
// elite or a special challenge; every tenth a boss, put together from the realm's own boss mechanics
// (attack patterns, guards and menders, phases that summon, heal and call storms), so no two tens are
// the same fight. Difficulty comes from what's on the floor before it comes from bigger numbers; the
// numbers rise slowly and never stop.
//
// This file is the plan only: what a floor is. game/Tower.ts runs it, with the realm's own creatures and
// combat (Enemy, Game.dealDamage), in the tower's hall.

export type Theme = 'stone' | 'overgrown' | 'frozen' | 'volcanic' | 'haunted' | 'crypt' | 'arcane' | 'royal';
export type Encounter = 'cull' | 'waves' | 'survive' | 'timed' | 'hazard' | 'elite' | 'miniboss' | 'boss';
export type Modifier = 'frenzied' | 'ironclad' | 'tended' | 'swarming' | 'sharp' | 'stubborn' | 'called';

export interface Bracket { from: number; name: string; desc: string }
export const BRACKETS: Bracket[] = [
  { from: 1, name: 'The Lower Stair', desc: 'Where everyone starts: the tower\'s own vermin, and the first of its keepers.' },
  { from: 11, name: 'The Long Galleries', desc: 'Stronger kinds, and elites among them.' },
  { from: 26, name: 'The Middle Floors', desc: 'Mixed packs, healers behind shields, floors that change the rules.' },
  { from: 51, name: 'The High Halls', desc: 'Advanced fights, and bosses that know what they are doing.' },
  { from: 101, name: 'The Crown', desc: 'The end of what most climbers ever see.' },
  { from: 201, name: 'Above the Crown', desc: 'Nobody agrees on how the tower can be this tall from outside.' },
  { from: 501, name: 'The Endless', desc: 'Prestige. It does not stop.' },
];
export const bracketOf = (n: number): Bracket => [...BRACKETS].reverse().find((b) => n >= b.from)!;

export const THEMES: Record<Theme, { name: string; floor: string; wall: string; trim: string; light: string; fog: string; foes: EnemyType[]; casters: EnemyType[]; supports: EnemyType[]; big: EnemyType[] }> = {
  stone: { name: 'Ancient stone chamber', floor: '#6a665c', wall: '#585448', trim: '#8a8474', light: '#ffd8a0', fog: '#2a2824',
    foes: ['rustback', 'graniteback', 'brassmite', 'thornwolf'], casters: ['shardseeker', 'keener'], supports: ['claimguard', 'bailiff', 'bonesetter'], big: ['torcairn', 'slagcairn', 'graniteback'] },
  overgrown: { name: 'Overgrown ruin', floor: '#4a5a3a', wall: '#3e4a34', trim: '#6a7a4a', light: '#d8ffb0', fog: '#1e2a18',
    foes: ['thornwolf', 'gladespider', 'heathadder', 'bramblemaw'], casters: ['adderwife', 'gladehermit'], supports: ['herbwife', 'greysister'], big: ['bramblemaw', 'amberbear', 'brownbear'] },
  frozen: { name: 'Frozen chamber', floor: '#c8d8e0', wall: '#9ab0c0', trim: '#e8f4ff', light: '#c8e8ff', fog: '#2a3640',
    foes: ['frostwolf', 'icewolf', 'rimejelly', 'rimewight'], casters: ['keener', 'shardseeker'], supports: ['wreckbosun', 'greysister'], big: ['rimeglass', 'whitebear', 'rimecairn'] },
  volcanic: { name: 'Volcanic arena', floor: '#3a2a24', wall: '#2a1c18', trim: '#c8582a', light: '#ffa060', fog: '#2a1410',
    foes: ['cinderhound', 'ashcrawler', 'ashbat', 'ventjelly'], casters: ['resinburner', 'glassblower'], supports: ['quarryforeman', 'herbwife'], big: ['cinderhorn', 'slagcairn', 'flatsdrake'] },
  haunted: { name: 'Haunted hall', floor: '#3a3644', wall: '#2c2834', trim: '#7a6a9a', light: '#b0a0ff', fog: '#16121c',
    foes: ['wisp', 'willight', 'greyed', 'greybrother'], casters: ['lampwrecker', 'keener'], supports: ['greysister', 'bonesetter'], big: ['risen', 'rimewight', 'felltroll'] },
  crypt: { name: 'Underground crypt', floor: '#4a443a', wall: '#3a352c', trim: '#a8a090', light: '#9fe8ff', fog: '#12141a',
    foes: ['dg_barrowdead', 'barrowspider', 'cavebat', 'risen'], casters: ['gravewarden', 'wightpriest'], supports: ['wightpriest', 'bailiff'], big: ['barrowwight', 'dg_wight', 'felltroll'] },
  arcane: { name: 'Arcane chamber', floor: '#2a2e48', wall: '#22253a', trim: '#8ac8ff', light: '#9fd8ff', fog: '#0e1020',
    foes: ['shardjelly', 'brassmite', 'glim', 'liftmoth'], casters: ['shardseeker', 'glassblower'], supports: ['mitekeeper', 'gladehermit'], big: ['shardwarden', 'basilisk', 'glassback'] },
  royal: { name: 'Ancient royal hall', floor: '#5a4a34', wall: '#4a3a28', trim: '#d8b050', light: '#ffe0a0', fog: '#1e160e',
    foes: ['dg_warder', 'revenueman', 'claimguard', 'roadbully'], casters: ['houndsman', 'keener'], supports: ['bailiff', 'quarryforeman', 'bonesetter'], big: ['wreckbosun', 'quarryforeman', 'dg_warder'] },
};
const THEME_ORDER: Theme[] = ['stone', 'overgrown', 'frozen', 'volcanic', 'haunted', 'crypt', 'arcane', 'royal'];

export const ENCOUNTERS: Record<Encounter, { name: string; ask: string }> = {
  cull: { name: 'Clear the floor', ask: 'Defeat every foe on the floor.' },
  waves: { name: 'Waves', ask: 'Hold out through every wave.' },
  survive: { name: 'Survive', ask: 'Stay standing until the stair opens.' },
  timed: { name: 'Against the sand', ask: 'Defeat every foe before the sand runs out.' },
  hazard: { name: 'Bad ground', ask: 'Defeat every foe; keep off the burning ground.' },
  elite: { name: 'Elite', ask: 'Defeat the elite pack.' },
  miniboss: { name: 'Champion', ask: 'Defeat the floor\'s champion.' },
  boss: { name: 'Keeper of the floor', ask: 'Defeat the keeper.' },
};

export const MODIFIERS: Record<Modifier, { name: string; desc: string }> = {
  frenzied: { name: 'Frenzied', desc: 'Foes move and strike faster.' },
  ironclad: { name: 'Ironclad', desc: 'Some foes carry shields: go round them, or stun them.' },
  tended: { name: 'Tended', desc: 'A mender walks with every pack: kill it first.' },
  swarming: { name: 'Swarming', desc: 'More foes than the floor should hold.' },
  sharp: { name: 'Sharp', desc: 'Foes hit a fifth harder and have a fifth less life.' },
  stubborn: { name: 'Stubborn', desc: 'Foes have a third more life.' },
  called: { name: 'Called', desc: 'Something on the floor keeps calling more.' },
};

/** A seeded random for a floor: the same floor rolls the same every time. */
export function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

/** How much tougher than the realm's own a foe is on this floor: slowly, without end. */
export function floorScale(n: number): { hp: number; damage: number } {
  return { hp: 1 + 0.045 * (n - 1) + 0.00004 * (n - 1) ** 2, damage: 1 + 0.025 * (n - 1) };
}

export interface FloorFoe { type: EnemyType; elite?: boolean; name?: string; mods?: Partial<EnemyDef> }
export interface FloorPlan {
  n: number;
  bracket: Bracket;
  theme: Theme;
  encounter: Encounter;
  modifiers: Modifier[];
  /** The waves of foes (a cull or a boss floor is one wave). */
  waves: FloorFoe[][];
  /** Seconds: how long to hold (survive), or the sand (timed). */
  secs?: number;
  /** A boss floor's keeper: built from the realm's boss mechanics. */
  boss?: FloorFoe & { title: string; mechanics: string[] };
  /** A checkpoint: you can start a run here once you've cleared it. */
  checkpoint: boolean;
}

/** Floors you can start a run from, once cleared: every tenth. */
export const isCheckpoint = (n: number) => n % 10 === 0;
/** The checkpoint at or under a floor (1 is always open). */
export const checkpointUnder = (n: number) => Math.max(1, Math.floor(n / 10) * 10);

/** A boss's name: what it is, where it keeps. */
const BOSS_TITLES = ['the Warden of the Stair', 'Keeper of the Tenth', 'the Long Watch', 'the Stairfoot Thing', 'the Hollow Steward', 'the Last Tenant', 'the Lamp-eater', 'the Bell-ringer', 'the Gatekeeper Below', 'the Weigher', 'the Tally-taker', 'the Old Lodger'];

/** Boss mechanic packages, from the realm's own: each a set of phases and a role. */
const BOSS_KITS: { name: string; phases: (r: () => number, t: (typeof THEMES)[Theme]) => BossPhase[]; role?: EnemyDef['role']; attack?: EnemyDef['attack'] }[] = [
  { name: 'calls its kind at half health', phases: (r, t) => [{ at: 0.5, say: 'Up. All of you. Up.', summon: pick(r, t.foes), n: 3 }] },
  { name: 'mends itself, and again', phases: () => [{ at: 0.6, say: 'Not yet.', mend: 0.15 }] },
  { name: 'calls a storm down', phases: () => [{ at: 0.7, say: 'Stand still and it is quicker.', storm: true }] },
  { name: 'summons, then storms', phases: (r, t) => [{ at: 0.75, summon: pick(r, t.foes), n: 2 }, { at: 0.35, say: 'Enough.', storm: true }] },
  { name: 'shields itself from the front', phases: () => [], role: 'guard' },
  { name: 'fights from range, gathering spells', phases: (r, t) => [{ at: 0.5, summon: pick(r, t.supports), n: 1 }], attack: 'cast' },
  { name: 'charges down the hall', phases: () => [{ at: 0.4, say: 'Run, then.', storm: true }], attack: 'charge' },
  { name: 'slams the floor round it', phases: (r, t) => [{ at: 0.5, summon: pick(r, t.foes), n: 2 }], attack: 'slam' },
];

/** The plan for floor n (any n from 1, without end). */
export function towerFloor(n: number, party = 1): FloorPlan {
  const r = rng(n * 7919 + 17);
  const bracket = bracketOf(n);
  // Themes go round, ten floors to a theme, the order shuffled by the decade
  const decade = Math.floor((n - 1) / 10);
  const theme = THEME_ORDER[(decade * 5 + Math.floor(rng(decade + 3)() * 8)) % THEME_ORDER.length];
  const t = THEMES[theme];
  const encounter: Encounter = n % 10 === 0 ? 'boss' : n % 5 === 0 ? (r() < 0.5 ? 'elite' : 'miniboss') : pick(r, n < 4 ? ['cull', 'cull', 'waves'] as Encounter[] : ['cull', 'waves', 'survive', 'timed', 'hazard'] as Encounter[]);
  // Modifiers: none on the lower stair; one from 11, two from 51, three from 201
  const nMods = n < 11 ? 0 : n < 51 ? (r() < 0.5 ? 1 : 0) : n < 201 ? 1 + (r() < 0.4 ? 1 : 0) : 2 + (r() < 0.4 ? 1 : 0);
  const modifiers: Modifier[] = [];
  const all = Object.keys(MODIFIERS) as Modifier[];
  while (modifiers.length < nMods) { const m = pick(r, all); if (!modifiers.includes(m)) modifiers.push(m); }
  // A pack's size: grows with the climb, and with the party (more foes, not fatter ones)
  const base = 3 + Math.min(4, Math.floor(n / 25)) + (party - 1) * 2 + (modifiers.includes('swarming') ? 2 : 0);
  const pack = (k: number): FloorFoe[] => {
    const out: FloorFoe[] = [];
    for (let i = 0; i < k; i++) out.push({ type: i === 1 && (n >= 8 || r() < 0.3) ? pick(r, t.casters) : pick(r, t.foes) });
    if (modifiers.includes('tended') || (n >= 26 && r() < 0.35)) out.push({ type: pick(r, t.supports) });
    if (modifiers.includes('ironclad')) out.push({ type: pick(r, ['claimguard', 'bailiff', 'wreckbosun', 'quarryforeman'] as EnemyType[]) });
    if (modifiers.includes('called')) out.push({ type: pick(r, ['wolfwife', 'adderwife', 'mitekeeper', 'houndsman', 'gravewarden'] as EnemyType[]) });
    return out;
  };
  let waves: FloorFoe[][] = [];
  let secs: number | undefined;
  let boss: FloorPlan['boss'];
  switch (encounter) {
    case 'cull': case 'hazard': waves = [pack(base)]; break;
    case 'timed': waves = [pack(base)]; secs = 45 + base * 6; break;
    case 'waves': waves = [pack(base - 1), pack(base), pack(base + 1)]; break;
    case 'survive': secs = 40 + Math.min(40, Math.floor(n / 5)); waves = [pack(base - 1), pack(base - 1), pack(base), pack(base)]; break;
    case 'elite': waves = [[...pack(Math.max(2, base - 2)).map((f, i) => (i < 2 ? { ...f, elite: true } : f))]]; break;
    case 'miniboss': waves = [[{ type: pick(r, t.big), elite: true, name: 'Champion of the ' + (n) + 'th' }, ...pack(Math.max(1, base - 3))]]; break;
    case 'boss': {
      const kit = BOSS_KITS[(Math.floor(n / 10) * 3 + Math.floor(r() * BOSS_KITS.length)) % BOSS_KITS.length];
      const second = n >= 50 ? BOSS_KITS[(Math.floor(n / 10) * 5 + 2) % BOSS_KITS.length] : null;
      const phases = [...kit.phases(r, t), ...(second && second !== kit ? second.phases(r, t).map((p) => ({ ...p, at: Math.max(0.15, p.at - 0.2) })) : [])];
      const title = BOSS_TITLES[Math.floor(n / 10) % BOSS_TITLES.length];
      boss = {
        type: pick(r, t.big), elite: true, name: title.replace(/^the /, 'The '), title,
        mechanics: [kit.name, ...(second && second !== kit ? [second.name] : [])],
        mods: { phases, ...(kit.role ? { role: kit.role } : {}), ...(kit.attack ? { attack: kit.attack } : {}), ...(second?.role ? { role: second.role } : {}) },
      };
      // A party brings the keeper more of its kind, not a fatter keeper
      waves = [party > 1 ? pack(party - 1) : []];
      break;
    }
  }
  return { n, bracket, theme, encounter, modifiers, waves, secs, boss, checkpoint: isCheckpoint(n) };
}

/** A tower foe's numbers on floor n: the realm's own kind, at the floor's scale and modifiers. */
export function towerDef(base: EnemyDef, f: FloorFoe, plan: FloorPlan): EnemyDef {
  const s = floorScale(plan.n);
  let hp = base.hp * s.hp, damage = base.damage * s.damage, speed = base.speed, cooldown = base.cooldown;
  if (f.elite) { hp *= 2.4; damage *= 1.3; }
  // (a keeper is a boss to the realm's combat: elite, and at least 1500 strong, so it staggers and has phases)
  if (plan.boss && f === plan.boss) { hp = Math.max(1500, hp * (6 + Math.min(6, plan.n / 50))); damage *= 1.4; }
  if (plan.modifiers.includes('frenzied')) { speed *= 1.25; cooldown *= 0.8; }
  if (plan.modifiers.includes('sharp')) { damage *= 1.2; hp *= 0.8; }
  if (plan.modifiers.includes('stubborn')) hp *= 1.33;
  return {
    ...base, ...f.mods, name: f.name ?? base.name, elite: f.elite || base.elite,
    hp: Math.round(hp), damage: Math.round(damage), speed, cooldown,
    aggro: 40, leash: 200, respawn: 0, loot: [], marks: [Math.round(base.marks[0] * (1 + plan.n * 0.02)), Math.round(base.marks[1] * (1 + plan.n * 0.02))],
    xp: Math.round(base.xp * (1 + plan.n * 0.03) * (f.elite ? 2 : 1)),
  };
}

// ---------------------------------------------------------------- Where it stands
/** The tower: east of Ansbury beside the Turnpike, a morning's walk from the capital. Its door faces west, to the road. */
export const TOWER = { x: 1220, z: 372 };
/** Its keeper stands inside the door; you start a run with her. */
export const TOWER_KEEPER: [number, number] = [TOWER.x - 2.5, TOWER.z + 0.5];
/** The halls under it, one for each theme, in a row to the south; each is HALL wide inside, its floor at HALL_Y. */
export const HALL = 24, HALL_Y = 10;
export const HALL_AT: Record<Theme, { x: number; z: number }> = Object.fromEntries((Object.keys(THEMES) as Theme[]).map((t, i) => [t, { x: TOWER.x - 140 + i * (HALL + 10), z: TOWER.z + 60 }])) as Record<Theme, { x: number; z: number }>;
/** Where you come in, and where the foes come from, in a hall (offsets from its corner). */
export const HALL_ENTRY: [number, number] = [HALL / 2, HALL - 3];
export const HALL_SPAWNS: [number, number][] = [[5, 5], [HALL / 2, 4], [HALL - 5, 5], [4, HALL / 2], [HALL - 4, HALL / 2], [7, 9], [HALL - 7, 9], [HALL / 2, 8]];
