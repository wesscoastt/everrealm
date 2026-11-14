import type { ItemDef } from './items';

// Fine and prize produce (owner 2026-11-14: "farming and gardening should be in depth like cozy games"; the plan is
// docs/briefs/farming-cozy.md, quality first). A tile kept well (watered every time it dried, composted, its crop in
// season, and a grower who knows the crop) gives some of its harvest as fine or prize. Each is its own item, worth
// more, and counts as the plain one wherever that's wanted: in a recipe, an order, a quest. The plain ones are used
// up first (game/state.ts Inventory).

export const GRADES = [
  { k: 'fine', name: 'Fine', rarity: 'uncommon' as const, value: 1.6, heal: 1.25, says: 'Picked from a well-kept bed: firmer, sweeter, and the cooks pay more for it.' },
  { k: 'prize', name: 'Prize', rarity: 'rare' as const, value: 3, heal: 1.5, says: 'As good as it grows. The kind the shows give ribbons for.' },
];

/** A plain item's better grades, fine then prize. */
export const BETTER: Record<string, string[]> = {};
/** A graded item's plain one. */
export const PLAIN_OF: Record<string, string> = {};

/** The fine and prize forms of each kind of produce named. */
export function gradedProduce(items: Record<string, ItemDef>, produce: string[]): ItemDef[] {
  const out: ItemDef[] = [];
  for (const id of new Set(produce)) {
    const base = items[id];
    if (!base || BETTER[id]) continue;
    BETTER[id] = [];
    for (const g of GRADES) {
      const gid = `${id}_${g.k}`;
      const name = base.name.startsWith('A ') || base.name.startsWith('An ') ? `${base.name.replace(/^An? /, '')} (${g.name.toLowerCase()})` : `${g.name} ${base.name.charAt(0).toLowerCase()}${base.name.slice(1)}`;
      out.push({
        ...base, id: gid, name, rarity: g.rarity, value: Math.max(base.value + 1, Math.round(base.value * g.value)),
        ...(base.heal ? { heal: Math.round(base.heal * g.heal) } : {}),
        desc: `${base.desc ?? ''} ${g.says}`.trim(),
        stats: `${base.heal ? `Restores ${Math.round(base.heal * g.heal)} health. ` : ''}Counts as ${base.name.toLowerCase()} wherever that's wanted, and sells for more.`,
      });
      BETTER[id].push(gid);
      PLAIN_OF[gid] = id;
    }
  }
  return out;
}

/**
 * How well a tile was kept, from nothing to one: its watering, compost, the season, how far past the crop your
 * Farming is, and a hand from your group.
 */
export function keeping(o: { wetShare: number; compost: boolean; inSeason: boolean; levelsOver: number; group: boolean; scarecrow: boolean }): number {
  return Math.max(0, Math.min(1, o.wetShare * 0.45 + (o.compost ? 0.2 : 0) + (o.inSeason ? 0.15 : 0) + Math.min(0.12, o.levelsOver / 100) + (o.group ? 0.05 : 0) + (o.scarecrow ? 0.03 : 0)));
}

/** How a harvest of n splits into plain, fine and prize, for a tile kept this well. */
export function gradeHarvest(n: number, keep: number, rnd = Math.random): [plain: number, fine: number, prize: number] {
  const pPrize = Math.max(0, Math.min(0.4, (keep - 0.6) * 1.1)), pFine = Math.max(0, Math.min(0.55, keep * 0.6 - 0.05));
  let fine = 0, prize = 0;
  for (let i = 0; i < n; i++) { const r = rnd(); if (r < pPrize) prize++; else if (r < pPrize + pFine) fine++; }
  return [n - fine - prize, fine, prize];
}
