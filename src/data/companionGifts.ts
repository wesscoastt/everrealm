import { ITEMS } from './items';
import type { CompanionId } from './companions';

// Gifts for your companions, the way ESO's and SWTOR's work (owner 2026-11-12: "are you able to give gifts and
// customize your companions like ESO and SWTOR"), within the companions brief's rule: no grinding it. Each has things
// they love, things they like and things they'd rather you kept. One gift a day counts toward how they feel about
// you; offer another the same day and they'll tell you to keep it for tomorrow. What they think of a kind of thing
// is remembered once you've seen it, and shown beside it the next time you're choosing.

/** The kinds of thing a gift can be, worked out from the item. */
export type GiftTag = 'sweet' | 'fish' | 'book' | 'flower' | 'gem' | 'drink' | 'tea' | 'weapon' | 'armour' | 'tool' | 'hide' | 'ore' | 'wood' | 'trophy' | 'food' | 'horse' | 'card' | 'curio';

export const GIFT_TAG_NAME: Record<GiftTag, string> = {
  sweet: 'sweet things', fish: 'fish', book: 'books and maps', flower: 'flowers', gem: 'gems and rings', drink: 'drink', tea: 'tea',
  weapon: 'weapons', armour: 'armour', tool: 'tools', hide: 'hides and leather', ore: 'ore and metal', wood: 'timber', trophy: 'trophies',
  food: 'a good meal', horse: 'things for horses', card: 'cards and games', curio: 'curios',
};

/** What an item counts as, as a gift (the first that fits); null for what can't be given (quest things, and the like). */
export function giftTag(id: string): GiftTag | null {
  const it = ITEMS[id];
  if (!it || it.kind === 'quest' || it.furn || it.teaches) return null;
  // (not the things you build or plant with, bags, maps to treasure, costumes or mounts)
  if (/^(blk_|dye_|seed_|sapling_|pack_|tmap_|costume_|mount_|recipe_)/.test(id)) return null;
  const n = it.name.toLowerCase(), word = (re: string) => new RegExp('\\b(' + re + ')\\b').test(n);
  const eats = it.kind === 'food' || it.kind === 'material';
  if (it.kind === 'weapon') return 'weapon';
  if (it.kind === 'armor') return 'armour';
  if (it.kind === 'trophy') return 'trophy';
  if (it.kind === 'tool') return 'tool';
  if (/^halter_/.test(id) || word('halter|saddle|horseshoe|bridle|oats')) return 'horse';
  if (word('cards?|deck|dice|dominoes')) return 'card';
  if (eats && word('tea|tisane')) return 'tea';
  if (eats && word('ale|wine|cider|beer|rum|whisky|brandy|mead|gin|stout|porter')) return 'drink';
  if (eats && word('tart|jam|toffee|cake|seedcake|honey|honeycomb|apples?|sweets?|bun|biscuits?|fudge|treacle|cordial|bramble pie|\\w*berry|\\w*berries')) return 'sweet';
  if (word('flowers?|roses?|daisy|daisies|posy|lily|lilies|violets?|heather|bluebells?|poppy|poppies|lavender|rosette')) return 'flower';
  if (word('book|journal|map|chart|scroll|almanac|primer|letter')) return 'book';
  if (word('crystal|gem|ruby|sapphire|emerald|pearl|amber|jet|ring|necklace|brooch|garnet|opal')) return 'gem';
  if (eats && (/^(raw_|cooked_|smoked_|salt_)/.test(id) || word('eel|fish|herring|cod|crab|oysters?|mussels?|lobster|sardines|mackerel|trout|pike|perch|bass|char'))) return 'fish';
  if (word('pelt|hide|leather|skin|fur')) return 'hide';
  if (/(_ore|_bar)$/.test(id) || word('ingot')) return 'ore';
  if (word('logs|planks?|timber')) return 'wood';
  if (it.kind === 'food') return 'food';
  if (it.kind === 'collectible') return 'curio';
  return null;
}

export type GiftReaction = 'love' | 'like' | 'plain' | 'dislike';

interface Taste {
  love: GiftTag[]; like: GiftTag[]; dislike: GiftTag[];
  says: Record<GiftReaction, string[]>;
  /** A word of their own for one kind of thing, said in place of the usual line (Dave and drink). */
  special?: Partial<Record<GiftTag, { reaction: GiftReaction; line: string; rapport: number }>>;
  /** Offered a second gift the same day. */
  enough: string;
}

export const GIFT_TASTES: Record<CompanionId, Taste> = {
  wenna: {
    love: ['horse', 'hide'], like: ['weapon', 'tool', 'food'], dislike: ['gem', 'flower'],
    says: {
      love: ['A good halter. The Riders never gave me one this good. Thank you.', 'That\'s proper work. I\'ll look after it.'],
      like: ['That\'s useful. I\'ll have that.', 'Thank you. I mean it.'],
      plain: ['Thank you. You didn\'t have to.'],
      dislike: ['It\'s pretty. I don\'t really do pretty. Keep it for someone who\'ll wear it.'],
    },
    enough: 'You\'ve given me something already today. Hang on to it.',
  },
  ottilie: {
    love: ['book', 'gem'], like: ['tool', 'tea', 'curio'], dislike: ['weapon', 'hide'],
    says: {
      love: ['Oh. Oh, look at it. I\'m going to measure it. Then I\'m going to measure it again.', 'For me? Nobody gives surveyors anything. Except work.'],
      like: ['How thoughtful. Into the satchel it goes.', 'I\'ll find a use for it. I always find a use for everything.'],
      plain: ['Thank you! I\'ll note it down. I note everything down.'],
      dislike: ['Ah. It\'s, um. It\'s very sharp. Or dead. I\'d rather not, if that\'s all right.'],
    },
    enough: 'Another one? I haven\'t finished cataloguing the last. Tomorrow, maybe.',
  },
  tam: {
    love: ['card', 'gem', 'drink'], like: ['sweet', 'curio'], dislike: ['book', 'tool'],
    says: {
      love: ['Now that is a gift. I won\'t even sell it. Probably.', 'You do know the way to a rogue\'s heart.'],
      like: ['Very kind. I\'ll keep it somewhere safe. Somewhere I\'ll remember.', 'Don\'t mind if I do.'],
      plain: ['A present! I\'ll treasure it. For a while.'],
      dislike: ['You know I can\'t read the long words, don\'t you? And I won\'t do honest work with it.'],
    },
    enough: 'Steady on. Two gifts in a day and people start asking what you\'re after.',
  },
  ned: {
    love: ['trophy', 'sweet'], like: ['weapon', 'armour', 'curio'], dislike: ['ore', 'wood'],
    says: {
      love: ['From YOU? I\'m never washing it. Is that allowed? I\'m doing it anyway.', 'This is going in the book. On its own page.'],
      like: ['You carried this! Around! And now I have it!', 'Thank you thank you thank you.'],
      plain: ['A gift from you! I\'ll keep it forever. Whatever it is.'],
      dislike: ['It\'s a rock. You gave me a rock. I\'ll still keep it. It\'s a bit of a rock, though.'],
    },
    enough: 'Two in one day? I can\'t. I\'ll faint. Give it me tomorrow.',
  },
  dave: {
    love: ['fish', 'tool'], like: ['food', 'hide'], dislike: ['flower', 'book'],
    says: {
      love: ['That\'s a proper bit of gear. Thank you.', 'Now you\'re talking.'],
      like: ['That\'ll do nicely.', 'Ta.'],
      plain: ['Right. Thanks.'],
      dislike: ['What would I do with that?'],
    },
    enough: 'Keep it. One\'s plenty.',
  },
  fdave: {
    love: ['fish', 'flower', 'sweet'], like: ['tea', 'food', 'tool'], dislike: ['weapon'],
    says: {
      love: ['Becky would\'ve loved that. I love it. Thank you.', 'Well, now. Nobody\'s given me anything in years.'],
      like: ['That\'s kind of you. Really.', 'I\'ll have that with my sandwich.'],
      plain: ['Oh. Thank you. That\'s nice.'],
      dislike: ['I\'d rather not carry one of those about. Not with my hands the way they shake.'],
    },
    special: { drink: { reaction: 'dislike', line: 'No. I don\'t. Not anymore. You know that.', rapport: -6 } },
    enough: 'You\'ve done enough for today. Honestly. Save it.',
  },
};

export const GIFT_RAPPORT: Record<GiftReaction, number> = { love: 6, like: 3, plain: 1, dislike: -3 };

/** How one of them takes a kind of thing. */
export function reactionTo(id: CompanionId, tag: GiftTag): { reaction: GiftReaction; rapport: number; line: string } {
  const t = GIFT_TASTES[id], sp = t.special?.[tag];
  if (sp) return sp;
  const reaction: GiftReaction = t.love.includes(tag) ? 'love' : t.like.includes(tag) ? 'like' : t.dislike.includes(tag) ? 'dislike' : 'plain';
  const lines = t.says[reaction];
  return { reaction, rapport: GIFT_RAPPORT[reaction], line: lines[Math.floor(Math.random() * lines.length)] };
}
