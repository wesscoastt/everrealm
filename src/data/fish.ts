import type { ItemDef } from './items';

// FISHING: the fish of the Counties and Morrow, where each lives, what it takes, and how rare it is; the rods
// and the baits. Read by game/Game.ts (the cast, the bite, the fight) and game/FishFight.ts (the reel).
//
// Every water is one of a few kinds, worked out from where you stand (waterAt): a river, a lake, a pond, the sea,
// the warm sea of the Keys and the Bright Coast, a swamp or fen, or cold water (the high tarns, the Sickle). The
// old marked spots are those kinds too. A fish lives in some of them, takes some baits and refuses a bare hook
// if it's choosy, and wants a fisher of its level; its tier sets how often it bites at all.
//
// The two that stand apart (owner 2026-11-04): the Ice Spice Fish, 0.000001% a cast in cold water (1 in
// 100,000,000), and the Megalodon, 0.0001% a cast at sea (1 in 1,000,000). Those are rolled by the realm itself
// (server/fishing.mjs) on every eligible cast, exactly at those odds: no rod, bait, skill or bonus touches them.

export type FishWater = 'river' | 'lake' | 'pond' | 'sea' | 'warmsea' | 'swamp' | 'cold' | 'warmriver';
export type FishTier = 'common' | 'uncommon' | 'rare' | 'veryrare' | 'legendary' | 'mythical';
export type BaitKind = 'worm' | 'grub' | 'minnow' | 'shrimp' | 'paste' | 'lure';

export const TIER_NAME: Record<FishTier, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', veryrare: 'Very rare', legendary: 'Legendary', mythical: 'Mythical' };
/** How often a tier bites against the others, on a plain cast (a common fish is 60 to a legendary's 0.25). */
export const TIER_WEIGHT: Record<FishTier, number> = { common: 60, uncommon: 25, rare: 6, veryrare: 1.2, legendary: 0.25, mythical: 0 };
/** How hard a tier fights on the line (the reel's speed and how narrow its safe band is). */
export const TIER_FIGHT: Record<FishTier, number> = { common: 0.2, uncommon: 0.35, rare: 0.55, veryrare: 0.7, legendary: 0.85, mythical: 1 };
export const WATER_NAME: Record<FishWater, string> = { river: 'River', lake: 'Still water', pond: 'Pond', sea: 'Open sea', warmsea: 'Warm sea', swamp: 'Fen water', cold: 'Cold water', warmriver: 'Warm river' };

export interface FishDef {
  id: string;
  name: string;
  tier: FishTier;
  waters: FishWater[];
  /** Fishing level it wants: below it, it doesn't bite for you. */
  level: number;
  /** Baits it takes (a match triples its chance); `choosy`: it won't look at a bare hook. */
  bait: BaitKind[];
  choosy?: boolean;
  /** Its weight, pounds, from smallest to biggest. */
  lb: [number, number];
  xp: number;
  /** The fishmonger's price for an average one (bigger ones pay more). */
  value: number;
  /** Two colours for its icon. */
  a: string; b: string;
  desc: string;
  /** Already an item in the game (data/items.ts); otherwise made here. */
  existing?: boolean;
}

export const FISH: FishDef[] = [
  // ---- Common
  { id: 'raw_minnow', name: 'Minnow', tier: 'common', waters: ['river', 'lake', 'pond', 'swamp'], level: 1, bait: [], lb: [0.05, 0.2], xp: 15, value: 2, a: '#9aa8a0', b: '#c8d0c8', desc: '', existing: true },
  { id: 'raw_perch', name: 'Perch', tier: 'common', waters: ['lake', 'pond', 'river', 'swamp'], level: 1, bait: ['worm'], lb: [0.3, 2], xp: 20, value: 4, a: '#6a8a3a', b: '#e0a040', desc: 'Striped like a wasp and twice as bold. Takes anything wriggling. Small ones make good bait for the bigger fish.' },
  { id: 'raw_crappie', name: 'Crappie', tier: 'common', waters: ['lake', 'pond'], level: 3, bait: ['worm', 'minnow'], lb: [0.4, 2.5], xp: 24, value: 5, a: '#8a9a8a', b: '#3a4a3a', desc: 'A speckled panfish that comes in schools. Catch one and there are thirty more where it came from.' },
  { id: 'raw_trout', name: 'Brown trout', tier: 'common', waters: ['river', 'cold'], level: 5, bait: ['worm', 'grub'], lb: [0.5, 6], xp: 40, value: 6, a: '#8a7a52', b: '#c86a5a', desc: '', existing: true },
  { id: 'raw_mackerel', name: 'Mackerel', tier: 'common', waters: ['sea'], level: 8, bait: ['shrimp', 'lure'], lb: [0.5, 3], xp: 55, value: 7, a: '#3a6a8a', b: '#d8e0e8', desc: '', existing: true },
  { id: 'raw_flounder', name: 'Flounder', tier: 'common', waters: ['sea', 'warmsea'], level: 6, bait: ['worm', 'shrimp'], lb: [0.5, 5], xp: 45, value: 6, a: '#8a7a5a', b: '#d8c8a8', desc: 'Lies flat on the sand with both eyes on one side, looking up at you, unimpressed.' },
  { id: 'raw_shrimp', name: 'Shrimp', tier: 'common', waters: ['sea', 'warmsea'], level: 2, bait: [], lb: [0.02, 0.1], xp: 16, value: 3, a: '#e8a080', b: '#f0d0c0', desc: 'Grey in the water and pink in the pan. Put one on the hook and the sea fish come.' },
  // ---- Uncommon
  { id: 'raw_catfish', name: 'Catfish', tier: 'uncommon', waters: ['river', 'swamp', 'lake'], level: 10, bait: ['worm', 'grub', 'paste'], lb: [2, 30], xp: 70, value: 14, a: '#5a5a4a', b: '#a8a888', desc: 'Whiskers, a mouth like a bucket, and a taste for anything that smells bad. The bigger ones are older than you.' },
  { id: 'raw_bass', name: 'Bass', tier: 'uncommon', waters: ['lake', 'river', 'pond'], level: 12, bait: ['minnow', 'lure'], lb: [1, 9], xp: 80, value: 16, a: '#4a6a3a', b: '#c8c890', desc: 'Hits the bait like it owes it money, then jumps to show you who won.' },
  { id: 'raw_salmon', name: 'Salmon', tier: 'uncommon', waters: ['river', 'cold'], level: 14, bait: ['minnow', 'grub', 'lure'], lb: [4, 22], xp: 95, value: 20, a: '#9aa8b8', b: '#e08a6a', desc: 'Silver from the sea, coming up the river to where it was born. It doesn\'t eat on the way. It bites anyway.' },
  { id: 'raw_pike', name: 'Pike', tier: 'uncommon', waters: ['lake', 'river'], level: 10, bait: ['minnow', 'lure'], lb: [3, 25], xp: 70, value: 15, a: '#5a6a3a', b: '#c8c070', desc: '', existing: true },
  { id: 'raw_seabass', name: 'Sea bass', tier: 'uncommon', waters: ['sea'], level: 15, bait: ['shrimp', 'minnow'], lb: [2, 12], xp: 95, value: 18, a: '#6a7a8a', b: '#d8d8d0', desc: '', existing: true },
  { id: 'raw_char', name: 'Arctic char', tier: 'uncommon', waters: ['cold'], level: 25, bait: ['grub', 'minnow'], lb: [1, 10], xp: 160, value: 22, a: '#6a4a3a', b: '#e05a3a', desc: '', existing: true },
  { id: 'raw_clownfish', name: 'Clownfish', tier: 'uncommon', waters: ['warmsea'], level: 40, bait: ['shrimp'], choosy: true, lb: [0.1, 0.4], xp: 120, value: 24, a: '#f07a20', b: '#f8f0e8', desc: 'Orange and white and very small, and the Keys children say it lives in a poisonous flower and nothing can touch it. They\'re right.' },
  // ---- Rare
  { id: 'raw_mahimahi', name: 'Mahi-mahi', tier: 'rare', waters: ['warmsea'], level: 42, bait: ['minnow', 'lure'], choosy: true, lb: [10, 40], xp: 260, value: 60, a: '#3ab870', b: '#f0d040', desc: 'Green and gold in the water, grey a minute after it\'s out. The Keys call it the fish that dies of embarrassment.' },
  { id: 'raw_tuna', name: 'Tuna', tier: 'rare', waters: ['sea', 'warmsea'], level: 30, bait: ['minnow', 'lure'], choosy: true, lb: [30, 300], xp: 240, value: 70, a: '#2a3a5a', b: '#c8d0d8', desc: 'Built like a cannonball and runs like one. Hook a big one and you\'ll be fighting it until your arms forget your name.' },
  { id: 'raw_barracuda', name: 'Barracuda', tier: 'rare', waters: ['warmsea'], level: 44, bait: ['minnow', 'lure'], choosy: true, lb: [5, 50], xp: 280, value: 65, a: '#8a9aa8', b: '#2a3a4a', desc: 'All teeth and a long silver grudge. Don\'t put your hand anywhere near its mouth, even after.' },
  { id: 'raw_stingray', name: 'Stingray', tier: 'rare', waters: ['sea', 'warmsea'], level: 34, bait: ['shrimp'], choosy: true, lb: [10, 80], xp: 250, value: 55, a: '#6a5a4a', b: '#c8b8a0', desc: 'A flat brown wing off the bottom, and a barbed tail you keep a long way from your leg.' },
  { id: 'raw_gar', name: 'Alligator gar', tier: 'rare', waters: ['swamp'], level: 28, bait: ['minnow'], choosy: true, lb: [20, 160], xp: 230, value: 50, a: '#5a6a4a', b: '#c8c0a0', desc: 'A fish with a crocodile\'s face and an armoured hide. The fen folk say it was here before the fen.' },
  { id: 'raw_piranha', name: 'Piranha', tier: 'rare', waters: ['warmriver'], level: 46, bait: ['minnow', 'paste'], lb: [0.5, 3], xp: 270, value: 45, a: '#8a8a9a', b: '#d84a3a', desc: 'Red belly, silver sides, and a jaw that clicks shut like a purse. Never alone.' },
  // ---- Very rare
  { id: 'raw_snapper', name: 'Alligator snapper', tier: 'veryrare', waters: ['swamp'], level: 32, bait: ['minnow', 'paste'], choosy: true, lb: [30, 180], xp: 420, value: 120, a: '#4a4a3a', b: '#8a7a5a', desc: 'A turtle the size of a cartwheel, with a beak that could take a finger and a pink worm on its tongue to lure the fish in. It came up on your line looking furious.' },
  { id: 'raw_shark', name: 'Shark', tier: 'veryrare', waters: ['sea', 'warmsea'], level: 48, bait: ['minnow'], choosy: true, lb: [150, 900], xp: 600, value: 220, a: '#5a6a7a', b: '#d8dce0', desc: 'Not a huss. The real thing: grey, unhurried, and very much interested in the boat.' },
  { id: 'seaturtle_find', name: 'Sea turtle', tier: 'veryrare', waters: ['warmsea'], level: 40, bait: ['shrimp'], choosy: true, lb: [80, 400], xp: 500, value: 0, a: '#4a7a5a', b: '#c8b870', desc: 'An old green turtle, barnacled and patient, who took your bait and then looked at you until you cut her loose. You kept a scale of her shell that had come away. She swam off as if nothing had happened.' },
  // ---- Legendary
  { id: 'glass_eel', name: 'Glass eel', tier: 'legendary', waters: ['swamp', 'pond'], level: 12, bait: ['worm'], lb: [0.1, 0.3], xp: 300, value: 80, a: '#bfe8f2', b: '#7fc8e0', desc: '', existing: true },
  { id: 'old_gnasher', name: 'Old Gnasher', tier: 'legendary', waters: ['lake'], level: 45, bait: ['minnow', 'lure'], choosy: true, lb: [40, 60], xp: 1200, value: 400, a: '#3a4a2a', b: '#a8a870', desc: 'The pike every lake has a story about, and this is the one. A hook rusted into his lip from someone\'s grandfather, and an eye that has seen you before.' },
  { id: 'pale_char', name: 'The Pale Char', tier: 'legendary', waters: ['cold'], level: 55, bait: ['grub', 'minnow'], choosy: true, lb: [12, 20], xp: 1400, value: 450, a: '#e8eef2', b: '#a8c8d8', desc: 'White from nose to tail, as if the cold had got into it and stayed. The Sickle fishers call it luck and throw salt over their shoulders.' },
];
export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f])) as Record<string, FishDef>;

/** The two the realm rolls itself, at exactly these odds a cast (server/fishing.mjs). */
export const MYTHICS = {
  ice_spice_fish: { odds: 1e-8, waters: ['cold'] as FishWater[], name: 'Ice Spice Fish' },
  megalodon: { odds: 1e-6, waters: ['sea', 'warmsea'] as FishWater[], name: 'Megalodon' },
} as const;

// ---------------------------------------------------------------- Baits and rods
/** What each bait item counts as on the hook (minnows and small perch are bait as well as catch). */
export const BAIT_OF: Record<string, BaitKind> = { bait_worm: 'worm', bait_grub: 'grub', raw_minnow: 'minnow', raw_perch: 'minnow', raw_shrimp: 'shrimp', bait_paste: 'paste', bait_spinner: 'lure' };

/** What a rod does: bite (how much sooner the bite comes), luck (how much likelier the rarer tiers are), line
 *  (how hard a fish it can hold: below a fish's fight the band is narrow and it snaps easily), steady (how wide
 *  the safe band on the reel is). Each has its strength; none is best at all of them. */
export interface RodStats { bite: number; luck: number; line: number; steady: number }
export const ROD_STATS: Record<string, RodStats> = {
  fishing_rod: { bite: 0, luck: 0, line: 0.35, steady: 0.3 },
  rod_willow: { bite: 0.15, luck: 0, line: 0.4, steady: 0.4 },
  rod_ash: { bite: 0.1, luck: 0.15, line: 0.55, steady: 0.35 },
  rod_greenheart: { bite: 0.05, luck: 0.35, line: 0.6, steady: 0.3 },
  rod_searod: { bite: 0, luck: 0.1, line: 0.9, steady: 0.25 },
  rod_brass: { bite: 0.3, luck: 0.1, line: 0.6, steady: 0.5 },
  rod_starglass: { bite: 0.2, luck: 0.5, line: 0.8, steady: 0.45 },
};

const fishItem = (f: FishDef): ItemDef => ({
  id: f.id, name: f.name, kind: f.value === 0 ? 'collectible' : 'material',
  rarity: f.tier === 'common' ? 'common' : f.tier === 'uncommon' ? 'uncommon' : f.tier === 'rare' ? 'rare' : f.tier === 'veryrare' ? 'epic' : 'legendary',
  stack: true, value: f.value, icon: { shape: 'fish', a: f.a, b: f.b }, desc: f.desc,
  stats: `${TIER_NAME[f.tier]} fish · ${f.waters.map((w) => WATER_NAME[w].toLowerCase()).join(', ')}`,
});
const rod = (id: string, name: string, rarity: ItemDef['rarity'], level: number, value: number, a: string, desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'tool', rarity, stack: false, value, icon: { shape: 'rod', a }, desc, tool: { skill: 'fishing', power: 1, level, held: 'rod' }, stats });
const bait = (id: string, name: string, value: number, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'material', rarity: 'common', stack: true, value, icon: { shape: 'gel', a }, desc, stats: 'Bait. Use it to put it on your hook: every cast takes one.' });

export const FISHING_ITEMS: ItemDef[] = [
  ...FISH.filter((f) => !f.existing).map(fishItem),
  { id: 'seaturtle_scale', name: 'A sea turtle\'s scale', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'shell', a: '#4a7a5a', b: '#c8b870' }, desc: 'A plate of shell that came away from an old green turtle you let go. You can see the years in it, ring on ring.' },
  { id: 'ice_spice_fish', name: 'Ice Spice Fish', kind: 'collectible', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'fish', a: '#e8f8ff', b: '#ff6a3a' }, desc: 'A fish made of clear cold, with a fire-orange stripe down it that never melts the ice round it. One cast in a hundred million. You might be the only one in the realm with one.', stats: 'Mythical fish · cold water · 0.000001% a cast' },
  { id: 'megalodon_tooth', name: 'Megalodon tooth', kind: 'collectible', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'fang', a: '#e8e0d0', b: '#5a6a7a' }, desc: 'A tooth as long as your hand, from the jaw of a shark the size of a ship, that you somehow brought up on a line. Nobody will believe you. Show them.', stats: 'Mythical catch · the open sea · 0.0001% a cast' },
  rod('rod_willow', 'Willow rod', 'common', 1, 20, '#a89060', 'A light green-willow rod. Quick to answer: a bite comes sooner, and it forgives a heavy hand.', 'Fishing rod · bites sooner · a wide, easy reel'),
  rod('rod_ash', 'Ash rod', 'uncommon', 12, 90, '#c8a878', 'Ash, seasoned two winters, with a brass ferrule. Stronger line than a willow, and a little luck in it.', 'Fishing rod · a stronger line · a little luckier'),
  rod('rod_greenheart', 'Greenheart rod', 'rare', 25, 320, '#5a6a3a', 'Greenheart from the Keys, heavy and patient. The rare fish come to it more than to any rod but one.', 'Fishing rod · much luckier · a narrower reel'),
  rod('rod_searod', 'Sea rod', 'rare', 30, 380, '#3a4a5a', 'A short thick rod with a wire trace, for the sea. It holds a tuna or a shark that would snap any lake rod like a twig.', 'Fishing rod · the strongest line · slow to bite'),
  rod('rod_brass', 'Brass-reel rod', 'rare', 35, 420, '#c8a050', 'A Kell rod with a geared brass reel. It brings fish in steady and fast, and bites come quick.', 'Fishing rod · bites soonest · the widest reel'),
  rod('rod_starglass', 'Starglass rod', 'legendary', 50, 0, '#a8f0ff', 'Cut from a fallen star\'s glass and strung with something that isn\'t quite thread. Fish come to it as if it called them.', 'Fishing rod · the luckiest · strong and steady'),
  bait('bait_worm', 'Worms', 1, '#c87a6a', 'A twist of damp moss with earthworms in it. Every fish in fresh water likes a worm.'),
  bait('bait_grub', 'Grubs', 2, '#e8d8a0', 'Fat white grubs from under bark. The trout and the char can\'t leave them alone.'),
  bait('bait_paste', 'Stink paste', 3, '#8a6a3a', 'Bread, fish guts and cheese, rolled into balls and left in the sun. Catfish come from a mile off. So do flies.'),
  bait('bait_spinner', 'Brass spinner', 12, '#d8b060', 'A spoon of beaten brass on a swivel that flashes like a fleeing minnow. Predators can\'t resist it, and it lasts a while.'),
];

// ---------------------------------------------------------------- The roll
/** A cast's fish, by water, level, bait and rod (the mythics aren't in it: the realm rolls those). */
export function rollFish(water: FishWater, level: number, baitKind: BaitKind | null, rodLuck: number, rnd = Math.random): FishDef | null {
  const pool = FISH.filter((f) => f.waters.includes(water) && level >= f.level - 3 && (!f.choosy || (baitKind && f.bait.includes(baitKind))));
  if (!pool.length) return null;
  const w = pool.map((f) => {
    let k = TIER_WEIGHT[f.tier] * (level >= f.level ? 1 : 0.25);
    if (baitKind && f.bait.includes(baitKind)) k *= 3;
    if (f.tier !== 'common' && f.tier !== 'uncommon') k *= 1 + rodLuck;
    return k;
  });
  let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

/** How heavy this one is (pounds): most near the small end, now and then a big one. */
export function fishWeight(f: FishDef, rnd = Math.random): number {
  const t = Math.pow(rnd(), 2.2);
  return Math.round((f.lb[0] + (f.lb[1] - f.lb[0]) * t) * 100) / 100;
}

/** The legacy marked spots, as the new kinds of water. */
export const SPOT_WATER: Record<string, FishWater> = { wend: 'river', spill: 'river', eelpool: 'swamp', lake: 'lake', sea: 'sea', highland: 'cold' };
/** Regions by their water: cold, warm, fen. */
export const COLD_REGIONS = new Set(['starfall', 'tolmen', 'sickle', 'held']);
export const WARM_REGIONS = new Set(['keys', 'bright', 'glades']);
export const FEN_REGIONS = new Set(['wrath', 'inkholm']);
