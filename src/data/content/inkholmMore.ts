import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories on Inkholm (owner 2026-11-13, content order: fill the Counties first), with the morality
// system's choices (docs/MORALITY.md). Both open once you're over the water (inkCrossing done).
//
// inkScale, SHORT WEIGHT (Nance Bray, a picker at Black Hythe): pickers are paid by the stone at the works' scales. Her
// basket weighed three stone on Kerra's steelyard at the Staithe Inn and two and a half at the works. Borrow Kerra's
// sealed Charter weight, set it on the works' scale, and see. The beam's been filed. Then settle it with Jed Coyle, the
// weighman: to Vosper (the company sacks him and keeps the difference), to Bryony and the island council (the company
// pays the pickers back, in public), a quiet deal (Coyle pays them back out of what he skimmed, and you say nothing), or
// ([Bad or Evil]) a cut of the skim to forget it. inkScale = 'vosper' | 'council' | 'deal' | 'cut'.
//
// inkSummer, WHAT THE SUMMER KEPT (Enid Rosevear, Gillsby; once the Grey is broken, inkPriory done): she was greyed all
// summer and remembers none of it. In her apron, a child's whistle she has never seen. Follow her summer through the cap
// woods south-east of the staithe (her lean-to, her fire, a mark cut in a stem) to a clearing where a greyed child still
// sits, and the greyed who wander there. Burn the reek she was given for her own cure upwind of the girl, and she coughs
// the grey out: Lowdy, a picker's daughter from Black Hythe whose people died of it. Enid kept her alive all summer
// without knowing. Then: tell Enid all of it (she takes Lowdy home), tell her she was alone (Doctor Hale takes the girl
// to the Collegium's foundlings), or ([Kind]) bring Lowdy to her and say nothing, and let them know each other.
// inkSummer = 'told' | 'spared' | 'met'.

const SCALE = 'inkScale', SUMMER = 'inkSummer';
const G = { x: 2512, z: 1645 }, W = { x: 2966, z: 1724 };
const NANCE = { x: W.x + 11.5, z: W.z - 10.2 }, COYLE = { x: W.x + 3.5, z: W.z - 10.2 };
const SCALES = { x: W.x + 3.5, z: W.z - 7.5 };
const ENID = { x: G.x - 8.5, z: G.z + 3.3 }, LOWDY_HOME = { x: G.x - 9.5, z: G.z + 4.6 };
const TRACES: [number, number, string][] = [[2592.5, 1668.5, 'cloth'], [2600.5, 1676.5, 'scorch'], [2612.5, 1679.5, 'chalk']];
const CHILD = { x: 2606.5, z: 1685.5 };
const GREYED: [number, number][] = [[2612, 1691], [2598, 1690]];

const over = (g: GameApi) => at(g, 'inkCrossing') === 'done';
const traced = (g: GameApi) => TRACES.filter((_, i) => g.flag('inkTrace' + i)).length;

// ================================================================ Short Weight

const nance: DialogueTree = {
  start: (g) => {
    const s = at(g, SCALE);
    if (!s) return 'n1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    n1: { speaker: 'narrator', text: 'A broad woman with ink to the elbows, sitting on an upturned basket by the works gate and glaring at the weighhouse as if it owed her money. It does.', next: 'n2' },
    n2: { text: 'Nance Bray. I pick for the works, the same as my mother did. They pay by the stone, at their scales.', next: 'n3' },
    n3: { text: 'Monday\'s basket went three stone on Kerra\'s steelyard at the inn. At the works it went two and a half. Every basket, every picker, half a stone short. I can\'t prove it. Who\'s going to believe a picker over a beam?', next: 'n4' },
    n4: {
      text: 'Kerra keeps a stone weight with the Charter\'s lead seal on it. Nobody argues with a seal. Borrow it, and put it on their scale, and see.',
      options: [{ text: 'I\'ll borrow Kerra\'s weight.', effect: (g) => g.setStage(SCALE, 'weight') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, SCALE) === 'weight' ? 'Kerra, at the Staithe Inn. Tell her it\'s for me. She owes me for the caps.' : at(g, SCALE) === 'scale' ? 'Put it on the scale. The one by Coyle\'s table.' : 'Well? Talk to Coyle. Or don\'t, and I\'ll talk to him with this basket.') },
    after: {
      text: (g) => {
        const f = g.flag(SCALE);
        if (f === 'council') return 'Bryony read the beam out at the council like a charge sheet. The company paid back every half stone since Lady Day. I bought my mother a coat. She says it\'s too good to wear.';
        if (f === 'vosper') return 'Coyle\'s gone. The new weighman\'s honest, so far. Nobody gave us back a penny. That\'s the company for you: it fixes the beam and keeps the change.';
        if (f === 'deal') return 'Coyle came round every house with a purse, red as a beet, paying back half stones. He wouldn\'t say why. I\'ve a fair idea.';
        return 'The beam\'s still short. Coyle walks about like a man who\'s been forgiven by somebody important. I wonder who.';
      },
    },
  },
};

const kerraNodes: Record<string, DNode> = {
  kw1: { text: 'Nance sent you? Then you want the stone. Sealed by the Charter\'s weigher at Gullmouth, fourteen pounds to the grain. Bring it back, or I\'ll send Nance after you.', options: [{ text: 'Thank you, Kerra.', effect: (g) => { g.give('ink_weight', 1); g.setStage(SCALE, 'scale'); } }] },
};

const coyle: DialogueTree = {
  start: (g) => (at(g, SCALE) === 'coyle' ? 'c1' : at(g, SCALE) === 'done' ? 'cAfter' : 'c0'),
  nodes: {
    c0: { text: 'Jed Coyle, weighman. If you\'ve a basket, put it on the pan. If you\'ve a complaint, put it in writing, and then put the writing in the river.' },
    c1: { text: 'Fourteen pounds on Kerra\'s stone, thirteen on my beam. I can see you\'ve seen it. Don\'t shout.', next: 'c2' },
    c2: { text: 'It\'s not for me. Vosper\'s on at me for yield, and the yield\'s down since the Grey, and if the books don\'t balance it\'s my place. So the beam balances them. It\'s half a stone. Nobody starves on half a stone.', next: 'c3' },
    c3: {
      text: 'What are you going to do?',
      options: [
        { text: 'I\'m taking this to Vosper.', moral: { id: 'inkScale:vosper', a: 2, tr: { honesty: 2 }, rep: { company: 4 }, npc: { ink_coyle: -25, ink_nance: 5 } }, effect: (g) => { g.take('ink_weight', 1); g.setFlag(SCALE, 'vosper'); g.addMarks(60); g.setStage(SCALE, 'done'); }, next: 'cV' },
        { text: 'I\'m taking it to Bryony and the island council.', moral: { id: 'inkScale:council', a: 6, tr: { courage: 3, honesty: 3 }, rep: { company: -6 }, npc: { ink_coyle: -30, ink_nance: 25, bryony: 10 }, note: 'Took the short-weighted beam at Black Hythe to the island council, and the company paid the pickers back.', fame: 'caught the works beam short at Black Hythe', spread: 'local' }, effect: (g) => { g.take('ink_weight', 1); g.setFlag(SCALE, 'council'); g.addMarks(80); g.setStage(SCALE, 'done'); }, next: 'cC' },
        { text: 'Pay every picker back out of what the beam took, and I say nothing.', moral: { id: 'inkScale:deal', a: 3, tr: { compassion: 2, deception: 1 }, npc: { ink_coyle: 10, ink_nance: 10 } }, effect: (g) => { g.take('ink_weight', 1); g.setFlag(SCALE, 'deal'); g.addMarks(70); g.setStage(SCALE, 'done'); }, next: 'cD' },
        { text: 'A third of the beam\'s take, every month. Then I never saw it.', need: { band: ['bad', 'evil'] }, moral: { id: 'inkScale:cut', a: -10, tr: { greed: 5, deception: 3 }, npc: { ink_coyle: 5, ink_nance: -20 }, note: 'Took a cut of the short weight at Black Hythe to keep quiet about it.', major: true }, effect: (g) => { g.take('ink_weight', 1); g.setFlag(SCALE, 'cut'); g.addMarks(150); g.setStage(SCALE, 'done'); }, next: 'cT' },
      ],
    },
    cV: { text: 'Vosper. He\'ll sack me and keep every half stone, and he\'ll thank you for it. You\'ll see.' },
    cC: { text: 'The council. Bryony Kitto reading my beam out in the long room. I\'d rather Vosper. I\'d rather the river. Go on, then.' },
    cD: { text: 'Every picker. Every half stone. That\'s months. That\'s my savings. Yes. All right. Yes. I didn\'t want to do it in the first place.' },
    cT: { text: 'A third. Every month. You and Vosper would get on. Here\'s this month\'s. Don\'t come in daylight.' },
    cAfter: { text: (g) => (g.flag(SCALE) === 'cut' ? 'You again. It\'s not the first yet.' : 'Weighman, still, somewhere. Mind the step.') },
  },
};

// ================================================================ What the Summer Kept

const enid: DialogueTree = {
  start: (g) => {
    const s = at(g, SUMMER);
    if (!s) return 'e1';
    if (s === 'enid') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    e1: { speaker: 'narrator', text: 'A woman of forty or so mending a net on the staithe, too thin for her clothes, who keeps stopping to turn something over in her apron pocket.', next: 'e2' },
    e2: { text: 'Enid Rosevear. I was greyed. All summer, Doctor Hale says. I went into the woods in May and came out in September, and in between there\'s nothing. Not a dream. Nothing.', next: 'e3' },
    e3: { text: 'And this was in my apron when they found me. A child\'s whistle. Cut from a cap stem, badly, by somebody who\'d never cut a whistle before. I\'ve no child. I never had one.', next: 'e4' },
    e4: {
      text: 'Mark says leave it. I can\'t leave it. Will you go where I was? Doctor Hale says they found me south-east of the staithe, in the deep caps. Take this. Bryony gave me reek for my cure, and I didn\'t need all of it.',
      options: [{ text: 'I\'ll find out where your summer went.', effect: (g) => { g.give('ink_reek2', 1); g.setStage(SUMMER, 'woods'); } }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, SUMMER) === 'woods' ? `South-east, in the deep caps. ${traced(g)} things found, of what I don\'t know.` : 'You found someone? Then go to them. I\'ll be here. I\'m always here now.') },
    b1: { speaker: 'narrator', text: 'Enid stands up when she sees you, and the net falls off her lap, and she doesn\'t pick it up.', next: 'b2' },
    b2: {
      text: 'Well? Where did I go?',
      options: [
        { text: 'You went into the woods and found a child nobody else would go near, and you kept her alive all summer.', moral: { id: 'inkSummer:told', a: 6, tr: { honesty: 4, compassion: 2 }, npc: { ink_enid: 25 }, note: 'Told Enid Rosevear she kept a greyed child alive in the cap woods all summer, and she took the girl home.', major: true, fame: 'found the child Enid Rosevear kept alive in the cap woods', spread: 'local' }, effect: (g) => { g.setFlag(SUMMER, 'told'); g.addMarks(90); g.setStage(SUMMER, 'done'); }, next: 'bT' },
        { text: 'You were alone out there. I\'m sorry. There\'s nothing more to find.', moral: { id: 'inkSummer:spared', tr: { deception: 3, compassion: 1 }, npc: { ink_enid: 5 }, note: 'Told Enid Rosevear she was alone all summer, and let Doctor Hale take the child to the Collegium\'s foundlings.' }, effect: (g) => { g.setFlag(SUMMER, 'spared'); g.addMarks(70); g.setStage(SUMMER, 'done'); }, next: 'bS' },
        { text: '(Step aside, so she can see who\'s standing behind you.)', need: { trait: { compassion: [57, 100] } }, moral: { id: 'inkSummer:met', a: 8, tr: { compassion: 4 }, npc: { ink_enid: 30 }, note: 'Brought Lowdy back to Enid Rosevear on the staithe, and let them know each other without a word.', major: true, fame: 'brought the cap-wood child home to Enid Rosevear', spread: 'local' }, effect: (g) => { g.setFlag(SUMMER, 'met'); g.addMarks(100); g.setStage(SUMMER, 'done'); }, next: 'bM' },
      ],
    },
    bT: { text: 'A child. Me. All summer. And I don\'t remember her face. Bring her. No, I\'ll go. Where is she? Mark can shout all he likes. Mark can shout at the both of us.' },
    bS: { text: 'Alone. Then the whistle\'s just a whistle. I\'ll put it on the shelf. I don\'t know why I can\'t throw it away.' },
    bM: { speaker: 'narrator', text: 'The girl looks at Enid. Enid looks at the girl. Neither of them knows the other, and then the girl puts out her hand for the whistle, and Enid gives it to her before she knows she has, and the girl blows one bad, breathy note on it. Enid sits down on the staithe very suddenly, and holds out her arms, and doesn\'t know why, and doesn\'t need to.' },
    after: {
      text: (g) => {
        const f = g.flag(SUMMER);
        if (f === 'spared') return 'The whistle\'s on the shelf. Some nights I take it down. I can\'t think why.';
        return 'Lowdy\'s learned the whistle. She plays it at Mark until he laughs. He cut her a better one. It\'s worse.';
      },
    },
  },
};

const lowdy: DialogueTree = {
  start: () => 'l1',
  nodes: {
    l1: { text: (g) => (at(g, SUMMER) === 'child' ? 'Where\'s my Enid?' : 'I\'m Lowdy. I\'m Enid\'s now. Mark says so too, when he thinks I can\'t hear.') },
  },
};

const quests: Record<string, QuestDef> = {
  [SCALE]: {
    id: SCALE, name: 'Short Weight', region: 'inkholm', depth: 'quest',
    notes: (g, s) => {
      if (s === 'weight') return 'Nance Bray says the scales at Black Hythe weigh every picker\'s basket half a stone short. Kerra at the Staithe Inn has a stone weight with the Charter\'s seal. Nobody argues with a seal.';
      if (s === 'scale') return 'I have Kerra\'s sealed stone. Put it on the works scale, by the weighman\'s table.';
      if (s === 'coyle') return 'Fourteen pounds on Kerra\'s stone; thirteen on the works beam. Jed Coyle, the weighman, has seen me see it.';
      const f = g.flag(SCALE);
      return f === 'council' ? 'The island council heard about the beam, and the company paid the pickers back.' : f === 'vosper' ? 'Vosper sacked Coyle and kept the difference.' : f === 'deal' ? 'Coyle paid the pickers back, and I said nothing.' : 'I take a third of the beam\'s take, every month.';
    },
    objectives: (_g, s) => (s === 'weight' ? [{ text: 'Borrow Kerra\'s sealed weight at the Staithe Inn', marker: 'wenna_rowse' }]
      : s === 'scale' ? [{ text: 'Put the sealed weight on the works scale', marker: 'inkScales' }]
      : s === 'coyle' ? [{ text: 'Talk to Jed Coyle, the weighman', marker: 'ink_coyle' }] : []),
    marks: (g, s): Marks => (!s && over(g) ? { ink_nance: '!' } : s === 'weight' ? { wenna_rowse: '?' } : s === 'coyle' ? { ink_coyle: '?' } : {}),
    walk: { cast: ['ink_nance', 'wenna_rowse', 'ink_coyle'], from: { quests: { inkCrossing: 'done' } } },
  },
  [SUMMER]: {
    id: SUMMER, name: 'What the Summer Kept', region: 'inkholm', depth: 'quest',
    notes: (g, s) => {
      if (s === 'woods') return 'Enid Rosevear was greyed all summer and remembers nothing. In her apron was a child\'s whistle she\'s never seen. They found her south-east of the staithe, in the deep caps.';
      if (s === 'child') return 'Her lean-to, her fire, and a mark cut in a cap stem: E, and an L. In a clearing past them, a child still sits greyed, with the greyed wandering round her. Burn Enid\'s reek upwind of her.';
      if (s === 'enid') return 'The child coughed the grey out. Lowdy, a picker\'s daughter from Black Hythe; her people died of it. Enid kept her alive all summer without knowing. Enid should hear it from me, or not.';
      const f = g.flag(SUMMER);
      return f === 'spared' ? 'I told Enid she was alone. Lowdy went to the Collegium\'s foundlings with Doctor Hale.' : 'Lowdy lives with Enid and Mark now.';
    },
    objectives: (g, s) => (s === 'woods' ? TRACES.map((_, i) => ({ text: `Find where Enid spent the summer (${['first', 'second', 'third'][i]} sign)`, done: !!g.flag('inkTrace' + i), marker: 'inkTrace' + i }))
      : s === 'child' ? [{ text: `Drive the greyed off from the clearing (${Math.min(GREYED.length, killed(g, 'inkGreyed'))}/${GREYED.length})`, done: killed(g, 'inkGreyed') >= GREYED.length }, { text: 'Burn the reek upwind of the child', marker: 'inkChild' }]
      : s === 'enid' ? [{ text: 'Go back to Enid Rosevear on Gillsby staithe', marker: 'ink_enid' }] : []),
    advance: (g, s) => (s === 'woods' && traced(g) >= TRACES.length ? 'child' : null),
    marks: (g, s): Marks => (!s && at(g, 'inkPriory') === 'done' ? { ink_enid: '!' } : s === 'enid' ? { ink_enid: '?' } : {}),
    walk: { cast: ['ink_enid'], kill: { child: [['greyed', 2]] }, from: { quests: { inkCrossing: 'done', inkPriory: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'inkGreyed', type: 'greyed', at: GREYED, when: (g) => at(g, SUMMER) === 'child' },
];

const TRACE_TOASTS = [
  'A lean-to of cap-skin, stretched over a fallen stem and pegged with sticks. Two hollows in the moss inside: one long, one very small.',
  'A fire-ring, long cold, and in the soft ground round it two sets of prints: a woman\'s, and a child\'s bare feet, over and over, like a dance or a game.',
  'Cut into a cap stem at shoulder height, badly, with a blunt knife: E, and below it, smaller, an L. And notches, one for every day, more than a hundred of them.',
];

const things: WorldThing[] = [
  { id: 'inkScales', x: SCALES.x, z: SCALES.z, label: 'Put the sealed weight on the scale', radius: 2.4, look: 'none',
    when: (g) => at(g, SCALE) === 'scale',
    use: (g) => { g.setStage(SCALE, 'coyle'); g.toast('You set Kerra\'s stone on the pan. The beam settles at thirteen pounds. Under the near arm, bright in the dark iron, a fresh file mark.'); } },
  ...TRACES.map(([x, z, look], i): WorldThing => ({
    id: 'inkTrace' + i, x, z, label: 'Look closer', radius: 2.4, look: look as WorldThing['look'],
    when: (g) => at(g, SUMMER) === 'woods' && !g.flag('inkTrace' + i),
    use: (g) => { g.setFlag('inkTrace' + i, 1); g.toast(TRACE_TOASTS[i]); },
  })),
  { id: 'inkChild', x: CHILD.x, z: CHILD.z, label: 'Burn the reek upwind of her', radius: 3, look: 'none',
    when: (g) => at(g, SUMMER) === 'child' && killed(g, 'inkGreyed') >= GREYED.length,
    use: (g) => { g.take('ink_reek2', 1); g.setStage(SUMMER, 'enid'); g.toast('The reek catches and the brown smoke rolls over her. She coughs, and coughs, a grey dust, and then she\'s just a thin girl of seven sitting in the moss, crying because she\'s cold. "Where\'s my Enid?" she says.'); } },
];

const NPCS: NpcDef[] = [
  { id: 'ink_nance', name: 'Nance Bray', title: 'Picker, Black Hythe', look: { frame: 'f', skin: '#d8a882', hair: '#4a3020', hairStyle: 2, eyes: '#4a4a3a', tunic: '#3a3a4a', trim: '#2a2a3a', trousers: '#3a3430', boots: '#2a1e14', apron: true, hat: 'kerchief', hatColor: '#2a2a3a', lashes: true, build: 1.12, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [NANCE.x, NANCE.z], face: [COYLE.x, COYLE.z], anim: 'idle' }], when: over, barks: ['Half a stone. Every basket.'] },
  { id: 'ink_coyle', name: 'Jed Coyle', title: 'Weighman, Black Hythe', look: { skin: '#e0b48e', hair: '#6a5a4a', hairStyle: 1, eyes: '#4a4a3a', tunic: '#5a4a3a', trim: '#7a2e22', trousers: '#2e2e30', boots: '#2a1e14', apron: true, build: 1.0, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [COYLE.x, COYLE.z], face: [SCALES.x, SCALES.z], anim: 'idle' }], when: (g) => g.flag(SCALE) !== 'vosper', barks: ['Pan\'s there. Put it on.'] },
  { id: 'ink_enid', name: 'Enid Rosevear', title: 'Gillsby', look: { frame: 'f', skin: '#e0b48e', hair: '#7a6a5a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#5a6a6a', trim: '#3a4a4a', trousers: '#3a3430', boots: '#2a1e14', lashes: true, build: 0.85, age: 0.42 },
    schedule: [{ from: 0, to: 24, at: [ENID.x, ENID.z], face: [ENID.x - 3, ENID.z], anim: 'crouch' }], barks: ['I keep turning it over.'] },
  { id: 'ink_lowdy', name: 'Lowdy', title: 'Gillsby', look: { frame: 'f', skin: '#e8c4a0', hair: '#c8a060', hairStyle: 2, eyes: '#4a6a4a', tunic: '#8a6a5a', trim: '#5a4a3a', trousers: '#3a3430', boots: '#2a1e14', freckles: true, lashes: true, build: 0.6, age: 0.05 },
    schedule: [{ from: 7, to: 20, at: [LOWDY_HOME.x, LOWDY_HOME.z], face: [ENID.x, ENID.z], anim: 'idle' }], when: (g) => at(g, SUMMER) === 'done' && g.flag(SUMMER) !== 'spared', barks: ['Listen!'] },
];

const ITEMS: ItemDef[] = [
  { id: 'ink_weight', name: 'Kerra\'s sealed stone', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'ore', a: '#7a7a72', b: '#5a5a5a' }, desc: 'Fourteen pounds of iron with a lead seal on the ring: the Charter\'s weigher at Gullmouth, true to the grain.' },
  { id: 'ink_reek2', name: 'Enid\'s reek', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#6a5a3a', b: '#3a2a1a' }, desc: 'A twist of Bryony Kitto\'s reek, left over from Enid\'s own cure. Burned upwind, it breaks the Grey.' },
];

export const INKHOLM_MORE: RegionContent = {
  id: 'inkholmMore',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { ink_nance: nance, ink_coyle: coyle, ink_enid: enid, ink_lowdy: lowdy },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'wenna_rowse', (g) => (at(g, SCALE) === 'weight' ? 'kw1' : undefined), kerraNodes);
  },
};
