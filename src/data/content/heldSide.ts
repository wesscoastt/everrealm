import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { NG_GATE, NG_WALL } from '../../world/morrow';

// Side stories at Northgate, on the wall between the town and the Held, after Lie Still.
//
// hdKnock, THREE AND THREE (Edda Rusk, the Archive): every night something knocks on the outside of
// the wall under the third tower west of the gate. Three knocks, a wait, three knocks. The watch won't
// go up. Edda knows the knock: it's how she and her brother Col knocked on the Archive door when they
// were small. Col went up on the Held with the herders in the spring. Go out by the postern and see.
// It's Col, Risen, his forehead to the stones. Edda chooses: lay him down with a piece of the black the
// Archive kept (you go back out and put it on him) or leave him be, and she goes up the tower at night
// and knocks back. 'col' -> 'edda' -> ('lay' -> done) | done. Choice hdKnock = 'lay' | 'leave'.
//
// hdFold, THE LAST FOLD (Lew Garth, outside the gate): a herder came down off the Held with the last of
// his fell sabres and found the gate shut. He's slept against it nine nights; the trolls have had two of
// his cats. Kill three fell trolls so he lasts the week, then get Maud to let him in. She won't open the
// gate for twelve sabres; the postern is for people. Edda has the first Gatekeeper's charge, older than
// Maud's orders: shut against the dead, never against the living. Maud reads it and chooses: the gate
// opens for an hour, or the cats come through the postern one at a time, all night. 'trolls' -> 'maud'
// -> 'edda' -> 'charge' -> done. Choice hdFold = 'gate' | 'postern'.
//
// Northern names are short and old: Rusk, Hale, Garth.

const KNOCK = 'hdKnock', FOLD = 'hdFold';

/** Under the third tower west of the gate, outside the wall, where Col stands. */
const TOWER_X = NG_WALL.x0 + 37 * Math.round((NG_GATE.x - 3 * 37 - NG_WALL.x0) / 37);
const COL = { x: TOWER_X + 0.5, z: NG_WALL.z - 7.5 }; // (clear of the tower's foot, which runs out three and a half from the wall line)
const trolls = (g: GameApi) => Math.min(3, killed(g, 'type:felltroll') - Number(g.flag(FOLD + ':base') ?? 0));

// ---------------------------------------------------------------- Three and Three
const eddaKnock: Record<string, DNode> = {
  tk1: {
    text: 'Sit a moment. You came in by the postern, so you\'ve been out there. Have you heard the knocking at night, along the wall to the west?',
    options: [{ text: 'No. What knocking?', next: 'tk2' }, { text: 'Another time, Edda.' }],
  },
  tk2: {
    text: 'Under the third tower west of the gate. Three knocks, a wait, three more. Every night since the gate shut. The watch won\'t walk that stretch any more.',
    next: 'tk3',
  },
  tk3: {
    text: 'When my brother and I were small, three and three was how we knocked on this door so our mother would know it was us and not the Gatekeeper wanting his supper.',
    next: 'tk4',
  },
  tk4: {
    text: 'Col went up on the Held with the herders in the spring. He didn\'t come down. I\'m too old to go out of the postern, and I\'m frightened of what I\'d find. Will you go and look?',
    options: [{ text: 'I\'ll go and look.', next: 'tk5' }, { text: 'Not now.' }],
  },
  tk5: {
    text: 'Out by the postern, then west along the foot of the wall to the third tower. And come back and tell me plainly. I\'ve read enough gentle letters.',
    effect: (g) => g.setStage(KNOCK, 'col'),
  },
  tkWait: { text: 'Out by the postern, west along the outside of the wall, to the third tower. Tell me plainly what\'s there.' },
  tk6: {
    text: 'Plainly, then.',
    options: [{ text: 'It\'s Col. He\'s one of the Held. He has his forehead to the stones, knocking.', next: 'tk7' }],
  },
  tk7: {
    text: 'I thought so. I\'ve thought so for a month. It\'s different, being told.',
    next: 'tk8',
  },
  tk8: {
    text: 'The Archive kept a piece of the black, from when they laid it. One of the Held lies down when you lay it on him, the roll says. I could give it to you.',
    next: 'tk9',
  },
  tk9: {
    text: 'Or I could leave him be. He isn\'t hurting anyone. He\'s only knocking. I could go up the tower at night and knock back. What would you do?',
    options: [
      { text: 'Lay him down. He walked up there alive. He deserves to rest.', next: 'tkLay' },
      { text: 'Leave him. If knocking back helps you, knock back.', next: 'tkLeave' },
    ],
  },
  tkLay: {
    text: 'Yes. Here it is. Lay it on his chest. I was going to give you something to tell him, but he wouldn\'t hear it, and you\'d only have to carry it back. Just lay it on him.',
    options: [{ text: 'I will.', effect: (g) => { g.setFlag(KNOCK, 'lay'); g.setStage(KNOCK, 'lay'); } }],
  },
  tkLayWait: { text: 'On his chest. Under the third tower. Then come back, and don\'t tell me how he looked.' },
  tkLaid: {
    text: 'It was quiet last night. I sat up for it anyway. Here. It\'s the Archive\'s money and the Archive owes you more than this.',
    options: [{ text: 'I\'m sorry, Edda.', effect: (g) => { g.addMarks(360); g.setStage(KNOCK, 'done'); } }],
  },
  tkLeave: {
    text: 'Then I\'ll knock back. Three and three. Our mother would have thought me a fool, and she\'d have done the same. Here, for going out there.',
    options: [{ text: 'Goodnight, Edda.', effect: (g) => { g.addMarks(360); g.setFlag(KNOCK, 'leave'); g.setStage(KNOCK, 'done'); } }],
  },
  tkAfter: {
    text: (g) => (g.flag(KNOCK) === 'lay'
      ? 'The watch walks the west stretch again. They don\'t know why it stopped. I haven\'t told them.'
      : 'I went up last night and knocked. Three and three. He stopped, the way he used to, and then he knocked again. That\'s enough. It\'s more than most people get.'),
  },
};

// ---------------------------------------------------------------- The Last Fold
const ivoNodes: Record<string, DNode> = {
  lf1: {
    text: 'Don\'t come any closer. They\'re hungry, and they don\'t know you. Lew Garth. I keep fell sabres up on the Held, or I did.',
    next: 'lf2',
  },
  lf2: {
    text: 'I brought the last twelve down to sell to the Gatekeeper, like every autumn, and the gate was shut. Nine nights I\'ve slept against it. The trolls come down after dark. They\'ve had two of my cats.',
    options: [{ text: 'Why don\'t they let you in?', next: 'lf3' }],
  },
  lf3: {
    text: 'Me, they would, through the postern. Not the cats. And I\'m not leaving them out here for the trolls. Twelve sabres is everything I\'ve got.',
    next: 'lf4',
  },
  lf4: {
    text: 'If somebody thinned the trolls out, I could last the week. And if somebody talked to Maud Hale, I might not need to.',
    options: [
      { text: 'I\'ll deal with the trolls, and then I\'ll talk to Maud.', effect: (g) => { g.setFlag(FOLD + ':base', killed(g, 'type:felltroll')); g.setStage(FOLD, 'trolls'); } },
      { text: 'Not now.' },
    ],
  },
  lfWait: { text: (g) => (at(g, FOLD) === 'trolls' ? `The trolls come down off the high snow, up the road behind me. ${trolls(g)} of three, so far.` : 'Maud\'s at the gate, inside. Tell her the cats are no more dead than she is.') },
  lfAfter: {
    text: (g) => (g.flag(FOLD) === 'gate'
      ? 'An hour, she gave us, and she stood in the gateway the whole hour with her hand on her sword. Every cat came in. She bought four of them. Paid a fair price, too.'
      : 'All night through the postern, one at a time, and Maud counting them in like a shepherd. The last one wouldn\'t go. She went out and carried it.'),
  },
};

const maudNodes: Record<string, DNode> = {
  lf5: {
    text: 'Garth. I know. Twelve fell sabres and a man who won\'t come in without them.',
    next: 'lf6',
  },
  lf6: {
    text: 'The postern is for people. The gate is shut. It\'s been shut since the Held got up, and if I open it once I\'ll be asked to open it every day. I won\'t.',
    next: 'lf7',
  },
  lf7: {
    text: 'You want me to change my mind, find me a reason older than mine. Edda keeps the old ones. Go and ask her.',
    effect: (g) => g.setStage(FOLD, 'edda'),
  },
  lfMaudWait: { text: 'A reason older than mine. Edda has them, if anyone does.' },
  lf8: {
    text: 'Show me, then.',
    options: [{ text: 'The first Gatekeeper\'s charge. "Shut it against the dead. Never against the living."', next: 'lf9' }],
  },
  lf9: {
    text: 'Well. She would have that. I read that charge the day I took the keys and I\'d forgotten it.',
    next: 'lf10',
  },
  lf10: {
    text: 'All right. Twelve cats. I can open the gate for an hour while it\'s light, and stand in it. Or I can keep it shut and pass them through the postern one at a time. That\'ll take all night.',
    options: [
      { text: 'Open the gate for an hour. It\'s what the charge says.', next: 'lfGate' },
      { text: 'Use the postern. Keep the gate shut.', next: 'lfPostern' },
    ],
  },
  lfGate: {
    text: 'An hour, then, at noon, and not a minute over. If anything comes down that road that isn\'t a cat, the gate shuts on it. Here. Edda says you earned it, and she\'s usually right.',
    options: [{ text: 'Thank you, Gatekeeper.', effect: (g) => { g.addMarks(380); g.setFlag(FOLD, 'gate'); g.setStage(FOLD, 'done'); } }],
  },
  lfPostern: {
    text: 'Through the postern, then. One at a time, and I\'ll count every one. Here. Edda says you earned it, and she\'s usually right.',
    options: [{ text: 'Thank you, Gatekeeper.', effect: (g) => { g.addMarks(380); g.setFlag(FOLD, 'postern'); g.setStage(FOLD, 'done'); } }],
  },
};

const eddaFold: Record<string, DNode> = {
  lf11: {
    text: 'A reason older than Maud\'s. She does say that. Wait.',
    next: 'lf12',
  },
  lf12: {
    text: 'Here. The first Gatekeeper\'s charge, on the first leaf of the first roll. Three hundred years old. Read the last line to her. Don\'t paraphrase. She hates that.',
    effect: (g) => g.setStage(FOLD, 'charge'),
  },
  lfEddaWait: { text: 'The last line of the charge. Read it to Maud word for word.' },
};

const quests: Record<string, QuestDef> = {
  [KNOCK]: {
    id: KNOCK, name: 'Three and Three', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'col') return 'Every night something knocks on the outside of Northgate\'s wall under the third tower west of the gate: three knocks, a wait, three more. Edda Rusk knows the knock. Her brother Col went up on the Held in the spring.';
      if (s === 'edda') return 'It\'s Col Rusk, one of the Held, knocking with his forehead to the stones. Edda asked me to tell her plainly.';
      if (s === 'lay') return 'Edda gave me the Archive\'s piece of the black. Laid on Col\'s chest, it should lay him down.';
      if (s === 'laid') return 'Col Rusk lies still at the foot of the wall. Edda will be sitting up, waiting to hear.';
      return g.flag(KNOCK) === 'lay' ? 'I laid the black on Col Rusk under the third tower, and the knocking stopped.' : 'Edda leaves Col be. At night she goes up the tower and knocks back, three and three.';
    },
    objectives: (_g, s) => (s === 'col' ? [{ text: 'Go out by the postern and west along the wall to the third tower', marker: 'hdCol' }]
      : s === 'edda' ? [{ text: 'Tell Edda Rusk what you found', marker: 'edda_rusk' }]
        : s === 'lay' ? [{ text: 'Lay the black on Col\'s chest', marker: 'hdCol' }]
          : s === 'laid' ? [{ text: 'Go back to Edda Rusk', marker: 'edda_rusk' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'tdHeld') === 'done' ? { edda_rusk: '!' } : s === 'edda' || s === 'laid' ? { edda_rusk: '?' } : {}),
    walk: { cast: ['edda_rusk'], from: { quests: { tdHeld: 'done' } } },
  },
  [FOLD]: {
    id: FOLD, name: 'The Last Fold', region: 'held', depth: 'quest',
    notes: (g, s) => {
      if (s === 'trolls') return `Lew Garth brought the last twelve of his fell sabres down off the Held and found Northgate's gate shut. The fell trolls come down at night. Thin them out so he lasts the week. (${trolls(g)}/3)`;
      if (s === 'maud') return 'The trolls are thinner. Now Maud Hale has to be talked into letting twelve fell sabres in.';
      if (s === 'edda') return 'Maud won\'t open the gate unless I find her a reason older than her own. Edda Rusk keeps the old rolls.';
      if (s === 'charge') return 'Edda gave me the first Gatekeeper\'s charge. Its last line is for Maud.';
      return g.flag(FOLD) === 'gate' ? 'Maud opened Northgate\'s gate for an hour at noon, and Lew Garth brought his fell sabres in.' : 'Maud passed Lew Garth\'s fell sabres through the postern one at a time, all night, and kept the gate shut.';
    },
    objectives: (g, s) => (s === 'trolls' ? [{ text: `Kill fell trolls on the Held (${trolls(g)}/3)`, done: trolls(g) >= 3 }]
      : s === 'maud' ? [{ text: 'Talk to Maud Hale about Lew\'s cats', marker: 'maud_hale' }]
        : s === 'edda' ? [{ text: 'Ask Edda Rusk for a reason older than Maud\'s', marker: 'edda_rusk' }]
          : s === 'charge' ? [{ text: 'Read Maud Hale the first Gatekeeper\'s charge', marker: 'maud_hale' }] : []),
    advance: (g, s) => (s === 'trolls' && trolls(g) >= 3 ? 'maud' : null),
    marks: (g, s): Marks => (!s && at(g, 'tdHeld') === 'done' ? { lew_garth: '!' } : s === 'maud' || s === 'charge' ? { maud_hale: '?' } : s === 'edda' ? { edda_rusk: '?' } : {}),
    walk: { cast: ['lew_garth', 'maud_hale', 'edda_rusk'], from: { quests: { tdHeld: 'done' } }, kill: { trolls: [['felltroll', 3]] } },
  },
};

export const HELD_SIDE_CONTENT: RegionContent = {
  id: 'heldSide', quests,
  npcs: [
    {
      land: 'morrow', id: 'lew_garth', name: 'Lew Garth', title: 'Herder of the Held',
      look: { skin: '#d8b090', eyes: '#4a5a6a', hair: '#6a5a40', hairStyle: 3, facial: 3, tunic: '#6a5a44', trim: '#d8d0c0', trousers: '#3a3430', boots: '#2a2018', cape: '#8a7a60', hat: 'hood', hatColor: '#5a4a38', build: 1.15, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [NG_GATE.x - 4.5, NG_GATE.z - 8.5], face: [NG_GATE.x - 4.5, NG_GATE.z - 2], anim: 'idle' }],
      barks: ['Easy. Easy.', 'Nine nights.'],
    },
  ],
  dialogue: {
    lew_garth: {
      start: (g) => (at(g, 'tdHeld') !== 'done' ? 'lf0' : !at(g, FOLD) ? 'lf1' : at(g, FOLD) === 'done' ? 'lfAfter' : 'lfWait'),
      nodes: { lf0: { text: 'Keep back from the cats. And keep your voice down. Things come down that road after dark.' }, ...ivoNodes },
    },
  },
  things: [
    {
      land: 'morrow', id: 'hdCol', x: COL.x, z: COL.z, label: 'The man at the wall', radius: 2.6,
      when: (g: GameApi) => at(g, KNOCK) === 'col' || at(g, KNOCK) === 'lay',
      use: (g: GameApi) => {
        if (at(g, KNOCK) === 'col') {
          g.toast('He stands with his forehead to the stones and knocks with one grey hand. Three. A wait. Three. He wears a herder\'s sheepskin, and RUSK is stitched inside the collar. He doesn\'t turn round.');
          g.setStage(KNOCK, 'edda');
        } else {
          g.toast('You lay the black on his chest. His hand stops halfway to the stones. He kneels, the way the others did on the fell, and then he lies down at the foot of the wall and is still.');
          g.setStage(KNOCK, 'laid');
        }
      },
    },
  ],
  hooks: (D) => {
    // (after Lie Still: Edda has time for her own trouble, and for Lew's)
    hook(D, 'edda_rusk', (g) => {
      if (at(g, 'tdHeld') !== 'done') return undefined;
      const k = at(g, KNOCK), f = at(g, FOLD);
      if (f === 'edda') return 'lf11';
      if (k === 'edda') return 'tk6';
      if (k === 'laid') return 'tkLaid';
      if (f === 'charge') return 'lfEddaWait';
      if (!k) return 'tk1';
      if (k === 'col') return 'tkWait';
      if (k === 'lay') return 'tkLayWait';
      return 'tkAfter';
    }, { ...eddaKnock, ...eddaFold });
    hook(D, 'maud_hale', (g) => {
      const f = at(g, FOLD);
      return f === 'maud' ? 'lf5' : f === 'edda' ? 'lfMaudWait' : f === 'charge' ? 'lf8' : undefined;
    }, maudNodes);
  },
};
