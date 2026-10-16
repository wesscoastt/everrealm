import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, type Marks } from '../kit';
import type { RegionContent } from '../types';

// The Waystation, the old drove road's shrines, and the farms off the Turnpike.
// THE LAMP ROUND (storyline, two quests): Aud Merrow's shrine lamps, and who drinks the oil at the
//   Downs shrine. lampChoice = 'strake' | 'round' | 'leave'.
// THE LAST PAGE (hidden): the old toll tower's book, and a name in it.
// DROPPED POST (quest): Bess Tull's split mailbag on the south road.
// THE ASKEW BARLEY (quest): boars, and a sow in the hedge. sowChoice = 'killed' | 'fenced'.

const LAMP1 = 'crLamp1', LAMP2 = 'crLamp2', TOLLS = 'crTolls', POST = 'crPost', BARLEY = 'crAskew';
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);
const LAMPS = [['crLampWithy', 'the Withy shrine'], ['crLampWall', 'the Wall shrine'], ['crLampDowns', 'the Downs shrine']] as const;
const lit = (g: GameApi) => LAMPS.filter(([f]) => g.flag(f)).length;
const LETTERS = ['crPost1', 'crPost2', 'crPost3', 'crPost4'];

const aud: DialogueTree = {
  start: (g) => {
    if (!at(g, LAMP1)) return 'a1';
    if (at(g, LAMP1) === 'round') return 'aWait';
    if (at(g, LAMP1) === 'aud') return 'a6';
    if (at(g, LAMP2) === 'aud') return 'aw1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('lampChoice');
        if (c === 'round') return 'Wat Hollis walks the north lamps. A pint a lamp. I measure his pot with a stick when he isn\'t looking.';
        if (c === 'strake') return 'The lamps are mine again. Strake says Hollis is warm. I didn\'t ask, and she told me anyway.';
        if (c === 'leave') return 'The Downs lamp\'s dark. The Withy and the Wall are lit. Two out of three is what my knees can do.';
        return 'Somebody\'s at my oil on the Downs. I\'ll know who.';
      },
    },
    a1: { text: 'Are you walking north? Then you can carry oil. My knees stopped walking north at harvest.', next: 'a2' },
    a2: { text: 'I keep the shrine lamps. Three on my round: the Withy shrine, the Wall shrine under the city, and the Downs.', next: 'a3' },
    a3: { text: 'Carters steered by them on the old drove road, before the Turnpike was paved. Some still do, at night.', next: 'a3b' },
    a3b: { text: 'The Charter stopped paying for the oil two winters back. I buy it myself. A pint a lamp.', next: 'a4' },
    a4: {
      text: 'Will you take three pints and light them? Fill it, trim the wick, strike it. Don\'t stare at the flame. Everybody stares.',
      options: [{ text: 'I\'ll light them.', next: 'a5' }, { text: 'Not now.' }],
    },
    a5: { text: 'The Withy\'s west, past the beck. The Wall shrine\'s under the city wall. The Downs is a long way north.', effect: (g) => { g.give('lamp_oil', 3); g.setStage(LAMP1, 'round'); } },
    aWait: { text: (g) => `${lit(g)} of three. The Downs is the long one.` },
    a6: { text: 'All three?', options: [{ text: 'The Downs lamp had been levered open and drained.', next: 'a7' }] },
    a7: { text: 'Again. Third time since harvest.', next: 'a8' },
    a8: {
      text: 'Somebody\'s burning my oil, or drinking it. I\'d like to know which before I buy more. Here, for your legs.',
      effect: (g) => { g.addMarks(12); g.setStage(LAMP1, 'done'); },
    },
    aw1: {
      text: 'Well? Who\'s at my oil?',
      options: [
        { text: 'Wat Hollis, the old toll-keeper. He lives in the tower. Tell Strake.', next: 'aS' },
        { text: 'Wat Hollis. He has the legs you haven\'t. Let him keep the north lamps.', next: 'aR' },
        { text: 'I didn\'t find out who.', next: 'aL' },
      ],
    },
    aS: { text: 'Hollis. I knew him when the tower took tolls. He had a brass badge and opinions.', next: 'aS2' },
    aS2: { text: 'Go on, then. Tell Strake. I\'m not walking to the city on these knees for a man who drank my oil.', effect: (g) => g.setStage(LAMP2, 'strake') },
    aR: { text: 'Give a thief my oil, and my round.', next: 'aR2' },
    aR2: { speaker: 'narrator', text: 'She looks at her knees, and then north, in the direction of the Downs.', next: 'aR3' },
    aR3: {
      text: 'He\'d keep them better than I can now. Tell him it\'s a pint a lamp, and I\'ll know if it\'s less.',
      effect: (g) => { g.setFlag('lampChoice', 'round'); g.addMarks(15); g.setStage(LAMP2, 'done'); },
    },
    aL: { text: 'Didn\'t you.', next: 'aL2' },
    aL2: {
      text: 'Then the Downs lamp stays dark. I can\'t walk that far, and I won\'t buy oil for whoever it is to drink.',
      effect: (g) => { g.setFlag('lampChoice', 'leave'); g.addMarks(8); g.setStage(LAMP2, 'done'); },
    },
  },
};

const wat: DialogueTree = {
  start: (g) => (at(g, LAMP2) === 'wat' ? 'w1' : 'main'),
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('lampChoice');
        if (c === 'round') return 'A pint a lamp. She measures it with a stick when she thinks I can\'t see. I can see. I let her.';
        if (c === 'leave') return 'The Downs lamp\'s dark. So I keep this one lit, so somebody on the road has a light.';
        return 'This was a toll tower, before the Turnpike was paved. I kept it.';
      },
      options: [{ text: 'What happened to it?', next: 'hist' }, { text: 'Bye.' }],
    },
    hist: { text: 'The Charter paved the road and moved the tolls to the city gates. They pensioned me off. Eight marks a quarter.', next: 'hist2' },
    hist2: { text: 'Then the road had to be paid for, and the pensions were the first thing it ate.' },
    w1: { text: 'You\'ve come from the Downs shrine. You\'ve got lamp oil on your sleeve. So have I.', next: 'w2' },
    w2: { text: 'Wat Hollis. Toll-keeper of this tower, when it was a tower.', next: 'w3' },
    w3: { text: 'My pension stopped two winters ago. Same winter the Charter stopped buying Aud Merrow\'s oil. We were both economies.', next: 'w4' },
    w4: { speaker: 'narrator', text: 'He doesn\'t apologise. He folds his hands in his lap like a man at a hearing.', next: 'w5' },
    w5: {
      text: 'Tell her. I\'d rather she knew it was me than thought it was wolves. Wolves don\'t use a lever.',
      effect: (g) => g.setStage(LAMP2, 'aud'),
    },
  },
};

const watCity: DialogueTree = {
  start: () => 'main',
  nodes: { main: { text: 'Gatehouse stove. Ferris brings soup. I sweep. I\'ve been kept worse, and by the same Charter.' } },
};

const hetty: DialogueTree = {
  start: (g) => (at(g, POST) === 'hetty' ? 'ht1' : 'main'),
  nodes: {
    main: {
      text: 'The Waystation. Two marks a bed, one for the barn. On firstday Harrowgate\'s drivers take every bed in the house.',
      options: [{ text: 'Who sorts the Post here?', next: 'sort' }, { text: 'Bye.' }],
    },
    sort: { text: 'I do. Bess drops the bag, I sort it by county, the next cart takes it on. Mostly it\'s bills. People pay to send bills.' },
    ht1: { text: 'Bess\'s bag? Bess doesn\'t lose bags. Bess loses horses.', options: [{ text: 'Hand over the letters.', next: 'ht2' }] },
    ht2: { speaker: 'narrator', text: 'She sorts them on the bench by the fire, fast, by county.', next: 'ht3' },
    ht3: { text: 'Four. Bess says there were six. The other two are in a wolf.', next: 'ht4' },
    ht4: {
      text: 'This one\'s for Edda Strake at the south gate. Third time it\'s been sent. Take it, you\'re going that way.',
      effect: (g) => { g.take('post_letter', 4); g.give('strake_letter'); g.setStage(POST, 'strake'); },
    },
  },
};

const pru: DialogueTree = {
  start: (g) => {
    const s = at(g, BARLEY);
    if (!s) return 'k1';
    if (s === 'kill') return 'kWait';
    if (s === 'pru') return 'k5';
    if (s === 'sow') return 'kSowWait';
    if (s === 'pru2') return 'kS2';
    if (s === 'fence') return g.count('oak_logs') >= 6 ? 'kF2' : 'kF1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (g.flag('sowChoice') === 'fenced'
        ? 'Eight stripes by the beck. They watch me over the rails like I owe them barley.'
        : 'Barley\'s standing. The hedge is quiet. I don\'t look at it.'),
    },
    k1: { text: 'Boars. Every night. They\'ve had a third of the barley and all of my temper.', next: 'k2' },
    k2: {
      text: 'Three of them come up from the beck at dusk. Kill them, and I\'ll pay you what the barley would have fetched.',
      options: [{ text: 'I\'ll deal with them.', next: 'k3' }, { text: 'Not today.' }],
    },
    k3: { text: 'They\'re in the bottom field. Don\'t chase them through the standing crop. That\'s the whole point.', effect: (g) => g.setStage(BARLEY, 'kill') },
    kWait: { text: (g) => `${Math.min(3, kills(g, 'barley'))} of three. The bottom field, by the beck.` },
    k5: { text: 'Three. Good.', next: 'k6' },
    k6: { text: 'There\'s a sow as well. She\'s farrowed in the hedge by the beck. Eight striped ones.', next: 'k7' },
    k7: {
      text: 'I kill her and the litter\'s dead in a week. Or I fence the bottom field, and she raises eight more boars on my doorstep.',
      options: [
        { text: 'Kill the sow.', next: 'kS' },
        { text: 'Fence the field. I\'ll bring the oak.', next: 'kF' },
      ],
    },
    kS: { text: 'That\'s farming. She\'ll be in the hedge by the beck.', effect: (g) => g.setStage(BARLEY, 'sow') },
    kSowWait: { text: 'The hedge by the beck.' },
    kS2: { text: 'Done, then.', next: 'kS3' },
    kS3: { speaker: 'narrator', text: 'She doesn\'t look at the hedge. She looks at the barley, which is what she\'s paying you for.', next: 'kS4' },
    kS4: {
      text: 'Here. What the barley would have fetched, and a bit for the sow.',
      effect: (g) => { g.setFlag('sowChoice', 'killed'); g.addMarks(25); g.setStage(BARLEY, 'done'); },
    },
    kF: { text: 'Six oak logs, then. Rails don\'t grow.', effect: (g) => g.setStage(BARLEY, 'fence') },
    kF1: { text: 'Six oak. For rails.' },
    kF2: { text: 'Six. Straight enough for rails.', options: [{ text: 'Hand over the logs.', next: 'kF3' }] },
    kF3: { text: 'Rails up by tomorrow. She can raise her eight on the other side of them.', next: 'kF4' },
    kF4: {
      text: 'They\'ll be in somebody\'s barley next year. Not mine. I\'m told that isn\'t neighbourly.',
      effect: (g) => { g.take('oak_logs', 6); g.setFlag('sowChoice', 'fenced'); g.addMarks(25); g.setStage(BARLEY, 'done'); },
    },
  },
};

const shrine = (flag: string, toast: string, extra?: (g: GameApi) => void) => (g: GameApi) => {
  if (!g.take('lamp_oil')) { g.toast('You have no oil for the lamp.'); return; }
  g.setFlag(flag);
  extra?.(g);
  g.toast(toast);
};
const letter = (flag: string) => (g: GameApi) => {
  if (g.give('post_letter')) { g.setFlag(flag); g.toast('A letter, damp, and stepped on by something with claws.'); }
};

export const CR_ROAD: RegionContent = {
  id: 'crownroad-road',
  dialogue: { aud, wat, watCity, hetty, pru },
  items: [
    { id: 'lamp_oil', name: 'Lamp oil', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'gel', a: '#d8b860' }, desc: 'A pint in a stoppered tin. Aud Merrow buys it herself.' },
    { id: 'tower_book', name: 'The tower\'s toll book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#8a6a3a' }, desc: 'Forty years old. The last entry is ruled off: "Road paved. Tolls to the gates. Tower closed."' },
    { id: 'post_letter', name: 'Charter Post letter', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'Damp, muddy, and addressed. Hetty Brannock sorts the Post at the Waystation.' },
    { id: 'strake_letter', name: 'Letter for E. Strake', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'For Edda Strake, South Gate, Ansbury. Readdressed twice, in two different hands.' },
  ],
  readables: {
    watCamp: {
      title: 'Inside the tower',
      body: 'Inside the tower, out of the wind: a bed of bracken, a tin lamp burning with a clean, steady flame, and a pint pot that smells of lamp oil.\n\nA coat hangs on a nail in the wall, brushed. There are brass buttons on it, the old Charter pattern.',
      effect: (g) => { if (at(g, LAMP2) === 'look') g.setStage(LAMP2, 'wat'); },
    },
    towerBook: {
      title: 'The tower\'s toll book',
      body: 'Wedged between two stones of the inner wall, wrapped in oilcloth: a ledger forty years old, the last the tower kept. On the final page:\n\n"Tannet, Cotter\'s End. Barley, 3 sacks. Toll paid in full. W.H."\n\nRuled off under it, in the same hand: "Road paved. Tolls to the gates. Tower closed."',
      effect: (g) => { if (!at(g, TOLLS) && g.give('tower_book')) g.setStage(TOLLS, 'hob'); },
    },
  },
  things: [
    { id: 'crLampWithy', x: 590.5, z: 452.2, label: 'Light the shrine lamp', radius: 2.4, when: (g) => at(g, LAMP1) === 'round' && !g.flag('crLampWithy'), use: shrine('crLampWithy', 'The wick takes on the second strike.') },
    { id: 'crLampWall', x: 739.5, z: 232.2, label: 'Light the shrine lamp', radius: 2.4, when: (g) => at(g, LAMP1) === 'round' && !g.flag('crLampWall'), use: shrine('crLampWall', 'The lamp has been out a while. A spider has to move house.') },
    {
      id: 'crLampDowns', x: 794.5, z: 114.2, label: 'Light the shrine lamp', radius: 2.4, when: (g) => at(g, LAMP1) === 'round' && !g.flag('crLampDowns'),
      use: shrine('crLampDowns', 'The reservoir has been levered open and scraped dry. You fill it and light it. Boot prints in the mud lead north-east.'),
    },
    { id: 'watCamp', x: 929.5, z: 135.6, y: 23, label: 'Look around inside the tower', radius: 2.6, read: 'watCamp', when: (g) => at(g, LAMP2) === 'look' },
    { id: 'towerBook', x: 928.2, z: 133.2, y: 23, label: 'Look at the bundle in the wall', radius: 2.2, read: 'towerBook', when: (g) => !at(g, TOLLS) },
    { id: 'crPost1', x: 806.5, z: 421.5, label: 'Pick up the letter', radius: 2.2, when: (g) => at(g, POST) === 'letters' && !g.flag('crPost1'), use: letter('crPost1') },
    { id: 'crPost2', x: 790.5, z: 455.5, label: 'Pick up the letter', radius: 2.2, when: (g) => at(g, POST) === 'letters' && !g.flag('crPost2'), use: letter('crPost2') },
    { id: 'crPost3', x: 765.5, z: 480.5, label: 'Pick up the letter', radius: 2.2, when: (g) => at(g, POST) === 'letters' && !g.flag('crPost3'), use: letter('crPost3') },
    { id: 'crPost4', x: 746.5, z: 497.5, label: 'Pick up the letter', radius: 2.2, when: (g) => at(g, POST) === 'letters' && !g.flag('crPost4'), use: letter('crPost4') },
  ],
  spawns: [
    { tag: 'postWolves', type: 'roadwolf', at: [[793, 492], [787, 486]], when: (g) => at(g, POST) === 'letters' },
    { tag: 'barley', type: 'boar', at: [[980, 263], [986, 265], [974, 264]], when: (g) => at(g, BARLEY) === 'kill' },
    { tag: 'sow', type: 'boar', at: [[992, 270]], when: (g) => at(g, BARLEY) === 'sow' },
  ],
  quests: {
    [LAMP1]: {
      id: LAMP1, name: 'Unlit', region: 'crownroad', depth: 'storyline', next: [LAMP2, 'look'],
      notes: (g, s) => {
        if (s === 'round') return 'Aud Merrow keeps the lamps at three shrines on the old drove road, and buys the oil herself since the Charter stopped paying. Her knees won\'t take her north. She gave me three pints.';
        if (s === 'aud') return g.flag('crLampDowns') ? 'All three lamps are lit. The Downs lamp had been levered open and scraped dry, and boot prints led north-east.' : 'All three lamps are lit.';
        return 'Someone has been draining the Downs lamp: three times since harvest, Aud says. Boot prints led north-east from the shrine.';
      },
      objectives: (g, s) => (s === 'round'
        ? LAMPS.map(([f, name]) => ({ text: `Light the lamp at ${name}`, marker: f, done: !!g.flag(f) }))
        : s === 'aud' ? [{ text: 'Go back to Aud Merrow at the Waystation', marker: 'aud' }] : []),
      advance: (g, s) => (s === 'round' && lit(g) === 3 ? 'aud' : null),
      marks: (_g, s): Marks => (!s ? { aud: '!' } : s === 'aud' ? { aud: '?' } : {}),
    },
    [LAMP2]: {
      id: LAMP2, name: 'The Toll Tower', region: 'crownroad', depth: 'storyline',
      notes: (g, s) => {
        if (s === 'look') return 'The boot prints from the Downs shrine lead north-east. There\'s a ruined tower that way.';
        if (s === 'wat') return 'Someone is living in the ruined tower, burning shrine oil in a tin lamp. There\'s a Charter coat on the wall with the old brass buttons.';
        if (s === 'aud') return 'Wat Hollis kept the tower when it took tolls. His pension stopped the same winter as Aud\'s oil money. He wants her to know it was him.';
        if (s === 'strake') return 'Aud wants Strake told about Wat Hollis. Theft from a Charter lamp is a Charter matter.';
        const c = g.flag('lampChoice');
        if (c === 'strake') return 'Wat Hollis is in the cell by the gatehouse stove until the spring sessions. Strake says it\'s warmer than a tower. Aud\'s lamps are hers again.';
        if (c === 'round') return 'Wat Hollis keeps the north lamps for Aud now: a pint a lamp, measured.';
        return 'I told Aud I didn\'t know who it was. The Downs lamp stays dark.';
      },
      objectives: (_g, s) => {
        if (s === 'look') return [{ text: 'Follow the boot prints north-east from the Downs shrine', marker: 'watCamp' }];
        if (s === 'wat') return [{ text: 'Talk to whoever lives in the tower', marker: 'wat' }];
        if (s === 'aud') return [{ text: 'Go back to Aud Merrow', marker: 'aud' }];
        if (s === 'strake') return [{ text: 'Tell Corporal Strake at the south gate', marker: 'strake' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'wat' ? { wat: '?' } : s === 'aud' ? { aud: '?' } : s === 'strake' ? { strake: '?' } : {}),
      walk: { cast: ['strake'], from: { quests: { crLamp1: 'done', crLamp2: 'look' }, flags: { crLampDowns: true } } },
    },
    [TOLLS]: {
      id: TOLLS, name: 'The Last Page', region: 'crownroad', depth: 'short',
      notes: (_g, s) => (s === 'hob'
        ? 'The old toll tower\'s last entry, forty years ago: "Tannet, Cotter\'s End. Barley, 3 sacks. Toll paid in full." Hob Tannet carts out of Cotter\'s End.'
        : 'The last toll the tower took was Hob Tannet\'s father\'s: three sacks of barley, paid in full. Hob kept the book.'),
      objectives: (_g, s) => (s === 'hob' ? [{ text: 'Show Hob Tannet the toll book', marker: 'hob' }] : []),
      marks: (_g, s): Marks => (s === 'hob' ? { hob: '?' } : {}),
      walk: { cast: ['hob'] },
    },
    [POST]: {
      id: POST, name: 'Dropped Post', region: 'crownroad', depth: 'quest',
      notes: (_g, s) => {
        if (s === 'letters') return 'Wolves spooked Bess Tull\'s horse on the south road below Ansbury, and her mailbag split on the tailboard. Six letters, scattered towards the Waystation. Hetty Brannock sorts the Post there.';
        if (s === 'hetty') return 'I\'ve found four of Bess\'s letters. Hetty Brannock sorts the Post at the Waystation.';
        if (s === 'strake') return 'Hetty sorted the letters. Two are in a wolf. One is for Corporal Strake at the south gate, sent for the third time.';
        return 'Strake\'s letter was from her sister: a boy, eleven pounds. Strake wants to know on whose scale.';
      },
      objectives: (g, s) => {
        if (s === 'letters') return [{ text: `Find Bess's letters on the south road (${Math.min(4, g.count('post_letter'))}/4)`, marker: LETTERS.find((f) => !g.flag(f)) ?? 'hetty', done: g.count('post_letter') >= 4 }];
        if (s === 'hetty') return [{ text: 'Take the letters to Hetty Brannock at the Waystation', marker: 'hetty' }];
        if (s === 'strake') return [{ text: 'Take the letter to Corporal Strake', marker: 'strake' }];
        return [];
      },
      advance: (g, s) => (s === 'letters' && g.count('post_letter') >= 4 ? 'hetty' : null),
      marks: (_g, s): Marks => (!s ? { bess: '!' } : s === 'hetty' ? { hetty: '?' } : s === 'strake' ? { strake: '?' } : {}),
      walk: { cast: ['bess', 'strake'] },
    },
    [BARLEY]: {
      id: BARLEY, name: 'The Askew Barley', region: 'crownroad', depth: 'quest',
      notes: (g, s) => {
        if (s === 'kill') return 'Three boars come up from the beck at dusk into Pru Askew\'s barley, east of Ansbury. She\'ll pay what the barley would have fetched.';
        if (s === 'pru') return 'The three boars are dead. Pru Askew will want to know.';
        if (s === 'sow') return 'There\'s a sow farrowed in the hedge by the beck with eight young. Pru will kill her, and the litter will die.';
        if (s === 'pru2') return 'The sow is dead.';
        if (s === 'fence') return 'Pru will fence the bottom field instead of killing the sow. She needs six oak logs for rails.';
        return g.flag('sowChoice') === 'fenced'
          ? 'Pru Askew fenced the bottom field. The sow raises her eight by the beck, on the other side of the rails.'
          : 'The boars and the sow are dead, and Pru Askew\'s barley is standing.';
      },
      objectives: (g, s) => {
        if (s === 'kill') return [{ text: `Kill the boars in the bottom field (${Math.min(3, kills(g, 'barley'))}/3)` }];
        if (s === 'pru' || s === 'pru2') return [{ text: 'Talk to Pru Askew', marker: 'pru' }];
        if (s === 'sow') return [{ text: 'Kill the sow in the hedge by the beck' }];
        if (s === 'fence') return [{ text: `Bring Pru Askew oak logs (${Math.min(6, g.count('oak_logs'))}/6)`, marker: 'pru', done: g.count('oak_logs') >= 6 }];
        return [];
      },
      advance: (g, s) => (s === 'kill' && kills(g, 'barley') >= 3 ? 'pru' : s === 'sow' && kills(g, 'sow') >= 1 ? 'pru2' : null),
      marks: (g, s): Marks => (!s ? { pru: '!' } : s === 'pru' || s === 'pru2' || (s === 'fence' && g.count('oak_logs') >= 6) ? { pru: '?' } : {}),
      walk: { obtain: { fence: [['oak_logs', 6]] } },
    },
  },
  hooks: (D) => {
    // ---- Strake: Wat Hollis, and her letter
    hook(D, 'strake', (g) => {
      if (at(g, LAMP2) === 'strake') return 'crLs1';
      if (at(g, POST) === 'strake') return 'crL1';
      return undefined;
    }, {
      crLs1: { text: 'Theft from a Charter lamp. That makes it a Charter matter, and the Charter is me, at this end of the road.', next: 'crLs2' },
      crLs2: { text: 'I\'ll send Ferris with a cart. Hollis can have the cell by the gatehouse stove until the spring sessions. It\'s warmer than a tower.', next: 'crLs3' },
      crLs3: {
        text: 'Tell Aud Merrow the lamps are hers again. Tell her I said so, so she stops worrying it isn\'t official.',
        effect: (g) => { g.setFlag('lampChoice', 'strake'); g.addMarks(15); g.setStage(LAMP2, 'done'); },
      },
      crL1: { text: 'Post? For me?', options: [{ text: 'Give her the letter.', next: 'crL2' }] },
      crL2: { speaker: 'narrator', text: 'She reads it at the gate with a cart waiting. Nobody in the queue says a word about the wait.', next: 'crL3' },
      crL3: { text: 'My sister\'s had a boy. Eleven pounds.', next: 'crL4' },
      crL4: {
        text: 'On whose scale, I\'d like to know.',
        effect: (g) => { g.take('strake_letter'); g.addMarks(12); g.setStage(POST, 'done'); },
      },
    });

    // ---- Hob: the last page
    hook(D, 'hob', (g) => (at(g, TOLLS) === 'hob' ? 'crH1' : undefined), {
      crH1: { text: 'What\'s that? A toll book?', options: [{ text: 'Show him the last page.', next: 'crH2' }] },
      crH2: { speaker: 'narrator', text: 'He reads with his finger, the way carters do, and stops at his own name.', next: 'crH3' },
      crH3: { text: 'Tannet. That\'s my dad. Three sacks. He brought three and they wrote three.', next: 'crH4' },
      crH4: {
        text: 'Can I keep it? Here. It\'s worth more than that. I haven\'t got more than that.',
        effect: (g) => { g.take('tower_book'); g.addMarks(6); g.setStage(TOLLS, 'done'); },
      },
    });

    // ---- Bess: the dropped post
    hook(D, 'bess', (g) => (at(g, POST) === 'done' && !g.flag('crPostTold') ? 'crB9' : undefined), {
      crB1: { text: 'A bag. Me. Eleven years on the Post, and I\'ve never lost a bag.', next: 'crB2' },
      crB2: { text: 'Wolves came out of the bracken below Ansbury and the grey bolted. The bag split on the tailboard.', next: 'crB3' },
      crB3: {
        text: 'Six letters, all down the south road towards the Waystation. Hetty Brannock sorts for the Waystation. Take her what you find.',
        effect: (g) => g.setStage(POST, 'letters'),
      },
      crB9: {
        text: 'Hetty says you found four. Four\'s good. Four\'s very good. Don\'t tell anyone it was six.',
        effect: (g) => g.setFlag('crPostTold'),
      },
    });
    addOption(D, 'bess', 'main', { text: 'You look like you\'ve lost something.', next: 'crB1', cond: (g) => !at(g, POST) });
  },
};
