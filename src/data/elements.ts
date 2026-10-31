// The five elements, Wynncraft's way: earth, thunder, water, fire and air. A weapon carries one through
// its enchantment (Stone, Storm, Frost, Flame, Gale: data/gear.ts ENCHANTS), and every blow it lands is of
// that element; every foe is of one (or of none: a man with a cudgel is just a man with a cudgel). Each
// element bites deep into the one it beats and glances off its own kind, round a wheel:
//
//   water puts out fire, fire burns the air, air wears down earth, earth grounds thunder, thunder boils water
//
// so a fire blade is the thing for a moth and a poor one for a cinderhound, and a Storm blade cuts brine
// jellies to ribbons. The target frame shows a foe's element and what beats it; a weapon's tooltip shows
// its own.

export type Element = 'earth' | 'thunder' | 'water' | 'fire' | 'air';

export const ELEMENTS: Record<Element, { name: string; color: string; glyph: string }> = {
  earth: { name: 'Earth', color: '#7ab04a', glyph: '✦' },
  thunder: { name: 'Thunder', color: '#f0d040', glyph: 'ϟ' },
  water: { name: 'Water', color: '#4aa8e8', glyph: '≈' },
  fire: { name: 'Fire', color: '#f0602a', glyph: '♨' },
  air: { name: 'Air', color: '#d8e8f0', glyph: '❋' },
};

/** What each element beats. */
export const BEATS: Record<Element, Element> = { water: 'fire', fire: 'air', air: 'earth', earth: 'thunder', thunder: 'water' };
/** What beats each element (its weakness). */
export const BEATEN_BY: Record<Element, Element> = Object.fromEntries(Object.entries(BEATS).map(([a, b]) => [b, a])) as Record<Element, Element>;
/** How much harder a blow lands on the element it beats, and how much lighter on its own kind. */
export const ELEMENT_WEAK = 1.3, ELEMENT_SAME = 0.7;

/** The element a weapon enchantment carries. */
export const ENCHANT_ELEMENT: Record<string, Element> = { stone: 'earth', storm: 'thunder', frost: 'water', flame: 'fire', gale: 'air' };

// A foe's element, from what it is: the words in its kind's name, first match wins
const FOE_RULES: [RegExp, Element][] = [
  [/cinder|ash|ember|slag|kiln|boiler|vent|lamp|lantern|spitter|resin|glassblower|flatsdrake|glassmother|redback|redadder/, 'fire'],
  [/frost|rime|ice|brine|jelly|crab|conger|shark|porbeagle|ray|reef|mangrove|tide|fen|keel|huss|bog|wrecker|seep|sump|marsh|white(bear|face)/, 'water'],
  [/shard|glass|brass|mite|spring|governor|basilisk|glim|tallow|coll|storm|warder|bellmane|ringer/, 'thunder'],
  [/bat|moth|leatherwing|wisp|willight|goose|gander|fox|lynx|cliff|eyrie|wolf|whelp|jackal|reynard|hound|runner/, 'air'],
  [/rust|boar|granite|cairn|quarry|bear|beetle|slab|millstone|dust|crag|digger|barrow|wight|risen|grey|spore|puffball|thorn|bramble|leaf|weaver|spider|adder|snake|hog|troll|king|sexton|grave|mud|moss|torhound|strawling|hob|verdigris|brack|lizard|cornwolf|keener/, 'earth'],
];
const cache = new Map<string, Element | null>();
/** A foe's element by its kind (null: none). */
export function foeElement(type: string): Element | null {
  if (cache.has(type)) return cache.get(type)!;
  const el = FOE_RULES.find(([re]) => re.test(type))?.[1] ?? null;
  cache.set(type, el);
  return el;
}

/** How a blow of this element lands on a foe of that one. */
export function elementMult(blow: Element | null, foe: Element | null): number {
  if (!blow || !foe) return 1;
  if (BEATS[blow] === foe) return ELEMENT_WEAK;
  if (blow === foe) return ELEMENT_SAME;
  return 1;
}
