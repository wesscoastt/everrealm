import type { DialogueTree, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import { actThreeReady } from './actThree';

// THE DROWNED PARISH: the main story's third act, chapters XIII to XVI.
//
// Holmsey was a parish on the marsh under the Gulf Cliffs. A hundred and twelve years ago the
// estate let the Glass Kirk's builders dig the white (star crystal) out of the marsh pits for the
// Kirk's new floor. Crystal is lift: with it gone the ground went down a foot a month, the dyke
// broke at Twelfth Night, and by Lady Day the parish was under the sea. The clerk, Ralph Sweet,
// kept the register to the end. Since the Kirk floor came up, the ground under the Gulf has let
// go a little, and Holmsey is coming back up: an inch a month, enough that the bell, which came
// down off its beam into the drowned ringing chamber long ago, now breaks the surface at low
// water and rings when the swell knocks it.
//
// Chapters (quest ids): storyLowWater, storyRegister, storyLoads, storyBell.
// Ending flag: parishEnd = 'rise' (left to come up; Gullmouth moves the coastal lane) | 'hold'
// (Gullmouth's barges lay ballast on the lane; it stays where it is, the bell ringing at low water)
// | 'sink' (Harrowgate dredges the white while it's shallow; the parish goes back under).
// Cast: Nessa Crane (Gullmouth's harbourmaster), Tamar Sweet (a salvage diver camped in the
// tower), Sela Orme at the Kirk, Hilda Harrowgate at Gullmouth.

const ACT = 'The Drowned Parish';
const LOW = 'storyLowWater', REG = 'storyRegister', LOADS = 'storyLoads', BELL = 'storyBell';

// Where things are (world/sites.ts: buildDrownedTower, buildHolmsey; data/places_regional.ts)
const TOWER = { x: 1560.5, z: 1500.5, y: 18 }; // on Tamar's planks, over the drowned ringing chamber
const VESTRY = { x: 1558.5, z: 1517.5, y: 3 }; // the nave's far end, by the parish chest
const KIRK_BOOK = { x: 1186.5, z: 1807.5 }; // beside Sela Orme
const NESSA = { x: 1768.4, z: 603 };

const end = (g: GameApi) => g.flag('parishEnd') as 'rise' | 'hold' | 'sink' | undefined;

// ================================================================ XIII. LOW WATER

const nessaNodes = {
  dp_n1: { text: 'You. Good. I need somebody who can swim and doesn\'t work for me.', next: 'dp_n2' },
  dp_n2: { text: 'Tamar Sweet writes that the Holmsey bell rang on the ninth, the twenty-third and last night. It hasn\'t rung in a hundred years.', next: 'dp_n3' },
  dp_n3: { speaker: 'narrator' as const, text: 'She holds up the letter. It\'s written on the back of a tide table.', next: 'dp_n4' },
  dp_n4: { text: 'A bell under the sea doesn\'t ring. So either Tamar\'s been at the rum, or Holmsey isn\'t as far under as it was.', next: 'dp_n5' },
  dp_n5: {
    text: 'Every boat to the Raddle smelter goes down the Gulf over Holmsey. If the bottom\'s coming up, I want to know before a keel finds it.',
    options: [
      { text: 'Where do I find Tamar?', next: 'dp_n6', effect: (g: GameApi) => g.setStage(LOW, 'tamar') },
      { text: 'Not now.' },
    ],
  },
  dp_n6: { text: 'The old bell-tower off the Gulf Cliffs, south of here. She\'s been sleeping in it since midsummer, which tells you what she\'s like.' },
  dp_nWait: { text: 'Tamar\'s in the tower off the Gulf Cliffs. Take something warm. She won\'t have.' },

  // XV: Hilda is here, and Nessa wants it decided
  dp_d1: { text: 'Mrs Harrowgate came down the coast road this morning. She\'d heard about the bell before I\'d finished the letter. Pryce hears everything.', next: 'dp_d2' },
  dp_d2: { text: 'Here\'s where I am. It\'s my water. You\'ve been down there and I haven\'t, so you tell me what I tell her.', next: 'dp_d3' },
  dp_d3: {
    text: (g: GameApi) => (g.has('holmsey_register')
      ? 'Tamar wants it left to come up. Mrs Harrowgate wants to dig it. I want my lane. You\'ve the register. Go on.'
      : 'Tamar wants it left to come up. Mrs Harrowgate wants to dig it. I want my lane. Go on.'),
    options: [
      { text: 'Let it come up. Move the lane west of it.', next: 'dp_rise' },
      { text: 'Hold it where it is. Weight it down with stone.', next: 'dp_hold' },
      { text: 'Let Harrowgate dredge the white.', next: 'dp_sink' },
      { text: 'I need to think.' },
    ],
  },
  dp_rise: { text: 'West of it is half a day longer to the smelter, every boat, every trip. They\'ll curse me in every inn on the coast.', next: 'dp_rise2' },
  dp_rise2: { text: 'Fine. I\'ll buoy a new channel by the spring tides. Tell Tamar she can have her parish back, an inch a month.', effect: (g: GameApi) => { g.setFlag('parishEnd', 'rise'); g.setStage(LOADS, 'done'); } },
  dp_hold: { text: 'Stone. There are two lighters on the slip doing nothing, and the quarry at the stacks owes me a favour.', next: 'dp_hold2' },
  dp_hold2: { text: 'We\'ll lay it along the lane till it stops coming up. Expensive. Less expensive than a wreck. The bell will go on ringing at low water, mind.', effect: (g: GameApi) => { g.setFlag('parishEnd', 'hold'); g.setStage(LOADS, 'done'); } },
  dp_sink: { text: 'She\'ll dredge it, sell it, and pay the Charter its share. My lane stays deep. Tidy.', next: 'dp_sink2' },
  dp_sink2: { speaker: 'narrator' as const, text: 'She doesn\'t look like someone who finds it tidy.', next: 'dp_sink3' },
  dp_sink3: { text: 'Here. Harrowgate pays its finders, she says. You tell Tamar. I\'m not doing it.', effect: (g: GameApi) => { g.setFlag('parishEnd', 'sink'); g.addMarks(150); g.setStage(LOADS, 'done'); } },
  dp_after: {
    text: (g: GameApi) => {
      const e = end(g);
      if (e === 'rise') return 'New channel\'s buoyed west of Holmsey. Three skippers have told me what they think of it. Two of them were right.';
      if (e === 'hold') return 'The lighters go out with stone on every neap tide. The quarry\'s sending me a bill shaped like a gravestone.';
      return 'Harrowgate\'s dredger is on the Gulf. The lane\'s as deep as it ever was. I don\'t go down to look.';
    },
  },
};

const tamarNodes: Record<string, DialogueTree['nodes'][string]> = {
  t_main: {
    text: (g: GameApi) => {
      const e = end(g);
      if (at(g, BELL) === 'done') return e === 'hold' ? 'Low water\'s at four. It rings every time now. I\'ve stopped jumping.' : 'Low water\'s at four. Come and listen if you like.';
      return 'Mind the third plank. It\'s more of a suggestion.';
    },
  },
  // XIII
  t1: { text: 'Nessa sent you? She could have come herself. It\'s only water.', next: 't2' },
  t2: { text: 'I\'ve dived Holmsey for twelve years. The Bell inn\'s cash chest, the reeve\'s strongbox, the lead off the church roof.', next: 't3' },
  t3: { text: 'When I started, the lane at the cross was four fathoms. Now it\'s three and a half. It isn\'t silt. I\'ve measured.', next: 't4' },
  t4: { text: 'The bell came down off its beam before my mother\'s time and fetched up on the ringing-chamber floor. That floor\'s under these planks.', next: 't5' },
  t5: {
    text: 'At low water now its crown is out, and the swell knocks it on the wall. Pull the rope. You\'ll see.',
    effect: (g: GameApi) => g.setStage(LOW, 'bell'),
  },
  tBellWait: { text: 'The rope\'s there, by the hatch. Pull it.' },
  // XIV
  r1: { text: 'There. You heard it. A parish doesn\'t come up by itself. Something put it down and something\'s letting go.', next: 'r2' },
  r2: { text: 'If anybody wrote down why it went under, it was the clerk. The parish chest is in the nave, past the far arches.', next: 'r3' },
  r3: { text: 'There\'s a conger in there the size of a coffin. We call him the Sexton. He doesn\'t like visitors.', effect: (g: GameApi) => g.setFlag('parishTold', true) },
  rWait: { text: 'The parish chest\'s at the far end of the nave. Take a breath before the arches, not after.' },
  rBack: { text: 'You found it. Give it here. Gently: the boards are the only thing holding it together.', next: 'rBack2' },
  rBack2: { speaker: 'narrator', text: 'She turns the pages with the back of her knife, reading fast, lips moving. At the last page she stops.', next: 'rBack3' },
  rBack3: { text: 'The white. They dug the white out of the marsh pits for the Glass Kirk. Thirty-eight loads, and the parish went down after it.', next: 'rBack4' },
  rBack4: { text: 'Go and ask the Kirk where its floor came from. I\'d go, but I\'d say something.', effect: (g: GameApi) => g.setStage(REG, 'done') },
  // XV
  lWait: { text: 'Have you been to the Kirk? Ask the keeper about the white.' },
  lBack: { text: 'So it\'s true. The pilgrims put their hands on Holmsey and call it holy.', next: 'lBack2' },
  lBack2: { text: 'I want it left alone to come up. I\'ll be dead before the lane\'s dry. I still want it.', next: 'lBack3' },
  lBack3: { text: 'But it\'s Nessa\'s water, not mine. Go and tell her what the Kirk\'s book says, and what I said.', effect: (g: GameApi) => g.setStage(LOADS, 'nessa') },
  lNessa: { text: 'Nessa decides what happens in her water. Go and tell her what you think. I know what I think.' },
  // XVI
  e1: {
    text: (g: GameApi) => {
      const e = end(g);
      if (e === 'rise') return 'A new channel. West of us. Nessa did that?';
      if (e === 'hold') return 'Stone on the lane. So it stays where it is: drowned, and ringing.';
      return 'Harrowgate. Well. Nessa didn\'t come and tell me herself, so I knew it was that.';
    },
    next: 'e2',
  },
  e2: {
    text: (g: GameApi) => {
      const e = end(g);
      if (e === 'rise') return 'An inch a month. My grandchildren might walk the lane. They\'ll complain about the mud.';
      if (e === 'hold') return 'Better than dug. Worse than let be. I\'ll take it. I can still dive it, at least.';
      return 'They\'ll have the white out by spring and it\'ll go back down. I\'d rather it had stayed lost than this.';
    },
    next: 'e3',
  },
  e3: { text: 'Will you ring it once more? I\'ll read the last names out. The clerk wrote them for someone to read.', effect: (g: GameApi) => g.setStage(BELL, 'ring') },
  eRing: { text: 'Pull the rope. I\'ll read.' },
  eDone: { text: 'The clerk was Ralph Sweet. Mary was his daughter. She was my mother\'s grandmother.', next: 'eDone2' },
  eDone2: { speaker: 'narrator', text: 'She cuts a length off the bell rope with her knife, coils it, and puts it in your hands.', next: 'eDone3' },
  eDone3: {
    text: (g: GameApi) => (end(g) === 'sink' ? 'Keep that. There won\'t be a rope here to cut next year.' : 'Keep that. I\'ll splice a new end on. I\'ve the time.'),
    effect: (g: GameApi) => { g.give('holmsey_rope'); g.setStage(BELL, 'done'); },
  },
};

const tamar: DialogueTree = {
  start: (g) => {
    if (at(g, LOW) === 'tamar') return 't1';
    if (at(g, LOW) === 'bell') return 'tBellWait';
    if (at(g, REG) === 'dive') return g.has('holmsey_register') ? 'rBack' : g.flag('parishTold') ? 'rWait' : 'r1';
    if (at(g, REG) === 'tamar') return 'rBack';
    if (at(g, LOADS) === 'sela') return 'lWait';
    if (at(g, LOADS) === 'tamar') return 'lBack';
    if (at(g, LOADS) === 'nessa') return 'lNessa';
    if (at(g, BELL) === 'tamar') return 'e1';
    if (at(g, BELL) === 'ring') return g.flag('parishRung') ? 'eDone' : 'eRing';
    return 't_main';
  },
  nodes: tamarNodes,
};

// ================================================================ XV. Sela, and Hilda at Gullmouth

const selaNodes = {
  dp_s1: { text: 'Holmsey? The drowned parish down the coast. Pilgrims stop at the cliffs to look at the tower on their way here.', next: 'dp_s2' },
  dp_s2: { text: 'The white. You mean the floor. The floor came from the Fennick estate, in my great-grandfather\'s day. The building book says so.', next: 'dp_s3' },
  dp_s3: { text: 'It\'s on the desk. Read it yourself. I\'d rather not read it aloud.', effect: (g: GameApi) => g.setStage(LOADS, 'book') },
  dp_sBook: { text: 'The book\'s on the desk beside me.' },
  dp_sRead: { text: 'Candlemas. The floor was blessed at Candlemas. I\'ve stood on it every morning for thirty years.', next: 'dp_sRead2' },
  dp_sRead2: { speaker: 'narrator' as const, text: 'She looks down at the crystal under her feet, and doesn\'t move them.', next: 'dp_sRead3' },
  dp_sRead3: { text: 'It doesn\'t come up again. Not for anyone. But you can tell her the Kirk knows now, and that I\'ll put Holmsey in the book of names.', effect: (g: GameApi) => g.setStage(LOADS, 'tamar') },
  dp_sAfter: { text: 'I\'ve written Holmsey at the front of the book of names. The pilgrims ask who they were. I tell them.' },
};

const hildaGull: DialogueTree = {
  start: (g) => (at(g, LOADS) === 'nessa' ? 'h1' : 'hDone'),
  nodes: {
    h1: { text: 'There\'s a body of white coming up under the Gulf, and every month it comes up it gets cheaper to reach. That\'s simply true.', next: 'h2' },
    h2: { text: 'Harrowgate will dredge it while it\'s shallow, pay the Charter a fifth, and keep Mrs Crane\'s lane as deep as she likes.', next: 'h3' },
    h3: { speaker: 'narrator', text: 'She says "Mrs Crane" the way other people say "the weather".', next: 'h4' },
    h4: { text: 'Mrs Crane will decide. I\'d be grateful for a word in her ear. Harrowgate pays its finders.' },
    hDone: {
      text: (g: GameApi) => (end(g) === 'sink' ? 'The dredger goes out on firstday. Mrs Crane gave you your share, I hope. You\'ll find it\'s correct.' : 'Mrs Crane has made her decision. I\'ve made a note of it.'),
    },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [LOW]: {
    id: LOW, name: 'Low Water', story: { chapter: 22, title: 'Low Water', act: ACT }, next: [REG, 'dive'],
    notes: (_g: GameApi, s: string) => {
      if (s === 'nessa') return 'Nessa Crane, Gullmouth\'s harbourmaster, wants a word.';
      if (s === 'tamar') return 'Tamar Sweet wrote to Nessa that the drowned Holmsey bell has rung three times this month. Every boat to the Raddle smelter passes over Holmsey. Tamar is living in the old bell-tower off the Gulf Cliffs.';
      if (s === 'bell') return 'Tamar has dived Holmsey for twelve years: the lane is half a fathom shallower than when she started. The bell lies on the drowned ringing-chamber floor under her planks. She wants me to pull its rope.';
      return 'The bell rang. Holmsey is coming up.';
    },
    objectives: (_g: GameApi, s: string) => {
      if (s === 'nessa') return [{ text: 'Talk to Nessa Crane at Gullmouth', marker: 'nessa' }];
      if (s === 'tamar') return [{ text: 'Find Tamar Sweet in the drowned bell-tower off the Gulf Cliffs', marker: 'tamar' }];
      if (s === 'bell') return [{ text: 'Pull the bell rope', marker: 'holmseyBell' }];
      return [];
    },
    marks: (g: GameApi, s: string | undefined): Marks => {
      if (!s) return actThreeReady(g) ? { nessa: '!' } : {};
      return s === 'nessa' ? { nessa: '?' } : s === 'tamar' ? { tamar: '?' } : {};
    },
    walk: { from: { quests: { storyLastMark: 'done', [LOW]: 'nessa' } } },
  },
  [REG]: {
    id: REG, name: 'The Register', story: { chapter: 23, title: 'The Register', act: ACT }, next: [LOADS, 'sela'],
    notes: (g: GameApi, s: string) => {
      if (s === 'dive') return g.has('holmsey_register') ? 'I have Holmsey\'s parish register. Tamar will want to read it.' : 'Tamar thinks the parish clerk will have written down why Holmsey went under. The parish chest is at the far end of the drowned nave, past a conger the size of a coffin.';
      if (s === 'tamar') return 'I have Holmsey\'s parish register. Tamar will want to read it.';
      return 'The estate let the Glass Kirk\'s builders dig the white out of Holmsey\'s marsh for the Kirk\'s floor: thirty-eight loads. The parish went down after it.';
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'dive' && !g.has('holmsey_register')) return [{ text: 'Find the parish register in Holmsey\'s nave', marker: 'holmseyRegister' }];
      if (s === 'dive' || s === 'tamar') return [{ text: 'Bring the register to Tamar Sweet', marker: 'tamar' }];
      return [];
    },
    advance: (g: GameApi, s: string) => (s === 'dive' && g.has('holmsey_register') ? 'tamar' : null),
    marks: (g: GameApi, s: string | undefined): Marks => (s === 'tamar' || (s === 'dive' && (g.has('holmsey_register') || !g.flag('parishTold'))) ? { tamar: '?' } : {}),
    walk: { from: { quests: { storyLastMark: 'done', [LOW]: 'done', [REG]: 'dive' } } },
  },
  [LOADS]: {
    id: LOADS, name: 'A Mark the Load', story: { chapter: 24, title: 'A Mark the Load', act: ACT }, next: [BELL, 'tamar'],
    notes: (g: GameApi, s: string) => {
      if (s === 'sela') return 'Sela Orme keeps the Glass Kirk. Tamar wants the Kirk asked where its floor came from.';
      if (s === 'book') return 'Sela Orme says the Kirk\'s floor came from the Fennick estate. The building book is on her desk.';
      if (s === 'read') return 'The Kirk\'s floor is Holmsey\'s white: thirty-eight loads at a mark the load, blessed at Candlemas. Sela Orme is standing on it.';
      if (s === 'tamar') return 'The Kirk\'s floor is Holmsey\'s white: thirty-eight loads at a mark the load, blessed at Candlemas, the same Candlemas the clerk baptised a child in the tower because the nave was under. Sela will put Holmsey in the book of names. Tamar should hear it.';
      if (s === 'nessa') return 'Tamar wants Holmsey left to come up. Hilda Harrowgate is at Gullmouth and wants to dredge the white while it\'s shallow. Nessa Crane decides what happens in her water, and wants to hear from me.';
      const e = end(g);
      if (e === 'rise') return 'Nessa will buoy a new channel west of Holmsey and let it come up, an inch a month.';
      if (e === 'hold') return 'Gullmouth\'s barges will lay stone along Holmsey\'s lane until it stops rising. The bell will ring at low water.';
      return 'Harrowgate will dredge Holmsey\'s white and pay the Charter a fifth. The parish will go back under.';
    },
    objectives: (_g: GameApi, s: string) => {
      if (s === 'sela') return [{ text: 'Ask Sela Orme at the Glass Kirk about the white', marker: 'sela' }];
      if (s === 'book') return [{ text: 'Read the Kirk\'s building book', marker: 'kirkBook' }];
      if (s === 'read') return [{ text: 'Talk to Sela Orme', marker: 'sela' }];
      if (s === 'tamar') return [{ text: 'Tell Tamar Sweet what the book says', marker: 'tamar' }];
      if (s === 'nessa') return [{ text: 'Tell Nessa Crane at Gullmouth what to do about Holmsey', marker: 'nessa' }];
      return [];
    },
    marks: (_g: GameApi, s: string | undefined): Marks => (s === 'sela' || s === 'read' ? { sela: '?' } : s === 'tamar' ? { tamar: '?' } : s === 'nessa' ? { nessa: '?' } : {}),
    walk: { from: { quests: { storyLastMark: 'done', [LOW]: 'done', [REG]: 'done', [LOADS]: 'sela' }, items: [['holmsey_register', 1]] }, cast: ['hildaGull'] },
  },
  [BELL]: {
    id: BELL, name: 'The Last Names', story: { chapter: 25, title: 'The Last Names', act: ACT }, next: ['storyCamp3', 'tower'],
    notes: (g: GameApi, s: string) => {
      if (s === 'tamar') return 'Nessa has decided. Tamar Sweet should hear it from me.';
      if (s === 'ring') return 'Tamar will read the register\'s last names while I ring the bell.';
      const e = end(g);
      const how = e === 'rise' ? 'Holmsey is left to come up, an inch a month.' : e === 'hold' ? 'Holmsey is held where it is, and the bell rings at low water.' : 'Harrowgate is dredging the white, and Holmsey will go back under.';
      return `${how} The clerk, Ralph Sweet, was Tamar's great-great-grandfather. She gave me a length of the bell rope.`;
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'tamar') return [{ text: 'Tell Tamar Sweet what Nessa decided', marker: 'tamar' }];
      if (s === 'ring') return g.flag('parishRung') ? [{ text: 'Talk to Tamar', marker: 'tamar' }] : [{ text: 'Ring the bell while Tamar reads', marker: 'holmseyBell' }];
      return [];
    },
    marks: (g: GameApi, s: string | undefined): Marks => (s === 'tamar' || (s === 'ring' && g.flag('parishRung')) ? { tamar: '?' } : {}),
    walk: { from: { quests: { storyLastMark: 'done', [LOW]: 'done', [REG]: 'done', [LOADS]: 'done', [BELL]: 'tamar' }, flags: { parishEnd: 'hold' }, items: [['holmsey_register', 1]] } },
  },
};

// ================================================================ The content

export const HOLMSEY: RegionContent = {
  id: 'holmsey',
  items: [
    { id: 'holmsey_register', name: 'Holmsey parish register', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#6a5a3a' }, desc: 'Oak boards and a hundred years of salt. The pages stuck together everywhere except the last few, which someone kept dry.' },
    { id: 'holmsey_rope', name: 'A length of the Holmsey bell rope', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'pick', a: '#c8b080', b: '#6a5a3a' }, desc: 'Tarred hemp, cut from the rope of a bell that rang under the sea. Tamar Sweet whipped the end so it wouldn\'t fray.' },
  ],
  npcs: [
    {
      id: 'tamar', name: 'Tamar Sweet', title: 'Salvage diver',
      look: { skin: '#c8956a', hair: '#2a1a12', hairStyle: 4, eyes: '#4a5a5a', tunic: '#3a4a52', trim: '#c8b080', trousers: '#2a3036', boots: '#1e1a16', top: 6, gloves: '#2a2622', freckles: true, scar: true, lashes: true, frame: 'f', build: 1.0, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [TOWER.x, TOWER.z], face: [TOWER.x - 4, TOWER.z], anim: 'idle' }],
      barks: ['Third plank.', 'Low water\'s at four.'],
      when: (g) => !!at(g, LOW) && at(g, LOW) !== 'nessa' && !(end(g) === 'sink' && at(g, BELL) === 'done'),
    },
    {
      id: 'hildaGull', name: 'Hilda Harrowgate', title: 'Partner, Harrowgate & Daughters',
      look: { skin: '#c89272', hair: '#4a2a18', hairStyle: 1, eyes: '#3a4a3a', tunic: '#4a4a52', trim: '#e0b860', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', lashes: true, build: 0.95, height: 1.03, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [NESSA.x + 3, NESSA.z - 2.5], face: [NESSA.x, NESSA.z], anim: 'idle' }],
      when: (g) => at(g, LOADS) === 'nessa' || (at(g, LOADS) === 'done' && !at(g, BELL)) || (end(g) === 'sink' && at(g, BELL) === 'tamar'),
    },
  ],
  dialogue: { tamar, hildaGull },
  quests,
  readables: {
    holmseyBell: {
      title: 'The bell rope',
      body: (g) => {
        if (at(g, BELL) === 'ring') return 'You pull. Under the planks the bell rolls on the old floor and speaks, flat and wet, and the tower takes it up.\n\nTamar reads from the register between strokes, without hurrying: "Ann Vosper, buried in the high corner. Mary, daughter of Ralph and Jane Sweet, baptised in the tower, the nave being under."\n\nShe closes the book.';
        if (at(g, BELL) === 'done' && end(g) === 'sink') return 'The rope is tied off to a nail. Tamar has taken her things. Under the planks the water slaps the bell, and it doesn\'t answer.';
        return 'You pull. Somewhere under your feet the bell rolls on the drowned floor and rings: a flat, wet note that the tower picks up and carries out over the water.\n\nIt rings again on its own when the swell comes in.';
      },
      effect: (g) => {
        if (at(g, LOW) === 'bell') g.setStage(LOW, 'done');
        if (at(g, BELL) === 'ring') g.setFlag('parishRung', true);
      },
    },
    holmseyRegister: {
      title: 'Holmsey parish register',
      body: 'Kept by R. Sweet, clerk. The last pages are dry: someone wrapped them in oilcloth.\n\nMichaelmas. The estate\'s agent has let the Kirk builders into the marsh pits for the white. A mark the load to the estate.\n\nMartinmas. Thirty-eight loads gone up the Kirk road. The lane at the cross is down a foot. The agent says it\'s the frost.\n\nSt Thomas. Water in the churchyard at the spring tide. Buried Ann Vosper in the high corner.\n\nTwelfth Night. The dyke went by the Bell. Nine houses out. The agent hasn\'t come.\n\nCandlemas. Baptised: Mary, daughter of Ralph and Jane Sweet, in the tower, the nave being under.\n\nLady Day. Rang the bell from the tower for the last time. We go up the cliff tomorrow. R. Sweet.',
      effect: (g) => { if (at(g, REG) === 'dive' && !g.has('holmsey_register')) g.give('holmsey_register'); },
    },
    kirkBook: {
      title: 'The Glass Kirk: building book',
      body: 'THE NEW FLOOR. Accounts.\n\nOf the Fennick estate, by its agent: the white from the Holmsey pits, thirty-eight loads at a mark the load. 38 marks.\n\nCarting, the Kirk road: 20 marks.\n\nLaying and polishing: 12 marks.\n\nThe floor blessed at Candlemas, and the first pilgrims admitted.',
      effect: (g) => { if (at(g, LOADS) === 'book') g.setStage(LOADS, 'read'); },
    },
  },
  things: [
    { id: 'holmseyBell', x: TOWER.x + 1.5, z: TOWER.z + 1.5, y: TOWER.y, label: 'Pull the bell rope', radius: 2.4, read: 'holmseyBell', when: (g) => !!at(g, LOW) && at(g, LOW) !== 'nessa' && at(g, LOW) !== 'tamar' },
    { id: 'holmseyRegister', x: VESTRY.x, z: VESTRY.z, y: VESTRY.y, label: 'Open the parish chest\'s inner box', radius: 2.4, read: 'holmseyRegister', when: (g) => at(g, REG) === 'dive' && !g.has('holmsey_register') },
    { id: 'kirkBook', x: KIRK_BOOK.x, z: KIRK_BOOK.z, label: 'Read the Kirk\'s building book', radius: 2.4, read: 'kirkBook', when: (g) => at(g, LOADS) === 'book' },
  ],
  hooks: (D) => {
    // XIII and XV: Nessa
    hook(D, 'nessa', (g) => {
      if (actThreeReady(g) && (!at(g, LOW) || at(g, LOW) === 'nessa')) return 'dp_n1';
      if (at(g, LOW) === 'tamar') return 'dp_nWait';
      if (at(g, LOADS) === 'nessa') return 'dp_d1';
      if (end(g) && at(g, BELL) === 'done') return 'dp_after';
      return undefined;
    }, nessaNodes);
    // XV: Sela and the building book
    hook(D, 'sela', (g) => (at(g, LOADS) === 'sela' ? 'dp_s1' : at(g, LOADS) === 'book' ? 'dp_sBook' : at(g, LOADS) === 'read' ? 'dp_sRead' : at(g, LOADS) && at(g, LOADS) !== 'sela' && at(g, BELL) === 'done' ? 'dp_sAfter' : undefined), selaNodes);
  },
};
