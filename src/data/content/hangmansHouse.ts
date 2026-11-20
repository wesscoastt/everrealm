import type { DialogueTree } from '../../game/api';
import { addOption, at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';

// The big house on the hill west of Gorran (OWED 97x stage 9, docs/VERANDAH.md: the "13-door building" of the door
// survey at -3417, 2389). Thomas Prisk lives in it alone. He was the king's hangman for twenty-two years, and Gorran
// won't sell him bread.
//
// vhRope, THE ROPE ON THE STEP (Thomas Prisk): every morning since the spring, a noose on his doorstep. The knot is
// tied wrong, by somebody who has only seen one tied once, from a crowd. Boot prints go down to the stream and east
// to Gorran. Loveday Rowse, Gorran's reeve, knows whose: Daniel Angove, whose father Will was hanged eleven years ago
// for the Mizuholm barn fire. Daniel says his father didn't do it. Thomas says Will Angove said so on the scaffold, and
// that most of them don't. Bring Thomas down to Gorran to tell the boy that himself, tell Daniel to stop, or
// ([Honest]) make Thomas say what he has never said: that he heard, a year after, who really fired the barn.
// vhRope = 'down' | 'stopped' | 'truth'.

const ROPE = 'vhRope';
const THOMAS = { x: -3416.5, y: 17, z: 2396.5 };
const STEP = { x: -3414.5, y: 17, z: 2396.5 };
const PRINTS = { x: -3405.5, y: 17, z: 2400.5 };
const DANIEL = { x: -3362.5, y: 22, z: 2302.5 };

const thomas: DialogueTree = {
  start: (g) => (at(g, ROPE) === 'back' ? 'b1' : g.flag('vhMetThomas') ? 'hello' : 't0'),
  nodes: {
    t0: { speaker: 'narrator', text: 'A tall, grey, very clean man splitting kindling on a block by the door, with a care that makes every stroke look like the first one he has ever made. He stops when he sees you, and waits for you to decide whether to come any closer.', next: 't1' },
    t1: { text: 'Thomas Prisk. You\'ll have heard of me in Gorran, if you\'ve been to Gorran. Most people stop at the gate after they\'ve heard. You didn\'t.', effect: (g) => g.setFlag('vhMetThomas', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, ROPE) === 'look' ? 'It\'s on the step. Same as every morning.' : 'It\'s a big house for one. They gave it me with the post. Nobody else wanted it after.'),
      options: [
        { text: 'What did you do, before?', next: 'job' },
        { text: 'Something\'s troubling you.', cond: (g) => !at(g, ROPE), next: 'q1' },
        { text: 'Has the rope stopped?', cond: (g) => at(g, ROPE) === 'done', next: 'after' },
        { text: 'Good day, Mr Prisk.' },
      ],
    },
    job: { text: 'I hanged people for the king. Twenty-two years, forty-one of them. My father did it before me, in the Counties, and his before him. It\'s a trade, like any other. You learn the knot and the drop and the weight of a man by looking at him. Then you go home and nobody wants to sit next to you in church.', next: 'hello' },
    q1: { text: 'Every morning since the spring there\'s been a rope on my doorstep, tied in a noose. I don\'t mind it, as such. I\'ve seen a good many ropes. But I\'d like to know whose it is, and I can\'t very well go round Gorran asking. They\'d think I was measuring them.', next: 'q2' },
    q2: {
      text: 'This morning\'s is still there. Look at it, if you like. You might see something I\'ve stopped seeing.',
      options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(ROPE, 'look') }, { text: 'Not now.' }],
    },
    b1: { text: 'Angove. Will Angove. The Mizuholm barn, eleven years ago in the autumn. Two men burned in it. He said on the scaffold that he hadn\'t done it, and he didn\'t fight. They all say it. Most of them fight. He didn\'t.', next: 'b2' },
    b2: {
      text: 'And his boy\'s been walking up here every morning in the dark with a rope, and tying it wrong.',
      options: [
        { text: 'Come down to Gorran and tell Daniel that yourself.', moral: { id: 'vhRope:down', tr: { courage: 2, compassion: 1 }, rep: { verandah: 1 }, npc: { vh_thomas: 15, vh_daniel: 10 } }, effect: (g) => { g.setFlag(ROPE, 'down'); g.addMarks(65); g.setStage(ROPE, 'done'); }, next: 'bD' },
        { text: 'Leave it with me. I\'ll tell the boy to stop.', moral: { id: 'vhRope:stopped', tr: { loyalty: 1 }, npc: { vh_thomas: 5, vh_daniel: -10 } }, effect: (g) => { g.setFlag(ROPE, 'stopped'); g.addMarks(65); g.setStage(ROPE, 'done'); }, next: 'bS' },
        { text: 'You know more than that, Mr Prisk.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'vhRope:truth', tr: { honesty: 2, courage: 1 }, rep: { verandah: 2 }, npc: { vh_thomas: 10, vh_daniel: 20 } }, effect: (g) => { g.setFlag(ROPE, 'truth'); g.addMarks(65); g.setStage(ROPE, 'done'); }, next: 'bT' },
      ],
    },
    bD: { speaker: 'narrator', text: 'He looks down the hill at Gorran for a long time. Then he puts the axe in the block, takes his coat off the peg, and goes. You hear later that he stood in the square with his hat in his hands while Daniel Angove shouted at him, and didn\'t say anything back, and that when the boy had finished he said, "I know. I\'m sorry," and walked home.' },
    bS: { text: 'Thank you. It\'s kindly meant. Tell him I didn\'t ask you to say anything else, because I didn\'t. Here. I\'ve no use for it, and I\'ve nobody to leave it to.' },
    bT: { speaker: 'narrator', text: 'Thomas sits down on the block. "A year after, a drover in the Counties hanged for something else told me, the morning of it, that he\'d fired a barn on Verandah once, to settle a debt with the miller. He wanted somebody to know. I knew. I never said. Who\'d I say it to?" He gets up. "I\'ll write it to the king. Tonight. Tell the boy it\'s coming."' },
    after: {
      text: (g) => (g.flag(ROPE) === 'truth'
        ? 'The king had my letter read in council. They\'ve struck Will Angove\'s name from the felons\' roll. His boy came up last week and split my kindling. Didn\'t say a word. Didn\'t need to.'
        : g.flag(ROPE) === 'down'
          ? 'No more rope. He nods to me now, the boy, at the gate. That\'s more than his father\'s town does.'
          : 'No more rope. I miss it, a bit. It was somebody coming up the hill.'),
      next: 'hello',
    },
  },
};

const daniel: DialogueTree = {
  start: (g) => (at(g, ROPE) === 'daniel' ? 'd1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (at(g, ROPE) === 'done' ? 'I\'ve nothing to say to you.' : 'Gorran\'s that way. Everything else is the other way.'),
      options: [{ text: 'Good day.' }],
    },
    d1: { speaker: 'narrator', text: 'A big, raw-handed young man with rope burn across both palms, sitting on a bench with his elbows on his knees. He sees you coming up from the west road and knows what you\'ve come about before you open your mouth.', next: 'd2' },
    d2: { text: 'He sent you. Of course he did. It\'s only a rope. I can\'t tie it right, I know. I was nine. I was at the front, my mother put me at the front so he\'d see me. I watched the man tie it and I\'ve been trying to remember how ever since.', next: 'd3' },
    d3: {
      text: 'My father didn\'t fire that barn. He was in the boat with me all that night, off the Long Sands, and nobody believed a boy of nine. I want that man to wake up every morning and remember him. That\'s all.',
      options: [{ text: 'I\'ll tell him that.', effect: (g) => g.setStage(ROPE, 'back') }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [ROPE]: {
    id: ROPE, name: 'The Rope on the Step', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'look') return 'Thomas Prisk, who was the king\'s hangman, finds a noose on his doorstep every morning. He wants to know who leaves it.';
      if (s === 'reeve') return 'The rope is tied wrong, and boot prints go east to Gorran. Loveday Rowse, Gorran\'s reeve, may know whose they are.';
      if (s === 'daniel') return 'Daniel Angove, whose father Will was hanged eleven years ago for the Mizuholm barn fire. He sits on the bench in Gorran.';
      if (s === 'back') return 'Daniel says his father was in a boat with him all that night. Back up the hill to Thomas Prisk.';
      const f = g.flag(ROPE);
      return f === 'truth' ? 'Thomas Prisk wrote to the king about who really fired the Mizuholm barn.' : f === 'down' ? 'Thomas Prisk went down to Gorran to face Daniel Angove.' : 'I told Daniel Angove to stop.';
    },
    objectives: (g, s) => (s === 'look' ? [
      { text: 'Look at the rope on Thomas\'s step', done: !!g.flag('vhRopeSeen'), marker: 'vhRopeThing' },
      { text: 'Follow the boot prints', done: !!g.flag('vhRopePrints'), marker: 'vhPrintsThing' },
    ] : s === 'reeve' ? [{ text: 'Ask Loveday Rowse, Gorran\'s reeve', marker: 'gor_loveday' }]
      : s === 'daniel' ? [{ text: 'Find Daniel Angove in Gorran', marker: 'vh_daniel' }]
      : s === 'back' ? [{ text: 'Back to Thomas Prisk', marker: 'vh_thomas' }] : []),
    advance: (g, s) => (s === 'look' && g.flag('vhRopeSeen') && g.flag('vhRopePrints') ? 'reeve' : null),
    marks: (_g, s): Marks => (!s ? { vh_thomas: '!' } : s === 'reeve' ? { gor_loveday: '?' } : s === 'daniel' ? { vh_daniel: '?' } : s === 'back' ? { vh_thomas: '?' } : {}),
    walk: { cast: ['vh_thomas', 'gor_loveday', 'vh_daniel'] },
  },
};

const things: WorldThing[] = [
  {
    id: 'vhRopeThing', x: STEP.x, z: STEP.z, y: STEP.y, label: 'Look at the rope', radius: 2.4, look: 'harness',
    when: (g) => at(g, ROPE) === 'look' && !g.flag('vhRopeSeen'),
    use: (g) => { g.setFlag('vhRopeSeen', 1); g.toast('New hemp, Gorran laid, tied in a noose with seven turns where a hangman ties thirteen, and the turns go the wrong way. Whoever tied it has only ever seen one tied, from a distance. The dew on the step has been scuffed by a pair of big boots, going down the hill.'); },
  },
  {
    id: 'vhPrintsThing', x: PRINTS.x, z: PRINTS.z, y: PRINTS.y, label: 'Look at the prints', radius: 2.6, look: 'tracks',
    when: (g) => at(g, ROPE) === 'look' && !g.flag('vhRopePrints'),
    use: (g) => { g.setFlag('vhRopePrints', 1); g.toast('Big boots, hobnailed, a heavy man walking fast in the dark. They cross the stream where it runs shallow and go east, toward Gorran, as straight as a man can walk without a road.'); },
  },
];

const loveday: Record<string, DialogueTree['nodes'][string]> = {
  vhR1: { text: 'A rope on Thomas Prisk\'s step. Every morning. God help us. I know whose. Everybody in Gorran knows whose, and nobody\'s told him, because nobody in Gorran talks to Thomas Prisk.', next: 'vhR2' },
  vhR2: { text: 'Daniel Angove. His father was Will Angove, who was hanged at Verandah eleven years back for the Mizuholm barn fire. Prisk hanged him. Daniel was nine. He sits on the bench by the square most evenings, if you want him. Go gently.', effect: (g) => g.setStage(ROPE, 'daniel') },
};

const look = (o: Partial<NpcDef['look']>): NpcDef['look'] => ({ skin: '#d8a888', hair: '#8a8478', hairStyle: 0, facial: 0, eyes: '#4a5a6a', tunic: '#3a3a3e', trim: '#2a2a2e', shirt: '#d8d0c0', trousers: '#2a2a2e', boots: '#1a1612', build: 1, age: 0.5, ...o });

const NPCS: NpcDef[] = [
  { id: 'vh_thomas', name: 'Thomas Prisk', title: 'The king\'s hangman, retired', look: look({ hair: '#a8a49c', facial: 1, build: 1.05, age: 0.7 }),
    schedule: [{ from: 6, to: 21, at: [THOMAS.x, THOMAS.z], face: [THOMAS.x, THOMAS.z - 3], anim: 'idle', y: THOMAS.y }],
    barks: ['Good day.', 'Nobody comes up here by accident.'] },
  { id: 'vh_daniel', name: 'Daniel Angove', title: 'Fisherman, Gorran', look: look({ skin: '#c89070', hair: '#3a2a1e', tunic: '#4a5a6a', build: 1.2, age: 0.2 }),
    schedule: [{ from: 0, to: 24, at: [DANIEL.x, DANIEL.z], face: [DANIEL.x, DANIEL.z - 3], anim: 'seated', y: DANIEL.y }],
    barks: ['What?', 'Long Sands were good this morning.'] },
];

export const HANGMANS_HOUSE: RegionContent = {
  id: 'hangmansHouse',
  npcs: NPCS,
  dialogue: { vh_thomas: thomas, vh_daniel: daniel },
  quests,
  things,
  hooks: (D) => {
    for (const [id, n] of Object.entries(loveday)) D.gor_loveday.nodes[id] = n;
    addOption(D, 'gor_loveday', 'hello', { text: 'Who leaves a rope on Thomas Prisk\'s step?', cond: (g) => at(g, ROPE) === 'reeve', next: 'vhR1' });
  },
};
