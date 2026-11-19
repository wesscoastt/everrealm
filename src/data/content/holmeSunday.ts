import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories at Holme Staithe, on the Wrath Levels (owner 2026-11-13, content order: fill the Counties first).
//
// hsBab, EEL SUNDAY (Peg Haddow, the Staithe House, once The Sluice is settled): every year Holme's two houses bab
// for eels off the staithe for the pewter eel, and for twenty-two years Sim Fenner of the Eel and Punt has won it.
// Peg's babber, her nephew Dickon, has gone to dig the company's drain. Dig lobworms where the cattle stand, bab off
// the end of the staithe, and take the catch to the reeve to be weighed. The Staithe House has the heavier catch,
// but the first page of the eel book says the pewter goes to the heaviest single eel, and Sim caught that. Choice
// hsBab = 'rule' (Ambrose reads it out; Sim hands Peg the pewter anyway and has a new rule written under the old)
// | 'quiet' (the page stays shut; Sim knew the rule all along and kept it to himself). 'worms' -> 'bab' -> 'weigh'
// -> 'peg' -> done.
//
// hsTrack, THE OLD ROAD (Constance Mabey, Harrowgate's surveyor, on the fen west of the mere): the falling water has
// let up a road of split oak laid across the old mere, older than anything in Holme. Drain No. 5 is marked straight
// through it. Walk it past the adders on the warm timbers to a ring of posts at the old water's edge, where five
// bronze spearheads lie bent double. Choice hsTrack = 'round' (she redraws the cut and answers to Harrowgate for it)
// | 'record' (the cut goes through; she draws every stake and sends the spears to the Collegium). 'walk' -> 'back'.
//
// Positions are literal (content modules import types only). Holme's square is at (-890, 1010); the staithe runs out
// west into the mere from (-917, 1014) to (-926, 1014); the road is built in world/sites.ts (buildOuterTown, holme).

const BAB = 'hsBab', TRACK = 'hsTrack';
/** Where the cattle stand, north-east of the houses. */
const WORMS: [number, number][] = [[-861.5, 1024.5], [-857.5, 1030.5], [-864.5, 1035.5]];
/** The end of the staithe. */
const BAB_AT = { x: -925.5, z: 1014.5 };
/** Constance at the road's east end, by the mere; the adders along it; the ring of posts at its west end. */
const MABEY = { x: -947.5, z: 1021.5 };
const ADDERS: [number, number][] = [[-951, 1024], [-955, 1026], [-959, 1029], [-963, 1031]];
const RING = { x: -969.5, z: 1036.5 };

const dug = (g: GameApi) => WORMS.filter((_, i) => g.flag('hsWorm' + i)).length;
const sluiceDone = (g: GameApi) => at(g, 'otSluice') === 'done';

// ================================================================ Eel Sunday

const pegNodes: Record<string, DNode> = {
  es1: {
    text: 'You\'ve a good pair of hands on you. Can you sit still?',
    options: [{ text: 'Sit still for what?', next: 'es2' }, { text: 'Not now.' }],
  },
  es2: { text: 'Eel Sunday. The two houses bab off the staithe for the pewter eel, this one and the Eel and Punt, and have done since before the reeves wrote things down. Which is a long time. Ask Ambrose.', next: 'es3' },
  es3: { text: 'Sim Fenner has won it twenty-two years running. Not because he\'s good. Because his father taught him to bab and mine taught me to cook.', next: 'es4' },
  es4: { text: 'My nephew Dickon babs for this house. Dickon has gone to dig the company\'s drain for a shilling a day, and the company\'s drain is why there\'ll be no water to bab in by next Eel Sunday. I\'ve not spoken to him since.', next: 'es5' },
  es5: {
    text: 'So it\'s you. Lobworms first. Dig them where the cattle have trodden the ground soft, north-east of the houses. Then out to the end of the staithe, worms on the wool, and sit still.',
    options: [
      { text: 'I\'ll bab for the Staithe House.', effect: (g) => { g.give('hs_worsted', 1); g.setStage(BAB, 'worms'); }, next: 'es6' },
      { text: 'Not now.' },
    ],
  },
  es6: { text: 'There\'s the wool. The worms go on it like beads on a string. An eel bites, its teeth catch in the wool, and you lift it out before it thinks better of it. No hook. A hook is cheating, on Eel Sunday.' },
  esWait: {
    text: (g) => {
      const s = at(g, BAB);
      if (s === 'worms') return `Lobworms. North-east of the houses, where the cattle stand. ${dug(g)} digs of three.`;
      if (s === 'bab') return 'End of the staithe. Sit still. Don\'t talk to the eels. Sim talks to the eels, and it doesn\'t help him.';
      return 'Take them to Ambrose. He weighs, he writes it down, and nobody argues with the book. That\'s the whole point of Ambrose.';
    },
  },
  esQ1: { text: 'Twenty-two years. Twenty-two years I\'ve watched that pewter eel go up over Sim Fenner\'s bar.', next: 'esQ2' },
  esQ2: { text: 'And then he comes in here. Sim Fenner, in my house. Shakes my hand and tells me his father taught him the old rule when he was a boy. Heaviest single eel. He sat on it all afternoon.', next: 'esQ3' },
  esQ3: {
    text: 'He says the drain will finish Eel Sunday in a year or two whatever anyone does, and he\'d sooner the last pewter went up somewhere it\'s never been. I didn\'t know what to say. I gave him a drink. I have never in my life given Sim Fenner a drink.',
    options: [{ text: 'It looks good over your bar.', effect: (g) => { g.addMarks(80); g.setStage(BAB, 'done'); } }],
  },
  esR1: { text: 'Heaviest single eel. I\'ve been babbing off that staithe since I was nine, and nobody ever told me that.', next: 'esR2' },
  esR2: { text: 'And then Sim Fenner gets up with his great eel in one fist and the pewter in the other, walks it down the staithe and puts it in my hands. For the heaviest catch, he says. And tells Ambrose to write a new line under the old one.', next: 'esR3' },
  esR3: {
    text: 'So it\'s mine, and it\'s honest, and I owe Sim Fenner for it, which I will never hear the end of. You did right. I hate that you did right. Here, take this.',
    options: [{ text: 'Next year, then.', effect: (g) => { g.addMarks(80); g.setStage(BAB, 'done'); } }],
  },
};

const tilneyNodes: Record<string, DNode> = {
  ew1: { speaker: 'narrator', text: 'Ambrose Tilney hangs the Staithe House\'s basket from a steelyard, slides the weight along the arm, and writes on a slate. Beside him on a barrel lies the eel book, a fat ledger in calf gone as soft as a glove.', next: 'ew2' },
  ew2: { text: 'Staithe House: nine pounds and three ounces, in eleven eels. Eel and Punt: eight pounds and twelve, in six. That\'s the Staithe House\'s, for the first time in twenty-two years. I\'ll write it in.', next: 'ew3' },
  ew3: { text: 'There\'s a thing. The first reeve wrote the rule at the top of the first page, a hundred and sixty years ago, and nobody has turned back that far since. The pewter eel goes to the heaviest single eel. Not the heaviest catch.', next: 'ew4' },
  ew4: { text: 'Sim had a four-pounder. The biggest eel I\'ve weighed in nine years. By the first page, it\'s his.', next: 'ew5' },
  ew5: {
    text: 'I write things down. I don\'t decide what gets read out on the staithe. You babbed, so it\'s yours to lose. Shall I read the rule?',
    options: [
      { text: 'Read it out. A rule is a rule.', effect: (g) => { g.take('hs_eels', 1); g.setFlag('hsBab', 'rule'); g.setStage(BAB, 'peg'); }, next: 'ewR' },
      { text: 'Leave the first page shut. Peg has waited long enough.', effect: (g) => { g.take('hs_eels', 1); g.setFlag('hsBab', 'quiet'); g.setStage(BAB, 'peg'); }, next: 'ewQ' },
    ],
  },
  ewR: { text: 'Then I\'ll read it. Peg will want to kill one of us, and it\'ll be me, because I\'m nearer. Go and stand by her. It helps.' },
  ewQ: { text: 'Then the book says nine pounds three, Staithe House, and that is all it says. Go and tell Peg. She\'ll want to hear it from the one who caught them.' },
};

// ================================================================ The Old Road

const mabey: DialogueTree = {
  start: (g) => {
    const s = at(g, TRACK);
    if (!s) return 't1';
    if (s === 'back') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    t1: { speaker: 'narrator', text: 'A woman in a company coat, a surveyor\'s chain over one shoulder and a rag tied round one ankle, frowning down a line of black stakes that runs away west across the drying fen.', next: 't2' },
    t2: { text: 'Constance Mabey, Harrowgate and Daughters. I\'m marking the line for Drain Number Five. Don\'t let Peg Haddow hear me say that.', next: 't3' },
    t3: { text: 'The water\'s come down far enough to let these up. Oak stakes, black as coal, in two rows, with split timbers laid end to end between them. It\'s a road. Somebody built a road across the mere, when it was a mere.', next: 't4' },
    t4: { text: 'Nobody in Holme knew it was there. Not Obed Gedge, and Obed knows where every eel in the Levels was born. It\'s older than the reeve\'s book, and the reeve\'s book is older than anything.', next: 't5' },
    t5: { text: 'My line goes straight through it, and the gang starts on Monday. Before they do, I want to know where it goes.', next: 't5b' },
    t5b: {
      text: 'I can\'t walk it myself. The adders lie on the timbers in the sun, and one of them has had my ankle already.',
      options: [{ text: 'I\'ll walk it for you.', effect: (g) => g.setStage(TRACK, 'walk'), next: 't6' }, { text: 'Not now.' }],
    },
    t6: { text: 'Thank you. Watch where you put your hands. They\'re the same colour as the wood.' },
    wait: { text: (g) => (killed(g, 'hsAdders') < 4 ? 'West, along the stakes. Adders on the timbers. Mind your feet, and mind theirs, if they had any.' : 'Go on to the end. I want to know what\'s there.') },
    b1: { speaker: 'narrator', text: 'You lay the spearheads on her drawing board, one by one. She doesn\'t touch them for a long moment.', next: 'b2' },
    b2: { text: 'Bent double. All five. You don\'t do that to a spear by dropping it. Somebody stood in that ring and broke good bronze over their knee and gave it to the water.', next: 'b3' },
    b3: { text: 'My father would have called that a waste. My father cut the first Harrowgate drain.', next: 'b4' },
    b4: { text: 'If I draw the cut round the ring, that\'s two hundred yards more drain, and Harrowgate will want the reason in writing, with my name under it.', next: 'b5' },
    b5: {
      text: 'If I don\'t, the gang digs through it on Monday. I draw every stake first and send these to the Collegium in Ansbury, so somebody knows it was here. What would you do?',
      options: [
        { text: 'Draw the line round it.', effect: (g) => { g.take('hs_spears', 1); g.addMarks(90); g.setFlag('hsTrack', 'round'); g.setStage(TRACK, 'done'); }, next: 'bR' },
        { text: 'Record it, and let the cut go through.', effect: (g) => { g.take('hs_spears', 1); g.addMarks(90); g.setFlag('hsTrack', 'record'); g.setStage(TRACK, 'done'); }, next: 'bC' },
      ],
    },
    bR: { text: 'Then I\'ll write the letter tonight, and if they dock my pay, they dock my pay. I\'ll tie a white rag to a stake at the ring so the gang knows where to stop. They\'ll ask why. Then they\'ll go and look, and they won\'t ask again.' },
    bC: { text: 'Then I\'ll draw it properly. Every stake, every timber, the ring, the place each spear lay. The drawings will outlast the road. I know that\'s not the same thing.' },
    after: {
      text: (g) => (g.flag('hsTrack') === 'round'
        ? 'Harrowgate wrote back. Three words: "Noted. Proceed. H." I have no idea whether that means I\'m sacked. I\'m still drawing, so I suppose not.'
        : 'The Collegium wrote back. They want the drawings for their library, and they asked whether there are any more roads. I\'ve started looking. I keep finding stakes.'),
    },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [BAB]: {
    id: BAB, name: 'Eel Sunday', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'worms') return 'Every year Holme Staithe\'s two houses bab for eels off the staithe for the pewter eel, and Sim Fenner of the Eel and Punt has won it twenty-two years running. Peg Haddow\'s babber has gone to dig the company\'s drain, so I\'m babbing for the Staithe House. First, lobworms, from where the cattle stand north-east of the houses.';
      if (s === 'bab') return 'I have the worms and Peg\'s red worsted. Now to the end of the staithe, to thread the worms on the wool and sit still.';
      if (s === 'weigh') return 'The babbing is over. Ambrose Tilney, the reeve, weighs both houses\' catches and writes them in the eel book.';
      if (s === 'peg') return g.flag('hsBab') === 'rule' ? 'The eel book\'s first page gives the pewter to the heaviest single eel, which was Sim Fenner\'s. Ambrose read the rule out. Peg will want to hear it from me.' : 'The eel book\'s first page gives the pewter to the heaviest single eel, which was Sim Fenner\'s. Ambrose kept the page shut, and the Staithe House has the pewter. Peg will want to hear it from me.';
      return g.flag('hsBab') === 'rule' ? 'Sim Fenner won the pewter by the old rule, then handed it to Peg for the heaviest catch and had a new rule written under the old one.' : 'The pewter eel hangs over the Staithe House\'s bar. Sim Fenner knew the old rule all along, and kept it to himself.';
    },
    objectives: (g, s) => (s === 'worms' ? WORMS.map((_, i) => ({ text: `Dig for lobworms where the cattle stand (${['first', 'second', 'third'][i]} spot)`, done: !!g.flag('hsWorm' + i), marker: 'hsWorm' + i }))
      : s === 'bab' ? [{ text: 'Bab for eels off the end of the staithe', marker: 'hsBabSpot' }]
      : s === 'weigh' ? [{ text: 'Take the catch to Ambrose Tilney, the reeve', marker: 'tilney' }]
      : s === 'peg' ? [{ text: 'Tell Peg Haddow at the Staithe House', marker: 'haddow' }] : []),
    advance: (g, s) => (s === 'worms' && dug(g) >= WORMS.length ? 'bab' : null),
    marks: (g, s): Marks => (!s && sluiceDone(g) ? { haddow: '!' } : s === 'weigh' ? { tilney: '?' } : s === 'peg' ? { haddow: '?' } : {}),
    walk: { cast: ['haddow', 'tilney'], from: { quests: { otSluice: 'done' }, flags: { hsChoice: 'quiet' } } },
  },
  [TRACK]: {
    id: TRACK, name: 'The Old Road', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'walk') return 'The falling water has let up a road of split oak laid across the old mere west of Holme Staithe, older than anything in the village. Constance Mabey, Harrowgate\'s surveyor, has marked Drain No. 5 straight through it, and wants to know where it goes before the gang starts on Monday. Adders lie on the timbers.';
      if (s === 'back') return 'The road ends in a ring of posts at the old water\'s edge, and in the middle lay five bronze spearheads, every one bent double. Constance should see them.';
      return g.flag('hsTrack') === 'round' ? 'Constance redrew Drain No. 5 round the ring of posts, and put her name to the reason.' : 'Drain No. 5 will go through the old road. Constance is drawing every stake first, and the spearheads have gone to the Collegium in Ansbury.';
    },
    objectives: (g, s) => (s === 'walk' ? [
      { text: `Clear the adders off the old road (${Math.min(4, killed(g, 'hsAdders'))}/4)`, done: killed(g, 'hsAdders') >= 4 },
      { text: 'Follow the road to its end', marker: 'hsRing' },
    ] : s === 'back' ? [{ text: 'Show Constance Mabey what you found', marker: 'hs_mabey' }] : []),
    marks: (g, s): Marks => (!s && sluiceDone(g) ? { hs_mabey: '!' } : s === 'back' ? { hs_mabey: '?' } : {}),
    walk: { cast: ['hs_mabey'], kill: { walk: [['fenadder', 4]] }, from: { quests: { otSluice: 'done' }, flags: { hsChoice: 'quiet' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hsAdders', type: 'fenadder', at: ADDERS, when: (g) => at(g, TRACK) === 'walk' },
];

const WORM_TOASTS = [
  'The ground is pocked with hoofprints and as soft as porridge. Three spadefuls give you a fistful of lobworms, cold and indignant.',
  'A cow watches you dig up her standing-place with deep suspicion. Another fistful.',
  'Under a cowpat, the best worms of all. Nobody needs to know where they came from.',
];
const BAB_TOASTS = [
  'You thread the worms on the red wool, tie it in a bunch on the line, and drop it off the end of the staithe into the brown water. Something nibbles. You lift slowly, and an eel comes up with its teeth caught in the wool, furious. One.',
  'Along the bank, Sim Fenner of the Eel and Punt is babbing from a chair he has carried out for the purpose. He doesn\'t look over. You lift four more, one after another, and one is as long as your forearm.',
  'Ambrose rings his handbell at the head of the staithe, and by custom the babbing stops. Eleven eels in the Staithe House\'s basket. Fewer in Sim\'s, but one of his is as thick as your wrist.',
];

const things: WorldThing[] = [
  ...WORMS.map(([x, z], i): WorldThing => ({
    id: 'hsWorm' + i, x, z, label: 'Dig for lobworms', radius: 2.4, look: 'trampled',
    when: (g) => at(g, BAB) === 'worms' && !g.flag('hsWorm' + i),
    use: (g) => { g.setFlag('hsWorm' + i, 1); g.toast(WORM_TOASTS[i]); },
  })),
  {
    id: 'hsBabSpot', x: BAB_AT.x, z: BAB_AT.z, label: 'Bab for eels', radius: 2.6, look: 'none',
    when: (g) => at(g, BAB) === 'bab',
    use: (g) => {
      const n = Number(g.flag('hsBabbed') ?? 0);
      g.toast(BAB_TOASTS[Math.min(n, 2)]);
      if (n >= 2) { g.take('hs_worsted', 1); g.give('hs_eels', 1); g.setStage(BAB, 'weigh'); } else g.setFlag('hsBabbed', n + 1);
    },
  },
  {
    id: 'hsRing', x: RING.x, z: RING.z, label: 'Look in the ring of posts', radius: 3.2, look: 'none',
    when: (g) => at(g, TRACK) === 'walk' && killed(g, 'hsAdders') >= 4,
    use: (g) => { g.give('hs_spears', 1); g.setStage(TRACK, 'back'); g.toast('The road ends in a ring of nine posts at what was once the water\'s edge, their tops rotted to points. In the black peat in the middle, where the water stood, lie five bronze spearheads, green with age. Every one of them has been bent double.'); },
  },
];

const NPCS: NpcDef[] = [
  { id: 'hs_mabey', name: 'Constance Mabey', title: 'Surveyor, Harrowgate & Daughters', look: { frame: 'f', skin: '#e0b48e', hair: '#4a3020', hairStyle: 1, eyes: '#4a4a3a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#3a2a1e', lashes: true, build: 0.98, age: 0.42 },
    schedule: [{ from: 0, to: 24, at: [MABEY.x, MABEY.z], face: [MABEY.x - 4, MABEY.z + 2.5], anim: 'idle' }], barks: ['Two rows of stakes. Straight as a rule.', 'Mind the adders.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'hs_worsted', name: 'A hank of red worsted', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'yarn', a: '#a8322a' }, desc: 'Peg Haddow\'s babbing wool. The worms go on it like beads on a string.' },
  { id: 'hs_eels', name: 'The Staithe House\'s eels', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'fish', a: '#4a4a32' }, desc: 'Eleven eels in a wicker basket, still arguing. For Ambrose Tilney\'s steelyard.' },
  { id: 'hs_spears', name: 'Five bent spearheads', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'sword', a: '#6a8a6a' }, desc: 'Bronze, green with age, each one bent double on purpose and laid in the water in a ring of posts at the end of the old road.' },
];

export const HOLME_SUNDAY: RegionContent = {
  id: 'holmeSunday',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { hs_mabey: mabey },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'haddow', (g) => {
      const s = at(g, BAB);
      if (!s) return sluiceDone(g) ? 'es1' : undefined;
      if (s === 'worms' || s === 'bab' || s === 'weigh') return 'esWait';
      if (s === 'peg') return g.flag('hsBab') === 'rule' ? 'esR1' : 'esQ1';
      return undefined;
    }, pegNodes);
    hook(D, 'tilney', (g) => (at(g, BAB) === 'weigh' && g.count('hs_eels') > 0 ? 'ew1' : undefined), tilneyNodes);
  },
};
