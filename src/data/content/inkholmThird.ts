import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories on Inkholm (content order: fill the Counties first; Inkholm was among the thinnest), with the
// morality system's choices (docs/MORALITY.md).
//
// inkGall, STORE INK (Agnes Trethewey, ink boiler at Black Hythe; once you're over the water): the works store has the
// boiling house make it a batch every month with no copperas in it. Without the iron the ink is black for a week and
// then goes the colour of weak tea. The store writes what the pickers pay off their tabs in that, and what they owe in
// Charter black. Mary Opie's tally book shows a month of payments gone pale and a debt the storekeeper says she never
// paid. Hang her page on the drying racks beside a Charter page and watch it go. Then Hal Scoble, the storekeeper: he
// writes every picker's book again in Charter black, in front of them ('rewrite'); the page goes to Bryony and the
// island council, and the store is taken off the company ('council'); or ([Bad or Evil]) you buy his store ink off
// him for your own accounts ('buy'). inkGall = 'rewrite' | 'council' | 'buy'.
//
// inkLong, THE LONG REEK (Bryony Kitto, Gillsby; once the Grey is broken, inkPriory done): the five fires burn again,
// but the Long Reek, on the north-west point, keeps going out in the night, and Bryony is too old to walk up and see
// why. Greyhogs are rooting in its warm ash. Drive them off, and the ash is wet, and salt: it was put out with seawater,
// and the bucket left in the heather has T.K. burned in the handle. Tristram, her grandson, who doesn't want to be the
// last Reeker; he wants to go over to Gullmouth and learn ropes from Silas Hoskin. Then: tell Bryony ('told'), keep his
// secret and keep the fire yourself until he tells her ('kept'), or ([Brave]) stand by him while he tells her himself
// ('himself'). inkLong = 'told' | 'kept' | 'himself'.

const GALL = 'inkGall', LONG = 'inkLong';
const G = { x: 2512, z: 1645 }, W = { x: 2966, z: 1724 };
// Agnes by the ink tubs in the yard; Scoble behind the counter of the works store (the boarded house on the yard's north-west), Mary at its door
const AGNES = { x: W.x - 1, z: W.z + 6.5 }, SCOBLE = { x: W.x - 12.5, z: W.z - 13.5 }, MARY = { x: W.x - 9.5, z: W.z - 7.5 };
// the cap-drying lines east of the office
const RACKS = { x: W.x + 12, z: W.z - 6.5 };
const REEK = { x: 2570, z: 1480 };
const HOGS: [number, number][] = [[REEK.x + 6, REEK.z + 5], [REEK.x - 6, REEK.z - 4], [REEK.x + 2, REEK.z + 9]];
const BUCKET = { x: REEK.x - 3.5, z: REEK.z + 4.5 };

const over = (g: GameApi) => at(g, 'inkCrossing') === 'done';
const cured = (g: GameApi) => at(g, 'inkPriory') === 'done';

// ================================================================ Store Ink

const agnes: DialogueTree = {
  start: (g) => {
    const s = at(g, GALL);
    if (!s) return 'a1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    a1: { speaker: 'narrator', text: 'A small woman in a leather apron gone stiff and black, with a paddle across her knees and the look of someone who has been waiting a long time for a stranger to stop and ask.', next: 'a2' },
    a2: { text: 'Agnes Trethewey. I boil the ink. Charter black, for the ledgers in Gullmouth and Ansbury: ink caps, gall, gum and copperas. The copperas is the iron. The iron is what makes it stay.', next: 'a3' },
    a3: { text: 'Once a month the store sends down an order for a batch with no copperas in it. Store ink, Hal Scoble calls it. Cheaper, he says. It isn\'t cheaper. Copperas costs nothing.', next: 'a4' },
    a4: { text: 'Ink without the iron is black for a week. Then it goes brown, and then it goes the colour of weak tea, and then you can read the page by holding it to the window and guessing.', next: 'a5' },
    a5: {
      text: 'I boil what I\'m told. But I\'ve started wondering what he writes with it. Mary Opie\'s been crying at the store counter twice this month. Ask her. She won\'t ask anybody herself.',
      options: [{ text: 'I\'ll talk to Mary Opie.', effect: (g) => g.setStage(GALL, 'tally') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, GALL) === 'tally' ? 'Mary\'s by the store, most days, working up the nerve.' : at(g, GALL) === 'racks' ? 'The racks are in the sun. Hang it by a Charter page and give it an hour. You\'ll see.' : 'Scoble\'s at his counter. He\'ll smile at you. He smiles at everybody.') },
    after: {
      text: (g) => {
        const f = g.flag(GALL);
        if (f === 'rewrite') return 'He sat at the counter two days writing every book again, with the pickers stood round him reading every line. My copperas order\'s doubled. I\'ve never been so pleased to boil anything.';
        if (f === 'council') return 'The council has the store now. A picker\'s wife keeps it, and the books are in Charter black, and the prices are written on a board where you can see them. Scoble went over on the boat. Nobody waved.';
        return 'The orders still come down. No copperas. More of it than ever. I boil what I\'m told. I\'ve stopped wondering who for.';
      },
    },
  },
};

const mary: DialogueTree = {
  start: (g) => (at(g, GALL) === 'tally' ? 'm1' : at(g, GALL) === 'done' ? 'after' : 'm0'),
  nodes: {
    m0: { text: 'Mary Opie. I pick. I\'m on my break, if anybody asks.' },
    m1: { speaker: 'narrator', text: 'A young woman with a baby asleep on her back in a shawl, holding a little stitched book against her chest like a hymnal.', next: 'm2' },
    m2: { text: 'Agnes sent you? It\'s my tally. What I owe the store, and what I\'ve paid off it. Look. Those are the things I bought: flour, lamp oil, the doctor for the baby. All black.', next: 'm3' },
    m3: { text: 'And there, and there, that\'s every Saturday since Lammas, when I paid off. You can hardly see them. Mr Scoble says if it isn\'t in the book it wasn\'t paid. He says I owe four marks and six.', next: 'm4' },
    m4: {
      text: 'I paid it. I paid every Saturday. I watched him write it. I can\'t prove a thing that\'s gone white.',
      options: [{ text: 'Lend me the book. I think I can.', effect: (g) => { g.give('ink_tally', 1); g.setStage(GALL, 'racks'); } }, { text: 'Not now.' }],
    },
    after: {
      text: (g) => {
        const f = g.flag(GALL);
        if (f === 'buy') return 'Mr Scoble says I owe six marks now. The book says so. I don\'t know any more. Maybe I didn\'t pay. Maybe I\'m wrong about everything.';
        return 'I owe the store nothing. Nothing! I wrote it on the wall at home so the baby can read it when she\'s old enough.';
      },
    },
  },
};

const scoble: DialogueTree = {
  start: (g) => (at(g, GALL) === 'scoble' ? 's1' : at(g, GALL) === 'done' ? 'after' : 's0'),
  nodes: {
    s0: { text: 'Hal Scoble, works store. Flour, oil, boots, caps, candles. On the tab, if you\'re company. Cash, if you\'re not.' },
    s1: { speaker: 'narrator', text: 'A neat man behind a neat counter, with a pen in two inkpots at his elbow. One is labelled. One isn\'t. He sees you look at them, and he smiles.', next: 's2' },
    s2: { text: 'Mary Opie\'s book. And a Charter page beside it, I suppose, out on the racks. Agnes has a big mouth for a woman who boils for a living.', next: 's3' },
    s3: { text: 'Here\'s how it is. The company pays the pickers in tabs, and takes the tabs back at this counter.', next: 's3b' },
    s3b: { text: 'At the end of the month there\'s nothing left over for anyone. Not for them. Not for me. Somebody has to come out ahead, or what\'s a store for?', next: 's4' },
    s4: {
      text: 'So. What now?',
      options: [
        { text: 'You\'ll write every picker\'s book again in Charter black, at this counter, with them stood round you.', moral: { id: 'inkGall:rewrite', a: 4, tr: { honesty: 2, compassion: 2 }, npc: { ink_scoble: -10, ink_mary: 20, ink_agnes: 10 }, note: 'Made Hal Scoble write the Black Hythe pickers\' tallies again in ink that stays.' }, effect: (g) => { g.take('ink_tally', 1); g.setFlag(GALL, 'rewrite'); g.addMarks(70); g.setStage(GALL, 'done'); }, next: 'sR' },
        { text: 'The page goes to Bryony and the island council. Let them read it.', moral: { id: 'inkGall:council', a: 6, tr: { courage: 3, honesty: 3 }, rep: { company: -6 }, npc: { ink_scoble: -30, ink_mary: 25, ink_agnes: 15, bryony: 10 }, note: 'Took the store ink at Black Hythe to the island council, and the council took the store off the company.', fame: 'showed up the store ink at Black Hythe', spread: 'local' }, effect: (g) => { g.take('ink_tally', 1); g.setFlag(GALL, 'council'); g.addMarks(85); g.setStage(GALL, 'done'); }, next: 'sC' },
        { text: 'Sell me a crate of that unlabelled pot. I keep accounts too.', need: { band: ['bad', 'evil'] }, moral: { id: 'inkGall:buy', a: -10, tr: { greed: 5, deception: 4 }, npc: { ink_scoble: 15, ink_mary: -25, ink_agnes: -20 }, note: 'Bought the store ink off Hal Scoble at Black Hythe, for accounts that would fade.', major: true }, effect: (g) => { g.take('ink_tally', 1); g.setFlag(GALL, 'buy'); g.addMarks(40); g.give('ink_storeink', 1); g.setStage(GALL, 'done'); }, next: 'sB' },
      ],
    },
    sR: { text: 'Every book. In front of them. They\'ll stand there reading over my shoulder like I\'m a schoolboy. Fine. Fetch me the copperas pot, then, since you\'re so fond of it.' },
    sC: { text: 'Bryony Kitto. She\'ll read it out in that voice. Well. There\'s always a boat to Gullmouth, and Gullmouth has plenty of counters.' },
    sB: { text: 'A crate. And no questions about what for. Do you know, I think you\'re the first honest customer I\'ve had all year.' },
    after: { text: (g) => (g.flag(GALL) === 'buy' ? 'Running low on the good stuff? Come after dark.' : g.flag(GALL) === 'council' ? 'I\'m packing. Don\'t lean on the crates.' : 'Charter black, every line. Are you happy? I\'m not.') },
  },
};

// ================================================================ The Long Reek

const bryonyNodes: Record<string, DNode> = {
  lr1: { speaker: 'narrator', text: 'Bryony Kitto is sitting by her door with her stick across her knees, looking north-west, at a smudge of brown smoke that isn\'t there.', next: 'lr2' },
  lr2: { text: 'Five fires, and four burning. The Long Reek\'s gone out again. Third night this week. I lit it myself on Sunday, and I\'m eighty-one, and it took me all day there and back.', next: 'lr3' },
  lr3: { text: 'Fires don\'t go out on their own. Not reek fires. They\'re built to smoulder a month in the rain. Something\'s at it.', next: 'lr4' },
  lr4: {
    text: 'Tristram should go. He\'s the Reeker after me. But he says he\'s busy, all of a sudden, every time I ask. Will you go up to the point and look?',
    options: [{ text: 'I\'ll go up to the Long Reek.', effect: (g) => g.setStage(LONG, 'reek') }, { text: 'Not now.' }],
  },
  lrW: { text: (g) => (at(g, LONG) === 'reek' ? 'North-west, up on the point. You\'ll smell where it should be.' : 'You\'ve been up? Then why are you looking at Tristram like that?') },
};

const tristramNodes: Record<string, DNode> = {
  lt1: { speaker: 'narrator', text: 'Tristram sees the bucket in your hand before you say a word. He is fifteen, and he goes white, and then red, and then he looks at his grandmother\'s door.', next: 'lt2' },
  lt2: { text: 'Don\'t. Please. Not so loud.', next: 'lt3' },
  lt3: { text: 'I put it out. Three times. I thought if it kept going out she\'d think it was the hogs, or the weather, or the point\'s cursed, and she\'d let it go. Four fires. Four fires and the Grey stayed down all summer anyway, didn\'t it?', next: 'lt4' },
  lt4: { text: 'I don\'t want to be a Reeker. I don\'t want to walk round this island lighting fires every autumn until I\'m eighty-one. Silas Hoskin says I\'ve got hands for rope. He\'d take me at the ropewalk in Gullmouth. I\'d see the boats come in. I\'d see anything.', next: 'lt5' },
  lt5: {
    text: 'She\'s the last. If I go, she\'s the last for real. How do I tell her that?',
    options: [
      { text: 'You don\'t. I will. She has a right to know who\'s putting her fires out.', moral: { id: 'inkLong:told', a: 2, tr: { honesty: 3 }, npc: { joss_kitto: -25, bryony: 10 }, note: 'Told Bryony Kitto her grandson was putting out the Long Reek.' }, effect: (g) => { g.take('ink_bucket', 1); g.setFlag(LONG, 'told'); g.addMarks(70); g.setStage(LONG, 'done'); }, next: 'ltT' },
      { text: 'I\'ll keep the Long Reek myself this autumn. You tell her when you\'re ready. Not never.', moral: { id: 'inkLong:kept', a: 3, tr: { compassion: 3, deception: 1 }, npc: { joss_kitto: 20, bryony: -2 }, note: 'Kept the Long Reek lit for Tristram Kitto, and kept his secret from his grandmother.' }, effect: (g) => { g.take('ink_bucket', 1); g.setFlag(LONG, 'kept'); g.addMarks(80); g.setStage(LONG, 'done'); }, next: 'ltK' },
      { text: 'Now. Together. I\'ll stand next to you while you say it.', need: { trait: { courage: [57, 100] } }, moral: { id: 'inkLong:himself', a: 7, tr: { courage: 3, compassion: 3 }, npc: { joss_kitto: 30, bryony: 15 }, note: 'Stood by Tristram Kitto while he told his grandmother he would not be the next Reeker.', major: true, fame: 'stood by the last Reeker\'s grandson', spread: 'local' }, effect: (g) => { g.take('ink_bucket', 1); g.setFlag(LONG, 'himself'); g.addMarks(90); g.setStage(LONG, 'done'); }, next: 'ltH' },
    ],
  },
  ltT: { text: 'Fine. Go on, then. She\'ll cry and then she\'ll shout and then she\'ll make me light it every night till spring. And I\'ll do it. I always do what I\'m told.' },
  ltK: { text: 'You\'d do that? Up the point every night? You\'re madder than she is. Thank you. Before the first frost. I\'ll tell her before the first frost.' },
  ltH: { speaker: 'narrator', text: 'Bryony listens to all of it without a word, her hands folded on her stick. When he\'s done she sits a long time looking at the smudge of sky over the point. Then she says, "Your grandfather wanted to go to sea. I lit his fires for him for two years before he told me. I knew from the first night." She tells him to write. She tells him to go on the first boat in spring, and not to come back with an accent, and to teach her to light five fires a year with an old woman\'s legs. He promises all of it.' },
  ltAfter: {
    text: (g) => {
      const f = g.flag(LONG);
      if (f === 'told') return 'I light it every night now. Every night. She stands at the door and watches the smoke till she sees it. I hate you a bit. Not much.';
      if (f === 'kept') return 'Still haven\'t told her. I will. I\'ve been practising on Silas. He says I\'m getting better at it.';
      return 'First boat in spring. Silas has a bunk for me over the walk. Gran\'s teaching Kerra\'s girl the fires. She\'s better at it than I was.';
    },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [GALL]: {
    id: GALL, name: 'Store Ink', region: 'inkholm', depth: 'quest',
    notes: (g, s) => {
      if (s === 'tally') return 'Agnes Trethewey boils the ink at Black Hythe. Once a month the works store orders a batch with no copperas in it, ink that fades. She wants to know what the storekeeper writes with it. Mary Opie, a picker, has been crying at the store counter.';
      if (s === 'racks') return 'Mary Opie\'s tally book: everything she bought is still black, and every Saturday she paid off is going pale. The storekeeper says she owes four marks and six. Hang her page on the drying racks in the sun, beside a Charter page.';
      if (s === 'scoble') return 'An hour in the sun, and Mary\'s payments went the colour of weak tea while the Charter page stayed black. The store writes what the pickers pay in ink that fades. Hal Scoble keeps the store.';
      const f = g.flag(GALL);
      return f === 'rewrite' ? 'Scoble wrote every picker\'s book again in Charter black, with them watching.' : f === 'council' ? 'The island council took the store off the company. Scoble went over on the boat.' : 'I bought Scoble\'s store ink for my own accounts.';
    },
    objectives: (_g, s) => (s === 'tally' ? [{ text: 'Talk to Mary Opie by the works store', marker: 'ink_mary' }]
      : s === 'racks' ? [{ text: 'Hang Mary\'s page on the drying racks', marker: 'inkRacks' }]
      : s === 'scoble' ? [{ text: 'Talk to Hal Scoble, the storekeeper', marker: 'ink_scoble' }] : []),
    marks: (g, s): Marks => (!s && over(g) ? { ink_agnes: '!' } : s === 'tally' ? { ink_mary: '?' } : s === 'scoble' ? { ink_scoble: '?' } : {}),
    walk: { cast: ['ink_agnes', 'ink_mary', 'ink_scoble'], from: { quests: { inkCrossing: 'done' } } },
  },
  [LONG]: {
    id: LONG, name: 'The Long Reek', region: 'inkholm', depth: 'quest',
    notes: (g, s) => {
      if (s === 'reek') return 'The Long Reek, on the north-west point, keeps going out at night, and Bryony Kitto is too old to keep walking up to relight it. Reek fires are built to smoulder a month in the rain. Something\'s at it.';
      if (s === 'look') return 'Greyhogs rooting in the warm ash, but hogs don\'t put a fire out. Look round the fire.';
      if (s === 'joss') return 'The ash is wet and tastes of salt: the fire was put out with seawater. The bucket was in the heather with T.K. burned into the handle. Tristram Kitto, Bryony\'s grandson.';
      const f = g.flag(LONG);
      return f === 'told' ? 'I told Bryony. Tristram lights the Long Reek every night now.' : f === 'kept' ? 'I\'m keeping the Long Reek lit until Tristram tells his grandmother himself.' : 'Tristram told Bryony himself. He goes to Silas Hoskin\'s ropewalk in the spring.';
    },
    objectives: (g, s) => (s === 'reek' ? [{ text: `Drive the greyhogs out of the Long Reek's ash (${Math.min(HOGS.length, killed(g, 'inkLongHog'))}/${HOGS.length})`, done: killed(g, 'inkLongHog') >= HOGS.length, marker: 'inkLongAsh' }]
      : s === 'look' ? [{ text: 'Look round the dead fire', marker: 'inkLongBucket' }]
      : s === 'joss' ? [{ text: 'Talk to Tristram Kitto in Gillsby', marker: 'joss_kitto' }] : []),
    advance: (g, s) => (s === 'reek' && killed(g, 'inkLongHog') >= HOGS.length ? 'look' : null),
    marks: (g, s): Marks => (!s && cured(g) ? { bryony: '!' } : s === 'joss' ? { joss_kitto: '?' } : {}),
    walk: { cast: ['bryony', 'joss_kitto'], kill: { reek: [['greyhog', 3]] }, from: { quests: { inkCrossing: 'done', inkPriory: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'inkLongHog', type: 'greyhog', at: HOGS, when: (g) => at(g, LONG) === 'reek' },
];

const things: WorldThing[] = [
  { id: 'inkRacks', x: RACKS.x, z: RACKS.z, label: 'Hang Mary\'s page beside a Charter page', radius: 2.4, look: 'none',
    when: (g) => at(g, GALL) === 'racks',
    use: (g) => { g.setStage(GALL, 'scoble'); g.toast('You peg Mary\'s page on the rack beside a spoiled leaf of Charter black from Agnes\'s bin, and wait. In an hour of sun her Saturday payments have gone from brown to the colour of weak tea. The Charter page is as black as when it was written. So are the flour and the doctor.'); } },
  { id: 'inkLongAsh', x: REEK.x + 0.5, z: REEK.z + 2.5, label: 'The Long Reek', radius: 3, look: 'none',
    when: (g) => at(g, LONG) === 'reek' && killed(g, 'inkLongHog') < HOGS.length,
    use: (g) => g.toast('A ring of stones the height of your knee and a heap of grey ash inside it, still warm under the top, with three greyhogs rooting in it for the heat.') },
  { id: 'inkLongBucket', x: BUCKET.x, z: BUCKET.z, label: 'Look closer', radius: 2.4, look: 'basket',
    when: (g) => at(g, LONG) === 'look',
    use: (g) => { g.give('ink_bucket', 1); g.setStage(LONG, 'joss'); g.toast('The ash is wet through, and when you touch it to your tongue it\'s salt. Seawater. In the heather a few yards off, a wooden bucket, still damp, with T.K. burned into the handle with a hot nail, the way a boy marks a thing he\'s proud of.'); } },
];

const NPCS: NpcDef[] = [
  { id: 'ink_agnes', name: 'Agnes Trethewey', title: 'Ink boiler, Black Hythe', look: { frame: 'f', skin: '#d8a882', hair: '#5a4a3a', hairStyle: 2, eyes: '#4a4a3a', tunic: '#3a3a3a', trim: '#1e1e22', trousers: '#2e2a28', boots: '#1e1a16', apron: true, hat: 'kerchief', hatColor: '#1e1e22', lashes: true, build: 0.85, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [AGNES.x, AGNES.z], face: [AGNES.x, AGNES.z - 3], anim: 'idle' }], when: over, barks: ['Gall, gum, copperas.', 'Mind the vats.'] },
  { id: 'ink_mary', name: 'Mary Opie', title: 'Picker, Black Hythe', look: { frame: 'f', skin: '#e8c4a0', hair: '#8a5a3a', hairStyle: 2, eyes: '#4a5a4a', tunic: '#6a5a4a', trim: '#4a3a2a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, freckles: true, build: 0.9, age: 0.25 },
    schedule: [{ from: 6, to: 20, at: [MARY.x, MARY.z], face: [SCOBLE.x, SCOBLE.z], anim: 'idle' }], when: over, barks: ['Every Saturday.'] },
  { id: 'ink_scoble', name: 'Hal Scoble', title: 'Works store, Black Hythe', look: { skin: '#e8c4a0', hair: '#3a3a3a', hairStyle: 4, eyes: '#4a4a5a', tunic: '#4a4a52', trim: '#c8b880', trousers: '#2a2a2e', boots: '#1e1a16', apron: true, build: 0.9, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [SCOBLE.x, SCOBLE.z], face: [SCOBLE.x, SCOBLE.z + 3], anim: 'idle' }], when: (g) => over(g) && g.flag(GALL) !== 'council', barks: ['On the tab?', 'Cash, if you\'re not company.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'ink_tally', name: 'Mary Opie\'s tally book', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'book', a: '#6a5a4a', b: '#3a2a1a' }, desc: 'A little stitched book: flour, oil, the doctor for the baby, all in black. Every Saturday she paid off, going pale.' },
  { id: 'ink_bucket', name: 'A bucket marked T.K.', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#7a5a3a', b: '#4a3a2a' }, desc: 'A wooden bucket, still damp with seawater, the initials burned into the handle with a hot nail.' },
  { id: 'ink_storeink', name: 'A crate of store ink', kind: 'material', rarity: 'common', stack: false, value: 30, icon: { shape: 'bag', a: '#2a2a2a', b: '#5a4a3a' }, desc: 'Ink without the iron in it. Black for a week, then brown, then nothing at all.' },
];

export const INKHOLM_THIRD: RegionContent = {
  id: 'inkholmThird',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { ink_agnes: agnes, ink_mary: mary, ink_scoble: scoble },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'bryony', (g) => (!at(g, LONG) && cured(g) ? 'lr1' : at(g, LONG) && at(g, LONG) !== 'done' ? 'lrW' : undefined), bryonyNodes);
    hook(D, 'joss_kitto', (g) => (at(g, LONG) === 'joss' ? 'lt1' : at(g, LONG) === 'done' ? 'ltAfter' : undefined), tristramNodes);
  },
};
