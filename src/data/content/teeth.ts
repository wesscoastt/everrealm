import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { CAREEN, CHAIR, GALLOWS, SMOKE } from '../teeth';

// THE TEETH, off Saltpenny Key (world/morrowLocal.ts TEETH_ISLES, data/teeth.ts, LORE.md "The Teeth"):
// Gallows Key, the Careen, Smoke Key and Ysolde's Chair, where the captains the Table won't sit with lie
// up. Hob Merrick holds Gallows Key and its old Assembly signal fort with the crews the Table cast out
// for taking a Brethren prize.
//
// teethUnpaid, THE UNPAID (Ned Vey): three Brethren ships lost near the Teeth this season. The Table says
//   Merrick. It isn't Merrick taking them: it's the Assembly's revenue cutter, and Merrick's beacon on Smoke
//   Key brings them onto her, lit to her signal. The Assembly is paying him in pardons, one a ship, so his
//   crews (Callis men, every one) can go home. 'gallows' (ask Merrick) -> 'smoke' (the beacon) -> 'merrick'
//   (show him the signal book) -> 'cutter' (her boat lands on Gallows beach; Lieutenant Sabat) -> 'choose'
//   -> 'ned' -> done. Choice teethEnd = 'table' (Merrick goes before the Table; his crews scatter) |
//   'pardon' (the pardons stand; Merrick takes his crews home to Callis, and the Teeth go quiet).
// teethTide, BEFORE THE TIDE (Kester Bligh): the Long Shilling is hauled up on the Careen and the spring
//   tide's in four days. He needs rope from the ropewalk at Gullmouth and timber for wedges.
// teethLights, FALSE LIGHTS (Gert Vosse): she keeps the beacon on Smoke Key and lights it for whoever pays.
//   The Morning Star's figurehead is on the Chair's rocks, her son's name cut in its back. 'figure' ->
//   'gert' -> done. Choice gertLight = 'smashed' (the beacon's glass broken; no more false lights) |
//   'kept' (her trade, and her secret).
// teethRose, THE COMPASS ROSE (Dinah Lowry): Ysolde Gale's rose is cut in the top of the Chair, its four
//   points stones you can press. Gale's log: "North for the sea, west for the dead, south for the wind,
//   east for home." Press them in that order and the middle opens.
// teethClerk, PRIZE CREW (Joan Sabater): an Assembly customs clerk taken off a prize, in the cell on
//   Gallows Key. Nobody in Callis has paid her ransom. 'joan' -> done (pay Merrick, or the signal book
//   buys her out).

const UNPAID = 'teethUnpaid', TIDE = 'teethTide', LIGHTS = 'teethLights', ROSE = 'teethRose', CLERK = 'teethClerk';
const G = GALLOWS;
/** Where the cutter's boat lands, on Gallows Key's south beach. */
const LANDING: [number, number][] = [[G.x - 3.5, G.z + 32.5], [G.x + 1.5, G.z + 33.5], [G.x + 5.5, G.z + 31.5], [G.x - 6.5, G.z + 30.5]];
/** The Morning Star's figurehead, on the rocks at the foot of the Chair. */
const FIGURE: [number, number] = [CHAIR.x + 9.5, CHAIR.z - 2.5];
/** The rose's four points on the Chair's top, in the order they're pressed: N, W, S, E. */
const ROSE_POINTS: { id: string; at: [number, number]; name: string }[] = [
  { id: 'n', at: [CHAIR.x + 0.5, CHAIR.z - 2.5], name: 'north' },
  { id: 'w', at: [CHAIR.x - 2.5, CHAIR.z + 0.5], name: 'west' },
  { id: 's', at: [CHAIR.x + 0.5, CHAIR.z + 3.5], name: 'south' },
  { id: 'e', at: [CHAIR.x + 3.5, CHAIR.z + 0.5], name: 'east' },
];
const pressed = (g: GameApi) => Number(g.flag('teethRosePressed') ?? 0);
const end = (g: GameApi) => g.flag('teethEnd') as 'table' | 'pardon' | undefined;

const items: ItemDef[] = [
  { id: 'signal_book', name: 'The cutter\'s signal book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e2d4', b: '#1a1a20' }, desc: 'Assembly revenue signals, in a cover with the two stones on it. One page is dog-eared: a beacon lit twice, then shuttered, then lit. "BRETHREN IN THE CHANNEL." Found in the keeper\'s hut on Smoke Key.' },
  { id: 'galestar_glass', name: 'Ysolde Gale\'s spyglass', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'whistle', a: '#d8b050', b: '#3a2a1a' }, desc: 'Brass gone green, the compass rose engraved round the eyepiece. Through it, Saltpenny looks a great deal closer than you\'d like.' },
  { id: 'wedge_timber', name: 'Shoring timber', kind: 'material', rarity: 'common', stack: true, value: 4, icon: { shape: 'log', a: '#7a5a34', b: '#4a3420' }, desc: 'Squared oak for wedges and shores.' },
];

const BRETHREN = { skin: '#c89070', eyes: '#3a2a1a', trousers: '#3a3028', boots: '#2a1e14' };
const npcs: NpcDef[] = [
  {
    land: 'morrow', id: 'hob_merrick', name: 'Hob Merrick', title: 'Captain, Gallows Key',
    look: { ...BRETHREN, hair: '#5a3a2a', hairStyle: 0, beard: true, tunic: '#5a1e1a', trim: '#c8a050', cape: '#2a1a14', hat: 'tricorn', hatColor: '#2a1a14', build: 1.2, age: 0.55 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [G.x + 2.5, G.z - 4.5], face: [G.x + 2.5, G.z], anim: 'idle' }],
    barks: ['Walls. Fires. Rum. In that order.', 'The Table cast me out. Nobody told the sea.'],
    when: (g) => end(g) !== 'table',
  },
  {
    land: 'morrow', id: 'kester_bligh', name: 'Kester Bligh', title: 'Shipwright, the Careen',
    look: { ...BRETHREN, hair: '#a8a090', hairStyle: 1, beard: true, tunic: '#4a4a3a', trim: '#8a7a5a', apron: true, build: 1.1, age: 0.75 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [CAREEN.x - 2.5, CAREEN.z - 7.5], face: [CAREEN.x, CAREEN.z + 2], anim: 'hammer' }],
    barks: ['Four days to the spring tide.', 'Hand me that. No, the other that.'],
  },
  {
    land: 'morrow', id: 'gert_vosse', name: 'Gert Vosse', title: 'Keeps the beacon',
    look: { ...BRETHREN, skin: '#d8a888', hair: '#8a847c', hairStyle: 2, tunic: '#3a3a3a', trim: '#6a6a6a', cape: '#2a2a2a', lashes: true, build: 0.95, age: 0.8 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [SMOKE.x - 3.5, SMOKE.z + 2.5], face: [SMOKE.x, SMOKE.z], anim: 'idle' }],
    barks: ['Wood\'s low.', 'Every light\'s a lie to somebody.'],
  },
  {
    land: 'morrow', id: 'joan_sabater', name: 'Joan Sabater', title: 'Assembly customs clerk',
    look: { skin: '#e2b894', eyes: '#3a4a5a', hair: '#1a1410', hairStyle: 2, tunic: '#e8e2d4', trim: '#2a2a30', trousers: '#2a2a30', boots: '#1a1612', lashes: true, build: 0.9, age: 0.3 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [G.x + 11.5, G.z - 11.5], face: [G.x + 11.5, G.z - 9], anim: 'idle' }],
    barks: ['Three months. Nobody in Callis has noticed.'],
    when: (g) => at(g, CLERK) !== 'done',
  },
];

const quests: Record<string, QuestDef> = {
  [UNPAID]: {
    id: UNPAID, name: 'The Unpaid', region: 'keys', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'gallows') return 'Three Brethren ships lost near the Teeth this season. The Captains\' Table says Hob Merrick, who holds Gallows Key with the crews the Table cast out. Ned Vey wants me to ask him.';
      if (s === 'smoke') return 'Merrick swears it isn\'t him. He says to watch Smoke Key on a dark night: someone lights the beacon wrong.';
      if (s === 'merrick') return 'In the keeper\'s hut on Smoke Key: an Assembly revenue signal book, a page turned down. "BRETHREN IN THE CHANNEL." Merrick should see it.';
      if (s === 'cutter') return 'The beacon brings Brethren ships onto the Assembly\'s revenue cutter, and Merrick lights it for her. She pays in pardons, one a ship, for his crews. Tonight her boat lands on Gallows beach. Merrick won\'t fight it. I might.';
      if (s === 'choose') return 'Lieutenant Sabat is dead on the beach and his boat\'s crew with him. Merrick has his pardons, and the Table wants its ships. One of them gets what they want.';
      if (s === 'ned') return end(g) === 'table' ? 'Merrick will go before the Captains\' Table. Ned Vey will want to know.' : 'Merrick keeps his pardons and takes his crews home to Callis. Ned Vey won\'t thank me.';
      return end(g) === 'table' ? 'Hob Merrick stood before the Table. His crews scattered across the Keys. No more Brethren ships go down off the Teeth.' : 'Hob Merrick took his crews home to Callis on Assembly pardons. The Teeth are quiet. Ned Vey doesn\'t drink with me.';
    },
    objectives: (g, s) => {
      if (s === 'gallows') return [{ text: 'Talk to Hob Merrick on Gallows Key', marker: 'hob_merrick' }];
      if (s === 'smoke') return [{ text: 'Search the beacon on Smoke Key', marker: 'teethBeacon' }];
      if (s === 'merrick') return [{ text: 'Show Hob Merrick the signal book', marker: 'hob_merrick' }];
      if (s === 'cutter') return [{ text: `Stop the cutter's boat on Gallows beach (${Math.min(1, killed(g, 'type:revenuelt'))}/1)` }];
      if (s === 'choose') return [{ text: 'Decide what happens to Hob Merrick', marker: 'hob_merrick' }];
      if (s === 'ned') return [{ text: 'Tell Ned Vey at Saltpenny', marker: 'ned_vey' }];
      return [];
    },
    advance: (g, s) => (s === 'cutter' && killed(g, 'type:revenuelt') >= 1 ? 'choose' : null),
    marks: (_g, s): Marks => (s === 'gallows' || s === 'merrick' || s === 'choose' ? { hob_merrick: '?' } : s === 'ned' ? { ned_vey: '?' } : {}),
    walk: { kill: { cutter: [['revenuelt', 1]] }, cast: ['ned_vey', 'hob_merrick'] },
  },
  [TIDE]: {
    id: TIDE, name: 'Before the Tide', region: 'keys', depth: 'quest',
    notes: (g, s) => {
      if (s === 'stuff') return `Kester Bligh has the Long Shilling hauled up on the Careen, and the spring tide comes in four days. He needs rope from Rook's Ropewalk at Gullmouth (${Math.min(3, g.count('furn_coil'))}/3) and shoring timber (${Math.min(6, g.count('wedge_timber'))}/6).`;
      if (s === 'back') return 'I have the rope and the timber. Kester is on the Careen.';
      return 'The Long Shilling floated off the Careen on the spring tide, shored and tarred. Kester says she\'ll outlast him. He says that about everything.';
    },
    objectives: (g, s) => {
      if (s === 'stuff') return [{ text: `Coils of rope from Gullmouth (${Math.min(3, g.count('furn_coil'))}/3)`, marker: 'jem_rope' }, { text: `Shoring timber (${Math.min(6, g.count('wedge_timber'))}/6)`, marker: 'teethDrift' }];
      if (s === 'back') return [{ text: 'Bring them to Kester Bligh', marker: 'kester_bligh' }];
      return [];
    },
    advance: (g, s) => (s === 'stuff' && g.count('furn_coil') >= 3 && g.count('wedge_timber') >= 6 ? 'back' : null),
    marks: (_g, s): Marks => (s === undefined ? { kester_bligh: '!' } : s === 'back' ? { kester_bligh: '?' } : {}),
    walk: { obtain: { stuff: [['furn_coil', 3]] }, cast: ['kester_bligh'] },
  },
  [LIGHTS]: {
    id: LIGHTS, name: 'False Lights', region: 'keys', depth: 'quest',
    notes: (g, s) => {
      if (s === 'figure') return 'Gert Vosse keeps the beacon on Smoke Key and lights it for whoever pays her. Kester Bligh says the Morning Star\'s figurehead washed up on the rocks at the foot of the Chair. She went down off the Teeth ten years ago.';
      if (s === 'gert') return 'Cut in the back of the Morning Star\'s figurehead: "WILF VOSSE, SHIP\'S BOY." Gert Vosse lit the light that wrecked her.';
      return g.flag('gertLight') === 'smashed' ? 'The beacon\'s glass is broken on Smoke Key. Gert lights no more false lights. She lights nothing at all.' : 'Gert keeps her beacon and her trade, and I keep her secret.';
    },
    objectives: (_g, s) => {
      if (s === 'figure') return [{ text: 'Find the Morning Star\'s figurehead under Ysolde\'s Chair', marker: 'teethFigure' }];
      if (s === 'gert') return [{ text: 'Talk to Gert Vosse on Smoke Key', marker: 'gert_vosse' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'gert' ? { gert_vosse: '?' } : {}),
    walk: { cast: ['kester_bligh', 'gert_vosse'] },
  },
  [ROSE]: {
    id: ROSE, name: 'The Compass Rose', region: 'keys', depth: 'quest',
    notes: (_g, s) => {
      if (s === 'rose') return 'Dinah Lowry says Ysolde Gale cut her compass rose in the top of the Chair, off the Teeth. Gale\'s log, the page Dinah keeps: "North for the sea, west for the dead, south for the wind, east for home."';
      if (s === 'dinah') return 'The rose opened. Gale\'s spyglass was under it, wrapped in oilcloth. Dinah will want to see it, even if she can\'t have it.';
      return 'Ysolde Gale\'s spyglass is mine. Dinah drew it, three times, and gave it back.';
    },
    objectives: (g, s) => {
      if (s === 'rose') return [{ text: 'Press the rose\'s points in the order of Gale\'s log', marker: 'teethRose' + ROSE_POINTS[Math.min(3, pressed(g))].id }];
      if (s === 'dinah') return [{ text: 'Show Dinah Lowry', marker: 'dinah_lowry' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'dinah' ? { dinah_lowry: '?' } : {}),
    walk: { cast: ['dinah_lowry'], from: { quests: { dinahGale: 'done' } } },
  },
  [CLERK]: {
    id: CLERK, name: 'Prize Crew', region: 'keys', depth: 'short',
    notes: (_g, s) => {
      if (s === 'joan') return 'Joan Sabater, an Assembly customs clerk, is in the cell on Gallows Key. Merrick took her off a prize three months ago, and nobody in Callis has paid her ransom. Merrick wants two hundred marks.';
      return 'Joan Sabater went home to Callis. She says the customs house owes me a favour, and that she\'ll be the one to decide when.';
    },
    objectives: (_g, s) => (s === 'joan' ? [{ text: 'Get Joan Sabater out of the cell', marker: 'hob_merrick' }] : []),
    marks: (_g, s): Marks => (s === undefined ? { joan_sabater: '!' } : {}),
    walk: { cast: ['joan_sabater', 'hob_merrick'] },
  },
};

// ================================================================ What they say

const nedNodes: Record<string, DNode> = {
  tu1: {
    text: 'Three ships this season, near the Teeth. Brethren ships. The Table says Hob Merrick. We threw him out for taking a Brethren prize. Go and ask him. Ask him nicely, first.',
    options: [
      { text: 'I\'ll go to Gallows Key.', effect: (g) => g.setStage(UNPAID, 'gallows') },
      { text: 'Not now, Ned.' },
    ],
  },
  tuWait: { text: 'Gallows Key. West of us. Watch the rocks.', options: [{ text: 'I\'m going.' }] },
  tuBack: {
    text: (g) => (end(g) === 'table'
      ? 'The cutter, and Merrick lighting her in. And he\'ll stand before the Table. Good. The Table remembers who brings it things.'
      : 'You let him go home. With Assembly paper in his coat, on Brethren blood. I\'ll not forget it, and I\'ll not pretend the ships weren\'t sunk by the cutter. Here. You earned the money. You didn\'t earn the drink.'),
    options: [{ text: 'It\'s done.', effect: (g) => { g.addMarks(end(g) === 'table' ? 420 : 260); g.setStage(UNPAID, 'done'); } }],
  },
};

const merrickNodes: Record<string, DNode> = {
  m1: {
    text: 'Ned Vey sent you. You can tell him I haven\'t taken a Brethren ship since the one I paid for. Want to know who\'s sinking them? Watch Smoke Key on a dark night. Somebody lights it wrong.',
    options: [{ text: 'I\'ll look at the beacon.', effect: (g) => g.setStage(UNPAID, 'smoke') }],
  },
  mWait: { text: 'Smoke Key. The beacon. Go on.', options: [{ text: 'Going.' }] },
  m2: {
    text: 'Ah. The book. Aye. It\'s the cutter. She waits in the channel, and the beacon tells her what\'s coming. One ship, one pardon. I\'ve forty men here born in Callis, and none of them can go home.',
    options: [{ text: 'So you light it for her.', next: 'm3' }],
  },
  m3: {
    text: 'I light it for her. Her boat comes in tonight for the next name on the list. I\'ll not fight it. You do what you like.',
    options: [{ text: 'I\'ll meet the boat.', effect: (g) => g.setStage(UNPAID, 'cutter') }],
  },
  mCutter: { text: 'The beach, tonight. I\'ll be inside the walls, not watching.', options: [{ text: 'Stay inside, then.' }] },
  m4: {
    text: 'Sabat\'s dead, then. And his boat. I\'ve eleven pardons in my coat, and the Table wants my neck. What happens now is yours to say. I\'ll not argue.',
    options: [
      { text: 'You\'ll stand before the Table.', next: 'mTable' },
      { text: 'Take your crews home to Callis.', next: 'mPardon' },
    ],
  },
  mTable: {
    text: 'Aye. Fair. I\'d have said the same. Tell Ned I\'ll come on my own feet. And tell my lads to scatter before he sends boats.',
    options: [{ text: 'I\'ll tell him.', effect: (g) => { g.setFlag('teethEnd', 'table'); g.setStage(UNPAID, 'ned'); } }],
  },
  mPardon: {
    text: 'Home. Forty men home. You don\'t know what you\'ve given them. The Table will hate you for it. Let it.',
    options: [{ text: 'Go home, Hob.', effect: (g) => { g.setFlag('teethEnd', 'pardon'); g.setStage(UNPAID, 'ned'); } }],
  },
  clerk: {
    text: 'The clerk? Two hundred marks and she\'s yours. Callis won\'t pay it. Callis forgets its own when it\'s cheaper.',
    options: [
      { text: 'Here\'s two hundred.', cond: (g) => g.marks >= 200, effect: (g) => { g.addMarks(-200); g.setStage(CLERK, 'done'); } },
      { text: 'Let her go, and I\'ll keep quiet about your beacon.', cond: (g) => g.has('signal_book') || !!at(g, UNPAID) && at(g, UNPAID) !== 'gallows' && at(g, UNPAID) !== 'smoke', effect: (g) => g.setStage(CLERK, 'done') },
      { text: 'Not now.' },
    ],
  },
};

const merrick: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Hob Merrick. This is my key, these are my walls, that\'s my rum. You\'re welcome to the view.',
      options: [
        { text: 'About the clerk in your cell.', next: 'clerk', cond: (g) => at(g, CLERK) === 'joan' },
        { text: 'Just looking.' },
      ],
    },
    ...merrickNodes,
  },
};

const kester: DialogueTree = {
  start: (g) => (at(g, TIDE) === 'back' ? 'back' : at(g, TIDE) === 'stuff' ? 'wait' : at(g, TIDE) === 'done' ? 'after' : 'hello'),
  nodes: {
    hello: {
      text: 'Kester Bligh. That\'s the Long Shilling, Mattias Crowe\'s, up on the shingle. Spring tide\'s in four days and I\'m out of rope and out of wedges.',
      options: [
        { text: 'What do you need?', next: 'need' },
        { text: 'Anything else on these islands?', next: 'gossip' },
        { text: 'Good luck with her.' },
      ],
    },
    need: {
      text: 'Three coils of good laid rope, and there\'s none better than Rook\'s at Gullmouth. Six lengths of shoring timber. Bring them and I\'ll pay what Crowe pays me, which is plenty.',
      options: [{ text: 'I\'ll bring them.', effect: (g) => { g.setStage(TIDE, 'stuff'); g.give('wedge_timber', 2); } }, { text: 'Not now.' }],
    },
    gossip: {
      text: 'The Morning Star\'s figurehead came ashore under the Chair last month. Ten years in the sea. She went down off here, the night the beacon was lit wrong. Ask Gert Vosse about that, if you\'ve a strong stomach.',
      options: [{ text: 'I\'ll look at it.', cond: (g) => !at(g, LIGHTS), effect: (g) => g.setStage(LIGHTS, 'figure') }, { text: 'Thanks.' }],
    },
    wait: { text: 'Three coils, six timbers. Four days.', options: [{ text: 'Coming.' }] },
    back: {
      text: 'Rook\'s rope. You can smell the tar from here. Right. She\'ll float on the tide, and Crowe can pay you himself, which he\'ll hate.',
      options: [{ text: 'Glad to help.', effect: (g) => { g.take('furn_coil', 3); g.take('wedge_timber', 6); g.addMarks(300); g.setStage(TIDE, 'done'); } }],
    },
    after: { text: 'She floated. She always floats. That\'s the whole trick of it.', options: [{ text: 'Good day, Kester.', next: 'gossip' }] },
  },
};

const gert: DialogueTree = {
  start: (g) => (at(g, LIGHTS) === 'gert' ? 'g1' : 'hello'),
  nodes: {
    hello: { text: 'Gert. I keep the light. Wood\'s low and so\'s my temper.', options: [{ text: 'Good day.' }] },
    g1: {
      text: 'You\'ve been under the Chair. I can see it on you. Say it, then.',
      options: [{ text: 'Wilf Vosse was on the Morning Star.', next: 'g2' }],
    },
    g2: {
      text: 'Ship\'s boy. Twelve. I didn\'t know he\'d signed on. Somebody paid me to light it twice and shutter it, and I did, and she came onto the rocks, and in the morning there he was. I\'ve lit it every night since. I don\'t know how to stop.',
      options: [
        { text: 'Then I\'ll stop it for you.', next: 'gSmash' },
        { text: 'It\'s your light, Gert. Your secret\'s safe.', next: 'gKeep' },
      ],
    },
    gSmash: {
      text: 'Go on, then. The glass is up top. Break it. I\'ll not watch.',
      options: [{ text: 'I\'m sorry, Gert.', effect: (g) => { g.setFlag('gertLight', 'smashed'); g.addMarks(150); g.setStage(LIGHTS, 'done'); } }],
    },
    gKeep: {
      text: 'Safe. Nothing\'s safe. But thank you. Here, it\'s what they paid me for the Morning Star. I\'ve never spent it.',
      options: [{ text: 'Keep the light, then.', effect: (g) => { g.setFlag('gertLight', 'kept'); g.addMarks(220); g.setStage(LIGHTS, 'done'); } }],
    },
  },
};

const dinahNodes: Record<string, DNode> = {
  rose1: {
    text: 'There\'s one thing of Gale\'s I never found. Her rose, cut in the top of the Chair, off the Teeth. Her log says, "North for the sea, west for the dead, south for the wind, east for home." I think it\'s an order.',
    options: [{ text: 'I\'ll climb the Chair.', effect: (g) => g.setStage(ROSE, 'rose') }, { text: 'Not now.' }],
  },
  roseBack: {
    text: 'Her glass. Her actual glass. Let me draw it. Let me draw it three times. There. Take it. It\'s yours, you climbed for it. I just knew where.',
    options: [{ text: 'Thank you, Dinah.', effect: (g) => { g.addMarks(180); g.setStage(ROSE, 'done'); } }],
  },
};

const joan: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Joan Sabater, Assembly customs, Callis. Three months in here. Merrick says two hundred marks. The customs house says it has no line in its books for clerks taken by pirates.',
      options: [{ text: 'I\'ll talk to Merrick.', cond: (g) => !at(g, CLERK), effect: (g) => g.setStage(CLERK, 'joan') }, { text: 'Hold on.' }],
    },
  },
};

export const TEETH_CONTENT: RegionContent = {
  id: 'teeth',
  items,
  npcs,
  quests,
  dialogue: { hob_merrick: merrick, kester_bligh: kester, gert_vosse: gert, joan_sabater: joan },
  spawns: [
    { land: 'morrow', tag: 'cutterBoat', type: 'revenueman', at: LANDING.slice(0, 3), when: (g) => at(g, UNPAID) === 'cutter' },
    { land: 'morrow', tag: 'cutterLt', type: 'revenuelt', at: [LANDING[3]], when: (g) => at(g, UNPAID) === 'cutter' },
  ],
  things: [
    {
      id: 'teethBeacon', x: SMOKE.x - 4.5, z: SMOKE.z + 2.6, label: 'Search the keeper\'s hut', radius: 2.6,
      when: (g: GameApi) => at(g, UNPAID) === 'smoke',
      use: (g: GameApi) => { if (!g.give('signal_book')) return; g.setStage(UNPAID, 'merrick'); g.toast('Under the keeper\'s bed, in oilcloth: a book of Assembly revenue signals. One page is turned down. A beacon lit twice, shuttered, lit. "BRETHREN IN THE CHANNEL."'); },
    },
    {
      // The driftwood on the Careen, squared for shores with Kester's adze
      id: 'teethDrift', x: CAREEN.x + 6.5, z: CAREEN.z - 7.5, label: 'Square timber from the driftwood', radius: 2.6,
      when: (g: GameApi) => at(g, TIDE) === 'stuff' && g.count('wedge_timber') < 6,
      use: (g: GameApi) => { if (g.give('wedge_timber', 2)) g.toast('You take Kester\'s adze to a bleached spar and square off two lengths of shoring timber.'); },
    },
    {
      id: 'teethFigure', x: FIGURE[0], z: FIGURE[1], label: 'Look at the figurehead', radius: 2.6,
      when: (g: GameApi) => at(g, LIGHTS) === 'figure',
      use: (g: GameApi) => { g.setStage(LIGHTS, 'gert'); g.toast('A woman holding a star, her paint gone to the grain. Cut into her back, small, with a knife: WILF VOSSE, SHIP\'S BOY.'); },
    },
    ...ROSE_POINTS.map((r, i) => ({
      id: 'teethRose' + r.id, x: r.at[0], z: r.at[1], y: CHAIR.top, label: `Press the ${r.name} point of the rose`, radius: 1.6,
      when: (g: GameApi) => at(g, ROSE) === 'rose',
      use: (g: GameApi) => {
        if (pressed(g) !== i) { g.setFlag('teethRosePressed', 0); g.toast('The stone sinks, and then all four rise back level with a grinding sound. Wrong order.'); return; }
        g.setFlag('teethRosePressed', i + 1);
        if (i < 3) { g.toast(`The ${r.name} stone sinks a hand's breadth and stays down.`); return; }
        g.give('galestar_glass');
        g.setStage(ROSE, 'dinah');
        g.toast('The last stone goes down, and the middle of the rose drops away under it. In the hollow, in oilcloth gone stiff: a brass spyglass, the rose engraved round its eyepiece.');
      },
    })),
  ],
  hooks: (D) => {
    hook(D, 'ned_vey', (g) => (at(g, UNPAID) === 'ned' ? 'tuBack' : at(g, UNPAID) && at(g, UNPAID) !== 'done' ? 'tuWait' : !at(g, UNPAID) && (!at(g, 'tdSalt') || at(g, 'tdSalt') === 'done') ? 'tu1' : undefined), nedNodes);
    hook(D, 'hob_merrick', (g) => {
      const s = at(g, UNPAID);
      return s === 'gallows' ? 'm1' : s === 'smoke' ? 'mWait' : s === 'merrick' ? 'm2' : s === 'cutter' ? 'mCutter' : s === 'choose' ? 'm4' : undefined;
    }, {});
    hook(D, 'dinah_lowry', (g) => (at(g, ROSE) === 'dinah' ? 'roseBack' : at(g, 'dinahGale') === 'done' && !at(g, ROSE) ? 'rose1' : undefined), dinahNodes);
  },
};
