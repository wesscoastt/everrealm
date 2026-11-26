import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { outlawDay, outlawsOn } from '../outlaws';

// THE OUTLAW FORTNIGHT (data/outlaws.ts; owner 2026-11-22: "an event themed around GTA 6 and its characters /
// cartoons", our own). Ruby Garret and Hob Calloway, lovers, have held up four of the Charter's coaches on the road
// between the Waystation and Fellers' Camp since the Goose Fair, and the broadsheets can't print them fast enough:
// Ruby in her scarlet coat and a hat with a feather the length of your arm, Hob in a tricorn, always a step behind
// her, the pair of them drawn as a fox and a hound sharing one horse. Their hideout is the old drovers' clearing south
// of the Waystation.
//
//   owWanted, WANTED: a broadsheet on the Waystation's board sends you to Leah Dunstan, the Charter's coachmaster,
//     who pays three hundred marks a head; and the clearing, where Ruby offers you a share of the next job. Ride
//     with them (owSide 'outlaw') or tell them you're the Charter's (owSide 'charter').
//   owJob, THE PAY COACH (riding with them): the Charter's pay coach is stopped on the road west of the Waystation
//     with a broken wheel. Cut a horse out of its traces (or pull a rider down off the road), take the strongbox, which
//     puts the nearest town's watch on you, and bring it to the clearing.
//   owHunt, THE CHARTER'S BUSINESS (hunting them): their gang holds the clearing. Drive them off; Hob is left behind.
//   owLast, THE LAST RIDE: both ways, Hob alone in the clearing at the end, and Ruby gone to the coachmaster to sell
//     him for the three hundred and a pardon. With them: go after Ruby with Hob ('hob'), go after Ruby and split the
//     money with her ('ruby'), or take the strongbox and both their horses and leave them to each other ('alone').
//     For the Charter: take Hob in ('hob'), let him go and give the coachmaster Ruby ('ruby'), or bring them both in
//     ('both'). Each way, Hob's coat or Ruby's, and the horse that goes with it.

const WANTED = 'owWanted', JOB = 'owJob', HUNT = 'owHunt', LAST = 'owLast';
const LEAH = { x: 710.5, z: 581.5 };
const CAMP = { x: 600.5, y: 21, z: 640.5 };
const HOB = { x: 603.5, y: 21, z: 642.5 };
const COACH = { x: 580.5, z: 561.5 };
const GANG: [number, number][] = [[592, 632], [610, 648], [594, 650], [610, 632]];
const BOARDS: [string, number, number][] = [['owBoardWay', 700.5, 571.5], ['owBoardAns', 835.5, 378.5]];

const side = (g: GameApi) => g.flag('owSide') as 'outlaw' | 'charter' | undefined;
const end = (g: GameApi) => g.flag(LAST) as string | undefined;
const gangDown = (g: GameApi) => killed(g, 'owGang') >= GANG.length;

/** The broadsheet on the board today: the cartoon and the words under it, as the story stands for you. */
function broadsheet(g: GameApi): string {
  const e = end(g), s = side(g), day = outlawDay();
  if (e === 'alone') return 'THE WAYSTATION CRIER. A cartoon: a fox in a feathered hat and a hound in a tricorn, sitting in the road with their pockets turned out, and a third figure riding off over the hill with a strongbox under each arm. Under it: WHO? The Charter wants to know. So does everybody.';
  if (e === 'both') return 'THE WAYSTATION CRIER. A cartoon: the fox and the hound in one pair of irons, still arguing, with the coachmaster leading them by the chain like a pair of dogs to market. Under it: GARRET AND CALLOWAY TAKEN. The roads are safe for the Charter\'s money, which is not the same as safe.';
  if (e === 'ruby') return 'THE WAYSTATION CRIER. A cartoon: the fox in the scarlet coat, curtseying to the Charter with a pardon in her teeth, and behind her back the hound in irons. Under it: LOVE IS A TWO-HORSE RACE.';
  if (e === 'hob') return 'THE WAYSTATION CRIER. A cartoon: the hound in his tricorn, alone on a tall horse, riding into the sunset with a broken heart pinned to his coat, and the fox in the coachmaster\'s pocket. Under it: CALLOWAY RIDES ALONE.';
  if (s === 'outlaw') return 'THE WAYSTATION CRIER. A cartoon: the fox and the hound on one horse, and riding behind them, drawn with a sack over its head, a third outlaw the Crier calls THE STRANGER. Under it: GARRET AND CALLOWAY HAVE A NEW FRIEND. The Charter pays three hundred marks a head. And now a third.';
  if (s === 'charter') return 'THE WAYSTATION CRIER. A cartoon: the fox and the hound up a tree, and at the bottom of it, drawn very large, the Charter\'s new hunter with a net. Under it: THE CHARTER\'S HOUND IS AFTER THE HOUND.';
  return `THE WAYSTATION CRIER, the ${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} day of the Fortnight. A cartoon: a fox in a scarlet coat and a feathered hat, and a hound in a tricorn, sharing one horse and holding up a coach full of fat Charter clerks, who are fainting into each other\'s laps. Under it: WANTED, RUBY GARRET AND HOB CALLOWAY, for the robbery of four Charter coaches. Three hundred marks a head. Apply to the coachmaster at the Waystation.`;
}

// ================================================================ Leah Dunstan, coachmaster

const leah: DialogueTree = {
  start: (g) => (at(g, WANTED) === 'coach' ? 'l1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (end(g) ? 'The coaches run on time again. Mostly.' : 'Leah Dunstan. Coachmaster. If you\'ve come about Garret and Calloway, so has everybody else, and none of them have brought me either.'),
      options: [{ text: 'Good day.' }],
    },
    l1: { text: 'You\'ve read the Crier. Everybody\'s read the Crier. Garret and Calloway, four of my coaches since the Goose Fair, and the broadsheet draws them as a fox and a hound and the whole county laughs. My guards don\'t laugh. One of them has a broken arm.', next: 'l2' },
    l2: {
      text: 'They hole up somewhere off the road south of here. The drovers\' clearing, I\'d say, but none of my men will go in there. Three hundred marks a head. Find them.',
      options: [{ text: 'I\'ll find them.', effect: (g) => g.setStage(WANTED, 'camp') }],
    },
  },
};

// ================================================================ Ruby Garret and Hob Calloway

const ruby: DialogueTree = {
  start: (g) => {
    if (at(g, WANTED) === 'camp') return 'r1';
    // (heard her out, and not yet said whose you are)
    if (at(g, WANTED) === 'done' && !side(g)) return 'r3';
    if (at(g, JOB) === 'ruby') return 'j1';
    return 'hello';
  },
  nodes: {
    hello: {
      text: (g) => (side(g) === 'charter' ? 'The Charter\'s hound. Keep your hands where I can see them, sweetheart.' : 'Ride fast and stay pretty.'),
      options: [{ text: 'Good day, Ruby.' }],
    },
    r1: { speaker: 'narrator', text: 'A woman in a scarlet coat sitting on an upturned strongbox with her boots crossed, a feather in her hat as long as your arm, cleaning a pistol she doesn\'t seem to need. She looks you up and down as if she\'s pricing you.', next: 'r2' },
    r2: { text: 'Ruby Garret. You\'ve seen the cartoons. I\'m the fox. I\'m better looking than that. Hob\'s the hound, over by the horses, and he\'s exactly like that. Leah Dunstan sent you, didn\'t she. Three hundred marks a head.', options: [{ text: 'I\'ll hear you out.', effect: (g) => g.setStage(WANTED, 'done'), next: 'r2b' }] },
    r2b: { speaker: 'narrator', text: 'Ruby pats the lid of the strongbox beside her. "Then sit down, sweetheart," she says, "and I\'ll give you a better number than three hundred."' },
    r3: {
      text: 'Here\'s a better number. The Charter\'s pay coach comes through the day after tomorrow, and it\'s heavier than Leah Dunstan will ever be. A share of it for anyone with the nerve. Well? Are you the Charter\'s, or are you ours?',
      options: [
        { text: 'I\'m yours. What\'s the job?', moral: { id: 'owWanted:outlaw', tr: { greed: 1, courage: 1 }, npc: { ow_ruby: 15, ow_hob: 10, ow_leah: -15 } }, effect: (g) => { g.setFlag('owSide', 'outlaw'); g.setStage(JOB, 'box'); }, next: 'r4' },
        { text: 'I\'m the Charter\'s. Come quietly.', moral: { id: 'owWanted:charter', tr: { loyalty: 1, courage: 1 }, npc: { ow_ruby: -15, ow_hob: -10, ow_leah: 10 } }, effect: (g) => { g.setFlag('owSide', 'charter'); g.setStage(HUNT, 'gang'); }, next: 'r5' },
      ],
    },
    r4: { text: 'The pay coach threw a wheel on the road west of the Waystation this morning. Bless the Charter\'s carpenters. Cut a horse out of the traces, or take one off anybody riding by, and bring me the strongbox. The watch will come. Lose them. Change your coat if you have to. We\'ll be here.' },
    r5: { speaker: 'narrator', text: 'Ruby laughs, and whistles, short and sharp. Men come out of the trees on every side with cudgels and knives. "Quietly," she says, "is not one of the things I do." She\'s gone into the trees before you can move, and Hob after her, and the clearing is full of people who want you dead.' },
    j1: { text: 'You brought it. You actually brought it. Hob owes me a shilling. Put it down there, sweetheart, and go and see Hob. He wants a word. He always wants a word.', effect: (g) => { g.take('ow_strongbox', 1); g.setStage(JOB, 'done'); g.setStage(LAST, 'split'); } },
  },
};

const hob: DialogueTree = {
  start: (g) => (at(g, HUNT) === 'hob' ? 'h1' : at(g, LAST) === 'split' ? 's1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (end(g) === 'hob' ? 'Never did learn to ride alone. I\'m learning.' : 'Ruby does the talking. I do the horses.'),
      options: [{ text: 'Good day, Hob.' }],
    },
    h1: { speaker: 'narrator', text: 'A big, sad-eyed man in a tricorn sitting against a tree with his hands open on his knees, and no knife in either of them. The gang is gone. Ruby is gone. One horse is left in the clearing, and it\'s his.', effect: (g) => { g.setStage(HUNT, 'done'); g.setStage(LAST, 'split'); }, next: 's1' },
    s1: { text: 'She\'s gone to Leah Dunstan. Ruby. To sell me for the three hundred and a pardon for herself. She told me this morning, kissed me, and went. That\'s Ruby. She always tells you. You just never believe her.', next: 's2' },
    s2: {
      text: (g) => (side(g) === 'charter' ? 'So. You\'re the Charter\'s. I\'m sitting here. What happens now?' : 'So. You\'re one of us now, and there\'s only two of us left. What do we do?'),
      options: [
        // with them
        { text: 'We go after her. Together.', cond: (g) => side(g) === 'outlaw', moral: { id: 'owLast:hob', tr: { loyalty: 2, courage: 1 }, npc: { ow_hob: 30, ow_ruby: -20 } }, effect: (g) => finish(g, 'hob'), next: 'eHobO' },
        { text: 'I go after her, and she and I split the three hundred.', cond: (g) => side(g) === 'outlaw', moral: { id: 'owLast:ruby', tr: { greed: 2, deception: 1 }, npc: { ow_hob: -30, ow_ruby: 20 } }, effect: (g) => finish(g, 'ruby'), next: 'eRubyO' },
        { text: 'I take the strongbox, and both your horses, and leave you two to each other.', cond: (g) => side(g) === 'outlaw', moral: { id: 'owLast:alone', tr: { greed: 2, deception: 2 }, npc: { ow_hob: -40, ow_ruby: -40 }, note: 'Rode off from Garret and Calloway with the Charter\'s pay strongbox and both their horses.' }, effect: (g) => finish(g, 'alone'), next: 'eAlone' },
        // for the Charter
        { text: 'You\'re coming in, Hob. That\'s what I was paid for.', cond: (g) => side(g) === 'charter', moral: { id: 'owLast:hob', tr: { honesty: 2, loyalty: 1 }, npc: { ow_hob: -20, ow_leah: 15 } }, effect: (g) => finish(g, 'hob'), next: 'eHobC' },
        { text: 'Go. I\'ll tell Leah it was Ruby all along.', cond: (g) => side(g) === 'charter', moral: { id: 'owLast:ruby', tr: { compassion: 2, deception: 1 }, npc: { ow_hob: 30, ow_ruby: -30, ow_leah: -5 } }, effect: (g) => finish(g, 'ruby'), next: 'eRubyC' },
        { text: 'You\'re both coming in. Her too.', cond: (g) => side(g) === 'charter', need: { trait: { courage: [57, 100] } }, moral: { id: 'owLast:both', a: 3, tr: { courage: 2, honesty: 1 }, rep: { crownroad: 2 }, npc: { ow_hob: -10, ow_ruby: -30, ow_leah: 25 } }, effect: (g) => finish(g, 'both'), next: 'eBoth' },
      ],
    },
    eHobO: { speaker: 'narrator', text: 'You catch her on the Waystation road, half a mile short of the coachmaster\'s door, and Hob rides up beside her and doesn\'t say a word. Ruby looks at him for a long time. Then she laughs, and turns her horse, and rides off east alone, and Hob watches her go. He gives you his coat. "I won\'t need it," he says. "Nobody draws a hound on his own."' },
    eRubyO: { speaker: 'narrator', text: 'Ruby is waiting for you on the Waystation road as if she knew you\'d come. She did. Leah Dunstan pays three hundred marks for Hob Calloway and doesn\'t ask why the Charter\'s pardon has Ruby\'s name on it. Ruby counts out your half on the coachmaster\'s step, kisses your cheek, and gives you her scarlet coat. "It suits you," she says. "It suited him."' },
    eAlone: { speaker: 'narrator', text: 'You lash the strongbox behind the saddle of Hob\'s horse, take Ruby\'s by the bridle, and ride. Behind you Hob stands up in the clearing and shouts something, and then, much further off on the Waystation road, so does Ruby. The broadsheets will want to know who you are. Let them wonder.' },
    eHobC: { speaker: 'narrator', text: 'Hob holds out his wrists. You walk him up to the Waystation, his horse following on its own. Ruby is already in Leah Dunstan\'s office with a pardon half-written, and she doesn\'t look at him when he comes in. Leah pays you the three hundred, and Hob asks you to keep his coat. "Somebody should," he says.' },
    eRubyC: { speaker: 'narrator', text: 'Hob looks at you, then gets up, slowly, and gets on his horse and goes south. In the coachmaster\'s office Ruby is already halfway through her story, and you finish it for her, differently. Leah Dunstan locks the door. Ruby gives you her coat when they take her out. "You\'ve earned it," she says, and means something else.' },
    eBoth: { speaker: 'narrator', text: 'You walk Hob up to the Waystation in his own irons and through Leah Dunstan\'s door, where Ruby is signing her pardon, and put her in the other half of the same pair. They argue the whole way to the cage cart. Leah pays you six hundred marks and shakes your hand twice. You keep both their coats. Nobody else wants them.' },
  },
};

/** The end of it: what you're paid, and whose coat and horse are yours. */
function finish(g: GameApi, how: 'hob' | 'ruby' | 'alone' | 'both'): void {
  g.setFlag(LAST, how);
  const charter = side(g) === 'charter';
  g.addMarks(how === 'both' ? 600 : how === 'alone' ? 450 : charter ? 300 : 300);
  const hob = how === 'hob' || how === 'both' || how === 'alone', ruby = how === 'ruby' || how === 'both' || how === 'alone';
  if (hob) { g.give('costume_highwayman', 1); g.give('halter_calloway', 1); }
  if (ruby) { g.give('costume_scarlet', 1); g.give('halter_garret', 1); }
  g.setStage(LAST, 'done');
}

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [WANTED]: {
    id: WANTED, name: 'Wanted: Garret and Calloway', region: 'crownroad', depth: 'quest',
    notes: (g, s) => {
      if (s === 'coach') return 'The Waystation Crier has Ruby Garret and Hob Calloway, highway robbers, at three hundred marks a head. The coachmaster at the Waystation is paying.';
      if (s === 'camp') return 'Leah Dunstan thinks Garret and Calloway hole up in the old drovers\' clearing south of the Waystation.';
      return side(g) === 'charter' ? 'I told Ruby Garret I was the Charter\'s.' : 'I threw in with Ruby Garret and Hob Calloway.';
    },
    objectives: (_g, s) => (s === 'coach' ? [{ text: 'See Leah Dunstan, the coachmaster at the Waystation', marker: 'ow_leah' }]
      : s === 'camp' ? [{ text: 'Find Garret and Calloway in the drovers\' clearing south of the Waystation', marker: 'ow_ruby' }] : []),
    marks: (_g, s): Marks => (s === 'coach' ? { ow_leah: '?' } : s === 'camp' ? { ow_ruby: '?' } : {}),
    walk: { cast: ['ow_leah', 'ow_ruby'] },
  },
  [JOB]: {
    id: JOB, name: 'The Pay Coach', region: 'crownroad', depth: 'quest',
    notes: (g, s) => {
      if (s === 'box') return 'The Charter\'s pay coach threw a wheel on the road west of the Waystation. Cut a horse out of its traces (or pull a rider down off the road), take the strongbox, lose the watch, and bring it to Ruby in the clearing. A change of coat, out of sight, loses them.';
      if (s === 'ruby') return 'I have the strongbox. Lose the watch, and bring it to Ruby Garret in the drovers\' clearing.';
      return 'Ruby has the Charter\'s pay.';
    },
    objectives: (g, s) => (s === 'box' ? [
      { text: 'Cut a horse out of the pay coach\'s traces', done: !!g.flag('owHorse'), marker: 'owTraces' },
      { text: 'Take the strongbox', done: g.count('ow_strongbox') > 0, marker: 'owBox' },
    ] : s === 'ruby' ? [{ text: 'Bring the strongbox to Ruby Garret in the clearing', marker: 'ow_ruby' }] : []),
    advance: (g, s) => (s === 'box' && g.count('ow_strongbox') > 0 ? 'ruby' : null),
    marks: (g, s): Marks => (!s && at(g, WANTED) === 'done' && !side(g) ? { ow_ruby: '!' } : s === 'ruby' ? { ow_ruby: '?' } : {}),
    next: [LAST, 'split'],
    walk: { cast: ['ow_ruby'], from: { quests: { owWanted: 'done' } } },
  },
  [HUNT]: {
    id: HUNT, name: 'The Charter\'s Business', region: 'crownroad', depth: 'quest',
    notes: (g, s) => {
      if (s === 'gang') return `Ruby Garret set her gang on me in the drovers' clearing and ran. Drive them off. (${Math.min(GANG.length, killed(g, 'owGang'))}/${GANG.length})`;
      if (s === 'hob') return 'The gang is gone. Somebody is still in the clearing.';
      return 'Hob Calloway was left behind.';
    },
    objectives: (g, s) => (s === 'gang' ? [{ text: `Drive off Garret and Calloway's gang (${Math.min(GANG.length, killed(g, 'owGang'))}/${GANG.length})`, done: gangDown(g) }]
      : s === 'hob' ? [{ text: 'See who\'s left in the clearing', marker: 'ow_hob' }] : []),
    advance: (g, s) => (s === 'gang' && gangDown(g) ? 'hob' : null),
    marks: (_g, s): Marks => (s === 'hob' ? { ow_hob: '?' } : {}),
    next: [LAST, 'split'],
    walk: { cast: ['ow_hob', 'ow_ruby'], kill: { gang: [['footpad', 4]] }, from: { quests: { owWanted: 'done' } } },
  },
  [LAST]: {
    id: LAST, name: 'The Last Ride', region: 'crownroad', depth: 'quest',
    notes: (g, s) => {
      if (s === 'split') return 'Hob Calloway is alone in the clearing. Ruby has gone to the coachmaster.';
      const e = end(g);
      return e === 'alone' ? 'I rode off with the strongbox and both their horses.' : e === 'both' ? 'I brought Garret and Calloway in together.' : e === 'ruby' ? 'It came down to Ruby.' : 'It came down to Hob.';
    },
    objectives: (_g, s) => (s === 'split' ? [{ text: 'Talk to Hob Calloway in the clearing', marker: 'ow_hob' }] : []),
    marks: (_g, s): Marks => (s === 'split' ? { ow_hob: '?' } : {}),
    walk: { cast: ['ow_hob'], from: { quests: { owWanted: 'done', owJob: 'done', owLast: 'split' }, flags: { owSide: 'outlaw' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'owGang', type: 'footpad', at: GANG, when: (g) => at(g, HUNT) === 'gang' },
];

const things: WorldThing[] = [
  // the broadsheets on the boards, the cartoon as the story stands for you; the first starts it
  ...BOARDS.map(([id, x, z]): WorldThing => ({
    id, x, z, label: 'Read the Waystation Crier', radius: 2.6, look: 'letter',
    when: () => outlawsOn(),
    use: (g) => { g.toast(broadsheet(g)); if (!at(g, WANTED)) g.setStage(WANTED, 'coach'); },
  })),
  {
    id: 'owTraces', x: COACH.x - 3, z: COACH.z, label: 'Cut a horse out of the traces', radius: 2.6, look: 'harness',
    when: (g) => at(g, JOB) === 'box' && !g.flag('owHorse'),
    use: (g) => { g.setFlag('owHorse', 1); g.toast('The pay coach stands canted on its broken wheel, the driver gone up the road for a wheelwright and the guard asleep on the box with his hat over his face. You cut the near leader out of the traces and she stands for you, blowing. Now the box.'); },
  },
  {
    id: 'owBox', x: COACH.x, z: COACH.z + 1, label: 'Take the strongbox', radius: 2.4, look: 'crate',
    when: (g) => at(g, JOB) === 'box' && g.count('ow_strongbox') === 0,
    use: (g) => {
      if (!g.flag('owHorse') && Number(g.flag('horsesStolen') ?? 0) === 0) { g.toast('It\'s a strongbox. It weighs what a strongbox weighs. You\'ll want a horse under you to get it anywhere: cut one out of the traces, or pull a rider down off the road.'); return; }
      g.give('ow_strongbox', 1); g.crimeHere(250);
      g.toast('You heave the strongbox off the coach\'s boot, and the guard sits up with his hat in his hand and starts to shout. Ride. The watch will be after you now: lose them, and change your coat if you have to, then take the box to the clearing.');
    },
  },
];

const look = (o: Partial<NpcDef['look']>): NpcDef['look'] => ({ skin: '#d8a888', hair: '#3a2a1e', hairStyle: 0, facial: 0, eyes: '#4a5a6a', tunic: '#3a3a3e', trim: '#2a2a2e', shirt: '#d8d0c0', trousers: '#2a2a2e', boots: '#1a1612', build: 1, age: 0.4, ...o });

const NPCS: NpcDef[] = [
  { id: 'ow_leah', name: 'Leah Dunstan', title: 'Coachmaster, the Waystation', look: look({ frame: 'f', lashes: true, hair: '#5a3a22', hairStyle: 6, tunic: '#2a3a6a', trim: '#e0c890', hat: 'cap', hatColor: '#2a3a6a', age: 0.5 }),
    schedule: [{ from: 6, to: 22, at: [LEAH.x, LEAH.z], face: [LEAH.x - 3, LEAH.z], anim: 'idle' }],
    when: () => outlawsOn(),
    barks: ['Four coaches. Four.', 'The Crier thinks it\'s funny.'] },
  { id: 'ow_ruby', name: 'Ruby Garret', title: 'Wanted, three hundred marks', look: look({ frame: 'f', lashes: true, skin: '#e0b090', hair: '#8a2a14', hairStyle: 1, tunic: '#9a1a1e', trim: '#e8c060', shirt: '#f0e8d8', trousers: '#1e1a1c', boots: '#1a1416', cape: '#6a0e14', hat: 'feathered', hatColor: '#1a1416', age: 0.3 }),
    schedule: [{ from: 0, to: 24, at: [CAMP.x, CAMP.z], face: [CAMP.x + 3, CAMP.z + 2], anim: 'seated', y: CAMP.y }],
    when: (g) => outlawsOn() && side(g) !== 'charter' && !end(g) && at(g, LAST) !== 'split',
    barks: ['Ride fast and stay pretty.', 'Three hundred? I\'m worth five.'] },
  { id: 'ow_hob', name: 'Hob Calloway', title: 'Wanted, three hundred marks', look: look({ skin: '#c89070', hair: '#2a1e14', facial: 4, tunic: '#1a1a1e', trim: '#c8a040', cape: '#141016', hat: 'tricorn', hatColor: '#141210', build: 1.2, age: 0.4 }),
    schedule: [{ from: 0, to: 24, at: [HOB.x, HOB.z], face: [HOB.x - 3, HOB.z], anim: 'idle', y: HOB.y }],
    when: (g) => outlawsOn() && !end(g) && at(g, HUNT) !== 'gang',
    barks: ['Ruby does the talking.', 'Easy, girl. Easy.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'ow_strongbox', name: 'The Charter\'s pay strongbox', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'chest', a: '#3a3a3e', b: '#c8a040' }, desc: 'Iron-bound oak with the Charter\'s tally-stick on the lid, and heavy with the wages of every coach guard on the road. Somebody is going to want this back.' },
  { id: 'costume_highwayman', name: 'Highwayman\'s coat', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'chest', a: '#1a1a1e', b: '#c8a040' }, desc: 'Hob Calloway\'s long black coat and tricorn, worn shiny at the elbows from leaning on gates waiting for coaches.', costume: 'highwayman', stats: 'Use it to add it to your wardrobe for good, and wear it from Outfits in your pack.' },
  { id: 'costume_scarlet', name: 'The scarlet coat', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'chest', a: '#9a1a1e', b: '#e8c060' }, desc: 'Ruby Garret\'s scarlet coat and the hat with the feather the broadsheets can\'t stop drawing.', costume: 'scarlet', stats: 'Use it to add it to your wardrobe for good, and wear it from Outfits in your pack.' },
  { id: 'halter_calloway', name: 'Calloway\'s black', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'shoe', a: '#141012', b: '#141016' }, mount: { coat: '#141012', mane: '#0a0808', cloth: '#141016' }, desc: 'Hob Calloway\'s tall black, with a white star on her forehead the Crier never gets right. Steady as a church.', stats: 'A horse of your own. Use it, or press G, to ride.' },
  { id: 'halter_garret', name: 'Garret\'s roan', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'shoe', a: '#a8584a', b: '#9a1a1e' }, mount: { coat: '#a8584a', mane: '#3a1a12', cloth: '#9a1a1e' }, desc: 'Ruby Garret\'s strawberry roan, quick off the mark and not sorry about it.', stats: 'A horse of your own. Use it, or press G, to ride.' },
];

export const OUTLAW_FORTNIGHT: RegionContent = {
  id: 'outlawFortnight',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { ow_leah: leah, ow_ruby: ruby, ow_hob: hob },
  quests,
  spawns,
  things,
};
