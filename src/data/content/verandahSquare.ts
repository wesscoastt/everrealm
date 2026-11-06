import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// The market round the fountain (owner 2026-11-06: "make sure the Verandah market by the fountain is fleshed out
// with merchants"). The owner's fountain square off the main street: five stalls on the grass round its paving,
// each facing the water, a merchant behind each. Their stalls are world/sites.ts 'ver-square'.

type Look = NpcDef['look'];
interface Stall { id: string; name: string; title: string; shop: string; stall: [number, number, number]; ry: number; me: [number, number]; colour: string; look: Look; barks: string[]; hello: string; stock: { item: string; price: number }[]; buys: number; footer: string }

const STALLS: Stall[] = [
  { id: 'sq_chenoweth', name: 'Senara Chenoweth', title: 'Greengrocer', shop: 'Chenoweth’s fruit and veg', stall: [-3135.5, 22, 2095.5], ry: Math.PI / 2, me: [-3137.5, 2095.5], colour: '#4a7a3a',
    look: { frame: 'f', skin: '#e2b894', hair: '#6a3a1e', hairStyle: 1, eyes: '#4a5a3a', tunic: '#4a6a3a', trim: '#e8dcc0', trousers: '#3a3430', boots: '#2a1e14', apron: true, hat: 'straw', lashes: true },
    barks: ['Pears from the farm, still cold from the cellar!', 'Leeks, onions, three for a penny.'],
    hello: 'Senara Chenoweth. Everything on this stall came up the farm road this morning. If it didn’t, I’ll tell you, and I’ll charge you less.',
    stock: [{ item: 'potato', price: 2 }, { item: 'carrot', price: 2 }, { item: 'onion', price: 2 }, { item: 'leek', price: 3 }, { item: 'cabbage', price: 3 }, { item: 'apples', price: 3 }, { item: 'pears', price: 4 }, { item: 'strawberries', price: 5 }],
    buys: 0.5, footer: 'Senara buys good produce at half its worth.' },
  { id: 'sq_curnow', name: 'Bennet Curnow', title: 'Dairyman', shop: 'Curnow’s dairy', stall: [-3135.5, 22, 2103.5], ry: Math.PI / 2, me: [-3137.5, 2103.5], colour: '#d8d0b8',
    look: { skin: '#d8a888', hair: '#c8a060', hairStyle: 0, facial: 2, eyes: '#4a6a7a', tunic: '#e8e0d0', trim: '#4a6a7a', trousers: '#3a3430', boots: '#2a1e14', apron: true, hat: 'cap', hatColor: '#4a6a7a', build: 1.15 },
    barks: ['Milk this morning, cheese last spring!', 'Honey from the farm hives. The bees were cross about it.'],
    hello: 'Bennet Curnow. Milk, eggs, cheese and honey, from three cows, forty hens and more bees than I’d like. What’ll it be?',
    stock: [{ item: 'milk', price: 4 }, { item: 'egg', price: 2 }, { item: 'bread_cheese', price: 4 }, { item: 'honeycomb', price: 16 }, { item: 'bread', price: 3 }],
    buys: 0.5, footer: 'Bennet buys milk and eggs at half their worth.' },
  { id: 'sq_angove', name: 'Ysella Angove', title: 'Dyer', shop: 'Angove’s dyes and rugs', stall: [-3110.5, 22, 2095.5], ry: -Math.PI / 2, me: [-3108.5, 2095.5], colour: '#6a3a7a',
    look: { frame: 'f', skin: '#c88a62', hair: '#1e1a16', hairStyle: 5, eyes: '#3a2a1e', tunic: '#6a3a7a', trim: '#d8b04a', trousers: '#2a2620', boots: '#1e1a16', lashes: true, age: 0.45 },
    barks: ['Blue from the woad, red from the madder. My hands are both.', 'Rugs! Woven in Verandah, walked on everywhere.'],
    hello: 'Ysella Angove. My hands are blue to the wrist and I won’t apologise for it. Dyes for your clothes, rugs for your floor, colours you won’t find in the Counties.',
    stock: [{ item: 'dye_skyblue', price: 15 }, { item: 'dye_hollyred', price: 15 }, { item: 'dye_primrose', price: 15 }, { item: 'dye_russet', price: 15 }, { item: 'dye_wakeviolet', price: 15 }, { item: 'furn_rug_blue', price: 22 }, { item: 'furn_rug_red', price: 22 }, { item: 'furn_rug_green', price: 22 }],
    buys: 0.3, footer: 'Ysella buys at under a third. She makes her own.' },
  { id: 'sq_uren', name: 'Gwithian Uren', title: 'Potter and chandler', shop: 'Uren’s pots and candles', stall: [-3110.5, 22, 2103.5], ry: -Math.PI / 2, me: [-3108.5, 2103.5], colour: '#8a5a3a',
    look: { skin: '#d8a07a', hair: '#9a948c', hairStyle: 0, facial: 3, eyes: '#4a5a6a', tunic: '#7a5a3a', trim: '#3a2a1c', trousers: '#3a3430', boots: '#2a1e14', apron: true, age: 0.7 },
    barks: ['Pots that don’t leak, candles that don’t smoke. Mostly.', 'Mind the jars. You break it, you’ve bought it.'],
    hello: 'Gwithian Uren. I throw the pots in the morning and dip the candles in the afternoon, and in the evening I sit here and sell them to you. Have a look.',
    stock: [{ item: 'furn_crocks', price: 14 }, { item: 'furn_glazedjars', price: 32 }, { item: 'furn_candles', price: 11 }, { item: 'furn_gourds', price: 10 }, { item: 'furn_stool', price: 10 }, { item: 'furn_barrel', price: 14 }],
    buys: 0.4, footer: 'Gwithian buys at two fifths.' },
  { id: 'sq_rescorla', name: 'Davy Rescorla', title: 'Pie seller', shop: 'Rescorla’s pies', stall: [-3123.5, 22, 2111.5], ry: Math.PI, me: [-3123.5, 2113.5], colour: '#a8382c',
    look: { skin: '#e2b894', hair: '#a84a22', hairStyle: 2, eyes: '#3a4a2a', tunic: '#7a3a2a', trim: '#e8dcc0', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', apron: true, hat: 'kerchief', hatColor: '#e8e0d0', age: 0.3 },
    barks: ['Hot pies! Mutton, eel, leek, apple!', 'Cider to wash it down. Mulled, if the wind’s cold.'],
    hello: 'Davy Rescorla, pies. The mutton’s my mother’s, the eel’s my father’s, the apple’s mine and the best of the three. Don’t tell them.',
    stock: [{ item: 'mutton_pie', price: 11 }, { item: 'eel_pie', price: 8 }, { item: 'leek_pie', price: 9 }, { item: 'apple_pie', price: 9 }, { item: 'hollin_cider', price: 4 }, { item: 'mulled_cider', price: 5 }],
    buys: 0, footer: 'Davy sells. He doesn’t buy.' },
];

/** The stalls round the fountain, in their colours (world/sites.ts). */
export const SQUARE_STALLS = STALLS.map((s) => ({ x: s.stall[0], y: s.stall[1], z: s.stall[2], ry: s.ry, color: s.colour }));

const npcs: NpcDef[] = STALLS.map((s) => ({ id: s.id, name: s.name, title: s.title, look: s.look, schedule: [{ from: 7, to: 20, at: s.me, face: [s.stall[0], s.stall[2]], anim: 'idle' as const, ...(s.id === 'sq_curnow' ? {} : { y: s.stall[1] }) }], barks: s.barks }));

const talk = (s: Stall): DialogueTree => ({ start: () => 'hello', nodes: { hello: { text: s.hello, options: [{ text: 'Let’s see what you have.', effect: (g: GameApi) => g.openShop(s.id) }, { text: 'Good day.' }] } } });

const shops: Record<string, ShopDef> = Object.fromEntries(STALLS.map((s) => [s.id, { id: s.id, name: s.shop, owner: s.id, stock: s.stock, buyRate: () => s.buys, footer: () => s.footer } as ShopDef]));

export const VERANDAH_SQUARE: RegionContent = { id: 'verandahSquare', npcs, dialogue: Object.fromEntries(STALLS.map((s) => [s.id, talk(s)])), shops };
