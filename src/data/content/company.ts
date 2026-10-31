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

export const COMPANY_CONTENT: RegionContent = { id: 'company', items: ITEMS, npcs, dialogue, shops, quests: QUESTS, things, hooks: (D) => sw2Hooks(D) };
