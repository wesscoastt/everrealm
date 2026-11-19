import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories at Holme Staithe, on the Wrath Levels (owner 2026-11-13, content order: fill the Counties first),
// with the morality system's choices (docs/MORALITY.md). Both follow from the drain.
//
// hsDickon, DICKON (Peg Haddow, after Eel Sunday): Peg's nephew went to dig Harrowgate's drain for a shilling a day. A
// tree came down on him at the cut and broke his leg, and the company put him off without a penny. He's lying out
// at the cut, and Peg won't go. Past the fen jellies in the cut, Dickon won't come to Peg's either: carry him home anyway
// (Peg takes him in, grumbling), ([Kind]) bring Peg out to him, have the reeve write to Harrowgate for what they owe him,
// or ([Bad or Evil]) point him at Stilt Fort, where a man who knows the drain is worth something.
// hsDickon = 'home' | 'together' | 'paid' | 'fort'.
//
// hsTraps, EMPTY TRAPS (Hannah Rush, eel-catcher, the staithe): every morning her grigs are empty and lifted wrong. The
// trail goes south across the fen to Stilt Fort. On the approach, poachers, and a girl, Kezzy Bunting, whose family's
// mere the drain took; they eat what they lift. Report it to the reeve, ([Kind]) get Hannah to give the Buntings two
// grigs of their own, tell Hannah the eels just aren't running, or ([Bad or Evil]) take a cut of what the poachers lift.
// hsTraps = 'reeve' | 'shared' | 'running' | 'cut'.

const DICKON_Q = 'hsDickon', TRAPS = 'hsTraps';
const DICKON = { x: -858.5, z: 968.5 }, PEG_OUT = { x: -856.5, z: 970.5 };
const JELLIES: [number, number][] = [[-862, 972], [-856, 962]];
const HANNAH = { x: -915.5, z: 1017.5 }, GRIG = { x: -924.5, z: 1016.5 };
const TRAIL: [number, number][] = [[GRIG.x, GRIG.z], [-936, 958], [-932, 925]];
const KEZZY = { x: -930.5, z: 908.5 };
const POACHERS: [number, number][] = [[-936, 913], [-925, 914]];

const tracked = (g: GameApi) => TRAIL.filter((_, i) => g.flag('hsTrail' + i)).length;

// ================================================================ Dickon

const pegNodes: Record<string, DNode> = {
  dk1: { text: 'Dickon. A tree came down on him at the cut. Broke his leg in two places. The company put him off the same day, without a penny, because a man who can\'t dig isn\'t a digger.', next: 'dk2' },
  dk2: { text: 'He\'s lying out at the cut, under a hurdle. I\'ve not been. I\'m not going. He went to dig the drain that\'s killing this village. He can lie in it.', next: 'dk3' },
  dk3: {
    text: 'Somebody should take him some bread. I\'m not saying who. I\'m saying somebody.',
    options: [{ text: 'I\'ll take him some bread.', effect: (g) => { g.give('hs_bread', 1); g.setStage(DICKON_Q, 'cut'); }, next: 'dk4' }, { text: 'Not now, Peg.' }],
  },
  dk4: { text: 'That\'s my bread. Don\'t tell him it\'s my bread.' },
  dkPeg: { speaker: 'narrator', text: 'Peg looks at Dickon in the doorway on your shoulder for a long moment. Then she says "Mind the step, you great fool," and takes his other arm, and that\'s that.', options: [{ text: 'He\'s home, Peg.', effect: (g) => { g.addMarks(80); g.setStage(DICKON_Q, 'done'); } }] },
  dkAfter: {
    text: (g) => {
      const f = g.flag(DICKON_Q);
      if (f === 'home' || f === 'together') return 'He sits in the corner with his leg up and peels eels. Badly. I tell him so every day. It\'s nice to have somebody to tell.';
      if (f === 'paid') return 'Harrowgate paid him four pound and a letter saying it wasn\'t their fault. He\'s gone to his mother\'s at Pinchbeck. He sent me a card. I\'ve put it up.';
      return 'Dickon\'s at Stilt Fort, they say. With the poachers. Don\'t talk to me about Dickon.';
    },
  },
};

const dickon: DialogueTree = {
  start: (g) => (at(g, DICKON_Q) === 'cut' && killed(g, 'hsJellies') >= JELLIES.length ? 'd1' : at(g, DICKON_Q) === 'cut' ? 'd0' : 'dAfter'),
  nodes: {
    d0: { text: 'Get rid of those things first. They come up out of the cut at dark. I can\'t get up to shift them.' },
    d1: { speaker: 'narrator', text: 'A big young man on a straw pallet by the cut, under a hurdle propped against the bank for shelter, his leg splinted with drain staves, eating Peg\'s bread before you\'ve finished saying whose it isn\'t.', next: 'd2' },
    d2: { text: 'She sent bread. That means she\'s not speaking to me. If she was speaking to me she\'d have come herself and shouted.', next: 'd3' },
    d3: {
      text: 'I\'m not going back there to be told. I\'d sooner lie here. What are you looking at me like that for?',
      options: [
        { text: 'You\'re coming home. Lean on me.', moral: { id: 'hsDickon:home', a: 4, tr: { compassion: 2, courage: 1 }, npc: { hs_dickon: 15, haddow: 15 } }, effect: (g) => { g.take('hs_bread', 1); g.setFlag(DICKON_Q, 'home'); g.setStage(DICKON_Q, 'peg'); }, next: 'dH' },
        { text: 'Stay there. I\'m bringing Peg out to you.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'hsDickon:together', a: 6, tr: { compassion: 3 }, npc: { hs_dickon: 20, haddow: 20 }, note: 'Brought Peg Haddow out to the drain cut to fetch her nephew home herself.', fame: 'got Peg Haddow to walk out to the drain for Dickon', spread: 'local' }, effect: (g) => { g.take('hs_bread', 1); g.setFlag(DICKON_Q, 'together'); g.addMarks(90); g.setStage(DICKON_Q, 'done'); }, next: 'dT' },
        { text: 'The reeve can write to Harrowgate. They owe you for that leg.', moral: { id: 'hsDickon:paid', a: 3, tr: { honesty: 2, courage: 2 }, rep: { company: -4, holme: 4 }, npc: { hs_dickon: 10, tilney: 5 } }, effect: (g) => { g.take('hs_bread', 1); g.setFlag(DICKON_Q, 'paid'); g.setStage(DICKON_Q, 'tilney'); }, next: 'dP' },
        { text: 'There\'s work at Stilt Fort for a man who knows where the drain runs.', need: { band: ['bad', 'evil'] }, moral: { id: 'hsDickon:fort', a: -8, tr: { cruelty: 2, deception: 2 }, rep: { poachers: 8, holme: -5 }, npc: { haddow: -30 }, note: 'Sent Peg Haddow\'s broken-legged nephew to the Stilt Fort poachers.' }, effect: (g) => { g.take('hs_bread', 1); g.setFlag(DICKON_Q, 'fort'); g.addMarks(50); g.setStage(DICKON_Q, 'done'); }, next: 'dF' },
      ],
    },
    dH: { text: 'She\'ll shout. Fine. Fine. She can shout. Mind the leg.' },
    dT: { speaker: 'narrator', text: 'It takes Peg an hour to come, and she comes the long way round, and stands over him with her arms folded. "Look at you," she says. Dickon says, "I know." Then she sits down on the pallet beside him and doesn\'t say anything else for a long time.' },
    dP: { text: 'The reeve. Ambrose Tilney writes everything down. If he writes it to Harrowgate, they\'ll have to read it. Will you ask him?' },
    dF: { text: 'Stilt Fort. With the poachers. I\'d be paid in eels, I suppose. Better than nothing. Better than Peg.' },
    dAfter: { text: (g) => (g.flag(DICKON_Q) === 'fort' ? 'Not here. Go away.' : 'Mind the leg.') },
  },
};

const tilneyNodes: Record<string, DNode> = {
  dkT1: { text: 'A leg broken at the company\'s cut, and put off the same day. Yes. I\'ll write it, with the date, the hour, and the names of the men who carried him out. Harrowgate don\'t like a letter with names in it.', options: [{ text: 'Thank you, Ambrose.', effect: (g) => { g.addMarks(80); g.setStage(DICKON_Q, 'done'); } }] },
};

// ================================================================ Empty Traps

const hannah: DialogueTree = {
  start: (g) => {
    const s = at(g, TRAPS);
    if (!s) return 'h1';
    if (s === 'hannah') return 'h9';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    h1: { speaker: 'narrator', text: 'A woman in a sacking apron with a long-handled grig, a wicker eel trap, held up to the light, picking at the knot on its mouth.', next: 'h2' },
    h2: { text: 'Hannah Rush. I catch eels. Or I did, till a fortnight ago. Every morning my grigs are empty, and they\'ve been lifted and set back wrong. Look at this knot. That\'s a Pinchbeck knot. Nobody in Holme ties a Pinchbeck knot.', next: 'h3' },
    h3: {
      text: 'Somebody\'s lifting my traps at night. Find out who.',
      options: [{ text: 'I\'ll follow them.', effect: (g) => g.setStage(TRAPS, 'trail') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, TRAPS) === 'trail' ? `The trail. Start at my grig at the end of the staithe. ${tracked(g)} signs found.` : 'Well? Who is it?') },
    h9: { text: 'Well? Who\'s lifting my eels?', next: 'h10' },
    h10: {
      text: (g) => (g.flag('hsKezzy') ? 'Kezzy Bunting. The Buntings of Gull Mere. Gull Mere\'s a field of wheat now. I knew her mother.' : 'Who?'),
      options: [
        { text: 'Poachers from Stilt Fort. The reeve should hear it.', moral: { id: 'hsTraps:reeve', tr: { honesty: 2 }, rep: { holme: 3, poachers: -10 }, npc: { hs_hannah: 10, hs_kezzy: -20 } }, effect: (g) => { g.setFlag(TRAPS, 'reeve'); g.addMarks(70); g.setStage(TRAPS, 'done'); }, next: 'hR' },
        { text: 'The Buntings, eating what they lift. Give them two grigs of their own, and they\'ll leave yours be.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'hsTraps:shared', a: 5, tr: { compassion: 3, generosity: 2 }, rep: { holme: 3, poachers: 5 }, npc: { hs_hannah: 10, hs_kezzy: 20 }, note: 'Talked Hannah Rush into giving the starving Buntings two eel traps of their own.', fame: 'got the Buntings their own eel traps on the staithe', spread: 'local' }, effect: (g) => { g.setFlag(TRAPS, 'shared'); g.addMarks(80); g.setStage(TRAPS, 'done'); }, next: 'hS' },
        { text: 'Nobody. The eels just aren\'t running this year.', moral: { id: 'hsTraps:running', tr: { deception: 3, compassion: 1 }, npc: { hs_kezzy: 10 } }, effect: (g) => { g.setFlag(TRAPS, 'running'); g.addMarks(50); g.setStage(TRAPS, 'done'); }, next: 'hN' },
        { text: '(Say nothing about the poachers. They\'re paying you a third.)', need: { band: ['bad', 'evil'] }, moral: { id: 'hsTraps:cut', a: -8, tr: { greed: 4, deception: 3 }, rep: { poachers: 10 }, npc: { hs_hannah: -10 }, note: 'Took a third of what the Stilt Fort poachers lifted from Hannah Rush\'s traps.' }, effect: (g) => { g.setFlag(TRAPS, 'cut'); g.addMarks(120); g.setStage(TRAPS, 'done'); }, next: 'hN' },
      ],
    },
    hR: { text: 'Stilt Fort. I\'ll tell Ambrose, and he\'ll write it down, and nothing will happen, and I\'ll feel better. That\'s what the reeve\'s for.' },
    hS: { text: 'Two grigs. Of mine. To a Bunting. My mother would turn over. She knew Kezzy\'s gran. She\'d have done it first. Fine. Two. The old ones.' },
    hN: { text: 'Not running. Then why\'s the knot wrong? Fine. If you say so. I\'ll sit up myself tomorrow.' },
    after: {
      text: (g) => {
        const f = g.flag(TRAPS);
        if (f === 'shared') return 'Kezzy\'s on the staithe of a morning now, with her two grigs. She ties a Pinchbeck knot. I\'m teaching her a proper one.';
        if (f === 'reeve') return 'Ambrose wrote it down. Nothing happened. The traps are full again, though. I suppose they went somewhere else.';
        return 'Still empty, some mornings. I sit up now. I never see anybody.';
      },
    },
  },
};

const kezzy: DialogueTree = {
  start: (g) => (killed(g, 'hsPoachers') >= POACHERS.length ? 'k1' : 'k0'),
  nodes: {
    k0: { text: 'Go away! They\'ll see you!' },
    k1: { speaker: 'narrator', text: 'A girl of twelve with a sack of eels on her back, standing very still at the edge of the reeds as though stillness might make her invisible.', next: 'k2' },
    k2: { text: 'Kezzy Bunting. Of Gull Mere. There isn\'t a Gull Mere any more, it\'s Harrowgate\'s wheat, so I suppose I\'m of nowhere. We lift what we can. We eat what we lift.', options: [{ text: 'I\'ll tell Hannah who it is.', effect: (g) => { g.setFlag('hsKezzy', 1); g.setStage(TRAPS, 'hannah'); } }] },
  },
};

const quests: Record<string, QuestDef> = {
  [DICKON_Q]: {
    id: DICKON_Q, name: 'Dickon', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'cut') return 'Peg Haddow\'s nephew Dickon broke his leg digging Harrowgate\'s drain and was put off without a penny. He\'s lying out at the cut, by the sluice. Peg sent bread and won\'t go herself.';
      if (s === 'peg') return 'I\'m bringing Dickon home to the Staithe House, whether either of them likes it.';
      if (s === 'tilney') return 'Ambrose Tilney, the reeve, can write to Harrowgate for what they owe Dickon.';
      const f = g.flag(DICKON_Q);
      return f === 'home' || f === 'together' ? 'Dickon is home at the Staithe House.' : f === 'paid' ? 'Harrowgate paid Dickon for his leg.' : 'Dickon went to Stilt Fort.';
    },
    objectives: (g, s) => (s === 'cut' ? [{ text: `Clear the fen jellies from the cut (${Math.min(JELLIES.length, killed(g, 'hsJellies'))}/${JELLIES.length})`, done: killed(g, 'hsJellies') >= JELLIES.length }, { text: 'Talk to Dickon', marker: 'hs_dickon' }]
      : s === 'peg' ? [{ text: 'Bring Dickon to Peg Haddow', marker: 'haddow' }] : s === 'tilney' ? [{ text: 'Ask Ambrose Tilney to write to Harrowgate', marker: 'tilney' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'hsBab') === 'done' ? { haddow: '!' } : s === 'peg' ? { haddow: '?' } : s === 'tilney' ? { tilney: '?' } : {}),
    walk: { cast: ['haddow', 'hs_dickon', 'tilney'], kill: { cut: [['fenjelly', 2]] }, from: { quests: { hsBab: 'done', otSluice: 'done' }, flags: { hsBab: 'rule', hsChoice: 'quiet' } } },
  },
  [TRAPS]: {
    id: TRAPS, name: 'Empty Traps', region: 'wrath', depth: 'quest',
    notes: (g, s) => {
      if (s === 'trail') return 'Somebody lifts Hannah Rush\'s eel traps every night and ties them back with a knot nobody in Holme ties. Start at her grig at the end of the staithe.';
      if (s === 'poachers') return 'The trail runs south across the fen to Stilt Fort.';
      if (s === 'hannah') return 'Kezzy Bunting, of Gull Mere that Harrowgate drained, and the Stilt Fort poachers. Hannah should hear it, or not.';
      const f = g.flag(TRAPS);
      return f === 'shared' ? 'Hannah gave the Buntings two grigs of their own.' : f === 'reeve' ? 'The reeve heard about the poachers.' : 'I told Hannah the eels weren\'t running.';
    },
    objectives: (g, s) => (s === 'trail' ? TRAIL.map((_, i) => ({ text: `Follow the trail (${['the grig', 'the fen', 'the reeds'][i]})`, done: !!g.flag('hsTrail' + i), marker: 'hsTrail' + i }))
      : s === 'poachers' ? [{ text: `Deal with the poachers on the approach (${Math.min(POACHERS.length, killed(g, 'hsPoachers'))}/${POACHERS.length})`, done: killed(g, 'hsPoachers') >= POACHERS.length }, { text: 'Talk to whoever\'s carrying the eels', marker: 'hs_kezzy' }]
      : s === 'hannah' ? [{ text: 'Go back to Hannah Rush on the staithe', marker: 'hs_hannah' }] : []),
    advance: (g, s) => (s === 'trail' && tracked(g) >= TRAIL.length ? 'poachers' : null),
    marks: (_g, s): Marks => (!s ? { hs_hannah: '!' } : s === 'hannah' ? { hs_hannah: '?' } : {}),
    walk: { cast: ['hs_hannah', 'hs_kezzy'], kill: { poachers: [['fenpoacher', 2]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'hsJellies', type: 'fenjelly', at: JELLIES, when: (g) => at(g, DICKON_Q) === 'cut' },
  { tag: 'hsPoachers', type: 'fenpoacher', at: POACHERS, when: (g) => at(g, TRAPS) === 'poachers' },
];

const TRAIL_TOASTS = [
  'The grig\'s been lifted and set back, its mouth tied with a knot you don\'t know. Wet bare footprints go off the end of the staithe and along the reed edge, south.',
  'Out on the fen, a dropped eel, still alive, and the same bare feet, small ones, going on south toward the stilts of the old fort.',
  'In the reeds, a sack-print where something heavy was set down to rest, and a child\'s bootlace. Stilt Fort is just ahead.',
];

const things: WorldThing[] = TRAIL.map(([x, z], i): WorldThing => ({
  id: 'hsTrail' + i, x, z, label: 'Look closer', radius: 2.6, look: i === 0 ? 'none' : 'tracks',
  when: (g) => at(g, TRAPS) === 'trail' && !g.flag('hsTrail' + i),
  use: (g) => { g.setFlag('hsTrail' + i, 1); g.toast(TRAIL_TOASTS[i]); },
}));

const NPCS: NpcDef[] = [
  { id: 'hs_dickon', name: 'Dickon Haddow', title: 'Late of the drain gang', look: { skin: '#d8a882', hair: '#8a5a2a', hairStyle: 1, eyes: '#4a5a4a', tunic: '#5a5040', trim: '#3a3428', trousers: '#3a3430', boots: '#2a1e14', build: 1.2, age: 0.22 },
    schedule: [{ from: 0, to: 24, at: [DICKON.x, DICKON.z], face: [DICKON.x - 3, DICKON.z], anim: 'seated' }], when: (g) => at(g, DICKON_Q) === 'cut' || at(g, DICKON_Q) === 'tilney', barks: ['Mind the leg.'] },
  { id: 'hs_hannah', name: 'Hannah Rush', title: 'Eel-catcher, Holme Staithe', look: { frame: 'f', skin: '#c8956a', hair: '#4a3a2a', hairStyle: 2, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#3a4a2a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.05, age: 0.5 },
    schedule: [{ from: 5, to: 20, at: [HANNAH.x, HANNAH.z], face: [HANNAH.x - 4, HANNAH.z - 2], anim: 'idle' }], barks: ['That\'s a Pinchbeck knot.'] },
  { id: 'hs_kezzy', name: 'Kezzy Bunting', title: 'Of Gull Mere', look: { frame: 'f', skin: '#e0b48e', hair: '#6a4a2a', hairStyle: 2, eyes: '#4a4a3a', tunic: '#5a5a3a', trim: '#3a3a2a', trousers: '#3a3430', boots: '#2a1e14', freckles: true, lashes: true, build: 0.7, age: 0.1 },
    schedule: [{ from: 0, to: 24, at: [KEZZY.x, KEZZY.z], face: [KEZZY.x, KEZZY.z + 4], anim: 'idle' }], when: (g) => at(g, TRAPS) === 'poachers', barks: ['Go away!'] },
];

const ITEMS: ItemDef[] = [
  { id: 'hs_bread', name: 'Peg\'s bread', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#c8a060', b: '#8a6a3a' }, desc: 'A loaf from the Staithe House, still warm, which is not from Peg.' },
];

export const HOLME_DRAIN: RegionContent = {
  id: 'holmeDrain',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { hs_dickon: dickon, hs_hannah: hannah, hs_kezzy: kezzy },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'haddow', (g) => {
      const s = at(g, DICKON_Q);
      if (s === 'peg') return 'dkPeg';
      return undefined;
    }, pegNodes);
    addOption(D, 'haddow', 'main', { text: 'How\'s Dickon?', cond: (g) => at(g, 'hsBab') === 'done' && !at(g, DICKON_Q), next: 'dk1' });
    addOption(D, 'haddow', 'main', { text: 'About Dickon.', cond: (g) => at(g, DICKON_Q) === 'done', next: 'dkAfter' });
    hook(D, 'tilney', (g) => (at(g, DICKON_Q) === 'tilney' ? 'dkT1' : undefined), tilneyNodes);
  },
};
