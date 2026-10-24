import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import { cellOf, CELLHOUSE, LANDING, SHED, TOP, WARDEN, YARD } from '../skua';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';

// Skua Rock's people (the place: data/skua.ts; the routine and the way off: game/Rock.ts). By day the
// convicts are in the yard and at work; from lights-out, in their cells either side of yours.
//
// Amos Kitto, eleven years on the Rock, has the way off worked out and is too old to take it: he tells
// you (flag rockPlan). Mags Tregear, a forger, will write you a warden's release for marks (flag
// rockPapers, which game/Rock.ts honours). Saul Brack was a Brethren captain and wants you to know it.
//
// rockLetter, A LETTER FOR GULLMOUTH (Dory Penhale): the boy who came out on the Tern with you asks you
// to carry a letter to his mother, Jenna, at the fish quay, when you get off the Rock. 'carry' -> done.

const LETTER = 'rockLetter';
const jailed = (g: GameApi) => { const j = g.flag('jail') as { rock?: boolean; escaped?: boolean } | null; return !!j?.rock && !j.escaped; };
const inCell = (c: ReturnType<typeof cellOf>): [number, number] => [c.x + 1.5, (c.z0 + c.z1) / 2 + 0.6];
/** Out by day; at night in a cell (its floor given: looking down from the sky would find the cellhouse roof). */
const day = (from: [number, number], face: [number, number], night: [number, number], nightFace: [number, number], y: number) => [
  { from: 6, to: 21, at: from, face, anim: 'idle' as const },
  { from: 21, to: 24, at: night, face: nightFace, anim: 'idle' as const, y },
  { from: 0, to: 6, at: night, face: nightFace, anim: 'idle' as const, y },
];
const look = (o: Partial<NpcDef['look']>) => o as NpcDef['look'];
const grey = { tunic: '#5a5650', trim: '#3a3632', trousers: '#4a4640', boots: '#2a2420' };
const blue = { tunic: '#2a3a5a', trim: '#c8b070', trousers: '#2a2a30', boots: '#1a1410', hat: 'coif' as const, hatColor: '#9aa0a6' };

const amosCell = cellOf('s', 0, 7), doryCell = cellOf('s', 0, 4), saulCell = cellOf('n', 0, 3), magsCell = cellOf('s', 1, 2);
/** Jenna Penhale on Gullmouth's fish quay, by the Charter Post. */
const JENNA: [number, number] = [1738.5, 600.5];

const items: ItemDef[] = [
  { id: 'oilskin', name: 'Oilskin coat', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'bag', a: '#c8a040', b: '#7a5a20' }, desc: 'A work-detail coat of oiled canvas, stiff and stinking of fish oil. Sewn and tarred over driftwood, four of them would float a man. Amos says.' },
  { id: 'dorys_letter', name: 'Dory\'s letter', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0cc', b: '#5a4a3a' }, desc: 'A page folded small, the writing big and careful. On the outside: "Mam. Jenna Penhale. The fish quay. Gullmouth."' },
];

const npcs: NpcDef[] = [
  {
    id: 'amos_kitto', name: 'Amos Kitto', title: 'Eleven years on the Rock',
    look: look({ ...grey, skin: '#d8a888', hair: '#e8e4dc', hairStyle: 1, eyes: '#5a6a7a', beard: true, build: 0.9, age: 0.95 }),
    schedule: day([YARD.x0 + 3.5, YARD.z0 + 6.5], [YARD.x0 + 10, YARD.z0 + 6.5], inCell(amosCell), [amosCell.x + 1, amosCell.doorZ + 3], amosCell.y),
    barks: ['Wind\'s backing south. You can smell the town.', 'Eleven years. You learn the sound of every pipe.'],
  },
  {
    id: 'dory_penhale', name: 'Dory Penhale', title: 'Came out on the Tern',
    look: look({ ...grey, skin: '#f0cfb0', hair: '#c8a060', hairStyle: 0, eyes: '#4a6a7a', build: 0.85, age: 0.1 }),
    schedule: day([YARD.x0 + 14.5, YARD.z0 + 9.5], [YARD.x0 + 14.5, YARD.z0 + 3], inCell(doryCell), [doryCell.x + 1, doryCell.doorZ + 3], doryCell.y),
    barks: ['My brother did six years here. Six.', 'Do you think they let you write letters?'],
  },
  {
    id: 'saul_brack', name: 'Saul Brack', title: 'Was a Brethren captain',
    look: look({ ...grey, skin: '#c89070', hair: '#2a1e18', hairStyle: 3, eyes: '#3a2a1e', beard: true, scar: true, build: 1.25, age: 0.55 }),
    schedule: day([YARD.x1 - 6.5, YARD.z0 + 12.5], [YARD.x1 - 12, YARD.z0 + 12.5], inCell(saulCell), [saulCell.x + 1, saulCell.doorZ - 3], saulCell.y),
    barks: ['Look at the water. I had a ship on that water.', 'Ned Vey owes me a ship. Tell him I said so.'],
  },
  {
    id: 'mags_tregear', name: 'Mags Tregear', title: 'Forger',
    look: look({ ...grey, skin: '#e0b090', hair: '#6a3a2a', hairStyle: 2, eyes: '#4a3a2a', lashes: true, build: 0.95, age: 0.45 }),
    schedule: day([SHED.x0 + 6.5, SHED.z0 + SHED.d + 2.6], [SHED.x0 + 6.5, SHED.z0 + SHED.d + 6], inCell(magsCell), [magsCell.x + 1, magsCell.doorZ + 3], magsCell.y),
    barks: ['Steady hands. That\'s all it ever was.', 'The warden signs like a hen walking.'],
  },
  {
    id: 'ruth_ashdown', name: 'Ruth Ashdown', title: 'Warden of Skua Rock',
    look: look({ ...blue, hat: undefined, cape: '#2a3a5a', skin: '#d8a882', hair: '#4a4a48', hairStyle: 3, eyes: '#3a4a5a', lashes: true, build: 1.0, age: 0.6 }),
    schedule: [
      { from: 7, to: 19, at: [CELLHOUSE.x0 - 3.5, 466.5], face: [CELLHOUSE.x0 - 8, 466.5], anim: 'idle' },
      { from: 19, to: 24, at: [WARDEN.x0 + 4.5, WARDEN.z0 + 3.5], face: [WARDEN.x0 + 4.5, WARDEN.z0 + 1], anim: 'idle', indoors: true },
      { from: 0, to: 7, at: [WARDEN.x0 + 4.5, WARDEN.z0 + 3.5], face: [WARDEN.x0 + 4.5, WARDEN.z0 + 1], anim: 'idle', indoors: true },
    ],
    barks: ['Nobody leaves early. Not by my hand, and not by the sea\'s.', 'Count them in, count them out.'],
  },
  {
    id: 'nance_pollard', name: 'Nance Pollard', title: 'Sergeant of the landing',
    look: look({ ...blue, cape: '#2a3a5a', skin: '#c89070', hair: '#1a1410', hairStyle: 2, eyes: '#3a2a1e', lashes: true, build: 1.15, age: 0.45 }),
    schedule: [{ from: 0, to: 24, at: [LANDING.x0 + 6.5, LANDING.quayZ + 4.5], face: [LANDING.x0, LANDING.quayZ + 4.5], anim: 'idle' }],
    barks: ['No landing without leave.', 'Supply boat\'s the only boat that comes back.'],
  },
  {
    id: 'will_yelland', name: 'Will Yelland', title: 'Guard, the cellhouse',
    look: look({ ...blue, skin: '#e0b8a0', hair: '#8a5a3a', hairStyle: 0, eyes: '#4a6a7a', facial: 1, build: 1.0, age: 0.25 }),
    schedule: [{ from: 0, to: 24, at: [CELLHOUSE.x1 - 4.5, 474.6], face: [CELLHOUSE.x1 - 10, 472], anim: 'idle', y: TOP }],
    barks: ['Walk on the left of the line.', 'Lights out at nine. I don\'t say it twice.'],
  },
  {
    id: 'jenna_penhale', name: 'Jenna Penhale', title: 'Fishwife',
    look: look({ skin: '#e0b090', hair: '#8a7a6a', hairStyle: 2, eyes: '#4a6a7a', tunic: '#3a5a6a', trim: '#e8dcc0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.05, age: 0.6 }),
    schedule: [{ from: 6, to: 20, at: JENNA, face: [JENNA[0] + 3, JENNA[1]], anim: 'idle' }, { from: 20, to: 24, at: JENNA, face: [JENNA[0] + 3, JENNA[1]], anim: 'idle' }, { from: 0, to: 6, at: JENNA, face: [JENNA[0] + 3, JENNA[1]], anim: 'idle' }],
    barks: ['Mackerel, fresh off the boat!', 'You\'ve been out to the Rock. I can see it on you.'],
  },
];

const amos: DialogueTree = {
  start: (g) => (jailed(g) ? (g.flag('rockPlan') ? 'again' : 'in') : 'visitor'),
  nodes: {
    visitor: {
      text: (g) => (Number(g.flag('rockEscapes') ?? 0) > 0 ? 'You. You went off the Rock and lived, and you\'ve come back to look at it. That\'s either brave or stupid. Sit down, I\'ll tell you which.' : 'A visitor. Don\'t stand so close to the bars, the tower thinks you\'re passing me something. Eleven years, I\'ve been here. You learn the sound of every pipe in the place.'),
      options: [{ text: 'What did you do?', next: 'crime' }, { text: 'Kitto. Like Nell Kitto, under the Ropewalk?', next: 'nell' }, { text: 'Good day, Amos.' }],
    },
    crime: {
      text: 'Took the Charter\'s pay chest off the Ansbury road, with three others. The others are dead. I spent the money on a boat that sank. Some men are lucky. I wanted to see what it was like.',
      options: [{ text: 'Good day, Amos.' }],
    },
    nell: {
      text: 'My daughter. She takes names out of the towns\' books for money, down that hole by the Charter Post. Every name but mine: the Rock\'s book is the Charter\'s own, and she can\'t get at it. She sends a letter twice a year. I don\'t write back. It\'s better for her trade.',
      options: [{ text: 'I\'m sorry, Amos.' }],
    },
    in: {
      text: 'B 14. You\'re next door to me, then. You\'ve the look of someone who doesn\'t mean to stay, and I\'ve the look of someone who has nothing to do but talk. Sit.',
      options: [{ text: 'You sound like a man with a plan.', next: 'plan1' }, { text: 'Kitto. Like Nell Kitto, under the Ropewalk?', next: 'nell' }, { text: 'Later, Amos.' }],
    },
    plan1: {
      text: 'Eleven years of one. The grille at the back of your cell is set in mortar that\'s been wet since the Charter was young. Scrape it with a spoon handle sharpened on the floor, a little at a time, push your bunk over the dust. Behind it is the utility corridor. At its east end, a ladder to the roof.',
      next: 'plan2',
    },
    plan2: {
      text: 'From the roof, the drainpipe at the north-east corner, down over the wall where the tower can\'t see, then the gully to the rocks. And then the sea, which is the part that kills men. You\'ll want a float: four oilskins off the lines behind the work shed, one at a time, sewn and tarred over the driftwood at the bottom of the gully.',
      next: 'plan3',
    },
    plan3: {
      text: 'I\'m too old to go, and the ones I told before you went the other way: they told the warden, or they lost their nerve on the roof. Somebody should go. The town\'s right there. You can see every lamp in it.',
      options: [{ text: 'I\'ll go.', effect: (g) => g.setFlag('rockPlan', true) }, { text: 'I\'ll think about it.', effect: (g) => g.setFlag('rockPlan', true) }],
    },
    again: {
      text: (g) => (g.count('oilskin') >= 4 ? 'Four oilskins. Then it\'s the grille, and then it\'s the dark, and then it\'s you and the sea. Don\'t look back from the float. It slows you.' : `The grille, a little at a time. The oilskins, one at a time: ${g.count('oilskin')} of four. Patience is the whole trick. I had eleven years of it.`),
      options: [{ text: 'Tell me the way again.', next: 'plan1' }, { text: 'Later, Amos.' }],
    },
  },
};

const dory: DialogueTree = {
  start: (g) => (jailed(g) && !at(g, LETTER) ? 'in' : at(g, LETTER) === 'carry' ? 'wait' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (at(g, LETTER) === 'done' ? 'You gave it her? What did she say? No, don\'t tell me. Yes, tell me.' : 'Dory Penhale. I was on the boat with you. Or someone like you, they all look the same in irons.'),
      options: [{ text: 'Keep your head down, Dory.' }],
    },
    in: {
      text: 'They let you write letters. Did you know that? One a month. I wrote mine, and then I thought, the warden reads them, and I don\'t want the warden reading what I put to my mam. You\'ll get off before me. Would you carry it? Jenna Penhale, on the fish quay at Gullmouth. You can\'t miss her. She\'s the loud one.',
      options: [
        { text: 'I\'ll carry it.', effect: (g) => { g.give('dorys_letter'); g.setStage(LETTER, 'carry'); } },
        { text: 'Not my business.' },
      ],
    },
    wait: { text: 'Jenna Penhale. The fish quay. She\'ll give you a fish for it, she gives everyone a fish.', options: [{ text: 'I\'ll find her.' }] },
  },
};

const jenna: DialogueTree = {
  start: (g) => (at(g, LETTER) === 'carry' && g.count('dorys_letter') > 0 ? 'letter' : 'hello'),
  nodes: {
    hello: {
      text: 'Mackerel, herring, a bit of skate if you\'re brave. Jenna Penhale. Everyone on the quay knows me, and the ones that don\'t can hear me.',
      options: [{ text: 'Good day, Jenna.' }],
    },
    letter: {
      text: 'From the Rock? That\'s his hand. That\'s Dory\'s hand, he never could keep a line straight. He says the food\'s all right. He\'s lying, he always says the food\'s all right. He says there\'s an old man next door who tells him stories. How does he look? Don\'t answer that.',
      options: [{ text: 'He looks like he misses you.', effect: (g) => { g.take('dorys_letter'); g.give('cooked_mackerel', 3); g.addMarks(60); g.setStage(LETTER, 'done'); } }],
    },
  },
};

const saul: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (jailed(g) ? 'Brack. Captain Brack, of the Gannet, when there was a Gannet. Keep off my bench in the yard and we\'ll get on.' : 'Come to look at the animals? Look at the water instead. I had a ship on that water. The Gannet, eighteen guns. The Brethren gave her to Ned Vey when I was taken. Ned Vey owes me a ship.'),
      options: [{ text: 'How were you taken?', next: 'taken' }, { text: 'Good day, captain.' }],
    },
    taken: {
      text: 'A revenue cutter off the Teeth, in fog. Somebody told them where we\'d be, and that somebody had my ship within the week. I\'ve had eight years to work out who. I don\'t need eight more.',
      options: [{ text: 'Good day, captain.' }],
    },
  },
};

/** What Mags charges for a release in the warden's hand: two marks a second of your time, never less than two hundred. */
const paperPrice = (g: GameApi) => { const j = g.flag('jail') as { until?: number } | null; return Math.max(200, Math.round(Math.max(0, ((j?.until ?? 0) - Date.now()) / 1000) * 2)); };
const mags: DialogueTree = {
  start: (g) => (jailed(g) ? 'in' : 'visitor'),
  nodes: {
    visitor: {
      text: 'Mags Tregear. I did the Assembly\'s seal for eleven months before anyone noticed, and they only noticed because I spelled Callis wrong on purpose to see if they would. They didn\'t. Somebody else did.',
      options: [{ text: 'Good day, Mags.' }],
    },
    in: {
      text: (g) => `New fish. You want off the Rock and you don't fancy the sea? The warden signs like a hen walking. A release in her hand, stamped, dated, ${paperPrice(g)} marks. The guard on the landing can't read past the stamp.`,
      options: [
        { text: (g) => `Write it. (${paperPrice(g)} marks)`, next: 'paid', cond: (g) => g.marks >= paperPrice(g) && !g.flag('rockPapers') },
        { text: 'I\'ll serve my time.' },
      ],
    },
    paid: {
      text: 'Hold still while I look at your face, I want to get the description right. There. Show that to Pollard on the landing in the morning and keep your eyes on your feet. Don\'t thank me. Don\'t come back.',
      effect: (g) => { g.addMarks(-paperPrice(g)); g.setFlag('rockPapers', true); },
      options: [{ text: 'I won\'t.' }],
    },
  },
};

const ruth: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (jailed(g) ? 'B 14. Work, sleep, keep your hands where the tower can see them, and you\'ll go home on the Tern. Nobody leaves early. Not by my hand, and not by the sea\'s.' : 'Ruth Ashdown, warden. You\'ve leave to walk the grounds with the supply boat, and to talk to whoever will talk to you through the bars. Don\'t pass them anything. You\'ll be searched at the landing.'),
      options: [{ text: 'Has anyone ever escaped?', next: 'escape' }, { text: 'Good day, warden.' }],
    },
    escape: {
      text: (g) => (Number(g.flag('rockEscapes') ?? 0) > 0 ? 'One. I know your face. I\'ve made my peace with it, which is more than Gullmouth\'s watch has.' : 'Seven have tried. Three the current took, two we fished out, two lost their nerve on the roof and came down to me in the morning. The sea is the wall. I only keep the door.'),
      options: [{ text: 'Good day, warden.' }],
    },
  },
};

const nance: DialogueTree = { start: () => 'hello', nodes: { hello: { text: 'Sergeant Pollard. Supply boat comes and goes from Gullmouth, and so do visitors on it, with the warden\'s leave, which you have if you\'re standing here. Up the Steps, through the sally port. Convicts come up them in irons.', options: [{ text: 'Thank you, sergeant.' }] } } };
const will: DialogueTree = { start: () => 'hello', nodes: { hello: { text: (g) => (jailed(g) ? 'Lights out at nine. Your door\'s barred till six. Walk on the left of the line on Broadway, and don\'t talk to Brack.' : 'Visitors on the right of the line. Don\'t put your hands through the bars, some of them bite.'), options: [{ text: 'Understood.' }] } } };

const quests: Record<string, QuestDef> = {
  [LETTER]: {
    id: LETTER, name: 'A Letter for Gullmouth', region: 'saltwind', depth: 'quest',
    notes: (_g, s) => (s === 'carry' ? 'Dory Penhale, a boy on Skua Rock, doesn\'t want the warden reading his letter to his mother. He asked me to carry it to Jenna Penhale, on the fish quay at Gullmouth, when I get off the Rock.' : 'I gave Jenna Penhale her son\'s letter. She says he always lies about the food.'),
    objectives: (_g, s) => (s === 'carry' ? [{ text: 'Carry Dory\'s letter to Jenna Penhale on Gullmouth\'s fish quay', marker: 'jenna_penhale' }] : []),
    marks: (_g, s): Marks => (s === 'carry' ? { jenna_penhale: '?' } : {}),
    walk: { cast: ['dory_penhale', 'jenna_penhale'], from: { flags: { jail: { gaol: 'gaol-skua', until: 9e15, town: 'gullmouth', bounty: 1500, rock: true } } } },
  },
};

export const SKUA_CONTENT: RegionContent = {
  id: 'skua', items, npcs, quests,
  dialogue: { amos_kitto: amos, dory_penhale: dory, jenna_penhale: jenna, saul_brack: saul, mags_tregear: mags, ruth_ashdown: ruth, nance_pollard: nance, will_yelland: will },
};

