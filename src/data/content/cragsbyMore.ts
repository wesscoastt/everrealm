import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// More of Cragsby, on the Gannet Cliffs (levels 8 to 14).
//
// cgHook, THE NAMELESS HOOK (Morwen Tregear, the Coiled Rope): a new hook went up on her wall a week ago and
// it has no name under it. A stranger went over the north edge, off a stake by the cliff path. His knot is
// still on the stake: a landsman's knot, tied by someone no climmer would go down with. Ewan Skene went down
// for him and brought up his satchel: a Charter surveyor's field book, every gannet stack drawn and measured,
// and on the last page, "North stack: blast for harbour stone, 400 tons." His name is in the front, Hob
// Vosper. 'stake' -> 'ewan' -> 'morwen' -> done. Choice cgHook = 'hook' (his name goes under the hook with
// the climmers: he went over the edge same as ours) | 'book' (the field book goes on to the Charter with a
// letter: the harbour goes ahead, and he gets the credit) | 'burn' (Morwen puts it in the fire; Ewan
// says nothing, which from Ewan is a speech).
//
// cgWall, THROUGH THE WALL (Tib Corran, the Kittiwake): crag boars are getting into the headland fold west of
// the village and the ewes are lambing. Find where they're coming through, drive them off, and mend the gap.
// 'gap' -> 'boars' -> 'mend' -> 'tib' -> done.

const HOOK = 'cgHook', WALL = 'cgWall';
/** Cragsby's square is at (250, -1000); the cliff edge runs north-south east of it (Ewan Skene stands at 262.5, -994.5, facing it). */
const STAKE: [number, number] = [264.5, -1008.5];
/** The headland fold, inland west of the village: the gap in its wall, and where the boars come in from. */
const GAP: [number, number] = [221.5, -992.5];
const BOARS: [number, number][] = [[214, -988], [217, -998], [211, -994], [219, -985]];

const items: ItemDef[] = [
  { id: 'vosper_book', name: 'A surveyor\'s field book', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'book', a: '#5a4a3a', b: '#d8ccb0' }, desc: 'Charter-ruled, salt-stained, every gannet stack off Cragsby drawn and measured in a neat hand. In the front: "H. Vosper, for the Charter Office of Works." On the last page: "North stack: blast for harbour stone, 400 tons."' },
];

// ---------------------------------------------------------------- The Nameless Hook
const morwenNodes: Record<string, DNode> = {
  nh1: {
    text: 'That one. Third from the end. It\'s new, and it\'s got no name under it. I don\'t hang a hook without a name.',
    options: [{ text: 'Whose is it?', next: 'nh2' }, { text: 'Another time.' }],
  },
  nh2: {
    text: 'A stranger. Went over the north edge a week Tuesday, off the stake by the cliff path. Nobody saw him go. Ewan went down for him. There wasn\'t much to bring up.',
    next: 'nh3',
  },
  nh3: {
    text: 'I put the hook up because somebody should. Then I found I couldn\'t write under it. Find out who he was. Start at the stake.',
    options: [{ text: 'I\'ll go and look.', effect: (g) => g.setStage(HOOK, 'stake') }, { text: 'Another time.' }],
  },
  nhWait: {
    text: (g) => (at(g, HOOK) === 'stake' ? 'The stake by the cliff path, north of Ewan\'s. You\'ll see it. It\'s the one with somebody else\'s knot still on it.' : 'Ewan brought something up with him. He won\'t have said. Ask him.'),
  },
  nhBack: {
    text: 'You\'ve got his book. Let me see the front. "H. Vosper, for the Charter Office of Works." A surveyor.',
    next: 'nhBack2',
  },
  nhBack2: { speaker: 'narrator', text: 'She turns to the last page, reads it, and closes the book on her finger.', next: 'nhBack3' },
  nhBack3: {
    text: 'Four hundred tons off the north stack. That\'s where the gannets are thickest. That\'s where we take one egg in three. He came up here to measure us for a harbour.',
    next: 'nhBack4',
  },
  nhBack4: {
    text: 'And he went down on his own, on a knot like that, because not one of my climmers would go down with him. So. What goes under the hook?',
    options: [
      { text: 'His name. He went over the edge, same as yours.', next: 'nhHook' },
      { text: 'Send the book on to the Charter. It was his work.', next: 'nhBook' },
      { text: 'Burn it. Let the stacks be.', next: 'nhBurn' },
    ],
  },
  nhHook: {
    text: 'Hob Vosper. Same chalk, same size letters as the rest. The climmers won\'t like it. They\'ll get used to it. Climmers get used to most things, or they stop being climmers.',
    next: 'nhHook2',
  },
  nhHook2: {
    text: 'The book goes in the drawer under him. If the Charter wants it, they can come up and ask. Here. For going to the stake. Not everybody does.',
    options: [{ text: 'Thank you, Morwen.', effect: (g) => { g.take('vosper_book'); g.addMarks(70); g.setFlag('cgHook', 'hook'); g.setStage(HOOK, 'done'); } }],
  },
  nhBook: {
    text: 'It was his work. You\'re right, and I hate that you\'re right. They\'ll send another man anyway. Better they send him with a finished book than with a reason to come angry.',
    next: 'nhBook2',
  },
  nhBook2: {
    text: 'I\'ll put it on the Post with a letter, so his people know where he is. And I\'ll write his name under the hook in pencil. Pencil comes off, if I change my mind.',
    options: [{ text: 'That\'s fair.', effect: (g) => { g.take('vosper_book'); g.addMarks(70); g.setFlag('cgHook', 'book'); g.setStage(HOOK, 'done'); } }],
  },
  nhBurn: { speaker: 'narrator', text: 'Morwen looks at the book a long time. Then she opens the stove door and feeds it in, a few pages at a time, the way you\'d feed a fire you meant to keep.', next: 'nhBurn2' },
  nhBurn2: {
    text: 'They\'ll send another man. But not this year. The hook can stay as it is. He didn\'t want a name up here, and we didn\'t want him to have one. Fair\'s fair.',
    options: [{ text: 'Fair\'s fair.', effect: (g) => { g.take('vosper_book'); g.addMarks(70); g.setFlag('cgHook', 'burn'); g.setStage(HOOK, 'done'); } }],
  },
  nhAfter: {
    text: (g) => (g.flag('cgHook') === 'hook' ? 'Hob Vosper. Third from the end. The climmers touch it for luck now, same as the others. Nobody told them to.'
      : g.flag('cgHook') === 'book' ? 'His name\'s still in pencil. I haven\'t rubbed it out. I haven\'t inked it either.'
      : 'Still no name under it. Some nights I think that\'s right, and some nights I don\'t.'),
  },
};

const ewanNodes: Record<string, DNode> = {
  eh1: {
    text: 'Morwen\'s hook.',
    options: [{ text: 'You went down for him. Did you bring anything up?', next: 'eh2' }],
  },
  eh2: { speaker: 'narrator', text: 'Ewan looks at the edge for long enough that you think he hasn\'t heard. Then he reaches into the box where he keeps his splicing and takes out a satchel.', next: 'eh3' },
  eh3: {
    text: 'He was on the ledge under the north stack. Measuring it, when the knot went. There was a tape still in his hand.',
    next: 'eh4',
  },
  eh4: {
    text: 'I didn\'t read it. I didn\'t have to. Give it to Morwen. It\'s her wall.',
    options: [{ text: 'I will.', effect: (g) => { g.give('vosper_book'); g.setStage(HOOK, 'morwen'); } }],
  },
};

// ---------------------------------------------------------------- Through the Wall
const tibNodes: Record<string, DNode> = {
  tw1: {
    text: 'You\'re armed. Good. Crag boars are getting into the headland fold, and the ewes are lambing. Two lambs gone this week.',
    options: [{ text: 'How are they getting in?', next: 'tw2' }, { text: 'Not now.' }],
  },
  tw2: {
    text: 'If I knew that I\'d have mended it. The fold\'s inland, west of the houses. Find the gap, see the boars off, and stop it up. I\'ll make it worth the walk.',
    options: [{ text: 'I\'ll see to it.', effect: (g) => g.setStage(WALL, 'gap') }, { text: 'Not now.' }],
  },
  twWait: {
    text: (g) => (at(g, WALL) === 'gap' ? 'West of the houses. Walk the wall till you find where it\'s down.' : at(g, WALL) === 'boars' ? 'They\'ll come at you. Boars are like that up here. The wind makes them short-tempered.' : 'Stones are where they fell. Stack them back.'),
  },
  twBack: {
    text: 'Gap mended and the boars seen off? Then that\'s a fold again and not a larder.',
    next: 'twBack2',
  },
  twBack2: {
    text: 'Here. And eat here tonight. No charge. Mutton, before you ask. Not one of those, before you ask that either.',
    options: [{ text: 'Thanks, Tib.', effect: (g) => { g.addMarks(60); g.setStage(WALL, 'done'); } }],
  },
  twAfter: { text: 'Fold\'s held. Four lambs since. The ewes look at me like it was my idea.' },
};

const quests: Record<string, QuestDef> = {
  [HOOK]: {
    id: HOOK, name: 'The Nameless Hook', region: 'gannet', depth: 'quest',
    notes: (g, s) => {
      if (s === 'stake') return 'A stranger went over the north edge at Cragsby a week ago, and Morwen Tregear put up a hook for him on the Coiled Rope\'s wall. She can\'t write a name under it. He went down off the stake by the cliff path.';
      if (s === 'ewan') return 'His knot is still on the stake: a landsman\'s knot. No climmer tied that, and no climmer went down with him. Ewan Skene went down for him afterwards.';
      if (s === 'morwen') return 'Ewan brought up the stranger\'s satchel: a Charter surveyor\'s field book, H. Vosper, every gannet stack measured. On the last page: "North stack: blast for harbour stone." Morwen should have it.';
      const c = g.flag('cgHook');
      return c === 'hook' ? 'Hob Vosper\'s name is under the hook, in the same chalk as the climmers\'.' : c === 'book' ? 'The field book went on to the Charter, with a letter. His name is under the hook in pencil.' : 'Morwen burned the field book. There\'s still no name under the hook.';
    },
    objectives: (_g, s) => (s === 'stake' ? [{ text: 'Look at the stake by the cliff path', marker: 'cgStake' }]
      : s === 'ewan' ? [{ text: 'Ask Ewan Skene what he brought up', marker: 'skene' }]
      : s === 'morwen' ? [{ text: 'Take the field book to Morwen Tregear at the Coiled Rope', marker: 'morwen' }] : []),
    marks: (_g, s): Marks => (!s ? { morwen: '!' } : s === 'ewan' ? { skene: '?' } : s === 'morwen' ? { morwen: '?' } : {}),
    walk: { cast: ['morwen', 'skene'] },
  },
  [WALL]: {
    id: WALL, name: 'Through the Wall', region: 'gannet', depth: 'short',
    notes: (_g, s) => (s === 'gap' ? 'Crag boars are getting into Cragsby\'s headland fold, inland west of the houses, and the ewes are lambing. Tib Corran wants the gap found.'
      : s === 'boars' ? 'The wall\'s down on the fold\'s west side, and the boars are out on the heath beyond it.'
      : s === 'mend' ? 'The boars are seen off. The gap wants stopping up.'
      : s === 'tib' ? 'The fold\'s a fold again. Tib Corran will want to know.' : 'Tib Corran\'s fold has held. Four lambs since.'),
    objectives: (g, s) => (s === 'gap' ? [{ text: 'Find where the boars get into the fold', marker: 'cgGap' }]
      : s === 'boars' ? [{ text: `Drive off the crag boars (${Math.min(4, killed(g, 'cgBoars'))}/4)`, done: killed(g, 'cgBoars') >= 4 }]
      : s === 'mend' ? [{ text: 'Stack the fallen stones back in the gap', marker: 'cgGap' }]
      : s === 'tib' ? [{ text: 'Tell Tib Corran at the Kittiwake', marker: 'corran' }] : []),
    advance: (g, s) => (s === 'boars' && killed(g, 'cgBoars') >= 4 ? 'mend' : null),
    marks: (_g, s): Marks => (!s ? { corran: '!' } : s === 'tib' ? { corran: '?' } : {}),
    walk: { cast: ['corran'], kill: { boars: [['cragboar', 4]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'cgBoars', type: 'cragboar', at: BOARS, when: (g) => at(g, WALL) === 'boars' },
];

export const CRAGSBY_MORE_CONTENT: RegionContent = {
  id: 'cragsbyMore', items, quests, spawns,
  things: [
    {
      id: 'cgStake', x: STAKE[0], z: STAKE[1], label: 'Look at the stake by the cliff path', radius: 2.6,
      when: (g: GameApi) => at(g, HOOK) === 'stake',
      use: (g: GameApi) => { g.setStage(HOOK, 'ewan'); g.toast('An iron stake, driven deep. Round it, still tight, a knot: a granny knot, two half hitches tied the wrong way round. Any climmer would have seen it. The rope below it is cut clean where Ewan took him off it.'); },
    },
    {
      id: 'cgGap', x: GAP[0], z: GAP[1], label: 'Look at the fold wall', radius: 2.8,
      when: (g: GameApi) => at(g, WALL) === 'gap' || at(g, WALL) === 'mend',
      use: (g: GameApi) => {
        if (at(g, WALL) === 'gap') { g.setStage(WALL, 'boars'); g.toast('The wall is down for three yards, the stones pushed outward, and the turf beyond it is ploughed up by snouts. Grunting, out on the heath.'); }
        else { g.setStage(WALL, 'tib'); g.toast('You stack the stones back the way they came off, big ones low, and wedge the gaps with the small. It isn\'t pretty. It\'ll hold a boar.'); }
      },
    },
  ],
  hooks: (D) => {
    addOption(D, 'morwen', 'hello', { text: 'There\'s a hook on your wall with no name under it.', next: 'nh1', cond: (g) => !at(g, HOOK) });
    addOption(D, 'morwen', 'hello', { text: 'About the stranger\'s hook.', next: 'nhAfter', cond: (g) => at(g, HOOK) === 'done' });
    hook(D, 'morwen', (g) => (at(g, HOOK) === 'morwen' && g.count('vosper_book') > 0 ? 'nhBack' : at(g, HOOK) === 'stake' || at(g, HOOK) === 'ewan' ? 'nhWait' : undefined), morwenNodes);
    hook(D, 'skene', (g) => (at(g, HOOK) === 'ewan' ? 'eh1' : undefined), ewanNodes);
    addOption(D, 'corran', 'main', { text: 'Any trouble up here?', next: 'tw1', cond: (g) => !at(g, WALL) });
    addOption(D, 'corran', 'main', { text: "How's the fold?", next: 'twAfter', cond: (g) => at(g, WALL) === 'done' });
    hook(D, 'corran', (g) => {
      const s = at(g, WALL);
      return s === 'tib' ? 'twBack' : s === 'gap' || s === 'boars' || s === 'mend' ? 'twWait' : undefined;
    }, tibNodes);
  },
};
