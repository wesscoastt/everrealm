import type { ItemDef, Rarity } from './items';
import type { WeaponFamily, WeaponGuard, WeaponHead, WeaponModel, WeaponPommel } from '../entities/humanoid';
import type { RegionId } from '../world/terrain';

// The realm's weapons: every family made by everyone who makes them, each spending the same budget
// (GEAR_BUDGET, items.ts: 8 points) its own way, so a new one is a different way to fight, not a
// bigger number. A family sets the shape (a sabre is quick, a spear long, a great axe slow and
// heavy); where it was made leans it a point one way (Gullmouth's draw blood back, Kirkglass finds
// the gaps). Each looks like what it is in the hand (humanoid.ts weaponMesh).

type Trait = 'damage' | 'speed' | 'reach' | 'crit' | 'leech';
const PER: Record<Trait, number> = { damage: 1, speed: 0.05, reach: 0.25, crit: 0.03, leech: 0.02 };

/** Each family's spend of the 8 points, and what it's called and like. */
const FAMILIES: Record<WeaponFamily, { pts: Partial<Record<Trait, number>>; noun: string; held: 'sword' | 'bronzeSword'; lines: string[] }> = {
  sword: { pts: { damage: 6, crit: 2 }, noun: 'sword', held: 'sword', lines: ['A plain arming sword, good for most things and best at none of them.', 'Straight, double-edged, a hand and a half long in the blade.'] },
  sabre: { pts: { damage: 4, speed: 4 }, noun: 'sabre', held: 'sword', lines: ['Light and curved, made for cutting from horseback and recovering fast.', 'A curved blade with a knuckle guard. It comes back to you quicker than a straight one.'] },
  longsword: { pts: { damage: 5, reach: 3 }, noun: 'longsword', held: 'sword', lines: ['Long in the blade and long in the grip, for keeping someone at the end of it.', 'A longsword: two hands when it matters, one when it doesn\'t.'] },
  greatsword: { pts: { damage: 11, speed: -3 }, noun: 'greatsword', held: 'sword', lines: ['As tall as a boy and twice as heavy. Each swing is a decision.', 'A two-handed sword with lugs below the guard. It ends arguments slowly and for good.'] },
  dagger: { pts: { damage: 2, speed: 4, crit: 2 }, noun: 'dagger', held: 'sword', lines: ['Short and quick. It goes where a sword can\'t.', 'A narrow blade for close work, the kind people keep in a boot.'] },
  falchion: { pts: { damage: 6, crit: 3, speed: -1 }, noun: 'falchion', held: 'sword', lines: ['One edge, widening toward the point, so the weight falls where it bites.', 'A broad, single-edged blade. Cooks and soldiers agree about it.'] },
  cleaver: { pts: { damage: 10, speed: -2 }, noun: 'cleaver', held: 'bronzeSword', lines: ['A heavy chopping blade, more slab than sword.', 'Square-ended and thick in the back. It doesn\'t cut so much as arrive.'] },
  axe: { pts: { damage: 7, crit: 3, speed: -2 }, noun: 'axe', held: 'bronzeSword', lines: ['A one-handed war axe. All the weight is out at the bit, where it does the work.', 'A one-handed axe. Hook a shield with it, then don\'t stop.'] },
  greataxe: { pts: { damage: 12, speed: -4 }, noun: 'great axe', held: 'bronzeSword', lines: ['A two-headed axe on a long haft. Slow to start and impossible to stop.', 'Twin blades on a haft as long as you are tall.'] },
  mace: { pts: { damage: 8 }, noun: 'mace', held: 'bronzeSword', lines: ['A heavy head on a short haft. Armour dents, and whoever is inside it finds out why.', 'No edge to keep and nothing to sharpen. You only need to be the one swinging it.'] },
  hammer: { pts: { damage: 11, speed: -4, reach: 1 }, noun: 'war hammer', held: 'bronzeSword', lines: ['A hammer with a spike behind the face, on a long haft.', 'The face for plate, the spike for anything else.'] },
  spear: { pts: { damage: 3, reach: 5 }, noun: 'spear', held: 'sword', lines: ['A spear. Whatever it is, it\'s further from you.', 'Ash shaft, iron head. The oldest answer there is.'] },
  staff: { pts: { damage: 2, reach: 3, speed: 2, leech: 1 }, noun: 'staff', held: 'sword', lines: ['A walking staff shod at both ends. Quick in good hands, and long.', 'A long staff, bound at the grips. It keeps a fight at arm\'s length and then some.'] },
};

interface Source {
  /** The id part and the name's first word. */
  id: string;
  name: string;
  region?: RegionId;
  dungeon?: string;
  /** Where it's sold, if anywhere: a shop's id (data/gameplay.ts SHOP_STOCK). */
  shop?: string;
  /** Smithed at an anvil from these bars, at this smithing level. */
  smith?: { bar: string; level: number };
  rarity: Rarity;
  value: number;
  lean?: Trait;
  colours: { metal: string; hilt: string; grip: string; accent?: string; glow?: string };
  /** How this maker shapes things: its guards and pommels, and the head on each kind of weapon. */
  style: { guard: WeaponGuard; pommel: WeaponPommel; blade: WeaponHead; axe?: WeaponHead; mace?: WeaponHead; hammer?: WeaponHead; staff?: WeaponHead; spear?: WeaponHead };
  /** What this maker calls a family, where it isn't the plain word. */
  nouns?: Partial<Record<WeaponFamily, string>>;
  families: WeaponFamily[];
  lines: string[];
}

const SOURCES: Source[] = [
  {
    id: 'hollin', name: 'Hollin', region: 'greenwake', rarity: 'common', value: 18, colours: { metal: '#9aa0a8', hilt: '#5a4a3a', grip: '#6e4a2c' }, style: { guard: 'bar', pommel: 'cube', blade: 'fuller', axe: 'hatchet', mace: 'knob', hammer: 'maul', staff: 'crook', spear: 'leaf' },
    nouns: { cleaver: 'billhook', staff: 'crook', falchion: 'hedge blade' },
    families: ['sword', 'dagger', 'axe', 'spear', 'staff', 'mace', 'falchion', 'cleaver', 'hammer', 'sabre'],
    lines: ['Hammered out by the Hollin Ford smithy between ploughshares.', 'Farm iron, honest and a little soft. It holds an edge if you hold the stone to it.', 'Made in the valley, for the valley: wolves, mostly, and the odd fox.'],
  },
  {
    id: 'charter', name: 'Charter', region: 'crownroad', rarity: 'uncommon', value: 40, lean: 'reach', colours: { metal: '#c8ccd4', hilt: '#e0bd64', grip: '#2a4a8a', accent: '#e0bd64' }, style: { guard: 'crescent', pommel: 'wheel', blade: 'fuller', axe: 'broad', mace: 'flanged', hammer: 'pick', spear: 'winged' },
    families: ['sword', 'longsword', 'sabre', 'greatsword', 'spear', 'mace', 'dagger', 'hammer', 'falchion', 'axe', 'cleaver'],
    lines: ['Ansbury steel from the Charter armoury, blue-wrapped, the road sign stamped on the ricasso.', 'Issued to the Charter watch. The quartermaster counts them back in, and checks the edges.', 'Good steel, paid for out of the tolls. Every pass along the Turnpike sharpened one of these.'],
  },
  {
    id: 'collegium', name: 'Collegium', region: 'crownroad', rarity: 'uncommon', value: 44, lean: 'leech', colours: { metal: '#b8bcc8', hilt: '#5a2a4a', grip: '#2a3a6a', accent: '#e0bd64', glow: '#9ac8ff' }, style: { guard: 'swept', pommel: 'gem', blade: 'tapered', staff: 'orb', spear: 'leaf' },
    nouns: { staff: 'staff', sword: 'tutor\'s sword', dagger: 'letter knife' },
    families: ['staff', 'dagger', 'sword', 'spear', 'longsword', 'sabre'],
    lines: ['From the Collegium\'s fencing hall in Ansbury, where the third years practise and the first years watch.', 'Collegium work: plum and gold at the grip, and a stone in the pommel that glows when you\'re tired.'],
  },
  {
    id: 'turnpike', name: 'Turnpike', region: 'crownroad', rarity: 'uncommon', value: 38, lean: 'speed', colours: { metal: '#d8dce2', hilt: '#3a3a3e', grip: '#5a3a24', accent: '#2a4a86' }, style: { guard: 'swept', pommel: 'cap', blade: 'fuller', axe: 'bearded', mace: 'flanged', spear: 'winged' },
    nouns: { spear: 'lance', mace: 'rider\'s mace' },
    families: ['sabre', 'spear', 'axe', 'mace', 'dagger', 'longsword', 'sword', 'falchion'],
    lines: ['Toll-rider issue, light enough to carry all day on the long stretch past the Waystation.', 'The toll riders gave these up when the road went quiet. Most of them kept the scabbards.'],
  },
  {
    id: 'hagworm', name: 'Hagworm', region: 'brambledeep', rarity: 'rare', value: 60, lean: 'crit', colours: { metal: '#8a9a7a', hilt: '#3a2a1a', grip: '#4a3a24', accent: '#5a7a3a' }, style: { guard: 'bar', pommel: 'ring', blade: 'tapered', axe: 'bearded', mace: 'knob', hammer: 'maul', staff: 'gnarled', spear: 'winged' },
    nouns: { spear: 'boar spear', staff: 'thornwood staff', cleaver: 'fellers\' billhook', greataxe: 'felling axe' },
    families: ['spear', 'axe', 'greataxe', 'staff', 'dagger', 'falchion', 'sword', 'hammer', 'cleaver', 'mace', 'sabre'],
    lines: ['Hagworm iron, quenched in the bog. It finds the gap in a hide the way a root finds a crack.', 'The fellers keep these for what lives under the ancients, and say a dull one is worse than none.', 'Bog-oak at the grip, black and hard as horn.'],
  },
  {
    id: 'gullmouth', name: 'Gullmouth', region: 'saltwind', rarity: 'rare', value: 60, lean: 'leech', colours: { metal: '#9ad0e0', hilt: '#c8a050', grip: '#5a3a24', accent: '#c8a050' }, style: { guard: 'disc', pommel: 'cap', blade: 'fuller', axe: 'hatchet', mace: 'studded', hammer: 'maul', spear: 'harpoon' },
    nouns: { sabre: 'cutlass', spear: 'harpoon', cleaver: 'boarding cleaver', axe: 'boarding axe', dagger: 'rigging knife' },
    families: ['sabre', 'cleaver', 'dagger', 'spear', 'axe', 'falchion', 'mace', 'sword', 'longsword', 'hammer'],
    lines: ['Salt-pitted and brass-fitted, from a chandler on the Gullmouth quay. Sailors say a blade that has been in the sea gives back what it takes.', 'Gullmouth work, made for a slippery deck and a short fight.', 'Brass and sea-steel. It smells faintly of tar, whatever you clean it with.'],
  },
  {
    id: 'harrowgate', name: 'Harrowgate', region: 'redstone', rarity: 'rare', value: 62, lean: 'damage', colours: { metal: '#6a5a54', hilt: '#c86a2a', grip: '#2a201c', accent: '#c86a2a' }, style: { guard: 'bar', pommel: 'cube', blade: 'tapered', axe: 'broad', mace: 'star', hammer: 'maul', spear: 'glaive' },
    nouns: { hammer: 'drift hammer', cleaver: 'slag cleaver' },
    families: ['cleaver', 'hammer', 'greataxe', 'mace', 'greatsword', 'axe', 'falchion', 'sword', 'spear', 'dagger'],
    lines: ['Black from the Harrowgate furnaces, copper-banded at the grip. The company docks your pay if you lose it.', 'Cut from drift rail and ground to an edge in the Works yard.', 'Foundry iron: heavy, unpretty, and very hard to break.'],
  },
  {
    id: 'kirkglass', name: 'Kirkglass', region: 'starfall', rarity: 'rare', value: 70, lean: 'crit', colours: { metal: '#a8f0ff', hilt: '#3a4a52', grip: '#2a3a42', glow: '#9fe8ff' }, style: { guard: 'crescent', pommel: 'gem', blade: 'wavy', axe: 'crescent', staff: 'orb', spear: 'glaive' },
    families: ['sword', 'longsword', 'dagger', 'spear', 'staff', 'greatsword', 'axe', 'sabre'],
    lines: ['Star crystal from the Highlands, set in plain iron. It hums when it hits.', 'Warm to the touch and faintly bright in the dark. The Scarth Watch log every piece of crystal that leaves the Highlands, and this one wasn\'t logged.'],
  },
  {
    id: 'cragsby', name: 'Cragsby', region: 'gannet', rarity: 'rare', value: 58, lean: 'reach', colours: { metal: '#c8ccd0', hilt: '#e8dcc0', grip: '#5a4a3a', accent: '#3a5a7a' }, style: { guard: 'disc', pommel: 'fishtail', blade: 'tapered', axe: 'hatchet', mace: 'knob', hammer: 'pick', staff: 'ringed', spear: 'harpoon' },
    nouns: { staff: 'climmer\'s pole', spear: 'gannet spear' },
    families: ['spear', 'axe', 'dagger', 'staff', 'falchion', 'sabre', 'sword', 'mace', 'longsword', 'hammer'],
    lines: ['From the cliff town of Cragsby: whalebone at the grip, iron worked thin to be light on a rope.', 'Cliff-watch issue. Nobody on the Gannet Cliffs carries anything they\'d mind dropping a hundred feet.'],
  },
  {
    id: 'fen', name: 'Fen', region: 'wrath', rarity: 'rare', value: 58, lean: 'leech', colours: { metal: '#8a7a4a', hilt: '#3a4a2e', grip: '#2a2014', accent: '#4a5a2a' }, style: { guard: 'none', pommel: 'ring', blade: 'leaf', axe: 'bearded', mace: 'knob', staff: 'forked', spear: 'gig' },
    nouns: { spear: 'eel gig', staff: 'punt staff', cleaver: 'reed hook' },
    families: ['spear', 'staff', 'axe', 'dagger', 'mace', 'cleaver', 'falchion', 'sword'],
    lines: ['Bog bronze from the Wrath Levels, eel-skin at the grip so it doesn\'t slip when it\'s wet, which is always.', 'Made in Holme Staithe by people who mostly fight eels.'],
  },
  {
    id: 'barrow', name: 'Barrow', region: 'tolmen', rarity: 'epic', value: 90, lean: 'damage', colours: { metal: '#8a6a3a', hilt: '#3a5a4a', grip: '#2e241c', accent: '#3a5a4a' }, style: { guard: 'none', pommel: 'cap', blade: 'leaf', axe: 'crescent', mace: 'knob', hammer: 'lucerne', spear: 'leaf' },
    nouns: { greatsword: 'barrow blade', sword: 'barrow sword' },
    families: ['sword', 'greatsword', 'axe', 'greataxe', 'spear', 'mace', 'hammer', 'dagger', 'falchion'],
    lines: ['Old bronze from a barrow on Tolmen Moor, green at the edges, older than the Charter. It still takes an edge.', 'The moor folk say the man it was buried with hasn\'t asked for it back. Yet.'],
  },
  {
    id: 'pit', name: 'Pit', dungeon: 'gd-oldman', rarity: 'rare', value: 55, colours: { metal: '#7a7466', hilt: '#3a362e', grip: '#5a564c', accent: '#c8a050' }, style: { guard: 'bar', pommel: 'cube', blade: 'fuller', axe: 'pick', mace: 'knob', hammer: 'pick', spear: 'leaf' },
    nouns: { hammer: 'pit hammer', axe: 'pick-axe', dagger: 'candle knife' },
    families: ['hammer', 'axe', 'mace', 'dagger', 'cleaver', 'spear', 'falchion'],
    lines: ['From the Old Man\'s Workings under Sallow Pit, where Coll Bray\'s night shift kept the tools they took.', 'A miner\'s tool made into something else. The handle still has the shift number burnt in.'],
  },
  {
    id: 'kettle', name: 'Kettle', dungeon: 'gd-kettle', rarity: 'epic', value: 95, lean: 'crit', colours: { metal: '#c8f4ff', hilt: '#d8d0c0', grip: '#4a3a2a', glow: '#c8f4ff' }, style: { guard: 'crescent', pommel: 'gem', blade: 'leaf', axe: 'crescent', mace: 'star', staff: 'orb', spear: 'glaive' },
    nouns: { staff: 'shepherd\'s light' },
    families: ['spear', 'sword', 'greataxe', 'staff', 'dagger', 'longsword', 'mace'],
    lines: ['Crystal from under the Kettle, where the Glim grew. It gives a little light of its own.', 'Kelderby shepherds\' work, made from what came out of the crack in the Kettle\'s wall.'],
  },
  {
    id: 'bronze', name: 'Bronze', smith: { bar: 'bronze_bar', level: 4 }, rarity: 'uncommon', value: 30, colours: { metal: '#d6a052', hilt: '#8a5a2a', grip: '#5a3a24' }, style: { guard: 'none', pommel: 'cap', blade: 'leaf', axe: 'crescent', mace: 'knob', hammer: 'maul', spear: 'leaf' },
    families: ['dagger', 'axe', 'mace', 'spear', 'sabre', 'falchion', 'hammer'],
    lines: ['Bronze, from your own anvil. Heavier than iron and it holds an edge if you look after it.', 'Cast and hammered bronze. Every smith in the counties starts with one.'],
  },
  {
    id: 'iron', name: 'Iron', smith: { bar: 'iron_bar', level: 17 }, rarity: 'rare', value: 60, colours: { metal: '#c8d0da', hilt: '#3a3d42', grip: '#3a2414' }, style: { guard: 'bar', pommel: 'wheel', blade: 'fuller', axe: 'bearded', mace: 'flanged', hammer: 'pick', spear: 'winged' },
    families: ['sabre', 'axe', 'hammer', 'greatsword', 'spear', 'dagger', 'mace', 'greataxe', 'falchion', 'cleaver'],
    lines: ['Iron from your own anvil: harder than bronze, and less forgiving of a bad quench.', 'Forged iron, balanced near the guard. You\'ll know if you got it wrong.'],
  },
];

/** A family's spend, leaned a point toward where it was made, kept inside what the family can bear. */
function spend(f: WeaponFamily, lean?: Trait): Record<Trait, number> {
  const p: Record<Trait, number> = { damage: 0, speed: 0, reach: 0, crit: 0, leech: 0, ...FAMILIES[f].pts };
  if (!lean) return p;
  if (lean === 'damage') { if (p.speed > -4) { p.speed -= 1; p.damage += 1; } else if (p.crit > 0) { p.crit -= 1; p.damage += 1; } }
  else if (p.damage >= 3) { p.damage -= 1; p[lean] += 1; }
  return p;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
/** Which of a maker's heads a family takes. */
function headOf(f: WeaponFamily, st: Source['style']): WeaponHead | undefined {
  switch (f) {
    case 'axe': case 'greataxe': return st.axe;
    case 'mace': return st.mace;
    case 'hammer': return st.hammer;
    case 'staff': return st.staff;
    case 'spear': return st.spear;
    case 'sabre': case 'falchion': case 'cleaver': return undefined;
    default: return st.blade;
  }
}
function describe(w: NonNullable<ItemDef['weapon']>): string {
  const parts = [`Damage +${w.damage}`];
  if (Math.abs(w.speed - 1) > 0.001) parts.push(`attacks ${Math.round(Math.abs(w.speed - 1) * 100)}% ${w.speed > 1 ? 'faster' : 'slower'}`);
  if (w.reach) parts.push(`reach +${w.reach}`);
  if (w.crit) parts.push(`critical hits +${Math.round(w.crit * 100)}%`);
  if (w.leech) parts.push(`heals ${Math.round(w.leech * 100)}% of damage dealt`);
  const lead = w.speed >= 1.15 ? 'Quick' : w.speed <= 0.85 ? 'Heavy' : (w.reach ?? 0) >= 0.75 ? 'Long' : (w.crit ?? 0) >= 0.09 ? 'Keen' : (w.leech ?? 0) >= 0.04 ? 'Draws strength' : 'Balanced';
  return `${lead}. ${parts.join(', ')}.`;
}

export const WEAPON_ITEMS: ItemDef[] = [];
/** Which weapons a region's creatures drop, a dungeon's bosses drop, and the anvil makes. */
export const REGION_WEAPONS: Partial<Record<RegionId, string[]>> = {};
export const DUNGEON_WEAPONS: Record<string, string[]> = {};
export const WEAPON_SMITHING: { id: string; bar: string; bars: number; level: number }[] = [];

SOURCES.forEach((s) => s.families.forEach((f, k) => {
  const F = FAMILIES[f], p = spend(f, s.lean);
  const weapon: NonNullable<ItemDef['weapon']> = { damage: p.damage, speed: r2(1 + p.speed * PER.speed), held: F.held, model: { family: f, ...s.colours, guard: s.style.guard, pommel: s.style.pommel, head: headOf(f, s.style) } };
  if (p.reach) weapon.reach = r2(p.reach * PER.reach);
  if (p.crit) weapon.crit = r2(p.crit * PER.crit);
  if (p.leech) weapon.leech = r2(p.leech * PER.leech);
  const noun = s.nouns?.[f] ?? F.noun;
  const id = `w_${s.id}_${f}`;
  WEAPON_ITEMS.push({
    id, name: `${s.name} ${noun}`, kind: 'weapon', rarity: s.rarity, stack: false, value: Math.round(s.value * (f === 'greatsword' || f === 'greataxe' || f === 'hammer' ? 1.3 : f === 'dagger' ? 0.7 : 1)),
    icon: { shape: 'sword', a: s.colours.metal, b: s.colours.grip }, desc: `${F.lines[k % F.lines.length]} ${s.lines[k % s.lines.length]}`,
    weapon, stats: describe(weapon),
  });
  if (s.region) (REGION_WEAPONS[s.region] ??= []).push(id);
  if (s.dungeon) (DUNGEON_WEAPONS[s.dungeon] ??= []).push(id);
  if (s.smith) WEAPON_SMITHING.push({ id, bar: s.smith.bar, bars: f === 'dagger' ? 1 : f === 'greatsword' || f === 'greataxe' || f === 'hammer' ? 4 : 2, level: s.smith.level + (k % 4) });
}));

/** Models for the weapons the game had before these (so they show as what they are). */
export const OLD_WEAPON_MODELS: Record<string, WeaponModel> = {
  worn_sword: { family: 'sword', metal: '#b4bcc6', hilt: '#3a3d42', grip: '#4a2e1c' },
  bronze_sword: { family: 'sword', metal: '#d6a052', hilt: '#8a5a2a', grip: '#5a3a24' },
  iron_sword: { family: 'longsword', metal: '#c8d0da', hilt: '#3a3d42', grip: '#3a2414' },
  toll_sabre: { family: 'sabre', metal: '#d8dce2', hilt: '#2a4a86', grip: '#3a2a1a' },
  thorn_blade: { family: 'falchion', metal: '#9ab07a', hilt: '#24301a', grip: '#3a2a1a' },
  brine_cutlass: { family: 'sabre', metal: '#9ad0e0', hilt: '#c8a050', grip: '#5a3a24' },
  harrow_cleaver: { family: 'cleaver', metal: '#a86a4a', hilt: '#3a1410', grip: '#2a1a12' },
  starglass_edge: { family: 'sword', metal: '#a8f0ff', hilt: '#2a8ab0', grip: '#2a3a42', glow: '#9fe8ff' },
  bray_hanger: { family: 'sabre', metal: '#b8bcc0', hilt: '#c8a050', grip: '#5a3a2a' },
  fell_knife: { family: 'dagger', metal: '#dfe4ea', hilt: '#4a3a2a', grip: '#d8c8a8' },
  u_dancey_billhook: { family: 'falchion', metal: '#a8b0a0', hilt: '#4a3a24', grip: '#5a4a2a' },
  u_clinker_tusk: { family: 'cleaver', metal: '#e8dcc0', hilt: '#3a2414', grip: '#2a1a12', accent: '#c86a2a' },
  u_rime_knife: { family: 'dagger', metal: '#cfefff', hilt: '#5a6a7a', grip: '#e8e0d0', glow: '#cfefff' },
  u_tallow_knife: { family: 'dagger', metal: '#c8c0a8', hilt: '#6a3a1a', grip: '#3a2a1a' },
  u_marys_tooth: { family: 'sword', metal: '#f0ece0', hilt: '#2e3640', grip: '#2e3640' },
  u_climmer_crook: { family: 'staff', metal: '#b8a07a', hilt: '#4a3a2a', grip: '#6a5a3a' },
  u_houndcatcher_hanger: { family: 'sabre', metal: '#c0c4c8', hilt: '#3a3a3a', grip: '#4a3a2a' },
  u_kettle_light: { family: 'sword', metal: '#c8f4ff', hilt: '#6a5a40', grip: '#4a3a2a', glow: '#c8f4ff' },
};
