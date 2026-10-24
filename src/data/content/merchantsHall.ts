import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { LAND } from '../../world/land';

// Gullmouth's Merchants' Hall by the west gate (world/sites.ts fits it out): the Hall's clerk at the
// counter, who keeps a copy of the Exchange book; a wool factor who buys what the wilds give up; the
// ship's agent who knows every hull in the harbour; and two merchants at the long table who have been
// arguing about pilchards since the morning.

type Look = NpcDef['look'];
const look = (o: Partial<Look>): Look => ({ skin: '#d8a882', hair: '#3a2a1e', hairStyle: 1, eyes: '#4a3a2a', tunic: '#3a4a5a', trim: '#c8a050', trousers: '#2a2a30', boots: '#1e1a16', build: 1, age: 0.5, ...o } as Look);
const at = (id: string, name: string, title: string, l: Look, x: number, z: number, fx: number, fz: number, barks: string[]): NpcDef =>
  ({ id, name, title, look: l, schedule: [{ from: 0, to: 24, at: [x, z], face: [fx, fz], anim: 'idle' }], barks });

const npcs: NpcDef[] = LAND === 'counties' ? [
  at('hall_josiah', 'Josiah Penhale', 'Clerk of the Merchants\' Hall', look({ skin: '#e0b48e', hair: '#6a5a4a', hairStyle: 0, tunic: '#2a2a34', trim: '#a8a8b0', age: 0.65, hat: 'cap', hatColor: '#2a2a30' }), 1611.5, 620.2, 1611.5, 615,
    ['Sign there. And there.', 'Same book as the quay\'s.']),
  at('hall_harriet', 'Harriet Combe', 'Wool factor', look({ skin: '#f0d0b8', hair: '#8a4a2a', hairStyle: 2, lashes: true, tunic: '#5a3a4a', trim: '#e0d0a0', age: 0.45 }), 1607.2, 611.6, 1605.7, 610.5,
    ['Hides, wool, silk. I\'m buying.', 'Callis sends it back as cloth at four times the price.']),
  at('hall_thomas', 'Thomas Varcoe', 'Ship\'s agent', look({ skin: '#b8865e', hair: '#2a1e14', hairStyle: 3, beard: true, tunic: '#1f3a4a', trim: '#c8a050', age: 0.55 }), 1613.8, 611.6, 1615.3, 610.5,
    ['Cargo for berths, berths for cargo.', 'The Rose sails when Corlett\'s wine comes.']),
  at('hall_edmund', 'Edmund Lusk', 'Merchant', look({ skin: '#d8a882', hair: '#c8c0b0', hairStyle: 0, tunic: '#4a3a2a', trim: '#c8a050', build: 1.15, age: 0.75 }), 1608.6, 613.5, 1611, 613.5,
    ['Nine and a half, and not a farthing more.', 'I\'ve bought better pilchards off a cat.']),
  at('hall_agnes', 'Agnes Treloar', 'Merchant', look({ skin: '#c89070', hair: '#2a1e14', hairStyle: 2, lashes: true, tunic: '#2f4a3a', trim: '#e0d0a0', age: 0.5 }), 1612.8, 615.0, 1611.5, 613.5,
    ['Then you can eat them yourself, Edmund.', 'Ten, and I\'ll throw in the barrels.']),
] : [];

const dialogue: Record<string, DialogueTree> = {
  hall_josiah: {
    start: () => 'hello',
    nodes: {
      hello: {
        text: 'The Merchants\' Hall. Contracts, cargoes, and the Exchange book, the same book Morwenna keeps on the quay. Buying or selling?',
        options: [
          { text: 'Show me the book.', effect: (g) => g.openExchange() },
          { text: 'What is this place?', next: 'about' },
          { text: 'Good day.' },
        ],
      },
      about: {
        text: 'The merchants built it after the Charter put a counting house on every quay in the Counties but ours. Every cargo that comes in by the west gate is written down here twice, once for the Charter and once for us. The Charter\'s copy is usually shorter.',
        options: [{ text: 'Show me the book.', effect: (g) => g.openExchange() }, { text: 'Good day.' }],
      },
    },
  },
  hall_harriet: {
    start: () => 'hello',
    nodes: {
      hello: {
        text: 'Harriet Combe, factor. Hides, pelts, silk if you\'ve got it. I pay better than the stalls, and worse than I\'d like to.',
        options: [
          { text: 'What are you buying?', effect: (g) => g.openShop('hall_harriet') },
          { text: 'Where does it all go?', next: 'about' },
          { text: 'Good day.' },
        ],
      },
      about: {
        text: 'Out on the Rose to Callis, mostly. They weave it, dye it, and send it back to Ansbury as cloth at four times what I paid. I\'ve been asking the Hall for a weaving shed for eleven years. They\'re still discussing it.',
        options: [{ text: 'What are you buying?', effect: (g) => g.openShop('hall_harriet') }, { text: 'Good day.' }],
      },
    },
  },
  hall_thomas: {
    start: () => 'hello',
    nodes: {
      hello: {
        text: 'Thomas Varcoe. I find berths for cargo and cargo for berths. If you\'ve something to ship, I\'m not cheap, and I\'m not slow.',
        options: [
          { text: 'Whose ships are in?', next: 'ships' },
          { text: 'How do I get across the water?', next: 'water' },
          { text: 'Good day.' },
        ],
      },
      ships: {
        text: 'The carrack at the north jetty is the Lantern Rose, Callis-built, waiting on Corlett\'s wine. The galleon at anchor is the Charter\'s. She doesn\'t pay harbour dues, which is why she anchors. The hull on the slip is for a house in Saltpenny, if they ever send the rest of the money.',
        options: [{ text: 'How do I get across the water?', next: 'water' }, { text: 'Good day.' }],
      },
      water: {
        text: 'The ferry runs to the Mewstones from the south jetty. For the far side of the sea, the packet. And if you only want to get wet in your own time, Dan Ruddle hires out rowing boats on the shore below the quay.',
        options: [{ text: 'Whose ships are in?', next: 'ships' }, { text: 'Good day.' }],
      },
    },
  },
};

// Harriet buys what the wilds give up (pelts and hides, silk, wings and skins) at most of its worth, and
// sells the Post's packs, which she gets from the Post at a price she won't tell you
const RAW = /_(hide|pelt|skin)$|^spider_silk$|^bat_wing$/;
const shops: Record<string, ShopDef> = {
  hall_harriet: {
    id: 'hall_harriet', name: 'Harriet Combe, factor', owner: 'hall_harriet',
    stock: [{ item: 'pack_satchel', price: 40 }, { item: 'pack_carrier', price: 220 }],
    buyRate: (_g, item) => (RAW.test(item) ? 0.8 : 0.45),
    footer: () => 'Harriet pays most of the worth of hides, pelts, skins and silk, and under half for the rest',
  } as ShopDef,
};

export const MERCHANTS_HALL_CONTENT: RegionContent = { id: 'merchantsHall', npcs, dialogue, shops };
