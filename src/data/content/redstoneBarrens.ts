import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories in the Raddle Barrens (content order: fill the Counties first; Redstone was the thinnest of
// them), with the morality system's choices (docs/MORALITY.md).
//
// rdRedDog, THE RED DOG (Saul Fairclough, a drover on the north road above Company Row): the Row's children say a red
// dog the size of a pony walks the rock at dusk, and Saul has lost three ewes. Follow her: broad prints, a dog's and
// not a wolf's; a dead ewe with wolf prints round it and the big prints over them, and blood that isn't a sheep's; and
// in a gully to the west, a shepherd's bones under a lip of rock, with a bed scraped in the dust beside them. Dust
// wolves come for the gully. When they're dead she comes out: a mastiff bitch rolled red in the ochre dust, Bel on her
// collar, keeping Josiah Platt, who went missing at Candlemas. She's been driving the wolves off Saul's sheep, not
// killing them. Then, with Saul: bring her home ('home': she comes with you), let Saul have her shot for the ewes
// ('shot'), or ([Kind]) leave her by Josiah's cairn and have Saul leave her scraps ('cairn').
// rdRedDog = 'home' | 'shot' | 'cairn'.
//
// rdCornet, SECOND CORNET (Amos Hartley, bandmaster of the Harrowgate Works Band, Company Row): a week before the
// Lammas contest, his son Billy's cornet has gone from its case on the step. In the case, a pawn ticket from Abner Moss
// at the Works gate. Moss says the lad who pawned it was Billy himself. Billy, on the end of the Row: he lost a month's
// wage at brag to Shad Kemble, the tallyman, who runs a card school in the lamp room and takes young men's pay before
// their mothers see it. Then: redeem the ticket yourself and give Amos the cornet with no questions ('redeem', 40
// marks), tell Amos all of it ('told'), or take the card school to Delia Harrowgate, who shuts it and turns Kemble off
// ('delia'). rdCornet = 'redeem' | 'told' | 'delia'.

const DOG = 'rdRedDog', CORNET = 'rdCornet';
const SAUL = { x: 928.5, z: 958.5 };
const SIGNS: [number, number, string][] = [[870.5, 955.5, 'tracks'], [856.5, 946.5, 'fleece'], [842.5, 938.5, 'bones']];
const WOLVES: [number, number][] = [[848, 944], [838, 946], [846, 932]];
const BEL = { x: 840.5, z: 934.5 };
const AMOS = { x: 943.5, z: 994.5 }, CASE = { x: 945.5, z: 995.5 }, MOSS = { x: 966.5, z: 1006.5 }, BILLY = { x: 931.5, z: 994.5 };

const signs = (g: GameApi) => SIGNS.filter((_, i) => g.flag('rdDogSign' + i)).length;

// ================================================================ The Red Dog

const saul: DialogueTree = {
  start: (g) => {
    const s = at(g, DOG);
    if (!s) return 's1';
    if (s === 'saul') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    s1: { speaker: 'narrator', text: 'A long, sun-dried man leaning on a crook by the road, with a dog of his own lying flat at his feet and keeping one eye on the hills to the west.', next: 's2' },
    s2: { text: 'Saul Fairclough. I drove for the Works when they had sheep on the rock to feed the Row. Now I drive my own, what\'s left of them.', next: 's3' },
    s3: { text: 'The children on the Row say there\'s a red dog out there the size of a pony. Comes at dusk, red as the rock, gone if you look straight at her. I thought it was a tale for keeping them in at night.', next: 's4' },
    s4: { text: 'Then I lost three ewes in a fortnight. And I\'ve seen her. Twice. On the skyline to the west, standing over my flock like she owned it.', next: 's5' },
    s5: {
      text: 'My dog won\'t go after her. He lies down and won\'t get up. I\'m not a young man. Will you find out what she is, and where she goes?',
      options: [{ text: 'I\'ll find your red dog.', effect: (g) => g.setStage(DOG, 'trail') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, DOG) === 'trail' ? `West, along the rock. ${signs(g)} sign${signs(g) === 1 ? '' : 's'} of her so far, you say?` : 'In the gully? With wolves? I\'d not go in there for all the ewes on the rock.') },
    b1: { speaker: 'narrator', text: 'Saul listens to all of it with his chin on his crook. When you say Josiah Platt\'s name he shuts his eyes.', next: 'b2' },
    b2: { text: 'Josiah. We said he\'d gone to his sister in Ansbury. We said it because it was easier than going out to look. And his Bel\'s been out there keeping him since Candlemas. And keeping the wolves off my ewes, by the sound of it.', next: 'b3' },
    b3: {
      text: 'Three ewes, though. The wolves took them, but she\'s the one they\'ll talk about on the Row. What\'s to be done with her?',
      options: [
        { text: 'She\'s coming home with me. She\'s kept watch long enough.', moral: { id: 'rdRedDog:home', a: 4, tr: { compassion: 3 }, npc: { rd_saul: 15 }, note: 'Took Bel, Josiah Platt\'s dog, home from the gully where she had kept him since Candlemas.' }, effect: (g) => { g.give('pet_barrens_red', 1); g.setFlag(DOG, 'home'); g.addMarks(60); g.setStage(DOG, 'done'); }, next: 'bH' },
        { text: 'Your ewes, your call. If you want her shot, I won\'t stop you.', moral: { id: 'rdRedDog:shot', a: -3, tr: { compassion: -3 }, npc: { rd_saul: 5 }, note: 'Let Saul Fairclough have Josiah Platt\'s dog shot for the ewes the wolves took.' }, effect: (g) => { g.setFlag(DOG, 'shot'); g.addMarks(90); g.setStage(DOG, 'done'); }, next: 'bS' },
        { text: 'Build Josiah a cairn where he lies, and leave her by it. Take her scraps when you pass. She\'ll keep your flock better than any dog you\'ve got.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'rdRedDog:cairn', a: 7, tr: { compassion: 4 }, npc: { rd_saul: 25 }, note: 'Had Saul Fairclough build Josiah Platt a cairn in the gully, and leave his dog free to keep it.', major: true, fame: 'gave the red dog of the Barrens back her watch', spread: 'local' }, effect: (g) => { g.setFlag(DOG, 'cairn'); g.addMarks(80); g.setStage(DOG, 'done'); }, next: 'bC' },
      ],
    },
    bH: { text: 'Then take her, and good luck to you. Mind, she\'ll be red for a month whatever you wash her in. That ochre gets in everywhere. Ask anyone on the Row.' },
    bS: { text: 'I\'ll go out with the gun at dusk. I\'ll make it quick. I keep telling myself she\'s only a dog. I keep not believing it.' },
    bC: { text: 'A cairn. Aye. He\'d like that, Josiah, a heap of stones and his own dog sat on it. I\'ll take her my scraps. She can keep the wolves off for both of us.' },
    after: {
      text: (g) => {
        const f = g.flag(DOG);
        if (f === 'shot') return 'I did it at dusk. She didn\'t run. Stood on the rock and looked at me. I\'ve lost two more ewes since, to the wolves. Don\'t say anything.';
        if (f === 'cairn') return 'She takes the scraps off the stone now and lets me sit by Josiah a while. Not one ewe lost since. The children say she\'s the size of a horse now.';
        return 'How\'s the red dog? Still red? Told you.';
      },
    },
  },
};

// ================================================================ Second Cornet

const amos: DialogueTree = {
  start: (g) => {
    const s = at(g, CORNET);
    if (!s) return 'a1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    a1: { speaker: 'narrator', text: 'A stout man in a frogged band jacket two sizes too warm for the weather, sitting on his step with an empty instrument case open on his knees as if something might yet turn up in it.', next: 'a2' },
    a2: { text: 'Amos Hartley. Bandmaster, the Harrowgate Works Band. We play Ansbury Silver at the Lammas contest a week on Saturday, and we have not beaten them in eleven years.', next: 'a3' },
    a3: { text: 'This year we would have. My Billy plays second cornet, and he plays it like his grandfather did. And last night his cornet went out of this case, off this step, while we were at our tea.', next: 'a4' },
    a4: {
      text: 'Nobody on the Row would take it. Nobody on the Row could sell it; every soul in the Barrens knows that cornet. Will you look? I\'ve got to keep the band from finding out.',
      options: [{ text: 'Let me look at the case.', effect: (g) => g.setStage(CORNET, 'case') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, CORNET) === 'case' ? 'Have a look in the case. I can\'t. I keep hoping.' : 'Anything? Don\'t tell me in front of the band.') },
    after: {
      text: (g) => {
        const f = g.flag(CORNET);
        if (f === 'redeem') return 'It turned up in the case the next morning, polished. I\'ll not ask. We came second at Lammas. Second! Billy played like an angel. Like an angel who\'d been crying.';
        if (f === 'told') return 'He\'s paying me back out of his wage, a mark a week, and he plays every night after his shift till his lip bleeds. We came third. I don\'t care. I don\'t care at all.';
        return 'No more brag in the lamp room. Half the Row\'s lads are bringing their wages home to their mothers, and their mothers keep stopping me in the street to shake my hand. We beat Ansbury Silver. Eleven years.';
      },
    },
  },
};

const moss: DialogueTree = {
  start: (g) => (at(g, CORNET) === 'moss' ? 'm1' : 'm0'),
  nodes: {
    m0: { text: 'Abner Moss. Loans against goods, by the week. You\'ve not got anything I want, have you? No. Good day.' },
    m1: { text: 'One hundred and fourteen. A cornet, silver-plated, the Hartley one. I know whose it is. Everyone knows whose it is.', next: 'm2' },
    m2: { text: 'The lad who pawned it was the Hartley lad. Billy. White as milk, said he\'d have it back by Friday. They always say Friday.', next: 'm3' },
    m3: { text: 'Forty marks to redeem it, any time before the end of the month. After that I sell it to Ansbury Silver. They\'ve already asked.', options: [{ text: 'I\'ll talk to Billy.', effect: (g) => g.setStage(CORNET, 'billy') }] },
  },
};

const billy: DialogueTree = {
  start: (g) => (at(g, CORNET) === 'billy' ? 'b1' : at(g, CORNET) === 'done' ? 'after' : 'b0'),
  nodes: {
    b0: { text: 'Billy Hartley. Second cornet. Don\'t ask me to play anything.' },
    b1: { speaker: 'narrator', text: 'A lad of seventeen with a cornet player\'s lip and a miner\'s shoulders, leaning on the end wall of the Row and not looking at his father\'s step.', next: 'b2' },
    b2: { text: 'You\'ve been to Moss. I can tell by your face. Everybody\'s face does that after Moss.', next: 'b3' },
    b3: { text: 'Shad Kemble. The tallyman. He has a card school in the lamp room on pay night. Brag, a penny to come in.', next: 'b3b' },
    b3b: { text: 'By the end of the night you\'ve lost what you came in with, and what you hadn\'t got yet. He writes it down. He\'s good at writing things down.', next: 'b4' },
    b4: { text: 'I owed him a month\'s wage. He said he\'d tell the Works I\'d been at cards in the lamp room, and I\'d be turned off. So I pawned the only thing I had. I was going to get it back. I was going to get it back by Friday.', next: 'b5' },
    b5: {
      text: 'Don\'t tell my dad. Please. It\'d kill him. It\'d kill him worse than losing to Ansbury.',
      options: [
        { text: '(Pay 40 marks) I\'ll redeem it. It\'ll be in the case in the morning. Nobody needs to know where it went.', cond: (g) => g.marks >= 40, moral: { id: 'rdCornet:redeem', a: 3, tr: { generosity: 3, deception: 1 }, npc: { rd_billy: 25, rd_amos: 5 }, note: 'Redeemed Billy Hartley\'s cornet from the pawnbroker and put it back in its case without a word.' }, effect: (g) => { g.addMarks(-40); g.setFlag(CORNET, 'redeem'); g.addMarks(55); g.setStage(CORNET, 'done'); }, next: 'bR' },
        { text: 'Your father should hear it from you, and he will. I\'ll walk over with you.', moral: { id: 'rdCornet:told', a: 3, tr: { honesty: 3 }, npc: { rd_billy: -5, rd_amos: 15 }, note: 'Walked Billy Hartley to his father to tell him where his cornet had gone.' }, effect: (g) => { g.setFlag(CORNET, 'told'); g.addMarks(60); g.setStage(CORNET, 'done'); }, next: 'bT' },
        { text: 'This isn\'t about you. Kemble\'s doing it to every lad on the Row. Delia Harrowgate will hear about his card school today.', moral: { id: 'rdCornet:delia', a: 6, tr: { courage: 3, honesty: 2 }, npc: { rd_billy: 15, rd_amos: 20, delia: 5 }, note: 'Took Shad Kemble\'s card school in the lamp room to Delia Harrowgate, who shut it and turned him off.', fame: 'shut the card school in the Harrowgate lamp room', spread: 'local' }, effect: (g) => { g.setFlag(CORNET, 'delia'); g.addMarks(75); g.setStage(CORNET, 'done'); }, next: 'bD' },
      ],
    },
    bR: { text: 'You\'d do that? Forty marks? I\'ll pay you back. I will. A mark a week. Don\'t laugh. I mean it.' },
    bT: { speaker: 'narrator', text: 'Billy gets up as if his legs hurt. At his father\'s step he says it all very fast to the ground, and Amos hears him out, and then puts the empty case down very carefully, and stands up, and holds on to his son the way a man holds a cornet: as if he\'s afraid he\'ll dent it.' },
    bD: { text: 'Delia Harrowgate? She\'ll have the lamp room turned upside down. She\'ll have Kemble out on the road with his pack. And Moss? Moss will still want forty marks. Moss always wants forty marks.' },
    after: { text: (g) => (g.flag(CORNET) === 'delia' ? 'Miss Harrowgate paid Moss herself, and stopped it out of Kemble\'s last wage. I play every night. You should come to Lammas.' : 'I play every night now. Every night. You should come to Lammas.') },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [DOG]: {
    id: DOG, name: 'The Red Dog', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'trail') return 'Saul Fairclough, a drover on the north road above Company Row, has lost three ewes, and has seen a red dog the size of a pony standing over his flock at dusk. Follow her west across the rock.';
      if (s === 'den') return 'A dog\'s prints, not a wolf\'s. A dead ewe with wolf prints round it and the red dog\'s over them. And in the gully, a shepherd\'s bones, with a bed scraped in the dust beside them. Dust wolves are coming for the gully.';
      if (s === 'bel') return 'The wolves are dead. Something under the lip of rock in the gully is watching me.';
      if (s === 'saul') return 'The red dog is Bel, Josiah Platt\'s mastiff, rolled red in the ochre dust. Josiah went missing at Candlemas, and she has kept him ever since, and kept the wolves off Saul\'s ewes. Saul should hear it.';
      const f = g.flag(DOG);
      return f === 'home' ? 'Bel came home with me.' : f === 'shot' ? 'Saul shot Bel at dusk, for the ewes.' : 'Saul built Josiah a cairn in the gully, and Bel keeps it, and his flock.';
    },
    objectives: (g, s) => (s === 'trail' ? SIGNS.map((_, i) => ({ text: `Follow the red dog west (${['her prints', 'a dead ewe', 'the gully'][i]})`, done: !!g.flag('rdDogSign' + i), marker: 'rdDogSign' + i }))
      : s === 'den' ? [{ text: `Drive the dust wolves out of the gully (${Math.min(WOLVES.length, killed(g, 'rdDogWolf'))}/${WOLVES.length})`, done: killed(g, 'rdDogWolf') >= WOLVES.length }]
      : s === 'bel' ? [{ text: 'Go to the lip of rock in the gully', marker: 'rdBel' }]
      : s === 'saul' ? [{ text: 'Go back to Saul Fairclough on the north road', marker: 'rd_saul' }] : []),
    advance: (g, s) => (s === 'trail' && signs(g) >= SIGNS.length ? 'den' : s === 'den' && killed(g, 'rdDogWolf') >= WOLVES.length ? 'bel' : null),
    marks: (_g, s): Marks => (!s ? { rd_saul: '!' } : s === 'saul' ? { rd_saul: '?' } : {}),
    walk: { cast: ['rd_saul'], kill: { den: [['dustwolf', 3]] } },
  },
  [CORNET]: {
    id: CORNET, name: 'Second Cornet', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'case') return 'Amos Hartley, bandmaster of the Harrowgate Works Band, says his son Billy\'s cornet went out of its case on his step last night, a week before the Lammas contest. Look at the case.';
      if (s === 'moss') return 'In the lining of the case, a pawn ticket: Abner Moss, the Works gate, number one hundred and fourteen.';
      if (s === 'billy') return 'Moss says the lad who pawned the cornet was Billy Hartley himself. Forty marks to redeem it, before Ansbury Silver buys it.';
      const f = g.flag(CORNET);
      return f === 'redeem' ? 'I redeemed the cornet and put it back in the case. Amos didn\'t ask.' : f === 'told' ? 'Billy told his father about the cards, and the cornet.' : 'Delia Harrowgate shut Shad Kemble\'s card school and turned him off.';
    },
    objectives: (_g, s) => (s === 'case' ? [{ text: 'Look in the empty case on Amos Hartley\'s step', marker: 'rdCase' }]
      : s === 'moss' ? [{ text: 'Ask Abner Moss at the Works gate about ticket 114', marker: 'rd_moss' }]
      : s === 'billy' ? [{ text: 'Find Billy Hartley on Company Row', marker: 'rd_billy' }] : []),
    marks: (_g, s): Marks => (!s ? { rd_amos: '!' } : s === 'moss' ? { rd_moss: '?' } : s === 'billy' ? { rd_billy: '?' } : {}),
    walk: { cast: ['rd_amos', 'rd_moss', 'rd_billy'] },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'rdDogWolf', type: 'dustwolf', at: WOLVES, when: (g) => at(g, DOG) === 'den' },
];

const SIGN_TOASTS = [
  'Prints in the red dust, as broad as your palm. A dog\'s, not a wolf\'s: the nails show in front, and the gait is a trot, not a lope. They go west, and come back, and go west again, the same line, worn into a path.',
  'A ewe, what\'s left of her. Wolf work: three sets of narrow prints round her, and a fourth over them, the broad ones. A great deal of blood soaked into the rock, a good way off from the ewe, and none of it hers.',
  'At the bottom of the gully, under a lip of rock: bones in the rags of a smock, a crook, a tin whistle on a string. Beside them a bed scraped in the dust, still warm, and red hairs in it. From the mouth of the gully, a wolf\'s yip, and another.',
];

const things: WorldThing[] = [
  ...SIGNS.map(([x, z, look], i): WorldThing => ({
    id: 'rdDogSign' + i, x, z, label: 'Look closer', radius: 2.4, look: look as WorldThing['look'],
    when: (g) => at(g, DOG) === 'trail' && !g.flag('rdDogSign' + i) && (i === 0 || !!g.flag('rdDogSign' + (i - 1))),
    use: (g) => { g.setFlag('rdDogSign' + i, 1); g.toast(SIGN_TOASTS[i]); },
  })),
  { id: 'rdBel', x: BEL.x, z: BEL.z, label: 'Crouch down and wait', radius: 3, look: 'none',
    when: (g) => at(g, DOG) === 'bel',
    use: (g) => { g.setStage(DOG, 'saul'); g.toast('You crouch and wait, and after a long time she comes out from under the rock: a mastiff bitch as tall as your hip, rolled red from nose to tail in the ochre dust, one ear torn and a wolf bite half healed on her shoulder. She stands over the bones and looks at you. On her collar, cut into the leather: BEL. J. PLATT. She lets you read it. Then she lies down again where she was.'); } },
  { id: 'rdCase', x: CASE.x, z: CASE.z, label: 'Look in the case', radius: 2.4, look: 'satchel',
    when: (g) => at(g, CORNET) === 'case',
    use: (g) => { g.setStage(CORNET, 'moss'); g.toast('Green baize, worn to the threads where the cornet lay, and the smell of valve oil. Pushed down into the lining where the mouthpiece goes, folded small: a pawn ticket. A. MOSS, LOANS, THE WORKS GATE. No. 114.'); } },
];

const NPCS: NpcDef[] = [
  { id: 'rd_saul', name: 'Saul Fairclough', title: 'Drover', look: { skin: '#c8906a', hair: '#8a8a82', hairStyle: 3, facial: 2, eyes: '#4a4a3a', tunic: '#7a5a3a', trim: '#4a3a2a', trousers: '#4a3e30', boots: '#2a1e14', hat: 'wide', hatColor: '#5a4030', build: 0.9, height: 1.04, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [SAUL.x, SAUL.z], face: [SAUL.x - 4, SAUL.z - 1], anim: 'idle' }], barks: ['Three ewes.', 'Mind the rock at dusk.'] },
  { id: 'rd_amos', name: 'Amos Hartley', title: 'Bandmaster, the Harrowgate Works Band', look: { skin: '#e0b48e', hair: '#5a4a3a', hairStyle: 1, facial: 1, eyes: '#4a4a3a', tunic: '#2a3a6a', trim: '#e0c060', trousers: '#2a2a3a', boots: '#1e1a16', hat: 'cap', hatColor: '#2a3a6a', build: 1.2, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [AMOS.x, AMOS.z], face: [AMOS.x, AMOS.z + 3], anim: 'idle' }], barks: ['A week on Saturday.', 'Eleven years.'] },
  { id: 'rd_moss', name: 'Abner Moss', title: 'Loans, the Works gate', look: { skin: '#e8c4a0', hair: '#3a3a3a', hairStyle: 4, eyes: '#3a3a4a', tunic: '#3a3a3a', trim: '#5a5a5a', trousers: '#2a2a2a', boots: '#1a1612', hat: 'wide', hatColor: '#1e1e1e', build: 0.85, age: 0.6 },
    schedule: [{ from: 6, to: 21, at: [MOSS.x, MOSS.z], face: [MOSS.x - 3, MOSS.z], anim: 'idle' }], barks: ['By the week.', 'Friday, they always say.'] },
  { id: 'rd_billy', name: 'Billy Hartley', title: 'Second cornet', look: { skin: '#e0b48e', hair: '#6a4a2a', hairStyle: 5, eyes: '#4a5a4a', tunic: '#4a4a4a', trim: '#2a3a6a', trousers: '#3a3430', boots: '#2a1e14', build: 1.05, age: 0.2 },
    schedule: [{ from: 6, to: 22, at: [BILLY.x, BILLY.z], face: [BILLY.x + 3, BILLY.z], anim: 'idle' }], barks: ['Don\'t ask me to play anything.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'pet_barrens_red', name: 'Bel, the red dog', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'bag', a: '#b0502a', b: '#e0a070' }, pet: 'barrens_red',
    desc: 'Josiah Platt\'s mastiff, who kept him in the gully from Candlemas, and the wolves off Saul Fairclough\'s ewes. Red from nose to tail, and she will be for a month whatever you wash her in.',
    stats: 'Used, she goes into the wardrobe for good, and follows you about. Walk up to her and press E to look after her.' },
];

export const REDSTONE_BARRENS: RegionContent = {
  id: 'redstoneBarrens',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { rd_saul: saul, rd_amos: amos, rd_moss: moss, rd_billy: billy },
  quests,
  spawns,
  things,
};
