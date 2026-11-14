import type { DialogueTree, GameApi } from '../../game/api';
import { addOption, at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { ENCHANTS } from '../gear';

// THE MAGES GUILD (owner 2026-11-14: "add mages and fighters guilds around the world, verandah has both"; "questlines
// for them too"). Its hall is the owner\'s own Mages Guild in Verandah, the hall below and the reading rooms above,
// kept by Selina Pendarves, Warden (data/content/verandahHalls.ts has her, Lowdy Bunt the scholar and Peder Trembath,
// third-year apprentice, who has set fire to the same table twice). The Guild keeps what the old kingdom wrote about
// the marks on the standing stones, and teaches it slowly, "because the last time it was taught quickly the old
// kingdom fell". In Ansbury, over the water, the Collegium wants a Charter licence over the same knowledge.
//
// Chapters (each a rank):
//   mgHum      TOUCH NOTHING THAT HUMS (Novice): bring Selina a rubbing from any ring of standing stones.
//   mgPetition THE COLLEGIUM\'S PETITION (Reader): the Collegium petitions the Charter for sole licence over "star
//              crystal, the old words and the weather", which would close the Guild in the Counties. Its Provost,
//              Walter Gilby, quotes a page in it: Lowdy\'s lost page. Trade the Guild\'s readings for it, or carry the
//              proof of the theft to Selina to send to the Speaker. mgPage = 'share' | 'expose'.
//   mgSink     WHERE THE GROUND SINKS (Scribe): three rubbings of three different marks, laid edge to edge, make one
//              line, and the line points to the Kestle Folds, where the turf has been sinking. Shard jellies in the
//              hollow; at its bottom, a stone with the old kingdom\'s lifting mark on it.
//   mgSlow     THE SLOW TEACHING (Magister): Peder copies the lifting mark, and the reading room\'s floor rises an
//              inch and hums. Burn the copy and keep the slow way, or keep it and teach it, carefully, to the
//              Guild. mgEnd = 'burn' | 'teach'.

const HUM = 'mgHum', PETITION = 'mgPetition', SINK = 'mgSink', SLOW = 'mgSlow';

/** The Collegium\'s Provost, by the lecture-room steps in the Guild Ward, Ansbury (the star-crystal lecture\'s shelf). */
const PROVOST = { x: 793.5, z: 182.5 };
/** The sinking ground at the Kestle Folds. */
const HOLLOW = { x: -2352.5, z: 2452.5 };
const SHARDS: [number, number][] = [[-2348, 2447], [-2357, 2449], [-2350, 2458]];

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:mages'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:mages', r); };
const RUBS = Object.keys(ENCHANTS).map((k) => 'rubbing_' + k);
/** How many different marks you carry rubbings of. */
const marks = (g: GameApi) => RUBS.filter((id) => g.count(id) > 0).length;

// ================================================================ Selina Pendarves, Warden (hooked onto her talk)

const selinaNodes: DialogueTree['nodes'] = {
  // I. Touch Nothing That Hums
  mj1: { text: 'Join. Hm. People ask to join the way they ask the time: as if there were an answer that fits in a sentence.', next: 'mj2' },
  mj2: { text: 'The Guild reads the marks the old kingdom cut into its standing stones. We read them slowly. We argue about every line. We don\'t use them unless we must, and we\'re very rarely sure that we must.', next: 'mj3' },
  mj3: { text: 'Bring me a rubbing. Any ring, any stone, charcoal on paper, flat against the mark. If your hand shakes, the line shakes, and I\'ll see it.', next: 'mj4' },
  mj4: { text: 'And touch nothing that hums.', effect: (g) => g.setStage(HUM, 'rub') },
  mjBack: { speaker: 'narrator', text: 'She lays your rubbing on the table under the window and looks at it for a long time, not at the mark, at the edges, where the charcoal thins.', next: 'mjBack2' },
  mjBack2: { text: 'Steady. Good. Most people press too hard at the start and give up at the end. You kept on to the edge of the stone.', next: 'mjBack3' },
  mjBack3: { text: 'Novice of the Mages Guild. You may read upstairs, if Lowdy lets you, and she will, because she\'s lost a page and thinks everyone new might have it.', effect: (g) => { g.setStage(HUM, 'done'); rank(g, 0); g.addMarks(40); } },
  // II. The Collegium\'s Petition
  mp1: { text: 'Read this. It came on the Gullmouth packet.', next: 'mp2' },
  mp2: { speaker: 'narrator', text: 'A printed notice: the Collegium of Ansbury petitions the Charter for the sole licence to teach "the study of star crystal, the old words and the weather" in the Charter Counties. Objections to the Toll Office within the month.', next: 'mp3' },
  mp3: { text: 'Sole licence. Which means our Gullmouth readers stop meeting, and the farmers over there stop sending us the marks they find in their fields. And they quote the old words in their petition. They quote a reading I know.', next: 'mp4' },
  mp4: { text: 'Go to Ansbury. Find the Provost, Walter Gilby, in the Guild Ward. Ask him where he learnt to read a Verandah stone. Be polite. Be very polite. I want to know before I object.', effect: (g) => g.setStage(PETITION, 'provost') },
  mpShare: { text: 'He\'ll give it back, and we give them our readings of the Kestle stones, and both our names go on the work. And the petition becomes a joint one, for a licence to teach, not a licence to forbid.', next: 'mpShare2' },
  mpShare2: { text: 'Lowdy will hate it. Lowdy will also cry when she sees her page. Both things can be true.', next: 'mpDone' },
  mpExpose: { speaker: 'narrator', text: 'She reads the Collegium\'s copy against Lowdy\'s notes, line by line, and her mouth goes thinner with each one.', next: 'mpExpose2' },
  mpExpose2: { text: 'Copied, mistakes and all. Lowdy misreads the third mark the same way every time, and so does the Collegium. I\'ll send both to the Speaker. A petition built on a stolen page won\'t stand.', next: 'mpDone' },
  mpDone: { text: 'Reader of the Guild. You\'ve a seat upstairs now, by the window. Don\'t let Peder have it.', effect: (g) => { g.setStage(PETITION, 'done'); rank(g, 1); g.addMarks(80); } },
  // III. Where the Ground Sinks
  ms1: { text: 'Lowdy has a notion. Lowdy has a notion most weeks, but this one I can\'t argue with, which annoys me.', next: 'ms2' },
  ms2: { text: 'She thinks the rings aren\'t separate. She thinks each ring carries one piece of a longer mark, and if you lay the pieces side by side the line goes on from stone to stone, ring to ring, across the country.', next: 'ms3' },
  ms3: { text: 'Bring her three rubbings of three different marks, from three rings. Then we\'ll see if she\'s mad or right. With Lowdy it\'s usually both.', effect: (g) => g.setStage(SINK, 'rubs') },
  msBack: { speaker: 'narrator', text: 'Selina turns the stone over in her hands. The mark cut into it is deep and old, and where your thumb crosses it the stone goes faintly warm.', next: 'msBack2' },
  msBack2: { text: 'The lifting mark. The old kingdom raised its halls on stones like this one, and when the marks failed, the halls came down. The Kestle ground was sinking because the stone under it was dying.', next: 'msBack3' },
  msBack3: { text: 'Scribe of the Guild: you\'ve found something we\'ve only ever argued about. Lock it in the case. Don\'t tell Peder.', effect: (g) => { g.take('mg_lift_stone', 1); g.setStage(SINK, 'done'); rank(g, 2); g.addMarks(120); } },
  // IV. The Slow Teaching
  sl1: { text: 'Someone told Peder.', next: 'sl2' },
  sl2: { text: 'He copied the mark off the stone while Lowdy was at dinner, onto a blank, and set it in the reading-room floor to see what it did. Now the floor is an inch higher than it was this morning, and humming, and he\'s sitting in the middle of it looking very pleased and very frightened.', next: 'sl3' },
  sl3: { text: 'Go up and look. Then tell me what we do. I\'ve decided to let you decide. It\'s the cruellest thing I\'ve ever done to anyone.', effect: (g) => g.setStage(SLOW, 'floor') },
  slEnd: {
    text: (g) => (g.flag('mgEnd') === 'burn'
      ? 'Burnt. The stone in the case and the copy in the grate, and the floor settling an inch a day. Slowly. The old way. I hope we\'re right. Magister of the Mages Guild: you\'ll keep the case\'s key.'
      : 'Kept, and taught. To the third-years first, in the cellar, one hour a week, with me in the room and a bucket of sand by the door. The fastest any of this has been taught in three hundred years. Magister of the Mages Guild: you\'ll keep the case\'s key.'),
    effect: (g) => { g.setStage(SLOW, 'done'); rank(g, 3); g.addMarks(200); g.give('mg_magister_staff', 1); },
  },
};

const selinaStart = (g: GameApi): string | null => {
  const h = at(g, HUM), p = at(g, PETITION), s = at(g, SINK), w = at(g, SLOW);
  if (h === 'back') return 'mjBack';
  if (h === 'done' && !p) return 'mp1';
  if (p === 'back') return g.flag('mgPage') === 'share' ? 'mpShare' : 'mpExpose';
  if (p === 'done' && !s) return 'ms1';
  if (s === 'back') return 'msBack';
  if (s === 'done' && !w) return 'sl1';
  if (w === 'back') return 'slEnd';
  return null;
};

// ================================================================ Lowdy Bunt and Peder Trembath

const lowdyNodes: DialogueTree['nodes'] = {
  lr1: { text: 'Three? Three different? Give them here. Don\'t breathe on them.', next: 'lr2' },
  lr2: { speaker: 'narrator', text: 'She lays them edge to edge on the reading table, turns one, then another, then the first again. Then she stops moving altogether.', next: 'lr3' },
  lr3: { text: 'There. Do you see? The stroke runs off the edge of this one and on to the next. It\'s one line. It was always one line. Every ring in the country is a word in a sentence, and we\'ve been reading single letters for three hundred years.', next: 'lr4' },
  lr4: { text: 'And the line points. North and east, from here. Kestle. The folds above Kestle, where the shepherds say the turf\'s been sinking all year. Go and look. Take a lantern. Take a friend.', effect: (g) => g.setStage(SINK, 'hollow') },
};

const pederNodes: DialogueTree['nodes'] = {
  pf1: { speaker: 'narrator', text: 'The reading-room floor stands an inch proud of the doorsill, every board of it, as if it had taken a breath. It hums, very low, so that you feel it in your teeth before you hear it. Peder sits cross-legged in the middle, with a blank in his lap and charcoal to his elbows.', next: 'pf2' },
  pf2: { text: 'I know. I know. But look at it. It\'s been three hundred years since anyone made a floor do that, and I did it before lunch.', next: 'pf3' },
  pf3: { text: 'If we teach it, every mason in Verandah could build on bog. The Kestle folds wouldn\'t sink. Nobody\'s house would. And if we burn it, it waits another three hundred years for somebody braver than me to be stupider than me.', next: 'pf4' },
  pf4: {
    text: 'What do I tell the Warden?',
    options: [
      { text: 'Burn the copy. Some things are slow for a reason.', effect: (g) => { g.setFlag('mgEnd', 'burn'); g.setStage(SLOW, 'back'); }, next: 'pb1' },
      { text: 'Keep it. Teach it slowly, but teach it.', effect: (g) => { g.setFlag('mgEnd', 'teach'); g.setStage(SLOW, 'back'); }, next: 'pt1' },
    ],
  },
  pb1: { text: 'Yes. I thought you\'d say that. I think I wanted you to.', next: 'pb2' },
  pb2: { speaker: 'narrator', text: 'He holds the blank a moment longer, then gets up and carries it down the stairs to the grate himself, both hands, like something that might spill.' },
  pt1: { text: 'Slowly. Yes. I can be slow. I can learn to be slow. Will you tell her? I\'ll stand behind you. A bit behind.' },
};

// ================================================================ Walter Gilby, Provost of the Collegium

const gilby: DialogueTree = {
  start: (g) => (at(g, PETITION) === 'provost' ? 'g1' : at(g, PETITION) === 'done' && g.flag('mgPage') === 'share' ? 'after' : 'idle'),
  nodes: {
    idle: { text: 'The Collegium lectures at ten. Fellows only, unless you\'ve paid.' },
    after: { text: 'Your Warden\'s readings of the Kestle stones are better than ours. I\'ve told the Fellows so. Twice. It was very good for them.' },
    g1: { speaker: 'narrator', text: 'A tall man in a scholar\'s black, with ink on his cuffs and a good deal of patience on his face, the kind that has been practised.', next: 'g2' },
    g2: { text: 'Walter Gilby, Provost. From Verandah? The Mages Guild, then. You\'ve read our petition.', next: 'g3' },
    g3: {
      text: 'You want to know where the Collegium learnt to read a Verandah stone.',
      options: [
        { text: 'From a page that went missing from our reading room.', next: 'g4' },
        { text: 'I want to know why a licence to teach has to be a licence to forbid.', next: 'gWhy' },
      ],
    },
    gWhy: { text: 'Because the Charter only gives one kind. The Toll Office doesn\'t know what we study. It knows what a monopoly is. It\'s the only shape of paper it has.', next: 'g4' },
    g4: { speaker: 'narrator', text: 'He goes to a shelf without looking and comes back with a single page, foxed at the corners, in a hand that isn\'t his: Lowdy Bunt\'s, with her third mark read wrong as it always is.', next: 'g5' },
    g5: { text: 'A sailor sold it to one of our Fellows for a shilling. I knew whose it was the day I read it. Nobody in the Counties reads the Kestle stones; I assumed it came from your Guild, and I assumed you\'d want it back, and I didn\'t hurry.', next: 'g6' },
    g6: {
      text: 'So. What would the Mages Guild like?',
      options: [
        { text: 'Give it back, and put both our names on the work. A licence to teach, together.', effect: (g) => { g.setFlag('mgPage', 'share'); g.give('mg_page', 1); g.setStage(PETITION, 'back'); }, next: 's1' },
        { text: 'I\'ll take this copy to the Warden, and she\'ll take it to the Speaker.', effect: (g) => { g.setFlag('mgPage', 'expose'); g.give('mg_page', 1); g.setStage(PETITION, 'back'); }, next: 'x1' },
      ],
    },
    s1: { text: 'Together. That will cost me a quarrel with every Fellow on the board, and I find I\'d like it. Take the page. Tell your Warden I\'ll write.' },
    x1: { text: 'Hm. Then you\'ll do what you think is right, and so shall I. Take it. It was never ours.', next: 'x2' },
    x2: { speaker: 'narrator', text: 'He hands it over without any fuss at all, which is somehow worse.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [HUM]: {
    id: HUM, name: 'Touch Nothing That Hums', region: 'verandah', depth: 'storyline',
    notes: (g, s) => (s === 'rub' ? 'Selina Pendarves, Warden of the Mages Guild, wants a rubbing from a ring of standing stones, any ring, before she\'ll take me in.' : s === 'back' ? 'I have a rubbing. Back to Selina.' : s === 'done' ? 'Selina took me into the Mages Guild as a Novice. I may read upstairs.' : ''),
    objectives: (g, s) => (s === 'rub' ? [{ text: 'Take a rubbing from a ring of standing stones', done: marks(g) > 0 }] : s === 'back' ? [{ text: 'Bring it to Selina Pendarves', marker: 'ver_pendarves' }] : []),
    advance: (g, s) => (s === 'rub' && marks(g) > 0 ? 'back' : null),
    marks: (g, s): Marks => (!s ? { ver_pendarves: '!' } : s === 'back' ? { ver_pendarves: '?' } : {}),
    walk: { cast: ['ver_pendarves'], auto: { rub: 'back' } },
  },
  [PETITION]: {
    id: PETITION, name: 'The Collegium\'s Petition', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'provost' ? 'The Collegium of Ansbury has petitioned the Charter for sole licence over star crystal, the old words and the weather. It quotes a reading Selina knows. I\'m to ask the Provost, Walter Gilby, in the Guild Ward, where he learnt it.'
      : s === 'back' ? (g.flag('mgPage') === 'share' ? 'Gilby had Lowdy\'s lost page, bought off a sailor. He gave it back, and will put the Collegium\'s name beside the Guild\'s. Back to Selina.' : 'Gilby had Lowdy\'s lost page, bought off a sailor. I have it, for Selina to send to the Speaker.')
      : s === 'done' ? 'Lowdy has her page back. I\'m a Reader of the Mages Guild.' : ''),
    objectives: (g, s) => (s === 'provost' ? [{ text: 'Find Walter Gilby, Provost of the Collegium, in the Guild Ward, Ansbury', marker: 'mg_gilby' }] : s === 'back' ? [{ text: 'Go back to Selina Pendarves in Verandah', marker: 'ver_pendarves' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, HUM) ? { ver_pendarves: '!' } : {}) : s === 'provost' ? { mg_gilby: '?' } : s === 'back' ? { ver_pendarves: '?' } : {}),
    walk: { from: { quests: { [HUM]: 'done' }, flags: { 'fac:mages': 0 } }, cast: ['ver_pendarves', 'mg_gilby'] },
  },
  [SINK]: {
    id: SINK, name: 'Where the Ground Sinks', region: 'verandah', depth: 'storyline',
    notes: (g, s) => ({
      rubs: 'Lowdy Bunt thinks every ring of stones carries one piece of a longer mark. She wants rubbings of three different marks, from three rings.',
      lowdy: 'I have rubbings of three different marks. Lowdy is waiting in the reading room.',
      hollow: 'Laid edge to edge, the rubbings make one line, and it points to the folds above Kestle, where the turf has been sinking all year.',
      search: 'The hollow at the Kestle Folds is clear. Something lies at its bottom.',
      back: 'At the bottom of the hollow, a stone cut with the old kingdom\'s lifting mark, warm under the thumb. For Selina.',
      done: 'The lifting mark is locked in the Guild\'s case. I\'m a Scribe of the Mages Guild.',
    } as Record<string, string>)[s ?? ''] ?? '',
    objectives: (g, s) => {
      if (s === 'rubs') return [{ text: `Take rubbings of three different marks (${Math.min(3, marks(g))}/3)`, done: marks(g) >= 3 }];
      if (s === 'lowdy') return [{ text: 'Bring the rubbings to Lowdy Bunt, upstairs at the Guild', marker: 'ver_bunt' }];
      if (s === 'hollow') return [{ text: `Clear the shard jellies from the hollow at the Kestle Folds (${Math.min(3, kills(g, 'mgShard'))}/3)`, marker: 'mgHollowSpot' }];
      if (s === 'search') return [{ text: 'Search the bottom of the hollow', marker: 'mgStone' }];
      if (s === 'back') return [{ text: 'Bring the stone to Selina Pendarves', marker: 'ver_pendarves' }];
      return [];
    },
    advance: (g, s) => (s === 'rubs' && marks(g) >= 3 ? 'lowdy' : s === 'hollow' && kills(g, 'mgShard') >= SHARDS.length ? 'search' : null),
    marks: (g, s): Marks => (!s ? (done(g, PETITION) ? { ver_pendarves: '!' } : {}) : s === 'lowdy' ? { ver_bunt: '?' } : s === 'back' ? { ver_pendarves: '?' } : {}),
    walk: { from: { quests: { [HUM]: 'done', [PETITION]: 'done' }, flags: { 'fac:mages': 1 } }, cast: ['ver_bunt'], auto: { rubs: 'lowdy', hollow: 'search' } },
  },
  [SLOW]: {
    id: SLOW, name: 'The Slow Teaching', region: 'verandah', depth: 'storyline',
    notes: (g, s) => (s === 'floor' ? 'Peder Trembath copied the lifting mark and set it in the reading-room floor, which has risen an inch and hums. Selina has left the decision to me.'
      : s === 'back' ? 'I\'ve told Peder. Selina is waiting.'
      : s === 'done' ? (g.flag('mgEnd') === 'burn' ? 'The lifting mark\'s copy went in the grate. The Guild keeps the slow way. I\'m its Magister.' : 'The Guild keeps the lifting mark, and teaches it slowly, in the cellar, with sand by the door. I\'m its Magister.') : ''),
    objectives: (g, s) => (s === 'floor' ? [{ text: 'Go up to the reading room and talk to Peder Trembath', marker: 'ver_trembath' }] : s === 'back' ? [{ text: 'Tell Selina Pendarves', marker: 'ver_pendarves' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, SINK) ? { ver_pendarves: '!' } : {}) : s === 'floor' ? { ver_trembath: '?' } : s === 'back' ? { ver_pendarves: '?' } : {}),
    walk: { from: { quests: { [HUM]: 'done', [PETITION]: 'done', [SINK]: 'done' }, flags: { 'fac:mages': 2 } }, cast: ['ver_trembath', 'ver_pendarves'] },
  },
};

// ================================================================ The world

const spawns: QuestSpawn[] = [{ tag: 'mgShard', type: 'shardjelly', at: SHARDS, when: (g) => at(g, SINK) === 'hollow' }];

const things: WorldThing[] = [
  { id: 'mgHollowSpot', x: HOLLOW.x, z: HOLLOW.z, label: 'The sinking hollow', radius: 0, look: 'none', when: () => false },
  {
    id: 'mgStone', x: HOLLOW.x, z: HOLLOW.z, label: 'Search the bottom of the hollow', radius: 2.6, look: 'trampled',
    when: (g) => at(g, SINK) === 'search',
    use: (g) => {
      if (!g.give('mg_lift_stone', 1)) { g.toast('Your pack is full.'); return; }
      g.setStage(SINK, 'back');
      g.toast('Under the sunk turf, a flat stone the size of a loaf, cut deep with a mark that matches the end of Lowdy\'s line. Where your thumb crosses it, it is warm, and very faintly, it hums.');
    },
  },
];

const NPCS_M: NpcDef[] = [
  { id: 'mg_gilby', name: 'Walter Gilby', title: 'Provost of the Collegium', look: { skin: '#e8c4a0', hair: '#5a4a3a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#1e1a1e', trim: '#5a2a4a', trousers: '#1e1a1e', boots: '#141210', cape: '#1e1a1e', build: 0.88, height: 1.06, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [PROVOST.x, PROVOST.z], face: [PROVOST.x - 2, PROVOST.z - 2], anim: 'idle' }], barks: ['Lectures at ten.', 'Fellows only.'] },
];

const ITEMS_M: ItemDef[] = [
  { id: 'mg_page', name: 'Lowdy Bunt\'s lost page', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8dcc0' }, desc: 'A reading of the Kestle stones in Lowdy Bunt\'s hand, foxed at the corners, the third mark read wrong as she always reads it.' },
  { id: 'mg_lift_stone', name: 'A stone with the lifting mark', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'ore', a: '#8a8a92', b: '#c8a050' }, desc: 'A flat stone the size of a loaf from under the Kestle Folds, cut deep with one of the old kingdom\'s marks. It is warm, and very faintly, it hums.' },
  {
    id: 'mg_magister_staff', name: 'The Magister\'s staff', kind: 'weapon', rarity: 'epic', stack: false, value: 400, icon: { shape: 'rod', a: '#3a2a1e', b: '#c8a050' },
    desc: 'Blackthorn shod with brass, the old kingdom\'s marks burnt down its length by every Magister who has carried it, the last of them in your hand.',
    weapon: { damage: 6, speed: 1, held: 'sword', reach: 0.5 }, stats: 'Damage +6, reach +0.5.',
  },
];

export const MAGES_GUILD: RegionContent = {
  id: 'magesGuild',
  items: ITEMS_M,
  npcs: NPCS_M,
  dialogue: { mg_gilby: gilby },
  quests,
  spawns,
  things,
  hooks: (D) => {
    const s = D.ver_pendarves;
    if (s) {
      const s0 = s.start;
      s.start = (g) => selinaStart(g) ?? (typeof s0 === 'function' ? s0(g) : s0);
      Object.assign(s.nodes, selinaNodes);
      addOption(D, 'ver_pendarves', 'hello', { text: 'I want to join the Guild.', cond: (g) => !at(g, HUM), next: 'mj1' });
    }
    D.ver_bunt ??= { start: () => 'idle', nodes: { idle: { text: 'Shh. I\'ve lost my page. Every book in this room disagrees with the one next to it.' } } };
    const l = D.ver_bunt, l0 = l.start;
    l.start = (g) => (at(g, SINK) === 'lowdy' ? 'lr1' : typeof l0 === 'function' ? l0(g) : l0);
    Object.assign(l.nodes, lowdyNodes);
    D.ver_trembath ??= { start: () => 'idle', nodes: { idle: { text: 'It\'s meant to be blue. It\'s green. Don\'t tell the Warden.' } } };
    const p = D.ver_trembath, p0 = p.start;
    p.start = (g) => (at(g, SLOW) === 'floor' ? 'pf1' : typeof p0 === 'function' ? p0(g) : p0);
    Object.assign(p.nodes, pederNodes);
  },
};
