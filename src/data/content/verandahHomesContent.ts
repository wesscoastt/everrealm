import type { GameApi } from '../../game/api';
import { VERANDAH_HOMES } from '../verandahHomes';
import type { RegionContent } from './types';

// The For Sale notice on each of Verandah's houses that's for sale (data/verandahHomes.ts), by its front door:
// read it to buy the house outright from the town (game/Game.ts buyVilla); at your own, sell it back.
export const VERANDAH_HOMES_CONTENT: RegionContent = {
  id: 'verandahHomes',
  things: VERANDAH_HOMES.flatMap((h) => [
    ...h.doors.slice(1).map(([dx, dz], k) => ({ id: 'vhome' + k + ':' + h.id, x: dx + 0.5, z: dz + 0.5, y: h.base, radius: 2.2, label: `${h.name}: for sale, ${h.price.toLocaleString()} marks`,
      when: (g: GameApi) => !g.homeHolder(h.id), use: (g: GameApi) => g.buyVilla(h.id) })),
    { id: 'vhome:' + h.id, x: h.doors[0][0] + 0.5, z: h.doors[0][1] + 0.5, y: h.base, radius: 2.2, label: `${h.name}: for sale, ${h.price.toLocaleString()} marks`,
      when: (g) => !g.homeHolder(h.id), use: (g) => g.buyVilla(h.id) },
    { id: 'vhome-sell:' + h.id, x: h.door[0] + 0.5, z: h.door[1] + 0.5, y: h.base, radius: 2.2, label: `${h.name}: sell it back to the town`,
      when: (g) => g.myHouseId() === h.id, use: (g) => g.sellVilla() },
  ]),
};
