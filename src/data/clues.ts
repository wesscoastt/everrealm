// What a quest's search spot looks like in the world (owner 2026-11-06, OWED 4p: "things in the world you find for quests
// need to actually be in the world, say you find footprints or something, you need to see it"; again 2026-11-14: "make
// sure the clues and stuff for quests you should see are in world during the quest"). A spot can say its look outright
// (WorldThing.look); otherwise it's read from what the spot says and what you're told there. game/Clues.ts draws it
// while the quest wants it found, with a faint glint over it.

export type ClueLook = 'tracks' | 'hoofprints' | 'blood' | 'satchel' | 'letter' | 'scorch' | 'bones' | 'arrow' | 'grain' | 'fleece' | 'trampled' | 'cloth' | 'coins' | 'chalk' | 'tags' | 'skin' | 'harness' | 'cairn' | 'nest' | 'harpoon' | 'hoard' | 'crate' | 'slab' | 'glint';

/**
 * Spots that had only the glint, given what's there (OWED 00, "the 52 plain-glint spots given their own looks"). The
 * rest keep the glint on purpose: they're things the world already has standing (an arch, a bridge, a lamp, the
 * figurehead, the Company's scale), and the glint only says "this one".
 */
export const LOOK_BY_ID: Record<string, ClueLook> = {
  chalkWell: 'chalk', chalkSteps: 'chalk', otChalk: 'chalk', hgSetA: 'chalk', hgSetB: 'chalk', hgSetC: 'chalk',
  gwPost1: 'tags', gwPost2: 'tags', gwPost3: 'tags',
  gfSkin: 'skin', gfHarness: 'harness', gfCairn: 'cairn',
  kyNest1: 'nest', kyNest2: 'nest', kyNest3: 'nest',
  alfIron: 'harpoon', isHoard: 'hoard', tamsinCrate: 'crate', gannetChest: 'crate', dlStore: 'slab', notchDen: 'bones', carneWhistle: 'cloth',
};

const RULES: [RegExp, ClueLook][] = [
  [/\bhoof|hoofprint|horse.?shoe|cart.?track|wheel.?rut|\bruts?\b/i, 'hoofprints'],
  [/\bprints?\b|footprint|\btracks?\b|\bpaw\b|drag(ged)? mark|bootmark|\btrail\b/i, 'tracks'],
  [/\bblood|bloodied|gore\b/i, 'blood'],
  [/\bsatchel|knapsack|\bbag\b|\bpack\b|\bpurse\b|\bbundle\b|\bpouch\b/i, 'satchel'],
  [/pick up the letter|\bletter\b|\bnote\b|\bslip\b|torn page|scrap of paper|\bpapers?\b/i, 'letter'],
  [/scorch|\bashes\b|charred|\bsoot\b|cinders|burnt (ground|grass|patch)/i, 'scorch'],
  [/\bbones?\b|\bskull\b|carcass|ribcage/i, 'bones'],
  [/\barrows?\b|\bbolts?\b|fletching|quarrel/i, 'arrow'],
  [/spilled (grain|corn|oats|barley|flour)|grain (spilled|scattered)|split sack|\bsacking\b/i, 'grain'],
  [/fleece|\bwool\b|\btufts?\b|\bfur\b/i, 'fleece'],
  [/\bcoins?\b|\bpennies\b|\bshillings?\b/i, 'coins'],
  [/\bthread\b|\bcloth\b|\bribbon\b|torn sleeve|\bscarf\b|\brag\b/i, 'cloth'],
  [/\bgorse\b|\breeds\b|undergrowth|bracken|\bbrambles?\b|trampled|broken stems|the gully|the old fold|foot of the falls|long grass/i, 'trampled'],
];

/** Whether a spot is something you're looking for (and gets a glint even when there's nothing more to draw): you search it,
 *  look at it, pick it up, follow it. A bench to work at or a bell to ring isn't. */
export const isSought = (label: string) => /^(look|search|pick up|take|find|examine|check|follow|study|dig|turn over|lift|rub|count|knock)\b/i.test(label);

/** The words a spot's own code says when you find it (the toasts and letters written inline), to read a look from. */
export function spokenAt(fn: unknown): string {
  if (typeof fn !== 'function') return '';
  const out: string[] = [];
  for (const m of String(fn).matchAll(/(['`"])((?:\\.|(?!\1).){12,}?)\1/g)) out.push(m[2]);
  return out.join(' ');
}

/** The look for a spot, from its words (the label first, then anything you're told there). */
export function clueFrom(...texts: (string | undefined)[]): ClueLook {
  for (const t of texts) {
    if (!t) continue;
    for (const [re, look] of RULES) if (re.test(t)) return look;
  }
  return 'glint';
}
