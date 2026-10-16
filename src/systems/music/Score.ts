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

export type ThemeId = 'title' | 'greenwake' | 'hollin' | 'crownroad' | 'brambledeep' | 'saltwind' | 'redstone' | 'starfall' | 'night' | 'deep';
type Lead = 'flute' | 'horn' | 'choir' | 'celesta' | 'strings';

interface Theme {
  id: ThemeId;
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
  // Underground: no tune at all, just held low voices and the odd pluck.
  deep: {
    id: 'deep', root: 48, mode: MODES.phrygian, bpm: 40,
    prog: [{ deg: 0, q: 'sus2' }, { deg: 1, q: 'maj' }, { deg: 0, q: 'sus4' }, { deg: 6 }],
    motifs: [],
    lead: [], pad: ['choir'], vowel: 'oo', arp: 'harp', brightness: 0.2, rest: [12, 24], drone: true, level: 1.25,
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
}

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
      while (this.combatCursor < horizon) this.combatCursor = this.scheduleCombat(this.combatCursor);
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
