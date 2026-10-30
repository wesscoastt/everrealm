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

  // ---------------------------------------------------------------- The folk and chamber voices
  // (so a quiet piece has more to it than strings holding chords: plucks, reeds, a fiddle, a piano,
  // bells, a hand drum)

  /** A plucked string (Karplus-Strong), cached by note and how long it rings: pizzicato, lute. */
  private pluckCache = new Map<string, AudioBuffer>();
  private pluckBuf(m: number, damp: number, bright: number): AudioBuffer {
    const key = `${m}:${damp}:${bright}`;
    let buf = this.pluckCache.get(key);
    if (!buf) {
      const rate = this.ctx.sampleRate, f = mtof(m), period = Math.max(2, Math.round(rate / f));
      buf = this.ctx.createBuffer(1, Math.floor(rate * 2.4), rate);
      const d = buf.getChannelData(0);
      // the excitation: noise, darker or brighter (a thumb or a nail)
      let lp = 0;
      for (let i = 0; i < period; i++) { lp = lp * (1 - bright) + (Math.random() * 2 - 1) * bright; d[i] = lp * 0.9; }
      for (let i = period; i < d.length; i++) d[i] = (d[i - period] + d[i - period + 1]) * damp;
      this.pluckCache.set(key, buf);
    }
    return buf;
  }

  /** Strings plucked with the finger: short, round, a little woody. */
  pizz(t: number, m: number, vel: number, bus: AudioNode): void {
    const s = this.ctx.createBufferSource(); s.buffer = this.pluckBuf(m, 0.4955, 0.55);
    const body = this.ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 1500; body.Q.value = 0.9;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    s.connect(body).connect(g).connect(bus); s.start(t); s.stop(t + 1);
  }

  /** A lute or cittern: a brighter pluck through a wooden body, ringing longer. */
  lute(t: number, m: number, vel: number, bus: AudioNode): void {
    const s = this.ctx.createBufferSource(); s.buffer = this.pluckBuf(m, 0.4978, 0.8);
    const body = this.ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 280; body.Q.value = 1.2; body.gain.value = 6;
    const top = this.ctx.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 3200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(body).connect(top).connect(g).connect(bus); s.start(t); s.stop(t + 2.3);
  }

  /** A solo fiddle: one bowed voice, quick to speak, a lively vibrato, a little rosin on the attack. */
  fiddle(t: number, m: number, dur: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const vib = this.ctx.createOscillator(); vib.frequency.value = 6.2;
    const vd = this.ctx.createGain(); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.009, t + Math.min(0.35, dur * 0.5));
    vib.connect(vd).connect(o.frequency);
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = 2600; f1.Q.value = 1.6; f1.gain.value = 7;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 560; f2.Q.value = 1.4; f2.gain.value = 5;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const g = this.ctx.createGain(); const end = this.env(g, t, vel, 0.05, Math.max(0, dur - 0.08), 0.28);
    o.connect(f1).connect(f2).connect(lp).connect(g).connect(bus);
    const rosin = this.ctx.createBufferSource(); rosin.buffer = this.noise;
    const rb = this.ctx.createBiquadFilter(); rb.type = 'bandpass'; rb.frequency.value = 3000; rb.Q.value = 2;
    const rg = this.ctx.createGain(); rg.gain.setValueAtTime(vel * 0.25, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    rosin.connect(rb).connect(rg).connect(bus);
    for (const n of [o, vib]) { n.start(t); n.stop(end); }
    rosin.start(t, Math.random()); rosin.stop(t + 0.15);
  }

  /** A reed: the oboe's nasal double reed (a narrow pulse, formants) or the clarinet's hollow one (odd harmonics). */
  reed(t: number, m: number, dur: number, vel: number, bus: AudioNode, kind: 'oboe' | 'clarinet'): void {
    const f = mtof(m);
    const o = this.ctx.createOscillator();
    if (kind === 'oboe') {
      const re = new Float32Array(16), im = new Float32Array(16);
      for (let k = 1; k < 16; k++) im[k] = Math.sin(Math.PI * k * 0.22) / k; // a narrow pulse
      o.setPeriodicWave(this.ctx.createPeriodicWave(re, im));
    } else o.type = 'square';
    o.frequency.value = f;
    const vib = this.ctx.createOscillator(); vib.frequency.value = kind === 'oboe' ? 5.6 : 4.6;
    const vd = this.ctx.createGain(); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * (kind === 'oboe' ? 0.006 : 0.003), t + Math.min(0.5, dur * 0.6));
    vib.connect(vd).connect(o.frequency);
    const fa = this.ctx.createBiquadFilter(); fa.type = 'peaking'; fa.frequency.value = kind === 'oboe' ? 1150 : 1500; fa.Q.value = 1.8; fa.gain.value = kind === 'oboe' ? 9 : 4;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'oboe' ? 3600 : 2000; lp.Q.value = 0.5;
    const g = this.ctx.createGain(); const end = this.env(g, t, vel * (kind === 'oboe' ? 0.55 : 0.6), kind === 'oboe' ? 0.05 : 0.09, Math.max(0, dur - 0.1), 0.3);
    o.connect(fa).connect(lp).connect(g).connect(bus);
    for (const n of [o, vib]) { n.start(t); n.stop(end); }
  }

  /** A squeezebox for the harbour tunes: two reeds a little apart, the bellows breathing. */
  accordion(t: number, m: number, dur: number, vel: number, bus: AudioNode): void {
    const f = mtof(m);
    const g = this.ctx.createGain(); const end = this.env(g, t, vel * 0.5, 0.04, Math.max(0, dur - 0.06), 0.18);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.6;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    bp.connect(lp).connect(g).connect(bus);
    for (const [det, ty] of [[-7, 'square'], [7, 'sawtooth']] as const) { const o = this.ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = det; o.connect(bp); o.start(t); o.stop(end); }
  }

  /** A piano: struck strings, a few slightly stretched partials, the hammer's knock, a long decay. */
  piano(t: number, m: number, vel: number, bus: AudioNode, ring = 3.2): void {
    const f = mtof(m), g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.min(4000, f * 3), t + 1.2);
    lp.connect(g).connect(bus);
    for (const [k, amp] of [[1, 1], [2, 0.45], [3, 0.22], [4, 0.12], [5, 0.06]] as const) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * k * (1 + 0.0004 * k * k);
      const a = this.ctx.createGain(); a.gain.value = amp; o.connect(a).connect(lp); o.start(t); o.stop(t + ring + 0.1);
    }
    const ham = this.ctx.createBufferSource(); ham.buffer = this.noise;
    const hb = this.ctx.createBiquadFilter(); hb.type = 'bandpass'; hb.frequency.value = Math.min(4000, f * 4); hb.Q.value = 1;
    const hg = this.ctx.createGain(); hg.gain.setValueAtTime(vel * 0.15, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    ham.connect(hb).connect(hg).connect(bus); ham.start(t, Math.random()); ham.stop(t + 0.05);
  }

  /** Glockenspiel and little bells: bright bar partials, quick to fade. */
  glock(t: number, m: number, vel: number, bus: AudioNode): void {
    const f = mtof(m), g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    g.connect(bus);
    for (const [r, a] of [[1, 1], [2.76, 0.3], [5.4, 0.12], [8.93, 0.05]] as const) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const ag = this.ctx.createGain(); ag.gain.value = a; o.connect(ag).connect(g); o.start(t); o.stop(t + 1.5);
    }
  }

  /** A frame drum (a bodhrán, a tambour): a soft low boom, or a slap on the skin's edge. */
  frameDrum(t: number, vel: number, bus: AudioNode, slap = false): void {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(slap ? 210 : 130, t); o.frequency.exponentialRampToValueAtTime(slap ? 160 : 72, t + 0.12);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * (slap ? 0.5 : 1), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + (slap ? 0.22 : 0.5));
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.6);
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = slap ? 1800 : 600; bp.Q.value = 1.1;
    const ng = this.ctx.createGain(); ng.gain.setValueAtTime(vel * (slap ? 0.45 : 0.25), t); ng.gain.exponentialRampToValueAtTime(0.0001, t + (slap ? 0.09 : 0.06));
    n.connect(bp).connect(ng).connect(bus); n.start(t, Math.random()); n.stop(t + 0.12);
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
