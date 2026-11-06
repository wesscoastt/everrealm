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
  // Verandah's strays, from the Adoption Center (data/content/verandahMarket.ts)
  stray_tabby: { id: 'stray_tabby', name: 'Harbour tabby', kind: 'cat', pal: { a: '#8a7a6a', b: '#4a3a2e', c: '#e8dcc0' }, scale: 1.05 },
  stray_ginger: { id: 'stray_ginger', name: 'Ginger tom', kind: 'cat', pal: { a: '#d8803a', b: '#a8582a', c: '#f4e4c8' }, scale: 1.1 },
  stray_mutt: { id: 'stray_mutt', name: 'Dockside mutt', kind: 'dog', pal: { a: '#7a5a3a', b: '#e8dcc0', c: '#3a2a1e' }, scale: 1 },
  stray_black: { id: 'stray_black', name: 'Black lurcher', kind: 'dog', pal: { a: '#1e1a18', b: '#3a302a', c: '#5a4a3a' }, scale: 1.15 },
  hen: { id: 'hen', name: 'Speckled hen', kind: 'chicken', pal: { a: '#b8885a', c: '#4a2e1a' }, scale: 1 },
  // From the store
  kitten: { id: 'kitten', name: 'Hearth kitten', kind: 'cat', pal: { a: '#e8a050', b: '#b86a28', c: '#f8f0e0', breed: 'young' }, scale: 1 },
  pup: { id: 'pup', name: 'Shepherd\'s pup', kind: 'dog', pal: { a: '#1e1a18', b: '#f4eee4', c: '#b0783a', breed: 'young' }, scale: 1 },
  duckling: { id: 'duckling', name: 'Puddle duckling', kind: 'duck', pal: { a: '#e8d060', b: '#c8a030', breed: 'young' }, scale: 1 },
  hare: { id: 'hare', name: 'Moon hare', kind: 'rabbit', pal: { a: '#f2f0ea' }, scale: 1.1 },
  piglet: { id: 'piglet', name: 'Truffle piglet', kind: 'pig', pal: { a: '#e8b0a0', b: '#6a4a3a', breed: 'young' }, scale: 1 },
};
