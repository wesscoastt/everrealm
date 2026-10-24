import type { DialogueTree, DNode, DOption, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import { HULLS, HULL_IDS, LANES, type HullId } from '../naval';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { addOption, at, type Marks } from './kit';
import type { RegionContent } from './types';

// The yards (data/naval.ts, game/Sailing.ts): Hal Treloar on Gullmouth's quay, Kester Bligh at the
// Careen in the Teeth, and Pau Ferrer for the Assembly's yard at Callis. Any of them will hire you a ship
// by the hour, lay one down for you if you bring the timber, cable, sailcloth, fittings and tar, bring
// yours round to the berth, raise her if she's sunk, and paint and name her.
//
// navalFirst, FIRST COMMAND (Hal Treloar): take a ship out into the lanes east of the Mewstones and
// sink a Brethren raider, then come back and tell Hal how she handled. 'sail' -> 'hal' -> done.

const FIRST = 'navalFirst';
/** Hal on the low quay by Gullmouth's berth, facing the water. */
const HAL: [number, number] = [1788.5, 606.5];

type Owned = { hull: HullId; livery: { name: string }; sunk?: boolean };
const ships = (g: GameApi): Owned[] => { const v = g.flag('ships'); return Array.isArray(v) ? v as Owned[] : []; };
const cost = (id: HullId) => Object.entries(HULLS[id].build.items).map(([it, n]) => `${n} ${NAMES[it] ?? it}`).join(', ');
const NAMES: Record<string, string> = { oak_logs: 'oak logs', pine_logs: 'pine logs', ship_cable: 'cable', sailcloth: 'sailcloth', iron_fittings: 'iron fittings', pine_tar: 'tar' };

const items: ItemDef[] = [
  { id: 'ship_cable', name: 'Ship\'s cable', kind: 'material', rarity: 'common', stack: true, value: 14, icon: { shape: 'log', a: '#b8a070', b: '#5a4a2a' }, desc: 'Hawser-laid, tarred, a hand thick. Rook\'s Ropewalk lays it to the fathom for the yards.' },
  { id: 'sailcloth', name: 'Sailcloth', kind: 'material', rarity: 'common', stack: true, value: 20, icon: { shape: 'bag', a: '#efe3c4', b: '#a89878' }, desc: 'A bolt of heavy canvas, flax and hemp, woven tight enough to hold water.' },
  { id: 'iron_fittings', name: 'Iron fittings', kind: 'material', rarity: 'common', stack: true, value: 16, icon: { shape: 'bar', a: '#6a6e76', b: '#3a3e44' }, desc: 'Chainplates, gudgeons, eyebolts, the knees for a gun carriage. A smith\'s work, and a ship\'s bones.' },
  { id: 'pine_tar', name: 'Pine tar', kind: 'material', rarity: 'common', stack: true, value: 9, icon: { shape: 'bag', a: '#2a1e14', b: '#7a5a2a' }, desc: 'Black, sticky, and smells of a forest on fire. It goes on the rigging, the seams and anyone standing too close.' },
  { id: 'salt_cod', name: 'Salt cod', kind: 'material', rarity: 'common', stack: true, value: 12, icon: { shape: 'bread', a: '#e8dcc0', b: '#a89878' }, desc: 'A side of cod salted as stiff as a board. Somebody\'s winter, out of a sunk raider\'s hold.' },
  { id: 'spice_chest', name: 'Chest of spices', kind: 'material', rarity: 'rare', stack: true, value: 150, icon: { shape: 'chest', a: '#8a5a2a', b: '#c8a050' }, desc: 'Pepper, mace and something Callis pays a lot for, packed in sawdust. The Brethren don\'t pay duty on it. Neither will you.' },
  { id: 'seized_goods', name: 'Seized goods', kind: 'material', rarity: 'common', stack: true, value: 60, icon: { shape: 'bag', a: '#2f3a4a', b: '#e8e0c8' }, desc: 'A sealed bag with the Charter\'s revenue mark on it. What\'s inside was somebody else\'s once.' },
];

const npcs: NpcDef[] = [{
  id: 'hal_treloar', name: 'Hal Treloar', title: 'Shipwright',
  look: { skin: '#c89070', hair: '#5a4a3a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#4a5a6a', trim: '#c8a070', trousers: '#3a3430', boots: '#2a1e14', apron: true, beard: true, build: 1.15, age: 0.55 } as NpcDef['look'],
  schedule: [{ from: 0, to: 24, at: HAL, face: [HAL[0] + 4, HAL[1]], anim: 'idle' }],
  barks: ['She\'ll point higher than she looks.', 'Mind the wind. It\'s the only crew you\'ve got.'],
}];

/** The yard's business, the same nodes in every shipwright's mouth (prefixed, so they don't trample the rest of the tree). */
function yard(p: string, who: string): Record<string, DNode> {
  const back: DOption = { text: 'Something else.', next: p + 'yard' };
  const own = (i: number): DOption[] => [
    { text: (g) => `The ${ships(g)[i]?.livery.name ?? ''}.`, next: `${p}ship${i}`, cond: (g) => !!ships(g)[i] },
  ];
  const nodes: Record<string, DNode> = {
    [p + 'yard']: {
      text: `Hire one by the hour, have one built, or is it one of yours you want? ${who === 'Kester' ? 'Brethren-built, mind. They sail.' : who === 'Pau' ? 'The Assembly\'s yard. Everything in triplicate.' : 'Treloar\'s yard. Everything done right.'}`,
      options: [
        ...HULL_IDS.map((id): DOption => ({ text: `Hire a ${HULLS[id].name.toLowerCase()} for the hour (${HULLS[id].hire} marks).`, effect: (g) => g.naval('hire', id), cond: (g) => id !== 'frigate' || g.level('melee') >= 30 })),
        { text: 'Have a ship built.', next: p + 'build' },
        { text: 'My ships.', next: p + 'mine', cond: (g) => ships(g).length > 0 },
        { text: 'Not today.' },
      ],
    },
    [p + 'build']: {
      text: 'You bring the timber, the cable, the sailcloth, the fittings and the tar; the yard does the rest, for its labour. Three keels I\'ll lay for one captain and no more.',
      options: [...HULL_IDS.map((id): DOption => ({ text: `A ${HULLS[id].name.toLowerCase()}: ${HULLS[id].build.marks.toLocaleString()} marks.`, next: `${p}b_${id}` })), back],
    },
    ...Object.fromEntries(HULL_IDS.map((id) => [`${p}b_${id}`, {
      text: `${HULLS[id].blurb} For her: ${cost(id)}. And ${HULLS[id].build.marks.toLocaleString()} marks for the yard. ${HULLS[id].guns} guns a side, and she'll take ${HULLS[id].hp} in shot before she goes.`,
      options: [{ text: 'Lay her down.', effect: (g) => g.naval('build', id) }, back],
    } satisfies DNode])),
    [p + 'mine']: { text: 'Which?', options: [...own(0), ...own(1), ...own(2), back] },
    ...Object.fromEntries([0, 1, 2].map((i) => [`${p}ship${i}`, {
      text: (g: GameApi) => { const s = ships(g)[i]; return !s ? 'No such ship.' : s.sunk ? `The ${s.livery.name} is on the bottom. We can raise her, for a tenth of what she cost.` : `The ${s.livery.name}, a ${HULLS[s.hull].name.toLowerCase()}. What'll it be?`; },
      options: [
        { text: 'Bring her round to the berth.', effect: (g) => g.naval('call', String(i)), cond: (g) => !!ships(g)[i] && !ships(g)[i].sunk },
        { text: 'Raise her.', effect: (g) => g.naval('salvage', String(i)), cond: (g) => !!ships(g)[i]?.sunk },
        { text: 'Paint her hull.', effect: (g) => g.naval('paint', String(i)), cond: (g) => !!ships(g)[i] },
        { text: 'Bend on new sails.', effect: (g) => g.naval('sail', String(i)), cond: (g) => !!ships(g)[i] },
        { text: 'Give her another name.', effect: (g) => g.naval('name', String(i)), cond: (g) => !!ships(g)[i] },
        back,
      ],
    } satisfies DNode])),
  };
  return nodes;
}

const hal: DialogueTree = {
  start: (g) => (at(g, FIRST) === 'hal' ? 'firstBack' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag('metHal') ? 'Back for a ship?' : 'Hal Treloar. I build them, I hire them, and when they come back holed I fix them and say I told you so. You\'ll be wanting one.'),
      effect: (g) => g.setFlag('metHal', true),
      options: [
        { text: 'Ships.', next: 'h_yard' },
        { text: 'Have you work for a captain?', next: 'first1', cond: (g) => !at(g, FIRST) },
        { text: 'How does a ship handle?', next: 'handle' },
        { text: 'What do you sell?', effect: (g) => g.openShop('hal_treloar') },
        { text: 'Good day, Hal.' },
      ],
    },
    handle: {
      text: 'W and S, more sail and less. A and D, the helm. The wind does the rest: across it or behind it she runs, up into it she stops dead and laughs at you. Her guns are on her sides, so you fight her by turning her. Look where you want to fire and fire. Z and C if you\'d rather pick a side yourself.',
      options: [{ text: 'Ships.', next: 'h_yard' }, { text: 'Good day, Hal.' }],
    },
    first1: {
      text: 'There\'s a Brethren raider or two working the water east of the Mewstones, picking off the Kell boats. Take a ship out and put one on the bottom, and come and tell me how she handled. I\'ll pay you for the trouble and the yard for the hire.',
      options: [{ text: 'I\'ll take one out.', effect: (g) => { g.setFlag('firstBase', Number(g.flag('raidersSunk') ?? 0)); g.setStage(FIRST, 'sail'); } }, { text: 'Not yet.' }],
    },
    firstBack: {
      text: 'You put one down. I heard the guns from the quay. Well? Did she point? Did she come about when you asked? Here: the yard\'s share, and a bolt of sailcloth for when you build your own.',
      options: [{ text: 'She handled well.', effect: (g) => { g.addMarks(220); g.give('sailcloth', 4); g.setStage(FIRST, 'done'); } }],
    },
    ...yard('h_', 'Hal'),
  },
};

const quests: Record<string, QuestDef> = {
  [FIRST]: {
    id: FIRST, name: 'First Command', region: 'saltwind', depth: 'quest',
    notes: (_g, s) => (s === 'sail' ? 'Hal Treloar, the shipwright on Gullmouth\'s quay, wants a Brethren raider put on the bottom in the lanes out past the Mewstones, to the east. Any ship will do: hire one from him by the hour.' : s === 'hal' ? 'I sank a Brethren raider. Hal will want to hear how she handled.' : 'Hal Treloar paid me, and gave me sailcloth toward a ship of my own.'),
    objectives: (g, s) => (s === 'sail' ? [{ text: `Sink a Brethren raider (${Math.min(1, Number(g.flag('raidersSunk') ?? 0) - Number(g.flag('firstBase') ?? 0))}/1)`, marker: 'navalLane' }] : s === 'hal' ? [{ text: 'Tell Hal Treloar on Gullmouth\'s quay', marker: 'hal_treloar' }] : []),
    advance: (g, s) => (s === 'sail' && Number(g.flag('raidersSunk') ?? 0) > Number(g.flag('firstBase') ?? 0) ? 'hal' : null),
    marks: (_g, s): Marks => (s === undefined ? { hal_treloar: '!' } : s === 'hal' ? { hal_treloar: '?' } : {}),
    walk: { cast: ['hal_treloar'], auto: { sail: 'hal' } },
  },
};

const shops: Record<string, ShopDef> = {
  hal_treloar: { id: 'hal_treloar', name: 'Treloar\'s Yard', owner: 'hal_treloar', stock: [{ item: 'sailcloth', price: 40 }, { item: 'pine_tar', price: 18 }, { item: 'ship_cable', price: 30 }, { item: 'iron_fittings', price: 32 }], buyRate: () => 0.5, footer: () => 'Ships hired, built and mended' } as ShopDef,
};

const L0 = LANES[0];
export const NAVAL_CONTENT: RegionContent = {
  id: 'naval', items, npcs, quests, shops,
  dialogue: { hal_treloar: hal },
  things: [
    // Marker only: the lane east of the Mewstones where the raiders work
    { id: 'navalLane', x: (L0.x0 + L0.x1) / 2, z: (L0.z0 + L0.z1) / 2, label: '', radius: 0, when: () => false },
  ],
  hooks: (D) => {
    // Kester Bligh at the Careen builds for the Brethren; Pau Ferrer keeps the Assembly's yard at Callis
    Object.assign(D.kester_bligh.nodes, yard('k_', 'Kester'));
    addOption(D, 'kester_bligh', 'hello', { text: 'Ships.', next: 'k_yard' });
    Object.assign(D.pau_ferrer.nodes, yard('p_', 'Pau'));
    addOption(D, 'pau_ferrer', 'p0', { text: 'The Assembly\'s yard. Ships.', next: 'p_yard' });
  },
};
