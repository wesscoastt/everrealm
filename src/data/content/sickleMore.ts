import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two more side stories at Hookness, on the Sickle (owner 2026-11-13, content order: fill the Counties first), with the
// morality system's choices (docs/MORALITY.md).
//
// skCalf, THE CALF IN THE BAY (Elsie Fenwick, on the ice; after Past the Red Flags): a whale calf came into the bay after the herring and fouled
// itself in the old net-pens under the quay; it can't get free and it can't get out. The ice wolves have smelt it.
// See them off, look at the calf, and then it's Annis Kettlewell's say, the reeve, who owns the try-works: a calf is a
// winter's oil for the town. Cut it loose and let it go (Hookness goes short), let Bram take it (the try-works smoke all
// winter), ([Kind]) get the town to cut it loose together, so it's Hookness's choice and not yours, or ([Bad or Evil])
// sell the oil yourself to Mara Coyle's boat. skCalf = 'freed' | 'taken' | 'town' | 'sold'.
//
// skDerby, THE CHAR DERBY (Robin Grice, the Flensing Knife): once a winter the Knife runs a derby on Sickle Water, the
// heaviest char by dark takes the purse. Fish your three pitches along the quay, past the ice bear that comes to see what everyone's doing.
// You land the best fish of the day. Pip Fenwick, Elsie's cousin, landed the second, and he needs the purse for a new
// auger for his mother, who fishes alone. Weigh in honestly and win, slip your fish back and let him win without knowing,
// or ([Generous]) win and hand him the purse in front of the whole Knife. skDerby = 'won' | 'slipped' | 'given'.

const CALF = 'skCalf', DERBY = 'skDerby';
const HOLE = { x: 3256.5, z: -1601.5 };
const WOLVES: [number, number][] = [[3260, -1606], [3264, -1614]];
const DERBY_HOLES: [number, number][] = [[3266.5, -1600.5], [3259.5, -1600.5], [3252.5, -1600.5]];
const BEAR: [number, number][] = [[3268, -1590]];

const fished = (g: GameApi) => DERBY_HOLES.filter((_, i) => g.flag('skHole' + i)).length;

// ================================================================ The Calf in the Bay

const elsieNodes: Record<string, DNode> = {
  ec1: { text: 'There\'s a calf in the bay. A whale calf. It came in after the herring with its mother and fouled itself in the old net-pens under the quay. She went back out. It can\'t.', next: 'ec2' },
  ec2: { text: 'The wolves have smelt it. They\'re walking up and down the shore, waiting for it to tire. Pip wanted to go out with a stick. I\'ve tied him to the chair.', next: 'ec3' },
  ec3: {
    text: 'Will you go out and see them off? After that it\'s Annis\'s say. It\'s always Annis\'s say.',
    options: [{ text: 'I\'ll go down to the quay.', effect: (g) => g.setStage(CALF, 'hole') }, { text: 'Not now, Elsie.' }],
  },
  ecWait: { text: (g) => (at(g, CALF) === 'hole' ? 'Down by the quay. You\'ll see the wolves before you see the calf.' : 'Annis is up at the try-works. Go on. Tell her what you saw.') },
};

const annisNodes: Record<string, DNode> = {
  ac1: { text: 'The calf. Yes. I\'ve had Bram up here already with his iron in his hand and that look on him.', next: 'ac2' },
  ac2: { text: 'Let me tell you what a calf is. It\'s three hundred gallons. It\'s the Grice boy\'s medicine and the Coulters\' coal and the try-works kept on all winter, which is twelve men in work. That\'s what a calf is, to the reeve.', next: 'ac3' },
  ac3: { text: 'And to Elsie it\'s a baby in a net, and she\'s not wrong either. You saw it. You\'re not from here. Tell me what you\'d do, and I\'ll tell you if I\'ll do it.', next: 'ac4' },
  ac4: {
    text: 'Well?',
    options: [
      { text: 'Cut it a channel and let it out. Hookness will manage.', moral: { id: 'skCalf:freed', a: 5, tr: { compassion: 4 }, npc: { annis: -10, elsie_fenwick: 20, bram_ellery: -15 }, note: 'Had a whale calf cut loose from the nets under Hookness quay and let out to sea, though the town needed the oil.', fame: 'got the whale calf out of Hookness bay', spread: 'local' }, effect: (g) => { g.setFlag(CALF, 'freed'); g.addMarks(70); g.setStage(CALF, 'done'); }, next: 'acF' },
      { text: 'Let Bram take it. Twelve men in work, and medicine for the Grice boy.', moral: { id: 'skCalf:taken', tr: { compassion: -2, loyalty: 2 }, npc: { annis: 10, elsie_fenwick: -15, bram_ellery: 15 } }, effect: (g) => { g.setFlag(CALF, 'taken'); g.addMarks(70); g.setStage(CALF, 'done'); }, next: 'acT' },
      { text: 'Ring the bell and ask them. If the town cuts it free, it\'s Hookness\'s choice, not yours or mine.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'skCalf:town', a: 6, tr: { compassion: 2, honesty: 2 }, npc: { annis: 10, elsie_fenwick: 20, bram_ellery: 5 }, note: 'Put the whale calf in Hookness bay to the whole town, and Hookness cut it free together.', major: true, fame: 'had all Hookness on the quay to free the calf', spread: 'local' }, effect: (g) => { g.setFlag(CALF, 'town'); g.addMarks(90); g.setStage(CALF, 'done'); }, next: 'acW' },
      { text: 'Mara Coyle\'s boat would pay better than your try-works for a calf\'s oil.', need: { band: ['bad', 'evil'] }, moral: { id: 'skCalf:sold', a: -10, tr: { greed: 5, cruelty: 2 }, npc: { annis: -20, elsie_fenwick: -30 }, note: 'Sold a trapped whale calf\'s oil out from under Hookness to a Saltpenny boat.', major: true, fame: 'sold Hookness\'s calf to Saltpenny', spread: 'local' }, effect: (g) => { g.setFlag(CALF, 'sold'); g.addMarks(160); g.setStage(CALF, 'done'); }, next: 'acS' },
    ],
  },
  acF: { text: 'And Hookness goes short, and I\'ll be the one telling the Grice woman why. Very well. I\'ll send the men down with knives. Don\'t stand in front of me in February.' },
  acT: { text: 'Then Bram has it. He\'ll do it clean; he always does. I\'ll not ask you to watch. Elsie won\'t speak to either of us till spring.' },
  acW: { speaker: 'narrator', text: 'Annis looks at you a long time, then reaches up and rings the try-works bell. By noon half of Hookness is on the quay and in the boats with knives, Bram among them with his iron left on the steps. Nobody says much. When the last strand goes, the calf rolls free and goes out past the quay end like a cork out of a bottle, and the whole town cheers, Annis loudest.' },
  acS: { text: 'Saltpenny. You\'d sell Hookness\'s oil to Mara Coyle out of Hookness\'s own bay. Get out of my try-works. And don\'t think the town won\'t hear it.' },
  acAfter: {
    text: (g) => {
      const f = g.flag(CALF);
      if (f === 'freed') return 'We\'re short. We\'ll manage. Bram says he saw it in the sound in March with its mother. Bram\'s a liar, but I hope he isn\'t.';
      if (f === 'town') return 'The best morning Hookness has had in twenty years, and it cost three hundred gallons. Funny old place.';
      if (f === 'taken') return 'The try-works smoked all winter. The Grice boy\'s well. That\'s what it was for.';
      return 'Nothing to say to you.';
    },
  },
};

// ================================================================ The Char Derby

const robinNodes: Record<string, DNode> = {
  rd1: { text: 'The Derby! Once a winter, on Sickle Water. Heaviest char by dark takes the purse, and the purse is twenty marks and a free winter of ale. Everybody fishes. Even you.', next: 'rd2' },
  rd2: {
    text: 'Three pitches each along the quay, drawn by lot. Mind the bear; he comes to see what everyone\'s doing.',
    options: [{ text: 'I\'ll fish the Derby.', effect: (g) => g.setStage(DERBY, 'fish') }, { text: 'Not this winter.' }],
  },
  rdWait: { text: (g) => (at(g, DERBY) === 'fish' ? `Your three pitches along the quay. ${fished(g)} fished. Weigh in here by dark.` : 'Well? Put it on the scale.') },
  rd9: { speaker: 'narrator', text: 'The Knife is full and steaming. On the board behind the bar, chalked: PIP FENWICK, 6 LB 2 OZ. Pip is by the fire, holding his fish like a baby, and his mother has her hand over her mouth. Your char, on your tray, is bigger.', next: 'rd10' },
  rd10: { text: 'Well, then. Let\'s have it on the scale.', next: 'rd11' },
  rd11: {
    text: '(Pip\'s mother fishes alone with an auger her husband bought. It\'s worn to a stub.)',
    options: [
      { text: '(Put your char on the scale.)', moral: { id: 'skDerby:won', tr: { honesty: 2 }, npc: { pip_fenwick: -5, robin_grice: 5 } }, effect: (g) => { g.take('sk_char', 1); g.setFlag(DERBY, 'won'); g.addMarks(20); g.setStage(DERBY, 'done'); }, next: 'rW' },
      { text: '(Let your char slip off the tray and back out the door into the snow.)', moral: { id: 'skDerby:slipped', a: 3, tr: { compassion: 3, deception: 1 }, npc: { pip_fenwick: 10 } }, effect: (g) => { g.take('sk_char', 1); g.setFlag(DERBY, 'slipped'); g.setStage(DERBY, 'done'); }, next: 'rS' },
      { text: '(Win, and put the purse in Pip\'s hands in front of the whole Knife.)', need: { trait: { generosity: [57, 100] } }, moral: { id: 'skDerby:given', a: 5, tr: { generosity: 3, honesty: 2 }, npc: { pip_fenwick: 20, elsie_fenwick: 15, robin_grice: 10 }, note: 'Won the Char Derby at Hookness and gave the purse to Pip Fenwick for his mother\'s auger.', fame: 'won the Char Derby and gave Pip Fenwick the purse', spread: 'local' }, effect: (g) => { g.take('sk_char', 1); g.setFlag(DERBY, 'given'); g.setStage(DERBY, 'done'); }, next: 'rG' },
    ],
  },
  rW: { text: 'Seven pound four! The Derby goes to the stranger! Twenty marks and a winter\'s ale. Pip, lad, second\'s a fine thing. Second\'s nearly first.' },
  rS: { speaker: 'narrator', text: 'Your tray comes up empty, which you explain badly. Pip Fenwick\'s six pounds two takes the Derby. His mother cries. Robin looks at you a long moment over the scale, says nothing at all, and pours you an ale on the house.' },
  rG: { speaker: 'narrator', text: 'Seven pound four, and the Knife cheers, and then you put the purse into Pip\'s hands, and the Knife goes quiet, and then it cheers louder than before. His mother doesn\'t cry. She shakes your hand for a long time instead, which is worse.' },
  rdAfter: { text: (g) => (g.flag(DERBY) === 'slipped' ? 'Next winter, hold on to your fish. Butterfingers.' : g.flag(DERBY) === 'given' ? 'Pip\'s mother has a new auger. She brought me a char to say thank you, and I don\'t even know what for.' : 'Champion of the Derby! Your ale\'s on the slate. The free part\'s on the slate.') },
};

const quests: Record<string, QuestDef> = {
  [CALF]: {
    id: CALF, name: 'The Calf in the Bay', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hole') return 'A whale calf has fouled itself in the old net-pens under Hookness quay, and the ice wolves are waiting on the shore for it to tire. Elsie Fenwick wants them seen off.';
      if (s === 'look') return 'The wolves are gone. The calf is under the quay.';
      if (s === 'annis') return 'A calf is three hundred gallons of oil to Hookness. It\'s Annis Kettlewell\'s say, up at the try-works.';
      const f = g.flag(CALF);
      return f === 'freed' ? 'The calf was cut loose and went out to sea. Hookness goes short.' : f === 'town' ? 'All Hookness cut the calf free together.' : f === 'taken' ? 'Bram took the calf, and the try-works smoked all winter.' : 'I sold the calf\'s oil to a Saltpenny boat.';
    },
    objectives: (g, s) => (s === 'hole' ? [{ text: `See the ice wolves off the shore (${Math.min(WOLVES.length, killed(g, 'skWolves'))}/${WOLVES.length})`, done: killed(g, 'skWolves') >= WOLVES.length }]
      : s === 'look' ? [{ text: 'Look over the quay at the calf', marker: 'skHole' }] : s === 'annis' ? [{ text: 'Talk to Annis Kettlewell at the try-works', marker: 'annis' }] : []),
    advance: (g, s) => (s === 'hole' && killed(g, 'skWolves') >= WOLVES.length ? 'look' : null),
    marks: (g, s): Marks => (!s && at(g, 'sickleIce') === 'done' ? { elsie_fenwick: '!' } : s === 'annis' ? { annis: '?' } : {}),
    walk: { cast: ['elsie_fenwick', 'annis'], kill: { hole: [['icewolf', 2]] }, from: { quests: { sickleIce: 'done' }, flags: { pipTold: 'quiet' } } },
  },
  [DERBY]: {
    id: DERBY, name: 'The Char Derby', region: 'sickle', depth: 'quest',
    notes: (g, s) => {
      if (s === 'fish') return 'The Flensing Knife\'s Char Derby on Sickle Water: heaviest char by dark takes the purse. My three pitches are along the quay. There\'s a bear.';
      if (s === 'weigh') return 'I have the best char of the day, by a long way. Weigh in at the Flensing Knife.';
      const f = g.flag(DERBY);
      return f === 'won' ? 'I won the Char Derby.' : f === 'slipped' ? 'My char slipped back out into the snow, and Pip Fenwick won the Derby.' : 'I won the Char Derby and gave Pip the purse.';
    },
    objectives: (g, s) => (s === 'fish' ? [...DERBY_HOLES.map((_, i) => ({ text: `Fish your ${['first', 'second', 'third'][i]} pitch`, done: !!g.flag('skHole' + i), marker: 'skHole' + i })), { text: `See off the bear (${Math.min(1, killed(g, 'skBear'))}/1)`, done: killed(g, 'skBear') >= 1 }]
      : s === 'weigh' ? [{ text: 'Weigh in at the Flensing Knife', marker: 'robin_grice' }] : []),
    advance: (g, s) => (s === 'fish' && fished(g) >= DERBY_HOLES.length && killed(g, 'skBear') >= 1 ? 'weigh' : null),
    marks: (_g, s): Marks => (!s ? { robin_grice: '!' } : s === 'weigh' ? { robin_grice: '?' } : {}),
    walk: { cast: ['robin_grice'], kill: { fish: [['icebear', 1]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'skWolves', type: 'icewolf', at: WOLVES, when: (g) => at(g, CALF) === 'hole' },
  { tag: 'skBear', type: 'icebear', at: BEAR, when: (g) => at(g, DERBY) === 'fish' },
];

const HOLE_TOASTS = [
  'You drop your line off the quay into the green water. A long wait, cold fingers, a nibble, and a char the length of your hand. Not a Derby fish.',
  'Nothing for an hour. Then something takes the line hard and runs, and you nearly lose it against the quay piles. A good char: three pounds, maybe.',
  'The light\'s going. The line goes tight, then heavy, then alive, and up over the edge comes a char as long as your arm, red-bellied and furious. Seven pounds if it\'s an ounce.',
];

const things: WorldThing[] = [
  { id: 'skHole', x: HOLE.x, z: HOLE.z, label: 'Look over the quay edge', radius: 2.8, look: 'none',
    when: (g) => at(g, CALF) === 'look',
    use: (g) => { g.setStage(CALF, 'annis'); g.toast('Under the quay, in the green water, the old herring pens, and in them a grey back the size of a rowing boat with the net wrapped twice round its tail. It rolls up, blows a cloud of warm, fishy breath into your face, and sinks again. An eye, very dark, looks at you on the way down.'); } },
  ...DERBY_HOLES.map(([x, z], i): WorldThing => ({
    id: 'skHole' + i, x, z, label: 'Fish here', radius: 2.4, look: 'none',
    when: (g) => at(g, DERBY) === 'fish' && !g.flag('skHole' + i),
    use: (g) => { g.setFlag('skHole' + i, 1); if (i === 2) g.give('sk_char', 1); g.toast(HOLE_TOASTS[i]); },
  })),
];

const ITEMS: ItemDef[] = [
  { id: 'sk_char', name: 'A Derby char', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'fish', a: '#c84a2a', b: '#4a5a6a' }, desc: 'A frost char as long as your arm, red-bellied, and about seven pounds. The best fish of the Derby, by a long way.' },
];

export const SICKLE_MORE: RegionContent = {
  id: 'sickleMore',
  items: ITEMS,
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'elsie_fenwick', (g) => {
      const s = at(g, CALF);
      return s === 'hole' || s === 'look' || s === 'annis' ? 'ecWait' : undefined;
    }, elsieNodes);
    addOption(D, 'elsie_fenwick', 'hello', { text: 'You keep looking out at the bay. What is it?', cond: (g) => !at(g, CALF), next: 'ec1' });
    hook(D, 'annis', (g) => (at(g, CALF) === 'annis' ? 'ac1' : undefined), annisNodes);
    hook(D, 'robin_grice', (g) => {
      const s = at(g, DERBY);
      if (s === 'fish') return 'rdWait';
      if (s === 'weigh') return g.count('sk_char') > 0 ? 'rd9' : 'rdWait';
      return undefined;
    }, robinNodes);
    addOption(D, 'robin_grice', 'hello', { text: 'I hear there\'s a Derby.', cond: (g) => !at(g, DERBY), next: 'rd1' });
    addOption(D, 'robin_grice', 'hello', { text: 'About the Derby.', cond: (g) => at(g, DERBY) === 'done', next: 'rdAfter' });
  },
};
