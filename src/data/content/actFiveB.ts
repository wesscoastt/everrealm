import type { DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { FELL_BARROWS, KB_CAMP, NG_GATE } from '../../world/morrow';
import { COMPANIONS } from '../companions';
import { heightAt } from '../../world/terrain';

// THE HELD, second half (docs/STORY_PLAN.md, Act V):
//
//   XL     The Fells at Night (storyFellsNight): the black goes back on Hollow Fell's stripped barrows by
//          night, as much of it as there is (lendBlack: all six with the Old Tower's or Pascall's slabs;
//          with only Wat's shovel, two, and the rest will take the winter).
//   XLI    The Kneeling Rise (storyKneelingRise): Pascall's men broke into the Hall of the Kneeling at
//          Kingsbarrow for the king's guard's black. The Kneeling are up. Ebba Platt's camp runs for the wall.
//   XLII   The Postern (storyPostern): the diggers through the postern, the Held behind them. Ebba's boy
//          is still out on the road. Ursel goes back for him, pushes him through, and tells you to bar it.
//          You do. Ursel Hale dies on the far side of her own gate (flag urselDead). Her sergeant, Gyda
//          Thwaite, takes the keys.
//   XLIII  What Wenna Does (storyWennaGrief): the morning after. Flag wennaGrief = 'stay' (you sit with
//          her) | 'alone' (you leave her be) | 'told' (you tell her it was your hand on the bar).
//   XLIV   Fifth Camp (storyCamp5): under the wall, the night after; Edda writes Ursel into the roll.

const FELLS = 'storyFellsNight', KNEEL = 'storyKneelingRise', POST = 'storyPostern', GRIEF = 'storyWennaGrief', CAMP = 'storyCamp5';
const ACT = 'The Held';

const OPEN = FELL_BARROWS.filter((b) => b[3] === 'open' || b[3] === 'ma');
/** Where the black goes back on each stripped barrow: beside its south side. */
const LAY = OPEN.map(([x, z, r], i) => ({ id: `fellLay${i}`, x: x + 0.5, z: z + r + 1.5 }));
// The postern is in the gate's west leaf: the road outside it (north), and the yard inside (south)
const OUT = { x: NG_GATE.x - 1.5, z: NG_GATE.z - 4.5 };
const IN = { x: NG_GATE.x - 1.5, z: NG_GATE.z + 3.5 };
const FIRE = { x: NG_GATE.x + 8.5, z: NG_GATE.z + 16.5 };

const joined = (g: GameApi, id: string) => !!g.flag(`comp:${id}:joined`) && !g.flag(`comp:${id}:gone`);
const laid = (g: GameApi) => LAY.filter((l) => g.flag(l.id)).length;
/** How many barrows the black can go back on tonight: all six with the slabs from Callis; two with Wat's shovel. */
const toLay = (g: GameApi) => (g.flag('lendBlack') === 'none' ? 2 : LAY.length);

// ================================================================ XL. THE FELLS AT NIGHT

const watNodes = {
  b5w1: {
    text: (g: GameApi) => (g.flag('lendBlack') === 'none'
      ? 'I\'ve dug out enough of the fell\'s own black for two barrows. Two, out of six. The rest will take the winter. We start with the two nearest the farms.'
      : 'The carts came up from Callis in the night. Sixty slabs, near enough. We lay them tonight, all six barrows, while the ones that are up are down in the valleys.'),
    next: 'b5w2',
  },
  b5w2: { text: 'Slab by slab, over the crown, like a blanket. The ones round each barrow will come to stop you. Then they\'ll stop.', effect: (g: GameApi) => g.setStage(FELLS, 'lay') },
  b5wWait: { text: (g: GameApi) => `${laid(g)} of ${toLay(g)}. Keep going. I\'m right behind you with the cart.` },
  b5wDone: {
    text: (g: GameApi) => (g.flag('lendBlack') === 'none'
      ? 'Two lying down. Four still open, and the winter in front of us. I\'ll be here. Where else would I be?'
      : 'Every barrow on the fell, black on its crown. Listen. Nothing. I\'ve not heard nothing up here since spring.'),
    next: 'b5w3',
  },
  b5w3: { text: 'There\'s a light up north, past the wall. Kingsbarrow. Somebody\'s working up there at night, and nobody works at night up there for anything good.', effect: (g: GameApi) => g.setStage(FELLS, 'done') },
};

// ================================================================ XLI. THE KNEELING RISE

const ebbaNodes = {
  b5e1: { text: 'You! Pascall\'s men came up a week ago with Assembly paper and a gang from the Keys. They went into the Hall of the Kneeling for the guards\' black. The Kneeling don\'t kneel any more.', next: 'b5e2' },
  b5e2: { text: 'There\'s nineteen of us left in this camp. Diggers who wouldn\'t go back down, and their families. We\'re going for the wall. Clear the road and we\'ll run.', effect: (g: GameApi) => g.setStage(KNEEL, 'camp') },
  b5eWait: { text: 'Clear them off the road! We\'re ready when you are!' },
  b5eRun: { text: 'That\'s the road clear. Everyone, now! Take nothing you can\'t run with. The postern, it\'s the postern or nothing.', effect: (g: GameApi) => g.setStage(KNEEL, 'done') },
};

// ================================================================ XLII. THE POSTERN

const urselPost: DialogueTree = {
  start: (g) => (at(g, POST) === 'last' ? 'p1' : 'pWait'),
  nodes: {
    pWait: { text: 'Through, through, one at a time! Don\'t push! Keep them off the road and we\'ll have every one of them in!' },
    p1: { speaker: 'narrator', text: 'The last of the diggers goes through the postern. Ebba Platt turns in the door and counts, and her face goes white.', next: 'p2' },
    p2: { as: 'ebba_thorne', text: 'Tobin. Where\'s Tobin? He was behind me on the road. He was right behind me.', next: 'p3' },
    p3: { speaker: 'narrator', text: 'Out on the road, a long way back, something small is running. Behind it the road is full of the Kneeling, in rows, the way they knelt.', next: 'p4' },
    p4: {
      text: (g) => (joined(g, 'wenna') ? 'I\'ll go. I\'m the Gatekeeper; it\'s my road. Wenna, Elwyn\'s girl, you get inside. You too. When I push him through, you bar it. Whatever you hear.' : 'I\'ll go. I\'m the Gatekeeper; it\'s my road. Get inside. When I push him through, you bar it. Whatever you hear.'),
      next: 'p5',
    },
    p5: {
      as: 'wenna', text: 'No. Ursel, no. Let me go. I\'m quicker than you.',
      next: 'p6',
    },
    p6: { text: 'You\'re quicker. I\'m older. Forty years I\'ve kept this gate. Let me keep it.', effect: (g) => g.setStage(POST, 'bar') },
  },
};

// ================================================================ XLIII. WHAT WENNA DOES

const wennaWall: DialogueTree = {
  start: (g) => (g.flag('wennaGriefDone') ? 'w_after' : 'w1'),
  nodes: {
    w1: { speaker: 'narrator', text: 'Wenna is sitting on the step inside the gate where Ursel used to sit, with Ursel\'s glove in her lap. She has been there since it was light.', next: 'w2' },
    w2: { text: 'Nine days. I knew her nine days. I\'ve known carters longer. She sat up all night asking about Dad, and I told her about the Michaelmas place he kept for her. And then I left her at a gate.', next: 'w3' },
    w3: {
      text: 'Tobin\'s alive. He\'s eating porridge in the barracks like nothing happened. I keep thinking that\'s what she\'d want me to look at. I can\'t look at it yet.',
      options: [
        { text: '(Sit down beside her and say nothing)', next: 'w_stay' },
        { text: 'I\'ll leave you be. I\'ll be in the town when you want me.', next: 'w_alone' },
        { text: 'It was my hand on the bar, Wenna. She told me to, and I did it.', next: 'w_told' },
      ],
    },
    w_stay: { speaker: 'narrator', text: 'You sit. After a long time she leans her shoulder against yours, and leaves it there, and the town goes about its morning under the wall.', effect: (g) => { g.setFlag('wennaGrief', 'stay'); g.compRapport('wenna', 10); g.setFlag('wennaGriefDone', 1); g.setStage(GRIEF, 'done'); } },
    w_alone: { text: 'Thank you. I\'ll come and find you. I don\'t know when.', effect: (g) => { g.setFlag('wennaGrief', 'alone'); g.compRapport('wenna', 3); g.setFlag('wennaGriefDone', 1); g.setStage(GRIEF, 'done'); } },
    w_told: { text: 'I know. I heard it go home. I\'d have done the same, if she\'d asked me. That\'s why she didn\'t ask me.', next: 'w_told2' },
    w_told2: { text: 'Don\'t carry it. She chose. She\'d be furious if you carried it. She was furious about most things. God, I wish I\'d had longer to find out which.', effect: (g) => { g.setFlag('wennaGrief', 'told'); g.compRapport('wenna', 6); g.setFlag('wennaGriefDone', 1); g.setStage(GRIEF, 'done'); } },
    w_after: { text: 'I\'m all right. I\'m not. I will be.' },
  },
};

// ================================================================ The new Gatekeeper

const gyda: DialogueTree = {
  start: (g) => {
    const f = at(g, 'hdFold');
    if (f === 'maud' || f === 'edda' || f === 'charge') return 'gFold';
    return 'g1';
  },
  nodes: {
    g1: {
      text: 'Gyda Thwaite. I was her sergeant twenty-two years. Now I\'ve the keys, and I keep reaching for her to ask where the oil for the hinges is kept.',
      options: [{ text: 'The barracks has cats, I hear.', effect: (g) => g.openShop('maud_hale') }, { text: 'I\'m sorry about Ursel.', next: 'g2' }, { text: 'Bye.' }],
    },
    g2: { text: 'So am I. She went out of her own gate for a boy who wasn\'t hers. That was her, all the way through. Shut it behind you.' },
    // Lew Garth's cats (heldSide.ts): Ursel would have made you find the old charge. Gyda knows it.
    gFold: { text: 'Lew Garth and his twelve cats. Ursel read me the first Gatekeeper\'s charge once, years back. Shut against the dead, never against the living. Cats are living. Mostly.', next: 'gFold2' },
    gFold2: {
      text: 'I can open the gate for an hour while it\'s light, or pass them through the postern one at a time. Your say.',
      options: [
        { text: 'Open the gate for an hour.', effect: (g) => { g.addMarks(380); g.setFlag('hdFold', 'gate'); g.setStage('hdFold', 'done'); } },
        { text: 'Use the postern. Keep the gate shut.', effect: (g) => { g.addMarks(380); g.setFlag('hdFold', 'postern'); g.setStage('hdFold', 'done'); } },
      ],
    },
  },
};

// ================================================================ XLIV. FIFTH CAMP

const campEdda: DialogueTree = {
  start: (g) => (g.flag('camp5E') ? 'ce_again' : 'ce1'),
  nodes: {
    ce1: { text: 'I\'ve written her into the roll. Under the Gatekeepers, where they go. "Ursel Hale, forty years at the gate. Went out of it for a child of the camp, and kept it shut behind her." I made it short. She\'d have cut it shorter.', next: 'ce2' },
    ce2: { text: 'The Kneeling went back down the road at first light. Back to the barrow, to kneel where Pascall\'s men found them. They\'ll stay there now, I think, if nobody goes in again.', effect: (g) => g.setFlag('camp5E', 1) },
    ce_again: { text: 'Sleep. I\'ll sit up with the roll. Somebody should.' },
  },
};
const campWenna: DialogueTree = {
  start: (g) => (g.flag('camp5W') ? 'cw_again' : 'cw1'),
  nodes: {
    cw1: {
      text: (g) => (g.flag('wennaGrief') === 'alone'
        ? 'I walked the wall all day. Every one of them saluted me. Every one. They think I\'m her. I\'m not her.'
        : 'Tobin brought me a cup of something hot and stood there till I drank it. Ten years old. He knew whose glove it was.'),
      next: 'cw2',
    },
    cw2: { text: 'I\'ll write to Bryn. He should know he had an aunt, and that she was like this. I don\'t know how to put it in a letter.', options: [{ text: 'Tell him about the gate.', next: 'cw_gate' }, { text: 'Tell him about the Michaelmas place.', next: 'cw_place' }] },
    cw_gate: { text: 'The gate. Yes. That\'s the bit he\'ll understand. Hales understand gates.', effect: (g) => { g.compRapport('wenna', 2); g.setFlag('camp5W', 1); } },
    cw_place: { text: 'That she was the one the place was kept for. Yes. He\'ll cry. Good. One of us should do it properly.', effect: (g) => { g.compRapport('wenna', 3); g.setFlag('camp5W', 1); } },
    cw_again: { text: 'I\'ll take the first watch. I\'ll take it on the wall.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [FELLS]: {
    id: FELLS, name: 'The Fells at Night', story: { chapter: 40, title: 'The Fells at Night', act: ACT }, next: [KNEEL, 'north'],
    notes: (g, s) => {
      if (s === 'wat') return 'The black for Hollow Fell is ready. Wat Aske is at Cold Harbour.';
      if (s === 'lay') return g.flag('lendBlack') === 'none' ? 'Wat has dug enough of the fell\'s own black for two barrows. The rest will take the winter.' : 'Sixty slabs came up from Callis. Lay the black back over the six stripped barrows on Hollow Fell, tonight.';
      return 'There\'s a light at Kingsbarrow, past Northgate\'s wall. Somebody is working there at night.';
    },
    objectives: (g, s) => {
      if (s === 'wat') return [{ text: 'Talk to Wat Aske', marker: 'wat_aske' }];
      if (s === 'lay') { const n = laid(g), k = toLay(g); return n >= k ? [{ text: 'Tell Wat', marker: 'wat_aske' }] : [{ text: `Lay the black back on the stripped barrows (${n}/${k})`, marker: LAY.find((l) => !g.flag(l.id))?.id }]; }
      return [];
    },
    marks: (g, s): Marks => (s === 'wat' || (s === 'lay' && laid(g) >= toLay(g)) ? { wat_aske: '?' } : {}),
    walk: { from: { quests: { storyLendBlack: 'done', [FELLS]: 'wat' }, flags: { lendBlack: 'tower' } } },
  },
  [KNEEL]: {
    id: KNEEL, name: 'The Kneeling Rise', story: { chapter: 41, title: 'The Kneeling Rise', act: ACT }, next: [POST, 'hold'],
    notes: (g, s) => {
      if (s === 'north') return 'A light at Kingsbarrow, at night. Ebba Platt\'s diggers' + '\' camp is beside the king\'s barrow.';
      if (s === 'camp') return 'Pascall\'s men broke into the Hall of the Kneeling for the king\'s guard\'s black. The Kneeling are up, and Ebba\'s camp of nineteen means to run for the wall.';
      return 'The road from Kingsbarrow is clear. Ebba\'s people are running for Northgate\'s postern.';
    },
    objectives: (g, s) => {
      if (s === 'north') return [{ text: 'Go to the diggers\' camp at Kingsbarrow', marker: 'ebba_thorne' }];
      if (s === 'camp') { const k = Math.min(6, killed(g, 'kneel')); return k >= 6 ? [{ text: 'Tell Ebba the road is clear', marker: 'ebba_thorne' }] : [{ text: `Clear the Kneeling off the road (${k}/6)`, marker: 'ebba_thorne' }]; }
      return [];
    },
    marks: (g, s): Marks => (s === 'north' || (s === 'camp' && killed(g, 'kneel') >= 6) ? { ebba_thorne: '?' } : {}),
    walk: { from: { quests: { [FELLS]: 'done', [KNEEL]: 'north' } } },
  },
  [POST]: {
    id: POST, name: 'The Postern', story: { chapter: 42, title: 'The Postern', act: ACT }, next: [GRIEF, 'morning'],
    notes: (g, s) => {
      if (s === 'hold') return 'Ebba\'s people are coming through Northgate\'s postern one at a time, and the Kneeling are coming down the road behind them.';
      if (s === 'last') return 'Every digger through but one. Ursel is at the postern.';
      if (s === 'bar') return 'Ursel has gone back up the road for Ebba\'s boy. When she pushes him through the postern, bar it. Whatever you hear.';
      return 'Ursel Hale went out of her own gate for a boy who wasn\'t hers, and I barred it behind her. Her sergeant, Gyda Thwaite, has the keys.';
    },
    objectives: (g, s) => {
      if (s === 'hold') { const k = Math.min(8, killed(g, 'postern')); return [{ text: `Hold the road at the postern (${k}/8)`, marker: 'ursel_post' }]; }
      if (s === 'last') return [{ text: 'Talk to Ursel at the postern', marker: 'ursel_post' }];
      if (s === 'bar') return [{ text: 'Bar the postern', marker: 'b5Bar' }];
      return [];
    },
    advance: (g, s) => (s === 'hold' && killed(g, 'postern') >= 8 ? 'last' : null),
    marks: (_g, s): Marks => (s === 'last' ? { ursel_post: '?' } : {}),
    walk: { from: { quests: { [KNEEL]: 'done', [POST]: 'hold' }, flags: { 'comp:wenna:joined': 1 } } },
  },
  [GRIEF]: {
    id: GRIEF, name: 'What Wenna Does', story: { chapter: 43, title: 'What Wenna Does', act: ACT }, next: [CAMP, 'wall'],
    notes: (g, s) => (s === 'morning' ? 'The morning after. Wenna is sitting inside the gate, where Ursel used to sit.' : g.flag('wennaGrief') === 'stay' ? 'I sat with Wenna on Ursel\'s step until the town was awake.' : g.flag('wennaGrief') === 'told' ? 'I told Wenna it was my hand on the bar. She knew. She said not to carry it.' : 'I left Wenna on Ursel\'s step. She said she\'d find me.'),
    objectives: (_g, s) => (s === 'morning' ? [{ text: 'Find Wenna inside the gate', marker: 'wenna_wall' }] : []),
    marks: (_g, s): Marks => (s === 'morning' ? { wenna_wall: '?' } : {}),
    // Without Wenna, there is nobody on the step
    advance: (g, s) => (s === 'morning' && !joined(g, 'wenna') ? 'done' : null),
    walk: { from: { quests: { [POST]: 'done', [GRIEF]: 'morning' }, flags: { 'comp:wenna:joined': 1, urselDead: 1 } } },
  },
  [CAMP]: {
    id: CAMP, name: 'Fifth Camp', story: { chapter: 44, title: 'Fifth Camp', act: ACT }, next: ['storyDownStorey', 'letter'],
    notes: (_g, s) => (s === 'wall' ? 'A fire under the wall, inside the gate. Edda Rusk has brought the roll.' : s === 'camp' ? 'A fire under Northgate\'s wall, the night after.' : 'Ursel Hale is in the Gatekeepers\' roll. The Kneeling have gone back to their barrow.'),
    objectives: (g, s) => {
      if (s === 'wall') return [{ text: 'Go to the fire under the wall', marker: 'camp5Fire' }];
      if (s !== 'camp') return [];
      const o: { text: string; marker?: string; done?: boolean }[] = [{ text: 'Sit with Edda Rusk', done: !!g.flag('camp5E'), marker: 'camp5_edda' }];
      if (joined(g, 'wenna')) o.push({ text: 'Sit with Wenna', done: !!g.flag('camp5W'), marker: 'camp5_wenna' });
      o.push({ text: 'Sleep under the wall', marker: 'camp5Fire' });
      return o;
    },
    marks: (g, s): Marks => (s === 'camp' ? { ...(!g.flag('camp5E') ? { camp5_edda: '?' as const } : {}), ...(joined(g, 'wenna') && !g.flag('camp5W') ? { camp5_wenna: '?' as const } : {}) } : {}),
    advance: (g, s) => {
      if (s !== 'wall' || !g.compNear(FIRE.x, FIRE.z, 12)) return null;
      if (g.compActive()) g.compDismiss();
      return 'camp';
    },
    walk: { from: { quests: { [GRIEF]: 'done', [CAMP]: 'wall' }, flags: { 'comp:wenna:joined': 1, urselDead: 1 } }, auto: { wall: 'camp' } },
  },
};

const URSEL_LOOK = { skin: '#d8b8a0', eyes: '#5a6a7a', hair: '#8a7a6a', hairStyle: 2, tunic: '#3a4048', trim: '#b8a878', trousers: '#2a2a30', boots: '#1e1a16', shoulderPads: '#5a5a62', cape: '#2a3038', lashes: true, scar: true, build: 1.1, age: 0.6, frame: 'f' as const };
const inCamp = (g: GameApi) => at(g, CAMP) === 'camp';

export const ACT_FIVE_B: RegionContent = {
  id: 'actFiveB',
  npcs: [
    { land: 'morrow', id: 'ursel_post', name: 'Ursel Hale', title: 'Gatekeeper of Northgate', look: URSEL_LOOK, schedule: [{ from: 0, to: 24, at: [OUT.x + 1.6, OUT.z - 1], face: [OUT.x, OUT.z - 10], anim: 'idle' }], barks: ['One at a time!', 'Keep coming!'], when: (g) => at(g, POST) === 'hold' || at(g, POST) === 'last' },
    { land: 'morrow', id: 'wenna_wall', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: COMPANIONS.wenna.look, schedule: [{ from: 0, to: 24, at: [NG_GATE.x + 1.5, NG_GATE.z + 6.5], face: [NG_GATE.x + 1.5, NG_GATE.z + 12], anim: 'idle' }], barks: [], when: (g) => at(g, GRIEF) === 'morning' && joined(g, 'wenna') },
    { land: 'morrow', id: 'ng_gatekeeper', name: 'Gyda Thwaite', title: 'Gatekeeper of Northgate', look: { skin: '#c8a888', hair: '#6a5a4a', hairStyle: 1, eyes: '#4a5a4a', tunic: '#3a4048', trim: '#b8a878', trousers: '#2a2a30', boots: '#1e1a16', shoulderPads: '#5a5a62', cape: '#2a3038', build: 1.15, age: 0.55, frame: 'f', lashes: true }, schedule: [{ from: 0, to: 24, at: [NG_GATE.x + 1.5, NG_GATE.z + 6.5], face: [NG_GATE.x + 1.5, NG_GATE.z + 12], anim: 'idle' }], barks: ['Shut it behind you.', 'Oil for the hinges. Where did she keep it.'], when: (g) => !!g.flag('urselDead') && at(g, GRIEF) !== 'morning' },
    { land: 'morrow', id: 'camp5_edda', name: 'Edda Rusk', title: 'Keeper of the Gatekeepers\' Archive', look: { skin: '#e0c0a8', hair: '#c8c4bc', hairStyle: 2, eyes: '#5a6a7a', tunic: '#4a4a5a', trim: '#a89878', trousers: '#3a3a42', boots: '#2a241e', frame: 'f', lashes: true, build: 0.9, age: 0.85 }, schedule: [{ from: 0, to: 24, at: [FIRE.x + 0.3, FIRE.z - 2.4], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: inCamp },
    { land: 'morrow', id: 'camp5_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: COMPANIONS.wenna.look, schedule: [{ from: 0, to: 24, at: [FIRE.x - 2.3, FIRE.z + 1.2], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && joined(g, 'wenna') },
  ],
  dialogue: { ursel_post: urselPost, wenna_wall: wennaWall, ng_gatekeeper: gyda, camp5_edda: campEdda, camp5_wenna: campWenna },
  quests: QUESTS,
  readables: {
    ...Object.fromEntries(LAY.map((l) => [l.id, {
      title: 'The barrow',
      body: 'Slab by slab, over the crown, like a blanket: Wat hands them up off the cart and you set them, edge to edge. Before the last one is down, the ones round the barrow have stopped. They kneel in the heather, and then they lie down.',
      effect: (g: GameApi) => g.setFlag(l.id, 1),
    }])),
    b5Bar: {
      title: 'The postern',
      body: 'Ursel shoves the boy through the door into your arms, and her hand comes off his collar, and the door is open on the road and the Kneeling and her back.\n\n"Bar it!"\n\nYou put the bar across. It goes home with a sound you will hear for a long time.\n\nOn the far side of the door, for a little while, there is the Gatekeeper of Northgate keeping her gate. Then there is nothing.',
      effect: (g) => { g.setFlag('urselDead', 1); g.setStage(POST, 'done'); },
    },
    camp5Sleep: {
      title: 'Under the wall',
      body: (g) => `The fire burns under the wall, where the Gatekeepers have sat for three hundred years. ${joined(g, 'wenna') ? 'Wenna takes the first watch on the wall-walk, and is still there in the morning.' : ''}\n\nIn the morning there is a letter from Callis for you, sealed with the Assembly's two towers. The Old Tower has moved.`,
      effect: (g) => { if (inCamp(g)) g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    ...LAY.map((l, i) => ({ land: 'morrow' as const, id: l.id, x: l.x, z: l.z, label: 'Lay the black back over the barrow', radius: 2.6, read: l.id, when: (g: GameApi) => at(g, FELLS) === 'lay' && !g.flag(l.id) && i < toLay(g) })),
    // (the gate's yard is paved up eight blocks over the hillside it stands on)
    { land: 'morrow', id: 'b5Bar', x: IN.x, z: NG_GATE.z + 8, y: Math.floor(heightAt(IN.x, NG_GATE.z + 8)) + 8, label: 'Bar the postern', radius: 3.6, read: 'b5Bar', when: (g) => at(g, POST) === 'bar' },
    { land: 'morrow', id: 'camp5Fire', x: FIRE.x, z: FIRE.z, label: 'Sleep under the wall', radius: 2.6, read: 'camp5Sleep', when: (g) => inCamp(g) && !!g.flag('camp5E') && (!joined(g, 'wenna') || !!g.flag('camp5W')) },
  ],
  spawns: [
    { land: 'morrow', tag: 'kneel', type: 'risen', at: [[KB_CAMP.x - 14, KB_CAMP.z + 10], [KB_CAMP.x - 8, KB_CAMP.z + 16], [KB_CAMP.x + 4, KB_CAMP.z + 18], [KB_CAMP.x - 18, KB_CAMP.z + 2], [KB_CAMP.x - 2, KB_CAMP.z + 22], [KB_CAMP.x + 10, KB_CAMP.z + 14]], when: (g) => at(g, KNEEL) === 'camp' },
    { land: 'morrow', tag: 'postern', type: 'risen', at: [[OUT.x - 6, OUT.z - 18], [OUT.x + 4, OUT.z - 20], [OUT.x - 2, OUT.z - 26], [OUT.x + 8, OUT.z - 14], [OUT.x - 10, OUT.z - 12], [OUT.x + 2, OUT.z - 32], [OUT.x - 8, OUT.z - 30], [OUT.x + 10, OUT.z - 24]], when: (g) => at(g, POST) === 'hold' },
  ],
  pieces: [
    { id: 'camp5Fire', kind: 'campfire', x: FIRE.x, z: FIRE.z, when: (g) => at(g, CAMP) === 'wall' || inCamp(g) },
    { id: 'camp5RollW', kind: 'bedroll', x: FIRE.x - 3.4, z: FIRE.z + 0.4, ry: 1.3, tint: '#2e3a4a', when: (g) => (at(g, CAMP) === 'wall' || inCamp(g)) && joined(g, 'wenna') },
    { id: 'camp5RollP', kind: 'bedroll', x: FIRE.x - 1.6, z: FIRE.z + 3.4, ry: 2.6, tint: '#7a3a2e', when: (g) => at(g, CAMP) === 'wall' || inCamp(g) },
  ],
  hooks: (D) => {
    hook(D, 'wat_aske', (g) => {
      const f = at(g, FELLS);
      if (f === 'wat') return 'b5w1';
      if (f === 'lay') return laid(g) >= toLay(g) ? 'b5wDone' : 'b5wWait';
      return undefined;
    }, watNodes);
    hook(D, 'ebba_thorne', (g) => {
      const k = at(g, KNEEL);
      if (k === 'north') return 'b5e1';
      if (k === 'camp') return killed(g, 'kneel') >= 6 ? 'b5eRun' : 'b5eWait';
      return undefined;
    }, ebbaNodes);
  },
};
