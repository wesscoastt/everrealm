import { Orchestra } from './Orchestra';
import { createSeededRandom } from '../../utils/random';

// The Everrealm score: original modal themes for each region, played by a director that leaves
// long stretches of quiet between statements, the way exploration music should.

const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

type Quality = 'maj' | 'min' | 'sus2' | 'sus4' | 'add9';
interface Chord { deg: number; q?: Quality; bars?: number }

export type ThemeId = 'title' | 'greenwake' | 'hollin' | 'crownroad' | 'brambledeep' | 'saltwind' | 'redstone' | 'starfall' | 'night' | 'deep'
  | 'ansbury' | 'harbour' | 'works' | 'hearth' | 'kirk' | 'holms' | 'inn' | 'festival'
  /** The long pieces: whole movements in several parts (see Part). */
  | 'heartland' | 'wildwood' | 'highlands' | 'dawn' | 'dusk'
  /** Morrow's own long pieces. */
  | 'keys' | 'amber' | 'held'
  /** Every dungeon and delve its own: the group dungeons' long pieces, the delves' slow themes. */
  | 'oldman' | 'kettle' | 'escapement' | 'kingsbarrow'
  | 'mortlake' | 'blackcut' | 'badger' | 'culvert' | 'smugglers' | 'tinner' | 'seep' | 'glimmer' | 'gullery' | 'hob' | 'holmsey' | 'priory';
type Lead = 'flute' | 'horn' | 'choir' | 'celesta' | 'strings';

/**
 * One part of a long piece: its own progression and line, in its own key (a turn to the subdominant, a
 * lift to the relative major), quiet or with the whole orchestra in (tutti: horns doubling the line an
 * octave down, the choir holding the chords, timpani at each change, the strings swelling under it).
 * A piece's parts are played straight through, so it develops over three or four minutes instead of
 * stating a tune and stopping: a quiet opening, the theme, a development, a climax, a coda.
 */
interface Part {
  /** Semitones from the piece's own root. */
  key?: number;
  prog: Chord[];
  motif?: string;
  lead?: Lead;
  /** Bars a chord (2 if not given). */
  bars?: number;
  /** Rolling harp or celesta under it. */
  arp?: boolean;
  tutti?: boolean;
  /** Loudness against the piece's own (1). */
  dyn?: number;
}

interface Theme {
  id: ThemeId;
  /** A long piece: its parts, played through in order after the opening swell. */
  parts?: Part[];
  root: number; // MIDI of degree 0 in the pad octave
  mode: number[];
  bpm: number;
  prog: Chord[];
  /** Melodies as "degree:beats" tokens; r = rest. Degrees are relative to root + 12. */
  motifs: string[];
  lead: Lead[];
  pad: ('strings' | 'choir')[];
  vowel: 'ah' | 'oo' | 'eh';
  arp: 'harp' | 'celesta' | null;
  brightness: number;
  rest: [number, number];
  drone?: boolean;
  level: number;
}

const THEMES: Record<ThemeId, Theme> = {
  // "Everrealm": the main theme. Aeolian on D, rising from the tonic to the fifth and settling back.
  title: {
    id: 'title', root: 50, mode: MODES.aeolian, bpm: 64,
    prog: [{ deg: 0 }, { deg: 5 }, { deg: 2 }, { deg: 6 }, { deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'maj' }],
    motifs: [
      '0:2 4:3 3:1 2:2 1:2 0:4 r:2 -2:2 0:2 1:2 2:6 r:2',
      '4:2 5:3 4:1 3:2 2:2 1:4 r:2 2:2 3:2 1:2 0:6 r:2',
      '7:3 6:1 4:4 5:2 4:2 3:4 2:2 3:2 4:2 1:2 0:8',
    ],
    lead: ['horn', 'choir', 'strings'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.55, rest: [6, 10], level: 1,
  },
  // Hollindale: pastoral Mixolydian on G, flute over warm strings and harp.
  greenwake: {
    id: 'greenwake', root: 55, mode: MODES.mixolydian, bpm: 72,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 6, q: 'maj' }, { deg: 5 }, { deg: 3 }, { deg: 0, q: 'add9' }, { deg: 4, q: 'sus4' }],
    motifs: [
      '4:1 5:1 4:1 2:1 1:2 2:1 0:3 r:2 4:1 5:1 7:2 6:1 5:3 r:2',
      '4:2 2:2 1:2 0:4 r:2 -1:1 0:1 2:2 1:6 r:2',
      '2:1 4:1 5:2 4:1 2:1 4:3 r:1 5:1 7:1 8:2 7:1 5:1 4:4 r:2',
    ],
    lead: ['flute', 'flute', 'strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.5, rest: [14, 26], level: 0.9,
  },
  // Hollin Ford: same family, lighter and closer, harp-led.
  hollin: {
    id: 'hollin', root: 55, mode: MODES.ionian, bpm: 80,
    prog: [{ deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 1 }, { deg: 3, q: 'add9' }, { deg: 4 }],
    motifs: [
      '0:1 2:1 4:1 5:1 4:2 2:2 3:1 2:1 1:2 0:4 r:2',
      '4:1 5:1 7:2 5:1 4:1 2:2 3:2 1:2 2:4 r:2',
    ],
    lead: ['flute', 'celesta'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.45, rest: [16, 28], level: 0.75,
  },
  // Turnpike: stately Lydian on C, horns over full strings.
  crownroad: {
    id: 'crownroad', root: 48, mode: MODES.lydian, bpm: 66,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 0, q: 'add9' }, { deg: 4, q: 'sus4' }],
    motifs: [
      '0:2 2:2 4:4 3:2 4:2 5:4 4:2 2:2 1:4 0:6 r:2',
      '4:2 6:2 7:4 r:1 6:1 4:2 5:4 3:2 2:2 3:4 r:4',
    ],
    lead: ['horn', 'strings', 'horn'], pad: ['strings'], vowel: 'ah', arp: null, brightness: 0.6, rest: [14, 24], level: 0.95,
  },
  // Hagworm Wood: Phrygian on E, a hushed choir and celesta in the undergrowth.
  brambledeep: {
    id: 'brambledeep', root: 52, mode: MODES.phrygian, bpm: 54,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus2' }, { deg: 6 }, { deg: 3 }, { deg: 1, q: 'maj' }, { deg: 0 }],
    motifs: [
      '0:3 1:1 0:4 r:2 4:2 5:2 4:4 r:2 3:2 2:2 1:3 0:5',
      '4:2 r:1 5:1 4:2 2:2 1:6 r:4 0:2 1:2 0:8',
    ],
    lead: ['choir', 'celesta', 'flute'], pad: ['choir', 'strings'], vowel: 'oo', arp: 'celesta', brightness: 0.3, rest: [18, 32], level: 0.85,
  },
  // Fleet: Dorian on A, wide and wistful, harp arpeggios like surf.
  saltwind: {
    id: 'saltwind', root: 45, mode: MODES.dorian, bpm: 76,
    prog: [{ deg: 0 }, { deg: 3, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 2 }, { deg: 3, q: 'maj' }, { deg: 4 }, { deg: 0, q: 'sus2' }],
    motifs: [
      '0:1 1:1 2:1 4:3 5:2 4:1 2:1 1:4 r:2 2:1 4:1 5:1 7:3 6:2 5:2 4:6 r:2',
      '7:2 5:2 4:2 2:2 3:3 2:1 0:6 r:4',
    ],
    lead: ['flute', 'choir', 'strings'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.5, rest: [14, 26], level: 0.9,
  },
  // Raddle: Phrygian on D, dry and sparse; low drones and distant horn.
  redstone: {
    id: 'redstone', root: 50, mode: MODES.phrygian, bpm: 50,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 0 }, { deg: 5 }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus4' }],
    motifs: [
      '0:4 r:2 1:2 0:6 r:4 3:3 2:1 1:4 0:6 r:4',
      '4:3 3:1 1:4 r:2 0:2 1:2 -2:2 0:8',
    ],
    lead: ['horn', 'flute'], pad: ['strings'], vowel: 'oo', arp: 'harp', brightness: 0.35, rest: [20, 34], drone: true, level: 0.85,
  },
  // Scarth: Lydian on E-flat, high and vast; choir carries the line.
  starfall: {
    id: 'starfall', root: 51, mode: MODES.lydian, bpm: 50,
    prog: [{ deg: 0, q: 'add9' }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 2 }, { deg: 5 }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus2' }, { deg: 4 }],
    motifs: [
      '4:4 6:2 7:6 r:2 7:2 8:2 6:4 4:4 r:2 3:2 4:2 2:4 0:8 r:4',
      '7:4 9:2 8:2 7:6 r:2 4:2 6:2 5:8',
    ],
    lead: ['choir', 'strings', 'celesta'], pad: ['choir', 'strings'], vowel: 'ah', arp: 'celesta', brightness: 0.7, rest: [16, 30], level: 0.9,
  },
  // Night: Ionian on A-flat, celesta over very soft strings.
  night: {
    id: 'night', root: 44, mode: MODES.ionian, bpm: 54,
    prog: [{ deg: 0 }, { deg: 5 }, { deg: 3, q: 'add9' }, { deg: 4, q: 'sus4' }, { deg: 0 }, { deg: 2 }, { deg: 5 }, { deg: 3 }],
    motifs: [
      '4:2 2:1 1:1 2:4 r:2 4:2 5:1 4:1 2:4 r:2 1:2 0:6 r:4',
      '7:2 6:1 4:1 5:4 r:2 4:2 2:2 1:4 0:6 r:4',
    ],
    lead: ['celesta', 'flute'], pad: ['strings'], vowel: 'oo', arp: 'harp', brightness: 0.25, rest: [20, 36], level: 0.7,
  },
  // Ansbury: a processional in F, horns over strings and choir, for the Charter's city.
  ansbury: {
    id: 'ansbury', root: 53, mode: MODES.ionian, bpm: 70,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 4 }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 1 }, { deg: 4, q: 'sus4' }],
    motifs: [
      '0:2 2:2 4:2 5:2 4:4 2:2 3:2 4:4 r:2 7:2 6:2 4:2 5:4 4:2 2:2 0:6 r:2',
      '4:2 4:1 5:1 7:4 5:2 4:2 2:4 r:2 3:2 2:2 1:2 0:6 r:2',
    ],
    lead: ['horn', 'strings', 'horn'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.6, rest: [12, 22], level: 0.9,
  },
  // Gullmouth: a harbour air in D Dorian that wants to be danced to, flute over plucked harp.
  harbour: {
    id: 'harbour', root: 50, mode: MODES.dorian, bpm: 92,
    prog: [{ deg: 0 }, { deg: 3, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 0 }, { deg: 3, q: 'maj' }, { deg: 4 }, { deg: 0 }],
    motifs: [
      '0:1 2:1 4:1 5:1 4:1 2:1 3:2 1:2 0:2 r:2 4:1 5:1 7:2 5:1 4:1 2:4 r:2',
      '7:1 5:1 4:1 2:1 4:2 3:2 2:1 1:1 0:4 r:2',
    ],
    lead: ['flute', 'flute', 'strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.5, rest: [12, 22], level: 0.85,
  },
  // Harrowgate Works: low A minor under a drone, horns at a distance, the sound of shifts.
  works: {
    id: 'works', root: 45, mode: MODES.aeolian, bpm: 58,
    prog: [{ deg: 0, q: 'sus4' }, { deg: 5 }, { deg: 6 }, { deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'maj' }, { deg: 0 }],
    motifs: [
      '0:2 r:1 0:1 3:2 2:2 0:4 r:2 -2:2 -1:2 0:6 r:4',
      '4:3 3:1 2:2 0:2 1:4 r:2 0:8',
    ],
    lead: ['horn', 'strings'], pad: ['strings'], vowel: 'oo', arp: null, brightness: 0.3, rest: [18, 30], drone: true, level: 0.9,
  },
  // Hamlets and camps (Kelderby, Fellers' Camp, the Waystation): fireside G, flute and celesta.
  hearth: {
    id: 'hearth', root: 55, mode: MODES.ionian, bpm: 76,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'sus4' }, { deg: 0 }],
    motifs: [
      '2:1 1:1 0:2 4:2 2:2 3:4 r:2 5:1 4:1 3:2 2:2 1:2 0:6 r:2',
      '0:2 2:1 4:1 5:2 4:2 2:6 r:2',
    ],
    lead: ['flute', 'celesta'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.4, rest: [16, 28], level: 0.75,
  },
  // The Glass Kirk: a slow choir in B, celesta like light off crystal.
  kirk: {
    id: 'kirk', root: 47, mode: MODES.ionian, bpm: 46,
    prog: [{ deg: 0, q: 'add9' }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'sus4' }, { deg: 0 }, { deg: 1 }, { deg: 3 }, { deg: 0 }],
    motifs: [
      '0:4 2:2 4:6 r:2 5:2 4:2 2:4 1:4 0:8 r:4',
      '4:4 5:4 7:8 r:2 6:2 5:2 4:8',
    ],
    lead: ['choir', 'choir', 'strings'], pad: ['choir'], vowel: 'oo', arp: 'celesta', brightness: 0.55, rest: [14, 26], level: 1.6,
  },
  // The Weatherholms: high Lydian A-flat, celesta and choir with a lot of air under them.
  holms: {
    id: 'holms', root: 56, mode: MODES.lydian, bpm: 48,
    prog: [{ deg: 0, q: 'add9' }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 5 }, { deg: 2 }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus2' }, { deg: 4 }],
    motifs: [
      '7:4 8:2 9:6 r:2 7:2 6:2 4:8 r:4',
      '4:2 6:2 7:4 9:4 8:2 7:2 6:8',
    ],
    lead: ['celesta', 'choir', 'flute'], pad: ['choir', 'strings'], vowel: 'ah', arp: 'celesta', brightness: 0.8, rest: [16, 28], level: 0.85,
  },
  // Indoors in a town: an inn tune in F Mixolydian, close and easy.
  inn: {
    id: 'inn', root: 53, mode: MODES.mixolydian, bpm: 96,
    prog: [{ deg: 0 }, { deg: 6, q: 'maj' }, { deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 6, q: 'maj' }, { deg: 4 }, { deg: 0 }],
    motifs: [
      '0:1 1:1 2:1 4:1 2:1 1:1 0:2 4:1 5:1 4:1 2:1 1:4 r:2',
      '4:1 5:1 7:1 5:1 4:1 2:1 4:2 2:1 1:1 0:4 r:2',
    ],
    lead: ['flute', 'celesta', 'flute'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.45, rest: [10, 18], level: 0.7,
  },
  // A festival on the green: a jig in G, hardly stopping for breath.
  festival: {
    id: 'festival', root: 55, mode: MODES.ionian, bpm: 112,
    prog: [{ deg: 0 }, { deg: 4 }, { deg: 0 }, { deg: 4 }, { deg: 3 }, { deg: 0 }, { deg: 4 }, { deg: 0 }],
    motifs: [
      '4:1 4:1 5:1 7:1 5:1 4:1 2:2 0:1 2:1 4:1 2:1 1:2 r:1 4:1 4:1 5:1 7:1 9:1 7:1 5:2 4:1 2:1 1:1 2:1 0:3 r:1',
      '7:1 5:1 4:1 5:1 7:2 4:2 5:1 4:1 2:1 4:1 5:2 2:2 4:1 2:1 1:1 2:1 0:4 r:2',
    ],
    lead: ['flute', 'flute', 'strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.6, rest: [4, 8], level: 0.65,
  },
  // ---- The long pieces. Original themes in the manner of the great open-world scores: warm modal
  // harmony, long-breathed lines, the orchestra gathering to a climax and falling away. Each plays
  // about three to four minutes before the quiet comes back.

  // "The Charter Road": D major, for the open country of the heartland. Strings and harp, then the
  // horns take the tune into G, then everyone together, then the choir alone.
  heartland: {
    id: 'heartland', root: 50, mode: MODES.ionian, bpm: 66,
    prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'sus4' }],
    motifs: [], lead: ['flute'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.6, rest: [30, 50], level: 1,
    parts: [
      { prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'sus4' }, { deg: 0 }, { deg: 2 }, { deg: 3 }, { deg: 4 }], motif: '0:2 1:1 2:1 4:4 3:2 2:2 1:4 r:2 2:2 3:2 4:2 5:4 4:2 2:2 3:6 r:2', lead: 'flute', arp: true, dyn: 0.85 },
      { key: 5, prog: [{ deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4 }, { deg: 3, q: 'add9' }, { deg: 4, q: 'sus4' }], motif: '4:3 5:1 4:2 2:2 0:4 r:2 1:2 2:2 3:3 2:1 1:4 r:2 4:2 7:2 6:2 5:2 4:6 r:2', lead: 'horn' },
      { prog: [{ deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 4 }, { deg: 0 }], motif: '7:4 6:2 4:2 5:4 4:2 2:2 3:4 4:2 5:2 4:8 r:2 2:2 4:2 7:6 r:2', lead: 'strings', tutti: true, dyn: 0.7 },
      { prog: [{ deg: 3, q: 'add9', bars: 3 }, { deg: 0, bars: 3 }, { deg: 3, bars: 3 }, { deg: 0, q: 'sus2', bars: 4 }], motif: '4:4 2:4 1:4 0:8', lead: 'choir', dyn: 0.7 },
    ],
  },
  // "The Deep Wood": E Dorian, for Hagworm and the forests. Flute in the undergrowth, the choir in G,
  // the strings and horns rising out of it, and the celesta left alone at the end.
  wildwood: {
    id: 'wildwood', root: 52, mode: MODES.dorian, bpm: 58,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 6 }],
    motifs: [], lead: ['flute'], pad: ['strings', 'choir'], vowel: 'oo', arp: 'celesta', brightness: 0.4, rest: [30, 50], level: 0.95,
    parts: [
      { prog: [{ deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 6 }, { deg: 0 }, { deg: 2 }, { deg: 3 }, { deg: 4 }], motif: '0:2 2:2 3:3 2:1 0:4 r:2 4:2 3:2 2:2 3:2 1:6 r:2', lead: 'flute', arp: true, dyn: 0.85 },
      { key: 3, prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4 }, { deg: 0 }, { deg: 5 }, { deg: 1 }, { deg: 4, q: 'sus4' }], motif: '4:4 5:2 4:2 2:4 r:2 3:2 4:2 2:2 0:8 r:2', lead: 'choir' },
      { prog: [{ deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }, { deg: 0 }], motif: '7:3 8:1 7:2 5:2 4:4 3:2 4:2 5:4 4:2 3:2 2:4 r:2 0:4 1:2 2:2 0:8', lead: 'strings', tutti: true, dyn: 0.74 },
      { prog: [{ deg: 0, q: 'sus2', bars: 3 }, { deg: 3, bars: 3 }, { deg: 0, q: 'sus2', bars: 4 }], motif: '4:2 3:2 2:4 0:8', lead: 'celesta', arp: true, dyn: 0.6 },
    ],
  },
  // "The High Places": A minor, for the Scarth and the hard country. Horn over drums at a distance,
  // the choir in D, the whole orchestra at full stretch, then a horn alone on the wind.
  highlands: {
    id: 'highlands', root: 45, mode: MODES.aeolian, bpm: 60,
    prog: [{ deg: 0 }, { deg: 5 }, { deg: 2 }, { deg: 6 }],
    motifs: [], lead: ['horn'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.55, rest: [30, 50], drone: true, level: 1,
    parts: [
      { prog: [{ deg: 0 }, { deg: 5 }, { deg: 2 }, { deg: 6 }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }], motif: '0:2 2:2 3:4 4:2 3:2 2:4 r:2 0:2 -1:2 0:2 2:6 r:2', lead: 'horn', dyn: 0.9 },
      { key: 5, prog: [{ deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'sus4' }], motif: '4:4 3:2 2:2 3:4 1:4 r:2 2:2 3:2 4:2 5:6 r:2', lead: 'choir', arp: true },
      { prog: [{ deg: 5 }, { deg: 6 }, { deg: 0 }, { deg: 4, q: 'maj' }, { deg: 5 }, { deg: 6 }, { deg: 2 }, { deg: 4, q: 'maj' }], motif: '7:4 9:2 7:2 5:4 4:2 5:2 7:6 r:2 9:2 7:2 5:2 4:2 3:4 2:2 0:6', lead: 'strings', tutti: true, dyn: 0.62 },
      { prog: [{ deg: 0, q: 'sus4', bars: 3 }, { deg: 5, bars: 3 }, { deg: 6, bars: 3 }, { deg: 0, bars: 4 }], motif: '4:4 2:4 0:8', lead: 'horn', dyn: 0.65 },
    ],
  },
  // "First Light": G Lydian, for the early morning. The flute over a slow harp, the strings in D,
  // and a celesta going quietly back to the start.
  dawn: {
    id: 'dawn', root: 55, mode: MODES.lydian, bpm: 62,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 4 }],
    motifs: [], lead: ['flute'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.55, rest: [30, 50], level: 0.85,
    parts: [
      { prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 0, q: 'add9' }, { deg: 4, q: 'sus4' }], motif: '4:2 6:2 7:4 6:2 4:2 2:4 r:2 1:2 2:2 4:4 r:4', lead: 'flute', arp: true, dyn: 0.8 },
      { key: 7, prog: [{ deg: 0 }, { deg: 3 }, { deg: 4 }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 1 }, { deg: 4 }], motif: '0:2 2:2 4:2 5:2 4:4 2:4 r:2 3:2 4:2 2:2 1:6', lead: 'strings' },
      { prog: [{ deg: 0, q: 'add9', bars: 4 }, { deg: 1, q: 'maj', bars: 4 }, { deg: 0, bars: 4 }], motif: '7:4 6:4 4:8', lead: 'celesta', arp: true, dyn: 0.65 },
    ],
  },
  // "Evensong": B Dorian, for the end of the day. Strings carrying it, the horn answering a tone
  // lower, the choir to put it to bed.
  dusk: {
    id: 'dusk', root: 47, mode: MODES.dorian, bpm: 56,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 2 }],
    motifs: [], lead: ['strings'], pad: ['strings', 'choir'], vowel: 'oo', arp: 'harp', brightness: 0.4, rest: [30, 50], level: 0.85,
    parts: [
      { prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 2 }, { deg: 0 }, { deg: 3 }, { deg: 4 }, { deg: 0 }], motif: '2:2 3:2 4:4 3:2 2:2 0:4 r:2 -1:2 0:2 2:2 1:6 r:2', lead: 'strings', arp: true, dyn: 0.85 },
      { key: -2, prog: [{ deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4, q: 'sus4' }, { deg: 5 }, { deg: 3 }, { deg: 4 }, { deg: 0 }], motif: '4:4 5:2 4:2 3:4 2:4 r:2 1:2 2:2 0:8', lead: 'horn' },
      { prog: [{ deg: 0, q: 'sus2', bars: 4 }, { deg: 3, bars: 4 }, { deg: 0, bars: 4 }], motif: '4:4 2:4 0:8', lead: 'choir', dyn: 0.7 },
    ],
  },
  // Underground: no tune at all, just held low voices and the odd pluck.
  deep: {
    id: 'deep', root: 48, mode: MODES.phrygian, bpm: 40,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus4' }, { deg: 6 }],
    motifs: [],
    lead: [], pad: ['choir'], vowel: 'oo', arp: 'harp', brightness: 0.2, rest: [12, 24], drone: true, level: 1.25,
  },

  // ---- Morrow's long pieces: warmer, older, further from home.

  // "Salt and Sun": A Mixolydian, for the Keys and the Bright. Flute and harp over the islands, the
  // strings taking it up a fourth, everyone in, and the harp left with the sea.
  keys: {
    id: 'keys', root: 57, mode: MODES.mixolydian, bpm: 70,
    prog: [{ deg: 0 }, { deg: 6, q: 'maj' }, { deg: 3 }, { deg: 0 }],
    motifs: [], lead: ['flute'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.62, rest: [30, 50], level: 0.9,
    parts: [
      { prog: [{ deg: 0 }, { deg: 6, q: 'maj' }, { deg: 3 }, { deg: 0 }, { deg: 4, q: 'min' }, { deg: 3 }, { deg: 6, q: 'maj' }, { deg: 0, q: 'sus4' }], motif: '4:1 5:1 7:2 5:2 4:2 2:4 r:2 4:1 2:1 0:2 1:2 2:6 r:2', lead: 'flute', arp: true, dyn: 0.85 },
      { key: 5, prog: [{ deg: 0 }, { deg: 3 }, { deg: 4, q: 'min' }, { deg: 6, q: 'maj' }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'sus4' }], motif: '2:2 4:2 5:3 4:1 2:2 0:4 r:2 5:2 7:2 6:2 4:6 r:2', lead: 'strings' },
      { prog: [{ deg: 3 }, { deg: 6, q: 'maj' }, { deg: 0 }, { deg: 4, q: 'min' }, { deg: 3 }, { deg: 6, q: 'maj' }, { deg: 4 }, { deg: 0 }], motif: '7:3 9:1 7:2 5:2 4:4 5:2 7:2 9:4 7:2 6:2 4:8', lead: 'horn', tutti: true, dyn: 0.72 },
      { prog: [{ deg: 0, q: 'add9', bars: 3 }, { deg: 6, q: 'maj', bars: 3 }, { deg: 0, q: 'sus2', bars: 4 }], motif: '4:4 2:4 0:8', lead: 'celesta', arp: true, dyn: 0.6 },
    ],
  },
  // "The Amber Light": E Lydian, for the Amberwold and the Glades. The celesta among old trees, a flute
  // answering it in B, the strings rising, and the choir alone at the end.
  amber: {
    id: 'amber', root: 52, mode: MODES.lydian, bpm: 58,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 5 }, { deg: 4 }],
    motifs: [], lead: ['celesta'], pad: ['strings', 'choir'], vowel: 'oo', arp: 'celesta', brightness: 0.5, rest: [30, 50], level: 0.9,
    parts: [
      { prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 5 }, { deg: 4 }, { deg: 0, q: 'add9' }, { deg: 1, q: 'maj' }, { deg: 2 }, { deg: 4, q: 'sus4' }], motif: '0:2 3:2 4:4 6:2 4:2 2:4 r:2 3:2 4:2 1:2 2:6 r:2', lead: 'celesta', arp: true, dyn: 0.8 },
      { key: 7, prog: [{ deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4 }, { deg: 0 }, { deg: 1, q: 'maj' }, { deg: 3 }, { deg: 4 }], motif: '4:3 3:1 4:2 6:2 7:4 r:2 6:2 4:2 3:2 4:6 r:2', lead: 'flute' },
      { prog: [{ deg: 5 }, { deg: 4 }, { deg: 0 }, { deg: 1, q: 'maj' }, { deg: 5 }, { deg: 2 }, { deg: 4 }, { deg: 0 }], motif: '7:4 8:2 7:2 6:4 4:2 6:2 7:6 r:2 4:2 6:2 4:2 3:2 2:4 0:6', lead: 'strings', tutti: true, dyn: 0.7 },
      { prog: [{ deg: 0, q: 'sus2', bars: 4 }, { deg: 1, q: 'maj', bars: 4 }, { deg: 0, bars: 4 }], motif: '6:4 4:4 0:8', lead: 'choir', dyn: 0.62 },
    ],
  },
  // "The Long Barrows": C minor, for the Held, the Sunder and the Greywaste. A horn far off over a
  // drone, the choir in F, the whole orchestra heavy and slow, and the horn again, nearer.
  held: {
    id: 'held', root: 48, mode: MODES.aeolian, bpm: 52,
    prog: [{ deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'maj' }],
    motifs: [], lead: ['horn'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.4, rest: [30, 50], drone: true, level: 1,
    parts: [
      { prog: [{ deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'sus4' }], motif: '0:4 2:2 3:2 4:4 3:2 2:2 0:6 r:2 -2:2 -1:2 0:8 r:2', lead: 'horn', dyn: 0.85 },
      { key: 5, prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 3 }, { deg: 4, q: 'maj' }], motif: '4:4 5:2 4:2 3:4 2:4 r:2 3:2 2:2 0:2 2:6 r:2', lead: 'choir', arp: true },
      { prog: [{ deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4, q: 'maj' }, { deg: 5 }, { deg: 6 }, { deg: 4, q: 'maj' }, { deg: 0 }], motif: '7:4 8:2 7:2 5:4 3:2 4:2 5:6 r:2 7:2 5:2 4:2 3:2 2:4 0:8', lead: 'strings', tutti: true, dyn: 0.66 },
      { prog: [{ deg: 0, q: 'sus4', bars: 3 }, { deg: 6, bars: 3 }, { deg: 0, bars: 4 }], motif: '4:4 3:4 0:8', lead: 'horn', dyn: 0.62 },
    ],
  },

  // ---- The group dungeons: each a long piece of its own, for the hour or so a run takes.

  // "The Old Man's Workings": C Dorian, slow. A horn down the drift, the strings coming in under it in
  // F, the orchestra heavy as rock, and a celesta dripping like water at the end.
  oldman: {
    id: 'oldman', root: 48, mode: MODES.dorian, bpm: 50,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 0 }],
    motifs: [], lead: ['horn'], pad: ['strings', 'choir'], vowel: 'oo', arp: 'harp', brightness: 0.3, rest: [20, 34], drone: true, level: 1.1,
    parts: [
      { prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 0 }, { deg: 2 }, { deg: 3 }, { deg: 4 }, { deg: 0, q: 'sus4' }], motif: '0:3 2:1 3:4 2:2 0:2 -2:4 r:2 0:2 3:2 5:2 3:6 r:2', lead: 'horn', dyn: 0.8 },
      { key: 5, prog: [{ deg: 0 }, { deg: 6 }, { deg: 3 }, { deg: 4 }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'sus4' }], motif: '4:4 3:2 2:2 0:4 r:2 2:2 3:2 4:2 5:6 r:2', lead: 'strings', arp: true },
      { prog: [{ deg: 3 }, { deg: 0 }, { deg: 6 }, { deg: 4, q: 'maj' }, { deg: 3 }, { deg: 0 }, { deg: 4, q: 'maj' }, { deg: 0 }], motif: '7:4 5:2 4:2 3:4 4:2 5:2 7:6 r:2 5:2 4:2 3:2 2:2 0:8', lead: 'strings', tutti: true, dyn: 0.62 },
      { prog: [{ deg: 0, q: 'sus2', bars: 4 }, { deg: 6, bars: 4 }, { deg: 0, bars: 4 }], motif: '4:2 r:2 3:2 r:2 2:4 0:8', lead: 'celesta', arp: true, dyn: 0.55 },
    ],
  },
  // "Under the Kettle": F sharp minor, glass and cold. The celesta in the ice, the choir in B, the
  // strings rising toward the light below, and the choir alone again.
  kettle: {
    id: 'kettle', root: 54, mode: MODES.aeolian, bpm: 46,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 5 }, { deg: 2 }, { deg: 6 }],
    motifs: [], lead: ['celesta'], pad: ['choir', 'strings'], vowel: 'oo', arp: 'celesta', brightness: 0.45, rest: [20, 34], level: 1.05,
    parts: [
      { prog: [{ deg: 0, q: 'sus2' }, { deg: 5 }, { deg: 2 }, { deg: 6 }, { deg: 0 }, { deg: 3 }, { deg: 5 }, { deg: 4, q: 'sus4' }], motif: '7:2 4:2 2:2 4:2 0:4 r:2 7:2 9:2 7:2 4:6 r:2', lead: 'celesta', arp: true, dyn: 0.8 },
      { key: 5, prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'sus4' }], motif: '4:4 2:2 4:2 5:4 4:4 r:2 2:2 1:2 0:8', lead: 'choir' },
      { prog: [{ deg: 5 }, { deg: 6 }, { deg: 2 }, { deg: 4, q: 'maj' }, { deg: 5 }, { deg: 6 }, { deg: 0 }, { deg: 4, q: 'maj' }], motif: '4:2 5:2 7:4 9:2 7:2 5:4 4:4 r:2 7:2 9:2 11:4 9:2 7:2 4:8', lead: 'strings', tutti: true, dyn: 0.6 },
      { prog: [{ deg: 0, q: 'sus2', bars: 4 }, { deg: 5, bars: 4 }, { deg: 0, q: 'sus2', bars: 4 }], motif: '7:4 4:4 0:8', lead: 'choir', dyn: 0.55 },
    ],
  },
  // "The Escapement": G Phrygian, quicker, like a mechanism. The harp ticking, a horn over the wheels
  // in C, the whole orchestra driving, then the harp winding down.
  escapement: {
    id: 'escapement', root: 43, mode: MODES.phrygian, bpm: 64,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 6 }],
    motifs: [], lead: ['strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.45, rest: [20, 34], drone: true, level: 1.05,
    parts: [
      { prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 0 }, { deg: 1, q: 'maj' }, { deg: 3 }, { deg: 4 }], motif: '0:1 1:1 0:1 1:1 3:2 1:2 0:4 r:2 0:1 1:1 3:1 4:1 5:4 r:2', lead: 'strings', arp: true, dyn: 0.8 },
      { key: 5, prog: [{ deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 3 }, { deg: 4 }, { deg: 1, q: 'maj' }], motif: '4:2 5:2 4:2 3:2 1:4 0:4 r:2 3:2 4:2 5:2 7:6 r:2', lead: 'horn', arp: true },
      { prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 5 }, { deg: 6 }, { deg: 0 }, { deg: 1, q: 'maj' }, { deg: 4 }, { deg: 0 }], motif: '7:2 8:2 7:2 5:2 4:2 5:2 7:4 r:2 8:2 7:2 5:2 4:2 1:2 0:8', lead: 'strings', tutti: true, dyn: 0.66 },
      { prog: [{ deg: 0, bars: 3 }, { deg: 1, q: 'maj', bars: 3 }, { deg: 0, q: 'sus4', bars: 4 }], motif: '4:2 3:2 1:2 0:10', lead: 'celesta', arp: true, dyn: 0.55 },
    ],
  },
  // "Kingsbarrow": D minor, the grandest of them. The choir in the hall of the kneeling dead, a horn
  // answering in G, the whole orchestra for the old king, and the choir putting him back to sleep.
  kingsbarrow: {
    id: 'kingsbarrow', root: 50, mode: MODES.aeolian, bpm: 44,
    prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }],
    motifs: [], lead: ['choir'], pad: ['choir', 'strings'], vowel: 'ah', arp: 'harp', brightness: 0.35, rest: [20, 34], drone: true, level: 1.1,
    parts: [
      { prog: [{ deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'sus4' }], motif: '0:4 1:2 2:2 3:4 2:4 r:2 0:2 -1:2 0:8 r:2', lead: 'choir', dyn: 0.85 },
      { key: 5, prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 4, q: 'maj' }, { deg: 0 }, { deg: 5 }, { deg: 3 }, { deg: 4, q: 'maj' }], motif: '4:4 5:2 4:2 2:4 0:4 r:2 2:2 3:2 4:2 7:6 r:2', lead: 'horn', arp: true },
      { prog: [{ deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4, q: 'maj' }, { deg: 5 }, { deg: 6 }, { deg: 2 }, { deg: 4, q: 'maj' }], motif: '7:4 9:2 7:2 5:4 4:2 5:2 7:8 r:2 9:2 7:2 5:2 4:2 2:4 0:8', lead: 'strings', tutti: true, dyn: 0.64 },
      { prog: [{ deg: 0, q: 'sus4', bars: 4 }, { deg: 5, bars: 4 }, { deg: 0, bars: 4 }], motif: '4:4 2:4 0:8', lead: 'choir', dyn: 0.55 },
    ],
  },

  // ---- The delves and public dungeons: each a slow theme of its own, quiet between statements.

  // Mortlake Cellars: D Dorian, damp vaults. Strings low, the choir under them, a celesta dripping.
  mortlake: {
    id: 'mortlake', root: 50, mode: MODES.dorian, bpm: 46,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 0 }, { deg: 6 }],
    motifs: ['0:3 2:1 3:4 2:2 0:6 r:2', '4:2 3:2 2:2 0:2 -1:4 0:6 r:2'],
    lead: ['strings', 'celesta'], pad: ['choir'], vowel: 'oo', arp: 'celesta', brightness: 0.25, rest: [14, 26], drone: true, level: 1.15,
  },
  // The Black Cut: C minor, a working pit. A horn down the shaft over a drone, the harp like a pick.
  blackcut: {
    id: 'blackcut', root: 48, mode: MODES.aeolian, bpm: 50,
    prog: [{ deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, q: 'maj' }],
    motifs: ['0:2 2:2 3:4 2:2 0:2 -2:4 r:2', '3:2 4:2 5:2 4:2 3:4 2:2 0:6 r:2'],
    lead: ['horn', 'strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.25, rest: [14, 26], drone: true, level: 1.15,
  },
  // Badger Holt: G Dorian, earthy and close. A flute among roots, the harp warm under it.
  badger: {
    id: 'badger', root: 55, mode: MODES.dorian, bpm: 54,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 4 }, { deg: 0 }],
    motifs: ['0:1 2:1 3:2 4:2 3:1 2:1 0:4 r:2', '4:2 5:2 4:2 2:2 3:4 r:2'],
    lead: ['flute'], pad: ['strings'], vowel: 'oo', arp: 'harp', brightness: 0.35, rest: [14, 26], level: 1,
  },
  // Withy Culvert: E Phrygian, cold stone and running water. The celesta alone over the choir.
  culvert: {
    id: 'culvert', root: 52, mode: MODES.phrygian, bpm: 44,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 6 }],
    motifs: ['7:2 5:2 4:2 1:2 0:6 r:2', '4:1 5:1 7:2 8:2 7:4 r:2'],
    lead: ['celesta'], pad: ['choir'], vowel: 'oo', arp: 'celesta', brightness: 0.3, rest: [14, 26], drone: true, level: 1.1,
  },
  // Smugglers' Hole: A minor, a sea cave. The strings in a slow tune that wants to be a song.
  smugglers: {
    id: 'smugglers', root: 57, mode: MODES.aeolian, bpm: 56,
    prog: [{ deg: 0 }, { deg: 6 }, { deg: 2 }, { deg: 4, q: 'maj' }],
    motifs: ['0:2 2:1 3:1 4:2 3:2 2:2 0:4 r:2', '4:2 5:2 4:1 2:1 0:2 -1:2 0:6 r:2'],
    lead: ['strings', 'flute'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.35, rest: [14, 26], level: 1,
  },
  // Tinner's Adit: B flat Mixolydian, the tinners' old hymn underground. Horn and choir.
  tinner: {
    id: 'tinner', root: 46, mode: MODES.mixolydian, bpm: 48,
    prog: [{ deg: 0 }, { deg: 6, q: 'maj' }, { deg: 3 }, { deg: 0 }],
    motifs: ['0:2 2:2 4:4 3:2 2:2 0:6 r:2', '4:2 6:2 4:2 2:2 3:4 2:4 r:2'],
    lead: ['horn', 'choir'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.3, rest: [14, 26], drone: true, level: 1.1,
  },
  // The Cold Seep: F sharp Lydian, glass grown in the dark. Celesta and choir, high and still.
  seep: {
    id: 'seep', root: 54, mode: MODES.lydian, bpm: 42,
    prog: [{ deg: 0, q: 'add9' }, { deg: 1, q: 'maj' }, { deg: 0 }, { deg: 4 }],
    motifs: ['7:2 6:2 4:4 3:2 4:6 r:2', '4:2 6:2 7:2 9:4 7:4 r:2'],
    lead: ['celesta'], pad: ['choir'], vowel: 'eh', arp: 'celesta', brightness: 0.5, rest: [14, 26], level: 1.05,
  },
  // The Glimmer: C sharp minor, the frozen dark under the Sickle. Choir and a far-off celesta.
  glimmer: {
    id: 'glimmer', root: 49, mode: MODES.aeolian, bpm: 40,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 5 }, { deg: 0 }, { deg: 3 }],
    motifs: ['4:4 2:2 0:2 -1:6 r:2', '7:2 5:2 4:4 2:6 r:2'],
    lead: ['choir', 'celesta'], pad: ['choir'], vowel: 'oo', arp: 'celesta', brightness: 0.35, rest: [14, 26], drone: true, level: 1.1,
  },
  // The Gullery: B Phrygian, wings in the dark. Strings in short phrases, the harp fluttering.
  gullery: {
    id: 'gullery', root: 47, mode: MODES.phrygian, bpm: 50,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 6 }, { deg: 0 }],
    motifs: ['0:1 1:1 0:2 r:1 3:1 1:1 0:4 r:2', '4:2 3:1 1:1 0:4 r:2'],
    lead: ['strings'], pad: ['strings'], vowel: 'ah', arp: 'harp', brightness: 0.3, rest: [14, 26], drone: true, level: 1.1,
  },
  // Hob's Barrow: D Phrygian, very old and very low. The choir holding, almost no tune at all.
  hob: {
    id: 'hob', root: 38, mode: MODES.phrygian, bpm: 38,
    prog: [{ deg: 0 }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus4' }, { deg: 6 }],
    motifs: ['0:4 1:4 0:8 r:4', '3:4 1:4 0:8 r:4'],
    lead: ['choir'], pad: ['choir'], vowel: 'oo', arp: null, brightness: 0.18, rest: [14, 26], drone: true, level: 1.25,
  },
  // Holmsey: A Dorian, the drowned church. The choir singing what it used to.
  holmsey: {
    id: 'holmsey', root: 45, mode: MODES.dorian, bpm: 44,
    prog: [{ deg: 0 }, { deg: 3 }, { deg: 6 }, { deg: 0 }],
    motifs: ['0:2 2:2 3:2 4:4 3:2 2:2 0:6 r:2', '4:2 5:2 4:2 3:2 2:4 0:6 r:2'],
    lead: ['choir'], pad: ['strings', 'choir'], vowel: 'ah', arp: 'harp', brightness: 0.3, rest: [14, 26], level: 1.05,
  },
  // The Undercroft at Corra Priory: E minor, plainchant under the grey. A single line, then the choir.
  priory: {
    id: 'priory', root: 52, mode: MODES.aeolian, bpm: 42,
    prog: [{ deg: 0, q: 'sus4' }, { deg: 6 }, { deg: 0 }, { deg: 3 }],
    motifs: ['0:2 2:2 3:2 2:2 3:2 4:4 3:2 2:2 0:6 r:2', '4:2 3:2 2:4 0:2 -1:2 0:8 r:2'],
    lead: ['choir', 'strings'], pad: ['choir'], vowel: 'ah', arp: null, brightness: 0.25, rest: [14, 26], drone: true, level: 1.15,
  },
};

const QUAL: Record<Quality, number[]> = { maj: [0, 4, 7], min: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14] };

function degToMidi(t: Theme, deg: number, octave = 0): number {
  const o = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return t.root + (o + octave) * 12 + t.mode[i];
}

function chordNotes(t: Theme, c: Chord): number[] {
  const root = degToMidi(t, c.deg);
  if (c.q) {
    // Keep add9 in the mode's colour when the theme is minor-ish
    const q = c.q === 'add9' && t.mode[2] === 3 ? [0, 3, 7, 14] : QUAL[c.q];
    return q.map((s) => root + s);
  }
  return [0, 2, 4].map((k) => degToMidi(t, c.deg + k));
}

/** Close voicing around the pad register, low root for the basses. */
function voice(notes: number[], center: number): number[] {
  return notes.map((n) => {
    let m = n;
    while (m < center - 5) m += 12;
    while (m > center + 9) m -= 12;
    return m;
  }).sort((a, b) => a - b);
}

function parseMotif(s: string): { deg: number | null; beats: number }[] {
  return s.split(/\s+/).filter(Boolean).map((tok) => {
    const [d, b] = tok.split(':');
    return { deg: d === 'r' ? null : Number(d), beats: Number(b) };
  });
}

export interface MusicContext {
  theme: ThemeId;
  combat: boolean;
  /** The fight is against something big (an elite, a story boss, a world boss): the heavier layer. */
  boss?: boolean;
}

/** Short cues over whatever is playing. */
export type Sting = 'discover' | 'chapter' | 'victory';

type Section = 'swell' | 'statement' | 'interlude' | 'rest';

export class Score {
  readonly orch: Orchestra;
  private out: GainNode;
  private explore: GainNode;
  private combatBus: GainNode;
  private current: { theme: Theme; bus: GainNode; cursor: number; step: number; motifIx: number } | null = null;
  private combatCursor = 0;
  private combatOn = false;
  private combatBar = 0;
  private rnd = createSeededRandom(2026);
  private wanted: MusicContext = { theme: 'title', combat: false };
  enabled = true;
  private realtime: boolean;

  constructor(readonly ctx: BaseAudioContext, destination: AudioNode) {
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(destination);
    this.orch = new Orchestra(ctx, this.out);
    this.explore = ctx.createGain();
    this.explore.connect(this.orch.input);
    this.combatBus = ctx.createGain();
    this.combatBus.gain.value = 0;
    this.combatBus.connect(this.orch.input);
    this.realtime = !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);
  }

  setContext(c: MusicContext): void {
    this.wanted = c;
  }

  /** Schedule music up to `until` (seconds on the context clock). Call often in real time, once offline. */
  advance(until: number): void {
    const now = this.ctx.currentTime;
    const want = THEMES[this.wanted.theme];
    if (!this.current || this.current.theme.id !== want.id) this.switchTheme(want, now);
    const cur = this.current!;
    while (cur.cursor < until) cur.cursor = this.scheduleSection(cur, cur.cursor);

    // Combat layer: duck the exploration music and run an ostinato in two-bar chunks.
    if (this.wanted.combat !== this.combatOn) {
      this.combatOn = this.wanted.combat;
      const g = this.combatBus.gain, e = this.explore.gain;
      g.cancelScheduledValues(now); e.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now); e.setValueAtTime(e.value, now);
      if (this.combatOn) {
        g.linearRampToValueAtTime(1, now + 1.2);
        e.linearRampToValueAtTime(0.18, now + 1.5);
        this.combatCursor = Math.max(this.combatCursor, now + 0.1);
        this.orch.swell(now, 1.0, 0.05, this.combatBus);
      } else {
        g.linearRampToValueAtTime(0, now + 4);
        e.linearRampToValueAtTime(1, now + 5);
      }
    }
    if (this.combatOn) {
      const horizon = this.realtime ? Math.min(until, now + 3) : until;
      while (this.combatCursor < horizon) this.combatCursor = this.wanted.boss ? this.scheduleBoss(this.combatCursor) : this.scheduleCombat(this.combatCursor);
    }
  }

  /**
   * A cue over the music: the exploration bus ducks for a few seconds while it plays. Discovering a
   * place: a rising harp and a bright chord. A chapter: a horn call. A victory: a fanfare over timpani.
   */
  sting(kind: Sting): void {
    const now = this.ctx.currentTime + 0.05;
    const e = this.explore.gain;
    e.cancelScheduledValues(now); e.setValueAtTime(e.value, now);
    e.linearRampToValueAtTime(0.3, now + 0.3); e.linearRampToValueAtTime(this.combatOn ? 0.18 : 1, now + 5);
    const bus = this.out;
    if (kind === 'discover') {
      [62, 66, 69, 74, 78].forEach((m, i) => this.orch.harp(now + i * 0.11, m, 0.22, bus));
      this.orch.strings(now + 0.45, [62, 66, 69, 73], 3.2, 0.12, bus, { attack: 0.6, release: 2.4, bright: 0.75 });
      this.orch.celesta(now + 0.55, 86, 0.1, bus);
    } else if (kind === 'chapter') {
      const call: [number, number][] = [[57, 0.5], [62, 0.5], [66, 0.5], [69, 1.6]];
      let t = now;
      for (const [m, d] of call) { this.orch.horn(t, m, d * 0.95, 0.22, bus); t += d; }
      this.orch.strings(now + 1.4, [50, 57, 62, 66], 3.4, 0.13, bus, { attack: 0.5, release: 2.6, bright: 0.65 });
      this.orch.choir(now + 1.5, [62, 66, 69], 3, 0.09, bus, 'ah', 0.6);
    } else {
      this.orch.timpani(now, 38, 0.36, bus);
      this.orch.timpani(now + 0.3, 38, 0.26, bus);
      const fan: [number, number][] = [[62, 0.25], [62, 0.25], [62, 0.25], [66, 0.75], [69, 1.8]];
      let t = now + 0.6;
      for (const [m, d] of fan) { this.orch.horn(t, m, d * 0.9, 0.24, bus); this.orch.horn(t, m - 12, d * 0.9, 0.14, bus); t += d; }
      this.orch.strings(t - 1.8, [50, 57, 62, 66, 69], 3, 0.14, bus, { attack: 0.3, release: 2.4, bright: 0.8 });
      this.orch.timpani(t - 1.8, 38, 0.32, bus);
    }
  }

  private switchTheme(theme: Theme, now: number): void {
    if (this.current) {
      const old = this.current.bus;
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0, now + 5);
      setTimeout(() => old.disconnect(), 45000);
    }
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(theme.level, now + 4);
    bus.connect(this.explore);
    this.current = { theme, bus, cursor: now + (this.current ? 2.5 : 0.3), step: 0, motifIx: 0 };
  }

  private scheduleSection(cur: { theme: Theme; bus: GainNode; cursor: number; step: number; motifIx: number }, start: number): number {
    const t = cur.theme;
    const beat = 60 / t.bpm;
    const bar = beat * 4;
    // A long piece: the swell, its parts in order, then a long quiet
    if (t.parts) {
      const n = t.parts.length, k = cur.step % (n + 2);
      cur.step++;
      if (k === n + 1) { const [a, b] = t.rest; const len = a + this.rnd() * (b - a); if (t.drone) this.orch.bass(start + 1, degToMidi(t, 0, -1), len - 2, 0.03, cur.bus, 3); return start + len; }
      if (k > 0) return this.schedulePart(cur, start, t.parts[k - 1]);
    }
    // Section order: swell, statement, interlude, rest, statement, rest ...
    const order: Section[] = t.motifs.length ? ['swell', 'statement', 'interlude', 'rest', 'statement', 'rest'] : ['swell', 'interlude', 'rest'];
    const sec = order[cur.step % order.length];
    cur.step++;
    if (sec === 'rest') {
      const [a, b] = t.rest;
      const len = a + this.rnd() * (b - a);
      if (t.drone) this.orch.bass(start + 1, degToMidi(t, 0, -1), len - 2, 0.035, cur.bus, 3);
      return start + len;
    }
    const chords = sec === 'swell' ? t.prog.slice(0, 4) : t.prog;
    const barsPer = sec === 'swell' ? 2 : 2;
    let time = start;
    let prev = t.root + 12;
    for (const c of chords) {
      const len = bar * (c.bars ?? barsPer);
      const notes = voice(chordNotes(t, c), prev);
      prev = notes[1] ?? prev;
      const padVel = sec === 'swell' ? 0.1 : 0.13;
      if (t.pad.includes('strings')) this.orch.strings(time, notes, len, padVel, cur.bus, { attack: Math.min(2.2, len * 0.4), release: 2.6, bright: t.brightness });
      if (t.pad.includes('choir') && (sec !== 'statement' || this.rnd() < 0.5)) this.orch.choir(time, notes.slice(0, 3).map((n) => n + (t.root < 48 ? 12 : 0)), len - 1, 0.075, cur.bus, t.vowel, 2.4);
      this.orch.bass(time, degToMidi(t, c.deg, -1), len, 0.045, cur.bus);
      if (sec === 'interlude' && t.arp) {
        // Rolling arpeggio across the chord, two octaves
        const arpNotes = [...notes, ...notes.map((n) => n + 12)];
        const step = beat / (t.bpm > 65 ? 2 : 1);
        let i = 0;
        for (let k = time; k < time + len - step * 0.5; k += step, i++) {
          const n = arpNotes[i % arpNotes.length] + 12;
          if (t.arp === 'harp') this.orch.harp(k, n, 0.2, cur.bus);
          else this.orch.celesta(k, n + 12, 0.07, cur.bus);
        }
      }
      time += len;
    }
    if (sec === 'statement' && t.motifs.length) {
      // The tune enters a bar in, over the progression
      const motif = parseMotif(t.motifs[cur.motifIx % t.motifs.length]);
      const lead = t.lead[cur.motifIx % t.lead.length];
      cur.motifIx++;
      let m = start + bar;
      const shift = cur.motifIx > t.motifs.length && this.rnd() < 0.4 ? 2 : 0; // later statements sometimes rise a third
      for (const n of motif) {
        const d = n.beats * beat;
        if (n.deg !== null && m + d < time) {
          const midi = degToMidi(t, n.deg + shift, 1);
          switch (lead) {
            case 'flute': this.orch.flute(m, midi + 12, d * 0.95, 0.22, cur.bus); break;
            case 'horn': this.orch.horn(m, midi, d * 0.98, 0.2, cur.bus); break;
            case 'choir': this.orch.choir(m, [midi + 12], d * 0.9, 0.2, cur.bus, t.vowel, Math.min(0.6, d * 0.3)); break;
            case 'celesta': this.orch.celesta(m, midi + 12, 0.16, cur.bus); break;
            case 'strings': this.orch.strings(m, [midi + 12], d, 0.17, cur.bus, { attack: Math.min(0.5, d * 0.3), release: 1.4, bright: t.brightness + 0.15 }); break;
          }
          // Harp doubles the first beat of long notes for definition
          if (n.beats >= 3 && t.arp === 'harp') this.orch.harp(m, midi + 12, 0.11, cur.bus);
        }
        m += d;
      }
    }
    return time + bar * 0.5;
  }

  /** A part of a long piece: its chords under it, its line over it, the orchestra gathered if it's the climax. */
  private schedulePart(cur: { theme: Theme; bus: GainNode }, start: number, p: Part): number {
    const t: Theme = { ...cur.theme, root: cur.theme.root + (p.key ?? 0) };
    const beat = 60 / t.bpm, bar = beat * 4, dyn = p.dyn ?? 1, bus = cur.bus;
    let time = start, prev = t.root + 12;
    for (const c of p.prog) {
      const len = bar * (c.bars ?? p.bars ?? 2);
      const notes = voice(chordNotes(t, c), prev);
      prev = notes[1] ?? prev;
      this.orch.strings(time, notes, len, (p.tutti ? 0.15 : 0.12) * dyn, bus, { attack: Math.min(2.2, len * 0.4), release: 2.8, bright: t.brightness + (p.tutti ? 0.15 : 0) });
      if (t.pad.includes('choir') || p.tutti) this.orch.choir(time, notes.slice(0, 3).map((n) => n + (t.root < 48 ? 12 : 0)), len - 0.8, (p.tutti ? 0.1 : 0.065) * dyn, bus, t.vowel, 2.2);
      this.orch.bass(time, degToMidi(t, c.deg, -1), len, 0.05 * dyn, bus);
      if (p.tutti) {
        // Timpani at the change, the horns holding the root and fifth under the line
        this.orch.timpani(time, degToMidi(t, c.deg, -2), 0.18 * dyn, bus);
        this.orch.horn(time, degToMidi(t, c.deg, 0), len * 0.95, 0.07 * dyn, bus);
        this.orch.horn(time, degToMidi(t, c.deg + 4, 0), len * 0.95, 0.05 * dyn, bus);
      }
      if (p.arp && t.arp) {
        const arpNotes = [...notes, ...notes.map((n) => n + 12)];
        const step = beat / (t.bpm > 65 ? 2 : 1);
        let i = 0;
        for (let k = time; k < time + len - step * 0.5; k += step, i++) {
          const n = arpNotes[i % arpNotes.length] + 12;
          if (t.arp === 'harp') this.orch.harp(k, n, 0.18 * dyn, bus); else this.orch.celesta(k, n + 12, 0.065 * dyn, bus);
        }
      }
      time += len;
    }
    // (a cymbal swell into the climax)
    if (p.tutti) this.orch.swell(Math.max(0, start - bar), bar, 0.05 * dyn, bus);
    if (p.motif) {
      // The line enters a bar in; in the climax the horns double it an octave down
      let m = start + bar;
      const lead = p.lead ?? t.lead[0];
      for (const n of parseMotif(p.motif)) {
        const d = n.beats * beat;
        if (n.deg !== null && m + d < time) {
          const midi = degToMidi(t, n.deg, 1);
          switch (lead) {
            case 'flute': this.orch.flute(m, midi + 12, d * 0.95, 0.22 * dyn, bus); break;
            case 'horn': this.orch.horn(m, midi, d * 0.98, 0.21 * dyn, bus); break;
            case 'choir': this.orch.choir(m, [midi + 12], d * 0.9, 0.2 * dyn, bus, t.vowel, Math.min(0.6, d * 0.3)); break;
            case 'celesta': this.orch.celesta(m, midi + 12, 0.16 * dyn, bus); break;
            case 'strings': this.orch.strings(m, [midi + 12], d, 0.18 * dyn, bus, { attack: Math.min(0.5, d * 0.3), release: 1.4, bright: t.brightness + 0.2 }); break;
          }
          if (p.tutti) this.orch.horn(m, midi, d * 0.95, 0.09 * dyn, bus);
          if (n.beats >= 3 && t.arp === 'harp') this.orch.harp(m, midi + 12, 0.1 * dyn, bus);
        }
        m += d;
      }
    }
    return time + bar * 0.5;
  }

  /** Against something big: A minor, 144 bpm, choir hits and timpani on every bar. */
  private scheduleBoss(start: number): number {
    const bpm = 144, beat = 60 / bpm, bar = beat * 4;
    const roots = [45, 41, 43, 40]; // A, F, G, E
    const r = roots[this.combatBar % roots.length];
    const fig = [0, 0, 7, 0, 3, 0, 7, 5];
    for (let b = 0; b < 2; b++) {
      const t0 = start + b * bar;
      for (let i = 0; i < 8; i++) {
        this.orch.spiccato(t0 + i * beat * 0.5, r - 12 + fig[i], i % 2 === 0 ? 0.26 : 0.17, this.combatBus);
        this.orch.spiccato(t0 + i * beat * 0.5, r + fig[i], i % 4 === 0 ? 0.14 : 0.09, this.combatBus);
        if (i % 2 === 0) this.orch.taiko(t0 + i * beat * 0.5, i === 0 ? 0.55 : 0.28, this.combatBus);
      }
      this.orch.timpani(t0, r - 24, 0.36, this.combatBus);
      this.orch.timpani(t0 + beat * 2.5, r - 24, 0.22, this.combatBus);
    }
    // A choir stab and the horns every phrase, a step higher each time round
    this.orch.choir(start, [r + 12, r + 15, r + 19], beat * 3, 0.16, this.combatBus, 'ah', 0.08);
    this.orch.horn(start + beat * 4, r + 7, beat * 2, 0.22, this.combatBus);
    this.orch.horn(start + beat * 6, r + 12, beat * 2, 0.2, this.combatBus);
    this.orch.strings(start, [r, r + 3, r + 7, r + 12], bar * 2, 0.14, this.combatBus, { attack: 0.2, release: 0.8, bright: 0.8 });
    this.combatBar++;
    return start + bar * 2;
  }

  private scheduleCombat(start: number): number {
    // Aeolian D, 132 bpm: driving spiccato ostinato, taiko, timpani, horn stabs every other phrase.
    const bpm = 132, beat = 60 / bpm, bar = beat * 4;
    const roots = [50, 46, 48, 50]; // D, Bb, C, D
    const r = roots[this.combatBar % roots.length];
    const fig = [0, 0, 3, 0, 5, 0, 3, 2];
    for (let b = 0; b < 2; b++) {
      const t0 = start + b * bar;
      for (let i = 0; i < 8; i++) {
        this.orch.spiccato(t0 + i * beat * 0.5, r - 12 + fig[i], i % 4 === 0 ? 0.24 : 0.16, this.combatBus);
        this.orch.spiccato(t0 + i * beat * 0.5, r + fig[i], i % 4 === 0 ? 0.12 : 0.08, this.combatBus);
      }
      this.orch.taiko(t0, 0.5, this.combatBus);
      this.orch.taiko(t0 + beat * 2, 0.38, this.combatBus);
      this.orch.taiko(t0 + beat * 3.5, 0.22, this.combatBus);
      if (b === 0) this.orch.timpani(t0, r - 24, 0.32, this.combatBus);
    }
    if (this.combatBar % 2 === 0) {
      this.orch.horn(start, r + 7, beat * 1.5, 0.2, this.combatBus);
      this.orch.horn(start, r + 12, beat * 1.5, 0.16, this.combatBus);
      this.orch.strings(start, [r, r + 7, r + 12 + 3], bar * 2, 0.13, this.combatBus, { attack: 0.3, release: 1, bright: 0.7 });
    }
    this.combatBar++;
    return start + bar * 2;
  }
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
