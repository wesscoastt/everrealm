import type { DialogueTree, GameApi } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import { countiesOnly } from '../../world/land';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { addOption } from './kit';
import { chimneyCell, fitOut } from '../../world/interiors';
import { hash2 } from '../../world/noise';
import { DAY_MINUTES, realmNow } from '../../world/clock';

// Taverns: the inns in the towns, kept and drunk in. Each has a keeper behind the bar who sells
// drink and food and knows the day's talk, regulars at the tables, and a corner where a musician
// can earn their supper (game/Stage.ts counts each tavern as a performance spot).
//
// The buildings are the towns' inns (world/sites.ts); where the bar and the benches stand comes
// from the same fitting-out the buildings use (world/interiors.ts), so the keeper is always behind
// the bar and the regulars always on a bench.

interface House { x0: number; z0: number; w: number; d: number; floors: number; door: 'n' | 's' | 'e' | 'w'; chimney: boolean }
interface Regular { id: string; name: string; title: string; look: Partial<Appearance>; barks: string[]; lines: string[] }
interface Tavern {
  id: string;
  name: string;
  town: string;
  house: House;
  keeper: { id: string; name: string; look: Partial<Appearance>; barks: string[]; hello: string; about: string };
  regulars: Regular[];
  menu: { item: string; price: number }[];
}

// Outer towns' inns are laid out from the town's middle (world/sites.ts buildOuterTown); these are those middles.
const OUTER = { cragsby: [250, -1000], holme: [-890, 1010], scarrow: [340, 2966] } as const;
const outerInn = (k: keyof typeof OUTER): House => ({ x0: OUTER[k][0] - 19, z0: OUTER[k][1] - 17, w: 12, d: 8, floors: 2, door: 's', chimney: true });

const TAVERNS: Tavern[] = [
  {
    id: 'charterarms', name: 'The Charter Arms', town: 'Ansbury',
    house: { x0: 785, z0: 286, w: 13, d: 9, floors: hash2(785, 286, 13) < 0.45 ? 2 : 1, door: 's', chimney: true },
    keeper: {
      id: 'nan', name: 'Nan Pargeter', look: { frame: 'f', skin: '#e2b894', hair: '#7a3a1e', hairStyle: 2, eyes: '#3a4a2a', tunic: '#5a2a2a', trim: '#e0bd64', trousers: '#2a2226', boots: '#1e1a16', apron: true, lashes: true, build: 1.05, age: 0.5 },
      barks: ['Tab or coin?', 'Mind the step.'],
      hello: 'The Charter Arms. The clerks drink here on quarter-day and pay on the next one. I keep a book, and everybody\'s in it.',
      about: 'Forty years on the keep square. I\'ve served three Speakers, two of them sober. The third\'s still in the book.',
    },
    regulars: [
      { id: 'clement', name: 'Clement Fry', title: 'Clerk, the Toll Office', look: { skin: '#e8c4a0', hair: '#5a4a3a', hairStyle: 1, tunic: '#3a3a42', trim: '#8a8a92', trousers: '#2a2a30', boots: '#1a1614', build: 0.9, age: 0.4 }, barks: ['Columns. All day, columns.'], lines: ['Every toll on the Turnpike goes through my ledger before it goes anywhere else. I\'ve never once seen where it goes after.', 'Don\'t tell Mr Pike I said that. Or do. He knows.'] },
      { id: 'joanpet', name: 'Margery Pettifer', title: 'Glover', look: { frame: 'f', skin: '#c89070', hair: '#2a1a12', hairStyle: 4, tunic: '#4a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', gloves: '#8a5a3a', lashes: true, age: 0.55 }, barks: ['Kid leather. Feel that.'], lines: ['The Collegium buys my gloves for handling crystal. Thick ones. They say it\'s warm, and it is, and they don\'t like to say why.'] },
    ],
    menu: [{ item: 'brown_ale', price: 3 }, { item: 'mulled_wine', price: 6 }, { item: 'bread_cheese', price: 4 }, { item: 'tavern_stew', price: 7 }],
  },
  {
    id: 'longstretch', name: 'The Long Stretch', town: 'the Waystation',
    house: { x0: 700, z0: 560, w: 12, d: 9, floors: 2, door: 's', chimney: true },
    keeper: {
      id: 'ivo', name: 'Ivo Rendle', look: { skin: '#c8956a', hair: '#9a948c', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#2a4a86', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', build: 1.1, age: 0.6, scar: true },
      barks: ['Road\'s quiet.', 'Sit. You\'ve walked far enough.'],
      hello: 'The Long Stretch. I rode this road twelve years for the Charter. Now I wait for it to come to me, and it does.',
      about: 'They laid off the toll riders and kept the tolls. I put my severance into this roof. It\'s the only thing the Charter ever paid me for that kept the rain off.',
    },
    regulars: [
      { id: 'abel', name: 'Josiah Yeo', title: 'Carter', look: { skin: '#d8a882', hair: '#3a2418', hairStyle: 3, beard: true, tunic: '#6a4a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#4a3a2a', build: 1.15, age: 0.45 }, barks: ['Three sacks, three tolls.'], lines: ['The wolves go for the last cart. Always the last. I make sure I\'m second from last, and I sleep fine.'] },
      { id: 'ruthv', name: 'Hester Vowles', title: 'Drover', look: { frame: 'f', skin: '#c89070', hair: '#c8a060', hairStyle: 1, tunic: '#5a6a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', freckles: true, lashes: true, age: 0.35 }, barks: ['Two hundred head to Ansbury.'], lines: ['Drove two hundred sheep up the Turnpike and paid the toll by the head. The Weighhouse wanted to weigh them as well. I said they\'re sheep, not sacks. They weighed them.'] },
    ],
    menu: [{ item: 'small_beer', price: 1 }, { item: 'brown_ale', price: 3 }, { item: 'bread_cheese', price: 4 }, { item: 'tavern_stew', price: 6 }],
  },
  {
    id: 'canteen', name: 'The Company Canteen', town: 'Harrowgate Works',
    house: { x0: 918, z0: 992, w: 11, d: 15, floors: 1, door: 'e', chimney: true },
    keeper: {
      id: 'doll', name: 'Doll Hobday', look: { frame: 'f', skin: '#d8a882', hair: '#4a2a18', hairStyle: 2, tunic: '#4a4a52', trim: '#c86a2a', trousers: '#2a2a30', boots: '#1a1614', apron: true, lashes: true, build: 1.2, age: 0.55 },
      barks: ['Eat.', 'Next shift\'s at the bell.'],
      hello: 'Eat. The Company docks you for fainting. Stew\'s posted at the posted rate, same as everything else here.',
      about: 'I feed three shifts a day and the night lot when they remember. I\'ve fed this Works since before the Daughters had their name on the gate.',
    },
    regulars: [
      { id: 'tamhaig', name: 'Rob Haig', title: 'Smelter man', look: { skin: '#8a5a3a', hair: '#1e1612', hairStyle: 0, beard: true, tunic: '#3a3430', trim: '#c86a2a', trousers: '#2a201c', boots: '#1a1614', apron: true, build: 1.25, age: 0.45, scar: true }, barks: ['Hot work.'], lines: ['Joan Harrowgate runs the smelter like a kirk. You don\'t swear near her furnace and you don\'t lie near her. Her sisters do both.'] },
      { id: 'adacleave', name: 'Ada Cleave', title: 'Rail gang', look: { frame: 'f', skin: '#e2b894', hair: '#6a4a2a', hairStyle: 3, tunic: '#5a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', gloves: '#3a2a1a', lashes: true, build: 1.1, age: 0.3 }, barks: ['Rail\'s down in the cut again.'], lines: ['Redbacks nest on old iron. The Company leaves the old rail where it lies because shifting it costs a day. So we have redbacks. That\'s the sum.'] },
    ],
    menu: [{ item: 'small_beer', price: 1 }, { item: 'tavern_stew', price: 5 }, { item: 'bread_cheese', price: 3 }],
  },
  {
    id: 'coiledrope', name: 'The Coiled Rope', town: 'Cragsby',
    house: outerInn('cragsby'),
    keeper: {
      id: 'morwen', name: 'Morwen Tregear', look: { frame: 'f', skin: '#d8b090', hair: '#2a2a2a', hairStyle: 2, tunic: '#3a5a7a', trim: '#e8dcc0', trousers: '#2a3036', boots: '#1e1a16', apron: true, lashes: true, age: 0.6 },
      barks: ['Rope on the peg.', 'Wind\'s getting up.'],
      hello: 'The Coiled Rope. Hang your rope on the peg, not on the chair. A rope on a chair means somebody\'s going over.',
      about: 'Every climmer in Cragsby has drunk here, and every climmer who went over has a hook on that wall. I keep them dusted.',
    },
    regulars: [
      { id: 'watkemp', name: 'Wat Kemp', title: 'Climmer', look: { skin: '#c8956a', hair: '#c8a060', hairStyle: 3, tunic: '#5a4a3a', trim: '#e8dcc0', trousers: '#3a3430', boots: '#2a1e14', freckles: true, age: 0.35 }, barks: ['Only the one.'], lines: ['Somebody wrote "never go over drunk, Wat" on the knot board at the hut. I\'d like to know who. I\'d like to buy them a drink.'] },
      { id: 'jennyt', name: 'Loveday Tonkin', title: 'Egg-gatherer', look: { frame: 'f', skin: '#e2b894', hair: '#7a3a1e', hairStyle: 4, tunic: '#6a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', lashes: true, age: 0.4 }, barks: ['Gannets bite.'], lines: ['A gannet sitting tight will have your eye out. I\'ve still got both. That\'s skill, not luck, whatever Wat tells you.'] },
    ],
    menu: [{ item: 'brown_ale', price: 4 }, { item: 'gull_eggs', price: 4 }, { item: 'tavern_stew', price: 7 }],
  },
  {
    id: 'eelpunt', name: 'The Eel and Punt', town: 'Holme Staithe',
    house: outerInn('holme'),
    keeper: {
      id: 'simfen', name: 'Sim Fenner', look: { skin: '#b07a52', hair: '#3a2418', hairStyle: 1, beard: true, eyes: '#4a5a3a', tunic: '#3a4a2e', trim: '#8a7a4a', trousers: '#2a2014', boots: '#1e1a16', apron: true, build: 1.0, age: 0.55 },
      barks: ['Eel pie.', 'Mind your feet, it\'s wet.'],
      hello: 'The Eel and Punt. Eel pie\'s eel. Don\'t ask what else is in it, there isn\'t anything else.',
      about: 'My father smoked eels in the back, and his father. The smoke\'s in the walls. You\'ll smell of it till Lady Day.',
    },
    regulars: [
      { id: 'rafe', name: 'Obed Gedge', title: 'Puntsman', look: { skin: '#c89070', hair: '#cfcac0', hairStyle: 0, beard: true, tunic: '#4a5a3a', trim: '#8a7a4a', trousers: '#2a2014', boots: '#1e1a16', hat: 'cap', hatColor: '#3a3a2a', build: 0.95, age: 0.85 }, barks: ['Slack water at six.'], lines: ['The big ones in the deep drains aren\'t eels. I\'ve said it sober, which is rarer than it sounds.'] },
      { id: 'tilly', name: 'Tilly Brewer', title: 'Reed cutter', look: { frame: 'f', skin: '#d8a882', hair: '#8a6a4a', hairStyle: 2, tunic: '#5a6a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', freckles: true, lashes: true, age: 0.3 }, barks: ['Reeds don\'t cut themselves.'], lines: ['The Levels are going wetter every year. The old drains silt up and nobody\'s paid to dig them out. The Charter says it\'s a county matter. The county says it\'s a Charter road.'] },
    ],
    menu: [{ item: 'levels_porter', price: 3 }, { item: 'eel_pie', price: 8 }, { item: 'bread_cheese', price: 4 }],
  },
  {
    id: 'peatfire', name: 'The Peat Fire', town: 'Scarrow Tor',
    house: outerInn('scarrow'),
    keeper: {
      id: 'kerensa', name: 'Kerensa Garth', look: { frame: 'f', skin: '#e8c4a0', hair: '#9a948c', hairStyle: 2, eyes: '#4a5a6a', tunic: '#5a3a3a', trim: '#c8b070', trousers: '#2a2226', boots: '#1e1a16', cape: '#3a3a42', apron: true, lashes: true, age: 0.8 },
      barks: ['Close the door. The moor gets in.', 'Fire\'s lit.'],
      hello: 'The Peat Fire. It hasn\'t gone out since my grandmother\'s grandmother lit it. Don\'t put anything on it you want back.',
      about: 'The moor\'s a long walk from anywhere. People come in off it wanting a fire and a story. The fire\'s free. The stories cost a drink.',
    },
    regulars: [
      { id: 'josstre', name: 'Joss Trewin', title: 'Shepherd', look: { skin: '#c8956a', hair: '#5a3a22', hairStyle: 3, beard: true, tunic: '#5a5040', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a4a3a', build: 1.05, age: 0.6 }, barks: ['Moor\'s quiet tonight.'], lines: ['The bell at Carne Cross rang on Tuesday. There\'s no roof on that chapel and no parish under it. I didn\'t go and look who was on the rope. You wouldn\'t either.'] },
      { id: 'marypol', name: 'Win Polwhele', title: 'Peat cutter', look: { frame: 'f', skin: '#d8a882', hair: '#2a1a12', hairStyle: 1, tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', lashes: true, build: 1.05, age: 0.5 }, barks: ['Cut it wet, burn it dry.'], lines: ['The frost cracked Carne Barrow open last winter. Something dens in it now. The dogs won\'t go past it, and they\'re braver than I am.'] },
    ],
    menu: [{ item: 'brown_ale', price: 3 }, { item: 'mulled_wine', price: 6 }, { item: 'mutton_pie', price: 8 }],
  },
];

// ---------------------------------------------------------------- Where the keeper stands and the regulars sit

/** The bar's keeper spot and the benches, from the same fitting-out the building uses. */
function layout(h: House): { keeper: [number, number, number, number]; seats: { x: number; z: number; face: [number, number] }[]; middle: [number, number] } | null {
  const { x0, z0, w, d, door } = h;
  const doorX = door === 'n' || door === 's' ? x0 + Math.floor(w / 2) : door === 'e' ? x0 + w - 1 : x0;
  const doorZ = door === 'e' || door === 'w' ? z0 + Math.floor(d / 2) : door === 's' ? z0 + d - 1 : z0;
  const fit = fitOut({ x0, z0, w, d, floors: h.floors, base: 0, door, doorX, doorZ, role: 'inn', tint: Math.floor(hash2(x0, z0, 5) * 3), chimney: h.chimney ? chimneyCell({ x0, z0, w, d, door }) : undefined });
  const ground = fit.furn.filter((f) => f.y < 1);
  const counter = ground.find((f) => f.item === 'counter');
  if (!counter) return null;
  // Behind the bar: a step back from the counter, away from the door, facing it
  const fx = Math.sin(counter.ry), fz = Math.cos(counter.ry);
  const keeper: [number, number, number, number] = [counter.x - fx * 1.0, counter.z - fz * 1.0, counter.x + fx * 2, counter.z + fz * 2];
  const seats = ground.filter((f) => f.item === 'bench').map((b) => ({ x: b.x, z: b.z, face: [b.x + Math.sin(b.ry) * 2, b.z + Math.cos(b.ry) * 2] as [number, number] }));
  return { keeper, seats, middle: [x0 + w / 2, z0 + d / 2] };
}

// ---------------------------------------------------------------- Talk

/** The day's talk: true things, about the counties, that change with the realm's day. */
const RUMOURS: ((g: GameApi) => string)[] = [
  () => 'A shepherd off Tolmen Moor says the bell at Carne Cross rang last week with nobody at the rope. I\'d not go and look either.',
  () => 'A feller swears there\'s a chest in the bracken past the Ketley arches. He saw the lock shine and had no pick on him. Lockpicks are three marks at any general store.',
  () => 'The Waits are short of a wage, they say. If you can play, the Green pays better than the Charter does.',
  () => 'Ilse Blewitt counted a big fall past the Kettle. Where stars come down, crystal comes up, and Harrowgate hears about it before the Charter does.',
  () => 'Wynn Carrow\'s measuring arches again. Buy him a drink and he\'ll tell you about rope grooves until you\'re sorry.',
  () => {
    const stops = ['Ansbury\'s south gate', 'the Waystation', 'Gullmouth', 'Kelderby'];
    return `Mercy Haddow the packwoman is at ${stops[Math.floor(realmNow() / (DAY_MINUTES * 60_000)) % 4]} today, if you're after a treasure map nobody else could be bothered to dig.`;
  },
  () => 'There\'s a book on a stand by the old Lantern in Hollindale: the last keeper\'s log. People leave books like that all over the counties, if you look.',
  () => 'Bet Polglase sang "Haul for Holmsey" on the Gullmouth quay last night, and every man on the slip hauled to it without being asked.',
  () => 'Somebody chalked "Light the poor streets first" on the lamplighters\' rules in the Shambles. The Company\'s furious. The lamplighters say they don\'t know who.',
  () => 'Up at Kelderby they say when the Kettle steams on a cold morning, the snow\'s two days off. They\'re mostly right.',
  () => 'The Exchange broker in the Guild Ward says star crystal\'s fetching twice what it did. Somebody\'s buying, and nobody\'s saying who.',
  () => 'There\'s a bone whistle in a barrow on Tolmen Moor that plays five notes and no more, the Waits say. They want it found.',
  () => 'A sergeant called Holroyd has put up a roll at the tilt-yard for anyone who\'ll take a contract. The Company Wardens don\'t like it.',
  () => 'The dogs in this town know everybody. Stop and say hello to one. It\'s the best thing that\'ll happen to you all day.',
];
export const rumourFor = (g: GameApi, k: number) => RUMOURS[(Math.floor(realmNow() / (DAY_MINUTES * 60_000)) + k) % RUMOURS.length](g);

function keeperTree(t: Tavern, k: number): DialogueTree {
  return {
    start: () => 'hello',
    nodes: {
      hello: {
        text: t.keeper.hello,
        options: [
          { text: 'What have you got?', effect: (g) => g.openShop('tavern_' + t.id) },
          { text: 'Heard anything?', next: 'talk' },
          { text: 'How long have you kept this place?', next: 'about' },
          { text: 'Bye.' },
        ],
      },
      talk: { text: (g) => rumourFor(g, k), next: 'hello' },
      about: { text: t.keeper.about, next: 'hello' },
    },
  };
}

function regularTree(r: Regular): DialogueTree {
  const nodes: DialogueTree['nodes'] = {};
  r.lines.forEach((line, i) => { nodes['l' + i] = { text: line, ...(i + 1 < r.lines.length ? { next: 'l' + (i + 1) } : {}) }; });
  return { start: () => 'l0', nodes };
}

// ---------------------------------------------------------------- Food and drink

const food = (id: string, name: string, value: number, heal: number, shape: ItemDef['icon']['shape'], a: string, desc: string): ItemDef => ({
  id, name, kind: 'food', rarity: 'common', stack: true, value, heal, icon: { shape, a }, desc, stats: `Restores ${heal} health.`,
});

const ITEMS_T: ItemDef[] = [
  food('small_beer', 'Small beer', 1, 10, 'bread', '#c8a050', 'Weak enough to drink at breakfast, which is when most people drink it.'),
  food('brown_ale', 'Brown ale', 3, 16, 'bread', '#8a5a2a', 'Nutty, flat and very slightly warm. Exactly as it should be.'),
  food('levels_porter', 'Levels porter', 3, 18, 'bread', '#3a2a1a', 'Black, thick and smoky. Holme Staithe brews it next door to the eel smokehouse, and you can tell.'),
  food('mulled_wine', 'Mulled wine', 6, 24, 'bread', '#8a2a3a', 'Hot, spiced and sweet. Good after a long walk, and better after a cold one.'),
  food('bread_cheese', 'Bread and cheese', 4, 30, 'bread', '#e0c070', 'A heel of bread and a wedge of hard cheese, cut thick.'),
  food('tavern_stew', 'Bowl of stew', 7, 45, 'cooked', '#8a5a3a', 'Whatever went in this morning, and everything that went in yesterday.'),
  food('gull_eggs', 'Pickled gull eggs', 4, 22, 'cooked', '#e8e0c8', 'Cragsby\'s own. An acquired taste, acquired mostly in Cragsby.'),
  food('eel_pie', 'Eel pie', 8, 50, 'cooked', '#a8783a', 'Eel, under pastry. Sim Fenner will tell you there\'s nothing else in it, and he\'s right.'),
  food('mutton_pie', 'Mutton pie', 8, 50, 'cooked', '#b8884a', 'Moor mutton in gravy. It keeps a shepherd going from dawn to the fold.'),
];

// ---------------------------------------------------------------- Built

const NPCS_T: NpcDef[] = [];
const DIALOGUE_T: Record<string, DialogueTree> = {};
const SHOPS_T: Record<string, ShopDef> = {};
/** Each tavern's middle, for the performance spots (game/Stage.ts). */
export const TAVERN_SPOTS: { id: string; name: string; x: number; z: number; r: number }[] = [];
/** Where each tavern's sign hangs (world/sites.ts puts it up). */
export const TAVERN_SIGNS: { x: number; z: number; ry: number; text: string }[] = [];

const BASE_LOOK = { eyes: '#3a2a1a', hairStyle: 1 };
TAVERNS.forEach((t, k) => {
  const L = layout(t.house);
  if (!L) return;
  NPCS_T.push({ id: t.keeper.id, name: t.keeper.name, title: t.name, look: { ...BASE_LOOK, ...t.keeper.look } as Appearance, schedule: [{ from: 0, to: 24, at: [L.keeper[0], L.keeper[1]], face: [L.keeper[2], L.keeper[3]], anim: 'idle' }], barks: t.keeper.barks });
  DIALOGUE_T[t.keeper.id] = keeperTree(t, k);
  SHOPS_T['tavern_' + t.id] = { id: 'tavern_' + t.id, name: t.name, owner: t.keeper.id, who: t.keeper.name.split(' ')[0], stock: t.menu, buyRate: () => 0.25, footer: () => `${t.keeper.name.split(' ')[0]} buys at a quarter of an item's worth, and only because you asked.` };
  // Regulars on the benches, in the evening: the far benches first, so the way in stays clear
  const seats = [...L.seats].sort((a, b) => Math.hypot(b.x - L.middle[0], b.z - L.middle[1]) - Math.hypot(a.x - L.middle[0], a.z - L.middle[1]));
  t.regulars.forEach((r, i) => {
    const s = seats[i];
    if (!s) return;
    NPCS_T.push({ id: r.id, name: r.name, title: r.title, look: { ...BASE_LOOK, ...r.look } as Appearance, schedule: [{ from: 0, to: 24, at: [s.x, s.z], face: s.face, anim: 'seated' }], barks: r.barks });
    DIALOGUE_T[r.id] = regularTree(r);
  });
  TAVERN_SPOTS.push({ id: t.id, name: t.name, x: L.middle[0], z: L.middle[1], r: Math.max(t.house.w, t.house.d) / 2 + 1 });
  const h = t.house;
  const doorX = h.door === 'n' || h.door === 's' ? h.x0 + Math.floor(h.w / 2) : h.door === 'e' ? h.x0 + h.w - 1 : h.x0;
  const doorZ = h.door === 'e' || h.door === 'w' ? h.z0 + Math.floor(h.d / 2) : h.door === 's' ? h.z0 + h.d - 1 : h.z0;
  const out = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[h.door];
  TAVERN_SIGNS.push({ x: doorX + 0.5 + out[0] * 1.6 + out[1] * 2.2, z: doorZ + 0.5 + out[1] * 1.6 - out[0] * 2.2, ry: Math.atan2(out[0], out[1]), text: t.name });
});

export const TAVERN_CONTENT: RegionContent = {
  id: 'taverns',
  items: ITEMS_T,
  npcs: NPCS_T,
  dialogue: DIALOGUE_T,
  shops: {
    ...SHOPS_T,
    tavern_lowwater: { id: 'tavern_lowwater', name: 'The Low Water', owner: 'agnes', who: 'Agnes', stock: [{ item: 'small_beer', price: 1 }, { item: 'hollin_cider', price: 3 }, { item: 'bread_cheese', price: 4 }, { item: 'tavern_stew', price: 6 }], buyRate: () => 0.25, footer: () => 'Agnes buys at a quarter of an item\'s worth.' },
  },
  hooks: (D) => {
    // Agnes at the Low Water serves too, and hears the day's talk
    addOption(D, 'agnes', 'main', { text: 'What have you got?', effect: (g) => g.openShop('tavern_lowwater') });
    addOption(D, 'agnes', 'main', { text: 'Heard anything?', next: 'tvTalk' });
    D.agnes.nodes.tvTalk = { text: (g) => rumourFor(g, 7), next: 'main' };
  },
};
ITEMS_T.push(food('hollin_cider', 'Hollin cider', 3, 18, 'bread', '#d8b040', 'Pressed from the Ashcrofts\' orchard. Sharp, cloudy, and stronger than it tastes.'));

// Placed on the first continent (world/land.ts)
countiesOnly(TAVERN_SIGNS);
countiesOnly(TAVERN_SPOTS);
