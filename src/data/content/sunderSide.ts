import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { MORROW_OX, SLABS, TOWNS } from '../../world/morrow';

// Two more for the Sunder, where Liftwick farms the hanging stone (world/sites.ts: the rope bridges from the
// rim out over the slabs, the skyfarm on the big one, the falls off the fourth).
//
// lfRopes, FRAYED ROPES (Josep Font, the bridge-keeper): the slab-crawlers chew the bridges' ropes for the
// tar. Thin them out, then look at the three anchors. The third rope wasn't chewed: it was cut, and the knife
// was Pol Vidal's. His father fell off the old bridge eleven years ago, and the Assembly has promised a stone
// bridge every year since. A cut rope would get it built. 'crawlers' -> 'anchors' -> 'josep' -> done.
// Choice lfRopes = 'assembly' (the clerk hears it; Pol is fined; the stone bridge is ordered) | 'quiet'.
//
// lfDrop, WHAT THE RIFT KEEPS (Rosa Vidal, Pol's sister): what goes off the slabs washes up at the foot of the
// falls, where the rift wolves den. Their father's tally box went with him. Thin the wolves and look at the
// falls' foot: the box is there, his book of how high the slabs stood each year, and a letter to Marta
// he never sent. 'wolves' -> 'falls' -> 'rosa' -> done. Choice lfDrop = 'rosa' | 'marta' (sent to Callis).

const ROPES = 'lfRopes', DROP = 'lfDrop';
const LW = TOWNS.liftwick, PX = LW.post[0], PZ = LW.post[1];
const [A, Bs, C, D] = SLABS;
/** Where each bridge is made fast: the rim's end, and the far ends on the first and second slabs. */
const ANCHORS: [string, number, number, string][] = [
  ['lfAnchor1', MORROW_OX + 1470.5, 291.5, 'The rim anchor. The rope is chewed half through above the knot, the way crawlers do it: ragged, tar licked off. Josep can splice that.'],
  ['lfAnchor2', A[0] + A[2] - 1.5, A[1] + 2.5, 'The first slab\'s anchor. Chewed again, and crawler droppings all round the post. Nothing Josep hasn\'t seen.'],
  ['lfAnchor3', Bs[0] - 1.5, Bs[1] + Bs[3] - 0.5, 'The anchor on the second slab, to the skyfarm. This one is clean: a straight cut, three strands of four, the last left to part on its own. A knife did this. Wedged in the post is a horn button off a skyfarmer\'s coat.'],
];
const anchored = (g: GameApi) => ANCHORS.filter(([id]) => g.flag(id)).length;
const crawlers = (g: GameApi) => Math.min(6, killed(g, 'type:slabcrawler') - Number(g.flag(ROPES + ':base') ?? 0));
const wolves = (g: GameApi) => Math.min(4, killed(g, 'type:riftwolf') - Number(g.flag(DROP + ':base') ?? 0));
/** The foot of the falls off the fourth slab, on the rift floor. */
const FALLS: [number, number] = [D[0] + D[2] + 2.5, D[1] + 3.5];

const npcs: NpcDef[] = [
  {
    land: 'morrow', id: 'josep_font', name: 'Josep Font', title: 'Bridge-keeper, Liftwick',
    look: { skin: '#c89070', hair: '#5a5a54', hairStyle: 0, facial: 3, eyes: '#4a3a2a', tunic: '#4a4a3a', trim: '#c8a050', trousers: '#3a3430', boots: '#2a2018', hat: 'wide', hatColor: '#3a3428', build: 1.1, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [MORROW_OX + 1468.5, 286.5], face: [MORROW_OX + 1470.5, 291], anim: 'idle' }],
    barks: ['Mind the third plank. Mind all of them.', 'Rope\'s only as good as the tar on it.'],
  },
  {
    land: 'morrow', id: 'rosa_vidal', name: 'Rosa Vidal', title: 'Skyfarmer, Liftwick',
    look: { skin: '#d8a882', hair: '#2a1e14', hairStyle: 2, lashes: true, eyes: '#4a3a2a', tunic: '#6a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a2018', hat: 'straw', age: 0.25 },
    schedule: [{ from: 0, to: 24, at: [PX - 6, PZ + 3], face: [PX - 6, PZ + 8], anim: 'idle' }],
    barks: ['Pol thinks I don\'t know where he goes at night.', 'The falls are loud tonight.'],
  },
];

// ---------------------------------------------------------------- Frayed Ropes
const josep: DialogueTree = {
  start: (g) => (!at(g, ROPES) ? 'r1' : at(g, ROPES) === 'josep' ? 'r6' : at(g, ROPES) === 'done' ? 'rAfter' : 'rWait'),
  nodes: {
    r1: {
      text: 'Josep Font. I keep the bridges. That means I splice what the crawlers chew, every morning, before the farmers go over.',
      options: [{ text: 'The crawlers chew rope?', next: 'r2' }, { text: 'Good day.' }],
    },
    r2: {
      text: 'For the tar. There\'s more of them this year, and I\'m one man with one knee. Thin them off the slabs and I\'ll look at the anchors after.',
      options: [{ text: 'I\'ll thin them out.', effect: (g) => { g.setFlag(ROPES + ':base', killed(g, 'type:slabcrawler')); g.setStage(ROPES, 'crawlers'); } }, { text: 'Not today.' }],
    },
    rWait: {
      text: (g) => (at(g, ROPES) === 'crawlers' ? `Six of them, off the slabs. ${crawlers(g)} so far.` : `Look at the anchors, all three, and tell me how bad. ${anchored(g)} of three.`),
      options: [{ text: 'Going.' }],
    },
    r6: {
      text: 'Two chewed. And the third?',
      options: [{ text: 'Cut. With a knife. And this button was in the post.', next: 'r7' }],
    },
    r7: {
      text: 'He turns the button over and doesn\'t look at you. "That\'s Pol\'s. His mother sewed them on, horn from the Callis market."',
      options: [{ text: 'Why would Pol cut his own bridge?', next: 'r8' }],
    },
    r8: {
      text: 'His father went off the old bridge eleven years back. The Assembly\'s promised a stone one every spring since. A rope that fails might get it built.',
      options: [{ text: 'Someone could have died.', next: 'r9' }],
    },
    r9: {
      text: 'Someone did, once. That\'s the trouble. The lift clerk at the tower would want to know. Or I splice it and say nothing. Your say. You found it.',
      options: [
        { text: 'Tell the clerk. Pol answers for it, and the bridge gets built.', next: 'rTell' },
        { text: 'Splice it. Talk to Pol yourself.', next: 'rQuiet' },
      ],
    },
    rTell: {
      text: 'Then he\'ll be fined, and he\'ll pay it, and he\'ll have his bridge. He\'ll never forgive me for it. Or you.',
      options: [{ text: 'It\'s the right thing.', effect: (g) => { g.setFlag(ROPES, 'assembly'); g.addMarks(320); g.setStage(ROPES, 'done'); } }],
    },
    rQuiet: {
      text: 'I\'ll splice it tonight and walk him home after. He\'ll know I know. That might be enough. It might not.',
      options: [{ text: 'It\'s yours to judge.', effect: (g) => { g.setFlag(ROPES, 'quiet'); g.addMarks(320); g.setStage(ROPES, 'done'); } }],
    },
    rAfter: {
      text: (g) => (g.flag(ROPES) === 'assembly'
        ? 'They\'ve sent masons. Stone, from the rim to the first slab. Pol works beside them and doesn\'t speak to me.'
        : 'All three ropes good this morning. Pol brought me tar last week. Didn\'t say why. Didn\'t need to.'),
      options: [{ text: 'Good day, Josep.' }],
    },
  },
};

// ---------------------------------------------------------------- What the Rift Keeps
const rosa: DialogueTree = {
  start: (g) => (!at(g, DROP) ? 'd1' : at(g, DROP) === 'rosa' ? 'd6' : at(g, DROP) === 'done' ? 'dAfter' : 'dWait'),
  nodes: {
    d1: {
      text: 'Rosa Vidal. Pol\'s sister, the one who doesn\'t climb. You\'ve been down in the rift? Everything that goes off the slabs ends up at the foot of the falls.',
      options: [{ text: 'Something of yours?', next: 'd2' }, { text: 'Good day.' }],
    },
    d2: {
      text: 'My father\'s. He went off the old bridge with his tally box under his arm. Eleven years. The wolves den by the falls now, so nobody goes and looks.',
      options: [{ text: 'I\'ll look.', next: 'd3' }, { text: 'Not now.' }],
    },
    d3: {
      text: 'Clear the wolves first. They come at anyone near their den. Four of them, Pol says, though Pol says a lot of things.',
      options: [{ text: 'Four wolves, then the falls.', effect: (g) => { g.setFlag(DROP + ':base', killed(g, 'type:riftwolf')); g.setStage(DROP, 'wolves'); } }],
    },
    dWait: {
      text: (g) => (at(g, DROP) === 'wolves' ? `The wolves first. ${wolves(g)} of four.` : 'The foot of the falls, off the fourth slab. Look in the pool and under the stones.'),
      options: [{ text: 'Going.' }],
    },
    d6: {
      text: 'She takes the box in both hands and opens it on her knees. A book, swollen and dry again, and a folded letter, sealed.',
      options: [{ text: 'What\'s in the book?', next: 'd7' }],
    },
    d7: {
      text: 'How high every slab stood, every spring, for twenty years. In his hand. He knew they were rising before anyone believed Pol.',
      options: [{ text: 'And the letter?', next: 'd8' }],
    },
    d8: {
      text: 'It\'s to Mother, in Callis. He never sent it. I could open it. Or it could go to her, sealed, the way he meant it to.',
      options: [
        { text: 'Read it. It\'s yours as much as hers.', next: 'dRead' },
        { text: 'Send it to her, sealed.', next: 'dSend' },
      ],
    },
    dRead: {
      text: 'She reads it twice. "He was coming down to Callis. That spring. He\'d have left the slabs." She folds it very small and keeps it.',
      options: [{ text: 'I\'m sorry, Rosa.', effect: (g) => { g.setFlag(DROP, 'rosa'); g.addMarks(300); g.give('sky_honey', 2); g.setStage(DROP, 'done'); } }],
    },
    dSend: {
      text: 'The packet goes Thursday. She\'ll know his hand before she opens it. Whatever it says, it\'s hers. Thank you for bringing him up out of there.',
      options: [{ text: 'Write to me if she answers.', effect: (g) => { g.setFlag(DROP, 'marta'); g.addMarks(300); g.give('sky_honey', 2); g.setStage(DROP, 'done'); } }],
    },
    dAfter: {
      text: (g) => (g.flag(DROP) === 'marta'
        ? 'Mother wrote back. Three pages. The last line says she\'s coming up in spring. She hasn\'t been up since.'
        : 'I keep the book on the shelf by the door. Pol reads it at night when he thinks I\'m asleep.'),
      options: [{ text: 'Good day, Rosa.' }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [ROPES]: {
    id: ROPES, name: 'Frayed Ropes', region: 'sunder', depth: 'quest',
    notes: (g, s) => {
      if (s === 'crawlers') return `The slab-crawlers chew Liftwick's bridge ropes for the tar. Josep Font, the bridge-keeper, wants six of them gone from the slabs. (${crawlers(g)}/6)`;
      if (s === 'anchors') return `Josep wants all three bridge anchors looked at. (${anchored(g)}/3)`;
      if (s === 'josep') return 'Two anchors chewed. The third was cut with a knife, and a horn button was wedged in the post. Josep should see it.';
      return g.flag(ROPES) === 'assembly' ? 'Pol Vidal cut the rope to force the Assembly\'s hand. The lift clerk heard it; Pol was fined, and the stone bridge is building.' : 'Pol Vidal cut the rope. Josep spliced it and walked him home, and nobody else heard.';
    },
    objectives: (g, s) => (s === 'crawlers' ? [{ text: `Thin the slab-crawlers (${crawlers(g)}/6)` }]
      : s === 'anchors' ? ANCHORS.map(([id], i) => ({ text: ['The rim anchor', 'The first slab\'s anchor', 'The second slab\'s anchor'][i], done: !!g.flag(id), marker: id }))
      : s === 'josep' ? [{ text: 'Show Josep Font the button', marker: 'josep_font' }] : []),
    advance: (g, s) => (s === 'crawlers' && crawlers(g) >= 6 ? 'anchors' : null),
    marks: (_g, s): Marks => (s === 'josep' ? { josep_font: '?' } : !s ? { josep_font: '!' } : {}),
    walk: { cast: ['josep_font'], kill: { crawlers: [['slabcrawler', 6]] } },
  },
  [DROP]: {
    id: DROP, name: 'What the Rift Keeps', region: 'sunder', depth: 'quest',
    notes: (g, s) => {
      if (s === 'wolves') return `Rosa Vidal's father went off the old bridge with his tally box eleven years ago. What falls from the slabs washes up at the foot of the falls, where the rift wolves den. Four of them first. (${wolves(g)}/4)`;
      if (s === 'falls') return 'The wolves are thinned. Look at the foot of the falls off the fourth slab.';
      if (s === 'rosa') return 'Joan Vidal\'s tally box, under the stones at the falls\' foot. Rosa should have it.';
      return g.flag(DROP) === 'marta' ? 'The box went to Rosa, and the sealed letter to her mother in Callis. Marta is coming up in spring.' : 'Rosa read her father\'s last letter. He was going to leave the slabs that spring.';
    },
    objectives: (g, s) => (s === 'wolves' ? [{ text: `Thin the rift wolves (${wolves(g)}/4)` }]
      : s === 'falls' ? [{ text: 'Search the foot of the falls', marker: 'lfFalls' }]
      : s === 'rosa' ? [{ text: 'Bring Rosa her father\'s box', marker: 'rosa_vidal' }] : []),
    advance: (g, s) => (s === 'wolves' && wolves(g) >= 4 ? 'falls' : null),
    marks: (_g, s): Marks => (s === 'rosa' ? { rosa_vidal: '?' } : !s ? { rosa_vidal: '!' } : {}),
    walk: { cast: ['rosa_vidal'], kill: { wolves: [['riftwolf', 4]] } },
  },
};

export const SUNDER_SIDE_CONTENT: RegionContent = {
  id: 'sunderSide', npcs, quests, dialogue: { josep_font: josep, rosa_vidal: rosa },
  things: [
    ...ANCHORS.map(([id, x, z, text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Look at the bridge anchor', radius: 2.4,
      when: (g: GameApi) => at(g, ROPES) === 'anchors' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (anchored(g) >= 3) g.setStage(ROPES, 'josep'); },
    })),
    {
      land: 'morrow' as const, id: 'lfFalls', x: FALLS[0], z: FALLS[1], label: 'Search the foot of the falls', radius: 3,
      when: (g: GameApi) => at(g, DROP) === 'falls',
      use: (g: GameApi) => { g.setStage(DROP, 'rosa'); g.toast('Under a shelf of stone, out of the spray: a tally box, its brass corners green, JOAN VIDAL burnt into the lid. It\'s heavier than it looks.'); },
    },
  ],
};
