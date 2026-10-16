export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemKind = 'material' | 'tool' | 'weapon' | 'armor' | 'food' | 'quest' | 'collectible' | 'trophy';
export type SkillId = 'melee' | 'mining' | 'smithing' | 'fishing' | 'cooking' | 'woodcutting';

export interface IconSpec {
  shape: 'ore' | 'bar' | 'log' | 'fish' | 'sword' | 'pick' | 'hatchet' | 'rod' | 'bread' | 'helm' | 'shell' | 'pelt' | 'whistle' | 'gel' | 'fang' | 'cooked' | 'coin' | 'shoe';
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
  weapon?: { damage: number; speed: number; held: 'sword' | 'bronzeSword'; reach?: number; crit?: number; leech?: number };
  tool?: { skill: SkillId; power: number; level: number; held: 'pickaxe' | 'hatchet' | 'rod' };
  /** Helm traits: damage taken off each hit, extra maximum health, energy regained (share faster), extra seconds of roll. */
  armor?: { slot: 'head'; defense: number; vigor?: number; wind?: number; roll?: number };
  /** A halter: the horse it calls (every horse runs at the same pace; only the look differs). */
  mount?: { coat: string; mane: string; cloth: string; glow?: boolean };
  /** The regional set this piece belongs to (see GEAR_SETS). */
  set?: string;
}

const I = (d: ItemDef) => d;

/**
 * Gear is horizontal. Past the starter sword, every weapon spends the same budget of 8 points,
 * and every helm the same 4, so a new find is a different way to fight, not a bigger number.
 * Power grows with Melee level; gear picks the style. Points, per weapon trait:
 * damage +1, speed +0.05, reach +0.25, crit +3%, leech 2%. Per helm trait: defense +1,
 * vigor +10 health, wind +10%, roll +0.04 s. Slower or weaker in one trait pays for another.
 */
export const GEAR_BUDGET = { weapon: 8, head: 4 };

/**
 * Regional sets: each region's weapon and helm worn together add a bonus that changes how you
 * fight, not how hard you hit. The armoury in the pack lists every piece and where it comes from.
 */
export const GEAR_SETS: Record<string, { name: string; where: string; bonus: string }> = {
  tolley: { name: 'Tolley\'s work', where: 'Smithed at an anvil', bonus: 'Second Wind recharges in 20 seconds instead of 30.' },
  tollriders: { name: 'The Toll Riders', where: 'Turnpike wolves', bonus: 'Sprinting costs half the energy.' },
  thornback: { name: 'Thornback', where: 'Hagworm Wood', bonus: 'Your first strike on an unhurt enemy is always critical.' },
  brine: { name: 'Brine', where: 'Fleet Coast', bonus: 'Rolling through an attack restores 6% of your health.' },
  harrow: { name: 'The Works', where: 'Raddle Barrens and the Rust Queen', bonus: 'Cleave recharges in 4 seconds instead of 6.' },
  starglass: { name: 'Kirkglass', where: 'Scarth Highlands and Old Glass', bonus: 'Critical hits give back 6 energy.' },
};
/** The set both equipped pieces share, if they do. */
export function activeSet(equip: { weapon: string | null; head: string | null }): string | null {
  const a = equip.weapon ? ITEMS[equip.weapon]?.set : undefined, b = equip.head ? ITEMS[equip.head]?.set : undefined;
  return a && a === b ? a : null;
}
export function gearPoints(d: ItemDef): number {
  if (d.weapon) { const w = d.weapon; return w.damage + (w.speed - 1) / 0.05 + (w.reach ?? 0) / 0.25 + (w.crit ?? 0) / 0.03 + (w.leech ?? 0) / 0.02; }
  if (d.armor) { const a = d.armor; return a.defense + (a.vigor ?? 0) / 10 + (a.wind ?? 0) / 0.1 + (a.roll ?? 0) / 0.04; }
  return 0;
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries([
  // Ores and bars
  I({ id: 'copper_ore', name: 'Copper ore', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'ore', a: '#c8743a', b: '#4fae8c' }, desc: 'Smelts with tin into bronze.' }),
  I({ id: 'tin_ore', name: 'Tin ore', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'ore', a: '#c6ccd2', b: '#8d97a2' }, desc: 'Pale and crumbly. No use on its own; Bram calls it "the other half".' }),
  I({ id: 'silver_ore', name: 'Silver ore', kind: 'material', rarity: 'uncommon', stack: true, value: 14, icon: { shape: 'ore', a: '#e4ecf6', b: '#9fb2c8' }, desc: 'A thin seam from the hollow behind Spill Falls.' }),
  I({ id: 'bronze_bar', name: 'Bronze bar', kind: 'material', rarity: 'common', stack: true, value: 9, icon: { shape: 'bar', a: '#c08a42' }, desc: 'Stamped with the Tolley mark, a hammer over a wave.' }),
  I({ id: 'silver_bar', name: 'Silver bar', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'bar', a: '#dfe6ee' }, desc: 'Tamsin pays well for these and asks where you got them.' }),
  // Logs
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
  I({ id: 'bronze_helm', name: 'Bronze cap', kind: 'armor', rarity: 'uncommon', stack: false, value: 35, icon: { shape: 'helm', a: '#c08a42' }, desc: 'Rings when something hits it. Better the helm than you.', set: 'tolley', armor: { slot: 'head', defense: 4 }, stats: 'Takes 4 off every hit.' }),
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
  I({ id: 'wolfskin_hood', name: 'Wolfskin hood', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#8a7c6a' }, desc: 'Drovers wear them on the Turnpike. Warm, light, and no help at all against teeth.', set: 'tollriders', armor: { slot: 'head', defense: 1, wind: 0.3 }, stats: 'For running. Takes 1 off every hit, energy comes back 30% faster.' }),
  I({ id: 'oilskin_hat', name: 'Oilskin sou\'wester', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#e0b83a' }, desc: 'Waxed canvas with a brim down the back. Gullmouth\'s crews say it makes you quick on a wet deck.', set: 'brine', armor: { slot: 'head', defense: 1, roll: 0.12 }, stats: 'For dodging. Takes 1 off every hit, rolls stay untouchable 0.12 s longer.' }),
  I({ id: 'redback_helm', name: 'Redback plate helm', kind: 'armor', rarity: 'rare', stack: false, value: 60, icon: { shape: 'helm', a: '#c8442a' }, desc: 'A redback\'s head plate, padded and strapped. Heavy enough to make you breathe hard.', set: 'harrow', armor: { slot: 'head', defense: 6, wind: -0.2 }, stats: 'For standing your ground. Takes 6 off every hit, energy comes back 20% slower.' }),
  I({ id: 'frost_cowl', name: 'Frost-pelt cowl', kind: 'armor', rarity: 'rare', stack: false, value: 60, icon: { shape: 'helm', a: '#dde6ee' }, desc: 'Kelderby stitches them for the high pasture. You stop shivering, and you last.', set: 'starglass', armor: { slot: 'head', defense: 0, vigor: 40 }, stats: 'For lasting. Maximum health +40.' }),
  I({ id: 'moss_hood', name: 'Moss-dyed hood', kind: 'armor', rarity: 'uncommon', stack: false, value: 30, icon: { shape: 'helm', a: '#5a7a3a' }, desc: 'Felted wool dyed in the Wend\'s green. In Hagworm Wood it is the colour of not being seen.', set: 'thornback', armor: { slot: 'head', defense: 2, vigor: 20 }, stats: 'For the long fight. Takes 2 off every hit, maximum health +20.' }),
  I({ id: 'raw_mackerel', name: 'Raw mackerel', kind: 'material', rarity: 'common', stack: true, value: 8, icon: { shape: 'fish', a: '#3a6a8a', b: '#c8d8e0' }, desc: 'Striped and slippery. Gullmouth eats it with everything.' }),
  I({ id: 'raw_seabass', name: 'Raw sea bass', kind: 'material', rarity: 'uncommon', stack: true, value: 16, icon: { shape: 'fish', a: '#7a8a98', b: '#e0e6ea' }, desc: 'Caught off the Gullmouth jetties at the turn of the tide.' }),
  I({ id: 'raw_char', name: 'Raw frost char', kind: 'material', rarity: 'rare', stack: true, value: 30, icon: { shape: 'fish', a: '#c86a5a', b: '#e8d8c8' }, desc: 'Lives under the ice of the Highland tarns. Red-bellied.' }),
  I({ id: 'cooked_mackerel', name: 'Grilled mackerel', kind: 'food', rarity: 'common', stack: true, value: 14, icon: { shape: 'cooked', a: '#b88a5a' }, desc: 'Oily and good.', heal: 60, stats: 'Restores 60 health.' }),
  I({ id: 'cooked_seabass', name: 'Salt-crust sea bass', kind: 'food', rarity: 'uncommon', stack: true, value: 26, icon: { shape: 'cooked', a: '#e0c08a' }, desc: 'Baked whole in a shell of wet salt.', heal: 110, stats: 'Restores 110 health.' }),
  I({ id: 'cooked_char', name: 'Smoked char', kind: 'food', rarity: 'rare', stack: true, value: 48, icon: { shape: 'cooked', a: '#c8704a' }, desc: 'Highland smokehouse style. Keeps for weeks.', heal: 200, stats: 'Restores 200 health.' }),
  I({ id: 'boar_hide', name: 'Boar hide', kind: 'material', rarity: 'common', stack: true, value: 9, icon: { shape: 'pelt', a: '#5a3e2a' }, desc: 'Thick and bristled. Saddlers in Ansbury take it.' }),
  I({ id: 'crab_shell', name: 'Tide crab shell', kind: 'material', rarity: 'common', stack: true, value: 12, icon: { shape: 'shell', a: '#c8442a', b: '#f0a070' }, desc: 'Gullmouth grinds it for the fields.' }),
  I({ id: 'frost_pelt', name: 'Frost wolf pelt', kind: 'material', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'pelt', a: '#dde6ee' }, desc: 'Thick enough to sleep on snow.' }),
  I({ id: 'halter_bay', name: 'Turnpike bay', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#8a5a2e', b: '#2e4a7a' }, mount: { coat: '#8a5a2e', mane: '#1e1610', cloth: '#2e4a7a' }, desc: 'A drover\'s hack off the Ansbury horse fair, steady in traffic and deaf to church bells.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_grey', name: 'Saltings grey', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#c8c8c0', b: '#7a2a24' }, mount: { coat: '#b8b8b0', mane: '#e8e6e0', cloth: '#7a2a24' }, desc: 'Dapple grey, raised on the salt marsh behind Gullmouth. Walks into the sea if you let it.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_chestnut', name: 'Company chestnut', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#b0582a', b: '#3a3a3a' }, mount: { coat: '#a8532a', mane: '#6a2e14', cloth: '#3a3a3a' }, desc: 'Retired from the Harrowgate ore carts. Still stops dead at every shift bell.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_fell', name: 'Scarth fell pony', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'shoe', a: '#2a2420', b: '#5a7a4a' }, mount: { coat: '#2e2622', mane: '#121010', cloth: '#5a7a4a' }, desc: 'Black, shaggy and short in the leg. Kelderby swears by them on the ice.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
  I({ id: 'halter_ember', name: 'Cinder-shod mare', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'shoe', a: '#3a1a10', b: '#ff9a3a' }, mount: { coat: '#3a1c12', mane: '#c8501e', cloth: '#1e1210', glow: true }, desc: 'Found grazing the ash round Cinderhorn\'s pit. Her shoes never cool.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' }),
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

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8b2a4',
  uncommon: '#5fcf5a',
  rare: '#4fa0ff',
  epic: '#b46aff',
};

// Side content items (src/data/content).
import { CONTENT } from './content';
for (const c of CONTENT) for (const d of c.items ?? []) ITEMS[d.id] = d;
