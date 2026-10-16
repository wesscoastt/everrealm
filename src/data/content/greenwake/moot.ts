import type { DialogueTree, GameApi } from '../../../game/api';
import { addOption, at, hook, type Marks } from '../kit';
import type { RegionContent } from '../types';

// THE THIRD ITEM (storyline, three quests) and THE FORD POST (short), both given by Ivy Marsh.
//
// Maud signed the Pit lease without calling a moot because the bridge piles are failing: the mason
// from Ansbury quoted 120 marks, the village had 31, and Harrowgate offered 40 a quarter. The
// orange staining in the piles' cracks is the Pit's own runoff eating the mortar.
// Outcome flag: mootChoice = 'keep' | 'end' | 'ponds'.

const M1 = 'gwMoot1', M2 = 'gwMoot2', M3 = 'gwMoot3', FORD = 'gwFord';
const moot = (g: GameApi) => g.flag('mootChoice') as 'keep' | 'end' | 'ponds' | undefined;

const ivy: DialogueTree = {
  start: (g) => {
    if (at(g, M1) === 'ivy') return 'm1done';
    if (at(g, M1) === 'hesk' || at(g, M1) === 'lease') return 'm1wait';
    if (at(g, M2) && at(g, M2) !== 'done') return 'm2wait';
    if (at(g, M3) === 'moot') return 'mo1';
    if (at(g, FORD) === 'ivy') return 'f4';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (at(g, M3) === 'done' ? afterMoot(g) : 'First item: the bell. Second item: the bell. Maud writes a notice as if she\'s paying by the letter.'),
      options: [
        { text: 'What should the third item be?', next: 't1', cond: (g) => !at(g, M1) },
        { text: 'Tell me about the ford, before the bridge.', next: 'f1', cond: (g) => !at(g, FORD) },
        { text: 'Bye.' },
      ],
    },
    t1: {
      text: 'The Pit. Harrowgate opened it in the spring, under a lease our reeve signed. I\'d like to know what\'s in that lease, and who agreed to it, because I didn\'t.',
      next: 't2',
    },
    t2: { text: 'A lease that size wants a moot. There wasn\'t one. I\'m eighty-three, and I\'ve stood under that Oak for every moot since I could stand.', next: 't3' },
    t3: {
      text: 'Hesketh Dunmore at the Pit will have the company\'s copy. He\'s an honest man in a dishonest coat. Ask to see it.',
      options: [
        { text: 'I\'ll ask him.', effect: (g) => g.setStage(M1, 'hesk') },
        { text: 'Not my business.' },
      ],
    },
    m1wait: { text: 'The Pit\'s up the hill. Follow the orange stream. That\'s not a figure of speech.' },
    m1done: { text: 'Well?', options: [{ text: 'Tell her what the lease says.', next: 'm1b' }] },
    m1b: { speaker: 'narrator', text: 'You tell her: ten years, forty marks a quarter to the reeve, and under "consent of the moot", Not convened. Matter of urgency.', next: 'm1c' },
    m1c: { text: 'Matter of urgency. Maud has never been urgent in her life. She once took a week to agree it was raining.', next: 'm1d' },
    m1d: {
      text: 'Ask her what the urgency was. She won\'t tell me. She might tell somebody who isn\'t a vote.',
      effect: (g) => { g.addMarks(5); g.setStage(M1, 'done'); },
    },
    m2wait: { text: 'Has Maud told you? No. Maud tells people things the way the Wend gives back boots.' },

    // ---- The moot
    mo1: {
      text: 'Maud told you, then. Or you found out, which is the same thing with more walking.',
      options: [{ text: 'Call the moot.', next: 'mo2' }, { text: 'Not yet.' }],
    },
    mo2: { speaker: 'narrator', text: 'Ivy rings the handbell she keeps for the purpose. It takes the village twenty minutes to arrive under the Oak, and most of that is Joss Wether looking for his other boot.', next: 'mo3' },
    mo3: { text: 'The moot sits. Third item: the Pit lease. Maud?', next: 'mo4' },
    mo4: { speaker: 'narrator', text: 'Maud stands up and says it in short sentences: the piles, the mason, a hundred and twenty marks, thirty-one in the box, forty a quarter from Harrowgate. Nobody interrupts. Hollin Ford has never once not interrupted.', next: 'mo5' },
    mo5: { speaker: 'narrator', text: 'Pell Garrow says, to nobody in particular, "Penny water\'s what\'s eating them piles."', next: 'mo6' },
    mo6: {
      text: 'You did the walking. The moot will hear you first.',
      options: [
        { text: 'Keep the lease. The bridge can\'t wait.', next: 'keep' },
        { text: 'Give Harrowgate notice. The Pit is what\'s breaking the bridge.', next: 'end' },
        { text: 'Keep it on a condition: Harrowgate digs the settling ponds Hesk asked for.', next: 'ponds', cond: (g) => !!g.flag('heskLetters') },
      ],
    },
    keep: { speaker: 'narrator', text: 'The moot keeps the lease, on a show of hands that takes three counts because Joss keeps putting his down to scratch.', effect: (g) => g.setFlag('mootChoice', 'keep'), next: 'keep2' },
    keep2: { text: 'Kept. Maud keeps her chain. The Wend keeps its penny water. Everybody keeps something.', next: 'close' },
    end: { speaker: 'narrator', text: 'Notice is given, to run out at the quarter. The bridge fund goes back to thirty-one marks. Maud doesn\'t argue. She writes it down.', effect: (g) => g.setFlag('mootChoice', 'end'), next: 'end2' },
    end2: { text: 'Ended. The water will clear, slowly. The piles won\'t wait for it to.', next: 'close' },
    ponds: { speaker: 'narrator', text: 'You read out Hesk Dunmore\'s letters to the company, both of them, and both answers, which are about output. Somebody laughs. Hesk, at the back, doesn\'t.', effect: (g) => g.setFlag('mootChoice', 'ponds'), next: 'ponds2' },
    ponds2: { speaker: 'narrator', text: 'The moot votes: the lease stands if the ponds are dug by spring. Hesk says his crew will start on firstday, company or no company.', next: 'ponds3' },
    ponds3: { text: 'A condition. I like a condition. It gives people something to watch.', next: 'close' },
    close: {
      text: 'The moot rises. I\'ll write it up. My hand\'s better than Maud\'s, and she knows it.',
      effect: (g) => { g.addMarks(30); g.setStage(M3, 'done'); },
    },

    // ---- The ford post
    f1: { text: 'Before the bridge there was a rope, and before the rope there was my father, and before my father there were a great many wet sheep.', next: 'f2' },
    f2: { text: 'He ran the ford for thirty years: an iron post on the far bank, a rope through the ring on top. They pulled the post out when the bridge opened. Or said so.', next: 'f3' },
    f3: {
      text: 'I\'d like to know if it\'s still there. My eyes won\'t do the far bank any more.',
      options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(FORD, 'post') }, { text: 'Bye.' }],
    },
    f4: { text: 'Well?', options: [{ text: 'It\'s still there. The ring is worn bright on one side.', next: 'f5' }] },
    f5: { speaker: 'narrator', text: 'She doesn\'t say anything for a while.', next: 'f6' },
    f6: { text: 'They said they pulled it out. Forty-one years I\'ve believed them.', next: 'f7' },
    f7: {
      text: 'Here. My father\'s ferry token. It got you across for nothing, once.',
      effect: (g) => { g.give('ford_token'); g.setStage(FORD, 'done'); },
    },
  },
};

function afterMoot(g: GameApi): string {
  const c = moot(g);
  if (c === 'ponds') return 'Hesk\'s crew are digging. I walk up on fine days to watch. It\'s the best thing on in the vale.';
  if (c === 'end') return 'Notice is given. The water\'s still orange. Give it a year. I\'ve given worse things longer.';
  return 'The lease stands. I lost. I don\'t mind losing. I minded not being asked.';
}

export const GW_MOOT: RegionContent = {
  id: 'greenwake-moot',
  items: [
    { id: 'ford_token', name: 'Ferry token', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'coin', a: '#a8a090' }, desc: 'A lead disc with a rope cut into one face. It got you across the Wend at Hollin Ford before there was a bridge.' },
  ],
  dialogue: { ivy },
  readables: {
    pitLease: {
      title: 'Lease, Sallow Pit',
      body: 'LEASE. Sallow Pit, upper and lower galleries, to Harrowgate & Daughters, for ten years from Lady Day.\n\nRent: forty marks the quarter, paid to the reeve of Hollin Ford for the use of the village.\n\nSigned: M. Ashby, Reeve.\nWitnessed: H. Dunmore, for the company.\n\nConsent of the moot: Not convened. Matter of urgency.',
      effect: (g) => { if (at(g, M1) === 'lease') g.setStage(M1, 'ivy'); },
    },
    bridgePiles: {
      title: 'Under the bridge',
      body: 'From the bank you can see under the middle arch. The two piles in the current are scoured hollow at the waterline, the mortar gone pale and soft. One has a crack you could put your hand in.\n\nThe stones round the crack are stained orange.',
      effect: (g) => { if (at(g, M2) === 'piles') g.setStage(M2, 'maud2'); },
    },
  },
  things: [
    { id: 'leaseCopy', x: 213.5, z: 117.5, label: 'Read the lease on the crates', radius: 2.4, read: 'pitLease', when: (g) => !!at(g, M1) },
    { id: 'bridgePiles', x: 166.5, z: 188.5, label: 'Look under the bridge', radius: 2.6, read: 'bridgePiles', when: (g) => !!at(g, M2) },
    {
      id: 'fordPost', x: 177.5, z: 191.5, label: 'Look at the post in the shallows', radius: 2.6, when: (g) => at(g, FORD) === 'post',
      use: (g) => { g.toast('Half under the water: an iron post with a ring on top, worn bright on one side where a rope ran for thirty years.'); g.setStage(FORD, 'ivy'); },
    },
  ],
  quests: {
    [M1]: {
      id: M1, name: 'The Third Item', region: 'greenwake', depth: 'storyline', next: [M2, 'maud'],
      notes: (_g, s) => {
        if (s === 'hesk') return 'Ivy Marsh, the oldest woman in Hollin Ford, wants a third item on the moot notice: the Pit lease, which Maud signed without calling a moot. Hesk Dunmore at Sallow Pit will have the company\'s copy.';
        if (s === 'lease') return 'Hesk says the lease is on the crates by the Pit\'s tally shed, and nobody has ever asked to read it.';
        if (s === 'ivy') return 'The lease: ten years, forty marks a quarter to the reeve. "Consent of the moot: not convened. Matter of urgency." Ivy should hear it.';
        return 'Ivy wants to know what Maud\'s "matter of urgency" was. Maud won\'t tell Ivy. She might tell me.';
      },
      objectives: (_g, s) => {
        if (s === 'hesk') return [{ text: 'Ask Hesk Dunmore at Sallow Pit about the lease', marker: 'hesk' }];
        if (s === 'lease') return [{ text: 'Read the lease on the crates by the tally shed', marker: 'leaseCopy' }];
        if (s === 'ivy') return [{ text: 'Tell Ivy Marsh what the lease says', marker: 'ivy' }];
        return [];
      },
      marks: (_g, s): Marks => (!s ? { ivy: '!' } : s === 'hesk' ? { hesk: '?' } : s === 'ivy' ? { ivy: '?' } : {}),
    },
    [M2]: {
      id: M2, walk: { cast: ['maud', 'pell'], from: { quests: { gwMoot1: 'done', gwMoot2: 'maud' } } }, name: 'Matter of Urgency', region: 'greenwake', depth: 'storyline', next: [M3, 'moot'],
      notes: (_g, s) => {
        if (s === 'maud') return 'The Pit lease says the moot wasn\'t called because of a "matter of urgency". Maud Ashby signed it.';
        if (s === 'pell') return 'Maud says the lease was signed properly, and if I want to know about urgency I should ask Pell Garrow what\'s under the bridge.';
        if (s === 'piles') return 'Pell: the middle piles of the bridge are failing, the mortar washing out "like sugar". He told Maud at Candlemas. He says to look from the bank below the dock.';
        if (s === 'maud2') return 'The two middle piles are scoured hollow, one cracked through, and the stone round the crack is stained orange: penny water from the Pit.';
        return 'The Ansbury mason quoted 120 marks for the piles. The village had 31. Harrowgate offered 40 a quarter for the Pit. Maud didn\'t call a moot because she thought it would argue until the bridge fell in. Ivy can call one now.';
      },
      objectives: (_g, s) => {
        if (s === 'maud') return [{ text: 'Ask Maud Ashby about the "matter of urgency"', marker: 'maud' }];
        if (s === 'pell') return [{ text: 'Ask Pell Garrow what\'s under the bridge', marker: 'pell' }];
        if (s === 'piles') return [{ text: 'Look under the bridge from the bank below the dock', marker: 'bridgePiles' }];
        if (s === 'maud2') return [{ text: 'Go back to Maud', marker: 'maud' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'maud' || s === 'maud2' ? { maud: '?' } : s === 'pell' ? { pell: '?' } : {}),
    },
    [M3]: {
      id: M3, name: 'The Moot', region: 'greenwake', depth: 'storyline',
      notes: (g, s) => {
        if (s === 'done') {
          const c = moot(g);
          if (c === 'ponds') return 'The moot kept the Pit lease on a condition: Harrowgate digs Hesk\'s settling ponds by spring. Hesk is starting whether the company likes it or not.';
          if (c === 'end') return 'The moot gave Harrowgate notice on the Pit lease. The Wend will clear in time. The bridge fund is back to thirty-one marks.';
          return 'The moot kept the Pit lease. The bridge piles will be mended by autumn. The penny water keeps running.';
        }
        return 'Ivy Marsh will call a moot under the Oak about the Pit lease, and the moot will hear me first.' + (g.flag('heskLetters') ? ' I have copies of Hesk\'s letters to Harrowgate asking for settling ponds, and their answers.' : '');
      },
      objectives: (g, s) => {
        if (s !== 'moot') return [];
        const o: { text: string; marker?: string; done?: boolean }[] = [{ text: 'Ask Ivy Marsh to call the moot', marker: 'ivy' }];
        o.push({ text: '(Optional) Ask Hesk Dunmore about his letters to the company', marker: 'hesk', done: !!g.flag('heskLetters') });
        return o;
      },
      marks: (_g, s): Marks => (s === 'moot' ? { ivy: '?' } : {}),
      walk: { cast: ['hesk'], from: { quests: { gwMoot1: 'done', gwMoot2: 'done', gwMoot3: 'moot' } } },
    },
    [FORD]: {
      id: FORD, name: 'The Ford Post', region: 'greenwake', depth: 'short',
      notes: (_g, s) => (s === 'done'
        ? 'The iron post from the old ford is still standing in the shallows below the bridge. Ivy gave me her father\'s ferry token.'
        : 'Before the bridge, Ivy Marsh\'s father ran the ford with a rope through an iron ring on a post. They said they pulled the post out when the bridge opened. Ivy wants to know if it\'s still there, on the far bank below the bridge.'),
      objectives: (_g, s) => (s === 'post' ? [{ text: 'Find the old ford post in the shallows below the bridge', marker: 'fordPost' }] : s === 'ivy' ? [{ text: 'Tell Ivy Marsh', marker: 'ivy' }] : []),
      marks: (_g, s): Marks => (!s ? { ivy: '!' } : s === 'ivy' ? { ivy: '?' } : {}),
      walk: { cast: ['ivy'] },
    },
  },
  hooks: (D) => {
    // Hesk: the lease, his letters, and what the moot did to his Pit
    hook(D, 'hesk', (g) => (at(g, M1) === 'hesk' ? 'gwLease' : undefined), {
      gwLease: {
        text: 'The lease? On the crates by the tally shed, under a stone so it doesn\'t blow off. Company says show it to anyone who asks. You\'re the first.',
        effect: (g) => g.setStage(M1, 'lease'),
      },
      gwLetters: { text: 'Both of them. And both answers. Read them out, if you like. I\'d rather it was you than me.', effect: (g) => g.setFlag('heskLetters') },
      gwMootAfter: {
        text: (g) => {
          const c = moot(g);
          if (c === 'ponds') return 'Ponds. At last. Harrowgate wrote back about output again. I\'m digging anyway.';
          if (c === 'end') return 'Notice at the quarter. I\'ll be sorry to go, and I won\'t say so in front of the company.';
          return 'The lease stands. I\'ll keep writing about ponds. Somebody in Harrowgate must eventually run out of paper.';
        },
      },
    });
    addOption(D, 'hesk', 'main', { text: 'Ivy is calling a moot about the lease. Do you have copies of your letters about the ponds?', next: 'gwLetters', cond: (g) => at(g, M3) === 'moot' && !g.flag('heskLetters') });
    addOption(D, 'hesk', 'main', { text: 'What do you make of the moot?', next: 'gwMootAfter', cond: (g) => at(g, M3) === 'done' });

    // Maud: the urgency
    hook(D, 'maud', (g) => (at(g, M2) === 'maud' ? 'gwU1' : at(g, M2) === 'maud2' ? 'gwU5' : undefined), {
      gwU1: { text: 'You\'ve been talking to Ivy Marsh.', options: [{ text: 'What was the matter of urgency?', next: 'gwU2' }] },
      gwU2: { text: 'The lease was signed properly. I\'m the reeve. Reeves sign things.', next: 'gwU3' },
      gwU3: { speaker: 'narrator', text: 'She straightens a peg in the bell frame. It was straight.', next: 'gwU4' },
      gwU4: {
        text: 'If you want to know about urgency, ask Pell Garrow what\'s under the bridge. He\'s been sitting on top of it for sixty years.',
        effect: (g) => g.setStage(M2, 'pell'),
      },
      gwU5: { text: 'You\'ve looked.', options: [{ text: 'How long have the piles got?', next: 'gwU6' }] },
      gwU6: { text: 'The mason from Ansbury says two winters. He quoted a hundred and twenty marks. The village had thirty-one.', next: 'gwU7' },
      gwU7: { text: 'Harrowgate offered forty a quarter for the Pit. That\'s new piles by autumn.', options: [{ text: 'Why not call a moot?', next: 'gwU8' }] },
      gwU8: { text: 'Because the moot would have argued until the bridge fell in, and then argued about whose fault it was.', next: 'gwU9' },
      gwU9: { speaker: 'narrator', text: 'She says it quietly and very politely, which is how Maud says the things she\'s angriest about.', next: 'gwU10' },
      gwU10: {
        text: 'Tell Ivy, if you like. She\'ll call a moot. She\'s been waiting forty years to call one.',
        effect: (g) => { g.addMarks(10); g.setStage(M2, 'done'); },
      },
    });

    // Pell: what's under the bridge, and the water afterwards
    hook(D, 'pell', (g) => (at(g, M2) === 'pell' ? 'gwB1' : undefined), {
      gwB1: { text: 'Under the bridge? Stones. Water. Penny water, these days.', options: [{ text: 'Maud says to ask you what\'s under it.', next: 'gwB2' }] },
      gwB2: { text: 'Does she.', next: 'gwB3' },
      gwB3: { speaker: 'narrator', text: 'He looks at the bridge for a while, which isn\'t something he usually bothers to do.', next: 'gwB4' },
      gwB4: { text: 'Piles are going. The two in the middle. Mortar\'s washing out of them like sugar. I told Maud at Candlemas.', next: 'gwB5' },
      gwB5: {
        text: 'Go and look, if you don\'t believe me. From the bank, below the dock. Mind the third board.',
        effect: (g) => g.setStage(M2, 'piles'),
      },
      gwWater: {
        text: (g) => {
          const c = moot(g);
          if (c === 'ponds') return 'Water\'s clearing. Saw a trout yesterday. Didn\'t catch it. But I saw it.';
          if (c === 'end') return 'Pit\'s going. Took them a season to break the river. It\'ll take it ten to mend.';
          return 'Lease stands. Penny water stands. I stand on the dock and complain. Everyone\'s happy.';
        },
      },
    });
    addOption(D, 'pell', 'main', { text: 'How\'s the water since the moot?', next: 'gwWater', cond: (g) => at(g, M3) === 'done' });
  },
};
