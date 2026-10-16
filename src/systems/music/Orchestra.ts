// A small synthesised orchestra for the Everrealm score. Every voice is built from Web Audio
// primitives; nothing is sampled, so there is nothing to license and nothing to download.
// Works on any BaseAudioContext, so the same code renders previews offline.

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Vowel = 'ah' | 'oo' | 'eh';
const FORMANTS: Record<Vowel, [number, number, number][]> = {
  // [frequency, Q, gain]
  ah: [[730, 7, 1], [1090, 9, 0.55], [2440, 12, 0.22]],
  oo: [[320, 6, 1], [870, 9, 0.35], [2240, 12, 0.12]],
  eh: [[530, 7, 1], [1840, 10, 0.45], [2480, 12, 0.2]],
};

export class Orchestra {
  readonly input: GainNode;
  private reverb: ConvolverNode;
  private wet: GainNode;
  private vib: OscillatorNode;
  private vibDepth: GainNode;
  private noise: AudioBuffer;
  private harpCache = new Map<number, AudioBuffer>();

  constructor(readonly ctx: BaseAudioContext, out: AudioNode) {
    this.input = ctx.createGain();
    this.input.gain.value = 1;
    // Hall: long dark convolution tail plus a little dry signal
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(5.2);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.62;
    const dry = ctx.createGain();
    dry.gain.value = 0.55;
    const tone = ctx.createBiquadFilter();
    tone.type = 'highshelf';
    tone.frequency.value = 5200;
    tone.gain.value = -2;
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 160;
    low.gain.value = -7;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 38;
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 1400;
    presence.Q.value = 0.8;
    presence.gain.value = 3;
    this.input.connect(hp).connect(low).connect(presence).connect(tone);
    tone.connect(dry).connect(out);
    tone.connect(this.reverb).connect(this.wet).connect(out);

    // One shared vibrato for the string and choir sections
    this.vib = ctx.createOscillator();
    this.vib.frequency.value = 4.8;
    this.vibDepth = ctx.createGain();
    this.vibDepth.gain.value = 6; // cents
    this.vib.connect(this.vibDepth);
    this.vib.start();

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private makeImpulse(seconds: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        // Darken the tail as it decays, like a stone hall
        const k = 0.5 + 0.45 * Math.min(1, t / seconds) * 0.9;
        lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
        const early = t < 0.08 && Math.random() < 0.004 ? (Math.random() - 0.5) * 3 : 0;
        d[i] = (lp * 2.2 + early) * Math.pow(1 - t / seconds, 2.4) * (t < 0.018 ? t / 0.018 : 1);
      }
    }
    return buf;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number): number {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release + 0.05;
  }

  /** Bowed string section: three detuned saws per note, softened and swelled. */
  strings(t: number, notes: number[], dur: number, vel: number, bus: AudioNode, opts: { attack?: number; release?: number; bright?: number } = {}): void {
    const attack = opts.attack ?? 1.6, release = opts.release ?? 2.6, bright = opts.bright ?? 0.5;
    for (const m of notes) {
      const f = mtof(m);
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(500 + bright * 900, t);
      lp.frequency.linearRampToValueAtTime(900 + bright * 2200 + f * 0.6, t + attack);
      const end = this.env(g, t, vel / Math.sqrt(notes.length), attack, Math.max(0, dur - attack), release);
      lp.connect(g).connect(bus);
      for (const det of [-9, 0, 8]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det + (Math.random() - 0.5) * 3;
        this.vibDepth.connect(o.detune);
        o.connect(lp);
        o.start(t);
        o.stop(end);
      }
    }
  }

  /** Choir from vowel formants over a breathy saw pair. */
  choir(t: number, notes: number[], dur: number, vel: number, bus: AudioNode, vowel: Vowel = 'ah', attack = 2.2): void {
    for (const m of notes) {
      const f = mtof(m);
      const src = this.ctx.createGain();
      src.gain.value = 1;
      const end = t + attack + dur + 3.2;
      for (const det of [-6, 5]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        this.vibDepth.connect(o.detune);
        o.connect(src);
        o.start(t);
        o.stop(end);
      }
      const breath = this.ctx.createBufferSource();
      breath.buffer = this.noise;
      breath.loop = true;
      const bg = this.ctx.createGain();
      bg.gain.value = 0.06;
      breath.connect(bg).connect(src);
      breath.start(t, Math.random());
      breath.stop(end);
      const g = this.ctx.createGain();
      this.env(g, t, (vel * 1.4) / Math.sqrt(notes.length), attack, Math.max(0, dur - attack), 3);
      for (const [ff, q, amp] of FORMANTS[vowel]) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = ff * (m > 64 ? 1.08 : 1);
        bp.Q.value = q;
        const ag = this.ctx.createGain();
        ag.gain.value = amp;
        src.connect(bp).connect(ag).connect(g);
      }
      g.connect(bus);
    }
  }

  /** French horn: filtered saw with a brassy swell and a slight scoop into pitch. */
  horn(t: number, m: number, dur: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(320, t);
    lp.frequency.linearRampToValueAtTime(700 + vel * 2600, t + 0.35);
    lp.frequency.linearRampToValueAtTime(500 + vel * 1300, t + Math.max(0.5, dur));
    const g = this.ctx.createGain();
    const end = this.env(g, t, vel, 0.28, Math.max(0, dur - 0.28), 1.1);
    const sg = this.ctx.createGain();
    sg.gain.value = 0.6;
    o.connect(lp);
    sub.connect(sg).connect(lp);
    lp.connect(g).connect(bus);
    o.start(t); sub.start(t);
    o.stop(end); sub.stop(end);
  }

  /** Wooden flute: sine with a little second harmonic, breath noise and late vibrato. */
  flute(t: number, m: number, dur: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = this.ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 5.4;
    const vd = this.ctx.createGain();
    vd.gain.setValueAtTime(0, t);
    vd.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.6, dur * 0.6));
    vib.connect(vd).connect(o.frequency);
    vd.connect(o2.frequency);
    const g = this.ctx.createGain();
    const end = this.env(g, t, vel, 0.07, Math.max(0, dur - 0.1), 0.5);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.12;
    const breath = this.ctx.createBufferSource();
    breath.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 4;
    const bg = this.ctx.createGain();
    bg.gain.value = 0.08;
    o.connect(g); o2.connect(g2).connect(g);
    breath.connect(bp).connect(bg).connect(g);
    g.connect(bus);
    for (const n of [o, o2, vib]) { n.start(t); n.stop(end); }
    breath.start(t, Math.random()); breath.stop(end);
  }

  /** Harp: Karplus-Strong plucks, cached per note. */
  harp(t: number, m: number, vel: number, bus: AudioNode): void {
    let buf = this.harpCache.get(m);
    if (!buf) {
      const rate = this.ctx.sampleRate;
      const f = mtof(m);
      const period = Math.max(2, Math.round(rate / f));
      buf = this.ctx.createBuffer(1, Math.floor(rate * 3.2), rate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
      const damp = 0.4985 + Math.min(0.0013, 18 / f * 0.0005);
      for (let i = period; i < d.length; i++) d[i] = (d[i - period] + d[i - period + 1]) * damp;
      this.harpCache.set(m, buf);
    }
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.value = vel;
    s.connect(lp).connect(g).connect(bus);
    s.start(t);
  }

  /** Celesta: sine with a bell partial and a soft attack click. */
  celesta(t: number, m: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    g.connect(bus);
    for (const [ratio, amp] of [[1, 1], [4, 0.18], [2.76, 0.07]] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const a = this.ctx.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + 2.5);
    }
  }

  /** Contrabass and cellos: rounded low tone. */
  bass(t: number, m: number, dur: number, vel: number, bus: AudioNode, attack = 0.6): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const s = this.ctx.createOscillator();
    s.type = 'sine';
    s.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 0.7;
    const g = this.ctx.createGain();
    const end = this.env(g, t, vel, attack, Math.max(0, dur - attack), 1.8);
    o.connect(lp); s.connect(lp);
    lp.connect(g).connect(bus);
    o.start(t); s.start(t); o.stop(end); s.stop(end);
  }

  /** Short bowed note for ostinati (spiccato). */
  spiccato(t: number, m: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(g).connect(bus);
    for (const det of [-7, 6]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + 0.32);
    }
  }

  timpani(t: number, m: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 2);
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.7, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    n.connect(lp).connect(ng).connect(bus);
    n.start(t, Math.random());
    n.stop(t + 0.3);
  }

  taiko(t: number, vel: number, bus: AudioNode): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 1);
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 220;
    bp.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(bp).connect(ng).connect(bus);
    n.start(t, Math.random());
    n.stop(t + 0.2);
  }

  /** Suspended cymbal roll swelling into a downbeat. */
  swell(t: number, dur: number, vel: number, bus: AudioNode): void {
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    n.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    n.connect(hp).connect(g).connect(bus);
    n.start(t);
    n.stop(t + dur + 1.3);
  }
}
