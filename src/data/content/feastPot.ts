import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE FEAST POT, a side story of Cala Roja on the Bright Coast (Morrow's thinner regions: docs/OWED.md).
//
// Every year on the night the boats are blessed, Montse Grau cooks the suquet the whole town eats, in a copper pot
// her mother cooked it in. She is eighty-one. This year she asks a stranger to fetch what goes in it, and doesn't say
// why until the pot is on.
//
// cbPot (Montse Grau, her door by the fish market):
//   'gather'  rock samphire from the cliff path, and the scorpionfish Toni Rius kept back for her at his stall.
//   'garden'  the saffron is in the walled garden above the town, and the terrace jackals are in it (three, the quest's
//             own). Drive them off and pick it.
//   'montse'  back to Montse with the saffron. The pot goes on, and she tells you: she can't taste any more, not since
//             the winter, and she can't tell if it's right. She asks you to taste it. It is not right. Choose:
//               'truth'  tell her; she calls her granddaughter Aina in from the door, and they put it right together,
//                        and the pot is Aina's from now on (honesty);
//               'kind'   tell her it's as good as it ever was; she serves it, the town eats it and says nothing, and she
//                        cooks it again next year (compassion, at honesty's cost).
//
// Bright Coast names are Catalan, as Cala Roja's are: Grau, Rius, Pujol.

const Q = 'cbPot';
const T = TOWNS.cala;
const P = (dx: number, dz: number) => ({ x: T.x + 0.5 + dx, z: T.z + 0.5 + dz });
const MONTSE = P(-9, 9);
const SAMPHIRE = P(22, -14);
const FISH = P(6, 6);
const GARDEN = P(-30, -22);
const jackals = (g: GameApi) => Math.min(3, killed(g, 'cbPotJackal'));
const got = (g: GameApi) => (g.flag('fpSamphire') ? 1 : 0) + (g.flag('fpFish') ? 1 : 0);

const nodes: Record<string, DNode> = {
  fp1: { speaker: 'narrator', text: 'A small old woman on a cane chair in a doorway, a copper pot at her feet, scrubbed so bright it throws the light back up into her face. She is polishing it again anyway.', next: 'fp2' },
  fp2: { text: 'Montse Grau. You\'ll have seen the boats being painted. Three nights and they\'re blessed, and the whole town eats out of this pot. My mother\'s pot. I\'ve cooked in it sixty years.', next: 'fp3' },
  fp3: { text: 'I need samphire off the cliff path, and Toni has a scorpionfish under his counter with my name on it. And saffron from the walled garden up the hill, if the jackals have left any.', next: 'fp4' },
  fp4: {
    text: 'My granddaughter would fetch it, but she\'d want to know why I\'m not fetching it myself, and I don\'t want to tell her. Would you? You\'re nobody\'s grandchild. You won\'t ask.',
    options: [
      { text: 'I\'ll fetch what goes in the pot.', effect: (g) => g.setStage(Q, 'gather') },
      { text: 'Not now.' },
    ],
  },
  fpWait: { text: (g) => (at(g, Q) === 'garden'
    ? `The garden's up the hill, behind the wall. The jackals dig for the bulbs. ${jackals(g)} of three seen off.`
    : `Samphire from the cliff path. The fish from Toni. ${got(g)} of two. Don't let him give you a small one.`) },
  fpB1: { speaker: 'narrator', text: 'Montse takes the saffron and holds it under her nose for a long time. Then the pot is on the fire in her kitchen, and the samphire and the fish go in, and the saffron last, and the smell of it fills the street. She stirs it, and holds out the spoon to you.', next: 'fpB2' },
  fpB2: { text: 'Taste it. Go on. I can\'t. Not since the winter. Everything tastes of the same nothing, and I\'ve told nobody, because if I tell them, the pot isn\'t mine any more.', next: 'fpB3' },
  fpB3: { speaker: 'narrator', text: 'You taste it. It is thin and too salt, and the saffron is lost under the salt. It is not bad. It is not what a town would wait a year for.', next: 'fpB4' },
  fpB4: {
    text: 'Well? Is it right?',
    options: [
      { text: 'It\'s too salt, Montse. It isn\'t right.', next: 'fpTruth' },
      { text: 'It\'s as good as it ever was.', next: 'fpKind' },
    ],
  },
  fpTruth: {
    text: 'Too salt. Aye. My hand doesn\'t know when to stop any more. Aina! Aina, come in here. Bring water and another fish. No, don\'t look at me like that, I\'ll show you. You\'ll need to know. Here. For your trouble, and for your tongue.',
    options: [{ text: 'Show her, Montse.', effect: (g) => { g.setFlag(Q, 'truth'); deed(g, { id: 'cbPot:truth', a: 3, tr: { honesty: 5 }, npc: { cb_montse: 10 }, note: 'Told Montse Grau her feast suquet was wrong, and she handed the pot to her granddaughter.' }); g.addMarks(420); g.setStage(Q, 'done'); } }],
  },
  fpKind: {
    text: 'As good as it ever was. You\'re a kind liar or a poor cook, and I don\'t mind which. Here, for your trouble. Come down on the night. You can have the first bowl.',
    options: [{ text: 'I\'ll be there.', effect: (g) => { g.setFlag(Q, 'kind'); deed(g, { id: 'cbPot:kind', tr: { compassion: 4, honesty: -3 }, npc: { cb_montse: 15 }, note: 'Told Montse Grau her feast suquet was as good as ever, though it wasn\'t.' }); g.addMarks(420); g.setStage(Q, 'done'); } }],
  },
  fpAfter: {
    text: (g) => (g.flag(Q) === 'truth'
      ? 'Aina cooked it on the night, and I sat in the street and told her what she was doing wrong, loud, so everyone could hear it was still mine. It was right. They said so. I believe them.'
      : 'They ate it all. Every bowl. Nobody said a word, and they were very kind to me all night, kinder than usual. I\'m old, not a fool. Aina\'s coming round tomorrow. I\'ll show her.'),
  },
};

const montse: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'fp1' : s === 'montse' ? 'fpB1' : s === 'done' ? 'fpAfter' : 'fpWait'; },
  nodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Feast Pot', region: 'bright', depth: 'quest',
    notes: (g, s) => {
      if (s === 'gather') return `Montse Grau cooks the suquet all Cala Roja eats on the night the boats are blessed. She asked me to fetch samphire from the cliff path and the scorpionfish Toni Rius kept back for her. (${got(g)}/2)`;
      if (s === 'garden') return `The saffron for Montse's pot is in the walled garden above Cala Roja, and the terrace jackals are digging in it. (${jackals(g)}/3)`;
      if (s === 'montse') return 'I have everything Montse Grau needs for the feast pot.';
      return g.flag(Q) === 'truth' ? 'Montse Grau can no longer taste her own cooking. I told her the suquet was wrong, and the pot is her granddaughter Aina\'s now.' : 'Montse Grau can no longer taste her own cooking. I told her the suquet was as good as ever.';
    },
    objectives: (g, s) => (s === 'gather'
      ? [{ text: 'Pick rock samphire on the cliff path', marker: 'fpSamphire', done: !!g.flag('fpSamphire') }, { text: 'Collect the fish from Toni Rius\'s stall', marker: 'fpFish', done: !!g.flag('fpFish') }]
      : s === 'garden' ? [{ text: `Drive the jackals from the walled garden (${jackals(g)}/3)`, marker: `at:${GARDEN.x},${GARDEN.z}`, done: jackals(g) >= 3 }, { text: 'Pick the saffron', marker: 'fpSaffron', done: !!g.flag('fpSaffron') }]
        : s === 'montse' ? [{ text: 'Bring the saffron to Montse Grau', marker: 'cb_montse' }] : []),
    advance: (g, s) => (s === 'gather' && got(g) >= 2 ? 'garden' : s === 'garden' && g.flag('fpSaffron') ? 'montse' : null),
    marks: (_g, s): Marks => (!s ? { cb_montse: '!' } : s === 'montse' ? { cb_montse: '?' } : {}),
    walk: { cast: ['cb_montse'], kill: { garden: [['terracejackal', 3]] } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'cb_montse', name: 'Montse Grau', title: 'Cooks the feast pot, Cala Roja',
    look: { frame: 'f', skin: '#c8946c', hair: '#d8d4cc', hairStyle: 2, eyes: '#3a2a1e', tunic: '#1e1e24', trim: '#e8e2d4', trousers: '#1e1e24', boots: '#1a1410', apron: true, lashes: true, build: 0.85, age: 0.9 },
    schedule: [{ from: 0, to: 24, at: [MONTSE.x, MONTSE.z], face: [MONTSE.x + 3, MONTSE.z - 2], anim: 'idle' }],
    barks: ['Sixty years in this pot.', 'Three nights to the blessing.'] },
];

const thing = (id: string, p: { x: number; z: number }, label: string, stage: string, text: string, extra: (g: GameApi) => boolean = () => true) => ({
  land: 'morrow' as const, id, x: p.x, z: p.z, label, radius: 2.6,
  when: (g: GameApi) => at(g, Q) === stage && !g.flag(id) && extra(g),
  use: (g: GameApi) => {
    g.setFlag(id, 1); g.toast(text);
    if (stage === 'gather' && got(g) >= 2) g.setStage(Q, 'garden');
    if (stage === 'garden') g.setStage(Q, 'montse');
  },
});

export const FEAST_POT_CONTENT: RegionContent = {
  id: 'feastPot', quests, npcs: NPCS,
  dialogue: { cb_montse: montse },
  spawns: [
    { land: 'morrow', tag: 'cbPotJackal', type: 'terracejackal', at: [[GARDEN.x + 5, GARDEN.z + 3], [GARDEN.x - 4, GARDEN.z + 5], [GARDEN.x + 1, GARDEN.z - 5]], when: (g) => at(g, Q) === 'garden' },
  ],
  things: [
    thing('fpSamphire', SAMPHIRE, 'Pick rock samphire', 'gather', 'Samphire grows in the cracks of the cliff path where the spray reaches, fat green fingers that snap clean and taste of the sea. You fill your hands with it.'),
    thing('fpFish', FISH, 'Take the fish Toni kept back', 'gather', 'Under Toni Rius\'s counter, in a basket of wet weed with a slate on it that says GRAU, a red scorpionfish as long as your forearm, spines and all. "Mind the spines," Toni says, without looking round. "Tell her it\'s the best of the week. It is."'),
    thing('fpSaffron', P(-31, -21), 'Pick the saffron', 'garden', 'Behind the garden wall, where the jackals have dug, the crocuses are still standing in their rows, purple, with three red threads in each. You pick them the way you\'ve seen it done, with a thumbnail, into a twist of cloth.', (g) => jackals(g) >= 3),
  ],
};
