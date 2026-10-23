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
  /** Or a group dungeon's bosses (data/dungeons.ts). */
  dungeon?: string;
  rarity: ItemDef['rarity'];
  value: number;
  colour: string;
  trim: string;
  /** How each piece changes the wearer: the coat, the legs, the gloves, the boots. */
  look: { chest: Partial<Appearance>; legs: Partial<Appearance>; hands: Partial<Appearance>; feet: Partial<Appearance> };
  pieces: Record<'chest' | 'legs' | 'hands' | 'feet', [string, string]>;
  /** A helm or hood to go with it: its name, a line about it, and how it shows (a helm, or a hat). */
  helm?: [string, string, Partial<Appearance>];
}

const LINES: Line[] = [
  {
    id: 'bronze', weight: 'heavy', set: 'tolley', rarity: 'uncommon', value: 40, colour: '#c08a42', trim: '#6a4a2a',
    look: { chest: { top: 4, tunic: '#8a6a3a', trim: '#c08a42', chestArmour: { style: 'scale', color: '#c08a42', trim: '#6a4a2a' }, shoulders: { style: 'round', color: '#c08a42', trim: '#6a4a2a' } }, legs: { trousers: '#6a5030', legs: 0, legArmour: { style: 'tassets', color: '#c08a42' } }, hands: { gloves: '#6a4a2a', bracers: { style: 'plate', color: '#c08a42' } }, feet: { boots: '#6a4a2a', shoes: 1, sabatons: { color: '#b07a36' } } },
    pieces: {
      chest: ['Bronze scale coat', 'Bronze scales riveted on a quilted coat. Rings when you run.'],
      legs: ['Bronze greaves', 'Shin plates on leather straps. The straps go first.'],
      hands: ['Bronze gauntlets', 'Stiff at the knuckle. Tolley says they loosen with use. They don\'t.'],
      feet: ['Bronze-shod boots', 'A plate over the toe and the heel. Loud on cobbles.'],
    },
  },
  {
    id: 'iron', weight: 'heavy', set: 'tolley', rarity: 'rare', value: 70, colour: '#9aa0a6', trim: '#4a4e54',
    look: { chest: { top: 4, tunic: '#4a4e54', trim: '#9aa0a6', chestArmour: { style: 'plate', color: '#9aa0a6', trim: '#5a5e64' }, shoulders: { style: 'layered', color: '#9aa0a6' } }, legs: { trousers: '#4a4e54', legs: 0, legArmour: { style: 'plate', color: '#9aa0a6' } }, hands: { gloves: '#4a4e54', bracers: { style: 'plate', color: '#9aa0a6' } }, feet: { boots: '#3a3e44', shoes: 1, sabatons: { color: '#8a9096' } } },
    pieces: {
      chest: ['Iron mail coat', 'Riveted rings to the thigh. Heavy, and it doesn\'t care.'],
      legs: ['Iron greaves', 'Plate over the shin and knee, mail behind.'],
      hands: ['Iron gauntlets', 'Lined with felt, which helps less than you\'d think.'],
      feet: ['Iron-shod boots', 'Hobnails and a toe cap. You will hear yourself coming.'],
    },
  },
  {
    id: 'leather', weight: 'medium', rarity: 'common', value: 24, colour: '#6a4a2a', trim: '#3a2a1a',
    look: { chest: { top: 6, tunic: '#6a4a2a', trim: '#3a2a1a', chestArmour: { style: 'cuirass', color: '#6a4a2a', trim: '#3a2a1a' } }, legs: { trousers: '#4a3a24', legs: 1, hose: '#5a4a3a' }, hands: { gloves: '#4a3020' }, feet: { boots: '#3a2a1a', shoes: 1 } },
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
    look: { chest: { top: 7, tunic: '#7a6a5a', trim: '#4a3a2a', shoulders: { style: 'leather', color: '#5a4030' } }, legs: { trousers: '#5a4a3a', legs: 1, hose: '#3a3430' }, hands: { gloves: '#5a4030', bracers: { style: 'leather', color: '#5a4030' } }, feet: { boots: '#3a2a1a', shoes: 1 } },
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
    look: { chest: { top: 4, tunic: '#7a2e22', trim: '#c8442a', chestArmour: { style: 'scale', color: '#b84a2a', trim: '#3a1a10' }, shoulders: { style: 'layered', color: '#c8442a', trim: '#3a1a10' } }, legs: { trousers: '#4a2a1e', legs: 0, legArmour: { style: 'plate', color: '#8a3a22' } }, hands: { gloves: '#3a1a10', bracers: { style: 'plate', color: '#c8442a' } }, feet: { boots: '#2a1a12', shoes: 1, sabatons: { color: '#7a2e1a' } } },
    pieces: {
      chest: ['Works plate', 'Redback shell over a leather coat, Company issue. Number stamped inside.'],
      legs: ['Works greaves', 'Shell plates at the shin. The Works lose more shins than anything.'],
      hands: ['Works gauntlets', 'For handling slag. Also for handling people who handle slag.'],
      feet: ['Hobnailed boots', 'Company boots, and the Company takes them out of your pay.'],
    },
  },
  {
    id: 'frostpelt', weight: 'light', set: 'starglass', region: 'starfall', rarity: 'rare', value: 60, colour: '#dde6ee', trim: '#7a8a98',
    look: { chest: { top: 7, tunic: '#dde6ee', trim: '#7a8a98', shoulders: { style: 'fur', color: '#eef2f6' } }, legs: { trousers: '#b8c4ce', legs: 0 }, hands: { gloves: '#dde6ee' }, feet: { boots: '#5a6a78', shoes: 1 } },
    pieces: {
      chest: ['Frost-pelt coat', 'Kelderby\'s winter coat, fur turned in. You stop shivering.'],
      legs: ['Frost-pelt leggings', 'Fur inside, felt outside, and the knees reinforced for kneeling on ice.'],
      hands: ['Frost-pelt mittens', 'A string between them, as for children. It saves a lot of mittens.'],
      feet: ['Fell boots', 'Felt-lined and studded for the ice on Scarth\'s paths.'],
    },
  },
  // The Old Man's Workings (group dungeon): its bosses drop these
  {
    id: 'pitsmock', weight: 'light', set: 'oldman', dungeon: 'gd-oldman', rarity: 'rare', value: 55, colour: '#7a7466', trim: '#3a362e',
    look: { chest: { top: 3, tunic: '#7a7466', trim: '#3a362e', shirt: '#a8a090' }, legs: { trousers: '#4a463e', legs: 1, hose: '#3a362e' }, hands: { gloves: '#5a564c' }, feet: { boots: '#2e2a24', shoes: 1 } },
    pieces: {
      chest: ['Pitman\'s smock', 'Grey twill, patched at the elbows from kneeling at the face. Number Four\'s chalk mark is on the back.'],
      legs: ['Pitman\'s breeches', 'Leather knee patches, worn through and patched again.'],
      hands: ['Pitman\'s mitts', 'Cut off at the fingers, so you can still feel the seam.'],
      feet: ['Pit clogs', 'Wooden soles. They keep your feet out of the wet and tell everyone where you are.'],
    },
  },
  {
    id: 'nightshift', weight: 'medium', set: 'oldman', dungeon: 'gd-oldman', rarity: 'rare', value: 55, colour: '#3a3a36', trim: '#7a6a4a',
    look: { chest: { top: 6, tunic: '#3a3a36', trim: '#7a6a4a', chestArmour: { style: 'brigandine', color: '#3a3a36', trim: '#b8a070' } }, legs: { trousers: '#2e2a26', legs: 1, hose: '#4a463e' }, hands: { gloves: '#2a2622', bracers: { style: 'leather', color: '#2a2622' } }, feet: { boots: '#1e1a16', shoes: 1 } },
    pieces: {
      chest: ['Night-shift jerkin', 'Dark leather, nothing on it that catches a lamp. Coll Bray\'s crew all wore them.'],
      legs: ['Night-shift breeches', 'Black wool over leather. Good for not being seen on a shaft ladder.'],
      hands: ['Night-shift gloves', 'Soft palms, for carrying copper quietly.'],
      feet: ['Night-shift boots', 'Felt over the hobnails, so they don\'t ring on the rails.'],
    },
  },
  {
    id: 'verdigris', weight: 'heavy', set: 'oldman', dungeon: 'gd-oldman', rarity: 'rare', value: 70, colour: '#3e7a5e', trim: '#24402e',
    look: { chest: { top: 4, tunic: '#24402e', trim: '#7ac8a0', chestArmour: { style: 'plate', color: '#3e7a5e', trim: '#7ac8a0' }, shoulders: { style: 'spiked', color: '#4a8a6a', trim: '#24402e' } }, legs: { trousers: '#24402e', legs: 0, legArmour: { style: 'plate', color: '#3e7a5e' } }, hands: { gloves: '#24402e', bracers: { style: 'plate', color: '#4a8a6a' } }, feet: { boots: '#1e3024', shoes: 1, sabatons: { color: '#3e7a5e' } } },
    pieces: {
      chest: ['Verdigris plate', 'Shell from the big rustback in the Old Man, strapped over a coat. Green right through: it ate nothing but copper.'],
      legs: ['Verdigris greaves', 'Shell plates at the shin. They leave green marks on your trousers.'],
      hands: ['Verdigris gauntlets', 'The plates over the knuckles were the edges of its jaw.'],
      feet: ['Verdigris boots', 'Shod with shell at the toe. They don\'t rust; they\'re rust already.'],
    },
  },
  // Under the Kettle (group dungeon): Kelderby's fold, its bosses drop these
  {
    id: 'fleece', weight: 'light', set: 'fold', dungeon: 'gd-kettle', rarity: 'epic', value: 90, colour: '#e8e2d2', trim: '#6a5a4a',
    look: { chest: { top: 7, tunic: '#e8e2d2', trim: '#6a5a4a', shirt: '#c8c0b0' }, legs: { trousers: '#8a8070', legs: 0 }, hands: { gloves: '#d8d0c0' }, feet: { boots: '#4a3a2a', shoes: 1 } },
    pieces: {
      chest: ['Kelderby fleece', 'A long coat of unwashed fleece, the grease left in. Rain runs off it like off a ewe.'],
      legs: ['Fleece leggings', 'Knitted from the same wool, with leather at the knee for kneeling in snow.'],
      hands: ['Lambing mitts', 'One finger free on the right hand. Shepherds know why.'],
      feet: ['Fell clogs', 'Ash soles and iron rims, for ice on the high pasture.'],
    },
  },
  {
    id: 'packhide', weight: 'medium', set: 'fold', dungeon: 'gd-kettle', rarity: 'epic', value: 90, colour: '#5a5a5e', trim: '#2a2a2e',
    look: { chest: { top: 6, tunic: '#5a5a5e', trim: '#2a2a2e', chestArmour: { style: 'cuirass', color: '#4a4a4e', trim: '#2a2a2e' }, shoulders: { style: 'fur', color: '#6a6a70' } }, legs: { trousers: '#3e3e42', legs: 1, hose: '#2a2a2e' }, hands: { gloves: '#4a4a4e' }, feet: { boots: '#1e1e22', shoes: 1 } },
    pieces: {
      chest: ['Brack\'s-pack jerkin', 'Wolf hide from the pack that ran the Kettle, grey on grey. It still smells of them when it\'s wet.'],
      legs: ['Pack-hide breeches', 'Hide outside, fleece in. Warm and loud with every step.'],
      hands: ['Pack-hide gloves', 'The fur left on the backs. You stop noticing the cold in your knuckles.'],
      feet: ['Pack-hide boots', 'Soft soles, laced to the knee.'],
    },
  },
  {
    id: 'kettleglass', weight: 'heavy', set: 'fold', dungeon: 'gd-kettle', rarity: 'epic', value: 110, colour: '#9fd8e8', trim: '#3a4a52',
    look: { chest: { top: 4, tunic: '#2a3a42', trim: '#9fd8e8', chestArmour: { style: 'plate', color: '#9fd8e8', trim: '#3a4a52' }, shoulders: { style: 'round', color: '#c8f4ff', trim: '#3a4a52' } }, legs: { trousers: '#2a3a42', legs: 0, legArmour: { style: 'plate', color: '#9fd8e8' } }, hands: { gloves: '#2a3a42', bracers: { style: 'plate', color: '#c8f4ff' } }, feet: { boots: '#1e2a30', shoes: 1, sabatons: { color: '#9fd8e8' } } },
    pieces: {
      chest: ['Kettle-glass plate', 'Plates of crystal from under the Kettle, set in iron. Lighter than they look; that\'s the crystal.'],
      legs: ['Kettle-glass greaves', 'Crystal over the shin. It hums faintly when something hits it.'],
      hands: ['Kettle-glass gauntlets', 'Iron fingers, a crystal plate on the back of each hand.'],
      feet: ['Kettle-glass boots', 'Iron-shod, crystal at the toe. Heavy, then not.'],
    },
  },

  // ---- New lines: the regions' own, and one from the anvil
  {
    id: 'charter', weight: 'heavy', region: 'crownroad', rarity: 'rare', value: 72, colour: '#b8bcc4', trim: '#2a4a8a',
    look: { chest: { top: 4, tunic: '#2a4a8a', trim: '#e0bd64', chestArmour: { style: 'plate', color: '#b8bcc4', trim: '#6a6e76' }, shoulders: { style: 'round', color: '#b8bcc4', trim: '#e0bd64' }, tabard: { color: '#2a4a8a', trim: '#e0bd64', emblem: '#e0bd64' } }, legs: { trousers: '#2a3a5a', legs: 0, legArmour: { style: 'plate', color: '#b8bcc4' } }, hands: { gloves: '#3a3a3e', bracers: { style: 'plate', color: '#b8bcc4' } }, feet: { boots: '#2a2a2e', shoes: 1, sabatons: { color: '#a8acb4' } } },
    pieces: {
      chest: ['Charter watch breastplate', 'Ansbury steel under a Charter tabard. The watch polish them every Sunday and complain about it every other day of the week.'],
      legs: ['Charter watch cuisses', 'Plate to the knee. Made for standing at a gate, which is most of what the watch do.'],
      hands: ['Charter watch vambraces', 'The Charter\'s road sign is stamped inside each one, where only the wearer sees it.'],
      feet: ['Charter watch sabatons', 'Steel toes. Heard on the cobbles a street away, which the watch say is the point.'],
    },
    helm: ['Charter watch sallet', 'A sallet with a blue plume. The plume is regulation; the dent over the left eye isn\'t.', { helm: { style: 'sallet', color: '#b8bcc4', trim: '#6a6e76', plume: '#2a4a8a' } }],
  },
  {
    id: 'collegium', weight: 'light', region: 'crownroad', rarity: 'rare', value: 66, colour: '#2a3a6a', trim: '#e0bd64',
    look: { chest: { top: 2, tunic: '#2a3a6a', trim: '#e0bd64', shirt: '#c8c0a8', shoulders: { style: 'mantle', color: '#5a2a4a', trim: '#e0bd64' } }, legs: { trousers: '#2a2a3a', legs: 3 }, hands: { gloves: '#d8d0b8', bracers: { style: 'leather', color: '#3a2a4a', trim: '#e0bd64' } }, feet: { boots: '#2a2030', shoes: 2 } },
    pieces: {
      chest: ['Collegium robe', 'Ansbury blue, gold at the hem, a plum mantle for the third year. Ink on both cuffs; there always is.'],
      legs: ['Collegium undergown', 'Wide-legged, for walking fast between lectures you\'re late for.'],
      hands: ['Scribe\'s cuffs', 'Laced leather to keep the sleeves out of the ink. It doesn\'t work.'],
      feet: ['Library slippers', 'Soft, so the librarians can\'t hear you coming. That was the idea, anyway.'],
    },
    helm: ['Collegium circlet', 'A band of brass, worn by the Collegium\'s fellows. Visitors are told it isn\'t a crown. It is a little bit.', { hat: 'circlet', hatColor: '#e0bd64' }],
  },
  {
    id: 'warden', weight: 'medium', region: 'brambledeep', rarity: 'rare', value: 60, colour: '#3a5a2a', trim: '#6a4a2a',
    look: { chest: { top: 6, tunic: '#3a4a2a', trim: '#6a4a2a', chestArmour: { style: 'cuirass', color: '#4a3a24', trim: '#2a1e14' }, shoulders: { style: 'mantle', color: '#3a5a2a', trim: '#2a3a1a' } }, legs: { trousers: '#3a3a24', legs: 1, hose: '#2e2a1e', legArmour: { style: 'leather', color: '#4a3a24', trim: '#2a1e14' } }, hands: { gloves: '#3a2a1a', bracers: { style: 'leather', color: '#4a3a24', trim: '#2a1e14' } }, feet: { boots: '#2e2418', shoes: 1 } },
    pieces: {
      chest: ['Warden\'s jerkin', 'Boiled leather under a moss-green mantle. The Hagworm wardens walk the fellers\' paths at night, and the jerkin has teeth marks to show for it.'],
      legs: ['Warden\'s leg guards', 'Leather over the thigh, wraps on the shin against brambles and worse.'],
      hands: ['Warden\'s bracers', 'Laced tight, to take a bowstring and a bite.'],
      feet: ['Warden\'s boots', 'Soft-soled. You learn to walk quietly in Hagworm, or you stop walking there.'],
    },
    helm: ['Warden\'s hood', 'Deep green, deep-cut. From ten paces in the wood you\'re a shadow with opinions.', { hat: 'hood', hatColor: '#3a5a2a' }],
  },
  {
    id: 'harbourwatch', weight: 'medium', region: 'saltwind', rarity: 'rare', value: 60, colour: '#8a2a24', trim: '#c8a050',
    look: { chest: { top: 1, tunic: '#3a2a24', trim: '#c8a050', chestArmour: { style: 'brigandine', color: '#8a2a24', trim: '#d8b060' }, shoulders: { style: 'leather', color: '#4a2a1e', trim: '#c8a050' } }, legs: { trousers: '#2a2a3a', legs: 3, legArmour: { style: 'tassets', color: '#8a2a24' } }, hands: { gloves: '#4a2a1e', bracers: { style: 'leather', color: '#4a2a1e', trim: '#c8a050' } }, feet: { boots: '#1e1a18', shoes: 1 } },
    pieces: {
      chest: ['Harbour watch brigandine', 'Red cloth over iron plates, brass rivets in rows. Gullmouth\'s harbour watch can tell you which rivet stopped which knife.'],
      legs: ['Harbour watch slops', 'Wide sailor\'s trousers, with two plates hung from the belt for when the boarding gets close.'],
      hands: ['Harbour watch cuffs', 'Leather, salt-stiff. They smell of tar no matter what you wash them in.'],
      feet: ['Deck boots', 'Grip on a wet plank. On a dry one too, if you\'re lucky.'],
    },
    helm: ['Harbour watch hat', 'A wide black hat with a red band. On a foggy quay it\'s the first thing smugglers learn to look for.', { hat: 'wide', hatColor: '#1e1a18' }],
  },
  {
    id: 'foundry', weight: 'heavy', region: 'redstone', rarity: 'rare', value: 74, colour: '#5a4a44', trim: '#c86a2a',
    look: { chest: { top: 4, tunic: '#3a2a24', trim: '#c86a2a', chestArmour: { style: 'plate', color: '#5a4a44', trim: '#c86a2a' }, shoulders: { style: 'layered', color: '#6a5850', trim: '#c86a2a' } }, legs: { trousers: '#2a201c', legs: 0, legArmour: { style: 'plate', color: '#5a4a44', trim: '#c86a2a' } }, hands: { gloves: '#2a201c', bracers: { style: 'plate', color: '#6a5850' } }, feet: { boots: '#1e1814', shoes: 1, sabatons: { color: '#4a3e38' } } },
    pieces: {
      chest: ['Foundry plate', 'Harrowgate iron, black from the furnace and edged in copper. The company issues it to the men who work the pour, and docks their pay for it.'],
      legs: ['Foundry cuisses', 'Thick enough to stand by a spill of slag. Nobody wants to test it twice.'],
      hands: ['Pour-master\'s vambraces', 'Scorched on the inside of the wrist, where the ladle handle sits.'],
      feet: ['Foundry sabatons', 'Iron over the boot, so molten metal runs off instead of in.'],
    },
    helm: ['Foundry great helm', 'A closed helm with a narrow sight, made against the glare of the pour. Hot inside. Hotter outside.', { helm: { style: 'great', color: '#4a3e38', trim: '#c86a2a' } }],
  },
  {
    id: 'highland', weight: 'medium', region: 'starfall', rarity: 'rare', value: 62, colour: '#8a9096', trim: '#5a4a3a',
    look: { chest: { top: 0, tunic: '#4a5a6a', trim: '#5a4a3a', chestArmour: { style: 'mail', color: '#8a9096' }, shoulders: { style: 'fur', color: '#6a5a4a' } }, legs: { trousers: '#3a4a5a', legs: 0, legArmour: { style: 'leather', color: '#4a3a2a', trim: '#2a2018' } }, hands: { gloves: '#4a3a2a', bracers: { style: 'leather', color: '#4a3a2a' } }, feet: { boots: '#2a2018', shoes: 1 } },
    pieces: {
      chest: ['Highland hauberk', 'Mail to the hip under a sheepskin collar. Kelderby wears it to the high pasture in winter, wolves or no wolves.'],
      legs: ['Highland leggings', 'Wool and leather, wrapped against snow up to the knee.'],
      hands: ['Highland bracers', 'Laced over mittens. Take them off to do anything; put them back before your fingers notice.'],
      feet: ['Highland boots', 'Felt-lined. The Scarth shepherds swear by them and at them.'],
    },
    helm: ['Highland nasal helm', 'A plain iron helm with a nose guard, the kind Scarth Watch hands out to anyone who\'ll stand a night on the wall.', { helm: { style: 'nasal', color: '#8a9096', trim: '#5a4a3a' } }],
  },
  {
    id: 'cliffwatch', weight: 'light', region: 'gannet', rarity: 'rare', value: 58, colour: '#3a5a7a', trim: '#d8d0b8',
    look: { chest: { top: 4, tunic: '#3a5a7a', trim: '#d8d0b8', shoulders: { style: 'mantle', color: '#2a3a4a', trim: '#d8d0b8' } }, legs: { trousers: '#4a4a3e', legs: 1, hose: '#3a3a30' }, hands: { gloves: '#5a4a3a', bracers: { style: 'leather', color: '#5a4a3a', trim: '#d8d0b8' } }, feet: { boots: '#3a3028', shoes: 1 } },
    pieces: {
      chest: ['Cliff-watch quilted coat', 'Quilted sea-blue, with a short mantle against the spray. The Cragsby cliff-watch wear it on the headland in all weathers, which up there means wind.'],
      legs: ['Cliff-watch breeches', 'Close at the knee, so a rope doesn\'t catch.'],
      hands: ['Rope-walker\'s cuffs', 'Leather with a pale stitch, worn smooth on the inside by rope.'],
      feet: ['Cliff boots', 'Soft toes for footholds. Climmers don\'t trust anything stiffer.'],
    },
    helm: ['Cliff-watch hood', 'Sea-blue, tied under the chin. The gannets don\'t care for it.', { hat: 'hood', hatColor: '#3a5a7a' }],
  },
  {
    id: 'fenreeve', weight: 'light', region: 'wrath', rarity: 'rare', value: 58, colour: '#2e4a3a', trim: '#8a7a4a',
    look: { chest: { top: 7, tunic: '#2e4a3a', trim: '#8a7a4a', shoulders: { style: 'mantle', color: '#4a5a2a', trim: '#8a7a4a' } }, legs: { trousers: '#3a3a2a', legs: 0, legArmour: { style: 'leather', color: '#3a2e1e', trim: '#2a2014' } }, hands: { gloves: '#3a2e1e', bracers: { style: 'leather', color: '#3a2e1e' } }, feet: { boots: '#2a2014', shoes: 1 } },
    pieces: {
      chest: ['Fen reeve\'s coat', 'A long green coat with a reed-coloured mantle. The reeve of the Levels keeps the dykes and the peace, mostly from a punt.'],
      legs: ['Fen reeve\'s wading legs', 'Tarred leather to the thigh. Wet on the inside anyway, by noon.'],
      hands: ['Punt-pole cuffs', 'Leather, palm-worn. A reeve\'s hands are always on a pole.'],
      feet: ['Fen boots', 'Wide-soled, for mud that wants to keep you.'],
    },
    helm: ['Fen reeve\'s hat', 'A broad hat against the Levels\' rain, which comes sideways.', { hat: 'wide', hatColor: '#3a4a2e' }],
  },
  {
    id: 'barrow', weight: 'heavy', region: 'tolmen', rarity: 'epic', value: 90, colour: '#8a6a3a', trim: '#3a5a4a',
    look: { chest: { top: 4, tunic: '#3a2e24', trim: '#3a5a4a', chestArmour: { style: 'scale', color: '#8a6a3a', trim: '#3a5a4a' }, shoulders: { style: 'spiked', color: '#9a7a44', trim: '#3a5a4a' } }, legs: { trousers: '#2e241c', legs: 0, legArmour: { style: 'plate', color: '#8a6a3a', trim: '#3a5a4a' } }, hands: { gloves: '#2e241c', bracers: { style: 'plate', color: '#9a7a44' } }, feet: { boots: '#1e1814', shoes: 1, sabatons: { color: '#7a5a30' } } },
    pieces: {
      chest: ['Barrow bronze scale', 'Old bronze, green at the edges, cut from a barrow on Tolmen Moor. The moor folk say the man who wore it last hasn\'t asked for it back. Yet.'],
      legs: ['Barrow bronze greaves', 'The bronze is older than the Charter. It still takes an edge off a blade.'],
      hands: ['Barrow bronze vambraces', 'Engraved with running dogs, worn nearly smooth.'],
      feet: ['Barrow bronze sabatons', 'Bronze toes. Heavy, and quieter than iron, which nobody can explain.'],
    },
    helm: ['Barrow horned helm', 'Bronze, with a pair of ox horns riveted on. On Tolmen Moor, the old kings wore them to be buried in.', { helm: { style: 'horned', color: '#8a6a3a', trim: '#3a5a4a' } }],
  },
  {
    id: 'kirkward', weight: 'heavy', rarity: 'epic', value: 120, colour: '#e8ecf0', trim: '#5fb8d8',
    look: { chest: { top: 4, tunic: '#e8ecf0', trim: '#5fb8d8', chestArmour: { style: 'plate', color: '#e8ecf0', trim: '#5fb8d8' }, shoulders: { style: 'layered', color: '#f4f6f8', trim: '#5fb8d8' }, tabard: { color: '#f4f2ea', trim: '#5fb8d8', emblem: '#5fb8d8' } }, legs: { trousers: '#c8ccd0', legs: 0, legArmour: { style: 'plate', color: '#e8ecf0', trim: '#5fb8d8' } }, hands: { gloves: '#c8ccd0', bracers: { style: 'plate', color: '#f4f6f8' } }, feet: { boots: '#8a9098', shoes: 1, sabatons: { color: '#e8ecf0' } } },
    pieces: {
      chest: ['Kirkward breastplate', 'White plate, glass-blue at the edges, smithed with star crystal in the steel. The Glass Kirk\'s wardens wore it once; the smith who makes it now just likes how it looks.'],
      legs: ['Kirkward greaves', 'Pale and cold to the touch, even in summer.'],
      hands: ['Kirkward gauntlets', 'A thin line of crystal at each knuckle. They catch the light when you make a fist.'],
      feet: ['Kirkward sabatons', 'White steel. They don\'t take mud, somehow.'],
    },
    helm: ['Kirkward great helm', 'A closed white helm with a white plume. You can see out of it better than anyone can see in.', { helm: { style: 'great', color: '#e8ecf0', trim: '#5fb8d8', plume: '#f4f2ea' } }],
  },
  {
    // Bright-cut: square-cut pale blue plate that turns up anywhere, from anything, very rarely (Game:
    // onEnemyKilled). Nobody in the counties knows who made it.
    id: 'brightcut', weight: 'heavy', set: 'brightcut', rarity: 'legendary', value: 400, colour: '#6fe3d8', trim: '#2a9a94',
    look: { chest: { top: 4, tunic: '#1e4a50', trim: '#6fe3d8', chestArmour: { style: 'plate', color: '#6fe3d8', trim: '#2a9a94' }, shoulders: { style: 'round', color: '#8ff0e6', trim: '#2a9a94' } }, legs: { trousers: '#1e4a50', legs: 0, legArmour: { style: 'plate', color: '#6fe3d8' } }, hands: { gloves: '#1e4a50', bracers: { style: 'plate', color: '#8ff0e6' } }, feet: { boots: '#1e4a50', shoes: 1, sabatons: { color: '#6fe3d8' } } },
    pieces: {
      chest: ['Bright-cut plate', 'Pale blue plate with every face cut flat and square, like a stone a jeweller couldn\'t leave alone. A small square mark inside the collar. Someone dug very deep for this.'],
      legs: ['Bright-cut greaves', 'Squared plates over the shins. They chime against each other when you walk.'],
      hands: ['Bright-cut gauntlets', 'Square-cut, blue, and lighter than steel. Good for digging, oddly.'],
      feet: ['Bright-cut boots', 'Flat-topped and square at the toe, blue to the heel. They leave square prints.'],
    },
    helm: ['Bright-cut helm', 'A blue helm cut square, open at the face. Nobody knows who made it, or how many there are.', { helm: { style: 'barbute', color: '#6fe3d8', trim: '#2a9a94' } }],
  },
];

/** The Bright-cut pieces: any creature anywhere may drop one, very rarely. */
export const BRIGHTCUT = ['brightcut_helm', 'brightcut_chest', 'brightcut_legs', 'brightcut_hands', 'brightcut_feet'];

/** A line's helm spends the helm budget (GEAR_BUDGET.head, 4) the way its weight would. */
const HELM_TRAITS: Record<ArmourWeight, { defense: number; vigor?: number; wind?: number; roll?: number; stats: string }> = {
  heavy: { defense: 4, stats: 'Defence 4.' },
  medium: { defense: 2, roll: 0.08, stats: 'Defence 2, rolls stay untouchable 0.08 s longer.' },
  light: { defense: 1, vigor: 20, wind: 0.1, stats: 'Defence 1, maximum health +20, energy comes back 10% faster.' },
};

const SHAPES = { chest: 'chest', legs: 'legs', hands: 'gloves', feet: 'boots' } as const;
const SLOT_WORD = { chest: 'chest', legs: 'legs', hands: 'hands', feet: 'feet' } as const;

export const ARMOUR_ITEMS: ItemDef[] = LINES.flatMap((l) => (['chest', 'legs', 'hands', 'feet'] as const).map((slot): ItemDef => ({
  id: `${l.id}_${SLOT_WORD[slot]}`, name: l.pieces[slot][0], kind: 'armor', rarity: l.rarity, stack: false,
  value: Math.round(l.value * (slot === 'chest' ? 1.4 : slot === 'legs' ? 1.1 : 0.8)),
  icon: { shape: SHAPES[slot], a: l.colour, b: l.trim }, desc: l.pieces[slot][1], set: l.set,
  armor: { slot, defense: WEIGHTS[l.weight].defense, weight: l.weight, look: l.look[slot] },
  stats: `${WEIGHTS[l.weight].name} armour. Defence ${WEIGHTS[l.weight].defense}.`,
}))).concat(LINES.filter((l) => l.helm).map((l): ItemDef => {
  const [name, desc, look] = l.helm!, h = HELM_TRAITS[l.weight];
  return {
    id: `${l.id}_helm`, name, kind: 'armor', rarity: l.rarity, stack: false, value: Math.round(l.value * 1.1), icon: { shape: 'helm', a: look.helm?.color ?? look.hatColor ?? l.colour }, desc, set: l.set,
    armor: { slot: 'head', defense: h.defense, vigor: h.vigor, wind: h.wind, roll: h.roll, weight: l.weight, look }, stats: `${WEIGHTS[l.weight].name}. ${h.stats}`,
  };
}));

/** Every piece of a line: its body pieces, and its helm if it has one. */
const piecesOf = (l: Line) => [...(['chest', 'legs', 'hands', 'feet'] as const).map((s) => `${l.id}_${SLOT_WORD[s]}`), ...(l.helm ? [`${l.id}_helm`] : [])];

/** Which pieces a region's creatures drop: every line from that region, helms included. */
export const REGION_ARMOUR: Partial<Record<RegionId, string[]>> = {};
for (const l of LINES) if (l.region) (REGION_ARMOUR[l.region] ??= []).push(...piecesOf(l));

/** A group dungeon's body armour, in every weight (its bosses drop these). */
export function dungeonArmour(dungeon: string): string[] {
  return LINES.filter((l) => l.dungeon === dungeon).flatMap(piecesOf);
}

/** The weight of each helm, and how it shows on the head. */
export const HELM_WEIGHTS: Record<string, { weight: ArmourWeight; look: Partial<Appearance> }> = {
  bronze_helm: { weight: 'heavy', look: { hat: 'coif', hatColor: '#c08a42' } },
  wolfskin_hood: { weight: 'medium', look: { hat: 'hood', hatColor: '#8a7c6a' } },
  oilskin_hat: { weight: 'medium', look: { hat: 'wide', hatColor: '#e0b83a' } },
  redback_helm: { weight: 'heavy', look: { hat: 'coif', hatColor: '#c8442a' } },
  frost_cowl: { weight: 'light', look: { hat: 'hood', hatColor: '#dde6ee' } },
  moss_hood: { weight: 'light', look: { hat: 'hood', hatColor: '#5a7a3a' } },
  pitlamp_cap: { weight: 'light', look: { hat: 'cap', hatColor: '#5a564c' } },
  shepherd_hood: { weight: 'medium', look: { hat: 'hood', hatColor: '#d8d0c0' } },
};

/** Smithed at an anvil: bronze and iron. [line, bars for the chest, legs, hands, feet, smithing level]. */
export const ARMOUR_SMITHING: [string, string, number[], number][] = [
  ['bronze', 'bronze_bar', [3, 2, 1, 1], 7],
  ['iron', 'iron_bar', [3, 2, 1, 1], 19],
  ['kirkward', 'star_crystal', [3, 2, 1, 1], 34],
];
