import type { DialogueTree, GameApi } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import { COMPANIONS } from '../companions';

// THE CHARTER'S DEBT, the chapters between the first six (docs/STORY_PLAN.md, Act I): the people who
// travel with you, met where the story finds them.
//
//   II    A Witness (storyWitness): Wenna Hale has stopped a Harrowgate wagon on the Turnpike. The
//         barrels in the back carry the Light Fund's brand. She wants somebody who isn't a Rider and
//         isn't Harrowgate to look. Flag witnessEnd = 'docket' (the wagon goes on; you keep the
//         docket) | 'back' (the barrels go back to the Toll Office on Wenna's say). Wenna joins.
//   VI    The Surveyor's Girl (storyOttilie): Ottilie Fenn on the Kirk floor with a level line; the
//         floor is rising fastest where Harrowgate bored. Her book goes to Joan. Ottilie joins.
//   VIII  Forty Feet (storyFortyFeet): after the lift, Ottilie measures what came up. Joan's rule came
//         from Gallows Knap; it doesn't hold here. Flag fortyTold = 'joan' (told before the sitting;
//         Joan keeps her ten feet) | 'kept' (Ottilie keeps it until after).
//   IX    The Toll Riders (storyRiders): Captain Elis Prowse wants Wenna back for the sitting; the
//         Riders' duty book says who has been paying them to ride with Harrowgate's wagons. Flag
//         ridersEnd = 'coat' (Wenna takes the coat back) | 'page' (she brings the page to the sitting).
//   XI    First Camp (storyCamp1): the night after the sitting, on the Turnpike below the Waystation,
//         walking Sela Orme home. The first camp: a fire, and a word with each of them.

const WIT = 'storyWitness', OTT = 'storyOttilie', FORTY = 'storyFortyFeet', RID = 'storyRiders', CAMP = 'storyCamp1';

// The wagon on the verge of the Turnpike south of the Waystation, facing on towards Harrowgate Works
const CART = { x: 733.6, z: 742.6, ry: 0.588 };
const KIRK = { x: 1190, z: 1800 };
// The Waystation yard, and the camp on the Turnpike south of it
const YARD = { x: 708.5, z: 576.5 };
const FIRE = { x: 688.5, z: 646.5 };

const wennaJoined = (g: GameApi) => !!g.flag('comp:wenna:joined');
const ottJoined = (g: GameApi) => !!g.flag('comp:ottilie:joined');
const charter = (g: GameApi) => g.flag('charterEnd') as 'refuse' | 'joan' | 'paid' | undefined;
const R = (g: GameApi, id: string) => Number(g.flag(`comp:${id}:rapport`) ?? 0);

/** A companion joins through the story: met, in, and (unless someone else is with you) at your side. */
function joinStory(g: GameApi, id: 'wenna' | 'ottilie'): void {
  g.setFlag(`comp:${id}:met`, 1);
  if (!g.flag(`comp:${id}:joined`)) { g.setFlag(`comp:${id}:joined`, 1); g.setFlag(`comp:${id}:part`, 1); }
  if (!g.compActive()) g.compJoin(id);
}

// ================================================================ II. A WITNESS

const wennaRoad: DialogueTree = {
  start: (g) => (at(g, WIT) === 'look' ? (g.flag('witnessLooked') ? 'w_back' : 'w_wait') : 'w1'),
  nodes: {
    w1: { speaker: 'narrator', text: 'A woman in an old Toll Rider\'s coat, the blue gone grey at the shoulders, has the wagon horse by the bridle and isn\'t letting go.', next: 'w2' },
    w2: { text: 'You. Are you a Rider?', options: [{ text: 'No.', next: 'w3' }, { text: 'Do I look like one?', next: 'w3b' }] },
    w3: { text: 'Do you work for Harrowgate?', options: [{ text: 'No.', next: 'w4' }, { text: 'Not yet.', next: 'w3c' }] },
    w3b: { text: 'You look like somebody who walks the Turnpike with a sword. So did I. Do you work for Harrowgate?', options: [{ text: 'No.', next: 'w4' }] },
    w3c: { text: 'Funny. Do you or don\'t you?', options: [{ text: 'I don\'t.', next: 'w4' }] },
    w4: { text: 'Then you\'ll do. Wenna Hale. I rode this road for the Charter for eleven years, and I know a Light Fund barrel when I see one go by.', next: 'w5' },
    w5: { text: 'This man says they\'re Harrowgate\'s, bought fair. Maybe they are. I want somebody who isn\'t me to look in the back and say what they see.', next: 'w6' },
    w6: { speaker: 'narrator', text: 'The carter, a heavy man with a whip he hasn\'t used, looks at the sky as if the weather were the trouble.', options: [{ text: 'All right. I\'ll look.', next: 'w7', effect: (g) => g.setStage(WIT, 'look') }, { text: 'Why does it matter whose barrels they are?', next: 'w6b' }] },
    w6b: { text: 'Because the Light Fund\'s oil goes to Fleet Light, at Gullmouth. If it\'s going somewhere else, the lamp on the headland is short. I\'ve seen what a short lamp costs. Will you look or won\'t you?', options: [{ text: 'I\'ll look.', next: 'w7', effect: (g) => g.setStage(WIT, 'look') }] },
    w7: { text: 'In the back, under the tarp. Read the heads of the barrels. And whatever paper he\'s got tucked in there.' },
    w_wait: { text: 'In the back, under the tarp. I\'m not letting go of this horse until you have.' },
    w_back: {
      text: 'Well?',
      options: [
        { text: 'The barrels are the Light Fund\'s. Somebody has chalked H&D over the brand.', next: 'w_b1' },
      ],
    },
    w_b1: { text: 'And the paper?', options: [{ text: 'A docket from the Toll Office. "Light Fund surplus", eleven marks the barrel, for A. Pryce. Released by L. Pike.', next: 'w_b2' }] },
    w_b2: { speaker: 'narrator', text: 'For a moment she doesn\'t say anything at all. Then she lets go of the bridle, very carefully, as if it might break.', next: 'w_b3' },
    w_b3: { text: 'Surplus. Fleet Light hasn\'t had a full order since Candlemas, and the Toll Office is selling its oil to Harrowgate as surplus.', next: 'w_b4' },
    w_b4: {
      text: 'He\'s only the carter. He\'ll lose his place if he goes back empty. So. What do we do with it?',
      options: [
        { text: 'Let him go on. Keep the docket: it\'s Pike\'s signature, and the Charter is sitting soon.', next: 'w_docket' },
        { text: 'Turn the wagon round. That oil goes back to the Toll Office, and Pike can explain it to the Light Fund.', next: 'w_turn' },
      ],
    },
    w_docket: {
      text: 'A piece of paper. Course. Papers is how they did it, papers is how it gets undone. I don\'t have to like it.',
      effect: (g) => { g.give('oil_docket'); g.compRapport('wenna', 2); g.setFlag('witnessEnd', 'docket'); },
      next: 'w_join',
    },
    w_turn: {
      text: 'Hear that, Nat? Round you go. Tell Pike a Rider sent you back. He\'ll know which one.',
      effect: (g) => { g.compRapport('wenna', 6); g.setFlag('witnessEnd', 'back'); },
      next: 'w_join',
    },
    w_join: { text: 'You\'re going about this business with the Kirk and the debt. Everyone on the road has heard. Then I\'m coming. Somebody should be there who has signed for oil that never arrived.', next: 'w_join2' },
    w_join2: {
      text: 'I\'ve a chair in the Waystation yard I\'ve been sitting in for four months. It can do without me.',
      options: [{ text: 'Glad to have you, Wenna.', next: 'w_end', effect: (g) => g.compRapport('wenna', 2) }, { text: 'Try to keep up.', next: 'w_end2' }],
    },
    w_end: { text: 'Don\'t be glad yet. I\'m terrible company before noon.', effect: (g) => { joinStory(g, 'wenna'); g.setStage(WIT, 'done'); } },
    w_end2: { text: 'Ha. I\'ll try.', effect: (g) => { joinStory(g, 'wenna'); g.setStage(WIT, 'done'); } },
  },
};

const natHendy: DialogueTree = {
  start: (g) => (g.flag('witnessLooked') ? 'n2' : 'n1'),
  nodes: {
    n1: { text: 'Nat Hendy, carrier. I don\'t load them, I drive them. You want the paper, it\'s in the back. Take it, read it, put it back. I\'m due at the Works by dark.' },
    n2: { text: 'Whatever you\'re going to do, do it. The horse doesn\'t care, and I\'m starting not to.' },
  },
};

// ================================================================ VI. THE SURVEYOR'S GIRL

const ottNodes = {
  o1: { speaker: 'narrator' as const, text: 'A young woman is crouched over a chalk mark on the floor with a brass level, a notebook in her teeth and a line run out across the stone towards the east end.', next: 'o2' },
  o2: { text: (g: GameApi) => (g.flag('comp:ottilie:met') ? 'You again. Good. You can hold the line, you\'ve done it before.' : 'Don\'t step on the line. Ottilie Fenn, Charter survey office. Sela sent you? Sela sends me everyone who looks bored.'), effect: (g: GameApi) => g.setFlag('comp:ottilie:met', 1), next: 'o3' },
  o3: { text: 'The floor is coming up. Half an inch since Lady Day, by my line. Sela says it\'s been the same height for a hundred years. One of us is wrong, and I\'ve checked my line nine times.', next: 'o4' },
  o4: { text: 'What I don\'t know is where. Three chalk marks, from here to the stakes at the east end. Hold the line on each, I\'ll read the level, and we\'ll see if it\'s the whole floor or one end of it.', options: [{ text: 'Show me the marks.', next: 'o5', effect: (g: GameApi) => g.setStage(OTT, 'line') }, { text: 'Later.' }] },
  o5: { text: 'Chalk crosses. First by the star, then halfway, then the one by Harrowgate\'s stakes. Hold the line dead on the cross. Dead on.' },
  oWait: { text: (g: GameApi) => `Dead on the cross. ${['', 'One down.', 'Two down. One to go.'][readings(g)] ?? ''}` },
  oDone: { text: 'A quarter of an inch by the star. Half an inch halfway. An inch and a quarter at the stakes.', next: 'oD2' },
  oD2: { text: 'It isn\'t the floor. It\'s the east end, where Harrowgate bored their test holes in the spring. They\'ve let the cap breathe, and the crystal under it is starting to lift.', next: 'oD3' },
  oD3: {
    text: 'Joan Harrowgate is camped at the east end. She\'s the one who\'ll understand it. And she\'s a Harrowgate, so I don\'t know if she\'ll want to.',
    options: [
      { text: 'Bring your book. We\'ll show her together.', next: 'oD4', effect: (g: GameApi) => g.compRapport('ottilie', 3) },
      { text: 'Give me the book. I\'ll take it to her.', next: 'oD4b' },
    ],
  },
  oD4: { text: 'Together. Yes. All right. If she shouts, I\'m standing behind you.', effect: (g: GameApi) => { g.give('ottilie_levels'); g.setStage(OTT, 'joan'); } },
  oD4b: { text: 'I\'d rather come. It\'s my book. But you\'re taller. Here: don\'t fold the corners.', effect: (g: GameApi) => { g.give('ottilie_levels'); g.setStage(OTT, 'joan'); } },
  oJoan: { text: 'East end. The tents. She\'s the one shouting numbers. Go on, I\'m right behind you.' },
};
const readings = (g: GameApi) => ['ottL1', 'ottL2', 'ottL3'].filter((k) => g.flag(k)).length;
const LINE = [
  { id: 'ottL1', x: KIRK.x + 2.5, z: KIRK.z - 3.5, said: 'Ottilie reads the brass scale. "A quarter. A quarter of an inch, here by the star." She writes it down.' },
  { id: 'ottL2', x: KIRK.x + 8.5, z: KIRK.z + 2.5, said: 'Ottilie reads the scale twice. "Half an inch. Halfway to the stakes, half an inch." She doesn\'t like that, and writes it down anyway.' },
  { id: 'ottL3', x: KIRK.x + 15.5, z: KIRK.z - 1.5, said: 'Ottilie reads the scale three times and then sits back on her heels. "An inch and a quarter. By the stakes. An inch and a quarter."' },
];

// Joan, with Ottilie's book, before the cut (story.ts has her meeting; this is the beat in the middle)
const joanOtt = {
  jo1: { speaker: 'narrator' as const, text: 'Ottilie holds out the book. Joan takes it without looking at her, reads the three numbers, and then looks at her for quite a long time.', next: 'jo2' },
  jo2: { text: 'Who taught you to read a staff?', next: 'jo3' },
  jo3: { text: '(Ottilie) Nobody. A book. Two books. Is it wrong?', next: 'jo4' },
  jo4: { text: 'No. It\'s right, and I didn\'t take it. My bores, my stakes, and a girl from the survey office has the number before I do.', next: 'jo5' },
  jo5: { text: 'Keep measuring. Every week. Send it to me, not to my sisters.', effect: (g: GameApi) => { g.compRapport('ottilie', 4); g.setFlag('joanTookOttilie', 1); }, next: 'j7' },
};

// ================================================================ VIII. FORTY FEET

const fortyNodes = {
  f1: { text: 'Two feet. Two feet in four seconds. I was standing on the bit that went up, did you see? I sat down. I didn\'t mean to sit down.', next: 'f2' },
  f2: { text: 'They\'d stripped six feet of cap at the east end before it went. I need two numbers: how high the edge came up, and how deep their cut was. Then I can tell you whether Joan\'s rule is right.', options: [{ text: 'Where do I hold the staff?', next: 'f3', effect: (g: GameApi) => g.setStage(FORTY, 'read') }] },
  f3: { text: 'On the lip of the raised floor, and at the bottom of the cut. Mind the edge. It\'s new.' },
  fWait: { text: (g: GameApi) => (g.flag('fortyLip') && g.flag('fortyCut') ? 'Give me a moment with the sums.' : 'The lip of the raised floor, and the bottom of the cut. Both, please.') },
  fSums: { speaker: 'narrator' as const, text: 'Ottilie does the sums on her knee, crosses them out, and does them again on the next page.', next: 'fs2' },
  fs2: { text: 'Joan\'s rule is one span of lift for every three feet of cap. Six feet off should have given two spans. It gave two feet. That\'s a third more than her rule says.', next: 'fs3' },
  fs3: { text: 'Her rule came from Gallows Knap, where the crystal was a fist next to this. This is the largest fall Ilse has ever counted. The rule doesn\'t hold here. Nobody has a rule for here.', next: 'fs4' },
  fs4: { text: 'If I had to sign something, I\'d want forty feet of cap left on, and a year of watching before anybody cuts. Ten isn\'t enough. Ten is Joan\'s number for somewhere else.', next: 'fs5' },
  fs5: {
    text: 'And the sitting is the day after tomorrow, and Joan is going to stand up in it and say ten. Do I tell her? She\'ll hate me.',
    options: [
      { text: 'Tell her now, before the sitting. She has a right to know her number is wrong.', next: 'fJoan' },
      { text: 'Keep it until after the sitting. If you tell her now, the only person on the Kirk\'s side loses her nerve.', next: 'fKeep' },
    ],
  },
  fJoan: { text: 'Now. Yes. Before I lose mine.', effect: (g: GameApi) => { g.setStage(FORTY, 'joan'); g.compRapport('ottilie', 5); } },
  fKeep: {
    text: 'That\'s horrible. That\'s horrible and you might be right. I\'ll keep it. I\'ll keep measuring. And if the floor so much as twitches, I\'m telling everyone.',
    effect: (g: GameApi) => { g.setFlag('fortyTold', 'kept'); g.compRapport('ottilie', -3); g.setStage(FORTY, 'done'); },
  },
  fToJoan: { text: 'She\'s by her tents. I\'ll stand behind you again. Further behind you, this time.' },
};
const joanForty = {
  jf1: { speaker: 'narrator' as const, text: 'Joan reads Ottilie\'s two pages standing up, then reads them again sitting down on a crate.', next: 'jf2' },
  jf2: { text: 'A third more than the rule. You\'re sure.', next: 'jf3' },
  jf3: { text: '(Ottilie) I\'m sure of the two numbers. I\'m not sure of anything else. Nobody is.', next: 'jf4' },
  jf4: { text: 'Then here\'s what I\'ll do. I stand up at the sitting and say ten feet, because ten is what I can defend, and thirty is what Hilda wants. And then I measure every morning, myself, and if the floor moves a hair I stop the cut with my own hands.', next: 'jf5' },
  jf5: { text: 'Forty feet and nobody digs, ever. You know that. The Charter won\'t vote for "never". It\'ll vote for Hilda.', next: 'jf6' },
  jf6: { text: '(Ottilie) And if you\'re wrong?', next: 'jf7' },
  jf7: { text: 'Then I\'m the one standing on it. I\'ve kept that promise before.', effect: (g: GameApi) => { g.setFlag('fortyTold', 'joan'); g.setStage(FORTY, 'done'); } },
};

// ================================================================ IX. THE TOLL RIDERS

const prowse: DialogueTree = {
  start: (g) => {
    const s = at(g, RID);
    if (s === 'post') return 'p1';
    if (s === 'book') return g.has('riders_page') || g.flag('ridersBookRead') ? 'p_book' : 'p_wait';
    return 'p_after';
  },
  nodes: {
    p1: { speaker: 'narrator', text: 'Four Toll Riders are watering their horses at the trough, in the blue coats Wenna\'s has faded from. Their captain, a grey man with a clerk\'s hands, sees Wenna before she sees him.', next: 'p2' },
    p2: { text: 'Hale. I was hoping you\'d come through. Elis Prowse, captain on this stretch. You\'re with her? Then you\'ll hear it too.', next: 'p3' },
    p3: { text: 'The Charter sits in two days on the keep steps. Every Rider from the Ford to the sea is ordered to stand there, and I\'m four short.', next: 'p4' },
    p4: { speaker: 'narrator', text: 'He holds out a folded blue coat. It has been brushed.', next: 'p5' },
    p5: { text: '(Wenna) I gave that back.', next: 'p6' },
    p6: { text: 'And I kept it. Nobody says anything about February any more, Hale. Come back. Stand on the steps with us.', options: [{ text: 'Why are you four short?', next: 'p7' }, { text: 'Wenna, this is your call.', next: 'p7' }] },
    p7: { text: 'Riders have been riding escort. Day work, paid well. It\'s thinned us out on the road. It\'s in the duty book, it\'s all above board.', next: 'p8' },
    p8: { text: '(Wenna) Escort for who?', next: 'p9' },
    p9: { text: 'Look in the book if you like. It\'s on the barrel head by the office door. I\'ve nothing to hide from a Rider.', effect: (g) => g.setStage(RID, 'book') },
    p_wait: { text: 'The book\'s on the barrel head by the office door. Take your time. The coat will keep.' },
    p_book: {
      text: (g) => (g.has('riders_page') ? 'You\'ve torn a page out of my duty book.' : 'Well? Above board, like I said.'),
      next: 'p_b2',
    },
    p_b2: { text: '(Wenna) "Escort, H and D wagons, the Turnpike. Two riders. Four marks a day. Paid, A.P." Every week since Lady Day. Elis. You\'ve been riding guard for the oil.', next: 'p_b3' },
    p_b3: { text: 'I\'ve been riding guard for wagons. What\'s in them is the Toll Office\'s business. Four marks a day keeps two families, Hale. Don\'t look at me like that, you of all people.', next: 'p_b4' },
    p_b4: {
      text: 'Coat\'s here. Steps are in two days. What\'s it to be?',
      options: [
        { text: 'Take the coat, Wenna. Stand on the steps. Nobody watches the Riders like a Rider.', next: 'p_coat' },
        { text: 'Bring the page to the sitting instead. Let the Speaker read who pays her Riders.', next: 'p_page' },
        { text: 'It\'s your coat, Wenna. You decide.', next: 'p_her' },
      ],
    },
    p_coat: {
      text: '(Wenna) All right, Elis. I\'ll stand on the steps. And I\'ll be watching every one of you.',
      effect: (g) => { g.setFlag('ridersEnd', 'coat'); g.compOutfit('wenna', 'rider'); g.compRapport('wenna', 3); g.setStage(RID, 'done'); },
      next: 'p_coat2',
    },
    p_coat2: { text: 'That\'s all I ask. More than I ask. Welcome back, Hale.' },
    p_page: {
      text: '(Wenna) Keep the coat, Elis. I\'ll be on the steps anyway, in front of them. With your page.',
      effect: (g) => { if (!g.has('riders_page')) g.give('riders_page'); g.setFlag('ridersEnd', 'page'); g.compRapport('wenna', 5); g.setStage(RID, 'done'); },
      next: 'p_page2',
    },
    p_page2: { speaker: 'narrator', text: 'Prowse folds the coat over his arm, and for a moment looks a great deal older. "You always did have to be right in public, Hale."' },
    p_her: {
      text: (g) => (R(g, 'wenna') >= 10 ? '(Wenna) Then I\'m not coming back, Elis. I\'m bringing your page to the steps. Somebody has to.' : '(Wenna) Then I\'ll take it. God help me, I miss the coat. I\'ll stand with you, Elis, and I\'ll watch you.'),
      effect: (g) => {
        if (R(g, 'wenna') >= 10) { if (!g.has('riders_page')) g.give('riders_page'); g.setFlag('ridersEnd', 'page'); }
        else { g.setFlag('ridersEnd', 'coat'); g.compOutfit('wenna', 'rider'); }
        g.compRapport('wenna', 6);
        g.setStage(RID, 'done');
      },
    },
    p_after: {
      text: (g) => (g.flag('ridersEnd') === 'coat' ? 'Hale\'s back on the roll. First time in four months the stretch has felt right.' : 'I\'ve a page missing from my book and a captain\'s worth of explaining to do. Go on. You\'ve somewhere to be.'),
    },
  },
};

// ================================================================ XI. FIRST CAMP

const campWenna: DialogueTree = {
  start: (g) => (g.flag('campW') ? 'cw_again' : 'cw1'),
  nodes: {
    cw1: {
      text: (g) => {
        const e = charter(g);
        if (e === 'paid') return 'Thirteen thousand two hundred marks. Paid off, and Harrowgate barred for a year. I watched Hilda\'s face when the Speaker read it out. I\'ll be warm on that all winter.';
        if (e === 'joan') return 'Twenty years of crystal. Joan\'s terms. I don\'t know enough to say if it\'s right. I know Hilda didn\'t get her thirty, and I know the tolls are the Charter\'s again.';
        return 'Refused. The debt stands, and every carter on this road pays a mark more for it. I\'ll hear about that mark from every one of them, and they\'ll be right.';
      },
      next: 'cw2',
    },
    cw2: {
      text: (g) => (g.flag('ridersEnd') === 'coat'
        ? 'I stood on the steps in the blue. Elis didn\'t look at me once. I looked at him the whole time.'
        : g.flag('ridersEnd') === 'page' ? 'The Speaker read Elis\'s page with the whole Charter watching. He\'ll be off the stretch by Martinmas. I did that. I don\'t know yet if I\'m sorry.'
          : 'The Riders stood on the steps and looked straight ahead. They\'re good at that.'),
      next: 'cw3',
    },
    cw3: {
      text: (g) => (g.flag('witnessEnd') === 'back'
        ? 'And six barrels went back to the Toll Office because you said so on the Turnpike. Pike\'s had to send them on to Fleet Light. Somebody\'s lamp is brighter tonight.'
        : 'And Pike\'s docket is in your pack, not in his drawer. That\'s something.'),
      options: [
        { text: 'You were right to stop that wagon.', next: 'cw_right' },
        { text: 'You never said why the Light Fund matters so much to you.', next: 'cw_why' },
        { text: 'Get some sleep, Wenna.', next: 'cw_sleep' },
      ],
    },
    cw_right: { text: 'I was. I don\'t get to be right very often about that oil. I\'ll take it.', effect: (g) => { g.compRapport('wenna', 3); g.setFlag('campW', 1); } },
    cw_why: {
      text: 'No. I didn\'t. Ask me at Gullmouth, one day, on the quay. Not here. Not tonight.',
      effect: (g) => { g.compRapport('wenna', 2); g.setFlag('campW', 1); if (!g.flag('comp:wenna:s2') && Number(g.flag('comp:wenna:part') ?? 0) === 1) g.setFlag('comp:wenna:s2', 1); },
    },
    cw_sleep: { text: 'You first. I\'ll take the first watch. I always take the first watch.', effect: (g) => g.setFlag('campW', 1) },
    cw_again: { text: 'Watch is mine. Sleep.' },
  },
};

const campOtt: DialogueTree = {
  start: (g) => (g.flag('campO') ? 'co_again' : 'co1'),
  nodes: {
    co1: { speaker: 'narrator', text: 'Ottilie has her notebook open on her knees and isn\'t writing in it.', next: 'co2' },
    co2: {
      text: (g) => {
        const e = charter(g), told = g.flag('fortyTold');
        if (e === 'joan') return told === 'kept' ? 'They voted for ten feet. Joan\'s ten. And I knew, and I sat there with it in my pocket. You said wait. I waited.' : 'They voted for ten feet. Joan\'s ten, with my forty in her pocket. She stood up and said ten anyway. She looked straight at me when she said it.';
        if (e === 'paid') return 'Nobody digs. Not this year. The floor gets a year to settle, and I get a year of measuring it. It\'s the best thing that\'s happened to me.';
        return 'Nobody digs. The cap stays on. I should be pleased. I\'m pleased. I keep thinking about the carters\' mark.';
      },
      next: 'co3',
    },
    co3: {
      text: 'Can I tell you something? At the cut, when the floor went up, I sat down. Everyone else ran at it: you, Wenna, Joan. I sat down on the stone and held on to my book.',
      options: [
        { text: 'You held on to the only record of what happened. That matters.', next: 'co_kind' },
        { text: 'Next time, run. Your book won\'t help you if the ground opens.', next: 'co_hard' },
        { text: 'Everyone\'s afraid. You came back the next day and measured it.', next: 'co_brave' },
      ],
    },
    co_kind: { text: 'Do you think so? I think so. I wanted somebody else to think so first.', effect: (g) => { g.compRapport('ottilie', 4); g.setFlag('campO', 1); } },
    co_hard: { text: 'You\'re right. I know you\'re right. I\'ll run next time. Probably with the book.', effect: (g) => { g.compRapport('ottilie', -1); g.setFlag('campO', 1); } },
    co_brave: { text: 'I did, didn\'t I. I measured it while it was still warm. Nobody else would have thought to.', effect: (g) => { g.compRapport('ottilie', 5); g.setFlag('campO', 1); } },
    co_again: { text: 'Go to sleep. I\'ve two more pages of sums and I\'m not stopping because it\'s dark.' },
  },
};

const campSela: DialogueTree = {
  start: (g) => (g.flag('campS') ? 'cs_again' : 'cs1'),
  nodes: {
    cs1: { text: 'Six years on the hill, and the first night off it I\'m sleeping in a ditch on the Turnpike with a Rider, a surveyor and you. I wouldn\'t have guessed it.', next: 'cs2' },
    cs2: {
      text: (g) => (charter(g) === 'joan'
        ? 'They\'ll cut at the edges of my floor, ten feet under the cap. Joan says it\'s safe. Joan says it the way people say things they mean to make true.'
        : 'My floor is staying where it is. You did that, and the Charter did, and a dead people who drew a field going up, eight hundred years before any of us.'),
      next: 'cs3',
    },
    cs3: { text: 'I write names in a book, at the Kirk. The pilgrims\' names. Nobody ever asks to read it. I\'ve been thinking I should write the forty-one at the front. They never had their names written anywhere.', options: [{ text: 'They didn\'t write. They counted. Write forty-one strokes.', next: 'cs_count' }, { text: 'Write them first. Before the pilgrims.', next: 'cs_first' }] },
    cs_count: { text: 'Forty-one strokes. Yes. That\'s their own way. I\'ll do it when I\'m home.', effect: (g) => { g.setFlag('campS', 1); g.setFlag('selaForty', 'strokes'); } },
    cs_first: { text: 'At the front. Where the book opens. I\'ll do it when I\'m home.', effect: (g) => { g.setFlag('campS', 1); g.setFlag('selaForty', 'first'); } },
    cs_again: { text: 'Sleep. The road\'s long tomorrow, and I\'m out of practice at it.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [WIT]: {
    id: WIT, name: 'A Witness', story: { chapter: 2, title: 'A Witness' }, next: ['storyMossgate', 'wynn'],
    notes: (g, s) => {
      if (s === 'road') return 'On the Turnpike south of the Waystation, a Harrowgate wagon bound for the Works has been stopped on the verge by a woman in an old Toll Rider\'s coat.';
      if (s === 'look') return g.flag('witnessLooked') ? 'The barrels in the wagon carry the Light Fund\'s brand, with H&D chalked over it. The docket says the Toll Office sold them as surplus, for A. Pryce, released by L. Pike. Wenna Hale is waiting.' : 'Wenna Hale, once of the Toll Riders, wants somebody who isn\'t a Rider and isn\'t Harrowgate to look in the back of the wagon.';
      return g.flag('witnessEnd') === 'back' ? 'The Light Fund\'s oil went back to the Toll Office on Wenna\'s say. Wenna Hale travels with me.' : 'I kept the Toll Office\'s docket: Light Fund oil sold to Pryce as surplus, released by Lowen Pike. Wenna Hale travels with me.';
    },
    objectives: (g, s) => {
      if (s === 'road') return [{ text: 'See what\'s happening at the wagon on the Turnpike', marker: 'wenna_road' }];
      if (s === 'look') return g.flag('witnessLooked') ? [{ text: 'Tell Wenna Hale what you found', marker: 'wenna_road' }] : [{ text: 'Look in the back of the wagon', marker: 'witnessBarrels' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'road' || (s === 'look' && g.flag('witnessLooked')) ? { wenna_road: '?' } : {}),
    // Wenna can't be at your side and holding the horse both: if she's with you already, she walks on ahead
    advance: (g, s) => { if ((s === 'road' || s === 'look') && g.compActive() === 'wenna') g.compDismiss(); return null; },
    walk: { from: { quests: { storyNotice: 'done', [WIT]: 'road' } }, cast: ['nat_hendy'] },
  },

  [OTT]: {
    id: OTT, name: 'The Surveyor\'s Girl', story: { chapter: 6, title: 'The Surveyor\'s Girl' }, next: ['storyLift', 'cut'],
    notes: (g, s) => {
      if (s === 'level') return 'Sela Orme says a girl from the Charter\'s survey office has been on her floor for nine days with a level and a notebook. Ottilie Fenn.';
      if (s === 'line') return 'Ottilie Fenn says the Kirk floor has come up half an inch since Lady Day. She wants the line held on three chalk marks, from the star to Harrowgate\'s stakes, to find out where.';
      if (s === 'joan') return 'A quarter of an inch by the star; an inch and a quarter at the stakes. The floor is rising where Harrowgate bored. Ottilie\'s book goes to Joan Harrowgate, at the east end.';
      return 'Joan Harrowgate read Ottilie\'s book, and told her to keep measuring and send it to her.';
    },
    objectives: (g, s) => {
      if (s === 'level') return [{ text: 'Find the surveyor on the Kirk floor', marker: 'comp_ottilie' }];
      if (s === 'line') {
        const n = readings(g);
        return n >= 3 ? [{ text: 'Hear what Ottilie makes of it', marker: 'comp_ottilie' }] : [{ text: `Hold the line on Ottilie's chalk marks (${n}/3)`, marker: LINE[n].id }];
      }
      if (s === 'joan') return [{ text: 'Show Ottilie\'s book to Joan Harrowgate', marker: 'joan' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'level' || (s === 'line' && readings(g) >= 3) ? { comp_ottilie: '?' } : s === 'joan' ? { joan: '?' } : {}),
    walk: { from: { quests: { storyStar: 'done', [OTT]: 'level' } } },
  },

  [FORTY]: {
    id: FORTY, name: 'Forty Feet', story: { chapter: 8, title: 'Forty Feet' }, next: [RID, 'post'],
    notes: (g, s) => {
      if (s === 'ottilie') return 'The floor came up two feet in four seconds where Harrowgate cut. Ottilie is on the raised floor with her staff.';
      if (s === 'read') return 'Ottilie wants two readings: the lip of the raised floor, and the bottom of the cut. Then she can say whether Joan\'s rule holds.';
      if (s === 'joan') return 'Joan\'s rule (a span of lift for three feet of cap) came from Gallows Knap. Here the lift was a third more. Ottilie would want forty feet of cap left on, not ten. She\'s telling Joan before the sitting.';
      return g.flag('fortyTold') === 'joan' ? 'Joan read Ottilie\'s numbers. She will still say ten feet at the sitting, because ten is what she can defend, and measure every morning.' : 'Ottilie is keeping her forty feet to herself until after the sitting.';
    },
    objectives: (g, s) => {
      if (s === 'ottilie') return [{ text: 'Talk to Ottilie on the raised floor', marker: 'comp_ottilie' }];
      if (s === 'read') {
        const o = [{ text: 'Hold the staff on the lip of the raised floor', done: !!g.flag('fortyLip'), marker: 'fortyLip' }, { text: 'Hold the staff at the bottom of the cut', done: !!g.flag('fortyCut'), marker: 'fortyCut' }];
        return g.flag('fortyLip') && g.flag('fortyCut') ? [{ text: 'Hear Ottilie\'s sums', marker: 'comp_ottilie' }] : o;
      }
      if (s === 'joan') return [{ text: 'Go with Ottilie to Joan Harrowgate', marker: 'joan' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'ottilie' || (s === 'read' && g.flag('fortyLip') && g.flag('fortyCut')) ? { comp_ottilie: '?' } : s === 'joan' ? { joan: '?' } : {}),
    walk: { from: { quests: { storyLift: 'done', [FORTY]: 'ottilie' }, flags: { 'comp:ottilie:joined': 1 } } },
  },

  [RID]: {
    id: RID, name: 'The Toll Riders', story: { chapter: 9, title: 'The Toll Riders' }, next: ['storySitting', 'sitting'],
    notes: (g, s) => {
      if (s === 'post') return 'The Charter sits in Ansbury in two days. On the Turnpike, Toll Riders are watering their horses in the Waystation yard.';
      if (s === 'book') return 'Captain Elis Prowse wants Wenna back on the Riders\' roll to stand on the keep steps at the sitting. He says the Riders have been riding escort, paid, and it\'s all in the duty book by the yard office.';
      return g.flag('ridersEnd') === 'coat' ? 'Wenna took the Riders\' coat back, to stand on the steps and watch them from inside.' : 'Wenna is bringing the page from the Riders\' duty book to the sitting: escort for Harrowgate\'s wagons, paid by A.P.';
    },
    objectives: (g, s) => {
      if (s === 'post') return [{ text: 'See the Toll Riders in the Waystation yard', marker: 'prowse' }];
      if (s === 'book') return g.flag('ridersBookRead') ? [{ text: 'Talk to Captain Prowse', marker: 'prowse' }] : [{ text: 'Read the Riders\' duty book by the office door', marker: 'ridersBook' }];
      return [];
    },
    marks: (g, s): Marks => (s === 'post' || (s === 'book' && g.flag('ridersBookRead')) ? { prowse: '?' } : {}),
    walk: { from: { quests: { [FORTY]: 'done', [RID]: 'post' }, flags: { 'comp:wenna:joined': 1 } } },
  },

  [CAMP]: {
    id: CAMP, name: 'First Camp', story: { chapter: 11, title: 'First Camp' }, next: ['storyStride', 'letter'],
    notes: (g, s) => {
      if (s === 'road') return 'Sela Orme is walking home to the Kirk. Wenna knows a place on the Turnpike past the Waystation pond, in the meadow by the bridge, where the carters stop for the night.';
      if (s === 'camp') return 'A fire in the meadow past the Waystation pond, the night after the sitting.';
      return 'A night by the fire past the Waystation pond. In the morning the road goes on.';
    },
    objectives: (g, s) => {
      if (s === 'road') return [{ text: 'Make camp in the meadow past the Waystation pond', marker: 'campFire' }];
      if (s === 'camp') {
        const o: { text: string; marker?: string; done?: boolean }[] = [];
        if (wennaJoined(g)) o.push({ text: 'Sit with Wenna', done: !!g.flag('campW'), marker: 'camp_wenna' });
        if (ottJoined(g)) o.push({ text: 'Sit with Ottilie', done: !!g.flag('campO'), marker: 'camp_ottilie' });
        o.push({ text: 'Sit with Sela', done: !!g.flag('campS'), marker: 'camp_sela' });
        o.push({ text: 'Sleep by the fire', marker: 'campFire' });
        return o;
      }
      return [];
    },
    marks: (g, s): Marks => (s === 'camp' ? { ...(wennaJoined(g) && !g.flag('campW') ? { camp_wenna: '?' as const } : {}), ...(ottJoined(g) && !g.flag('campO') ? { camp_ottilie: '?' as const } : {}), ...(!g.flag('campS') ? { camp_sela: '?' as const } : {}) } : {}),
    advance: (g, s) => {
      if (s !== 'road' || !g.compNear(FIRE.x, FIRE.z, 14)) return null;
      // They sit down at the fire with you: whoever was at your side takes a place by it
      if (g.compActive()) g.compDismiss();
      return 'camp';
    },
    walk: { from: { quests: { storySitting: 'done', [CAMP]: 'road' }, flags: { charterEnd: 'joan', 'comp:wenna:joined': 1, 'comp:ottilie:joined': 1 } }, auto: { road: 'camp' } },
  },
};

const look = (id: 'wenna' | 'ottilie') => COMPANIONS[id].look;
const inCamp = (g: GameApi) => at(g, CAMP) === 'camp';

export const ACT_ONE: RegionContent = {
  id: 'actOne',
  items: [
    { id: 'oil_docket', name: 'Toll Office docket', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#7a2a24' }, desc: 'Received of the Toll Office, Ansbury: six barrels lamp oil, Light Fund surplus, at eleven marks the barrel. For Harrowgate & Daughters, A. Pryce. Released, L. Pike.' },
    { id: 'ottilie_levels', name: 'Ottilie\'s level book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#5a6a4a', b: '#e8dcc0' }, desc: 'A surveyor\'s field book, its corners turned down despite everything. Three readings across the Kirk floor, each written twice.' },
    { id: 'riders_page', name: 'A page of the Riders\' duty book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#2a3a6a' }, desc: '"Escort, H and D wagons, the Turnpike. Two riders. Four marks a day. Paid, A.P." Every week since Lady Day, in Captain Prowse\'s hand.' },
  ],
  npcs: [
    { id: 'wenna_road', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: [734.2, 746.2], face: [733.6, 742.6], anim: 'idle' }], barks: [], when: (g) => at(g, WIT) === 'road' || at(g, WIT) === 'look' },
    { id: 'nat_hendy', name: 'Nat Hendy', title: 'Carrier', look: { skin: '#c8906a', hair: '#5a4a3a', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#6a5a3a', trim: '#7a2a24', trousers: '#3a3430', boots: '#2a1e14', hat: 'wide', hatColor: '#3a3024', build: 1.15, age: 0.5 }, schedule: [{ from: 0, to: 24, at: [731.4, 740.0], face: [733.6, 742.6], anim: 'idle' }], barks: ['Due at the Works by dark.', 'Horse doesn\'t care.'], when: (g) => at(g, WIT) === 'road' || at(g, WIT) === 'look' },
    { id: 'prowse', name: 'Elis Prowse', title: 'Captain of the Toll Riders', look: { skin: '#d8b090', hair: '#8a8a84', hairStyle: 1, eyes: '#4a5a6a', tunic: '#2a3a6a', trim: '#e0c070', shirt: '#f0e8d8', trousers: '#2a2a30', boots: '#1e1a16', cape: '#1e2a4a', build: 0.96, age: 0.7 }, schedule: [{ from: 0, to: 24, at: [YARD.x - 3, YARD.z + 2], face: [YARD.x + 2, YARD.z], anim: 'idle' }], barks: ['Four short.', 'Water them and mount up.'], when: (g) => !!at(g, RID) && at(g, RID) !== 'done' },
    { id: 'camp_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: [FIRE.x - 2.2, FIRE.z + 1.2], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && wennaJoined(g) },
    { id: 'camp_ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice', look: look('ottilie'), schedule: [{ from: 0, to: 24, at: [FIRE.x + 2.1, FIRE.z + 1.4], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && ottJoined(g) },
    { id: 'camp_sela', name: 'Sela Orme', title: 'Keeper of the Glass Kirk', look: { skin: '#e0c0a0', hair: '#c8c4bc', hairStyle: 2, eyes: '#5a6a7a', tunic: '#5a5a6a', trim: '#c8c0a8', trousers: '#4a4a52', boots: '#3a3028', cape: '#6a6a74', lashes: true, frame: 'f', build: 0.9, age: 0.8 }, schedule: [{ from: 0, to: 24, at: [FIRE.x + 0.2, FIRE.z - 2.3], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: inCamp },
  ],
  dialogue: { wenna_road: wennaRoad, nat_hendy: natHendy, prowse, camp_wenna: campWenna, camp_ottilie: campOtt, camp_sela: campSela },
  quests: QUESTS,
  readables: {
    witnessBarrels: {
      title: 'The back of the wagon',
      body: 'Six barrels under a tarp. Each has the Light Fund\'s brand burnt into its head: a lighthouse, and FLEET. Over every brand, in fresh chalk, somebody has written H&D.\n\nTucked under the rope is a docket:\n\nReceived of the Toll Office, Ansbury, six barrels lamp oil, Light Fund surplus, at eleven marks the barrel. For Harrowgate & Daughters, A. Pryce.\nReleased, L. Pike.',
      effect: (g) => g.setFlag('witnessLooked', 1),
    },
    ridersBook: {
      title: 'The Riders\' duty book',
      body: 'Stretches and names, week by week, in a captain\'s neat hand. Since Lady Day every week has an extra line:\n\nEscort, H and D wagons, the Turnpike. Two riders. Four marks a day. Paid, A.P.\n\nThe last line was written on Thursday. You tear the page out.',
      effect: (g) => { g.setFlag('ridersBookRead', 1); if (!g.has('riders_page')) g.give('riders_page'); },
    },
    ...Object.fromEntries(LINE.map((l) => [l.id, { title: 'Ottilie\'s chalk mark', body: l.said, effect: (g: GameApi) => g.setFlag(l.id, 1) }])),
    fortyLip: { title: 'The lip of the raised floor', body: 'You stand the staff on the new edge, where the floor tore and lifted. Ottilie sights along her level from the old floor and calls it: "Two feet and an inch. Two feet."', effect: (g) => g.setFlag('fortyLip', 1) },
    fortyCut: { title: 'The bottom of the cut', body: 'You climb down into Harrowgate\'s cut and stand the staff on the crystal. Ottilie leans over the edge to read it. "Six feet of cap off. Six. They hadn\'t even started."', effect: (g) => g.setFlag('fortyCut', 1) },
    campSleep: {
      title: 'The fire',
      body: (g) => `The fire burns down. ${wennaJoined(g) ? 'Wenna sits the first watch with her back to it, looking at the road.' : ''} ${ottJoined(g) ? 'Ottilie falls asleep in the middle of a sum.' : ''} Sela says a few words over the fire before she lies down, too quietly to hear.\n\nIn the morning there's frost on the blankets, and the road south is white with it.`,
      effect: (g) => { if (at(g, CAMP) === 'camp') g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    { id: 'witnessBarrels', x: 732.6, z: 741.0, label: 'Look in the back of the wagon', radius: 2.2, read: 'witnessBarrels', when: (g) => at(g, WIT) === 'look' },
    { id: 'ridersBook', x: 719.5, z: 569.6, label: 'Read the Riders\' duty book', radius: 2.2, read: 'ridersBook', when: (g) => at(g, RID) === 'book' },
    ...LINE.map((l, i) => ({ id: l.id, x: l.x, z: l.z, label: 'Hold the line on the chalk cross', radius: 1.8, read: l.id, when: (g: GameApi) => at(g, OTT) === 'line' && !g.flag(l.id) && readings(g) === i })),
    { id: 'fortyLip', x: KIRK.x + 13.5, z: KIRK.z + 2.5, label: 'Hold the staff on the lip of the raised floor', radius: 2, read: 'fortyLip', when: (g) => at(g, FORTY) === 'read' && !g.flag('fortyLip') },
    { id: 'fortyCut', x: KIRK.x + 11.5, z: KIRK.z, label: 'Hold the staff at the bottom of the cut', radius: 2.4, read: 'fortyCut', when: (g) => at(g, FORTY) === 'read' && !g.flag('fortyCut') },
    { id: 'campFire', x: FIRE.x, z: FIRE.z, label: 'Sleep by the fire', radius: 2.6, read: 'campSleep', when: (g) => inCamp(g) && (!wennaJoined(g) || !!g.flag('campW')) && (!ottJoined(g) || !!g.flag('campO')) && !!g.flag('campS') },
  ],
  pieces: [
    { id: 'witnessWagon', kind: 'wagon', x: CART.x, z: CART.z, ry: CART.ry, when: (g) => at(g, WIT) === 'road' || at(g, WIT) === 'look' },
    { id: 'ridersBarrel', kind: 'barrels', x: 720.3, z: 569.2, ry: 0.4, when: (g) => at(g, RID) === 'post' || at(g, RID) === 'book' },
    { id: 'campFire', kind: 'campfire', x: FIRE.x, z: FIRE.z, when: (g) => at(g, CAMP) === 'road' || inCamp(g) },
    { id: 'campRollW', kind: 'bedroll', x: FIRE.x - 3.4, z: FIRE.z + 0.4, ry: 1.3, tint: '#2e3a4a', when: (g) => (at(g, CAMP) === 'road' || inCamp(g)) && wennaJoined(g) },
    { id: 'campRollO', kind: 'bedroll', x: FIRE.x + 3.2, z: FIRE.z + 1.8, ry: -1.1, tint: '#6a5a3a', when: (g) => (at(g, CAMP) === 'road' || inCamp(g)) && ottJoined(g) },
    { id: 'campRollS', kind: 'bedroll', x: FIRE.x + 0.6, z: FIRE.z - 3.6, ry: 0.2, tint: '#6a6a74', when: (g) => at(g, CAMP) === 'road' || inCamp(g) },
    { id: 'campRollP', kind: 'bedroll', x: FIRE.x - 1.6, z: FIRE.z + 3.4, ry: 2.6, tint: '#7a3a2e', when: (g) => at(g, CAMP) === 'road' || inCamp(g) },
  ],
  hooks: (D) => {
    // VI and VIII: Ottilie at the Kirk (whether or not she's travelling with you yet)
    hook(D, 'comp_ottilie', (g) => {
      const o = at(g, OTT);
      if (o === 'level') return 'o1';
      if (o === 'line') return readings(g) >= 3 ? 'oDone' : 'oWait';
      if (o === 'joan') return 'oJoan';
      const f = at(g, FORTY);
      if (f === 'ottilie') return 'f1';
      if (f === 'read') return g.flag('fortyLip') && g.flag('fortyCut') ? 'fSums' : 'fWait';
      if (f === 'joan') return 'fToJoan';
      return undefined;
    }, { ...ottNodes, ...fortyNodes });
    // Joan: Ottilie's book in the middle of her meeting; and Ottilie's forty feet before the sitting
    hook(D, 'joan', (g) => (at(g, FORTY) === 'joan' ? 'jf1' : at(g, OTT) === 'joan' ? 'meet' : undefined), {
      ...joanOtt, ...joanForty,
      j6: {
        text: 'Take my survey to the sitting. If anyone asks where you got it, I gave it you.',
        effect: (g: GameApi) => { g.give('joan_survey'); },
        options: [
          { text: 'Ottilie has something you should see first.', cond: (g: GameApi) => at(g, OTT) === 'joan', next: 'jo1' },
          { text: 'I will.', cond: (g: GameApi) => at(g, OTT) !== 'joan', next: 'j7' },
        ],
      },
      j9: {
        text: 'Hilda\'s foreman. She wants something to sell before the vote. Go!',
        // The Surveyor's Girl ends here, and the Lift begins. (A character met Joan before that chapter
        // existed: the chapter closes with the Fallen Star, unplayed.)
        effect: (g: GameApi) => { const was = at(g, OTT); g.setStage(OTT, 'done'); if (was !== 'joan') g.setStage('storyStar', 'done'); if (was === 'joan') joinStory(g, 'ottilie'); },
      },
    });
    hook(D, 'sela', (g) => {
      const o = at(g, OTT);
      return o === 'level' || o === 'line' || o === 'joan' ? 'w_ott' : undefined;
    }, {
      meet6: {
        text: 'Joan Harrowgate is at the east end with her tents: she\'s the one with the measures. And there\'s a girl from the survey office on my floor with a level and a notebook. Nine days she\'s been here. She says my floor is moving. Talk to her before you talk to Joan.',
        effect: (g: GameApi) => g.setStage('storyStar', 'done'),
      },
      w_ott: { text: (g: GameApi) => (at(g, OTT) === 'joan' ? 'East end. The tents. Take the girl with you: she\'s earned it.' : 'The girl with the level. West end, by the star, on her knees. You can\'t miss her. She\'ll tell you not to step on her line.') },
    });
  },
};
