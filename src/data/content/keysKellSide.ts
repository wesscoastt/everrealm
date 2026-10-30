import type { DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';
import { GATE } from '../kell';

// Side stories for Kell and the Keys.
//
// klTallow, ELEVEN HOURS FAST (Loveday Hocking, the Lamp & Spanner; after the Escapement): Old Tallow,
// the automaton who keeps the Works' lamps, came up out of the Kiln when the engine ran away and has
// lit Brasswick's lamps ever since, at noon, and put them out at midnight. His clock is eleven hours
// fast. Gerens Tonkin can cut him a new regulator wheel if he has good brass: four brass mites' worth.
// Then Gerens asks which hours to cut it for: the town's (Tallow stays up and lights Brasswick at dusk
// like a lamplighter should) or the Works' (he goes back down under the Kiln to the lamps he was built
// for). Fit the wheel at the Escapement Gate, where he stands at noon. 'mites' -> 'gerens' -> 'tallow'
// -> 'loveday' -> done. Choice klTallow = 'town' | 'works'.
//
// kyCount, THE COUNT (Sal Mudge, Conch Key; after Hatchlings): forty-one years Sal has counted every
// hatchling off the turtle beach into a book. Her eyes are going. Tonight's three nests are hatching;
// keep the crabs off them, count what reaches the water, and write the line in her book. It's a bad
// year: nineteen. She asks you what it was. Write the true number, or the one she'd be glad of; she
// can't read the page any more. 'nests' -> 'sal' -> done. Choice kyCount = 'true' | 'kind'.

const TALLOW = 'klTallow', COUNT = 'kyCount';
const mites = (g: GameApi) => Math.min(4, killed(g, 'type:brassmite') - Number(g.flag(TALLOW + ':base') ?? 0));

/** The three nests on Conch Key's north beach, and how many came out of each. */
const C = TOWNS.conch;
const NESTS: [string, number, number, number, string][] = [
  ['kyNest1', C.x + 0.5, C.z - 24.5, 8, 'The sand heaves and they come out of it in a rush, and run for the water. You count. Eight make it. A crab gets one at the tideline before you can reach it.'],
  ['kyNest2', C.x + 16.5, C.z - 16.5, 4, 'Only a few here. You wait a long time for more. Four, in the end. The rest of the nest is still and stays still.'],
  ['kyNest3', C.x - 29.5, C.z - 29.5, 7, 'Seven, in a line, one behind the other as if they\'d agreed it. Every one of them reaches the sea.'],
];
const counted = (g: GameApi) => NESTS.filter(([id]) => g.flag(id)).length;
const crabs = (g: GameApi) => Math.min(3, killed(g, 'type:mangrovecrab') - Number(g.flag(COUNT + ':base') ?? 0));

// ---------------------------------------------------------------- Eleven Hours Fast
const lovedayNodes: Record<string, DNode> = {
  tl1: {
    text: 'Look out of the window. See him? Old Tallow, from the Works. He came up when the engine ran away, and he\'s stayed up. He lights the lamps.',
    options: [{ text: 'That sounds useful.', next: 'tl2' }],
  },
  tl2: {
    text: 'He lights them at noon and puts them out at midnight. Every lamp in Brasswick. My customers drink by daylight with the lamps going, and walk home in the dark.',
    next: 'tl3',
  },
  tl3: {
    text: 'His clock\'s eleven hours fast. Gerens says he could cut him a new wheel to put it right, if somebody brought him the brass. Gerens says a lot of things. This one might be true.',
    options: [{ text: 'I\'ll talk to Gerens.', next: 'tl4' }, { text: 'Not now.' }],
  },
  tl4: {
    text: 'Bless you. And when you\'ve done, I\'ll stand you a supper, and it\'ll be dark when you eat it.',
    effect: (g) => { g.setFlag(TALLOW + ':base', killed(g, 'type:brassmite')); g.setStage(TALLOW, 'mites'); },
  },
  tlWait: { text: (g) => (at(g, TALLOW) === 'mites' ? 'Gerens wants brass. The mites out on the slope are made of the stuff, he says.' : at(g, TALLOW) === 'tallow' ? 'He stands at the Escapement Gate at noon, before his round. Mind his hands. They\'re strong.' : 'Gerens has the brass. Go and see what he\'s made.') },
  tl5: {
    text: 'I saw. Supper, as promised, and the money besides, and you can sit in the window and watch.',
    next: 'tl6',
  },
  tl6: {
    text: (g) => (g.flag(TALLOW) === 'town'
      ? 'He went round at dusk last night and lit every lamp, and stood under mine a while after, as if he was checking it. Then he went on to the next.'
      : 'He went back down the Kiln road this morning. Kenver says he\'s at the Works\' lamps already, every one of them. My nephew lights ours now. He\'s slower.'),
    options: [{ text: 'Thank you, Loveday.', effect: (g) => { g.addMarks(360); g.setStage(TALLOW, 'done'); } }],
  },
  tlAfter: {
    text: (g) => (g.flag(TALLOW) === 'town'
      ? 'Tallow lit the lamps at dusk again. Nobody in Brasswick says so, but everybody waits at the window to watch him do it.'
      : 'My nephew forgot the lamp by the steps last night. Tallow would never have forgotten it. I\'m only saying.'),
  },
};

const gerensNodes: Record<string, DNode> = {
  tl7: {
    text: 'Brass mites. Good brass in those, the old Works brass. Put it on the bench and give me an hour.',
    next: 'tl8',
  },
  tl8: {
    text: 'There. A regulator wheel, one hundred and forty-four teeth. I can cut the last twelve to set him to any hours I like. So which?',
    next: 'tl9',
  },
  tl9: {
    text: 'Town hours, and he lights Brasswick at dusk, like a lamplighter. Or the Works\' hours, and he goes back down to the lamps under the Kiln. That\'s what he was built for. Nobody\'s lit those since spring.',
    options: [
      { text: 'Town hours. He came up. Let him stay up.', next: 'tlTown' },
      { text: 'The Works\' hours. Send him home.', next: 'tlWorks' },
    ],
  },
  tlTown: {
    text: 'Town hours. He stands at the Escapement Gate at noon before his round. Open the plate on his back and the wheel goes on the left spindle.',
    options: [{ text: 'Left spindle.', effect: (g) => { g.setFlag(TALLOW, 'town'); g.setStage(TALLOW, 'tallow'); } }],
  },
  tlWorks: {
    text: 'The Works\' hours. He stands at the Escapement Gate at noon before his round. Open the plate on his back and the wheel goes on the left spindle.',
    options: [{ text: 'Left spindle.', effect: (g) => { g.setFlag(TALLOW, 'works'); g.setStage(TALLOW, 'tallow'); } }],
  },
};

// ---------------------------------------------------------------- The Count
const salNodes: Record<string, DNode> = {
  ct1: {
    text: 'Three nests on the north beach are going to come up tonight. I can feel it. Forty-one years I\'ve counted every one that reached the water.',
    next: 'ct2',
  },
  ct2: {
    text: 'Here. The book. Every year, every nest. And I can\'t see the beach from the step any more, let alone count the little ones on it.',
    options: [{ text: 'You want me to count them.', next: 'ct3' }],
  },
  ct3: {
    text: 'Count them, and keep the crabs off while you do. Then come and tell me the number, and write it in. I\'ll watch you write it. I\'ll pretend I can see it.',
    options: [
      { text: 'I\'ll count them for you.', effect: (g) => { g.setFlag(COUNT + ':base', killed(g, 'type:mangrovecrab')); g.setStage(COUNT, 'nests'); } },
      { text: 'Not tonight, Sal.' },
    ],
  },
  ctWait: { text: (g) => `Three nests on the north beach. Count what reaches the water. ${counted(g)} of three counted, and the crabs: ${crabs(g)} of three.` },
  ct4: {
    text: 'Well? How many? Last year was sixty-two. The year before was fifty-eight. Write it under those.',
    options: [
      { text: 'Nineteen, Sal. It was a bad year.', next: 'ctTrue' },
      { text: 'Sixty, near enough. A good year.', next: 'ctKind' },
    ],
  },
  ctTrue: {
    text: 'Nineteen. Write it down, then. Write it plain. A bad year\'s still a year, and the book\'s no use if it only has the good ones in it. Thank you for telling me.',
    options: [{ text: 'Next year will be better.', effect: (g) => { g.addMarks(340); g.give('conch_chowder', 2); g.setFlag(COUNT, 'true'); g.setStage(COUNT, 'done'); } }],
  },
  ctKind: {
    text: 'Sixty. That\'s all right, then. Write it in, and I\'ll put the book on the shelf. Have some chowder. You were out there a long while.',
    options: [{ text: 'Goodnight, Sal.', effect: (g) => { g.addMarks(340); g.give('conch_chowder', 2); g.setFlag(COUNT, 'kind'); g.setStage(COUNT, 'done'); } }],
  },
  ctAfter: {
    text: (g) => (g.flag(COUNT) === 'true'
      ? 'I had the boy from the boats read me the page. Nineteen, in your hand. He asked why I was smiling. I told him that\'s what an honest book looks like.'
      : 'Sixty. I read it to myself every night. Well, I hold the book and say it. It was a good year.'),
    options: [{ text: 'What have you got?', effect: (g) => g.openShop('sal_mudge') }, { text: 'Bye.' }],
  },
};

const quests: Record<string, QuestDef> = {
  [TALLOW]: {
    id: TALLOW, name: 'Eleven Hours Fast', region: 'kell', depth: 'quest',
    notes: (g, s) => {
      if (s === 'mites') return `Old Tallow, the Works' lamp-keeping automaton, lights Brasswick's lamps at noon and puts them out at midnight: his clock is eleven hours fast. Gerens Tonkin can cut a new regulator wheel from brass mites' brass. (${mites(g)}/4)`;
      if (s === 'gerens') return 'I have the brass. Gerens Tonkin can cut the wheel.';
      if (s === 'tallow') return g.flag(TALLOW) === 'town' ? 'Gerens cut the wheel to town hours. Old Tallow stands at the Escapement Gate at noon; the wheel goes on the left spindle.' : 'Gerens cut the wheel to the Works\' hours. Old Tallow stands at the Escapement Gate at noon; the wheel goes on the left spindle.';
      if (s === 'loveday') return 'Old Tallow has his new wheel. Loveday Hocking will have seen.';
      return g.flag(TALLOW) === 'town' ? 'Old Tallow lights Brasswick\'s lamps at dusk now.' : 'Old Tallow went back down under the Kiln to the Works\' lamps.';
    },
    objectives: (g, s) => (s === 'mites' ? [{ text: `Kill brass mites on Kell's slope (${mites(g)}/4)`, done: mites(g) >= 4 }]
      : s === 'gerens' ? [{ text: 'Bring the brass to Gerens Tonkin', marker: 'gerens_tonkin' }]
        : s === 'tallow' ? [{ text: 'Fit the wheel to Old Tallow at the Escapement Gate', marker: 'klTallow' }]
          : s === 'loveday' ? [{ text: 'Go back to Loveday Hocking at the Lamp & Spanner', marker: 'loveday_hocking' }] : []),
    advance: (g, s) => (s === 'mites' && mites(g) >= 4 ? 'gerens' : null),
    marks: (g, s): Marks => (!s && at(g, 'kellEscapement') === 'done' ? { loveday_hocking: '!' } : s === 'gerens' ? { gerens_tonkin: '?' } : s === 'loveday' ? { loveday_hocking: '?' } : {}),
    walk: { cast: ['loveday_hocking', 'gerens_tonkin'], from: { quests: { kellEscapement: 'done' } }, kill: { mites: [['brassmite', 4]] } },
  },
  [COUNT]: {
    id: COUNT, name: 'The Count', region: 'keys', depth: 'quest',
    notes: (g, s) => {
      if (s === 'nests') return `Sal Mudge has counted every turtle hatchling off Conch Key's beach for forty-one years, and can't see the beach any more. Three nests on the north beach hatch tonight: count what reaches the water, and keep the crabs off. (nests ${counted(g)}/3, crabs ${crabs(g)}/3)`;
      if (s === 'sal') return 'Nineteen reached the water from the three nests. Sal Mudge is waiting with her book.';
      return g.flag(COUNT) === 'true' ? 'I wrote nineteen in Sal Mudge\'s book. A bad year, written plain.' : 'I told Sal Mudge sixty, and wrote it in her book. She can\'t read the page.';
    },
    objectives: (g, s) => (s === 'nests'
      ? [...NESTS.map(([id], i) => ({ text: `Count the ${['first', 'second', 'third'][i]} nest on the north beach`, marker: id, done: !!g.flag(id) })), { text: `Kill mangrove crabs on the beach (${crabs(g)}/3)`, done: crabs(g) >= 3 }]
      : s === 'sal' ? [{ text: 'Tell Sal Mudge the count', marker: 'sal_mudge' }] : []),
    advance: (g, s) => (s === 'nests' && counted(g) >= 3 && crabs(g) >= 3 ? 'sal' : null),
    marks: (g, s): Marks => (!s && at(g, 'conchCrabs') === 'done' ? { sal_mudge: '!' } : s === 'sal' ? { sal_mudge: '?' } : {}),
    walk: { cast: ['sal_mudge'], from: { quests: { conchCrabs: 'done' } }, kill: { nests: [['mangrovecrab', 3]] } },
  },
};

export const KEYS_KELL_SIDE_CONTENT: RegionContent = {
  id: 'keysKellSide', quests,
  things: [
    {
      id: 'klTallow', x: GATE.x + 2.5, z: GATE.z + 4.5, label: 'Open the plate on Old Tallow\'s back', radius: 2.8,
      when: (g: GameApi) => at(g, TALLOW) === 'tallow',
      use: (g: GameApi) => {
        g.toast('Old Tallow stands still and lets you open him, as if this has happened before. The old wheel is worn smooth on one side. The new one goes on the left spindle with a click, and his head turns, slowly, toward the sun, and then toward you.');
        g.setStage(TALLOW, 'loveday');
      },
    },
    ...NESTS.map(([id, x, z, , text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Count the hatchlings', radius: 2.6,
      when: (g: GameApi) => at(g, COUNT) === 'nests' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (counted(g) >= 3 && crabs(g) >= 3) g.setStage(COUNT, 'sal'); },
    })),
  ],
  hooks: (D) => {
    // (Loveday keeps her shop: Tallow is something she brings up, once the engine's quiet)
    hook(D, 'loveday_hocking', (g) => (at(g, TALLOW) === 'loveday' ? 'tl5' : undefined), lovedayNodes);
    addOption(D, 'loveday_hocking', 'l1', { text: 'Who lights your lamps?', next: 'tl1', cond: (g) => at(g, 'kellEscapement') === 'done' && !at(g, TALLOW) });
    addOption(D, 'loveday_hocking', 'l1', { text: 'About Old Tallow.', next: 'tlWait', cond: (g) => ['mites', 'gerens', 'tallow'].includes(String(at(g, TALLOW))) });
    addOption(D, 'loveday_hocking', 'l1', { text: 'How\'s Old Tallow?', next: 'tlAfter', cond: (g) => at(g, TALLOW) === 'done' });
    hook(D, 'gerens_tonkin', (g) => (at(g, TALLOW) === 'gerens' ? 'tl7' : undefined), gerensNodes);
    // (Sal's giver tree: once Hatchlings is done, the count is what's on her mind)
    hook(D, 'sal_mudge', (g) => {
      if (at(g, 'conchCrabs') !== 'done') return undefined;
      const s = at(g, COUNT);
      return !s ? 'ct1' : s === 'sal' ? 'ct4' : s === 'done' ? 'ctAfter' : 'ctWait';
    }, salNodes);
  },
};
