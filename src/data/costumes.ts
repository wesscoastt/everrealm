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
