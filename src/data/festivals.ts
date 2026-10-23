import type { ItemDef } from './items';
import type { WritKind } from './calendar';

// The festival year: seven fairs on the real calendar, the same days for everyone (as in ESO's and
// GW2's annual events). While one is on, every town with a Charter Post sets up a festival stall
// with bunting and its own centrepiece; creatures drop the festival's token; there's a festival
// writ each day; and the stall trades tokens for things you can't get any other way: a horse, two
// dyes for the wardrobe, and a festival dish. Everything is cosmetic or for comfort, never power,
// and each festival comes back every year with the same goods.

export type FestivalId = 'shrove' | 'lambing' | 'midsummer' | 'harvest' | 'lantern' | 'goose' | 'frostfair';

export interface FestivalDef {
  id: FestivalId;
  name: string;
  /** Month and day it opens and closes (inclusive, UTC). Frostfair runs over the new year. */
  from: [number, number];
  to: [number, number];
  blurb: string;
  /** The token: its item id and how a stall price reads ("4 corn dollies"). */
  token: string;
  tokenPlural: string;
  /** Bunting colours, and the centrepiece set up beside each stall. */
  colors: string[];
  centre: 'maypole' | 'bonfire' | 'harvest' | 'lanterns' | 'firtree';
  /** The day's festival writ. */
  writ: { name: string; desc: string; kind: WritKind; need: number };
  /** What the stall sells, priced in tokens. */
  stall: { item: string; price: number }[];
}

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'shrove', name: 'Shrovetide', from: [2, 2], to: [2, 24],
    blurb: 'Pancakes before the lean weeks, a race when the pancake bell rings at eleven, and a straw man on a pole that everyone throws things at. The stalls take pancake tokens, stamped tin from the race.',
    token: 'pancake_token', tokenPlural: 'pancake tokens',
    colors: ['#f2d75a', '#c8401e', '#2a4a8a', '#f4f0e4'], centre: 'bonfire',
    writ: { name: 'Run for the Bell', desc: 'Get about the counties: travel 1,000 blocks.', kind: 'travel', need: 1000 },
    stall: [
      { item: 'pancake', price: 3 }, { item: 'dye_shrove', price: 15 }, { item: 'dye_motley', price: 15 }, { item: 'halter_shrove', price: 40 },
    ],
  },
  {
    id: 'lambing', name: 'The Lambing Fair', from: [3, 20], to: [4, 20],
    blurb: 'Spring in the Charter Counties: the first lambs, ribbons on the gateposts and a maypole on every green. The shepherds pay their help in fair ribbons, and the stalls take nothing else.',
    token: 'fair_ribbon', tokenPlural: 'fair ribbons',
    colors: ['#f4f0e4', '#9ad06a', '#f2d75a', '#f0a0b8'], centre: 'maypole',
    writ: { name: 'Gather the Flock', desc: 'Help out across the counties: do four chores for parish tasks.', kind: 'chore', need: 4 },
    stall: [
      { item: 'simnel_cake', price: 3 }, { item: 'dye_primrose', price: 15 }, { item: 'dye_lambswool', price: 15 }, { item: 'halter_lambing', price: 40 },
    ],
  },
  {
    id: 'midsummer', name: 'Midsummer Watch', from: [6, 14], to: [7, 10],
    blurb: 'The shortest nights of the year, kept awake on purpose. Watch-fires burn on every green until dawn, and an ember from one is worth something at the stalls.',
    token: 'watch_ember', tokenPlural: 'watch-fire embers',
    colors: ['#e8a020', '#c8401e', '#f6e08a', '#6ab0e8'], centre: 'bonfire',
    writ: { name: 'Keep the Watch', desc: 'Walk the roads between the fires: travel 1,500 blocks.', kind: 'travel', need: 1500 },
    stall: [
      { item: 'strawberry_tart', price: 3 }, { item: 'dye_solstice', price: 15 }, { item: 'dye_skyblue', price: 15 }, { item: 'halter_midsummer', price: 40 },
    ],
  },
  {
    id: 'harvest', name: 'Harvest Home', from: [9, 18], to: [10, 20],
    blurb: 'The last sheaf is in. Every town hangs its corn dollies out, sets up a stall of good things, and pays in dollies anyone who helps clear the fields of what\'s been eating them.',
    token: 'corn_dolly', tokenPlural: 'corn dollies',
    colors: ['#d8a040', '#a0522d', '#e8d8a0', '#6a8a3a'], centre: 'harvest',
    writ: { name: 'Clear the Stubble', desc: 'Bring down 12 creatures that are after the harvest.', kind: 'kill', need: 12 },
    stall: [
      { item: 'harvest_loaf', price: 3 }, { item: 'dye_russet', price: 15 }, { item: 'dye_barley', price: 15 }, { item: 'halter_harvest', price: 40 },
    ],
  },
  {
    id: 'lantern', name: 'The Lantern Wake', from: [10, 24], to: [11, 10],
    blurb: 'When the year turns dark the counties sit up with their dead. Turnip lanterns in every window, candles along the walls, and a stall that trades only in wake candles, for luck.',
    token: 'wake_candle', tokenPlural: 'wake candles',
    colors: ['#5b3a8a', '#e8701a', '#2a2420', '#d8c8a0'], centre: 'lanterns',
    writ: { name: 'Sit Up With the Dead', desc: 'Answer the bell: see a world event through.', kind: 'event', need: 1 },
    stall: [
      { item: 'soul_cake', price: 3 }, { item: 'dye_wakeviolet', price: 15 }, { item: 'dye_lanternorange', price: 15 }, { item: 'halter_lantern', price: 40 },
      { item: 'parkin', price: 4 }, { item: 'toffee_apple', price: 4 }, { item: 'mulled_cider', price: 5 },
      { item: 'furn_turnip', price: 6 }, { item: 'furn_gourds', price: 10 }, { item: 'furn_scarecrow', price: 20 },
      { item: 'costume_scarecrow', price: 60 }, { item: 'costume_ghost', price: 60 }, { item: 'costume_skeleton', price: 70 },
      { item: 'costume_witch', price: 70 }, { item: 'costume_crow', price: 90 }, { item: 'costume_lanternman', price: 140 },
    ],
  },
  {
    id: 'goose', name: 'Goose Fair', from: [11, 14], to: [12, 3],
    blurb: 'Geese walk in from every farm in the counties to be sold, and half of them get loose. A feast for the end of the year\'s work, and a goose quill for anyone who catches one.',
    token: 'goose_quill', tokenPlural: 'goose quills',
    colors: ['#f4f0e4', '#a0522d', '#e8a020', '#5a6a3a'], centre: 'harvest',
    writ: { name: 'Mind the Geese', desc: 'Help out across the counties: do four chores for parish tasks.', kind: 'chore', need: 4 },
    stall: [
      { item: 'roast_goose', price: 3 }, { item: 'dye_goosegrey', price: 15 }, { item: 'dye_cranberry', price: 15 }, { item: 'halter_goose', price: 40 },
    ],
  },
  {
    id: 'frostfair', name: 'The Frostfair', from: [12, 12], to: [1, 6],
    blurb: 'The Wend freezes at the ford and the whole county goes out on it. Chestnuts, fir trees hung with lights, and a frost penny for anyone who keeps the roads open through the snow.',
    token: 'frost_penny', tokenPlural: 'frost pennies',
    colors: ['#b0202a', '#cfe8f4', '#2f5a3a', '#e8d080'], centre: 'firtree',
    writ: { name: 'Keep the Roads Open', desc: 'Bring down 12 creatures that come down with the snow.', kind: 'kill', need: 12 },
    stall: [
      { item: 'roast_chestnuts', price: 3 }, { item: 'dye_hollyred', price: 15 }, { item: 'dye_rime', price: 15 }, { item: 'halter_frost', price: 40 },
    ],
  },
];

/** Days in the year from a month and day (ignoring leap days: close enough for a fair). */
const doy = (m: number, d: number) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1] + d;

/** The festival on at a time, if any. ?festival=<id> in the address forces one (for testing). */
export function festivalAt(now = Date.now()): FestivalDef | null {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('festival') : null;
    if (q) return FESTIVALS.find((f) => f.id === q) ?? null;
  } catch { /* no location (tools) */ }
  const t = new Date(now), day = doy(t.getUTCMonth() + 1, t.getUTCDate());
  for (const f of FESTIVALS) {
    const a = doy(...f.from), b = doy(...f.to);
    if (a <= b ? day >= a && day <= b : day >= a || day <= b) return f;
  }
  return null;
}

/** When a festival next opens and closes after now (for the calendar page). */
export function festivalDates(f: FestivalDef, now = Date.now()): { opens: Date; closes: Date } {
  const t = new Date(now), y = t.getUTCFullYear();
  let opens = new Date(Date.UTC(y, f.from[0] - 1, f.from[1]));
  let closes = new Date(Date.UTC(f.to[0] < f.from[0] ? y + 1 : y, f.to[0] - 1, f.to[1], 23, 59));
  // Still on from last year (Frostfair in January), or already over this year
  const prevClose = new Date(Date.UTC(f.to[0] < f.from[0] ? y : y - 1, f.to[0] - 1, f.to[1], 23, 59));
  if (f.to[0] < f.from[0] && now <= prevClose.getTime()) { opens = new Date(Date.UTC(y - 1, f.from[0] - 1, f.from[1])); closes = prevClose; }
  else if (now > closes.getTime()) { opens = new Date(Date.UTC(y + 1, f.from[0] - 1, f.from[1])); closes = new Date(Date.UTC(f.to[0] < f.from[0] ? y + 2 : y + 1, f.to[0] - 1, f.to[1], 23, 59)); }
  return { opens, closes };
}

const token = (id: string, name: string, a: string, b: string, desc: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'coin', a, b }, desc, stats: 'Festival token: spend it at a festival stall by any Charter Post. Keeps until next year.' });
const food = (id: string, name: string, a: string, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'uncommon', stack: true, value: 4, icon: { shape: 'bread', a }, desc, heal: 45, stats: 'Restores 45 health. Festival fare.' });
const dye = (id: string, name: string, color: string, desc: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'gel', a: color }, desc, dye: { color, name: name.replace(/ dye$/, '') }, stats: 'Use it to add this colour to your wardrobe for good: every cloth, trim, cloak and hat swatch in Change look.' });
const horse = (id: string, name: string, coat: string, mane: string, cloth: string, desc: string, glow = false): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'shoe', a: coat, b: cloth }, mount: { coat, mane, cloth, glow }, desc, stats: 'A festival horse. Use it, or press G, to ride. Every horse keeps the same pace.' });

const costume = (id: string, name: string, a: string, b: string, desc: string): ItemDef =>
  ({ id: 'costume_' + id, name, kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'chest', a, b }, desc, costume: id, stats: 'Use it to add it to your wardrobe for good: put it on under Costume with Change look, on the character screen. It goes over your clothes and armour; looks only.' });
const decor = (id: string, name: string, model: string, a: string, b: string, desc: string): ItemDef =>
  ({ id: 'furn_' + id, name, kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'log', a, b }, desc, furn: { model }, stats: 'Furniture: set it down in a house of your own' });

/** Everything the festivals add (merged into ITEMS). */
export const FESTIVAL_ITEMS: ItemDef[] = [
  token('fair_ribbon', 'Fair ribbon', '#f0a0b8', '#9ad06a', 'A rosette of spring ribbon. The shepherds pin them on anyone who\'s been useful.'),
  token('watch_ember', 'Watch-fire ember', '#e8a020', '#c8401e', 'Still warm in a pinch of clay. Carried home from the Midsummer fires for luck.'),
  token('corn_dolly', 'Corn dolly', '#d8b050', '#a0522d', 'Plaited from the last sheaf of the harvest. Every town plaits its own shape.'),
  token('wake_candle', 'Wake candle', '#e8e0c8', '#e8701a', 'A stub of tallow candle, lit once for someone and kept.'),
  token('pancake_token', 'Pancake token', '#d8d0c0', '#c8401e', 'Stamped tin with a frying pan on one side and a bell on the other. Given out at the end of the pancake race.'),
  token('goose_quill', 'Goose quill', '#f4f0e4', '#a0522d', 'A long white flight feather, trimmed for writing. The Goose Fair pays in them.'),
  token('frost_penny', 'Frost penny', '#cfe8f4', '#9ab0c8', 'Struck on the ice at the Frostfair and good there and nowhere else.'),
  food('simnel_cake', 'Simnel cake', '#e8c070', 'Fruit cake with eleven marzipan balls on top, one for each honest apostle.'),
  food('strawberry_tart', 'Strawberry tart', '#d84050', 'The first strawberries, in pastry that crumbles if you look at it.'),
  food('harvest_loaf', 'Harvest loaf', '#c8903a', 'Baked in the shape of a wheatsheaf, with a mouse hidden somewhere in the plait.'),
  food('soul_cake', 'Soul cake', '#d8b070', 'Spiced and marked with a cross. You\'re supposed to say a name when you eat one.'),
  food('pancake', 'Pancake', '#e8c070', 'Thin, lemon and sugar, rolled. Eaten standing up, which is the point.'),
  food('roast_goose', 'Roast goose', '#c8803a', 'A leg of goose off the fair\'s spit, with a slice of apple stuck to it.'),
  food('roast_chestnuts', 'Roast chestnuts', '#7a4a2a', 'Hot from the brazier on the ice, in a twist of paper.'),
  // The Lantern Wake's treats: a meal's good and a drink's (see items.ts buff)
  { id: 'parkin', name: 'Parkin', kind: 'food', rarity: 'uncommon', stack: true, value: 4, icon: { shape: 'bread', a: '#7a4a22' }, heal: 50, buff: { slot: 'food', regen: 0.15, mins: 30 }, desc: 'Oat and treacle cake, sticky and dark. Better the third day than the first.', stats: 'Restores 50 health; stamina back 15% faster for 30 minutes.' },
  { id: 'toffee_apple', name: 'Toffee apple', kind: 'food', rarity: 'uncommon', stack: true, value: 4, icon: { shape: 'bread', a: '#a0281e' }, heal: 40, buff: { slot: 'food', hp: 0.08, mins: 30 }, desc: 'A sour apple on a stick under a glass of red toffee. Mind your teeth.', stats: 'Restores 40 health; 8% more health for 30 minutes.' },
  { id: 'mulled_cider', name: 'Mulled cider', kind: 'food', rarity: 'uncommon', stack: true, value: 5, icon: { shape: 'gel', a: '#c8701e', b: '#e8dcc0' }, heal: 30, buff: { slot: 'drink', power: 0.05, hp: 0.05, mins: 12 }, desc: 'Hot cider with clove and a curl of orange peel. Drunk at the door while you wait for them to find the cakes.', stats: 'Restores 30 health; blows 5% harder and 5% more health for 12 minutes.' },
  // ...its guising clothes (data/costumes.ts)
  costume('scarecrow', 'Scarecrow costume', '#b89a68', '#5a7a3a', 'A feed sack with a face stitched on, and straw you\'ll be picking out of your collar till Martinmas.'),
  costume('ghost', 'Bedsheet ghost', '#f4f2ec', '#141016', 'A good linen sheet with two holes cut in it. Somebody\'s mother is going to want to know where it went.'),
  costume('skeleton', 'Skeleton costume', '#16141a', '#e8e2d0', 'Black wool with the bones chalked on. The chalk comes off on everyone you dance with.'),
  costume('witch', 'Hedge-witch costume', '#3a2a4a', '#7a9a3a', 'The hat is the important part. The rest is somebody\'s gran\'s Sunday best, dyed.'),
  costume('crow', 'Crow costume', '#16141a', '#e8a030', 'A black coat and a beaked mask of boiled leather. In the fens they say crows carry word to the dead. Children run from it, then come back for another look.'),
  costume('lanternman', 'Lantern Man\'s coat', '#1e1a22', '#e8701a', 'Black coat, black hat, and the orange lining the fen children swear they saw. Wear it on the Wake and somebody will throw a turnip at you.'),
  // ...and the Wake brought indoors
  decor('turnip', 'Carved turnip', 'turnip', '#e8dcc0', '#e8701a', 'A swede with a face cut in it and a candle inside. Lasts till about Martinmas, then it doesn\'t.'),
  decor('gourds', 'Gourds and a sheaf', 'gourds', '#e8801e', '#e0c060', 'Marrows, gourds and a sheaf of oats, piled by the hearth for the Wake.'),
  decor('scarecrow', 'Wake scarecrow', 'scarecrow', '#b89a68', '#5a7a3a', 'A straw man in an old coat with a turnip head. Mostly he frightens the people who come to visit.'),
  dye('dye_shrove', 'Pancake-lemon dye', '#f2e06a', 'The pale yellow of a lemon squeezed over a pancake.'),
  dye('dye_motley', 'Motley red dye', '#c8401e', 'The red of a fool\'s cap, worn one day a year.'),
  dye('dye_goosegrey', 'Goose-grey dye', '#9a9a90', 'The soft grey of a greylag\'s back.'),
  dye('dye_cranberry', 'Cranberry dye', '#8a1e2a', 'Deep red, from the bog berries the fen people bring to the Goose Fair.'),
  dye('dye_primrose', 'Primrose dye', '#f2d75a', 'A soft spring yellow, from the hedgebanks in April.'),
  dye('dye_lambswool', 'Lamb\'s-wool dye', '#f4efe2', 'Not quite white: the colour of new fleece.'),
  dye('dye_solstice', 'Solstice gold dye', '#e8a020', 'Gold as the fires at two in the morning.'),
  dye('dye_skyblue', 'Midsummer sky dye', '#6ab0e8', 'The blue the sky goes at midnight in June, when it never gets dark.'),
  dye('dye_russet', 'Russet dye', '#a0522d', 'The red-brown of stubble fields after the plough.'),
  dye('dye_barley', 'Barley dye', '#d8c070', 'Ripe barley, just before the reapers.'),
  dye('dye_wakeviolet', 'Wake violet dye', '#5b3a8a', 'Deep violet, for sitting up with the dead.'),
  dye('dye_lanternorange', 'Turnip-lantern dye', '#e8701a', 'Orange as a candle seen through a carved turnip.'),
  dye('dye_hollyred', 'Holly red dye', '#b0202a', 'Berry red, bright against snow.'),
  dye('dye_rime', 'Rime dye', '#cfe8f4', 'The pale blue of frost on a gate in the morning.'),
  horse('halter_shrove', 'Pancake piebald', '#f0e8d8', '#3a2a1e', '#f2d75a', 'Black and white in patches, like a pancake the first time you toss it. Ran the race once and won.'),
  horse('halter_goose', 'Goose-down cream', '#ece4d4', '#c8bca8', '#a0522d', 'Cream as a goose\'s breast, and every bit as sure it\'s in charge.'),
  horse('halter_lambing', 'Maypole grey', '#e8e4dc', '#f4f0e4', '#9ad06a', 'A dapple grey with spring ribbons plaited into her mane, who expects to be admired.'),
  horse('halter_midsummer', 'Watch-fire bay', '#8a4a1e', '#2a1408', '#e8a020', 'A bay who stayed up all night at the fires and has been bright-eyed ever since.', true),
  horse('halter_harvest', 'Last-sheaf chestnut', '#a0522d', '#e8d8a0', '#d8a040', 'Pulled the last cart of the harvest home and was garlanded for it. Still wears the garland.'),
  horse('halter_lantern', 'Wake-night black', '#1a1418', '#2a2024', '#5b3a8a', 'Black as the long night, with a candle-glow in her eyes nobody can explain.', true),
  horse('halter_frost', 'Frostfair white', '#f0f4f8', '#cfe8f4', '#b0202a', 'Shod for the ice with studded shoes. Breath like smoke and a temper like a kettle.', true),
];
