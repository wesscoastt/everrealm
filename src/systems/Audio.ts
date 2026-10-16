import { MusicContext, Score } from './music/Score';

// Procedural Web Audio: every sound is synthesised, so there are no asset licences to track.

export type Sfx =
  | 'swing' | 'hit' | 'hitHeavy' | 'hurt' | 'clink' | 'oreBreak' | 'chop' | 'treeFall' | 'cast' | 'splash' | 'bite' | 'catch'
  | 'bell' | 'coin' | 'levelUp' | 'click' | 'open' | 'close' | 'step' | 'growl' | 'squelch' | 'skitter' | 'heal' | 'roll'
  | 'anvil' | 'sizzle' | 'quest' | 'discover' | 'whistle' | 'death' | 'pickup' | 'fail';

export class AudioSystem {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private windGain!: GainNode;
  private riverGain!: GainNode;
  private fireGain!: GainNode;
  private nextBird = 0;
  score: Score | null = null;
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
    this.applyVolumes();
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.windGain = this.loopNoise(400, 0.6, 'lowpass');
    this.riverGain = this.loopNoise(900, 0.8, 'bandpass');
    this.fireGain = this.loopNoise(2400, 0.3, 'highpass');
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfx.gain.value = this.volumes.sfx;
    this.amb.gain.value = this.volumes.ambience;
    this.music.gain.value = this.volumes.music;
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

  private burst(freq: number, q: number, dur: number, peak: number, type: BiquadFilterType = 'bandpass', when = 0, sweepTo?: number): void {
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
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
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
      case 'death': this.tone(300, 'sine', 1.2, 0.2 * v, 0, 80); break;
    }
  }

  /** Spatial-ish one-shot: attenuate by distance from the listener. */
  playAt(name: Sfx, dist: number, vol = 1): void {
    if (dist > 40) return;
    this.play(name, vol * Math.max(0.05, 1 - dist / 40));
  }

  ambience(dt: number, opts: { night: number; river: number; fire: number; underground: boolean; inTown: boolean }): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(opts.underground ? 0.02 : 0.08 + opts.night * 0.04, t, 0.5);
    this.riverGain.gain.setTargetAtTime(opts.river * 0.28, t, 0.3);
    this.fireGain.gain.setTargetAtTime(opts.fire * 0.12, t, 0.2);
    this.nextBird -= dt;
    if (this.nextBird <= 0 && !opts.underground) {
      this.nextBird = 1.5 + Math.random() * 4;
      if (opts.night < 0.5) this.birdCall();
      else this.cricket();
    }
  }

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

  /** Steer the score: which theme, and whether the combat layer is up. Call every frame. */
  musicContext(c: MusicContext): void {
    if (!this.ctx || !this.score) return;
    this.score.setContext(c);
    this.score.advance(this.ctx.currentTime + 2);
  }
}
