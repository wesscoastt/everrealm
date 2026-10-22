import type { Voice } from '../../data/tunes';

// The instruments people carry: synthesised like the score (Orchestra.ts), so nothing is sampled.
// Each note goes to the performer's own channel (a gain and a pan the game moves as they walk),
// then through a small room reverb shared by every performer.

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Instruments {
  readonly bus: GainNode;
  private noise: AudioBuffer;
  private plucks = new Map<string, AudioBuffer>();

  constructor(readonly ctx: BaseAudioContext, out: AudioNode) {
    this.bus = ctx.createGain();
    // A room: a short bright tail under the dry signal
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.bus.connect(out);
    this.bus.connect(verb).connect(wet).connect(out);
    const n = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  /** A performer's channel: notes go in here, and the game sets its gain and pan as they move. */
  channel(): { gain: GainNode; pan: StereoPannerNode } {
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    gain.connect(pan).connect(this.bus);
    return { gain, pan };
  }

  /** Sound one note at time t (context seconds). For a drum, m is 1 for a struck beat, 0 for a light one. */
  note(voice: Voice, t: number, m: number, dur: number, vel: number, out: AudioNode): void {
    switch (voice) {
      case 'whistle': this.breath(t, m, dur, vel, out, { harm: 0.18, air: 0.07, vib: 5.6, depth: 0.007 }); break;
      case 'bone': this.breath(t, m, dur, vel * 1.1, out, { harm: 0.05, air: 0.2, vib: 4.2, depth: 0.012, sag: true }); break;
      case 'fiddle': this.bowed(t, m, dur, vel, out, 'sawtooth', 2600, 5.8); break;
      case 'gurdy': this.bowed(t, m, dur, vel * 0.9, out, 'sawtooth', 1900, 0, true); break;
      case 'pipes': this.reed(t, m, dur, vel, out); break;
      case 'lute': this.pluck(t, m, vel * 1.4, out, 0.4965, 3200, 1.6); break;
      case 'harp': this.pluck(t, m, vel * 1.2, out, 0.4985, 2400, 3.2); break;
      case 'horn': this.brass(t, m, dur, vel, out); break;
      case 'drum': this.drum(t, m === 1, vel, out); break;
    }
  }

  /** A held drone under the pipes: the root and the octave below, for `dur` seconds. */
  drone(t: number, m: number, dur: number, vel: number, out: AudioNode): void {
    for (const [k, v] of [[m - 12, 1], [m - 24, 0.7]] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(k);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045 * vel * v, t + 0.4);
      g.gain.setValueAtTime(0.045 * vel * v, t + Math.max(0.5, dur - 0.5));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g).connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  private envelope(g: GainNode, t: number, peak: number, attack: number, dur: number, release: number): number {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release * 0.5));
    g.gain.linearRampToValueAtTime(0.0001, t + Math.max(attack, dur - release * 0.5) + release);
    return t + Math.max(attack, dur - release * 0.5) + release + 0.02;
  }

  /** Whistles and flutes: a sine, a little second harmonic, breath, vibrato that comes in late. */
  private breath(t: number, m: number, dur: number, vel: number, out: AudioNode, o: { harm: number; air: number; vib: number; depth: number; sag?: boolean }): void {
    const f = mtof(m), ctx = this.ctx;
    const a = ctx.createOscillator(); a.type = 'sine'; a.frequency.value = f;
    const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = f * 2;
    if (o.sag) { a.frequency.setValueAtTime(f, t + dur * 0.7); a.frequency.linearRampToValueAtTime(f * 0.985, t + dur); }
    const vib = ctx.createOscillator(); vib.frequency.value = o.vib;
    const vd = ctx.createGain();
    vd.gain.setValueAtTime(0, t);
    vd.gain.linearRampToValueAtTime(f * o.depth, t + Math.min(0.5, dur * 0.7));
    vib.connect(vd); vd.connect(a.frequency); vd.connect(b.frequency);
    const g = ctx.createGain();
    const end = this.envelope(g, t, 0.11 * vel, 0.03, dur, 0.09);
    const hg = ctx.createGain(); hg.gain.value = o.harm;
    const air = ctx.createBufferSource(); air.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 3;
    const ag = ctx.createGain(); ag.gain.value = o.air;
    a.connect(g); b.connect(hg).connect(g); air.connect(bp).connect(ag).connect(g);
    g.connect(out);
    for (const n of [a, b, vib]) { n.start(t); n.stop(end); }
    air.start(t, Math.random()); air.stop(end);
  }

  /** Fiddle and hurdy-gurdy: a bowed saw through a body resonance, with a scrape at the start. */
  private bowed(t: number, m: number, dur: number, vel: number, out: AudioNode, type: OscillatorType, bright: number, vibHz: number, buzz = false): void {
    const f = mtof(m), ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = type; o2.frequency.value = f * 1.004;
    if (vibHz) {
      const vib = ctx.createOscillator(); vib.frequency.value = vibHz;
      const vd = ctx.createGain();
      vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.35, dur * 0.6));
      vib.connect(vd); vd.connect(o.frequency); vd.connect(o2.frequency);
      vib.start(t); vib.stop(t + dur + 0.3);
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.7;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 520; body.Q.value = 1.4; body.gain.value = 6;
    const g = ctx.createGain();
    const end = this.envelope(g, t, 0.05 * vel, buzz ? 0.02 : 0.06, dur, 0.12);
    o.connect(lp); o2.connect(lp);
    lp.connect(body).connect(g).connect(out);
    // The bow catching the string
    const sc = ctx.createBufferSource(); sc.buffer = this.noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3000; hp.Q.value = 1.2;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.02 * vel, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    sc.connect(hp).connect(sg).connect(out);
    sc.start(t, Math.random()); sc.stop(t + 0.15);
    if (buzz) {
      // The hurdy-gurdy's trompette: a rasp on the wheel
      const r = ctx.createOscillator(); r.type = 'square'; r.frequency.value = f / 2;
      const rg = ctx.createGain(); rg.gain.value = 0.012 * vel;
      r.connect(rg).connect(lp);
      r.start(t); r.stop(end);
    }
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }

  /** Scarth pipes' chanter: a narrow reed, bright and loud. */
  private reed(t: number, m: number, dur: number, vel: number, out: AudioNode): void {
    const f = mtof(m), ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 2.002;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 0.9;
    const g = ctx.createGain();
    const end = this.envelope(g, t, 0.06 * vel, 0.012, dur, 0.04);
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(bp); o2.connect(g2).connect(bp);
    bp.connect(g).connect(out);
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }

  /** Lute and harp: plucked strings (Karplus-Strong), one buffer per note and instrument. */
  private pluck(t: number, m: number, vel: number, out: AudioNode, damp: number, bright: number, secs: number): void {
    const key = `${m}:${damp}`;
    let buf = this.plucks.get(key);
    if (!buf) {
      const rate = this.ctx.sampleRate, f = mtof(m);
      const period = Math.max(2, Math.round(rate / f));
      buf = this.ctx.createBuffer(1, Math.floor(rate * secs), rate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
      for (let i = period; i < d.length; i++) d[i] = (d[i - period] + d[i - period + 1]) * damp;
      this.plucks.set(key, buf);
    }
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright;
    const g = this.ctx.createGain(); g.gain.value = 0.32 * vel;
    s.connect(lp).connect(g).connect(out);
    s.start(t);
  }

  /** The post horn: a brass saw with the brightness opening as it speaks. */
  private brass(t: number, m: number, dur: number, vel: number, out: AudioNode): void {
    const f = mtof(m), ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(f * 5, t + 0.08); lp.frequency.linearRampToValueAtTime(f * 3, t + dur);
    const g = ctx.createGain();
    const end = this.envelope(g, t, 0.07 * vel, 0.05, dur, 0.12);
    o.connect(lp).connect(g).connect(out);
    o.start(t); o.stop(end);
  }

  /** A frame drum: a pitched thump falling away, and the skin's slap. */
  private drum(t: number, struck: boolean, vel: number, out: AudioNode): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(struck ? 120 : 170, t); o.frequency.exponentialRampToValueAtTime(struck ? 58 : 95, t + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime((struck ? 0.5 : 0.22) * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (struck ? 0.42 : 0.2));
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.45);
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = struck ? 1400 : 2600; bp.Q.value = 1;
    const sg = ctx.createGain(); sg.gain.setValueAtTime((struck ? 0.16 : 0.1) * vel, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(bp).connect(sg).connect(out);
    s.start(t, Math.random()); s.stop(t + 0.08);
  }
}
