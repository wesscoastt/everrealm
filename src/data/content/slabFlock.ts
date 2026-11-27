import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { MORROW_OX, SLABS } from '../../world/morrow';

// THE SLAB FLOCK, a side story of the Sunder (Morrow's thinner regions: docs/OWED.md).
//
// Liftwick's goats graze the hanging slabs: the grass on stone that floats in the wind grows thick and sweet, and the
// milk off it is the best in Morrow. Since the Winding House's chains were cut (the Winding House, data/dungeons.ts),
// the first slab has started to drift a hand's width a day, and the crawlers have come up its underside.
//
// lfFlock (Marta Puig, goatherd, at the bridge head):
//   'goats'  three of her goats are still out on the first slab and won't come in across the bridge with crawlers on
//            it: find each, and kill three crawlers so they'll cross.
//   'marta'  she chooses, with your word:
//              'slab'  keep grazing the slabs: Josep will hang a gate on the bridge and she'll take the risk for the milk;
//              'rim'   bring the flock down to the rim pastures for good: thinner grass, and nobody goes over the edge.
//
// Liftwick names are of the old Assembly coast: Puig, Font, Vidal.

const Q = 'lfFlock';
const A = SLABS[0];
const MARTA = { x: MORROW_OX + 1462.5, z: 288.5 };
/** The three goats out on the first slab, at its far corners and its edge. */
const GOATS: [string, number, number, string][] = [
  ['lfGoat1', A[0] - A[2] + 3.5, A[1] + 3.5, 'A brown nanny with a split ear, chewing, watching you with her yellow eyes. Round her neck, on a strap, a bell with PUIG scratched on it. She lets you take the strap.'],
  ['lfGoat2', A[0] + A[2] - 8.5, A[1] - 4.5, 'A white kid up on a rock, shouting at the crawlers as if it might see them off by itself. You lift it down and tuck it under your arm. It complains the whole time.'],
  ['lfGoat3', A[0] + A[2] - 4.5, A[1] - 3.5, 'The old billy, Pere, lying in the grass with his legs folded under him, not interested. He gets up when you rattle the bell, slowly, to show he chose to.'],
];
const found = (g: GameApi) => GOATS.filter(([id]) => g.flag(id)).length;
const crawlers = (g: GameApi) => Math.min(3, killed(g, 'type:slabcrawler') - Number(g.flag(Q + ':base') ?? 0));

const martaNodes: Record<string, DNode> = {
  mf1: { speaker: 'narrator', text: 'A woman with a crook and a bell on her belt, standing at the head of the bridge to the first slab and shouting names across it.', next: 'mf2' },
  mf2: { text: 'Marta Puig. Those are my goats out there. The best milk in Morrow comes off that slab. Grass on floating stone, nothing like it.', next: 'mf3' },
  mf3: { text: 'Except it\'s drifting. A hand a day since the Winding House chains went. And the crawlers come up its underside, and three of mine won\'t cross back while they\'re on it.', next: 'mf4' },
  mf4: {
    text: 'I\'d go myself, but if I\'m on the slab and it goes, who milks the rest? Will you bring them in?',
    options: [
      { text: 'I\'ll bring your goats in.', effect: (g) => { g.setFlag(Q + ':base', killed(g, 'type:slabcrawler')); g.setStage(Q, 'goats'); } },
      { text: 'Not now.' },
    ],
  },
  mfWait: { text: (g) => `Three of them out there: the nanny with the split ear, a white kid, and old Pere. ${found(g)} found, and crawlers seen off: ${crawlers(g)} of three.` },
  mfB1: { speaker: 'narrator', text: 'The three goats come over the bridge one at a time, the kid last, bleating, and Marta counts them through twice to be sure.', next: 'mfB2' },
  mfB2: {
    text: 'All of them. Thank you. Now I have to decide. Josep says he\'ll hang a gate on the bridge, and I keep them on the slabs and take the risk. Or I bring the whole flock down to the rim for good. What would you do?',
    options: [
      { text: 'Keep them on the slabs. That milk is worth the risk.', next: 'mfSlab' },
      { text: 'Bring them down to the rim. The slab could go any day.', next: 'mfRim' },
    ],
  },
  mfSlab: {
    text: 'The slabs. My grandmother grazed them, and hers. Josep will have his gate up by Sunday, and I\'ll watch the drift. Here. And this, from the morning\'s milking.',
    options: [{ text: 'Watch the drift.', effect: (g) => { g.setFlag(Q, 'slab'); g.addMarks(440); g.give('skyfarm_cheese', 3); g.setStage(Q, 'done'); } }],
  },
  mfRim: {
    text: 'The rim. The milk won\'t be the same. But I\'ll have the goats to milk. Here. And this, from the morning\'s milking, off the slab, the last of it.',
    options: [{ text: 'They\'ll be safe.', effect: (g) => { g.setFlag(Q, 'rim'); g.addMarks(440); g.give('skyfarm_cheese', 3); g.setStage(Q, 'done'); } }],
  },
  mfAfter: {
    text: (g) => (g.flag(Q) === 'slab'
      ? 'Josep\'s gate is up and the slab has stopped drifting, for now. The kid tried to eat the gate. I don\'t blame him.'
      : 'They\'re on the rim, grumbling. The milk is thinner. Last night the first slab dropped a full yard. Nobody was on it.'),
  },
};

const marta: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'mf1' : s === 'marta' ? 'mfB1' : s === 'done' ? 'mfAfter' : 'mfWait'; },
  nodes: martaNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Slab Flock', region: 'sunder', depth: 'quest',
    notes: (g, s) => {
      if (s === 'goats') return `Marta Puig's goats graze the first hanging slab off Liftwick's rim. The slab is drifting since the Winding House chains were cut, crawlers have come up its underside, and three goats won't cross back. (goats ${found(g)}/3, crawlers ${crawlers(g)}/3)`;
      if (s === 'marta') return 'All three goats are coming in. Marta Puig is at the bridge head.';
      return g.flag(Q) === 'slab' ? 'Marta Puig keeps her flock on the slabs, behind a gate Josep Font hung on the bridge.' : 'Marta Puig brought her flock down to the rim pastures for good.';
    },
    objectives: (g, s) => (s === 'goats'
      ? [...GOATS.map(([id], i) => ({ text: ['Find the nanny with the split ear', 'Find the white kid', 'Find old Pere, the billy'][i], marker: id, done: !!g.flag(id) })), { text: `Kill slab-crawlers on the first slab (${crawlers(g)}/3)`, done: crawlers(g) >= 3 }]
      : s === 'marta' ? [{ text: 'Go back to Marta Puig at the bridge head', marker: 'lf_marta' }] : []),
    advance: (g, s) => (s === 'goats' && found(g) >= 3 && crawlers(g) >= 3 ? 'marta' : null),
    marks: (_g, s): Marks => (!s ? { lf_marta: '!' } : s === 'marta' ? { lf_marta: '?' } : {}),
    walk: { cast: ['lf_marta'], kill: { goats: [['slabcrawler', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'lf_marta', name: 'Marta Puig', title: 'Goatherd, Liftwick',
    look: { frame: 'f', skin: '#c8946a', hair: '#3a2a1e', hairStyle: 6, eyes: '#4a3a2a', tunic: '#7a5a3a', trim: '#d8c8a0', trousers: '#3a3430', boots: '#2a2018', hat: 'straw', hatColor: '#c8a868', lashes: true, build: 1.0, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [MARTA.x, MARTA.z], face: [MARTA.x + 3, MARTA.z + 6], anim: 'idle' }], barks: ['Pere! Pere, you old goat!', 'Best milk in Morrow, that slab.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'skyfarm_cheese', name: 'Slab cheese', kind: 'food', rarity: 'uncommon', stack: true, value: 22, icon: { shape: 'bread', a: '#f0e8d0', b: '#b8a070' }, heal: 55,
    desc: 'Soft goat\'s cheese from the milk of Liftwick\'s slab-grazed flocks, wrapped in a vine leaf. It tastes of thyme and high air.' },
];

export const SLAB_FLOCK_CONTENT: RegionContent = {
  id: 'slabFlock', quests, items: ITEMS, npcs: NPCS,
  dialogue: { lf_marta: marta },
  things: GOATS.map(([id, x, z, text], i) => ({
    land: 'morrow' as const, id, x, z, label: ['Take the nanny\'s bell strap', 'Lift the kid back from the edge', 'Rattle the bell at Pere'][i], radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'goats' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3 && crawlers(g) >= 3) g.setStage(Q, 'marta'); },
  })),
};
