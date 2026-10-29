import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { FELL_BARROWS, SLAB_MARKS } from '../../world/morrow';

// Side stories for the far north and the Sunder, where the story passes through and nobody stops.
//
// gwNames, ELEVEN NAMES (Wat Aske, Cold Harbour; after Lie Still): twelve diggers went up Hollow Fell
// and Wat came down. He wants a stone with the other eleven on it, and he has ten names: the youngest
// was a lad from Callis everyone called Callis. When they opened a barrow they nailed their tally tags
// to a post at its foot. Three posts still stand. Fetch the names, then say where the stone goes: down
// at the harbour where they lived, or up on the fell where they are. 'posts' -> 'wat' -> done.
// Choice gwNames = 'harbour' | 'fell'.
//
// slHives, HIVES ON THE HANGING STONE (Ada Moss, Liftwick): the lift moths have found her hives up on
// the slabs; they come at dusk and drink the comb dry, and a robbed hive is a dead one. The slabs rise a
// little every year and her knees don't. Set a smoke pot on each of the three hives and kill five of the
// moths that are fat on her honey. Then: Pol says bring the hives down to the ground, where she can reach
// them and the moths can't find them, and he's right; but the clover on the slab tops is what makes sky
// honey. 'hives' -> 'ada' -> done. Choice slHives = 'ground' | 'stone'.
//
// Northern names are short and old (Aske, Hale, Rusk); the diggers came from everywhere.

const NAMES = 'gwNames', HIVES = 'slHives';

/** The three barrows on Hollow Fell whose posts still stand, west, south and east of Ma's; and what's nailed to each. */
const OPEN = FELL_BARROWS.filter((b) => b[3] === 'open');
const POSTS: [string, number, number, string][] = [
  ['gwPost1', OPEN[0][0] + 0.5, OPEN[0][1] + OPEN[0][2] + 1.5, 'A post at the barrow\'s foot. Four tin tags nailed up it, stamped: HOB, JORY, W FENTON, R FENTON. You work them off the nails.'],
  ['gwPost2', OPEN[1][0] + 0.5, OPEN[1][1] + OPEN[1][2] + 1.5, 'Four tags on this post: ALDER, NEDDY, S GREEN, ASKE. Wat\'s own is with the rest. You take all four.'],
  ['gwPost3', OPEN[3][0] + 0.5, OPEN[3][1] + OPEN[3][2] + 1.5, 'Four tags: TOLLER, B MARCH, OWEN, PROUT. Under PROUT, scratched in with a knife point: CALLIS.'],
];
const posted = (g: GameApi) => POSTS.filter(([id]) => g.flag(id)).length;

/** Ada's hives: one on each of the farmed slabs, beside Pol's plumb marks. */
const HIVE_SPOTS = SLAB_MARKS.map((m, i) => ({ id: 'slHive' + i, x: m.x - 1.5, z: m.z + 1, y: m.y }));
const smoked = (g: GameApi) => HIVE_SPOTS.filter((h) => g.flag(h.id)).length;
const moths = (g: GameApi) => Math.min(5, killed(g, 'type:liftmoth') - Number(g.flag(HIVES + ':base') ?? 0));

// ---------------------------------------------------------------- Eleven Names
const watNodes: Record<string, DNode> = {
  en1: {
    text: 'You\'re back. Good. I\'ve been wanting to ask somebody something, and there\'s nobody else down here to ask.',
    options: [{ text: 'Ask.', next: 'en2' }, { text: 'Another time, Wat.' }],
  },
  en2: {
    text: 'Eleven of them are still up on the fell. I want a stone for them, here or somewhere, with their names cut in. Proper names.',
    options: [{ text: 'You know their names.', next: 'en3' }],
  },
  en3: {
    text: 'Ten of them. The youngest came up from Callis in the spring, and we called him Callis, and I never once asked him what his mother called him.',
    options: [{ text: 'Then how do we find out?', next: 'en4' }],
  },
  en4: {
    text: 'Every barrow we opened, we nailed our tally tags to a post at its foot. Pryce counted the tags to pay us. Three posts are still standing up there.',
    options: [{ text: 'I\'ll bring you the tags.', next: 'en5' }, { text: 'Not now.' }],
  },
  en5: {
    text: 'West of Ma\'s, south of it, and east. Mind yourself. They\'ll have lain down round Ma\'s, but not everywhere.',
    effect: (g) => g.setStage(NAMES, 'posts'),
  },
  enWait: { text: (g) => `Three posts: west of Ma's barrow, south of it, and east. ${posted(g)} of three, so far.` },
  en6: {
    text: 'Let me see them. Hob. Jory. Will and Rob Fenton, the pair of them, always together. Alder. Neddy. Sam Green.',
    next: 'en7',
  },
  en7: {
    text: 'That\'s my own tag. Keep it. Toller. Ben March. Owen. And Prout. Daniel Prout.',
    next: 'en8',
  },
  en8: {
    text: 'He scratched Callis under it himself. Then that\'s what goes on the stone. Daniel Prout, called Callis. He\'d have liked that.',
    next: 'en9',
  },
  en9: {
    text: 'Now, where does it go? Down here, where they slept and ate and argued about pay? Or up on the fell, where they are?',
    options: [
      { text: 'Down here, where people will see it.', next: 'enHarbour' },
      { text: 'Up on the fell, with them.', next: 'enFell' },
    ],
  },
  enHarbour: {
    text: 'Down here, then. The Brethren put in every week for the black. Somebody will read it, even if it\'s only sailors. Here. You did more than fetch tags.',
    options: [{ text: 'Thank you, Wat.', effect: (g) => { g.addMarks(320); g.setFlag(NAMES, 'harbour'); g.setStage(NAMES, 'done'); } }],
  },
  enFell: {
    text: 'Up there, then. Nobody will read it but me and them, and I go up every day with the carts anyway. Here. You did more than fetch tags.',
    options: [{ text: 'Thank you, Wat.', effect: (g) => { g.addMarks(320); g.setFlag(NAMES, 'fell'); g.setStage(NAMES, 'done'); } }],
  },
  enAfter: {
    text: (g) => (g.flag(NAMES) === 'harbour'
      ? 'Two sailors stopped and read the stone yesterday. One of them took his hat off. I didn\'t know him from Adam.'
      : 'I say their names going past the stone every morning, with the cart. Somebody ought to, and it\'s me.'),
  },
};

// ---------------------------------------------------------------- Hives on the Hanging Stone
const adaNodes: Record<string, DNode> = {
  hv1: {
    text: 'Badly. It\'s the moths. The big pale ones off the rifts. They come at dusk and drink the comb dry, and a robbed hive doesn\'t come back.',
    options: [{ text: 'Can\'t you smoke them off?', next: 'hv2' }],
  },
  hv2: {
    text: 'With these, yes. Pots of smoulder, one on each hive, and they\'ll keep the moths off a week. If I could get up to the hives to put them there.',
    options: [{ text: 'You can\'t?', next: 'hv3' }],
  },
  hv3: {
    text: 'The big slab went up a foot last summer, Pol says. My knees didn\'t. Three hives, one on each slab we farm. And the moths are fat with my honey. They won\'t fly fast.',
    options: [
      { text: 'I\'ll set the pots, and thin out the moths.', effect: (g) => { g.setFlag(HIVES + ':base', killed(g, 'type:liftmoth')); g.setStage(HIVES, 'hives'); } },
      { text: 'Not now.' },
    ],
  },
  hvWait: { text: (g) => `One pot on each hive, up on the slabs. ${smoked(g)} of three. And the moths: ${moths(g)} of five.` },
  hv4: {
    text: 'I watched from the tower. Not a moth near them since. You\'ve good knees.',
    next: 'hv5',
  },
  hv5: {
    text: 'Pol says I should bring the hives down to the ground. The moths keep to the slabs, and I could reach them on my own. He\'s right, and I hate it when he\'s right.',
    next: 'hv6',
  },
  hv6: {
    text: 'But it\'s the clover up there that makes it sky honey. Down here it\'s honey. It\'s good honey. It\'s just honey. What would you do?',
    options: [
      { text: 'Bring them down. Honey you can reach is better than honey you can\'t.', next: 'hvGround' },
      { text: 'Leave them up. Make Pol carry the pots once a week.', next: 'hvStone' },
    ],
  },
  hvGround: {
    text: 'Down they come, then. I\'ll tell Pol he was right, once, and then never again. Here. For the pots, and for the knees.',
    options: [{ text: 'Good luck with the moving.', effect: (g) => { g.addMarks(300); g.give('sky_honey', 2); g.setFlag(HIVES, 'ground'); g.setStage(HIVES, 'done'); } }],
  },
  hvStone: {
    text: 'Pol carrying smoke pots up the big slab every week. He\'ll complain all the way up, and he\'ll never miss one. Here. For the pots, and for the knees.',
    options: [{ text: 'He\'ll manage.', effect: (g) => { g.addMarks(300); g.give('sky_honey', 2); g.setFlag(HIVES, 'stone'); g.setStage(HIVES, 'done'); } }],
  },
  hvAfter: {
    text: (g) => (g.flag(HIVES) === 'ground'
      ? 'The hives are down by the tower. The honey\'s paler. People still buy it. I don\'t tell them it used to be better.'
      : 'Pol went up with the pots on Tuesday, complaining. He went up again on Friday, and he wasn\'t asked.'),
  },
};

const quests: Record<string, QuestDef> = {
  [NAMES]: {
    id: NAMES, name: 'Eleven Names', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'posts') return `Wat Aske wants a stone at Cold Harbour for the eleven diggers who didn't come down off Hollow Fell. He doesn't know the youngest's real name. Their tally tags are nailed to posts at three of the barrows. (${posted(g)}/3)`;
      if (s === 'wat') return 'I have all the tally tags from Hollow Fell. Wat Aske should have them.';
      return g.flag(NAMES) === 'harbour' ? 'Wat cut the eleven names into a stone at Cold Harbour, where the boats put in. The youngest was Daniel Prout, called Callis.' : 'Wat set the eleven names on a stone up on Hollow Fell, where they died. The youngest was Daniel Prout, called Callis.';
    },
    objectives: (g, s) => (s === 'posts' ? POSTS.map(([id], i) => ({ text: ['Take the tags from the post west of Ma\'s barrow', 'Take the tags from the post south of it', 'Take the tags from the post east of it'][i], marker: id, done: !!g.flag(id) }))
      : s === 'wat' ? [{ text: 'Bring the tags to Wat Aske at Cold Harbour', marker: 'wat_aske' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'tdHeld') === 'done' ? { wat_aske: '!' } : s === 'wat' ? { wat_aske: '?' } : {}),
    walk: { cast: ['wat_aske'], from: { quests: { tdHeld: 'done' } } },
  },
  [HIVES]: {
    id: HIVES, name: 'Hives on the Hanging Stone', region: 'sunder', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hives') return `The lift moths are robbing Ada Moss's hives on Liftwick's slabs, and she can't climb up to them any more. A smoke pot on each hive, and five of the moths killed. (pots ${smoked(g)}/3, moths ${moths(g)}/5)`;
      if (s === 'ada') return 'The hives are smoked and the moths thinned out. Ada Moss will want to know.';
      return g.flag(HIVES) === 'ground' ? 'Ada brought her hives down off the slabs, where she can reach them. The honey is paler.' : 'Ada\'s hives stayed up on the slabs. Pol Vidal carries the smoke pots up every week, complaining.';
    },
    objectives: (g, s) => (s === 'hives'
      ? [...HIVE_SPOTS.map((h, i) => ({ text: `Set a smoke pot on the hive on the ${['first', 'big', 'falls'][i]} slab`, marker: h.id, done: !!g.flag(h.id) })), { text: `Kill lift moths round Liftwick (${moths(g)}/5)`, done: moths(g) >= 5 }]
      : s === 'ada' ? [{ text: 'Go back to Ada Moss in Liftwick', marker: 'ada_moss' }] : []),
    advance: (g, s) => (s === 'hives' && smoked(g) >= 3 && moths(g) >= 5 ? 'ada' : null),
    marks: (_g, s): Marks => (!s ? { ada_moss: '!' } : s === 'ada' ? { ada_moss: '?' } : {}),
    walk: { cast: ['ada_moss'], kill: { hives: [['liftmoth', 5]] } },
  },
};

export const WASTES_SIDE_CONTENT: RegionContent = {
  id: 'wastesSide', quests,
  things: [
    ...POSTS.map(([id, x, z, text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Take the tally tags', radius: 2.4,
      when: (g: GameApi) => at(g, NAMES) === 'posts' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (posted(g) >= 3) g.setStage(NAMES, 'wat'); },
    })),
    ...HIVE_SPOTS.map((h, i) => ({
      land: 'morrow' as const, id: h.id, x: h.x, z: h.z, y: h.y, label: 'Set the smoke pot on the hive', radius: 2.4,
      when: (g: GameApi) => at(g, HIVES) === 'hives' && !g.flag(h.id),
      use: (g: GameApi) => {
        g.setFlag(h.id, 1);
        g.toast(['The hive on the first slab. The comb at the entrance is chewed to the wood. The smoke goes in thick and the bees go quiet.', 'The big slab\'s hive, a foot higher than it was. You can see the whole of Liftwick from here, and Ada at the tower door, watching.', 'The falls slab. The spray off the falls keeps the smoke low over the hive. Good.'][i]);
        if (smoked(g) >= 3 && moths(g) >= 5) g.setStage(HIVES, 'ada');
      },
    })),
  ],
  hooks: (D) => {
    // (after Lie Still: Wat is home, and has time to think about the others)
    hook(D, 'wat_aske', (g) => (at(g, 'tdHeld') !== 'done' ? undefined : !at(g, NAMES) ? 'en1' : at(g, NAMES) === 'wat' ? 'en6' : at(g, NAMES) === 'done' ? 'enAfter' : 'enWait'), watNodes);
    // (Ada keeps her shop: the hives are something she brings up)
    hook(D, 'ada_moss', () => undefined, adaNodes);
    addOption(D, 'ada_moss', 'a', { text: 'How are the bees?', next: 'hv1', cond: (g) => !at(g, HIVES) });
    addOption(D, 'ada_moss', 'a', { text: 'About the hives.', next: 'hvWait', cond: (g) => at(g, HIVES) === 'hives' });
    addOption(D, 'ada_moss', 'a', { text: 'The hives are smoked, and the moths are thinner.', next: 'hv4', cond: (g) => at(g, HIVES) === 'ada' });
    addOption(D, 'ada_moss', 'a', { text: 'How are the hives?', next: 'hvAfter', cond: (g) => at(g, HIVES) === 'done' });
  },
};
