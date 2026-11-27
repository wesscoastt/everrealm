import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import { COCKY_GOALS, HENWIFE } from '../cockyRoad';

// COCKY ROAD (owner 2026-11-27, docs/briefs/cocky-road.md): the Henwife at the head of the old drove road north of Hollin
// Ford, the curse that turns you into a cockerel, and the road (game/CockyRoad.ts).
//
// cpRoad, WHY THE COCKEREL CROSSED (Dorcas Wimble, the Henwife): eleven years ago her prize cockerel, Old Brass, crossed
// the drove road and never came back, and she has wondered ever since what was on the other side worth leaving her for.
// She can't cross it herself; she turns passers-by into cockerels and sends them to look. Get as far as the first river
// ('curse'), past halfway ('half'), and to the far gate ('gate'). Through it: Old Brass, very old, very fat, with eleven
// hens and a pond. Tell her ('brass'). She laughs until she has to sit down, and gives you one of his chicks. After that
// the curse is yours whenever you like, to beat your best.

const Q = 'cpRoad';
const DORCAS = { x: HENWIFE.x + 4.5, z: HENWIFE.z + 2.5 };

const best = (g: GameApi) => g.cockyBest();
const stageFor = (g: GameApi): string | null => {
  const s = at(g, Q), b = best(g);
  if (s === 'curse' && b >= COCKY_GOALS.first) return b >= COCKY_GOALS.gate ? 'brass' : b >= COCKY_GOALS.half ? 'gate' : 'half';
  if (s === 'half' && b >= COCKY_GOALS.half) return b >= COCKY_GOALS.gate ? 'brass' : 'gate';
  if (s === 'gate' && b >= COCKY_GOALS.gate) return 'brass';
  return null;
};

const dorcas: DialogueTree = {
  start: (g) => {
    const s = at(g, Q);
    if (!s) return 'd1';
    if (s === 'brass') return 'b1';
    if (s === 'done') return 'again';
    return 'wait';
  },
  nodes: {
    d1: { speaker: 'narrator', text: 'A small round woman in a great many shawls, sitting on an upturned crate by the head of the drove road with a hen in her lap, watching the carts go by as if she were counting them and losing count.', next: 'd2' },
    d2: { text: 'Dorcas Wimble. The Henwife, they call me in the Ford, when they\'re being polite. You\'ve a kind face. Kind faces are the ones I need.', next: 'd3' },
    d3: { text: 'Eleven years ago my Old Brass, the finest cockerel in the Greenwake, walked out of my yard and across that road, and never came back. Eleven years! I want to know what\'s on the other side worth leaving me for.', next: 'd4' },
    d4: { text: 'I can\'t cross it myself. My knees, and the carts, and I don\'t swim. But a cockerel can. A cockerel always can. So I turn people into one, just for a while, and send them to look.', next: 'd5' },
    d5: {
      text: 'It wears off when you\'re squashed. Or drowned. Or there. You\'ll not come to any harm worth mentioning. Shall I?',
      options: [
        { text: 'Go on, then. Turn me into a cockerel.', effect: (g) => { g.setStage(Q, 'curse'); g.cockyRoad(); } },
        { text: 'I\'ll keep my own legs for now, thank you.' },
      ],
    },
    wait: {
      text: (g) => {
        const s = at(g, Q), b = best(g);
        const want = s === 'curse' ? `as far as the first river, lane ${COCKY_GOALS.first}` : s === 'half' ? `past halfway, lane ${COCKY_GOALS.half}` : `all the way to the far gate, lane ${COCKY_GOALS.gate}`;
        return `Your best is ${b}. I want you ${want}. Ready to cluck?`;
      },
      options: [
        { text: 'Turn me into a cockerel.', effect: (g) => g.cockyRoad() },
        { text: 'Not just now.' },
      ],
    },
    b1: { text: 'You went through the far gate? You saw what\'s there? Tell me. Tell me all of it, and don\'t spare me.', next: 'b2' },
    b2: { speaker: 'narrator', text: 'You tell her: a meadow past the gate, a pond, a coop somebody built and forgot, and in it Old Brass, white about the comb now and very fat, with eleven hens round him who think he hung the moon.', next: 'b3' },
    b3: { text: 'Eleven hens! Eleven! The old devil. I gave him three and a heated coop. Well. Well, you can\'t blame him. I\'d have crossed for eleven.', next: 'b4' },
    b4: { speaker: 'narrator', text: 'She laughs until she has to hold on to the crate, and wipes her eyes on a shawl, and then she reaches into another shawl and brings out a chick, gold with a dark tail, that looks exactly as pleased with itself as a chick can.', next: 'b5' },
    b5: {
      text: 'One of his. He sent me a clutch the year after, over the road, by a carter. I never knew. Have it. And come back whenever you like: the curse is yours, any time. Beat your own best. Nobody else will.',
      options: [{ text: 'Thank you, Dorcas.', effect: (g) => { g.give('pet_brass_chick', 1); g.addMarks(150); g.setStage(Q, 'done'); } }],
    },
    again: {
      text: (g) => `Back for another go? Your best is ${best(g)}. Old Brass made it in one, mind. He had reasons.`,
      options: [
        { text: 'Turn me into a cockerel.', effect: (g) => g.cockyRoad() },
        { text: 'Not today.' },
      ],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Why the Cockerel Crossed', region: 'greenwake', depth: 'quest',
    notes: (g, s) => {
      if (s === 'curse') return `Dorcas Wimble, the Henwife at the head of the drove road north of Hollin Ford, lost her cockerel Old Brass across that road eleven years ago. She turns people into cockerels to go and look. Get as far as the first river: lane ${COCKY_GOALS.first}. Best so far: ${best(g)}.`;
      if (s === 'half') return `I got as far as the river. Now past halfway: lane ${COCKY_GOALS.half}. Best so far: ${best(g)}.`;
      if (s === 'gate') return `Halfway and more. Now all the way to the far gate: lane ${COCKY_GOALS.gate}. Best so far: ${best(g)}.`;
      if (s === 'brass') return 'Through the far gate: a meadow, a pond, a forgotten coop, and Old Brass with eleven hens. Dorcas will want to hear it.';
      return `Old Brass crossed for eleven hens. Dorcas gave me one of his chicks, and the curse is mine whenever I want to beat my best: ${best(g)}.`;
    },
    objectives: (g, s) => (s === 'curse' || s === 'half' || s === 'gate'
      ? [{ text: `Reach lane ${s === 'curse' ? COCKY_GOALS.first : s === 'half' ? COCKY_GOALS.half : COCKY_GOALS.gate} of Cocky Road as a cockerel (best: ${best(g)})`, done: false, marker: 'cp_dorcas' }]
      : s === 'brass' ? [{ text: 'Tell Dorcas Wimble what was through the far gate', marker: 'cp_dorcas' }] : []),
    advance: (g) => stageFor(g),
    marks: (_g, s): Marks => (!s ? { cp_dorcas: '!' } : s === 'brass' ? { cp_dorcas: '?' } : {}),
    walk: { cast: ['cp_dorcas'], auto: { curse: 'half', half: 'gate', gate: 'brass' } },
  },
};

const NPCS: NpcDef[] = [
  { id: 'cp_dorcas', name: 'Dorcas Wimble', title: 'The Henwife', look: { frame: 'f', skin: '#e0b48e', hair: '#d8d0c4', hairStyle: 2, eyes: '#4a5a3a', tunic: '#6a3a4a', trim: '#c8a050', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a2a3a', hat: 'kerchief', hatColor: '#8a5a2a', apron: true, lashes: true, build: 1.2, height: 0.88, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [DORCAS.x, DORCAS.z], face: [DORCAS.x + 4, DORCAS.z - 6], anim: 'idle' }], barks: ['Mind the carts!', 'Cluck cluck.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'pet_brass_chick', name: 'One of Old Brass\'s chicks', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bag', a: '#d8a030', b: '#2a2a2e' }, pet: 'brass_chick',
    desc: 'Gold with a dark tail, and as pleased with itself as a chick can look. Its grandfather crossed the drove road for eleven hens and never once looked back.',
    stats: 'Used, it goes into the wardrobe for good, and follows you about. Walk up to it and press E to look after it.' },
];

export const COCKY_ROAD_CONTENT: RegionContent = {
  id: 'cockyRoad',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { cp_dorcas: dorcas },
  quests,
};
