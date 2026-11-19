import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// More of the Raddle Barrens (owner 2026-11-13, content order: fill the Counties first). Redstone\'s other side
// stories are all at the Works (data/content/harrowgateSide.ts); these two are out on the red rock.
//
// rdOchre, THE REDDEST RED (Nan Ruddock, the Ochre Diggings): Raddle brides marry in a shawl dyed with ochre, and
// Nan\'s granddaughter Tamar is to be married at Lammas. The best red is in the old cut on the west side, and the
// redbacks have it. Clear them, and the old cut turns out to be a grave: the first Raddle people buried their dead
// painted red, and the reddest earth is theirs. Dig it, or close it and take the brown from the open cut. Choice
// rdOchre = 'grave' | 'brown'.
//
// rdCisterns, THE KEEPER OF THE THIRSTY MILE (Eli Gaskin, the cisterns): the old man has kept the three cisterns on the
// dry track for forty years, and wants their depth marks read, because, he says, the light\'s poor. It isn\'t. One of
// them has been fouled with a dead dust wolf. His niece Cora did it: she wants the Charter to give the cisterns to
// someone younger, so he\'ll come down and live with her before he walks into one. Choice rdCisterns = 'told' (Eli
// hears it, and hears why) | 'cleaned' (you clean it and say nothing; Cora is let be).

const OCHRE = 'rdOchre', CIST = 'rdCisterns';
const DIG = { x: 1146, z: 896 }, NAN = { x: 1153.5, z: 903.5 };
const OLD_CUT = { x: 1139.5, z: 889.5 }, OPEN_CUT = { x: 1152.5, z: 889.5 };
const REDBACKS: [number, number][] = [[1141, 892], [1145, 888]];
const MILE = { x: 866, z: 1381 }, ELI = { x: 871.5, z: 1386.5 }, CORA = { x: 881.5, z: 1394.5 };
const CISTERNS: { x: number; z: number; foul: boolean }[] = [{ x: 860.5, z: 1376.5, foul: false }, { x: 874.5, z: 1372.5, foul: true }, { x: 866.5, z: 1393.5, foul: false }];

const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);
const read = (g: GameApi) => CISTERNS.filter((_, i) => g.flag('rdCist' + i)).length;

// ================================================================ The Reddest Red

const nan: DialogueTree = {
  start: (g) => {
    const s = at(g, OCHRE);
    if (!s) return 'n1';
    if (s === 'back') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('rdOchre') === 'grave' ? 'Tamar\'s shawl. Red as a cut lip. Every woman at the wedding asked where I got it, and I said the old cut, and they went quiet.' : 'Fox brown. Tamar cried, and then she put it on and stopped crying, and said it was better. It is better. Don\'t tell her I said so.') },
    wait: { text: (g) => (at(g, OCHRE) === 'redbacks' ? `The old cut, on the west side. ${Math.min(REDBACKS.length, kills(g, 'rdRed'))} of ${REDBACKS.length} redbacks down.` : 'The old cut, or the open one. Bring me a sack of whichever.') },
    n1: { speaker: 'narrator', text: 'A broad old woman with red hands, red to the wrist, sitting on an upturned basket by a row of dye pots steaming in the sun.', next: 'n2' },
    n2: { text: 'Nan Ruddock. Don\'t shake my hand, it doesn\'t come off. My granddaughter Tamar is to be married at Lammas.', next: 'n3' },
    n3: { text: 'Raddle brides marry in red. Ochre red, from the diggings, the way our grandmothers did. And the best red is in the old cut on the west side, where nobody digs, because the redbacks nest there.', next: 'n4' },
    n4: {
      text: 'I\'m too old to fight a beetle the size of a cart wheel. Are you?',
      options: [
        { text: 'I\'ll clear the old cut.', effect: (g) => g.setStage(OCHRE, 'redbacks'), next: 'n5' },
        { text: 'Not today.' },
      ],
    },
    n5: { text: 'Then dig me a sack of the reddest you can find. A bride only gets one red.' },
    b1: { text: (g) => (g.flag('rdOchre') === 'grave' ? 'Grave earth. Well. My grandmother used to say the old cut was a burying place. I thought she was frightening us off it.' : 'Brown. From the open cut. You didn\'t dig the old cut.'), next: 'b2' },
    b2: { text: (g) => (g.flag('rdOchre') === 'grave' ? 'They painted their dead red so they\'d be married to the earth. Maybe Tamar is marrying more than a smith. I\'ll dye it. Heaven help me, it\'ll be the best red on the Barrens.' : 'I know why. I\'d have done the same. Fox brown, then. It\'ll suit her: she\'s more fox than bride.'), effect: (g) => { g.take('rd_ochre', 1); g.setStage(OCHRE, 'done'); g.addMarks(55); g.give('dye_russet', 1); } },
  },
};

// ================================================================ The Keeper of the Thirsty Mile

const eli: DialogueTree = {
  start: (g) => {
    const s = at(g, CIST);
    if (!s) return 'e1';
    if (s === 'eli') return 'r1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    after: { text: (g) => (g.flag('rdCisterns') === 'told' ? 'Cora\'s coming up Sundays. To learn the marks, she says. To watch me, I say. We\'re both right.' : 'Water\'s sweet in all three. Funny thing, that wolf. Must have been thirsty.') },
    wait: { text: (g) => (at(g, CIST) === 'read' ? `Three cisterns: the one by the cairn, the one up the bank, the one by the bend. ${read(g)} of ${CISTERNS.length} read.` : 'Cora\'s on the track, by the bend. She brings my bread on Thursdays.') },
    e1: { speaker: 'narrator', text: 'A thin old man in a wide hat, sitting on the lip of a stone cistern with a bucket on a rope beside him and his face turned up toward the sun.', next: 'e2' },
    e2: { text: 'Eli Gaskin. I keep the Thirsty Mile. Forty years. Three cisterns, and every carter between the Works and the Kettle drinks from them.', next: 'e3' },
    e3: { text: 'They\'re to be read for depth, every week, and sent to the Toll Office. The light\'s poor today. Would you read the marks for me? They\'re cut on the inside wall.', next: 'e4' },
    e4: {
      text: 'The one by the cairn, the one up the bank, the one by the bend.',
      options: [
        { text: 'I\'ll read them.', effect: (g) => g.setStage(CIST, 'read'), next: 'e5' },
        { text: 'Not today.' },
      ],
    },
    e5: { speaker: 'narrator', text: 'The sun is full on his face. He hasn\'t blinked once.' },
    r1: { text: 'Well? How deep?', next: 'r2' },
    r2: {
      text: 'You\'re quiet. Something wrong?',
      options: [
        { text: 'The bank cistern was fouled with a dead wolf. Cora put it there. She wants the Charter to give the cisterns to someone else, so you\'ll come and live with her. She\'s frightened you\'ll walk into one.', effect: (g) => g.setFlag('rdCisterns', 'told'), next: 'rT' },
        { text: 'Six marks in the cairn, five by the bend, four up the bank. Sweet water in all three.', effect: (g) => g.setFlag('rdCisterns', 'cleaned'), next: 'rC' },
      ],
    },
    rT: { text: 'A wolf. In my cistern. My own niece.', next: 'rT2' },
    rT2: { speaker: 'narrator', text: 'He sits with that a while. Then he takes his hat off, and you see his eyes properly for the first time: milk-white, both of them.', next: 'rT3' },
    rT3: { text: 'I can\'t see the marks. I haven\'t seen them since harvest. I read them by putting my arm in to the elbow. She\'s right, damn her. She could have asked. No, she couldn\'t. I wouldn\'t have heard her.', effect: (g) => { g.setStage(CIST, 'done'); g.addMarks(50); } },
    rC: { text: 'Sweet in all three. Good. Good. That\'s forty years and never a bad week.', next: 'rC2' },
    rC2: { speaker: 'narrator', text: 'He smiles at a point a yard to your left. You took the wolf out of the bank cistern and left it in the gully, and Cora will be up on Thursday with his bread.', effect: (g) => { g.setStage(CIST, 'done'); g.addMarks(50); } },
  },
};

const cora: DialogueTree = {
  start: (g) => (at(g, CIST) === 'cora' ? 'c1' : 'idle'),
  nodes: {
    idle: { text: 'Bread for my uncle. Thursdays. He says he doesn\'t need it.' },
    c1: { speaker: 'narrator', text: 'A young woman with a basket on her arm, waiting at the bend as if she\'d been expecting someone, and isn\'t pleased it\'s you.', next: 'c2' },
    c2: { text: 'You found it. The wolf. Don\'t look at me like that, it was already dead. The dust wolves get it in the gully.', next: 'c3' },
    c3: { text: 'He\'s blind. He\'s been blind since harvest and he won\'t say it. He walks those cistern lips every morning with his arm out. One morning he\'ll walk into one.', next: 'c4' },
    c4: { text: 'If the Toll Office thinks the water\'s bad, they\'ll send a man, and he\'ll have to come down to me. I didn\'t know what else to do. Tell him or don\'t. I can\'t stop you either way.', effect: (g) => g.setStage(CIST, 'eli') },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [OCHRE]: {
    id: OCHRE, name: 'The Reddest Red', region: 'redstone', depth: 'quest',
    notes: (g, s) => (s === 'redbacks' ? 'Nan Ruddock dyes the Raddle brides\' shawls with ochre. Her granddaughter Tamar marries at Lammas, and the best red is in the old cut on the west side of the diggings, where the redbacks nest.' : s === 'dig' ? 'The old cut is clear. It\'s a grave: bones painted red, a long time ago. The reddest earth is theirs. Or there\'s plain brown in the open cut.' : s === 'back' ? 'Back to Nan with a sack of ochre.' : s === 'done' ? (g.flag('rdOchre') === 'grave' ? 'Tamar marries in grave red.' : 'Tamar marries in fox brown.') : ''),
    objectives: (g, s) => (s === 'redbacks' ? [{ text: `Clear the redbacks from the old cut (${Math.min(REDBACKS.length, kills(g, 'rdRed'))}/${REDBACKS.length})`, marker: 'rdDigSpot' }] : s === 'dig' ? [{ text: 'Dig the old cut\'s red', marker: 'rdOldCut' }, { text: 'Or dig brown from the open cut', marker: 'rdOpenCut' }] : s === 'back' ? [{ text: 'Bring the ochre to Nan Ruddock', marker: 'rd_nan' }] : []),
    advance: (g, s) => (s === 'redbacks' && kills(g, 'rdRed') >= REDBACKS.length ? 'dig' : null),
    marks: (g, s): Marks => (!s ? { rd_nan: '!' } : s === 'back' ? { rd_nan: '?' } : {}),
    walk: { cast: ['rd_nan'], auto: { redbacks: 'dig' } },
  },
  [CIST]: {
    id: CIST, name: 'The Keeper of the Thirsty Mile', region: 'redstone', depth: 'quest',
    notes: (g, s) => (s === 'read' ? 'Eli Gaskin has kept the three cisterns on the Thirsty Mile for forty years. He wants their depth marks read, because the light\'s poor, he says. The sun is full on his face.' : s === 'cora' ? 'The bank cistern was fouled: a dead dust wolf, put there. Eli\'s niece Cora brings his bread to the bend.' : s === 'eli' ? 'Cora fouled it so the Toll Office would send someone and Eli would have to come down to her. He\'s blind, and won\'t say so. Back to Eli.' : s === 'done' ? (g.flag('rdCisterns') === 'told' ? 'Eli knows what Cora did, and why. She comes up on Sundays now.' : 'I cleaned the cistern and told Eli the water was sweet.') : ''),
    objectives: (g, s) => (s === 'read' ? CISTERNS.map((c, i) => ({ text: `Read the ${['cairn', 'bank', 'bend'][i]} cistern`, done: !!g.flag('rdCist' + i), marker: 'rdCist' + i })) : s === 'cora' ? [{ text: 'Find Cora Gaskin at the bend', marker: 'rd_cora' }] : s === 'eli' ? [{ text: 'Talk to Eli Gaskin', marker: 'rd_eli' }] : []),
    advance: (g, s) => (s === 'read' && read(g) >= CISTERNS.length ? 'cora' : null),
    marks: (g, s): Marks => (!s ? { rd_eli: '!' } : s === 'cora' ? { rd_cora: '?' } : s === 'eli' ? { rd_eli: '?' } : {}),
    walk: { cast: ['rd_eli', 'rd_cora'] },
  },
};

const spawns: QuestSpawn[] = [{ tag: 'rdRed', type: 'redback', at: REDBACKS, when: (g) => at(g, OCHRE) === 'redbacks' }];

const things: WorldThing[] = [
  { id: 'rdDigSpot', x: DIG.x, z: DIG.z, label: 'The Ochre Diggings', radius: 0, look: 'none', when: () => false },
  {
    id: 'rdOldCut', x: OLD_CUT.x, z: OLD_CUT.z, label: 'Dig the old cut', radius: 2.4, look: 'bones',
    when: (g) => at(g, OCHRE) === 'dig',
    use: (g) => { g.give('rd_ochre', 1); g.setFlag('rdOchre', 'grave'); g.setStage(OCHRE, 'back'); g.toast('Under a hand\'s depth of grit the earth goes red, red as fresh meat, and in it, laid on their sides with their knees drawn up, three people, their bones painted the same red. You fill the sack from beside them, not from them, and put the grit back.'); },
  },
  {
    id: 'rdOpenCut', x: OPEN_CUT.x, z: OPEN_CUT.z, label: 'Dig the open cut', radius: 2.4, look: 'none',
    when: (g) => at(g, OCHRE) === 'dig',
    use: (g) => { g.give('rd_ochre', 1); g.setFlag('rdOchre', 'brown'); g.setStage(OCHRE, 'back'); g.toast('The open cut gives a deep fox brown, red in the sun and brown in the shade. Honest earth. Nobody under it.'); },
  },
  ...CISTERNS.map((c, i): WorldThing => ({
    id: 'rdCist' + i, x: c.x, z: c.z, label: 'Read the depth marks', radius: 2.4, look: c.foul ? 'bones' : 'none',
    when: (g) => at(g, CIST) === 'read' && !g.flag('rdCist' + i),
    use: (g) => { g.setFlag('rdCist' + i, 1); g.toast(c.foul ? 'Four marks, and a smell. Down in the water, wedged against the side: a dust wolf, a week dead, with a cord round its neck. Somebody lowered it in. You haul it out.' : ['Six marks. Clear, cold, sweet.', 'Five marks. A frog, and nothing worse.'][i === 0 ? 0 : 1]); },
  })),
];

const NPCS_R: NpcDef[] = [
  { id: 'rd_nan', name: 'Nan Ruddock', title: 'Dyer, the Ochre Diggings', look: { frame: 'f', skin: '#c89070', hair: '#c8c4bc', hairStyle: 2, eyes: '#4a3a2a', tunic: '#8a3a24', trim: '#c8a060', trousers: '#4a3028', boots: '#2a1e14', apron: true, gloves: '#a83a24', lashes: true, build: 1.15, age: 0.8 },
    schedule: [{ from: 0, to: 24, at: [NAN.x, NAN.z], face: [DIG.x, DIG.z], anim: 'idle' }], barks: ['Red to the wrist.'] },
  { id: 'rd_eli', name: 'Eli Gaskin', title: 'Keeper of the Thirsty Mile', look: { skin: '#b07a52', hair: '#d8d4cc', hairStyle: 0, beard: true, eyes: '#d8d4cc', tunic: '#8a6a4a', trim: '#5a4030', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'wide', hatColor: '#8a7a5a', build: 0.84, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [ELI.x, ELI.z], face: [MILE.x, MILE.z], anim: 'idle' }], barks: ['Forty years.'] },
  { id: 'rd_cora', name: 'Cora Gaskin', title: 'The Works', look: { frame: 'f', skin: '#c89070', hair: '#3a2418', hairStyle: 1, eyes: '#4a5a3a', tunic: '#5a4a6a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', lashes: true, build: 0.95, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [CORA.x, CORA.z], face: [ELI.x, ELI.z], anim: 'idle' }], barks: ['Bread on Thursdays.'] },
];

const ITEMS_R: ItemDef[] = [
  { id: 'rd_ochre', name: 'A sack of ochre', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#a83a24', b: '#6a4a2a' }, desc: 'Raddle earth, dug for a bride\'s shawl. It comes off on everything.' },
];

export const REDSTONE_MORE: RegionContent = {
  id: 'redstoneMore',
  items: ITEMS_R,
  npcs: NPCS_R,
  dialogue: { rd_nan: nan, rd_eli: eli, rd_cora: cora },
  quests,
  spawns,
  things,
};
