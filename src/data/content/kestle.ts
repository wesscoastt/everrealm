import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Kestle, the sheep village in Verandah's east (OWED 97x stage 9, docs/VERANDAH.md): the fourth beacon of the chain,
// the Kestle Folds where the wolves come down, and the road to the town that everyone says is long.
//
// Matthew Nankivell keeps Kestle's beacon on the hill west of the waymark. He is Sampson Keast's sister's boy, with six
// children and a bad hip. Kensa, his eldest, is fourteen. Thirza Rosewarne has the Folds. Ralph Clemo is Kestle's butcher.
//
// kBeacon, THE QUARTER HOUR (Matthew Nankivell): Kestle's fire is always the last of the four, and Matthew knows why: the climb.
// Up the hill, the basket is choked with a jackdaws' nest, and Kensa is there with a fire of her own laid ready in a
// ring of stones, practising. Let her share the watch, have Matthew sleep in the hut at the top, or ([40 marks]) buy him
// a hill pony. kBeacon = 'kensa' | 'hut' | 'pony'.
//
// kFolds, BAD GROUND (Thirza Rosewarne): the wolves come down to the Folds in summer, which they never used to. At the
// north wall there's a sack of offal thrown over, and a pony's tracks back toward the village. Drive the wolves off,
// then find the pony: it's Ralph's. He buys the sheep the wolves kill as fallen stock, cheap, and sells them in town as
// mutton. Make him pay Thirza, take what he offers to forget it, or ([Courage]) tell him where the next sack goes.
// kFolds = 'paid' | 'bribed' | 'scared'.

const BEACON = 'kBeacon', FOLDS = 'kFolds';
const MATTHEW = { x: -2330.5, y: 17, z: 2420.5 };
const KENSA = { x: -2377.5, y: 38, z: 2414.5 };
const BASKET = { x: -2378.5, y: 38, z: 2412.5 };
const THIRZA = { x: -2337.5, y: 21, z: 2441.5 };
const RALPH = { x: -2326.5, y: 16, z: 2411.5 };
const SACK = { x: -2333.5, z: 2452.5 };
const PONY = { x: -2325.5, z: 2436.5 };
const WOLVES: [number, number][] = [[-2340, 2456], [-2336, 2448], [-2328, 2450]];

const wolvesGone = (g: GameApi) => killed(g, 'kFoldWolves') >= WOLVES.length;

// ================================================================ Matthew Nankivell

const matthew: DialogueTree = {
  start: (g) => {
    const s = at(g, BEACON);
    if (s === 'back') return 'b1';
    return g.flag('kMetMatthew') ? 'hello' : 'p0';
  },
  nodes: {
    p0: { speaker: 'narrator', text: 'A big, soft-faced man propped against the waymark stone, his weight all on one leg, peeling an apple in a single long ribbon for the smallest of a crowd of children who are pretending not to wait for it.', next: 'p1' },
    p1: { text: 'Matthew Nankivell. I keep the fire up the hill, for the king, and these keep me. Off you go, the lot of you. Not you, Bess, this is yours.', effect: (g) => g.setFlag('kMetMatthew', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, BEACON) === 'hill' ? 'The basket\'s at the top of the path, west. Mind the loose stones on the bend.' : 'Quiet out here. Quiet\'s the job.'),
      options: [
        { text: 'Tell me about Kestle.', next: 'place' },
        { text: 'Your uncle at Carn Hold says Kestle\'s fire is always late.', cond: (g) => !at(g, BEACON), next: 'q1' },
        { text: 'How is the watch now?', cond: (g) => at(g, BEACON) === 'done', next: 'after' },
        { text: 'Good day, Matthew.' },
      ],
    },
    place: { text: 'Sheep, mostly. Thirza Rosewarne\'s got the Folds down south of here, Ralph Clemo kills what she sends him, and the rest of us shear and spin and walk to town once a month to sell it. It\'s a long walk. Everybody tells you that the first time. It\'s true every time after.', next: 'hello' },
    q1: { text: 'He\'s right. He usually is, the old devil. It\'s not that I\'m asleep. I see the watch tower\'s fire the same minute he does. It\'s the hill. My hip went under a cart wheel when I was twenty, and that path takes me a quarter of an hour on a good night.', next: 'q2' },
    q2: {
      text: 'And there\'s something wrong with the basket besides. It drew badly at the last test, smoke and no flame. I couldn\'t see why in the dark. Would you go up and look? It\'s at the top of the path, west of here.',
      options: [{ text: 'I\'ll go up.', effect: (g) => g.setStage(BEACON, 'hill') }, { text: 'Not now.' }],
    },
    b1: { text: 'A jackdaws\' nest. Well, that\'s the smoke. And Kensa, up there on her own at night, with a fire laid ready. She never said a word. She\'s fourteen.', next: 'b2' },
    b2: {
      text: 'I\'ll not be late again. I know that much. I don\'t know how.',
      options: [
        { text: 'Let Kensa share the watch. She can be up there before you\'re out of your chair.', moral: { id: 'kBeacon:kensa', tr: { compassion: 1, courage: 1 }, npc: { k_matthew: 10, k_kensa: 20 } }, effect: (g) => { g.setFlag(BEACON, 'kensa'); g.addMarks(60); g.setStage(BEACON, 'done'); }, next: 'bL' },
        { text: 'The warrant\'s in your name. Sleep in the hut at the top on the watch nights.', moral: { id: 'kBeacon:hut', tr: { loyalty: 2, honesty: 1 }, rep: { verandah: 2 }, npc: { k_matthew: 5, k_kensa: -5 } }, effect: (g) => { g.setFlag(BEACON, 'hut'); g.addMarks(60); g.setStage(BEACON, 'done'); }, next: 'bH' },
        { text: '[40 marks] Buy a hill pony. Ralph has one he doesn\'t need.', cond: (g) => g.marks >= 40, moral: { id: 'kBeacon:pony', tr: { generosity: 2, compassion: 1 }, npc: { k_matthew: 20, k_kensa: 5 } }, effect: (g) => { g.addMarks(-40); g.setFlag(BEACON, 'pony'); g.addMarks(60); g.setStage(BEACON, 'done'); }, next: 'bP' },
      ],
    },
    bL: { text: 'She\'ll be impossible. She\'ll be right, mind, and that\'s worse. I\'ll write to the captain and ask him to put her name under mine on the warrant. Here. It\'s the beacon money. It was always going to go on her one way or another.' },
    bH: { text: 'The hut. Eight nights a month on a straw tick with the wind coming under the door. Well. My uncle did forty-one years of it on a bucket. Here, take this. And don\'t tell Kensa it was your idea.' },
    bP: { speaker: 'narrator', text: 'Matthew looks at the marks in his hand for a long moment, and then at you, and doesn\'t say anything at all for a while. Then: "She\'ll be called Quarter. The pony. Here, the beacon money, and don\'t argue, I\'ve six children and I win every argument."' },
    after: {
      text: (g) => (g.flag(BEACON) === 'kensa'
        ? 'Kensa\'s fire went up a minute after Awschitz\'s at the last test. A minute. My uncle wrote to her. Not to me. To her.'
        : g.flag(BEACON) === 'pony'
          ? 'Quarter does the hill in four minutes and bites anyone who isn\'t me. We were second at the last test. Second!'
          : 'Up in the hut on the watch nights, and on time since. My back\'s not thanking you. The captain is.'),
      next: 'hello',
    },
  },
};

// ================================================================ Kensa Nankivell, at the top of the hill

const kensa: DialogueTree = {
  start: (g) => (at(g, BEACON) === 'hill' && g.flag('kNest') && !g.flag('kKensa') ? 'l1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (at(g, BEACON) === 'hill' && !g.flag('kNest') ? 'Have you come about the basket? Look in it. Go on.' : 'You can see all four fires from up here. Well. Three, and ours.'),
      options: [{ text: 'Good day.' }],
    },
    l1: { speaker: 'narrator', text: 'A thin girl with her father\'s face and none of his softness, standing over a ring of stones with a fire laid inside it: dry gorse at the bottom, split wood crossed over, a twist of tarred rope in the heart. It has never been lit.', next: 'l2' },
    l2: { text: 'I\'m not doing anything wrong. It\'s practice. If Da\'s late again I\'ll light this, and the watch tower\'ll see it, and the captain won\'t know it wasn\'t the basket. I\'ve been up here every test night since spring. I\'m quicker than him. I\'m quicker than anybody.', next: 'l3' },
    l3: {
      text: 'Don\'t tell him. He\'ll say it\'s the king\'s fire and it\'s his name on the paper. It is his name on the paper. That\'s the trouble with it.',
      options: [{ text: 'He needs to know about the nest. And about you.', effect: (g) => { g.setFlag('kKensa', 1); g.setStage(BEACON, 'back'); } }],
    },
  },
};

// ================================================================ Thirza Rosewarne, at the Folds

const thirza: DialogueTree = {
  start: (g) => (at(g, FOLDS) === 'tell' ? 't1' : g.flag('kMetThirza') ? 'hello' : 'h0'),
  nodes: {
    h0: { speaker: 'narrator', text: 'A woman with a crook across her shoulders like a yoke and two dogs lying flat at her feet, watching the treeline south of the Folds without blinking. The dogs watch it too.', next: 'h1' },
    h1: { text: 'Thirza Rosewarne. These are my sheep, and so are the ones that aren\'t here any more.', effect: (g) => g.setFlag('kMetThirza', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, FOLDS) === 'look' ? 'The north wall, by the gate. And mind where you put your feet.' : 'The dogs know before I do. Always have.'),
      options: [
        { text: 'You\'re watching the trees.', cond: (g) => !at(g, FOLDS), next: 'q1' },
        { text: 'How are the Folds?', cond: (g) => at(g, FOLDS) === 'done', next: 'after' },
        { text: 'Good day, Thirza.' },
      ],
    },
    q1: { text: 'Wolves come down from the snow in the winter. Everybody knows that. You lose a few, you build the walls higher, the spring comes, they go back up. This year they\'ve not gone back up. It\'s summer, and I\'ve lost nine since the shearing.', next: 'q2' },
    q2: {
      text: 'They go for the north wall every time. Not the low wall on the south, where it\'d be easy. The north. Something\'s bringing them. I\'ve a flock to keep and I can\'t leave it to go and find out what.',
      options: [{ text: 'I\'ll look at the north wall.', effect: (g) => g.setStage(FOLDS, 'look') }, { text: 'Not now.' }],
    },
    t1: { text: 'Offal. Over my wall. And a pony\'s tracks back to the village. There\'s one man in Kestle with a pony and a barrow full of offal every day of the week, and I\'ve sold him every sheep the wolves left me since the spring, for a quarter what they\'re worth, because what else do you do with a torn sheep?', next: 't2' },
    t2: {
      text: 'Ralph. Ralph Clemo. I\'ve known him since we were children. I can\'t go to him. I\'ll put a crook through his face. You go.',
      options: [{ text: 'I\'ll see Ralph.', effect: (g) => g.setStage(FOLDS, 'butcher') }],
    },
    after: {
      text: (g) => (g.flag(FOLDS) === 'bribed'
        ? 'The wolves went back up the hill when the sacks stopped. I\'m still short nine sheep, and Ralph still nods to me on the road. I don\'t nod back.'
        : g.flag(FOLDS) === 'scared'
          ? 'Ralph\'s not been past the Folds since. Goes round by the shore. The wolves went back up the hill when the sacks stopped.'
          : 'Ralph paid me for the nine, to the mark, and stood there while I counted it. The wolves have gone back up the hill. I\'ll not forgive him. I\'ll sell him lambs in the spring.'),
      next: 'hello',
    },
  },
};

// ================================================================ Ralph Clemo, the butcher

const ralph: DialogueTree = {
  start: (g) => (at(g, FOLDS) === 'butcher' ? 'w1' : 'hello'),
  nodes: {
    hello: {
      text: 'Mutton, hogget, a bit of ham if you ask nicely. All of it walked here on its own legs.',
      options: [{ text: 'Good day.' }],
    },
    w1: { speaker: 'narrator', text: 'A neat, pink, careful man in a clean apron, wiping a knife that is already clean. Behind his shop, a fat brown hill pony with offal on its barrow shafts looks at you over the fence.', next: 'w2' },
    w2: { text: 'I don\'t know what Thirza\'s told you. The wolves come down every year. I can\'t help it if they come for her sheep. I buy what\'s left. I do her a kindness, buying it. Nobody else would.', next: 'w3' },
    w3: {
      text: 'Fallen stock goes for a quarter. Good mutton goes for full. If I sell some of the one as the other, in town, where nobody knows whose it was, who\'s the worse for it? Look. There\'s twenty marks in it if you walk away.',
      options: [
        { text: 'You\'ll pay Thirza for every sheep you killed, at the full price.', moral: { id: 'kFolds:paid', tr: { honesty: 2, compassion: 1 }, rep: { verandah: 2 }, npc: { k_thirza: 20, k_ralph: -15 } }, effect: (g) => { g.setFlag(FOLDS, 'paid'); g.addMarks(70); g.setStage(FOLDS, 'done'); }, next: 'wP' },
        { text: 'Twenty marks, and the sacks stop tonight.', moral: { id: 'kFolds:bribed', tr: { greed: 2, deception: 1 }, npc: { k_thirza: -20, k_ralph: 10 } }, effect: (g) => { g.setFlag(FOLDS, 'bribed'); g.addMarks(90); g.setStage(FOLDS, 'done'); }, next: 'wB' },
        { text: 'The next sack goes over the wall with you in it.', need: { trait: { courage: [57, 100] } }, moral: { id: 'kFolds:scared', tr: { courage: 2, cruelty: 1 }, npc: { k_thirza: 10, k_ralph: -25 } }, effect: (g) => { g.setFlag(FOLDS, 'scared'); g.addMarks(70); g.setStage(FOLDS, 'done'); }, next: 'wS' },
      ],
    },
    wP: { text: 'Full price. For nine. That\'s every mark I made on them and more besides. All right. All right! I\'ll walk it down to her myself. She\'ll hit me. Here, Thirza said to give you something for the walk. She didn\'t. I am.' },
    wB: { speaker: 'narrator', text: 'Ralph counts the marks into your hand twice, carefully, and then a few more from a different purse, for Thirza\'s sake, he says, as if that made it hers. The pony watches you go.' },
    wS: { speaker: 'narrator', text: 'Ralph goes from pink to white and stays there. He puts the knife down on the block, very gently, as if it might go off, and says nothing at all. Next morning there are marks in a twist of cloth on Thirza\'s gatepost, and some for you under it.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [BEACON]: {
    id: BEACON, name: 'The Quarter Hour', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hill') return 'Kestle\'s beacon fire is always the last on the island. Matthew Nankivell, its keeper, has a bad hip and a basket that draws badly. He wants me to look at the basket at the top of the hill path, west of the waymark.';
      if (s === 'back') return 'A jackdaws\' nest in the basket, and Matthew\'s daughter Kensa on the hill with a fire of her own laid ready. Back down to Matthew.';
      const f = g.flag(BEACON);
      return f === 'kensa' ? 'Kensa Nankivell shares the Kestle watch with her father.' : f === 'pony' ? 'Matthew Nankivell rides up to Kestle\'s beacon on a pony called Quarter.' : 'Matthew Nankivell sleeps in the hut by Kestle\'s beacon on the watch nights.';
    },
    objectives: (g, s) => (s === 'hill' ? [
      { text: 'Look at the beacon basket on the hill', done: !!g.flag('kNest'), marker: 'kBasketThing' },
      ...(g.flag('kNest') ? [{ text: 'Talk to the girl by the basket', marker: 'k_kensa' }] : []),
    ] : s === 'back' ? [{ text: 'Back down to Matthew Nankivell', marker: 'k_matthew' }] : []),
    marks: (g, s): Marks => (!s ? { k_matthew: '!' } : s === 'hill' && g.flag('kNest') ? { k_kensa: '?' } : s === 'back' ? { k_matthew: '?' } : {}),
    walk: { cast: ['k_matthew', 'k_kensa'] },
  },
  [FOLDS]: {
    id: FOLDS, name: 'Bad Ground', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'look') return 'The wolves won\'t leave the Kestle Folds this summer, and they always go for the north wall. Thirza Rosewarne wants to know why.';
      if (s === 'tell') return 'Someone has been throwing offal over the north wall, and a pony\'s tracks go back to the village. Back to Thirza.';
      if (s === 'butcher') return 'Ralph Clemo, Kestle\'s butcher, buys the sheep the wolves kill and has a pony and a barrow of offal. Go and see him.';
      const f = g.flag(FOLDS);
      return f === 'bribed' ? 'Ralph paid me to forget it. The sacks stopped.' : f === 'scared' ? 'I frightened Ralph into paying Thirza.' : 'Ralph paid Thirza for every sheep.';
    },
    objectives: (g, s) => (s === 'look' ? [
      { text: 'Look at the Folds\' north wall', done: !!g.flag('kSack'), marker: 'kSackThing' },
      { text: `Drive off the wolves (${Math.min(WOLVES.length, killed(g, 'kFoldWolves'))}/${WOLVES.length})`, done: wolvesGone(g) },
      { text: 'Follow the tracks', done: !!g.flag('kPony'), marker: 'kPonyThing' },
    ] : s === 'tell' ? [{ text: 'Tell Thirza Rosewarne', marker: 'k_thirza' }]
      : s === 'butcher' ? [{ text: 'See Ralph Clemo, the butcher', marker: 'k_ralph' }] : []),
    advance: (g, s) => (s === 'look' && g.flag('kPony') ? 'tell' : null),
    marks: (_g, s): Marks => (!s ? { k_thirza: '!' } : s === 'tell' ? { k_thirza: '?' } : s === 'butcher' ? { k_ralph: '?' } : {}),
    walk: { cast: ['k_thirza', 'k_ralph'], kill: { look: [['moorwolf', 3]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'kFoldWolves', type: 'moorwolf', at: WOLVES, when: (g) => at(g, FOLDS) === 'look' && !!g.flag('kSack') },
];

const things: WorldThing[] = [
  {
    id: 'kBasketThing', x: BASKET.x, z: BASKET.z, y: BASKET.y, label: 'Look in the beacon basket', radius: 2.6, look: 'nest',
    when: (g) => at(g, BEACON) === 'hill' && !g.flag('kNest'),
    use: (g) => { g.setFlag('kNest', 1); g.toast('The iron basket is packed to the brim with sticks, wool and moss: a jackdaws\' nest, years deep, with the beacon wood underneath it. No wonder it smoked. You pull it out in armfuls. There is a girl watching you from a ring of stones a few yards off.'); },
  },
  {
    id: 'kSackThing', x: SACK.x, z: SACK.z, label: 'Look at the wall', radius: 2.6, look: 'bones',
    when: (g) => at(g, FOLDS) === 'look' && !g.flag('kSack'),
    use: (g) => { g.setFlag('kSack', 1); g.toast('A sacking bag inside the north wall, split open, with the guts and trimmings of a butchered beast spilling out of it, a day old and stinking. Somebody threw it over. Behind you, the dogs start to growl.'); },
  },
  {
    id: 'kPonyThing', x: PONY.x, z: PONY.z, label: 'Look at the tracks', radius: 2.6, look: 'hoofprints',
    when: (g) => at(g, FOLDS) === 'look' && !g.flag('kPony'),
    use: (g) => {
      if (!g.flag('kSack')) { g.toast('Small hoofprints, a pony\'s, and the narrow wheel of a barrow. They go up and down this way often.'); return; }
      if (!wolvesGone(g)) { g.toast('Not with the wolves at the wall.'); return; }
      g.setFlag('kPony', 1);
      g.toast('A pony\'s hoofprints and a barrow\'s narrow wheel, from the north wall back toward the village, and a smear of the same stinking offal on a stone where the barrow tipped. Somebody brings it out here on purpose.');
    },
  },
];

const look = (skin: string, hair: string, tunic: string, extra: Partial<NpcDef['look']> = {}): NpcDef['look'] => ({ skin, hair, hairStyle: 1, facial: 0, eyes: '#4a5a6a', tunic, trim: '#3a2a1e', shirt: '#c8b8a0', trousers: '#3a3430', boots: '#1e1a16', build: 1, age: 0.4, ...extra });

const NPCS: NpcDef[] = [
  { id: 'k_matthew', name: 'Matthew Nankivell', title: 'Beacon keeper, Kestle', look: look('#d8a080', '#8a5a30', '#5a6a3a', { hairStyle: 0, facial: 2, build: 1.2, age: 0.45 }),
    schedule: [{ from: 6, to: 21, at: [MATTHEW.x, MATTHEW.z], face: [MATTHEW.x + 3, MATTHEW.z], anim: 'idle', y: MATTHEW.y }],
    barks: ['Bess, give your brother some of that.', 'Long walk to town. Longer up that hill.'] },
  { id: 'k_kensa', name: 'Kensa Nankivell', title: 'Matthew\'s eldest', look: look('#d8a080', '#8a5a30', '#6a3a3a', { hairStyle: 4, frame: 'f', lashes: true, build: 0.8, age: 0.12 }),
    schedule: [{ from: 0, to: 24, at: [KENSA.x, KENSA.z], face: [KENSA.x - 1, KENSA.z - 2], anim: 'idle', y: KENSA.y }],
    barks: ['Three fires, and ours.', 'I\'m quicker than anybody.'] },
  { id: 'k_thirza', name: 'Thirza Rosewarne', title: 'Shepherd, the Kestle Folds', look: look('#c89070', '#5a4a3a', '#4a4a3a', { hairStyle: 3, frame: 'f', lashes: true, build: 0.95, age: 0.55, trousers: '#3a3a30' }),
    schedule: [{ from: 5, to: 21, at: [THIRZA.x, THIRZA.z], face: [THIRZA.x, THIRZA.z + 4], anim: 'idle', y: THIRZA.y }],
    barks: ['The dogs know before I do.', 'Nine since the shearing.'] },
  { id: 'k_ralph', name: 'Ralph Clemo', title: 'Butcher, Kestle', look: look('#e0a890', '#c8b090', '#8a3a3a', { hairStyle: 0, facial: 0, apron: true, build: 1.05, age: 0.5 }),
    schedule: [{ from: 7, to: 19, at: [RALPH.x, RALPH.z], face: [RALPH.x - 3, RALPH.z], anim: 'idle', y: RALPH.y }],
    barks: ['Mutton, hogget, ham.', 'All of it walked here on its own legs.'] },
];

const ITEMS: ItemDef[] = [];

export const KESTLE_CONTENT: RegionContent = {
  id: 'kestle',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { k_matthew: matthew, k_kensa: kensa, k_thirza: thirza, k_ralph: ralph },
  quests,
  spawns,
  things,
};
