import type { ArmourSlot, ArmourWeight } from './armour';
import type { Appearance } from '../entities/humanoid';
import type { Breed } from '../entities/creatures';
import type { OffhandModel, WeaponModel } from '../entities/humanoid';
import { gearVariant, NAMED_ITEMS, type NamedInfo } from './gear';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'material' | 'tool' | 'weapon' | 'armor' | 'food' | 'quest' | 'collectible' | 'trophy';
export type SkillId = 'melee' | 'mining' | 'smithing' | 'fishing' | 'cooking' | 'woodcutting';

export interface IconSpec {
  shape: 'ore' | 'bar' | 'log' | 'fish' | 'sword' | 'pick' | 'hatchet' | 'rod' | 'bread' | 'helm' | 'shell' | 'pelt' | 'whistle' | 'gel' | 'fang' | 'cooked' | 'coin' | 'shoe' | 'chest' | 'legs' | 'gloves' | 'boots' | 'fiddle' | 'harp' | 'drum' | 'horn' | 'pipes' | 'letter' | 'bag' | 'bow' | 'wheel' | 'torch' | 'lantern';
  a: string;
  b?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  stack: boolean;
  value: number;
  icon: IconSpec;
  desc: string;
  /** Mechanical summary shown in its own line under the description. */
  stats?: string;
  heal?: number;
  /**
   * Weapon traits: flat damage, attack speed (1 = normal), extra reach in blocks, extra critical
   * chance, and the share of damage dealt that comes back as health. See GEAR_BUDGET.
   */
  weapon?: { damage: number; speed: number; held: 'sword' | 'bronzeSword'; reach?: number; crit?: number; leech?: number; model?: WeaponModel };
  tool?: { skill: SkillId; power: number; level: number; held: 'pickaxe' | 'hatchet' | 'rod' };
  /** Armour traits: damage taken off each hit, extra maximum health, energy regained (share faster), extra seconds of roll; its weight and how it shows (data/armour.ts). */
  armor?: { slot: ArmourSlot; defense: number; vigor?: number; wind?: number; roll?: number; weight?: ArmourWeight; look?: Partial<Appearance> };
  /** A halter: the horse it calls (every horse runs at the same pace; only the look differs). */
  mount?: import('../entities/creatures').MountLook;
  /** A festival dye: using it adds the colour to every swatch in the wardrobe for good. */
  dye?: { color: string; name: string };
  /** A festival bag (data/seasons.ts): using it opens it. */
  bag?: import('./festivals').FestivalId;
  /** A festival hat (data/seasons.ts): using it adds the style to the wardrobe for good. */
  hat?: import('./seasons').HatStyle;
  /** A cloak design (data/capes.ts): using it adds the design to the wardrobe for good. */
  capeDesign?: import('./capes').CapeDesign;
  /**
   * A meal's or a brew's lasting good, ESO's way: one meal and one drink at a time, each for so many
   * minutes of play. hp: a share more health; regen: a share faster back on stamina (the breath your
   * skills spend too); power: a share harder blows.
   */
  buff?: { slot: 'food' | 'drink'; hp?: number; regen?: number; power?: number; mins: number };
  /** A backpack: strapped on (used), the pack holds this many more slots for good, and it shows on your back (its look, 1..6). */
  pack?: { slots: number; look: number };
  /**
   * Carried or worn besides weapon and armour (data/offhand.ts): a shield, lantern, tome, horn or focus in
   * the left hand, an amulet, a ring. Its traits spend a small budget of their own (GEAR_BUDGET), on the
   * armour traits, critical hits, health drawn back, or calling skills recharging faster (haste).
   */
  /** An instrument (data/tunes.ts): played from the songbook, or by the number keys. */
  instrument?: import('./tunes').Voice;
  trinket?: { slot: 'offhand' | 'neck' | 'ring'; defense?: number; vigor?: number; wind?: number; roll?: number; crit?: number; leech?: number; haste?: number; model?: OffhandModel };
  /** The regional set this piece belongs to (see GEAR_SETS). */
  set?: string;
  /** Furniture for a home: the prop it becomes (see props.furniture) and its cloth tint. */
  furn?: { model: string; tint?: number };
  /** A recipe card (data/content/recipes.ts): used, it teaches this recipe for good. */
  teaches?: string;
  /** A costume (data/costumes.ts): used, it goes into the wardrobe for good, under Costume with Change look. */
  costume?: string;
  /** A pet (data/pets.ts): used, it goes into the wardrobe for good, under Pet with Change look. */
  pet?: string;
  /** A rolled piece (data/gear.ts): the piece it was rolled from, its quality (0 Worn to 3 Masterwork) and its leaning. */
  base?: string;
  quality?: number;
  affix?: string;
  /** A named piece (data/gear.ts): what it does, how many the realm holds and what drops it; and this copy's number. */
  named?: NamedInfo;
  serial?: number;
}

const I = (d: ItemDef) => d;

/**
 * Gear is horizontal. Past the starter sword, every weapon spends the same budget of 8 points,
 * and every helm the same 4, so a new find is a different way to fight, not a bigger number.
 * Power grows with Melee level; gear picks the style. Points, per weapon trait:
 * damage +1, speed +0.05, reach +0.25, crit +3%, leech 2%. Per helm trait: defense +1,
 * vigor +10 health, wind +10%, roll +0.04 s. Slower or weaker in one trait pays for another.
 * What drops is rolled from these (data/gear.ts): a quality worth a point or two either way, and a
 * leaning that moves points between traits. Named pieces spend 2 more, and each does one thing of its own.
 */
export const GEAR_BUDGET = { weapon: 8, head: 4 };

/**
 * Regional sets: any two pieces of a region's set worn together (its weapon, helm or armour) add a
 * bonus that changes how you fight, not how hard you hit. The armoury in the pack lists every piece and where it comes from.
 */
export const GEAR_SETS: Record<string, { name: string; where: string; bonus: string }> = {
  tolley: { name: 'Tolley\'s work', where: 'Smithed at an anvil', bonus: 'Your calling\'s heal (key 4) recharges a third faster.' },
  tollriders: { name: 'The Toll Riders', where: 'Turnpike wolves', bonus: 'Sprinting costs half the energy.' },
  thornback: { name: 'Thornback', where: 'Hagworm Wood', bonus: 'Your first strike on an unhurt enemy is always critical.' },
  brine: { name: 'Brine', where: 'Fleet Coast', bonus: 'Rolling through an attack restores 6% of your health.' },
  harrow: { name: 'The Works', where: 'Raddle Barrens and the Rust Queen', bonus: 'Cleave recharges in 4 seconds instead of 6.' },
  starglass: { name: 'Kirkglass', where: 'Scarth Highlands and Old Glass', bonus: 'Critical hits give back 6 energy.' },
  fold: { name: 'The Fold', where: 'Under the Kettle, the group dungeon in Scarth', bonus: 'Your blows on a foe that is after you heal you for a twentieth of the damage.' },
  brightcut: { name: 'Bright-cut', where: 'Anywhere: any creature, very rarely', bonus: 'One ore or crystal in five you mine comes out as two.' },
  escapement: { name: 'The Escapement', where: 'The Escapement, the group dungeon under the Kiln on Kell', bonus: 'Your calling\'s skills recharge a tenth faster.' },
  barrow: { name: 'Barrowborn', where: 'Kingsbarrow, the group dungeon under the old king\'s barrow in the Held', bonus: 'Below half your health, your blows heal you for a tenth of the damage they do.' },
  oldman: { name: 'The Old Man', where: 'The Old Man\'s Workings, the group dungeon under Sallow Pit', bonus: 'Your blows hit a tenth harder on a foe that is fighting someone else.' },
};
/** Everything worn: the weapon and the five armour slots (older saves only have the first two). */
export interface Equip { weapon: string | null; head: string | null; chest?: string | null; legs?: string | null; hands?: string | null; feet?: string | null }
/** The set in force: any two equipped pieces of one set (the weapon counts), the most-worn set if two qualify. */
export function activeSet(equip: Equip): string | null {
  const n = new Map<string, number>();
  for (const id of [equip.weapon, equip.head, equip.chest, equip.legs, equip.hands, equip.feet]) {
    const s = id ? ITEMS[id]?.set : undefined;
    if (s) n.set(s, (n.get(s) ?? 0) + 1);
  }
  let best: string | null = null, most = 1;
  for (const [s, k] of n) if (k > most) { best = s; most = k; }
  return best;
}
export function gearPoints(d: ItemDef): number {
  if (d.weapon) { const w = d.weapon; return w.damage + (w.speed - 1) / 0.05 + (w.reach ?? 0) / 0.25 + (w.crit ?? 0) / 0.03 + (w.leech ?? 0) / 0.02; }
  if (d.armor) { const a = d.armor; return a.defense + (a.vigor ?? 0) / 10 + (a.wind ?? 0) / 0.1 + (a.roll ?? 0) / 0.04; }
  return 0;
}

const BASE_ITEMS: Record<string, ItemDef> = Object.fromEntries([
  // Ores and bars
  I({ id: 'copper_ore', name: 'Copper ore', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'ore', a: '#c8743a', b: '#4fae8c' }, desc: 'Smelts with tin into bronze.' }),
  I({ id: 'tin_ore', name: 'Tin ore', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'ore', a: '#c6ccd2', b: '#8d97a2' }, desc: 'Pale and crumbly. No use on its own; Bram calls it "the other half".' }),
  I({ id: 'silver_ore', name: 'Silver ore', kind: 'material', rarity: 'uncommon', stack: true, value: 14, icon: { shape: 'ore', a: '#e4ecf6', b: '#9fb2c8' }, desc: 'A thin seam from the hollow behind Spill Falls.' }),
  I({ id: 'bronze_bar', name: 'Bronze bar', kind: 'material', rarity: 'common', stack: true, value: 9, icon: { shape: 'bar', a: '#c08a42' }, desc: 'Stamped with the Tolley mark, a hammer over a wave.' }),
  I({ id: 'silver_bar', name: 'Silver bar', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'bar', a: '#dfe6ee' }, desc: 'Tamsin pays well for these and asks where you got them.' }),
  // Logs
  I({ id: 'furn_bed', name: 'Cottage bed', kind: 'collectible', rarity: 'common', stack: true, value: 40, icon: { shape: 'log', a: '#7a5434', b: '#c8a070' }, desc: 'A box bed with a straw tick and a patched quilt.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'bed' } }),
  I({ id: 'furn_table', name: 'Kitchen table', kind: 'collectible', rarity: 'common', stack: true, value: 24, icon: { shape: 'log', a: '#8a6440', b: '#d0aa78' }, desc: 'Scrubbed pale. Someone has carved initials under the edge.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'table' } }),
  I({ id: 'furn_stool', name: 'Three-legged stool', kind: 'collectible', rarity: 'common', stack: true, value: 6, icon: { shape: 'log', a: '#8a6440', b: '#c49a64' }, desc: 'Never wobbles, whatever the floor.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'stool' } }),
  I({ id: 'furn_chair', name: 'High-backed chair', kind: 'collectible', rarity: 'common', stack: true, value: 14, icon: { shape: 'log', a: '#6e4a2c', b: '#b08458' }, desc: 'For sitting up straight, or pretending to.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'chair' } }),
  I({ id: 'furn_bench', name: 'Settle bench', kind: 'collectible', rarity: 'common', stack: true, value: 16, icon: { shape: 'log', a: '#6e4a2c', b: '#c49a64' }, desc: 'Long enough for two, or one with boots off.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'bench' } }),
  I({ id: 'furn_dresser', name: 'Dresser', kind: 'collectible', rarity: 'common', stack: true, value: 36, icon: { shape: 'log', a: '#5a3c24', b: '#b08458' }, desc: 'Plates on the rack, string and candle ends in the drawers.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'dresser' } }),
  I({ id: 'furn_shelves', name: 'Shelves', kind: 'collectible', rarity: 'common', stack: true, value: 18, icon: { shape: 'log', a: '#5a3c24', b: '#c8a070' }, desc: 'Jars, a book or two, a stone with a hole in it.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'shelves' } }),
  I({ id: 'furn_chest', name: 'Blanket chest', kind: 'collectible', rarity: 'common', stack: true, value: 20, icon: { shape: 'log', a: '#6e4a2c', b: '#8a8070' }, desc: 'Iron-banded. Smells of cedar and mothballs.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'chest' } }),
  // Brews from the hearth: a drink's good lasts a shorter while than a meal's, and stacks with it
  I({ id: 'tonic_vigour', name: 'Vigour tonic', kind: 'food', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'gel', a: '#c83a3a', b: '#e8dcc0' }, heal: 40, buff: { slot: 'drink', hp: 0.2, mins: 12 }, desc: 'Cloudberry and wild garlic, steeped. It tastes of neither, and of iron.', stats: 'A fifth more health for twelve minutes; restores 40 health.' }),
  I({ id: 'draught_wind', name: 'Wind draught', kind: 'food', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'gel', a: '#3a8aa8', b: '#e8dcc0' }, buff: { slot: 'drink', regen: 0.4, mins: 12 }, desc: 'Samphire and bilberry. Drovers drink it before the long hill; it does the climbing for you, nearly.', stats: 'Stamina comes back two-fifths faster for twelve minutes.' }),
  I({ id: 'spirit_ember', name: 'Ember spirit', kind: 'food', rarity: 'rare', stack: true, value: 55, icon: { shape: 'gel', a: '#e8902a', b: '#3a2a1a' }, buff: { slot: 'drink', power: 0.08, mins: 12 }, desc: 'Blackberry spirit with chanterelle in it, which nobody can explain. Warms the arm that holds the sword.', stats: 'Your blows land an eighth harder for twelve minutes.' }),
  I({ id: 'potion_mend', name: 'Mending draught', kind: 'food', rarity: 'common', stack: true, value: 18, icon: { shape: 'gel', a: '#5ac85a', b: '#e8dcc0' }, heal: 220, desc: 'Comfrey and honey. Edith Leach swears by it and charges for it.', stats: 'Restores 220 health at once.' }),
  // Backpacks, a ladder of them: each strapped on widens the pack for good (the bigger one replaces the smaller)
  I({ id: 'pack_satchel', name: 'Satchel', kind: 'collectible', rarity: 'common', stack: false, value: 20, icon: { shape: 'bag', a: '#8a5a32', b: '#5a3a22' }, pack: { slots: 4, look: 1 }, desc: 'A leather satchel on a strap. Room for a loaf, a lamp and the things you meant to leave at home.', stats: 'Use it to strap it on: four more pack slots, for good.' }),
  I({ id: 'pack_carrier', name: 'Carrier\'s pack', kind: 'collectible', rarity: 'uncommon', stack: false, value: 110, icon: { shape: 'bag', a: '#7a5a3a', b: '#3a2a1a' }, pack: { slots: 8, look: 2 }, desc: 'A frame pack of boiled leather, the kind the Post\'s carriers walk the hill roads with when the carts can\'t.', stats: 'Use it to strap it on: eight more pack slots, for good.' }),
  I({ id: 'pack_drover', name: 'Drover\'s pack', kind: 'collectible', rarity: 'rare', stack: false, value: 450, icon: { shape: 'bag', a: '#5a4a3a', b: '#c8a050' }, pack: { slots: 14, look: 3 }, desc: 'Two hides stitched over an ash frame, a bedroll on top. Drovers carry a week on their backs and complain about none of it.', stats: 'Use it to strap it on: fourteen more pack slots, for good.' }),
  I({ id: 'pack_delver', name: 'Delver\'s rucksack', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bag', a: '#3a4a3a', b: '#d8b050' }, pack: { slots: 20, look: 4 }, desc: 'The Lamp Company\'s own: canvas over a steel frame, a lamp-hook on each shoulder and a pocket for the map you shouldn\'t trust.', stats: 'Use it to strap it on: twenty more pack slots, for good.' }),
  I({ id: 'pack_seabag', name: 'Brethren sea-bag', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'bag', a: '#2a4a6a', b: '#e8dcc0' }, pack: { slots: 28, look: 5 }, desc: 'Tarred sailcloth, rope-stitched, and it floats. The Brethren say a sea-bag is the only thing a captain owns that the crew can\'t vote away.', stats: 'Use it to strap it on: twenty-eight more pack slots, for good.' }),
  I({ id: 'pack_haversack', name: 'Company haversack', kind: 'collectible', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'bag', a: '#6a2a24', b: '#e0bd64' }, pack: { slots: 36, look: 6 }, desc: 'Hesk Dunmore had six made for the Company\'s best and gave away four. Brass-cornered, oiled, and heavier empty than most packs full.', stats: 'Use it to strap it on: thirty-six more pack slots, for good. The biggest there is.' }),
  I({ id: 'torch', name: 'Torch', kind: 'tool', rarity: 'common', stack: false, value: 3, icon: { shape: 'torch', a: '#ffb040', b: '#5a3a22' }, desc: 'A stave of ash with its head wrapped in pitch-soaked tow. Burns as long as you need it to; nobody asks how.', stats: 'After dark (and underground) it\'s lit in your free hand, on foot or riding. L puts it out or lights it.' }),
  I({ id: 'belt_lantern', name: 'Belt lantern', kind: 'tool', rarity: 'uncommon', stack: false, value: 40, icon: { shape: 'lantern', a: '#ffd078', b: '#2a2a2e' }, desc: 'A horn-paned lantern on a hook, made to hang at the hip so both hands stay free. Every drover and miner owns one.', stats: 'After dark (and underground) it hangs lit at your belt, leaving your hands free; a held torch is used first unless a bow is in hand. L puts it out or lights it.' }),
  I({ id: 'lockpick', name: 'Lockpick', kind: 'tool', rarity: 'common', stack: true, value: 2, icon: { shape: 'pick', a: '#9aa0a8', b: '#3a2a1a' }, desc: 'A bent pin of spring steel and a tension wrench. Every chest in the wilds has a lock, and most locks have a temper.', stats: 'For picking the locks on hidden chests. A slip snaps one.' }),
  I({ id: 'furn_barrel', name: 'Barrel', kind: 'collectible', rarity: 'common', stack: true, value: 8, icon: { shape: 'log', a: '#7a5434', b: '#5a5a5a' }, desc: 'Apples, or rain, or nothing yet.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'barrel' } }),
  I({ id: 'furn_candles', name: 'Candle cluster', kind: 'collectible', rarity: 'common', stack: true, value: 6, icon: { shape: 'log', a: '#e8dcb0', b: '#c49a64' }, desc: 'Tallow stubs on a saucer. Cosy, and only a little smoky.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'candles' } }),
  I({ id: 'furn_rug_red', name: 'Red rag rug', kind: 'collectible', rarity: 'common', stack: true, value: 12, icon: { shape: 'log', a: '#a8423a', b: '#d8a070' }, desc: 'Braided from old shirts. Warm underfoot.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'rug', tint: 0 } }),
  I({ id: 'furn_rug_blue', name: 'Blue rag rug', kind: 'collectible', rarity: 'common', stack: true, value: 12, icon: { shape: 'log', a: '#3a5a9a', b: '#a8c0d8' }, desc: 'Braided from old shirts. Warm underfoot.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'rug', tint: 1 } }),
  I({ id: 'furn_rug_green', name: 'Green rag rug', kind: 'collectible', rarity: 'common', stack: true, value: 12, icon: { shape: 'log', a: '#3e7a46', b: '#b8d090' }, desc: 'Braided from old shirts. Warm underfoot.', stats: 'Furniture: set it down in a house of your own', furn: { model: 'rug', tint: 2 } }),
  I({ id: 'oak_logs', name: 'Oak logs', kind: 'material', rarity: 'common', stack: true, value: 2, icon: { shape: 'log', a: '#6e4a2c', b: '#c49a64' }, desc: 'Split oak. Burns slow.' }),
  I({ id: 'birch_logs', name: 'Birch logs', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'log', a: '#e8e4d8', b: '#c4a070' }, desc: 'Light wood. The bark peels off in sheets.' }),
  I({ id: 'pine_logs', name: 'Pine logs', kind: 'material', rarity: 'common', stack: true, value: 5, icon: { shape: 'log', a: '#4c2f24', b: '#d2b07a' }, desc: 'Sticky with resin. Smells better than it burns.' }),
  // Fish
  I({ id: 'raw_minnow', name: 'Raw minnow', kind: 'material', rarity: 'common', stack: true, value: 1, icon: { shape: 'fish', a: '#9aa8a0', b: '#6a7a72' }, desc: 'Barely a mouthful. Pell would throw it back.' }),
  I({ id: 'raw_trout', name: 'Raw trout', kind: 'material', rarity: 'common', stack: true, value: 5, icon: { shape: 'fish', a: '#8a7a52', b: '#c86a5a' }, desc: 'Brown trout from the Wend.' }),
  I({ id: 'raw_pike', name: 'Raw pike', kind: 'material', rarity: 'uncommon', stack: true, value: 10, icon: { shape: 'fish', a: '#5a7a3a', b: '#c8c070' }, desc: 'All teeth. Lives in the Spill under the falls.' }),
  I({ id: 'glass_eel', name: 'Glass eel', kind: 'collectible', rarity: 'rare', stack: true, value: 40, icon: { shape: 'fish', a: '#bfe8f2', b: '#7fc8e0' }, desc: 'You can see its spine through its skin. Pell has never seen one and won\'t believe you.' }),
  I({ id: 'cooked_minnow', name: 'Fried minnow', kind: 'food', rarity: 'common', stack: true, value: 2, icon: { shape: 'cooked', a: '#c89a5a' }, desc: 'Crunchy, mostly.', heal: 12, stats: 'Restores 12 health.' }),
  I({ id: 'cooked_trout', name: 'Grilled trout', kind: 'food', rarity: 'common', stack: true, value: 8, icon: { shape: 'cooked', a: '#d08a5a' }, desc: 'Skin crisped over an open fire.', heal: 30, stats: 'Restores 30 health.' }),
  I({ id: 'cooked_pike', name: 'Baked pike', kind: 'food', rarity: 'uncommon', stack: true, value: 15, icon: { shape: 'cooked', a: '#e0b070' }, desc: 'Watch for bones.', heal: 50, stats: 'Restores 50 health.' }),
  I({ id: 'burnt_fish', name: 'Burnt fish', kind: 'material', rarity: 'common', stack: true, value: 0, icon: { shape: 'cooked', a: '#2a2420' }, desc: 'It was a fish once.' }),
  I({ id: 'bread', name: 'Heel of bread', kind: 'food', rarity: 'common', stack: true, value: 2, icon: { shape: 'bread', a: '#c89a50' }, desc: 'Yesterday\'s loaf from the Low Water.', heal: 15, stats: 'Restores 15 health.' }),
  // Weapons and tools
  I({ id: 'worn_sword', name: 'Worn shortsword', kind: 'weapon', rarity: 'common', stack: false, value: 5, icon: { shape: 'sword', a: '#b4bcc6', b: '#4a2e1c' }, desc: 'Iron, nicked along both edges.', weapon: { damage: 0, speed: 1, held: 'sword' }, stats: 'Plain. No bonus.' }),
  I({ id: 'bronze_sword', name: 'Bronze sword', kind: 'weapon', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'sword', a: '#d6a052', b: '#5a3a24' }, desc: 'Heavier than iron and holds an edge if you look after it.', set: 'tolley', weapon: { damage: 8, speed: 1, held: 'bronzeSword' }, stats: 'Balanced. Damage +8.' }),
  I({ id: 'worn_pickaxe', name: 'Bram\'s spare pickaxe', kind: 'tool', rarity: 'common', stack: false, value: 4, icon: { shape: 'pick', a: '#8e959e', b: '#6e4a2c' }, desc: 'The handle\'s been replaced twice and the head once.', tool: { skill: 'mining', power: 1, level: 1, held: 'pickaxe' }, stats: 'Mining tool. Power 1.' }),
  I({ id: 'bronze_pickaxe', name: 'Bronze pickaxe', kind: 'tool', rarity: 'uncommon', stack: false, value: 25, icon: { shape: 'pick', a: '#c08a42', b: '#6e4a2c' }, desc: 'Bites into rock instead of bouncing off it.', tool: { skill: 'mining', power: 2, level: 3, held: 'pickaxe' }, stats: 'Mining tool. Power 2. Requires Mining 3.' }),
  I({ id: 'tolley_pick', name: 'Tolley\'s pick', kind: 'tool', rarity: 'rare', stack: false, value: 60, icon: { shape: 'pick', a: '#e0a85a', b: '#3a2414' }, desc: 'Bram\'s own. The grip is worn to the shape of his hand, which is bigger than yours.', tool: { skill: 'mining', power: 3, level: 1, held: 'pickaxe' }, stats: 'Mining tool. Power 3.' }),
  I({ id: 'farm_hatchet', name: 'Farmhand\'s hatchet', kind: 'tool', rarity: 'common', stack: false, value: 4, icon: { shape: 'hatchet', a: '#8e959e', b: '#6e4a2c' }, desc: 'Good for kindling. Adequate for trees.', tool: { skill: 'woodcutting', power: 1, level: 1, held: 'hatchet' }, stats: 'Woodcutting tool. Power 1.' }),
  I({ id: 'bronze_hatchet', name: 'Bronze hatchet', kind: 'tool', rarity: 'uncommon', stack: false, value: 20, icon: { shape: 'hatchet', a: '#c08a42', b: '#6e4a2c' }, desc: 'A proper felling head.', tool: { skill: 'woodcutting', power: 2, level: 2, held: 'hatchet' }, stats: 'Woodcutting tool. Power 2. Requires Woodcutting 2.' }),
  I({ id: 'fishing_rod', name: 'Pell\'s old rod', kind: 'tool', rarity: 'common', stack: false, value: 6, icon: { shape: 'rod', a: '#8a6a3a' }, desc: 'Hazel, with a cork float that has seen better rivers.', tool: { skill: 'fishing', power: 1, level: 1, held: 'rod' }, stats: 'Fishing tool.' }),
  I({ id: 'bronze_helm', name: 'Bronze cap', kind: 'armor', rarity: 'uncommon', stack: false, value: 35, icon: { shape: 'helm', a: '#c08a42' }, desc: 'Rings when something hits it. Better the helm than you.', set: 'tolley', armor: { slot: 'head', defense: 4 }, stats: 'Defence 4.' }),
  // Creature materials
  I({ id: 'wolf_pelt', name: 'Wolf pelt', kind: 'material', rarity: 'common', stack: true, value: 6, icon: { shape: 'pelt', a: '#8a7c6a' }, desc: 'Coarse grey-brown fur. Tamsin sends them to Ansbury for collars.' }),
  I({ id: 'rustback_shell', name: 'Rustback shell plate', kind: 'material', rarity: 'common', stack: true, value: 5, icon: { shape: 'shell', a: '#b5622e', b: '#4fae8c' }, desc: 'Flecked with green where the beetle\'s been eating copper.' }),
  I({ id: 'jelly_residue', name: 'Jelly residue', kind: 'material', rarity: 'common', stack: true, value: 1, icon: { shape: 'gel', a: '#7ccf5a' }, desc: 'Smells like a ditch. Farmers pay a mark a jar to know it\'s gone.' }),
  I({ id: 'notch_fang', name: 'Old Notch\'s fang', kind: 'trophy', rarity: 'rare', stack: false, value: 50, icon: { shape: 'fang', a: '#efe6cf' }, desc: 'Yellowed and cracked at the root. The farmers below the Lantern will want to see it.' }),
  // Found things
  // Further afield
  I({ id: 'iron_ore', name: 'Iron ore', kind: 'material', rarity: 'common', stack: true, value: 8, icon: { shape: 'ore', a: '#c88a6a', b: '#8a5a4a' }, desc: 'Rust-red and heavy. Two make a bar.' }),
  I({ id: 'iron_bar', name: 'Iron bar', kind: 'material', rarity: 'common', stack: true, value: 22, icon: { shape: 'bar', a: '#8e959e' }, desc: 'Harrowgate buys these by the cartload and sells them back as tools.' }),
  I({ id: 'star_crystal', name: 'Star crystal', kind: 'material', rarity: 'rare', stack: true, value: 60, icon: { shape: 'ore', a: '#7fe0f4', b: '#2a8ab0' }, desc: 'Warm to the touch and faintly bright in the dark. The Scarth Watch keepers log every piece that leaves the Highlands.' }),
  I({ id: 'elder_logs', name: 'Elder oak logs', kind: 'material', rarity: 'uncommon', stack: true, value: 14, icon: { shape: 'log', a: '#4a3220', b: '#a8804a' }, desc: 'Dense, dark grain. Shipwrights in Gullmouth pay well for it.' }),
  I({ id: 'iron_pickaxe', name: 'Iron pickaxe', kind: 'tool', rarity: 'uncommon', stack: false, value: 70, icon: { shape: 'pick', a: '#b4bcc6', b: '#5a3a24' }, desc: 'A Harrowgate pattern. The company stamp has been filed off.', tool: { skill: 'mining', power: 4, level: 15, held: 'pickaxe' }, stats: 'Mining tool. Power 4. Requires Mining 15.' }),
  I({ id: 'iron_hatchet', name: 'Iron hatchet', kind: 'tool', rarity: 'uncommon', stack: false, value: 55, icon: { shape: 'hatchet', a: '#b4bcc6', b: '#5a3a24' }, desc: 'Heavy enough for elder oak.', tool: { skill: 'woodcutting', power: 3, level: 15, held: 'hatchet' }, stats: 'Woodcutting tool. Power 3. Requires Woodcutting 15.' }),
  I({ id: 'iron_sword', name: 'Iron longsword', kind: 'weapon', rarity: 'rare', stack: false, value: 110, icon: { shape: 'sword', a: '#c8d0da', b: '#3a2414' }, desc: 'Long in the blade and balanced near the guard.', weapon: { damage: 5, speed: 1, held: 'sword', reach: 0.75 }, stats: 'Long reach. Damage +5, reach +0.75.' }),
  // Regional finds: the same budget as the bronze sword and cap, spent another way
  I({ id: 'toll_sabre', name: 'Toll-rider\'s sabre', kind: 'weapon', rarity: 'uncommon', stack: false, value: 45, icon: { shape: 'sword', a: '#d8dce2', b: '#2a4a86' }, desc: 'Light and curved, with the Charter\'s road sign on the guard. The toll riders gave them up when the road went quiet.', set: 'tollriders', weapon: { damage: 4, speed: 1.2, held: 'sword' }, stats: 'Quick. Damage +4, attacks 20% faster.' }),
  I({ id: 'thorn_blade', name: 'Thornback blade', kind: 'weapon', rarity: 'uncommon', stack: false, value: 45, icon: { shape: 'sword', a: '#9ab07a', b: '#24301a' }, desc: 'A narrow blade with a hooked spine, the kind the Hagworm Wood fellers keep for things that aren\'t trees.', set: 'thornback', weapon: { damage: 2, speed: 1, held: 'sword', crit: 0.18 }, stats: 'Finds the gaps. Damage +2, critical hits +18%.' }),
  I({ id: 'brine_cutlass', name: 'Brine cutlass', kind: 'weapon', rarity: 'uncommon', stack: false, value: 45, icon: { shape: 'sword', a: '#9ad0e0', b: '#5a3a24' }, desc: 'Salt-pitted and sharp. Gullmouth says a blade that has been in the sea gives back what it takes.', set: 'brine', weapon: { damage: 4, speed: 1, held: 'sword', leech: 0.08 }, stats: 'Draws strength. Damage +4, heals 8% of damage dealt.' }),
  I({ id: 'harrow_cleaver', name: 'Harrowgate cleaver', kind: 'weapon', rarity: 'rare', stack: false, value: 80, icon: { shape: 'sword', a: '#a86a4a', b: '#3a1410' }, desc: 'Cut from a drift rail and ground to an edge. It swings like a door.', set: 'harrow', weapon: { damage: 11, speed: 0.85, held: 'bronzeSword' }, stats: 'Heavy. Damage +11, attacks 15% slower.' }),
  I({ id: 'starglass_edge', name: 'Kirkglass edge', kind: 'weapon', rarity: 'rare', stack: false, value: 80, icon: { shape: 'sword', a: '#a8f0ff', b: '#2a8ab0' }, desc: 'A sliver of Old Glass set in a plain hilt. It is warm, and it hums when it hits.', set: 'starglass', weapon: { damage: 3, speed: 1, held: 'sword', reach: 0.25, crit: 0.06, leech: 0.04 }, stats: 'A little of everything. Damage +3, reach +0.25, critical hits +6%, heals 4% of damage dealt.' }),
  I({ id: 'wolfskin_hood', name: 'Wolfskin hood', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#8a7c6a' }, desc: 'Drovers wear them on the Turnpike. Warm, light, and no help at all against teeth.', set: 'tollriders', armor: { slot: 'head', defense: 1, wind: 0.3 }, stats: 'For running. Defence 1, energy comes back 30% faster.' }),
  I({ id: 'oilskin_hat', name: 'Oilskin sou\'wester', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#e0b83a' }, desc: 'Waxed canvas with a brim down the back. Gullmouth\'s crews say it makes you quick on a wet deck.', set: 'brine', armor: { slot: 'head', defense: 1, roll: 0.12 }, stats: 'For dodging. Defence 1, rolls stay untouchable 0.12 s longer.' }),
  I({ id: 'redback_helm', name: 'Redback plate helm', kind: 'armor', rarity: 'rare', stack: false, value: 60, icon: { shape: 'helm', a: '#c8442a' }, desc: 'A redback\'s head plate, padded and strapped. Heavy enough to make you breathe hard.', set: 'harrow', armor: { slot: 'head', defense: 6, wind: -0.2 }, stats: 'For standing your ground. Defence 6, energy comes back 20% slower.' }),
  I({ id: 'frost_cowl', name: 'Frost-pelt cowl', kind: 'armor', rarity: 'rare', stack: false, value: 60, icon: { shape: 'helm', a: '#dde6ee' }, desc: 'Kelderby stitches them for the high pasture. You stop shivering, and you last.', set: 'starglass', armor: { slot: 'head', defense: 0, vigor: 40 }, stats: 'For lasting. Maximum health +40.' }),
  I({ id: 'bray_hanger', name: 'Coll Bray\'s hanger', kind: 'weapon', rarity: 'rare', stack: false, value: 70, icon: { shape: 'sword', a: '#b8bcc0', b: '#5a3a2a' }, desc: 'A short sword with a brass guard. The only thing Coll Bray kept clean.', set: 'oldman', weapon: { damage: 5, speed: 1, held: 'sword', reach: 0.25, crit: 0.06 }, stats: 'Steady. Damage +5, reach +0.25, critical hits +6%.' }),
  I({ id: 'fell_knife', name: 'Fell knife', kind: 'weapon', rarity: 'epic', stack: false, value: 100, icon: { shape: 'sword', a: '#dfe4ea', b: '#4a3a2a' }, desc: 'A long knife with a horn handle, the kind Kelderby shepherds carry for the wolves. This one has had to be used.', set: 'fold', weapon: { damage: 4, speed: 1.1, held: 'sword', reach: 0.25, crit: 0.03 }, stats: 'Quick. Damage +4, attacks 10% faster, reach +0.25, critical hits +3%.' }),
  I({ id: 'shepherd_hood', name: 'Shepherd\'s hood', kind: 'armor', rarity: 'epic', stack: false, value: 80, icon: { shape: 'helm', a: '#d8d0c0' }, desc: 'Felted fleece, a shoulder cape sewn on. Made for standing in the wind all night with the ewes.', set: 'fold', armor: { slot: 'head', defense: 1, vigor: 20, wind: 0.1 }, stats: 'For the long watch. Defence 1, maximum health +20, energy comes back 10% faster.' }),
  I({ id: 'pitlamp_cap', name: 'Pit lamp cap', kind: 'armor', rarity: 'rare', stack: false, value: 55, icon: { shape: 'helm', a: '#5a564c' }, desc: 'A felt cap with a clip on the front for a candle. The candle\'s long gone; the burn mark isn\'t.', set: 'oldman', armor: { slot: 'head', defense: 2, vigor: 20 }, stats: 'For the long shift. Defence 2, maximum health +20.' }),
  I({ id: 'moss_hood', name: 'Moss-dyed hood', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#5a7a3a' }, desc: 'Felted wool dyed in the Wend\'s green. In Hagworm Wood it is the colour of not being seen.', set: 'thornback', armor: { slot: 'head', defense: 2, vigor: 20 }, stats: 'For the long fight. Defence 2, maximum health +20.' }),
  I({ id: 'raw_mackerel', name: 'Raw mackerel', kind: 'material', rarity: 'common', stack: true, value: 8, icon: { shape: 'fish', a: '#3a6a8a', b: '#c8d8e0' }, desc: 'Striped and slippery. Gullmouth eats it with everything.' }),
  I({ id: 'raw_seabass', name: 'Raw sea bass', kind: 'material', rarity: 'uncommon', stack: true, value: 16, icon: { shape: 'fish', a: '#7a8a98', b: '#e0e6ea' }, desc: 'Caught off the Gullmouth jetties at the turn of the tide.' }),
  I({ id: 'raw_char', name: 'Raw frost char', kind: 'material', rarity: 'rare', stack: true, value: 30, icon: { shape: 'fish', a: '#c86a5a', b: '#e8d8c8' }, desc: 'Lives under the ice of the Highland tarns. Red-bellied.' }),
  I({ id: 'cooked_mackerel', name: 'Grilled mackerel', kind: 'food', rarity: 'common', stack: true, value: 14, icon: { shape: 'cooked', a: '#b88a5a' }, desc: 'Oily and good.', heal: 60, stats: 'Restores 60 health.' }),
  I({ id: 'cooked_seabass', name: 'Salt-crust sea bass', kind: 'food', rarity: 'uncommon', stack: true, value: 26, icon: { shape: 'cooked', a: '#e0c08a' }, desc: 'Baked whole in a shell of wet salt.', heal: 110, stats: 'Restores 110 health.' }),
  I({ id: 'cooked_char', name: 'Smoked char', kind: 'food', rarity: 'rare', stack: true, value: 48, icon: { shape: 'cooked', a: '#c8704a' }, desc: 'Highland smokehouse style. Keeps for weeks.', heal: 200, stats: 'Restores 200 health.' }),
  I({ id: 'gannet_egg', name: 'Gannet egg', kind: 'food', rarity: 'common', stack: true, value: 8, icon: { shape: 'bread', a: '#e8eadc' }, desc: 'Off the Cragsby ledges, hard-boiled. Tastes of the sea, and slightly of fish.', heal: 70, stats: 'Restores 70 health.' }),
  I({ id: 'smoked_eel', name: 'Smoked eel', kind: 'food', rarity: 'uncommon', stack: true, value: 20, icon: { shape: 'cooked', a: '#8a6a3a' }, desc: 'Holme Staithe hangs its eels in the chimney for a week. The chimney smells of eel for a year.', heal: 140, stats: 'Restores 140 health.', buff: { slot: 'food', regen: 0.15, mins: 30 } }),
  I({ id: 'moor_pasty', name: 'Moor pasty', kind: 'food', rarity: 'uncommon', stack: true, value: 34, icon: { shape: 'bread', a: '#d8a860' }, desc: 'Mutton, turnip and a crust you could stand on. The tinners take them down the streams wrapped in a cloth.', heal: 260, stats: 'Restores 260 health.', buff: { slot: 'food', hp: 0.08, mins: 30 } }),
  // Forage (picked by hand in the wild; cooked into better things at a hearth)
  I({ id: 'blackberries', name: 'Blackberries', kind: 'food', rarity: 'common', stack: true, value: 3, icon: { shape: 'bread', a: '#3a1a3a', b: '#4a7a32' }, desc: 'Off the brambles. Leave the ones at dog height.', heal: 18, stats: 'Restores 18 health. Better in a pie.' }),
  I({ id: 'wild_garlic', name: 'Wild garlic', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'log', a: '#5a9a3a', b: '#f4f0e8' }, desc: 'You smell it before you find it. Everyone near you will too.' }),
  I({ id: 'chanterelles', name: 'Chanterelles', kind: 'material', rarity: 'common', stack: true, value: 6, icon: { shape: 'bread', a: '#e8a030' }, desc: 'Yellow, smells of apricots, grows under oak. The ones that smell of nothing aren\'t these.' }),
  I({ id: 'samphire', name: 'Samphire', kind: 'material', rarity: 'common', stack: true, value: 4, icon: { shape: 'log', a: '#6aaa44' }, desc: 'Salty green stalks off the tideline. Gullmouth boils it with everything.' }),
  I({ id: 'bilberries', name: 'Bilberries', kind: 'food', rarity: 'common', stack: true, value: 6, icon: { shape: 'bread', a: '#3a4a8a', b: '#4a7a32' }, desc: 'Small, dark and everywhere on the high ground. They stain your hands for a day.', heal: 30, stats: 'Restores 30 health. Better in a tart.' }),
  I({ id: 'cloudberries', name: 'Cloudberries', kind: 'food', rarity: 'uncommon', stack: true, value: 12, icon: { shape: 'bread', a: '#f0a040', b: '#4a7a32' }, desc: 'One berry to a plant, and the plant only on the highest bog. Kelderby trades them by the cup.', heal: 45, stats: 'Restores 45 health. Better as jam.' }),
  I({ id: 'bramble_pie', name: 'Bramble pie', kind: 'food', rarity: 'common', stack: true, value: 22, icon: { shape: 'bread', a: '#8a4a5a' }, desc: 'Purple to the elbow.', heal: 150, stats: 'Restores 150 health.' }),
  I({ id: 'mushroom_stew', name: 'Mushroom and garlic stew', kind: 'food', rarity: 'uncommon', stack: true, value: 34, icon: { shape: 'cooked', a: '#c89048' }, desc: 'Thick enough to stand a spoon in. The fellers in Hagworm Wood live on it.', heal: 230, stats: 'Restores 230 health.', buff: { slot: 'food', hp: 0.12, mins: 30 } }),
  I({ id: 'bass_samphire', name: 'Sea bass with samphire', kind: 'food', rarity: 'uncommon', stack: true, value: 44, icon: { shape: 'cooked', a: '#d8c890' }, desc: 'Gullmouth\'s Sunday dinner, when there\'s a Sunday.', heal: 280, stats: 'Restores 280 health.', buff: { slot: 'food', regen: 0.2, mins: 30 } }),
  I({ id: 'bilberry_tart', name: 'Bilberry tart', kind: 'food', rarity: 'uncommon', stack: true, value: 46, icon: { shape: 'bread', a: '#4a4a8a' }, desc: 'A Kelderby tart: more berry than pastry, and the pastry\'s mostly lard.', heal: 320, stats: 'Restores 320 health.', buff: { slot: 'food', hp: 0.1, regen: 0.15, mins: 40 } }),
  I({ id: 'cloudberry_jam', name: 'Cloudberry jam', kind: 'food', rarity: 'rare', stack: true, value: 70, icon: { shape: 'bread', a: '#f0a040' }, desc: 'A small pot. Worth more than the pot by a long way.', heal: 420, stats: 'Restores 420 health.', buff: { slot: 'food', hp: 0.15, regen: 0.2, mins: 45 } }),
  I({ id: 'raw_huss', name: 'Raw huss', kind: 'material', rarity: 'common', stack: true, value: 10, icon: { shape: 'fish', a: '#8a7a5e', b: '#e0d8c4' }, desc: 'A small shark. The Gullmouth stalls sell it as rock salmon, and nobody believes them.' }),
  I({ id: 'cooked_huss', name: 'Fried huss', kind: 'food', rarity: 'common', stack: true, value: 18, icon: { shape: 'cooked', a: '#d8a860' }, desc: 'In batter, with salt and vinegar.', heal: 80, stats: 'Restores 80 health.' }),
  I({ id: 'conger_skin', name: 'Conger skin', kind: 'material', rarity: 'common', stack: true, value: 16, icon: { shape: 'pelt', a: '#4a4a3c' }, desc: 'Tough as boot leather. Gullmouth\'s riggers bind their splices with it.' }),
  I({ id: 'ray_barb', name: 'Thornback barb', kind: 'material', rarity: 'uncommon', stack: true, value: 22, icon: { shape: 'fang', a: '#efe6cc' }, desc: 'The sting from a thornback\'s tail. Hold it by the thick end.' }),
  I({ id: 'shark_tooth', name: 'Shark tooth', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'fang', a: '#f4f0e4' }, desc: 'Serrated and still sharp. Gullmouth deckhands wear them on a cord.' }),
  I({ id: 'boar_hide', name: 'Boar hide', kind: 'material', rarity: 'common', stack: true, value: 9, icon: { shape: 'pelt', a: '#5a3e2a' }, desc: 'Thick and bristled. Saddlers in Ansbury take it.' }),
  I({ id: 'crab_shell', name: 'Tide crab shell', kind: 'material', rarity: 'common', stack: true, value: 12, icon: { shape: 'shell', a: '#c8442a', b: '#f0a070' }, desc: 'Gullmouth grinds it for the fields.' }),
  I({ id: 'frost_pelt', name: 'Frost wolf pelt', kind: 'material', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'pelt', a: '#dde6ee' }, desc: 'Thick enough to sleep on snow.' }),
  I({ id: 'halter_bay', name: 'Turnpike bay', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#8a5a2e', b: '#2e4a7a' }, mount: { coat: '#8a5a2e', mane: '#1e1610', cloth: '#2e4a7a' }, desc: 'A drover\'s hack off the Ansbury horse fair, steady in traffic and deaf to church bells.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_grey', name: 'Saltings grey', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#c8c8c0', b: '#7a2a24' }, mount: { coat: '#b8b8b0', mane: '#e8e6e0', cloth: '#7a2a24' }, desc: 'Dapple grey, raised on the salt marsh behind Gullmouth. Walks into the sea if you let it.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_chestnut', name: 'Company chestnut', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#b0582a', b: '#3a3a3a' }, mount: { coat: '#a8532a', mane: '#6a2e14', cloth: '#3a3a3a' }, desc: 'Retired from the Harrowgate ore carts. Still stops dead at every shift bell.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_fell', name: 'Scarth fell pony', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#2a2420', b: '#5a7a4a' }, mount: { coat: '#2e2622', mane: '#121010', cloth: '#5a7a4a' }, desc: 'Black, shaggy and short in the leg. Kelderby swears by them on the ice.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_dun', name: 'Quarter-Day dun', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'shoe', a: '#b89a62', b: '#2e3a5a' }, mount: { coat: '#b89a62', mane: '#3a2a1a', cloth: '#2e3a5a' }, desc: 'Comes with the rent on quarter day, they say, and leaves with nobody. A dun with a stripe down her back.', stats: 'A login reward (day 14). Use it, or press G, to ride.' }),
  I({ id: 'halter_roan', name: 'Rent-Day roan', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'shoe', a: '#9a6a62', b: '#3f6a3a' }, mount: { coat: '#9a6a62', mane: '#4a2a20', cloth: '#3f6a3a' }, desc: 'A strawberry roan who has walked every tithe road in the counties and complains about all of them.', stats: 'A login reward (day 28). Use it, or press G, to ride.' }),
  I({ id: 'halter_ember', name: 'Cinder-shod mare', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'shoe', a: '#3a1a10', b: '#ff9a3a' }, mount: { coat: '#3a1c12', mane: '#c8501e', cloth: '#1e1210', glow: true }, desc: 'Found grazing the ash at Clinker Bottom. Her shoes never cool.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'wren_whistle', name: 'Cherry-twig whistle', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'whistle', a: '#a8442e' }, desc: 'The mouthpiece is chewed. It still works. Found in a tin box marked PRIVATE.' }),
  // Gullmouth and Harrowgate
  I({ id: 'maddox_chest', name: 'Maddox sea chest', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#6a4a2c' }, desc: 'Salt-swollen oak with brass corners gone green. Padlocked. Jory Maddox has the key.' }),
  I({ id: 'maddox_compass', name: 'Col Maddox\'s compass', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'coin', a: '#c8a040' }, desc: 'A brass boat compass. Someone has scratched a line on the card at the bearing for the channel by the stacks.' }),
  I({ id: 'abery_pick', name: 'Wick Abery\'s pick', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'pick', a: '#8e959e', b: '#8a6a3a' }, desc: 'Iron head, ash handle with a split taped over. WICK is burned into the grip.', tool: { skill: 'mining', power: 2, level: 1, held: 'pickaxe' }, stats: 'Mining tool. Power 2. Not yours to keep.' }),
  I({ id: 'garrow_axe', name: 'Sefton Garrow\'s axe', kind: 'tool', rarity: 'rare', stack: false, value: 60, icon: { shape: 'hatchet', a: '#a8b0b8', b: '#6a4a2a' }, desc: 'A felling axe with forty years of sharpening taken off the bit. The haft is new; the head is older than you.', tool: { skill: 'woodcutting', power: 3, level: 10, held: 'hatchet' }, stats: 'Woodcutting tool. Power 3. Requires Woodcutting 10.' }),
  // Main story: The Charter's Debt
  I({ id: 'mossgate_slate', name: 'Ketley slate', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bar', a: '#4a5058' }, desc: 'A slate the size of a roof tile, scratched with pictures: fields, ropes, arches, and a hill with a crown of points.' }),
  I({ id: 'crown_rubbing', name: 'Rubbing of the tally wall', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#d8ccb0' }, desc: 'Charcoal on oilcloth from the survey camp. Every mark on the wall under Gallows Knap, including the forty-one.' }),
  I({ id: 'joan_survey', name: 'Joan Harrowgate\'s survey', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#e8dcc0' }, desc: 'The Kirk floor, measured in a hand that presses hard. "Ten feet, no less" is underlined three times.' }),
  I({ id: 'pryce_page', name: 'A page from Mr Pryce\'s book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#f0e8d0' }, desc: 'Cut along the gutter with a penknife. The Charter\'s paving debt, bought from the guilds at three marks in ten.' }),
  I({ id: 'charter_ring', name: 'Charter ring', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'coin', a: '#c88a42' }, desc: 'Plain copper, stamped with the Charter\'s road sign. The Speaker gives very few, and says so.' }),
].map((d) => [d.id, d]));

/**
 * Every item by id. Rolled and numbered gear ("bronze_sword__keen2", "u_dancey_billhook__n2") isn't
 * listed: it's worked out from its base the first time it's asked for, so Object.values(ITEMS) is
 * still just the game's own items.
 */
const VARIANTS = new Map<string, ItemDef | null>();
const variant = (id: string): ItemDef | undefined => {
  let v = VARIANTS.get(id);
  if (v === undefined) { v = gearVariant(id, (b) => BASE_ITEMS[b]); VARIANTS.set(id, v); }
  return v ?? undefined;
};
export const ITEMS: Record<string, ItemDef> = new Proxy(BASE_ITEMS, {
  get: (t, k) => (typeof k !== 'string' || k in t || !k.includes('__') ? (t as Record<string | symbol, unknown>)[k] : variant(k)),
  has: (t, k) => k in t || (typeof k === 'string' && k.includes('__') && !!variant(k)),
});

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8b2a4',
  uncommon: '#5fcf5a',
  rare: '#4fa0ff',
  epic: '#b46aff',
  legendary: '#ff9a2a',
};

// Named pieces (data/gear.ts).
for (const d of NAMED_ITEMS) ITEMS[d.id] = d;

// Side content items (src/data/content).
import { CONTENT } from './content';
for (const c of CONTENT) for (const d of c.items ?? []) ITEMS[d.id] = d;

// Armour for the body, and the helms' weights (src/data/armour.ts).
import { ARMOUR_ITEMS, HELM_WEIGHTS } from './armour';
for (const d of ARMOUR_ITEMS) ITEMS[d.id] = d;
for (const [id, h] of Object.entries(HELM_WEIGHTS)) if (ITEMS[id]?.armor) Object.assign(ITEMS[id].armor!, { weight: h.weight, look: h.look });

// The realm's weapons, and how the older ones look in the hand (src/data/weapons.ts).
import { OLD_WEAPON_MODELS, WEAPON_ITEMS } from './weapons';
for (const d of WEAPON_ITEMS) ITEMS[d.id] = d;
for (const [id, m] of Object.entries(OLD_WEAPON_MODELS)) if (ITEMS[id]?.weapon) ITEMS[id].weapon!.model = m;

// Rares' trophies and treasure maps (src/data/wilds.ts).
import { MAP_ITEMS, TROPHIES } from './wilds';
for (const d of [...TROPHIES, ...MAP_ITEMS]) ITEMS[d.id] = d;

// Festival tokens, fare, dyes and horses (src/data/festivals.ts).
import { FESTIVAL_ITEMS } from './festivals';
for (const d of FESTIVAL_ITEMS) ITEMS[d.id] = d;
import { SEASON_ITEMS } from './seasons';
for (const d of SEASON_ITEMS) ITEMS[d.id] = d;
// Cloak designs (src/data/capes.ts).
import { CAPE_ITEMS } from './capes';
for (const d of CAPE_ITEMS) ITEMS[d.id] = d;
