import type { Appearance } from '../entities/humanoid';

// Dyeing armour, the way ESO and GW2 let you: each piece you wear has two channels, its main colour and
// its trim, dyed from any dye you have. Everyone starts with the common dyes below; the festival and
// rare ones (data/festivals.ts, data/seasons.ts) join them in the wardrobe for good once found.
// A change costs a few marks. The dye sits on the slot, not the piece, so a new chest piece comes
// in the colours you chose for your chest.

export type DyeSlot = 'head' | 'shoulders' | 'chest' | 'legs' | 'hands' | 'feet';
export type DyeChannel = 'main' | 'trim';
export const DYE_SLOTS: DyeSlot[] = ['head', 'shoulders', 'chest', 'legs', 'hands', 'feet'];
export const DYE_COST = 5;

/** The common dyes everyone has. */
export const STARTER_DYES: { name: string; hex: string }[] = [
  { name: 'Coal', hex: '#1e1c1e' }, { name: 'Slate', hex: '#4a4e56' }, { name: 'Ash', hex: '#9a9c9e' }, { name: 'Chalk', hex: '#e8e4da' },
  { name: 'Madder', hex: '#9a2a24' }, { name: 'Wine', hex: '#5a1a2a' }, { name: 'Rust', hex: '#a8532a' }, { name: 'Ochre', hex: '#c8902a' },
  { name: 'Weld', hex: '#d8c050' }, { name: 'Moss', hex: '#5a6a2a' }, { name: 'Holly', hex: '#2a4a2a' }, { name: 'Sea', hex: '#2a6a72' },
  { name: 'Woad', hex: '#2a3a6a' }, { name: 'Ink', hex: '#1a1e3a' }, { name: 'Heather', hex: '#6a4a7a' }, { name: 'Walnut', hex: '#4a3220' },
  { name: 'Fawn', hex: '#a8885a' }, { name: 'Brass', hex: '#c8a050' }, { name: 'Steel', hex: '#8a929a' }, { name: 'Copper', hex: '#b06a3a' },
];

/** A slot's dyes on the look that slot's piece puts on: its cloth and its metal, main and trim. */
export function dyeLook(slot: DyeSlot, l: Partial<Appearance>, dye: { main?: string; trim?: string }): Partial<Appearance> {
  const m = dye.main, t = dye.trim;
  if (!m && !t) return l;
  const o: Partial<Appearance> = { ...l };
  const metal = <K extends 'chestArmour' | 'shoulders' | 'bracers' | 'legArmour' | 'helm'>(k: K) => {
    const v = o[k] as { color: string; trim?: string } | undefined;
    if (v) (o as Record<string, unknown>)[k] = { ...v, color: m ?? v.color, trim: t ?? v.trim };
  };
  if (slot === 'chest') { if (m) o.tunic = m; if (t) o.trim = t; if (t && o.shirt) o.shirt = t; metal('chestArmour'); metal('shoulders'); if (o.tabard) o.tabard = { ...o.tabard, color: m ?? o.tabard.color, trim: t ?? o.tabard.trim }; }
  else if (slot === 'shoulders') metal('shoulders');
  else if (slot === 'legs') { if (m) o.trousers = m; if (t) o.hose = t; metal('legArmour'); }
  else if (slot === 'hands') { if (m && o.gloves) o.gloves = m; metal('bracers'); }
  else if (slot === 'feet') { if (m) o.boots = m; if (o.sabatons) o.sabatons = { color: m ?? o.sabatons.color }; }
  else if (slot === 'head') { if (m && o.hatColor) o.hatColor = m; metal('helm'); if (t && o.helm?.plume) o.helm = { ...o.helm, plume: t }; }
  return o;
}
