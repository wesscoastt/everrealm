import { MC_THINGS } from '../mcSigns';
import type { Station } from '../gameplay';
import type { RegionContent } from './types';

// Verandah's places to work (owner 2026-11-05: "make the anvils and crafting things usable"): every crafting
// table on the owner's builds a joiner's bench, every furnace a forge's furnace, every anvil an anvil, used as
// the game's own are (crafting, at that station). Where (scripts/mc/export.ts): MC_THINGS' 'mcbench',
// 'mcfurnace' and 'anvil'.

const KIND: Record<string, [Station, string]> = { mcbench: ['bench', 'Work at the crafting table'], mcfurnace: ['furnace', 'Work at the furnace'], anvil: ['anvil', 'Work at the anvil'] };

export const VERANDAH_STATIONS: RegionContent = {
  id: 'verandahStations',
  things: MC_THINGS.filter((t) => String(t[0]) in KIND).map((t, i) => {
    const [st, label] = KIND[String(t[0])], x = +t[1], y = +t[2], z = +t[3];
    return { id: `ver-station-${i}`, x, y, z, label, radius: 1.8, use: (g) => g.openCrafting(st, { x, y, z }) };
  }),
};
