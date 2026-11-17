import type { ItemDef } from './items';

// Looting and stealing, the Elder Scrolls way (owner 2026-11-17: "add looting and stealing like elder scrolls/elder
// scrolls online"). Out in the country, a barrel, a crate or a chest at a camp or a ruin is anyone's: search it. Inside
// a town's bounds (data/justice.ts), everything belongs to somebody: taking it is theft, and if anyone sees you, the
// town puts the goods' worth on your head. Sneak (Left Ctrl) to be seen less; come up behind a townsperson sneaking and
// you can pick their pocket. What you steal is marked stolen: only a fence will buy it (the Ropewalk Cellar in
// Gullmouth, the Brethren in Saltpenny), and the watch takes it off you when they take you in. Containers fill again
// after a day. The working is game/Thievery.ts.

/** The props that hold something, and what they're called. */
export const CONTAINERS: Record<string, { name: string; tier: 0 | 1 | 2 }> = {
  barrel: { name: 'barrel', tier: 0 }, crate: { name: 'crate', tier: 0 }, crocks: { name: 'crocks', tier: 0 }, sack: { name: 'sacks', tier: 0 },
  chest: { name: 'chest', tier: 2 }, dresser: { name: 'dresser', tier: 1 }, desk: { name: 'desk', tier: 1 }, shelves: { name: 'shelves', tier: 1 }, strongbox: { name: 'strongbox', tier: 2 },
};

/** Stolen goods: town things with an owner, worth more to a fence than to anyone honest. */
const S = (id: string, name: string, value: number, a: string, desc: string, shape: ItemDef['icon']['shape'] = 'coin'): ItemDef =>
  ({ id, name, kind: 'material', rarity: value >= 60 ? 'rare' : value >= 25 ? 'uncommon' : 'common', stack: true, value, icon: { shape, a }, desc, stats: 'Stolen. Only a fence will buy it: Abe Rowse at the Ropewalk Cellar in Gullmouth, or Gil Fenner at Low Tide in Saltpenny. The watch takes it off you if they take you in.', stolen: true });
export const STOLEN_GOODS: ItemDef[] = [
  S('st_spoons', 'Silver teaspoons', 18, '#d8dce4', 'Six, in a twist of baize, a crest worn off the handles by polishing.'),
  S('st_tankard', 'Pewter tankard', 10, '#9a9aa0', 'Dented where somebody drank from it angrily.', 'gel'),
  S('st_candlestick', 'Brass candlestick', 14, '#c8a050', 'A pair once. Just the one now.', 'torch'),
  S('st_lace', 'Lace collar', 22, '#f0ece0', 'Pillow lace from the Wend, folded in paper with lavender.', 'bag'),
  S('st_purse', 'A stranger\'s purse', 0, '#6a4424', 'A small leather purse. Emptied straight into yours.', 'bag'),
  S('st_watch', 'Pocket watch', 65, '#d8b048', 'Gold-cased and still going. The inside of the lid says "To R., for thirty years".'),
  S('st_brandy', 'Bottle of Callis brandy', 26, '#8a4a1e', 'Not the sort the Excise ever saw.', 'gel'),
  S('st_silk', 'Silk scarf', 30, '#a8382c', 'Counting House silk, in the Company\'s red.', 'bag'),
  S('st_tea', 'Tin of tea', 12, '#2a5a3a', 'Morrow leaf, a quarter pound. Smells of smoke and money.', 'gel'),
  S('st_seal', 'Seal ring', 80, '#c8a050', 'A gold ring with a merchant\'s mark cut in the bezel, for pressing into wax.'),
  S('st_ledger', 'Account book', 20, '#3a2a1a', 'Somebody\'s debts, in somebody\'s hand. Somebody will want it back.', 'letter'),
  S('st_cutlery', 'Plate and cutlery', 8, '#c8ccd2', 'A good dinner service, a piece at a time.', 'gel'),
];
export const STOLEN_IDS = new Set(STOLEN_GOODS.map((d) => d.id));

/** What a town container might hold, by its tier (every pick stolen goods). */
export const TOWN_TABLE: [string, number][][] = [
  [['st_cutlery', 4], ['st_tankard', 3], ['st_tea', 2], ['st_brandy', 1]],
  [['st_spoons', 3], ['st_lace', 2], ['st_ledger', 2], ['st_candlestick', 2], ['st_silk', 1]],
  [['st_spoons', 2], ['st_silk', 2], ['st_watch', 1], ['st_seal', 1], ['st_lace', 2]],
];
/** What a container out in the country holds (anyone's, not stolen): plain things, and marks in the better ones. */
export const WILD_TABLE: [string, number][][] = [
  [['bread', 3], ['cooked_mackerel', 2], ['iron_ore', 2], ['oak_logs', 2], ['compost', 1]],
  [['bread', 2], ['glyph_flame_1', 1], ['iron_bar', 2], ['egg', 1]],
  [['iron_bar', 2], ['bronze_bar', 2], ['silver_bar', 1]],
];
/** Marks in a container: none, a few, a handful, by tier (scaled by where you are: not here). */
export const MARKS_BY_TIER: [number, number][] = [[0, 4], [3, 12], [12, 40]];

/** Picking a pocket: marks in the purse, and now and then something else. */
export const POCKET = { marks: [4, 22] as [number, number], extra: 0.25, extras: ['st_spoons', 'st_lace', 'st_watch', 'st_seal', 'st_tea'] };

/** How far a witness sees a theft, standing and sneaking, by day and by night. */
export const SEEN = { stand: 12, sneak: 6, nightMul: 0.6 };
/** Chance a pocket comes away clean: sneaking from behind, and how much each level of Melee adds (to the cap). */
export const POCKET_ODDS = { base: 0.55, perLevel: 0.004, cap: 0.85 };
/** The least a theft puts on your head, whatever it was worth. */
export const THEFT_MIN = 15;
