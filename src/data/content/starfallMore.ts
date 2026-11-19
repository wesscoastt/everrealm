import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// More of the Scarth Highlands (owner 2026-11-13, content order: "once the first continents full of content then we can
// work on second"; Starfall had two side quests). Two more, on the tarn and the cairn road.
//
// sfSkate, WHAT THE TARN KEEPS (Edwin Marner, Coldwater Tarn): his daughter Cass went through the ice last winter and
// they never found her. The shard jellies that came down with the star gather anything bright. Clear them and find her
// skate; scratched in the blade, "C. M. & R. P.", and Robin Pask, the Kelderby miller\'s boy, has never said a word.
// Choice sfSkate = 'told' (Edwin hears Robin\'s name) | 'worn' (the letters are worn, you say).
//
// sfCairn, A STONE FOR THE HIGH CAIRN (Hepzie Barron, the Cairn Road): every cairn on the road has a stone in it for
// someone it didn\'t get home. She wants her husband Jack\'s stone carried up to the high cairn, which her knees won\'t
// do. On the way down, the Charter\'s surveyor, Lionel Ord, is marking the road for posts and wants the cairns down for
// the stone. Choice sfCairn = 'beside' (posts beside the cairns: you show him which stones are names) | 'posts' (the
// cairns come down; the posts are better in fog, and he\'s right about that).

const SKATE = 'sfSkate', CAIRN = 'sfCairn';
const TARN = { x: 566, z: 1506 }, EDWIN = { x: 574.5, z: 1517.5 };
const TARN_JELLIES: [number, number][] = [[560, 1500], [571, 1498], [556, 1510]];
const SKATE_AT = { x: 562.5, z: 1512.5 };
const ROBIN = { x: 306.5, z: 1466.5 };
const ROAD = { x: 143, z: 1573 }, HEPZIE = { x: 148.5, z: 1578.5 }, HIGH_CAIRN = { x: 141.5, z: 1541.5 }, ORD = { x: 136.5, z: 1566.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);

// ================================================================ What the Tarn Keeps

const edwin: DialogueTree = {
  start: (g) => {
    const s = at(g, SKATE);
    if (!s) return 'e1';
    if (s === 'back') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('sfSkate') === 'told' ? 'Robin came up on Sunday. We sat on the bank and didn\'t say much. He\'s a good lad. She\'d have done worse.' : 'I hang her skate on the door. The wind knocks it on the wood at night. I don\'t mind it.') },
    wait: { text: (g) => (at(g, SKATE) === 'skate' ? 'You\'ve cleared them. Look along the bank where they were thickest. Anything bright.' : `The jellies. ${Math.min(TARN_JELLIES.length, kills(g, 'sfTarn'))} of ${TARN_JELLIES.length}. They don\'t like being broken. Mind yourself.`) },
    e1: { speaker: 'narrator', text: 'A man on the tarn\'s bank with a long pole across his knees, looking at the water as if he\'s waiting for it to say something.', next: 'e2' },
    e2: { text: 'Edwin Marner. You\'re not from Kelderby, or you\'d walk round me. They all walk round me.', next: 'e3' },
    e3: { text: 'My girl Cass went through the ice here last Candlemas. Skating, at night, on her own, she said. We never found her. The tarn goes down further than anyone\'s pole.', next: 'e4' },
    e4: { text: 'Since the star came down, those glass jellies have been in the shallows. They take anything that shines. Rings, buckles. A skate blade shines.', next: 'e5' },
    e5: {
      text: 'I\'m not asking for her. I know where she is. I\'d just like something of hers that isn\'t in the house.',
      options: [
        { text: 'I\'ll clear them out and look.', effect: (g) => g.setStage(SKATE, 'jellies'), next: 'e6' },
        { text: 'I\'m sorry. Not now.' },
      ],
    },
    e6: { text: 'Thank you. I\'d do it myself, but they sting, and I\'d stand there and let them.' },
    b1: { speaker: 'narrator', text: 'He takes the skate in both hands and runs his thumb along the blade, and stops where the letters are.', next: 'b2' },
    b2: {
      text: '"C. M. and R. P." That\'s her. Who\'s R. P.? Can you read it?',
      options: [
        { text: 'R. P. Robin Pask, the miller\'s boy at Kelderby, I think. She wasn\'t on the ice alone.', effect: (g) => g.setFlag('sfSkate', 'told'), next: 'bT' },
        { text: 'It\'s worn. I can\'t make out the second.', effect: (g) => g.setFlag('sfSkate', 'worn'), next: 'bW' },
      ],
    },
    bT: { text: 'Robin Pask. He was first at the door that morning with a rope. He didn\'t say. He\'s carried that a year and never said.', next: 'bT2' },
    bT2: { text: 'I\'ll go down to the mill. Not angry. I don\'t think I could be angry with him. I\'d just like to hear about her, from somebody who was there.', effect: (g) => { g.take('sf_skate', 1); g.setStage(SKATE, 'done'); g.addMarks(60); } },
    bW: { text: 'Worn. Aye. Everything is, up here. It doesn\'t matter. It\'s hers.', next: 'bW2' },
    bW2: { speaker: 'narrator', text: 'He puts it inside his coat, against his chest, and goes back to looking at the water.', effect: (g) => { g.take('sf_skate', 1); g.setStage(SKATE, 'done'); g.addMarks(60); } },
  },
};

const robin: DialogueTree = {
  start: () => 'r1',
  nodes: {
    r1: { text: (g) => (g.flag('sfSkate') === 'told' && done(g, SKATE) ? 'Mr Marner came to the mill. I thought he\'d hit me. He asked what she laughed at. I told him everything she laughed at. It took all afternoon.' : 'Flour\'s up a penny. Father says it\'s the Charter. Father says everything\'s the Charter.') },
  },
};

// ================================================================ A Stone for the High Cairn

const hepzie: DialogueTree = {
  start: (g) => {
    const s = at(g, CAIRN);
    if (!s) return 'h1';
    if (s === 'back') return 'e1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('sfCairn') === 'beside' ? 'Posts and cairns both. Mr Ord came by and tipped his hat to Jack\'s stone. Fancy that.' : 'The posts are up. Painted white, every hundred yards. You can see them in a fog, I\'ll give him that. Jack\'s stone is in my garden now.') },
    wait: { text: (g) => (at(g, CAIRN) === 'carry' ? 'Up the road, north, where it turns. The big cairn on the shoulder. You\'ll know it: it\'s got more names in it than stones.' : 'Mr Ord\'s on the road below with his chain and his flags. Mind he doesn\'t measure you.') },
    h1: { speaker: 'narrator', text: 'A small old woman in a man\'s greatcoat, fitting a stone back onto a waymark cairn with the care of someone setting a table.', next: 'h2' },
    h2: { text: 'Hepzie Barron. Don\'t help. You\'ll put it on wrong.', next: 'h3' },
    h3: { text: 'Every cairn on this road has a stone in it for somebody it didn\'t get home. Sheep men, mostly. Snow comes over the shoulder faster than you\'d believe.', next: 'h4' },
    h4: { text: 'Jack went in the March snow, nine years back. I\'ve carried his stone up to the high cairn every Lady Day since. My knees have given notice this year.', next: 'h5' },
    h5: {
      text: 'You\'ve young knees. Would you take it up? Put it on the top, facing the way he came home.',
      options: [
        { text: 'I\'ll take it up.', effect: (g) => { g.give('sf_stone', 1); g.setStage(CAIRN, 'carry'); }, next: 'h6' },
        { text: 'Not today.' },
      ],
    },
    h6: { text: 'Facing south. Down the road. That\'s the way home.' },
    e1: { text: (g) => (g.flag('sfCairn') === 'beside' ? 'You talked him round? To a Charter man? I\'d have paid to see that.' : 'He\'s taking them down, then. Well. The posts will save someone. The cairns never told anybody where to stand.'), next: 'e2' },
    e2: { text: 'You did right by Jack, either way. Here: my mother\'s bannock, a bit stale. Don\'t tell me it\'s stale.', effect: (g) => { g.setStage(CAIRN, 'done'); g.addMarks(55); g.give('bread', 2); } },
  },
};

const ord: DialogueTree = {
  start: (g) => (at(g, CAIRN) === 'ord' ? 'o1' : 'idle'),
  nodes: {
    idle: { text: 'Lionel Ord, surveyor to the Charter. Mind the chain.' },
    o1: { speaker: 'narrator', text: 'A thin man in a waxed coat with a surveyor\'s chain over one shoulder and a bundle of red flags under his arm, standing by a cairn with his boot on it.', next: 'o2' },
    o2: { text: 'Lionel Ord, surveyor to the Charter. The Toll Office is putting posts on this road, white, every hundred yards. People die up here in fog. Posts will stop that.', next: 'o3' },
    o3: { text: 'And these heaps are the best dressed stone for five miles. Saves carting. I\'m having them taken down for the post footings.', next: 'o4' },
    o4: {
      text: 'You look like you have an opinion.',
      options: [
        { text: 'Every stone in them is a name. Put the posts beside them. I\'ll show you which stones you can have.', effect: (g) => { g.setFlag('sfCairn', 'beside'); g.setStage(CAIRN, 'back'); }, next: 'oB' },
        { text: 'You\'re right. Posts will save people. The cairns never did.', effect: (g) => { g.setFlag('sfCairn', 'posts'); g.setStage(CAIRN, 'back'); }, next: 'oP' },
      ],
    },
    oB: { text: 'Names. In a heap of stones. I suppose a post isn\'t much use to a man already dead. Fine. Show me the ones that aren\'t anybody, and I\'ll cart the rest from the quarry and send the Toll Office the bill.' },
    oP: { text: 'Thank you. I don\'t enjoy it. My father was a fell shepherd. But I\'ve pulled two men out of the snow on this road since Michaelmas, and a heap of stones didn\'t help either of them.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [SKATE]: {
    id: SKATE, name: 'What the Tarn Keeps', region: 'starfall', depth: 'quest',
    notes: (g, s) => (s === 'jellies' ? 'Edwin Marner\'s daughter Cass went through the ice at Coldwater Tarn last Candlemas. The shard jellies in the shallows gather anything bright. Clear them, and look for something of hers.' : s === 'skate' ? 'The jellies are broken. Look along the bank where they were thickest.' : s === 'back' ? 'A skate, its blade scratched "C. M. & R. P.". Back to Edwin.' : s === 'done' ? (g.flag('sfSkate') === 'told' ? 'I gave Edwin his daughter\'s skate, and Robin Pask\'s name.' : 'I gave Edwin his daughter\'s skate, and kept the second name to myself.') : ''),
    objectives: (g, s) => (s === 'jellies' ? [{ text: `Shatter the shard jellies at Coldwater Tarn (${Math.min(TARN_JELLIES.length, kills(g, 'sfTarn'))}/${TARN_JELLIES.length})`, marker: 'sfTarnSpot' }] : s === 'skate' ? [{ text: 'Search the bank of the tarn', marker: 'sfSkateSpot' }] : s === 'back' ? [{ text: 'Bring the skate to Edwin Marner', marker: 'sf_edwin' }] : []),
    advance: (g, s) => (s === 'jellies' && kills(g, 'sfTarn') >= TARN_JELLIES.length ? 'skate' : null),
    marks: (g, s): Marks => (!s ? { sf_edwin: '!' } : s === 'back' ? { sf_edwin: '?' } : {}),
    walk: { cast: ['sf_edwin', 'sf_robin'], auto: { jellies: 'skate' } },
  },
  [CAIRN]: {
    id: CAIRN, name: 'A Stone for the High Cairn', region: 'starfall', depth: 'quest',
    notes: (g, s) => (s === 'carry' ? 'Hepzie Barron\'s husband Jack died in the March snow on the Cairn Road. She wants his stone carried up to the high cairn on the shoulder, facing south, the way home.' : s === 'ord' ? 'Jack\'s stone is on the high cairn. Below, the Charter\'s surveyor, Lionel Ord, is marking the road for posts, and wants the cairns down for the stone.' : s === 'back' ? 'Back to Hepzie.' : s === 'done' ? (g.flag('sfCairn') === 'beside' ? 'The posts go up beside the cairns, and the names stay.' : 'The cairns come down for the posts. Jack\'s stone is in Hepzie\'s garden.') : ''),
    objectives: (g, s) => (s === 'carry' ? [{ text: 'Set Jack\'s stone on the high cairn', marker: 'sfHighCairn' }] : s === 'ord' ? [{ text: 'Talk to Lionel Ord, the surveyor', marker: 'sf_ord' }] : s === 'back' ? [{ text: 'Talk to Hepzie Barron', marker: 'sf_hepzie' }] : []),
    marks: (g, s): Marks => (!s ? { sf_hepzie: '!' } : s === 'ord' ? { sf_ord: '?' } : s === 'back' ? { sf_hepzie: '?' } : {}),
    walk: { cast: ['sf_hepzie', 'sf_ord'] },
  },
};

const spawns: QuestSpawn[] = [{ tag: 'sfTarn', type: 'shardjelly', at: TARN_JELLIES, when: (g) => at(g, SKATE) === 'jellies' }];

const things: WorldThing[] = [
  { id: 'sfTarnSpot', x: TARN.x, z: TARN.z, label: 'Coldwater Tarn', radius: 0, look: 'none', when: () => false },
  {
    id: 'sfSkateSpot', x: SKATE_AT.x, z: SKATE_AT.z, label: 'Search the bank', radius: 2.4, look: 'glint',
    when: (g) => at(g, SKATE) === 'skate',
    use: (g) => { g.give('sf_skate', 1); g.setStage(SKATE, 'back'); g.toast('In the reeds where the jellies were thickest: a girl\'s skate, the strap rotted, the blade still bright. Scratched into the iron, small and careful: "C. M. & R. P."'); },
  },
  {
    id: 'sfHighCairn', x: HIGH_CAIRN.x, z: HIGH_CAIRN.z, label: 'Set Jack\'s stone on the cairn', radius: 2.6, look: 'cairn',
    when: (g) => at(g, CAIRN) === 'carry',
    use: (g) => { g.take('sf_stone', 1); g.setStage(CAIRN, 'ord'); g.toast('The high cairn is taller than you, and every stone near the top has something scratched on it: initials, a year, once a whole verse. You set Jack\'s on the top, facing south, down the road. On the way down you see a man with red flags and a chain at the cairn below.'); },
  },
];

const NPCS_S: NpcDef[] = [
  { id: 'sf_edwin', name: 'Edwin Marner', title: 'Kelderby', look: { skin: '#d8a882', hair: '#6a6460', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#4a4a3a', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a1e14', cape: '#3a3a32', build: 1.0, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [EDWIN.x, EDWIN.z], face: [TARN.x, TARN.z], anim: 'idle' }], barks: ['Cold today.'] },
  { id: 'sf_robin', name: 'Robin Pask', title: 'The miller\'s boy, Kelderby', look: { skin: '#e8c4a0', hair: '#c8a060', hairStyle: 3, eyes: '#4a6a4a', tunic: '#d8d0b8', trim: '#8a7a5a', trousers: '#4a4034', boots: '#2a1e14', apron: true, freckles: true, build: 0.86, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: [ROBIN.x, ROBIN.z], face: [ROBIN.x - 2, ROBIN.z], anim: 'idle' }], barks: ['Flour\'s up a penny.'] },
  { id: 'sf_hepzie', name: 'Hepzie Barron', title: 'The Cairn Road', look: { frame: 'f', skin: '#d8a882', hair: '#d8d4cc', hairStyle: 2, eyes: '#4a5a6a', tunic: '#3a3a42', trim: '#8a7a5a', trousers: '#2a2a2a', boots: '#2a1e14', cape: '#4a4a3a', lashes: true, build: 0.86, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [HEPZIE.x, HEPZIE.z], face: [ROAD.x, ROAD.z], anim: 'idle' }], barks: ['Don\'t help.'] },
  { id: 'sf_ord', name: 'Lionel Ord', title: 'Surveyor to the Charter', look: { skin: '#e8c8a8', hair: '#3a3430', hairStyle: 1, eyes: '#3a3a42', tunic: '#5a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#3a3430', build: 0.82, height: 1.06, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [ORD.x, ORD.z], face: [ROAD.x, ROAD.z], anim: 'idle' }], barks: ['Mind the chain.'], when: (g) => at(g, CAIRN) === 'ord' || at(g, CAIRN) === 'back' || done(g, CAIRN) },
];

const ITEMS_S: ItemDef[] = [
  { id: 'sf_skate', name: 'Cass Marner\'s skate', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'shoe', a: '#6a4a2a', b: '#c8ccd2' }, desc: 'A girl\'s skate, the leather strap rotted through, the blade still bright. Scratched in the iron: "C. M. & R. P."' },
  { id: 'sf_stone', name: 'Jack Barron\'s stone', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'ore', a: '#8a8a82', b: '#5a5a52' }, desc: 'A flat grey stone the size of a hand, worn smooth on one side by nine years of carrying. "J. B." scratched in it, and a crook.' },
];

export const STARFALL_MORE: RegionContent = {
  id: 'starfallMore',
  items: ITEMS_S,
  npcs: NPCS_S,
  dialogue: { sf_edwin: edwin, sf_robin: robin, sf_hepzie: hepzie, sf_ord: ord },
  quests,
  spawns,
  things,
};
