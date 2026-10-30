import type { ItemDef } from './items';

// Jewellery: two rings, a neck and an ear, worn with the armour (Game.ts armour adds them up). Each
// piece is small and does one or two things: health, crits, quicker breath, quicker skills. Made at
// the anvil from bronze, silver and the shards the land throws up; dropped now and then by elites and
// bosses (Game.ts onEnemyKilled, JEWEL_DROPS by the creature's level). Plain plaited names, the way
// a smith would sell them.

export type JewelSlot = 'ring' | 'neck' | 'ear';

/** What a piece adds: health, crit chance, energy regained, skill haste. */
export interface JewelStats { slot: JewelSlot; level: number; vigor?: number; crit?: number; wind?: number; haste?: number }

const J = (d: Omit<ItemDef, 'kind' | 'stack' | 'stats'> & { jewel: JewelStats }): ItemDef => ({ ...d, kind: 'armor', stack: false, stats: statLine(d.jewel) });

function statLine(j: JewelStats): string {
  const p = (v: number) => Math.round(v * 1000) / 10;
  const bits = [j.vigor ? `+${j.vigor} health` : '', j.crit ? `+${p(j.crit)}% critical chance` : '', j.wind ? `+${p(j.wind)}% energy back` : '', j.haste ? `${p(j.haste)}% quicker skills` : ''].filter(Boolean);
  return `${{ ring: 'Ring', neck: 'Worn at the neck', ear: 'Earring' }[j.slot]}. ${bits.join(', ')}.`;
}

export const JEWEL_ITEMS: ItemDef[] = [
  J({ id: 'j_bronze_band', name: 'Bronze band', rarity: 'common', value: 18, icon: { shape: 'coin', a: '#c08a42', b: '#6a4a24' }, jewel: { slot: 'ring', level: 1, vigor: 8 },
    desc: 'A plain band beaten from a Tolley bar offcut. Half the Counties wear one on the right hand and couldn\'t tell you why.' }),
  J({ id: 'j_bronze_hoops', name: 'Bronze hoops', rarity: 'common', value: 16, icon: { shape: 'coin', a: '#c08a42' }, jewel: { slot: 'ear', level: 3, vigor: 6, wind: 0.02 },
    desc: 'Two thin hoops. Sailors wear them to pay for their burying if they wash up on a strange shore.' }),
  J({ id: 'j_tooth_cord', name: 'Shark-tooth cord', rarity: 'uncommon', value: 60, icon: { shape: 'fang', a: '#f4f0e4', b: '#6a5238' }, jewel: { slot: 'neck', level: 8, crit: 0.02, vigor: 10 },
    desc: 'A blue shark\'s tooth on a waxed cord. Gullmouth deckhands give them to each other, never to themselves.' }),
  J({ id: 'j_silver_ring', name: 'Silver ring', rarity: 'uncommon', value: 70, icon: { shape: 'coin', a: '#dfe6ee', b: '#9fb2c8' }, jewel: { slot: 'ring', level: 10, crit: 0.02 },
    desc: 'Hollin silver, from the thin seam behind the falls. The inside is stamped with a hammer over a wave.' }),
  J({ id: 'j_silver_studs', name: 'Silver studs', rarity: 'uncommon', value: 64, icon: { shape: 'coin', a: '#dfe6ee' }, jewel: { slot: 'ear', level: 12, crit: 0.015, haste: 0.015 },
    desc: 'A pair of small silver knots. A jeweller in Ansbury makes them in the evenings and sells them to the Waits.' }),
  J({ id: 'j_silver_chain', name: 'Silver chain', rarity: 'uncommon', value: 110, icon: { shape: 'coin', a: '#dfe6ee', b: '#c8c8c0' }, jewel: { slot: 'neck', level: 16, vigor: 25 },
    desc: 'Fine links, heavier than it looks. In the Counties a chain is what you buy when you have money and don\'t want anyone to know.' }),
  J({ id: 'j_crystal_ring', name: 'Starglass ring', rarity: 'rare', value: 220, icon: { shape: 'coin', a: '#dfe6ee', b: '#9fe8ff' }, jewel: { slot: 'ring', level: 24, wind: 0.06, crit: 0.01 },
    desc: 'A chip of star crystal in a silver claw. It pulls a little upward, the way crystal does. You stop noticing after a day.' }),
  J({ id: 'j_crystal_drop', name: 'Starglass drop', rarity: 'rare', value: 200, icon: { shape: 'coin', a: '#9fe8ff', b: '#dfe6ee' }, jewel: { slot: 'ear', level: 28, haste: 0.03 },
    desc: 'A single earring, a bead of star crystal on a silver wire. It hangs very slightly up.' }),
  J({ id: 'j_rime_ring', name: 'Rime ring', rarity: 'rare', value: 300, icon: { shape: 'coin', a: '#e8f4ff', b: '#6aa8d8' }, jewel: { slot: 'ring', level: 40, vigor: 20, crit: 0.02 },
    desc: 'Silver set with a sliver of rime off the Sickle. It\'s cold to put on, every time, however long it\'s been in your pocket.' }),
  J({ id: 'j_black_pendant', name: 'Black-stone pendant', rarity: 'epic', value: 520, icon: { shape: 'coin', a: '#2a2a2e', b: '#dfe6ee' }, jewel: { slot: 'neck', level: 60, vigor: 35, wind: 0.05 },
    desc: 'A drop of the black that holds, set in silver. In Callis they\'d say it was stolen. In Northgate they\'d say put it back.' }),
];

/** What each piece is made from at the anvil (smithing), and the level it wants. */
export const JEWEL_RECIPES: { id: string; station: 'anvil'; skill: 'smithing'; level: number; xp: number; inputs: Record<string, number>; output: string; count: number; time: number }[] = [
  { id: 'j_bronze_band', station: 'anvil' as const, skill: 'smithing' as const, level: 3, xp: 30, inputs: { bronze_bar: 1 }, output: 'j_bronze_band', count: 1, time: 2.4 },
  { id: 'j_bronze_hoops', station: 'anvil' as const, skill: 'smithing' as const, level: 5, xp: 34, inputs: { bronze_bar: 1 }, output: 'j_bronze_hoops', count: 1, time: 2.4 },
  { id: 'j_tooth_cord', station: 'anvil' as const, skill: 'smithing' as const, level: 10, xp: 60, inputs: { shark_tooth: 2, bronze_bar: 1 }, output: 'j_tooth_cord', count: 1, time: 3 },
  { id: 'j_silver_ring', station: 'anvil' as const, skill: 'smithing' as const, level: 14, xp: 80, inputs: { silver_bar: 1 }, output: 'j_silver_ring', count: 1, time: 3 },
  { id: 'j_silver_studs', station: 'anvil' as const, skill: 'smithing' as const, level: 16, xp: 84, inputs: { silver_bar: 1 }, output: 'j_silver_studs', count: 1, time: 3 },
  { id: 'j_silver_chain', station: 'anvil' as const, skill: 'smithing' as const, level: 20, xp: 130, inputs: { silver_bar: 2 }, output: 'j_silver_chain', count: 1, time: 3.6 },
  { id: 'j_crystal_ring', station: 'anvil' as const, skill: 'smithing' as const, level: 30, xp: 220, inputs: { silver_bar: 1, star_crystal: 1 }, output: 'j_crystal_ring', count: 1, time: 4 },
  { id: 'j_crystal_drop', station: 'anvil' as const, skill: 'smithing' as const, level: 34, xp: 230, inputs: { silver_bar: 1, star_crystal: 1 }, output: 'j_crystal_drop', count: 1, time: 4 },
  { id: 'j_rime_ring', station: 'anvil' as const, skill: 'smithing' as const, level: 48, xp: 360, inputs: { silver_bar: 2, rime_shard: 1 }, output: 'j_rime_ring', count: 1, time: 4.4 },
  { id: 'j_black_pendant', station: 'anvil' as const, skill: 'smithing' as const, level: 66, xp: 560, inputs: { silver_bar: 3, black_shard: 1 }, output: 'j_black_pendant', count: 1, time: 5 },
];

/** A piece for a creature of this level to drop: one of the best few it could have, never far above it. */
export function jewelDrop(level: number, rnd: () => number = Math.random): string | null {
  const fit = JEWEL_ITEMS.filter((d) => d.jewel!.level <= level + 4);
  if (!fit.length) return null;
  const top = fit.slice(-3);
  return top[Math.floor(rnd() * top.length)].id;
}
