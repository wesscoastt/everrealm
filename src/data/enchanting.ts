// Enchanting's recipes (the people and the stones: data/content/enchanting.ts). A glyph is a blank and a
// rubbing cut together at a glyph-cutter's bench: the blank sets its strength (minor, full, greater, as
// the skill allows), the rubbing its enchantment (data/gear.ts ENCHANTS). Taking a glyph apart gives the
// blank back, and half the time the rubbing too (game/Game.ts updateCraft).
//
// (The enchantments are listed here by id rather than imported, so the recipe table loads without
// pulling the gear tables in first; data/content/enchanting.ts checks the two lists agree when it loads.)

export const ENCHANT_IDS = ['flame', 'frost', 'leech', 'storm', 'stone', 'gale', 'warding', 'vigour', 'thorns', 'ashward', 'tideward', 'groundward', 'rootward', 'leeward', 'swift'] as const;

export const BLANKS = [
  { id: 'blank_1', tier: 1, level: 1, name: 'Soapstone blank', desc: 'A palm of soft grey soapstone, squared off. It takes a small mark, and a knife will scratch it.' },
  { id: 'blank_2', tier: 2, level: 20, name: 'Slate blank', desc: 'Blue-black slate split thin and true. It takes a full mark, if your hand is steady enough not to crack it.' },
  { id: 'blank_3', tier: 3, level: 40, name: 'Basalt blank', desc: 'A heavy black blank from the fells. It takes the strongest marks, and fights every cut.' },
] as const;

export const RUBBING_OF = (ench: string) => `rubbing_${ench}`;
export const GLYPH_OF = (ench: string, tier: number) => `glyph_${ench}_${tier}`;

interface GlyphRecipe { id: string; station: 'glyph'; skill: 'enchanting'; level: number; xp: number; inputs: Record<string, number>; output: string; count: number; time: number }

export const ENCHANT_RECIPES: GlyphRecipe[] = [
  // Cutting: a blank and a rubbing
  ...ENCHANT_IDS.flatMap((e) => BLANKS.map((b): GlyphRecipe => ({
    id: `cut_${e}_${b.tier}`, station: 'glyph', skill: 'enchanting', level: b.level, xp: [30, 80, 160][b.tier - 1],
    inputs: { [b.id]: 1, [RUBBING_OF(e)]: 1 }, output: GLYPH_OF(e, b.tier), count: 1, time: [2.4, 3, 3.6][b.tier - 1],
  }))),
  // Taking apart: the blank back (and, half the time, the rubbing)
  ...ENCHANT_IDS.flatMap((e) => BLANKS.map((b): GlyphRecipe => ({
    id: `unglyph_${e}_${b.tier}`, station: 'glyph', skill: 'enchanting', level: 1, xp: [10, 25, 50][b.tier - 1],
    inputs: { [GLYPH_OF(e, b.tier)]: 1 }, output: b.id, count: 1, time: 1.6,
  }))),
];
