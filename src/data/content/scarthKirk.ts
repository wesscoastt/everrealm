import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories in the Scarth Highlands (owner 2026-11-13, content order: fill the Counties first), with the
// morality system's choices (docs/MORALITY.md).
//
// scComet, A NAME FOR THE COMET (Ilse Blewitt, Scarth Watch): there's a new comet low in the north, and the Collegium
// lets whoever fixes its path first give it a name. Ilse needs its place taken from the three old sighting cairns on the
// ridge west of the Watch, past the shard jellies that sit up there in the cold. Then the name: Blewitt's, for her, or
// Tom's, for the husband who ground the Watch's glass and died before the first star fell, or ([Generous]) let the
// Kelderby schoolchildren choose it. scComet = 'blewitt' | 'tom' | 'children'.
//
// scPilgrim, SNOW-BLIND (Sela Orme, the Glass Kirk; after Owen's Crook): a pilgrim set out from Kelderby to put his hand on the star and
// never came in, and it snowed. His tracks go south-west off the Kirk, down into the hollow. Past the frost wolves he's
// sitting in the snow with his eyes bound, snow-blind: Tobit Cragg, who walked off the Muster's roll at Candlemas. Lead
// him to the star and say nothing, take him to Sergeant Holroyd, ([Straight]) lead him to the star and then talk him into
// going back to answer for it himself, or ([Bad or Evil]) take what he carries and leave him there.
// scPilgrim = 'kirk' | 'muster' | 'answer' | 'robbed'.

const COMET = 'scComet', PILGRIM = 'scPilgrim';
const CAIRNS: [number, number][] = [[578.5, 1672.5], [578.5, 1690.5], [573.5, 1704.5]];
const JELLIES: [number, number][] = [[585, 1680], [583, 1698]];
const TRACKS: [number, number][] = [[1170.5, 1824.5], [1180.5, 1838.5], [1189.5, 1850.5]];
const TOBIT = { x: 1194.5, z: 1860.5 };
const WOLVES: [number, number][] = [[1186, 1864], [1201, 1855]];

const sighted = (g: GameApi) => CAIRNS.filter((_, i) => g.flag('scCairn' + i)).length;
const tracked = (g: GameApi) => TRACKS.filter((_, i) => g.flag('scTrack' + i)).length;

// ================================================================ A Name for the Comet

const ilseNodes: Record<string, DNode> = {
  cm1: { text: 'There\'s a comet. Low in the north, an hour before dawn, with a tail like a pulled thread. Nobody has it in any book. And the Collegium lets whoever fixes its path first give it a name.', next: 'cm2' },
  cm2: { text: 'To fix the path I need its place taken from three points a long way apart, at the same hour. The old sighting cairns on the ridge west of here were built for exactly that. I\'m sixty-one, and the ridge is a ridge.', next: 'cm3' },
  cm3: {
    text: 'Take the sighting board up. Lay it on each cairn, mark where the comet stands against the notches. The shard jellies sit up there in the cold. Mind them.',
    options: [{ text: 'I\'ll take your sightings.', effect: (g) => { g.give('sc_board', 1); g.setStage(COMET, 'cairns'); } }, { text: 'Not now.' }],
  },
  cmWait: { text: (g) => `The three cairns on the ridge, west. ${sighted(g)} of three. Same hour each night, mind, or it\'s no use.` },
  cmBack1: { speaker: 'narrator', text: 'Ilse takes the board and runs her finger along your marks, muttering, and draws three lines on a slate that meet in a point. Then she sits down rather suddenly.', next: 'cmBack2' },
  cmBack2: { text: 'There it is. Its path, fixed, the first in the world. Now it wants a name, and I\'ve never named anything but a cat.', next: 'cmBack3' },
  cmBack3: {
    text: 'What shall we call it?',
    options: [
      { text: 'Blewitt\'s Comet. You\'ve counted every star for thirty years. Let one count you.', moral: { id: 'scComet:blewitt', tr: { compassion: 1 }, npc: { ilse: 15 } }, effect: (g) => { g.take('sc_board', 1); g.setFlag(COMET, 'blewitt'); g.addMarks(80); g.setStage(COMET, 'done'); }, next: 'cmB' },
      { text: 'Tom\'s. He ground the glass you found it with.', moral: { id: 'scComet:tom', a: 2, tr: { compassion: 3 }, npc: { ilse: 25 }, note: 'Named a new comet over Scarth for Tom Blewitt, who ground the Watch\'s glass and never saw a star fall.' }, effect: (g) => { g.take('sc_board', 1); g.setFlag(COMET, 'tom'); g.addMarks(80); g.setStage(COMET, 'done'); }, next: 'cmT' },
      { text: 'Let the Kelderby schoolchildren choose. It\'s their sky longer than ours.', need: { trait: { generosity: [57, 100] } }, moral: { id: 'scComet:children', a: 3, tr: { generosity: 3 }, npc: { ilse: 15 }, note: 'Gave the naming of a new comet to the Kelderby schoolchildren.', fame: 'let the Kelderby children name the comet', spread: 'local' }, effect: (g) => { g.take('sc_board', 1); g.setFlag(COMET, 'children'); g.addMarks(90); g.setStage(COMET, 'done'); }, next: 'cmC' },
    ],
  },
  cmB: { text: 'Blewitt\'s. Well. I\'ll write it small. No, I won\'t. I\'ll write it as big as the page will take, and Ansbury can lump it.' },
  cmT: { text: 'Tom\'s Comet. He\'d have pretended he didn\'t like it, and then told everybody at the Bell. Thank you. I\'ll write it tonight.' },
  cmC: { text: 'The children. Heaven help us, they\'ll call it Biscuit. Very well. Whatever they choose goes in the Collegium\'s book in my best hand, and the Collegium can lump that too.' },
  cmAfter: { text: (g) => (g.flag(COMET) === 'children' ? 'They called it the Long Lantern. I\'d braced for Biscuit. Children are better at this than Fellows.' : g.flag(COMET) === 'tom' ? 'Tom\'s is fading now, going out past the sun. It\'ll be back in eighty years. Somebody will look up and say his name.' : 'My comet. My comet! I still say it to myself sometimes, when nobody\'s up here.') },
};

// ================================================================ Snow-Blind

const selaNodes: Record<string, DNode> = {
  pg1: { text: 'A pilgrim came up from Kelderby yesterday to put his hand on the star. He never came in. It snowed in the night, the first real snow.', next: 'pg2' },
  pg2: {
    text: 'The shepherds say they saw a man go down off the south-west side, toward the hollow, walking with his hand over his eyes. Would you look? I\'d go, but somebody has to keep the fire in.',
    options: [{ text: 'I\'ll find him.', effect: (g) => g.setStage(PILGRIM, 'tracks') }, { text: 'Not now.' }],
  },
  pgWait: { text: 'South-west, down toward the hollow. If the snow\'s not covered his tracks.' },
  pgBack: { text: (g) => (g.flag(PILGRIM) === 'robbed' ? 'He never came in. I keep the fire in anyway. You should go.' : 'He came in, or he didn\'t, as you decided. Either way the snow\'s off his eyes. Thank you for going.'), options: [{ text: 'It\'s done.', effect: (g) => { g.addMarks(g.flag(PILGRIM) === 'robbed' ? 0 : 80); g.setStage(PILGRIM, 'done'); } }] },
};

const tobit: DialogueTree = {
  start: (g) => (killed(g, 'scWolves') >= WOLVES.length ? 't1' : 't0'),
  nodes: {
    t0: { text: 'Who\'s there? I can hear them. I can hear them breathing.' },
    t1: { speaker: 'narrator', text: 'A man of thirty sitting in the snow with a strip of his shirt bound over his eyes, a pilgrim\'s staff across his knees, and under his coat the red facings of the Muster.', next: 't2' },
    t2: { text: 'Snow-blind. Stupid. I looked at the sun on the snow too long, trying to see the Kirk. Tobit Cragg. I\'m going to the star.', next: 't3' },
    t3: { text: 'You\'ve seen the coat. I was on the Muster\'s roll at Ansbury. I walked off it at Candlemas, the night before we marched for the Sunder, because I could not do it again. Whatever it is, I could not.', next: 't4' },
    t4: { text: 'They hang a man for that, if Sergeant Holroyd has her way, or flog him into next year. I only want to put my hand on the star first. Then I\'ll know what to do. I think I\'ll know.', next: 't5' },
    t5: {
      text: 'What will you do with me?',
      options: [
        { text: 'Take my arm. I\'ll walk you to the star, and I never saw your coat.', moral: { id: 'scPilgrim:kirk', a: 3, tr: { compassion: 3, deception: 1 }, rep: { muster: -3 }, npc: { sc_tobit: 25, sela: 5 } }, effect: (g) => { g.setFlag(PILGRIM, 'kirk'); g.setStage(PILGRIM, 'sela'); }, next: 'tK' },
        { text: 'You\'re coming to Sergeant Holroyd. You walked away from men who needed you.', moral: { id: 'scPilgrim:muster', tr: { loyalty: 3, honesty: 2, compassion: -2 }, rep: { muster: 8 }, npc: { sc_tobit: -30, mus_holroyd: 10 }, note: 'Took a snow-blind deserter off the Kirk fells back to the Muster.' }, effect: (g) => { g.setFlag(PILGRIM, 'muster'); g.setStage(PILGRIM, 'sela'); }, next: 'tM' },
        { text: 'I\'ll take you to the star. And after, you go back and tell Holroyd yourself, with me beside you.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'scPilgrim:answer', a: 6, tr: { honesty: 3, courage: 2 }, rep: { muster: 3 }, npc: { sc_tobit: 20, mus_holroyd: 10 }, note: 'Walked a deserter to the Glass Kirk\'s star, and then back to the Muster to answer for himself.', major: true, fame: 'walked the deserter Tobit Cragg back to the Muster of his own will', spread: 'local' }, effect: (g) => { g.setFlag(PILGRIM, 'answer'); g.setStage(PILGRIM, 'sela'); }, next: 'tA' },
        { text: '(Take his purse and his boots, and walk away.)', need: { band: ['bad', 'evil'] }, moral: { id: 'scPilgrim:robbed', a: -15, tr: { cruelty: 5, greed: 3 }, npc: { sc_tobit: -40 }, note: 'Robbed a snow-blind pilgrim on the Kirk fells and left him in the snow.', major: true, fame: 'robbed a blind man in the snow below the Glass Kirk', spread: 'local' }, effect: (g) => { g.addMarks(45); g.setFlag(PILGRIM, 'robbed'); g.setStage(PILGRIM, 'sela'); }, next: 'tR' },
      ],
    },
    tK: { speaker: 'narrator', text: 'He takes your arm the way the blind do, light and sure. On the long climb up he doesn\'t say anything. At the star he takes the cloth off his eyes, though he can\'t see, and puts both hands flat on the glass, and stands there until the light goes.' },
    tM: { text: 'Holroyd. Yes. I suppose that\'s right. I suppose somebody has to be right. Lead on; I can\'t see where we\'re going, which is a mercy.' },
    tA: { speaker: 'narrator', text: 'At the star, he puts his hand on it for a long time. On the road down to Ansbury, days later, he says only one thing: "I know what to do now." At the tilt-yard he walks up to Sergeant Holroyd, salutes with the wrong hand, and tells her everything.' },
    tR: { speaker: 'narrator', text: 'He doesn\'t fight. He can\'t see to. He says, "Please," once, and then nothing. Behind you, as you go, you hear him start to crawl uphill toward the Kirk.' },
  },
};

const quests: Record<string, QuestDef> = {
  [COMET]: {
    id: COMET, name: 'A Name for the Comet', region: 'starfall', depth: 'quest',
    notes: (g, s) => (s === 'cairns' ? 'A new comet low in the north. Ilse Blewitt needs its place taken from the three old sighting cairns on the ridge west of Scarth Watch, at the same hour, so whoever fixes its path first can name it.'
      : s === 'ilse' ? 'Three sightings taken. Ilse will want the board back.'
      : g.flag(COMET) === 'children' ? 'The Kelderby children named the comet the Long Lantern.' : g.flag(COMET) === 'tom' ? 'The comet is Tom\'s, for the man who ground the Watch\'s glass.' : 'The comet is Blewitt\'s.'),
    objectives: (g, s) => (s === 'cairns' ? [...CAIRNS.map((_, i) => ({ text: `Take a sighting from the ${['north', 'middle', 'south'][i]} cairn`, done: !!g.flag('scCairn' + i), marker: 'scCairn' + i })), { text: `Clear the shard jellies off the ridge (${Math.min(JELLIES.length, killed(g, 'scJellies'))}/${JELLIES.length})`, done: killed(g, 'scJellies') >= JELLIES.length }]
      : s === 'ilse' ? [{ text: 'Bring the sighting board to Ilse at Scarth Watch', marker: 'ilse' }] : []),
    advance: (g, s) => (s === 'cairns' && sighted(g) >= CAIRNS.length && killed(g, 'scJellies') >= JELLIES.length ? 'ilse' : null),
    marks: (_g, s): Marks => (!s ? { ilse: '!' } : s === 'ilse' ? { ilse: '?' } : {}),
    walk: { cast: ['ilse'], kill: { cairns: [['shardjelly', 2]] } },
  },
  [PILGRIM]: {
    id: PILGRIM, name: 'Snow-Blind', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'tracks') return 'A pilgrim from Kelderby set out for the Glass Kirk\'s star and never came in, and it snowed. The shepherds saw him go down off the south-west side toward the hollow.';
      if (s === 'tobit') return 'The tracks end in the hollow, where the frost wolves are.';
      if (s === 'sela') return 'Tobit Cragg, snow-blind, a deserter from the Muster. Sela at the Kirk should hear how it ended.';
      const f = g.flag(PILGRIM);
      return f === 'kirk' ? 'Tobit put his hand on the star, and I never saw his coat.' : f === 'muster' ? 'I took Tobit back to Sergeant Holroyd.' : f === 'answer' ? 'Tobit went to the star, and then went back to the Muster to answer for himself.' : 'I robbed Tobit Cragg and left him in the snow.';
    },
    objectives: (g, s) => (s === 'tracks' ? TRACKS.map((_, i) => ({ text: `Follow his tracks (${['the slope', 'the drift', 'the hollow\'s lip'][i]})`, done: !!g.flag('scTrack' + i), marker: 'scTrack' + i }))
      : s === 'tobit' ? [{ text: `Drive off the frost wolves (${Math.min(WOLVES.length, killed(g, 'scWolves'))}/${WOLVES.length})`, done: killed(g, 'scWolves') >= WOLVES.length }, { text: 'Talk to the pilgrim', marker: 'sc_tobit' }]
      : s === 'sela' ? [{ text: 'Go back to Sela at the Glass Kirk', marker: 'sela' }] : []),
    advance: (g, s) => (s === 'tracks' && tracked(g) >= TRACKS.length ? 'tobit' : null),
    marks: (g, s): Marks => (!s && at(g, 'scOwen') === 'done' ? { sela: '!' } : s === 'sela' ? { sela: '?' } : {}),
    walk: { cast: ['sela', 'sc_tobit'], kill: { tobit: [['frostwolf', 2]] }, from: { quests: { scOwen: 'done' }, flags: { scOwen: 'told' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'scJellies', type: 'shardjelly', at: JELLIES, when: (g) => at(g, COMET) === 'cairns' },
  { tag: 'scWolves', type: 'frostwolf', at: WOLVES, when: (g) => at(g, PILGRIM) === 'tobit' },
];

const CAIRN_TOASTS = [
  'You lay Ilse\'s board on the flat top-stone, sight along its brass pins, and there it is: a smudge of light with a thread behind it, two notches west of the Pole. You mark it.',
  'The middle cairn. The comet\'s moved a hair against the notches since the last; you mark that too, and the hour.',
  'The south cairn, last. Your fingers are too cold to hold the stylus properly. You mark it anyway, a little shaky. Ilse will complain.',
];
const TRACK_TOASTS = [
  'A man\'s tracks in the new snow, going down off the Kirk\'s shoulder, close together and uneven: somebody walking carefully, who couldn\'t see where he was putting his feet.',
  'Where he fell, and got up, and fell again. A pilgrim\'s badge, a little lead star, lies in the trodden snow.',
  'The tracks go over the lip of the hollow and stop, and so do the wolf tracks that have been following them.',
];

const things: WorldThing[] = [
  ...CAIRNS.map(([x, z], i): WorldThing => ({
    id: 'scCairn' + i, x, z, label: 'Take a sighting', radius: 2.4, look: 'cairn',
    when: (g) => at(g, COMET) === 'cairns' && !g.flag('scCairn' + i),
    use: (g) => { g.setFlag('scCairn' + i, 1); g.toast(CAIRN_TOASTS[i]); },
  })),
  ...TRACKS.map(([x, z], i): WorldThing => ({
    id: 'scTrack' + i, x, z, label: 'Look at the tracks', radius: 2.6, look: 'tracks',
    when: (g) => at(g, PILGRIM) === 'tracks' && !g.flag('scTrack' + i),
    use: (g) => { g.setFlag('scTrack' + i, 1); g.toast(TRACK_TOASTS[i]); },
  })),
];

const NPCS: NpcDef[] = [
  { id: 'sc_tobit', name: 'Tobit Cragg', title: 'A pilgrim', look: { skin: '#e0b48e', hair: '#4a3020', hairStyle: 1, eyes: '#4a4a3a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', cape: '#5a5040', build: 1.0, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [TOBIT.x, TOBIT.z], face: [TOBIT.x, TOBIT.z - 4], anim: 'seated' }], when: (g) => at(g, PILGRIM) === 'tobit', barks: ['Who\'s there?'] },
];

export const SCARTH_KIRK: RegionContent = {
  id: 'scarthKirk',
  items: [{ id: 'sc_board', name: 'Ilse\'s sighting board', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'map', a: '#c8a060', b: '#3a2a1a' }, desc: 'A board of black oak with brass pins along one edge and a rule of notches, for fixing a light in the sky against the Pole.' }],
  npcs: NPCS,
  dialogue: { sc_tobit: tobit },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'ilse', (g) => (at(g, COMET) === 'cairns' ? 'cmWait' : at(g, COMET) === 'ilse' ? 'cmBack1' : undefined), ilseNodes);
    addOption(D, 'ilse', 'main', { text: 'Anything new in the sky?', next: 'cm1', cond: (g) => !at(g, COMET) });
    addOption(D, 'ilse', 'main', { text: 'How\'s the comet?', next: 'cmAfter', cond: (g) => at(g, COMET) === 'done' });
    hook(D, 'sela', (g) => (!at(g, PILGRIM) && at(g, 'scOwen') === 'done' ? 'pg1' : at(g, PILGRIM) === 'tracks' || at(g, PILGRIM) === 'tobit' ? 'pgWait' : at(g, PILGRIM) === 'sela' ? 'pgBack' : undefined), selaNodes);
  },
};
