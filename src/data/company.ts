import type { Appearance } from '../entities/humanoid';
import { utcDay } from './calendar';

// THE COUNTING HOUSE: the Charter's own sea trade (docs/COMPANY_BRIEF.md), in the manner of Skyrim's
// East Empire Company. It keeps an office and a bonded warehouse in the towns, a factor in each who
// sells what the Company brings in, and a clerk with the day's contracts at the window:
//   carry: a sealed cargo to another house before the bell (late, and the Company pays half);
//   collect: a debt from a trader in the town, in coin or in goods (goods pay two-thirds).
// Contracts pay marks and Company scrip, which buys the Company's own stock. The contract out is kept
// in the flag "co:job"; the ones done today in "co:done" ({ day, keys }). The people's dialogue and the
// stock are in data/content/company.ts; the buildings in world/sites.ts (countingHouse).

/** Somebody of the Company's: where they stand, how they look, what they say in passing. */
interface Person { id: string; name: string; at: [number, number]; face: [number, number]; look: Partial<Appearance>; barks: string[] }

export interface Debtor extends Person {
  title: string;
  /** What they owe for, as the clerk says it; what they say when the Company's paper comes. */
  owes: string;
  plea: string;
  /** Said when there's no paper for them; when you take the coin; when you take goods. */
  idle: string;
  coin: string;
  goods: string;
}

export interface CountingHouse {
  id: string;
  /** The town, as people say it. */
  town: string;
  /** The clerk at the window with the board, and the factor who sells for scrip (and what they say first). */
  clerk: Person;
  factor: Person & { hello: string };
  /** The two traders in the town who owe the Company. */
  debtors: Debtor[];
  /** Where its carries go: the other houses it trades with, and whether the way is by sea (a ferry, more time). */
  routes: { to: string; sea?: boolean }[];
}

export type ContractKind = 'carry' | 'collect';

export interface Contract {
  day: number;
  /** The house that posted it, and its place on the board (0 to 2). */
  house: string;
  n: number;
  kind: ContractKind;
  /** carry: the house it goes to, and when it's due (ms since the epoch). */
  to?: string;
  due?: number;
  /** collect: who owes. */
  debtor?: string;
  /** carry: the bonded cargo, the board's second: heavier, better paid, a tighter bell. */
  bonded?: boolean;
  /** What it pays, in marks and scrip. */
  marks: number;
  scrip: number;
}

const COAT = { tunic: '#22365a', trim: '#e8e4dc', trousers: '#2a2a34', boots: '#1e1a16' };

/** The houses: world/sites.ts builds each (countingHouse) at the office corner noted beside it. */
export const HOUSES: CountingHouse[] = [
  {
    // East Avenue, Ansbury, by the east gate the sea road leaves by: office corner (957, 281)
    id: 'ansbury', town: 'Ansbury', routes: [{ to: 'gullmouth' }],
    clerk: { id: 'co_gilbert', name: 'Gilbert Ashe', at: [964.5, 284.0], face: [964.5, 290], look: { ...COAT, skin: '#e0b48e', hair: '#5a4a3a', hairStyle: 0, age: 0.35, hat: 'cap', hatColor: '#22365a' },
      barks: ['Contracts at the window.', 'Sign, and print it under.', 'The bell is the bell.'] },
    factor: { id: 'co_constance', name: 'Constance Ferrars', at: [960.6, 290.4], face: [964, 289], look: { ...COAT, skin: '#f0d0b8', hair: '#c8c0b0', hairStyle: 2, lashes: true, age: 0.6, cape: '#22365a' },
      barks: ['Callis red, the last of the spring shipment.', 'Scrip, not marks. House rule.'],
      hello: 'Constance Ferrars, factor for Ansbury. What the Company brings up the sea road comes through this room, and the best of it stays here, for scrip.' },
    debtors: [
      { id: 'co_lionel', name: 'Lionel Tapp', title: 'Wine agent', at: [945.5, 295.4], face: [945.5, 300], look: { skin: '#d8a882', hair: '#2a1e14', hairStyle: 3, tunic: '#5a1a2a', trim: '#c8a050', build: 1.1, age: 0.5 },
        barks: ['Callis wine, by the cask or the glass.', 'Pay day is Friday. Ask anyone.'],
        owes: 'He took forty casks of Callis red on the Company\'s credit at Lammas and has paid for eleven.',
        plea: 'The Counting House. Of course it is. Look, the wine came in sour, half of it. I wrote to Mistress Ferrars. She wrote back that sour is a matter of taste. Tell her I\'ll pay when the Tilt Ward pays me.',
        idle: 'Lionel Tapp. If it\'s wine you want, I have it. If you\'re from the Company, I\'m not here.',
        coin: 'There. That\'s every mark in the box, and the box. Tell her I paid, and tell her the wine was sour.',
        goods: 'Take three casks, then. The good ones. I\'ll know if they say they were sour.' },
      { id: 'co_marian', name: 'Marian Hooke', title: 'Mercer', at: [985.5, 305.0], face: [985.5, 300], look: { skin: '#e8c0a0', hair: '#6a3a24', hairStyle: 2, lashes: true, tunic: '#4a2a5a', trim: '#e0d0a0', age: 0.45 },
        barks: ['Silk from Callis, wool from the Fold.', 'Measure twice.'],
        owes: 'She owes for two bales of Callis silk the Company brought in at her order, and the duty on them.',
        plea: 'The silk came. The order that wanted it didn\'t: a wedding in the Guild Ward, called off. I have two bales of the finest blue in Ansbury and nobody to marry in it. I can pay the duty. Not the silk.',
        idle: 'Marian Hooke, mercer. Silk, wool, linen. Measure twice, cut once, pay on the day. Usually.',
        coin: 'All of it. I\'ll sell my mother\'s brooch. Don\'t tell me it\'s the right thing; I know it is.',
        goods: 'Take a bolt of the blue back to them, then. They can find a wedding for it.' },
    ],
  },
  {
    // The north end of Gullmouth's quay: office corner (1784, 560)
    id: 'gullmouth', town: 'Gullmouth', routes: [{ to: 'ansbury' }, { to: 'brasswick', sea: true }],
    clerk: { id: 'co_osmund', name: 'Osmund Dray', at: [1790.5, 563.0], face: [1790.5, 569], look: { ...COAT, skin: '#c89070', hair: '#2a1e14', hairStyle: 1, beard: true, age: 0.45 },
      barks: ['Contracts at the window.', 'The Hall\'s clerk counts our ships. We count theirs.'] },
    factor: { id: 'co_avis', name: 'Avis Spurr', at: [1787.6, 569.4], face: [1791, 568], look: { ...COAT, skin: '#d8a882', hair: '#8a4a2a', hairStyle: 2, lashes: true, age: 0.5, hat: 'wide', hatColor: '#1e2a40' },
      barks: ['Wine, silk, timber. For scrip.', 'The Hall can say what it likes.'],
      hello: 'Avis Spurr, factor for Gullmouth. The Merchants\' Hall says this was meant to be a fish store. Some mornings it smells like one. The stock\'s good, and it\'s for scrip.' },
    debtors: [
      { id: 'co_jenifer', name: 'Jenifer Laity', title: 'Net-maker', at: [1781.5, 637.5], face: [1785, 636.5], look: { skin: '#e2b894', hair: '#a8a49c', hairStyle: 2, lashes: true, tunic: '#4a5a6a', trim: '#c8b890', age: 0.7 },
        barks: ['Mind the nets.', 'Hemp\'s gone up again.'],
        owes: 'She owes for a winter\'s hemp, bought from the Company at the Company\'s price.',
        plea: 'The Company\'s hemp. The Company\'s price. The Company\'s boats that I mend the nets for, at the Company\'s rate, which hasn\'t gone up since my husband was alive. You see how this goes round.',
        idle: 'Jenifer Laity. Nets. If you\'ve one torn, I\'ll mend it. If you\'re the Company, I\'ve already mended yours.',
        coin: 'Here. Tell Avis Spurr she can buy her own hemp next winter.',
        goods: 'A new trawl, then, made with their own hemp. Let them sell it back to themselves.' },
      { id: 'co_cadan', name: 'Cadan Treen', title: 'Fish-curer', at: [1789.5, 615.5], face: [1786, 615.5], look: { skin: '#b8865e', hair: '#3a2a1a', hairStyle: 3, beard: true, tunic: '#3a3a30', trim: '#8a7a5a', apron: true, build: 1.1, age: 0.55 },
        barks: ['Salt, fish, barrel. That\'s the trade.', 'Bay salt\'s best. The Company\'s isn\'t bay salt.'],
        owes: 'He owes for forty sacks of salt and swears they were damp.',
        plea: 'Damp salt. You can\'t cure with damp salt; you can rot with it. I\'ve a cellar of pilchards to show for it, and the Company\'s paper says I owe for every grain. Smell the cellar and tell me I owe.',
        idle: 'Cadan Treen. Pilchards, salt and the barrel. If you\'re buying, the good ones are on the left.',
        coin: 'There. I\'ve paid for their damp salt. Next time I buy from the Brethren and pay no duty at all.',
        goods: 'A barrel of the cure that took. They can count it fish by fish.' },
    ],
  },
  {
    // Brasswick on Kell: no house of its own. A desk and a stall under the Company's banner in front of
    // Harrowgate & Daughters' office on the high street, which the Company shares with Piran Hext
    id: 'brasswick', town: 'Brasswick', routes: [{ to: 'gullmouth', sea: true }],
    clerk: { id: 'co_bryok', name: 'Bryok Angwin', at: [2375.5, -563.0], face: [2375.5, -559], look: { ...COAT, skin: '#d8a882', hair: '#2a1e14', hairStyle: 3, age: 0.4, hat: 'cap', hatColor: '#22365a' },
      barks: ['The Company\'s desk. Harrowgate\'s door.', 'Kell boat\'s in at the hour.'] },
    factor: { id: 'co_ysolt', name: 'Ysolt Penhaligon', at: [2371.5, -562.8], face: [2371.5, -559], look: { ...COAT, skin: '#e2b894', hair: '#a8562a', hairStyle: 2, lashes: true, age: 0.45, cape: '#22365a' },
      barks: ['Mainland goods, island prices.', 'For scrip, not for brass.'],
      hello: 'Ysolt Penhaligon, factor, from a stall, because Harrowgate let us half an office and kept the half with the chairs. What the Kell boat brings, I sell, for scrip.' },
    debtors: [
      { id: 'co_elestren', name: 'Elestren Mabe', title: 'Glazier', at: [2394.5, -552.4], face: [2394.5, -556], look: { skin: '#f0d0b8', hair: '#3a2a1e', hairStyle: 2, lashes: true, tunic: '#3a4a52', trim: '#9fd8e8', apron: true, age: 0.4 },
        barks: ['Lamp-glass, leaded or plain.', 'Mind the crate. It\'s all edges.'],
        owes: 'She owes for a shipment of mainland lead for her leading, which the Kell boat brought over in the spring.',
        plea: 'The lead came. Half of it was the Company\'s lead and half of it was stone painted grey. I\'ve the stone still, if they want to see it. I\'ll pay for the half that was lead.',
        idle: 'Elestren Mabe. Lamp-glass for the Works, windows for anyone who can wait.',
        coin: 'All of it, then, stone and lead. Tell them I\'m keeping the stone. It makes a good doorstop.',
        goods: 'A crate of lamp-glass. Tell them each pane\'s worth more than their lead.' },
      { id: 'co_treeve', name: 'Treeve Chenoweth', title: 'Cooper', at: [2416.5, -552.6], face: [2416.5, -556], look: { skin: '#c89070', hair: '#5a4030', hairStyle: 3, beard: true, tunic: '#5a4a3a', trim: '#2a1e14', apron: true, build: 1.15, age: 0.55 },
        barks: ['Staves, hoops, the lot.', 'A barrel that leaks is a bucket.'],
        owes: 'He owes for two hundred oak staves from the mainland. Kell grows no oak to speak of.',
        plea: 'Two hundred staves at the Company\'s price, and then the Works stopped buying barrels for the summer. I\'ve a shed of casks nobody wants. I can pay a third.',
        idle: 'Treeve Chenoweth, cooper. If it holds water, I made it.',
        coin: 'There. That\'s the summer gone. Tell the Company I\'ll be buying my staves off the Brethren from now on.',
        goods: 'Six casks, new. They hold water, which is more than their contracts do.' },
    ],
  },
];
export const HOUSE_BY_ID = new Map(HOUSES.map((h) => [h.id, h]));

export const SCRIP = 'co_scrip';
export const CARGO = 'co_cargo';
export const PURSE = 'co_purse';
export const GOODS = 'co_goods';

/** A cheap hash of the day and the house, so everyone sees the same board on the same day. */
const roll = (day: number, house: string, k: number) => {
  let h = (day * 2654435761 + k * 97) >>> 0;
  for (const c of house) h = Math.imul(h ^ c.charCodeAt(0), 2246822519) >>> 0;
  return (h % 10000) / 10000;
};

/** Between two houses, as the crow flies, in blocks. */
export function houseDistance(a: string, b: string): number {
  const A = HOUSE_BY_ID.get(a), B = HOUSE_BY_ID.get(b);
  return A && B ? Math.hypot(A.clerk.at[0] - B.clerk.at[0], A.clerk.at[1] - B.clerk.at[1]) : 0;
}

/** Seconds a carry is given: a steady ride and some to spare. */
export const carrySecs = (dist: number, sea = false) => Math.round(dist / 5 + 240 + (sea ? 360 : 0));
/** A contract's bell, in seconds from taking it: the bonded cargo gets four-fifths of the time. */
export const contractSecs = (c: Contract) => Math.round(carrySecs(houseDistance(c.house, c.to!), !!HOUSE_BY_ID.get(c.house)?.routes.find((r) => r.to === c.to)?.sea) * (c.bonded ? 0.8 : 1));

/** The board at a house today: two carries to other houses (the second heavier, better paid) and a debt. */
export function boardToday(house: string, day = utcDay()): Contract[] {
  const h = HOUSE_BY_ID.get(house);
  if (!h) return [];
  const others = h.routes.map((r) => HOUSE_BY_ID.get(r.to)!).filter(Boolean);
  const out: Contract[] = [];
  for (let k = 0; k < 2 && others.length; k++) {
    const to = others[Math.floor(roll(day, house, k) * others.length)];
    const dist = houseDistance(house, to.id);
    out.push({ day, house, n: k, kind: 'carry', to: to.id, bonded: k === 1, marks: Math.round((20 + dist * 0.06) * (k ? 1.5 : 1)), scrip: k ? 5 : 3 });
  }
  if (h.debtors.length) {
    const d = h.debtors[Math.floor(roll(day, house, 7) * h.debtors.length)];
    out.push({ day, house, n: 2, kind: 'collect', debtor: d.id, marks: 35, scrip: 3 });
  }
  return out;
}

export function debtorOf(id: string): (Debtor & { house: CountingHouse }) | undefined {
  for (const h of HOUSES) for (const d of h.debtors) if (d.id === id) return { ...d, house: h };
  return undefined;
}

/** What the board and the tracker call a contract. */
export function contractTitle(c: Contract): string {
  if (c.kind === 'carry') return `Carry ${c.bonded ? 'a bonded' : 'a sealed'} cargo to ${HOUSE_BY_ID.get(c.to!)?.town ?? 'another house'}`;
  return `Collect ${debtorOf(c.debtor!)?.name ?? 'a debt'}'s account`;
}

/** What's left to do on the contract you hold, for the tracker. */
export function contractSteps(c: Contract, has: (item: string) => boolean, now = Date.now()): string[] {
  if (c.kind === 'carry') {
    const to = HOUSE_BY_ID.get(c.to!), left = Math.ceil(((c.due ?? now) - now) / 1000);
    return [`Take it to the clerk at the Counting House, ${to?.town}`, left > 0 ? `Due in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Late: the Company pays half'];
  }
  const d = debtorOf(c.debtor!);
  if (has(PURSE) || has(GOODS)) return [`Take it back to the clerk at the Counting House, ${d?.house.town}`];
  return [`Find ${d?.name}, ${d?.title.toLowerCase()}, in ${d?.house.town}`];
}

/** How much of a carry's pay you get, handed in now: all of it in time, half late. */
export const carryPay = (c: Contract, now = Date.now()) => (c.due && now > c.due ? 0.5 : 1);
/** A debt taken in goods pays two-thirds. */
export const GOODS_SHARE = 2 / 3;
