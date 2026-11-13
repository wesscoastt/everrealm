import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { QuestSpawn } from '../places_regional';
import { ASHORE, cellOf, YARD } from '../skua';
import { addOption, at, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// THE RED LAMP (owner 2026-11-13, docs/briefs/daejon-love.md: "a questline where you break someone out of prison named
// Daejon Love, after a good amount of questing they become a companion"). Daejon Love is on Skua Rock for the wreck
// of the Constance: the Verandah garrison found him on Awschitz Head with a lamp in his hand the night she struck.
// He had run with the Black Gull's wreckers at nineteen. That night, at thirty, he lit a red lamp to turn her away,
// and was too late. Aldous Penberthy, Gullmouth's harbour reeve, gave the evidence that put him on the Rock; Penberthy
// ran the Gull's shore lamps for twenty years.
//
// dlQuest stages: visit (Daejon, on the Rock) -> glass (the red lamp-glass in the gorse on Awschitz Head) -> morvah
// (Captain Morvah: she believes it, and can't act on it, and won't chase him) -> basket (Kezia's fish basket, with a
// file and a line in it) -> smuggle (to Daejon) -> shore (the dunes north of Gullmouth after dark) -> fight (the
// turnkeys who followed him) -> free (Daejon, wet through) -> wait (eight more quests done anywhere: he hides on the
// Mewstones) -> word (he sends for you) -> store (the Gull's lamp store on Awschitz Head: Penberthy's tally-book) ->
// reeve (Penberthy, on Gullmouth quay; what you do with the book is yours) -> done. Daejon joins either way.

const Q = 'dlQuest';
const stage = (g: GameApi) => at(g, Q);
const night = (g: GameApi) => { const h = g.compHour(); return h >= 20 || h < 5; };
const WAIT_QUESTS = 8;
const waited = (g: GameApi) => Math.max(0, g.questsDone() - Number(g.flag('dl:doneAt') ?? 0));

/** Kezia Love's stall on Gullmouth quay; the red glass on Awschitz Head; the Gull's lamp store under the gorse; Daejon on the Mewstones. */
const KEZIA: [number, number] = [1781.5, 600.5];
const GLASS: [number, number] = [-3470.5, 1912.5];
const STORE: [number, number] = [-3477.5, 1918.5];
const MEW: [number, number] = [2352.5, 727.5];
const REEVE: [number, number] = [1795.5, 588.5];
const CELL = cellOf('n', 0, 6);
const SHORE: [number, number] = [ASHORE.x + 0.5, ASHORE.z + 0.5];

export const DAEJON_LOOK: NonNullable<NpcDef['look']> = { skin: '#6a4430', hair: '#1a1a1e', hairStyle: 3, facial: 2, eyes: '#3a2a1e', tunic: '#3a4a3a', trim: '#c8a050', shirt: '#e8e0d0', trousers: '#2a2a30', boots: '#1e1a16', top: 7, build: 1.12, age: 0.35 };
const GREYS = { ...DAEJON_LOOK, tunic: '#5a5650', trim: '#3a3632', shirt: '#7a7670', trousers: '#4a4640', boots: '#2a2420', top: 0 };
const WET = { ...GREYS, tunic: '#3a3a36', trousers: '#2e2e2a' };

const items: ItemDef[] = [
  { id: 'dl_red_glass', name: 'Red lamp-glass', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'gel', a: '#c8281e', b: '#5a1410' },
    desc: 'A curved pane of red glass from a storm lantern, cracked across, the soot still on the inside. Red, not white. On this coast red means keep off.', stats: 'Daejon Love’s' },
  { id: 'dl_basket', name: 'Kezia’s fish basket', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#a8844a', b: '#5a3a1a' },
    desc: 'Pilchards on top. Under the pilchards, wrapped in oilcloth, a short file and forty feet of tarred line.', stats: 'For Daejon, on Skua Rock' },
  { id: 'dl_tally', name: 'The Black Gull’s tally-book', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'book', a: '#2a1e14', b: '#c8a050' },
    desc: 'Twenty years of a wrecker’s accounts in a careful hand: what came ashore, who lit the lamps, who was paid. Every page is initialled A.P.', stats: 'From the Gull’s lamp store' },
];

const npcs: NpcDef[] = [
  { id: 'dl_kezia', name: 'Kezia Love', title: 'Net floats and corks, Gullmouth quay',
    look: { frame: 'f', skin: '#7a4a32', hair: '#1a1410', hairStyle: 4, eyes: '#3a2a1e', tunic: '#7a3a2a', trim: '#e8dcc0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, age: 0.3 },
    schedule: [{ from: 7, to: 20, at: KEZIA, face: [KEZIA[0] + 3, KEZIA[1]], anim: 'idle' }],
    barks: ['Floats! Cork floats, glass floats!', 'You’re looking at the Rock. Everyone looks at the Rock.'] },
  // Daejon on the Rock: the yard by day, his cell at night (until he comes off it)
  { id: 'dl_daejon', name: 'Daejon Love', title: 'Skua Rock, for the Constance', look: GREYS,
    schedule: [
      { from: 6, to: 21, at: [YARD.x0 + 20.5, YARD.z0 + 9.5], face: [YARD.x0 + 20.5, YARD.z0 + 4], anim: 'idle' },
      { from: 21, to: 24, at: [CELL.x + 1.5, (CELL.z0 + CELL.z1) / 2 + 0.6], face: [CELL.x + 1.5, CELL.doorZ - 3], anim: 'idle', y: CELL.y },
      { from: 0, to: 6, at: [CELL.x + 1.5, (CELL.z0 + CELL.z1) / 2 + 0.6], face: [CELL.x + 1.5, CELL.doorZ - 3], anim: 'idle', y: CELL.y },
    ],
    when: (g) => !g.flag('dl:off'),
    barks: ['They count us twice a day. I count them back.', 'You can see Gullmouth from the yard wall. You can’t hear it. That’s the worst part.'] },
  { id: 'dl_daejon_shore', name: 'Daejon Love', title: 'Off the Rock', look: WET,
    schedule: [{ from: 0, to: 24, at: SHORE, face: [SHORE[0], SHORE[1] + 4], anim: 'idle' }],
    when: (g) => stage(g) === 'free', barks: ['I’m cold to the bone and I’ve never been happier.'] },
  { id: 'dl_daejon_mew', name: 'A bearded stranger', title: 'The Mewstones', look: { ...DAEJON_LOOK, hat: 'wide', hatColor: '#2a2420', facial: 4 },
    schedule: [{ from: 0, to: 24, at: MEW, face: [MEW[0] - 3, MEW[1]], anim: 'idle' }],
    when: (g) => ['wait', 'word', 'store', 'reeve'].includes(stage(g) ?? ''), barks: ['Fine weather for it.', 'Never seen you before in my life.'] },
  { id: 'dl_penberthy', name: 'Aldous Penberthy', title: 'Harbour reeve, Gullmouth',
    look: { skin: '#e8c4a0', hair: '#c8c4bc', hairStyle: 1, eyes: '#5a6a7a', tunic: '#2a2a3a', trim: '#c8a050', shirt: '#f0ece0', trousers: '#2a2a30', boots: '#1a1612', hat: 'tophat', hatColor: '#1a1a1e', top: 7, build: 1.05, age: 0.7 },
    schedule: [{ from: 8, to: 19, at: REEVE, face: [REEVE[0] + 3, REEVE[1]], anim: 'idle' }],
    when: (g) => g.flag('dl:end') === undefined || g.flag('dl:end') === 'paid',
    barks: ['Dues by the tide, not after.', 'A well-run harbour is a quiet harbour.'] },
];

// ---------------------------------------------------------------- the conversations

const kezia: DialogueTree = {
  start: (g) => (stage(g) === 'basket' ? 'basket' : stage(g) === undefined ? 'hello' : stage(g) === 'done' ? 'after' : 'again'),
  nodes: {
    hello: {
      text: 'Floats, if you want them. Cork’s cheaper, glass lasts. You’re not here for floats. You were looking at the Rock, out past the harbour wall. Everyone does, the first time.',
      options: [
        { text: 'Do you know someone out there?', next: 'brother' },
        { text: 'Just looking. Good day.' },
      ],
    },
    brother: {
      text: 'My brother. Daejon Love. They say he lit a false light on Awschitz Head and drowned eleven men off the Constance. He says he lit a light to save them, and was too late. I believe him. I’m his sister, so nobody cares that I believe him.',
      options: [{ text: 'Why tell me?', next: 'why' }],
    },
    why: {
      text: 'Because the Tern takes him to the Harrowgate mines at the end of the month, and men don’t come back from the mines, and you look like someone who goes places other people don’t. The supply boat takes visitors out from the south jetty. Go and hear it from him. If you think he’s lying after, I’ll never ask you for anything again.',
      options: [
        { text: 'I’ll go and see him.', effect: (g) => g.setStage(Q, 'visit') },
        { text: 'I can’t promise anything.', effect: (g) => g.setStage(Q, 'visit'), next: 'cant' },
      ],
    },
    cant: { text: 'Nobody can. Go anyway.' },
    again: { text: (g) => (stage(g) === 'shore' ? 'Tonight. The dunes north of town, after dark. I can’t be there: they watch me. Bring him in safe.' : stage(g) === 'wait' || stage(g) === 'word' ? 'He’s alive. That’s more than I had a month ago. I don’t ask where he is. Don’t tell me.' : 'Have you seen him? How did he look? No. Don’t tell me. Just help him.') },
    basket: {
      text: 'The captain won’t chase him. Then he goes tonight. I packed this already. I’ve had it packed for a month. Pilchards on top, and under them a file and forty feet of line. Take it out on the supply boat. They search the visitors. They never search the fish.',
      options: [{ text: 'Give it to me.', effect: (g) => { g.give('dl_basket'); g.setStage(Q, 'smuggle'); } }],
    },
    after: { text: 'He came home. He comes by the stall and pretends he’s buying floats. I let him pretend. Thank you. I’ll keep saying it until you stop coming to the quay.' },
  },
};

const daejon: DialogueTree = {
  start: (g) => (stage(g) === 'visit' ? 'meet' : stage(g) === 'smuggle' ? 'smuggle' : stage(g) === 'glass' || stage(g) === 'morvah' || stage(g) === 'basket' ? 'wait' : 'stranger'),
  nodes: {
    stranger: { text: 'Don’t stand too near the wall. The tower thinks anyone near the wall is planning something. They’re usually right.' },
    meet: {
      text: 'Kezia sent you. She has a look she puts on people. You’ve got it on you. Sit, if you like. The stone’s warm by afternoon. I’m Daejon. You know what I’m supposed to have done.',
      options: [
        { text: 'Tell me what you did do.', next: 'night' },
        { text: 'Did you light the false light?', next: 'night' },
      ],
    },
    night: {
      text: 'I ran with the Black Gull when I was nineteen. I’ll say that first, because someone will say it for me if I don’t. I held the lamps. I watched ships come onto the rocks, and I took my share, and I told myself the sea did it. Then I stopped. Ten years I stopped. The night the Constance came round the head, I knew the Gull was out, because I know how they work. I took a red lamp up the headland. Red means keep off. White means come in, harbour this way. I was too slow. She struck while I was still getting it lit.',
      options: [{ text: 'And the garrison found you with a lamp in your hand.', next: 'found' }],
    },
    found: {
      text: 'Lit. Red. Nobody asked what colour it was. One man stood up at the assize and swore it was white, and he was a man people believe. When they took me down off the headland I dropped the glass in the gorse. If it’s still there, it’s red, and it’s mine, and it’s the only thing in the world that says I’m telling you the truth.',
      options: [
        { text: 'Who swore it was white?', next: 'who' },
        { text: 'I’ll look for the glass.', effect: (g) => g.setStage(Q, 'glass'), next: 'go' },
      ],
    },
    who: {
      text: 'I’m not going to say his name in here. Kezia sells floats on the same quay he walks every morning. Find the glass. Show it to the captain at Awschitz, Morvah. She was there that night. She looked at me like she wasn’t sure. That’s more than anyone else did.',
      options: [{ text: 'I’ll look for the glass.', effect: (g) => g.setStage(Q, 'glass'), next: 'go' }],
    },
    go: { text: 'The gorse on the headland, west of the new dock. Waist-high, and it bites. Thank you. Whatever happens. I mean that.' },
    wait: { text: (g) => (stage(g) === 'basket' ? 'Kezia will know what to do. She always does. She’s been waiting for someone to say yes for a month.' : 'Have you found it? Red glass, in the gorse on Awschitz Head. Then Morvah. Please.') },
    smuggle: {
      text: 'Pilchards. She remembered I hate pilchards. That means look underneath. Right. Tonight, after lights out. There’s a way off this rock everybody knows about and nobody’s fool enough to take: the corridor roof, the pipe, the gully, the water. I’ll take it. Be on the dunes north of Gullmouth after dark. If I don’t come in by dawn, tell Kezia I tried.',
      options: [{ text: 'I’ll be there.', effect: (g) => { g.take('dl_basket'); g.setStage(Q, 'shore'); } }],
    },
  },
};

/** On the dunes after dark: he comes in on a float, and the turnkeys come in behind him. */
const sceneShore: DialogueTree = {
  start: () => 's1',
  nodes: {
    s1: { speaker: 'narrator', text: 'A long while of nothing but the surf. Then something low and dark on the water, a man lying on a float made of oilskins and driftwood, kicking for the beach.', next: 's2' },
    s2: { text: 'Don’t help me up. If you help me up I’ll fall over. Give me a moment. I came off the roof, down the pipe, down the gully. The gully has opinions about knees.', next: 's3' },
    s3: { speaker: 'narrator', text: 'Behind him, a lantern on the water. Oars. A boat grinds onto the sand, and three turnkeys from the Rock climb out with their staves.', next: 's4' },
    s4: { text: 'They’re quicker than I thought. I can’t fight like this. Can you?', effect: (g) => g.setStage(Q, 'fight') },
  },
};

const daejonShore: DialogueTree = {
  start: () => 'f1',
  nodes: {
    f1: { text: 'They’ll wake up with sore heads and a story about twenty of us. Let them. Listen. I can’t go home. They’ll watch the quay and Kezia’s door for a year. There’s a hamlet on the Mewstones, out past the point, where nobody asks a bearded man his business. I’ll grow a better beard.', next: 'f2' },
    f2: { text: 'The glass isn’t enough. I know that. But the man who swore against me kept books, because men like him always keep books, and I know where the Gull kept everything it didn’t want found. Give me time to remember it right. Go and live your life. I’ll send for you.',
      options: [{ text: 'I’ll come when you send.', effect: (g) => { g.setFlag('dl:off', 1); g.setFlag('dl:doneAt', g.questsDone()); g.setStage(Q, 'wait'); } }] },
  },
};

const daejonMew: DialogueTree = {
  start: (g) => (stage(g) === 'wait' ? 'early' : stage(g) === 'word' ? 'w1' : stage(g) === 'store' ? 'store' : 'reeve'),
  nodes: {
    early: { text: (g) => `Never seen you before in my life. That’s what I tell everyone. You, I’m glad to see. I’m still putting it together, where the Gull kept its books. Come back when you’ve been about the world a while. ${WAIT_QUESTS - Math.min(WAIT_QUESTS, waited(g))} more of whatever it is you do.` },
    w1: {
      text: 'You came. Sit down. I remembered. The Gull kept a store dug into Awschitz Head, under the gorse, west of where I dropped the glass: lamps, oil, the shares before they were shared. And the tally. Twenty years of it, every page initialled by the man who ran the lamps. Aldous Penberthy. The harbour reeve. The man who swore my light was white.',
      options: [
        { text: 'Why didn’t you say his name before?', next: 'w2' },
        { text: 'I’ll find the store.', effect: (g) => g.setStage(Q, 'store'), next: 'w3' },
      ],
    },
    w2: { text: 'Because I was on the Rock and Kezia was on his quay. Now I’m off it, and I’m done being quiet. Find the store. Bring me the book. Then we go and see him together. I want to look at him while you read it.', options: [{ text: 'I’ll find the store.', effect: (g) => g.setStage(Q, 'store'), next: 'w3' }] },
    w3: { text: 'West of the glass, a slab in the gorse with a gull scratched in it. Lift it. Mind the oil, it’s been down there years.' },
    store: { text: 'The slab with the gull on it, west of where I dropped the glass. Bring me the book.' },
    reeve: { text: 'You’ve got it. Then we go to Gullmouth. He stands on the quay every morning, counting other people’s money. I’ll be behind you. Read it to him.' },
  },
};

const reeve: DialogueTree = {
  start: (g) => (stage(g) === 'reeve' && g.has('dl_tally') ? 'r1' : g.flag('dl:end') === 'paid' ? 'paid' : 'hello'),
  nodes: {
    hello: { text: 'Aldous Penberthy, reeve of this harbour. Dues by the tide, not after. If you’ve a complaint, the office is open until four.' },
    paid: { text: 'We have nothing further to discuss. Good day.' },
    r1: {
      speaker: 'narrator', text: 'Penberthy sees the book in your hand before he sees your face. He sees Daejon after that, standing behind you with his hat off, and for a moment the reeve of Gullmouth looks like an old man who has been waiting twenty years for a knock on the door.',
      next: 'r2',
    },
    r2: {
      text: 'Love. They told me you drowned off the Rock. Well. That is a ledger of no importance, a merchant’s accounts, nothing. Whatever he has told you is the word of a convicted wrecker against the reeve of this harbour. Think very carefully, friend.',
      options: [
        { text: '“A.P.” on every page, and the Constance’s cargo in your hand. This goes to Captain Morvah.', next: 'law' },
        { text: 'Daejon. It’s yours. What do you want done with it?', next: 'his' },
        { text: 'Five hundred marks, and I’ll burn it here on the quay.', next: 'paid1' },
      ],
    },
    law: {
      text: 'You will regret this. No. No, I don’t suppose you will.',
      effect: (g) => { g.take('dl_tally'); g.setFlag('dl:end', 'law'); },
      next: 'lawD',
    },
    lawD: { as: 'dl_daejon_mew', text: 'Eleven men on the Constance. Two of them were boys. Morvah will want the book and the glass both. She’ll get them. And then, if it’s all the same to you, I’d like to walk somewhere I’m not hiding.', next: 'join' },
    his: { as: 'dl_daejon_mew', text: 'Mine? I wanted to hit him. I’ve wanted to hit him for a year. But that’s what the Gull would do, and I’m done being the Gull. Morvah. The law did it to me. Let it do it to him, properly, with the book read out loud.', effect: (g) => { g.take('dl_tally'); g.setFlag('dl:end', 'his'); }, next: 'join' },
    paid1: {
      text: 'Five hundred. Yes. Yes, of course. A sensible friend. Here.',
      effect: (g) => { g.take('dl_tally'); g.addMarks(500); g.setFlag('dl:end', 'paid'); },
      next: 'paidD',
    },
    paidD: { as: 'dl_daejon_mew', text: 'You sold him the Constance. For five hundred marks. Eleven men. I know what that’s worth, I’ve been paid for wrecks myself. I’ll still walk with you. I owe you the roof and the gully and the dunes, and I pay what I owe. Don’t ask me to like you for this one.', next: 'join' },
    join: {
      speaker: 'narrator', text: 'Daejon Love puts his hat back on. He is not hiding under it any more.',
      effect: (g) => {
        const end = g.flag('dl:end');
        g.setFlag('comp:daejon:met', 1); g.setFlag('comp:daejon:joined', 1); g.setFlag('comp:daejon:part', 1);
        g.compRapport('daejon', end === 'his' ? 25 : end === 'law' ? 15 : -20);
        g.setStage(Q, 'done');
        g.compJoin('daejon');
      },
    },
  },
};

// Captain Morvah at Awschitz, with the red glass
const morvahHook = (D: Record<string, DialogueTree>) => {
  if (!D.aw_morvah) return;
  addOption(D, 'aw_morvah', 'hello', { text: 'I found a lamp-glass on the headland. Red.', cond: (g) => stage(g) === 'morvah' && g.has('dl_red_glass'), next: 'dlGlass' });
  Object.assign(D.aw_morvah.nodes, {
    dlGlass: {
      text: 'Red. Show me. That’s a storm-lantern pane. The Gull never showed red in their lives: red sends a ship away. I was on that headland that night. Love had a lamp in his hand and he was crying, and I thought it was guilt. The man who swore it was white was Aldous Penberthy, the reeve, and the assize took his word over mine because he has dined with the magistrate every quarter-day for thirty years.',
      options: [{ text: 'Then reopen the case.', next: 'dlGlass2' }],
    },
    dlGlass2: {
      text: 'On a piece of glass anyone could have dropped, against the reeve of Gullmouth? I would lose, and Love would still go to the mines, and the reeve would know someone was looking. No. I’ll keep the glass, and I’ll tell you something I am not saying. If a man came off the Rock before the Tern sailed, my boats would be busy elsewhere for a day or two. Tell his sister that. Tell her I’m sorry it’s all I have.',
      options: [{ text: 'I’ll tell her.', effect: (g: GameApi) => { g.take('dl_red_glass'); g.setStage(Q, 'basket'); } }],
    },
  });
};

// ---------------------------------------------------------------- the quest

const NAMES: Record<string, string> = { visit: 'I', glass: 'II', morvah: 'III', basket: 'IV', smuggle: 'V', shore: 'VI', fight: 'VII', free: 'VIII', wait: 'IX', word: 'X', store: 'XI', reeve: 'XII' };

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Red Lamp', region: 'saltwind', depth: 'storyline',
    notes: (g, s) => {
      const t = NAMES[s] ? NAMES[s] + '. ' : '';
      if (s === 'visit') return t + 'Kezia Love sells floats on Gullmouth quay. Her brother Daejon is on Skua Rock for the wreck of the Constance: they say he lit a false light on Awschitz Head. He says he lit a light to save her. The supply boat takes visitors out from the south jetty.';
      if (s === 'glass') return t + 'Daejon ran with the Black Gull wreckers once. The night the Constance struck, he says, he lit a red lamp to turn her away, and was too slow. One man swore the light was white. Daejon dropped the red glass in the gorse on Awschitz Head, west of the new dock.';
      if (s === 'morvah') return t + 'The glass is red, cracked, sooted on the inside. Daejon asked me to show it to Captain Morvah at Awschitz Fort. She was on the headland that night.';
      if (s === 'basket') return t + 'Morvah believes him, and can’t reopen the case against the man who swore against him: Aldous Penberthy, Gullmouth’s harbour reeve. She won’t chase a man off the Rock for a day or two. Kezia should hear that.';
      if (s === 'smuggle') return t + 'Kezia packed a fish basket a month ago: pilchards on top, a file and forty feet of line underneath. They search the visitors on the Rock. They never search the fish.';
      if (s === 'shore') return t + 'Daejon goes tonight: the corridor roof, the pipe, the gully, the water. I said I’d be on the dunes north of Gullmouth after dark.';
      if (s === 'fight') return t + 'He came in on a float, and three turnkeys from the Rock came in behind him.';
      if (s === 'free') return t + 'The turnkeys are down. Daejon wants a word.';
      if (s === 'wait') return t + `Daejon is hiding on the Mewstones, growing a beard and remembering where the Black Gull kept its books. He’ll send for me. (Quests done since: ${Math.min(WAIT_QUESTS, waited(g))} of ${WAIT_QUESTS}.)`;
      if (s === 'word') return t + 'Daejon has sent for me. He’s on the Mewstones.';
      if (s === 'store') return t + 'The Black Gull kept a store dug into Awschitz Head, under a slab with a gull scratched in it, west of where Daejon dropped the glass. Penberthy’s tally-book should be in it.';
      if (s === 'reeve') return t + 'Twenty years of the Gull’s accounts, every page initialled A.P. Daejon wants to be there when Penberthy sees it. The reeve stands on Gullmouth quay most mornings.';
      if (s === 'done') return g.flag('dl:end') === 'paid' ? 'I sold Aldous Penberthy his tally-book back for five hundred marks. Daejon Love walks with me anyway. He pays what he owes. He doesn’t like me for it.' : 'Aldous Penberthy’s tally-book went to Captain Morvah, and the case of the Constance is open again. Daejon Love is off the Rock for good, and walks with me.';
      return '';
    },
    objectives: (g, s) => (s === 'visit' ? [{ text: 'Visit Daejon Love on Skua Rock (the supply boat leaves Gullmouth’s south jetty)', marker: 'dl_daejon' }]
      : s === 'glass' ? [{ text: 'Find the red lamp-glass in the gorse on Awschitz Head', marker: 'dlGlass' }]
      : s === 'morvah' ? [{ text: 'Show the glass to Captain Morvah at Awschitz Fort', marker: 'aw_morvah' }]
      : s === 'basket' ? [{ text: 'Tell Kezia Love what the captain said', marker: 'dl_kezia' }]
      : s === 'smuggle' ? [{ text: 'Take Kezia’s fish basket to Daejon on Skua Rock', marker: 'dl_daejon' }]
      : s === 'shore' ? [{ text: night(g) ? 'Wait for Daejon on the dunes north of Gullmouth' : 'Be on the dunes north of Gullmouth after dark (from eight)', marker: 'dlShore' }]
      : s === 'fight' ? [{ text: `Stop the turnkeys from the Rock (${Math.min(3, killed(g, 'dlTurnkey'))}/3)`, done: killed(g, 'dlTurnkey') >= 3 }]
      : s === 'free' ? [{ text: 'Talk to Daejon', marker: 'dl_daejon_shore' }]
      : s === 'wait' ? [{ text: `Go about the world while Daejon hides (${Math.min(WAIT_QUESTS, waited(g))}/${WAIT_QUESTS} quests done)`, done: waited(g) >= WAIT_QUESTS }]
      : s === 'word' ? [{ text: 'Find Daejon on the Mewstones', marker: 'dl_daejon_mew' }]
      : s === 'store' ? [{ text: 'Find the Black Gull’s store on Awschitz Head', marker: 'dlStore' }]
      : s === 'reeve' ? [{ text: 'Confront Aldous Penberthy on Gullmouth quay', marker: 'dl_penberthy' }] : []),
    advance: (g, s) => (s === 'fight' && killed(g, 'dlTurnkey') >= 3 ? 'free' : s === 'wait' && waited(g) >= WAIT_QUESTS ? 'word' : null),
    marks: (_g, s): Marks => (!s ? { dl_kezia: '!' } : s === 'visit' || s === 'smuggle' ? { dl_daejon: '?' } : s === 'morvah' ? { aw_morvah: '?' } : s === 'basket' ? { dl_kezia: '?' }
      : s === 'free' ? { dl_daejon_shore: '?' } : s === 'word' ? { dl_daejon_mew: '!' } : s === 'reeve' ? { dl_penberthy: '?' } : {}),
    walk: { cast: ['dl_kezia', 'dl_daejon', 'aw_morvah', 'dl_daejon_shore', 'dl_daejon_mew', 'dl_penberthy'] },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'dlTurnkey', type: 'dl_turnkey', at: [[SHORE[0] - 6, SHORE[1] - 5], [SHORE[0] - 3, SHORE[1] - 7], [SHORE[0] - 8, SHORE[1] - 2]], when: (g) => stage(g) === 'fight' },
];

export const DAEJON_CONTENT: RegionContent = {
  id: 'daejon', items, npcs, quests, spawns,
  dialogue: { dl_kezia: kezia, dl_daejon: daejon, dl_daejon_shore: daejonShore, dl_daejon_mew: daejonMew, dl_penberthy: reeve, dl_scene_shore: sceneShore },
  hooks: (D) => morvahHook(D),
  things: [
    { id: 'dlGlass', x: GLASS[0], z: GLASS[1], label: 'Search the gorse', radius: 3, when: (g: GameApi) => stage(g) === 'glass',
      use: (g: GameApi) => { g.give('dl_red_glass'); g.toast('In the roots of the gorse, a curved pane of glass, cracked across. Red.'); g.setStage(Q, 'morvah'); } },
    { id: 'dlShore', x: SHORE[0], z: SHORE[1], label: 'Wait for Daejon', radius: 6, when: (g: GameApi) => stage(g) === 'shore',
      use: (g: GameApi) => { if (!night(g)) { g.toast('Not yet. He goes after lights out: come back after dark.'); return; } g.playScene('dl_scene_shore', { name: 'Daejon Love', title: 'Off the Rock', look: WET as never }); } },
    { id: 'dlStore', x: STORE[0], z: STORE[1], label: 'Lift the slab with the gull on it', radius: 3, when: (g: GameApi) => stage(g) === 'store',
      use: (g: GameApi) => { g.give('dl_tally'); g.toast('Under the slab, a hole lined with tarred boards: three dead lamps, an oil jar, and wrapped in oilcloth, a ledger. Every page is initialled A.P.'); g.setStage(Q, 'reeve'); } },
  ],
};
