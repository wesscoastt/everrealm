import type { ItemDef, Rarity } from './items';

// Gear that drops, the way a modern MMO's does, kept horizontal at the top (GEAR_BUDGET, items.ts).
// A piece that drops is rolled from one of the game's own pieces:
//   Quality: Worn, Fine, Superior or Masterwork. Each step is a point or two more of the same budget,
//     and it stops at Masterwork: a little better than Fine, never a new tier to chase.
//   Leaning: Keen, Quick, Reaching, Thirsty or Heavy on a weapon; Stout, Hale, Tireless or Nimble on
//     armour. It moves points from one trait into another: the same sword, a different way to fight.
// Named pieces are something else. Each has its own story and an effect nothing else has, and the
// realm holds only a few of each. The realm server numbers them as they're found
// (server/uniques.mjs); when they're all out, that piece stops dropping.
//
// A rolled piece's id is its base's id and its roll ("bronze_sword__keen2"), and a named piece's is
// its own id and its number ("u_dancey_billhook__n2"): ids that the pack, the bank, trades and the
// Exchange already carry. ITEMS (items.ts) works out the rest when it's asked for one.

export const QUALITY: { word: string; rarity: Rarity; weapon: number; armour: number; value: number }[] = [
  { word: 'Worn', rarity: 'common', weapon: -2, armour: -1, value: 0.6 },
  { word: 'Fine', rarity: 'uncommon', weapon: 0, armour: 0, value: 1 },
  { word: 'Superior', rarity: 'rare', weapon: 1, armour: 1, value: 1.6 },
  { word: 'Masterwork', rarity: 'epic', weapon: 2, armour: 2, value: 2.6 },
];

type WTrait = 'damage' | 'speed' | 'reach' | 'crit' | 'leech';
type ATrait = 'defense' | 'vigor' | 'wind' | 'roll';
/** What one point of the budget buys (GEAR_BUDGET). */
const W_PER: Record<WTrait, number> = { damage: 1, speed: 0.05, reach: 0.25, crit: 0.03, leech: 0.02 };
const A_PER: Record<ATrait, number> = { defense: 1, vigor: 10, wind: 0.1, roll: 0.04 };

export const AFFIXES: Record<string, { word: string; weapon?: WTrait; armour?: ATrait }> = {
  keen: { word: 'Keen', weapon: 'crit' },
  quick: { word: 'Quick', weapon: 'speed' },
  long: { word: 'Reaching', weapon: 'reach' },
  thirsty: { word: 'Thirsty', weapon: 'leech' },
  heavy: { word: 'Heavy', weapon: 'damage' },
  stout: { word: 'Stout', armour: 'defense' },
  hale: { word: 'Hale', armour: 'vigor' },
  tireless: { word: 'Tireless', armour: 'wind' },
  nimble: { word: 'Nimble', armour: 'roll' },
};

/** Can this piece drop rolled? Weapons and armour, not the starter sword, not a named piece. */
export function rollable(d: ItemDef | undefined): boolean {
  return !!d && !d.stack && !!(d.weapon || d.armor) && !d.named && d.id !== 'worn_sword' && !d.id.includes('__');
}

function weaponPts(w: NonNullable<ItemDef['weapon']>): Record<WTrait, number> {
  return { damage: w.damage, speed: Math.round((w.speed - 1) / W_PER.speed), reach: Math.round((w.reach ?? 0) / W_PER.reach), crit: Math.round((w.crit ?? 0) / W_PER.crit), leech: Math.round((w.leech ?? 0) / W_PER.leech) };
}
function armourPts(a: NonNullable<ItemDef['armor']>): Record<ATrait, number> {
  return { defense: a.defense, vigor: Math.round((a.vigor ?? 0) / A_PER.vigor), wind: Math.round((a.wind ?? 0) / A_PER.wind), roll: Math.round((a.roll ?? 0) / A_PER.roll) };
}

/** Does a leaning fit this piece? It needs the points to move: two of damage (or of pace, for Heavy), one of defence. */
export function affixFits(d: ItemDef, affix: string): boolean {
  const A = AFFIXES[affix];
  if (!A) return false;
  if (d.weapon) return !!A.weapon && (A.weapon === 'damage' ? weaponPts(d.weapon).speed >= -2 : d.weapon.damage >= 2);
  if (d.armor) return !!A.armour && (A.armour === 'defense' || d.armor.defense >= 1);
  return false;
}

/** Whose name is it? "Coll Bray's hanger" takes its leaning after; "bronze sword" before. */
function rolledName(base: ItemDef, q: number, affix: string): string {
  const owned = /^(?:[A-Z][a-z]+ [A-Z][a-z]+|Tolley|Bram)'s /.test(base.name);
  const proper = /^(Brine|Harrowgate|Kirkglass|Thornback|Kelderby|Gullmouth|Ansbury|Scarth|Hagworm|Raddle|Turnpike)\b/.test(base.name);
  const lead = owned || proper ? base.name : base.name[0].toLowerCase() + base.name.slice(1);
  const word = affix ? AFFIXES[affix].word : '';
  const grade = q === 0 ? 'Worn' : q === 3 ? 'Masterwork' : '';
  const front = [grade, owned ? '' : grade ? word.toLowerCase() : word].filter(Boolean).join(' ');
  const name = front ? `${front} ${lead}` : base.name;
  return owned && word ? `${name}, ${word.toLowerCase()}` : name;
}

const pct = (v: number) => Math.round(v * 100);
function weaponStats(w: NonNullable<ItemDef['weapon']>, lead: string): string {
  const parts = [`Damage +${w.damage}`];
  if (Math.abs(w.speed - 1) > 0.001) parts.push(`attacks ${pct(Math.abs(w.speed - 1))}% ${w.speed > 1 ? 'faster' : 'slower'}`);
  if (w.reach) parts.push(`reach +${w.reach}`);
  if (w.crit) parts.push(`critical hits +${pct(w.crit)}%`);
  if (w.leech) parts.push(`heals ${pct(w.leech)}% of damage dealt`);
  return `${lead}. ${parts.join(', ')}.`;
}
function armourStats(a: NonNullable<ItemDef['armor']>): string {
  const parts = [`Defence ${a.defense}`];
  if (a.vigor) parts.push(`maximum health ${a.vigor > 0 ? '+' : ''}${a.vigor}`);
  if (a.wind) parts.push(`energy comes back ${pct(Math.abs(a.wind))}% ${a.wind > 0 ? 'faster' : 'slower'}`);
  if (a.roll) parts.push(`rolls stay untouchable ${Math.round(a.roll * 100) / 100} s longer`);
  const w = a.weight ? `${a.weight[0].toUpperCase()}${a.weight.slice(1)} armour. ` : '';
  return `${w}${parts.join(', ')}.`;
}

/** A piece rolled from `base` at quality q (0 worn .. 3 masterwork) with a leaning (or none). */
function rolled(base: ItemDef, q: number, affix: string): ItemDef {
  const Q = QUALITY[q], A = affix ? AFFIXES[affix] : undefined;
  const d: ItemDef = { ...base, id: affix || q !== 1 ? `${base.id}__${affix}${q}` : base.id, base: base.id, quality: q, affix: affix || undefined, rarity: Q.rarity, value: Math.max(1, Math.round(base.value * Q.value)), name: rolledName(base, q, affix) };
  if (base.weapon) {
    const p = weaponPts(base.weapon);
    const into: WTrait = A?.weapon ?? 'damage';
    // The leaning moves two points: out of damage into its trait (Heavy takes them out of pace)
    if (A?.weapon === 'damage') { p.speed -= 2; p.damage += 2; } else if (A?.weapon) { p.damage -= 2; p[into] += 2; }
    // Quality adds to the leaning's trait, or wears the edge off
    if (Q.weapon > 0) p[into] += Q.weapon;
    else if (Q.weapon < 0) { const off = Math.min(p.damage, -Q.weapon); p.damage -= off; p.speed -= -Q.weapon - off; }
    d.weapon = { ...base.weapon, damage: p.damage, speed: Math.round((1 + p.speed * W_PER.speed) * 100) / 100 };
    for (const t of ['reach', 'crit', 'leech'] as const) { const v = Math.round(p[t] * W_PER[t] * 100) / 100; if (v) d.weapon[t] = v; else delete d.weapon[t]; }
    d.stats = weaponStats(d.weapon, A?.word ?? (q === 0 ? 'Blunted' : 'Balanced'));
  } else if (base.armor) {
    const p = armourPts(base.armor);
    const into: ATrait = A?.armour ?? 'defense';
    if (A?.armour && A.armour !== 'defense') { p.defense -= 1; p[into] += 1; }
    if (Q.armour > 0) p[into] += Q.armour;
    // Wear comes off the strongest trait it has (defence first), never below nothing
    else if (Q.armour < 0) { const t = (['defense', 'vigor', 'wind', 'roll'] as const).reduce((a, b) => (p[b] > p[a] ? b : a)); if (p[t] > 0) p[t] -= 1; }
    d.armor = { ...base.armor, defense: p.defense };
    for (const t of ['vigor', 'wind', 'roll'] as const) { const v = Math.round(p[t] * A_PER[t] * 100) / 100; if (v) d.armor[t] = v; else delete d.armor[t]; }
    d.stats = armourStats(d.armor);
  }
  return d;
}

/** The piece an id was rolled or numbered from ("bronze_sword__keen2" is a bronze_sword). */
export function baseOf(id: string): string {
  const i = id.indexOf('__');
  return i < 0 ? id : id.slice(0, i);
}

/** Work out a rolled or numbered piece from its id; null if the id isn't one. */
export function gearVariant(id: string, lookup: (id: string) => ItemDef | undefined): ItemDef | null {
  const n = /^(u_[a-z0-9_]+)__n(\d{1,3})$/.exec(id);
  if (n) { const d = lookup(n[1]); return d?.named ? { ...d, id, serial: Number(n[2]) } : null; }
  const m = /^([a-z0-9_]+?)__([a-z]*)([0-3])$/.exec(id);
  if (!m) return null;
  const base = lookup(m[1]);
  if (!base || !rollable(base) || (m[2] && !affixFits(base, m[2])) || (!m[2] && m[3] === '1')) return null;
  return rolled(base, Number(m[3]), m[2]);
}

/** How likely each quality is, by what dropped it. */
const ODDS = { mob: [35, 45, 16, 4], elite: [10, 45, 33, 12], boss: [0, 30, 45, 25] };
export type DropSource = keyof typeof ODDS;

/** Roll a piece that has dropped: its quality by the source, its leaning at random (or none). */
export function rollGear(base: ItemDef, source: DropSource, rnd: () => number = Math.random): string {
  if (!rollable(base)) return base.id;
  let r = rnd() * 100, q = 0;
  const w = ODDS[source];
  while (q < 3 && r >= w[q]) { r -= w[q]; q++; }
  const fits = Object.keys(AFFIXES).filter((a) => affixFits(base, a));
  const affix = !fits.length || rnd() < 0.2 ? '' : fits[Math.floor(rnd() * fits.length)];
  return affix || q !== 1 ? `${base.id}__${affix}${q}` : base.id;
}

// ------------------------------------------------------------------ Named pieces

/** What a named piece does that nothing else does (Game.ts reads these off what you wear). */
export type NamedFx = 'bleed' | 'momentum' | 'chill' | 'tide' | 'howl' | 'second_wind' | 'fortune' | 'crit_heal' | 'drover'
  | 'prospector' | 'regrowth' | 'last_stand' | 'stone_skin' | 'mudwalker' | 'thorns' | 'glassward' | 'weaken' | 'chain';

export interface NamedInfo {
  fx: NamedFx;
  /** The effect, as the tooltip says it. */
  text: string;
  /** How many the realm holds. */
  cap: number;
  /** What drops it (creature types) and how often, a kill. */
  from: string[];
  chance: number;
  /** Where that is, for the tooltip. */
  where: string;
}

const N = (d: Omit<ItemDef, 'kind' | 'rarity' | 'stack'> & { kind: 'weapon' | 'armor'; named: NamedInfo }): ItemDef => ({ ...d, rarity: 'legendary', stack: false });

export const NAMED_ITEMS: ItemDef[] = [
  N({
    id: 'u_dancey_billhook', name: 'Hob Dancey\'s billhook', kind: 'weapon', value: 400, icon: { shape: 'sword', a: '#a8b0a0', b: '#4a3a24' },
    desc: 'Hob Dancey cut the Bramble Ring back from the path every autumn for forty years. The autumn he didn\'t come home, the Ring closed over the path, and this was in the middle of it.',
    weapon: { damage: 6, speed: 1, held: 'sword', reach: 0.5, crit: 0.06 },
    named: { fx: 'bleed', text: 'Opens a wound: each blow hurts a third as much again over four seconds.', cap: 5, from: ['bramblemaw'], chance: 0.04, where: 'The Bramblemaw, Hagworm Wood' },
  }),
  N({
    id: 'u_clinker_tusk', name: 'The Clinker tusk', kind: 'weapon', value: 400, icon: { shape: 'sword', a: '#e8dcc0', b: '#3a2414' },
    desc: 'One of Old Clinker\'s tusks, set in an iron haft by a furnace-man at the Works who wanted the whole Raddle to know he\'d done it. It is still warm at the root.',
    weapon: { damage: 13, speed: 0.85, held: 'bronzeSword' },
    named: { fx: 'momentum', text: 'Each blow in a row on the same foe hits 5% harder, up to a quarter more.', cap: 5, from: ['cinderhorn'], chance: 0.04, where: 'Old Clinker, Clinker Bottom' },
  }),
  N({
    id: 'u_rime_knife', name: 'The Rime Bowl knife', kind: 'weapon', value: 400, icon: { shape: 'sword', a: '#cfefff', b: '#5a6a7a' },
    desc: 'A long splinter of Rimeglass, bound in sheepskin at one end. The Kelderby shepherds say it won\'t melt. They have tried, mostly by leaving it on the stove.',
    weapon: { damage: 4, speed: 1.1, held: 'sword', reach: 0.5, crit: 0.06 },
    named: { fx: 'chill', text: 'Each blow chills: the foe moves at two thirds of its pace for three seconds.', cap: 5, from: ['rimeglass'], chance: 0.04, where: 'Rimeglass, the Rime Bowl' },
  }),
  N({
    id: 'u_pilot_oilskin', name: 'The pilot\'s oilskin', kind: 'armor', value: 380, icon: { shape: 'chest', a: '#d8a830', b: '#3a2a1a' },
    desc: 'Gullmouth\'s harbour pilot wore it the night Blind Jenny took the Kittiwake. He swam home. The coat turned up a week later, stuck to Jenny\'s back.',
    armor: { slot: 'chest', defense: 2, roll: 0.08, weight: 'medium', look: { top: 6, tunic: '#d8a830', trim: '#3a2a1a' } },
    named: { fx: 'tide', text: 'Rolling gives back 10 energy and 4% of your health.', cap: 5, from: ['tidewright'], chance: 0.04, where: 'Blind Jenny, Jenny\'s Strand' },
  }),
  N({
    id: 'u_tallow_knife', name: 'Tallow Jack\'s knife', kind: 'weapon', value: 300, icon: { shape: 'sword', a: '#c8c0a8', b: '#6a3a1a' },
    desc: 'Tallow Jack fed the Pit Dog scraps for a year and called it his dog. In the end the dog decided otherwise, and kept the knife.',
    weapon: { damage: 4, speed: 1.2, held: 'sword', leech: 0.04 },
    named: { fx: 'howl', text: 'A kill puts you in a fury: you attack a quarter faster for six seconds.', cap: 3, from: ['r_pitdog'], chance: 0.06, where: 'The Pit Dog, the Raddle Barrens' },
  }),
  N({
    id: 'u_marys_tooth', name: 'Big Mary\'s tooth', kind: 'weapon', value: 500, icon: { shape: 'sword', a: '#f0ece0', b: '#2e3640' },
    desc: 'Big Mary has been taking nets off the Fleet Coast since your grandmother was a girl. This came out of a boat\'s keel in Gullmouth harbour. The boat came home without its bottom.',
    weapon: { damage: 6, speed: 1, held: 'sword', leech: 0.08 },
    named: { fx: 'second_wind', text: 'A kill gives back 6% of your health.', cap: 2, from: ['r_bigmary'], chance: 0.08, where: 'Big Mary, off the Fleet Coast' },
  }),
  N({
    id: 'u_climmer_crook', name: 'The climmer\'s crook', kind: 'weapon', value: 300, icon: { shape: 'sword', a: '#b8a07a', b: '#4a3a2a' },
    desc: 'Cragsby\'s climmers go down the Gannet Cliffs on a rope for the eggs, with a crook like this to pull the ledges in. The Egg Thief has beaten them to it six springs running.',
    weapon: { damage: 5, speed: 1.05, held: 'sword', reach: 1 },
    named: { fx: 'fortune', text: 'Creatures you kill drop a third more marks.', cap: 3, from: ['r_eggthief'], chance: 0.06, where: 'The Egg Thief, the Gannet Cliffs' },
  }),
  N({
    id: 'u_houndcatcher_hanger', name: 'The hound-catcher\'s hanger', kind: 'weapon', value: 300, icon: { shape: 'sword', a: '#c0c4c8', b: '#3a3a3a' },
    desc: 'Scarrow paid a bounty on the Tor Hound for twenty years. The hound-catcher who came closest left this in the heather when he ran, and never came back for it.',
    weapon: { damage: 7, speed: 1, held: 'sword', crit: 0.09 },
    named: { fx: 'crit_heal', text: 'Critical hits give back 2% of your health.', cap: 3, from: ['r_torhound'], chance: 0.06, where: 'The Tor Hound, Tolmen Moor' },
  }),
  N({
    id: 'u_brindle_boots', name: 'Brindle-hide boots', kind: 'armor', value: 260, icon: { shape: 'boots', a: '#6a5040', b: '#b8a080' },
    desc: 'Old Brindle had the run of the Hollindale farms for nine years. The tanner in Hollin Ford says it was the toughest hide he ever cut, and he cut it twice to be sure.',
    armor: { slot: 'feet', defense: 2, wind: 0.2, weight: 'medium', look: { boots: '#6a5040', shoes: 1 } },
    named: { fx: 'drover', text: 'Out of a fight you run 12% faster.', cap: 3, from: ['r_brindle'], chance: 0.06, where: 'Old Brindle, Hollindale' },
  }),
  N({
    id: 'u_reaper_mitts', name: 'The reapers\' mitts', kind: 'armor', value: 260, icon: { shape: 'gloves', a: '#c8a860', b: '#6a5030' },
    desc: 'The Barley Boar ate a field a night through the whole of last harvest. These are what the reapers wore to stand in front of it. Two of them still can\'t feel their thumbs.',
    armor: { slot: 'hands', defense: 1, vigor: 20, weight: 'light', look: { gloves: '#c8a860' } },
    named: { fx: 'prospector', text: 'Mining and woodcutting give you an extra one, a fifth of the time.', cap: 3, from: ['r_barley'], chance: 0.06, where: 'The Barley Boar, the Crown Road' },
  }),
  N({
    id: 'u_mosscap_cowl', name: 'Mosscap\'s cowl', kind: 'armor', value: 260, icon: { shape: 'helm', a: '#5a8a3a' },
    desc: 'Felted from the moss on Mosscap\'s back, which grows back faster than anyone can pull it. Wear it in the rain and you can hear it drinking.',
    armor: { slot: 'head', defense: 2, vigor: 40, weight: 'light', look: { hat: 'hood', hatColor: '#5a8a3a' } },
    named: { fx: 'regrowth', text: 'Out of a fight your health comes back sooner, and half again as fast.', cap: 3, from: ['r_mosscap'], chance: 0.06, where: 'Mosscap, Hagworm Wood' },
  }),
  N({
    id: 'u_barnacle_coat', name: 'The barnacle coat', kind: 'armor', value: 300, icon: { shape: 'chest', a: '#6a6a5a', b: '#d8d0b8' },
    desc: 'Old Barnacle\'s shell, cut into plates and sewn onto sailcloth by someone with a lot of patience and very good needles. It still smells of low tide.',
    armor: { slot: 'chest', defense: 5, weight: 'heavy', look: { top: 4, tunic: '#6a6a5a', trim: '#d8d0b8', shoulderPads: '#d8d0b8' } },
    named: { fx: 'last_stand', text: 'Below a third of your health, you take a quarter less from every blow.', cap: 3, from: ['r_barnacle'], chance: 0.06, where: 'Old Barnacle, the Fleet Coast' },
  }),
  N({
    id: 'u_whiteface_ruff', name: 'Whiteface\'s ruff', kind: 'armor', value: 300, icon: { shape: 'helm', a: '#f4f4f4' },
    desc: 'Whiteface is the wolf the Kelderby children are warned about. The hood is cut from his cheek ruff, and in a cold wind it still smells of snow.',
    armor: { slot: 'head', defense: 2, wind: 0.2, roll: 0.08, weight: 'medium', look: { hat: 'hood', hatColor: '#f4f4f4' } },
    named: { fx: 'stone_skin', text: 'The first blow after eight quiet seconds does half its damage.', cap: 3, from: ['r_whiteface'], chance: 0.06, where: 'Whiteface, the Scarth Highlands' },
  }),
  N({
    id: 'u_mudgut_waders', name: 'Mudgut waders', kind: 'armor', value: 260, icon: { shape: 'legs', a: '#2a2018', b: '#6a5a40' },
    desc: 'Thigh-high, boar-hide, and tarred inside. The eel-men of Holme Staithe would trade a boat for a pair and think they\'d done well.',
    armor: { slot: 'legs', defense: 2, vigor: 20, weight: 'medium', look: { trousers: '#2a2018', legs: 0 } },
    named: { fx: 'mudwalker', text: 'Bogs and loose ground don\'t slow you.', cap: 3, from: ['r_mudgut'], chance: 0.06, where: 'Old Mudgut, the Wrath Levels' },
  }),
  N({
    id: 'u_queen_gauntlets', name: 'The Rust Queen\'s gauntlets', kind: 'armor', value: 380, icon: { shape: 'gloves', a: '#c8642a', b: '#5a2a10' },
    desc: 'Two plates off the Rust Queen\'s forelegs, still stained orange. Harrowgate\'s smiths offered a year\'s wages for them and were told no, which they are not used to.',
    armor: { slot: 'hands', defense: 5, weight: 'heavy', look: { gloves: '#c8642a' } },
    named: { fx: 'thorns', text: 'Whatever hits you takes a third of the blow back.', cap: 4, from: ['rustqueen'], chance: 0.06, where: 'The Rust Queen, the Raddle Barrens' },
  }),
  N({
    id: 'u_sexton_helm', name: 'The sexton\'s glass helm', kind: 'armor', value: 380, icon: { shape: 'helm', a: '#a8f0ff' },
    desc: 'The Glass Kirk\'s sexton set a pane of Old Glass in an iron cap to keep the light off his eyes. The cap is the only part of him they found.',
    armor: { slot: 'head', defense: 6, weight: 'heavy', look: { hat: 'coif', hatColor: '#a8f0ff' } },
    named: { fx: 'glassward', text: 'When you fall below half your health, a ward takes the next fifth of it in blows. Once a minute.', cap: 4, from: ['oldglass'], chance: 0.06, where: 'Old Glass, the Scarth Highlands' },
  }),
  N({
    id: 'u_verdigris_greaves', name: 'Verdigris greaves', kind: 'armor', value: 420, icon: { shape: 'legs', a: '#3a6a52', b: '#7ac8a0' },
    desc: 'Plates of Verdigris\'s shell, green right through. Coll Bray\'s crew took the creature for a copper seam and spent a week trying to dig it out.',
    armor: { slot: 'legs', defense: 5, weight: 'heavy', look: { trousers: '#3a6a52', legs: 0 } },
    named: { fx: 'weaken', text: 'Your blows tarnish: a foe you\'ve hit does 15% less damage for four seconds.', cap: 5, from: ['dg_verdigris'], chance: 0.05, where: 'Verdigris, the Old Man\'s Workings' },
  }),
  N({
    id: 'u_kettle_light', name: 'The Kettle light', kind: 'weapon', value: 450, icon: { shape: 'sword', a: '#c8f4ff', b: '#6a5a40' },
    desc: 'A blade of the Glim\'s crystal, set in a shepherd\'s crook handle. It gives enough light to read by, which the Kelderby shepherds will tell you is all they ever wanted from it.',
    weapon: { damage: 3, speed: 1.1, held: 'sword', reach: 0.5, crit: 0.09 },
    named: { fx: 'chain', text: 'A critical hit leaps to the nearest other foe, for half as much.', cap: 5, from: ['dg_glim'], chance: 0.05, where: 'The Glim, Under the Kettle' },
  }),
];

/** Named pieces by the creature that drops them. */
export const NAMED_BY_SOURCE = new Map<string, ItemDef[]>();
for (const d of NAMED_ITEMS) for (const t of d.named!.from) NAMED_BY_SOURCE.set(t, [...(NAMED_BY_SOURCE.get(t) ?? []), d]);
