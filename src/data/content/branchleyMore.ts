import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { MORROW_OX, TOWNS } from '../../world/morrow';

// More of Branchley, in the Amberwold (docs/LORE.md "Branchley"). The village up its two great trees keeps a lending
// chest at the foot of the post: take what you need, bring it back when you're done. Nobody writes anything down.
//
// bwLend, THE LENDING CHEST (Mags Briar): the chest has been going empty. A saw, a lamp, a kettle, and last night a
// child's blanket, and nothing has come back. Prints from the chest go off into the Wold to a clearing where Nye Holt,
// a widower off the Glass Flats, is camped with his two children in a clearing. He took them, and he has
// every one of them, oiled and folded, and a tally of what he owes scratched on a slate. He meant to bring them back
// when he could pay for the use of them. Ask him up to the platform, tell him how the chest works (take and bring
// back, nobody pays), or let Ivo Larch move him on out of the Wold. bwLend = 'up' | 'told' | 'moved'.

const LEND = 'bwLend';
const T = TOWNS.branchley;
const CHEST = { x: T.post[0] + 3, z: T.post[1] + 3.5 };
const CAMP = { x: 690 + MORROW_OX + 0.5, y: 22, z: 1580.5 };

const magsNodes: Record<string, DNode> = {
  bl1: { text: 'The lending chest by the post. You take what you need and bring it back when you\'re done. It\'s worked since my grandmother\'s time. It\'s going empty.', next: 'bl2' },
  bl2: { text: 'A saw. A lamp. My big kettle. Last night a child\'s blanket, off the top. Nothing\'s come back. Branchley doesn\'t steal from itself. Will you look? I\'d go, but somebody has to mind the bread.', options: [{ text: 'I\'ll look at the chest.', effect: (g) => g.setStage(LEND, 'chest') }, { text: 'Not now.' }] },
  bb1: { text: 'A man off the Flats, with two children, in a clearing a quarter-mile from my oven, sleeping on the ground. Since when? And nobody saw him. Of course nobody saw him. He didn\'t want to be seen.', next: 'bb2' },
  bb2: {
    text: 'And a slate of what he owes us. For borrowing. Oh, the poor fool. What do we do?',
    options: [
      { text: 'Ask him up to the platform. There\'s room in the trees.', moral: { id: 'bwLend:up', tr: { compassion: 2, generosity: 1 }, npc: { mags_briar: 15, bw_nye: 25 } }, effect: (g) => { g.setFlag(LEND, 'up'); g.addMarks(60); g.setStage(LEND, 'done'); }, next: 'bbU' },
      { text: 'Tell him how the chest works. Take and bring back. Nobody pays.', moral: { id: 'bwLend:told', tr: { honesty: 2 }, npc: { mags_briar: 10, bw_nye: 15 } }, effect: (g) => { g.setFlag(LEND, 'told'); g.addMarks(60); g.setStage(LEND, 'done'); }, next: 'bbT' },
      { text: 'Have Ivo move him on. The Wold isn\'t his.', moral: { id: 'bwLend:moved', tr: { loyalty: 1, cruelty: 2 }, npc: { mags_briar: -15, bw_nye: -30, ivo_larch: 5 } }, effect: (g) => { g.setFlag(LEND, 'moved'); g.addMarks(60); g.setStage(LEND, 'done'); }, next: 'bbM' },
    ],
  },
  bbU: { speaker: 'narrator', text: 'Mags takes her apron off, puts two loaves under her arm and walks out into the Wold herself. By dark there are three more people on the platform than there were that morning, and the Larches have given up their spare room without being asked twice. Mags pays you out of the bread money.' },
  bbT: { text: 'Then I\'ll walk out and tell him myself, with a loaf, and bring my kettle back. He can borrow it again tomorrow. That\'s the point of it. Here, for your trouble.' },
  bbM: { text: 'Ivo will do it. He won\'t like it, and nor do I. Here. Take it. I don\'t want to look at it.' },
  blAfter: {
    text: (g) => (g.flag(LEND) === 'up'
      ? 'Nye\'s cutting larch for the new walk. The children have got the whole platform running errands for them. He still keeps his slate. He says it\'s a habit.'
      : g.flag(LEND) === 'told'
        ? 'Everything\'s back in the chest, oiled. He borrows the saw most mornings and brings it back sharper than he took it.'
        : 'The chest\'s full again. I don\'t look in it much.'),
    next: 'a',
  },
};

const nye: DialogueTree = {
  start: (g) => (at(g, LEND) === 'camp' ? 'n1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(LEND) === 'up' ? 'Good wood, larch. Straight. You can trust it.' : g.flag(LEND) === 'moved' ? 'We\'re going. Give us the morning.' : 'Morning.'),
      options: [{ text: 'Good day.' }],
    },
    n1: { speaker: 'narrator', text: 'A sunburned man in a caravan guard\'s coat gone pale with dust, sitting on the bare earth of a clearing with his back to the way he came. Two children are asleep against the bank behind him, under a blanket with a briar leaf stitched in the corner. Beside him, laid out on a sack: a saw, a lamp, a kettle, all oiled.', next: 'n2' },
    n2: { text: 'Nye Holt. Off the Flats. The reavers took our wells, and my wife, and I walked the children out west till the trees started. I took your things. I know I did. I\'ve every one of them here, and what I owe for the use of them on that slate.', next: 'n3' },
    n3: {
      text: 'I meant to bring them back when I could pay. On the Flats you pay for everything. Water by the skin. I didn\'t know what else to do with a chest of things nobody was watching.',
      options: [{ text: 'I\'ll talk to Mags.', effect: (g) => g.setStage(LEND, 'back') }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [LEND]: {
    id: LEND, name: 'The Lending Chest', region: 'amberwold', depth: 'quest',
    notes: (g, s) => {
      if (s === 'chest') return 'Branchley\'s lending chest by the post is going empty, and nothing comes back. Mags Briar wants to know where it\'s all going.';
      if (s === 'camp') return 'Small bare footprints and a grown man\'s, from the chest off into the Wold to the west.';
      if (s === 'back') return 'Nye Holt, a widower off the Glass Flats, camped in the Wold with his two children. He has all of it, and a slate of what he owes. Back to Mags Briar.';
      const f = g.flag(LEND);
      return f === 'up' ? 'Nye Holt and his children live up the trees in Branchley now.' : f === 'told' ? 'Nye Holt borrows from the chest like everyone else.' : 'Ivo Larch moved Nye Holt on out of the Wold.';
    },
    objectives: (_g, s) => (s === 'chest' ? [{ text: 'Look at the lending chest by the post', marker: 'bwChest' }]
      : s === 'camp' ? [{ text: 'Follow the prints into the Wold', marker: 'bw_nye' }]
      : s === 'back' ? [{ text: 'Back to Mags Briar', marker: 'mags_briar' }] : []),
    marks: (_g, s): Marks => (!s ? { mags_briar: '!' } : s === 'camp' ? { bw_nye: '?' } : s === 'back' ? { mags_briar: '?' } : {}),
    walk: { cast: ['mags_briar', 'bw_nye'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'bwChest', x: CHEST.x, z: CHEST.z, label: 'Look in the lending chest', radius: 2.4, look: 'crate',
    when: (g) => at(g, LEND) === 'chest',
    use: (g) => { g.setStage(LEND, 'camp'); g.toast('A long oak chest at the foot of the post, its lid worn pale by hands. Inside: a coil of rope, a mallet, two buckets, and a lot of empty. In the soft earth round it, a grown man\'s boots and a child\'s bare feet, going west into the Wold, and back, and west again.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'bw_nye', name: 'Nye Holt', title: 'Off the Glass Flats', look: { skin: '#b07a50', hair: '#3a2a1e', hairStyle: 0, facial: 4, eyes: '#4a3a2a', tunic: '#c8b890', trim: '#8a7a5a', shirt: '#d8d0c0', trousers: '#6a5a4a', boots: '#3a2a1e', hat: 'kerchief', hatColor: '#d8c8a0', build: 1.05, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x, CAMP.z], face: [CAMP.x + 3, CAMP.z], anim: 'seated', y: CAMP.y }],
    barks: ['Straight wood, larch.', 'I pay what I owe.'] },
];

export const BRANCHLEY_MORE: RegionContent = {
  id: 'branchleyMore',
  npcs: NPCS,
  dialogue: { bw_nye: nye },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'mags_briar', (g) => (at(g, LEND) === 'back' ? 'bb1' : undefined), magsNodes);
    addOption(D, 'mags_briar', 'a', { text: 'Is something wrong, Mags?', cond: (g) => !at(g, LEND), next: 'bl1' });
    addOption(D, 'mags_briar', 'a', { text: 'About the lending chest.', cond: (g) => at(g, LEND) === 'done', next: 'blAfter' });
  },
};
