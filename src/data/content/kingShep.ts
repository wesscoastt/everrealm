import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import type { ItemDef } from '../items';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { heightAt } from '../../world/terrain';

// King Shep (owner 2026-11-04: "a giant sheep statue in open land with a lunatic inside dressed as a sheep,
// King Shep: someone killed him as a sheep and he was reincarnated; make the story from there").
//
// In the Crownroad's meadows south of Ansbury, a giant wool ram lies in the grass
// (world/sites.ts buildKingShep). In its belly lives a man in a sheepskin and a tin crown who will tell you,
// calmly and at length, that he was a ram called Shep, that he was struck down, and that he came back as a
// man, which he considers a demotion. Nobody knows his other name. He built the statue himself, from wool he
// begged, over two summers, so the flock would know where their king was.
//
// ksRam, THE RAM THAT WAS: he remembers dying at the old fold to the north-west. Go and look. There's a bell
// in the nettles with SHEP scratched on it, and a farm tally gone soft in the rain: "Michaelmas. One ram,
// Shep, past tupping. To the pot. J. Varley." He wasn't murdered. He was dinner. Tell him the truth, or tell
// him he died fighting wolves to save the ewes. ksRam = 'truth' | 'legend'. 'fold' -> 'king' -> done.
//
// ksFlock, THE FLOCK SHALL RISE: whichever story he's living in, the road wolves that work the Crownroad's
// edges are the enemies of sheep, and a king avenges his people. Four of them; then he crowns you.

const RAM = 'ksRam', FLOCK = 'ksFlock';
/** The statue's middle (world/sites.ts: the 'kingshep' site), King Shep's place in its belly, and the old fold. */
const FOLD_SITE: [number, number] = [610, 680];
const THRONE: [number, number] = [FOLD_SITE[0] + 1.5, FOLD_SITE[1] + 0.5];
const OLD_FOLD: [number, number] = [FOLD_SITE[0] - 19.5, FOLD_SITE[1] - 13.5];
const WOLVES: [number, number][] = [[FOLD_SITE[0] + 30, FOLD_SITE[1] + 32], [FOLD_SITE[0] + 36, FOLD_SITE[1] + 26], [FOLD_SITE[0] + 42, FOLD_SITE[1] + 38], [FOLD_SITE[0] + 26, FOLD_SITE[1] + 42]];

const items: ItemDef[] = [
  { id: 'shep_bell', name: 'Shep\'s bell', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'coin', a: '#c8a050', b: '#5a4a2a' },
    desc: 'A little bronze sheep bell, green with years in the nettles. SHEP is scratched into it in a shepherd\'s capitals. It still rings, a bit flat.', stats: 'Keepsake: from King Shep\'s Fold' },
];

const npcs: NpcDef[] = [
  {
    id: 'king_shep', name: 'King Shep', title: 'Once a ram',
    look: { frame: 'm', skin: '#e0b090', hair: '#e8e2d6', hairStyle: 12, eyes: '#6a5a3a', tunic: '#ece6da', trim: '#c8a050', shirt: '#ece6da', trousers: '#e0dace', boots: '#2a2420', top: 2, cape: '#f0eade', hat: 'circlet', hatColor: '#d8b04a', facial: 6, brows: 1, age: 0.75, build: 1.05, freckles: true },
    // (on the statue's floor, its base: looking down from the sky finds the roof)
    schedule: [{ from: 0, to: 24, at: THRONE, y: heightAt(FOLD_SITE[0], FOLD_SITE[1]), face: [THRONE[0] + 3, THRONE[1]], anim: 'idle' }],
    barks: ['Baa. I mean: welcome.', 'Kneel, or at least slouch respectfully.', 'The grass was better when I could eat it.', 'Mind the fleece. It\'s load-bearing.'],
  },
];

const sheep: DialogueTree = {
  start: (g) => {
    const s = at(g, RAM), f = at(g, FLOCK);
    if (!s) return 'meet';
    if (s === 'fold') return 'foldWait';
    if (s === 'king') return 'back';
    if (!f) return 'flock';
    if (f === 'wolves') return 'flockWait';
    if (f === 'crown') return 'crown';
    return 'after';
  },
  nodes: {
    meet: {
      text: 'A visitor. Kneel, if you like. Most people just stare at the fleece. I am King Shep. I was a ram, and now I am this. A man. It\'s a demotion, but I\'m making the best of it.',
      options: [
        { text: 'You were a sheep.', next: 'was' },
        { text: 'Did you build this statue?', next: 'statue' },
        { text: '(Back away slowly)' },
      ],
    },
    statue: {
      text: 'Two summers. Every fleece I could beg off every farm on the Crownroad. A flock needs to know where its king is, and a flock can see a very big sheep from a very long way. Mostly they ignore it. Sheep are like that. I was like that.',
      next: 'was',
    },
    was: {
      text: 'A ram. A good one. Big shoulders, bad temper, excellent wool. Then one morning at the fold, someone struck me down. I remember the cold, and the bell, and then nothing, and then I woke up in a ditch with hands. I\'ve never got used to the hands.',
      options: [
        { text: 'Who struck you down?', next: 'who' },
        { text: 'You know how that sounds.', next: 'sounds' },
      ],
    },
    sounds: { text: 'Like a man who has been a sheep. Yes. I know exactly how it sounds. I have been saying it for nine years. You get used to the faces people make. I made faces at people too, once. Mostly while chewing.', next: 'who' },
    who: {
      text: 'That\'s just it. I don\'t know. The old fold\'s still there, north-west of here, twenty strides. Tumbledown now. I can\'t go back. Every time I try I get as far as the gate and my knees go. Would you look? There might be something. My bell. I had a bell.',
      options: [{ text: 'I\'ll look at the old fold.', effect: (g) => g.setStage(RAM, 'fold') }, { text: 'Not now, your majesty.' }],
    },
    foldWait: { text: 'North-west, twenty strides, the ring of old walling. If you hear a bell, that\'s me. Was me.' },
    back: {
      text: 'You went. Was there anything?',
      options: [{ text: '(Give him the bell) This was in the nettles. It says SHEP.', next: 'bell' }],
    },
    bell: { speaker: 'narrator', text: 'He takes the bell in both hands and rings it once, very softly, against his ear. It is a little flat. His eyes fill.', next: 'bell2' },
    bell2: {
      text: 'That\'s mine. That\'s my voice. Well, it was. And the one who struck me down? Was there anything to say who?',
      options: [
        { text: '(The truth) A farm tally. "One ram, Shep, past tupping. To the pot." You weren\'t murdered. You were mutton.', next: 'truth' },
        { text: '(A kinder story) Wolf tracks, and the ewes untouched. You died holding the gate against wolves.', next: 'legend' },
      ],
    },
    truth: {
      text: 'Mutton. Past tupping. To the pot. All these years I thought there was a villain. There\'s just a man called Varley who was hungry at Michaelmas. That\'s worse, somehow. And better. I suppose I fed somebody. That\'s more than most kings manage.',
      options: [{ text: 'Keep the bell. It\'s yours.', effect: (g) => { g.setFlag(RAM, 'truth'); g.addMarks(120); g.setStage(RAM, 'done'); } }],
    },
    legend: {
      text: 'Wolves. I held the gate against wolves. I knew it. I KNEW it. Nobody believed me in the ditch. Hah. Let them come back now. Let them come back and see what the ewes\' champion has become. Mostly a man in a hat. But a man who held the gate.',
      options: [{ text: 'Keep the bell. It\'s yours.', effect: (g) => { g.setFlag(RAM, 'legend'); g.addMarks(120); g.setStage(RAM, 'done'); } }],
    },
    flock: {
      text: (g) => (g.flag(RAM) === 'truth'
        ? 'I\'ve been thinking about Varley\'s pot. I can\'t be angry at a pot. But the road wolves along the Crownroad\'s edge took three ewes this spring, and ewes are my people still, whatever I am now. A king avenges his people.'
        : 'The wolves. Some of them must still be about. Their sons. Their grandsons. They took three ewes along the Crownroad\'s edge this spring. A king avenges his people.'),
      options: [{ text: 'I\'ll deal with the wolves.', effect: (g) => g.setStage(FLOCK, 'wolves') }, { text: 'Another time.' }],
    },
    flockWait: { text: (g) => `East of the fold, on the meadow's edge. ${Math.min(4, killed(g, 'ksWolves'))} of four. The flock is counting. I am counting. Sheep are bad at counting, so it's mostly me.` },
    crown: {
      text: 'Kneel. No, properly this time. By the power vested in me by the flock, the meadow, and the very big sheep I built: I name you Shepherd of the Realm. The title comes with no lands and no money. It does come with my respect, which used to be worth a whole field.',
      options: [{ text: '(Kneel) I accept, your majesty.', effect: (g) => { g.setFlag('ksShepherd', 1); g.addMarks(160); g.setStage(FLOCK, 'done'); } }],
    },
    after: {
      text: (g) => (g.flag(RAM) === 'truth'
        ? 'Shepherd. I rang the bell this morning and three ewes looked up. Three. They\'ve never looked up before. I think it\'s the bell. I hope it\'s me.'
        : 'Shepherd. I tell the story at the inn now: the night I held the gate. It gets better every time. Last night there were nine wolves. Next week, a bear.'),
    },
  },
};

const quests: Record<string, QuestDef> = {
  [RAM]: {
    id: RAM, name: 'The Ram That Was', region: 'crownroad', depth: 'quest',
    notes: (g, s) => {
      if (s === 'fold') return 'In the Crownroad\'s meadows, a man who calls himself King Shep lives in the belly of a giant wool ram he built himself. He says he was once a ram, struck down at the old fold to the north-west, and came back as a man. He can\'t bring himself to go back there. I said I would.';
      if (s === 'king') return 'In the nettles of the old fold: a bronze bell with SHEP scratched into it, and a farm tally gone soft in the rain. "Michaelmas. One ram, Shep, past tupping. To the pot. J. Varley." I should take the bell to King Shep. What I tell him is up to me.';
      return g.flag(RAM) === 'truth' ? 'I told King Shep the truth: he was mutton, not murdered. He took it better than I thought. He has his bell back.' : 'I told King Shep he died holding the fold\'s gate against wolves. He has his bell back, and a better story.';
    },
    objectives: (_g, s) => (s === 'fold' ? [{ text: 'Search the old fold north-west of the statue', marker: 'ksFold' }] : s === 'king' ? [{ text: 'Take the bell to King Shep', marker: 'king_shep' }] : []),
    marks: (_g, s): Marks => (!s ? { king_shep: '!' } : s === 'king' ? { king_shep: '?' } : {}),
    walk: { cast: ['king_shep'] },
  },
  [FLOCK]: {
    id: FLOCK, name: 'The Flock Shall Rise', region: 'crownroad', depth: 'short',
    notes: (_g, s) => (s === 'wolves' ? 'King Shep wants the road wolves along the Crownroad\'s edge east of his fold dealt with: they took three ewes this spring, and the ewes are his people still.'
      : s === 'crown' ? 'The wolves are gone. King Shep will want to see me.' : 'King Shep named me Shepherd of the Realm. No lands, no money, all his respect.'),
    objectives: (g, s) => (s === 'wolves' ? [{ text: `Drive off the road wolves east of the fold (${Math.min(4, killed(g, 'ksWolves'))}/4)`, done: killed(g, 'ksWolves') >= 4 }]
      : s === 'crown' ? [{ text: 'Return to King Shep', marker: 'king_shep' }] : []),
    advance: (g, s) => (s === 'wolves' && killed(g, 'ksWolves') >= 4 ? 'crown' : null),
    marks: (g, s): Marks => (!s && g.stage(RAM) === 'done' ? { king_shep: '!' } : s === 'crown' ? { king_shep: '?' } : {}),
    walk: { cast: ['king_shep'], kill: { wolves: [['roadwolf', 4]] }, from: { quests: { [RAM]: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'ksWolves', type: 'roadwolf', at: WOLVES, when: (g) => at(g, FLOCK) === 'wolves' },
];

export const KING_SHEP_CONTENT: RegionContent = {
  id: 'kingShep', items, npcs, quests, spawns,
  dialogue: { king_shep: sheep },
  things: [
    {
      id: 'ksFold', x: OLD_FOLD[0], z: OLD_FOLD[1], label: 'Search the old fold', radius: 4,
      when: (g: GameApi) => at(g, RAM) === 'fold',
      use: (g: GameApi) => {
        g.give('shep_bell');
        g.setStage(RAM, 'king');
        g.toast('In the nettles by the fallen gate, a little bronze sheep bell, SHEP scratched in it. Under a stone, a farm tally gone soft in the rain: "Michaelmas. One ram, Shep, past tupping. To the pot. J. Varley."');
      },
    },
  ],
};
