import type { DialogueTree, GameApi } from '../../game/api';
import { bigIsle, hoistSpot } from '../../world/holms';
import { heightAt } from '../../world/terrain';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import { COMPANIONS } from '../companions';

// THE WEATHERHOLMS, the chapters between (docs/STORY_PLAN.md, Act II):
//
//   XVI   Ilse's Log (storyIlseLog): Ottilie wants Ilse's thirty years of logbooks, to work out the
//         isles' drift. One winter is cut out of them, eleven years ago, and the next spring has a
//         line struck through: "A. Pryce, paid in full." Ilse sold that winter's count, the winter her
//         sister Bethan had the lung fever; that count is how Harrowgate knew the ring's crystal was
//         there. Flag ilseLog = 'speaker' (she'll write to the Speaker herself) | 'kept' (it stays
//         between you) | 'blamed' (you tell her what it cost).
//   XIX   The Nine's Way (storyNineWay): after the fourth stone, Delyth ties a rope to the isle's edge
//         to climb down it the way the last nine did. You follow her down. Flag nineRope = 'left'
//         (the rope stays hanging, for anyone who wants to go up and look) | 'cut'.
//   XX    Second Camp (storyCamp2): a fire in the snow at the hoist's foot, with Delyth.

const ILSE = 'storyIlseLog', NINE = 'storyNineWay', CAMP = 'storyCamp2';
const DROP = 'storyDrop', BASKETS = 'storyBaskets', LAST = 'storyLastMark';

const I = bigIsle(), H = hoistSpot();
/** A point on the isle, from its middle toward the tower (k), and to the side (w) (as weatherholms.ts). */
const isle = (k: number, w = 0): [number, number] => [I.x - H.dx * k + (H.dz !== 0 ? w : 0), I.z - H.dz * k + (H.dx !== 0 ? w : 0)];
// The isle's far edge, away from the tower; the rope hangs just off it to the ground
const RIM = isle(-(I.r - 2)), ROPE = isle(-(I.r + 0.7)), BELOW = isle(-(I.r + 3.5));
const BELOW_Y = Math.floor(heightAt(BELOW[0], BELOW[1]));
// The crew's own fire pit at the hoist's foot, between their tents (world/sites.ts)
const FIRE: [number, number] = [H.x, H.z - 7];
// Ilse's logbooks, on the shelf by her at Scarth Watch
const SHELF = { x: 599.5, z: 1710.5 };

const ottJoined = (g: GameApi) => !!g.flag('comp:ottilie:joined');
const wennaJoined = (g: GameApi) => !!g.flag('comp:wenna:joined');
const holm = (g: GameApi) => g.flag('holmEnd') as 'back' | 'charter' | 'joan' | undefined;

// ================================================================ XVI. ILSE'S LOG

const ottIlse = {
  il_o1: { text: 'Can I ask you something? Ilse\'s kept thirty years of the isles. If I had all of it, not just this summer, I could work out the drift properly. Where they\'ll be in fifty years. Where they were when the forty-one went up.', next: 'il_o2' },
  il_o2: { text: 'She keeps the logbooks on the shelf by her desk at the Watch. She wrote "On the Counting of Falls", you know. I learned to read a staff from it. I\'ve read it four times.', options: [{ text: 'Then let\'s go and ask her for them.', next: 'il_o3', effect: (g: GameApi) => g.setStage(ILSE, 'shelf') }] },
  il_o3: { text: 'I\'ll try not to say anything stupid in front of her. I\'ll probably say something stupid.' },
  il_oWait: { text: 'The shelf by her desk. Thirty books. I want to read every one.' },
};

const ilseNodes = {
  il_i1: { speaker: 'narrator' as const, text: 'Ilse looks at the logbook open in your hands, at the stub of the cut pages, and then out of the window at the isles for a long while.', next: 'il_i2' },
  il_i2: { text: 'Eleven years ago my sister Bethan had the lung fever, in Kelderby. All winter. The Charter was three quarters late with the stipend, the way it always is.', next: 'il_i3' },
  il_i3: { text: 'A man came up the hill in a good coat. He said he\'d heard I counted falls, and was there anything in this winter\'s count worth two hundred marks. I said no. Then I showed him.', next: 'il_i4' },
  il_i4: { text: 'A fall on the big isle. The biggest I\'d ever seen land on anything that wasn\'t the ground. It was in the old ring. I didn\'t know there was a ring. I just wrote down where the light went in.', next: 'il_i5' },
  il_i5: { text: (g: GameApi) => (g.flag('scStipend') === 'pryce' ? 'That\'s how Hilda knew where to build her tower. And this summer, when he came back for the rest of it, I sold him that too. You were standing there.' : 'That\'s how Hilda knew where to build her tower. Eleven years he sat on it, waiting for a debt big enough to spend it on.'), next: 'il_i6' },
  il_i6: { text: 'Bethan lived. She has four grandchildren. I cut the pages out the night he paid, and I wrote "paid in full" in the spring, and then I couldn\'t look at it, so I struck it through.', options: [{ text: '(Ottilie steps forward)', cond: ottJoined, next: 'il_i7' }, { text: 'Go on.', cond: (g: GameApi) => !ottJoined(g), next: 'il_i8' }] },
  il_i7: { as: 'ottilie', text: 'You wrote the book. On the Counting of Falls. I learned everything from it.', next: 'il_i8' },
  il_i8: {
    text: (g: GameApi) => (ottJoined(g) ? 'Then you learned it from somebody who sold a count. Learn that too, girl.' : 'Well. Now you know.'),
    options: [
      { text: 'Write to the Speaker. Tell her yourself, before the sitting on the isles.', next: 'il_speaker' },
      { text: 'Your sister lived. That\'s what it bought. It stays between us.', next: 'il_kept' },
      { text: 'Forty-one people\'s floor is in baskets at the foot of that tower. That\'s what it bought too.', next: 'il_blamed' },
    ],
  },
  il_speaker: {
    text: 'Yes. I\'ll write tonight, and I\'ll sign it. If the Charter stops my stipend for good, at least it\'ll be for something I did.',
    effect: (g: GameApi) => { g.setFlag('ilseLog', 'speaker'); g.compRapport('ottilie', 4); g.compRapport('wenna', 3); g.setStage(ILSE, 'done'); },
  },
  il_kept: {
    text: 'Thank you. I don\'t deserve it, and I\'ll take it. Go on. Gethin\'s waiting for his numbers.',
    effect: (g: GameApi) => { g.setFlag('ilseLog', 'kept'); g.compRapport('ottilie', 2); g.compRapport('wenna', -3); g.setStage(ILSE, 'done'); },
  },
  il_blamed: {
    text: 'I know what it bought. I\'ve watched it through that glass every night since midsummer. You can go now.',
    effect: (g: GameApi) => { g.setFlag('ilseLog', 'blamed'); g.compRapport('ottilie', -4); g.compRapport('wenna', 2); g.setStage(ILSE, 'done'); },
  },
  il_iWait: { text: 'The logbooks are on the shelf. All of them. Take your time.' },
};

// ================================================================ XIX. THE NINE'S WAY

const delythRim: DialogueTree = {
  start: (g) => (at(g, NINE) === 'climb' ? 'n_wait' : 'n1'),
  nodes: {
    n1: { speaker: 'narrator', text: 'Delyth has a coil of the crew\'s rope over her shoulder and has tied one end of it round the last post of the old fence at the isle\'s edge. She\'s testing the knot with her whole weight.', next: 'n2' },
    n2: { text: 'Nine of them went down a rope off this edge. One of them was carrying a baby. It\'s on the stone, the little one on her back.', next: 'n3' },
    n3: { text: 'I want to know what it was like. I want to go down it.', options: [{ text: 'Then I\'m going down behind you.', next: 'n4' }, { text: 'It\'s twenty feet onto snow. You\'ll break your neck.', next: 'n3b' }, { text: 'Why does it matter how it felt?', next: 'n3c' }] },
    n3b: { text: 'They did it from higher. It was higher, then. I\'ll go slow.', next: 'n4' },
    n3c: { text: 'Because I sent their floor down in baskets for two marks a day, and I copied their stones, and all I know about them is numbers. I want one thing that isn\'t a number.', next: 'n4' },
    n4: { text: 'Hold the rope till I\'m down, then come after me. Don\'t look at the gap. Gethin says that about the plank and he\'s right about this too.', effect: (g) => g.setStage(NINE, 'climb') },
    n_wait: { text: 'I\'m going. Count to twenty and come after me.' },
  },
};

const delythFoot: DialogueTree = {
  start: (g) => (at(g, NINE) === 'foot' ? 'f1' : 'f_after'),
  nodes: {
    f1: { speaker: 'narrator', text: 'She\'s sitting in the snow at the bottom of the rope with her hands in her armpits, shaking, and laughing a little.', next: 'f2' },
    f2: { text: 'My hands are skinned. Twenty feet, and my hands are skinned. They did sixty, with a baby, on rope they spun from their own sheep.', next: 'f3' },
    f3: { text: 'And then they walked to Ketley, and built five arches so nobody would ever have to do it again.', next: 'f4' },
    f4: {
      text: 'The rope. Do I leave it? Anyone could go up. Look at the ring. See the stones. Or I cut it, and the isle\'s theirs again.',
      options: [
        { text: 'Leave it. Somebody should be able to go up and look, and come down again.', next: 'f_left' },
        { text: 'Cut it. Nobody else goes up. That was their promise.', next: 'f_cut' },
      ],
    },
    f_left: { text: 'Leave it. For anyone who wants to look. And who can come back down. That\'s the difference.', effect: (g) => { g.setFlag('nineRope', 'left'); g.setStage(NINE, 'done'); } },
    f_cut: { speaker: 'narrator', text: 'She stands on tiptoe and cuts it above her head with her knife. The rope falls in the snow in coils, the way it lies on the second stone.', effect: (g) => { g.setFlag('nineRope', 'cut'); g.setStage(NINE, 'done'); } },
    f_after: { text: (g) => (g.flag('nineRope') === 'left' ? 'It\'s still hanging. Somebody went up yesterday, Gethin says. Came down again too.' : 'I keep the coil in my pack. I don\'t know why.') },
  },
};

// ================================================================ XX. SECOND CAMP

const campDelyth: DialogueTree = {
  start: (g) => (g.flag('camp2D') ? 'cd_again' : 'cd1'),
  nodes: {
    cd1: {
      text: (g) => {
        const e = holm(g);
        if (e === 'back') return 'The crew have gone home. Gethin\'s staying on to keep the tower standing, on Mrs Harrowgate\'s pay. She\'s paying for a tower that holds nothing up. I didn\'t think she had it in her.';
        if (e === 'charter') return 'A mark a ride, the Speaker says. Anybody. Wynn\'s going to stand at the bottom and tell every one of them about the forty-one whether they ask or not.';
        return 'Joan measures every morning before breakfast. The big isle stopped dropping on Thursday. She didn\'t smile. She wrote it down twice.';
      },
      next: 'cd2',
    },
    cd2: { text: 'I copied forty-one names that weren\'t names. Strokes. I kept thinking: somebody knew every one of those strokes. Somebody\'s mother.', options: [{ text: 'You gave them back their count.', next: 'cd_kind' }, { text: 'What will you do now?', next: 'cd_next' }] },
    cd_kind: { text: 'The forty-second stroke was mine. I hope they don\'t mind.', effect: (g) => g.setFlag('camp2D', 1) },
    cd_next: { text: 'Go home to Kelderby and tell my dad I\'m not going back on the crew. Then I don\'t know. Somebody\'s got to copy the rest of the stones in the counties. There\'s ones at Ketley nobody\'s read.', effect: (g) => g.setFlag('camp2D', 1) },
    cd_again: { text: 'Mind the fire. It\'s the only warm thing for a mile.' },
  },
};

const campWenna: DialogueTree = {
  start: (g) => (g.flag('camp2W') ? 'cw_again' : 'cw1'),
  nodes: {
    cw1: {
      text: (g) => (g.flag('ilseLog') === 'kept'
        ? 'Ilse. Two hundred marks and a winter\'s count, and her sister lived. I\'d have done the same. I\'d have hated you for keeping it quiet for me, though.'
        : g.flag('ilseLog') === 'speaker' ? 'Ilse wrote to the Speaker. Signed it. Do you know how rare that is? Most people sign for nine and say nothing for ever.'
          : 'You were hard on Ilse. Maybe she earned it. I\'ve been on the end of that look myself, and it didn\'t help, and I still needed to see it.'),
      next: 'cw2',
    },
    cw2: { text: '"Signed for nine." That\'s what I said, isn\'t it. You heard it. I suppose I\'ll have to tell you the rest one day.', options: [{ text: 'Whenever you\'re ready.', next: 'cw_ready' }, { text: 'Tell me now.', next: 'cw_now' }] },
    cw_ready: { text: 'Gullmouth. On the quay. I keep saying that. I\'ll keep to it.', effect: (g) => { g.compRapport('wenna', 3); g.setFlag('camp2W', 1); } },
    cw_now: { text: 'No. Not in the snow, with a stranger\'s rope hanging off an island. Gullmouth.', effect: (g) => { g.compRapport('wenna', -1); g.setFlag('camp2W', 1); } },
    cw_again: { text: 'First watch is mine. It always is.' },
  },
};

const campOtt: DialogueTree = {
  start: (g) => (g.flag('camp2O') ? 'co_again' : 'co1'),
  nodes: {
    co1: {
      text: (g) => (g.flag('ilseLog') === 'blamed'
        ? 'I keep thinking about her face when you said it. You weren\'t wrong. I wish you\'d been wrong more quietly.'
        : 'I\'ve read On the Counting of Falls four times. I keep thinking I should read it again, now, to see if it\'s different. It won\'t be. That\'s the worst of it.'),
      next: 'co2',
    },
    co2: { text: 'Joan was wrong about the cap. Ilse sold a count. Is everyone I look up to going to turn out like this?', options: [{ text: 'Probably. Look up to them anyway, and check their sums.', next: 'co_sums' }, { text: 'No. Some of them will just be wrong. That\'s different.', next: 'co_wrong' }] },
    co_sums: { text: 'Check their sums. I can do that. I\'m good at that.', effect: (g) => { g.compRapport('ottilie', 4); g.setFlag('camp2O', 1); } },
    co_wrong: { text: 'Wrong, and not wicked. All right. I\'ll try to tell the difference. I suspect it\'s harder from the inside.', effect: (g) => { g.compRapport('ottilie', 3); g.setFlag('camp2O', 1); } },
    co_again: { text: 'Sleep. I\'m doing the drift again by firelight. Fifty years from now, the big isle will be over Ilse\'s roof.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [ILSE]: {
    id: ILSE, name: 'Ilse\'s Log', story: { chapter: 16, title: 'Ilse\'s Log', act: 'The Weatherholms' }, next: [BASKETS, 'hilda'],
    notes: (g, s) => {
      if (s === 'ottilie') return ottJoined(g) ? 'Ottilie wants a word about Ilse Blewitt\'s logbooks.' : 'Ilse Blewitt has kept thirty years of logbooks on the isles at Scarth Watch.';
      if (s === 'shelf') return 'Ilse keeps thirty years of logbooks on the shelf by her desk at Scarth Watch. Ottilie wants them to work out the isles\' drift.';
      if (s === 'ask') return 'One winter is cut out of Ilse\'s logbooks, eleven years ago. In the next spring, a line struck through: "A. Pryce, paid in full."';
      const e = g.flag('ilseLog');
      return e === 'speaker' ? 'Ilse sold a winter\'s count to Pryce eleven years ago, the winter her sister was ill. It showed the ring\'s crystal. She is writing to the Speaker herself.' : e === 'kept' ? 'Ilse sold a winter\'s count to Pryce eleven years ago, the winter her sister was ill. It showed the ring\'s crystal. It stays between us.' : 'Ilse sold a winter\'s count to Pryce eleven years ago, the winter her sister was ill. It showed the ring\'s crystal. I told her what it cost.';
    },
    objectives: (g, s) => {
      if (s === 'ottilie') return ottJoined(g) ? [{ text: 'Talk to Ottilie', marker: 'comp_ottilie' }] : [{ text: 'Go to Scarth Watch', marker: 'ilseShelf' }];
      if (s === 'shelf') return [{ text: 'Read Ilse\'s logbooks at Scarth Watch', marker: 'ilseShelf' }];
      if (s === 'ask') return [{ text: 'Ask Ilse Blewitt about the missing winter', marker: 'ilse' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'ottilie' && ottJoined(g) ? { comp_ottilie: '?' } : s === 'ask' ? { ilse: '?' } : {}),
    // Without Ottilie travelling with you, Ilse's books are what you came for anyway
    advance: (g, s) => (s === 'ottilie' && !ottJoined(g) ? 'shelf' : null),
    walk: { from: { quests: { [DROP]: 'done', [ILSE]: 'ottilie' }, flags: { 'comp:ottilie:joined': 1 } } },
  },
  [NINE]: {
    id: NINE, name: 'The Nine\'s Way', story: { chapter: 19, title: 'The Nine\'s Way', act: 'The Weatherholms' }, next: [CAMP, 'road'],
    notes: (g, s) => {
      if (s === 'delyth') return 'Delyth Morgan is at the far edge of the big isle with a coil of rope.';
      if (s === 'climb') return 'Delyth is climbing down a rope off the isle\'s far edge, the way the last nine did. I said I\'d follow.';
      if (s === 'foot') return 'Twenty feet of rope down onto the snow. Delyth is at the bottom.';
      return g.flag('nineRope') === 'left' ? 'Delyth climbed down from the isle the nine\'s way. The rope stays hanging, for anyone who wants to go up and look.' : 'Delyth climbed down from the isle the nine\'s way, and cut the rope behind us.';
    },
    objectives: (g, s) => {
      if (s === 'delyth') return [{ text: 'Find Delyth at the isle\'s far edge', marker: 'delyth_rim' }];
      if (s === 'climb') return [{ text: 'Climb down Delyth\'s rope', marker: 'nineRope' }];
      if (s === 'foot') return [{ text: 'Talk to Delyth at the foot of the rope', marker: 'delyth_foot' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'delyth' ? { delyth_rim: '?' } : s === 'foot' ? { delyth_foot: '?' } : {}),
    walk: { from: { quests: { [LAST]: 'done', [NINE]: 'delyth' }, flags: { holmPass: true } }, cast: ['delyth_rim', 'delyth_foot'] },
  },
  [CAMP]: {
    id: CAMP, name: 'Second Camp', story: { chapter: 20, title: 'Second Camp', act: 'The Weatherholms' }, next: ['storyHalfPurse', 'quay'],
    notes: (_g, s) => (s === 'road' ? 'Night is coming down on the snow under the hoist. Delyth has a fire going at the tower\'s foot.' : s === 'camp' ? 'A fire in the snow at the hoist\'s foot.' : 'A night in the snow at the hoist\'s foot. Nessa Crane at Gullmouth has been asking for me.'),
    objectives: (g, s) => {
      if (s === 'road') return [{ text: 'Sit down at Delyth\'s fire at the hoist\'s foot', marker: 'camp2Fire' }];
      if (s === 'camp') {
        const o: { text: string; marker?: string; done?: boolean }[] = [{ text: 'Sit with Delyth', done: !!g.flag('camp2D'), marker: 'camp2_delyth' }];
        if (wennaJoined(g)) o.push({ text: 'Sit with Wenna', done: !!g.flag('camp2W'), marker: 'camp2_wenna' });
        if (ottJoined(g)) o.push({ text: 'Sit with Ottilie', done: !!g.flag('camp2O'), marker: 'camp2_ottilie' });
        o.push({ text: 'Sleep by the fire', marker: 'camp2Fire' });
        return o;
      }
      return [];
    },
    marks: (g, s): Marks => (s === 'camp' ? { ...(!g.flag('camp2D') ? { camp2_delyth: '?' as const } : {}), ...(wennaJoined(g) && !g.flag('camp2W') ? { camp2_wenna: '?' as const } : {}), ...(ottJoined(g) && !g.flag('camp2O') ? { camp2_ottilie: '?' as const } : {}) } : {}),
    advance: (g, s) => {
      if (s !== 'road' || !g.compNear(FIRE[0], FIRE[1], 12)) return null;
      if (g.compActive()) g.compDismiss();
      return 'camp';
    },
    walk: { from: { quests: { [NINE]: 'done', [CAMP]: 'road' }, flags: { holmEnd: 'back', ilseLog: 'kept', 'comp:wenna:joined': 1, 'comp:ottilie:joined': 1 } }, auto: { road: 'camp' } },
  },
};

const look = (id: 'wenna' | 'ottilie') => COMPANIONS[id].look;
const DELYTH = { skin: '#d8a882', hair: '#2a1a12', eyes: '#3a4a5a', hairStyle: 2, tunic: '#6a5a4a', trim: '#c8b890', trousers: '#4a4034', boots: '#2a1e14', cape: '#4a3a2a', hat: 'band' as const, hatColor: '#7a2a24', lashes: true, freckles: true, build: 0.92, height: 0.97, age: 0.15 };
const inCamp = (g: GameApi) => at(g, CAMP) === 'camp';

/** Act II is done (Act III's start waits on it): the camp, or for a character that finished before it existed, the last mark. */
export const actTwoDone = (g: GameApi) => at(g, CAMP) === 'done' || (at(g, LAST) === 'done' && !at(g, NINE));

export const ACT_TWO: RegionContent = {
  id: 'actTwo',
  npcs: [
    { id: 'delyth_rim', name: 'Delyth Morgan', title: 'Copier of stones', look: DELYTH, schedule: [{ from: 0, to: 24, at: [RIM[0] + 1.5, RIM[1]], face: [ROPE[0], ROPE[1]], anim: 'idle', y: I.top }], barks: [], when: (g) => at(g, NINE) === 'delyth' || at(g, NINE) === 'climb' },
    { id: 'delyth_foot', name: 'Delyth Morgan', title: 'Copier of stones', look: DELYTH, schedule: [{ from: 0, to: 24, at: [BELOW[0] + 1.6, BELOW[1] + 0.8], face: [BELOW[0], BELOW[1]], anim: 'idle', y: BELOW_Y }], barks: [], when: (g) => at(g, NINE) === 'foot' || (at(g, NINE) === 'done' && !at(g, CAMP)) },
    { id: 'camp2_delyth', name: 'Delyth Morgan', title: 'Copier of stones', look: DELYTH, schedule: [{ from: 0, to: 24, at: [FIRE[0] + 0.3, FIRE[1] - 2.9], face: FIRE, anim: 'idle' }], barks: [], when: (g) => at(g, CAMP) === 'road' || inCamp(g) },
    { id: 'camp2_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: [FIRE[0] - 2.4, FIRE[1] + 1.3], face: FIRE, anim: 'idle' }], barks: [], when: (g) => inCamp(g) && wennaJoined(g) },
    { id: 'camp2_ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice', look: look('ottilie'), schedule: [{ from: 0, to: 24, at: [FIRE[0] + 2.4, FIRE[1] + 1.2], face: FIRE, anim: 'idle' }], barks: [], when: (g) => inCamp(g) && ottJoined(g) },
  ],
  dialogue: { delyth_rim: delythRim, delyth_foot: delythFoot, camp2_delyth: campDelyth, camp2_wenna: campWenna, camp2_ottilie: campOtt },
  quests: QUESTS,
  readables: {
    ilseShelf: {
      title: 'Ilse\'s logbooks',
      body: 'Thirty books in brown board, one for each year, every night in the same small hand: the date, the weather, the isles against the ridge, the falls.\n\nEleven years back, the winter is missing. Not lost: cut out, close to the spine, with a sharp knife, the stubs neat.\n\nThe next spring begins on a fresh page. Halfway down it, in the same hand, a line has been struck through, but not hard enough:\n\nA. Pryce, paid in full.',
      effect: (g) => { if (at(g, ILSE) === 'shelf') g.setStage(ILSE, 'ask'); },
    },
    camp2Sleep: {
      title: 'The fire',
      body: (g) => `The fire hisses in the snow. Above it the isle hangs black against the stars, ${g.flag('nineRope') === 'left' ? 'the rope still swinging a little off its edge,' : ''} and Gethin's lamp burns on the tower platform all night.\n\nIn the morning there's a carter on the Kelderby road with a letter for you, from Nessa Crane at Gullmouth.`,
      effect: (g) => { if (inCamp(g)) g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    { id: 'ilseShelf', x: SHELF.x, z: SHELF.z, label: 'Read Ilse\'s logbooks', radius: 2.2, read: 'ilseShelf', when: (g) => at(g, ILSE) === 'shelf' || at(g, ILSE) === 'ottilie' },
    {
      id: 'nineRope', x: ROPE[0], z: ROPE[1], y: I.top, label: 'Climb down Delyth\'s rope', radius: 2.4,
      when: (g) => at(g, NINE) === 'climb',
      use: (g) => { g.setStage(NINE, 'foot'); g.ride(BELOW[0] + 0.5, BELOW_Y, BELOW[1] + 0.5, 'Backwards over the edge, boots against the isle\'s underside, hand over hand down to the snow.'); },
    },
    { id: 'camp2Fire', x: FIRE[0], z: FIRE[1], label: 'Sleep by the fire', radius: 2.6, read: 'camp2Sleep', when: (g) => inCamp(g) && !!g.flag('camp2D') && (!wennaJoined(g) || !!g.flag('camp2W')) && (!ottJoined(g) || !!g.flag('camp2O')) },
  ],
  pieces: [
    { id: 'nineRope', kind: 'rope', x: ROPE[0], z: ROPE[1], y: I.top + 0.6, len: I.top + 0.6 - BELOW_Y, when: (g) => at(g, NINE) === 'climb' || at(g, NINE) === 'foot' || g.flag('nineRope') === 'left' },
  ],
  hooks: (D) => {
    hook(D, 'comp_ottilie', (g) => (at(g, ILSE) === 'ottilie' ? 'il_o1' : at(g, ILSE) === 'shelf' ? 'il_oWait' : undefined), ottIlse);
    hook(D, 'ilse', (g) => (at(g, ILSE) === 'ask' ? 'il_i1' : at(g, ILSE) === 'shelf' ? 'il_iWait' : undefined), ilseNodes);
  },
};
