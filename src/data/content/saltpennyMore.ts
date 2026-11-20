import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { SALT_COCKPIT, SALT_FLOOR, SALT_HULLS, SALT_PIERS, SALTPENNY } from '../../world/morrow';
import { DUELISTS } from '../duels';

// More of Saltpenny Key (Morrow side stories, docs/LORE.md "Saltpenny Key").
//
// sbBowden, WASHED (Annie Coe, the Leaning Mast): somebody has been at the chowder pot every night after the Mast
// shuts, and brings the bowl back washed, which no Brethren alive has ever done. Wet prints at the back hatch go
// down to the third pier, where the galley Long Meg's oar crew sleep chained under her deck. One of them is Sam
// Bowden, of the Margery (Gullmouth: The Margery's Bell, gullmouthSide.ts): the Margery's six were pressed into
// Brethren oars, and Sam slips his chain at night with a bent nail. Feed the oar crew openly and dare the Table to
// stop it, get Sam aboard the Kittiwake for Callis in a cask, or tell Ned Vey. sbBowden = 'fed' | 'cask' | 'table'.
//
// sbKit, ALWAYS BUYS (Jago Sweeney, the Cockpit): Kit Rowe, the first rung of the ladder, has lost to the last
// eleven newcomers in a row, and Jago doesn't believe anybody is that bad. Gil Fenner's chalk board by the ring has
// every newcomer at three to one against Kit, and Gil paying out on all of them. Kit owes Gil three hundred marks
// from the winter, and works it off by losing. Pay Kit's debt (150 marks, Gil takes half to have it settled), tell
// Jago and let the Cockpit deal with Gil, or keep it quiet and take Gil's cut. sbKit = 'paid' | 'jago' | 'cut'.

const BOWDEN = 'sbBowden', KITQ = 'sbKit';
const H = SALT_HULLS, F = SALT_FLOOR, SX = SALTPENNY.x;
const zc = (h: { z: number }) => h.z + 0.5;
const HATCH = { x: H.mast.x + 1.2, z: zc(H.mast) + 1.5 };
const SAM = { x: SX - 128.5, z: SALT_PIERS[2] + 1.5 };
const C = SALT_COCKPIT;
const KIT = { x: C.x - C.r - 2.5, z: C.z + 3.5 };
const BOARD = { x: C.x - C.r - 3.5, z: C.z };
const KIT_DUEL = DUELISTS[0];

const annieNodes: Record<string, DNode> = {
  bw1: { text: 'Somebody\'s at my pot. Every night after I bar the door. Lid off, a bowl gone, and in the morning the bowl\'s back on the shelf. Washed.', next: 'bw2' },
  bw2: { text: 'Washed! I\'ve kept this bar twenty years. Nobody on this Key has ever washed a bowl in his life. I\'m not angry. I\'m frightened. Find out who it is before I start liking them.', options: [{ text: 'I\'ll look round the back.', effect: (g) => g.setStage(BOWDEN, 'hatch') }, { text: 'Not now.' }] },
  bb1: { text: 'The Margery\'s men? On the Long Meg\'s oars? Under my own pier, all this time, and me selling Ned\'s captains chowder over their heads. One bowl a night. For six men.', next: 'bb2' },
  bb2: {
    text: 'Well. What do I do? You found him. You tell me.',
    options: [
      { text: 'Feed them. Six bowls at the back hatch every night, and let Ned Vey come and stop you.', moral: { id: 'sbBowden:fed', tr: { compassion: 2, courage: 1 }, rep: { brethren: -1 }, npc: { annie_coe: 15, sb_sam: 15 } }, effect: (g) => { g.setFlag(BOWDEN, 'fed'); g.addMarks(70); g.setStage(BOWDEN, 'done'); }, next: 'bbF' },
      { text: 'Get Sam into a rum cask and onto the Kittiwake for Callis. He can find his way home from there.', moral: { id: 'sbBowden:cask', tr: { courage: 2, deception: 1 }, rep: { brethren: -3 }, npc: { annie_coe: 10, sb_sam: 25, mara_coyle: -5 }, note: 'Smuggled Sam Bowden of the Margery off Saltpenny Key in a rum cask.' }, effect: (g) => { g.setFlag(BOWDEN, 'cask'); g.addMarks(70); g.setStage(BOWDEN, 'done'); }, next: 'bbC' },
      { text: 'Tell Ned Vey. It\'s the Table\'s Key and the Table\'s oars.', moral: { id: 'sbBowden:table', tr: { loyalty: 1, cruelty: 2 }, rep: { brethren: 3 }, npc: { annie_coe: -20, sb_sam: -30, ned_vey: 10 } }, effect: (g) => { g.setFlag(BOWDEN, 'table'); g.addMarks(90); g.setStage(BOWDEN, 'done'); }, next: 'bbT' },
    ],
  },
  bbF: { text: 'Six bowls. And spoons. If Ned Vey wants to stop me, he can come round the back of my bar and say so to my face, and then he can find somewhere else to drink. Here. That\'s for the looking.' },
  bbC: { speaker: 'narrator', text: 'That night Annie rolls an empty rum cask down to the Kittiwake with a chalk mark on its head and two holes bored under the hoops. Mara Coyle looks at the mark, and at Annie, and at you, and has it stowed in the hold without a word. Annie presses marks into your hand on the way back up the beach.' },
  bbT: { text: 'The Table. Of course. The Table\'s Key and the Table\'s oars. Take your money and drink somewhere else for a while. I\'ll be washing my own bowls.' },
  bbAfter: {
    text: (g) => (g.flag(BOWDEN) === 'fed'
      ? 'Six bowls, every night. Ned came round the back once. He looked at the bowls, and at me, and went away again. The Long Meg\'s master pays for them now. Don\'t ask me how that happened.'
      : g.flag(BOWDEN) === 'cask'
        ? 'Mara says a cask came off at Callis that walked away on its own. That\'s all she\'ll say. That\'s all I want to know.'
        : 'They moved the Long Meg to the north pier. No more bowls go missing. I count them every night anyway.'),
    next: 'a0',
  },
};

const sam: DialogueTree = {
  start: (g) => (at(g, BOWDEN) === 'pier' ? 's1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(BOWDEN) === 'table' ? 'Go away.' : g.flag(BOWDEN) === 'fed' ? 'Six bowls. Every night. Tell her thank you. Tell her again.' : 'Pull, rest, pull.'),
      options: [{ text: 'Good day.' }],
    },
    s1: { speaker: 'narrator', text: 'A thin man in the remains of a Gullmouth fisherman\'s smock, sitting on the pier with his back to a bollard and his ankle in an iron cuff with a bent nail through the pin. He doesn\'t try to run. He looks too tired to run.', next: 's2' },
    s2: { text: 'Sam Bowden. The Margery, out of Gullmouth. The Hen took us off the Mewstones in February and sold the six of us to the Long Meg for her oars. I worked the pin loose a month ago. I go up to the Mast at night and take one bowl, and we share it, and I wash it so she\'ll not know.', next: 's3' },
    s3: {
      text: 'I could have run any night. Where to? It\'s a Key. And the other five are still chained. Tell her I\'m sorry about the chowder. Tell her it was very good.',
      options: [{ text: 'I\'ll tell her.', effect: (g) => g.setStage(BOWDEN, 'back') }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [BOWDEN]: {
    id: BOWDEN, name: 'Washed', region: 'saltpenny', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hatch') return 'Somebody takes a bowl of chowder from the Leaning Mast every night after it shuts, and brings it back washed. Annie Coe wants to know who. Look round the back hatch.';
      if (s === 'pier') return 'Wet prints from the Mast\'s back hatch go down to the third pier, where the galley Long Meg lies.';
      if (s === 'back') return 'Sam Bowden, of the Margery out of Gullmouth, pressed to the Long Meg\'s oars with the rest of her crew. Back to Annie Coe.';
      const f = g.flag(BOWDEN);
      return f === 'fed' ? 'Annie Coe feeds the Long Meg\'s oar crew at her back hatch every night.' : f === 'cask' ? 'Sam Bowden went to Callis in a rum cask aboard the Kittiwake.' : 'I told Ned Vey about Sam Bowden.';
    },
    objectives: (_g, s) => (s === 'hatch' ? [{ text: 'Look at the Leaning Mast\'s back hatch', marker: 'sbHatch' }]
      : s === 'pier' ? [{ text: 'Find who comes up from the third pier', marker: 'sb_sam' }]
      : s === 'back' ? [{ text: 'Back to Annie Coe', marker: 'annie_coe' }] : []),
    marks: (_g, s): Marks => (!s ? { annie_coe: '!' } : s === 'pier' ? { sb_sam: '?' } : s === 'back' ? { annie_coe: '?' } : {}),
    walk: { cast: ['annie_coe', 'sb_sam'] },
  },
  [KITQ]: {
    id: KITQ, name: 'Always Buys', region: 'saltpenny', depth: 'quest',
    notes: (g, s) => {
      if (s === 'board') return 'Kit Rowe, the first rung of the Cockpit\'s ladder, has lost to the last eleven newcomers. Jago Sweeney thinks somebody is making money off his ring.';
      if (s === 'kit') return 'Gil Fenner\'s board has every newcomer at three to one against Kit, and Gil paying out on all of them. Talk to Kit.';
      const f = g.flag(KITQ);
      return f === 'paid' ? 'I paid off Kit Rowe\'s debt to Gil Fenner. Kit fights straight now.' : f === 'jago' ? 'Jago Sweeney knows. Gil Fenner takes no more bets at the Cockpit.' : 'I take a share of Gil Fenner\'s winnings off Kit Rowe.';
    },
    objectives: (_g, s) => (s === 'board' ? [{ text: 'Look at the betting board by the Cockpit', marker: 'sbBoard' }]
      : s === 'kit' ? [{ text: 'Talk to Kit Rowe at the ring', marker: 'sb_kit' }] : []),
    marks: (_g, s): Marks => (!s ? { jago_sweeney: '!' } : s === 'kit' ? { sb_kit: '?' } : {}),
    walk: { cast: ['jago_sweeney', 'sb_kit'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'sbBoard', x: BOARD.x, z: BOARD.z, label: 'Read the betting board', radius: 2.4, look: 'chalk',
    when: (g) => at(g, KITQ) === 'board',
    use: (g) => { g.setStage(KITQ, 'kit'); g.toast('Gil Fenner\'s slate, propped on a barrel by the ring. Every fight this season in chalk: the newcomer\'s name, "v. K. Rowe", three to one against Kit, and a tick for paid. Eleven ticks. At the bottom, small, in a different hand: "K.R. 300, less 11." It isn\'t a betting board. It\'s a ledger.'); },
  },
  {
    land: 'morrow', id: 'sbHatch', x: HATCH.x, z: HATCH.z, y: F, label: 'Look at the back hatch', radius: 2.4, look: 'tracks',
    when: (g) => at(g, BOWDEN) === 'hatch',
    use: (g) => { g.setStage(BOWDEN, 'pier'); g.toast('The back hatch has been opened from outside with something thin, a nail or a knife. On the boards, wet bare footprints, salt-white when they dry, and a smear of the black grease they put on oar looms. They go down the beach to the third pier.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'sb_sam', name: 'Sam Bowden', title: 'The Long Meg\'s oars', look: { skin: '#d8a888', hair: '#6a4a2a', hairStyle: 1, facial: 1, eyes: '#4a5a6a', tunic: '#5a5a4a', trim: '#3a3a30', shirt: '#a8a090', trousers: '#3a3a30', boots: '#3a2a1e', build: 0.8, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [SAM.x, SAM.z], face: [SAM.x, SAM.z + 4], anim: 'seated' }],
    barks: ['Pull, rest, pull.'] },
  { land: 'morrow', id: 'sb_kit', name: KIT_DUEL.name, title: 'First rung of the ladder', look: { skin: '#c8946a', hair: '#7a4a2a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#5a6a7a', trim: '#e0d4b0', shirt: '#d8d0c0', trousers: '#3a3a30', boots: '#2a1e14', hat: 'kerchief', hatColor: '#2a4a6a', age: 0.15, build: 0.95 },
    schedule: [{ from: 0, to: 24, at: [KIT.x, KIT.z], face: [C.x, C.z], anim: 'idle' }],
    barks: ['I always buy.', 'One day.'] },
];

// ================================================================ Always Buys (Jago Sweeney and Kit Rowe)

const jagoNodes: Record<string, DNode> = {
  kj1: { text: 'Kit Rowe. First rung. Every newcomer fights Kit first, that\'s the rule. He\'s lost to the last eleven of them. Eleven. Kit\'s not good, but he\'s not that bad. Nobody\'s that bad.', next: 'kj2' },
  kj2: { text: 'Somebody\'s making money off my ring, and the ring\'s the one thing on this Key that\'s straight. Find out who, and I\'ll owe you.', options: [{ text: 'I\'ll look into it.', effect: (g) => g.setStage(KITQ, 'board') }, { text: 'Not now.' }] },
  kjAfter: {
    text: (g) => (g.flag(KITQ) === 'jago'
      ? 'Gil Fenner\'s not to take a bet within a hundred yards of my ring. The Table agreed. Kit\'s my second now, holding the water and calling time. He\'s good at it. Better than he ever was at fighting.'
      : g.flag(KITQ) === 'paid'
        ? 'Kit beat a newcomer last week. Fair and square, first blood off a Callis bargeman. He bought the round anyway. Habit.'
        : 'Kit\'s still losing. I\'ve stopped asking. You\'ve got the look of somebody who knows why. I\'ve stopped asking you too.'),
    next: 'j0',
  },
};

const kit: DialogueTree = {
  start: (g) => (at(g, KITQ) === 'kit' ? 'k1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(KITQ) === 'paid' ? 'I won one! Did Jago tell you? I won one.' : 'First blood. Never had it off anyone. One day.'),
      options: [{ text: 'Good day, Kit.' }],
    },
    k1: { speaker: 'narrator', text: 'A young deckhand with a kerchief and a sword he holds like a broom, leaning on the ring\'s rail picking at a cut on his knuckles. He sees the chalk on your fingers from Gil\'s board, and his face falls in.', next: 'k2' },
    k2: { text: 'You\'ve seen the board. Course you have. I lost three hundred marks to Gil at cards in the winter. Gil said I could pay it off a fight at a time. Every newcomer, I go down, he pays out to the people he\'s told to bet, and he takes a cut off the lot. Twelve more and I\'m clear.', next: 'k3' },
    k3: {
      text: 'Please don\'t tell Jago. The ring\'s all Jago\'s got. It\'d break his heart.',
      options: [
        { text: '[150 marks] I\'ll settle it with Gil. He\'ll take half to be shut of it. Fight straight.', cond: (g) => g.marks >= 150, moral: { id: 'sbKit:paid', tr: { generosity: 2, compassion: 1 }, npc: { sb_kit: 25, jago_sweeney: 5, gil_fenner: -5 } }, effect: (g) => { g.addMarks(-150); g.setFlag(KITQ, 'paid'); g.addMarks(80); g.setStage(KITQ, 'done'); }, next: 'kP' },
        { text: 'Jago needs to know. It\'s his ring.', moral: { id: 'sbKit:jago', tr: { honesty: 2, loyalty: 1 }, rep: { brethren: 2 }, npc: { sb_kit: -5, jago_sweeney: 20, gil_fenner: -20 } }, effect: (g) => { g.setFlag(KITQ, 'jago'); g.addMarks(80); g.setStage(KITQ, 'done'); }, next: 'kJ' },
        { text: 'I won\'t tell him. Tell Gil I want my share of the next eleven.', moral: { id: 'sbKit:cut', tr: { greed: 2, deception: 2 }, npc: { sb_kit: -10, gil_fenner: 10 } }, effect: (g) => { g.setFlag(KITQ, 'cut'); g.addMarks(160); g.setStage(KITQ, 'done'); }, next: 'kC' },
      ],
    },
    kP: { speaker: 'narrator', text: 'Gil Fenner takes your hundred and fifty, counts it, says "Half a loaf," and wipes Kit\'s name off the bottom of his slate. Kit stands in the doorway of Low Tide as if he doesn\'t know what to do with his hands. Jago, who knows nothing, pays you for your trouble anyway: "Kit says you\'re a friend. Friends of the ring get paid."' },
    kJ: { speaker: 'narrator', text: 'Kit doesn\'t argue. He walks over to Jago with you and tells it himself, every word, staring at the sand. Jago listens to the end. Then he puts a hand on Kit\'s shoulder, very gently, and goes to find Gil Fenner, and the Cockpit is shut for an afternoon. Jago pays you at the Mast that night.' },
    kC: { speaker: 'narrator', text: 'Kit looks at you for a long moment. "Right," he says. "Course." Gil pays your share in a twist of cloth at Low Tide that evening, and the next newcomer beats Kit in eleven seconds.' },
  },
};

export const SALTPENNY_MORE: RegionContent = {
  id: 'saltpennyMore',
  npcs: NPCS,
  dialogue: { sb_sam: sam, sb_kit: kit },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'annie_coe', (g) => (at(g, BOWDEN) === 'back' ? 'bb1' : undefined), annieNodes);
    addOption(D, 'annie_coe', 'a0', { text: 'You look worried, Annie.', cond: (g) => !at(g, BOWDEN), next: 'bw1' });
    addOption(D, 'annie_coe', 'a0', { text: 'About the bowls.', cond: (g) => at(g, BOWDEN) === 'done', next: 'bbAfter' });
    hook(D, 'jago_sweeney', () => undefined, jagoNodes);
    addOption(D, 'jago_sweeney', 'j0', { text: 'Something bothering you, Jago?', cond: (g) => !at(g, KITQ), next: 'kj1' });
    addOption(D, 'jago_sweeney', 'j0', { text: 'How\'s Kit?', cond: (g) => at(g, KITQ) === 'done', next: 'kjAfter' });
  },
};
