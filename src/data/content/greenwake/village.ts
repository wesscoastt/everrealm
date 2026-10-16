import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, type Marks } from '../kit';
import type { RegionContent } from '../types';

// Hollin Ford's square and Sallow Pit.
// THE GOOD BENCH (posting): who sleeps on Joss Wether's bench. benchChoice = 'moved' | 'home' | 'second'.
// HANDS WANTED (posting): a shift in the upper gallery, at the posted rate.
// UPPER GALLERY (short): rustbacks in the pump housing.
// UNDER THE COUNTER (quest): Pit copper going out in a coat. copperChoice = 'hesk' | 'quiet' | 'tamsin'.

const BENCH = 'gwBench', HANDS = 'gwHands', RUST = 'gwRust', COPPER = 'gwCopper';
const MOOT3 = 'gwMoot3';

const gil: DialogueTree = {
  start: (g) => {
    if (at(g, BENCH) === 'gil') return 'g1';
    if (at(g, COPPER) === 'gil') return 'gc1';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('copperChoice');
        if (c === 'hesk') return 'Off the Pit. I\'m rolling barrels for Agnes. She pays worse and locks the door at the same time.';
        if (c === 'tamsin') return 'Tamsin\'s forgiven me eleven marks. Tamsin. I\'m frightened.';
        if (c === 'quiet') return 'I\'ve stopped. I\'ve really stopped. Don\'t look at me like Hesk looks at a pump.';
        const b = g.flag('benchChoice');
        if (b === 'second') return 'Two good benches now. Joss says the new one\'s mine. Nobody\'s ever given me a bench.';
        if (b === 'moved') return 'Knot bench. Gets you in the back. I deserve it.';
        return 'Mm. Is it fifthday?';
      },
    },
    // The good bench
    g1: { text: 'Mm. Is it fifthday? It\'s fifthday.', options: [{ text: 'That\'s Joss Wether\'s bench.', next: 'g2' }] },
    g2: { text: 'I know. It\'s the good one. The others have a knot in the seat that gets you in the back.', options: [{ text: 'Why sleep out here at all?', next: 'g3' }] },
    g3: { text: 'Fourthday\'s pay. I take it to the Low Water, and Mag locks our door at midnight, and the Oak doesn\'t.', next: 'g4' },
    g4: { speaker: 'narrator', text: 'He says it cheerfully, which is worse.', next: 'g5' },
    g5: {
      text: 'You\'re going to tell me to move, aren\'t you.',
      options: [
        { text: 'Find another bench, Gil.', next: 'gMove' },
        { text: 'Go home before midnight.', next: 'gHome' },
        { text: 'I\'ll ask Joss to make a second good bench.', next: 'gSecond' },
      ],
    },
    gMove: { text: 'Fair. I\'ll try the one with the knot. It\'s what I deserve, the knot.', effect: (g) => { g.setFlag('benchChoice', 'moved'); g.setStage(BENCH, 'joss2'); } },
    gHome: { text: 'Before midnight.', next: 'gHome2' },
    gHome2: { speaker: 'narrator', text: 'He thinks about it as if nobody has ever put it to him before.', next: 'gHome3' },
    gHome3: { text: 'I\'ll try. I won\'t manage it, but I\'ll try.', effect: (g) => { g.setFlag('benchChoice', 'home'); g.setStage(BENCH, 'joss2'); } },
    gSecond: { text: 'You\'d do that? For me? I\'ll help carry it. I won\'t help carve it.', effect: (g) => { g.setFlag('benchChoice', 'second'); g.setStage(BENCH, 'logs'); } },
    // Under the counter
    gc1: { text: 'Ah.', next: 'gc2' },
    gc2: { speaker: 'narrator', text: 'He doesn\'t pretend. That\'s the worst thing about Gil: he never pretends.', next: 'gc3' },
    gc3: { text: 'I owe Tamsin eleven marks. She takes it in copper, a mark a sack. It\'s the Pit\'s copper. It isn\'t mine. I know.', next: 'gc4' },
    gc4: {
      text: 'What are you going to do?',
      options: [
        { text: 'I\'m telling Hesk.', next: 'cHesk' },
        { text: 'Stop, and I\'ll say nothing.', next: 'cQuiet' },
        { text: 'Tamsin\'s the one buying it. I\'ll talk to her.', next: 'cTamsin' },
      ],
    },
    cHesk: { text: 'Fair. He\'ll be decent about it. That\'s the worst part.', effect: (g) => { g.setFlag('copperChoice', 'hesk'); g.setStage(COPPER, 'hesk'); } },
    cQuiet: { text: 'Stop. I can stop. I\'m good at stopping. It\'s starting I\'m bad at.', effect: (g) => { g.setFlag('copperChoice', 'quiet'); g.setStage(COPPER, 'hesk2'); } },
    cTamsin: { text: 'Tamsin? Good luck. She\'ll sell you the idea of not buying it.', effect: (g) => { g.setFlag('copperChoice', 'tamsin'); g.setStage(COPPER, 'tamsin'); } },
  },
};

export const GW_VILLAGE: RegionContent = {
  id: 'greenwake-village',
  dialogue: { gil },
  readables: {
    tamsinCrate: {
      title: 'Tamsin\'s crate',
      body: 'Under a sack of onions, at the bottom of the crate: about a stone of copper ore in a sack stencilled H&D.\n\nTucked into the sack\'s neck, a scrap of paper in Tamsin\'s hand: G.S., 1m. G.S., 1m. G.S., 1m. Eight lines of it, so far.',
      effect: (g) => { if (at(g, COPPER) === 'look') g.setStage(COPPER, 'gil'); },
    },
  },
  things: [
    { id: 'tamsinCrate', x: 159.2, z: 193.2, label: 'Look in the crate behind the stall', radius: 2.2, read: 'tamsinCrate', when: (g) => at(g, COPPER) === 'look' },
  ],
  spawns: [
    { tag: 'gallery', type: 'rustback', at: [[236, 94], [240, 98], [234, 99]], when: (g) => at(g, RUST) === 'kill' },
  ],
  boards: [{
    id: 'hollin', name: 'Hollin Ford', x: 158.5, z: 187.6, interactable: 'notice',
    header: (g) => {
      const c = g.flag('mootChoice');
      const moot = !at(g, MOOT3) || at(g, MOOT3) !== 'done'
        ? 'MOOT, next fourthday, under the Oak. First item: the bell. Second item: the bell. M. Ashby, Reeve.'
        : c === 'ponds' ? 'MOOT RESOLVED: the Pit lease stands, on condition that settling ponds are dug by spring. I. Marsh, for the moot.'
          : c === 'end' ? 'MOOT RESOLVED: notice given on the Pit lease, to run out at the quarter. I. Marsh, for the moot.'
            : 'MOOT RESOLVED: the Pit lease stands. I. Marsh, for the moot. (Underneath, smaller: and the reeve will ask next time.)';
      return moot;
    },
    postings: [
      { quest: 'gwDuchess', stage: 'ask', title: 'LOST. One brown hen.', text: 'LOST. One brown hen, answers to Duchess. Does not actually answer. Ruth Ashcroft.' },
      { quest: HANDS, stage: 'hesk', title: 'Hands wanted, Sallow Pit.', text: 'Hands wanted, Sallow Pit, upper gallery. 3 marks a shift. Bring your own lamp. Harrowgate & Daughters.' },
      { quest: BENCH, stage: 'joss', title: 'Whoever keeps taking the good bench.', text: 'Whoever keeps taking the good bench by the Oak: it\'s mine. My name\'s carved in it. Look. J.W.' },
    ],
  }],
  quests: {
    [BENCH]: {
      id: BENCH, name: 'The Good Bench', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'joss') return 'Someone keeps taking Joss Wether\'s bench under the Moot Oak, the one with J.W. carved in the back.';
        if (s === 'gil') return 'Joss\'s father carved the bench. Somebody sleeps on it every fifthday morning. Whoever it is will be under the Oak.';
        if (s === 'logs') return 'Gil Saxby sleeps on Joss\'s bench because his wife locks the door at midnight on fourthday. I said I\'d ask Joss to make a second good bench. Joss will want oak.';
        if (s === 'joss2') return 'It\'s Gil Saxby, sleeping off fourthday\'s wages. Joss should know.';
        const b = g.flag('benchChoice');
        if (b === 'second') return 'Joss made a second good bench from the oak I cut, for Gil. His father carved the first for a man who couldn\'t get home either: his own brother.';
        if (b === 'home') return 'Gil says he\'ll try to get home before midnight. Joss will believe it when Gil\'s wife does.';
        return 'Gil moved to the bench with the knot in it. Joss hopes it gets him in the back.';
      },
      objectives: (g, s) => {
        if (s === 'joss') return [{ text: 'Ask Joss Wether about his bench', marker: 'joss' }];
        if (s === 'gil') return [{ text: 'Find who sleeps on the bench under the Moot Oak', marker: 'gil' }];
        if (s === 'logs') return [{ text: `Bring Joss oak logs for a second bench (${Math.min(3, g.count('oak_logs'))}/3)`, marker: 'joss', done: g.count('oak_logs') >= 3 }];
        if (s === 'joss2') return [{ text: 'Tell Joss Wether', marker: 'joss' }];
        return [];
      },
      marks: (g, s): Marks => (s === 'joss' || s === 'joss2' || (s === 'logs' && g.count('oak_logs') >= 3) ? { joss: '?' } : s === 'gil' ? { gil: '?' } : {}),
      walk: { obtain: { logs: [['oak_logs', 3]] } },
    },
    [HANDS]: {
      id: HANDS, name: 'Hands Wanted', region: 'greenwake', depth: 'short',
      notes: (_g, s) => {
        if (s === 'hesk') return 'Harrowgate & Daughters want hands for the upper gallery at Sallow Pit: three marks a shift, bring your own lamp. The foreman is Hesk Dunmore.';
        if (s === 'mine') return 'Hesk lent me a lamp off the hook and wants five copper ore for the company carts. The upper gallery is straight in and to the right.';
        if (s === 'deliver') return 'I have five copper ore for Hesk.';
        return 'One shift at Sallow Pit: five copper ore for three marks. Hesk didn\'t charge for the lamp.';
      },
      objectives: (g, s) => {
        if (s === 'hesk') return [{ text: 'Talk to Hesk Dunmore at Sallow Pit', marker: 'hesk' }];
        if (s === 'mine') return [{ text: `Mine copper ore in the upper gallery (${Math.min(5, g.count('copper_ore'))}/5)`, marker: 'ore:copper', done: g.count('copper_ore') >= 5 }];
        if (s === 'deliver') return [{ text: 'Bring the ore to Hesk', marker: 'hesk' }];
        return [];
      },
      advance: (g, s) => (s === 'mine' && g.count('copper_ore') >= 5 ? 'deliver' : s === 'deliver' && g.count('copper_ore') < 5 ? 'mine' : null),
      marks: (_g, s): Marks => (s === 'hesk' || s === 'deliver' ? { hesk: '?' } : {}),
      walk: { obtain: { mine: [['copper_ore', 5]] } },
    },
    [RUST]: {
      id: RUST, walk: { cast: ['hesk'], from: { quests: { gwHands: 'done' } } }, name: 'Upper Gallery', region: 'greenwake', depth: 'short',
      notes: (_g, s) => (s === 'kill'
        ? 'Rustbacks have eaten two of Hesk\'s lamps and a pump fitting this month, and now they\'re nesting in the pump housing in the back chamber of the Pit.'
        : s === 'hesk' ? 'The back chamber is clear. Hesk will want to know.' : 'I cleared the rustbacks out of the Pit\'s pump housing. Hesk says there\'s always a fourth, and Gil Saxby keeps it in a box for luck.'),
      objectives: (g, s) => (s === 'kill'
        ? [{ text: `Clear the rustbacks from the back chamber (${Math.min(3, Number(g.flag('kills:gallery') ?? 0))}/3)`, marker: 'pitChamber' }]
        : s === 'hesk' ? [{ text: 'Tell Hesk Dunmore', marker: 'hesk' }] : []),
      advance: (g, s) => (s === 'kill' && Number(g.flag('kills:gallery') ?? 0) >= 3 ? 'hesk' : null),
      marks: (g, s): Marks => (!s && at(g, HANDS) === 'done' ? { hesk: '!' } : s === 'hesk' ? { hesk: '?' } : {}),
    },
    [COPPER]: {
      id: COPPER, name: 'Under the Counter', region: 'greenwake', depth: 'quest',
      notes: (g, s) => {
        if (s === 'look') return 'Sallow Pit\'s carts are coming up a sack light every week. Hesk counts sacks for the company. Somebody is carrying copper out in a coat, and Hesk needs to know who.';
        if (s === 'gil') return 'Tamsin has a stone of copper ore in a company sack under her onions, and a tally: "G.S., 1m", eight times. G.S. is Gil Saxby.';
        if (s === 'hesk') return 'Gil owes Tamsin eleven marks and pays her in the Pit\'s copper, a mark a sack. I said I\'d tell Hesk.';
        if (s === 'hesk2') return 'Gil owes Tamsin eleven marks and was paying her in the Pit\'s copper. He says he\'ll stop. I said I\'d say nothing.';
        if (s === 'tamsin') return 'Gil owes Tamsin eleven marks and pays her in the Pit\'s copper. Tamsin is the one buying it.';
        const c = g.flag('copperChoice');
        if (c === 'hesk') return 'I told Hesk. Gil is off the Pit, and rolling barrels for Agnes at the Low Water.';
        if (c === 'tamsin') return 'Tamsin forgave Gil the eleven marks and stopped buying Pit copper. She says I owe her a favour she\'ll never collect.';
        return 'Gil stopped. I told Hesk I found nothing. Hesk thinks it\'s the rustbacks.';
      },
      objectives: (_g, s) => {
        if (s === 'look') return [{ text: 'Find out where the Pit\'s copper is going', marker: 'tamsinCrate' }];
        if (s === 'gil') return [{ text: 'Find G.S.', marker: 'gil' }];
        if (s === 'hesk' || s === 'hesk2') return [{ text: 'Go back to Hesk Dunmore', marker: 'hesk' }];
        if (s === 'tamsin') return [{ text: 'Talk to Tamsin Pargeter', marker: 'tamsin' }];
        return [];
      },
      marks: (g, s): Marks => (!s && at(g, HANDS) === 'done' && at(g, RUST) === 'done' ? { hesk: '!' } : s === 'gil' ? { gil: '?' } : s === 'hesk' || s === 'hesk2' ? { hesk: '?' } : s === 'tamsin' ? { tamsin: '?' } : {}),
      walk: { cast: ['hesk', 'tamsin'], from: { quests: { gwHands: 'done', gwRust: 'done' } } },
    },
  },
  hooks: (D) => {
    // ---- Joss Wether: the bench
    hook(D, 'joss', (g) => {
      const b = at(g, BENCH);
      if (b === 'joss') return 'gwB1';
      if (b === 'joss2') return 'gwB4';
      if (b === 'logs') return g.count('oak_logs') >= 3 ? 'gwB6' : 'gwB5';
      return undefined;
    }, {
      gwB1: { text: 'Third bench from the path. J.W. cut in the back. My father carved it. Jonas Wether. Same letters. Saved me the trouble.', next: 'gwB2' },
      gwB2: { text: 'Every fifthday morning there\'s somebody on it, sleeping like a dropped sack. Gone before I\'m up.', next: 'gwB3' },
      gwB3: { text: 'Find out who. I won\'t do anything. I\'ll just know, and they\'ll know I know.', effect: (g) => g.setStage(BENCH, 'gil') },
      gwB4: {
        text: (g) => (g.flag('benchChoice') === 'home'
          ? 'Gil Saxby. Going home before midnight, is he. I\'ll believe it when Mag does.'
          : 'Gil Saxby. Should have guessed. Moved to the knot bench, has he. I hope it gets him in the back.'),
        effect: (g) => { g.addMarks(8); g.setStage(BENCH, 'done'); },
      },
      gwB5: { text: 'Oak. Three good logs. I\'m not carving a bench out of kindling for Gil Saxby.' },
      gwB6: { text: 'You want me to carve a second bench so Gil Saxby has somewhere to sleep.', next: 'gwB7' },
      gwB7: { speaker: 'narrator', text: 'He takes the logs anyway, and turns one over, looking along the grain.', next: 'gwB8' },
      gwB8: {
        text: 'My father carved the first one for a man who couldn\'t get home either. His brother. My uncle Tam. He\'d have liked Gil.',
        effect: (g) => { g.take('oak_logs', 3); g.addMarks(12); g.setStage(BENCH, 'done'); },
      },
    });

    // ---- Hesk: hands, the gallery, the copper
    hook(D, 'hesk', (g) => {
      if (at(g, HANDS) === 'hesk') return 'gwH1';
      if (at(g, HANDS) === 'deliver') return 'gwH4';
      if (at(g, RUST) === 'hesk') return 'gwR3';
      if (at(g, COPPER) === 'hesk') return 'gwC5';
      if (at(g, COPPER) === 'hesk2') return 'gwC8';
      return undefined;
    }, {
      gwH1: { text: 'Notice says bring your own lamp. Have you got a lamp? No. Nobody has a lamp.', next: 'gwH2' },
      gwH2: { text: 'Take one off the hook. Five copper ore for the carts is a shift. Upper gallery, straight in and to the right.', next: 'gwH3' },
      gwH3: { text: 'Anything past five, on your own time, is yours. Just not out of my carts.', effect: (g) => g.setStage(HANDS, 'mine') },
      gwH4: { text: 'Five. That\'s a shift.', options: [{ text: 'Hand over the ore.', next: 'gwH5' }] },
      gwH5: {
        text: 'Three marks, as posted. Lamp\'s free. Don\'t tell the company. They\'d want it back with interest.',
        effect: (g) => { g.take('copper_ore', 5); g.addMarks(3); g.setStage(HANDS, 'done'); },
      },
      gwR1: { text: 'Two lamps and a pump fitting this month. Now there\'s a nest of them in the pump housing in the back chamber.', next: 'gwR2' },
      gwR2: { text: 'Clear them out and I\'ll pay you what the fitting cost me, which is more than you\'d think a bit of copper could cost.', effect: (g) => g.setStage(RUST, 'kill') },
      gwR3: { text: 'Three? There\'s always a fourth.', next: 'gwR4' },
      gwR4: {
        text: 'Gil Saxby keeps one in a box under his bunk for luck. If you see him, tell him the box is company property now.',
        effect: (g) => { g.addMarks(20); g.setStage(RUST, 'done'); },
      },
      gwC1: { text: 'Carts are coming up light. Not much. A sack a week. The company counts sacks, and the sacks are mine.', next: 'gwC2' },
      gwC2: { text: 'Somebody\'s carrying copper out of here in a coat. I don\'t want to know who. I need to know who.', effect: (g) => g.setStage(COPPER, 'look') },
      gwC5: { text: 'Well?', options: [{ text: 'It\'s Gil Saxby. He owes Tamsin, and pays her in your copper.', next: 'gwC6' }] },
      gwC6: { text: 'Gil. Course it\'s Gil.', next: 'gwC7' },
      gwC7: { speaker: 'narrator', text: 'He doesn\'t look pleased to be right. He looks like a man who\'d hoped to be wrong.', next: 'gwC7b' },
      gwC7b: { text: 'He\'s off the Pit. I\'ll tell him myself. He should hear it from me, not from a notice.', effect: (g) => { g.addMarks(20); g.setStage(COPPER, 'done'); } },
      gwC8: { text: 'Well?', options: [{ text: 'I didn\'t find anything.', next: 'gwC9' }] },
      gwC9: { text: 'Then it\'s the rustbacks. They\'ll eat anything with a bit of copper in it. Thanks for looking.', effect: (g) => { g.addMarks(10); g.setStage(COPPER, 'done'); } },
    });
    addOption(D, 'hesk', 'main', { text: 'Rustbacks again?', next: 'gwR1', cond: (g) => at(g, HANDS) === 'done' && !at(g, RUST) });
    addOption(D, 'hesk', 'main', { text: 'You look worried.', next: 'gwC1', cond: (g) => at(g, HANDS) === 'done' && !at(g, COPPER) });

    // ---- Tamsin: the copper
    hook(D, 'tamsin', (g) => (at(g, COPPER) === 'tamsin' ? 'gwT1' : undefined), {
      gwT1: { text: 'You\'ve been in my onions.', next: 'gwT2' },
      gwT2: { text: 'Gil owes me. Copper\'s how he pays. Where a man\'s copper comes from isn\'t my business.', options: [{ text: 'It\'s Harrowgate\'s copper. Stop taking it, and forgive Gil the eleven marks.', next: 'gwT3' }] },
      gwT3: { text: 'Forgive eleven marks.', next: 'gwT4' },
      gwT4: { speaker: 'narrator', text: 'You can watch her do the arithmetic. It takes a while, and it doesn\'t come out well for anyone.', next: 'gwT5' },
      gwT5: {
        text: 'Fine. Gil\'s debt is gone, and so is my copper. You owe me a favour I\'ll never collect, which is the worst kind to owe.',
        effect: (g) => g.setStage(COPPER, 'done'),
      },
    });
  },
};
