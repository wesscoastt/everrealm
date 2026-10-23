import type { DialogueTree } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { lodgeAt, lodgeBase, LODGINGS } from '../lodgings';
import { rumourFor } from './taverns';

// The inns out on the roads (data/lodgings.ts, inn: true; world/sites.ts builds them): a keeper
// behind the bar who sells what the country round grows, lets the rooms upstairs, and passes on
// the talk from the road. The rooms are rented at their doors, like a lodging house's.

interface Keeper { inn: string; id: string; name: string; look: Partial<Appearance>; barks: string[]; hello: string; about: string; menu: { item: string; price: number }[] }

const KEEPERS: Keeper[] = [
  {
    inn: 'inn-packhorse', id: 'inn_tamsyn', name: 'Tamsyn Lugg',
    look: { frame: 'f', skin: '#d8a882', hair: '#4a2a18', hairStyle: 4, tunic: '#5a4a2a', trim: '#c8a050', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.1, age: 0.5 },
    barks: ['Wipe your boots.', 'Stew\'s on.'],
    hello: 'The Packhorse. Carriers stop here on the way into the wood and again on the way out, if they come out.',
    about: 'My mother kept it, and her father. The sign\'s older than any of us. Nobody\'s painted the horse since he lost an ear.',
    menu: [{ item: 'small_beer', price: 1 }, { item: 'brown_ale', price: 3 }, { item: 'bread_cheese', price: 4 }, { item: 'tavern_stew', price: 7 }],
  },
  {
    inn: 'inn-halfway', id: 'inn_osric', name: 'Osric Penhale',
    look: { skin: '#e2b894', hair: '#8a8a8a', hairStyle: 0, facial: 3, tunic: '#3a4a5a', trim: '#c8b070', trousers: '#2a2a30', boots: '#1e1a16', apron: true, build: 1.05, age: 0.7 },
    barks: ['Half way to anywhere.', 'Mind the draught.'],
    hello: 'The Half Way House. Half way to Cragsby, half way back. Whichever way you\'re going, you\'re here now.',
    about: 'Thirty-one years. I came up the north road to work the egg cliffs and stopped for a drink.',
    menu: [{ item: 'small_beer', price: 1 }, { item: 'brown_ale', price: 3 }, { item: 'gull_eggs', price: 4 }, { item: 'tavern_stew', price: 7 }],
  },
  {
    inn: 'inn-dykeend', id: 'inn_judith', name: 'Judith Fenner',
    look: { frame: 'f', skin: '#c89070', hair: '#2a1a12', hairStyle: 2, tunic: '#3a4a3a', trim: '#8a9a6a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, freckles: true, age: 0.4 },
    barks: ['Eel pie or nothing.', 'Close the door, the damp gets in.'],
    hello: 'The Dyke End. The road stops being a road about here and starts being a bank. Sit down before you sink.',
    about: 'Sim Fenner at Holme Staithe is my uncle. He sends the porter and the pies over on the cart, and I send back the empties and the gossip.',
    menu: [{ item: 'small_beer', price: 1 }, { item: 'levels_porter', price: 3 }, { item: 'eel_pie', price: 8 }, { item: 'bread_cheese', price: 4 }],
  },
  {
    inn: 'inn-bield', id: 'inn_hob', name: 'Robert Trewin',
    look: { skin: '#c88a62', hair: '#5a3a26', hairStyle: 3, facial: 5, tunic: '#5a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a4a3a', build: 1.2, age: 0.55 },
    barks: ['Come in out of the wind.', 'Peat\'s dry.'],
    hello: 'The Bield. It means shelter, up here. There\'s not another roof on this road till Scarrow Tor.',
    about: 'Built of moor stone by drovers, for drovers. I keep the fire in all year. On the moor you need it in August.',
    menu: [{ item: 'small_beer', price: 1 }, { item: 'brown_ale', price: 3 }, { item: 'mutton_pie', price: 8 }, { item: 'mulled_wine', price: 6 }],
  },
];

const NPCS_I: NpcDef[] = [];
const DIALOGUE_I: Record<string, DialogueTree> = {};
const SHOPS_I: Record<string, ShopDef> = {};
const BASE_LOOK = { eyes: '#3a2a1a', hairStyle: 1 };

KEEPERS.forEach((k, i) => {
  const L = LODGINGS.find((l) => l.id === k.inn);
  if (!L) return;
  // Behind the bar (world/sites.ts tavernRoom: the bar runs u -7 to -3 at v -5), facing the room
  const [bx, bz] = lodgeAt(L, -5, -6), [fx, fz] = lodgeAt(L, -5, 0);
  NPCS_I.push({ id: k.id, name: k.name, title: L.name, look: { ...BASE_LOOK, ...k.look } as Appearance, schedule: [{ from: 0, to: 24, at: [bx + 0.5, bz + 0.5], face: [fx + 0.5, fz + 0.5], anim: 'idle', y: lodgeBase(L) }], barks: k.barks });
  SHOPS_I['inn_' + k.id] = { id: 'inn_' + k.id, name: L.name, owner: k.id, who: k.name.split(' ')[0], stock: k.menu, buyRate: () => 0.25, footer: () => `${k.name.split(' ')[0]} buys at a quarter of an item's worth.` };
  DIALOGUE_I[k.id] = {
    start: () => 'hello',
    nodes: {
      hello: {
        text: k.hello,
        options: [
          { text: 'What have you got?', effect: (g) => g.openShop('inn_' + k.id) },
          { text: 'Have you a room?', next: 'room' },
          { text: 'Heard anything?', next: 'talk' },
          { text: 'How long have you kept this place?', next: 'about' },
          { text: 'Bye.' },
        ],
      },
      room: { text: `Five, up the stair, ${L.rent} marks a week. Pay at the door of the one you want. While it's paid it's yours: furnish it, sleep in it.`, next: 'hello' },
      talk: { text: (g) => rumourFor(g, 11 + i), next: 'hello' },
      about: { text: k.about, next: 'hello' },
    },
  };
});

export const INN_CONTENT: RegionContent = { id: 'inns', npcs: NPCS_I, dialogue: DIALOGUE_I, shops: SHOPS_I };
