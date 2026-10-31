import type { ItemDef } from '../items';
import type { RegionContent } from './types';

// The group dungeons' fragments and keys, and the corrupted shard (data/keys.ts).

const FROM = 'Dropped by creatures in the dungeon\'s country, and more often by its own. Four, and a corrupted shard, make its key at any anvil.';

const ITEMS: ItemDef[] = [
  { id: 'frag_tallytag', name: 'Tally tag', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'tally', a: '#a88a5a', b: '#3a2a1a' },
    desc: 'A brass disc with a miner\'s number stamped through it, the kind hung on the board at the pit head going down and taken off coming up. Nobody took these off.',
    stats: FROM + ' The Old Man\'s Workings.' },
  { id: 'frag_token', name: 'Shepherd\'s token', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'coin', a: '#c8c0a8', b: '#5a4a3a' },
    desc: 'A disc of horn with a sheep cut into it, a shepherd\'s mark for the winter fold under the Kettle. Each one stands for a flock that went in.',
    stats: FROM + ' Under the Kettle.' },
  { id: 'frag_tooth', name: 'Brass tooth', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'fang', a: '#d8b050', b: '#7a5a20' },
    desc: 'A tooth broken off one of the Works\' great wheels, worn bright on one face where it met the next wheel for a hundred years.',
    stats: FROM + ' The Escapement.' },
  { id: 'frag_gravecoin', name: 'Grave-coin', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'coin', a: '#4a4a4a', b: '#9fe8ff' },
    desc: 'A coin of black metal with no king\'s head on it, the kind put on the eyes of the dead in the old barrows. It is colder than it should be.',
    stats: FROM + ' Kingsbarrow.' },
  { id: 'key_oldman', name: 'The Old Man\'s key', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'key', a: '#a88a5a', b: '#3a2a1a' },
    desc: 'Four tally tags hammered round a shard of black glass into a key that fits nothing in the pit head. Take it down, and the Workings go dark.',
    stats: 'Opens the Old Man\'s Workings\' corrupted run, once (the Group Finder, Corrupted). Used going in.' },
  { id: 'key_kettle', name: 'The Kettle\'s key', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'key', a: '#c8c0a8', b: '#9fe8ff' },
    desc: 'Four shepherds\' tokens bound round a shard of black glass with sheep-gut. The fold\'s hurdles won\'t open to it. Something further down will.',
    stats: 'Opens Under the Kettle\'s corrupted run, once (the Group Finder, Corrupted). Used going in.' },
  { id: 'key_escapement', name: 'The Escapement\'s key', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'key', a: '#d8b050', b: '#7a5a20' },
    desc: 'Four brass teeth set round a shard of black glass, cut to fit a lock the Works never made. It ticks when you hold it to your ear.',
    stats: 'Opens the Escapement\'s corrupted run, once (the Group Finder, Corrupted). Used going in.' },
  { id: 'key_kingsbarrow', name: 'Kingsbarrow\'s key', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'key', a: '#4a4a4a', b: '#9fe8ff' },
    desc: 'Four grave-coins melted round a shard of black glass. It weighs more than all of it should, and it is never warm.',
    stats: 'Opens Kingsbarrow\'s corrupted run, once (the Group Finder, Corrupted). Used going in.' },
  { id: 'corrupt_shard', name: 'Corrupted shard', kind: 'collectible', rarity: 'epic', stack: true, value: 0, icon: { shape: 'gem', a: '#2a1e2e', b: '#b06aff' },
    desc: 'A sliver of black glass with a light moving in it that isn\'t a reflection. It turns up in the chests at the bottom of the hardest runs, and nobody at the Lamp Company will say where it comes from.',
    stats: 'In every veteran dungeon chest; in a corrupted run, its room chests too. One goes into each dungeon key.' },
];

export const KEYS_CONTENT: RegionContent = { id: 'keys-corrupted', items: ITEMS };
