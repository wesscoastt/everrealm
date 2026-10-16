import type { DialogueTree, DNode, DOption, GameApi } from '../game/api';

// The main story: THE CHARTER'S DEBT.
//
// The Charter paved the Turnpike with borrowed money. Harrowgate & Daughters bought that debt from
// the guilds at three marks in ten, and now offers to forgive it in exchange for the star crystal
// under the Glass Kirk. Every toll squeeze in the regional quests (the Weighhouse,
// the Light Fund's oil, Mr Pryce's buying) runs back to this debt. Under Gallows Knap is the record
// of what happened the last time anyone stripped the cap off a crystal body: the ground went up,
// with forty-one people on it. The Weatherholms are those fields.
//
// Chapters (quest ids): storyNotice, storyMossgate, storyCrown, storyStar, storyLift, storySitting.
// Ending flag: charterEnd = 'refuse' | 'joan' | 'paid'.
// Voice notes and canon: docs/NARRATIVE_STYLE.md, docs/LORE.md.

const s = (g: GameApi, q: string) => g.stage(q);
const end = (g: GameApi) => g.flag('charterEnd') as 'refuse' | 'joan' | 'paid' | undefined;

/** What Mr Pryce asks for the page, depending on how the player left things at Harrowgate. */
export function pagePrice(g: GameApi): number {
  const c = g.flag('fpChoice');
  return c === 'leverage' ? 0 : c === 'delia' ? 120 : 60;
}

export const STORY_DIALOGUE: Record<string, DialogueTree> = {
  // ================================================================ I. THE NOTICE (Ansbury)

  // ---------------------------------------------------------------- Lowen Pike, Clerk of the Toll Office
  lowen: {
    start: (g) => {
      const n = s(g, 'storyNotice');
      if (!n) return 'intro';
      if (n === 'pike') return 'p1';
      if (n === 'maren') return 'w_maren';
      if (s(g, 'storySitting') === 'sitting') return 'sitting';
      if (end(g)) return 'after';
      return 'between';
    },
    nodes: {
      intro: {
        text: 'Toll Office. If you\'re paying, the Corporal takes it. If you\'re complaining, I take it, and I take it slowly.',
        options: [
          { text: 'What\'s the Charter notice by the gate about?', next: 'p1', effect: (g) => g.setStage('storyNotice', 'pike') },
          { text: 'Bye.' },
        ],
      },
      p1: {
        text: 'The Glass Kirk. At the next sitting, the Charter will let the crystal under it to Harrowgate & Daughters.',
        options: [{ text: 'Why?', next: 'p2' }],
      },
      p2: { text: 'Because the Charter owes Harrowgate forty thousand marks, and Harrowgate has offered to take crystal instead.', options: [{ text: 'Forty thousand marks for what?', next: 'p3' }] },
      p3: {
        text: 'The Turnpike. Paved from Hollin Ford to the coast, twelve years ago, with money the Charter didn\'t have. It borrowed from the guilds.',
        next: 'p4',
      },
      p4: { text: 'The guilds have been selling that debt on. Lately, all of it sells to Harrowgate.', next: 'p5' },
      p5: { speaker: 'narrator', text: 'He turns the ledger round so you can read it upside down. You can\'t.', next: 'p6' },
      p6: {
        text: (g) => {
          const parts = ['Every toll on this road goes to Harrowgate before it goes to anything else.'];
          if (g.flag('hwChoice')) parts.push('Osric\'s weights reading heavy all summer? That was the Charter collecting for Harrowgate, a sack at a time.');
          else parts.push('The Weighhouse, the Light Fund, the lot.');
          return parts.join(' ');
        },
        next: 'p7',
      },
      p7: {
        text: (g) => (s(g, 'gannetLog') === 'done' && g.flag('gannetChoice') !== 'spare'
          ? 'And Fleet\'s oil, which you know about. Nessa Crane has written to me four times. I held those barrels back. I\'d do it again with the same books. I would like different books.'
          : 'Fleet Light got six barrels of oil this winter instead of nine. I held the other three back against the arrears. I\'d do it again with the same books. I would like different books.'),
        next: 'p8',
      },
      p8: {
        text: 'Now there\'s a way out. Give Harrowgate the Kirk crystal and the debt is gone. The sitting will vote for it. I would, if I didn\'t read my letters.',
        options: [{ text: 'What letters?', next: 'p9' }],
      },
      p9: {
        text: 'Ilse Blewitt at Scarth Watch wrote to the Speaker in the spring. Nobody read it except me, and I\'m not anybody.',
        options: [{ text: 'Read the letter.', next: 'p10' }],
      },
      p10: {
        speaker: 'narrator',
        text: '"To the Speaker. Before you let anyone take the cap off the Kirk stone, find out why there are arches at Ketley and nobody left to have built them. The arches face the wrong way. I. Blewitt."',
        effect: (g) => g.setFlag('ilseLetterRead'),
        next: 'p11',
      },
      p11: {
        text: 'Ketley is in Hagworm Wood, under the big trees. I don\'t know what she means and I haven\'t time to find out. You look like you have more of both.',
        options: [{ text: 'And Harrowgate?', next: 'p12' }],
      },
      p12: {
        text: 'Hilda Harrowgate is in Ansbury for the sitting. Keep steps, most days. She\'ll tell you exactly what she wants. She always does.',
        effect: (g) => g.setStage('storyNotice', 'maren'),
      },
      w_maren: { text: 'Keep steps. Grey coat. She\'ll see you before you see her.' },
      between: { text: 'The sitting will wait for the Speaker, and the Speaker is waiting for the debt to go away. Bring her something.' },
      sitting: {
        text: 'The Speaker is on the keep steps, and everyone who matters is there, and so am I.',
        options: [
          { text: 'Who bought the Charter\'s debt, and for how much?', next: 'who', cond: (g) => !g.has('pryce_page') },
          { text: 'Bye.' },
        ],
      },
      who: { text: 'Ask the man at Harrowgate Works who writes every price down twice. He\'ll know. He\'ll want paying for knowing.', effect: (g) => g.setFlag('lowenPryce') },
      after: {
        text: (g) => {
          const e = end(g);
          if (e === 'refuse') return 'A mark more on every cart. I painted the new board myself. My hand shook, which is a first.';
          if (e === 'joan') return 'Twenty years of crystal against forty thousand marks. I\'ve drawn up the schedule. It\'s very long and very dull and I love it.';
          return 'Twelve thousand and a tenth, in one year. The Light Fund\'s arrears go back to Fleet first. I wrote that line before anything else.';
        },
      },
    },
  },

  // ---------------------------------------------------------------- Hilda Harrowgate, the Ansbury side of the company
  maren: {
    start: (g) => {
      if (s(g, 'storyNotice') === 'maren') return 'meet';
      if (s(g, 'storySitting') === 'sitting') return 'sitting';
      if (end(g)) return 'after';
      return 'main';
    },
    nodes: {
      main: { text: 'Hilda Harrowgate. If you\'ve a contract, I\'ll read it. If you\'ve a grievance, my sister Delia has a notice for that.' },
      meet: {
        text: (g) => {
          const c = g.flag('fpChoice');
          if (c === 'delia') return 'You read Mr Pryce\'s book for Delia. She wrote and told me. She doesn\'t write and tell me much.';
          if (c === 'leverage') return 'Mr Pryce speaks well of you. I\'d worry about that, if I were you.';
          return 'You\'ve been to the Toll Office. Lowen Pike has a face for bad news, and he\'s worn it all week.';
        },
        options: [{ text: 'Why the Kirk?', next: 'm2' }],
      },
      m2: {
        text: 'Because the Charter can\'t pay and won\'t stop trying. Tolls on barley, oil kept from a lighthouse. I\'d rather be paid in crystal than watch them squeeze carters to pay me.',
        options: [
          { text: 'You bought the debt cheap. You\'re squeezing them now.', next: 'm3' },
          { text: 'That\'s generous of you.', next: 'm3b' },
        ],
      },
      m3: { text: 'We bought what the guilds wanted to sell. Debts are paid or they aren\'t. I would like this one paid.', next: 'm4' },
      m3b: { text: 'It isn\'t. It\'s efficient. People confuse the two when it suits them.', next: 'm4' },
      m4: {
        text: 'Is there something else? You have a look about you, like someone holding a letter.',
        options: [{ text: 'Ilse Blewitt says to find out about Ketley first.', next: 'm5' }],
      },
      m5: { text: 'My sister Joan says the same, more or less. Joan is an engineer, so she says "more or less" about everything.', next: 'm6' },
      m6: {
        text: 'Go to Ketley, by all means. Bring the sitting something better than a feeling.',
        effect: (g) => { g.addMarks(10); g.setStage('storyNotice', 'done'); },
      },
      sitting: { text: 'Not now. The Speaker is sitting.' },
      after: {
        text: (g) => {
          const e = end(g);
          if (e === 'refuse') return 'Barley, then. I hope your carters thank you.';
          if (e === 'joan') return 'Twenty years. Joan had better be right, and careful, and she had better write.';
          return 'Twelve thousand and a tenth, for forty. You\'ve cost my family nearly twenty-seven thousand marks, and Hollin Ford its Pit for the winter. I hope it was worth it. It may have been.';
        },
      },
    },
  },

  // ================================================================ II. WRONG WAY ROUND (Hagworm Wood)

  // ---------------------------------------------------------------- Wynn Carrow, antiquarian at Ketley
  wynn: {
    start: (g) => {
      const m = s(g, 'storyMossgate');
      if (m === 'wynn') return 'meet';
      if (m === 'arch') return g.flag('archRead') ? 'moor' : 'w_arch';
      if (m === 'oak') return 'w_oak';
      if (m === 'slate') return 'slate';
      if (m === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: { text: 'Mind the arch. Not that one. Any of them. They\'ve stood eight hundred years, and I\'d like them to manage eight hundred and one.' },
      meet: {
        text: 'You\'ve read Ilse Blewitt\'s letter. "The arches face the wrong way." She got that from me. She was quoting.',
        options: [{ text: 'What does it mean?', next: 'w2' }],
      },
      w2: { text: 'Look at them. Every lintel has a groove worn across it on the north side, slanting up, as if a rope sawed there for years.', next: 'w3' },
      w3: { text: 'Gates don\'t have rope grooves. Moorings do.', options: [{ text: 'Mooring what? There\'s no water here.', next: 'w4' }] },
      w4: {
        text: 'No. Go and look at the near arch, and then tell me I\'m wrong. I\'d love to be wrong. I\'ve been right on my own for eleven years.',
        effect: (g) => g.setStage('storyMossgate', 'arch'),
      },
      w_arch: { text: 'The near arch. Look at the top of it, then the pillars.' },
      moor: { text: 'A field, tied down. You saw it.', options: [{ text: 'Tied down against what?', next: 'moor2' }] },
      moor2: { text: 'Against going up.', next: 'moor3' },
      moor3: { speaker: 'narrator', text: 'He lets it sit, the way people do with a thing they\'ve said to themselves many times and out loud very few.', next: 'moor4' },
      moor4: {
        text: 'The people who built this didn\'t write. They drew, and they counted. We don\'t know what they called themselves. We call them after the places they left.',
        next: 'moor5',
      },
      moor5: {
        text: 'If anything they made is still whole, it\'ll be in the Hollow Oak. It\'s been Hagworm Wood\'s post box since before there was a Charter: letters, debts, apologies. The oldest things in it aren\'t letters.',
        next: 'moor6',
      },
      moor6: {
        text: 'Thornwolves den at its roots this time of year. Take something sharp.',
        effect: (g) => g.setStage('storyMossgate', 'oak'),
      },
      w_oak: { text: 'The Hollow Oak, north up the old road. Inside the trunk, down at the roots.' },
      slate: { text: 'That\'s it. Give it here. Gently. It\'s older than the Charter, and it\'s spent most of that inside a tree.', options: [{ text: 'Hand him the slate.', next: 'sl2' }] },
      sl2: { speaker: 'narrator', text: 'He holds it to the light and turns it a little at a time.', next: 'sl3' },
      sl3: { text: 'A field. Ropes. And here, a hill, with a crown cut into the top of it. Points all round.', next: 'sl4' },
      sl4: { text: 'That\'s Gallows Knap, in the Marches. Harrowgate keeps stores in the ruin now. And look: in this one they\'ve cut the crown off, and in this one the field has gone.', options: [{ text: 'Gone where?', next: 'sl5' }] },
      sl5: { text: 'Up.', next: 'sl6' },
      sl6: { speaker: 'narrator', text: 'He hands the slate back flat on both palms, as if it might go up too.', next: 'sl7' },
      sl7: {
        text: 'Whatever they cut out of that hill, there\'s more of it under the Glass Kirk. Go and look under the Crown. Then tell Ilse I was right.',
        effect: (g) => { g.addMarks(15); g.setStage('storyMossgate', 'done'); },
      },
      after: { text: 'I\'ve written to Ilse. Four pages. She\'ll read one, and it\'ll be the wrong one.' },
    },
  },

  // ================================================================ IV-V. THE FALLEN STAR / THE LIFT (Scarth)

  // ---------------------------------------------------------------- Sela Orme, keeper of the Kirk
  sela: {
    start: (g) => {
      if (s(g, 'storyStar') === 'sela') return 'meet';
      if (s(g, 'storyStar') === 'joan') return 'w_joan';
      const l = s(g, 'storyLift');
      if (l === 'cut' || l === 'fight') return 'fight';
      if (l === 'after') return 'w_after';
      if (end(g)) return 'after';
      return 'main';
    },
    nodes: {
      main: { text: 'People come up here to put a hand on it. I keep the floor swept and write their names in a book. That\'s the whole of the job, and it\'s enough.' },
      meet: { text: 'You\'re not a pilgrim. Pilgrims look at the star. You\'re looking at the stakes.', next: 'meet2' },
      meet2: {
        text: 'Harrowgate put them in last month. Every one of them went through a stone somebody laid by hand.',
        options: [{ text: 'Show her the rubbing from under Gallows Knap.', next: 'meet3' }],
      },
      meet3: { speaker: 'narrator', text: 'She reads it for longer than Ilse did. When she reaches the forty-one she puts a finger on it and keeps it there.', next: 'meet4' },
      meet4: { text: 'And they mean to do it here, for a debt about a road.', options: [{ text: 'What will you do?', next: 'meet5' }] },
      meet5: {
        text: 'Keep the floor swept. And go down to Ansbury for the sitting, if someone will walk with me. I haven\'t been off this hill in six years.',
        next: 'meet6',
      },
      meet6: {
        text: 'Talk to Joan Harrowgate, at the east end with her tents. She\'s the one with the measures. She isn\'t the one with the say.',
        effect: (g) => g.setStage('storyStar', 'joan'),
      },
      w_joan: { text: 'East end. The tents. The woman shouting numbers.' },
      fight: { text: 'Not now! Get them off my floor!' },
      w_after: { text: 'Two feet. The floor\'s two feet higher than it was this morning. I\'m going to need a longer broom.' },
      after: {
        text: (g) => {
          const e = end(g);
          if (e === 'joan') return 'They\'re cutting at the edges, ten feet under the cap. Joan comes up every evening and tells me the number. So far the number is nothing.';
          if (e === 'paid') return 'They\'ve pulled the stakes out. I\'ve filled the holes. You can\'t see where they were, if you don\'t know.';
          return 'The stakes are out. The Charter refused them. I hear the carters are paying for it, which I didn\'t want, and can\'t help.';
        },
      },
    },
  },

  // ---------------------------------------------------------------- Joan Harrowgate, engineer
  joan: {
    start: (g) => {
      if (s(g, 'storyStar') === 'joan') return 'meet';
      const l = s(g, 'storyLift');
      if (l === 'cut' || l === 'fight') return 'fight';
      if (l === 'after') return 'after';
      if (end(g)) return 'end';
      return 'main';
    },
    nodes: {
      main: { text: 'Joan Harrowgate. I measure the things my sisters sell.' },
      meet: {
        text: 'If you\'re here about the stakes, they\'re straight. I put them in myself.',
        options: [{ text: 'Show her the rubbing.', next: 'j2' }],
      },
      j2: { speaker: 'narrator', text: 'She knows what it is before it\'s flat.', next: 'j3' },
      j3: { text: 'I didn\'t get as far as the wall. I got as far as the Queen. Two of my lads didn\'t get that far.', next: 'j4' },
      j4: {
        text: 'One span of lift for every three feet of cap. I wrote it down. I wrote "ten feet, no less." Hilda wrote "tender is for thirty" underneath, because the tender is for thirty.',
        options: [{ text: 'Why thirty?', next: 'j5' }],
      },
      j5: { text: 'Thirty feet of cap off pays forty thousand marks in three years. Ten takes twenty years. Hilda can count. So can the Charter.', next: 'j6' },
      j6: {
        text: 'Take my survey to the sitting. If anyone asks where you got it, I gave it you.',
        effect: (g) => { g.give('joan_survey'); },
        next: 'j7',
      },
      j7: { speaker: 'narrator', text: 'Down at the east end of the floor somebody shouts, and then a great many people shout.', next: 'j8' },
      j8: { text: 'That\'s the cut. I told them to wait for the sitting.', next: 'j9' },
      j9: {
        text: 'Hilda\'s foreman. She wants something to sell before the vote. Go!',
        effect: (g) => g.setStage('storyStar', 'done'),
      },
      fight: { text: 'Get back from the edge! Back!' },
      after: { text: 'Backfill it. All of it. Now.', next: 'a2' },
      a2: { speaker: 'narrator', text: 'She says it to her crew without turning round, and they go.', next: 'a3' },
      a3: { text: 'Two feet. It came up two feet in the time it takes to say so. The tender is for thirty.', next: 'a3b' },
      a3b: { speaker: 'narrator', text: 'She looks at the stakes she put in herself. The floor has come up round them nearly to their tops.', next: 'a4' },
      a4: {
        text: 'I\'m coming to the sitting. So is Sela. I\'ll be standing on the other side of the room from my sister, and she\'ll know exactly why.',
        effect: (g) => { g.addMarks(40); g.setStage('storyLift', 'done'); },
      },
      end: {
        text: (g) => {
          const e = end(g);
          if (e === 'joan') return 'Ten feet of cap, and I\'m the one standing on it. Nobody else gets to say "probably" on this floor.';
          if (e === 'paid') return 'The company bids on nothing for a year. Hilda\'s furious. Delia\'s pleased. I\'m going home to measure something that isn\'t moving.';
          return 'Refused. The crystal stays where it is, under its cap, where I\'d have left it. Hilda will find another way to be paid. She always does.';
        },
      },
    },
  },

  // ================================================================ VI. WHAT THE CHARTER OWES (Ansbury)

  // ---------------------------------------------------------------- Rhosyn Tarrant, Speaker of the Charter
  rhosyn: {
    start: (g) => (s(g, 'storySitting') === 'sitting' ? 'open' : 'after'),
    nodes: {
      open: { text: 'The Charter sits. The question before it is the tender for the crystal under the Glass Kirk.', next: 'o2' },
      o2: { text: 'Harrowgate & Daughters will clear the Charter\'s paving debt, forty thousand marks, in return for the right to cut it. Clerk?', next: 'o3' },
      o3: { speaker: 'narrator', text: 'Lowen Pike reads the debt aloud. It takes a long time, because he reads every guild that sold it on, and the date, and the price.', next: 'ev' },
      ev: {
        text: (g) => (g.flag('shownRubbing') ? 'Is there more?' : 'Does anyone speak against?'),
        options: [
          { text: 'Show the rubbing from under Gallows Knap.', next: 'r1', cond: (g) => g.has('crown_rubbing') && !g.flag('shownRubbing') },
          { text: 'Show Joan Harrowgate\'s survey.', next: 's1', cond: (g) => g.has('joan_survey') && !g.flag('shownSurvey') },
          { text: 'Show the page from Mr Pryce\'s book.', next: 'q1', cond: (g) => g.has('pryce_page') && !g.flag('shownPage') },
          { text: 'I\'ve said what I came to say.', next: 'decide', cond: (g) => !!g.flag('shownRubbing') },
        ],
      },
      r1: { speaker: 'narrator', text: 'You hold it up. The room goes quiet in the way rooms do when everyone in them is counting.', effect: (g) => g.setFlag('shownRubbing'), next: 'r2' },
      r2: { speaker: 'narrator', text: 'Joan Harrowgate stands. "One span of lift for every three feet of cap. I measured it under the Crown. On the Kirk floor, this week, it came up two feet in four seconds."', next: 'r3' },
      r3: { speaker: 'narrator', text: 'Hilda Harrowgate doesn\'t stand. "Then we take ten feet and leave twenty. My sister\'s own figure."', next: 'r4' },
      r4: { speaker: 'narrator', text: 'Joan: "I said ten would probably hold."', next: 'r5' },
      r5: { text: 'Probably. I have built a whole career on probably. I didn\'t build it on a hill.', next: 'ev' },
      s1: { speaker: 'narrator', text: 'Lowen reads the last line aloud. "Tender is for thirty. M.H." Nobody looks at Hilda, very carefully.', effect: (g) => g.setFlag('shownSurvey'), next: 's2' },
      s2: { text: 'So the company knew its own engineer\'s figure, and tendered against it.', next: 'ev' },
      q1: { speaker: 'narrator', text: 'Lowen reads it twice. "The Charter\'s paving debt, bought from the guilds at three marks in ten. Forty thousand marks of debt, for twelve thousand."', effect: (g) => g.setFlag('shownPage'), next: 'q2' },
      q2: { text: 'So the Charter owes forty thousand marks to a company that paid twelve for the privilege.', next: 'q3' },
      q3: { speaker: 'narrator', text: 'Hilda Harrowgate: "We bought what people wanted to sell. Ask Mr Pryce why they sold."', next: 'ev' },
      decide: {
        text: 'You\'ve carried this further than anyone in this room. The Charter will hear your advice before it votes.',
        options: [
          { text: 'Refuse the tender. Leave the cap where it is.', next: 'refuse' },
          { text: 'Let it on Joan Harrowgate\'s terms: ten feet of cap, her hand on it, Sela Orme\'s floor untouched.', next: 'joan' },
          { text: 'Pay Harrowgate what it paid for the debt, and a tenth. Then owe it nothing.', next: 'paid', cond: (g) => !!g.flag('shownPage') },
        ],
      },
      refuse: { text: 'Refused. The debt stands, and the Charter will meet it the way it always has.', effect: (g) => g.setFlag('charterEnd', 'refuse'), next: 'refuse2' },
      refuse2: { speaker: 'narrator', text: 'Lowen Pike writes something and doesn\'t look up. Everyone in the room knows it\'s the new toll board.', next: 'refuse3' },
      refuse3: { text: 'A mark more on every cart, from the first of the month. Somebody tell the carters before they read it.', next: 'close' },
      joan: {
        text: 'Let, on terms. Ten feet of cap. The Harrowgate engineer in charge of the cut, and answerable to this Charter. The keeper\'s floor untouched. The debt met from the crystal over twenty years.',
        effect: (g) => g.setFlag('charterEnd', 'joan'),
        next: 'joan2',
      },
      joan2: { speaker: 'narrator', text: 'Hilda: "Twenty years." Joan: "I\'ll be standing on it. That\'s better than right." From the back, Sela Orme: "And I\'ll be counting the feet."', next: 'close' },
      paid: {
        text: 'The Charter will pay Harrowgate & Daughters twelve thousand marks and a tenth, raised by levy over one year, and owe it nothing after. The tender is refused.',
        effect: (g) => g.setFlag('charterEnd', 'paid'),
        next: 'paid2',
      },
      paid2: { speaker: 'narrator', text: 'Hilda Harrowgate stands, for the first time. "Then Harrowgate will bid on nothing in the Charter for a year. Somebody tell Hollin Ford its Pit is shut for the winter."', next: 'paid3' },
      paid3: { text: 'So noted. Clerk: the Light Fund\'s arrears are paid first. Fleet has waited long enough.', next: 'close' },
      close: { text: 'The Charter rises.', next: 'close2' },
      close2: { speaker: 'narrator', text: 'People stand, and talk, and don\'t leave. Sela Orme is already asking Lowen Pike which cart goes back up to the Kirk.', next: 'close3' },
      close3: {
        text: 'The Speaker gives very few of these. I\'m told I should say so.',
        effect: (g) => { g.give('charter_ring'); g.addMarks(150); g.setStage('storySitting', 'done'); },
      },
      after: {
        text: (g) => {
          const e = end(g);
          if (e === 'refuse') return 'The carters have written to me. All of them. Most can\'t spell "Speaker", and they made the effort anyway.';
          if (e === 'joan') return 'Joan writes every month: feet of cap, feet of lift. The second number is still nothing. I read it before anything else.';
          return 'The levy\'s coming in. I\'ve never seen Ansbury pay a tax so cheerfully. It helps that it\'s going to somebody else\'s company.';
        },
      },
    },
  },
};

// Sela and Joan at the sitting are the same people.
STORY_DIALOGUE.selaSitting = {
  start: () => 'main',
  nodes: { main: { text: 'Six years off the hill, and the first thing I see is a room full of people deciding about my floor. Go on. The Speaker\'s waiting for you.' } },
};
STORY_DIALOGUE.joanSitting = {
  start: () => 'main',
  nodes: { main: { text: 'Hilda hasn\'t looked at me once. That\'s how I know she\'s read my survey.' } },
};

// ---------------------------------------------------------------- Things you read for the main story

export const STORY_READABLES: Record<string, { title: string; body: string | ((g: GameApi) => string); effect?: (g: GameApi) => void }> = {
  charterNotice: {
    title: 'Notice of the Charter',
    body: 'NOTICE OF THE CHARTER\n\nAt its next sitting the Charter will hear a tender for the right to cut star crystal at the Glass Kirk, in the Scarth Highlands.\n\nThe tenderer, Harrowgate & Daughters, offers in exchange to clear the Charter\'s paving debt in full.\n\nObjections in writing, to the Clerk of the Toll Office.\n\nR. Tarrant, Speaker\n\nSomeone has written underneath, in pencil: what objections?',
    effect: (g) => { if (!g.stage('storyNotice')) g.setStage('storyNotice', 'pike'); },
  },
  mossArch: {
    title: 'The near arch, Ketley',
    body: 'Two pillars of mossy stone and a lintel across them, taller than a cart.\n\nAcross the north face of the lintel runs a groove as wide as your wrist, polished smooth, slanting up towards the sky.\n\nThe pillars are covered in tally marks, cut in fives, hundreds of them. Among them is one carving: a field, with ropes running from its corners to arches like this one.',
    effect: (g) => g.setFlag('archRead'),
  },
  surveyNotes: {
    title: 'Survey notes, Gallows Knap undercroft',
    body: 'HARROWGATE & DAUGHTERS. Survey of the undercroft, Gallows Knap. J. Harrowgate.\n\nOld cut runs south 60 ft from the camp. Floor 19 ft below the hall. Crystal in the walls throughout.\nCap rock (basalt) over the crystal, 9 to 30 ft.\nWhere the old workers stripped the cap, the floor of the cut has LIFTED. Measured: one span of lift for every three feet of cap taken.\nTally wall at the south end. Builders\' record? Did not reach it. Redbacks. Lost Ennis and Pol.\n\nRECOMMEND: leave no less than ten feet of cap on any crystal body. J.H.\n\nUnderneath, in a smaller, neater hand: Tender is for thirty. M.H.',
    effect: (g) => { g.setFlag('surveyRead'); if (g.stage('storyCrown') === 'descend') g.setStage('storyCrown', 'queen'); },
  },
  crownTally: {
    title: 'The tally wall',
    body: (g) => {
      const wall = 'A panel of dressed stone nine strides wide, cut with pictures and counts. Left to right:\n\nA hill with a crown of stones on top.\nPeople with picks, in rows, tallied in fives.\nThe crown cut away.\nThe ground under the hill, lifted, held by ropes to arches.\nThe ropes cut.\nA field going up, with forty-one marks on it, the mark the builders used for a person.\nThe hill again, broken. No more tallies after that.';
      return g.stage('storyCrown') === 'tally' ? wall + '\n\nYou take a rubbing with charcoal and a sheet of oilcloth from the survey camp.' : wall;
    },
    effect: (g) => {
      if (g.stage('storyCrown') === 'tally' && g.give('crown_rubbing')) { g.addMarks(25); g.setStage('storyCrown', 'done'); }
    },
  },
  ilseGlass: {
    title: 'Through the glass',
    body: 'The Weatherholms, close enough to count stones on.\n\nOn the largest, two broken pillars with a lintel between them. Across the north face of the lintel runs a groove as wide as your wrist, slanting towards the sky.',
    effect: (g) => { if (g.stage('storyStar') === 'glass') g.setStage('storyStar', 'sela'); },
  },
};

// ---------------------------------------------------------------- Story lines added to people from the regional quests

function opt(text: string, next: string, cond: (g: GameApi) => boolean): DOption { return { text, next, cond }; }

/** Adds story nodes to an existing tree and lets the story choose the opening node first. */
function hook(D: Record<string, DialogueTree>, id: string, pick: (g: GameApi) => string | undefined, nodes: Record<string, DNode>): void {
  const t = D[id];
  if (!t) return;
  const base = t.start;
  t.start = (g) => pick(g) ?? base(g);
  Object.assign(t.nodes, nodes);
}

/** Inserts an option into a node, just before its last ("Bye") option. */
function addOption(D: Record<string, DialogueTree>, id: string, node: string, o: DOption): void {
  const opts = D[id]?.nodes[node]?.options;
  if (opts) opts.splice(Math.max(0, opts.length - 1), 0, o);
}

export function applyStoryHooks(D: Record<string, DialogueTree>): void {
  Object.assign(D, STORY_DIALOGUE);

  // ---- III. Under the Crown: Corrie Dunmore points the way down
  hook(D, 'corrie', (g) => (s(g, 'storyCrown') === 'corrie' ? 'crown' : s(g, 'storyCrown') === 'descend' ? 'crownW' : undefined), {
    crown: {
      text: (g) => (s(g, 'fairPrice') === 'done' ? 'You\'re asking about the Crown. You got Wick his pick, so you can have a lamp for nothing.' : 'You\'re asking about the Crown. Everyone\'s asking about the Crown this month.'),
      next: 'crown2',
    },
    crown2: { text: 'Joan sent a survey crew down under the ruin in the spring. Six went down. Mine dug out four.', options: [{ text: 'What\'s down there?', next: 'crown3' }] },
    crown3: { text: 'Old workings, older than anyone. And redbacks, nesting on whatever iron the old lot left behind. One of them\'s the size of a cart.', next: 'crown4' },
    crown4: { text: 'The crew call her the Rust Queen. They\'ve had time to think of a name.', next: 'crown5' },
    crown5: {
      text: 'The way in is the door in the tower. Joan\'s camp is at the end of the corridor, notes still on the table. She didn\'t want them back.',
      effect: (g) => g.setStage('storyCrown', 'descend'),
    },
    crownW: { text: 'Door in the tower, stair down, corridor east. Mind the Queen.' },
  });

  // ---- IV. The Fallen Star: Ilse Blewitt reads the rubbing
  hook(D, 'ilse', (g) => {
    const st = s(g, 'storyStar');
    if (st === 'ilse') return 'sIlse';
    if (st === 'glass') return 'sGlassW';
    if (st === 'sela' || st === 'joan') return 'sIsles';
    return undefined;
  }, {
    sIlse: { text: 'You\'ve been under Gallows Knap. You\'ve brought the dust of it with you.', options: [{ text: 'Show her the rubbing.', next: 'sI2' }] },
    sI2: { speaker: 'narrator', text: 'She spreads it on the trestle and weighs the corners with whatever is to hand: a cup, the log, a lump of crystal.', next: 'sI3' },
    sI3: { text: 'Forty-one.', next: 'sI4' },
    sI4: { text: 'Star crystal is light. Not light like a feather. Light like a cork held under water. The rock on top is what keeps it down.', next: 'sI5' },
    sI5: { text: 'Under the Kirk is the largest fall I\'ve ever counted. Strip thirty feet of cap off that and you won\'t lift a field. You\'ll lift the floor of the valley.', next: 'sI6' },
    sI6: {
      text: 'Look through the glass. East, and low, at the isles. Then tell me Wynn Carrow was wrong, because I\'d like to hear somebody say it.',
      effect: (g) => g.setStage('storyStar', 'glass'),
    },
    sGlassW: { text: 'The glass is on the trestle. East, and low.' },
    sIsles: {
      text: 'Ketley\'s fields. Eight hundred years of drifting, about a stride a year. I have the last thirty in the log. Go to the Kirk. Sela Orme keeps it, and Joan Harrowgate is camped at the east end with her stakes.',
    },
  });

  // ---- VI. Mr Pryce sells a page
  addOption(D, 'pryce', 'main', opt('What has Harrowgate been buying from the Charter?', 'page', (g) => !!s(g, 'storyCrown') && !g.has('pryce_page') && !g.flag('prycePageSold')));
  Object.assign(D.pryce.nodes, {
    page: { text: 'Debt. The Charter\'s paving debt. The guilds sold, I bought, at three marks in ten.', next: 'page2' },
    page2: { text: 'You\'ll want the page. My book isn\'t for sale. The page is.', next: 'page3' },
    page3: {
      text: (g) => {
        const c = g.flag('fpChoice');
        if (c === 'leverage') return 'For you, nothing. You read carefully, and I said I\'d remember.';
        if (c === 'delia') return 'A hundred and twenty marks. You cost me fifteen, and a conversation with Mrs Harrowgate.';
        return 'Sixty marks.';
      },
      options: [
        { text: 'Buy the page.', next: 'page4', cond: (g) => g.marks >= pagePrice(g), effect: (g) => { g.addMarks(-pagePrice(g)); g.give('pryce_page'); g.setFlag('prycePageSold'); } },
        { text: 'Not now.' },
      ],
    },
    page4: { speaker: 'narrator', text: 'He cuts it out along the gutter with a penknife, very neatly, and blows on it.', next: 'page5' },
    page5: { text: 'Mrs Harrowgate will ask me what else I sell. I\'ll tell her: everything.' },
  } as Record<string, DNode>);

  // ---- Epilogue: the regions hear about the sitting
  hook(D, 'hester', (g) => (end(g) && s(g, 'storySitting') === 'done' ? 'sEnd' : undefined), {
    sEnd: {
      text: (g) => {
        const e = end(g);
        if (e === 'paid') return 'Nine barrels, and the arrears. Somebody in Ansbury wrote "Fleet first" on the order. I\'ve pinned it up by the lamp.';
        if (e === 'joan') return 'Nine barrels. The Charter pays Harrowgate in crystal now, so the tolls are the Charter\'s again. I didn\'t think I\'d live to say that sentence.';
        return 'Six barrels again. The toll\'s gone up a mark, and none of the mark has come up this hill.';
      },
    },
  });
  hook(D, 'hob', (g) => (end(g) && s(g, 'honestWeight') === 'done' ? 'sEnd' : undefined), {
    sEnd: {
      text: (g) => (end(g) === 'refuse'
        ? 'A mark more a cart. I carted the stone for the Charter\'s road, and now I pay twice for it.'
        : 'Tolls held where they were. Weighhouse reads three for three. I\'ve nothing to complain about, and I don\'t know what to do with my mouth.'),
    },
  });
  hook(D, 'hesk', (g) => (end(g) === 'paid' ? 'sEnd' : undefined), {
    sEnd: { text: 'Pit\'s shut for the winter. Harrowgate\'s sulking. Half my crew\'s gone to Ansbury for work and the other half are fishing with Pell.' },
  });
  hook(D, 'pryce', (g) => (end(g) === 'paid' && g.flag('prycePageSold') && !g.flag('pryceEndSeen') ? 'sEnd' : undefined), {
    sEnd: { text: 'I sold you a page. Selling is what I do. Mrs Harrowgate has since asked me what else I sell, and I told her.', effect: (g) => g.setFlag('pryceEndSeen'), next: 'main' },
  });
  addOption(D, 'tamsin', 'main', opt('How\'s Hollin Ford without the Pit?', 'sPit', (g) => end(g) === 'paid'));
  Object.assign(D.tamsin.nodes, {
    sPit: { text: 'No Pit, no wages, no fifthday. I\'m selling bread to people who\'ve stopped buying bread. Ask me again in spring.' },
  } as Record<string, DNode>);
  addOption(D, 'perrin', 'main', opt('What\'s the Charter notice about?', 'sNotice', (g) => !s(g, 'storyNotice')));
  Object.assign(D.perrin.nodes, {
    sNotice: { text: 'The Charter wants to sell the Glass Kirk to Harrowgate. It\'s on the board by the gate, in long words. Lowen Pike at the Toll Office will give you the short ones.' },
  } as Record<string, DNode>);
}

/** The toll board reflects the sitting. */
export function tollBoard(g: GameApi): string {
  const raised = g.flag('charterEnd') === 'refuse';
  const lines = [
    'CROWNROAD TOLLS. BY CHARTER.',
    raised
      ? 'On foot, no load: free.\nHand cart: 2 marks.\nOx cart, grain: 3 marks, and the Weighhouse fee by the stone.\nOx cart, ore or metal: 5 marks.\nCattle: 2 marks the head. Sheep: 1 mark the four.'
      : 'On foot, no load: free.\nHand cart: 1 mark.\nOx cart, grain: 2 marks, and the Weighhouse fee by the stone.\nOx cart, ore or metal: 4 marks.\nCattle: 1 mark the head. Sheep: 1 mark the five.',
    'LIGHT FUND, for Fleet Light: one mark in twenty on all of the above.',
  ];
  if (raised) lines.push('The new figures are painted over the old ones, and the old ones show through.');
  else if (g.flag('charterEnd') === 'paid') lines.push('A paper nailed to the corner: HARROWGATE LEVY, one year, by order of the Speaker. Somebody has drawn a small, pleased face on it.');
  else lines.push('Under it, in chalk, in three different hands: SCALES READ HEAVY. ASK ANY CARTER. ASK ME.');
  return lines.join('\n\n');
}
