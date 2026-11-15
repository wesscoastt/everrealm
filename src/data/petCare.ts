// Caring for a pet, the way Where Winds Meet's are cared for (owner 2026-11-14: "add a bond status with pets and
// cosmetics for pets like Where Winds Meet"; "add a way to name pets, make sure players can buy pets like the adoption
// center in Verandah"; "pets need to be cared for like Where Winds Meet"). Every pet you own has a name you give it,
// and three needs that fall on the real clock: fed, clean and played with. Look after them and the bond grows, a
// little each time and no faster than a day allows; leave them and the pet's spirits sink, it trails and sits, and the
// bond slips back. The bond opens what it will wear: a collar first, then a neckerchief, a ribbon, a little hat.
// Kept per pet in the flag "petSt:<pet id>"; the one at your heels carries its name and dress on your look, so
// everyone sees them. The pet's own talk is data/content/petCare.ts; the doing is game/Game.ts.

export interface PetState {
  /** The name you gave it (none: it goes by its kind). */
  name?: string;
  /** The bond, 0 to 100. */
  bond: number;
  /** When it was last fed, brushed and played with (ms). */
  fed: number;
  washed: number;
  played: number;
  /** Bond gained today, and which day (a day's care counts for so much and no more). */
  today: number;
  day: number;
  /** What it wears: a collar's colour, and one thing more (WEARS) in a colour. */
  collar?: string;
  wear?: PetWear;
  wearColor?: string;
}

export type PetWear = 'neckerchief' | 'ribbon' | 'hat';
export const WEARS: { id: PetWear; name: string; at: number }[] = [
  { id: 'neckerchief', name: 'A neckerchief', at: 35 },
  { id: 'ribbon', name: 'A ribbon bow', at: 60 },
  { id: 'hat', name: 'A little felt hat', at: 85 },
];
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

/** The bond one act of care earns, and how much a day's care can earn at most. */
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
