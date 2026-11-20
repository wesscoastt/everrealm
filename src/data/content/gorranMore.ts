import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';

// Gorran's own stories (OWED 97x stage 9, Verandah's countryside): the village behind the Arena, and what the Arena
// costs it.
//
// gorDrew, THE GRANDSON (Agnes Truscott): her grandson Drew fights in the Arena, and hasn't come home since fight night.
// Kenver the smith, who mends his sword, knows where he is: behind the smithy barrels, ashamed. He lost the fight, and
// before it he'd bet his grandmother's quarter rent on himself. Pay Agnes's rent yourself and say nothing (thirty marks),
// walk him home to tell her, or ([Bad or Evil]) send him back to bet again on the next fight, for a share.
// gorDrew = 'paid' | 'told' | 'again'.
//
// gorGlass, FIGHT NIGHT GLASS (Tressa Jago): the Arena's crowd throws its bottles over the field wall, and the broken
// glass is in her bean rows. Pick out four lots of it, and take them to Loveday Rowse, the reeve, who sends the Arena a
// bill by the same road.

const DREW_Q = 'gorDrew', GLASS = 'gorGlass';
const DREW = { x: -3370.5, y: 22, z: 2308.5 };
const SHARDS: [number, number][] = [[-3392.5, 2285.5], [-3393.5, 2288.5], [-3391.5, 2290.5], [-3392.5, 2292.5]];

const picked = (g: GameApi) => SHARDS.filter((_, i) => g.flag('gorShard' + i)).length;

// ================================================================ The Grandson

const agnes: DialogueTree = {
  start: (g) => (at(g, DREW_Q) === 'agnes' ? 'a5' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (at(g, DREW_Q) === 'done' ? (g.flag(DREW_Q) === 'again' ? 'Drew\'s fighting again Saturday. I don\'t watch.' : 'Drew\'s home. He mends the roof now, instead of his face. It\'s an improvement.') : 'Wipe your boots. I\'ve swept that floor twice today.'),
      options: [
        { text: 'You look worried, Agnes.', cond: (g) => !at(g, DREW_Q), next: 'a1' },
        { text: 'Good day.' },
      ],
    },
    a1: { text: 'My grandson Drew. He fights in the Arena, God help him, and he hasn\'t been home since Saturday\'s fight night. He always comes home. Even when he loses, he comes home, and I put the beef on his eye, and I don\'t say anything.', next: 'a2' },
    a2: {
      text: 'Kenver mends his sword. Kenver would know if he\'s hurt. Would you ask him? I can\'t go round the village asking where my grandson is. They\'ll think I\'ve lost him.',
      options: [{ text: 'I\'ll ask Kenver.', effect: (g) => g.setStage(DREW_Q, 'kenver') }, { text: 'Not now.' }],
    },
    a5: {
      text: (g) => (g.flag(DREW_Q) === 'told'
        ? 'He told me. All of it. Thirty marks. My quarter rent, on his own fists. I said what I had to say, and he cried, and then I put the beef on his eye. Thank you for bringing him.'
        : 'Drew sent word he\'s well, and the rent\'s paid, and he\'ll be home tonight. I don\'t know how he paid it. I won\'t ask. Thank you for finding him.'),
      options: [{ text: 'Good day, Agnes.', effect: (g) => { g.addMarks(60); g.setStage(DREW_Q, 'done'); } }],
    },
  },
};

const kenverNodes: Record<string, DNode> = {
  kd1: { text: 'Drew Truscott. Yes. He\'s been behind my barrels since Sunday, sleeping on the sacks. Lost on Saturday, and lost worse than a fight. He won\'t tell me what. He\'ll tell you, maybe. You\'re not his grandmother.', options: [{ text: 'I\'ll talk to him.', effect: (g) => g.setStage(DREW_Q, 'drew') }] },
};

const drew: DialogueTree = {
  start: (g) => (at(g, DREW_Q) === 'drew' ? 'd1' : 'd0'),
  nodes: {
    d0: { text: 'Leave me be.' },
    d1: { speaker: 'narrator', text: 'A big young man with a split lip and a closed eye, sitting on a sack behind the smithy barrels with his knees up, turning a wooden practice sword over and over in his hands.', next: 'd2' },
    d2: { text: 'Gran sent you. Course she did. I can\'t go home. I bet her quarter rent on myself on Saturday. Thirty marks. I was going to win, and pay it twice over, and buy her a chair. A man from Ansbury put me down in the second round.', next: 'd3' },
    d3: {
      text: 'The rent\'s due Friday. She\'ll lose the house. What am I supposed to do?',
      options: [
        { text: 'Here. Thirty marks. Pay her rent, and don\'t bet it again. (30 marks)', cond: (g) => g.marks >= 30, moral: { id: 'gorDrew:paid', a: 4, tr: { generosity: 3, compassion: 2 }, npc: { gor_drew: 20, gor_agnes: 10 }, note: 'Paid Agnes Truscott\'s rent after her grandson bet it on himself in the Arena and lost.', spread: 'local' }, effect: (g) => { g.addMarks(-30); g.setFlag(DREW_Q, 'paid'); g.setStage(DREW_Q, 'agnes'); }, next: 'dP' },
        { text: 'You go home and tell her. I\'ll walk you to the door.', moral: { id: 'gorDrew:told', tr: { honesty: 2, courage: 1 }, npc: { gor_drew: 10, gor_agnes: 10 } }, effect: (g) => { g.setFlag(DREW_Q, 'told'); g.setStage(DREW_Q, 'agnes'); }, next: 'dT' },
        { text: 'Bet again Saturday. Win it back, and give me a share of what you win.', need: { band: ['bad', 'evil'] }, moral: { id: 'gorDrew:again', a: -5, tr: { greed: 3, cruelty: 1 }, npc: { gor_drew: -5, gor_agnes: -15 }, note: 'Sent Agnes Truscott\'s grandson back to bet on himself in the Arena, for a share.' }, effect: (g) => { g.addMarks(25); g.setFlag(DREW_Q, 'again'); g.setStage(DREW_Q, 'agnes'); }, next: 'dA' },
      ],
    },
    dP: { text: 'You\'d do that? For Gran? I\'ll pay you back. I will. Not with fighting. Kenver says he needs a striker. I\'ll swing a hammer instead of my face.' },
    dT: { text: 'She\'ll kill me. All right. All right. Walk slow.' },
    dA: { text: 'Saturday. Right. He was lucky in the second round, that Ansbury man. I\'ll have him. Here, that\'s all I\'ve got left. Twenty-five. Call it your share in advance.' },
  },
};

// ================================================================ Fight Night Glass

const tressaNodes: Record<string, DNode> = {
  t1: { text: 'Look at this. Glass. In my bean rows. Every fight night the crowd comes out of the Arena with their bottles, and when the bottles are empty they throw them over my wall, and they burst on the stones and the pieces go everywhere. I\'ve cut my hands to ribbons.', next: 't2' },
  t2: { text: 'Pick out what you can see glinting in the rows. Mind your fingers. Then take it to Loveday. She\'s the reeve. She\'s good at being angry on paper.', options: [{ text: 'I\'ll clear the rows.', effect: (g) => g.setStage(GLASS, 'pick') }, { text: 'Not now.' }] },
};

const lovedayNodes: Record<string, DNode> = {
  l1: { speaker: 'narrator', text: 'Loveday Rowse tips the glass out of your hat onto the counter of her produce stall, counts it, and starts to write very fast, pressing so hard the pen goes through the paper twice.', next: 'l2' },
  l2: { text: 'Item: glass, broken, in quantity, removed from Tressa Jago\'s beans by hand. Item: Tressa\'s hands. Item: four nights\' labour. To the Master of the Arena, payable within the week. They\'ll pay it. They always pay it, and do it again. But they\'ll pay it.', options: [{ text: 'Good luck with it.', effect: (g) => { g.addMarks(45); g.setStage(GLASS, 'done'); } }] },
};

const quests: Record<string, QuestDef> = {
  [DREW_Q]: {
    id: DREW_Q, name: 'The Grandson', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'kenver') return 'Agnes Truscott\'s grandson Drew fights in the Arena and hasn\'t been home since fight night. Kenver Hosken, Gorran\'s smith, mends his sword.';
      if (s === 'drew') return 'Drew is hiding behind the smithy barrels.';
      if (s === 'agnes') return 'Back to Agnes Truscott.';
      const f = g.flag(DREW_Q);
      return f === 'paid' ? 'I paid Agnes\'s rent, and Drew went home.' : f === 'told' ? 'Drew went home and told his grandmother.' : 'Drew is betting on himself again.';
    },
    objectives: (_g, s) => (s === 'kenver' ? [{ text: 'Ask Kenver Hosken at the smithy', marker: 'gor_kenver' }] : s === 'drew' ? [{ text: 'Talk to Drew behind the barrels', marker: 'gor_drew' }] : s === 'agnes' ? [{ text: 'Go back to Agnes Truscott', marker: 'gor_agnes' }] : []),
    marks: (_g, s): Marks => (!s ? { gor_agnes: '!' } : s === 'kenver' ? { gor_kenver: '?' } : s === 'drew' ? { gor_drew: '?' } : s === 'agnes' ? { gor_agnes: '?' } : {}),
    walk: { cast: ['gor_agnes', 'gor_kenver', 'gor_drew'] },
  },
  [GLASS]: {
    id: GLASS, name: 'Fight Night Glass', region: 'verandah', depth: 'quest',
    notes: (_g, s) => (s === 'pick' ? 'The Arena\'s crowd throws its bottles over Tressa Jago\'s field wall. Pick the broken glass out of her bean rows.' : s === 'reeve' ? 'Take the glass to Loveday Rowse, the reeve.' : 'Loveday sent the Arena a bill.'),
    objectives: (g, s) => (s === 'pick' ? SHARDS.map((_, i) => ({ text: `Pick out the glass (${['the first row', 'the second row', 'the third row', 'the far row'][i]})`, done: !!g.flag('gorShard' + i), marker: 'gorShard' + i })) : s === 'reeve' ? [{ text: 'Take the glass to Loveday Rowse', marker: 'gor_loveday' }] : []),
    advance: (g, s) => (s === 'pick' && picked(g) >= SHARDS.length ? 'reeve' : null),
    marks: (_g, s): Marks => (!s ? { gor_tressa: '!' } : s === 'reeve' ? { gor_loveday: '?' } : {}),
    walk: { cast: ['gor_tressa', 'gor_loveday'] },
  },
};

const SHARD_TOASTS = ['A brown bottle neck and a fan of green glass, half buried by a bean stake.', 'Two bottle bottoms, still whole, and a scatter of splinters you pick out one by one.', 'Glass, and a cork, and a betting slip for Saturday, soaked.', 'The last of it, along the foot of the wall, where they land.'];

const things: WorldThing[] = SHARDS.map(([x, z], i): WorldThing => ({
  id: 'gorShard' + i, x, z, y: 23, label: 'Pick out the glass', radius: 1.8, look: 'glint',
  when: (g) => at(g, GLASS) === 'pick' && !g.flag('gorShard' + i),
  use: (g) => { g.setFlag('gorShard' + i, 1); g.toast(SHARD_TOASTS[i]); },
}));

const NPCS: NpcDef[] = [
  { id: 'gor_drew', name: 'Drew Truscott', title: 'Fights in the Arena', look: { skin: '#d8a882', hair: '#5a3a22', hairStyle: 0, eyes: '#3a4a5a', tunic: '#6a3a2a', trim: '#3a2a1c', trousers: '#3a3430', boots: '#2a1e14', build: 1.3, age: 0.22, scar: true },
    schedule: [{ from: 0, to: 24, at: [DREW.x, DREW.z], face: [DREW.x + 2, DREW.z], anim: 'seated', y: DREW.y }],
    when: (g) => at(g, DREW_Q) === 'kenver' || at(g, DREW_Q) === 'drew', barks: ['Leave me be.'] },
];

export const GORRAN_MORE: RegionContent = {
  id: 'gorranMore',
  npcs: NPCS,
  dialogue: { gor_agnes: agnes, gor_drew: drew },
  quests,
  things,
  hooks: (D) => {
    const plain = (id: string, text: string) => { if (!D[id]) D[id] = { start: () => 'hello', nodes: { hello: { text, options: [{ text: 'Good day.' }] } } }; };
    plain('gor_kenver', 'Arena fighters break more swords than they win.');
    plain('gor_tressa', 'Water runs in the channels. Don\'t step in them.');
    hook(D, 'gor_kenver', () => undefined, kenverNodes);
    addOption(D, 'gor_kenver', 'hello', { text: 'Agnes Truscott is looking for her grandson.', cond: (g) => at(g, DREW_Q) === 'kenver', next: 'kd1' });
    hook(D, 'gor_tressa', () => undefined, tressaNodes);
    addOption(D, 'gor_tressa', 'hello', { text: 'What\'s wrong with the beans?', cond: (g) => !at(g, GLASS), next: 't1' });
    hook(D, 'gor_loveday', (g) => (at(g, GLASS) === 'reeve' ? 'l1' : undefined), lovedayNodes);
  },
};
