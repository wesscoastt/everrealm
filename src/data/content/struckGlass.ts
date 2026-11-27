import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn } from '../places_regional';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// STRUCK GLASS, a side story of the Glass Flats (Morrow's thinnest regions first: docs/OWED.md).
//
// Tenwells keeps a lamp on its tower through the night, and the caravans steer home by it across the flats. Last
// week's storm cracked its lens. Lark Wade, the fort's glazier, can cast a new one, but plain sand makes cloudy glass:
// she needs storm glass, the glass lightning makes where it strikes the flats, clear as water.
//
// gfStruck (Lark Wade, Tenwells):
//   'glass'  find three pieces of storm glass out on the flats east of the fort, where the storm walked. The glassbacks
//            that came up before it are still about the last piece, feeding on the struck sand: kill three.
//   'lark'   bring them to Lark. She casts the lens overnight. Choose which way the lamp faces:
//              'east'   toward the caravan road, so the trains find the gate in the dark (Cass Moran's wish);
//              'north'  toward the reaver country, so the watch sees them coming (the watch's wish).
//
// Flats names are short and dry: Wade, Moran.

const Q = 'gfStruck';
const T = TOWNS.tenwells;
const [LX, LZ] = [T.x + 6.5, T.z + 9.5]; // Lark, by the fort's well-house
const GLASS: [string, number, number, string][] = [
  ['sgGlass1', T.x + 60.5, T.z + 30.5, 'A root of glass in the sand where the lightning went in, branching like a frozen tree, as long as your arm. You dig it out whole. It is rough outside and clear as water inside.'],
  ['sgGlass2', T.x + 95.5, T.z + 4.5, 'A second strike: a rough tube of glass standing up out of a scorched ring. It breaks off clean at the sand line and rings when you tap it.'],
  ['sgGlass3', T.x + 130.5, T.z + 40.5, 'The biggest of them, three branches thick, half eaten away at one side where something has been gnawing at the melt. It comes up out of the sand with a sigh.'],
];
const found = (g: GameApi) => GLASS.filter(([id]) => g.flag(id)).length;
const backs = (g: GameApi) => Math.min(3, killed(g, 'sgBack'));

const larkNodes: Record<string, DNode> = {
  sg1: { speaker: 'narrator', text: 'A young woman with a leather apron and singed eyebrows, holding a curved disc of glass up to the light. There is a crack across it from edge to edge.', next: 'sg2' },
  sg2: { text: 'The tower lamp\'s lens. The storm did it, the night before last. Without it the lamp\'s a candle, and the caravans come home by that lamp.', next: 'sg3' },
  sg3: { text: 'I can cast another, but not from sand. Sand makes it cloudy. I need storm glass: where lightning hits the flats it melts the sand into glass, and that glass is clear.', next: 'sg4' },
  sg4: {
    text: 'The storm came in from the east and walked right past us. There\'ll be strikes out there. Three good pieces would do it. Will you go?',
    options: [
      { text: 'I\'ll find you storm glass.', effect: (g) => g.setStage(Q, 'glass') },
      { text: 'Not now.' },
    ],
  },
  sgWait: { text: (g) => `East of the fort, where the storm walked. Look for scorched rings in the sand. ${found(g)} of three found, and glassbacks seen to: ${backs(g)} of three.` },
  sgB1: { speaker: 'narrator', text: 'Lark lays the three pieces on her bench and turns them over one by one, holding each up to the window, and doesn\'t say anything for a long time.', next: 'sgB2' },
  sgB2: { text: 'These are good. These are better than good. I\'ll have a lens by morning. Now. The lamp.', next: 'sgB3' },
  sgB3: {
    text: 'Cass wants it turned east, onto the caravan road, so the trains can find the gate in the dark. The watch wants it north, at the reaver country, so they see them coming. It can only face one way. You found the glass. You choose.',
    options: [
      { text: 'East. Bring the caravans home.', next: 'sgEast' },
      { text: 'North. Let the watch see what\'s coming.', next: 'sgNorth' },
    ],
  },
  sgEast: {
    text: 'East it is. Cass will buy you a drink and the watch will grumble. Here. And this: I kept back the offcut. It catches the light like nothing else.',
    options: [{ text: 'Thank you, Lark.', effect: (g) => { g.setFlag(Q, 'east'); g.addMarks(420); g.give('storm_glass', 1); g.setStage(Q, 'done'); } }],
  },
  sgNorth: {
    text: 'North, then. The watch will be glad, and Cass will tell me about it for a month. Here. And this: I kept back the offcut. It catches the light like nothing else.',
    options: [{ text: 'Thank you, Lark.', effect: (g) => { g.setFlag(Q, 'north'); g.addMarks(420); g.give('storm_glass', 1); g.setStage(Q, 'done'); } }],
  },
  sgAfter: {
    text: (g) => (g.flag(Q) === 'east'
      ? 'The Tuesday train came in two hours after dark last week. First time in years. They said they could see the lamp from the cairns.'
      : 'The watch saw a reaver party out past the north wells three nights ago, by the lamp. They turned round when they saw the gate shut.'),
  },
};

const lark: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'sg1' : s === 'lark' ? 'sgB1' : s === 'done' ? 'sgAfter' : 'sgWait'; },
  nodes: larkNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Struck Glass', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'glass') return `The storm cracked the lens of Tenwells' tower lamp, which the caravans steer home by. Lark Wade, the glazier, needs three pieces of storm glass from the flats east of the fort to cast a new one. Glassbacks are feeding where the lightning struck. (glass ${found(g)}/3, glassbacks ${backs(g)}/3)`;
      if (s === 'lark') return 'Three pieces of storm glass. Lark Wade is waiting at her bench by the well-house.';
      return g.flag(Q) === 'east' ? 'Tenwells\' lamp faces east now, onto the caravan road.' : 'Tenwells\' lamp faces north now, toward the reaver country.';
    },
    objectives: (g, s) => (s === 'glass'
      ? [...GLASS.map(([id], i) => ({ text: `Dig out the ${['first', 'second', 'third'][i]} piece of storm glass`, marker: id, done: !!g.flag(id) })), { text: `Kill the glassbacks feeding on the struck sand (${backs(g)}/3)`, done: backs(g) >= 3 }]
      : s === 'lark' ? [{ text: 'Take the storm glass to Lark Wade', marker: 'gf_lark' }] : []),
    advance: (g, s) => (s === 'glass' && found(g) >= 3 && backs(g) >= 3 ? 'lark' : null),
    marks: (_g, s): Marks => (!s ? { gf_lark: '!' } : s === 'lark' ? { gf_lark: '?' } : {}),
    walk: { cast: ['gf_lark'], kill: { glass: [['glassback', 3]] } },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'sgBack', type: 'glassback', at: [[T.x + 124.5, T.z + 34.5], [T.x + 136.5, T.z + 46.5], [T.x + 126.5, T.z + 48.5]], when: (g) => at(g, Q) === 'glass' },
];

const NPCS: NpcDef[] = [
  { id: 'gf_lark', name: 'Lark Wade', title: 'Glazier, Tenwells', land: 'morrow',
    look: { frame: 'f', skin: '#a8704a', hair: '#3a2418', hairStyle: 6, eyes: '#4a3a2a', tunic: '#8a6a4a', trim: '#c8b890', trousers: '#4a3e30', boots: '#2a2018', apron: true, gloves: '#6a4a2a', lashes: true, build: 0.95, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [LX, LZ], face: [LX + 4, LZ - 2], anim: 'idle' }], barks: ['Clear as water, it has to be.', 'Mind the bench, it\'s hot.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'storm_glass', name: 'Storm glass', kind: 'collectible', rarity: 'rare', stack: false, value: 60, icon: { shape: 'gem', a: '#e8f4f8', b: '#8aa8c8' },
    desc: 'An offcut of the glass lightning made in the sand of the Glass Flats: rough outside, clear as water inside, and full of the light from anywhere you hold it.' },
];

export const STRUCK_GLASS_CONTENT: RegionContent = {
  id: 'struckGlass', quests, items: ITEMS, npcs: NPCS, spawns,
  dialogue: { gf_lark: lark },
  things: GLASS.map(([id, x, z, text]) => ({
    land: 'morrow' as const, id, x, z, label: 'Dig out the storm glass', radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'glass' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3 && backs(g) >= 3) g.setStage(Q, 'lark'); },
  })),
};
