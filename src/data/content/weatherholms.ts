import type { DialogueTree, GameApi } from '../../game/api';
import { bigIsle, hoistSpot } from '../../world/holms';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';

// THE WEATHERHOLMS: the main story's second act, chapters VII to XII.
//
// After the sitting, Hilda Harrowgate looks for crystal where the Charter's writ doesn't run: above
// the ground. Her crew has built a hoist beside the largest of the Weatherholms and is cutting the
// crystal out of the forty-one's ring. Crystal is what holds an isle up, so every basket sent down
// lets it fall a little further toward the camp under it. On the ring's stones, the forty-one kept
// counting for generations: they spun rope from their own sheep, and the last nine climbed down it
// and built the arches at Ketley, so that nobody else would go up.
//
// Chapters (quest ids): storyStride, storyHoist, storyForty, storyDrop, storyBaskets, storyLastMark.
// Ending flag: holmEnd = 'back' (the crystal goes back up; the venture ends) | 'charter' (the Charter
// claims the isles; the hoist is the Charter's) | 'joan' (Joan sets the rate: small isles only, a
// basket a month, weight put back until the ring isle is steady).
// Cast: Gethin Vane (the hoist's foreman), Delyth Morgan (crew; Cai's daughter), Hilda at the hoist,
// Wynn Carrow on the isle at the end, with Ilse, Joan and the Speaker from Act I.

const ACT = 'The Weatherholms';
const STRIDE = 'storyStride', HOIST = 'storyHoist', FORTY = 'storyForty', DROP = 'storyDrop', BASKETS = 'storyBaskets', LAST = 'storyLastMark';

const H = hoistSpot(), I = bigIsle();
/** A point measured from the tower's foot, away from the isle (k), and to the side (w). */
const foot = (k: number, w = 0): [number, number] => [H.x - H.dx * k + (H.dz !== 0 ? w : 0), H.z - H.dz * k + (H.dx !== 0 ? w : 0)];
/** A point on the isle, measured from its middle toward the tower (k), and to the side (w). */
const isle = (k: number, w = 0): [number, number] => [I.x - H.dx * k + (H.dz !== 0 ? w : 0), I.z - H.dz * k + (H.dx !== 0 ? w : 0)];
/** Points on the ring: the stones stand inside its columns (radius 5). */
const ring = (deg: number, r = 4): [number, number] => [I.x + 0.5 + Math.cos((deg * Math.PI) / 180) * r, I.z + 0.5 + Math.sin((deg * Math.PI) / 180) * r];
// A step in from each standing stone (the stones themselves are built in sites.ts, inside the columns)
const T1 = ring(0, 2.6), T2 = ring(135, 2.6), T3 = ring(225, 2.6), TLAST: [number, number] = [I.x + 1.5, I.z + 2.5];
const STORE = foot(-1, 5);

const stones = (g: GameApi) => ['holmT1', 'holmT2', 'holmT3'].filter((f) => g.flag(f)).length;
const loads = (g: GameApi) => Number(g.flag('holmLoads') ?? 0);
const end = (g: GameApi) => g.flag('holmEnd') as 'back' | 'charter' | 'joan' | undefined;
/** May the player ride the basket: once Gethin says so, and for good after the act. */
const mayRide = (g: GameApi) => !!g.flag('holmPass');

// ================================================================ VII. A STRIDE A WEEK

const rhosynLetter = {
  wh_l1: { text: 'Ilse Blewitt has written to me. Twice in one month, which is twice more than the Charter has paid her on time.', next: 'wh_l2' },
  wh_l2: { text: 'The Weatherholms are moving. She says faster since the Kirk floor came up, and the big one is lower than it was.', next: 'wh_l3' },
  wh_l3: { text: 'She also says there are lights on it at night, and nobody lives on an island in the sky.', next: 'wh_l4' },
  wh_l4: {
    text: 'The Charter has no clerk who can climb, and no claim to anything above the ground. Will you go and look?',
    options: [
      { text: 'I\'ll go to Scarth Watch.', next: 'wh_l5', effect: (g: GameApi) => g.setStage(STRIDE, 'ilse') },
      { text: 'Not now.' },
    ],
  },
  wh_l5: { text: 'Take the Post to Kelderby and walk east. She\'ll have a number for you before she has a cup of anything.' },
};

const ilseNodes = {
  wh_s1: { text: 'Thirty years I\'ve logged the Weatherholms. A stride a year, east, give or take a foot.', next: 'wh_s2' },
  wh_s2: { text: 'Since midsummer, eleven strides. And the big one has come down nine feet against the ridge behind it.', next: 'wh_s3' },
  wh_s3: { text: 'Crystal is lift. Take crystal off an isle and it doesn\'t rise. It sinks. Something up there is taking the crystal.', next: 'wh_s4' },
  wh_s4: { text: 'And there are lights at night. Look for yourself. The glass is set on it.', effect: (g: GameApi) => g.setStage(STRIDE, 'glass') },
  wh_sWait: { text: 'The glass. It\'s set. Don\'t touch the screws.' },
  // X. Dead Weight: her log, for Gethin
  wh_d1: {
    text: (g: GameApi) => (g.flag('holmQuake') ? 'I felt it from here. The needle on the storm glass jumped. Four feet, this afternoon, on top of nine.' : 'Thirteen feet, now.'),
    next: 'wh_d2',
  },
  wh_d2: { text: 'Thirteen feet in a month. Before this summer it rose an inch in ten years, if it rose at all.', next: 'wh_d3' },
  wh_d3: {
    text: 'Here. Every night\'s reading since midsummer, signed. If your foreman wants a number he can\'t argue with, he can argue with this.',
    effect: (g: GameApi) => { g.give('ilse_droplog'); },
  },
  wh_dWait: { text: 'Joan Harrowgate will want the weights. Ask her what a basket weighs in feet. I only count them.' },
};

const joanNodes = {
  wh_j1: { text: 'Hilda\'s on the Weatherholms. I heard from Corrie. I hear about my sister from everybody except my sister.', next: 'wh_j2' },
  wh_j2: { text: 'Give me the numbers. How many baskets down, how far has it dropped?', next: 'wh_j3' },
  wh_j3: { speaker: 'narrator' as const, text: 'You tell her: twenty-four baskets, thirteen feet, four of them this afternoon.', next: 'wh_j4' },
  wh_j4: { speaker: 'narrator' as const, text: 'She writes it down twice on the back of a survey sheet and does a sum you can\'t follow.', next: 'wh_j5' },
  wh_j5: { text: 'It isn\'t a straight line. The less crystal there is, the more each basket costs it. That\'s why four feet today.', next: 'wh_j6' },
  wh_j6: { text: 'Six more baskets and what\'s left won\'t hold it up. It won\'t drift down. It\'ll come down, on the tower and the camp.', next: 'wh_j7' },
  wh_j7: {
    text: 'There. My reckoning, signed with my name, which Hilda will hate. Tell her she can come and argue with me.',
    effect: (g: GameApi) => { g.give('joan_reckoning'); },
  },
  wh_jWait: { text: 'Ilse Blewitt\'s log and my reckoning. Gethin Vane will stop for paper. He won\'t stop for shouting.' },
  // XI, if the player leaves the rate to Joan
  wh_r1: { text: 'Hilda agreed to my terms? Out loud? Was anybody there to hear it?', next: 'wh_r2' },
  wh_r2: {
    text: 'Then: the ring isle is left alone. Small isles only, a basket a month, and weight put back on the big one from the store until it stops dropping.',
    next: 'wh_r3',
  },
  wh_r3: { text: 'I\'ll go up myself and measure. Sela Orme can count the Kirk floor without me for a while. She prefers it.', effect: (g: GameApi) => g.setStage(BASKETS, 'done') },
  wh_rWait: { text: 'I\'ll be on the hoist. Somebody has to read the plumb line who isn\'t paid by the basket.' },
};

// ================================================================ VIII. COMPANY BASKET

const gethin: DialogueTree = {
  start: (g) => {
    const h = at(g, HOIST), d = at(g, DROP), b = at(g, BASKETS);
    if (h === 'gethin') return 'g1';
    if (h === 'footings') return 'gWait';
    if (h === 'cleared') return 'c1';
    if (h === 'basket') return 'cBasket';
    if (d === 'gethin') return 'd1';
    if (d === 'proof') return 'dWait';
    if (b === 'load') return 'lWait';
    if (b === 'loaded') return 'l1';
    if (end(g)) return 'after';
    return 'main';
  },
  nodes: {
    main: { text: 'Company basket. If you\'re not crew, you\'re cargo, and cargo goes by the stone.' },
    g1: { text: 'Company basket. If you\'re not crew, you\'re cargo, and cargo goes by the stone.', next: 'g2' },
    g2: {
      text: 'Gethin Vane. I run the hoist for Harrowgate. You\'re the one Hilda talks about. She doesn\'t say your name, she says "that one".',
      options: [
        { text: 'What is Harrowgate doing on the Weatherholms?', next: 'g3' },
        { text: 'I want to go up.', next: 'g5' },
      ],
    },
    g3: { text: 'Cutting crystal. There\'s a lump of it in the old ring up top. Thirty baskets before the frost, the order says.', next: 'g4' },
    g4: { text: 'Two marks a day and board. Kelderby lads mostly, and Cai Morgan\'s girl, who\'s worth two of them.', next: 'g5' },
    g5: { text: 'Here\'s my trouble. The footings went down into a seam. Every night, jellies come up out of it, where the posts go in.', next: 'g6' },
    g6: { text: 'Two of my crew bitten this week. I can\'t send baskets with jellies at the winch.', next: 'g7' },
    g7: {
      text: 'Clear the footings and you can ride. No charge. I\'ll put it down as pest control.',
      options: [
        { text: 'I\'ll clear them.', next: 'g8', effect: (g) => g.setStage(HOIST, 'footings') },
        { text: 'Later.' },
      ],
    },
    g8: { text: 'They come up round the tower\'s feet. Mind the posts. I\'ve only got the four.' },
    gWait: { text: (g) => `Footings. ${Math.min(4, killed(g, 'footings'))} of four. Mind the posts.` },
    c1: { text: 'That\'s the footings clear. Hesk said you were useful. He says it like it annoys him.', next: 'c2' },
    c2: { text: 'Get in the basket. At the top, walk the plank onto the grass. Don\'t look down the gap between.', next: 'c3' },
    c3: {
      text: 'Delyth Morgan\'s up there. Tell her her da\'s asking after her. He asks me every day, and I\'m running out of ways to say "fine".',
      effect: (g) => { g.setFlag('holmPass', true); g.setStage(HOIST, 'basket'); },
    },
    cBasket: { text: 'Basket\'s at the foot of the tower. Step in and pull the cord.' },
    // X. Dead Weight
    d1: { text: 'Felt that, did you? The rope paid out four feet and I never touched the brake.', next: 'd2' },
    d2: { text: 'Twenty-four baskets down. Hilda\'s order says thirty.', next: 'd3' },
    d3: { speaker: 'narrator', text: 'He shows you the order slip, folded small. "Thirty baskets before the frost. H.H."', next: 'd4' },
    d4: { text: 'I stop when she says stop. Or when somebody shows me a number I can\'t argue with. I can argue with most numbers.', next: 'd5' },
    d5: {
      text: 'Ilse Blewitt at the Watch keeps a log of those isles. And Hilda\'s sister knows what crystal weighs. Bring me paper from both.',
      effect: (g) => g.setStage(DROP, 'proof'),
    },
    dWait: {
      text: (g) => {
        const n = (g.has('ilse_droplog') ? 1 : 0) + (g.has('joan_reckoning') ? 1 : 0);
        return n === 0 ? 'Ilse Blewitt\'s log, and Joan Harrowgate\'s figures. No baskets till then. I\'ve told the crew it\'s the rope.' : 'One of two. The crew think the rope\'s fraying. I\'m not correcting them.';
      },
    },
    // XI, sending it back up
    lWait: { text: (g) => `${loads(g)} of four loads. The crates are by the store. Two crew to a crate, or one of you, apparently.` },
    l1: { text: 'That\'s the last of it. Twenty-four baskets of crystal, back where they came from.', next: 'l2' },
    l2: { speaker: 'narrator', text: 'Gethin reads the plumb line on the tower post twice. Then he takes his cap off.', next: 'l3' },
    l3: { text: 'Holding. Not a hair since the third load. I\'ll tell Hilda myself. She can dock it from my pay, if there\'s any pay.', effect: (g) => g.setStage(BASKETS, 'done') },
    after: {
      text: (g) => {
        const e = end(g);
        if (e === 'charter') return 'Charter hoist now. A mark a ride, and the Speaker pays my wages. Turns out I\'m the same man for a different hat.';
        if (e === 'joan') return 'A basket a month from the little isles. Joan reads the plumb line every morning before I\'m allowed my tea.';
        return 'Company hoist, no company. Hilda\'s paying me to keep it standing until she decides what to do with it. I\'m good at standing.';
      },
    },
  },
};

// ================================================================ IX. THE FORTY-ONE

const delyth: DialogueTree = {
  start: (g) => {
    const f = at(g, FORTY), l = at(g, LAST);
    if (f === 'delyth') return 'y1';
    if (f === 'stones') return stones(g) >= 3 ? 'z1' : 'yWait';
    if (f === 'keel') return 'kWait';
    if (f === 'after') return 'a1';
    if (l === 'stone') return 'm1';
    if (l === 'done') return 'after';
    return 'main';
  },
  nodes: {
    main: { text: 'Mind the cut. Gethin says I\'m not to let anyone fall in it, and I\'m not having that on my wages.' },
    y1: { text: 'You\'re not crew. Crew don\'t look at the stones. They look at the cut, and the basket, and their tea.', next: 'y2' },
    y2: {
      text: 'Delyth. Cai Morgan\'s. If he sent you, tell him I\'m fine, and the food\'s worse than his.',
      options: [{ text: 'What are you writing?', next: 'y3' }],
    },
    y3: { speaker: 'narrator', text: 'A book of grey paper, half full: rows of strokes, copied in charcoal, and little drawings copied clumsily under them.', next: 'y4' },
    y4: { text: 'The stones. On the ring. Somebody counted on them, and kept counting, and nobody\'s read them since.', next: 'y5' },
    y5: { text: 'I\'ve done the one by the bridge. There are three more round the ring that I can read. Will you? My eyes are gone for the day.', next: 'y6' },
    y6: {
      text: 'Read them out to me and I\'ll write. Then we\'ll know what we\'ve been standing on.',
      effect: (g) => g.setStage(FORTY, 'stones'),
    },
    yWait: { text: (g) => `${stones(g)} of three. There's one by each of the tall columns. Read slowly. I write slow.` },
    z1: { speaker: 'narrator', text: 'She reads back what she\'s written, running a black finger down the page.', next: 'z2' },
    z2: { text: 'Forty-one at the start. Then more: children, it must be. Sixty-three at the most. Then down. Thirty. Twenty-two. Nine.', next: 'z3' },
    z3: { text: 'They lived up here. Years. Sheep, a well, graves. And all down the edge of the second stone, rope. Coils of it, bigger every time.', next: 'z4' },
    z4: { text: 'They had sheep. They were spinning. For years, they were spinning rope.', next: 'z5' },
    z5: { speaker: 'narrator', text: 'She looks at the cut in the middle of the ring: a square hole in the paving, raw crystal at the bottom, a ladder down into it.', next: 'z6' },
    z6: { text: 'Twenty-four baskets we\'ve taken out of their floor. Gethin says thirty. I\'ve been sending it down while I copied this.', next: 'z7' },
    z7: {
      speaker: 'narrator',
      text: 'The grass tilts under your boots. Every column in the ring rocks on its base at once. Somewhere far below, a man shouts about the rope.',
      effect: (g) => { g.quake(0.9); g.setFlag('holmQuake', true); },
      next: 'z8',
    },
    z8: { speaker: 'narrator', text: 'Up out of the cut comes something glassy and violet, wider than the hole it climbs out of, and more behind it.', next: 'z9' },
    z9: { text: 'That\'s the crystal. That\'s the crystal we were cutting. Don\'t let it near the bridge.', effect: (g) => g.setStage(FORTY, 'keel') },
    kWait: { text: 'Keep it off the bridge. If the bridge goes, so does the only way down that isn\'t quick.' },
    a1: { text: 'It\'s gone back into the cut. Or it is the cut. I don\'t want to know which.', next: 'a2' },
    a2: { text: 'Gethin felt that. Everyone in Kelderby felt that. Go down and tell him what happened before he sends the basket up empty to look.', next: 'a3' },
    a3: {
      text: 'Take my copy. Somebody down there should read it before they send another basket. Bring it back. It\'s the only one.',
      effect: (g) => { g.give('tally_copy'); g.setStage(FORTY, 'done'); },
    },
    // XII
    m1: { text: 'He\'s been reading that stone for an hour. He cried a bit. I pretended to be counting.' },
    after: {
      text: (g) => (g.has('holm_mark') || g.flag('holmMarked')
        ? 'Forty-two. Don\'t tell Gethin. He\'ll want one, and he hasn\'t earned it.'
        : 'Mind the cut. It\'s just a hole now. A hole with a lot of history.'),
    },
  },
};

// ================================================================ XI. THIRTY BASKETS

const hilda: DialogueTree = {
  start: (g) => (at(g, BASKETS) === 'hilda' ? 'h1' : end(g) ? 'after' : 'wait'),
  nodes: {
    h1: { text: 'You. Gethin\'s stopped the hoist, the crew are sitting about singing, and I\'ve had a letter from my sister. Explain.', next: 'ev' },
    ev: {
      text: (g) => (g.flag('holmShown') ? 'Is there more?' : 'Well?'),
      options: [
        { text: 'Show Ilse Blewitt\'s log.', next: 'e1', cond: (g) => g.has('ilse_droplog') && !g.flag('holmShownLog') },
        { text: 'Show Joan\'s reckoning.', next: 'e2', cond: (g) => g.has('joan_reckoning') && !g.flag('holmShownJoan') },
        { text: 'Show Delyth\'s copy of the stones.', next: 'e3', cond: (g) => g.has('tally_copy') && !g.flag('holmShownCopy') },
        { text: 'That\'s all of it.', next: 'decide', cond: (g) => !!g.flag('holmShown') },
      ],
    },
    e1: { speaker: 'narrator', text: 'She reads the last page first, the way people read endings.', effect: (g) => { g.setFlag('holmShownLog'); g.setFlag('holmShown'); }, next: 'e1b' },
    e1b: { text: 'Thirteen feet. The tower\'s sixty. There\'s room.', next: 'e1c' },
    e1c: { text: 'I know. You\'ll tell me it\'s faster each time. Joan wrote that too, with diagrams.', next: 'ev' },
    e2: { speaker: 'narrator', text: 'She doesn\'t read it. She looks at the signature for a long time.', effect: (g) => { g.setFlag('holmShownJoan'); g.setFlag('holmShown'); }, next: 'e2b' },
    e2b: { text: 'My sister is usually right. It\'s the worst thing about her. Six baskets, she says, and down it comes.', next: 'ev' },
    e3: { speaker: 'narrator', text: 'She turns the grey pages slowly. At the coils of rope, she stops.', effect: (g) => { g.setFlag('holmShownCopy'); g.setFlag('holmShown'); }, next: 'e3b' },
    e3b: { text: 'Delyth reads these to the crew at supper. I\'ve heard her. Forty-one people, eight hundred years ago.', next: 'e3c' },
    e3c: { text: 'I\'m not a monster. I\'m forty thousand marks short of being anything at all.', next: 'ev' },
    decide: {
      text: 'The Charter has no claim above the ground. The notice says so and the notice is correct. What do you want from me?',
      options: [
        { text: 'Send the twenty-four baskets back up. All of them. The venture ends.', next: 'b1' },
        { text: 'Let the Charter decide who owns the sky. Stop until the Speaker rules.', next: 'c1' },
        { text: 'Let Joan set the rate: the small isles only, a basket a month, weight back on the big one.', next: 'j1' },
      ],
    },
    b1: { text: 'Back into the sky. Twenty-four baskets I paid two marks a day a head to bring down.', next: 'b2' },
    b2: { speaker: 'narrator', text: 'She looks up at the isle for a while. A crumb of soil falls off its underside and lands on the winch.', next: 'b3' },
    b3: {
      text: 'Fine. Gethin. Send it back. And you can help him, since it was your idea. The crates are heavy. Good.',
      effect: (g) => { g.setFlag('holmEnd', 'back'); g.setStage(BASKETS, 'load'); },
    },
    c1: { text: 'The Speaker. Who has no clerk who can climb, and a debt she can\'t pay.', next: 'c2' },
    c2: {
      text: 'Very well. The hoist stops until Rhosyn Tarrant says who owns the air. Go and tell her. I\'ll be here, being reasonable.',
      effect: (g) => { g.setFlag('holmEnd', 'charter'); g.setStage(BASKETS, 'speaker'); },
    },
    j1: { text: 'My sister. Setting the rate on my venture.', next: 'j2' },
    j2: { speaker: 'narrator', text: 'She says it as if it\'s something on her shoe. Then, after a while, she says it again, quieter.', next: 'j3' },
    j3: {
      text: 'A basket a month is a living. Thirty before the frost was a gamble. Tell Joan she has her terms, and that I said so in front of you.',
      effect: (g) => { g.setFlag('holmEnd', 'joan'); g.setStage(BASKETS, 'joan'); },
    },
    wait: {
      text: (g) => {
        const s = at(g, BASKETS);
        if (s === 'load') return 'The crates are by the store. I\'m not lifting one. I\'m watching.';
        if (s === 'speaker') return 'Go on. Ansbury. Tell her the sky\'s for sale and see what she does.';
        return 'Tell my sister. Before I change my mind.';
      },
    },
    after: {
      text: (g) => {
        const e = end(g);
        if (e === 'charter') return 'The Charter owns the sky now. Rhosyn Tarrant will need a bigger ledger.';
        if (e === 'joan') return 'A basket a month. Joan reads me the plumb line in her letters, as if I asked.';
        return 'I\'m told the isle\'s holding. I\'m told a lot of things. This one I went and looked at.';
      },
    },
  },
};

// ================================================================ XII. THE LAST MARK

const wynnHolm: DialogueTree = {
  start: (g) => {
    const l = at(g, LAST);
    if (l === 'wynn') return 'w1';
    if (l === 'stone') return g.flag('holmLastRead') ? 'v1' : 'wWait';
    return 'after';
  },
  nodes: {
    w1: { text: 'Eleven years at Ketley with my head down, measuring the grooves. It was over my head the whole time.', next: 'w2' },
    w2: { text: 'Delyth showed me her book. I\'ve read it four times. The fourth time I sat down.', next: 'w3' },
    w3: { text: 'When the Keel came up it shifted the paving. There\'s a fourth stone under it, face down. I can\'t turn it alone.', next: 'w4' },
    w4: { text: 'Will you? I want to be wrong about what\'s on it, and I want someone else there when I find out.', effect: (g) => g.setStage(LAST, 'stone') },
    wWait: { text: 'By the cut. Face down. Mind your back.' },
    v1: { text: 'Nine strokes. A rope. And at the bottom of the rope, five arches in a row.', next: 'v2' },
    v2: { text: 'Ketley has five arches. I\'ve counted them every morning for eleven years.', next: 'v3' },
    v3: { text: 'They spun rope for three lifetimes, until it was long enough. Then the last nine climbed down.', next: 'v4' },
    v4: { text: 'And they built the arches. Not to tie up their own field. It was gone. To tie down the fields that were still on the ground.', next: 'v5' },
    v5: { text: 'Ilse\'s letter said the arches face the wrong way. They don\'t. They face the ground. They were never gates.', next: 'v6' },
    v6: { text: 'They\'re a promise. Nobody else goes up.', next: 'v7' },
    v7: { speaker: 'narrator', text: 'Delyth comes over with her chisel and kneels by the stone. She cuts one more stroke after the nine, small and careful, and puts the chisel in your hand.', next: 'v8' },
    v8: {
      text: 'I think I was right, and I\'d rather have been wrong, and I don\'t mind as much as I thought. Thank you for turning it.',
      effect: (g) => { g.give('holm_mark'); g.setFlag('holmMarked', true); g.addMarks(200); g.setStage(LAST, 'done'); },
    },
    after: {
      text: (g) => {
        const e = end(g);
        if (e === 'charter') return 'The Speaker has made me the Charter\'s keeper of the ring. Unpaid. I\'ve never been prouder of being unpaid.';
        if (e === 'joan') return 'Joan measures the isle every morning and I read the stones every afternoon. Between us we know almost everything about it.';
        return 'I\'m going back to Ketley to tell the arches. I know how that sounds. I\'m going anyway.';
      },
    },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [STRIDE]: {
    id: STRIDE, name: 'A Stride a Week', story: { chapter: 7, title: 'A Stride a Week', act: ACT }, next: [HOIST, 'gethin'],
    notes: (_g: GameApi, s: string) => {
      if (s === 'letter') return 'Speaker Tarrant has a letter from Ilse Blewitt about the Weatherholms.';
      if (s === 'ilse') return 'Ilse Blewitt has written to the Speaker: the Weatherholms are moving faster since the Kirk floor came up, the big one is lower, and there are lights on it at night. Scarth Watch is east of Kelderby.';
      if (s === 'glass') return 'Ilse: crystal is lift, so an isle that loses crystal sinks. The big isle has dropped nine feet in a month. Something up there is taking the crystal. Her glass is set on it.';
      if (s === 'hoist') return 'Through Ilse\'s glass: a timber tower beside the big isle, and a basket going down it. Harrowgate & Daughters?';
      return 'Harrowgate has built a hoist beside the largest of the Weatherholms. Its notice says the Charter has no claim above the ground.';
    },
    objectives: (_g: GameApi, s: string) => {
      if (s === 'letter') return [{ text: 'Hear the Speaker out on the keep steps', marker: 'rhosyn' }];
      if (s === 'ilse') return [{ text: 'Talk to Ilse Blewitt at Scarth Watch', marker: 'ilse' }];
      if (s === 'glass') return [{ text: 'Look through Ilse\'s glass', marker: 'ilseGlass2' }];
      if (s === 'hoist') return [{ text: 'Find the tower beside the Weatherholms', marker: 'hoistNotice' }];
      return [];
    },
    marks: (g: GameApi, s: string | undefined): Marks => {
      if (!s) return at(g, 'storySitting') === 'done' ? { rhosyn: '!' } : {};
      return s === 'letter' ? { rhosyn: '?' } : s === 'ilse' ? { ilse: '?' } : {};
    },
    walk: { from: { quests: { storySitting: 'done' }, flags: { charterEnd: 'refuse' } } },
  },
  [HOIST]: {
    id: HOIST, name: 'Company Basket', story: { chapter: 8, title: 'Company Basket', act: ACT }, next: [FORTY, 'delyth'],
    notes: (g: GameApi, s: string) => {
      if (s === 'gethin') return 'Harrowgate\'s hoist. The foreman will know what the crew is doing up there.';
      if (s === 'footings') return 'Gethin Vane runs the hoist. Harrowgate is cutting crystal out of the old ring on the big isle: thirty baskets before the frost. Shard jellies come up round the tower\'s feet at night. If I clear them, I can ride the basket.';
      if (s === 'cleared') return 'The footings are clear. Gethin Vane owes me a ride.';
      return 'Gethin will let me ride the basket up. Delyth Morgan, Cai\'s daughter, is on the crew up top.';
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'gethin') return [{ text: 'Talk to the hoist\'s foreman', marker: 'gethin' }];
      if (s === 'footings') return [{ text: `Clear the shard jellies from the tower's footings (${Math.min(4, killed(g, 'footings'))}/4)`, marker: 'hoistUp' }];
      if (s === 'cleared') return [{ text: 'Tell Gethin Vane', marker: 'gethin' }];
      if (s === 'basket') return [{ text: 'Ride the basket up', marker: 'hoistUp' }];
      return [];
    },
    advance: (g: GameApi, s: string) => (s === 'footings' && killed(g, 'footings') >= 4 ? 'cleared' : null),
    marks: (_g: GameApi, s: string | undefined): Marks => (s === 'gethin' || s === 'cleared' ? { gethin: '?' } : {}),
    walk: { from: { quests: { storySitting: 'done', [STRIDE]: 'done', [HOIST]: 'gethin' } } },
  },
  [FORTY]: {
    id: FORTY, name: 'The Forty-One', story: { chapter: 9, title: 'The Forty-One', act: ACT }, next: [DROP, 'gethin'],
    notes: (g: GameApi, s: string) => {
      if (s === 'delyth') return 'Delyth Morgan is on the crew at the top of the hoist.';
      if (s === 'stones') return 'Delyth is copying the counting stones on the old ring into a book. She has done one; she wants me to read her the other three.';
      if (s === 'keel') return 'Forty-one went up. They lived on the isle for generations, kept sheep, and spun rope. Harrowgate has taken twenty-four baskets of crystal from the ring\'s floor. The isle dropped under us, and something came up out of the cut.';
      if (s === 'after') return 'The thing from the cut is dead, or back in the crystal. Delyth wants a word.';
      return 'Delyth gave me her copy of the stones for whoever decides whether another basket goes down.';
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'delyth') return [{ text: 'Find Delyth Morgan on the isle', marker: 'delyth' }];
      if (s === 'stones') return [
        { text: `Read the counting stones round the ring (${stones(g)}/3)`, done: stones(g) >= 3, marker: !g.flag('holmT1') ? 'holmT1' : !g.flag('holmT2') ? 'holmT2' : 'holmT3' },
        ...(stones(g) >= 3 ? [{ text: 'Tell Delyth what they say', marker: 'delyth' }] : []),
      ];
      if (s === 'keel') {
        const j = Math.min(3, killed(g, 'keelJ')), k = Math.min(1, killed(g, 'keel'));
        return [
          { text: `Kill the shard jellies from the cut (${j}/3)`, done: j >= 3, marker: 'holmCut' },
          { text: `Kill the Keel (${k}/1)`, done: k >= 1, marker: 'holmCut' },
        ];
      }
      if (s === 'after') return [{ text: 'Talk to Delyth', marker: 'delyth' }];
      return [];
    },
    advance: (g: GameApi, s: string) => (s === 'keel' && killed(g, 'keelJ') >= 3 && killed(g, 'keel') >= 1 ? 'after' : null),
    marks: (g: GameApi, s: string | undefined): Marks => (s === 'delyth' || s === 'after' || (s === 'stones' && stones(g) >= 3) ? { delyth: '?' } : {}),
    walk: { from: { quests: { storySitting: 'done', [STRIDE]: 'done', [HOIST]: 'done', [FORTY]: 'delyth' }, flags: { holmPass: true } } },
  },
  [DROP]: {
    id: DROP, name: 'Dead Weight', story: { chapter: 10, title: 'Dead Weight', act: ACT }, next: [BASKETS, 'hilda'],
    notes: (g: GameApi, s: string) => {
      if (s === 'gethin') return 'The isle dropped four feet in an afternoon. Gethin Vane should hear what happened up there.';
      const parts = ['Gethin stops the hoist when Hilda says, or for a number he can\'t argue with. Hilda\'s order is thirty baskets; twenty-four are down.'];
      if (!g.has('ilse_droplog')) parts.push('Ilse Blewitt logs the isles every night.');
      if (!g.has('joan_reckoning')) parts.push('Joan Harrowgate at the Glass Kirk can say what a basket of crystal is worth in feet.');
      return parts.join(' ');
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'gethin') return [{ text: 'Tell Gethin Vane what happened on the isle', marker: 'gethin' }];
      return [
        { text: 'Get Ilse Blewitt\'s log of the isle', done: g.has('ilse_droplog'), marker: 'ilse' },
        { text: 'Get Joan Harrowgate\'s reckoning', done: g.has('joan_reckoning'), marker: 'joan' },
      ];
    },
    advance: (g: GameApi, s: string) => (s === 'proof' && g.has('ilse_droplog') && g.has('joan_reckoning') ? 'done' : null),
    marks: (g: GameApi, s: string | undefined): Marks => (s === 'gethin' ? { gethin: '?' } : s === 'proof' ? { ...(g.has('ilse_droplog') ? {} : { ilse: '?' }), ...(g.has('joan_reckoning') ? {} : { joan: '?' }) } : {}),
    walk: { from: { quests: { storySitting: 'done', [STRIDE]: 'done', [HOIST]: 'done', [FORTY]: 'done', [DROP]: 'gethin' }, flags: { holmPass: true, holmQuake: true }, items: [['tally_copy', 1]] } },
  },
  [BASKETS]: {
    id: BASKETS, name: 'Thirty Baskets', story: { chapter: 11, title: 'Thirty Baskets', act: ACT }, next: [LAST, 'wynn'],
    notes: (g: GameApi, s: string) => {
      const e = end(g);
      if (s === 'hilda') return 'Hilda Harrowgate has come to the hoist herself. I have Ilse\'s log, Joan\'s reckoning and Delyth\'s copy of the stones.';
      if (s === 'load') return 'Hilda will send the crystal back up, and I\'m to help Gethin load it: four loads from the store at the tower\'s foot.';
      if (s === 'loaded') return 'The crystal is back on the isle. Gethin is reading his plumb line.';
      if (s === 'speaker') return 'Hilda will stop until the Speaker rules on who owns the Weatherholms. Rhosyn Tarrant is in Ansbury.';
      if (s === 'joan') return 'Hilda has agreed to Joan\'s terms. Joan Harrowgate should hear it from me.';
      if (e === 'charter') return 'The Speaker has ruled: the Weatherholms are the Charter\'s. The ring is to be left as it is, the crystal goes back up, and the hoist is the Charter\'s, a mark a ride.';
      if (e === 'joan') return 'Joan Harrowgate sets the rate: the ring isle is left alone, the small isles give a basket a month, and weight goes back on the big one until it stops dropping.';
      return 'The twenty-four baskets went back up. The isle is holding. Harrowgate\'s venture is over, and the hoist stands empty.';
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'hilda') return [{ text: 'Talk to Hilda Harrowgate at the hoist', marker: 'marenHoist' }];
      if (s === 'load') return [{ text: `Load the crystal into the basket (${loads(g)}/4)`, marker: 'holmStore' }];
      if (s === 'loaded') return [{ text: 'Talk to Gethin Vane', marker: 'gethin' }];
      if (s === 'speaker') return [{ text: 'Ask the Speaker to rule on the Weatherholms', marker: 'rhosyn' }];
      if (s === 'joan') return [{ text: 'Tell Joan Harrowgate at the Glass Kirk', marker: 'joan' }];
      return [];
    },
    advance: (g: GameApi, s: string) => (s === 'load' && loads(g) >= 4 ? 'loaded' : null),
    marks: (_g: GameApi, s: string | undefined): Marks => (s === 'hilda' ? { marenHoist: '?' } : s === 'loaded' ? { gethin: '?' } : s === 'speaker' ? { rhosyn: '?' } : s === 'joan' ? { joan: '?' } : {}),
    walk: { from: { quests: { storySitting: 'done', [STRIDE]: 'done', [HOIST]: 'done', [FORTY]: 'done', [DROP]: 'done', [BASKETS]: 'hilda' }, flags: { holmPass: true, holmQuake: true }, items: [['tally_copy', 1], ['ilse_droplog', 1], ['joan_reckoning', 1]] } },
  },
  [LAST]: {
    id: LAST, name: 'The Last Mark', story: { chapter: 12, title: 'The Last Mark', act: ACT },
    notes: (g: GameApi, s: string) => {
      if (s === 'wynn') return 'Wynn Carrow has come up the hoist from Ketley. He\'s at the ring with Delyth.';
      if (s === 'stone') return 'When the Keel came up, it shifted the paving by the cut. There\'s a fourth stone under it, face down. Wynn can\'t turn it alone.';
      return 'The last nine of the forty-one climbed down a rope they spun for three lifetimes, and built the five arches at Ketley so that nobody else would go up. Delyth cut a forty-second stroke on the stone, and gave me the chisel to keep.';
    },
    objectives: (g: GameApi, s: string) => {
      if (s === 'wynn') return [{ text: 'Find Wynn Carrow at the ring', marker: 'wynnHolm' }];
      if (s === 'stone') return g.flag('holmLastRead') ? [{ text: 'Talk to Wynn Carrow', marker: 'wynnHolm' }] : [{ text: 'Turn the fourth stone', marker: 'holmLast' }];
      return [];
    },
    marks: (g: GameApi, s: string | undefined): Marks => (s === 'wynn' || (s === 'stone' && g.flag('holmLastRead')) ? { wynnHolm: '?' } : {}),
    walk: { from: { quests: { storySitting: 'done', [STRIDE]: 'done', [HOIST]: 'done', [FORTY]: 'done', [DROP]: 'done', [BASKETS]: 'done', [LAST]: 'wynn' }, flags: { holmPass: true, holmEnd: 'back' } } },
  },
};

// ================================================================ People

const SLATE = { skin: '#d8a882', hair: '#2a1a12', eyes: '#3a4a5a' };

export const WEATHERHOLMS: RegionContent = {
  id: 'weatherholms',
  items: [
    { id: 'ilse_droplog', name: 'Ilse Blewitt\'s isle log', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#e8e0c8' }, desc: 'Every night since midsummer: the big isle against the ridge, in feet and inches, signed I.B. The last line is underlined.' },
    { id: 'joan_reckoning', name: 'Joan Harrowgate\'s reckoning', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#f0e8d0' }, desc: 'Sums on the back of a survey sheet. "Six more and it comes down. J.H." Signed twice, the second time harder.' },
    { id: 'tally_copy', name: 'Delyth\'s copy of the stones', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bread', a: '#9a9a90' }, desc: 'Grey paper, charcoal, a lot of thumbprints. Strokes in rows, and sheep with legs too short.' },
    { id: 'holm_mark', name: 'The forty-second mark', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'pick', a: '#b8bcc4', b: '#6a4a2a' }, desc: 'Delyth Morgan\'s chisel. She cut one more stroke on the last stone with it, and gave it to you.' },
  ],
  npcs: [
    {
      id: 'gethin', name: 'Gethin Vane', title: 'Hoist foreman, Harrowgate & Daughters',
      look: { skin: '#c89a72', hair: '#5a4a3a', hairStyle: 0, beard: true, eyes: '#4a5a4a', tunic: '#5a4a3a', trim: '#e0b860', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#4a4a52', shoulderPads: '#4a3a2a', build: 1.1, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: foot(4.5, -2.5), face: [H.x, H.z], anim: 'idle' }],
      barks: ['Mind the posts.', 'Rope\'s fine. Rope\'s always fine.'],
      when: (g) => !!at(g, HOIST) || !!at(g, STRIDE),
    },
    {
      id: 'delyth', name: 'Delyth Morgan', title: 'Crew, the Weatherholm venture',
      look: { ...SLATE, hairStyle: 2, tunic: '#6a5a4a', trim: '#c8b890', trousers: '#4a4034', boots: '#2a1e14', cape: '#4a3a2a', hat: 'band', hatColor: '#7a2a24', lashes: true, freckles: true, build: 0.92, height: 0.97, age: 0.15 },
      schedule: [{ from: 0, to: 24, at: isle(3, 2.5), face: [I.x + 0.5, I.z + 0.5], anim: 'idle' }],
      barks: ['Forty-one.', 'Mind the cut.'],
      when: (g) => !!at(g, FORTY),
    },
    {
      id: 'marenHoist', name: 'Hilda Harrowgate', title: 'Partner, Harrowgate & Daughters',
      look: { skin: '#c89272', hair: '#4a2a18', hairStyle: 1, eyes: '#3a4a3a', tunic: '#4a4a52', trim: '#e0b860', trousers: '#2a2a30', boots: '#1a1614', cape: '#2a2a32', lashes: true, build: 0.95, height: 1.03, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: foot(6, 3), face: [H.x, H.z], anim: 'idle' }],
      when: (g) => !!at(g, BASKETS),
    },
    {
      id: 'wynnHolm', name: 'Wynn Carrow', title: 'Antiquarian',
      look: { skin: '#e2b894', hair: '#a8642e', hairStyle: 0, beard: true, eyes: '#4a6a4a', tunic: '#6a5a3a', trim: '#c8b070', trousers: '#4a4a3a', boots: '#3a2a1c', hat: 'cap', hatColor: '#4a5a3a', build: 0.9, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [TLAST[0] + 1.5, TLAST[1] + 1], face: TLAST, anim: 'idle' }],
      when: (g) => !!at(g, LAST),
    },
  ],
  dialogue: { gethin, delyth, marenHoist: hilda, wynnHolm },
  quests,
  readables: {
    hoistNotice: {
      title: 'Notice on the tower',
      body: 'HARROWGATE & DAUGHTERS\nTHE WEATHERHOLM VENTURE\n\nHands wanted for the basket and the bar. Two marks a day and board, paid weekly. Thirty baskets before the frost.\n\nNo claim of the Charter runs above the ground.\n\nH. Harrowgate',
      effect: (g) => { if (at(g, STRIDE) === 'hoist') g.setStage(STRIDE, 'done'); },
    },
    ilseGlass2: {
      title: 'Through Ilse\'s glass',
      body: 'The big isle, close enough to count the columns on it. Beside it, a timber tower as tall as the isle is high, with a plank walk from its top onto the grass.\n\nA basket goes down the middle of the tower as you watch, slowly. Something in it catches the light.',
      effect: (g) => { if (at(g, STRIDE) === 'glass') g.setStage(STRIDE, 'hoist'); },
    },
    holmT1: {
      title: 'The first stone',
      body: 'Forty-one strokes in rows of ten, and one left over.\n\nUnder them, pictures: a well being dug. A fire. A ram and nine ewes, with legs too short. A field with ropes coming off its edges, cut through.',
      effect: (g) => g.setFlag('holmT1', true),
    },
    holmT2: {
      title: 'The second stone',
      body: 'Strokes, then strokes crossed through in sevens: sixty-three at the most. Small figures holding the hands of tall ones. A row of short lines with a dot over each, too many to count at a glance.\n\nDown the whole edge of the stone, the same drawing again and again: a coil of rope, each coil a little bigger than the one before.',
      effect: (g) => g.setFlag('holmT2', true),
    },
    holmT3: {
      title: 'The third stone',
      body: 'The counts go down. Thirty. Twenty-two. Nine, cut deep.\n\nUnder the nine, the field drawn from the side, with a rope hanging from its edge all the way to the bottom of the stone.',
      effect: (g) => g.setFlag('holmT3', true),
    },
    holmLast: {
      title: 'The fourth stone',
      body: 'You lever it over. The underside is cleaner than the rest, kept from eight hundred years of weather.\n\nNine strokes. A rope, going down. At the bottom of the rope, five arches in a row.',
      effect: (g) => g.setFlag('holmLastRead', true),
    },
  },
  things: [
    { id: 'hoistNotice', x: foot(3, -3.5)[0], z: foot(3, -3.5)[1], label: 'Read the notice', radius: 2.4, read: 'hoistNotice' },
    // Ilse's glass at Scarth Watch (STARWATCH + 3.5, + 9.5 in places_regional; the Act I reading stands aside while this one is wanted)
    { id: 'ilseGlass2', x: 603.5, z: 1709.5, label: 'Look through the glass', radius: 2.4, read: 'ilseGlass2', when: (g) => at(g, STRIDE) === 'glass' },
    {
      id: 'hoistUp', x: H.x, z: H.z, y: H.ground, label: 'Ride the basket up', radius: 2.6,
      when: (g) => mayRide(g),
      use: (g) => {
        g.ride(H.up[0], H.up[1], H.up[2], 'The basket lurches, then climbs. The camp shrinks under you, and then the trees, and then you\'re level with the grass on the isle.');
        if (at(g, HOIST) === 'basket') g.setStage(HOIST, 'done');
      },
    },
    {
      id: 'hoistDown', x: H.up[0], z: H.up[2], y: H.top, label: 'Ride the basket down', radius: 2.4,
      when: (g) => mayRide(g),
      use: (g) => g.ride(H.down[0], H.down[1], H.down[2], 'Down the middle of the tower, the rope singing over the wheel.'),
    },
    { id: 'holmT1', x: T1[0], z: T1[1], y: I.top, label: 'Read the stone', radius: 2.2, read: 'holmT1', when: (g) => at(g, FORTY) === 'stones' || !!g.flag('holmT1') },
    { id: 'holmT2', x: T2[0], z: T2[1], y: I.top, label: 'Read the stone', radius: 2.2, read: 'holmT2', when: (g) => at(g, FORTY) === 'stones' || !!g.flag('holmT2') },
    { id: 'holmT3', x: T3[0], z: T3[1], y: I.top, label: 'Read the stone', radius: 2.2, read: 'holmT3', when: (g) => at(g, FORTY) === 'stones' || !!g.flag('holmT3') },
    { id: 'holmLast', x: TLAST[0], z: TLAST[1], y: I.top, label: 'Turn the fourth stone', radius: 2.2, read: 'holmLast', when: (g) => !!at(g, LAST) && at(g, LAST) !== 'wynn' },
    { id: 'holmCut', x: I.x + 0.5, z: I.z + 0.5, y: I.top, label: '', radius: 0, when: () => false },
    {
      id: 'holmStore', x: STORE[0], z: STORE[1], y: H.ground, label: 'Load a crate of crystal into the basket', radius: 2.6,
      when: (g) => at(g, BASKETS) === 'load' && loads(g) < 4,
      use: (g) => {
        const n = loads(g) + 1;
        g.setFlag('holmLoads', n);
        if (n === 4) g.quake(0.3);
        g.toast(n < 4 ? `Crate ${n} in the basket. Gethin pulls the cord twice, and it goes up.` : 'The last crate goes up. Somewhere above you, the isle settles like a dog lying down.');
      },
    },
  ],
  spawns: [
    { tag: 'footings', type: 'shardjelly', at: [foot(-3, -4), foot(-3, 4), foot(3, 5), foot(5, -4)], y: H.ground, when: (g) => at(g, HOIST) === 'footings' },
    { tag: 'keelJ', type: 'shardjelly', at: [isle(-3, 3), isle(-2, -4.5), isle(2, -4)], y: I.top, when: (g) => at(g, FORTY) === 'keel' },
    { tag: 'keel', type: 'keelglass', at: [[I.x + 0.5, I.z - 0.5]], y: I.top, when: (g) => at(g, FORTY) === 'keel' },
  ],
  hooks: (D) => {
    // VII: the Speaker has Ilse's letter (after the sitting, for saves that finished Act I before it existed too)
    hook(D, 'rhosyn', (g) => (at(g, 'storySitting') === 'done' && (!at(g, STRIDE) || at(g, STRIDE) === 'letter') ? 'wh_l1'
      : at(g, BASKETS) === 'speaker' ? 'wh_k1' : undefined), {
      ...rhosynLetter,
      wh_k1: { text: 'Hilda Harrowgate says the Charter has no claim above the ground. She\'s quite right. It never needed one.', next: 'wh_k2' },
      wh_k2: { speaker: 'narrator', text: 'Lowen Pike brings her the Charter roll. She reads the first line aloud: the Charter runs "to the counties, their lands and their roads".', next: 'wh_k3' },
      wh_k3: { text: 'Their lands. The Weatherholms were Ketley\'s fields before they were anybody\'s sky. They are land. Ketley is in the Charter.', next: 'wh_k4' },
      wh_k4: { text: 'So. The isles are the Charter\'s. The ring is to be left as it is. The crystal goes back up at the company\'s cost.', next: 'wh_k5' },
      wh_k5: { text: 'And the hoist is the Charter\'s, at a fair price, and runs at a mark a ride for anyone. Clerk, write that down before I think better of it.', effect: (g) => g.setStage(BASKETS, 'done') },
    });
    // VII and X: Ilse
    hook(D, 'ilse', (g) => (at(g, STRIDE) === 'ilse' ? 'wh_s1' : at(g, STRIDE) === 'glass' ? 'wh_sWait'
      : at(g, DROP) === 'proof' && !g.has('ilse_droplog') ? 'wh_d1' : at(g, DROP) === 'proof' && !g.has('joan_reckoning') ? 'wh_dWait' : undefined), ilseNodes);
    // X and XI: Joan
    hook(D, 'joan', (g) => (at(g, DROP) === 'proof' && !g.has('joan_reckoning') ? 'wh_j1' : at(g, DROP) === 'proof' ? 'wh_jWait'
      : at(g, BASKETS) === 'joan' ? 'wh_r1' : end(g) === 'joan' && at(g, BASKETS) === 'done' ? 'wh_rWait' : undefined), joanNodes);
    // Cai: his daughter's on the crew
    hook(D, 'cai', (g) => (at(g, FORTY) || at(g, HOIST) === 'basket' ? (at(g, LAST) === 'done' ? 'wh_hDone' : 'wh_hGirl') : undefined), {
      wh_hGirl: { text: 'My girl\'s up that rope. Delyth. Copying old stones, Gethin says. She was always drawing on things. Walls, mostly. Our walls.' },
      wh_hDone: { text: 'Delyth\'s home for a week and talks about nothing but a man called Wynn and some arches. I\'ve never been so pleased to be bored.' },
    });
  },
};
