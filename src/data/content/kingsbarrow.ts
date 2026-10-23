import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { KB_CAMP, KB_FLOOR, KB_HALLS } from '../../world/morrow';

// KINGSBARROW, the old king's city of the dead in the Held (world/sites.ts buildKingsbarrow, and the
// group dungeon under it, buildKingsHalls / data/dungeons.ts gd-kingsbarrow).
//
// THE THIRD DAUGHTER, chapter XXI, The King's Black, and the ending. Ebba Thorne walked out of the
// dig when they broke into the king's hall. Down there: Garrow Venn's diggers, the king's guard,
// the old king on his bier, and Aubrey Pryce with a lamp. When the king lies still again, Pryce is
// waiting, and he leaves it to the player:
// - 'back': the black goes back, here and on the fell. The Held lie down. Callis takes its tallest
//   towers down a storey at a time, and the Assembly never forgives the Counties. Pryce comes home
//   on the Third Daughter with nothing.
// - 'hold': Northgate keeps the Held behind its wall; Harrowgate sells the black under Assembly
//   licence, and the Greywaste is given up. Pryce comes home rich.
// - 'sink': Ned Vey sinks the black in deep water off the Keys (if you owe him, this is his favour).
//   The Held lie down slowly, the towers come down anyway, and Saltpenny is owed by everyone. Pryce
//   comes home in irons on a Brethren cutter.
// Flag tdEnd. Chapter XXII, His Book: Delia Harrowgate reads his book at last.

const KING = 'tdKing', HOME = 'tdHome';
const ACT = 'The Third Daughter';
type End = 'back' | 'hold' | 'sink';
const end = (g: GameApi) => g.flag('tdEnd') as End | undefined;
const by = <T>(g: GameApi, v: Record<End, T>): T => v[end(g) ?? 'hold'];

const ebba: DialogueTree = {
  start: (g) => (at(g, KING) === 'north' ? 'e1' : at(g, KING) === 'barrow' ? 'eWait' : end(g) ? 'eEnd' : 'e0'),
  nodes: {
    e0: { text: 'Ebba Thorne. I\'m waiting for the snow to stop. It doesn\'t stop, up here.' },
    e1: { text: 'You came through the postern? Then Maud\'s gone soft, or you\'re worse than what\'s out here.', next: 'e2' },
    e2: { text: 'Ebba Thorne. I dug for Venn. I walked out when we broke into the king\'s hall. Pryce didn\'t try to stop me. He was looking at the bier.', next: 'e3' },
    e3: { text: 'They\'re down there now. Venn\'s lads, and Pryce, and whatever\'s waking up. Take people with you. It\'s not a place for one.', next: 'e4' },
    e4: { text: 'The portal\'s in the king\'s barrow, in its south face. The dead down there were his guard. They kneel until they don\'t.', effect: (g) => g.setStage(KING, 'barrow') },
    eWait: { text: 'The portal, in the king\'s barrow. Take people with you.' },
    eEnd: { text: (g) => by(g, { back: 'The snow\'s stopped. First time in a month. Nothing walks out there now.', hold: 'They\'re still up there, past the wall. Walking. I\'m going south. Somewhere warm, with no barrows in it.', sink: 'They\'re lying down. Slowly. One a night, the way they got up. I\'m staying till the last one\'s still.' }) },
  },
};

const pryce: DialogueTree = {
  start: () => 'p1',
  nodes: {
    p1: { text: 'You\'ll be Delia\'s. She always did send someone when she couldn\'t come herself.', next: 'p2' },
    p2: { text: 'Before you start: I didn\'t put the white in their walls, and I didn\'t bury these people under the black. I bought low and sold high.', next: 'p3' },
    p3: { text: 'It\'s all I\'ve ever done. It\'s the only thing I\'m any good at, and I\'m very good at it.', next: 'p4' },
    p4: {
      text: 'Go on, then.',
      options: [
        { text: 'The dead got up because of you.', next: 'p5' },
        { text: 'What\'s the king\'s black worth?', next: 'p6' },
      ],
    },
    p5: { text: 'The dead got up because the black came off them. It came off because Callis paid for it. I was the man in between. I always am.', next: 'p4' },
    p6: { text: 'Enough to hold every tower in Callis for fifty years. Or to keep every dead thing in the Held lying down. Not both. It\'s one king.', next: 'p7' },
    p7: {
      text: 'You\'ve walked further than anyone. You decide. I\'ll carry it whichever way you point.',
      options: [
        { text: 'Put it back. All of it, here and on the fell.', next: 'a1', effect: (g) => g.setFlag('tdEnd', 'back') },
        { text: 'Northgate holds the line. Ship it under licence.', next: 'b1', effect: (g) => g.setFlag('tdEnd', 'hold') },
        { text: 'Ned Vey sinks it in deep water off the Keys.', next: 'c1', effect: (g) => g.setFlag('tdEnd', 'sink') },
      ],
    },
    a1: { text: 'Then Callis takes its towers down a storey at a time, and the Assembly never forgives the Counties. I\'ll lay the first slab myself.', next: 'a2' },
    a2: { text: 'Delia can have her ship back. I\'ll come home on her with nothing. I\'ve done it before.', next: 'z1' },
    b1: { text: 'The wall holds the Held, Callis keeps its towers, and Harrowgate sells the black under Assembly licence. Profitable. For some.', next: 'b2' },
    b2: { text: 'The Greywaste is given up. Nobody lives there now anyway. I\'ll see to the paperwork. I\'m good at paperwork.', next: 'z1' },
    c1: { text: (g) => (g.flag('tdFavour') ? 'Ned Vey. Of course. You owe him, don\'t you. This will be his favour, then, and he\'ll make it look like yours.' : 'The Brethren. Nobody can dig what\'s at the bottom of the sea. Nobody can sell it either, which Ned won\'t like.'), next: 'c2' },
    c2: { text: 'The dead lie down slowly, the towers come down anyway, and Saltpenny is owed by everyone. I\'m told the Table wants a word with me.', next: 'c3' },
    c3: { text: 'In irons, I expect. Ned does like a show.', next: 'z1' },
    z1: { speaker: 'narrator', text: 'He takes a book out of his coat, the last of his purchase books, and holds it out to you. Then he thinks better of it, and puts it back.', next: 'z2' },
    z2: { text: 'No. I\'ll give it to her myself. Tell her I\'m coming home.', effect: (g) => { g.addMarks(600); g.setStage(KING, 'done'); } },
  },
};

// The epilogue: Delia, at the Works
const deliaNodes: Record<string, DNode> = {
  h1: { speaker: 'narrator', text: (g) => by(g, { back: 'The Third Daughter came into Gullmouth on the morning tide, riding high. Pryce came down the gangway with his book under his arm, and nothing else.', hold: 'The Third Daughter came into Gullmouth low in the water, full of black under Assembly seal. Pryce came down the gangway with his book under his arm.', sink: 'A Brethren cutter put in at Gullmouth and left a long man in irons on the quay, with his book under his arm.' }), next: 'h2' },
  h2: { text: 'He gave me his book. Every line he ever signed with my name, and the two prices on each.', next: 'h3' },
  h3: { text: 'I\'ve read it. I never read it before. I always knew what was in it. I didn\'t want to know which lines.', next: 'h4' },
  h4: { text: (g) => by(g, { back: 'We\'re poorer. The Assembly won\'t buy a nail from us. I find I don\'t mind as much as I thought.', hold: 'We\'re richer than we\'ve ever been, and my name is on a licence to sell grave-stone. I\'ll be living with that.', sink: 'Ned Vey sent me a bill for carrying him home. I paid it. Then I sent Ned a bill for the Third Daughter, and he paid that.' }), next: 'h5' },
  h5: { text: 'Here. The book. I\'ve copied what I need. Thank you. I mean it, which you\'ll have noticed I don\'t often.', effect: (g) => { g.give('pryce_book'); g.addMarks(1000); g.setStage(HOME, 'done'); } },
  hAfter: { text: (g) => by(g, { back: 'Pryce works the books at the smelter now, for Joan. She pays him the posted rate. He hates it.', hold: 'Pryce buys for us again, under licence. One price on every line, now. I check.', sink: 'Pryce is in Ansbury gaol till the spring assizes. He\'s asked for ledgers to pass the time.' }) },
};

// After the end: what Morrow says about it
const salaNodes: Record<string, DNode> = {
  sEnd: { text: (g) => by(g, { back: 'We\'re taking down the Old Tower, a storey at a time. Marta measures every course. The Assembly hasn\'t forgiven anyone, and it keeps a list.', hold: 'The towers stand. The black comes in under licence, stamped and taxed. Callis need never ask where it came from again. I find that restful.', sink: 'The towers are coming down anyway. The black is at the bottom of the sea, and the Brethren are telling everyone. I\'m told there\'s a song.' }) },
};
const nedNodes: Record<string, DNode> = {
  nEnd: { text: (g) => by(g, { back: 'You put it back. Good. Nothing pays when the dead walk.', hold: 'Licensed black. Harrowgate ships it now, under Assembly seal. We\'ll carry something else. We always do.', sink: 'Deep water off the Keys. Nobody digs there. Nobody but me knows where, and I\'ve a bad memory for things I\'m paid to forget.' }) },
};
const maudNodes: Record<string, DNode> = {
  mEnd: { text: (g) => by(g, { back: 'They\'ve lain down, all of them, up on the plateau. I\'ve opened the gate. I don\'t know what to do with my hands.', hold: 'The gate stays shut and the Held stays up there. The wall\'s three hundred years old, and it\'s finally earning its keep.', sink: 'They\'re lying down, slowly. The gate\'s still shut. I\'ll open it when the last one\'s still, and not before.' }) },
};

const quests: Record<string, QuestDef> = {
  [KING]: {
    id: KING, name: 'The King\'s Black', region: 'held', story: { chapter: 21, title: 'The King\'s Black', act: ACT }, next: [HOME, 'delia'],
    notes: (g, s) => {
      if (s === 'north') return 'Through Northgate\'s postern and over the Held\'s plateau to Kingsbarrow, the old kingdom\'s city of the dead, where Pryce took his diggers.';
      if (s === 'barrow') return `Ebba Thorne walked out of the dig when they broke into the king's hall. Pryce and Garrow Venn's diggers are under the king's barrow. It's a group dungeon: take people, or henchmen. (${Math.min(1, killed(g, 'type:dg_oldking'))}/1)`;
      if (s === 'pryce') return 'The old king lies still on his bier again. Pryce is waiting beside it.';
      return by(g, {
        back: 'The black goes back, at Kingsbarrow and on Hollow Fell, and the Held lie down. Callis will take its tallest towers down a storey at a time. Pryce is going home on the Third Daughter with nothing.',
        hold: 'Northgate holds the Held behind its wall, Harrowgate sells the black under Assembly licence, and the Greywaste is given up. Pryce is going home on the Third Daughter, rich.',
        sink: 'Ned Vey will sink the king\'s black in deep water off the Keys. The Held will lie down slowly, the towers will come down anyway, and Saltpenny is owed by everyone. Pryce is going home in irons.',
      });
    },
    objectives: (g, s) => {
      if (s === 'north') return [{ text: 'Go to Kingsbarrow, beyond Northgate\'s wall', marker: 'ebba_thorne' }];
      if (s === 'barrow') return [{ text: `Go down into the king's barrow and lay the old king to rest (${Math.min(1, killed(g, 'type:dg_oldking'))}/1)` }];
      if (s === 'pryce') return [{ text: 'Talk to Aubrey Pryce in the King\'s Hall', marker: 'pryce_kb' }];
      return [];
    },
    advance: (g, s) => (s === 'barrow' && killed(g, 'type:dg_oldking') >= 1 ? 'pryce' : null),
    marks: (_g, s): Marks => (s === 'north' ? { ebba_thorne: '?' } : s === 'pryce' ? { pryce_kb: '?' } : {}),
    walk: { kill: { barrow: [['dg_oldking', 1]] }, from: { quests: { storyBell: 'done', tdCrew: 'done', tdCallis: 'done', tdSalt: 'done', tdHeld: 'done', [KING]: 'north' }, flags: { postern: true } } },
  },
  [HOME]: {
    id: HOME, name: 'His Book', region: 'redstone', story: { chapter: 22, title: 'His Book', act: ACT },
    notes: (g, s) => (s === 'delia' ? 'Pryce is going home to Delia Harrowgate with his purchase book. She should hear the rest from me.' : by(g, { back: 'Delia read Pryce\'s book at last. Harrowgate is poorer for it, and she finds she doesn\'t mind.', hold: 'Delia read Pryce\'s book at last. Harrowgate is richer than it\'s ever been, and her name is on a licence to sell grave-stone.', sink: 'Delia read Pryce\'s book at last, while he waited on the spring assizes in Ansbury gaol.' })),
    objectives: (_g, s) => (s === 'delia' ? [{ text: 'Go back to Delia Harrowgate at the Works, in the Counties', marker: 'delia' }] : []),
    marks: (_g, s): Marks => (s === 'delia' ? { delia: '?' } : {}),
    walk: { from: { quests: { storyBell: 'done', tdCrew: 'done', tdCallis: 'done', tdSalt: 'done', tdHeld: 'done', [KING]: 'done', [HOME]: 'delia' }, flags: { tdEnd: 'back' } } },
  },
};

const items: ItemDef[] = [
  { id: 'pryce_book', name: 'Pryce\'s last purchase book', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'letter', a: '#4a4a52', b: '#c8c8c0' }, desc: 'The last volume of Aubrey Pryce\'s purchase books. Two prices on every line, in a neat small hand, and "for Harrowgate & Daughters" at the top of every page. The last line: "One king. A.P."' },
];

export const KINGSBARROW_CONTENT: RegionContent = {
  id: 'kingsbarrow',
  items,
  npcs: [
    {
      land: 'morrow', id: 'ebba_thorne', name: 'Ebba Thorne', title: 'Digger, walked out',
      look: { skin: '#d8b090', hair: '#7a5a3a', hairStyle: 4, eyes: '#4a5a6a', tunic: '#4a4a40', trim: '#6a5a40', trousers: '#3a3430', boots: '#2a2018', cape: '#3a3a34', hat: 'hood', hatColor: '#3a3a34', lashes: true, build: 1.1, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [KB_CAMP.x - 2.5, KB_CAMP.z + 3.5], y: KB_FLOOR, face: [KB_CAMP.x + 0.5, KB_CAMP.z + 0.5], anim: 'idle' }],
      barks: ['They kneel until they don\'t.'],
    },
    {
      land: 'morrow', id: 'pryce_kb', name: 'Aubrey Pryce', title: 'Buyer, Harrowgate & Daughters',
      look: { skin: '#e8c4a4', hair: '#4a3a2a', hairStyle: 0, eyes: '#6a5a3a', tunic: '#4a4a52', trim: '#c8c8c0', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', build: 0.9, height: 1.05, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [KB_HALLS.x + 89.5, KB_HALLS.z - 18.5], y: KB_HALLS.f, face: [KB_HALLS.x + 93, KB_HALLS.z - 12], anim: 'idle' }],
      when: (g) => at(g, KING) === 'pryce',
    },
  ],
  dialogue: { ebba_thorne: ebba, pryce_kb: pryce },
  quests,
  hooks: (D) => {
    hook(D, 'delia', (g) => (at(g, HOME) === 'delia' ? 'h1' : at(g, HOME) === 'done' ? 'hAfter' : undefined), deliaNodes);
    hook(D, 'benet_sala', (g) => (end(g) && at(g, 'tdCallis') === 'done' ? 'sEnd' : undefined), salaNodes);
    hook(D, 'ned_vey', (g) => (end(g) && at(g, 'tdSalt') === 'done' ? 'nEnd' : undefined), nedNodes);
    hook(D, 'maud_hale', (g) => (end(g) && at(g, 'tdHeld') === 'done' ? 'mEnd' : undefined), maudNodes);
  },
};
