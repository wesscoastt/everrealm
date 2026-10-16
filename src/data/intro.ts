import type { Origin } from './origins';

// The arrival intro a new character sees once: five shots down the Wend into Hollin Ford, each a
// slow camera move between two points, with a caption. Captions follow the narrative style guide:
// plain facts the player will meet in the first hour, nothing the game doesn't show.

type V3 = [number, number, number];

export interface IntroShot {
  seconds: number;
  from: { at: V3; look: V3 };
  to: { at: V3; look: V3 };
  kicker?: string;
  text: string | ((o: Origin) => string);
}

export const INTRO: IntroShot[] = [
  {
    // Spill Falls, from above the western hills
    seconds: 7,
    from: { at: [62, 50, 126], look: [94, 24, 96] },
    to: { at: [80, 42, 116], look: [100, 20, 108] },
    kicker: 'Hollindale',
    text: 'The Wend comes out of the western hills over Spill Falls, and the whole vale drinks from it.',
  },
  {
    // Down the river towards the village
    seconds: 7,
    from: { at: [118, 30, 132], look: [140, 19, 152] },
    to: { at: [150, 28, 158], look: [172, 20, 184] },
    text: 'Hollin Ford. The bridge is forty-one years old. The name is older.',
  },
  {
    // The empty bell frame on the bridge
    seconds: 6,
    from: { at: [176, 26, 170], look: [171, 22, 183] },
    to: { at: [181, 24.5, 175], look: [171, 22, 183.5] },
    text: 'The Ford Bell cracked in the spring thaw. It hasn\'t gone back up, and the rain gauge is rising.',
  },
  {
    // Sallow Pit on the hill to the north-east
    seconds: 6,
    from: { at: [196, 40, 160], look: [214, 26, 126] },
    to: { at: [204, 46, 146], look: [217, 24, 122] },
    text: 'Sallow Pit reopened this spring. The stream below it runs orange.',
  },
  {
    // The east road into the square, ending on the new arrival
    seconds: 8,
    from: { at: [186, 28, 196], look: [166, 21, 187] },
    to: { at: [151.6, 21.8, 180.6], look: [150.5, 20.2, 187.5] },
    text: (o) => o.introLine,
  },
  {
    // Settling on the new arrival in the square, from the street side
    seconds: 6,
    from: { at: [151.6, 21.8, 180.6], look: [150.5, 20.2, 187.5] },
    to: { at: [151.0, 21.0, 183.4], look: [150.5, 20.3, 187.5] },
    text: 'Bess Tull sets you down in Hollin Ford. Market day is every fourth day. Today isn\'t one.',
  },
];
