import type { DialogueTree } from '../../game/api';
import type { RegionContent } from './types';

// Selling a house you bought (owner 2026-11-17: "allow players to sell furnished homes to other players"; and 2026-11-05,
// "sell homes to other players or back to the city"). At your own gate: back to whoever sold it you, for half what you
// paid; or to another player in the world, for what you ask, empty or furnished just as it stands. The selling is
// game/Game.ts (sellVilla, sellHomeTo); the book of homes is server/homes.mjs.

const sale: DialogueTree = {
  start: () => 's1',
  nodes: {
    s1: {
      speaker: 'narrator',
      text: (g) => {
        const v = g.homeSellView?.();
        if (!v) return 'Nothing here is yours to sell.';
        return `${v.name}. It sells today for ${v.price.toLocaleString()} marks. Sold back, it fetches ${v.back.toLocaleString()}. Another player may give you more, and take the furniture with it if you like${v.pieces ? ` (${v.pieces} pieces set out)` : ''}.`;
      },
      options: [
        { text: (g) => `Sell it back (${(g.homeSellView?.()?.back ?? 0).toLocaleString()} marks).`, cond: (g) => !!g.homeSellView?.(), effect: (g) => g.homeSellBack?.() },
        { text: 'Sell it to another player, furnished as it stands.', cond: (g) => !!g.homeSellView?.()?.online && (g.homeSellView?.()?.pieces ?? 0) > 0, effect: (g) => g.homeSellToPlayer?.(true) },
        { text: (g) => ((g.homeSellView?.()?.pieces ?? 0) > 0 ? 'Sell it to another player, empty (the furniture comes back to me).' : 'Sell it to another player.'), cond: (g) => !!g.homeSellView?.()?.online, effect: (g) => g.homeSellToPlayer?.(false) },
        { text: 'Keep it.' },
      ],
    },
  },
};

export const HOME_SALE_CONTENT: RegionContent = { id: 'homeSale', dialogue: { home_sell: sale } };
