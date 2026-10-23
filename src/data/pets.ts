import type { Palette } from '../entities/creatures';

// Pets: a small companion that follows you about, the way Wynncraft's and WoW's do. Looks only:
// a pet never fights, fetches or carries, and nobody's pet is better than anyone else's. Collected
// into the wardrobe (used from the pack), picked under Pet with Change look, and seen by everyone,
// since it travels with your look. The free hen comes from the Everrealm store, once per account.

export interface PetDef {
  id: string;
  name: string;
  /** The creature it's drawn as (entities/creatures.ts), and its colours. */
  kind: 'chicken' | 'cat' | 'dog' | 'duck' | 'rabbit' | 'pig';
  pal: Palette;
  /** How big, against the farmyard one. */
  scale: number;
}

export const PETS: Record<string, PetDef> = {
  hen: { id: 'hen', name: 'Speckled hen', kind: 'chicken', pal: { a: '#b8885a', c: '#4a2e1a' }, scale: 1 },
};
