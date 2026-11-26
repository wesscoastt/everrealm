import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two lighter side stories in the Scarth Highlands (content order: fill the Counties first; Starfall's others are
// mostly about the dead, and the highlands have living people too), with the morality system's choices.
//
// sfStane, THE GRANDMOTHER STANE (Elin Vaughan, skip of Kelderby's rink): every Candlemas Kelderby plays the Watch at
// stanes on Coldwater Tarn, and Kelderby has lost nine years running. This winter the Grandmother, the village's best
// stone, split in the frost. The only stone that runs true on ice is the heart of a rime cairn, and there's one walking
// the ridge north of the Watch. Break it, and bring the heart down. Then Huw Gethin, the Watch's skip, offers you a
// hundred marks for it on the road. Give it to Elin ('kelderby'), sell it to Huw ('watch'), or ([Generous]) have it
// cut in two at the Watch's grinding wheel, so both rinks play with a stone of the same heart ('halves').
// sfStane = 'kelderby' | 'watch' | 'halves'.
//
// sfLamp, A LAMP AT TEN (Emlyn Hopkin, apprentice glass-grinder at Scarth Watch): every night at ten he shows a lamp
// in the Watch's top window, and Mari Lloyd shows one back from her window in Kelderby, across the whole valley. For
// three weeks hers has been dark. Go down to Kelderby: Mari's father Tomos, the deacon, found the lamp and has locked
// it up, and he reads her letters. She gives you one for Emlyn. Tomos meets you at the gate. Tell him a lie and carry it
// ('carried'), hand it to him ('father'), or ([Kind]) read it out to him there and then ('read'): it says that Emlyn's
// time is out at Lady Day, that the Watch will pay him a grinder's wage, and that he means to come down and ask.
// sfLamp = 'carried' | 'father' | 'read'.

const STANE = 'sfStane', LAMP = 'sfLamp';
const ELIN = { x: 294.5, z: 1452.5 }, HUW = { x: 606.5, z: 1706.5 };
const RIME: [number, number][] = [[603, 1646]];
const HEART = { x: 603.5, z: 1648.5 };
const EMLYN = { x: 596.5, z: 1708.5 }, MARI = { x: 312.5, z: 1468.5 }, TOMOS = { x: 309.5, z: 1471.5 };

// ================================================================ The Grandmother Stane

const elin: DialogueTree = {
  start: (g) => {
    const s = at(g, STANE);
    if (!s) return 'e1';
    if (s === 'back') return 'b1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    e1: { speaker: 'narrator', text: 'A broad woman in a knitted cap sitting on her doorstep, glaring at two halves of a great round stone on the flags in front of her.', next: 'e2' },
    e2: { text: 'Elin Vaughan. Skip of Kelderby\'s rink. That was the Grandmother. My grandmother played her, and hers before that.', next: 'e3' },
    e3: { text: 'Candlemas, we play the Watch at stanes on Coldwater Tarn. We have lost nine years running. Nine. The Watch has stargazers in it. They do sums.', next: 'e4' },
    e4: { text: 'The frost split her in the night. Without her we might as well throw turnips. The old skips used to say the only stone that runs true on ice is a rime cairn\'s heart.', next: 'e5' },
    e5: {
      text: 'There\'s one walks the ridge north of the Watch every winter. Break it, and bring me its heart, and Kelderby will owe you a drink for the rest of your life.',
      options: [{ text: 'I\'ll fetch you a heart.', effect: (g) => g.setStage(STANE, 'heart') }, { text: 'Not now.' }],
    },
    wait: { text: 'The ridge north of the Watch. You\'ll know it. It looks like a cairn until it gets up.' },
    b1: {
      text: 'Is that it? Look at it. Blue all through. It\'ll run like a hare on that ice.',
      options: [
        { text: 'It\'s yours. Beat them.', moral: { id: 'sfStane:kelderby', a: 2, tr: { generosity: 1 }, npc: { sf_elin: 25, sf_huw: -5 }, note: 'Brought Kelderby a rime cairn\'s heart for a stane.' }, effect: (g) => { g.take('sf_heart', 1); g.setFlag(STANE, 'kelderby'); g.addMarks(60); g.setStage(STANE, 'done'); }, next: 'bK' },
        { text: 'Huw Gethin offered me a hundred marks for it. I\'m giving it to you anyway. But both rinks should have one. Let me get it cut in two.', need: { trait: { generosity: [57, 100] } }, moral: { id: 'sfStane:halves', a: 6, tr: { generosity: 3, honesty: 1 }, npc: { sf_elin: 15, sf_huw: 20 }, note: 'Had a rime cairn\'s heart cut in two, so Kelderby and the Watch played Candlemas with stones of the same heart.', fame: 'gave Kelderby and the Watch a fair game on the tarn', spread: 'local' }, effect: (g) => { g.take('sf_heart', 1); g.setFlag(STANE, 'halves'); g.addMarks(70); g.setStage(STANE, 'done'); }, next: 'bH' },
      ],
    },
    bK: { text: 'Candlemas. You\'ll be there. You\'ll stand on the bank and shout. If we win, I\'ll name the stone after you. If we lose I\'ll name it after Huw.' },
    bH: { text: 'Cut it? Give the Watch half of our heart? I ought to throw you in the tarn. Fine. Fine! Then when we beat them, they\'ll have nothing to blame but their sums.' },
    after: {
      text: (g) => {
        const f = g.flag(STANE);
        if (f === 'watch') return 'The Watch won. Ten years. Huw had a new stone, blue all through, and wouldn\'t say where it came from. I know where it came from. I can see it in your face.';
        if (f === 'halves') return 'Two stones the same, and we lost by an inch. An inch! First time in ten years it was a game. Both rinks drank together after. Huw cried. Don\'t tell him I told you.';
        return 'We won. We won! Kelderby\'s won at Candlemas. The stone is called after you. It\'s on my mantel. I talk to it.';
      },
    },
  },
};

const huw: DialogueTree = {
  start: (g) => (at(g, STANE) === 'back' ? 'h1' : at(g, STANE) === 'done' ? 'after' : 'h0'),
  nodes: {
    h0: { text: 'Huw Gethin. I grind the Watch\'s glass, and I skip its rink at Candlemas. We\'ve won nine years running. It\'s a matter of angles.' },
    h1: { speaker: 'narrator', text: 'A thin man with spectacles pushed up on his forehead, who sees the blue stone under your arm and goes very still, the way a cat does at a mousehole.', next: 'h2' },
    h2: { text: 'That\'s a cairn heart. That\'s for Elin Vaughan, I suppose. Kelderby\'s been throwing a split stone at us all winter.', next: 'h3' },
    h3: {
      text: 'A hundred marks. Now. In coin. Nobody in Kelderby needs to know where it went.',
      options: [
        { text: 'Done. A hundred marks.', moral: { id: 'sfStane:watch', a: -3, tr: { greed: 3, deception: 2 }, npc: { sf_elin: -25, sf_huw: 15 }, note: 'Sold the stone meant for Kelderby\'s rink to the Watch\'s skip.' }, effect: (g) => { g.take('sf_heart', 1); g.setFlag(STANE, 'watch'); g.addMarks(100); g.setStage(STANE, 'done'); }, next: 'hW' },
        { text: 'It\'s for Kelderby.', next: 'hN' },
      ],
    },
    hW: { text: 'Pleasure doing business. Ten years running. A matter of angles.' },
    hN: { text: 'Pity. Well. We\'ll still win. We\'ve got the sums. Good luck carrying that down the hill; it weighs more than it looks.' },
    after: { text: (g) => (g.flag(STANE) === 'halves' ? 'An inch. We won by an inch. Best game I ever played. I may have wept. Elin says I wept. I didn\'t.' : 'Candlemas next year. Bring your shouting.') },
  },
};

// ================================================================ A Lamp at Ten

const emlyn: DialogueTree = {
  start: (g) => {
    const s = at(g, LAMP);
    if (!s) return 'm1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    m1: { speaker: 'narrator', text: 'A young man with glass dust in his eyebrows, standing at the Watch\'s door and looking down the valley towards Kelderby as if he could see it from here.', next: 'm2' },
    m2: { text: 'Emlyn Hopkin. Apprentice to the glass. Every night at ten I show a lamp in the top window, and Mari Lloyd shows one back from hers in Kelderby.', next: 'm3' },
    m3: { text: 'You wouldn\'t think you could see one lamp across the whole valley. You can, if you\'re looking for it. We\'ve done it every night for a year.', next: 'm4' },
    m4: {
      text: 'Three weeks, hers has been dark. And I can\'t leave the glass till Lady Day. Will you go down to Kelderby and find out why?',
      options: [{ text: 'I\'ll find Mari.', effect: (g) => g.setStage(LAMP, 'mari') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, LAMP) === 'mari' ? 'Mari Lloyd. The house by the chapel, in Kelderby.' : 'Her father? Tomos Lloyd? I\'ve never even spoken to him. He looks at me in chapel as if I were a draught.') },
    after: {
      text: (g) => {
        const f = g.flag(LAMP);
        if (f === 'father') return 'No lamp. No letters. Her father wrote to my master. I\'ve stopped looking down the valley at ten. Mostly.';
        if (f === 'read') return 'He wants me to come and ask him in daylight, like an honest man. Lady Day. I\'ve been practising what to say on the telescope. It doesn\'t answer back. He will.';
        return 'Her lamp\'s lit again, from her aunt\'s window on the other side of the street. Her father hasn\'t noticed yet. He will. Till then: ten o\'clock.';
      },
    },
  },
};

const mari: DialogueTree = {
  start: (g) => (at(g, LAMP) === 'mari' ? 'r1' : 'r0'),
  nodes: {
    r0: { text: 'Mari Lloyd. If you want my father, he\'s at the chapel. He\'s always at the chapel.' },
    r1: { speaker: 'narrator', text: 'A dark-haired young woman shelling peas on the step of the house by the chapel, who stops when you say Emlyn\'s name and looks quickly over her shoulder.', next: 'r2' },
    r2: { text: 'He sent you? Oh, he would. My father found the lamp. He found the letters too. He\'s locked the one in the press, and he reads the others before I do.', next: 'r3' },
    r3: {
      text: 'Take him this. Please. It\'s the only one I\'ve managed to write without Father in the room. Don\'t let him see it.',
      options: [{ text: 'I\'ll get it to Emlyn.', effect: (g) => { g.give('sf_letter', 1); g.setStage(LAMP, 'tomos'); } }],
    },
  },
};

const tomos: DialogueTree = {
  start: (g) => (at(g, LAMP) === 'tomos' ? 't1' : 't0'),
  nodes: {
    t0: { text: 'Tomos Lloyd. Deacon. Good day to you.' },
    t1: { speaker: 'narrator', text: 'A narrow man in a black coat is standing at the gate as you leave, a hymn book under his arm and his eyes on your coat pocket.', next: 't2' },
    t2: { text: 'You\'ve been talking to my daughter. You\'ve something of hers. A letter, I\'d say, for a boy at the Watch who thinks I don\'t know what a lamp in a window means.', next: 't3' },
    t3: {
      text: 'I\'ll have it, please.',
      options: [
        { text: 'There\'s no letter. She asked me the way to Ansbury.', moral: { id: 'sfLamp:carried', a: 2, tr: { deception: 3, compassion: 1 }, npc: { sf_tomos: -10, sf_mari: 20, sf_emlyn: 20 }, note: 'Lied to Tomos Lloyd at his gate and carried his daughter\'s letter to the Watch.' }, effect: (g) => { g.take('sf_letter', 1); g.setFlag(LAMP, 'carried'); g.addMarks(55); g.setStage(LAMP, 'done'); }, next: 'tC' },
        { text: 'She\'s your daughter. Here.', moral: { id: 'sfLamp:father', a: -2, tr: { honesty: 1, compassion: -2 }, npc: { sf_tomos: 15, sf_mari: -25, sf_emlyn: -20 }, note: 'Gave Mari Lloyd\'s letter to her father at the gate.' }, effect: (g) => { g.take('sf_letter', 1); g.setFlag(LAMP, 'father'); g.addMarks(45); g.setStage(LAMP, 'done'); }, next: 'tF' },
        { text: '(Open it, and read it to him, there at the gate.)', need: { trait: { compassion: [57, 100] } }, moral: { id: 'sfLamp:read', a: 6, tr: { compassion: 3, courage: 2, honesty: 2 }, npc: { sf_tomos: 10, sf_mari: 15, sf_emlyn: 25 }, note: 'Read Mari Lloyd\'s letter aloud to her father at his gate, and he let the lamp be lit again.', fame: 'read a letter to a deacon at his gate in Kelderby', spread: 'local' }, effect: (g) => { g.take('sf_letter', 1); g.setFlag(LAMP, 'read'); g.addMarks(70); g.setStage(LAMP, 'done'); }, next: 'tR' },
      ],
    },
    tC: { text: 'Ansbury. Hm. It\'s south, and it\'s a long way, and a lie\'s a long way too. Good day.' },
    tF: { text: 'Thank you. That\'s an end of it. She\'ll thank you herself one day, when she\'s married to a man with a roof that doesn\'t have a hole in it for a telescope.' },
    tR: { speaker: 'narrator', text: 'It isn\'t a love letter, or not mostly. It says Emlyn\'s time is out at Lady Day; that the Watch will keep him on at a grinder\'s wage; that he has saved eleven marks; that he means to come down in daylight and ask her father, if she\'ll have him; and that he is frightened of her father, and is coming anyway. Tomos hears it out with his hat in his hand. When you\'ve done he says, "Tell him to come in daylight, then," and goes indoors, and that night there is a lamp in the window at ten.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [STANE]: {
    id: STANE, name: 'The Grandmother Stane', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'heart') return 'Elin Vaughan skips Kelderby\'s rink, and the frost has split the Grandmother, its best stone, before the Candlemas game against the Watch. The only stone that runs true on ice is a rime cairn\'s heart. One walks the ridge north of Scarth Watch.';
      if (s === 'take') return 'The rime cairn is broken. Its heart is lying in the snow.';
      if (s === 'back') return 'I have the rime cairn\'s heart, blue all through. Elin Vaughan is waiting in Kelderby. Huw Gethin, the Watch\'s skip, has seen it.';
      const f = g.flag(STANE);
      return f === 'watch' ? 'I sold the heart to Huw Gethin, and the Watch won again.' : f === 'halves' ? 'The heart was cut in two, and Kelderby and the Watch played with stones of the same heart.' : 'Kelderby played Candlemas with the cairn\'s heart.';
    },
    objectives: (g, s) => (s === 'heart' ? [{ text: `Break the rime cairn on the ridge north of the Watch (${Math.min(RIME.length, killed(g, 'sfRime'))}/${RIME.length})`, done: killed(g, 'sfRime') >= RIME.length }]
      : s === 'take' ? [{ text: 'Take the rime cairn\'s heart', marker: 'sfHeart' }]
      : s === 'back' ? [{ text: 'Take the heart to Elin Vaughan in Kelderby', marker: 'sf_elin' }] : []),
    advance: (g, s) => (s === 'heart' && killed(g, 'sfRime') >= RIME.length ? 'take' : null),
    marks: (_g, s): Marks => (!s ? { sf_elin: '!' } : s === 'back' ? { sf_elin: '?', sf_huw: '?' } : {}),
    walk: { cast: ['sf_elin', 'sf_huw'], kill: { heart: [['rimecairn', 1]] } },
  },
  [LAMP]: {
    id: LAMP, name: 'A Lamp at Ten', region: 'starfall', depth: 'quest',
    notes: (g, s) => {
      if (s === 'mari') return 'Emlyn Hopkin, apprentice glass-grinder at Scarth Watch, shows a lamp at ten every night, and Mari Lloyd shows one back from Kelderby. For three weeks hers has been dark. Find Mari, at the house by the chapel.';
      if (s === 'tomos') return 'Mari\'s father, Tomos Lloyd the deacon, found the lamp and reads her letters. She gave me one for Emlyn. Tomos is waiting at the gate.';
      const f = g.flag(LAMP);
      return f === 'carried' ? 'I lied to Tomos and carried the letter.' : f === 'father' ? 'I gave the letter to Mari\'s father.' : 'I read the letter out to Tomos at his gate, and he let the lamp be lit.';
    },
    objectives: (_g, s) => (s === 'mari' ? [{ text: 'Find Mari Lloyd in Kelderby', marker: 'sf_mari' }]
      : s === 'tomos' ? [{ text: 'Get past Tomos Lloyd at the gate', marker: 'sf_tomos' }] : []),
    marks: (_g, s): Marks => (!s ? { sf_emlyn: '!' } : s === 'mari' ? { sf_mari: '?' } : s === 'tomos' ? { sf_tomos: '?' } : {}),
    walk: { cast: ['sf_emlyn', 'sf_mari', 'sf_tomos'] },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'sfRime', type: 'rimecairn', at: RIME, when: (g) => at(g, STANE) === 'heart' },
];

const things: WorldThing[] = [
  { id: 'sfHeart', x: HEART.x, z: HEART.z, label: 'Take the cairn\'s heart', radius: 3, look: 'slab',
    when: (g) => at(g, STANE) === 'take',
    use: (g) => { g.give('sf_heart', 1); g.setStage(STANE, 'back'); g.toast('In the rubble of the cairn, a round stone the size of a loaf, cold enough to hurt through your gloves and blue all the way through, like ice that has decided to stay.'); } },
];

const LOOK_HILL = { skin: '#e8c4a0', eyes: '#4a5a6a', boots: '#2a1e14' };
const NPCS: NpcDef[] = [
  { id: 'sf_elin', name: 'Elin Vaughan', title: 'Skip of Kelderby\'s rink', look: { ...LOOK_HILL, frame: 'f', hair: '#6a4a2a', hairStyle: 2, tunic: '#7a3a2a', trim: '#e0d0b0', trousers: '#3a3430', hat: 'kerchief', hatColor: '#c8b890', lashes: true, build: 1.2, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [ELIN.x, ELIN.z], face: [ELIN.x, ELIN.z + 3], anim: 'idle' }], barks: ['Nine years.', 'Candlemas.'] },
  { id: 'sf_huw', name: 'Huw Gethin', title: 'Skip of the Watch\'s rink', look: { ...LOOK_HILL, hair: '#3a3a3a', hairStyle: 1, tunic: '#3a4a5a', trim: '#c8c8d0', trousers: '#2a2a32', build: 0.85, height: 1.06, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [HUW.x, HUW.z], face: [HUW.x - 3, HUW.z], anim: 'idle' }], barks: ['A matter of angles.'] },
  { id: 'sf_emlyn', name: 'Emlyn Hopkin', title: 'Apprentice to the glass, Scarth Watch', look: { ...LOOK_HILL, hair: '#8a5a3a', hairStyle: 5, tunic: '#5a5a6a', trim: '#a8a8b0', trousers: '#3a3430', apron: true, build: 0.9, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: [EMLYN.x, EMLYN.z], face: [EMLYN.x - 4, EMLYN.z - 3], anim: 'idle' }], barks: ['Ten o\'clock.'] },
  { id: 'sf_mari', name: 'Mari Lloyd', title: 'Kelderby', look: { ...LOOK_HILL, frame: 'f', hair: '#2a1e1a', hairStyle: 2, tunic: '#4a5a3a', trim: '#e0d8c0', trousers: '#3a3430', apron: true, lashes: true, build: 0.9, age: 0.2 },
    schedule: [{ from: 7, to: 21, at: [MARI.x, MARI.z], face: [MARI.x + 3, MARI.z], anim: 'crouch' }], barks: ['Don\'t let Father see.'] },
  { id: 'sf_tomos', name: 'Tomos Lloyd', title: 'Deacon, Kelderby', look: { ...LOOK_HILL, hair: '#5a5a5a', hairStyle: 4, facial: 1, tunic: '#1e1e22', trim: '#e8e8e8', trousers: '#1e1e22', hat: 'wide', hatColor: '#1a1a1a', build: 0.85, height: 1.06, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [TOMOS.x, TOMOS.z], face: [TOMOS.x, TOMOS.z + 3], anim: 'idle' }], barks: ['Good day to you.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'sf_heart', name: 'A rime cairn\'s heart', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'ore', a: '#9fe8ff', b: '#5a8aa8' }, desc: 'A round stone the size of a loaf, blue all through, and so cold it hurts through gloves. The old skips said nothing runs truer on ice.' },
  { id: 'sf_letter', name: 'Mari Lloyd\'s letter', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#8a5a3a' }, desc: 'Folded small enough to hide in a pea-pod, nearly. For Emlyn Hopkin, at the Watch.' },
];

export const STARFALL_LIGHT: RegionContent = {
  id: 'starfallLight',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { sf_elin: elin, sf_huw: huw, sf_emlyn: emlyn, sf_mari: mari, sf_tomos: tomos },
  quests,
  spawns,
  things,
};
