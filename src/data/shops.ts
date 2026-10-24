import type { GameApi } from '../game/api';
import { ITEMS } from './items';
import { SHOP_STOCK } from './gameplay';

// Every trader in the world. A shop sells from its stock and buys from the player's pack at a
// rate; both can shift with what the player has done (quest outcomes are tracked in flags).

export interface ShopDef {
  id: string;
  /** Panel title. */
  name: string;
  /** NPC who runs it; the panel closes when the player walks away from them. */
  owner: string;
  /** How price lines name the trader; defaults to the owner's first name. */
  who?: string;
  stock: { item: string; price: number; when?: (g: GameApi) => boolean }[];
  /** Fraction of an item's worth paid when buying from the player. */
  buyRate: (g: GameApi, item: string) => number;
  /** Multiplier on stock prices. */
  priceMult?: (g: GameApi) => number;
  /** Priced in this item (a festival token) instead of marks. */
  currency?: string;
  /** Line under the panel, in the owner's own terms. */
  footer: (g: GameApi) => string;
}

// The chandler pays well for fish and for what comes up out of the sea
const FISH = new Set(['raw_minnow', 'raw_trout', 'raw_pike', 'glass_eel', 'raw_mackerel', 'raw_seabass', 'raw_char', 'raw_huss', 'conger_skin', 'ray_barb', 'shark_tooth']);

export const SHOPS: Record<string, ShopDef> = {
  tamsin: {
    id: 'tamsin', name: 'Tamsin\'s Stall', owner: 'tamsin',
    stock: SHOP_STOCK,
    buyRate: () => 0.6,
    footer: () => 'Tamsin pays 60% of an item\'s worth',
  },
  perrin: {
    id: 'perrin', name: 'Charter Market', owner: 'perrin',
    stock: [
      { item: 'bread', price: 5 },
      { item: 'bronze_bar', price: 22 },
      { item: 'iron_hatchet', price: 75 },
      { item: 'fishing_rod', price: 16 },
      { item: 'cooked_mackerel', price: 24 },
      ...['w_charter_sword', 'w_charter_longsword', 'w_charter_spear', 'w_charter_mace', 'w_collegium_staff', 'w_collegium_dagger'].map((item) => ({ item, price: Math.round((ITEMS[item]?.value ?? 40) * 2.2) })),
      ...['linen_chest', 'linen_legs', 'linen_hands', 'linen_feet', 'leather_chest', 'leather_legs', 'leather_hands', 'leather_feet'].map((item) => ({ item, price: Math.round((ITEMS[item]?.value ?? 20) * 2) })),
      ...['furn_chair', 'furn_bench', 'furn_dresser', 'furn_shelves', 'furn_chest', 'furn_rug_blue', 'furn_rug_green'].map((item) => ({ item, price: Math.round((ITEMS[item]?.value ?? 10) * 1.8) })),
      // The tailor's stall: the plain heraldic cloak designs
      { item: 'cape_border', price: 400 }, { item: 'cape_quartered', price: 600 }, { item: 'cape_chevron', price: 600 }, { item: 'cape_chequy', price: 900 },
      // The cook's stall: recipe cards (data/content/recipes.ts)
      { item: 'recipe_harvest_supper', price: 120 }, { item: 'recipe_bilberry_cordial', price: 160 },
      // The glyph-cutter's tray: the minor glyphs (data/content/glyphs.ts)
      ...['flame', 'frost', 'leech', 'storm', 'warding', 'vigour', 'thorns', 'swift'].map((k) => ({ item: `glyph_${k}_1`, price: 150 })),
    ],
    buyRate: () => 0.6,
    priceMult: (g) => (g.flag('hwChoice') === 'refund' ? 0.9 : 1),
    footer: (g) => (g.flag('hwChoice') === 'refund' ? 'Perrin knocks a tenth off for you, and pays 60%' : 'Perrin pays 60% of an item\'s worth'),
  },
  bett: {
    id: 'bett', name: 'Rook\'s Chandlery', owner: 'bett',
    stock: [
      { item: 'recipe_fishermans_pie', price: 180 },
      { item: 'fishing_rod', price: 14 },
      { item: 'lockpick', price: 3 },
      { item: 'bread', price: 5 },
      { item: 'cooked_mackerel', price: 18 },
      { item: 'cooked_seabass', price: 34 },
      { item: 'oilskin_chest', price: 110 },
      { item: 'oilskin_feet', price: 70 },
    ],
    buyRate: (_g, item) => (FISH.has(item) ? 0.85 : 0.5),
    footer: () => 'Bett pays well for fish and badly for everything else',
  },
  company: {
    id: 'company', name: 'Harrowgate Company Store', owner: 'tamFeld',
    stock: [
      { item: 'lockpick', price: 3 },
      { item: 'iron_pickaxe', price: 120 },
      { item: 'iron_hatchet', price: 90 },
      { item: 'bronze_pickaxe', price: 40 },
      { item: 'bread', price: 6 },
      // Wick's pick sits on the shelf while the matter is open
      { item: 'abery_pick', price: 40, when: (g) => g.stage('fairPrice') === 'getPick' && !g.has('abery_pick') && !g.flag('fpRelease') },
    ],
    buyRate: () => 0.45,
    footer: () => 'Company prices. The store pays 45% of an item\'s worth',
  },
  pryce: {
    id: 'pryce', name: 'Mr Pryce Buys', owner: 'pryce', who: 'Pryce',
    stock: [],
    buyRate: (g) => (g.flag('fpChoice') === 'leverage' ? 0.75 : 0.55),
    footer: (g) => (g.flag('fpChoice') === 'leverage' ? 'Pryce pays you 75%. He pays well for people who read carefully' : 'Pryce pays 55%, in cash, today'),
  },
  odo: {
    id: 'odo', name: 'Camp Stores', owner: 'odo',
    stock: [
      { item: 'lockpick', price: 3 },
      { item: 'bread', price: 5 },
      { item: 'cooked_trout', price: 14 },
      { item: 'bronze_hatchet', price: 40 },
      { item: 'iron_hatchet', price: 85 },
    ],
    // Harrowgate takes every log the camp can send, so Odo buys logs high and everything else low.
    buyRate: (_g, item) => (LOGS.has(item) ? 0.8 : 0.4),
    footer: () => 'Odo pays well for logs and not much for anything else',
  },
  cai: {
    id: 'cai', name: 'Morgan\'s Sledge', owner: 'cai',
    stock: [
      { item: 'lockpick', price: 4 },
      { item: 'bread', price: 7 },
      { item: 'cooked_char', price: 48 },
      { item: 'cooked_trout', price: 18 },
      { item: 'halter_fell', price: 90, when: (g) => !g.has('halter_fell') },
    ],
    buyRate: (_g, item) => (item === 'frost_pelt' || item === 'wolf_pelt' ? 0.85 : 0.5),
    footer: () => 'Cai pays well for pelts. Everything else has to go down the mountain',
  },
  ilse: {
    id: 'ilse', name: 'Scarth Watch', owner: 'ilse', who: 'Ilse',
    stock: [],
    buyRate: (_g, item) => (item === 'star_crystal' ? 0.9 : 0.3),
    footer: () => 'Ilse pays for star crystal. She will take other things, reluctantly',
  },
};

const LOGS = new Set(['oak_logs', 'birch_logs', 'pine_logs', 'elder_logs']);

export function shopPrice(g: GameApi, shop: ShopDef, price: number): number {
  return Math.max(1, Math.round(price * (shop.priceMult?.(g) ?? 1)));
}

export function shopBuyPrice(g: GameApi, shop: ShopDef, item: string): number {
  return Math.floor(ITEMS[item].value * shop.buyRate(g, item));
}

// Side content traders (src/data/content).
import { CONTENT } from './content';
for (const c of CONTENT) Object.assign(SHOPS, c.shops ?? {});
