import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import type { ItemDef } from '../items';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// Fisherman Dave (owner 2026-11-05): Dave Kitto of Gullmouth, his love Becky White, and the Reckoner.
//
// Three winters ago, in a February fog, the Reckoner came up the cliff at Gullmouth Light to collect Dave:
// the sea keeps a tally, and he was owed. Becky White, who was to marry him at Lammas, had gone up to the
// headland with a storm lamp so he'd have something to steer by. She met it there and went in his place.
// It keeps what it's paid where it was paid: some nights you can see her lamp from the quay, past the
// Light, where nobody could stand. Dave has rowed out to it every time, and it's always gone.
//
//   I.   The Man on the Quay (dkQuay): Dave on his fish box; Becky's ghost at the cliff's edge after dark;
//        what she says; he joins you.
//   II.  What the Sea Is Owed (dkOwed): Nan Prowse, who lays out the drowned, and the old rule: what the
//        Reckoner takes in trade, the one it was traded for may take back, one pair of hands, his own, and
//        he mustn't fall. Becky's lamp, three winters in a gorse root at the cliff's lip.
//   III. Teach Me (dkTeach): Dave has never hit anyone. You teach him to stand, to move and to wait; the
//        crabs north of the jetties; then Kezia Mabe, who wrestled at the Gullmouth fair for twenty-two years.
//   IV.  The Reckoner (dkReckoner): the Light, after dark, Dave holding her lamp. He fights it alone, you
//        shouting from outside the ring (game/Reckoning.ts). He wins. Becky stands in the grass, alive and cold.
//   V.   Becky White (dkBecky): the quay the morning after; Lammas, three years late; her lamp, relit, for you.
//
// Dave himself, as a companion (data/companions.ts, his conversations in content/companions.ts).

const QUAY = 'dkQuay', OWED = 'dkOwed', TEACH = 'dkTeach', RECK = 'dkReckoner', BECKY = 'dkBecky';
/** Gullmouth Light (world/sites.ts light-gullmouth) and the ring on its headland (game/Reckoning.ts RECKONER_RING). */
const RING: [number, number] = [1799.5, 703.5];
const LIP: [number, number] = [1809.5, 703.5];
const LAMP_AT: [number, number] = [1808.5, 708.5];
const CRABS: [number, number][] = [[1808, 542], [1812, 548], [1806, 552], [1814, 556], [1810, 538]];

const night = (g: GameApi) => { const h = g.compHour(); return h >= 20 || h < 5; };
const freed = (g: GameApi) => { const s = g.stage(RECK); return s === 'free' || s === 'done'; };

const items: ItemDef[] = [
  { id: 'becky_lamp_cold', name: 'Becky\'s storm lamp', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'lantern', a: '#8a8a7a', b: '#2a2a2e' },
    desc: 'A brass storm lamp, green at the seams, from a gorse root at the cliff\'s lip below Gullmouth Light. The glass isn\'t cracked. There\'s still oil in it.', stats: 'Dave Kitto will need it at the Light' },
  { id: 'becky_lantern', name: 'Becky\'s lamp', kind: 'tool', rarity: 'epic', stack: false, value: 0, icon: { shape: 'lantern', a: '#ffe0a0', b: '#c8a050' },
    desc: 'The storm lamp Becky White held on the headland for three winters, relit. It burns steady in any wind. She gave it to you to keep you coming home.', stats: 'After dark (and underground) it hangs lit at your belt, the way a belt lantern does. L puts it out or lights it.' },
];

const npcs: NpcDef[] = [
  {
    id: 'nan_prowse', name: 'Nan Prowse', title: 'Lays out the drowned',
    look: { frame: 'f', skin: '#d8b090', hair: '#e8e4dc', hairStyle: 5, eyes: '#3a3a3a', tunic: '#1e1e22', trim: '#3a3a40', shirt: '#e8e0d0', trousers: '#1e1e22', boots: '#141416', hat: 'coif', hatColor: '#1e1e22', build: 0.8, height: 0.9, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [1742.5, 618.5], face: [1746.5, 618.5], anim: 'idle' }],
    barks: ['Mind the step. Everyone minds the step eventually.', 'The tide\'s on the turn. You can hear it if you\'re quiet.', 'I\'ve laid out half this quay\'s grandfathers. I\'ll lay out the rest.'],
  },
  {
    id: 'becky_ghost', name: 'Becky White', title: 'On the headland',
    look: { frame: 'f', skin: '#dce8ee', hair: '#1a1c22', hairStyle: 4, eyes: '#bfe8ff', tunic: '#b8c8d0', trim: '#8aa0ac', shirt: '#dce8ee', trousers: '#9ab0bc', boots: '#6a7a84', cape: '#c8d8e0', hat: 'none', build: 0.9, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: LIP, face: [LIP[0] + 4, LIP[1]], anim: 'idle' }],
    barks: ['Go home. It\'s no night for the cliff.', 'Keep it lit. Keep it lit.'],
    // (only after dark, and only until she's free)
    when: (g) => night(g) && !freed(g),
  },
  {
    id: 'becky_free', name: 'Becky White', title: 'Cold, and alive',
    look: { frame: 'f', skin: '#e0b898', hair: '#1a1c22', hairStyle: 4, eyes: '#4a6a5a', tunic: '#5a6a72', trim: '#3a4a52', shirt: '#e8e0d0', trousers: '#3a3a40', boots: '#2a2420', hat: 'none', build: 0.9, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [RING[0] + 1.5, RING[1] + 2], face: [RING[0], RING[1]], anim: 'idle' }],
    barks: ['I\'m cold. I\'m cold. Isn\'t it wonderful?'],
    when: (g) => g.stage(RECK) === 'free',
  },
  {
    id: 'becky_white', name: 'Becky White', title: 'Net-mender, Gullmouth',
    look: { frame: 'f', skin: '#e0b898', hair: '#1a1c22', hairStyle: 4, eyes: '#4a6a5a', tunic: '#2a3a5a', trim: '#2a3a5a', shirt: '#2a3a5a', trousers: '#3a3a40', boots: '#2a2420', top: 3, hat: 'kerchief', hatColor: '#c8a050', build: 0.9, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [1784.5, 609.5], face: [1788.5, 609.5], anim: 'idle' }],
    barks: ['Sit down if you\'re stopping. Standing makes the gulls nervous.', 'Fish pie Friday. You\'re invited. You\'re always invited.', 'He\'s a good man. Don\'t tell him I said so; he\'ll get a big head.'],
    when: (g) => g.stage(RECK) === 'done',
  },
  {
    id: 'kezia_mabe', name: 'Kezia Mabe', title: 'Wrestled at the Gullmouth fair',
    look: { frame: 'f', skin: '#c8906a', hair: '#8a8a84', hairStyle: 5, eyes: '#4a3a2a', tunic: '#7a2a22', trim: '#c8a050', shirt: '#e8dcc0', trousers: '#3a3028', boots: '#2a2018', hat: 'kerchief', hatColor: '#7a2a22', build: 1.35, height: 0.98, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [1764.5, 637.5], face: [1768.5, 641.5], anim: 'idle' }],
    barks: ['Twenty-two years at the fair and not once on my back.', 'You\'ve got soft hands. Shame.', 'Who\'s next? Nobody. Nobody\'s ever next.'],
  },
];

// ==================================================================== Becky, on the headland
const ghost: DialogueTree = {
  start: (g) => {
    const q = at(g, QUAY);
    if (!q) return 'stranger';
    if (q === 'light') return 'meet';
    if (q === 'tell') return 'toldYou';
    if (at(g, RECK) === 'night' || at(g, RECK) === 'duel') return 'tonight';
    if (at(g, TEACH)) return 'teaching';
    return 'coming';
  },
  nodes: {
    stranger: {
      speaker: 'narrator',
      text: 'At the cliff\'s edge, with nothing between her and the sea but air, a young woman holds up a storm lamp. She is wet through. The wind comes off the water hard enough to lean on, and her hair doesn\'t move.',
      next: 'stranger2',
    },
    stranger2: { text: 'Go home. It\'s no night to be up here. It\'s never a night to be up here.' },
    meet: {
      speaker: 'narrator',
      text: 'At the cliff\'s edge, with nothing between her and the sea but air, a young woman holds up a storm lamp. She is wet through. The wind comes off the water hard enough to lean on, and her hair doesn\'t move. Her lamp throws no shadow.',
      next: 'meet2',
    },
    meet2: {
      text: 'You\'re not him. Good. He mustn\'t come up here, not ever. Has he sent you?',
      options: [
        { text: 'Dave sent me. He watches your lamp every night.', next: 'watches' },
        { text: 'Who are you?', next: 'who' },
      ],
    },
    who: { text: 'Becky White. I was, anyway. Now I\'m the lamp at the end of the headland. Did Dave send you?', next: 'watches' },
    watches: { text: 'Every night. Course he does, the great lump. I can see him from here, on his fish box, with a net across his knees he\'s not mending.', next: 'chose' },
    chose: {
      text: 'The night of the fog, something came up the cliff for him. Tall, in a wet sail, with a hook. It said it was owed a Kitto. I said it could have a White instead, and cheaper. It took me. Dave came in round the stacks on my lamp and never knew.',
      options: [
        { text: 'You gave yourself for him.', next: 'gave' },
        { text: 'What is it?', next: 'what' },
      ],
    },
    what: { text: 'I don\'t know. Something old that keeps count. It\'s out there now, in the fog past the stacks. It doesn\'t sleep. It doesn\'t need to.', next: 'gave' },
    gave: { text: 'I\'d do it again. Don\'t look at me like that. You\'d have done the same, if it was yours stood on that boat.', next: 'tell' },
    tell: {
      text: 'Tell him I chose it. Tell him to stop rowing out. Tell him to marry someone kind and let the lamp go. Tell him I\'m not cold. That\'s a lie. Tell him anyway.',
      options: [{ text: 'I\'ll tell him.', effect: (g) => g.setStage(QUAY, 'tell') }],
    },
    toldYou: { text: 'You\'ve not told him yet. I can see him from here. He\'s still on his box.' },
    coming: { text: 'He\'s coming, isn\'t he. I can see it in you. Don\'t let him. It doesn\'t fight fair. It doesn\'t have to.' },
    teaching: { text: 'You\'re teaching him. I watch you on the quay. He stands better. Tell him to keep his left hand up. He never does.' },
    tonight: { text: 'Tonight? Then I\'ll hold the lamp high. He always came in on it. He\'ll come in on it now.' },
  },
};

// ==================================================================== Nan Prowse
const nan: DialogueTree = {
  start: (g) => {
    const o = at(g, OWED);
    if (o === 'nan') return 'meet';
    if (o === 'lantern') return 'lampWait';
    if (o === 'nan2') return 'lamp';
    if (freed(g)) return 'after';
    if (o === 'done') return 'during';
    return 'idle';
  },
  nodes: {
    idle: { text: 'If you\'re not dead and you\'re not drowned, I\'ve nothing for you. Come back when one of those changes. That\'s a joke. Mostly.' },
    meet: {
      speaker: 'narrator',
      text: 'A small, upright woman in black sits in her doorway, scraping a mussel shell clean with her thumbnail. She looks at Dave, and then at you, and sets the shell down on the step.',
      next: 'meet2',
    },
    meet2: { text: 'Dave Kitto. I wondered when you\'d come. Three winters is longer than most take.', next: 'meet3' },
    meet3: { as: 'dave', text: 'You knew? You knew, and you never came and told me?', next: 'meet4' },
    meet4: {
      text: 'Knew what? That you\'d been rowing at a lamp? The whole quay knew that. I know other things. You never asked me those.',
      options: [{ text: 'Tell us about the thing that took Becky.', next: 'reckoner' }],
    },
    reckoner: {
      text: 'The old men called it the Reckoner. The sea keeps a tally. Every so often somebody\'s owed: a man who should have drowned and didn\'t, a boat that came home on luck it hadn\'t earned. When the fog\'s thick enough, the Reckoner comes up the cliff to collect. It doesn\'t much care who, so long as the tally comes right.',
      next: 'reckoner2',
    },
    reckoner2: {
      text: 'That February, Dave, it was you that was owed. Becky met it on the headland and settled your account. And it keeps what it\'s paid where it was paid, doing what they were doing. That\'s why the lamp.',
      next: 'reckoner3',
    },
    reckoner3: { as: 'dave', text: 'Then how do I get her back?', next: 'rule' },
    rule: {
      text: 'The way you\'d get anything back off a man who\'d had it off you fair: you take it. My grandmother told me the rule, and I\'ll tell it you the way she did. "What the Reckoner takes in trade, the one it was traded for may take back. One pair of hands, his own, and he mustn\'t fall."',
      next: 'rule2',
    },
    rule2: {
      text: 'His own. Nobody else can lift a finger. Not your friend here, not the whole quay with boathooks. It\'d only count them too.',
      options: [
        { text: 'What does he need?', next: 'need' },
        { text: 'There must be another way.', next: 'another' },
      ],
    },
    another: { text: 'There\'s always another way. You can let her stand out there till the Light falls into the sea. That\'s the other way. Ask him which he\'d like.', next: 'another2' },
    another2: { as: 'dave', text: 'I\'d like the first one.', next: 'need' },
    need: {
      text: 'Something of hers that was with her when she went. It comes for what it\'s owed, and it\'ll come for that, if Dave holds it at the Light after dark. Her lamp was never found. They searched the rocks for a week. They looked down. Nobody looked up. Go and look up.',
      options: [{ text: 'We\'ll find the lamp.', effect: (g) => g.setStage(OWED, 'lantern') }],
    },
    lampWait: { text: 'Up, I said. Not down. A lamp blown out of a hand in a gale doesn\'t go down. It goes up, and it catches.' },
    lamp: {
      speaker: 'narrator',
      text: 'Nan takes the lamp in both hands and turns it to the light. The glass is whole. Oil moves in the bottom of it.',
      next: 'lamp2',
    },
    lamp2: { text: 'Three winters in a gorse root and the glass not cracked. She meant it to be found. Keep it. He\'ll need it on the night.', next: 'hit' },
    hit: { text: 'Now. Dave. Look at me, not your boots. Have you ever hit anybody?', next: 'hit2' },
    hit2: { as: 'dave', text: 'No.', next: 'hit3' },
    hit3: { text: 'Not once? Not in drink? Not at the fair, when Sammy Hosken called your mother a herring?', next: 'hit4' },
    hit4: { as: 'dave', text: 'I\'ve never needed to.', next: 'hit5' },
    hit5: {
      text: 'You\'ll need to now. It won\'t stand there and let you take her back. It\'ll fight you for her. If you fall, it\'ll have you as well, and that\'ll be the two of you out on the water with your lamps, and me too old to row out and tell you off.',
      options: [
        { text: 'Then I\'ll teach him.', next: 'teach' },
        { text: 'Dave, you don\'t have to do this.', next: 'dont' },
      ],
    },
    dont: { as: 'dave', text: 'I know I don\'t. I\'ve not had to do anything for three years. That\'s the trouble. Teach me. Please.', next: 'teach' },
    teach: {
      text: 'Will you, now. Good. Teach him to stand, and teach him to wait. Big men always forget to wait. And when you think he\'s ready, put him in front of Kezia Mabe. She\'s up on the fair green most days, looking for somebody to throw. If she can\'t put him down, it might not either.',
      effect: (g) => { g.addMarks(150); g.compRapport('dave', 4); g.setStage(OWED, 'done'); },
    },
    during: { text: 'Stand and wait. Stand and wait. I\'ll have it carved on his door if I have to.' },
    after: { text: 'I\'ve been to see her. Pink as a prawn and complaining about the cold. I\'ve laid out a hundred people off this quay and never once seen one sit up. I didn\'t care for it. Don\'t tell her that.' },
  },
};

// ==================================================================== Kezia Mabe
const kezia: DialogueTree = {
  start: (g) => {
    const t = at(g, TEACH);
    if (t === 'kezia') return 'ask';
    if (t === 'bout') return g.boutActive() ? 'busy' : 'again';
    if (t === 'ready' || t === 'done') return 'after';
    return 'idle';
  },
  nodes: {
    idle: { text: 'Twenty-two years I wrestled at the Gullmouth fair. You\'ve not got the shoulders. Come back with shoulders.' },
    ask: {
      text: 'Dave Kitto wants to fight me? Dave Kitto, who carried my fish boxes up the slip all last winter for nothing when my back was bad? He couldn\'t fight a wet sack.',
      options: [{ text: 'He needs to learn. Somebody he can\'t hurt by accident.', next: 'ask2' }],
    },
    ask2: { text: 'He couldn\'t hurt me on purpose. What\'s this for? No. Don\'t tell me. I can see it on him. It\'s Becky.', next: 'ask3' },
    ask3: {
      text: 'For you, no. For him, go on, then. Here on the green, where I wrestled at the fair, first to give in. And you, whoever you are: you stand outside and keep your hands to yourself. Shout if you like. Shouting I don\'t mind.',
      options: [{ text: '(Stand back and let them start)', effect: (g) => { g.setStage(TEACH, 'bout'); g.bout('kezia'); } }],
    },
    busy: { text: 'Not now! Can\'t you see I\'m busy?' },
    again: {
      text: 'You wandered off. We\'d hardly started. Again?',
      options: [{ text: '(Stand back and let them start)', effect: (g) => g.bout('kezia') }, { text: 'Later.' }],
    },
    after: { text: 'He\'ll do. Tell him I said so. Don\'t tell him I said it nicely.' },
  },
};

// ==================================================================== Becky, free
const free: DialogueTree = {
  start: () => 'free',
  nodes: {
    free: {
      speaker: 'narrator',
      text: 'Becky White stands in the wet grass at the foot of the Light, and her lamp has gone out. She is shaking. Her breath smokes. Dave has hold of her so tight she can barely stand, and she is laughing, or crying, or both.',
      next: 'free2',
    },
    free2: { text: 'I\'m cold. I\'m cold, Dave. I\'m COLD.', next: 'free3' },
    free3: { as: 'dave', text: 'I know you are. I know.', next: 'free4' },
    free4: { text: 'You. You were on the green with him, with Kezia. You were shouting at him on the cliff till he got up. I heard you over the wind.', next: 'free5' },
    free5: {
      text: 'I don\'t know what to say to you. Nobody\'s ever told me what you say to somebody for this.',
      options: [
        { text: 'You don\'t need to say anything.', next: 'free6' },
        { text: 'He did it, not me. One pair of hands.', next: 'hands' },
        { text: 'Get warm, both of you. Go home.', next: 'free6' },
      ],
    },
    hands: { text: 'His hands. Your voice. I\'ll not argue on a cliff in my wet things. I\'ll argue tomorrow, when I can feel my feet.', next: 'free6' },
    free6: {
      as: 'dave',
      text: 'We\'re going home. Come down to the quay tomorrow. Becky\'ll want to thank you properly, when she can feel her hands.',
      effect: (g) => { g.addMarks(400); g.compRapport('dave', 12); g.storyTheme('wonder', 180); g.setStage(RECK, 'done'); },
    },
  },
};

// ==================================================================== Becky, at home
const becky: DialogueTree = {
  start: (g) => (at(g, BECKY) === 'home' ? 'home' : 'after'),
  nodes: {
    home: {
      speaker: 'narrator',
      text: 'Becky is on the quay in Dave\'s spare gansey, the sleeves turned back four times, mending a net with her feet in a bucket of warm water. She sees you, and puts the net down.',
      next: 'home2',
    },
    home2: { text: 'There you are. Sit. No, sit down. I\'ve been stood up for three years; you can sit for a minute.', next: 'home3' },
    home3: {
      text: 'I don\'t remember much. The cold. The lamp getting heavy. And Dave on his box every night, like a light the wrong way round. I kept mine lit for him. I think he kept me lit as well.',
      options: [
        { text: 'What was it like, out there?', next: 'like' },
        { text: 'How is he?', next: 'how' },
      ],
    },
    like: { text: 'Like waiting for a boat that\'s already in. You know it\'s in. You can see it tied up. You still can\'t stop looking at the water. I\'ll not talk about it more than that. Not for a while.', next: 'lammas' },
    how: { text: 'Asleep, finally. He didn\'t sleep last night, or the one before, or for three years by the look of him. When he wakes up he\'ll pretend he wasn\'t asleep. Let him.', next: 'lammas' },
    lammas: {
      text: 'We\'re getting married at Lammas. Three years late. Nan says it\'s bad luck to wait that long. Nan says everything\'s bad luck. You\'ll come. You\'ll stand with Dave; he\'ll not manage it on his own.',
      options: [
        { text: 'I\'ll be there.', next: 'lamp' },
        { text: 'Try and stop me.', next: 'lamp' },
      ],
    },
    lamp: {
      speaker: 'narrator',
      text: 'She takes the storm lamp from beside the bucket, the one from the headland, and strikes a light in it. The flame catches, and holds, and doesn\'t move in the wind off the harbour.',
      next: 'lamp2',
    },
    lamp2: {
      text: 'This kept him coming home. I want it to keep you coming home. Take it. I\'ll not be needing it. I\'m done standing on cliffs.',
      options: [{
        text: '(Take the lamp) Thank you, Becky.',
        effect: (g) => { g.take('becky_lamp_cold'); g.give('becky_lantern'); g.addMarks(300); g.compRapport('dave', 6); g.setStage(BECKY, 'done'); },
        next: 'bye',
      }],
    },
    bye: { text: 'Now go on. Take him with you if he wants to go. He\'s been itching since breakfast. Only bring him back. I\'ve done my share of waiting.' },
    after: { text: 'He\'s out with you again, isn\'t he. Good. Bring him back by Friday. It\'s fish pie.' },
  },
};

const quests: Record<string, QuestDef> = {
  [QUAY]: {
    id: QUAY, name: 'The Man on the Quay', region: 'saltwind', depth: 'storyline', next: [OWED, 'nan'],
    notes: (_g, s) => {
      if (s === 'light') return 'Dave Kitto, a fisherman on Gullmouth quay, lost Becky White three winters ago: she took a lamp up to the headland in a fog so he\'d have something to steer by, and never came down. Some nights he sees her lamp on the water past the Light. He asked me to go up to the Light after dark and look for her from the land.';
      if (s === 'tell') return 'Becky White is on the headland after dark, at the cliff\'s edge, with her lamp. Something came up the cliff for Dave that night, tall, in a wet sail, with a hook, and she went in his place. She chose it. She wants him to stop rowing out and let her go. I should tell him.';
      return 'I told Dave what Becky said. He won\'t let her go. Whatever took her took her in trade, he says, and what\'s traded can be traded back. He\'s coming with me.';
    },
    objectives: (_g, s) => (s === 'light' ? [{ text: 'Go up to Gullmouth Light after dark and look for Becky', marker: 'becky_ghost' }]
      : s === 'tell' ? [{ text: 'Tell Dave what Becky said', marker: 'comp_dave' }] : []),
    marks: (_g, s): Marks => (!s ? { comp_dave: '!' } : s === 'tell' ? { comp_dave: '?' } : {}),
    walk: { cast: ['comp_dave', 'becky_ghost'] },
  },
  [OWED]: {
    id: OWED, name: 'What the Sea Is Owed', region: 'saltwind', depth: 'storyline', next: [TEACH, 'guard'],
    notes: (_g, s) => {
      if (s === 'nan') return 'Dave thinks old Nan Prowse, who lays out the drowned, will know what took Becky, and how to get her back.';
      if (s === 'lantern') return 'Nan says it\'s the Reckoner: the sea keeps a tally, and that February Dave was owed. Becky settled his account. The old rule: "What the Reckoner takes in trade, the one it was traded for may take back. One pair of hands, his own, and he mustn\'t fall." It will come for something of hers. Her lamp was never found. They searched the rocks below the Light. Nobody looked up.';
      if (s === 'nan2') return 'Becky\'s lamp was in a gorse root at the cliff\'s lip below the Light, three winters on, the glass whole. Nan should see it.';
      return 'Dave has never hit anybody in his life. He\'ll have to fight the Reckoner alone. I said I\'d teach him. Nan says: teach him to stand, and teach him to wait. Then put him in front of Kezia Mabe.';
    },
    objectives: (_g, s) => (s === 'nan' ? [{ text: 'Talk to Nan Prowse in Gullmouth', marker: 'nan_prowse' }]
      : s === 'lantern' ? [{ text: 'Find Becky\'s lamp on the headland at Gullmouth Light (look up, not down)', marker: 'dkLamp' }]
      : s === 'nan2' ? [{ text: 'Show Nan Prowse the lamp', marker: 'nan_prowse' }] : []),
    marks: (_g, s): Marks => (s === 'nan' || s === 'nan2' ? { nan_prowse: '?' } : {}),
    walk: { cast: ['nan_prowse'], from: { quests: { [QUAY]: 'done', [OWED]: 'nan' }, flags: { 'comp:dave:joined': 1 } } },
  },
  [TEACH]: {
    id: TEACH, name: 'Teach Me', region: 'saltwind', depth: 'storyline', next: [RECK, 'night'],
    notes: (g, s) => {
      if (s === 'guard') return 'Dave wants his first lesson. Somewhere quiet, with a boathook for a staff. How to stand, when to move, when to hit back.';
      if (s === 'hunt') return `Dave has the stance, more or less. Now something that bites back: the big crabs north of Gullmouth's jetties, eating the bait out of the pots. ${Math.min(5, killed(g, 'dkCrabs'))} of five.`;
      if (s === 'kezia' || s === 'bout') return 'Dave can hold his own beside me. Now he has to hold it alone. Kezia Mabe wrestled at the Gullmouth fair for twenty-two years and was never put on her back. If she can\'t put Dave down, the Reckoner might not either. I\'m to stand outside the ring and shout.';
      if (s === 'ready') return 'Kezia put Dave down and he got up, and then he put her down. Dave should hear that he\'s ready.';
      return 'Dave is ready. As ready as anybody is.';
    },
    objectives: (g, s) => (s === 'guard' ? [{ text: 'Give Dave his first lesson', marker: 'comp_dave' }]
      : s === 'hunt' ? [{ text: `Fight the big crabs north of the jetties with Dave (${Math.min(5, killed(g, 'dkCrabs'))}/5)`, done: killed(g, 'dkCrabs') >= 5 }]
      : s === 'kezia' || s === 'bout' ? [{ text: 'Ask Kezia Mabe, up on the fair green above the harbour, to fight Dave, and shout him through it', marker: 'kezia_mabe' }]
      : s === 'ready' ? [{ text: 'Tell Dave he\'s ready', marker: 'comp_dave' }] : []),
    advance: (g, s) => (s === 'hunt' && killed(g, 'dkCrabs') >= 5 ? 'kezia' : null),
    marks: (_g, s): Marks => (s === 'guard' || s === 'ready' ? { comp_dave: '?' } : s === 'kezia' || s === 'bout' ? { kezia_mabe: '!' } : {}),
    walk: { cast: ['comp_dave', 'kezia_mabe'], kill: { hunt: [['crab', 5]] }, auto: { bout: 'ready' }, from: { quests: { [QUAY]: 'done', [OWED]: 'done', [TEACH]: 'guard' }, flags: { 'comp:dave:joined': 1 } } },
  },
  [RECK]: {
    id: RECK, name: 'The Reckoner', region: 'saltwind', depth: 'storyline', next: [BECKY, 'home'],
    notes: (_g, s) => {
      if (s === 'night' || s === 'duel') return 'Tonight, or the first night I\'m ready: Gullmouth Light, after dark, Dave with me and Becky\'s lamp in his hand. One pair of hands. His. I can\'t step in. I can shout.';
      if (s === 'free') return 'Dave fought the Reckoner on the headland, alone, and it went down into the ground like water into sand. Becky White is standing in the grass at the foot of the Light, cold and alive.';
      return 'Becky White is alive. Dave took her back from the Reckoner with his own two hands. They\'ve gone home to get warm.';
    },
    objectives: (_g, s) => (s === 'night' || s === 'duel' ? [{ text: 'Go to Gullmouth Light after dark, with Dave', marker: 'dkCall' }]
      : s === 'free' ? [{ text: 'Go to Becky', marker: 'becky_free' }] : []),
    marks: (_g, s): Marks => (s === 'free' ? { becky_free: '?' } : {}),
    walk: { cast: ['becky_free'], auto: { duel: 'free' }, from: { quests: { [QUAY]: 'done', [OWED]: 'done', [TEACH]: 'done', [RECK]: 'night' }, flags: { 'comp:dave:joined': 1 }, items: [['becky_lamp_cold', 1]] } },
  },
  [BECKY]: {
    id: BECKY, name: 'Becky White', region: 'saltwind', depth: 'storyline',
    notes: (_g, s) => (s === 'home'
      ? 'Becky wants to thank me properly, on the quay, when she can feel her hands.'
      : 'Dave and Becky are to be married at Lammas, three years late, and I\'m to stand with Dave. Becky gave me her lamp, relit. She says it kept him coming home, and now it\'s to keep me.'),
    objectives: (_g, s) => (s === 'home' ? [{ text: 'See Becky on Gullmouth quay', marker: 'becky_white' }] : []),
    marks: (_g, s): Marks => (s === 'home' ? { becky_white: '?' } : {}),
    walk: { cast: ['becky_white'], from: { quests: { [QUAY]: 'done', [OWED]: 'done', [TEACH]: 'done', [RECK]: 'done', [BECKY]: 'home' }, items: [['becky_lamp_cold', 1]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'dkCrabs', type: 'crab', at: CRABS, when: (g) => at(g, TEACH) === 'hunt' },
];

export const FISHERMAN_DAVE: RegionContent = {
  id: 'fishermanDave', items, npcs, quests, spawns,
  dialogue: { becky_ghost: ghost, nan_prowse: nan, kezia_mabe: kezia, becky_free: free, becky_white: becky },
  things: [
    {
      id: 'dkLamp', x: LAMP_AT[0], z: LAMP_AT[1], label: 'Look up into the gorse at the cliff\'s lip', radius: 3,
      when: (g: GameApi) => at(g, OWED) === 'lantern',
      use: (g: GameApi) => {
        g.give('becky_lamp_cold');
        g.setStage(OWED, 'nan2');
        g.toast('Not on the rocks. Above them, where the gorse grows out over the drop: a brass storm lamp, caught by its handle in a root, three winters\' salt on it. The glass isn\'t cracked.');
      },
    },
    {
      id: 'dkCall', x: RING[0], z: RING[1], label: 'Stand with Dave while he holds up Becky\'s lamp', radius: 5,
      when: (g: GameApi) => (at(g, RECK) === 'night' || at(g, RECK) === 'duel') && night(g) && !g.boutActive(),
      use: (g: GameApi) => {
        if (g.compActive() !== 'dave') { g.toast('Dave has to be here. Bring him with you (he waits on Gullmouth quay).'); return; }
        if (!g.has('becky_lamp_cold')) { g.toast('Becky\'s lamp. Dave needs her lamp.'); return; }
        g.setStage(RECK, 'duel');
        g.bout('reckoner');
      },
    },
  ],
};
