import type { DialogueTree, DNode, DOption, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// More of Fellers' Camp, Hagworm Wood (levels 10 to 16, where most players go after Ansbury).
//
// hwShort, SHORT COUNT (Ide Marrow, after Calling Timber): Harrowgate paid for thirty-six props and the camp
// sent forty. Count the next load on the stacks (forty, every one sound, every one with the camp's ring
// mark), then ask Saul Raine, the company carter, at his cart. He has the chits: four of every forty
// "Rejected, rot. A.P." He carted those four to the Works with the rest, and they went down No. 1 Drift
// with a P cut in the end grain (Pryce's Oak, harrowgateSide.ts). Back to Ide with the chits. Choice
// hwShort = 'delia' (take them to Delia Harrowgate: the camp's arrears paid, by the company) | 'keep' (Ide
// keeps them in the camp book: "Paper keeps. Pryce doesn't.") | 'pad' (cut forty-four and say nothing: the
// fellers carry it). 'count' -> 'hw_carter' -> 'ide' -> 'delia' | done.
//
// hwSpore, SPORE SEASON (Kit Ashcroft): spore jellies have come up in the felling clearing west of the camp,
// and a log with spore on it is a log Harrowgate refuses. Burst them before they seed. Kit has been sleeping
// out in the tent because Sefton says his cough keeps him awake. Sefton can't hear a tree fall. 'jellies'
// -> 'kit' -> done.
//
// hwBrothers, WHAT SEFTON CAN'T HEAR (Sefton Garrow, if he stayed at the camp): he wants his brother Pell in
// Hollin Ford told that he's going deaf, by someone who isn't him. Pell already knows. He chalks a slate for
// Sefton to read, since shouting never worked: COME HOME FOR LAMMAS. I'LL DO THE TALKING. 'pell' ->
// 'sefton' -> done.

const SHORT = 'hwShort', SPORE = 'hwSpore', BROS = 'hwBrothers';
/** Fellers' Camp (world/sites.ts fellersExtras): the two prop stacks, the company cart, the felling clearing to the west. */
const CAMP = { x: 446, z: 520 };
// (logStack: the north one runs along x from 456 at z 514-515, the south one along z from 524 at x 458-459; you count from in front)
const STACK_A: [number, number] = [CAMP.x + 13, CAMP.z - 7.5], STACK_B: [number, number] = [CAMP.x + 10.5, CAMP.z + 6];
const CARTER: [number, number] = [CAMP.x + 6.6, CAMP.z - 10.6];
const CLEARING: [number, number][] = [[CAMP.x - 26, CAMP.z + 2], [CAMP.x - 29, CAMP.z + 9], [CAMP.x - 23, CAMP.z + 13], [CAMP.x - 31, CAMP.z + 4], [CAMP.x - 27, CAMP.z + 15], [CAMP.x - 33, CAMP.z + 11]];

const ct = (g: GameApi) => g.stage('callingTimber');

const items: ItemDef[] = [
  { id: 'rot_chits', name: 'Saul Raine\'s chits', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#5a2a20' }, desc: 'Nine company chits, one for every load since Lady Day. Each one says the same in the same hand: "4 props rejected, rot. A.P."' },
  { id: 'pell_slate', name: 'Pell\'s slate', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#3a3a40', b: '#e8e8e0' }, desc: 'A child\'s writing slate from the Garrows\' kitchen, chalked in big careful capitals. Pell said not to read it. It says COME HOME FOR LAMMAS. I\'LL DO THE TALKING.' },
];

const npcs: NpcDef[] = [
  {
    id: 'hw_carter', name: 'Saul Raine', title: 'Carter, Harrowgate & Daughters',
    look: { skin: '#d0a080', hair: '#5a4030', hairStyle: 1, eyes: '#4a3a2a', tunic: '#5a4a3a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a2018', hat: 'cap', hatColor: '#3a3428', build: 1.1, age: 0.5 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: CARTER, face: [CAMP.x + 4, CAMP.z - 9], anim: 'idle' }],
    barks: ['Forty up, forty down. That\'s the job.', 'Mind the wheel. She bites.'],
  },
];

// ---------------------------------------------------------------- Short Count
const ideNodes: Record<string, DNode> = {
  sc1: {
    text: 'You can count, can\'t you? Harrowgate paid us for thirty-six props on the last load. We sent forty. I counted them onto the cart myself.',
    options: [{ text: 'Somebody miscounted.', next: 'sc2' }, { text: 'Not now.' }],
  },
  sc2: {
    text: 'Somebody did. Either my fellers can\'t count, or someone between here and the Works can. The next load\'s on the stacks. Count it. Then ask Saul what he signed for.',
    options: [{ text: 'I\'ll count it.', effect: (g) => g.setStage(SHORT, 'count') }, { text: 'Not now.' }],
  },
  scWait: {
    text: (g) => (at(g, SHORT) === 'count' ? 'Both stacks. Every prop, not every other.' : 'Saul\'s at his cart. He\'ll tell you what he signed for. He\'s a bad liar, which is why I like him.'),
  },
  scBack: {
    text: 'Chits. Let me see. "Four props rejected, rot. A.P." Nine of them.',
    next: 'scBack2',
  },
  scBack2: { speaker: 'narrator', text: 'She lays them out on the camp book, one under another, like a hand of cards nobody wants.', next: 'scBack3' },
  scBack3: {
    text: 'Thirty-six marks a load is thirty-six marks. Twelve on every load, nine loads. That\'s a feller\'s wage for most of the summer, gone into his book. What do I do with them?',
    options: [
      { text: 'Take them to Delia Harrowgate. It\'s her company.', next: 'scDelia' },
      { text: 'Keep them in your book, for when it matters.', next: 'scKeep' },
      { text: 'Cut forty-four next time and say nothing.', next: 'scPad' },
    ],
  },
  scDelia: {
    text: 'Then you take them. If I go up there, I\'m a camp boss with a grudge. If you go, it\'s a stranger with paper. Paper does better.',
    options: [{ text: 'I\'ll go to Harrowgate.', effect: (g) => { g.setFlag('hwShort', 'delia'); g.setStage(SHORT, 'delia'); } }],
  },
  scKeep: {
    text: 'Paper keeps. Pryce doesn\'t. One day somebody will ask him a question in front of the right people, and I\'ll have nine answers in a drawer. Here, for your trouble.',
    options: [{ text: 'Good luck, Ide.', effect: (g) => { g.take('rot_chits'); g.addMarks(45); g.setFlag('hwShort', 'keep'); g.setStage(SHORT, 'done'); } }],
  },
  scPad: {
    text: 'Four more oaks a load. Four more falls a load, for my fellers, for nothing. All right. It\'s quicker than arguing with a man who owns the scales.',
    next: 'scPad2',
  },
  scPad2: { speaker: 'narrator', text: 'She burns the chits in the stove, one at a time, and watches each one go.', next: 'scPad3' },
  scPad3: {
    text: 'Don\'t tell Sefton. He\'ll want to cut all four himself.',
    options: [{ text: 'I won\'t.', effect: (g) => { g.take('rot_chits'); g.addMarks(30); g.setFlag('hwShort', 'pad'); g.setStage(SHORT, 'done'); } }],
  },
  scAfter: {
    text: (g) => (g.flag('hwShort') === 'delia'
      ? 'The arrears came up with the flour, in a company bag, with a note from Delia Harrowgate. I\'ve pinned the note up. The fellers like reading it.'
      : g.flag('hwShort') === 'keep' ? 'Nine chits in the drawer. I take them out and count them sometimes. There are still nine.'
      : 'Forty-four a load. Sefton found out. He cut three of the four himself before I could stop him.'),
  },
};

const carterNodes: Record<string, DNode> = {
  ab1: {
    text: 'Ide sent you. She\'s been looking at my cart like it owes her money.',
    options: [{ text: 'It might. How many props did you carry last load?', next: 'ab2' }],
  },
  ab2: {
    text: 'Forty. I always carry forty. At the Works the tallyman pulls four off the back and writes a chit.',
    next: 'ab2b',
  },
  ab2b: {
    text: 'Mr Pryce signs it, and the camp gets paid for thirty-six.',
    options: [{ text: 'Four rotten in every load?', next: 'ab3' }],
  },
  ab3: {
    text: 'Rotten. I\'ve seen rot. I\'ve carted rot. Those four were as sound as the rest.',
    next: 'ab3b',
  },
  ab3b: {
    text: 'They went down No. 1 Drift with the rest, same day. Only somebody had cut a P in the end of them first.',
    next: 'ab4',
  },
  ab4: { speaker: 'narrator', text: 'He looks back up the road toward Harrowgate, the way a man checks a dog he isn\'t sure of.', next: 'ab5' },
  ab5: {
    text: 'I kept the chits. Nine of them, in my boot. I don\'t know why. Yes, I do. Take them. If anybody asks, they fell out of the cart.',
    options: [{ text: 'Thank you, Saul.', effect: (g) => { g.give('rot_chits'); g.setStage(SHORT, 'ide'); } }],
  },
  abAfter: { text: 'Forty up, forty down. Same as ever. I don\'t look at the back of the cart at the Works any more.' },
};

const deliaNodes: Record<string, DNode> = {
  scD1: {
    text: (g) => (g.flag('hgProps') === 'delia'
      ? 'More paper. I\'ve read Mr Pryce\'s book twice since the drift. Go on, then. What has he done in the woods?'
      : 'Chits from the timber. "Rejected, rot." I don\'t read Mr Pryce\'s book. I pay him to keep it. Give them here.'),
    next: 'scD2',
  },
  scD2: { speaker: 'narrator', text: 'She reads all nine, then turns the last one over as if the back might be kinder.', next: 'scD3' },
  scD3: {
    text: 'Four a load, booked as rot, and the same oak holding up my drift. That\'s the company paying him for its own timber. And the camp paying for the privilege.',
    next: 'scD4',
  },
  scD4: {
    text: 'Fellers\' Camp gets every mark it\'s owed, on the next flour cart, from the company, with my name on it. Not his. And you get this, for walking up a hill with somebody else\'s trouble.',
    options: [{ text: 'Thank you.', effect: (g) => { g.take('rot_chits'); g.addMarks(90); g.setStage(SHORT, 'done'); } }],
  },
};

// ---------------------------------------------------------------- Spore Season
const kitNodes: Record<string, DNode> = {
  sp1: {
    text: 'You see the purple lights in the clearing, west of the stacks? Spore jellies. They come up every year when it\'s wet, and every year they\'re early.',
    options: [{ text: 'Are they dangerous?', next: 'sp2' }, { text: 'Not now.' }],
  },
  sp2: {
    text: 'To you? A bit. To the oak, worse. Get spore on a cut log and it goes soft in a month, and Harrowgate won\'t take it. Burst them before they seed. Six or so. I would, but they make me cough.',
    options: [{ text: 'I\'ll burst them.', effect: (g) => g.setStage(SPORE, 'jellies') }, { text: 'Not now.' }],
  },
  spWait: { text: 'West of the stacks. Purple. You can\'t miss them, and they can\'t miss you.' },
  spBack: {
    text: 'Clearing\'s clean? That\'s the first spring I\'ll sleep in the camp since April.',
    options: [{ text: 'Where have you been sleeping?', next: 'spBack2' }],
  },
  spBack2: {
    text: 'In the tent on the far side. Sefton says my coughing keeps him up.',
    next: 'spBack3',
  },
  spBack3: { speaker: 'narrator', text: 'He waits to see if you\'ll say it. You don\'t have to.', next: 'spBack4' },
  spBack4: {
    text: 'I know. He can\'t hear a tree fall. He can hear me cough through canvas, apparently. Here. It\'s Odo\'s, but he owes me.',
    options: [{ text: 'Sleep well, Kit.', effect: (g) => { g.addMarks(55); g.give('mulled_cider', 1); g.setStage(SPORE, 'done'); } }],
  },
  spAfter: { text: 'Slept a whole night by the fire. Sefton says I snore.' },
};

// ---------------------------------------------------------------- What Sefton Can't Hear
const seftonNodes: Record<string, DNode> = {
  br1: {
    text: 'You go through Hollin Ford, don\'t you? On your way to wherever.',
    options: [{ text: 'Often enough.', next: 'br2' }],
  },
  br2: {
    text: 'Then tell my brother Pell something for me. I\'m going deaf. There. Tell him that.',
    next: 'br3',
  },
  br3: { speaker: 'narrator', text: 'He goes back to the whetstone, harder than before.', next: 'br4' },
  br4: {
    text: 'I can\'t tell him myself. He\'d say something, and I wouldn\'t hear it, and I\'d say "eh?", and he\'d say it again louder, and we\'d be at it till Michaelmas. You tell him. He\'ll take it better off a stranger.',
    options: [{ text: 'I\'ll tell him.', effect: (g) => g.setStage(BROS, 'pell') }, { text: 'Not just now.' }],
  },
  brWait: { text: 'Pell. Hollin Ford. You can\'t miss him. He\'s the one talking.' },
  brBack: {
    text: 'Well? What did he say?',
    options: [{ text: 'He sent you this.', next: 'brBack2' }],
  },
  brBack2: { speaker: 'narrator', text: 'Sefton takes the slate and holds it at arm\'s length, then nearer, then at arm\'s length again.', next: 'brBack3' },
  brBack3: { speaker: 'narrator', text: 'He reads it twice. Then he laughs, once, the way a man laughs when he\'s been holding his breath.', next: 'brBack4' },
  brBack4: {
    text: '"I\'ll do the talking." He always does. Lammas, then. Tell Ide I want the day. No. I\'ll tell her. Loud.',
    options: [{ text: 'Give him my regards.', effect: (g) => { g.take('pell_slate'); g.addMarks(70); g.setStage(BROS, 'done'); } }],
  },
  brAfter: { text: 'Lammas. Pell\'s doing the talking. I\'m bringing a slate.' },
};

const pellNodes: Record<string, DNode> = {
  pb1: {
    text: 'Sefton sent you? He doesn\'t send people. He turns up and complains about the weir.',
    options: [{ text: 'He wanted you told: he\'s going deaf.', next: 'pb2' }],
  },
  pb2: { speaker: 'narrator', text: 'Pell looks at the river for a while.', next: 'pb3' },
  pb3: {
    text: 'I know. Since spring. Last time he was down I said mind the weir, and he said twelve shillings, robbery. I let it go. You let things go, with Sefton. It\'s that or drown in him.',
    next: 'pb4',
  },
  pb4: {
    text: 'Forty years we\'ve been shouting at each other. Now he can\'t hear it, and I find I\'d rather he could. Wait there.',
    next: 'pb5',
  },
  pb5: { speaker: 'narrator', text: 'He goes in, and comes back with a child\'s slate, chalking as he walks. He turns it face down before you can read it.', next: 'pb6' },
  pb6: {
    text: 'Give him that. Don\'t read it. You will, but don\'t.',
    options: [{ text: 'I won\'t.', effect: (g) => { g.give('pell_slate'); g.setStage(BROS, 'sefton'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [SHORT]: {
    id: SHORT, name: 'Short Count', region: 'brambledeep', depth: 'quest',
    notes: (g, s) => {
      if (s === 'count') return 'Harrowgate paid Fellers\' Camp for thirty-six props on the last load, and Ide Marrow counted forty onto the cart. She wants the next load counted on the stacks.';
      if (s === 'hw_carter') return 'Forty on the stacks, every one sound, every one with the camp\'s ring mark. Saul Raine, the company carter, will know what he signed for at the Works.';
      if (s === 'ide') return 'At the Works the tallyman pulls four props off every load as "rejected, rot", and Mr Pryce signs the chit. Saul says they were sound, and went down No. 1 Drift with a P cut in the end. He gave me nine chits.';
      if (s === 'delia') return 'Ide sent me up to Harrowgate Works with Saul\'s chits, for Delia Harrowgate.';
      const c = g.flag('hwShort');
      return c === 'delia' ? 'Delia Harrowgate is paying the camp every mark it\'s owed, from the company, with her name on it.'
        : c === 'keep' ? 'Ide keeps the nine chits in the camp book, for when it matters.'
        : 'Fellers\' Camp cuts forty-four props a load now, and gets paid for forty. Ide burned the chits.';
    },
    objectives: (g, s) => {
      if (s === 'count') return [
        { text: 'Count the props on the north stack', marker: 'hwStackA', done: !!g.flag('hwStackA') },
        { text: 'Count the props on the south stack', marker: 'hwStackB', done: !!g.flag('hwStackB') },
      ];
      if (s === 'hw_carter') return [{ text: 'Ask Saul Raine, the carter, what he signed for', marker: 'hw_carter' }];
      if (s === 'ide') return [{ text: 'Take Saul\'s chits to Ide Marrow', marker: 'ide' }];
      if (s === 'delia') return [{ text: 'Take the chits to Delia Harrowgate at Harrowgate Works', marker: 'delia' }];
      return [];
    },
    marks: (g, s): Marks => (!s && ct(g) === 'done' ? { ide: '!' } : s === 'hw_carter' ? { hw_carter: '?' } : s === 'ide' ? { ide: '?' } : s === 'delia' ? { delia: '?' } : {}),
    walk: { cast: ['ide', 'hw_carter', 'delia'], from: { quests: { callingTimber: 'done' }, flags: { timberChoice: 'keep' } } },
  },
  [SPORE]: {
    id: SPORE, name: 'Spore Season', region: 'brambledeep', depth: 'short',
    notes: (_g, s) => (s === 'jellies' ? 'Spore jellies have come up in the felling clearing west of Fellers\' Camp. A log with spore on it goes soft, and Harrowgate refuses it. Kit Ashcroft wants them burst before they seed.'
      : s === 'kit' ? 'The clearing\'s clean. Kit will want to know.'
      : 'Kit is sleeping in the camp again. Sefton says he snores.'),
    objectives: (g, s) => (s === 'jellies' ? [{ text: `Burst the spore jellies in the felling clearing (${Math.min(6, killed(g, 'hwSpore'))}/6)`, done: killed(g, 'hwSpore') >= 6 }]
      : s === 'kit' ? [{ text: 'Tell Kit Ashcroft the clearing\'s clean', marker: 'kit' }] : []),
    advance: (g, s) => (s === 'jellies' && killed(g, 'hwSpore') >= 6 ? 'kit' : null),
    marks: (_g, s): Marks => (!s ? { kit: '!', kitFar: '!' } : s === 'kit' ? { kit: '?', kitFar: '?' } : {}),
    walk: { cast: ['kit', 'kitFar'], kill: { jellies: [['sporejelly', 6]] } },
  },
  [BROS]: {
    id: BROS, name: 'What Sefton Can\'t Hear', region: 'brambledeep', depth: 'quest',
    notes: (_g, s) => (s === 'pell' ? 'Sefton Garrow wants his brother Pell, the fisherman at Hollin Ford, told that he\'s going deaf. By someone who isn\'t him.'
      : s === 'sefton' ? 'Pell already knew. He chalked a slate for Sefton and told me not to read it. I read it. COME HOME FOR LAMMAS. I\'LL DO THE TALKING.'
      : 'Sefton is going home for Lammas. Pell is doing the talking. Sefton is bringing a slate.'),
    objectives: (_g, s) => (s === 'pell' ? [{ text: 'Tell Pell Garrow at Hollin Ford', marker: 'pell' }]
      : s === 'sefton' ? [{ text: 'Take Pell\'s slate to Sefton at Fellers\' Camp', marker: 'sefton' }] : []),
    marks: (g, s): Marks => (!s && ct(g) === 'done' && g.flag('timberChoice') !== 'send' ? { sefton: '!' } : s === 'pell' ? { pell: '?' } : s === 'sefton' ? { sefton: '?' } : {}),
    walk: { cast: ['sefton', 'pell'], from: { quests: { callingTimber: 'done' }, flags: { timberChoice: 'marker' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hwSpore', type: 'sporejelly', at: CLEARING, when: (g) => at(g, SPORE) === 'jellies' },
];

/** A stack counted: both counted, Saul's turn. */
const stack = (id: string, [x, z]: [number, number], label: string, text: string) => ({
  id, x, z, label, radius: 3,
  when: (g: GameApi) => at(g, SHORT) === 'count' && !g.flag(id),
  use: (g: GameApi) => {
    g.setFlag(id, 1);
    g.toast(text);
    if (g.flag('hwStackA') && g.flag('hwStackB')) g.setStage(SHORT, 'hw_carter');
  },
});

/** A copy of a node that ends without options, with one more thing to say (and goodbye). */
function withOffer(D: Record<string, DialogueTree>, id: string, node: string, copy: string, offer: DOption): void {
  const n = D[id]?.nodes[node];
  if (!n) throw new Error(`withOffer: no node ${id}.${node}`);
  D[id].nodes[copy] = { ...n, next: undefined, options: [offer, { text: 'Bye.' }] };
}

export const HAGWORM_MORE_CONTENT: RegionContent = {
  id: 'hagwormMore', items, npcs, quests, spawns,
  things: [
    stack('hwStackA', STACK_A, 'Count the props on the north stack', 'Twenty-two props, nine foot, elder oak. You knock every one: every one rings sound. The camp\'s ring mark is burned into each end.'),
    stack('hwStackB', STACK_B, 'Count the props on the south stack', 'Eighteen more, sound and marked like the rest. Forty in all. Whoever is short, it isn\'t the stacks.'),
  ],
  hooks: (D) => {
    // Ide: Short Count, offered once the camp's own trouble (Calling Timber) is settled
    withOffer(D, 'ide', 'after', 'scHub', { text: 'Is everything square with Harrowgate?', next: 'sc1', cond: (g) => !at(g, SHORT) });
    hook(D, 'ide', (g) => {
      const s = at(g, SHORT);
      if (s === 'ide' && g.count('rot_chits') > 0) return 'scBack';
      if (s === 'count' || s === 'hw_carter') return 'scWait';
      if (s === 'done') return ct(g) === 'done' ? 'scAfter' : undefined;
      return ct(g) === 'done' && !s ? 'scHub' : undefined;
    }, ideNodes);
    D.hw_carter = { start: (g) => (at(g, SHORT) === 'hw_carter' ? 'ab1' : 'abAfter'), nodes: carterNodes };
    addOption(D, 'delia', 'main', { text: 'Ide Marrow sent these, from Fellers\' Camp.', next: 'scD1', cond: (g) => at(g, SHORT) === 'delia' && g.count('rot_chits') > 0 });
    hook(D, 'delia', () => undefined, deliaNodes);
    // Kit: Spore Season, from his first word or his last (kitFar, where he works when Sefton stayed on the saw, shares his tree)
    for (const id of ['kit']) {
      if (!D[id]) continue;
      for (const node of ['main', 'after']) if (D[id].nodes[node]) withOffer(D, id, node, 'spHub_' + node, { text: 'You keep coughing.', next: 'sp1', cond: (g) => !at(g, SPORE) });
      const base = D[id].start;
      hook(D, id, (g) => {
        const s = at(g, SPORE);
        if (s === 'kit') return 'spBack';
        if (s === 'jellies') return 'spWait';
        if (s === 'done') return undefined;
        if (!s) { const b = base(g); return D[id].nodes['spHub_' + b] ? 'spHub_' + b : undefined; }
        return undefined;
      }, kitNodes);
    }
    // Sefton: What Sefton Can't Hear, if he's still at the camp
    withOffer(D, 'sefton', 'after', 'brHub', { text: 'You keep stopping to listen.', next: 'br1', cond: (g) => !at(g, BROS) && g.flag('timberChoice') !== 'send' });
    hook(D, 'sefton', (g) => {
      const s = at(g, BROS);
      if (g.flag('timberChoice') === 'send' || ct(g) !== 'done') return undefined;
      if (s === 'sefton' && g.count('pell_slate') > 0) return 'brBack';
      if (s === 'pell') return 'brWait';
      if (s === 'done') return 'brAfter';
      return g.flag('timberChoice') === 'marker' && !g.flag('seftonAxe') ? undefined : 'brHub';
    }, seftonNodes);
    addOption(D, 'pell', 'main', { text: 'Your brother sent me. Sefton.', next: 'pb1', cond: (g) => at(g, BROS) === 'pell' });
    hook(D, 'pell', () => undefined, pellNodes);
  },
};
