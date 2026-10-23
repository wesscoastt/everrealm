import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// What Morrow's creatures leave behind (data/gameplay.ts, the Morrow creatures): a material for each
// kind of country, worth more the further north it comes from. The white and the black turn up here
// as they do everywhere in Morrow: chips of the one that floats, shards of the one that doesn't.

const items: ItemDef[] = [
  { id: 'lizard_hide', name: 'Lizard hide', kind: 'material', rarity: 'common', stack: true, value: 18, icon: { shape: 'pelt', a: '#6a8a4a', b: '#d8cc90' }, desc: 'Scaled, supple, and tougher than it looks. Saltpenny boots it; Callis makes purses of it and charges for the name.' },
  { id: 'moth_dust', name: 'Moth dust', kind: 'material', rarity: 'common', stack: true, value: 20, icon: { shape: 'gel', a: '#ffb040', b: '#7a4a2a' }, desc: 'Scraped off a lamp-moth\'s wing into a twist of paper. It glows for a week. The Amberwold folk paint their doorposts with it.' },
  { id: 'white_chip', name: 'Chip of the white', kind: 'material', rarity: 'uncommon', stack: true, value: 26, icon: { shape: 'ore', a: '#f0f4f4', b: '#9fe8ff' }, desc: 'A flake of Morrow\'s lifting crystal. Drop it in water and it floats; hold it in your fist and your arm feels lighter.' },
  { id: 'black_shard', name: 'Shard of the black', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'ore', a: '#2a2430', b: '#6a5a8a' }, desc: 'Small as a thumbnail and as heavy as a fist. It holds down what it\'s set in. Callis pays well for it, and asks nothing.' },
  { id: 'black_glass', name: 'Black glass', kind: 'material', rarity: 'uncommon', stack: true, value: 32, icon: { shape: 'shell', a: '#141418', b: '#6a5a8a' }, desc: 'Lightning on the Flats melts the salt crust into this. Sharp enough to shave with, if you\'re brave.' },
  { id: 'grave_iron', name: 'Grave iron', kind: 'material', rarity: 'uncommon', stack: true, value: 38, icon: { shape: 'bar', a: '#5a6064', b: '#2a2e30' }, desc: 'Iron from the barrows: nails, rings, a buckle. Cold whatever the weather. The smiths at Northgate won\'t work it.' },
  { id: 'troll_hide', name: 'Fell troll hide', kind: 'material', rarity: 'rare', stack: true, value: 70, icon: { shape: 'pelt', a: '#7a8a8a', b: '#3a4040' }, desc: 'A piece the size of a door, and as thick. The Held Country\'s herders cure it for winter tents and won\'t say how they come by it.' },
];

export const MORROW_WILDS: RegionContent = { id: 'morrowWilds', items };
