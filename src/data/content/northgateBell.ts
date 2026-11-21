import type { DialogueTree, DNode } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { MORROW_OX } from '../../world/morrow';

// Northgate's wall bell (data/monuments.ts, ngbell): RING FOR THE WALL, its clapper strapped to the frame with a knot
// tied the same way every time the strap is changed, and nobody alive in Northgate has heard it.
//
// ngStrap, RING FOR THE WALL (Sergeant Mercy Thwaite, by the bell): the strap was cut in the night, clean, with a knife,
// and the clapper hangs loose. Tonight the wind off the Held will ring it, and the whole town will think the wall has
// gone. Nobody living knows the knot by heart; it's drawn in the margin of the oldest roll in Edda Rusk's Archive. At
// the frame: a small boot print, and a whistle carved H.P. Hal Pennock, nine, whose father walked the wall one night
// last winter and went out through the postern after something he heard, and didn't come back. Hal wanted to ring it
// once, for him. Tie the old knot as it's always been tied; let Hal ring it once at noon, with the town told first; or
// tie it so one pull slips it, so a bell that says RING FOR THE WALL can be rung. ngStrap = 'old' | 'rung' | 'slip'.

const STRAP = 'ngStrap';
const cx = 520 + MORROW_OX, cz = -1236;
const BELL = { x: cx - 9.5, y: 28, z: cz - 8.3 };
const MERCY = { x: cx - 7, y: 28, z: cz - 7.5 };
const HAL = { x: cx - 9.5, y: 28, z: cz - 66.5 };

const mercy: DialogueTree = {
  start: (g) => (at(g, STRAP) === 'back' ? 'b1' : g.flag('ngMetMercy') ? 'hello' : 'm0'),
  nodes: {
    m0: { speaker: 'narrator', text: 'A broad, grey-eyed woman in the garrison\'s grey with a sergeant\'s knot on her shoulder, standing by the bell frame with one hand flat on the bell as if to keep it quiet.', effect: (g) => g.setFlag('ngMetMercy', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, STRAP) === 'strap' ? 'Look at the strap. Then go and see Edda.' : at(g, STRAP) === 'roll' ? 'Edda. The Archive, at the foot of the ramp.' : at(g, STRAP) === 'hal' ? 'The Pennock boy. He\'ll be by the watch board. He always is.' : 'Sergeant Thwaite. Nobody rings this. That\'s the whole of my job today.'),
      options: [
        { text: 'Why are you holding the bell?', cond: (g) => !at(g, STRAP), next: 'q1' },
        { text: 'How\'s the bell?', cond: (g) => at(g, STRAP) === 'done', next: 'after' },
        { text: 'Good day, Sergeant.' },
      ],
    },
    q1: { text: 'Somebody cut the strap in the night. The clapper\'s hanging free. When the wind comes off the Held tonight it\'ll ring, and every soul in Northgate will be up on the wall in their nightshirts thinking the dead have come over it.', next: 'q2' },
    q2: {
      text: 'And nobody alive knows the knot. It\'s tied the same way every time, and the last time was nine years ago, and old Pennock who tied it is under his stone. Look at what\'s left of it. You\'ve better eyes than me.',
      options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(STRAP, 'strap') }, { text: 'Not now.' }],
    },
    b1: { text: 'Hal Pennock. Nine years old, with a knife. Oh, Hal. His father went out through the postern last winter after something he heard in the dark, and he never came back. That boy\'s been standing at the watch board every night since, looking at his da\'s peg.', next: 'b2' },
    b2: {
      text: 'You\'ve the knot from Edda\'s roll. Tie it, then. However you think it should be tied.',
      options: [
        { text: 'The old way. Three hundred years, and nobody\'s had to hear it.', moral: { id: 'ngStrap:old', tr: { loyalty: 2 }, npc: { ng_mercy: 15, ng_hal: -10 } }, effect: (g) => { g.setFlag(STRAP, 'old'); g.addMarks(70); g.setStage(STRAP, 'done'); }, next: 'bO' },
        { text: 'Let Hal ring it once, at noon. Tell the town first.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'ngStrap:rung', a: 3, tr: { compassion: 2, courage: 1 }, npc: { ng_mercy: 10, ng_hal: 30 } }, effect: (g) => { g.setFlag(STRAP, 'rung'); g.addMarks(70); g.setStage(STRAP, 'done'); }, next: 'bR' },
        { text: 'Tie it so one pull slips it. A bell that says ring for the wall should ring when it\'s needed.', moral: { id: 'ngStrap:slip', tr: { honesty: 2, courage: 1 }, npc: { ng_mercy: 5, ng_hal: 10, maud_hale: 5 } }, effect: (g) => { g.setFlag(STRAP, 'slip'); g.addMarks(70); g.setStage(STRAP, 'done'); }, next: 'bS' },
      ],
    },
    bO: { speaker: 'narrator', text: 'You tie it the way the margin of the roll shows, three turns and a tuck and the end hidden under, and Mercy Thwaite checks it with her thumb and nods. The bell hangs silent. Tonight the wind comes off the Held and finds nothing to ring. Mercy pays you from the garrison\'s box.' },
    bR: { speaker: 'narrator', text: 'At noon the criers go round first. Then Hal Pennock takes the rope in both hands and pulls, and the bell speaks for the first time in three hundred years, once, so deep you feel it in your teeth. Half of Northgate is standing in the square in silence. Hal lets go and runs. Mercy ties the knot after, and pays you, and doesn\'t say anything for a while.' },
    bS: { text: 'A slip knot. On the wall bell. The Gatekeeper will have something to say. Let her. If the wall goes, somebody should be able to say so with one hand. Here.' },
    after: {
      text: (g) => (g.flag(STRAP) === 'rung'
        ? 'People still talk about it. The bell. You could hear it at the farms, they say. Hal stands up straighter at the watch board now. He\'s asked to walk the wall when he\'s grown.'
        : g.flag(STRAP) === 'slip'
          ? 'The Gatekeeper came down and looked at the knot for a long time and went back up without a word. That\'s Northgate for yes.'
          : 'Quiet. Quiet\'s good.'),
      next: 'hello',
    },
  },
};

const hal: DialogueTree = {
  start: (g) => (at(g, STRAP) === 'hal' ? 'h1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(STRAP) === 'rung' ? 'I rang it. Did you hear? I rang it.' : 'That\'s my da\'s peg. Third tower west. Nobody\'s moved it.'),
      options: [{ text: 'Good day, Hal.' }],
    },
    h1: { speaker: 'narrator', text: 'A thin boy in a coat two sizes too big, standing in front of the watch board with his hands in his pockets, looking at one peg. PENNOCK. He sees the carved whistle in your hand and goes very still.', next: 'h2' },
    h2: { text: 'I wanted to ring it. Just once. It says ring for the wall, and my da went over the wall and nobody rang anything. They just took his name off the night list and put Thwaite.', next: 'h3' },
    h3: {
      text: 'I couldn\'t reach the rope. So I cut the strap so the wind would do it. I\'m sorry. I\'m not sorry. I don\'t know.',
      options: [{ text: 'I\'ll talk to the sergeant.', effect: (g) => g.setStage(STRAP, 'back') }],
    },
  },
};

const eddaNodes: Record<string, DNode> = {
  ngE1: { text: 'The bell knot? It\'s in the first roll, in the margin, drawn by whoever tied it first. Three turns and a tuck. Here, I\'ll copy it for you. Nobody\'s asked for it in nine years, and before that, nine more.', next: 'ngE2' },
  ngE2: { text: 'A carved whistle, you say? H.P. That\'s Hal Pennock\'s. His father carved it for him. Go gently with that boy. He\'s at the watch board every night.', effect: (g) => g.setStage(STRAP, 'hal') },
};

const quests: Record<string, QuestDef> = {
  [STRAP]: {
    id: STRAP, name: 'Ring for the Wall', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'strap') return 'Someone cut the strap that holds Northgate\'s wall bell silent. Tonight the wind will ring it and the town will think the wall has gone. Sergeant Mercy Thwaite wants me to look at what\'s left.';
      if (s === 'roll') return 'The strap was cut with a knife. Nobody living knows the old knot; it\'s drawn in the oldest roll in Edda Rusk\'s Archive. And a carved whistle at the frame: H.P.';
      if (s === 'hal') return 'The knot is copied, and the whistle is Hal Pennock\'s. He\'ll be by the watch board.';
      if (s === 'back') return 'Hal Pennock cut the strap to ring the bell for his father, who went out over the wall and didn\'t come back. Back to Sergeant Thwaite.';
      const f = g.flag(STRAP);
      return f === 'rung' ? 'Hal Pennock rang the wall bell once, at noon, for his father.' : f === 'slip' ? 'The wall bell is tied with a knot one pull will slip.' : 'The wall bell is tied the old way, silent.';
    },
    objectives: (_g, s) => (s === 'strap' ? [{ text: 'Look at the cut strap on the wall bell', marker: 'ngStrapThing' }]
      : s === 'roll' ? [{ text: 'Ask Edda Rusk at the Archive for the knot', marker: 'edda_rusk' }]
      : s === 'hal' ? [{ text: 'Find Hal Pennock at the watch board', marker: 'ng_hal' }]
      : s === 'back' ? [{ text: 'Back to Sergeant Mercy Thwaite', marker: 'ng_mercy' }] : []),
    marks: (_g, s): Marks => (!s ? { ng_mercy: '!' } : s === 'roll' ? { edda_rusk: '?' } : s === 'hal' ? { ng_hal: '?' } : s === 'back' ? { ng_mercy: '?' } : {}),
    walk: { cast: ['ng_mercy', 'edda_rusk', 'ng_hal'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'ngStrapThing', x: BELL.x, z: BELL.z, y: BELL.y, label: 'Look at the strap', radius: 2.6, look: 'harness',
    when: (g) => at(g, STRAP) === 'strap',
    use: (g) => { g.setStage(STRAP, 'roll'); g.toast('The leather strap is cut through clean, one stroke of a sharp knife, and the end left on the frame still holds the old knot: three turns, a tuck, the end hidden under. In the mud below the frame, a small boot print, and a wooden whistle on a string, carved H.P.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'ng_mercy', name: 'Mercy Thwaite', title: 'Sergeant of the garrison, Northgate', look: { frame: 'f', lashes: true, skin: '#d8a888', hair: '#8a8478', hairStyle: 7, eyes: '#5a6a7a', tunic: '#5a5a6a', trim: '#c8c0a8', shirt: '#d8d0c0', trousers: '#3a3a3e', boots: '#2a2420', build: 1.1, age: 0.55 },
    schedule: [{ from: 6, to: 22, at: [MERCY.x, MERCY.z], face: [BELL.x, BELL.z], anim: 'idle', y: MERCY.y }],
    barks: ['Nobody rings it.', 'Wind\'s off the Held tonight.'] },
  { land: 'morrow', id: 'ng_hal', name: 'Hal Pennock', title: 'The watch board', look: { skin: '#e0b894', hair: '#6a4a2a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#4a4a52', trim: '#2a2a2e', shirt: '#c8c0b0', trousers: '#3a3a3e', boots: '#2a2420', build: 0.7, height: 0.78, age: 0.05 },
    schedule: [{ from: 0, to: 24, at: [HAL.x, HAL.z], face: [HAL.x - 3, HAL.z], anim: 'idle', y: HAL.y }],
    barks: ['That\'s my da\'s peg.', 'Third tower west.'] },
];

export const NORTHGATE_BELL: RegionContent = {
  id: 'northgateBell',
  npcs: NPCS,
  dialogue: { ng_mercy: mercy, ng_hal: hal },
  quests,
  things,
  hooks: (D) => { hook(D, 'edda_rusk', (g) => (at(g, STRAP) === 'roll' ? 'ngE1' : undefined), eddaNodes); },
};
