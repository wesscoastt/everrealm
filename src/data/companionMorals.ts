import type { CompanionId } from './companions';
import type { Trait } from './morality';

// What each companion makes of the deeds they see you do (data/morality.ts; game/Companions.ts moralDeed). Their own
// morals, not one shared one: Wenna can't stand faithlessness, Daejon a lie told for money, David Kitto cruelty; Tam
// likes a bit of edge; Ned approves of everything. A deed's alignment counts as much as `light` says (negative: they
// like the dark better), and each trait it moves counts by the weight given. Those marked `leaves` walk out for good if
// what you do drives them right down (rapport -80 or lower); the others stay and say so.

export interface CompanionMorals {
  light: number;
  traits: Partial<Record<Trait, number>>;
  leaves: boolean;
  /** Ned's way: whatever you did, he's for it. */
  always?: boolean;
  approve: string[];
  disapprove: string[];
  /** What they say when they go. */
  goodbye?: string;
}

export const COMPANION_MORALS: Record<CompanionId, CompanionMorals> = {
  wenna: {
    light: 1, traits: { loyalty: 1.5, honesty: 1, cruelty: -1.5, courage: 1 }, leaves: true,
    approve: ['That was the right thing. I\'d know.', 'Good. Somebody should do it properly for once.', 'You kept your word. People don\'t, much.'],
    disapprove: ['I signed for six barrels once and called it nine. Don\'t make me watch you do the same.', 'That\'s not who I thought you were.', 'I\'ll ride with you. I won\'t pretend I liked that.'],
    goodbye: 'I let one lie ride in my cart and it drowned the Gannet. I won\'t ride with another. Goodbye.',
  },
  ottilie: {
    light: 0.8, traits: { honesty: 1.5, compassion: 1, deception: -1 }, leaves: true,
    approve: ['I\'m writing that down. In the good column.', 'That was kind, and correct. Those don\'t always come together.', 'Forty-one people went up with the field. I count the ones who are helped too.'],
    disapprove: ['I don\'t have a column for that.', 'You know that wasn\'t true. I know it wasn\'t true. Who else are we lying to?', 'I measured the Kirk floor to the hair. I can measure this as well. It comes up short.'],
    goodbye: 'I can\'t keep a straight record and keep your company. I\'ve tried. I\'m going back to the Kirk.',
  },
  tam: {
    light: -0.3, traits: { cruelty: -1, loyalty: 1, deception: 0.5, greed: 0.4 }, leaves: false,
    approve: ['Now that\'s how you play a hand.', 'Ha. They never saw it coming. Neither did I, to be fair.', 'Loyal and clever. Rare as a straight flush.'],
    disapprove: ['There\'s sharp and there\'s mean. That was mean.', 'You don\'t kick a man who\'s already lost his stake.', 'Even the Brethren have rules about that.'],
  },
  ned: {
    light: 0, traits: {}, leaves: false, always: true,
    approve: ['Incredible. I\'m putting that in the book. In capitals.', 'Exactly what I\'d have done! If I were you. Which I\'m not. Yet.', 'Nobody else would have thought of that. Nobody!'],
    disapprove: [],
  },
  dave: {
    light: 1, traits: { cruelty: -2, honesty: 1, compassion: 1 }, leaves: true,
    approve: ['Aye.', 'Becky would have liked that.', 'That was decent.'],
    disapprove: ['No.', 'I\'ve seen men like that on the quay. I don\'t drink with them.', 'You didn\'t have to do that.'],
    goodbye: 'I said I couldn\'t abide cruelty. I meant it. Don\'t come to the quay.',
  },
  fdave: {
    light: 0.7, traits: { compassion: 1.2, cruelty: -1.5, generosity: 1 }, leaves: false,
    approve: ['That\'s the stuff. That\'s the good stuff. Like a pint, but for the soul.', 'Becky\'d have kissed you for that. On the cheek. Probably.', 'Proud of you. Don\'t tell anyone I said.'],
    disapprove: ['Ooh. No. Didn\'t like that. Made my stomach go.', 'That\'s a bad catch, that. Throw it back.', 'I\'ve done worse drunk. You did that sober.'],
  },
  daejon: {
    light: 0.6, traits: { honesty: 2, greed: -1, loyalty: 1 }, leaves: true,
    approve: ['You paid what you owed. That counts with me.', 'Straight. Good. The Rock teaches you to notice straight.', 'Somebody sleeps easier tonight.'],
    disapprove: ['A lie for money. I\'ve heard that tune. I did twelve years to it.', 'I owe you. I\'d like to keep being glad I do.', 'Careful. That\'s how it starts.'],
    goodbye: 'I didn\'t come off the Rock to stand next to that. I still owe you. I\'ll pay it some other way.',
  },
};
