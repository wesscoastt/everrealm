import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// More of Holme Staithe, on the Wrath Levels (levels 14 to 20). Harrowgate's drain is taking the meres
// down a foot a season, and things are coming up out of the mud.
//
// hsPunt, WHAT THE MERE GAVE BACK (Obed Gedge, the old puntsman, at the Eel and Punt): thirty-one years ago his
// brother Thomas went out on the mere in fog and didn't come back. The water's dropped far enough that a punt
// has come up on the mud west of the town, and Obed won't walk out to look. Raft spiders have taken it over.
// Clear them, read the transom (GEDGE, burned in), and bring Obed the word. Choice hsPunt = 'home' (haul it
// back: he'll mend it and put it on the water the day the water comes back) | 'burn' (the Levels' way with a
// drowned man's punt: burnt where it lay, so it doesn't go out again without him). 'mud' -> 'spiders' ->
// 'obed' -> done.
//
// hsReed, ROOTED OUT (Tilly Brewer, the reed cutter, once Brittle Reed is settled): the drain's left the edge of the reed beds dry, and bog
// boars have come in to root up what's left. Drive them off. 'boars' -> 'tilly' -> done.

const PUNT = 'hsPunt', REED = 'hsReed';
/** Holme Staithe's square is at (-890, 1010); its mere is west of the town, and the old reed bed by its east edge (-917.5, 1014.5). */
const HULL: [number, number] = [-924.5, 1021.5];
const SPIDERS: [number, number][] = [[-927, 1024], [-921, 1025], [-926, 1018]];
const BOARS: [number, number][] = [[-913, 1006], [-918, 1003], [-910, 1000], [-915, 998]];

// ---------------------------------------------------------------- What the Mere Gave Back
const obedNodes: Record<string, DNode> = {
  mg1: {
    text: 'There\'s a punt come up on the mud. West, past the old reed bed. The water went down far enough this week, and there she was.',
    options: [{ text: 'Whose punt?', next: 'mg2' }, { text: 'Not now.' }],
  },
  mg2: {
    text: 'Could be anybody\'s. The mere\'s had plenty. My brother Thomas went out in fog thirty-one years back and didn\'t come home, and nor did his punt.',
    next: 'mg3',
  },
  mg3: {
    text: 'I\'m too old to walk out on the mud. That\'s what I tell people. Go and look at her transom. A punt\'s got its name burned in the back.',
    options: [{ text: 'I\'ll go and look.', effect: (g) => g.setStage(PUNT, 'mud') }, { text: 'Not now.' }],
  },
  mgWait: { text: (g) => (at(g, PUNT) === 'mud' ? 'West, past the old reed bed. Mind your feet. The mud takes boots.' : 'Spiders? They\'ll have nested under her. They like a hull. Clear them off and look again.') },
  mgBack: {
    text: 'Well?',
    options: [{ text: 'It says GEDGE on the transom.', next: 'mgBack2' }],
  },
  mgBack2: { speaker: 'narrator', text: 'Obed puts his pint down very slowly, the way you set something down that might spill.', next: 'mgBack3' },
  mgBack3: {
    text: 'Thomas. Thirty-one years, and he was a quarter-mile from the staithe the whole time. We dragged the deep end. He was in the shallows.',
    next: 'mgBack4',
  },
  mgBack4: {
    text: 'There\'s two ways on the Levels with a drowned man\'s punt. You bring her home, or you burn her where she lies, so she doesn\'t go out again without him. Which would you do?',
    options: [
      { text: 'Bring her home. Mend her.', next: 'mgHome' },
      { text: 'Burn her where she lies.', next: 'mgBurn' },
    ],
  },
  mgHome: {
    text: 'Home, then. I\'ll mend her. And the day the company fills that drain in, and it will, I\'ll put her on the water and take her out. Somebody should finish his trip.',
    options: [{ text: 'I hope you get the day.', effect: (g) => { g.addMarks(85); g.setFlag('hsPunt', 'home'); g.setStage(PUNT, 'done'); } }],
  },
  mgBurn: {
    text: 'That\'s the old way. My mother would have said the same. I\'ll walk out tonight with a light. I can walk that far, as it happens. I just didn\'t want to walk it to nothing.',
    options: [{ text: 'Take care on the mud.', effect: (g) => { g.addMarks(85); g.setFlag('hsPunt', 'burn'); g.setStage(PUNT, 'done'); } }],
  },
  mgAfter: {
    text: (g) => (g.flag('hsPunt') === 'home'
      ? 'She\'s in the shed. New strakes, old transom. I sit with her some evenings. Not weird. Shut up.'
      : 'You could see it from the staithe, the fire. Half the village came out. Nobody said anything. That\'s the right amount.'),
  },
};

// ---------------------------------------------------------------- Rooted Out
const tillyNodes: Record<string, DNode> = {
  ro1: {
    text: 'Are you any good with that? Bog boars are in the reed beds. The drain\'s left the edge dry, and dry roots are easy digging.',
    options: [{ text: 'How many?', next: 'ro2' }, { text: 'Not now.' }],
  },
  ro2: {
    text: 'Four I\'ve seen. South of the old bed. Every one they turn over is a bundle I don\'t cut next year. I\'d pay a day\'s reed money to see them gone.',
    options: [{ text: 'I\'ll see them off.', effect: (g) => g.setStage(REED, 'boars') }, { text: 'Not now.' }],
  },
  roWait: { text: (g) => `South of the old bed. ${Math.min(4, killed(g, 'hsBoars'))} of four, by my count.` },
  roBack: {
    text: 'Quiet out there. You can hear the reeds again instead of the snuffling. Here. Don\'t spend it on eel pie. Everyone does.',
    options: [{ text: 'Thanks, Tilly.', effect: (g) => { g.addMarks(55); g.setStage(REED, 'done'); } }],
  },
  roAfter: { text: 'Beds are holding. What\'s left of them. Next problem\'s the drain, and you can\'t stick a spear in a drain.' },
};

const quests: Record<string, QuestDef> = {
  [PUNT]: {
    id: PUNT, name: 'What the Mere Gave Back', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'mud') return 'The mere at Holme Staithe has dropped far enough that an old punt has come up on the mud, west past the old reed bed. Obed Gedge\'s brother Thomas went out in fog thirty-one years ago and never came back. A punt has its name burned in the transom.';
      if (s === 'spiders') return 'Raft spiders have nested under the punt. I\'ll have to clear them before I can get at the transom.';
      if (s === 'obed') return 'The transom says GEDGE. Obed should hear it from me.';
      return g.flag('hsPunt') === 'home' ? 'Obed is mending Thomas\'s punt, for the day the water comes back.' : 'Obed burned Thomas\'s punt where it lay, the Levels\' way. Half the village watched from the staithe.';
    },
    objectives: (g, s) => (s === 'mud' ? [{ text: 'Find the punt on the mud west of the old reed bed', marker: 'hsHull' }]
      : s === 'spiders' ? [{ text: `Clear the raft spiders from the punt (${Math.min(3, killed(g, 'hsSpiders'))}/3)`, done: killed(g, 'hsSpiders') >= 3 }, { text: 'Read the punt\'s transom', marker: 'hsHull' }]
      : s === 'obed' ? [{ text: 'Tell Obed Gedge at the Eel and Punt', marker: 'rafe' }] : []),
    marks: (_g, s): Marks => (!s ? { rafe: '!' } : s === 'obed' ? { rafe: '?' } : {}),
    walk: { cast: ['rafe'], kill: { spiders: [['raftspider', 3]] } },
  },
  [REED]: {
    id: REED, name: 'Rooted Out', region: 'wrath', depth: 'short',
    notes: (_g, s) => (s === 'boars' ? 'Bog boars are rooting up the reed beds at Holme Staithe, where the drain has left the edge dry. Tilly Brewer counted four, south of the old bed.'
      : s === 'tilly' ? 'The boars are gone from the reed beds. Tilly will want to know.' : 'The reed beds are quiet again. Tilly says the next problem is the drain.'),
    objectives: (g, s) => (s === 'boars' ? [{ text: `Drive the bog boars out of the reed beds (${Math.min(4, killed(g, 'hsBoars'))}/4)`, done: killed(g, 'hsBoars') >= 4 }]
      : s === 'tilly' ? [{ text: 'Tell Tilly Brewer at the Eel and Punt', marker: 'tilly' }] : []),
    advance: (g, s) => (s === 'boars' && killed(g, 'hsBoars') >= 4 ? 'tilly' : null),
    marks: (g, s): Marks => (!s && g.stage('otReed') === 'done' ? { tilly: '!' } : s === 'tilly' ? { tilly: '?' } : {}),
    walk: { cast: ['tilly'], kill: { boars: [['bogboar', 4]] }, from: { quests: { otReed: 'done' }, flags: { otReed: 'rent' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hsSpiders', type: 'raftspider', at: SPIDERS, when: (g) => at(g, PUNT) === 'spiders' },
  { tag: 'hsBoars', type: 'bogboar', at: BOARS, when: (g) => at(g, REED) === 'boars' },
];

export const HOLME_MORE_CONTENT: RegionContent = {
  id: 'holmeMore', quests, spawns,
  things: [
    {
      id: 'hsHull', x: HULL[0], z: HULL[1], label: 'Look at the punt on the mud', radius: 2.8,
      when: (g: GameApi) => at(g, PUNT) === 'mud' || (at(g, PUNT) === 'spiders' && killed(g, 'hsSpiders') >= 3),
      use: (g: GameApi) => {
        if (at(g, PUNT) === 'mud') { g.setStage(PUNT, 'spiders'); g.toast('A flat-bottomed punt, black with mud, her pole still lashed along the thwart. Something moves under her. Several somethings, with too many legs.'); }
        else { g.setStage(PUNT, 'obed'); g.toast('You scrape the mud off her transom with your thumb. The letters are burned deep, the way the Levels do it: GEDGE.'); }
      },
    },
  ],
  hooks: (D) => {
    hook(D, 'rafe', (g) => {
      const s = at(g, PUNT);
      return !s ? 'mg1' : s === 'mud' || s === 'spiders' ? 'mgWait' : s === 'obed' ? 'mgBack' : 'mgAfter';
    }, obedNodes);
    hook(D, 'tilly', (g) => {
      const s = at(g, REED);
      if (!s && g.stage('otReed') !== 'done') return undefined;
      return !s ? 'ro1' : s === 'boars' ? 'roWait' : s === 'tilly' ? 'roBack' : 'roAfter';
    }, tillyNodes);
  },
};
