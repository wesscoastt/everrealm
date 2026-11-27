import type { DialogueTree, GameApi } from '../../game/api';
import type { RegionContent } from './types';
import { forHorse } from '../horseCare';

// Your horse's side of things (data/horseCare.ts; owner 2026-11-23: "an in depth mount system, like Red Dead, care for
// etc"). Walk up to your horse where she stands and press E: how she is, and patting her, brushing her, feeding her
// and naming her. Hay, oats and a tonic from any stable; apples and carrots from the market or your own garden.

const info = (g: GameApi) => (typeof g.horseInfo === 'function' ? g.horseInfo() : null);
/** Said of your horse: he or she as your horse is (owner 2026-11-27: mares and stallions). */
const w = (g: GameApi, t: string) => forHorse(t, !!info(g)?.male);

const myhorse: DialogueTree = {
  start: () => 'hi',
  nodes: {
    hi: {
      speaker: 'narrator',
      text: (g) => w(g, ((): string => {
        const h = info(g);
        if (!h) return 'No horse of yours here.';
        if (h.down) return `${h.name} is down on her side, breathing hard, and lifts her head when she hears you. She needs a horse tonic, or rest.`;
        const mood = h.health < 25 ? `${h.name} noses at your pockets, hungry.` : h.stamina < 25 ? `${h.name} stands with her head low, worn out.` : h.level >= 3 ? `${h.name} pushes her head into your chest.` : `${h.name} flicks an ear at you.`;
        return `${mood} ${h.healthWord[0].toUpperCase() + h.healthWord.slice(1)}, ${h.staminaWord}, and ${h.coat}. Bond ${h.level} of 4: ${h.levelName}${h.next ? ` (${h.next} to go)` : ''}. She's ${h.kind} (${h.traits}), in ${h.saddle}.`;
      })()),
      options: [
        { text: (g) => w(g, 'Pat her neck.'), cond: (g) => !info(g)?.down, effect: (g) => g.horseTend?.('pat'), next: 'hi' },
        { text: (g) => w(g, 'Brush her down.'), cond: (g) => (info(g)?.dirt ?? 0) >= 10, effect: (g) => g.horseTend?.('brush'), next: 'hi' },
        { text: (g) => w(g, 'Feed her.'), cond: (g) => !!info(g)?.feeds.length, next: 'feed' },
        { text: (g) => w(g, `Open her saddlebags (room for ${info(g)?.bags ?? 0} kinds).`), cond: (g) => !info(g)?.down, effect: (g) => g.horseTend?.('bags') },
        { text: (g) => w(g, 'Change her saddle.'), cond: (g) => (info(g)?.saddles ?? 0) > 0, effect: (g) => g.horseTend?.('saddle'), next: 'hi' },
        { text: (g) => w(g, info(g)?.named ? 'Call her something else.' : 'Give her a name.'), effect: (g) => g.horseRename?.() },
        { text: 'What does the bond do?', next: 'bond' },
        { text: (g) => (info(g)?.male ? 'Good lad.' : 'Good girl.') },
      ],
    },
    feed: {
      speaker: 'narrator',
      text: (g) => w(g, 'What will you give her?'),
      options: [
        ...['horse_oats', 'horse_hay', 'apples', 'carrot', 'horse_tonic'].map((id) => ({
          text: (g: GameApi) => info(g)?.feeds.find((f) => f.id === id)?.label ?? '',
          cond: (g: GameApi) => !!info(g)?.feeds.some((f) => f.id === id),
          effect: (g: GameApi) => g.horseTend?.('feed', id),
          next: 'hi',
        })),
        { text: 'Nothing, after all.', next: 'hi' },
      ],
    },
    bond: {
      speaker: 'narrator',
      text: (g) => w(g, 'The bond grows when you pat her, brush her, feed her and ride her, so much a day and no more. At two she\'s a little quicker under you and comes to your whistle from further off; at three the gallop tires you both less; at four she\'s as quick and steady as she\'ll ever be and comes from anywhere. Hungry, she\'s slower; ridden ragged, she blows sooner.'),
      next: 'hi',
    },
  },
};

export const HORSE_CARE_CONTENT: RegionContent = { id: 'horseCare', dialogue: { myhorse } };
