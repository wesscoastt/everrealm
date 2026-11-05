import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { mcToGame } from '../../world/mclandArea';

// The Fortress off Verandah's docks, made a smugglers' den (owner 2026-11-05). Its blocks are the owner's
// walled farmstead reworked as it comes in (scripts/mc/edits.ts: a planked yard for the cargo, a wharf and
// jetties where the pens were, a sea cave under it all with a channel out to the open sea); its cargo, signs
// and lamps are world/sites.ts's ('mc-den' and DEN_PROPS here); its people are here.
//
// Jory Kettle runs it, out of the counting room: buys anything, no questions, and sells what came in on the
// last tide. Sal Treharne keeps the lookout up the tower and doesn't like visitors. Old Mab Penhallow keeps
// the tally in the hold, and has been in the trade so long she remembers when it was honest.

/** Spots on the Fortress piece (Minecraft coordinates, as in scripts/mc/edits.ts) in the game's. */
const at = (x: number, y: number, z: number): [number, number, number] => mcToGame('seafort', x + 0.5, y, z + 0.5);

/** The cargo, the lamps and the den's new signs, in Minecraft coordinates (world/sites.ts places them). */
export const DEN_PROPS: { t: string; x: number; y: number; z: number; ry?: number; item?: string; text?: string; h?: number }[] = [
  // the yard: the last tide's cargo, stacked and waiting
  ...[[-972, 906], [-971, 906], [-972, 907], [-970, 913], [-969, 913], [-974, 915], [-973, 916], [-981, 898], [-980, 899], [-966, 908]].map(([x, z]) => ({ t: 'crate', x, y: 63, z })),
  ...[[-968, 910], [-967, 910], [-968, 911], [-978, 901], [-965, 914], [-975, 903]].map(([x, z]) => ({ t: 'barrel', x, y: 63, z })),
  { t: 'cart', x: -966, y: 63, z: 904, ry: 1.2 },
  ...[[-970, 903], [-965, 917], [-983, 897], [-977, 911]].map(([x, z]) => ({ t: 'lantern', x, y: 63, z })),
  // the bunks (the north room) and the card room (the south)
  { t: 'furn', item: 'bed', x: -991, y: 63, z: 902, ry: 0 }, { t: 'furn', item: 'bed', x: -988, y: 63, z: 902, ry: 0 },
  { t: 'furn', item: 'chest', x: -986, y: 63, z: 901, ry: 0 }, { t: 'furn', item: 'lamp', x: -985, y: 63, z: 903, ry: 0 },
  { t: 'furn', item: 'table', x: -989, y: 63, z: 914, ry: 0 }, { t: 'furn', item: 'stool', x: -990, y: 63, z: 914, ry: 0 },
  { t: 'furn', item: 'stool', x: -988, y: 63, z: 914, ry: 0 }, { t: 'furn', item: 'stool', x: -989, y: 63, z: 915, ry: 0 },
  { t: 'furn', item: 'candles', x: -986, y: 63, z: 915, ry: 0 },
  // the hold: the counting room's desk and strongbox, the tally on the shelves, a rug over the hatch to the cave
  { t: 'furn', item: 'desk', x: -984, y: 63, z: 921, ry: 0 }, { t: 'furn', item: 'strongbox', x: -985, y: 63, z: 917, ry: 0 },
  { t: 'furn', item: 'shelves', x: -977, y: 63, z: 921, ry: Math.PI }, { t: 'furn', item: 'shelves', x: -978, y: 63, z: 921, ry: Math.PI },
  ...[[-983, 917], [-982, 917], [-983, 918]].map(([x, z]) => ({ t: 'barrel', x, y: 63, z })),
  // the cave: the landing stage's cargo and its lamps
  ...[[-993, 910], [-992, 910], [-993, 909], [-989, 918], [-988, 918]].map(([x, z]) => ({ t: 'crate', x, y: 57, z })),
  ...[[-990, 910], [-986, 918]].map(([x, z]) => ({ t: 'barrel', x, y: 57, z })),
  ...[[-995, 911], [-985, 911], [-995, 917], [-985, 917]].map(([x, z]) => ({ t: 'lantern', x, y: 57, z })),
  // the wharf and the jetties: boats tied up, lamps on the posts, cargo coming ashore
  ...[[-1001, 924], [-1001, 929], [-1001, 934], [-1025, 924], [-1025, 929], [-1025, 934]].map(([x, z]) => ({ t: 'lantern', x, y: 63, z })),
  ...[[-990, 926], [-989, 926], [-990, 927], [-985, 931], [-984, 931]].map(([x, z]) => ({ t: 'crate', x, y: 63, z })),
  ...[[-993, 932], [-982, 925]].map(([x, z]) => ({ t: 'barrel', x, y: 63, z })),
  // the den's own signs, in place of the old storage labels
  { t: 'mcsign', x: -994, y: 63, z: 921, ry: 0, h: 0, text: 'THE DEN\nKeep your\nmouth shut' },
  { t: 'mcsign', x: -981, y: 63, z: 916, ry: 0, h: 0, text: 'THE HOLD\nNothing here\nis yours' },
  { t: 'mcsign', x: -995, y: 57, z: 912, ry: 0, h: 0, text: 'Mind the\nwater' },
];
/** Boats tied up at the jetties (game props; world/sites.ts floats them), Minecraft x, z and facing. */
export const DEN_BOATS: [number, number, number][] = [[-1014, 926, 0], [-1018, 931, Math.PI], [-1009, 936, 0.1]];

const items: ItemDef[] = [
  { id: 'den_brandy', name: 'Untaxed brandy', kind: 'food', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'bread', a: '#a85a2a', b: '#3a1e10' },
    desc: 'A flat bottle with no Charter seal on it. Smooth, and nobody\'s paid a farthing on it.', stats: 'Food: restores health; the Charter would like a word' },
  { id: 'den_silk', name: 'Smuggled silk', kind: 'material', rarity: 'rare', stack: true, value: 90, icon: { shape: 'pelt', a: '#c83a5a', b: '#f0c8d0' },
    desc: 'A bolt of silk off a ship that never came into any harbour. Tailors pay well for it and ask nothing.', stats: 'Crafting material' },
  { id: 'den_chart', name: 'A smuggler\'s chart', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'letter', a: '#e8d8a8', b: '#5a3a1e' },
    desc: 'The coast west of the Counties, every cove and channel inked in, and the Charter\'s cutters\' beats in red. Somebody will miss this.', stats: 'Keepsake' },
];

const npcs: NpcDef[] = [
  { id: 'den_jory', name: 'Jory Kettle', title: 'Runs the Den', look: { frame: 'm', skin: '#c8906a', hair: '#2a2420', hairStyle: 3, facial: 4, eyes: '#3a4a2a', tunic: '#2a2a30', trim: '#8a6a3a', shirt: '#d8ccb0', trousers: '#2a2620', boots: '#1e1a16', hat: 'tricorn', hatColor: '#1e1e22', build: 1.05, age: 0.45, earring: '#c8a050' },
    schedule: [{ from: 0, to: 24, at: (() => { const p = at(-983, 63, 920); return [p[0], p[2]] as [number, number]; })(), face: (() => { const p = at(-983, 63, 918); return [p[0], p[2]] as [number, number]; })(), anim: 'idle', y: at(-983, 63, 920)[1] }],
    barks: ['Buying or selling? Either way, quietly.', 'Tide\'s on the turn. Something\'s coming in.', 'If anyone asks, this is a fish shed.'] },
  { id: 'den_sal', name: 'Sal Treharne', title: 'The lookout', look: { frame: 'f', skin: '#d8a882', hair: '#7a3a1e', hairStyle: 5, eyes: '#4a6a7a', tunic: '#3a4a3a', trim: '#6a5a3a', trousers: '#2a2a26', boots: '#1e1a16', hat: 'kerchief', hatColor: '#5a2a22', build: 0.95, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: (() => { const p = at(-973, 63, 912); return [p[0], p[2]] as [number, number]; })(), face: (() => { const p = at(-960, 63, 912); return [p[0], p[2]] as [number, number]; })(), anim: 'idle', y: at(-973, 63, 912)[1] }],
    barks: ['You weren\'t followed. Were you.', 'Cutter off the point at dawn. Charter colours.', 'Keep away from the edge. It\'s a long swim and I won\'t throw you a rope.'] },
  { id: 'den_mab', name: 'Mab Penhallow', title: 'Keeps the tally', look: { frame: 'f', skin: '#d8b090', hair: '#e8e4dc', hairStyle: 5, eyes: '#3a3a3a', tunic: '#4a3a2a', trim: '#8a7a5a', shirt: '#e8e0d0', trousers: '#2a2420', boots: '#1e1a16', hat: 'coif', hatColor: '#3a3028', build: 0.85, height: 0.92, age: 0.9 },
    schedule: [{ from: 0, to: 24, at: (() => { const p = at(-990, 57, 911); return [p[0], p[2]] as [number, number]; })(), face: (() => { const p = at(-990, 57, 914); return [p[0], p[2]] as [number, number]; })(), anim: 'idle', y: at(-990, 57, 911)[1] }],
    barks: ['Forty barrels in, thirty-eight out. Somebody\'s drinking the difference.', 'Wipe your feet. This is a cave, not a pigsty.'] },
];

const jory: DialogueTree = {
  start: (g) => (g.flag('den:met') ? 'back' : 'meet'),
  nodes: {
    meet: {
      text: 'You found the stair, or you swam the tunnel. Either way, you\'re here now, and that makes you one of two things. A customer, or a problem. I\'m Jory Kettle. Which are you?',
      effect: (g) => g.setFlag('den:met', 1),
      options: [
        { text: 'A customer.', next: 'customer' },
        { text: 'What is this place?', next: 'place' },
        { text: 'A problem, maybe.', next: 'problem' },
      ],
    },
    place: { text: 'The Fortress. Verandah\'s farmers built it to keep the gulls off their carrots. We keep other things here now. The Charter\'s cutters go round the point twice a day and never once look in. Good for them. Good for us.', next: 'customer' },
    problem: { text: 'Everybody says that on the way in. Sal\'s up the tower with a crossbow and a very short temper, and Mab\'s down in the cave with a ledger and a longer one. Shall we start again? You\'re a customer.', next: 'customer' },
    customer: {
      text: 'Good. I buy anything, and I don\'t ask where it came from. I sell what came in on the last tide. Prices are what they are. Complaints go in the sea.',
      options: [
        { text: 'Show me what you\'ve got.', effect: (g) => g.openShop('den_jory') },
        { text: 'Another time.' },
      ],
    },
    back: {
      text: 'Back again. Nobody followed you? Good. What do you want?',
      options: [
        { text: 'Trade.', effect: (g) => g.openShop('den_jory') },
        { text: 'Who are Sal and Mab?', next: 'crew' },
        { text: 'Nothing. Just looking.' },
      ],
    },
    crew: { text: 'Sal keeps the lookout. She can see a Charter sail before the Charter can. Mab keeps the tally. She\'s been in the trade fifty years. She says it used to be honest. I\'ve never known what she means by that, and I\'ve never had the nerve to ask.' },
  },
};

const shop: ShopDef = {
  id: 'den_jory', name: 'Jory Kettle\'s cargo', owner: 'den_jory',
  stock: [{ item: 'den_brandy', price: 45 }, { item: 'den_silk', price: 160 }, { item: 'den_chart', price: 400 }, { item: 'brine_cutlass', price: 120 }],
  // (he pays a fence's rate: more than a shop, for anything)
  buyRate: () => 0.6,
  footer: () => 'Jory buys anything at six tenths of its worth. No questions.',
} as ShopDef;

export const SMUGGLERS_DEN: RegionContent = {
  id: 'smugglersDen', items, npcs,
  dialogue: { den_jory: jory },
  shops: { den_jory: shop },
};
