import type { ItemDef } from './items';
import type { RegionId } from '../world/terrain';

// Cloak designs: a device worked onto the cloak in its trim colour, collected through the game and
// kept in the wardrobe for good (as the festival hats are). Each comes from somewhere: the Charter
// Market's tailor sells the plain heraldic ones; feats, the group dungeons and a region's highest
// standing give the rest. entities/capes.ts draws them.

export type CapeDesign = 'border' | 'quartered' | 'chevron' | 'chequy' | 'tally' | 'star' | 'lantern' | 'flame' | 'snowflake' | 'picks'
  | 'wheel' | 'key' | 'oak' | 'waves' | 'anvil' | 'peak' | 'gull' | 'reed' | 'stones' | 'mushroom' | 'laurel' | 'cog'
  | 'oars' | 'rose' | 'pair';

export const CAPE_DESIGNS: Record<CapeDesign, { name: string; desc: string; from: string }> = {
  border: { name: 'Bordered cloak', desc: 'A plain border worked round the edge, a hand in from the hem.', from: 'The Charter Market, Ansbury' },
  quartered: { name: 'Quartered cloak', desc: 'Two quarters in the trim colour, as the old houses wore them.', from: 'The Charter Market, Ansbury' },
  chevron: { name: 'Chevron cloak', desc: 'A broad chevron, point up. The Charter clerks say it means nothing. It means a roof.', from: 'The Charter Market, Ansbury' },
  chequy: { name: 'Chequy cloak', desc: 'Checked all over, like a counting-board. The Weighhouse men wear it on quarter-day.', from: 'The Charter Market, Ansbury' },
  tally: { name: 'Tally cloak', desc: 'Four strokes and a fifth across them: the bandits\' own tally, turned on them.', from: 'Feat: clear all seven bandit forts' },
  star: { name: 'Star cloak', desc: 'A five-pointed star, for someone who has seen the wonders of the counties.', from: 'Feat: find the six wonders' },
  lantern: { name: 'Lantern cloak', desc: 'A lit lantern, for someone who has brought down every fair\'s creature.', from: 'Feat: bring down all seven festival creatures' },
  flame: { name: 'Reek-fire cloak', desc: 'A flame, the Reekers\' mark, worked in the trim colour.', from: 'Feat: burn the Old Bed on Inkholm' },
  snowflake: { name: 'Kettle cloak', desc: 'A six-armed frost star. It came out from under the Kettle.', from: 'Under the Kettle (a rare drop from its bosses)' },
  picks: { name: 'Pitman\'s cloak', desc: 'Two picks crossed, the Sallow Pit miners\' badge.', from: 'The Old Man\'s Workings (a rare drop from its bosses)' },
  wheel: { name: 'Millwheel cloak', desc: 'Hollin Ford\'s mill wheel, for a friend of the valley.', from: 'Revered in Hollindale' },
  key: { name: 'Toll-key cloak', desc: 'The key of the Turnpike tolls, given to the road\'s friends.', from: 'Revered on the Turnpike' },
  oak: { name: 'Oak-leaf cloak', desc: 'An oak leaf, the fellers\' sign in Hagworm Wood.', from: 'Revered in Hagworm Wood' },
  waves: { name: 'Fleet cloak', desc: 'Three waves, as the Fleet Coast boats paint them on their bows.', from: 'Revered on the Fleet Coast' },
  anvil: { name: 'Works cloak', desc: 'An anvil, the Harrowgate Company\'s stamp, given to the Works\' friends.', from: 'Revered in the Raddle Barrens' },
  peak: { name: 'Scarth cloak', desc: 'A snow-capped peak, for someone the high pasture knows.', from: 'Revered in the Scarth Highlands' },
  gull: { name: 'Gannet cloak', desc: 'A gannet in flight, the cliff villages\' sign.', from: 'Revered on the Gannet Cliffs' },
  reed: { name: 'Levels cloak', desc: 'Reeds and a bulrush, the Wrath Levels\' mark.', from: 'Revered on the Wrath Levels' },
  stones: { name: 'Moor cloak', desc: 'Three standing stones, the Tolmen Moor\'s oldest sign.', from: 'Revered on Tolmen Moor' },
  cog: { name: 'Kiln cloak', desc: 'A brass cog, the Kilnfolk\'s Wheel. They don\'t sew it for mainlanders, as a rule.', from: 'Revered on Kell' },
  laurel: { name: 'Laurel cloak', desc: 'A wreath of bay, the old sign for someone who went back down and did it the hard way.', from: 'Any group dungeon, cleared on veteran' },
  mushroom: { name: 'Holm cloak', desc: 'A broad cap, the Inkholm islanders\' own badge.', from: 'Revered on Inkholm' },
  oars: { name: 'Brethren cloak', desc: 'Two oars crossed, the Brethren\'s sign: every captain started out pulling one.', from: 'Revered in the Keys' },
  rose: { name: 'Gale\'s cloak', desc: 'A compass rose, sewn by Ysolde Gale herself, and buried with the rest of what she kept.', from: 'Dinah Lowry\'s last map, Saltpenny' },
  pair: { name: 'Two Stones cloak', desc: 'A white stone and a black, side by side: the sign of Callis, which needs both.', from: 'Revered on the Bright Coast' },
};

/** The design a region gives at Revered (data/standing.ts). */
export const REGION_CAPE: Partial<Record<RegionId, CapeDesign>> = {
  greenwake: 'wheel', crownroad: 'key', brambledeep: 'oak', saltwind: 'waves', redstone: 'anvil', starfall: 'peak', gannet: 'gull', wrath: 'reed', tolmen: 'stones', inkholm: 'mushroom', kell: 'cog', keys: 'oars', bright: 'pair',
};

/** The design a feat gives (data/feats.ts). */
export const FEAT_CAPE: Record<string, CapeDesign> = { forts: 'tally', wonders: 'star', festBosses: 'lantern', inkholm: 'flame' };

export const CAPE_ITEMS: ItemDef[] = (Object.keys(CAPE_DESIGNS) as CapeDesign[]).map((id) => ({
  id: 'cape_' + id, name: CAPE_DESIGNS[id].name, kind: 'collectible', rarity: id === 'border' || id === 'quartered' || id === 'chevron' || id === 'chequy' ? 'uncommon' : 'epic',
  stack: false, value: 0, icon: { shape: 'pelt', a: '#7a2a24', b: '#e0bd64' }, desc: CAPE_DESIGNS[id].desc, capeDesign: id,
  stats: 'Use it to add the design to your wardrobe for good: choose it under Cloak with Change look, on the character screen. It is worked in your trim colour.',
}));
