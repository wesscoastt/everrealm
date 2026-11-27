import type { Appearance } from '../entities/humanoid';
import type { ArmourSlot } from './armour';
import { baseOf, UNID } from './gear';
import { ITEMS, type ItemDef } from './items';

// The outfit you show over the gear you wear (owner 2026-11-27: "is there a way to wear armor style over armor",
// then "like swtor"). Every armour piece and weapon you have ever picked up or worn goes into your collection of
// looks (the armoury's 'found:' flags). The outfit is a set of slots of its own, one for each armour slot, the
// cloak and the weapon: each one shows a piece from the collection, or is left empty and shows what you really
// wear there. Only the look changes. Defence, weight, sets, enchantments and damage always come from what's worn.
// The slot's dyes go on over whichever look shows, or every slot takes the chest's colours; a costume still goes
// over all of it. One switch shows your real gear instead, the outfit kept for when you switch back.
//
// Kept on the character's flags: 'shows:<slot>' (a base id), 'outfitOff' (gear shown), 'matchChest',
// 'hideHead', 'hideHands', 'hideCape'. Five outfits are kept under 'outfits', the one being worn under 'outfitTab'.

/** The piece an id is, for its look: a rolled, levelled or unidentified piece looks like the piece it came from. */
export function lookBase(id: string): string {
  return baseOf(id.startsWith(UNID) ? id.slice(UNID.length) : id);
}

/** The outfit's slots, in the order the wardrobe lists them ('weapon' last). */
export const LOOK_SLOTS: ArmourSlot[] = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet'];
export type OutfitSlot = ArmourSlot | 'weapon';
export const OUTFIT_SLOTS: OutfitSlot[] = [...LOOK_SLOTS, 'weapon'];

/** A piece with a look of its own to show (some old pieces only add defence; old weapons have no model). */
function showable(d: ItemDef | undefined, slot: OutfitSlot): boolean {
  if (!d || d.unid) return false;
  if (slot === 'weapon') return !!d.weapon?.model;
  return d.armor?.slot === slot && !!d.armor.look && Object.keys(d.armor.look).length > 0;
}

/** A weapon's look can go over another of the same kind only (a bow over a bow): the way it's held and swung stays right. */
function sameKind(a: string | null | undefined, b: string): boolean {
  const fa = a ? ITEMS[a]?.weapon?.model?.family : undefined;
  return !!fa && fa === ITEMS[b]?.weapon?.model?.family;
}

/** Every look you have for a slot: the pieces found, worn or held now, by name. A weapon's: those of the worn one's kind. */
export function looksFor(slot: OutfitSlot, flags: Record<string, unknown>, held: (string | null | undefined)[], wornWeapon?: string | null): { id: string; name: string }[] {
  const have = new Set(held.filter((x): x is string => !!x).map(lookBase));
  return Object.values(ITEMS)
    .filter((d) => showable(d, slot) && (have.has(d.id) || !!flags['found:' + d.id]) && (slot !== 'weapon' || sameKind(wornWeapon, d.id)))
    .map((d) => ({ id: d.id, name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The piece the outfit has in a slot, if it's still in the collection and still fits; null for an empty slot. */
export function outfitPick(slot: OutfitSlot, flags: Record<string, unknown>, wornWeapon?: string | null): string | null {
  const pick = flags['shows:' + slot];
  if (typeof pick !== 'string' || !flags['found:' + pick] || !showable(ITEMS[pick], slot)) return null;
  return slot === 'weapon' && !sameKind(wornWeapon, pick) ? null : pick;
}

/** The piece whose look a slot shows: the outfit's, unless the outfit is switched off or the slot is empty; else what's worn. */
export function shownIn(slot: OutfitSlot, worn: string | null | undefined, flags: Record<string, unknown>): string | null {
  if (flags.outfitOff) return worn ?? null;
  return outfitPick(slot, flags, slot === 'weapon' ? worn : undefined) ?? worn ?? null;
}

/**
 * The colours the chest shows (its dyes, or the chest piece's own main colour and trim), for 'match chest colour':
 * every other slot is dyed in them.
 */
export function chestColours(chestLook: Partial<Appearance> | undefined, dye: { main?: string; trim?: string }): { main?: string; trim?: string } {
  const main = dye.main ?? chestLook?.chestArmour?.color ?? chestLook?.tunic;
  const trim = dye.trim ?? chestLook?.chestArmour?.trim ?? chestLook?.trim;
  return { ...(main ? { main } : {}), ...(trim ? { trim } : {}) };
}
