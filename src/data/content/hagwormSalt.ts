import type { DialogueTree, GameApi } from '../../game/api';
import { at, bandIs, killed, moral, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// The morality system's worked examples, as a real quest in Hagworm Wood (docs/MORALITY.md; the owner's brief,
// docs/briefs/morality.md 11). Owner 2026-11-13, content order: fill the Counties first.
//
// crCart, THE HOLLIN FORD SALT (Ada Penrose, Hollin Ford's carrier, on the woods road to Hollin Ford): her axle has
// gone with the winter's salt for Hollin Ford in the back, a week before the pig-killing, and there are men in the
// coppice who have noticed. The wheelwright is coming down from Fellers' Camp. Five ways to answer her, and a sixth for a
// name people know:
//   free (stand guard for nothing), fair (for a sack of salt), paid (fifty marks, up front), decline (walk on),
//   robbed (take the salt yourself), and, Heroic only, name (say who you are, loud enough for the coppice).
// Then, guarding, Jem Sallow calls from the coppice and offers a third of the salt to walk away: sold (a betrayal
// Ada remembers). Otherwise the footpads come, the wheelwright arrives, and she pays as agreed.
// crCart = 'free' | 'fair' | 'paid' | 'name' | 'robbed' | 'sold'.
//
// crAmends, SALT BACK (Ada, home in Hollin Ford, if you robbed her or sold her out): a redemption. Bring back what
// the salt was worth, and tell her the truth or don't. crAmends = 'truth' | 'excuse'.

const CART = 'crCart', AMENDS = 'crAmends';
/** The cart, on the woods road from Fellers' Camp down to Hollin Ford, where there's nobody for a mile; Ada beside it; the coppice across the road. */
const CART_AT = { x: 327.5, z: 569.5 };
const ADA = { x: 324.5, z: 567.5 };
const JEM = { x: 316.5, z: 562.5 };
const PADS: [number, number][] = [[314, 561], [318, 558], [312, 566]];
const WRIGHT = { x: 326.5, z: 566.5 };
/** Ada at home, by the Post stop in Hollin Ford. */
const HOME = { x: 187.5, z: 178.5 };

const pads = (g: GameApi) => (g.flag(CART) === 'name' ? 1 : 3);
/** Footpads driven off: the one who stays whatever, and the two who slip away from a name they know. */
const padsDown = (g: GameApi) => killed(g, 'crPad') + killed(g, 'crPads');
const wronged = (g: GameApi) => g.flag(CART) === 'robbed' || g.flag(CART) === 'sold';

// ================================================================ Ada, on the road

const ada: DialogueTree = {
  start: (g) => {
    const s = at(g, CART);
    if (!s) return 'a1';
    if (s === 'guard') return 'wait';
    if (s === 'wright') return 'w1';
    return 'gone';
  },
  nodes: {
    a1: { speaker: 'narrator', text: 'A cart down on one side at the edge of the road, the near wheel in the ditch, the axle snapped short. A grey-haired woman in a carrier\'s smock stands with her back to the cart and a whip in her hand, watching the coppice across the road.', next: 'a2' },
    a2: { text: 'Ada Penrose, Hollin Ford\'s carrier. That\'s the village\'s salt in the back, for the pig-killing. Thirty sacks. A week late already, and now this.', next: 'a3' },
    a3: { text: 'The wheelwright\'s coming down from Fellers\' Camp, if the boy I sent ran as fast as he said he would. And there are three men in that coppice who\'ve been very interested in my salt since noon.', next: 'a4' },
    a4: {
      text: 'I can\'t pay much. I can pay something. Will you stand here with me till the wheelwright comes?',
      options: [
        { text: 'Keep your money. I\'ll stand with you.', moral: { id: 'crCart:free', a: 10, tr: { generosity: 4, compassion: 3 }, npc: { cr_ada: 25 }, rep: { hollinford: 6 }, note: 'Stood guard over Hollin Ford\'s salt on the woods road, for nothing.', fame: 'stood guard over the Hollin Ford salt for nothing', spread: 'local' }, effect: (g) => { g.setFlag(CART, 'free'); g.setStage(CART, 'guard'); }, next: 'free' },
        { text: 'I\'ll stay, for a sack of the salt.', moral: { id: 'crCart:fair', a: 4, tr: { honesty: 2 }, npc: { cr_ada: 12 }, rep: { hollinford: 3 } }, effect: (g) => { g.setFlag(CART, 'fair'); g.setStage(CART, 'guard'); }, next: 'fair' },
        { text: 'Fifty marks. Now, before I stand anywhere.', moral: { id: 'crCart:paid', a: -6, tr: { greed: 5, compassion: -2 }, npc: { cr_ada: -15 }, rep: { hollinford: -3 } }, effect: (g) => { g.addMarks(50); g.setFlag(CART, 'paid'); g.setStage(CART, 'guard'); }, next: 'paid' },
        { text: 'That\'s a lot of salt for one woman with a broken cart.', moral: { id: 'crCart:rob', a: -16, tr: { cruelty: 4, greed: 5 }, npc: { cr_ada: -45 }, rep: { hollinford: -15, tollriders: -8 }, note: 'Robbed Ada Penrose of Hollin Ford\'s salt on the woods road.', major: true, fame: 'robbed the Hollin Ford carrier on the woods road', spread: 'local' }, next: 'rob1' },
        { text: 'You know who I am. Let them hear it.', need: { band: ['heroic'] }, moral: { id: 'crCart:name', a: 8, tr: { courage: 4 }, npc: { cr_ada: 25 }, rep: { hollinford: 6 }, note: 'Stood on the woods road and said your name to the coppice, and two of the three footpads thought better of it.', fame: 'scared off the footpads on the woods road with their name alone', spread: 'local' }, effect: (g) => { g.setFlag(CART, 'name'); g.setStage(CART, 'guard'); }, next: 'name' },
        { text: 'Not my cart. Good luck to you.' },
      ],
    },
    free: { text: 'Nothing? Then you\'re a better neighbour than the vicar. Stand where they can see you. Sometimes that\'s enough.' },
    fair: { text: 'A sack it is. That\'s honest. Stand where they can see you.' },
    paid: { text: 'Fifty. That\'s the carriage money for the whole month. Here. Earn it.' },
    name: { speaker: 'narrator', text: 'You say your name, not loudly, but it carries. In the coppice somebody swears, and two shapes slip away through the hazels. One stays. Ada looks at you as though you\'d walked out of a ballad.' },
    rob1: { text: 'It is. And it\'s Hollin Ford\'s, every grain. If you take it, half the village eats its pig fresh and lets the rest go bad.', next: 'rob2' },
    rob2: {
      text: 'You\'re not going to take it. Are you.',
      options: [
        { text: 'Unhitch the horse. I\'m taking the salt.', effect: (g) => { g.give('cr_salt', 1); g.setFlag(CART, 'robbed'); g.setStage(CART, 'done'); }, next: 'robbed' },
        { text: 'No. I\'m not. I\'ll stand with you.', moral: { id: 'crCart:relent', a: 6, tr: { compassion: 2 } }, effect: (g) => { g.setFlag(CART, 'fair'); g.setStage(CART, 'guard'); }, next: 'relent' },
      ],
    },
    robbed: { speaker: 'narrator', text: 'She doesn\'t fight. She stands by the ditch with her whip hanging from her hand and watches you load it, sack by sack, and she doesn\'t say anything at all. In the coppice, somebody laughs.' },
    relent: { text: 'Then don\'t frighten an old woman like that. Stand where they can see you.' },
    wait: { text: (g) => (padsDown(g) >= pads(g) ? 'They\'re gone. Now we wait for the wheelwright, and I\'ll stop shaking presently.' : 'They\'re still in there. I can see the red kerchief. Don\'t turn your back on the hazels.') },
    w1: { text: 'Nat Thorne, down from the camp, with a new axle on his shoulder like it weighed nothing. I could kiss him. I won\'t; his wife\'s a Penhallow.', next: 'w2' },
    w2: {
      text: (g) => {
        const f = g.flag(CART);
        if (f === 'paid') return 'You had your fifty. I\'d say thank you, but I paid for it, so I\'ll say we\'re square.';
        if (f === 'fair') return 'Your sack of salt, as agreed. Rub it into something you love.';
        return 'You stood here for nothing. Hollin Ford will hear about it, every house, and so will the vicar, because I want to see his face.';
      },
      options: [{ text: 'Safe road, Ada.', effect: (g) => { const f = g.flag(CART); if (f === 'fair') g.give('cr_salt_sack', 1); g.addMarks(f === 'paid' ? 0 : f === 'fair' ? 15 : 30); g.setStage(CART, 'done'); } }],
    },
    gone: { text: 'Go on. I\'ve a wheel to watch.' },
  },
};

// ================================================================ Jem Sallow, in the coppice

const jem: DialogueTree = {
  start: (g) => (g.flag('crJemSaid') ? 'j9' : 'j1'),
  nodes: {
    j1: { speaker: 'narrator', text: 'A thin man in a red kerchief, crouched in the hazels with a cudgel across his knees and a friendly expression he must practise.', next: 'j2' },
    j2: { text: 'Jem Sallow. No need for that face. I\'m a businessman. There\'s thirty sacks in that cart and three of us, and one of you.', next: 'j3' },
    j3: { text: 'Walk away, down the road, a little while. When you come back there\'s ten sacks under that oak with your name on them. She\'ll never know you were asked.', next: 'j4' },
    j4: {
      text: 'A third. For a walk. What do you say?',
      options: [
        { text: 'Ten sacks for a walk. Done.', moral: { id: 'crCart:sold', a: -14, tr: { loyalty: -8, deception: 5, greed: 4 }, npc: { cr_ada: -40 }, rep: { hollinford: -12, tollriders: -6 }, note: 'Took ten sacks from Jem Sallow to walk away from Ada Penrose\'s cart, and left her to the footpads.', major: true, fame: 'sold out the Hollin Ford carrier to the footpads', spread: 'local' }, effect: (g) => { g.give('cr_salt', 1); g.setFlag(CART, 'sold'); g.setStage(CART, 'done'); }, next: 'sold' },
        { text: 'Here\'s what I say.', moral: { id: 'crCart:refuseJem', tr: { loyalty: 3, courage: 2 }, npc: { cr_ada: 5 } }, effect: (g) => g.setFlag('crJemSaid', 1), next: 'no' },
      ],
    },
    sold: { speaker: 'narrator', text: 'You walk down the road, not fast. Behind you, a shout, and a woman\'s voice, and then nothing. When you come back, there are ten sacks under the oak, and the cart is empty, and Ada is sitting in the ditch beside it, and she looks at you.' },
    no: { text: 'Shame. You\'d have liked the money. Lads!' },
    j9: { text: 'Still here? Lads!' },
  },
};

// ================================================================ The wheelwright

const wright: DialogueTree = {
  start: () => 'n1',
  nodes: { n1: { text: 'Nat Thorne, wheelwright, Fellers\' Camp. Hold this end. No, the other end. Good. That\'s an axle.' } },
};

// ================================================================ Ada at home: the memory, and Salt Back

const adaHome: DialogueTree = {
  start: (g) => {
    const a = at(g, AMENDS);
    if (a === 'pay') return 'p1';
    if (a === 'done') return 'mended';
    // (she remembers: whatever the realm thinks of you since, Ada's own feeling decides how she opens)
    if (wronged(g)) return moral(g).feel.cr_ada <= -30 ? 'cold1' : 'cool';
    return 'warm';
  },
  nodes: {
    warm: { text: (g) => (g.flag(CART) === 'paid' ? 'Fifty marks for an afternoon\'s standing. I\'ll remember the price.' : bandIs(g) === 'heroic' && g.flag(CART) === 'name' ? 'They still talk about it at the Bell: you said your name and the hazels emptied. I tell it better every time.' : 'The salt got home. The pigs are hanging. Hollin Ford owes you, and I\'ll see it pays.') },
    cool: { text: 'You. I haven\'t forgotten the woods road. I\'ve just stopped saying so.', next: 'cold2' },
    cold1: { text: (g) => (g.flag(CART) === 'sold' ? 'You walked away down the road for ten sacks of salt, and left me in the ditch. I remember your back. I\'ll always remember your back.' : 'You took the village\'s salt off me on the woods road and watched me stand in the ditch. Half Hollin Ford ate its pig bad that winter.'), next: 'cold2' },
    cold2: {
      text: 'What do you want?',
      options: [
        { text: 'To put it right.', effect: (g) => g.setStage(AMENDS, 'pay'), next: 'cold3' },
        { text: 'Nothing. Forget it.' },
      ],
    },
    cold3: { text: 'Put it right. Thirty sacks of salt and a winter\'s worth of bad pork. You can\'t. But a hundred marks for the village chest would be a start, and it would have to be you that brings it.' },
    p1: {
      text: 'Well?',
      options: [
        { text: 'Here. A hundred marks for the chest. I robbed you, and I\'m sorry.', cond: (g) => g.marks >= 100, moral: { id: 'crAmends:truth', a: 16, tr: { honesty: 6, compassion: 3 }, npc: { cr_ada: 45 }, rep: { hollinford: 15 }, note: 'Went back to Ada Penrose in Hollin Ford with a hundred marks for the village chest, and said sorry to her face.', major: true, fame: 'came back and paid for the salt they took', spread: 'local' }, effect: (g) => { g.addMarks(-100); g.take('cr_salt', 1); g.setFlag(AMENDS, 'truth'); g.setStage(AMENDS, 'done'); }, next: 'truth' },
        { text: 'Here. A hundred marks. Times were hard; you know how it is.', cond: (g) => g.marks >= 100, moral: { id: 'crAmends:excuse', a: 8, tr: { deception: 2 }, npc: { cr_ada: 20 }, rep: { hollinford: 8 }, note: 'Paid Hollin Ford a hundred marks for the salt you took from Ada Penrose.' }, effect: (g) => { g.addMarks(-100); g.take('cr_salt', 1); g.setFlag(AMENDS, 'excuse'); g.setStage(AMENDS, 'done'); }, next: 'excuse' },
        { text: (g) => (g.marks >= 100 ? 'Not yet.' : 'I haven\'t got it yet.') },
      ],
    },
    truth: { text: 'Sorry. Well. Nobody\'s said that word to me since my husband, and he was lying. I\'ll put it in the chest. I don\'t forgive you yet. Come by at Christmas and I\'ll see how I feel.' },
    excuse: { text: 'Times were hard. They were hard for the village too. I\'ll put it in the chest. Don\'t expect me to wave.' },
    mended: { text: (g) => (g.flag(AMENDS) === 'truth' ? 'Christmas came and you came by. I suppose that\'s that, then. Sit down, you\'re letting the cold in.' : 'The chest\'s a hundred marks heavier. That\'s all I\'ll say.') },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [CART]: {
    id: CART, name: 'The Hollin Ford Salt', region: 'brambledeep', depth: 'quest',
    notes: (g, s) => {
      if (s === 'guard') return 'Ada Penrose, Hollin Ford\'s carrier, has broken an axle on the woods road to Hollin Ford with the village\'s winter salt in the back. There are footpads in the coppice across the road. I\'m standing with her until the wheelwright comes down from Fellers\' Camp.';
      if (s === 'wright') return 'The footpads are gone, and Nat Thorne the wheelwright has come up the road with a new axle.';
      const f = g.flag(CART);
      if (f === 'robbed') return 'I took Hollin Ford\'s salt off Ada Penrose on the woods road. She didn\'t fight.';
      if (f === 'sold') return 'I took ten sacks from the footpads to walk away from Ada Penrose\'s cart, and left her to them.';
      if (f === 'paid') return 'I stood guard over Ada Penrose\'s cart for fifty marks, paid up front.';
      return 'The salt got home to Hollin Ford.';
    },
    objectives: (g, s) => (s === 'guard' ? [{ text: `Drive off the footpads in the coppice (${Math.min(pads(g), padsDown(g))}/${pads(g)})`, done: padsDown(g) >= pads(g) }]
      : s === 'wright' ? [{ text: 'Talk to Ada Penrose', marker: 'cr_ada' }] : []),
    advance: (g, s) => (s === 'guard' && padsDown(g) >= pads(g) ? 'wright' : null),
    marks: (_g, s): Marks => (!s ? { cr_ada: '!' } : s === 'wright' ? { cr_ada: '?' } : {}),
    walk: { cast: ['cr_ada', 'cr_jem'], kill: { guard: [['footpad', 3]] } },
  },
  [AMENDS]: {
    id: AMENDS, name: 'Salt Back', region: 'greenwake', depth: 'short',
    notes: (g, s) => (s === 'pay' ? 'Ada Penrose wants a hundred marks for Hollin Ford\'s chest, brought by me, for the salt I cost the village on the woods road.'
      : g.flag(AMENDS) === 'truth' ? 'I paid Hollin Ford back for the salt, and told Ada the truth to her face.' : 'I paid Hollin Ford back for the salt.'),
    objectives: (g, s) => (s === 'pay' ? [{ text: `Bring Ada Penrose a hundred marks for the village chest (${Math.min(100, g.marks)}/100)`, marker: 'cr_ada_home' }] : []),
    marks: (g, s): Marks => (!s && at(g, CART) === 'done' && wronged(g) ? { cr_ada_home: '!' } : s === 'pay' ? { cr_ada_home: '?' } : {}),
    walk: { cast: ['cr_ada_home'], from: { quests: { [CART]: 'done' }, flags: { [CART]: 'robbed' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'crPad', type: 'footpad', at: PADS.slice(0, 1), when: (g) => at(g, CART) === 'guard' },
  { tag: 'crPads', type: 'footpad', at: PADS.slice(1), when: (g) => at(g, CART) === 'guard' && g.flag(CART) !== 'name' },
];

const things: WorldThing[] = [
  {
    id: 'crCartThing', x: CART_AT.x, z: CART_AT.z, label: 'Look at the cart', radius: 2.6, look: 'saltcart',
    when: (g) => at(g, CART) !== 'done',
    use: (g) => g.toast(at(g, CART) === 'wright' ? 'Nat Thorne has the cart up on a jack and the old axle out. Salt crunches under your boots.' : 'Thirty sacks of salt, roped down, and an axle snapped clean where the grain ran crooked. The near wheel lies in the ditch.'),
  },
];

const ADA_LOOK = { frame: 'f' as const, skin: '#e0b48e', hair: '#b8b0a4', hairStyle: 2, eyes: '#4a4a3a', tunic: '#7a6a4a', trim: '#4a3a24', trousers: '#3a3430', boots: '#2a1e14', hat: 'kerchief' as const, hatColor: '#5a3a2a', lashes: true, build: 1.04, age: 0.62 };

const NPCS: NpcDef[] = [
  { id: 'cr_ada', name: 'Ada Penrose', title: 'Carrier, Hollin Ford', look: ADA_LOOK,
    schedule: [{ from: 0, to: 24, at: [ADA.x, ADA.z], face: [JEM.x, JEM.z], anim: 'idle' }], when: (g) => at(g, CART) !== 'done',
    barks: ['Thirty sacks. A week late already.', 'Don\'t turn your back on the hazels.'] },
  { id: 'cr_ada_home', name: 'Ada Penrose', title: 'Carrier, Hollin Ford', look: ADA_LOOK,
    schedule: [{ from: 6, to: 21, at: [HOME.x, HOME.z], face: [HOME.x + 3, HOME.z], anim: 'idle' }], when: (g) => at(g, CART) === 'done',
    barks: ['Carrier\'s cart, Tuesdays and Fridays.'] },
  { id: 'cr_jem', name: 'Jem Sallow', title: 'Footpad', look: { skin: '#d8a882', hair: '#4a3020', hairStyle: 1, eyes: '#3a3a2a', tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', hat: 'kerchief', hatColor: '#7a2a22', build: 0.86, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [JEM.x, JEM.z], face: [ADA.x, ADA.z], anim: 'idle' }], when: (g) => at(g, CART) === 'guard' && padsDown(g) === 0 && g.flag(CART) !== 'name' && !g.flag('crJemSaid'),
    barks: ['Psst.'] },
  { id: 'cr_wright', name: 'Nat Thorne', title: 'Wheelwright, Fellers\' Camp', look: { skin: '#c8956a', hair: '#3a2a1e', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#5a4a32', trim: '#8a7a5a', trousers: '#3a3028', boots: '#2a1e14', apron: true, build: 1.15, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [WRIGHT.x, WRIGHT.z], face: [CART_AT.x, CART_AT.z], anim: 'hammer' }], when: (g) => at(g, CART) === 'wright',
    barks: ['Hold this end.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'cr_salt', name: 'Hollin Ford\'s salt', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#e8e2d2', b: '#8a6a3a' }, desc: 'Sacks of salt that were meant for Hollin Ford\'s pig-killing.' },
  { id: 'cr_salt_sack', name: 'A sack of good salt', kind: 'material', rarity: 'common', stack: true, value: 12, icon: { shape: 'bag', a: '#e8e2d2', b: '#8a6a3a' }, desc: 'Ada Penrose\'s fee for a guard on the woods road: a sack of the winter\'s salt.' },
];

export const HAGWORM_SALT: RegionContent = {
  id: 'hagwormSalt',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { cr_ada: ada, cr_jem: jem, cr_wright: wright, cr_ada_home: adaHome },
  quests,
  spawns,
  things,
};
