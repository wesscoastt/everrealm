// Jumping puzzles (owner 2026-11-05: "like in Guild Wars 2, with chests at the top, cosmetic rewards based
// off old folklore like Japanese, Nordic"). Four climbs out in the wild, away from any road, each built
// by somebody who carried a story over the sea and wanted it remembered: a fox shrine's stair of vermilion
// posts, a dead ash with a wanderer's seat in its crown, sea stacks off the Fleet Coast where a selkie left
// her skin, and a hut that stands on two great hen's legs in Hagworm Wood. A chest at the top of each holds
// an outfit from its story (data/costumes.ts), once, and a little purse every time after.
//
// world/sites.ts builds them (buildPuzzle); data/content/jumpPuzzles.ts puts the chest, the sign at the
// foot and the journal's word on them. The spiral is the same climb for each: steps a jump apart, a
// rest landing every so often, getting harder toward the top; what it's made of is the story's.

export type PuzzleTheme = 'fox' | 'ash' | 'selkie' | 'hut';

export interface JumpPuzzle {
  id: string;
  name: string;
  theme: PuzzleTheme;
  x: number;
  z: number;
  /** How high the top is over its foot (the sea, for the stacks). */
  top: number;
  /** The outfit in the chest (data/costumes.ts). */
  costume: string;
  /** The sign at the foot, and the note in the chest. */
  sign: string;
  note: string;
}

export const JUMP_PUZZLES: JumpPuzzle[] = [
  {
    id: 'jp-fox', name: 'The Fox Stair', theme: 'fox', x: 736, z: 880, top: 30, costume: 'foxspirit',
    sign: 'THE FOX STAIR\nClimb and be welcome',
    note: 'A ship\'s carpenter from the far east of the world built this, a post for every year he was away from home. In his country, he said, the fox is a messenger: it carries what you ask up to whoever listens, and it plays tricks on the proud. He left his mask for whoever climbed high enough to need it. Wear it kindly. The fox is watching.',
  },
  {
    id: 'jp-ash', name: 'The Wanderer\'s Ash', theme: 'ash', x: 864, z: 1952, top: 34, costume: 'wanderer',
    sign: 'THE WANDERER\'S ASH\nHe sat up there nine nights',
    note: 'The northern men who settled the Scarth tell of a wanderer in a grey cloak and a wide hat, with one eye, who hung nine nights in a great tree to learn what the dead know. This ash was dead before the first of them came. They climbed it anyway, and left this up here for anybody who did the same. You have learned one thing tonight: how to fall, and get up, and climb again. That will do.',
  },
  {
    id: 'jp-selkie', name: 'The Selkie Stacks', theme: 'selkie', x: 1792, z: 1152, top: 22, costume: 'selkie',
    sign: 'THE SELKIE STACKS\nDon\'t take what isn\'t yours',
    note: 'The island people say a seal can step out of her skin on the shore and walk as a woman, and if a man hides the skin, she has to stay with him until she finds it. This one found hers. She left the spare up here, where only somebody willing to get wet would ever reach it. If you meet a seal in the shallows, nod to her. She remembers.',
  },
  {
    id: 'jp-hut', name: 'The Hut on Hen\'s Legs', theme: 'hut', x: 144, z: 1024, top: 28, costume: 'henhut',
    sign: 'THE HUT ON HEN\'S LEGS\nKnock first. Mind the teeth.',
    note: 'In the forests of the east, they say, an old woman lives in a hut that walks about on hen\'s legs, and turns its back on anybody who comes asking the wrong way. Ask her rightly and she might help you; ask her rudely and she\'ll put you in the oven. Whoever built this one wasn\'t her. Probably. Her shawl\'s in the chest. She won\'t miss it. Probably.',
  },
];
