import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { REED_DECK, TOWNS } from '../../world/morrow';

// More of Reedwater, in the Glades (docs/LORE.md, "Reedwater"). The bog oak stands up through the middle platform,
// and everybody who leaves Reedwater for good drives a nail into it (data/monuments.ts, rwoak).
//
// rwNails, THE BRIGHT NAILS (Lorne Rush): three nails have gone from the bog oak in a week, pulled out at night with
// pincers. Lorne's own father's nail is in that tree. Lamp-oil drips go along the west walk to Hessie Fenn, who
// pulled them: they are her three sons', who went to Callis for the Works and stopped writing, and a nail means
// they're not coming back. Let her keep them, put them back, or ([Kind]) ask Lorne to let her drive a nail of her own
// at the top, for the ones Reedwater is still waiting for. rwNails = 'kept' | 'back' | 'waiting'.

const NAILS = 'rwNails';
const T = TOWNS.reedwater;
const P = (dx: number, dz: number): [number, number] => [T.x + 0.5 + dx, T.z + 0.5 + dz];
const DECK = REED_DECK + 1;
const OAK = P(2.5, 0.5);
const DRIPS = P(-12, 0.5);
const HESSIE = P(-18, 0.5);

const lorneNodes: Record<string, DNode> = {
  rn1: { text: 'Somebody\'s pulling nails out of the bog oak. Three this week. You leave Reedwater for good, you drive a nail in the oak, and it stays there till the oak falls down. That\'s the whole of it. That\'s the only rule we\'ve got.', next: 'rn2' },
  rn2: { text: 'My father\'s nail\'s in that tree. Low down, nearly black. If I find a hole where it was, I\'ll not be answerable. Have a look, would you? I can\'t leave the beer.', options: [{ text: 'I\'ll look at the oak.', effect: (g) => g.setStage(NAILS, 'oak') }, { text: 'Not now.' }] },
  rb1: { text: 'Hessie Fenn. Her three boys went to Callis for the Works two summers back, and drove their nails the morning they left, all three in a row. She stood and watched them do it. They stopped writing at midwinter.', next: 'rb2' },
  rb2: {
    text: 'And she\'s been creeping out with her late husband\'s pincers. God help her. What do I do? The oak\'s everybody\'s.',
    options: [
      { text: 'Let her keep them. The oak can spare three nails.', moral: { id: 'rwNails:kept', tr: { compassion: 2 }, npc: { tam_rush: -5, rw_hessie: 15 } }, effect: (g) => { g.setFlag(NAILS, 'kept'); g.addMarks(60); g.setStage(NAILS, 'done'); }, next: 'rbK' },
      { text: 'Put them back. If one nail can come out, any of them can, and then the oak means nothing.', moral: { id: 'rwNails:back', tr: { loyalty: 2, honesty: 1 }, npc: { tam_rush: 15, rw_hessie: -15 } }, effect: (g) => { g.setFlag(NAILS, 'back'); g.addMarks(60); g.setStage(NAILS, 'done'); }, next: 'rbB' },
      { text: 'Let her drive one of her own, at the top, for the ones Reedwater is still waiting on.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'rwNails:waiting', a: 3, tr: { compassion: 2, generosity: 1 }, npc: { tam_rush: 10, rw_hessie: 25 } }, effect: (g) => { g.setFlag(NAILS, 'waiting'); g.addMarks(60); g.setStage(NAILS, 'done'); }, next: 'rbW' },
    ],
  },
  rbK: { text: 'Three holes in the oak. Well. It\'s had worse. Lightning in my grandfather\'s time. Here, for your trouble. I\'ll pour Hessie one on the house, and not say why.' },
  rbB: { speaker: 'narrator', text: 'Lorne takes the three nails down the walk to Hessie\'s door himself. You don\'t hear what\'s said. In the morning they are back in the oak, in their row, driven by Lorne, and Hessie hasn\'t come out of her house. Lorne pays you without looking at you.' },
  rbW: { speaker: 'narrator', text: 'Lorne is quiet a long time. Then he gets down the beer-tub hammer and a nail from the jar and walks up the platform with Hessie. She drives it at the top of the oak, above all the others, bright, crooked. By night half the village has come up to look at it, and Lorne is pouring for all of them. He pays you out of the till.' },
  rnAfter: {
    text: (g) => (g.flag(NAILS) === 'waiting'
      ? 'Four nails at the top of the oak now. The Marsh girl drove one for her brother. People touch them going past. Hessie got a letter from Callis. One of the three. The other two are still on the oak.'
      : g.flag(NAILS) === 'back'
        ? 'The nails stayed in. Hessie doesn\'t come up for beer any more. I take it down to her.'
        : 'Three holes in the oak. People ask. I tell them lightning.'),
    next: 'a',
  },
};

const hessie: DialogueTree = {
  start: (g) => (at(g, NAILS) === 'walk' ? 'h1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(NAILS) === 'waiting' ? 'I go up and touch it every morning. It\'s still bright.' : 'Mind the third board. It\'s gone soft.'),
      options: [{ text: 'Good day.' }],
    },
    h1: { speaker: 'narrator', text: 'A small, straight old woman sitting in her doorway on the west walk with an oil lamp at her feet and a pair of iron pincers in her lap, as if she\'d just come in from a job and not yet put her tools away.', next: 'h2' },
    h2: { text: 'You\'ve followed the oil. I\'m not a fool, I knew somebody would. Yes, I took them. Davy\'s, Ned\'s and Joss\'s. They went to Callis for the Works, and they wrote every month, and then they didn\'t.', next: 'h3' },
    h3: {
      text: 'A nail in the oak means you\'re not coming back. My boys are coming back. I won\'t have them up there with the dead and the gone. Tell Lorne whatever you like.',
      options: [{ text: 'I\'ll tell him.', effect: (g) => g.setStage(NAILS, 'back') }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [NAILS]: {
    id: NAILS, name: 'The Bright Nails', region: 'glades', depth: 'quest',
    notes: (g, s) => {
      if (s === 'oak') return 'Three nails have been pulled from Reedwater\'s bog oak this week. Everybody who leaves the village for good drives one in. Lorne Rush wants me to look at the oak.';
      if (s === 'walk') return 'Fresh holes in the oak, pincer marks, and drips of lamp oil going away along the west walk.';
      if (s === 'back') return 'Hessie Fenn pulled her three sons\' nails. They went to Callis for the Works and stopped writing. Back to Lorne Rush.';
      const f = g.flag(NAILS);
      return f === 'waiting' ? 'Hessie Fenn drove a nail at the top of the oak for the ones Reedwater is still waiting on.' : f === 'back' ? 'Lorne put the three nails back in the oak.' : 'Hessie Fenn kept her sons\' nails.';
    },
    objectives: (_g, s) => (s === 'oak' ? [{ text: 'Look at the bog oak', marker: 'rwOak' }]
      : s === 'walk' ? [{ text: 'Follow the oil along the west walk', marker: 'rwDrips' }]
      : s === 'back' ? [{ text: 'Back to Lorne Rush', marker: 'tam_rush' }] : []),
    marks: (_g, s): Marks => (!s ? { tam_rush: '!' } : s === 'back' ? { tam_rush: '?' } : {}),
    walk: { cast: ['tam_rush', 'rw_hessie'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'rwOak', x: OAK[0], z: OAK[1], y: DECK, label: 'Look at the bog oak', radius: 2.8, look: 'glint',
    when: (g) => at(g, NAILS) === 'oak',
    use: (g) => { g.setStage(NAILS, 'walk'); g.toast('Hundreds of nails in the black wood, the old ones gone dark, the new ones bright. Near the bottom of the bright ones, three fresh holes in a row, and the bark round them bruised by pincers. On the boards below, three drops of lamp oil, and more going away west.'); },
  },
  {
    land: 'morrow', id: 'rwDrips', x: DRIPS[0], z: DRIPS[1], y: DECK, label: 'Look at the oil', radius: 2.6, look: 'tracks',
    when: (g) => at(g, NAILS) === 'walk',
    use: (g) => { g.toast('Lamp oil, a drop every few boards, as if somebody walked slowly with a lamp that needed trimming. It goes on along the west walk to the last door.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'rw_hessie', name: 'Hessie Fenn', title: 'The west walk, Reedwater', look: { frame: 'f', lashes: true, skin: '#b88a60', hair: '#e0dcd4', hairStyle: 5, eyes: '#3a3a3a', tunic: '#4a4a3a', trim: '#8a7a5a', shirt: '#d8d0c0', trousers: '#3a3a2a', boots: '#2a2018', build: 0.8, height: 0.92, age: 0.9 },
    schedule: [{ from: 0, to: 24, at: HESSIE, face: [HESSIE[0] + 3, HESSIE[1]], anim: 'seated', y: DECK }],
    barks: ['Mind the third board.', 'They\'ll write. They always wrote.'] },
];

export const REEDWATER_MORE: RegionContent = {
  id: 'reedwaterMore',
  npcs: NPCS,
  dialogue: { rw_hessie: hessie },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'tam_rush', (g) => (at(g, NAILS) === 'back' ? 'rb1' : undefined), lorneNodes);
    addOption(D, 'tam_rush', 'a', { text: 'You look like a man with a grievance.', cond: (g) => !at(g, NAILS), next: 'rn1' });
    addOption(D, 'tam_rush', 'a', { text: 'About the nails.', cond: (g) => at(g, NAILS) === 'done', next: 'rnAfter' });
  },
};
