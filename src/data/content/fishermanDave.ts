import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import type { ItemDef } from '../items';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// Fisherman Dave (owner 2026-11-11: the full brief is docs/briefs/fisherman-dave.md, the characters' looks are
// docs/OWED.md 97w). It replaces the old Dave Kitto storyline in Gullmouth for everyone; Dave Kitto himself, renamed
// David Kitto, stays a companion for those who already had him (data/companions.ts).
//
// A ghost in Gullmouth holding something green. Ford T. Justin, who keeps the quay road, has seen her too, and sends
// you to Fisherman Dave, drunk in his net shed since Becky White died. You get him fighting again, and fishing; his
// friend Walter White, Becky's father, a rancher who was a spellcaster once, gives you four pieces of bread and
// seventeen minnows. In the copse west of town you find Becky at a ritual. She has Dave's hat. She tells him to let
// her go, and leaves it behind. Ford knows where the Magical Pilgrim Hat has lain for hundreds of years, in the ruin
// south of town. On the road back the Cursekeeper, who keeps the curses on her, is waiting, and he has her. He falls
// to you and Dave, the hat on one of you, and Becky is human again.
//
// One quest, twelve stages (the brief's), the stage names in the journal:
//   (none)      The Unknown Woman          meet ?????? in Gullmouth
//   ford        A Guardian's Concern       Ford T. Justin, at the top of the quay road
//   dave        The Fisherman              Fisherman Dave, in his net shed above the slip; he joins
//   train       Getting Back in Shape      fifteen kills with Dave beside you (anywhere)
//   trained     (Dave's done)              talk to Dave
//   fish        A Little Fishing           five fish with Dave beside you (anywhere)
//   fished      (Dave's done)              talk to Dave
//   walter      Walter's Gift              Walter White at the ranch north-west of town: 4 bread, 17 minnows
//   woods       The Ritual                 the copse west of town, with Dave
//   father      A Father's Concern         back to Walter
//   ford2       The Old Pilgrim Hat        back to Ford
//   hat         The Magical Pilgrim Hat    the ruin south of town, with Dave
//   curse       The Cursekeeper            on the road back; he falls only to someone wearing the hat
//   freed       Becky's Freedom            Becky, human
//   done

const Q = 'fdQuest';
const DAVE = 'fdave';

/** Where it all happens (checked dry land by .walker/h.ts; see the brief's section 12, existing places only). */
const BECKY_TOWN: [number, number] = [1762.5, 641.5];   // the fair green, Gullmouth (in the open, clear of the wine store)
const FORD_POST: [number, number] = [1761.5, 598.5];    // the top of the quay road, by the Charter Post (out in the road before it: he stood on its roof)
const WALTER_YARD: [number, number] = [1594.5, 521.5];  // the farm north-west of Gullmouth
const RITUAL: [number, number] = [1612.5, 700.5];       // the copse west of town, by Brock's Smokehouse
const RUIN: [number, number] = [1694.5, 792.5];         // the old ruin south of town
const CURSE_ROAD: [number, number] = [1712.5, 720.5];   // the road back, between the ruin and the Light
const BECKY_HOME: [number, number] = [1784.5, 609.5];   // Gullmouth quay, after

const stage = (g: GameApi) => at(g, Q);
const daveWith = (g: GameApi) => g.compActive() === DAVE;
const kills = (g: GameApi) => Math.max(0, Number(g.flag('comp_kills:' + DAVE) ?? 0) - Number(g.flag('fd:k0') ?? 0));
const fish = (g: GameApi) => Math.max(0, Number(g.flag('comp_fish:' + DAVE) ?? 0) - Number(g.flag('fd:f0') ?? 0));
/** Somebody in the fight is wearing the Magical Pilgrim Hat: you, or Dave. */
export const hatInFight = (g: GameApi) => g.flag('fd:hatOn') === 'dave' || g.flag('fd:hatOn') === 'player';

const items: ItemDef[] = [
  // (the old storyline's: kept so nobody's pack changes)
  { id: 'becky_lamp_cold', name: 'Becky\'s storm lamp', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'lantern', a: '#8a8a7a', b: '#2a2a2e' },
    desc: 'A brass storm lamp, green at the seams. The glass isn\'t cracked. There\'s still oil in it.' },
  { id: 'becky_lantern', name: 'Becky\'s lamp', kind: 'tool', rarity: 'epic', stack: false, value: 0, icon: { shape: 'lantern', a: '#ffe0a0', b: '#c8a050' },
    desc: 'A storm lamp, relit. It burns steady in any wind.', stats: 'After dark (and underground) it hangs lit at your belt, the way a belt lantern does. L puts it out or lights it.' },
  // the new
  { id: 'fd_cap', name: 'Fisherman Dave\'s hat', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'flatcap', a: '#5a7a2a', b: '#3a5018' },
    desc: 'A green flat cap, soft with wear, the peak broken from being tugged down over the eyes. Becky kept it with her. Dave says he can\'t survive without it.', stats: 'Fisherman Dave\'s. He\'s wearing it again.' },
  { id: 'fd_bread', name: 'Walter\'s bread', kind: 'food', rarity: 'common', stack: true, value: 2, icon: { shape: 'bread', a: '#c8904a' }, heal: 30,
    desc: 'One of four pieces of bread Walter White took out of his coat pocket as if he\'d been keeping them for exactly this.', stats: 'Restores 30 health.' },
  { id: 'pilgrim_hat', name: 'Magical Pilgrim Hat', kind: 'armor', rarity: 'legendary', stack: false, value: 0, icon: { shape: 'pilgrimhat', a: '#3a2a1e', b: '#d8b04a' },
    desc: 'A pilgrim\'s hat of dark brown felt, a brown band round the crown with a square gold buckle, a white feather, and a small silver fish-hook hung from the band. Nobody has worn it for hundreds of years. It decided it liked Dave.',
    hat: 'pilgrim', armor: { slot: 'head', defense: 2, vigor: 20 },
    stats: 'Head. Defence 2, maximum health +20. Whoever wears it can hurt the Cursekeeper. Put it on Fisherman Dave (talk to him) and he casts with it.' },
];

// (to the owner's concept art, 2026-11-11: long full curls to the waist, glasses, a corset laced over a pale chemise, a gown)
const BECKY_GHOST = { frame: 'f' as const, skin: '#d8dce8', hair: '#1a0a0e', hairStyle: 14, hairStreaks: ['#c8141e', '#e02028', '#7a0a12', '#c8141e'], eyes: '#2a2a32', browColor: '#2a1a1e', brows: 1, glasses: '#0e0e10', tunic: '#9a9aa6', trim: '#b8b8c4', shirt: '#e8e8f0', sleeves: '#e4e4ee', puff: true, bodice: '#5a5a66', underskirt: '#d8d8e2', top: 5, trousers: '#c8c8d4', boots: '#9a9aa8', lashes: true, smile: true, ghost: '#ff2a3a', age: 0.35, build: 1.18 };
const BECKY_HUMAN = { frame: 'f' as const, skin: '#e8c4a4', hair: '#6a2a9a', hairStyle: 14, hairStreaks: ['#e0206e', '#e8642a', '#3aa060', '#3a6ac8'], eyes: '#2a1a14', browColor: '#3a2416', brows: 1, glasses: '#0e0e10', tunic: '#5a2a7a', trim: '#c8902a', shirt: '#ece4d4', sleeves: '#ece4d4', puff: true, bodice: '#6a3a1e', underskirt: '#ece4d4', top: 5, trousers: '#ece4d4', boots: '#4a2a1a', shoes: 2, lashes: true, smile: true, age: 0.35, build: 1.18 };

const npcs: NpcDef[] = [
  {
    id: 'fd_becky_unknown', name: '??????', title: '',
    look: BECKY_GHOST,
    schedule: [{ from: 0, to: 24, at: BECKY_TOWN, face: [BECKY_TOWN[0] - 4, BECKY_TOWN[1]], anim: 'idle' }],
    barks: ['I finally have something to remember him by.'],
    when: (g) => !stage(g),
  },
  {
    id: 'fd_ford', name: 'Ford T. Justin', title: 'Town-Guardian, Gullmouth',
    look: { skin: '#d8a888', hair: '#3a2a1e', hairStyle: 0, facial: 3, eyes: '#3a4a5a', tunic: '#2a3a5a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2a30', boots: '#1e1a16', helm: { style: 'kettle', color: '#8a9098' },
      chestArmour: { style: 'brigandine', color: '#3a4a5a', trim: '#c8a050' }, build: 1.1, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: FORD_POST, face: [FORD_POST[0] + 4, FORD_POST[1]], anim: 'idle', held: 'sword' }],
    barks: ['The quay road\'s mine to keep. I keep it.', 'Move along. Nicely.', 'Everything in order? Good. Keep it that way.'],
  },
  {
    id: 'fd_walter', name: 'Walter White', title: 'Rancher',
    // (to the owner's concept art: curls to the shoulders, a hot-pink cowboy hat, a frayed shirt to the elbow laced open at the chest, brown trousers, tall boots)
    look: { skin: '#e2b894', hair: '#4a2a14', hairStyle: 15, eyes: '#3a2a1a', tunic: '#6e4e2c', trim: '#5a3a1e', sleeves: '#6e4e2c', shortSleeves: true, openNeck: true, top: 0, trousers: '#5a3e22', boots: '#6a4224', shoes: 1, belt: '#4a2e18', hat: 'cowboy', hatColor: '#ff2fa0', build: 1.05, age: 0.45, smile: true },
    schedule: [{ from: 0, to: 24, at: WALTER_YARD, face: [WALTER_YARD[0] + 4, WALTER_YARD[1]], anim: 'idle' }],
    barks: ['The cows know when it\'s going to rain. They don\'t tell me. I respect that.', 'Mind the sheep. They\'re cleverer than they let on.', 'Lovely day for standing in a field.'],
  },
  {
    id: 'fd_becky_ghost', name: 'Becky White', title: 'In the copse',
    look: BECKY_GHOST,
    schedule: [{ from: 0, to: 24, at: RITUAL, face: [RITUAL[0] + 2, RITUAL[1]], anim: 'cast' }],
    barks: [],
    when: (g) => stage(g) === 'woods',
  },
  {
    id: 'fd_victim', name: 'Abel Crane', title: 'Tinker',
    look: { skin: '#d8a888', hair: '#8a7a5a', hairStyle: 0, facial: 2, eyes: '#4a5a3a', tunic: '#6a5a3a', trim: '#4a3a22', trousers: '#3a3022', boots: '#2a2018', hat: 'cap', hatColor: '#4a3a22', age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [RITUAL[0] + 2, RITUAL[1]], face: [RITUAL[0], RITUAL[1]], anim: 'crouch' }],
    barks: ['Help! Help me!'],
    when: (g) => stage(g) === 'woods',
  },
  {
    id: 'fd_becky_freed', name: 'Becky White', title: 'Human again',
    look: BECKY_HUMAN,
    schedule: [{ from: 0, to: 24, at: [CURSE_ROAD[0] + 1.5, CURSE_ROAD[1] + 1], face: [CURSE_ROAD[0], CURSE_ROAD[1]], anim: 'idle' }],
    barks: ['I\'m human again!'],
    when: (g) => stage(g) === 'freed',
  },
  {
    id: 'fd_becky', name: 'Becky White', title: 'Gullmouth',
    look: BECKY_HUMAN,
    schedule: [{ from: 0, to: 24, at: BECKY_HOME, face: [BECKY_HOME[0] + 4, BECKY_HOME[1]], anim: 'idle' }],
    barks: ['It\'s still strange, feeling the sun.', 'Dave\'s fishing. Or he says he is.'],
    when: (g) => stage(g) === 'done',
  },
];

// ==================================================================== I. The Unknown Woman
const unknown: DialogueTree = {
  start: () => 'a',
  nodes: {
    a: { speaker: 'narrator', text: 'A woman stands on the green, grey-white and glowing faintly red, as if lit from inside by a coal. Her long hair is red and black and doesn\'t move in the wind. Her feet don\'t touch the grass. In her hands she holds something green, soft, folded over.', next: 'b' },
    b: { text: 'I finally have something to remember him by.', next: 'c' },
    c: { speaker: 'narrator', text: 'She looks down at the green thing in her hands.', next: 'd' },
    d: { text: 'Now I can leave this town, and leave the man I love so deeply in peace.', next: 'e' },
    e: { speaker: 'narrator', text: 'She stops. She has seen you.', next: 'f' },
    f: { text: 'Oh.', next: 'g' },
    g: { speaker: 'narrator', text: 'She looks straight at you for a long moment.', next: 'h' },
    h: { text: 'I wasn\'t expecting anyone.', next: 'i' },
    i: {
      speaker: 'narrator', text: 'She turns, and is gone: not walking, not running, just gone, and a few red motes falling where she was.',
      options: [{ text: '(Go and find someone who keeps watch in this town)', effect: (g) => g.setStage(Q, 'ford') }],
    },
  },
};

// ==================================================================== Ford T. Justin
const ford: DialogueTree = {
  start: (g) => {
    const s = stage(g);
    if (s === 'ford') return 'a';
    if (s === 'ford2') return 'h1';
    if (s === 'dave') return 'waitDave';
    if (s === 'hat') return 'waitHat';
    if (s === 'done') return 'after';
    return 'idle';
  },
  nodes: {
    idle: { text: 'Ford T. Justin. I keep the quay road. Everything in order? Good. Keep it that way.' },
    a: { text: 'Ah. Good. Perhaps you can help me make sense of something.', options: [{ text: 'What happened?', next: 'b' }] },
    b: { text: 'People have been reporting strange sightings around town. A figure moving through the streets, appearing where it shouldn\'t be.', options: [{ text: 'A ghost?', next: 'c' }] },
    c: { text: 'That\'s what some are calling it. I wouldn\'t be so quick to give it a name.', next: 'd' },
    d: { speaker: 'narrator', text: 'Ford pauses, and looks along the road toward the town.', next: 'e' },
    e: { text: 'I believe I saw something myself recently. Only for a moment, mind you. A dark figure. Moved faster than anyone ought to move. I thought I saw long hair, but I can\'t swear to it. By the time I understood what I was looking at, it was gone.', options: [{ text: 'I saw someone too.', next: 'f' }] },
    f: { text: 'You did?', options: [{ text: 'On the green. A woman, glowing red, holding something green. She said she\'d finally got something to remember him by. Then she was gone.', next: 'g' }] },
    g: { text: 'Well, that certainly sounds familiar. There\'s something about the hair. I can\'t explain it. But if what I saw and what you saw are connected.', options: [{ text: 'Who do you think it is?', next: 'g2' }] },
    g2: { text: 'I have a suspicion. Nothing more.', next: 'g3' },
    g3: { speaker: 'narrator', text: 'He lowers his voice.', next: 'g4' },
    g4: { text: 'There\'s a woman in this town whose appearance would be difficult to mistake. Especially that hair.', options: [{ text: 'Who?', next: 'g5' }] },
    g5: { text: 'Becky White. Or someone who looks an awful lot like her.', options: [{ text: 'Isn\'t she dead?', next: 'g6' }] },
    g6: { text: 'That\'s precisely why I don\'t intend to make any conclusions just yet.', next: 'g7' },
    g7: { speaker: 'narrator', text: 'Ford looks back along the quay road: his road.', next: 'g8' },
    g8: { text: 'Listen. I have a responsibility to protect this part of town. I cannot abandon my post to chase a shadow through the streets. There\'s someone you should speak to. Fisherman Dave.', options: [{ text: 'Why him?', next: 'g9' }] },
    g9: { text: 'Because if there\'s anyone who might recognise Becky, it\'s Dave. He\'s been drinking rather heavily since she died. I don\'t know what condition you\'ll find him in. But perhaps hearing that she may be out there will give him a reason to get himself together.', next: 'g10' },
    g10: {
      text: 'He\'s in his net shed above the slip, most days. Talk to him. Tell him what I\'ve told you. And, if you can, convince him to help investigate.',
      options: [{ text: 'I\'ll find him.', effect: (g) => g.setStage(Q, 'dave') }],
    },
    waitDave: { text: 'The net shed above the slip. Knock loudly. He\'ll be asleep, or he\'ll be pretending to be.' },
    // ---- IX. The Old Pilgrim Hat
    h1: { text: 'Back again? I take it you\'ve found something.', options: [{ text: 'We found Becky. She was performing a ritual in the woods.', next: 'h2' }] },
    h2: { text: 'Then the reports were true.', next: 'h3' },
    h3: { as: DAVE, text: 'She had my hat.', next: 'h4' },
    h4: { text: 'Your hat?', next: 'h5' },
    h5: { as: DAVE, text: 'Yes, my hat. It\'s a long story.', next: 'h6' },
    h6: { text: 'I see. And what did she tell you?', next: 'h7' },
    h7: { as: DAVE, text: 'That she can\'t come back. That I should move on.', next: 'h8' },
    h8: { text: 'I\'m sorry, Dave. But perhaps there is something we can do.', options: [{ text: 'What do you mean?', next: 'h9' }] },
    h9: { text: 'I remember telling a story once about a magical Pilgrim Hat. An old artifact. It hasn\'t been used for hundreds of years.', next: 'h10' },
    h10: { as: DAVE, text: 'A hat?', next: 'h11' },
    h11: { text: 'Yes. A rather important one.', next: 'h12' },
    h12: { as: DAVE, text: 'Well, I\'ve always been a hat person.', next: 'h13' },
    h13: { text: 'I know where it is hidden.', next: 'h14' },
    h14: { speaker: 'narrator', text: 'Ford looks at Dave for a long moment.', next: 'h15' },
    h15: { text: 'I always suspected that one day I might have to give you that location.', next: 'h16' },
    h16: { as: DAVE, text: 'You did?', next: 'h17' },
    h17: { text: 'I did. I believed you would eventually become a powerful being. Someone whose service might be needed if the town ever faced an emergency. Normally, I would not simply hand over the location of an artifact like this.', next: 'h18' },
    h18: { speaker: 'narrator', text: 'He pauses.', next: 'h19' },
    h19: { text: 'But I believe I owe you this one favour.', options: [{ text: 'Why Dave?', next: 'h20' }] },
    h20: { text: 'Because I believe he may become something far greater than he currently realises.', next: 'h21' },
    h21: { text: 'South of town, past the Light, there\'s an old ruin nobody goes to. The hat has lain under its fallen arch since before there was a Gullmouth. Find the hat. If it accepts him, it will become his.', next: 'h22' },
    h22: { as: DAVE, text: 'Well, I certainly hope it likes me.', next: 'h23' },
    h23: { text: 'Just be careful. An artifact that old should not be treated lightly.', options: [{ text: 'We\'ll be careful.', effect: (g) => g.setStage(Q, 'hat') }] },
    waitHat: { text: 'The ruin south of town, past the Light. Under the fallen arch. Be careful.' },
    after: { text: 'Becky White on the quay, alive. I\'ve kept this road twenty years and never once seen anything I couldn\'t explain. I\'d like it to stay at one.' },
  },
};

// ==================================================================== Walter White
const walter: DialogueTree = {
  start: (g) => {
    const s = stage(g);
    if (s === 'walter') return daveWith(g) ? 'a' : 'noDave';
    if (s === 'woods') return 'waitWoods';
    if (s === 'father') return daveWith(g) ? 'f1' : 'noDave';
    if (s === 'done') return 'after';
    return 'idle';
  },
  nodes: {
    idle: { text: 'Walter White. I raise cattle, and some sheep, and on a good day my expectations. What can I do for you?' },
    noDave: { text: 'Where\'s Dave? Bring Dave. I\'ve things to say that want him here.' },
    a: { text: 'Well, well. Look what the wind dragged in.', next: 'a2' },
    a2: { speaker: 'narrator', text: 'He looks at Dave.', next: 'a3' },
    a3: { text: 'Dave. I was beginning to wonder if you\'d ever leave that house again.', next: 'a4' },
    a4: { as: DAVE, text: 'I\'ve been busy.', next: 'a5' },
    a5: { text: 'Doing what?', next: 'a6' },
    a6: { as: DAVE, text: 'Mostly sitting.', next: 'a7' },
    a7: { text: 'Ah. A demanding profession.', next: 'a8' },
    a8: { speaker: 'narrator', text: 'Walter looks at you.', next: 'a9' },
    a9: { text: 'And who might you be?', options: [{ text: 'We\'ve been investigating the sightings around town. Ford believes Becky might be involved.', next: 'b1' }] },
    b1: { speaker: 'narrator', text: 'Walter\'s face changes.', next: 'b2' },
    b2: { text: 'Becky.', next: 'b3' },
    b3: { speaker: 'narrator', text: 'He is quiet for a moment.', next: 'b4' },
    b4: { text: 'Tell me exactly what happened.', options: [{ text: '(Tell him about the ghost on the green, and what Ford said)', next: 'b5' }] },
    b5: { text: 'If Becky is truly out there, then this is more serious than you realise.', next: 'b6' },
    b6: { as: DAVE, text: 'She\'s out there. I know it.', next: 'b7' },
    b7: { text: 'Perhaps. But if she is a ghost, something darker may be involved. And if something darker is involved, you will need something to assist you.', next: 'b8' },
    b8: { speaker: 'narrator', text: 'He pauses.', next: 'b9' },
    b9: { text: 'Which means you will need something to assist you, and I might just have the thing.', next: 'b10' },
    b10: { speaker: 'narrator', text: 'Walter reaches into his coat pocket, rummages, and brings out, with some ceremony, a small pile of food.', options: [{ text: 'Is that, bread?', next: 'b11' }] },
    b11: { text: 'Four pieces, to be exact.', next: 'b12' },
    b12: { speaker: 'narrator', text: 'He goes into the other pocket.', next: 'b13' },
    b13: { text: 'And seventeen minnows.', next: 'b14' },
    b14: { as: DAVE, text: 'Seventeen?', next: 'b15' },
    b15: { text: 'Yes, seventeen. I counted.', options: [{ text: 'What are we supposed to do with these?', next: 'b16' }] },
    b16: { text: 'What are you looking at me for?', next: 'b17' },
    b17: { speaker: 'narrator', text: 'He looks at you as though the answer should be obvious.', next: 'b18' },
    b18: { text: 'You know, you can cook those minnows and eat them, right?', next: 'b19' },
    b19: { as: DAVE, text: 'That\'s a lot of fish for a man who just went fishing.', next: 'b20' },
    b20: { text: 'Then I suggest you don\'t eat all of them at once.', next: 'b21' },
    b21: {
      text: 'Take them. You may find them useful.',
      options: [{ text: '(Take four pieces of bread and seventeen minnows)', effect: (g) => { if (!g.flag('fd:gift')) { g.give('fd_bread', 4); g.give('raw_minnow', 17); g.setFlag('fd:gift', 1); } }, next: 'b22' }],
    },
    b22: { text: 'Now. If you find Becky, I want to know. Whatever has happened to her, I would like to understand it.', next: 'b23' },
    b23: {
      text: 'Folk see things in the copse west of town, by Brock\'s smokehouse. They don\'t go in after dark. If she\'s anywhere, she\'s there.',
      options: [{ text: 'We\'ll look in the copse.', effect: (g) => g.setStage(Q, 'woods') }],
    },
    waitWoods: { text: 'The copse west of town. By the smokehouse. Bring me word.' },
    // ---- VIII. A Father's Concern
    f1: { text: 'You\'re back.', next: 'f2' },
    f2: { speaker: 'narrator', text: 'He looks at Dave.', next: 'f3' },
    f3: { text: 'Where\'s Becky?', next: 'f4' },
    f4: { as: DAVE, text: 'We found her.', next: 'f5' },
    f5: { text: 'You did?', next: 'f6' },
    f6: { as: DAVE, text: 'She was in the woods. Doing some kind of ritual. She had my hat.', next: 'f7' },
    f7: { text: 'Your hat?', next: 'f8' },
    f8: { as: DAVE, text: 'Yeah. She took it because she missed me.', next: 'f9' },
    f9: { speaker: 'narrator', text: 'Walter goes quiet.', options: [{ text: 'She told Dave she couldn\'t come back. She said he needed to move on.', next: 'f10' }] },
    f10: { text: 'She said that?', next: 'f11' },
    f11: { speaker: 'narrator', text: 'He looks down at the grass.', next: 'f12' },
    f12: { text: 'Of course she did.', next: 'f13' },
    f13: { as: DAVE, text: 'What does that mean?', next: 'f14' },
    f14: { text: 'It means we need to understand what has happened to her. If Becky is bound to this world by a curse, there may be someone responsible for keeping that curse in place.', options: [{ text: 'Someone who can reverse it?', next: 'f15' }] },
    f15: { text: 'Perhaps. But I would not count on it being easy.', next: 'f16' },
    f16: { speaker: 'narrator', text: 'He looks at Dave, and for a moment he looks like a much older and more dangerous man than a rancher.', next: 'f17' },
    f17: { text: 'You need to speak with Ford T. Justin.', next: 'f18' },
    f18: { as: DAVE, text: 'Why Ford?', next: 'f19' },
    f19: { text: 'Because I remember him telling me a story once. Something about an old magical Pilgrim Hat. An artifact that hasn\'t been used in hundreds of years.', options: [{ text: 'What does that have to do with Becky?', next: 'f20' }] },
    f20: { text: 'Perhaps nothing. Perhaps everything.', next: 'f21' },
    f21: { text: 'If you\'re going to continue this, Dave, you may need something more than determination.', next: 'f22' },
    f22: { as: DAVE, text: 'Well, I\'ve got plenty of that.', next: 'f23' },
    f23: { text: 'Yes. I\'ve noticed.', options: [{ text: 'We\'ll go to Ford.', effect: (g) => g.setStage(Q, 'ford2') }] },
    after: { text: (g) => (g.flag('fd:walterAfter') ? 'She came out to the ranch on Sunday. Sat on the fence and laughed at the sheep. I hadn\'t heard that laugh in seven years. I didn\'t say anything. I find I can\'t, much, lately.' : 'She\'s back. My girl\'s back. I\'ve been standing in this field since I heard, and I don\'t intend to sit down until it feels real.'), effect: (g) => g.setFlag('fd:walterAfter', 1) },
  },
};

// ==================================================================== VII. The Ritual
const ritual: DialogueTree = {
  start: (g) => (daveWith(g) ? 'a' : 'noDave'),
  nodes: {
    noDave: { speaker: 'narrator', text: 'A woman of grey light bends over a man held down in the leaf-mould by nothing you can see. She hasn\'t noticed you. Whatever this is, it\'s Dave\'s to see: bring him.' },
    a: { speaker: 'narrator', text: 'In a hollow among the trees a red light burns without a fire. A man lies in the leaf-mould, held down by nothing you can see, his heels kicking at the ground. Over him bends a woman made of grey light, her hands moving, her lips moving, and the red light pulling up out of him in threads.', next: 'b' },
    b: { as: DAVE, text: 'Wait.', next: 'c' },
    c: { speaker: 'narrator', text: 'Dave takes a step closer.', next: 'd' },
    d: { as: DAVE, text: 'No.', next: 'e' },
    e: { as: DAVE, text: 'Becky?', next: 'f' },
    f: { speaker: 'narrator', text: 'The woman turns. The threads snap.', next: 'g' },
    g: { text: 'Dave?', next: 'h' },
    h: { speaker: 'narrator', text: 'On the ground, the man finds he can move. He is up and running before he\'s finished getting up, and the copse swallows him.', next: 'i' },
    i: { text: 'What are you doing here?', next: 'j' },
    j: { as: DAVE, text: 'You\'re alive! Well, you\'re not exactly alive, are you? But you\'re here! I\'ve been looking everywhere for you.', next: 'k' },
    k: { text: 'Dave.', next: 'l' },
    l: { speaker: 'narrator', text: 'She sees you.', next: 'm' },
    m: { text: 'And you brought someone with you.', next: 'n' },
    n: { as: DAVE, text: 'Yeah! They helped me find you!', next: 'o' },
    o: { speaker: 'narrator', text: 'Dave looks down at the green thing in her hands.', next: 'p' },
    p: { as: DAVE, text: 'Wait, is that my hat?', next: 'q' },
    q: { text: 'Yes.', next: 'r' },
    r: { as: DAVE, text: 'You have my hat! Becky, I\'m glad to see you. I really am. But I need that hat. I can\'t survive without it.', next: 's' },
    s: { speaker: 'narrator', text: 'Becky gives him a small, sad smile.', next: 't' },
    t: { text: 'I know. I took it because I missed you. I wanted something that belonged to you. Something I could hold onto when I couldn\'t be near you.', next: 'u' },
    u: { as: DAVE, text: 'You could\'ve just asked. Well. I suppose you couldn\'t.', next: 'v' },
    v: { text: 'I didn\'t want you to see me like this.', next: 'w' },
    w: { as: DAVE, text: 'I don\'t care what you look like.', next: 'x' },
    x: { text: 'Dave, listen to me. I can\'t come back. There\'s no way for me to return to the life I had. You need to stop looking for me. You need to move on.', next: 'y' },
    y: { as: DAVE, text: 'No.', next: 'z' },
    z: { text: 'Please.', next: 'z1' },
    z1: { as: DAVE, text: 'I didn\'t spend all this time looking for you just to leave now.', next: 'z2' },
    z2: { text: 'You don\'t understand.', next: 'z3' },
    z3: { as: DAVE, text: 'Then explain it to me.', next: 'z4' },
    z4: { speaker: 'narrator', text: 'Becky looks at him for a long moment.', next: 'z5' },
    z5: { text: 'I can\'t.', next: 'z6' },
    z6: { speaker: 'narrator', text: 'She begins to fade, red motes falling from her like sparks from a dying fire, and the green cap drops out of the air where her hands were and lands in the leaves.', next: 'z7' },
    z7: { as: DAVE, text: 'Becky! Wait!', next: 'z8' },
    z8: { speaker: 'narrator', text: 'She is gone. Dave stands for a long time without moving. Then he bends and picks up his hat, and turns it over in his hands, and puts it on.', options: [{ text: 'Dave.', next: 'z9' }] },
    z9: { as: DAVE, text: 'We\'re going to talk to Walter.', options: [{ text: 'You think he\'ll know what to do?', next: 'z10' }] },
    z10: {
      as: DAVE, text: 'I don\'t know. But I\'m not giving up on her.',
      options: [{ text: '(Go back to Walter)', effect: (g) => { g.setFlag('fd:cap', 1); g.compOutfit(DAVE, String(g.flag('comp:fdave:outfit') ?? 'own')); g.setFlag('fd:beckyNamed', 1); g.compRapport(DAVE, 6); g.setStage(Q, 'father'); } }],
    },
  },
};

// ==================================================================== XII. Becky's Freedom
const freed: DialogueTree = {
  start: () => 'a',
  nodes: {
    a: { speaker: 'narrator', text: 'Where the Cursekeeper fell, the air is wrong for a moment, the way it is before a storm. Then a woman is standing in the grass who was not there before. She is grey, and then she isn\'t. The red goes out of her hair, and it is purple, and red, and pink, and every colour at once. She looks at her hands.', next: 'b' },
    b: { text: 'What\'s happening?', next: 'c' },
    c: { speaker: 'narrator', text: 'She looks at her hands again. She looks at her feet, on the ground.', next: 'd' },
    d: { text: 'Wait. Fisherman Dave!', next: 'e' },
    e: { text: 'I\'m human again! Slaying the Cursekeeper reversed all the curses on me! I\'m no longer a ghost.', next: 'f' },
    f: { speaker: 'narrator', text: 'She stops, almost unable to believe it.', next: 'g' },
    g: { text: 'Anddd, finally. I\'m no longer a witch!', next: 'h' },
    h: { text: 'Thank you for everything! I love you, Fisherman Dave!', next: 'i' },
    i: { as: DAVE, text: 'Becky.', next: 'j' },
    j: { speaker: 'narrator', text: 'He looks at her as though she might go out like a lamp.', next: 'k' },
    k: { as: DAVE, text: 'You\'re really here.', next: 'l' },
    l: { text: 'I\'m here.', next: 'm' },
    m: { as: DAVE, text: 'And you\'re, you\'re alive?', next: 'n' },
    n: { text: 'I\'m alive.', next: 'o' },
    o: { as: DAVE, text: 'Well, that\'s the best thing I\'ve heard in a very long time.', next: 'p' },
    p: { text: 'I missed you so much.', next: 'q' },
    q: { as: DAVE, text: 'I missed you too.', next: 'r' },
    r: { speaker: 'narrator', text: 'They hold each other in the middle of the road, and for a while nobody says anything at all, and nothing needs saying.', next: 's' },
    s: { text: 'I don\'t know how to thank you.', next: 't' },
    t: { as: DAVE, text: 'Well, you could start by not disappearing again. That would be nice.', next: 'u' },
    u: { text: 'I\'ll try my best.', next: 'v' },
    v: { as: DAVE, text: 'Good.', next: 'w' },
    w: { speaker: 'narrator', text: 'Dave turns to you.', next: 'x' },
    x: { as: DAVE, text: 'And you. I don\'t think I would\'ve made it this far without you. Thank you.', next: 'y' },
    y: { text: 'Thank you for helping him. And thank you for helping me.', next: 'z' },
    z: { speaker: 'narrator', text: 'She looks back at Dave.', next: 'z1' },
    z1: { text: 'I have so much to tell you.', next: 'z2' },
    z2: {
      as: DAVE, text: 'Well, we\'ve got time. Apparently, we\'ve got a whole lot of time.',
      options: [{ text: '(Walk them home to Gullmouth)', effect: (g) => { g.addMarks(600); g.compRapport(DAVE, 15); g.storyTheme('wonder', 180); g.setStage(Q, 'done'); } }],
    },
  },
};

// ==================================================================== Becky, after
const BECKY_LINES = [
  'It\'s still strange being able to feel the sun again.',
  'I never thought I\'d get another chance at a normal life.',
  'Dave has already told me about your adventures together. Some of them sound, questionable.',
  'I don\'t think he has changed as much as he thinks he has.',
  'I\'m just happy he\'s here.',
];
const becky: DialogueTree = {
  start: (g) => (daveWith(g) ? 'withDave' : 'a'),
  nodes: {
    a: { text: (g) => { const n = Number(g.flag('fd:beckyTalk') ?? 0); return BECKY_LINES[n % BECKY_LINES.length]; }, effect: (g) => g.setFlag('fd:beckyTalk', Number(g.flag('fd:beckyTalk') ?? 0) + 1) },
    withDave: { text: 'Dave, are you wearing that hat again?', next: 'w2' },
    w2: { as: DAVE, text: 'Of course. It\'s a very important hat.', next: 'w3' },
    w3: { text: 'I know. I remember.' },
  },
};

// ==================================================================== X. The Magical Pilgrim Hat (a scene, under the arch)
const DAVE_LOOK = { frame: 'm' as const, skin: '#e8c4a4', hair: '#6a3a1e', hairStyle: 0, facial: 1, eyes: '#3a5a7a', glasses: '#141414', tunic: '#d8a020', trim: '#c08a18', shirt: '#5a6a2a', top: 4, braces: '#2a1e14', trousers: '#22305a', boots: '#6a1e1a', shoes: 1, hat: 'flatcap' as const, hatColor: '#5a7a2a' };
const CURSE_LOOK = { skin: '#e8e4dc', hair: '#e8e4dc', hairStyle: 3, eyes: '#b060ff', bones: true, tunic: '#141218', trim: '#4a3a5a', shirt: '#1e1a22', top: 7, trousers: '#141218', boots: '#0e0c10', cape: '#141218', gear: { glow: '#a050ff', tatters: '#2a1a3a', pauldron: 'skulls' as const } };
const sceneHat: DialogueTree = {
  start: () => 'a',
  nodes: {
    a: { text: 'Well, this place certainly looks old.', options: [{ text: 'Ford said the hat was hidden here.', next: 'b' }] },
    b: { text: 'I hope he wasn\'t mistaken. Although, if I were a magical hat, this is probably where I\'d live.', next: 'c' },
    c: { speaker: 'narrator', text: 'Under the fallen arch, on a slab gone green with age, lies a pilgrim\'s hat: dark brown felt, a brown band with a square gold buckle, a white feather, a small silver fish-hook. There is no dust on it. There is dust on everything else.', next: 'd' },
    d: { text: 'That\'s it? Well.', next: 'e' },
    e: { speaker: 'narrator', text: 'Dave looks at it for a moment. Then he reaches out.', next: 'f' },
    f: { text: 'Come on, then.', next: 'g' },
    g: { speaker: 'narrator', text: 'The feather stirs. Light runs round the buckle like water round a stone, and up Dave\'s arm, and he says a word he will later deny saying.', next: 'h' },
    h: { text: 'Whoa! I can feel something.', options: [{ text: 'What is it?', next: 'i' }] },
    i: { text: 'I don\'t know. But I think this thing likes me.', next: 'j' },
    j: { speaker: 'narrator', text: 'He smiles.', next: 'k' },
    k: {
      text: 'Finally. Someone does.',
      options: [{
        text: '(Dave puts the hat on)',
        effect: (g) => {
          g.setFlag('fd:hatGot', 1);
          g.setFlag('fd:hatOn', 'dave');
          g.compOutfit(DAVE, String(g.flag('comp:fdave:outfit') ?? 'own'));
          g.compRapport(DAVE, 8);
          g.setStage(Q, 'curse');
          g.toast('The Magical Pilgrim Hat is Dave\'s now: he casts with it, hits harder and stands up to more. Ask him for it if you\'d rather wear it yourself.');
        },
      }],
    },
  },
};

// ==================================================================== XI. The Cursekeeper (a scene, on the road)
const sceneCurse: DialogueTree = {
  start: () => 'a',
  nodes: {
    a: { as: DAVE, text: 'Hold on. Something\'s wrong.', options: [{ text: 'What is it?', next: 'b' }] },
    b: { as: DAVE, text: 'I don\'t know. But I don\'t think we\'re alone.', next: 'c' },
    c: { speaker: 'narrator', text: 'The light goes out of the afternoon. On the road ahead, where there was nothing, a tall figure stands in a long black coat torn to ribbons at the hem. Its head is a white skull, cracked, its eyes two points of purple fire. Two smaller skulls ride its shoulders. It holds a black scythe with purple in the grain, and the grass at its feet has gone grey.', next: 'd' },
    d: { text: 'So. You\'ve finally found the hat.', next: 'e' },
    e: { as: DAVE, text: 'Who are you?', next: 'f' },
    f: { text: 'Someone who knows exactly what you\'re attempting to do.', options: [{ text: 'Where\'s Becky?', next: 'g' }] },
    g: { text: 'Becky White? She\'s no longer your concern.', next: 'h' },
    h: { as: DAVE, text: 'Where is she?', next: 'i' },
    i: { text: 'She belongs to the curse. And the curse belongs to me.', next: 'j' },
    j: { as: DAVE, text: 'Well, I don\'t remember asking you.', next: 'k' },
    k: { text: 'You cannot undo what has already been written.', options: [{ text: 'We\'ll see about that.', next: 'l' }] },
    l: { text: 'You have no understanding of the forces you are challenging.', next: 'm' },
    m: { speaker: 'narrator', text: 'Behind it, held up by nothing, a woman of grey light hangs in the air with her head bowed, red motes falling from her like blood.', next: 'n' },
    n: { as: DAVE, text: 'You took her? Give her back.', next: 'o' },
    o: { text: 'Come and take her.', options: [{ text: '(Fight)', effect: (g) => g.setFlag('fd:curseMet', 1) }] },
  },
};

const NAMES: Record<string, string> = {
  ford: 'A Guardian\'s Concern', dave: 'The Fisherman', train: 'Getting Back in Shape', trained: 'Getting Back in Shape', fish: 'A Little Fishing', fished: 'A Little Fishing',
  walter: 'Walter\'s Gift', woods: 'The Ritual', father: 'A Father\'s Concern', ford2: 'The Old Pilgrim Hat', hat: 'The Magical Pilgrim Hat', curse: 'The Cursekeeper', freed: 'Becky\'s Freedom', done: 'Becky\'s Freedom',
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'Fisherman Dave', region: 'saltwind', depth: 'storyline',
    notes: (g, s) => {
      const t = NAMES[s] ? NAMES[s] + '. ' : '';
      if (s === 'ford') return t + 'A woman on Gullmouth\'s green, glowing red, her feet not on the grass, holding something green. She said she finally had something to remember him by, and now she could leave the man she loved in peace. Then she was gone. Somebody who keeps watch in this town might know.';
      if (s === 'dave') return t + 'Ford T. Justin has seen her too, or something like her. He thinks it might be Becky White, who died. He can\'t leave his post, and sent me to Fisherman Dave, in his net shed above the slip. Dave has been drinking since Becky died.';
      if (s === 'train') return t + `Dave used to be a fighter. He wants me to get him back into shape: fifteen fights with him beside me, anywhere. ${Math.min(15, kills(g))} of fifteen.`;
      if (s === 'trained') return t + 'Dave didn\'t fall over. He\'s remembering some of it. He wants to tell me something.';
      if (s === 'fish') return t + `Dave wants to celebrate the only way he knows: fishing. Five fish with him beside me, any water. ${Math.min(5, fish(g))} of five.`;
      if (s === 'fished') return t + 'Five fish. Dave feels a little more like the man he used to be. He has something to say.';
      if (s === 'walter') return t + 'Dave wants to see Walter White, Becky\'s father, at his ranch north-west of Gullmouth.';
      if (s === 'woods') return t + 'Walter gave us four pieces of bread and seventeen minnows, and the advice to cook the minnows. Folk see things in the copse west of town, by Brock\'s smokehouse. If Becky is anywhere, she\'s there.';
      if (s === 'father') return t + 'It was Becky. She was doing something to a man in the copse; he got away. She had Dave\'s hat, and left it for him. She says she can\'t come back and he has to move on. He won\'t. We\'re going back to Walter.';
      if (s === 'ford2') return t + 'Walter thinks someone may be keeping a curse on Becky, and that Ford T. Justin once told a story about a magical Pilgrim Hat nobody has used in hundreds of years.';
      if (s === 'hat') return t + 'Ford knows where the hat is: under the fallen arch in the old ruin south of town, past the Light. If it accepts Dave, it will become his.';
      if (s === 'curse') return t + 'The Magical Pilgrim Hat is ours. On the way back toward town, something is waiting. Whoever wears the hat, Dave or me, can hurt what keeps the curse.';
      if (s === 'freed') return t + 'The Cursekeeper is gone. Something is happening to the air on the road.';
      if (s === 'done') return 'Becky White is human again, and back in Gullmouth with Fisherman Dave. The curses on her are broken. The Magical Pilgrim Hat is ours to keep.';
      return '';
    },
    objectives: (g, s) => (s === 'ford' ? [{ text: 'Find someone who keeps watch in Gullmouth: Ford T. Justin, at the top of the quay road', marker: 'fd_ford' }]
      : s === 'dave' ? [{ text: 'Find Fisherman Dave in his net shed above the slip', marker: 'comp_fdave' }]
      : s === 'train' ? [{ text: `Defeat enemies with Fisherman Dave as your companion (${Math.min(15, kills(g))}/15)`, done: kills(g) >= 15 }]
      : s === 'trained' || s === 'fished' ? [{ text: 'Talk to Fisherman Dave', marker: 'comp_fdave' }]
      : s === 'fish' ? [{ text: `Catch fish with Fisherman Dave as your companion (${Math.min(5, fish(g))}/5)`, done: fish(g) >= 5 }]
      : s === 'walter' ? [{ text: 'Speak with Walter White at his ranch, with Dave', marker: 'fd_walter' }]
      : s === 'woods' ? [{ text: 'Search the copse west of town for Becky, with Dave', marker: 'fd_becky_ghost' }]
      : s === 'father' ? [{ text: 'Return to Walter and tell him what happened', marker: 'fd_walter' }]
      : s === 'ford2' ? [{ text: 'Speak with Ford T. Justin about the Magical Pilgrim Hat', marker: 'fd_ford' }]
      : s === 'hat' ? [{ text: 'Find the hidden Magical Pilgrim Hat in the ruin south of town, with Dave', marker: 'fdHat' }]
      : s === 'curse' ? [{ text: 'Return toward town, and face the Cursekeeper', marker: 'fdCurse' }]
      : s === 'freed' ? [{ text: 'Go to Becky', marker: 'fd_becky_freed' }] : []),
    advance: (g, s) => (s === 'train' && kills(g) >= 15 ? 'trained' : s === 'fish' && fish(g) >= 5 ? 'fished' : s === 'curse' && killed(g, 'fdCursekeeper') >= 1 ? 'freed' : null),
    marks: (_g, s): Marks => (!s ? { fd_becky_unknown: '!' } : s === 'ford' || s === 'ford2' ? { fd_ford: '?' } : s === 'dave' || s === 'trained' || s === 'fished' ? { comp_fdave: '?' }
      : s === 'walter' || s === 'father' ? { fd_walter: '?' } : s === 'woods' ? { fd_becky_ghost: '!' } : s === 'freed' ? { fd_becky_freed: '?' } : {}),
    walk: { cast: ['fd_becky_unknown', 'fd_ford', 'comp_fdave', 'fd_walter', 'fd_becky_ghost', 'fd_becky_freed'] },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'fdCursekeeper', type: 'fd_cursekeeper', at: [CURSE_ROAD], when: (g) => stage(g) === 'curse' && !!g.flag('fd:curseMet') },
];

export const FISHERMAN_DAVE: RegionContent = {
  id: 'fishermanDave', items, npcs, quests, spawns,
  dialogue: { fd_becky_unknown: unknown, fd_ford: ford, fd_walter: walter, fd_becky_ghost: ritual, fd_becky_freed: freed, fd_becky: becky, fd_scene_hat: sceneHat, fd_scene_curse: sceneCurse },
  things: [
    {
      // X. The Magical Pilgrim Hat
      id: 'fdHat', x: RUIN[0], z: RUIN[1], label: 'Look under the fallen arch', radius: 4,
      when: (g: GameApi) => stage(g) === 'hat',
      use: (g: GameApi) => {
        if (!daveWith(g)) { g.toast('Dave should be here for this. Bring him (he waits in his net shed above Gullmouth\'s slip).'); return; }
        g.playScene('fd_scene_hat', { name: 'Fisherman Dave', title: 'Gullmouth', look: DAVE_LOOK });
      },
    },
    {
      // XI. The Cursekeeper: he's waiting on the road back
      id: 'fdCurse', x: CURSE_ROAD[0], z: CURSE_ROAD[1], label: 'Something is wrong on the road', radius: 9,
      when: (g: GameApi) => stage(g) === 'curse' && !g.flag('fd:curseMet'),
      use: (g: GameApi) => {
        g.playScene('fd_scene_curse', { name: 'The Cursekeeper', title: '', look: CURSE_LOOK });
      },
    },
  ],
};
