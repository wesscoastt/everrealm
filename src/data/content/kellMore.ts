import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two side stories in Brasswick, on Kell (owner 2026-11-13, content order: fill the Counties first), with the morality
// system's choices (docs/MORALITY.md). Both open once you're over the water (kellCrossing done).
//
// klMark, THE APPRENTICE'S MARK (Tamsyn Rowe, Gerens Tonkin's apprentice): every instrument with Gerens's mark on it for
// six years she made; his eyes went, and the Wheel doesn't let an apprentice put her own mark on anything. Brass mites
// have got into his store and are eating the stock; clear them, and Tamsyn shows you the work, and then: tell Ebrel
// Rundle at the Wheel (Tamsyn gets her mark; Gerens loses his name), keep it between you, or ([Kind]) get Gerens to stand
// before the Wheel himself and give her the mark. klMark = 'wheel' | 'quiet' | 'gerens'.
//
// klTick, OLD TICK (Demelza Angwin, nine): Old Tick is one of the old automata the runaway Escapement woke in spring.
// He's swept the same street every morning since, and the children love him, and last week he wound down in the square.
// His key went when he walked up to the Old Stack in the spring blow. Fetch it past the ash crawlers. Back in the square,
// Agnes Lusty from the forge is measuring him: four hundredweight of good brass, and nine roofs down on Furnace Row.
// Wind him, let Agnes have him for the roofs, set him to carrying slates for her roofers, or ([Bad or Evil]) sell him to
// Hext yourself. klTick = 'wound' | 'roofs' | 'slates' | 'sold'.

const MARK = 'klMark', TICK = 'klTick';
const TAMSYN = { x: 2427.0, z: -558.0 };
const MITES: [number, number][] = [[2430, -565], [2434, -559], [2431, -561]];
const DEMELZA = { x: 2389.5, z: -556.5 }, OLD_TICK = { x: 2392.5, z: -555.5 };
const STACK = { x: 2604, z: -800 }, KEY_AT = { x: 2610.5, z: -795.5 };
const CRAWLERS: [number, number][] = [[2600, -792], [2614, -804], [2606, -808]];

const over = (g: GameApi) => at(g, 'kellCrossing') === 'done';

// ================================================================ The Apprentice's Mark

const tamsyn: DialogueTree = {
  start: (g) => {
    const s = at(g, MARK);
    if (!s) return 't1';
    if (s === 'mites') return killed(g, 'klMites') >= MITES.length ? 't6' : 'tWait';
    if (s === 'done') return 'after';
    return 'tGo';
  },
  nodes: {
    t1: { speaker: 'narrator', text: 'A young Kilnwoman with a jeweller\'s loupe pushed up on her forehead and burn scars to the wrist, sweeping brass filings off a step with more force than the filings deserve.', next: 't2' },
    t2: { text: 'Tamsyn Rowe, apprentice to Gerens Tonkin, brass and instruments. Eleven years apprentice. On Kell you\'re apprentice until the Wheel says you\'re not, and the Wheel likes to take its time.', next: 't3' },
    t3: {
      text: 'There are mites in the store. Brass mites, up from the vents. They\'re eating the stock, and Gerens can\'t see them, and I can\'t fight. Would you?',
      options: [{ text: 'I\'ll clear the store.', effect: (g) => g.setStage(MARK, 'mites') }, { text: 'Not now.' }],
    },
    tWait: { text: (g) => `Round the back, by the store. ${Math.min(MITES.length, killed(g, 'klMites'))} of ${MITES.length}. They sound like rain on a tin roof.` },
    t6: { text: 'Thank you. Come inside a moment. There\'s something I want somebody to see, and you\'re somebody.', next: 't7' },
    t7: { speaker: 'narrator', text: 'On the bench, a ship\'s chronometer in a brass case, opened up. The work inside is as fine as frost. On the case: GERENS TONKIN, BRASSWICK, and the Tonkin mark, a little anvil.', next: 't8' },
    t8: { text: 'I made that. And the last forty with his mark on. His eyes went six years ago. He told nobody, and I told nobody, and the work went out under his name, and the Wheel kept me an apprentice because I\'d made nothing.', next: 't9' },
    t9: {
      text: 'I love him. I\'m tired of being nobody. What do I do?',
      options: [
        { text: 'Tell the Wheel. It\'s your work; it should have your name.', moral: { id: 'klMark:wheel', a: 3, tr: { honesty: 4, courage: 2 }, npc: { kl_tamsyn: 20, gerens_tonkin: -20, ebrel: 10 }, note: 'Took Tamsyn Rowe\'s work to the Wheel at Brasswick, and she got her own mark, and Gerens Tonkin lost his name.', major: true, spread: 'local' }, effect: (g) => { g.setFlag(MARK, 'wheel'); g.addMarks(80); g.setStage(MARK, 'done'); }, next: 'tW' },
        { text: 'Keep it between you a while longer. He won\'t have many years.', moral: { id: 'klMark:quiet', tr: { loyalty: 3, deception: 1 }, npc: { kl_tamsyn: -10, gerens_tonkin: 10 } }, effect: (g) => { g.setFlag(MARK, 'quiet'); g.addMarks(60); g.setStage(MARK, 'done'); }, next: 'tQ' },
        { text: 'Let me talk to Gerens. He should be the one to give you your mark.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'klMark:gerens', a: 6, tr: { compassion: 3, honesty: 2 }, npc: { kl_tamsyn: 20, gerens_tonkin: 15, ebrel: 5 }, note: 'Brought Gerens Tonkin before the Wheel to give his apprentice her own mark himself.', major: true, fame: 'got old Gerens Tonkin to give his apprentice her mark', spread: 'local' }, effect: (g) => { g.setFlag(MARK, 'gerens'); g.addMarks(90); g.setStage(MARK, 'done'); }, next: 'tG' },
      ],
    },
    tW: { text: 'Then I\'ll go to Ebrel tomorrow, with the chronometer and my notebooks. He\'ll know my hand once he sees it. Gerens will never forgive me. I\'ll go anyway.' },
    tQ: { text: 'A while longer. Yes. He taught me everything. I can give him a while longer. I can give him that.' },
    tG: { speaker: 'narrator', text: 'Gerens takes a long time. Then he walks to the Wheel with his hand on Tamsyn\'s shoulder, because he can\'t see the road, and in front of Ebrel Rundle and the whole hall he says, "Her work. Six years of it. Give her a mark, and give it her today." Ebrel does.' },
    tGo: { text: 'Round the back, by the store.' },
    after: {
      text: (g) => {
        const f = g.flag(MARK);
        if (f === 'wheel') return 'My mark\'s a little wheel with a crack in it. Ebrel chose it; he said it was honest. Gerens doesn\'t speak to me. He still lets me into the shop. That\'s something, from him.';
        if (f === 'gerens') return 'My mark\'s a little anvil with a star over it. His anvil, and my star. He chose it. He can\'t see it, but he knows it\'s there.';
        return 'Another chronometer went out last week with his mark on it. It was the best I\'ve made. Nobody will ever know. I know.';
      },
    },
  },
};

const gerensNodes: Record<string, DNode> = {
  gt1: { text: (g) => (g.flag(MARK) === 'gerens' ? 'The best thing I ever made was her. Don\'t tell her I said that.' : g.flag(MARK) === 'wheel' ? 'You took it to the Wheel. You were right. I hate that you were right.' : 'Mind the step. I can\'t see it, but I know where it is.') },
};

// ================================================================ Old Tick

const demelza: DialogueTree = {
  start: (g) => {
    const s = at(g, TICK);
    if (!s) return 'd1';
    if (s === 'agnes') return 'a1';
    if (s === 'done') return 'after';
    return 'dWait';
  },
  nodes: {
    d1: { speaker: 'narrator', text: 'A girl of nine sitting cross-legged in the square beside a brass man taller than her father, with a broom in his hand and his head bowed, quite still.', next: 'd2' },
    d2: { text: 'That\'s Old Tick. He came up out of the Works when the mountain went wrong, and he swept Gold Street every morning after, and he swept round us when we played. Last Tuesday he stopped.', next: 'd3' },
    d3: { text: 'He needs his key. He used to have it in his back. He walked up to the Old Stack in the big blow, and when he came back it was gone. Nobody will go up there. There are crawlers.', next: 'd4' },
    d4: {
      text: 'Please?',
      options: [{ text: 'I\'ll find Old Tick\'s key.', effect: (g) => g.setStage(TICK, 'key') }, { text: 'Not now, Demelza.' }],
    },
    dWait: { text: 'The Old Stack. East and up, on the Kiln\'s side. Please hurry. Agnes from the forge keeps coming to look at him.' },
    a1: { speaker: 'narrator', text: 'Agnes Lusty from the forge is in the square with a measuring stick and a slate, and Demelza is standing between her and Old Tick with her arms out.', next: 'a2' },
    a2: { as: 'agnes_lusty', text: 'Four hundredweight of good brass, and nine roofs down on Furnace Row from the blow. Families sleeping under sailcloth. I\'m sorry, love. I am.', next: 'a3' },
    a3: { text: 'You brought his key. Tell her!', next: 'a4' },
    a4: {
      text: 'What do you do with Old Tick?',
      options: [
        { text: '(Wind him.)', moral: { id: 'klTick:wound', tr: { compassion: 2 }, npc: { kl_demelza: 20, agnes_lusty: -10 } }, effect: (g) => { g.take('kl_key', 1); g.setFlag(TICK, 'wound'); g.addMarks(60); g.setStage(TICK, 'done'); }, next: 'dW' },
        { text: 'Let Agnes have him. Nine roofs is nine families.', moral: { id: 'klTick:roofs', a: 2, tr: { compassion: 2, honesty: 1 }, npc: { kl_demelza: -20, agnes_lusty: 15 } }, effect: (g) => { g.take('kl_key', 1); g.setFlag(TICK, 'roofs'); g.addMarks(60); g.setStage(TICK, 'done'); }, next: 'dR' },
        { text: 'Wind him, and set him to carrying slates for Agnes\'s roofers. He can mend the roofs himself.', moral: { id: 'klTick:slates', a: 4, tr: { compassion: 2, generosity: 2 }, npc: { kl_demelza: 20, agnes_lusty: 15 }, note: 'Wound Old Tick and set him to carrying slates for the roofs on Furnace Row.', fame: 'set Old Tick to mending the roofs of Furnace Row', spread: 'local' }, effect: (g) => { g.take('kl_key', 1); g.setFlag(TICK, 'slates'); g.addMarks(80); g.setStage(TICK, 'done'); }, next: 'dS' },
        { text: 'Hext will pay more for him than Agnes ever could.', need: { band: ['bad', 'evil'] }, moral: { id: 'klTick:sold', a: -10, tr: { greed: 5, cruelty: 2 }, npc: { kl_demelza: -40, agnes_lusty: -15, hext: 10 }, note: 'Sold Old Tick to Harrowgate\'s agent for his brass, in front of the child who loved him.', major: true, fame: 'sold Old Tick to Harrowgate', spread: 'local' }, effect: (g) => { g.take('kl_key', 1); g.setFlag(TICK, 'sold'); g.addMarks(150); g.setStage(TICK, 'done'); }, next: 'dX' },
      ],
    },
    dW: { speaker: 'narrator', text: 'The key goes in his back with a sound like a lock you\'ve been looking for the key to all your life. You turn it eleven times. Old Tick lifts his head, looks at Demelza, and begins, very carefully, to sweep round her feet.' },
    dR: { text: 'You\'re horrible. You\'re all horrible.', next: 'dR2' },
    dR2: { as: 'agnes_lusty', text: 'She\'ll come round. She won\'t, but I\'ll make the roof on her gran\'s house first, and she can hate me under it.' },
    dS: { speaker: 'narrator', text: 'Agnes looks at the brass man for a long moment, then at you, then laughs out loud. By evening Old Tick is going up and down a ladder on Furnace Row with a hod of slates, and a crowd of children is following him to tell him where to put them.' },
    dX: { speaker: 'narrator', text: 'Hext\'s men come for him at dusk with a cart. Demelza doesn\'t cry. She watches them load him, and then she watches you, and then she goes home.' },
    after: {
      text: (g) => {
        const f = g.flag(TICK);
        if (f === 'wound' || f === 'slates') return f === 'slates' ? 'He\'s done six roofs! He puts the slates on upside down sometimes and Agnes shouts at him and he takes them off and does it again. He never minds.' : 'He swept round me this morning. Twice. I think he missed me.';
        if (f === 'roofs') return 'Gran\'s roof is brass now. Bits of it. It\'s warm under it. I still hate it.';
        return 'Go away.';
      },
    },
  },
};

const quests: Record<string, QuestDef> = {
  [MARK]: {
    id: MARK, name: 'The Apprentice\'s Mark', region: 'kell', depth: 'quest',
    notes: (g, s) => (s === 'mites' ? 'Brass mites up from the vents are eating the stock in Gerens Tonkin\'s store in Brasswick. His apprentice, Tamsyn Rowe, can\'t fight them, and he can\'t see them.'
      : g.flag(MARK) === 'wheel' ? 'Tamsyn took her work to the Wheel, and has her own mark now. Gerens lost his name.' : g.flag(MARK) === 'gerens' ? 'Gerens gave Tamsyn her mark himself, before the whole Wheel.' : 'Tamsyn\'s work still goes out under Gerens\'s mark.'),
    objectives: (g, s) => (s === 'mites' ? [{ text: `Clear the brass mites from the store (${Math.min(MITES.length, killed(g, 'klMites'))}/${MITES.length})`, done: killed(g, 'klMites') >= MITES.length }, { text: 'Talk to Tamsyn Rowe', marker: 'kl_tamsyn' }] : []),
    marks: (g, s): Marks => (!s && over(g) ? { kl_tamsyn: '!' } : s === 'mites' && killed(g, 'klMites') >= MITES.length ? { kl_tamsyn: '?' } : {}),
    walk: { cast: ['kl_tamsyn'], kill: { mites: [['brassmite', 3]] }, from: { quests: { kellCrossing: 'done' } } },
  },
  [TICK]: {
    id: TICK, name: 'Old Tick', region: 'kell', depth: 'quest',
    notes: (g, s) => {
      if (s === 'key') return 'Old Tick, an automaton the runaway Escapement woke, swept Gold Street in Brasswick every morning until he wound down last week. His key went when he walked up to the Old Stack in the spring blow. There are ash crawlers up there.';
      if (s === 'agnes') return 'I have Old Tick\'s key. Back in the square, Agnes Lusty from the forge wants his brass for the roofs down on Furnace Row.';
      const f = g.flag(TICK);
      return f === 'wound' ? 'Old Tick sweeps Gold Street again.' : f === 'slates' ? 'Old Tick carries slates for the roofers on Furnace Row.' : f === 'roofs' ? 'Old Tick\'s brass went to the roofs on Furnace Row.' : 'I sold Old Tick to Harrowgate\'s agent.';
    },
    objectives: (g, s) => (s === 'key' ? [{ text: `Clear the ash crawlers at the Old Stack (${Math.min(CRAWLERS.length, killed(g, 'klCrawlers'))}/${CRAWLERS.length})`, done: killed(g, 'klCrawlers') >= CRAWLERS.length }, { text: 'Find Old Tick\'s key', marker: 'klKey' }]
      : s === 'agnes' ? [{ text: 'Take the key to Demelza in the square', marker: 'kl_demelza' }] : []),
    marks: (g, s): Marks => (!s && over(g) ? { kl_demelza: '!' } : s === 'agnes' ? { kl_demelza: '?' } : {}),
    walk: { cast: ['kl_demelza'], kill: { key: [['ashcrawler', 3]] }, from: { quests: { kellCrossing: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'klMites', type: 'brassmite', at: MITES, when: (g) => at(g, MARK) === 'mites' },
  { tag: 'klCrawlers', type: 'ashcrawler', at: CRAWLERS, when: (g) => at(g, TICK) === 'key' },
];

const things: WorldThing[] = [
  { id: 'klKey', x: KEY_AT.x, z: KEY_AT.z, label: 'Pick up the brass key', radius: 2.6, look: 'glint',
    when: (g) => at(g, TICK) === 'key' && killed(g, 'klCrawlers') >= CRAWLERS.length,
    use: (g) => { g.give('kl_key', 1); g.setStage(TICK, 'agnes'); g.toast('In the ash at the lip of the Old Stack, a brass key as long as your forearm, with a bow shaped like a little broom. Somebody made it with a sense of humour, three hundred years ago.'); } },
];

const NPCS: NpcDef[] = [
  { id: 'kl_tamsyn', name: 'Tamsyn Rowe', title: 'Apprentice, brass and instruments', look: { frame: 'f', skin: '#c8956a', hair: '#8a3a1e', hairStyle: 1, eyes: '#4a5a4a', tunic: '#5a4a3a', trim: '#c8a050', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 1.12, age: 0.3 },
    schedule: [{ from: 7, to: 20, at: [TAMSYN.x, TAMSYN.z], face: [TAMSYN.x - 2, TAMSYN.z - 2], anim: 'idle' }], when: over, barks: ['Six years.'] },
  { id: 'kl_demelza', name: 'Demelza Angwin', title: 'Brasswick', look: { frame: 'f', skin: '#d8a882', hair: '#2a1a12', hairStyle: 2, eyes: '#4a4a3a', tunic: '#6a3a3a', trim: '#c8a050', trousers: '#3a3430', boots: '#2a1e14', freckles: true, lashes: true, build: 0.7, age: 0.08 },
    schedule: [{ from: 7, to: 19, at: [DEMELZA.x, DEMELZA.z], face: [OLD_TICK.x, OLD_TICK.z], anim: 'idle' }], when: over, barks: ['He\'s only resting.'] },
  { id: 'kl_tick', name: 'Old Tick', title: 'An automaton of the Escapement', look: { skin: '#b8873a', hair: '#8a6a2a', hairStyle: 0, eyes: '#e8c860', tunic: '#a8782a', trim: '#6a4a1a', trousers: '#8a6a2a', boots: '#5a4020', shoulderPads: '#c8a050', build: 1.3, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [OLD_TICK.x, OLD_TICK.z], face: [DEMELZA.x, DEMELZA.z], anim: 'idle' }], when: (g) => over(g) && g.flag(TICK) !== 'sold' && g.flag(TICK) !== 'roofs' && g.flag(TICK) !== 'slates', barks: ['(tick)', '(tick, tick)'] },
];

const ITEMS: ItemDef[] = [
  { id: 'kl_key', name: 'Old Tick\'s key', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'key', a: '#c8a050', b: '#8a6a2a' }, desc: 'A brass winding key as long as your forearm, its bow shaped like a little broom.' },
];

export const KELL_MORE: RegionContent = {
  id: 'kellMore',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { kl_tamsyn: tamsyn, kl_demelza: demelza, kl_tick: { start: () => 'k0', nodes: { k0: { speaker: 'narrator', text: (g) => (at(g, TICK) === 'done' ? 'Old Tick sweeps carefully round your feet, and moves on.' : 'A brass man with a broom, his head bowed, quite still. There\'s a keyhole in his back.') } } } },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'gerens_tonkin', (g) => (at(g, MARK) === 'done' ? 'gt1' : undefined), gerensNodes);
  },
};
