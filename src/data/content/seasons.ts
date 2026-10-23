import type { DialogueTree, GameApi } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { WorldThing } from '../places_regional';
import type { RegionContent } from './types';
import { at, killed, type Marks } from './kit';
import { FESTIVALS, festivalAt, type FestivalId } from '../festivals';

// The festivals' stories (data/seasons.ts has their rounds and bosses): each fair brings someone to
// Hollin Ford's square with a small job round the vale, which ends at the festival's boss, and a
// hat for the wardrobe. They're there only while their fair is on, and come back every year; the
// story itself is done once.

/** Where the festival's person stands: on the Lantern path where it leaves the square. */
const POST: [number, number] = [148.5, 191.5], FACE: [number, number] = [153, 187];

interface Story {
  fest: FestivalId;
  quest: string;
  name: string;
  npc: { id: string; name: string; title: string; look: Partial<Appearance>; barks: string[] };
  boss: string;
  bossWhere: string;
  hat: string;
  token: string;
  /** Three things to do round the vale: where, the prompt, and what it says. */
  tasks: { at: [number, number]; label: string; text: string }[];
  taskObjective: string;
  bossObjective: string;
  lines: { intro: string[]; ask: string; task: string; boss: string; back: string[]; done: string };
  notes: { task: string; boss: string; back: string };
}

const STORIES: Story[] = [
  {
    fest: 'shrove', quest: 'festShrove', name: 'The Pancake Bell', boss: 'jackalent', bossWhere: 'the Wetlings green, from eleven', hat: 'hat_fool', token: 'pancake_token',
    npc: { id: 'fest_hannah', name: 'Hannah Brock', title: 'Rings the pancake bell', look: { skin: '#f0cfb0', hair: '#c8a060', hairStyle: 7, tunic: '#c8401e', trim: '#f2d75a', trousers: '#3a3428', boots: '#2a1e14', apron: true, lashes: true, freckles: true, age: 0.3 }, barks: ['Eleven o\'clock, the bell.', 'Has anyone seen my pans?'] },
    tasks: [
      { at: [112.5, 186.5], label: 'Ask for the pan back', text: 'A frying pan, black with years of Shrove Tuesdays. "Tell her I\'ll want it back Wednesday," they say, and laugh.' },
      { at: [190.5, 213.5], label: 'Ask for the pan back', text: 'The pan is hanging by the door with a pancake still in it from last year. You knock it out.' },
      { at: [126.5, 200.5], label: 'Ask for the pan back', text: 'They hand it over with a list of what Hannah owes them, which is mostly eggs.' },
    ],
    taskObjective: 'Bring back Hannah\'s frying pans for the race', bossObjective: 'Bring down Jack-a-Lent on the Wetlings green (from eleven, realm time)',
    lines: {
      intro: ['Hannah Brock. I ring the pancake bell at eleven, and then everyone runs.', 'We race with a pan and a pancake, tossing it as we go. Drop it and you go back to the start.', 'I\'ve three pans lent out round the vale, and not one of them has come back.'],
      ask: 'Would you fetch them? Then you can race. Or watch. Watching\'s allowed.',
      task: 'Three pans. West road, the Wetlings track and the mill lane. People borrow pans and forget they did.',
      boss: "Jack-a-Lent got down off his pole on the Wetlings green. We throw things at him every year. This year he's throwing them back.",
      back: ['You knocked him down. He\'s back on his pole now, and very quiet.', 'Here. Every year somebody wears the fool\'s cap for the day. This year it\'s you.'],
      done: 'Next year I\'m keeping the pans in a chest. With a lock.',
    },
    notes: { task: 'Hannah Brock rings the pancake bell for the Shrovetide race. Three of her frying pans are lent out round the vale.', boss: 'The race went off; then Jack-a-Lent, the straw man on the Wetlings green, got down off his pole.', back: 'Jack-a-Lent is back on his pole. Hannah will want to hear.' },
  },
  {
    fest: 'lambing', quest: 'festLambing', name: 'Three Ewes', boss: 'reynard', bossWhere: 'the fold below Ashcroft, at dusk', hat: 'hat_garland', token: 'fair_ribbon',
    npc: { id: 'fest_ezra', name: 'Ezra Dunn', title: 'Shepherd', look: { skin: '#c8906a', hair: '#5a4a3a', hairStyle: 3, facial: 3, tunic: '#6a5a3a', trim: '#c8b890', trousers: '#4a4034', boots: '#2a1e14', hat: 'wide', hatColor: '#4a3a2a', cape: '#5a4a32', age: 0.6 }, barks: ['Three ewes.', 'Not a minute\'s sleep since March.'] },
    tasks: [
      { at: [130.5, 146.5], label: 'Look in on the ewe', text: 'She\'s in the lee of a bank with twins, both up and sucking. She looks at you as if you\'re late.' },
      { at: [151.5, 224.5], label: 'Look in on the ewe', text: 'One lamb, big, and already trying to butt you. Ezra will want to know it\'s a tup.' },
      { at: [112.5, 241.5], label: 'Look in on the ewe', text: 'She\'s lambing as you get there. You stay back. It\'s a ewe lamb, and it stands at the third try.' },
    ],
    taskObjective: 'Find Ezra\'s three ewes on the hill', bossObjective: 'Drive off Red Reynard at the fold below Ashcroft (dusk, realm time)',
    lines: {
      intro: ['Ezra Dunn. Shepherd. Lambing, which means I\'ve slept four hours since the fair started.', 'Three of my ewes went up the hill to lamb on their own. They do that. They think they know best.', 'Usually they do. But there\'s a fox about this spring the size of a calf.'],
      ask: 'Go up and look in on them for me? Spill path, the Lantern path, and the west side of the farm.',
      task: 'Three ewes. Don\'t try to move them. Just tell me they\'re standing and the lambs are sucking.',
      boss: 'All three lambed? Good. Then he\'ll come tonight, at dusk, to the fold below Ashcroft. Red Reynard. I\'ve seen his tracks. Bring a stick.',
      back: ['Six lambs, and every one of them still here in the morning. That\'s a good spring.', 'My daughter made this for whoever helped. She said to say it\'s not for me.'],
      done: 'If you\'re ever passing at lambing, I\'ll have tea on. I won\'t be awake to pour it.',
    },
    notes: { task: 'Ezra Dunn\'s three ewes have gone up the hill to lamb on their own, and there\'s a big fox about.', boss: 'All three ewes have lambed. Red Reynard will come for the lambs at the fold below Ashcroft at dusk.', back: 'Red Reynard has gone off. Ezra will want to hear.' },
  },
  {
    fest: 'midsummer', quest: 'festMidsummer', name: 'Fern Seed', boss: 'hob', bossWhere: 'the Hollow Oak, after ten at night', hat: 'hat_antlers', token: 'watch_ember',
    npc: { id: 'fest_kezia', name: 'Kezia Lusk', title: 'Herb-woman', look: { skin: '#d8a882', hair: '#2a2a2a', hairStyle: 9, tunic: '#4a5a2a', trim: '#e8a020', trousers: '#3a3428', boots: '#2a1e14', cape: '#3a4a2a', hat: 'kerchief', hatColor: '#6a7a3a', lashes: true, age: 0.65 }, barks: ['Midsummer night.', 'Fern seed doesn\'t wait.'] },
    tasks: [
      { at: [110.5, 128.5], label: 'Shake the fern', text: 'You hold the cloth under the frond and shake it. Something like brown dust falls, and a little of it glows.' },
      { at: [201.5, 160.5], label: 'Shake the fern', text: 'A good fern, chest high. The cloth comes away with a pinch of gold in its fold.' },
      { at: [80.5, 186.5], label: 'Shake the fern', text: 'The last fern. As you fold the cloth, something laughs in the hedge behind you, and goes.' },
    ],
    taskObjective: 'Shake fern seed from three ferns round the vale', bossObjective: 'Get the seed back from the Hob at the Hollow Oak (after ten at night, realm time)',
    lines: {
      intro: ['Kezia Lusk. I make up remedies, and on Midsummer night I collect what I can\'t buy.', 'Fern seed. It only falls tonight, and only into a cloth held under the frond. Don\'t ask me why. I didn\'t make the rules.', 'My knees won\'t take me round the vale this year.'],
      ask: 'Will you go? Take a cloth. Spill path, the Pit road, and out along the west road.',
      task: 'Three ferns. Hold the cloth under them and shake. If anything laughs at you, keep going.',
      boss: 'Something laughed? Then he\'s had it out of your cloth already. The Hob. He takes it to the Hollow Oak, in Hagworm Wood, after ten. Go and get it back.',
      back: ['That\'s it. That\'s fern seed. Three years I haven\'t had any.', 'The watch dance round the last fire at dawn in these. You\'ve earned a dance.'],
      done: 'If the Hob asks after me, I\'m not in.',
    },
    notes: { task: 'Kezia Lusk wants fern seed, which falls only on Midsummer night, from three ferns round the vale.', boss: 'Something laughed in the hedge. The Hob has the seed, and takes it to the Hollow Oak after ten at night.', back: 'The fern seed is back. Kezia will want it.' },
  },
  {
    fest: 'harvest', quest: 'festHarvest', name: 'The Last Sheaf', boss: 'cornwolf', bossWhere: 'the fields by Cotter\'s End, in the afternoon', hat: 'hat_sheaf', token: 'corn_dolly',
    npc: { id: 'fest_nathaniel', name: 'Nathaniel Crouch', title: 'Farmer', look: { skin: '#c88a62', hair: '#8a6a4a', hairStyle: 2, facial: 5, tunic: '#7a5a3a', trim: '#d8a040', trousers: '#4a3a2c', boots: '#2a1e14', hat: 'straw', build: 1.12, age: 0.55 }, barks: ['The last sheaf.', 'Mind the stubble.'] },
    tasks: [
      { at: [151.5, 212.5], label: 'Cut the last sheaf', text: 'You cut it and stand it up. Everyone stops work to watch, because whoever cuts the last sheaf is lucky, or cursed, depending who you ask.' },
      { at: [136.5, 241.5], label: 'Plait the corn dolly', text: 'The old woman at the gate shows you the plait twice and then does it for you, sighing.' },
      { at: [184.5, 226.5], label: 'Hang the dolly over the barn door', text: 'You hang it on the nail where last year\'s hung. Last year\'s comes down to be burned at the supper.' },
    ],
    taskObjective: 'Cut the last sheaf, plait it and hang it', bossObjective: 'Bring down the Corn Wolf in the fields by Cotter\'s End (afternoon, realm time)',
    lines: {
      intro: ['Nathaniel Crouch. My field\'s the last one in. One sheaf left standing, and nobody will cut it.', 'They say the corn wolf runs ahead of the reapers and hides in the last sheaf. Whoever cuts it lets him out.', 'I don\'t believe it. I\'d just rather it was someone else.'],
      ask: 'Cut it for me? Then it gets plaited into a dolly and hung over the barn. I\'ll owe you a supper.',
      task: 'The sheaf\'s at the top of the Lantern path. Then the dolly, then the barn by the Wetlings track.',
      boss: "Something ran out of the stubble when you cut it. East, toward Cotter's End. It'll be in the fields there of an afternoon.",
      back: ['They\'re calling you the one who killed the corn wolf. I\'d keep quiet about that at the supper.', 'The harvest crown goes to whoever brings the last sheaf in. Strictly that\'s me. Take it.'],
      done: 'Next year I\'m cutting the last sheaf first.',
    },
    notes: { task: 'Nathaniel Crouch wants the last sheaf of his harvest cut, plaited and hung, and nobody else will cut it.', boss: 'Something came out of the last sheaf and ran east to the fields by Cotter\'s End.', back: 'The Corn Wolf is dead. Nathaniel owes me a supper.' },
  },
  {
    fest: 'lantern', quest: 'festLantern', name: 'The Lantern Man', boss: 'lanternman', bossWhere: 'the Lantern, after eight at night', hat: 'hat_turnip', token: 'wake_candle',
    npc: { id: 'fest_absalom', name: 'Absalom Pinnock', title: 'The Wake bellman', look: { skin: '#e2b894', hair: '#dedad2', hairStyle: 0, facial: 6, tunic: '#2a2430', trim: '#e8701a', trousers: '#22201c', boots: '#141210', cape: '#1e1a22', hat: 'wide', hatColor: '#1a1418', age: 0.9, build: 0.92, height: 1.05 }, barks: ['Light one for them.', 'He walks on the Wake nights.'] },
    tasks: [
      { at: [171.5, 185.5], label: 'Light a candle on the bridge', text: 'You light it and stand it on the parapet. Down on the water, its reflection doesn\'t move with the current.' },
      { at: [147.5, 200.5], label: 'Light a candle on the Lantern path', text: 'The wind drops while you light it, and picks up again when you\'re done.' },
      { at: [96.5, 246.5], label: 'Light a candle at the foot of the ridge', text: 'The last one. Up on the ridge the old Lantern is dark against the sky. Then, for a moment, it isn\'t.' },
    ],
    taskObjective: 'Light the candle path to the Lantern', bossObjective: 'Face the Lantern Man at the Lantern (after eight at night, realm time)',
    lines: {
      intro: ['Absalom Pinnock. I ring the bell for the Wake, so the dead know which way is home.', 'On the fens they have a thing they call the Lantern Man. A light that walks, and calls, and leads you off the path into the water.', 'This year he\'s come up the Wend. Two people in Ashcroft have followed a light and come back soaked to the neck.'],
      ask: 'He doesn\'t like a straight path of candles. Light one for me on the bridge, one on the Lantern path, and one at the foot of the ridge.',
      task: 'The bridge, the Lantern path, the foot of the ridge. Don\'t look at any light that isn\'t yours.',
      boss: 'You saw the Lantern light up. That\'s him. He\'s made his home in the old signal tower. Go up after eight, when he walks, and put him out.',
      back: ['The bell rang true tonight. First time this Wake. That\'s how I know.', 'Here. Carve one, light it, wear it home. He won\'t come near a light that\'s already lit.'],
      done: 'Say a name when you eat your soul cake. Any name. Someone\'s listening for it.',
    },
    notes: { task: 'Absalom Pinnock rings the Wake bell. The Lantern Man, a fen light that leads people into the water, has come up the Wend. A straight path of candles keeps him off it.', boss: 'The old Lantern lit up. The Lantern Man has made his home in the signal tower, and walks after eight at night.', back: 'The Lantern Man is out. Absalom will want to know.' },
  },
  {
    fest: 'goose', quest: 'festGoose', name: 'Jack\'s Wives', boss: 'gander', bossWhere: 'the Waystation green, in the morning', hat: 'hat_feathered', token: 'goose_quill',
    npc: { id: 'fest_martha', name: 'Martha Gooding', title: 'Goose-girl', look: { skin: '#f0cfb0', hair: '#7a3a1e', hairStyle: 5, tunic: '#e8e0c8', trim: '#a0522d', trousers: '#4a3a2c', boots: '#2a1e14', apron: true, hat: 'kerchief', hatColor: '#a0522d', lashes: true, freckles: true, age: 0.2 }, barks: ['Three geese.', 'He\'s worse than they are.'] },
    tasks: [
      { at: [262.5, 194.5], label: 'Catch the goose', text: 'She\'s in the ditch by the east road, eating something she shouldn\'t. She comes quietly, for a goose.' },
      { at: [210.5, 146.5], label: 'Catch the goose', text: 'Halfway up the Pit road, hissing at the miners. The miners are very glad to see you.' },
      { at: [40.5, 190.5], label: 'Catch the goose', text: 'Out on the west road, walking toward the coast as if she has somewhere to be.' },
    ],
    taskObjective: 'Catch Old Hissing Jack\'s three wives', bossObjective: 'Catch Old Hissing Jack at the Waystation green (morning, realm time)',
    lines: {
      intro: ['Martha Gooding. I walk my father\'s geese to the Goose Fair every year. Sixty of them. Sixty-four, last count.', 'Three got loose in the vale. Not any three. Old Hissing Jack\'s wives.', 'He\'s our gander. He\'s won the fair four years. When his wives go, so does he, and he bites.'],
      ask: 'Would you round them up? East road, the Pit road, and out on the west road.',
      task: 'Three geese. Pick them up from behind. If one goes for you, give it your hat to bite. They like hats.',
      boss: 'You got them? Then he\'s gone to find them, and he went the wrong way. He\'s at the Waystation, on the green, in the morning, frightening the coaches.',
      back: ['He\'s back in the pen and sulking. That means he\'ll win again.', 'A goose fair hat, with one of his quills. He dropped a few while you were at it.'],
      done: 'Sixty-four geese. Sixty-five, if you count Jack twice. Everyone does.',
    },
    notes: { task: 'Martha Gooding walks her father\'s geese to the Goose Fair. Old Hissing Jack\'s three wives have got loose round the vale.', boss: 'The three geese are caught. Old Hissing Jack went looking for them and is at the Waystation green in the mornings.', back: 'Old Hissing Jack is back in his pen. Martha will want to hear.' },
  },
  {
    fest: 'frostfair', quest: 'festFrost', name: 'Thin Ice', boss: 'oldrime', bossWhere: 'the shore of Peg\'s Water, in the evening', hat: 'hat_bobble', token: 'frost_penny',
    npc: { id: 'fest_prudence', name: 'Prudence Holt', title: 'Fair-warden of the ice', look: { skin: '#e2b894', hair: '#4a2a18', hairStyle: 1, tunic: '#b0202a', trim: '#cfe8f4', trousers: '#2a2a30', boots: '#1e1a16', cape: '#2f5a3a', hat: 'beret', hatColor: '#2f5a3a', lashes: true, build: 1.02, age: 0.45 }, barks: ['Mind the ice.', 'Three places. Every year.'] },
    tasks: [
      { at: [163.5, 184.5], label: 'Test the ice', text: 'You tap with the pole. It rings, deep, the way good ice should.' },
      { at: [190.6, 214.5], label: 'Test the ice', text: 'It holds, but it groans under the pole, and there\'s a white feather of frost on it that wasn\'t there a minute ago.' },
      { at: [104.5, 117.5], label: 'Test the ice', text: 'By the Spill the ice is thick as a step and still getting thicker while you watch. Something is making it.' },
    ],
    taskObjective: 'Test the ice in three places on the Wend', bossObjective: 'Stop Old Rime on the shore of Peg\'s Water (evening, realm time)',
    lines: {
      intro: ['Prudence Holt. I\'m fair-warden on the ice, which means if anybody goes through it, it\'s my fault.', 'Every year I test it in three places before the fair goes out on it. Every year it\'s thick enough or it isn\'t.', 'This year it froze in a night, in December, before the cold came. I don\'t like that.'],
      ask: 'Will you test it for me? By the bridge, at the plank bridge on the Wetlings track, and up by the Spill.',
      task: 'Tap with the pole. If it rings, it\'s good. If it groans, come back. If it sings, run.',
      boss: "Thicker while you watched? That's Old Rime, out of Peg's Water. My gran saw him once. See him off on the shore, evenings.",
      back: ['The ice is ice again. It\'ll go soft in January like it\'s meant to.', 'The woman on the ice sells these faster than she can knit. I got the last one.'],
      done: 'If you go through, shout. Somebody always hears, at the Frostfair.',
    },
    notes: { task: 'Prudence Holt is fair-warden on the ice. It froze in a night this year, before the cold came; she wants it tested in three places on the Wend.', boss: 'The ice is thickening while you watch. Old Rime has come up out of Peg\'s Water, and walks its shore in the evenings.', back: 'Old Rime is gone. Prudence will want to know.' },
  },
];

const on = (fest: FestivalId) => () => festivalAt()?.id === fest;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** For the journal when the fair has gone: when it comes round again. */
const gone = (fest: FestivalId) => { const f = FESTIVALS.find((x) => x.id === fest)!; return ` ${f.name} is over for this year. It comes round again in ${MONTHS[f.from[0] - 1]}.`; };
const taskFlag = (s: Story, i: number) => `fq:${s.fest}:${i}`;
const tasksDone = (g: GameApi, s: Story) => s.tasks.filter((_, i) => g.flag(taskFlag(s, i))).length;

function tree(s: Story): DialogueTree {
  const Q = s.quest;
  const intro = Object.fromEntries(s.lines.intro.map((text, i) => [`i${i}`, { text, next: i + 1 < s.lines.intro.length ? `i${i + 1}` : 'ask' }]));
  return {
    start: (g) => {
      const st = at(g, Q);
      if (!st) return 'i0';
      if (st === 'task') return 'task';
      if (st === 'boss') return 'boss';
      if (st === 'back') return 'b0';
      return 'done';
    },
    nodes: {
      ...intro,
      ask: { text: s.lines.ask, options: [{ text: 'I\'ll do it.', effect: (g) => g.setStage(Q, 'task'), next: 'task' }, { text: 'Not now.' }] },
      task: { text: s.lines.task },
      boss: { text: s.lines.boss },
      b0: { text: s.lines.back[0], next: 'b1' },
      b1: { text: s.lines.back[1], effect: (g) => { g.give(s.hat); g.give(s.token, 10); g.addMarks(40); g.setFlag('story:' + s.fest, true); g.setStage(Q, 'done'); } },
      done: { text: s.lines.done },
    },
  };
}

function quest(s: Story): QuestDef {
  const Q = s.quest;
  return {
    id: Q, name: s.name, region: 'greenwake', depth: 'quest',
    notes: (_g, st) => (st === 'task' ? s.notes.task : st === 'boss' ? s.notes.boss : s.notes.back) + (st !== 'done' && !on(s.fest)() ? gone(s.fest) : ''),
    objectives: (g, st) => {
      if (st === 'task') return s.tasks.map((t, i) => ({ text: `${s.taskObjective} (${i + 1}/3)`, done: !!g.flag(taskFlag(s, i)), marker: `${Q}:${i}` }));
      if (st === 'boss') return [{ text: `${s.bossObjective} (${Math.min(1, killed(g, 'type:' + s.boss))}/1)` }];
      if (st === 'back') return [{ text: `Tell ${s.npc.name}`, marker: s.npc.id }];
      return [];
    },
    advance: (g, st) => (st === 'task' && tasksDone(g, s) >= 3 ? 'boss' : st === 'boss' && killed(g, 'type:' + s.boss) >= 1 ? 'back' : null),
    marks: (g, st): Marks => (on(s.fest)() && (!st || st === 'back') ? { [s.npc.id]: st ? '?' : '!' } : {}),
    walk: { kill: { boss: [[s.boss, 1]] }, cast: [s.npc.id], from: { flags: {} } },
  };
}

function things(s: Story): WorldThing[] {
  return s.tasks.map((t, i) => ({
    id: `${s.quest}:${i}`, x: t.at[0], z: t.at[1], label: t.label, radius: 2.4,
    when: (g: GameApi) => at(g, s.quest) === 'task' && !g.flag(taskFlag(s, i)),
    use: (g: GameApi) => { g.setFlag(taskFlag(s, i), true); g.toast(t.text); },
  }));
}

const npcs: NpcDef[] = STORIES.map((s) => ({
  id: s.npc.id, name: s.npc.name, title: s.npc.title, look: s.npc.look as Appearance, barks: s.npc.barks,
  schedule: [{ from: 0, to: 24, at: POST, face: FACE, anim: 'idle' }],
  when: on(s.fest),
}));

export const SEASON_CONTENT: RegionContent = {
  id: 'seasons',
  npcs,
  dialogue: Object.fromEntries(STORIES.map((s) => [s.npc.id, tree(s)])),
  quests: Object.fromEntries(STORIES.map((s) => [s.quest, quest(s)])),
  things: STORIES.flatMap(things),
};

/** Which festival stories are done, for the feats (data/feats.ts). */
export const SEASON_STORY_FESTS: FestivalId[] = STORIES.map((s) => s.fest);
