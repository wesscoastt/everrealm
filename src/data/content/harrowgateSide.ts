import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';

// Harrowgate Works' side stories, in the company town of the Raddle Barrens.
//
// hgProps, PRYCE'S OAK (Corrie Dunmore, No. 1 Drift): a prop burst on the night shift, soft as a wet
// loaf, and the roof came down behind a cart. The last load of oak came in at Michaelmas and Pryce
// bought it. Corrie wants the three new sets in the drift knocked: sound oak rings, bad oak thuds.
// Two thud, and one has a P cut in its end grain: Pryce's mark for oak bought "on his own account" and
// sold on to the company. 'props' -> 'corrie' -> one of: 'delia' (she makes him pay and reads his book
// at last) | done at once ('crew': the night shift downs tools till new oak comes) | 'pryce' (he pays
// for sound oak quietly, and for your silence). Choice flag hgProps.
//
// hgSpikes, PULLED SPIKES (Ada Cleave, the rail gang): the new rail out of the smelter yard loses half
// its spikes every night, and a cart came off it. At the end of the rail, in the ditch, a farrier's
// nail-bag with WB burned in the flap: Walt Brindley's. His stable lads did it: when the rail reaches the
// cuts, the company sells twenty horses to the knacker and six lads go down the drift. 'spikes' ->
// 'walt' -> 'ada' -> done. Choice hgSpikes = 'told' (the lads are turned off) | 'hands' (Walt walks
// them over to Ada's gang; the horses stay on the hill road) | 'paid' (Walt pays you to say redbacks).
//
// hgBlue, DORA'S BLUE (Dora Hurst, the potter): her blue glaze comes out of the company's slag heap,
// picked over by night with a bucket, and Pryce has sold the slag to a glassworks in Ansbury. Her kiln
// is cold. Fill her bucket on the quiet ('slag' -> 'dora'), or ask Delia for the right to it ('delia'
// -> 'paper' -> done: a bucket a week, on paper, the company's gift). Choice hgBlue = 'bucket' | 'paper'.

const PROPS = 'hgProps', SPIKES = 'hgSpikes', BLUE = 'hgBlue';
/** No. 1 Drift runs east from x 1012 at z 1008, a timber set every four blocks (world/sites.ts buildMine). The three new sets, chalked. */
const SETS: [string, number][] = [['hgSetA', 1024.5], ['hgSetB', 1032.5], ['hgSetC', 1040.5]];
const DRIFT_Z = 1008.5, DRIFT_Y = 25;
/** The end of the new rail out of the smelter yard on Company Row (sites companyRow: rails at 948.5, 1017.5, running east and west). */
const RAIL_END: [number, number] = [956.5, 1018.5];
/** The slag heap by the smelter (sites companyRow: oreHeap 928, 1026), from its west foot. */
const SLAG: [number, number] = [924.5, 1026.5];

const items: ItemDef[] = [
  { id: 'nail_bag', name: 'A farrier\'s nail-bag', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#6a4a2c', b: '#2a1e14' }, desc: 'Greasy leather, half full of horseshoe nails and three rail spikes. WB burned into the flap with a hot iron.' },
  { id: 'blue_slag', name: 'A bucket of blue slag', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bag', a: '#3a6a9a', b: '#1a2a3a' }, desc: 'Cinders picked out of the company\'s slag heap, the colour of a jay\'s wing where they caught the heat.' },
  { id: 'slag_paper', name: 'Delia\'s paper', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0cc', b: '#7a2a1e' }, desc: '"Mrs D. Hurst, potter, may take one bucket of slag a week from the company heap, the company\'s gift. D. Harrowgate." The H has a flourish under it.' },
];


// ---------------------------------------------------------------- Pryce's Oak
const corrieNodes: Record<string, DNode> = {
  pr0: {
    text: 'Wick\'s back on half shifts. Holds the lamp, mostly. And now it\'s the props.',
    options: [{ text: 'What\'s wrong with the props?', next: 'pr1' }, { text: 'Not today.' }],
  },
  pr1: {
    text: 'One went on the night shift. Not cracked: went. Burst like a wet loaf, and the roof came down behind Sam Tonkin\'s cart.',
    options: [{ text: 'Was anyone hurt?', next: 'pr1b' }, { text: 'Not my business.' }],
  },
  pr1b: {
    text: 'Not this time. The last load of oak came in at Michaelmas, and Pryce bought it. I want to know if it\'s all like that.',
    options: [{ text: 'How do I tell?', next: 'pr2' }],
  },
  pr2: {
    text: 'Three new sets past the second lamp, chalked with a cross. Knock on each. Sound oak rings. Bad oak goes thud.',
    options: [{ text: 'Why not knock on them yourself?', next: 'pr2b' }, { text: 'I\'ll knock on them.', effect: (g) => g.setStage(PROPS, 'props') }],
  },
  pr2b: {
    text: 'If the crew sees the drift boss knocking props, they stop work. And Pryce counts the tubs.',
    options: [{ text: 'I\'ll knock on them.', effect: (g) => g.setStage(PROPS, 'props') }, { text: 'Later.' }],
  },
  prWait: { text: 'The three chalked sets past the second lamp. Ring or thud.', options: [{ text: 'Going.' }] },
  prBack: {
    text: 'Two of three thud. And a P cut in the end grain, you say. That\'s his mark.',
    options: [{ text: 'His mark for what?', next: 'prBack2' }],
  },
  prBack2: {
    text: 'He buys a load for the company and a cheaper load on his own account. Then he sells his own to the company, when nobody\'s counting.',
    options: [{ text: 'So what do we do?', next: 'prBack3' }],
  },
  prBack3: {
    text: 'You found it. You choose.',
    options: [
      { text: 'Take it to Delia. She has to read his book this time.', next: 'prDelia' },
      { text: 'Tell the night shift. Nobody goes under that roof till there\'s new oak.', next: 'prCrew' },
      { text: 'Let me talk to Pryce. He can pay for sound oak himself, quietly.', next: 'prPryce' },
    ],
  },
  prDelia: {
    text: 'She\'ll read it. She won\'t like what\'s on the page, and she\'ll like it less that a stranger brought it. Tell her I sent you.',
    options: [{ text: 'I\'ll go now.', effect: (g) => { g.setFlag('hgProps', 'delia'); g.setStage(PROPS, 'delia'); } }],
  },
  prCrew: {
    text: 'They\'ll down tools by dinner. Delia will have new oak here by morning, and my name on the stoppage. Fair enough. It\'s my roof.',
    options: [{ text: 'Will it cost you?', next: 'prCrew2' }],
  },
  prCrew2: {
    text: 'A week\'s bonus, and a line in the book. Here: the drift took a whip-round for Sam. Sam says give it to whoever found the rot.',
    options: [{ text: 'Keep them safe.', effect: (g) => { g.addMarks(140); g.setFlag('hgProps', 'crew'); g.setStage(PROPS, 'done'); } }],
  },
  prPryce: {
    text: 'Quietly. That\'s how he likes everything. If new oak comes, I won\'t ask what it cost, or who paid it.',
    options: [{ text: 'You won\'t have to.', effect: (g) => { g.setFlag('hgProps', 'pryce'); g.setStage(PROPS, 'pryce'); } }],
  },
  prAfter: {
    text: (g) => (g.flag('hgProps') === 'delia' ? 'New oak, and Pryce docked a month. Delia read his whole book in one night. I hear she\'s reading it again.' : g.flag('hgProps') === 'crew' ? 'We lost a day and a half. Sound props in every set. Nobody\'s mentioned the stoppage, which means they will.' : 'New oak came Thursday. Sound, every stick. I didn\'t ask.'),
    options: [{ text: 'Good.' }],
  },
};

const deliaNodes: Record<string, DNode> = {
  prD1: {
    text: 'Corrie sent you. With a piece of bark. Show me. A P, in the end grain.',
    options: [{ text: 'Pryce\'s mark. For his own account.', next: 'prD1b' }],
  },
  prD1b: {
    text: 'I sign the notice about the tools. I never read his book. The company keeps its word and he keeps the accounts. That was my bargain with myself.',
    options: [{ text: 'What happens to him?', next: 'prD2' }],
  },
  prD2: {
    text: 'Sound oak by morning, on his wages, and a month docked. Tonight I read the book. All of it. Here, for Corrie\'s roof.',
    options: [{ text: 'Thank you, Mrs Harrowgate.', next: 'prD3' }],
  },
  prD3: {
    text: 'Don\'t. I should have done it at Michaelmas.',
    options: [{ text: 'Good night.', effect: (g) => { g.addMarks(180); g.setStage(PROPS, 'done'); } }],
  },
};

const pryceNodes: Record<string, DNode> = {
  prP1: {
    text: 'Corrie\'s friend, with a piece of my oak. The P is a habit. I should break it. Sit down.',
    options: [{ text: 'The drift needs sound oak.', next: 'prP1b' }],
  },
  prP1b: {
    text: 'Sixty marks a load from the Fellers\' Camp. From my own pocket, in the drift by Thursday. And Mrs Harrowgate goes on not reading my book. Agreeable?',
    options: [{ text: 'Thursday. Not Friday.', next: 'prP2' }, { text: 'No. Delia hears about it.', next: 'prP3' }],
  },
  prP2: {
    text: 'Thursday. And something for your trouble. Discretion is the only thing in this yard I pay the posted rate for.',
    options: [{ text: 'Thursday.', effect: (g) => { g.addMarks(250); g.setStage(PROPS, 'done'); } }],
  },
  prP3: {
    text: 'Then go and tell her. You\'ll find her in the office, not reading.',
    options: [{ text: 'I will.', effect: (g) => { g.setFlag('hgProps', 'delia'); g.setStage(PROPS, 'delia'); } }],
  },
};

// ---------------------------------------------------------------- Pulled Spikes
const adaNodes: Record<string, DNode> = {
  sp1: {
    text: 'Somebody\'s pulling our spikes. We spike the new rail by day, and by morning half of them are in the ditch.',
    options: [{ text: 'Redbacks?', next: 'sp1b' }, { text: 'Rotten luck.' }],
  },
  sp1b: {
    text: 'Redbacks don\'t pull spikes. A cart came off on Tuesday with a ton of ore in it. Next time it\'s someone\'s leg.',
    options: [{ text: 'Want me to look?', next: 'sp2' }, { text: 'I\'ve no time for it.' }],
  },
  sp2: {
    text: 'The east end of the new rail, by the smelter yard. Whoever it is starts there. I\'m laying rail from six till the light goes.',
    options: [{ text: 'I\'ll have a look.', effect: (g) => g.setStage(SPIKES, 'spikes') }, { text: 'Not tonight.' }],
  },
  spWait: { text: (g) => (at(g, SPIKES) === 'walt' ? 'You found something. Go and ask whoever it belongs to, then come and tell me.' : 'The east end of the new rail, by the smelter yard. Find out who.'), options: [{ text: 'Going.' }] },
  spBack: {
    text: (g) => (g.flag('hgSpikes') === 'told' ? 'Walt\'s lads. Pryce had all six out of the yard by dinner, and Walt\'s not spoken to me since. I only wanted my spikes left alone.'
      : g.flag('hgSpikes') === 'hands' ? 'Six of Walt\'s lads turned up at first light with their own hammers. Walt brought them. We\'ll have rail to the cuts by Lammas.'
      : 'Redbacks, you say. Redbacks with hammers. Well, the spikes stay put now, whatever it was.'),
    options: [{ text: 'Good luck with the rail.', effect: (g) => { g.addMarks(g.flag('hgSpikes') === 'hands' ? 180 : g.flag('hgSpikes') === 'told' ? 140 : 100); g.setStage(SPIKES, 'done'); } }],
  },
};

const waltNodes: Record<string, DNode> = {
  sw1: {
    text: 'That\'s my bag. You found it by the rail, I suppose. I\'ll not lie to you. My lads did it.',
    options: [{ text: 'Why?', next: 'sw1b' }],
  },
  sw1b: {
    text: 'When that rail reaches the cuts, twenty horses go to the knacker and six lads go down the drift. Two are my sister\'s boys.',
    options: [{ text: 'Did you put them up to it?', next: 'sw1c' }],
  },
  sw1c: {
    text: 'I told them not to. I didn\'t tell them twice. So what now?',
    options: [
      { text: 'Ada needs to know.', next: 'sw2' },
      { text: 'Put your lads on Ada\'s rail gang. She\'s short of hands, and the hill road still needs horses.', next: 'sw3' },
      { text: 'Pay me, and I\'ll tell Ada it was redbacks.', next: 'sw4' },
    ],
  },
  sw2: {
    text: 'Then tell her. I\'ll not have them hide behind me. They\'ll be turned off. They knew that when they picked up the hammer.',
    options: [{ text: 'I\'m sorry.', effect: (g) => { g.take('nail_bag'); g.setFlag('hgSpikes', 'told'); g.setStage(SPIKES, 'ada'); } }],
  },
  sw3: {
    text: 'Lay the rail that puts my horses out. That\'s a bitter thing to ask a lad. But the rail stops at the ford, and the hill road\'s still ours.',
    options: [{ text: 'She\'ll take them.', next: 'sw3b' }],
  },
  sw3b: {
    text: 'Then I\'ll walk them over myself at first light. And I\'ll carry the bag.',
    options: [{ text: 'Good.', effect: (g) => { g.take('nail_bag'); g.setFlag('hgSpikes', 'hands'); g.setStage(SPIKES, 'ada'); } }],
  },
  sw4: {
    text: 'Redbacks. There\'s a price for everything in this yard, and you\'ve found mine. Here: a week\'s hire of a horse. I\'ll keep the lads off her rail.',
    options: [{ text: 'Redbacks it is.', effect: (g) => { g.take('nail_bag'); g.addMarks(60); g.setFlag('hgSpikes', 'paid'); g.setStage(SPIKES, 'ada'); } }],
  },
};

// ---------------------------------------------------------------- Dora's Blue
const doraNodes: Record<string, DNode> = {
  db1: {
    text: 'Slag. When the furnace runs hot the slag comes out a blue you can\'t buy in Ansbury. I pick it out of the company\'s heap at night.',
    options: [{ text: 'At night?', next: 'db1b' }, { text: 'Clever.' }],
  },
  db1b: {
    text: 'Pryce has put up a notice. The slag\'s sold to a glassworks, and anyone taking it takes from the company. My kiln\'s been cold a week.',
    options: [
      { text: 'I\'ll fill your bucket for you.', next: 'db2' },
      { text: 'Why not ask Delia for it?', next: 'db3' },
      { text: 'That\'s hard.' },
    ],
  },
  db2: {
    text: 'Pick the blue from the west side of the heap, behind the smelter. One bucket. I\'ll not ask you to steal twice.',
    options: [{ text: 'One bucket.', effect: (g) => g.setStage(BLUE, 'slag') }],
  },
  db3: {
    text: 'Ask a Harrowgate for something free? Eleven years I\'ve fired their crucibles at their price, and never asked for a thing.',
    options: [{ text: 'Then I\'ll ask for you.', next: 'db3b' }],
  },
  db3b: {
    text: 'You ask her, then. If she says no, I\'ve lost nothing I had.',
    options: [{ text: 'I\'ll ask her.', effect: (g) => g.setStage(BLUE, 'delia') }],
  },
  dbWait: { text: (g) => (at(g, BLUE) === 'slag' ? 'The west side of the slag heap, behind the smelter. The blue ones.' : 'Delia\'s in the office, inside the palisade.'), options: [{ text: 'Show me the pots.', effect: (g) => g.openShop('dora') }, { text: 'Going.' }] },
  dbBucket: {
    text: 'That\'s the blue. Look at it in the light. I\'ll fire tonight. Here: the first jar from the last good firing, and something for the bucket.',
    options: [{ text: 'Thank you.', next: 'dbBucket2' }],
  },
  dbBucket2: {
    text: 'If anyone asks, you bought the jar.',
    options: [{ text: 'I bought the jar.', effect: (g) => { g.take('blue_slag'); g.give('furn_glazedjars'); g.addMarks(40); g.setFlag('hgBlue', 'bucket'); g.setStage(BLUE, 'done'); } }],
  },
  dbPaper: {
    text: '"The company\'s gift." With her name under it, and a flourish. I\'ll put it on the wall by the kiln, where Pryce reads it every time he comes for crucibles.',
    options: [{ text: 'He\'ll love that.', next: 'dbPaper2' }],
  },
  dbPaper2: {
    text: 'Here: the first jar out of the kiln. And you didn\'t have to buy this one.',
    options: [{ text: 'Fire a good one.', effect: (g) => { g.take('slag_paper'); g.give('furn_glazedjars'); g.addMarks(60); g.setFlag('hgBlue', 'paper'); g.setStage(BLUE, 'done'); } }],
  },
};

const deliaBlueNodes: Record<string, DNode> = {
  dbD1: {
    text: 'Dora Hurst wants the slag. Pryce sold it by the cartload, to a glassworks that\'s never seen her blue.',
    options: [{ text: 'She only wants a bucket a week.', next: 'dbD1b' }],
  },
  dbD1b: {
    text: 'A bucket doesn\'t trouble me. I\'ve had her crucibles at our price since my father\'s time, and she\'s never once asked for anything. Why are you asking for her?',
    options: [{ text: 'Because she wouldn\'t.', next: 'dbD2' }],
  },
  dbD2: {
    text: 'That\'s the right answer. Here. A bucket a week, the company\'s gift, and my name under it. Pryce can grumble at the paper.',
    options: [{ text: 'Thank you.', effect: (g) => { g.give('slag_paper'); g.setStage(BLUE, 'paper'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [PROPS]: {
    id: PROPS, name: 'Pryce\'s Oak', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'props') return 'A prop burst on the night shift in No. 1 Drift, and the roof came down behind a cart. Corrie Dunmore wants the three new timber sets past the second lamp knocked: sound oak rings, bad oak thuds. The oak came in at Michaelmas, and Pryce bought it.';
      if (s === 'corrie') return 'Two of the three sets thud, and one has a P cut in its end grain. Corrie should hear it.';
      if (s === 'delia') return 'Delia Harrowgate should hear what\'s in No. 1 Drift\'s props. Corrie sent me.';
      if (s === 'pryce') return 'Aubrey Pryce can pay for sound oak himself, quietly. I said I\'d talk to him.';
      const c = g.flag('hgProps');
      return c === 'delia' ? 'Delia made Pryce pay for sound oak and docked him a month. She\'s reading his book.' : c === 'crew' ? 'The night shift downed tools until new oak came. Corrie\'s name is on the stoppage.' : 'Pryce paid for sound oak from his own pocket, and paid me to keep it quiet.';
    },
    objectives: (g, s) => (s === 'props' ? [{ text: `Knock on the three chalked timber sets in No. 1 Drift (${SETS.filter(([id]) => g.flag(id)).length}/3)`, marker: 'hgSetA' }]
      : s === 'corrie' ? [{ text: 'Tell Corrie Dunmore what the props sound like', marker: 'corrie' }]
      : s === 'delia' ? [{ text: 'Take the bad oak to Delia Harrowgate', marker: 'delia' }]
      : s === 'pryce' ? [{ text: 'Talk to Aubrey Pryce about sound oak', marker: 'pryce' }] : []),
    marks: (_g, s): Marks => (s === 'corrie' ? { corrie: '?' } : s === 'delia' ? { delia: '?' } : s === 'pryce' ? { pryce: '?' } : {}),
    walk: { cast: ['corrie', 'delia', 'pryce'] },
  },
  [SPIKES]: {
    id: SPIKES, name: 'Pulled Spikes', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'spikes') return 'Someone pulls the spikes from Ada Cleave\'s new rail out of the smelter yard every night, and a cart came off it. She asked me to look at the east end of the rail.';
      if (s === 'walt') return 'In the ditch at the end of the rail: a farrier\'s nail-bag, WB burned into the flap. Walt Brindley keeps the company stables.';
      if (s === 'ada') return 'Walt Brindley\'s stable lads pulled the spikes: when the rail reaches the cuts, the company sells the horses and sends the lads down the drift. Ada should hear what\'s been settled.';
      const c = g.flag('hgSpikes');
      return c === 'told' ? 'I told Ada it was Walt\'s lads. They were turned off the same day.' : c === 'hands' ? 'Walt walked his lads over to Ada\'s rail gang. The horses stay on the hill road.' : 'Walt paid me to tell Ada it was redbacks. The spikes stay put now.';
    },
    objectives: (_g, s) => (s === 'spikes' ? [{ text: 'Look at the east end of the new rail by the smelter yard', marker: 'hgRail' }]
      : s === 'walt' ? [{ text: 'Ask Walt Brindley at the company stables about his nail-bag', marker: 'stable_harrowgate' }]
      : s === 'ada' ? [{ text: 'Go back to Ada Cleave on Company Row', marker: 'adacleave' }] : []),
    marks: (_g, s): Marks => (s === 'walt' ? { stable_harrowgate: '?' } : s === 'ada' ? { adacleave: '?' } : {}),
    walk: { cast: ['adacleave', 'stable_harrowgate'] },
  },
  [BLUE]: {
    id: BLUE, name: 'Dora\'s Blue', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'slag') return 'Dora Hurst\'s blue glaze comes from the company\'s slag heap behind the smelter, and Pryce has sold the slag to a glassworks. I said I\'d fill her bucket from the west side of the heap.';
      if (s === 'dora') return 'I have a bucket of the blue slag for Dora.';
      if (s === 'delia') return 'Dora Hurst\'s blue glaze comes from the company\'s slag heap, and Pryce has sold the slag. I said I\'d ask Delia Harrowgate for the right to it.';
      if (s === 'paper') return 'Delia wrote Dora a paper: a bucket of slag a week, the company\'s gift. Dora should have it.';
      return g.flag('hgBlue') === 'paper' ? 'Dora has Delia\'s paper on the wall by her kiln, where Pryce can read it.' : 'I filled Dora\'s bucket from the company heap. She fired that night.';
    },
    objectives: (_g, s) => (s === 'slag' ? [{ text: 'Pick blue slag from the west side of the heap behind the smelter', marker: 'hgSlag' }]
      : s === 'dora' || s === 'paper' ? [{ text: 'Bring it to Dora Hurst at the pottery', marker: 'dora' }]
      : s === 'delia' ? [{ text: 'Ask Delia Harrowgate for the slag', marker: 'delia' }] : []),
    marks: (_g, s): Marks => (s === 'dora' || s === 'paper' ? { dora: '?' } : s === 'delia' ? { delia: '?' } : {}),
    walk: { cast: ['dora', 'delia'] },
  },
};

/** One of the chalked timber sets: knocked, and what it sounds like. */
const knock = (id: string, ring: boolean, text: string) => ({
  id, x: SETS.find(([k]) => k === id)![1], z: DRIFT_Z, y: DRIFT_Y, label: 'Knock on the chalked prop', radius: 2.4,
  when: (g: GameApi) => at(g, PROPS) === 'props' && !g.flag(id),
  use: (g: GameApi) => {
    g.setFlag(id, ring ? 'ring' : 'thud');
    g.toast(text);
    if (SETS.every(([k]) => g.flag(k))) g.setStage(PROPS, 'corrie');
  },
});

export const HARROWGATE_SIDE_CONTENT: RegionContent = {
  id: 'harrowgateSide', items, quests,
  things: [
    knock('hgSetA', true, 'It rings, a clean note that runs up the post into the cap. Sound oak.'),
    knock('hgSetB', false, 'Thud, like knocking on a sack. The heartwood is brown and gives under a thumbnail. Cut into the end grain, small and neat: a P.'),
    knock('hgSetC', false, 'Thud, and a trickle of brown dust out of a split you can put a finger in. The cap above it has started to sag.'),
    {
      id: 'hgRail', x: RAIL_END[0], z: RAIL_END[1], label: 'Look along the end of the rail', radius: 2.6,
      when: (g: GameApi) => at(g, SPIKES) === 'spikes',
      use: (g: GameApi) => { if (!g.give('nail_bag')) return; g.setStage(SPIKES, 'walt'); g.toast('Spikes in the ditch, a dozen of them, drawn clean with a claw. Under the last sleeper, dropped in the dark: a farrier\'s nail-bag, WB burned into the flap.'); },
    },
    {
      id: 'hgSlag', x: SLAG[0], z: SLAG[1], label: 'Pick out the blue slag', radius: 2.6,
      when: (g: GameApi) => at(g, BLUE) === 'slag',
      use: (g: GameApi) => { if (!g.give('blue_slag')) return; g.setStage(BLUE, 'dora'); g.toast('The blue is easy to find once you\'ve seen one: a jay\'s wing in the grey. A bucket, and a burnt thumb.'); },
    },
  ],
  hooks: (D) => {
    // (once Posted Rate is behind you her tree opens on the drift's news, not her greeting: she brings the props up herself)
    hook(D, 'corrie', (g) => (at(g, PROPS) === 'corrie' ? 'prBack' : at(g, PROPS) === 'props' ? 'prWait' : !at(g, PROPS) && g.stage('fairPrice') === 'done' ? 'pr0' : undefined), corrieNodes);
    addOption(D, 'corrie', 'main', { text: 'Anything wrong in the drift?', next: 'pr1', cond: (g) => !at(g, PROPS) });
    addOption(D, 'corrie', 'main', { text: 'How are the props?', next: 'prAfter', cond: (g) => at(g, PROPS) === 'done' });
    hook(D, 'delia', (g) => (at(g, PROPS) === 'delia' ? 'prD1' : at(g, BLUE) === 'delia' ? 'dbD1' : undefined), { ...deliaNodes, ...deliaBlueNodes });
    hook(D, 'pryce', (g) => (at(g, PROPS) === 'pryce' ? 'prP1' : undefined), pryceNodes);
    hook(D, 'adacleave', (g) => (!at(g, SPIKES) ? 'sp1' : at(g, SPIKES) === 'spikes' || at(g, SPIKES) === 'walt' ? 'spWait' : at(g, SPIKES) === 'ada' ? 'spBack' : undefined), adaNodes);
    hook(D, 'stable_harrowgate', (g) => (at(g, SPIKES) === 'walt' && g.count('nail_bag') > 0 ? 'sw1' : undefined), waltNodes);
    hook(D, 'dora', (g) => (at(g, BLUE) === 'dora' ? 'dbBucket' : at(g, BLUE) === 'paper' ? 'dbPaper' : at(g, BLUE) === 'slag' || at(g, BLUE) === 'delia' ? 'dbWait' : undefined), doraNodes);
    addOption(D, 'dora', 'hello', { text: 'That blue on your jars. Where does it come from?', next: 'db1', cond: (g) => !at(g, BLUE) });
  },
};
