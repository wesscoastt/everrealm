import { MusicContext, Score, Sting } from './music/Score';
import { Instruments } from './music/Instruments';

// Procedural Web Audio: every sound is synthesised, so there are no asset licences to track.

export type Sfx =
  | 'swing' | 'hit' | 'hitHeavy' | 'hurt' | 'clink' | 'oreBreak' | 'chop' | 'treeFall' | 'cast' | 'splash' | 'bite' | 'catch'
  | 'bell' | 'coin' | 'levelUp' | 'click' | 'open' | 'close' | 'step' | 'growl' | 'squelch' | 'skitter' | 'heal' | 'roll'
  | 'anvil' | 'sizzle' | 'quest' | 'discover' | 'whistle' | 'death' | 'pickup' | 'fail' | 'thunder'
  | 'bark' | 'meow' | 'quack' | 'baa' | 'purr' | 'moo' | 'oink'
  // Feet on what they're on, a horse's hooves, and the body
  | 'stepGrass' | 'stepStone' | 'stepWood' | 'stepGravel' | 'stepSand' | 'stepSnow' | 'stepWater' | 'hoof' | 'jump' | 'land' | 'swim'
  // Blows, and things in the hands
  | 'crit' | 'equip' | 'eat' | 'drink' | 'page' | 'doorOpen' | 'doorShut' | 'chest' | 'unlock' | 'pickSnap' | 'mail'
  // Voices: horses, wolves, boars, crabs, jellies, the sea's hunters, and people with knives
  | 'neigh' | 'snort' | 'wolfSnarl' | 'wolfYelp' | 'wolfDie' | 'boarGrunt' | 'boarSqueal' | 'crabClack' | 'blorp' | 'thrash'
  | 'shout' | 'grunt' | 'manDie' | 'creatureDie';

/** What a creature sounds like when it sees you, when it's hit, and when it dies, by its body plan. */
export function voiceOf(model: string, what: 'aggro' | 'hurt' | 'die'): Sfx {
  const fam = model === 'wolf' || model === 'notch' || model === 'dog' ? 'wolf' : model === 'boar' ? 'boar' : model === 'rustback' || model === 'spider' ? 'crab'
    : model === 'jelly' || model === 'medusa' ? 'jelly' : model === 'bandit' ? 'man' : model === 'shark' || model === 'eel' || model === 'ray' ? 'fish' : 'beast';
  const V: Record<string, Record<'aggro' | 'hurt' | 'die', Sfx>> = {
    wolf: { aggro: 'wolfSnarl', hurt: 'wolfYelp', die: 'wolfDie' },
    boar: { aggro: 'boarGrunt', hurt: 'boarSqueal', die: 'boarSqueal' },
    crab: { aggro: 'skitter', hurt: 'crabClack', die: 'crabClack' },
    jelly: { aggro: 'squelch', hurt: 'blorp', die: 'squelch' },
    man: { aggro: 'shout', hurt: 'grunt', die: 'manDie' },
    fish: { aggro: 'thrash', hurt: 'thrash', die: 'thrash' },
    beast: { aggro: 'growl', hurt: 'growl', die: 'creatureDie' },
  };
  return V[fam][what];
}

/** Where the listener is, for the ambience: each 0 (not at all) to 1. */
export interface Soundscape { night: number; river: number; fire: number; underground: boolean; inTown: boolean; rain?: number; coast?: number; forest?: number; falls?: number; crowd?: number; indoors?: boolean }

/**
 * A long stereo bed of noise, the two sides drawn apart so it sounds wide: pink (each octave down as
 * loud as the one above: a rustle, water) or brown (louder still as it goes down: surf, wind, a roar).
 */
function noiseBed(ctx: AudioContext, kind: 'pink' | 'brown', secs: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'pink') {
        // Paul Kellet's filter
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Crossfade the ends so the loop has no seam
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) { const k = i / fade; d[n - fade + i] = d[n - fade + i] * (1 - k) + d[i] * k; }
  }
  return buf;
}

/** A soft room's reverb tail: decaying noise, a little darker as it dies, wider than it is long. */
function roomTail(ctx: AudioContext, secs: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) { const k = i / n; lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * k); d[i] = lp * Math.pow(1 - k, 3.2) * 0.6; }
  }
  return buf;
}

export class AudioSystem {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  /** Long stereo beds of softer noise for the ambience: pink (a rustle, rain, water) and brown (surf, wind). */
  private pink!: AudioBuffer;
  private brown!: AudioBuffer;
  /** The room the ambience sits in: a soft reverb, so nothing is bone dry. */
  private room!: GainNode;
  /** The sea: a low far roar under it all, and each wave on its own (swell, break, the wash going back). */
  private seaBus!: GainNode;
  private nextWave = 0;
  /** The wind: its filter and level wander gust by gust. */
  private windFilter!: BiquadFilterNode;
  private nextGust = 0;
  private windGain!: GainNode;
  private riverGain!: GainNode;
  private rainGain!: GainNode;
  private fireGain!: GainNode;
  private seaGain!: GainNode;
  /** The sea's body: a fuller layer over the far roar that swells up with each wave and settles after it. */
  private seaBody!: GainNode;
  /** How much the last wave is still lifting the body (1 on the break, easing back to 0). */
  private surge = 0;
  /** Waves come in sets: how many are left in this one, how big the next is, and the lull after. */
  private setLeft = 0;
  private setSize = 0.8;
  private fallsGain!: GainNode;
  private crowdGain!: GainNode;
  /** A short echo for caves and distant calls. */
  private echo!: GainNode;
  private nextBird = 0;
  private nextCall = 0;
  private nextDrip = 0;
  private nextCrowd = 0;
  private swell = 0;
  score: Score | null = null;
  /** Instruments people play (the game's performers: game/Bard.ts), on the sound-effects volume. */
  instruments: Instruments | null = null;
  private perf!: GainNode;
  private ducked = 0;
  private stepFlip = false;
  volumes = { master: 0.8, sfx: 0.9, ambience: 0.7, music: 0.45 };

  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.connect(comp);
    this.amb = ctx.createGain(); this.amb.connect(comp);
    this.music = ctx.createGain(); this.music.connect(comp);
    this.score = new Score(ctx, this.music);
    this.perf = ctx.createGain(); this.perf.connect(comp);
    this.instruments = new Instruments(ctx, this.perf);
    this.applyVolumes();
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.pink = noiseBed(ctx, 'pink', 9);
    this.brown = noiseBed(ctx, 'brown', 11);
    // The room: a short soft tail made of decaying noise, the ambience sent through it as well as straight
    this.room = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = roomTail(ctx, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    this.room.connect(verb).connect(wet).connect(this.amb);
    // The effects get a little of the room as well, so a blow lands somewhere
    const sfxSend = ctx.createGain(); sfxSend.gain.value = 0.1; this.sfx.connect(sfxSend).connect(this.room);
    // ...and the ambience softened up top, where synthetic noise turns to hiss
    const soft = ctx.createBiquadFilter(); soft.type = 'highshelf'; soft.frequency.value = 5200; soft.gain.value = -9;
    this.amb.disconnect(); this.amb.connect(soft).connect(comp);
    // The wind: brown noise through a filter the gusts move
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 320; this.windFilter.Q.value = 0.7;
    this.windGain = this.loopBed(this.brown, this.windFilter, 0.6);
    this.riverGain = this.loopNoise(900, 0.8, 'bandpass', this.pink);
    this.rainGain = this.loopNoise(3200, 0.5, 'highpass', this.pink);
    this.fireGain = this.loopNoise(2400, 0.3, 'highpass', this.pink);
    // The sea's far roar, low and slow; the waves themselves are played one by one (wave())
    this.seaGain = this.loopNoise(160, 0.5, 'lowpass', this.brown);
    this.seaBody = this.loopNoise(460, 0.45, 'lowpass', this.brown);
    // Everything the waves make goes through one gentle lowpass first: real surf is a roar and a shush,
    // and the fizz above four thousand or so is what makes synthetic sea sound like a badly tuned set
    this.seaBus = ctx.createGain(); this.seaBus.gain.value = 0;
    const seaTone = ctx.createBiquadFilter(); seaTone.type = 'lowpass'; seaTone.frequency.value = 3400; seaTone.Q.value = 0.5;
    this.seaBus.connect(seaTone); seaTone.connect(this.amb); seaTone.connect(this.room);
    this.fallsGain = this.loopNoise(260, 0.6, 'lowpass', this.brown);
    this.crowdGain = this.loopNoise(520, 0.9, 'bandpass', this.pink);
    // The echo: a delay feeding back through a dulling filter
    this.echo = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dull = ctx.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 2400;
    this.echo.connect(delay);
    delay.connect(dull).connect(fb).connect(delay);
    dull.connect(this.amb);
    this.echo.connect(this.amb);
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfx.gain.value = this.volumes.sfx;
    this.amb.gain.value = this.volumes.ambience;
    this.music.gain.value = this.volumes.music * (1 - this.ducked * 0.85);
    this.perf.gain.value = this.volumes.sfx;
  }

  /** Lower the score under live music nearby (0 leaves it, 1 nearly silences it). */
  duck(amount: number): void {
    if (!this.ctx || Math.abs(amount - this.ducked) < 0.02) return;
    this.ducked += Math.sign(amount - this.ducked) * Math.min(Math.abs(amount - this.ducked), 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music * (1 - this.ducked * 0.85), this.ctx.currentTime, 0.3);
  }

  private loopNoise(freq: number, q: number, type: BiquadFilterType, bed: AudioBuffer = this.noise): GainNode {
    const f = this.ctx!.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return this.loopBed(bed, f, 0.15);
  }

  /** A noise bed looping through a filter into a level, sent to the room as well (send: how much). */
  private loopBed(bed: AudioBuffer, f: BiquadFilterNode, send: number): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = bed;
    src.loop = true;
    // (each layer starts somewhere different in the bed, so no two sound alike)
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.amb);
    const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg).connect(this.room);
    src.start(0, Math.random() * bed.duration);
    return g;
  }

  /**
   * One wave on the shore: the swell lifting (low and rising), the break (a bright rush, a beat, a few
   * slaps of spray), and the wash running back down the beach, a long fizzing hiss of foam and shingle.
   * Each one different, each set somewhere a little left or right.
   */
  private wave(size: number): void {
    const ctx = this.ctx!, t = ctx.currentTime + 0.05;
    const pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 1.2; pan.connect(this.seaBus);
    const play = (bed: AudioBuffer, type: BiquadFilterType, f0: number, f1: number, q: number, at: number, rise: number, hold: number, fall: number, peak: number) => {
      const src = ctx.createBufferSource(); src.buffer = bed;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t + at); f.frequency.exponentialRampToValueAtTime(f1, t + at + rise + hold);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(peak, t + at + rise); g.gain.setValueAtTime(peak, t + at + rise + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + rise + hold + fall);
      src.connect(f).connect(g).connect(pan);
      src.start(t + at, Math.random() * (bed.duration - 8)); src.stop(t + at + rise + hold + fall + 0.1);
    };
    const k = 0.75 + Math.random() * 0.5, at = 2.4 * k;
    // the swell coming in: a low lift you feel as much as hear
    play(this.brown, 'lowpass', 90, 280 * k, 0.5, 0, 2.6 * k, 0.3, 1.0, 0.26 * size);
    // the break: a rolling thump, and over it a whoosh that opens up and closes down again
    play(this.brown, 'lowpass', 200, 820 * k, 0.6, at, 0.16, 0.4, 1.9, 0.38 * size);
    play(this.pink, 'lowpass', 420, 2000 * k, 0.35, at + 0.04, 0.3, 0.35, 1.7, 0.17 * size);
    play(this.pink, 'lowpass', 1800 * k, 520, 0.3, at + 0.7, 0.4, 0.3, 1.4, 0.07 * size); // (and closing)
    // the wash running back: foam, a soft shush, low and falling, not a hiss
    play(this.pink, 'bandpass', 1300, 520, 0.3, at + 0.6, 0.8, 0.9, 3.4 * k, 0.075 * size);
    // shingle dragged back down with it: a crackle of little stones, thick at first and thinning out
    const n = Math.round(16 + Math.random() * 14 * size);
    for (let i = 0; i < n; i++) {
      const p = i / n, when = at + 1.0 + Math.pow(p, 0.7) * 3.2 * k;
      this.burst(2200 + Math.random() * 2400, 5, 0.012 + Math.random() * 0.01, 0.016 * size * (1 - p) * (0.4 + Math.random() * 0.6), 'bandpass', when, undefined, pan);
    }
    // a slap or two of spray where it breaks
    for (let i = 0; i < 2; i++) this.burst(900 + Math.random() * 700, 1.1, 0.07, 0.04 * size * Math.random(), 'bandpass', at + 0.05 + i * 0.13, 400, pan);
    // and the body of the sea surges up with it
    this.surge = Math.max(this.surge, size);
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private tone(freq: number, type: OscillatorType, dur: number, peak: number, when = 0, slideTo?: number, out?: AudioNode): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.005, peak, dur);
    o.connect(g).connect(out ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(freq: number, q: number, dur: number, peak: number, type: BiquadFilterType = 'bandpass', when = 0, sweepTo?: number, out?: AudioNode): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = this.pink ?? this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.004, peak, dur);
    s.connect(f).connect(g).connect(out ?? this.sfx);
    s.start(t, Math.random() * ((this.pink?.duration ?? 2) - dur - 0.2));
    s.stop(t + dur + 0.05);
  }

  /** A blade or a fist through the air: a rush rising and falling in pitch, a little to one side. */
  private whoosh(v: number, len = 0.22, high = 2600): void {
    const ctx = this.ctx!, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.pink;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(high, t + len * 0.55); f.frequency.exponentialRampToValueAtTime(700, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + len * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const pan = ctx.createStereoPanner(); pan.pan.setValueAtTime(-0.3, t); pan.pan.linearRampToValueAtTime(0.3, t + len);
    src.connect(f).connect(g).connect(pan).connect(this.sfx);
    src.start(t, Math.random() * 6); src.stop(t + len + 0.05);
  }

  /** A blow landing: the low thump of it, the crunch, the slap on top; heavier ones longer and lower. */
  private impact(v: number, weight: number): void {
    const r = 0.9 + Math.random() * 0.2;
    this.tone(135 * r / weight, 'sine', 0.13 * weight, 0.5 * v, 0, 48 / weight);
    this.burst(1100 * r / Math.sqrt(weight), 1.1, 0.08 * weight, 0.42 * v, 'bandpass', 0, 420);
    this.burst(2800 * r, 1.2, 0.025, 0.14 * v, 'highpass');
    if (weight > 1.2) for (let i = 0; i < 3; i++) this.burst(1600 + Math.random() * 1200, 3, 0.03, 0.06 * v, 'bandpass', 0.06 + i * 0.05);
  }

  /**
   * A voiced cry: a buzzing source shaped by two formants (the mouth), its pitch bending from f0 to
   * f1, with breath mixed in (rough) and a tremble (wob, in Hz) for snarls and whinnies.
   */
  private cry(f0: number, f1: number, dur: number, peak: number, formants: [number, number], when = 0, rough = 0, wob = 0, out?: AudioNode): void {
    const ctx = this.ctx!, t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (wob) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = wob;
      depth.gain.value = f0 * 0.06;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    this.env(g, t, Math.min(0.04, dur * 0.25), peak, dur);
    formants.forEach((f, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 3 + i * 3;
      o.connect(bp).connect(g);
    });
    g.connect(out ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
    if (rough) this.burst(formants[0], 1.5, dur, peak * rough * 2, 'bandpass', when, undefined, out);
  }

  /** A tone that swells in rather than striking: a sung or bowed note, a glow. */
  private glowTone(freq: number, type: OscillatorType, attack: number, hold: number, release: number, peak: number, when = 0, out?: AudioNode): void {
    const ctx = this.ctx!, t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.setValueAtTime(peak, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    o.connect(g).connect(out ?? this.sfx); o.start(t); o.stop(t + attack + hold + release + 0.05);
  }

  /**
   * A skill going off, by its school (data/skillSchools.ts): every calling's skills used to share a swing,
   * a heavy hit, a bell and a growl. Each school is a few layers: the body of it (a roar, a chime, a clang),
   * an edge (a whoosh, a crack, a hiss), and something low under it so it lands.
   */
  skillCast(school: string, vol = 1): void {
    if (!this.ctx) return;
    const v = vol, r = Math.random;
    switch (school) {
      case 'shield':
        this.tone(95, 'sine', 0.22, 0.32 * v, 0, 58);                                          // the thump of the boss
        this.tone(410 + r() * 40, 'triangle', 0.35, 0.12 * v, 0.005, 360);                     // the iron ringing
        this.tone(1240 + r() * 80, 'sine', 0.5, 0.05 * v, 0.005);
        this.burst(2600, 2, 0.07, 0.14 * v, 'bandpass', 0);
        break;
      case 'warcry':
        this.burst(420, 1.4, 0.55, 0.22 * v, 'bandpass', 0, 260);                              // a shout, chest-deep
        this.tone(140, 'sawtooth', 0.5, 0.06 * v, 0.02, 110);
        this.tone(70, 'sine', 0.4, 0.2 * v, 0.05, 50);
        break;
      case 'blade':
        this.burst(1600, 1.2, 0.18, 0.2 * v, 'bandpass', 0, 4200);                              // the cut through the air
        this.tone(2700 + r() * 300, 'sine', 0.35, 0.05 * v, 0.08);                               // steel singing
        this.tone(3900 + r() * 300, 'sine', 0.25, 0.025 * v, 0.08);
        break;
      case 'fire':
        this.burst(380, 0.8, 0.5, 0.3 * v, 'lowpass', 0, 1700);                                 // the roar going up
        this.tone(68, 'sine', 0.5, 0.2 * v, 0.02, 44);
        for (let i = 0; i < 7; i++) this.burst(2800 + r() * 2400, 3, 0.03, 0.05 * v * r(), 'bandpass', 0.08 + r() * 0.4); // crackle
        break;
      case 'frost':
        for (const [f, d] of [[1760, 0], [2349, 0.05], [3136, 0.1]] as const) this.tone(f * (0.98 + r() * 0.04), 'sine', 0.7, 0.06 * v, d); // ice ringing
        this.burst(6000, 0.7, 0.35, 0.08 * v, 'highpass', 0, 9000);                              // the frost's breath
        this.burst(3200, 6, 0.04, 0.12 * v, 'bandpass', 0.02);                                  // a crack
        break;
      case 'storm':
        this.tone(900, 'sawtooth', 0.14, 0.12 * v, 0, 120);                                     // the arc
        this.burst(3200, 1.5, 0.09, 0.22 * v, 'bandpass', 0);                                   // the snap
        this.burst(160, 0.7, 0.6, 0.18 * v, 'lowpass', 0.05, 70);                               // thunder behind it
        break;
      case 'bow':
        this.tone(230, 'triangle', 0.22, 0.14 * v, 0, 175);                                     // the string let go
        this.tone(690, 'sine', 0.12, 0.05 * v, 0);
        this.burst(2600, 1.1, 0.3, 0.1 * v, 'highpass', 0.03, 5200);                            // the arrow away
        break;
      case 'shadow':
        this.burst(700, 1.1, 0.45, 0.2 * v, 'bandpass', 0, 180);                                // a dark rush, falling
        this.tone(110, 'sine', 0.45, 0.14 * v, 0.02, 64);
        this.burst(5200, 2, 0.12, 0.04 * v, 'bandpass', 0.18);                                  // a hiss at the end
        break;
      case 'poison':
        for (let i = 0; i < 6; i++) this.tone(260 + r() * 340, 'sine', 0.08, 0.06 * v, i * 0.05 + r() * 0.03, 520 + r() * 300); // bubbles
        this.burst(1800, 0.8, 0.4, 0.07 * v, 'lowpass', 0.02);
        break;
      case 'holy':
        for (const [f, d] of [[523.3, 0], [659.3, 0.04], [784, 0.08], [1046.5, 0.14]] as const) this.glowTone(f, 'sine', 0.12, 0.25, 0.9, 0.045 * v, d); // a chord of light
        this.glowTone(523.3, 'triangle', 0.2, 0.3, 0.8, 0.02 * v, 0);
        this.burst(7000, 0.7, 0.6, 0.035 * v, 'highpass', 0.05);                                 // shimmer
        break;
      case 'smite':
        for (const [f, d] of [[784, 0], [1175, 0.02]] as const) this.tone(f, 'sine', 0.6, 0.07 * v, d);
        this.tone(82, 'sine', 0.35, 0.3 * v, 0.03, 52);                                         // the blow lands
        this.burst(2400, 1.2, 0.1, 0.16 * v, 'bandpass', 0.03);
        break;
      case 'necro':
        this.glowTone(55, 'sawtooth', 0.15, 0.25, 0.6, 0.05 * v, 0);                            // the grave's drone
        for (let i = 0; i < 3; i++) this.burst(1100 + r() * 600, 8, 0.25, 0.05 * v, 'bandpass', 0.05 + i * 0.09); // whispers
        for (let i = 0; i < 3; i++) this.burst(3800, 5, 0.02, 0.07 * v, 'bandpass', 0.15 + i * 0.07);            // bone ticking
        break;
      case 'earth':
        this.tone(62, 'sine', 0.55, 0.42 * v, 0, 34);                                           // the stamp
        this.burst(220, 0.7, 0.7, 0.24 * v, 'lowpass', 0.02, 90);                               // the ground rumbling
        for (let i = 0; i < 5; i++) this.burst(1400 + r() * 1600, 3, 0.03, 0.05 * v * r(), 'bandpass', 0.1 + r() * 0.3); // grit
        break;
      case 'staff':
        this.burst(900, 1, 0.22, 0.16 * v, 'bandpass', 0, 1700);                               // wood through the air
        this.tone(310, 'triangle', 0.06, 0.14 * v, 0.12);                                        // the knock
        break;
      case 'arcane':
        this.tone(1200, 'sine', 0.18, 0.08 * v, 0, 2400);
        this.tone(2400, 'sine', 0.22, 0.06 * v, 0.16, 600);
        this.burst(6500, 0.8, 0.3, 0.05 * v, 'highpass', 0.05);
        break;
      case 'beast': this.play('growl', v); break;
      default: this.play('swing', v);
    }
  }

  play(name: Sfx, vol = 1): void {
    if (!this.ctx) return;
    const v = vol;
    switch (name) {
      case 'swing': this.whoosh(v * (0.85 + Math.random() * 0.3), 0.2 + Math.random() * 0.06); break;
      case 'hit': this.impact(v, 1); break;
      case 'hitHeavy': this.impact(v * 1.2, 1.6); break;
      case 'hurt': this.cry(165 + Math.random() * 30, 118, 0.16, 0.16 * v, [560, 1100], 0, 0.45); this.tone(95, 'sine', 0.1, 0.25 * v, 0, 60); break;
      case 'clink': {
        const f = 1700 + Math.random() * 400;
        this.tone(f, 'sine', 0.25, 0.25 * v); this.tone(f * 1.53, 'sine', 0.18, 0.12 * v); this.burst(4000, 2, 0.05, 0.25 * v, 'highpass');
        break;
      }
      case 'oreBreak': this.burst(900, 0.8, 0.35, 0.6 * v, 'lowpass', 0, 200); this.tone(2400, 'triangle', 0.15, 0.12 * v, 0.02); break;
      case 'chop': this.burst(380, 2, 0.14, 0.7 * v, 'bandpass'); this.tone(180, 'triangle', 0.08, 0.3 * v, 0, 120); break;
      case 'treeFall': this.burst(300, 0.7, 1.2, 0.6 * v, 'lowpass', 0, 80); this.burst(2000, 1, 0.6, 0.15 * v, 'bandpass', 0.1, 500); break;
      case 'cast': this.burst(2500, 1, 0.3, 0.2 * v, 'bandpass', 0, 900); break;
      case 'splash': this.burst(1200, 0.7, 0.35, 0.45 * v, 'lowpass', 0, 300); break;
      case 'bite': this.tone(600, 'sine', 0.08, 0.25 * v, 0, 300); this.burst(1500, 1, 0.1, 0.3 * v, 'lowpass'); break;
      case 'catch': this.burst(900, 0.6, 0.5, 0.5 * v, 'lowpass', 0, 200); this.tone(880, 'triangle', 0.1, 0.15 * v, 0.1); this.tone(1320, 'triangle', 0.12, 0.15 * v, 0.18); break;
      case 'bell': {
        const base = 196;
        for (const [r, a, d] of [[0.5, 0.4, 4], [1, 0.5, 3.5], [1.19, 0.25, 2.5], [1.5, 0.2, 2.2], [2.0, 0.18, 1.8], [2.51, 0.12, 1.3], [3.0, 0.08, 1]] as const) {
          this.tone(base * r, 'sine', d, a * v);
        }
        this.burst(3000, 3, 0.05, 0.3 * v, 'bandpass');
        break;
      }
      case 'coin': for (const [at, f] of [[0, 2093], [0.07, 2637]] as const) { this.tone(f, 'sine', 0.22, 0.12 * v, at); this.tone(f * 1.51, 'sine', 0.12, 0.05 * v, at); this.burst(6200, 3, 0.02, 0.05 * v, 'bandpass', at); } break;
      case 'levelUp': [523, 659, 784, 1047, 1319].forEach((f, i) => { this.tone(f, 'triangle', 0.9, 0.11 * v, i * 0.08); this.tone(f * 2, 'sine', 0.6, 0.04 * v, i * 0.08); }); this.tone(262, 'sine', 1.6, 0.1 * v, 0.3); break;
      case 'quest': [392, 523, 659, 784].forEach((f, i) => { this.tone(f, 'triangle', 0.9, 0.1 * v, i * 0.11); this.tone(f * 2, 'sine', 0.5, 0.035 * v, i * 0.11); }); break;
      case 'discover': [330, 440, 494, 659].forEach((f, i) => { this.tone(f, 'sine', 1.6, 0.1 * v, i * 0.2); this.tone(f * 1.5, 'sine', 1.2, 0.03 * v, i * 0.2 + 0.05); }); break;
      case 'click': this.tone(2400 + Math.random() * 200, 'sine', 0.025, 0.035 * v); this.burst(5200, 2, 0.012, 0.03 * v, 'bandpass'); break;
      case 'open': this.burst(2600, 1, 0.12, 0.06 * v, 'bandpass', 0, 1300); this.tone(420, 'sine', 0.07, 0.05 * v, 0.02, 560); break;
      case 'close': this.burst(1500, 1, 0.1, 0.05 * v, 'bandpass', 0, 2600); this.tone(520, 'sine', 0.07, 0.045 * v, 0, 380); break;
      case 'pickup': this.tone(880, 'sine', 0.08, 0.07 * v); this.tone(1320, 'sine', 0.1, 0.06 * v, 0.05); this.burst(4200, 2, 0.02, 0.04 * v, 'bandpass'); break;
      case 'fail': this.tone(196, 'sine', 0.14, 0.12 * v, 0, 150); this.burst(500, 1, 0.08, 0.08 * v, 'lowpass'); break;
      case 'step': {
        this.stepFlip = !this.stepFlip;
        this.burst(this.stepFlip ? 650 : 520, 1.2, 0.07, 0.12 * v, 'bandpass');
        break;
      }
      case 'growl': this.tone(90, 'sawtooth', 0.5, 0.08 * v, 0, 70); this.burst(300, 2, 0.5, 0.2 * v, 'bandpass'); break;
      case 'squelch': this.burst(500, 4, 0.25, 0.4 * v, 'bandpass', 0, 200); break;
      case 'skitter': for (let i = 0; i < 5; i++) this.burst(3500, 6, 0.03, 0.2 * v, 'bandpass', i * 0.05); break;
      case 'heal': [660, 880, 1100].forEach((f, i) => this.tone(f, 'sine', 0.5, 0.1 * v, i * 0.1)); break;
      case 'roll': this.burst(600, 1, 0.3, 0.3 * v, 'lowpass', 0, 200); break;
      case 'anvil': this.tone(2600, 'sine', 0.35, 0.18 * v); this.tone(3900, 'sine', 0.2, 0.08 * v); this.burst(5000, 2, 0.04, 0.2 * v, 'highpass'); break;
      case 'sizzle': this.burst(5000, 0.5, 0.6, 0.15 * v, 'highpass'); break;
      case 'whistle': this.tone(1800, 'sine', 0.5, 0.2 * v, 0, 2300); break;
      case 'thunder': this.burst(220, 0.6, 3.2, 0.55 * v, 'lowpass', 0, 45); this.burst(90, 0.8, 2.4, 0.4 * v, 'lowpass', 0.35, 40); break;
      case 'death': this.tone(300, 'sine', 1.2, 0.2 * v, 0, 80); break;
      // Animals: a bark (two, sometimes), a meow that bends, a quack, a baa that wavers, a purr
      case 'bark': for (let i = 0; i < (Math.random() < 0.5 ? 2 : 1); i++) { this.tone(420, 'sawtooth', 0.09, 0.09 * v, i * 0.22, 260); this.burst(900, 2, 0.08, 0.25 * v, 'bandpass', i * 0.22); } break;
      case 'meow': this.tone(560, 'triangle', 0.32, 0.07 * v, 0, 820); this.tone(760, 'sine', 0.2, 0.04 * v, 0.14, 480); break;
      case 'quack': for (let i = 0; i < 2; i++) { this.tone(330, 'square', 0.1, 0.05 * v, i * 0.14, 260); this.burst(1100, 4, 0.09, 0.12 * v, 'bandpass', i * 0.14); } break;
      case 'baa': for (let i = 0; i < 5; i++) this.tone(300 + (i % 2) * 30, 'sawtooth', 0.12, 0.04 * v, i * 0.09, 290); break;
      // A low moo that rises and falls; a pig's two short grunts
      case 'moo': this.tone(150, 'sawtooth', 0.9, 0.05 * v, 0, 118); this.tone(120, 'sawtooth', 0.7, 0.035 * v, 0.2, 100); break;
      case 'oink': for (let i = 0; i < 2; i++) { this.burst(380, 4, 0.08, 0.12 * v, 'bandpass', i * 0.14); this.tone(210, 'square', 0.07, 0.025 * v, i * 0.14, 170); } break;
      case 'purr': for (let i = 0; i < 10; i++) this.burst(140, 3, 0.07, 0.18 * v, 'lowpass', i * 0.09); break;
      // ---- Feet: grass swishes, stone taps, boards knock, gravel and snow crunch, sand hushes, water splashes
      case 'stepGrass': { this.stepFlip = !this.stepFlip; const r = 0.85 + Math.random() * 0.3; this.burst((this.stepFlip ? 2600 : 2200) * r, 0.7, 0.11, 0.05 * v * r, 'highpass', 0, 1500); this.tone(85 * r, 'sine', 0.06, 0.06 * v, 0, 60); break; }
      case 'stepStone': { this.stepFlip = !this.stepFlip; const r = 0.88 + Math.random() * 0.24; this.burst((this.stepFlip ? 1900 : 1600) * r, 2.2, 0.04, 0.12 * v, 'bandpass'); this.tone((this.stepFlip ? 190 : 170) * r, 'sine', 0.05, 0.06 * v, 0, 120); this.burst(5200, 2, 0.015, 0.03 * v, 'bandpass', 0.01); break; }
      case 'stepWood': { this.stepFlip = !this.stepFlip; const r = 0.9 + Math.random() * 0.2; this.tone((this.stepFlip ? 160 : 140) * r, 'triangle', 0.09, 0.12 * v, 0, 105 * r); this.burst(900 * r, 3, 0.05, 0.07 * v, 'bandpass'); this.burst(2600, 4, 0.03, 0.025 * v, 'bandpass', 0.03); break; }
      case 'stepGravel': for (let i = 0; i < 4; i++) this.burst(2600 + Math.random() * 1400, 2, 0.02, 0.07 * v, 'bandpass', i * 0.018); break;
      case 'stepSand': this.burst(1400, 0.6, 0.12, 0.1 * v, 'lowpass', 0, 600); break;
      case 'stepSnow': for (let i = 0; i < 6; i++) this.burst(1800 + Math.random() * 900, 4, 0.016, 0.09 * v, 'bandpass', i * 0.014); this.tone(900, 'sine', 0.05, 0.015 * v, 0.02, 1150); break;
      case 'stepWater': this.burst(900, 0.8, 0.18, 0.16 * v, 'lowpass', 0, 300); this.tone(520, 'sine', 0.06, 0.03 * v, 0.03, 900); break;
      case 'hoof': {
        // Clip, and clop: two feet a beat apart
        this.stepFlip = !this.stepFlip;
        const f = this.stepFlip ? 430 : 360;
        this.tone(f, 'triangle', 0.05, 0.12 * v, 0, f * 0.6); this.burst(2400, 3, 0.03, 0.14 * v, 'bandpass');
        this.tone(f * 0.85, 'triangle', 0.05, 0.09 * v, 0.11, f * 0.5); this.burst(2000, 3, 0.03, 0.1 * v, 'bandpass', 0.11);
        break;
      }
      case 'jump': this.burst(700, 1, 0.08, 0.05 * v, 'lowpass'); this.cry(190, 150, 0.08, 0.025 * v, [650, 1300]); break;
      case 'land': this.burst(260, 0.8, 0.14, 0.6 * v, 'lowpass', 0, 90); this.burst(1800, 1.5, 0.05, 0.06 * v, 'bandpass'); break;
      case 'swim': this.burst(1100, 0.6, 0.3, 0.13 * v, 'lowpass', 0, 400); this.burst(3000, 1, 0.12, 0.04 * v, 'highpass', 0.08); break;
      // ---- Blows and hands
      case 'crit': this.impact(v * 1.1, 1.3); this.tone(2093, 'sine', 0.4, 0.06 * v, 0.02); this.tone(3140, 'sine', 0.3, 0.035 * v, 0.02); this.whoosh(v * 0.5, 0.3, 3400); break;
      case 'equip': this.burst(3200, 2, 0.06, 0.07 * v, 'bandpass'); this.burst(2400, 2, 0.05, 0.05 * v, 'bandpass', 0.07); this.tone(1900, 'sine', 0.12, 0.035 * v, 0.06); break;
      case 'eat': for (let i = 0; i < 3; i++) this.burst(650 + Math.random() * 300, 2, 0.06, 0.12 * v, 'lowpass', i * 0.13); break;
      case 'drink': for (let i = 0; i < 2; i++) { this.tone(210, 'sine', 0.1, 0.11 * v, i * 0.24, 330); this.burst(420, 3, 0.06, 0.08 * v, 'bandpass', i * 0.24 + 0.03); } break;
      case 'page': this.burst(4200, 0.8, 0.18, 0.07 * v, 'highpass', 0, 1800); this.burst(1300, 1, 0.1, 0.04 * v, 'bandpass', 0.07); break;
      case 'doorOpen': this.cry(240, 190, 0.5, 0.08 * v, [600, 1500], 0, 0.2, 14); this.burst(1600, 4, 0.03, 0.08 * v, 'bandpass'); break;
      case 'doorShut': this.tone(95, 'triangle', 0.16, 0.2 * v, 0, 70); this.burst(500, 1, 0.12, 0.18 * v, 'lowpass'); this.burst(3200, 4, 0.03, 0.08 * v, 'bandpass', 0.05); break;
      case 'chest': this.cry(330, 250, 0.3, 0.05 * v, [700, 1700], 0, 0.2, 18); this.burst(3500, 4, 0.03, 0.12 * v, 'bandpass', 0.3); this.tone(140, 'triangle', 0.1, 0.1 * v, 0.34, 100); break;
      case 'unlock': for (let i = 0; i < 3; i++) this.burst(5200, 6, 0.015, 0.09 * v, 'bandpass', i * 0.07); this.tone(880, 'square', 0.03, 0.04 * v, 0.26); this.burst(2600, 3, 0.04, 0.12 * v, 'bandpass', 0.26); break;
      case 'pickSnap': this.burst(6500, 2, 0.03, 0.18 * v, 'highpass'); this.tone(3200, 'sine', 0.06, 0.05 * v, 0, 1600); break;
      case 'mail': this.burst(4200, 0.8, 0.16, 0.06 * v, 'highpass', 0, 1800); this.tone(1760, 'sine', 0.45, 0.05 * v, 0.14); this.tone(2637, 'sine', 0.3, 0.025 * v, 0.14); break;
      // ---- Voices
      case 'neigh': this.cry(760, 520, 0.9, 0.1 * v, [950, 2400], 0, 0.25, 9); this.burst(700, 0.8, 0.2, 0.12 * v, 'bandpass', 0.9, 350); break;
      case 'snort': this.burst(700, 0.8, 0.25, 0.18 * v, 'bandpass', 0, 350); this.burst(500, 0.8, 0.15, 0.1 * v, 'bandpass', 0.3, 300); break;
      case 'wolfSnarl': this.cry(115, 92, 0.55, 0.2 * v, [420, 950], 0, 0.6, 32); break;
      case 'wolfYelp': this.cry(950, 620, 0.13, 0.18 * v, [1250, 2700]); break;
      case 'wolfDie': this.cry(560, 210, 0.65, 0.14 * v, [850, 1900], 0, 0.15, 6); break;
      case 'boarGrunt': for (let i = 0; i < 3; i++) this.cry(125, 92, 0.12, 0.1 * v, [360, 820], i * 0.17, 0.7); break;
      case 'boarSqueal': this.cry(900, 1350, 0.42, 0.14 * v, [1500, 3100], 0, 0.2); break;
      case 'crabClack': for (let i = 0; i < 2; i++) { this.tone(1800, 'square', 0.02, 0.05 * v, i * 0.08); this.burst(3100, 5, 0.025, 0.14 * v, 'bandpass', i * 0.08); } break;
      case 'blorp': this.tone(250, 'sine', 0.16, 0.14 * v, 0, 520); this.burst(600, 5, 0.12, 0.14 * v, 'bandpass'); break;
      case 'thrash': this.burst(420, 0.7, 0.32, 0.24 * v, 'lowpass', 0, 140); this.burst(1600, 0.8, 0.2, 0.06 * v, 'bandpass', 0.05); break;
      case 'shout': this.cry(170, 125, 0.32, 0.18 * v, [720, 1250], 0, 0.2); break;
      case 'grunt': this.cry(150, 112, 0.14, 0.18 * v, [520, 1050], 0, 0.4); break;
      case 'manDie': this.cry(180, 82, 0.75, 0.16 * v, [620, 1050], 0, 0.3); break;
      case 'creatureDie': this.cry(300, 120, 0.55, 0.14 * v, [520, 1150], 0, 0.3); break;
    }
  }

  /** Spatial-ish one-shot: attenuate by distance from the listener. */
  playAt(name: Sfx, dist: number, vol = 1): void {
    if (dist > 40) return;
    this.play(name, vol * Math.max(0.05, 1 - dist / 40));
  }

  ambience(dt: number, opts: Soundscape): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const coast = opts.underground ? 0 : opts.coast ?? 0, forest = opts.underground ? 0 : opts.forest ?? 0, rain = opts.rain ?? 0;
    const day = opts.night < 0.5, wild = !opts.inTown && !opts.underground;
    // The wind: a gust every few seconds, its tone and strength moving with it; the coast is windier
    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      this.nextGust = 2.5 + Math.random() * 5;
      const gust = Math.random();
      this.windFilter.frequency.setTargetAtTime(220 + gust * 520 + coast * 160, t, 1.2);
      this.windGain.gain.setTargetAtTime(opts.underground ? 0.015 : (0.05 + gust * 0.07 + coast * 0.04 + opts.night * 0.02) * (opts.indoors ? 0.3 : 1), t, 1.4);
    }
    this.riverGain.gain.setTargetAtTime(opts.river * 0.28, t, 0.3);
    this.fireGain.gain.setTargetAtTime(opts.fire * 0.12, t, 0.2);
    this.rainGain.gain.setTargetAtTime(rain * 0.22 * (opts.indoors ? 0.45 : 1), t, 1.2);
    // The sea: its far roar, and wave after wave on the shore, every six to eleven seconds, now and then a big one
    this.swell += dt * 0.9;
    const inside = opts.indoors ? 0.3 : 1;
    // the far roar breathes slowly; the body rises with each wave and settles after it
    this.surge *= Math.exp(-dt / 3.2);
    this.seaGain.gain.setTargetAtTime(coast * 0.07 * (0.8 + 0.2 * Math.sin(this.swell * 0.6)) * inside, t, 1.5);
    this.seaBody.gain.setTargetAtTime(coast * coast * (0.015 + 0.07 * this.surge) * inside, t, 0.6);
    this.seaBus.gain.setTargetAtTime(coast * (opts.indoors ? 0.25 : 1), t, 1.2);
    this.nextWave -= dt;
    if (this.nextWave <= 0) {
      // Waves in sets: three to five, each a little bigger, six to eight seconds apart; then a lull
      if (this.setLeft <= 0) { this.setLeft = 3 + Math.floor(Math.random() * 3); this.setSize = 0.65 + Math.random() * 0.15; }
      this.setLeft--;
      this.setSize = Math.min(1.45, this.setSize + 0.12 + Math.random() * 0.1);
      this.nextWave = this.setLeft > 0 ? 6 + Math.random() * 2 : 12 + Math.random() * 7;
      if (coast > 0.05) this.wave(this.setSize);
    }
    this.fallsGain.gain.setTargetAtTime((opts.falls ?? 0) * 0.32, t, 0.4);
    // A town's murmur by day, a tavern's in the evening; now and then a laugh, or mugs
    const crowd = opts.crowd ?? 0;
    this.crowdGain.gain.setTargetAtTime(crowd * (0.035 + Math.random() * 0.02), t, 0.25);
    this.nextCrowd -= dt;
    if (crowd > 0.3 && this.nextCrowd <= 0) {
      this.nextCrowd = (opts.indoors ? 2.5 : 5) + Math.random() * 6;
      if (Math.random() < 0.55) this.laugh(crowd * (opts.indoors ? 1 : 0.5));
      else this.mugs(crowd * (opts.indoors ? 1 : 0.4));
    }
    // Small birds and crickets everywhere outside
    this.nextBird -= dt;
    if (this.nextBird <= 0 && !opts.underground && rain < 0.3) {
      this.nextBird = 1.5 + Math.random() * 4;
      if (day) this.birdCall();
      else this.cricket();
    }
    // The calls of the place: a cuckoo, a wood pigeon or a woodpecker in the woods, gulls on the coast;
    // at night an owl, frogs by the water, and far off a wolf
    this.nextCall -= dt;
    if (this.nextCall <= 0 && !opts.underground && rain < 0.5) {
      this.nextCall = 6 + Math.random() * 12;
      const r = Math.random();
      if (coast > 0.3 && day && r < coast) this.gull();
      else if (day && forest > 0.2 && wild) { if (r < 0.35) this.cuckoo(); else if (r < 0.7) this.pigeon(); else this.woodpecker(); }
      else if (!day && forest > 0.2 && r < 0.5) this.owl();
      else if (!day && opts.river > 0.3 && r < 0.8) this.frogs();
      else if (!day && wild && r < 0.25) this.howl();
    }
    // Underground: water dripping, and its echo
    this.nextDrip -= dt;
    if (opts.underground && this.nextDrip <= 0) {
      this.nextDrip = 0.8 + Math.random() * 3.5;
      this.tone(1600 + Math.random() * 1400, 'sine', 0.07, 0.04, 0, 800 + Math.random() * 300, this.echo);
    }
  }

  private laugh(v: number): void { const f = 220 + Math.random() * 110; for (let i = 0; i < 4; i++) this.cry(f * (1 - i * 0.04), f * 0.88, 0.09, 0.022 * v, [700, 1250], i * 0.13, 0.3, 0, this.amb); }
  private mugs(v: number): void { this.tone(2500 + Math.random() * 400, 'sine', 0.3, 0.025 * v, 0, undefined, this.amb); this.tone(3300, 'sine', 0.22, 0.012 * v, 0.01, undefined, this.amb); this.burst(4000, 3, 0.03, 0.03 * v, 'bandpass', 0, undefined, this.amb); }
  private gull(): void { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.cry(1500, 950, 0.32, 0.018, [1800, 3300], i * 0.36, 0.1, 0, this.echo); }
  private cuckoo(): void { for (let k = 0; k < 2; k++) { this.tone(784, 'sine', 0.22, 0.03, k * 0.9, 760, this.amb); this.tone(622, 'sine', 0.32, 0.03, k * 0.9 + 0.28, 600, this.amb); } }
  private pigeon(): void { [[330, 0.3], [370, 0.45], [330, 0.3], [330, 0.25], [330, 0.25]].reduce((at, [f, d]) => { this.tone(f, 'sine', d, 0.025, at, f * 0.94, this.amb); return at + d + 0.08; }, 0); }
  private woodpecker(): void { for (let i = 0; i < 14; i++) this.burst(1500, 6, 0.012, 0.05 * (1 - i * 0.04), 'bandpass', i * 0.045, undefined, this.echo); }
  private owl(): void { for (const [at, d] of [[0, 0.4], [0.75, 0.18], [0.98, 0.5]]) this.tone(390, 'sine', d, 0.03, at, 360, this.echo); }
  private frogs(): void { const n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) this.cry(125, 100, 0.11, 0.035, [520, 1150], i * 0.19, 0.6, 0, this.amb); }
  private howl(): void { this.cry(380, 520, 0.9, 0.018, [700, 1400], 0, 0, 5, this.echo); this.cry(520, 400, 1.4, 0.018, [700, 1400], 0.85, 0, 5, this.echo); }

  private birdCall(): void {
    const ctx = this.ctx!;
    const base = 2200 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) this.tone(base * (1 + (Math.random() - 0.5) * 0.2), 'sine', 0.06, 0.035, i * 0.09, base * 1.3, this.amb);
    void ctx;
  }

  private cricket(): void {
    for (let i = 0; i < 6; i++) this.tone(4200, 'square', 0.015, 0.012, i * 0.04, undefined, this.amb);
  }

  /** A short musical cue over the score (a new place, a chapter, a big fight won). */
  sting(kind: Sting): void {
    if (this.score) this.score.sting(kind);
  }

  /** Steer the score: which theme, and whether the combat layer is up. Call every frame. */
  musicContext(c: MusicContext): void {
    if (!this.ctx || !this.score) return;
    this.score.setContext(c);
    this.score.advance(this.ctx.currentTime + 2);
  }
}
