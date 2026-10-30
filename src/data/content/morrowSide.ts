import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// Morrow's side stories, in the towns of the wilds (see morrowTowns.ts for the people).
//
// mwNights, THE LONG NIGHTS (Ivo Larch, lamplighter, Branchley; after his Lampwick): the Wold folk
// paint every doorpost on the old road with lamp-moth dust before the long nights. You brought him the
// dust; he did the trees, but his hands shake on the brush now, and three posts are left: Mags's, the
// Briar end and the widow Fenn's. Paint them, and he gives you his brush: next year, if you're passing.
// 'paint' -> 'brush' -> done.
//
// mwSalt, THE FOURTH WELL (Ennis Wade, Tenwells): one of the fort's ten wells went salt overnight. The
// caravan folk blame the storm-hunters' copper rod; Ennis tastes rock salt, in lumps. Outside the east
// wall, empty sacks stamped with a white hand: the salt reavers, whose own wells a day north charge a
// mark a skin. 'well' -> 'cass' -> 'reavers' (Cass rides out; you go first and break the reavers at
// their wells) -> 'cassBack' -> done, or done at once ('quiet': a new well sunk, and nobody tells the
// reavers it worked). Choice mwSalt = 'ride' | 'quiet'.
//
// mwFlood, FLOOD MARKS (Orla Pike, reeve of Reedwater; after her Sawgrass job): this spring's flood came
// up past every mark on the meeting post, her grandmother's included, and the Assembly in Callis says
// Reedwater should move inland to its new terraces, for its own good. Out in the sawgrass stand three
// flood-stones older than the post. Read them: the oldest has the high water a hand above your head, and
// under it a stilt house drawn in five lines, still standing. 'stones' -> 'orla' -> done. Choice mwFlood
// = 'stilts' (Reedwater raises its stilts a block, its own way) | 'masons' (the Assembly sends masons,
// and a levy with them).

const MX = 6400;
const NIGHTS = 'mwNights', SALT = 'mwSalt', FLOOD = 'mwFlood';
/** Reedwater's flood-stones out in the sawgrass round the stilts, the oldest farthest out. */
const STONES: [string, number, number, string][] = [
  ['mwStone1', MX + 1222.5, 2512.5, 'Cut deep and worn soft: a wavy line, and beside it a bundle of reeds. The line is at your knee.'],
  ['mwStone2', MX + 1292.5, 2582.5, 'A wavy line at your waist, and four strokes beside it. Four years, or four days. Nobody wrote which.'],
  ['mwStone3', MX + 1250.5, 2590.5, 'The oldest. The wavy line is a hand above your head, and under it, small, a stilt house in five lines. Still standing.'],
];
/** Branchley's old road (sites buildBranchley: the street along x at the town's middle), three doorposts along it. */
const POSTS: [string, number, number][] = [['mwPostA', MX + 715.5, 1633.5], ['mwPostB', MX + 742.5, 1633.5], ['mwPostC', MX + 758.5, 1626.5]];
/** Tenwells (sites: the fort round a yard of wells): the fourth well, and the gully outside the east wall. */
const WELL: [number, number] = [MX + 1052.5, -211.5], GULLY: [number, number] = [MX + 1092.5, -196.5];
/** The reavers' wells, a day north of the fort out in the glare. */
const REAVER_WELLS: [number, number][] = [[MX + 1040, -330], [MX + 1046, -336], [MX + 1034, -338]];

const items: ItemDef[] = [
  { id: 'reaver_sack', name: 'An empty salt sack', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#e8e0d0', b: '#8a7a5a' }, desc: 'Coarse sacking, gritty with rock salt, stamped with a white hand: the salt reavers\' mark.' },
  { id: 'ivos_brush', name: 'Ivo\'s brush', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'log', a: '#ffb040', b: '#6a4a2a' }, desc: 'A lamplighter\'s brush, the bristles stiff with forty years of lamp-moth dust. It glows a little in the dark, still.' },
];

// ---------------------------------------------------------------- The Long Nights
const ivoNodes: Record<string, DNode> = {
  ln1: {
    text: 'The posts are glowing all down the old road. Your dust. I\'ve a harder thing to ask you now.',
    options: [{ text: 'Go on.', next: 'ln2' }, { text: 'Another time.' }],
  },
  ln2: {
    text: 'My hands shake on the brush. I did the trees, but I can\'t do the doorposts. Three are left: Mags\'s, the Briar end, and the widow Fenn\'s.',
    options: [{ text: 'I\'ll paint them.', effect: (g) => g.setStage(NIGHTS, 'paint') }, { text: 'Not tonight.' }],
  },
  lnWait: { text: 'The three posts on the old road. Mags\'s, the Briar end, and the widow Fenn\'s.', options: [{ text: 'Going.' }] },
  ln5: {
    text: 'Look at that. You can see the whole road from here. Forty years I\'ve done that.',
    options: [{ text: 'You\'ll do it next year.', next: 'ln6' }],
  },
  ln6: {
    text: 'No. Take the brush. Next year, if you\'re passing. Somebody has to, and you\'ve the hand for it.',
    options: [{ text: 'I\'ll come back.', effect: (g) => { g.give('ivos_brush'); g.addMarks(150); g.setStage(NIGHTS, 'done'); } }],
  },
  lnAfter: { text: 'The road\'s still glowing. Widow Fenn says she came home by it every night this week, and she never goes out.', options: [{ text: 'Good.' }] },
};


// ---------------------------------------------------------------- The Fourth Well
const ennisNodes: Record<string, DNode> = {
  sw1: {
    text: 'The fourth well\'s gone salt. Overnight. Ten wells in this yard, and three hundred years of nobody spoiling one.',
    options: [{ text: 'How does a well go salt?', next: 'sw2' }],
  },
  sw2: {
    text: 'The caravan folk say the storm-hunters\' rod: lightning in the water. Cass says rot. Taste it yourself, then look outside the east wall.',
    options: [{ text: 'Why the east wall?', next: 'sw3' }],
  },
  sw3: {
    text: 'Because if somebody did this, they carried the salt, and the east gate\'s the one nobody watches.',
    options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(SALT, 'well') }, { text: 'Not now.' }],
  },
  swWait: { text: 'Taste the fourth well. Then the gully outside the east wall.', options: [{ text: 'Going.' }] },
  swAfter: {
    text: (g) => (g.flag('mwSalt') === 'ride' ? 'The reavers\' wells are rubble, and the caravans water here again. The fourth well\'s still salt. We\'ll sink another.' : 'New well\'s sweet. Deeper than the old one. The reavers are still waiting for the caravans, and they\'re not coming.'),
    options: [{ text: 'Good.' }],
  },
};

const cassNodes: Record<string, DNode> = {
  cs1: {
    text: 'A white hand. The reavers. Their own wells are a day north, and they charge a mark a skin.',
    options: [{ text: 'One salt well here, and the caravans go round by theirs.', next: 'cs2' }],
  },
  cs2: {
    text: 'That\'s it exactly. I can ride out with the guards. Or we sink a new well and say nothing, and the reavers never know it worked.',
    options: [
      { text: 'Ride out. I\'ll go first.', next: 'csRide' },
      { text: 'Sink a new well. Say nothing.', next: 'csQuiet' },
    ],
  },
  csRide: {
    text: 'Then go. Their wells are a day north, out in the glare. Break whoever\'s guarding them. The guards and I will follow and fill them in.',
    options: [{ text: 'Going.', effect: (g) => { g.take('reaver_sack'); g.setFlag('mwSalt', 'ride'); g.setStage(SALT, 'reavers'); } }],
  },
  csQuiet: {
    text: 'Quiet, then. Ennis will dig deeper than the old one. Here, for your nose. You found it before the caravans did.',
    options: [{ text: 'Good luck with the digging.', effect: (g) => { g.take('reaver_sack'); g.addMarks(150); g.setFlag('mwSalt', 'quiet'); g.setStage(SALT, 'done'); } }],
  },
  csWait: { text: (g) => `Their wells, a day north. ${Math.min(3, killed(g, 'mwReavers'))} of three.`, options: [{ text: 'What have you got?', effect: (g) => g.openShop('cass_moran'), cond: (g) => at(g, 'tenReavers') === 'done' }, { text: 'Going.' }] },
  csBack: {
    text: 'We filled their wells in with their own salt. The caravans water here again. Here: the company\'s thanks, and mine.',
    options: [{ text: 'Safe roads, Cass.', effect: (g) => { g.addMarks(260); g.setStage(SALT, 'done'); } }],
  },
};

// ---------------------------------------------------------------- Flood Marks
const orlaNodes: Record<string, DNode> = {
  fm1: {
    text: 'This spring\'s flood came up past every mark on the meeting post. My grandmother\'s too.',
    options: [{ text: 'Was anyone hurt?', next: 'fm2' }, { text: 'Bad luck.' }],
  },
  fm2: {
    text: 'Nobody. The stilts held. But the Assembly in Callis says we should move inland, to their new terraces. For our own good. They\'ll send carts.',
    options: [{ text: 'Do you want to go?', next: 'fm3' }],
  },
  fm3: {
    text: 'No. There are flood-stones out in the sawgrass, older than the post. If one stands higher than this spring, we\'ve been here before and stayed. Read them for me?',
    options: [{ text: 'I\'ll read them.', effect: (g) => g.setStage(FLOOD, 'stones') }, { text: 'Not now.' }],
  },
  fmWait: { text: 'Three stones, out in the sawgrass round the walks. The oldest is farthest out.', options: [{ text: 'Going.' }] },
  fm4: {
    text: 'A hand above your head, and a stilt house drawn under it, standing. Two hundred years, maybe more.',
    options: [{ text: 'They stayed.', next: 'fm5' }],
  },
  fm5: {
    text: 'They stayed. So what do I tell Callis?',
    options: [
      { text: 'Tell them no. Raise the stilts a block, Reedwater\'s own way.', next: 'fmStilts' },
      { text: 'Show them the stone, and ask for masons to raise the stilts.', next: 'fmMasons' },
    ],
  },
  fmStilts: {
    text: 'Our own way. Tam will grumble about cutting larch all winter, and then he\'ll cut more than anyone. Here. For the walk.',
    options: [{ text: 'Good luck with the larch.', effect: (g) => { g.addMarks(140); g.give('reed_beer', 2); g.setFlag('mwFlood', 'stilts'); g.setStage(FLOOD, 'done'); } }],
  },
  fmMasons: {
    text: 'Masons, then, and a levy behind them. The Assembly never sends anything for nothing. But the walks will be stone at the foot. Here. For the walk.',
    options: [{ text: 'It\'s a fair trade.', effect: (g) => { g.addMarks(140); g.setFlag('mwFlood', 'masons'); g.setStage(FLOOD, 'done'); } }],
  },
  fmAfter: {
    text: (g) => (g.flag('mwFlood') === 'stilts' ? 'Half the houses are up a block already. Tam\'s cut more larch than anyone, and won\'t stop telling us.' : 'The masons came with the levy-man a day behind. The walks have stone feet now. We\'ll see what it costs.'),
    options: [{ text: 'Good.' }],
  },
};

const quests: Record<string, QuestDef> = {
  [FLOOD]: {
    id: FLOOD, name: 'Flood Marks', region: 'glades', depth: 'quest',
    notes: (g, s) => {
      if (s === 'stones') return 'This spring\'s flood rose past every mark on Reedwater\'s meeting post, and the Assembly wants the village moved inland. Orla Pike wants the old flood-stones in the sawgrass read: if one stands higher, they\'ve been here before and stayed.';
      if (s === 'orla') return 'The oldest flood-stone has the water a hand above my head, and a stilt house drawn under it, still standing. Orla should hear it.';
      return g.flag('mwFlood') === 'stilts' ? 'Reedwater stayed, and raised its stilts a block its own way.' : 'Reedwater stayed. The Assembly sent masons to put stone feet under the walks, and a levy with them.';
    },
    objectives: (g, s) => (s === 'stones' ? STONES.map(([id], i) => ({ text: ['Read the flood-stone south-west of the walks', 'Read the flood-stone south-east of the walks', 'Read the oldest flood-stone, farthest out'][i], marker: id, done: !!g.flag(id) }))
      : s === 'orla' ? [{ text: 'Go back to Orla Pike', marker: 'orla_pike' }] : []),
    marks: (_g, s): Marks => (s === 'orla' ? { orla_pike: '?' } : {}),
    walk: { cast: ['orla_pike'], from: { quests: { reedLizards: 'done' } } },
  },
  [NIGHTS]: {
    id: NIGHTS, name: 'The Long Nights', region: 'amberwold', depth: 'quest',
    notes: (g, s) => {
      if (s === 'paint') return 'The moth dust I brought Ivo Larch is ground and ready, but his hands shake on the brush. He asked me to paint the three doorposts left on the old road.';
      if (s === 'brush') return 'The old road glows. Ivo will want to see it.';
      return 'Ivo gave me his brush. Next year, if I\'m passing.';
    },
    objectives: (g, s) => {
      if (s === 'brush') return [{ text: 'Go back to Ivo Larch', marker: 'ivo_larch' }];
      if (s === 'paint') return POSTS.map(([id], i) => ({ text: ['Paint Mags Briar\'s doorpost', 'Paint the post at the Briar end', 'Paint the widow Fenn\'s doorpost'][i], marker: id, done: !!g.flag(id) }));
      return [];
    },
    marks: (_g, s): Marks => (s === 'brush' ? { ivo_larch: '?' } : {}),
    walk: { cast: ['ivo_larch'], from: { quests: { woldLamps: 'done' } } },
  },
  [SALT]: {
    id: SALT, name: 'The Fourth Well', region: 'glassflats', depth: 'quest',
    notes: (g, s) => {
      if (s === 'well') return 'One of Tenwells\' ten wells went salt overnight. Ennis Wade wants me to taste it, then look in the gully outside the east wall.';
      if (s === 'cass') return 'Rock salt in the well, in lumps, and empty sacks outside the east wall stamped with a white hand: the salt reavers. Cass Moran runs the caravans.';
      if (s === 'reavers') return `The reavers salted the well to send the caravans round by their own, a day north, at a mark a skin. Cass will follow me out and fill their wells in. (${Math.min(3, killed(g, 'mwReavers'))}/3)`;
      if (s === 'cassBack') return 'The reavers at their wells are broken. Cass and the guards will be filling them in.';
      return g.flag('mwSalt') === 'ride' ? 'We broke the reavers at their wells and filled them in with their own salt. The caravans water at Tenwells again.' : 'Ennis sank a new well, deeper, and nobody told the reavers it worked.';
    },
    objectives: (g, s) => {
      if (s === 'well') return [
        { text: 'Taste the fourth well', marker: 'mwWell', done: !!g.flag('mwTasted') },
        { text: 'Look in the gully outside the east wall', marker: 'mwGully', done: g.count('reaver_sack') > 0 },
      ];
      if (s === 'cass') return [{ text: 'Show the sack to Cass Moran', marker: 'cass_moran' }];
      if (s === 'reavers') return [{ text: `Break the reavers at their wells, a day north (${Math.min(3, killed(g, 'mwReavers'))}/3)`, done: killed(g, 'mwReavers') >= 3 }];
      return s === 'cassBack' ? [{ text: 'Go back to Cass Moran', marker: 'cass_moran' }] : [];
    },
    advance: (g, s) => (s === 'reavers' && killed(g, 'mwReavers') >= 3 ? 'cassBack' : null),
    marks: (_g, s): Marks => (s === 'cass' || s === 'cassBack' ? { cass_moran: '?' } : {}),
    walk: { cast: ['ennis_wade', 'cass_moran'] },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'mwReavers', type: 'saltreaver', at: REAVER_WELLS, when: (g) => at(g, SALT) === 'reavers' },
];

const post = ([id, x, z]: [string, number, number], text: string) => ({
  id, x, z, label: 'Paint the doorpost', radius: 2.4,
  when: (g: GameApi) => at(g, NIGHTS) === 'paint' && !g.flag(id),
  use: (g: GameApi) => {
    g.setFlag(id, 1);
    g.toast(text);
    if (POSTS.every(([k]) => g.flag(k))) g.setStage(NIGHTS, 'brush');
  },
});

export const MORROW_SIDE_CONTENT: RegionContent = {
  id: 'morrowSide', items, quests, spawns,
  things: [
    ...STONES.map(([id, x, z, text]) => ({
      id, x, z, label: 'Read the flood-stone', radius: 2.6,
      when: (g: GameApi) => at(g, FLOOD) === 'stones' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (STONES.every(([k]) => g.flag(k))) g.setStage(FLOOD, 'orla'); },
    })),
    post(POSTS[0], 'Grey dust on grey wood. It doesn\'t look like much until you step back into the shade, and it\'s faintly gold.'),
    post(POSTS[1], 'The post at the Briar end, where the old road leaves the town. You give it two coats. It\'s the one people see first.'),
    post(POSTS[2], 'The widow Fenn\'s post. A curtain moves in the window while you work, and then stays open.'),
    {
      id: 'mwWell', x: WELL[0], z: WELL[1], label: 'Taste the fourth well', radius: 2.6,
      when: (g: GameApi) => at(g, SALT) === 'well' && !g.flag('mwTasted'),
      use: (g: GameApi) => { g.setFlag('mwTasted', 1); g.toast('Brine. And not from lightning: there\'s grit at the bottom of the dipper, rock salt, still in lumps.'); if (g.count('reaver_sack') > 0) g.setStage(SALT, 'cass'); },
    },
    {
      id: 'mwGully', x: GULLY[0], z: GULLY[1], label: 'Search the gully', radius: 3,
      when: (g: GameApi) => at(g, SALT) === 'well' && g.count('reaver_sack') === 0,
      use: (g: GameApi) => { if (!g.give('reaver_sack')) return; g.toast('Empty sacks in the gully, a dozen of them, gritty with salt. Each one stamped with a white hand.'); if (g.flag('mwTasted')) g.setStage(SALT, 'cass'); },
    },
  ],
  hooks: (D) => {
    // (after her own job, Sawgrass, is done)
    hook(D, 'orla_pike', (g) => (g.stage('reedLizards') !== 'done' ? undefined : !at(g, FLOOD) ? 'fm1' : at(g, FLOOD) === 'orla' ? 'fm4' : at(g, FLOOD) === 'done' ? 'fmAfter' : 'fmWait'), orlaNodes);
    // (after his own job, Lampwick, is done: the dust's in, and now it's the painting)
    hook(D, 'ivo_larch', (g) => (g.stage('woldLamps') !== 'done' ? undefined : !at(g, NIGHTS) ? 'ln1' : at(g, NIGHTS) === 'brush' ? 'ln5' : at(g, NIGHTS) === 'done' ? 'lnAfter' : 'lnWait'), ivoNodes);
    // (Ennis keeps his shop: the well is something he brings up, not his greeting)
    hook(D, 'ennis_wade', () => undefined, ennisNodes);
    addOption(D, 'ennis_wade', 'a', { text: 'You keep looking at the wells.', next: 'sw1', cond: (g) => !at(g, SALT) });
    addOption(D, 'ennis_wade', 'a', { text: 'About the fourth well.', next: 'swWait', cond: (g) => !!at(g, SALT) && at(g, SALT) !== 'done' });
    addOption(D, 'ennis_wade', 'a', { text: 'How are the wells?', next: 'swAfter', cond: (g) => at(g, SALT) === 'done' });
    hook(D, 'cass_moran', (g) => (at(g, SALT) === 'cass' && g.count('reaver_sack') > 0 ? 'cs1' : at(g, SALT) === 'reavers' ? 'csWait' : at(g, SALT) === 'cassBack' ? 'csBack' : undefined), cassNodes);
  },
};
