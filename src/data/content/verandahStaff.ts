import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Who keeps Verandah's houses of drink and the rest (owner 2026-11-06: "taverns need bartenders, the steampunk
// themed restaurant needs people, the winery needs people"). The Broken Sword, the Screaming Mermaid and the
// Boatman's Tail, each with its keeper behind the bar; Verandah Winery, its vintner and her cellarman; and the
// Dolphyn, a cafe of brass and glass by the canal, its owner and her waiter. They stand where the owner built
// their bars (the places found walkable inside each, scripts: .walker/walkable.cjs).

const drink = (id: string, name: string, value: number, heal: number, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'common', stack: true, value, icon: { shape: 'bottle', a }, heal, desc, stats: `Restores ${heal} health.` });
const bite = (id: string, name: string, value: number, heal: number, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'common', stack: true, value, icon: { shape: 'bread', a }, heal, desc, stats: `Restores ${heal} health.` });

const items: ItemDef[] = [
  drink('ver_ale', 'Harbour ale', 3, 22, '#a8743a', 'Brown, bitter and cold from the cellar under the quay. Every bar on the island pours it and every one says theirs is better.'),
  drink('ver_red', 'Verandah red', 12, 36, '#6a1a2a', 'From the vines across the road from the winery. Dark, and a little rough, and better than it has any right to be this far from anywhere.'),
  drink('ver_white', 'Verandah white', 10, 32, '#d8c870', 'Pale and dry, cold from the cellar. It goes with fish, which on Verandah is everything.'),
  drink('ver_coffee', 'Dolphyn coffee', 6, 26, '#3a2418', 'Black, out of a copper machine that hisses like a kettle with a grudge. It wakes the dead, Ada says. She has not tested this.'),
  bite('ver_cake', 'Brass-tin cake', 8, 40, '#c8904a', 'Honey and almond, baked in the Dolphyn’s fluted brass tins so every slice has a pattern on it.'),
  bite('ver_chowder', 'Mermaid chowder', 10, 56, '#e8d8b8', 'Fish and cream and potato in a bowl as big as your head. The Screaming Mermaid’s, since before it had a name.'),
];

interface Keeper { id: string; name: string; title: string; at: [number, number, number]; face: [number, number]; look: NpcDef['look']; barks: string[]; hello: string; about: [string, string]; stock: { item: string; price: number }[]; shop: string }

const KEEPERS: Keeper[] = [
  { id: 'ver_tam', name: 'Tam Rowe', title: 'The Broken Sword', at: [-2931.5, 22, 1991.5], face: [-2931.5, 1988.5],
    look: { skin: '#c88a62', hair: '#2a1e14', hairStyle: 3, facial: 4, eyes: '#3a2a1e', tunic: '#4a2e22', trim: '#8a6a3a', shirt: '#d8ccb0', trousers: '#2a2620', boots: '#1e1a16', apron: true, build: 1.2 },
    barks: ['Sword’s on the wall. It stays on the wall.', 'Ale’s cold. Don’t ask about the stew.'],
    hello: 'The Broken Sword. Ale, a seat, and nobody asks where you’ve been. What’ll it be?',
    about: ['Why is it broken?', 'Man came in twenty years back, said he’d killed a sea serpent with it. Snapped it on the bar to prove a point. Nobody remembers the point. The sword stayed.'],
    stock: [{ item: 'ver_ale', price: 4 }, { item: 'ver_red', price: 16 }], shop: 'The Broken Sword' },
  { id: 'ver_nell', name: 'Nell Trevail', title: 'The Screaming Mermaid', at: [-2833.5, 17, 1942.5], face: [-2833.5, 1939.5],
    look: { frame: 'f', skin: '#e8c0a0', hair: '#8a3a1e', hairStyle: 5, eyes: '#3a6a7a', tunic: '#2a4a5a', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#2a1e14', apron: true, lashes: true },
    barks: ['Chowder’s on!', 'Rooms upstairs, if you can sleep through the gulls.'],
    hello: 'The Screaming Mermaid. Chowder, ale, and a fire for anyone coming off the boats. Sit where you like. Not that one, that’s the cat’s.',
    about: ['Why is she screaming?', 'The sign-painter fell off his ladder halfway through her face. We kept it. Sailors like a mermaid who looks like she’s seen the bill.'],
    stock: [{ item: 'ver_ale', price: 4 }, { item: 'ver_chowder', price: 14 }, { item: 'ver_white', price: 14 }], shop: 'The Screaming Mermaid' },
  { id: 'ver_wat', name: 'Wat Polglaze', title: 'The Boatman’s Tail', at: [-2934.5, 24, 1944.5], face: [-2931.5, 1944.5],
    look: { skin: '#d8a07a', hair: '#cfcac0', hairStyle: 0, facial: 2, eyes: '#4a5a6a', tunic: '#3a3a4a', trim: '#8a8a7a', trousers: '#2a2a2a', boots: '#1e1a16', hat: 'cap', hatColor: '#2a2a3a', age: 0.75 },
    barks: ['Every boat in the harbour’s been through that door.', 'Tail, not tale. People get it wrong.'],
    hello: 'The Boatman’s Tail. Boatmen drink here, and their stories get longer the later it gets. You want ale or you want a story?',
    about: ['Tail, not tale?', 'Old Kit Polglaze rowed the ferry fifty years and his pigtail touched the water every stroke. My grandfather. The pigtail’s over the bar. Don’t touch it.'],
    stock: [{ item: 'ver_ale', price: 3 }, { item: 'ver_red', price: 15 }], shop: 'The Boatman’s Tail' },
  { id: 'ver_clemency', name: 'Clemency Hart', title: 'Vintner, Verandah Winery', at: [-2915.5, 21, 1997.5], face: [-2915.5, 2000.5],
    look: { frame: 'f', skin: '#d8b090', hair: '#4a2a1e', hairStyle: 1, eyes: '#4a5a3a', tunic: '#5a1a2a', trim: '#c8a060', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#2a1e14', lashes: true, age: 0.5 },
    barks: ['Red from the vines across the road. White from the old slope.', 'Taste first. Then buy.'],
    hello: 'Verandah Winery. The red comes off the vines you passed on the way in. The white off the old slope behind the town. Taste, then decide.',
    about: ['How long has the island made wine?', 'Since a ship carrying cuttings ran aground on the sandbar a hundred years back. The crew planted them to pass the winter. The ship never left. The vines did well.'],
    stock: [{ item: 'ver_white', price: 12 }, { item: 'ver_red', price: 14 }], shop: 'Verandah Winery' },
  { id: 'ver_josh', name: 'Josh Teague', title: 'Cellarman', at: [-2912.5, 21, 1996.5], face: [-2915.5, 1996.5],
    look: { skin: '#c88a62', hair: '#6a4a2a', hairStyle: 2, eyes: '#3a2a1e', tunic: '#4a3a2a', trim: '#6a5a3a', trousers: '#3a3430', boots: '#2a1e14', apron: true, age: 0.3 },
    barks: ['Mind the casks.', 'She’ll want those barrels turned by noon.'],
    hello: 'I just roll the casks. Talk to Clemency if you want to buy. If you want to know which barrel is the good one, ask me quietly.',
    about: ['Which barrel is the good one?', 'Third from the end, bottom row. She keeps it for the king’s table. I didn’t tell you.'],
    stock: [], shop: '' },
  { id: 'ver_ada', name: 'Ada Blackwell', title: 'The Dolphyn', at: [-2998.5, 22, 2051.5], face: [-2995.5, 2051.5],
    look: { frame: 'f', skin: '#e8c4a4', hair: '#1e1612', hairStyle: 5, eyes: '#3a3a4a', tunic: '#3a2a2a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'beret', hatColor: '#5a2a1e', lashes: true },
    barks: ['Mind the machine, it bites.', 'Coffee? Cake? Both is the right answer.'],
    hello: 'The Dolphyn. Coffee from the machine, cake from the brass tins, and the best window on the canal. Sit, and I’ll send Pip over.',
    about: ['What is that machine?', 'The engineers built it from a boiler they had left over. It makes coffee, steam, and a noise like a goose in a barrel. Some days it makes all three at once.'],
    stock: [{ item: 'ver_coffee', price: 8 }, { item: 'ver_cake', price: 10 }], shop: 'The Dolphyn' },
  { id: 'ver_pip', name: 'Pip Lanyon', title: 'Waiter, the Dolphyn', at: [-3006.5, 21, 2056.5], face: [-3003.5, 2056.5],
    look: { skin: '#d8a888', hair: '#c88a3a', hairStyle: 2, eyes: '#4a6a7a', tunic: '#2a2a2e', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#1e1a18', boots: '#1e1a16', age: 0.2 },
    barks: ['Two coffees, one cake, coming!', 'Table by the window’s free.'],
    hello: 'Ada takes the orders. I just carry them. Very fast. Mostly without dropping anything.',
    about: ['Do you like working here?', 'The cake’s free at closing and the machine only exploded once. Best job on the island.'],
    stock: [], shop: '' },
];

const npcs: NpcDef[] = KEEPERS.map((k) => ({ id: k.id, name: k.name, title: k.title, look: k.look, schedule: [{ from: 0, to: 24, at: [k.at[0], k.at[2]], face: k.face, anim: 'idle', y: k.at[1] }], barks: k.barks }));

const dialogue: Record<string, DialogueTree> = Object.fromEntries(KEEPERS.map((k) => [k.id, {
  start: () => 'hello',
  nodes: {
    hello: {
      text: k.hello,
      options: [
        ...(k.stock.length ? [{ text: 'What have you got?', effect: (g: import('../../game/api').GameApi) => g.openShop(k.id) }] : []),
        { text: k.about[0], next: 'about' },
        { text: 'Good day.' },
      ],
    },
    about: { text: k.about[1], next: 'hello' },
  },
} as DialogueTree]));

const shops: Record<string, ShopDef> = Object.fromEntries(KEEPERS.filter((k) => k.stock.length).map((k) => [k.id, { id: k.id, name: k.shop, owner: k.id, stock: k.stock, buyRate: () => 0.3, footer: () => 'Verandah prices.' } as ShopDef]));

export const VERANDAH_STAFF: RegionContent = { id: 'verandahStaff', items, npcs, dialogue, shops };
