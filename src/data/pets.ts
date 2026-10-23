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
  // From the store
  kitten: { id: 'kitten', name: 'Hearth kitten', kind: 'cat', pal: { a: '#e8a050', b: '#b86a28', c: '#f8f0e0' }, scale: 0.7 },
  pup: { id: 'pup', name: 'Shepherd\'s pup', kind: 'dog', pal: { a: '#1e1a18', b: '#f4eee4', c: '#b0783a' }, scale: 0.7 },
  duckling: { id: 'duckling', name: 'Puddle duckling', kind: 'duck', pal: { a: '#e8d060', b: '#c8a030' }, scale: 0.65 },
  hare: { id: 'hare', name: 'Moon hare', kind: 'rabbit', pal: { a: '#f2f0ea' }, scale: 1.1 },
  piglet: { id: 'piglet', name: 'Truffle piglet', kind: 'pig', pal: { a: '#e8b0a0', b: '#6a4a3a' }, scale: 0.55 },
};
