import type { ItemDef } from '../items';
import { ENCHANTS, TIER_WORDS } from '../gear';
import type { RegionContent } from './types';

// Glyphs (ESO's): a stone cut with an enchantment, three strengths of each. Used from the pack, a weapon
// glyph goes into the weapon in your hand and an armour glyph into the first piece you wear without one
// (chest first), replacing what was there if every piece has one. Creatures carry them now and then,
// the great ones more and stronger (game/Game.ts); Perrin sells the minor ones in Ansbury.

const COLOURS: Record<string, [string, string]> = {
  flame: ['#e8642a', '#ffd070'], frost: ['#7fd0f0', '#e8f8ff'], leech: ['#a8243a', '#f0a0b0'], storm: ['#a890ff', '#f0f0ff'],
  stone: ['#8a9a5a', '#d8e0b0'], gale: ['#c8dce8', '#ffffff'],
  warding: ['#d8b050', '#fff0c0'], vigour: ['#5fbf6a', '#d0f0c0'], thorns: ['#5a7a3a', '#c8d890'],
  ashward: ['#c8582a', '#f8d8b0'], tideward: ['#3a78b8', '#c8e8ff'], groundward: ['#c8a830', '#fff4b0'], rootward: ['#5a7a3a', '#d8e8b0'], leeward: ['#a8c0d0', '#ffffff'], swift: ['#5fd0e6', '#e0f8ff'],
};
const LINES: Record<string, string> = {
  flame: 'Warm to hold, and warmer in the dark.', frost: 'There is always a little rime in the cut.', leech: 'The cut is stained, and stays stained.', storm: 'Your hair stands up when you pick it up.',
  stone: 'Heavier than it looks, and cold.', gale: 'There is a draught round it, even indoors.',
  warding: 'Heavy for its size, and steady.', vigour: 'It smells of cut grass.', thorns: 'The edges are sharp no matter how you hold it.',
  ashward: 'It never gets warm, even by the fire.', tideward: 'Beads of water roll off it.', groundward: 'A spark jumps from it to your fingers, once.', rootward: 'It smells of turned earth.', leeward: 'The air goes still round it.', swift: 'It never quite sits still in the hand.',
};

const ITEMS: ItemDef[] = Object.entries(ENCHANTS).flatMap(([id, E]) => [1, 2, 3].map((tier): ItemDef => ({
  id: `glyph_${id}_${tier}`, name: `${TIER_WORDS[tier - 1] ? TIER_WORDS[tier - 1] + ' g' : 'G'}lyph of ${E.word.toLowerCase()}`, kind: 'material', rarity: (['uncommon', 'rare', 'epic'] as const)[tier - 1],
  stack: true, value: [25, 70, 160][tier - 1], icon: { shape: 'ore', a: COLOURS[id][0], b: COLOURS[id][1] }, glyph: { id, tier },
  desc: `A cut stone with ${E.word.toLowerCase()} worked into it. ${LINES[id]}`,
  stats: `Use it to enchant ${E.kind === 'weapon' ? 'the weapon in your hand' : 'a piece of armour you wear (chest first, then the rest)'}: ${E.text(tier)}`,
})));

export const GLYPH_CONTENT: RegionContent = { id: 'glyphs', items: ITEMS };
