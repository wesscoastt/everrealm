import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two side stories from Company Row, outside Harrowgate Works' west gate, out onto the red rock (owner 2026-11-13,
// content order: fill the Counties first), with the morality system's choices (docs/MORALITY.md).
//
// rdRain, RAIN FOR SALE (Lizzie Dunn, Company Row): in the drought, Hosea Pike came up the dry track with a cart and a
// drum, and half the Row has paid him two marks a house for rain by Sunday. He goes out on the rock every night to call
// it. Follow him: at his camp, not rain but a dowser's hazel rod and a map of the hills marked water, water, dry. At the
// marked gully, past the adders, a spring choked with rubble. Clear it. Then Pike: tell the Row the truth and give the
// money back, let him keep his trick (they'll have water either way), ([Straight]) have him sell it honestly as a
// dowser's find at a fair fee, or ([Bad or Evil]) take half to keep quiet. rdRain = 'truth' | 'trick' | 'dowser' | 'half'.
//
// rdPost, THE SCATTERED POST (Dinah Sell, a Charter Post rider, on the road north of the Row; after Rain for Sale): a dust
// wolf lamed her horse and tore her bag, and the letters are all over the rock. Gather them past the wolves. One came
// open in the wind, and you see whose hand it is: Tom Dunn, Lizzie's husband, to a Mrs Brough in Ansbury, about
// Michaelmas, and "L. needn't know till I've gone". Then: give it back and say you didn't read it, give it back and say
// you did, keep it back for Lizzie (and break the Post's seal to do it), or ([Bad or Evil]) burn it.
// rdPost = 'unread' | 'read' | 'lizzie' | 'burned'.

const RAIN = 'rdRain', POST = 'rdPost';
const LIZZIE = { x: 950.5, z: 1000.5 }, PIKE = { x: 936.5, z: 1000.5 };
const CAMP = { x: 858.5, z: 1030.5 }, SPRING = { x: 873.5, z: 1040.5 };
const ADDERS: [number, number][] = [[869, 1046], [876, 1035], [866, 1039]];
const DINAH = { x: 908.5, z: 945.5 };
const LETTERS: [number, number][] = [[915.5, 962.5], [898.5, 968.5], [921.5, 975.5], [905.5, 980.5]];
const WOLVES: [number, number][] = [[912, 970], [899, 976]];

const gathered = (g: GameApi) => LETTERS.filter((_, i) => g.flag('rdLetter' + i)).length;

// ================================================================ Rain for Sale

const lizzie: DialogueTree = {
  start: (g) => {
    const s = at(g, RAIN);
    if (!s) return 'l1';
    if (s !== 'done') return 'lWait';
    if (at(g, POST) === 'lizzie') return 'lL1';
    return 'after';
  },
  nodes: {
    l1: { speaker: 'narrator', text: 'A woman in a company apron at a cottage door, with a bucket of grey washing water she is saving for the beans, and a face that has paid two marks for something and regrets it.', next: 'l2' },
    l2: { text: 'Lizzie Dunn. That\'s my Tom\'s name on the rent book. You\'ll have seen the man with the drum.', next: 'l3' },
    l3: { text: 'Hosea Pike. Came up the dry track Tuesday. Two marks a house, and it\'ll rain by Sunday, or your money back. Half the Row\'s paid. I paid. The beans are dying.', next: 'l4' },
    l4: {
      text: 'Every night he goes out on the rock, west, to call the rain. Nobody\'s followed him. Will you?',
      options: [{ text: 'I\'ll see what he does out there.', effect: (g) => g.setStage(RAIN, 'camp') }, { text: 'Not now, Lizzie.' }],
    },
    lWait: { text: (g) => (at(g, RAIN) === 'camp' ? 'West, out on the rock, past the last of the Row. Look for his fire.' : at(g, RAIN) === 'spring' ? 'A map? Of water? Then go where it says.' : 'Talk to Pike. He\'s by the hall with his drum.') },
    after: {
      text: (g) => {
        const f = g.flag(RAIN);
        if (f === 'truth') return 'Two marks back in every hand, and a spring in the gully. Pike stood on a barrel and said it to the whole Row. I almost liked him.';
        if (f === 'trick') return 'It "rained" on Sunday: a spring came up in the gully, Pike said he called it. Half the Row thinks he\'s a wonder. I know better. The beans don\'t care.';
        if (f === 'dowser') return 'He told us he\'s a dowser. Charged a mark a house for the finding, and nobody minded. There\'s something about being told the truth that makes you want to pay for it.';
        return 'Pike left in the night with his drum. There\'s a spring in the gully. Nobody knows who to thank. I\'ve a fair idea who not to.';
      },
    },
    lL1: { speaker: 'narrator', text: 'Lizzie reads the letter at her door, twice, with her lips moving. Then she folds it very small.', next: 'lL2' },
    lL2: { text: 'Michaelmas. Annie Brough. She came to the Row last summer selling ribbons. I bought one.', next: 'lL3' },
    lL3: { text: 'You broke the Post\'s seal to bring me this. I know what that costs. Thank you. Now go away, please, because I\'m going to be very calm, and I don\'t want anybody to see it.', options: [{ text: 'I\'m sorry, Lizzie.', effect: (g) => g.setStage(POST, 'done') }] },
  },
};

const pike: DialogueTree = {
  start: (g) => (at(g, RAIN) === 'pike' ? 'p1' : at(g, RAIN) === 'done' ? 'pAfter' : 'p0'),
  nodes: {
    p0: { text: 'Hosea Pike! Rain by Sunday, or your money back. Two marks a house, and worth every penny. Feel that? That\'s the air thinking about it.' },
    p1: { text: 'You\'ve been to my fire. I can see it on you. Rod and map, eh. Sit down before you say anything loud.', next: 'p2' },
    p2: { text: 'I\'ve never made it rain in my life. Nobody can. I find water. My father found water, and his. Nobody pays a dowser two marks a house. They pay a rainmaker. So I\'m a rainmaker.', next: 'p3' },
    p3: { text: 'On Sunday I\'d have "called" that spring up out of the gully, and they\'d have had their water, and I\'d have had their marks. Everybody wins. You cleared it early, and spoiled the show. What now?', next: 'p4' },
    p4: {
      text: 'Well?',
      options: [
        { text: 'Tell them the truth, and give their money back.', moral: { id: 'rdRain:truth', a: 5, tr: { honesty: 4 }, rep: { harrowgate: 6 }, npc: { rd_pike: -10, rd_lizzie: 15 }, note: 'Made Hosea Pike tell Company Row he couldn\'t make rain, and give back their marks, and showed them the spring.', fame: 'showed up the rainmaker at Company Row', spread: 'local' }, effect: (g) => { g.setFlag(RAIN, 'truth'); g.addMarks(60); g.setStage(RAIN, 'done'); }, next: 'pT' },
        { text: 'Keep your trick. They get water either way.', moral: { id: 'rdRain:trick', tr: { deception: 2, compassion: 1 }, rep: { harrowgate: 2 }, npc: { rd_pike: 15, rd_lizzie: -5 } }, effect: (g) => { g.setFlag(RAIN, 'trick'); g.addMarks(50); g.setStage(RAIN, 'done'); }, next: 'pK' },
        { text: 'Tell them you\'re a dowser, and charge them a fair fee for the finding.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'rdRain:dowser', a: 4, tr: { honesty: 2, generosity: 1 }, rep: { harrowgate: 6 }, npc: { rd_pike: 20, rd_lizzie: 10 }, note: 'Talked Hosea Pike into telling Company Row he was a dowser, not a rainmaker, and charging fairly for it.' }, effect: (g) => { g.setFlag(RAIN, 'dowser'); g.addMarks(70); g.setStage(RAIN, 'done'); }, next: 'pD' },
        { text: 'Half of the take, or I tell them everything.', need: { band: ['bad', 'evil'] }, moral: { id: 'rdRain:half', a: -8, tr: { greed: 4, deception: 2 }, npc: { rd_pike: -25 }, note: 'Took half of a fraud\'s takings at Company Row to keep quiet.' }, effect: (g) => { g.setFlag(RAIN, 'half'); g.addMarks(110); g.setStage(RAIN, 'done'); }, next: 'pH' },
      ],
    },
    pT: { text: 'The truth. To all of them. On a barrel, I suppose. Well. My father always said the truth was the worst-paid trade on the road. Help me up.' },
    pK: { text: 'A sensible person. On Sunday you\'ll see something beautiful. Bring a bucket.' },
    pD: { text: 'A dowser. Honest. At a fair fee. I\'ll try it. It\'ll feel like going out without my trousers. A mark a house, then, for the finding. Do you think they\'ll pay it?' },
    pH: { text: 'Half. You\'re a worse thief than I am, and I\'m very good. Take it. I\'m leaving tonight.' },
    pAfter: { text: (g) => (g.flag(RAIN) === 'dowser' ? 'A mark a house, and they paid it, and they shook my hand after. Nobody\'s ever shaken my hand after.' : g.flag(RAIN) === 'trick' ? 'Sunday was beautiful. Did you bring a bucket?' : 'Ah. You.') },
  },
};

// ================================================================ The Scattered Post

const dinah: DialogueTree = {
  start: (g) => {
    const s = at(g, POST);
    if (!s) return 'd1';
    if (s === 'back') return 'b1';
    if (s === 'done' || s === 'lizzie') return 'after';
    return 'wait';
  },
  nodes: {
    d1: { speaker: 'narrator', text: 'A Charter Post rider in a torn blue coat, kneeling by a horse that stands on three legs, with an empty mailbag hanging off the saddle like a burst sack.', next: 'd2' },
    d2: { text: 'Dinah Sell, Charter Post. A dust wolf came at Bramble from under the rock, and she shied, and the bag went, and the wind did the rest. Every letter for the Row and the Works is out on the rock somewhere.', next: 'd3' },
    d3: {
      text: 'I can\'t leave her. Will you gather them? The wolf\'s still out there, and its friend.',
      options: [{ text: 'I\'ll bring the letters in.', effect: (g) => g.setStage(POST, 'letters') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => `${gathered(g)} of ${LETTERS.length} so far. The wind took them east, toward the low ground.` },
    b1: { speaker: 'narrator', text: 'Dinah counts them into the bag, and stops at one: its seal cracked, the fold open. She looks at you.', next: 'b2' },
    b2: {
      text: 'This one came open. Did you read it?',
      options: [
        { text: 'No. It was open when I found it.', moral: { id: 'rdPost:unread', tr: { deception: 2 }, npc: { rd_dinah: 5 } }, effect: (g) => { g.take('rd_letters', 1); g.setFlag(POST, 'unread'); g.addMarks(50); g.setStage(POST, 'done'); }, next: 'bU' },
        { text: 'I saw it. It\'s not mine to do anything about.', moral: { id: 'rdPost:read', tr: { honesty: 3 }, npc: { rd_dinah: 10 } }, effect: (g) => { g.take('rd_letters', 1); g.setFlag(POST, 'read'); g.addMarks(55); g.setStage(POST, 'done'); }, next: 'bR' },
        { text: 'I\'m keeping that one back. Lizzie Dunn should see it.', cond: (g) => at(g, RAIN) === 'done', moral: { id: 'rdPost:lizzie', tr: { loyalty: 2, compassion: 2 }, rep: { charter: -4 }, npc: { rd_dinah: -15, rd_lizzie: 20 }, note: 'Kept back a letter from the Charter Post so Lizzie Dunn could read what her husband wrote to another woman.', major: true }, effect: (g) => { g.take('rd_letters', 1); g.setFlag(POST, 'lizzie'); g.addMarks(40); g.setStage(POST, 'lizzie'); }, next: 'bL' },
        { text: '(Hold it to her lantern.)', need: { band: ['bad', 'evil'] }, moral: { id: 'rdPost:burned', a: -6, tr: { cruelty: 3, deception: 2 }, rep: { charter: -6 }, npc: { rd_dinah: -30 }, note: 'Burned a man\'s letter to his lover off the Charter Post, so it never came.' }, effect: (g) => { g.take('rd_letters', 1); g.setFlag(POST, 'burned'); g.addMarks(40); g.setStage(POST, 'done'); }, next: 'bB' },
      ],
    },
    bU: { text: 'Then I\'ll seal it again and say the wind did it. Thank you. Bramble thanks you too, in her way.' },
    bR: { text: 'Neither is it mine. I carry them; I don\'t read them. We\'ll both carry this one, I suppose. Thank you.' },
    bL: { text: 'That\'s the Charter\'s seal you\'re breaking, not mine. I didn\'t see you do it. I\'ll swear I didn\'t. Go on, then, before I change my mind.' },
    bB: { speaker: 'narrator', text: 'The letter goes up in a little bright flame and is gone before Dinah can get to her feet. She looks at the ash, and at you, and doesn\'t say anything, and writes something in the margin of her waybill.' },
    after: { text: 'Bramble\'s sound again. She shies at shadows now. So do I.' },
  },
};

const quests: Record<string, QuestDef> = {
  [RAIN]: {
    id: RAIN, name: 'Rain for Sale', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'camp') return 'In the drought, Hosea Pike has sold half of Company Row rain by Sunday at two marks a house. Lizzie Dunn wants to know what he does out on the rock every night. His fire is out on the rock, west of the Row and past the mesa.';
      if (s === 'spring') return 'Not rain: a dowser\'s hazel rod, and a map of the hills marked water, water, dry. The nearest mark is a gully at the foot of the mesa, east of his camp.';
      if (s === 'pike') return 'A spring, choked with rubble, and I\'ve cleared it. Pike meant to "call it up" on Sunday. Time to talk to him.';
      const f = g.flag(RAIN);
      return f === 'truth' ? 'Pike told the Row the truth and gave their money back.' : f === 'trick' ? 'Pike kept his trick, and the Row has its water.' : f === 'dowser' ? 'Pike told the Row he\'s a dowser, and charged a fair fee.' : 'I took half of Pike\'s takings to keep quiet.';
    },
    objectives: (g, s) => (s === 'camp' ? [{ text: 'Find Pike\'s fire on the rock west of the Row', marker: 'rdCamp' }]
      : s === 'spring' ? [{ text: `Clear the adders from the gully (${Math.min(ADDERS.length, killed(g, 'rdAdders'))}/${ADDERS.length})`, done: killed(g, 'rdAdders') >= ADDERS.length }, { text: 'Look at the marked place in the gully', marker: 'rdSpring' }]
      : s === 'pike' ? [{ text: 'Talk to Hosea Pike by the meeting hall', marker: 'rd_pike' }] : []),
    marks: (_g, s): Marks => (!s ? { rd_lizzie: '!' } : s === 'pike' ? { rd_pike: '?' } : {}),
    walk: { cast: ['rd_lizzie', 'rd_pike'], kill: { spring: [['redadder', 3]] } },
  },
  [POST]: {
    id: POST, name: 'The Scattered Post', region: 'redstone', depth: 'quest',
    notes: (g, s) => {
      if (s === 'letters') return 'A dust wolf lamed Dinah Sell\'s horse on the road north of Company Row and the wind scattered the Post across the rock, east toward the low ground.';
      if (s === 'back') return 'One letter came open in the wind: Tom Dunn, Lizzie\'s husband, to a Mrs Brough in Ansbury, about Michaelmas. "L. needn\'t know till I\'ve gone."';
      if (s === 'lizzie') return 'I kept Tom Dunn\'s letter back from the Post. Lizzie should have it.';
      const f = g.flag(POST);
      return f === 'burned' ? 'I burned Tom Dunn\'s letter.' : f === 'lizzie' ? 'Lizzie Dunn read Tom\'s letter at her door, twice.' : 'The Post went on to Ansbury, Tom Dunn\'s letter with it.';
    },
    objectives: (g, s) => (s === 'letters' ? [
      ...LETTERS.map((_, i) => ({ text: `Gather a scattered letter (${['first', 'second', 'third', 'fourth'][i]})`, done: !!g.flag('rdLetter' + i), marker: 'rdLetter' + i })),
      { text: `See off the dust wolves (${Math.min(WOLVES.length, killed(g, 'rdWolves'))}/${WOLVES.length})`, done: killed(g, 'rdWolves') >= WOLVES.length },
    ] : s === 'back' ? [{ text: 'Bring the letters to Dinah Sell', marker: 'rd_dinah' }] : s === 'lizzie' ? [{ text: 'Give Tom Dunn\'s letter to Lizzie', marker: 'rd_lizzie' }] : []),
    advance: (g, s) => (s === 'letters' && gathered(g) >= LETTERS.length && killed(g, 'rdWolves') >= WOLVES.length ? 'back' : null),
    marks: (g, s): Marks => (!s && at(g, RAIN) === 'done' ? { rd_dinah: '!' } : s === 'back' ? { rd_dinah: '?' } : s === 'lizzie' ? { rd_lizzie: '?' } : {}),
    walk: { cast: ['rd_dinah', 'rd_lizzie'], kill: { letters: [['dustwolf', 2]] }, from: { quests: { [RAIN]: 'done' }, flags: { [RAIN]: 'truth' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'rdAdders', type: 'redadder', at: ADDERS, when: (g) => at(g, RAIN) === 'spring' },
  { tag: 'rdWolves', type: 'dustwolf', at: WOLVES, when: (g) => at(g, POST) === 'letters' },
];

const things: WorldThing[] = [
  { id: 'rdCamp', x: CAMP.x, z: CAMP.z, label: 'Look at Pike\'s fire', radius: 2.6, look: 'scorch',
    when: (g) => at(g, RAIN) === 'camp',
    use: (g) => { g.setStage(RAIN, 'spring'); g.toast('A fire-ring, a bedroll, and a sack of salt and slag dust labelled CLOUD POWDER. Under the bedroll, a forked hazel rod polished by forty years of hands, and a map of the hills round the Row, marked in ink: water, water, dry, water.'); } },
  { id: 'rdSpring', x: SPRING.x, z: SPRING.z, label: 'Clear the rubble', radius: 2.6, look: 'cairn',
    when: (g) => at(g, RAIN) === 'spring' && killed(g, 'rdAdders') >= ADDERS.length,
    use: (g) => { g.setStage(RAIN, 'pike'); g.toast('Rubble, and under it damp red sand, and under that, when you\'ve shifted enough stone to ache, water: cold, clear, and coming up fast enough to fill your cupped hands twice over.'); } },
  ...LETTERS.map(([x, z], i): WorldThing => ({
    id: 'rdLetter' + i, x, z, label: 'Pick up the letter', radius: 2.4, look: 'letter',
    when: (g) => at(g, POST) === 'letters' && !g.flag('rdLetter' + i),
    use: (g) => {
      g.setFlag('rdLetter' + i, 1);
      if (gathered(g) >= LETTERS.length) g.give('rd_letters', 1);
      g.toast(i === 1 ? 'This one has come open in the wind, its seal cracked. You can\'t help seeing the first lines, in a cramped, careful hand: "Annie. I\'ll come for you at Michaelmas, as we said. L. needn\'t know till I\'ve gone. Tom."' : ['A letter for the Works office, the Charter\'s seal on it.', '', 'A bill for the canteen, by the look of it, which nobody will thank you for.', 'A thick one for Company Row, with a child\'s drawing showing through the paper.'][i]);
    },
  })),
];

const NPCS: NpcDef[] = [
  { id: 'rd_lizzie', name: 'Lizzie Dunn', title: 'Company Row', look: { frame: 'f', skin: '#e0b48e', hair: '#6a4a2a', hairStyle: 2, eyes: '#4a5a4a', tunic: '#6a5a4a', trim: '#4a3a2a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 0.95, age: 0.38 },
    schedule: [{ from: 6, to: 21, at: [LIZZIE.x, LIZZIE.z], face: [LIZZIE.x, LIZZIE.z - 3], anim: 'idle' }], barks: ['The beans are dying.'] },
  { id: 'rd_pike', name: 'Hosea Pike', title: 'Rainmaker', look: { skin: '#c8956a', hair: '#c8c4bc', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#5a2a4a', trim: '#e0bd64', trousers: '#3a3430', boots: '#2a1e14', hat: 'tophat', hatColor: '#2a2a2a', cape: '#3a2a3a', build: 1.0, age: 0.62 },
    schedule: [{ from: 7, to: 21, at: [PIKE.x, PIKE.z], face: [PIKE.x + 4, PIKE.z], anim: 'perform' }], when: (g) => g.flag(RAIN) !== 'half' || at(g, RAIN) !== 'done', barks: ['Rain by Sunday!', 'Feel that? The air\'s thinking about it.'] },
  { id: 'rd_dinah', name: 'Dinah Sell', title: 'Rider, the Charter Post', look: { frame: 'f', skin: '#d8a882', hair: '#2a1a12', hairStyle: 1, eyes: '#3a4a5a', tunic: '#2a3a6a', trim: '#c8a060', trousers: '#2e2e30', boots: '#1e1a16', hat: 'cap', hatColor: '#2a3a6a', lashes: true, build: 0.9, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [DINAH.x, DINAH.z], face: [DINAH.x + 3, DINAH.z + 3], anim: 'crouch' }], when: (g) => at(g, RAIN) === 'done', barks: ['Easy, Bramble.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'rd_letters', name: 'The scattered Post', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#3a2a20' }, desc: 'A handful of the Charter Post\'s letters, gathered off the red rock, one with its seal cracked.' },
];

export const REDSTONE_ROW: RegionContent = {
  id: 'redstoneRow',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { rd_lizzie: lizzie, rd_pike: pike, rd_dinah: dinah },
  quests,
  spawns,
  things,
};
