// Caring for a pet, the way Where Winds Meet\'s are cared for (owner 2026-11-14: "add a bond status with pets and
// cosmetics for pets like Where Winds Meet"; "add a way to name pets, make sure players can buy pets like the adoption
// center in Verandah"; "pets need to be cared for like Where Winds Meet"). Every pet you own has a name you give it,
// and three needs that fall on the real clock: fed, clean and played with. Look after them and the bond grows, a
// little each time and no faster than a day allows; leave them and the pet\'s spirits sink, it trails and sits, and the
// bond slips back. The bond opens what it will wear: a collar first, then a neckerchief, a ribbon, a little hat.
// Kept per pet in the flag "petSt:<pet id>"; the one at your heels carries its name and dress on your look, so
// everyone sees them. The pet\'s own talk is data/content/petCare.ts; the doing is game/Game.ts.

export interface PetState {
  /** The name you gave it (none: it goes by its kind). */
  name?: string;
  /** The bond, 0 to 100. */
  bond: number;
  /** When it was last fed, brushed and played with (ms). */
  fed: number;
  washed: number;
  played: number;
  /** Bond gained today, and which day (a day\'s care counts for so much and no more). */
  today: number;
  day: number;
  /** What it wears: a collar\'s colour, and one thing more (WEARS) in a colour. */
  collar?: string;
  /** What it wears in each slot (PET_COSMETICS ids), and each one\'s colour where it takes one. */
  neck?: string; head?: string; back?: string;
  neckCol?: string; headCol?: string; backCol?: string;
  /** (from before the wardrobe: one wear and its colour, read as a neck or head piece) */
  wear?: string; wearColor?: string;
}

/**
 * The pet\'s wardrobe (owner 2026-11-15: "cosmetics for pets like Where Winds Meet, lots of different kinds you can
 * unlock / buy"): a collar, and one thing each round the neck, on the head and on the back. Some open as the bond
 * grows, the adoption centres sell most of the rest, and a few are earned: an achievement\'s, a faction\'s. Every piece
 * is drawn on the pet itself, fitted to its head or back whatever kind it is (entities/Companion.ts), and others see it.
 */
export type CosSlot = 'neck' | 'head' | 'back';
export interface PetCosmetic {
  id: string;
  name: string;
  slot: CosSlot;
  /** Takes a colour (else it\'s always its own). */
  dyed?: boolean;
  /** Where it comes from: a bond reached, a price at the adoption centres, or an achievement (data/feats.ts) done. */
  bond?: number;
  price?: number;
  feat?: string;
  /** What it is, in a line, for the shop and the wardrobe. */
  desc: string;
}
export const PET_COSMETICS: PetCosmetic[] = [
  // Round the neck
  { id: 'neckerchief', name: 'Neckerchief', slot: 'neck', dyed: true, bond: 35, desc: 'A square of cotton knotted at the throat, the way the drovers tie theirs.' },
  { id: 'bell', name: 'Brass bell', slot: 'neck', price: 40, desc: 'A little bell on a cord. Every bird in the parish will know where your pet is.' },
  { id: 'bowtie', name: 'Bow tie', slot: 'neck', dyed: true, price: 60, desc: 'Silk, tied properly, for occasions and for no occasion at all.' },
  { id: 'scarf', name: 'Knitted scarf', slot: 'neck', dyed: true, price: 80, desc: 'Somebody\'s grandmother knitted it, with the ends long enough to trip on.' },
  { id: 'garland', name: 'Flower garland', slot: 'neck', price: 90, desc: 'Daisies and buttercups, threaded on a stalk. It lasts longer than it ought to.' },
  { id: 'ruff', name: 'Lace ruff', slot: 'neck', price: 150, desc: 'Starched lace in a wheel, as the Assembly\'s grandees wear theirs.' },
  { id: 'medal', name: 'Show medal', slot: 'neck', feat: 'tables10', desc: 'A brass medal on a blue ribbon, won at cards and pinned on the pet, who is prouder of it than you.' },
  // On the head
  { id: 'ribbon', name: 'Ribbon bow', slot: 'head', dyed: true, bond: 60, desc: 'A bow between the ears, tied by somebody patient.' },
  { id: 'felthat', name: 'Little felt hat', slot: 'head', dyed: true, bond: 85, desc: 'A felt hat with a band, made small. For a pet you\'ve been through a great deal with.' },
  { id: 'straw', name: 'Straw hat', slot: 'head', price: 70, desc: 'A haymaker\'s hat with holes cut for the ears.' },
  { id: 'beret', name: 'Beret', slot: 'head', dyed: true, price: 80, desc: 'Worn at an angle, which makes it a statement.' },
  { id: 'flowers', name: 'Flower crown', slot: 'head', price: 100, desc: 'Cornflowers and poppies in a ring, from the Hollindale meadows.' },
  { id: 'antlers', name: 'Felt antlers', slot: 'head', price: 120, desc: 'For the Long Night, or for any night at all.' },
  { id: 'tricorn', name: 'Tricorn', slot: 'head', price: 160, desc: 'Three corners and a red plume, as the Brethren\'s captains wear.' },
  { id: 'tophat', name: 'Top hat', slot: 'head', price: 220, desc: 'Tall and black and entirely too grand for anyone with four legs.' },
  { id: 'wizard', name: 'Star-scattered hat', slot: 'head', feat: 'fac_mages', desc: 'A Magister\'s pointed hat, made very small. The stars on it are only painted. Probably.' },
  { id: 'crown', name: 'Paper crown', slot: 'head', feat: 'manyHats', desc: 'Gilt paper, from the Many Hats feast. A pet of many halls.' },
  // On the back
  { id: 'saddlebags', name: 'Saddlebags', slot: 'back', price: 90, desc: 'Two little leather bags. Empty, but the pet doesn\'t know that.' },
  { id: 'cape', name: 'Little cape', slot: 'back', dyed: true, price: 120, desc: 'A short cape with a clasp at the throat. It billows, slightly.' },
  { id: 'coat', name: 'Quilted coat', slot: 'back', dyed: true, price: 100, desc: 'For the cold months on the moor: quilted, buttoned under the chest.' },
  { id: 'lantern', name: 'Lamp on a pole', slot: 'back', feat: 'fac_lamplighters', desc: 'A lamplighter\'s pet\'s lamp, on a little pole on a harness. It doesn\'t light. It doesn\'t need to.' },
  { id: 'shield', name: 'Guild shield', slot: 'back', feat: 'fac_fighters', desc: 'The Fighters Guild\'s sword and gaff on a shield the size of your hand.' },
  { id: 'wings', name: 'Moth wings', slot: 'back', feat: 'kills1000', desc: 'Gauze wings on a wire frame, for a pet who has seen a thousand fights from behind your heels.' },
];
export const COSMETIC_BY_ID = Object.fromEntries(PET_COSMETICS.map((c) => [c.id, c])) as Record<string, PetCosmetic>;
/** What\'s left of the old wears, read into the wardrobe. */
export function cosOf(s: PetState): { neck?: string; head?: string; back?: string } {
  const old = s.wear === 'neckerchief' ? { neck: 'neckerchief' } : s.wear === 'ribbon' ? { head: 'ribbon' } : s.wear === 'hat' ? { head: 'felthat' } : {};
  return { neck: s.neck ?? old.neck, head: s.head ?? old.head, back: s.back };
}
/** The collar opens first. */
export const COLLAR_AT = 15;
/** The colours a collar or a wear comes in. */
export const PET_COLOURS: [string, string][] = [
  ['#a8382c', 'red'], ['#2f528f', 'blue'], ['#3f7a3a', 'green'], ['#c8a03a', 'mustard'], ['#5a2f6a', 'plum'], ['#1e1a18', 'black'], ['#e8e0d0', 'cream'], ['#d86a8a', 'pink'],
];

export const BOND_TIERS: { at: number; name: string }[] = [
  { at: 0, name: 'Wary' }, { at: 15, name: 'Settled' }, { at: 35, name: 'Fond' }, { at: 60, name: 'Devoted' }, { at: 85, name: 'Bonded' },
];
export const bondTier = (b: number) => BOND_TIERS.reduce((t, x) => (b >= x.at ? x : t), BOND_TIERS[0]);

/** Hours each need takes to fall from full to empty. */
const EMPTY_H = { fed: 14, washed: 30, played: 10 };
const H = 3_600_000;
/** How full a need is now, 0 to 100. */
export const need = (since: number, k: keyof typeof EMPTY_H, now = Date.now()) => Math.max(0, Math.min(100, 100 - ((now - since) / H / EMPTY_H[k]) * 100));
/** Its spirits: the three needs together, 0 to 100. */
export const spirits = (s: PetState, now = Date.now()) => Math.round((need(s.fed, 'fed', now) + need(s.washed, 'washed', now) + need(s.played, 'played', now)) / 3);
/** A word for its spirits. */
export const spiritsWord = (v: number) => (v >= 80 ? 'bright as a button' : v >= 55 ? 'content' : v >= 30 ? 'a bit low' : 'miserable');

/** The bond one act of care earns, and how much a day\'s care can earn at most. */
export const CARE_BOND = { fed: 3, washed: 3, played: 4 };
export const DAY_BOND_MAX = 20;
export const petDay = (now = Date.now()) => Math.floor(now / 86_400_000);

/** A new pet: half fed, clean enough, wanting a game, and wary. */
export const freshPet = (now = Date.now()): PetState => ({ bond: 0, fed: now - 7 * H, washed: now - 6 * H, played: now - 6 * H, today: 0, day: petDay(now) });

/** A name a person might give a pet: letters, spaces, an apostrophe or a hyphen, up to sixteen. */
export function cleanPetName(raw: string): string | null {
  const t = raw.replace(/[^A-Za-z' -]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (t.length < 2) return null;
  return t.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}
