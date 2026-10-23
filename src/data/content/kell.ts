import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { BRASSWICK, ESC, VENTS, WORKS } from '../kell';

// KELL, the clockwork isle north-east of the Fleet Coast (world/terrain.ts KELL, data/kell.ts,
// LORE.md "Kell"). The Kilnfolk live there: short, broad, long-lived, and careful. Under the Kiln, the
// island's volcano, they keep the Escapement, an engine that lets the mountain breathe out a tick at
// a time and turns every hammer in Brasswick on the way. Its speed is held by the Governor, two
// weighted arms that swing out as it runs faster and check it.
//
// THE ESCAPEMENT: in spring Kenver Sowden, the Works' young engineer, refitted the Governor with
// weights of star crystal, bought from Harrowgate & Daughters' agent Piran Hext: lighter, stronger,
// quicker to answer. But crystal lifts (the Weatherholms showed it), so the weights never swing out,
// the Governor never checks the engine, and the Escapement has been running away since. The vents
// on the slope have blown, and the old automata are up and working and won't let anyone down.
//
// Quests: kellCrossing, kellVents, kellCogs, kellHext, kellEscapement. Choice flag kellBlame =
// 'hext' (Hext goes before the Wheel: Harrowgate is fined and its ships kept out of Brasswick for a
// year) | 'kenver' (Kenver answers for it himself: a year off the Works; Harrowgate pays for the iron
// weights and keeps the trade). Cast: Jory Tallack (the Kell boat), Ebrel Rundle (keeper of the
// Wheel), Kenver Sowden (engineer, the Works), Piran Hext (Harrowgate's agent), Agnes Lusty (the
// forge), Loveday Hocking (the Lamp & Spanner), Gerens Tonkin (brass and instruments).

const CROSS = 'kellCrossing', VENT = 'kellVents', COGS = 'kellCogs', HEXT = 'kellHext', ESCQ = 'kellEscapement';
/** Gullmouth's Charter Post sign (data/travel.ts POSTS), literal because content imports types only. */
const GULL_POST: [number, number] = [1731.5, 594.5];
const BW = BRASSWICK;
/** The Governor's chamber in the Escapement, where the iron weights go on. */
const GOVERNOR = { x: ESC.x + 93.5, y: ESC.f, z: ESC.z + 32.5 };

const shut = (g: GameApi) => VENTS.filter((v) => g.flag('ventShut:' + v.id)).length;
const blame = (g: GameApi) => g.flag('kellBlame') as 'hext' | 'kenver' | undefined;
const fixed = (g: GameApi) => at(g, ESCQ) === 'done';

// ================================================================ The people

const jory: DialogueTree = {
  start: (g) => (!at(g, CROSS) ? 'j0' : at(g, CROSS) === 'cross' ? 'jWait' : fixed(g) ? 'jDone' : 'jOn'),
  nodes: {
    j0: { text: 'Jory Tallack, off the Kell boat. I\'m here for iron, and one other thing.', next: 'j1' },
    j1: {
      text: 'The Wheel wants someone off the mainland who can fight and doesn\'t mind heat. They didn\'t say why. They never say why.',
      options: [
        { text: 'I can fight.', next: 'j2', effect: (g) => { g.setFlag('kellFerry', true); g.setStage(CROSS, 'cross'); } },
        { text: 'What\'s the Wheel?', next: 'j3' },
        { text: 'Where\'s Kell?', next: 'j4' },
        { text: 'Not now.' },
      ],
    },
    j2: { text: 'Good. We\'ve a mountain breathing too hard, and things inside it that won\'t let us down to see why.', next: 'j2b' },
    j2b: { text: 'Use the Post sign and ask for Brasswick. I\'ll have the boat round.' },
    j3: { text: 'Seven of us sit in the Wheelhouse and decide things. It takes them a month to choose a new bell-rope.', next: 'j3b' },
    j3b: { text: 'When they send me for help the same day they asked the question, it\'s bad.', next: 'j1' },
    j4: { text: 'North-east, past the Fleet Coast, a day out with a fair wind. You\'ll know it. It\'s the island that smokes.', next: 'j1' },
    jWait: { text: 'Post sign, ask for Brasswick. Hold on to something on the way over. The water gets lively off the Kiln.' },
    jOn: { text: 'Iron off the mainland, copper back. I\'d rather be carrying that than worrying.' },
    jDone: { text: 'The Kiln\'s smoking slow again. You can see it from Gullmouth harbour if you know where to look. I look every morning.' },
  },
};

const joryKell: DialogueTree = {
  start: () => 'q1',
  nodes: {
    q1: { text: 'Watch the plates on the quay. They\'re warm. They\'ve no business being warm.', next: 'q2' },
    q2: { text: (g) => (at(g, CROSS) === 'cross' ? 'Ebrel Rundle\'s the one who sent for you. The Wheelhouse, with the cog on the front. You can\'t miss it; it\'s the only thing in Brasswick that\'s in a hurry.' : 'Boat goes back to Gullmouth whenever you want it. Use the Post sign.') },
  },
};

const ebrel: DialogueTree = {
  start: (g) => {
    const c = at(g, CROSS), v = at(g, VENT), k = at(g, COGS), h = at(g, HEXT), e = at(g, ESCQ);
    if (c === 'cross') return 'e1';
    if (v === 'vents') return 'eVents';
    if (v === 'back') return 'e6';
    if (k && k !== 'done') return 'eCogs';
    if (h === 'hext') return 'eHext';
    if (h === 'choose') return 'c1';
    if (h === 'weights') return 'eWeights';
    if (e === 'gate') return 'eGate';
    if (e === 'ebrel') return 'z1';
    if (e === 'done') return 'z6';
    return 'e0';
  },
  nodes: {
    e0: { text: 'Ebrel Rundle. I keep the Wheel. If you\'ve business with it, it\'ll keep.' },
    e1: { text: 'You\'ll be Jory\'s mainlander. Ebrel Rundle. I keep the Wheel, which means I count when they\'ve finished arguing.', next: 'e2' },
    e2: { text: 'Up the Kiln there\'s an engine we call the Escapement. It lets the mountain breathe out slowly, a tick at a time.', next: 'e2b' },
    e2b: { text: 'It turns every hammer in Brasswick on the way.', next: 'e3' },
    e3: { text: 'Since spring it\'s been ticking fast. The Kiln\'s breathing hard. Three relief vents on the slope have blown their valves, and the steam\'s coming out where it shouldn\'t.', next: 'e4' },
    e4: { text: 'Shut the valves first: the Bellmouth, the Sour Vent and the Old Stack. Turn the wheel on each till it stops. Mind the hounds. They like the warm.', effect: (g) => g.setStage(CROSS, 'done') },
    eVents: { text: 'The Bellmouth\'s north, up the slope. The Sour Vent\'s east. The Old Stack\'s north-west. A wheel on each housing. Turn it till it stops.' },
    e6: { text: 'I saw the steam drop from the Wheelhouse step. All three.', next: 'e7' },
    e7: { text: 'That\'s the mountain\'s breath going back through the Works, where it belongs. It won\'t hold. Whatever\'s driving the Escapement is still driving it.', next: 'e8' },
    e8: { text: 'Kenver Sowden\'s at the Works, up in the crater. Youngest engineer we\'ve had in fifty years. He\'ll tell you it\'s the springs. Hear him out, then decide for yourself.', effect: (g) => g.setStage(VENT, 'done') },
    eCogs: { text: 'Kenver\'s up at the Works. Take the road out of the east end and keep climbing till you go through the cutting.' },
    eHext: { text: 'Piran Hext keeps Harrowgate\'s office on the high street. The one with their banner. He\'ll be pleasant. He\'s always pleasant.' },
    c1: { text: 'Well?', next: 'c2' },
    c2: { speaker: 'narrator', text: 'You tell her what Hext said: the crystal lifts, it says so on page four of the assay, and he\'d been at the Weatherholms and knew it.', next: 'c3' },
    c3: { text: 'So a mainlander sold us a lift and called it a weight, and our boy fitted it without reading page four.', next: 'c4' },
    c4: { text: 'The Wheel will want someone to answer for it. It always wants someone. You\'ve done the asking, so your word carries.', next: 'c5' },
    c5: { text: 'Bring Hext before the Wheel, and we fine his company and keep Harrowgate\'s ships out for a year. We\'d be short of iron, but it\'d be fair.', next: 'c5b' },
    c5b: {
      text: 'Or let Kenver answer. He fitted them. A year off the Works for him, Harrowgate pays for iron weights, and the trade goes on.',
      options: [
        { text: 'Bring Hext before the Wheel.', next: 'c6', effect: (g) => { g.setFlag('kellBlame', 'hext'); g.setStage(HEXT, 'weights'); } },
        { text: 'Let Kenver answer for it.', next: 'c7', effect: (g) => { g.setFlag('kellBlame', 'kenver'); g.setStage(HEXT, 'weights'); } },
        { text: 'I need to think about it.' },
      ],
    },
    c6: { text: 'I\'ll send for him. He\'ll hate it, which is a start. Agnes Lusty has iron weights cast to the old pattern. Take them down with you.' },
    c7: { text: 'He\'ll stand up and say it himself. He\'s that sort. Agnes Lusty has iron weights cast to the old pattern. Take them down with you.' },
    eWeights: { text: 'Agnes Lusty, at the forge across the street. The iron weights.' },
    eGate: { text: 'The Gate\'s in the middle of the crater. Through it and down. The Governor\'s halfway; the Mainspring\'s at the bottom. Nobody\'s been to the bottom in my lifetime.' },
    z1: { text: 'The steam\'s down on the slope. I can hear the Works from here, ticking slow, the way it did when I was a girl.', next: 'z2' },
    z2: { text: 'Kenver went down after you came up, to look at the Governor. He came back and sat on the Wheelhouse step for an hour without saying anything.', next: 'z3' },
    z3: { text: 'The Wheel met this morning. It took them twenty minutes. That\'s never happened.', next: 'z4' },
    z4: { text: 'Here. It\'s the Wheel\'s badge. We don\'t give them to mainlanders. We\'ve given one to a mainlander.', next: 'z5', effect: (g) => { g.give('kiln_badge'); g.addMarks(400); g.setStage(ESCQ, 'done'); } },
    z5: { text: 'Let it out slow. That\'s what we say. Now you know why.' },
    z6: { text: (g) => (blame(g) === 'hext' ? 'Harrowgate paid the fine. Their ships stay out till next spring. We\'re short of iron and nobody\'s complained once. Let it out slow.' : 'Kenver sits in the Wheelhouse now and reads the old assays aloud. All of them. The Wheel lets him. Let it out slow.') },
  },
};

const kenver: DialogueTree = {
  start: (g) => {
    const k = at(g, COGS), h = at(g, HEXT), e = at(g, ESCQ);
    if (k === 'kenver') return 'k1';
    if (k === 'cogs' || k === 'back') return g.count('brass_cog') >= 6 ? 'k4' : 'kCogs';
    if (h === 'hext' || h === 'choose') return 'kHext';
    if (h === 'weights') return 'kWeights';
    if (e === 'gate') return 'kGate';
    if (e === 'ebrel' || e === 'done') return 'kDone';
    return 'k0';
  },
  nodes: {
    k0: { text: 'Kenver Sowden. I look after the Works. Mostly I look at it.' },
    k1: { text: 'You\'re Ebrel\'s mainlander. Kenver Sowden. I look after the Works. Mostly I look at it, and it looks back.', next: 'k2' },
    k2: { text: 'It\'s the springs. I\'d bet my tools on it. The old springs are tired, and the Escapement\'s running away with itself.', next: 'k3' },
    k3: { text: 'The brass mites have been at the spare wheels in the stores. They strip them and carry them off down the slope.', next: 'k3b' },
    k3b: { text: 'Bring me six of their cogs, and I\'ll show you on the teeth what I mean.', effect: (g) => g.setStage(COGS, 'cogs') },
    kCogs: { text: (g) => `Cogs off the brass mites, out on the slopes. They eat anything bright. (${Math.min(6, g.count('brass_cog'))} of 6)` },
    k4: { text: 'Let\'s see them.', next: 'k5', effect: (g) => { g.take('brass_cog', 6); } },
    k5: { speaker: 'narrator', text: 'He lays the cogs on the bench and turns them in the light. Every tooth is worn on the one side, polished bright.', next: 'k6' },
    k6: { text: 'That\'s not tired springs. That\'s a wheel being driven faster than it was cut for. For months.', next: 'k7' },
    k7: { text: 'Only one thing sets the speed down there: the Governor. Two arms, with a weight on each.', next: 'k7b' },
    k7b: { text: 'As the engine speeds up, the weights swing out and hold it back. That\'s all a governor is.', next: 'k8' },
    k8: { text: 'In spring I gave it new weights. Star crystal. Lighter and stronger than iron. They\'d answer quicker. I bought them from Harrowgate\'s man.', next: 'k9' },
    k9: { text: 'If they don\'t swing out, it never checks the engine. It just runs.', next: 'k10' },
    k10: { text: 'Go and ask Piran Hext what he knew about that crystal. I need to sit down.', effect: (g) => g.setStage(COGS, 'done') },
    kHext: { text: 'Hext\'s office is on the high street, with Harrowgate\'s banner over the door. I\'m not going. I\'d say something.' },
    kWeights: { text: 'Agnes is casting iron weights to the old pattern. Iron\'s honest. It weighs what it weighs.' },
    kGate: { text: 'Down through the Gate. The Governor\'s in the fourth hall. Take the crystal off and put the iron on.', next: 'kGate2' },
    kGate2: { text: 'Then it\'ll check the engine. But the Mainspring\'s wound tight by now. Someone has to let it down.' },
    kDone: { text: (g) => (blame(g) === 'kenver' ? 'A year off the Works. I went down to see the Governor. It\'s turning slow, the iron hanging out where it should. I\'ll take the year.' : 'The Wheel fined Harrowgate. Ebrel says I\'m to read every page of every assay from now on. I\'ve started on the old ones. There are a lot of old ones.') },
  },
};

const hext: DialogueTree = {
  start: (g) => (at(g, HEXT) === 'hext' ? 'h1' : blame(g) === 'hext' ? 'hFined' : blame(g) === 'kenver' ? 'hPaid' : 'h0'),
  nodes: {
    h0: { text: 'Piran Hext, Harrowgate and Daughters. Iron for copper, mostly. Mind the step; it\'s brass, and it\'s slippery.' },
    h1: { text: 'Piran Hext, Harrowgate and Daughters. The crystal? Yes, I sold it. First-grade, from the Kettle fall.', next: 'h2' },
    h2: { text: 'Kenver Sowden asked for the lightest, strongest material we had for a set of weights. That\'s what I sold him, at a fair price, with a full assay.', next: 'h3' },
    h3: { text: 'Did I tell him it lifts? It\'s in the assay. Page four.', next: 'h4' },
    h4: { text: 'I was at the Weatherholms last year. I know what crystal does.', next: 'h5' },
    h5: { text: 'I also know a sale when one\'s put in front of me. They\'re the Wheel\'s weights now, not mine.', effect: (g) => g.setStage(HEXT, 'choose') },
    hFined: { text: 'The Wheel fined us a year\'s profit and closed the harbour to us. Hilda will have my head on her desk by spring.', next: 'hFined2' },
    hFined2: { text: 'It\'s fair, I suppose. I did read page four.' },
    hPaid: { text: 'The boy stood up in front of the Wheel and said it was all his doing. I\'ve paid for the iron. I find I don\'t know what else to do.' },
  },
};

const agnes: DialogueTree = {
  start: (g) => (at(g, HEXT) === 'weights' ? 'a3' : 'a1'),
  nodes: {
    a1: {
      text: 'Agnes Lusty. If it\'s iron, I\'ll cast it. If it\'s brass, go and see Gerens. If it\'s gold, you\'re on the wrong island.',
      options: [
        { text: 'What have you got?', effect: (g) => g.openShop('agnes_lusty') },
        { text: 'Bye.' },
      ],
    },
    a3: { text: 'Ebrel sent you. Here: two iron weights, cast this morning to the Governor\'s old pattern. Heavy as sin. Don\'t drop them on your foot.', next: 'a4', effect: (g) => { g.give('iron_weights'); g.setStage(HEXT, 'done'); } },
    a4: { text: 'My grandmother cast the last set. Took her a week. I did these in a morning, and I\'m prouder of that than I\'m going to say.' },
  },
};

const loveday: DialogueTree = {
  start: () => 'l1',
  nodes: {
    l1: {
      text: 'The Lamp & Spanner. Sit down before you fall down. Everyone falls down the first night; it\'s the air.',
      options: [
        { text: 'What have you got?', effect: (g) => g.openShop('loveday_hocking') },
        { text: 'What\'s the air?', next: 'l2' },
        { text: 'Bye.' },
      ],
    },
    l2: { text: 'The Kiln\'s. A bit of sulphur, a bit of warm. You stop noticing in a week.', next: 'l3' },
    l3: { text: 'Then you go to the mainland, and it smells of nothing, and you can\'t sleep.', next: 'l1' },
  },
};

const gerens: DialogueTree = {
  start: () => 'g1',
  nodes: {
    g1: {
      text: 'Gerens Tonkin. Brass, and things made of brass. Mind the case, it\'s sprung.',
      options: [
        { text: 'What have you got?', effect: (g) => g.openShop('gerens_tonkin') },
        { text: 'Who are the Kilnfolk?', next: 'g2' },
        { text: 'Bye.' },
      ],
    },
    g2: { text: 'Us. Short, mainlanders say. Broad, if they\'re being kind. We came here when the Kiln was louder than it is, and we\'ve been quieting it down ever since.', next: 'g3' },
    g3: { text: 'We live a long time. A hundred and forty, some. You learn to do a thing slowly if you\'re going to be doing it that long.', next: 'g1' },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [CROSS]: {
    id: CROSS, name: 'The Island That Smokes', region: 'kell', depth: 'storyline', next: [VENT, 'vents'],
    notes: (_g, s) => (s === 'cross' ? 'Jory Tallack has the Kell boat at Gullmouth. The Wheel, the Kilnfolk\'s council, sent him for someone off the mainland who can fight and doesn\'t mind heat. The ferry goes from Gullmouth\'s Post sign to Brasswick.' : 'I crossed to Kell for the Kilnfolk\'s Wheel.'),
    objectives: (_g, s) => (s === 'cross' ? [{ text: 'Cross to Brasswick on the Charter Post at Gullmouth', marker: 'ebrel' }, { text: 'Talk to Ebrel Rundle at the Wheelhouse', marker: 'ebrel' }] : []),
    marks: (_g, s): Marks => (!s ? { jory_tallack: '!' } : s === 'cross' ? { ebrel: '?' } : {}),
  },
  [VENT]: {
    id: VENT, name: 'Let It Out Slow', region: 'kell', depth: 'storyline', next: [COGS, 'kenver'],
    notes: (g, s) => (s === 'vents' ? `Under the Kiln, the Kilnfolk's engine, the Escapement, lets the mountain breathe out a tick at a time. Since spring it has been running fast, and three relief vents on the slope have blown their valves. Ebrel Rundle wants them shut. (${shut(g)}/3)` : 'The three vents are shut. The steam has dropped on the slope, for now.'),
    objectives: (g, s) => {
      if (s === 'vents') return VENTS.map((v) => ({ text: `Shut the valve at ${v.name.replace(/^The /, 'the ')}`, done: !!g.flag('ventShut:' + v.id), marker: 'vent-' + v.id }));
      if (s === 'back') return [{ text: 'Tell Ebrel Rundle', marker: 'ebrel' }];
      return [];
    },
    advance: (g, s) => (s === 'vents' && shut(g) >= 3 ? 'back' : null),
    marks: (_g, s): Marks => (s === 'back' ? { ebrel: '?' } : {}),
    walk: { from: { quests: { [CROSS]: 'done', [VENT]: 'vents' } } },
  },
  [COGS]: {
    id: COGS, name: 'Worn on One Side', region: 'kell', depth: 'storyline', next: [HEXT, 'hext'],
    notes: (g, s) => {
      if (s === 'kenver') return 'Kenver Sowden, the Works\' engineer, is up in the Kiln\'s crater. Ebrel says he\'ll blame the springs.';
      if (s === 'cogs') return `Kenver thinks the Escapement's old springs are tired. The brass mites strip the spare wheels from the stores; he wants six of their cogs to show me on the teeth. (${Math.min(6, g.count('brass_cog'))}/6)`;
      return 'The cogs are worn on one side: the Escapement has been driven too fast for months. Only the Governor sets its speed, and in spring Kenver gave it weights of star crystal, bought from Harrowgate\'s agent, Piran Hext.';
    },
    objectives: (g, s) => {
      if (s === 'kenver') return [{ text: 'Talk to Kenver Sowden at the Works', marker: 'kenver' }];
      if (s === 'cogs') return [{ text: `Take brass cogs from the brass mites on the slopes (${Math.min(6, g.count('brass_cog'))}/6)` }];
      if (s === 'back') return [{ text: 'Bring the cogs to Kenver Sowden', marker: 'kenver' }];
      return [];
    },
    advance: (g, s) => (s === 'cogs' && g.count('brass_cog') >= 6 ? 'back' : null),
    marks: (_g, s): Marks => (s === 'kenver' || s === 'back' ? { kenver: '?' } : {}),
    walk: { obtain: { cogs: [['brass_cog', 6]] }, from: { quests: { [CROSS]: 'done', [VENT]: 'done', [COGS]: 'kenver' } } },
  },
  [HEXT]: {
    id: HEXT, name: 'Page Four', region: 'kell', depth: 'storyline', next: [ESCQ, 'gate'],
    notes: (_g, s) => {
      if (s === 'hext') return 'Piran Hext keeps Harrowgate & Daughters\' office on Brasswick\'s high street. Kenver wants to know what Hext knew about the crystal he sold.';
      if (s === 'choose') return 'Hext knew. Crystal lifts: it\'s on page four of the assay, and he was at the Weatherholms. Ebrel Rundle says the Wheel will want someone to answer for it: Hext, or Kenver, who fitted the weights.';
      if (s === 'weights') return 'Agnes Lusty at the forge has cast iron weights to the Governor\'s old pattern, to take down into the Escapement.';
      return 'I have the iron weights for the Governor.';
    },
    objectives: (_g, s) => {
      if (s === 'hext') return [{ text: 'Talk to Piran Hext at the Harrowgate office', marker: 'hext' }];
      if (s === 'choose') return [{ text: 'Tell Ebrel Rundle who should answer to the Wheel', marker: 'ebrel' }];
      if (s === 'weights') return [{ text: 'Collect the iron weights from Agnes Lusty at the forge', marker: 'agnes_lusty' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'hext' ? { hext: '?' } : s === 'choose' ? { ebrel: '?' } : s === 'weights' ? { agnes_lusty: '?' } : {}),
    walk: { cast: ['kenver'], from: { quests: { [CROSS]: 'done', [VENT]: 'done', [COGS]: 'done', [HEXT]: 'hext' } } },
  },
  [ESCQ]: {
    id: ESCQ, name: 'The Escapement', region: 'kell', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'gate') return 'The Escapement Gate is in the middle of the Works, in the Kiln\'s crater. It\'s a group dungeon: go down with a group, or with henchmen. Fit the iron weights to the Governor, then stop the Mainspring at the bottom.';
      if (s === 'ebrel') return 'The Mainspring is let down and the Governor is checking the engine. Ebrel Rundle will want to know.';
      return blame(g) === 'hext' ? 'The Escapement ticks slowly again. Harrowgate answered for the crystal.' : 'The Escapement ticks slowly again. Kenver answered for the crystal.';
    },
    objectives: (g, s) => {
      if (s === 'gate') return [
        { text: 'Fit the iron weights to the Governor', done: !!g.flag('kellWeights'), marker: 'kellGovernor' },
        { text: `Stop the Mainspring (${Math.min(1, killed(g, 'type:dg_mainspring'))}/1)` },
      ];
      if (s === 'ebrel') return [{ text: 'Tell Ebrel Rundle', marker: 'ebrel' }];
      return [];
    },
    advance: (g, s) => (s === 'gate' && g.flag('kellWeights') && killed(g, 'type:dg_mainspring') >= 1 ? 'ebrel' : null),
    marks: (_g, s): Marks => (s === 'ebrel' ? { ebrel: '?' } : {}),
    walk: { kill: { gate: [['dg_mainspring', 1]] }, from: { quests: { [CROSS]: 'done', [VENT]: 'done', [COGS]: 'done', [HEXT]: 'done', [ESCQ]: 'gate' }, flags: { kellBlame: 'kenver' }, items: [['iron_weights', 1]] } },
  },
};

// ================================================================ Things, people, places

const items: ItemDef[] = [
  { id: 'brass_cog', name: 'Brass cog', kind: 'material', rarity: 'uncommon', stack: true, value: 14, icon: { shape: 'coin', a: '#d8b050', b: '#6a5020' }, desc: 'A spare wheel from the Works\' stores, teeth stripped by a brass mite. The Kilnfolk melt them down, or set them back in, depending on the teeth.' },
  { id: 'cinder_pelt', name: 'Cinder pelt', kind: 'material', rarity: 'uncommon', stack: true, value: 16, icon: { shape: 'pelt', a: '#2a2422', b: '#ff7a30' }, desc: 'A cinderhound\'s hide, black, still warm hours after. It doesn\'t burn. The Kilnfolk line their forge aprons with it.' },
  { id: 'iron_weights', name: 'Iron weights', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'ore', a: '#6a6e74', b: '#3a3e44' }, desc: 'Two iron weights cast by Agnes Lusty to the Governor\'s old pattern. Heavy as sin. Iron is honest: it weighs what it weighs.' },
  { id: 'kiln_badge', name: 'The Wheel\'s badge', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'coin', a: '#d8b050', b: '#3e8a74' }, desc: 'A small brass cog on a pin, the Kilnfolk\'s Wheel worked on its face. They don\'t give them to mainlanders. They gave you one.' },
];

const KILNFOLK = { skin: '#c89a78', eyes: '#4a3a2a', height: 0.84, build: 1.35 };

export const KELL_CONTENT: RegionContent = {
  id: 'kell',
  items,
  npcs: [
    {
      id: 'jory_tallack', name: 'Jory Tallack', title: 'The Kell boat',
      look: { ...KILNFOLK, hair: '#6a4a2a', hairStyle: 3, facial: 6, tunic: '#3a3a30', trim: '#d8b050', trousers: '#2e2a24', boots: '#1e1a16', hat: 'cap', hatColor: '#2a2a28', age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [GULL_POST[0] - 5, GULL_POST[1] + 3.5], face: [GULL_POST[0] - 9, GULL_POST[1] + 5], anim: 'idle' }],
      barks: ['Iron for copper.', 'It\'s the island that smokes.'],
    },
    {
      id: 'jory_tallack_kell', name: 'Jory Tallack', title: 'The Kell boat',
      look: { ...KILNFOLK, hair: '#6a4a2a', hairStyle: 3, facial: 6, tunic: '#3a3a30', trim: '#d8b050', trousers: '#2e2a24', boots: '#1e1a16', hat: 'cap', hatColor: '#2a2a28', age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [BW.x - 31.5, BW.z + 1.6], face: [BW.x - 36, BW.z + 1.6], anim: 'idle' }],
      barks: ['Mind the plates.'],
      when: (g) => !!g.flag('kellFerry'),
    },
    {
      id: 'ebrel', name: 'Ebrel Rundle', title: 'Keeper of the Wheel',
      look: { ...KILNFOLK, hair: '#e0dcd4', hairStyle: 4, tunic: '#3a4a3e', trim: '#d8b050', trousers: '#2e2a24', boots: '#1e1a16', cape: '#2a3a30', lashes: true, age: 0.9 },
      schedule: [{ from: 0, to: 24, at: [BW.x + 16.5, BW.z - 11.4], face: [BW.x + 16.5, BW.z - 7], anim: 'idle' }],
      barks: ['Let it out slow.', 'The Wheel will keep.'],
    },
    {
      id: 'kenver', name: 'Kenver Sowden', title: 'Engineer, the Works',
      look: { ...KILNFOLK, hair: '#3a2a1e', hairStyle: 0, facial: 2, tunic: '#5a4a2a', trim: '#b08a3a', trousers: '#3a3020', boots: '#2a2018', apron: true, gloves: '#6a5020', age: 0.2 },
      schedule: [{ from: 0, to: 24, at: [WORKS.x - 8.5, WORKS.z + 5.5], face: [WORKS.x - 4, WORKS.z + 5.5], anim: 'idle' }],
      barks: ['It looks back.', 'Too fast.'],
    },
    {
      id: 'hext', name: 'Piran Hext', title: 'Agent, Harrowgate & Daughters',
      look: { skin: '#e8c4a0', hair: '#7a5a3a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#2a2a32', trim: '#e0b860', trousers: '#22222a', boots: '#141210', cape: '#1e1e26', hat: 'wide', hatColor: '#1a1a1a', build: 0.95, height: 1.05, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [BW.x - 12.5, BW.z - 5.2], face: [BW.x - 12.5, BW.z - 1], anim: 'idle' }],
      barks: ['Iron for copper.', 'Mind the step.'],
    },
    {
      id: 'agnes_lusty', name: 'Agnes Lusty', title: 'The forge',
      look: { ...KILNFOLK, hair: '#8a3a1e', hairStyle: 4, tunic: '#4a3a2e', trim: '#8a6a3a', trousers: '#2e2620', boots: '#1e1a16', apron: true, gloves: '#2a2422', lashes: true, scar: true, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [BW.x + 20.5, BW.z + 10.6], face: [BW.x + 21.5, BW.z + 8.5], anim: 'idle' }],
      barks: ['If it\'s iron, I\'ll cast it.'],
    },
    {
      id: 'loveday_hocking', name: 'Loveday Hocking', title: 'The Lamp & Spanner',
      look: { ...KILNFOLK, hair: '#c8a060', hairStyle: 7, tunic: '#6a3a3a', trim: '#e0c890', trousers: '#3a2e26', boots: '#2a2018', apron: true, lashes: true, freckles: true, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [BW.x - 10.5, BW.z + 4.4], face: [BW.x - 10.5, BW.z], anim: 'idle' }],
      barks: ['Sit down before you fall down.'],
    },
    {
      id: 'gerens_tonkin', name: 'Gerens Tonkin', title: 'Brass and instruments',
      look: { ...KILNFOLK, hair: '#9a9a96', hairStyle: 3, facial: 8, tunic: '#4a3e2e', trim: '#d8b050', trousers: '#2e2a24', boots: '#1e1a16', hat: 'beret', hatColor: '#3a3024', age: 0.75 },
      schedule: [{ from: 0, to: 24, at: [BW.x + 33.5, BW.z - 4.4], face: [BW.x + 33.5, BW.z], anim: 'idle' }],
      barks: ['Mind the case.'],
    },
  ],
  dialogue: { jory_tallack: jory, jory_tallack_kell: joryKell, ebrel, kenver, hext, agnes_lusty: agnes, loveday_hocking: loveday, gerens_tonkin: gerens },
  quests,
  shops: {
    loveday_hocking: {
      id: 'loveday_hocking', name: 'The Lamp & Spanner', owner: 'loveday_hocking',
      stock: [{ item: 'bread', price: 4 }, { item: 'mutton_pie', price: 12 }, { item: 'smoked_eel', price: 26 }, { item: 'brown_ale', price: 5 }],
      buyRate: () => 0.5,
      footer: () => 'Loveday pays half of an item\'s worth',
    } as ShopDef,
    agnes_lusty: {
      id: 'agnes_lusty', name: 'Agnes Lusty\'s forge', owner: 'agnes_lusty',
      stock: [{ item: 'iron_bar', price: 60 }, { item: 'iron_pickaxe', price: 300 }, { item: 'iron_hatchet', price: 240 }],
      buyRate: () => 0.55,
      footer: () => 'Agnes pays a little over half for iron and steel',
    } as ShopDef,
    gerens_tonkin: {
      id: 'gerens_tonkin', name: 'Tonkin\'s, brass and instruments', owner: 'gerens_tonkin',
      stock: [{ item: 'lockpick', price: 4 }, { item: 'bronze_bar', price: 30 }, { item: 'fishing_rod', price: 20 }],
      buyRate: (_g, item) => (item === 'brass_cog' ? 0.9 : 0.5),
      footer: () => 'Gerens pays well for brass cogs',
    } as ShopDef,
  },
  readables: {
    kellNotice: {
      title: 'Notice on the Brasswick board',
      body: 'BY ORDER OF THE WHEEL\n\nNo person to go through the Escapement Gate until further word. The Works are running fast.\n\nKeep off the slope plates after dark. Shut your shutters against the steam.\n\nE. Rundle, for the Wheel\n\nUnder it, chalked: "LET IT OUT SLOW"',
    },
  },
  things: [
    { id: 'kellNotice', x: BW.x - 6, z: BW.z - 3.6, label: 'Read the notice', radius: 2.2, read: 'kellNotice' },
    ...VENTS.map((v) => ({
      id: 'vent-' + v.id, x: v.x + 0.5, z: v.z + 2.6, label: 'Turn the valve wheel', radius: 2.6,
      when: (g: GameApi) => at(g, VENT) === 'vents' && !g.flag('ventShut:' + v.id),
      use: (g: GameApi) => {
        g.setFlag('ventShut:' + v.id, true);
        g.toast(`You lean on the wheel at ${v.name.replace(/^The /, 'the ')}. It turns hard, then easier, then stops. The roar drops to a hiss.`);
      },
    })),
    {
      id: 'kellGovernor', x: GOVERNOR.x, z: GOVERNOR.z, y: GOVERNOR.y, label: 'Fit the iron weights to the Governor', radius: 3.4,
      when: (g: GameApi) => at(g, ESCQ) === 'gate' && !g.flag('kellWeights'),
      use: (g: GameApi) => {
        if (!g.take('iron_weights', 1)) { g.toast('You need the iron weights from Agnes Lusty.'); return; }
        g.setFlag('kellWeights', true);
        g.toast('You knock the crystal weights off their pins and set the iron in their place. When the arms turn again, the iron swings out wide and hangs there, heavy, holding.');
      },
    },
  ],
};
