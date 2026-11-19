import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories in the Scarth Highlands (levels 25 to 35; owner 2026-11-13, content order: fill the Counties
// first), written with the morality system's choices (docs/MORALITY.md).
//
// scClaim, ELLIS'S STONES (Morfudd Ellis, the old shard-hunter, in a hollow east of Scarth Watch): last winter's star came
// down in the hollow, and by the highland custom three stones on a shard make it the finder's. Old Ellis set hers. Then
// Walter Pugh came up with a Charter licence for Harrowgate & Daughters, which says a shard is the licence-holder's.
// White bears have come for the cold off it. Clear them, then settle it: custom (Ellis keeps it), the licence (the
// company takes it and pays her a finder's tenth), a fair split ([Straight] only: an honest name brokers it), or take it
// yourself ([Bad or Evil]). scClaim = 'custom' | 'licence' | 'split' | 'taken'.
//
// scRobin, THE OTHER SKATE (Robin Pask, Kelderby; only if you told Edwin Marner the letters on Cass's skate were worn):
// Robin made Cass a pair for Christmas, and she went out on the ice to meet him; he was late. He wants to set the other
// skate on the ice where she went through, before the thaw, and Edwin is always on the bank. Meet him at the tarn, see
// off the wolves on the shore, and then: tell Edwin the truth, let Robin leave it quietly, or ([Kind] only) bring the
// two of them to stand on the bank together. scRobin = 'told' | 'quiet' | 'together'.

const CLAIM = 'scClaim', ROBIN = 'scRobin';
const HOLLOW = { x: 650.5, z: 1690.5 }, ELLIS = { x: 647.5, z: 1689.5 }, PUGH = { x: 656.5, z: 1694.5 };
const BEARS: [number, number][] = [[661, 1681], [640, 1697]];
const SHORE = { x: 568.5, z: 1521.5 };
const WOLVES: [number, number][] = [[560, 1528], [578, 1530]];

// ================================================================ Ellis's Stones

const ellis: DialogueTree = {
  start: (g) => {
    const s = at(g, CLAIM);
    if (!s) return 'e1';
    if (s === 'bears') return 'eWait';
    if (s === 'settle') return 'e9';
    return 'after';
  },
  nodes: {
    e1: { speaker: 'narrator', text: 'A small old woman in three shawls, sitting on a cairn of three stones in a hollow of blue frost. In the middle of the hollow, half sunk in the turf, something gives back the light.', next: 'e2' },
    e2: { text: 'Morfudd Ellis. I\'ve hunted stars on Scarth for forty years. That one came down on St Lucy\'s night and I was here by morning. Three stones on it. That makes it mine. That\'s always made it mine.', next: 'e3' },
    e3: { text: 'Then a young man came up from Kelderby with a paper. Walter Pugh, for Harrowgate. The paper says a shard belongs to whoever holds a Charter licence. I don\'t hold a licence. I hold forty years.', next: 'e4' },
    e4: {
      text: 'And now the bears have come for the cold off it, and neither of us can get near. Shift them, and we\'ll see who\'s right.',
      options: [{ text: 'I\'ll see to the bears.', effect: (g) => g.setStage(CLAIM, 'bears') }, { text: 'Not my quarrel.' }],
    },
    eWait: { text: (g) => (killed(g, 'scBears') >= BEARS.length ? 'They\'re gone. Now go and tell that boy what the custom is. He won\'t listen to me.' : 'Two of them, the big devils. One by the rocks, one by the old wall. Mind the cold.') },
    e9: { text: 'Go on, then. Talk to him. I\'ll sit on my stones.' },
    after: {
      text: (g) => {
        const f = g.flag(CLAIM);
        if (f === 'custom') return 'Forty years, and the first time anybody stood up for the stones. I\'ve sent the shard to the Watch for Ilse to look at before I sell it. She cried. Don\'t tell her I told you.';
        if (f === 'licence') return 'A tenth. A tenth of a thing I found. I suppose the paper\'s the paper. My mother would have spat.';
        if (f === 'split') return 'Half and half, and the boy carried my half down the hill for me. He\'s not bad. He\'s just got a paper.';
        return 'You. Don\'t come into my hollow again.';
      },
    },
  },
};

const pugh: DialogueTree = {
  start: (g) => (at(g, CLAIM) === 'settle' ? 'p1' : at(g, CLAIM) === 'done' ? 'pAfter' : 'p0'),
  nodes: {
    p0: { text: 'Walter Pugh, prospector, licensed by the Charter for Harrowgate and Daughters. I\'d shake your hand but I\'d have to take my glove off, and I\'m not doing that up here.' },
    p1: { text: 'You moved the bears. Thank you. Now perhaps she\'ll see sense. I\'ve a licence, signed and sealed. A cairn of three stones isn\'t a document.', next: 'p2' },
    p2: { text: 'I\'m not a monster. I\'ve offered her a tenth for the finding. That\'s more than the licence says I have to. Will you tell her?', next: 'p3' },
    p3: {
      text: 'Well?',
      options: [
        { text: 'Her stones were on it before your paper was written. The custom stands.', moral: { id: 'scClaim:custom', a: 5, tr: { courage: 3, loyalty: 2 }, rep: { company: -6, charter: -3 }, npc: { sc_ellis: 25, sc_pugh: -15 }, note: 'Stood up for Morfudd Ellis\'s three stones against a Charter licence, and the shard stayed hers.', fame: 'stood up for old Ellis\'s stones on Scarth', spread: 'local' }, effect: (g) => { g.setFlag(CLAIM, 'custom'); g.addMarks(70); g.setStage(CLAIM, 'done'); }, next: 'pCustom' },
        { text: 'The licence is the law, and you\'ve offered her more than it asks.', moral: { id: 'scClaim:licence', tr: { honesty: 2 }, rep: { charter: 4, company: 6 }, npc: { sc_ellis: -20, sc_pugh: 15 } }, effect: (g) => { g.setFlag(CLAIM, 'licence'); g.addMarks(90); g.setStage(CLAIM, 'done'); }, next: 'pLicence' },
        { text: 'Half each. She found it; you can carry it, and sell it where she can\'t.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'scClaim:split', a: 4, tr: { honesty: 2, generosity: 2 }, rep: { company: 2 }, npc: { sc_ellis: 12, sc_pugh: 10 }, note: 'Brokered a fair split of a fallen star between Morfudd Ellis and Harrowgate\'s prospector, on your word.' }, effect: (g) => { g.setFlag(CLAIM, 'split'); g.addMarks(80); g.setStage(CLAIM, 'done'); }, next: 'pSplit' },
        { text: 'Neither of you is taking it. Step back.', need: { band: ['bad', 'evil'] }, moral: { id: 'scClaim:taken', a: -12, tr: { greed: 5, cruelty: 2 }, rep: { company: -8, charter: -4 }, npc: { sc_ellis: -40, sc_pugh: -25 }, note: 'Took a fallen star off an old shard-hunter and a company prospector both, on Scarth.', major: true, fame: 'robbed old Ellis of her star on Scarth', spread: 'local' }, effect: (g) => { g.give('star_crystal', 4); g.setFlag(CLAIM, 'taken'); g.setStage(CLAIM, 'done'); }, next: 'pTaken' },
      ],
    },
    pCustom: { text: 'Then I\'ll write to Harrowgate that the custom of the country was against me, and see what they say. Nothing good. You\'re very sure of yourself. I hope she\'s grateful.' },
    pLicence: { text: 'Thank you. I\'ll pay her the tenth myself, today, in coin, so she can\'t say I didn\'t. I don\'t enjoy this, you know. I just believe in paper.' },
    pSplit: { text: 'Half. Harrowgate won\'t like it. But I\'ll take half of a star with her blessing over all of it with her curse; she looks like she means her curses. I\'ll carry her half down.' },
    pTaken: { speaker: 'narrator', text: 'Pugh opens his mouth, looks at you, and shuts it again. Old Ellis doesn\'t get off her stones. She watches you prise the star out of the turf, and she says nothing at all, which is worse.' },
    pAfter: { text: (g) => (g.flag(CLAIM) === 'taken' ? 'I wrote it all down for the Charter. Every word. You should know that.' : 'Cold up here. Colder down at Harrowgate, when they read my letter.') },
  },
};

// ================================================================ The Other Skate

const robinNodes: Record<string, DNode> = {
  ro1: { text: 'You told Mr Marner the letters were too worn to read. Thank you. I think. I haven\'t slept right since.', next: 'ro2' },
  ro2: { text: 'She went out on the ice to meet me. We used to meet on the far side, where the reeds come down. I was late. I\'m always late. When I got there, there was just the hole.', next: 'ro3' },
  ro3: { text: 'I made her a pair for Christmas. I\'ve still got the other one. I want to set it on the ice where she went through, before the thaw takes the ice. Only Mr Marner\'s always on the bank, and I can\'t walk past him with it.', next: 'ro4' },
  ro4: {
    text: 'Will you come up to the tarn with me? Tomorrow at dusk. There are wolves on the shore since the snow.',
    options: [{ text: 'I\'ll meet you at the tarn.', effect: (g) => { g.give('sc_skate2', 1); g.setStage(ROBIN, 'tarn'); }, next: 'ro5' }, { text: 'Not yet, Robin.' }],
  },
  ro5: { text: 'You carry it. My hands won\'t hold still. I\'ll see you on the shore.' },
};

const robinTarn: DialogueTree = {
  start: (g) => (killed(g, 'scWolves') >= WOLVES.length ? 't1' : 't0'),
  nodes: {
    t0: { text: 'They\'re still on the shore. Please.' },
    t1: { speaker: 'narrator', text: 'Robin stands at the edge of the ice with his hands in his armpits. Along the bank, Edwin Marner has seen you both, and has got up, and is waiting.', next: 't2' },
    t2: {
      text: 'He\'s looking at us. What do I do?',
      options: [
        { text: 'Tell him, Robin. All of it. He deserves it, and so do you.', moral: { id: 'scRobin:told', a: 5, tr: { honesty: 4, courage: 2 }, npc: { sf_robin: 12, sf_edwin: 6 }, note: 'Stood by Robin Pask on the bank of Coldwater Tarn while he told Edwin Marner that Cass went out on the ice to meet him.', major: true }, effect: (g) => { g.take('sc_skate2', 1); g.setFlag(ROBIN, 'told'); g.addMarks(80); g.setStage(ROBIN, 'done'); }, next: 'tTold' },
        { text: 'Set it down on the ice and come away. He doesn\'t need to know today.', moral: { id: 'scRobin:quiet', tr: { compassion: 2, deception: 2 }, npc: { sf_robin: 8 } }, effect: (g) => { g.take('sc_skate2', 1); g.setFlag(ROBIN, 'quiet'); g.addMarks(60); g.setStage(ROBIN, 'done'); }, next: 'tQuiet' },
        { text: '(Walk Robin along the bank to Edwin, and stand between them until one of them speaks.)', need: { trait: { compassion: [57, 100] } }, moral: { id: 'scRobin:together', a: 8, tr: { compassion: 4, courage: 2 }, npc: { sf_robin: 15, sf_edwin: 15 }, note: 'Brought Robin Pask and Edwin Marner to stand together on the bank where Cass went through the ice.', major: true, fame: 'brought the miller\'s boy and Edwin Marner together at the tarn', spread: 'local' }, effect: (g) => { g.take('sc_skate2', 1); g.setFlag(ROBIN, 'together'); g.addMarks(90); g.setStage(ROBIN, 'done'); }, next: 'tTogether' },
      ],
    },
    tTold: { speaker: 'narrator', text: 'Robin tells it badly, which is the only way to tell it. Edwin listens without moving. When it\'s done he takes the skate out of your hands and turns it over, and says, "She was always early. Her mother was the same." Then he puts his hand on the boy\'s head, like a man testing whether ice will hold.' },
    tQuiet: { speaker: 'narrator', text: 'Robin walks out a little way and sets the skate on the ice, and comes back without looking at the bank. Edwin watches it all. He doesn\'t come over. In the morning, the skate is gone, and nobody in Kelderby says where.' },
    tTogether: { speaker: 'narrator', text: 'Nobody speaks for a long time. Then Edwin says, "You were late," and Robin says, "Yes," and Edwin says, "So was I, once, to her mother. She waited." The three of you stand on the bank until it\'s too dark to see the ice, and then the two of them walk down to Kelderby together.' },
  },
};

const quests: Record<string, QuestDef> = {
  [CLAIM]: {
    id: CLAIM, name: 'Ellis\'s Stones', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'bears') return 'Last winter\'s star came down in a hollow east of Scarth Watch. Morfudd Ellis put her three stones on it, by the custom; Walter Pugh came up with a Charter licence for Harrowgate. White bears have come for the cold off it.';
      if (s === 'settle') return 'The bears are gone. Walter Pugh, Harrowgate\'s prospector, wants the shard settled.';
      const f = g.flag(CLAIM);
      return f === 'custom' ? 'The custom stood, and old Ellis kept her star.' : f === 'licence' ? 'The licence stood. Harrowgate has the star, and Ellis her tenth.' : f === 'split' ? 'Ellis and Pugh split the star, on my word.' : 'I took the star myself.';
    },
    objectives: (g, s) => (s === 'bears' ? [{ text: `Drive the white bears out of the hollow (${Math.min(BEARS.length, killed(g, 'scBears'))}/${BEARS.length})`, done: killed(g, 'scBears') >= BEARS.length }] : s === 'settle' ? [{ text: 'Talk to Walter Pugh', marker: 'sc_pugh' }] : []),
    advance: (g, s) => (s === 'bears' && killed(g, 'scBears') >= BEARS.length ? 'settle' : null),
    marks: (_g, s): Marks => (!s ? { sc_ellis: '!' } : s === 'settle' ? { sc_pugh: '?' } : {}),
    walk: { cast: ['sc_ellis', 'sc_pugh'], kill: { bears: [['whitebear', 2]] } },
  },
  [ROBIN]: {
    id: ROBIN, name: 'The Other Skate', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'tarn') return 'Cass Marner went out on the ice to meet Robin Pask, and he was late. He made her a pair of skates for Christmas, and wants to set the other one on the ice where she went through. I\'m to meet him on the shore of Coldwater Tarn, and there are wolves.';
      const f = g.flag(ROBIN);
      return f === 'told' ? 'Robin told Edwin everything, on the bank.' : f === 'quiet' ? 'Robin set the skate on the ice, and Edwin never came over.' : 'Robin and Edwin walked down to Kelderby together.';
    },
    objectives: (g, s) => (s === 'tarn' ? [
      { text: `Clear the wolves from the tarn shore (${Math.min(WOLVES.length, killed(g, 'scWolves'))}/${WOLVES.length})`, done: killed(g, 'scWolves') >= WOLVES.length },
      { text: 'Talk to Robin on the shore', marker: 'sc_robin_tarn' },
    ] : []),
    marks: (g, s): Marks => (!s && g.flag('sfSkate') === 'worn' && at(g, 'sfSkate') === 'done' ? { sf_robin: '!' } : s === 'tarn' ? { sc_robin_tarn: '?' } : {}),
    walk: { cast: ['sf_robin', 'sc_robin_tarn'], kill: { tarn: [['frostwolf', 2]] }, from: { quests: { sfSkate: 'done' }, flags: { sfSkate: 'worn' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'scBears', type: 'whitebear', at: BEARS, when: (g) => at(g, CLAIM) === 'bears' },
  { tag: 'scWolves', type: 'frostwolf', at: WOLVES, when: (g) => at(g, ROBIN) === 'tarn' },
];

const things: WorldThing[] = [
  {
    id: 'scShard', x: HOLLOW.x, z: HOLLOW.z, label: 'Look at the fallen star', radius: 2.8, look: 'glint',
    when: (g) => at(g, CLAIM) !== 'done',
    use: (g) => g.toast('A shard of star the size of a cartwheel, sunk in the turf, blue-white and cold enough to hurt from a yard off. Three grey stones sit on its edge, set there by somebody who meant it.'),
  },
];

const NPCS: NpcDef[] = [
  { id: 'sc_ellis', name: 'Morfudd Ellis', title: 'Shard-hunter, Scarth', look: { frame: 'f', skin: '#d8a882', hair: '#e0dcd4', hairStyle: 2, eyes: '#4a5a6a', tunic: '#5a3a3a', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a1e14', cape: '#4a4a52', hat: 'kerchief', hatColor: '#3a3a42', lashes: true, build: 0.86, age: 0.82 },
    schedule: [{ from: 0, to: 24, at: [ELLIS.x, ELLIS.z], face: [HOLLOW.x, HOLLOW.z], anim: 'seated' }],
    barks: ['Three stones. Always three.'] },
  { id: 'sc_pugh', name: 'Walter Pugh', title: 'Prospector, Harrowgate & Daughters', look: { skin: '#e8c4a0', hair: '#5a4a3a', hairStyle: 1, eyes: '#4a4a3a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', cape: '#3a3a42', hat: 'wide', hatColor: '#3a2a1e', build: 0.95, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [PUGH.x, PUGH.z], face: [HOLLOW.x, HOLLOW.z], anim: 'idle' }], when: (g) => at(g, CLAIM) !== 'done',
    barks: ['Signed and sealed.'] },
  { id: 'sc_robin_tarn', name: 'Robin Pask', title: 'The miller\'s boy, Kelderby', look: { skin: '#e8c4a0', hair: '#c8a060', hairStyle: 3, eyes: '#4a6a4a', tunic: '#d8d0b8', trim: '#8a7a5a', trousers: '#4a4a3a', boots: '#2a1e14', freckles: true, build: 0.82, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: [SHORE.x, SHORE.z], face: [566, 1506], anim: 'idle' }], when: (g) => at(g, ROBIN) === 'tarn',
    barks: ['Please.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'sc_skate2', name: 'The other skate', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'shoe', a: '#6a4a2a', b: '#c8ccd2' }, desc: 'A girl\'s skate, never worn, the twin of Cass Marner\'s. Scratched in the blade, very small: "C. M. & R. P."' },
];

export const SCARTH_MORE: RegionContent = {
  id: 'scarthMore',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { sc_ellis: ellis, sc_pugh: pugh, sc_robin_tarn: robinTarn },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'sf_edwin', (g) => (at(g, ROBIN) === 'done' ? 'eRobin' : undefined), { eRobin: { text: (g) => (g.flag(ROBIN) === 'quiet' ? 'Somebody set a skate on the ice where she went through. The twin of hers. I took it home; it hangs on the door beside hers. I know whose it was. I\'m waiting for him to say.' : 'Robin comes up of a Sunday. We sit on the bank. Some Sundays we talk. He\'s a good lad. He\'s always late.') } });
    hook(D, 'sf_robin', (g) => (!at(g, ROBIN) && g.flag('sfSkate') === 'worn' && at(g, 'sfSkate') === 'done' ? 'ro1' : at(g, ROBIN) === 'tarn' ? 'ro5' : undefined), robinNodes);
  },
};
