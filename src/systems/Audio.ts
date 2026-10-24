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

export class AudioSystem {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private windGain!: GainNode;
  private riverGain!: GainNode;
  private rainGain!: GainNode;
  private fireGain!: GainNode;
  private seaGain!: GainNode;
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
    this.windGain = this.loopNoise(400, 0.6, 'lowpass');
    this.riverGain = this.loopNoise(900, 0.8, 'bandpass');
    this.rainGain = this.loopNoise(2600, 0.35, 'highpass');
    this.fireGain = this.loopNoise(2400, 0.3, 'highpass');
    this.seaGain = this.loopNoise(420, 0.5, 'lowpass');
    this.fallsGain = this.loopNoise(260, 0.6, 'lowpass');
    this.crowdGain = this.loopNoise(520, 0.9, 'bandpass');
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

  private loopNoise(freq: number, q: number, type: BiquadFilterType): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.amb);
    src.start();
    return g;
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
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.004, peak, dur);
    s.connect(f).connect(g).connect(out ?? this.sfx);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
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

  play(name: Sfx, vol = 1): void {
    if (!this.ctx) return;
    const v = vol;
    switch (name) {
      case 'swing': this.burst(1800, 1.2, 0.18, 0.25 * v, 'bandpass', 0, 600); break;
      case 'hit': this.burst(700, 1, 0.12, 0.5 * v, 'lowpass'); this.tone(140, 'sine', 0.12, 0.5 * v, 0, 70); break;
      case 'hitHeavy': this.burst(500, 1, 0.2, 0.7 * v, 'lowpass'); this.tone(110, 'sine', 0.22, 0.7 * v, 0, 45); break;
      case 'hurt': this.tone(220, 'square', 0.12, 0.12 * v, 0, 120); this.burst(400, 1, 0.1, 0.4 * v, 'lowpass'); break;
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
      case 'coin': this.tone(1568, 'triangle', 0.09, 0.2 * v); this.tone(2093, 'triangle', 0.14, 0.2 * v, 0.07); break;
      case 'levelUp': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 'triangle', 0.4, 0.18 * v, i * 0.08)); break;
      case 'quest': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 'triangle', 0.5, 0.16 * v, i * 0.11)); break;
      case 'discover': [330, 440, 494, 659].forEach((f, i) => this.tone(f, 'sine', 0.9, 0.14 * v, i * 0.18)); break;
      case 'click': this.tone(1200, 'square', 0.03, 0.05 * v); break;
      case 'open': this.tone(500, 'triangle', 0.08, 0.1 * v, 0, 800); break;
      case 'close': this.tone(800, 'triangle', 0.08, 0.1 * v, 0, 500); break;
      case 'pickup': this.tone(700, 'triangle', 0.08, 0.14 * v, 0, 1100); break;
      case 'fail': this.tone(300, 'square', 0.15, 0.06 * v, 0, 200); break;
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
      case 'stepGrass': { this.stepFlip = !this.stepFlip; this.burst(this.stepFlip ? 2600 : 2200, 0.7, 0.1, 0.06 * v, 'highpass'); this.burst(420, 1, 0.05, 0.05 * v, 'lowpass'); break; }
      case 'stepStone': { this.stepFlip = !this.stepFlip; this.burst(this.stepFlip ? 1900 : 1600, 2.5, 0.035, 0.15 * v, 'bandpass'); this.tone(this.stepFlip ? 190 : 170, 'sine', 0.04, 0.05 * v); break; }
      case 'stepWood': { this.stepFlip = !this.stepFlip; this.tone(this.stepFlip ? 160 : 140, 'triangle', 0.09, 0.15 * v, 0, 110); this.burst(900, 3, 0.05, 0.08 * v, 'bandpass'); break; }
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
      case 'crit': this.tone(1600, 'triangle', 0.12, 0.1 * v); this.tone(2400, 'sine', 0.28, 0.07 * v, 0.03); this.burst(6000, 1, 0.08, 0.14 * v, 'highpass'); break;
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
    this.windGain.gain.setTargetAtTime(opts.underground ? 0.02 : 0.08 + opts.night * 0.04, t, 0.5);
    this.riverGain.gain.setTargetAtTime(opts.river * 0.28, t, 0.3);
    this.fireGain.gain.setTargetAtTime(opts.fire * 0.12, t, 0.2);
    this.rainGain.gain.setTargetAtTime(rain * 0.3, t, 1.2);
    // The sea: swells coming in every seven seconds or so, and the falls' roar under the river
    this.swell += dt * 0.9;
    this.seaGain.gain.setTargetAtTime(coast * (0.07 + 0.09 * Math.max(0, Math.sin(this.swell))), t, 0.6);
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
