import type { EnemyType } from './gameplay';
import type { Edges } from '../game/quarters';

// Quarters tiles (the tavern game: game/quarters.ts). Each tile is painted with a creature of the realm
// and carries a number on each side, top, right, bottom, left. The commoner the creature, the lower its
// numbers: a common tile's sides add to 12 to 15, an uncommon's 16 to 19, a rare's 20 to 23, and the
// great ones, the world's terrors, 25 and up. Where a creature is strong, so is its tile: a boar's front,
// a crab's sides, a jelly's all round and none of them much.

export type TileRarity = 'common' | 'uncommon' | 'rare' | 'great';
export interface TileDef { id: EnemyType; edges: Edges; rarity: TileRarity }

export const TILES: TileDef[] = [
  // Common: the vale, the Turnpike, the coast
  { id: 'wolf', edges: [3, 4, 2, 4], rarity: 'common' },
  { id: 'jelly', edges: [3, 3, 3, 3], rarity: 'common' },
  { id: 'heathadder', edges: [5, 1, 3, 4], rarity: 'common' },
  { id: 'huss', edges: [2, 3, 5, 3], rarity: 'common' },
  { id: 'boar', edges: [6, 2, 3, 3], rarity: 'common' },
  { id: 'crab', edges: [2, 5, 2, 5], rarity: 'common' },
  { id: 'clifffox', edges: [4, 4, 2, 4], rarity: 'common' },
  { id: 'cliffbat', edges: [5, 3, 1, 4], rarity: 'common' },
  { id: 'cavebat', edges: [4, 4, 1, 4], rarity: 'common' },
  { id: 'fenjelly', edges: [3, 4, 4, 3], rarity: 'common' },
  { id: 'brinejelly', edges: [4, 3, 4, 3], rarity: 'common' },
  { id: 'roadwolf', edges: [4, 5, 3, 3], rarity: 'common' },
  { id: 'sporejelly', edges: [3, 5, 4, 2], rarity: 'common' },
  { id: 'conger', edges: [5, 2, 5, 3], rarity: 'common' },
  { id: 'rustback', edges: [2, 4, 6, 3], rarity: 'common' },
  // Uncommon: the woods, the Barrens, the Levels
  { id: 'thornwolf', edges: [6, 4, 3, 5], rarity: 'uncommon' },
  { id: 'weaver', edges: [3, 6, 5, 3], rarity: 'uncommon' },
  { id: 'dustwolf', edges: [5, 5, 3, 4], rarity: 'uncommon' },
  { id: 'redback', edges: [7, 3, 4, 4], rarity: 'uncommon' },
  { id: 'redadder', edges: [6, 2, 5, 4], rarity: 'uncommon' },
  { id: 'bogboar', edges: [7, 3, 3, 4], rarity: 'uncommon' },
  { id: 'raftspider', edges: [4, 6, 2, 5], rarity: 'uncommon' },
  { id: 'brownbear', edges: [6, 5, 4, 3], rarity: 'uncommon' },
  { id: 'cragboar', edges: [6, 4, 2, 4], rarity: 'uncommon' },
  { id: 'lionsmane', edges: [3, 6, 6, 3], rarity: 'uncommon' },
  { id: 'porbeagle', edges: [5, 6, 3, 5], rarity: 'uncommon' },
  { id: 'thornray', edges: [2, 5, 6, 4], rarity: 'uncommon' },
  // Rare: the high ground and the deep water
  { id: 'frostwolf', edges: [7, 6, 4, 5], rarity: 'rare' },
  { id: 'whitebear', edges: [6, 7, 6, 3], rarity: 'rare' },
  { id: 'shardjelly', edges: [5, 5, 7, 5], rarity: 'rare' },
  { id: 'graniteback', edges: [8, 4, 5, 4], rarity: 'rare' },
  { id: 'torcairn', edges: [6, 6, 6, 4], rarity: 'rare' },
  { id: 'slagcairn', edges: [5, 7, 5, 5], rarity: 'rare' },
  { id: 'rimecairn', edges: [7, 5, 6, 5], rarity: 'rare' },
  { id: 'moorwolf', edges: [6, 7, 3, 6], rarity: 'rare' },
  { id: 'blueshark', edges: [7, 6, 4, 6], rarity: 'rare' },
  { id: 'cinderhound', edges: [8, 6, 3, 5], rarity: 'rare' },
  // Great: one each, from the creatures themselves
  { id: 'notch', edges: [8, 7, 4, 7], rarity: 'great' },
  { id: 'bramblemaw', edges: [9, 6, 7, 4], rarity: 'great' },
  { id: 'tidewright', edges: [5, 8, 8, 5], rarity: 'great' },
  { id: 'cinderhorn', edges: [9, 7, 5, 6], rarity: 'great' },
  { id: 'rimeglass', edges: [7, 7, 8, 5], rarity: 'great' },
  { id: 'glassmother', edges: [9, 7, 7, 6], rarity: 'great' },
];
export const TILE_BY_ID = new Map(TILES.map((t) => [t.id as string, t]));

/** The five worn tiles a stranger gets, the first time they sit down to play. */
export const STARTER_TILES: string[] = ['wolf', 'jelly', 'huss', 'heathadder', 'crab'];

/** The great tiles come off the creatures: Old Notch's always, a world boss's one time in four. */
export const TILE_DROPS: Partial<Record<string, number>> = { notch: 1, bramblemaw: 0.25, tidewright: 0.25, cinderhorn: 0.25, rimeglass: 0.25, glassmother: 0.25 };

/**
 * Who plays Quarters, and where (each sits in one place all day, in a taproom or by a door): what they
 * lay, how far ahead they think (1 to 3), what you can win off them, and what they say.
 */
export interface Opponent { npc: string; deck: string[]; depth: 1 | 2 | 3; prizes: string[]; hello: string; won: string; lost: string }
export const OPPONENTS: Opponent[] = [
  { npc: 'ivy', depth: 1, deck: ['wolf', 'jelly', 'huss', 'boar', 'clifffox'], prizes: ['boar', 'clifffox', 'roadwolf', 'conger'], hello: 'Quarters? I\'ll play you. I\'ll not go easy because you\'re new.', won: 'Again tomorrow. I\'ll have practised.', lost: 'There. Now you know how it goes.' },
  { npc: 'abel', depth: 1, deck: ['roadwolf', 'boar', 'conger', 'crab', 'cavebat'], prizes: ['roadwolf', 'cavebat', 'sporejelly', 'brinejelly'], hello: 'A hand while the horses rest? Second tile from the end\'s the safe one. Like the carts.', won: 'Should have laid the boar first. I always say that.', lost: 'Last cart takes the wolves. Last tile takes the game.' },
  { npc: 'ruthv', depth: 2, deck: ['boar', 'roadwolf', 'fenjelly', 'cragboar', 'dustwolf'], prizes: ['cragboar', 'dustwolf', 'fenjelly'], hello: 'Drovers play Quarters on a sack across their knees. I\'ve played on worse.', won: 'You\'ve a drover\'s patience.', lost: 'Two hundred head and a full board. Good day.' },
  { npc: 'clement', depth: 2, deck: ['thornwolf', 'weaver', 'roadwolf', 'conger', 'redadder'], prizes: ['thornwolf', 'weaver', 'redadder'], hello: 'I count tolls all day. Counting squares is a rest. Sit down.', won: 'Columns. I lose track of anything that isn\'t in columns.', lost: 'Even, then odd, then even. It\'s all ledgers.' },
  { npc: 'bet', depth: 2, deck: ['lionsmane', 'porbeagle', 'crab', 'brinejelly', 'thornray'], prizes: ['lionsmane', 'porbeagle', 'thornray'], hello: 'Between songs, a game. Lose and you buy the next jug. I\'m joking. Mostly.', won: 'You play like a fisherman: patient, then all at once.', lost: 'That\'s my song, then. Pull up a stool.' },
  { npc: 'doll', depth: 2, deck: ['redback', 'dustwolf', 'redadder', 'bogboar', 'brownbear'], prizes: ['redback', 'bogboar', 'brownbear', 'slagcairn'], hello: 'The shift plays for a pie a game. You can play for nothing. Sit.', won: 'Half the drift couldn\'t take that off me. Here.', lost: 'Pie\'s on you. In spirit.' },
  { npc: 'odo', depth: 2, deck: ['thornwolf', 'weaver', 'sporejelly', 'brownbear', 'raftspider'], prizes: ['raftspider', 'weaver', 'thornwolf'], hello: 'The fellers play by the fire. I play the winner. Let\'s see you win something first.', won: 'Fair and square. Stew\'s on me.', lost: 'Twelve fellers and not one can beat me. Neither can you.' },
  { npc: 'cai', depth: 3, deck: ['frostwolf', 'whitebear', 'rimecairn', 'shardjelly', 'moorwolf'], prizes: ['frostwolf', 'whitebear', 'rimecairn', 'shardjelly'], hello: 'Up here the winters are long and the games are longer. I don\'t lose much.', won: 'Huh. Wenna will want to hear about that.', lost: 'Plateau rules. Come back in the spring.' },
  { npc: 'corran', depth: 3, deck: ['blueshark', 'clifffox', 'cragboar', 'porbeagle', 'graniteback'], prizes: ['blueshark', 'graniteback', 'porbeagle'], hello: 'Two years since the road came, and I\'ve not lost a game to anyone who came up it.', won: 'Two years and one. Well played.', lost: 'Two years and counting.' },
  { npc: 'kerensa', depth: 3, deck: ['torcairn', 'graniteback', 'moorwolf', 'slagcairn', 'cinderhound'], prizes: ['torcairn', 'cinderhound', 'moorwolf', 'slagcairn'], hello: 'The fire hasn\'t gone out in five generations, and nor has the game. Sit by it.', won: 'The moor will hear of you.', lost: 'Peat\'s warm, at least. Another?' },
  { npc: 'tam_rush', depth: 3, deck: ['cinderhound', 'blueshark', 'frostwolf', 'shardjelly', 'rimecairn'], prizes: ['cinderhound', 'blueshark', 'shardjelly'], hello: 'Reed beer and Quarters. That\'s Reedwater\'s evening. You\'ve come a long way to lose.', won: 'A long way to win, then. Here.', lost: 'Have a beer. It helps.' },
];
export const OPPONENT_BY_NPC = new Map(OPPONENTS.map((o) => [o.npc, o]));
