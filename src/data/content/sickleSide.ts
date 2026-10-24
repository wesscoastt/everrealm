import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { GLIMMER, HOOKNESS, SNOWBARROWS, STEAM_WELLS } from '../sickle';

// The Sickle's side stories (the island, its town and its main story: data/content/sickle.ts). Each one
// starts small and turns into something:
//
// sickleAlf, IRON FOR ALF (Bram Ellery): his brother Alf went through the ice off the west horn two winters
//   ago with his harpoon in his hand. Bram has seen a wight on the horn carrying iron. 'find' (the wight on
//   the west horn shore) -> 'iron' (take the harpoon from the ice) -> 'bram' -> done. Choice alfIron =
//   'bram' (Bram throws his brother's iron again) | 'cairn' (it stays on a cairn on the horn, with Alf).
// sickleIce, PAST THE RED FLAGS (Elsie Fenwick): her cousin Pip has gone out past the flags to the deep hole
//   where the big char are, and there's a bear on the ice. 'pip' (pull him out) -> 'bear' (the ice bear) ->
//   'elsie' -> done. Choice pipTold = 'annis' (Pip's barred from the ice; Elsie forgives you slowly) |
//   'quiet' (Elsie owes you, and shows you the char hole).
// sickleOil, SHORT MEASURE (Robin Grice): Robin's casks from the try-works come up two gallons short. One
//   cask in the yard sounds wrong; Tobias Gunn, the foreman, is drawing off oil for the Kittiwake, Mara
//   Coyle's boat out of Saltpenny. 'casks' -> 'tobias' -> 'robin' -> done. Choice oilTold = 'annis'
//   (Tobias is put on the next boat south) | 'square' (he pays Robin back and stays, and owes you).
// sickleMeg, GREY MEG (Annis Kettlewell): the town's dogs go missing in the night; the tracks go up to the
//   Glimmer, the ice cave in the north-east fells. 'meg' (Grey Meg, at the bottom) -> 'annis' -> done.
// sickleNames, THE NAMES ON THE STONES (Ida Coulter): the five Snowbarrows have marks on their kerbs nobody
//   reads any more. 'stones' (read all five) -> 'ida' -> done: they're the Westhorn ringers' graves, all but
//   the last one's. The ringer who isn't there is Ebba Lind.
// sickleWells, WARM WATER (Ida Coulter): the Grice boy has the lung fever; the old remedy is water from the
//   Steam Wells, carried down hot. 'wells' -> 'ida' -> done.

const H = HOOKNESS;
const ALF = 'sickleAlf', ICE = 'sickleIce', OIL = 'sickleOil', MEG = 'sickleMeg', NAMES = 'sickleNames', WELLS = 'sickleWells';
/** Where Alf's wight walks, on the west horn's inner shore. */
const ALF_AT: [number, number] = [2715.5, -1495.5];
/** Pip, out on the bay ice past the flags; the bear comes down the shore behind him. */
const PIP_AT: [number, number] = [3256.5, -1578.5];
const BEAR_AT: [number, number] = [3266.5, -1566.5];
/** The cask that sounds wrong, in the try-works yard. */
const CASK_AT: [number, number] = [H.x + 7.2, H.z + 12.1];
/** The five barrows' doorways (world/sites.ts buildSnowbarrows), and the ringer each is. */
const BARROWS: { at: [number, number]; ringer: string; mark: string }[] = [
  { at: [SNOWBARROWS.x - 12 + 0.5, SNOWBARROWS.z - 6 + 7.5], ringer: 'Aud', mark: 'a bell over three waves' },
  { at: [SNOWBARROWS.x + 8 + 0.5, SNOWBARROWS.z - 10 + 6.5], ringer: 'Hallvard', mark: 'a bell with a rope that runs off the stone' },
  { at: [SNOWBARROWS.x - 2 + 0.5, SNOWBARROWS.z + 10 + 8.5], ringer: 'Tora', mark: 'two bells, one of them cracked' },
  { at: [SNOWBARROWS.x + 16 + 0.5, SNOWBARROWS.z + 8 + 5.5], ringer: 'Ivo', mark: 'a bell and a boat under it' },
  { at: [SNOWBARROWS.x - 18 + 0.5, SNOWBARROWS.z + 12 + 5.5], ringer: 'Brand Lind', mark: 'a bell, and a child\'s hand pressed beside it' },
];
const read = (g: GameApi) => BARROWS.filter((_, i) => g.flag('sickleStone:' + i)).length;

const items: ItemDef[] = [
  { id: 'alfs_harpoon', name: 'Alf Ellery\'s harpoon', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'sword', a: '#8a9098', b: '#5a3a20' }, desc: 'Iron gone black with two winters in the ice. An A cut into the shaft, and under it, smaller, a B.' },
  { id: 'hot_water', name: 'Flask of well water', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#c8e0e8', b: '#5a6a72' }, desc: 'From the Steam Wells, stoppered hot. It smells of iron and eggs, which Ida says is the good part.' },
  { id: 'char_hole_map', name: 'Elsie\'s char hole', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e0e8f0', b: '#4a6a8a' }, desc: 'A scrap of sailcloth with the bay drawn on it in tar, a cross out past the red flags, and "DON\'T TELL PIP" underneath.' },
];

const npcs: NpcDef[] = [
  {
    id: 'pip_fenwick', name: 'Pip Fenwick', title: 'Elsie\'s cousin',
    look: { skin: '#f0cfb0', hair: '#c8a060', hairStyle: 0, eyes: '#4a6a7a', tunic: '#5a3a2a', trim: '#d8c090', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#8a2a2a', build: 0.7, height: 0.8, age: 0.05 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: PIP_AT, face: [PIP_AT[0] - 3, PIP_AT[1]], anim: 'idle' }],
    barks: ['I wasn\'t past the flags. Much.'],
    when: (g) => at(g, ICE) === 'pip',
  },
  {
    id: 'tobias_gunn', name: 'Tobias Gunn', title: 'Foreman, the try-works',
    look: { skin: '#d8a888', hair: '#4a3a2a', hairStyle: 0, eyes: '#3a2a1a', beard: true, tunic: '#4a3a2a', trim: '#8a7a5a', trousers: '#3a3028', boots: '#2a1e14', apron: true, build: 1.2, age: 0.5 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [H.x + 13.5, H.z + 10.5], face: [H.x + 13.5, H.z + 12.5], anim: 'idle' }],
    barks: ['Keep the fires up.', 'Mind the pots. They don\'t mind you.'],
    when: (g) => g.flag('oilTold') !== 'annis',
  },
];

const quests: Record<string, QuestDef> = {
  [ALF]: {
    id: ALF, name: 'Iron for Alf', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'find') return 'Bram Ellery\'s brother Alf went through the ice off the west horn two winters ago with his harpoon in his hand. Bram has seen a wight on the horn\'s shore carrying iron.';
      if (s === 'iron') return 'The wight on the horn is down. Its iron is lying in the snow where it fell.';
      if (s === 'bram') return 'I have Alf\'s harpoon, his initial cut in the shaft. Bram is on the quay at Hookness.';
      return g.flag('alfIron') === 'cairn' ? 'Alf\'s iron is on a cairn on the west horn, with him. Bram goes up there sometimes.' : 'Bram throws his brother\'s iron now. He says it still flies straight.';
    },
    objectives: (g, s) => {
      if (s === 'find') return [{ text: `Find the wight with the harpoon on the west horn (${Math.min(1, killed(g, 'type:alfwight'))}/1)`, marker: 'alfIron' }];
      if (s === 'iron') return [{ text: 'Take the harpoon', marker: 'alfIron' }];
      if (s === 'bram') return [{ text: 'Bring Bram Ellery his brother\'s iron', marker: 'bram_ellery' }];
      return [];
    },
    advance: (g, s) => (s === 'find' && killed(g, 'type:alfwight') >= 1 ? 'iron' : null),
    marks: (_g, s): Marks => (s === 'bram' ? { bram_ellery: '?' } : {}),
    walk: { kill: { find: [['alfwight', 1]] }, cast: ['bram_ellery'] },
  },
  [ICE]: {
    id: ICE, name: 'Past the Red Flags', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'pip') return 'Elsie Fenwick\'s cousin Pip has gone out past the red flags on the bay, to the deep hole where the big char are. The ice there is a day old.';
      if (s === 'bear') return 'Pip went through, and I pulled him out. There\'s an ice bear coming down the shore behind us.';
      if (s === 'elsie') return 'The bear\'s dead and Pip\'s back at the camp, wet and shaking and alive. Elsie will want to know.';
      return g.flag('pipTold') === 'annis' ? 'Annis Kettlewell has barred Pip from the bay ice for the winter. Elsie isn\'t speaking to me much.' : 'Nobody told Annis about Pip. Elsie drew me a map to her char hole, and wrote on it, "Don\'t tell Pip."';
    },
    objectives: (g, s) => {
      if (s === 'pip') return [{ text: 'Find Pip on the bay ice', marker: 'pip_fenwick' }];
      if (s === 'bear') return [{ text: `Kill the ice bear (${Math.min(1, killed(g, 'type:shorebear'))}/1)` }];
      if (s === 'elsie') return [{ text: 'Tell Elsie Fenwick', marker: 'elsie_fenwick' }];
      return [];
    },
    advance: (g, s) => (s === 'bear' && killed(g, 'type:shorebear') >= 1 ? 'elsie' : null),
    marks: (_g, s): Marks => (s === 'elsie' ? { elsie_fenwick: '?' } : {}),
    walk: { kill: { bear: [['shorebear', 1]] }, cast: ['elsie_fenwick', 'pip_fenwick'] },
  },
  [OIL]: {
    id: OIL, name: 'Short Measure', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'casks') return 'Robin Grice\'s casks of oil from the try-works come up two gallons short, every one. The casks are filled in the try-works yard.';
      if (s === 'tobias') return 'One cask in the yard sounds wrong when you knock it: a false head, two gallons of space under it. Tobias Gunn, the foreman, fills them.';
      if (s === 'robin') return g.flag('oilTold') === 'annis' ? 'I\'ve told Annis about Tobias. Robin will want to know his casks are full again.' : 'Tobias will pay Robin back, gallon for gallon. Robin will want to know.';
      return g.flag('oilTold') === 'annis' ? 'Tobias Gunn went south on the next boat. The casks are full.' : 'Tobias paid Robin back and stays at the try-works. He owes me, and he knows it.';
    },
    objectives: (_g, s) => {
      if (s === 'casks') return [{ text: 'Look over the casks in the try-works yard', marker: 'sickleCask' }];
      if (s === 'tobias') return [{ text: 'Talk to Tobias Gunn', marker: 'tobias_gunn' }];
      if (s === 'robin') return [{ text: 'Tell Robin Grice', marker: 'robin_grice' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'tobias' ? { tobias_gunn: '?' } : s === 'robin' ? { robin_grice: '?' } : {}),
    walk: { cast: ['robin_grice', 'tobias_gunn', 'annis'] },
  },
  [MEG]: {
    id: MEG, name: 'Grey Meg', region: 'sickle', depth: 'quest',
    notes: (_g, s) => {
      if (s === 'meg') return 'Hookness\'s dogs go missing in the night, one a week. The tracks go up into the fells to the Glimmer, the ice cave to the north-east. Annis says it\'s a she-wolf the size of a pony, and the old men call her Grey Meg.';
      if (s === 'annis') return 'Grey Meg is dead at the bottom of the Glimmer. Annis Kettlewell will want to hear it.';
      return 'Grey Meg is dead. The dogs sleep out again.';
    },
    objectives: (g, s) => {
      if (s === 'meg') return [{ text: `Kill Grey Meg in the Glimmer (${Math.min(1, killed(g, 'type:greymeg'))}/1)`, marker: 'glimmerMouth' }];
      if (s === 'annis') return [{ text: 'Tell Annis Kettlewell', marker: 'annis' }];
      return [];
    },
    advance: (g, s) => (s === 'meg' && killed(g, 'type:greymeg') >= 1 ? 'annis' : null),
    marks: (_g, s): Marks => (s === 'annis' ? { annis: '?' } : {}),
    walk: { kill: { meg: [['greymeg', 1]] }, cast: ['annis'], from: { quests: { sickleBell: 'done' }, flags: { sickleBell: 'rung' } } },
  },
  [NAMES]: {
    id: NAMES, name: 'The Names on the Stones', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'stones') return `The Snowbarrows on the crest of the north fells have marks cut in their kerbstones that nobody in Hookness reads any more. Ida Coulter wants them read. (${read(g)} of 5)`;
      if (s === 'ida') return 'Every barrow\'s mark has a bell in it. Ida will know what that means.';
      return 'The Snowbarrows are the Westhorn ringers\' graves, every one of them but the last. Ebba Lind never came down to be buried.';
    },
    objectives: (g, s) => {
      if (s === 'stones') return [{ text: `Read the marks on the Snowbarrows (${read(g)}/5)`, marker: 'sickleStone' + Math.max(0, BARROWS.findIndex((_, i) => !g.flag('sickleStone:' + i))) }];
      if (s === 'ida') return [{ text: 'Tell Ida Coulter what the stones say', marker: 'ida' }];
      return [];
    },
    advance: (g, s) => (s === 'stones' && read(g) >= 5 ? 'ida' : null),
    marks: (_g, s): Marks => (s === 'ida' ? { ida: '?' } : {}),
    walk: { cast: ['ida'] },
  },
  [WELLS]: {
    id: WELLS, name: 'Warm Water', region: 'sickle', depth: 'short',
    notes: (_g, s) => {
      if (s === 'wells') return 'Robin Grice\'s boy has the lung fever. Ida Coulter wants water from the Steam Wells, in the fold of the north-west fells, carried down while it\'s still warm.';
      if (s === 'ida') return 'I have a flask of well water, still hot. Ida is at the chapel.';
      return 'The Grice boy is sitting up and complaining about the taste. Ida says that\'s the water working.';
    },
    objectives: (_g, s) => {
      if (s === 'wells') return [{ text: 'Fill a flask at the Steam Wells', marker: 'sickleWell' }];
      if (s === 'ida') return [{ text: 'Bring the water to Ida Coulter', marker: 'ida' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'ida' ? { ida: '?' } : {}),
    walk: { cast: ['ida'] },
  },
};

// ================================================================ What they say

const bramNodes: Record<string, DNode> = {
  alf1: {
    text: 'Alf, my brother. Through the ice off the west horn, two winters back, harpoon in his hand. There\'s a wight walks that shore now with iron in its fist. I can\'t go up there. You could.',
    options: [
      { text: 'I\'ll go.', effect: (g) => g.setStage(ALF, 'find') },
      { text: 'Not now, Bram.' },
    ],
  },
  alfWait: { text: 'The west horn. Inside shore. It walks at the water.', options: [{ text: 'I\'m going.' }] },
  alfBack: {
    text: 'That\'s his. The A, and my B under it. I cut that when we were boys. What do I do with it now?',
    options: [
      { text: 'Throw it. He\'d want it thrown.', next: 'alfThrow' },
      { text: 'Put it on a cairn on the horn. With him.', next: 'alfCairn' },
    ],
  },
  alfThrow: {
    text: 'Aye. Aye, he would. It\'ll fly straight, his did. Here, for your trouble. Don\'t argue.',
    options: [{ text: 'Good hunting, Bram.', effect: (g) => { g.take('alfs_harpoon'); g.setFlag('alfIron', 'bram'); g.addMarks(160); g.setStage(ALF, 'done'); } }],
  },
  alfCairn: {
    text: 'On the horn. Where I can see it from the boat. I\'d not thought of that. I\'ll build it myself. Take this. I mean it.',
    options: [{ text: 'Good hunting, Bram.', effect: (g) => { g.take('alfs_harpoon'); g.setFlag('alfIron', 'cairn'); g.addMarks(160); g.setStage(ALF, 'done'); } }],
  },
};

const elsieNodes: Record<string, DNode> = {
  ice1: {
    text: 'Have you seen Pip? My cousin. He went out after the big char again. Past the flags. There\'s bear tracks on the shore this morning.',
    options: [
      { text: 'I\'ll find him.', effect: (g) => g.setStage(ICE, 'pip') },
      { text: 'Not now.' },
    ],
  },
  iceWait: { text: 'Out past the flags. Please hurry.', options: [{ text: 'Going.' }] },
  iceBack: {
    text: 'He\'s back. He\'s soaked through and blue and he\'s back. Thank you. Thank you. Are you going to tell Annis? She\'ll bar him off the ice.',
    options: [
      { text: 'She should know. He nearly drowned.', next: 'iceTell' },
      { text: 'Nobody needs to know.', next: 'iceQuiet' },
    ],
  },
  iceTell: {
    text: 'You\'re right. I know you\'re right. I\'ll hate you for a week anyway.',
    options: [{ text: 'That\'s fair.', effect: (g) => { g.setFlag('pipTold', 'annis'); g.addMarks(120); g.setStage(ICE, 'done'); } }],
  },
  iceQuiet: {
    text: 'Then here. My char hole, where the big ones are. Don\'t let Pip see this. That\'s how he found it the first time.',
    options: [{ text: 'Your secret\'s kept.', effect: (g) => { g.setFlag('pipTold', 'quiet'); g.give('char_hole_map'); g.give('raw_char', 6); g.setStage(ICE, 'done'); } }],
  },
};

const robinNodes: Record<string, DNode> = {
  oil1: {
    text: 'Every cask from the try-works comes up two gallons short. Every one. I\'ve said to Annis. Annis says oil shrinks in the cold. Oil doesn\'t shrink two gallons.',
    options: [
      { text: 'I\'ll look into it.', effect: (g) => g.setStage(OIL, 'casks') },
      { text: 'Not my business.' },
    ],
  },
  oilWait: { text: 'Two gallons. Every cask.', options: [{ text: 'I\'m looking.' }] },
  oilBack: {
    text: (g) => (g.flag('oilTold') === 'annis' ? 'Tobias. Tobias Gunn. I\'ve drunk with him every Friday for nine years. Well. My casks will be full now.' : 'He\'s paying me back gallon for gallon, and I don\'t have to look at Annis\'s face when she finds out. That\'s a good morning\'s work.'),
    options: [{ text: 'Glad to help.', effect: (g) => { g.addMarks(140); g.setStage(OIL, 'done'); } }],
  },
};

const tobiasNodes: Record<string, DNode> = {
  oilT1: {
    text: 'You\'ve been knocking on my casks. Go on, then. Say it.',
    options: [{ text: 'Where does the oil go, Tobias?', next: 'oilT2' }],
  },
  oilT2: {
    text: 'The Kittiwake. Mara Coyle\'s boat out of Saltpenny. She pays three times what Annis pays me in a month. My mother\'s in the chapel tally. I\'m saving for the passage south.',
    options: [
      { text: 'Annis has to know.', next: 'oilTell' },
      { text: 'Pay Robin back. All of it.', next: 'oilSquare' },
    ],
  },
  oilTell: {
    text: 'Then I\'m on the next boat south whether I\'ve saved or not. I suppose that\'s one way.',
    options: [{ text: 'It is.', effect: (g) => { g.setFlag('oilTold', 'annis'); g.setStage(OIL, 'robin'); } }],
  },
  oilSquare: {
    text: 'Gallon for gallon. I can do that. And Mara Coyle can find another fool. I owe you, then.',
    options: [{ text: 'You do.', effect: (g) => { g.setFlag('oilTold', 'square'); g.setStage(OIL, 'robin'); } }],
  },
};

const annisNodes: Record<string, DNode> = {
  meg1: {
    text: 'Another dog gone last night. The Fenwicks\'. Tracks up into the north-east fells, to the Glimmer. The old men say Grey Meg, a she-wolf big as a pony. I say I want her dead.',
    options: [
      { text: 'I\'ll go up to the Glimmer.', effect: (g) => g.setStage(MEG, 'meg') },
      { text: 'Not now.' },
    ],
  },
  megBack: {
    text: 'Grey Meg. Dead. The old men will have to find something else to frighten the children with. Here. The town owes you a dog\'s worth. Several dogs\' worth.',
    options: [{ text: 'Keep your dogs in.', effect: (g) => { g.addMarks(260); g.give('whale_oil', 4); g.setStage(MEG, 'done'); } }],
  },
};

const idaNodes: Record<string, DNode> = {
  names1: {
    text: 'There are five barrows up on the north crest, under the snow. Marks on the kerbs. My mother could read them. I never learned, and now there\'s nobody. Would you go and look?',
    options: [
      { text: 'I\'ll read them.', effect: (g) => g.setStage(NAMES, 'stones') },
      { text: 'Not now.' },
    ],
  },
  namesBack: {
    text: 'Bells. Every one. Aud, Hallvard, Tora, Ivo, Brand Lind. They\'re in the ringers\' book. They\'re the ringers. Brand Lind was Ebba\'s father. There\'s no barrow for her. She never came down off the tower.',
    options: [{ text: 'No. She didn\'t.', effect: (g) => { g.addMarks(140); g.setStage(NAMES, 'done'); } }],
  },
  wells1: {
    text: 'Robin\'s boy has the lung fever. The old remedy is water from the Steam Wells, carried down hot. I\'m too old for the fells. You aren\'t.',
    options: [
      { text: 'I\'ll fetch it.', effect: (g) => g.setStage(WELLS, 'wells') },
      { text: 'Not now.' },
    ],
  },
  wellsBack: {
    text: 'Still warm. Good. That\'s iron and egg you can smell, and that\'s the part that works. Go and tell Robin his boy will grumble by morning.',
    options: [{ text: 'I will.', effect: (g) => { g.take('hot_water'); g.addMarks(90); g.setStage(WELLS, 'done'); } }],
  },
};

const pip: DialogueTree = {
  start: () => 'hello',
  nodes: { hello: { text: 'I wasn\'t past the flags. I was nearly past the flags. Don\'t tell Elsie.', options: [{ text: 'Stay still. The ice is thin.' }] } },
};

export const SICKLE_SIDE_CONTENT: RegionContent = {
  id: 'sickleSide',
  items,
  npcs,
  quests,
  dialogue: { pip_fenwick: pip, tobias_gunn: { start: () => 'hello', nodes: { hello: { text: 'Tobias Gunn. I run the pots. Don\'t touch the pots.', options: [{ text: 'I won\'t.' }] } } } },
  spawns: [
    { tag: 'alfWight', type: 'alfwight', at: [ALF_AT], when: (g) => at(g, ALF) === 'find' },
    { tag: 'pipBear', type: 'shorebear', at: [BEAR_AT], when: (g) => at(g, ICE) === 'bear' },
  ],
  things: [
    // Marker only: the Glimmer's mouth, for Grey Meg's hunt (nothing to press E on)
    { id: 'glimmerMouth', x: GLIMMER.x + 0.5, z: GLIMMER.z + 0.5, label: '', radius: 0, when: () => false },
    {
      id: 'alfIron', x: ALF_AT[0], z: ALF_AT[1], label: 'Take the harpoon from the snow', radius: 3,
      when: (g: GameApi) => at(g, ALF) === 'iron',
      use: (g: GameApi) => { if (!g.give('alfs_harpoon')) return; g.setStage(ALF, 'bram'); g.toast('The iron is black and the shaft is split, but the head is sound. There\'s an A cut in the wood, and a smaller B under it.'); },
    },
    {
      id: 'pipPull', x: PIP_AT[0], z: PIP_AT[1], label: 'Pull Pip out', radius: 3,
      when: (g: GameApi) => at(g, ICE) === 'pip',
      use: (g: GameApi) => { g.setStage(ICE, 'bear'); g.toast('The ice goes under him as you reach him. You get him by the collar and haul. Behind you, up the shore, something big comes down onto the ice.'); },
    },
    {
      id: 'sickleCask', x: CASK_AT[0], z: CASK_AT[1], label: 'Knock on the casks', radius: 2.6,
      when: (g: GameApi) => at(g, OIL) === 'casks',
      use: (g: GameApi) => { g.setStage(OIL, 'tobias'); g.toast('Full, full, full, and then one that rings hollow two hands from the top. A false head, pinned in. Under it, room for two gallons, and the smell of oil.'); },
    },
    ...BARROWS.map((b, i) => ({
      id: 'sickleStone' + i, x: b.at[0], z: b.at[1], label: 'Read the kerbstone', radius: 2.6,
      when: (g: GameApi) => at(g, NAMES) === 'stones' && !g.flag('sickleStone:' + i),
      use: (g: GameApi) => { g.setFlag('sickleStone:' + i, true); g.toast(`Under the snow, cut in the stone by the doorway: ${b.mark}. Beside it, worn nearly flat, a name: ${b.ringer}.`); },
    })),
    {
      id: 'sickleWell', x: STEAM_WELLS.x - 3.5, z: STEAM_WELLS.z + 1.5, label: 'Fill a flask at the well', radius: 3,
      when: (g: GameApi) => at(g, WELLS) === 'wells',
      use: (g: GameApi) => { if (!g.give('hot_water')) return; g.setStage(WELLS, 'ida'); g.toast('You fill the flask where the water comes up hottest and stopper it fast. It smells of iron and eggs.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'bram_ellery', (g) => (at(g, ALF) === 'bram' ? 'alfBack' : at(g, ALF) === 'find' || at(g, ALF) === 'iron' ? 'alfWait' : undefined), bramNodes);
    addOption(D, 'bram_ellery', 'hello', { text: 'Tell me about Alf.', next: 'alf1', cond: (g) => !at(g, ALF) });
    hook(D, 'elsie_fenwick', (g) => (at(g, ICE) === 'elsie' ? 'iceBack' : at(g, ICE) === 'pip' || at(g, ICE) === 'bear' ? 'iceWait' : !at(g, ICE) ? 'ice1' : undefined), elsieNodes);
    hook(D, 'robin_grice', (g) => (at(g, OIL) === 'robin' ? 'oilBack' : at(g, OIL) === 'casks' || at(g, OIL) === 'tobias' ? 'oilWait' : undefined), robinNodes);
    addOption(D, 'robin_grice', 'hello', { text: 'You look worried.', next: 'oil1', cond: (g) => !at(g, OIL) });
    hook(D, 'tobias_gunn', (g) => (at(g, OIL) === 'tobias' ? 'oilT1' : undefined), tobiasNodes);
    hook(D, 'annis', (g) => (at(g, MEG) === 'annis' ? 'megBack' : at(g, 'sickleBell') === 'done' && !at(g, MEG) ? 'meg1' : undefined), annisNodes);
    hook(D, 'ida', (g) => (at(g, NAMES) === 'ida' ? 'namesBack' : at(g, WELLS) === 'ida' ? 'wellsBack' : undefined), idaNodes);
    addOption(D, 'ida', 'hello', { text: 'Is there anything I can do?', next: 'names1', cond: (g) => !at(g, NAMES) });
    addOption(D, 'ida', 'hello', { text: 'You look tired, Ida.', next: 'wells1', cond: (g) => !at(g, WELLS) });
  },
};
