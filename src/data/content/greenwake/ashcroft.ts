import type { DialogueTree, GameApi } from '../../../game/api';
import { at, hook, killed, type Marks } from '../kit';
import type { RegionContent } from '../types';

// The Ashcroft farm and the sheep pen.
// THREE WINTERS (storyline, two quests): track Old Notch to his den, kill him, and decide what
//   happens to the fang. Outcome flag notchFang = 'ruth' | 'kept' | 'sold'.
// DUCHESS (posting): the lost hen. Dilly hid her from the pot. Outcome duchessChoice = 'truth' | 'spare';
//   in 'spare' Dilly isn't in trouble and Duchess goes in the pot.
// THIRTY SHEEP (short): Elspeth Cole's strays, and one that isn't hers.

const N1 = 'gwNotch1', N2 = 'gwNotch2', DUCH = 'gwDuchess', STRAYS = 'gwStrays';
const signs = (g: GameApi) => ['notchFleece', 'notchPrints', 'notchDen'].filter((f) => g.flag(f)).length;

const ruth: DialogueTree = {
  start: (g) => {
    if (at(g, N1) === 'ruth') return 'n4';
    if (at(g, N2) === 'ruth') return 't1';
    if (at(g, DUCH) === 'ask') return 'd1';
    if (at(g, DUCH) === 'ruth') return 'dr1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        if (at(g, N2) === 'done') return g.flag('notchFang') === 'ruth' ? 'Fang\'s over the barn door. My grandmother had four. I\'ve got one. It\'s a start.' : 'Fifteen ewes again, near enough. Elspeth sold me two. She charged me for three.';
        return 'Twelve ewes. Was fifteen.';
      },
      options: [
        { text: 'What happened to the other three?', next: 'n1', cond: (g) => !at(g, N1) },
        { text: 'Bye.' },
      ],
    },
    n1: { text: 'Old Notch. Big grey wolf, torn ear. He\'s had three of mine since harvest, and one of Elspeth Cole\'s, which she mentions.', next: 'n2' },
    n2: { text: 'Ashcrofts have been after him three winters. My brother set traps. Notch set them off and ate the bait.', next: 'n3' },
    n3: {
      text: 'I want to know where he lies up. Not where he hunts. Where he sleeps.',
      options: [{ text: 'I\'ll track him.', next: 'n3b' }, { text: 'Not today.' }],
    },
    n3b: {
      text: 'Start at my pen. He comes over the fence by the far post. Then follow your nose. He doesn\'t smell of roses.',
      effect: (g) => g.setStage(N1, 'signs'),
    },
    n4: { text: 'Well?', options: [{ text: 'He dens under the Lantern. He\'s missing a toe on the front left.', next: 'n5' }] },
    n5: { text: 'The Lantern. Course he does. The young ones go up there to kiss each other and he lies underneath and listens.', next: 'n6' },
    n6: {
      text: 'Missing a toe. That\'ll be my brother\'s trap, then. So it did something.',
      effect: (g) => { g.addMarks(10); g.setStage(N1, 'done'); },
    },
    // The torn ear
    t1: {
      text: 'You\'ve been up the Lantern. I can see it on you.',
      options: [
        { text: 'Show her the fang.', next: 't2', cond: (g) => g.has('notch_fang') },
        { text: 'He\'s dead. I sold the fang.', next: 'sold', cond: (g) => !g.has('notch_fang') },
      ],
    },
    t2: { speaker: 'narrator', text: 'She turns it over and holds it up to the light, the way Ashcrofts hold things up when they\'re deciding what they\'re worth.', next: 't3' },
    t3: { text: 'Three winters.', next: 't4' },
    t4: {
      text: 'Ashcrofts nail a fang over the barn door when they\'ve had a wolf. My grandmother had four. I\'d like this one up there. It\'s yours to give, though.',
      options: [
        { text: 'Nail it over the barn door.', next: 'give' },
        { text: 'I\'ll keep it.', next: 'keep' },
      ],
    },
    give: {
      text: 'I\'ll tell people you did it. They\'ll say I paid you. Let them. Here: two hams, smoked over the old wood.',
      effect: (g) => { g.take('notch_fang'); g.give('ashcroft_ham', 2); g.addMarks(25); g.setFlag('notchFang', 'ruth'); g.setStage(N2, 'done'); },
    },
    keep: {
      text: 'Keep it, then. You killed him. Tamsin will offer you thirty for it. Make her say forty.',
      effect: (g) => { g.addMarks(10); g.setFlag('notchFang', 'kept'); g.setStage(N2, 'done'); },
    },
    sold: {
      text: 'Sold it. Well. You killed him, and that\'s the main thing. The fang was only ever for the door.',
      effect: (g) => { g.addMarks(10); g.setFlag('notchFang', 'sold'); g.setStage(N2, 'done'); },
    },
    // Duchess
    d1: { text: 'Duchess. Brown, speckled, opinions. She went missing the day after I said she\'d go in the pot on fifthday.', next: 'd2' },
    d2: {
      text: 'I said it in the kitchen. Nobody there but me and Dilly, under the table, being a cat.',
      effect: (g) => g.setStage(DUCH, 'search'),
    },
    dr1: { text: 'Duchess!', next: 'dr1b' },
    dr1b: { speaker: 'narrator', text: 'Duchess says something unkind.', next: 'dr2' },
    dr2: {
      text: 'Where was she?',
      options: [
        { text: 'Dilly hid her in the reeds. She heard you say the pot.', next: 'truth' },
        { text: 'Wandering about the Wetlings.', next: 'spare' },
      ],
    },
    truth: { text: 'Did she.', next: 'truth2' },
    truth2: { speaker: 'narrator', text: 'Ruth looks at the hen, and then across towards the square, where Dilly is very busy not looking this way.', next: 'truth3' },
    truth3: {
      text: 'She lays twice a week. That\'s not nothing. She can stay out of the pot as long as Dilly feeds her, every morning, and finds out what that\'s like.',
      effect: (g) => { g.take('duchess'); g.addMarks(15); g.setFlag('duchessChoice', 'truth'); g.setStage(DUCH, 'done'); },
    },
    spare: { text: 'Wandering. Hens don\'t wander as far as the Wetlings. But all right.', next: 'spare2' },
    spare2: {
      text: 'Back in the run with you, madam. Fifthday\'s fifthday.',
      effect: (g) => { g.take('duchess'); g.addMarks(15); g.setFlag('duchessChoice', 'spare'); g.setStage(DUCH, 'done'); },
    },
  },
};

const elspeth: DialogueTree = {
  start: (g) => (at(g, STRAYS) === 'elspeth' ? 'e3' : at(g, STRAYS) === 'find' ? 'ewait' : 'main'),
  nodes: {
    main: {
      text: (g) => (at(g, STRAYS) === 'done' ? 'Thirty. I counted twice. I always count twice.' : 'Twenty-seven. I count thirty in the morning and twenty-seven by noon, and I count twice.'),
      options: [{ text: 'Where do they go?', next: 'e1', cond: (g) => !at(g, STRAYS) }, { text: 'Bye.' }],
    },
    e1: { text: 'Through the fence. One always goes to the mill, for the spilled grain. One goes to the Wetlings, because she\'s stupid. One goes to the wood, because she\'s clever.', next: 'e2' },
    e2: {
      text: 'My knees don\'t do the wood any more. If you drive them back, I\'ll count them.',
      options: [{ text: 'I\'ll bring them in.', effect: (g) => g.setStage(STRAYS, 'find') }, { text: 'Bye.' }],
    },
    ewait: { text: 'Mill, Wetlings, wood. The clever one hides behind the stupid one if she can.' },
    e3: { text: 'Thirty.', next: 'e4' },
    e4: { speaker: 'narrator', text: 'She counts them again, under her breath.', next: 'e5' },
    e5: { text: 'Thirty-one.', next: 'e6' },
    e6: {
      text: 'That one\'s an Ashcroft ewe. Got in with mine. Don\'t tell Ruth I counted it. I\'ll walk it back myself, in daylight, slowly, so she sees.',
      effect: (g) => { g.addMarks(12); g.setStage(STRAYS, 'done'); },
    },
  },
};

const stray = (n: number, x: number, z: number, where: string) => ({
  id: 'stray' + n, x, z, label: 'Drive the ewe home', radius: 2.8,
  when: (g: GameApi) => at(g, STRAYS) === 'find' && !g.flag('stray' + n),
  use: (g: GameApi) => {
    g.setFlag('stray' + n);
    g.toast(where);
    if (['stray1', 'stray2', 'stray3'].every((f) => g.flag(f))) g.setStage(STRAYS, 'elspeth');
  },
});

const sign = (id: string, x: number, z: number, label: string, text: string) => ({
  id, x, z, label, radius: 2.6,
  when: (g: GameApi) => at(g, N1) === 'signs' && !g.flag(id),
  use: (g: GameApi) => {
    g.setFlag(id);
    g.toast(text);
    if (signs(g) >= 3) g.setStage(N1, 'ruth');
  },
});

export const GW_ASHCROFT: RegionContent = {
  id: 'greenwake-ashcroft',
  items: [
    { id: 'ashcroft_ham', name: 'Ashcroft ham', kind: 'food', rarity: 'uncommon', stack: true, value: 12, icon: { shape: 'cooked', a: '#a8584a' }, desc: 'Smoked over old apple wood. Ruth won\'t say how old.', heal: 70, stats: 'Restores 70 health.' },
    { id: 'duchess', name: 'Duchess', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'cooked', a: '#8a5a3a' }, desc: 'A brown speckled hen with opinions. All of them about you.' },
  ],
  dialogue: { ruth, elspeth },
  things: [
    sign('notchFleece', 116.5, 230.5, 'Look at the far fence post', 'Tufts of fleece on the top rail, and a smear on the post: something went over here carrying weight.'),
    sign('notchPrints', 204.5, 246.5, 'Look at the ditch mud', 'Prints in the ditch mud, broad as your palm. The front left is missing a toe.'),
    sign('notchDen', 64.5, 259.5, 'Look under the fallen stones', 'Under the fallen stones at the Lantern\'s foot: a hollow scraped smooth, rank with wolf, and a ewe\'s bell with the clapper chewed off.'),
    {
      id: 'duchessReeds', x: 209.5, z: 233.5, label: 'Search the reeds', radius: 2.6, when: (g) => at(g, DUCH) === 'reeds',
      use: (g) => { if (g.give('duchess')) { g.toast('In a basket in the reeds, on a nest of stolen corn: a brown speckled hen, who looks at you with enormous disapproval.'); g.setStage(DUCH, 'ruth'); } },
    },
    stray(1, 108.5, 212.5, 'The ewe at the mill leaves the spilled grain with very bad grace.'),
    stray(2, 214.5, 250.5, 'The ewe in the Wetlings is standing in a ditch, baffled. She follows you out of it gratefully.'),
    stray(3, 228.5, 209.5, 'The ewe in the wood has found a patch of clover nobody else knows about. She doesn\'t want to leave it.'),
  ],
  quests: {
    [N1]: {
      id: N1, name: 'Three Winters', region: 'greenwake', depth: 'storyline', next: [N2, 'hunt'],
      notes: (g, s) => {
        if (s === 'signs') return `Old Notch, a big grey wolf with a torn ear, has taken three of Ruth Ashcroft's ewes since harvest. The Ashcrofts have been after him for three winters. Ruth wants to know where he dens. He comes over her pen fence by the far post. (${signs(g)}/3 signs found.)`;
        if (s === 'ruth') return 'Old Notch dens under the fallen stones at the foot of the Lantern. His front left foot is missing a toe. Ruth should know.';
        return 'Old Notch dens under the Lantern. The missing toe is from Ruth\'s brother\'s trap.';
      },
      objectives: (g, s) => {
        if (s === 'signs') return [
          { text: 'Look at the far post of Ruth\'s sheep pen', done: !!g.flag('notchFleece'), marker: 'notchFleece' },
          { text: 'Find his prints in the Wetlings', done: !!g.flag('notchPrints'), marker: 'notchPrints' },
          { text: 'Find his den', done: !!g.flag('notchDen'), marker: 'notchDen' },
        ];
        if (s === 'ruth') return [{ text: 'Tell Ruth Ashcroft where Notch dens', marker: 'ruth' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { ruth: '!' } : s === 'ruth' ? { ruth: '?' } : {}),
    },
    [N2]: {
      id: N2, walk: { kill: { hunt: [['notch', 1]] }, obtain: { ruth: [['notch_fang', 1]] }, from: { quests: { gwNotch1: 'done', gwNotch2: 'hunt' } } }, name: 'The Torn Ear', region: 'greenwake', depth: 'storyline',
      notes: (g, s) => {
        if (s === 'hunt') return 'Ruth Ashcroft wants Old Notch dead. He dens under the Lantern.';
        if (s === 'ruth') return 'Old Notch is dead. Ruth should hear it from me.';
        const f = g.flag('notchFang');
        if (f === 'ruth') return 'I gave Ruth Notch\'s fang, and she nailed it over the Ashcroft barn door. Her grandmother had four.';
        if (f === 'kept') return 'I kept Notch\'s fang. Ruth told me to make Tamsin offer forty for it.';
        return 'I\'d already sold Notch\'s fang. Ruth said the fang was only for the door.';
      },
      objectives: (g, s) => (s === 'hunt' ? [{ text: `Kill Old Notch at the Lantern (${Math.min(1, killed(g, 'type:notch'))}/1)`, marker: 'notchDen' }] : s === 'ruth' ? [{ text: 'Go back to Ruth Ashcroft', marker: 'ruth' }] : []),
      advance: (g, s) => (s === 'hunt' && (killed(g, 'type:notch') >= 1 || g.flag('notchKilled')) ? 'ruth' : null),
      marks: (_g, s): Marks => (s === 'ruth' ? { ruth: '?' } : {}),
    },
    [DUCH]: {
      id: DUCH, name: 'Duchess', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'ask') return 'A notice on the Hollin Ford board: "LOST. One brown hen, answers to Duchess. Does not actually answer. Ruth Ashcroft."';
        if (s === 'search') return 'Duchess went missing the day after Ruth said, in the kitchen, that she\'d go in the pot on fifthday. The only other person there was Dilly, under the table.';
        if (s === 'reeds') return 'Dilly hid Duchess in a basket in the reeds at the Wetlings, with corn, to keep her out of the pot. She asked me not to tell.';
        if (s === 'ruth') return 'I have Duchess. Ruth will ask where she was.';
        return g.flag('duchessChoice') === 'truth'
          ? 'I told Ruth that Dilly hid Duchess. Duchess stays out of the pot, and Dilly feeds her every morning.'
          : 'I told Ruth I found Duchess wandering. Dilly isn\'t in trouble. Duchess went in the pot on fifthday.';
      },
      objectives: (_g, s) => {
        if (s === 'ask') return [{ text: 'Ask Ruth Ashcroft about Duchess', marker: 'ruth' }];
        if (s === 'search') return [{ text: 'Find out who heard about the pot', marker: 'dilly' }];
        if (s === 'reeds') return [{ text: 'Search the reeds at the Wetlings', marker: 'duchessReeds' }];
        if (s === 'ruth') return [{ text: 'Bring Duchess back to Ruth', marker: 'ruth' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'ask' || s === 'ruth' ? { ruth: '?' } : s === 'search' ? { dilly: '?' } : {}),
    },
    [STRAYS]: {
      id: STRAYS, name: 'Thirty Sheep', region: 'greenwake', depth: 'short',
      notes: (g, s) => (s === 'done'
        ? 'Elspeth Cole\'s three strays are home. So is a fourth, which belongs to Ruth Ashcroft. Elspeth will walk it back herself, slowly, so Ruth sees.'
        : 'Elspeth Cole, the shepherd, counts thirty sheep in the morning and twenty-seven by noon. One goes to the mill for spilled grain, one to the Wetlings, one into the wood.'),
      objectives: (g, s) => (s === 'find'
        ? [
          { text: 'Drive home the ewe at Gorse Mill', done: !!g.flag('stray1'), marker: 'stray1' },
          { text: 'Drive home the ewe in the Wetlings', done: !!g.flag('stray2'), marker: 'stray2' },
          { text: 'Drive home the ewe in the wood', done: !!g.flag('stray3'), marker: 'stray3' },
        ]
        : s === 'elspeth' ? [{ text: 'Tell Elspeth Cole', marker: 'elspeth' }] : []),
      marks: (_g, s): Marks => (!s ? { elspeth: '!' } : s === 'elspeth' ? { elspeth: '?' } : {}),
    },
  },
  boards: [], // Duchess is posted on the Hollin Ford board (see village.ts)
  hooks: (D) => {
    hook(D, 'dilly', (g) => (at(g, DUCH) === 'search' ? 'gwD1' : at(g, DUCH) === 'done' && !g.flag('gwDillySaid') ? 'gwDafter' : undefined), {
      gwD1: { text: 'Duchess? I haven\'t seen Duchess. Duchess is a hen. There are lots of hens.', options: [{ text: 'Your aunt says you were under the kitchen table when she talked about the pot.', next: 'gwD2' }, { text: 'All right.' }] },
      gwD2: { speaker: 'narrator', text: 'Dilly looks at her feet for a long time.', next: 'gwD3' },
      gwD3: {
        text: 'She\'s in the reeds at the Wetlings. In a basket. With corn. Don\'t tell. Aunt Ruth will put her in the pot. Then me.',
        effect: (g) => g.setStage(DUCH, 'reeds'),
      },
      gwDafter: {
        text: (g) => (g.flag('duchessChoice') === 'truth'
          ? 'I have to feed Duchess every morning. Every morning. Even raining. She pecks. I love her.'
          : 'Duchess went in the pot. You said you\'d find her and you did, and then she went in the pot.'),
        effect: (g) => g.setFlag('gwDillySaid'),
      },
    });
  },
};
