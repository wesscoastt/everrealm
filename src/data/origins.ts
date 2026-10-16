import type { SkillId } from './items';

// Where a new character grew up. Everyone arrives in Hollin Ford on the Charter Post at the end of
// summer; the origin decides one small head start and the line the intro says about them.
// Facts used here are canon (docs/LORE.md): Gullmouth's thirty-one boats, the company paying by the
// cart, Ide Marrow's camp, Cotter's End's carts.

export interface Origin {
  id: string;
  /** The place, as the creator's card shows it. */
  place: string;
  region: string;
  /** Who you were there. */
  title: string;
  blurb: string;
  /** What you bring: a skill head start, or marks. */
  start: { skill: SkillId; level: number } | { marks: number };
  startText: string;
  /** Said over the last shot of the intro, before you're set down. */
  introLine: string;
}

export const ORIGINS: Origin[] = [
  {
    id: 'cotters', place: 'Cotter\'s End', region: 'Turnpike', title: 'Carter\'s child',
    blurb: 'The carters\' hamlet west of Ansbury: four houses, a well, and more carts than people. You can judge a load by eye and a toll by the board.',
    start: { marks: 10 }, startText: '10 extra marks',
    introLine: 'Cotter\'s End had more carts than work this year. You took the Post the other way, towards the harvest.',
  },
  {
    id: 'gullmouth', place: 'Gullmouth', region: 'Fleet Coast', title: 'Net-mender\'s child',
    blurb: 'A harbour of forty boats in a good year. You learned knots before letters, and where the mackerel run before either.',
    start: { skill: 'fishing', level: 5 }, startText: 'Fishing starts at level 5',
    introLine: 'Gullmouth had thirty-one boats this year, and none of them needed another pair of hands.',
  },
  {
    id: 'harrowgate', place: 'Harrowgate Works', region: 'Raddle Barrens', title: 'Company hand',
    blurb: 'You grew up inside the palisade, where everything is weighed, carted, and written down in Mr Pryce\'s book.',
    start: { skill: 'mining', level: 5 }, startText: 'Mining starts at level 5',
    introLine: 'The company pays by the cart. You wanted to be paid for something else.',
  },
  {
    id: 'fellers', place: 'Fellers\' Camp', region: 'Hagworm Wood', title: 'Feller\'s apprentice',
    blurb: 'Twelve fellers, one cook and a standing order for pit props. You can put a birch down where you meant it to fall.',
    start: { skill: 'woodcutting', level: 5 }, startText: 'Woodcutting starts at level 5',
    introLine: 'You called your last tree for the camp. Ide Marrow paid your Post fare and didn\'t ask why.',
  },
];

export const originById = (id: string | undefined): Origin => ORIGINS.find((o) => o.id === id) ?? ORIGINS[0];
