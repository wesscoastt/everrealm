import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { NORTHGATE_TOWN } from '../../world/morrow';

// Two more side stories in the Greywaste (owner 2026-11-26: "start fleshing out continent 2"; it had two).
//
// gwFen, WILL-LIGHTS ON WYKE FEN (Meg Wyke, Northgate): Edda Rusk at the Archive wanted the fen lights south-west of the
// town put on a map, the way the old roll has them, because the Held walk round them and never through. Meg's boy Hob,
// Edda's copying clerk, went out two nights ago with chalk and a lamp. Follow his chalk marks across the moor; the
// fen-damps are thick round the tussock where he is. Clear them, and Hob is sitting on the tussock with his map half
// done, because every time he gets up they come back. Then: bring him home now ('home'); ([Brave]) stand by him while he
// finishes it, the damps and all ('map'); or give him your own lamp, which they don't like, and let him finish it alone
// ('lamp'). gwFen = 'home' | 'map' | 'lamp'.
//
// gwPost, TO BE CALLED FOR (Wat Aske, Cold Harbour; after Eleven Names): behind the tally shed Wat has found the harbour's
// letter box, which nobody has emptied since the village went south. Three letters, "to be called for": for Ellen
// Dacre, from her sister in Callis; for Edda Rusk at the Archive, from the Callis archive; and one for the youngest of
// Pryce's twelve diggers, the Callis lad, from his mother. Wat can't read. Deliver two, and read him the third. Then the
// answer, which Wat asks you to write: the truth ('truth'), that her son went north with the others and Wat doesn't
// know more ('north'), or ([Kind]) the truth, with Wat's own tally tag folded in it, so she has something of the fell
// that isn't a story ('tag'). gwPost = 'truth' | 'north' | 'tag'.

const FEN = 'gwFen', POST = 'gwPost';
const NG = NORTHGATE_TOWN;
const MEG = { x: NG.x + 6.5, z: NG.z + 4.5 };
const CHALK: [number, number][] = [[NG.x - 30.5, NG.z + 30.5], [NG.x - 52.5, NG.z + 52.5], [NG.x - 68.5, NG.z + 66.5]];
const HOB = { x: NG.x - 80.5, z: NG.z + 75.5 };
const DAMPS: [number, number][] = [[NG.x - 74, NG.z + 70], [NG.x - 86, NG.z + 72], [NG.x - 80, NG.z + 84]];

const marks = (g: GameApi) => CHALK.filter((_, i) => g.flag('gwChalk' + i)).length;
const lieStill = (g: GameApi) => at(g, 'tdHeld') === 'done';
const handed = (g: GameApi) => ['gwPostEllen', 'gwPostEdda'].filter((f) => g.flag(f)).length;

// ================================================================ Will-Lights on Wyke Fen

const meg: DialogueTree = {
  start: (g) => {
    const s = at(g, FEN);
    if (!s) return 'm1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    m1: { speaker: 'narrator', text: 'A big, square woman in a man\'s coat, standing in her doorway with her arms folded, looking south-west across the moor as if she could stare it into giving something back.', next: 'm2' },
    m2: { text: 'Meg Wyke. My Hob copies for Edda Rusk at the Archive. Clever lad. Too clever. Edda wanted the fen lights mapped, the way the old roll has them.', next: 'm3' },
    m3: { text: 'The Held walk round the lights, never through them. If you knew where they all were, Edda says, you\'d know where the Held can\'t go. Hob said he\'d do it in a night.', next: 'm4' },
    m4: {
      text: 'That was two nights ago. He took chalk to mark his way back, and a lamp, and a pie. The pie won\'t have lasted. Will you go and find him?',
      options: [{ text: 'I\'ll find Hob.', effect: (g) => g.setStage(FEN, 'chalk') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, FEN) === 'chalk' ? `South-west, across the moor. Look for his chalk. ${marks(g)} mark${marks(g) === 1 ? '' : 's'}, you say?` : 'You\'ve seen him? Then why isn\'t he here?') },
    after: {
      text: (g) => {
        const f = g.flag(FEN);
        if (f === 'home') return 'He\'s home. He sulks. He says the map\'s half a map, and half a map is worse than none. I say half a son is worse than none, and I\'ve got all of mine.';
        if (f === 'map') return 'Edda has the map on the Archive wall. Hob\'s name is on the corner. He came home with his eyebrows singed and talked for three days. I\'ve never been so tired of being glad.';
        return 'He came home with the map, and without the lamp, and he won\'t say how close it was. I can see how close it was. Mothers can.';
      },
    },
  },
};

const hob: DialogueTree = {
  start: (g) => (at(g, FEN) === 'hob' ? 'h1' : 'after'),
  nodes: {
    h1: { speaker: 'narrator', text: 'On a tussock in the middle of the fen, a thin young man with ink on his fingers is sitting cross-legged with a board on his knees, a map pinned to it, and a lamp turned down low beside him.', next: 'h2' },
    h2: { text: 'Oh. Hello. Has Mam sent you? She has. Of course she has. I\'m nearly done. I\'ve got eleven lights of fourteen. It\'s just that every time I stand up, they come back.', next: 'h3' },
    h3: { text: 'The damps. They follow the lights, or the lights follow them; the roll doesn\'t say which. If I go home now, I\'ll have to come back and do all of this again.', next: 'h4' },
    h4: {
      text: 'What do you think?',
      options: [
        { text: 'You\'re coming home. Now. Your mother\'s been standing in that doorway for two days.', moral: { id: 'gwFen:home', a: 2, tr: { compassion: 2 }, npc: { gw_hob: -5, gw_meg: 20 }, note: 'Brought Hob Wyke home off Wyke Fen with his map half done.' }, effect: (g) => { g.setFlag(FEN, 'home'); g.addMarks(80); g.setStage(FEN, 'done'); }, next: 'hH' },
        { text: 'Finish it. I\'ll stand here and keep them off you until you have.', need: { trait: { courage: [57, 100] } }, moral: { id: 'gwFen:map', a: 5, tr: { courage: 3 }, npc: { gw_hob: 25, gw_meg: 15, edda_rusk: 10 }, note: 'Stood on Wyke Fen with Hob Wyke while he finished the map of the fen lights for the Northgate Archive.', fame: 'kept the fen-damps off the Northgate copyist till his map was done', spread: 'local' }, effect: (g) => { g.setFlag(FEN, 'map'); g.addMarks(100); g.setStage(FEN, 'done'); }, next: 'hM' },
        { text: 'Take my lamp. It\'s brighter than yours, and they keep off bright light. Finish it, and go straight home.', moral: { id: 'gwFen:lamp', a: 3, tr: { generosity: 2 }, npc: { gw_hob: 20, gw_meg: 5 }, note: 'Gave Hob Wyke a lamp on Wyke Fen and left him to finish his map.' }, effect: (g) => { g.setFlag(FEN, 'lamp'); g.addMarks(80); g.setStage(FEN, 'done'); }, next: 'hL' },
      ],
    },
    hH: { text: 'Half a map. Half. Fine. Fine! But I\'m telling Edda it was your idea.' },
    hM: { speaker: 'narrator', text: 'It takes him the rest of the night. The damps come in from the dark three times, grey and heavy and smelling of old water, and three times you send them back. Hob doesn\'t look up once. When the sky goes pale he holds up the board: fourteen lights, every one with its bearing, and a line round them all where the Held can\'t walk.' },
    hL: { text: 'Your lamp? Are you sure? You are. Thank you. I\'ll bring it back. I won\'t bring it back. I\'ll pay you back for it. I won\'t be able to afford to. Thank you.' },
    after: { text: (g) => (g.flag(FEN) === 'map' ? 'Fourteen lights. Edda says it\'s the best copy since the roll. She said it as if it hurt her.' : 'I\'m going back out to finish it. Don\'t tell Mam.') },
  },
};

// ================================================================ To Be Called For

const watNodes: Record<string, DNode> = {
  tb1: { speaker: 'narrator', text: 'Wat Aske has a wooden box on his knees, its lid off its hinges, and three letters in his hand that he keeps turning over as if the writing might change if he looks at it from the other side.', next: 'tb2' },
  tb2: { text: 'The harbour\'s letter box, behind the tally shed. Nobody\'s emptied it since everyone went south. Three in it. "To be called for."', next: 'tb3' },
  tb3: {
    text: 'I can\'t read. Never could. Pryce did the reading for us. The writing on the outside, I can, a bit. Dacre. And the Archive. And the last one says Callis. Our Callis. Will you take them where they go?',
    options: [{ text: 'Give them here.', effect: (g) => { g.give('gw_letter_ellen', 1); g.give('gw_letter_edda', 1); g.give('gw_letter_callis', 1); g.setStage(POST, 'deliver'); } }, { text: 'Not now.' }],
  },
  tbW: { text: (g) => (at(g, POST) === 'deliver' ? `Dacre's at the pasture, and the Archive's up at Northgate. ${handed(g)} gone. The last one's ours, the Callis lad's. Bring it back here when you're ready. I'll need you to read it me.` : 'Read it me. Please.') },
  tr1: { speaker: 'narrator', text: 'You open it. It is from Callis, in a careful hand that has had help with the spelling, to "my son Biel, called Callis, with Mr Pryce\'s diggers, Cold Harbour, to be called for".', next: 'tr2' },
  tr2: { speaker: 'narrator', text: 'His mother is well. His sister is walking out with a carter. The roof has been mended, from the money he sent at midsummer. She is not angry that he hasn\'t written. She would only like a line, when he has a minute, to say he is keeping warm.', next: 'tr3' },
  tr3: { text: 'He sent her money. Course he did. He sent her half of everything. We used to laugh at him for it.', next: 'tr4' },
  tr4: {
    text: 'She\'ll want an answer. I can\'t write it. Will you? Only, what do we say?',
    options: [
      { text: 'The truth. That he went up the fell with the rest of you, and didn\'t come down, and that he was a good lad.', moral: { id: 'gwPost:truth', a: 3, tr: { honesty: 3 }, npc: { wat_aske: 10 }, note: 'Wrote to the Callis digger\'s mother for Wat Aske, and told her the truth.' }, effect: (g) => { g.take('gw_letter_callis', 1); g.setFlag(POST, 'truth'); g.addMarks(90); g.setStage(POST, 'done'); }, next: 'trT' },
      { text: 'That he went north with Pryce and the others, and you\'ve had no word. It\'s true, as far as it goes.', moral: { id: 'gwPost:north', tr: { deception: 2, compassion: 1 }, npc: { wat_aske: 5 }, note: 'Wrote to the Callis digger\'s mother for Wat Aske, and said only that her son went north.' }, effect: (g) => { g.take('gw_letter_callis', 1); g.setFlag(POST, 'north'); g.addMarks(80); g.setStage(POST, 'done'); }, next: 'trN' },
      { text: 'The truth. And put your tally tag in with it, Wat, the one off your post. So she has something of the fell that isn\'t only words.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'gwPost:tag', a: 6, tr: { compassion: 3, honesty: 2 }, npc: { wat_aske: 25 }, note: 'Wrote to the Callis digger\'s mother for Wat Aske with the truth, and Wat\'s own tally tag folded in the letter.', major: true }, effect: (g) => { g.take('gw_letter_callis', 1); g.setFlag(POST, 'tag'); g.addMarks(90); g.setStage(POST, 'done'); }, next: 'trG' },
    ],
  },
  trT: { text: 'A good lad. Put that he laughed at nothing. Put that he sang. He couldn\'t sing. Put it anyway.' },
  trN: { text: 'North. Aye. That\'s true. She can wait for him. People can wait a long time. I\'ll go down on the Kittiwake myself one day and tell her the rest. One day.' },
  trG: { speaker: 'narrator', text: 'Wat takes the tag off the nail by his door, a square of tin with his mark scratched on it, and turns it over in his fingers a long time. Then he puts it in the fold of the letter himself, and presses it flat with his thumb, and says, "Tell her it was his turn to carry it. Tell her he always carried it."' },
};

const ellenNodes: Record<string, DNode> = {
  te1: { text: 'For me? From Callis? That\'s our Annie\'s hand. She went south with the boats in the spring.', next: 'te2' },
  te2: { speaker: 'narrator', text: 'Ellen reads it standing up, and then sits down on the shed step to read it again.', next: 'te3' },
  te3: { text: 'A girl. Annie\'s had a girl. In Callis. In April. She\'s called her Ellen. And there\'s a room over the dyer\'s, she says, if we ever want it. If we ever give up the sheep.', options: [{ text: 'Congratulations, Ellen.', effect: (g) => { g.take('gw_letter_ellen', 1); g.setFlag('gwPostEllen', 1); } }] },
};

const eddaNodes: Record<string, DNode> = {
  td1: { text: 'A letter for the Archive? From the Archive at Callis. They\'ve written every spring for forty years. They want a copy of the old roll.', next: 'td2' },
  td2: { text: 'In triplicate. With the seals. They have never once said please. I have never once sent it. I may this year. It seems the roll has turned out to matter.', options: [{ text: 'It does.', effect: (g) => { g.take('gw_letter_edda', 1); g.setFlag('gwPostEdda', 1); } }] },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [FEN]: {
    id: FEN, name: 'Will-Lights on Wyke Fen', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'chalk') return 'Hob Wyke, Edda Rusk\'s copying clerk, went out onto the moor south-west of Northgate two nights ago to map the fen lights, which the Held walk round and never through. His mother Meg says he marked his way with chalk.';
      if (s === 'damps') return 'Hob\'s chalk leads to a tussock in the middle of the fen, and the fen-damps are thick round it.';
      if (s === 'hob') return 'The damps are cleared off. Hob is sitting on the tussock with his map half done.';
      const f = g.flag(FEN);
      return f === 'home' ? 'I brought Hob home with his map half done.' : f === 'map' ? 'I kept the damps off Hob till his map of the fen lights was done.' : 'I gave Hob my lamp and left him to finish his map.';
    },
    objectives: (g, s) => (s === 'chalk' ? CHALK.map((_, i) => ({ text: `Follow Hob's chalk across the moor (${i + 1})`, done: !!g.flag('gwChalk' + i), marker: 'gwChalk' + i }))
      : s === 'damps' ? [{ text: `Clear the fen-damps round the tussock (${Math.min(DAMPS.length, killed(g, 'gwDamp'))}/${DAMPS.length})`, done: killed(g, 'gwDamp') >= DAMPS.length }]
      : s === 'hob' ? [{ text: 'Talk to Hob Wyke on the tussock', marker: 'gw_hob' }] : []),
    advance: (g, s) => (s === 'chalk' && marks(g) >= CHALK.length ? 'damps' : s === 'damps' && killed(g, 'gwDamp') >= DAMPS.length ? 'hob' : null),
    marks: (_g, s): Marks => (!s ? { gw_meg: '!' } : s === 'hob' ? { gw_hob: '?' } : {}),
    walk: { cast: ['gw_meg', 'gw_hob'], kill: { damps: [['fendamp', 3]] } },
  },
  [POST]: {
    id: POST, name: 'To Be Called For', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'deliver') return 'Wat Aske found Cold Harbour\'s letter box behind the tally shed, unemptied since the village went south. Three letters "to be called for": Ellen Dacre\'s, the Archive\'s at Northgate, and one for the Callis lad, the youngest of Pryce\'s diggers. Wat can\'t read.';
      if (s === 'read') return 'Ellen and Edda have theirs. The last is for the Callis lad. Read it to Wat.';
      const f = g.flag(POST);
      return f === 'north' ? 'I wrote for Wat that the Callis lad went north, and no more.' : f === 'tag' ? 'I wrote the truth for Wat, and he folded his own tally tag into the letter.' : 'I wrote the truth for Wat to the Callis lad\'s mother.';
    },
    objectives: (g, s) => (s === 'deliver' ? [
      { text: 'Give Ellen Dacre her letter, at the pasture', done: !!g.flag('gwPostEllen'), marker: 'gw_ellen' },
      { text: 'Give Edda Rusk the Archive\'s letter, at Northgate', done: !!g.flag('gwPostEdda'), marker: 'edda_rusk' },
    ] : s === 'read' ? [{ text: 'Read the last letter to Wat Aske at Cold Harbour', marker: 'wat_aske' }] : []),
    advance: (g, s) => (s === 'deliver' && handed(g) >= 2 ? 'read' : null),
    marks: (g, s): Marks => (!s && lieStill(g) && at(g, 'gwNames') === 'done' ? { wat_aske: '!' } : s === 'deliver' ? { ...(g.flag('gwPostEllen') ? {} : { gw_ellen: '?' }), ...(g.flag('gwPostEdda') ? {} : { edda_rusk: '?' }) } : s === 'read' ? { wat_aske: '?' } : {}),
    walk: { cast: ['wat_aske', 'gw_ellen', 'edda_rusk'], from: { quests: { tdHeld: 'done', gwNames: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'gwDamp', type: 'fendamp', at: DAMPS, when: (g) => at(g, FEN) === 'damps' },
];

const CHALK_TOASTS = [
  'An arrow in white chalk on a grey stone, pointing south-west, and under it, small: H.W. 1.',
  'Another arrow, on a sheep\'s skull half sunk in the peat, and the number 2, and a smear where a hand steadied itself.',
  'The third arrow is on a gatepost with no gate, and under the number someone has written, smaller and shakier, "lights ahead, keep left".',
];

const things: WorldThing[] = [
  ...CHALK.map(([x, z], i): WorldThing => ({
    land: 'morrow', id: 'gwChalk' + i, x, z, label: 'Look at the chalk mark', radius: 2.6, look: 'chalk',
    when: (g) => at(g, FEN) === 'chalk' && !g.flag('gwChalk' + i),
    use: (g) => { g.setFlag('gwChalk' + i, 1); g.toast(CHALK_TOASTS[i]); },
  })),
];

const NORTH = { skin: '#d8b090', eyes: '#4a5a6a', boots: '#2a2018' };
const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gw_meg', name: 'Meg Wyke', title: 'Northgate', look: { ...NORTH, frame: 'f', hair: '#6a5a4a', hairStyle: 2, tunic: '#3a3a34', trim: '#5a4a3a', trousers: '#2e2a26', cape: '#3a3430', lashes: true, build: 1.25, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [MEG.x, MEG.z], face: [MEG.x - 4, MEG.z + 4], anim: 'idle' }], barks: ['South-west.', 'Two nights.'] },
  { land: 'morrow', id: 'gw_hob', name: 'Hob Wyke', title: 'Copying clerk, the Gatekeepers\' Archive', look: { ...NORTH, hair: '#8a6a4a', hairStyle: 5, tunic: '#4a4a52', trim: '#c8c0b0', trousers: '#2e2a26', build: 0.75, height: 1.05, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: [HOB.x, HOB.z], face: [HOB.x + 3, HOB.z - 3], anim: 'crouch' }], when: (g) => at(g, FEN) === 'hob' || (at(g, FEN) === 'done' && g.flag(FEN) !== 'home'), barks: ['Eleven of fourteen.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'gw_letter_ellen', name: 'A letter for Ellen Dacre', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#5a3a1e' }, desc: 'From Callis, "Mrs E. Dacre, Cold Harbour, to be called for", in a round, happy hand.' },
  { id: 'gw_letter_edda', name: 'A letter for the Archive', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#2a2a5a' }, desc: 'Sealed three times by the Archive at Callis, for the Keeper of the Gatekeepers\' Archive at Northgate.' },
  { id: 'gw_letter_callis', name: 'A letter for the Callis lad', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#8a6a3a' }, desc: '"My son Biel, called Callis, with Mr Pryce\'s diggers, Cold Harbour, to be called for."' },
];

export const GREYWASTE_MORE: RegionContent = {
  id: 'greywasteMore',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { gw_meg: meg, gw_hob: hob },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'wat_aske', (g) => {
      const s = at(g, POST);
      if (!s && lieStill(g) && at(g, 'gwNames') === 'done') return 'tb1';
      if (s === 'deliver') return 'tbW';
      if (s === 'read') return 'tr1';
      return undefined;
    }, watNodes);
    hook(D, 'gw_ellen', (g) => (at(g, POST) === 'deliver' && !g.flag('gwPostEllen') ? 'te1' : undefined), ellenNodes);
    hook(D, 'edda_rusk', (g) => (at(g, POST) === 'deliver' && !g.flag('gwPostEdda') ? 'td1' : undefined), eddaNodes);
  },
};
