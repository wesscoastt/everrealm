import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import { ENCHANTS } from '../gear';
import { BLANKS, ENCHANT_IDS, RUBBING_OF } from '../enchanting';
// (Ansbury's middle, as data/places_regional.ts ALDERMERE: that module reads the content, so it can't be imported here)
const A = { cx: 820, cz: 300 };
import type { RegionContent } from './types';
import type { GameApi } from '../../game/api';

// Enchanting, as the Counties do it (ESO's, cut to fit): the old kingdom carved its marks into the standing
// stones, and nobody alive can read them, but a rubbing of a mark cut into a good blank makes a glyph that
// does what the mark says. The blank decides how strong (soapstone, slate, basalt, as your hand allows); the
// rubbing decides what. Agnes Thew cuts them in Ansbury's market and lets anyone use her bench; taking a glyph
// apart there gives back the blank, and sometimes the rubbing. (The recipes: data/enchanting.ts.)

// (the recipes name the enchantments themselves: say so at once if a new one isn't among them)
for (const k of Object.keys(ENCHANTS)) if (!(ENCHANT_IDS as readonly string[]).includes(k)) console.error(`enchanting: ${k} has no glyph recipes (data/enchanting.ts ENCHANT_IDS)`);

const STONE: Record<number, [string, string]> = { 1: ['#b8b0a0', '#e8e0d0'], 2: ['#4a5260', '#8a96a8'], 3: ['#1e1e24', '#5a5a68'] };

const items: ItemDef[] = [
  ...BLANKS.map((b): ItemDef => ({
    id: b.id, name: b.name, kind: 'material', rarity: (['common', 'uncommon', 'rare'] as const)[b.tier - 1], stack: true, value: [4, 20, 60][b.tier - 1],
    icon: { shape: 'ore', a: STONE[b.tier][0], b: STONE[b.tier][1] }, desc: b.desc,
    stats: `Enchanting · takes a ${['minor', 'full', 'greater'][b.tier - 1]} mark · enchanting ${b.level}`,
  })),
  ...Object.entries(ENCHANTS).map(([id, E]): ItemDef => ({
    id: RUBBING_OF(id), name: `${E.word.replace(/^the /, '').replace(/^\w/, (c) => c.toUpperCase())} rubbing`, kind: 'material', rarity: 'uncommon', stack: true, value: 12,
    icon: { shape: 'letter', a: '#e8dcc0', b: '#2a2420' },
    desc: `Charcoal on paper: one of the old kingdom's marks, taken from a standing stone. Cut into a blank, it makes a glyph of ${E.word.toLowerCase()}.`,
    stats: `Enchanting · ${E.kind === 'weapon' ? 'a weapon' : 'an armour'} mark: ${E.text(1).replace(/\.$/, '')}`,
  })),
];

const BENCH = { x: A.cx - 15.5, y: 0, z: A.cz + 22.2 };

const npcs: NpcDef[] = [
  {
    id: 'glyph_agnes', name: 'Agnes Thew', title: 'Glyph-cutter',
    look: { skin: '#e0b898', hair: '#6a6a66', hairStyle: 7, eyes: '#5a6a7a', tunic: '#4a4e56', trim: '#c8b890', trousers: '#3a3430', boots: '#2a1e14', apron: true, gloves: '#7a5a3a', age: 0.55, frame: 'f', lashes: true, build: 0.95 },
    schedule: [{ from: 0, to: 24, at: [A.cx - 15.5, A.cz + 23.4], face: [A.cx - 15.5, A.cz + 18], anim: 'idle' }],
    barks: ['Mind the chips. They\'re sharp.', 'Glyphs, cut while you wait.', 'Bring me a rubbing and I\'ll show you.'],
  },
];

const bench = (g: GameApi) => g.openCrafting('glyph', BENCH);

const agnes: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Agnes Thew. I cut glyphs, and I sell the stone to cut them in. If you want to learn, the bench is there. Mind the chips.',
      options: [
        { text: 'What is a glyph, exactly?', next: 'what' },
        { text: 'How do I cut one?', next: 'how' },
        { text: 'Where do rubbings come from?', next: 'where' },
        { text: 'Let me use your bench.', effect: bench },
        { text: 'What do you sell?', effect: (g) => g.openShop('glyph_agnes') },
        { text: 'Good day.' },
      ],
    },
    what: {
      text: 'The old kingdom carved its marks into the standing stones. Nobody alive can read them, and the Assembly men who say they can are lying. But take a rubbing of a mark, cut it into a good blank, and the stone does what the mark says. Fire. Frost. A ward against the tide. Set the glyph in a blade or a coat and it carries the mark with it.',
      options: [{ text: 'How do I cut one?', next: 'how' }, { text: 'Good day.' }],
    },
    how: {
      text: 'A rubbing and a blank. Soapstone takes the small marks, and anyone can cut it. Slate takes more, once your hand is steady. Basalt takes the strongest, and it will break you before you break it. Take a glyph apart at the bench and you get the blank back, and sometimes the rubbing with it.',
      options: [
        { text: 'Let me use your bench.', effect: bench },
        { text: 'What do you sell?', effect: (g) => g.openShop('glyph_agnes') },
        { text: 'Good day.' },
      ],
    },
    where: {
      text: 'Standing stones, wherever the old kingdom stood. Paper and charcoal flat against the face, and rub. One rubbing from a stone, then leave it be a while. The creatures that live near the stones carry them too. They chew on everything.',
      options: [{ text: 'Let me use your bench.', effect: bench }, { text: 'Good day.' }],
    },
  },
};

const shop: ShopDef = {
  id: 'glyph_agnes', name: 'Agnes Thew\'s glyphs', owner: 'glyph_agnes',
  stock: [{ item: 'blank_1', price: 8 }, { item: 'blank_2', price: 40 }, { item: 'blank_3', price: 120 }],
  buyRate: () => 0.5,
  footer: () => 'Agnes pays half of an item\'s worth',
} as ShopDef;

export const ENCHANTING_CONTENT: RegionContent = {
  id: 'enchanting',
  items,
  npcs,
  dialogue: { glyph_agnes: agnes },
  shops: { glyph_agnes: shop },
};
