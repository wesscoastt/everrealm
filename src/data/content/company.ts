import type { DialogueTree, DOption, GameApi } from '../../game/api';
import { utcDay } from '../calendar';
import { boardToday, CARGO, carryPay, contractSecs, contractTitle, debtorOf, GOODS, GOODS_SHARE, HOUSE_BY_ID, HOUSES, houseDistance, PURSE, SCRIP, type Contract, type CountingHouse, type Debtor } from '../company';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { QuestDef } from '../quests';
import type { WorldThing } from '../places_regional';
import { hook, type Marks } from './kit';
import type { RegionContent } from './types';

// The Counting House's people (data/company.ts, docs/COMPANY_BRIEF.md): at each house a clerk at the
// window with the day's contracts and a factor who sells what the Company brings in, for scrip; and in
// each town two traders who owe the Company and wish it would forget.

type Look = NpcDef['look'];
const look = (o: Partial<Look>): Look => ({ skin: '#d8a882', hair: '#3a2a1e', hairStyle: 1, eyes: '#4a3a2a', tunic: '#3a4a5a', trim: '#c8a050', trousers: '#2a2a30', boots: '#1e1a16', build: 1, age: 0.5, ...o } as Look);

// ------------------------------------------------------------------ Items

const ITEMS: ItemDef[] = [
  { id: SCRIP, name: 'Company scrip', kind: 'material', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'scroll', a: '#e8e4dc', b: '#22365a' },
    desc: 'A printed note on the Counting House for so much in goods at any of its houses. Not money, the Company says, and nobody else will take it.' },
  { id: CARGO, name: 'Sealed cargo', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'chest', a: '#6a4a2a', b: '#22365a' },
    desc: 'A crate under the Company\'s seal, its weight chalked on the lid and written again in the clerk\'s book. Don\'t open it. They weigh it at the other end.' },
  { id: PURSE, name: 'A settled debt', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#8a6a3a', b: '#e0bd64' },
    desc: 'What a trader owed the Counting House, in a purse with the account folded round it. The clerk will count it in front of you.' },
  { id: GOODS, name: 'Goods in kind', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'chest', a: '#8a7a5a', b: '#4a3a2a' },
    desc: 'Taken against a debt instead of coin, with a note of what the trader says it\'s worth. The clerk will say it\'s worth less.' },
  // The Company's own stock, for scrip
  { id: 'co_sea_chest', name: 'Company sea chest', kind: 'collectible', rarity: 'uncommon', stack: true, value: 30, icon: { shape: 'chest', a: '#22365a', b: '#c8a050' }, furn: { model: 'chest' },
    desc: 'Painted Charter blue, brass at the corners, the tally-stick burnt into the lid. Every supercargo has one and keeps their life in it.', stats: 'Furniture: set it down in a house of your own' },
  { id: 'co_ledger_desk', name: 'Factor\'s desk', kind: 'collectible', rarity: 'rare', stack: true, value: 60, icon: { shape: 'log', a: '#5a3a24', b: '#22365a' }, furn: { model: 'desk' },
    desc: 'A sloped desk with a ledger shelf and a lock on every drawer. The Company sells its old ones off when a house is refitted, and keeps the keys.', stats: 'Furniture: set it down in a house of your own' },
  { id: 'co_spyglass', name: 'Company spyglass', kind: 'collectible', rarity: 'rare', stack: true, value: 80, icon: { shape: 'scroll', a: '#c8a050', b: '#3a2a1a' }, furn: { model: 'spyglass' },
    desc: 'Brass on a tripod, for watching the sea from a window. The Company\'s factors use them to see a ship\'s colours before her master can lie about them.', stats: 'Furniture: set it down in a house of your own' },
  { id: 'co_callis_red', name: 'Callis red', kind: 'food', rarity: 'uncommon', stack: true, value: 12, icon: { shape: 'bottle', a: '#6a1a2a', b: '#e8dcc0' }, heal: 30, buff: { slot: 'drink', regen: 0.25, mins: 15 },
    desc: 'Wine from the Callis hills, brought in under the Company\'s seal and the Assembly\'s duty. Dark, and it tastes of the cask.', stats: 'Restores 30 health; stamina comes back a quarter faster for a quarter of an hour.' },
  { id: 'co_dye_charter', name: 'Charter blue dye', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'gel', a: '#22365a' }, dye: { color: '#22365a', name: 'Charter blue' },
    desc: 'The Company\'s own blue, the colour of every coat at every window on every quay.', stats: 'Use it to add this colour to your wardrobe for good: every cloth, trim, cloak and hat swatch in Change look.' },
];

// ------------------------------------------------------------------ The contract, kept in a flag

// (a cleared flag is false: a flag set to nothing reads as true)
const job = (g: GameApi): Contract | null => { const v = g.flag('co:job'); return v && typeof v === 'object' ? (v as Contract) : null; };
const doneToday = (g: GameApi): string[] => { const d = g.flag('co:done') as { day: number; keys: string[] } | undefined; return d && d.day === utcDay() ? d.keys : []; };
const markDone = (g: GameApi, c: Contract) => g.setFlag('co:done', { day: utcDay(), keys: [...doneToday(g), `${c.house}:${c.n}`] });
const signed = (g: GameApi) => !!g.flag('co:signed');
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

function take(g: GameApi, c: Contract): void {
  if (c.kind === 'carry') {
    if (!g.give(CARGO)) { g.toast('Your pack is full.'); return; }
    const to = HOUSE_BY_ID.get(c.to!)!, secs = contractSecs(c);
    g.setFlag('co:job', { ...c, due: Date.now() + secs * 1000 });
    g.markOnMap(to.clerk.at[0], to.clerk.at[1], `The Counting House, ${to.town}`);
  } else {
    const d = debtorOf(c.debtor!)!;
    g.setFlag('co:job', { ...c });
    g.markOnMap(d.at[0], d.at[1], d.name);
  }
}

function pay(g: GameApi, c: Contract, share: number, why: string): void {
  const marks = Math.round(c.marks * share), scrip = Math.max(1, Math.round(c.scrip * share));
  g.addMarks(marks);
  g.give(SCRIP, scrip);
  g.setFlag('co:job', false);
  g.setFlag('co:contracts', Number(g.flag('co:contracts') ?? 0) + 1);
  markDone(g, c);
  g.toast(`${why}: ${marks} marks and ${scrip} scrip.`);
}

/** Give a contract up: what the Company gave you goes back, and it's off the board for today. */
function drop(g: GameApi): void {
  const c = job(g);
  if (!c) return;
  g.take(CARGO); g.take(PURSE); g.take(GOODS);
  g.setFlag('co:job', false);
  markDone(g, c);
}

// ------------------------------------------------------------------ The clerks

function clerkTree(h: CountingHouse): DialogueTree {
  const board = (g: GameApi) => boardToday(h.id).filter((c) => !doneToday(g).includes(`${c.house}:${c.n}`));
  return {
    start: (g) => {
      const c = job(g);
      if (c?.kind === 'carry' && c.to === h.id && g.has(CARGO)) return 'deliver';
      if (c?.kind === 'collect' && c.house === h.id && (g.has(PURSE) || g.has(GOODS))) return 'settle';
      return 'hello';
    },
    nodes: {
      hello: {
        text: (g) => !signed(g)
          ? `The Counting House, ${h.town}. If you're after work, the Company wants your name in the book before it trusts you with a crate.`
          : job(g) ? 'You\'ve a contract out already. One at a time: the Company\'s rule, not mine.' : `The Counting House, ${h.town}. The board's by the window. Read it, pick one, sign for it.`,
        options: [
          { text: 'Sign me on.', cond: (g) => !signed(g), next: 'sign' },
          { text: 'What\'s on the board?', cond: (g) => signed(g) && !job(g), next: 'board' },
          { text: 'I\'ll give this one up.', cond: (g) => !!job(g), next: 'giveup' },
          { text: 'What is the Counting House?', next: 'about' },
          { text: 'Good day.' },
        ],
      },
      sign: {
        text: 'Name, there. Who\'ll answer for you if you run off with a crate: leave it blank, everybody does. That\'s you. Clerk of the Counting House, the lowest there is.',
        next: 'sign2',
      },
      sign2: {
        text: 'Carry is a sealed crate to another house before the bell. Collect is a debt. You\'re paid in coin and in scrip, and scrip buys from the factor.',
        options: [{ text: 'Show me the board.', effect: (g) => g.setFlag('co:signed', true), next: 'board' }],
      },
      about: {
        text: 'The Charter\'s own sea trade. Forty years ago the Speaker gave the Company the Counties\' wool and tin to carry out, and wine and timber to bring in.',
        next: 'about2',
      },
      about2: {
        text: 'And the harbour dues to collect while it was at it. There\'s a house in every town the sea road reaches. Gullmouth\'s is on the quay: the Merchants\' Hall got the good street first.',
        next: 'hello',
      },
      board: {
        text: (g) => {
          const b = board(g);
          if (!b.length) return 'Nothing left on the board today. Tomorrow\'s goes up at first light.';
          return 'Today\'s board:\n' + b.map((c) => `- ${contractTitle(c)}${c.kind === 'carry' ? `, within ${mmss(contractSecs(c))}` : ''}. ${c.marks} marks and ${c.scrip} scrip.`).join('\n');
        },
        options: [
          ...[0, 1, 2].map((n): DOption => ({
            text: (g) => { const c = board(g).find((x) => x.n === n); return c ? `I'll take it: ${contractTitle(c).toLowerCase()}.` : ''; },
            cond: (g) => !job(g) && board(g).some((x) => x.n === n),
            effect: (g) => { const c = board(g).find((x) => x.n === n); if (c) take(g, c); },
            next: 'taken',
          })),
          { text: 'Not today.' },
        ],
      },
      taken: {
        text: (g) => {
          const c = job(g);
          if (!c) return 'Your pack\'s full. Come back when it isn\'t.';
          if (c.kind === 'carry') return `Sign for it. The weight's on the lid and in the book, and the clerk at ${HOUSE_BY_ID.get(c.to!)?.town} weighs it again when it comes in. Late, and the Company pays half and says nothing, which is worse.`;
          const d = debtorOf(c.debtor!)!;
          return `${d.name}, ${d.title.toLowerCase()}. ${d.owes} Bring me the money, or goods if that's all there is, and I'll close the account.`;
        },
      },
      giveup: {
        text: 'Then it\'s off the board for today and your name goes in the other column. Give back whatever the Company gave you.',
        options: [{ text: 'Here.', effect: (g) => drop(g) }, { text: 'No, I\'ll see it through.' }],
      },
      deliver: {
        text: (g) => carryPay(job(g)!) < 1
          ? 'Late. The bell went and you weren\'t here. Weight\'s right, at least. Half pay, and I\'m to write "late" in the column, so I have.'
          : 'Weight\'s right. Seal\'s whole. On time, which is more than the last one managed. Sign there.',
        options: [{ text: 'Thank you.', effect: (g) => { const c = job(g)!, share = carryPay(c); g.take(CARGO); pay(g, c, share, `Carried to ${h.town}${share < 1 ? ', late' : ''}`); } }],
      },
      settle: {
        text: (g) => (g.has(PURSE)
          ? 'Let me count it. Yes. The account\'s closed, and the Company is grateful, in the way the Company is grateful.'
          : 'Goods in kind. I\'ll write them down at what they\'ll fetch, not at what you were told. Two-thirds of the contract, then.'),
        options: [{ text: 'Fair enough.', effect: (g) => { const c = job(g)!, coin = g.has(PURSE); g.take(PURSE); g.take(GOODS); pay(g, c, coin ? 1 : GOODS_SHARE, coin ? 'A debt collected' : 'A debt settled in goods'); } }],
      },
    },
  };
}

// ------------------------------------------------------------------ The factors

function factorTree(h: CountingHouse): DialogueTree {
  return {
    start: () => 'hello',
    nodes: {
      hello: {
        text: h.factor.hello,
        options: [
          { text: 'Show me the stock.', effect: (g) => g.openShop('co_' + h.id) },
          { text: 'How do I earn scrip?', next: 'scrip' },
          { text: 'Good day.' },
        ],
      },
      scrip: { text: `Contracts. ${h.clerk.name} has the board at the window. Carry a crate or collect a debt, and you're paid in coin and scrip both.`, next: 'hello' },
    },
  };
}

// ------------------------------------------------------------------ The debtors

function debtorTree(d: Debtor): DialogueTree {
  const mine = (g: GameApi) => { const c = job(g); return c?.kind === 'collect' && c.debtor === d.id && !g.has(PURSE) && !g.has(GOODS); };
  return {
    start: (g) => (mine(g) ? 'paper' : 'idle'),
    nodes: {
      idle: { text: d.idle },
      paper: {
        text: d.plea,
        options: [
          { text: 'The Company wants all of it. Today.', next: 'coin' },
          { text: 'Then I\'ll take it in goods.', next: 'goods' },
          { text: 'I\'ll come back.' },
        ],
      },
      coin: { text: d.coin, options: [{ text: 'I\'ll tell them.', effect: (g) => { if (!g.give(PURSE)) g.toast('Your pack is full.'); } }] },
      goods: { text: d.goods, options: [{ text: 'It\'ll do.', effect: (g) => { if (!g.give(GOODS)) g.toast('Your pack is full.'); } }] },
    },
  };
}

// ------------------------------------------------------------------ Everything, per house

const STOCK = [
  { item: 'co_callis_red', price: 2 },
  { item: 'co_sea_chest', price: 12 },
  { item: 'co_ledger_desk', price: 25 },
  { item: 'co_dye_charter', price: 30 },
  { item: 'co_spyglass', price: 35 },
];
const npcs: NpcDef[] = [];
const shops: Record<string, ShopDef> = {};
const dialogue: Record<string, DialogueTree> = {};
const stand = (p: { at: [number, number]; face: [number, number] }) => [{ from: 0, to: 24, at: p.at, face: p.face, anim: 'idle' as const }];
for (const h of HOUSES) {
  npcs.push(
    { id: h.clerk.id, name: h.clerk.name, title: `Clerk of the Counting House, ${h.town}`, look: look(h.clerk.look), schedule: stand(h.clerk), barks: h.clerk.barks },
    { id: h.factor.id, name: h.factor.name, title: `Factor of the Counting House, ${h.town}`, look: look(h.factor.look), schedule: stand(h.factor), barks: h.factor.barks },
    ...h.debtors.map((d): NpcDef => ({ id: d.id, name: d.name, title: d.title, look: look(d.look), schedule: stand(d), barks: d.barks })),
  );
  shops['co_' + h.id] = { id: 'co_' + h.id, name: `The Counting House, ${h.town}`, owner: h.factor.id, currency: SCRIP, stock: STOCK, buyRate: () => 0, footer: () => 'Priced in Company scrip: the clerk\'s contracts pay it.' } as ShopDef;
  dialogue[h.clerk.id] = clerkTree(h);
  dialogue[h.factor.id] = factorTree(h);
  for (const d of h.debtors) dialogue[d.id] = debtorTree(d);
}

// ------------------------------------------------------------------ "Short Weight", I: The Clerk's Window
// (docs/COMPANY_BRIEF.md) After your first contract, Gilbert Ashe wants a word: the crates Ansbury sends
// come into Gullmouth light. Osmund Dray's book says by the same weight every time, so it's no thief on
// the road but a scale. Ansbury's pound weight has been drilled and leaded, and only the factor keeps
// the key to the weight box. Tell Constance Ferrars, or keep it to yourself and watch who fills the box.
// Flag "coWeightChoice": 'factor' | 'quiet'. Chapter IV turns on it.

const SW1 = 'coWeight';
const sw1 = (g: GameApi) => g.stage(SW1);
const swDone = (g: GameApi, why: string) => {
  g.setStage(SW1, 'done');
  g.addMarks(120);
  g.give(SCRIP, 8);
  g.setFlag('co:rank', Math.max(1, Number(g.flag('co:rank') ?? 0)));
  g.toast(`${why} You're a supercargo of the Counting House now: 120 marks and 8 scrip.`);
};

const QUESTS: Record<string, QuestDef> = {
  [SW1]: {
    id: SW1, name: 'The Clerk\'s Window', region: 'crownroad', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'osmund') return 'Gilbert Ashe at the Counting House in Ansbury says the crates he sends to Gullmouth come in light. I carried one of them. Osmund Dray, the clerk at Gullmouth, wrote to him about it.';
      if (s === 'scale') return 'Osmund Dray\'s book: every crate from Ansbury since Lady Day is light by the same weight. Not a thief on the road, a scale. He wants me to look at the scale in the Ansbury office, and not to tell Gilbert.';
      if (s === 'found') return 'The pound weight on the Ansbury scale has been drilled out and filled with lead. The Company bills for weight that was never there, and someone sells the difference. Gilbert should hear it.';
      if (s === 'factor') return 'Gilbert says only the factor, Constance Ferrars, keeps the key to the weight box. I said I would tell her.';
      return g.flag('coWeightChoice') === 'factor'
        ? 'I told Constance Ferrars about the leaded weight. She thanked me for coming to her first. She said not everyone would.'
        : 'I kept the leaded weight to myself and Gilbert. Whoever fills the weight box doesn\'t know anyone has looked in it.';
    },
    objectives: (_g, s) => {
      if (s === 'osmund') return [{ text: 'Ask Osmund Dray at the Counting House in Gullmouth about the light crates', marker: 'co_osmund' }];
      if (s === 'scale') return [{ text: 'Look at the scale in the Counting House at Ansbury', marker: 'coScale' }];
      if (s === 'found') return [{ text: 'Tell Gilbert Ashe what you found', marker: 'co_gilbert' }];
      if (s === 'factor') return [{ text: 'Tell Constance Ferrars about the leaded weight', marker: 'co_constance' }];
      return [];
    },
    marks: (g, s): Marks => {
      if (s === undefined) return Number(g.flag('co:contracts') ?? 0) >= 1 ? { co_gilbert: '!' } : {};
      return s === 'osmund' ? { co_osmund: '?' } : s === 'found' ? { co_gilbert: '?' } : s === 'factor' ? { co_constance: '?' } : {};
    },
    walk: { from: { flags: { 'co:signed': true, 'co:contracts': 1 } } },
  },
};

const things: WorldThing[] = [
  { id: 'coScale', x: 964.5, z: 286.7, label: 'Look at the Company\'s scale', radius: 2.2, when: (g) => sw1(g) === 'scale',
    use: (g) => { g.setStage(SW1, 'found'); g.toast('The weights are stamped with the Weighhouse mark. The pound is a shade heavy in the hand: its base has been drilled and filled with lead, and the stamp filed back over the plug.'); } },
];

// Gilbert Ashe: the word after your first contract, and the report
hook(dialogue, 'co_gilbert', (g) => {
  const s = sw1(g);
  if (s === undefined && Number(g.flag('co:contracts') ?? 0) >= 1) return 'sw_a';
  if (s === 'found') return 'sw_r1';
  return undefined;
}, {
  sw_a: { text: 'A word, before you go. Osmund Dray at Gullmouth wrote to me. The last three crates I sent him came in light. A pound, a pound and a half.', next: 'sw_b' },
  sw_b: { text: 'Light at Gullmouth means short here, or a thief on the road. You carried one of them. I\'d like it to be the road.',
    options: [{ text: 'I\'ll ask Osmund.', effect: (g) => g.setStage(SW1, 'osmund') }, { text: 'Not my business.' }] },
  sw_r1: { text: 'You\'ve a face like someone who found something.', options: [{ text: 'The pound weight on your scale is drilled and leaded.', next: 'sw_r2' }] },
  sw_r2: { text: 'Leaded. In my office. Every crate I\'ve weighed since Lady Day, and the Company billing the shipper for lead.', next: 'sw_r3' },
  sw_r3: { text: 'There\'s one key to the weight box, and Mistress Ferrars keeps it. That isn\'t me saying anything. That\'s just where the key is.',
    options: [
      { text: 'Then I\'ll tell her.', effect: (g) => { g.setFlag('coWeightChoice', 'factor'); g.setStage(SW1, 'factor'); } },
      { text: 'Say nothing yet. Watch who fills the box.', next: 'sw_q' },
    ] },
  sw_q: { text: 'Then I\'ll say nothing too. If it\'s who I think it is, I\'d rather be wrong a while longer.',
    options: [{ text: 'So would I.', effect: (g) => { g.setFlag('coWeightChoice', 'quiet'); swDone(g, 'You kept the leaded weight to yourself.'); } }] },
});
// Osmund Dray: the book
hook(dialogue, 'co_osmund', (g) => (sw1(g) === 'osmund' ? 'sw_o1' : undefined), {
  sw_o1: { text: 'Gilbert sent you. Good. Here\'s the book. Every crate from Ansbury since Lady Day is light, and by the same weight, near enough.', next: 'sw_o2' },
  sw_o2: { text: 'Brasswick\'s aren\'t. Callis\'s aren\'t. The same weight every time isn\'t a thief on the road. It\'s a scale that reads heavy.', next: 'sw_o3' },
  sw_o3: { text: 'Look at Ansbury\'s scale. And don\'t tell Gilbert till you have. He\'s honest, and honest men talk.',
    options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(SW1, 'scale') }] },
});
// Constance Ferrars: thanks, of a kind
hook(dialogue, 'co_constance', (g) => (sw1(g) === 'factor' ? 'sw_c1' : undefined), {
  sw_c1: { text: 'You have the look of bad news. Go on.', options: [{ text: 'The pound weight on the scale is drilled and leaded.', next: 'sw_c2' }] },
  sw_c2: { text: 'Drilled. Well. I\'ll have the Weighhouse send a new set by Friday, and the old one goes in the river.', next: 'sw_c3' },
  sw_c3: { text: 'You did right to bring it to me first. Not everyone would have. I won\'t forget it.',
    options: [{ text: 'Thank you.', effect: (g) => swDone(g, 'You told Constance Ferrars about the leaded weight.') }] },
});

// ------------------------------------------------------------------ "Short Weight", II: Dues
// The Charter's galleon anchors in Gullmouth roads so as not to come alongside and pay dues, and the
// Counting House collects the Charter's dues. Thomas Varcoe at the Merchants' Hall says she unloads at
// night into Company lighters; Simon Teague at Gull Castle keeps a copy of the letter that excuses her:
// the Counting House's own, from the Governor's office. The Company carries its goods in the Charter's
// galleon and pays the Charter nothing for the harbour. Bill her, leave her be, or give the letter to
// the Merchants' Hall. Flag "coDues": 'billed' | 'left' | 'hall'.

const SW2 = 'coDues';
const sw2 = (g: GameApi) => g.stage(SW2);
const dues = (g: GameApi, choice: 'billed' | 'left' | 'hall', why: string) => {
  g.setFlag('coDues', choice);
  g.setStage(SW2, 'done');
  g.addMarks(150);
  if (choice !== 'hall') g.give(SCRIP, choice === 'left' ? 14 : 10);
  g.toast(`${why} 150 marks${choice === 'hall' ? '' : ` and ${choice === 'left' ? 14 : 10} scrip`}.`);
};

QUESTS[SW2] = {
  id: SW2, name: 'Dues', region: 'saltwind', depth: 'storyline',
  notes: (g, s) => {
    if (s === 'varcoe') return 'Osmund Dray says the Charter\'s galleon has lain in Gullmouth roads a year and never paid a penny in dues, and the Counting House collects the dues. Thomas Varcoe at the Merchants\' Hall knows every hull in the harbour.';
    if (s === 'teague') return 'Varcoe says the galleon unloads at night into Company lighters, and the Hall has always wondered why the Company never bills her. Simon Teague, steward at Gull Castle, keeps copies of everything.';
    if (s === 'choose') return 'Teague has a copy of a letter from the Counting House, the Governor\'s office: the galleon is excused her dues "in consideration of services". The Company ships its own goods in her and pays the Charter nothing for the harbour. Osmund should know.';
    const c = g.flag('coDues');
    return c === 'billed' ? 'The galleon is on Osmund\'s dues book now, and billed. The Governor\'s office will hear of it from Gullmouth before it hears of it from me.'
      : c === 'hall' ? 'Thomas Varcoe has Teague\'s copy of the letter. The Merchants\' Hall has something on the Company at last.'
      : 'The galleon stays off the book. Avis Spurr says the Company remembers who keeps its business quiet.';
  },
  objectives: (_g, s) => {
    if (s === 'varcoe') return [{ text: 'Ask Thomas Varcoe at the Merchants\' Hall about the galleon', marker: 'hall_thomas' }];
    if (s === 'teague') return [{ text: 'Ask Simon Teague at Gull Castle for the galleon\'s papers', marker: 'gc_simon' }];
    if (s === 'choose') return [{ text: 'Take what you found to Osmund Dray at the Counting House', marker: 'co_osmund' }];
    return [];
  },
  marks: (g, s): Marks => {
    if (s === undefined) return g.stage(SW1) === 'done' ? { co_osmund: '!' } : {};
    return s === 'varcoe' ? { hall_thomas: '?' } : s === 'teague' ? { gc_simon: '?' } : s === 'choose' ? { co_osmund: '?' } : {};
  },
  walk: { from: { quests: { [SW1]: 'done' }, flags: { 'co:signed': true } } },
};

hook(dialogue, 'co_osmund', (g) => {
  const s = sw2(g);
  if (s === undefined && g.stage(SW1) === 'done') return 'dw_a';
  if (s === 'choose') return 'dw_c1';
  return undefined;
}, {
  dw_a: { text: 'You found the lead in Ansbury\'s weight. Good. I have another for you, and this one floats.', next: 'dw_b' },
  dw_b: { text: 'The Charter\'s galleon. She\'s lain in the roads a year and never paid a penny of dues, and dues are ours to collect. Nobody here will tell me why.',
    options: [{ text: 'Who would know?', next: 'dw_c' }, { text: 'Not now.' }] },
  dw_c: { text: 'Thomas Varcoe at the Merchants\' Hall knows every hull in the harbour. He\'ll enjoy telling you. They don\'t love us there.',
    options: [{ text: 'I\'ll ask him.', effect: (g) => g.setStage(SW2, 'varcoe') }] },
  dw_c1: { text: 'Well? What does the galleon owe?', options: [{ text: 'Nothing. The Company excused her. The Governor\'s office.', next: 'dw_c2' }] },
  dw_c2: { text: 'In consideration of services. And the services are carrying our goods in the Charter\'s hull, free of the Charter\'s harbour. We\'re cheating the Charter with its own ship.', next: 'dw_c3' },
  dw_c3: { text: 'I can put her on the book and bill her, and Ansbury will hear it came from Gullmouth. Or I can forget I asked. You found it. You choose.',
    options: [
      { text: 'Bill her.', next: 'dw_bill' },
      { text: 'Leave it. It\'s the Company\'s business.', next: 'dw_leave' },
      { text: 'I\'ve already promised Varcoe the letter.', next: 'dw_hall' },
    ] },
  dw_bill: { text: 'Then she\'s on the book. A year of dues, and I\'ll sign it myself. If they want my window, they can come and take it.',
    options: [{ text: 'I\'ll stand with you.', effect: (g) => dues(g, 'billed', 'The galleon is billed for a year of dues.') }] },
  dw_leave: { text: 'Then I asked nothing and you found nothing. Avis will be pleased. I\'m not sure I am.',
    options: [{ text: 'It\'s done.', effect: (g) => dues(g, 'left', 'The galleon stays off the book.') }] },
  dw_hall: { text: 'You gave the Hall a knife for our backs. I can\'t say I blame you. I can say don\'t tell anyone in this office.',
    options: [{ text: 'I won\'t.', effect: (g) => dues(g, 'hall', 'The Merchants\' Hall has the letter.') }] },
});

const sw2Hooks = (D: Record<string, DialogueTree>) => {
  hook(D, 'hall_thomas', (g) => (sw2(g) === 'varcoe' ? 'dw_t1' : undefined), {
    dw_t1: { text: 'The galleon? I\'ve waited a year for somebody from your window to ask me that.', next: 'dw_t2' },
    dw_t2: { text: 'She never comes alongside, so she never pays. But she unloads, at night, into lighters. Company lighters. Count the bales off her and count the bales into your warehouse.', next: 'dw_t3' },
    dw_t3: { text: 'If you want paper, Simon Teague at the castle copies every letter that crosses the harbour court. He\'s a pedant. Pedants keep everything.',
      options: [{ text: 'Thank you.', effect: (g) => g.setStage(SW2, 'teague') }] },
  });
  hook(D, 'gc_simon', (g) => (sw2(g) === 'teague' ? 'dw_s1' : undefined), {
    dw_s1: { text: 'The galleon\'s papers. Yes. There\'s a letter, and I have a copy, because I have a copy of everything.', next: 'dw_s2' },
    dw_s2: { text: '"The Counting House excuses the Charter\'s ship from all harbour dues at Gullmouth, in consideration of services." Sealed in Ansbury. The Governor\'s office.', next: 'dw_s3' },
    dw_s3: { text: 'Take the copy. I made two. I always make two.',
      options: [{ text: 'Thank you.', effect: (g) => g.setStage(SW2, 'choose') }] },
  });
};

// ------------------------------------------------------------------ "Short Weight", III: The Black Hen's Other Owner
// Three Company hulls lost to the Black Hen this year, and their cargoes turning up in Saltpenny, bought
// back for the Company at a tenth. Josiah Penhale's Exchange book at the Merchants' Hall has the Hen's
// underwriting: insured against loss, the owner's share "for the account of C. F., Ansbury". There's
// one C. F. in the Company. Write to the Governor, give the page to the Hall, or keep it. Flag "coHen":
// 'governor' | 'hall' | 'kept'. Makes you a factor.

const SW3 = 'coHen';
const sw3 = (g: GameApi) => g.stage(SW3);
const hen = (g: GameApi, choice: 'governor' | 'hall' | 'kept', why: string) => {
  g.setFlag('coHen', choice);
  g.setStage(SW3, 'done');
  g.addMarks(180);
  g.give(SCRIP, 12);
  g.setFlag('co:rank', Math.max(2, Number(g.flag('co:rank') ?? 0)));
  g.toast(`${why} You're a factor of the Counting House now: 180 marks and 12 scrip.`);
};

QUESTS[SW3] = {
  id: SW3, name: 'The Black Hen\'s Other Owner', region: 'saltwind', depth: 'storyline',
  notes: (g, s) => {
    if (s === 'josiah') return 'Avis Spurr says the Black Hen has taken three Company hulls this year, and the cargoes turn up in Saltpenny, where someone buys them back for the Company at a tenth of their worth. Josiah Penhale keeps the Exchange book at the Merchants\' Hall, and the underwriting is in it.';
    if (s === 'avis') return 'The Exchange book has the Black Hen insured against loss, with the owner\'s share "for the account of C. F., Ansbury". Constance Ferrars is factor at Ansbury. Avis Spurr should hear it.';
    const c = g.flag('coHen');
    return c === 'governor' ? 'Avis Spurr wrote to the Governor with the page from the Exchange book. Whatever comes back will come back sealed.'
      : c === 'hall' ? 'The Merchants\' Hall has the page. Thomas Varcoe has two knives for the Company\'s back now.'
      : 'I kept the page. Whoever C. F. is doesn\'t know I have it.';
  },
  objectives: (_g, s) => {
    if (s === 'josiah') return [{ text: 'Ask Josiah Penhale at the Merchants\' Hall about the Black Hen\'s underwriting', marker: 'hall_josiah' }];
    if (s === 'avis') return [{ text: 'Tell Avis Spurr at the Counting House what the book says', marker: 'co_avis' }];
    return [];
  },
  marks: (g, s): Marks => {
    if (s === undefined) return g.stage(SW2) === 'done' ? { co_avis: '!' } : {};
    return s === 'josiah' ? { hall_josiah: '?' } : s === 'avis' ? { co_avis: '?' } : {};
  },
  walk: { from: { quests: { [SW1]: 'done', [SW2]: 'done' }, flags: { 'co:signed': true } } },
};

hook(dialogue, 'co_avis', (g) => {
  const s = sw3(g);
  if (s === undefined && g.stage(SW2) === 'done') return 'dh_a';
  if (s === 'avis') return 'dh_r1';
  return undefined;
}, {
  dh_a: { text: 'Osmund says you can be trusted to find things. Find me this. The Black Hen has taken three of our hulls since spring.', next: 'dh_b' },
  dh_b: { text: 'Their cargoes turn up in Saltpenny, and somebody buys them back for the Company at a tenth. We pay twice for our own goods, and somebody is paid both times.',
    options: [{ text: 'Where do I start?', next: 'dh_c' }, { text: 'Not now.' }] },
  dh_c: { text: 'Josiah Penhale at the Merchants\' Hall keeps the Exchange book, and the Exchange book keeps the underwriting. If anyone insures a pirate, it\'s written there.',
    options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(SW3, 'josiah') }] },
  dh_r1: { text: 'Well? Who insures a pirate?', options: [{ text: '"For the account of C. F., Ansbury."', next: 'dh_r2' }] },
  dh_r2: { text: 'C. F. There\'s one C. F. in the Company, and she keeps the key to the weight box too, doesn\'t she.', next: 'dh_r3' },
  dh_r3: { text: 'I can write to the Governor with it. Or you can sell it across the street to people who\'ll pay. Or you can keep it in your coat until it\'s worth more.',
    options: [
      { text: 'Write to the Governor.', next: 'dh_gov' },
      { text: 'The Hall will want it.', next: 'dh_hall' },
      { text: 'I\'ll keep it.', next: 'dh_kept' },
    ] },
  dh_gov: { text: 'Then I\'ll write tonight, in my own hand, and send it by the Post, not the Company bag. Factor to Governor. If I\'m wrong about her, I\'ll be wrong in writing.',
    options: [{ text: 'You\'re not wrong.', effect: (g) => hen(g, 'governor', 'Avis Spurr wrote to the Governor.') }] },
  dh_hall: { text: 'Varcoe will pay you and then use it against all of us, me included. I won\'t stop you. I won\'t thank you either.',
    options: [{ text: 'It\'s done.', effect: (g) => hen(g, 'hall', 'The Merchants\' Hall has the page.') }] },
  dh_kept: { text: 'In your coat, then. Mind it. People who keep pages like that in their coats tend to have accidents near water.',
    options: [{ text: 'I\'ll mind it.', effect: (g) => hen(g, 'kept', 'You kept the page from the Exchange book.') }] },
});

const sw3Hooks = (D: Record<string, DialogueTree>) => {
  hook(D, 'hall_josiah', (g) => (sw3(g) === 'josiah' ? 'dh_j1' : undefined), {
    dh_j1: { text: 'The Black Hen? She\'s in the book. Of course she is. Everything that floats is in the book.', next: 'dh_j2' },
    dh_j2: { text: 'Insured against loss: hull, guns and cargo. Premiums paid on the day. The owner\'s share is written "for the account of C. F., Ansbury".', next: 'dh_j3' },
    dh_j3: { text: 'I copy what I\'m given. I don\'t ask who C. F. is. If you\'re going to, do it outside.',
      options: [{ text: 'Thank you.', effect: (g) => g.setStage(SW3, 'avis') }] },
  });
};

// ------------------------------------------------------------------ "Short Weight", IV: Saltpenny Keeps No Book
// The wrong turn. Constance Ferrars sends for you: find who buys the Company's cargoes off the Brethren
// in Saltpenny. Gil Fenner, who buys everything and writes nothing down, has a letter from her already:
// whoever the Company sends asking, he's to find out what they know and write back. She sent you to
// learn how much you'd found. Let him write that you know nothing, take the letter, or pay him to lie
// for you and keep it. Flag "coSalt": 'lie' | 'took' | 'paid'.

const SW4 = 'coSalt';
const sw4 = (g: GameApi) => g.stage(SW4);
const salt = (g: GameApi, choice: 'lie' | 'took' | 'paid', why: string) => {
  g.setFlag('coSalt', choice);
  g.setStage(SW4, 'done');
  g.addMarks(200);
  g.give(SCRIP, 14);
  g.toast(`${why} 200 marks and 14 scrip.`);
};

QUESTS[SW4] = {
  id: SW4, name: 'Saltpenny Keeps No Book', region: 'saltpenny', depth: 'storyline',
  notes: (g, s) => {
    if (s === 'gil') return 'Constance Ferrars wants to know who buys the Company\'s cargoes off the Brethren in Saltpenny. Gil Fenner, at Low Tide, buys everything and writes nothing down.';
    const c = g.flag('coSalt');
    const head = 'Gil Fenner had a letter from Constance Ferrars before I came: whoever the Company sent asking, he was to find out what they knew and write to her. She sent me to learn how much I had found. ';
    return head + (c === 'lie' ? 'I let Gil write that I know nothing. She thinks she\'s safe.'
      : c === 'took' ? 'I took her letter. She\'ll know by the next Kittiwake that I have it.'
      : 'I paid Gil to write that I know nothing, and kept her letter in my coat.');
  },
  objectives: (_g, s) => (s === 'gil' ? [{ text: 'Find Gil Fenner at Low Tide in Saltpenny', marker: 'gil_fenner' }] : []),
  marks: (g, s): Marks => {
    if (s === undefined) return g.stage(SW3) === 'done' ? { co_constance: '!' } : {};
    return s === 'gil' ? { gil_fenner: '?' } : {};
  },
  walk: { from: { quests: { [SW1]: 'done', [SW2]: 'done', [SW3]: 'done' }, flags: { 'co:signed': true } } },
};

hook(dialogue, 'co_constance', (g) => (sw4(g) === undefined && g.stage(SW3) === 'done' ? 'ds_a' : undefined), {
  ds_a: { text: (g) => (g.flag('coWeightChoice') === 'factor'
    ? 'You came to me about the weight. I said I wouldn\'t forget. I haven\'t. I need someone I can trust in Morrow.'
    : 'Gilbert tells me you\'re the one who finds things. I need something found, in Morrow.'), next: 'ds_b' },
  ds_b: { text: 'The Brethren sell our cargoes in Saltpenny, and someone buys them back for the Company. I want a name. Gil Fenner buys everything there and writes nothing down. Ask him.',
    options: [{ text: 'I\'ll go.', effect: (g) => g.setStage(SW4, 'gil') }, { text: 'Not now.' }] },
});

const sw4Hooks = (D: Record<string, DialogueTree>) => {
  hook(D, 'gil_fenner', (g) => (sw4(g) === 'gil' ? 'ds_g1' : undefined), {
    ds_g1: { text: 'The Counting House. I wondered which of you it\'d be. Sit. I\'ve been paid to talk to you.', next: 'ds_g2' },
    ds_g2: { text: 'Here. Came on the Kittiwake a week back. Read it yourself; I don\'t read other people\'s letters, I only sell them.', next: 'ds_g3' },
    ds_g3: { text: (g) => (g.flag('coWeightChoice') === 'factor'
      ? '"Whoever comes asking will be the one who came to me first about the weight. Find out what they know, and write. C. F." She sent you to find out how much you\'d found.'
      : '"Whoever comes asking will be Gilbert Ashe\'s friend from the window. Find out what they know, and write. C. F." She sent you to find out how much you\'d found.'), next: 'ds_g4' },
    ds_g4: { text: 'So. I write back that you know nothing, and she sleeps. Or you take the letter, and she doesn\'t. Or you pay me a hundred and I write nothing-at-all and you keep it.',
      options: [
        { text: 'Write that I know nothing.', next: 'ds_lie' },
        { text: 'I\'ll take the letter.', next: 'ds_took' },
        { text: 'A hundred marks. Lie for me.', cond: (g) => g.marks >= 100, next: 'ds_paid' },
      ] },
    ds_lie: { text: 'Then she\'ll think you\'re a fool, which is the safest thing to be thought by her. Off you go.',
      options: [{ text: 'Thank you.', effect: (g) => salt(g, 'lie', 'Gil Fenner wrote that you know nothing.') }] },
    ds_took: { text: 'Take it, then. She\'ll know by the next Kittiwake. I\'d stay off quaysides at night, if I were you. Saltpenny\'s are steep.',
      options: [{ text: 'I\'ll manage.', effect: (g) => salt(g, 'took', 'You took Constance Ferrars\' letter.') }] },
    ds_paid: { text: 'A hundred. And I write a nothing so good she\'ll frame it. Keep the letter. It\'s worth more in your coat than in my fire.',
      options: [{ text: 'Here.', effect: (g) => { g.addMarks(-100); salt(g, 'paid', 'You paid Gil Fenner to lie for you.'); } }] },
  });
};

// ------------------------------------------------------------------ "Short Weight", V: Bonded
// Gilbert Ashe has taken the packet to Callis to find the original weights in the bonded book, and not
// written since. You arrive to smoke: the Company's warehouse on the coast road is burning, set in three
// places, to be blamed on the Assembly and paid for by the underwriters. Gilbert went in for the book.
// On the second floor are Jordi Alsina and the porters' families. One stair, one trip: the ledgers
// (proof of everything) or the people. Gilbert is found on the stair either way. Flag "coBonded":
// 'ledgers' | 'people'; "coGilbertDead". Makes you a chief factor.

const SW5 = 'coBonded';
const sw5 = (g: GameApi) => g.stage(SW5);
const BONDED_BOOK = 'co_bonded_book';
ITEMS.push({ id: BONDED_BOOK, name: 'The bonded book', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'book', a: '#3a2a1a', b: '#22365a' },
  desc: 'The Callis warehouse\'s bonded book, scorched at one corner. Every bale in and out, its weight at Ansbury and its weight here, and three pages of what the underwriters were told burned. Gilbert Ashe died going in for it.' });

QUESTS[SW5] = {
  id: SW5, name: 'Bonded', region: 'callis', depth: 'storyline',
  notes: (g, s) => {
    if (s === 'callis') return 'Osmund Dray says Gilbert Ashe took the packet to Callis to find the original weights in the bonded book, and hasn\'t written since. The Company\'s Callis house is on the coast road, across from the quay.';
    if (s === 'laia') return (g.flag('coBonded') === 'ledgers'
      ? 'The warehouse burned. I went up the stair for the bonded book and brought it out. Jordi Alsina and the porters\' families were on the second floor. Gilbert was on the stair. They took the ones who came out to the Assembly\'s Hospital.'
      : 'The warehouse burned. I went up the stair for the people on the second floor and brought Jordi Alsina and the porters\' families down. The bonded book burned. Gilbert was on the stair. They took them to the Assembly\'s Hospital.');
    return 'Laia Serra says the fire started in three places at once. Nobody sets a fire in three places by accident. Gilbert Ashe is buried in Callis, a long way from his window.';
  },
  objectives: (_g, s) => {
    if (s === 'callis') return [{ text: 'Find Gilbert Ashe at the Counting House in Callis', marker: 'co_montserrat' }];
    if (s === 'laia') return [{ text: 'Go to the Assembly\'s Hospital', marker: 'inf_laia' }];
    return [];
  },
  marks: (g, s): Marks => {
    if (s === undefined) return g.stage(SW4) === 'done' ? { co_osmund: '!' } : {};
    return s === 'callis' ? { co_montserrat: '?' } : s === 'laia' ? { inf_laia: '?' } : {};
  },
  walk: { from: { quests: { [SW1]: 'done', [SW2]: 'done', [SW3]: 'done', [SW4]: 'done' }, flags: { 'co:signed': true } } },
};

hook(dialogue, 'co_osmund', (g) => (sw5(g) === undefined && g.stage(SW4) === 'done' ? 'db_a' : undefined), {
  db_a: { text: 'Gilbert took the packet to Callis a week ago. He said the original weights would be in the bonded book there, and he\'d find them himself.', next: 'db_b' },
  db_b: { text: 'He writes every Thursday. He\'s never missed one in nine years. He\'s missed one.',
    options: [{ text: 'I\'ll go to Callis.', effect: (g) => g.setStage(SW5, 'callis') }, { text: 'Not now.' }] },
});

hook(dialogue, 'co_montserrat', (g) => (sw5(g) === 'callis' ? 'db_f1' : undefined), {
  db_f1: { speaker: 'narrator', text: 'Smoke is coming out under the warehouse doors. Montserrat Riera stands in the road with her sleeve over her mouth and a bucket she has forgotten she\'s holding.', next: 'db_f2' },
  db_f2: { text: 'It went up in three places at once. The ground floor, the stair, the back. Your clerk from Ansbury went in for the bonded book. He hasn\'t come out.', next: 'db_f3' },
  db_f3: { text: 'Jordi\'s on the second floor with the porters\' wives and their children. There\'s one stair still standing. One trip, if you\'re quick. Choose.',
    options: [
      { text: 'The people. Get them out.', next: 'db_people' },
      { text: 'The bonded book. It\'s the proof of all of it.', next: 'db_ledgers' },
    ] },
  db_people: { speaker: 'narrator', text: 'You go up through the smoke. Jordi is at the top with a child under each arm. You bring them down, all of them, the stair cracking under the last. The book burns. On the landing, you find Gilbert Ashe, the bonded book under him, open. He didn\'t get down.',
    options: [{ text: 'Carry him down.', effect: (g) => { g.setFlag('coBonded', 'people'); g.setFlag('coGilbertDead', true); g.setStage(SW5, 'laia'); } }] },
  db_ledgers: { speaker: 'narrator', text: 'You go up through the smoke to the landing. Gilbert Ashe is there, face down, the bonded book under him. You take it from his hands. Above you someone is shouting Jordi\'s name. Then the stair goes, and there\'s no more shouting.',
    options: [{ text: 'Get out.', effect: (g) => { g.setFlag('coBonded', 'ledgers'); g.setFlag('coGilbertDead', true); g.give(BONDED_BOOK); g.setStage(SW5, 'laia'); } }] },
});

const sw5Hooks = (D: Record<string, DialogueTree>) => {
  hook(D, 'inf_laia', (g) => (sw5(g) === 'laia' ? 'db_l1' : undefined), {
    db_l1: { text: (g) => (g.flag('coBonded') === 'people'
      ? 'Your porters\' families will live. The children took the least smoke; the mothers took the most, holding them. Jordi will cough for a year. He asked me who carried him. I said you.'
      : 'Nobody came down from the second floor. I\'m sorry. Jordi Alsina had worked in that warehouse since he was twelve.'), next: 'db_l2' },
    db_l2: { text: 'The Assembly\'s men say the fire started in three places at once. Nobody sets a fire in three places by accident.', next: 'db_l3' },
    db_l3: { text: 'The Company says the Assembly did it, to be rid of a tenant. The Assembly says the Company did it, for the underwriters. Only one of them is lying, and I know which one I\'d bet on.',
      options: [{ text: 'So do I.', effect: (g) => {
        g.setStage(SW5, 'done');
        g.addMarks(220); g.give(SCRIP, 16);
        g.setFlag('co:rank', Math.max(3, Number(g.flag('co:rank') ?? 0)));
        g.toast('Gilbert Ashe is buried in Callis. You\'re a chief factor of the Counting House: 220 marks and 16 scrip.');
      } }] },
  });
};

// After the fire: Gilbert's window has a new clerk, and if the stair went with Jordi on it, so has Callis's
const gone = (id: string, when: (g: GameApi) => boolean) => { const n = npcs.find((x) => x.id === id); if (n) n.when = when; };
gone('co_gilbert', (g) => !g.flag('coGilbertDead'));
gone('co_jordi', (g) => g.flag('coBonded') !== 'ledgers');
for (const [id, name, house, face, after] of [
  ['co_hedda', 'Hedda Lyle', 'ansbury', { skin: '#e8c0a0', hair: '#6a4a2a', hairStyle: 2, lashes: true, age: 0.3 }, (g: GameApi) => !!g.flag('coGilbertDead')],
  ['co_berta', 'Berta Ribas', 'callis', { skin: '#c8906a', hair: '#2a1e14', hairStyle: 2, lashes: true, age: 0.4 }, (g: GameApi) => g.flag('coBonded') === 'ledgers'],
] as const) {
  const h = HOUSE_BY_ID.get(house)!;
  npcs.push({ id, name, title: `Clerk of the Counting House, ${h.town}`, look: look({ ...face, tunic: '#22365a', trim: '#e8e4dc' }), schedule: stand(h.clerk), barks: ['Contracts at the window.', 'I\'m new. The window isn\'t.'], when: after });
  dialogue[id] = clerkTree(h);
}

// ------------------------------------------------------------------ "Short Weight", VI: The Reckoning
// The Governor, Lucan Thorne, comes down from the Charter Hall to the Ansbury office to hear about Callis.
// Constance Ferrars says the Assembly burned it. You lay down what you kept (the Hen's page, her letter
// to Gil Fenner, the bonded book: two or more and he can't look away), then say where it goes: to him,
// to keep it inside the Company; to the Speaker's Ushers, in public; or across the street to the
// Merchants' Hall. Flag "coReckoning": 'governor' | 'ushers' | 'hall'; "coProof" counts what you laid
// down. Changes what the Gullmouth factor and Constance Ferrars say from then on.

const SW6 = 'coReckoning';
const sw6 = (g: GameApi) => g.stage(SW6);
/** What you kept that proves it: the Hen's page, her letter, the bonded book. */
const proofs = (g: GameApi) => [g.flag('coHen') === 'kept', g.flag('coSalt') === 'took' || g.flag('coSalt') === 'paid', g.has(BONDED_BOOK)].filter(Boolean).length;
const reckon = (g: GameApi, choice: 'governor' | 'ushers' | 'hall', why: string) => {
  g.setFlag('coReckoning', choice);
  g.setFlag('coProof', proofs(g));
  g.setStage(SW6, 'done');
  g.addMarks(300);
  g.give(SCRIP, 25);
  g.setFlag('co:rank', 4);
  g.toast(`${why} The Counting House calls you one of its own: 300 marks and 25 scrip.`);
};

npcs.push({ id: 'co_lucan', name: 'Lucan Thorne', title: 'Governor of the Counting House', look: look({ skin: '#e0b48e', hair: '#c8c4bc', hairStyle: 0, tunic: '#22365a', trim: '#e0bd64', cape: '#1a2a44', age: 0.7, build: 1.05 }),
  schedule: [{ from: 0, to: 24, at: [966.6, 290.6], face: [963, 289], anim: 'idle' }], barks: ['Sit, if you\'re staying.', 'The Company is older than any of us.'],
  when: (g) => !!sw6(g) });

QUESTS[SW6] = {
  id: SW6, name: 'The Reckoning', region: 'crownroad', depth: 'storyline',
  notes: (g, s) => {
    if (s === 'governor') return 'Hedda Lyle says the Governor, Lucan Thorne, has come down from the Charter Hall to the Ansbury office to hear about Callis himself. Constance Ferrars has already told him the Assembly set the fire.';
    const c = g.flag('coReckoning');
    return c === 'governor' ? 'I gave it all to the Governor. The Company will settle it inside the Company, which is how the Company settles everything.'
      : c === 'ushers' ? 'I took it to the Speaker\'s Ushers. It will be read aloud in the Charter Hall, and the Company will have to answer in public for the first time in forty years.'
      : 'I gave it to the Merchants\' Hall. Gullmouth\'s window is the Hall\'s now in all but the name over the door.';
  },
  objectives: (_g, s) => (s === 'governor' ? [{ text: 'See the Governor at the Counting House in Ansbury', marker: 'co_lucan' }] : []),
  marks: (g, s): Marks => {
    if (s === undefined) return g.stage(SW5) === 'done' ? { co_hedda: '!' } : {};
    return s === 'governor' ? { co_lucan: '?' } : {};
  },
  walk: { from: { quests: { [SW1]: 'done', [SW2]: 'done', [SW3]: 'done', [SW4]: 'done', [SW5]: 'done' }, flags: { 'co:signed': true, coGilbertDead: true } } },
};

hook(dialogue, 'co_hedda', (g) => (sw6(g) === undefined && g.stage(SW5) === 'done' ? 'dr_a' : undefined), {
  dr_a: { text: 'You\'re the one who was in Callis. The Governor\'s here. Himself, at the east desk, down from the Charter Hall. He asked for you by name.', next: 'dr_b' },
  dr_b: { text: 'Mistress Ferrars got to him first. She was in there an hour. I sat at Gilbert\'s window and listened to the door not open.',
    options: [{ text: 'I\'ll see him.', effect: (g) => g.setStage(SW6, 'governor') }, { text: 'Not yet.' }] },
});

dialogue['co_lucan'] = {
  start: (g) => (sw6(g) === 'governor' ? 'r1' : 'after'),
  nodes: {
    r1: { text: 'Lucan Thorne. I keep the Company\'s charter, and the Company keeps me. Mistress Ferrars says the Assembly burned Callis to be rid of a tenant. You were there. Tell me.', next: 'r2' },
    r2: { text: (g) => {
      const n = proofs(g);
      const laid = [g.flag('coHen') === 'kept' ? 'the Hen\'s page' : '', g.flag('coSalt') === 'took' || g.flag('coSalt') === 'paid' ? 'her letter to Gil Fenner' : '', g.has(BONDED_BOOK) ? 'the bonded book, Gilbert\'s blood on the cover' : ''].filter(Boolean);
      if (!n) return 'You have nothing to put on the desk. You tell him what you saw: a fire in three places, a man on the stair. He listens. He doesn\'t write anything down.';
      return `You put it on the desk: ${laid.join(', ')}. ${n >= 2 ? 'He reads all of it, twice, and when he looks up he looks older.' : 'He reads it, and puts it face down.'}`;
    }, speaker: 'narrator', next: 'r3' },
    r3: { text: (g) => (proofs(g) >= 2
      ? 'Then it\'s true, and I signed half of it without reading. Where does this go? Tell me before I decide for both of us.'
      : 'It isn\'t enough to hang a factor on. It\'s enough to frighten one. Where would you have it go?'),
      options: [
        { text: 'It stays with you. Settle it inside the Company.', next: 'r_gov' },
        { text: 'It goes to the Speaker\'s Ushers. In public.', next: 'r_ush' },
        { text: 'The Merchants\' Hall will have it.', next: 'r_hall' },
      ] },
    r_gov: { text: (g) => (proofs(g) >= 2
      ? 'Then she goes to Callis to rebuild what she burned, on a clerk\'s pay, with Montserrat Riera watching her. The galleon pays her dues. And nobody outside this room hears a word. That\'s the Company\'s way.'
      : 'Then I\'ll watch her, and she\'ll know I\'m watching, and that will have to do. The Company has survived worse than one factor.'),
      options: [{ text: 'So be it.', effect: (g) => reckon(g, 'governor', 'The Governor will settle it inside the Company.') }] },
    r_ush: { text: 'Then it will be read aloud in the Charter Hall, and the Company will answer in public for the first time in forty years. It may not survive it. It may deserve not to. Go. Before I think better of letting you.',
      options: [{ text: 'Gilbert deserved better.', effect: (g) => reckon(g, 'ushers', 'You took it to the Speaker\'s Ushers.') }] },
    r_hall: { text: 'Across the street. Of course. Varcoe will have our Gullmouth window by Lady Day, and Avis Spurr will take her orders from the Hall and pretend she doesn\'t. You\'ll have made the Hall rich and us honest. I\'m not sure which you meant.',
      options: [{ text: 'Both.', effect: (g) => reckon(g, 'hall', 'The Merchants\' Hall has it all.') }] },
    after: { text: (g) => {
      const c = g.flag('coReckoning');
      return c === 'ushers' ? 'The Ushers have the books. I spend my days explaining the Company to men who have never weighed anything. Sit, if you\'re staying.'
        : c === 'hall' ? 'Thomas Varcoe sends me his compliments every Monday. I keep them in a drawer.'
        : 'Constance writes from Callis every week. The letters are very correct. I read them twice.';
    } },
  },
};

// After the reckoning, the Gullmouth factor and Constance Ferrars say what it's cost them
hook(dialogue, 'co_avis', (g) => (g.stage(SW6) === 'done' ? 'rk_avis' : undefined), {
  rk_avis: { text: (g) => {
    const c = g.flag('coReckoning');
    return c === 'hall' ? 'The Hall\'s factor, for all the sign says. Varcoe comes in on Mondays to count my stock. I let him. The stock\'s still for scrip.'
      : c === 'ushers' ? 'They read it all out in the Charter Hall, you know. Even Osmund\'s book. He stood at the back and wept. The stock\'s for scrip, same as ever.'
      : 'The galleon paid her dues last week. Osmund stamped the receipt himself and pinned it over the window. The stock\'s for scrip.';
  }, options: [{ text: 'Show me the stock.', effect: (g) => g.openShop('co_gullmouth') }, { text: 'Good day.' }] },
});
hook(dialogue, 'co_constance', (g) => (g.stage(SW6) === 'done' ? 'rk_con' : undefined), {
  rk_con: { text: (g) => {
    const c = g.flag('coReckoning');
    return c === 'ushers' ? 'Under bond till the Speaker\'s court sits. They let me keep the stock, because nobody else knows where anything is. Buy something. It all counts against me now.'
      : c === 'hall' ? 'The Hall has my name, and the Company has my desk, and I have the stock till they decide which of them gets me. What do you want?'
      : Number(g.flag('coProof') ?? 0) >= 2 ? 'I sail for Callis on Friday, to rebuild a warehouse. On a clerk\'s pay. Montserrat will enjoy that. You can buy something before I go.'
      : 'The Governor watches me now. So do you. It\'s a small room for so much watching. What do you want?';
  }, options: [{ text: 'Show me the stock.', effect: (g) => g.openShop('co_ansbury') }, { text: 'Good day.' }] },
});

export const COMPANY_CONTENT: RegionContent = { id: 'company', items: ITEMS, npcs, dialogue, shops, quests: QUESTS, things, hooks: (D) => { sw2Hooks(D); sw3Hooks(D); sw4Hooks(D); sw5Hooks(D); } };
