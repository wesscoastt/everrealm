import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { QuestSpawn } from '../places_regional';

// THE SILENT WATERS, chapters 3 and 4 (docs/VERANDAH.md section 3; chapters 1 and 2 are silentWaters.ts).
//
// swLights, 3: FALSE LIGHTS (Captain Morvah, after Late Cargo): Morvah blames the Black Gulls, as she always does, and
// sends the player onto Awschitz Head to clear the wreckers and bring one back who can talk. The lamp-man is Nicky
// Skewes, Mother Skewes's son. The Gulls haven't put a merchant ship on the rocks in two years: there's no money in
// wrecks now. There's money in boats. A man in a good coat pays ten marks a head for every pilchard boat taken off the
// Fortress grounds, crew and all, and Mother Skewes keeps the crews chained in Black Gull Keep's hall until he says, because
// she doesn't kill what she can sell back. March Nicky to Morvah, or let him go for telling you how the hall is kept.
// swLights = 'bound' | 'freed'.
//
// swKeep, 4: BLACK GULL KEEP (Captain Morvah, after False Lights): Morvah can't send a regiment into a castle for three
// fishing crews. The player can, with friends. Bring down Mother Skewes in the Keep's hall and strike the chains off the
// crews of the Swallow, the Sweet Promise and the Little Grace. Petroc Hocking saw a ship go into the sea cave under the
// Fortress at dead of night with her lamps out, the night before they were taken: the Good Intent. Bring him home to
// Tegen. Chapter 5, The Tally, starts at the Fortress.

const LIGHTS = 'swLights', KEEP = 'swKeep';
const HEAD: [number, number][] = [[-3456, 1908], [-3462, 1914], [-3453, 1917]];
const NICKY = { x: -3458.5, z: 1912.5 };
/** The Keep's hall (floor 18), the west end, where Mother Skewes stands over the chained crews. */
const CHAINED: [number, number][] = [[-3398.5, 2111.5], [-3398.5, 2113.5], [-3398.5, 2115.5]];

const skewesDown = (g: GameApi) => Number(g.flag('killed:dg_bg_skewes') ?? 0) > Number(g.flag('swSkewesBase') ?? 0);

// ================================================================ 3: False Lights

const morvahNodes: Record<string, DNode> = {
  ml1: { text: 'Grace Vyvyan sent you. The Good Intent never sailed. And three pilchard boats gone off the Fortress grounds. And you\'ve come to tell me it\'s strange.', next: 'ml2' },
  ml2: { text: 'It\'s not strange. It\'s the Black Gulls. It\'s always the Black Gulls. They\'re on the Head tonight with their lamps out, waiting for a ship to steer for the light, and my marines are at sea with the Vigilant.', next: 'ml3' },
  ml3: {
    text: 'Clear them off the Head. And bring me one of them who can still talk. Then we\'ll see whose ships go missing.',
    options: [{ text: 'I\'ll clear the Head.', effect: (g) => g.setStage(LIGHTS, 'head') }, { text: 'Not now, Captain.' }],
  },
  mb1: {
    text: (g) => (g.flag(LIGHTS) === 'bound'
      ? 'Nicky Skewes, in my cellar, sulking. He told me what he told you, twice, and cried the second time. Not the Gulls. Ten marks a head, from a man in a good coat.'
      : 'You let him go. I\'d have hanged him by Michaelmas, and he\'d have told me nothing, so perhaps you\'re right. Not the Gulls. Ten marks a head, from a man in a good coat.'),
    next: 'mb2',
  },
  mb2: { text: 'Then somebody on this island is buying fishermen, and the Gulls are only the hands. I\'ve been hunting the hands for six years. I\'ve been a fool.', options: [{ text: 'You weren\'t to know, Captain.', effect: (g) => { g.addMarks(110); g.setStage(LIGHTS, 'done'); } }] },
  // 4: Black Gull Keep
  mk1: { text: 'Three crews, chained in Mother Skewes\'s hall. I can\'t take the Keep. It would want a regiment, and the king won\'t give me one for three fishing crews and a story out of Nicky Skewes.', next: 'mk2' },
  mk2: {
    text: 'But a regiment\'s only men. You could take friends in. Kill Mother Skewes, strike the chains off, and bring those crews out. I\'ll have Wenna\'s boat waiting at the foot of the Keep to row them home.',
    options: [{ text: 'I\'ll bring them out.', effect: (g) => { g.setFlag('swSkewesBase', Number(g.flag('killed:dg_bg_skewes') ?? 0)); g.setStage(KEEP, 'keep'); } }, { text: 'Not yet.' }],
  },
  mAfter: { text: 'The crews are home. And somebody in a good coat is short three crews. Watch your back on the quay.' },
};

const nicky: DialogueTree = {
  start: () => 'n1',
  nodes: {
    n1: { speaker: 'narrator', text: 'A thin young man with a burnt hand, sitting in the grass by the wreckers\' lamp with his wrists tied behind him with his own lamp cord. He has his mother\'s nose and he looks at you with it.', next: 'n2' },
    n2: { text: 'Nicky Skewes. You\'ll have heard of my mam. Go on, then. Ask. Everybody wants to know what the Gulls did with the Good Intent. The Gulls never touched the Good Intent.', next: 'n3' },
    n3: { text: 'We haven\'t put a merchant ship on the rocks in two years. There\'s no money in a wreck now. Ships are insured, the Board sends men, the cargo\'s claimed before it\'s dry. There\'s money in boats.', next: 'n4' },
    n4: { text: 'A man in a good coat pays Mam ten marks a head for every pilchard boat taken off the Fortress grounds, crew and all. Mam keeps the crews in the hall till he says. She doesn\'t kill what she can sell back. She\'s not a fool.', next: 'n5' },
    n5: {
      text: 'So. Am I going to Morvah\'s cellar?',
      options: [
        { text: 'You are. On your feet.', moral: { id: 'swLights:bound', tr: { honesty: 1, courage: 1 }, rep: { verandah: 2 }, npc: { aw_morvah: 10 } }, effect: (g) => { g.setFlag(LIGHTS, 'bound'); g.setStage(LIGHTS, 'morvah'); }, next: 'nB' },
        { text: 'Tell me how your mother keeps the hall, and you can walk home.', moral: { id: 'swLights:freed', tr: { compassion: 1, deception: 1 }, rep: { verandah: -1 }, npc: { aw_morvah: -5 }, note: 'Let Nicky Skewes, a Black Gull lamp-man, go free for word of how the Keep\'s hall is kept.' }, effect: (g) => { g.setFlag(LIGHTS, 'freed'); g.setStage(LIGHTS, 'morvah'); }, next: 'nF' },
      ],
    },
    nB: { text: 'Mam will come for me. She always says she will. She never has.' },
    nF: { text: 'The crews are chained by the west wall of the hall, and Mam stands in front of them with the big hammer. She never goes up the tower. She doesn\'t like Hawke. Feed the dogs first, and she\'s alone. Don\'t tell her it was me.' },
  },
};

// ================================================================ 4: Black Gull Keep

const petroc: DialogueTree = {
  start: (g) => (at(g, KEEP) === 'cells' ? 'p1' : 'p0'),
  nodes: {
    p0: { text: 'She\'s right there. Don\'t, if you value your head. She broke Jem\'s arm for asking for water.' },
    p1: { speaker: 'narrator', text: 'You knock the staple out of the wall with Mother Skewes\'s own hammer, and the chain runs free through the rings, and three crews who have been sitting in their own dirt since spring try to stand up all at once.', next: 'p2' },
    p2: { text: 'Petroc Hocking. The Little Grace. Is my sister alive? Is Tegen all right? Of course she\'s all right. She\'ll be furious.', next: 'p3' },
    p3: { text: 'Listen. The night before they took us, we were lying off the Fortress grounds waiting for the pilchards to rise, and a ship came past us in the dark with every lamp out. Close enough to touch. She went in under the Fortress, into the sea cave. A big ship. A Vyvyan ship: I saw the blue strake.', next: 'p4' },
    p4: { text: 'It was the Good Intent. Ralph Truscott\'s ship. I\'d know her anywhere. Two nights later the Gulls came alongside, and here we are. Somebody didn\'t want us to have seen her.', options: [{ text: 'Wenna\'s boat is waiting. Let\'s get you home.', effect: (g) => g.setStage(KEEP, 'tegen') }] },
  },
};

const tegenNodes: Record<string, DNode> = {
  tk1: { speaker: 'narrator', text: 'Tegen sees him before you\'ve said a word: Petroc coming up the quay from Wenna\'s boat, thin as a rake, in somebody else\'s coat. She puts the knife down. She doesn\'t run. She walks down the quay to him, and takes his face in both her fish-scaled hands, and hits him across the ear.', next: 'tk2' },
  tk2: { text: 'That\'s for Grase. With an S. Fifty years old and he can\'t spell the boat he owns. Come here.', next: 'tk3' },
  tk3: { speaker: 'narrator', text: 'Later, when the stall is shut and Petroc is asleep in the back with a blanket over him and a bowl of fish stew going cold beside him, Tegen presses a purse into your hand and won\'t hear a word about it.', options: [{ text: 'Look after him, Tegen.', effect: (g) => { g.addMarks(160); g.setStage(KEEP, 'done'); } }] },
  tkAfter: { text: 'He\'s mending nets. He won\'t go out past the bar. He says he will, in the spring. He says a lot of things. He\'s home.' },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [LIGHTS]: {
    id: LIGHTS, name: 'The Silent Waters: False Lights', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'head') return 'Captain Morvah is sure the Black Gulls took the Good Intent. Clear the wreckers off Awschitz Head and find one of them who can still talk.';
      if (s === 'lamp') return 'The wreckers on the Head are down. Their lamp-man is tied up by the lamp.';
      if (s === 'morvah') return 'Not the Gulls. A man in a good coat pays ten marks a head for fishing crews, and Mother Skewes keeps them chained in Black Gull Keep. Back to Captain Morvah.';
      return 'Somebody on Verandah is buying fishing crews from the Black Gulls. Morvah knows it isn\'t the Gulls.';
    },
    objectives: (g, s) => (s === 'head' ? [{ text: `Clear the wreckers off Awschitz Head (${Math.min(HEAD.length, killed(g, 'swHead'))}/${HEAD.length})`, done: killed(g, 'swHead') >= HEAD.length }]
      : s === 'lamp' ? [{ text: 'Question the lamp-man', marker: 'sw_nicky' }]
      : s === 'morvah' ? [{ text: 'Go back to Captain Morvah at Awschitz', marker: 'aw_morvah' }] : []),
    advance: (g, s) => (s === 'head' && killed(g, 'swHead') >= HEAD.length ? 'lamp' : null),
    marks: (g, s): Marks => (!s && at(g, 'swIntent') === 'done' ? { aw_morvah: '!' } : s === 'morvah' ? { aw_morvah: '?' } : {}),
    walk: { cast: ['aw_morvah', 'sw_nicky'], kill: { head: [['wrecker', 3]] }, from: { quests: { swGrace: 'done', swIntent: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed' } } },
  },
  [KEEP]: {
    id: KEEP, name: 'The Silent Waters: Black Gull Keep', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'keep') return 'Three fishing crews are chained in the hall of Black Gull Keep, with Mother Skewes standing over them. Morvah can\'t take the Keep. I can, with friends. Bring her down.';
      if (s === 'cells') return 'Mother Skewes is down. Strike the chains off the crews by the west wall of the hall.';
      if (s === 'tegen') return 'Petroc Hocking saw the Good Intent go into the sea cave under the Fortress with her lamps out. Bring him home to Tegen.';
      return 'The crews are home. Petroc saw the Good Intent go into the Fortress\'s sea cave.';
    },
    objectives: (g, s) => (s === 'keep' ? [{ text: 'Bring down Mother Skewes in the hall of Black Gull Keep', done: skewesDown(g) }]
      : s === 'cells' ? [{ text: 'Free the crews by the hall\'s west wall', marker: 'sw_petroc' }]
      : s === 'tegen' ? [{ text: 'Bring Petroc home to Tegen at the fish stalls', marker: 'ver_fish_tegen' }] : []),
    advance: (g, s) => (s === 'keep' && skewesDown(g) ? 'cells' : null),
    marks: (g, s): Marks => (!s && at(g, LIGHTS) === 'done' ? { aw_morvah: '!' } : s === 'tegen' ? { ver_fish_tegen: '?' } : {}),
    walk: { cast: ['aw_morvah', 'sw_petroc', 'ver_fish_tegen'], kill: { keep: [['dg_bg_skewes', 1]] }, from: { quests: { swGrace: 'done', swIntent: 'done', swLights: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed', swLights: 'bound' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'swHead', type: 'wrecker', at: HEAD, when: (g) => at(g, LIGHTS) === 'head' },
];

const fisher = (skin: string, hair: string, extra: Partial<NonNullable<NpcDef['look']>> = {}): NpcDef['look'] =>
  ({ skin, hair, hairStyle: 0, eyes: '#3a4a5a', tunic: '#4a4a42', trim: '#2a2a28', shirt: '#a8a090', trousers: '#2a2a2e', boots: '#1e1a16', ...extra });

const chained = (g: GameApi) => at(g, KEEP) === 'keep' || at(g, KEEP) === 'cells';

const NPCS: NpcDef[] = [
  { id: 'sw_nicky', name: 'Nicky Skewes', title: 'Lamp-man, the Black Gulls', look: { skin: '#d8a882', hair: '#5a3a22', hairStyle: 1, eyes: '#3a3a2a', tunic: '#2a2a2e', trim: '#4a4a42', trousers: '#2a2620', boots: '#1e1a16', hat: 'wide', hatColor: '#1a1a1e', build: 0.85, age: 0.22 },
    schedule: [{ from: 0, to: 24, at: [NICKY.x, NICKY.z], face: [NICKY.x + 3, NICKY.z], anim: 'seated', y: 16 }],
    when: (g) => at(g, LIGHTS) === 'lamp', barks: ['Mam will come for me.'] },
  { id: 'sw_petroc', name: 'Petroc Hocking', title: 'The Little Grace', look: fisher('#d8a882', '#c8c4bc', { facial: 3, build: 0.85, age: 0.45 }),
    schedule: [{ from: 0, to: 24, at: CHAINED[1], face: [CHAINED[1][0] + 4, CHAINED[1][1]], anim: 'seated', y: 18 }],
    when: chained, barks: ['Water. Please.'] },
  { id: 'sw_crew1', name: 'Jem Pascoe', title: 'Off the Swallow', look: fisher('#c8906a', '#2a1e14', { age: 0.3 }),
    schedule: [{ from: 0, to: 24, at: CHAINED[0], face: [CHAINED[0][0] + 4, CHAINED[0][1]], anim: 'seated', y: 18 }],
    when: chained, barks: ['Mind your arm. She broke mine.'] },
  { id: 'sw_crew2', name: 'Will Roskilly', title: 'Off the Sweet Promise', look: fisher('#e0b494', '#8a5a2a', { facial: 2, age: 0.55 }),
    schedule: [{ from: 0, to: 24, at: CHAINED[2], face: [CHAINED[2][0] + 4, CHAINED[2][1]], anim: 'seated', y: 18 }],
    when: chained, barks: ['Is it spring yet? It was spring.'] },
];

export const SILENT_WATERS_TWO: RegionContent = {
  id: 'silentWatersTwo',
  npcs: NPCS,
  dialogue: { sw_nicky: nicky, sw_petroc: petroc },
  quests,
  spawns,
  hooks: (D) => {
    hook(D, 'aw_morvah', (g) => (at(g, LIGHTS) === 'morvah' ? 'mb1' : undefined), morvahNodes);
    addOption(D, 'aw_morvah', 'hello', { text: 'Grace Vyvyan sent me. The Good Intent never sailed.', cond: (g) => at(g, 'swIntent') === 'done' && !at(g, LIGHTS), next: 'ml1' });
    addOption(D, 'aw_morvah', 'hello', { text: 'The crews in Black Gull Keep.', cond: (g) => at(g, LIGHTS) === 'done' && !at(g, KEEP), next: 'mk1' });
    addOption(D, 'aw_morvah', 'hello', { text: 'The crews are home, Captain.', cond: (g) => at(g, KEEP) === 'done', next: 'mAfter' });
    hook(D, 'ver_fish_tegen', (g) => (at(g, KEEP) === 'tegen' ? 'tk1' : undefined), tegenNodes);
    addOption(D, 'ver_fish_tegen', 'hello', { text: 'How\'s Petroc?', cond: (g) => at(g, KEEP) === 'done', next: 'tkAfter' });
  },
};
