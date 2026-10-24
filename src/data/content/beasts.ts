import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// What the wilds' heavier and stranger kinds leave behind (data/gameplay.ts, "The wilds"): the bears,
// the great spiders, the bats, the woken cairns, the adders and Morrow's drakes. Dunmore Tannery pays
// most of a pelt's worth; the rest sell anywhere.

const items: ItemDef[] = [
  { id: 'bear_pelt', name: 'Bear pelt', kind: 'material', rarity: 'uncommon', stack: true, value: 24, icon: { shape: 'pelt', a: '#6a4a2e', b: '#3a2a1a' }, desc: 'Heavy enough to need two arms. Hung over a door it keeps out the draught, and the neighbours.' },
  { id: 'spider_silk', name: 'Spider silk', kind: 'material', rarity: 'common', stack: true, value: 14, icon: { shape: 'gel', a: '#e8e4d8', b: '#a8a090' }, desc: 'Wound off a stick in a skein, still a little sticky. A Gullmouth netmaker will tell you it\'s stronger than hemp, then ask where you got it.' },
  { id: 'bat_wing', name: 'Bat wing', kind: 'material', rarity: 'common', stack: true, value: 10, icon: { shape: 'pelt', a: '#3a2e28', b: '#6a5a4a' }, desc: 'Thin as a glove and folded like one. Apothecaries buy them by the dozen and won\'t say what for.' },
  { id: 'adder_skin', name: 'Adder skin', kind: 'material', rarity: 'common', stack: true, value: 12, icon: { shape: 'pelt', a: '#8a7a4a', b: '#2a2218' }, desc: 'The zigzag runs nose to tail without a break. Hatbands in Ansbury, boot-tops in the fens.' },
  { id: 'cairn_stone', name: 'Cairn stone', kind: 'material', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'ore', a: '#7a7a74', b: '#7fd8f0' }, desc: 'A stone from a cairn that got up and walked, cut with a mark nobody alive can read. It stays faintly warm, and the mark faintly lit.' },
  { id: 'drake_scale', name: 'Drake scale', kind: 'material', rarity: 'rare', stack: true, value: 55, icon: { shape: 'shell', a: '#8a5a3a', b: '#e0c08a' }, desc: 'A scale the size of a palm, from one of the wild drakes on the Glass Flats. The caravan drakes are their cousins, and are told so when they misbehave.' },
];

export const BEAST_CONTENT: RegionContent = { id: 'beasts', items };
