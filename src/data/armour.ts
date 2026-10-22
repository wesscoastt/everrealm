import type { Appearance } from '../entities/humanoid';
import type { ItemDef } from './items';
import type { RegionId } from '../world/terrain';

// Armour, in the manner of ESO: a piece for each of five slots, in three weights. Gear stays
// horizontal (see GEAR_BUDGET in items.ts): a weight changes how you fight, not how hard you hit.
//   Light, per piece: calling skills recharge 4% faster.
//   Medium, per piece: 1.5% more critical hits, and a roll costs 2 less energy.
//   Heavy, per piece: 12 more health, and energy comes back 3% slower.
// Every piece adds defence (light 1, medium 2, heavy 3; helms have their own). Defence D takes D/(D+40)
// of each blow: a helm alone about a tenth, a full heavy suit about a third.
// Regional pieces belong to their region's set: any two pieces of a set give its bonus.
// What you wear shows: the coat's colours and cut, the legs, the gloves, the boots, the headwear.

export type ArmourSlot = 'head' | 'chest' | 'legs' | 'hands' | 'feet';
export type ArmourWeight = 'light' | 'medium' | 'heavy';
export const ARMOUR_SLOTS: ArmourSlot[] = ['head', 'chest', 'legs', 'hands', 'feet'];
export const SLOT_NAMES: Record<ArmourSlot, string> = { head: 'Head', chest: 'Chest', legs: 'Legs', hands: 'Hands', feet: 'Feet' };

export const WEIGHTS: Record<ArmourWeight, { name: string; defense: number; desc: string }> = {
  light: { name: 'Light', defense: 1, desc: 'calling skills recharge 4% faster a piece' },
  medium: { name: 'Medium', defense: 2, desc: '1.5% more critical hits and 2 less energy a roll, a piece' },
  heavy: { name: 'Heavy', defense: 3, desc: '12 more health a piece; energy comes back 3% slower a piece' },
};

/** A line of armour: four body pieces in one weight, look and (for a region's) set. */
interface Line {
  id: string;
  weight: ArmourWeight;
  set?: string;
  /** Where its pieces drop (a region's creatures), if they do. */
  region?: RegionId;
  rarity: ItemDef['rarity'];
  value: number;
  colour: string;
  trim: string;
  /** How each piece changes the wearer: the coat, the legs, the gloves, the boots. */
  look: { chest: Partial<Appearance>; legs: Partial<Appearance>; hands: Partial<Appearance>; feet: Partial<Appearance> };
  pieces: Record<'chest' | 'legs' | 'hands' | 'feet', [string, string]>;
}

const LINES: Line[] = [
  {
    id: 'bronze', weight: 'heavy', set: 'tolley', rarity: 'uncommon', value: 40, colour: '#c08a42', trim: '#6a4a2a',
    look: { chest: { top: 4, tunic: '#8a6a3a', trim: '#c08a42', shoulderPads: '#c08a42' }, legs: { trousers: '#6a5030', legs: 0 }, hands: { gloves: '#c08a42' }, feet: { boots: '#6a4a2a', shoes: 1 } },
    pieces: {
      chest: ['Bronze scale coat', 'Bronze scales riveted on a quilted coat. Rings when you run.'],
      legs: ['Bronze greaves', 'Shin plates on leather straps. The straps go first.'],
      hands: ['Bronze gauntlets', 'Stiff at the knuckle. Tolley says they loosen with use. They don\'t.'],
      feet: ['Bronze-shod boots', 'A plate over the toe and the heel. Loud on cobbles.'],
    },
  },
  {
    id: 'iron', weight: 'heavy', set: 'tolley', rarity: 'rare', value: 70, colour: '#9aa0a6', trim: '#4a4e54',
    look: { chest: { top: 4, tunic: '#6a6e74', trim: '#9aa0a6', shoulderPads: '#9aa0a6' }, legs: { trousers: '#4a4e54', legs: 0 }, hands: { gloves: '#9aa0a6' }, feet: { boots: '#3a3e44', shoes: 1 } },
    pieces: {
      chest: ['Iron mail coat', 'Riveted rings to the thigh. Heavy, and it doesn\'t care.'],
      legs: ['Iron greaves', 'Plate over the shin and knee, mail behind.'],
      hands: ['Iron gauntlets', 'Lined with felt, which helps less than you\'d think.'],
      feet: ['Iron-shod boots', 'Hobnails and a toe cap. You will hear yourself coming.'],
    },
  },
  {
    id: 'leather', weight: 'medium', rarity: 'common', value: 24, colour: '#6a4a2a', trim: '#3a2a1a',
    look: { chest: { top: 6, tunic: '#6a4a2a', trim: '#3a2a1a' }, legs: { trousers: '#4a3a24', legs: 1, hose: '#5a4a3a' }, hands: { gloves: '#4a3020' }, feet: { boots: '#3a2a1a', shoes: 1 } },
    pieces: {
      chest: ['Boar-leather jerkin', 'Cut from Turnpike boar. Stiff for a week, then it\'s yours.'],
      legs: ['Boar-leather breeches', 'Saddle-cut, laced at the knee.'],
      hands: ['Riding gloves', 'Thin enough to feel the reins through.'],
      feet: ['Riding boots', 'To the knee. Waxed, which keeps out the wet and the snakes.'],
    },
  },
  {
    id: 'linen', weight: 'light', rarity: 'common', value: 18, colour: '#e8e0c8', trim: '#8a7a5a',
    look: { chest: { top: 3, tunic: '#e8e0c8', trim: '#8a7a5a', shirt: '#d8d0b8' }, legs: { trousers: '#c8c0a8', legs: 3 }, hands: { gloves: '#d8d0b8' }, feet: { boots: '#6a5a4a', shoes: 2 } },
    pieces: {
      chest: ['Linen shirt and vest', 'Ansbury linen, cool and cheap. Shows every stain.'],
      legs: ['Linen trousers', 'Wide in the leg, for walking a long way in summer.'],
      hands: ['Wool mittens', 'Knitted at Cotter\'s End. Somebody\'s gran made these.'],
      feet: ['Felt shoes', 'Quiet on boards. Useless in a puddle.'],
    },
  },
  {
    id: 'drover', weight: 'medium', set: 'tollriders', region: 'crownroad', rarity: 'uncommon', value: 36, colour: '#7a6a5a', trim: '#4a3a2a',
    look: { chest: { top: 7, tunic: '#7a6a5a', trim: '#4a3a2a' }, legs: { trousers: '#5a4a3a', legs: 1, hose: '#3a3430' }, hands: { gloves: '#5a4030' }, feet: { boots: '#3a2a1a', shoes: 1 } },
    pieces: {
      chest: ['Drover\'s long coat', 'Oiled wool to the shin. The Toll Riders wear them over everything.'],
      legs: ['Drover\'s breeches', 'Patched at the seat, by people who ride.'],
      hands: ['Drover\'s gloves', 'One hand for the reins, one for the toll. Both gloved.'],
      feet: ['Drover\'s boots', 'Turned down at the top, and full of the Turnpike\'s dust.'],
    },
  },
  {
    id: 'thornback', weight: 'light', set: 'thornback', region: 'brambledeep', rarity: 'uncommon', value: 36, colour: '#5a7a3a', trim: '#2e3a1e',
    look: { chest: { top: 1, tunic: '#5a7a3a', trim: '#2e3a1e' }, legs: { trousers: '#3e4a2a', legs: 0 }, hands: { gloves: '#3e4a2a' }, feet: { boots: '#2e3a1e', shoes: 0 } },
    pieces: {
      chest: ['Moss-dyed coat', 'Felted wool in the Wend\'s green. The fellers can\'t find each other in it.'],
      legs: ['Moss-dyed leggings', 'Close-fitting, so the brambles have nothing to catch.'],
      hands: ['Fingerless gloves', 'Warm, and you can still work a bowstring.'],
      feet: ['Soft boots', 'Doeskin soles. A twig doesn\'t crack under them.'],
    },
  },
  {
    id: 'oilskin', weight: 'medium', set: 'brine', region: 'saltwind', rarity: 'uncommon', value: 36, colour: '#e0b83a', trim: '#5a4a1a',
    look: { chest: { top: 7, tunic: '#d8b03a', trim: '#5a4a1a' }, legs: { trousers: '#c8a034', legs: 3 }, hands: { gloves: '#3a3a30' }, feet: { boots: '#2a2a2a', shoes: 1 } },
    pieces: {
      chest: ['Oilskin smock', 'Waxed canvas, yellow so they can find you in the water.'],
      legs: ['Oilskin trousers', 'They crackle. Every Gullmouth crew crackles.'],
      hands: ['Tarred gloves', 'Smell of rope and pitch for ever.'],
      feet: ['Sea boots', 'Up to the thigh, and heavy when they fill.'],
    },
  },
  {
    id: 'works', weight: 'heavy', set: 'harrow', region: 'redstone', rarity: 'rare', value: 60, colour: '#c8442a', trim: '#3a1a10',
    look: { chest: { top: 4, tunic: '#7a2e22', trim: '#c8442a', shoulderPads: '#c8442a' }, legs: { trousers: '#4a2a1e', legs: 0 }, hands: { gloves: '#c8442a' }, feet: { boots: '#2a1a12', shoes: 1 } },
    pieces: {
      chest: ['Works plate', 'Redback shell over a leather coat, Company issue. Number stamped inside.'],
      legs: ['Works greaves', 'Shell plates at the shin. The Works lose more shins than anything.'],
      hands: ['Works gauntlets', 'For handling slag. Also for handling people who handle slag.'],
      feet: ['Hobnailed boots', 'Company boots, and the Company takes them out of your pay.'],
    },
  },
  {
    id: 'frostpelt', weight: 'light', set: 'starglass', region: 'starfall', rarity: 'rare', value: 60, colour: '#dde6ee', trim: '#7a8a98',
    look: { chest: { top: 7, tunic: '#dde6ee', trim: '#7a8a98' }, legs: { trousers: '#b8c4ce', legs: 0 }, hands: { gloves: '#dde6ee' }, feet: { boots: '#5a6a78', shoes: 1 } },
    pieces: {
      chest: ['Frost-pelt coat', 'Kelderby\'s winter coat, fur turned in. You stop shivering.'],
      legs: ['Frost-pelt leggings', 'Fur inside, felt outside, and the knees reinforced for kneeling on ice.'],
      hands: ['Frost-pelt mittens', 'A string between them, as for children. It saves a lot of mittens.'],
      feet: ['Fell boots', 'Felt-lined and studded for the ice on Scarth\'s paths.'],
    },
  },
];

const SHAPES = { chest: 'chest', legs: 'legs', hands: 'gloves', feet: 'boots' } as const;
const SLOT_WORD = { chest: 'chest', legs: 'legs', hands: 'hands', feet: 'feet' } as const;

export const ARMOUR_ITEMS: ItemDef[] = LINES.flatMap((l) => (['chest', 'legs', 'hands', 'feet'] as const).map((slot): ItemDef => ({
  id: `${l.id}_${SLOT_WORD[slot]}`, name: l.pieces[slot][0], kind: 'armor', rarity: l.rarity, stack: false,
  value: Math.round(l.value * (slot === 'chest' ? 1.4 : slot === 'legs' ? 1.1 : 0.8)),
  icon: { shape: SHAPES[slot], a: l.colour, b: l.trim }, desc: l.pieces[slot][1], set: l.set,
  armor: { slot, defense: WEIGHTS[l.weight].defense, weight: l.weight, look: l.look[slot] },
  stats: `${WEIGHTS[l.weight].name} armour. Defence ${WEIGHTS[l.weight].defense}.`,
})));

/** Which body pieces a region's creatures drop (its set's line). */
export const REGION_ARMOUR: Partial<Record<RegionId, string[]>> = Object.fromEntries(
  LINES.filter((l) => l.region).map((l) => [l.region!, (['chest', 'legs', 'hands', 'feet'] as const).map((s) => `${l.id}_${SLOT_WORD[s]}`)]),
);

/** The weight of each helm, and how it shows on the head. */
export const HELM_WEIGHTS: Record<string, { weight: ArmourWeight; look: Partial<Appearance> }> = {
  bronze_helm: { weight: 'heavy', look: { hat: 'coif', hatColor: '#c08a42' } },
  wolfskin_hood: { weight: 'medium', look: { hat: 'hood', hatColor: '#8a7c6a' } },
  oilskin_hat: { weight: 'medium', look: { hat: 'wide', hatColor: '#e0b83a' } },
  redback_helm: { weight: 'heavy', look: { hat: 'coif', hatColor: '#c8442a' } },
  frost_cowl: { weight: 'light', look: { hat: 'hood', hatColor: '#dde6ee' } },
  moss_hood: { weight: 'light', look: { hat: 'hood', hatColor: '#5a7a3a' } },
};

/** Smithed at an anvil: bronze and iron. [line, bars for the chest, legs, hands, feet, smithing level]. */
export const ARMOUR_SMITHING: [string, string, number[], number][] = [
  ['bronze', 'bronze_bar', [3, 2, 1, 1], 7],
  ['iron', 'iron_bar', [3, 2, 1, 1], 19],
];
