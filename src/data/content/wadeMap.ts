import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// WADE'S MAP, a side story of the Glass Flats (Morrow's thinner regions: docs/OWED.md).
//
// Every caravan master between Callis and the north carries a copy of Ivo Wade's map of the Flats, and has for forty
// years. The Callis guild pays him a pension for it. He walked every mile of it himself, cairn to cairn, when he was
// young. He is going blind, and he has heard from a drover that the north road's cairns are not where his map says
// they are. He wants to know before he can't read the answer.
//
// gfMap (Ivo Wade, Tenwells):
//   'cairns'  walk the north road and read the first two cairns against the map: each stands thirty paces east of
//             where it's drawn, and the old marks in their stones are his own.
//   'camp'    the third cairn has salt-reavers camped at it (three, the quest's own). Drive them off and read it: the
//             glass has moved, not the cairns. The pan east of the road is thin glass over a sink, and the road as
//             drawn runs over it.
//   'ivo'     back to Ivo. The map has been wrong for years, and a caravan went into the pan four winters ago. Choose:
//               'name'    he sends the corrected map to the guild under his own name, and says how long it was wrong;
//                         the pension stops (honesty);
//               'quiet'   he gives the corrected map to the caravan masters himself, with no name on it, and the guild
//                         never hears it came from him (compassion, at honesty's cost).
//
// Flats names are short and dry: Wade, Moran, Sorrel.

const Q = 'gfMap';
const T = TOWNS.tenwells;
const P = (dx: number, dz: number) => ({ x: T.x + 0.5 + dx, z: T.z + 0.5 + dz });
const IVO = P(-10, -13);
const CAMP = P(10, -160);
const reavers = (g: GameApi) => Math.min(3, killed(g, 'wmReaver'));
const read = (g: GameApi) => (g.flag('wmCairn1') ? 1 : 0) + (g.flag('wmCairn2') ? 1 : 0);

const nodes: Record<string, DNode> = {
  wm1: { speaker: 'narrator', text: 'An old man at a table in the shade of the fort wall, a map weighted flat in front of him with four stones. He reads it with his nose an inch from the paper, and with one finger, the way some people read a book they know by heart.', next: 'wm2' },
  wm2: { text: 'Ivo Wade. That\'s my map. Every caravan that crosses the Flats has one, or a copy of a copy. I walked it, every mile, cairn to cairn, when my eyes were good. Forty years ago.', next: 'wm3' },
  wm3: { text: 'A drover told me last month the cairns on the north road are wrong. Not where I drew them. I told him he was drunk. He wasn\'t. I\'ve been lying awake on it.', next: 'wm4' },
  wm4: {
    text: 'I can\'t walk it now, and I can\'t see it if I did. Would you? Take the road north, read the cairns against this, and tell me how wrong I am. Tell me straight.',
    options: [
      { text: 'I\'ll read the cairns for you.', effect: (g) => g.setStage(Q, 'cairns') },
      { text: 'Not now.' },
    ],
  },
  wmWait: { text: (g) => (at(g, Q) === 'camp'
    ? `Reavers at the third cairn. That's new. Or it isn't, and I never knew. ${reavers(g)} of three.`
    : `North out of the gate, and the cairns are a mile apart, or they should be. ${read(g)} of two read.`) },
  wmB1: { speaker: 'narrator', text: 'You tell him. Ivo listens with his eyes shut, and when you get to the pan, his finger finds it on the map without looking, right where the road is drawn across it.', next: 'wmB2' },
  wmB2: { text: 'The glass moved. Not my cairns. The pan crept west under the road, a few paces a year, and the road I drew is over thin glass now. Four winters ago the Sorrels\' caravan went into a sink on the north road. Two carts and a family. They said they must have strayed off it.', next: 'wmB3' },
  wmB3: { text: 'They didn\'t stray. They were on my road. I\'ll draw it again tonight, with your paces. That\'s not the question. The question is whose name goes on it.', next: 'wmB4' },
  wmB4: {
    text: 'If I send it to the guild under my name, I say how long it was wrong, and they stop the pension, and they\'re right to. Or I give it to the caravan masters myself, one by one, no name on it, and the guild goes on paying me for a map nobody uses. Which?',
    options: [
      { text: 'Your name on it. Tell them how long.', next: 'wmName' },
      { text: 'Give it out quietly. The roads are safe either way.', next: 'wmQuiet' },
    ],
  },
  wmName: {
    text: 'My name. I signed the first one. I\'ll sign this. And I\'ll write to the Sorrels\' people in Callis, though I don\'t know what I\'ll say. Here, for the walking. It\'s the last of the guild\'s money, so it\'s honest money, near enough.',
    options: [{ text: 'Write to them, Ivo.', effect: (g) => { g.setFlag(Q, 'name'); deed(g, { id: 'gfMap:name', a: 3, tr: { honesty: 6 }, npc: { gf_ivo: 10 }, note: 'Told Ivo Wade to put his name on the corrected map of the Flats and say how long the old one was wrong.' }); g.addMarks(440); g.setStage(Q, 'done'); } }],
  },
  wmQuiet: {
    text: 'Quietly. Every master, one by one, before the next caravan. They\'ll know whose hand it is. The guild won\'t. Here, for the walking. I can\'t say it\'s honest money. It\'s money.',
    options: [{ text: 'Every master, before the next caravan.', effect: (g) => { g.setFlag(Q, 'quiet'); deed(g, { id: 'gfMap:quiet', tr: { compassion: 4, honesty: -3, deception: 2 }, npc: { gf_ivo: 15 }, note: 'Told Ivo Wade to hand out the corrected map of the Flats with no name on it, and keep his pension.' }); g.addMarks(440); g.setStage(Q, 'done'); } }],
  },
  wmAfter: {
    text: (g) => (g.flag(Q) === 'name'
      ? 'The guild stopped the pension and printed the new map with my name on it, bigger than on the first. The Sorrels wrote back. One line. I keep it under the stones with the map.'
      : 'Every master has it. Not one of them said a word to me about where it came from, and every one of them shook my hand, which they never used to. The guild\'s money still comes. I don\'t spend it.'),
  },
};

const ivo: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'wm1' : s === 'ivo' ? 'wmB1' : s === 'done' ? 'wmAfter' : 'wmWait'; },
  nodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Wade\'s Map', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'cairns') return `Ivo Wade drew the map of the Glass Flats every caravan carries, forty years ago. He's going blind, and he's heard the north road's cairns aren't where he drew them. Read them against his map. (${read(g)}/2)`;
      if (s === 'camp') return `The first two cairns on the north road both stand thirty paces east of where Ivo Wade drew them. Salt-reavers are camped at the third. (${reavers(g)}/3)`;
      if (s === 'ivo') return 'The glass has moved, not the cairns. The road on Ivo Wade\'s map runs over a sink. He should hear it.';
      return g.flag(Q) === 'name' ? 'Ivo Wade sent the corrected map of the Flats to the guild under his own name, and lost his pension.' : 'Ivo Wade gave the corrected map of the Flats to the caravan masters with no name on it.';
    },
    objectives: (g, s) => (s === 'cairns'
      ? [{ text: 'Read the first cairn on the north road', marker: 'wmCairn1', done: !!g.flag('wmCairn1') }, { text: 'Read the second cairn', marker: 'wmCairn2', done: !!g.flag('wmCairn2') }]
      : s === 'camp' ? [{ text: `Drive the salt-reavers from the third cairn (${reavers(g)}/3)`, marker: `at:${CAMP.x},${CAMP.z}`, done: reavers(g) >= 3 }, { text: 'Read the third cairn', marker: 'wmCairn3', done: !!g.flag('wmCairn3') }]
        : s === 'ivo' ? [{ text: 'Go back to Ivo Wade at Tenwells', marker: 'gf_ivo' }] : []),
    advance: (g, s) => (s === 'cairns' && read(g) >= 2 ? 'camp' : s === 'camp' && g.flag('wmCairn3') ? 'ivo' : null),
    marks: (_g, s): Marks => (!s ? { gf_ivo: '!' } : s === 'ivo' ? { gf_ivo: '?' } : {}),
    walk: { cast: ['gf_ivo'], kill: { camp: [['saltreaver', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gf_ivo', name: 'Ivo Wade', title: 'Mapmaker, Tenwells',
    look: { skin: '#b88058', hair: '#e0dcd4', hairStyle: 1, facial: 3, eyes: '#8a8a90', tunic: '#c8b890', trim: '#6a5a48', trousers: '#6a5a48', boots: '#3a2a1e', cape: '#e0d4b8', build: 0.85, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [IVO.x, IVO.z], face: [IVO.x + 2, IVO.z + 3], anim: 'idle' }],
    barks: ['Cairn to cairn.', 'Forty years.'] },
];

const thing = (id: string, p: { x: number; z: number }, label: string, stage: string, text: string, extra: (g: GameApi) => boolean = () => true) => ({
  land: 'morrow' as const, id, x: p.x, z: p.z, label, radius: 2.6,
  when: (g: GameApi) => at(g, Q) === stage && !g.flag(id) && extra(g),
  use: (g: GameApi) => {
    g.setFlag(id, 1); g.toast(text);
    if (stage === 'cairns' && read(g) >= 2) g.setStage(Q, 'camp');
    if (stage === 'camp') g.setStage(Q, 'ivo');
  },
});

export const WADE_MAP_CONTENT: RegionContent = {
  id: 'wadeMap', quests, npcs: NPCS,
  dialogue: { gf_ivo: ivo },
  spawns: [
    { land: 'morrow', tag: 'wmReaver', type: 'saltreaver', at: [[CAMP.x + 6, CAMP.z + 3], [CAMP.x - 5, CAMP.z + 5], [CAMP.x + 2, CAMP.z - 6]], when: (g) => at(g, Q) === 'camp' },
  ],
  pieces: [
    { id: 'wmFire', kind: 'campfire', x: CAMP.x + 3, z: CAMP.z + 2, when: (g) => at(g, Q) === 'camp' || at(g, Q) === 'ivo' },
    { id: 'wmBed', kind: 'bedroll', x: CAMP.x - 2, z: CAMP.z + 4, ry: 0.8, tint: '#6a4a3a', when: (g) => at(g, Q) === 'camp' || at(g, Q) === 'ivo' },
  ],
  things: [
    thing('wmCairn1', P(-40, -60), 'Read the first cairn', 'cairns', 'A cairn of flat brown stones, chest high. On the map it stands on the road. Here the road runs thirty paces west of it. Low down, scratched in one stone, a W and a date forty years old. His own mark. He built this one.'),
    thing('wmCairn2', P(-20, -110), 'Read the second cairn', 'cairns', 'The second cairn, the same: his W in the stone, and thirty paces east of the road, not on it. Two cairns, both moved the same way, the same distance. Cairns don\'t walk.'),
    thing('wmCairn3', P(8, -164), 'Read the third cairn', 'camp', 'The third cairn has his mark, and it is thirty paces east of the road too. But between it and the road, where the map draws the road, the glass is grey and cloudy and rings hollow under your boot. You drop a stone on it. It goes through, and you don\'t hear it land. The cairns haven\'t moved. The pan has.', (g) => reavers(g) >= 3),
  ],
};
