import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Carn Hold, the outpost on the peak (OWED 97x stage 3, docs/VERANDAH.md): the land's fort, as Awschitz is the sea's.
// It keeps the island's beacon chain (Carn Hold, the watch tower, Awschitz, Kestle) and the road out to Gorran.
//
// Sampson Keast keeps the beacon, in the lookout room under the roof with Crago the lookout. Gwen Bolitho has the forge
// at the foot of the keep; Digory Trounce cuts at the lumberyard by the west road; Ivo Sowden keeps Gorran's gate.
//
// vhBeacon, WET WOOD (Sampson Keast): the monthly beacon test, and the store's wood is soaked through where the slates
// went in the gale. Dry wood from Digory, a pot of pitch from Gwen, and the beacon is lit: the watch tower answers,
// then Awschitz, and Kestle a quarter of an hour late. Tell the captain, or keep it between you and Sampson.
// vhBeacon = 'told' | 'kept'.
//
// vhNight, THE NIGHT CART (Captain Penhallow): carters on the Gorran road say a heavy cart goes by after midnight with no
// lamp. Ivo at Gorran's gate has watched it turn off before the gate, down the old sheep track to the cove. At the
// turning, two wreckers come back for a cask that bounced off the tail; its head is burned with a mark, a ring with a
// cross through it. Penhallow knows the mark. Leave it with him, take it to Captain Morvah as well, or ([Honest]) ask
// him straight. vhNight = 'trust' | 'morvah' | 'asked'. (It is Mab Penhallow's tally mark: The Silent Waters, chapter 5.)

const BEACON = 'vhBeacon', NIGHT = 'vhNight';
const SAMPSON = { x: -3134.5, y: 95, z: 2333.5 };
const RUTS = { x: -3250.5, z: 2310.5 };
const CASK = { x: -3290.5, z: 2300.5 };
const WRECKERS: [number, number][] = [[-3286, 2296], [-3294, 2304]];

const fetched = (g: GameApi) => (g.flag('vhWood') ? 1 : 0) + (g.flag('vhPitch') ? 1 : 0);

// ================================================================ Sampson Keast

const sampson: DialogueTree = {
  start: (g) => {
    const s = at(g, BEACON);
    if (s === 'light' || (s === 'fetch' && fetched(g) >= 2)) return 'l1';
    return g.flag('vhMetSampson') ? 'hello' : 's0';
  },
  nodes: {
    s0: { speaker: 'narrator', text: 'An old man in a leather apron scorched to the colour of toast, sitting on an upturned bucket by the balcony door with a pipe he hasn\'t lit, looking at the sky the way other men look at a fire.', next: 's1' },
    s1: { text: 'Sampson Keast. I keep the beacon. Forty-one years. Never lit it for a raid, thank God, and never failed to light it for a test, which is the part nobody thanks you for.', effect: (g) => g.setFlag('vhMetSampson', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, BEACON) === 'fetch' ? `Dry wood from Digory at the lumberyard, and a pot of pitch from Gwen downstairs. ${fetched(g)} of two.` : 'Wind\'s from the west. Good burning weather.'),
      options: [
        { text: 'How does the beacon chain work?', next: 'chain' },
        { text: 'Why Carn Hold?', next: 'name' },
        { text: 'Is something wrong? You keep looking at the store.', cond: (g) => !at(g, BEACON), next: 'q1' },
        { text: 'About Kestle.', cond: (g) => at(g, BEACON) === 'done', next: 'after' },
        { text: 'Good day, Sampson.' },
      ],
    },
    chain: { text: 'Four fires. This one, the watch tower over the high street, Awschitz on the west shore, and Kestle in the east. Light one and the others see it and light theirs, and in a quarter of an hour the whole island knows. Every man to the walls, every boat to the harbour, the king to here.', next: 'hello' },
    name: { text: 'Carn. It means a heap of stones. The first ones here were fishermen, and they piled stones on the top so they could see a sail a day out. That heap\'s under the cellar still. The kings built up from it. They never quite managed to build it away.', next: 'hello' },
    q1: { text: 'The gale took four slates off the store roof last week, and nobody told me, and the beacon wood\'s been sitting in the wet ever since. It\'s the test on the first of the month. That\'s tomorrow. Wet wood smokes. Smoke from Carn Hold means fire on the island, not a test.', next: 'q2' },
    q2: {
      text: 'I need a cartload of dry wood from Digory Trounce at the lumberyard, out by the west road, and a pot of pitch from Gwen at the forge at the foot of the keep. My knees don\'t do the stairs twice in a day any more.',
      options: [{ text: 'I\'ll fetch them.', effect: (g) => g.setStage(BEACON, 'fetch') }, { text: 'Not now.' }],
    },
    l1: { speaker: 'narrator', text: 'Sampson builds the fire in the iron basket on the balcony the way a mason lays a wall, Digory\'s split oak crossed and crossed again, the pitch worked into the heart of it with a stick. Then he strikes a light, and the whole basket goes up with a sound like a sail filling.', next: 'l2' },
    l2: { speaker: 'narrator', text: 'For a long minute, nothing. Then a point of fire over the high street: the watch tower. Then, far off to the west, Awschitz. Then nothing in the east for so long that Sampson stands up off his bucket. Then, at last, Kestle.', next: 'l3' },
    l3: {
      text: 'A quarter of an hour. Kestle was a quarter of an hour late. If that had been the Brethren, they\'d have been ashore and up the Kestle road before the sheep knew. The captain will want to know. He\'ll stop the keeper\'s pay, and the keeper has six children and a bad hip.',
      options: [
        { text: 'Tell the captain. Next time it might not be a test.', moral: { id: 'vhBeacon:told', tr: { honesty: 2, courage: 1 }, rep: { verandah: 3 }, npc: { vh_sampson: 5, ver_capt_penhallow: 5 } }, effect: (g) => { g.take('vh_kindling', 1); g.take('vh_pitch', 1); g.setFlag(BEACON, 'told'); g.addMarks(55); g.setStage(BEACON, 'done'); }, next: 'lT' },
        { text: 'Keep it between us. Go out to Kestle and have a word with him yourself.', moral: { id: 'vhBeacon:kept', tr: { compassion: 2, loyalty: 1 }, npc: { vh_sampson: 15 } }, effect: (g) => { g.take('vh_kindling', 1); g.take('vh_pitch', 1); g.setFlag(BEACON, 'kept'); g.addMarks(55); g.setStage(BEACON, 'done'); }, next: 'lK' },
      ],
    },
    lT: { text: 'You\'re right. I know you\'re right. I\'ll go down and tell him myself, so it comes from me. Here. That\'s from the beacon purse. It\'s never been opened for a better reason.' },
    lK: { text: 'I\'ll walk out to Kestle in the morning and tell him what a quarter of an hour means. He\'ll listen. He\'s my sister\'s boy. Here, from the beacon purse.' },
    after: {
      text: (g) => (g.flag(BEACON) === 'told'
        ? 'The captain stopped his pay a month and sent him two men to share the watch. Kestle\'s been on time since. He doesn\'t write to me.'
        : 'I walked out. He cried, the great soft lump. He\'s been on time since. Early, some months.'),
      next: 'hello',
    },
  },
};

// ================================================================ Digory and Gwen (the beacon wood and the pitch)

const digory: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (at(g, BEACON) === 'fetch' && !g.flag('vhWood') ? 'Don\'t stand behind me. What do you want?' : 'Oak for the shipwrights, ash for the carts, the rest for the fire.'),
      options: [
        { text: 'Sampson Keast needs dry wood for the beacon.', cond: (g) => at(g, BEACON) === 'fetch' && !g.flag('vhWood'), next: 'w1' },
        { text: 'Good day.' },
      ],
    },
    w1: { text: 'Again? The store roof, is it? Every autumn. Here, split oak from under the shed, a summer drying. Tell Sampson he owes me a jug, and tell the captain to mend his roof.', effect: (g) => { g.give('vh_kindling', 1); g.setFlag('vhWood', 1); } },
  },
};

const gwen: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Horseshoes, spearheads, hinges. Same iron, different day.',
      options: [
        { text: 'Sampson needs a pot of pitch for the beacon.', cond: (g) => at(g, BEACON) === 'fetch' && !g.flag('vhPitch'), next: 'p1' },
        { text: 'Good day.' },
      ],
    },
    p1: { text: 'He knows where it is. It\'s where it\'s been for forty years, on the shelf by the quench, and he\'d rather send you down sixty steps than come down them himself. Here. Mind, it\'s warm. I keep it by the fire so it pours.', effect: (g) => { g.give('vh_pitch', 1); g.setFlag('vhPitch', 1); } },
  },
};

// ================================================================ Ivo Sowden, at Gorran's gate

const ivo: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Gate shuts at ten. Arena or no Arena.',
      options: [
        { text: 'Captain Penhallow wants to know about a cart on the road at night.', cond: (g) => at(g, NIGHT) === 'road', next: 'i1' },
        { text: 'Good day.' },
      ],
    },
    i1: { text: 'The dark cart. I\'ve seen it four times this month, after midnight, from the top of the gate. Two horses, iron tyres, no lamp. It doesn\'t come to the gate. It turns off before, south, down the old sheep track to the cove.', next: 'i2' },
    i2: { text: 'Last Tuesday it hit the rut at the turning hard enough to shake something off the tail. They didn\'t stop. I meant to go and look in the morning. I didn\'t. I\'m sixty-eight, and the men who drive carts without lamps don\'t like being looked at.', options: [{ text: 'I\'ll go and look.', effect: (g) => g.setStage(NIGHT, 'ruts') }] },
  },
};

// ================================================================ Penhallow

const penNodes: Record<string, DNode> = {
  n1: { text: 'The carters on the Gorran road say a cart goes by after midnight with no lamp, heavy enough to wake the dogs. That\'s my road. My men walk it twice a day and see nothing, because they walk it by day.', next: 'n2' },
  n2: {
    text: 'Ivo Sowden keeps Gorran\'s gate and doesn\'t sleep. Ask him what he\'s seen. Then go and look.',
    options: [{ text: 'I\'ll ask Ivo.', effect: (g) => g.setStage(NIGHT, 'road') }, { text: 'Not now, Captain.' }],
  },
  c1: { speaker: 'narrator', text: 'Penhallow takes the cask head and turns it to the window. Burned into the oak is a ring with a cross struck through it. Something goes out of his face, quickly, the way a lamp goes out in a draught, and comes back.', next: 'c2' },
  c2: {
    text: 'Brandy, by the smell. Somebody\'s running it up from the cove to the town, past my gate and Gorran\'s, in the dark. I\'ll double the night watch on the road.',
    options: [
      { text: 'Leave it with you, Captain.', moral: { id: 'vhNight:trust', tr: { loyalty: 2 }, npc: { ver_capt_penhallow: 15 } }, effect: (g) => { g.take('vh_caskhead', 1); g.setFlag(NIGHT, 'trust'); g.addMarks(70); g.setStage(NIGHT, 'done'); }, next: 'cT' },
      { text: 'I\'ll show it to Captain Morvah at Awschitz as well. The cove is her water.', moral: { id: 'vhNight:morvah', tr: { honesty: 2 }, rep: { verandah: 2 }, npc: { ver_capt_penhallow: -10, aw_morvah: 10 } }, effect: (g) => { g.take('vh_caskhead', 1); g.setFlag(NIGHT, 'morvah'); g.addMarks(70); g.setStage(NIGHT, 'done'); }, next: 'cM' },
      { text: 'You know that mark, Captain.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'vhNight:asked', tr: { honesty: 2, courage: 1 }, npc: { ver_capt_penhallow: 5 } }, effect: (g) => { g.take('vh_caskhead', 1); g.setFlag(NIGHT, 'asked'); g.addMarks(70); g.setStage(NIGHT, 'done'); }, next: 'cA' },
    ],
  },
  cT: { text: 'Thank you. It\'s my road. I\'ll see to it. Here, for the walk.' },
  cM: { text: 'Morvah. Of course. She\'ll say it\'s the Black Gulls and ask the king for another cutter. I\'ll send it round to her myself, with my compliments. Here, for the walk. Mind the stairs going down.' },
  cA: { speaker: 'narrator', text: 'He doesn\'t answer for a long time. Then: "I know it. I\'d be grateful if you didn\'t say so to anyone else. Not yet. Here, for the walk." He puts the cask head in the drawer of his desk, and locks the drawer.' },
  cAfter: {
    text: (g) => (g.flag(NIGHT) === 'morvah'
      ? 'The night watch on the Gorran road is doubled. The cart hasn\'t come again. Captain Morvah sent me a letter about it. I haven\'t read it.'
      : 'The night watch on the Gorran road is doubled. The cart hasn\'t come again. Leave it there.'),
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [BEACON]: {
    id: BEACON, name: 'Wet Wood', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'fetch') return 'The beacon wood at Carn Hold is soaked, and the monthly test is tomorrow. Sampson Keast needs dry wood from Digory Trounce at the lumberyard and a pot of pitch from Gwen Bolitho at the keep\'s forge.';
      if (s === 'light') return 'I have the wood and the pitch. Back up to Sampson in the lookout room.';
      return g.flag(BEACON) === 'told' ? 'The beacon chain was tested. Kestle was late, and the captain knows.' : 'The beacon chain was tested. Kestle was late, and Sampson is seeing to it himself.';
    },
    objectives: (g, s) => (s === 'fetch' ? [
      { text: 'Get dry wood from Digory Trounce at the lumberyard', done: !!g.flag('vhWood'), marker: 'ver_wood_digory' },
      { text: 'Get a pot of pitch from Gwen Bolitho at the forge', done: !!g.flag('vhPitch'), marker: 'ver_smith_bolitho' },
      ...(fetched(g) >= 2 ? [{ text: 'Bring them up to Sampson Keast', marker: 'vh_sampson' }] : []),
    ] : s === 'light' ? [{ text: 'Bring them up to Sampson Keast', marker: 'vh_sampson' }] : []),
    advance: (g, s) => (s === 'fetch' && fetched(g) >= 2 ? 'light' : null),
    marks: (g, s): Marks => (!s ? { vh_sampson: '!' } : s === 'light' ? { vh_sampson: '?' } : s === 'fetch' ? { ...(g.flag('vhWood') ? {} : { ver_wood_digory: '?' }), ...(g.flag('vhPitch') ? {} : { ver_smith_bolitho: '?' }) } : {}),
    walk: { cast: ['vh_sampson', 'ver_wood_digory', 'ver_smith_bolitho'] },
  },
  [NIGHT]: {
    id: NIGHT, name: 'The Night Cart', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'road') return 'A heavy cart goes along the Gorran road after midnight with no lamp. Captain Penhallow wants to know what Ivo Sowden, Gorran\'s watchman, has seen.';
      if (s === 'ruts') return 'The cart turns off before Gorran\'s gate, down the old sheep track to the cove, and shook something off its tail at the turning. Go and look.';
      if (s === 'capt') return 'A cask of brandy, its head burned with a ring and a cross. Back to Captain Penhallow at Carn Hold.';
      const f = g.flag(NIGHT);
      return f === 'morvah' ? 'Captain Morvah at Awschitz has seen the mark too.' : f === 'asked' ? 'Penhallow knows the mark. He asked me to keep it to myself.' : 'I left the cask head with Penhallow.';
    },
    objectives: (g, s) => (s === 'road' ? [{ text: 'Ask Ivo Sowden at Gorran\'s gate', marker: 'gor_ivo' }]
      : s === 'ruts' ? [
        { text: 'Look at the ruts on the Gorran road', done: !!g.flag('vhRuts'), marker: 'vhRutsThing' },
        { text: `Deal with the men at the turning (${Math.min(WRECKERS.length, killed(g, 'vhCartmen'))}/${WRECKERS.length})`, done: killed(g, 'vhCartmen') >= WRECKERS.length },
        { text: 'Look at what fell off the cart', done: !!g.flag('vhCask'), marker: 'vhCaskThing' },
      ]
      : s === 'capt' ? [{ text: 'Bring the cask head to Captain Penhallow', marker: 'ver_capt_penhallow' }] : []),
    advance: (g, s) => (s === 'ruts' && g.flag('vhCask') ? 'capt' : null),
    marks: (_g, s): Marks => (!s ? { ver_capt_penhallow: '!' } : s === 'road' ? { gor_ivo: '?' } : s === 'capt' ? { ver_capt_penhallow: '?' } : {}),
    walk: { cast: ['ver_capt_penhallow', 'gor_ivo'], kill: { ruts: [['wrecker', 2]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'vhCartmen', type: 'wrecker', at: WRECKERS, when: (g) => at(g, NIGHT) === 'ruts' },
];

const things: WorldThing[] = [
  {
    id: 'vhRutsThing', x: RUTS.x, z: RUTS.z, label: 'Look at the ruts', radius: 2.6, look: 'tracks',
    when: (g) => at(g, NIGHT) === 'ruts' && !g.flag('vhRuts'),
    use: (g) => { g.setFlag('vhRuts', 1); g.toast('Wheel ruts cut deep into the verge, iron tyres, a heavy load, and the hoofprints of two horses walking, not trotting. Somebody who didn\'t want to be heard. They go on west toward Gorran.'); },
  },
  {
    id: 'vhCaskThing', x: CASK.x, z: CASK.z, label: 'Look at the cask', radius: 2.4, look: 'crate',
    when: (g) => at(g, NIGHT) === 'ruts' && !g.flag('vhCask'),
    use: (g) => {
      if (killed(g, 'vhCartmen') < WRECKERS.length) { g.toast('Two men are standing over it. They\'ve come back for it.'); return; }
      g.setFlag('vhCask', 1); g.give('vh_caskhead', 1);
      g.toast('A small cask, split along one stave where it hit the road, and smelling powerfully of brandy. No Customs seal. Burned into the head is a mark: a ring, with a cross struck through it. You knock the head out and take it.');
    },
  },
];

const NPCS: NpcDef[] = [
  { id: 'vh_sampson', name: 'Sampson Keast', title: 'Beacon keeper, Carn Hold', look: { skin: '#c89070', hair: '#e0dcd4', hairStyle: 0, facial: 3, eyes: '#4a5a6a', tunic: '#5a4030', trim: '#3a2a1e', shirt: '#c8b8a0', trousers: '#3a3430', boots: '#1e1a16', apron: true, build: 0.95, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [SAMPSON.x, SAMPSON.z], face: [SAMPSON.x + 4, SAMPSON.z], anim: 'seated', y: SAMPSON.y }],
    barks: ['Wind\'s from the west.', 'Forty-one years, and never a raid. Long may it last.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'vh_kindling', name: 'Split oak', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'log', a: '#a07848', b: '#6a4a2a' }, desc: 'A bundle of oak split a summer ago and dried under Digory\'s shed. For the beacon.' },
  { id: 'vh_pitch', name: 'Pot of pitch', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'gel', a: '#2a2420', b: '#6a5a40' }, desc: 'Warm pine pitch from Gwen\'s shelf by the quench. It pours.' },
  { id: 'vh_caskhead', name: 'Cask head', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'wheel', a: '#8a6a40', b: '#2a1e14' }, desc: 'The head of a brandy cask with no Customs seal, burned with a mark: a ring with a cross struck through it.' },
];

export const VERANDAH_CARN: RegionContent = {
  id: 'verandahCarn',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { vh_sampson: sampson, ver_wood_digory: digory, ver_smith_bolitho: gwen, gor_ivo: ivo },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'ver_capt_penhallow', (g) => (at(g, NIGHT) === 'capt' ? 'c1' : undefined), penNodes);
    addOption(D, 'ver_capt_penhallow', 'hello', { text: 'Anything on your road, Captain?', cond: (g) => !at(g, NIGHT), next: 'n1' });
    addOption(D, 'ver_capt_penhallow', 'hello', { text: 'About the night cart.', cond: (g) => at(g, NIGHT) === 'done', next: 'cAfter' });
  },
};
