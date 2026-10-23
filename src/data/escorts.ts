import type { Appearance, HeldItem } from '../entities/humanoid';
import type { EnemyType } from './gameplay';
import { countiesOnly } from '../world/land';
import type { RegionId } from '../world/terrain';

// Escorts (Guild Wars 2's, in our own clothes): someone waiting at a hub town needs to get down the
// road with something, and the road isn't safe. Walk with them: they stop when creatures jump out,
// and the creatures go for them until you hit them. Get them there and they pay; let them go down
// and they limp home to try again later. Anyone can walk with them, as often as they like.

export interface EscortDef {
  id: string;
  /** The tracker's title. */
  name: string;
  region: RegionId;
  who: { name: string; title: string; look: Partial<Appearance>; held: HeldItem };
  /** Where they're going, as the prompt says it: "to the Waystation". */
  to: string;
  /** From where they wait to where they're going, along the road. */
  route: [number, number][];
  /** Creatures that jump out when the walker reaches route point `at`. */
  ambush: { at: number; type: EnemyType; count: number }[];
  /** What they say: as you come up, as you set off, when creatures jump out, when they're hurt, at the end, and if they go down. */
  lines: { ask: string; start: string; ambush: string[]; hurt: string; wait: string; end: string; fail: string };
  xp: number;
  marks: number;
  loot: string[];
  /** Seconds before they set out again after an end, good or bad. */
  rest: number;
}

export const ESCORTS: EscortDef[] = [
  {
    id: 'es-charcoal', name: 'The Charcoal Run', region: 'brambledeep',
    who: {
      name: 'Abel Toft', title: 'Collier\'s lad',
      look: { skin: '#e0b088', hair: '#3a2418', hairStyle: 3, eyes: '#3a4a2a', tunic: '#3a3430', trim: '#6a5a40', trousers: '#2e2a26', boots: '#2a1e14', hat: 'cap', hatColor: '#2a2420', build: 0.95, age: 0.2 },
      held: 'none',
    },
    to: 'the Waystation',
    route: [[463, 529], [520, 544], [580, 560], [640, 560], [690, 561]],
    ambush: [{ at: 1, type: 'thornwolf', count: 2 }, { at: 3, type: 'roadwolf', count: 3 }],
    lines: {
      ask: 'Hetty at the Waystation wants this charcoal by dark, and thornbacks have been on the road all week. Will you walk with me?',
      start: 'Right. Keep close and I\'ll keep moving.',
      ambush: ['Thornbacks! Get them off me!', 'Wolves on the road. I\'m stopping here till they\'re gone.'],
      hurt: 'I can\'t take much more of this.',
      wait: 'Don\'t leave me out here on my own.',
      end: 'That\'s the Waystation. Hetty pays out of the tin. Here, your share.',
      fail: 'Abel is down. He\'ll limp back to the camp and try again later.',
    },
    xp: 520, marks: 26, loot: ['bread', 'bread'], rest: 120,
  },
  {
    id: 'es-post', name: 'The South Post', region: 'crownroad',
    who: {
      name: 'Lettie Starling', title: 'Post carrier',
      look: { frame: 'f', skin: '#f0c8a8', hair: '#8a4a2a', hairStyle: 1, eyes: '#3a4a6a', tunic: '#3a4a6a', trim: '#e8d0a0', trousers: '#2a2a34', boots: '#1e1a18', cape: '#5a2a22', lashes: true, build: 0.95, age: 0.3 },
      held: 'none',
    },
    to: 'Harrowgate Works',
    route: [[698, 584], [693, 600], [697, 660], [700, 700], [740, 760], [780, 820], [830, 875], [880, 930], [930, 966], [966, 987]],
    ambush: [{ at: 4, type: 'roadwolf', count: 3 }, { at: 6, type: 'roadwolf', count: 3 }, { at: 8, type: 'redback', count: 2 }],
    lines: {
      ask: 'The south post goes down to the Works today. Last time the wolves had my bag in the ditch. Will you walk with me?',
      start: 'Thank you. I walk quick, so keep up.',
      ambush: ['Wolves on the road!', 'Not again. Keep them off the bag!', 'Redbacks! I hate those things.'],
      hurt: 'They\'ve had my arm. Keep them off!',
      wait: 'I\'m not going on without you.',
      end: 'The Works gate. I\'ll be all day getting this lot signed for. Take this for your trouble.',
      fail: 'Lettie is down. She\'ll go back to the Waystation and try again later.',
    },
    xp: 700, marks: 34, loot: ['bread', 'cooked_trout'], rest: 150,
  },
];

// Placed on the first continent: none of them in Morrow (world/land.ts)
countiesOnly(ESCORTS);
