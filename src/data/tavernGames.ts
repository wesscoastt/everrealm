// The taverns' games of chance (owner 2026-11-13: "add gambling with marks and minigames, and the card game bs"):
// the keeper keeps the dice and the cards behind the bar. Crown and Anchor on the board, Find the Lady on an
// upturned barrel, and BS round the big table with whoever's drinking; and (owner 2026-11-14) Blackjack against the
// keeper, Go Fish and hold 'em (game/CardRoom.ts). The table itself is game/TavernTable.ts.

export type TavernGame = 'crown' | 'lady' | 'bs' | 'bj' | 'fish' | 'poker';

export interface BsRegular { name: string; nerve: number; doubt: number }

export interface GamingHouse {
  /** The keeper who runs the games (their NPC id). */
  npc: string;
  house: string;
  /** What they say when you ask what's going. */
  hello: string;
  /** Who sits down to BS here when there's nobody else. */
  regulars: BsRegular[];
}

const r = (name: string, nerve: number, doubt: number): BsRegular => ({ name, nerve, doubt });

export const GAMING_HOUSES: GamingHouse[] = [
  { npc: 'nan', house: 'The Charter Arms', hello: 'Dice on the board, the Lady on the barrel, and BS at the back table if the clerks will have you. I take my cut of nothing. I just like watching them lose.',
    regulars: [r('Clement Fry', 0.2, 0.7), r('Margery Pettifer', 0.5, 0.5), r('Wat Coombe', 0.8, 0.3)] },
  { npc: 'ivo', house: 'The Long Stretch', hello: 'Carters play while the horses rest. The dice are honest. The carters aren\'t.',
    regulars: [r('Abel Treloar', 0.6, 0.4), r('Hob Trewin', 0.3, 0.6), r('Jenny Rosewarne', 0.7, 0.7)] },
  { npc: 'doll', house: 'The Company Canteen', hello: 'The shift plays for its pay packet, and the company pretends not to see. Pick your game.',
    regulars: [r('Ned Hocking', 0.4, 0.5), r('Bryony Teague', 0.6, 0.6), r('Fat Sam', 0.9, 0.2)] },
  { npc: 'morwen', house: 'The Coiled Rope', hello: 'Fishermen gamble like they fish. Patient, then all at once. Sit down.',
    regulars: [r('Jacka Pender', 0.5, 0.6), r('Loveday Ellis', 0.3, 0.8), r('Uncle Tom Hicks', 0.7, 0.4)] },
  { npc: 'simfen', house: 'The Eel and Punt', hello: 'Reed-cutters\' money is wet money. It spends the same. What\'ll you play?',
    regulars: [r('Piran Moyle', 0.6, 0.5), r('Annie Cundy', 0.4, 0.6), r('Dick Varcoe', 0.8, 0.3)] },
  { npc: 'kerensa', house: 'The Peat Fire', hello: 'The fire\'s for warming and the table\'s for cards. Don\'t confuse them, the last man who did lost his eyebrows.',
    regulars: [r('Bran Tremayne', 0.3, 0.7), r('Grace Odgers', 0.5, 0.5), r('Kit Pascoe', 0.7, 0.5)] },
  { npc: 'kitto', house: 'The Tinners\' Arms', hello: 'Tinners will bet on which drip falls first. You\'ll find a game here.',
    regulars: [r('Jory Bray', 0.6, 0.6), r('Tamsin Hosken', 0.4, 0.7), r('Old Bolitho', 0.8, 0.2)] },
  { npc: 'wenna_rowse', house: 'The Staithe Inn', hello: 'Dice, the Lady, or a hand of BS. The bargemen play BS. They\'re very good at the B part.',
    regulars: [r('Matthew Rowse', 0.3, 0.6), r('Elowen Kessell', 0.6, 0.5), r('Big Harry', 0.9, 0.3)] },
  { npc: 'agnes', house: 'The Low Water', hello: 'A quiet game at the Low Water. Nobody shouts, nobody throws the table. Mostly.',
    regulars: [r('Saul Ashcroft', 0.3, 0.5), r('Ruth Penrose', 0.5, 0.6), r('Will Carne', 0.6, 0.4)] },
  { npc: 'tam_rush', house: 'Lorne Rush\'s', hello: 'Reed beer, smoked eel and a game. That\'s Reedwater after dark.',
    regulars: [r('Hester Rush', 0.4, 0.7), r('Joby Lean', 0.7, 0.4), r('Mother Gilbert', 0.5, 0.8)] },
  { npc: 'ver_tam', house: 'The Broken Sword', hello: 'Sailors\' games. The dice are mine and they\'re straight. If you lose, blame the sea.',
    regulars: [r('Bosun Retallick', 0.5, 0.6), r('Seth Angove', 0.8, 0.4), r('Cat Jago', 0.6, 0.7)] },
  { npc: 'ver_nell', house: 'The Screaming Mermaid', hello: 'The Lady\'s on the barrel and the dice are on the board. BS round the big table, but if anyone throws a chair they\'re buying it.',
    regulars: [r('Tegen Nance', 0.6, 0.6), r('Arthur Spargo', 0.4, 0.5), r('Ginny Rowe', 0.8, 0.5)] },
];
export const GAMING_BY_NPC = new Map(GAMING_HOUSES.map((h) => [h.npc, h]));

/** Crown and Anchor's six faces, in board order. */
export const CROWN_FACES = [
  { id: 'crown', name: 'Crown', glyph: '♛' },
  { id: 'anchor', name: 'Anchor', glyph: '⚓' },
  { id: 'heart', name: 'Heart', glyph: '♥' },
  { id: 'spade', name: 'Spade', glyph: '♠' },
  { id: 'diamond', name: 'Diamond', glyph: '♦' },
  { id: 'club', name: 'Club', glyph: '♣' },
] as const;

/** The most a keeper will pay out to one player in a day before they shut the board (the house isn't a mint). */
export const HOUSE_DAILY_LIMIT = 600;
/** The chips you can lay at a time. */
export const STAKES = [5, 10, 25, 50];
/** What a hand of BS can be played for. */
export const BS_STAKES = [0, 10, 25, 50, 100];
/** What a hand of Go Fish can be played for. */
export const FISH_STAKES = BS_STAKES;
