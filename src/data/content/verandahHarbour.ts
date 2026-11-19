import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { utcDay } from '../calendar';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Verandah's harbour government (OWED 97x stage 2, docs/VERANDAH.md): the people the Silent Waters will need, met
// first over ordinary work.
//
// Hugh Carne, Collector of Customs, keeps his ledger at the west end of the port warehouse, which is the King's
// bonded store (Tom Laity, the warehouseman, already works it). Ned Carne in the quarry is his brother. Kerra Nance,
// pilot and master of the Guild of the Quay this year, stands at the pier end watching the harbour mouth; Bryok
// Nance, the dockhand, is her son. Grace Vyvyan, head of House Vyvyan, counts herring barrels halfway down the pier.
//
// vhCask, SHORT MEASURE (Hugh Carne): one of three bonded casks of Trefusis wine is a hand short and watered. Josh
// Teague, the Winery's cellarman, has been selling a jug a week for his mother's medicine. Let the law have him, ([Kind])
// pay the duty yourself so Clemency can keep him on, tell Hugh it was a leaking stave, or ([Bad or Evil]) make the
// Winery pay for your silence. vhCask = 'law' | 'paid' | 'stave' | 'hush'.
//
// vhBuoy, OFF STATION (Kerra Nance): the bell buoy on the harbour bar has gone. It's up on the Long Sands among the
// crabs, its shackle open and the pin drawn with a spanner: somebody let it go. Tell Captain Morvah at Awschitz, or
// keep it in the Guild. vhBuoy = 'morvah' | 'guild'. (The Silent Waters will remember which.)
//
// A turn on the quay (Bryok Nance, who keeps the Guild's tally book, once a day): chalk the four lots of the morning packet's cargo against the bill, for
// twelve marks. Counts as one of the Factor trade's contracts (data/jobs.ts).

const CASK = 'vhCask', BUOY = 'vhBuoy';
const HUGH = { x: -2879.5, y: 23, z: 1934.5 };
const KERRA = { x: -2893.5, y: 16, z: 1877.5 };
const GRACE = { x: -2893.5, y: 16, z: 1889.5 };
/** The three bonded casks, on the barrel pallets in the warehouse (data/content/verandahWork.ts PORT_WAREHOUSE_PROPS). */
const CASKS: [number, number][] = [[-2874, 1938], [-2871, 1936.2], [-2868, 1933.6]];
const BUOY_AT = { x: -2634.5, z: 2157.5 };
const CRABS: [number, number][] = [[-2640, 2152], [-2630, 2163], [-2638, 2165]];
/** The morning packet's four lots: two on the pier, two on the quay deck. */
const LOTS: [number, number][] = [[-2893.5, 1883.5], [-2893.5, 1894.5], [-2888.5, 1893.5], [-2884.5, 1893.5]];

const gauged = (g: GameApi) => CASKS.filter((_, i) => g.flag('vhGauge' + i)).length;

// ================================================================ The quay's day work

type QuayDay = { day: number; n: number[] };
const quay = (g: GameApi): QuayDay | null => { const q = g.flag('vhQuay') as QuayDay | undefined; return q && q.day === utcDay() ? q : null; };
const quayDone = (g: GameApi) => { const q = quay(g); return !!q && q.n.includes(-1); };
const chalked = (g: GameApi) => quay(g)?.n.filter((i) => i >= 0).length ?? 0;

const LOT_TOASTS = [
  'Twelve bales of Ansbury linen, bound on for Morrow, the Charter\'s stamp on every one. They match the bill. You chalk them.',
  'Eight casks of Gullmouth tar and a crate of nails. They match the bill. You chalk them.',
  'Sixteen crates of oranges up from the south, smelling of somewhere warmer. One has been opened and is two oranges short. You chalk it, with a note.',
  'Four hogsheads of Kell tobacco under the Customs seal. The seals are whole and they match the bill. You chalk them.',
];

// ================================================================ Hugh Carne

const hugh: DialogueTree = {
  start: (g) => {
    const s = at(g, CASK);
    if (s === 'hugh') return 'w1';
    if (s === 'back') return 'b1';
    return g.flag('vhMetHugh') ? 'hello' : 'h0';
  },
  nodes: {
    h0: { speaker: 'narrator', text: 'A thin man in a black coat gone green at the seams, a gauging rod under one arm like an umbrella and a ledger open on a cask head. He finishes the line he\'s writing before he looks up.', next: 'h1' },
    h1: { text: 'Hugh Carne, Collector of Customs. I weigh it, I gauge it, I stamp it, and I take the king\'s share of it. People like the king\'s share even less than they like me, which is saying something.', effect: (g) => g.setFlag('vhMetHugh', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, CASK) === 'gauge' ? `Dip each cask at the bung. A full one wets the rod to the top mark. ${gauged(g)} of three done.`
        : at(g, CASK) === 'clemency' ? 'Clemency Hart, at the Winery. Ask her how a cask of hers comes to be a hand short.'
        : 'Something to declare? No? Then you\'re the first today.'),
      options: [
        { text: 'What does the Customs do?', next: 'cust' },
        { text: 'Who runs the harbour?', next: 'board' },
        { text: 'Ships go missing out there, I hear.', next: 'lost' },
        { text: 'You look like a man with a problem.', cond: (g) => !at(g, CASK), next: 'q1' },
        { text: 'Good day.' },
      ],
    },
    cust: { text: 'Every cask landed on this quay pays duty, and every hull that ties up pays the Board\'s dues. The dues keep the quay. The duty keeps the king. I keep the count. If the count\'s wrong, somebody is robbing one of them, and usually it\'s both.', next: 'hello' },
    board: { text: 'The Harbour Board. Five chairs: the Portreeve in the middle, Vyvyan for the fish, Tregarthen for the money, Trefusis for the wine, and Kerra Nance for the Guild of the Quay, who thinks the other four are fools. She\'s not often wrong.', next: 'hello' },
    lost: { text: 'Ships go missing everywhere. The sea is large. I stamp what I\'m shown, a clearance for the hold and a date for the tide, and what happens past the Fortress is the sea\'s business, not mine.', next: 'lost2' },
    lost2: { speaker: 'narrator', text: 'He closes the ledger as he says it, and keeps his hand flat on the cover.', next: 'hello' },
    q1: { text: 'Three casks of Trefusis red, bonded for the Gullmouth packet, duty paid on two hundred and forty gallons. The packet\'s mate swears one of them sloshes when it\'s rolled. A full cask doesn\'t slosh.', next: 'q2' },
    q2: {
      text: 'I\'d gauge them myself, but if the Collector stands in the warehouse with a rod in his hand, half the quay comes to watch and the other half goes home to hide something. Take the rod. Dip each one at the bung.',
      options: [
        { text: 'I\'ll gauge them.', effect: (g) => { g.give('vh_rod', 1); g.setStage(CASK, 'gauge'); } },
        { text: 'Not now.' },
      ],
    },
    w1: { text: 'A hand short, and pale? Then somebody drew off the wine and topped the cask up from the pump. That\'s not short measure. That\'s theft, and it\'s the Winery\'s theft, not mine.', next: 'w2' },
    w2: {
      text: 'But the king has had duty on a full cask of wine, and Gullmouth will pay for one, and what they\'ll get is pink water. Go up to the Winery and ask Clemency Hart how a cask of hers comes to be a hand short. If I go, she\'ll think I\'ve come for the duty.',
      options: [{ text: 'I\'ll ask her.', effect: (g) => g.setStage(CASK, 'clemency') }],
    },
    b1: {
      text: (g) => {
        const f = g.flag(CASK);
        if (f === 'law') return 'Josh Teague. I\'ll write it, and the bench will fine him, and he\'ll pay at a mark a week for a year. I hoped it would be somebody without a reason. It never is.';
        if (f === 'paid') return 'Twenty-five marks, for the duty on a hand of wine, paid by a friend of the Winery. It\'s the strangest line in my ledger this year, and I keep the ledger for a harbour full of liars.';
        return 'A leaking stave, topped up honestly from the pump.';
      },
      next: 'b2',
    },
    b2: {
      speaker: 'narrator',
      text: (g) => (g.flag(CASK) === 'law' || g.flag(CASK) === 'paid'
        ? 'He blots the line, and pays you from the strongbox under the cask, and takes his rod back.'
        : 'He looks at you for a long moment over the ledger. Then he writes it down, word for word, and pays you from the strongbox under the cask, and takes his rod back.'),
      options: [{ text: 'Good day, Hugh.', effect: (g) => { g.take('vh_rod', 1); g.addMarks(60); g.setStage(CASK, 'done'); } }],
    },
  },
};

// ================================================================ Clemency and Josh, at the Winery

const clemencyNodes: Record<string, DNode> = {
  cw1: { text: 'Short? My casks go out full. I fill them myself, and Josh bungs them, and Josh rolls them down to the quay.', next: 'cw2' },
  cw2: { speaker: 'narrator', text: 'She stops, and turns round. Behind her at the racks, Josh Teague has gone very still with a mallet in his hand. Then he puts it down.', next: 'cw3' },
  cw3: { speaker: 'narrator', text: '"A jug a week," he says. "No more. My mother\'s chest is bad, and Doctor Rodda\'s draught is four marks a bottle. I sold it to Wat at the Boatman\'s Tail and filled the cask from the pump. I never thought anybody would dip a bonded cask."', next: 'cw4' },
  cw4: {
    text: 'Seven years he\'s been my cellarman. Seven years. It\'s the king\'s duty he\'s cheated as much as me, and the Collector will want a name. What do you think should happen?',
    options: [
      { text: 'Tell the Collector the truth. The law can decide.', moral: { id: 'vhCask:law', tr: { honesty: 3 }, rep: { verandah: 3 }, npc: { ver_josh: -20, ver_clemency: 5 } }, effect: (g) => { g.setFlag(CASK, 'law'); g.setStage(CASK, 'back'); }, next: 'cwL' },
      { text: 'Keep him on and let him pay you back. I\'ll pay Hugh the duty myself. (25 marks)', need: { trait: { compassion: [57, 100] } }, cond: (g) => g.marks >= 25,
        moral: { id: 'vhCask:paid', a: 5, tr: { compassion: 3, generosity: 3 }, rep: { verandah: 2 }, npc: { ver_josh: 25, ver_clemency: 15 }, note: 'Paid the duty on a watered cask so the Winery\'s cellarman, who stole for his mother\'s medicine, could keep his place.', fame: 'paid Josh Teague\'s debt to the Customs', spread: 'local' },
        effect: (g) => { g.addMarks(-25); g.setFlag(CASK, 'paid'); g.setStage(CASK, 'back'); }, next: 'cwP' },
      { text: 'I\'ll tell Hugh it was a leaking stave, topped up honestly.', moral: { id: 'vhCask:stave', tr: { deception: 3, compassion: 1 }, npc: { ver_josh: 15, ver_clemency: 5 } }, effect: (g) => { g.setFlag(CASK, 'stave'); g.setStage(CASK, 'back'); }, next: 'cwS' },
      { text: 'Nobody needs to know, if the Winery makes it worth my while.', need: { band: ['bad', 'evil'] },
        moral: { id: 'vhCask:hush', a: -8, tr: { greed: 4, cruelty: 2 }, rep: { verandah: -3 }, npc: { ver_clemency: -30, ver_josh: -25 }, note: 'Made the Verandah Winery pay for silence over a watered cask.' },
        effect: (g) => { g.addMarks(40); g.setFlag(CASK, 'hush'); g.setStage(CASK, 'back'); }, next: 'cwH' },
    ],
  },
  cwL: { text: 'He\'ll be fined, and he\'ll lose his place, because I can\'t keep a man the Customs has written down. You\'re right. I hate that you\'re right. Go and tell Hugh.' },
  cwP: { text: 'You\'d pay it? For Josh? You don\'t know Josh. He\'s going to work it off, every mark, and he\'s going to bring his mother a bottle of the good red at Christmas, and pay for that too.' },
  cwS: { text: 'A leaking stave. Hugh Carne won\'t believe it, and he\'ll write it down anyway, because he can\'t prove otherwise. Josh, go and look at every stave in this cellar. Now.' },
  cwH: { speaker: 'narrator', text: 'Clemency counts forty marks out of the till onto the counter without a word, and pushes them across to you, and does not take her hand off the last one until you\'ve looked at her. "Tell Hugh whatever you like," she says. "And don\'t come back up this hill."' },
  cwAfter: {
    text: (g) => {
      const f = g.flag(CASK);
      if (f === 'paid') return 'Josh has paid back nine marks of your twenty-five. He keeps the count on the cellar door in chalk. I think he likes doing it.';
      if (f === 'law') return 'I\'ve a new cellarman. He\'s honest and slow and I miss Josh every day. Wat at the Boatman\'s Tail took him on, of all people.';
      if (f === 'stave') return 'Every stave in my cellar has been looked at twice. Josh found two bad ones, which I think surprised him.';
      return 'I\'ve nothing to say to you.';
    },
  },
};

// ================================================================ Kerra Nance

const kerra: DialogueTree = {
  start: (g) => {
    if (at(g, BUOY) === 'kerra') return 'kb1';
    return g.flag('vhMetKerra') ? 'hello' : 'k0';
  },
  nodes: {
    k0: { speaker: 'narrator', text: 'A broad woman of sixty in a pilot\'s coat with brass buttons, sou\'wester pushed back, looking out past the pier end at the harbour mouth as though it owed her money.', next: 'k1' },
    k1: { text: 'Kerra Nance. I pilot, and I\'m master of the Guild of the Quay this year, which means every docker with a grievance knows where I stand. I stand here.', effect: (g) => g.setFlag('vhMetKerra', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, BUOY) === 'sands' ? 'The Long Sands, east of the town. Bring me the shackle off that buoy.' : 'Mind the edge. The pier\'s wet.'),
      options: [
        { text: 'What is the Guild of the Quay?', next: 'guild' },
        { text: 'What does a pilot do?', next: 'pilot' },
        { text: 'You\'re watching the harbour mouth as if it owes you money.', cond: (g) => !at(g, BUOY), next: 'q1' },
        { text: 'About the buoy.', cond: (g) => at(g, BUOY) === 'done', next: 'kAfter' },
        { text: 'Good day.' },
      ],
    },
    guild: { text: 'The dockers, the lightermen and the pilots. Everybody who touches a ship between the bar and the warehouse. The houses own the ships and the king owns the dues, but nothing moves on this quay unless we move it. My boy Bryok is down the far end, tying off badly. He keeps the Guild\'s tally book, if you want a day\'s work.', next: 'hello' },
    pilot: { text: 'There\'s a sand bar across the harbour mouth that moves every winter. A master who doesn\'t know it puts his ship on it. I know it. I take her in for four marks a foot of draught, and I\'ve not put one on the bar in thirty years.', next: 'hello' },
    q1: { text: 'The bar buoy\'s gone. A cask float with a bell in a cage on top, chained to a stone on the bar, so a ship can hear where the bar is in fog. It was ringing last night. This morning, nothing. The packet comes in on the evening tide, and her master\'s new.', next: 'q2' },
    q2: {
      text: 'The fishers say there\'s a buoy up on the Long Sands, east of the town, with crabs all over it. Bring me the shackle off it, the iron that held it to the chain. The shackle will tell me what happened.',
      options: [{ text: 'I\'ll fetch it.', effect: (g) => g.setStage(BUOY, 'sands') }, { text: 'Not now.' }],
    },
    kb1: { speaker: 'narrator', text: 'She turns the shackle over in her fingers, then holds it up to her eye and looks through the empty pin hole at the harbour mouth.', next: 'kb2' },
    kb2: { text: 'Pins don\'t walk. A storm parts the chain, or salt eats the shackle through. This is sound iron, and the pin was drawn with a spanner. Look, the thread\'s bright. Somebody rowed out to the bar in the dark and let my buoy go.', next: 'kb3' },
    kb3: {
      text: 'I\'ll have the spare out on the bar before the packet\'s in. But I want to know who wants a harbour mouth with no bell in it. Who would you tell, if it were yours?',
      options: [
        { text: 'Captain Morvah at Awschitz. Her cutter watches the water.', moral: { id: 'vhBuoy:morvah', tr: { honesty: 1 }, rep: { verandah: 2 }, npc: { vh_kerra: 5 } }, effect: (g) => { g.take('vh_shackle', 1); g.setFlag(BUOY, 'morvah'); g.addMarks(55); g.setStage(BUOY, 'done'); }, next: 'kbM' },
        { text: 'Keep it in the Guild. Pilots watch the bar better than soldiers do.', moral: { id: 'vhBuoy:guild', rep: { verandah: 1 }, npc: { vh_kerra: 10 } }, effect: (g) => { g.take('vh_shackle', 1); g.setFlag(BUOY, 'guild'); g.addMarks(55); g.setStage(BUOY, 'done'); }, next: 'kbG' },
      ],
    },
    kbM: { text: 'Morvah. She\'ll say it was the Black Gulls, because she says everything is. Maybe she\'s right. I\'ll send Bryok round to Awschitz in Wenna\'s boat. Here, for your trouble.' },
    kbG: { text: 'That\'s what I\'d have said. I\'ll put a boy out on the bar every night with a lantern and a whistle, and whoever comes to draw the next pin will have company. Here, for your trouble.' },
    kAfter: {
      text: (g) => (g.flag(BUOY) === 'morvah'
        ? 'Morvah sent the Vigilant\'s boat out to the bar three nights running. Nobody came. Whoever it was knows the cutter\'s hours better than I\'d like.'
        : 'My boys sit out on the bar of a night with a lantern. Nobody\'s come. They will. You don\'t draw one pin and stop.'),
      next: 'hello',
    },
  },
};

// ================================================================ Bryok Nance, the Guild's tally

const bryok: DialogueTree = {
  start: (g) => (g.flag('vhMetBryok') ? 'hello' : 'y0'),
  nodes: {
    y0: { speaker: 'narrator', text: 'A big young man with a sandy beard and his mother\'s jaw, retying a mooring line for the third time, the Guild\'s tally book stuffed in his coat.', next: 'y1' },
    y1: { text: 'Bryok Nance. Dockhand. And I keep the Guild\'s tally, because I\'m the only one on the quay who can add up and carry a crate at the same time.', effect: (g) => g.setFlag('vhMetBryok', 1), next: 'hello' },
    hello: {
      text: (g) => (quay(g) && !quayDone(g) ? `The tally. ${chalked(g)} of four lots chalked.` : 'Mind the rope.'),
      options: [
        { text: 'Any work on the quay?', cond: (g) => !quay(g), next: 'kq1' },
        { text: 'The tally\'s done.', cond: (g) => !!quay(g) && !quayDone(g) && chalked(g) >= LOTS.length, next: 'kq3' },
        { text: 'Any more work?', cond: (g) => quayDone(g), next: 'kq4' },
        { text: 'Your mother says that\'s a granny knot.', next: 'knot' },
        { text: 'Good day.' },
      ],
    },
    knot: { text: 'It\'s not. It\'s a. It is, isn\'t it. Don\'t tell her.', next: 'hello' },
    kq1: {
      text: 'There\'s always work. The morning packet\'s cargo wants tallying before it goes up to the warehouse: four lots, two on the pier and two on the quay. Check each lot\'s marks against the bill and chalk it. Twelve marks for the turn.',
      options: [{ text: 'I\'ll take a turn.', effect: (g) => g.setFlag('vhQuay', { day: utcDay(), n: [] }) }, { text: 'Not today.' }],
    },
    kq3: {
      text: 'All four, and they match the bill, near enough. Two oranges short. Mother will want my pockets turned out. Here.',
      options: [{ text: 'Thanks, Bryok.', effect: (g) => { const q = quay(g); if (!q) return; g.setFlag('vhQuay', { day: q.day, n: [...q.n, -1] }); g.addMarks(12); g.setFlag('n:contracts', Number(g.flag('n:contracts') ?? 0) + 1); } }],
    },
    kq4: { text: 'Not today. The next packet\'s in tomorrow morning. Come back then.', next: 'hello' },
  },
};

// ================================================================ Grace Vyvyan

const grace: DialogueTree = {
  start: (g) => (g.flag('vhMetGrace') ? 'hello' : 'g0'),
  nodes: {
    g0: { speaker: 'narrator', text: 'A small, upright woman of seventy in black, with a slate and a stub of chalk, counting herring barrels off a fishing boat and moving her lips.', next: 'g1' },
    g1: { text: 'Forty-one. Don\'t speak, I\'ll lose my count. Forty-two. Forty-three. There. Grace Vyvyan. What do you want?', effect: (g) => g.setFlag('vhMetGrace', 1), next: 'hello' },
    hello: {
      text: 'Well?',
      options: [
        { text: 'House Vyvyan?', next: 'house' },
        { text: 'You count the barrels yourself?', next: 'count' },
        { text: 'How is the fishing?', next: 'fish' },
        { text: 'Good day.' },
      ],
    },
    house: { text: 'Salt and fish. We own the herring boats, most of them, and the sheds, and we lease the rest to families who\'ve fished for us since my grandfather\'s day. Tregarthen has the money and Trefusis has the land. We have the smell. Most years, it pays better than either.', next: 'hello' },
    count: { text: 'My father counted them. His mother counted them. A Vyvyan who stops counting gets robbed by the second Tuesday.', next: 'hello' },
    fish: { text: 'The fishing\'s good. It\'s the boats that are bad. Three boats in a year, gone off the grounds in fair weather, and every one of them mine. The Board says it\'s the Black Gulls. Captain Morvah says it\'s the Black Gulls. I say no wrecker takes a boat in daylight on a flat sea without somebody seeing it, and nobody saw.', next: 'hello' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [CASK]: {
    id: CASK, name: 'Short Measure', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'gauge') return 'Hugh Carne, the Collector of Customs, thinks one of three bonded casks of Trefusis wine in the port warehouse is short. Dip each at the bung with his gauging rod.';
      if (s === 'hugh') return 'One cask is a hand short, and what\'s in it is watered. Hugh should hear it.';
      if (s === 'clemency') return 'Somebody drew off the wine and topped the cask up from the pump. Ask Clemency Hart at the Winery how that happened.';
      if (s === 'back') return 'Josh Teague, the Winery\'s cellarman, sold a jug a week to pay for his mother\'s medicine. Back to Hugh Carne with the answer.';
      const f = g.flag(CASK);
      return f === 'law' ? 'Josh Teague was fined and lost his place.' : f === 'paid' ? 'I paid the duty, and Josh kept his place.' : f === 'stave' ? 'I told Hugh it was a leaking stave.' : 'The Winery paid me to keep quiet.';
    },
    objectives: (g, s) => (s === 'gauge' ? CASKS.map((_, i) => ({ text: `Gauge the ${['first', 'second', 'third'][i]} cask`, done: !!g.flag('vhGauge' + i), marker: 'vhGauge' + i }))
      : s === 'hugh' || s === 'back' ? [{ text: 'Talk to Hugh Carne in the warehouse', marker: 'vh_hugh' }]
      : s === 'clemency' ? [{ text: 'Ask Clemency Hart at the Winery', marker: 'ver_clemency' }] : []),
    advance: (g, s) => (s === 'gauge' && gauged(g) >= CASKS.length ? 'hugh' : null),
    marks: (_g, s): Marks => (!s ? { vh_hugh: '!' } : s === 'hugh' || s === 'back' ? { vh_hugh: '?' } : s === 'clemency' ? { ver_clemency: '?' } : {}),
    walk: { cast: ['vh_hugh', 'ver_clemency'] },
  },
  [BUOY]: {
    id: BUOY, name: 'Off Station', region: 'verandah', depth: 'quest',
    notes: (g, s) => {
      if (s === 'sands') return 'The bell buoy on Verandah\'s harbour bar is gone. Kerra Nance, the pilot, wants the shackle off it. The fishers say it came ashore on the Long Sands.';
      if (s === 'kerra') return 'The buoy\'s shackle was open, its pin drawn. Bring it to Kerra on the pier.';
      return g.flag(BUOY) === 'morvah' ? 'Somebody let the bar buoy go. Captain Morvah at Awschitz has been told.' : 'Somebody let the bar buoy go. The Guild of the Quay is watching the bar.';
    },
    objectives: (g, s) => (s === 'sands' ? [{ text: `Clear the crabs off the buoy (${Math.min(CRABS.length, killed(g, 'vhCrabs'))}/${CRABS.length})`, done: killed(g, 'vhCrabs') >= CRABS.length }, { text: 'Take the shackle off the buoy', marker: 'vhBuoyThing', done: !!g.flag('vhShackle') }]
      : s === 'kerra' ? [{ text: 'Bring the shackle to Kerra Nance', marker: 'vh_kerra' }] : []),
    advance: (g, s) => (s === 'sands' && g.flag('vhShackle') ? 'kerra' : null),
    marks: (_g, s): Marks => (!s ? { vh_kerra: '!' } : s === 'kerra' ? { vh_kerra: '?' } : {}),
    walk: { cast: ['vh_kerra'], kill: { sands: [['crab', 3]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'vhCrabs', type: 'crab', at: CRABS, when: (g) => at(g, BUOY) === 'sands' },
];

const CASK_TOASTS = [
  'You draw the bung and lower the rod. It comes up wet to the top mark, dark red, smelling of blackberries and oak. Full.',
  'The rod comes up wet a hand short of the mark, and the wine on it is thin and pale, nearer pink than red. You taste it off your finger: wine and water, and not much of the wine.',
  'Wet to the top mark, and a good year by the smell. Full.',
];

const things: WorldThing[] = [
  ...CASKS.map(([x, z], i): WorldThing => ({
    id: 'vhGauge' + i, x, z, y: 23, label: 'Gauge the cask', radius: 1.8, look: 'none',
    when: (g) => at(g, CASK) === 'gauge' && !g.flag('vhGauge' + i),
    use: (g) => { g.setFlag('vhGauge' + i, 1); g.toast(CASK_TOASTS[i]); },
  })),
  {
    id: 'vhBuoyThing', x: BUOY_AT.x, z: BUOY_AT.z, label: 'Look at the buoy', radius: 2.4, look: 'buoy',
    when: (g) => at(g, BUOY) === 'sands' && !g.flag('vhShackle'),
    use: (g) => {
      if (killed(g, 'vhCrabs') < CRABS.length) { g.toast('The crabs are all over it. Clear them off first.'); return; }
      g.setFlag('vhShackle', 1); g.give('vh_shackle', 1);
      g.toast('The buoy lies over in the sand with its bell cage bent, a red and white cask float as tall as you are. The chain is still on it, four links and a shackle, and the shackle is open. Not broken: open. The pin that closes it is gone. You knock the shackle off the last link and take it.');
    },
  },
  ...LOTS.map(([x, z], i): WorldThing => ({
    id: 'vhLot' + i, x, z, label: 'Check the lot against the bill', radius: 2, look: 'crate',
    when: (g) => { const q = quay(g); return !!q && !q.n.includes(-1) && !q.n.includes(i); },
    use: (g) => { const q = quay(g); if (!q) return; g.setFlag('vhQuay', { day: q.day, n: [...q.n, i] }); g.toast(LOT_TOASTS[i]); },
  })),
];

const NPCS: NpcDef[] = [
  { id: 'vh_hugh', name: 'Hugh Carne', title: 'Collector of Customs', look: { skin: '#d8b090', hair: '#5a4a3a', hairStyle: 0, eyes: '#4a5a6a', tunic: '#1e1e22', trim: '#3a4a3a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', hat: 'wide', hatColor: '#1e1e22', build: 0.9, age: 0.55 },
    schedule: [{ from: 7, to: 19, at: [HUGH.x, HUGH.z], face: [HUGH.x + 3, HUGH.z], anim: 'idle', y: HUGH.y }],
    barks: ['Two hundred and forty gallons, the bill says. We\'ll see.', 'Duty\'s paid at the warehouse, not on the pier.'] },
  { id: 'vh_kerra', name: 'Kerra Nance', title: 'Pilot, master of the Guild of the Quay', look: { frame: 'f', skin: '#c89070', hair: '#8a8a82', hairStyle: 2, eyes: '#4a5a6a', tunic: '#22304a', trim: '#c8a050', shirt: '#d8d0c0', trousers: '#2a2a30', boots: '#1e1a16', hat: 'wide', hatColor: '#2a2a2e', build: 1.25, age: 0.65, lashes: true },
    schedule: [{ from: 6, to: 20, at: [KERRA.x, KERRA.z], face: [KERRA.x, KERRA.z - 4], anim: 'idle', y: KERRA.y }],
    barks: ['Flood in an hour. Mind the bar.', 'Bryok! That\'s a granny knot!'] },
  { id: 'vh_grace', name: 'Grace Vyvyan', title: 'House Vyvyan', look: { frame: 'f', skin: '#e2c0a0', hair: '#e8e4dc', hairStyle: 5, eyes: '#3a4a5a', tunic: '#1a1a1e', trim: '#5a5a62', shirt: '#e8e0d0', trousers: '#1a1a1e', boots: '#1e1a16', build: 0.85, age: 0.85, lashes: true },
    schedule: [{ from: 6, to: 14, at: [GRACE.x, GRACE.z], face: [GRACE.x + 3, GRACE.z], anim: 'idle', y: GRACE.y }],
    barks: ['Thirty-eight. Thirty-nine.', 'That barrel\'s short. Fill it.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'vh_rod', name: 'Gauging rod', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'rod', a: '#c8a060', b: '#3a2a1e' }, desc: 'The Collector\'s brass-shod rod, notched for gallons, for dipping a cask at the bung.' },
  { id: 'vh_shackle', name: 'Buoy shackle', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'ring', a: '#5a5a5e', b: '#c8a050' }, desc: 'An iron shackle off the harbour bar buoy, open, its pin drawn. The thread is bright.' },
];

export const VERANDAH_HARBOUR: RegionContent = {
  id: 'verandahHarbour',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { vh_hugh: hugh, vh_kerra: kerra, vh_grace: grace, ver_dock_bryok: bryok },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'ver_clemency', () => undefined, clemencyNodes);
    addOption(D, 'ver_clemency', 'hello', { text: 'About a cask of yours in the King\'s warehouse.', cond: (g) => at(g, CASK) === 'clemency', next: 'cw1' });
    addOption(D, 'ver_clemency', 'hello', { text: 'How\'s Josh?', cond: (g) => at(g, CASK) === 'done', next: 'cwAfter' });
  },
};
