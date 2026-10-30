import type { ItemDef } from './items';

// The Wake Fair: Hollin Ford's pumpkin fair, on the meadow east of the bridge, south of the east road,
// while the Lantern Wake is on (data/festivals.ts). The Wend valley took to growing pumpkins a few
// years back, off seed from a Morrow ship, and the fair grew round the patch: hoop-la over the
// pumpkins, a lantern shy, apples in a tub, a giant pumpkin to guess the weight of, and a carver who'll
// cut a face in one you've picked yourself. The games are played at the booths (game/WakeFair.ts);
// the fair folk who keep them are in data/content/wakefair.ts.

/** The meadow: its middle and its corners. */
export const FAIR = { x: 234, z: 213, x0: 216, z0: 199, x1: 252, z1: 228 };

export type FairGameId = 'hoopla' | 'shy' | 'apples' | 'guess' | 'carve';

/** Where each booth stands, which way its front faces, and where you stand to play. */
export const BOOTHS: Record<FairGameId, { x: number; z: number; ry: number; stand: [number, number] }> = {
  // Hoop-la: the counter faces east onto the fair's middle lane; the pumpkins are on a stepped table behind it
  hoopla: { x: 222, z: 206, ry: Math.PI / 2, stand: [225, 206] },
  // The shy: a rail of lanterns on posts along the east side, a backcloth behind, thrown at from the lane
  shy: { x: 248.5, z: 206, ry: -Math.PI / 2, stand: [243.5, 206] },
  // The apple tub, on its trestle on the west side of the lane
  apples: { x: 229, z: 216, ry: Math.PI / 2, stand: [231, 216] },
  // The giant pumpkin on its cart, the scale and the judge's table
  guess: { x: 240, z: 216, ry: -Math.PI / 2, stand: [237.5, 216] },
  // The carver's trestle, at the patch's edge
  carve: { x: 244, z: 222.5, ry: Math.PI, stand: [244, 220.5] },
};

export const FAIR_GAMES: Record<FairGameId, { name: string; price: number; how: string }> = {
  hoopla: { name: 'Hoop-la', price: 2, how: 'Five rings. Throw when the swing is in the mark: a near pumpkin scores one, the middle row two, the back row three.' },
  shy: { name: 'The Lantern Shy', price: 2, how: 'Six balls at six lanterns. Throw when the sight is over one still standing.' },
  apples: { name: 'Bob for Apples', price: 2, how: 'Twenty-five seconds and one breath at a time. Duck when the apple comes round to you; every miss costs breath.' },
  guess: { name: 'The Giant Pumpkin', price: 0, how: 'Guess its weight in pounds. One guess a day; the judge weighs it in front of you.' },
  carve: { name: 'Carving', price: 0, how: 'Bring a pumpkin from the patch and pick a face. Gil does the cutting.' },
};

/** Plays a day at each game that win prizes. After that it's for the fun of it, and free. */
export const PRIZE_PLAYS = 3;

/** The pumpkins in the patch you can pick, one each a day: [x, z]. */
export const PATCH_PICKS: [number, number][] = [
  [219.5, 219.5], [222.5, 220.5], [225.5, 219.5], [228.5, 220.5], [220.5, 223.5],
  [224.5, 224.5], [227.5, 223.5], [219.5, 226.5], [223.5, 227.0], [228.0, 226.5],
];

/** The faces the carver cuts (props.jackOLantern draws them). */
export const FACES = ['Grin', 'Fright', 'Scowl', 'All teeth', 'Cat', 'Wink'];

/** The giant pumpkin's true weight today, in pounds: new pumpkin, new weight, every (UTC) day. */
export function giantWeight(day: number): number {
  let h = Math.imul(day ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15; h = Math.imul(h, 0x165667b1); h ^= h >>> 13;
  return 380 + ((h >>> 0) % 541);
}

/** What a score wins: wake candles, sometimes something to keep. */
export function prizeFor(game: FairGameId, score: number, guessOff = 1): { candles: number; item?: string; hatChance: number } {
  switch (game) {
    case 'hoopla': return score >= 12 ? { candles: 6, hatChance: 0.12 } : score >= 8 ? { candles: 4, hatChance: 0 } : score >= 4 ? { candles: 2, hatChance: 0 } : { candles: score > 0 ? 1 : 0, hatChance: 0 };
    case 'shy': return score >= 6 ? { candles: 6, hatChance: 0.1 } : score >= 4 ? { candles: 4, hatChance: 0 } : score >= 2 ? { candles: 2, hatChance: 0 } : { candles: score, hatChance: 0 };
    case 'apples': return score >= 8 ? { candles: 6, item: 'toffee_apple', hatChance: 0.08 } : score >= 5 ? { candles: 4, item: 'toffee_apple', hatChance: 0 } : score >= 3 ? { candles: 2, hatChance: 0 } : { candles: score > 0 ? 1 : 0, hatChance: 0 };
    case 'guess': return guessOff <= 0.02 ? { candles: 10, hatChance: 0.25 } : guessOff <= 0.05 ? { candles: 6, hatChance: 0 } : guessOff <= 0.1 ? { candles: 3, hatChance: 0 } : guessOff <= 0.2 ? { candles: 1, hatChance: 0 } : { candles: 0, item: 'soul_cake', hatChance: 0 };
    default: return { candles: 0, hatChance: 0 };
  }
}

/** The fair's own things (merged into ITEMS through data/content/wakefair.ts). */
export const FAIR_ITEMS: ItemDef[] = [
  { id: 'pumpkin', name: 'Pumpkin', kind: 'material', rarity: 'common', stack: true, value: 3, icon: { shape: 'gel', a: '#e8801e', b: '#4a6a2a' }, desc: 'Picked from the Wake Fair patch at Hollin Ford. Barty Rudd will carve a face in it for you at his trestle.' },
  { id: 'furn_pumpkin', name: 'Jack-o\'-lantern', kind: 'collectible', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'lantern', a: '#e8801e', b: '#ffc060' }, desc: 'A pumpkin with a face cut in it and a candle inside. The turnip growers of the Wend call it showing off.', furn: { model: 'pumpkin' }, stats: 'Furniture: set it down in a house of your own' },
  { id: 'hat_pumpkin', name: 'Pumpkin head', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'helm', a: '#e8801e', b: '#ffc060' }, desc: 'The Wake Fair\'s top prize: a whole pumpkin, hollowed, carved and lit, to wear. You can see out. Mostly.', hat: 'pumpkin', stats: 'Use it to add it to your wardrobe for good: pick it under Headwear with Change look, on the character screen.' },
];
