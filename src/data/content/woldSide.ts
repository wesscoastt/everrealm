import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// Side stories for the Amberwold and the Glass Flats.
//
// awAcorns, ONE FOR EACH (Mags Briar, Branchley): every autumn the Wold plants an acorn for each child
// born that year, along the old road out of Branchley, with the child's name on a peg beside it. The
// leafback boars have been rooting them up, her grandson Tobin's among them. Kill four of the boars and
// set the three pegs' acorns back in. Then Mags asks: fence the seedlings with wattle (they'll live; the
// Wold says a fenced oak grows crooked, and her mother would have had words) or plant two acorns to a
// name from now on and let the boars have one. 'acorns' -> 'mags' -> done. Choice awAcorns = 'fence' |
// 'two'.
//
// gfGlare, OUT IN THE GLARE (Cass Moran, Tenwells): Bel Sorrel, the caravans' drake-handler, walked out
// after a drake that slipped its hobble two days ago and hasn't come back. Her trail runs north-east:
// her water skin, the drake's harness, a cairn she built to find her way home. Past the cairn she's in
// the shade of a dead glassback's shell, glare-blind, with basilisks circling. Kill three and walk her
// back. Cass wants her on the fort's wells now; Bel wants the next caravan out. You tell Cass. 'trail'
// -> 'bel' -> 'cass' -> done. Choice gfGlare = 'ride' | 'wells'.
//
// Wold names are plain and woody (Briar, Larch, Fenn); the Flats' are short and dry (Moran, Wade, Sorrel).

const ACORNS = 'awAcorns', GLARE = 'gfGlare';
const B = TOWNS.branchley, T = TOWNS.tenwells;

/** The three rooted-up pegs along the old road, and the names on them. */
const PEGS: [string, number, number, string][] = [
  ['awPeg1', B.x + 0.5, B.z + 40.5, 'The peg says TOBIN BRIAR. The hole beside it is churned and the acorn\'s gone; you press a new one in from Mags\'s bag and tread the earth down.'],
  ['awPeg2', B.x - 39.5, B.z - 19.5, 'HAZEL FENN. The peg\'s been knocked flat. You stand it up, plant the acorn and firm the soil round it with your heel.'],
  ['awPeg3', B.x + 30.5, B.z + 14.5, 'NO NAME YET, the peg says, in chalk. Somebody hasn\'t decided. You plant the acorn anyway.'],
];
const pegged = (g: GameApi) => PEGS.filter(([id]) => g.flag(id)).length;
const boars = (g: GameApi) => Math.min(4, killed(g, 'type:leafback') - Number(g.flag(ACORNS + ':base') ?? 0));

/** Bel Sorrel's trail out of Tenwells, north-east across the flats, and where she is. */
const TRAIL: [string, number, number, string][] = [
  ['gfSkin', T.x + 70.5, T.z - 39.5, 'A water skin, empty, its stopper on a thong. Branded on the leather: B.S. She dropped it, or she drank it dry and left it to travel light.'],
  ['gfHarness', T.x + 120.5, T.z - 79.5, 'A drake\'s harness, the buckle snapped. The drake shook it off here. Her boot prints keep going, north-east, straight as a rule.'],
  ['gfCairn', T.x + 170.5, T.z - 59.5, 'A cairn of salt blocks, knee high, freshly built, with a strip of red cloth tied round the top stone. She was marking her way home. The prints go on past it.'],
];
const BEL = { x: T.x + 200.5, z: T.z - 99.5 };
const trailed = (g: GameApi) => TRAIL.filter(([id]) => g.flag(id)).length;
const basilisks = (g: GameApi) => Math.min(3, killed(g, 'type:basilisk') - Number(g.flag(GLARE + ':base') ?? 0));

// ---------------------------------------------------------------- One for Each
const magsNodes: Record<string, DNode> = {
  ac1: {
    text: 'Since you ask. The leafbacks have been up the old road rooting, and they\'ve had the acorns out. Our acorns. The ones we plant for the children.',
    options: [{ text: 'You plant acorns for children?', next: 'ac2' }],
  },
  ac2: {
    text: 'One for every child born in the year, along the road out, with a peg and the name on it. Half the oaks on that road are somebody\'s. That big one by the well is mine.',
    next: 'ac3',
  },
  ac3: {
    text: 'This year\'s were three. One of them is my grandson Tobin\'s. I went out this morning and the hole was turned over and the acorn was gone.',
    options: [
      { text: 'I\'ll replant them, and see off the boars.', effect: (g) => { g.setFlag(ACORNS + ':base', killed(g, 'type:leafback')); g.setStage(ACORNS, 'acorns'); } },
      { text: 'Not now, Mags.' },
    ],
  },
  acWait: { text: (g) => `Three pegs along the road, north, west and east of the trees. Here's acorns. ${pegged(g)} of three planted, and the boars: ${boars(g)} of four.` },
  ac4: {
    text: 'Tobin\'s in, and Hazel\'s, and the one with no name. Ivo saw you treading them down. He said you did it like you\'d done it before.',
    next: 'ac5',
  },
  ac5: {
    text: 'Now. Ivo says fence them, wattle hurdles round each one, and the boars can root all they like. It\'d work.',
    next: 'ac6',
  },
  ac6: {
    text: 'But the Wold says a fenced oak grows crooked, and my mother would have said so loudly. The other way is two acorns to a name from now on, and let the boars have one.',
    options: [
      { text: 'Fence them. A crooked oak is still an oak.', next: 'acFence' },
      { text: 'Plant two to a name. Let the boars have their share.', next: 'acTwo' },
    ],
  },
  acFence: {
    text: 'Hurdles, then. If Tobin\'s oak grows crooked I\'ll tell him it was your idea. Here. And a loaf, because you\'ve earned a loaf.',
    options: [{ text: 'Thanks, Mags.', effect: (g) => { g.addMarks(300); g.give('wold_bread', 2); g.setFlag(ACORNS, 'fence'); g.setStage(ACORNS, 'done'); } }],
  },
  acTwo: {
    text: 'Two to a name. My mother would have liked that: it costs nothing but the stooping. Here. And a loaf, because you\'ve earned a loaf.',
    options: [{ text: 'Thanks, Mags.', effect: (g) => { g.addMarks(300); g.give('wold_bread', 2); g.setFlag(ACORNS, 'two'); g.setStage(ACORNS, 'done'); } }],
  },
  acAfter: {
    text: (g) => (g.flag(ACORNS) === 'fence'
      ? 'Three hurdles on the old road, and three little oaks inside them, straight as you like so far. Ask me again in forty years.'
      : 'Six acorns in, two to a name. The boars had one of Hazel\'s last week. The other\'s up and has two leaves.'),
  },
};

// ---------------------------------------------------------------- Out in the Glare
const cassNodes: Record<string, DNode> = {
  gl1: {
    text: 'Have you come in off the flats? Did you see anyone out there? A woman on foot, red scarf, no drake?',
    options: [{ text: 'No. Who is she?', next: 'gl2' }],
  },
  gl2: {
    text: 'Bel Sorrel. She handles the drakes for my caravans. Two days ago a drake slipped its hobble in the night and Bel went after it, on foot, at dawn. She hasn\'t come back.',
    next: 'gl3',
  },
  gl3: {
    text: 'I can\'t send a train out looking. The reavers would have it before noon. One person on foot, though, might find her tracks before the wind does.',
    options: [
      { text: 'Which way did she go?', next: 'gl4' },
      { text: 'Not now.' },
    ],
  },
  gl4: {
    text: 'North-east, out of the east gate. She\'ll have left things for the next person. Bel always does. Take water. Take more than you think.',
    effect: (g) => { g.setFlag(GLARE + ':base', killed(g, 'type:basilisk')); g.setStage(GLARE, 'trail'); },
  },
  glWait: { text: (g) => (at(g, GLARE) === 'trail' ? `North-east of the east gate. Follow what she left. ${trailed(g)} of three things found, so far.` : 'Find her and bring her in. That\'s all. Bring her in.') },
  gl5: {
    text: 'She\'s in the well-house with a wet cloth over her eyes, swearing at Ennis. That\'s Bel. Thank you.',
    next: 'gl6',
  },
  gl6: {
    text: 'Now I have to decide what to do with her. She\'s the best drake-handler between here and Callis, and she walked into the glare after one beast like it was a sister.',
    next: 'gl7',
  },
  gl7: {
    text: 'I want her on the wells, here, inside the walls, where I can see her. She wants to ride out with the next train. Her eyes will be well in a week. You found her. What do I do?',
    options: [
      { text: 'Let her ride. She knew what she was doing, and she left a trail for us.', next: 'glRide' },
      { text: 'Keep her on the wells a season. She nearly died out there.', next: 'glWells' },
    ],
  },
  glRide: {
    text: 'She did leave a trail. She always does. All right. She rides with the next train, and I\'ll put her up front where I can shout at her. Here, from the caravans.',
    options: [{ text: 'She\'ll be fine.', effect: (g) => { g.addMarks(380); g.give('caravan_dates', 3); g.setFlag(GLARE, 'ride'); g.setStage(GLARE, 'done'); } }],
  },
  glWells: {
    text: 'A season on the wells. She\'ll hate it, and she\'ll hate me, and she\'ll be alive to do both. Here, from the caravans.',
    options: [{ text: 'She\'ll forgive you.', effect: (g) => { g.addMarks(380); g.give('caravan_dates', 3); g.setFlag(GLARE, 'wells'); g.setStage(GLARE, 'done'); } }],
  },
  glAfter: {
    text: (g) => (g.flag(GLARE) === 'ride'
      ? 'Bel went out with the Thursday train, front of the line, red scarf. She found the drake on the way, too. It was eating a reaver\'s tent.'
      : 'Bel is mending tack in the well-house and not speaking to me. She\'ll speak to me by spring. She speaks to the drakes all day.'),
  },
};

const quests: Record<string, QuestDef> = {
  [ACORNS]: {
    id: ACORNS, name: 'One for Each', region: 'amberwold', depth: 'quest',
    notes: (g, s) => {
      if (s === 'acorns') return `Branchley plants an acorn on the old road for every child born in the year. The leafback boars have rooted up this year's three, Mags Briar's grandson's among them. Replant them and kill four boars. (acorns ${pegged(g)}/3, boars ${boars(g)}/4)`;
      if (s === 'mags') return 'The acorns are back in and the boars thinned. Mags Briar will want to hear.';
      return g.flag(ACORNS) === 'fence' ? 'Branchley fenced this year\'s seedlings with wattle hurdles, crooked or not.' : 'Branchley plants two acorns to a name now, and lets the boars have one.';
    },
    objectives: (g, s) => (s === 'acorns'
      ? [...PEGS.map(([id], i) => ({ text: `Replant the acorn by the ${['north', 'west', 'east'][i]} peg`, marker: id, done: !!g.flag(id) })), { text: `Kill leafback boars round Branchley (${boars(g)}/4)`, done: boars(g) >= 4 }]
      : s === 'mags' ? [{ text: 'Go back to Mags Briar in Branchley', marker: 'mags_briar' }] : []),
    advance: (g, s) => (s === 'acorns' && pegged(g) >= 3 && boars(g) >= 4 ? 'mags' : null),
    marks: (_g, s): Marks => (!s ? { mags_briar: '!' } : s === 'mags' ? { mags_briar: '?' } : {}),
    walk: { cast: ['mags_briar'], kill: { acorns: [['leafback', 4]] } },
  },
  [GLARE]: {
    id: GLARE, name: 'Out in the Glare', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'trail') return `Bel Sorrel, Cass Moran's drake-handler, walked north-east out of Tenwells after a loose drake two days ago and hasn't come back. She leaves things for the next person. (${trailed(g)}/3 found)`;
      if (s === 'bel') return `Past Bel's cairn, the prints go on north-east. Basilisks hunt the glare out there. (basilisks ${basilisks(g)}/3)`;
      if (s === 'cass') return 'Bel Sorrel is back inside Tenwells, glare-blind for a week but alive. Cass Moran will want to talk.';
      return g.flag(GLARE) === 'ride' ? 'Bel Sorrel rides with the caravans again, up front where Cass can shout at her.' : 'Cass Moran kept Bel Sorrel on the wells for a season. Bel isn\'t speaking to her.';
    },
    objectives: (g, s) => (s === 'trail' ? TRAIL.map(([id], i) => ({ text: ['Find what Bel left north-east of the east gate', 'Follow her prints further out', 'Follow them on to the next thing she left'][i], marker: id, done: !!g.flag(id) }))
      : s === 'bel' ? [{ text: `Kill the basilisks circling Bel (${basilisks(g)}/3)`, done: basilisks(g) >= 3 }, { text: 'Get Bel to her feet', marker: 'gfBel' }]
        : s === 'cass' ? [{ text: 'Tell Cass Moran Bel is back', marker: 'cass_moran' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'tenReavers') === 'done' ? { cass_moran: '!' } : s === 'cass' ? { cass_moran: '?' } : {}),
    walk: { cast: ['cass_moran'], from: { quests: { tenReavers: 'done' } }, kill: { bel: [['basilisk', 3]] } },
  },
};

export const WOLD_SIDE_CONTENT: RegionContent = {
  id: 'woldSide', quests,
  things: [
    ...PEGS.map(([id, x, z, text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Replant the acorn', radius: 2.4,
      when: (g: GameApi) => at(g, ACORNS) === 'acorns' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (pegged(g) >= 3 && boars(g) >= 4) g.setStage(ACORNS, 'mags'); },
    })),
    ...TRAIL.map(([id, x, z, text], i) => ({
      land: 'morrow' as const, id, x, z, label: ['Pick up the water skin', 'Look at the harness', 'Look at the cairn'][i], radius: 2.6,
      // (one at a time: each is only worth finding once you've the one before)
      when: (g: GameApi) => at(g, GLARE) === 'trail' && !g.flag(id) && (i === 0 || !!g.flag(TRAIL[i - 1][0])),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (trailed(g) >= 3) g.setStage(GLARE, 'bel'); },
    })),
    {
      land: 'morrow' as const, id: 'gfBel', x: BEL.x, z: BEL.z, label: 'Help Bel Sorrel up', radius: 2.8,
      when: (g: GameApi) => at(g, GLARE) === 'bel' && basilisks(g) >= 3,
      use: (g: GameApi) => {
        g.toast('Bel Sorrel sits in the shade of a dead glassback\'s shell with her scarf tied over her eyes. "Took you long enough. I can\'t see a thing. Give me your arm and tell me where the sun is." You walk her back to Tenwells.');
        g.setStage(GLARE, 'cass');
      },
    },
  ],
  hooks: (D) => {
    // (Mags keeps her shop: the acorns are something she brings up)
    hook(D, 'mags_briar', () => undefined, magsNodes);
    addOption(D, 'mags_briar', 'a', { text: 'How\'s the Wold?', next: 'ac1', cond: (g) => !at(g, ACORNS) });
    addOption(D, 'mags_briar', 'a', { text: 'About the acorns.', next: 'acWait', cond: (g) => at(g, ACORNS) === 'acorns' });
    addOption(D, 'mags_briar', 'a', { text: 'The acorns are in, and the boars are thinner.', next: 'ac4', cond: (g) => at(g, ACORNS) === 'mags' });
    addOption(D, 'mags_briar', 'a', { text: 'How are the seedlings?', next: 'acAfter', cond: (g) => at(g, ACORNS) === 'done' });
    // (Cass's caravans first: once her reaver job is done, Bel is what's on her mind)
    hook(D, 'cass_moran', (g) => {
      if (at(g, 'tenReavers') !== 'done') return undefined;
      const s = at(g, GLARE);
      return !s ? 'gl1' : s === 'cass' ? 'gl5' : s === 'done' ? 'glAfter' : 'glWait';
    }, cassNodes);
  },
};
