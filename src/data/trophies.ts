import type { Appearance } from '../entities/humanoid';
import type { ArmourWeight } from './armour';
import type { ItemDef } from './items';

// Trophy sets, in the manner of ESO's monster sets: two pieces, a helm and a pair of shoulders, made
// from something you brought down. One piece worn gives a little; both give the thing its own move.
// They are worn beside a regional set, not instead of one (a regional set wants two of the other
// pieces), so a build is a set of the land and a trophy on top.
// Earned, never bought with marks:
// - The four group dungeons' last bosses: the helm drops from the last boss on veteran (always the
//   first time, half the time after); the shoulders are the Lamp Company's, for Lamp keys.
// - The Endless Tower: Annot Crowle sells both pieces for tower tokens, once you have climbed far enough.
// The moves themselves are in game/Game.ts (trophy, and the hooks in dealDamage and hitPlayer).

export type TrophyId = 'verdigris' | 'glim' | 'mainspring' | 'oldking' | 'longstair' | 'whitehair';

export interface TrophySet {
  id: TrophyId;
  name: string;
  /** What it was: the boss, or the tower. */
  from: string;
  /** How the pieces are earned, as the tooltip says it. */
  where: string;
  weight: ArmourWeight;
  rarity: ItemDef['rarity'];
  /** One piece worn: a stat, said and added (to health, energy, crits or rolls). */
  one: { text: string; vigor?: number; wind?: number; crit?: number; rollCost?: number };
  /** Both worn: the move, as the tooltip says it. */
  two: string;
  /** The group dungeon whose last boss drops the helm, or the tower floor that opens both pieces at Crowle's. */
  dungeon?: string;
  floor?: number;
  colour: string;
  trim: string;
  helm: [string, string, Partial<Appearance>];
  shoulders: [string, string, Partial<Appearance>];
}

export const TROPHY_SETS: Record<TrophyId, TrophySet> = {
  verdigris: {
    id: 'verdigris', name: 'Verdigris', from: 'Verdigris, mother of the seam', weight: 'heavy', rarity: 'epic',
    where: 'The Old Man\'s Workings on veteran: the helm from Verdigris; the shoulders from the Lamp Company',
    one: { text: 'Maximum health +40.', vigor: 40 },
    two: 'Shed shell: when a blow takes you below half your health, a shell of green copper closes over you and takes the next fifth of your health in damage, for 8 seconds. Once every 20 seconds.',
    dungeon: 'gd-oldman', colour: '#3e8a64', trim: '#b8e8a0',
    helm: ['Verdigris crest', 'Cut from the shell Verdigris shed when it turned. The copper is still going green, a little more every week, as if it hasn\'t heard it\'s dead.',
      { helm: { style: 'carapace', color: '#3e8a64', trim: '#b8e8a0', glow: '#c8f060' } }],
    shoulders: ['Verdigris shell pauldrons', 'Three plates of rustback shell, one over the next, the way they grew. Pick-hands at Sallow Pit knock on wood when they see them.',
      { shoulders: { style: 'shell', color: '#3e8a64', trim: '#b8e8a0' } }],
  },
  glim: {
    id: 'glim', name: 'The Glim', from: 'the Glim, light of the fallen star', weight: 'light', rarity: 'epic',
    where: 'Under the Kettle on veteran: the helm from the Glim; the shoulders from the Lamp Company',
    one: { text: 'Energy comes back 8% faster.', wind: 0.08 },
    two: 'Starfall: a critical hit, once every 6 seconds, bursts on the foe in cold light. It and every foe within 4 blocks of it take half the blow again, and are slowed.',
    dungeon: 'gd-kettle', colour: '#2a3a52', trim: '#9fe8ff',
    helm: ['Glimglass crown', 'Seven splinters of the Glim set in a band of black iron. They give a light of their own, enough to read by, and they are cold to the touch in August.',
      { helm: { style: 'shardcrown', color: '#2a3a52', trim: '#c8f4ff', glow: '#4cb8f0' } }],
    shoulders: ['Glimglass mantle', 'Starglass grown through a mantle of dark wool, as it grew through the Kettle\'s rock. It hums when two of them are close.',
      { shoulders: { style: 'crystal', color: '#2a3a52', trim: '#9fe8ff', glow: '#4cb8f0' } }],
  },
  mainspring: {
    id: 'mainspring', name: 'The Mainspring', from: 'the Mainspring, heart of the Escapement', weight: 'medium', rarity: 'epic',
    where: 'The Escapement on veteran: the helm from the Mainspring; the shoulders from the Lamp Company',
    one: { text: 'Critical hits +2%.', crit: 0.02 },
    two: 'Wound tight: every blow you land winds the spring a turn. At ten turns it lets go, and your next blow lands twice as hard and throws the foe back.',
    dungeon: 'gd-escapement', colour: '#b08a3a', trim: '#3e8a74',
    helm: ['Mainspring helm', 'A brass helm made by somebody who wanted to see what a clock would wear. The lenses are Kell crystal. Something inside it ticks when you run.',
      { helm: { style: 'clockwork', color: '#b08a3a', trim: '#3e8a74', glow: '#ffc860' } }],
    shoulders: ['Mainspring pauldrons', 'A coil of the Mainspring itself on each shoulder, still under tension. The Lamp Company had a man wind them. He won\'t do it again.',
      { shoulders: { style: 'coil', color: '#b08a3a', trim: '#3e8a74' } }],
  },
  oldking: {
    id: 'oldking', name: 'The Old King', from: 'the Old King, the king under the black', weight: 'heavy', rarity: 'legendary',
    where: 'Kingsbarrow on veteran: the helm from the Old King; the shoulders from the Lamp Company',
    one: { text: 'Maximum health +60.', vigor: 60 },
    two: 'The king\'s sweep: once every 8 seconds, a blow of yours brings his sword round behind it, a wide sweep in front of you that strikes every foe within 5 blocks for the blow\'s worth again.',
    dungeon: 'gd-kingsbarrow', colour: '#24242c', trim: '#d8b050',
    helm: ['The Old King\'s crown', 'A closed black helm with a crown worked into the brow, the gold gone dull. The light in the sight is not yours. It has been there three hundred years.',
      { helm: { style: 'kingly', color: '#24242c', trim: '#d8b050', glow: '#9fe8ff' } }],
    shoulders: ['The Old King\'s mantle', 'Black plate edged in gold, with the barrow\'s cloth hanging behind. The Held says whoever wears it is owed a kingdom and won\'t get one.',
      { shoulders: { style: 'regal', color: '#24242c', trim: '#d8b050', glow: '#9fe8ff' } }],
  },
  longstair: {
    id: 'longstair', name: 'The Long Stair', from: 'the Endless Tower', weight: 'medium', rarity: 'epic', floor: 20,
    where: 'Annot Crowle at the Endless Tower, for tower tokens, once you have cleared floor 20',
    one: { text: 'Rolls cost 3 less energy.', rollCost: 3 },
    two: 'Step by step: every foe you bring down puts you a step up for 12 seconds. Your blows land 3% quicker a step, up to eight steps.',
    colour: '#6a665e', trim: '#ffd890',
    helm: ['Stair-climber\'s helm', 'Grey iron with a crest that goes up in steps. Crowle says the first climber had it made after floor twenty, and wore it to floor two hundred.',
      { helm: { style: 'stepped', color: '#6a665e', trim: '#ffd890' } }],
    shoulders: ['Stair-climber\'s pauldrons', 'Plates laid like treads, each a little higher than the last. The tower\'s stone is ground into the leather and won\'t come out.',
      { shoulders: { style: 'stair', color: '#6a665e', trim: '#ffd890' } }],
  },
  whitehair: {
    id: 'whitehair', name: 'Whitehair', from: 'the Endless Tower', weight: 'light', rarity: 'legendary', floor: 40,
    where: 'Annot Crowle at the Endless Tower, for tower tokens, once you have cleared floor 40',
    one: { text: 'Maximum health +30.', vigor: 30 },
    two: 'Came down white: a blow that would fell you leaves you standing on one health instead, and nothing touches you for 3 seconds. Once every 3 minutes.',
    colour: '#e8e4dc', trim: '#7a8a98',
    helm: ['Whitehair pelt', 'The pelt of a white wolf from the tower\'s frozen hall, head and all. Crowle\'s mother\'s climber wore one. Crowle says that\'s not where his hair went white.',
      { helm: { style: 'wolfpelt', color: '#e8e4dc', trim: '#7a8a98', glow: '#c8e8ff' } }],
    shoulders: ['Whitehair mantle', 'White fur, long enough to blow about, over a grey hood that falls behind. Warm. Nobody who wears it seems to feel the cold again.',
      { shoulders: { style: 'pelt', color: '#e8e4dc', trim: '#7a8a98' } }],
  },
};

export const TROPHY_IDS = Object.keys(TROPHY_SETS) as TrophyId[];

/** Gear is horizontal (GEAR_BUDGET in items.ts): a trophy helm spends the helm budget the way any helm
 *  of its weight does (data/armour.ts HELM_TRAITS), and the shoulders carry their weight's defence like
 *  any body piece. What a trophy adds is its set, not a bigger number. */
const HELM: Record<ArmourWeight, { defense: number; vigor?: number; wind?: number; roll?: number; stats: string }> = {
  heavy: { defense: 4, stats: 'Defence 4.' },
  medium: { defense: 2, roll: 0.08, stats: 'Defence 2, rolls stay untouchable 0.08 s longer.' },
  light: { defense: 1, vigor: 20, wind: 0.1, stats: 'Defence 1, maximum health +20, energy comes back 10% faster.' },
};
const SHOULDER_DEF: Record<ArmourWeight, number> = { light: 1, medium: 2, heavy: 3 };
const WEIGHT_NAME: Record<ArmourWeight, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };

export const TROPHY_ITEMS: ItemDef[] = TROPHY_IDS.flatMap((id): ItemDef[] => {
  const t = TROPHY_SETS[id];
  return [
    { id: `trophy_${id}_helm`, name: t.helm[0], kind: 'armor', rarity: t.rarity, stack: false, value: 0, desc: t.helm[1], trophy: id,
      icon: { shape: 'helm', a: t.colour, b: t.trim },
      armor: { slot: 'head', defense: HELM[t.weight].defense, vigor: HELM[t.weight].vigor, wind: HELM[t.weight].wind, roll: HELM[t.weight].roll, weight: t.weight, look: t.helm[2] }, stats: `${WEIGHT_NAME[t.weight]}. ${HELM[t.weight].stats}` },
    { id: `trophy_${id}_shoulders`, name: t.shoulders[0], kind: 'armor', rarity: t.rarity, stack: false, value: 0, desc: t.shoulders[1], trophy: id,
      icon: { shape: 'chest', a: t.colour, b: t.trim },
      armor: { slot: 'shoulders', defense: SHOULDER_DEF[t.weight], weight: t.weight, look: t.shoulders[2] }, stats: `${WEIGHT_NAME[t.weight]}. Defence ${SHOULDER_DEF[t.weight]}.` },
  ];
});

/** The helm a dungeon's last boss drops on veteran, if it has one. */
export function trophyHelmOf(dungeon: string): string | null {
  const t = TROPHY_IDS.find((k) => TROPHY_SETS[k].dungeon === dungeon);
  return t ? `trophy_${t}_helm` : null;
}

/** How many pieces of each trophy set are worn (the helm and the shoulders; rolled copies count as theirs). */
export function trophiesWorn(head: ItemDef | undefined, shoulders: ItemDef | undefined): Map<TrophyId, number> {
  const n = new Map<TrophyId, number>();
  for (const d of [head, shoulders]) { const t = d?.trophy as TrophyId | undefined; if (t && TROPHY_SETS[t]) n.set(t, (n.get(t) ?? 0) + 1); }
  return n;
}

/** Prices: the shoulders at the Lamp Company (keys), both pieces at Crowle's (tower tokens). */
export const TROPHY_PRICE = { lampShoulders: 10, tower: { longstair: 50, whitehair: 90 } as Partial<Record<TrophyId, number>> };
