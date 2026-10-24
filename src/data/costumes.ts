import type { Appearance } from '../entities/humanoid';

// Costumes: a whole outfit worn over your own clothes and armour, the way GW2's outfits and ESO's
// costumes are. Picked under Costume with Change look (character screen), and seen by everyone,
// since it travels with your look. Your own clothes come back the moment you take it off. Looks
// only, never power: the armour underneath still does its work.
//
// The Lantern Wake's are guising clothes: what the fen and dale children wear round the doors on the
// Wake nights (docs/LORE.md, The festival year). Bought from the Wake stall for wake candles; the
// Lantern Man's coat now and then from the Lantern Man himself.

export interface CostumeDef {
  id: string;
  name: string;
  /** Sold in the Everrealm store (data/content/storeItems.ts, server/store.mjs) rather than found in the world. */
  store?: boolean;
  /** What it puts on: cloth colours and cuts, and its own headwear. */
  look: Partial<Appearance>;
}

export const COSTUMES: Record<string, CostumeDef> = {
  lanternman: {
    id: 'lanternman', name: 'The Lantern Man',
    look: { top: 7, tunic: '#1e1a22', trim: '#e8701a', shirt: '#2a2430', trousers: '#22201c', hose: '#1a1816', legs: 0, boots: '#141210', shoes: 1, cape: '#141018', capeDesign: null, hat: 'wide', hatColor: '#1a1418', gloves: '#2a2018', belt: '#3a2a1e', apron: false },
  },
  scarecrow: {
    id: 'scarecrow', name: 'Scarecrow',
    look: { top: 0, tunic: '#8a7a4a', trim: '#5a7a3a', shirt: '#a0522d', trousers: '#5a5a6a', hose: '#4a4a56', legs: 0, boots: '#3a2a1e', shoes: 0, cape: null, capeDesign: null, hat: 'sack', gloves: null, belt: '#c8a050', apron: false },
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton',
    look: { top: 0, tunic: '#16141a', trim: '#e8e2d0', shirt: '#e8e2d0', trousers: '#16141a', hose: '#e8e2d0', legs: 1, boots: '#16141a', shoes: 2, cape: null, capeDesign: null, hat: 'skull', gloves: '#e8e2d0', belt: '#2a2420', apron: false },
  },
  witch: {
    id: 'witch', name: 'Hedge-witch',
    look: { top: 2, tunic: '#3a2a4a', trim: '#7a9a3a', shirt: '#2a2030', trousers: '#2a2030', hose: '#2a2030', legs: 0, boots: '#1a1418', shoes: 1, cape: '#2a1e30', capeDesign: null, hat: 'witch', hatColor: '#2a2030', gloves: null, belt: '#5a3a22', apron: false },
  },
  ghost: {
    id: 'ghost', name: 'Bedsheet ghost',
    look: { top: 2, tunic: '#f4f2ec', trim: '#e8e4da', shirt: '#f4f2ec', trousers: '#f4f2ec', hose: '#f4f2ec', legs: 0, boots: '#e8e4da', shoes: 2, cape: '#f4f2ec', capeDesign: null, hat: 'sheet', gloves: '#f4f2ec', belt: '#f4f2ec', apron: false },
  },
  crow: {
    id: 'crow', name: 'Crow',
    look: { top: 7, tunic: '#16141a', trim: '#3a3a4a', shirt: '#22202a', trousers: '#16141a', hose: '#16141a', legs: 0, boots: '#16141a', shoes: 1, cape: '#0e0c12', capeDesign: null, hat: 'crow', hatColor: '#16141a', gloves: '#16141a', belt: '#2a2420', apron: false },
  },
};

// The store's outfits, the way ESO's crown costumes and GW2's outfits are sold: each a whole look from
// somewhere in the realm, with its own armour, headgear and cloak, worn over whatever you have on.
// Looks only, like everything the store sells.
Object.assign(COSTUMES, {
  kilnplate: {
    id: 'kilnplate', name: 'Kilnfolk forge plate', store: true,
    look: { top: 4, tunic: '#3a2418', trim: '#ffb040', shirt: '#2a1a12', trousers: '#2a1a12', hose: '#2a1a12', legs: 0, boots: '#1e140c', shoes: 1, gloves: '#2a1a10', belt: '#5a3a1a', apron: false, hat: 'none',
      cape: '#3a1a10', capeDesign: 'cog',
      chestArmour: { style: 'plate', color: '#b07a36', trim: '#ffb040' }, shoulders: { style: 'spiked', color: '#8a5a2a', trim: '#ffb040' },
      bracers: { style: 'plate', color: '#b07a36', trim: '#ffb040' }, legArmour: { style: 'plate', color: '#8a5a2a', trim: '#ffb040' }, sabatons: { color: '#6a4420' },
      helm: { style: 'horned', color: '#8a5a2a', trim: '#ffb040', plume: '#ff7a20' } },
  },
  towerknight: {
    id: 'towerknight', name: 'Callis tower knight', store: true,
    look: { top: 4, tunic: '#f4f0e6', trim: '#d8b050', shirt: '#e8e2d4', trousers: '#d8d2c4', hose: '#d8d2c4', legs: 0, boots: '#8a7a5a', shoes: 1, gloves: '#e8e2d4', belt: '#d8b050', apron: false, hat: 'none',
      cape: '#2a3a6a', capeDesign: 'pair',
      chestArmour: { style: 'plate', color: '#e8e6e0', trim: '#d8b050' }, shoulders: { style: 'layered', color: '#e8e6e0', trim: '#d8b050' },
      tabard: { color: '#f4f0e6', trim: '#d8b050', emblem: '#2a3a6a' },
      bracers: { style: 'plate', color: '#e8e6e0', trim: '#d8b050' }, legArmour: { style: 'plate', color: '#d8d6d0', trim: '#d8b050' }, sabatons: { color: '#c8c6c0' },
      helm: { style: 'great', color: '#e8e6e0', trim: '#d8b050', plume: '#2a3a6a' } },
  },
  barrowguard: {
    id: 'barrowguard', name: 'Kingsbarrow honour guard', store: true,
    look: { top: 4, tunic: '#1a1a22', trim: '#9fe8ff', shirt: '#14141c', trousers: '#14141c', hose: '#14141c', legs: 0, boots: '#0e0e14', shoes: 1, gloves: '#22222a', belt: '#2a2a34', apron: false, hat: 'none',
      cape: '#14141c', capeDesign: 'stones',
      chestArmour: { style: 'scale', color: '#2a2a34', trim: '#9fe8ff' }, shoulders: { style: 'round', color: '#22222a', trim: '#9fe8ff' },
      bracers: { style: 'plate', color: '#2a2a34', trim: '#9fe8ff' }, legArmour: { style: 'tassets', color: '#22222a', trim: '#9fe8ff' }, sabatons: { color: '#1a1a22' },
      helm: { style: 'barbute', color: '#22222a', trim: '#9fe8ff', plume: '#9fe8ff' } },
  },
  heldfur: {
    id: 'heldfur', name: 'Held herder\'s furs', store: true,
    look: { top: 7, tunic: '#e8ecf0', trim: '#8a9aa8', shirt: '#c8ccd4', trousers: '#8a9aa8', hose: '#6a7a88', legs: 0, boots: '#5a4a3a', shoes: 1, gloves: '#5a4a3a', belt: '#5a4a3a', apron: false,
      hat: 'hood', hatColor: '#e8ecf0', cape: '#c8ccd4', capeDesign: 'peak',
      shoulders: { style: 'fur', color: '#d8d4cc' }, bracers: { style: 'leather', color: '#6a5a4a' }, legArmour: { style: 'leather', color: '#6a5a4a' } },
  },
  corsair: {
    id: 'corsair', name: 'Saltpenny corsair', store: true,
    look: { top: 7, tunic: '#5a1418', trim: '#d8b050', shirt: '#f4ece0', trousers: '#1a1418', hose: '#1a1418', legs: 0, boots: '#1a1410', shoes: 1, gloves: null, belt: '#d8b050', apron: false,
      hat: 'tricorn', hatColor: '#1a1418', cape: null, capeDesign: null, earring: '#d8b050',
      bracers: { style: 'leather', color: '#3a2418', trim: '#d8b050' }, shoulders: { style: 'leather', color: '#3a1012', trim: '#d8b050' } },
  },
  forester: {
    id: 'forester', name: 'Hagworm forester', store: true,
    look: { top: 6, tunic: '#3a4a2a', trim: '#8a6a3a', shirt: '#2e3a22', trousers: '#3a3020', hose: '#3a3020', legs: 0, boots: '#2a2014', shoes: 1, gloves: '#4a3420', belt: '#5a4028', apron: false,
      hat: 'hood', hatColor: '#2e3a22', cape: '#2e3a22', capeDesign: 'oak',
      chestArmour: { style: 'cuirass', color: '#5a4028', trim: '#2a3a1e' }, shoulders: { style: 'leather', color: '#5a4028', trim: '#2a3a1e' },
      bracers: { style: 'leather', color: '#5a4028' }, legArmour: { style: 'leather', color: '#4a3420' } },
  },
} satisfies Record<string, CostumeDef>);

/** The Lantern Wake's six, which the Guiser feat counts (the store's don't). */
export const WAKE_COSTUMES = ['lanternman', 'scarecrow', 'skeleton', 'witch', 'ghost', 'crow'];

/** The look as it's seen: the costume over it, if one is on, with the armour put away under it. */
export function wearing(look: Appearance): Appearance {
  const c = look.costume ? COSTUMES[look.costume] : undefined;
  if (!c) return look;
  return {
    ...look,
    chestArmour: undefined, shoulders: undefined, tabard: undefined, bracers: undefined, legArmour: undefined, sabatons: undefined, helm: undefined, shoulderPads: null,
    ...c.look,
  };
}
