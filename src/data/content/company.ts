import type { DialogueTree, DOption, GameApi } from '../../game/api';
import { utcDay } from '../calendar';
import { boardToday, CARGO, carryPay, contractSecs, contractTitle, debtorOf, GOODS, GOODS_SHARE, HOUSE_BY_ID, HOUSES, houseDistance, PURSE, SCRIP, type Contract, type CountingHouse, type Debtor } from '../company';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
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

export const COMPANY_CONTENT: RegionContent = { id: 'company', items: ITEMS, npcs, dialogue, shops };
