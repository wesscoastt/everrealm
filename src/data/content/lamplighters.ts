import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';

// THE LAMPLIGHTERS: the second faction you can join (data/factions.ts; owner 2026-11-14, "next work on factions and
// questlines for them"). The Charter licenses them to light Ansbury\'s lamps by the second bell after sunset and put
// them out at first light. Their rules end "A lamplighter sees a great deal from a ladder. A lamplighter says nothing
// about any of it", and somebody has written under them, by hand: "Light the poor streets first" (data/lorebooks.ts).
// Their store is the open shed at the east end of the Shambles yard (world/sites.ts); Harrowgate & Daughters keep a
// bonded oil store at the west end, with the Light Fund\'s barrels in it, held against the Charter\'s arrears (the same
// barrels Wenna Hale signed for nine of and was given six: data/content/companions.ts).
//
// Chapters (each a rank):
//   lampBell     THE SECOND BELL (Carrier): carry the can on the Shambles round and light six lamps before the
//                second bell (between five and ten in the evening).
//   lampMeasure  SHORT MEASURE (Lamplighter): the Toll Office cuts the oil by a third and the poor streets are to
//                go dark. Kit Bawden would take the oil back off Harrowgate by ladder; Sam Penna says the licence
//                goes if they\'re caught. Take three casks from the bonded store at night, or get Clement Fry to show
//                you where the oil went and pin the page under the rules. Flag lampWay = 'ladder' | 'ledger'.
//   lampHand     THE WARDEN\'S HAND (Warden\'s Hand): Josiah Pike of the Toll Office comes to the store. Ladder: he
//                wants the thief named; you take it on yourself, or Kit does. Ledger: he wants the page down; you
//                trade it for the oil, or leave it up. Hester gives you the key ring. Flag lampEnd = 'took' | 'kit'
//                | 'deal' | 'stays'.

const BELL = 'lampBell', MEASURE = 'lampMeasure', HAND = 'lampHand';

/** The lamp store, the open shed at the Shambles' east end, and Harrowgate\'s bonded store at its west end. */
export const LAMP_STORE = { x0: 693, z0: 270, w: 7, d: 6 };
export const BONDED_STORE = { x0: 650, z0: 271, w: 7, d: 6 };
const HESTER = { x: 696.5, z: 273.2 }, KIT = { x: 694.2, z: 277.4 }, SAM = { x: 698.6, z: 276.6 };
/** The six lamps of the Shambles round, in the order a carrier walks them. */
export const ROUND: [number, number][] = [[652.5, 246.5], [676.5, 246.5], [699.5, 246.5], [699.5, 286.5], [686.5, 292.5], [662.5, 292.5]];
const RULES = { x: 671.5, z: 285.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const has = (g: GameApi, k: string) => !!g.flag(k);
const way = (g: GameApi) => g.flag('lampWay') as 'ladder' | 'ledger' | undefined;
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:lamplighters'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:lamplighters', r); };
/** Dusk to the second bell: when a round is walked. */
const dusk = (g: GameApi) => { const h = g.compHour(); return h >= 17 && h < 22; };
const night = (g: GameApi) => { const h = g.compHour(); return h >= 21 || h < 5; };
const lit = (g: GameApi) => ROUND.filter((_, i) => has(g, 'lampLit' + i)).length;

// ================================================================ Hester Vosper, the Lamp Warden

const hester: DialogueTree = {
  start: (g) => {
    const b = at(g, BELL), m = at(g, MEASURE), h = at(g, HAND);
    if (!b) return 'j1';
    if (b === 'round') return lit(g) >= ROUND.length ? 'b1' : 'roundWait';
    if (b !== 'done') return 'idle';
    if (!m) return 'm1';
    if (m === 'choose') return 'c1';
    if (m === 'back') return way(g) === 'ladder' ? 'mL1' : 'mG1';
    if (m !== 'done') return 'mWait';
    if (!h) return 'h1';
    if (h === 'back') return 'e1';
    return 'idle';
  },
  nodes: {
    idle: {
      text: (g) => {
        const r = g.flag('fac:lamplighters');
        if (r === 2) return 'Your round tonight is Tanners\' Row and the Pent. Light them first. You know why.';
        if (r === 1) return 'Wicks trimmed, glass cleaned, oil counted. Then the rest.';
        return 'Can\'s by the door. Mind the drip on your boots: it doesn\'t come out.';
      },
    },
    // I. The Second Bell
    j1: { text: 'You\'re standing in my light.', next: 'j2' },
    j2: { speaker: 'narrator', text: 'A broad woman in a leather apron, trimming a wick with a knife no longer than her thumb. Ladders lean on the wall behind her, eight of them, each with a name burnt into the top rung.', next: 'j3' },
    j3: { text: 'Hester Vosper. I keep the lamps in this town, which means I keep eleven people who carry oil up ladders in the dark and come down again with all their fingers. Mostly.', next: 'j4' },
    j4: {
      text: 'I\'m a carrier short. Davy Rowe went to the Muster for better money, and I hope a horse sits on him. Can you carry a can and climb a ladder?',
      options: [
        { text: 'I can.', next: 'j5' },
        { text: 'What does it pay?', next: 'jPay' },
        { text: 'Not tonight.' },
      ],
    },
    jPay: { text: 'A shilling a round from the Charter, which is an insult, and the Charter\'s thanks, which is a smaller one. Most of us do it for the view.', next: 'j5' },
    j5: { text: 'The Shambles round. Six lamps round the yard, from the north-west corner and back by the fountain. Trim, light, close the glass.', next: 'j5b' },
    j5b: { text: 'Every one lit by the second bell, which is ten o\'clock, or the watch writes it down and I hear about it.', next: 'j6' },
    j6: { text: 'Go at dusk. Not before. Lamps lit in daylight are oil the Charter says we stole, and they\'re right.', next: 'j7' },
    j7: {
      speaker: 'narrator', text: 'She hands you a can with a long spout and a pole with a hook and a wick-holder on the end. The can is half full and smells of fish.',
      effect: (g) => { g.setStage(BELL, 'round'); for (let i = 0; i < ROUND.length; i++) g.setFlag('lampLit' + i, undefined); },
    },
    roundWait: { text: (g) => (lit(g) ? `${lit(g)} of six. The rest won\'t light themselves. Believe me, I\'ve waited.` : 'Dusk, then the round. Six lamps. North-west corner first.') },
    b1: { text: 'Six. And the glass closed on all of them, which is more than Davy ever managed.', next: 'b2' },
    b2: { text: 'Sit down a minute. Every carrier gets the rules read to them once, and then they\'re a carrier.', next: 'b3' },
    b3: { speaker: 'narrator', text: 'She doesn\'t read them. She knows them, the way you know a prayer.', next: 'b4' },
    b4: { text: 'Every lamp lit by the second bell. Every lamp out at first light. The oil is the Charter\'s. The keys are the Company\'s. And a lamplighter sees a great deal from a ladder, and says nothing about any of it.', next: 'b5' },
    b5: {
      text: 'You\'ll have read the board by the fountain, and seen what\'s written under it in chalk.',
      options: [
        { text: '"Light the poor streets first." Who wrote it?', next: 'b6' },
        { text: 'I didn\'t look.', next: 'b6b' },
      ],
    },
    b6: { text: 'Nobody. Every Monday the Toll Office sends a boy to wash it off, and every Tuesday nobody writes it again.', next: 'b7' },
    b6b: { text: 'Look tomorrow. Then don\'t ask me about it.', next: 'b7' },
    b7: {
      text: 'You\'re a carrier. Come and see me when your back stops aching. There\'s more to this than the Shambles.',
      effect: (g) => { g.setStage(BELL, 'done'); rank(g, 0); g.addMarks(25); g.give('lamp_pole', 1); },
    },
    // II. Short Measure
    m1: { text: 'Good. You\'re here. Read that.', next: 'm2' },
    m2: { speaker: 'narrator', text: 'A printed slip from the Toll Office: from the first of the month, the lamplighters\' oil is cut by a third, "in consideration of the Charter\'s present obligations". It is signed J. Pike.', next: 'm3' },
    m3: { text: 'A third. That\'s three streets. And Mr Pike has kindly sent a list of which: Tanners\' Row, the Pent and Cobb Lane.', next: 'm3b' },
    m3b: { text: 'The Guild Ward stays lit. The keep square stays lit. Harrowgate\'s house on East Avenue stays lit, because that\'s where the obligations are.', next: 'm4' },
    m4: { text: 'Tanners\' Row has two hundred people in it and a gutter you could lose a child in. I\'m not putting it out.', next: 'm5' },
    m5: {
      text: 'Kit has an idea about it. Kit always has an idea. Go and let him tell you, and then come back and tell me what you think, because I\'ve heard his and I want somebody else\'s.',
      effect: (g) => g.setStage(MEASURE, 'kit'),
    },
    mWait: { text: (g) => (at(g, MEASURE) === 'kit' ? 'Kit\'s by the ladders, being clever at somebody. Go on.' : at(g, MEASURE) === 'ladder' ? 'At night, quietly, and bring it here. Not your house. Here.' : at(g, MEASURE) === 'clement' ? 'Clement Fry drinks at the Charter Arms. He counts for a living and drinks so he can stop.' : at(g, MEASURE) === 'board' ? 'Pin it under the rules. Where the chalk goes.' : at(g, MEASURE) === 'pour' ? 'Kit\'s waiting for those casks.' : '') },
    c1: { text: 'Well? You\'ve heard Kit. You\'ve heard Sam, because Sam makes sure everybody hears him.', next: 'c2' },
    c2: {
      text: 'So. Do we take it back, or do we find out where it went?',
      options: [
        { text: 'Kit\'s right. It\'s the Light Fund\'s oil. We take it back by ladder.', effect: (g) => { g.setFlag('lampWay', 'ladder'); g.setStage(MEASURE, 'ladder'); }, next: 'cL' },
        { text: 'Sam\'s right. Find out where it went, and make them say it out loud.', effect: (g) => { g.setFlag('lampWay', 'ledger'); g.setStage(MEASURE, 'clement'); }, next: 'cG' },
      ],
    },
    cL: { text: 'Then tonight, after the second bell. Up the back of the bonded store, in by the loft, three casks and no more. Three is what they took. If you take four you\'re a thief, and I don\'t employ thieves.', next: 'cL2' },
    cL2: { text: 'Bring them to Kit. And if the watch sees you, you\'ve never heard of me, and I\'ll be very sorry to hear what happened to you.' },
    cG: { text: 'Clement Fry keeps the Toll Office\'s book. He\'s a decent man who has spent fifteen years writing down things he doesn\'t like. He drinks at the Charter Arms.', next: 'cG2' },
    cG2: { text: 'Ask him where the oil goes after it leaves his ledger. Ask him nicely. He\'s been waiting for somebody to.' },
    mL1: { text: 'Three casks, in the store, under a tarpaulin with my name on it. Kit\'s pleased with himself. That\'ll last a week.', next: 'mL2' },
    mL2: { text: 'Tanners\' Row was lit last night. I walked down it at midnight. A woman was sitting on her step with a baby, in the light, doing nothing at all, because she could.', next: 'mDone' },
    mG1: { text: 'I read it on the way here. Everybody in the Shambles has read it. There was a crowd round the fountain at noon, and a man from the Guild Ward pretending not to be in it.', next: 'mG2' },
    mG2: { text: '"Lamp oil, Ansbury, one third: to Harrowgate & Daughters, for the Company Wardens\' lanterns." Our oil, lighting the men who walk Tanners\' Row with sticks. Well. Now everyone knows it.', next: 'mDone' },
    mDone: {
      text: 'You\'re a lamplighter. Not a carrier any more: a lamplighter, with a ladder of your own. Sam will burn your name into it. Badly.',
      effect: (g) => { g.setStage(MEASURE, 'done'); rank(g, 1); g.addMarks(60); },
    },
    // III. The Warden\'s Hand
    h1: { text: 'Mr Pike is coming. Himself, not a boy. Tomorrow, at dusk, to the store, "to count the Charter\'s oil".', next: 'h2' },
    h2: { text: (g) => (way(g) === 'ladder' ? 'Harrowgate counted their casks. They\'re three short. And our store has three more in it than the Charter gave us. Pike can count too.' : 'He wants the page down off the board. He wants it more than he wants anything, which tells you what it\'s worth.'), next: 'h3' },
    h3: { text: 'I\'d like you there. You started this. And I\'d like to see what you do, because when I\'m gone somebody has to hold the keys, and it isn\'t going to be Kit.', effect: (g) => g.setStage(HAND, 'pike') },
    e1: { text: (g) => ({
      took: 'Struck off the roll. Your name on the Toll Office\'s list of persons not to be licensed, in Pike\'s best hand. It\'s a short list. You\'re in good company: the last name on it is mine, from twenty years ago.',
      kit: 'Kit\'s gone to his sister\'s in Kelderby. He left his ladder. He said to give it to whoever we take on next, and to tell them which rung creaks.',
      deal: 'The oil came this morning. All of it. The page came down this afternoon, and the chalk went up again tonight, and nobody washed it off.',
      stays: 'The page is still up. Pike\'s oil still isn\'t coming. And last night every house on Tanners\' Row put a candle in the window, and the Pent did, and Cobb Lane, and you could see the whole of the lower town from the keep.',
    } as Record<string, string>)[String(g.flag('lampEnd'))] ?? 'Well.', next: 'e2' },
    e2: { speaker: 'narrator', text: 'She takes a ring of keys off her belt. Brass, iron, one of them silver-grey with age. There must be a hundred.', next: 'e3' },
    e3: { text: 'Every lamp box in Ansbury. I\'ve had them thirty-one years. My hands want a rest and my knees want a longer one.', next: 'e4' },
    e4: { text: 'Warden\'s Hand. It means you carry these when I can\'t, and you choose which streets go first. You know which.', next: 'e5' },
    e5: {
      text: 'Light the poor streets first.',
      effect: (g) => { g.setStage(HAND, 'done'); rank(g, 2); g.addMarks(150); g.give('lamp_keys', 1); },
    },
  },
};

// ================================================================ Kit Bawden and Sam Penna

const kit: DialogueTree = {
  start: (g) => (at(g, MEASURE) === 'kit' ? 'k1' : at(g, MEASURE) === 'pour' ? 'p1' : 'idle'),
  nodes: {
    idle: { text: (g) => (g.flag('lampEnd') === 'kit' ? 'I\'m off soon. Sam\'s got my ladder.' : 'Twelve lamps tonight. I could do twenty. Hester won\'t let me.') },
    k1: { text: 'She told you? A third. And the list. Of course there\'s a list.', next: 'k2' },
    k2: { text: 'Here\'s what nobody in the Toll Office knows. Harrowgate\'s bonded store, the shed at the other end of the yard: there\'s forty casks of lamp oil in it, with the Light Fund\'s mark on the lids. Charter oil. Bought with the town\'s own money for the town\'s own lamps, and "held against arrears".', next: 'k3' },
    k3: { text: 'Its loft has a hatch. The hatch has a bolt. The bolt is on the inside, and I happen to know it\'s been broken since the frost.', next: 'k4' },
    k4: { text: 'We go up after the second bell, we take back three, which is exactly what they took off us, and nobody\'s lamp goes out. That\'s not theft. That\'s arithmetic.', next: 'k5' },
    k5: {
      text: 'Sam\'ll tell you it\'s madness. Sam thinks everything\'s madness. Go and let him, then go and tell Hester I\'m right.',
      effect: (g) => g.setFlag('lampHeardKit', true),
    },
    p1: { text: 'Three! Hand them up. Careful, careful. There.', next: 'p2' },
    p2: { speaker: 'narrator', text: 'He rolls them under the bench and throws a tarpaulin over them, then sits on it, grinning, as if he\'d lit the whole town himself.', next: 'p3' },
    p3: {
      text: 'Tanners\' Row tonight. And the Pent. Go and tell Hester. Tell her it was arithmetic.',
      // (the casks only come out of the bonded store, so whoever's at this stage has them)
      effect: (g) => { g.take('bonded_oil', g.count('bonded_oil')); g.setStage(MEASURE, 'back'); },
    },
  },
};

const sam: DialogueTree = {
  start: (g) => (at(g, MEASURE) === 'kit' ? 's1' : 'idle'),
  nodes: {
    idle: { text: 'Third rung from the top on Kit\'s ladder. It creaks. One day it won\'t creak.' },
    s1: { text: 'He\'s told you about the hatch. He tells everybody about the hatch. One day he\'ll tell the wrong person and that\'ll be the end of it.', next: 's2' },
    s2: { text: 'Here\'s the thing about a licence. It\'s a piece of paper in Mr Pike\'s drawer. If he takes it out and tears it, there are no lamplighters in Ansbury. Not on Tanners\' Row, not anywhere. The Charter will give the lamps to Harrowgate\'s wardens, and they\'ll light them where they like.', next: 's3' },
    s3: { text: 'I\'ve been up a ladder forty years. I\'ve seen a man killed for a purse on Cobb Lane and said nothing, because saying something would have cost the whole town its light. That\'s the rule. It\'s not a nice rule. It works.', next: 's4' },
    s4: {
      text: 'If you want that oil back, find out where it went and make them say it. Clement Fry keeps the book. A thing written down is harder to put out than a lamp.',
      effect: (g) => { g.setFlag('lampHeardSam', true); if (has(g, 'lampHeardKit')) g.setStage(MEASURE, 'choose'); },
    },
  },
};

// ================================================================ Josiah Pike, Clerk of the Toll Office

const pike: DialogueTree = {
  start: () => 'p1',
  nodes: {
    p1: { speaker: 'narrator', text: 'A thin man in a black coat, standing in the middle of the store with his hands behind his back, as if touching anything might commit him to it.', next: 'p2' },
    p2: { text: (g) => (way(g) === 'ladder' ? 'Josiah Pike. Toll Office. I have here Harrowgate & Daughters\' count of their bonded store, three casks short, and the Charter\'s count of your oil, which is three casks long. I am not a clever man, but I can add.' : 'Josiah Pike. Toll Office. There is a page of my ledger pinned to a public board in the Shambles. I would like to know how it got out of my ledger.'), next: 'p3' },
    p3: { text: (g) => (way(g) === 'ladder' ? 'Somebody went up a ladder. Name them to me, and the licence stays in my drawer. Don\'t, and I tear it, and this town is lit by Harrowgate\'s wardens from tomorrow.' : 'I don\'t much care who took it. I care that it comes down. A ledger is not a broadside.'), next: 'p4' },
    p4: {
      text: (g) => (way(g) === 'ladder' ? 'Well?' : 'Well?'),
      options: [
        { text: 'It was me. Nobody else.', cond: (g) => way(g) === 'ladder', effect: (g) => { g.setFlag('lampEnd', 'took'); g.setStage(HAND, 'back'); }, next: 'took1' },
        { text: '(Say nothing, and look at Kit.)', cond: (g) => way(g) === 'ladder', effect: (g) => { g.setFlag('lampEnd', 'kit'); g.setStage(HAND, 'back'); }, next: 'kit1' },
        { text: 'Send the oil back, all of it, and it comes down tonight.', cond: (g) => way(g) === 'ledger', effect: (g) => { g.setFlag('lampEnd', 'deal'); g.setStage(HAND, 'back'); }, next: 'deal1' },
        { text: 'It stays up. Ask the town what it thinks of your arithmetic.', cond: (g) => way(g) === 'ledger', effect: (g) => { g.setFlag('lampEnd', 'stays'); g.setStage(HAND, 'back'); }, next: 'stays1' },
      ],
    },
    took1: { text: 'You. Hm. A new face. You haven\'t a ladder of your own, I suppose? No.', next: 'took2' },
    took2: { text: 'Struck off, then, by my hand, and the licence stays where it is. The oil goes back to Harrowgate.', next: 'took3' },
    took3: { speaker: 'narrator', text: 'He writes your name in a small black book, blots it, and puts the book away. On his way out he stops by the door and says, not quite to anyone, that the Toll Office\'s oil order for next month has a clerical error in it, and will be a third larger than it ought to be. Then he goes.' },
    kit1: { speaker: 'narrator', text: 'Kit is on his feet before anyone can stop him.', next: 'kit2' },
    kit2: { as: 'kit_bawden', text: 'Me. It was me. It was arithmetic, and I\'d do it again.', next: 'kit3' },
    kit3: { text: 'I don\'t doubt it. Struck off, Mr Bawden. You won\'t carry a can in Ansbury again. The licence stays where it is.', next: 'kit4' },
    kit4: { speaker: 'narrator', text: 'Hester says nothing. Sam says nothing. When Pike has gone, Kit takes his name off his ladder with his knife, slowly, and hands the knife to you.' },
    deal1: { text: 'All of it. Hm. You understand I can\'t be seen to give way to a market board.', next: 'deal2' },
    deal2: { text: 'There will be a clerical error in next month\'s order, then. These things happen. And the page comes down tonight, and I never see it again.', next: 'deal3' },
    deal3: { speaker: 'narrator', text: 'He shakes your hand as if he were signing something, and leaves.' },
    stays1: { text: 'The town. The town thinks what it\'s told.', next: 'stays2' },
    stays2: { speaker: 'narrator', text: 'Hester laughs, once, which you have never heard her do. Pike looks at her, then at you, then at the shed\'s open front, where three people from the Shambles have stopped to listen and aren\'t pretending otherwise.', next: 'stays3' },
    stays3: { text: 'We\'ll see.' },
  },
};

// ================================================================ Clement Fry\'s ledger (hooked onto his talk in the Charter Arms)

const clementNodes: DialogueTree['nodes'] = {
  lmp1: { text: 'The lamp oil. Yes. I wondered when somebody would ask.', next: 'lmp2' },
  lmp2: { speaker: 'narrator', text: 'He looks round the taproom, then takes a folded page out of his coat, as if he\'d been carrying it about for months for exactly this.', next: 'lmp3' },
  lmp3: { text: 'I copied it. I copy everything I don\'t like. My wife says it\'s a sickness. Lamp oil, Ansbury: two thirds to the lamplighters\' store, one third to Harrowgate & Daughters, "for the Company Wardens\' lanterns". Mr Pike initialled it.', next: 'lmp4' },
  lmp4: {
    text: 'If anybody asks, I was in here all evening, and you took it out of my coat while I was in the yard.',
    effect: (g) => { g.give('oil_ledger_page', 1); g.setStage(MEASURE, 'board'); },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [BELL]: {
    id: BELL, name: 'The Second Bell', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'round' ? 'Hester Vosper, the Lamp Warden, has given me a can and a pole and the Shambles round: six lamps round the market yard, lit between dusk and the second bell.' : s === 'done' ? 'I lit the Shambles round, and Hester told me the rules. I\'m a carrier of the Lamplighters.' : ''),
    objectives: (g, s) => {
      if (s !== 'round') return [];
      if (lit(g) >= ROUND.length) return [{ text: 'Go back to Hester Vosper at the lamp store', marker: 'hester_vosper' }];
      const next = ROUND.findIndex((_, i) => !has(g, 'lampLit' + i));
      return [{ text: `Light the lamps of the Shambles round at dusk (${lit(g)}/6)`, marker: 'lampRound' + next }];
    },
    marks: (g, s): Marks => (!s ? { hester_vosper: '!' } : s === 'round' && lit(g) >= ROUND.length ? { hester_vosper: '?' } : {}),
    walk: { cast: ['hester_vosper'] },
  },
  [MEASURE]: {
    id: MEASURE, name: 'Short Measure', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => ({
      kit: 'The Toll Office has cut the lamplighters\' oil by a third, and Tanners\' Row, the Pent and Cobb Lane are to go dark. Hester wants me to hear Kit Bawden and Sam Penna out, then tell her what I think.',
      choose: 'Kit wants the oil taken back from Harrowgate\'s bonded store by ladder. Sam says find out where it went and make them say it. Hester wants my answer.',
      ladder: 'Three casks of the Light Fund\'s oil, out of Harrowgate\'s bonded store at the west end of the Shambles, after dark. No more than three.',
      pour: 'I have the three casks. Kit is waiting for them at the lamp store.',
      clement: 'Clement Fry keeps the Toll Office\'s book and drinks at the Charter Arms. I\'m to ask him where the lamp oil goes.',
      board: 'Clement gave me a copy of the ledger page: a third of the lamp oil goes to Harrowgate, for the Company Wardens. I\'m to pin it under the lamplighters\' rules by the fountain.',
      back: 'It\'s done. Tanners\' Row is lit. I should tell Hester.',
      done: way(g) === 'ladder' ? 'We took three casks back off Harrowgate, and the poor streets were lit. Hester made me a lamplighter.' : 'I pinned Pike\'s own ledger page under the rules, and all of Ansbury read where the oil went. Hester made me a lamplighter.',
    } as Record<string, string>)[s ?? ''] ?? '',
    objectives: (g, s) => {
      if (s === 'kit') return [
        { text: 'Hear out Kit Bawden', done: has(g, 'lampHeardKit'), marker: 'kit_bawden' },
        { text: 'Hear out Sam Penna', done: has(g, 'lampHeardSam'), marker: 'sam_penna' },
      ];
      if (s === 'choose' || s === 'back') return [{ text: 'Talk to Hester Vosper', marker: 'hester_vosper' }];
      if (s === 'ladder') return [{ text: 'At night, take three casks from Harrowgate\'s bonded store', marker: 'lampBonded' }];
      if (s === 'pour') return [{ text: 'Bring the casks to Kit Bawden', marker: 'kit_bawden' }];
      if (s === 'clement') return [{ text: 'Ask Clement Fry where the oil goes (the Charter Arms)', marker: 'clement' }];
      if (s === 'board') return [{ text: 'Pin the ledger page under the lamplighters\' rules', marker: 'lampRules' }];
      return [];
    },
    advance: (g, s) => (s === 'kit' && has(g, 'lampHeardKit') && has(g, 'lampHeardSam') ? 'choose' : null),
    marks: (g, s): Marks => (!s ? (done(g, BELL) ? { hester_vosper: '!' } : {}) : s === 'kit' ? { ...(has(g, 'lampHeardKit') ? {} : { kit_bawden: '?' }), ...(has(g, 'lampHeardSam') ? {} : { sam_penna: '?' }) } : s === 'choose' || s === 'back' ? { hester_vosper: '?' } : s === 'pour' ? { kit_bawden: '?' } : s === 'clement' ? { clement: '?' } : {}),
    // (the bonded store only opens after dark, which the walker can't wait for: it takes the casks as given)
    walk: { from: { quests: { [BELL]: 'done' }, flags: { 'fac:lamplighters': 0 } }, cast: ['kit_bawden', 'sam_penna', 'clement'], auto: { ladder: 'pour' } },
  },
  [HAND]: {
    id: HAND, name: 'The Warden\'s Hand', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'pike' ? 'Josiah Pike of the Toll Office is coming to the lamp store at dusk to count the oil. Hester wants me there.' : s === 'back' ? 'Pike has been and gone. Hester is waiting.' : s === 'done' ? 'Hester gave me her ring of keys: every lamp box in Ansbury. I\'m the Warden\'s Hand.' : ''),
    objectives: (g, s) => (s === 'pike' ? [{ text: 'Meet Josiah Pike at the lamp store, at dusk', marker: 'josiah_pike' }] : s === 'back' ? [{ text: 'Talk to Hester Vosper', marker: 'hester_vosper' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, MEASURE) ? { hester_vosper: '!' } : {}) : s === 'pike' ? { josiah_pike: '?' } : s === 'back' ? { hester_vosper: '?' } : {}),
    walk: { from: { quests: { [BELL]: 'done', [MEASURE]: 'done' }, flags: { 'fac:lamplighters': 1, lampWay: 'ladder' } }, cast: ['josiah_pike'] },
  },
};

// ================================================================ Things in the yard

const things: WorldThing[] = [
  ...ROUND.map(([x, z], i): WorldThing => ({
    id: 'lampRound' + i, x, z, label: 'Trim and light the lamp', radius: 2.2, look: 'glint',
    when: (g) => at(g, BELL) === 'round' && !has(g, 'lampLit' + i),
    use: (g) => {
      if (!dusk(g)) { g.toast(g.compHour() < 17 ? 'Not yet. A lamp lit in daylight is oil the Charter calls stolen. Come back at dusk.' : 'The second bell has gone. Come back tomorrow at dusk.'); return; }
      g.setFlag('lampLit' + i, true);
      g.toast(lit(g) >= ROUND.length ? 'The last lamp catches. The whole yard is lit.' : ['The wick takes, and the glass closes on it.', 'A little smoke, then a steady flame.', 'You hook the glass shut. It ticks as it warms.'][i % 3]);
    },
  })),
  {
    id: 'lampBonded', x: BONDED_STORE.x0 + 3.5, z: BONDED_STORE.z0 + 2.5, label: 'Climb in by the loft hatch', radius: 2.6, look: 'glint',
    when: (g) => at(g, MEASURE) === 'ladder',
    use: (g) => {
      if (!night(g)) { g.toast('Not with the yard full of people. After the second bell.'); return; }
      if (!g.give('bonded_oil', 3)) { g.toast('You have no room to carry them.'); return; }
      g.setStage(MEASURE, 'pour');
      g.toast('Up the back, in by the hatch, the bolt as broken as Kit said. Forty casks with the Light Fund\'s mark on the lids. You take three, and only three, and lower them down on the rope.');
    },
  },
  {
    id: 'lampRules', x: RULES.x, z: RULES.z, label: 'Pin the ledger page under the rules', radius: 2.4, look: 'glint',
    when: (g) => at(g, MEASURE) === 'board',
    use: (g) => {
      if (!g.take('oil_ledger_page', 1)) return;
      g.setStage(MEASURE, 'back');
      g.toast('You pin it where the chalk goes. By the time you\'ve crossed the yard, a woman with a basket has stopped to read it, and called her neighbour over.');
    },
  },
];

// ================================================================ People and things

const LOOK_HESTER = { frame: 'f' as const, skin: '#d8a882', hair: '#8a8580', hairStyle: 2, eyes: '#3a4a2a', tunic: '#4a3a2a', trim: '#e0a040', trousers: '#2a2622', boots: '#1e1a16', apron: true, gloves: '#3a2a1e', lashes: true, build: 1.12, age: 0.62 };
const LOOK_KIT = { skin: '#e2b894', hair: '#c86a2a', hairStyle: 3, eyes: '#4a6a3a', tunic: '#5a4a32', trim: '#e0a040', trousers: '#3a3430', boots: '#2a1e14', freckles: true, build: 0.86, age: 0.18, hat: 'cap' as const, hatColor: '#3a2a1e' };
const LOOK_SAM = { skin: '#c8956a', hair: '#cfcac0', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#3a3a32', trim: '#e0a040', trousers: '#2a2a26', boots: '#1e1a16', build: 1.0, age: 0.82 };
const LOOK_PIKE = { skin: '#e8c4a0', hair: '#2a2420', hairStyle: 1, eyes: '#3a3a42', tunic: '#141418', trim: '#5a5a62', trousers: '#141418', boots: '#0e0e10', build: 0.82, height: 1.06, age: 0.5, hat: 'wide' as const, hatColor: '#141418' };

const NPCS_L: NpcDef[] = [
  { id: 'hester_vosper', name: 'Hester Vosper', title: 'Lamp Warden', look: LOOK_HESTER, schedule: [{ from: 0, to: 24, at: [HESTER.x, HESTER.z], face: [HESTER.x - 4, HESTER.z], anim: 'idle' }], barks: ['Wicks trimmed.', 'Mind the drip.'] },
  { id: 'kit_bawden', name: 'Kit Bawden', title: 'Carrier, the Lamplighters', look: LOOK_KIT, schedule: [{ from: 0, to: 24, at: [KIT.x, KIT.z], face: [KIT.x - 4, KIT.z], anim: 'idle' }], barks: ['Arithmetic.', 'I could do twenty.'], when: (g) => !(at(g, HAND) === 'done' && g.flag('lampEnd') === 'kit') },
  { id: 'sam_penna', name: 'Sam Penna', title: 'Ladderman, the Lamplighters', look: LOOK_SAM, schedule: [{ from: 0, to: 24, at: [SAM.x, SAM.z], face: [SAM.x - 4, SAM.z], anim: 'idle' }], barks: ['Third rung creaks.'] },
  { id: 'josiah_pike', name: 'Josiah Pike', title: 'Clerk of the Toll Office', look: LOOK_PIKE, schedule: [{ from: 0, to: 24, at: [HESTER.x - 2.2, HESTER.z + 1.2], face: [HESTER.x, HESTER.z], anim: 'idle' }], when: (g) => at(g, HAND) === 'pike' },
];

const ITEMS_L: ItemDef[] = [
  { id: 'lamp_pole', name: 'Lighting pole', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'log', a: '#6a4a2a', b: '#e0a040' }, desc: 'Ash, eight feet long, with a brass hook for the glass and a wick-holder at the tip. Every Ansbury carrier is given one, and most of them keep it.' },
  { id: 'bonded_oil', name: 'Cask of Light Fund oil', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'gel', a: '#c8a050' }, desc: 'A small cask of lamp oil with the Light Fund\'s mark burnt into the lid, and Harrowgate\'s bond stamp beside it.' },
  { id: 'oil_ledger_page', name: 'Copied ledger page', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8dcc0' }, desc: 'In Clement Fry\'s neat hand: "Lamp oil, Ansbury: two thirds to the lamplighters\' store, one third to Harrowgate & Daughters, for the Company Wardens\' lanterns." Initialled J.P.' },
  { id: 'lamp_keys', name: 'The Lamp Warden\'s keys', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'coin', a: '#c8a050', b: '#8a8a92' }, desc: 'Brass, iron and one silver-grey with age: a key to every lamp box in Ansbury, on a ring worn smooth by thirty-one years of Hester Vosper\'s belt.' },
];

export const LAMPLIGHTERS: RegionContent = {
  id: 'lamplighters',
  items: ITEMS_L,
  npcs: NPCS_L,
  dialogue: { hester_vosper: hester, kit_bawden: kit, sam_penna: sam, josiah_pike: pike },
  quests,
  things,
  hooks: (D) => {
    // Clement Fry, at the Charter Arms, has the copy in his coat
    const c = D.clement;
    if (!c) return;
    const s0 = c.start;
    c.start = (g) => (at(g, MEASURE) === 'clement' ? 'lmp1' : typeof s0 === 'function' ? s0(g) : s0);
    Object.assign(c.nodes, clementNodes);
  },
};
