// Tunes and the instruments that play them. Every tune is the counties' own, written for the game:
// learnt from the people who still sing them (the Waits' storyline, src/data/content/waits.ts) and
// kept in the player's songbook (the flag "tune:<id>"). A tune has up to four parts, so a band can
// split it: the lead, a harmony over it, a bass under it, and the drum.
//
// Parts are written as "degree:beats" tokens: the degree is a step of the tune's mode counted from
// its root (negative goes down, 7 is the octave), "r" is a rest, and a drum part uses "x" (a struck
// beat) and "o" (a light one). Every part of a tune lasts the same number of beats.

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
};

export type PartId = 'lead' | 'harmony' | 'bass' | 'drum';
export const PART_NAMES: Record<PartId, string> = { lead: 'Tune', harmony: 'Harmony', bass: 'Bass', drum: 'Drum' };

export interface Tune {
  id: string;
  name: string;
  /** Who in the counties taught it, as the songbook says it. */
  from: string;
  desc: string;
  bpm: number;
  /** MIDI note of degree 0, in the lead's octave. */
  root: number;
  mode: number[];
  parts: Partial<Record<PartId, string>>;
}

export const TUNES: Tune[] = [
  {
    id: 'ladyday', name: 'Lady Day', from: 'Tabitha Gant, the Waits\' House', bpm: 104, root: 67, mode: MODES.ionian,
    desc: 'The first tune every apprentice Wait learns, because it has nowhere to hide a wrong note.',
    parts: {
      lead: '0:1 1:1 2:1 0:1 2:1 3:1 4:2 4:0.5 5:0.5 4:0.5 3:0.5 2:1 0:1 1:2 r:1 -3:1 0:1 1:1 2:1 0:1 2:1 3:1 4:2 5:1 4:1 2:1 1:1 0:3 r:1',
      harmony: '2:2 4:2 4:2 6:2 7:2 5:2 4:2 r:2 2:2 4:2 4:2 6:2 7:2 6:2 4:4',
      bass: '0:4 0:2 4:2 4:4 4:2 -3:2 0:4 3:2 4:2 3:2 4:2 0:4',
      drum: 'x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1',
    },
  },
  {
    id: 'fourteenewes', name: 'Fourteen Ewes', from: 'Tressa Hale, Kelderby', bpm: 92, root: 62, mode: MODES.dorian,
    desc: 'A slow tune from the high pasture. The Hales sing it counting the flock in, one ewe a bar.',
    parts: {
      lead: '0:2 2:1 4:2 3:1 2:1 1:1 0:1 1:3 0:2 2:1 4:2 5:1 6:1 5:1 4:1 4:3 7:2 6:1 5:2 4:1 3:1 2:1 1:1 2:3 4:2 2:1 3:2 1:1 0:1 1:1 -1:1 0:3',
      harmony: '2:3 2:3 4:3 3:3 2:3 4:3 2:3 1:3 4:3 3:3 1:3 4:3 2:3 1:3 -2:3 2:3',
      bass: '0:3 0:3 3:3 4:3 0:3 4:3 6:3 4:3 3:3 5:3 3:3 2:3 4:3 3:3 4:3 0:3',
      drum: 'x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1 x:1 o:1 o:1',
    },
  },
  {
    id: 'haulholmsey', name: 'Haul for Holmsey', from: 'Bet Polglase, the Gannet inn, Gullmouth', bpm: 128, root: 69, mode: MODES.mixolydian,
    desc: 'A hauling song off the Gullmouth quay. The words are about a drowned parish and nobody sings them sadly.',
    parts: {
      lead: '4:1.5 4:0.5 4:1 2:1 3:1.5 2:0.5 1:1 0:1 1:1.5 2:0.5 3:1 4:1 5:2 4:2 4:1.5 4:0.5 4:1 2:1 3:1.5 2:0.5 1:1 0:1 6:1 5:1 4:1 2:1 0:3 r:1',
      harmony: '2:2 0:2 1:2 -1:2 -1:2 0:2 2:2 1:2 2:2 0:2 1:2 -1:2 4:2 2:2 -1:3 r:1',
      bass: '0:2 4:2 3:2 0:2 4:2 0:2 3:2 4:2 0:2 4:2 3:2 0:2 6:2 4:2 0:4',
      drum: 'x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1 x:1 r:0.5 o:0.5 x:1 o:1',
    },
  },
  {
    id: 'calling', name: 'The Calling', from: 'Sefton Garrow, Fellers\' Camp', bpm: 84, root: 64, mode: MODES.aeolian,
    desc: 'The fellers\' sawing song. Two strokes to a bar, and the tree comes down on the last line.',
    parts: {
      lead: '0:2 2:1 3:1 4:3 r:1 4:1 5:1 4:1 3:1 2:3 r:1 3:2 4:1 2:1 3:2 1:2 0:1 1:1 2:1 -1:1 0:3 r:1',
      harmony: '2:4 6:4 2:4 4:4 5:4 3:4 2:2 1:2 -1:4',
      bass: '0:4 -2:4 -2:4 0:4 -4:4 -2:4 -4:2 -3:2 0:4',
      drum: 'x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5 x:1.5 o:0.5',
    },
  },
  {
    id: 'mooring', name: 'The Mooring', from: 'A bone whistle from a barrow on Tolmen Moor', bpm: 60, root: 62, mode: MODES.pentatonic,
    desc: 'Five notes, older than the Charter. Written in the Waits\' Great Book as "from the moor". Nobody knew how it went until the whistle was found.',
    parts: {
      lead: '2:2 3:2 4:3 3:1 2:2 1:2 0:4 3:2 4:2 5:3 4:1 3:2 2:1 1:1 0:4',
      harmony: '0:8 -1:8 1:8 0:8',
      bass: '0:16 -2:8 0:8',
      drum: 'o:4 o:4 o:4 o:4 o:4 o:4 o:4 o:4',
    },
  },
  {
    id: 'threemarks', name: 'Three Marks in Ten', from: 'Written at the Waits\' House, with Amos Hollis\'s words', bpm: 96, root: 69, mode: MODES.aeolian,
    desc: 'A ballad about the Turnpike debt, bought at three marks in ten. The Charter would rather you didn\'t.',
    parts: {
      lead: '0:1 0:1 2:1 4:1 5:2 4:2 3:1 3:1 5:1 3:1 2:3 r:1 4:1 4:1 5:1 7:1 6:2 4:2 3:1 2:1 1:1 -1:1 0:3 r:1',
      harmony: '2:4 3:4 5:4 4:4 2:4 6:4 1:4 2:4',
      bass: '0:4 -2:4 -4:4 -5:4 -2:4 -1:4 -3:4 0:4',
      drum: 'x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1 x:1 o:1 o:1 o:1',
    },
  },
  {
    id: 'speakersmarch', name: 'The Speaker\'s March', from: 'The Waits\' Great Book', bpm: 112, root: 60, mode: MODES.ionian,
    desc: 'Played when the Speaker walks into a sitting. Every Wait can play it asleep, and some have.',
    parts: {
      lead: '0:1 4:1 4:1.5 5:0.5 4:1 2:1 0:2 1:1 3:1 3:1.5 4:0.5 3:1 1:1 -1:2 0:1 4:1 7:1.5 6:0.5 5:1 4:1 2:2 3:1 1:1 -1:1 1:1 0:3 r:1',
      harmony: '2:2 7:2 6:2 4:2 3:2 5:2 5:2 3:2 2:2 9:2 7:2 6:2 5:2 3:2 2:4',
      bass: '0:2 4:2 0:2 4:2 4:2 1:2 4:2 -3:2 0:2 4:2 3:2 4:2 4:2 -3:2 0:4',
      drum: 'x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1 x:0.5 o:0.5 o:0.5 o:0.5 x:1 o:1',
    },
  },
  {
    id: 'hours', name: 'The Hours', from: 'Played from the Minster tower by the Waits', bpm: 72, root: 65, mode: MODES.ionian,
    desc: 'The Waits play it from the Minster tower at dawn and dusk, and Ansbury sets its day by it.',
    parts: {
      lead: '7:1 6:1 4:2 5:2 2:2 4:1 5:1 7:2 6:2 4:2 2:1 4:1 5:2 4:2 1:2 0:4 r:4',
      harmony: '4:4 2:4 2:4 4:4 0:4 2:4 -1:8',
      bass: '0:8 -3:8 -2:8 0:8',
      drum: 'o:8 o:8 o:8 o:8',
    },
  },
  {
    id: 'wendwater', name: 'Wend Water', from: 'Pell Garrow, Hollin Ford', bpm: 100, root: 67, mode: MODES.mixolydian,
    desc: 'A Hollindale reel. Pell says he wrote it. Pell says a lot of things.',
    parts: {
      lead: '0:0.5 2:0.5 4:0.5 2:0.5 0:0.5 2:0.5 4:1 5:0.5 4:0.5 2:0.5 0:0.5 1:2 0:0.5 2:0.5 4:0.5 2:0.5 0:0.5 2:0.5 4:1 6:0.5 5:0.5 4:0.5 1:0.5 0:2 4:0.5 5:0.5 6:0.5 7:0.5 6:1 4:1 5:0.5 4:0.5 2:0.5 0:0.5 1:2 0:0.5 2:0.5 4:0.5 2:0.5 0:0.5 2:0.5 4:1 6:0.5 5:0.5 4:0.5 1:0.5 0:2',
      harmony: '2:4 3:4 2:4 1:4 4:4 3:4 2:4 2:4',
      bass: '0:2 4:2 -1:2 3:2 0:2 4:2 -3:2 0:2 3:2 6:2 -1:2 3:2 0:2 4:2 -3:2 0:2',
      drum: 'x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1 x:1 o:1',
    },
  },
];

export const TUNE_BY_ID: Record<string, Tune> = Object.fromEntries(TUNES.map((t) => [t.id, t]));

// ---------------------------------------------------------------- Instruments

export type Voice = 'whistle' | 'bone' | 'fiddle' | 'pipes' | 'lute' | 'harp' | 'drum' | 'horn' | 'gurdy';

export interface Instrument {
  /** The synth voice (systems/music/Instruments.ts). */
  voice: Voice;
  /** Which parts it can take in a band. */
  parts: PartId[];
  /** Octave shift from the tune's written root, for melody parts. */
  octave: number;
}

/** How each voice sits in a band. (The items carry `instrument: <voice>`: data/content/waits.ts.) */
export const VOICES: Record<Voice, Instrument> = {
  whistle: { voice: 'whistle', parts: ['lead', 'harmony'], octave: 12 },
  bone: { voice: 'bone', parts: ['lead', 'harmony'], octave: 0 },
  fiddle: { voice: 'fiddle', parts: ['lead', 'harmony'], octave: 0 },
  pipes: { voice: 'pipes', parts: ['lead', 'harmony'], octave: 0 },
  lute: { voice: 'lute', parts: ['lead', 'harmony', 'bass'], octave: 0 },
  harp: { voice: 'harp', parts: ['lead', 'harmony', 'bass'], octave: 0 },
  gurdy: { voice: 'gurdy', parts: ['lead', 'harmony'], octave: 0 },
  horn: { voice: 'horn', parts: ['harmony', 'bass'], octave: -12 },
  drum: { voice: 'drum', parts: ['drum'], octave: 0 },
};

/** A note to sound: when (seconds from the tune's start), MIDI pitch (or 1/0 for a drum's struck/light beat), and how long. */
export interface NoteEvent { t: number; m: number; dur: number }

/** One part of a tune as timed notes, for an instrument (bass parts drop two octaves, harmony one). */
export function partEvents(tune: Tune, part: PartId, voice: Voice): NoteEvent[] {
  const src = tune.parts[part];
  if (!src) return [];
  const beat = 60 / tune.bpm, out: NoteEvent[] = [];
  const shift = part === 'bass' ? -24 : part === 'harmony' ? 0 : 0;
  const oct = VOICES[voice].octave + shift + (part === 'harmony' && VOICES[voice].octave > 0 ? -12 : 0);
  let t = 0;
  for (const tok of src.trim().split(/\s+/)) {
    const [d, b] = tok.split(':');
    const len = Number(b) * beat;
    if (d === 'x' || d === 'o') out.push({ t, m: d === 'x' ? 1 : 0, dur: len });
    else if (d !== 'r') out.push({ t, m: tune.root + oct + degree(tune.mode, Number(d)), dur: len });
    t += len;
  }
  return out;
}

/** A tune's length through once, in seconds. */
export function tuneLength(tune: Tune): number {
  const lead = tune.parts.lead ?? '';
  return lead.trim().split(/\s+/).reduce((s, tok) => s + Number(tok.split(':')[1]), 0) * 60 / tune.bpm;
}

/** Semitones above the root for a scale degree (any octave). */
export function degree(mode: number[], d: number): number {
  const n = mode.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
  return o * 12 + mode[i];
}

/** Free play: the keys 1 to 8 play these degrees of D major, a step at a time; Shift lifts them an octave. */
export const FREE_ROOT = 62;
export const FREE_MODE = MODES.ionian;
