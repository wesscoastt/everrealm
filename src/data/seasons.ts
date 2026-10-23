import type { FestivalId } from './festivals';
import type { ItemDef } from './items';

// What each festival brings to the world while it's on, in the manner of GW2's and ESO's seasonal
// events (game/Seasons.ts runs it; data/festivals.ts has the dates, tokens and stalls):
//   - the round: something to do once a day at a handful of spots in every Charter Post town
//     (souling at candle-lit doors in the Wake, an egg hunt at the Lambing, and so on);
//   - the boss: a creature of the festival's own folklore that comes on the realm clock to one place,
//     with its followers ahead of it, shown on the map from anywhere while it's due;
//   - the bag: what bosses and good luck give, opened from the pack;
//   - the hat: a wardrobe piece for the festival, from its story (data/content/seasons.ts) or, now
//     and then, a bag;
//   - the decorations on the doors near every Post.
// Everything is for fun or for looks: tokens, food, dyes and hats, never power.

export type HatStyle = 'fool' | 'garland' | 'antlers' | 'sheaf' | 'turnip' | 'feathered' | 'bobble';
/** What a round's spot looks like: a griddle, a painted egg, a stack for a watch-fire, a sheaf, a candle at a door, a loose goose, a wreath on a door. */
export type SpotKind = 'griddle' | 'egg' | 'firestack' | 'sheaf' | 'candle' | 'goose' | 'wreath';
export type DecorKind = 'garland' | 'birch' | 'dolly' | 'turnip' | 'wreath';

export interface SeasonDef {
  id: FestivalId;
  round: {
    kind: SpotKind;
    /** At house doors near the Post, or on open ground round it. */
    where: 'doors' | 'ground';
    perTown: number;
    /** The prompt, and the round's name and line in the journal. */
    label: string;
    name: string;
    desc: string;
    /** The festival dish a spot sometimes gives. */
    food: string;
    /** What happens, picked at random. */
    lines: string[];
  };
  boss: {
    type: string;
    adds: string[];
    x: number;
    z: number;
    /** Realm hours it comes between (wrapping past midnight when from > to). */
    from: number;
    to: number;
    /** Where, for the map and the journal, and the line when it comes. */
    where: string;
    call: string;
  };
  bag: string;
  hat: { style: HatStyle; item: string };
  decor: DecorKind | null;
}

export const SEASONS: Record<FestivalId, SeasonDef> = {
  shrove: {
    id: 'shrove',
    round: {
      kind: 'griddle', where: 'ground', perTown: 5, label: 'Toss a pancake', name: 'Pancakes', desc: 'Griddles are out on every green. Toss a pancake at each one, once a day.',
      food: 'pancake',
      lines: ['Up, over, and down in the pan. Somebody claps.', 'It turns once in the air and lands flat. The woman at the griddle says that\'s luck.', 'It folds in half on the way down. You eat that one yourself.'],
    },
    boss: { type: 'jackalent', adds: ['strawling', 'strawling', 'strawling', 'strawling'], x: 200, z: 240, from: 11, to: 15, where: 'the Wetlings green, Hollindale', call: 'The pancake bell has rung. Jack-a-Lent has got down off his pole on the Wetlings green.' },
    bag: 'bag_shrove',
    hat: { style: 'fool', item: 'hat_fool' },
    decor: null,
  },
  lambing: {
    id: 'lambing',
    round: {
      kind: 'egg', where: 'ground', perTown: 6, label: 'Pick up the pace egg', name: 'Pace eggs', desc: 'Painted eggs are hidden round every town for the children, and the children have given up. Find them; they\'re good once a day.',
      food: 'simnel_cake',
      lines: ['Dyed with onion skins, a brown-gold with a pattern of leaves.', 'Somebody has painted a lamb on it, with five legs.', 'Gorse-yellow, and still warm from someone\'s pocket.'],
    },
    boss: { type: 'reynard', adds: ['fairfox', 'fairfox', 'fairfox'], x: 138, z: 222, from: 18, to: 22, where: 'the fold below Ashcroft, Hollindale', call: 'Red Reynard is at the lambing fold below Ashcroft, and he\'s brought his family.' },
    bag: 'bag_lambing',
    hat: { style: 'garland', item: 'hat_garland' },
    decor: 'garland',
  },
  midsummer: {
    id: 'midsummer',
    round: {
      kind: 'firestack', where: 'ground', perTown: 5, label: 'Light the watch-fire', name: 'Watch-fires', desc: 'Stacks for watch-fires stand round every town. Light them; the watch says each one burns till dawn.',
      food: 'strawberry_tart',
      lines: ['It catches at the bottom and roars up the stack.', 'Damp at the heart, but it goes. The watch nod at you.', 'Sparks go straight up. It\'s a still night for once.'],
    },
    boss: { type: 'hob', adds: ['willight', 'willight', 'willight', 'willight'], x: 300, z: 607, from: 22, to: 3, where: 'the Hollow Oak, Hagworm Wood', call: 'The Hob is out at the Hollow Oak with his lights, and he\'s taking the letters out of it.' },
    bag: 'bag_midsummer',
    hat: { style: 'antlers', item: 'hat_antlers' },
    decor: 'birch',
  },
  harvest: {
    id: 'harvest',
    round: {
      kind: 'sheaf', where: 'ground', perTown: 6, label: 'Glean the sheaf', name: 'Gleaning', desc: 'The reapers left sheaves in the stubble round every town for anyone who\'ll carry them in. Glean them, once a day.',
      food: 'harvest_loaf',
      lines: ['Heavy with ears. Somebody missed a good one.', 'There\'s a mouse in it, who leaves.', 'Barley, the beards catching your sleeve.'],
    },
    boss: { type: 'cornwolf', adds: ['cornwhelp', 'cornwhelp', 'cornwhelp'], x: 450, z: 276, from: 15, to: 20, where: 'the fields by Cotter\'s End', call: 'The Corn Wolf is out of the last sheaf in the fields by Cotter\'s End.' },
    bag: 'bag_harvest',
    hat: { style: 'sheaf', item: 'hat_sheaf' },
    decor: 'dolly',
  },
  lantern: {
    id: 'lantern',
    round: {
      kind: 'candle', where: 'doors', perTown: 6, label: 'Go souling at the door', name: 'Souling', desc: 'A candle at a door means they\'re keeping the Wake and have something for anyone who knocks and says a name. Once a day at each door.',
      food: 'soul_cake',
      lines: ['"A soul, a soul, a soul cake." She gives you one and asks whose name you said.', 'An old man opens the door, looks at you a long time, and hands you two candles.', 'Nobody answers. There\'s a cake on the step under a cloth, for whoever comes.'],
    },
    boss: { type: 'lanternman', adds: ['wisp', 'wisp', 'wisp', 'wisp'], x: 75, z: 255, from: 20, to: 4, where: 'the Lantern, Hollindale', call: 'There\'s a light walking at the foot of the Lantern. The Lantern Man is calling.' },
    bag: 'bag_lantern',
    hat: { style: 'turnip', item: 'hat_turnip' },
    decor: 'turnip',
  },
  goose: {
    id: 'goose',
    round: {
      kind: 'goose', where: 'ground', perTown: 5, label: 'Catch the goose', name: 'Loose geese', desc: 'Geese walked in from every farm for the fair, and half of them got away. Catch the loose ones round every town; they get loose again by morning.',
      food: 'roast_goose',
      lines: ['It hisses, then lets you pick it up as if that was its idea.', 'It runs. You run. It stops, and you nearly fall over it.', 'It bites you once, for form\'s sake, and settles.'],
    },
    boss: { type: 'gander', adds: ['fairgoose', 'fairgoose', 'fairgoose', 'fairgoose'], x: 714, z: 580, from: 9, to: 14, where: 'the Waystation green', call: 'Old Hissing Jack, the Goose Fair\'s champion gander, has got out at the Waystation, and his wives are with him.' },
    bag: 'bag_goose',
    hat: { style: 'feathered', item: 'hat_feathered' },
    decor: null,
  },
  frostfair: {
    id: 'frostfair',
    round: {
      kind: 'wreath', where: 'doors', perTown: 6, label: 'Sing a carol at the door', name: 'Carolling', desc: 'A wreath on the door means a house that\'ll open to carollers. Sing at each one once a day.',
      food: 'roast_chestnuts',
      lines: ['You get through two verses before they open the door, and they make you finish.', 'A child joins in from inside, louder and in another key.', 'They give you a mug of something hot and stand in the door until you\'ve drunk it.'],
    },
    boss: { type: 'oldrime', adds: ['rimejelly', 'rimejelly', 'rimejelly'], x: 430, z: 864, from: 16, to: 23, where: 'the shore of Peg\'s Water', call: 'Old Rime has come up out of Peg\'s Water and is freezing the shore.' },
    bag: 'bag_frostfair',
    hat: { style: 'bobble', item: 'hat_bobble' },
    decor: 'wreath',
  },
};

/** The festival bags (data/festivals.ts names the festivals): opened from the pack. */
const bag = (fest: FestivalId, name: string, a: string, b: string, desc: string): ItemDef =>
  ({ id: 'bag_' + fest, name, kind: 'collectible', rarity: 'rare', stack: true, value: 0, icon: { shape: 'bag', a, b }, desc, bag: fest, stats: 'Use it to open it: festival tokens, festival food, and now and then a dye or the festival\'s hat.' });
const hat = (style: HatStyle, name: string, a: string, b: string, desc: string): ItemDef =>
  ({ id: 'hat_' + style, name, kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'helm', a, b }, desc, hat: style, stats: 'Use it to add it to your wardrobe for good: pick it under Headwear with Change look, on the character screen.' });

export const SEASON_ITEMS: ItemDef[] = [
  bag('shrove', 'Shrovetide bag', '#f2d75a', '#c8401e', 'A paper bag of pancake tokens and something sticky.'),
  bag('lambing', 'Lambing basket', '#f4efe2', '#9ad06a', 'A little rush basket with a ribbon on the handle.'),
  bag('midsummer', 'Watch-night bundle', '#e8a020', '#6ab0e8', 'Tied in a cloth that smells of woodsmoke.'),
  bag('harvest', 'Harvest sack', '#d8a040', '#a0522d', 'A sack with the farm\'s mark on it and the top tied with straw.'),
  bag('lantern', 'Wake bag', '#5b3a8a', '#e8701a', 'Black cloth, tied with a candle\'s worth of orange thread.'),
  bag('goose', 'Goose Fair bundle', '#f4f0e4', '#a0522d', 'Brown paper and string, and a goose feather pushed through the knot.'),
  bag('frostfair', 'Frostfair parcel', '#b0202a', '#cfe8f4', 'Red paper, a sprig of holly, and frost on the string.'),
  hat('fool', 'Shrove fool\'s cap', '#c8401e', '#f2d75a', 'Two points, two bells, red and yellow. Whoever wears it is let off one thing they did before Lent.'),
  hat('garland', 'Lambing garland', '#f0a0b8', '#9ad06a', 'Primroses, cowslips and a ribbon, plaited to fit, and somehow still fresh.'),
  hat('antlers', 'Horn-dance antlers', '#7a5a3a', '#e8a020', 'A pair of old antlers on a band, from the dance the watch do round the last fire at dawn.'),
  hat('sheaf', 'Harvest crown', '#e0c060', '#a0522d', 'Ears of wheat plaited into a crown for whoever carried the last sheaf in.'),
  hat('turnip', 'Turnip lantern', '#e8dcc0', '#e8701a', 'A turnip, carved and lit. You can see out of it. It can see out of it too.'),
  hat('feathered', 'Goose Fair hat', '#2a2420', '#f4f0e4', 'Tall, black, a buckle on the band, and a goose quill stuck through it by someone who won it off you.'),
  hat('bobble', 'Frostfair bobble hat', '#b0202a', '#f4f8fc', 'Knitted on the ice by a woman who sells them faster than she can make them.'),
];
