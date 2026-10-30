import type { DialogueTree, GameApi } from '../../game/api';
import { at, hook, addOption, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { ShopDef } from '../shops';

// THE WAITS OF ANSBURY: the town's musicians, and the first faction you can join (data/factions.ts).
//
// The Charter pays six Waits to play the hours from the bandstand on the Green at dawn and dusk, walk in front
// of the Speaker at a sitting, and play whatever else the town needs. They keep the Great Book of the
// counties' tunes in the Waits' House on the north side of the Charter Green. Twelve years ago the
// Collegium borrowed the Book to copy and sent it back thirty pages short.
//
// Chapters (quest ids, each a rank): waitsAudition (Apprentice), waitsBook (Journeyman: the tunes
// still sung at Kelderby, on the Gullmouth quay and at Fellers' Camp, each giving an instrument),
// waitsMoor (Wait: the oldest page, five dots "from the moor", and a bone whistle in Carne Barrow),
// waitsSitting (Senior Wait: the Charter means to cut the wage; play Amos Hollis's ballad on the keep
// steps, or the Speaker's March) and waitsHours (Wait of the Hours: play the hours at dawn on the Green).
// Ending flag: waitsEnd = 'ballad' (the wage is cut; the town sings it) | 'march' (the wage stands).
// Tunes learnt are flags "tune:<id>"; a tune played through sets "played:<tune>" and
// "played:<tune>@<spot>" (game/Stage.ts SPOTS), and at dawn "played:<tune>@<spot>:dawn".

const A = 'waitsAudition', BOOK = 'waitsBook', MOOR = 'waitsMoor', SIT = 'waitsSitting', HOURS = 'waitsHours';

// Where things are (world/sites.ts: the Waits' House and the bandstand in buildNewTown, Carne Barrow)
export const WAITS_HOUSE = { x0: 680, z0: 368, w: 15, d: 11 };
const STAGE = { x: 687.5, z: 369.8 }; // on the low stage at the back of the hall
const CUPBOARD = { x: 693.4, z: 373 };
const LECTERN = { x: 682.5, z: 372.5 };
export const BANDSTAND = { x: 659.5, z: 414.5 };
export const CARNE = { x: 470, z: 3050 };
/** The barrow's passage and chamber floor (the moor is about this high there). */
export const CARNE_FLOOR = 46;
const AMOS = { x: 812.5, z: 341.5 };
const GULL_X = 1744.5; // Bet Polglase, on the quay street (GULL.coast - 40: content imports types only)

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const has = (g: GameApi, k: string) => !!g.flag(k);
const end = (g: GameApi) => g.flag('waitsEnd') as 'ballad' | 'march' | undefined;
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:waits'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:waits', r); };

// ================================================================ Tabitha Gant, Master of the Waits

const tabithaNodes: DialogueTree['nodes'] = {
  idle: {
    text: (g) => {
      const r = g.flag('fac:waits');
      if (typeof r !== 'number') return 'If you\'re here for the gurdy, Roley\'s in the cupboard. If you\'re here for me, I\'m busy.';
      if (r >= 4) return 'You were on the steps this morning? Good. The bakers noticed.';
      return 'Practise. Then practise the bit you think you know.';
    },
  },
  // I. The Audition
  a1: { text: 'An apprentice? Sit. No, the other bench. That one\'s Roley\'s, and he\'s particular about it.', next: 'a2' },
  a2: { text: 'The Charter pays six Waits to play the hours on the Green, walk in front of the Speaker, and play whatever else the town needs played.', next: 'a2b' },
  a2b: { text: 'We\'re five. You\'d be the sixth, if you can do it.', next: 'a3' },
  a3: { speaker: 'narrator', text: 'She takes a tin whistle down off a nail and wipes the mouthpiece on her sleeve.', next: 'a4' },
  a4: { text: 'This is "Lady Day". Every apprentice learns it first, because a wrong note in it stands out like a cow in church. Listen.', next: 'a5' },
  a5: { speaker: 'narrator', text: 'She plays it through once, eight bars, without looking at her fingers.', next: 'a6' },
  a6: {
    text: 'Now take it out to the bandstand on the Green and play it through, start to finish. I\'ll hear you from here. So will the whole street.',
    options: [
      { text: 'I\'ll play it.', effect: (g) => { g.give('inst_whistle'); g.setFlag('tune:ladyday', true); g.setStage(A, 'play'); } },
      { text: 'What do the Waits actually do?', next: 'a7' },
      { text: 'Not today.' },
    ],
  },
  a7: { text: 'Play. Dawn and dusk from the bandstand, so Ansbury knows the hour. Sittings, weddings, a hanging once, which I don\'t recommend. Mostly we stand in the rain and get paid late.', next: 'a6' },
  aWait: { text: 'The bandstand\'s on the Green, west of the statue. Take the whistle out and play "Lady Day" through. I\'ll know if you stop halfway.' },
  aBack: { text: 'I heard you. You came in a beat early on the second line, and you didn\'t stop to apologise. That\'s the right instinct.', next: 'aBack2' },
  aBack2: { text: 'You\'re an apprentice of the Waits of Ansbury. It pays nothing yet, and you carry the bench.', next: 'aBack3' },
  aBack3: {
    text: 'Roley keeps the instrument cupboard. Tell him I said you could look in it, and don\'t let him sell you the gurdy.',
    effect: (g) => { rank(g, 0); g.setStage(A, 'done'); },
  },
  // II. The Missing Pages
  b1: { text: 'Come and look at this. Gently.', next: 'b2' },
  b2: { speaker: 'narrator', text: 'A book the size of a gravestone lies open on the lectern. Close to the spine, someone has cut a thick block of pages out with a good knife.', next: 'b3' },
  b3: { text: 'The Great Book. Every tune the Waits have played in two hundred years. Twelve years ago the Collegium borrowed it to copy, and it came back thirty pages short.', next: 'b4' },
  b4: { text: 'They said a student did it. They said so in a very nice letter.', next: 'b5' },
  b5: { text: 'The pages are gone, but the tunes aren\'t. A tune lives as long as somebody sings it.', next: 'b5b' },
  b5b: { text: 'Three of them I\'d swear are still out there: a counting song at Kelderby, a hauling song on the Gullmouth quay, and the fellers\' sawing song at the camp in Hagworm Wood.', next: 'b6' },
  b6: {
    text: 'Go and learn them from the people who sing them, and play each one back to them, so they know you have it right. Then bring them home and I\'ll write them in.',
    options: [
      { text: 'I\'ll find them.', effect: (g) => g.setStage(BOOK, 'learn') },
      { text: 'Why not ask the Collegium for the pages back?', next: 'b7' },
      { text: 'Not yet.' },
    ],
  },
  b7: { text: 'I did, every year for twelve years. You can try, if you enjoy being told about the importance of scholarship.', next: 'b6' },
  bWait: {
    text: (g) => {
      const left = [!has(g, 'waitsKelderby') && 'Tressa Hale at Kelderby', !has(g, 'waitsGullmouth') && 'Bet Polglase on the Gullmouth quay', !has(g, 'waitsFellers') && 'Sefton Garrow at Fellers\' Camp'].filter(Boolean) as string[];
      return left.length ? `Still to come: ${left.join(', ')}. Don\'t come back with two and a promise.` : 'You have all three? Then play them for me.';
    },
  },
  bBack: { text: 'Kelderby, Gullmouth and the camp. All three. Play them for me, one after the other.', next: 'bBack2' },
  bBack2: { speaker: 'narrator', text: 'She writes them in as you play, fast, in a hand like knitting, and doesn\'t look up until the last bar.', next: 'bBack3' },
  bBack3: { text: 'That\'s the first new ink in the Great Book since the pages went.', next: 'bBack4' },
  bBack4: {
    text: 'You\'re a journeyman now. Roley will sell you a lute, or a horn if you want the neighbours to hate you.',
    effect: (g) => { rank(g, 1); g.setStage(BOOK, 'done'); },
  },
  // III. From the Moor
  m1: { text: 'There\'s one page in the Great Book older than the rest. There\'s no tune on it, only five notes drawn as dots, and under them, in our hand: "from the moor".', next: 'm2' },
  m2: { text: 'Every Master of the Waits has tried to make a tune out of five dots. I\'ve tried for thirty years.', next: 'm2b' },
  m2b: { text: 'Last spring Wynn Carrow, the antiquarian at the Ketley Arches, wrote to me. He thinks he knows what they are.', next: 'm3' },
  m3: {
    text: 'Go and ask him. If he talks for an hour, let him. Nobody else listens to him, and he\'s usually right.',
    options: [
      { text: 'I\'ll go to the Ketley Arches.', effect: (g) => g.setStage(MOOR, 'wynn') },
      { text: 'Later.' },
    ],
  },
  mWait: { text: 'Wynn Carrow, at the Ketley Arches in Hagworm Wood. Take something to sit on.' },
  mBack: { text: 'Wynn said you\'d found something. He wrote to me. Twice. Play it.', next: 'mBack2' },
  mBack2: { speaker: 'narrator', text: 'You play the five notes on the bone whistle. She listens with her eyes shut, and for a while after the last one she says nothing.', next: 'mBack3' },
  mBack3: { text: 'Five notes. I\'d have put a sixth in, every time. That\'s why I never got it.', next: 'mBack4' },
  mBack4: {
    text: 'You\'re a Wait, a full one. The Charter pays a Wait three marks a quarter, when it pays anyone.',
    effect: (g) => { rank(g, 2); g.setStage(MOOR, 'done'); },
  },
  // IV. Three Marks in Ten
  s1: { text: 'Sit down. You\'ve earned the bad news along with the rest of us.', next: 's2' },
  s2: { text: 'At the next sitting the Charter means to stop the Waits\' wage. Six Waits at three marks a quarter. They need it for the debt, they say.', next: 's3' },
  s3: { text: 'Amos Hollis, the printer, has written a ballad about that debt. He wanted a tune for it, so I wrote one. My first in twenty years. Don\'t make that face.', next: 's4' },
  s4: {
    text: 'Go and see Amos. He sells his sheets in the Charter Market. He\'ll want to read you the words. Let him.',
    options: [
      { text: 'I\'ll go and see him.', effect: (g) => g.setStage(SIT, 'amos') },
      { text: 'Not now.' },
    ],
  },
  sAmos: { text: 'Amos Hollis, in the Charter Market. Look for the ink.' },
  d1: { text: 'Kellet came to you as well? Of course he did. He came here this morning and admired the ceiling.', next: 'd2' },
  d2: { text: 'I won\'t decide this one. The Waits are split down the middle, and you\'re the one who brought the tunes home.', next: 'd3' },
  d3: {
    text: 'You tell me what we play on the keep steps, and that\'s what we\'ll play.',
    options: [
      { text: 'Play "Three Marks in Ten".', next: 'dBallad' },
      { text: 'Play the Speaker\'s March.', next: 'dMarch' },
      { text: 'I need to think about it.' },
    ],
  },
  dBallad: { text: 'Good. Then we\'ll be poor and right, which is how most musicians end up anyway.', next: 'dBallad2' },
  dBallad2: { text: 'Be on the keep steps for the sitting. Play it as if you mean it. We\'ll be behind you.', effect: (g) => { g.setFlag('waitsEnd', 'ballad'); g.setFlag('tune:speakersmarch', true); g.setStage(SIT, 'steps'); } },
  dMarch: { text: 'Then we\'ll be paid. I don\'t like it, but I can feed five Waits on not liking it.', next: 'dMarch2' },
  dMarch2: { text: 'Amos will print his ballad anyway. He\'ll just have to sing it himself, which is a punishment for everyone. Be on the keep steps for the sitting.', effect: (g) => { g.setFlag('waitsEnd', 'march'); g.setFlag('tune:speakersmarch', true); g.setStage(SIT, 'steps'); } },
  dSteps: { text: (g) => (end(g) === 'ballad' ? 'The keep steps, "Three Marks in Ten". Don\'t rush the last verse.' : 'The keep steps, the March. Keep it steady. She walks slowly.') },
  e1: {
    text: (g) => (end(g) === 'ballad'
      ? 'The whole square was singing the last verse before we\'d finished it. Amos has sold four hundred sheets and he\'s run out of paper.'
      : 'She nodded to us on her way in. Kellet nodded to us. Everyone nodded.'),
    next: 'e2',
  },
  e2: {
    text: (g) => (end(g) === 'ballad'
      ? 'The Charter stopped the wage this morning. Six Waits, nothing a quarter. We\'ll busk. We\'ve done it before.'
      : 'The wage stands. Amos sang his ballad outside the Weighhouse on his own last night, and the watch moved him on.'),
    next: 'e3',
  },
  e3: {
    text: 'You\'re a senior Wait. Try not to let it go to your head. It\'s a very small head of a very poor company.',
    effect: (g) => { rank(g, 3); g.setFlag('tune:threemarks', true); g.setStage(SIT, 'done'); },
  },
  // V. The Hours
  h1: { text: 'One thing left. A Wait plays the hours.', next: 'h2' },
  h2: { text: 'At dawn we play "The Hours" from the bandstand, and Ansbury gets up. The town sets its day by it. If we\'re late, the bakers are late.', next: 'h3' },
  h3: {
    text: 'Learn it. Then be on the bandstand at first light, with the rest of us or with a band of your own, and play it through.',
    options: [
      { text: 'I\'ll be there at dawn.', effect: (g) => { g.setFlag('tune:hours', true); g.setStage(HOURS, 'dawn'); } },
      { text: 'Not yet.' },
    ],
  },
  hWait: { text: 'The bandstand, at first light. Don\'t be early either. Early is just a different way of being wrong.' },
  hBack: { text: 'You were on time, and so were the bakers. That\'s the whole job.', next: 'hBack2' },
  hBack2: { speaker: 'narrator', text: 'She takes a small harp down from its peg, dark with handling, and puts it in your hands.', next: 'hBack3' },
  hBack3: { text: 'The Waits\' harp. It goes to whoever plays the hours. That\'s you now, on the mornings I don\'t get up.', next: 'hBack4' },
  hBack4: {
    text: 'Wait of Ansbury. Wear it somewhere people can see.',
    effect: (g) => { g.give('inst_harp'); rank(g, 4); g.setStage(HOURS, 'done'); },
  },
};

const tabitha: DialogueTree = {
  start: (g) => {
    const a = at(g, A), b = at(g, BOOK), m = at(g, MOOR), s = at(g, SIT), h = at(g, HOURS);
    if (!a || a === 'tabitha') return 'a1';
    if (a === 'play') return has(g, 'played:ladyday@green') ? 'aBack' : 'aWait';
    if (a === 'done' && !b) return 'b1';
    if (b === 'learn') return has(g, 'waitsKelderby') && has(g, 'waitsGullmouth') && has(g, 'waitsFellers') ? 'bBack' : 'bWait';
    if (b === 'done' && !m) return 'm1';
    if (m === 'wynn' || m === 'barrow' || m === 'arches') return 'mWait';
    if (m === 'tabitha') return 'mBack';
    if (m === 'done' && !s) return 's1';
    if (s === 'amos') return 'sAmos';
    if (s === 'decide') return 'd1';
    if (s === 'steps') return 'dSteps';
    if (s === 'after') return 'e1';
    if (s === 'done' && !h) return 'h1';
    if (h === 'dawn') return has(g, 'played:hours@green:dawn') ? 'hBack' : 'hWait';
    return 'idle';
  },
  nodes: tabithaNodes,
};

// ================================================================ Roley Spence, and the cupboard

const roley: DialogueTree = {
  start: () => 'r1',
  nodes: {
    r1: {
      text: (g) => (typeof g.flag('fac:waits') === 'number'
        ? 'The cupboard\'s open. Mind the gurdy, it bites.'
        : 'Roley Spence. Horn, cupboard, and the only Wait who laughs. You\'ll want Tabitha, if you\'re here to join.'),
      next: 'menu',
    },
    menu: {
      text: 'What\'ll it be?',
      options: [
        { text: 'Show me the cupboard.', effect: (g) => g.openShop('waits') },
        { text: 'What is a gurdy, exactly?', next: 'gurdy' },
        { text: 'How did you end up a Wait?', next: 'roley' },
        { text: 'Bye.' },
      ],
    },
    gurdy: { text: 'A box with a wheel in it. You turn the handle and press the keys, and it plays whether you want it to or not.', next: 'gurdy2' },
    gurdy2: { text: 'Tabitha hates it, which is most of why I keep one.', next: 'menu' },
    roley: { text: 'I blew the horn on the Charter Post for six years. Every stop, four notes, so people knew the cart was in.', next: 'roley2' },
    roley2: { text: 'Tabitha heard me at the south gate and told me I was flat. I\'ve been flat for her ever since.', next: 'menu' },
  },
};

// ================================================================ Dorcas Pym and Hal Truscott

const dorcas: DialogueTree = {
  start: () => 'd1',
  nodes: {
    d1: { text: (g) => (typeof g.flag('fac:waits') === 'number' ? 'You\'re rushing the second line. Everyone does.' : 'Dorcas. Fiddle.'), next: 'd2' },
    d2: { speaker: 'narrator', text: 'She goes back to tuning, one ear to the string.', options: [{ text: 'You don\'t say much.', next: 'd3' }, { text: 'Bye.' }] },
    d3: { text: 'I play. That\'s my talking.' },
  },
};

const hal: DialogueTree = {
  start: () => 'h1',
  nodes: {
    h1: { text: 'Hal Truscott. I keep the time. Everyone else keeps the tune, and they all think the tune\'s the important part.', next: 'h2' },
    h2: { speaker: 'narrator', text: 'He taps four beats on his knee, very softly, and smiles at nothing in particular.' },
  },
};

// ================================================================ Amos Hollis, printer

const amos: DialogueTree = {
  start: (g) => (at(g, SIT) === 'amos' ? 'p1' : at(g, SIT) === 'usher' || at(g, SIT) === 'decide' ? 'pWait' : 'pIdle'),
  nodes: {
    pIdle: {
      text: (g) => (end(g) === 'ballad'
        ? 'Four hundred sheets. I\'ve had to buy paper from the Collegium, which is the worst thing that\'s happened to me all year.'
        : end(g) === 'march' ? 'They moved me on from the Weighhouse. I\'ve moved on to the market. I\'ll be moved on from here by Friday.' : 'Broadsides, a penny each. True ones cost the same as the other kind.'),
    },
    p1: { text: 'You\'re the Waits\' new one. Good. Stand there. No, I\'ll read it, you\'ll read it wrong.', next: 'p2' },
    p2: { speaker: 'narrator', text: 'He reads it standing, one inky hand flat on the stall. Four verses, about a road debt bought at three marks in ten and paid back at ten in ten. The last verse names Mr Pryce.', next: 'p3' },
    p3: { text: 'Forty thousand marks of road, bought for twelve. Every toll on the Turnpike goes to men who paid three for ten. It isn\'t a song, it\'s arithmetic. The song is so people do the sum.', next: 'p4' },
    p4: { text: 'Tabitha\'s tune is good. It\'s better than my words, which I\'ll deny if you repeat it. Learn it, and play it on the keep steps when the Speaker goes in to the sitting.', next: 'p5' },
    p5: { speaker: 'narrator', text: 'He hums it once, badly, and you have it.', effect: (g) => { g.setFlag('tune:threemarks', true); g.setStage(SIT, 'usher'); } },
    pWait: { text: 'Somebody from the keep was asking about my ballad this morning. Very polite. They always are, right up until they aren\'t.' },
  },
};

// ================================================================ Hugh Kellet, Gentleman Usher

const kellet: DialogueTree = {
  start: (g) => (at(g, SIT) === 'usher' ? 'k1' : 'kIdle'),
  nodes: {
    kIdle: { text: 'Good day. Mind the step.' },
    k1: { text: 'You\'ll be the one carrying Mr Hollis\'s new tune. Hugh Kellet. I keep the doors of the Charter Hall.', next: 'k2' },
    k2: { text: 'The Speaker has heard about the ballad. She asked me to say only this: the Waits have walked in front of every Speaker for two hundred years, playing the March.', next: 'k3' },
    k3: { text: 'If they play it again, the question of the wage may be looked at kindly. If they play something else, it will still be looked at.', next: 'k4' },
    k4: { speaker: 'narrator', text: 'He says it pleasantly, and stays exactly long enough to be sure you understood.', effect: (g) => g.setStage(SIT, 'decide') },
  },
};

// ================================================================ Bet Polglase, on the Gullmouth quay

const bet: DialogueTree = {
  start: (g) => {
    if (at(g, BOOK) !== 'learn' || has(g, 'waitsGullmouth')) return 'bIdle';
    if (!has(g, 'tune:haulholmsey')) return 'q1';
    return has(g, 'played:haulholmsey@gullmouth') ? 'q5' : 'qWait';
  },
  nodes: {
    bIdle: { text: (g) => (has(g, 'waitsGullmouth') ? 'Is Jory\'s fiddle behaving? Keep it out of the damp. It came off a boat; it\'s had enough damp.' : 'Tide\'s turning. Everything on this quay happens on the tide, me included.') },
    q1: { text: '"Haul for Holmsey"? Do you want the words or the tune? The words are about drowning and the tune\'s about pulling. Most people only want the tune.', next: 'q2' },
    q2: { text: 'My Jory sang it at the capstan for thirty years. Hauled every boat up this slip to it.', next: 'q3' },
    q3: { speaker: 'narrator', text: 'She sings it, beating time on a bollard with the flat of her hand. Along the quay the dockers take up the second line without looking round.', next: 'q4' },
    q4: { text: 'Now you play it. Here, on the quay. If the lads haul to it, you\'ve got it. If they stop and look at you, you haven\'t.', effect: (g) => g.setFlag('tune:haulholmsey', true) },
    qWait: { text: 'Play it here on the quay, where the lads can hear. The whole thing, mind.' },
    q5: { text: 'They hauled. Did you see that? They hauled.', next: 'q6' },
    q6: { speaker: 'narrator', text: 'She goes into the chandlery and comes back with a fiddle in a sailcloth bag.', next: 'q7' },
    q7: { text: 'Jory\'s. He played it in the lugger\'s cabin. It\'s been on a nail since the funeral. A fiddle that doesn\'t get played cracks, so take it before it does.', effect: (g) => { g.give('inst_fiddle'); g.setFlag('waitsGullmouth', true); } },
  },
};

// ================================================================ Tressa, Sefton, Wynn and Pell (added to their conversations)

const wennaNodes: DialogueTree['nodes'] = {
  wt1: { text: '"Fourteen Ewes"? Who told you about that?', next: 'wt2' },
  wt2: { text: 'Tabitha Gant. Hm. She came up here twenty years ago and wrote down half the ridge.', next: 'wt3' },
  wt3: { text: 'It\'s a counting song. You sing a bar for every ewe through the gate. If you run out of song before you run out of sheep, you\'ve lost one.', next: 'wt4' },
  wt4: { speaker: 'narrator', text: 'She sings it flat and steady, looking out at the fold. Fourteen bars.', next: 'wt5' },
  wt5: { text: 'Now you. Out by the well, where I can hear it. And not so fast. Sheep don\'t run to it.', effect: (g) => g.setFlag('tune:fourteenewes', true) },
  wtWait: { text: 'By the well. The whole fourteen.' },
  wt6: { text: 'That\'ll do. You\'ve got it.', next: 'wt7' },
  wt7: { speaker: 'narrator', text: 'She goes into the house and comes back with a set of pipes wrapped in a fleece.', next: 'wt8' },
  wt8: { text: 'Bryn\'s father\'s. He played that tune on them every evening of his life. Nobody\'s touched them since. Better played than kept.', effect: (g) => { g.give('inst_pipes'); g.setFlag('waitsKelderby', true); } },
};

const seftonNodes: DialogueTree['nodes'] = {
  st1: {
    text: 'The calling? Aye, I can call a tree. Which one do you want down?',
    options: [{ text: 'Not a tree. The song: "The Calling".', next: 'st2' }, { text: 'Never mind.' }],
  },
  st2: { text: 'Song? Oh, the song. Why didn\'t you say? Nobody\'s asked for that since Ide\'s mother ran the camp.', next: 'st3' },
  st3: { text: 'We sang it on the long saw, two to a bar, so the strokes kept together. I can\'t hear the saw so well these days. I keep the time on this.', next: 'st4' },
  st4: { speaker: 'narrator', text: 'He pats a frame drum hung on the tent pole, its skin dark with hand grease, and sings. The drum keeps the strokes.', next: 'st5' },
  st5: { text: 'I feel it through my hands. Don\'t tell Ide. Now you play it, here by the fire, and I\'ll watch the lads\' arms. If they saw to it, it\'s right.', effect: (g) => g.setFlag('tune:calling', true) },
  stWait: { text: 'By the fire. I\'ll watch their arms.' },
  st6: { text: 'They sawed to it. Did you see young Kit? Out of time, but he always is.', next: 'st7' },
  st7: { text: 'Have the old drum. Odo made me a new one at midsummer, and I\'ve not had the heart to tell him I liked this one better.', effect: (g) => { g.give('inst_drum'); g.setFlag('waitsFellers', true); } },
};

const wynnNodes: DialogueTree['nodes'] = {
  wy1: { text: 'Five dots? The Waits\' page! She got my letter. Good. I\'d started to think she used it to light the fire.', next: 'wy2' },
  wy2: { text: 'The old builders didn\'t write. They drew, and they counted. But they buried their dead on Tolmen Moor under long barrows, and with each one they put whatever that person had been good at.', next: 'wy3' },
  wy3: { text: 'Carne Barrow, east of Scarrow Tor. The frost cracked its roof last winter, and the tor shepherds say something\'s denning in it. I\'d go myself, but I\'d be eaten.', next: 'wy4' },
  wy4: { text: 'If I\'m right, there\'s a whistle in there made of bone, with five holes. Five dots, five holes. Play the page on it and you\'ll have the oldest tune in the counties.', next: 'wy5' },
  wy5: { text: 'And then, if you would, come and play it here, under the arches. I have a theory about the arches. I\'ll tell you whether it\'s right.', effect: (g) => g.setStage(MOOR, 'barrow') },
  wyWait: { text: (g) => (g.has('inst_bone') ? 'You have it? Play it here, under the arches. Go on. I\'ve waited eleven years.' : 'Carne Barrow, east of Scarrow Tor on Tolmen Moor. Bring the whistle, and yourself.') },
  wy6: { speaker: 'narrator', text: 'The last note comes back off the arches a breath later, from every lintel at once, the way a choir answers a cantor.', next: 'wy7' },
  wy7: { text: 'Did you hear that? The rope grooves. They cut them to sing. In a wind, a whole field tied down to these arches would have sung that tune.', next: 'wy8' },
  wy8: { text: 'Eight hundred years. Go and tell Tabitha. Tell her I was right. Tell her twice.', effect: (g) => g.setStage(MOOR, 'tabitha') },
};

const pellNodes: DialogueTree['nodes'] = {
  pw1: { text: 'Know any tunes? I wrote one. "Wend Water." Forty years ago, on this bank, with a trout on the line the length of my leg.', next: 'pw2' },
  pw2: { speaker: 'narrator', text: 'He whistles it through his teeth, quick and bright. It sounds older than forty years.', next: 'pw3' },
  pw3: { text: 'My grandad said he wrote it too. Funny, that. Off you go, and don\'t play it near the water. It scares them.', effect: (g) => g.setFlag('tune:wendwater', true) },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [A]: {
    id: A, name: 'The Audition', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'tabitha') return 'The Waits of Ansbury, the town\'s musicians, want one apprentice. Tabitha Gant, the Master, is at the Waits\' House on the north side of the Charter Green.';
      if (s === 'play') return 'Tabitha gave me a tin whistle and taught me "Lady Day". I\'m to play it through at the bandstand on the Charter Green, where she can hear.';
      return 'I\'m an apprentice of the Waits of Ansbury.';
    },
    objectives: (g, s) => {
      if (s === 'tabitha') return [{ text: 'Talk to Tabitha Gant at the Waits\' House, Ansbury', marker: 'tabitha' }];
      if (s === 'play') return has(g, 'played:ladyday@green') ? [{ text: 'Go back to Tabitha Gant', marker: 'tabitha' }] : [{ text: 'Play "Lady Day" through at the bandstand on the Charter Green (open the songbook with N)', marker: 'bandstand' }];
      return [];
    },
    marks: (g, s): Marks => (!s ? { tabitha: '!' } : s === 'tabitha' || (s === 'play' && has(g, 'played:ladyday@green')) ? { tabitha: '?' } : {}),
    walk: { cast: ['tabitha'], from: { flags: { 'played:ladyday@green': true } } },
  },
  [BOOK]: {
    id: BOOK, name: 'The Missing Pages', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'learn') return 'Thirty pages were cut out of the Waits\' Great Book while the Collegium had it. Tabitha thinks three of the lost tunes are still sung: a counting song at Kelderby (Tressa Hale), a hauling song on the Gullmouth quay (Bet Polglase), and the fellers\' sawing song at Fellers\' Camp (Sefton Garrow). I\'m to learn each one and play it back to whoever taught me.';
      return 'I brought three lost tunes home to the Great Book. I\'m a journeyman Wait.';
    },
    objectives: (g, s) => {
      if (s !== 'learn') return [];
      const step = (flag: string, tune: string, who: string, where: string, marker: string): { text: string; done?: boolean; marker?: string } => {
        if (has(g, flag)) return { text: `${who}: done`, done: true };
        if (!has(g, 'tune:' + tune)) return { text: `Learn a tune from ${who} ${where}`, marker };
        if (!has(g, `played:${tune}@${marker === 'bet' ? 'gullmouth' : marker === 'wenna' ? 'kelderby' : 'fellers'}`)) return { text: `Play it back to ${who} ${where}`, marker };
        return { text: `Talk to ${who}`, marker };
      };
      const list = [
        step('waitsKelderby', 'fourteenewes', 'Tressa Hale', 'at Kelderby', 'wenna'),
        step('waitsGullmouth', 'haulholmsey', 'Bet Polglase', 'on the Gullmouth quay', 'bet'),
        step('waitsFellers', 'calling', 'Sefton Garrow', 'at Fellers\' Camp', 'sefton'),
      ];
      if (has(g, 'waitsKelderby') && has(g, 'waitsGullmouth') && has(g, 'waitsFellers')) list.push({ text: 'Bring the tunes home to Tabitha Gant', marker: 'tabitha' });
      return list;
    },
    marks: (g, s): Marks => {
      if (!s) return done(g, A) ? { tabitha: '!' } : {};
      if (s !== 'learn') return {};
      const m: Marks = {};
      if (!has(g, 'waitsKelderby')) m.wenna = '?';
      if (!has(g, 'waitsGullmouth')) m.bet = '?';
      if (!has(g, 'waitsFellers')) m.sefton = '?';
      if (has(g, 'waitsKelderby') && has(g, 'waitsGullmouth') && has(g, 'waitsFellers')) m.tabitha = '?';
      return m;
    },
    walk: { from: { quests: { [A]: 'done' }, flags: { 'fac:waits': 0, 'played:fourteenewes@kelderby': true, 'played:haulholmsey@gullmouth': true, 'played:calling@fellers': true } }, cast: ['wenna', 'bet', 'sefton'] },
  },
  [MOOR]: {
    id: MOOR, name: 'From the Moor', region: 'tolmen', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'wynn') return 'The oldest page in the Great Book has five notes drawn as dots and the words "from the moor". Wynn Carrow, the antiquarian at the Ketley Arches, thinks he knows what they are.';
      if (s === 'barrow') return g.has('inst_bone') ? 'I found a bone whistle with five holes in Carne Barrow. Wynn wants to hear it played under the Ketley Arches.' : 'Wynn thinks the old builders buried a bone whistle in Carne Barrow, east of Scarrow Tor on Tolmen Moor. The frost cracked the barrow open last winter and something is denning in it.';
      if (s === 'tabitha') return 'The arches answered the tune: the old builders cut their rope grooves to sing. Wynn wants Tabitha told he was right. Twice.';
      return 'The five dots were "The Mooring", the oldest tune in the counties, played on a bone whistle from Carne Barrow. I\'m a Wait.';
    },
    objectives: (g, s) => {
      if (s === 'wynn') return [{ text: 'Ask Wynn Carrow at the Ketley Arches about the five dots', marker: 'wynn' }];
      if (s === 'barrow') return g.has('inst_bone')
        ? [{ text: 'Play "The Mooring" under the Ketley Arches', marker: 'arches' }]
        : [{ text: 'Find the bone whistle in Carne Barrow, Tolmen Moor', marker: 'carneWhistle' }];
      if (s === 'arches') return [{ text: 'Talk to Wynn Carrow', marker: 'wynn' }];
      if (s === 'tabitha') return [{ text: 'Tell Tabitha Gant at the Waits\' House', marker: 'tabitha' }];
      return [];
    },
    advance: (g, s) => (s === 'barrow' && has(g, 'played:mooring@arches') ? 'arches' : null),
    marks: (g, s): Marks => (!s ? (done(g, BOOK) ? { tabitha: '!' } : {}) : s === 'wynn' || s === 'arches' ? { wynn: '?' } : s === 'tabitha' ? { tabitha: '?' } : {}),
    walk: { from: { quests: { [A]: 'done', [BOOK]: 'done' }, flags: { 'fac:waits': 1, 'played:mooring@arches': true } }, cast: ['wynn'] },
  },
  [SIT]: {
    id: SIT, name: 'Three Marks in Ten', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'amos') return 'At the next sitting the Charter means to stop the Waits\' wage to pay the road debt. Amos Hollis, a printer who sells broadsides in the Charter Market, has written a ballad about the debt, and Tabitha has written its tune.';
      if (s === 'usher') return 'Amos taught me "Three Marks in Ten". It names Mr Pryce. He wants it played on the keep steps when the Speaker goes in to the sitting. Someone from the keep has been asking about it.';
      if (s === 'decide') return 'Hugh Kellet, the Gentleman Usher, says the wage may be looked at kindly if the Waits play the Speaker\'s March as usual. Tabitha wants me to decide what the Waits play on the keep steps.';
      if (s === 'steps') return end(g) === 'ballad' ? 'The Waits will play "Three Marks in Ten" on the keep steps, and lose the wage for it.' : 'The Waits will play the Speaker\'s March on the keep steps, and keep the wage.';
      if (s === 'after') return 'We played. Tabitha will want to talk about what happened next.';
      return end(g) === 'ballad' ? 'We played the ballad. The town sang it, the Charter stopped the Waits\' wage, and the Waits are busking. I\'m a senior Wait.' : 'We played the March. The wage stands, and Amos was moved on from the Weighhouse for singing his ballad alone. I\'m a senior Wait.';
    },
    objectives: (g, s) => {
      if (s === 'amos') return [{ text: 'Find Amos Hollis in the Charter Market, Ansbury', marker: 'amos' }];
      if (s === 'usher') return [{ text: 'Go back to the Waits\' House', marker: 'kellet' }];
      if (s === 'decide') return [{ text: 'Tell Tabitha Gant what the Waits will play', marker: 'tabitha' }];
      if (s === 'steps') return [{ text: end(g) === 'ballad' ? 'Play "Three Marks in Ten" on the keep steps' : 'Play the Speaker\'s March on the keep steps', marker: 'keepSteps' }];
      if (s === 'after') return [{ text: 'Talk to Tabitha Gant', marker: 'tabitha' }];
      return [];
    },
    advance: (g, s) => (s === 'steps' && has(g, `played:${end(g) === 'ballad' ? 'threemarks' : 'speakersmarch'}@keep`) ? 'after' : null),
    marks: (g, s): Marks => (!s ? (done(g, MOOR) ? { tabitha: '!' } : {}) : s === 'amos' ? { amos: '?' } : s === 'usher' ? { kellet: '?' } : s === 'decide' || s === 'after' ? { tabitha: '?' } : {}),
    walk: { from: { quests: { [A]: 'done', [BOOK]: 'done', [MOOR]: 'done' }, flags: { 'fac:waits': 2, 'played:threemarks@keep': true, 'played:speakersmarch@keep': true } }, cast: ['amos', 'kellet'] },
  },
  [HOURS]: {
    id: HOURS, name: 'The Hours', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => (s === 'dawn'
      ? 'A Wait plays the hours. Tabitha taught me "The Hours"; I\'m to play it through on the bandstand on the Charter Green at first light, with the Waits or a band of my own.'
      : 'I played the hours at dawn. Tabitha gave me the Waits\' harp. I\'m a Wait of Ansbury.'),
    objectives: (g, s) => {
      if (s !== 'dawn') return [];
      return has(g, 'played:hours@green:dawn')
        ? [{ text: 'Go back to Tabitha Gant', marker: 'tabitha' }]
        : [{ text: 'Play "The Hours" through on the bandstand at first light (5 to 8 in the morning)', marker: 'bandstand' }];
    },
    marks: (g, s): Marks => (!s ? (done(g, SIT) ? { tabitha: '!' } : {}) : s === 'dawn' && has(g, 'played:hours@green:dawn') ? { tabitha: '?' } : {}),
    walk: { from: { quests: { [A]: 'done', [BOOK]: 'done', [MOOR]: 'done', [SIT]: 'done' }, flags: { 'fac:waits': 3, 'played:hours@green:dawn': true } } },
  },
};

// ================================================================ Instruments

const inst = (id: string, name: string, voice: NonNullable<ItemDef['instrument']>, rarity: ItemDef['rarity'], value: number, icon: ItemDef['icon'], desc: string): ItemDef => ({
  id, name, kind: 'collectible', rarity, stack: false, value, icon, desc, instrument: voice,
  stats: 'Use it to take it out, then play from your songbook (N), or by ear on the number keys.',
});

const ITEMS_W: ItemDef[] = [
  inst('inst_whistle', 'Tin whistle', 'whistle', 'common', 8, { shape: 'whistle', a: '#c8ccd0' }, 'A tin tube with six holes and a wooden fipple. Every apprentice Wait starts on one, and every neighbour of an apprentice Wait knows it.'),
  inst('inst_fiddle', 'Jory Polglase\'s fiddle', 'fiddle', 'rare', 70, { shape: 'fiddle', a: '#8a4a22', b: '#3a2414' }, 'A ship\'s fiddle, played in a lugger\'s cabin for thirty years. Bet Polglase says it still smells of the bilge, and she\'s right.'),
  inst('inst_pipes', 'Hale pipes', 'pipes', 'rare', 80, { shape: 'pipes', a: '#4a2a3a', b: '#3a2414' }, 'A sheepskin bag, three drones and a chanter, kept in a fleece at Kelderby since the funeral. Loud enough to call a flock off the ridge.'),
  inst('inst_drum', 'Sefton\'s frame drum', 'drum', 'rare', 60, { shape: 'drum', a: '#6a4a2a', b: '#e0cfa0' }, 'A frame drum dark with hand grease, for keeping the strokes of a two-man saw. Sefton Garrow feels the beat through his hands.'),
  inst('inst_lute', 'Ansbury lute', 'lute', 'uncommon', 90, { shape: 'fiddle', a: '#a0602a', b: '#3a2414' }, 'A round-backed lute from a maker on Tanners\' Row, strung in gut. It goes out of tune if you look at it, and back in if you\'re patient.'),
  inst('inst_horn', 'Post horn', 'horn', 'uncommon', 60, { shape: 'horn', a: '#d8a84a', b: '#8a6a2a' }, 'A coiled brass horn, the kind the Charter Post carters blow at every stop. Roley Spence says it has four notes and he knows all of them.'),
  inst('inst_gurdy', 'Hurdy-gurdy', 'gurdy', 'rare', 140, { shape: 'fiddle', a: '#7a4a26', b: '#c8a050' }, 'A box with a wheel inside and keys along the top. Turn the handle and it plays, whether you want it to or not.'),
  inst('inst_harp', 'The Waits\' harp', 'harp', 'epic', 200, { shape: 'harp', a: '#8a4a22', b: '#d8a84a' }, 'A small harp, dark with handling, that goes to whoever plays the hours. Ansbury has got up to it every morning for a hundred years.'),
  inst('inst_bone', 'The Carne whistle', 'bone', 'legendary', 0, { shape: 'whistle', a: '#e8dcc0', b: '#8a7a5a' }, 'A whistle cut from a long bone, with five holes, from a barrow on Tolmen Moor. It plays five notes and no others, and it is about eight hundred years old.'),
];

// ================================================================ The people

const W = WAITS_HOUSE;
const LOOK_TABITHA = { frame: 'f' as const, skin: '#e2b894', hair: '#cfcac0', hairStyle: 2, eyes: '#4a5a6a', tunic: '#2a4a8a', trim: '#e0bd64', trousers: '#2a2a3a', boots: '#2a1e16', cape: '#5a2a3a', top: 5, lashes: true, build: 0.92, age: 0.7 };
const LOOK_ROLEY = { skin: '#d8a882', hair: '#7a3a1e', hairStyle: 3, eyes: '#3a4a2a', tunic: '#2a4a8a', trim: '#e0bd64', trousers: '#3a3430', boots: '#2a1e16', freckles: true, build: 1.05, age: 0.35, hat: 'beret' as const, hatColor: '#2a4a8a' };
const LOOK_DORCAS = { frame: 'f' as const, skin: '#c89070', hair: '#1e1612', hairStyle: 4, eyes: '#3a2a1a', tunic: '#2a4a8a', trim: '#e0bd64', trousers: '#2a2a3a', boots: '#2a1e16', lashes: true, build: 0.88, age: 0.22 };
const LOOK_HAL = { skin: '#8a5a3a', hair: '#1e1612', hairStyle: 0, beard: true, eyes: '#3a2a1a', tunic: '#2a4a8a', trim: '#e0bd64', trousers: '#3a3430', boots: '#2a1e16', build: 1.25, height: 1.06, age: 0.45 };

/** The Waits' day: the hours from the bandstand at dawn and dusk, a set there at noon, the hall in between. */
function waitDay(item: string, part: 'lead' | 'harmony' | 'bass' | 'drum', band: [number, number], home: [number, number], homeFace: [number, number]): NpcDef['schedule'] {
  // Out through the door, through the gap in the Green's hedge, across the grass to the bandstand's step
  const door: [number, number][] = [[W.x0 + 7.5, W.z0 + W.d - 3], [W.x0 + 7.5, W.z0 + W.d + 2], [W.x0 + 7.5, W.z0 + W.d + 10]];
  const out: [number, number][] = [...door, [BANDSTAND.x + 1, BANDSTAND.z + 6], [BANDSTAND.x, BANDSTAND.z + 3]];
  const back: [number, number][] = [[BANDSTAND.x, BANDSTAND.z + 3], [BANDSTAND.x + 1, BANDSTAND.z + 6], ...door.slice().reverse()];
  const hall = { at: home, face: homeFace, anim: 'idle' as const, path: back };
  const stand = (tunes: string[]) => ({ at: [BANDSTAND.x + band[0], BANDSTAND.z + band[1]] as [number, number], face: [BANDSTAND.x + band[0], BANDSTAND.z + 8] as [number, number], anim: 'perform' as const, held: item, play: { tunes, part }, path: out });
  return [
    { from: 5.5, to: 7.5, ...stand(['hours']) },
    { from: 7.5, to: 11.5, ...hall },
    { from: 11.5, to: 13.5, ...stand(['ladyday', 'wendwater', 'haulholmsey', 'speakersmarch', 'fourteenewes', 'calling']) },
    { from: 13.5, to: 17.5, ...hall },
    { from: 17.5, to: 19, ...stand(['hours']) },
    { from: 19, to: 5.5, ...hall },
  ];
}

const NPCS_W: NpcDef[] = [
  { id: 'tabitha', name: 'Tabitha Gant', title: 'Master of the Waits', look: LOOK_TABITHA, schedule: waitDay('inst_harp', 'lead', [0, -1.4], [STAGE.x, STAGE.z], [STAGE.x, STAGE.z + 6]), barks: ['A beat early.', 'Again, from the top.'] },
  { id: 'roley', name: 'Roley Spence', title: 'Horn, the Waits', look: LOOK_ROLEY, schedule: waitDay('inst_horn', 'bass', [2.2, 0.2], [CUPBOARD.x - 1.6, CUPBOARD.z - 0.4], [CUPBOARD.x, CUPBOARD.z - 0.4]), barks: ['Mind the gurdy.', 'Flat? Me?'] },
  { id: 'dorcas', name: 'Dorcas Pym', title: 'Fiddle, the Waits', look: LOOK_DORCAS, schedule: waitDay('inst_fiddle', 'harmony', [-2.2, 0.2], [W.x0 + 5.5, W.z0 + 4], [W.x0 + 5.5, W.z0 + 1]), barks: ['Hm.'] },
  { id: 'hal', name: 'Hal Truscott', title: 'Drum, the Waits', look: LOOK_HAL, schedule: waitDay('inst_drum', 'drum', [0, 1.4], [W.x0 + 9.5, W.z0 + 4], [W.x0 + 9.5, W.z0 + 1]), barks: ['One, two.'] },
  {
    id: 'amos', name: 'Amos Hollis', title: 'Printer of broadsides',
    look: { skin: '#e2b894', hair: '#3a2418', hairStyle: 1, eyes: '#4a5a6a', tunic: '#4a4a52', trim: '#2a2a2a', trousers: '#2a2a30', boots: '#1a1614', apron: true, gloves: '#1a1a1e', build: 0.9, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [AMOS.x, AMOS.z], face: [AMOS.x, AMOS.z - 3], anim: 'idle' }],
    barks: ['Broadsides, a penny.', 'True ones cost the same.'],
  },
  {
    id: 'kellet', name: 'Hugh Kellet', title: 'Gentleman Usher',
    look: { skin: '#e8c4a0', hair: '#9a948c', hairStyle: 1, eyes: '#4a5a6a', tunic: '#1e1e24', trim: '#c8c8d0', trousers: '#1e1e24', boots: '#141418', cape: '#1e1e24', build: 0.95, height: 1.04, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [W.x0 + 7.5, W.z0 + W.d + 2.5], face: [W.x0 + 7.5, W.z0 + W.d], anim: 'idle' }],
    when: (g) => at(g, SIT) === 'usher',
  },
  {
    id: 'bet', name: 'Bet Polglase', title: 'Widow, Gullmouth',
    look: { frame: 'f' as const, skin: '#d8a882', hair: '#9a948c', hairStyle: 2, eyes: '#4a5a6a', tunic: '#3a4a52', trim: '#c8b080', trousers: '#2a3036', boots: '#1e1a16', hat: 'kerchief', hatColor: '#8a3a2a', lashes: true, build: 1.0, age: 0.65 },
    schedule: [{ from: 0, to: 24, at: [GULL_X, 597.5], face: [GULL_X, 601], anim: 'idle' }],
    barks: ['Tide\'s turning.', 'Haul, you idle lot.'],
  },
];

const shop: ShopDef = {
  id: 'waits', name: 'The Waits\' cupboard', owner: 'roley', who: 'Roley',
  stock: [
    { item: 'inst_whistle', price: 8 },
    { item: 'inst_horn', price: 60, when: (g) => Number(g.flag('fac:waits') ?? -1) >= 1 },
    { item: 'inst_lute', price: 90, when: (g) => Number(g.flag('fac:waits') ?? -1) >= 1 },
    { item: 'inst_gurdy', price: 140, when: (g) => Number(g.flag('fac:waits') ?? -1) >= 2 },
  ],
  buyRate: () => 0.3,
  footer: (g) => (Number(g.flag('fac:waits') ?? -1) >= 1 ? 'Journeymen may buy the lute and the horn; full Waits, the gurdy.' : 'Apprentices get the whistle. Earn the rest.'),
};

export const WAITS: RegionContent = {
  id: 'waits',
  items: ITEMS_W,
  npcs: NPCS_W,
  dialogue: { tabitha, roley, amos, kellet, bet, dorcas, hal },
  quests,
  shops: { waits: shop },
  readables: {
    waitsBill: {
      title: 'A bill on the bandstand',
      body: 'THE WAITS OF ANSBURY\n\nTake on one apprentice this year.\n\nMust be able to hold a tune, and a bench.\n\nApply at the Waits\' House, on the north side of the Green.\n\nT. Gant, Master of the Waits',
      effect: (g) => { if (!at(g, A)) g.setStage(A, 'tabitha'); },
    },
    greatBook: {
      title: 'The Great Book of the Waits',
      body: (g) => `Two hundred years of tunes in a dozen hands. Close to the spine a block of pages has been cut out with a sharp knife.\n\n${has(g, 'waitsKelderby') && has(g, 'waitsGullmouth') && has(g, 'waitsFellers') ? 'On the first blank leaf after the cut, in new ink: "Fourteen Ewes (Kelderby)", "Haul for Holmsey (Gullmouth quay)", "The Calling (Fellers\' Camp)".\n\n' : ''}The oldest page is brown at the edges. It holds five dots, and under them, in a later hand: "from the moor".${done(g, MOOR) ? ' Someone has added, in pencil: "The Mooring. Carne whistle. W.C. was right."' : ''}`,
    },
    carneWhistle: {
      title: 'A niche in the barrow wall',
      body: 'Behind a fallen slab, in a niche cut for it, a whistle made of a long bone lies on a bed of black earth. It has five holes.\n\nYou put it to your lips. The five notes are the five dots on the Waits\' page, lowest first, and your fingers find the tune they make before you\'ve thought about it.',
      effect: (g) => { if (!g.has('inst_bone')) { g.give('inst_bone'); g.setFlag('tune:mooring', true); } },
    },
  },
  things: [
    { id: 'bandstand', x: BANDSTAND.x + 4.2, z: BANDSTAND.z, label: 'Read the bill on the bandstand', radius: 2.4, read: 'waitsBill' },
    { id: 'greatBook', x: LECTERN.x + 1.6, z: LECTERN.z, label: 'Read the Great Book', radius: 2.2, read: 'greatBook' },
    { id: 'carneWhistle', x: CARNE.x - 3.5, z: CARNE.z - 1.5, y: CARNE_FLOOR, label: 'Search the niche in the wall', radius: 2.2, read: 'carneWhistle', when: (g) => at(g, MOOR) === 'barrow' && !g.has('inst_bone') },
    { id: 'arches', x: 176.5, z: 860.5, label: '', radius: 0 },
    { id: 'keepSteps', x: 820.5, z: 313.5, label: '', radius: 0 },
  ],
  spawns: [
    { tag: 'carne', type: 'moorwolf', at: [[CARNE.x - 6, CARNE.z + 9], [CARNE.x + 7, CARNE.z + 8], [CARNE.x, CARNE.z + 14]], when: (g) => at(g, MOOR) === 'barrow' && !g.has('inst_bone') },
  ],
  hooks: (D) => {
    hook(D, 'wenna', (g) => {
      if (at(g, BOOK) !== 'learn' || has(g, 'waitsKelderby')) return undefined;
      if (!has(g, 'tune:fourteenewes')) return 'wt1';
      return has(g, 'played:fourteenewes@kelderby') ? 'wt6' : 'wtWait';
    }, wennaNodes);
    hook(D, 'sefton', (g) => {
      if (at(g, BOOK) !== 'learn' || has(g, 'waitsFellers')) return undefined;
      if (!has(g, 'tune:calling')) return 'st1';
      return has(g, 'played:calling@fellers') ? 'st6' : 'stWait';
    }, seftonNodes);
    hook(D, 'wynn', (g) => {
      const m = at(g, MOOR);
      if (m === 'wynn') return 'wy1';
      if (m === 'barrow') return 'wyWait';
      if (m === 'arches') return 'wy6';
      return undefined;
    }, wynnNodes);
    Object.assign(D.pell.nodes, pellNodes);
    addOption(D, 'pell', 'main', { text: 'Do you know any tunes?', next: 'pw1', cond: (g) => done(g, A) && !has(g, 'tune:wendwater') });
  },
};
